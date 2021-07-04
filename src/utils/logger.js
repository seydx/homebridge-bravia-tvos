'use strict';

class Logger {
  constructor() {
    this.log = console;

    this.debugMode = false;
    this.warnMode = true;
    this.errorMode = true;
    this.extendedErrorMode = true;
  }

  configure(logger, config) {
    this.log = logger;

    this.debugMode = config.debug;
    this.warnMode = config.warn === undefined ? true : config.warn;
    this.errorMode = config.error === undefined ? true : config.error;
    this.extendedErrorMode = config.extendedError === undefined ? true : config.extendedError;
  }

  formatMessage(message, accessoryName, mode) {
    let formatted = mode === 'debug' ? '[DEBUG] ' : '';

    if (accessoryName) {
      formatted += accessoryName + ': ';
    }

    if (message instanceof Error) {
      if (this.extendedErrorMode) {
        formatted = message;
      } else {
        formatted += message.message;
      }
    } else if (typeof message === 'object') {
      formatted += JSON.stringify(message);
    } else {
      formatted += message;
    }

    return formatted;
  }

  info(message, accessoryName) {
    this.log.info(this.formatMessage(message, accessoryName, 'info'));
  }

  warn(message, accessoryName) {
    if (this.warnMode) {
      this.log.warn(this.formatMessage(message, accessoryName, 'warn'));
    }
  }

  error(message, accessoryName) {
    if (this.errorMode) {
      this.log.error(this.formatMessage(message, accessoryName, 'error'));
    }
  }

  debug(message, accessoryName) {
    if (this.debugMode) {
      this.log.info(this.formatMessage(message, accessoryName, 'debug'));
    }
  }
}

const logger = new Logger();
module.exports = logger;
