/**
 * CLAUDE.md §5 invariants #1 and #2, which between them caused the worst bug the
 * game has shipped: the player finishing 1C and landing back on 1A, forever.
 *
 *   #1 a campaign advance must use the FUNCTIONAL updateProgress(prev => ...),
 *      because an object-merge write built from a closure snapshot clobbers the
 *      background generation writes that land between render and commit.
 *   #2 the advance is FORWARD-ONLY and derived from the case that was completed
 *      (the param), never from the campaign's own idea of where it is.
 *
 * Both live inside a React callback in a 1300-line context that would drag the
 * whole app graph into a test renderer, so this reads the source. That is enough
 * for the failure mode that actually happened: an edit that reintroduces a stale
 * write or an equality guard.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../../context/GameContext.js'), 'utf8');

const completeLogicPuzzle = () => {
  const start = SRC.indexOf('const completeLogicPuzzle = useCallback(');
  expect(start).toBeGreaterThan(-1);
  const end = SRC.indexOf('// ========== CASE BOARD (DEDUCTION) ==========', start);
  expect(end).toBeGreaterThan(start);
  return SRC.slice(start, end);
};

describe('the campaign advance', () => {
  const fn = completeLogicPuzzle();

  test('writes functionally, never from a render-time snapshot', () => {
    expect(fn).toMatch(/updateProgress\(\(prev\)\s*=>/);
    // The write that stranded the player: a whole-campaign object rebuilt from
    // the `progress` captured in the closure.
    expect(fn).not.toContain('saveStoredProgress(');
    expect(fn).not.toMatch(/updateProgress\(\{/);
  });

  test('derives the next position from the completed case, not the campaign', () => {
    expect(fn).toContain('parseCaseNumber(caseNumber)');
    expect(fn).toMatch(/const targetOrder =/);
    expect(fn).toContain('caseOrder(current.activeCaseNumber)');
  });

  test('only ever moves forward, and never with an equality guard', () => {
    // `targetOrder <= curOrder` is the forward-only test. The guard that must
    // NOT come back is `caseNumber === activeCaseNumber`, which permanently
    // skipped the advance whenever nav and campaign had drifted apart.
    expect(fn.match(/targetOrder <= curOrder/g).length).toBeGreaterThanOrEqual(2);
    expect(fn).not.toMatch(/caseNumber\s*===\s*\w*[aA]ctiveCaseNumber/);
    expect(fn).not.toMatch(/\w*[aA]ctiveCaseNumber\s*===\s*caseNumber/);
  });

  test('a stale mode cannot block it', () => {
    expect(fn).not.toMatch(/if\s*\(\s*mode\s*!==\s*['"]story['"]\s*\)\s*return/);
  });
});

describe('every other campaign write is functional too', () => {
  // One object-merge write anywhere is enough to lose a concurrent generation
  // write, so this checks the whole file rather than one callback.
  test('no updateProgress call merges a multi-key object built from a snapshot', () => {
    // Single-scalar writes (`{ currentCaseId }`) are safe: nothing else writes
    // that key and they carry no snapshot. Anything that spreads or accumulates
    // is the shape that loses concurrent writes.
    const objectWrites = SRC.match(/updateProgress\(\s*\{[^}]*\.\.\.[^}]*\}/gs) || [];
    expect(objectWrites).toEqual([]);
    const multiline = SRC.match(/updateProgress\(\s*\{\s*\n/g) || [];
    expect(multiline).toEqual([]);
  });

  test('no campaign write goes straight to storage', () => {
    expect(SRC).not.toContain('saveStoredProgress(');
  });
});
