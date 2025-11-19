// Get the default configuration from Expo
const { getDefaultConfig } = require('expo/metro-config');

// Get the default config
const defaultConfig = getDefaultConfig(__dirname);

// Add "txt" to the list of asset extensions
defaultConfig.resolver.assetExts.push('txt');

// Export the modified configuration
module.exports = defaultConfig;