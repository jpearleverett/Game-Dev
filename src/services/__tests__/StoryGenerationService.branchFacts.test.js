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

