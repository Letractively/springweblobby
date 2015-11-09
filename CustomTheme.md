# Creating a Custom Theme in Weblobby #

You can create a custom theme with Weblobby to match your website or game. The URL may contain a string which Weblobby loads as the default settings, until the user changes them and it gets saved to the user's cookies. To create the URL:

  * Open http://weblobby.springrts.com/
  * Set up your desired colors in the settings tab. You can also add filters in the battle list tab.
  * Clear your username and password from the settings tab, otherwise the URL will contain them!
  * Open Firebug and select the Cookies tab.
  * Expand the "settings" cookie.
  * Select the "Raw Data" tab and copy the text.
  * Create a URL like so: `http://weblobby.springrts.com?settings=<raw data here>`
  * Link to this URL or use an iframe.

# Qt weblobby #

This should return the value of the settings url parameter with the current settings: ```
encodeURIComponent(JSON.stringify(localStorage.getItem("settings")))```Once/if firebug lite is bundled, it can be run easily.