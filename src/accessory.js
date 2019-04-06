'use strict';

const LogUtil = require('../lib/LogUtil.js');
const Bravia = require('../lib/Bravia.js');
const IRCC = require('../lib/IRCC.js');

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
    
    this._inputs = new Map();
    this._uris = new Map();
    
    this.accessory = accessory;
    this.service = accessory.getServiceByUUIDAndSubType(Service.Television, this.accessory.displayName);
    this.speaker = accessory.getServiceByUUIDAndSubType(Service.TelevisionSpeaker, this.accessory.displayName + ' Speaker');
    
    this.getService();

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  async getService () {
  
    const self = this;

    this.accessory.on('identify', function (paired, callback) {
      self.logger.info(this.accessory.displayName + ': Hi!');
      callback();
    });
    
    if(!this.service.getCharacteristic(Characteristic.ConfiguredName).value)
      this.service.setCharacteristic(Characteristic.ConfiguredName, this.accessory.displayName);
      
    this.service
      .setCharacteristic(
        Characteristic.SleepDiscoveryMode,
        Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE
      );
      
    this.service.getCharacteristic(Characteristic.Active)
      .on('set', this.setPowerState.bind(this));
      
    this.service.getCharacteristic(Characteristic.ActiveIdentifier)
      .on('set', this.setInputState.bind(this));
      
    if (!this.service.testCharacteristic(Characteristic.RemoteKey))
      this.service.addCharacteristic(Characteristic.RemoteKey);
      
    this.service.getCharacteristic(Characteristic.RemoteKey)
      .on('set', this.setRemote.bind(this));
      
    if (!this.service.testCharacteristic(Characteristic.PowerModeSelection))
      this.service.addCharacteristic(Characteristic.PowerModeSelection);
      
    this.service.getCharacteristic(Characteristic.PowerModeSelection)
      .on('set', this.setRemote.bind(this));
      
    this.service.getCharacteristic(Characteristic.PictureMode)
      .on('set', this.setRemote.bind(this));
      
    this.speaker
      .setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.ABSOLUTE);
      
    this.speaker.getCharacteristic(Characteristic.Mute)
      .on('set', this.setMute.bind(this));

    this.speaker.getCharacteristic(Characteristic.VolumeSelector)
      .on('set', this.setRemoteVolume.bind(this));

    if (!this.speaker.testCharacteristic(Characteristic.Volume))
      this.speaker.addCharacteristic(Characteristic.Volume);

    this.speaker.getCharacteristic(Characteristic.Volume)
      .on('set', this.setVolume.bind(this));
    
    this.service.addLinkedService(this.speaker);
    
    this._checkInputs();

    this.getInputState();
    this.getPowerState();
    this.getSpeaker();

  }
  
  async getSpeaker(){

  }
  
  async setMute(mute, callback){
 
    this.logger.info(this.accessory.displayName + ': Mute: ' + mute);
    callback();
  
  }
  
  async setRemoteVolume(value, callback){
 
    //0: Increment
    //1: Decrement
 
    let code = value ? 'AAAAAQAAAAEAAAATAw==' : 'AAAAAQAAAAEAAAASAw==';
 
    try {
  
      this.logger.info(this.accessory.displayName + ': Volume ' + (value ? 'down' : 'up'));
  
      await this.Bravia.setIRCC(code);
  
    } catch(err) {
  
      this.logger.error(this.accessory.displayName + ': Error while setting volume!');
      this.debug('[Bravia Debug]: ' + JSON.stringify(err));
  
    } finally {
  
      callback();
  
    }
  
  }
  
  async setVolume(value, callback){
 
    this.logger.info(this.accessory.displayName + ': Volume Value: ' + value);
    callback();
  
  }
  
  async getPowerState(){
  
    try {
  
      let status = await this.Bravia.getPowerStatus();
  
      let state = status.status === 'active' ? true : false;
  
      this.service.getCharacteristic(Characteristic.Active).updateValue(state);
  
    } catch(err) {
  
      this.logger.error(this.accessory.displayName + ': Error while getting power state!'); 
      this.debug('[Bravia Debug]: ' + JSON.stringify(err));
  
    } finally {
  
      setTimeout(this.getPowerState.bind(this), this.accessory.context.interval);
  
    }
  
  }
  
  async setPowerState(state, callback){
  
    try {
    
      this.logger.info(this.accessory.displayName + ': Turn ' + (state ? 'on' : 'off') + ((this.accessory.context.wol&&this.accessory.context.mac) ? ' (WOL)' : ''));
    
      if(this.accessory.context.wol && this.accessory.context.mac){

        if(state){

          await this.Bravia.setPowerStatusWOL(this.accessory.context.mac);
          await timeout(3000);

        } else {

          await this.Bravia.setPowerStatus(false);

        }
  
      } else {

        await this.Bravia.setPowerStatus(state ? true : false);
  
      }
  
    } catch(err) {
  
      this.logger.error(this.accessory.displayName + ': Error while setting new power state!'); 
      this.debug('[Bravia Debug]: ' + JSON.stringify(err));
  
    } finally {
  
      callback(null, state);
  
    }
  
  }
  
  async getInputState(){
  
    if(this.service.getCharacteristic(Characteristic.Active).value && this._inputs.size){
  
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
          
            if((status.uri && status.uri.includes((this.accessory.context.channelSource === 'DVBT' ? 'tv:dvbt' : 'tv:dvbc')))||
            (status.source && status.source === (this.accessory.context.channelSource === 'DVBT' ? 'tv:dvbt' : 'tv:dvbc'))){

              name = this.accessory.context.channelSource === 'DVBT' ? 'DVBT' : 'DVBC';
            
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
  
        this.service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(ident);
  
      } catch(err) {
  
        this.logger.error(this.accessory.displayName + ': Error while getting input state!'); 
        this.debug('[Bravia Debug]: ' + JSON.stringify(err));
  
      } finally {
  
        setTimeout(this.getInputState.bind(this), this.accessory.context.interval);
  
      }
  
    } else {
  
      setTimeout(this.getInputState.bind(this), 1000);
  
    }
  
  }
  
  async setInputState(value, callback){
  
    let uri = this._uris.get(value);
  
    try {
    
      if(!this.service.getCharacteristic(Characteristic.Active).value){
      
        this.logger.info(this.accessory.displayName + ': Turning on TV');
      
        if(this.accessory.context.wol && this.accessory.context.mac){
          await this.Bravia.setPowerStatusWOL(this.accessory.context.mac);
        } else {
          await this.Bravia.setPowerStatus(true); 
        }
        
        this.service.getCharacteristic(Characteristic.Active).updateValue(true);
        this.service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(value);
        
        await timeout(3000);
        
      }
    
      for(const i of this._inputs){
        if(i[1]===uri)
          this.logger.info(this.accessory.displayName + ': Turn on ' + i[0]);
      }
  
      if(uri.includes('com.sony.dtv')){
        await this.Bravia.setActiveApp(uri);  
      } else if(uri.includes('AAAAA')){
        await this.Bravia.setIRCC(uri);
      } else {
        await this.Bravia.setPlayContent(uri);  
      }
  
    } catch(err) {
  
      this.logger.error(this.accessory.displayName + ': Error while setting new input state!'); 
      this.debug('[Bravia Debug]: ' + JSON.stringify(err));
  
    } finally {
  
      callback();
  
    }
  
  }
  
  async _checkInputs(){
  
    try {
    
      let inputs = await this.getInputs();
  
      inputs.map( input => {
  
        this._inputs.set((input.title ? input.title : input.label), input.uri);
   
      });
    
      this._addInputs();
      this._removeInputs();
    
    } catch (err) {
   
      this.logger.error(this.accessory.displayName + ': Error while checking inputs!'); 
      this.debug('[Bravia Debug]: ' + JSON.stringify(err));
    
    }
  
  }
  
  async getInputs(){
  
    let inputArray = [];
    let error;
  
    try{
  
      if(this.accessory.context.cecInputs){
        this.debug('[Bravia Debug]: ' + this.accessory.displayName + ': CEC detected, turning on TV and wait 7 secs until current external inputs are fetched!');
        await this.Bravia.setPowerStatus(true);
        await timeout(7000); //wait 7sec after turn on to detect cec devices
      }
    
      let inputs = await this.Bravia.getCurrentExternalInputsStatus();
  
      inputs.map( input => {
  
        if(this.accessory.context.extraInputs && this.accessory.context.cecInputs){
  
          inputArray.push(input);
        
        } else {
  
          if(input.icon === 'meta:hdmi')
            inputArray.push(input);
    
          if(this.accessory.context.extraInputs){
  
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
    
          if(this.accessory.context.cecInputs && 
          (input.icon === 'meta:tv'||
          input.icon === 'meta:audiosystem'||
          input.icon === 'meta:recordingdevice'||
          input.icon === 'meta:playbackdevice'||
          input.icon === 'meta:tunerdevice')){
            inputArray.push(input); 
          }
  
        }
  
      });
          
      if(this.accessory.context.apps.length){  
        let apps = await this.Bravia.getApplicationList();
    
        apps.map( app => {
    
          if(this.accessory.context.apps.includes(app.title))    
            inputArray.push(app);
    
        });
      }
    
      if(this.accessory.context.channels.length && (this.accessory.context.channelSource === 'DVBT'||this.accessory.context.channelSource === 'DVBC')){
  
        for(const i of this.accessory.context.channels){

          let channel = await this.Bravia.getContentList((this.accessory.context.channelSource === 'DVBT' ? 'tv:dvbt' : 'tv:dvbc'), 1, i);
          inputArray.push(channel[0]);

        }

      }

      if(this.accessory.context.commands.length){
      
        const c = new IRCC.IRCC();
    
        this.accessory.context.commands.map( command => {
        
          if(c.getCode(command)){+
      
          inputArray.push({
            title: c.getCode(command),
            uri: command
          });
      
          }
    
        });

      }
      
      if(this.accessory.context.channelSource==='DVBT'||this.accessory.context.channelSource==='DVBC')
        inputArray.push({
          title: this.accessory.context.channelSource,
          uri: this.accessory.context.channelSource === 'DVBT' ? 'tv:dvbt' : 'tv:dvbc'
        });
  
    } catch(err){
  
      error = err;
  
    }
    
    return new Promise((resolve,reject) => {
  
      if(inputArray.length)
        resolve(inputArray);
      
      if(error)
        reject(error);
  
    });
  
  }
  
  async _addInputs(){
  
    let countInputs = 0; 
  
    this._inputs.forEach( (value, key) => {
  
      countInputs++;
      let tvInput;
  
      if(!this.accessory.getServiceByUUIDAndSubType(Service.InputSource, key + ' Input')){
  
        this._uris.set(countInputs, value);
  
        this.logger.info(this.accessory.displayName + ': Adding new Input: ' + key);
        
        tvInput = new Service.InputSource(key, key + ' Input');
  
        tvInput
          .setCharacteristic(Characteristic.Identifier, countInputs)
          .setCharacteristic(Characteristic.ConfiguredName, key)
          .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
          .setCharacteristic(Characteristic.CurrentVisibilityState, Characteristic.CurrentVisibilityState.SHOWN)
          .setCharacteristic(Characteristic.TargetVisibilityState, Characteristic.TargetVisibilityState.SHOWN)
          .setCharacteristic(Characteristic.InputDeviceType, Characteristic.InputDeviceType.OTHER)
          .setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType.HDMI);
        
        this.accessory.addService(tvInput);
  
      }
  
    });
    
    //timeout 0.5s to successfull update input list
    await timeout(500);
    
    this._refreshInputs();
  
  }
  
  _refreshInputs(){
  
    const self = this;
  
    let countInputs = 0; 
  
    this._inputs.forEach( (value, key) => {
  
      countInputs++;
      let tvInput;
  
      if(this.accessory.getServiceByUUIDAndSubType(Service.InputSource, key + ' Input')){
      
        this.debug('[Bravia Debug]: ' + this.accessory.displayName + ': Refreshing Input: ' + key);
        
        tvInput = this.accessory.getServiceByUUIDAndSubType(Service.InputSource, key + ' Input');
  
        this._uris.set(countInputs, value);
        
        tvInput.getCharacteristic(Characteristic.Identifier).updateValue(countInputs);
        tvInput.getCharacteristic(Characteristic.IsConfigured).updateValue(Characteristic.IsConfigured.CONFIGURED);
        tvInput.getCharacteristic(Characteristic.InputDeviceType).updateValue(Characteristic.InputDeviceType.OTHER);
        tvInput.getCharacteristic(Characteristic.InputSourceType).updateValue(Characteristic.InputSourceType.HDMI);
          
        tvInput.getCharacteristic(Characteristic.TargetVisibilityState)
          .on('set', function(state, callback){
        
            self.logger.info(tvInput.displayName + ': ' + (state ? 'Hide' : 'Visible'));
        
            tvInput.getCharacteristic(Characteristic.CurrentVisibilityState).updateValue(state);
        
            callback();
          });
        
        this.service.addLinkedService(tvInput);
  
      }
  
    });
  
  }
  
  _removeInputs(){
  
    this.accessory.services.map( input => {
  
      if(input.subtype && input.subtype.includes('Input')){
  
        if(!(this._inputs.has(input.displayName))){
      
          this.logger.warn(this.accessory.displayName + ': Removing Input: ' + input.displayName);
  
          this.service.removeLinkedService(this.accessory.getServiceByUUIDAndSubType(Service.InputSource, input.subtype));
          this.accessory.removeService(this.accessory.getServiceByUUIDAndSubType(Service.InputSource, input.subtype));
  
          this._removeInputs();
      
        }
  
      }
  
    });
  
  }
  
  async setRemote(value, callback){
  
    try{
  
      switch(value){
  
        case 0:

          this.logger.info(this.accessory.displayName + ': Settings');
          await this.Bravia.setIRCC('AAAAAgAAAJcAAAA2Aw==');

          break;  
  
        case 4:
    
          this.logger.info(this.accessory.displayName + ': Up');
          await this.Bravia.setIRCC('AAAAAQAAAAEAAAB0Aw==');
    
          break;
      
        case 5:
    
          this.logger.info(this.accessory.displayName + ': Down');
          await this.Bravia.setIRCC('AAAAAQAAAAEAAAB1Aw==');
    
          break;
      
        case 6:
    
          this.logger.info(this.accessory.displayName + ': Left');
          await this.Bravia.setIRCC('AAAAAQAAAAEAAAA0Aw==');
    
          break;
      
        case 7:
    
          this.logger.info(this.accessory.displayName + ': Right');
          await this.Bravia.setIRCC('AAAAAQAAAAEAAAAzAw==');
    
          break;
      
        case 8:
    
          this.logger.info(this.accessory.displayName + ': Confirm');
          await this.Bravia.setIRCC('AAAAAQAAAAEAAABlAw==');
    
          break;
      
        case 9:
    
          this.logger.info(this.accessory.displayName + ': Back');
          await this.Bravia.setIRCC('AAAAAgAAAJcAAAAjAw==');
    
          break;
      
        case 15:
    
          this.logger.info(this.accessory.displayName + ': Info');
          await this.Bravia.setIRCC('AAAAAgAAAMQAAABNAw==');
    
          break;
      
        case 11:
      
          if(!this.isPaused){
      
            this.logger.info(this.accessory.displayName + ': Pause');
            this.isPaused = true;
            await this.Bravia.setIRCC('AAAAAgAAABoAAABnAw==');
            
          } else {
      
            this.logger.info(this.accessory.displayName + ': Play');
            this.isPaused = false;
            await this.Bravia.setIRCC('AAAAAgAAAJcAAAAaAw==');
            
          }
    
          break;
      
        default:
          this.logger.warn(this.accessory.displayName + ': Unknown remote value: ' + value);
      }
  
    } catch(err){
  
      this.logger.error(this.accessory.displayName + ': Error while setting new remote key'); 
      this.debug('[Bravia Debug]: ' + JSON.stringify(err));
  
    } finally {
  
      callback();
  
    }
  
  }

}

module.exports = BraviaPlatform;