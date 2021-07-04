'use strict';

const Bravia = require('@seydx/bravia');
const logger = require('../utils/logger');
const { UUIDgenerate } = require('../utils/utils');
const Config = require('./accessory.config');
const {
  fetchApps,
  fetchChannels,
  fetchCommands,
  fetchInputs,
  getTvFromCache,
  writeTvToCache,
} = require('./accessory.utils');

const Setup = async (devices, tvConfigs, storagePath) => {
  for (const config of tvConfigs) {
    let error = false;
    const device = Config(config);

    if (!device.active) {
      error = true;
    } else if (!device.name) {
      logger.warn('One of the TELEVISIONS has no name configured. This device will be skipped.');
      error = true;
    } else if (!device.ip) {
      logger.warn('There is no ip configured for this device. This device will be skipped.', device.name);
      error = true;
    } else if (!device.psk && !device.appName) {
      logger.warn('There is no psk/appName configured for this device. This device will be skipped.', device.name);
      error = true;
    }

    if (!error) {
      const uuid = UUIDgenerate(device.name);

      if (devices.has(uuid)) {
        logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', device.name);
      } else {
        logger.info('Initializing Television...', device.name);

        device.bravia = new Bravia({
          name: device.appName,
          host: device.ip,
          mac: device.mac,
          port: device.port,
          psk: device.psk,
        });

        //Configure inputs
        let tvCache = await getTvFromCache(device.name, storagePath);

        if (device.refreshInputs || !tvCache) {
          if (device.refreshInputs) {
            logger.debug('Refreshing inputs..', device.name);
          } else {
            logger.debug('No cached inputs found, refreshing inputs..', device.name);
          }

          tvCache = {
            name: device.name,
            apps: (await fetchApps(device.name, device.bravia)) || [],
            inputs: (await fetchInputs(device.name, device.bravia)) || [],
            channels: (await fetchChannels(device.name, device.bravia)) || [],
            commands: (await fetchCommands(device.name, device.bravia)) || [],
            macros: device.macros,
          };

          await writeTvToCache(device.name, storagePath, tvCache);

          logger.debug(`Inputs written into cache: ${storagePath}/bravia/${device.name}.json`, device.name);
          device.tvCache = tvCache;
        } else {
          logger.debug(`Getting inputs from cache: ${storagePath}/bravia/${device.name}.json`, device.name);

          tvCache.macros = device.macros;
          device.tvCache = tvCache;
        }

        devices.set(uuid, device);
      }
    }
  }
};

module.exports = Setup;
