import {
  dedupeWords,
  shuffleArray,
  extractOutlierWords,
  extractMainWords,
} from '../gameLogic';

// Mock dependencies to isolate logic testing
// Paths are relative to this test file: src/utils/__tests__/gameLogic.test.js
jest.mock('../../data/cases', () => ({
  SEASON_ONE_CASES: [],
}));

jest.mock('../../storage/progressStorage', () => ({
  createBlankStoryCampaign: jest.fn(() => ({})),
}));

jest.mock('../../data/storyContent', () => ({
  formatCaseNumber: jest.fn(),
  ROOT_PATH_KEY: 'ROOT',
  normalizeStoryPathKey: jest.fn(k => k),
}));

jest.mock('../../utils/caseNumbers', () => ({
  getBoardProfile: jest.fn(),
}));

describe('Game Logic Utils', () => {
  describe('dedupeWords', () => {
    it('removes duplicates from an array', () => {
      const input = ['A', 'B', 'A', 'C', 'B'];
      const result = dedupeWords(input);
      expect(result).toEqual(['A', 'B', 'C']);
    });

    it('handles empty arrays', () => {
      expect(dedupeWords([])).toEqual([]);
    });
  });

  describe('shuffleArray', () => {
    it('maintains array length', () => {
      const input = [1, 2, 3, 4, 5];
      const result = shuffleArray(input);
      expect(result.length).toBe(input.length);
    });

    it('contains same elements', () => {
      const input = [1, 2, 3];
      const result = shuffleArray(input);
      expect(result).toContain(1);
      expect(result).toContain(2);
      expect(result).toContain(3);
    });
  });

  describe('extractOutlierWords', () => {
    it('returns requested number of outliers', () => {
      const board = {
        outlierWords: ['A', 'B', 'C', 'D', 'E'],
      };
      const result = extractOutlierWords(board, 3);
      expect(result).toHaveLength(3);
      expect(result).toEqual(['A', 'B', 'C']);
    });

    it('returns all available if less than requested', () => {
      const board = {
        outlierWords: ['A', 'B'],
      };
      const result = extractOutlierWords(board, 4);
      expect(result).toHaveLength(2);
    });
  });

  describe('extractMainWords', () => {
    it('filters out outlier words', () => {
      const board = {
        mainWords: ['A', 'B', 'C', 'D', 'E'],
      };
      const outliers = ['B', 'D'];
      const result = extractMainWords(board, outliers);
      expect(result).toEqual(['A', 'C', 'E']);
    });
    
    it('deduplicates main words', () => {
      const board = {
        mainWords: ['A', 'A', 'B'],
      };
      const result = extractMainWords(board, []);
      expect(result).toEqual(['A', 'B']);
    });
  });
});

describe('formatCountdown', () => {
  const { formatCountdown } = require('../caseFileHelpers');

  test('counts down while the gate holds', () => {
    const at = new Date(Date.now() + 2 * 3600000 + 61000).toISOString();
    expect(formatCountdown(at)).toMatch(/^02:0[01]:\d\d$/);
  });

  test('returns null once the gate has passed, never a frozen string', () => {
    // It used to return "Unlocking soon" forever past the target: truthy, so
    // callers that gate on the countdown stayed gated, and callers that
    // interpolate it rendered "The city answers in Unlocking soon".
    expect(formatCountdown(new Date(Date.now() - 1000).toISOString())).toBeNull();
    expect(formatCountdown(null)).toBeNull();
    expect(formatCountdown('not a date')).toBeNull();
  });

  test('there is one implementation of it', () => {
    const fs = require('fs');
    const path = require('path');
    ['screens/DeskScreen.js', 'screens/StoryCampaignScreen.js', 'screens/CaseFileScreen.js'].forEach((rel) => {
      const src = fs.readFileSync(path.join(__dirname, '../..', rel), 'utf8');
      expect(`${rel} declares its own: ${/function formatCountdown/.test(src)}`).toBe(`${rel} declares its own: false`);
    });
  });
});
