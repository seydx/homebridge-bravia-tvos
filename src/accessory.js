'use strict';

const LogUtil = require('../lib/LogUtil.js');
const Bravia = require('../lib/Bravia.js');
const IRCC = require('../lib/IRCC.js');

const timeout = ms => new Promise(res => setTimeout(res, ms));

var Service, Characteristic;

const pluginName = 'homebridge-bravia-tvos';
const platformName = 'BraviaOSPlatform';

class BraviaPlatform {
  constructor (platform, accessory, add, external) {

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
    this.external = external || false;
    
    this.Bravia = new Bravia(accessory.context);
    
    this._inputs = new Map();
    this._uris = new Map();
    this._sourceType = new Map();
    this._deviceType = new Map();
    
    this.accessory = accessory;
    
    this.handleAccessory(add, external);

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  
  async handleAccessory(add, external){
    
    if(this.accessory.getServiceByUUIDAndSubType(Service.Television, this.accessory.displayName)){
    
      this.service = this.accessory.getServiceByUUIDAndSubType(Service.Television, this.accessory.displayName);
    
    } else {
    
      let mainService = this.handleTelevision();
      this.service = this.accessory.addService(mainService);
    
    }
    
    if(this.accessory.getServiceByUUIDAndSubType(Service.TelevisionSpeaker, this.accessory.displayName + ' Speaker')){
    
      this.speaker = this.accessory.getServiceByUUIDAndSubType(Service.TelevisionSpeaker, this.accessory.displayName + ' Speaker');
    
    } else {
    
      let speakerService = this.handleSpeaker();
      this.speaker = this.accessory.addService(speakerService);
    
    }
    
    this.service.addLinkedService(this.speaker);   
    
    this.inputs = await this.handleInputs();
    
    if(Array.isArray(this.inputs)){
    
      await timeout(500);
      this.inputs.map( input => this.service.addLinkedService(input) );
      
      if(add && !external){
        this.logger.info('Registring platform accessory: ' + this.accessory.displayName);
        this.api.registerPlatformAccessories(pluginName, platformName, [this.accessory]);
        this.accessories.push(this.accessory);
      } else if(add && external){
        this.logger.info('Registring external accessory: ' + this.accessory.displayName);
        this.api.publishExternalAccessories(pluginName, [this.accessory]);
        this.accessories.push(this.accessory);
      } 
      
      if(!add){
        this.api.updatePlatformAccessories(this.accessories);
      }
      
      this.getService();
      
    } else {
    
      this.logger.error(this.accessory.displayName + ': Error while getting new inputs!');
      this.logger.error(this.accessory.displayName + ': Please fix the issue and restart homebridge!');
      this.logger.error(JSON.stringify(this.inputs));
    
    }
  
  }
  
  handleTelevision(){
  
    let Television = new Service.Television(this.accessory.displayName, this.accessory.displayName);
    
    Television.setCharacteristic(Characteristic.ConfiguredName, this.accessory.displayName);
      
    Television
      .setCharacteristic(
        Characteristic.SleepDiscoveryMode,
        Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE
      );
    
    Television.addCharacteristic(Characteristic.RemoteKey);
    
    Television.addCharacteristic(Characteristic.PowerModeSelection);

    Television.addCharacteristic(Characteristic.DisplayOrder);
  
    return Television;
  
  }
  
  handleSpeaker(){
  
    let Speaker = new Service.TelevisionSpeaker(this.accessory.displayName + ' Speaker', this.accessory.displayName + ' Speaker');
    
    Speaker
      .setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.ABSOLUTE);

    Speaker.addCharacteristic(Characteristic.Volume);
      
    return Speaker;
  
  }
  
  async handleInputs(){
  
    let inputArray;
  
    try {
    
      let inputs = await this._getInputs();
  
      inputs.map( input => {
  
        this._inputs.set((input.title ? input.title : input.label), input.uri);
        this._sourceType.set((input.title ? input.title : input.label), input.sourceType);
        this._deviceType.set((input.title ? input.title : input.label), input.deviceType);

      });
      
      await this._removeInputs(true);
      
      inputArray = await this._addAndRefreshInputs();
      
    } catch(err) {
      
      inputArray = err;
    
    }
    
    return inputArray;
  
  }

  async getService () {
  
    const self = this;
    
    this.accessory.on('identify', function (paired, callback) {
      self.logger.info(self.accessory.displayName + ': Hi!');
      callback();
    });
    
    this.service.getCharacteristic(Characteristic.Active)
      .on('set', this.setPowerState.bind(this));
      
    this.service.getCharacteristic(Characteristic.ActiveIdentifier)
      .on('set', this.setInputState.bind(this));
      
    this.service.getCharacteristic(Characteristic.RemoteKey)
      .on('set', this.setRemote.bind(this));
      
    this.service.getCharacteristic(Characteristic.PowerModeSelection)
      .on('set', this.setRemote.bind(this));
      
    this.service.getCharacteristic(Characteristic.PictureMode)
      .on('set', this.setRemote.bind(this));
      
    this.speaker.getCharacteristic(Characteristic.Mute)
      .on('set', this.setMute.bind(this));

    this.speaker.getCharacteristic(Characteristic.VolumeSelector)
      .on('set', this.setRemoteVolume.bind(this));

    this.speaker.getCharacteristic(Characteristic.Volume)
      .on('set', this.setVolume.bind(this));
    
    this.inputs.map( input => {
    
      input.getCharacteristic(Characteristic.TargetVisibilityState)
        .on('set', function(state, callback){
        
          self.logger.info(self.accessory.displayName + ' ' + input.displayName + ': ' + (state ? 'Hide' : 'Visible'));
        
          input.getCharacteristic(Characteristic.CurrentVisibilityState).updateValue(state);
        
          callback();
        });
    
    });

    this.getPowerState();
    this.getInputState();
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
      this.logger.error('[Bravia Debug]: ' + JSON.stringify(err));
  
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
  
      let state = status.status === 'active' ? 1 : 0;
  
      this.service.getCharacteristic(Characteristic.Active).updateValue(state);
      
      if(this.external){
        this.api.updatePlatformAccessories(this.accessories);
      }
  
    } catch(err) {
    
      if(this.accessory.context.wol){
      
        this.service.getCharacteristic(Characteristic.Active).updateValue(false);
      
      } else {
      
        this.logger.error(this.accessory.displayName + ': Error while getting power state!'); 
        this.logger.error('[Bravia Debug]: ' + JSON.stringify(err));
      
      }
  
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
      this.logger.error('[Bravia Debug]: ' + JSON.stringify(err));
  
    } finally {
  
      callback();
  
    }
  
  }
  
  async getInputState(){
    
    if(this.service.getCharacteristic(Characteristic.Active).value){
  
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
          
            if(this.accessory.context.channelInputs.length){
            
              this.accessory.context.channelInputs.map( channel => {
              
                if((status.uri && status.uri.includes('tv:' + channel.toLowerCase()))||(status.source && status.source === 'tv:' + channel.toLowerCase())){

                  name = channel;
            
                }
                
                uri = this._inputs.get(name);
        
                if(uri){
  
                  for(const i of this._uris){
  
                    if(uri === i[1])
                      ident = i[0];
    
                  }
  
                }
              
              });
            
            } 
          
          }
  
          ident = ident ? ident : 0;
  
        }
  
        this.service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(ident);
        
        if(this.external){
          this.api.updatePlatformAccessories(this.accessories);
        }
  
      } catch(err) {
  
        this.logger.error(this.accessory.displayName + ': Error while getting input state!'); 
        //this.logger.error('[Bravia Debug]: ' + JSON.stringify(err));
        
        console.log(err);
  
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
      this.logger.error('[Bravia Debug]: ' + JSON.stringify(err));
  
    } finally {
  
      callback();
  
    }
  
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
      this.logger.error('[Bravia Debug]: ' + JSON.stringify(err));
  
    } finally {
  
      callback();
  
    }
  
  }
  
  async _getInputs(){
  
    let inputArray = [];
  
    try{
  
      if(this.accessory.context.cecInputs){
      
        this.logger.info(this.accessory.displayName + ': CEC detected, checking TV state before fetching inputs...');
        
        let state;
        
        if(!this.accessory.context.wol){
        
          let status = await this.Bravia.getPowerStatus();  
          state = status.status === 'active' ? true : false;
          
        } else {
        
          this.logger.warn(this.accessory.displayName + ': Can not check TV state, because WOL is on!');
          state = false;
          
        }
        
        if(!state){ 
        
          if(!this.accessory.context.wol){
          
            this.logger.warn(this.accessory.displayName + ': TV not on! Turning on the TV...');
            await this.Bravia.setPowerStatus(true);
            
          } else {
          
            if(this.accessory.context.mac){
            
              this.logger.info(this.accessory.displayName + ': Turning on TV (WOL)');
              await this.Bravia.setPowerStatusWOL(this.accessory.context.mac);
            
            } else {
            
              return this.accessory.displayName + ': Can not turn on TV! No MAC address in config.json! Please set up a valid MAC address or set WOL or CEC to false!';
            
            }
            
          }
          
          this.activateTV = true;
          
          await timeout(7000);
          this.logger.info(this.accessory.displayName + ': TV on! Fetching inputs...!');
       
        } else{
        
          this.logger.info(this.accessory.displayName + ': TV on! Fetching inputs...!');
          await timeout(5000);
        
        }

      }
    
      let inputs = await this.Bravia.getCurrentExternalInputsStatus();
  
      inputs.map( input => {
      
        if(this.accessory.context.extraInputs && this.accessory.context.cecInputs){

          input.sourceType = Characteristic.InputSourceType.OTHER;
          input.deviceType = Characteristic.InputDeviceType.TV;
  
          if(input.icon === 'meta:hdmi'){

            input.sourceType = Characteristic.InputSourceType.HDMI;
            input.deviceType = Characteristic.InputDeviceType.TV;

          }
  
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

            input.sourceType = Characteristic.InputSourceType.OTHER;
            input.deviceType = Characteristic.InputDeviceType.TV;

          }
    
          if(input.icon === 'meta:tv'||
          input.icon === 'meta:audiosystem'||
          input.icon === 'meta:recordingdevice'||
          input.icon === 'meta:playbackdevice'||
          input.icon === 'meta:tunerdevice'){

            input.sourceType = Characteristic.InputSourceType.HDMI;
            input.deviceType = Characteristic.InputDeviceType.PLAYBACK;

          }
          
          inputArray.push(input);
        
        } else {
  
          if(input.icon === 'meta:hdmi'){

            input.sourceType = Characteristic.InputSourceType.HDMI;
            input.deviceType = Characteristic.InputDeviceType.TV;

            inputArray.push(input);
          }
    
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

              input.sourceType = Characteristic.InputSourceType.OTHER;
              input.deviceType = Characteristic.InputDeviceType.TV;

              inputArray.push(input);
            }
  
          }
    
          if(this.accessory.context.cecInputs && 
          (input.icon === 'meta:tv'||
          input.icon === 'meta:audiosystem'||
          input.icon === 'meta:recordingdevice'||
          input.icon === 'meta:playbackdevice'||
          input.icon === 'meta:tunerdevice')){

            input.sourceType = Characteristic.InputSourceType.HDMI;
            input.deviceType = Characteristic.InputDeviceType.PLAYBACK;

            inputArray.push(input); 
          }
  
        }
  
      });
          
      if(this.accessory.context.apps.length){  
        let apps = await this.Bravia.getApplicationList();
    
        apps.map( app => {
    
          if(this.accessory.context.apps.includes(app.title)){
            
            app.sourceType = Characteristic.InputSourceType.APPLICATION;
            app.deviceType = Characteristic.InputDeviceType.TV;
            
            inputArray.push(app);
          }    
    
        });
      }
    
      if(this.accessory.context.channels.length){
  
        for (const i of this.accessory.context.channels){
        
          let channelType = 'tv:' + i.source.toLowerCase();

          let channel = await this.Bravia.getContentList(channelType, 1, i.channel);
          channel = channel[0];
          
          channel.sourceType = Characteristic.InputSourceType.TUNER;
          channel.deviceType = Characteristic.InputDeviceType.TV;
          
          inputArray.push(channel);

        }

      }

      if(this.accessory.context.commands.length){
      
        const c = new IRCC.IRCC();
    
        this.accessory.context.commands.map( command => {
        
          if(c.getCode(command)){
      
            inputArray.push({
              title: c.getCode(command),
              uri: command,
              sourceType: Characteristic.InputSourceType.HOME_SCREEN,
              deviceType: Characteristic.InputDeviceType.TV
            });
      
          }
    
        });

      }
      
      if(this.accessory.context.channelInputs.length){
      
        this.accessory.context.channelInputs.map( channel => {
         
          if(channel === 'DVBT'||channel === 'DVBC'||channel === 'DVBS'||channel === 'ANALOG'){
            
            inputArray.push({
              title: channel,
              uri: 'tv:' + channel.toLowerCase(),
              sourceType: Characteristic.InputSourceType.TUNER,
              deviceType: Characteristic.InputDeviceType.TV
            });
            
          }
              
        });
      
      }
      
      if(this.activateTV){
        this.logger.info(this.accessory.displayName + ': New Inputs fetched. Turning off TV again.');
        await this.Bravia.setPowerStatus(false);
      }
      
      return inputArray;
  
    } catch(err){
  
      return err;
  
    }
    
    /*return new Promise((resolve,reject) => {
  
      if(inputArray.length)
        resolve(inputArray);
      
      reject(error);
  
    });*/
  
  }
  
  async _addAndRefreshInputs(){
  
    let countInputs = 0; 
    const displayOrder = [];
    const InputArray = [];
    
    for(const l of this._inputs){
    
      let key = l[0];
      let value = l[1];
        
      countInputs++;
      displayOrder.push(0x01, 0x04, 0x0+countInputs, 0x00, 0x00, 0x00);
      let tvInput, sourceType, deviceType;
      
      this._uris.set(countInputs, value);
        
      for(const i of this._sourceType){
        if(i[0] === key) sourceType = i[1];
      }
  
      for(const j of this._deviceType){
        if(j[0] === key) deviceType = j[1];
      }
  
      if(!this.accessory.getServiceByUUIDAndSubType(Service.InputSource, key + ' Input')){

        if(!this.external){
          this.logger.info(this.accessory.displayName + ': Adding new Input: ' + key);
        } else {
          this.debug('[Bravia Debug]: ' + this.accessory.displayName + ': Adding new Input: ' + key);
        }

        tvInput = new Service.InputSource(key, key + ' Input');
  
        tvInput
          .setCharacteristic(Characteristic.Name, key)
          .setCharacteristic(Characteristic.Identifier, countInputs)
          .setCharacteristic(Characteristic.ConfiguredName, key)
          .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
          .setCharacteristic(Characteristic.CurrentVisibilityState, Characteristic.CurrentVisibilityState.SHOWN)
          .setCharacteristic(Characteristic.TargetVisibilityState, Characteristic.TargetVisibilityState.SHOWN)
          .setCharacteristic(Characteristic.InputDeviceType, deviceType)
          .setCharacteristic(Characteristic.InputSourceType, sourceType);
        
        this.accessory.addService(tvInput, true);
  
      }
      
      if(this.accessory.getServiceByUUIDAndSubType(Service.InputSource, key + ' Input')){
  
        tvInput = this.accessory.getServiceByUUIDAndSubType(Service.InputSource, key + ' Input');
  
        tvInput.getCharacteristic(Characteristic.Identifier).updateValue(countInputs);
        tvInput.getCharacteristic(Characteristic.IsConfigured).updateValue(Characteristic.IsConfigured.CONFIGURED);
        tvInput.getCharacteristic(Characteristic.InputDeviceType).updateValue(deviceType);
        tvInput.getCharacteristic(Characteristic.InputSourceType).updateValue(sourceType);
          
        InputArray.push(tvInput);
  
      }
    
    }
    
    displayOrder.push(0x00, 0x00);
    
    this.service.getCharacteristic(Characteristic.DisplayOrder)
      .updateValue(Buffer.from(displayOrder).toString('base64'));
    
    return InputArray;
  
  }
  
  _removeInputs(finish){
  
    this.accessory.services.map( input => {
  
      if(input.subtype && input.subtype.includes('Input')){
  
        if(!(this._inputs.has(input.displayName))){
      
          this.logger.warn(this.accessory.displayName + ': Removing Input: ' + input.displayName);
  
          this.service.removeLinkedService(this.accessory.getServiceByUUIDAndSubType(Service.InputSource, input.subtype));
          this.accessory.removeService(this.accessory.getServiceByUUIDAndSubType(Service.InputSource, input.subtype));
  
          this._removeInputs(false);
      
        }
  
      }
  
    });
    
    if(finish)
      return;
  
  }

}

module.exports = BraviaPlatform;