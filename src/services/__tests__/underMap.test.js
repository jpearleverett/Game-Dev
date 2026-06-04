import {
  createBlankUnderMap,
  normalizeUnderMap,
  makeFragment,
  fragmentId,
  addFragments,
  addRelations,
  connectFragments,
  senseConnection,
  resolveReading,
  readingChoices,
  recordDescent,
  recordTheory,
  resolveTheory,
  clarity,
  endingVariant,
  fragmentCount,
  revealedNodeCount,
  areConnected,
  undiscoveredRelationCount,
  sensedRelations,
  connectableFragmentCount,
  probeBudgetFor,
  unresolvedReadingCount,
  flawlessStreak,
  bestFlawlessStreak,
  isMotif,
  motifCount,
  isKeystone,
  keystoneCount,
  arcNodeCount,
  drawDailyStir,
  resolveDailyStir,
  dailyStreak,
  dailyStirFragment,
  mapDepth,
  FRAGMENT_KIND,
} from '../../data/underMap';

const seed = () => {
  let m = createBlankUnderMap();
  m = addFragments(m, [
    { label: 'Silver ink that moves', kind: FRAGMENT_KIND.PHENOMENON },
    { label: '14 Acheron Avenue', kind: FRAGMENT_KIND.PLACE },
    { label: 'Old Customs House', kind: FRAGMENT_KIND.PLACE },
    { label: 'Silver stain on the courier', kind: FRAGMENT_KIND.PHENOMENON },
  ]);
  return m;
};

describe('underMap', () => {
  test('fragments dedupe by id (kind+label)', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [{ label: 'The Glyph', kind: 'symbol' }]);
    m = addFragments(m, [{ label: 'the glyph', kind: 'symbol' }]); // same slug
    expect(fragmentCount(m)).toBe(1);
    expect(m.fragments[0].id).toBe(fragmentId('symbol', 'The Glyph'));
  });

  test('unknown kind falls back to phenomenon; anomalous defaults true', () => {
    const f = makeFragment({ label: 'x', kind: 'bogus' });
    expect(f.kind).toBe(FRAGMENT_KIND.PHENOMENON);
    expect(f.anomalous).toBe(true);
  });

  test('relations resolve by label and a correct connection reveals a node', () => {
    let m = seed();
    m = addRelations(m, [
      { aLabel: 'Silver stain on the courier', bLabel: 'Silver ink that moves', revelation: 'The ink marks who carries it.' },
      { aLabel: 'Old Customs House', bLabel: '14 Acheron Avenue', revelation: 'Both sit on the Under-Map.' },
    ]);
    expect(undiscoveredRelationCount(m)).toBe(2);

    const inkId = fragmentId(FRAGMENT_KIND.PHENOMENON, 'Silver ink that moves');
    const stainId = fragmentId(FRAGMENT_KIND.PHENOMENON, 'Silver stain on the courier');

    const r = connectFragments(m, stainId, inkId);
    expect(r.valid).toBe(true);
    expect(r.revealed.node.revelation).toBe('The ink marks who carries it.');
    expect(revealedNodeCount(r.map)).toBe(1);
    expect(areConnected(r.map, inkId, stainId)).toBe(true); // undirected
    expect(undiscoveredRelationCount(r.map)).toBe(1);
  });

  test('a connection with no relation is inconclusive, not punishing', () => {
    let m = seed();
    m = addRelations(m, [{ aLabel: 'Old Customs House', bLabel: '14 Acheron Avenue', revelation: 'x' }]);
    const inkId = fragmentId(FRAGMENT_KIND.PHENOMENON, 'Silver ink that moves');
    const acheronId = fragmentId(FRAGMENT_KIND.PLACE, '14 Acheron Avenue');
    const r = connectFragments(m, inkId, acheronId); // no relation between these
    expect(r.valid).toBe(false);
    expect(r.revealed).toBeNull();
    expect(revealedNodeCount(r.map)).toBe(0);
  });

  test('re-connecting an already-revealed pair is a no-op (no duplicate node)', () => {
    let m = seed();
    m = addRelations(m, [{ aLabel: 'Old Customs House', bLabel: '14 Acheron Avenue', revelation: 'Both sit on the Under-Map.' }]);
    const a = fragmentId(FRAGMENT_KIND.PLACE, 'Old Customs House');
    const b = fragmentId(FRAGMENT_KIND.PLACE, '14 Acheron Avenue');
    const first = connectFragments(m, a, b);
    const second = connectFragments(first.map, b, a);
    expect(second.alreadyConnected).toBe(true);
    expect(revealedNodeCount(second.map)).toBe(1);
  });

  test('relations dedupe by undirected key', () => {
    let m = seed();
    m = addRelations(m, [{ aLabel: 'A', bLabel: 'B', revelation: 'x' }]); // labels not present -> skipped
    m = addRelations(m, [
      { aLabel: 'Old Customs House', bLabel: '14 Acheron Avenue', revelation: 'one' },
      { aLabel: '14 Acheron Avenue', bLabel: 'Old Customs House', revelation: 'dup reversed' },
    ]);
    expect(m.relations).toHaveLength(1);
  });

  test('EXAMINE: relations re-resolve as fragments are collected one at a time', () => {
    // Simulates tapping anomalies in the prose: each tap ingests one fragment plus
    // the full scene relations. A relation must wait until BOTH endpoints exist.
    const rels = [{ aLabel: 'The Glyph', bLabel: 'The Sigil', revelation: 'They are the same mark, drawn twice.' }];
    let m = createBlankUnderMap();

    // First tap collects one endpoint; the relation cannot resolve yet.
    m = addFragments(m, [makeFragment({ label: 'The Glyph', kind: 'symbol' })]);
    m = addRelations(m, rels);
    expect(m.relations).toHaveLength(0);

    // Second tap collects the other endpoint; now the relation resolves.
    m = addFragments(m, [makeFragment({ label: 'The Sigil', kind: 'symbol' })]);
    m = addRelations(m, rels);
    expect(m.relations).toHaveLength(1);

    // And connecting the two now reveals the hidden node exactly once.
    const a = fragmentId('symbol', 'The Glyph');
    const b = fragmentId('symbol', 'The Sigil');
    const res = connectFragments(m, a, b);
    expect(res.valid).toBe(true);
    expect(res.revealed?.node?.revelation).toContain('drawn twice');
    expect(undiscoveredRelationCount(res.map)).toBe(0);
  });

  test('recordTheory stores a committed theory', () => {
    let m = seed();
    m = recordTheory(m, { chapter: 1, fragmentIds: ['a', 'b'], interpretation: 'It is all one map.' });
    expect(m.theories[0].interpretation).toBe('It is all one map.');
    expect(recordTheory(m, { fragmentIds: [] }).theories).toHaveLength(1); // empty -> no new theory
  });

  test('normalizeUnderMap repairs garbage', () => {
    expect(normalizeUnderMap(null).fragments).toEqual([]);
    expect(normalizeUnderMap({ fragments: 'nope' }).fragments).toEqual([]);
  });

  test('MOTIF: re-collecting a fragment deepens it instead of duplicating', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [makeFragment({ label: 'The silver ink', kind: 'phenomenon', caseNumber: '001A' })]);
    expect(fragmentCount(m)).toBe(1);
    const first = m.fragments[0];
    expect(first.seen).toBe(1);
    expect(isMotif(first)).toBe(false);

    // It re-surfaces in a later chapter.
    m = addFragments(m, [makeFragment({ label: 'the silver ink', kind: 'phenomenon', caseNumber: '003B' })]); // same slug
    expect(fragmentCount(m)).toBe(1); // not duplicated
    const deep = m.fragments[0];
    expect(deep.seen).toBe(2);
    expect(deep.lastCaseNumber).toBe('003B');
    expect(deep.firstCaseNumber).toBe('001A');
    expect(isMotif(deep)).toBe(true);
    expect(motifCount(m)).toBe(1);
  });

  test('mapDepth = share of discoverable relations actually drawn', () => {
    let m = seed();
    m = addRelations(m, [
      { aLabel: 'Old Customs House', bLabel: '14 Acheron Avenue', revelation: 'one' },
      { aLabel: 'Silver ink that moves', bLabel: 'Silver stain on the courier', revelation: 'two' },
    ]);
    expect(mapDepth(m)).toEqual({ drawn: 0, total: 2, ratio: 0 });
    const a = fragmentId(FRAGMENT_KIND.PLACE, 'Old Customs House');
    const b = fragmentId(FRAGMENT_KIND.PLACE, '14 Acheron Avenue');
    m = connectFragments(m, a, b).map;
    expect(mapDepth(m)).toEqual({ drawn: 1, total: 2, ratio: 0.5 });
  });
});

// ---- Move 1: CONNECT-as-deduction (probes, choose-the-truth, streak) --------

const deductionSeed = () => {
  let m = createBlankUnderMap();
  m = addFragments(m, [
    { label: 'Silver ink that moves', kind: FRAGMENT_KIND.PHENOMENON },
    { label: 'Silver stain on the courier', kind: FRAGMENT_KIND.PHENOMENON },
    { label: 'Old Customs House', kind: FRAGMENT_KIND.PLACE },
    { label: '14 Acheron Avenue', kind: FRAGMENT_KIND.PLACE },
  ]);
  m = addRelations(m, [
    {
      aLabel: 'Silver stain on the courier',
      bLabel: 'Silver ink that moves',
      revelation: 'The ink marks who carries it.',
      falseReadings: ['The courier spilled a cosmetic.', 'The stain is unrelated rust.'],
    },
  ]);
  return m;
};
const INK = fragmentId(FRAGMENT_KIND.PHENOMENON, 'Silver ink that moves');
const STAIN = fragmentId(FRAGMENT_KIND.PHENOMENON, 'Silver stain on the courier');
const ACHERON = fragmentId(FRAGMENT_KIND.PLACE, '14 Acheron Avenue');

describe('underMap — deduction', () => {
  test('addRelations captures up to two falseReadings', () => {
    const m = deductionSeed();
    expect(m.relations[0].falseReadings).toEqual([
      'The courier spilled a cosmetic.',
      'The stain is unrelated rust.',
    ]);
  });

  test('senseConnection is a pure probe — no mutation, surfaces readings', () => {
    const m = deductionSeed();
    const hit = senseConnection(m, STAIN, INK);
    expect(hit.valid).toBe(true);
    expect(hit.alreadyConnected).toBe(false);
    expect(hit.readings.correct).toBe('The ink marks who carries it.');
    expect(hit.readings.options).toHaveLength(3);
    expect(hit.readings.options).toContain('The ink marks who carries it.');
    // No mutation: still 0 nodes/connections.
    expect(revealedNodeCount(m)).toBe(0);
    expect(m.connections).toHaveLength(0);

    const wrongProbe = senseConnection(m, INK, ACHERON);
    expect(wrongProbe.valid).toBe(false);
    expect(wrongProbe.readings).toBeNull();
  });

  test('resolveReading: correct reading reveals a sharp node', () => {
    const m = deductionSeed();
    const res = resolveReading(m, STAIN, INK, 'The ink marks who carries it.');
    expect(res.valid).toBe(true);
    expect(res.correctReading).toBe(true);
    expect(res.node.unresolvedReading).toBe(false);
    expect(revealedNodeCount(res.map)).toBe(1);
    expect(unresolvedReadingCount(res.map)).toBe(0);
    expect(areConnected(res.map, INK, STAIN)).toBe(true);
  });

  test('resolveReading: wrong reading still connects but blurs the node', () => {
    const m = deductionSeed();
    const res = resolveReading(m, STAIN, INK, 'The courier spilled a cosmetic.');
    expect(res.valid).toBe(true);
    expect(res.correctReading).toBe(false);
    expect(res.node.unresolvedReading).toBe(true);
    expect(unresolvedReadingCount(res.map)).toBe(1);
    // Progress not lost: the connection counts toward depth.
    expect(mapDepth(res.map).drawn).toBe(1);
  });

  test('a blurred node upgrades to sharp when read correctly later', () => {
    let m = deductionSeed();
    m = resolveReading(m, STAIN, INK, 'The stain is unrelated rust.').map; // wrong
    expect(unresolvedReadingCount(m)).toBe(1);
    const up = resolveReading(m, STAIN, INK, 'The ink marks who carries it.'); // correct now
    expect(up.upgraded).toBe(true);
    expect(up.alreadyConnected).toBe(true);
    expect(unresolvedReadingCount(up.map)).toBe(0);
    expect(revealedNodeCount(up.map)).toBe(1); // no duplicate node
  });

  test('probe budget scales with connectable fragments, shrinks as links are drawn', () => {
    const m = deductionSeed();
    // 2 fragments participate in the single unfound relation -> base + floor(2/3) = 3.
    expect(connectableFragmentCount(m)).toBe(2);
    expect(probeBudgetFor(m)).toBe(3);
    expect(sensedRelations(m)).toHaveLength(1);

    const drawn = resolveReading(m, STAIN, INK, 'The ink marks who carries it.').map;
    expect(connectableFragmentCount(drawn)).toBe(0);
    expect(sensedRelations(drawn)).toHaveLength(0);
  });

  test('readingChoices shuffles deterministically with an injected rng', () => {
    const { readings } = senseConnection(deductionSeed(), STAIN, INK);
    const order = readingChoices(readings, () => 0); // rng=0 -> reverse-ish deterministic order
    expect(order).toHaveLength(3);
    expect([...order].sort()).toEqual([...readings.options].sort()); // same set
  });

  test('recordDescent tracks the flawless streak and resets on a misstep', () => {
    let m = createBlankUnderMap();
    m = recordDescent(m, { hadMisstep: false });
    m = recordDescent(m, { hadMisstep: false });
    expect(flawlessStreak(m)).toBe(2);
    expect(bestFlawlessStreak(m)).toBe(2);
    m = recordDescent(m, { hadMisstep: true });
    expect(flawlessStreak(m)).toBe(0);
    expect(bestFlawlessStreak(m)).toBe(2); // best preserved
  });

  test('back-compat: connectFragments still reveals via the legacy shape', () => {
    const m = deductionSeed();
    const r = connectFragments(m, STAIN, INK);
    expect(r.valid).toBe(true);
    expect(r.revealed.node.revelation).toBe('The ink marks who carries it.');
    expect(r.revealed.node.unresolvedReading).toBe(false); // auto-resolves the truth
  });
});

// ---- Move 8: Daily on-ramp (the overnight stir) -----------------------------

describe('underMap — daily stir', () => {
  const seedFrags = () => addFragments(createBlankUnderMap(), [
    { label: 'silver ink', kind: 'phenomenon', caseNumber: '001A' },
    { label: 'the seal', kind: 'symbol', caseNumber: '001A' },
  ]);

  test('draws one fragment per day, idempotent within the day', () => {
    let m = seedFrags();
    m = drawDailyStir(m, '2026-06-04T08:00:00Z', () => 0);
    expect(m.dailyStir.date).toBe('2026-06-04');
    expect(m.dailyStir.resolved).toBe(false);
    expect(dailyStirFragment(m)).toBeTruthy();
    // Same day again -> unchanged stir.
    const again = drawDailyStir(m, '2026-06-04T22:00:00Z', () => 0.99);
    expect(again.dailyStir.fragmentId).toBe(m.dailyStir.fragmentId);
  });

  test('no fragments collected -> no stir', () => {
    const m = drawDailyStir(createBlankUnderMap(), '2026-06-04T08:00:00Z');
    expect(m.dailyStir).toBeNull();
  });

  test('prefers a recurring motif as the drifting fragment', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [{ label: 'plain', kind: 'place', caseNumber: '001A' }]);
    m = addFragments(m, [{ label: 'motif', kind: 'symbol', caseNumber: '001A' }]);
    m = addFragments(m, [{ label: 'motif', kind: 'symbol', caseNumber: '002A' }]); // seen=2 -> motif
    m = drawDailyStir(m, '2026-06-04T08:00:00Z', () => 0);
    expect(dailyStirFragment(m).label).toBe('motif');
  });

  test('resolving deepens the fragment and advances the streak; missed day resets', () => {
    let m = seedFrags();
    m = drawDailyStir(m, '2026-06-04T08:00:00Z', () => 0);
    const fragId = m.dailyStir.fragmentId;
    const before = m.fragments.find((f) => f.id === fragId).seen || 1;

    m = resolveDailyStir(m, '2026-06-04T20:00:00Z');
    expect(m.dailyStir.resolved).toBe(true);
    expect(m.fragments.find((f) => f.id === fragId).seen).toBe(before + 1);
    expect(dailyStreak(m)).toBe(1);
    // Re-resolving the same day is a no-op.
    expect(resolveDailyStir(m, '2026-06-04T21:00:00Z').dailyStreak).toBe(1);

    // Next consecutive day -> streak 2.
    m = drawDailyStir(m, '2026-06-05T08:00:00Z', () => 0);
    m = resolveDailyStir(m, '2026-06-05T20:00:00Z');
    expect(dailyStreak(m)).toBe(2);

    // Skip a day -> streak resets to 1.
    m = drawDailyStir(m, '2026-06-07T08:00:00Z', () => 0);
    m = resolveDailyStir(m, '2026-06-07T20:00:00Z');
    expect(dailyStreak(m)).toBe(1);
    expect(m.bestDailyStreak).toBe(2);
  });
});

// ---- Move 5: Keystones + arc-level truths -----------------------------------

describe('underMap — keystones', () => {
  const collect = (label, caseNumber) =>
    makeFragment({ label, kind: 'phenomenon', caseNumber });

  test('a motif that recurs >=3x WITHIN one chapter is NOT a keystone', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [collect('silver ink', '001A')]);
    m = addFragments(m, [collect('silver ink', '001B')]);
    m = addFragments(m, [collect('silver ink', '001C')]);
    const f = m.fragments[0];
    expect(f.seen).toBe(3);
    expect(isMotif(f)).toBe(true);
    expect(isKeystone(f)).toBe(false); // span is 1 chapter
    expect(keystoneCount(m)).toBe(0);
  });

  test('a motif that recurs >=3x ACROSS chapters becomes a keystone', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [collect('silver ink', '001A')]);
    m = addFragments(m, [collect('silver ink', '002B')]);
    m = addFragments(m, [collect('silver ink', '004A')]);
    const f = m.fragments[0];
    expect(f.seen).toBe(3);
    expect(isKeystone(f)).toBe(true);
    expect(keystoneCount(m)).toBe(1);
  });

  test('arc-scoped relations reveal arc-level nodes', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [
      { label: 'silver ink', kind: 'phenomenon' },
      { label: 'the closed eye', kind: 'symbol' },
    ]);
    m = addRelations(m, [
      { aLabel: 'silver ink', bLabel: 'the closed eye', revelation: 'They are one signal across the whole map.', scope: 'arc' },
    ]);
    expect(m.relations[0].scope).toBe('arc');
    const a = fragmentId('phenomenon', 'silver ink');
    const b = fragmentId('symbol', 'the closed eye');
    const r = connectFragments(m, a, b);
    expect(r.revealed.node.scope).toBe('arc');
    expect(arcNodeCount(r.map)).toBe(1);
  });

  test('relations default to chapter scope', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [{ label: 'a', kind: 'symbol' }, { label: 'b', kind: 'place' }]);
    m = addRelations(m, [{ aLabel: 'a', bLabel: 'b', revelation: 'x' }]);
    expect(m.relations[0].scope).toBe('chapter');
  });
});

// ---- Move 3: belief truth + Clarity + ending spectrum -----------------------

describe('underMap — clarity & endings', () => {
  const sealed = (chapter, interpretation) =>
    recordTheory(createBlankUnderMap(), { chapter, fragmentIds: ['a'], interpretation });

  test('resolveTheory marks the chapter belief and only the first unresolved one', () => {
    let m = sealed(1, 'It guides you in.');
    expect(clarity(m)).toEqual({ resolved: 0, correct: 0, ratio: 0 });
    m = resolveTheory(m, 1, true);
    expect(m.theories[0].correct).toBe(true);
    // An already-resolved belief is not flipped by a later resolve.
    expect(resolveTheory(m, 1, false).theories[0].correct).toBe(true);
  });

  test('clarity ratio reflects correct vs resolved beliefs', () => {
    let m = createBlankUnderMap();
    m = recordTheory(m, { chapter: 1, fragmentIds: ['a'], interpretation: 'x' });
    m = recordTheory(m, { chapter: 2, fragmentIds: ['b'], interpretation: 'y' });
    m = recordTheory(m, { chapter: 3, fragmentIds: ['c'], interpretation: 'z' });
    m = resolveTheory(m, 1, true);
    m = resolveTheory(m, 2, true);
    m = resolveTheory(m, 3, false);
    expect(clarity(m)).toEqual({ resolved: 3, correct: 2, ratio: 2 / 3 });
  });

  test('endingVariant follows the locked clarity spectrum', () => {
    expect(endingVariant(createBlankUnderMap())).toBe('unproven');

    // 2/3 correct -> >= 0.66 -> Clear-Eyed.
    let clear = createBlankUnderMap();
    [1, 2, 3].forEach((c) => { clear = recordTheory(clear, { chapter: c, fragmentIds: ['a'], interpretation: 'x' }); });
    clear = resolveTheory(resolveTheory(resolveTheory(clear, 1, true), 2, true), 3, false);
    expect(endingVariant(clear)).toBe('clear');

    // 1/3 correct -> >= 0.33 -> Half-Blind.
    let half = createBlankUnderMap();
    [1, 2, 3].forEach((c) => { half = recordTheory(half, { chapter: c, fragmentIds: ['a'], interpretation: 'x' }); });
    half = resolveTheory(resolveTheory(resolveTheory(half, 1, true), 2, false), 3, false);
    expect(endingVariant(half)).toBe('half');

    // 0/2 correct -> Deceived.
    let deceived = createBlankUnderMap();
    [1, 2].forEach((c) => { deceived = recordTheory(deceived, { chapter: c, fragmentIds: ['a'], interpretation: 'x' }); });
    deceived = resolveTheory(resolveTheory(deceived, 1, false), 2, false);
    expect(endingVariant(deceived)).toBe('deceived');
  });
});
