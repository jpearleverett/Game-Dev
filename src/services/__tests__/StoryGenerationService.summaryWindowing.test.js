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

jest.mock('../LLMService', () => ({
  llmService: {
    init: jest.fn(async () => {}),
    isConfigured: jest.fn(() => true),
    complete: jest.fn(async () => ({ content: '{}', model: 'test', finishReason: 'STOP' })),
  },
}));

import { storyGenerationService } from '../StoryGenerationService';

describe('StoryGenerationService summary windowing', () => {
  test('recent chapter excerpt keeps the END of narrative for continuity', () => {
    const tail = '<<<END-OF-PREVIOUS-SCENE>>>';
    const longNarrative = `${'A '.repeat(2000)} ${tail}`;

    const context = {
      foundation: {},
      previousChapters: [
        {
          chapter: 3,
          subchapter: 3,
          title: 'Decision',
          narrative: longNarrative,
          isRecent: true,
        },
      ],
      playerChoices: [],
      currentPosition: { chapter: 4, subchapter: 1, pathKey: 'BA' },
      establishedFacts: [],
      pathPersonality: null,
      decisionConsequences: null,
      narrativeThreads: [],
    };

    const summary = storyGenerationService._buildStorySummarySection(context);
    expect(summary).toContain(tail);
  });
});

