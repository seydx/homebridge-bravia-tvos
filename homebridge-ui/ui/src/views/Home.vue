<template lang="pug">
  .lds-ring(v-if="loading")
      div
      div
      div
      div

  div.inner-container(v-else)
    img(src="@/assets/img/logo.png" alt="homebridge-bravia-tvos" width="150px")
    
    div.mb-3
      h5 Welcome to 
      h1.subtitle Bravia TV OS
      .mt-3.mb-2.text-muted Homebridge plugin for Sony Bravia Android TVs.
      b-link.github-link(href="https://github.com/SeydX/homebridge-bravia-tvos" target="_blank")
        b-icon(icon="github")
        |  Github
    
    #nav
      router-link(to="/") Home
      span(style="font-weight: bold !important;")  · 
      router-link(to="/config") Configs
      span(style="font-weight: bold !important;")  · 
      router-link(to="/new") New 
      b-form-select.seelectTV(v-model="selected" :options="televisions", v-if="televisions.length")
        template#first
          b-form-select-option(:value="null" disabled) Please select a TV
      .mt-3.mb-3
        button.editBtn.removeBtn(
          type="button"
          :disabled="selected ? false : true"
          v-if="televisions.length"
          v-b-modal.modal-remove
        )
          b-icon(icon="trash-fill")
        button.editBtn.refreshBtn.mx-2(
          type="button"
          :disabled="selected ? false : true"
          @click="refreshTV()"
          v-if="televisions.length"
        )
          b-icon(icon="arrow-repeat")
        button.editBtn(
          type="button"
          :disabled="selected ? false : true"
          @click="$router.push('/edit/' + selected)"
          v-if="televisions.length"
        )
          b-icon(icon="pencil-square")
    b-modal(
      id="modal-remove"
      title="Confirm"
      title-class="primary-color"
      @ok="removeTV()",
      ok-title="Remove"
      ok-variant="danger"
      cancel-variant="dark"
      hide-header-close
      centered
    )
     p(class="my-4") Are you sure you want to delete "{{ selected }}" from the config?
  </b-modal>
</template>

<script>
import { BIcon, BIconArrowRepeat, BIconGithub, BIconPencilSquare, BIconPlus, BIconTrashFill } from 'bootstrap-vue';

export default {
  name: 'Home',
  components: {
    BIcon,
    BIconArrowRepeat,
    BIconGithub,
    BIconPencilSquare,
    BIconPlus,
    BIconTrashFill,
  },
  data() {
    return {
      loading: true,
      pluginConfig: {},
      selected: null,
      televisions: [],
    };
  },
  async mounted() {
    try {
      window.homebridge.hideSchemaForm();

      this.pluginConfig = await this.getPluginConfig();
      this.pluginConfig.tvs.forEach((tv) => this.televisions.push(tv.name));

      this.televisions = this.televisions.filter((tv) => tv);

      this.loading = false;
    } catch (err) {
      console.log(err);
      window.homebridge.toast.error(err.message, 'Error');
    }
  },
  methods: {
    async refreshTV() {
      try {
        window.homebridge.showSpinner();

        console.log(`Refreshing ${this.selected}`);
        const selectedTV = this.pluginConfig.tvs.find((tv) => tv.name === this.selected);

        window.homebridge.addEventListener('refreshTV', (event) => {
          window.homebridge.toast.info(event.data, 'Info');
        });

        await window.homebridge.request('/refreshTV', selectedTV);

        console.log(`${this.selected} refreshed!`);

        this.selected = null;

        window.homebridge.hideSpinner();
      } catch (err) {
        console.log(err);
        window.homebridge.toast.error(err.message, 'Error');
      }
    },
    async removeTV() {
      try {
        window.homebridge.showSpinner();

        console.log(`Removing ${this.selected}..`);

        await window.homebridge.request('/removeTV', this.selected);

        this.pluginConfig.tvs = this.pluginConfig.tvs.filter((tv) => tv.name !== this.selected);
        this.televisions = this.televisions.filter((tv) => tv && tv !== this.selected);

        await window.homebridge.updatePluginConfig([this.pluginConfig]);
        await window.homebridge.savePluginConfig();

        console.log(`${this.selected} removed!`);

        this.selected = null;

        window.homebridge.hideSpinner();
      } catch (err) {
        console.log(err);
        window.homebridge.toast.error(err.message, 'Error');
      }
    },
  },
};
</script>

<style scoped>
a.router-link-exact-active {
  color: var(--primary-color) !important;
  text-decoration: none !important;
}

.addLink {
  width: 30px;
  margin: 20px auto;
}

.addBtn {
  background: var(--primary-color);
  padding: 5px;
  border-radius: 16px;
  display: block;
  margin: 0;
  height: 30px;
  width: 30px;
  color: #fff !important;
  font-size: 15px;
  font-weight: 900 !important;
  transition: 0.3s all;
}

.addBtn:hover {
  color: #fff !important;
  background: var(--secondary-color);
}

.seelectTV {
  display: block;
  width: 200px;
  margin: 20px auto 5px auto;
}

.editBtn {
  height: 35px;
  width: 35px;
  background: var(--primary-color);
  margin: 0 auto;
  padding: 5px;
  border-radius: 20px;
  color: #fff !important;
  font-size: 14px;
  border: 0;
  transition: 0.3s all;
}

.editBtn:hover {
  color: #fff !important;
  background: var(--secondary-color);
}

.editBtn:disabled {
  filter: saturate(0.4);
  color: rgba(255, 255, 255, 0.5) !important;
}

.removeBtn {
  background: #d20e0e !important;
  transition: 0.3s all;
}

.removeBtn:hover {
  background: #980909 !important;
}

.removeBtn:disabled {
  background: #6d2a2a !important;
}

.refreshBtn {
  background: #18a716 !important;
  transition: 0.3s all;
}

.refreshBtn:hover {
  background: #2ad628 !important;
}

.refreshBtn:disabled {
  background: #72b171 !important;
}

.subtitle {
  font-weight: 900;
  line-height: 0.5;
}
</style>
