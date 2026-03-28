const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Resolve @tekkipro/shared to bundled local copy
config.resolver.extraNodeModules = {
  '@tekkipro/shared': path.resolve(projectRoot, 'src/lib/shared'),
};

module.exports = config;
