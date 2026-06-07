import { computeBranchPathKey, buildRealizedNarrative, fragmentsOnRealizedPath } from '../storyContent';

// A branching scene where each branch's prose contains a distinctive phrase, plus
// one fragment whose phrase lives in the shared opening, one with no phrase at all.
const BN = {
  opening: { text: 'Rain slicked the OPENING SIGIL on the door.' },
  firstChoice: {
    options: [
      { key: '1A', response: 'You took the alley and saw the ALLEY LANTERN flicker.' },
      { key: '1B', response: 'You climbed the stair to the ROOFTOP AERIAL humming.' },
    ],
  },
  secondChoices: [
    {
      afterChoice: '1A',
      options: [
        { key: '2A', response: 'The lantern revealed a DROWNED CLOCK beneath the grate.' },
        { key: '2B', response: 'A voice named the HOLLOW WARDEN in the dark.' },
      ],
    },
    {
      afterChoice: '1B',
      options: [
        { key: '2A', response: 'The aerial pointed at the BURNING LEDGER on the roof.' },
      ],
    },
  ],
};

const FRAGS = [
  { label: 'Opening Sigil', kind: 'symbol', phrase: 'OPENING SIGIL' },     // shared opening — always on path
  { label: 'Alley Lantern', kind: 'place', phrase: 'ALLEY LANTERN' },      // first choice 1A
  { label: 'Rooftop Aerial', kind: 'place', phrase: 'ROOFTOP AERIAL' },    // first choice 1B (skipped on 1A path)
  { label: 'Drowned Clock', kind: 'phenomenon', phrase: 'DROWNED CLOCK' }, // ending 1A-2A
  { label: 'Hollow Warden', kind: 'person', phrase: 'HOLLOW WARDEN' },     // ending 1A-2B (skipped)
  { label: 'Burning Ledger', kind: 'symbol', phrase: 'BURNING LEDGER' },   // ending 1B-2A (skipped)
  { label: 'Scene General', kind: 'phenomenon' },                          // no phrase — scene-general
];
const labels = (frags) => frags.map((f) => f.label).sort();

describe('storyContent path-scoped Under-Map ingestion', () => {
  test('buildRealizedNarrative includes only the chosen path prose', () => {
    const prose = buildRealizedNarrative(BN, '1A', '1A-2A');
    expect(prose).toContain('OPENING SIGIL');
    expect(prose).toContain('ALLEY LANTERN');
    expect(prose).toContain('DROWNED CLOCK');
    expect(prose).not.toContain('ROOFTOP AERIAL');
    expect(prose).not.toContain('HOLLOW WARDEN');
    expect(prose).not.toContain('BURNING LEDGER');
  });

  test('fragmentsOnRealizedPath keeps only on-path fragments (+ scene-general), drops skipped branches', () => {
    const prose = buildRealizedNarrative(BN, '1A', '1A-2A');
    const kept = fragmentsOnRealizedPath(FRAGS, prose);
    expect(labels(kept)).toEqual(
      ['Alley Lantern', 'Drowned Clock', 'Opening Sigil', 'Scene General'].sort(),
    );
    // The defining guarantee: nothing from a branch the player did not walk.
    expect(labels(kept)).not.toContain('Rooftop Aerial');
    expect(labels(kept)).not.toContain('Hollow Warden');
    expect(labels(kept)).not.toContain('Burning Ledger');
  });

  test('a different path keeps that path’s fragments and none of the first path’s branch-only ones', () => {
    const prose = buildRealizedNarrative(BN, '1B', '1B-2A');
    const kept = fragmentsOnRealizedPath(FRAGS, prose);
    expect(labels(kept)).toEqual(
      ['Burning Ledger', 'Opening Sigil', 'Rooftop Aerial', 'Scene General'].sort(),
    );
    expect(labels(kept)).not.toContain('Alley Lantern');
    expect(labels(kept)).not.toContain('Drowned Clock');
  });

  test('empty prose (non-branching / unreconstructable) keeps everything — never starves the board', () => {
    expect(fragmentsOnRealizedPath(FRAGS, '')).toHaveLength(FRAGS.length);
    expect(fragmentsOnRealizedPath(FRAGS, null)).toHaveLength(FRAGS.length);
  });

  test('phrase matching is case-insensitive and tolerant of surrounding whitespace', () => {
    const prose = buildRealizedNarrative(BN, '1A', '1A-2A');
    const kept = fragmentsOnRealizedPath([{ label: 'X', phrase: '  Alley Lantern  ' }], prose);
    expect(kept).toHaveLength(1);
  });
});

describe('storyContent.computeBranchPathKey', () => {
  test('returns ROOT when there is no history', () => {
    expect(computeBranchPathKey([], 2)).toBe('ROOT');
    expect(computeBranchPathKey(null, 5)).toBe('ROOT');
  });

  test('builds cumulative key from decisions strictly before the target chapter', () => {
    const history = [
      { caseNumber: '001C', optionKey: 'B' }, // affects chapter 2
      { caseNumber: '002C', optionKey: 'A' }, // affects chapter 3
      { caseNumber: '003C', optionKey: 'B' }, // affects chapter 4
    ];

    expect(computeBranchPathKey(history, 2)).toBe('B');
    expect(computeBranchPathKey(history, 3)).toBe('BA');
    expect(computeBranchPathKey(history, 4)).toBe('BAB');
  });
});

