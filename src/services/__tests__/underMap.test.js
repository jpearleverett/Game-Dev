import {
  createBlankUnderMap,
  normalizeUnderMap,
  makeFragment,
  fragmentId,
  addFragments,
  addRelations,
  connectFragments,
  recordTheory,
  fragmentCount,
  revealedNodeCount,
  areConnected,
  undiscoveredRelationCount,
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
});
