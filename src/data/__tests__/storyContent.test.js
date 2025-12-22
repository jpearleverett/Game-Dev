import { computeBranchPathKey } from '../storyContent';

describe('storyContent.computeBranchPathKey', () => {
  test('returns ROOT when there is no history', () => {
    expect(computeBranchPathKey([], 2)).toBe('ROOT');
    expect(computeBranchPathKey(null, 5)).toBe('ROOT');
  });

  test('builds cumulative key from decisions strictly before the target chapter', () => {
    const history = [
      { caseNumber: '001C', optionKey: 'B' }, // affects chapter 2
      { caseNumber: '002C', optionKey: 'A' }, // affects chapter 3
      { caseNumber: '003C', optionKey: 'B' }, // affects chapter 4
    ];

    expect(computeBranchPathKey(history, 2)).toBe('B');
    expect(computeBranchPathKey(history, 3)).toBe('BA');
    expect(computeBranchPathKey(history, 4)).toBe('BAB');
  });
});

