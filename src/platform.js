'use strict';

const Logger = require('./helper/logger.js');
const packageFile = require('../package.json');

const Bravia = require('@seydx/bravia');

//Accessories
const TVAccessory = require('./accessories/tv.js');
const SpeakerAccessory = require('./accessories/speaker.js');

const PLUGIN_NAME = 'homebridge-bravia-tvos';
const PLATFORM_NAME = 'BraviaOSPlatform';

var Accessory, UUIDGen;

module.exports = function (homebridge) {

  Accessory = homebridge.platformAccessory;
  UUIDGen = homebridge.hap.uuid;
  
  return BraviaOSPlatform;

};

function BraviaOSPlatform (log, config, api) {
  
  if (!api||!config) 
    return;

  Logger.init(log, config.debug);

  this.api = api;
  this.accessories = [];
  this.config = config;
  
  this.polling = config.polling && config.polling >= 10 ? config.polling * 1000 : 10000;
  
  this.devices = new Map();
  
  this.validIP = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  this.validMAC = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/;
    
  if(this.config.tvs && this.config.tvs.length) {
  
    this.config.tvs.forEach(tv => {
    
      let error = false;

      if (!tv.name) {
        Logger.warn('One of the tv has no name configured. This tv will be skipped.');
        error = true;
      } else if (!tv.ip || !this.validIP.test(tv.ip)) {
        Logger.warn('There is no valid ip configured for this tv. This tv will be skipped.', tv.name);
        error = true;
      } else if (!tv.psk && (!tv.appName || !tv.appUUID)) {
        Logger.warn('There is no psk or application name/uuid configured for this tv. This tv will be skipped.', tv.name);
        error = true;
      }

      if (!error) {
      
        const uuid = UUIDGen.generate(tv.name);
      
        if (this.devices.has(uuid)) {
     
          Logger.warn('Multiple devices are configured with this name. Duplicate tv will be skipped.', tv.name);
     
        } else {  
      
          let options = {
            host: tv.ip,
            mac: this.validMAC.test(tv.mac) ? tv.mac : false,
            port: tv.port || 80,
            psk: tv.psk,
            name: tv.appName,
            uuid: tv.appUUID,
            timeout: tv.timeout && tv.timeout < 5 ? 5000 : tv.timeout * 1000
          };
       
          tv.bravia = new Bravia(options);

          let validCatagories = ['apps', 'channels', 'commands', 'inputs'];
          
          let addedCatagories = [];
          tv.displayOrder = tv.displayOrder || [];
          tv.displayOrder = tv.displayOrder.map(catagory => {
            if(validCatagories.includes(catagory) && !addedCatagories.includes(catagory) && addedCatagories.length <= 4){
              addedCatagories.push(catagory);
              return catagory;
            }
          }).filter(catagory => catagory);
          
          if(tv.displayOrder.length < 4){
            validCatagories.forEach(catagory => {
              if(!tv.displayOrder.includes(catagory))
                tv.displayOrder.push(catagory); 
            });
          }
          
          tv.remote = {
            REWIND: 'AAAAAgAAAJcAAAAbAw==',
            FAST_FORWARD: 'AAAAAgAAAJcAAAAcAw==',
            NEXT_TRACK: 'AAAAAgAAAJcAAAA9Aw==',
            PREVIOUS_TRACK: 'AAAAAgAAAJcAAAA8Aw==',
            ARROW_UP: 'AAAAAQAAAAEAAAB0Aw==',
            ARROW_DOWN: 'AAAAAQAAAAEAAAB1Aw==',
            ARROW_LEFT: 'AAAAAQAAAAEAAAA0Aw==',
            ARROW_RIGHT: 'AAAAAQAAAAEAAAAzAw==',
            SELECT: 'AAAAAQAAAAEAAABlAw==',
            BACK: 'AAAAAgAAAJcAAAAjAw==',
            EXIT: 'AAAAAQAAAAEAAABjAw==',
            PLAY: 'AAAAAgAAAJcAAAAaAw==',
            PAUSE: 'AAAAAgAAAJcAAAAZAw==',
            INFORMATION: 'AAAAAQAAAAEAAAA6Aw==',
            VOLUME_UP: 'AAAAAQAAAAEAAAASAw==',
            VOLUME_DOWN: 'AAAAAQAAAAEAAAATAw==',
            SETTINGS: 'AAAAAgAAAJcAAAA2Aw=='
          };
          
          if(config.remote && config.remote.length){
            config.remote.forEach(cmd => {
              if(tv.remote[cmd.target] && /^[A]{5}[a-zA-Z0-9]{13}[\=]{2}$/.test(cmd.command))
                tv.remote[cmd.target] = cmd.command;
            });
          }
          
          let speakerConfig;
          
          if(tv.speaker){
          
            let validTypes = ['speaker', 'lightbulb', 'switch'];
          
            speakerConfig = {
              output: tv.speaker.output || 'speaker',
              minVolume: tv.speaker.minVolume || 0,
              maxVolue: tv.speaker.maxVolume || 100,
              increaseBy: tv.speaker.increaseBy && tv.speaker.increaseBy <= 5 ? tv.speaker.increaseBy : 1,
              reduceBy: tv.speaker.reduceBy && tv.speaker.reduceBy <= 5 ? tv.speaker.reduceBy : 1
            };
            
            if(validTypes.includes(tv.speaker.accType)){
            
              let speaker = {
                name: tv.name + ' Speaker',
                type: 'speaker',
                subtype: tv.speaker.accType,
                speaker: speakerConfig,
                remote: tv.remote,
                bravia: tv.bravia
              };
              
              const uuidSpeaker = UUIDGen.generate(speaker.name);
            
              this.devices.set(uuidSpeaker, speaker);
            
            }
          
          } else {
          
            speakerConfig = {
              output: 'speaker',
              minVolume: 0,
              maxVolue: 100,
              increaseBy: 1,
              reduceBy: 1
            };
          
          }
          
          tv.apps = tv.apps && tv.apps.length ? tv.apps : [];
          tv.channels = tv.channels && tv.channels.length ? tv.channels : [];
          tv.commands = tv.commands && tv.commands.length ? tv.commands : [];
          tv.inputs = tv.inputs && tv.inputs.length ? tv.inputs : [];
          tv.mac = this.validMAC.test(tv.mac) ? tv.mac : false;
          
          tv.type = 'tv';
          tv.speaker = speakerConfig;
          
          this.devices.set(uuid, tv);
          
        }
    
      }
      
    });
    
  }

  this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
  
}

BraviaOSPlatform.prototype = {

  didFinishLaunching: function(){

    for (const entry of this.devices.entries()) {
    
      let uuid = entry[0];
      let device = entry[1];
      
      const cachedAccessory = this.accessories.find(curAcc => curAcc.UUID === uuid);
      
      if (!cachedAccessory) {
      
        const accessory = new Accessory(device.name, uuid);

        Logger.info('Configuring accessory...', accessory.displayName);
        this.setupAccessory(accessory, device);
        
        if(device.type === 'tv'){   
          this.api.publishExternalAccessories(PLUGIN_NAME, [accessory]);
        } else {
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
        
        this.accessories.push(accessory);
        
      }
      
    }

    this.accessories.forEach(accessory => {
    
      const tv = this.devices.get(accessory.UUID);
      
      try {
      
        if (!tv)
          this.removeAccessory(accessory);
    
      } catch(err) {

        Logger.info('It looks like the tv has already been removed. Skip removing.');
        Logger.debug(err);
     
      }
      
    });
  
  },
  
  setupAccessory: async function(accessory, device){
    
    accessory.on('identify', () => {
      Logger.info('Identify requested.', accessory.displayName);
    });

    const AccessoryInformation = accessory.getService(this.api.hap.Service.AccessoryInformation);
    
    const manufacturer = device.manufacturer && device.manufacturer !== '' ? device.manufacturer : 'Sony';
    const model = device.model && device.model !== '' ? device.model : device.type;
    const serialNumber = device.serialNumber && device.serialNumber !== '' ? device.serialNumber : 'Homebridge';
    
    if (AccessoryInformation) {
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.Manufacturer, manufacturer);
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.Model, model);
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.SerialNumber, serialNumber);
      AccessoryInformation.setCharacteristic(this.api.hap.Characteristic.FirmwareRevision, packageFile.version);
    }
    
    let bravia = device.bravia;
    
    delete device.bravia;
    
    accessory.context.config = device;
    accessory.context.polling = this.polling;
    
    switch (device.type) {
      case 'tv':
        new TVAccessory(this.api, accessory, this.accessories, bravia);
        break;
      case 'speaker':
        new SpeakerAccessory(this.api, accessory, this.accessories, bravia);
        break;
      default:
        // fall through
        break;
    }

  },

  configureAccessory: async function(accessory){

    const device = this.devices.get(accessory.UUID);

    if (device){
      Logger.info('Configuring accessory...', accessory.displayName);                                                                                            
      this.setupAccessory(accessory, device);
    }
    
    this.accessories.push(accessory);
  
  },
  
  removeAccessory: function(accessory) {
  
    Logger.info('Removing accessory...', accessory.displayName);
    
    let accessories = this.accessories.map( cachedAccessory => {
      if(cachedAccessory.displayName !== accessory.displayName){
        return cachedAccessory;
      }
    });
    
    this.accessories = accessories.filter(function (el) {
      return el != null;
    });

    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  
  }

};