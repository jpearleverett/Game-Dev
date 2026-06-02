jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));
jest.mock('../LLMService', () => ({
  llmService: { init: jest.fn(), isConfigured: jest.fn(() => true), complete: jest.fn(async () => ({ content: '{}' })) },
}));
jest.mock('../../storage/generatedStoryStorage', () => ({ saveStoryContext: jest.fn(async () => true) }));

import { promptAssemblyMethods } from '../storyGeneration/promptAssembly';
import { createBlankCaseBoard, addClue, addClues, addSuspects, setTheory, recordAccusation, makeClue, CLUE_WEIGHT, CLUE_SOURCE } from '../../data/caseBoard';

const build = (board) => promptAssemblyMethods._buildPlayerDeductionSection(board);

describe('_buildPlayerDeductionSection', () => {
  test('empty / invalid board yields no section', () => {
    expect(build(null)).toBe('');
    expect(build(createBlankCaseBoard())).toBe('');
    expect(build({})).toBe('');
  });

  test('includes prime suspect, accusation outcome, and pinned leads', () => {
    let b = createBlankCaseBoard();
    b = addSuspects(b, [{ name: 'Marina' }, { name: 'Silas' }]);
    const marinaId = b.suspects.find((s) => s.name === 'Marina').id;
    b = addClues(b, [
      makeClue({ label: 'Ledger timestamp', detail: 'after midnight', weight: CLUE_WEIGHT.MAJOR, source: CLUE_SOURCE.BOARD }),
      makeClue({ label: "Marina's alibi breaks", detail: 'she was at the wharf', weight: CLUE_WEIGHT.BREAKER, source: CLUE_SOURCE.ALIBI, suspectId: marinaId }),
    ]);
    b = setTheory(b, { suspectId: marinaId });
    b = recordAccusation(b, { chapter: 3, suspectId: marinaId, suspectName: 'Marina', correct: true });

    const out = build(b);
    expect(out).toContain('Marina');
    expect(out).toContain('prime suspect');
    expect(out).toContain('formally accused Marina');
    expect(out).toContain('supports this');
    expect(out).toContain("Marina's alibi breaks");
    expect(out).toContain('Ledger timestamp');
    // breaker should be listed before the major lead
    expect(out.indexOf("Marina's alibi breaks")).toBeLessThan(out.indexOf('Ledger timestamp'));
  });

  test('unsupported accusation reads as not yet proven', () => {
    let b = addSuspects(createBlankCaseBoard(), [{ name: 'Silas' }]);
    const id = b.suspects[0].id;
    b = addClue(b, makeClue({ label: 'A hunch', weight: CLUE_WEIGHT.MINOR }));
    b = recordAccusation(b, { chapter: 2, suspectId: id, suspectName: 'Silas', correct: false });
    expect(build(b)).toContain('does not yet prove it');
  });
});
