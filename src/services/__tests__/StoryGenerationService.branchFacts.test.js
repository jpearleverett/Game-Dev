// Branch-fact persistence is critical to prevent branch bleed when we prefetch both paths.

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));

jest.mock('../../storage/generatedStoryStorage', () => ({
  loadGeneratedStory: jest.fn(async () => ({ chapters: {} })),
  saveGeneratedChapter: jest.fn(async () => true),
  getStoryContext: jest.fn(async () => ({})),
  saveStoryContext: jest.fn(async () => true),
}));

// Avoid pulling in react-native / NetInfo via the real LLMService during unit tests.
jest.mock('../LLMService', () => ({
  llmService: {
    init: jest.fn(async () => {}),
    isConfigured: jest.fn(() => true),
    complete: jest.fn(async () => ({ content: '{}', model: 'test', finishReason: 'STOP' })),
  },
}));

import { storyGenerationService } from '../StoryGenerationService';

describe('StoryGenerationService branch-scoped persisted facts', () => {
  test('minimal fallback narrative is sanitized to third-person', () => {
    const entry = storyGenerationService._generateMinimalFallback(99, 1, 'ROOT', false);
    expect(entry).toBeTruthy();
    // No first-person narration tokens should remain after sanitization.
    expect(entry.narrative).not.toMatch(/\bI\b/);
    expect(entry.narrative).not.toMatch(/\bmy\b/i);
    expect(entry.narrative).toMatch(/\bJack\b/); // sanity: should still be close on Jack
  });

  test('path personality mapping treats A as methodical and B as aggressive by default', () => {
    const methodical = storyGenerationService._analyzePathPersonality([
      { caseNumber: '001C', optionKey: 'A' },
      { caseNumber: '002C', optionKey: 'A' },
      { caseNumber: '003C', optionKey: 'A' },
    ]);
    expect(methodical?.riskTolerance).toBe('low');

    const aggressive = storyGenerationService._analyzePathPersonality([
      { caseNumber: '001C', optionKey: 'B' },
      { caseNumber: '002C', optionKey: 'B' },
      { caseNumber: '003C', optionKey: 'B' },
    ]);
    expect(aggressive?.riskTolerance).toBe('high');
  });

  test('returns only prefix-relevant facts for a pathKey', async () => {
    // Reset in-memory context for this test.
    storyGenerationService.storyContext = {
      consistencyFactsByPathKey: {},
      consistencyFacts: [],
      lastPathKey: null,
      lastGeneratedChapter: null,
      lastGeneratedSubchapter: null,
    };

    await storyGenerationService._updateStoryContext({
      chapter: 2,
      subchapter: 1,
      pathKey: 'B',
      generatedAt: '2025-12-22T00:00:00.000Z',
      consistencyFacts: ['CH2_B_FACT'],
    });

    await storyGenerationService._updateStoryContext({
      chapter: 3,
      subchapter: 1,
      pathKey: 'BA',
      generatedAt: '2025-12-22T00:01:00.000Z',
      consistencyFacts: ['CH3_BA_FACT'],
    });

    await storyGenerationService._updateStoryContext({
      chapter: 3,
      subchapter: 1,
      pathKey: 'BB',
      generatedAt: '2025-12-22T00:02:00.000Z',
      consistencyFacts: ['CH3_BB_FACT'],
    });

    const ba = storyGenerationService._getRelevantPersistedConsistencyFacts('BA');
    expect(ba).toEqual(expect.arrayContaining(['CH2_B_FACT', 'CH3_BA_FACT']));
    expect(ba).not.toEqual(expect.arrayContaining(['CH3_BB_FACT']));

    const bb = storyGenerationService._getRelevantPersistedConsistencyFacts('BB');
    expect(bb).toEqual(expect.arrayContaining(['CH2_B_FACT', 'CH3_BB_FACT']));
    expect(bb).not.toEqual(expect.arrayContaining(['CH3_BA_FACT']));
  });

  test('ROOT facts are included for all branched paths', async () => {
    // Reset in-memory context for this test.
    storyGenerationService.storyContext = {
      consistencyFactsByPathKey: {},
      consistencyFacts: [],
      lastPathKey: null,
      lastGeneratedChapter: null,
      lastGeneratedSubchapter: null,
    };

    // Simulate Chapter 2 generated before any player decisions (pathKey = ROOT)
    await storyGenerationService._updateStoryContext({
      chapter: 2,
      subchapter: 1,
      pathKey: 'ROOT',
      generatedAt: '2025-12-22T00:00:00.000Z',
      consistencyFacts: ['CH2_ROOT_FACT_1', 'CH2_ROOT_FACT_2'],
    });

    // Simulate Chapter 3 after player chose 'A'
    await storyGenerationService._updateStoryContext({
      chapter: 3,
      subchapter: 1,
      pathKey: 'A',
      generatedAt: '2025-12-22T00:01:00.000Z',
      consistencyFacts: ['CH3_A_FACT'],
    });

    // Simulate Chapter 3 after player chose 'B' (prefetched alternative)
    await storyGenerationService._updateStoryContext({
      chapter: 3,
      subchapter: 1,
      pathKey: 'B',
      generatedAt: '2025-12-22T00:02:00.000Z',
      consistencyFacts: ['CH3_B_FACT'],
    });

    // When querying for path 'A', should get ROOT facts + A facts, not B facts
    const pathA = storyGenerationService._getRelevantPersistedConsistencyFacts('A');
    expect(pathA).toEqual(expect.arrayContaining(['CH2_ROOT_FACT_1', 'CH2_ROOT_FACT_2', 'CH3_A_FACT']));
    expect(pathA).not.toEqual(expect.arrayContaining(['CH3_B_FACT']));

    // When querying for path 'B', should get ROOT facts + B facts, not A facts
    const pathB = storyGenerationService._getRelevantPersistedConsistencyFacts('B');
    expect(pathB).toEqual(expect.arrayContaining(['CH2_ROOT_FACT_1', 'CH2_ROOT_FACT_2', 'CH3_B_FACT']));
    expect(pathB).not.toEqual(expect.arrayContaining(['CH3_A_FACT']));

    // When querying for deeper path 'AB', should still get ROOT facts
    const pathAB = storyGenerationService._getRelevantPersistedConsistencyFacts('AB');
    expect(pathAB).toEqual(expect.arrayContaining(['CH2_ROOT_FACT_1', 'CH2_ROOT_FACT_2']));
  });

  test('thread extraction does not resurrect threads after they are resolved', () => {
    const chapters = [
      {
        chapter: 2,
        subchapter: 1,
        narrative: 'x',
        narrativeThreads: [
          { type: 'appointment', description: 'Meet Silas at the penthouse', status: 'active', urgency: 'critical' },
        ],
      },
      {
        chapter: 2,
        subchapter: 2,
        narrative: 'x',
        narrativeThreads: [
          { type: 'appointment', description: 'Meet Silas at the penthouse', status: 'resolved', urgency: 'critical', resolvedChapter: 2 },
        ],
      },
    ];

    const active = storyGenerationService._extractNarrativeThreads(chapters);
    expect(active.find(t => t.type === 'appointment' && /silas/i.test(t.description))).toBeFalsy();
  });
});

