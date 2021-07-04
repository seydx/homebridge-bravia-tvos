'use-strict';

const crypto = require('crypto');

exports.generateConfig = (config) => {
  return {
    name: config.name || 'FritzPlatform',
    debug: config.debug || false,
    warn: config.warn !== false,
    error: config.error !== false,
    extendedError: config.extendedError !== false,
    polling: config.polling >= 10 ? config.polling : 10,
    tvs: config.tvs || [],
  };
};

//github.com/homebridge/HAP-NodeJS/blob/master/src/lib/util/uuid.ts
exports.UUIDgenerate = (data) => {
  const sha1sum = crypto.createHash('sha1');
  sha1sum.update(data);
  const s = sha1sum.digest('hex');
  let i = -1;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    i += 1;
    switch (c) {
      case 'y':
        return ((parseInt('0x' + s[i], 16) & 0x3) | 0x8).toString(16);
      case 'x':
      default:
        return s[i];
    }
  });
};

exports.validIP = (ip) => {
  if (
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      ip
    )
  ) {
    return ip;
  }
};

exports.validMAC = (mac) => {
  if (/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/.test(mac)) {
    return mac;
  }
};

exports.setTimeoutAsync = (ms) => new Promise((res) => setTimeout(res, ms));
