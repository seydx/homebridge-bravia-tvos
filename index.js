/**
 * v4.0
 *
 * @url https://github.com/SeydX/homebridge-bravia-tvos
 * @author SeydX <seyd55@outlook.de>
 *
**/

'use strict';

module.exports = function (homebridge) {
  let BraviaOSPlatform = require('./src/platform.js')(homebridge);
  homebridge.registerPlatform('homebridge-bravia-tvos', 'BraviaOSPlatform', BraviaOSPlatform, true);
};