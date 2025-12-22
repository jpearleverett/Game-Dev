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

function hasFirstPersonOutsideQuotes(text) {
  if (!text) return false;
  const parts = String(text).split('"'); // even indices = outside quotes
  const outside = parts.filter((_, idx) => idx % 2 === 0).join(' ');
  return /\b(i|i'm|i've|i'll|i'd|me|my|mine|myself|we|our|ours|us|ourselves)\b/i.test(outside);
}

describe('StoryGenerationService fallback POV sanitizer', () => {
  test('fallback narratives are third-person outside dialogue quotes', () => {
    // Touch each phase via chapter number and each subchapter.
    const cases = [
      // risingAction (<=4)
      { chapter: 2, sub: 1 }, { chapter: 2, sub: 2 }, { chapter: 2, sub: 3 },
      // complications (<=7)
      { chapter: 6, sub: 1 }, { chapter: 6, sub: 2 }, { chapter: 6, sub: 3 },
      // confrontations (<=10)
      { chapter: 9, sub: 1 }, { chapter: 9, sub: 2 }, { chapter: 9, sub: 3 },
      // resolution (>=11)
      { chapter: 12, sub: 1 }, { chapter: 12, sub: 2 }, { chapter: 12, sub: 3 },
    ];

    for (const c of cases) {
      const isDecisionPoint = c.sub === 3;
      const entry = storyGenerationService._getFallbackContent(c.chapter, c.sub, 'BA', isDecisionPoint);
      expect(entry).toBeTruthy();
      expect(hasFirstPersonOutsideQuotes(entry.narrative)).toBe(false);
    }
  });
});

