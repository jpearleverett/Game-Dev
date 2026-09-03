/**
 * normalizeStoryCampaignShape runs on EVERY campaign write and had no test at
 * all. It lives here rather than in gameLogic.test.js because that suite mocks
 * progressStorage and storyContent down to stubs, which is exactly the machinery
 * this function's behaviour is made of.
 */

import { normalizeStoryCampaignShape } from '../gameLogic';

describe('normalizeStoryCampaignShape', () => {

  test('a null campaign becomes a complete, playable one', () => {
    // This runs on EVERY campaign write, and had no test at all.
    const c = normalizeStoryCampaignShape(null);
    expect(c.active).toBe(true);
    expect(c.chapter).toBe(1);
    expect(c.activeCaseNumber).toBe('001A');
    expect(c.currentPathKey).toBe('ROOT');
    expect(c.choiceHistory).toEqual([]);
    expect(c.completedCaseNumbers).toEqual([]);
    expect(c.underMap).toBeTruthy();
    expect(Array.isArray(c.underMap.fragments)).toBe(true);
  });

  test('garbage in the array fields does not reach the game as garbage', () => {
    const c = normalizeStoryCampaignShape({
      choiceHistory: 'not an array',
      completedCaseNumbers: { nope: true },
      pathHistory: null,
      underMap: 'corrupt',
    });
    expect(c.choiceHistory).toEqual([]);
    expect(c.completedCaseNumbers).toEqual([]);
    expect(Array.isArray(c.underMap.fragments)).toBe(true);
  });

  test('the current path is recorded against the current chapter', () => {
    const c = normalizeStoryCampaignShape({ chapter: 4, subchapter: 2, currentPathKey: '1a-2b' });
    expect(c.currentPathKey).toBe(c.pathHistory[4]);
  });

  test('activeCaseNumber is only derived when there is none to keep', () => {
    // The blank campaign always carries one, so the derive branch fires only for
    // a save that lost the field. It does NOT re-derive from chapter/subchapter,
    // which is why the advance helpers own the position and this only repairs.
    expect(normalizeStoryCampaignShape({ chapter: 4, subchapter: 2, activeCaseNumber: null }).activeCaseNumber)
      .toBe('004B');
    expect(normalizeStoryCampaignShape({ chapter: 4, subchapter: 2 }).activeCaseNumber)
      .toBe(normalizeStoryCampaignShape(null).activeCaseNumber);
  });

  test('an existing activeCaseNumber is left alone', () => {
    expect(normalizeStoryCampaignShape({ chapter: 4, subchapter: 2, activeCaseNumber: '004C' }).activeCaseNumber)
      .toBe('004C');
  });

  test('a gate that has elapsed is not a gate', () => {
    // Nothing else ever cleared nextStoryUnlockAt by the passage of time, so
    // every screen that tests it for PRESENCE stayed locked forever.
    const past = new Date(Date.now() - 60000).toISOString();
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(normalizeStoryCampaignShape({ nextStoryUnlockAt: past }).nextStoryUnlockAt).toBeNull();
    expect(normalizeStoryCampaignShape({ nextStoryUnlockAt: 'not a date' }).nextStoryUnlockAt).toBeNull();
    expect(normalizeStoryCampaignShape({ nextStoryUnlockAt: future }).nextStoryUnlockAt).toBe(future);
  });

  test('it is idempotent', () => {
    const once = normalizeStoryCampaignShape({ chapter: 3, subchapter: 3, currentPathKey: '1B-2C' });
    const twice = normalizeStoryCampaignShape(once);
    expect(twice).toEqual(once);
  });
});
