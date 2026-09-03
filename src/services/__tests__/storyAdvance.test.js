import { advanceWithDecision, advanceSubchapter, caseOrder } from '../../utils/storyAdvance';

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

  test('chapters 1-2 are binge-able; the gate starts at 3 and lengthens at 6', () => {
    // The old name here claimed chapters 1-5 were ungated, which the code
    // retired when FIRST_GATED_CHAPTER moved to 3, and it asserted nothing about
    // the gate's LENGTH, so the 6h -> 12h step was uncovered.
    const gateAfter = (chapter) => {
      const cn = `${String(chapter).padStart(3, '0')}C`;
      const at = Date.now();
      const out = advanceWithDecision(
        base({ chapter, subchapter: 3, activeCaseNumber: cn }),
        { decisionCase: cn, optionKey: 'A', timestamp: new Date(at).toISOString() },
      );
      if (!out.nextStoryUnlockAt) return null;
      // The gate is measured from the moment the decision lands, not from the
      // timestamp carried on it.
      return Math.round((Date.parse(out.nextStoryUnlockAt) - at) / 3600000);
    };
    expect(gateAfter(1)).toBeNull();
    expect(gateAfter(2)).toBe(6);   // the decision at 2C unlocks chapter 3
    expect(gateAfter(3)).toBe(6);
    expect(gateAfter(5)).toBe(12);  // the decision at 5C unlocks chapter 6
    expect(gateAfter(8)).toBe(12);
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

  test('DRIFT RECOVERY: derives next from the completed case, not the (drifted) active position', () => {
    // The reported bug: campaign stuck at 001A while the player floated forward.
    // Completing 001B must advance to 001C regardless of the stale active position.
    const stuck = base({ subchapter: 1, activeCaseNumber: '001A' });
    const out = advanceSubchapter(stuck, '001B');
    expect(out.activeCaseNumber).toBe('001C');
    expect(out.chapter).toBe(1);
    expect(out.subchapter).toBe(3);
  });
});

describe('caseOrder (forward-only comparisons)', () => {
  test('orders by chapter then subchapter', () => {
    expect(caseOrder('001A')).toBe(11);
    expect(caseOrder('001C')).toBe(13);
    expect(caseOrder('002A')).toBe(21);
    expect(caseOrder('001C') < caseOrder('002A')).toBe(true);
    expect(caseOrder('001A') < caseOrder('001B')).toBe(true);
  });
});

describe('gate cadence (seal -> wait -> verdict heartbeat)', () => {
  const base = () => ({ choiceHistory: [], pathHistory: {}, completedCaseNumbers: [] });

  test('chapters 1-2 stay binge-able; the gate starts at chapter 3', () => {
    const intoCh2 = advanceWithDecision(base(), { decisionCase: '001C', optionKey: 'A', timestamp: 't' });
    expect(intoCh2.nextStoryUnlockAt).toBeNull();
    const intoCh3 = advanceWithDecision(base(), { decisionCase: '002C', optionKey: 'A', timestamp: 't' });
    expect(intoCh3.nextStoryUnlockAt).not.toBeNull();
  });

  test('early gates are short (6h), long gates from chapter 6 (12h)', () => {
    const now = Date.now();
    const intoCh3 = advanceWithDecision(base(), { decisionCase: '002C', optionKey: 'A', timestamp: 't' });
    const early = new Date(intoCh3.nextStoryUnlockAt).getTime() - now;
    expect(early).toBeGreaterThan(5.5 * 3600000);
    expect(early).toBeLessThan(6.5 * 3600000);
    const intoCh6 = advanceWithDecision(base(), { decisionCase: '005C', optionKey: 'A', timestamp: 't' });
    const long = new Date(intoCh6.nextStoryUnlockAt).getTime() - now;
    expect(long).toBeGreaterThan(11.5 * 3600000);
    expect(long).toBeLessThan(12.5 * 3600000);
  });
});

describe('the campaign cannot advance past the last chapter', () => {
  test('a decision on 012C completes the campaign instead of inventing 013A', () => {
    // Nothing outside TheoryScreen guarded this, so the evidence-board and
    // post-puzzle decision paths could leave the campaign pointing at a case
    // that does not exist, behind a fresh 12-hour gate, with no way back.
    const current = base({ chapter: 12, subchapter: 3, activeCaseNumber: '012C', currentPathKey: 'AB' });
    const next = advanceWithDecision(current, {
      decisionCase: '012C',
      optionKey: 'A',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(next.completed).toBe(true);
    expect(next.completedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(next.activeCaseNumber).toBe('012C');
    expect(next.chapter).toBe(12);
    expect(next.nextStoryUnlockAt).toBeNull();
    expect(next.completedCaseNumbers).toContain('012C');
  });

  test('a decision on any earlier chapter still advances normally', () => {
    const current = base({ chapter: 11, subchapter: 3, activeCaseNumber: '011C' });
    const next = advanceWithDecision(current, {
      decisionCase: '011C',
      optionKey: 'B',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(next.chapter).toBe(12);
    expect(next.activeCaseNumber).toBe('012A');
    expect(next.completed).toBeFalsy();
  });
});
