'use strict';

const Logger = require('../helper/logger.js');

class speakerAccessory {

  constructor (api, accessory, accessories, bravia) {

    this.api = api;
    this.accessory = accessory;
    this.accessories = accessories;
    this.bravia = bravia;
    
    this.getService(this.accessory);

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  async getService (accessory) {
  
    let service, serviceCharacteristic, onCharacteristic, volumeCharacteristic;
    let accType = accessory.context.config.subtype;
    
    accessory.context.inProgress = false;
    accessory.context.settingVolume = false;
      
    if(accType === 'speaker'){
      if(accessory.getService(this.api.hap.Service.Lightbulb)){
        Logger.debug('Removing lightbulb service', this.accessory.displayName);
        accessory.removeService(accessory.getService(this.api.hap.Service.Lightbulb));
      } else if(accessory.getService(this.api.hap.Service.Switch)){
        Logger.debug('Removing switch service', this.accessory.displayName);
        accessory.removeService(accessory.getService(this.api.hap.Service.Switch));
      }
      
      service = accessory.getService(this.api.hap.Service.Speaker);
      
      if(!service) {
        Logger.debug('Adding speaker service', accessory.displayName);
        service = accessory.addService(this.api.hap.Service.Speaker, this.accessory.displayName, this.accessory.displayName);
      }
      
      if(!service.testCharacteristic(this.api.hap.Characteristic.Volume))
        service.addCharacteristic(this.api.hap.Characteristic.Volume);
        
      serviceCharacteristic = this.api.hap.Service.Speaker;
      onCharacteristic = this.api.hap.Characteristic.Mute;  
      volumeCharacteristic = this.api.hap.Characteristic.Volume;
      
    }
    
    if(accType === 'lightbulb'){
      if(accessory.getService(this.api.hap.Service.Speaker)){
        Logger.debug('Removing speaker service', this.accessory.displayName);
        accessory.removeService(accessory.getService(this.api.hap.Service.Speaker));
      } else if(accessory.getService(this.api.hap.Service.Switch)){
        Logger.debug('Removing switch speaker', this.accessory.displayName);
        accessory.removeService(accessory.getService(this.api.hap.Service.Switch));
      }
      
      service = accessory.getService(this.api.hap.Service.Lightbulb);
      
      if(!service) {
        Logger.debug('Adding lightbulb service', accessory.displayName);
        service = accessory.addService(this.api.hap.Service.Lightbulb, this.accessory.displayName, this.accessory.displayName);
      }
      
      if(!service.testCharacteristic(this.api.hap.Characteristic.Brightness))
        service.addCharacteristic(this.api.hap.Characteristic.Brightness);
       
      serviceCharacteristic = this.api.hap.Service.Lightbulb;
      onCharacteristic = this.api.hap.Characteristic.On;  
      volumeCharacteristic = this.api.hap.Characteristic.Brightness;
      
    }
    
    if(accType === 'switch'){
      if(accessory.getService(this.api.hap.Service.Speaker)){
        Logger.debug('Removing speaker service', this.accessory.displayName);
        accessory.removeService(accessory.getService(this.api.hap.Service.Speaker));
      } else if(accessory.getService(this.api.hap.Service.Lightbulb)){
        Logger.debug('Removing lightbulb speaker', this.accessory.displayName);
        accessory.removeService(accessory.getService(this.api.hap.Service.Lightbulb));
      }
      
      service = accessory.getService(this.api.hap.Service.Switch);
      
      if(!service) {
        Logger.debug('Adding switch service', accessory.displayName);
        service = accessory.addService(this.api.hap.Service.Switch, this.accessory.displayName, this.accessory.displayName);
      }
      
      if(!service.testCharacteristic(this.api.hap.Characteristic.Volume))
        service.addCharacteristic(this.api.hap.Characteristic.Volume);
      
      serviceCharacteristic = this.api.hap.Service.Switch;
      onCharacteristic = this.api.hap.Characteristic.On;  
      volumeCharacteristic = this.api.hap.Characteristic.Volume;
      
    }

    service.getCharacteristic(onCharacteristic)
      .on('set', this.switchMute.bind(this, serviceCharacteristic, onCharacteristic, volumeCharacteristic));
      
    service.getCharacteristic(volumeCharacteristic)
      .on('set', this.setVolume.bind(this, serviceCharacteristic, onCharacteristic, volumeCharacteristic));
    
  }
  
  async setVolume(serviceCharacteristic, onCharacteristic, volumeCharacteristic, value, callback){
  
    callback(null);
    
    let tvAccessory = this.accessories.find(accessory => (accessory.displayName + ' Speaker') === this.accessory.displayName);
    let passed = false;
    
    this.accessory.context.inProgress = true;
    this.accessory.context.settingVolume = true;
    
    if(tvAccessory)
      passed = tvAccessory.getService(this.api.hap.Service.Television).getCharacteristic(this.api.hap.Characteristic.Active).value;
    
    if(passed){
    
      try {
      
        if(this.waitForEndValue){
          clearTimeout(this.waitForEndValue);
          this.waitForEndValue = false;
        }
      
        this.waitForEndValue = setTimeout(async () => {
        
          try {
          
            let target = this.accessory.context.config.speaker.output === 'other' ? 'speaker' : this.accessory.context.config.speaker.output;
          
            if(serviceCharacteristic === this.api.hap.Service.Lightbulb){
            
              if(value !== 0){
                Logger.debug('Setting volume to ' + value, this.accessory.displayName);
                await this.bravia.audio.invoke('setAudioVolume', '1.0', { target: target, volume: value.toString() });
              } else {
                this.accessory.context.settingVolume = false;
              }
            
            } else {
            
              if(value === 0){
                Logger.debug('Mute true', this.accessory.displayName);
                await this.bravia.audio.invoke('setAudioMute', '1.0', { status: true });
              } else {
                Logger.debug('Setting volume to ' + value, this.accessory.displayName);
                await this.bravia.audio.invoke('setAudioVolume', '1.0', { target: target, volume: value.toString() });
              }
            
            }
            
            this.accessory.context.inProgress = false;
          
          } catch(err) {
          
            Logger.error('An error occured during setting volume to ' + value, this.accessory.displayName);
            Logger.error(err);
            
            this.accessory.context.inProgress = false;
          
          }
        
        }, 1000);
      
      } catch(err) {
      
        Logger.error('An error occured during setting volume to ' + value, this.accessory.displayName);
        Logger.error(err);
        
        this.accessory.context.inProgress = false;
      
      }
    
    } else {
      
      if(this.waitForEndValue){
        clearTimeout(this.waitForEndValue);
        this.waitForEndValue = false;
      }
    
      this.waitForEndValue = setTimeout(async () => {
        
        Logger.warn('Can not change volume, tv is not turned on!', this.accessory.displayName);
        this.accessory.context.inProgress = false;
        
        if(onCharacteristic !== this.api.hap.Characteristic.Mute){
        
          this.accessory
            .getService(serviceCharacteristic)
            .getCharacteristic(onCharacteristic)
            .updateValue(false);
        
        }
        
      }, 1000); 
    
    }
  
  }
  
  async switchMute(serviceCharacteristic, onCharacteristic, volumeCharacteristic, state, callback){
  
    callback(null);
    
    let tvAccessory = this.accessories.find(accessory => (accessory.displayName + ' Speaker') === this.accessory.displayName);
    let passed = false;
    
    this.accessory.context.inProgress = true;
    
    if(tvAccessory)
      passed = tvAccessory.getService(this.api.hap.Service.Television).getCharacteristic(this.api.hap.Characteristic.Active).value;
    
    if(passed){
    
      try {
      
        let mute = onCharacteristic === this.api.hap.Characteristic.Mute ? state : !state;
      
        if(serviceCharacteristic === this.api.hap.Service.Lightbulb){
        
          if(this.waitForEndState){
            clearTimeout(this.waitForEndState);
            this.waitForEndState = false;
          }
        
          this.waitForEndState = setTimeout(async () => {
            
            try {
         
              if(!this.accessory.context.settingVolume){
                Logger.debug('Mute ' + mute, this.accessory.displayName);
                await this.bravia.audio.invoke('setAudioMute', '1.0', { status: mute });
              }
              
              this.accessory.context.settingVolume = false;
              this.accessory.context.inProgress = false;
          
            } catch(err) {
          
              Logger.error('An error occured during setting mute to ' + state, this.accessory.displayName);
              Logger.error(err);
              
              this.accessory.context.inProgress = false;
          
            }
          
          }, 1250);
        
        } else {
        
          Logger.debug('Mute ' + mute, this.accessory.displayName);
          await this.bravia.audio.invoke('setAudioMute', '1.0', { status: mute });
          this.accessory.context.inProgress = false;
        
        }
      
      } catch(err) {
      
        Logger.error('An error occured during setting mute to ' + state, this.accessory.displayName);
        Logger.error(err);
        
        this.accessory.context.inProgress = false;
      
      }
    
    } else {
    
      if(serviceCharacteristic === this.api.hap.Service.Lightbulb){
      
        if(this.waitForEndState){
          clearTimeout(this.waitForEndState);
          this.waitForEndState = false;
        }
      
        this.waitForEndState = setTimeout(async () => { 
          
          Logger.warn('Can not switch mute, tv is not turned on!', this.accessory.displayName);
          this.accessory.context.inProgress = false;
          
          if(onCharacteristic !== this.api.hap.Characteristic.Mute){
          
            this.accessory
              .getService(serviceCharacteristic)
              .getCharacteristic(onCharacteristic)
              .updateValue(false);
          
          }
          
        }, 1000); 
      
      } else {
      
        Logger.warn('Can not switch mute, tv is not turned on!', this.accessory.displayName);
        this.accessory.context.inProgress = false;
        
        setTimeout(() => {
        
          if(onCharacteristic !== this.api.hap.Characteristic.Mute){
          
            this.accessory
              .getService(serviceCharacteristic)
              .getCharacteristic(onCharacteristic)
              .updateValue(false);
          
          }
        
        }, 1000);
      
      }
    
    }
  
  }
  
  

}

module.exports = speakerAccessory;