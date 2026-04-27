// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude the Astro landing sub-project and test files from Metro bundling.
config.resolver.blockList = [/landing\/.*/, /.*\/__tests__\/.*/, /.*\.test\.(ts|tsx|js|jsx)$/];
config.watchFolders = (config.watchFolders || []).filter(
  (f) => f !== path.resolve(__dirname, 'landing')
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativewind(config);
