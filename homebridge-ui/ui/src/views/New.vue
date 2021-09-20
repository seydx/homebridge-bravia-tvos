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
      router-link(to="/config" v-b-popover.hover.top="'This is the old (static) config.schema! With this it is not possible to dynamically display the inputs for a TV. Only for experienced.'" title="Attention") Configs
      span(style="font-weight: bold !important;")  · 
      router-link(to="/new") New
      
    hr.hr-line

    div.mt-4.mb-4(v-if="showForm")
      h3.text-center Television

      NewForm(
        @submitForm="onSubmit"
      )
    
    div.mt-4.mb-4(v-else-if="showPIN")
      h3.text-center Authentication

      .lds-ring.mt-3(v-if="loadingAuth")
        div
        div
        div
        div

      div(v-else)
        p.mt-3.text-center.text-muted Please enter the 4-digit code shown on the TV screen.
        
        BaseTimer(
          :timeLeft="timeLeft"
          :timeLimit="timeLimit"
          :alertThreshold="10",
          :warningThreshold="20",
        )
        
        PincodeInput.mt-4(
          v-model="form.pin"
          placeholder=""
          previewDuration=500,
          characterPreview
          secure
        )

        button.btn.btn-success.mt-3.d-block(
          v-if="!showPINButton"
          type="button"
          style="margin: 0 auto;"
          disabled
        ) Pair

        button.btn.btn-success.mt-3.d-block(
          v-if="showPINButton"
          type="button"
          style="margin: 0 auto;"
          @click="authenticate()"
        ) Pair

    div.mt-4.mb-4(v-else-if="showAuthCheck")
      h3.text-center Authentication
      p.mt-3.text-center.text-muted The plugin is paired with the TV.
        br 
        | Please be patient for a moment.

      .lds-ring.mt-3(v-if="loadingAuthCheck")
        div
        div
        div
        div
      
      div(v-else-if="!loadingAuthCheck && !paired")
        h1.text-danger Error!

      div(v-else-if="!loadingAuthCheck && paired")
        h1.text-success.mt-5 Paired!

        svg(
          id="successAnimation" 
          class="animated" 
          xmlns="http://www.w3.org/2000/svg" 
          width="70" height="70" 
          viewBox="0 0 70 70"
        )
          path(
            id="successAnimationResult" 
            fill="#D8D8D8" 
            d="M35,60 C21.1928813,60 10,48.8071187 10,35 C10,21.1928813 21.1928813,10 35,10 C48.8071187,10 60,21.1928813 60,35 C60,48.8071187 48.8071187,60 35,60 Z M23.6332378,33.2260427 L22.3667622,34.7739573 L34.1433655,44.40936 L47.776114,27.6305926 L46.223886,26.3694074 L33.8566345,41.59064 L23.6332378,33.2260427 Z"
          )
          circle(
            id="successAnimationCircle" 
            cx="35" 
            cy="35" 
            r="24" 
            stroke="#979797" 
            stroke-width="2" 
            stroke-linecap="round" 
            fill="transparent"
          )
          polyline(
            id="successAnimationCheck" 
            stroke="#979797" 
            stroke-width="2" 
            points="23 34 34 43 47 27" 
            fill="transparent"
          )
    
    div.mt-4.mb-4(v-else-if="showInit")
      h3.text-center Initializing
      p.mt-3.text-center.text-muted Inputs are searched.
        br 
        | Please be patient for a moment.
        
      vue-ellipse-progress.mt-5(            
        :progress="progress"
        mode="out-over"
        line-mode="out 5"
        color="#7579ff"
        empty-color="#324c7e"
        :size="180"
        :thickness="5"
        :empty-thickness="3"
        animation="bounce 700 1000"
        fontSize="1.5rem"
        font-color="white"
        :loading="loadingProgress"
      )
        span(slot="legend-value") %
        p(slot="legend-caption", style="font-size: 12px;") {{ progressState }}
</template>

<script>
import PincodeInput from 'vue-pincode-input';

import BaseTimer from '@/components/BaseTimer.vue';
import NewForm from '@/components/NewForm.vue';

import { setTimeoutAsync } from '@/utils/utils';

export default {
  name: 'NewTelevision',
  components: {
    BaseTimer,
    NewForm,
    PincodeInput,
  },
  data() {
    return {
      form: {
        pin: '',
      },
      loading: true,
      loadingAuth: true,
      loadingAuthCheck: true,
      loadingProgress: true,
      paired: false,
      pluginConfig: {},
      progress: 0,
      progressState: 'Initializing..',
      showAuthCheck: false,
      showForm: true,
      showPIN: false,
      showPINButton: false,
      showInit: false,
      televisions: [],
      timeLimit: 60,
      timePassed: 0,
      timerInterval: null,
    };
  },
  computed: {
    timeLeft() {
      return this.timeLimit - this.timePassed;
    },
  },
  watch: {
    form: {
      deep: true,
      handler(newForm) {
        this.showPINButton = newForm.pin.length === 4;
      },
    },
    timeLeft(newValue) {
      if (newValue === 0) {
        this.onTimesUp();
      }
    },
  },
  async mounted() {
    try {
      this.pluginConfig = await this.getPluginConfig();
      this.pluginConfig.tvs.forEach((tv) => this.televisions.push(tv.name));

      this.loading = false;
    } catch (err) {
      console.log(err);
      window.homebridge.toast.error(err.message, 'Error');
    }
  },
  beforeDestroy() {
    this.onTimesUp();
  },
  methods: {
    onTimesUp() {
      //Reset
      clearInterval(this.timerInterval);

      this.form = {
        pin: '',
      };

      this.loadingAuth = true;
      this.loadingAuthCheck = true;
      this.paired = false;
      this.progress = 0;
      this.progressState = 'Initializing..';

      this.showAuthCheck = false;
      this.showForm = true;
      this.showInit = false;
      this.showPIN = false;
      this.showPINButton = false;

      this.timePassed = 0;
    },
    startTimer() {
      this.timerInterval = setInterval(() => (this.timePassed += 1), 1000);
    },
    async authenticate() {
      try {
        this.loadingAuth = true;
        const credentials = await window.homebridge.request('/auth', this.form);

        console.log(credentials);

        if (!credentials.authenticated) {
          this.loadingAuth = false;
          this.startTimer();
        } else {
          this.checkAuth();
        }
      } catch (err) {
        console.log(err);
        window.homebridge.toast.error(err.message, 'Error');
        return this.onTimesUp();
      }
    },
    async checkAuth() {
      try {
        this.showAuthCheck = true;
        this.showForm = false;
        this.showPIN = false;
        this.showInit = false;

        this.loadingAuthCheck = true;
        this.paired = false;

        console.log('Checking authentiation', this.form);

        await window.homebridge.request('/checkAuth');
        this.paired = true;
        this.loadingAuthCheck = false;

        console.log('Paired!');

        setTimeout(() => this.initializeTV(), 3000);
      } catch (err) {
        console.log(err);
        window.homebridge.toast.error(err.message, 'Error');
        this.loadingAuthCheck = false;

        setTimeout(() => this.onTimesUp(), 3000);
      }
    },
    async initializePIN() {
      this.showAuthCheck = false;
      this.showForm = false;
      this.showPIN = true;
      this.showInit = false;

      this.authenticate();
    },
    async initializeTV() {
      try {
        this.showAuthCheck = false;
        this.showForm = false;
        this.showPIN = false;
        this.showInit = true;

        await setTimeoutAsync(1500);
        this.loadingProgress = false;

        this.progressState = 'Fetching apps..';
        const apps = await window.homebridge.request('/getApps');
        this.progress = 20;

        await setTimeoutAsync(1000);

        this.progressState = 'Fetching channels..';
        const channels = await window.homebridge.request('/getChannels');
        this.progress = 40;

        await setTimeoutAsync(1000);

        this.progressState = 'Fetching commands..';
        const commands = await window.homebridge.request('/getCommands');
        this.progress = 60;

        await setTimeoutAsync(1000);

        this.progressState = 'Fetching inputs..';
        const inputs = await window.homebridge.request('/getInputs');
        this.progress = 80;

        await setTimeoutAsync(1000);

        this.progressState = 'Storing..';
        await window.homebridge.request('/storeTV', {
          name: this.form.name,
          inputs: {
            apps: apps,
            channels: channels,
            commands: commands,
            inputs: inputs,
            macros: [],
          },
        });

        this.progress = 90;

        await this.storeInConfig();

        await setTimeoutAsync(1000);

        this.progressState = 'Done!';
        this.progress = 100;

        await setTimeoutAsync(1500);

        this.$router.push({ path: '/' });
      } catch (err) {
        console.log(err);
        window.homebridge.toast.error(err.message, 'Error');
      }
    },
    async storeInConfig() {
      try {
        const tvConfig = {
          active: true,
          name: this.form.name,
          ip: this.form.ip,
          port: this.form.port,
          manufacturer: 'Sony',
          model: 'Bravia',
          serialNumber: '00000000',
          wol: false,
          refreshInputs: false,
          polling: 10,
          sheduledRefresh: 12,
          inputs: [],
          apps: [],
          channels: [],
          commands: [],
          macros: [],
          remote: [],
          displayOrder: ['inputs', 'apps', 'channels', 'commands', 'macros'],
          speaker: {
            active: true,
            output: 'speaker',
            increaseBy: 1,
            reduceBy: 1,
            accType: 'lightbulb',
          },
        };

        if (this.form.auth === 'pin' && this.form.appName) {
          tvConfig.appName = this.form.appName;
        } else if (this.form.auth === 'psk' && this.form.psk) {
          tvConfig.psk = this.form.psk;
        }

        this.pluginConfig.tvs.push(tvConfig);

        await window.homebridge.updatePluginConfig([this.pluginConfig]);
        await window.homebridge.savePluginConfig();
      } catch (err) {
        console.log(err);
        window.homebridge.toast.error(err.message, 'Error');
      }
    },
    async onSubmit(form) {
      this.form = {
        ...this.form,
        ...form,
      };

      if (this.televisions.includes(this.form.name)) {
        return window.homebridge.toast.error('Name already in use!', 'Error');
      }

      if (this.form.auth === 'psk' && this.form.psk) {
        return this.authenticate();
      }

      if (this.form.auth === 'pin' && this.form.appName) {
        return this.initializePIN();
      }
    },
  },
};
</script>

<style scoped lang="scss">
.hr-line {
  border-color: var(--primary-color) !important;
  background-color: var(--primary-color) !important;
  color: var(--primary-color) !important;
}

.form-group >>> label {
  font-weight: bold;
}

#radio-auth >>> label {
  font-weight: normal;
}

.vue-circular-progress >>> .circle {
  margin-bottom: 1rem !important;
}

@keyframes scaleAnimation {
  0% {
    opacity: 0;
    transform: scale(1.5);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes drawCircle {
  0% {
    stroke-dashoffset: 151px;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes drawCheck {
  0% {
    stroke-dashoffset: 36px;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes fadeOut {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

#successAnimationCircle {
  stroke-dasharray: 151px 151px;
  stroke: #28a745;
}

#successAnimationCheck {
  stroke-dasharray: 36px 36px;
  stroke: #28a745;
}

#successAnimationResult {
  fill: #28a745;
  opacity: 0;
}

#successAnimation.animated {
  animation: 1s ease-out 0s 1 both scaleAnimation;

  #successAnimationCircle {
    animation: 1s cubic-bezier(0.77, 0, 0.175, 1) 0s 1 both drawCircle, 0.3s linear 0.9s 1 both fadeOut;
  }

  #successAnimationCheck {
    animation: 1s cubic-bezier(0.77, 0, 0.175, 1) 0s 1 both drawCheck, 0.3s linear 0.9s 1 both fadeOut;
  }

  #successAnimationResult {
    animation: 0.3s linear 0.9s both fadeIn;
  }
}
</style>
