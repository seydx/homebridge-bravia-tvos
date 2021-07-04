<template lang="pug">
  .lds-ring(v-if="loading")
      div
      div
      div
      div
      
  div.inner-container(v-else)
    img(src="@/assets/img/logo.png" alt="homebridge-bravia-tvos" width="150px")
    #nav
      router-link(to="/") Home
      span(style="font-weight: bold !important;")  · 
      a.router-link-exact-active.router-link-active(href="#") {{ newName }}
      span(style="font-weight: bold !important;")  · 
      router-link(to="/new") New
</template>

<script>
export default {
  name: 'Edit',
  props: {
    name: {
      type: String,
      default: 'Name',
    },
  },
  data() {
    return {
      customSchema: null,
      loading: true,
      newName: null,
      television: null,
      waitForChanges: null,
    };
  },
  async mounted() {
    try {
      this.newName = this.name;

      const pluginConfig = await this.getPluginConfig();
      this.television = pluginConfig.tvs.find((tv) => tv.name === this.newName);

      if (!this.television) {
        window.homebridge.toast.error(`${this.newName} not found in config.json!`, 'Error');
        return this.$router.push({ path: '/' });
      }

      const inputs = (await window.homebridge.request('/getTV', this.newName)) || {
        apps: [],
        channels: [],
        commands: [],
        inputs: [],
        macros: [],
      };

      this.customSchema = await this.generatePluginShema(pluginConfig, this.television, inputs);

      this.customSchema.onChange(async (config) => {
        if (this.waitForChanges) {
          clearTimeout(this.waitForChanges);
          this.waitForChanges = null;
        }

        this.waitForChanges = setTimeout(async () => {
          try {
            pluginConfig.name = config.name;
            pluginConfig.debug = config.debug;
            pluginConfig.warn = config.warn;
            pluginConfig.error = config.error;
            pluginConfig.extendedError = config.extendedError;

            pluginConfig.tvs = pluginConfig.tvs.map((tv) => {
              if (tv.name === this.newName) {
                if (inputs.channels.length) {
                  config.tvs.channels = (config.tvs.channels || []).map((channel) => {
                    return {
                      name: channel.name,
                      channel: channel.identifier ? parseInt(channel.identifier.split('] ')[1]) : undefined,
                      source: channel.identifier ? channel.identifier.split('[')[1].split(']')[0] : undefined,
                    };
                  });
                }

                if (inputs.commands.length) {
                  config.tvs.commands = (config.tvs.commands || []).map((command) => {
                    const inputCommand = inputs.commands.find(
                      (cmd) => cmd.name === command.value || cmd.value === command.value
                    );

                    if (inputCommand) {
                      const oldCmd = this.television.commands.find(
                        (cmd) => cmd.value === inputCommand.name || cmd.value === inputCommand.value
                      );

                      if (oldCmd) {
                        //Changed old one

                        return {
                          name: command.name,
                          value: oldCmd.value,
                        };
                      } else {
                        //Created new one

                        return {
                          name: inputCommand.name,
                          value: inputCommand.value,
                        };
                      }
                    }

                    return {
                      name: command,
                      value: command,
                    };
                  });

                  config.tvs.macros = (config.tvs.macros || []).map((macro) => {
                    macro.commands = (macro.commands || []).map((command) => {
                      const inputCommand = inputs.commands.find((cmd) => cmd.name === command || cmd.value === command);

                      if (inputCommand) {
                        command = inputCommand.name;
                      }

                      return command;
                    });

                    return macro;
                  });

                  config.tvs.remote = (config.tvs.remote || []).map((remote) => {
                    const inputCommand = inputs.commands.find(
                      (cmd) => cmd.name === remote.command || cmd.value === remote.command
                    );

                    if (inputCommand) {
                      remote.command = inputCommand.name;
                    }

                    return remote;
                  });
                }

                if (inputs.inputs.length) {
                  config.tvs.inputs = (config.tvs.inputs || []).map((input) => {
                    return {
                      name: input.name,
                      identifier: input.identifier ? input.identifier.split('] ')[1] : undefined,
                      source: input.identifier ? input.identifier.split('[')[1].split(']')[0] : undefined,
                    };
                  });
                }

                return config.tvs;
              }

              return tv;
            });

            if (config.tvs.name && config.tvs.name !== this.newName) {
              await window.homebridge.request('/changeTV', {
                oldName: this.newName,
                newName: config.tvs.name,
              });

              this.newName = config.tvs.name;
            }

            console.log('Config updated!', pluginConfig);

            await window.homebridge.updatePluginConfig([pluginConfig]);
          } catch (err) {
            console.log(err);
            window.homebridge.toast.error(err.message, 'Error');
          }
        }, 1000);
      });

      this.loading = false;
    } catch (err) {
      console.log(err);
      window.homebridge.toast.error(err.message, 'Error');
    }
  },
  beforeDestroy() {
    if (this.customSchema) {
      this.customSchema.end();
    }

    //window.homebridge.hideSchemaForm();
  },
};
</script>

<style scoped>
a.router-link-exact-active {
  color: var(--primary-color) !important;
  text-decoration: none !important;
}
</style>
