/**
 * Path-scoped generation context.
 *
 * This file used to be `branchFacts` and spent most of its length exercising the
 * model-emitted `consistencyFacts` ledger, which was retired when the field was
 * removed from the output schemas: the model no longer emits facts, so those
 * tests drove an accumulator that is always empty in production and reported it
 * as covered. The Under-Map's revealed truths are the consistency spine now
 * (see promptAssembly's continuity anchors, and continuityAnchorUnderMap.test.js).
 *
 * What remains here is the part that is still live: how a player's decision
 * history becomes a path personality, and thread extraction.
 */

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

describe('StoryGenerationService path-scoped context', () => {
  // NOTE: `_generateMinimalFallback` was removed when fallback narratives were
  // dropped from the pipeline (generation now throws and the UI offers retry).
  // The obsolete test for it was deleted.

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

