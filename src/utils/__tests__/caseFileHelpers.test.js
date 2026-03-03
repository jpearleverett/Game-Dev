import { formatCountdown } from '../caseFileHelpers';

describe('formatCountdown', () => {
  test('returns HH:MM without second-by-second churn', () => {
    const now = new Date('2026-01-01T00:00:00.000Z').getTime();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    expect(formatCountdown('2026-01-01T02:34:59.000Z')).toBe('02:34');

    Date.now.mockRestore();
  });
});
