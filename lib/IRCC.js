class IRCC {

  constructor(){

    this.codes = {
      'Power': 'AAAAAQAAAAEAAAAVAw==',
      'Input': 'AAAAAQAAAAEAAAAlAw==',
      'SyncMenu': 'AAAAAgAAABoAAABYAw==',
      'Hdmi1': 'AAAAAgAAABoAAABaAw==',
      'Hdmi2': 'AAAAAgAAABoAAABbAw==',
      'Hdmi3': 'AAAAAgAAABoAAABcAw==',
      'Hdmi4': 'AAAAAgAAABoAAABdAw==',
      'Num1': 'AAAAAQAAAAEAAAAAAw==',
      'Num2': 'AAAAAQAAAAEAAAABAw==',
      'Num3': 'AAAAAQAAAAEAAAACAw==',
      'Num4': 'AAAAAQAAAAEAAAADAw==',
      'Num5': 'AAAAAQAAAAEAAAAEAw==',
      'Num6': 'AAAAAQAAAAEAAAAFAw==',
      'Num7': 'AAAAAQAAAAEAAAAGAw==',
      'Num8': 'AAAAAQAAAAEAAAAHAw==',
      'Num9': 'AAAAAQAAAAEAAAAIAw==',
      'Num0': 'AAAAAQAAAAEAAAAJAw==',
      'Dot': 'AAAAAgAAAJcAAAAdAw==',
      'CC': 'AAAAAgAAAJcAAAAoAw==',
      'Red': 'AAAAAgAAAJcAAAAlAw==',
      'Green': 'AAAAAgAAAJcAAAAmAw==',
      'Yellow': 'AAAAAgAAAJcAAAAnAw==',
      'Blue': 'AAAAAgAAAJcAAAAkAw==',
      'Up': 'AAAAAQAAAAEAAAB0Aw==',
      'Down': 'AAAAAQAAAAEAAAB1Aw==',
      'Right': 'AAAAAQAAAAEAAAAzAw==',
      'Left': 'AAAAAQAAAAEAAAA0Aw==',
      'Confirm': 'AAAAAQAAAAEAAABlAw==',
      'Help': 'AAAAAgAAAMQAAABNAw==',
      'Display': 'AAAAAQAAAAEAAAA6Aw==',
      'Options': 'AAAAAgAAAJcAAAA2Aw==',
      'Back': 'AAAAAgAAAJcAAAAjAw==',
      'Home': 'AAAAAQAAAAEAAABgAw==',
      'VolumeUp': 'AAAAAQAAAAEAAAASAw==',
      'VolumeDown': 'AAAAAQAAAAEAAAATAw==',
      'Mute': 'AAAAAQAAAAEAAAAUAw==',
      'Audio': 'AAAAAQAAAAEAAAAXAw==',
      'ChannelUp': 'AAAAAQAAAAEAAAAQAw==',
      'ChannelDown': 'AAAAAQAAAAEAAAARAw==',
      'Play': 'AAAAAgAAAJcAAAAaAw==',
      'Pause': 'AAAAAgAAAJcAAAAZAw==',
      'Stop': 'AAAAAgAAAJcAAAAYAw==',
      'FlashPlus': 'AAAAAgAAAJcAAAB4Aw==',
      'FlashMinus': 'AAAAAgAAAJcAAAB5Aw==',
      'Prev': 'AAAAAgAAAJcAAAA8Aw==',
      'Next': 'AAAAAgAAAJcAAAA9Aw=='
    };

  }

  getCode(ircc){
    for(const i in this.codes){
      if(ircc===this.codes[i]){
        return i;
      }
    }
    
    return false;

  }
}

exports.IRCC = IRCC;
