const { getDefaultConfig } = require('@expo/metro-config');

// Use standard Expo configuration for maximum compatibility
const config = getDefaultConfig(__dirname);

// Keep only essential customizations
config.resolver.platforms = ['ios', 'android', 'native'];

module.exports = config;