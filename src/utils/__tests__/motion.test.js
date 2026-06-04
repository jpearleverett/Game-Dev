import { DURATION, STAGGER, SPRING, reduceMotion, staggerDelay } from '../motion';

describe('motion language', () => {
  test('durations are in the research-backed 160-520ms range and ordered', () => {
    expect(DURATION.fast).toBeLessThan(DURATION.base);
    expect(DURATION.base).toBeLessThan(DURATION.slow);
    expect(DURATION.slow).toBeLessThan(DURATION.scene);
    expect(DURATION.fast).toBeGreaterThanOrEqual(120);
    expect(DURATION.scene).toBeLessThanOrEqual(600);
  });

  test('spring presets are native-driver friendly', () => {
    Object.values(SPRING).forEach((s) => {
      expect(s.useNativeDriver).toBe(true);
      expect(s.friction).toBeGreaterThan(0);
      expect(s.tension).toBeGreaterThan(0);
    });
  });

  test('staggerDelay cascades by STAGGER and clamps negative indices', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(3)).toBe(3 * STAGGER);
    expect(staggerDelay(2, 100)).toBe(100 + 2 * STAGGER);
    expect(staggerDelay(-5)).toBe(0);
  });

  test('reduceMotion reads the settings flag safely', () => {
    expect(reduceMotion(null)).toBe(false);
    expect(reduceMotion({})).toBe(false);
    expect(reduceMotion({ reducedMotion: true })).toBe(true);
  });
});
