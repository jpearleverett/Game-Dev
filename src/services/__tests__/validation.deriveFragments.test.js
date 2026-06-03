jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));
jest.mock('../LLMService', () => ({
  llmService: { init: jest.fn(), isConfigured: jest.fn(() => true), complete: jest.fn(async () => ({ content: '{}' })) },
}));
jest.mock('../../storage/generatedStoryStorage', () => ({ saveStoryContext: jest.fn(async () => true) }));

import { validationMethods } from '../storyGeneration/validation';

const derive = (bn) => validationMethods._deriveFragmentsFromBranching(bn);

describe('_deriveFragmentsFromBranching (EXAMINE fallback for generated scenes)', () => {
  test('returns nothing for empty/garbage', () => {
    expect(derive(null)).toEqual([]);
    expect(derive({})).toEqual([]);
    expect(derive({ opening: { details: [] } })).toEqual([]);
  });

  test('derives fragments from kind-tagged and evidenceCard details across all segments', () => {
    const bn = {
      opening: {
        text: '...',
        details: [
          { phrase: 'the moving ink', note: 'It shifts.', evidenceCard: 'Moving Ink', kind: 'phenomenon' },
          { phrase: 'a damp coat', note: 'Just rain.', evidenceCard: '' }, // atmospheric -> skipped
        ],
      },
      firstChoice: {
        options: [
          { key: '1A', details: [{ phrase: 'the brass key', note: 'Old.', evidenceCard: 'Brass Key' }] }, // evidenceCard, no kind -> phenomenon
        ],
      },
      secondChoices: [
        { afterChoice: '1A', options: [{ key: '1A-2A', details: [{ phrase: 'Acheron Avenue', note: 'Paved over.', kind: 'place' }] }] },
      ],
    };
    const out = derive(bn);
    const labels = out.map((f) => f.label);
    expect(labels).toContain('Moving Ink');
    expect(labels).toContain('Brass Key');
    expect(labels).toContain('Acheron Avenue'); // kind, no evidenceCard -> label falls back to phrase
    expect(labels).not.toContain('a damp coat'); // atmospheric detail excluded

    const ink = out.find((f) => f.label === 'Moving Ink');
    expect(ink.kind).toBe('phenomenon');
    expect(ink.phrase).toBe('the moving ink');
    const key = out.find((f) => f.label === 'Brass Key');
    expect(key.kind).toBe('phenomenon'); // default when no kind
    const place = out.find((f) => f.label === 'Acheron Avenue');
    expect(place.kind).toBe('place');
  });

  test('dedupes by label across segments', () => {
    const bn = {
      opening: { details: [{ phrase: 'the glyph', note: 'x', evidenceCard: 'The Glyph', kind: 'symbol' }] },
      firstChoice: { options: [{ details: [{ phrase: 'the glyph again', note: 'y', evidenceCard: 'The Glyph', kind: 'symbol' }] }] },
    };
    expect(derive(bn).filter((f) => f.label === 'The Glyph')).toHaveLength(1);
  });
});
