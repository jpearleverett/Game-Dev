/**
 * Throttled haptic feedback utilities
 *
 * Prevents haptic queue overflow by rate-limiting calls.
 * This significantly improves responsiveness on mobile devices.
 */
import * as Haptics from 'expo-haptics';

// Minimum interval between haptic feedback (ms)
const HAPTIC_THROTTLE_MS = 80;

// Track last haptic time
let lastHapticTime = 0;

/**
 * Check if enough time has passed since the last haptic
 */
function canTriggerHaptic() {
  const now = Date.now();
  if (now - lastHapticTime >= HAPTIC_THROTTLE_MS) {
    lastHapticTime = now;
    return true;
  }
  return false;
}

/**
 * Throttled selection haptic feedback
 * Use for tap/selection feedback
 */
export function selectionHaptic() {
  if (canTriggerHaptic()) {
    Haptics.selectionAsync().catch(() => {});
  }
}

/**
 * Throttled impact haptic feedback
 * Use for button presses and impacts
 */
export function impactHaptic(style = Haptics.ImpactFeedbackStyle.Light) {
  if (canTriggerHaptic()) {
    Haptics.impactAsync(style).catch(() => {});
  }
}

/**
 * Throttled notification haptic feedback
 * Use for success/warning/error notifications
 */
export function notificationHaptic(type = Haptics.NotificationFeedbackType.Success) {
  if (canTriggerHaptic()) {
    Haptics.notificationAsync(type).catch(() => {});
  }
}

/**
 * Force haptic feedback (bypasses throttle)
 * Use sparingly for critical feedback that must always fire
 */
export function forceNotificationHaptic(type = Haptics.NotificationFeedbackType.Success) {
  lastHapticTime = Date.now();
  Haptics.notificationAsync(type).catch(() => {});
}

// Re-export haptic types for convenience
export { Haptics };
