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

// Above this node count, the force layout is skipped (cluster reads clearer and
// the O(n^2) refine isn't worth it). Deterministic either way.
const FORCE_MAX_NODES = 60;

/**
 * Deterministic force-directed refinement (Phase 2). Seeded from the cluster
 * positions (NOT random), then relaxed with simple repulsion + spring +
 * centering forces and cooling. Mutates the passed node objects' x/y in place
 * and returns the updated posById. Pure given identical inputs.
 */
function forceRefine(nodes, connections, { width, height, padding, iterations = 60 }) {
  const n = nodes.length;
  const area = (width - padding * 2) * (height - padding * 2);
  const k = Math.sqrt(Math.max(1, area) / n); // ideal edge length
  const cx = width / 2;
  const cy = height / 2;
  const idIndex = new Map(nodes.map((node, i) => [node.id, i]));
  const edges = [];
  const seenEdge = new Set();
  connections.forEach((c) => {
    const ia = idIndex.get(c.a);
    const ib = idIndex.get(c.b);
    if (ia == null || ib == null || ia === ib) return;
    const key = undirectedKey(String(ia), String(ib));
    if (seenEdge.has(key)) return;
    seenEdge.add(key);
    edges.push([ia, ib]);
  });

  let temp = Math.min(width, height) * 0.12;
  const cool = temp / (iterations + 1);

  for (let it = 0; it < iterations; it += 1) {
    const dispX = new Array(n).fill(0);
    const dispY = new Array(n).fill(0);

    // Repulsion between every pair.
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        let dx = nodes[i].x - nodes[j].x;
        let dy = nodes[i].y - nodes[j].y;
        let dist = Math.hypot(dx, dy) || 0.01;
        // Nudge apart deterministically if exactly coincident.
        if (dist < 0.02) { dx = (i - j) * 0.01; dy = 0.01; dist = Math.hypot(dx, dy); }
        const rep = (k * k) / dist;
        const ux = dx / dist;
        const uy = dy / dist;
        dispX[i] += ux * rep; dispY[i] += uy * rep;
        dispX[j] -= ux * rep; dispY[j] -= uy * rep;
      }
    }
    // Attraction along edges.
    edges.forEach(([a, b]) => {
      const dx = nodes[a].x - nodes[b].x;
      const dy = nodes[a].y - nodes[b].y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const att = (dist * dist) / k;
      const ux = dx / dist;
      const uy = dy / dist;
      dispX[a] -= ux * att; dispY[a] -= uy * att;
      dispX[b] += ux * att; dispY[b] += uy * att;
    });
    // Gentle pull toward center so disconnected nodes don't drift to the rim.
    for (let i = 0; i < n; i += 1) {
      dispX[i] += (cx - nodes[i].x) * 0.02;
      dispY[i] += (cy - nodes[i].y) * 0.02;
    }
    // Apply, capped by temperature, clamped to the padded canvas.
    for (let i = 0; i < n; i += 1) {
      const d = Math.hypot(dispX[i], dispY[i]) || 0.01;
      const step = Math.min(d, temp);
      nodes[i].x = Math.max(padding, Math.min(width - padding, nodes[i].x + (dispX[i] / d) * step));
      nodes[i].y = Math.max(padding, Math.min(height - padding, nodes[i].y + (dispY[i] / d) * step));
    }
    temp = Math.max(0, temp - cool);
  }

  const posById = new Map();
  nodes.forEach((node) => posById.set(node.id, { x: node.x, y: node.y }));
  return posById;
}

/**
 * @param {{fragments?: array, connections?: array}} map
 * @param {{width:number, height:number, padding?:number, mode?:'cluster'|'force', iterations?:number}} dims
 * @returns {{ nodes: array, links: array, width:number, height:number }}
 *   node: { id, x, y, kind, label, chapter, seen }
 *   link: { id, x1, y1, x2, y2, unresolvedReading, scope }
 */
export function computeConstellationLayout(map, { width = 0, height = 0, padding = 28, mode = 'cluster', iterations = 60 } = {}) {
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

  // Phase 2: optionally relax the cluster seed into an organic force-directed graph.
  let positions = posById;
  if (mode === 'force' && nodes.length >= 3 && nodes.length <= FORCE_MAX_NODES) {
    positions = forceRefine(nodes, connections, { width, height, padding, iterations });
  }

  const links = [];
  const seen = new Set();
  connections.forEach((c, i) => {
    const pa = positions.get(c.a);
    const pb = positions.get(c.b);
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
