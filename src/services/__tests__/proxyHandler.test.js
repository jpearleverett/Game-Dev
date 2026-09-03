/**
 * The proxy IS the egress to Gemini. It deploys separately, so it was verified
 * only by grepping its source for four constant declarations: nothing exercised
 * the request it actually builds, and every behaviour that matters (what it
 * strips, what it normalizes, what it refuses) was unguarded.
 *
 * The handler is a standard web-platform function, so it can simply be called
 * with a Request.
 */

const ORIGINAL_ENV = { ...process.env };

const { GEMINI_MODEL, GEMINI_MAX_OUTPUT_TOKENS } = require('../../constants/gemini');

let handler;

const post = (body, headers = {}) => new Request('https://proxy.test/api/gemini', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

const geminiOk = (text = '{"ok":true}') => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }],
    usageMetadata: { totalTokenCount: 10 },
  }),
  text: async () => text,
});

const upstream = () => {
  const call = global.fetch.mock.calls[global.fetch.mock.calls.length - 1];
  return { url: call[0], init: call[1], body: JSON.parse(call[1].body || '{}') };
};

describe('the Gemini proxy', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, GEMINI_API_KEY: 'test-key' };
    delete process.env.APP_TOKEN;
    delete process.env.REQUIRE_APP_TOKEN;
    global.fetch = jest.fn(async () => geminiOk());
    // eslint-disable-next-line global-require
    handler = require('../../../proxy/api/gemini').default;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe('what it refuses', () => {
    test('a GET', async () => {
      const res = await handler(new Request('https://proxy.test/api/gemini', { method: 'GET' }));
      expect(res.status).toBe(405);
    });

    test('a request with no messages', async () => {
      const res = await handler(post({ model: GEMINI_MODEL }));
      expect(res.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('a wrong app token, when one is configured', async () => {
      process.env.APP_TOKEN = 'secret';
      handler = require('../../../proxy/api/gemini').default;
      const res = await handler(post({ messages: [{ role: 'user', content: 'hi' }], stream: false }, { 'X-App-Token': 'wrong' }));
      expect(res.status).toBe(401);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('running open in production, rather than serving unauthenticated', async () => {
      process.env.REQUIRE_APP_TOKEN = 'true';
      handler = require('../../../proxy/api/gemini').default;
      const res = await handler(post({ messages: [{ role: 'user', content: 'hi' }], stream: false }));
      expect(res.status).toBe(500);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('a cache name that is not a cachedContents resource', async () => {
      const res = await handler(post({ operation: 'deleteCache', name: '../../models/gemini-3.8-flash' }));
      expect(res.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('the request it builds', () => {
    const send = (extra = {}) => handler(post({
      messages: [{ role: 'user', content: 'hi' }],
      stream: false,
      ...extra,
    }));

    test('goes to the stable surface, with the default model when none is named', async () => {
      await send();
      expect(upstream().url).toContain(`/v1beta/models/${GEMINI_MODEL}:generateContent`);
      expect(upstream().url).not.toContain('v1alpha');
    });

    test('drops every deprecated sampling parameter', async () => {
      await send({ temperature: 0.4, topP: 0.9, topK: 40, candidateCount: 2, thinkingBudget: 512 });
      const { generationConfig } = upstream().body;
      ['temperature', 'topP', 'topK', 'candidateCount', 'thinkingBudget'].forEach((k) => {
        expect(`${k}: ${generationConfig[k]}`).toBe(`${k}: undefined`);
      });
    });

    test("folds 'minimal', which 3.8 Flash rejects, to a level it accepts", async () => {
      await send({ thinkingLevel: 'minimal' });
      expect(upstream().body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'low' });
    });

    test('clamps maxOutputTokens to the model ceiling, and omits it when unset', async () => {
      await send({ maxTokens: 999999 });
      expect(upstream().body.generationConfig.maxOutputTokens).toBe(GEMINI_MAX_OUTPUT_TOKENS);

      global.fetch = jest.fn(async () => geminiOk());
      await send();
      expect(upstream().body.generationConfig.maxOutputTokens).toBeUndefined();
    });

    test('passes a structured-output schema through with a JSON mime type', async () => {
      const responseSchema = { type: 'object', properties: { a: { type: 'string' } } };
      await send({ responseSchema });
      expect(upstream().body.generationConfig.responseMimeType).toBe('application/json');
      expect(upstream().body.generationConfig.responseSchema).toEqual(responseSchema);
    });
  });

  describe('what it returns', () => {
    test('the whole answer, joined across parts, not just the first', async () => {
      // A thinking model can split the answer over several parts and put a
      // thought part first; reading parts[0] yields a fragment or nothing.
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: { parts: [{ text: 'thinking...', thought: true }, { text: '{"a":' }, { text: '1}' }] },
            finishReason: 'STOP',
          }],
          usageMetadata: { totalTokenCount: 10 },
        }),
        text: async () => '',
      }));
      const res = await handler(post({ messages: [{ role: 'user', content: 'hi' }], stream: false }));
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.content).toBe('{"a":1}');
    });

    test('a blocked or empty candidate as an error, not as empty success', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [] }, finishReason: 'SAFETY' }] }),
        text: async () => '',
      }));
      const res = await handler(post({ messages: [{ role: 'user', content: 'hi' }], stream: false }));
      const json = await res.json();
      expect(json.success).not.toBe(true);
      expect(JSON.stringify(json)).toMatch(/SAFETY|blocked|empty/i);
    });
  });

  describe('cache lifecycle', () => {
    test('a delete reaches the cachedContents resource with DELETE', async () => {
      global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '' }));
      const res = await handler(post({ operation: 'deleteCache', name: 'cachedContents/abc123' }));
      expect(res.status).toBe(200);
      expect(upstream().url).toContain('/v1beta/cachedContents/abc123');
      expect(upstream().init.method).toBe('DELETE');
    });

    test('a cache that is already gone is a successful delete', async () => {
      global.fetch = jest.fn(async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => 'gone' }));
      const res = await handler(post({ operation: 'deleteCache', name: 'cachedContents/abc123' }));
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });

    test('a TTL extension patches the resource', async () => {
      global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ expireTime: 'later' }), text: async () => '' }));
      await handler(post({ operation: 'updateCache', name: 'cachedContents/abc123', ttl: '7200s' }));
      expect(upstream().init.method).toBe('PATCH');
      expect(upstream().body).toEqual({ ttl: '7200s' });
    });
  });
});
