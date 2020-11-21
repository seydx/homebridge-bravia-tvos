const schema = {
  'schema': {
    'name': {
      'title': 'Log Name',
      'type': 'string',
      'default': 'BraviaTVOS',
      'description': 'Name for the log.'
    },
    'debug': {
      'title': 'Debug',
      'type': 'boolean',
      'description': 'Enables additional output in the log.'
    },
    'tvs': {
      'type': 'object',
      'properties': {
        'name': {
          'title': 'Name',
          'type': 'string',
          'required': true,
          'description': 'Set the device name for display in the Home app.'
        },
        'ip': {
          'title': 'IP Address',
          'type': 'string',
          'placeholder': '192.168.178.1',
          'required': true,
          'description': 'Sony TV IP Address.'
        },
        'mac': {
          'title': 'MAC Address',
          'type': 'string',
          'placeholder': '00:11:22:33:44:55',
          'description': 'Sony TV MAC Address.'
        },
        'port': {
          'title': 'Port',
          'type': 'integer',
          'placeholder': 80,
          'description': 'Sony TV Port.'
        },
        'timeout': {
          'title': 'Timeout',
          'type': 'integer',
          'placeholder': 5,
          'minimum': 5,
          'description': 'Timer in seconds to wait for a response.'
        },
        'psk': {
          'title': 'Pre-Shared Key',
          'type': 'string',
          'description': 'Authentication through PSK. (If no PSK given, the plugin will use authentication through PIN)'
        },
        'appName': {
          'title': 'App Name',
          'type': 'string',
          'description': 'Application name used to generate token. (Only required if you want authentication with generated credentials through PIN method)'
        },
        'appUUID': {
          'title': 'App UUID',
          'type': 'string',
          'description': 'Application UUID obtained by generating a token. (Only required if you want authentication with generated credentials through PIN method)'
        },
        'manufacturer': {
          'name': 'Manufacturer',
          'type': 'string',
          'placeholder': 'Sony',
          'description': 'Set the manufacturer name for display in the Home app.'
        },
        'model': {
          'name': 'Model',
          'type': 'string',
          'placeholder': 'Television',
          'description': 'Set the model for display in the Home app.'
        },
        'serialNumber': {
          'name': 'Serial Number',
          'type': 'string',
          'placeholder': 'SerialNumber',
          'description': 'Set the serial number for display in the Home app.'
        },
        'refreshInputs': {
          'title': 'Refresh Inputs',
          'type': 'boolean',
          'description': 'When this option is enabled, the TV updates all inputs and saves them to disk for further use. (Please turn on the TV before restarting homebridge with this option enabled, otherwise the plugin will turn on the TV to also retrieve CEC inputs)'
        },
        'wol': {
          'title': 'Wake on LAN',
          'type': 'boolean',
          'description': 'When this option is enabled, the plugin uses WOL instead of API to turn on the TV. (WOL must be enabled on the TV and a MAC address must be specified)'
        },
        'inputs': {
          'title': 'TV Inputs',
          'type': 'array',
          'items': {
            'title': 'Input',
            'type': 'string',
            'required': true, 
            'oneOf': [],
            'description': 'Type of the tv input.'
          }
        },
        'apps': {
          'title': 'Applications',
          'type': 'array',
          'items': {
            'title': 'Application',
            'type': 'string', 
            'required': true,
            'oneOf': [],
            'description': 'Name of the application.'
          }
        },
        'channels': {
          'title': 'Channels',
          'type': 'array',
          'items': {
            'title': 'Channels',
            'type': 'string', 
            'required': true,
            'oneOf': [],
            'description': 'Name of the channel.'
          }
        },
        'commands': {
          'title': 'Commands',
          'type': 'array',
          'items': {
            'title': 'Command',
            'type': 'string',
            'oneOf': [],
            'description': 'IRCC code or name of the command. (eg. AAAAAQAAAAEAAABgAw== or PowerOff)'
          }
        },
        'displayOrder': {
          'title': 'Display Order',
          'type': 'array',
          'items': {
            'title': 'Catagory',
            'type': 'string',
            'oneOf': [
              {
                'title': 'Apps',
                'enum': [
                  'apps'
                ]
              },
              {
                'title': 'Channels',
                'enum': [
                  'channels'
                ]
              },
              {
                'title': 'Commands',
                'enum': [
                  'commands'
                ]
              },
              {
                'title': 'Inputs',
                'enum': [
                  'inputs'
                ]
              }
            ],
            'description': 'Name of the catagory.'
          }
        },
        'speaker': {
          'titel': 'Speaker',
          'type': 'object',
          'properties': {
            'output': {
              'title': 'Audio Output',
              'required': true,
              'type': 'string',
              'oneOf': [
                {
                  'title': 'Speaker',
                  'enum': [
                    'speaker'
                  ]
                },
                {
                  'title': 'Headphone',
                  'enum': [
                    'headphone'
                  ]
                },
                {
                  'title': 'Other',
                  'enum': [
                    'other'
                  ]
                }
              ],
              'description': 'Audio output.'
            },
            'increaseBy': {
              'title': 'Increase Volume by',
              'type': 'integer',
              'minimum': 1,
              'maximum': 5,
              'default': 1,
              'description': 'Volume level to increse.'
            },
            'reduceBy': {
              'title': 'Reduce Volume by',
              'type': 'integer',
              'minimum': 1,
              'maximum': 5,
              'default': 1,
              'description': 'Volume level to set.'
            },
            'accType': {
              'title': 'Accessory Type',
              'type': 'string',
              'oneOf': [
                {
                  'title': 'Speaker',
                  'enum': [
                    'speaker'
                  ]
                },
                {
                  'title': 'Lightbulb',
                  'enum': [
                    'lightbulb'
                  ]
                },
                {
                  'title': 'Switch',
                  'enum': [
                    'switch'
                  ]
                }
              ],
              'description': 'Accessory type for the speaker.'
            }
          }
        },
        'remote': {
          'titel': 'Remote',
          'type': 'array',
          'items': {
            'type': 'object',
            'properties': {
              'command': {
                'name': 'Command',
                'type': 'string',
                'description': 'Set custom command for choosen target.',
                'oneOf': [],
                'required': true
              },
              'target': {
                'title': 'Target',
                'required': true,
                'type': 'string',
                'oneOf': [
                  {
                    'title': 'Back',
                    'enum': [
                      'BACK'
                    ]
                  },
                  {
                    'title': 'Down',
                    'enum': [
                      'ARROW_DOWN'
                    ]
                  },
                  {
                    'title': 'Exit',
                    'enum': [
                      'EXIT'
                    ]
                  },
                  {
                    'title': 'Fast Forward',
                    'enum': [
                      'FAST_FORWARD'
                    ]
                  },
                  {
                    'title': 'Information',
                    'enum': [
                      'INFORMATION'
                    ]
                  },
                  {
                    'title': 'Left',
                    'enum': [
                      'ARROW_LEFT'
                    ]
                  },
                  {
                    'title': 'Next Track',
                    'enum': [
                      'NEXT_TRACK'
                    ]
                  },
                  {
                    'title': 'Pause',
                    'enum': [
                      'PAUSE'
                    ]
                  },
                  {
                    'title': 'Play',
                    'enum': [
                      'PLAY'
                    ]
                  },
                  {
                    'title': 'Previous Track',
                    'enum': [
                      'PREVIOUS_TRACK'
                    ]
                  },
                  {
                    'title': 'Rewind',
                    'enum': [
                      'REWIND'
                    ]
                  },
                  {
                    'title': 'Right',
                    'enum': [
                      'ARROW_RIGHT'
                    ]
                  },
                  {
                    'title': 'Select',
                    'enum': [
                      'SELECT'
                    ]
                  },
                  {
                    'title': 'Settings',
                    'enum': [
                      'SETTINGS'
                    ]
                  },
                  {
                    'title': 'Up',
                    'enum': [
                      'ARROW_UP'
                    ]
                  },
                  {
                    'title': 'Volume Down',
                    'enum': [
                      'VOLUME_DOWN'
                    ]
                  },
                  {
                    'title': 'Volume Up',
                    'enum': [
                      'VOLUME_UP'
                    ]
                  }
                ],
                'description': 'Target Apple Remote switch.'
              }
            }
          }
        }
      }
    }
  },
  'layout': [
    'name',
    'debug',
    'tvs.name',
    'tvs.ip',
    'tvs.mac',
    'tvs.port',
    'tvs.timeout',
    'tvs.refreshInputs',
    {
      'key': 'tvs',
      'type': 'section',
      'title': 'Authentication',
      'expandable': true,
      'expanded': false,
      'orderable': false,
      'items': [
        'tvs.psk',
        'tvs.appName',
        'tvs.appUUID'
      ]
    },
    {
      'key': 'tvs',
      'type': 'section',
      'title': 'Branding',
      'expandable': true,
      'expanded': false,
      'orderable': false,
      'items': [
        'tvs.manufacturer',
        'tvs.model',
        'tvs.serialNumber'
      ]
    },
    {
      'key': 'tvs.inputs',
      'type': 'section',
      'title': 'TV Inputs',
      'expandable': true,
      'expanded': false,
      'orderable': true,
      'buttonText': 'Add Input',
      'items': [
        'tvs.inputs[]'
      ]
    },
    {
      'key': 'tvs.apps',
      'type': 'section',
      'title': 'Applications',
      'expandable': true,
      'expanded': false,
      'orderable': true,
      'buttonText': 'Add Application',
      'items': [
        'tvs.apps[]'
      ]
    },
    {
      'key': 'tvs.channels',
      'type': 'section',
      'title': 'Channels',
      'expandable': true,
      'expanded': false,
      'orderable': true,
      'buttonText': 'Add Channel',
      'items': [
        'tvs.channels[]'
      ]
    },
    {
      'key': 'tvs.commands',
      'type': 'section',
      'title': 'Commands',
      'expandable': true,
      'expanded': false,
      'orderable': true,
      'buttonText': 'Add Command',
      'items': [
        'tvs.commands[]'
      ]
    },
    {
      'key': 'tvs.speaker',
      'type': 'section',
      'title': 'Speaker',
      'expandable': true,
      'expanded': false,
      'orderable': false,
      'items': [
        'tvs.speaker.output',
        'tvs.speaker.increaseBy',
        'tvs.speaker.reduceBy',
        'tvs.speaker.accType'
      ]
    },
    {
      'key': 'tvs.remote',
      'type': 'section',
      'title': 'Remote',
      'expandable': true,
      'expanded': false,
      'orderable': false,
      'buttonText': 'Add Custom Command',
      'items': [
        {
          'key': 'tvs.remote[]',
          'items': [
            'tvs.remote[].command',
            'tvs.remote[].target'
          ]
        }
      ]
    },
    {
      'key': 'tvs.displayOrder',
      'type': 'section',
      'title': 'Display Order',
      'expandable': true,
      'expanded': false,
      'orderable': true,
      'buttonText': 'Add Catagory',
      'items': [
        'tvs.displayOrder[]'
      ]
    }
  ]
};