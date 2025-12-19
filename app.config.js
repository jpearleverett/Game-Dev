/**
 * Expo app configuration with environment variable support
 *
 * This file replaces app.json to allow dynamic configuration.
 * Environment variables are loaded from .env file (gitignored for security).
 *
 * SETUP MODES:
 *
 * Development (direct API - less secure):
 * 1. Set GEMINI_API_KEY in .env
 * 2. Leave GEMINI_PROXY_URL empty
 *
 * Production (proxy - secure):
 * 1. Deploy the Cloudflare Worker (see proxy/README.md)
 * 2. Set GEMINI_PROXY_URL to your worker URL
 * 3. Optionally set APP_TOKEN for extra security
 * 4. GEMINI_API_KEY is NOT needed (it's in Cloudflare secrets)
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
      // ========== PRODUCTION (Recommended) ==========
      // Your Cloudflare Worker URL - API key stays secure on server
      geminiProxyUrl: process.env.GEMINI_PROXY_URL || null,

      // Optional: App token for extra proxy authentication
      appToken: process.env.APP_TOKEN || null,

      // ========== DEVELOPMENT ONLY ==========
      // Direct API key - only use for local development
      // This gets embedded in the app and is NOT secure for distribution
      geminiApiKey: process.env.GEMINI_API_KEY || null,
    },
  },
};
