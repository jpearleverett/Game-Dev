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

describe('the canon block carries a whole season, not a window of it', () => {
  // The block calls itself "Immutable canon for this scene. Do not contradict
  // these." It carried the newest 8 truths and the newest 3 beliefs, so by
  // chapter 12 the model was told nothing about what the player had believed in
  // chapters 1-8: the beliefs that shaped the entire run sat outside the one
  // block that forbids contradicting them.
  const seasonMap = () => {
    let m = createBlankUnderMap();
    for (let i = 1; i <= 12; i += 1) {
      m = recordTheory(m, {
        chapter: i,
        interpretation: `BELIEF-${String(i).padStart(2, '0')}`,
        rejected: [`REJECTED-${i}`],
      });
      if (i < 12) m = resolveTheory(m, i, i % 2 === 0);
    }
    // Twenty revealed truths, oldest first so the ids read in campaign order.
    const nodes = Array.from({ length: 20 }, (_, i) => ({
      id: `node_rel_${i}`,
      revelation: `TRUTH-${String(20 - i).padStart(2, '0')}`,
      scope: i > 17 ? 'arc' : 'chapter',
    }));
    return { ...m, nodes };
  };

  test('every belief the player sealed is still named as canon at chapter 12', () => {
    const anchor = buildAnchor(seasonMap(), 12);
    for (let i = 1; i <= 12; i += 1) {
      const belief = `BELIEF-${String(i).padStart(2, '0')}`;
      expect(`${belief} present: ${anchor.includes(belief)}`).toBe(`${belief} present: true`);
    }
  });

  test('a subverted belief still says it was subverted, however old', () => {
    const anchor = buildAnchor(seasonMap(), 12);
    // Odd chapters resolved false in the fixture.
    expect(anchor).toMatch(/BELIEF-01[\s\S]*SUBVERTED|SUBVERTED[\s\S]*BELIEF-01/);
  });

  test('twenty revealed truths all survive, and arc truths are kept', () => {
    const anchor = buildAnchor(seasonMap(), 12);
    for (let i = 1; i <= 20; i += 1) {
      const truth = `TRUTH-${String(i).padStart(2, '0')}`;
      expect(`${truth} present: ${anchor.includes(truth)}`).toBe(`${truth} present: true`);
    }
    expect(anchor).toContain('a truth that spans chapters');
  });

  test('the newest canon still lands last, closest to the task', () => {
    const anchor = buildAnchor(seasonMap(), 12);
    expect(anchor.indexOf('BELIEF-12')).toBeGreaterThan(anchor.indexOf('BELIEF-01'));
    expect(anchor.indexOf('TRUTH-20')).toBeGreaterThan(anchor.indexOf('TRUTH-01'));
  });

  test('a map larger than the cap keeps the arc truths', () => {
    let m = createBlankUnderMap();
    const nodes = Array.from({ length: 60 }, (_, i) => ({
      id: `node_rel_${i}`,
      revelation: `BULK-${i}`,
      scope: i > 55 ? 'arc' : 'chapter',
    }));
    const anchor = buildAnchor({ ...m, nodes }, 12);
    ['BULK-56', 'BULK-57', 'BULK-58', 'BULK-59'].forEach((t) => {
      expect(`${t} present: ${anchor.includes(t)}`).toBe(`${t} present: true`);
    });
    expect(anchor.split('\n').length).toBeLessThan(50);
  });
});

describe('the player\'s decision list is stated once per prompt', () => {
  const { promptAssemblyMethods: pa } = require('../storyGeneration/promptAssembly');

  const ctx = () => ({
    previousChapters: [
      { chapter: 1, subchapter: 3, title: 'One', narrative: 'The rain had not stopped since Tuesday.' },
      { chapter: 2, subchapter: 3, title: 'Two', narrative: 'The mark was cut from inside the slab.' },
    ],
    playerChoices: [
      { chapter: 1, optionKey: 'A', optionTitle: 'CHOICE-ONE', optionFocus: 'f1' },
      { chapter: 2, optionKey: 'B', optionTitle: 'CHOICE-TWO', optionFocus: 'f2' },
    ],
    currentPosition: { chapter: 3, subchapter: 1, pathKey: 'AB' },
  });

  test('the cached half carries it', () => {
    const cached = pa._buildStorySummarySection(ctx(), { maxChapter: 2 });
    expect(cached).toContain('PLAYER CHOICE HISTORY');
    expect(cached).toContain('CHOICE-ONE');
  });

  test('the dynamic delta does not repeat it', () => {
    // Both halves reach the model in one request. This block ignored the window,
    // so the complete decision list was emitted twice in a single prompt.
    const delta = pa._buildStorySummarySection(ctx(), { minChapter: 3, maxChapter: 3 });
    expect(delta).not.toContain('PLAYER CHOICE HISTORY');
    expect(delta).not.toContain('CHOICE-ONE');
  });

  test('an uncached build still carries it', () => {
    expect(pa._buildStorySummarySection(ctx())).toContain('PLAYER CHOICE HISTORY');
  });
});
