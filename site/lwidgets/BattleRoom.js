///////////////////////////////////

// JS Spring Lobby Interface

// By CarRepairer

// License: GPL 2

///////////////////////////////////


define(
	'lwidgets/BattleRoom',
	[
		"dojo/_base/declare",

		"dojo",
		"dijit",

		'dojo/text!./templates/battleroom.html?' + cacheString,
		'dojo/_base/array',

		'dojo/dom-construct',
		'dojo/dom-style',
		'dojo/dom-attr',
		'dojo/_base/lang',
		'dojo/topic',
		
		'dojo/_base/event',
		'dojo/on',

		'lwidgets',
		'lwidgets/Chat',
		'lwidgets/ModOptions',
		'lwidgets/GameBots',
		'lwidgets/BattleMap',
		'lwidgets/BattlePlayerList',
		'lwidgets/ScriptManager',
		'lwidgets/ToggleIconButton',
		
		//extras
		'dojo/dom', //needed for widget.placeAt to work now

		'dijit/ColorPalette',
		'dijit/form/Button',
		'dijit/form/TextBox',
		'dijit/Dialog',
		'dijit/ProgressBar',
		'dojox/encoding/base64'
	],
	function(declare, dojo, dijit, template, array,
		domConstruct, domStyle, domAttr, lang, topic, event, on,
		lwidgets, Chat, ModOptions, GameBots, BattleMap, BattlePlayerList, ScriptManager, ToggleIconButton
	){
	return declare( [ Chat ], {

	//'templateString' : dojo.cache("lwidgets", "templates/battleroom_nopane.html?" + cacheString),
	'templateString' : template,

	'parseOnLoad':false,

	'saystring':'SAYBATTLE',
	'name':'',
	'host':'',
	'map':'',
	'game':'',
	'gameHash':'',
	'mapHash':'',
	'faction':0,
	'serverEngineVersion':0,
	'engine':0,

	'battleId':0,

	'specState':true,
	'allianceId':0,
	'teamId':0,
	'runningGame':false,

	'playerlistNode':null,
	'players' : null,
	'ateams':null,
	'ateamNumbers':null,
	'battleListStore':null,		//mixed in

	'bots':null,
	'factions':null,

	'appletHandler':null, //mixed in
	'downloadManager':null, //mixed in

	'synced':false,

	'gotMap':false,
	'gotGame':false,
	'gotEngine':false,
	'gameHashMismatch':false,
	'showingDialog':false,

	'recentAlert':false,
	'gotStatuses':false,

	'modOptions':null,
	'gameBots':null,

	'gameIndex':false,
	'mapIndex':false,
	
	'inBattle':false,

	'loadedBattleData':false,

	'processName':'',

	'scriptPassword':'',

	'aiNum':0,
	'playerNum':0,
	'startRects':null,

	'playStateButton':null,

	'extraScriptTags':null,
	
	'sourcePort':8300,
	
	'gameWarningIcon':null,

	'postCreate2':function()
	{
		this.commonSetup();
		
		this.subscribe('Lobby/battles/addplayer', 'addPlayer' );
		this.subscribe('Lobby/battles/remplayer', 'remPlayer' );
		this.subscribe('Lobby/battle/playermessage', 'playerMessage' );
		this.subscribe('Lobby/battle/ring', 'ring' );
		this.subscribe('Lobby/battles/updatebattle', 'updateBattle' );
		this.subscribe('Lobby/battle/checkStart', 'checkStart' );
		this.subscribe('Lobby/unitsyncRefreshed', 'setSync' );
		this.subscribe('Lobby/download/processProgress', 'updateBar' );
		//this.subscribe('Lobby/battle/editBot', 'editBot' );

	}, //postcreate2
	
	'getUnitsync':function()
	{
		return this.appletHandler.getUnitsync(this.engine);
	},
	
	'setAlliance':function( allianceId )
	{
		this.playStateButton.setChecked( allianceId !== 'S' );

		if(allianceId === 'S')
		{
			this.specState = true;
			this.sendPlayState();
			return;
		}

		if( !this.syncCheck( 'You cannot participate in the battle because you are missing content.', false ) )
		{
			return;
		}
		this.specState = false;
		this.allianceId = parseInt( allianceId );
		this.sendPlayState();
	
	},
	
	'commonSetup':function()
	{
		var factionTooltip;

		this.players = {};
		this.ateams = {};
		this.ateamNumbers = [];
		this.bots = {};

		this.startRects = {};
		this.extraScriptTags = {};

		factionTooltip = new dijit.Tooltip({
			'connectId':[this.factionSelect.domNode],
			'position':['below'],
			'label':'Choose your faction.'
		});

		this.playStateButton = new ToggleIconButton({
			'checkedIconClass':'tallIcon playImage',
			'uncheckedIconClass':'tallIcon specImage',
			'checked':false,
			'checkedLabel':'Playing. Click to spectate.',
			'uncheckedLabel':'Spectating. Click to play.',
			'onClick':lang.hitch(this, 'togglePlayState' )
		}).placeAt(this.togglePlayStateNode);
		
		this.battleMap = new BattleMap({
			'appletHandler':this.appletHandler,
			'battleRoom':this
		}).placeAt(this.battleMapDiv);
		//this.playerListNode = new BattlePlayerList({}).placeAt(this.playerListDiv);
		this.playerListNode = new BattlePlayerList({
			'nick':this.nick,
			'style':{'width':'99%', 'height':'99%', 'fontSize':'small' },
			'battleRoom':this
		});

		dojo.connect(this.mainContainer, 'onMouseUp', this.battleMap, this.battleMap.updateMapDiv )

	},


	'resizeAlready2':function()
	{
		//this.playerListNode.startup2();
		this.playerListNode.resizeAlready();
	},
	'startup2':function()
	{
		//sucky hax
		setTimeout( function(thisObj){ thisObj.resizeAlready(); }, 400, this );
		if( this.startMeUp )
		{
			this.startMeUp = false;
			this.mainContainer.startup();
			this.playerListNode.placeAt(this.playerListDiv)
			this.playerListNode.startup2();
		}
	},
	'finishedBattleStatuses':function()
	{
		this.gotStatuses = true;
		this.sendPlayState();
		this.startGame();
	},
	'reloadUnitsync':function()
	{
		this.appletHandler.refreshUnitsync(this.engine);
	},

	'ring':function( data )
	{
		var name, line;
		name = data.name;
		line = '*** ' + name + ' is ringing you!';
		this.addLine( line, '' );
	},

	'makeBattle':function()
	{
		topic.publish('Lobby/makebattle');
	},

	//from User
	'checkStart':function(data)
	{
		if( data.battleId !== this.battleId )
		{
			return;
		}
		if( !this.runningGame )
		{
			this.startGame();
		}
		this.runningGame = this.players[this.host].isInGame;
	},

	'startGameClick':function()
	{
		if( !this.hosting && !this.players[this.host].isInGame )
		{
			alert('The host hasn\'t started the game yet.');
			return;
		}
		this.startGame();
	},
	
	'startGame':function()
	{
		var aiNum, name;
		var uriContent, newWindow;

		if( !this.players[this.host] )
		{
			return;
		}
		if( !this.hosting && !this.players[this.host].isInGame )
		{
			return;
		}
		
		this.setSync();

		/*
		if( this.getUnitsync() === null )
		{
			if( !confirm( 'Your Spring path cannot be accessed so it is not known if you have the map and game for this battle. '+
				'You will have to open spring yourself using a downloaded script. '+
				'Start anyway?' )
			)
			{
				return;
			}
			uriContent = "data:application/x-spring-game," + encodeURIComponent( this.generateScript() );
			newWindow = window.open(uriContent, 'script.spg');
			return;
		}
		*/
		if( !this.syncCheck( 'You cannot participate in the battle because you are missing content.', true ) )
		{
			return;
		}

		if( !this.hosting && !confirm('Game is in progress. Launch?\n ') )
		{
			return;
		}
		//console.log(this.generateScript());
		this.appletHandler.startSpring( this.generateScript(), this.engine )

	},
	'setTitle': function( title )
	{
		domAttr.set( this.titleText, 'innerHTML',
			'<b>' + title + '</b>'
			+ '<br />'
			+ '<a href="' + this.getGameDownloadUrl() + '" target="_blank" style="color: '+this.settings.settings.topicTextColor+'" >'
			+ this.game
			+ '</a> '
		);
	},
	
	'extractEngineVersion':function(title)
	{
		var titleVersion;
		//this.engineVersion default
		var engineVersion = this.serverEngineVersion;
		
		titleVersion = title.match(/\(spring ([\d\.]*)\)/);
		
		if ( titleVersion !== null )
		{
			titleVersion = titleVersion[1];
			
			if ( parseFloat( titleVersion[1] ) !== 0 )
			{
				engineVersion = titleVersion;
			}
		}
		
		return engineVersion
	},

	'joinBattle':function( data )
	{
		var blistStore = this.battleListStore;

		this.battleId = data.battleId;
		
		this.playerNum = 0;
		
		domStyle.set( this.hideBattleNode, 'display', 'none' );
		domStyle.set( this.battleDivNode, 'display', 'block' );

		this.sendPlayState();

		this.closeNode.set('disabled', false);

		this.resizeAlready(); //for startup

		this.gameHash = data.gameHash;
		
		this.inBattle = true;
		//this.scriptPassword = data.scriptPassword;

		this.gameWarningIcon = domConstruct.create('span', {} );
		
		blistStore.fetchItemByIdentity({
			'identity':data.battleId,
			'scope':this,
			'onItem':function(item)
			{
				var members, playerlist, title, gameWarning, player_name;
				members 		= parseInt( blistStore.getValue(item, 'members') );
				playerlist 		= blistStore.getValue(item, 'playerlist');
				this.host		= blistStore.getValue(item, 'host');
				this.map		= blistStore.getValue(item, 'map');
				title			= blistStore.getValue(item, 'title');
				this.game 		= blistStore.getValue(item, 'game');
				this.ip 		= blistStore.getValue(item, 'ip');
				this.hostPort 	= blistStore.getValue(item, 'hostport');
				
				//this.engine		= this.extractEngineVersion(title)
				this.engine		= blistStore.getValue(item, 'engineVersion');

				this.setSync();
				this.setTitle( title )
				
				
				if(!this.gotGame )
				{
					domConstruct.place(this.gameWarningIcon, this.titleText)
					gameWarning = this.gameHashMismatch
						? 'Your game does not match the hash for this battle! Follow the link to re-download it.'
						: 'You do not have this game! Follow the link to download it.';
					domConstruct.create('img', {
						'src':'img/warning.png',
						'height':'16',
						'title':gameWarning
					}, this.gameWarningIcon);
				}

				this.battleMap.setMap( this.map );

				for(player_name in playerlist)
				{
					this.addPlayer( { 'battleId':this.battleId, 'name':player_name } )
				}

				this.resizeAlready();
				this.loadedBattleData = true;
			}
		});

	}, //joinBattle

	'setSync':function()
	{
		var mapChecksum, gameHash, processName, getGame;
		this.gotMap = false;
		this.gameHashMismatch = false;
		this.recentAlert = false;
		
		if( !this.inBattle )
		{
			return;
		}
			
		//engine test
		//this.getUnitsync()
		if( this.getUnitsync() !== null )
		{
			this.gotEngine = true;
		}
		else
		{
			//this.appletHandler.downloadEngine();
			this.downloadManager.downloadEngine(this.engine);
			return //don't continue if no engine
		}
		
		if( !this.gotGame )
		{
			getGame = false;
			this.gameIndex = this.downloadManager.getGameIndex(this.game, this.engine);
			if( this.gameIndex !== false )
			{
				gameHash = this.getUnitsync().getPrimaryModChecksum( this.gameIndex )
				if( this.gameHash === 0 || this.gameHash === gameHash )
				{
					this.gotGame = true;
					this.loadModOptions();
					this.loadGameBots();
					this.loadFactions();
					this.hideGameDownloadBar();
				}
				else
				{
					this.gameHashMismatch = true;
					getGame = true;
				}
			}
			else
			{
				getGame = true;
			}
			if( getGame )
			//if( 0 )
			{
				this.processName = this.downloadManager.downloadPackage( 'game', this.game );
				this.showGameDownloadBar();
			}
		}

		mapChecksum = this.downloadManager.getMapChecksum(this.map, this.engine);
		if( mapChecksum !== false )
		{
			this.mapHash = mapChecksum;
			this.gotMap = true;
			this.battleMap.hideBar();
		}
		else
		{
			processName = this.downloadManager.downloadPackage( 'map', this.map );
			this.battleMap.showBar(processName)
		}
		this.battleMap.setGotMap( this.gotMap );
		
		if( this.gotGame )
		{
			//domStyle.set( this.gameWarningIcon, {'display:':'none'} );
		}

		if( this.gotGame && this.gotMap && this.gotEngine )
		{
			//alert('synced!');
			this.synced = true;
		}
	},
	'focusDownloads':function(e)
	{
		event.stop(e);
		topic.publish('Lobby/focusDownloads' );
	},
	'updateBar':function(data)
	{
		if( data.processName !== this.processName )
		{
			return;
		}
		this.gameDownloadBar.update( {'progress':data.perc} );
	},
	'showGameDownloadBar':function()
	{
		domStyle.set( this.gameDownloadBar.domNode, 'display', 'block');
	},
	'hideGameDownloadBar':function()
	{
		this.processName = '';
		domStyle.set( this.gameDownloadBar.domNode, 'display', 'none');
	},
	/*
	'rgb565':function(pixel)
	{
		var red_mask, green_mask, blue_mask
		var red_value, green_value, blue_value
		var red, green, blue
		
		red_mask = parseInt( 'F800' , 16) ;
		green_mask = parseInt( '7E0' , 16) ;
		blue_mask = parseInt( '1F' , 16) ;
		
		red_value = (pixel & red_mask) >> 11;
		green_value = (pixel & green_mask) >> 5;
		blue_value = (pixel & blue_mask);

		// Expand to 8-bit values.
		red   = red_value << 3;
		green = green_value << 2;
		blue  = blue_value << 3;

		pixel = 0 * Math.pow(8,4)
			+ red * Math.pow(8,3)
			+ green * Math.pow(8,2)
			+ blue * Math.pow(8,1)
		
		return pixel;
	},
	*/
	'_asLittleEndianHex':function(value, bytes) {
        // Convert value into little endian hex bytes
        // value - the number as a decimal integer (representing bytes)
        // bytes - the number of bytes that this value takes up in a string

        // Example:
        // _asLittleEndianHex(2835, 4)
        // > '\x13\x0b\x00\x00'

        var result = [];

        for (; bytes>0; bytes--) {
            result.push(String.fromCharCode(value & 255));
            value >>= 8;
        }

        return result.join('');
    },
	
	'loadFactions':function() //note, loadmodoptions first does addallarchives so it must be called before this. fixme
	{
		var listOptions, factionCount, i, factionName;
		factionCount = this.getUnitsync().getSideCount();
		listOptions = [];
		this.factions = [];
		for( i=0; i<factionCount; i++ )
		{
			factionName = this.getUnitsync().getSideName(i);
			this.factionSelect.addOption({ 'value':i, 'label':factionName })
			this.factions[i] = factionName;
			
			//testing
			/** /
			var sidePath, fd, size, buff;
			sidepath = 'SidePics/' + factionName + '.png';
			fd = this.getUnitsync().openFileVFS(sidepath);
			if( !fd )
			{
				sidepath = 'SidePics/' + factionName + '.bmp';
				fd = this.getUnitsync().openFileVFS(sidepath);
			}
			size = this.getUnitsync().fileSizeVFS(fd);
			
			buff = this.appletHandler.jsReadFileVFS( fd, size, this.engine );
			
			this.getUnitsync().closeFileVFS(fd);
			
			console.log('buff', sidepath, size, buff.length)
			console.log( 'typeof buff', typeof buff )
			
			var str, str64, strTest, testStr64;
			str = '';
			str64 = '';
			
			
			var buffarr = []
		
			var start = 56;
			strTest = '';
			for(var j = 0; j < start; j+=1)
			{
				strTest += String.fromCharCode( buff[j] );
				str += String.fromCharCode( buff[j] );
			}
			strTest = 
				'BM' +               // "Magic Number"
                this._asLittleEndianHex( 822+54, 4) +     // size of the file (bytes)*
                '\x00\x00' +         // reserved
                '\x00\x00' +         // reserved
                '\x36\x00\x00\x00' + // offset of where BMP data lives (54 bytes)
                '\x28\x00\x00\x00' + // number of remaining bytes in header from here (40 bytes)
                this._asLittleEndianHex( 16,4) +              // the width of the bitmap in pixels*
                this._asLittleEndianHex( 16,4) +             // the height of the bitmap in pixels*
                '\x01\x00' +         // the number of color planes (1)
                '\x18\x00' +         // 24 bits / pixel
                '\x00\x00\x00\x00' + // No compression (0)
                this._asLittleEndianHex( 822, 4) +     // size of the BMP data (bytes)*
                '\x13\x0B\x00\x00' + // 2835 pixels/meter - horizontal resolution
                '\x13\x0B\x00\x00' + // 2835 pixels/meter - the vertical resolution
                '\x00\x00\x00\x00' + // Number of colors in the palette (keep 0 for 24-bit)
                '\x00\x00\x00\x00'  // 0 important colors (means all colors are important)
			
			//for (var j = 0; j < buff.length; j+=1)
			for (var j = start; j < buff.length; j+=1)
			{
				buffarr.push(buff[j] + ' || ' + (buff[j] & 255) )
				//str += String.fromCharCode( parseInt( buff[j] ) & 255 );
				str += String.fromCharCode( buff[j] );
				//strTest += String.fromCharCode( buff[j] );
				//strTest += String.fromCharCode( parseInt( buff[j] ) & 255 );
				//strTest += '\x00\xff\x00';
			}
			//str = String.fromCharCode.apply(String, buff);
			
			console.log(buffarr);
			
			console.log(str )
			var str2 = '';
			
			var pixellen = 3;
			
			
			for (var j = start; j < buff.length; j+=pixellen)
			{
				if( (j-start) % (16*pixellen) === 0 )
				{
					str2 += '\n';
				}
					
				var temppixel = buff[j] + buff[j+1] + buff[j+2];
				//var temppixel = buff[j] & 255 + buff[j+1] & 255 + buff[j+2] & 255;
				
				strTest += '\xff\xff\x00';
				if( temppixel <= 0)
				{
					str2 += '.'
					//strTest += '\x00\x00\x00';
					
				}
				else
				{
					str2 += '8';
					//strTest += '\xff\xff\xff';
				}
				
				if( (j-start) % (16*pixellen) === 0 )
				{
					//strTest += '\x00\x00\x00';
				}
				
				
			}
			console.log(str2);
			
			//str64 = dojox.encoding.base64.encode( str );
			str64 = Base64.encode( str );
			//testStr64 = Base64.encode( strTest );
			//console.log(str64 )
			//console.log('sizes', str.length, str64.length)
			
			
			domConstruct.create( 'img', {'src':'img/warning.png'}, this.factionImageTest )
			domConstruct.create( 'img', {'src': 'data:image/bmp;base64,' + str64, 'title':factionName }, this.factionImageTest )
			//domConstruct.create( 'img', {'src': 'data:image/bmp;base64,' + testStr64, 'title':factionName }, this.factionImageTest )
			domConstruct.create( 'img', {'src': 'data:image/bmp,' + str, 'title':factionName }, this.factionImageTest )
			domConstruct.create( 'img', {'src': 'data:image/bmp,' + strTest, 'title':factionName }, this.factionImageTest )
			/**/
			
		}
	},

	'loadModOptions':function()
	{
		var dlg, val;
		if( this.modOptions !== null )
		{
			return;
		}
		this.modOptions = new ModOptions({
			'appletHandler':this.appletHandler,
			'gameIndex':this.gameIndex,
			'battleRoom':this
		})

		for( key in this.extraScriptTags )
		{
			val = this.extraScriptTags[key]
			if( key.toLowerCase().match( /game\/modoptions\// ) )
			{
				optionKey = key.toLowerCase().replace( 'game/modoptions/', '' );
				this.modOptions.updateModOption({'key': optionKey, 'value':val}  );
			}
		}

	},

	'loadGameBots':function()
	{
		var dlg, gameBots;
		if( this.gameBots !== null )
		{
			return;
		}
		this.gameBots = new GameBots({
			'appletHandler':this.appletHandler,
			'gameIndex':this.gameIndex,
			'users':this.users,
			'battleRoom':this
		});
	},


	//function needed for template dojoattachevent
	'showModOptions':function()
	{
		if( !this.loadedBattleData )
		{
			alert('Still loading game data, please wait...')
			return;
		}
		if( this.getUnitsync() === null )
		{
			alert('Game options not available.')
			return;
		}

		if( this.modOptions === null )
		{
			this.syncCheck( 'You cannot edit the game options because you are missing the game.', true );
			return;
		}
		this.modOptions.showDialog();
	},

	'showGameBots':function(team)
	{
		if( !this.loadedBattleData )
		{
			alert('Still loading game data, please wait...')
			return;
		}
		if( this.getUnitsync() === null )
		{
			alert('Bots not available.')
			return;
		}

		if( this.modOptions === null )
		{
			this.syncCheck( 'You cannot add a bot because you are missing the game.', true );
			return;
		}
		this.gameBots.showDialog(team);
	},



	'updateBattle':function(data)
	{
		var blistStore = this.battleListStore;

		if( this.battleId !== data.battleId )
		{
			return;
		}
		this.map = data.map;
		this.setSync();
		this.battleMap.setMap( this.map );
	},


	'leaveBattle':function()
	{
		var smsg;
		this.inBattle = false;
		if( !this.local )
		{
			smsg = 'LEAVEBATTLE'
			topic.publish( 'Lobby/rawmsg', {'msg':smsg } );
		}
		this.closeBattle();


	},

	'closeBattle':function( )
	{
		var name;
		if( this.modOptions !== null )
		{
			this.modOptions.destroy();
			delete this.modOptions;
			this.modOptions = null;
		}
		if( this.gameBots !== null )
		{
			this.gameBots.destroy();
			delete this.gameBots;
			this.gameBots = null;
		}

		//this.factionSelect.set( 'options', [] );
		this.factionSelect.removeOption(this.factionSelect.getOptions());
		this.battleMap.clearMap();
		this.host = '';
		this.loadedBattleData = false;
		this.gotStatuses = false;

		this.synced = false;
		this.gotGame = false;
		this.gotMap = false;
		this.gotEngine = false;

		this.extraScriptTags = {}

		domConstruct.create('hr', {}, this.messageNode.domNode )

		domAttr.set( this.titleText, 'innerHTML', 'Please wait...' );

		for( name in this.bots )
		{
			//topic.publish('Lobby/battles/remplayer', {'name': name, 'battleId':this.battleId } );
			delete this.users[name];
			this.users[name] = null;
		}
		this.bots = {};


		this.battleId = 0;
		domStyle.set( this.hideBattleNode, 'display', 'block' );
		domStyle.set( this.battleDivNode, 'display', 'none' );
		this.closeNode.set('disabled', true);
		this.playerListNode.empty();
		this.players = {};
	},

	'getGameDownloadUrl':function() {
		if (this.game.indexOf("Zero-K") != -1) { // check if the string contains Zero-K

			return 'http://packages.springrts.com/builds/?C=M;O=D';
		} else {
			return 'http://springfiles.com/finder/1/' + this.game;
		}
	},

	'syncCheck':function( message, forceShowAlert )
	{
		var dlg, dlgDiv, closeButton;

		if(this.synced)
		{
			return true;
		}

		message += '<br /><ul>';
		if( !this.gotEngine )
		{
			message += '<li>Missing engine version: '
				+ this.engine + '</a></li>';
		}
		else
		{
			if( !this.gotGame )
			{
				message += '<li>Missing game: <a href="' + this.getGameDownloadUrl()
					+ '" target="_blank" >'
					+ this.game + '</a></li>';
	
			}
			if( !this.gotMap )
			{
				message += '<li>Missing map: <a href="' + this.battleMap.getMapLink()
					+ '" target="_blank" >'
					+ this.map + '</a></li>';
			}	
		}
		
		
		message += '</ul>';
		
		

		if( this.map === '' )
		{
			message = 'You need to choose a map before starting.';
		}
		
		if( !this.showingDialog && (forceShowAlert || !this.recentAlert ) )
		{
			this.recentAlert = true;
			setTimeout( function(thisObj){
				thisObj.recentAlert = false;
			}, 30000, this );

			dlgDiv = domConstruct.create( 'div', {} );

			domConstruct.create('span',{'innerHTML': message }, dlgDiv )

			domConstruct.create('br',{}, dlgDiv )
			domConstruct.create('br',{}, dlgDiv )

			closeButton = new dijit.form.Button({
				'label':'Close',
				'onClick':lang.hitch(this, function(){
					dlg.hide();
					this.showingDialog = false;
				})
			}).placeAt(dlgDiv);

			dlg = new dijit.Dialog({
				'title': "You are missing content",
				'style': "width: 450px",
				'content':dlgDiv,
				'onHide':lang.hitch(this, function(){
					this.showingDialog = false;
				})
			});
			this.showingDialog = true;
			dlg.show();
		}

		return false;

	},

	'togglePlayState':function()
	{
		if( this.specState )
		{
			if( !this.syncCheck( 'You cannot participate in the battle because you are missing content.', true ) )
			{
				return;
			}
		}
		this.specState = !this.specState;
		this.sendPlayState();
	},
	'updateFaction':function(value)
	{
		this.faction = value;
		this.sendPlayState();
	},
	'setColor':function(val)
	{
		this.users[this.nick].setTeamColor(val);
		this.sendPlayState();
	},
	'sendPlayState':function()
	{
		if( this.battleId !== 0 && this.gotStatuses )
		{
			this.users[this.nick].setStatusVals({
				'isSpectator':this.specState,
				'allyNumber':this.allianceId,
				'teamNumber':this.getEmptyTeam(this.nick),
				'syncStatus':this.synced ? 'Synced' : 'Unsynced',
				'side':this.faction,
				'isReady':true
			});
			this.users[this.nick].sendBattleStatus();

		}
	},

	'addPlayer':function( data )
	{
		var pname, line, user, ateam, aiNum;
		pname = data.name;

		if( pname === '' )
		{
			return;
		}
		if( data.battleId !== this.battleId )
		{
			return;
		}
		this.addPlayer2( pname )
	},
	
	'addPlayer2':function( pname )
	{
		var line, user, ateam, aiNum;
		
		user = this.users[pname];
		user.playerNum = this.playerNum;
		this.playerNum += 1;

		if( user.owner !== '' )
		{
			aiNum = this.aiNum
			this.bots[pname] = aiNum;
			this.aiNum += 1;
		}
		else
		{

		}

		this.players[pname] = user;
		this.playerListNode.addUser(user);
		line = '*** ' + pname + ' has joined the battle.';
		if( pname in this.bots )
		{
			line = '*** Bot: ' + pname + ' has been added.';
		}

		if( pname === this.nick )
		{
			//this.sendPlayState();
		}

		//this.addLine( line, {'color':this.settings.settings.chatLeaveColor}, 'chatJoin' );
		if( this.gotStatuses )
		{
			this.addLine( line, 'chatJoin' );
		}

		//for updating the player list
		setTimeout( function(thisObj){
			thisObj.resizeAlready2();
		}, 400, this );
	},
	
	'remPlayer':function( data )
	{
		var pname, line, user;
		if( data.battleId !== this.battleId )
		{
			return;
		}
		this.remPlayer2( data.name )
	},

	'remPlayer2':function( pname )
	{
		var line, user;
		
		user = this.users[pname];

		//fixme: this errored user=undefined
		this.playerListNode.removeUser(user);

		line = '*** ' + pname + ' has left the battle.';
		if( pname in this.bots )
		{
			line = '*** Bot: ' + pname + ' has been removed.';
			delete this.bots[pname];
		}

		delete this.players[pname];

		//this.addLine( line, {'color':this.settings.settings.chatLeaveColor}, 'chatLeave' );
		this.addLine( line, 'chatLeave' );
		if( pname === this.nick )
		{
			this.closeBattle();
		}
	},


	'addStartRect':function(allianceId, x1, y1, x2, y2)
	{
		this.startRects[allianceId] = [x1, y1, x2, y2];
		this.battleMap.addStartRect(allianceId, x1, y1, x2, y2)
	},
	'remStartRect':function(allianceId)
	{
		delete this.startRects[allianceId];
		this.battleMap.remStartRect(allianceId);
	},

	'removeScriptTag':function(key)
	{
		delete this.extraScriptTags[key];
		if( this.gotGame && key.toLowerCase().match( /game\/modoptions\// ) )
		{
			optionKey = key.toLowerCase().replace( 'game/modoptions/', '' );
			this.modOptions.updateModOption({'key': optionKey, 'value':null})
		}
	},

	'setScriptTag':function(key, val)
	{
		var optionKey;

		//this.scriptManager.addScriptTag(key, val);
		this.extraScriptTags[key] = val;

		if( this.gotGame && key.toLowerCase().match( /game\/modoptions\// ) )
		{
			optionKey = key.toLowerCase().replace( 'game/modoptions/', '' );
			this.modOptions.updateModOption({'key': optionKey, 'value':val}  );
		}
	},

	'generateScript':function()
	{
		var scriptManager, startRect, x1, y1, x2, y2, name, aiNum,
			teams, teamLeader, alliances, alliance,
			numUsers, numPlayers, allianceNum, alliance,
			teamNum, team
			;
		
		
		teams = {};
		alliances = {};
		numUsers = 0;
		numPlayers = 0;

		scriptManager = new ScriptManager({});

		scriptManager.addScriptTag( "game/HostIP", 		this.ip );
		scriptManager.addScriptTag( "game/HostPort", 	this.hostPort );
		scriptManager.addScriptTag( "game/IsHost", 		this.host === this.nick ? '1' : '0' );
		scriptManager.addScriptTag( "game/MyPlayerName", this.nick );
		if( this.scriptPassword !== '')
		{
			scriptManager.addScriptTag( "game/MyPasswd", 	this.scriptPassword );
		}
		//return scriptManager.getScript();
		
		scriptManager.addScriptTag( "game/GameType", 	this.game );
		scriptManager.addScriptTag( "game/MapName", 	this.map );
		scriptManager.addScriptTag( "game/SourcePort", 	this.sourcePort );
		scriptManager.addScriptTag( "game/modhash", this.gameHash );
		scriptManager.addScriptTag( "game/maphash", this.mapHash );
		
		scriptManager.addScriptTag( "game/nohelperais", 0 ); //fixme
		//scriptManager.addScriptTag( "game/onlylocal", this.local ? 1 : 0 );
		scriptManager.addScriptTag( "game/startPosType", 2 ); //fixme
		
		
		

		for( key in this.extraScriptTags )
		{
			val = this.extraScriptTags[key]
			scriptManager.addScriptTag(key, val);
		}
		
		for( name in this.players )
		{
			numUsers += 1;
			user = this.players[name];
			if( name in this.bots )
			{
				aiNum = this.bots[name]
				scriptManager.addScriptTag( 'game/AI' + aiNum + '/Team', user.teamNumber );
				scriptManager.addScriptTag( 'game/AI' + aiNum + '/ShortName', user.ai_dll );
				scriptManager.addScriptTag( 'game/AI' + aiNum + '/Name', user.name );
				//scriptManager.addScriptTag( 'AI' + aiNum + '/Version', '' );
				scriptManager.addScriptTag( 'game/AI' + aiNum + '/IsFromDemo', 0 );
				scriptManager.addScriptTag( 'game/AI' + aiNum + '/Spectator', user.isSpectator ? 1 : 0 );
				scriptManager.addScriptTag( 'game/AI' + aiNum + '/host', this.players[user.owner].playerNum );
				
				teamLeader = this.players[user.owner].playerNum;
			}
			else
			{
				numPlayers += 1;
			
				if( !user.isSpectator )
				{
					scriptManager.addScriptTag( 'game/PLAYER' + user.playerNum + '/Team', user.teamNumber );
				}
				scriptManager.addScriptTag( 'game/PLAYER' + user.playerNum + '/Name', user.name );
				scriptManager.addScriptTag( 'game/PLAYER' + user.playerNum + '/Spectator', user.isSpectator ? 1 : 0 );
				scriptManager.addScriptTag( 'game/PLAYER' + user.playerNum + '/Rank', user.rank );
				scriptManager.addScriptTag( 'game/PLAYER' + user.playerNum + '/CountryCode', user.country );
				scriptManager.addScriptTag( 'game/PLAYER' + user.playerNum + '/isfromdemo', 0 );
				//lobbyID? lobbyrank?
				if( user.scriptPassword !== '' )
				{
					scriptManager.addScriptTag( 'game/PLAYER' + user.playerNum + '/Password', user.scriptPassword );
				}
				
				teamLeader = user.playerNum;
			}
			teams[user.teamNumber] = {
				'allyTeam':user.allyNumber,
				'teamleader':teamLeader,
				'side':user.side,
				'color':(user.r/256) + ' ' + (user.g/256) + ' ' + (user.b/256)
			}
			alliances[user.allyNumber] = {
			
			}
		}
		scriptManager.addScriptTag( "game/numPlayers", numPlayers ); //fixme
		scriptManager.addScriptTag( "game/numUsers", numUsers ); //fixme
	
		for( teamNum in teams )
		{
			team = teams[teamNum]
			scriptManager.addScriptTag( 'game/TEAM' + teamNum + '/allyTeam', team.allyTeam );
			scriptManager.addScriptTag( 'game/TEAM' + teamNum + '/teamleader', team.teamleader );
			scriptManager.addScriptTag( 'game/TEAM' + teamNum + '/side', this.factions[ team.side ] );
			scriptManager.addScriptTag( 'game/TEAM' + teamNum + '/rgbcolor', team.color );
			scriptManager.addScriptTag( 'game/TEAM' + teamNum + '/handicap', '' );
		}
		
	
		for( allianceNum in alliances )
		{
			alliance = alliances[allianceNum];
			scriptManager.addScriptTag( 'game/ALLYTEAM' + allianceNum + '/NumAllies', 	0 );
			if( allianceNum in this.startRects )
			{
				startRect = this.startRects[allianceNum];
				x1 = startRect[0];
				y1 = startRect[1];
				x2 = startRect[2];
				y2 = startRect[3];
				scriptManager.addScriptTag( 'game/ALLYTEAM' + allianceNum + '/StartRectLeft', 	x1/200 );
				scriptManager.addScriptTag( 'game/ALLYTEAM' + allianceNum + '/StartRectTop', 	y1/200 );
				scriptManager.addScriptTag( 'game/ALLYTEAM' + allianceNum + '/StartRectRight', 	x2/200 );
				scriptManager.addScriptTag( 'game/ALLYTEAM' + allianceNum + '/StartRectBottom', y2/200 );
			}
		}
		
		//console.log( scriptManager.getScript() );
		return scriptManager.getScript();

	}, //generateScript

	'getEmptyTeam':function(userName)
	{
		var user, teams, emptyTeam, name, team, name;
		teams = {};
		for( name in this.players )
		{
			if( name !== userName )
			{
				user = this.players[name];
				if( !user.isSpectator )
				{
					teams[user.teamNumber+0] = true;
				}
			}
		}
		emptyTeam = 0;
		while( emptyTeam in teams )
		{
			emptyTeam += 1;
		}
		return emptyTeam;
	},

	'getEmptyAllyTeams':function()
	{
		var emptyAllyTeams, i, name, user, allyNumber, indexOfAllyNumber;
		emptyAllyTeams = []
		for(i=0; i<16; i++)
		{
			emptyAllyTeams[i] = i;
		}
		for( name in this.players )
		{
			user = this.players[name];
			if( !user.isSpectator )
			{
				allyNumber = parseInt( user.allyNumber );
				indexOfAllyNumber = array.indexOf(emptyAllyTeams, allyNumber);
				if( indexOfAllyNumber !== -1 )
				{
					emptyAllyTeams.splice( indexOfAllyNumber, 1 )
				}
			}
		}

		return emptyAllyTeams;
	},

	'editBot':function(botName)
	{
		var dlg, mainDiv, applyButton, teamText, teamSelect, teamOptions, i;
		var name, bot, colorChooser, colorChooserButton;

		//botName =  dojox.html.entities.decode(data.botName);
		botName =  '<BOT>'+botName;
		bot = this.users[botName];
		if( !bot )
		{
			console.log('GameBot> Error: no such bot ' + botName)
		}
		name = bot.name;
		

		mainDiv = domConstruct.create('div', {'style':{'minWidth':'250px' }} );

		domConstruct.create('span', {'innerHTML':'Team: '}, mainDiv)
		teamOptions = [];
		for(i=1; i<=16; i+=1)
		{
			teamOptions.push({'label':i, 'value':i+''})
		}

		teamSelect = new dijit.form.Select({
			'value':(parseInt(bot.allyNumber)+1)+'',
			'style':{'width':'50px'},
			'options':teamOptions
		}).placeAt(mainDiv);

		colorChooser = new dijit.ColorPalette({});
		colorChooserButton = new dijit.form.DropDownButton({
				'iconClass':'smallIcon colorsImage',
				'showLabel':false,
				'label':'Choose team color',
				'dropDown':colorChooser
		}).placeAt(mainDiv);

		applyButton = new dijit.form.Button({
			'label':'Apply',
			'onClick':lang.hitch(this, function(botName){
				var allyNumber;
				allyNumber = parseInt( teamSelect.get('value') );
				allyNumber = isNaN(allyNumber) ? 1 : allyNumber;
				allyNumber -= 1;
				this.users[botName].setStatusVals({
					'allyNumber':allyNumber,
					'isSpectator':false,
					'isReady':true,
					'teamNumber':this.getEmptyTeam(botName),
					//'syncStatus':this.synced ? 'Synced' : 'Unsynced'
					'syncStatus':'Synced'
				});
				this.users[botName].setTeamColor( colorChooser.get('value') );
				if(this.local)
				{
					this.users[botName].processBattleStatusAndColor();
				}
				else
				{
					this.users[botName].sendBattleStatus(true);
				}
				
				dlg.hide();
			}, botName)
		}).placeAt(mainDiv);

		dlg = new dijit.Dialog({
			'title': 'Edit AI Bot',
			'content':mainDiv
		});
		dlg.startup();
		dlg.show();

	},


	'blank':null
}); });//define lwidgets/Battleroom