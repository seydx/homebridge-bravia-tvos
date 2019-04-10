'use strict';

const axios = require('axios');
const wol = require('wake_on_lan');
const tcpp = require('tcp-ping');
const debug = require('debug')('BraviaPlatformApi');

let bravia_url;
const bravia_header = {
  'Content-Type': 'application/json',
  'X-Auth-PSK': false
};

const tcpping = opt => new Promise((resolve, reject) => tcpp.ping(opt, (err, data) => err ? reject(err) : resolve(data)));
const tcpprobe = (ip,port) => new Promise((resolve, reject) => tcpp.probe(ip,port, (err, available) => err ? reject(err) : resolve(available)));

const timeout = ms => new Promise(res => setTimeout(res, ms));

class Bravia {
  constructor(logger, platform) {
  
    if(!platform.ip||!platform.psk) return 'No ip or psk found in config!';
    
    this.ip = platform.ip;
    this.port = platform.port || 80;
    this.name = platform.name;
    
    this.logger = logger;
    
    this.opt = {
      address: this.ip,
      port: this.port,
      timeout: 3000,
      attempts: 500
    };
    
    bravia_url = 'http://' + platform.ip + ':' + platform.port;
    bravia_header['X-Auth-PSK'] = platform.psk;

    this.count = 0;
  }

  async apiCall(url, method, version, params, req) {
  
    let pingError;
  
    if(!await tcpprobe(this.ip,this.port)){
    
      if(this.logger)
        this.logger.warn(this.name + ': TV currently offline, trying to connect (this can take up to 5 minutes) ...');
    
      try {
      
        await tcpping(this.opt);
        await timeout(10000);
        
        if(this.logger)
          this.logger.info(this.name + ': Connection established!');
      
      } catch(err){
      
        pingError = true;
      
      }
      
    }    
  
    req = req ? req : 'post';   
    params = params ? [params] : [];
    
    let data;
    let header = bravia_header;

    if(url === '/sony/IRCC'){
    
      data = '<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1"><IRCCCode>' + method + '</IRCCCode></u:X_SendIRCC></s:Body></s:Envelope>';

      header['SOAPACTION'] = '"urn:schemas-sony-com:service:IRCC:1#X_SendIRCC"';
      header['Cookie'] = 'cookie';
      header['Content-Type'] = 'text/xml';
      header['Content-Length'] = Buffer.byteLength(data);
    
    } else {
    
      data = {
        'id':1,
        'method':method,
        'version':version,
        'params':params
      };
    
      data = JSON.stringify(data);
    
    }
    
    this.count++;
    let currCount = this.count;
    debug('[Bravia Debug]: api request ' + currCount + ': ' + req + ' ' + url + ' - ' + method + (params.length ? ' - ' + JSON.stringify(params) : ''));
 
    return new Promise((resolve, reject) => {
      if(bravia_url && bravia_header['X-Auth-PSK'] && !pingError){
        axios({
          url: bravia_url + url,
          method: req,
          data: data,
          headers: bravia_header
        }).then(response => {
    
          let result;
    
          if(response.data.result){
    
            if(response.data.result.length){
              result = response.data.result[0];
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
            
            reject(result);
    
          } else {
          
            if(response.data.includes('<?xml version="1.0"?>')){
        
              result = 'Ok';
        
              debug('[Bravia Debug]: api request ' + currCount + ': Ok - ' + JSON.stringify(response.data).replace(/\s/g, ''));
        
            } else {
            
              let error = {
                status: response.status,
                message: response.statusText,
                config: response.config
              };
        
              debug('[Bravia Debug]: api request ' + currCount + ': Uknown - ' + JSON.stringify(error));
    
              reject(error);
        
            }
    
          }
    
          resolve(result);
        }).catch(err => {
        
          let error = {
            status: err.status,
            message: err.statusText,
            config: err.config
          };
      
          debug('[Bravia Debug]: api request ' + currCount + ': Uknown - ' + JSON.stringify(error));  
        
          reject(error);
        });
      } else {
        if(!bravia_url){
          reject('No URL');
        } else if(!bravia_header['X-Auth-PSK']){
          reject('No PSK!');
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
