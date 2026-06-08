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
import {
  createBlankUnderMap,
  addFragments,
  addRelations,
  connectFragments,
  recordTheory,
  resolveTheory,
  fragmentId,
} from '../../data/underMap';

// The continuity anchor is the high-attention END-of-prompt canon. These tests pin
// the new behavior: the player's living Under-Map (revealed truths + sealed beliefs)
// becomes HARD "do not contradict" canon there — the dynamic fact spine that replaced
// the retired model-emitted consistencyFacts ledger.
const buildAnchor = (um, chapter = 2) => {
  promptAssemblyMethods.currentUnderMap = um;
  return promptAssemblyMethods._buildContinuityAnchorSection({ currentPosition: { chapter } }, chapter);
};

describe('_buildContinuityAnchorSection — Under-Map canon', () => {
  afterEach(() => { promptAssemblyMethods.currentUnderMap = null; });

  test('with no under-map it still emits the static canon and no player lines', () => {
    const out = buildAnchor(null, 2);
    expect(out).toContain('Immutable canon');
    expect(out).not.toContain('player has surfaced');
    expect(out).not.toContain('player believed');
    expect(out).not.toContain('staked a belief');
  });

  test('injects revealed truths and a subverted belief as hard constraints', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [
      { label: 'The shifting seal', kind: 'symbol' },
      { label: 'Silver ink', kind: 'phenomenon' },
    ]);
    m = addRelations(m, [
      { aLabel: 'The shifting seal', bLabel: 'Silver ink', revelation: 'Both are made to be seen only by Jack.' },
    ]);
    const a = fragmentId('symbol', 'The shifting seal');
    const b = fragmentId('phenomenon', 'Silver ink');
    m = connectFragments(m, a, b).map;
    m = recordTheory(m, { chapter: 1, fragmentIds: [a, b], interpretation: 'Blackwell is guiding me in.' });
    m = resolveTheory(m, 1, false); // the belief is subverted

    const out = buildAnchor(m, 2);
    expect(out).toContain('Established truth the player has surfaced');
    expect(out).toContain('made to be seen only by Jack');
    expect(out).toContain('Blackwell is guiding me in.');
    expect(out).toContain('SUBVERTED');
    expect(out).toContain('NOT as they believed');
  });

  test('a held-true belief is framed as consistent canon', () => {
    let m = createBlankUnderMap();
    m = recordTheory(m, { chapter: 1, fragmentIds: ['x'], interpretation: 'The symbol is a tracking lock.' });
    m = resolveTheory(m, 1, true);
    const out = buildAnchor(m, 2);
    expect(out).toContain('has held true');
    expect(out).toContain('The symbol is a tracking lock.');
  });

  test('an unproven sealed belief is flagged but not confirmed/denied', () => {
    let m = createBlankUnderMap();
    m = recordTheory(m, { chapter: 2, fragmentIds: ['y'], interpretation: 'The Under-Map is a prison, not a map.' });
    const out = buildAnchor(m, 3);
    expect(out).toContain('staked a belief, as yet unproven');
    expect(out).toContain('The Under-Map is a prison, not a map.');
    expect(out).toContain('let the world test it');
  });

  test('blurred (unresolved-reading) nodes are NOT treated as established truths', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [
      { label: 'A', kind: 'symbol' },
      { label: 'B', kind: 'place' },
    ]);
    m = addRelations(m, [{ aLabel: 'A', bLabel: 'B', revelation: 'TRUE_READING_ONLY' }]);
    const a = fragmentId('symbol', 'A');
    const b = fragmentId('place', 'B');
    // Resolve with a WRONG reading -> node exists but is flagged unresolvedReading.
    const { resolveReading } = require('../../data/underMap');
    m = resolveReading(m, a, b, 'a wrong interpretation').map;
    const out = buildAnchor(m, 2);
    expect(out).not.toContain('TRUE_READING_ONLY');
  });
});
