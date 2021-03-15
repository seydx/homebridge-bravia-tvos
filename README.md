<p align="center">
    <img src="https://i.imgur.com/xnQyZaU.png" height="300">
</p>


# homebridge-bravia-tvos

[![npm](https://img.shields.io/npm/v/homebridge-bravia-tvos.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-bravia-tvos)
[![npm](https://img.shields.io/npm/dt/homebridge-bravia-tvos.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-bravia-tvos)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-bravia-tvos.svg?style=flat-square)](https://github.com/SeydX/homebridge-bravia-tvos)
[![Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/kqNCe2D)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square&maxAge=2592000)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=NP4T3KASWQLD8)

**Creating and maintaining Homebridge plugins consume a lot of time and effort, if you would like to share your appreciation, feel free to "Star" or donate.**

[Click here](https://github.com/SeydX) to review more of my plugins.


## Info

This is a plugin for [Homebridge](https://github.com/nfarina/homebridge) to control your **Sony Bravia Android TV**. 

This plugin supports following functions:

- **Power Switch**
- **Inputs:** like HDMI, Scart, CEC Devices, AV, WIFI etc.
- **Apps:** like YouTube, Prime Video etc.
- **Channels:** Your favourite channels as inputs.
- **Remote control:** native iOS Remote control with customizable commands
- **Login:** with Pre-Shared Key or Token (PIN)
- **WOL:** supports Wake on Lan
- **Speaker:** with support for three types of speaker (speaker, switch with custom charactersitic or lightbulb)
- **Config UI X Custom UI** 

## Installation instructions

After [Homebridge](https://github.com/nfarina/homebridge) has been installed:

```sudo npm i -g homebridge-bravia-tvos@latest```


## Preparing the TV

### TV Settings

- Set **Remote start** to **ON** _(Settings -> Network -> Remote Start)_
- Change **Authentication** to **Normal and Pre-Shared Key** _(Settings -> Network -> IP Control -> Authentication)_

If you want to use authentication with a Pre-Shared key, please do following steps:

- Enter a **Pre-Shared Key** _(Settings -> Network -> IP control -> Pre-Shared Key)_

## Configuration (Config UI X)

Bravia TV OS v4.1 supports a custom user interface making configuration via **homebridge-config-ui-x** even easier! Below you can see how easy it is to create, edit or delete a new TV for the config.json using the custom user interface. To use the custom user interface you need at least homebridge-config-ui-x v4.34.0!

<img src="https://github.com/SeydX/homebridge-bravia-tvos/blob/master/images/hb_braviatvos_ui_final.gif" align="center" alt="CustomUI">

## Configuration (Manually)

If you cannot use the custom user interface or want to edit the config.json manually, you must first decide which authentication to use.


### a) PIN Authentication (prefered)

To use the PIN authentication you must first install the bravia module:

``
sudo npm i -g @seydx/bravia@latest
``

And to be able to use the plugin with the PIN procedure your credentials must be created first.

You can create the credentials as follows:

``bravia pair <host> -p 80 -n MyTV -t 5``

- \<host\>: The address of your Bravia TV (eg 192.168.178.1)
- -n: Name for the app (Default Bravia)
- -p: The port of your Bravia TV (Default: 80)
- -t: The amount of time (in seconds) to wait for the response (Default 5s)

The PIN displayed on the TV must then be entered in the terminal. This will generate a credentials ``<Object>`` like this:
    
```javascript
{
  name: 'MyTV',
  uuid: 'e9812807-d394-407c-b657-c89a98804e65',
  token: 'A0B9B9D7580466F22EE8F8EA148863774ACCE203',
  expires: 'Fr., 26 Apr. 2009 21:42:48 GMT+00:00'
}
```

You need to put the application name and application uuid in your config.json.

**Example:**

```
{
  "name": "Sony TV",
  "ip": "192.168.178.123",
  "appName": "MyTV",
  "appUUID": "e9812807-d394-407c-b657-c89a98804e65",
  ...
}
```

### b) PSK Authentication

- Enter a **Pre-Shared Key** _(Settings -> Network -> IP control -> Pre-Shared Key)_

You need to put the PSK entered in your tv also in your config.json.

**Example:**

```
{
  "name": "Sony TV",
  "ip": "192.168.178.123",
  "psk": "MYPSK"
  ...
}
```

## Example BASIC config

 ```
{
 "bridge": {
   ...
},
 "accessories": [
   ...
],
 "platforms": [
    {
      "platform": "BraviaOSPlatform"
      "name": "BraviaTVOS",
      "debug": true,
      "tvs": [
        {
          "name": "Sony TV",
          "ip": "192.168.178.123",
          "psk": "0000",
          "inputs": [
            "extInput:cec",
            "extInput:hdmi"
          ],
          "apps": [
            "YouTube",
            "Smart IPTV"
          ],
          "channels": [
            {
              "channel": 97,
              "source": "tv:dvbt"
            }
          ],
          "commands": [
            "AAAAAQAAAAEAAABgAw=="
          ],
          "speaker": {
            "output": "speaker",
            "accType": "lightbulb"
          },
        }
      ]
    }
 ]
}

 ```
 
 See [Example Config](https://github.com/SeydX/homebridge-bravia-tvos/blob/beta/example-config.json) for a **FULL** config example.

 
 ## Options Genral

| **Attributes** | **Required** | **Usage** | **Default** | **Options** |
|----------------|--------------|-----------|-------------|-------------|
| name | **X** | Name for the log. | BraviaTVOS
| debug |  | Enables additional output in the log. | false | true/false
| polling |  | Polling interval in seconds. | 10s

 ## Options TV
 
| **Attributes** | **Required** | **Usage** | **Default** | **Options** |
|----------------|--------------|-----------|-------------|-------------|
| ip | **X** | Sony TV IP Address. | 
| mac | | Sony TV MAC Address. |
| port |  | Sony TV Port. | 80
| psk | **X** | Either psk **OR** appName/appUUID must be setted. (see preparing the TV above) |
| appName | **X** | Either psk **OR** appName/appUUID must be setted. (see preparing the TV above) |
| appUUID | **X** | Either psk **OR** appName/appUUID must be setted. (see preparing the TV above) |
| timeout |  | Timer in seconds to wait for a response. | 5s
| manufacturer | | Manufacturer name for display in the Home app. | Sony
| model |  | Model name for display in the Home app. | tv/speaker
| serialNumber |  | Serialnumber for display in the Home app. | Homebridge
| refreshInputs |  | When this option is enabled, the TV updates all inputs and saves them to disk for further use. (Please turn on the TV before restarting homebridge with this option enabled, otherwise the plugin will turn on the TV to also retrieve CEC inputs) | false | true/false
| inputs |  | Type of the tv input(s) to display in Apple Home. | [] | extInput:cec, extInput:component, extInput:composite, extInput:hdmi, extInput:scart, extInput:widi
| apps |  | Name of the app(s) to display in Apple Home. | []
| channels |  | Channel(s) to display in Apple Home. (see channels.channel and channels.source) |
| channels.channel |  | Number of the channel as seen on the TV. |
| channels.source |  | Source of the channel. | tv:dvbt | tv:dvbt, tv:dvbc, tv:dvbs, tv:analog
| commands |  | IRCC code or name of the command to display in Apple Home. (eg. AAAAAQAAAAEAAABgAw== or PowerOff) |
| speaker.output |  | Audio output. | speaker | speaker, headphone, other
| speaker.increaseBy |  | Volume level to increse. (for Apple Remote) | 1
| speaker.reduceBy |  | Volume level to reduce. (for Apple Remote) | 1
| speaker.accType |  | Accessory type for the speaker. | false | speaker, switch, lightbulb
| displayOrder |  | Array of catagories to sort inputs | ["apps", "channels", "commands", "inputs"] | "apps", "channels", "commands", "inputs"
| remote |  | Customizable commands for Apple Remote |
| remote.command | | IRCC command for choosen target
| remote.target | | Target Apple Remote switch. | | ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT, ARROW_UP, BACK, EXIT, FAST_FORWARD, INFORMATION, NEXT_TRACK, PAUSE, PLAY, PREVIOUS_TRACK, REWIND, SELECT, SETTINGS, VOLUME_DOWN, VOLUME_UP

## Supported clients

This plugin has been verified to work with the following apps on iOS 14:

* iOS 14
* Apple Home
* 3rd party apps like Elgato EVE (TV accessory still not supported because apple blocking it)
* Homebridge v1.1.6+


## Contributing

You can contribute to this homebridge plugin in following ways:

- [Report issues](https://github.com/SeydX/homebridge-bravia-tvos/issues) and help verify fixes as they are checked in.
- Review the [source code changes](https://github.com/SeydX/homebridge-bravia-tvos/pulls).
- Contribute bug fixes.
- Contribute changes to extend the capabilities

Pull requests are accepted.


## Troubleshooting

If you have any issues with the plugin or TV services then you can run homebridge in debug mode, which will provide some additional information. This might be useful for debugging issues. Just enable ``Debug`` in your config and restart homebridge.


## Disclaimer

All product and company names are trademarks™ or registered® trademarks of their respective holders. Use of them does not imply any affiliation with or endorsement by them.
