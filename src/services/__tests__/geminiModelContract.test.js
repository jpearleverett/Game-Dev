/**
 * Pins the Gemini model contract so a regression ships red instead of reaching a
 * playtest. The previous tests only asserted a model string that a caller had
 * just passed in, so they would have passed with the wrong model on the wire.
 */

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { geminiProxyUrl: 'https://example.test/proxy' } },
}));

const mockStore = { value: null };
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => mockStore.value),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));

const fs = require('fs');
const path = require('path');

const {
  GEMINI_MODEL,
  GEMINI_API_VERSION,
  GEMINI_MAX_OUTPUT_TOKENS,
  THINKING_LEVELS,
  normalizeThinkingLevel,
  clampMaxOutputTokens,
  isGemini3Model,
} = require('../../constants/gemini');

const okResponse = () => ({
  ok: true,
  status: 200,
  json: async () => ({ success: true, content: '{}', finishReason: 'STOP', usage: { totalTokens: 1 } }),
  headers: { get: () => null },
});

const bodyOfLastCall = () => JSON.parse(global.fetch.mock.calls[0][1].body);

describe('gemini model contract', () => {
  beforeEach(() => {
    jest.resetModules();
    mockStore.value = null;
    global.fetch = jest.fn(okResponse);
  });

  test('the model id on the wire is the shared constant, with no caller passing one', async () => {
    const { llmService } = require('../LLMService');
    await llmService.init();
    await llmService.setConfig({ proxyUrl: 'https://example.test/proxy' });

    await llmService.complete([{ role: 'user', content: 'hi' }], { maxTokens: 10 });

    expect(bodyOfLastCall().model).toBe(GEMINI_MODEL);
    expect(GEMINI_MODEL).toBe('gemini-3.8-flash');
  });

  test('a model id persisted by an older build does not outlive the upgrade', async () => {
    mockStore.value = JSON.stringify({ provider: 'gemini', model: 'gemini-3.5-flash' });
    const { llmService } = require('../LLMService');
    await llmService.init();
    await llmService.setConfig({ proxyUrl: 'https://example.test/proxy' });

    await llmService.complete([{ role: 'user', content: 'hi' }], { maxTokens: 10 });

    expect(bodyOfLastCall().model).toBe(GEMINI_MODEL);
  });

  test('no deprecated sampling or thinking-budget parameter is ever sent', async () => {
    const { llmService } = require('../LLMService');
    await llmService.init();
    await llmService.setConfig({ proxyUrl: 'https://example.test/proxy' });

    await llmService.complete([{ role: 'user', content: 'hi' }], {
      maxTokens: 10,
      temperature: 0.3,
      topP: 0.9,
      topK: 40,
      thinkingBudget: 1024,
    });

    const body = bodyOfLastCall();
    expect(body.temperature).toBeUndefined();
    expect(body.topP).toBeUndefined();
    expect(body.topK).toBeUndefined();
    expect(body.candidateCount).toBeUndefined();
    expect(body.thinkingBudget).toBeUndefined();
  });

  test("'minimal' — which 3.8 Flash rejects outright — is folded to a supported level", async () => {
    const { llmService } = require('../LLMService');
    await llmService.init();
    await llmService.setConfig({ proxyUrl: 'https://example.test/proxy' });

    await llmService.complete([{ role: 'user', content: 'hi' }], { maxTokens: 10, thinkingLevel: 'minimal' });

    const sent = bodyOfLastCall().thinkingLevel;
    expect(sent).toBe('low');
    expect(THINKING_LEVELS).toContain(sent);
  });

  test('maxOutputTokens is omitted when unset and clamped to the model ceiling', async () => {
    const { llmService } = require('../LLMService');
    await llmService.init();
    await llmService.setConfig({ proxyUrl: 'https://example.test/proxy' });

    await llmService.complete([{ role: 'user', content: 'hi' }], {});
    expect(bodyOfLastCall().maxTokens).toBeUndefined();

    global.fetch = jest.fn(okResponse);
    await llmService.complete([{ role: 'user', content: 'hi' }], { maxTokens: 999999 });
    expect(bodyOfLastCall().maxTokens).toBe(GEMINI_MAX_OUTPUT_TOKENS);
  });

  describe('pure helpers', () => {
    test('normalizeThinkingLevel', () => {
      expect(normalizeThinkingLevel(null)).toBeNull();
      expect(normalizeThinkingLevel('')).toBeNull();
      expect(normalizeThinkingLevel('minimal')).toBe('low');
      expect(normalizeThinkingLevel('HIGH')).toBe('high');
      expect(normalizeThinkingLevel(' medium ')).toBe('medium');
      expect(normalizeThinkingLevel('nonsense')).toBe('medium');
      THINKING_LEVELS.forEach((l) => expect(normalizeThinkingLevel(l)).toBe(l));
    });

    test('clampMaxOutputTokens', () => {
      expect(clampMaxOutputTokens(null)).toBeNull();
      expect(clampMaxOutputTokens(undefined)).toBeNull();
      expect(clampMaxOutputTokens(0)).toBeNull();
      expect(clampMaxOutputTokens(-5)).toBeNull();
      expect(clampMaxOutputTokens(NaN)).toBeNull();
      expect(clampMaxOutputTokens(1000)).toBe(1000);
      expect(clampMaxOutputTokens(GEMINI_MAX_OUTPUT_TOKENS + 1)).toBe(GEMINI_MAX_OUTPUT_TOKENS);
    });

    test('isGemini3Model matches the 3.x family and nothing adjacent', () => {
      ['gemini-3-flash', 'gemini-3.5-flash', 'gemini-3.8-flash', 'models/gemini-3.8-flash']
        .forEach((m) => expect(isGemini3Model(m)).toBe(true));
      ['gemini-2.5-flash', 'gemini-30-flash', 'gemini-flash', '', null, undefined]
        .forEach((m) => expect(isGemini3Model(m)).toBe(false));
    });
  });

  describe('the separately deployed proxy carries the same contract', () => {
    const proxySrc = fs.readFileSync(path.join(__dirname, '../../../proxy/api/gemini.js'), 'utf8');

    test('default model matches', () => {
      expect(proxySrc).toContain(`const DEFAULT_MODEL = '${GEMINI_MODEL}';`);
    });

    test('output ceiling matches', () => {
      expect(proxySrc).toContain(`const MAX_OUTPUT_TOKENS = ${GEMINI_MAX_OUTPUT_TOKENS};`);
    });

    test('thinking levels match', () => {
      const levels = THINKING_LEVELS.map((l) => `'${l}'`).join(', ');
      expect(proxySrc).toContain(`const THINKING_LEVELS = [${levels}];`);
    });

    test('api version matches, and no cache traffic is left on the preview surface', () => {
      expect(proxySrc).toContain(`const GEMINI_API_VERSION = '${GEMINI_API_VERSION}';`);
      expect(proxySrc).not.toContain('v1alpha');
    });

    test('it can delete and extend a cache, not only create one', () => {
      // The client keeps a registry of caches it created but holds no API key in
      // proxy mode, so these two operations used to go to Google unauthenticated.
      expect(proxySrc).toContain("body.operation === 'deleteCache'");
      expect(proxySrc).toContain("body.operation === 'updateCache'");
      // And only ever addresses a cachedContents resource.
      expect(proxySrc).toMatch(/\^cachedContents\\\/\[A-Za-z0-9_-\]\+\$/);
    });
  });

  describe('cache lifecycle goes wherever the client is pointed', () => {
    const seedCache = async () => {
      const { llmService } = require('../LLMService');
      await llmService.init();
      await llmService.setConfig({ proxyUrl: 'https://example.test/proxy', apiKey: null });
      llmService.cacheInitialized = true;
      llmService.caches.set('k', { name: 'cachedContents/abc123', expireTime: new Date(Date.now() + 3600000).toISOString() });
      return llmService;
    };

    test('a delete in proxy mode goes to the proxy, not to Google', async () => {
      const llmService = await seedCache();
      global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true }) }));

      await llmService.deleteCache('k');

      const [url, init] = global.fetch.mock.calls[0];
      expect(url).toBe('https://example.test/proxy');
      expect(JSON.parse(init.body)).toMatchObject({ operation: 'deleteCache', name: 'cachedContents/abc123' });
      expect(llmService.caches.has('k')).toBe(false);
    });

    test('a failed delete still drops the local record, since the cache has a TTL', async () => {
      const llmService = await seedCache();
      global.fetch = jest.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: 'nope' }) }));

      await llmService.deleteCache('k');

      expect(llmService.caches.has('k')).toBe(false);
    });

    test('a TTL extension in proxy mode carries the new ttl', async () => {
      const llmService = await seedCache();
      const expireTime = new Date(Date.now() + 7200000).toISOString();
      global.fetch = jest.fn(async () => ({
        ok: true, status: 200, json: async () => ({ success: true, cache: { expireTime, updateTime: 'now' } }),
      }));

      await llmService.updateCache('k', '7200s');

      const [url, init] = global.fetch.mock.calls[0];
      expect(url).toBe('https://example.test/proxy');
      expect(JSON.parse(init.body)).toMatchObject({ operation: 'updateCache', ttl: '7200s' });
      expect(llmService.caches.get('k').expireTime).toBe(expireTime);
    });
  });
});
