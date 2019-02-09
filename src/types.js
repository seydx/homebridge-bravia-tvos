'use strict';

const inherits = require('util').inherits;

module.exports = {
  registerWith: function (hap) {
    const Characteristic = hap.Characteristic;
    //const Service = hap.Service;

    /// /////////////////////////////////////////////////////////////////////////
    // Refresh Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.Refresh = function() {
      Characteristic.call(this, 'Refresh', '0dd89185-f68c-4116-84fe-fcd28e49d215');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.Refresh, Characteristic);
    Characteristic.Refresh.UUID = '0dd89185-f68c-4116-84fe-fcd28e49d215';

    /// /////////////////////////////////////////////////////////////////////////
    // Active Identifier Name Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.IdentName = function() {
      Characteristic.call(this, 'Active Identifier Name', '5f5818fb-677c-4648-9e78-4225b6f9db07');
      this.setProps({
        format: Characteristic.Formats.STRING,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.IdentName, Characteristic);
    Characteristic.IdentName.UUID = '5f5818fb-677c-4648-9e78-4225b6f9db07';   
    
    /// /////////////////////////////////////////////////////////////////////////
    // Active Identifier Nr Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.IdentNr = function() {
      Characteristic.call(this, 'Identifier Nr', 'b62fbd69-97f7-4e96-a592-74d4c111c264');
      this.setProps({
        format: Characteristic.Formats.STRING,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.IdentNr, Characteristic);
    Characteristic.IdentNr.UUID = 'b62fbd69-97f7-4e96-a592-74d4c111c264';  
    
    /// /////////////////////////////////////////////////////////////////////////
    // Meta Type Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.metaType = function() {
      Characteristic.call(this, 'Typ', '7fd4a469-ce31-4f05-80c6-cf263d71f708');
      this.setProps({
        format: Characteristic.Formats.STRING,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.metaType, Characteristic);
    Characteristic.metaType.UUID = '7fd4a469-ce31-4f05-80c6-cf263d71f708';   
  }
};