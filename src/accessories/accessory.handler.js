'use strict';

const logger = require('../utils/logger');

class Handler {
  constructor(api, accessory, inputs, bravia) {
    this.api = api;
    this.accessory = accessory;
    this.inputs = inputs;
    this.polling = accessory.context.config.polling;
    this.bravia = bravia;

    this.warningMuted = false;
  }

  async getTelevisionState() {
    try {
      const response = await this.bravia.exec('avContent', 'getPlayingContentInfo');
      logger.debug(response, this.accessory.displayName);

      this.accessory
        .getService(this.api.hap.Service.Television)
        .getCharacteristic(this.api.hap.Characteristic.Active)
        .updateValue(response.turnedOff ? 0 : 1);

      this.accessory
        .getService(this.api.hap.Service.Television)
        .getCharacteristic(this.api.hap.Characteristic.CurrentMediaState)
        .updateValue(response.turnedOff ? 2 : 0);

      this.accessory
        .getService(this.api.hap.Service.Television)
        .getCharacteristic(this.api.hap.Characteristic.TargetMediaState)
        .updateValue(response.turnedOff ? 2 : 0);

      if (!response.turnedOff) {
        const uri = response.result[0].uri;
        let identifier = 0;

        if (uri) {
          const foundUri = this.inputs.findIndex((input) => input.uri === uri);
          if (foundUri > -1) {
            identifier = foundUri + 1;
          }
        }

        this.accessory
          .getService(this.api.hap.Service.Television)
          .getCharacteristic(this.api.hap.Characteristic.ActiveIdentifier)
          .updateValue(identifier);
      }
    } catch (err) {
      this.handleError(this.accessory.displayName, err, 'An error occured during getting television state!');
    }
  }

  async getSpeakerState() {
    try {
      let mute = true;
      let volume = 0;

      const target =
        this.accessory.context.config.speaker.output === 'other'
          ? 'speaker'
          : this.accessory.context.config.speaker.output;

      const tvState = this.accessory
        .getService(this.api.hap.Service.Television)
        .getCharacteristic(this.api.hap.Characteristic.Active).value;

      if (tvState) {
        const response = await this.bravia.exec('audio', 'getVolumeInformation');
        logger.debug(response, `${this.accessory.displayName} Speaker`);

        const speakers = (response.result && response.result.length) ? response.result[0] : [];
        const targetSpeaker = speakers.find((speaker) => speaker.target === target);
        const availableTargets = speakers.map((speaker) => {
          return speaker.target;
        });

        if (targetSpeaker) {
          mute = targetSpeaker.mute;
          volume = targetSpeaker.volume;

          this.accessory.context.speakerMute = mute;
          this.accessory.context.speakerVolume = volume;
        } else {
          logger.warn(
            `Defined speaker output "${target}" not found! Can not update speaker state/volume!`,
            `${this.accessory.displayName} Speaker`
          );
          logger.warn(
            `Available speaker outputs: ${availableTargets.toString()}`,
            `${this.accessory.displayName} Speaker`
          );
        }
      }

      this.changeSpeakerAccessory(mute, volume);
    } catch (err) {
      this.handleError(`${this.accessory.displayName} Speaker`, err, 'An error occured during getting speaker state!');
    }
  }

  changeSpeakerAccessory(mute, volume) {
    const speakerType = this.accessory.context.config.speaker.accType;

    if (speakerType === 'switch') {
      this.accessory
        .getService(this.api.hap.Service.Switch)
        .getCharacteristic(this.api.hap.Characteristic.On)
        .updateValue(!mute);
    } else if (speakerType === 'fan') {
      this.accessory
        .getService(this.api.hap.Service.Fanv2)
        .getCharacteristic(this.api.hap.Characteristic.Active)
        .updateValue(mute ? 0 : 1);

      this.accessory
        .getService(this.api.hap.Service.Fanv2)
        .getCharacteristic(this.api.hap.Characteristic.RotationSpeed)
        .updateValue(volume);
    } else {
      this.accessory
        .getService(this.api.hap.Service.Lightbulb)
        .getCharacteristic(this.api.hap.Characteristic.On)
        .updateValue(!mute);

      this.accessory
        .getService(this.api.hap.Service.Lightbulb)
        .getCharacteristic(this.api.hap.Characteristic.Brightness)
        .updateValue(volume);
    }
  }

  async setActive(state) {
    try {
      this.accessory.context.busy = true;
      logger.info(state ? 'ON' : 'OFF', this.accessory.displayName);

      if (state) {
        await this.bravia.wake();
      } else {
        await this.bravia.exec('system', 'setPowerStatus', '1.0', {
          status: false,
        });
      }

      if (this.accessory.context.config.speaker.active) {
        const mute = state ? this.accessory.context.speakerMute : true;
        const volume = state ? this.accessory.context.speakerVolume : 0;

        this.changeSpeakerAccessory(mute, volume);
      }
    } catch (err) {
      this.handleError(this.accessory.displayName, err, 'An error occured during setting televion state!');
    } finally {
      this.accessory.context.busy = false;
    }
  }

  async setActiveIdentifier(value) {
    try {
      this.accessory.context.busy = true;

      const index = value - 1;
      const input = this.inputs[index];

      if (input.type === 'apps') {
        //apps
        logger.info(`Open: ${input.inputName}`, this.accessory.displayName);
        logger.debug(input, this.accessory.displayName);

        await this.bravia.exec('appControl', 'setActiveApp', '1.0', {
          uri: input.uri,
        });

        //Reset ActiveIdentifier, because "Applications" does not support state control
        setTimeout(
          () =>
            this.accessory
              .getService(this.api.hap.Service.Television)
              .getCharacteristic(this.api.hap.Characteristic.ActiveIdentifier)
              .updateValue(0),
          500
        );
      } else if (input.type === 'channels') {
        //channels
        logger.info(`Open: ${input.inputName}`, this.accessory.displayName);
        logger.debug(input, this.accessory.displayName);

        await this.bravia.exec('avContent', 'setPlayContent', '1.0', {
          uri: input.uri,
        });
      } else if (input.type === 'commands') {
        //commands
        logger.info(`Send command: ${input.inputName} (${input.value})`, this.accessory.displayName);
        logger.debug(input, this.accessory.displayName);

        await this.bravia.execCommand(input.value);

        //Reset ActiveIdentifier, because "Commands" does not support state control
        setTimeout(
          () =>
            this.accessory
              .getService(this.api.hap.Service.Television)
              .getCharacteristic(this.api.hap.Characteristic.ActiveIdentifier)
              .updateValue(0),
          500
        );
      } else if (input.type === 'inputs') {
        //inputs
        logger.info(`Open: ${input.inputName}`, this.accessory.displayName);
        logger.debug(input, this.accessory.displayName);

        await this.bravia.exec('avContent', 'setPlayContent', '1.0', {
          uri: input.uri,
        });
      } else if (input.type === 'macros') {
        //macros
        logger.info(
          `Send Command(s): ${JSON.stringify(input.commands)} - Delay ${input.delay}ms`,
          this.accessory.displayName
        );
        logger.debug(input, this.accessory.displayName);

        /*
         * Due to the fact that "macros" have a delay
         * and with a high number of "commands" it can come to a long waiting time,
         * the Promise is resolved immediately and the function is processed afterwards.
         * Otherwise it can come to problems with HomeKit.
         */
        setTimeout(async () => {
          try {
            await this.bravia.execCommand(input.commands, input.delay);
          } catch (err) {
            this.handleError(this.accessory.displayName, err, 'An error occured during setting active identifier!');
          }
        }, 1);

        //Reset ActiveIdentifier, because "Macros" does not support state control
        setTimeout(
          () =>
            this.accessory
              .getService(this.api.hap.Service.Television)
              .getCharacteristic(this.api.hap.Characteristic.ActiveIdentifier)
              .updateValue(0),
          500
        );
      } else {
        //unknown
        logger.warn(`Unknown identifier: ${value}`, this.accessory.displayName);
      }
    } catch (err) {
      this.handleError(this.accessory.displayName, err, 'An error occured during setting active identifier');
    } finally {
      this.accessory.context.busy = false;
    }
  }

  async setRemoteKey(state, target) {
    try {
      this.accessory.context.busy = true;
      if (target) {
        state = target;
      }

      switch (state) {
        case this.api.hap.Characteristic.RemoteKey.REWIND:
          logger.info('Rewind', this.accessory.displayName);
          logger.debug(`Execute Command: ${this.accessory.context.config.remote.REWIND}`, this.accessory.displayName);
          await this.bravia.execCommand(this.accessory.context.config.remote.REWIND);
          break;
        case this.api.hap.Characteristic.RemoteKey.FAST_FORWARD:
          logger.info('Fast Forward', this.accessory.displayName);
          logger.debug(
            `Execute Command: ${this.accessory.context.config.remote.FAST_FORWARD}`,
            this.accessory.displayName
          );
          await this.bravia.execCommand(this.accessory.context.config.remote.FAST_FORWARD);
          break;
        case this.api.hap.Characteristic.RemoteKey.NEXT_TRACK:
          logger.info('Next Track', this.accessory.displayName);
          logger.debug(
            `Execute Command: ${this.accessory.context.config.remote.NEXT_TRACK}`,
            this.accessory.displayName
          );
          await this.bravia.execCommand(this.accessory.context.config.remote.NEXT_TRACK);
          break;
        case this.api.hap.Characteristic.RemoteKey.PREVIOUS_TRACK:
          logger.info('Previous Track', this.accessory.displayName);
          logger.debug(
            `Execute Command: ${this.accessory.context.config.remote.PREVIOUS_TRACK}`,
            this.accessory.displayName
          );
          await this.bravia.execCommand(this.accessory.context.config.remote.PREVIOUS_TRACK);
          break;
        case this.api.hap.Characteristic.RemoteKey.ARROW_UP:
          logger.info('Up', this.accessory.displayName);
          logger.debug(`Execute Command: ${this.accessory.context.config.remote.ARROW_UP}`, this.accessory.displayName);
          await this.bravia.execCommand(this.accessory.context.config.remote.ARROW_UP);
          break;
        case this.api.hap.Characteristic.RemoteKey.ARROW_DOWN:
          logger.info('Down', this.accessory.displayName);
          logger.debug(
            `Execute Command: ${this.accessory.context.config.remote.ARROW_DOWN}`,
            this.accessory.displayName
          );
          await this.bravia.execCommand(this.accessory.context.config.remote.ARROW_DOWN);
          break;
        case this.api.hap.Characteristic.RemoteKey.ARROW_LEFT:
          logger.info('Left', this.accessory.displayName);
          logger.debug(
            `Execute Command: ${this.accessory.context.config.remote.ARROW_LEFT}`,
            this.accessory.displayName
          );
          await this.bravia.execCommand(this.accessory.context.config.remote.ARROW_LEFT);
          break;
        case this.api.hap.Characteristic.RemoteKey.ARROW_RIGHT:
          logger.info('Right', this.accessory.displayName);
          logger.debug(
            `Execute Command: ${this.accessory.context.config.remote.ARROW_RIGHT}`,
            this.accessory.displayName
          );
          await this.bravia.execCommand(this.accessory.context.config.remote.ARROW_RIGHT);
          break;
        case this.api.hap.Characteristic.RemoteKey.SELECT:
          logger.info('Select', this.accessory.displayName);
          logger.debug(`Execute Command: ${this.accessory.context.config.remote.SELECT}`, this.accessory.displayName);
          await this.bravia.execCommand(this.accessory.context.config.remote.SELECT);
          break;
        case this.api.hap.Characteristic.RemoteKey.BACK:
          logger.info('Back', this.accessory.displayName);
          logger.debug(`Execute Command: ${this.accessory.context.config.remote.BACK}`, this.accessory.displayName);
          await this.bravia.execCommand(this.accessory.context.config.remote.BACK);
          break;
        case this.api.hap.Characteristic.RemoteKey.EXIT:
          logger.info('Exit', this.accessory.displayName);
          logger.debug(`Execute Command: ${this.accessory.context.config.remote.EXIT}`, this.accessory.displayName);
          await this.bravia.execCommand(this.accessory.context.config.remote.EXIT);
          break;
        case this.api.hap.Characteristic.RemoteKey.PLAY_PAUSE:
          if (this.pause) {
            this.pause = false;
            logger.info('Pause', this.accessory.displayName);
            logger.debug(`Execute Command: ${this.accessory.context.config.remote.PAUSE}`, this.accessory.displayName);
            await this.bravia.execCommand(this.accessory.context.config.remote.PAUSE);
          } else {
            this.pause = true;
            logger.info('Play', this.accessory.displayName);
            logger.debug(`Execute Command: ${this.accessory.context.config.remote.PLAY}`, this.accessory.displayName);
            await this.bravia.execCommand(this.accessory.context.config.remote.PLAY);
          }
          break;
        case this.api.hap.Characteristic.RemoteKey.INFORMATION:
          logger.info('Information', this.accessory.displayName);
          logger.debug(
            `Execute Command: ${this.accessory.context.config.remote.INFORMATION}`,
            this.accessory.displayName
          );
          await this.bravia.execCommand(this.accessory.context.config.remote.INFORMATION);
          break;
        case 'MEDIA': {
          const targetState = state === 0 ? 'Stop' : state === 1 ? 'Pause' : 'Play';
          const command =
            state === 0
              ? this.accessory.context.config.remote.STOP
              : state === 1
              ? this.accessory.context.config.remote.PAUSE
              : this.accessory.context.config.remote.PLAY;

          logger.info(`Media state: ${targetState}`, this.accessory.displayName);

          const tvState = this.accessory
            .getService(this.api.hap.Service.Television)
            .getCharacteristic(this.api.hap.Characteristic.Active).value;

          if (!tvState) {
            logger.warn('Can not change media state, Television is not active!', this.accessory.displayName);
            return;
          }

          logger.debug(`Execute Command: ${command}`, this.accessory.displayName);

          await this.bravia.execCommand(command);
          break;
        }
        case 'SETTINGS': {
          logger.info('TV Settings', this.accessory.displayName);

          const tvState = this.accessory
            .getService(this.api.hap.Service.Television)
            .getCharacteristic(this.api.hap.Characteristic.Active).value;

          if (!tvState) {
            logger.warn('Can not open TV Settings, Television is not active!', this.accessory.displayName);
            return;
          }

          logger.debug(`Execute Command: ${this.accessory.context.config.remote.SETTINGS}`, this.accessory.displayName);

          await this.bravia.execCommand(this.accessory.context.config.remote.SETTINGS);
          break;
        }
        default:
          logger.warn(`Unknown remote key: ${state}`, this.accessory.displayName);
          break;
      }
    } catch (err) {
      this.handleError(this.accessory.displayName, err, 'An error occured during setting remote key!');
    } finally {
      this.accessory.context.busy = false;
    }
  }

  async setMute(state, reverse) {
    try {
      const tvState = this.accessory
        .getService(this.api.hap.Service.Television)
        .getCharacteristic(this.api.hap.Characteristic.Active).value;

      if (!tvState) {
        logger.warn('Can not change Mute, Television is not active!', `${this.accessory.displayName} Speaker`);
        return;
      }

      if (reverse) {
        state = !state;
      }

      this.accessory.context.busy = true;
      logger.info(`Mute ${state ? 'ON' : 'OFF'}`, `${this.accessory.displayName} Speaker`);

      await this.bravia.exec('audio', 'setAudioMute', '1.0', { status: state });

      this.accessory.context.speakerMute = state;
    } catch (err) {
      this.handleError(`${this.accessory.displayName} Speaker`, err, 'An error occured during setting speaker state!');
    } finally {
      this.accessory.context.busy = false;
    }
  }

  async setVolume(state) {
    try {
      const tvState = this.accessory
        .getService(this.api.hap.Service.Television)
        .getCharacteristic(this.api.hap.Characteristic.Active).value;

      if (!tvState) {
        logger.warn('Can not change Volume, Television is not active!', `${this.accessory.displayName} Speaker`);
        return;
      }

      const target =
        this.accessory.context.config.speaker.output === 'other' ? '' : this.accessory.context.config.speaker.output;

      logger.info(
        `Volume: ${state} (${this.accessory.context.config.speaker.output})`,
        `${this.accessory.displayName} Speaker`
      );

      this.accessory.context.busy = true;

      await this.bravia.exec('audio', 'setAudioVolume', '1.0', {
        target: target,
        volume: state.toString(),
      });

      this.accessory.context.speakerVolume = state;
    } catch (err) {
      this.handleError(`${this.accessory.displayName} Speaker`, err, 'An error occured during setting speaker volume!');
    } finally {
      this.accessory.context.busy = false;
    }
  }

  async setVolumeSelector(state) {
    try {
      const tvState = this.accessory
        .getService(this.api.hap.Service.Television)
        .getCharacteristic(this.api.hap.Characteristic.Active).value;

      if (!tvState) {
        logger.warn(
          'Can not change Volume (selector), Television is not active!',
          `${this.accessory.displayName} Speaker`
        );
        return;
      }

      // Volume Control through IRCC

      const target =
        this.accessory.context.config.speaker.output === 'other'
          ? 'speaker'
          : this.accessory.context.config.speaker.output;

      const volumeLevel = state
        ? this.accessory.context.config.speaker.reduceBy
        : this.accessory.context.config.speaker.increaseBy;

      const volumeCommand = state
        ? this.accessory.context.config.remote.VOLUME_DOWN
        : this.accessory.context.config.remote.VOLUME_UP;

      const irccCommands = [];

      for (let i = 0; i < volumeLevel; i++) {
        irccCommands.push(volumeCommand);
      }

      logger.info(
        `${state ? 'Reducing' : 'Increasing'} volume by ${volumeLevel} (${target})`,
        `${this.accessory.displayName} Speaker`
      );

      logger.debug(`Execute Command: ${volumeCommand}`, `${this.accessory.displayName} Speaker`);

      this.accessory.context.busy = true;

      await this.bravia.execCommand(irccCommands);

      /*

      //Volume control through API
      
      const target =
        this.accessory.context.config.speaker.output === 'other'
          ? 'speaker'
          : this.accessory.context.config.speaker.output;

      const volumeLevel = state
        ? `-${this.accessory.context.config.speaker.reduceBy}`
        : `+${this.accessory.context.config.speaker.increaseBy}`;

      this.accessory.context.busy = true;

      await this.bravia.exec('audio', 'setAudioVolume', '1.0', {
        target: '',
        volume: volumeLevel,
      });
      
      */
    } catch (err) {
      this.handleError(
        `${this.accessory.displayName} Speaker`,
        err,
        'An error occured during setting speaker volume (selector)!'
      );
    } finally {
      this.accessory.context.busy = false;
    }
  }

  async poll() {
    if (!this.accessory.context.busy) {
      logger.debug('Polling API...', this.accessory.displayName);

      await this.getTelevisionState();

      if (this.accessory.context.config.speaker.active) {
        await this.getSpeakerState();
      }
    } else {
      logger.debug('Skip polling API, Television is busy', this.accessory.displayName);
    }

    setTimeout(() => this.poll(), this.polling * 1000);
  }

  handleError(accessoryName, err, message) {
    //err.code = APIERROR means that protocol/service/method could not be found
    if (err && err.code === 'APIERROR') {
      logger.debug(err.message, accessoryName);
    } else {
      if (err.title === 'No Response' || err.code === 'EHOSTUNREACH') {
        if (this.accessory.context.config.oldModel) {
          logger.debug('Old tv model - Warnings are ignored.');
        } else {
          const msg1 = 'API not reachable - It seems the TV can not handle API calls if its not turned on.';
          const msg2 =
            'To continue using the plugin without errors, please enable "wol" in your config and enter the MAC address of the TV.';
          const msg3 =
            'This warning is displayed only once. To mute the warnings, please enable also "oldModel" in your config.json';

          if (this.warningMuted) {
            logger.debug(msg1);
            logger.debug(msg2);
            logger.debug(msg3);
          } else {
            logger.warn(msg1);
            logger.warn(msg2);
            logger.warn(msg3);
          }

          this.warningMuted = true;
        }
      } else {
        logger.warn(message, accessoryName);
        logger.error(err, accessoryName);
      }
    }
  }
}

module.exports = Handler;
