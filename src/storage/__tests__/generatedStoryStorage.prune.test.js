jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { pruneOldGenerations, invalidateStoryCache } from '../generatedStoryStorage';

describe('generatedStoryStorage pruning safety', () => {
  // The module memoizes the loaded story, so a suite that does not clear it
  // silently runs its second test against the first test's store.
  beforeEach(() => invalidateStoryCache());

  test('does not prune decision points or very recent chapters even on other paths', async () => {
    const mkEntry = (chapter, subchapter, narrativeBytes = 5000) => ({
      chapter,
      subchapter,
      narrative: 'x'.repeat(narrativeBytes),
      title: `T${chapter}.${subchapter}`,
      generatedAt: new Date().toISOString(),
    });

    const story = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      totalGenerated: 3,
      chapters: {
        // Very old, low priority (should be pruned first)
        '002A_ZZ': mkEntry(2, 1, 12000),
        // Recent but NOT on currentPathKey (must be preserved)
        '009A_ZZ': mkEntry(9, 1, 12000),
        // Decision point but NOT on currentPathKey (must be preserved)
        '005C_ZZ': mkEntry(5, 3, 12000),
      },
    };

    AsyncStorage.getItem.mockImplementation(async () => JSON.stringify(story));

    // Force pruning by setting a tiny max size.
    const result = await pruneOldGenerations('BA', 10, 1);
    expect(result.prunedCount).toBeGreaterThanOrEqual(1);

    const pruned = new Set(result.prunedKeys || []);
    // Old entry can be pruned
    expect(pruned.has('002A_ZZ')).toBe(true);
    // Recent entry should not be pruned
    expect(pruned.has('009A_ZZ')).toBe(false);
    // Decision point should not be pruned
    expect(pruned.has('005C_ZZ')).toBe(false);
  });

  test("the opening of the game survives a full campaign's worth of storage", async () => {
    // Chapter 1 is stored under the path key 'ROOT' (there are no decisions behind
    // it yet), and "AABBABABBAB".startsWith('ROOT') is false — so the scorer's
    // prefix test gave the opening NO on-path bonus while every later chapter on
    // the player's own path got 1000, against a never-prune threshold of 500.
    // 001A and 001B were the lowest-scored entries in the whole store: the first
    // things deleted, taking the read-back pager's route to page one with them.
    const old = new Date(Date.now() - 60 * 60 * 60 * 1000).toISOString();
    const mk = (chapter, subchapter) => ({
      chapter,
      subchapter,
      narrative: 'x'.repeat(12000),
      title: `T${chapter}.${subchapter}`,
      generatedAt: old,
    });

    const currentPathKey = 'AABBABABBAB';
    const chapters = {
      '001A_ROOT': mk(1, 1),
      '001B_ROOT': mk(1, 2),
      '001C_ROOT': mk(1, 3),
    };
    // Chapters 2-11 on the realized path, each keyed by its cumulative prefix.
    for (let ch = 2; ch <= 11; ch += 1) {
      const key = currentPathKey.slice(0, ch - 1);
      chapters[`${String(ch).padStart(3, '0')}A_${key}`] = mk(ch, 1);
    }
    // And a branch the player never took, which SHOULD go first.
    chapters['004A_BBBB'] = mk(4, 1);

    AsyncStorage.getItem.mockImplementation(async () => JSON.stringify({
      version: 1,
      lastUpdated: new Date().toISOString(),
      totalGenerated: Object.keys(chapters).length,
      chapters,
    }));

    const result = await pruneOldGenerations(currentPathKey, 12, 1);
    const pruned = new Set(result.prunedKeys || []);

    expect(pruned.has('001A_ROOT')).toBe(false);
    expect(pruned.has('001B_ROOT')).toBe(false);
    expect(pruned.has('001C_ROOT')).toBe(false);
    // The abandoned branch is what gets dropped instead.
    expect(pruned.has('004A_BBBB')).toBe(true);
  });
});

