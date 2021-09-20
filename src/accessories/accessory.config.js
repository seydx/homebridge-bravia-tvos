'use strict';

const { validIP, validMAC } = require('../utils/utils');

const Config = (tvConfig) => {
  const validDisplayCatagories = ['apps', 'channels', 'commands', 'inputs', 'macros'];
  const validSpeakerOutput = ['speaker', 'headphone', 'other'];
  const validSpeakerAccTypes = ['lightbulb', 'switch'];
  const validChannelSources = ['dvbt', 'dvbc', 'dvbs', 'isdbt', 'isdbs', 'isdbc', 'analog'];
  const validInputSources = ['cec', 'component', 'composite', 'hdmi', 'scart', 'widi'];

  tvConfig.speaker = tvConfig.speaker || {};
  tvConfig.displayOrder = (tvConfig.displayOrder || []).filter((catagory) => validDisplayCatagories.includes(catagory));

  validDisplayCatagories.forEach((catagory) => {
    if (!tvConfig.displayOrder.includes(catagory)) {
      tvConfig.displayOrder.push(catagory);
    }
  });

  const tvRemote = {
    REWIND: 'AAAAAgAAAJcAAAAbAw==',
    FAST_FORWARD: 'AAAAAgAAAJcAAAAcAw==',
    NEXT_TRACK: 'AAAAAgAAAJcAAAA9Aw==',
    PREVIOUS_TRACK: 'AAAAAgAAAJcAAAA8Aw==',
    ARROW_UP: 'AAAAAQAAAAEAAAB0Aw==',
    ARROW_DOWN: 'AAAAAQAAAAEAAAB1Aw==',
    ARROW_LEFT: 'AAAAAQAAAAEAAAA0Aw==',
    ARROW_RIGHT: 'AAAAAQAAAAEAAAAzAw==',
    SELECT: 'AAAAAQAAAAEAAABlAw==',
    BACK: 'AAAAAgAAAJcAAAAjAw==',
    EXIT: 'AAAAAQAAAAEAAABjAw==',
    PLAY: 'AAAAAgAAAJcAAAAaAw==',
    PAUSE: 'AAAAAgAAAJcAAAAZAw==',
    STOP: 'AAAAAgAAAJcAAAAYAw==',
    INFORMATION: 'AAAAAQAAAAEAAAA6Aw==',
    VOLUME_UP: 'AAAAAQAAAAEAAAASAw==',
    VOLUME_DOWN: 'AAAAAQAAAAEAAAATAw==',
    SETTINGS: 'AAAAAgAAAJcAAAA2Aw==',
  };

  (tvConfig.remote || []).forEach((cmd) => {
    if (cmd.target && cmd.command && tvRemote[cmd.target]) {
      tvRemote[cmd.target] = cmd.command;
    }
  });

  return {
    active: tvConfig.active || false,
    name: tvConfig.name,
    appName: tvConfig.appName,
    type: 'television',
    ip: validIP(tvConfig.ip),
    mac: validMAC(tvConfig.mac),
    port: tvConfig.port || 80,
    psk: tvConfig.psk,
    oldModel: tvConfig.oldMode || false,
    manufacturer: tvConfig.manufacturer || 'Sony',
    model: tvConfig.model || 'Bravia',
    serialNumber: tvConfig.serialNumber || '000000000',
    refreshInputs: tvConfig.refreshInputs || false,
    polling: tvConfig.polling >= 10 ? tvConfig.polling : 10,
    sheduledRefresh: tvConfig.sheduledRefresh >= 0 ? tvConfig.sheduledRefresh : 0,
    inputs: (tvConfig.inputs || [])
      .map((input) => {
        if (input.name && input.identifier && validInputSources.includes(input.source)) {
          return {
            name: input.identifier,
            inputName: input.name,
            source: input.source,
            type: 'inputs',
          };
        }
      })
      .filter((input) => input),
    apps: (tvConfig.apps || [])
      .map((app) => {
        if (app.name && app.identifier) {
          return {
            name: app.identifier,
            inputName: app.name,
            type: 'apps',
          };
        }
      })
      .filter((app) => app),
    channels: (tvConfig.channels || [])
      .map((channel) => {
        if (channel.name && channel.channel && validChannelSources.includes(channel.source)) {
          return {
            name: channel.name,
            inputName: channel.name,
            index: parseInt(channel.channel) - 1,
            source: channel.source,
            type: 'channels',
          };
        }
      })
      .filter((channel) => channel),
    commands: (tvConfig.commands || [])
      .map((command) => {
        if (command.name && command.value) {
          return {
            name: command.name,
            inputName: command.name,
            value: command.value,
            type: 'commands',
          };
        }
      })
      .filter((command) => command),
    macros: (tvConfig.macros || [])
      .map((macro) => {
        if (macro.name && macro.commands && macro.commands.length) {
          return {
            name: macro.name,
            inputName: macro.name,
            delay: macro.delay || 250,
            commands: macro.commands,
            type: 'macros',
          };
        }
      })
      .filter((macro) => macro),
    displayOrder: tvConfig.displayOrder,
    remote: tvRemote,
    speaker: {
      active: tvConfig.speaker.active || false,
      output: validSpeakerOutput.find((el) => el === tvConfig.speaker.output) || 'speaker',
      increaseBy: tvConfig.speaker.increaseBy >= 1 ? tvConfig.speaker.increaseBy : 1,
      reduceBy: tvConfig.speaker.reduceBy >= 1 ? tvConfig.speaker.reduceBy : 1,
      accType: validSpeakerAccTypes.find((el) => el === tvConfig.speaker.accType) || 'lightbulb',
    },
  };
};

module.exports = Config;
