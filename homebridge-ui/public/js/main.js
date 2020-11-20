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

function resetUI(){
  
  if(timerBar)
    timerBar.set(1);
    
  if(fetchInputsBar)
    fetchInputsBar.set(0);
    
  if(GLOBAL.pinLogin)
    GLOBAL.pinLogin.reset();
    
  if(GLOBAL.pinTimer){
    clearInterval(GLOBAL.pinTimer);
    GLOBAL.pinTimer = false;
  }
  
  GLOBAL.tvOptions = false;
  
  if(GLOBAL.customSchema){
    GLOBAL.customSchema.end();
    GLOBAL.customSchema = false;
  }
  
  $('#tvName').val('');
  $('#tvIpAddress').val('');
  $('#tvMacAddress').val('');
  $('#tvPort').val('');
  $('#tvTimeout').val('');
  
  $('.pin, .psk').hide();
  
  if($('#pinMethod').hasClass('btn-primary'))
    $('#pinMethod').removeClass('btn-primary');
  
  if($('#pinMethod').hasClass('btn-secondary'))
    $('#pinMethod').addClass('btn-secondary');
  
  if($('#pskMethod').hasClass('btn-primary'))
    $('#pskMethod').removeClass('btn-primary');
  
  if($('#pskMethod').hasClass('btn-secondary'))
    $('#pskMethod').addClass('btn-secondary');
  
}

function addTvToList(tv){

  let name = typeof tv === 'string' ? tv : tv.name;
  $('#tvSelect').append('<option value="' + name + '">'+ name + '</option>');

}

function removeTvFromList(tv){

  let name = typeof tv === 'string' ? tv : tv.name;
  $('#tvSelect option[value=\'' + name + '\']').remove();

}

function transPage(cur, next) {

  $('#header').hide();
  $('#main').show();
  
  if(cur){

    cur.fadeOut(500, () =>{
      next.fadeIn(500);
      GLOBAL.previousContent.push(cur);
      GLOBAL.currentContent = next;
    });

  } else {

    next.fadeIn(500);
    GLOBAL.previousContent.push(next);
    GLOBAL.currentContent = next;

  }

  if(GLOBAL.customSchema)
    GLOBAL.customSchema.end();

}

function goBack(index) {

  if(GLOBAL.previousContent.length && GLOBAL.currentContent){

    index = index === undefined 
      ? GLOBAL.previousContent.length - 1
      : index;

    transPage(GLOBAL.currentContent, GLOBAL.previousContent[index]);
    GLOBAL.currentContent = GLOBAL.previousContent[index];
    GLOBAL.previousContent.splice(index, 1);
    
    if(GLOBAL.customSchema)
      GLOBAL.customSchema.end();

  }

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

async function fetchInputs(config){

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
     
    return allInputs;
   
  } catch(err) {

    fetchInputsBar.set(0);
    fetchInputsBar.setText('Error!');
     
    homebridge.toast.error(err.message, 'Error');
   
  }
     
}

async function getInputs(tv){

  try {
     
    let allInputs = await homebridge.request('/getInputs', tv.name);
     
    return allInputs;
   
  } catch(err) {
     
    homebridge.toast.error(err.message, 'Error');
   
  }
     
}

async function createCustomSchema(tv){
  
  let allInputs = {
    apps: [{ 
      title: 'None', 
      enum: 'none'
    }],
    channels: [{ 
      title: 'None', 
      enum: 'none'
    }],
    commands: [{ 
      name: 'None', 
      enum: 'none'
    }],
    inputs: [{ 
      title: 'None', 
      enum: 'none'
    }]
  };
  
  try {
  
    allInputs = await getInputs(tv); 
  
  } catch(err) {
  
    homebridge.toast.error(err.message, 'Error');
  
  }
  
  allInputs.apps.forEach(app => {
    
    schema.schema.tvs.properties.apps.items.oneOf.push({
      enum: [app.enum || app.title],
      title: app.title
    });
    
  });
  
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
  
  allInputs.commands.forEach(command => {
    
    schema.schema.tvs.properties.commands.items.oneOf.push({
      enum: [command.enum || command.name],
      title: command.name
    });
    
  });
  
  allInputs.channels.forEach(channel => {
    
    let title = channel.uri
      ? '[' + (channel.index + 1) + '@' + channel.uri.split('?')[0] + '] ' + channel.title
      : channel.title;
    
    schema.schema.tvs.properties.channels.items.oneOf.push({
      enum: [channel.enum || title],
      title: title
    });
    
  });

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

}

//init

(async () => {
                                       
  try {
    
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

$('.back').on('click', e => {
  goBack();
});

$('#editTV').on('click', async e => {

  resetUI();
  
  let selectedTV = $( '#tvSelect option:selected' ).text();
  let tv = GLOBAL.pluginConfig[0].tvs.find(tv => tv.name === selectedTV);

  if(!tv)
    return homebridge.toast.error('Can not find the TV!', 'Error');
    
  $('#main, #isConfigured').hide();
  $('#header').show();
  
  GLOBAL.previousContent.push($('#isConfigured'));
  GLOBAL.currentContent = $('#header');
    
  createCustomSchema(tv);

});

$('#removeTV').on('click', async e => {
  
  try {
    
    await removeDeviceFromConfig();
    
    resetUI();
  
    transPage(false, GLOBAL.pluginConfig[0].tvs.length ? $('#isConfigured') : $('#notConfigured'));
    
  } catch (err) {
    
    homebridge.toast.error(err.message, 'Error');
    
  }

});

$('.addTV').on('click', e => {
  
  resetUI();
  
  let activeContent = $('#notConfigured').css('display') !== 'none' ? $('#notConfigured') : $('#isConfigured');
  
  transPage(activeContent, $('#configureTV'));

});

$('#chooseAuth').on('click', async e => {

  try {
      
    GLOBAL.tvOptions = {
      name: $('#tvName').val(),
      host: $('#tvIpAddress').val(),
      mac: $('#tvMacAddress').val(),
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
    
    if(GLOBAL.tvOptions.mac && !validate.mac.test(GLOBAL.tvOptions.mac)){
      homebridge.toast.warning('The given mac address is not valid!', 'Warning');
      GLOBAL.tvOptions.mac = false;
    }
    
    transPage($('#configureTV'), $('#authentication'));
    
  } catch(err) {
  
    homebridge.toast.error(err.message, 'Error');
  
  }
    
});

$('#pskMethod').on('click', e => {

  $('.pin').hide();
  timerBar.set(1);
   
  if(GLOBAL.pinlogin)
    GLOBAL.pinlogin.reset();
   
  $('#pinMethod').removeClass('btn-primary');
  $('#pinMethod').addClass('btn-secondary');

  let isVisible = $('.psk').css('display') !== 'none';
   
  if(isVisible){
     
    $('.psk').fadeOut(500);
    $('#pskMethod').removeClass('btn-primary');
    $('#pskMethod').addClass('btn-secondary');
   
  } else {
   
    $('.psk').fadeIn(500);
    $('#pskMethod').removeClass('btn-secondary');
    $('#pskMethod').addClass('btn-primary');
   
  }

});

$('#pskMethodConfirm').on('click', async e => {

  GLOBAL.tvOptions.psk = $('#tvPSK').val();
   
  if(!GLOBAL.tvOptions.psk)
    return homebridge.toast.error('No Pre-Shared Key was entered!', 'Error');
     
  try {
     
    homebridge.showSpinner();

    await homebridge.request('/ping', GLOBAL.tvOptions);
    homebridge.toast.success('Paired successfully!', 'Success');
     
    homebridge.hideSpinner();
   
  } catch(err) {
     
    homebridge.hideSpinner();
     
    return homebridge.toast.error(err.message, 'Error');
     
  }
   
  transPage($('#authentication'), $('#fetchInputs'));
   
  let config = {
    name: GLOBAL.tvOptions.name,
    ip: GLOBAL.tvOptions.host,
    mac: GLOBAL.tvOptions.mac || undefined,
    port: GLOBAL.tvOptions.port,
    timeout: GLOBAL.tvOptions.timeout / 1000,
    psk: GLOBAL.tvOptions.psk
  };
    
  await fetchInputs(config);
  await addNewDeviceToConfig(config);
    
  transPage($('#fetchInputs'), $('#isConfigured'));
    
  resetUI();
 
});

$('#pinMethod').on('click', async e => {

  $('.psk').hide();
  $('#pskMethod').removeClass('btn-primary');
  $('#pskMethod').addClass('btn-secondary');
 
  $('#pinMethod').removeClass('btn-secondary');
  $('#pinMethod').addClass('btn-primary');
   
  try {
     
    homebridge.showSpinner();
    
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
     
    homebridge.toast.error(err.message, 'Error');
     
  } finally {
     
    homebridge.hideSpinner();
     
  }

});

$('#startPair').on('click', async e => {

  try {
  
    if(GLOBAL.tvOptions.pin && validate.pin.test(GLOBAL.tvOptions.pin)){
       
      //pair
      try {
        
        homebridge.showSpinner();
        
        await homebridge.request('/requestPin', GLOBAL.tvOptions);
        
        homebridge.hideSpinner();
     
      } catch(err) {
        
        homebridge.hideSpinner();
        
        return homebridge.toast.error(err.message, 'Error');
     
      }
      
      homebridge.toast.success('Paired successfully!', 'Success');
      
      transPage($('#authentication'), $('#fetchInputs'));
      
      let config = {
        name: GLOBAL.tvOptions.name,
        ip: GLOBAL.tvOptions.host,
        mac: GLOBAL.tvOptions.mac || undefined,
        port: GLOBAL.tvOptions.port,
        timeout: GLOBAL.tvOptions.timeout / 1000,
        appName: GLOBAL.tvOptions.name,
        appUUID: GLOBAL.tvOptions.uuid
      };
      
      await fetchInputs(config);
      await addNewDeviceToConfig(config);
      
      transPage($('#fetchInputs'), $('#isConfigured'));
      
      resetUI();
       
    } else {
  
      homebridge.toast.error('No or no valid pin entered!', 'Error');
  
    }
  
  } catch(err) {
  
    homebridge.toast.error(err.message, 'Error');
  
  }
 
});