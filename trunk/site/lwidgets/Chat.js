///////////////////////////////////

// JS Spring Lobby Interface

// By CarRepairer

///////////////////////////////////

dojo.provide("lwidgets.BattleMap");
dojo.declare("lwidgets.BattleMap", [ dijit._Widget ], {
	
	'map':'',
	'mapClean':'',
	'mapTypeIndex':0,
	'mapTypes' : [ 'minimap', 'heightmap', 'metalmap' ],
	'mapImg':null,
	'mapLink':null,
	'eraseBoxButton':null,
	
	'mapDiv':null,
	'startBoxes':null,
	'startBoxColors':null,
	'curStartBoxColor':0,
	
	'newBox_x1':false,
	'newBox_y1':false,
	
	'newBox_x2':false,
	'newBox_y2':false,
	
	'paintDiv':null,
	'drawing':false,
	
	
	'interimStartBox':null,
	
	'buildRendering':function()
	{		
		var div1;
		
		this.startBoxColors = ['green', 'red', 'blue', 'cyan', 'yellow', 'magenta', 'lime', 'maroon', 'navy', 'olive', 'purple', 'teal' ];
		
		div1 = dojo.create('div', {  'style':{'width':'100%', 'height':'100%' }});
		this.domNode = div1;
		
		this.mapLink = dojo.create('a', {href:'', 'innerHTML':'Map Link', 'target':'_blank' }, div1);
		
		this.eraseBoxButton = new dijit.form.ToggleButton({
			'label':'Add Boxes',
			'checked':true,
			'iconClass':"dijitCheckBoxIcon",
			'onChange':dojo.hitch(this, function(val){
				this.eraseBoxButton.set('label', (val ? 'Add' : 'Remove')+' Boxes' );
				dojo.style( this.paintDiv, 'zIndex', (val ? '3' : '-3') );
			} )
		}).placeAt( div1 );
		
		this.mapDiv = dojo.create('div', {  'style':{
			'width':'100%',
			'position':'absolute',
			'top':20,
			'left':0,
			'height':'100%'
		}}, div1);
		
		
		
		this.mapImg = dojo.create('img', {
			'src':'',
			'style':{'width':'100%' },
			//'onclick':dojo.hitch(this, 'cycleMaps')
			
		}, this.mapDiv );
		
		this.paintDiv = dojo.create('div', {
			'style':{
				'top':0,
				'left':0,
				'width':'100%',
				'height':'100%',
				'position':'absolute',
				
				'zIndex':3
			},
			
			'onmousedown':dojo.hitch(this, 'startDrawMap'),
			'onmousemove':dojo.hitch(this, 'drawInterimStartBox')
			
		}, this.mapDiv);
		
		this.updateMap();
		
		this.startBoxes = {};
		
		dojo.subscribe('Lobby/map/addrect', this, 'addRectangle' );
		dojo.subscribe('Lobby/map/remrect', this, function(data){
			var startBox = this.startBoxes[ data.aID ];
			dojo.destroy( startBox  );
		} );
	},
	
	'startDrawMap':function(e)
	{
		var x1,y1,x2,y2, w,h, addboxMessage;
		if(this.drawing)
		{
			this.drawing = false;
			
			pwidth = parseInt( dojo.getComputedStyle(this.mapImg).width );
			pheight = parseInt( dojo.getComputedStyle(this.mapImg).height );
			
			x1 = parseInt( dojo.style(this.interimStartBox, 'left' ) )
			y1 = parseInt( dojo.style(this.interimStartBox, 'top' ) )
			x2 = pwidth - parseInt( dojo.style(this.interimStartBox, 'right') )
			y2 = pheight - parseInt( dojo.style(this.interimStartBox, 'bottom') )
			w = parseInt( dojo.style(this.interimStartBox, 'width' ) )
			h = parseInt( dojo.style(this.interimStartBox, 'height' ) )
			
			
			
			//use for direct hosting
			/*
			x1 = Math.round( (x1/pwidth)*200); //note, rename vars
			y1 = Math.round( (y1/pheight)*200); //note, rename vars
			x2 = Math.round( (x2/pwidth)*200);
			y2 = Math.round( (y2/pheight)*200);
			*/
			
			//use for springie
			x1 = Math.round( (x1/pwidth)*100);
			y1 = Math.round( (y1/pheight)*100);
			w = Math.round( (w/pwidth)*100); 
			h = Math.round( (h/pheight)*100); 
			
			
			
			addboxMessage = "!addbox " + x1 +" "+ y1 +" "+ w +" "+ h;
			dojo.publish( 'Lobby/rawmsg', [{'msg':'SAYBATTLE '+ addboxMessage}] );
			
			dojo.destroy( this.interimStartBox );
			
			return;
		}
		this.drawing = true;
		
		this.newBox_x1 = e.layerX;
		this.newBox_y1 = e.layerY;
		
		this.interimStartBox = dojo.create('div',
			{
				'style':{
					'background':'gray',
					
					'left':this.newBox_x1 +'px',
					'top':this.newBox_y1 +'px',
					'minWidth':10,
					'minHeight':10,
					
					'width':10,
					'height':10,
					'opacity':0.8,
					'position':'absolute',
					'zIndex':2
				}
			},
			this.mapDiv
		);
	},
	'drawInterimStartBox':function(e)
	{
		var right, bottom;
		if( this.drawing )
		{
								
			this.newBox_x2 = e.layerX;
			this.newBox_y2 = e.layerY;
			
			var parentWidth, parentHeight;
			parentWidth = dojo.style(this.mapDiv, 'width');
			parentHeight = dojo.style(this.mapDiv, 'height');
			
			right = Math.min( parentWidth-this.newBox_x2, parentWidth-(this.newBox_x1+10) )
			bottom = Math.min( parentHeight-this.newBox_y2, parentHeight-(this.newBox_y1+10) )
			
			dojo.style( this.interimStartBox, 'right', right+'px' )
			dojo.style( this.interimStartBox, 'bottom', bottom+'px' )
			//console.log('move', this.newBox_x2)
		}
	},
	
	'addRectangle':function(data)
	{
		var x1,y1,x2,y2,aID, color;
		var x1p,y1p,x2p,y2p;
		var startBoxDiv, allyDiv;
		var range;
		
		range = 200;
		
		x1 = data.x1;
		y1 = data.y1;
		x2 = data.x2;
		y2 = data.y2;
		aID = parseInt(data.aID);
		
		color = this.startBoxColors[ this.curStartBoxColor ];
		this.curStartBoxColor += 1;
		this.curStartBoxColor %= this.startBoxColors.length;
		
		x1p = Math.round( x1 / range * 100 );
		y1p = Math.round( y1 / range * 100 ); 
		x2p = 100-Math.round( x2 / range * 100 );
		y2p = 100-Math.round( y2 / range * 100 );
		
		startBoxDiv = dojo.create('div',
			{
				'style':{
					'background':color,
					
					'left':x1p + "%",
					'top':y1p + "%",
					
					'right':x2p + "%",
					'bottom':y2p + "%",
					'opacity':0.5,
					'position':'absolute',
					'zIndex':1
				},
				'onmousedown':dojo.hitch(this, function(){
					var clearBoxMessage = "!clearbox " + (aID+1);
					dojo.publish( 'Lobby/rawmsg', [{'msg':'SAYBATTLE '+ clearBoxMessage}] );
				})
			},
			this.mapDiv
		);
		allyDiv = dojo.create('div',
			{
				'innerHTML':(aID+1),
				'style':{
					//'width':'auto',
					'width':'100%',
					'left':'1px',
					'position':'absolute',
					'verticalAlign':'middle',
					'textAlign':'center',
					//'background':'black',
					'color':'white',
					'fontWeight':'bold',
					'top':'1px',
					'textShadow':'2px 2px black'
				}
			},
			startBoxDiv
		);
		this.startBoxes[aID] = startBoxDiv;
	},
	
	'setMap':function(map)
	{
		this.map = map;
		this.mapClean = this.map.replace(/ /g, '_');
		this.updateMap();
	},
	'clearMap':function()
	{
		var aID;
		this.map = null;
		dojo.attr( this.mapImg, 'src', '' );
		dojo.attr( this.mapImg, 'title', '' );
		dojo.attr( this.mapLink, 'href', '' );
		dojo.attr( this.mapLink, 'innerHTML', '' );
		
		//dojo.forEach(this.startBoxes, function(startBox){ });
		for(aID in this.startBoxes){
			var startBox = this.startBoxes[aID];
			dojo.destroy(startBox);
		}
	},
	
	'cycleMaps':function()
	{
		this.mapTypeIndex += 1;
		this.mapTypeIndex %= 3;
		
		this.updateMap();
	},
	'updateMap':function()
	{
		dojo.attr( this.mapImg, 'src', 'http://zero-k.info/Resources/' + this.mapClean + '.' + this.mapTypes[this.mapTypeIndex] + '.jpg' );
		dojo.attr( this.mapImg, 'title', this.map );
		dojo.attr( this.mapLink, 'href', 'http://zero-k.info/Maps/DetailName?name='+ this.mapClean );
		dojo.attr( this.mapLink, 'innerHTML', this.map );
		
		this.updateMapDiv();
	},
	
	'updateMapDiv':function()
	{
		dojo.style(this.mapDiv, 'height', dojo.getComputedStyle(this.mapImg).height );
		//dojo.style(this.mapDiv, 'width', dojo.getComputedStyle(this.mapImg).width );
	},
	
	'blank':null
});//declare lwidgets.BattleMap



dojo.provide("lwidgets.PlayerList2");
dojo.declare("lwidgets.PlayerList2", [ dijit._Widget ], {
	//'widgetsInTemplate':true,
	//'templateString' : dojo.cache("lwidgets", "templates/playerlist.html"),
	
	'store':null,
	'startMeUp':true,
	
	'buildRendering':function()
	{
		
		var div1, layout;
		
		//div1 = dojo.create('div', {  'style':{'width':'100%', 'height':'100%', /*this is important!*/'minHeight':'300px' }});
		div1 = dojo.create('div', {  'style':{'width':'100%', 'height':'100%' }});
		
		//dojo.create('span', { 'innerHTML':'special playerlist goes here' }, div1);
		this.domNode = div1;
		
		layout = [
			{	field: 'country',
				name: ' ',
				width: '20px',
				formatter: function(value)
				{
					if(value === '??')
					{
						return '<img src="img/flags/unknown.png" title="Unknown Location" width="16"> ';
					}
					return '<img src="img/flags/'+value.toLowerCase()+'.png" title="'+value+'" width="16"> ';
				}
			},
			{	field: 'main',
				name: 'Users',
				width: (250-20-30) + 'px',
				formatter: function(valueStr)
				{
					var value, lobbyClient;
					value = eval( '(' + valueStr + ')' );
					
					lobbyClient = '';
					if(value.cpu === '7777')
					{
						lobbyClient = ' <img src="img/blobby.png" align="right" title="Using Spring Web Lobby" width="16">'
					}
					else if(value.cpu === '6666')
					{
						lobbyClient = ' <img src="img/zk_logo_square.png" align="right" title="Using Zero-K Lobby" width="16">'
					}
					
					return '<span style="color:black; ">'
						+ '<img src="img/'+value.icon+'" title="'+value.iconTitle+'" width="16"> '
						+ value.name
						+ (value.isAdmin ? ' <img src="img/wrench.png" align="right" title="Administrator" width="16">' : '')
						+ lobbyClient
						+ (value.isInGame ? ' <img src="img/battle.png" align="right" title="In a game" width="16">' : '')
						+ (value.isAway ? ' <img src="img/away.png" align="right" title="Away" width="16">' : '')
						+ '</span>'
						;
					
					
				}
			}
        ];
		
		
		this.setupStore();
		
		this.grid = new dojox.grid.DataGrid({
			'query': {
                'main': '*'
            },
			'queryOptions':{'ignoreCase': true},
            'store': this.store,
            //'clientSort': true,
            'rowSelector': '5px',
            'structure': layout,
			'autoHeight':false,
			'autoWidth':false,
			'height':'100%',
			'onRowDblClick':dojo.hitch(this, 'queryPlayer')
		} ).placeAt(div1);
		
		dojo.subscribe('Lobby/battle/playerstatus', this, 'updateUser' );
		
	},
	
	'setupStore':function()
	{
		this.store = new dojo.data.ItemFileWriteStore(
			{
				'data':{
					'identifier':'name',
					'label':'main',
					'items':[]
				}
			}
		);
	},
	
	'startup2':function()
	{
		if( this.startMeUp )
		{
			this.startMeUp = false;
			this.startup();
			this.grid.startup();
		}
	},
	
	'saveStore':function()
	{
		this.store.save({
			'onComplete':dojo.hitch(this, function(){
				this.grid.sort();
				this.grid.update();
			} )
		});
	},
	
	'resizeAlready':function()
	{
		this.grid.resize();
		this.grid.update();
	},
	
	'postCreate':function()
	{
		dojo.subscribe('Lobby/connecting', this, 'empty' );
		this.postCreate2();
	},
	
	'postCreate2':function()
	{
	},

	'queryPlayer':function( e )
	{
		var row, name;
		row = this.grid.getItem(e.rowIndex);
		name = row.name[0];
		dojo.publish('Lobby/chat/addprivchat', [{'name':name, 'msg':'' }]  );
	},
	
	'addUser':function(user)
	{
		user.main = this.setupDisplayName(user);
		this.store.newItem( user );
		this.saveStore(); //must be done after add/delete!
	},
	'removeUser':function(user)
	{
		this.store.fetchItemByIdentity({
			'identity':user.name,
			'scope':this,
			'onItem':function(item)
			{
				if(item)
				{
					this.store.deleteItem(item);
					this.saveStore(); //must be done after add/delete!
				}
			}
		});
		
	},
	'updateUser':function( data )
	{
		var name, user;
		name = data.name;
		user = data.user;
		
		user.main = this.setupDisplayName(user);
		
		this.store.fetchItemByIdentity({
			'identity':user.name,
			'scope':this,
			'onItem':function(item)
			{
				if( item )
				{
					for(attr in user){
						if(attr !== 'name' )
						{
							this.store.setValue(item, attr, user[attr]);
						}
					}
					
					this.saveStore(); //must be done after add/delete!
				}
			}
		});
	},
	
	'setupDisplayName':function(user)
	{
		var icon, title;
		icon = 'smurf.png'; title = 'User';
		if( user.isHost ){ 		icon = 'napoleon.png';	title = 'Hosting a battle'; }
		if( user.bot ){ 		icon = 'robot.png';		title = 'Bot'; 				}
		if( user.isInBattle ){	icon = 'soldier.png';	title = 'In a battle room'; }
		
		return JSON.stringify( {
			'name': user.name,
			'isAdmin' : user.isAdmin,
			'cpu' : user.cpu,
			'bot' : (user.owner ? true : false),
			'icon': icon,
			'iconTitle':title,
			'isInGame':user.isInGame,
			'isAway':user.isAway
		} );
	},
	
	'refresh':function()
	{
	},
	
	'empty':function()
	{
		//dojo.empty( this.playerListSelect.domNode );
		this.store.fetch({
			'query':{'name':'*'},
			'scope':this,
			'onItem':function(item)
			{
				this.store.deleteItem(item);
				this.saveStore(); //must be done after add/delete!
			}
		});
	},
	
	
	'blank':null
});//declare lwidgets.PlayerList

dojo.provide("lwidgets.BattlePlayerList2");
dojo.declare("lwidgets.BattlePlayerList2", [ lwidgets.PlayerList2 ], {
//dojo.declare("lwidgets.BattlePlayerList2", [ dijit._Widget ], {
	
	'ateams':null,
	'ateamNumbers':null,
	
	'buildRendering':function()
	{
		var div1, layout;
		
		this.ateams = {};
		div1 = dojo.create('div', {  'style':{'width':'100%', 'height':'100%' }});
		this.domNode = div1;
		layout = [
			{	field: 'main',
				name: 'Players',
				width: (200 - 20) + 'px',
				formatter: function(valueStr)
				{
					var value, lobbyClient, setAlliancePublisher;
					value = eval( '(' + valueStr + ')' );
					
					if( value.isTeam )
					{
						//cannot(?) add member functions into this formatter, unfortunately. string only.
						setAlliancePublisher = " dojo.publish('Lobby/battle/setAlliance', [{ 'allianceId':'"+value.teamNum+"' }]  ) ";
						return '<div style="color:black; text-align:center; ">'
							+ '<button style="width:100%; " onclick="'+setAlliancePublisher+';" >'
							+ value.name
							+ '</button>'
							+ '</div>'
							;	
					}
					
					lobbyClient = '';
					if(value.cpu === '7777')
					{
						lobbyClient = ' <img src="img/blobby.png" align="right" title="Using Spring Web Lobby" width="16">'
					}
					else if(value.cpu === '6666')
					{
						lobbyClient = ' <img src="img/zk_logo_square.png" align="right" title="Using Zero-K Lobby" width="16">'
					}
					
					return '<span style="color:black; ">'
						+ ( (value.country === '??')
							? '<img src="img/flags/unknown.png" title="Unknown Location" width="16"> '
							: '<img src="img/flags/'+value.country.toLowerCase()+'.png" title="'+value.country+'" width="16"> '
						  )
						+ '<img src="img/'+value.icon+'" title="'+value.iconTitle+'" width="16"> '
						+ value.name
						+ (value.isAdmin ? ' <img src="img/wrench.png" align="right" title="Administrator" width="16">' : '')
						+ lobbyClient
						+ (value.isInGame ? ' <img src="img/battle.png" align="right" title="In a game" width="16">' : '')
						+ (value.isAway ? ' <img src="img/away.png" align="right" title="Away" width="16">' : '')
						+ '</span>'
						;
				}
			}
        ];
		
		this.setupStore();
		
		this.grid = new dojox.grid.DataGrid({
			'query': {
                'main': '*'
            },
			
			'canSort':function(){return false;},
			'sortIndex':1,
			'sortInfo':1,
			
			'queryOptions':{'ignoreCase': true},
            'store': this.store,
            //'clientSort': true,
            'rowSelector': '5px',
            'structure': layout,
			'autoHeight':false,
			'autoWidth':false,
			'height':'100%',
			'onRowDblClick':dojo.hitch(this, 'queryPlayerlistItem')
		} ).placeAt(div1);
		
		dojo.subscribe('Lobby/battle/playerstatus', this, 'updateUser' );
		
	},
	'startup2':function()
	{
		if( this.startMeUp )
		{
			this.startMeUp = false;
			this.startup();
			this.grid.startup();
		}
	},
	'resizeAlready':function()
	{
		this.grid.resize();
		this.grid.update();
		this.saveStore();
	},
	
	'postCreate':function()
	{
		dojo.subscribe('Lobby/connecting', this, 'empty' );
		this.postCreate2();
	},
	
	'setAlliance':function(allianceId)
	{
		dojo.publish('Lobby/battle/setAlliance', [{ 'allianceId':allianceId }]  );
	},

	'queryPlayerlistItem':function( e )
	{
		var row, name;
		row = this.grid.getItem(e.rowIndex);
		if(  row.isTeam && row.isTeam[0] )
		{
			this.setAlliance( row.teamNum[0] )
			return;
		}
		name = row.name[0];
		dojo.publish('Lobby/chat/addprivchat', [{'name':name, 'msg':'' }]  );
	},
	
	'addTeam':function(ateamNum, spec)
	{
		var ateamItem, ateamStringSort, ateamStringName, ateamNumPlus, ateamNum2;
		
		if(ateamNum === null || ateamNum === undefined )
		{
			return;
		}
		ateamNum2 = parseInt( ateamNum );
		
		ateamNumPlus = ateamNum2 + 1;
		ateamStringSort = ateamNumPlus + 'A'
		if( ateamNumPlus < 10 )
		{
			ateamStringSort = '0' + ateamStringSort;
		}
		ateamStringName = 'Team ' + ateamNumPlus;
		
		if(spec)
		{
			ateamStringSort = 'SA';
			ateamStringName = 'Spectators'
		}
		
		if( this.ateams[ateamStringName] )
		{
			return;
		}
		
		this.ateams[ateamStringName] = true;
		ateamItem = {
			'team':'Team ' + ateamStringSort,
			'name':'<>Team ' + ateamStringSort,
			'isTeam':true,
			'teamNum' : (spec ? 'S' : ateamNum2),
			'main':JSON.stringify( {
				'team' : 'Team ' + ateamStringSort,
				'name': ateamStringName,
				'isTeam' : true,
				'teamNum' : (spec ? 'S' : ateamNum2)
			} )
		}
		this.store.newItem( ateamItem );
		//this.store.save(); //must be done after add/delete!
		this.saveStore(); //must be done after add/delete!
		
	},
	
	'addUser':function(user)
	{
		this.addTeam( user.allyNumber, user.isSpectator );
		user.main = this.setupDisplayName(user);
		this.store.newItem( user );
		this.saveStore(); //must be done after add/delete!
	},
	
	'removeUser':function(user)
	{
		this.store.fetchItemByIdentity({
			'identity':user.name,
			'scope':this,
			'onItem':function(item)
			{
				if( item )
				{
					this.store.deleteItem(item);
					this.saveStore(); //must be done after add/delete!		
				}
			}
		});
		
	},
	
	'updateUser':function( data )
	{
		var name, user;
		name = data.name;
		user = data.user;
		
		user.main = this.setupDisplayName(user);
		
		this.addTeam( user.allyNumber, user.isSpectator );
		
		
		//fixme: maybe just pull user from lobbyplayers instead?
		this.store.fetchItemByIdentity({
			'identity':user.name,
			'scope':this,
			'onItem':function(item)
			{
				if( item )
				{
					for(attr in user){
						if( user.hasOwnProperty(attr) )
						{
							if(attr !== 'name' )
							{
								this.store.setValue(item, attr, user[attr]);
							}
						}
						else
						{
							//console.log('Error #11 - ' + attr);
						}
					}
					
					this.saveStore(); //must be done after add/delete!
				}
			}
		});
	},
	
	'setupDisplayName':function(user)
	{
		var icon, title, teamString, teamNumPlus;
		
		teamNumPlus = user.allyNumber + 1;
		
		icon = 'smurf.png'; title = 'Spectator';
		if( user.bot )			{ icon = 'robot.png';		title = 'Bot'; 				}
		if( !user.isSpectator )	{ icon = 'soldier.png';		title = 'On a team'; }
		if( user.isHost )		{
			icon = 'napoleon.png';	title = 'Battle Host';
			if( user.isSpectator )
			{
				title = 'Battle Host; Spectating';
			}
		}
		
		teamString = teamNumPlus + 'Z'
		if( teamNumPlus < 10 )
		{
			teamString = '0' + teamString;
		}
		if(user.isSpectator)
		{
			teamString = 'SZ'
		}
		
		return JSON.stringify( {
			'team': 'Team ' + teamString,
			'name': user.name,
			'isAdmin' : user.isAdmin,
			'country': user.country,
			'cpu' : user.cpu,
			'bot' : (user.owner ? true : false),
			'icon': icon,
			'iconTitle':title,
			'isInGame':user.isInGame,
			'isAway':user.isAway
		} );
	},
	
	'empty':function()
	{
		this.ateams = {};
		this.store.fetch({
			'query':{'name':'*'},
			'scope':this,
			'onItem':function(item)
			{
				this.store.deleteItem(item);
				this.saveStore();
			}
		});
		
	},
	
	'postCreate2':function()
	{
		//dojo.subscribe('Lobby/battle/playerstatus', this, 'playerStatus' );
	},
	
	
	'blank':null
});//declare lwidgets.BattlePlayerList2

dojo.provide("lwidgets.Chat");
dojo.declare("lwidgets.Chat", [ dijit._Widget, dijit._Templated ], {
	//'widgetsInTemplate':true,
	
	//'templateString' : dojo.cache("lwidgets", "templates/chatroom.html"), //ARG
	
	
	'subscriptions':null,
	
	'mainContainer':'',
	'messageNode':'',
	'name':'',
	'nick':'',
	
	'prevCommands':null,
	'curPrevCommandIndex':0,
	
	'startMeUp':true,
	
	'maxLines':100,
	
	'lobbyPlayers':null,	//mixed in
	'settings':null,
	
	'postCreate' : function()
	{
		this.prevCommands = [];
		
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
		dojo.subscribe('ResizeNeeded', this, function(){
			setTimeout( function(thisObj){
				thisObj.resizeAlready();
			}, 400, this );
		} );
		
	},
	
	'destroyMe':function()
	{
		if( this.playerListNode )
		{
			this.playerListNode.destroyRecursive();	
		}
		this.destroyRecursive();
		
		
		if( this.subscriptions )
		{
			dojo.forEach(this.subscriptions, function(subscription){ dojo.unsubscribe( subscription ) });
		}
	},
	
	'postCreate2':function()
	{
	},
	
	'keyup':function(e)
	{
		var msg, smsg, msg_arr, rest, thisName;
		
		//up = 38, down = 40
		if(e.keyCode === 38)
		{
			this.curPrevCommandIndex += 1;
		}
		if(e.keyCode === 40)
		{
			this.curPrevCommandIndex -= 1;
		}
		if(e.keyCode === 38 || e.keyCode === 40)
		{
			this.curPrevCommandIndex = Math.min(this.curPrevCommandIndex, this.prevCommands.length-1)
			this.curPrevCommandIndex = Math.max(this.curPrevCommandIndex, 0)
			this.textInputNode.value = this.prevCommands[ this.curPrevCommandIndex ];
			return;	
		}
		
		//enter
		if(e.keyCode !== 13) return;
		
		this.curPrevCommandIndex = -1;
		
		msg = this.textInputNode.value;
		
		this.prevCommands.remove(msg);
		this.prevCommands.unshift(msg);
		if( this.prevCommands.length > 20 )
		{
			this.prevCommands.pop();
		}
		
		msg_arr = msg.split(' ');
		cmd = msg_arr[0];
		
		thisName = '';
		if( this.name !== '' )
		{
			thisName = this.name + ' ';
		}
		
		if( cmd == '/me' )
		{
			rest = msg_arr.slice(1).join(' ')
			smsg = this.saystring + 'EX ' + thisName + rest;
		}
		else
		{
			smsg = this.saystring + ' ' + thisName + msg;
		}
		dojo.publish( 'Lobby/rawmsg', [{'msg':smsg }] );
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
		this.resizeAlready2();
	},
	'resizeAlready2':function()
	{
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
	
	'blank':null
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
	
	
	'postCreate2':function()
	{
		var topicNode, handle;
		this.players = {};
		
		this.subscriptions = [];
		
		this.playerListContent = new dijit.layout.ContentPane({ splitter:true, region:"trailing" }, this.playerlistDivNode );
		topicNode = new dijit.layout.ContentPane({ splitter:true, region:"top" }, this.topicDivNode );
		
		handle = dojo.subscribe('Lobby/chat/channel/topic', this, 'setTopic' );
		this.subscriptions.push( handle );
		handle = dojo.subscribe('Lobby/chat/channel/addplayer', this, 'addPlayer' );
		this.subscriptions.push( handle );
		handle = dojo.subscribe('Lobby/chat/channel/remplayer', this, 'remPlayer' );
		this.subscriptions.push( handle );
		handle = dojo.subscribe('Lobby/chat/channel/playermessage', this, 'playerMessage' );
		this.subscriptions.push( handle );
		
		//setTimeout( function(thisObj){ thisObj.sortPlayerlist(); }, 2000, this );
		
		//this.playerListNode.startup2();
		this.playerListNode.empty(); //weird hax
	},
	'resizeAlready2':function()
	{
		if( this.playerListNode ) //fixme
		{
			this.playerListNode.startup2();
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
		msg = data.msg;
		date = new Date();
		date.setTime(data.time);
		timestamp = date.toLocaleString();
		msg = msg.replace(/\\n/g, '<br />');
		topicStr = msg + "<br /><div align='right' class='topicAuthor' "
			+ "style='font-style:italic; color:" + this.settings.fadedTopicColor + "; '>"
			+ "(Topic set by " + data.name + ' on ' + timestamp + ')</div>';
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
});//declare lwidgets.Chatroom




dojo.provide("lwidgets.Battleroom");
dojo.declare("lwidgets.Battleroom", [ lwidgets.Chat ], {
	'widgetsInTemplate':true,
	
	'templateString' : dojo.cache("lwidgets", "templates/battleroom_nopane.html"),
	
	'saystring':'SAYBATTLE',
	'name':'',
	'host':'',
	'map':'',
	
	'battle_id':0,
	
	'specState':true,
	'allianceId':true,
	'runningGame':false,
	
	'playerlistNode':null,
	'players' : null,
	'ateams':null,
	'ateamNumbers':null,
	'battleListStore':null,		//mixed in
	
	'bots':null,
	
	'postCreate2':function()
	{
		var titleNode;
		
		this.players = {};
		this.ateams = {};
		this.ateamNumbers = [];
		this.bots = {};
		
		
		this.playerlistNode = new dijit.layout.ContentPane({ splitter:true, region:"trailing" }, this.playerlistDivNode );
		
		titleNode = new dijit.layout.ContentPane({ splitter:true, region:"top" }, this.titleDivNode );
		
		dojo.subscribe('Lobby/battle/joinbattle', this, 'joinBattle' );
		dojo.subscribe('Lobby/battles/addplayer', this, 'addPlayer' );
		dojo.subscribe('Lobby/battles/remplayer', this, 'remPlayer' );
		dojo.subscribe('Lobby/battle/playermessage', this, 'playerMessage' );
		dojo.subscribe('Lobby/battle/ring', this, 'ring' );
		
		dojo.subscribe('Lobby/battles/updatebattle', this, 'updateBattle' );
		
		dojo.subscribe('Lobby/battle/checkStart', this, 'checkStart' );
		
		dojo.subscribe('Lobby/battle/setAlliance', this, function(data){
			if(data.allianceId === 'S')
			{
				this.specState = true;
				this.playStateNode.set('iconClass', 'tallIcon specImage' );
				this.sendPlayState();
				return;
			}
			if( !confirm('Spring Web Lobby does not know which games or maps you have downloaded. '
				  + 'Please only participate in battles if you\'re sure you have them. '
				  + 'Click OK to participate in the battle.'
				  )
			  )
			{
				return;
			}
			this.specState = false;
			this.playStateNode.set('iconClass', 'tallIcon playImage' );
			this.allianceId = data.allianceId;
			this.sendPlayState();
		} );
		
		dojo.connect(this.mainContainer, 'onMouseUp', this.battleMapNode, this.battleMapNode.updateMapDiv )
	},
	
	
	'resizeAlready2':function()
	{
		this.playerListNode.startup2();
		this.playerListNode.resizeAlready();
	},
	
	'ring':function( data )
	{
		var name, line;
		name = data.name;
		line = '*** ' + name + ' is ringing you!';
		this.addLine( line, {}, '' );
	},
	
	'checkStart':function()
	{
		if( !this.players[this.host] )
		{
			return;
		}
		if( !this.runningGame )
		{
			this.startGame();
		}
		this.runningGame = this.players[this.host].isInGame;
	},
	'startGame':function()
	{
		if( !this.players[this.host] )
		{
			return;
		}
		if( this.players[this.host].isInGame )
		{
			dojo.publish('Lobby/startgame');
		}
	},
	
	'joinBattle':function( data )
	{
		var blistStore = this.battleListStore;
		
		this.battle_id = data.battle_id;
		dojo.style( this.hideBattleNode, 'display', 'none' );
		dojo.style( this.battleDivNode, 'display', 'block' );
		
		this.sendPlayState();
		
		this.closeNode.set('disabled', false);
		this.startNode.set('disabled', false);
		
		this.resizeAlready(); //for startup
		
		blistStore.fetchItemByIdentity({
			'identity':data.battle_id,
			'scope':this,
			'onItem':function(item)
			{
				var members, playerlist, title, game;
				members 	= parseInt( blistStore.getValue(item, 'members') );
				playerlist 	= blistStore.getValue(item, 'playerlist');
				this.host	= blistStore.getValue(item, 'host');
				this.map	= blistStore.getValue(item, 'map');
				title		= blistStore.getValue(item, 'title');
				game 		= blistStore.getValue(item, 'game');
				
				dojo.attr( this.titleDivNode, 'innerHTML', '<b>' + title + '</b> <br /><i>' + game + '</i>');
				
				this.battleMapNode.setMap( this.map );
				
				for(player_name in playerlist)
				{
					this.addPlayer( { 'battle_id':this.battle_id, 'name':player_name } )
				}
				
				this.resizeAlready();
				
			}
		});
	},
	
	'updateBattle':function(data)
	{
		var blistStore = this.battleListStore;
		
		if( this.battle_id !== data.battle_id )
		{
			return;
		}
		this.map = data.map;
		this.battleMapNode.setMap( this.map );
	},
	
	'leaveBattle':function()
	{
		var smsg;
		smsg = 'LEAVEBATTLE'
		dojo.publish( 'Lobby/rawmsg', [{'msg':smsg }] );
		this.battleMapNode.clearMap();
		this.host = '';
		this.closeBattle();
	},
	
	'closeBattle':function( )
	{
		for( name in this.bots )
		{
			delete this.lobbyPlayers[name];
		}
		
		this.battle_id = 0;
		dojo.style( this.hideBattleNode, 'display', 'block' );
		dojo.style( this.battleDivNode, 'display', 'none' );
		this.closeNode.set('disabled', true);
		this.startNode.set('disabled', true);
		this.playerListNode.empty();
		this.players = {};
	},
	
	'togglePlayState':function()
	{
		if( this.specState )
		{
			if( !confirm('Spring Web Lobby does not know which games or maps you have downloaded. '
				  + 'Please only participate in battles if you\'re sure you have them. '
				  + 'Click OK to participate in the battle.'
				  )
			  )
			{
				return;
			}
		}
		this.specState = !this.specState;
		this.playStateNode.set('iconClass', this.specState ? 'tallIcon specImage' : 'tallIcon playImage'  );
		
		this.sendPlayState();
	},
	
	'sendPlayState':function()
	{
		if( this.battle_id !== 0 )
		{
			this.lobbyPlayers[this.nick].setStatusVals({ 'isSpectator':this.specState, 'allyNumber':this.allianceId });
			smsg = "MYBATTLESTATUS " + this.lobbyPlayers[this.nick].battleStatus + ' 255'
			dojo.publish( 'Lobby/rawmsg', [{'msg':smsg }] );
		}
	},
	
	'addPlayer':function( data )
	{
		var pname, line, user, ateam;
		pname = data.name;
		
		if( pname === '' )
		{
			return;
		}
		if( data.battle_id !== this.battle_id )
		{
			return;
		}
		user = this.lobbyPlayers[pname];
		
		if( user.owner !== '' )
		{
			this.bots[user] = true;
		}
		
		this.players[pname] = user;
		this.playerListNode.addUser(user);
		
		line = '*** ' + pname + ' has joined the battle.';
		if( this.bots[user] )
		{
			line = '*** Bot: ' + pname + ' has been added.';
		}
		if( pname === this.nick )
		{
			this.sendPlayState();
		}
		//this.addLine( line, {'color':this.settings.settings.chatLeaveColor}, 'chatJoin' );
		this.addLine(
			line,
			{
				'color':this.settings.settings.chatJoinColor,
				'display':this.settings.settings.showJoinsAndLeaves ? 'block' :'none'
			},
			'chatJoin'
			);
	},
	
	'remPlayer':function( data )
	{
		var pname, line, battle_id, ateam, user;
		if( data.battle_id !== this.battle_id )
		{
			return;
		}
		pname = data.name;
		user = this.lobbyPlayers[pname];
		
		delete this.players[pname];
		this.playerListNode.removeUser(user);
		
		line = '*** ' + pname + ' has left the battle.';
		if( this.bots[user] )
		{
			line = '*** Bot: ' + pname + ' has been removed.';
		}
		
		//this.addLine( line, {'color':this.settings.settings.chatLeaveColor}, 'chatLeave' );
		this.addLine(
			line,
			{
				'color':this.settings.settings.chatLeaveColor,
				'display':this.settings.settings.showJoinsAndLeaves ? 'block' :'none'
			},
			'chatLeave'
			);
		
		if( pname === this.nick )
		{
			this.closeBattle();
		}
	},
	
	'blank':null
});//declare lwidgets.Battleroom



dojo.provide("lwidgets.Privchat");
dojo.declare("lwidgets.Privchat", [ lwidgets.Chat ], {
	'widgetsInTemplate':true,
	'templateString' : dojo.cache("lwidgets", "templates/privchat_nopane.html"),
	
	'saystring':'SAYPRIVATE',
	'name' : "",
	
	'postCreate2':function()
	{
		//stupid hax
		dojo.connect(this.mainContainer, 'onMouseDown', this, this.resizeAlready)
		dojo.subscribe('Lobby/chat/user/playermessage', this, 'playerMessage' );
	},
	
	'blank':null
});//declare lwidgets.Privchat


