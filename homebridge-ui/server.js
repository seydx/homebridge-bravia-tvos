const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');
const Bravia = require('@seydx/bravia');

const { setTimeoutAsync } = require('../src/utils/utils');

const {
  fetchApps,
  fetchChannels,
  fetchCommands,
  fetchInputs,
  changeTVFromCache,
  getTvFromCache,
  removeTVFromCache,
  writeTvToCache,
} = require('../src/accessories/accessory.utils');

class UiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    this.onRequest('/auth', this.auth.bind(this));
    this.onRequest('/checkAuth', this.checkAuth.bind(this));

    this.onRequest('/getApps', this.getApps.bind(this));
    this.onRequest('/getChannels', this.getChannels.bind(this));
    this.onRequest('/getCommands', this.getCommands.bind(this));
    this.onRequest('/getInputs', this.getInputs.bind(this));

    this.onRequest('/changeTV', this.changeTV.bind(this));
    this.onRequest('/getTV', this.getTV.bind(this));
    this.onRequest('/refreshTV', this.refreshTV.bind(this));
    this.onRequest('/removeTV', this.removeTV.bind(this));
    this.onRequest('/storeTV', this.storeTV.bind(this));

    this.ready();
  }

  async auth(form) {
    this.name = form.name;

    this.bravia = new Bravia({
      name: form.appName,
      host: form.ip,
      mac: form.mac,
      port: form.port,
      psk: form.psk,
    });

    if (form.refresh) {
      return {
        authenticated: true,
        ...form,
      };
    } else if (form.auth === 'pin' && form.appName && !form.pin) {
      try {
        const credentials = await this.bravia.pair(false, false, true);
        credentials.authenticated = true;

        this.bravia.token = credentials.token;
        this.bravia.expires = credentials.expires;

        return credentials;
      } catch (err) {
        if (err.code === 401) {
          return {
            authenticated: false,
          };
        } else {
          throw new RequestError(err.message);
        }
      }
    } else if (form.auth === 'pin' && form.appName && form.pin) {
      try {
        const credentials = await this.bravia.pair(form.pin, false, false);
        credentials.authenticated = true;

        this.bravia.token = credentials.token;
        this.bravia.expires = credentials.expires;

        return credentials;
      } catch (err) {
        throw new RequestError(err.message);
      }
    } else if (form.auth === 'psk' && form.psk) {
      return {
        authenticated: true,
        name: form.appName,
        psk: form.psk,
      };
    }

    throw new Error('Not authenticated!');
  }

  async checkAuth() {
    if (!this.bravia) {
      throw new RequestError('Not authenticated!');
    }

    return await this.bravia.exec('system', 'getSystemInformation');
  }

  async getApps() {
    if (!this.bravia) {
      throw new RequestError('Not authenticated!');
    }

    return await fetchApps(this.name, this.bravia);
  }

  async getChannels() {
    if (!this.bravia) {
      throw new RequestError('Not authenticated!');
    }

    return await fetchChannels(this.name, this.bravia);
  }

  async getCommands() {
    if (!this.bravia) {
      throw new RequestError('Not authenticated!');
    }

    return await fetchCommands(this.name, this.bravia);
  }

  async getInputs() {
    if (!this.bravia) {
      throw new RequestError('Not authenticated!');
    }

    return await fetchInputs(this.name, this.bravia);
  }

  async changeTV(television) {
    if (!television.oldName || !television.newName) {
      throw new RequestError('Can not change television from cache, oldName/newName not defined!');
    }

    return await changeTVFromCache(television.oldName, television.newName, this.homebridgeStoragePath);
  }

  async getTV(name) {
    if (!name) {
      throw new RequestError('Can not get television from cache. No name defined for television');
    }

    return await getTvFromCache(name, this.homebridgeStoragePath);
  }

  async refreshTV(television) {
    this.pushEvent('refreshTV', `Initializing ${television.name}..`);

    await this.auth({
      name: television.name,
      ip: television.ip,
      mac: television.mac,
      port: television.port,
      appName: television.appName,
      psk: television.psk,
      refresh: true,
    });

    await this.checkAuth();

    await setTimeoutAsync(1000);
    this.pushEvent('refreshTV', `${television.name}: Authenticated!`);

    await setTimeoutAsync(1000);
    this.pushEvent('refreshTV', `${television.name}: Fetching apps..`);
    const apps = await this.getApps();

    await setTimeoutAsync(1000);
    this.pushEvent('refreshTV', `${television.name}: Fetching channels..`);
    const channels = await this.getChannels();

    await setTimeoutAsync(1000);
    this.pushEvent('refreshTV', `${television.name}: Fetching commands..`);
    const commands = await this.getCommands();

    await setTimeoutAsync(1000);
    this.pushEvent('refreshTV', `${television.name}: Fetching inputs..`);
    const inputs = await this.getInputs();

    await setTimeoutAsync(1000);
    this.pushEvent('refreshTV', `${television.name}: Refreshing cache..`);
    await this.storeTV({
      name: television.name,
      inputs: {
        apps: apps,
        channels: channels,
        commands: commands,
        inputs: inputs,
        macros: television.macros || [],
      },
    });

    await setTimeoutAsync(1000);
    this.pushEvent('refreshTV', `${television.name}: Done!`);
  }

  async removeTV(name) {
    if (!name) {
      throw new RequestError('Can not remove television from cache. No name defined for television');
    }

    return await removeTVFromCache(name, this.homebridgeStoragePath);
  }

  async storeTV(television) {
    if (!television.name) {
      throw new RequestError('Can not store television in cache. No name defined for television');
    }

    if (!television.inputs) {
      throw new RequestError('No inputs defined!');
    }

    await writeTvToCache(television.name, this.homebridgeStoragePath, television.inputs);
  }
}

(() => {
  return new UiServer();
})();
