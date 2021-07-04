'use strict';

const logger = require('../../utils/logger');
const Handler = require('../accessory.handler');
const { getInputDeviceType, getInputSourceType, writeTvToCache } = require('../accessory.utils');

class Accessory {
  constructor(api, accessory, bravia) {
    this.api = api;
    this.accessory = accessory;
    this.tvCache = accessory.context.config.tvCache;

    this.displayOrder = [];
    this.inputs = this.configureInputs();
    this.handler = new Handler(api, accessory, this.inputs, bravia);
    this.getService();

    this.api.on(
      'shutdown',
      async () =>
        await writeTvToCache(
          this.accessory.displayName,
          this.api.user.storagePath(),
          this.accessory.context.config.tvCache
        )
    );
  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  configureInputs() {
    const customDisplayOrder = this.accessory.context.config.displayOrder;
    logger.debug(`Display Order: ${customDisplayOrder.toString()}`, this.accessory.displayName);

    let inputs = [
      ...this.accessory.context.config[customDisplayOrder[0]],
      ...this.accessory.context.config[customDisplayOrder[1]],
      ...this.accessory.context.config[customDisplayOrder[2]],
      ...this.accessory.context.config[customDisplayOrder[3]],
      ...this.accessory.context.config[customDisplayOrder[4]],
    ];

    inputs = inputs
      .map((configInput) => {
        if (configInput.type === 'apps') {
          const app = this.tvCache.apps.find((tvApp) => tvApp.name === configInput.name);
          const appIndex = this.tvCache.apps.findIndex((tvApp) => tvApp.name === configInput.name);

          if (app) {
            return {
              ...configInput,
              ...app,
              origin: appIndex,
              inputSourceType: getInputSourceType('app'),
              inputDeviceType: getInputDeviceType('other'),
            };
          }
        } else if (configInput.type === 'channels') {
          const channel = this.tvCache.channels.find(
            (tvChannel) => tvChannel.source === configInput.source && tvChannel.index === configInput.index
          );
          const channelIndex = this.tvCache.channels.findIndex(
            (tvChannel) => tvChannel.source === configInput.source && tvChannel.index === configInput.index
          );

          if (channel) {
            return {
              ...configInput,
              ...channel,
              origin: channelIndex,
              inputSourceType: getInputSourceType('channel'),
              inputDeviceType: getInputDeviceType('channel'),
            };
          }
        } else if (configInput.type === 'commands') {
          const command = this.tvCache.commands.find(
            (tvCommand) => tvCommand.name === configInput.value || tvCommand.value === configInput.value
          );
          const commandIndex = this.tvCache.commands.findIndex(
            (tvCommand) => tvCommand.name === configInput.value || tvCommand.value === configInput.value
          );

          if (command) {
            return {
              ...configInput,
              ...command,
              origin: commandIndex,
              inputSourceType: getInputSourceType('other'),
              inputDeviceType: getInputDeviceType('tv'),
            };
          }
        } else if (configInput.type === 'inputs') {
          const input = this.tvCache.inputs.find(
            (tvInput) => tvInput.source === configInput.source && tvInput.name === configInput.name
          );
          const inputIndex = this.tvCache.inputs.findIndex(
            (tvInput) => tvInput.source === configInput.source && tvInput.name === configInput.name
          );

          if (input) {
            return {
              ...configInput,
              ...input,
              origin: inputIndex,
              inputSourceType: getInputSourceType(input.source),
              inputDeviceType: getInputDeviceType(input.source),
            };
          }
        } else if (configInput.type === 'macros') {
          const macro = this.tvCache.macros.find((tvMacro) => tvMacro.name === configInput.name);
          const macroIndex = this.tvCache.macros.findIndex((tvMacro) => tvMacro.name === configInput.name);

          if (macro) {
            return {
              ...configInput,
              ...macro,
              origin: macroIndex,
              inputSourceType: getInputSourceType('other'),
              inputDeviceType: getInputDeviceType('tv'),
            };
          }
        }
      })
      .filter((input) => input);

    return inputs;
  }

  getService() {
    //Service.Television
    let televisionService = this.accessory.addService(
      this.api.hap.Service.Television,
      this.accessory.displayName,
      this.accessory.context.config.subtype //television
    );

    televisionService
      .setCharacteristic(this.api.hap.Characteristic.ConfiguredName, this.tvCache.name || this.accessory.displayName)
      .setCharacteristic(this.api.hap.Characteristic.SleepDiscoveryMode, 1) //Always Discoverable
      .setCharacteristic(this.api.hap.Characteristic.ClosedCaptions, 0); //Disabled

    televisionService
      .getCharacteristic(this.api.hap.Characteristic.ConfiguredName)
      .onSet((name) => (this.accessory.context.config.tvCache.name = name));

    televisionService
      .getCharacteristic(this.api.hap.Characteristic.Active)
      .onSet((state) => this.handler.setActive(state));

    televisionService
      .getCharacteristic(this.api.hap.Characteristic.ActiveIdentifier)
      .onSet((state) => this.handler.setActiveIdentifier(state));

    televisionService
      .getCharacteristic(this.api.hap.Characteristic.RemoteKey)
      .onSet((state) => this.handler.setRemoteKey(state));

    televisionService
      .getCharacteristic(this.api.hap.Characteristic.PowerModeSelection)
      .onSet((state) => this.handler.setRemoteKey(state, 'SETTINGS'));

    televisionService
      .getCharacteristic(this.api.hap.Characteristic.TargetMediaState)
      .onSet((state) => this.handler.setRemoteKey(state, 'MEDIA'));

    //Service.InputSource
    this.inputs.forEach((input, index) => {
      const identifier = index + 1;

      logger.debug(`Creating Input Source: ${input.inputName} (${identifier})`);

      const InputService = this.accessory.addService(
        this.api.hap.Service.InputSource,
        input.inputName,
        `${input.type}-${identifier}`
      );

      InputService.setCharacteristic(this.api.hap.Characteristic.Identifier, identifier)
        .setCharacteristic(this.api.hap.Characteristic.ConfiguredName, input.inputName)
        .setCharacteristic(this.api.hap.Characteristic.IsConfigured, 1) //Configured
        .setCharacteristic(this.api.hap.Characteristic.CurrentVisibilityState, input.visibility || 0)
        .setCharacteristic(this.api.hap.Characteristic.TargetVisibilityState, input.visibility || 0)
        .setCharacteristic(this.api.hap.Characteristic.InputSourceType, input.inputSourceType)
        .setCharacteristic(this.api.hap.Characteristic.InputDeviceType, input.inputDeviceType);

      InputService.getCharacteristic(this.api.hap.Characteristic.CurrentVisibilityState).onGet(() => {
        const inputs = this.accessory.context.config.tvCache[input.type][input.origin];
        return inputs.visibility || 0;
      });

      InputService.getCharacteristic(this.api.hap.Characteristic.TargetVisibilityState)
        .onGet(() => {
          const inputs = this.accessory.context.config.tvCache[input.type][input.origin];
          return inputs.visibility || 0;
        })
        .onSet((state) => {
          this.accessory.context.config.tvCache[input.type][input.origin].visibility = state;
          InputService.getCharacteristic(this.api.hap.Characteristic.CurrentVisibilityState).updateValue(state);
        });

      InputService.getCharacteristic(this.api.hap.Characteristic.ConfiguredName).onSet(
        (name) => (this.accessory.context.config.tvCache[input.type][input.origin].inputName = name)
      );

      this.displayOrder.push(0x01, 0x04, identifier & 0xff, 0x00, 0x00, 0x00);
      televisionService.addLinkedService(InputService);
    });

    //DisplayOrder
    this.displayOrder.push(0x00, 0x00);

    televisionService.setCharacteristic(
      this.api.hap.Characteristic.DisplayOrder,
      Buffer.from(this.displayOrder).toString('base64')
    );

    //Service.TelevisionSpeaker
    let televisionSpeakerService = this.accessory.addService(
      this.api.hap.Service.TelevisionSpeaker,
      this.accessory.displayName,
      'television-speaker'
    );

    televisionSpeakerService
      .setCharacteristic(this.api.hap.Characteristic.Active, this.api.hap.Characteristic.Active.ACTIVE)
      .setCharacteristic(this.api.hap.Characteristic.VolumeControlType, 3); //Absolute

    televisionSpeakerService
      .getCharacteristic(this.api.hap.Characteristic.Mute)
      .onSet((state) => this.handler.setMute(state));

    televisionSpeakerService
      .getCharacteristic(this.api.hap.Characteristic.Volume)
      .onSet((state) => this.handler.setVolume(state));

    televisionSpeakerService
      .getCharacteristic(this.api.hap.Characteristic.VolumeSelector)
      .onSet((state) => this.handler.setVolumeSelector(state));

    //Custom Speaker
    if (this.accessory.context.config.speaker.active) {
      this.accessory.context.speakerMute = true;
      this.accessory.context.speakerVolume = 0;

      let speakerType = this.accessory.context.config.speaker.accType;

      if (speakerType === 'switch') {
        let speakerService = this.accessory.addService(
          this.api.hap.Service.Switch,
          `${this.accessory.displayName} Speaker`,
          'speaker'
        );

        speakerService
          .getCharacteristic(this.api.hap.Characteristic.On)
          .onSet((state) => this.handler.setMute(state, true));
      } else {
        let speakerService = this.accessory.addService(
          this.api.hap.Service.Lightbulb,
          `${this.accessory.displayName} Speaker`,
          'speaker'
        );

        speakerService.addCharacteristic(this.api.hap.Characteristic.Brightness);

        speakerService
          .getCharacteristic(this.api.hap.Characteristic.On)
          .onSet((state) => this.handler.setMute(state, true));

        speakerService
          .getCharacteristic(this.api.hap.Characteristic.Brightness)
          .onSet((state) => this.handler.setVolume(state));
      }
    }

    setTimeout(() => this.handler.poll(), 1000);
  }
}

module.exports = Accessory;
