/**
 * expo-notifications must NEVER be imported at module scope.
 *
 * Importing it at all crashes the app in Expo Go on Android, and the throw is
 * nowhere near anything this game calls. It is a module-scope side effect:
 * DevicePushTokenAutoRegistration.fx.js registers a global push-token
 * subscription when it loads, index.js re-exports from that module, and
 * addPushTokenListener calls warnOfExpoGoPushUsage(), which throws on Android
 * in Expo Go because remote push left Expo Go in SDK 53.
 *
 * The observed failure was a red "[runtime not ready]" screen at boot, before
 * any pixel rendered — in a game that only ever schedules LOCAL notifications
 * and never touches push.
 *
 * These tests simulate that runtime by making the module throw on require.
 * The service must still import cleanly and degrade every entry point to the
 * same silent no-op it already had for a denied permission.
 */

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }), { virtual: true });
jest.mock('expo', () => ({ isRunningInExpoGo: () => true }), { virtual: true });

let requireAttempts = 0;
jest.mock(
  'expo-notifications',
  () => {
    requireAttempts += 1;
    throw new Error(
      'expo-notifications: Android Push notifications (remote notifications) '
      + 'functionality provided by expo-notifications was removed from Expo Go '
      + 'with the release of SDK 53.'
    );
  },
  { virtual: true }
);

describe('dailyStirNotifications under Expo Go on Android', () => {
  let svc;

  beforeEach(() => {
    jest.resetModules();
    requireAttempts = 0;
    // eslint-disable-next-line global-require
    svc = require('../dailyStirNotifications');
  });

  it('imports without throwing, even though the native module throws on require', () => {
    expect(typeof svc.scheduleDailyStirReminder).toBe('function');
  });

  it('never even attempts the require in Expo Go on Android', async () => {
    await svc.scheduleDailyStirReminder();
    // isRunningInExpoGo() short-circuits before require(), so the throwing
    // module is never evaluated at all.
    expect(requireAttempts).toBe(0);
  });

  it('reports notifications as unavailable rather than pretending', () => {
    expect(svc.notificationsAvailable()).toBe(false);
  });

  it('degrades every scheduling entry point to a falsy no-op', async () => {
    await expect(svc.scheduleDailyStirReminder()).resolves.toBe(false);
    await expect(
      svc.scheduleUnlockNotification(new Date(Date.now() + 86400000).toISOString(), 'a belief')
    ).resolves.toBe(false);
  });

  it('degrades every cancel entry point without throwing', async () => {
    await expect(svc.cancelDailyStirReminder()).resolves.toBeUndefined();
    await expect(svc.cancelUnlockNotification()).resolves.toBeUndefined();
  });

  it('returns a callable unsubscribe from the open listener', () => {
    const unsubscribe = svc.installNotificationOpenListener(() => {});
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });
});

describe('the service source itself', () => {
  it('contains no static import of expo-notifications', () => {
    // eslint-disable-next-line global-require
    const fs = require('fs');
    // eslint-disable-next-line global-require
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'dailyStirNotifications.js'),
      'utf8'
    );
    // Strip comments so the explanation above the lazy loader does not match.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/^\s*import\s[^\n]*['"]expo-notifications['"]/m);
    expect(code).toMatch(/require\(['"]expo-notifications['"]\)/);
  });

  it('is the only file in the app that references expo-notifications', () => {
    // eslint-disable-next-line global-require
    const { execSync } = require('child_process');
    const out = execSync(
      "grep -rl \"expo-notifications\" src/ App.js 2>/dev/null || true",
      { encoding: 'utf8' }
    ).trim();
    const files = out ? out.split('\n').filter((f) => !f.includes('__tests__')) : [];
    expect(files).toEqual(['src/services/dailyStirNotifications.js']);
  });
});
