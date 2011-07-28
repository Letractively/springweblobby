///////////////////////////////////

// JS Spring Lobby Interface

// By CarRepairer

///////////////////////////////////

dojo.provide("lwidgets.PlayerList");
dojo.declare("lwidgets.PlayerList", [ dijit._Widget, dijit._Templated ], {
	'widgetsInTemplate':true,
	'templateString' : dojo.cache("lwidgets", "templates/playerlist.html"),
	
	'users':null,
	'playersOptions':null,
	
	'postCreate':function()
	{
		this.users = {};
		this.playersOptions = {};
		this.postCreate2();
	},
	
	'postCreate2':function()
	{
	},

	'queryPlayer':function( e )
	{
		var option, name;
		option = e.currentTarget;
		name = dojo.attr( option, 'innerHTML' );
		dojo.publish('Lobby/chat/addprivchat', [{'name':name, 'msg':'' }]  )
	},
	
	'addUser':function(user)
	{
		var pname;
		pname = user.name;
		this.users[pname] = user;
		this.playersOptions[pname] = dojo.create('option', {'innerHTML':pname }, this.playerListSelect.domNode )
		dojo.connect( this.playersOptions[pname], 'ondblclick', this, 'queryPlayer', this.playersOptions[pname] );
		this.refresh();
	},
	'removeUser':function(user)
	{
		var pname;
		pname = user.name;
		delete this.users[pname];
		dojo.destroy(this.playersOptions[pname])
		delete this.playersOptions[pname];
		this.refresh();
	},
	
	'refresh':function()
	{
	},
	
	'empty':function()
	{
		dojo.empty( this.playerListSelect.domNode );
		this.users = {};
	},
	
	
	'blank':''
});//declare lwidgets.PlayerList

dojo.provide("lwidgets.BattlePlayerList");
dojo.declare("lwidgets.BattlePlayerList", [ lwidgets.PlayerList ], {
	
	'ateams':null,
	'ateamNumbers':null,
	
	'postCreate2':function()
	{
		dojo.subscribe('Lobby/battle/playerstatus', this, 'playerStatus' );
	},
	
	'refresh':function()
	{
		this.setupPlayerList();
	},
	
	
	'playerStatus':function( data )
	{
		var user;
		user = this.users[data.name];
		this.users[data.name].setBattleStatus( data.battlestatus, data.teamColor );
		this.setupPlayerList();
	},
	
	'makePlayerOption':function(user)
	{	
		this.playersOptions[user.name] = dojo.create('option', {'innerHTML':user.toString() }, this.playerListSelect.domNode );
		dojo.connect( this.playersOptions[user.name], 'ondblclick', this, 'queryPlayer', this.playersOptions[user.name] );
	},
	
	
	'setupTeamList':function()
	{
		var name, ateam, spec, user;
		
		this.ateams = {};
		this.ateamNumbers = [];
		for( name in this.users )
		{
			user = this.users[name];
			
			ateam = user.allyNumber;
			spec = user.isSpectator;
			if( spec )
			{
				ateam = '-1';
			}
			
			if(!this.ateams[ateam])
			{
				this.ateams[ateam] = {};
				this.ateamNumbers.push(ateam);
			}
			this.ateams[ateam][name] = user;
		}
		this.ateamNumbers.sort(function(a,b) { return a - b; });
	},	
	
	'setupPlayerList':function()
	{
		var user, name, ateam, ateamOut, ateamUsers ;
		
		this.setupTeamList();
		
		dojo.empty( this.playerListSelect.domNode );
		//for( ateam in this.ateams ){
		dojo.forEach(this.ateamNumbers, function(ateam){
			if(ateam !== '-1')
			{
				ateamOut = '<< TEAM ' + (parseInt(ateam)+1) + ' >>'
				dojo.create('option', {'innerHTML': ateamOut }, this.playerListSelect.domNode );
				
				ateamUsers = this.ateams[ateam]
				for( name in ateamUsers  )
				{	
					user = ateamUsers[name];	
					this.makePlayerOption( user );
				}
			}
		}, this);
		
		ateamOut = '<< Spectators >>'
		dojo.create('option', {'innerHTML': ateamOut }, this.playerListSelect.domNode );
		
		ateamUsers = this.ateams['-1']
		for( name in ateamUsers  )
		{	
			user = ateamUsers[name];	
			this.makePlayerOption( user );
		}
			
	},
	
	'blank':''
});//declare lwidgets.BattlePlayerList

dojo.provide("lwidgets.Chat");
dojo.declare("lwidgets.Chat", [ dijit._Widget, dijit._Templated ], {
	//'widgetsInTemplate':true,
	
	//'templateString' : dojo.cache("lwidgets", "templates/chatroom.html"), //ARG
	
	'mainContainer':'',
	'messageNode':'',
	'name':'',
	'nick':'',
	
	'startMeUp':true,
	
	'maxLines':100,
	
	'lobbyPlayers':null,	//mixed in
	'settings':null,
	
	'postCreate' : function()
	{
		
		this.mainContainer = new dijit.layout.BorderContainer({
			design:"sidebar",
			gutters:true,
			liveSplitters:true
		}, this.mainContainerNode);
		
		this.messageNode = new dijit.layout.ContentPane({ splitter:true, region:"center" }, this.messageDivNode );
		this.inputNode = new dijit.layout.ContentPane({ splitter:false, region:"bottom" }, this.inputDivNode );
		
		this.postCreate2();
		setTimeout( function(thisObj){ dojo.publish('SetColors') }, 1000, this );
		
		dojo.subscribe('SetNick', this, function(data){ this.nick = data.nick } );
		
		//dumb hax
		dojo.subscribe('ResizeNeeded', this, function(){ setTimeout( function(thisObj){ thisObj.resizeAlready(); }, 400, this );  } );
		
	},
	
	
	'postCreate2':function()
	{
	},
	
	'send':function(e)
	{
		var msg, smsg, msg_arr, rest;
		//enter
		if(e.keyCode != 13) return;
		
		msg = this.textInputNode.value;
		
		msg_arr = msg.split(' ');
		cmd = msg_arr[0];
		
		if( cmd == '/me' )
		{
			rest = msg_arr.slice(1).join(' ')
			smsg = this.saystring + 'EX ' + this.name + ' ' + rest;
		}
		else
		{
			smsg = this.saystring + ' ' + this.name + ' ' + msg;
		}
		dojo.publish( 'Server/message', [{'msg':smsg }] );
		this.textInputNode.value = '';
	},
	
	
	'scrollToBottom':function()
	{
		this.messageNode.domNode.scrollTop = 9999;
	},
	
	'addLine':function(line, style, className)
	{
		var toPlace, newNode, date, timestamp, line_ts, line_clean;
		date = new Date();
		timestamp = '[' + date.toLocaleTimeString() + ']';
		toPlace = this.messageNode.domNode;
		line_ts = timestamp + ' ' + line;
		newNode = dojo.create('div', {
			'innerHTML':line_ts,
			'style':style ? style : {},
			'class':className ? className : ''
		}, toPlace )
		
		//fixme: hidden join/leaves will cause confusing removal of chat lines
		while( toPlace.children.length > this.maxLines )
		{
			dojo.destroy( toPlace.firstChild );
		}
		this.scrollToBottom(newNode);
	},
	
	'playerMessage':function( data )
	{
		var pname, msg, line, lineStyle, lineClass;
		
		if(data.channel !== this.name && data.userWindow !== this.name && data.battle === undefined )
		{
			return;
		}
		
		msg = data.msg;
		msg = dojox.html.entities.encode(msg);
		pname = data.name;
		
		if(data.ex)
		{
			line = '* ' + pname + ' ' + msg
		}
		else
		{
			line = 	dojox.html.entities.encode('<')
					+ pname
					+ dojox.html.entities.encode('> ')
					+ msg
		}
		
		lineStyle = {};
		lineClass = '';
		if(data.ex)
		{
			lineStyle = {'color':this.settings.settings.chatActionColor};
			lineClass = 'chatAction';
		}
		else if(pname == this.nick)
		{
			lineStyle = {'color':this.settings.fadedColor };
			lineClass = 'chatMine';
		}
		this.addLine( line, lineStyle, lineClass );
	},
	
	//stupid hax
	'resizeAlready':function()
	{
		this.mainContainer.resize();
	},
	'startup2':function()
	{
		//sucky hax
		setTimeout( function(thisObj){ thisObj.resizeAlready(); }, 400, this );
		if( this.startMeUp )
		{
			this.startMeUp = false;
			this.mainContainer.startup();
		}
	},
	
	'blank':''
});//declare lwidgets.Chatroom


dojo.provide("lwidgets.Chatroom");
dojo.declare("lwidgets.Chatroom", [ lwidgets.Chat ], {
	'widgetsInTemplate':true,
	
	//'templateString' : dojo.cache("lwidgets", "templates/chatroom.html"), //ARG
	'templateString' : dojo.cache("lwidgets", "templates/chatroom_nopane.html"),
	
	'saystring':'SAY',
	'name' : "",

	'players' : null,
	'playerListContent':null,
	'topicNode':null,

	'postCreate2':function()
	{
		this.players = {};
		
		this.playerListContent = new dijit.layout.ContentPane({ splitter:true, region:"trailing" }, this.playerlistDivNode );
		this.topicNode = new dijit.layout.ContentPane({ splitter:true, region:"top" }, this.topicDivNode );
		
		dojo.subscribe('Lobby/chat/channel/topic', this, 'setTopic' );
		dojo.subscribe('Lobby/chat/channel/addplayer', this, 'addPlayer' );
		dojo.subscribe('Lobby/chat/channel/remplayer', this, 'remPlayer' );
		dojo.subscribe('Lobby/chat/channel/playermessage', this, 'playerMessage' );
		
		//setTimeout( function(thisObj){ thisObj.sortPlayerlist(); }, 2000, this );
	},
	
	'setTopic':function(data)
	{
		var msg, topicStr, timestamp, date;
		if(data.channel !== this.name)
		{
			return;
		}
		msg = data.msg;
		date = new Date();
		date.setTime(data.time);
		timestamp = date.toLocaleString();
		msg = msg.replace(/\\n/g, '<br />');
		topicStr = msg + "<br /><div align='right' style='font-style:italic'>(Topic set by " + data.name + ' on ' + timestamp + ')</div>';
		dojo.attr( this.topicDivNode, 'innerHTML', topicStr );
	},
	
	'addPlayer':function( data )
	{
		var pname, line, user;
		if(data.channel !== this.name)
		{
			return;
		}
		pname = data.name;
		//user = new User();
		user = this.lobbyPlayers[pname];
		this.players[pname] = user;
		this.playerListNode.addUser(user);
		
		//if( data.joined && this.settings.settings.showJoinsAndLeaves )
		if( data.joined )
		{
			line = '*** ' + pname + ' has joined ' + this.name;
			//this.addLine( line, {'color':this.settings.settings.chatLeaveColor}, 'chatJoin' );
			this.addLine(
				line,
				{
					'color':this.settings.settings.chatJoinColor,
					'display':this.settings.settings.showJoinsAndLeaves ? 'block' :'none'
				},
				'chatJoin'
				);
		}
	},
	
	
	'remPlayer':function( data )
	{
		var pname, line;
		if(data.channel !== this.name)
		{
			return;
		}
		pname = data.name;
		this.playerListNode.removeUser( this.players[pname] );
		
		delete this.players[pname];
		//if( this.settings.settings.showJoinsAndLeaves )
		{
			line = '*** ' + pname + ' has left ' + this.name + ' ('+ data.msg +')';
			//this.addLine( line, {'color':this.settings.settings.chatLeaveColor}, 'chatLeave' );
			this.addLine(
				line,
				{
					'color':this.settings.settings.chatLeaveColor,
					'display':this.settings.settings.showJoinsAndLeaves ? 'block' :'none'
				},
				'chatLeave'
				);
		}
	},
	
	
	'blank':''
});//declare lwidgets.Chatroom




dojo.provide("lwidgets.Battleroom");
dojo.declare("lwidgets.Battleroom", [ lwidgets.Chat ], {
	'widgetsInTemplate':true,
	
	'templateString' : dojo.cache("lwidgets", "templates/battleroom_nopane.html"),
	
	'saystring':'SAYBATTLE',
	'name':'',
	'host':'',
	
	'battle_id':0,
	
	'specState':true,
	'runningGame':false,
	
	'playerlistNode':null,
	'players' : null,
	'ateams':null,
	'ateamNumbers':null,
	'battleList':null,		//mixed in
	
	'postCreate2':function()
	{
		this.players = {};
		this.ateams = {};
		this.ateamNumbers = [];
		
		
		this.playerlistNode = new dijit.layout.ContentPane({ splitter:true, region:"trailing" }, this.playerlistDivNode );
		
		dojo.subscribe('Lobby/battle/joinbattle', this, 'joinBattle' );
		dojo.subscribe('Lobby/battles/addplayer', this, 'addPlayer' );
		dojo.subscribe('Lobby/battles/remplayer', this, 'remPlayer' );
		dojo.subscribe('Lobby/battle/playermessage', this, 'playerMessage' );
		
		dojo.subscribe('Lobby/battle/checkStart', this, 'checkStart' );
	},
	
	'checkStart':function()
	{
		if( this.players[this.host] )
		{
			if( this.players[this.host].isInGame && !this.runningGame )
			{
				dojo.publish('Lobby/startgame');
			}
			this.runningGame = this.players[this.host].isInGame;
		}
	},
	
	'joinBattle':function( data )
	{
		var blistStore = this.battleList.store;
		
		this.battle_id = data.battle_id;
		dojo.style( this.hideBattleNode, 'display', 'none' );
		dojo.style( this.battleDivNode, 'display', 'block' );
		
		this.closeNode.set('disabled', false);
		
		blistStore.fetchItemByIdentity({
			'identity':data.battle_id,
			'scope':this,
			'onItem':function(item)
			{
				var members, playerlist;
				members 	= parseInt( blistStore.getValue(item, 'members') );
				playerlist 	= blistStore.getValue(item, 'playerlist');
				this.host	= blistStore.getValue(item, 'host');
				
				for(player_name in playerlist)
				{
					this.addPlayer( { 'battle_id':this.battle_id, 'name':player_name } )
				}
				
				this.addPlayer( { 'battle_id':this.battle_id, 'name':this.nick } )
				//console.log(blistStore.getValue(item, 'ip'))
			}
		});
		//this.setupPlayerList();
		this.sendPlayState();
		//dojo.publish('Lobby/startgame');
	},
	
	'leaveBattle':function()
	{
		var smsg;
		smsg = 'LEAVEBATTLE'
		dojo.publish( 'Server/message', [{'msg':smsg }] );
		this.host = '';
		this.closeBattle();
	},
	'togglePlayState':function()
	{
		this.specState = !this.specState;
		this.playStateNode.set('iconClass', this.specState ? 'tallIcon specImage' : 'tallIcon playImage'  );
		
		this.sendPlayState();
	},
	'sendPlayState':function()
	{
		if( this.battle_id !== 0 )
		{
			this.players[this.nick].setStatusVals({'isSpectator':this.specState})
			smsg = "MYBATTLESTATUS " + this.players[this.nick].battleStatus + ' 255' 
			dojo.publish( 'Server/message', [{'msg':smsg }] );
		}
	},
	
	'closeBattle':function( )
	{
		this.battle_id = 0;
		dojo.style( this.hideBattleNode, 'display', 'block' );
		dojo.style( this.battleDivNode, 'display', 'none' );
		this.closeNode.set('disabled', true);
		this.playerListNode.empty();
		this.players = {};
	},
	
	'addPlayer':function( data )
	{
		var pname, line, user, ateam;
		pname = data.name;
		
		if( pname === '' )
		{
			return;
		}
		if( data.battle_id === this.battle_id )
		{
			user = this.lobbyPlayers[pname];
			
			this.players[pname] = user;
			this.playerListNode.addUser(user);
			
			line = '*** ' + pname + ' has joined the battle.';
			this.addLine(line);	
		}
	},
	
	'remPlayer':function( data )
	{
		var pname, line, battle_id, ateam, user;
		if( data.battle_id === this.battle_id )
		{
			pname = data.name;
			user = this.lobbyPlayers[pname];
			
			delete this.players[pname];
			this.playerListNode.removeUser(user);
			
			line = '*** ' + pname + ' has left the battle.';
			this.addLine(line);
			
			if( pname === this.nick )
			{
				this.closeBattle();
			}
		}
	},
	
	'blank':''
});//declare lwidgets.Battleroom



dojo.provide("lwidgets.Privchat");
dojo.declare("lwidgets.Privchat", [ lwidgets.Chat ], {
	'widgetsInTemplate':true,
	'templateString' : dojo.cache("lwidgets", "templates/privchat_nopane.html"),
	
	'saystring':'SAYPRIVATE',
	'name' : "",
	
	'postCreate2':function()
	{
		this.playerlistNode = new dijit.layout.ContentPane({ splitter:true, region:"trailing" }, this.playerlistDivNode );
		//stupid hax
		dojo.connect(this.mainContainer, 'onMouseDown', this, this.resizeAlready)
		dojo.subscribe('Lobby/chat/user/playermessage', this, 'playerMessage' );
	},
	
	'blank':''
});//declare lwidgets.Privchat


