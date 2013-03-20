///////////////////////////////////

// JS Spring Lobby Interface

// By CarRepairer

// License: GPL 2

///////////////////////////////////

/*

pr-downloader --filesystem-writepath "springhome\Documents\My Games\Spring\" --download-engine 92.0

*/


define(
	'lwidgets/DownloadManager',
	[
		"dojo/_base/declare",
		"dojo",
		"dijit",
		'dijit/_WidgetBase',
		
				
		'dojo/_base/array',
		'dojo/dom-construct',
		'dojo/dom-style',
		'dojo/dom-attr',
		'dojo/_base/lang',
		'dojo/topic',
		
		
		// *** extras ***
		'dojo/text', //for dojo.cache
		'dijit/Dialog',
		'dijit/form/Button',
		'dijit/ProgressBar',
	],
	function(declare,
			dojo, dijit,
			WidgetBase,
			
			array, domConstruct, domStyle, domAttr, lang, topic
	){
	return declare( [ WidgetBase  ], {
	
	'settings':null,
	'appletHandler':null,
	'battleId':0,
	'bars':null,
	'barDivs':null,
	'barBytes':null,
	'processes':null,
	'barControls':null,
	
	'buildRendering':function()
	{
		var div1;
		this.bars = {};
		this.barControls = {};
		this.barDivs = {};
		this.barBytes = {};
		this.barTitles = {};
		this.processes = {};
		
		div1 = domConstruct.create('div', {});
		//domConstruct.create('span', {'innerHTML':'Note: Downloads currently only work on Windows and Mac.', 'style':{'color':'red'} }, div1 );
		this.domNode = div1;
		
		this.subscribe('Lobby/commandStream', 'commandStream');
	},
	
	'postCreate' : function()
	{
		//this.appletHandler.downloadDownloader();
		
		//this.addBar('test1');
	},
	
	'setOs':function()
	{
		this.appletHandler.setOs()
	},
	
	'downloadEngine':function( version )
	{
		var processName;
		
		processName = 'Download Engine ' + version;
		if( !( processName in this.processes ) )
		{
			alert('Downloading Spring version ' + version + '...' );
			
			this.processes[processName] = true;
			
			this.appletHandler.runCommand(processName,[
				'%springHome%/pr-downloader/pr-downloader',
				'--filesystem-writepath',
				'%springHome%',
				'--download-engine',
				version
			]);
			
			
			this.addBar(processName)
		}
		
		
	},
	
	'downloadPackage':function( packageType, packageName )
	{
		var processName;
		if( packageName === '' )
		{
			return '';
		}
		/*
		if( this.os !== 'Windows' )
		{
			return '';
		}
		*/
		if( packageType === 'map' )
		{
			processName = 'Download Map ' + packageName
		}
		else if( packageType === 'game' )
		{
			processName = 'Download Game ' + packageName
		}
		
		if( !this.processes[processName] )
		{
			this.processes[processName] = true;
			if( packageType === 'map' || packageType === 'game' )
			{
				console.log('>>>> testing', packageType, packageName)
				this.appletHandler.runCommand(processName,[
					'%springHome%/pr-downloader/pr-downloader',
					(packageType === 'game' ? '--download-game' : '--download-map' ),
					'' + packageName
				]);
			}
			this.addBar(processName)
		}
		return processName;
	},
	
	'commandStream':function(data)
	{
		var processName, line, perc, bytes, title;
		processName = data.cmdName
		if( !this.barControls[processName] )
		{
			return;
		}
		line = data.line;
		
		// [Progress] 69% [==================== ] 5129808/7391361
		perc = line.match(/\[Progress\]\s*(\d*)%/);
		if( perc !== null && perc[1] !== null )
		{
			perc = parseInt( perc[1] );
			this.barControls[processName].bar.update( {'progress': perc } );
			
			bytes = line.match( /\[Progress\].*\/(\d*)\s*$/ );
			if( bytes !== null && bytes[1] !== null )
			{
				bytes = addCommas( bytes[1] );
				domAttr.set( this.barControls[processName].bytes, 'innerHTML', ' ('+ bytes +' bytes)' );
			}
			
			topic.publish( 'Lobby/download/processProgress', {'processName':processName, 'perc':perc } );
		}
		if( line === '[Info] download complete'
			||
			line === '[Info] Download complete!' //engine download
		)
		{
			this.barControls[processName].bar.set( {'indeterminate': false } );
			this.barControls[processName].bar.update( {'progress': 100 } );
			this.appletHandler.refreshUnitsync();
			domAttr.set( this.barControls[processName].spinner, 'src', '' );
			//topic.publish( 'Lobby/download/processProgress', {'processName':processName, 'perc':perc, 'complete':true } );
		}
		
	},
	
	'getGameIndex':function( gameName, engineVersion )
	{
		var gameIndex;
		gameIndex = parseInt( this.appletHandler.getUnitsync(engineVersion).getPrimaryModIndex( gameName ) );
		//echo(' ========== Got game?', engineVersion, gameName, gameIndex)
		if( gameIndex === -1 || isNaN(gameIndex) )
		{
			gameIndex = false;
		}
		return gameIndex;
	},
	'getMapChecksum':function( mapName, engineVersion )
	{
		var mapChecksum;
		mapChecksum = parseInt(  this.appletHandler.getUnitsync(engineVersion).getMapChecksumFromName( mapName ) );
		//echo('========= Got map?', mapName, mapChecksum)
		if( mapChecksum === 0 || isNaN(mapChecksum) )
		{
			mapChecksum = false;
		}
		return mapChecksum;
	},
	
	
	'addBar':function(title)
	{
		var barDiv, titleSpan, killButton;
		barDiv = domConstruct.create('div', {'style':{'position':'relative', 'height':'30px' } }, this.domNode );

		killButton = new dijit.form.Button({
			'label':'Cancel Download',
			'iconClass':'smallIcon closeImage',
			'showLabel':false,
			'style':{
				'position':'absolute'
			}
		}).placeAt(barDiv);
		this.barControls[title] = {};
		
		//this.bars[title] = new dijit.ProgressBar({
		this.barControls[title].bar = new dijit.ProgressBar({
			'style':{
				'position':'absolute',
				'left':'40px',
				'width':'250px'
			},
			'maximum':100,
			'indeterminate':title.match( /Download Engine/ )
		}).placeAt(barDiv);
		
		titleSpan = domConstruct.create('span', {'innerHTML':title, 'style':{'position':'absolute', 'left':'310px', 'right':'3px' } }, barDiv );
		
		this.barControls[title].title = titleSpan;
		this.barControls[title].bytes = domConstruct.create('span', {}, titleSpan);
		
		this.barControls[title].spinner = domConstruct.create('img', {'src':'img/greenspinner.gif'} );
		domConstruct.place( this.barControls[title].spinner, titleSpan, 'first' )
		
		this.barControls[title].div = barDiv;
		
		killButton.set( 'onClick', lang.hitch( this, function(killButton, title ){
			this.appletHandler.killCommand( title );
			killButton.set('disabled', true);
			this.processes[title] = null;
			delete this.processes[title];
			domStyle.set( this.barControls[title].div, 'color', 'red' );
			domAttr.set( this.barControls[title].spinner, 'src', '' );
		}, killButton, title ) );

	},
	
	'blank':null
}); });//declare lwidgets.ChatManager


