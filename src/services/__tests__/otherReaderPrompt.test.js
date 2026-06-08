jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));
jest.mock('../LLMService', () => ({
  llmService: { init: jest.fn(), isConfigured: jest.fn(() => true), complete: jest.fn(async () => ({ content: '{}' })) },
}));
jest.mock('../../storage/generatedStoryStorage', () => ({ saveStoryContext: jest.fn(async () => true) }));

import { promptAssemblyMethods } from '../storyGeneration/promptAssembly';
import { createBlankUnderMap } from '../../data/underMap';

const build = (um) => promptAssemblyMethods._buildOtherReaderSection(um);
const withFoil = (foil) => ({ ...createBlankUnderMap(), foil });

describe('_buildOtherReaderSection', () => {
  test('no foil (or invalid map) yields no section', () => {
    expect(build(null)).toBe('');
    expect(build({})).toBe('');
    expect(build(createBlankUnderMap())).toBe('');
    expect(build(withFoil({ belief: '', presence: 2 }))).toBe('');
  });

  test('always surfaces the rejected creed and the current presence', () => {
    const out = build(withFoil({ belief: 'The symbol is a tracking lock.', fromChapter: 1, presence: 1, name: null }));
    expect(out).toContain('The symbol is a tracking lock.');
    expect(out).toContain('Current presence: 1');
    expect(out).toContain("the player's mirror");
  });

  test('intensity escalates with presence', () => {
    expect(build(withFoil({ belief: 'b', presence: 0 }))).toContain('OFFSTAGE');
    expect(build(withFoil({ belief: 'b', presence: 1 }))).toContain('EDGES');
    expect(build(withFoil({ belief: 'b', presence: 2 }))).toContain('INTO the scene');
    expect(build(withFoil({ belief: 'b', presence: 3 }))).toContain('ASCENDANT');
  });

  test('offstage foil is not named; manifest foil is told to name itself', () => {
    expect(build(withFoil({ belief: 'b', presence: 0 }))).not.toMatch(/Give them a name/);
    expect(build(withFoil({ belief: 'b', presence: 2, name: null }))).toContain('Give them a name');
  });

  test('an established foil name is pinned (no renaming across chapters)', () => {
    const out = build(withFoil({ belief: 'b', presence: 3, name: 'The Cartographer' }));
    expect(out).toContain('known as The Cartographer');
    expect(out).not.toMatch(/Give them a name/);
  });
});
