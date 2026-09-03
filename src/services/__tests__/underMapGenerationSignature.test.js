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
