# Command line options #

## Custom URL ##

-url URL - forces weblobby to open URL instead of the default one. Very useful for testing with file:// urls and localhost.

Example to run it with a custom URL

```
./weblobby -url http://localhost:123
./weblobby -url file:///d:/projects/weblobby/site/index.html
```

## Debugging options ##

  * -debug - enable debug output
  * -debug-cmd - include command output in the log (pr-downloader nagging, spring console output)
  * -debug-net - print all data sent to and received from uberserver
  * -debug-all - all of the above

## Prepackaged data ##

-prepackaged-data PATH - The path can be absolute or relative to the current working directory when the lobby process is started. It must point to a folder. On lobby start everything inside the folder will be moved to spring home dir. The folder itself won't be removed. If it doesn't exist, an error is shown.

E.g. if you have c:\evo\_data that has evo\_data/pool, evo\_data/packages, evo\_data/weblobby/engine, evo\_data/maps; you use -prepackaged-data c:\evo\_data



&lt;hr&gt;



# Compiling #

<i>TODO: Test the qt installer and write a tutorial for Car.</i>

To compile weblobby you need the following:

## C++ compiler ##

Tested compilers are gcc-4.8 on Linux and MinGW from mingw-builds on Windows. <b>Note:</b> if you want to use gcc on Windows you MUST use a version from http://mingwbuilds.sourceforge.net with dwarf exceptions and posix threading, not vanilla MinGW. <b>But worry not!</b> Qt project provides installers that already include the correct MinGW toolchain, so you don't have to worry about that technical mumbo-jumbo.

Visual Studio or clang were not tested, but should probably work.

## Qt 5 ##

Version 5.2.1 or later recommended, older versions can work. On Windows you'll want to download an official installer from http://qt-project.org/downloads . On Linux, make sure you have QtWebKit if your distro provides a separate package for that.

## Other dependencies ##

  * Boost. Version 1.55 was tested, anything reasonably recent should work.
  * curl 7.X.X.



&lt;hr&gt;



# General design #

We use C++11.

The idea is to keep the code reasonably decoupled from Qt in case we need to port it to something else. That means that we use Boost.Asio for networking instead of Qt network classes, Boost.Filesystem for fs access, etc. The exceptions are JS-facing APIs that QtWebKit requires to use Qt types for marshalling, and cases where a thread needs to signal something to JS, since Qt events have to be used for that.