/**
 * "Does chapter 12 still know what I did in chapter 1?"
 *
 * The campaign's whole promise is that a belief sealed in chapter 2 still shapes
 * the ending. That promise lives in the PROMPT, and the prompt is assembled from
 * eight or nine separate builders, several of which slice their inputs. A slice
 * that is individually reasonable ("the newest eight truths") silently breaks the
 * promise at chapter 12, and nothing else in the suite would notice.
 *
 * So this builds a real late-chapter prompt from a full-season state seeded with
 * unique sentinels, and asserts on what actually comes out the other end.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));
jest.mock('../LLMService', () => ({
  llmService: { init: jest.fn(), isConfigured: jest.fn(() => true), complete: jest.fn(async () => ({ content: '{}' })) },
}));
jest.mock('../../storage/generatedStoryStorage', () => ({ saveStoryContext: jest.fn(async () => true) }));

// The real singleton: the prompt is assembled from several method bundles, so
// only the composed service can build the whole thing the way generation does.
import { storyGenerationService as pa } from '../StoryGenerationService';
import { createBlankUnderMap, recordTheory, resolveTheory } from '../../data/underMap';

const TOTAL = 12;

/** A campaign at the top of chapter 12, every artefact tagged so it can be found. */
const seasonState = () => {
  const previousChapters = [];
  const playerChoices = [];
  for (let ch = 1; ch < TOTAL; ch += 1) {
    for (let sub = 1; sub <= 3; sub += 1) {
      previousChapters.push({
        chapter: ch,
        subchapter: sub,
        pathKey: ch === 1 ? 'ROOT' : 'A'.repeat(ch - 1),
        title: `Chapter ${ch}.${sub}`,
        narrative: `PROSE-CH${String(ch).padStart(2, '0')}-SUB${sub}. The rain had not stopped since Tuesday.`,
        // The model's own ledger, exactly as it is persisted on an entry. The
        // chapter-2 promise is left unresolved on purpose.
        narrativeThreads: ch === 2 && sub === 1
          ? [{ type: 'promise', description: 'THREAD-FROM-CH02: Jack owes Nadia the ledger he took from the laundromat.', status: 'active', urgency: 'critical', dueChapter: 5 }]
          : [],
      });
    }
    playerChoices.push({
      chapter: ch,
      optionKey: ch % 2 ? 'A' : 'B',
      optionTitle: `DECISION-CH${String(ch).padStart(2, '0')}`,
      optionFocus: `FOCUS-CH${String(ch).padStart(2, '0')}`,
    });
  }

  let underMap = createBlankUnderMap();
  for (let ch = 1; ch < TOTAL; ch += 1) {
    underMap = recordTheory(underMap, {
      chapter: ch,
      interpretation: `BELIEF-CH${String(ch).padStart(2, '0')}`,
      rejected: [`REJECTED-CH${String(ch).padStart(2, '0')}`],
    });
    underMap = resolveTheory(underMap, ch, ch % 3 !== 0);
  }
  // Twenty-two revealed truths, newest first as the model stores them.
  underMap = {
    ...underMap,
    nodes: Array.from({ length: 22 }, (_, i) => ({
      id: `node_rel_${i}`,
      revelation: `TRUTH-${String(22 - i).padStart(2, '0')}`,
      scope: i > 19 ? 'arc' : 'chapter',
    })),
  };

  return {
    foundation: {},
    previousChapters,
    playerChoices,
    currentPosition: { chapter: TOTAL, subchapter: 1, pathKey: 'A'.repeat(TOTAL - 1) },
    establishedFacts: [],
    // Run the REAL extractor over the real entries, the way buildStoryContext
    // does. Injecting a finished thread list here instead made the thread
    // assertion below unfalsifiable: it proved the renderer would carry a
    // critical chapter-2 thread if one existed, and could not fail when the
    // extractor stopped producing one — which is exactly what had happened.
    narrativeThreads: pa._extractNarrativeThreads(previousChapters),
    decisionConsequences: [],
    underMap,
  };
};

/**
 * What a chapter-12 request actually sends: the cached chapter-start prefix
 * (chapters 1..11) plus the dynamic delta. Both reach the model in one call, so
 * the question is what the CONCATENATION contains.
 */
const wholePromptForChapter12 = () => {
  const context = seasonState();
  pa.currentUnderMap = context.underMap;
  const cachedPrefix = pa._buildStorySummarySection(context, { maxChapter: TOTAL - 1 });
  const dynamic = pa._buildDynamicPrompt(context, TOTAL, 1, false, { cachedHistoryMaxChapter: TOTAL - 1 });
  return { whole: `${cachedPrefix}\n${dynamic}`, cachedPrefix, dynamic };
};

const present = (haystack, needle) => `${needle}: ${haystack.includes(needle)}`;
const expectPresent = (haystack, needle) => expect(present(haystack, needle)).toBe(`${needle}: true`);

describe('a chapter-12 prompt still carries chapter 1', () => {
  const { whole } = wholePromptForChapter12();

  test('every subchapter of prose, from 1A onward, is in the prompt verbatim', () => {
    // There is no summarization step: the builder states that the whole
    // twelve-chapter story is about 4% of a 1M window. If that ever changes to a
    // rolling window, the early chapters go first and this catches it.
    for (let ch = 1; ch < TOTAL; ch += 1) {
      for (let sub = 1; sub <= 3; sub += 1) {
        expectPresent(whole, `PROSE-CH${String(ch).padStart(2, '0')}-SUB${sub}`);
      }
    }
  });

  test('every decision the player made is named, with the option they chose', () => {
    for (let ch = 1; ch < TOTAL; ch += 1) {
      expectPresent(whole, `DECISION-CH${String(ch).padStart(2, '0')}`);
    }
  });

  test('every belief the player sealed is still canon', () => {
    for (let ch = 1; ch < TOTAL; ch += 1) {
      expectPresent(whole, `BELIEF-CH${String(ch).padStart(2, '0')}`);
    }
  });

  test('every revealed truth is still canon', () => {
    for (let i = 1; i <= 22; i += 1) {
      expectPresent(whole, `TRUTH-${String(i).padStart(2, '0')}`);
    }
  });

  test('a promise made in chapter 2 and never kept is still on the board', () => {
    expectPresent(whole, 'THREAD-FROM-CH02');
  });

  test('the earliest belief is marked with the verdict it actually got', () => {
    // Chapter 3, 6 and 9 were subverted in the fixture. A late chapter has to know
    // which of the player's readings the world has already contradicted.
    expect(whole).toMatch(/BELIEF-CH03[\s\S]{0,200}SUBVERTED|SUBVERTED[\s\S]{0,200}BELIEF-CH03/);
    expect(whole).toMatch(/BELIEF-CH01[\s\S]{0,200}held true|held true[\s\S]{0,200}BELIEF-CH01/);
  });
});

describe('and does not say the same thing twice', () => {
  const { whole, cachedPrefix, dynamic } = wholePromptForChapter12();

  test('the consolidated decision list appears once across both halves', () => {
    const occurrences = whole.split('PLAYER CHOICE HISTORY').length - 1;
    expect(`PLAYER CHOICE HISTORY blocks: ${occurrences}`).toBe('PLAYER CHOICE HISTORY blocks: 1');
  });

  test('the cached half carries the story, the dynamic half carries this scene', () => {
    expectPresent(cachedPrefix, 'PROSE-CH01-SUB1');
    expect(present(dynamic, 'PROSE-CH01-SUB1')).toBe('PROSE-CH01-SUB1: false');
  });

  test('the canon block sits at the end, after the story it constrains', () => {
    // The high-attention position. If the anchors drift back above the bulk
    // context, they stop counteracting long-context dilution.
    expect(whole.indexOf('<continuity_anchors>')).toBeGreaterThan(whole.indexOf('PROSE-CH01-SUB1'));
    expect(whole.indexOf('<continuity_anchors>')).toBeGreaterThan(whole.indexOf('<under_map_state>'));
  });
});
