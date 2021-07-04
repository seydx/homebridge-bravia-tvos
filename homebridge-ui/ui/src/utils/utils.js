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
