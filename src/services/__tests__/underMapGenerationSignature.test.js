import { underMapGenerationSignature } from '../../utils/underMapGeneration';
import {
  addFragments,
  addRelations,
  createBlankUnderMap,
  recordTheory,
  resolveReading,
  FRAGMENT_KIND,
} from '../../data/underMap';

const connectedMap = () => {
  let map = createBlankUnderMap();
  map = addFragments(map, [
    { label: 'Clock Without Hands', kind: FRAGMENT_KIND.SYMBOL },
    { label: 'Flooded Platform', kind: FRAGMENT_KIND.PLACE },
  ]);
  map = addRelations(map, [
    {
      aLabel: 'Clock Without Hands',
      bLabel: 'Flooded Platform',
      revelation: 'Ashport transit remembers impossible routes.',
    },
  ]);
  return resolveReading(map, map.fragments[0].id, map.fragments[1].id, 'Ashport transit remembers impossible routes.').map;
};

describe('underMapGenerationSignature', () => {
  test('changes when a revealed node is added', () => {
    const before = createBlankUnderMap();
    const after = connectedMap();

    expect(underMapGenerationSignature(after)).not.toBe(underMapGenerationSignature(before));
  });

  test('changes when a theory is sealed', () => {
    const before = connectedMap();
    const after = recordTheory(before, {
      chapter: 2,
      fragmentIds: before.fragments.map((f) => f.id),
      interpretation: 'Blackwell is guiding Jack deeper.',
      rejected: ['Blackwell is using Jack as bait.'],
    });

    expect(underMapGenerationSignature(after)).not.toBe(underMapGenerationSignature(before));
  });
});

describe('the empty sentinel', () => {
  test('a blank map signs the same as no map at all', () => {
    // Five parts joined by four two-character separators is eight colons; the
    // sentinel compared against four, so it never fired and a blank map signed
    // as a long literal that no absent map could ever match.
    const { createBlankUnderMap } = require('../../data/underMap');
    expect(underMapGenerationSignature(createBlankUnderMap())).toBe('empty');
    expect(underMapGenerationSignature(null)).toBe('empty');
    expect(underMapGenerationSignature(undefined)).toBe('empty');
  });
});

describe('what the signature deliberately ignores', () => {
  const {
    createBlankUnderMap, addFragments, addRelations, resolveReading, recordTheory, FRAGMENT_KIND,
  } = require('../../data/underMap');
  const { compactUnderMapSignature } = require('../../utils/underMapGeneration');

  const seeded = () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [
      { label: 'The drowned door', kind: FRAGMENT_KIND.PLACE },
      { label: 'Silver ink', kind: FRAGMENT_KIND.PHENOMENON },
    ]);
    m = addRelations(m, [
      { aLabel: 'The drowned door', bLabel: 'Silver ink', revelation: 'The door was written, not built.' },
    ]);
    return m;
  };

  test('a banked probe never invalidates a prefetched scene', () => {
    // These are economy, not story input. If they moved the signature, resolving
    // the daily stir would throw away a scene that is still perfectly valid.
    const m = seeded();
    expect(underMapGenerationSignature({ ...m, pendingProbeBonus: 2 }))
      .toBe(underMapGenerationSignature(m));
  });

  test("a belief's grounding never invalidates one either", () => {
    const base = recordTheory(seeded(), {
      chapter: 2, interpretation: 'The door was written.', rejected: ['The door was built.'], grounded: true,
    });
    const other = recordTheory(seeded(), {
      chapter: 2, interpretation: 'The door was written.', rejected: ['The door was built.'], grounded: false,
    });
    expect(underMapGenerationSignature(other)).toBe(underMapGenerationSignature(base));
  });

  test('a blurred reading vouches for nothing, so it does not sign as a truth', () => {
    // A node the player got wrong carries unresolvedReading; it must not enter
    // the signature as revealed canon, because the prompt never sees it either.
    const m = seeded();
    const wrong = resolveReading(m, m.fragments[1].id, m.fragments[0].id, 'A reading that is not the truth.').map;
    expect(underMapGenerationSignature(wrong)).toBe(underMapGenerationSignature(m));
  });

  test('a dangling thread DOES sign, because the prompt is told to pay it off', () => {
    const m = seeded();
    const withLatent = addRelations(m, [
      { aLabel: 'Silver ink', bLabel: 'A name not yet spoken', revelation: 'The ink is a signature.' },
    ]);
    expect(withLatent.latentRelations).toHaveLength(1);
    expect(underMapGenerationSignature(withLatent)).not.toBe(underMapGenerationSignature(m));
  });

  test('the compact form is stable, collision-free across these cases, and prefixed', () => {
    const sigs = [
      underMapGenerationSignature(null),
      underMapGenerationSignature(seeded()),
      underMapGenerationSignature(recordTheory(seeded(), { chapter: 1, interpretation: 'A reading.', rejected: ['B'] })),
    ].map(compactUnderMapSignature);
    sigs.forEach((s) => expect(s).toMatch(/^um_[a-z0-9]+$/));
    expect(new Set(sigs).size).toBe(sigs.length);
    expect(compactUnderMapSignature(underMapGenerationSignature(seeded())))
      .toBe(compactUnderMapSignature(underMapGenerationSignature(seeded())));
  });
});
