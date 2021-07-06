'use strict';

const logger = require('./utils/logger');
const { version } = require('../package.json');
const { generateConfig } = require('./utils/utils');

//Accessories
const { AccessorySetup, TelevisionAccessory } = require('./accessories/accessory');

const PLUGIN_NAME = 'homebridge-bravia-tvos';
const PLATFORM_NAME = 'BraviaOSPlatform';

var Accessory;

module.exports = (homebridge) => {
  Accessory = homebridge.platformAccessory;
  return BraviaOSPlatform;
};

function BraviaOSPlatform(log, config, api) {
  if (!api || !config) {
    return;
  }

  logger.configure(log, config);

  this.api = api;
  this.accessories = [];
  this.config = generateConfig(config);
  this.devices = new Map();

  this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
}

BraviaOSPlatform.prototype = {
  didFinishLaunching: async function () {
    //initialize devices
    await AccessorySetup(this.devices, this.config.tvs, this.api.user.storagePath());

    //publish devices
    for (const [uuid, device] of this.devices.entries()) {
      logger.info('Configuring new accessory...', device.name);

      const accessory = new Accessory(device.name, uuid);
      accessory.category = this.api.hap.Categories.TELEVISION;

      this.setupAccessory(accessory, device);
      this.api.publishExternalAccessories(PLUGIN_NAME, [accessory]);

      this.accessories.push(accessory);
    }
  },

  setupAccessory: async function (accessory, device) {
    accessory.on('identify', () => logger.info('Identify requested.', accessory.displayName));

    accessory
      .getService(this.api.hap.Service.AccessoryInformation)
      .setCharacteristic(this.api.hap.Characteristic.Manufacturer, device.manufacturer)
      .setCharacteristic(this.api.hap.Characteristic.Model, device.model)
      .setCharacteristic(this.api.hap.Characteristic.SerialNumber, device.serialNumber)
      .setCharacteristic(this.api.hap.Characteristic.FirmwareRevision, version);

    const bravia = device.bravia;
    delete device.bravia;

    accessory.context.busy = false;
    accessory.context.config = device;

    new TelevisionAccessory(this.api, accessory, bravia);
  },

  //not used for external accessories
  configureAccessory: function (accessory) {
    this.accessories.push(accessory);
  },

  //not used for external accessories
  removeAccessory: function (accessory) {
    logger.info('Removing accessory...', `${accessory.displayName} (${accessory.context.config.subtype})`);
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

    this.accessories = this.accessories.filter(
      (cachedAccessory) => cachedAccessory.displayName !== accessory.displayName
    );
  },
};
