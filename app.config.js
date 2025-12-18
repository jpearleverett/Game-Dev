/**
 * Expo app configuration with environment variable support
 *
 * This file replaces app.json to allow dynamic configuration.
 * Environment variables are loaded from .env file (gitignored for security).
 *
 * To set up:
 * 1. Copy .env.example to .env
 * 2. Add your Gemini API key to .env
 * 3. The key will be baked into the build at compile time
 */

export default {
  expo: {
    name: 'Dead Letters',
    slug: 'dead-letters',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'cover',
      backgroundColor: '#1a1a1a',
    },
    assetBundlePatterns: ['assets/**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.deadletters.game',
      buildNumber: '1.0.0',
      icon: './assets/icon.png',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#1a1a1a',
        foregroundImage: './assets/adaptive-icon.png',
      },
      package: 'com.deadletters.game',
      versionCode: 1,
      permissions: [],
      icon: './assets/icon.png',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-font', 'expo-asset'],
    extra: {
      // Environment variables are loaded here
      // These get baked into the build and accessible via expo-constants
      geminiApiKey: process.env.GEMINI_API_KEY || null,
    },
  },
};
