<template lang="pug">
  div.app-bg.h-100.w-100.p-4
    #app.h-100.w-100
      transition(name='fade' mode='out-in')
        router-view
</template>

<script>
export default {
  async mounted() {
    document.documentElement.setAttribute('data-theme-color', 'purple');

    console.log('Loading HB');
    await this.loadHomebridge();
  },
};
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition-duration: 0.3s;
  transition-property: opacity;
  transition-timing-function: ease;
}
.fade-enter,
.fade-leave-active {
  opacity: 0;
}

.app-bg {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: var(--primary-font-color);
}
</style>
