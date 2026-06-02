import {
  createBlankCaseBoard,
  normalizeCaseBoard,
  makeClue,
  addClue,
  addClues,
  addSuspects,
  setSuspectCleared,
  setTheory,
  recordAccusation,
  headlineClues,
  hasBreaker,
  CLUE_SOURCE,
  CLUE_WEIGHT,
} from '../../data/caseBoard';

describe('caseBoard model', () => {
  test('addClue is idempotent by id', () => {
    let b = createBlankCaseBoard();
    const clue = makeClue({ label: 'Silver ink moves', source: CLUE_SOURCE.BOARD });
    b = addClue(b, clue);
    b = addClue(b, clue);
    b = addClue(b, makeClue({ label: 'Silver ink moves', source: CLUE_SOURCE.BOARD }));
    expect(b.clues).toHaveLength(1);
    expect(b.clues[0].label).toBe('Silver ink moves');
  });

  test('newest clue is first', () => {
    let b = createBlankCaseBoard();
    b = addClues(b, [
      makeClue({ label: 'First' }),
      makeClue({ label: 'Second' }),
    ]);
    expect(b.clues[0].label).toBe('Second');
  });

  test('addSuspects merges by id without duplicates and updates notes', () => {
    let b = createBlankCaseBoard();
    b = addSuspects(b, [{ name: 'Marina' }, { name: 'Silas' }]);
    b = addSuspects(b, [{ name: 'Marina', note: 'Lied about the ledger' }]);
    expect(b.suspects).toHaveLength(2);
    const marina = b.suspects.find((s) => s.name === 'Marina');
    expect(marina.note).toBe('Lied about the ledger');
  });

  test('clearing a suspect flips the flag', () => {
    let b = addSuspects(createBlankCaseBoard(), [{ name: 'Silas' }]);
    const id = b.suspects[0].id;
    b = setSuspectCleared(b, id, true);
    expect(b.suspects[0].cleared).toBe(true);
  });

  test('setTheory + recordAccusation', () => {
    let b = addSuspects(createBlankCaseBoard(), [{ name: 'Silas' }]);
    const id = b.suspects[0].id;
    b = setTheory(b, { suspectId: id, clueId: 'clue_1' });
    expect(b.theory.suspectId).toBe(id);
    b = recordAccusation(b, { chapter: 3, suspectId: id, suspectName: 'Silas', correct: true });
    expect(b.accusations[0].correct).toBe(true);
    expect(b.accusations[0].suspectName).toBe('Silas');
  });

  test('headlineClues sorts breakers first; hasBreaker detects them', () => {
    let b = createBlankCaseBoard();
    b = addClues(b, [
      makeClue({ label: 'minor a', weight: CLUE_WEIGHT.MINOR }),
      makeClue({ label: 'major b', weight: CLUE_WEIGHT.MAJOR }),
      makeClue({ label: 'breaker c', weight: CLUE_WEIGHT.BREAKER }),
    ]);
    expect(hasBreaker(b)).toBe(true);
    expect(headlineClues(b, 1)[0].label).toBe('breaker c');
  });

  test('normalizeCaseBoard repairs partial/garbage input', () => {
    expect(normalizeCaseBoard(null).clues).toEqual([]);
    expect(normalizeCaseBoard({ clues: 'nope' }).clues).toEqual([]);
    expect(normalizeCaseBoard({ theory: 'bad' }).theory).toBeNull();
  });
});
