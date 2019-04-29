'use strict';

const packageFile = require('../package.json');
const LogUtil = require('../lib/LogUtil.js');
const Bravia = require('../lib/Bravia.js');
const debug = require('debug')('BraviaPlatform');

//Accessory
const Device = require('./accessory.js');
const Speaker = require('./speaker_accessory.js');

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
  this._devices = new Map();
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
  
    if(!this.config.tvs.length){
    
      this._addOrRemoveDevice();
      
    } else {
    
      this._confTVs();

    }
  
  },
  
  _confTVs: function(){
  
    this.config.tvs.map( tv => {
      this._devices.set(tv.name, tv);
    
      if(tv.customSpeaker)
        this._devices.set(tv.name + ' Speaker', tv);
    
    });
    
    this.config.tvs.map( tv => {
    
      this._addOrRemoveDevice(tv);
    
      if(tv.customSpeaker){
        tv.name = tv.name + ' Speaker';
        this._addOrRemoveDevice(tv);
      }
      
    });
    
  },

  _addOrRemoveDevice: function(object) {
  
    this.accessories.map( accessory => {

      if(!this._devices.has(accessory.displayName)){

        this._accessories.delete(accessory.displayName);
        this.removeAccessory(accessory);

      }
      
    });

    
    if(object){
    
      const accessory = this._accessories.get(object.name);

      if(!accessory){

        this._accessories.set(object.name, object);
        this.addAccessory(object);

      }
    
    }

  },
  
  addAccessory: function(object){
    
    let external = this.accessories.length;

    if(!external||object.name.includes('Speaker')){
      this.logger.info('Adding new accessory: ' + object.name);
    } else {
      if(!object.name.includes('Speaker'))
        this.debug('[Bravia Debug]: Adding new accessory: ' + object.name);
    }
    
    let catagory;
    
    if(object.name.includes('Speaker')){
      switch(object.speakerType){
      
        case 'lightbulb':
          catagory = 5;
          break;
          
        case 'switch':
          catagory = 8;
          break;
          
        case 'speaker':
          catagory = 26;
          break;
          
        default:
          object.speakerType = 'speaker';
          catagory = 26;
      
      }
    } else {
      catagory = 31;
    }
    
    let uuid = UUIDGen.generate(object.name);
    let accessory = new Accessory(object.name, uuid, catagory);

    accessory.context = {};
    
    this.accessories.push(accessory);

    this._addOrConfigure(accessory, object, true, external);

  },
  
  _addOrConfigure: function(accessory, object, add, external){

    this._refreshContext(accessory, object, add);    
    this._AccessoryInformation(accessory);

    this.config.tvs.map( tv => {
      if((tv.name === accessory.displayName||(tv.name + ' Speaker' === accessory.displayName && accessory.context.customSpeaker)) && tv.ip){
        if(!add) this.logger.info('Configuring accessory ' + accessory.displayName);
        
        if(accessory.displayName.includes('Speaker')){
          new Speaker(this, accessory, add);
        } else {
          new Device(this, accessory, add, external);
        }
      } else {
        if(!tv.ip) this.logger.warn('No IP defined in config.json for ' + accessory.displayName + '. Skipping...');
      }
    });

  },
  
  _refreshContext: function(accessory, object, add){
  
    accessory.reachable = true;
    accessory.context.interval = this.config.interval;
  
    if(add){ 

      accessory.context.name = object.name;
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
      accessory.context.customSpeaker = object.customSpeaker || false;
      accessory.context.speakerType = object.speakerType || false;
      accessory.context.Bravia = object.Bravia;
      
      if(!object.name.includes('Speaker'))
        accessory.context.Bravia = new Bravia(this, object);
    
    } else {
    
      this.config.tvs.map( tv => {
    
        if(accessory.displayName === tv.name || accessory.displayName === tv.name + ' Speaker'){
    
          accessory.context.name = accessory.displayName.includes('Speaker') ? tv.name + ' Speaker' : tv.name;
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
          accessory.context.customSpeaker = tv.customSpeaker || false;
          accessory.context.speakerType = tv.speakerType || false;
          
          if(accessory.displayName === tv.name)
            accessory.context.Bravia = new Bravia(this, tv);
    
        }
    
      });

    }
    
  },
  
  _AccessoryInformation: function(accessory){

    let serial = accessory.displayName.includes('Speaker') ? 'S-' + accessory.context.ip.replace(/\./g, '') : accessory.context.ip.replace(/\./g, '');
  
    accessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Name, accessory.displayName)
      .setCharacteristic(Characteristic.Identify, accessory.displayName)
      .setCharacteristic(Characteristic.Manufacturer, 'SeydX')
      .setCharacteristic(Characteristic.Model, 'Sony')
      .setCharacteristic(Characteristic.SerialNumber, serial)
      .setCharacteristic(Characteristic.FirmwareRevision, packageFile.version);
  
  },

  configureAccessory: function(accessory){

    this._accessories.set(accessory.displayName, accessory);  
    
    this.accessories.push(accessory);
    this._addOrConfigure(accessory);
  
  },

  removeAccessory: function (accessory) {
    if (accessory) {

      this.logger.warn('Removing accessory: ' + accessory.displayName + '. No longer configured.');

      let newAccessories = this.accessories.map( acc => {
        if(acc.displayName !== accessory.displayName){
          return acc;
        }
      });

      let filteredAccessories = newAccessories.filter(function (el) {
        return el != null;
      });

      this.api.unregisterPlatformAccessories(pluginName, platformName, [accessory]); 

      this.accessories = filteredAccessories;

    }
  }

};
