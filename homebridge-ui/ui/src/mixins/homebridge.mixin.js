import configSchema from '@/utils/config.schema';

export default {
  methods: {
    loadHomebridge: () => {
      new Promise((resolve) => {
        window.homebridge.showSpinner();

        window.homebridge.addEventListener('ready', async () => {
          if (window.document.body.classList.contains('dark-mode')) {
            document.documentElement.setAttribute('data-theme', 'dark');
          } else {
            document.documentElement.setAttribute('data-theme', 'light');
          }

          window.homebridge.hideSpinner();
          resolve();
        });
      });
    },
    getPluginConfig: async () => {
      const pluginConfig = await window.homebridge.getPluginConfig();

      if (!pluginConfig.length) {
        const config = {
          name: 'BraviaTVOS',
          platform: 'BraviaOSPlatform',
          debug: true,
          warn: true,
          error: true,
          extendedError: true,
          tvs: [],
        };

        pluginConfig.push(config);
        window.homebridge.updatePluginConfig(pluginConfig);
      }

      return pluginConfig[0];
    },
    generatePluginShema: async (pluginConfig, tv, inputs) => {
      console.log('Generating Custom Schema');

      if (!inputs.apps.length) {
        delete configSchema.schema.tvs.properties.apps.items.properties.identifier.oneOf;
      } else {
        inputs.apps.forEach((app) => {
          configSchema.schema.tvs.properties.apps.items.properties.identifier.oneOf.push({
            enum: [app.name],
            title: app.name,
          });
        });
      }

      if (!inputs.channels.length) {
        configSchema.schema.tvs.properties.channels = {
          title: 'Channels',
          type: 'array',
          items: {
            title: 'Channel',
            type: 'object',
            properties: {
              name: {
                title: 'Name',
                type: 'string',
                description: 'Name for the channel to display in the tv inputs list',
                required: true,
              },
              channel: {
                title: 'Channel Number',
                type: 'integer',
                description: 'Number of the channel as seen on the TV.',
                required: true,
              },
              source: {
                title: 'Channel Source',
                type: 'string',
                required: true,
                oneOf: [
                  {
                    title: 'DVBT',
                    enum: ['dvbt'],
                  },
                  {
                    title: 'DVBC',
                    enum: ['dvbc'],
                  },
                  {
                    title: 'DVBS',
                    enum: ['dvbs'],
                  },
                  {
                    title: 'ISDBT',
                    enum: ['isdbt'],
                  },
                  {
                    title: 'ISDBS',
                    enum: ['isdbs'],
                  },
                  {
                    title: 'ISDBC',
                    enum: ['isdbc'],
                  },
                  {
                    title: 'Analog',
                    enum: ['analog'],
                  },
                ],
                description: 'Source of the channel.',
              },
            },
          },
        };

        configSchema.layout = configSchema.layout.map((layout) => {
          if (layout.key === 'tvs.channels') {
            layout = {
              key: 'tvs.channels',
              type: 'section',
              title: 'Channels',
              expandable: true,
              expanded: false,
              orderable: false,
              buttonText: 'Add Channel',
              items: [
                {
                  key: 'tvs.channels[]',
                  items: ['tvs.channels[].name', 'tvs.channels[].channel', 'tvs.channels[].source'],
                },
              ],
              condition: {
                functionBody: 'try { return model.tvs.active } catch(e){ return false }',
              },
            };
          }

          return layout;
        });
      } else {
        inputs.channels.forEach((channel) => {
          const enumValue = `[${channel.source}] ${channel.index + 1}`;

          configSchema.schema.tvs.properties.channels.items.properties.identifier.oneOf.push({
            enum: [enumValue],
            title: channel.name,
          });
        });

        tv.channels = (tv.channels || []).map((channel) => {
          return {
            name: channel.name,
            identifier: `[${channel.source}] ${channel.channel}`,
          };
        });
      }

      if (!inputs.commands.length) {
        delete configSchema.schema.tvs.properties.commands.items.properties.value.oneOf;
        delete configSchema.schema.tvs.properties.remote.items.properties.command.oneOf;
        delete configSchema.schema.tvs.properties.macros.items.properties.commands.items.oneOf;
      } else {
        inputs.commands.forEach((command) => {
          configSchema.schema.tvs.properties.commands.items.properties.value.oneOf.push({
            enum: [command.value],
            title: command.name,
          });

          configSchema.schema.tvs.properties.remote.items.properties.command.oneOf.push({
            enum: [command.value],
            title: command.name,
          });

          configSchema.schema.tvs.properties.macros.items.properties.commands.items.oneOf.push({
            enum: [command.value],
            title: command.name,
          });
        });

        tv.commands = (tv.commands || []).map((command) => {
          const inputCommand = inputs.commands.find((cmd) => cmd.name === command.value || cmd.value === command.value);

          if (inputCommand) {
            return {
              name: command.name,
              value: inputCommand.value,
            };
          } else {
            return {
              name: command.name,
              value: command.value,
            };
          }
        });

        tv.macros = (tv.macros || []).map((macro) => {
          macro.commands = (macro.commands || []).map((command) => {
            const inputCommand = inputs.commands.find((cmd) => cmd.name === command || cmd.value === command);

            if (inputCommand) {
              command = inputCommand.value;
            }

            return command;
          });

          return macro;
        });

        tv.remote = (tv.remote || []).map((remote) => {
          const inputCommand = inputs.commands.find(
            (cmd) => cmd.name === remote.command || cmd.value === remote.command
          );

          if (inputCommand) {
            remote.command = inputCommand.value;
          }

          return remote;
        });
      }

      if (!inputs.inputs.length) {
        configSchema.schema.tvs.properties.inputs = {
          title: 'TV Inputs',
          type: 'array',
          items: {
            title: 'Input',
            type: 'object',
            properties: {
              name: {
                title: 'Name',
                type: 'string',
                description: 'Name for the channel to display in the tv inputs list',
                required: true,
              },
              identifier: {
                title: 'Identifier',
                type: 'string',
                description: 'Exact name of the input (eg HDMI 1)',
                required: true,
              },
              source: {
                title: 'Input',
                required: true,
                type: 'string',
                oneOf: [
                  {
                    title: 'CEC',
                    enum: ['cec'],
                  },
                  {
                    title: 'Component',
                    enum: ['component'],
                  },
                  {
                    title: 'Composite',
                    enum: ['composite'],
                  },
                  {
                    title: 'HDMI',
                    enum: ['hdmi'],
                  },
                  {
                    title: 'Scart',
                    enum: ['scart'],
                  },
                  {
                    title: 'WIDI',
                    enum: ['widi'],
                  },
                ],
                description: 'Type of the tv input.',
              },
            },
          },
        };

        configSchema.layout = configSchema.layout.map((layout) => {
          if (layout.key === 'tvs.inputs') {
            layout = {
              key: 'tvs.inputs',
              type: 'section',
              title: 'TV Inputs',
              expandable: true,
              expanded: false,
              orderable: false,
              buttonText: 'Add Input',
              items: [
                {
                  key: 'tvs.inputs[]',
                  items: ['tvs.inputs[].name', 'tvs.inputs[].identifier', 'tvs.inputs[].source'],
                },
              ],
              condition: {
                functionBody: 'try { return model.tvs.active } catch(e){ return false }',
              },
            };
          }

          return layout;
        });
      } else {
        inputs.inputs.forEach((input) => {
          const enumValue = `[${input.source}] ${input.name}`;

          configSchema.schema.tvs.properties.inputs.items.properties.identifier.oneOf.push({
            enum: [enumValue],
            title: input.name,
          });
        });

        tv.inputs = (tv.inputs || []).map((input) => {
          return {
            name: input.name,
            identifier: `[${input.source}] ${input.identifier}`,
          };
        });
      }

      const config = {
        name: pluginConfig.name,
        debug: pluginConfig.debug,
        warn: pluginConfig.warn,
        error: pluginConfig.error,
        extendedError: pluginConfig.extendedError,
        tvs: tv || {},
      };

      console.log('Config created!', config);

      return window.homebridge.createForm(configSchema, config);
    },
  },
};
