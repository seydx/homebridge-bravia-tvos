const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');
const { RequestError } = require('@homebridge/plugin-ui-utils');

const axios = require('axios');
const base64 = require('base-64');
const Bravia = require('@seydx/bravia');
const fs = require('fs-extra');

const TIMEOUT = (ms) => new Promise((res) => setTimeout(res, ms)); 

class UiServer extends HomebridgePluginUiServer {
  constructor () { 

    super();

    this.onRequest('/ping', this.ping.bind(this));
    
    this.onRequest('/requestPin', this.requestPin.bind(this));
    
    this.onRequest('/fetchApps', this.fetchApps.bind(this));
    this.onRequest('/fetchInputs', this.fetchInputs.bind(this));
    this.onRequest('/fetchChannels', this.fetchChannels.bind(this));
    this.onRequest('/fetchCommands', this.fetchCommands.bind(this));
    
    this.onRequest('/storeInputs', this.storeInputs.bind(this));
    this.onRequest('/getInputs', this.getInputs.bind(this));
    
    this.ready();
  }

  async requestPin(options){
  
    const bravia = new Bravia(options);
    
    try { 
      
      options.uuid = options.uuid || this.genUUID();
       
      const headers = {};
      
      if(options.pin)
        headers.Authorization = 'Basic ' + base64.encode(':' + options.pin);
        
      const post_data = `{
        "id": 8,
        "method": "actRegister",
        "version": "1.0",
        "params": [
          {
            "clientid":"${options.name}:${options.uuid}",
            "nickname":"${options.name}"
          },
          [
            {
              "clientid":"${options.name}:${options.uuid}",
              "value":"yes",
              "nickname":"${options.name}",
              "function":"WOL"
            }
          ]
        ]
      }`;  
       
      const response = await axios.post(bravia._url + '/accessControl', post_data, { headers: headers });
       
      if(response.headers['set-cookie']){
    
        options.token = response.headers['set-cookie'][0].split(';')[0].split('auth=')[1];
        options.expires = response.headers['set-cookie'][0].split(';')[3].split('Expires=')[1];
    
        return options;
    
      } else if(response.data && response.data.error){
      
        if(response.data.error.length){
          
          throw new RequestError(response.data.error.length > 1 ? response.data.error[1] : response.data.error[0]);
        
        } else {
          
          throw new RequestError(response.data.error);
        
        }
       
      }
     
    } catch(err) {
     
      let error;
      
      if(err.response){
        
        if(err.response.status === 401)
          return options;
          
        if(err.response.data && err.response.data.error){
          
          error = err.response.data.error.length 
            ? err.response.data.error.length > 1 
              ? err.response.data.error[1] 
              : err.response.data.error[0]
            : err.response.data.error;
              
        } else {
          
          error = err.response.statusText;
          
        } 
        
      } else if(err.request) {
        
        if(err.request.data && err.request.data.error){
          
          error = err.request.data.error.length 
            ? err.request.data.error.length > 1 
              ? err.request.data.error[1] 
              : err.request.data.error[0]
            : err.request.data.error;
          
        } else {
          
          error = err.message;
          
        }
    
      } else {
        
        error = err;
        
      }
      
      throw new RequestError(error);
     
    }
  
  }
  
  async ping(options) {
  
    //get systemInformation to check if we can connect to tv
    
    try {
      
      const bravia = new Bravia(options);
    
      await bravia.system.invoke('getSystemInformation'); 
    
      return;
      
    } catch(err) {
      
      let error;
      
      if(err.error){
        
        error = err.error.length
          ? err.error.length > 1
            ? err.error[1]
            : err.error[0]
          : err.error;
      
      } else if(err.message){
        
        error = err.message;
      
      } else {
        
        error = err;
      
      }
   
      throw new RequestError(error);
      
    }
  
  }
  
  async fetchApps(tv){
  
    let options = tv.options;
    let allInputs = tv.allInputs;
  
    const bravia = new Bravia(options);
    
    console.log(tv);
    console.log(bravia);
    
    //fetch all applications
    try {
      
      console.log('%s: Fetching all applications', options.name);
      
      let apps = await bravia.appControl.invoke('getApplicationList');
      
      for(const app of apps){
        app.type = 'application';
      }  
      
      allInputs.apps = apps;
    
    } catch(err) {
      
      console.log('%s: An error occured during fetching apps, skip..', options.name);
      allInputs.apps = allInputs.apps || [];
    
    }
    
    return allInputs;
  
  }
  
  async fetchInputs(tv){
  
    let options = tv.options;
    let allInputs = tv.allInputs;
  
    const bravia = new Bravia(options);
    
    //fetch all inputs
    try {
      
      console.log('%s: Fetching all inputs', options.name);
      
      let powerState = await bravia.system.invoke('getPowerStatus');
      
      if(powerState.status !== 'active'){
        await bravia.wake();
        await TIMEOUT(3000);
      }
      
      let inputs = await bravia.avContent.invoke('getCurrentExternalInputsStatus');
      
      for(const input of inputs){
        input.type = 'input';
      }              
      
      allInputs.inputs = inputs;
      
      if(powerState.status !== 'active'){
        await TIMEOUT(750);
        await bravia.sleep();
      }
    
    } catch(err) {
      
      console.log('%s: An error occured during fetching inputs, skip..', options.name);
      allInputs.inputs = allInputs.inputs || [];
    
    }
    
    return allInputs;
  
  }
  
  async fetchChannels(tv){
  
    let options = tv.options;
    let allInputs = tv.allInputs;
  
    const bravia = new Bravia(options);
    
    //fetch all channels
    let channelSources = ['tv:dvbt', 'tv:dvbc', 'tv:dvbs', 'tv:analog'];
    let allChannels = [];
    
    console.log('%s: Fetching all channels', options.name);
    
    for(const source of channelSources){
      
      for(let i = 0; i <= 10; i++){ //max channels 10 * 200 for source
        
        try {
          
          let channels = await bravia.avContent.invoke('getContentList', '1.2', {stIdx: i * 200, cnt: i * 200 + 200, source: source});
          
          await TIMEOUT(750);
          
          allChannels = allChannels.concat(channels);
          
          if(channels[channels.length-1].index !== 199)
            break;
        
        } catch(err) {
          
          console.log('%s: An error occured during fetching ' + source + ', skip..', options.name);
          
          break;
        
        }
      
      }
    
    }
    
    for(const channel of allChannels){
      channel.type = 'channel';
    }
    
    allInputs.channels = allChannels;
    
    return allInputs;
  
  }
  
  async fetchCommands(tv){
  
    let options = tv.options;
    let allInputs = tv.allInputs;
  
    const bravia = new Bravia(options);
    
    //fetch all commands
    try {
      
      console.log('%s: Fetching all commands', options.name);
      
      let commands = await bravia.system.invoke('getRemoteControllerInfo');
      
      for(const command of commands){
        command.type = 'ircc';
      }
      
      allInputs.commands = commands;
    
    } catch(err) {
      
      console.log('%s: An error occured during fetching commands, skip..', options.name);
      allInputs.commands = allInputs.commands || [];
    
    }
    
    return allInputs;
  
  }
  
  async storeInputs(tv){
  
    let options = tv.options;
    let allInputs = tv.allInputs;
  
    let fileName = options.name.replace(/\s+/g, '_') + '-inputs.json';
    
    console.log('%s: All inputs fetched! Storing to ' + (this.homebridgeStoragePath + '/bravia/' + fileName), options.name);
    
    try {
      
      await fs.ensureFile(this.homebridgeStoragePath + '/bravia/' + fileName);
      await fs.writeJson(this.homebridgeStoragePath + '/bravia/' + fileName, allInputs, {spaces: 2});
    
    } catch(err) {
      
      throw new RequestError(err.message);
    
    }
  
  }
  
  async getInputs(tv){
  
    let fileName = tv.replace(/\s+/g, '_') + '-inputs.json';
    let allInputs = null;
    
    try {
     
      await fs.ensureFile(this.homebridgeStoragePath + '/bravia/' + fileName);  
      allInputs = await fs.readJson(this.homebridgeStoragePath + '/bravia/' + fileName, { throws: false });
    
    } catch(err) {
      
      throw new RequestError(err.message);
    
    }
  
    return allInputs;
  
  }
  
  genUUID () {
    
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      let r = Math.random() * 16 | 0; var v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  
  }

}


(() => {
  return new UiServer;
})();