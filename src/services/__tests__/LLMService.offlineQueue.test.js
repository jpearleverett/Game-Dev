jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn(async () => ({ isConnected: false, isInternetReachable: false })),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { geminiProxyUrl: 'https://example.test/proxy' } },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('LLMService offline queue serialization', () => {
  test('queues offline requests without persisting function callbacks', async () => {
    const { llmService } = require('../LLMService');

    await llmService.init();
    await llmService.setConfig({ proxyUrl: 'https://example.test/proxy', model: 'gemini-3-flash-preview' });

    const offlineCallback = jest.fn(async () => {});

    let err = null;
    try {
      await llmService.complete([{ role: 'user', content: 'hi' }], {
        offlineCallback,
        chapter: 2,
        subchapter: 1,
      });
    } catch (e) {
      err = e;
    }

    expect(err).toBeTruthy();
    expect(err.isOffline).toBe(true);
    expect(err.queued).toBe(true);

    // Ensure the offline queue was persisted and contains no function properties.
    const calls = AsyncStorage.setItem.mock.calls;
    const offlineCall = calls.find(([key]) => key === 'dead_letters_offline_queue');
    expect(offlineCall).toBeTruthy();

    const [, serialized] = offlineCall;
    const parsed = JSON.parse(serialized);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThanOrEqual(1);
    const item = parsed[0];
    expect(item?.data?.callback).toBeUndefined();
    expect(typeof item?.data?.callbackId).toBe('string');
  });
});

