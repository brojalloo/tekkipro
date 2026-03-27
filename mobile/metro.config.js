const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the shared package outside the mobile directory
config.watchFolders = [path.resolve(monorepoRoot, 'packages/shared')];

// Resolve @tekkipro/shared to the local package
config.resolver.extraNodeModules = {
  '@tekkipro/shared': path.resolve(monorepoRoot, 'packages/shared/src'),
};

module.exports = config;
