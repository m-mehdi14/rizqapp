const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watcher: {
    watchman: false,
  },
  resolver: {
    // Monorepo: allow resolving deps hoisted at repository root.
    nodeModulesPaths: [require('path').resolve(__dirname, 'node_modules'), require('path').resolve(__dirname, '../node_modules')],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
