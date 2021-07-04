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
      router-link(to="/config") Configs
      span(style="font-weight: bold !important;")  · 
      router-link(to="/new") New
</template>

<script>
export default {
  name: 'Config',
  data() {
    return {
      loading: true,
    };
  },
  async mounted() {
    const configured = await window.homebridge.getPluginConfig();

    if (!configured.length) {
      window.homebridge.updatePluginConfig([{}]);
    }

    this.loading = false;
    window.homebridge.showSchemaForm();
  },
  beforeDestroy() {
    window.homebridge.hideSchemaForm();
  },
};
</script>

<style scoped>
a.router-link-exact-active {
  color: var(--primary-color) !important;
  text-decoration: none !important;
}
</style>
