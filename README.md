<p align="center">
    <img src="https://i.imgur.com/xnQyZaU.png" height="200">
</p>


# Bravia!TVOS 3.0

[![npm](https://img.shields.io/npm/v/homebridge-bravia-tvos.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-bravia-tvos)
[![npm](https://img.shields.io/npm/dt/homebridge-bravia-tvos.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-bravia-tvos)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-bravia-tvos.svg?style=flat-square)](https://github.com/SeydX/homebridge-bravia-tvos)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square&maxAge=2592000)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=NP4T3KASWQLD8)

**Creating and maintaining Homebridge plugins consume a lot of time and effort, if you would like to share your appreciation, feel free to "Star" or donate.**

<img src="https://github.com/SeydX/homebridge-bravia-tvos/blob/master/images/homekit_overview.GIF" align="right" alt="HomeKit Overview" width="270px" height="541px">

This is a plugin for [Homebridge](https://github.com/nfarina/homebridge) to control your **Sony Bravia Android TV**. 

This plugin supports following functions:

- **Power Switch** (on/off)
- **Inputs** like HDMI, Scart, CEC Devices, AV, WIFI, DVB:T, DVB:C etc.
- **Apps** like YouTube, Prime Video etc.
- **Channels:** Your favourite channels as inputs.
- **Remote control:** native iOS Remote control
- **Login** with PSK or without PSK (for older models)
- **WOL** support Wake on Lan

## Installation instructions

After [Homebridge](https://github.com/nfarina/homebridge) has been installed:

-  ```sudo npm i -g homebridge-bravia-tvos@latest```

## Preparing the TV (PSK)

- Set **Remote start** to **ON** _(Settings -> Network -> Remote Start)_
- Change **Authentication** to **Normal and Pre-Shared Key** _(Settings -> Network -> IP Control -> Authentication)_
- Enter a **Pre-Shared Key** _(Settings -> Network -> IP control -> Pre-Shared Key)_


## Preparing the TV (without PSK)

- Set **Remote start** to **ON** _(Settings -> Network -> Remote Start)_
- Change **Authentication** to **Normal** _(Settings -> Network -> IP Control -> Authentication)_


## Basic configuration

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
      "platform": "BraviaOSPlatform",
      "tvs": [
        {
          "name": "Sony Lounge",
          "ip": "192.168.178.3",
          "port": 80,
          "psk": "lipsum555"
        }
      ],
      "interval": 10
    }
 ]
}

 ```
 See [Example Config](https://github.com/SeydX/homebridge-bravia-tvos/blob/master/example-config.json) for more details.

 
 ## Options

| **Attributes** | **Required** | **Usage** |
|------------|----------|-------|
| name | **Yes** | **Unique Name** for the TV Accessory.   |
| ip | **Yes** | IP adress from your Sony Bravia Android TV |
| mac | **No** | MAC address from TV (required if using WOL!) |
| port | **No** | If you have problems with connecting to the TV, try a different port _(Default: 80)_ |
| psk | **No** | Your PRE SHARED KEY _(see preparing the TV above)_ |
| extraInputs | **No** | Inputs for "Scart, Composite, Wifidisplay" _(Default: false)_ |
| cecInputs | **No** | Inputs for connected cec devices like Apple TV _(Default: false)_ |
| channelInputs | **No** | An Array of Channel input types (DVBT/DVBC/DVBS/ANALOG) _(Default: false)_ |
| channels | **No** | List of your favourite channels (channel numbers from tv and source) to display these as inputs in the TV accessory _(Default: false)_ |
| apps | **No** | List of your favourite apps to display as inputs in the TV accessory  _(Default: false)_ |
| wol | **No** | Wake On Lan  _(Default: false)_ |
| customSpeaker | **No** | If true, an extra speaker accessory will be published to HomeKit  _(Default: false)_ |
| speakerType | **No** | Type of the custom speaker (switch, lightbulb, speaker) _(Default: speaker)_ |
| interval | **No** | Polling interval in seconds _(Default: 10s)_ |


## Multiple TVs

If you have added multiple TVs to homebridge via this plugin, please note that all TVs except the first one will be published as "external accessories" ! That means, you need to add this TVs manually to HomeKit. It will be not exposed via the bridge. This is necessary due to handling of the TVs via Apple


## Supported clients

This plugin has been verified to work with the following apps on iOS 12.2:

* iOS 12.2
* Apple Home _(partial)_
* Homebridge v0.4.46

(All 3rd party apps like Elgato Eve etc are not supported at this time. Apple is blocking 3th party apps from accessing the TV accessory)


## Contributing

You can contribute to this homebridge plugin in following ways:

- [Report issues](https://github.com/SeydX/homebridge-bravia-tvos/issues) and help verify fixes as they are checked in.
- Review the [source code changes](https://github.com/SeydX/homebridge-bravia-tvos/pulls).
- Contribute bug fixes.
- Contribute changes to extend the capabilities

Pull requests are accepted.


## Troubleshooting

If you have any issues with the plugin or TV services then you can run homebridge in debug mode, which will provide some additional information. This might be useful for debugging issues.

***HomeBridge with debug mode:*** ```DEBUG=BraviaPlatform,BraviaPlatformApi``` and ```homebridge -D ```
