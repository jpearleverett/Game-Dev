/**
 * Constellation layout for the Under-Map (Move 4, see docs/undermap_redesign.md §7).
 *
 * Pure + deterministic: given the player's fragments and connections plus a canvas
 * size, it returns node positions (clustered by the CHAPTER a fragment first
 * surfaced in, so the map reads as regions of reality assembling) and the link
 * segments between connected fragments. No randomness, no React, no I/O — so the
 * positions are stable across renders and the math is unit-testable.
 */

/** Chapter number from a case number like "003B" -> 3 (0 if unparseable, so it clusters). */
const chapterOf = (caseNumber) => {
  const n = parseInt(String(caseNumber || '').slice(0, 3), 10);
  return Number.isFinite(n) ? n : 0;
};

const undirectedKey = (a, b) => [a, b].sort().join('::');

/**
 * @param {{fragments?: array, connections?: array}} map
 * @param {{width:number, height:number, padding?:number}} dims
 * @returns {{ nodes: array, links: array, width:number, height:number }}
 *   node: { id, x, y, kind, label, chapter, seen }
 *   link: { id, x1, y1, x2, y2, unresolvedReading, scope }
 */
export function computeConstellationLayout(map, { width = 0, height = 0, padding = 28 } = {}) {
  const fragments = Array.isArray(map?.fragments) ? map.fragments : [];
  const connections = Array.isArray(map?.connections) ? map.connections : [];

  if (!fragments.length || width <= 0 || height <= 0) {
    return { nodes: [], links: [], width, height };
  }

  const cx = width / 2;
  const cy = height / 2;
  const minDim = Math.min(width, height);
  const usableR = Math.max(0, minDim / 2 - padding);

  // Group fragments by their first-seen chapter, preserving collection order within a group.
  const byChapter = new Map();
  fragments.forEach((f) => {
    const ch = chapterOf(f.firstCaseNumber || f.caseNumber || f.lastCaseNumber);
    if (!byChapter.has(ch)) byChapter.set(ch, []);
    byChapter.get(ch).push(f);
  });
  const chapters = [...byChapter.keys()].sort((a, b) => a - b);
  const chapterCount = chapters.length;

  // Cluster radius: clusters sit on a ring; with a single chapter, cluster is centered.
  const clusterRing = chapterCount > 1 ? usableR * 0.55 : 0;
  const fragRing = usableR * (chapterCount > 1 ? 0.32 : 0.7);

  const posById = new Map();
  const nodes = [];

  chapters.forEach((ch, ci) => {
    const clusterAngle = chapterCount > 1 ? (ci / chapterCount) * Math.PI * 2 - Math.PI / 2 : 0;
    const ccx = cx + clusterRing * Math.cos(clusterAngle);
    const ccy = cy + clusterRing * Math.sin(clusterAngle);
    const group = byChapter.get(ch);
    const m = group.length;
    group.forEach((f, fi) => {
      let x = ccx;
      let y = ccy;
      if (m > 1) {
        const a = (fi / m) * Math.PI * 2 - Math.PI / 2;
        x = ccx + fragRing * Math.cos(a);
        y = ccy + fragRing * Math.sin(a);
      }
      // Clamp inside the padded canvas.
      x = Math.max(padding, Math.min(width - padding, x));
      y = Math.max(padding, Math.min(height - padding, y));
      posById.set(f.id, { x, y });
      nodes.push({ id: f.id, x, y, kind: f.kind, label: f.label, chapter: ch, seen: f.seen || 1 });
    });
  });

  const links = [];
  const seen = new Set();
  connections.forEach((c, i) => {
    const pa = posById.get(c.a);
    const pb = posById.get(c.b);
    if (!pa || !pb) return;
    const key = undirectedKey(c.a, c.b);
    if (seen.has(key)) return;
    seen.add(key);
    links.push({
      id: `link_${i}_${key}`,
      x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y,
      unresolvedReading: !!c.unresolvedReading,
      scope: c.scope || 'chapter',
    });
  });

  return { nodes, links, width, height };
}
