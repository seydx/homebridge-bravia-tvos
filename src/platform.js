'use strict';

const Device = require('./accessory.js');
const version = require('../package.json').version;
const LogUtil = require('../lib/LogUtil.js');
const http = require('http');
const async = require('async');

var HomebridgeAPI;

const pluginName = 'homebridge-bravia-tvos';
const platformName = 'BraviaOSPlatform';

module.exports = function (homebridge) {
  HomebridgeAPI = homebridge;
  return BraviaOSPlatform;
};

function BraviaOSPlatform (log, config, api) {
  if (!api || !config) return;

  log('Homebridge BraviaOSPlatform v' + version + ' loaded');

  // HB
  const self = this;
  this.log = log;
  this.logger = new LogUtil(null, log);
  this.accessories = [];
  this.HBpath = api.user.storagePath()+'/accessories';
  this.config = config;

  for(const i of Object.keys(this.config.tvs)){
    this.config.tvs[i] = {
      name: this.config.tvs[i].name||'TV ' + i,
      interval: (this.config.tvs[i].interval*1000)||10000,
      ipadress: this.config.tvs[i].ipadress,
      port: this.config.tvs[i].port||80,
      psk: this.config.tvs[i].psk,
      extraInputs: this.config.tvs[i].extraInputs||false,
      channelInputs: this.config.tvs[i].channelInputs||false,
      cecInputs: this.config.tvs[i].cecInputs||false,
      favApps: this.config.tvs[i].favApps||false
    };
    if(this.config.tvs[i].intervall<10000){
      self.logger.warn('Critical interval value. Setting interval to 10s for ' + this.config.tvs[i].name);
      this.config.tvs[i].interval = 10000;
    }
  }

  // STORAGE
  this.storage = require('node-persist');
  this.storage.initSync({
    dir: HomebridgeAPI.user.persistPath()
  });

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

  if (api) {
    if (api.version < 2.2) {
      throw new Error('Unexpected API version. Please update your homebridge!');
    }
    self.log('**************************************************************');
    self.log('BraviaOSPlatform v'+version+' by SeydX');
    self.log('GitHub: https://github.com/SeydX/homebridge-bravia-tvos');
    self.log('Email: seyd55@outlook.de');
    self.log('**************************************************************');
    self.log('start success...');
    this.api = api;
    this.api.on('didFinishLaunching', self.didFinishLaunching.bind(this));
  }
}

BraviaOSPlatform.prototype = {

  didFinishLaunching: function(){
    const self = this;
    self.checkStorage(false, function (err, state) {
      if(err||!state){
        if(err)self.logger.error(err);
        setTimeout(function(){
          self.didFinishLaunching();
        }, 5000);
      } else {
        self.initPlatform(state);
      }
    });
  },

  initPlatform: function(tvConfig){
    const self = this;
    self.storage.setItem('SonyTVs', tvConfig);
    var skipTV;
    let countTV = 0;
    let countTVCache = 0;

    for(const i in tvConfig){
      countTV += 1;
      if(!tvConfig[i].config.psk||!tvConfig[i].config.ipadress){
        self.logger.warn('Cant find ' + (!tvConfig[i].config.psk?'PSK':'IP Adresse') + ' for ' + tvConfig[i].name + '! Removing/Skipping this TV..');
        for(const l in self.accessories){
          if(self.accessories[l].displayName == tvConfig[i].name){
            console.log('Removing due to PSK/IP config error');
            self.removeAccessory(self.accessories[l]);
          }
        }
      } else {
        skipTV = false;
        for(const d in self.accessories){
          if(self.accessories[d].context.serial == tvConfig[i].device.serial){
            skipTV = true;
            self.logger.info('Connecting to ' + tvConfig[i].config.ipadress);
            self.configureAccessory(self.accessories[d],true);
          }
        }
        if(!skipTV){
          self.logger.info('Found new device: ' + tvConfig[i].device.model + ' (' + tvConfig[i].config.ipadress + ')');
          new Device(self,tvConfig[i],true);
        }
      }
    }

    for(const a in self.accessories){
      for(const b in tvConfig){
        if(self.accessories[a].displayName == tvConfig[b].name){
          countTVCache +=1;
        }
      }
      if(!countTVCache){
        countTVCache = 0;
        console.log('Cant find ' + self.accessories[a].displayName + ' in config anymore! Removing...');
        self.removeAccessory(self.accessories[a]);
      }
    }

    if(!countTV){
      //No tvs in config! Remove all TV from cache if exist
      if(self.accessories){
        console.log('No entry in config! Removing all accessories in cache...');
        for(const d in self.accessories){
          self.removeAccessory(self.accessories[d]);
        }
      }
    }
  },

  checkTVState: function(tvConfig, callback){
    const self = this;
    let name = tvConfig.name;
    self.getContent('/sony/system','getPowerStatus','1.0','1.0',tvConfig.ipadress,tvConfig.port,tvConfig.psk)
      .then((data)=>{
        const response=JSON.parse(data);
        if('error'in response){
          self.logger.error(response.error[0]);
          self.logger.error('Retrying...');
          setTimeout(function(){
            self.checkTVState(tvConfig, callback);
          }, 10000);
        }else{
          const currentPower=response.result[0].status;
          if(currentPower=='active'){

            self.checkTVSystem(tvConfig, function(err, state){
              if(err||!state){
                setTimeout(function(){
                  self.checkTVState(tvConfig, callback);
                }, 10000);
              } else {
                self.logger.info('TV on and system information received!');
                callback(null, state);
              }
            });

          }else if(currentPower=='standby'){
            self.logger.warn(name + ': TV standby! Please turn on the TV, retrying...');
            setTimeout(function(){
              self.checkTVState(tvConfig, callback);
            }, 10000);
          }else{
            self.logger.error(name + ': Could not determine TV state!! Retrying...');
            setTimeout(function(){
              self.checkTVState(tvConfig, callback);
            }, 10000);
          }
        }
      })
      .catch((err)=>{
        self.logger.error(name + ': ' + err);
        setTimeout(function(){
          self.checkTVState(tvConfig, callback);
        }, 10000);
      });
  },

  checkTVSystem: function(tvConfig, callback){
    const self = this; 
    let name = tvConfig.name;
    self.getContent('/sony/system','getSystemInformation','1.0','1.0',tvConfig.ipadress,tvConfig.port,tvConfig.psk)
      .then((data)=>{
        const response=JSON.parse(data);
        if('error'in response){
          if(response.error[0]==7||response.error[0]==40005){
            self.logger.warn(name + ': TV off');
          }else if(response.error[0]==3||response.error[0]==5){
            self.logger.warn(name + ': Illegal argument!');
          }else{
            self.logger.error(name + ': ERROR: '+JSON.stringify(response));
          }
          setTimeout(function(){
            self.checkTVSystem(tvConfig, callback);
          }, 10000);
        }else{
          self.logger.info('Getting system data from ' + name + ' (' + tvConfig.ipadress + ':' + tvConfig.port + ')');
          callback(null, response.result[0]);
        }
      })
      .catch((err)=>{
        self.logger.error(name + ': An error occured by getting system information, trying again...');
        self.logger.error(err);
        setTimeout(function(){
          self.checkTVSystem(tvConfig, callback);
        }, 10000);
      });
  },

  checkInputs: function(tvConfig, callback){
    const self = this;
    let name = tvConfig.name;
    self.getContent('/sony/avContent','getCurrentExternalInputsStatus','1.0','1.0',tvConfig.ipadress,tvConfig.port,tvConfig.psk)
      .then((data)=>{
        const response=JSON.parse(data);
        if('error'in response){
          if(response.error[0]==7||response.error[0]==40005){
            self.logger.warn(name + ': TV off');
          }else if(response.error[0]==3||response.error[0]==5){
            self.logger.warn(name + ': Illegal argument!');
          }else{
            self.logger.error(name + ': ERROR: '+JSON.stringify(response));
          }
          setTimeout(function(){
            self.checkInputs(tvConfig, callback);
          }, 10000);
        }else{
          self.logger.info('Getting data from ' + name + ' (' + tvConfig.ipadress + ':' + tvConfig.port + ')');
          const inputList = response.result[0];
          var inputsApps;
          self.logger.info(name + ': Found new inputs, checking config for apps...');
          if(tvConfig.favApps&&tvConfig.favApps.length>0){
            self.logger.info(name + ': Found apps in config, storing in cache...');
            for(const j in tvConfig.favApps){
              tvConfig.favApps[j]['icon']='meta:app';
            }
            inputsApps = inputList.concat(tvConfig.favApps);
          } else {
            inputsApps = inputList;
          }
          self.logger.info(name + ': Checking ' + name + ' for channels...');
          self.checkChannels(tvConfig,inputsApps, function(err, state){
            if(err||!state){
              if(err)self.logger.error(err);
              setTimeout(function(){
                self.checkInputs(tvConfig,callback);
              }, 5000);
            } else {
              let newConfig = {
                'name':tvConfig.name,
                'config':tvConfig,
                'inputs':state
              };
              callback(null, newConfig);
            }
          });
        }
      })
      .catch((err)=>{
        self.logger.error(name + ': An error occured by getting inputs, trying again...');
        self.logger.error(err);
        setTimeout(function(){
          self.checkInputs(tvConfig, callback);
        }, 10000);
      });
  },

  checkChannels: function(tvConfig,inputsApps, callback){
    const self = this;
    let name = tvConfig.name;
    self.getContent('/sony/avContent','getSourceList',{'scheme':'tv'},'1.0',tvConfig.ipadress,tvConfig.port,tvConfig.psk)
      .then((data)=>{
        const response=JSON.parse(data);
        if('error'in response){
          if(response.error[0]==7||response.error[0]==40005){
            self.logger.warn(name + ': TV off');
          }else if(response.error[0]==3||response.error[0]==5){
            self.logger.error(name + ': Illegal argument!');
          }else{
            self.logger.error(name + ': ERROR: '+JSON.stringify(response));
          }
          setTimeout(function(){
            self.checkChannels(tvConfig,inputsApps, callback);
          }, 10000);
        }else{
          const channelList = response.result[0];
          const inputs = inputsApps;
          const channels = [];
          for(const i in channelList){
            const str = channelList[i].source;
            const cap = str.split(':')[1].charAt(0).toUpperCase()+str.split(':')[1].slice(1);
            channels.push(cap);
            inputs.push({
              'title': cap,
              'uri':str,
              'icon':'meta:tv'
            });
          }
          self.logger.info(name + ': Found following sources: ' + JSON.stringify(channels));
          callback(null, inputs);
        }
      })
      .catch((err)=>{
        self.logger.error(name + ': An error occured by getting tv sources, trying again...');
        //self.logger.error(err);
        console.log(err);
        setTimeout(function(){
          self.checkChannels(tvConfig,inputsApps, callback);
        }, 10000);
      });
  },

  checkStorage: function (changed, callback) {
    const self = this;
    if(!self.storage.getItem('SonyTVs')||(self.storage.getItem('SonyTVs')&&Object.keys(self.config.tvs).length!=self.storage.getItem('SonyTVs').length||changed)){
      self.logger.info('TV needs to be on to store new data in cache! Requesting...');
      const parameter = [];
      async.waterfall([
        function(next) {
          function fetchTV(next) {
            for(const i of Object.keys(self.config.tvs)){
              let tvConfig=self.config.tvs[i];
              self.checkTVState(tvConfig, function (err, state) {
                if(err||!state){
                  if(err)self.logger.error(err);
                  setTimeout(function(){
                    fetchTV(next);
                  }, 5000);
                } else {
                  let tvInfo = state;
                  self.checkInputs(tvConfig, function (err, state) {
                    if(err||!state){
                      if(err)self.logger.error(err);
                      setTimeout(function(){
                        fetchTV(next);
                      }, 5000);
                    } else {
                      state.device = tvInfo;
                      parameter.push(state);
                      if(Object.keys(self.config.tvs).length == parameter.length){
                        next(null, parameter);
                      }
                    }
                  });
                }
              }); 
            }
          } fetchTV(next);
        }
      ], function (err, result) {
        if(err){
          self.logger.error(err);
        } else {
          self.logger.info('Storing Sony TV Data in cache...');
          self.storage.setItem('SonyTVs', result);
          callback(null, result);
        }
      });
    } else {
      self.checkData(self.storage.getItem('SonyTVs'), function(err, res){
        if(err||!res){
          callback(null, self.storage.getItem('SonyTVs'));
        } else {
          callback(null, res);
        }
      });
    }
  },

  //Refresh Config here
  checkData: function(existData, callback){
    const self = this;
    let configChanged = false;
    for(const i of Object.keys(self.config.tvs)){
      for(const d in existData){
        if(self.config.tvs[i].name==existData[d].name){
          let config = self.config.tvs[i];
          let data = existData[d];
          if(config.cecInputs!=data.config.cecInputs||config.channelInputs!=data.config.channelInputs||config.extraInputs!=data.config.extraInputs||(config.favApps&&data.config.favApps&&config.favApps.length!=data.config.favApps.length)){
            configChanged = true;
          }
        }
      }
    }
    if(configChanged){
      self.logger.info('Config.json has been changed!');
      self.checkStorage(true, function (err, state) {
        if(err||!state){
          if(err)self.logger.error(err);
          setTimeout(function(){
            self.checkData(existData, callback);
          }, 5000);
        } else {
          callback(null, state);
        }
      });
    } else {
      callback(null, existData);
    }
  },

  configureAccessory: function (accessory,conf) {
    const self = this;
    let inputs = self.storage.getItem('SonyTVs');
    accessory.reachable = true;
    //Refresh config
    for(const i in self.config.tvs){
      if(accessory.displayName == self.config.tvs[i].name){
        accessory.context.ipadress = self.config.tvs[i].ipadress;
        accessory.context.port = self.config.tvs[i].port||80;
        accessory.context.psk = self.config.tvs[i].psk;
        accessory.context.cecInputs = self.config.tvs[i].cecInputs||false;
        accessory.context.channelInputs = self.config.tvs[i].channelInputs||false;
        accessory.context.extraInputs = self.config.tvs[i].extraInputs||false;
        accessory.context.favApps = self.config.tvs[i].favApps||false;
        if(accessory.context.favApps&&accessory.context.favApps.length>0){
          for(const j in accessory.context.favApps){
            accessory.context.favApps[j].icon=='meta:app';
          }
        }
      }
    }
    if(inputs){
      for(const j in inputs){
        if(inputs[j].name==accessory.displayName){
          accessory.context.inputs=inputs[j].inputs;
        }
      }
    }
    self.accessories[accessory.displayName] = accessory;
    if(conf){
      self.logger.info('Configuring accessory: ' + accessory.displayName);
      new Device(self, accessory, false); 
    }
    //new Device(self, accessory, false);
  },

  removeAccessory: function (accessory) {
    if (accessory) {
      this.log.warn('Removing accessory: ' + accessory.displayName + '. No longer configured.');
      this.api.unregisterPlatformAccessories(pluginName, platformName, [accessory]);
      delete this.accessories[accessory.displayName];
    }
  }

};