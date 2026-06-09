import { resolveStoryDecision, decisionOptionsFrom } from '../../utils/storyDecision';

describe('resolveStoryDecision', () => {
  test('A/B subchapters use the single decision, not pathDecisions', () => {
    const single = { optionA: { title: 'a' }, optionB: { title: 'b' } };
    const out = resolveStoryDecision({
      metaDecision: single,
      metaPathDecisions: [{ pathKey: '1A-2A', optionA: { title: 'x' } }],
      subchapterLetter: 'A',
      branchingPath: '1A-2A',
    });
    expect(out).toBe(single);
  });

  test('C subchapter picks the realized path from array pathDecisions', () => {
    const pd = [
      { pathKey: '1A-2A', optionA: { title: 'first' } },
      { pathKey: '1B-2C', optionA: { title: 'chosen' } },
    ];
    const out = resolveStoryDecision({ metaPathDecisions: pd, subchapterLetter: 'C', branchingPath: '1B-2C' });
    expect(out.optionA.title).toBe('chosen');
  });

  test('C subchapter falls back to default path then first then fallback', () => {
    const pd = [{ pathKey: '1A-2A', optionA: { title: 'default' } }];
    expect(resolveStoryDecision({ metaPathDecisions: pd, subchapterLetter: 'C', branchingPath: '1C-2C' }).optionA.title).toBe('default');
    const fb = { optionA: { title: 'fb' } };
    expect(resolveStoryDecision({ metaPathDecisions: [], subchapterLetter: 'C', branchingPath: 'x', activeCaseStoryDecision: fb })).toBe(fb);
  });

  test('object-map pathDecisions resolve by key', () => {
    const pd = { '1A-2A': { optionA: { title: 'one' } }, '1B-2B': { optionA: { title: 'two' } } };
    expect(resolveStoryDecision({ metaPathDecisions: pd, subchapterLetter: 'C', branchingPath: '1B-2B' }).optionA.title).toBe('two');
  });
});

describe('decisionOptionsFrom', () => {
  test('optionA/optionB schema -> keyed array (grounded null without a groundedKey)', () => {
    const out = decisionOptionsFrom({ optionA: { title: 'a', focus: 'fa' }, optionB: { title: 'b' } });
    expect(out).toEqual([
      { key: 'A', title: 'a', focus: 'fa', grounded: null },
      { key: 'B', title: 'b', grounded: null },
    ]);
  });
  test('options array passes through; empty/undefined -> []', () => {
    expect(decisionOptionsFrom({ options: [{ key: 'A', title: 'x' }] })).toEqual([{ key: 'A', title: 'x', grounded: null }]);
    expect(decisionOptionsFrom(null)).toEqual([]);
    expect(decisionOptionsFrom({})).toEqual([]);
  });
  test('groundedKey marks the evidence-supported reading on its option', () => {
    const out = decisionOptionsFrom({
      groundedKey: 'B',
      optionA: { title: 'a' },
      optionB: { title: 'b' },
    });
    expect(out.find((o) => o.key === 'A').grounded).toBe(false);
    expect(out.find((o) => o.key === 'B').grounded).toBe(true);
    // Options-array form gets the same treatment.
    const arr = decisionOptionsFrom({ groundedKey: 'A', options: [{ key: 'A', title: 'x' }, { key: 'B', title: 'y' }] });
    expect(arr[0].grounded).toBe(true);
    expect(arr[1].grounded).toBe(false);
    // An invalid groundedKey degrades to null (no signal).
    expect(decisionOptionsFrom({ groundedKey: 'Z', optionA: { title: 'a' } })[0].grounded).toBeNull();
  });
});
