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
