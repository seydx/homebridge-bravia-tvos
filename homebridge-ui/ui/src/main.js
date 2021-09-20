import Vue from 'vue';
import App from './App.vue';
import router from './router';

import '@/assets/css/main.css';
import '@/assets/css/theme.css';

import homebridge from '@/mixins/homebridge.mixin';

import {
  ButtonPlugin,
  CardPlugin,
  CollapsePlugin,
  FormPlugin,
  FormCheckboxPlugin,
  FormRadioPlugin,
  FormSelectPlugin,
  FormInputPlugin,
  FormGroupPlugin,
  LinkPlugin,
  ModalPlugin,
  PopoverPlugin,
} from 'bootstrap-vue';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

import VueEllipseProgress from 'vue-ellipse-progress';

Vue.config.productionTip = false;

Vue.mixin(homebridge);

Vue.use(ButtonPlugin);
Vue.use(CardPlugin);
Vue.use(CollapsePlugin);
Vue.use(FormPlugin);
Vue.use(FormCheckboxPlugin);
Vue.use(FormRadioPlugin);
Vue.use(FormSelectPlugin);
Vue.use(FormInputPlugin);
Vue.use(FormGroupPlugin);
Vue.use(LinkPlugin);
Vue.use(ModalPlugin);
Vue.use(PopoverPlugin);
Vue.use(VueEllipseProgress);

new Vue({
  router,
  render: (h) => h(App),
}).$mount('#app');
