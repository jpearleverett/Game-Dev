const LETTERS = ['A', 'B', 'C'];

export function parseCaseNumber(caseNumber) {
  if (!caseNumber || typeof caseNumber !== 'string') {
    return null;
  }
  const trimmed = caseNumber.trim();
  if (trimmed.length < 4) {
    return null;
  }
  const chapterSegment = trimmed.slice(0, 3);
  const chapter = parseInt(chapterSegment, 10);
  const letter = trimmed.slice(3, 4).toUpperCase();
  const subchapterIndex = LETTERS.indexOf(letter);
  if (Number.isNaN(chapter) || subchapterIndex === -1) {
    return null;
  }
  return {
    chapter,
    subchapter: subchapterIndex + 1,
    letter,
  };
}

export function isBranchingSubchapter(caseNumber) {
  const meta = parseCaseNumber(caseNumber);
  if (!meta) {
    return false;
  }
  return meta.subchapter === 3 && meta.chapter < 12;
}

export function getBoardProfile(caseNumber) {
  const meta = parseCaseNumber(caseNumber);
  const branching = isBranchingSubchapter(caseNumber);
  const columns = 4;
  const rows = branching ? 5 : 4;
  return {
    chapter: meta?.chapter ?? null,
    subchapter: meta?.subchapter ?? null,
    columns,
    rows,
    slots: columns * rows,
    outlierTarget: branching ? 8 : 4,
    branching,
  };
}
