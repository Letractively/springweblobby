///////////////////////////////////

// JS Spring Lobby Interface

// By CarRepairer

// License: GPL 2

///////////////////////////////////

define(
	'lwidgets/ChatRoom',
	[
		"dojo/_base/declare",
		
		"dojo",
		"dijit",
		
		//'dojo/text!./templates/chatroom_nopane.html?' + cacheString,
		'dojo/text!./templates/chatroom.html?' + cacheString,
		
		'lwidgets',
		'lwidgets/Chat',
		'lwidgets/PlayerList',
		
		//extras
		
		
	],
	function(declare, dojo, dijit, template, lwidgets, Chat, PlayerList ){
	return declare( [ Chat ], {
		
	'templateString' : template,
	
	'saystring':'SAY',
	'name' : "",

	'players' : null,
	//'playerListContent':null,
	
	
	'postCreate2':function()
	{
		var handle, content, content2;
		this.players = {};
		
		
		//this is unfortunate
		/*
		content = new dijit.layout.ContentPane({ 'splitter':true, 'region':'top', 'minSize':50, 'maxSize':350 }, this.topicPaneDiv );
		content2 = new dijit.layout.ContentPane({ 'splitter':true, 'region':'trailing', 'minSize':150, 'maxSize':300 }, this.playerlistPaneDiv );
		this.mainContainer = new dijit.layout.BorderContainer({
			design:"sidebar",
			gutters:true,
			liveSplitters:true
			//,'style': {'height': '100%', 'width': '100%;' }	
		}, this.mainContainerNode);
		
		this.messageNode = new dijit.layout.ContentPane({
			'splitter':true, 'region':'center'
		}, this.messageDivNode );
		this.inputNode = new dijit.layout.ContentPane({ 'splitter':false, 'region':'bottom' }, this.inputDivNode );
		*/
		
		this.addSubscription( dojo.subscribe('Lobby/chat/channel/topic', this, 'setTopic' ) );
		this.addSubscription( dojo.subscribe('Lobby/chat/channel/addplayer', this, 'addPlayer' ) );
		this.addSubscription( dojo.subscribe('Lobby/chat/channel/remplayer', this, 'remPlayer' ) );
		this.addSubscription( dojo.subscribe('Lobby/chat/channel/playermessage', this, 'playerMessage' ) );
		this.playerListNode = new PlayerList({})
		
		//this.playerListNode.startup2();
		this.playerListNode.empty(); //weird hax
	},//postcreate2
	
	'startup2':function()
	{
		//sucky hax
		if( this.startMeUp )
		{
			this.startMeUp = false;
			this.mainContainer.startup();
			this.playerListNode.placeAt(this.playerlistPaneDiv)
			this.playerListNode.startup2();
			//dojo.connect( this.playerlistPaneDiv, 'onShow', dojo.hitch(this, function(){this.playerListNode.resizeAlready();} ) );
		}
	},
	
	'resizeAlready2':function()
	{
		if( this.playerListNode ) //fixme
		{
			this.playerListNode.resizeAlready();
		}
	},
	
	'setTopic':function(data)
	{
		var msg, topicStr, timestamp, date;
		if(data.channel !== this.name)
		{
			return;
		}
		msg = makeLinks( data.msg, this.settings.settings.topicTextColor );
		date = new Date();
		date.setTime(data.time);
		timestamp = date.toLocaleString();
		msg = msg.replace(/\\n/g, '<br />');
		topicStr = msg + "<br /><div align='right' class='topicAuthor' "
			+ "style='font-style:italic; color:" + this.settings.fadedTopicColor + "; '>"
			+ "(Topic set by " + data.name + ' on ' + timestamp + ')</div>';
		//dojo.attr( this.topicPaneDiv, 'innerHTML', topicStr );
		this.topicPane.set( 'content', topicStr );
		
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
		user = this.users[pname];
		this.players[pname] = user;
		this.playerListNode.addUser(user);
		if( data.joined && this.settings.settings.showJoinsAndLeaves )
		//if( data.joined )
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
		
		if( this.settings.settings.showJoinsAndLeaves )
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
	
	
	'blank':null
}); }); //declare lwidgets.Chatroom
