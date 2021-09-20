'use-strict';

const fs = require('fs-extra');
const logger = require('../utils/logger');
const { setTimeoutAsync } = require('../utils/utils');

exports.fetchApps = async (deviceName, bravia) => {
  let apps = [];

  try {
    logger.debug('Fetching applications', deviceName);

    const response = await bravia.exec('appControl', 'getApplicationList');

    if (response.result[0].length) {
      apps = response.result[0].map((input) => {
        return {
          name: input.title || input.name || input.label,
          uri: input.uri,
        };
      });
    }
  } catch (err) {
    logger.warn('An error occured during fetching applications!', deviceName);
    logger.error(err, deviceName);
  }

  return apps;
};

exports.fetchInputs = async (deviceName, bravia, wakeUp) => {
  let inputs = [];

  try {
    logger.debug('Fetching inputs', deviceName);

    if (wakeUp) {
      await bravia.wake();
      await setTimeoutAsync(5000);
    }

    const response = await bravia.exec('avContent', 'getCurrentExternalInputsStatus');

    if (response.result[0].length) {
      inputs = response.result[0].map((input) => {
        return {
          name: input.title || input.name || input.label,
          uri: input.uri,
          source: input.uri.split('?')[0].split('extInput:')[1],
        };
      });
    }
  } catch (err) {
    logger.warn('An error occured during fetching applications!', deviceName);
    logger.error(err, deviceName);
  }

  return inputs;
};

exports.fetchChannels = async (deviceName, bravia) => {
  let channels = [];
  let validChannelSources = ['tv:dvbt', 'tv:dvbc', 'tv:dvbs', 'tv:isdbt', 'tv:isdbs', 'tv:isdbc', 'tv:analog'];

  try {
    logger.debug('Fetching channels', deviceName);

    const lookupSource = async (start, source) => {
      try {
        logger.debug(`Fetching channels for ${source} - Start: ${start}`, deviceName);

        const response = await bravia.exec('avContent', 'getContentList', '1.2', {
          stIdx: start,
          cnt: 10000,
          source: source,
        });

        if (response.result[0].length) {
          const result = response.result[0].map((input) => {
            return {
              name: input.title || input.name || input.label,
              uri: input.uri,
              index: input.index,
              displayNumber: input.dispNum,
              source: input.uri.split('?')[0].split('tv:')[1],
            };
          });
          channels = channels.concat(result);
          return lookupSource(start + 200, source);
        }
      } catch (err) {
        if (!err.code === 3 && !err.code === 14) {
          //3: Illegal Argument, TV does not allow query channels with given parameter - DONE
          //14: Unsupported Version, TV does not support fetching channels - DONE
          logger.warn(`An error occured during fetching channels for source ${source}!`, deviceName);
          logger.error(err, deviceName);
        }
      }

      return;
    };

    for (const channelSource of validChannelSources) {
      channels[channelSource] = [];
      await lookupSource(0, channelSource);
    }
  } catch (err) {
    logger.warn('An error occured during fetching channels!', deviceName);
    logger.error(err, deviceName);
  }

  return channels;
};

exports.fetchCommands = async (deviceName, bravia) => {
  let commands = [];

  try {
    logger.debug('Fetching commands', deviceName);

    commands = await bravia.getIRCCCodes();
  } catch (err) {
    logger.warn('An error occured during fetching applications!', deviceName);
    logger.error(err, deviceName);
  }

  return commands;
};

exports.getTvFromCache = async (deviceName, storagePath) => {
  await fs.ensureFile(`${storagePath}/bravia/${deviceName}.json`);
  return await fs.readJson(`${storagePath}/bravia/${deviceName}.json`, { throws: false });
};

exports.changeTVFromCache = async (oldDeviceName, newDeviceName, storagePath) => {
  return await fs.move(`${storagePath}/bravia/${oldDeviceName}.json`, `${storagePath}/bravia/${newDeviceName}.json`, {
    overwrite: true,
  });
};

exports.removeTVFromCache = async (deviceName, storagePath) => {
  return await fs.remove(`${storagePath}/bravia/${deviceName}.json`);
};

exports.writeTvToCache = async (deviceName, storagePath, tvCache) => {
  await fs.ensureDir(`${storagePath}/bravia`, { throws: false });
  return await fs.writeJson(`${storagePath}/bravia/${deviceName}.json`, tvCache, {
    spaces: 4,
    throws: false,
  });
};

exports.getInputSourceType = (type) => {
  switch (true) {
    case type.indexOf('app') >= 0:
      //APPLICATION
      return 10;
    case type.indexOf('hdmi') >= 0:
    case type.indexOf('cec') >= 0:
      //HDMI
      return 3;
    case type.indexOf('component') >= 0:
      //COMPONENT_VIDEO
      return 6;
    case type.indexOf('channel') >= 0:
      //TUNER
      return 2;
    case type.indexOf('scart') >= 0:
      //S_VIDEO
      return 5;
    case type.indexOf('widi') >= 0:
      //AIRPLAY
      return 8;
    default:
      //OTHER
      return 0;
  }
};

exports.getInputDeviceType = (type) => {
  switch (true) {
    case type.indexOf('cec') >= 0:
    case type.indexOf('hdmi') >= 0:
      //PLAYBACK
      return 4;
    case type.indexOf('channel') >= 0:
      //TUNER
      return 3;
    case type.indexOf('tv') >= 0:
      //TV
      return 1;
    default:
      //OTHER
      return 0;
  }
};
