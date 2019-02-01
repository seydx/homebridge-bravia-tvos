'use strict';

const http=require('http');
const inherits = require('util').inherits;

var Service,Characteristic,HomebridgeAPI;

module.exports=function (homebridge){
  HomebridgeAPI=homebridge;
  Service=homebridge.hap.Service;
  Characteristic=homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-bravia-tvos','BraviaTVOS',BraviaTVOS);
};

function BraviaTVOS(log,config,api){

  const self=this;

  //HB
  this.config=config;
  this.log=log;
  this.api=api;

  //Custom Characteristic (refresh button)
  Characteristic.Refresh = function() {
    Characteristic.call(this, 'Refresh', '0dd89185-f68c-4116-84fe-fcd28e49d215');
    this.setProps({
      format: Characteristic.Formats.BOOL,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  inherits(Characteristic.Refresh, Characteristic);
  Characteristic.Refresh.UUID = '0dd89185-f68c-4116-84fe-fcd28e49d215';

  //BASE
  this.name=config.name||'Television';
  this.psk=config.psk;
  if(!this.psk)throw new Error('Pre-Shared-Key is required!');
  this.ipadress=config.ipadress;
  if(!this.ipadress)throw new Error('IP Adress is required!');
  this.port=config.port||80;
  this.interval=(config.interval*1000)||10000;
  if((this.interval/1000)<10){
    this.log('Critical interval value! Setting interval to 10 seconds');
    this.interval=10000;
  }
  this.extraInputs = config.extraInputs||false;
  this.cecInputs = config.cecInputs||false;
  this.channelInputs = config.channelInputs||false;
  this.favApps = config.favApps||false;
  !this.state?this.state=false:this.state;

  //Initreqpromise
  this.getContent=function (setPath,setMethod,setParams,setVersion){
    return new Promise((resolve,reject)=>{
      const options={
        host:self.ipadress,
        port:self.port,
        family:4,
        path:setPath,
        method:'POST',
        headers:{
          'X-Auth-PSK':self.psk
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

  this.getIRCC = function(setIRCC) {

    return new Promise((resolve, reject) => {

      var post_data = '<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1"><IRCCCode>' + setIRCC + '</IRCCCode></u:X_SendIRCC></s:Body></s:Envelope>';

      var options = {
        host: self.ipadress,
        path: '/sony/IRCC',
        port: self.port,
        method: 'POST',
        headers: {
          'X-Auth-PSK': self.psk,
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

  //STORAGE
  this.storage=require('node-persist');
  this.storage.initSync({
    dir:HomebridgeAPI.user.persistPath()
  });
}

BraviaTVOS.prototype={

  getServices:function (){

    const self = this;

    this.Services=[];

    //InformationService

    this.informationService=new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Name,self.name||'Television')
      .setCharacteristic(Characteristic.Manufacturer,'SeydX')
      .setCharacteristic(Characteristic.Model,'SonyTV')
      .setCharacteristic(Characteristic.SerialNumber,'1234567890');

    this.Services.push(this.informationService);

    //TV

    this.Television=new Service.Television(self.name||'Television');

    this.Television
      .setCharacteristic(Characteristic.ConfiguredName,self.name||'Television');

    this.Television
      .setCharacteristic(
        Characteristic.SleepDiscoveryMode,
        Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE
      );

    this.Television
      .getCharacteristic(Characteristic.Active)
      .on('set',this.setPowerState.bind(this))
      .updateValue(this.state);

    this.Television
      .getCharacteristic(Characteristic.ActiveIdentifier)
      .on('set',this.setInput.bind(this));

    //RemoteKeys

    this.Television
      .getCharacteristic(Characteristic.RemoteKey)
      .on('set',this.setRemote.bind(this));

    //Looking for Inputs if nothing in cache
    if(!this.storage.getItem('SonyInputs')){
      this.getAllInputs();
    }else{
      this.setNewInputs();
    }

    //WIP
    this.Television
      .getCharacteristic(Characteristic.PowerModeSelection)
      .on('set',function (newValue,callback){
        self.getIRCC('AAAAAgAAAJcAAAA2Aw==')
          .then((data) => {
            self.log('Settings');
          })
          .catch((err) => {
            self.log(err);
          });
        callback(null);
      });

    this.Television.addCharacteristic(Characteristic.Refresh);
    this.Television.getCharacteristic(Characteristic.Refresh)
      .updateValue(false)
      .on('set', function(state, callback) {
        if(state){
          self.log('Refreshing input list, please restart homebridge after refreshing!');
          self.getAllInputs();
          setTimeout(function(){self.Television.getCharacteristic(Characteristic.Refresh).setValue(false);},1000);
        }
        callback(null, false);
      });

    this.Services.push(this.Television);

    //Speaker

    this.Speaker=new Service.TelevisionSpeaker(this.name+' Volume');

    this.Speaker
      .setCharacteristic(Characteristic.Active,Characteristic.Active.ACTIVE)
      .setCharacteristic(Characteristic.VolumeControlType,Characteristic.VolumeControlType.ABSOLUTE);

    this.Speaker
      .getCharacteristic(Characteristic.VolumeSelector)
      .on('set',this.setRemoteVolume.bind(this));

    this.Speaker
      .getCharacteristic(Characteristic.Mute)
      .on('set',this.setMute.bind(this));

    this.Speaker
      .getCharacteristic(Characteristic.Volume)
      .on('set',this.setVolume.bind(this));

    this.Television.addLinkedService(this.Speaker);
    this.Services.push(this.Speaker);

    //PollingStates

    this.getPowerState();
    this.getVolumeState();
    this.getInputState();

    //ReturnServices

    let identifierMax = 0;
    for(const i in this.Services){
      if(this.Services[i].UUID == '000000D8-0000-1000-8000-0026BB765291'){
        for(const j in this.Services[i].linkedServices){
          if(this.Services[i].linkedServices[j].UUID!='00000113-0000-1000-8000-0026BB765291'&&this.Services[i].linkedServices[j].UUID!='000000D8-0000-1000-8000-0026BB765291'){
            identifierMax += 1;
          }
        }
      }
    }

    this.Television
      .getCharacteristic(Characteristic.ActiveIdentifier)
      .setProps({
        maxValue: identifierMax-1,
        minValue: 0,
        minStep: 1
      });

    return this.Services;
  },
  setPowerState:function (state,callback){
    const self=this;
    if(state){
      self.getContent('/sony/system','setPowerStatus',{
        'status':true
      },'1.0')
        .then((data)=>{
          const response=JSON.parse(data);
          if('error' in response){
            if(response.error[0]==7||response.error[0]==40005){
              self.log('TVOFF');
              self.state=false;
            }else if(response.error[0]==3||response.error[0]==5){
              self.log('Illegal argument!');
              self.state=false;
            }else{
              self.log('ERROR:'+JSON.stringify(response));
              self.state=false;
            }
          }else{
            self.log('TV On');
            self.state=true;
          }
          self.setOnCount=0;
          self.Television.getCharacteristic(Characteristic.Active).updateValue(self.state);
          callback(null,self.state);
        })
        .catch((err)=>{
          if(self.setOnCount<=5){
            self.state=true;
            setTimeout(function (){
              self.setOnCount+=1;
              self.Television.getCharacteristic(Characteristic.Active).setValue(self.state);
            },3000);
            callback(null,self.state);
          }else{
            self.state=false;
            self.log('Can\'t set '+self.name+' on!'+err);
            callback(null,self.state);
          }
        });
    }else{
      self.getContent('/sony/system','setPowerStatus',{
        'status':false
      },'1.0')
        .then((data)=>{
          const response=JSON.parse(data);
          if('error'in response){
            if(response.error[0]==7||response.error[0]==40005){
              self.log('TV Off');
              self.state=false;
            }else if(response.error[0]==3||response.error[0]==5){
              self.log('Illegal argument!');
              self.state=true;
            }else{
              self.log('ERROR: '+JSON.stringify(response));
              self.state=true;
            }
          }else{
            self.log('TV off');
            self.state=false;
          }
          self.setOffCount=0;
          self.Television.getCharacteristic(Characteristic.Active).updateValue(self.state);
          callback(null,self.state);

        })
        .catch((err)=>{
          if(self.setOffCount<=5){
            self.state=false;
            setTimeout(function (){
              self.setOffCount+=1;
              self.TVSwitch.getCharacteristic(Characteristic.Active).setValue(self.state);
            },3000);
            callback(null,self.state);
          }else{
            self.state=true;
            self.log('Can\'t set '+self.name+' off!'+err);
            callback(null,self.state);
          }
        });
    }
  },

  getPowerState:function (){
    const self=this;
    self.getContent('/sony/system','getPowerStatus','1.0','1.0')
      .then((data)=>{
        const response=JSON.parse(data);
        if('error'in response){
          if(response.error[0]==7||response.error[0]==40005){
            self.log('TV off');
            self.state=false;
          }else if(response.error[0]==3||response.error[0]==5){
            self.log('Illegal argument!');
            self.state=false;
          }else{
            self.log('ERROR: '+JSON.stringify(response));
            self.state=false;
          }
        }else{
          const currentPower=response.result[0].status;

          if(currentPower=='active'){
            self.state=true;
          }else if(currentPower=='standby'){
            self.state=false;
          }else{
            self.log('Could not determine TV status!');
            self.state=false;
          }
        }
        self.Television.getCharacteristic(Characteristic.Active).updateValue(self.state);
        self.getCount=0;
        setTimeout(function (){
          self.getPowerState();
        },self.interval);

      })
      .catch((err)=>{
        self.Television.getCharacteristic(Characteristic.Active).updateValue(self.state);
        if(self.getCount>5){
          self.log(self.name+':'+err);
        }
        setTimeout(function (){
          self.getCount+=1;
          self.getPowerState();
        },60000);
      });
  },

  getAllInputs:function (){
    const self=this;
    self.log('Getting all available inputs, TV needs to be turned on...');
    self.Television.getCharacteristic(Characteristic.Active).setValue(true);

    setTimeout(function (){
      self.log('TV is on, getting inputs...');
      self.getContent('/sony/avContent','getCurrentExternalInputsStatus','1.0','1.0')
        .then((data)=>{
          const response=JSON.parse(data);
          if('error'in response){
            if(response.error[0]==7||response.error[0]==40005){
              self.log('TV off');
            }else if(response.error[0]==3||response.error[0]==5){
              self.log('Illegal argument!');
            }else{
              self.log('ERROR: '+JSON.stringify(response));
            }
          }else{
            const inputList = response.result[0];
            var inputsApps;
            self.log('Found new inputs, checking config for apps...');
            if(self.favApps&&self.favApps.length>0){
              self.log('Found apps in config, writing in cache...');
              for(const i in self.favApps){
                self.favApps[i]['icon']='meta:app';
              }
              inputsApps = inputList.concat(self.favApps);
            } else {
              inputsApps = inputList;
            }
            if(self.channelInputs){
              self.getChannelSources(inputsApps);
            } else {
              self.storage.setItem('SonyInputs',inputsApps);
              self.setNewInputs();
            }
          }
        })
        .catch((err)=>{
          self.log('An error occured by getting inputs, trying again...');
          self.log(err);
          setTimeout(function (){
            self.getAllInputs();
          },10000);
        });
    },5000);
  },

  getChannelSources:function (currentList){
    const self = this;
    self.log('Channels enabled in config, writing channel sources in cache...');
    self.getContent('/sony/avContent','getSourceList',{'scheme':'tv'},'1.0')
      .then((data)=>{
        const response=JSON.parse(data);
        if('error'in response){
          if(response.error[0]==7||response.error[0]==40005){
            self.log('TV off');
          }else if(response.error[0]==3||response.error[0]==5){
            self.log('Illegal argument!');
          }else{
            self.log('ERROR: '+JSON.stringify(response));
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
          self.storage.setItem('SonyInputs',inputs);
          self.setNewInputs();
        }
      })
      .catch((err)=>{
        self.log('An error occured by getting tv sources, trying again...');
        self.log(err);
        setTimeout(function (){
          self.getChannelSources();
        },10000);
      });
  },

  setNewInputs:function (){
    const self=this;
    const oldList = this.storage.getItem('SonyInputs');
    const newList = [];

    for(const j in oldList){
      if(self.cecInputs&&oldList[j].icon=='meta:playbackdevice'){
        newList.push(oldList[j]);
      } else if(oldList[j].icon=='meta:hdmi'){
        newList.push(oldList[j]);
      } else if(self.extraInputs&&(oldList[j].icon=='meta:scart'||oldList[j].icon=='meta:composite'||oldList[j].icon=='meta:wifidisplay')){
        newList.push(oldList[j]);
      } else if(self.favApps&&self.favApps.length>0&&oldList[j].icon=='meta:app'){
        newList.push(oldList[j]);
      } else if(self.channelInputs&&oldList[j].icon=='meta:tv'){
        newList.push(oldList[j]);
      }
    }

    const inputs = newList;
    for(const i in inputs){
      const newTitle=inputs[i].title.toLowerCase().replace(/\s/g,'').split('/')[0];
      if(inputs[i].icon=='meta:hdmi'){
        self.createInputSource(newTitle,inputs[i].title,i,3,1);
      } else if(inputs[i].icon=='meta:playbackdevice'&&self.cecInputs){
        self.createInputSource(newTitle,inputs[i].title,i,3,4);
      } else if((inputs[i].icon=='meta:composite'||inputs[i].icon=='meta:scart'||inputs[i].icon=='meta:wifidisplay')&&self.extraInputs){
        self.createInputSource(newTitle,inputs[i].title,i,4,1);
      }else if(inputs[i].icon == 'meta:app'&&self.favApps&&self.favApps.length>0){
        self.createInputSource(newTitle,inputs[i].title,i,10,1);
      } else if(inputs[i].icon=='meta:tv'){
        self.createInputSource(newTitle,inputs[i].title,i,2,3);
      }
    }

    self.log('Inputlist finished');
  },

  setInput:function (newValue,callback){
    const self=this;
    const oldList = this.storage.getItem('SonyInputs');
    const newList = [];

    for(const j in oldList){
      if(self.cecInputs&&oldList[j].icon=='meta:playbackdevice'){
        newList.push(oldList[j]);
      } else if(oldList[j].icon=='meta:hdmi'){
        newList.push(oldList[j]);
      } else if(self.extraInputs&&(oldList[j].icon=='meta:scart'||oldList[j].icon=='meta:composite'||oldList[j].icon=='meta:wifidisplay')){
        newList.push(oldList[j]);
      } else if(self.favApps&&self.favApps.length>0&&oldList[j].icon=='meta:app'){
        newList.push(oldList[j]);
      } else if(self.channelInputs&&oldList[j].icon=='meta:tv'){
        newList.push(oldList[j]);
      }
    }

    const inputs = newList;

    for(const i in inputs){
      if(newValue==i){
        if(inputs[i].icon!='meta:app'){
          self.getContent('/sony/avContent','setPlayContent',{'uri':inputs[i].uri},'1.0')
            .then((data)=>{
              const response=JSON.parse(data);
              if('error'in response){
                if(response.error[0]==7||response.error[0]==40005){
                  self.log('TV off');
                }else if(response.error[0]==3||response.error[0]==5){
                  self.log('Illegal argument!');
                }else if(response.error[0]==41001){
                  self.log('Channel source doesnt exist!');
                }else{
                  self.log('ERROR:'+JSON.stringify(response));
                }
              }else{
                self.log('Start: '+inputs[i].title);
              }
            })
            .catch((err)=>{
              self.log('An error occured by setting new input! Try again..');
              self.log(err);
            });
        } else {
          self.getContent('/sony/appControl','setActiveApp',{'uri':inputs[i].uri},'1.0')
            .then((data)=>{
              const response=JSON.parse(data);
              if('error'in response){
                if(response.error[0]==7||response.error[0]==40005){
                  self.log('TV off');
                }else if(response.error[0]==3||response.error[0]==5){
                  self.log('Illegal argument!');
                }else{
                  self.log('ERROR:'+JSON.stringify(response));
                }
              }else{
                self.log('Start:'+inputs[i].title);
              }
            })
            .catch((err)=>{
              self.log('An error occured by setting new app! Try again..');
              self.log(err);
            });
        }
      }
    }
    callback();
  },

  getInputState:function(){
    const self = this;
    const oldList = this.storage.getItem('SonyInputs');
    const newList = [];

    for(const j in oldList){
      if(self.cecInputs&&oldList[j].icon=='meta:playbackdevice'){
        newList.push(oldList[j]);
      } else if(oldList[j].icon=='meta:hdmi'){
        newList.push(oldList[j]);
      } else if(self.extraInputs&&(oldList[j].icon=='meta:scart'||oldList[j].icon=='meta:composite'||oldList[j].icon=='meta:wifidisplay')){
        newList.push(oldList[j]);
      } else if(self.favApps&&self.favApps.length>0&&oldList[j].icon=='meta:app'){
        newList.push(oldList[j]);
      } else if(self.channelInputs&&oldList[j].icon=='meta:tv'){
        newList.push(oldList[j]);
      }
    }

    const inputs = newList;


    self.getContent('/sony/avContent','getPlayingContentInfo','1.0','1.0')
      .then((data)=>{
        const response=JSON.parse(data);
        if('error'in response){
          if(response.error[0]==7||response.error[0]==40005){
            //self.log('TV off');
          }else if(response.error[0]==3||response.error[0]==5){
            self.log('Illegal argument!');
          }else{
            self.log('ERROR:'+JSON.stringify(response));
          }
        }else{
          for(const i in inputs){

            var source, str, cap;

            if(self.channelInputs){
              str = inputs[i].title;
              cap = ['tv:',str.toLowerCase(str)];
              source = cap.toString(cap).replace(',', '');
            }

            if(inputs[i].title==response.result[0].title||inputs[i].uri==response.result[0].uri||source==response.result[0].source){
              self.Television.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(i);
            }
          }
        }
        setTimeout(function (){
          self.getInputState();
        },self.interval);
      })
      .catch((err)=>{
        self.log('An error occured by getting input state! Trying again..');
        self.log(err);
        setTimeout(function (){
          self.getInputState();
        },10000);
      });
  },

  getVolumeState: function(){
    const self=this;
    var state,volume;
    this.getContent('/sony/audio', 'getVolumeInformation', '1.0', '1.0')
      .then((data) => {
        const response = JSON.parse(data);
        if ('result' in response) {
          const name = response.result[0];
          for (var i = 0; i < name.length; i++) {
            if (name[i].target.match('speaker')) {
              state = name[i].mute == false;
              volume = name[i].volume;
            }
          }
        } else {
          state = false;
          volume = 0;
        }
        self.Speaker.getCharacteristic(Characteristic.Mute).updateValue(state?false:true);
        self.Speaker.getCharacteristic(Characteristic.Volume).updateValue(volume);
        setTimeout(function() {
          self.getVolumeState();
        }, self.interval);
      })
      .catch((err) => {
        self.log(err);
        self.Speaker.getCharacteristic(Characteristic.Mute).updateValue(state?false:true);
        self.Speaker.getCharacteristic(Characteristic.Volume).updateValue(volume);
        setTimeout(function() {
          self.getVolumeState();
        }, 60000);
      });
  },

  setVolume:function (value,callback){
    const self=this;
    var volume;
    const newValue = value.toString();
    this.getContent('/sony/audio', 'setAudioVolume', {
      'target': 'speaker',
      'volume': newValue
    }, '1.0')
      .then((data) => {
        const response = JSON.parse(data);
        if ('error' in response) {
          if (response.error[0] == 7 || response.error[0] == 40005) {
            self.log('TV OFF');
            volume = 0;
          } else if (response.error[0] == 3 || response.error[0] == 5) {
            self.log('Illegal argument!');
            volume = 0;
          } else {
            self.log('ERROR: ' + JSON.stringify(response));
            volume = 0;
          }
        } else {
          self.log('Volume: ' + value);
          volume = value;
        }
        self.Speaker.getCharacteristic(Characteristic.Volume).updateValue(volume);
      })
      .catch((err) => {
        self.log(err);
        self.Speaker.getCharacteristic(Characteristic.Volume).updateValue(volume);
      });
    callback();
  },

  setMute:function (mute,callback){
    const self=this;
    var state;
    this.getContent('/sony/audio', 'setAudioMute', {
      'status': mute
    }, '1.0')
      .then((data) => {
        const response = JSON.parse(data);
        if ('error' in response) {
          if (response.error[0] == 7 || response.error[0] == 40005) {
            self.log('TV OFF');
            state = false;
          } else if (response.error[0] == 3 || response.error[0] == 5) {
            self.log('Illegal argument!');
            state = false;
          } else {
            self.log('ERROR: ' + JSON.stringify(response));
            state = false;
          }
        } else {
          state = true;
        }
        mute?self.log('Mute'):self.log('Volume up');
        self.Speaker.getCharacteristic(Characteristic.Mute).updateValue(state);
        callback(null, mute);
      })
      .catch((err) => {
        self.log(err);
        self.Speaker.getCharacteristic(Characteristic.Mute).updateValue(state);
        callback(null, mute);
      });
  },

  setRemoteVolume:function (newValue,callback){
    const self=this;
    if(newValue == 0){
      self.getIRCC('AAAAAQAAAAEAAAASAw==')
        .then((data) => {
          self.log('Volume +1');
        })
        .catch((err) => {
          self.log(err);
        });
    } else {
      self.getIRCC('AAAAAQAAAAEAAAATAw==')
        .then((data) => {
          self.log('Volume -1');
        })
        .catch((err) => {
          self.log(err);
        });
    }
    callback();
  },

  setRemote:function (newValue,callback){
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
        ircc = 'AAAAAQAAAAEAAAALAw==';
        break;
      case 9: //Characteristic.RemoteKey.BACK = 9;
        ircc = 'AAAAAgAAAJcAAAAjAw==';
        break;
      case 10: //Characteristic.RemoteKey.EXIT = 10;
        ircc = 'AAAAAQAAAAEAAABjAw==';
        break;
      case 11: //Characteristic.RemoteKey.PLAY_PAUSE = 11;
        if(!self.isPaused){
          ircc = 'AAAAAgAAABoAAABnAw==';
          self.isPaused = true;
        } else {
          ircc = 'AAAAAgAAAJcAAAAaAw==';
          self.isPaused = false;
        }
        break;
      case 15: //Characteristic.RemoteKey.INFORMATION = 15;
        ircc = 'AAAAAgAAAJcAAAAWAw==';
        break;
      default: //Home
        ircc = 'AAAAAQAAAAEAAABgAw==';
    }

    self.getIRCC(ircc)
      .then((data) => {
        switch (newValue){
          case 0: //Characteristic.RemoteKey.REWIND = 0;
            self.log('Rewind');
            break;
          case 1: //Characteristic.RemoteKey.FAST_FORWARD = 1;
            self.log('Fast forward');
            break;
          case 2: //Characteristic.RemoteKey.NEXT_TRACK = 2;
            self.log('Next track');
            break;
          case 3: //Characteristic.RemoteKey.PREVIOUS_TRACK = 3;
            self.log('Previous track');
            break;
          case 4: //Characteristic.RemoteKey.ARROW_UP = 4;
            self.log('Up');
            break;
          case 5: //Characteristic.RemoteKey.ARROW_DOWN = 5;
            self.log('Down');
            break;
          case 6: //Characteristic.RemoteKey.ARROW_LEFT = 6;
            self.log('Left');
            break;
          case 7: //Characteristic.RemoteKey.ARROW_RIGHT = 7;
            self.log('Right');
            break;
          case 8: //Characteristic.RemoteKey.SELECT = 8;
            self.log('Select');
            break;
          case 9: //Characteristic.RemoteKey.BACK = 9;
            self.log('Back');
            break;
          case 10: //Characteristic.RemoteKey.EXIT = 10;
            self.log('Exit');
            break;
          case 11: //Characteristic.RemoteKey.PLAY_PAUSE = 11;
            if(!self.isPaused){
              self.log('Pause');
            } else {
              self.log('Play');
            }
            break;
          case 15: //Characteristic.RemoteKey.INFORMATION = 15;
            self.log('Information');
            break;
          default: //Home
            self.log('Home');
        }
      })
      .catch((err) => {
        self.log(err);
      });

    callback();
  },

  createInputSource:function (id,name,number,type,devType){
    const input=new Service.InputSource(id,name);
    input
      .setCharacteristic(Characteristic.Identifier,number)
      .setCharacteristic(Characteristic.ConfiguredName,name)
      .setCharacteristic(
        Characteristic.IsConfigured,
        Characteristic.IsConfigured.CONFIGURED
      )
      .setCharacteristic(Characteristic.InputSourceType,type)
      .setCharacteristic(Characteristic.InputDeviceType, devType)
      .setCharacteristic(Characteristic.CurrentVisibilityState,0);

    this.Television.addLinkedService(input);
    this.Services.push(input);
  },

  identify:function (callback){
    this.log(this.name+': Identified!');
    callback();
  }

};
