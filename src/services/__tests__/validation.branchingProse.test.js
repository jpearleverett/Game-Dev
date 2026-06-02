jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));

jest.mock('../LLMService', () => ({
  llmService: {
    init: jest.fn(async () => {}),
    isConfigured: jest.fn(() => true),
    complete: jest.fn(async () => ({ content: '{}', model: 'test', finishReason: 'STOP' })),
  },
}));

jest.mock('../../storage/generatedStoryStorage', () => ({
  saveStoryContext: jest.fn(async () => true),
}));

import { validationMethods } from '../storyGeneration/validation';

describe('branching narrative prose cleaning', () => {
  test('strips em dashes from opening and option responses', () => {
    const input = {
      opening: { text: 'The rain fell hard—harder than before—on the docks.' },
      firstChoice: {
        prompt: 'What now?',
        options: [
          { key: '1A', label: 'Follow', response: 'Jack moved—quick and low—toward the door.' },
        ],
      },
      secondChoices: [
        {
          afterChoice: '1A',
          options: [
            { key: '2A', label: 'Open it', response: 'He reached out—then stopped cold.' },
          ],
        },
      ],
    };

    const out = validationMethods._normalizeBranchingNarrative(input);

    expect(out.opening.text).not.toMatch(/—/);
    expect(out.opening.text).toContain('hard, harder than before, on the docks');
    expect(out.firstChoice.options[0].response).not.toMatch(/—/);
    expect(out.secondChoices[0].options[0].response).not.toMatch(/—/);
    expect(out.secondChoices[0].options[0].response).toContain('reached out, then stopped cold');
  });

  test('preserves paragraph breaks in multi-paragraph responses', () => {
    const input = {
      opening: { text: 'Paragraph one.\n\nParagraph two.' },
      firstChoice: {
        options: [
          { key: '1A', response: 'First beat.\n\nSecond beat—with a dash.\n\nThird beat.' },
        ],
      },
      secondChoices: [],
    };

    const out = validationMethods._normalizeBranchingNarrative(input);

    // Paragraph breaks survive
    expect(out.opening.text).toBe('Paragraph one.\n\nParagraph two.');
    expect(out.firstChoice.options[0].response.split('\n\n')).toHaveLength(3);
    // Em dash inside a paragraph still removed
    expect(out.firstChoice.options[0].response).not.toMatch(/—/);
    expect(out.firstChoice.options[0].response).toContain('Second beat, with a dash');
  });

  test('still normalizes choice keys', () => {
    const input = {
      opening: { text: 'x' },
      firstChoice: { options: [{ response: 'a' }, { response: 'b' }] },
      secondChoices: [{ afterChoice: '1A', options: [{ key: '2B', response: 'c' }] }],
    };

    const out = validationMethods._normalizeBranchingNarrative(input);

    expect(out.firstChoice.options[0].key).toBe('1A');
    expect(out.firstChoice.options[1].key).toBe('1B');
    expect(out.secondChoices[0].options[0].key).toBe('1A-2B');
  });
});
