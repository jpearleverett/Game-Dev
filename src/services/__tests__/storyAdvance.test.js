import { advanceWithDecision, advanceSubchapter } from '../../utils/storyAdvance';

const base = (over = {}) => ({
  chapter: 1, subchapter: 3, activeCaseNumber: '001C',
  choiceHistory: [], pathHistory: { 1: 'ROOT' }, currentPathKey: 'ROOT',
  completedCaseNumbers: [], branchingChoices: [], preDecision: null,
  ...over,
});

describe('advanceWithDecision (chapter climax)', () => {
  test('advances to next chapter A and records the decision', () => {
    const out = advanceWithDecision(base(), {
      decisionCase: '001C', optionKey: 'B', optionTitle: 'You are bait', optionFocus: 'snare', timestamp: 't',
    });
    expect(out.chapter).toBe(2);
    expect(out.subchapter).toBe(1);
    expect(out.activeCaseNumber).toBe('002A');
    expect(out.preDecision).toBeNull();
    expect(out.awaitingDecision).toBe(false);
    expect(out.choiceHistory).toHaveLength(1);
    expect(out.choiceHistory[0]).toMatchObject({ caseNumber: '001C', optionKey: 'B', optionTitle: 'You are bait' });
    expect(out.completedCaseNumbers).toContain('001C');
  });

  test('preserves unrelated fields (no clobber of underMap/branchingChoices)', () => {
    const out = advanceWithDecision(
      base({ underMap: { fragments: [{ id: 'x' }] }, branchingChoices: [{ caseNumber: '001A' }] }),
      { decisionCase: '001C', optionKey: 'A', timestamp: 't' },
    );
    expect(out.underMap.fragments).toHaveLength(1);
    expect(out.branchingChoices).toHaveLength(1);
  });

  test('chapters 1-5 are not gated; 6+ are', () => {
    expect(advanceWithDecision(base({ chapter: 1 }), { decisionCase: '001C', optionKey: 'A', timestamp: 't' }).nextStoryUnlockAt).toBeNull();
    expect(advanceWithDecision(base({ chapter: 5, subchapter: 3, activeCaseNumber: '005C' }), { decisionCase: '005C', optionKey: 'A', timestamp: 't' }).nextStoryUnlockAt).toBeTruthy();
  });
});

describe('advanceSubchapter (A->B->C)', () => {
  test('advances within the chapter and marks completion', () => {
    const out = advanceSubchapter(base({ subchapter: 1, activeCaseNumber: '001A' }), '001A');
    expect(out.chapter).toBe(1);
    expect(out.subchapter).toBe(2);
    expect(out.activeCaseNumber).toBe('001B');
    expect(out.completedCaseNumbers).toContain('001A');
  });

  test('preserves unrelated fields', () => {
    const out = advanceSubchapter(base({ subchapter: 2, activeCaseNumber: '001B', underMap: { nodes: [1, 2] } }), '001B');
    expect(out.activeCaseNumber).toBe('001C');
    expect(out.underMap.nodes).toHaveLength(2);
  });
});
