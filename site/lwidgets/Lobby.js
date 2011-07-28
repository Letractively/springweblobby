///////////////////////////////////

// JS Spring Lobby Interface

// By CarRepairer

///////////////////////////////////

/*
Todo:
Battle - .spg file. may need flash and/or java
fix autoscroll - settimeout?
playerlist icons
*/

dojo.require('dojo.data.ItemFileWriteStore');
dojo.require('dojo.data.ItemFileReadStore');

dojo.require('dijit.layout.TabContainer');
dojo.require('dojox.layout.ContentPane');
dojo.require('dijit.layout.ContentPane');
dojo.require('dijit.layout.BorderContainer');

dojo.require('dijit.form.Button');
dojo.require('dijit.form.Select');
dojo.require('dijit.form.FilteringSelect');
dojo.require('dijit.form.MultiSelect');
dojo.require('dijit.form.ComboBox');

dojo.require("dijit.Dialog");
 
dojo.require('dojox.grid.DataGrid');
dojo.require("dojox.html.entities");

dojo.require("lwidgets.Chat");
dojo.require("lwidgets.LobbySettings");

dojo.require("dojox.widget.ColorPicker");
dojo.require("dijit.ColorPalette");
dojo.require("dijit.form.DropDownButton");

dojo.declare("User", null, {
	
	'name':'',
	
	'country':'',
	'cpu':'',
	
	'status':null,
	'battleStatus':null,
	
	'isReady':null,
	'teamNumber':null,
	'allyNumber':null,
	'isSpectator':null,
	'syncStatus':null,
	'side':null,
	'teamColor':null,
	'r':null,
	'g':null,
	'b':null,
	
	'isInGame':null,
	'inGameSince':null,
	'isAway':null,
	'awaySince':null,
	'isAdmin':null,
	'isBot':null,
	'rank':null,
	
	'constructor':function(/* Object */args){
		dojo.safeMixin(this, args);
	},
	
	'toTestString':function()
	{
		return this.name + ' || t:' + this.teamNumber + '; a:' + this.allyNumber;
	},
	'toString':function()
	{
		return this.name;
	},
	
	
	//set the status number
	'setStatus':function(status)
	{
		var date, old;
		
		this.status = status;
		
		date = new Date();
		old = this.isInGame;
		
		this.isInGame = (status & 1) > 0;
		if (this.isInGame && !old) this.inGameSince = date;
		if (!this.isInGame) this.inGameSince = null;

		old = this.isAway;
		this.isAway = (status & 2) > 0;
		if (this.isAway && !old) this.awaySince = date;
		if (!this.isAway) this.awaySince = null;

		this.isAdmin = (status & 32) > 0;
		this.isBot = (status & 64) > 0;
		this.rank = (status & 28) >> 2;
		
		dojo.publish('Lobby/battle/checkStart');
	},
	
	//set the battle status number and color number
	'setBattleStatus':function(status, color)
	{
		var syncStatuses;
		
		this.battleStatus = status;
		
		syncStatuses = [
			'Unknown',
			'Synced',
			'Unsynced'
		];
		
		this.isReady = (status & 2) > 0;
		this.teamNumber = (status >> 2) & 15;
		this.allyNumber = (status >> 6) & 15;
		this.isSpectator = (status & 1024) == 0;
		this.syncStatus = syncStatuses[ (status >> 22) & 3 ] ;
		this.side = (status >> 24) & 15;
		
		this.r = color & 255;
		this.g = (color >> 8) & 255;
		this.b = (color >> 16) & 255;	
	},
	
	//pass values in using an object
	'setStatusVals':function(vals)
	{
		dojo.safeMixin(this, vals);
		this.updateStatusNumbers();
		
	},
	
	//returns the status number
	'updateStatusNumbers':function()
	{
		var status, battleStatus, syncStatuses;
		
		syncStatuses = {
			'Unknown':'1',
			'Synced':'2',
			'Unsynced':'3'
		};
		
		var battleStatus = 0;
		if (this.isReady) battleStatus |= 2;
		battleStatus += (this.teamNumber & 15) << 2;
		battleStatus += (this.allyNumber & 15) << 6;
		if (!this.isSpectator) battleStatus |= 1024;
		battleStatus += ( parseInt( syncStatuses[this.syncStatus] ) & 3) << 22;
		battleStatus += (this.side & 15) << 24;
		this.battleStatus = battleStatus;
		
		//fixme: update regular status too
		
	},
	
	'getTeamColorHex':function()
	{
		//convert this.r, this.g and this.b to hex string
		
	},
	
	'blank':''
});//declare User	


dojo.provide("lwidgets.ChatManager");
dojo.declare("lwidgets.ChatManager", [ dijit._Widget, dijit._Templated ], {
	'widgetsInTemplate':true,
	
	//'templateString' : dojo.cache("lwidgets", "templates/chatroomlist.html"),
	
	'chatrooms':null,
	'privchats':null,
	
	'startMeUp':true,
	'curChatroom':'',
	'tabCont':'',
	'tabs':null,
	
	'settings':null,
	'nick':'',
	
	'lobbyPlayers':null, //mixed in
	
	'buildRendering':function()
	{
		var tc, buttons, newButton;
		
		this.chatrooms = {};
		this.privchats = {};
		this.tabs = {};
		
		this.domNode = dojo.create('div', {'style': {'height': '100%', 'width': '100%;' } });
		
		tc = new dijit.layout.TabContainer( {
		    //'style': {'height': '100%', 'width': '100%'  },
            'style': {'position':'absolute', 'top': '2px', 'bottom': '2px', 'left': '38px', 'right':'0px'  },
			'tabPosition':'left-h',
			'useSlider':true
        }).placeAt(this.domNode);
        
		buttons = dojo.create('div', {'id':'chatmanagerbuttons', 'style': {'position':'absolute', 'padding':'0px', 'left':'0px', 'top':'0px' ,'height': '150px', 'width': '20px' } }, this.domNode );
		newButton = new dijit.form.Button( {
            'style': {'height': '20px', 'width': '20px'  },
			'label':'Join a Channel',
			'showLabel':false,
			'iconClass':'smallIcon roomchatPlusImage',
			'onClick':dojo.hitch( this, 'makeNewChatRoomDialog' )
        }).placeAt(buttons);
		newButton = new dijit.form.Button( {
            'style': {'height': '20px', 'width': '20px'  },
			'label':'Open a Private Message Window',
			'showLabel':false,
			'iconClass':'smallIcon privchatPlusImage',
			'onClick':dojo.hitch( this, 'makeNewPrivChatDialog' )
        }).placeAt(buttons);
		
		
		this.tabCont = tc;
		//tc.startup();
		
		dojo.subscribe('SetNick', this, function(data){ this.nick = data.nick } );
		
		//stupid hax
		dojo.subscribe('ResizeNeeded', this, function(){ setTimeout( function(thisObj){ thisObj.resizeAlready(); }, 200, this );  } );
		
	},
	
	'join':function(input, dlg, e)
	{
		var smsg, value;
		value = dojo.attr( input, 'value' )
		if( e.keyCode === 13 )
		{
			smsg = 'JOIN ' + value
			dojo.publish( 'Server/message', [{'msg':smsg }] );	
			dlg.hide();
		}
	},
	
	'openPrivChat':function(input, dlg, e)
	{
		var value;
		value = dojo.attr( input, 'value' )
		if( e.keyCode === 13 )
		{
			this.addChat( {'name':value} , false )
			dlg.hide();
		}
	},
	
	'makeNewChatRoomDialog':function()
	{
		var dlg, input, contentDiv;
		contentDiv = dojo.create( 'div', {} );
		dojo.create( 'span', {'innerHTML':'Channel Name '}, contentDiv );
		input = dojo.create( 'input', {'type':'text'}, contentDiv );
		
		dlg = new dijit.Dialog({
            'title': "Join A Channel",
            'style': "width: 300px",
			'content':contentDiv
        });
		dojo.connect(input, 'onkeyup', dojo.hitch(this, 'join', input, dlg ) )
		
		dlg.show();
	},
	'makeNewPrivChatDialog':function()
	{
		var dlg, input, contentDiv;
		contentDiv = dojo.create( 'div', {} );
		dojo.create( 'span', {'innerHTML':'User Name '}, contentDiv );
		input = dojo.create( 'input', {'type':'text'}, contentDiv );
		
		dlg = new dijit.Dialog({
            'title': "Open A Private Message Window",
            'style': "width: 300px",
			'content':contentDiv
        });
		dojo.connect(input, 'onkeyup', dojo.hitch(this, 'openPrivChat', input, dlg ) )
		
		dlg.show();
	},
	
	'addChat':function( data, room )
	{	
		var newChat, roomName, cpChatroom, iconClass, chatName;
		chatName = data.name;
		
		data.settings = this.settings;
		data.nick = this.nick;
		data.lobbyPlayers = this.lobbyPlayers;
		if(room)
		{
			if( this.chatrooms[chatName] ) return;
			newChat = new lwidgets.Chatroom( data );
			this.chatrooms[data.name] = newChat;
			iconClass = 'smallIcon roomchatImage';
		}
		else
		{
			if( this.privchats[chatName] ) return;
			newChat = new lwidgets.Privchat( data );
			this.privchats[chatName] = newChat;
			iconClass = 'smallIcon privchatImage';
		}
		
		cpChat = new dijit.layout.ContentPane({
			'title': chatName,
            'content': newChat.domNode,
			'iconClass':iconClass,
			'onShow':dojo.hitch( newChat, newChat.startup2 ),
			'closable':true,
			
			//custom stuff
			'origTitle':chatName,
			'shown':false
        });
		
		dojo.connect(cpChat, 'onShow', dojo.hitch( cpChat, 'set', 'title', chatName ) );
		dojo.connect(cpChat, 'onShow', dojo.hitch( cpChat, 'set', 'shown', true ) ); //different from focus
		dojo.connect(cpChat, 'onHide', dojo.hitch( cpChat, 'set', 'shown', false ) ); //different from focus
		
		
		if(room)
		{
			cpChat.onClose = dojo.hitch( this, 'remChatRoom', chatName )
		}
		else
		{
			dojo.connect( cpChat, 'onClose', dojo.hitch( this, function(){
				delete this.privchats[chatName];
				delete this.tabs[chatName];
			}, chatName ));
			
		}
		
		dojo.subscribe('Lobby/chat/channel/playermessage', this, dojo.hitch( this, 'notifyActivity', chatName, cpChat ) );
		dojo.subscribe('Lobby/chat/user/playermessage', this, dojo.hitch( this, 'notifyActivity', chatName, cpChat ) );
		
		this.tabs[chatName] = cpChat;
		
		this.tabCont.addChild( cpChat );
	},
	
	'notifyActivity':function(chatName, cpChat, data)
	{
		if( !cpChat.shown //different from focus
		   && ( chatName === data.channel || chatName === data.userWindow )
		   ) 
		{
			cpChat.set('title' , '<b>'+cpChat.origTitle+'</b>' );
		}
	},

	'remChatRoom':function( name )
	{
		var smsg;
		if( this.chatrooms[name] )
		{
			this.tabCont.removeChild( this.tabs[name] );
			
			delete this.chatrooms[name];
			delete this.tabs[name];
			smsg = 'LEAVE ' + name;
			dojo.publish( 'Server/message', [{'msg':smsg }] );
		}
	},
	
	'postCreate' : function()
	{
		dojo.subscribe('Lobby/chat/addroom', this, function(data){ this.addChat(data, true) });
		dojo.subscribe('Lobby/chat/remroom', this, function(data){ this.remChatRoom(data) });
		
		dojo.subscribe('Lobby/chat/addprivchat', this, function(data){ this.addChat(data) });
		
	},
	
	//stupid hax
	'resizeAlready':function()
	{
		this.tabCont.resize();
		dojo.forEach(this.tabCont.getChildren(), function(child){ child.resize(); });
	},
	'startup2':function()
	{
		if( this.startMeUp )
		{
			this.startMeUp = false;
			this.tabCont.startup();
			this.resizeAlready()
			setTimeout( function(thisObj){ thisObj.resizeAlready(); }, 200, this );
		}
	},
	
	'blank':''
});//declare lwidgets.ChatManager



dojo.provide("lwidgets.BattleList");
dojo.declare("lwidgets.BattleList", [ dijit._Widget ], {
	'widgetsInTemplate':true,
	'grid':'',
	'startMeUp':true,
	'store':null,
	
	//'templateString' : dojo.cache("lwidgets", "templates/chatroomlist.html"),
	'buildRendering':function()
	{
		var div1, layout;
		
		this.store = {};
		
		this.setupStore();
		
		div1 = dojo.create('div', {  'style':{'width':'100%', 'height':'100%', /*this is important!*/'minHeight':'300px' }});
		dojo.create('span', { 'innerHTML':'Doubleclick on a battle to join it. You will default to spectator status.' }, div1);
		dojo.create('br', {}, div1);
		dojo.create('br', {}, div1);
		//div1 = dojo.create('div', {  'style':{'width':'100%', 'height':'100%' }});
		
		// set the layout structure:
        layout = [
			{	field: 'type',
				name: 'Type',
				width: '40px',
				formatter: function(value) {
					return value==1 ? '<img src="img/control_play_blue.png">' : '<img src="img/battle.png">';
				}
			},
			{	field: 'status',
				name: 'Status',
				width: '40px'
			},
			{	field: 'country',
				name: 'Country',
				width: '40px'
			},
			{	field: 'rank',
				name: 'Rank',
				width: '40px'
			},
			{	field: 'title',
				name: 'Battle Name',
				width: '200px'
			},
			{	field: 'map',
				name: 'Map',
				width: '200px'
			},
			{	field: 'game',
				name: 'Game',
				width: '200px'
			},
			{	field: 'host',
				name: 'Host',
				width: '100px'
			},
			{	field: 'players',
				name: '<img src="img/soldier.png">',
				width: '40px'
			},
			{	field: 'max_players',
				name: '<img src="img/grayuser.png">',
				//formatter: function(value) { return '<img src="img/soldier.png'; },
				width: '40px'
			},
			{	field: 'spectators',
				name: '<img src="img/search.png">',
				width: '40px'
				//innerHTML:''
			},
        ];
		
		this.grid = new dojox.grid.DataGrid({
			'query': {
                'title': '*'
            },
            'store': this.store,
            'clientSort': true,
            'rowSelector': '20px',
            'structure': layout,
			autoHeight:false,
			autoWidth:true,
			'onRowDblClick':dojo.hitch(this, 'joinRowBattle')
			//,'style':{ /*'position':'absolute',*/ 'width':'100%', 'height':'100%'}
			
		} );
		this.grid.placeAt(div1);
		this.domNode = div1;
		
		dojo.subscribe('Lobby/battles/addbattle', this, function(data){ this.addBattle(data) });
		dojo.subscribe('Lobby/battles/rembattle', this, function(data){ this.remBattle(data) });
		dojo.subscribe('Lobby/battles/updatebattle', this, function(data){ this.updateBattle(data) });
		dojo.subscribe('Lobby/battles/addplayer', this, function(data){ data.add=true; this.setPlayer(data) });
		dojo.subscribe('Lobby/battles/remplayer', this, function(data){ data.add=false; this.setPlayer(data) });
	},
	
	'empty':function()
	{
		delete this.store;
		this.setupStore();
		this.grid.setStore(this.store); //DUMB HAX
	},
	
	'setupStore':function()
	{
		this.store = new dojo.data.ItemFileWriteStore(
			{
				'data':{
					'identifier':'battle_id',
					'label':'title',
					'items':[]
				}
			}
		);
		
	},
	
	'joinRowBattle':function(e)
	{
		var row, battle_id, smsg, tempUser;
		//console.log(e.rowIndex)
		row = this.grid.getItem(e.rowIndex);
		battle_id = row.battle_id;
		//console.log(row)
		smsg = "JOINBATTLE " + battle_id; //[password] [scriptPassword]
		dojo.publish( 'Server/message', [{'msg':smsg }] );
	},
	
	'addBattle':function(data)
	{
		data.playerlist = { };
		data.members = 1;
		data.players = 1;
		data.spectators = 0;
		data.playerlist[data.host] = true;
		this.store.newItem(data);
		//this.grid.setStore(this.store); //DUMB HAX
	},
	'remBattle':function(data)
	{
		this.store.fetchItemByIdentity({
			'identity':data.battle_id,
			'scope':this,
			'onItem':function(item)
			{
				this.store.deleteItem(item);
			}
		});
		
	},
	
	'updateBattle':function(data)
	{
		this.store.fetchItemByIdentity({
			'identity':data.battle_id,
			'scope':this,
			'onItem':function(item)
			{
				var members;
				for(attr in data){
					if(attr != 'battle_id' )
					{		
						this.store.setValue(item, attr, data[attr]);
					}
				}
				members = parseInt( this.store.getValue(item, 'members') );
				this.store.setValue(item, 'players', members - parseInt( data.spectators) );
			}
		});
		//this.grid.setStore(this.store); //DUMB HAX
	},
	
	'setPlayer':function(data)
	{
		//console.log(data);
		this.store.fetchItemByIdentity({
			'identity':data.battle_id,
			'scope':this,
			'onItem':function(item)
			{
				var members, playerlist, spectators ;
				members = parseInt( this.store.getValue(item, 'members') );
				playerlist = this.store.getValue(item, 'playerlist');
				spectators = parseInt( this.store.getValue(item, 'spectators') );
				//console.log(members)
				//console.log(playerlist)
				if( data.add )
				{
					members += 1;
					playerlist[data.name] = true;
				}
				else
				{
					//console.log('removing player ' + data.name + ' || ' + data.battle_id )
					members -= 1;
					delete playerlist[data.name];
				}
				this.store.setValue(item, 'members', members);
				this.store.setValue(item, 'playerlist', playerlist);
				this.store.setValue(item, 'players', members - spectators );
			}
		});
		//this.grid.setStore(this.store); //DUMB HAX
	},
	
	
	'startup2':function()
	{
		if( this.startMeUp )
		{
			this.startMeUp = false;
			this.startup();
			this.grid.startup();
			
			dojo.style(this.domNode, 'minHeight', '');
		}
	},
	
	'blank':''
});//declare lwidgets.BattleList

dojo.declare("Script", [ ], {
	'script':'',
	'scriptTree':null,
	'constructor':function(args)
	{
		dojo.safeMixin(this, args);
		this.scriptTree = {};
	},
	'addScriptPath':function(tree, keyPathArr, val)
	{
		var keyPath, tree2;
		tree2 = tree;
		keyPath = keyPathArr[0];
		if( keyPathArr.length > 1 )
		{
			if( !tree2[keyPath] )
			{
				tree2[keyPath] = {};
			}
			tree2[keyPath] = this.addScriptPath( tree2[keyPath], keyPathArr.slice(1), val );
		}
		else
		{
			tree2[keyPath] = val;
		}
		return tree2;
	},
	
	'removeScriptPath':function(tree, keyPathArr)
	{
		var keyPath, tree2;
		tree2 = tree;
		keyPath = keyPathArr[0];
		if( keyPathArr.length > 1 )
		{
			tree2[keyPath] = this.removeScriptPath( tree2[keyPath], keyPathArr.slice(1) );
		}
		else
		{
			delete tree2[keyPath];
		}
		return tree2;
	},
	
	'addScriptTag':function(keyPath, val)
	{
		var keyPathArr;
		keyPathArr = keyPath.split('/');
		this.scriptTree = this.addScriptPath( this.scriptTree, keyPathArr, val )
	},
	
	'removeScriptTag':function(keyPath)
	{
		var keyPathArr;
		keyPathArr = keyPath.split('/');
		this.scriptTree = this.removeScriptPath( this.scriptTree, keyPathArr )
	},
	
	'scriptify':function(tree, level)
	{
		var script, v, tabs;
		script = '';
		tabs = Array(level+1).join('\t');
		for( k in tree )
		{
			v = tree[k];
			if( typeof(v) === 'object' )
			{
				script += tabs + '[' + k + ']\n';
				script += tabs + '{\n';
				script += this.scriptify(v, level+1) + '\n'
				script += tabs + '}\n';
			}
			else
			{
				script += tabs + k + '=' + v + ';\n';	
			}
		}
		return script;
	},
	
	'getScript':function()
	{
		return this.scriptify(this.scriptTree, 0)
	},
	
	'blank':''
});//declare Script


dojo.provide("lwidgets.Lobby");
//dojo.declare("lwidgets.Lobby", [ dijit._Widget, dijit._Templated ], {
dojo.declare("lwidgets.Lobby", [ dijit._Widget ], {
	'pingpongTime':20000,
	
	'nick':'',
	'password':'',
	'url' : 'springrts.com',
	'port' : '8200',
	'agreementText':'',
	'springVersion':'',
	'udpPort':'',
	'serverMode':'',
	
	'widgetsInTemplate':true,
	'connected' : false,
	'authorized' : false,
	'registering':false,
	'startMeUp':true,
	
	'tc':null,
	'mainContainer':null,
	'connectButton':null,
	'battleRoom':null,
	'battleList':null,
	'settings':null,
	'scriptObj':null,
	'renameButton':null,
	'changePassButton':null,
	'lobbyPlayers':null,
	
	'postCreate' : function()
	{
		dojo.subscribe('Lobby/rawmsg', this, function(data){ this.uberReceiver(data.msg) });
		
		dojo.subscribe('Server/message', this, function(data){ this.uberSender(data.msg) });
		dojo.subscribe('Lobby/startgame', this, 'startGame');
	},
	
	'buildRendering':function()
	{
		var tc, tabPaneDiv, mainDiv, battleDiv, homeDiv,
			homeDivLeft, homeDivRight,
			registerButton
			;
		
		this.players = {};
		this.lobbyPlayers = {};
		this.scriptObj = new Script();
		
		
		this.settings = new lwidgets.LobbySettings();
		
		mainDiv = dojo.create('div', {'style': {'height': '100%', 'width': '100%;' }});
		
		this.mainContainer = new dijit.layout.BorderContainer({
			design:"sidebar",
			gutters:true,
			liveSplitters:true,
			'style': {'height': '100%', 'width': '100%;' }
			,'onMouseUp':function(){dojo.publish('ResizeNeeded', [{}] );}
		}, mainDiv);
		
		
		//this.domNode = dojo.create('div', {'style': {'height': '100%', 'width': '100%;' }});
		tabPaneDiv = dojo.create('div', {}, mainDiv);
		//minHeight not working (nor min-height)
		battleDiv = dojo.create('div', {'style': {'height': '200px', 'width': '100%;' }}, mainDiv);
		
		
		var tcPane = new dijit.layout.ContentPane({ splitter:true, region:"center" }, tabPaneDiv );
		var battlePane = new dijit.layout.ContentPane({
			splitter:true,
			region:"bottom"
			//,'minSize':'60px' //messing things up
		}, battleDiv );
		
		this.domNode = mainDiv;
		
		
		tc = new dijit.layout.TabContainer( {
            'style': {'height': '400px', 'width': '100%;' }
        //}).placeAt(this.domNode);
        }).placeAt(tabPaneDiv);
		this.tc = tc;
		
		//this.battleRoom = new lwidgets.Battleroom( {'nick':this.nick, 'battleList':battleList } ).placeAt(battleDiv)
		this.battleRoom = new lwidgets.Battleroom( {'settings':this.settings, 'nick':this.nick, 'lobbyPlayers':this.lobbyPlayers } ).placeAt(battleDiv)
		
		//home tab
		homeDiv = dojo.create('div', {});
		var homeDivLeft = dojo.create('div', { 'style':{'position':'absolute', 'width':'50%' }, 'innerHTML':'Thank you for trying Spring Web Lobby. <br /><br /> '}, homeDiv);
		var homeDivRight = dojo.create('div', { 'style':{'position':'absolute', 'width':'50%', 'right':'0px' } }, homeDiv);
		dojo.subscribe( 'Lobby/motd', this, function(data){
			dojo.attr( homeDivRight, 'innerHTML', ( dojo.attr(homeDivRight,'innerHTML') + '<br />' + data.line ) );
		});
		dojo.subscribe( 'Lobby/clearmotd', this, function(){
			dojo.attr( homeDivRight, 'innerHTML', '' );
		});
		

		this.connectButton = new dijit.form.Button({
			'label':'Connect',
			'onClick':dojo.hitch(this, 'connectButtonPush')
		}).placeAt(homeDivLeft);
		dojo.create('br', {}, homeDivLeft);
		dojo.create('br', {}, homeDivLeft);
		this.renameButton = new dijit.form.Button({
			'label':'Rename...',
			'disabled':'disabled',
			'onClick':dojo.hitch(this, 'makeRenameDialog')
		}).placeAt(homeDivLeft);
		dojo.create('br', {}, homeDivLeft);
		this.changePassButton = new dijit.form.Button({
			'label':'Change Password...',
			'disabled':'disabled',
			'onClick':dojo.hitch(this, 'makeChangePassDialog')
		}).placeAt(homeDivLeft);
		dojo.create('br', {}, homeDivLeft);
		registerButton = new dijit.form.Button({
			'label':'Register...',
			'onClick':dojo.hitch(this, 'makeRegisterDialog')
		}).placeAt(homeDivLeft);
		
		cpCurrent = new dijit.layout.ContentPane({
            title: "Home",
            content: homeDiv 
        });
		tc.addChild( cpCurrent );
		
		this.setupTabs();
	},
	
	'startGame':function()
	{
		var uriContent, newWindow;
		alert('Let\'s start spring!!!')
		console.log(this.scriptObj.getScript());
		
		uriContent = "data:application/x-spring-game," + encodeURIComponent( this.scriptObj.getScript() );
		newWindow = window.open(uriContent, 'script.spg');
	},
	
	'addUser':function(name, country, cpu)
	{
		this.lobbyPlayers[name] = new User({ 'name':name, 'country':country, 'cpu':cpu });
	},
	'remPlayer':function(name)
	{
		delete this.lobbyPlayers[name];
	},
	
	'makeRegisterDialog':function()
	{
		var dlg, nameInput, passInput, dlgDiv, goButton;
		dlgDiv = dojo.create( 'div', {} );
		
		dojo.create('span',{'innerHTML':'Name '}, dlgDiv )
		nameInput = dojo.create( 'input', {'type':'text'}, dlgDiv );
		dojo.create('br',{}, dlgDiv )
		
		dojo.create('span',{'innerHTML':'Password '}, dlgDiv )
		passInput = dojo.create( 'input', {'type':'password'}, dlgDiv );
		dojo.create('br',{}, dlgDiv )
		dojo.create('br',{}, dlgDiv )
		
		dlg = new dijit.Dialog({
            'title': "Register A New Account",
            'style': "width: 300px",
			'content':dlgDiv
        });
		
		goButton = new dijit.form.Button({
			'label':'Register',
			'onClick':dojo.hitch(this, function(){
				this.registering = true;
				this.settings.setSetting( 'name', dojo.attr(nameInput, 'value') );
				this.settings.setSetting( 'password', dojo.attr(passInput, 'value') );
				this.connectToSpring();
				dlg.hide();
			})
		}).placeAt(dlgDiv);
		
		dlg.show();	
	},
	'makeChangePassDialog':function()
	{
		var dlg, oldPassInput, newPassInput, dlgDiv, goButton;
		dlgDiv = dojo.create( 'div', {} );
		
		dojo.create('span',{'innerHTML':'Old Password '}, dlgDiv )
		oldPassInput = dojo.create( 'input', {'type':'password'}, dlgDiv );
		dojo.create('br',{}, dlgDiv )
		
		dojo.create('span',{'innerHTML':'New Password '}, dlgDiv )
		newPassInput = dojo.create( 'input', {'type':'password'}, dlgDiv );
		dojo.create('br',{}, dlgDiv )
		dojo.create('br',{}, dlgDiv )
		
		dlg = new dijit.Dialog({
            'title': "Change Your Password",
            'style': "width: 300px",
			'content':dlgDiv
        });
		
		goButton = new dijit.form.Button({
			'label':'Change Password',
			'onClick':dojo.hitch(this, function(){
				this.uberSender(
					'CHANGEPASSWORD '
					+ dojo.attr(oldPassInput, 'value')
					+ dojo.attr(newPassInput, 'value')
				);
				dlg.hide();
			})
		}).placeAt(dlgDiv);
		
		dlg.show();	
	},
	
	'makeRenameDialog':function()
	{
		var dlg, nameInput, dlgDiv, goButton;
		dlgDiv = dojo.create( 'div', {} );
		
		dojo.create('span',{'innerHTML':'New Name '}, dlgDiv )
		nameInput = dojo.create( 'input', {'type':'text'}, dlgDiv );
		dojo.create('br',{}, dlgDiv )
		dojo.create('br',{}, dlgDiv )
		
		dlg = new dijit.Dialog({
            'title': "Rename Your Account",
            'style': "width: 300px",
			'content':dlgDiv
        });
		
		goButton = new dijit.form.Button({
			'label':'Rename (will reconnect)',
			'onClick':dojo.hitch(this, function(){
				var newName;
				newName = dojo.attr(nameInput, 'value');
				this.uberSender( 'RENAMEACCOUNT ' + newName );
				this.settings.setSetting( 'name', newName );
				this.disconnect();
				this.connectToSpring();
				dlg.hide();
			})
		}).placeAt(dlgDiv);
		
		dlg.show();	
	},
	
	'setupTabs':function()
	{
		var chatManager, battleList,
			cpCurrent
			;
		
		//chat tab
		chatManager = new lwidgets.ChatManager( {'settings':this.settings, 'lobbyPlayers':this.lobbyPlayers } )
		cpCurrent = new dijit.layout.ContentPane({
            'title': "Chat",
            'content': chatManager.domNode,
			'onShow':dojo.hitch(chatManager, chatManager.startup2)
        });
        this.tc.addChild( cpCurrent );
		
		this.addBattleList();
		
		//Settings tab
		cpCurrent = new dijit.layout.ContentPane({
		    'title': "Settings",
            //content: dojo.create('div', {'innerHTML':'Settings go here.'})
            content: this.settings
        });
        this.tc.addChild( cpCurrent );
		
		this.battleRoom.startup2();
	},
	
	'addBattleList':function()
	{
		//battle list tab
		battleList = new lwidgets.BattleList()
		cpCurrent = new dijit.layout.ContentPane({
		//cpBattlelist = new dojox.layout.ContentPane({
            'title': "Battles (unfinished)",
            'content': battleList.domNode,
			'onShow':dojo.hitch(battleList, battleList.startup2)
        });
        this.tc.addChild( cpCurrent );
		this.battleList = battleList;
		this.battleRoom.battleList = this.battleList;
	},
	
	'startup2':function()
	{
		if( this.startMeUp )
		{
			this.startMeUp = false;
			
			this.mainContainer.startup();
			this.tc.startup();
			
		}
	},
	
	'pingpong':function()
	{
		if( this.authorized )
		{
			this.uberSender('PING ' + 'swl');
			setTimeout( function(thisObj){ thisObj.pingpong(); }, this.pingpongTime, this );	
		}
	},
	
	'agreementAccept':function()
	{
		var accept;
		accept = confirm( this.agreementText );
		if(accept)
		{
			this.uberSender('CONFIRMAGREEMENT');
			this.login();
		}
		else
		{
			this.disconnect();
		}
	},
	
	'disconnect':function()
	{
		this.battleList.empty();
		this.connectButton.set('label', 'Connect');
		this.connected = false;
		this.socketDisconnect();
	},
	
	'uberReceiver':function(msg)
	{
		var msg_arr, cmd, channel, message, rest, battle_id, 
			i, time, user, battlestatus, status, teamcolor,
			url,
			autoJoinChans,
			country, cpu,
			blistStore,
			scriptPassword
		;
		
		msg_arr = msg.split(' ');
		cmd = msg_arr[0];
		
		console.log('<TASSERVER> ' + msg);
		
		/*
		REQUESTUPDATEFILE
		OFFERFILE
		
		UDPSOURCEPORT
		CLIENTIPPORT
		HOSTPORT 
		
		CHANNELMESSAGE
		
		CHANNELS
		CHANNEL
		ENDOFCHANNELS
		
		MUTELIST
		MUTELISTBEGIN
		MUTELISTEND
		
		
		JOINBATTLEREQUEST 
		JOINBATTLEACCEPT
		JOINBATTLEDENY
		OPENBATTLEFAILED
		CLIENTBATTLESTATUS
		REQUESTBATTLESTATUS
		HANDICAP 
		KICKFROMBATTLE
		FORCEQUITBATTLE
		FORCETEAMNO
		FORCEALLYNO
		FORCETEAMCOLOR
		FORCESPECTATORMODE
		RING
		ADDBOT
		REMOVEBOT 
		UPDATEBOT
		ADDSTARTRECT
		REMOVESTARTRECT
		MYBATTLESTATUS 
		REDIRECT
		
		MYSTATUS
		CLIENTSTATUS 
		
		ACQUIREUSERID
		USERID 
		
		< moderators >
		FORCELEAVECHANNEL
		TESTLOGIN 
		*/
		
		if(false){}
		
		else if( cmd === 'ACCEPTED' )
		{
			this.authorized = true;
			this.connectButton.set('label', 'Disconnect');
			
			autoJoinChans = this.settings.settings.autoJoinChannelsList.split('\n');
			dojo.forEach(autoJoinChans, function(chan){
				this.uberSender( 'JOIN ' + chan.trim() );
			}, this);
			
			this.renameButton.set('disabled', null)
			this.changePassButton.set('disabled', null)
			
			this.pingpong();
		}
		else if( cmd === 'ADDUSER' )
		{
			//ADDUSER username country cpu [accountID]
			name 		= msg_arr[1];
			country	 	= msg_arr[2];
			cpu 		= msg_arr[3];
			//accountID	= msg_arr[4];
			this.addUser(name, country, cpu);
		}
		else if( cmd === 'AGREEMENT' )
		{
			rest = msg_arr.slice(1).join(' ');
			this.agreementText += rest + '\n';
		}
		else if( cmd === 'AGREEMENTEND' )
		{
			this.agreementAccept();
		}
		
		else if( cmd === 'BATTLECLOSED' )
		{
			battle_id = msg_arr[1];
			dojo.publish('Lobby/battles/rembattle', [{ 'battle_id':battle_id }] );
		}
		else if( cmd === 'BATTLEOPENED' )
		{
			rest = msg_arr.slice(11).join(' ').split('\t');
			dojo.publish('Lobby/battles/addbattle', [{
				'battle_id' 	: msg_arr[1],
				'type' 			: msg_arr[2],
				//nat_type		: msg_arr[3],
				'host'			: msg_arr[4],
				'ip'			: msg_arr[5],
				'hostport'		: msg_arr[6],
				'max_players'	: msg_arr[7],
				'password'		: msg_arr[8],
				'rank'			: msg_arr[9],
				'map_hash'		: msg_arr[10],
				'map' 			: rest[0],
				'title'			: rest[1],
				'game'	 		: rest[2]		
			}] );
			
		}
		
		else if( cmd === 'CHANNELTOPIC' )
		{
			channel = msg_arr[1];
			user = msg_arr[2];
			time = msg_arr[3];
			message = msg_arr.slice(4).join(' ');
			dojo.publish('Lobby/chat/channel/topic', [{'channel':channel, 'name':user, 'msg':message, 'time':time }]  )
		}
		
		else if( cmd === 'CLIENTBATTLESTATUS' )
		{
			user = msg_arr[1];
			battlestatus = msg_arr[2];
			teamcolor = msg_arr[3];
			dojo.publish('Lobby/battle/playerstatus', [{'name':user, 'battlestatus':battlestatus, 'teamcolor':teamcolor }]  )
		}
		else if( cmd === 'CLIENTSTATUS' )
		{
			user = msg_arr[1];
			status = msg_arr[2];
			this.lobbyPlayers[user].setStatus(status);
		}
		
		else if( cmd === 'CLIENTS' )
		{
			channel = msg_arr[1];
			for(i=2; i < msg_arr.length; i++)
			{
				user = msg_arr[i];
				dojo.publish('Lobby/chat/channel/addplayer', [{'channel':channel, 'name':user }]  )
			}
		}
		
		else if( cmd === 'DENIED' )
		{
			rest = msg_arr.slice(1).join(' ');
			alert('Login Failed. Reason: ' + rest)
			this.disconnect();
		}
		
		else if( cmd === 'JOIN' )
		{
			channel = msg_arr[1];
			dojo.publish('Lobby/chat/addroom', [{'name':channel}] )
		}
		else if( cmd === 'JOINED' )
		{
			channel = msg_arr[1];
			user = msg_arr[2];
			dojo.publish('Lobby/chat/channel/addplayer', [{'channel': channel, 'name':user, 'joined':true }]  )
		}
		else if( cmd === 'JOINFAILED' )
		{
			channel = msg_arr[1];
			rest = msg_arr.slice(2).join(' ');
			alert('Failed to join channel "' + channel + '" - ' + rest);
		}
		
		else if( cmd === 'JOINBATTLE' )
		{
			//JOINBATTLE 2279 * 1917514793
			battle_id = msg_arr[1];
			dojo.publish('Lobby/battle/joinbattle', [{'battle_id':battle_id }]  )
		}
		else if( cmd === 'JOINBATTLEFAILED' )
		{
			rest = msg_arr.slice(1).join(' ');
			alert('Failed to join battle - ' + rest)
		}
		else if( cmd === 'JOINEDBATTLE' )
		{
			battle_id 		= msg_arr[1];
			user 			= msg_arr[2];
			scriptPassword 	= msg_arr[3];
			this.generateScript(battle_id, user, scriptPassword);
			dojo.publish('Lobby/battles/addplayer', [{'name':user, 'battle_id':battle_id }]  )
		}
		
		else if( cmd === 'LEAVE' )
		{
			channel = msg_arr[1];
			dojo.publish('Lobby/chat/remroom', [{'name':channel}] )
		}
		
		else if( cmd === 'LEFT' )
		{
			channel = msg_arr[1];
			user = msg_arr[2];
			message = msg_arr.slice(3).join(' ');
			dojo.publish('Lobby/chat/channel/remplayer', [{'channel': channel, 'name':user, 'msg':message }]  )
		}
		else if( cmd === 'LEFTBATTLE' )
		{
			battle_id = msg_arr[1];
			user = msg_arr[2];
			dojo.publish('Lobby/battles/remplayer', [{'name':user, 'battle_id':battle_id }] );
		}
		else if( cmd === 'MOTD' )
		{
			rest = msg_arr.slice(1).join(' ');
			dojo.publish('Lobby/motd', [{'line':rest }] );
		}
		
		else if( cmd === 'REGISTRATIONACCEPTED' )
		{
			alert('Registration Successful!')
			this.registering = false;
			this.disconnect();
			this.connectToSpring();
		}
		else if( cmd === 'REGISTRATIONDENIED' )
		{
			rest = msg_arr.slice(1).join(' ');
			alert('Registration Failed. Reason: ' + rest)
			this.disconnect();
			this.registering = false;
		}
		else if( cmd === 'REMOVESCRIPTTAGS' )
		{
			var scriptTags;
			
			scriptTags = msg_arr.slice(1).join(' ').split('\t');
			dojo.forEach(scriptTags, function(scriptTag){
				var key, val, scriptTagArr;
				scriptTagArr = scriptTag.split('=');
				key = scriptTagArr[0];
				val = scriptTagArr[1];
				
				key = key.toLowerCase();
				val = val.toLowerCase();
				
				this.scriptObj.removeScriptTag(key, val);
			}, this);
			
			console.log(this.scriptObj.getScript() );
		}
		
		else if( cmd === 'REMOVEUSER' )
		{
			//REMOVEUSER username
			name = msg_arr[1];
			this.remPlayer(name);
		}
		
		else if( cmd === 'SAID' )
		{
			channel = msg_arr[1];
			user = msg_arr[2];
			message = msg_arr.slice(3).join(' ');
			dojo.publish('Lobby/chat/channel/playermessage', [{'channel':channel, 'name':user, 'msg':message }]  )
		}
		else if( cmd === 'SAIDEX' )
		{
			channel = msg_arr[1];
			user = msg_arr[2];
			message = msg_arr.slice(3).join(' ');
			dojo.publish('Lobby/chat/channel/playermessage', [{'channel':channel, 'name':user, 'msg':message, 'ex':true }]  )
		}
		
		else if( cmd === 'SAIDBATTLE' )
		{
			user = msg_arr[1];
			message = msg_arr.slice(2).join(' ');
			dojo.publish('Lobby/battle/playermessage', [{'battle':true, 'name':user, 'msg':message }]  )
		}
		else if( cmd === 'SAIDBATTLEEX' )
		{
			user = msg_arr[1];
			message = msg_arr.slice(2).join(' ');
			dojo.publish('Lobby/battle/playermessage', [{'battle':true, 'name':user, 'msg':message, 'ex':true }]  )
		}
		
		else if( cmd === 'SAIDPRIVATE' )
		{
			user = msg_arr[1];
			message = msg_arr.slice(2).join(' ');
			dojo.publish('Lobby/chat/addprivchat', [{'name':user, 'msg':message }]  )
			dojo.publish('Lobby/chat/user/playermessage', [{'userWindow':user, 'name':user, 'msg':message }]  )
		}
		else if( cmd === 'SAYPRIVATE' )
		{
			user = msg_arr[1];
			message = msg_arr.slice(2).join(' ');
			dojo.publish('Lobby/chat/addprivchat', [{'name':user, 'msg':message }]  )
			dojo.publish('Lobby/chat/user/playermessage', [{'userWindow':user, 'name':this.nick, 'msg':message }]  )
		}
		
		else if( cmd === 'SERVERMSG' || cmd === 'BROADCAST' )
		{
			rest = msg_arr.slice(1).join(' ');
			alert('[ Server Message ]\n' + rest)
		}
		else if( cmd === 'SERVERMSGBOX' )
		{
			rest = msg_arr.slice(1).join(' ');
			url = msg_arr[msg_arr.length-1]
			goToUrl = confirm('[ Server Message ]\n' + rest + '\n\n Proceed to URL?')
			if(goToUrl)
			{
				window.open(url,'_blank');
			}
		}
		else if( cmd === 'SETSCRIPTTAGS' )
		{
			var scriptTags;
			
			scriptTags = msg_arr.slice(1).join(' ').split('\t');
			dojo.forEach(scriptTags, function(scriptTag){
				var key, val, scriptTagArr;
				scriptTagArr = scriptTag.split('=');
				key = scriptTagArr[0];
				val = scriptTagArr[1];
				
				key = key.toLowerCase();
				val = val.toLowerCase();
				
				
				this.scriptObj.addScriptTag(key, val);
			}, this);
			
			console.log(this.scriptObj.getScript() );
		}
		
		
		else if( cmd === 'TASServer' )
		{
			this.springVersion 	= msg_arr[2];
			this.udpPort 		= msg_arr[3];
			this.serverMode 	= msg_arr[4];
			
			if(this.registering)
			{
				this.uberSender('REGISTER '+ this.settings.settings.name + ' ' + MD5.b64_md5( this.settings.settings.password ) )
			}
			else
			{
				dojo.publish('Lobby/clearmotd' );
				dojo.publish('Lobby/motd', [{'line':'<b>Server Version: ' + msg_arr[1]+'</b>' }] );
				dojo.publish('Lobby/motd', [{'line':'<b>Spring Version: ' + this.springVersion+'</b>' }] );
				this.login();
			}
		}
		else if( cmd === 'UPDATEBATTLEINFO' )
		{
			battle_id = msg_arr[1];
			dojo.publish('Lobby/battles/updatebattle', [{
				'battle_id' 	: msg_arr[1],
				'spectators' 	: msg_arr[2],
				'locked' 		: msg_arr[3],
				'map_hash' 		: msg_arr[4],
				'map' 			: msg_arr.slice(5).join(' ').split('\t')
			}]);
		}
	},
	
	'generateScript':function(battle_id, user, scriptPassword)
	{
		blistStore = this.battleList.store;
		this.battleList.store.fetchItemByIdentity({
			'identity':battle_id,
			'scope':this,
			'onItem':function(item)
			{
				var ip, host, hostport, game, map;
				
				ip 			= blistStore.getValue(item, 'ip');
				host 		= blistStore.getValue(item, 'host');
				hostport 	= blistStore.getValue(item, 'hostport');
				game 		= blistStore.getValue(item, 'game');
				map 		= blistStore.getValue(item, 'map');
				
				//ModHash
				//AutohostPort
				
				this.scriptObj.addScriptTag( "GAME/GameType", 		game );
				this.scriptObj.addScriptTag( "GAME/SourcePort", 	'8300' );
				this.scriptObj.addScriptTag( "GAME/HostIP", 		ip );
				this.scriptObj.addScriptTag( "GAME/HostPort", 		hostport );
				this.scriptObj.addScriptTag( "GAME/IsHost", 		host === this.nick ? '1' : '0' );
				this.scriptObj.addScriptTag( "GAME/MyPlayerName", 	this.nick );
				if( scriptPassword )
				{
					this.scriptObj.addScriptTag( "GAME/MyPasswd", 	scriptPassword );
				}
			}
		});
	},
	
	//connection
	'uberSender':function(message)
	{
		console.log( "<LOCAL> " + message );
		if(this.connected)
		{
			this.socketSend( message );
		}
	},
	
	'login':function ()
	{	
		var message;
		this.nick = this.settings.settings.name;
		this.pass = this.settings.settings.password;
		dojo.publish('SetNick', [{'nick':this.nick}])
		message = 'LOGIN ' + this.nick + ' ' + MD5.b64_md5( this.pass ) +' 1234 * SpringWebLobby 0.0001';
		this.uberSender(message)
	},
	
	'connectButtonPush':function()
	{
		if( this.settings.settings.name === '' || this.settings.settings.password === ''  )
		{
			alert('Please enter your name and password in the Settings tab, '
				  + 'or register to create a new account by clicking on Register.')
			return;
		}
		this.connectToSpring();
	},
	
	'connectToSpring':function()
	{
		if(this.connected)
		{
			//this.tc.destroyDescendants();
			this.disconnect();
		}
		else
		{
			this.socketConnect(this.url, this.port);
			this.connected = true;
			this.connectButton.set('label', 'Connecting...');
		}
		
	},
	
	// Connect to a given url and port
	'socketConnect':function (url, port)
	{
		if(java_socket_bridge_ready_flag)
		{
			//return
			this.getJavaSocketBridge().connect(url, port);
		}
		else
		{
			this.onSocketError("Java Socket Bridge cannot connect until the applet has loaded");
		}
		
	},
	
	// Disconnect
	'socketDisconnect':function ()
	{
		if(java_socket_bridge_ready_flag)
		{
			//return
			this.getJavaSocketBridge().disconnect();
		}
		else
		{
			this.onSocketError("Java Socket Bridge cannot disconnect until the applet has loaded");
		}
	},
	
	// Write something to the socket
	'socketSend':function (message)
	{
		if(java_socket_bridge_ready_flag)
		{
			/*return */ this.getJavaSocketBridge().send(message);
		}
		else
		{
			this.onSocketError("Java Socket Bridge cannot send a message until the applet has loaded");
		}
	},
	
	
	// Report an error
	'onSocketError':function (message){
		alert(message);
	},
	
	// Get the applet object
	'getJavaSocketBridge':function (){
		return document.getElementById('JavaSocketBridge');
	},
	
	'blank':''
});//declare lwidgets.Lobby

/*
var test = new Script();
test.addScriptTag( "GAME/test1/StartMetal", 1000 );
test.addScriptTag( "GAME/test1/StartCheese", 300 );
//test.removeScriptTag( "GAME/test1/StartCheese" );
console.log( JSON.STRINGIFY( test.scriptTree));
console.log( test.getScript() );
*/