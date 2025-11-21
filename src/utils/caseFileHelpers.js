export function formatCountdown(nextUnlockAt) {
  if (!nextUnlockAt) return null;
  const target = new Date(nextUnlockAt).getTime();
  const now = Date.now();
  if (target <= now) return "Unlocking soon";
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
