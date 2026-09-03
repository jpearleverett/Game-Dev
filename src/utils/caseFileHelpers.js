/**
 * A live HH:MM:SS countdown, or null once the gate has passed.
 *
 * This used to return the string "Unlocking soon" past the target, which is
 * truthy and never changes again: callers that gate on the countdown stayed
 * gated forever, and the ones that interpolate it rendered "The city answers in
 * Unlocking soon" and "Unlocks in Unlocking soon". Null lets every caller branch
 * on the same fact, which is what they were all trying to do.
 */
export function formatCountdown(nextUnlockAt) {
  if (!nextUnlockAt) return null;
  const target = new Date(nextUnlockAt).getTime();
  const now = Date.now();
  if (!Number.isFinite(target) || target <= now) return null;
  const diff = target - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function parseDailyIntro(intro) {
  if (typeof intro !== "string") return null;
  const lines = intro
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  const [slugRaw, focusRaw, ...rest] = lines;
  const slug = slugRaw || null;
  const focus = focusRaw || null;
  const remainder = rest;
  const detail = 
    remainder.length > 0
      ? remainder.join("\n")
      : !focus && slug
      ? slug
      : null;
  return {
    slug,
    focus,
    detail,
    remainder,
    lines,
  };
}

export function splitSummaryLines(text) {
  if (typeof text !== "string") {
    return [];
  }
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
