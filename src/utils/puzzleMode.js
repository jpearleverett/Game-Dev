export const PUZZLE_MODE = {
  EVIDENCE: 'evidence',
  LOGIC: 'logic',          // legacy spatial logic grid (kept for safety/fallback)
  DEDUCTION: 'deduction',  // retired alibi grid (kept for back-compat/fallback)
  CONNECT: 'connect',      // the Under-Map: draw connections between fragments to reveal hidden nodes
  THEORY: 'theory',        // chapter climax: commit a theory of the hidden world that steers what comes next
};

export function getPuzzleMode(caseNumber, isStoryMode) {
  if (!caseNumber) return PUZZLE_MODE.EVIDENCE;
  if (!isStoryMode) return PUZZLE_MODE.EVIDENCE;
  const subchapterLetter = String(caseNumber).slice(3, 4).toUpperCase();
  if (subchapterLetter === 'A' || subchapterLetter === 'B') {
    // A/B beats are CONNECT beats: descend into the Under-Map and draw the
    // links between the fragments this scene surfaced to reveal hidden nodes.
    return PUZZLE_MODE.CONNECT;
  }
  if (subchapterLetter === 'C') {
    // C is the chapter climax: commit a theory of the hidden world. The
    // commitment steers how the next chapter generates.
    return PUZZLE_MODE.THEORY;
  }
  return PUZZLE_MODE.EVIDENCE;
}

export function getPuzzleRouteName(mode) {
  if (mode === PUZZLE_MODE.CONNECT) return 'UnderMap';
  if (mode === PUZZLE_MODE.THEORY) return 'Theory';
  if (mode === PUZZLE_MODE.DEDUCTION) return 'Deduction';
  if (mode === PUZZLE_MODE.LOGIC) return 'LogicPuzzle';
  return 'Board';
}

export function getPuzzleActionLabel(mode) {
  if (mode === PUZZLE_MODE.CONNECT) return 'Descend into the Under-Map';
  if (mode === PUZZLE_MODE.THEORY) return 'Form your theory';
  if (mode === PUZZLE_MODE.DEDUCTION) return 'Work the Alibi Board';
  if (mode === PUZZLE_MODE.LOGIC) return 'Solve Logic Grid';
  return 'Solve Evidence Board';
}
