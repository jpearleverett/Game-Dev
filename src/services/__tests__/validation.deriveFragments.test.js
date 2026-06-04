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

  test('derives a fragment from EVERY tappable detail across all segments (kind/card optional)', () => {
    const bn = {
      opening: {
        text: '...',
        details: [
          { phrase: 'the moving ink', note: 'It shifts.', evidenceCard: 'Moving Ink', kind: 'phenomenon' },
          { phrase: 'a damp coat', note: 'Just rain.', evidenceCard: '' }, // no card/kind -> still a fragment (label=phrase)
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
    expect(labels).toContain('a damp coat'); // every tappable detail is now collectable

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

describe('_parseGeneratedContent populates fragments end-to-end (the bug: none appeared in 1B/1C)', () => {
  test('a generated scene with NO top-level fragments still yields tappable fragments from details', () => {
    const content = {
      title: 'The Edge of the Grid',
      branchingNarrative: {
        opening: {
          text: 'The ink moved on the page while he read 14 Acheron Avenue aloud.',
          details: [
            { phrase: 'The ink moved', note: 'Ink does not move on its own.', evidenceCard: 'Moving Ink', kind: 'phenomenon' },
            { phrase: '14 Acheron Avenue', note: 'A street paved over a decade ago.', evidenceCard: 'Acheron Avenue', kind: 'place' },
            { phrase: 'the rain', note: 'Just weather.', evidenceCard: '' }, // no card -> still collectable (label=phrase)
          ],
        },
        firstChoice: {
          prompt: 'What now?',
          options: [
            { key: '1A', label: 'Ask the courier', response: 'Marco would not meet his eyes.', details: [{ phrase: 'Marco', note: 'The courier who knows more than he says.', evidenceCard: 'Marco', kind: 'person' }] },
          ],
        },
        secondChoices: [],
      },
      // NOTE: deliberately NO top-level `fragments` — reproduces what the model emitted.
    };

    const result = validationMethods._parseGeneratedContent(content, false);
    const labels = result.fragments.map((f) => f.label);
    expect(labels).toEqual(expect.arrayContaining(['Moving Ink', 'Acheron Avenue', 'Marco']));
    // Every derived fragment must carry a verbatim phrase so EXAMINE can highlight it.
    result.fragments.forEach((f) => expect(typeof f.phrase === 'string' && f.phrase.length).toBeTruthy());
    // Kinds preserved from the tagged details.
    expect(result.fragments.find((f) => f.label === 'Acheron Avenue').kind).toBe('place');
    expect(result.fragments.find((f) => f.label === 'Marco').kind).toBe('person');
  });

  test('explicit top-level fragments are kept and merged with derived ones', () => {
    const content = {
      title: 'x',
      fragments: [{ label: 'A black envelope', kind: 'symbol', detail: 'expensive', phrase: 'black envelope' }],
      branchingNarrative: {
        opening: { text: 'the seal was cold', details: [{ phrase: 'the seal', note: 'cold wax', evidenceCard: 'The Seal', kind: 'symbol' }] },
        firstChoice: { options: [] },
        secondChoices: [],
      },
    };
    const result = validationMethods._parseGeneratedContent(content, false);
    const labels = result.fragments.map((f) => f.label);
    expect(labels).toEqual(expect.arrayContaining(['A black envelope', 'The Seal']));
  });
});
