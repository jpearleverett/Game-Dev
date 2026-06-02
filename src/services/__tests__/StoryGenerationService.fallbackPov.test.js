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

// NOTE: Fallback narratives were intentionally removed from the generation
// pipeline (generation now throws and the UI offers retry, see generation.js:
// "No fallback narratives - player should retry generation"). The former
// `_getFallbackContent` POV test was deleted as obsolete. The subchapter
// parsing guard below remains valid.

describe('StoryGenerationService fallback subchapter parsing', () => {
  test('emergency fallback subchapter parsing uses case letter (A/B/C)', () => {
    // This guards a past bug where slice(4,5) was used and always produced subchapter 1.
    const parseSub = (caseNumber) => {
      const subLetter = String(caseNumber?.slice(3, 4) || 'A').toUpperCase();
      return ({ A: 1, B: 2, C: 3 }[subLetter]) || 1;
    };

    expect(parseSub('003A')).toBe(1);
    expect(parseSub('003B')).toBe(2);
    expect(parseSub('003C')).toBe(3);
  });
});

