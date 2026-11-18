const path = require('path');

module.exports = function override(config) {
  // Two development servers run in this workspace. Keep their filesystem
  // cache packs separate so admin/user compilers never write the same cache.
  if (config.mode === 'development' && config.cache && typeof config.cache === 'object') {
    const appMode = process.env.REACT_APP_APP_MODE === 'admin' ? 'admin' : 'user';
    config.cache = {
      ...config.cache,
      name: `ngoc-thien-${appMode}-development`,
      cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack', appMode),
    };
  }
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    assets: path.resolve(__dirname, 'src/assets'),
    component: path.resolve(__dirname, 'src/component'),
    pages: path.resolve(__dirname, 'src/pages'),
    style: path.resolve(__dirname, 'src/style'),
    utils: path.resolve(__dirname, 'src/utils'),
  };
  config.resolve.modules = [
    path.resolve(__dirname, 'src'),
    'node_modules',
    ...(config.resolve.modules || []),
  ];

  return config;
};
