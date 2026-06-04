/**
 * Case Board — the connective tissue of the deduction redesign.
 *
 * A running, per-campaign board that accumulates what the player has learned:
 * clues (anomalies, contradictions, leads), suspects, and a working theory.
 * It turns disconnected subchapters into one building case and is the surface
 * the player returns to each day.
 *
 * This module is pure data + pure helpers (no React, no storage, no LLM) so it
 * is trivially testable and safe to import anywhere.
 */

export const CLUE_SOURCE = {
  BOARD: 'board',        // surfaced from the evidence board (an anomaly)
  ALIBI: 'alibi',        // a contradiction cracked open by the deduction grid
  CHOICE: 'choice',      // a lead established by a narrative decision
  ACCUSATION: 'accusation',
};

export const CLUE_WEIGHT = {
  MINOR: 'minor',        // colour/atmosphere detail
  MAJOR: 'major',        // a real lead
  BREAKER: 'breaker',    // case-breaking contradiction
};

export const WEIGHT_RANK = { minor: 0, major: 1, breaker: 2 };

// Keep the board from growing without bound across a long campaign.
const MAX_CLUES = 60;
const MAX_SUSPECTS = 24;

export const createBlankCaseBoard = () => ({
  clues: [],            // newest first
  suspects: [],
  theory: null,         // { suspectId, clueId, setAt }
  accusations: [],      // { chapter, suspectId, suspectName, clueId, correct, outcome, at }
  lastVisitedAt: null,
});

/** Defensive normaliser so older saves / partial objects never crash consumers. */
export const normalizeCaseBoard = (board) => {
  const base = createBlankCaseBoard();
  if (!board || typeof board !== 'object') return base;
  return {
    ...base,
    ...board,
    clues: Array.isArray(board.clues) ? board.clues : [],
    suspects: Array.isArray(board.suspects) ? board.suspects : [],
    accusations: Array.isArray(board.accusations) ? board.accusations : [],
    theory: board.theory && typeof board.theory === 'object' ? board.theory : null,
  };
};

const slug = (value, fallback = 'item') =>
  String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || fallback;

/**
 * Build a clue. `id` is derived from source + label so the same discovery is
 * never pinned twice, even across re-renders or re-entry into a subchapter.
 */
export const makeClue = ({
  label,
  detail = '',
  source = CLUE_SOURCE.BOARD,
  weight = CLUE_WEIGHT.MAJOR,
  caseNumber = null,
  chapter = null,
  suspectId = null,
  id = null,
}) => ({
  id: id || `clue_${source}_${slug(label)}`,
  label: String(label || '').trim(),
  detail: String(detail || '').trim(),
  source,
  weight,
  caseNumber,
  chapter,
  suspectId,
  pinnedAt: new Date().toISOString(),
});

/** Add a clue (idempotent by id). Returns a NEW board. Newest clue first. */
export const addClue = (board, clue) => {
  const b = normalizeCaseBoard(board);
  if (!clue || !clue.label) return b;
  const normalized = clue.id ? clue : makeClue(clue);
  if (b.clues.some((c) => c.id === normalized.id)) return b;
  const clues = [normalized, ...b.clues].slice(0, MAX_CLUES);
  return { ...b, clues };
};

/** Add several clues at once (idempotent). */
export const addClues = (board, clues = []) =>
  (Array.isArray(clues) ? clues : []).reduce((acc, c) => addClue(acc, c), normalizeCaseBoard(board));

/** Merge suspects by id; later notes/flags win, but never duplicate. */
export const addSuspects = (board, suspects = []) => {
  const b = normalizeCaseBoard(board);
  if (!Array.isArray(suspects) || suspects.length === 0) return b;
  const byId = new Map(b.suspects.map((s) => [s.id, s]));
  suspects.forEach((raw) => {
    if (!raw || !raw.name) return;
    const id = raw.id || `suspect_${slug(raw.name)}`;
    const existing = byId.get(id) || {};
    byId.set(id, {
      id,
      name: String(raw.name).trim(),
      note: raw.note != null ? String(raw.note) : existing.note || '',
      cleared: raw.cleared != null ? !!raw.cleared : !!existing.cleared,
    });
  });
  return { ...b, suspects: Array.from(byId.values()).slice(0, MAX_SUSPECTS) };
};

export const setSuspectCleared = (board, suspectId, cleared = true) => {
  const b = normalizeCaseBoard(board);
  return {
    ...b,
    suspects: b.suspects.map((s) => (s.id === suspectId ? { ...s, cleared } : s)),
  };
};

/** Set / clear the player's working theory (suspect + supporting clue). */
export const setTheory = (board, theory) => {
  const b = normalizeCaseBoard(board);
  if (!theory || !theory.suspectId) return { ...b, theory: null };
  return {
    ...b,
    theory: {
      suspectId: theory.suspectId,
      clueId: theory.clueId || null,
      setAt: new Date().toISOString(),
    },
  };
};

export const recordAccusation = (board, accusation) => {
  const b = normalizeCaseBoard(board);
  if (!accusation || !accusation.suspectId) return b;
  return {
    ...b,
    accusations: [
      {
        chapter: accusation.chapter ?? null,
        suspectId: accusation.suspectId,
        suspectName: accusation.suspectName || null,
        clueId: accusation.clueId || null,
        correct: !!accusation.correct,
        outcome: accusation.outcome || null,
        at: new Date().toISOString(),
      },
      ...b.accusations,
    ],
  };
};

export const touchBoard = (board) => ({
  ...normalizeCaseBoard(board),
  lastVisitedAt: new Date().toISOString(),
});

// ---- selectors -----------------------------------------------------------

export const clueCount = (board) => normalizeCaseBoard(board).clues.length;

export const cluesForChapter = (board, chapter) =>
  normalizeCaseBoard(board).clues.filter((c) => c.chapter === chapter);

/** Clues sorted by weight (breaker first) then recency — for headline display. */
export const headlineClues = (board, limit = 3) =>
  [...normalizeCaseBoard(board).clues]
    .sort((a, b) => (WEIGHT_RANK[b.weight] || 0) - (WEIGHT_RANK[a.weight] || 0))
    .slice(0, limit);

export const hasBreaker = (board) =>
  normalizeCaseBoard(board).clues.some((c) => c.weight === CLUE_WEIGHT.BREAKER);
