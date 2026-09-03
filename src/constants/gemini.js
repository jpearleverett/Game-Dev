/**
 * Single source of truth for the Gemini model this app talks to.
 *
 * Keeping the id in one place stops the model string from drifting between the
 * client, the proxy, the context caches and the tests — a drift that silently
 * splits the context cache (a cache is bound to the model that created it) and
 * costs the player a full regeneration.
 *
 * Current model: Gemini 3.8 Flash (GA, released 2026-09-02).
 *  - 1M token input context window, 65,536 max output tokens.
 *  - thinkingLevel: 'low' | 'medium' | 'high'. Default 'medium'.
 *    'minimal' is NOT supported by 3.8 Flash and returns an API validation error.
 *  - Sampling parameters (temperature / topP / topK / candidateCount) and the
 *    older thinkingBudget are deprecated for Gemini 3.x and must not be sent.
 *    Lowering temperature degrades reasoning and can cause looping.
 */

export const GEMINI_MODEL = 'gemini-3.8-flash';

/**
 * REST API version. Explicit context caching (cachedContents) and cached
 * generateContent both live on v1beta; v1alpha is a preview surface that a
 * GA model is not guaranteed to be served on, and pointing cache traffic at it
 * fails every cached call (which is the primary generation path).
 */
export const GEMINI_API_VERSION = 'v1beta';
export const GEMINI_API_BASE = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}`;

/** Output-token ceiling for the current model family. */
export const GEMINI_MAX_OUTPUT_TOKENS = 65536;

/** Thinking levels accepted by Gemini 3.x. Ordered cheapest -> deepest. */
export const THINKING_LEVELS = ['low', 'medium', 'high'];

/** The level Gemini applies when thinkingConfig is omitted entirely. */
export const DEFAULT_THINKING_LEVEL = 'medium';

/**
 * True for any Gemini 3.x model id ('gemini-3-flash', 'gemini-3.5-flash',
 * 'gemini-3.8-flash', 'models/gemini-3.8-flash', ...).
 *
 * Deliberately anchored on a following separator so a future 'gemini-30-*'
 * family cannot be mistaken for 3.x.
 */
export function isGemini3Model(model) {
  return typeof model === 'string' && /gemini-3(?:[.\-_]|$)/.test(model);
}

/**
 * Coerce a requested thinking level into one this model actually accepts.
 *
 * Returns null when no level was requested (so the caller omits thinkingConfig
 * entirely and Gemini applies its own 'medium' default). 'minimal' — valid on
 * some other Gemini 3 models but rejected by 3.8 Flash — is folded down to
 * 'low' rather than being allowed to fail the request.
 */
export function normalizeThinkingLevel(level) {
  if (!level) return null;
  const normalized = String(level).toLowerCase().trim();
  if (THINKING_LEVELS.includes(normalized)) return normalized;
  if (normalized === 'minimal' || normalized === 'none' || normalized === 'off') {
    return 'low';
  }
  return DEFAULT_THINKING_LEVEL;
}

/**
 * Clamp a requested output budget to the model's ceiling.
 * Returns null for "unset", which callers translate into omitting the field.
 */
export function clampMaxOutputTokens(maxTokens) {
  if (maxTokens == null) return null;
  const n = Number(maxTokens);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(Math.floor(n), GEMINI_MAX_OUTPUT_TOKENS);
}
