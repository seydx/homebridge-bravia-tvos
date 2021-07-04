# Changelog

# v5.0.0 - 2021-07-04
I am happy to present you version 5 of homebridge-bravia-tvos. The plugin has been redesigned from scratch, offers a new config UI and works much faster than v4. However, most of the changes have been done in the backend to make the plugin even more stable.

Unfortunately some changes had to be made in config.json to improve readability and adapt it to the new version. For this reason I recommend you to delete the TV from your config.json and then reconfigure it via homebridge-config-ui-x. And please take a look at the [example-config.json](https://github.com/SeydX/homebridge-bravia-tvos/blob/master/example-config.json) (If you enter the same name as before as TV name, the TV does not have to be removed from HomeKit).

Have fun with version 5

_- seydx_

---

## Breaking Changes
- **Homebridge**
  - Dropped support for homebridge below v1.3.0
- **Config**
  - **Televisions**
    - Added `active` key to `tvs` to enable/disable the tv without removing it from config. Warning: Default value for active is **false**, this means, that if you DON'T adjust your config.json and add `"active": true` to the tv, the tv will be removed/not exposed from/to HomeKit!
    - Refactored `apps`
    - Refactored `channels`
    - Refactored `commands`
    - Refactored `inputs`
  - **Speaker**
    - Added `active` key to `tvs.speaker` to enable/disable the speaker without removing it from config. Warning: Default value for active is **false**, this means, that if you DON'T adjust your config.json and add `"active": true` to the speaker, the speaker will be removed/not exposed from/to HomeKit!
    - The `Speaker` Accessory will no longer be exposed as an additional accessory in HomeKit. Instead, it now appears as an additional service in the TV.
    - The accessory type `speaker` was removed

## Notable Changes
- **Homebridge UI**
  - The config ui was completely rewritten in `@vue` for a better user experience

## Other Changes
- The code has been refactored (again)
- The backend module `@seydx/bravia` was completely rewritten
- Adjusted config.schema.json to reflect the changes mentioned above
- Bug fixes
- Updated dependencies

## v4.1.12 - 2021-05-20
- Fix [#127](https://github.com/SeydX/homebridge-bravia-tvos/issues/127)

## v4.1.11 - 2021-05-19
- Minor improvements & bugfixes
- Bump dependencies

## v4.1.10 - 2021-03-14
- Bump deps
- Bugfix

## v4.1.9 - 2021-03-14
- Bugfixes

## v4.1.8 - 2020-12-06
- Bump bravia module

## v4.1.7 - 2020-12-06
- Added more channel types
- Added new function to save tvs in cache*

*It is now possible to change the tv or inputs name and visibility state from inputs without losing the data on next restart!

## v4.1.6 - 2020-12-01
- Bump dependencies

## v4.1.5 - 2020-11-27
- Fixed incorrect channels, again...
- Added random string to input subtypes to avoid inputs with same subtype

## v4.1.4 - 2020-11-27
- Fixed incorrect channels
- Updated deps

## v4.1.3 - 2020-11-23
- Bugfix macros if not defined

## v4.1.2 - 2020-11-23
- Added new inputs types: Macros
- Bump bravia dependency
- Bugfixes

## v4.1.1 - 2020-11-22
- Bugfix: Added plugin ui utils as dependency

## v4.1.0 - 2020-11-22
- Config UI X - Custom UI Support
- Bugfixes

## v4.0.9 - 2020-11-16
- Bugfixes
- Changed PIN method from token to appName/appUUID

**NOTE:**

If you are using this plugin with token (PIN), you need to generate new credentials through the "pair" command.
Read here: https://github.com/SeydX/homebridge-bravia-tvos#token-pin-authentication-prefered

## v4.0.8 - 2020-11-10
- Added new DisplayOrder function to manually rearrange the order of inputs
- Added CurrentVisibilityState & TargetVisibilityState to hide/show inputs from Apple Home
- Fixed target channel uri
- Better error handling
- Better debug

## v4.0.7 - 2020-11-10
- fixed getCurrentExternalInputsStatus

## v4.0.6 - 2020-11-10
- Removed unnecessary deps
- Updated bravia dep (need for debug)

## v4.0.5 - 2020-11-09
- Added new option to turn on TV over WOL

## v4.0.4 - 2020-11-09
- Fixed fetching inputs

## v4.0.3 - 2020-11-09
- Partial support for non android TVs

## v4.0.2 - 2020-11-08
- Fix volume up

## v4.0.1 - 2020-11-08
- Fix apple remote volume

## v4.0.0 - 2020-11-06
- Refactored code
- BETTER: Authetication flow
- BETTER: Reduced cpu/ram usage
- BETTER: Detection for tv inputs
- NEW: IRCC commands as inputs
- NEW: Config UI X support
- NEW: Speaker types (switch, lightbulb, speaker)
- NEW: Customizable Apple Remote Commands
- Bugfixes

**BRAKING CHANGES:** If you use v3 of this plugin, please remove the added TV from Homekit/Homebridge before updating! Otherwise you have to reset Homebridge!

## v3.0.5 - 2019-05-01
- Bugfixes
- Use input label when defined [(#47)](https://github.com/SeydX/homebridge-bravia-tvos/pull/47)

## v3.0.3 - 2019-04-30
- Bugfixes
- Debugging improvements

## v3.0.2
- Debugging improvements

## v3.0.1
- Bugfixes

## v3.0
- Completely rewritten code
- Faster
- Bugfixes and Improvements
- Better communication
- More memory efficient
- Designed for iOS 12.2
- Debug mode

## v2.0
- Dynamic Platform Plugin
- Bugfixes
- Performance improvements
- Ability to add multiple TVs
- Designed for iOS 12.1 and lower

## v1.0
- Init release
