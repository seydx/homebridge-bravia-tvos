# homebridge-bravia-tvos v2.0
Homebridge plugin for Sony Bravia Android TVs (HomeKit TV) only works with iOS 12.2/homebridge v0.4.46 and above

[![npm](https://img.shields.io/npm/v/homebridge-bravia-tvos.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-bravia-tvos)
[![npm](https://img.shields.io/npm/dt/homebridge-bravia-tvos.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-bravia-tvos)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-bravia-tvos.svg?style=flat-square)](https://github.com/SeydX/homebridge-bravia-tvos)

## Homebridge dynamic platform plugin for Sony Bravia Android TVs
>_Note: If you are looking for the non dynamic version, install this! [homebridge-sonybravia-platform v2](https://github.com/SeydX/homebridge-sonybravia-platform) OR if you are looking for the dynamic version, install this! [homebridge-bravia-tv v3](https://github.com/SeydX/homebridge-bravia-tv)_ 

<img src="https://github.com/SeydX/homebridge-bravia-tvos/blob/master/images/homekit_overview.GIF" align="right" alt="HomeKit Overview" width="270px" height="541px">

This is a plugin for [Homebridge](https://github.com/nfarina/homebridge) to control your **Sony Bravia Android TV**. 

This plugin supports following functions:

- **Power Switch** (on/off)
- **Inputs** like HDMI, Scart, CEC Devices, AV, WIFI, DVB:T, DVB:C etc.
- **Apps** like YouTube, Prime Video etc.
- **Volume Control** within Eve app i.e
- **Remote control:** native iOS Remote control

## Installation instructions

After [Homebridge](https://github.com/nfarina/homebridge) has been installed:

-  ```sudo npm install -g homebridge-bravia-tvos```

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
      "tvs": {
        "1": {
	         "name": "TV 1",
          "interval": 10,
          "ipadress": "192.168.1.1",
          "port": 80,
          "psk": "PSKHERE",
          "extraInputs": false,
          "cecInputs": true,
          "channelInputs": true,
          "favApps": [
            {
              "title":"SmartTV",
              "uri":"com.sony.dtv.eu.siptv.video.eu.siptv.atv.MainActivity"
            },
            {
              "title":"YouTube",
              "uri":"com.sony.dtv.com.google.android.youtube.tv.com.google.android.apps.youtube.tv.activity.ShellActivity"
            }
          ]
        },
        "2": {
	         "name": "TV 2",
          "interval": 10,
          "ipadress": "192.168.1.2",
          "port": 80,
          "psk": "PSKHERE",
          "extraInputs": false,
          "cecInputs": false,
          "channelInputs": false,
          "favApps": [
            {
              "title":"YouTube",
              "uri":"com.sony.dtv.com.google.android.youtube.tv.com.google.android.apps.youtube.tv.activity.ShellActivity"
            }
          ]
        },
      }
    }
 ]
}

 ```
 
 ## Options

| **Attributes** | **Required** | **Usage** |
|------------|----------|-------|
| name | **Yes** | **Unique Name** for the Accessory.   |
| ipadress | **Yes** | IP adress from your Sony Bravia Android TV |
| port | No | If you have problems with connecting to the TV, try a different port _(Default: 80)_ |
| psk | **Yes** | Your PRE SHARED KEY _(see preparing the TV above)_ |
| interval | **No** | Polling interval _(Default: 10s)_ |
| extraInputs | **No** | Inputs for "Scart, Composite, Wifidisplay" _(Default: false)_ |
| cecInputs | **No** | Inputs for connected cec devices like Apple TV _(Default: false)_ |
| channelInputs | **No** | Inputs for channel inputs like DVB:C / DVB:T etc _(Default: false)_ |
| favApps | **No** | List of your favourite apps to display as inputs in the TV accessory _(Default: false)_ |

## Howto get Apps (uri)

Open terminal and type following, for YouTube i.e.:

```
curl http://TVIPHERE/sony/appControl -H 'x-auth-psk: YOURPSKHERE' -d '{"id":3,"method":"getApplicationList","version":"1.0","params":["1.0"]}' | grep 'YouTube'
```


## Supported clients

This plugin has been verified to work with the following apps on iOS 12.2:

* iOS 12.2
* Apple Home _(partial)_
* All 3rd party apps like Elgato Eve etc. _(recommended)_
* Homebridge v0.4.46

## Known issues | TODO

- ~~TODO: More Inputs (DVB:C, DVB:T)~~
- ~~TODO: v2 (dynamic platform plugin)~~

## Changelog
v2.0:
Before update to v2.0 be aware to completely deinstall the old version of this plugin!!
- Dynamic Platform Plugin
- Bugfixes
- Performance improvements
- Ability to add multiple TVs


## Contributing

You can contribute to this homebridge plugin in following ways:

- [Report issues](https://github.com/SeydX/homebridge-bravia-tvos/issues) and help verify fixes as they are checked in.
- Review the [source code changes](https://github.com/SeydX/homebridge-bravia-tvos/pulls).
- Contribute bug fixes.
- Contribute changes to extend the capabilities

Pull requests are accepted.
