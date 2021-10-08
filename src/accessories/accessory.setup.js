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

const refreshCache = async (device, bravia, storagePath) => {
  try {
    logger.debug('Running scheduled cache refresh...', device.name);

    let tvCache = await getTvFromCache(device.name, storagePath);

    if (tvCache) {
      const apps = await fetchApps(device.name, bravia);
      const channels = await fetchChannels(device.name, bravia);
      const commands = await fetchCommands(device.name, bravia);
      const inputs = await fetchInputs(device.name, bravia);

      tvCache.name = tvCache.name || device.name;

      //REFRESH APPS
      apps.forEach((app) => {
        if (app) {
          const cachedApp = tvCache.apps.find((cachedApp) => cachedApp && cachedApp.name === app.name);
          if (!cachedApp) {
            tvCache.apps.push(app);
          }
        }
      });

      tvCache.apps = tvCache.apps.filter(
        (cachedApp) => cachedApp && apps.find((app) => app && app.name === cachedApp.name)
      );

      //REFRESH CHANNELS
      channels.forEach((channel) => {
        if (channel) {
          const cachedChannel = tvCache.channels.find(
            (cachedChannel) => cachedChannel && cachedChannel.uri === channel.uri
          );

          if (!cachedChannel) {
            tvCache.channels.push(channel);
          }
        }
      });

      tvCache.channels = tvCache.channels.filter(
        (cachedChannel) => cachedChannel && channels.find((channel) => channel && channel.uri === cachedChannel.uri)
      );

      //REFRESH COMMANDS
      commands.forEach((command) => {
        if (command) {
          const cachedCommand = tvCache.commands.find(
            (cachedCommand) => cachedCommand && cachedCommand.value === command.value
          );

          if (!cachedCommand) {
            tvCache.commands.push(command);
          }
        }
      });

      tvCache.commands = tvCache.commands.filter(
        (cachedCommand) => cachedCommand && commands.find((command) => command && command.value === cachedCommand.value)
      );

      //REFRESH INPUTS
      inputs.forEach((exInput) => {
        if (exInput) {
          const cachedExInput = tvCache.inputs.find(
            (cachedExInput) => cachedExInput && cachedExInput.uri === exInput.uri
          );

          if (!cachedExInput) {
            tvCache.inputs.push(exInput);
          }
        }
      });

      /*tvCache.inputs = tvCache.inputs.filter(
        (cachedExInput) => cachedExInput && inputs.find((exInput) => exInput && exInput.uri === cachedExInput.uri)
      );*/

      await writeTvToCache(device.name, storagePath, tvCache);

      logger.debug(`Television cached: ${storagePath}/bravia/${device.name}.json`, device.name);
      logger.debug('Next sheduled cache refresh in 12h', device.name);

      setTimeout(() => refreshCache(device, bravia, storagePath), device.sheduledRefresh * 60 * 60 * 1000);
    } else {
      logger.debug(
        'Can not refresh television during sheduled cache refresh. No television found in cache!',
        device.name
      );
    }
  } catch (err) {
    logger.warn('An error occured during running sheduled cache refresh! Trying again in 1h', device.name);
    logger.error(err, device.name);

    setTimeout(() => refreshCache(device, bravia, storagePath), 1 * 60 * 60 * 1000); //1h
  }
};

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

        const bravia = new Bravia({
          name: device.appName,
          host: device.ip,
          mac: device.mac,
          port: device.port,
          psk: device.psk,
        });

        device.bravia = bravia;

        //Configure inputs
        let tvCache = await getTvFromCache(device.name, storagePath);

        if (device.refreshInputs || !tvCache) {
          if (device.refreshInputs) {
            logger.debug('"refreshInputs" enabled - refreshing inputs..', device.name);
          } else {
            logger.debug('No cached inputs found, refreshing inputs..', device.name);
          }

          const apps = await fetchApps(device.name, device.bravia);
          const channels = await fetchChannels(device.name, device.bravia);
          const commands = await fetchCommands(device.name, device.bravia);
          const inputs = await fetchInputs(device.name, device.bravia, true);

          if (tvCache) {
            tvCache.name = tvCache.name || device.name;

            //REFRESH APPS
            apps.forEach((app) => {
              const cachedApp = tvCache.apps.find((cachedApp) => cachedApp && cachedApp.name === app.name);
              if (!cachedApp) {
                tvCache.apps.push(app);
              }
            });

            tvCache.apps = tvCache.apps.filter((cachedApp) => apps.find((app) => app && app.name === cachedApp.name));

            //REFRESH CHANNELS
            channels.forEach((channel) => {
              const cachedChannel = tvCache.channels.find(
                (cachedChannel) => cachedChannel && cachedChannel.uri === channel.uri
              );
              if (!cachedChannel) {
                tvCache.channels.push(channel);
              }
            });

            tvCache.channels = tvCache.channels.filter(
              (cachedChannel) => cachedChannel && channels.find((channel) => channel.uri === cachedChannel.uri)
            );

            //REFRESH COMMANDS
            commands.forEach((command) => {
              const cachedCommand = tvCache.commands.find(
                (cachedCommand) => cachedCommand && cachedCommand.value === command.value
              );
              if (!cachedCommand) {
                tvCache.commands.push(command);
              }
            });

            tvCache.commands = tvCache.commands.filter(
              (cachedCommand) => cachedCommand && commands.find((command) => command.value === cachedCommand.value)
            );

            //REFRESH INPUTS
            inputs.forEach((exInput) => {
              const cachedExInput = tvCache.inputs.find(
                (cachedExInput) => cachedExInput && cachedExInput.uri === exInput.uri
              );
              if (!cachedExInput) {
                tvCache.inputs.push(exInput);
              }
            });

            /*tvCache.inputs = tvCache.inputs.filter((cachedExInput) =>
              inputs.find((exInput) => exInput && exInput.uri === cachedExInput.uri)
            );*/
          } else {
            //NEW
            tvCache = {
              name: device.name,
              apps: apps,
              channels: channels,
              commands: commands,
              inputs: inputs,
              macros: device.macros,
            };
          }

          await writeTvToCache(device.name, storagePath, tvCache);
          logger.debug(`Television cached: ${storagePath}/bravia/${device.name}.json`, device.name);

          device.tvCache = tvCache;
        } else {
          logger.debug(`Getting inputs from cache: ${storagePath}/bravia/${device.name}.json`, device.name);

          tvCache.macros = device.macros;
          device.tvCache = tvCache;
        }

        if (device.sheduledRefresh) {
          setTimeout(() => refreshCache(device, bravia, storagePath), device.sheduledRefresh * 60 * 60 * 1000);
        }

        devices.set(uuid, device);
      }
    }
  }
};

module.exports = Setup;
