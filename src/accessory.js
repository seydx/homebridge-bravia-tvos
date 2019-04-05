'use strict';

const LogUtil = require('../lib/LogUtil.js');
const Bravia = require('../lib/Bravia.js');

const timeout = ms => new Promise(res => setTimeout(res, ms));

var Service, Characteristic;

class BraviaPlatform {
  constructor (platform, accessory) {

    // HB
    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;

    this.platform = platform;
    this.log = platform.log;
    this.logger = new LogUtil(null, platform.log);
    this.debug = platform.debug;
    this.api = platform.api;
    this.config = platform.config;
    this.accessories = platform.accessories;
    
    this.configPath = platform.api.user.storagePath();
    this.HBpath = platform.api.user.storagePath()+'/accessories';
    
    this.Bravia = new Bravia(accessory.context);

    this.getService(accessory);
  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  async getService (accessory) {
  
    const self = this;

    accessory.on('identify', function (paired, callback) {
      self.logger.info(accessory.displayName + ': Hi!');
      callback();
    });
    
    let service = accessory.getServiceByUUIDAndSubType(Service.Television, accessory.displayName);
    
    if(!service.getCharacteristic(Characteristic.ConfiguredName).value)
      service.setCharacteristic(Characteristic.ConfiguredName, accessory.displayName);
      
    service
      .setCharacteristic(
        Characteristic.SleepDiscoveryMode,
        Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE
      );
      
    service.getCharacteristic(Characteristic.ActiveIdentifier)
      .on('set', this.setInputState.bind(this, accessory, service));
      
    service.getCharacteristic(Characteristic.Active)
      .on('set', this.setPowerState.bind(this, accessory, service));
      
    if (!service.testCharacteristic(Characteristic.RemoteKey))
      service.addCharacteristic(Characteristic.RemoteKey);
      
    service.getCharacteristic(Characteristic.RemoteKey)
      .on('set', this.setRemote.bind(this, accessory, service));
      
    if (!service.testCharacteristic(Characteristic.PowerModeSelection))
      service.addCharacteristic(Characteristic.PowerModeSelection);
      
    service.getCharacteristic(Characteristic.PowerModeSelection)
      .on('set', this.setRemote.bind(this, accessory, service));
      
    service.getCharacteristic(Characteristic.PictureMode)
      .on('set', this.setRemote.bind(this, accessory, service));
    
    let speaker = accessory.getServiceByUUIDAndSubType(Service.TelevisionSpeaker, accessory.displayName + ' Speaker');  
      
    speaker
      .setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.ABSOLUTE);
      
    speaker.getCharacteristic(Characteristic.Mute)
      .on('set', this.setMute.bind(this, accessory, speaker));

    speaker.getCharacteristic(Characteristic.VolumeSelector)
      .on('set', this.setRemoteVolume.bind(this, accessory, speaker));

    if (!speaker.testCharacteristic(Characteristic.Volume))
      speaker.addCharacteristic(Characteristic.Volume);

    speaker.getCharacteristic(Characteristic.Volume)
      .on('set', this.setVolume.bind(this, accessory, speaker));
    
    service.addLinkedService(speaker);
    
    this._checkInputs(accessory,service);
    this.getPowerState(accessory,service);
    this.getSpeaker(accessory, service);

  }
  
  async getSpeaker(accessory,service){

  }
  
  async setMute(accessory, service, mute, callback){
 
    this.logger.info(accessory.displayName + ': Mute: ' + mute);
    callback();
  
  }
  
  async setRemoteVolume(accessory, service, value, callback){
 
    //0: Increment
    //1: Decrement
 
    let code = value ? 'AAAAAQAAAAEAAAATAw==' : 'AAAAAQAAAAEAAAASAw==';
 
    try {
  
      this.logger.info(accessory.displayName + ': Volume ' + (value ? 'down' : 'up'));
  
      await this.Bravia.setIRCC(code);
  
    } catch(err) {
  
      this.logger.error(accessory.displayName + ': Error while setting volume!');
      this.debug('[Bravia Debug]: ' + err);
  
    } finally {
  
      callback();
  
    }
  
  }
  
  async setVolume(accessory, service, value, callback){
 
    this.logger.info(accessory.displayName + ': Volume Value: ' + value);
    callback();
  
  }
  
  async getPowerState(accessory,service){
  
    try {
  
      let status = await this.Bravia.getPowerStatus();
  
      let state = status.status === 'active' ? true : false;
  
      service.getCharacteristic(Characteristic.Active).updateValue(state);
  
    } catch(err) {
  
      this.logger.error(accessory.displayName + ': Error while getting power state!'); 
      this.debug('[Bravia Debug]: ' + err);
  
    } finally {
  
      setTimeout(this.getPowerState.bind(this,accessory,service), accessory.context.interval);
  
    }
  
  }
  
  async setPowerState(accessory, service, state, callback){
  
    try {
	    
	  this.logger.info(accessory.displayName + ': Turn ' + (state ? 'on' : 'off') + ((accessory.context.wol&&accessory.context.mac) ? ' (WOL)' : ''))
	    
	  if(accessory.context.wol && accessory.context.mac){
		
		if(state){
			
			await this.Bravia.setPowerStatusWOL(accessory.context.mac);
			await timeout(3000)
			
		} else {
			
			await this.Bravia.setPowerStatus(false);
			
		}
		  
	  } else {
		
		await this.Bravia.setPowerStatus(state ? true : false);
		  
	  }
  
    } catch(err) {
  
      this.logger.error(accessory.displayName + ': Error while setting new power state!'); 
      this.debug('[Bravia Debug]: ' + err);
  
    } finally {
  
      callback(null, state);
  
    }
  
  }
  
  async getInputState(accessory,service){
  
    if(service.getCharacteristic(Characteristic.Active).value){
  
      try {
  
        let ident;
  
        let status = await this.Bravia.getPlayingContentInfo();
  
        if(status === 'App State'){
  
          ident = 0;
  
        } else {
  
          let name = status.title ? status.title : status.label;  
          let uri = this._inputs.get(name);
  
          if(uri){
  
            for(const i of this._uris){
  
              if(uri === i[1])
                ident = i[0];
  
            }
  
          } else {
          
            if((status.uri && status.uri.includes((accessory.context.channelSource === 'DVBT' ? 'tv:dvbt' : 'tv:dvbc')))||
            (status.source && status.source === (accessory.context.channelSource === 'DVBT' ? 'tv:dvbt' : 'tv:dvbc'))){

              name = accessory.context.channelSource === 'DVBT' ? 'DVBT' : 'DVBC';
            
            } else {
            
              name = undefined; 
            
            }
        
            uri = this._inputs.get(name);
        
            if(uri){
  
              for(const i of this._uris){
  
                if(uri === i[1])
                  ident = i[0];
    
              }
  
            } 
          
          }
  
          ident = ident ? ident : 0;
  
        }
  
        service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(ident);
  
      } catch(err) {
  
        this.logger.error(accessory.displayName + ': Error while getting input state!'); 
        this.debug('[Bravia Debug]: ' + err);
  
      } finally {
  
        setTimeout(this.getInputState.bind(this,accessory,service), accessory.context.interval);
  
      }
  
    } else {
  
      setTimeout(this.getInputState.bind(this,accessory,service), 1000);
  
    }
  
  }
  
  async setInputState(accessory, service, value, callback){
  
    let uri = this._uris.get(value);
  
    try {
	    
      for(const i of this._inputs){
        if(i[1]===uri)
          this.logger.info(accessory.displayName + ': Turn on ' + i[0])
      }
  
      if(uri.includes('com.sony.dtv')){
        await this.Bravia.setActiveApp(uri);  
      } else {
        await this.Bravia.setPlayContent(uri);  
      }
  
    } catch(err) {
  
      this.logger.error(accessory.displayName + ': Error while setting new input state!'); 
      this.debug('[Bravia Debug]: ' + err);
  
    } finally {
  
      callback();
  
    }
  
  }
  
  async _checkInputs(accessory, service){
  
    try {
    
      let inputs = await this.getInputs(accessory);
    
      this._addInputs(accessory,service,inputs);
   
      await timeout(1000);
      this.getInputState(accessory,service);
    
    } catch (err) {
   
      this.logger.error(accessory.displayName + ': Error while checking inputs!'); 
      this.debug('[Bravia Debug]: ' + err);
    
    }
  
  }
  
  async getInputs(accessory){
  
    let inputArray = [];
    let error;
  
    try{
  
      if(accessory.context.cecInputs){
        this.debug('[Bravia Debug]: ' + accessory.displayName + ': CEC detected, turning on TV and wait 7 secs until current external inputs are fetched!')
        await this.Bravia.setPowerStatus(true);
        await timeout(7000); //wait 7sec after turn on to detect cec devices
      }
    
      let inputs = await this.Bravia.getCurrentExternalInputsStatus();
  
      inputs.map( input => {
  
        if(accessory.context.extraInputs && accessory.context.cecInputs){
  
          inputArray.push(input);
        
        } else {
  
          if(input.icon === 'meta:hdmi')
            inputArray.push(input);
    
          if(accessory.context.extraInputs){
  
            if(input.icon === 'meta:composite'||
            input.icon === 'meta:svideo'||
            input.icon === 'meta:composite_componentd'||
            input.icon === 'meta:component'||
            input.icon === 'meta:componentd'||
            input.icon === 'meta:scart'||
            input.icon === 'meta:dsub15'||
            input.icon === 'meta:tuner'||
            input.icon === 'meta:tape'||
            input.icon === 'meta:disc'||
            input.icon === 'meta:complex'||
            input.icon === 'meta:avamp'||
            input.icon === 'meta:hometheater'||
            input.icon === 'meta:game'||
            input.icon === 'meta:camcorder'||
            input.icon === 'meta:digitalcamera'||
            input.icon === 'meta:pc'||
            input.icon === 'meta:wifidisplay'){
              inputArray.push(input);
            }
  
          }
    
          if(accessory.context.cecInputs && 
          (input.icon === 'meta:tv'||
          input.icon === 'meta:audiosystem'||
          input.icon === 'meta:recordingdevice'||
          input.icon === 'meta:playbackdevice'||
          input.icon === 'meta:tunerdevice')){
            inputArray.push(input); 
          }
  
        }
  
      });
          
      if(accessory.context.apps.length){  
        let apps = await this.Bravia.getApplicationList();
    
        apps.map( app => {
    
          if(accessory.context.apps.includes(app.title))    
            inputArray.push(app);
    
        });
      }
    
      if(accessory.context.channels.length){
  
        for(const i of accessory.context.channels){

          let channel = await this.Bravia.getContentList((accessory.context.channelSource === 'DVBT' ? 'tv:dvbt' : 'tv:dvbc'), 1, i);
          inputArray.push(channel[0]);

        }

      }
  
    } catch(err){
  
      error = err;
  
    }
    
    return new Promise((resolve,reject) => {
  
      if(inputArray.length)
        resolve(inputArray);
  
      reject(error);
  
    });
  
  }
  
  _addInputs(accessory,service,inputs){
  
    this._inputs = new Map();
    this._uris = new Map();
    let countInputs = 0;
  
    inputs.map( input => {
  
      this._inputs.set((input.title ? input.title : input.label), input.uri);
  
  
    });
  
    if(accessory.context.channelSource)
      this._inputs.set((accessory.context.channelSource === 'DVBT' ? 'DVBT' : 'DVBC'), (accessory.context.channelSource === 'DVBT' ? 'tv:dvbt' : 'tv:dvbc'));
      
  
    this._inputs.forEach( (value, key) => {
  
      countInputs++;
  
      let tvInput;
  
      if(accessory.getServiceByUUIDAndSubType(Service.InputSource, key + ' Input')){
      
        this.debug('[Bravia Debug]: ' + accessory.displayName + ': Refreshing Input: ' + key);
  
        let ident = accessory.getServiceByUUIDAndSubType(Service.InputSource, key + ' Input').getCharacteristic(Characteristic.Identifier).value;
  
        this._uris.set(ident, value);
  
        service.addLinkedService(accessory.getServiceByUUIDAndSubType(Service.InputSource, key + ' Input'));

  
      } else {
  
        this._uris.set(countInputs, value);
  
        this.debug('[Bravia Debug]: ' + accessory.displayName + ': Adding new Input: ' + key);
  
        tvInput = accessory.addService(Service.InputSource, key, key + ' Input');  
  
        tvInput
          .setCharacteristic(Characteristic.Name, key)
          .setCharacteristic(Characteristic.Identifier, countInputs)
          .setCharacteristic(Characteristic.ConfiguredName, key)
          .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
          .setCharacteristic(Characteristic.CurrentVisibilityState, Characteristic.CurrentVisibilityState.SHOWN)
          .setCharacteristic(Characteristic.TargetVisibilityState, Characteristic.TargetVisibilityState.SHOWN)
          .setCharacteristic(Characteristic.InputDeviceType, Characteristic.InputDeviceType.OTHER)
          .setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType.HDMI);

        service.addLinkedService(tvInput);
  
      }
  
    });
  
    this._removeInputs(accessory, service);
  
  }
  
  _removeInputs(accessory, service){
  
    accessory.services.map( input => {
  
      if(input.subtype && input.subtype.includes('Input')){
  
        if(!(this._inputs.has(input.displayName))){
      
          this.debug('[Bravia Debug]: ' + accessory.displayName + ': Removing Input: ' + input.displayName);
  
          service.removeLinkedService(accessory.getServiceByUUIDAndSubType(Service.InputSource, input.subtype));
          accessory.removeService(accessory.getServiceByUUIDAndSubType(Service.InputSource, input.subtype));
  
          this._removeInputs(accessory, service);
      
        }
  
      }
  
    });
  
  }
  
  async setRemote(accessory, service, value, callback){
  
    try{
  
      switch(value){
  
        case 0:

          this.logger.info(accessory.displayName + ': Settings');
          await this.Bravia.setIRCC('AAAAAgAAAJcAAAA2Aw==');

          break;  
  
        case 4:
    
          this.logger.info(accessory.displayName + ': Up');
          await this.Bravia.setIRCC('AAAAAQAAAAEAAAB0Aw==');
    
          break;
      
        case 5:
    
          this.logger.info(accessory.displayName + ': Down');
          await this.Bravia.setIRCC('AAAAAQAAAAEAAAB1Aw==');
    
          break;
      
        case 6:
    
          this.logger.info(accessory.displayName + ': Left');
          await this.Bravia.setIRCC('AAAAAQAAAAEAAAA0Aw==');
    
          break;
      
        case 7:
    
          this.logger.info(accessory.displayName + ': Right');
          await this.Bravia.setIRCC('AAAAAQAAAAEAAAAzAw==');
    
          break;
      
        case 8:
    
          this.logger.info(accessory.displayName + ': Confirm');
          await this.Bravia.setIRCC('AAAAAQAAAAEAAABlAw==');
    
          break;
      
        case 9:
    
          this.logger.info(accessory.displayName + ': Back');
          await this.Bravia.setIRCC('AAAAAgAAAJcAAAAjAw==');
    
          break;
      
        case 15:
    
          this.logger.info(accessory.displayName + ': Info');
          await this.Bravia.setIRCC('AAAAAgAAAMQAAABNAw==');
    
          break;
      
        case 11:
      
          if(!this.isPaused){
      
            this.logger.info(accessory.displayName + ': Pause');
            this.isPaused = true;
            await this.Bravia.setIRCC('AAAAAgAAABoAAABnAw==');
            
          } else {
      
            this.logger.info(accessory.displayName + ': Play');
            this.isPaused = false;
            await this.Bravia.setIRCC('AAAAAgAAAJcAAAAaAw==');
            
          }
    
          break;
      
        default:
          this.logger.warn(accessory.displayName + ': Unknown remote value: ' + value);
      }
  
    } catch(err){
  
      this.logger.error(accessory.displayName + ': Error while setting new remote key'); 
      this.debug('[Bravia Debug]: ' + err);
  
    } finally {
  
      callback();
  
    }
  
  }

}

module.exports = BraviaPlatform;