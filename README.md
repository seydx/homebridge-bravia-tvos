<p align="center">
    <img src="https://i.imgur.com/xnQyZaU.png" height="200">
</p>


# Homebridge Bravia TvOS v3.0 (beta)

[![npm](https://img.shields.io/npm/v/homebridge-bravia-tvos.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-bravia-tvos)
[![npm](https://img.shields.io/npm/dt/homebridge-bravia-tvos.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-bravia-tvos)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-bravia-tvos.svg?style=flat-square)](https://github.com/SeydX/homebridge-bravia-tvos)

<img src="https://github.com/SeydX/homebridge-bravia-tvos/blob/master/images/homekit_overview.GIF" align="right" alt="HomeKit Overview" width="270px" height="541px">

This is a plugin for [Homebridge](https://github.com/nfarina/homebridge) to control your **Sony Bravia Android TV**. 

This plugin supports following functions:

- **Power Switch** (on/off)
- **Inputs** like HDMI, Scart, CEC Devices, AV, WIFI, DVB:T, DVB:C etc.
- **Apps** like YouTube, Prime Video etc.
- **Channels:** Your favourite channels as inputs.
- **Remote control:** native iOS Remote control

## Installation instructions

After [Homebridge](https://github.com/nfarina/homebridge) has been installed:

-  ```npm i -g --save SeydX/homebridge-bravia-tvos#beta```

## Preparing the TV

- Set **Remote start** to **ON** _(Settings -> Network -> Remote Start)_
- Change **Authentication** to **Normal and Pre-Shared Key** _(Settings -> Network -> IP Control -> Authentication)_
- Enter a **Pre-Shared Key** _(Settings -> Network -> IP control -> Pre-Shared Key)_

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
 
 ## Options

| **Attributes** | **Required** | **Usage** |
|------------|----------|-------|
| name | **Yes** | **Unique Name** for the TV Accessory.   |
| ip | **Yes** | IP adress from your Sony Bravia Android TV |
| mac | **No** | MAC address from TV (required if using WOL!) |
| port | No | If you have problems with connecting to the TV, try a different port _(Default: 80)_ |
| psk | **Yes** | Your PRE SHARED KEY _(see preparing the TV above)_ |
| extraInputs | **No** | Inputs for "Scart, Composite, Wifidisplay" _(Default: false)_ |
| cecInputs | **No** | Inputs for connected cec devices like Apple TV _(Default: false)_ |
| channelSource | **No** | Channel input type (DVBT/DVBC) _(Default: false)_ |
| channels | **No** | List of your favourite channels (channel numbers from tv) to display these as inputs in the TV accessory _(Default: false)_ |
| apps | **No** | List of your favourite apps to display as inputs in the TV accessory  _(Default: false)_ |
| wol | **No** | Wake On Lan  _(Default: false)_ |
| interval | **No** | Polling interval in seconds _(Default: 10s)_ |


## Supported clients

This plugin has been verified to work with the following apps on iOS 12.2:

* iOS 12.2
* Apple Home _(partial)_
* All 3rd party apps like Elgato Eve etc. _(recommended)_
* Homebridge v0.4.46


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
