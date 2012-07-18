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
		'dojo/dom-construct',
		'dojo/_base/array',

		'lwidgets',
		'lwidgets/Chat',
		'lwidgets/ModOptions',
		'lwidgets/GameBots',
		'lwidgets/BattleMap',
		'lwidgets/BattlePlayerList',
		'lwidgets/ScriptManager',
		'lwidgets/ToggleIconButton',

		//extras

		'dijit/ColorPalette',
		'dijit/form/Button',
		'dijit/form/TextBox',
		'dijit/Dialog',
		'dijit/ProgressBar',
		'dojox/encoding/base64'
	],
	function(declare, dojo, dijit, template, domConstruct, array, lwidgets, Chat, ModOptions, GameBots, BattleMap, BattlePlayerList, ScriptManager, ToggleIconButton ){
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
	'gameHashMismatch':false,
	'showingDialog':false,

	'recentAlert':false,
	'gotStatuses':false,

	'modOptions':null,
	'gameBots':null,

	'gameIndex':false,
	'mapIndex':false,

	'loadedBattleData':false,

	'processName':'',

	'scriptPassword':'',

	'aiNum':0,
	'playerNum':0,
	'startRects':null,

	'playStateButton':null,

	'extraScriptTags':null,
	
	'sourcePort':8300,

	'postCreate2':function()
	{
		this.commonSetup();
		
		dojo.subscribe('Lobby/battles/addplayer', this, 'addPlayer' );
		dojo.subscribe('Lobby/battles/remplayer', this, 'remPlayer' );
		dojo.subscribe('Lobby/battle/playermessage', this, 'playerMessage' );
		dojo.subscribe('Lobby/battle/ring', this, 'ring' );
		dojo.subscribe('Lobby/battles/updatebattle', this, 'updateBattle' );
		dojo.subscribe('Lobby/battle/checkStart', this, 'checkStart' );
		dojo.subscribe('Lobby/unitsyncRefreshed', this, 'setSync' );
		dojo.subscribe('Lobby/download/processProgress', this, 'updateBar' );
		//dojo.subscribe('Lobby/battle/editBot', this, 'editBot' );

	}, //postcreate2
	
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
			'onClick':dojo.hitch(this, 'togglePlayState' )
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
		this.appletHandler.refreshUnitsync();
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
		dojo.publish('Lobby/makebattle');
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

		if( this.appletHandler.getUnitsync() === null )
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
		else if( !this.syncCheck( 'You cannot participate in the battle because you are missing content.', true ) )
		{
			return;
		}

		if( !this.hosting && !confirm('Game is in progress. Launch?\n ') )
		{
			return;
		}
		//console.log(this.generateScript());
		this.appletHandler.startSpring( this.generateScript() )

	},
	'setTitle': function( title )
	{
		dojo.attr( this.titleText, 'innerHTML',
			'<b>' + title + '</b>'
			+ '<br />'
			+ '<a href="' + this.getGameDownloadUrl() + '" target="_blank" style="color: '+this.settings.settings.topicTextColor+'" >'
			+ this.game
			+ '</a> '
		);
	},

	'joinBattle':function( data )
	{
		var blistStore = this.battleListStore;

		this.battleId = data.battleId;
		dojo.style( this.hideBattleNode, 'display', 'none' );
		dojo.style( this.battleDivNode, 'display', 'block' );

		this.sendPlayState();

		this.closeNode.set('disabled', false);

		this.resizeAlready(); //for startup

		this.gameHash = data.gameHash;

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

				this.setSync();
				this.setTitle( title )
				
				if(!this.gotGame )
				{
					gameWarning = this.gameHashMismatch
						? 'Your game does not match the hash for this battle! Follow the link to re-download it.'
						: 'You do not have this game! Follow the link to download it.';
					dojo.create('img', {
						'src':'img/warning.png',
						'height':'16',
						'title':gameWarning
					}, this.titleText);
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
		if( this.appletHandler.getUnitsync() !== null )
		{
			if( !this.gotGame )
			{
				getGame = false;
				this.gameIndex = this.downloadManager.getGameIndex(this.game);
				if( this.gameIndex !== false )
				{
					gameHash = this.appletHandler.getUnitsync().getPrimaryModChecksum( this.gameIndex )
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

			mapChecksum = this.downloadManager.getMapChecksum(this.map);
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

			if( this.gotGame && this.gotMap )
			{
				//alert('synced!');
				this.synced = true;
			}
		}
	},
	'focusDownloads':function(e)
	{
		dojo.stopEvent(e);
		dojo.publish('Lobby/focusDownloads', [] );
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
		dojo.style( this.gameDownloadBar.domNode, 'display', 'block');
	},
	'hideGameDownloadBar':function()
	{
		this.processName = '';
		dojo.style( this.gameDownloadBar.domNode, 'display', 'none');
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

	'loadFactions':function() //note, loadmodoptions first does addallarchives so it must be called before this. fixme
	{
		var listOptions, factionCount, i, factionName;
		factionCount = this.appletHandler.getUnitsync().getSideCount();
		listOptions = [];
		this.factions = [];
		for( i=0; i<factionCount; i++ )
		{
			factionName = this.appletHandler.getUnitsync().getSideName(i);
			this.factionSelect.addOption({ 'value':i, 'label':factionName })
			this.factions[i] = factionName;
			
			//testing
			/*
			var sidePath, fd, size, buff;
			sidepath = 'SidePics/' + factionName + '.png';
			fd = this.appletHandler.getUnitsync().openFileVFS(sidepath);
			if( !fd )
			{
				sidepath = 'SidePics/' + factionName + '.bmp';
				fd = this.appletHandler.getUnitsync().openFileVFS(sidepath);
			}
			size = this.appletHandler.getUnitsync().fileSizeVFS(fd);
			
			buff = this.appletHandler.jsReadFileVFS( fd, size );
			
			this.appletHandler.getUnitsync().closeFileVFS(fd);
			
			console.log('buff', sidepath, size, buff.length)
			console.log( 'typeof buff', typeof buff )
			
			var str, str64;
			str = '';
			str64 = '';
			
			
			var buffarr = []
		
			for (var j = 0; j < buff.length; j+=1)
			{
				buffarr.push(buff[j] + ' || ' + (buff[j] & 255) )
				str += String.fromCharCode( parseInt( buff[j] ) & 255 );
			}
			//str = String.fromCharCode.apply(String, buff);
			
			console.log(buffarr);
			
			console.log(str )
			var str2 = '';
			var start = 56;
			var pixellen = 3;
			for (var j = start; j < buff.length; j+=pixellen)
			{
				if( (j-start) % (16*pixellen) === 0 )
					str2 += '\n';
					
				var temppixel = buff[j] + buff[j+1] + buff[j+2];
				//var temppixel = buff[j] & 255 + buff[j+1] & 255 + buff[j+2] & 255;
				
				if( temppixel <= 0)
					str2 += '.'
				else
					str2 += '8'
				
			}
			console.log(str2);
			
			//str64 = dojox.encoding.base64.encode( str );
			str64 = Base64.encode( str );
			//console.log(str64 )
			//console.log('sizes', str.length, str64.length)
			
			
			dojo.create( 'img', {'src':'img/warning.png'}, this.factionImageTest )
			//dojo.create( 'img', {'src': 'data:image/bmp;base64,' + str64, 'title':factionName }, this.factionImageTest )
			dojo.create( 'img', {'src': 'data:image/bmp,' + str, 'title':factionName }, this.factionImageTest )
			*/
			
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
		if( this.appletHandler.getUnitsync() === null )
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
		if( this.appletHandler.getUnitsync() === null )
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
		if( !this.local )
		{
			smsg = 'LEAVEBATTLE'
			dojo.publish( 'Lobby/rawmsg', [{'msg':smsg }] );
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

		this.extraScriptTags = {}

		dojo.create('hr', {}, this.messageNode.domNode )

		dojo.attr( this.titleText, 'innerHTML', 'Please wait...' );

		for( name in this.bots )
		{
			//dojo.publish('Lobby/battles/remplayer', [{'name': name, 'battleId':this.battleId }] );
			delete this.users[name];
			this.users[name] = null;
		}
		this.bots = {};


		this.battleId = 0;
		dojo.style( this.hideBattleNode, 'display', 'block' );
		dojo.style( this.battleDivNode, 'display', 'none' );
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

			dlgDiv = dojo.create( 'div', {} );

			dojo.create('span',{'innerHTML': message }, dlgDiv )

			dojo.create('br',{}, dlgDiv )
			dojo.create('br',{}, dlgDiv )

			closeButton = new dijit.form.Button({
				'label':'Close',
				'onClick':dojo.hitch(this, function(){
					dlg.hide();
					this.showingDialog = false;
				})
			}).placeAt(dlgDiv);

			dlg = new dijit.Dialog({
				'title': "You are missing content",
				'style': "width: 450px",
				'content':dlgDiv,
				'onHide':dojo.hitch(this, function(){
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

		scriptManager.addScriptTag( "game/GameType", 	this.game );
		scriptManager.addScriptTag( "game/MapName", 	this.map );
		scriptManager.addScriptTag( "game/SourcePort", 	this.sourcePort );
		scriptManager.addScriptTag( "game/HostIP", 		this.ip );
		scriptManager.addScriptTag( "game/HostPort", 	this.hostPort );
		scriptManager.addScriptTag( "game/IsHost", 		this.host === this.nick ? '1' : '0' );
		scriptManager.addScriptTag( "game/MyPlayerName", this.nick );
		scriptManager.addScriptTag( "game/modhash", this.gameHash );
		scriptManager.addScriptTag( "game/maphash", this.mapHash );
		
		scriptManager.addScriptTag( "game/nohelperais", 0 ); //fixme
		//scriptManager.addScriptTag( "game/onlylocal", this.local ? 1 : 0 );
		scriptManager.addScriptTag( "game/startPosType", 2 ); //fixme
		
		
		if( this.scriptPassword !== '')
		{
			scriptManager.addScriptTag( "game/MyPasswd", 	this.scriptPassword );
		}

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
			
				scriptManager.addScriptTag( 'game/PLAYER' + user.playerNum + '/Team', user.teamNumber );
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
		

		mainDiv = dojo.create('div', {'style':{'minWidth':'250px' }} );

		dojo.create('span', {'innerHTML':'Team: '}, mainDiv)
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
			'onClick':dojo.hitch(this, function(botName){
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