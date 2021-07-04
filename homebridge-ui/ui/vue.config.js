const path = require('path');

module.exports = {
  devServer: {
    port: 8083,
  },
  publicPath: './',
  outputDir: path.resolve(__dirname, '../public'),
  productionSourceMap: false,
  chainWebpack: (config) => {
    config.performance.maxEntrypointSize(500000).maxAssetSize(500000);
    config.plugin('html').tap((arguments_) => {
      const payload = arguments_;
      payload[0].title = 'homebridge-brvia-tvos';
      return payload;
    });
  },
};
