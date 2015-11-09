# Script.txt Resources #

## ZKLobby ##

All ZKL does is this:

```
[GAME]
{
HostIP=94.23.171.71;
HostPort=8871;
IsHost=0;
MyPlayerName=[LCC]quantum[0K];
MyPasswd=601449288;
}
```

That might be sufficient for autohosts!

## Spring Documentation ##

https://github.com/spring/spring/blob/develop/doc/StartScriptFormat.txt

## Mission Editor Implementation ##

```c-sharp

public string GetScript()
{
var sb = new StringBuilder();
var allianceCount = Players.Select(p => p.Alliance).Distinct().Count();
sb.AppendFormat("[GAME]\n");
sb.AppendLine("{");
Action<string, object> line = (key, value) => sb.AppendFormat("\t{0}={1};\n", key, value);
line("MapName", MapName);
line("StartMetal", StartingMetal);
line("StartEnergy", StartingEnergy);
line("StartposType", "3");
line("GameMode", "0");
line("GameType", Name);
line("LimitDGun", "0");
line("DiminishingMMs", "0");
line("GhostedBuildings", "1");
line("HostIP", "127.0.0.1");
line("HostPort", "8452");
line("IsHost", "1");
line("MyPlayerNum", Players.IndexOf(StartingPlayer));
line("MyPlayerName", StartingPlayer.Name.Replace(' ', '_'));
line("NumPlayers", Players.Count(p => p.IsHuman));
line("NumTeams", Players.Count);
line("NumUsers", Players.Count);
line("NumRestrictions", "0");
line("MaxSpeed", "20");
line("MinSpeed", "0.1");

foreach (var player in Players) WritePlayer(sb, player);
foreach (var player in Players) WriteTeam(sb, player);
for (var i = 0; i < allianceCount; i++) WriteAllyTeam(sb, i);
sb.AppendLine("}");
return sb.ToString();
}

void WriteAllyTeam(StringBuilder sb, int index)
{
sb.AppendFormat("\t[ALLYTEAM{0}]\n", index);
sb.AppendLine("\t{");
sb.AppendFormat("\t\tNumAllies=0;\n"); // it seems that NumAllies has no effect
sb.AppendLine("\t}");
}

void WritePlayer(StringBuilder sb, Player player)
{
if (player.IsHuman)
{
var index = Players.IndexOf(player);
sb.AppendFormat("\t[PLAYER" + index + "]\n");
sb.AppendLine("\t{");
sb.AppendFormat("\t\tName={0};\n", player.Name.Replace(' ', '_'));
sb.AppendFormat("\t\tSpectator=0;\n");
sb.AppendFormat("\t\tTeam={0};\n", index);
sb.AppendLine("\t}");
}
else
{
var index = Players.IndexOf(player);
sb.AppendFormat("\t[AI" + index + "]\n");
sb.AppendLine("\t{");
sb.AppendFormat("\t\tName={0};\n", player.Name.Replace(' ', '_'));
sb.AppendFormat("\t\tShortName={0};\n", player.AIDll);
// sb.AppendFormat("\t\tVersion={0};\n", String.IsNullOrEmpty(player.AIVersion) ? "0.1" : player.AIVersion);
sb.AppendFormat("\t\tTeam={0};\n", index);
sb.AppendFormat("\t\tIsFromDemo=0;\n");
sb.AppendFormat("\t\tHost={0};\n", Players.IndexOf(StartingPlayer));
sb.AppendFormat("\t\t[Options] {{}}\n");
sb.AppendLine("\t}");
}
}

void WriteTeam(StringBuilder sb, Player player) // no commshares for now
{
var index = Players.IndexOf(player);
var alliances = Players.Select(p => p.Alliance).Distinct().ToList();
sb.AppendFormat("\t[TEAM{0}]\n", index);
sb.AppendLine("\t{");
sb.AppendFormat("\t\tTeamLeader={0};\n", Players.IndexOf(StartingPlayer)); // todo: verify if correct
sb.AppendFormat("\t\tAllyTeam={0};\n", alliances.IndexOf(player.Alliance));
sb.AppendFormat("\t\tRGBColor={0} {1} {2};\n", player.Color.ScR, player.Color.ScG, player.Color.ScB); // range: 0-1
sb.AppendFormat("\t\tSide={0};\n", Mod.Sides.First());
sb.AppendFormat("\t\tHandicap=0;\n");
sb.AppendFormat("\t\tStartPosX=0;\n");
sb.AppendFormat("\t\tStartPosZ=0;\n");
sb.AppendLine("\t}");
}
```