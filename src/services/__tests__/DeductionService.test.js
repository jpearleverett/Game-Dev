import {
  generateDeductionPuzzle,
  checkDeduction,
  countDeductionSolutions,
  getDeductionSize,
} from '../DeductionService';

describe('DeductionService (alibi grid)', () => {
  const cases = ['001C', '002C', '003C', '004C', '005C', '006C', '007C'];

  test('grid size scales with chapter', () => {
    expect(getDeductionSize(1)).toBe(4);
    expect(getDeductionSize(4)).toBe(5);
    expect(getDeductionSize(9)).toBe(6);
  });

  test.each(cases)('generates a uniquely-solvable, self-consistent puzzle for %s', (caseNumber) => {
    const puzzle = generateDeductionPuzzle(caseNumber);

    // Has the right shape and distinct entities.
    expect(puzzle.suspects.length).toBe(puzzle.size);
    expect(puzzle.locations.length).toBe(puzzle.size);
    expect(new Set(puzzle.suspects.map((s) => s.id)).size).toBe(puzzle.size);
    expect(new Set(puzzle.locations.map((l) => l.id)).size).toBe(puzzle.size);
    expect(puzzle.clues.length).toBeGreaterThan(0);

    // The solution is a bijection.
    const locs = Object.values(puzzle.solution);
    expect(new Set(locs).size).toBe(puzzle.size);

    // Exactly one placement satisfies the clues.
    expect(countDeductionSolutions(puzzle)).toBe(1);

    // The official solution actually solves it.
    expect(checkDeduction(puzzle, puzzle.solution).solved).toBe(true);
  });

  test('a wrong placement is not accepted', () => {
    const puzzle = generateDeductionPuzzle('002C');
    const swapped = { ...puzzle.solution };
    const ids = Object.keys(swapped);
    // swap two suspects' locations -> no longer the solution
    [swapped[ids[0]], swapped[ids[1]]] = [swapped[ids[1]], swapped[ids[0]]];
    expect(checkDeduction(puzzle, swapped).solved).toBe(false);
  });

  test('an incomplete placement is not solved', () => {
    const puzzle = generateDeductionPuzzle('003C');
    const partial = { ...puzzle.solution };
    delete partial[Object.keys(partial)[0]];
    expect(checkDeduction(puzzle, partial).solved).toBe(false);
  });

  test('generation is deterministic per case number', () => {
    const a = generateDeductionPuzzle('004C');
    const b = generateDeductionPuzzle('004C');
    expect(a.solution).toEqual(b.solution);
    expect(a.clues.map((c) => c.text)).toEqual(b.clues.map((c) => c.text));
    expect(a.contradiction).toBe(b.contradiction);
  });

  test('the culprit truly sits at the crime scene, and their alibi is a lie', () => {
    const puzzle = generateDeductionPuzzle('005C');
    const { culpritId, sceneLocationId, claimLocationId } = puzzle.crime;
    expect(puzzle.solution[culpritId]).toBe(sceneLocationId); // really at the scene
    expect(claimLocationId).not.toBe(sceneLocationId);        // claimed elsewhere
    expect(puzzle.contradiction).toContain(puzzle.crime.culpritName);
    expect(puzzle.contradiction).toContain(puzzle.crime.sceneName);
    expect(puzzle.contradiction).toContain(puzzle.crime.claimName);
  });
});
