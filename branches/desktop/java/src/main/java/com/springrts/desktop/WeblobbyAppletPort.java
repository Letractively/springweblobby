
/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 *
 * @author cc
 * @license GPL 2
 */

package com.springrts.desktop;


import com.springrts.unitsync.JavaSocketBridge;
import com.springrts.unitsync.WeblobbyApplet.UntrustedException;
import com.springrts.unitsync.impl.jna.UnitsyncImpl;
import com.sun.jna.Library;
import com.sun.jna.Native;
import com.trolltech.qt.core.QObject;
import com.trolltech.qt.gui.QApplication;
import com.trolltech.qt.webkit.QWebView;

import java.awt.HeadlessException;
import java.io.*;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.net.URLConnection;
import java.nio.ByteBuffer;
import java.nio.channels.Channels;
import java.nio.channels.ReadableByteChannel;
import java.util.*;

import java.util.zip.CRC32;

//import javax.swing.JApplet;

//public class UnitsyncApplet extends JApplet {
public class WeblobbyAppletPort extends QObject {

	private Map<String, Process> processes = new HashMap<String, Process>();
	private String os;
	private String springHome;
	private String slash;
	private JavaSocketBridge javaSocketBridge = new JavaSocketBridge(this);
	private QWebView browser;

	public WeblobbyAppletPort(QWebView browser)
	{
		this.browser = browser;

		springHome = "";
		try {
			this.dsocket = new DatagramSocket();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public void init() throws HeadlessException {
		os = System.getProperty("os.name").toLowerCase();
		if (os.indexOf("win") >= 0) {
			setOs("Windows");
		} else if(os.indexOf("nux") >= 0) {
			setOs("Linux");
		} else if (os.indexOf("mac") >= 0) {
			setOs("Mac");
		}
	}

	public boolean connect(final String url, final int p) {
		return javaSocketBridge.connect(url, p);
	}

	//FIXME: was renamed from disconnect to disconnectBridge
	public boolean disconnectBridge()
	{
		return this.javaSocketBridge.disconnect();
	}
	public boolean send(String message)
	{
		return this.javaSocketBridge.send(message);
	}

	public String listDirs( final String path )
	{
		return this.listFilesPriv(path, true);
	}
	public String listFiles( final String path )
	{
		return this.listFilesPriv(path, false);
	}

	private String listFilesPriv( final String path, final boolean dirs )
	{
		List<String> files = new ArrayList<String>();

		File folder = new File(path);
		if( folder.exists() )
		{
			File[] listOfFiles = folder.listFiles(); 

			for (int i = 0; i < listOfFiles.length; i++) 
			{
				if( dirs )
				{
					if (listOfFiles[i].isDirectory()) 
					{
						files.add(listOfFiles[i].getName());
					}
				}
				else
				{
					files.add(listOfFiles[i].getName());
				}
			}
		}
		String out = "";
		if( files.size() > 0 )
		{
			out += files.remove(0);
			for(String file : files)
			{
				out += "||" + file;
			}
		}

		return out;
	}

	public void createScript(String scriptFile, String script)
	{
		this.createScriptFile(scriptFile, script);
	}

	public UnitsyncImpl getUnitsync(final String unitsyncPath)
	{
		//NativeLibrary.addSearchPath("unitsync", unitsyncPathFull);
		//Preferences.userRoot().put("unitsync.path", "unitsync");
		try
		{   
			//echoJs("unitsyncPathFull = " + unitsyncPathFull);

			File f = new File(unitsyncPath);
			{
				if( !f.exists() )
				{
					return null;
				}
			}
			/** /
            Preferences.userRoot().put("unitsync.path", unitsyncPathFull);
            return new UnitsyncImpl();
            /**/
			UnitsyncImpl unitsync = new UnitsyncImpl( unitsyncPath, this );
			return unitsync;

		}
		catch (Exception e) 
		{
			WriteToLogFile( e );
		}
		return null;
	}

	private int byteToInt(byte b)
	{
		return (int) b & 0xff;
	}
	private int byteToShort(byte b)
	{
		return (short) ((short) b & 0xff);
	}

	public int[] jsReadFileVFS(String unitsyncPath, int fd, int size)
	{
		byte[] bytes = new byte[size];
		ByteBuffer buff = ByteBuffer.wrap(bytes);
		int bytesRead;
		bytesRead = this.getUnitsync(unitsyncPath).readFileVFS(fd, buff, size );
		//this.echoJs( buff.toString() );
		System.out.println("Bytes read: " + bytesRead );
		byte[] byteArray = buff.array();
		int[] ints = new int[ byteArray.length ];

		for (int i = 0; i < byteArray.length; ++i) 
		{ 
			//ints[i] = (int)byteArray[i];
			//ints[i] = byteToInt( byteArray[i] );
			ints[i] = byteArray[i];

		}
		return ints;
	}



	public boolean killCommand( final String cmdName )
	{
		Process p = processes.get(cmdName);
		if (p != null) {
			p.destroy();
		}
		return true;
	}


	private void setOs(String os) {
		this.os = os;
		File f;
		this.slash = os.equals("Windows") ? "\\" : "/";
		if	(springHome != "") {
			
		} else if( os.equals("Windows")) {
			springHome = System.getProperty("user.home") + "\\Documents\\My Games\\Spring";
		} else if( os.equals("Mac") || os.equals("Linux")) {
			springHome = System.getProperty("user.home") + "/.spring";
		} else {
			return;
		}
		f = new File( springHome );
		f.mkdirs();
		
		if (!f.isDirectory()) {
			System.err.println("alert('Cannot access spring home folder " + jsFix(springHome) + "\nApparently, automatic detection has failed. Please set the correct one in settings.');");
		}

		String weblobbyHome = springHome + this.slash + "weblobby";

		f = new File( weblobbyHome + this.slash + "engine" );
		f.mkdirs();

		f = new File( weblobbyHome + this.slash + "pr-downloader" );
		f.mkdirs();

		f = new File( weblobbyHome + this.slash + "logs" );
		f.mkdirs();
	}

	public String getSpringHome() {
		return this.springHome;
	}

	// Should be called prior to init() to take effect.
	public void setSpringHome(final String path) {
		this.springHome = path;
	}

	public void createDir(final String path) {
		File f = new File( path );
		f.mkdir();
	}

	public void runCommand(final String cmdName, final String[] cmd) {
		/*
		 * Chromium Bug:
		 * cmd is coming in as a string(?) instead of as an array of strings. 
		 * Appears fine in javascript but not in this function
		 * Chromium only, not Windows Chrome
		 */
		/*
        echoJs( "begin runCommand1: " );
        echoJs( "begin runCommand2: " + cmd );
        echoJs( "begin runCommand3: " + cmd[0] );
		 */

		new Thread(new Runnable() {
			public void run() {
				runCommandThread(cmdName, cmd);
			} 
		}).start(); //new Thread(new Runnable() {
	}

	private void createScriptFile(final String scriptFile, final String script) {
		System.out.println("Creating script: " + scriptFile );
		try {   
			PrintWriter out = new PrintWriter( scriptFile );
			System.out.println( "Writing to script file: " +  scriptFile );
			out.print(script);
			out.close();
		} catch (Exception e) {
			WriteToLogFile( e );
		}
	}

	public void createUiKeys(final String path) {
		System.out.println( "Creating empty uikeys: " + path );
		try {   
			PrintWriter out = new PrintWriter( path );
			out.print("");
			out.close();
		} catch(Exception e) {
			e.printStackTrace();
		}
	}
	public void deleteSpringSettings(final String path) {
		if (!path.endsWith("springsettings.cfg")) {
			System.out.println( "Delete SpringSettings error: " + path );
			return;
		}
		echoJs( "Delete SpringSettings: " + path );
		try	{   
			File f = new File( path );
			f.delete();
		} catch(Exception e) {
			WriteToLogFile( e );
		}
	}

	public String jsFix(String str) {
		str = str.replace("\\", "\\\\");
		str = str.replace("'", "\\'");
		str = str.replace("\n", "\\n");
		str = str.replace("\r", "");
		return str;
	}

	private void setupEnvironment(ProcessBuilder pb) {
		pb.environment().put( "OMP_WAIT_POLICY", "ACTIVE" );
	}

	private void runCommandThread(final String cmdName, final String[] cmd) {
		if(cmd[0].contains( "pr-downloader")) {
			//String newCmd = this.springHome + this.slash + "pr-downloader" + this.slash + "pr-downloader";
			//cmd[0] = cmd[0].replace( "pr-downloader", newCmd );
		} else if(cmd[0].toLowerCase().contains("spring")) {
			System.out.println("Starting Spring shortly... " +  cmd[0] );
		} else if(cmd[1].toLowerCase().contains( "spring")) {
			System.out.println("Starting Spring shortly... " +  cmd[0] + " " + cmd[1] );
		} else {
			System.err.println("Bad command.");
			return;
		}

		if (processes.get(cmdName) != null)	{
			return;
		} try {
			//echoJs( "running command... " + cmd[0] );

			/*
            Runtime runtime = Runtime.getRuntime();
            Process pr = runtime.exec( cmd2 );
			 */

			ProcessBuilder builder = new ProcessBuilder(cmd);
			builder.redirectErrorStream(true);
			setupEnvironment( builder );
			Process pr = builder.start();

			processes.put(cmdName, pr);

			BufferedReader buf = new BufferedReader(new InputStreamReader(pr.getInputStream()));

			String line = "";

			while ((line=buf.readLine())!=null) {
				doJs("commandStream('"+ jsFix(cmdName) +"', '"+jsFix(line)+"')");
			}
			processes.remove(cmdName);
			doJs("commandStream('exit', '"+jsFix(cmdName)+"')");
		} catch (Exception e) {
			WriteToLogFile(e);
			e.printStackTrace();
		}
	}


	private void WriteToLogFile(Exception e) {
		String logFile = this.springHome + this.slash + "WebLobbyLog.txt" ;
		try	{   
			PrintWriter out = new PrintWriter( logFile );
			echoJs( "Error. Writing to log file: " +  logFile );
			out.println( "Begin log file.\n" );   

			e.printStackTrace( out );

			out.close();
		} catch(Exception e2)
		{
			e.printStackTrace();
		}

	}

	public boolean WriteToFile(final String logFile, final String line) {
		try	{   
			PrintWriter out = new PrintWriter(new FileWriter(logFile, true));
			out.println(line);
			out.close();
		} catch(Exception e) {
			e.printStackTrace();
			return false;
		}
		return true;
	}

	public String ReadFileLess(final String logFile, final int numLines) {
		try {   
			File f = new File(logFile);
			if(!f.exists()) { 
				return "";
			}
			String lessOut = "";
			Stack<String> lessOutList = new Stack<String>();
			BufferedReader br = null;
			br = new BufferedReader(new FileReader(logFile));
			String curLine;

			while ((curLine = br.readLine()) != null) {
				lessOutList.push(curLine);
			}

			for (int i=1; i <= numLines && !lessOutList.empty() ; i++) {
				lessOut = lessOutList.pop() + "\n" + lessOut;
			}
			return lessOut;
		} catch(Exception e) {
			e.printStackTrace();
			return "";
		}              
	}


	public String ReadFileMore(final String logFile, final int numLines) {
		try {   
			File f = new File(logFile);
			if (!f.exists()) { 
				return "";
			}
			String out = "";
			String curLine;
			int curLineNum = 1;

			BufferedReader br = null;
			br = new BufferedReader(new FileReader(logFile));

			while ((curLine = br.readLine()) != null && curLineNum <= numLines ) {
				out += curLine;
				curLineNum++;
			}

			return out;
		}
		catch(Exception e) {
			e.printStackTrace();
			//echoJs( "Problem reading from log file ("+logFile+"): " + e.toString() );
			return "";
		}
	}


	public void echoJs(String out)	{
		System.out.println(out);
		out = jsFix(out);
	}

	public void doJs(String jscmd)
	{
		final String evalJS = "__java_js_wrapper(function(){" + jscmd + "}, this);";
		try {
			QApplication.invokeLater(new Runnable() {			
				@Override
				public void run() {
					browser.page().mainFrame().evaluateJavaScript(evalJS + "; null");	
				}
			});
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public boolean downloadFile(final String source, final String target) {
		downloadFilePriv(source, target);
		return true;
	}

	public boolean downloadFilePriv(String source, String target) {
		try {
			System.out.println("Copy file: " + source + " > " + target );
			URLConnection dl = new URL( source ).openConnection();
			dl.setUseCaches(false);

			File f = new File(target);
			dl.setIfModifiedSince( f.lastModified() );

			if (dl.getContentLength() <= 0) {
				System.out.println("File not modified, using cache");
				return true;
			}

			ReadableByteChannel rbc = Channels.newChannel(dl.getInputStream());

			FileOutputStream fos = new FileOutputStream(target);
			fos.getChannel().transferFrom(rbc, 0, 1 << 24);
			//System.out.println(fos.getChannel().size());
			fos.close();
			rbc.close();

			if (target.endsWith("pr-downloader")) {
				CLibrary libc = (CLibrary) Native.loadLibrary("c", CLibrary.class); //breaks applet on windows
				/*
                Path targetFile = Paths.get(target); // fails on Linux
                Set<PosixFilePermission> perms = PosixFilePermissions.fromString("rwxr-x---");
                Files.setPosixFilePermissions(targetFile, perms);
				 */
				libc.chmod(target, 0750);
			}

		} catch (Exception e)	{
			e.printStackTrace();
		}
		return true;
	}

	interface CLibrary extends Library {
		public int chmod(String path, int mode);
	}

	private DatagramSocket dsocket;
	public int sendSomePacket(final String host, final int port, final String messageString ) {
		try {
			//int port = 90;

			byte[] message = messageString.getBytes();

			// Get the internet address of the specified host
			InetAddress address = InetAddress.getByName(host);

			// Initialize a datagram packet with data and address
			DatagramPacket packet = new DatagramPacket(message, message.length, address, port);

			// Create a datagram socket, send the packet through it, close it.
			//DatagramSocket dsocket = new DatagramSocket();
			dsocket.send(packet);
			System.out.println(""+dsocket.getLocalPort());
			return dsocket.getLocalPort();
			//dsocket.close();
		} catch (Exception e) {
			System.err.println(e);
			for(int i=0; i<e.getStackTrace().length; i++)
			{
				echoJs( e.getStackTrace()[i]+"" ); 
			}
		}
		return -1;

	} 


	public String getMacAddress() {
		try {
			InetAddress ip = InetAddress.getLocalHost();
			//echoJs("IP = " + ip);

			//NetworkInterface network = NetworkInterface.getByName("wlan0"); 

			NetworkInterface network = NetworkInterface.getByInetAddress(ip);
			if (network == null) {
				Enumeration<NetworkInterface> networks = NetworkInterface.getNetworkInterfaces();
				for (NetworkInterface netint : Collections.list(networks)) {
					if (!netint.isLoopback() && !netint.isVirtual()) {
						network = netint;
					}
				}
			}

			byte[] mac = network.getHardwareAddress();
			if (mac != null && mac.length > 0)	{
				StringBuilder sb = new StringBuilder();
				//sb.append( mac.length + "" );
				for (int i = 0; i < mac.length; i++) {
					//sb.append(String.format("%02X%s", mac[i], (i < mac.length - 1) ? ":" : ""));
					sb.append(String.format( byteToInt( mac[i] ) +"%s", (i < mac.length - 1) ? ":" : ""));	
					//sb.append(String.format( mac[i] +"%s", (i < mac.length - 1) ? ":" : ""));
				}

				return sb.toString();
			}
		} catch (Exception e) {
			e.printStackTrace();
		} 

		return "";

	}

	public long getUserID() {
		String mac = getMacAddress() + "lobby.springrts.com";
 
		CRC32 crc32 = new CRC32();
		crc32.update( mac.getBytes() );
		return crc32.getValue();
	}
}


