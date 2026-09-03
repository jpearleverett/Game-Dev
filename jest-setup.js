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

// react-native-purchases ships an untranspiled ESM bundle that Jest cannot parse,
// and it is reachable from GameContext, so without this stub no component or
// screen test can even load its module graph.
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getOfferings: jest.fn(async () => ({ current: { availablePackages: [] } })),
    purchasePackage: jest.fn(async () => ({ customerInfo: { entitlements: { active: {} } } })),
    restorePurchases: jest.fn(async () => ({ entitlements: { active: {} } })),
  },
}));

// expo-notifications reaches for Expo Go runtime helpers at import time, which
// are absent under Jest; GameContext imports it transitively.
jest.mock('expo-notifications', () => ({
  __esModule: true,
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date' },
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
}));

// NetInfo's native module is absent under Jest and its polyfill path crashes on
// an undefined state; LLMService subscribes to it at construction.
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => () => {}),
    fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
  },
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
}));
