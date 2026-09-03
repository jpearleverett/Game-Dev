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

/**
 * Expo's config normalization serializes a `null` inside `extra` as `{}` in the
 * manifest it serves to the app — verified by fetching the dev-server manifest.
 * An empty object is TRUTHY, so every `extra.foo || null` read downstream kept
 * the `{}` and every "is this configured?" guard passed. The concrete failure:
 * LLMService sent `X-App-Token: [object Object]` on every request, so the day an
 * operator set APP_TOKEN in Vercel the proxy would 401 all of them; and in a
 * production build PurchaseService would configure RevenueCat with `{}` instead
 * of falling back to its mock.
 *
 * So an unset value must be OMITTED, never set to null. Readers additionally
 * coerce to string, because a stale manifest can still carry the old shape.
 */
const optional = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length ? trimmed : undefined;
};

const compact = (obj) => Object.fromEntries(
  Object.entries(obj).filter(([, v]) => v !== undefined)
);

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
    // SDK 57 ships config plugins for these; `expo install --fix` asks for them
    // explicitly (it cannot edit a dynamic config itself).
    plugins: [
      'expo-font',
      'expo-asset',
      'expo-audio',
      'expo-image',
      'expo-sharing',
      'expo-splash-screen',
      'expo-status-bar',
    ],
    extra: compact({
      // ========== PRODUCTION (Recommended) ==========
      // Your Cloudflare Worker URL - API key stays secure on server
      geminiProxyUrl: optional(process.env.GEMINI_PROXY_URL),

      // Optional: App token for extra proxy authentication
      appToken: optional(process.env.APP_TOKEN),

      // ========== ANALYTICS (optional) ==========
      // PostHog project API key + host. Without a key, analytics stay local
      // (console only) — the game never blocks on this.
      posthogApiKey: optional(process.env.POSTHOG_API_KEY),
      posthogHost: optional(process.env.POSTHOG_HOST),

      // ========== IN-APP PURCHASES (optional) ==========
      // RevenueCat public SDK keys. Without them PurchaseService falls back to
      // its mock backend and warns; it never configures with a placeholder.
      revenueCatAppleKey: optional(process.env.REVENUECAT_APPLE_KEY),
      revenueCatGoogleKey: optional(process.env.REVENUECAT_GOOGLE_KEY),

      // ========== DEVELOPMENT ONLY ==========
      // Direct API key - only use for local development
      // This gets embedded in the app and is NOT secure for distribution
      geminiApiKey: optional(process.env.GEMINI_API_KEY),
    }),
  },
};
