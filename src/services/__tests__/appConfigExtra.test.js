/**
 * app.config.js `extra` must never carry a non-string placeholder.
 *
 * Expo's config normalization serializes a `null` inside `extra` as `{}` in the
 * manifest served to the app (verified against a live dev-server manifest; the
 * same manifest shows `"staticConfigPath": {}` for an unset path). `{}` is
 * TRUTHY, so `extra.foo || null` kept it and every "is this configured?" guard
 * downstream passed with a junk value:
 *
 *  - LLMService sent `X-App-Token: [object Object]` on every request, so the day
 *    an operator set APP_TOKEN in Vercel the proxy would 401 all of them.
 *  - PurchaseService would hand `Purchases.configure` a `{}` apiKey in a
 *    production build instead of falling back to its mock.
 *
 * The contract: an unset value is OMITTED from `extra`, never set to null.
 */

const loadExtra = () => {
  // Re-required per test so each one sees the current process.env.
  jest.resetModules();
  // eslint-disable-next-line global-require
  const mod = require('../../../app.config.js');
  const cfg = mod.default || mod;
  return cfg.expo.extra;
};

const OPTIONAL_KEYS = [
  'GEMINI_PROXY_URL',
  'APP_TOKEN',
  'POSTHOG_API_KEY',
  'POSTHOG_HOST',
  'REVENUECAT_APPLE_KEY',
  'REVENUECAT_GOOGLE_KEY',
  'GEMINI_API_KEY',
];

describe('app.config.js extra', () => {
  let saved;

  beforeEach(() => {
    saved = {};
    OPTIONAL_KEYS.forEach((k) => { saved[k] = process.env[k]; delete process.env[k]; });
  });

  afterEach(() => {
    OPTIONAL_KEYS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  it('omits every unset value rather than emitting null', () => {
    const extra = loadExtra();
    expect(Object.keys(extra)).toEqual([]);
  });

  it('never emits a non-string value for any key', () => {
    process.env.GEMINI_PROXY_URL = 'https://example.test/api/gemini';
    const extra = loadExtra();
    Object.entries(extra).forEach(([key, value]) => {
      expect(typeof value).toBe('string');
      // The specific regression: `{}` is truthy and stringifies to
      // "[object Object]", which is what went out as an auth header.
      expect(value).not.toEqual({});
    });
  });

  it('passes through configured values trimmed', () => {
    process.env.GEMINI_PROXY_URL = '  https://example.test/api/gemini  ';
    process.env.APP_TOKEN = 'secret';
    const extra = loadExtra();
    expect(extra.geminiProxyUrl).toBe('https://example.test/api/gemini');
    expect(extra.appToken).toBe('secret');
  });

  it('treats a whitespace-only value as unset', () => {
    process.env.APP_TOKEN = '   ';
    const extra = loadExtra();
    expect('appToken' in extra).toBe(false);
  });

  it('omits the keys an operator has not set, so guards stay falsy', () => {
    process.env.GEMINI_PROXY_URL = 'https://example.test/api/gemini';
    const extra = loadExtra();
    ['appToken', 'posthogApiKey', 'revenueCatAppleKey', 'revenueCatGoogleKey', 'geminiApiKey']
      .forEach((k) => expect(extra[k]).toBeUndefined());
  });
});
