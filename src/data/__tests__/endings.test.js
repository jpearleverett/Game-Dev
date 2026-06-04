import { selectEnding } from '../endings';
import { createBlankUnderMap, recordTheory, resolveTheory } from '../underMap';

const withBeliefs = (results) => {
  let m = createBlankUnderMap();
  results.forEach((_, i) => { m = recordTheory(m, { chapter: i + 1, fragmentIds: ['a'], interpretation: `belief ${i + 1}` }); });
  results.forEach((correct, i) => { m = resolveTheory(m, i + 1, correct); });
  return m;
};

describe('selectEnding', () => {
  test('unproven when no belief has resolved', () => {
    const e = selectEnding(createBlankUnderMap());
    expect(e.variant).toBe('unproven');
    expect(e.id).toBe('ending_unproven');
    expect(Array.isArray(e.body)).toBe(true);
    expect(e.flavorLine).toBeNull(); // no sealed belief
  });

  test('clear ending at high clarity, flavored by the last belief', () => {
    const e = selectEnding(withBeliefs([true, true, false])); // 2/3 >= 0.66
    expect(e.variant).toBe('clear');
    expect(e.id).toBe('ending_clear');
    expect(e.clarity).toEqual({ resolved: 3, correct: 2, ratio: 2 / 3 });
    // theories prepend newest-first -> last sealed is "belief 3".
    expect(e.flavorLine).toContain('belief 3');
  });

  test('half ending at middling clarity', () => {
    const e = selectEnding(withBeliefs([true, false, false])); // 1/3 ~0.33
    expect(e.variant).toBe('half');
    expect(e.id).toBe('ending_half');
  });

  test('deceived ending at low clarity', () => {
    const e = selectEnding(withBeliefs([false, false])); // 0/2
    expect(e.variant).toBe('deceived');
    expect(e.id).toBe('ending_deceived');
    expect(e.flavorLine).toContain('shape it wanted');
  });
});
