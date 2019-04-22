'use strict';

const axios = require('axios');
const wol = require('wake_on_lan');
const tcpp = require('tcp-ping');
const debug = require('debug')('BraviaPlatformApi');
const base64 = require('base-64');

const tcpping = opt => new Promise((resolve, reject) => tcpp.ping(opt, (err, data) => err ? reject(err) : resolve(data)));
const tcpprobe = (ip,port) => new Promise((resolve, reject) => tcpp.probe(ip,port, (err, available) => err ? reject(err) : resolve(available)));

const timeout = ms => new Promise(res => setTimeout(res, ms));

const isObject = function(a) {
  return (!!a) && (a.constructor === Object);
};

class Bravia {
  constructor(platform, context, waitUntilAuthenticated) {
  
    if(!context.ip) throw 'No ip found in config!';
    
    this.ip = context.ip;
    this.port = context.port || 80;
    this.name = context.name;
    this.context = context;
    
    this.logger = platform.logger;
   
    this.opt = {
      address: this.ip,
      port: this.port,
      timeout: 3000,
      attempts: 500
    };
    
    this.url = 'http://' + this.ip + ':' + this.port;
    
    this.header = {
      'Content-Type': 'application/json'
    };
    
    if(context.psk){
    
      this.logger.info(this.name + ': Initalizing Bravia API with PSK');
    
      this.header['X-Auth-PSK'] = context.psk;
      this.authenticated = true;
      
    } else {
      
      this.HBpath = platform.api.user.storagePath();   
      this.store = require('json-fs-store')(this.HBpath);
      
      if(!waitUntilAuthenticated){
        this.logger.info(this.name + ': Initalizing Bravia API with IP Control');
        this.checkAuthFile();
      } else {
        this.checkUntilAuthenticated();
      }
      
    }
    
    this.count = 0;
    
  }
  
  async checkUntilAuthenticated(){
  
    const self = this;
  
    let name = this.name.includes('Speaker') ? this.name.split(' Speaker')[0] : this.name;
    
    this.store.load(name, async function(err, object){
      if(err) {
      
        //self.logger.error(err);
        
        await timeout(5000);
        self.checkUntilAuthenticated();
      
      } else {

        //check registration
          
        if(object.cookie && object.expires){
  
          const expireDate = new Date(object.expires).getTime();
          let today = new Date();
          today.setDate(today.getDate() + 1);
          today = today.getTime();
    
          if( (expireDate - today) <= 0 ){
    
            await timeout(5000);
            self.checkUntilAuthenticated();
    
          } else {
    
            //everything ok!
            self.header.Cookie = object.cookie;
            self.authenticated = true;
    
          }
  
        } else {
        
          await timeout(5000);
          self.checkUntilAuthenticated();
        
        }
      
      }

    });
  
  }
  
  getAuth(){
    return new Promise((resolve, reject) => {
      this._handleAuth((err, res) => {
        if(err) reject(err);
      
        resolve(res);
      
      });
    });
  }
  
  _handleAuth(callback){
    if(this.authenticated){
      callback(null, 'Authenticated');
    } else {
      this.authCount++;
  
      if(this.authCount >= 12){
  
        callback(this.name + ': Can not authenticate!', null);
        
      } else {
 
        setTimeout(this._handleAuth.bind(this,callback),5000); 
  
      }
    }
  }
  
  async checkAuthFile(){
  
    const self = this;
  
    this.store.load(self.name, async function(err, object){
      if(err) {
      
        let auth = {
          id: self.name,
          pin: 1234
        };
           
        self.store.add(auth, err => {
          if(err) throw err;
          self.checkAuthFile();
        });
      
      } else {

        //check registration
          
        if(object.cookie && object.expires){
  
          const expireDate = new Date(object.expires).getTime();
          let today = new Date();
          today.setDate(today.getDate() + 1);
          today = today.getTime();
    
          if( (expireDate - today) <= 0 ){
    
            //refresh cookie und expire
            self.checkAuthentication(null, null, true);
    
          } else {
    
            //everything ok!
            self.header.Cookie = object.cookie;
            self.authenticated = true;
    
          }
  
        } else {
  
          if(object.pin && (object.pin !== 1234)){
    
            //create cookie and expires
            self.checkAuthentication(object.pin);
    
          } else {
          
            self.checkAuthentication();
    
          }
  
        }
      
      }

    });
  
  }
  
  async checkAuthentication(user, cookie, refresh){
  
    const self = this;
    
    if(!user && !cookie && !refresh)
      this.logger.info(self.name + ': Trying to register on ' + this.ip);
  
    try {
    
      let res = await this.registerCall(user, cookie, refresh);
    
      if(res.data.error && res.data.error.includes(40005)){
          
        //Display off!
        //Turn on display for init auth!
        
        if(!this.wolTried && this.context.mac){
          this.logger.info(self.name + ': Turning on TV for init authentication...');
            
          this.wolTried = true;  
            
          await this.setPowerStatusWOL(this.context.mac);
        } else {
          if(!this.context.mac){
            this.logger.warn(self.name + ': Can not turn on TV via WOL (no mac address in config.json). Please manually turn on the TV!');
          } else {
            this.logger.warn(self.name + ': Can not turn on TV via WOL. Please manually turn on the TV!');
          }
        }
            
        await timeout(15000);
          
        this.checkAuthentication(user, cookie, refresh);
          
      } else {
    
        if(res.headers['set-cookie']){
      
          //cookie received in header!
          //something like this:
    
          /*
           * headers: { 
           *   'content-type': 'application/json',
           *   'content-length': '20',
           *   'connection': 'close',
           *   'set-cookie': [ 
           *     'auth=C78436B5E8CB9A3C6A7DD2B29DE3386A012535A3; 
           *      Path=/sony/; 
           *      Max-Age=1209600; // <- in seconds, need to refresh before it expires!
           *      Expires=Fr., 26 Apr. 2019 21:42:48 GMT+00:00' 
           *   ] 
           * }
          */
          
          let cookieHeader = res.headers['set-cookie'][0].split(';');
          
          cookieHeader.forEach( str => {
  
            if(str.includes('auth')){
              self.header.Cookie = str;
            }
    
            if(str.includes('Expires')){
              self.expires = str.split('=')[1];
            }
          
          });
          
          self.authenticated = true;
    
          this.store.load(self.name, async function(err, object){
            
            let auth = object;
            
            auth.cookie = self.header.Cookie;
            auth.expires = self.expires;
       
            self.store.add(auth, function(err){
            
              if(err) throw err; // err if JSON parsing failed
              
              if(!object.cookie)
                self.logger.info(self.name + ': Authentication successfull!');

              self.logger.info(self.name + ': ' + self.name + '.json refreshed with new cookie!');
              
            });
             
          });
      
        } else {
      
          //no cookie in header!
        
          let error = {
            status: res.status,
            message: res.statusMessage,
            data: res.data,
            headers: res.headers
          };
          
          this.logger.error(JSON.stringify(error));
      
        }
          
      }
      
    } catch(err) {
    
      if(err.response && err.response.status === 401){
      
        //not authorized yet!
        //need to register device
      
        //PIN should be appeared on screen (401)
        //start authentication
      
        this.logger.info(self.name + ': You should see a dialog with a 4-digit PIN.');
        this.logger.info(self.name + ': Please enter the four-digit PIN in ' + self.name + '.json! Located at ' + self.HBpath);
        this.logger.info(self.name + ': Trying again in 30 seconds...');
               
        await timeout(30000);
            
        this.checkAuthFile();
      
      } else {
    
        //something went wrong!
          
        /*let error = {
          code: error.response.status,
          message: error.response.statusMessage,
          data: error.response.data
        };*/
        
        this.logger.error(err);
    
      }
    
    }
  
  }
  
  async registerCall(user, cookie, refresh) {
  
    const self = this;
  
    return new Promise((resolve, reject) => {
    
      let header = {};
    
      if(!refresh){
      
        if(user){
          let basic = 'Basic ' + base64.encode(':' + user);
          header.Authorization = basic;
        }
        
        if(cookie)
          header.Cookie = cookie;
        
      }
      
      var data = '{"method":"actRegister","params":[{"clientid":"BraviaTVOS:481b0a56-fcdf-4b13-bef7-dc22acf965ab","nickname":"BraviaTVOS (homebridge-bravia-tvos)","level":"private"},[{"value":"yes","function":"WOL"}]],"id":8,"version":"1.0"}';
      
      axios({
        url: self.url + '/sony/accessControl',
        method: 'POST',
        data: data,
        headers: header
      }).then(response => {
        resolve(response);
      }).catch(err => {
        reject(err);
      });
    
    });
    
  }
  
  _refreshToken() {
  
    const self = this;

    return new Promise((resolve, reject) => {
    
      if(self.context.psk){
  
        self.header['X-Auth-PSK'] = self.context.psk;
        resolve(true);

      } else {
  
        let name = self.name.includes('Speaker') ? self.name.split(' Speaker')[0] : self.name;

        this.store.load(name, async function(err, object){
    
          if(err) reject(err);

          //check registration
          
          if(object.cookie && object.expires){
  
            const expireDate = new Date(object.expires).getTime();
            let today = new Date();
            today.setDate(today.getDate() + 1);
            today = today.getTime();
    
            if( (expireDate - today) <= 0 ){
    
              //refresh cookie und expire
              self.checkAuthentication(null, null, true);
              resolve(true);
    
            } else {
    
              resolve(true);
    
            }
      
          }

        });

      } 
    });
  }

  async apiCall(url, method, version, params, req) {
  
    const self = this;
  
    let pingError;
  
    if(!await tcpprobe(this.ip,this.port)){
    
      this.logger.warn(this.name + ': TV currently offline, trying to connect (this can take up to 5 minutes) ...');
    
      try {
      
        await tcpping(this.opt);
        await timeout(10000);
        
        this.logger.info(this.name + ': Connection established!');
      
      } catch(err){
      
        pingError = true;
      
      }
      
    }    
  
    req = req ? req : 'post';   
    params = params ? [params] : [];
    
    this.count++;
    let currCount = this.count;
    debug('[Bravia Debug]: api request ' + currCount + ': ' + req + ' ' + url + ' - ' + method + (params.length ? ' - ' + JSON.stringify(params) : ''));
 
    return new Promise((resolve, reject) => {
      if(self.url && (self.header['X-Auth-PSK'] || self.header.Cookie) && !pingError){
      
        this._refreshToken().then(() => {
    
          let data;
          let header = this.header;
        
          if(url === '/sony/IRCC'){
    
            data = '<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1"><IRCCCode>' + method + '</IRCCCode></u:X_SendIRCC></s:Body></s:Envelope>';

            header['SOAPACTION'] = '"urn:schemas-sony-com:service:IRCC:1#X_SendIRCC"';
            header['Content-Type'] = 'text/xml';
            header['Content-Length'] = Buffer.byteLength(data);
    
          } else {
    
            header = this.header;
    
            data = {
              'id':1,
              'method':method,
              'version':version,
              'params':params
            };
    
            data = JSON.stringify(data);
    
          }
      
          axios({
            url: self.url + url,
            method: req,
            data: data,
            headers: header
          }).then(response => {
    
            let result;
    
            if(response.data.result){
    
              if(response.data.result.length){
                result = response.data.result[0];
              } else {
                result = 'Ok';
              }
            
              debug('[Bravia Debug]: api request ' + currCount + ': Ok - ' + JSON.stringify(result)); 
    
            } else if(response.data.results){
          
              if(response.data.results.length){
                result = response.data.results[0];
              } else {
                result = 'Ok';
              }
            
              debug('[Bravia Debug]: api request ' + currCount + ': Ok - ' + JSON.stringify(result)); 
          
            } else if(response.data.error) {
          
              if(response.data.error.includes('Illegal State')){
        
                result = 'App State';
        
                debug('[Bravia Debug]: api request ' + currCount + ': Ok - ' + result);
      
              } else if(response.data.error.includes('Display Is Turned off')){
        
                result = 'Display Off';
        
                debug('[Bravia Debug]: api request ' + currCount + ': Ok - ' + result);
        
              } else {
        
                debug('[Bravia Debug]: api request ' + currCount + ': Error - ' + JSON.stringify(response.data.error)); 
    
                reject(response.data.error); 
        
              }
    
            } else {
          
              if((isObject(response.data)||typeof response.data === 'string'||response.data instanceof String) && response.data.includes('<?xml version="1.0"?>')){
        
                result = 'Ok';
        
                debug('[Bravia Debug]: api request ' + currCount + ': Ok - ' + JSON.stringify(response.data).replace(/\s/g, ''));
        
              } else {
            
                let error = {
                  status: response.status,
                  message: response.statusText,
                  config: response.config,
                  data: response.data
                };
        
                debug('[Bravia Debug]: api request ' + currCount + ': Error Unknown');
    
                reject(error);
        
              }
    
            }
    
            resolve(result);
          }).catch(err => {
          
            let error = err;
        
            if(err.response){
              error = {
                status: err.response.status,
                message: err.response.statusText,
                config: err.config,
                data: err.response.data
              };
            } 
            
            debug('[Bravia Debug]: api request ' + currCount + ': Error Unknown');  
        
            reject(error);
          });
        
        
        }).catch(err => {
          debug('[Bravia Debug]: api request ' + currCount + ': Error!');
          reject(err);  
        });
        
      } else {
        if(!self.url){
          reject('No URL');
        } else if(!self.header['X-Auth-PSK'] || !self.header.Cookie){
          reject('No PSK/Cookie!');
        } else {
          reject('Can not connect to TV!');
        }
      }
    });
  }
  
  wolCall(mac){
  
    return new Promise((resolve, reject) => {
    
      debug('[Bravia Debug]: WOL: send magic packets to ' + mac);
    
      wol.wake(mac, function(error) {
        if (error) {
          debug('[Bravia Debug]: WOL: Error: ' + JSON.stringify(error));
          reject(JSON.stringify(error));
        } else {
          debug('[Bravia Debug]: WOL: Ok');
          resolve('Done');
        }
      });
  
    });  
  
  }
  
  //# /sony/guide
  
  getServiceProtocols(){
    return this.apiCall('/sony/guide', 'getServiceProtocols', '1.0');
  }
  
  getSupportedApiInfo(){
    return this.apiCall('/sony/guide', 'getSupportedApiInfo', '1.0');
  }

  //# /sony/system
  
  getColorKeysLayout() {
    return this.apiCall('/sony/system', 'getColorKeysLayout', '1.0');
  }
  
  getLEDIndicatorStatus() {
    return this.apiCall('/sony/system', 'getLEDIndicatorStatus', '1.0');
  }
  
  getCurrentTime() {
    return this.apiCall('/sony/system', 'getCurrentTime', '1.0');
  }
  
  getDateTimeFormat() {
    return this.apiCall('/sony/system', 'getDateTimeFormat', '1.0');
  }
  
  getNetworkSettings(type) {
    return this.apiCall('/sony/system', 'getNetworkSettings', '1.0', {'netif': type});
  }
  
  getPowerSavingMode() {
    return this.apiCall('/sony/system', 'getPowerSavingMode', '1.0');
  }
  
  getPowerStatus() {
    return this.apiCall('/sony/system', 'getPowerStatus', '1.0');
  }
  
  getRemoteControllerInfo() {
    return this.apiCall('/sony/system', 'getRemoteControllerInfo', '1.0');
  }
  
  getSystemInformation() {
    return this.apiCall('/sony/system', 'getSystemInformation', '1.0');
  }
  
  getInterfaceInformation() {
    return this.apiCall('/sony/system', 'getInterfaceInformation', '1.0');
  }
  
  getSystemSupportedFunction() {
    return this.apiCall('/sony/system', 'getSystemSupportedFunction', '1.0');
  }
  
  getWolMode() {
    return this.apiCall('/sony/system', 'getWolMode', '1.0');
  }
  
  setWolMode(state) {
    if(state===undefined) return 'No state defined!';
    return this.apiCall('/sony/system', 'setWolMode', '1.0', {enabled: state});
  }
  
  setPowerStatus(state) {
    if(state===undefined) return 'No state defined!';
    return this.apiCall('/sony/system', 'setPowerStatus', '1.0', {status: state});
  }
  
  setPowerStatusWOL(mac) {
    if(mac===undefined) return 'No mac address defined!';
    return this.wolCall(mac);
  }
  
  //# /sony/videoScreen
  
  getAudioSourceScreen() {
    return this.apiCall('/sony/videoScreen', 'getAudioSourceScreen', '1.0');
  }
  
  getPipSubScreenPosition() {
    return this.apiCall('/sony/videoScreen', 'getPipSubScreenPosition', '1.0');
  }
  
  //# /sony/audio
  
  getVolumeInformation() {
    return this.apiCall('/sony/audio', 'getVolumeInformation', '1.0', '1.1');
  }
  
  setAudioMute(state) {
    if(state===undefined) return 'No state defined!';
    return this.apiCall('/sony/audio', 'setAudioMute', '1.0', {status: state});
  }
  
  // target = headphone|speaker - volume: 1-100
  setAudioVolume(target, volume) {
    target = target === undefined ? 'speaker' : target;
    volume = volume === undefined ? 10 : volume;
    return this.apiCall('/sony/audio', 'setAudioVolume', '1.0', {target: target, volume: volume.toString()});
  }
  
  //# /sony/avContent
  
  // example: source = extInput:hdmi
  getContentCount(source) {
    if(source===undefined) return 'No source defined!';
    return this.apiCall('/sony/avContent', 'getContentCount', '1.1', {source: source});
  }
  
  // source = usb:recStorage|tv:dvbc,tv:dvbt
  getContentList(source, cnt, stIdx) {
    if(source===undefined) return 'No source defined!';
    return this.apiCall('/sony/avContent', 'getContentList', '1.2', {source: source, cnt: cnt||200, stIdx: stIdx||0});
  }
  
  getCurrentExternalInputsStatus() {
    return this.apiCall('/sony/avContent', 'getCurrentExternalInputsStatus', '1.0');
  }
  
  getParentalRatingSettings() {
    return this.apiCall('/sony/avContent', 'getParentalRatingSettings', '1.0');
  }
  
  getPlayingContentInfo() {
    return this.apiCall('/sony/avContent', 'getPlayingContentInfo', '1.0');
  }
  
  getSchemeList() {
    return this.apiCall('/sony/avContent', 'getSchemeList', '1.0');
  }
  
  // scheme = exInput|fav|tv|usb
  getSourceList(scheme) {
    if(scheme===undefined) return 'No scheme defined';
    return this.apiCall('/sony/avContent', 'getSourceList', '1.0', {scheme: scheme});
  }
  
  // e.g uri = extInput:hdmi?port=1
  setPlayContent(uri) {
    if(uri===undefined) return 'No uri defined';
    return this.apiCall('/sony/avContent', 'setPlayContent', '1.0', {uri: uri});
  }
  
  //# /sony/recording
  
  getRecordingStatus() {
    return this.apiCall('/sony/recording', 'getRecordingStatus', '1.0');
  }
  
  getSupportedRepeatType() {
    return this.apiCall('/sony/recording', 'getSupportedRepeatType', '1.0');
  }
  
  //# /sony/appControl
  
  getApplicationList() {
    return this.apiCall('/sony/appControl', 'getApplicationList', '1.0');
  }
  
  getApplicationStatusList() {
    return this.apiCall('/sony/appControl', 'getApplicationStatusList', '1.0');
  }
  
  setActiveApp(uri) {
    if(uri===undefined) return 'No uri defined';
    return this.apiCall('/sony/appControl', 'setActiveApp', '1.0', {uri: uri});
  }
  
  terminateApps() {
    return this.apiCall('/sony/appControl', 'terminateApps', '1.0');
  }
  
  //# endpoints available with 'getServiceProtocols'
  
  getMethodTypes(endpoint, versions){
    if(endpoint===undefined) return 'Endpoint required!';
    if(versions===undefined) versions = '1.0';
    return this.apiCall(`/sony/${endpoint}`, 'getMethodTypes', '1.0', versions);
  }
  
  getVersions(endpoint){
    if(endpoint===undefined) return 'Endpoint required!';
    return this.apiCall(`/sony/${endpoint}`, 'getVersions', '1.0');
  }
  
  //# IRCC
  
  setIRCC(command) {
    if(command===undefined) return 'No command defined!';
    return this.apiCall('/sony/IRCC', command);
  }
  
}

module.exports = Bravia;
