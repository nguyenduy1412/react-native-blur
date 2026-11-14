const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');
const escape = (p) => p.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');

/**
 * The library lives one directory up. Watch it, and resolve react and
 * react-native only from this app so there is a single copy of each.
 */
const config = {
  watchFolders: [root],
  resolver: {
    blockList: [new RegExp(`^${escape(path.join(root, 'node_modules'))}\\/.*$`)],
    nodeModulesPaths: [path.join(__dirname, 'node_modules')],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
