const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: [],
  resolver: {
    blockList: [
      /node_modules\/.*\/android\/\.cxx\/.*/,
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);
