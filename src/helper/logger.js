'use strict';

var log, debugMode;

module.exports = {

  init: function(logger, debug){
  
    log = logger;
    //debugMode = process.argv.includes('-D') || process.argv.includes('--debug');
    debugMode = debug;
    
    return;
      
  },
  
  formatMessage: function(message, device){
    device = typeof device === 'object' ? JSON.stringify(device) : device;
    let formatted = '';
    if (device) {
      formatted += device + ': ';
    }
    
    if(message instanceof Error){
      formatted = message;
    } else if(typeof message === 'object'){
      //formatted += JSON.stringify(message, null, 2);
      formatted += JSON.stringify(message);
    } else {
      formatted += message;
    }
    return formatted;
  },

  info: function(message, device){
    log.info(this.formatMessage(message, device));
  },

  warn: function(message, device){
    log.warn(this.formatMessage(message, device));
  },

  error: function(message, device){
    log.error(this.formatMessage(message, device));
  },

  debug: function(message, device){
    if (debugMode) {
      //log.debug(this.formatMessage(message, device));
      log.info(this.formatMessage(message, device));
    }
  }

};