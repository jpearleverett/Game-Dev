jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { pruneOldGenerations } from '../generatedStoryStorage';

describe('generatedStoryStorage pruning safety', () => {
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
});

