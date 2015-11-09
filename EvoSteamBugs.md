# Cannot create process: assign: wrong argument #

Windows XP

# The package file is corrupted #

Sometimes the file corresponding to the game in Spring/packages becomes corrupted on download and pr-download thinks it's already downloaded and doesn't do anything. In weblobby.log you see unitsync loading successfully, pr-downloader getting launched and finishing, and that repeats every time the user joins a battle. Deleting Spring/packages solved that in all cases that I saw.

# GLSL errors and "can't execute gameframe #2" #

I've seen two cases where a specific user triggered glsl and "can't execute gameframe #2" error spam for <b>all players</b> if he joined on game start. In both cases reinstalling the game (including deleting Documents/My games/Spring of course) solved the problem.



&lt;hr&gt;



# Rare problems #

These were noticeable during the first days of Steam release, but there has been no sight of them ever since.

## Engine "stuck at 100%" ##

Apparently pr-downloader gets the 7z archive, starts extracting, creates the 96.0 dir, but no unitsync.dll or spring.exe can be found inside.
In weblobby.log it complains about being unable to load unitsync because "127" which is ERROR\_MODULE\_NOT\_FOUND.

This can also be a symptom of "Cannot load unitsync: 87" described below.

## pr-downloader fails to download ##

For some people it fails to download for some reason.
Causes errors like "Cannot start command: Downloading Map Eye\_Of\_Horus\_v2: in file '..\Boost.Process-0.5/boost/process/windows/initializers/throw\_on\_error.hpp', line 24: CreateProcess() failed".

This is completely mitigated by preload.

## Game download stuck at 0% ##

Probably excessive server load.



&lt;hr&gt;



# Fixed #

## Cannot load unitsync: 87 ##

Windows with KB2533623 not installed.

## Paths with non-ASCII characters ##

If the path to My games/Spring contains non-ASCII characters, the lobby fails to work. Sorry, my fuckup.