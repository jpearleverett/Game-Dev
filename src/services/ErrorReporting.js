/**
 * Lightweight crash/error visibility — the floor under "no crash reporter".
 *
 * Captures uncaught JS errors and unhandled promise rejections into a small
 * persisted ring buffer (AsyncStorage), so production failures are diagnosable
 * after the fact instead of vanishing into console.error. This is deliberately
 * dependency-free; when a real reporter (e.g. Sentry) is added, point
 * `recordError` at it and everything already flows through here.
 *
 * Fully defensive: every entry point is wrapped so the reporter itself can
 * never crash the app or break tests.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@dead_letters/error_log';
const MAX_ENTRIES = 20;

let installed = false;
let writeChain = Promise.resolve();

const serialize = (error) => {
  try {
    if (error instanceof Error) {
      return { message: error.message, stack: String(error.stack || '').split('\n').slice(0, 12).join('\n') };
    }
    return { message: typeof error === 'string' ? error : JSON.stringify(error)?.slice(0, 500) || 'unknown', stack: null };
  } catch (_e) {
    return { message: 'unserializable error', stack: null };
  }
};

/** Append an error to the persisted ring buffer. Never throws. */
export function recordError(error, { fatal = false, source = 'manual' } = {}) {
  const entry = { ...serialize(error), fatal: !!fatal, source, at: new Date().toISOString() };
  // Serialize writes so concurrent errors can't clobber each other's read-modify-write.
  writeChain = writeChain
    .then(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const next = [entry, ...(Array.isArray(list) ? list : [])].slice(0, MAX_ENTRIES);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    })
    .catch(() => {});
  return writeChain;
}

/** The recent persisted errors (newest first). Never throws; [] on any failure. */
export async function getRecentErrors() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (_e) {
    return [];
  }
}

export async function clearRecentErrors() {
  try { await AsyncStorage.removeItem(STORAGE_KEY); } catch (_e) { /* noop */ }
}

/**
 * Install the global handlers (idempotent). Call once at app start. Chains the
 * previous handler so default crash behavior (dev redbox, native crash) is kept.
 */
export function installGlobalErrorReporting() {
  if (installed) return;
  installed = true;

  // Uncaught JS errors (the RN global handler).
  try {
    const ErrorUtils = global.ErrorUtils;
    const prev = ErrorUtils?.getGlobalHandler?.();
    ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
      recordError(error, { fatal: !!isFatal, source: 'uncaught' });
      if (typeof prev === 'function') prev(error, isFatal);
    });
  } catch (_e) { /* reporter must never break startup */ }

  // Unhandled promise rejections (RN's promise polyfill tracker, when present).
  try {
    // eslint-disable-next-line global-require
    const tracking = require('promise/setimmediate/rejection-tracking');
    tracking.enable({
      allRejections: true,
      onUnhandled: (_id, error) => { recordError(error, { source: 'unhandledrejection' }); },
      onHandled: () => {},
    });
  } catch (_e) { /* Hermes without the polyfill — skip silently */ }

  // Surface the previous session's failures in the console at startup so a
  // crash-on-launch loop is diagnosable from logs alone.
  getRecentErrors().then((errors) => {
    if (errors.length) {
      console.warn(`[ErrorReporting] ${errors.length} stored error(s) from previous sessions; latest: ${errors[0]?.message}`);
    }
  });
}
