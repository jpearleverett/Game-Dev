jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { geminiProxyUrl: 'https://example.test/proxy' } },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));

describe('LLMService Gemini temperature forcing', () => {
  test('forces temperature=1.0 for proxy requests even if caller passes lower', async () => {
    // Require after mocks so constructor sees mocked NetInfo/Constants.
    // (Jest in this repo isn't configured for ESM dynamic import.)
    const { llmService } = require('../LLMService');

    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        content: '{"title":"t","bridge":"b","previously":"p","narrative":"n","chapterSummary":"s","puzzleCandidates":[],"briefing":{"summary":"x","objectives":[]},"consistencyFacts":[],"narrativeThreads":[],"previousThreadsAddressed":[],"beatSheet":[],"jackActionStyle":"balanced","jackRiskLevel":"moderate","jackBehaviorDeclaration":{"primaryAction":"investigate","dialogueApproach":"measured","physicalBehavior":"tense","emotionalState":"neutral"},"storyDay":2}',
        finishReason: 'STOP',
        usage: { totalTokens: 1 },
      }),
      headers: { get: () => null },
    }));

    // Ensure we are in proxy mode.
    await llmService.init();
    await llmService.setConfig({ proxyUrl: 'https://example.test/proxy', model: 'gemini-3-flash-preview' });

    await llmService.complete([{ role: 'user', content: 'hi' }], { temperature: 0.2, maxTokens: 10 });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.temperature).toBe(1.0);
  });
});

