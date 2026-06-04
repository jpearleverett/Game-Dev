import { computeConstellationLayout } from '../underMapLayout';
import {
  createBlankUnderMap,
  addFragments,
  addRelations,
  connectFragments,
  fragmentId,
  FRAGMENT_KIND,
} from '../../data/underMap';

const DIMS = { width: 300, height: 300, padding: 20 };

const within = (n, dims = DIMS) =>
  n.x >= dims.padding && n.x <= dims.width - dims.padding &&
  n.y >= dims.padding && n.y <= dims.height - dims.padding;

describe('computeConstellationLayout', () => {
  test('empty / zero-size yields nothing', () => {
    expect(computeConstellationLayout(null, DIMS).nodes).toEqual([]);
    expect(computeConstellationLayout({ fragments: [] }, DIMS).nodes).toEqual([]);
    let m = addFragments(createBlankUnderMap(), [{ label: 'a', kind: 'symbol' }]);
    expect(computeConstellationLayout(m, { width: 0, height: 0 }).nodes).toEqual([]);
  });

  test('one node per fragment, all clamped inside the padded canvas', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [
      { label: 'ink', kind: 'phenomenon', caseNumber: '001A' },
      { label: 'seal', kind: 'symbol', caseNumber: '001A' },
      { label: 'house', kind: 'place', caseNumber: '002B' },
    ]);
    const out = computeConstellationLayout(m, DIMS);
    expect(out.nodes).toHaveLength(3);
    out.nodes.forEach((n) => expect(within(n)).toBe(true));
    // Carries through kind + chapter for styling.
    expect(out.nodes.find((n) => n.label === 'house').chapter).toBe(2);
    expect(out.nodes.find((n) => n.label === 'ink').kind).toBe('phenomenon');
  });

  test('honors a fragment persistent position (stable map, no reflow)', () => {
    const map = {
      fragments: [
        { id: 'f1', label: 'pinned', kind: 'symbol', firstCaseNumber: '001A', pos: { nx: 0.25, ny: 0.75 } },
      ],
      connections: [],
    };
    const out = computeConstellationLayout(map, DIMS);
    const n = out.nodes[0];
    // x = padding + nx*(W-2pad), y = padding + ny*(H-2pad)
    expect(n.x).toBeCloseTo(DIMS.padding + 0.25 * (DIMS.width - 2 * DIMS.padding), 5);
    expect(n.y).toBeCloseTo(DIMS.padding + 0.75 * (DIMS.height - 2 * DIMS.padding), 5);
  });

  test('is deterministic — same input yields identical positions', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [
      { label: 'a', kind: 'symbol', caseNumber: '001A' },
      { label: 'b', kind: 'place', caseNumber: '002A' },
    ]);
    expect(computeConstellationLayout(m, DIMS)).toEqual(computeConstellationLayout(m, DIMS));
  });

  test('a drawn connection becomes a link segment between its two nodes', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [
      { label: 'ink', kind: 'phenomenon', caseNumber: '001A' },
      { label: 'seal', kind: 'symbol', caseNumber: '001A' },
    ]);
    m = addRelations(m, [{ aLabel: 'ink', bLabel: 'seal', revelation: 'one mark', scope: 'arc' }]);
    const inkId = fragmentId(FRAGMENT_KIND.PHENOMENON, 'ink');
    const sealId = fragmentId(FRAGMENT_KIND.SYMBOL, 'seal');
    m = connectFragments(m, inkId, sealId).map;

    const out = computeConstellationLayout(m, DIMS);
    expect(out.links).toHaveLength(1);
    const link = out.links[0];
    expect(link.scope).toBe('arc');
    expect(link.unresolvedReading).toBe(false);
    // Endpoints match the two node positions.
    const ink = out.nodes.find((n) => n.id === inkId);
    const seal = out.nodes.find((n) => n.id === sealId);
    const ends = [{ x: link.x1, y: link.y1 }, { x: link.x2, y: link.y2 }];
    expect(ends).toEqual(expect.arrayContaining([
      { x: ink.x, y: ink.y },
      { x: seal.x, y: seal.y },
    ]));
  });

  test('force mode: deterministic, one node per fragment, clamped inside canvas', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [
      { label: 'a', kind: 'symbol', caseNumber: '001A' },
      { label: 'b', kind: 'place', caseNumber: '001A' },
      { label: 'c', kind: 'person', caseNumber: '002A' },
      { label: 'd', kind: 'phenomenon', caseNumber: '003A' },
    ]);
    m = addRelations(m, [{ aLabel: 'a', bLabel: 'b', revelation: 'x' }]);
    const a = fragmentId(FRAGMENT_KIND.SYMBOL, 'a');
    const b = fragmentId(FRAGMENT_KIND.PLACE, 'b');
    m = connectFragments(m, a, b).map;

    const opts = { ...DIMS, mode: 'force', iterations: 40 };
    const out = computeConstellationLayout(m, opts);
    expect(out.nodes).toHaveLength(4);
    out.nodes.forEach((n) => expect(within(n)).toBe(true));
    expect(out.links).toHaveLength(1);
    // Deterministic: identical inputs -> identical refined positions.
    expect(computeConstellationLayout(m, opts)).toEqual(out);
  });

  test('force mode falls back gracefully for <3 nodes', () => {
    let m = addFragments(createBlankUnderMap(), [{ label: 'solo', kind: 'symbol', caseNumber: '001A' }]);
    const out = computeConstellationLayout(m, { ...DIMS, mode: 'force' });
    expect(out.nodes).toHaveLength(1);
    expect(within(out.nodes[0])).toBe(true);
  });

  test('links to a fragment with no position are skipped (robustness)', () => {
    const map = {
      fragments: [{ id: 'f1', label: 'a', kind: 'symbol', firstCaseNumber: '001A' }],
      connections: [{ a: 'f1', b: 'missing', unresolvedReading: false }],
    };
    const out = computeConstellationLayout(map, DIMS);
    expect(out.nodes).toHaveLength(1);
    expect(out.links).toHaveLength(0);
  });
});
