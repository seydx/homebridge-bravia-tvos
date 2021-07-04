<p align="center">
    <img src="https://github.com/SeydX/homebridge-bravia-tvos/blob/master/homebridge-ui/ui/src/assets/img/logo.png" height="200">
</p>


# homebridge-bravia-tvos v5

[![npm](https://img.shields.io/npm/v/homebridge-bravia-tvos.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-bravia-tvos)
[![npm](https://img.shields.io/npm/dt/homebridge-bravia-tvos.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-bravia-tvos)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-bravia-tvos.svg?style=flat-square)](https://github.com/SeydX/homebridge-bravia-tvos)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/kqNCe2D)
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
- **Commands:** IRCC commands s inputs.
- **Macros:** A set of IRCC commands as one input
- **Remote control:** native iOS Remote control with customizable commands
- **Authentication:** with Pre-Shared Key or PIN
- **WOL:** supports Wake on Lan
- **Speaker:** with support for two types of speaker (switch or lightbulb)
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

Bravia TV OS v5 supports a custom user interface making configuration via **homebridge-config-ui-x** even easier! Below you can see how easy it is to create, edit or delete a new TV for the config.json using the custom user interface. To use the custom user interface you need at least homebridge-config-ui-x v4.34.0!


https://user-images.githubusercontent.com/34152761/124396673-4b249700-dd0b-11eb-8deb-b7ab18c429e7.mov


## Configuration (Manually)

If you cannot use the custom user interface or want to edit the config.json manually, you must first decide which authentication to use.


### a) PIN Authentication (prefered)

To use the PIN authentication you must first install the bravia module:

``
sudo npm i -g @seydx/bravia@latest
``

And to be able to use the plugin with the PIN procedure your credentials must be created first.

You can create the credentials as follows:

``bravia pair <host> -p 80 -n MyTV``

- \<host\>: The address of your Bravia TV _(eg 192.168.178.99)_
- -n: Name for the app (Default `"@seydx/bravia"`)
- -p: The port of your Bravia TV (Default: `80`)

The PIN displayed on the TV must then be entered in the terminal. This will generate a credentials ``<Object>`` like this:
    
```javascript
{
  name: 'MyTV',
  uuid: 'e9812807-d394-407c-b657-c89a98804e65',
  token: 'A0B9B9D7580466F22EE8F8EA148863774ACCE203',
  expires: 'Fr., 26 Apr. 2009 21:42:48 GMT+00:00'
}
```

Once that is done, you just need to add the "name" to your config.json under "appName". (E.g.: `"appName": "MyTV"`)

**Example:**

```javascript
{
  ...
  "active": true,
  "name": "Sony TV",
  "ip": "192.168.178.123",
  "port": 80,
  "appName": "MyTV",
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

 ```javascript
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
             {
              "name": "Apple TV",
              "identifier": "Wohnzimmer",
              "source": "cec"
            }
          ],
          "apps": [
            {
              "name": "You Tube",
              "identifier": "YouTube"
            }
          ],
          "channels": [
            {
              "name": "Planet HD",
              "channel": 97,
              "source": "dvbt"
            }
          ],
          "commands": [
            {
              "name": "Volume Up",
              "value": "AAAAAQAAAAEAAABgAw=="
            }
          ],
          "speaker": {
            "active": true,
            "output": "speaker",
            "increaseBy": 1,
            "reduceBy": 1,
            "accType": "lightbulb"
          },
        }
      ]
    }
 ]
}

 ```
 
 See [Example Config](https://github.com/SeydX/homebridge-bravia-tvos/blob/beta/example-config.json) for a **FULL** config example.

 
 ## Options General

| **Attributes** | **Required** | **Usage** | **Default** | **Options** |
|----------------|--------------|-----------|-------------|-------------|
| name | **X** | Name for the log. | `BraviaTVOS`
| debug |  | Enables additional output (debug) in the log. | `false` | `true`, `false`
| warn |  | Enables additional output (warn) in the log. | `true` | `true`, `false`
| error |  | Enables additional output (error) in the log. | `true` | `true`, `false`
| extendedError |  | Enables additional output (detailed error) in the log. | `true` | `true`, `false`
| polling |  | Polling interval in seconds. | `10` (s)

 ## Options TV
 
| **Attributes** | **Required** | **Usage** | **Default** | **Options** |
|----------------|--------------|-----------|-------------|-------------|
| active | **X** | If enabled, the device will be exposed to HomeKit | `false` | `true`, `false`
| ip | **X** | Sony TV IP Address.
| mac | | Sony TV MAC Address.
| port |  | Sony TV Port. | `80`
| psk | **X** | Either psk **OR** appName/appUUID must be setted. (see preparing the TV above)
| appName | **X** | Either psk **OR** appName must be setted. (see preparing the TV above)
| manufacturer | | Manufacturer name for display in the Home app. `Sony`
| model |  | Model name for display in the Home app. | `Bravia`
| serialNumber |  | Serialnumber for display in the Home app. | `00000000`
| refreshInputs |  | When this option is enabled, the TV updates all inputs and saves them to disk for further use. (Please turn on the TV before restarting homebridge with this option enabled, otherwise the plugin will turn on the TV to also retrieve CEC inputs) | `false` | `true`, `false`
| wol |  | When this option is enabled, the plugin uses WOL instead of API to turn on the TV. (WOL must be enabled on the TV and a MAC address must be specified) | `false` | `true`, `false`


 ## Options TV Inputs
 
| **Attributes** | **Required** | **Usage** | **Default** | **Options** |
|----------------|--------------|-----------|-------------|-------------|
| inputs.name | **X** | Name for the channel to display in the tv inputs list
| inputs.identifier | **X** | Exact name of the input (eg HDMI 1)
| inputs.source | **X** | Type of the tv input |  | `cec`, `component`, `composite`, `hdmi`, `scart`, `widi`

 ## Options TV Apps
 
| **Attributes** | **Required** | **Usage** | **Default** | **Options** |
|----------------|--------------|-----------|-------------|-------------|
| apps.name | **X** | Name for the application to display in the tv inputs list
| apps.identifier | **X** | Exact name of the Application

 ## Options TV Channels
 
| **Attributes** | **Required** | **Usage** | **Default** | **Options** |
|----------------|--------------|-----------|-------------|-------------|
| channels.name | **X** | Name for the channel to display in the tv inputs list
| channels.channel | **X** | Number of the channel as seen on the TV.
| channels.source | **X** | Source of the channel. |  | `dvbt`, `dvbc`, `dvbs`, `isdbt`, `isdbc`, `isdbs`, `analog`

 ## Options TV Commands
 
| **Attributes** | **Required** | **Usage** | **Default** | **Options** |
|----------------|--------------|-----------|-------------|-------------|
| commands.name | **X** | Name for the command to display in the tv inputs list
| commands.value | **X** | IRCC code or name of the command to display in Apple Home. (eg. "AAAAAQAAAAEAAABgAw==" or "PowerOff")

 ## Options TV Macros
 
| **Attributes** | **Required** | **Usage** | **Default** | **Options** |
|----------------|--------------|-----------|-------------|-------------|
| macros.name | **X** | Name for the macro to display in the tv inputs list
| macros.delay |  | Delay between sending commands (in ms). (Default 1000ms)
| macros.commands | **X** | An array of IRCC codes/names to perform the macro

 ## Options TV Speaker
 
| **Attributes** | **Required** | **Usage** | **Default** | **Options** |
|----------------|--------------|-----------|-------------|-------------|
| speaker.active | **X** | If enabled, the device will be exposed to HomeKit (as service within the TV accessory) | `false` | `true`, `false`
| speaker.output |  | Audio output. | `speaker` | `speaker`, `headphone`, `other`
| speaker.increaseBy |  | Volume level to increse. (for Apple Remote) | `1`
| speaker.reduceBy |  | Volume level to reduce. (for Apple Remote) | `1`
| speaker.accType |  | Accessory type for the speaker. | `lightbulb` | `switch`, `lightbulb`

 ## Options TV Remote
 
| **Attributes** | **Required** | **Usage** | **Default** | **Options** |
|----------------|--------------|-----------|-------------|-------------|
| remote.command | **X** | IRCC command/name for choosen target
| remote.target | **X** | Apple remote target. | | `ARROW_DOWN`, `ARROW_LEFT`, `ARROW_RIGHT`, `ARROW_UP`, `BACK`, `EXIT`, `FAST_FORWARD`, `INFORMATION`, `NEXT_TRACK`, `PAUSE`, `PLAY`, `PREVIOUS_TRACK`, `REWIND`, `SELECT`, `SETTINGS`, `STOP`, `VOLUME_DOWN`, `VOLUME_UP`

 ## Options TV Display Order
 
| **Attributes** | **Required** | **Usage** | **Default** | **Options** |
|----------------|--------------|-----------|-------------|-------------|
| displayOrder |  | Array of catagories to sort inputs | `["apps", "channels", "commands", "inputs", "macros"]` | `apps`, `channels`, `commands`, `inputs`, `macros`

## Supported clients

This plugin has been verified to work with the following apps on iOS 14:

* iOS 14
* Apple Home
* Homebridge v1.3.0+


## Contributing

You can contribute to this homebridge plugin in following ways:

- [Report issues](https://github.com/SeydX/homebridge-bravia-tvos/issues) and help verify fixes as they are checked in.
- Review the [source code changes](https://github.com/SeydX/homebridge-bravia-tvos/pulls).
- Contribute bug fixes.
- Contribute changes to extend the capabilities

Pull requests are accepted.


## Troubleshooting

If you have any issues with the plugin or TV services then you can run homebridge in debug mode, which will provide some additional information. This might be useful for debugging issues. Just enable ``"debug"`` in your config and restart homebridge.

## Disclaimer

All product and company names are trademarks™ or registered® trademarks of their respective holders. Use of them does not imply any affiliation with or endorsement by them.
