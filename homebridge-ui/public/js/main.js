/*global $, homebridge, timerBar, fetchInputsBar, schema, allInputs:writable*/

const GLOBAL = {
  pluginConfig: false,
  customSchema: false,
  tvOptions: false,
  pinlogin: false,
  currentContent: false,
  previousContent: [],
  pinTimer: false
};

const validate = {
  mac: /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/,
  ip: /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  pin: /^[0-9]{4}$/
};

const TIMEOUT = (ms) => new Promise((res) => setTimeout(res, ms)); 

function showOldSchema() {

  $('#main').removeClass('pb-5');
  $('#notSupported').show();
  
  setTimeout(() => {
    $('#main').fadeOut(500);
  }, 5000);
  
  homebridge.showSchemaForm();
  
  return;

}

function toggleLightTheme(){

  $('.braviaLogo').each(() => {
    $('.braviaLogo').attr('src', 'images/sony_hb_black.png');
  });

  $('.psk, .pin').attr('style', 'max-width: 400px;');

}

function toggleDarkTheme(){

  $('.braviaLogo').each(() => {
    $('.braviaLogo').attr('src', 'images/sony_hb_white.png');
  });

  $('.psk, .pin').attr('style', 'max-width: 400px; background-color: #3c3c3c!important');

}

function toggleContent(){

  $('#header').hide();
  $('#main').show();
  
  return;
  
}

function transPage(cur, next, removed, showSchema) {

  if(showSchema){
 
    cur.hide();
    next.show();
    
    GLOBAL.previousContent.push($('#isConfigured'));
    GLOBAL.currentContent = next;
 
    return;
 
  } else {
  
    toggleContent();
  
  }
  
  if(cur){

    cur.fadeOut(500, () =>{
      
      next.fadeIn(500);
      
      if(!removed)
        GLOBAL.previousContent.push(cur);
      
      GLOBAL.currentContent = next;
    
    });

  } else {

    next.fadeIn(500);
   
    if(!removed)
      GLOBAL.previousContent.push(next);
    
    GLOBAL.currentContent = next;
    
  }

  if(GLOBAL.customSchema)
    GLOBAL.customSchema.end();
    
  return;

}

function goBack(index) {

  if(GLOBAL.previousContent.length && GLOBAL.currentContent){

    index = index === undefined 
      ? GLOBAL.previousContent.length - 1
      : index;

    transPage(GLOBAL.currentContent, GLOBAL.previousContent[index], true);
    //GLOBAL.currentContent = GLOBAL.previousContent[index];
    GLOBAL.previousContent.splice(index, 1);
    
    if(GLOBAL.customSchema)
      GLOBAL.customSchema.end();

  }

  return;

}

function hideAll(){

  toggleContent();
  
  $('#isConfigured').hide();
  $('#notConfigured').hide();
  $('#configureTV').hide();
  $('#authentication').hide();
  $('#fetchInputs').hide();
  
  return;

}

function resetUI(){
  
  resetPIN();
  resetPSK();
  resetForm();
  resetSchema();
  
  return;

}

function resetPIN(){

  $('.pin').hide();

  if($('#pinMethod').hasClass('btn-primary'))
    $('#pinMethod').removeClass('btn-primary');
  
  if(!($('#pinMethod').hasClass('btn-elegant')))
    $('#pinMethod').addClass('btn-elegant');

  if(GLOBAL.pinLogin)
    GLOBAL.pinLogin.reset();
    
  if(GLOBAL.pinTimer){
    clearInterval(GLOBAL.pinTimer);
    GLOBAL.pinTimer = false;
  }
  
  if(timerBar)
    timerBar.set(1);

  return;

}

function resetPSK(){

  $('.psk').hide();
  $('#tvPSK').val('');

  if($('#pskMethod').hasClass('btn-primary'))
    $('#pskMethod').removeClass('btn-primary');
  
  if(!($('#pskMethod').hasClass('btn-elegant')))
    $('#pskMethod').addClass('btn-elegant');

  return;

}

function resetForm(){

  $('#tvName').val('');
  $('#tvIpAddress').val('');
  $('#tvPort').val('');
  $('#tvTimeout').val('');
  $('#tvPSK').val('');
  
  if(fetchInputsBar)
    fetchInputsBar.set(0);

  GLOBAL.tvOptions = false;

  return;

}

function resetSchema(){

  schema.schema.tvs.properties.apps.items.oneOf = [];
  schema.schema.tvs.properties.channels.items.oneOf = [];
  schema.schema.tvs.properties.commands.items.oneOf = [];
  schema.schema.tvs.properties.inputs.items.oneOf = [];
  schema.schema.tvs.properties.remote.items.properties.command.oneOf = [];
  schema.schema.tvs.properties.macros.items.properties.commands.items.oneOf = [];

  if(GLOBAL.customSchema){
    GLOBAL.customSchema.end();
    GLOBAL.customSchema = false;
  }
  
  return;

}

function addTvToList(tv){

  let name = typeof tv === 'string' ? tv : tv.name;
  $('#tvSelect').append('<option value="' + name + '">'+ name + '</option>');

  return;

}

function removeTvFromList(tv){

  let name = typeof tv === 'string' ? tv : tv.name;
  $('#tvSelect option[value=\'' + name + '\']').remove();

  return;

}

async function addNewDeviceToConfig(tv){

  try {

    GLOBAL.pluginConfig[0].tvs.push(tv);
    addTvToList(tv);

    await homebridge.updatePluginConfig(GLOBAL.pluginConfig);
    await homebridge.savePluginConfig();

  } catch(err) {

    homebridge.toast.error(err.message, 'Error');

  }
  
  return;

}

async function removeDeviceFromConfig(){
    
  let foundIndex;
  let pluginConfigBkp = GLOBAL.pluginConfig;
  let selectedTV = $( '#tvSelect option:selected' ).text();
  
  GLOBAL.pluginConfig[0].tvs.forEach((tv, index) => {
    if(tv.name === selectedTV){
      foundIndex = index;
    }
  });
  
  if(foundIndex !== undefined){
    
    try {
      
      GLOBAL.pluginConfig[0].tvs.splice(foundIndex, 1);
      
      await homebridge.updatePluginConfig(GLOBAL.pluginConfig);
      await homebridge.savePluginConfig();
      
      removeTvFromList(selectedTV);
      
      homebridge.toast.success(selectedTV + ' removed from config!', 'Success');
      
    } catch(err) {
      
      GLOBAL.pluginConfig = pluginConfigBkp;
      
      throw err; 
 
    }

  } else {
    
    throw new Error('No TV found in config to remove!');
    
  }
    
  return;
  
}

async function fetchInputs(){

  try {
     
    let allInputs = await homebridge.request('/fetchApps', { options: GLOBAL.tvOptions, allInputs: {} });
     
    fetchInputsBar.animate(0.20);
     
    allInputs = await homebridge.request('/fetchInputs', { options: GLOBAL.tvOptions, allInputs: allInputs });
     
    fetchInputsBar.animate(0.40);
     
    allInputs = await homebridge.request('/fetchChannels', { options: GLOBAL.tvOptions, allInputs: allInputs });
     
    fetchInputsBar.animate(0.60);
     
    allInputs = await homebridge.request('/fetchCommands', { options: GLOBAL.tvOptions, allInputs: allInputs });
     
    fetchInputsBar.animate(0.80);
     
    await homebridge.request('/storeInputs', { options: GLOBAL.tvOptions, allInputs: allInputs });
     
    fetchInputsBar.animate(1);
     
    await TIMEOUT(2000);
   
  } catch(err) {

    fetchInputsBar.set(0);
    fetchInputsBar.setText('Error!');
     
    homebridge.toast.error(err.message, 'Error');
   
  }
  
  return;
     
}

async function getInputs(tv){

  let allInputs;

  try {
     
    allInputs = await homebridge.request('/getInputs', tv.name);
   
  } catch(err) {
     
    homebridge.toast.error(err.message, 'Error');
   
  }
  
  allInputs = {
    apps: allInputs && allInputs.apps && allInputs.apps.length
      ? allInputs.apps
      : [],
    channels: allInputs && allInputs.channels && allInputs.channels.length
      ? allInputs.channels
      : [],
    commands: allInputs && allInputs.commands && allInputs.commands.length
      ? allInputs.commands
      : [],
    inputs: allInputs && allInputs.inputs && allInputs.inputs.length
      ? allInputs.inputs
      : [],
  };
  
  return allInputs;
     
}

async function createCustomSchema(tv){
  
  GLOBAL.tvOptions = {
    name: tv.name,
    host: tv.ip,
    port: tv.port,
    timeout: tv.timeout * 1000
  };
  
  if(tv.psk){
    GLOBAL.tvOptions.psk = tv.psk;
    GLOBAL.tvOptions.pin = false;
  }
    
  if(tv.appUUID){
    GLOBAL.tvOptions.uuid = tv.appUUID;
    GLOBAL.tvOptions.psk = false;
    GLOBAL.tvOptions.pin = true;
  }
  
  try {
  
    allInputs = await getInputs(tv); 
    
  } catch(err) {
  
    homebridge.toast.error(err.message, 'Error');
  
  }
  
  if(!allInputs.apps.length){
  
    delete schema.schema.tvs.properties.apps.items.oneOf; 
  
  } else {
  
    allInputs.apps.forEach(app => {
      
      schema.schema.tvs.properties.apps.items.oneOf.push({
        enum: [app.enum || app.title],
        title: app.title
      });
      
    });
  
  }
  
  if(!allInputs.inputs.length){
  
    delete schema.schema.tvs.properties.inputs.items.oneOf; 
  
  } else {
  
    allInputs.inputs.forEach(input => {
      
      let inputTitle = input.title || input.label;
      
      let title = input.uri
        ? '[' + input.uri.split('?')[0] + '] ' + inputTitle
        : inputTitle;
      
      schema.schema.tvs.properties.inputs.items.oneOf.push({
        enum: [input.enum || title],
        title: title
      });
      
    });
  
  }
  
  if(!allInputs.commands.length){
  
    delete schema.schema.tvs.properties.commands.items.oneOf; 
    delete schema.schema.tvs.properties.remote.items.properties.command.oneOf;
    delete schema.schema.tvs.properties.macros.items.properties.commands.items.oneOf; 
  
  } else {
  
    allInputs.commands.forEach(command => {
      
      schema.schema.tvs.properties.commands.items.oneOf.push({
        enum: [command.enum || command.name],
        title: command.name
      });
      
      schema.schema.tvs.properties.remote.items.properties.command.oneOf.push({
        enum: [command.enum || command.name],
        title: command.name
      });
      
      schema.schema.tvs.properties.macros.items.properties.commands.items.oneOf.push({
        enum: [command.enum || command.name],
        title: command.name
      }); 
      
    });
  
  }
  
  if(!allInputs.channels.length){
  
    delete schema.schema.tvs.properties.channels.items.oneOf; 
  
  } else {
  
    allInputs.channels.forEach(channel => {
      
      let title = channel.uri
        ? '[' + (channel.index + 1) + '@' + channel.uri.split('?')[0] + '] ' + channel.title
        : channel.title;
      
      schema.schema.tvs.properties.channels.items.oneOf.push({
        enum: [channel.enum || title],
        title: title
      });
      
    });
  
  }

  GLOBAL.customSchema = homebridge.createForm(schema, {
    name: GLOBAL.pluginConfig[0].name,
    debug: GLOBAL.pluginConfig[0].debug,
    tvs: tv
  });
  
  GLOBAL.customSchema.onChange(async config => {
    
    GLOBAL.pluginConfig[0].name = config.name;
    GLOBAL.pluginConfig[0].debug = config.debug;
    GLOBAL.pluginConfig[0].tvs = GLOBAL.pluginConfig[0].tvs.map(tv => {
      if(tv.name === config.tvs.name){
        tv = config.tvs;
      }
      return tv;
    });
    
    try {
   
      await homebridge.updatePluginConfig(GLOBAL.pluginConfig);
  
    } catch(err) {
   
      homebridge.toast.error(err.message, 'Error');
  
    }
  
  });
  
  return;

}

(async () => {
                                       
  try {
    
    //check version before load ui
    if(window.compareVersions(window.homebridge.serverEnv.env.packageVersion, '4.34.0') < 0){
      return showOldSchema();
    }
    
    resetUI();
    hideAll();
      
    //toggle dark/light theme
    homebridge.addEventListener('ready', () => {
   
      if(window.document.body.classList.contains('dark-mode')){
   
        toggleDarkTheme();
   
      } else {  
   
        toggleLightTheme();
   
      }
   
    });
    
    GLOBAL.pluginConfig = await homebridge.getPluginConfig();
    
    if(!GLOBAL.pluginConfig.length){
    
      GLOBAL.pluginConfig = [{
        platform: 'BraviaOSPlatform',
        name: 'BraviaTVOS',
        tvs: [] 
      }];
      
      transPage(false, $('#notConfigured'));
      
    } else {
    
      if(!GLOBAL.pluginConfig[0].tvs || (GLOBAL.pluginConfig[0].tvs && !GLOBAL.pluginConfig[0].tvs.length)){
        GLOBAL.pluginConfig[0].tvs = [];
        return transPage(false, $('#notConfigured'));
      }
      
      GLOBAL.pluginConfig[0].tvs.forEach(tv => {
        $('#tvSelect').append('<option value="' + tv.name + '">'+ tv.name + '</option>');
      });
      
      transPage(false, $('#isConfigured'));
    
    }
  
  } catch(err) {
  
    homebridge.toast.error(err.message, 'Error');
  
  }

})();

//jquery listener

$('.back').on('click', () => {
  goBack();
});

$('#addTV, #start').on('click', () => {
  
  resetUI();
  
  let activeContent = $('#notConfigured').css('display') !== 'none' ? $('#notConfigured') : $('#isConfigured');
  
  transPage(activeContent, $('#configureTV'));

});

$('#editTV').on('click', () => {

  resetUI();
  
  let selectedTV = $( '#tvSelect option:selected' ).text();
  let tv = GLOBAL.pluginConfig[0].tvs.find(tv => tv.name === selectedTV);

  if(!tv)
    return homebridge.toast.error('Can not find the TV!', 'Error');

  createCustomSchema(tv);
  
  transPage($('#main, #isConfigured'), $('#header'), false, true);

});

$('#refreshTV').on('click', async () => {  
    
  if(GLOBAL.customSchema && GLOBAL.tvOptions){
  
    resetSchema();
  
    let tv = GLOBAL.pluginConfig[0].tvs.find(tv => tv.name === GLOBAL.tvOptions.name);

    if(!tv)
      return homebridge.toast.error('Can not find TV in config!', 'Error');
    
    transPage($('#isConfigured'), $('#fetchInputs'));
      
    await fetchInputs();
    await createCustomSchema(tv);
    
    transPage($('#main, #fetchInputs'), $('#header'), false, true);
    
  }
  
});

$('#removeTV').on('click', async () => {
  
  try {
    
    await removeDeviceFromConfig();
    
    resetUI();
  
    transPage(false, GLOBAL.pluginConfig[0].tvs.length ? $('#isConfigured') : $('#notConfigured'));
    
  } catch (err) {
    
    homebridge.toast.error(err.message, 'Error');
    
  }

});

$('#chooseAuth').on('click', () => {

  try {
      
    GLOBAL.tvOptions = {
      name: $('#tvName').val(),
      host: $('#tvIpAddress').val(),
      port: parseInt($('#tvPort').val()) || 80,
      timeout: parseInt($('#tvTimeout').val()) 
        ? parseInt($('#tvTimeout').val()) < 5 ? 5000 : parseInt($('#tvTimeout').val()) 
        : 5000
    };
    
    let tvConfig = GLOBAL.pluginConfig[0].tvs.find(tv => tv && tv.name === GLOBAL.tvOptions.name);
    
    if(tvConfig){
      return homebridge.toast.error('There is already a tv configured with the same name!', 'Error');
    } else if(!GLOBAL.tvOptions.name){
      return homebridge.toast.error('There is no name configured for this tv!', 'Error');
    } else if(!validate.ip.test(GLOBAL.tvOptions.host)){
      return homebridge.toast.error('There is no valid ip configured for this tv!', 'Error');
    }
    
    transPage($('#configureTV'), $('#authentication'));
    
  } catch(err) {
  
    homebridge.toast.error(err.message, 'Error');
  
  }
    
});

$('#pskMethod').on('click', () => {

  let isVisible = $('.psk').css('display') !== 'none';
   
  if(isVisible){
     
    resetPSK();
   
  } else {
  
    resetPIN();
   
    $('.psk').fadeIn(500);
    
    if($('#pskMethod').hasClass('btn-elegant'))
      $('#pskMethod').removeClass('btn-elegant');
   
    if(!($('#pskMethod').hasClass('btn-primary')))
      $('#pskMethod').addClass('btn-primary');
   
  }

});

$('#pskMethodConfirm').on('click', async () => {

  GLOBAL.tvOptions.psk = $('#tvPSK').val();
   
  if(!GLOBAL.tvOptions.psk)
    return homebridge.toast.error('No Pre-Shared Key was entered!', 'Error');
     
  try {
     
    homebridge.showSpinner();
    
    GLOBAL.tvOptions.pin = false;

    await homebridge.request('/ping', GLOBAL.tvOptions);
    homebridge.toast.success('Paired successfully!', 'Success');
     
    homebridge.hideSpinner();
    
    transPage($('#authentication'), $('#fetchInputs'));
     
    let config = {
      name: GLOBAL.tvOptions.name,
      ip: GLOBAL.tvOptions.host,
      port: GLOBAL.tvOptions.port,
      timeout: GLOBAL.tvOptions.timeout / 1000,
      psk: GLOBAL.tvOptions.psk
    };
      
    await fetchInputs();
    await addNewDeviceToConfig(config);
      
    transPage($('#fetchInputs'), $('#isConfigured'));
      
    resetUI();
   
  } catch(err) {
  
    resetPSK();
  
    homebridge.hideSpinner();
     
    homebridge.toast.error(err.message, 'Error');
     
  }
 
});

$('#pinMethod').on('click', async () => {

  let isVisible = $('.pin').css('display') !== 'none';
   
  if(isVisible){
     
    resetPIN();
   
  } else {
  
    resetPSK();
    
    if($('#pinMethod').hasClass('btn-elegant'))
      $('#pinMethod').removeClass('btn-elegant');
   
    if(!($('#pinMethod').hasClass('btn-primary')))
      $('#pinMethod').addClass('btn-primary'); 
    
    try {
       
      homebridge.showSpinner();
      
      GLOBAL.tvOptions.psk = false;
      
      GLOBAL.tvOptions = await homebridge.request('/requestPin', GLOBAL.tvOptions);
         
      GLOBAL.pinlogin = $('#pinlogin').pinlogin({
        fields : 4,
        placeholder:'*',
        reset: false,
        complete :function(code){
          GLOBAL.tvOptions.pin = code;
        }
      });
    
      $('.pin').fadeIn(500);
       
      timerBar.set(1);
       
      if(GLOBAL.pinTimer){
        clearInterval(GLOBAL.pinTimer);
        GLOBAL.pinTimer = false;
      }
       
      let counter = 59;
      GLOBAL.pinTimer = setInterval(function(){
        counter--;                    
        if (counter === 0) {
          clearInterval(GLOBAL.pinTimer);
        }
        timerBar.set((counter * 1.67) / 100);
      }, 1000);
       
    } catch(err) {
    
      if($('#pinMethod').hasClass('btn-primary'))
        $('#pinMethod').removeClass('btn-primary');
     
      if(!($('#pinMethod').hasClass('btn-elegant')))
        $('#pinMethod').addClass('btn-elegant');
       
      homebridge.toast.error(err.message, 'Error');
       
    } finally {
       
      homebridge.hideSpinner();
       
    }
   
  } 

});

$('#startPair').on('click', async () => {

  if(GLOBAL.tvOptions.pin && validate.pin.test(GLOBAL.tvOptions.pin)){
     
    //pair
    try {
      
      homebridge.showSpinner();
      
      GLOBAL.tvOptions = await homebridge.request('/requestPin', GLOBAL.tvOptions);
      
      homebridge.hideSpinner();
      
      if(!GLOBAL.tvOptions.token){
        resetPIN();
        return homebridge.toast.error('Pairing failed! Please try again.', 'Error');
      }    
        
      homebridge.toast.success('Paired successfully!', 'Success');
      
      transPage($('#authentication'), $('#fetchInputs'));
      
      let config = {
        name: GLOBAL.tvOptions.name,
        ip: GLOBAL.tvOptions.host,
        port: GLOBAL.tvOptions.port,
        timeout: GLOBAL.tvOptions.timeout / 1000,
        appName: GLOBAL.tvOptions.name,
        appUUID: GLOBAL.tvOptions.uuid
      };
      
      await fetchInputs();
      await addNewDeviceToConfig(config);
      
      transPage($('#fetchInputs'), $('#isConfigured'));
      
      resetUI();
   
    } catch(err) {
    
      resetPIN();
      
      homebridge.hideSpinner();
      
      homebridge.toast.error(err.message, 'Error');
   
    }
     
  } else {

    homebridge.toast.error('No or no valid pin entered!', 'Error');

  }
 
});