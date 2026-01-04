// Mock implementation of native modules
// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// React Native / Expo expects __DEV__ to exist in runtime.
// In Jest (node) it may be undefined unless we define it.
global.__DEV__ = false;

// LLMService imports expo/fetch which expects native modules. Mock it for Jest.
if (!global.fetch) {
  global.fetch = jest.fn();
}
jest.mock('expo/fetch', () => ({
  fetch: async (...args) => {
    const res = await global.fetch(...args);
    if (!res) return res;
    // Some tests only mock .json(); LLMService may call .text() in fallback paths.
    if (typeof res.text !== 'function' && typeof res.json === 'function') {
      let cached;
      res.text = async () => {
        if (cached === undefined) cached = await res.json();
        return typeof cached === 'string' ? cached : JSON.stringify(cached);
      };
    }
    return res;
  },
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

jest.mock('expo-font', () => ({
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(),
}));

jest.mock('expo-asset', () => ({
  Asset: {
    loadAsync: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
