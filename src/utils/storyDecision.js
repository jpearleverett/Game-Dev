// Shared resolution of a subchapter's story decision and its option list.
//
// C (climax) subchapters carry `pathDecisions` keyed by the player's realized
// branching path (e.g. "1A-2A"); A/B and legacy content carry a single decision.
// Both the CaseFile and the Theory climax screen resolve the same way, so this
// lives in one place to avoid drift.

const DEFAULT_PATH_KEY = '1A-2A';

/**
 * Resolve the decision object for a subchapter.
 * @param {object} args
 * @param {object|null} args.activeCaseStoryDecision - decision injected onto the case (if any)
 * @param {object|null} args.metaDecision - storyMeta.decision (legacy single decision)
 * @param {object|array|null} args.metaPathDecisions - storyMeta.pathDecisions (C only)
 * @param {string} args.subchapterLetter - 'A' | 'B' | 'C'
 * @param {string|null} args.branchingPath - the realized path (e.g. "1A-2A")
 */
export function resolveStoryDecision({
  activeCaseStoryDecision = null,
  metaDecision = null,
  metaPathDecisions = null,
  subchapterLetter = null,
  branchingPath = null,
} = {}) {
  const fallback = activeCaseStoryDecision || metaDecision || null;
  if (!metaPathDecisions) return fallback;
  // Only C subchapters use pathDecisions.
  if (subchapterLetter !== 'C') return fallback;

  const pathKey = branchingPath || DEFAULT_PATH_KEY;

  if (Array.isArray(metaPathDecisions)) {
    return (
      metaPathDecisions.find((d) => d?.pathKey === pathKey) ||
      metaPathDecisions.find((d) => d?.pathKey === DEFAULT_PATH_KEY) ||
      metaPathDecisions[0] ||
      fallback
    );
  }
  return metaPathDecisions[pathKey] || metaPathDecisions[DEFAULT_PATH_KEY] || fallback;
}

/** Normalize a resolved decision into a [{ key, title, focus, ... }] option list. */
export function decisionOptionsFrom(storyDecision) {
  if (!storyDecision) return [];
  if (storyDecision.optionA || storyDecision.optionB) {
    const out = [];
    if (storyDecision.optionA) out.push({ key: 'A', ...storyDecision.optionA });
    if (storyDecision.optionB) out.push({ key: 'B', ...storyDecision.optionB });
    return out;
  }
  return Array.isArray(storyDecision.options) ? storyDecision.options : [];
}

export { DEFAULT_PATH_KEY };
