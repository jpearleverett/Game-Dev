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

const norm = (cf) => validationMethods._normalizeCaseFile(cf);

describe('_normalizeCaseFile', () => {
  test('returns null for missing / too-thin case files', () => {
    expect(norm(null)).toBeNull();
    expect(norm({})).toBeNull();
    expect(norm({ suspects: [{ name: 'A', actualLocation: 'X', claimedLocation: 'Y' }] })).toBeNull();
  });

  test('keeps a clean case file and snaps the crime scene to the culprit', () => {
    const cf = norm({
      crimeScene: 'The Wharf',
      culprit: 'Marina',
      contradiction: 'Marina lied.',
      suspects: [
        { name: 'Marina', actualLocation: 'The Wharf', claimedLocation: 'The Archive' },
        { name: 'Silas', actualLocation: 'The Archive', claimedLocation: 'Bar' },
        { name: 'Dot', actualLocation: 'Bar', claimedLocation: 'The Wharf' },
      ],
    });
    expect(cf.suspects).toHaveLength(3);
    expect(cf.culprit).toBe('Marina');
    expect(cf.crimeScene).toBe('The Wharf');
    expect(cf.contradiction).toBe('Marina lied.');
  });

  test('repairs duplicate actual locations into a distinct bijection', () => {
    const cf = norm({
      culprit: 'Marina',
      suspects: [
        { name: 'Marina', actualLocation: 'The Wharf', claimedLocation: 'The Archive' },
        { name: 'Silas', actualLocation: 'The Wharf', claimedLocation: 'The Annex' }, // dup actual
        { name: 'Dot', actualLocation: 'The Annex', claimedLocation: 'The Wharf' },
      ],
    });
    const locs = cf.suspects.map((s) => s.actualLocation.toLowerCase());
    expect(new Set(locs).size).toBe(locs.length); // all distinct
  });

  test('snaps an unknown culprit to a real suspect and makes the alibi a lie', () => {
    const cf = norm({
      crimeScene: 'Nowhere',
      culprit: 'Ghost', // not in suspects
      suspects: [
        { name: 'Marina', actualLocation: 'The Wharf', claimedLocation: 'The Wharf' }, // claimed==actual
        { name: 'Silas', actualLocation: 'The Archive', claimedLocation: 'Bar' },
        { name: 'Dot', actualLocation: 'Bar', claimedLocation: 'The Wharf' },
      ],
    });
    expect(cf.suspects.some((s) => s.name === cf.culprit)).toBe(true);
    const culprit = cf.suspects.find((s) => s.name === cf.culprit);
    expect(culprit.claimedLocation.toLowerCase()).not.toBe(cf.crimeScene.toLowerCase());
    // synthesized contradiction since none was provided
    expect(typeof cf.contradiction).toBe('string');
    expect(cf.contradiction.length).toBeGreaterThan(0);
  });
});
