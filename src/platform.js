'use strict';

const packageFile = require('../package.json');
const LogUtil = require('../lib/LogUtil.js');
const debug = require('debug')('BraviaPlatform');

//Accessory
const Device = require('./accessory.js');

const pluginName = 'homebridge-bravia-tvos';
const platformName = 'BraviaOSPlatform';

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {

  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  
  return BraviaOSPlatform;
};

function BraviaOSPlatform (log, config, api) {
  if (!api || !config) return;

  // HB
  this.log = log;
  this.logger = new LogUtil(null, log);
  this.debug = debug;
  this.accessories = [];
  this._accessories = new Map();
  this.config = config;
  
  this.config.interval = this.config.interval * 1000||10000;
  this.config.tvs = Array.isArray(this.config.tvs) ? this.config.tvs : [];

  if (api) {
  
    if (api.version < 2.2) {
      throw new Error('Unexpected API version. Please update your homebridge!');
    }
    
    this.log('**************************************************************');
    this.log('BraviaOSPlatform v'+packageFile.version+' by SeydX');
    this.log('GitHub: https://github.com/SeydX/homebridge-bravia-tvos');
    this.log('Email: seyd55@outlook.de');
    this.log('**************************************************************');
    this.log('start success...');
    
    this.api = api;
      
    this.api.on('didFinishLaunching', this._initPlatform.bind(this));
  }
}

BraviaOSPlatform.prototype = {

  _initPlatform: function(){
  
    this._devices = new Map();
  
    this.config.tvs.map( tv => this._devices.set(tv.name, tv));
    this.config.tvs.map( tv => this._addOrRemoveDevice(tv));
    
    if(!this.config.tvs.length)
      this._addOrRemoveDevice();
  
  },

  _addOrRemoveDevice: function(object) {
  
    this.accessories.map( accessory => {

      if(!this._devices.has(accessory.displayName)){

        this._accessories.delete(accessory.displayName);
        this.removeAccessory(accessory);

      }
      
    });

    
    if(object){
    
      const tv_accessory = this._accessories.get(object.name);

      if(!tv_accessory){

        this._accessories.set(object.name, object);

        this.addAccessory(object);

      }
    
    }

  },
  
  addAccessory: function(object){

    let external = this.accessories.length;

    if(!external){
      this.logger.info('Adding new accessory: ' + object.name);
    } else {
      this.debug('[Bravia Debug]: Adding new accessory: ' + object.name);
    }

    let uuid = UUIDGen.generate(object.name);
    let accessory = new Accessory(object.name, uuid, 31);

    accessory.context = {};

    this._addOrConfigure(accessory, object, true, external);

  },
  
  _addOrConfigure: function(accessory, object, add, external){
    
    this.config.tvs.map( tv => {
      if(tv.name === accessory.displayName && tv.ip && tv.psk){
        if(!add) this.logger.info('Configuring accessory ' + accessory.displayName);
        
        this._refreshContext(accessory, object, add);    
        this._AccessoryInformation(accessory);
        
        new Device(this, accessory, add, external);
      } else {

        if(!tv.ip) this.logger.warn('No IP defined in config.json for ' + tv.name + '. Skipping...');
        if(!tv.psk) this.logger.warn('No PSK defined in config.json for ' + tv.name + '. Skipping...');

      }
    });

  },
  
  _refreshContext: function(accessory, object, add){
  
    accessory.reachable = true;
    accessory.context.interval = this.config.interval;
  
    if(add){ 

      accessory.context.ip = object.ip;
      accessory.context.mac = object.mac;
      accessory.context.port = object.port || 80;
      accessory.context.psk = object.psk;
      accessory.context.extraInputs = object.extraInputs || false;
      accessory.context.cecInputs = object.cecInputs || false;
      accessory.context.channelInputs = object.channelInputs || [];
      accessory.context.channels = object.channels || [];
      accessory.context.apps = object.apps || [];
      accessory.context.commands = object.commands || [];
      accessory.context.wol = object.wol || false;
    
    } else {
    
      this.config.tvs.map( tv => {
    
        if(accessory.displayName === tv.name){
    
          accessory.context.ip = tv.ip;
          accessory.context.mac = tv.mac;
          accessory.context.port = tv.port || 80;
          accessory.context.psk = tv.psk;
          accessory.context.extraInputs = tv.extraInputs || false;
          accessory.context.cecInputs = tv.cecInputs || false;
          accessory.context.channelInputs = tv.channelInputs || [];
          accessory.context.channels = tv.channels || [];
          accessory.context.apps = tv.apps || [];
          accessory.context.commands = tv.commands || [];
          accessory.context.wol = tv.wol || false;
    
        }
    
      });

    }
    
  },
  
  _AccessoryInformation: function(accessory){
  
    accessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Name, accessory.displayName)
      .setCharacteristic(Characteristic.Identify, accessory.displayName)
      .setCharacteristic(Characteristic.Manufacturer, 'SeydX')
      .setCharacteristic(Characteristic.Model, 'Sony')
      .setCharacteristic(Characteristic.SerialNumber, accessory.context.ip.replace(/\./g, ''))
      .setCharacteristic(Characteristic.FirmwareRevision, packageFile.version);
  
  },

  configureAccessory: function(accessory){

    this._accessories.set(accessory.displayName, accessory);  
    
    this.accessories.push(accessory);
    this._addOrConfigure(accessory, null, false);
  
  },

  removeAccessory: function(accessory){
    if (accessory) {
      this.log.warn('Removing accessory: ' + accessory.displayName + '. No longer configured.');
      this.api.unregisterPlatformAccessories(pluginName, platformName, [accessory]);
      delete this.accessories[accessory.displayName];
    }
  }

};
