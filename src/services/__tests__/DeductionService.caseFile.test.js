import {
  generateDeductionPuzzle,
  checkDeduction,
  countDeductionSolutions,
} from '../DeductionService';

const CASE_FILE = {
  crimeScene: 'The Wharf',
  culprit: 'Marina',
  contradiction: 'Marina claimed she was at the Archive, but the ledger puts her at the Wharf.',
  suspects: [
    { name: 'Marina', actualLocation: 'The Wharf', claimedLocation: 'The Archive' },
    { name: 'Silas', actualLocation: 'The Archive', claimedLocation: "Murphy's Bar" },
    { name: 'Dot', actualLocation: "Murphy's Bar", claimedLocation: 'The Wharf' },
    { name: 'Cole', actualLocation: 'Sentinel Library', claimedLocation: 'The Archive' },
  ],
};

describe('DeductionService — case-file driven puzzle', () => {
  test('builds a unique, solvable grid from the real case file', () => {
    const p = generateDeductionPuzzle('002B', { caseFile: CASE_FILE });

    expect(p.source).toBe('caseFile');
    expect(p.size).toBe(4);
    // Uses the story's real names, not the local pool.
    expect(p.suspects.map((s) => s.name).sort()).toEqual(['Cole', 'Dot', 'Marina', 'Silas']);
    expect(p.locations.map((l) => l.name).sort()).toEqual(
      ['Murphy\'s Bar', 'Sentinel Library', 'The Archive', 'The Wharf'].sort(),
    );

    // Exactly one solution, and the official solution solves it.
    expect(countDeductionSolutions(p)).toBe(1);
    expect(checkDeduction(p, p.solution).solved).toBe(true);

    // Culprit truly sits at the crime scene; contradiction is the LLM's line.
    expect(p.crime.culpritName).toBe('Marina');
    expect(p.crime.sceneName).toBe('The Wharf');
    expect(p.solution[p.crime.culpritId]).toBe(
      p.locations.find((l) => l.name === 'The Wharf').id,
    );
    expect(p.contradiction).toBe(CASE_FILE.contradiction);
  });

  test('is deterministic per case number', () => {
    const a = generateDeductionPuzzle('003B', { caseFile: CASE_FILE });
    const b = generateDeductionPuzzle('003B', { caseFile: CASE_FILE });
    expect(a.solution).toEqual(b.solution);
    expect(a.clues.map((c) => c.text)).toEqual(b.clues.map((c) => c.text));
  });

  test('clues reference the real story names', () => {
    const p = generateDeductionPuzzle('004B', { caseFile: CASE_FILE });
    const allClueText = p.clues.map((c) => c.text).join(' | ');
    // At least one real suspect and one real location appear in the clues.
    expect(/Marina|Silas|Dot|Cole/.test(allClueText)).toBe(true);
    expect(/Wharf|Archive|Murphy|Sentinel/.test(allClueText)).toBe(true);
  });

  test('falls back to the local pool when the case file is too thin', () => {
    const thin = { ...CASE_FILE, suspects: CASE_FILE.suspects.slice(0, 2) };
    const p = generateDeductionPuzzle('005B', { caseFile: thin });
    expect(p.source).toBe('pool');
    expect(countDeductionSolutions(p)).toBe(1);
  });

  test('no case file => pool fallback, still valid', () => {
    const p = generateDeductionPuzzle('006B', {});
    expect(p.source).toBe('pool');
    expect(checkDeduction(p, p.solution).solved).toBe(true);
  });
});
