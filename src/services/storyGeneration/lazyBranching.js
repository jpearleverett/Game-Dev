/**
 * Lazy branching helpers (pure).
 *
 * Supports the two-layer generation: Layer 1 produces the branching narrative
 * with second-choice labels/summaries but no response bodies; Layer 2 fills in
 * the three response bodies for one firstChoice. These helpers detect what's
 * missing and merge Layer-2 responses into a branching narrative immutably.
 *
 * No React, no I/O — safe to import and unit-test anywhere.
 */

const norm = (v) => String(v || '').trim().toUpperCase();

/** Is this branching narrative a Layer-1 partial (any second-choice response missing)? */
export const isLayer1Partial = (branchingNarrative) => {
  const groups = branchingNarrative?.secondChoices;
  if (!Array.isArray(groups)) return false;
  return groups.some((g) =>
    Array.isArray(g?.options) && g.options.some((o) => !o || typeof o.response !== 'string' || o.response.trim() === ''),
  );
};

/** Do the second-choice options for this firstChoice still need their response bodies? */
export const secondChoiceResponsesNeeded = (branchingNarrative, afterChoice) => {
  const target = norm(afterChoice);
  const group = (branchingNarrative?.secondChoices || []).find((g) => norm(g?.afterChoice) === target);
  if (!group || !Array.isArray(group.options)) return false;
  return group.options.some((o) => !o || typeof o.response !== 'string' || o.response.trim() === '');
};

/** Are the second-choice responses for this firstChoice all present? */
export const secondChoiceResponsesComplete = (branchingNarrative, afterChoice) =>
  !secondChoiceResponsesNeeded(branchingNarrative, afterChoice);

/**
 * Merge Layer-2 response bodies into a branching narrative (immutably).
 *
 * @param {object} branchingNarrative
 * @param {string} afterChoice  e.g. "1A"
 * @param {object} payload      { afterChoice, responses: [{ key, response, details? }] }
 * @returns {object} a new branching narrative with the matching responses filled in
 */
export const mergeSecondChoiceResponses = (branchingNarrative, afterChoice, payload) => {
  if (!branchingNarrative || !Array.isArray(branchingNarrative.secondChoices)) return branchingNarrative;
  const target = norm(afterChoice);
  const responses = Array.isArray(payload?.responses) ? payload.responses : [];
  if (responses.length === 0) return branchingNarrative;

  // Index incoming responses by normalized key for robust matching.
  const byKey = new Map();
  responses.forEach((r) => {
    if (r && r.key && typeof r.response === 'string') byKey.set(norm(r.key), r);
  });

  const secondChoices = branchingNarrative.secondChoices.map((group) => {
    if (norm(group?.afterChoice) !== target) return group;
    const options = (group.options || []).map((opt, idx) => {
      // Match by key; fall back to positional order if keys are absent/odd.
      const match = byKey.get(norm(opt?.key)) || responses[idx];
      if (!match || typeof match.response !== 'string') return opt;
      return {
        ...opt,
        response: match.response,
        ...(Array.isArray(match.details) ? { details: match.details } : {}),
      };
    });
    return { ...group, options };
  });

  return { ...branchingNarrative, secondChoices };
};
