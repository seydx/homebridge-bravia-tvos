<template lang="pug">
  b-form.mt-4.mb-4(@submit="onSubmit" @reset="onReset" style="text-align: left;")
    b-form-group(
      id="input-group-name"
      label="Name"
      label-for="input-name"
      description="Set the television name for display in the Home app"
    )
      b-form-input(
        id="input-name"
        v-model="form.name"
        type="text"
        placeholder="Enter Television Name"
        required
      )

    b-form-group.mt-3(
      id="input-group-ip" 
      label="IP" 
      label-for="input-ip"
      description="Television IP Address"
    )
      b-form-input(
        id="input-ip"
        v-model="form.ip"
        type="text",
        placeholder="Enter Television IP Address"
        required
      )

    b-form-group.mt-3(
      id="input-group-port" 
      label="Port" 
      label-for="input-port"
      description="Television Port"
    )
      b-form-input(
        id="input-port"
        v-model="form.port"
        type="number",
        placeholder="Enter Television Port"
        required
      )

    b-form-group.mt-3(
      id="input-group-auth"
      label="Authentication"
      label-for="radio-auth"
    )
      b-form-radio-group(
        v-model="form.auth"
        id="radio-auth"
        required
      )
        b-form-radio(
          v-model="form.auth" 
          name="psk" value="psk"
        ) Pre-Shared Key
        b-form-radio(
          v-model="form.auth" 
          name="pin" value="pin"
        ) PIN

    b-form-group.mt-3(
      v-if="form.auth === 'psk'"
      id="input-group-psk" 
      label="Pre-Shared Key" 
      label-for="input-psk"
      description="Enter your configured pre-shared key to register the TV via PSK authentication"
    )
      b-form-input(
        id="input-psk"
        v-model="form.psk"
        type="text",
        placeholder="Enter your Pre-Shared Key"
        required
      )

    b-form-group.mt-3(
      v-if="form.auth === 'pin'"
      id="input-group-pin" 
      label="App Name" 
      label-for="input-pin"
      description="Enter a specific app name to register with the TV via PIN authentication"
    )
      b-form-input(
        id="input-pin"
        v-model="form.appName"
        type="text",
        placeholder="Enter an app name"
        required
      )

    .mt-4.w-100.d-flex.flex-wrap.align-content-center.justify-content-end
      b-button.m-1(type="reset" variant="danger") Reset
      b-button.m-1(type="submit" variant="success") Next
</template>

<script>
import { validIP } from '@/utils/utils';

export default {
  name: 'NewForm',
  data() {
    return {
      form: {
        name: '',
        ip: '',
        port: 80,
        auth: '',
        psk: '',
        appName: '@seydx/bravia',
      },
      loading: true,
    };
  },
  mounted() {
    this.loading = false;
  },
  methods: {
    onSubmit(event) {
      event.preventDefault();

      if (!validIP(this.form.ip)) {
        return window.homebridge.toast.error('Invalid ip address!', 'Error');
      }

      this.$emit('submitForm', this.form);
    },
    onReset(event) {
      event.preventDefault();
      // Reset our form values
      this.form = {
        name: '',
        ip: '',
        port: 80,
        auth: '',
        psk: '',
        appName: '@seydx/bravia',
        pin: '',
      };
      // Trick to reset/clear native browser form validation state
      this.loading = true;
      this.$nextTick(() => {
        this.loading = false;
      });
    },
  },
};
</script>
