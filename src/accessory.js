'use strict';

const wol = require('wake_on_lan');
const HomeKitTypes = require('./types.js');
const http = require('http');
const LogUtil = require('../lib/LogUtil.js');
const version = require('../package.json').version;

var Accessory, Service, Characteristic, UUIDGen, PlatformAccessory;

const pluginName = 'homebridge-bravia-tvos';
const platformName = 'BraviaOSPlatform';

class BRAVIAOS {
  constructor (platform, parameter, publish) {

    // HB
    PlatformAccessory = platform.api.platformAccessory;
    Accessory = platform.api.hap.Accessory;
    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;
    UUIDGen = platform.api.hap.uuid;
    HomeKitTypes.registerWith(platform.api.hap);

    const self = this;
    this.platform = platform;
    this.log = platform.log;
    this.logger = new LogUtil(null, platform.log);
    this.debug = platform.log.debug;
    this.info = platform.log.info;
    this.api = platform.api;
    this.config = platform.config;
    this.accessories = platform.accessories;
    this.HBpath = platform.api.user.storagePath()+'/accessories';
    this.tvConfig = parameter;

    this.error = {
      inputs: 0,
      tv: 0,
      speaker: 0
    };

    // STORAGE
    this.storage = require('node-persist');
    this.storage.initSync({
      dir: platform.api.user.persistPath()
    });

    //Sleep function
    this.sleep = function(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    };

    // Init req promise
    this.getContent=function (setPath,setMethod,setParams,setVersion,ip,port,psk){
      return new Promise((resolve,reject)=>{
        const options={
          host:ip,
          port:port,
          family:4,
          path:setPath,
          method:'POST',
          headers:{
            'X-Auth-PSK':psk
          }
        };
        const post_data={
          'method':setMethod,
          'params':[setParams],
          'id':1,
          'version':setVersion
        };
        const req=http.request(options,function (res){
          if(res.statusCode<200||res.statusCode>299){
            reject(new Error('Failed to load data, status code:'+res.statusCode));
          }
          const body=[];
          res.on('data',(chunk)=>body.push(chunk));
          res.on('end',()=>resolve(body.join('')));
        });
        req.on('error',(err)=>reject(err));
        req.write(JSON.stringify(post_data));
        req.end();
      });
    };

    this.getIRCC = function(setIRCC,ip,port,psk) {

      return new Promise((resolve, reject) => {
        var post_data = '<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1"><IRCCCode>' + setIRCC + '</IRCCCode></u:X_SendIRCC></s:Body></s:Envelope>';
        var options = {
          host: ip,
          path: '/sony/IRCC',
          port: port,
          method: 'POST',
          headers: {
            'X-Auth-PSK': psk,
            'SOAPACTION': '"urn:schemas-sony-com:service:IRCC:1#X_SendIRCC"',
            'Cookie': 'cookie',
            'Content-Type': 'text/xml',
            'Content-Length': Buffer.byteLength(post_data)
          }
        };
        var buffer = '';
        var req = http.request(options, function(res) {
          var buffer = '';
          if (res.statusCode < 200 || res.statusCode > 299) {
            reject(new Error('Failed to load data, status code: ' + res.statusCode));
          }
          const body = [];
          res.on('data', (chunk) => {
            buffer = buffer + chunk;
            body.push(buffer);
          });
          res.on('end', () => resolve(body.join(buffer)));
        });
        req.on('error', (err) => reject(err));
        req.write(post_data);
        req.end();
      });
    };

    if (publish) {
      this.addAccessory(self.tvConfig);
    } else {
      const accessory = parameter;
      this.getService(accessory);
    }
  }

  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************* ADD ACCESSORY ********************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/

  addAccessory (tvConfig) {
    var accessory, name, deviceType, accessoryType;

    name = tvConfig.config.name;
    deviceType = Accessory.Categories.TELEVISION;
    accessoryType = Service.Television;

    this.logger.info('Publishing new accessory: ' + name);

    accessory = this.accessories[name];
    const uuid = UUIDGen.generate(name);

    accessory = new PlatformAccessory(name, uuid, deviceType);
    accessory.addService(accessoryType, name);
    accessory.addService(Service.TelevisionSpeaker, name + ' Volume');

    // Setting reachable to true
    accessory.reachable = true;
    accessory.context = {};

    //Base
    accessory.context.name = tvConfig.name;
    accessory.context.serial = tvConfig.device.serial;
    accessory.context.model = tvConfig.device.model;
    accessory.context.macaddress = tvConfig.device.macAddr;
    accessory.context.ipadress = tvConfig.config.ipadress;
    accessory.context.wakeOnLan = tvConfig.config.wakeOnLan;
    accessory.context.port = tvConfig.config.port;
    accessory.context.psk = tvConfig.config.psk;
    accessory.context.extraInputs = tvConfig.config.extraInputs;
    accessory.context.channelInputs = tvConfig.config.channelInputs;
    accessory.context.cecInputs = tvConfig.config.cecInputs;
    accessory.context.favApps = tvConfig.config.favApps;
    accessory.context.inputs = tvConfig.inputs;


    //States
    accessory.context.lastTVState = false;
    accessory.context.lastActiveIdentifier = 0;
    accessory.context.isPaused = false;
    accessory.context.lastMuteState = false;
    accessory.context.lastVolume = 0;

    accessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Name, tvConfig.name)
      .setCharacteristic(Characteristic.Identify, tvConfig.name)
      .setCharacteristic(Characteristic.Manufacturer, 'SeydX')
      .setCharacteristic(Characteristic.Model, tvConfig.device.model)
      .setCharacteristic(Characteristic.SerialNumber, tvConfig.device.serial)
      .setCharacteristic(Characteristic.FirmwareRevision, require('../package.json').version);

    // Publish
    this.platform.api.registerPlatformAccessories(pluginName, platformName, [accessory]);

    // Cache
    this.accessories[name] = accessory;

    // Get services
    this.getService(accessory);
  }

  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************* SERVICES *************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/

  getService (accessory) {
    const self = this;

    //Refresh AccessoryInformation
    accessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Name, accessory.context.name)
      .setCharacteristic(Characteristic.Identify, accessory.context.name)
      .setCharacteristic(Characteristic.Manufacturer, 'SeydX')
      .setCharacteristic(Characteristic.Model, accessory.context.model)
      .setCharacteristic(Characteristic.SerialNumber, accessory.context.serial)
      .setCharacteristic(Characteristic.FirmwareRevision, require('../package.json').version);

    accessory.on('identify', function (paired, callback) {
      self.logger.info(accessory.displayName + ': Hi!');
      callback();
    });

    let service = accessory.getService(Service.Television);
    let speaker = accessory.getService(Service.TelevisionSpeaker);

    this.setNewInputs(accessory);

    service.getCharacteristic(Characteristic.ConfiguredName)
      .updateValue(accessory.context.name);

    service.getCharacteristic(Characteristic.SleepDiscoveryMode)
      .updateValue(Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

    service.getCharacteristic(Characteristic.Active)
      .updateValue(accessory.context.lastTVState)
      .on('set', self.setPowerState.bind(this, accessory, service));

    service.getCharacteristic(Characteristic.ActiveIdentifier)
      .updateValue(accessory.context.lastActiveIdentifier)
      .on('set', self.setInput.bind(this, accessory, service));

    if (!service.testCharacteristic(Characteristic.RemoteKey))service.addCharacteristic(Characteristic.RemoteKey);
    service.getCharacteristic(Characteristic.RemoteKey)
      .on('set', self.setRemote.bind(this, accessory, service));

    if (!service.testCharacteristic(Characteristic.PowerModeSelection))service.addCharacteristic(Characteristic.PowerModeSelection);
    service.getCharacteristic(Characteristic.PowerModeSelection)
      .on('set',function (newValue,callback){
        self.getIRCC('AAAAAgAAAJcAAAA2Aw==')
          .then((data) => {
            self.log('Open settings');
          })
          .catch((err) => {
            self.log(err);
          });
        callback(null);
      });

    let identifierMax = 0;

    let linkedServices = self.accessories[accessory.displayName].services;
    for(const i in linkedServices){
      if(linkedServices[i].subtype!==undefined){
        identifierMax += 1;
      }
    }

    service.getCharacteristic(Characteristic.ActiveIdentifier)
      .setProps({
        maxValue: identifierMax?identifierMax-1:99,
        minValue: 0,
        minStep: 1
      });

    if (!service.testCharacteristic(Characteristic.IdentName))service.addCharacteristic(Characteristic.IdentName);
    service.getCharacteristic(Characteristic.IdentName)
      .updateValue('Unknown');

    if (!service.testCharacteristic(Characteristic.Refresh))service.addCharacteristic(Characteristic.Refresh);
    service.getCharacteristic(Characteristic.Refresh)
      .updateValue(false)
      .on('set', function(state, callback) {
        if(state){
          self.logger.info('Refreshing input list, please restart homebridge after refreshing!');
          self.getAllInputs(accessory,service);
          setTimeout(function(){service.getCharacteristic(Characteristic.Refresh).setValue(false);},1000);
        }
        callback(null, false);
      });

    if (!speaker.testCharacteristic(Characteristic.Active))speaker.addCharacteristic(Characteristic.Active);
    speaker.getCharacteristic(Characteristic.Active)
      .updateValue(Characteristic.Active.ACTIVE);

    if (!speaker.testCharacteristic(Characteristic.VolumeControlType))speaker.addCharacteristic(Characteristic.VolumeControlType);
    speaker.getCharacteristic(Characteristic.VolumeControlType)
      .updateValue(Characteristic.VolumeControlType.ABSOLUTE);

    speaker.getCharacteristic(Characteristic.VolumeSelector)
      .on('set', self.setRemoteVolume.bind(this, accessory, speaker));

    speaker.getCharacteristic(Characteristic.Mute)
      .on('set', self.setMute.bind(this, accessory, speaker));

    if (!speaker.testCharacteristic(Characteristic.Volume))speaker.addCharacteristic(Characteristic.Volume);
    speaker.getCharacteristic(Characteristic.Volume)
      .on('set', self.setVolume.bind(this, accessory, speaker));

    service.addLinkedService(speaker);

    //States
    this.getPowerState(accessory,service);
    this.getVolumeState(accessory,speaker);
    this.getInputState(accessory,service);

  }

  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************* TELEVISION ***********************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/

  setNewInputs(accessory){
    const self=this;
    const actives=[];
    const inputs = accessory.context.inputs;

    //Remove Entries
    for(const j in inputs){
      if(inputs[j].icon=='meta:hdmi'){
        actives.push(inputs[j]);
      } else if(inputs[j].icon=='meta:playbackdevice'){
        if(accessory.context.cecInputs){
          actives.push(inputs[j]);
        }
      } else if(inputs[j].icon=='meta:composite'||inputs[j].icon=='meta:scart'||inputs[j].icon=='meta:wifidisplay'){
        if(accessory.context.extraInputs){
          actives.push(inputs[j]);
        }
      } else if(inputs[j].icon == 'meta:app'){
        if(accessory.context.favApps&&accessory.context.favApps.length>0){
          actives.push(inputs[j]);
        }
      } else if(inputs[j].icon=='meta:tv'){
        if(accessory.context.channelInputs){
          actives.push(inputs[j]);
        }
      }
    }

    //Unpublish entries
    for(const l in inputs){
      let thisTitle = inputs[l].title.toLowerCase().replace(/\s/g,'').split('/')[0];
      if(inputs[l].icon=='meta:playbackdevice'){
        if(!accessory.context.cecInputs){
          self.deleteInputSource(thisTitle,inputs[l].title,accessory);
        }
      } else if(inputs[l].icon=='meta:composite'||inputs[l].icon=='meta:scart'||inputs[l].icon=='meta:wifidisplay'){
        if(!accessory.context.extraInputs){
          self.deleteInputSource(thisTitle,inputs[l].title,accessory);
        }
      } else if(inputs[l].icon == 'meta:app'){
        if(!accessory.context.favApps&&!accessory.context.favApps.length>0){
          self.deleteInputSource(thisTitle,inputs[l].title,accessory);
        } else {
          for(const s in accessory.services){
            if(accessory.services[s].subtype!=undefined){
              let thisCharacteristic = accessory.services[s].characteristics;
              for(const c in thisCharacteristic){
                if(thisCharacteristic[c].displayName=='Typ'){
                  let type = thisCharacteristic[c].value;
                  if(type == 'meta:app'){
                    let remove = true;
                    for(const o in self.config.tvs){
                      for(const jo in self.config.tvs[o].favApps){
                        if(accessory.services[s].displayName==self.config.tvs[o].favApps[jo].title){
                          remove = false;
                        }
                      }
                    }
                    if(remove){
                      let appTitle = accessory.services[s].displayName.toLowerCase().replace(/\s/g,'').split('/')[0];
                      self.deleteInputSource(appTitle,accessory.services[s].displayName,accessory);
                    }
                  }
                }
              }
            }
          }
        }
      } else if(inputs[l].icon=='meta:tv'){
        if(!accessory.context.channelInputs){
          self.deleteInputSource(thisTitle,inputs[l].title,accessory);
        }
      }
    }

    //Publish Entries
    for(const i in actives){
      const newTitle=actives[i].title.toLowerCase().replace(/\s/g,'').split('/')[0];
      if(actives[i].icon=='meta:hdmi'){
        self.createInputSource(newTitle,actives[i].title,i,3,1,actives[i].icon,accessory);
      } else if(actives[i].icon=='meta:playbackdevice'){
        if(accessory.context.cecInputs){
          self.createInputSource(newTitle,actives[i].title,i,0,4,actives[i].icon,accessory);
        }
      } else if(actives[i].icon=='meta:composite'||actives[i].icon=='meta:scart'||actives[i].icon=='meta:wifidisplay'){
        if(accessory.context.extraInputs){
          self.createInputSource(newTitle,actives[i].title,i,4,1,'meta:extras',accessory);
        }
      }else if(actives[i].icon == 'meta:app'){
        if(accessory.context.favApps&&accessory.context.favApps.length>0){
          self.createInputSource(newTitle,actives[i].title,i,10,1,actives[i].icon,accessory);
        }
      } else if(actives[i].icon=='meta:tv'){
        if(accessory.context.channelInputs){
          self.createInputSource(newTitle,actives[i].title,i,2,3,actives[i].icon,accessory);
        }
      }
    }

    self.logger.info(accessory.context.name + ': Inputlist finished');
    self.logger.info(accessory.context.name + ': Welcome to Sony Bravia TV OS ' + version + ' - Below your Identifier list to create rules in 3rd party apps');
    for(const ident in actives){
      self.logger.info(accessory.context.name + ': (' + ident + ') ' + actives[ident].title);
    }

  }

  setPowerState(accessory, service, state, callback){
    const self = this;
    state?state=true:state=false;
    if(accessory.context.wakeOnLan && state) {
      self.logger.info(accessory.context.name +": Using WakeOnLan to turn on TV (state:" + state + ")...");
      const mac = accessory.context.macaddress
      wol.wake(mac, error => {
        if(error) {
          self.logger.error(accessory.context.name +": ERROR: WakeOnLan failed - " + JSON.stringify(error));
        }
        else {
          accessory.context.lastTVState=true;
        }
        callback(null,accessory.context.lastTVState);
      });
    }
    else {
      self.getContent('/sony/system','setPowerStatus',{
        'status':state
      },'1.0',accessory.context.ipadress,accessory.context.port,accessory.context.psk)
        .then((data)=>{
          const response=JSON.parse(data);
          if('error' in response){
            if(response.error[0]==7||response.error[0]==40005){
              self.logger.warn(accessory.context.name + ': TV OFF!');
              accessory.context.lastTVState = false;
            }else if(response.error[0]==3||response.error[0]==5){
              self.logger.error(accessory.context.name + ': Illegal argument!');
              accessory.context.lastTVState=false;
            }else{
              self.logger.error(accessory.context.name + ': ERROR:'+JSON.stringify(response));
              accessory.context.lastTVState=false;
            }
          }else{
            state?self.logger.info(accessory.context.name + ': ON'):self.logger.info(accessory.context.name + ': OFF');
            accessory.context.lastTVState=state;
          }
          service.getCharacteristic(Characteristic.Active).updateValue(accessory.context.lastTVState);
          callback(null,accessory.context.lastTVState);
        })
        .catch((err)=>{
          accessory.context.lastTVState=false;
          self.logger.error('Can\'t set '+accessory.context.name+(state?' on! ':' off! ')+err);
          callback(null,accessory.context.lastTVState);
        });
    }
  }

  setInput(accessory, service, newValue,callback){
    const self=this;
    const actives=[];

    const inputs = accessory.context.inputs;
    //Remove Entries
    for(const j in inputs){
      if(inputs[j].icon=='meta:hdmi'){
        actives.push(inputs[j]);
      } else if(inputs[j].icon=='meta:playbackdevice'){
        if(accessory.context.cecInputs)actives.push(inputs[j]);
      } else if(inputs[j].icon=='meta:composite'||inputs[j].icon=='meta:scart'||inputs[j].icon=='meta:wifidisplay'){
        if(accessory.context.extraInputs)actives.push(inputs[j]);
      } else if(inputs[j].icon == 'meta:app'){
        if(accessory.context.favApps&&accessory.context.favApps.length>0)actives.push(inputs[j]);
      } else if(inputs[j].icon=='meta:tv'){
        if(accessory.context.channelInputs)actives.push(inputs[j]);
      }
    }

    for(const i in actives){
      if(newValue==i){
        if(actives[i].icon!='meta:app'){
          self.getContent('/sony/avContent','setPlayContent',{'uri':actives[i].uri},'1.0',accessory.context.ipadress,accessory.context.port,accessory.context.psk)
            .then((data)=>{
              const response=JSON.parse(data);
              if('error'in response){
                if(response.error[0]==7||response.error[0]==40005){
                  self.logger.warn(accessory.context.name + ': TV OFF');
                }else if(response.error[0]==3||response.error[0]==5){
                  self.logger.error(accessory.context.name + ': Illegal argument!');
                }else if(response.error[0]==41001){
                  self.logger.error(accessory.context.name + ': Channel source doesnt exist!');
                }else{
                  self.logger.error(accessory.context.name + ': ERROR:'+JSON.stringify(response));
                }
                service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(999);
                service.getCharacteristic(Characteristic.IdentName).updateValue('Unknown');
              }else{
                self.logger.info(accessory.context.name + ': Start: '+actives[i].title+' ('+i+')');
                service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(newValue);
                service.getCharacteristic(Characteristic.IdentName).updateValue(actives[i].title);
              }
            })
            .catch((err)=>{
              service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(999);
              service.getCharacteristic(Characteristic.IdentName).updateValue('Unknown');
              self.logger.error(accessory.context.name + ': An error occured by setting new input! Try again..');
              self.logger.error(accessory.context.name + ': ' + err);
            });
        } else {
          self.getContent('/sony/appControl','setActiveApp',{'uri':actives[i].uri},'1.0',accessory.context.ipadress,accessory.context.port,accessory.context.psk)
            .then((data)=>{
              const response=JSON.parse(data);
              if('error'in response){
                if(response.error[0]==7||response.error[0]==40005){
                  self.logger.warn(accessory.context.name + ': TV OFF');
                }else if(response.error[0]==3||response.error[0]==5){
                  self.logger.error(accessory.context.name + ': Illegal argument!');
                }else{
                  self.logger.error(accessory.context.name + ': ERROR:'+JSON.stringify(response));
                }
                service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(999);
                service.getCharacteristic(Characteristic.IdentName).updateValue('Unknown');
              }else{
                accessory.context.lastAppName = actives[i].title;
                accessory.context.lastAppNr = newValue;
                self.logger.info(accessory.context.name + ': Start: '+actives[i].title+' ('+i+')');
                service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(newValue);
                service.getCharacteristic(Characteristic.IdentName).updateValue(actives[i].title);
              }
            })
            .catch((err)=>{
              service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(999);
              service.getCharacteristic(Characteristic.IdentName).updateValue('Unknown');
              self.logger.error(accessory.context.name + ': An error occured by setting new app! Try again..');
              self.logger.error(accessory.context.name + ': ' + err);
            });
        }
      }
    }
    callback();
  }

  setRemote(accessory, service, newValue,callback){
    const self=this;
    var ircc;
    switch (newValue){
      case 0: //Characteristic.RemoteKey.REWIND = 0;
        ircc = 'AAAAAgAAAJcAAAAbAw==';
        break;
      case 1: //Characteristic.RemoteKey.FAST_FORWARD = 1;
        ircc = 'AAAAAgAAAJcAAAAcAw=';
        break;
      case 2: //Characteristic.RemoteKey.NEXT_TRACK = 2;
        ircc = 'AAAAAgAAAJcAAAA9Aw==';
        break;
      case 3: //Characteristic.RemoteKey.PREVIOUS_TRACK = 3;
        ircc = 'AAAAAgAAAJcAAAA8Aw==';
        break;
      case 4: //Characteristic.RemoteKey.ARROW_UP = 4;
        ircc = 'AAAAAQAAAAEAAAB0Aw==';
        break;
      case 5: //Characteristic.RemoteKey.ARROW_DOWN = 5;
        ircc = 'AAAAAQAAAAEAAAB1Aw==';
        break;
      case 6: //Characteristic.RemoteKey.ARROW_LEFT = 6;
        ircc = 'AAAAAQAAAAEAAAA0Aw==';
        break;
      case 7: //Characteristic.RemoteKey.ARROW_RIGHT = 7;
        ircc = 'AAAAAQAAAAEAAAAzAw==';
        break;
      case 8: //Characteristic.RemoteKey.SELECT = 8;
        ircc = 'AAAAAQAAAAEAAABlAw==';
        break;
      case 9: //Characteristic.RemoteKey.BACK = 9;
        ircc = 'AAAAAgAAAJcAAAAjAw==';
        break;
      case 10: //Characteristic.RemoteKey.EXIT = 10;
        ircc = 'AAAAAQAAAAEAAABjAw==';
        break;
      case 11: //Characteristic.RemoteKey.PLAY_PAUSE = 11;
        if(!accessory.context.isPaused){
          ircc = 'AAAAAgAAABoAAABnAw==';
          accessory.context.isPaused = true;
        } else {
          ircc = 'AAAAAgAAAJcAAAAaAw==';
          accessory.context.isPaused = false;
        }
        break;
      case 15: //Characteristic.RemoteKey.INFORMATION = 15;
        ircc = 'AAAAAgAAAJcAAAAWAw==';
        break;
      default: //Home
        ircc = 'AAAAAQAAAAEAAABgAw==';
    }

    self.getIRCC(ircc, accessory.context.ipadress, accessory.context.port, accessory.context.psk)
      .then((data) => {
        switch (newValue){
          case 0: //Characteristic.RemoteKey.REWIND = 0;
            self.logger.info(accessory.context.name + ': Rewind');
            break;
          case 1: //Characteristic.RemoteKey.FAST_FORWARD = 1;
            self.logger.info(accessory.context.name + ': Fast forward');
            break;
          case 2: //Characteristic.RemoteKey.NEXT_TRACK = 2;
            self.logger.info(accessory.context.name + ': Next track');
            break;
          case 3: //Characteristic.RemoteKey.PREVIOUS_TRACK = 3;
            self.logger.info(accessory.context.name + ': Previous track');
            break;
          case 4: //Characteristic.RemoteKey.ARROW_UP = 4;
            self.logger.info(accessory.context.name + ': Up');
            break;
          case 5: //Characteristic.RemoteKey.ARROW_DOWN = 5;
            self.logger.info(accessory.context.name + ': Down');
            break;
          case 6: //Characteristic.RemoteKey.ARROW_LEFT = 6;
            self.logger.info(accessory.context.name + ': Left');
            break;
          case 7: //Characteristic.RemoteKey.ARROW_RIGHT = 7;
            self.logger.info(accessory.context.name + ': Right');
            break;
          case 8: //Characteristic.RemoteKey.SELECT = 8;
            self.logger.info(accessory.context.name + ': Select');
            break;
          case 9: //Characteristic.RemoteKey.BACK = 9;
            self.logger.info(accessory.context.name + ': Back');
            break;
          case 10: //Characteristic.RemoteKey.EXIT = 10;
            self.logger.info(accessory.context.name + ': Exit');
            break;
          case 11: //Characteristic.RemoteKey.PLAY_PAUSE = 11;
            if(!accessory.context.isPaused){
              self.logger.info(accessory.context.name + ': Pause');
            } else {
              self.logger.info(accessory.context.name + ': Play');
            }
            break;
          case 15: //Characteristic.RemoteKey.INFORMATION = 15;
            self.logger.info(accessory.context.name + ': Information');
            break;
          default: //Home
            self.logger.info(accessory.context.name + ': Home');
        }
      })
      .catch((err) => {
        self.logger.error(accessory.context.name + ': ' + err);
      });

    callback();
  }

  getPowerState(accessory, service){
    const self=this;
    self.getContent('/sony/system','getPowerStatus','1.0','1.0',accessory.context.ipadress,accessory.context.port,accessory.context.psk)
      .then((data)=>{
        const response=JSON.parse(data);
        if('error'in response){
          if(response.error[0]==7||response.error[0]==40005){
            self.logger.warn(accessory.context.name + ': OFF');
            accessory.context.lastTVState=false;
          }else if(response.error[0]==3||response.error[0]==5){
            self.logger.error(accessory.context.name + ': Illegal argument!');
            accessory.context.lastTVState=false;
          }else{
            self.logger.error(accessory.context.name + ': ERROR: '+JSON.stringify(response));
            accessory.context.lastTVState=false;
          }
        }else{
          const currentPower=response.result[0].status;
          if(currentPower=='active'){
            accessory.context.lastTVState=true;
          }else if(currentPower=='standby'){
            accessory.context.lastTVState=false;
          }else{
            self.log('Could not determine TV status!');
            accessory.context.lastTVState=false;
          }
        }
        service.getCharacteristic(Characteristic.Active).updateValue(accessory.context.lastTVState);
        self.error.tv = 0;
        setTimeout(function (){
          self.getPowerState(accessory, service);
        },accessory.context.interval+((Math.random() * (20 - 5) + 5)*1000));
      })
      .catch((err)=>{
        self.error.tv += 1;
        if(self.error.tv >= 5){
          self.error.tv = 0;
          self.logger.error(accessory.context.name + ': An error occured by getting tv state! Trying again..');
          self.logger.error(err);
        }
        service.getCharacteristic(Characteristic.Active).updateValue(accessory.context.lastTVState);
        setTimeout(function (){
          self.getPowerState(accessory, service);
        },accessory.context.interval+((Math.random() * (20 - 5) + 5)*1000));
      });
  }

  getVolumeState(accessory,speaker){
    const self=this;
    this.getContent('/sony/audio', 'getVolumeInformation', '1.0', '1.0',accessory.context.ipadress,accessory.context.port,accessory.context.psk)
      .then((data) => {
        const response = JSON.parse(data);
        if ('result' in response) {
          const name = response.result[0];
          for (var i = 0; i < name.length; i++) {
            if (name[i].target.match('speaker')) {
              accessory.context.lastMuteState = name[i].mute == false;
              accessory.context.lastVolume = name[i].volume;
            }
          }
        } else {
          accessory.context.lastMuteState = false;
          accessory.context.lastVolume = 0;
        }
        speaker.getCharacteristic(Characteristic.Mute).updateValue(accessory.context.lastMuteState?false:true);
        speaker.getCharacteristic(Characteristic.Volume).updateValue(accessory.context.lastVolume);
        self.error.speaker = 0;
        setTimeout(function() {
          self.getVolumeState(accessory,speaker);
        }, accessory.context.interval+((Math.random() * (20 - 5) + 5)*1000));
      })
      .catch((err) => {
        self.error.speaker += 1;
        if(self.error.speaker >= 5){
          self.error.speaker = 0;
          self.logger.error(accessory.context.name + ': An error occured by getting volume state! Trying again..');
          self.logger.error(err);
        }
        speaker.getCharacteristic(Characteristic.Mute).updateValue(accessory.context.lastMuteState?false:true);
        speaker.getCharacteristic(Characteristic.Volume).updateValue(accessory.context.lastVolume);
        setTimeout(function() {
          self.getVolumeState(accessory,speaker);
        }, accessory.context.interval+((Math.random() * (20 - 5) + 5)*1000));
      });
  }

  getInputState(accessory,service){
    const self = this;
    const actives=[];

    const inputs = accessory.context.inputs;
    //Remove Entries
    for(const j in inputs){
      if(inputs[j].icon=='meta:hdmi'){
        actives.push(inputs[j]);
      } else if(inputs[j].icon=='meta:playbackdevice'){
        if(accessory.context.cecInputs)actives.push(inputs[j]);
      } else if(inputs[j].icon=='meta:composite'||inputs[j].icon=='meta:scart'||inputs[j].icon=='meta:wifidisplay'){
        if(accessory.context.extraInputs)actives.push(inputs[j]);
      } else if(inputs[j].icon == 'meta:app'){
        if(accessory.context.favApps&&accessory.context.favApps.length>0)actives.push(inputs[j]);
      } else if(inputs[j].icon=='meta:tv'){
        if(accessory.context.channelInputs)actives.push(inputs[j]);
      }
    }

    self.getContent('/sony/avContent','getPlayingContentInfo','1.0','1.0',accessory.context.ipadress,accessory.context.port,accessory.context.psk)
      .then((data)=>{
        const response=JSON.parse(data);
        if('error'in response){
          if(response.error[0]==40005){
            //self.log('TV off');
            service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(99999);
            service.getCharacteristic(Characteristic.IdentName).updateValue('Unknown');
          } else if(response.error[0]==7){
            //Illegal State (Application?)
            accessory.context.lastAppNr?accessory.context.lastAppNr:999;
            accessory.context.lastAppName?accessory.context.lastAppName:'Unknown';
            service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(accessory.context.lastAppNr);
            service.getCharacteristic(Characteristic.IdentName).updateValue(accessory.context.lastAppName);
          } else if(response.error[0]==3||response.error[0]==5){
            self.logger.error(accessory.context.name + ': Illegal argument!');
            service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(99999);
            service.getCharacteristic(Characteristic.IdentName).updateValue('Unknown');
          }else{
            self.logger.error(accessory.context.name + ': ERROR:'+JSON.stringify(response));
            service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(99999);
            service.getCharacteristic(Characteristic.IdentName).updateValue('Unknown');
          }
        }else{
          for(const i in actives){
            var source, str, cap;
            if(accessory.context.channelInputs){
              str = actives[i].title;
              cap = ['tv:',str.toLowerCase(str)];
              source = cap.toString(cap).replace(',', '');
            }
            if(actives[i].title==response.result[0].title||actives[i].uri==response.result[0].uri||source==response.result[0].source){
              service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(i);
              service.getCharacteristic(Characteristic.IdentName).updateValue(actives[i].title);
            }
          }
        }
        self.error.input = 0;
        setTimeout(function (){
          self.getInputState(accessory,service);
        },accessory.context.interval+((Math.random() * (20 - 5) + 5)*1000));
      })
      .catch((err)=>{
        self.error.input += 1;
        if(self.error.input >= 5){
          self.error.input = 0;
          self.logger.error(accessory.context.name + ': An error occured by getting input state! Trying again..');
          self.logger.error(err);
        }
        service.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(99999);
        service.getCharacteristic(Characteristic.IdentName).updateValue('Unknown');
        setTimeout(function (){
          self.getInputState(accessory,service);
        },accessory.context.interval+((Math.random() * (20 - 5) + 5)*1000));
      });
  }

  getAllInputs(accessory,service){
    const self=this;
    self.log('Getting all available inputs, TV needs to be turned on...');
    if(!service.getCharacteristic(Characteristic.Active).value){
      service.getCharacteristic(Characteristic.Active).setValue(true);
      self.getAllInputs(accessory,service);
    }

    self.log('TV is on, getting inputs...');
    self.getContent('/sony/avContent','getCurrentExternalInputsStatus','1.0','1.0',accessory.context.ipadress,accessory.context.port,accessory.context.psk)
      .then((data)=>{
        const response=JSON.parse(data);
        if('error'in response){
          if(response.error[0]==7||response.error[0]==40005){
            self.logger.warn(accessory.context.name + ': OFF');
          }else if(response.error[0]==3||response.error[0]==5){
            self.logger.error(accessory.context.name + ': Illegal argument!');
          }else{
            self.logger.error(accessory.context.name + ': ERROR: '+JSON.stringify(response));
          }
        }else{
          const inputList = response.result[0];
          var inputsApps;
          self.logger.info(accessory.context.name + ': Found new inputs, checking config for apps...');
          if(accessory.context.favApps&&accessory.context.favApps.length>0){
            self.logger.info(accessory.context.name + ': Found apps in config, writing in cache...');
            for(const i in accessory.context.favApps){
              accessory.context.favApps[i]['icon']='meta:app';
            }
            inputsApps = inputList.concat(accessory.context.favApps);
          } else {
            inputsApps = inputList;
          }
          if(accessory.context.channelInputs){
            self.getChannelSources(inputsApps,accessory,service);
          } else {
            accessory.context.inputs = inputsApps;
          }
        }
      })
      .catch((err)=>{
        self.logger.error(accessory.context.name + ': An error occured by getting inputs, trying again...');
        self.logger.error(err);
        setTimeout(function (){
          self.getAllInputs(accessory,service);
        },accessory.context.interval);
      });

  }

  getChannelSources(currentList,accessory,service){
    const self = this;
    self.logger.info(accessory.context.name + ': Channels enabled in config, writing channel sources in cache...');
    self.getContent('/sony/avContent','getSourceList',{'scheme':'tv'},'1.0',accessory.context.ipadress,accessory.context.port,accessory.context.psk)
      .then((data)=>{
        const response=JSON.parse(data);
        if('error'in response){
          if(response.error[0]==7||response.error[0]==40005){
            self.logger.warn(accessory.context.name + ': OFF');
          }else if(response.error[0]==3||response.error[0]==5){
            self.logger.error(accessory.context.name + ': Illegal argument!');
          }else{
            self.logger.error(accessory.context.name + ': ERROR: '+JSON.stringify(response));
          }
        }else{
          const channelList = response.result[0];
          const inputs = currentList;
          for(const i in channelList){
            const str = channelList[i].source;
            const cap = str.split(':')[1].charAt(0).toUpperCase()+str.split(':')[1].slice(1);
            inputs.push({
              'title': cap,
              'uri':str,
              'icon':'meta:tv'
            });
          }
          accessory.context.inputs = inputs;
        }
      })
      .catch((err)=>{
        self.logger.error(accessory.context.name + ': An error occured by getting tv sources, trying again...');
        self.logger.error(err);
        setTimeout(function (){
          self.getChannelSources(currentList,accessory,service);
        },accessory.context.interval);
      });
  }

  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************* SPEAKER **************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/

  setRemoteVolume(accessory, service, newValue,callback){
    const self=this;
    if(newValue == 0){
      self.getIRCC('AAAAAQAAAAEAAAASAw==', accessory.context.ipadress, accessory.context.port, accessory.context.psk)
        .then((data) => {
          self.logger.info(accessory.context.name + ': Volume +1');
        })
        .catch((err) => {
          self.log(err);
        });
    } else {
      self.getIRCC('AAAAAQAAAAEAAAATAw==', accessory.context.ipadress, accessory.context.port, accessory.context.psk)
        .then((data) => {
          self.logger.info(accessory.context.name + ': Volume -1');
        })
        .catch((err) => {
          self.logger.error(accessory.context.name + ': ' + err);
        });
    }
    callback();
  } 

  setMute(accessory, service, mute,callback){
    const self=this;
    this.getContent('/sony/audio', 'setAudioMute', {
      'status': mute
    }, '1.0', accessory.context.ipadress, accessory.context.port, accessory.context.psk)
      .then((data) => {
        const response = JSON.parse(data);
        if ('error' in response) {
          if (response.error[0] == 7 || response.error[0] == 40005) {
            self.logger.warn(accessory.context.name + ': OFF');
            accessory.context.lastMuteState = false;
          } else if (response.error[0] == 3 || response.error[0] == 5) {
            self.logger.error(accessory.context.name + ': Illegal argument!');
            accessory.context.lastMuteState = false;
          } else {
            self.logger.error(accessory.context.name + ': ERROR: ' + JSON.stringify(response));
            accessory.context.lastMuteState = false;
          }
        } else {
          accessory.context.lastMuteState = true;
        }
        mute?self.logger.info(accessory.context.name + ': Mute'):self.logger.info(accessory.context.name + ': Volume up');
        service.getCharacteristic(Characteristic.Mute).updateValue(accessory.context.lastMuteState);
        callback(null, mute);
      })
      .catch((err) => {
        self.logger.error(accessory.context.name + ': ' + err);
        service.getCharacteristic(Characteristic.Mute).updateValue(accessory.context.lastMuteState);
        callback(null, mute);
      });
  }

  setVolume(accessory, service, value,callback){
    const self=this;
    const newValue = value.toString();
    this.getContent('/sony/audio', 'setAudioVolume', {
      'target': 'speaker',
      'volume': newValue
    }, '1.0', accessory.context.ipadress, accessory.context.port, accessory.context.psk)
      .then((data) => {
        const response = JSON.parse(data);
        if ('error' in response) {
          if (response.error[0] == 7 || response.error[0] == 40005) {
            self.logger.warn(accessory.context.name + ': OFF');
            accessory.context.lastVolume = 0;
          } else if (response.error[0] == 3 || response.error[0] == 5) {
            self.logger.error(accessory.context.name + ': Illegal argument!');
            accessory.context.lastVolume = 0;
          } else {
            self.logger.error(accessory.context.name + ': ' + JSON.stringify(response));
            accessory.context.lastVolume = 0;
          }
        } else {
          self.logger.info(accessory.context.name + ' Volume: ' + value);
          accessory.context.lastVolume = value;
        }
        service.getCharacteristic(Characteristic.Volume).updateValue(accessory.context.lastVolume);
      })
      .catch((err) => {
        self.logger.error(accessory.context.name + ': ' + err);
        service.getCharacteristic(Characteristic.Volume).updateValue(accessory.context.lastVolume);
      });
    callback();
  }

  createInputSource(id,name,number,type,devType,meta,accessory){

    const self = this;

    if(!accessory.getServiceByUUIDAndSubType(name,id)){
      this.logger.info('Adding new Input Source: ' + name);
      let input = new Service.InputSource(name,id);
      input
        .setCharacteristic(Characteristic.Identifier,number)
        .setCharacteristic(Characteristic.ConfiguredName,name)
        .setCharacteristic(Characteristic.IsConfigured,Characteristic.IsConfigured.CONFIGURED)
        .setCharacteristic(Characteristic.InputSourceType,type)
        .setCharacteristic(Characteristic.InputDeviceType, devType)
        .setCharacteristic(Characteristic.CurrentVisibilityState,0);

      input.addCharacteristic(Characteristic.IdentNr);
      input.setCharacteristic(Characteristic.IdentNr, number.toString());
      input.addCharacteristic(Characteristic.metaType);
      input.setCharacteristic(Characteristic.metaType, meta);

      accessory.addService(input);
      accessory.getService(Service.Television).addLinkedService(accessory.getServiceByUUIDAndSubType(name,id));
    } else {
      let exInput = accessory.getServiceByUUIDAndSubType(name,id);

      exInput.getCharacteristic(Characteristic.Identifier).updateValue(number);

      if(!exInput.testCharacteristic(Characteristic.IdentNr))exInput.addCharacteristic(Characteristic.IdentNr);
      exInput.getCharacteristic(Characteristic.IdentNr).updateValue(number.toString());

      if(!exInput.testCharacteristic(Characteristic.metaType))exInput.addCharacteristic(Characteristic.metaType);
      exInput.getCharacteristic(Characteristic.metaType).updateValue(meta);

      accessory.getService(Service.Television).addLinkedService(accessory.getServiceByUUIDAndSubType(name,id));

    }

    //Update ActiveIdentifier props
    let identifierMax = 0;

    let linkedServices = self.accessories[accessory.displayName].services;
    for(const i in linkedServices){
      if(linkedServices[i].subtype!==undefined){
        identifierMax += 1;
      }
    }

    accessory.getService(Service.Television).getCharacteristic(Characteristic.ActiveIdentifier)
      .setProps({
        maxValue: identifierMax?identifierMax-1:99,
        minValue: 0,
        minStep: 1
      });

  }

  deleteInputSource(id,name,accessory){
    const self = this;
    if(accessory.getServiceByUUIDAndSubType(name,id)){
      this.logger.info('Deleting Input Source: ' + name);
      accessory.removeService(accessory.getServiceByUUIDAndSubType(name,id));

      //Update ActiveIdentifier props
      let identifierMax = 0;
      let linkedServices = self.accessories[accessory.displayName].services;
      for(const i in linkedServices){
        if(linkedServices[i].subtype!==undefined){
          identifierMax += 1;
        }
      }
      accessory.getService(Service.Television).getCharacteristic(Characteristic.ActiveIdentifier)
        .setProps({
          maxValue: identifierMax?identifierMax-1:99,
          minValue: 0,
          minStep: 1
        });
    }
  }

}

module.exports = BRAVIAOS;