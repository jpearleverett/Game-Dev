/**
 * A whole run through the model layer, in the order the game actually calls it.
 *
 * Every other suite exercises one helper at a time. This walks a campaign from
 * an empty map to a sealed ending and back into New Game+, so a change that is
 * locally correct but breaks the sequence — an eviction that orphans a thread, a
 * descent that refunds another, a depth meter that disagrees with the summary it
 * is rendered beside — shows up here rather than on a device.
 */

import {
  createBlankUnderMap,
  makeFragment,
  addFragments,
  addRelations,
  senseConnection,
  resolveReading,
  recordDescent,
  recordTheory,
  resolveTheory,
  updateDescentState,
  descentStateFor,
  drawDailyStir,
  resolveDailyStir,
  seedNewGamePlus,
  probeBudgetFor,
  pendingProbeBonus,
  mapDepth,
  truthsDrawn,
  senseTier,
  undiscoveredRelationCount,
  unresolvedReadingCount,
  clarity,
  endingVariant,
  foilPresence,
  latentThreadCount,
  FRAGMENT_KIND,
  FREEFORM_DESCENT_KEY,
} from '../../data/underMap';
import { selectEnding, selectEndingById, closingReport } from '../../data/endings';

const id = (kind, label) => makeFragment({ label, kind }).id;

// One chapter's worth of scene output, in the shape the generator emits.
const chapterContent = (n) => ({
  fragments: [
    { label: `Mark ${n}`, kind: FRAGMENT_KIND.SYMBOL, caseNumber: `00${n}A` },
    { label: `Door ${n}`, kind: FRAGMENT_KIND.PLACE, caseNumber: `00${n}A` },
    { label: 'Silver ink', kind: FRAGMENT_KIND.PHENOMENON, caseNumber: `00${n}A` },
  ],
  relations: [
    { aLabel: `Mark ${n}`, bLabel: `Door ${n}`, revelation: `The mark was cut into door ${n}.`, falseReadings: [`Door ${n} was built around the mark.`] },
    // A dangling thread: its other end arrives next chapter.
    { aLabel: `Door ${n}`, bLabel: `Mark ${n + 1}`, revelation: `Door ${n} answers to the next mark.` },
  ],
});

const playChapter = (map, n, { blurFirst = false } = {}) => {
  const content = chapterContent(n);
  let m = addFragments(map, content.fragments);
  m = addRelations(m, content.relations, { caseNumber: `00${n}A` });

  const a = id(FRAGMENT_KIND.SYMBOL, `Mark ${n}`);
  const b = id(FRAGMENT_KIND.PLACE, `Door ${n}`);
  const sensed = senseConnection(m, a, b);
  expect(sensed.valid).toBe(true);

  if (blurFirst) {
    m = resolveReading(m, a, b, sensed.readings.options.find((o) => o !== sensed.readings.correct)).map;
    expect(unresolvedReadingCount(m)).toBeGreaterThan(0);
  }
  m = resolveReading(m, a, b, sensed.readings.correct).map;
  return m;
};

describe('a campaign, played through the model', () => {
  test('chapters accumulate, threads dangle and are paid off, and depth tracks the truth', () => {
    let m = createBlankUnderMap();

    m = playChapter(m, 1);
    expect(truthsDrawn(m)).toBe(1);
    // Chapter 1 authored a thread whose other end does not exist yet.
    expect(latentThreadCount(m)).toBe(1);

    m = playChapter(m, 2);
    // Mark 2 arrived, so chapter 1's dangling thread promoted to a real one.
    expect(latentThreadCount(m)).toBe(1); // ch2's own dangler
    expect(undiscoveredRelationCount(m)).toBeGreaterThan(0);

    m = playChapter(m, 3, { blurFirst: true });
    // The blurred reading was settled correctly on the second try.
    expect(unresolvedReadingCount(m)).toBe(0);

    const depth = mapDepth(m);
    expect(depth.drawn).toBe(truthsDrawn(m));
    expect(depth.drawn).toBeLessThanOrEqual(depth.total);
  });

  test('the daily thread pays a probe into the next gated descent, once', () => {
    let m = playChapter(createBlankUnderMap(), 1);
    const before = probeBudgetFor(m);

    m = drawDailyStir(m, '2026-09-03T08:00:00.000Z', () => 0);
    m = resolveDailyStir(m, '2026-09-03T08:00:00.000Z');
    expect(pendingProbeBonus(m)).toBe(1);
    expect(probeBudgetFor(m)).toBe(before + 1);

    // Idempotent within the day.
    m = resolveDailyStir(m, '2026-09-03T09:00:00.000Z');
    expect(pendingProbeBonus(m)).toBe(1);

    // Spent by a descent that used it, and not by one that did not.
    const unused = recordDescent(m, { hadMisstep: false, used: false, caseNumber: '002A' });
    expect(pendingProbeBonus(unused)).toBe(1);
    const used = recordDescent(m, { hadMisstep: false, used: true, caseNumber: '002A' });
    expect(pendingProbeBonus(used)).toBe(0);
  });

  test('the two boards keep separate books', () => {
    let m = playChapter(createBlankUnderMap(), 1);
    m = updateDescentState(m, '002A', { probesUsed: 2, probeBudget: 3, hadMisstep: true });
    m = updateDescentState(m, FREEFORM_DESCENT_KEY, { probesUsed: 3, probeBudget: 3 });
    expect(descentStateFor(m, '002A').probesUsed).toBe(2);
    expect(descentStateFor(m, FREEFORM_DESCENT_KEY).probesUsed).toBe(3);
    m = recordDescent(m, { hadMisstep: true, caseNumber: '002A' });
    expect(descentStateFor(m, '002A').probesUsed).toBe(0);
    expect(descentStateFor(m, FREEFORM_DESCENT_KEY).probesUsed).toBe(3);
  });

  test('beliefs seal, resolve, move the foil, and settle into an ending', () => {
    let m = playChapter(createBlankUnderMap(), 1);
    m = playChapter(m, 2);

    m = recordTheory(m, {
      chapter: 1,
      interpretation: 'The marks are a language.',
      rejected: ['The marks are a warning.'],
      grounded: true,
    });
    expect(foilPresence(m)).toBe(0);
    m = resolveTheory(m, 1, true);
    expect(clarity(m)).toEqual({ resolved: 1, correct: 1, ratio: 1 });
    expect(foilPresence(m)).toBe(-1); // held: the rival recedes

    m = recordTheory(m, {
      chapter: 2,
      interpretation: 'The doors were built for it.',
      rejected: ['The doors were taken for it.'],
      grounded: false,
    });
    m = resolveTheory(m, 2, false);
    expect(clarity(m).ratio).toBe(0.5);
    expect(foilPresence(m)).toBe(0); // subverted: the rival gains it back

    expect(endingVariant(m)).toBe('half');

    const ending = selectEnding(m);
    expect(ending.variant).toBe('half');
    expect(ending.flavorLine).toContain('The doors were built for it.');

    const report = closingReport(m, ending);
    expect(report.lines.some((l) => l.includes('HELD'))).toBe(true);
    expect(report.lines.some((l) => l.includes('SUBVERTED'))).toBe(true);
    expect(report.lines.some((l) => l.includes('Final clarity: 1 of 2'))).toBe(true);
  });

  test('New Game+ starts clean but remembers the reader and the record', () => {
    let m = playChapter(createBlankUnderMap(), 1);
    m = recordTheory(m, { chapter: 1, interpretation: 'A reading.', rejected: ['The other reading.'] });
    m = resolveTheory(m, 1, false);
    m = { ...m, dailyStreak: 6, bestDailyStreak: 11, bestFlawlessStreak: 3 };

    const next = seedNewGamePlus(m);
    expect(next.fragments).toEqual([]);
    expect(next.relations).toEqual([]);
    expect(next.theories).toEqual([]);
    expect(mapDepth(next)).toEqual({ drawn: 0, total: 0, ratio: 0 });
    expect(senseTier(next)).toBe(0);
    // The rival carries over, marked as a prior-season reader.
    expect(next.foil.belief).toBe('The other reading.');
    expect(next.foil.fromChapter).toBeNull();
    expect(next.foil.presence).toBe(1);
    // So does the record.
    expect(next.dailyStreak).toBe(6);
    expect(next.bestDailyStreak).toBe(11);
    expect(next.bestFlawlessStreak).toBe(3);
    // Revisiting the finished run still shows the ending it reached.
    expect(selectEndingById(m, 'ending_deceived').variant).toBe('deceived');
  });
});
