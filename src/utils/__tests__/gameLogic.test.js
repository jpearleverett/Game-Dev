import {
  dedupeWords,
  shuffleArray,
  extractOutlierWords,
  extractMainWords,
} from '../gameLogic';

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
