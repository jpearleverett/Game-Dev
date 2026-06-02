export const PUZZLE_MODE = {
  EVIDENCE: 'evidence',
  LOGIC: 'logic',          // legacy spatial logic grid (kept for safety/fallback)
  DEDUCTION: 'deduction',  // case-rooted alibi grid
};

export function getPuzzleMode(caseNumber, isStoryMode) {
  if (!caseNumber) return PUZZLE_MODE.EVIDENCE;
  if (!isStoryMode) return PUZZLE_MODE.EVIDENCE;
  const subchapterLetter = String(caseNumber).slice(3, 4).toUpperCase();
  if (subchapterLetter === 'A' || subchapterLetter === 'B') {
    // A/B beats are deduction beats: crack who-was-where from case-rooted clues.
    return PUZZLE_MODE.DEDUCTION;
  }
  return PUZZLE_MODE.EVIDENCE;
}

export function getPuzzleRouteName(mode) {
  if (mode === PUZZLE_MODE.DEDUCTION) return 'Deduction';
  if (mode === PUZZLE_MODE.LOGIC) return 'LogicPuzzle';
  return 'Board';
}

export function getPuzzleActionLabel(mode) {
  if (mode === PUZZLE_MODE.DEDUCTION) return 'Work the Alibi Board';
  if (mode === PUZZLE_MODE.LOGIC) return 'Solve Logic Grid';
  return 'Solve Evidence Board';
}
