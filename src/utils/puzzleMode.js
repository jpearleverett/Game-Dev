export const PUZZLE_MODE = {
  EVIDENCE: 'evidence',
  LOGIC: 'logic',
};

export function getPuzzleMode(caseNumber, isStoryMode) {
  if (!caseNumber) return PUZZLE_MODE.EVIDENCE;
  if (!isStoryMode) return PUZZLE_MODE.EVIDENCE;
  const subchapterLetter = String(caseNumber).slice(3, 4).toUpperCase();
  if (subchapterLetter === 'A' || subchapterLetter === 'B') {
    return PUZZLE_MODE.LOGIC;
  }
  return PUZZLE_MODE.EVIDENCE;
}

export function getPuzzleRouteName(mode) {
  return mode === PUZZLE_MODE.LOGIC ? 'LogicPuzzle' : 'Board';
}

export function getPuzzleActionLabel(mode) {
  return mode === PUZZLE_MODE.LOGIC ? 'Solve Logic Grid' : 'Solve Evidence Board';
}
