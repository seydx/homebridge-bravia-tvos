'use strict';

const LogUtil = require('../lib/LogUtil.js');
const IRCC = require('../lib/IRCC.js');

const tcpp = require('tcp-ping');

const tcpprobe = (ip,port) => new Promise((resolve, reject) => tcpp.probe(ip,port, (err, available) => err ? reject(err) : resolve(available)));
const timeout = ms => new Promise(res => setTimeout(res, ms));

var Service, Characteristic;

const pluginName = 'homebridge-bravia-tvos';
const platformName = 'BraviaOSPlatform';

class TelevisionAccessory {
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
    
    if(external)
      this.external = accessory.context.customSpeaker ? external-1 : external;
    
    this.Bravia = accessory.context.Bravia;
    
    accessory.context.Bravia = {};
    
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
  
    try {

      this.logger.info(this.accessory.displayName + ': Cheking authentication...');
      
      await this.Bravia.getAuth();

      this.logger.info(this.accessory.displayName + ': Authenticated!');
      
      if(this.accessory.getServiceByUUIDAndSubType(Service.Television, this.accessory.displayName)){
    
        this.service = this.accessory.getServiceByUUIDAndSubType(Service.Television, this.accessory.displayName);
    
      } else {
    
        this.debug(this.accessory.displayName + ': Adding Television Service');

        let mainService = this.handleTelevision();
        this.service = this.accessory.addService(mainService);
    
      }
    
      if(this.accessory.getServiceByUUIDAndSubType(Service.TelevisionSpeaker, this.accessory.displayName + ' Speaker')){
      
        this.speaker = this.accessory.getServiceByUUIDAndSubType(Service.TelevisionSpeaker, this.accessory.displayName + ' Speaker');
    
      } else {
    
        this.debug(this.accessory.displayName + ': Adding Television Speaker Service');

        let speakerService = this.handleSpeaker();
        this.speaker = this.accessory.addService(speakerService);
    
      }
    
      this.service.addLinkedService(this.speaker);   
    
      this.inputs = await this.handleInputs();
      
      this.debug(this.accessory.displayName + ': Linking inputs...');
      this.inputs.map( input => { if(input) this.service.addLinkedService(input) });
        
      this.debug(this.accessory.displayName + ': Register? ' + add);
      this.debug(this.accessory.displayName + ': External? ' + external);
      
      if(add && !external){
      
        this.logger.info('Registring platform accessory: ' + this.accessory.displayName);
        
        this.api.registerPlatformAccessories(pluginName, platformName, [this.accessory]);
        //this.accessories.push(this.accessory);
      
      } else if(add && external){
      
        this.logger.info('Registring external accessory: ' + this.accessory.displayName);
        
        this.api.publishExternalAccessories(pluginName, [this.accessory]);
        //this.accessories.push(this.accessory);
      
      }
      
      this.debug(this.accessory.displayName + ': Updating cached accessories..');      
      
      await timeout(500);
      this.api.updatePlatformAccessories(this.accessories);
      await timeout(500);

      this.debug(this.accessory.displayName + ': Accessory successfully updated!');
      this.getService();

    } catch(err){

      this.logger.error(this.accessory.displayName + ': An error occured while handling accessories!')
      this.logger.error(JSON.stringify(err, null, 4));

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
    
    if(!Television.testCharacteristic(Characteristic.RemoteKey))
      Television.addCharacteristic(Characteristic.RemoteKey);
    
    if(!Television.testCharacteristic(Characteristic.PowerModeSelection))
      Television.addCharacteristic(Characteristic.PowerModeSelection);

    if(!Television.testCharacteristic(Characteristic.PictureMode))
      Television.addCharacteristic(Characteristic.PictureMode);

    if(!Television.testCharacteristic(Characteristic.DisplayOrder))
      Television.addCharacteristic(Characteristic.DisplayOrder);
  
    return Television;
  
  }
  
  handleSpeaker(){ 
  
    let Speaker = new Service.TelevisionSpeaker(this.accessory.displayName + ' Speaker', this.accessory.displayName + ' Speaker');
    
    Speaker
      .setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.ABSOLUTE);

    Speaker.addCharacteristic(Characteristic.Volume);
    
    Speaker.addCharacteristic(Characteristic.VolumeSelector);
      
    return Speaker;
  
  }
  
  async handleInputs(){
  
    this.debug(this.accessory.displayName + ': Handling inputs...');
  
    let inputArray;
  
    try {
    
      let inputs = await this._getInputs();
  
      inputs.map( input => {

        const isTitleValid = input.title && input.title.length > 0;
        const isLabelValid = input.label && input.label.length > 0;

        this._inputs.set((isLabelValid ? input.label : input.title), input.uri);
        this._sourceType.set((isTitleValid ? input.title : input.label), input.sourceType);
        this._deviceType.set((isTitleValid ? input.title : input.label), input.deviceType);


      });
      
      await this._removeInputs(true);
      
      inputArray = await this._addAndRefreshInputs();
      
      this.logger.info(this.accessory.displayName + ': Inputs Finished!');
    
      return inputArray;
      
    } catch(err) {
      
      throw err;
    
    }
  
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
    
      //console.log(input);
    
      if(input && input.getCharacteristic(Characteristic.TargetVisibilityState)){
    
        input.getCharacteristic(Characteristic.TargetVisibilityState)
          .on('set', function(state, callback){
        
            self.logger.info(self.accessory.displayName + ' ' + input.displayName + ': ' + (state ? 'Hide' : 'Visible'));
        
            input.getCharacteristic(Characteristic.CurrentVisibilityState).updateValue(state);
        
            callback();
          });
        
      }
    
    });

    this.getPowerState();
    this.getInputState();
    //this.getSpeaker();  //not supported atm on HomeKit and 3rd party apps

  }
  
  async getSpeaker(){

    try {
    
      if(!this.service.getCharacteristic(Characteristic.Active).value){
            
        let volume, mute;
            
        let audio = await this.Bravia.getVolumeInformation();
               
        audio.map( state => {
               
          if(state.target === 'speaker'){
                 
            volume = state.volume;
            mute = state.mute;
                 
          }
               
        });
               
        this.service.getCharacteristic(Characteristic.Mute).updateValue(mute);
        this.service.getCharacteristic(Characteristic.Volume).updateValue(volume);
            
      } else {
            
        this.service.getCharacteristic(Characteristic.Mute).updateValue(true);
        this.service.getCharacteristic(Characteristic.Volume).updateValue(0);
            
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
  
  async setMute(mute, callback){
  
    if(!await tcpprobe(this.accessory.context.ip, this.accessory.context.port)){
      this.logger.warn(this.accessory.displayName + ': Can not set mute state, TV currently offline!');
      callback();
      return;
    }
    
    if(!this.service.getCharacteristic(Characteristic.Active).value){
      this.logger.warn(this.accessory.displayName + ': Can not set mute state, TV not on!');
      callback();
      return;
    }

    try {
    
      this.logger.info(this.accessory.displayName + ': Mute: ' + mute);
      
      await this.Bravia.setAudioMute(mute);
    
    } catch(err){
    
      this.logger.error(this.accessory.displayName + ': An error occured while setting mute state!');
      this.logger.error(JSON.stringify(err, null, 4));
    
    } finally {
    
      callback();
    
    }
  
  }
  
  async setRemoteVolume(value, callback){
 
    //0: Increment
    //1: Decrement
    
    if(!await tcpprobe(this.accessory.context.ip, this.accessory.context.port)){
      this.logger.warn(this.accessory.displayName + ': Can not change volume, TV currently off!');
      callback();
      return;
    }
 
    let code = value ? 'AAAAAQAAAAEAAAATAw==' : 'AAAAAQAAAAEAAAASAw==';
 
    try {
  
      this.logger.info(this.accessory.displayName + ': Volume ' + (value ? 'down' : 'up'));
  
      await this.Bravia.setIRCC(code);
  
    } catch(err) {
  
      this.logger.error(this.accessory.displayName + ': An error occured while setting volume!');
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
    
    if(!this.service.getCharacteristic(Characteristic.Active).value){
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
      
        this.logger.error(this.accessory.displayName + ': An error occured while getting power state!'); 
        this.logger.error(JSON.stringify(err, null, 4));
      
      }
  
    } finally {
  
      setTimeout(this.getPowerState.bind(this), this.accessory.context.interval);
  
    }
  
  }
  
  async setPowerState(state, callback){
  
    if(!this.accessory.context.wol && !await tcpprobe(this.accessory.context.ip, this.accessory.context.port)){
      this.logger.warn(this.accessory.displayName + ': Can not change power state, TV currently off and WOL is not active!');
      callback();
      return;
    }
  
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
  
      this.logger.error(this.accessory.displayName + ': An error occured while setting new power state!'); 
      this.logger.error(JSON.stringify(err, null, 4));
  
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
  
        this.logger.error(this.accessory.displayName + ': An error occured while getting input state!'); 
        this.logger.error(JSON.stringify(err, null, 4));
  
      } finally {
      
        setTimeout(this.getInputState.bind(this), this.accessory.context.interval);
      
      }
      
    } else {
    
      setTimeout(this.getInputState.bind(this), 1000);
    
    }
  
  }
  
  async setInputState(value, callback){
  
    if(!await tcpprobe(this.accessory.context.ip, this.accessory.context.port)){
      this.logger.warn(this.accessory.displayName + ': Can not change input state, TV currently off!');
      callback();
      return;
    }
  
    let uri = this._uris.get(value);
  
    try {
    
      if(!this.service.getCharacteristic(Characteristic.Active).value){
      
        this.service.getCharacteristic(Characteristic.Active).setValue(true);
        this.service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(value);
        
        await timeout(6000);
        
      }
      
      for(const i of this._inputs){
        if(i[1]===uri)
          this.logger.info(this.accessory.displayName + ': Turn on ' + i[0]);
      }
      
      if(uri.includes('tv:')||uri.includes('extInput:')){
        await this.Bravia.setPlayContent(uri);
      } else if(uri.includes('AAAAA')){
        await this.Bravia.setIRCC(uri);
      } else {
        await this.Bravia.setActiveApp(uri);
      }

    } catch(err) {
  
      this.logger.error(this.accessory.displayName + ': An error occured while setting new input state!'); 
      this.logger.error(JSON.stringify(err, null, 4));
  
    } finally {
  
      callback();
  
    }
  
  }
  
  async setRemote(value, callback){
  
    if(!await tcpprobe(this.accessory.context.ip, this.accessory.context.port)){
      this.logger.warn(this.accessory.displayName + ': Can not send remote command, TV currently off!');
      callback();
      return;
    }
  
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
          await this.Bravia.setIRCC('AAAAAQAAAAEAAAA6Aw==');
    
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
  
      this.logger.error(this.accessory.displayName + ': An error occured while setting new remote key'); 
      this.logger.error(JSON.stringify(err, null, 4));
  
    } finally {
  
      callback();
  
    }
  
  }
  
  async _getInputs(){
  
    let inputArray = [];
    let error;

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
            
              error = this.accessory.displayName + ': Can not turn on TV! No MAC address in config.json! Please set up a valid MAC address or set WOL or CEC to false!';
            
            }
            
          }
          
          this.logger.info(this.accessory.displayName + ': TV switched ON!');
          this.logger.info(this.accessory.displayName + ': Wait 7s before fetching inputs..');
          
          await timeout(7000);
          
          this.activateTV = true;
       
        } else {
        
          this.logger.info(this.accessory.displayName + ': TV on! Fetching inputs...!');
          await timeout(7000);
        
        }

      }
      
      this.debug(this.accessory.displayName + ': Fetching External Inputs...');
    
      let inputs = await this.Bravia.getCurrentExternalInputsStatus();
  
      this.debug(this.accessory.displayName + ': Recived External Inputs!');
      
      this.debug(JSON.stringify(inputs, null, 4));
      
      inputs.map( input => {
      
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
    
        if(this.accessory.context.cecInputs){
           
          if(input.icon === 'meta:tv'||
          input.icon === 'meta:audiosystem'||
          input.icon === 'meta:recordingdevice'||
          input.icon === 'meta:playbackdevice'||
          input.icon === 'meta:tunerdevice'){

            input.sourceType = Characteristic.InputSourceType.HDMI;
            input.deviceType = Characteristic.InputDeviceType.PLAYBACK;

            inputArray.push(input); 
          
          }  
          
        }
  
      });
      
      this.debug(this.accessory.displayName + ': External Inputs fetched!');
          
      if(this.accessory.context.apps.length){  
      
        this.debug(this.accessory.displayName + ': Fetching apps...');
        
        let apps = await this.Bravia.getApplicationList();
        
        this.debug(this.accessory.displayName + ': Recived App List!');
    
        apps.map( app => {
    
          if(this.accessory.context.apps.includes(app.title)){
            
            app.sourceType = Characteristic.InputSourceType.APPLICATION;
            app.deviceType = Characteristic.InputDeviceType.TV;
            
            inputArray.push(app);
          }    
    
        });
        
        this.debug(this.accessory.displayName + ': Apps fetched!');
        
      }
      
      if(this.accessory.context.channelInputs.length||this.accessory.context.channels.length){
      
        if(this.accessory.context.channelInputs.length)
          this.debug(this.accessory.displayName + ': Fetching Channel Inputs...');
      
        if(this.accessory.context.channels.length)
          this.debug(this.accessory.displayName + ': Fetching Channels...');
      
        let schemeList = await this.Bravia.getSourceList('tv');
        
        this.debug(this.accessory.displayName + ': Recived accessible Channel Types!');
        
        let schemes = schemeList.map( scheme => {
        
          let type = scheme.source.split(':')[1].toUpperCase();
          return type;
        
        });
        
        this.logger.info(this.accessory.displayName + ': Checking Inputs for ' + schemes.toString().replace(',', ' and ') + '! Other channel sources are not considered!');
        
        for(const scheme of schemeList){
        
          if(this.accessory.context.channelInputs.length){
      
            this.accessory.context.channelInputs.map( channel => {
            
              let channelType = 'tv:' + channel.toLowerCase();
     
              if(channelType === scheme.source){
              
                inputArray.push({
                  title: channel,
                  uri: channelType,
                  sourceType: Characteristic.InputSourceType.TUNER,
                  deviceType: Characteristic.InputDeviceType.TV
                });
            
              }
              
            });
      
          }
          
          if(this.accessory.context.channels.length){
  
            for (const i of this.accessory.context.channels){
            
              let channelType = 'tv:' + i.source.toLowerCase();
              
              if(channelType === scheme.source){

                let channel = await this.Bravia.getContentList(channelType, 1, (i.channel-1));
                channel = channel[0];
          
                channel.sourceType = Characteristic.InputSourceType.TUNER;
                channel.deviceType = Characteristic.InputDeviceType.TV;
          
                inputArray.push(channel);
              
              }
              
            }

          }
        
        }
        
        if(this.accessory.context.channelInputs.length)
          this.debug(this.accessory.displayName + ': Channel Inputs fetched!');
      
        if(this.accessory.context.channels.length)
          this.debug(this.accessory.displayName + ': Channels fetched!');
      
      }
      
      if(this.accessory.context.commands.length){
      
        this.debug(this.accessory.displayName + ': Fetching extra commands...');
      
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
        
        this.debug(this.accessory.displayName + ': Extra commands fetched!');

      }
      
      if(this.activateTV){
        this.logger.info(this.accessory.displayName + ': New Inputs fetched. Turning off TV again.');
        await this.Bravia.setPowerStatus(false);
      }
      
      this.debug(this.accessory.displayName + ': Fetching inputs finished!');
      
      return inputArray;
  
    } catch(err){

      throw err;
  
    }
  
  }
  
  async _addAndRefreshInputs(){
  
    this.debug(this.accessory.displayName + ': Refreshing input list...');
  
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
        //tvInput.getCharacteristic(Characteristic.IsConfigured).updateValue(Characteristic.IsConfigured.CONFIGURED);
        tvInput.getCharacteristic(Characteristic.InputDeviceType).updateValue(deviceType);
        tvInput.getCharacteristic(Characteristic.InputSourceType).updateValue(sourceType);
          
        InputArray.push(tvInput);
  
      }
    
    }
    
    displayOrder.push(0x00, 0x00);
    
    this.service.getCharacteristic(Characteristic.DisplayOrder)
      .updateValue(Buffer.from(displayOrder).toString('base64'));
      
    this.debug(this.accessory.displayName + ': Finished refreshing!');
    
    return InputArray;
  
  }
  
  _removeInputs(finish){
  
    this.debug(this.accessory.displayName + ': Looking for removable inputs...');
  
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
    
    if(finish){
    
      this.debug(this.accessory.displayName + ': Stop looking for removable inputs!');  
    
      return;
    }
  
  }

}

module.exports = TelevisionAccessory;
