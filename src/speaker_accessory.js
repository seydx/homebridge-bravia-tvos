'use strict';

const LogUtil = require('../lib/LogUtil.js');
const Bravia = require('../lib/Bravia.js');

const tcpp = require('tcp-ping');

const tcpprobe = (ip,port) => new Promise((resolve, reject) => tcpp.probe(ip,port, (err, available) => err ? reject(err) : resolve(available)));
const timeout = ms => new Promise(res => setTimeout(res, ms));

var Service, Characteristic;

const pluginName = 'homebridge-bravia-tvos';
const platformName = 'BraviaOSPlatform';

class SpeakerAccessory {
  constructor (platform, accessory, add) {

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
    
    this.Bravia = new Bravia(this, accessory.context, true);
    
    this.accessory = accessory;
    
    this.handleAccessory(add);

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  
  async handleAccessory(add){
    
    try {
    
      this.logger.info(this.accessory.displayName + ': Cheking authentication...');
      await this.Bravia.getAuth();

      this.logger.info(this.accessory.displayName + ': Authenticated!');

      if(this.accessory.getServiceByUUIDAndSubType(Service.Speaker, this.accessory.displayName + ' Accessory')){
    
        if(this.accessory.context.speakerType !== 'speaker'){
      
          this.debug(this.accessory.displayName + ': Removing Speaker (Speaker Service)');
          this.accessory.removeService(this.accessory.getServiceByUUIDAndSubType(Service.Speaker, this.accessory.displayName + ' Accessory'));
        
          let mainService = this.handleSpeaker();
          this.service = this.accessory.addService(mainService);
      
        } else {
      
          this.service = this.accessory.getServiceByUUIDAndSubType(Service.Speaker, this.accessory.displayName + ' Accessory');
      
        }
    
      } else if(this.accessory.getServiceByUUIDAndSubType(Service.Switch, this.accessory.displayName + ' Accessory')) {
    
        if(this.accessory.context.speakerType !== 'switch'){
      
          this.debug(this.accessory.displayName + ': Removing Speaker (Switch Service)');
          this.accessory.removeService(this.accessory.getServiceByUUIDAndSubType(Service.Switch, this.accessory.displayName + ' Accessory'));
        
          let mainService = this.handleSpeaker();
          this.service = this.accessory.addService(mainService);
      
        } else {
      
          this.service = this.accessory.getServiceByUUIDAndSubType(Service.Switch, this.accessory.displayName + ' Accessory');
      
        }

      } else if(this.accessory.getServiceByUUIDAndSubType(Service.Lightbulb, this.accessory.displayName + ' Accessory')){
    
        if(this.accessory.context.speakerType !== 'lightbulb'){
      
          this.debug(this.accessory.displayName + ': Removing Speaker (Lightbulb Service)');
          this.accessory.removeService(this.accessory.getServiceByUUIDAndSubType(Service.Lightbulb, this.accessory.displayName + ' Accessory'));
        
          let mainService = this.handleSpeaker();
          this.service = this.accessory.addService(mainService);
      
        } else {
      
          this.service = this.accessory.getServiceByUUIDAndSubType(Service.Lightbulb, this.accessory.displayName + ' Accessory');
      
        }
    
      } else {
    
        let mainService = this.handleSpeaker();
        this.service = this.accessory.addService(mainService);
    
      }
    
      if(add){
      
        this.logger.info('Registring platform accessory: ' + this.accessory.displayName);
        
        this.api.registerPlatformAccessories(pluginName, platformName, [this.accessory]);
        //this.accessories.push(this.accessory);
      
      }
    
      this.getTVState();   
      this.getService();

    } catch(err){

      this.logger.error(JSON.stringify(err, null, 4));
    
    }
  
  }
  
  handleSpeaker(){ 
  
    let Speaker;
    
    switch(this.accessory.context.speakerType){
      
      case 'lightbulb':
        
        this.debug(this.accessory.displayName + ': Adding Speaker (Lightbulb Service)');
        
        Speaker = new Service.Lightbulb (this.accessory.displayName, this.accessory.displayName + ' Accessory');
        Speaker.addCharacteristic(Characteristic.Brightness);
        Speaker.addCharacteristic(Characteristic.Volume);
        Speaker.addCharacteristic(Characteristic.Mute);
        
        break;
          
      case 'switch':
        
        this.debug(this.accessory.displayName + ': Adding Speaker (Switch Service)');
        
        Speaker = new Service.Switch(this.accessory.displayName, this.accessory.displayName + ' Accessory');
        Speaker.addCharacteristic(Characteristic.Volume);
        Speaker.addCharacteristic(Characteristic.Mute);
        
        break;
          
      case 'speaker':
        
        this.debug(this.accessory.displayName + ': Adding Speaker (Speaker Service)');
                
        Speaker = new Service.Speaker(this.accessory.displayName, this.accessory.displayName + ' Accessory');
        Speaker.addCharacteristic(Characteristic.Volume);
          
        break;
          
      default:
          // fall through
      
    }
      
    return Speaker;
  
  }
  
  getTVState(){
  
    this.accessories.map( accessory => {
    
        if(accessory.getService(Service.Television)){
        
          if(this.accessory.displayName.includes(accessory.displayName))
            this.TVState = accessory.getService(Service.Television).getCharacteristic(Characteristic.Active).value;
        
        }  
    
    })
    
    setTimeout(this.getTVState.bind(this),1000);
  
  }

  async getService () {
  
    const self = this;
    
    this.accessory.on('identify', function (paired, callback) {
      self.logger.info(self.accessory.displayName + ': Hi!');
      callback();
    });
      
    this.service.getCharacteristic(Characteristic.Mute)
      .on('set', this.setMute.bind(this, false));

    this.service.getCharacteristic(Characteristic.Volume)
      .on('set', this.setVolume.bind(this));
      
    if(this.accessory.context.speakerType === 'switch'||this.accessory.context.speakerType === 'lightbulb')
      this.service.getCharacteristic(Characteristic.On)
        .on('set', this.setMute.bind(this, true));
        
    if(this.accessory.context.speakerType === 'lightbulb')
      this.service.getCharacteristic(Characteristic.Brightness)
        .on('set', this.setVolume.bind(this));

    this.getSpeaker();

  }
  
  async getSpeaker(){
  
    try {
    
      if(this.TVState){
            
        let volume, mute;
            
        let audio = await this.Bravia.getVolumeInformation();
        
        if(Array.isArray(audio)){
        
          audio.map( state => {
               
            if(state.target === 'speaker'){
                 
              volume = state.volume;
              mute = state.mute;
                 
            }
               
          });
          
        } else {
        
          await timeout(2000);        
          this.getSpeaker();
        
        }
               
        this.service.getCharacteristic(Characteristic.Mute).updateValue(mute);
        this.service.getCharacteristic(Characteristic.Volume).updateValue(volume);
        
        if(this.accessory.context.speakerType === 'switch'||this.accessory.context.speakerType === 'lightbulb')
          this.service.getCharacteristic(Characteristic.On).updateValue(mute ? false : true);
          
        if(this.accessory.context.speakerType === 'lightbulb')
          this.service.getCharacteristic(Characteristic.Brightness).updateValue(volume);
            
      } else {
            
        this.service.getCharacteristic(Characteristic.Mute).updateValue(true);
        this.service.getCharacteristic(Characteristic.Volume).updateValue(0);
        
        if(this.accessory.context.speakerType === 'switch'||this.accessory.context.speakerType === 'lightbulb')
          this.service.getCharacteristic(Characteristic.On).updateValue(false);
          
        if(this.accessory.context.speakerType === 'lightbulb')
          this.service.getCharacteristic(Characteristic.Brightness).updateValue(0);
            
      }
    
    } catch(err) {
    
      if(err !== 'Display Off'){
        this.logger.error(this.accessory.displayName + ': An error occured while getting audio state');
        this.logger.error(JSON.stringify(err, null, 4));
      }
    
    } finally {
    
      setTimeout(this.getSpeaker.bind(this), this.accessory.context.interval);
    
    }
    
  }
  
  async setMute(reverse, mute, callback){
  
    if(!await tcpprobe(this.accessory.context.ip, this.accessory.context.port)){
      this.logger.warn(this.accessory.displayName + ': Can not set mute state, TV currently offline!');
      callback();
      return;
    }
    
    if(!this.TVState){
      this.logger.warn(this.accessory.displayName + ': Can not set mute state, TV not on!');
      callback();
      return;
    }
    
    try {
    
      if(reverse)
        mute = mute ? false : true;
    
      this.logger.info(this.accessory.displayName + ': Mute: ' + mute);
      
      await this.Bravia.setAudioMute(mute);
    
    } catch(err){
    
      this.logger.error(this.accessory.displayName + ': An error occured while setting mute state!');
      this.logger.error(JSON.stringify(err, null, 4));
    
    } finally {
    
      callback();
    
    }
  
  }

  async setVolume(value, callback){
  
    if(!await tcpprobe(this.accessory.context.ip, this.accessory.context.port)){
      this.logger.warn(this.accessory.displayName + ': Can not change volume, TV currently offline!');
      callback();
      return;
    }
    
    if(!this.TVState){
      this.logger.warn(this.accessory.displayName + ': Can not change volume, TV not on!');
      callback();
      return;
    }
    
    try {
    
      this.logger.info(this.accessory.displayName + ': Volume: ' + value);
      
      await this.Bravia.setAudioVolume('speaker', value);
    
    } catch(err){
    
      this.logger.error(this.accessory.displayName + ': An error occured while setting volume!');
      this.logger.error(JSON.stringify(err, null, 4));
    
    } finally {
    
      callback();
    
    }
  
  }

}

module.exports = SpeakerAccessory;
