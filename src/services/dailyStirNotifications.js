/**
 * Daily on-ramp notification (§8.1): a once-a-day local reminder that "the
 * Under-Map stirred overnight" — the habit hook that brings the player back to
 * trace the day's drifting fragment.
 *
 * Fully defensive: every call is wrapped so a denied permission, the web
 * platform, or an unavailable native module degrades to a silent no-op rather
 * than crashing the app. Scheduling is idempotent (we cancel our own reminder
 * before re-scheduling), keyed by a stable identifier.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const REMINDER_ID = 'undermap-daily-stir';
const DEFAULT_HOUR = 9; // 9am local
const DEFAULT_MINUTE = 0;

const NOTIF_BODY = 'The Under-Map stirred overnight — a thread has surfaced. Trace it.';

let scheduledThisSession = false;

/** Ask for permission once; resolves false on any error / web / denial. */
async function ensurePermission() {
  if (Platform.OS === 'web') return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus?.PROVISIONAL) {
      return true;
    }
    if (settings.canAskAgain === false) return false;
    const req = await Notifications.requestPermissionsAsync();
    return !!req.granted;
  } catch (_e) {
    return false;
  }
}

/**
 * Schedule (or re-schedule) the daily reminder. Safe to call repeatedly; only
 * the first successful call per session does real work.
 * @returns {Promise<boolean>} whether a reminder is now scheduled.
 */
export async function scheduleDailyStirReminder({ hour = DEFAULT_HOUR, minute = DEFAULT_MINUTE, force = false } = {}) {
  if (Platform.OS === 'web') return false;
  if (scheduledThisSession && !force) return true;
  try {
    const ok = await ensurePermission();
    if (!ok) return false;
    // Clear any prior copy of our reminder so we never stack duplicates.
    await cancelDailyStirReminder();
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: 'Dead Letters',
        body: NOTIF_BODY,
        data: { kind: 'daily-stir' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes?.DAILY ?? 'daily',
        hour,
        minute,
      },
    });
    scheduledThisSession = true;
    return true;
  } catch (_e) {
    return false;
  }
}

/** Cancel our daily reminder (e.g. when the player opts out). Never throws. */
export async function cancelDailyStirReminder() {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch (_e) {
    // Not scheduled / unavailable — nothing to do.
  }
  scheduledThisSession = false;
}

// ---------------------------------------------------------------------------
// Chapter-unlock verdict notification: the strongest re-entry hook the game has
// is not "next chapter available" — it's the VERDICT on the player's own sealed
// reading. Fired once at nextStoryUnlockAt. Same defensive posture as above.
// ---------------------------------------------------------------------------

const UNLOCK_ID = 'undermap-chapter-unlock';

/**
 * Schedule the one-shot "the city answers" notification for the unlock moment.
 * Re-scheduling replaces any prior copy. No-op for past/invalid times.
 * @returns {Promise<boolean>} whether it is now scheduled.
 */
export async function scheduleUnlockNotification(unlockAtIso, beliefText = null) {
  if (Platform.OS === 'web') return false;
  try {
    const at = new Date(unlockAtIso);
    if (!Number.isFinite(at.getTime()) || at.getTime() <= Date.now()) return false;
    const ok = await ensurePermission();
    if (!ok) return false;
    await cancelUnlockNotification();
    const belief = String(beliefText || '').trim();
    await Notifications.scheduleNotificationAsync({
      identifier: UNLOCK_ID,
      content: {
        title: 'The Under-Map has answered',
        body: belief
          ? `Your reading — “${belief}” — is about to be tested. The next chapter is open.`
          : 'The next chapter is open. Pick up the trail.',
        data: { kind: 'chapter-unlock' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes?.DATE ?? 'date',
        date: at,
      },
    });
    return true;
  } catch (_e) {
    return false;
  }
}

/** Cancel the unlock notification (unlock consumed early, bribe, campaign end). */
export async function cancelUnlockNotification() {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(UNLOCK_ID);
  } catch (_e) {
    // Not scheduled / unavailable — nothing to do.
  }
}

/**
 * Listen for the player OPENING the app from one of our notifications — the
 * measurement that tells us whether the verdict hook actually brings people
 * back. `onOpen({ kind })` receives the notification's data.kind. Returns an
 * unsubscribe fn; safe no-op on web / unavailable module.
 */
export function installNotificationOpenListener(onOpen) {
  if (Platform.OS === 'web' || typeof onOpen !== 'function') return () => {};
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const kind = response?.notification?.request?.content?.data?.kind || 'unknown';
        onOpen({ kind });
      } catch (_e) { /* never crash on a tap */ }
    });
    return () => { try { sub.remove(); } catch (_e) { /* noop */ } };
  } catch (_e) {
    return () => {};
  }
}
