/**
 * The Under-Map — the connective spine of the redesigned game.
 *
 * The player examines scenes to collect *fragments* (symbols, places, people,
 * phenomena), then connects them on the Under-Map. A connection that matches a
 * *relation* the story has established reveals a *node* — a piece of the hidden
 * world drawing itself in. At chapter climaxes the player commits a *theory*
 * that steers what comes next.
 *
 * Pure data + pure helpers (no React, no I/O) so it's trivially testable and
 * safe to import anywhere. Everything is immutable: helpers return a new map.
 */

export const FRAGMENT_KIND = {
  SYMBOL: 'symbol',
  PLACE: 'place',
  PERSON: 'person',
  PHENOMENON: 'phenomenon',
};

const KIND_SET = new Set(Object.values(FRAGMENT_KIND));

const MAX_FRAGMENTS = 120;
const MAX_NODES = 60;

const slug = (v, fb = 'x') =>
  String(v || fb).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || fb;

/** Stable fragment id from kind + label so the same discovery is never double-pinned. */
export const fragmentId = (kind, label) => `frag_${slug(kind, 'x')}_${slug(label)}`;
const norm = (v) => String(v || '').trim().toLowerCase();
/** A relation is undirected; key it order-independently. */
const relationKey = (aId, bId) => [aId, bId].sort().join('::');

export const createBlankUnderMap = () => ({
  fragments: [],     // { id, label, kind, detail, anomalous, caseNumber, chapter, discoveredAt }
  relations: [],     // { id, a, b, revelation } — discoverable truth (a/b are fragment ids)
  connections: [],   // { a, b, relationId, at } — player-made correct links
  nodes: [],         // { id, label, revelation, at } — revealed Under-Map nodes
  theories: [],      // { chapter, fragmentIds, interpretation, correct, at }
  lastVisitedAt: null,
});

export const normalizeUnderMap = (map) => {
  const base = createBlankUnderMap();
  if (!map || typeof map !== 'object') return base;
  return {
    ...base,
    ...map,
    fragments: Array.isArray(map.fragments) ? map.fragments : [],
    relations: Array.isArray(map.relations) ? map.relations : [],
    connections: Array.isArray(map.connections) ? map.connections : [],
    nodes: Array.isArray(map.nodes) ? map.nodes : [],
    theories: Array.isArray(map.theories) ? map.theories : [],
  };
};

export const makeFragment = ({ label, kind, detail = '', anomalous = true, caseNumber = null, chapter = null }) => {
  const k = KIND_SET.has(kind) ? kind : FRAGMENT_KIND.PHENOMENON;
  return {
    id: fragmentId(k, label),
    label: String(label || '').trim(),
    kind: k,
    detail: String(detail || '').trim(),
    anomalous: !!anomalous,
    caseNumber,
    chapter,
    discoveredAt: new Date().toISOString(),
  };
};

/** Add collected fragments (idempotent by id). Newest first. */
export const addFragments = (map, fragments = []) => {
  const m = normalizeUnderMap(map);
  const have = new Set(m.fragments.map((f) => f.id));
  const incoming = [];
  (Array.isArray(fragments) ? fragments : []).forEach((raw) => {
    if (!raw || !raw.label) return;
    const f = raw.id ? raw : makeFragment(raw);
    if (have.has(f.id)) return;
    have.add(f.id);
    incoming.push(f);
  });
  if (!incoming.length) return m;
  return { ...m, fragments: [...incoming, ...m.fragments].slice(0, MAX_FRAGMENTS) };
};

/**
 * Add the story's relations (the discoverable connection truth). The LLM emits
 * relations by label; resolve them to fragment ids. Dedup by undirected key.
 */
export const addRelations = (map, relations = [], { caseNumber = null } = {}) => {
  const m = normalizeUnderMap(map);
  const byLabel = new Map(m.fragments.map((f) => [norm(f.label), f.id]));
  const have = new Set(m.relations.map((r) => relationKey(r.a, r.b)));
  const next = [...m.relations];
  (Array.isArray(relations) ? relations : []).forEach((raw, idx) => {
    if (!raw) return;
    const aId = raw.a || byLabel.get(norm(raw.aLabel));
    const bId = raw.b || byLabel.get(norm(raw.bLabel));
    const revelation = String(raw.revelation || '').trim();
    if (!aId || !bId || aId === bId || !revelation) return;
    const key = relationKey(aId, bId);
    if (have.has(key)) return;
    have.add(key);
    next.push({ id: raw.id || `rel_${slug(caseNumber || 'x')}_${idx}_${slug(revelation).slice(0, 24)}`, a: aId, b: bId, revelation });
  });
  if (next.length === m.relations.length) return m;
  return { ...m, relations: next };
};

/**
 * Attempt to connect two fragments.
 * Returns { map, revealed: { node } | null, alreadyConnected, valid }.
 * A valid connection matches a known relation; it reveals a node (once).
 */
export const connectFragments = (map, aId, bId) => {
  const m = normalizeUnderMap(map);
  if (!aId || !bId || aId === bId) return { map: m, revealed: null, alreadyConnected: false, valid: false };
  const key = relationKey(aId, bId);
  if (m.connections.some((c) => relationKey(c.a, c.b) === key)) {
    return { map: m, revealed: null, alreadyConnected: true, valid: true };
  }
  const relation = m.relations.find((r) => relationKey(r.a, r.b) === key);
  if (!relation) {
    // Inconclusive — not punishing, just no reveal.
    return { map: m, revealed: null, alreadyConnected: false, valid: false };
  }
  const node = {
    id: `node_${relation.id}`,
    label: relation.revelation,
    revelation: relation.revelation,
    at: new Date().toISOString(),
  };
  const nodes = m.nodes.some((n) => n.id === node.id) ? m.nodes : [node, ...m.nodes].slice(0, MAX_NODES);
  const connections = [{ a: aId, b: bId, relationId: relation.id, at: node.at }, ...m.connections];
  return { map: { ...m, connections, nodes }, revealed: { node }, alreadyConnected: false, valid: true };
};

export const recordTheory = (map, theory) => {
  const m = normalizeUnderMap(map);
  if (!theory || !Array.isArray(theory.fragmentIds) || theory.fragmentIds.length === 0) return m;
  return {
    ...m,
    theories: [
      {
        chapter: theory.chapter ?? null,
        fragmentIds: theory.fragmentIds,
        interpretation: String(theory.interpretation || '').trim(),
        correct: theory.correct != null ? !!theory.correct : null,
        at: new Date().toISOString(),
      },
      ...m.theories,
    ],
  };
};

export const touchUnderMap = (map) => ({ ...normalizeUnderMap(map), lastVisitedAt: new Date().toISOString() });

// ---- selectors -----------------------------------------------------------

export const fragmentCount = (map) => normalizeUnderMap(map).fragments.length;
export const revealedNodeCount = (map) => normalizeUnderMap(map).nodes.length;
export const fragmentById = (map, id) => normalizeUnderMap(map).fragments.find((f) => f.id === id) || null;
export const areConnected = (map, aId, bId) => {
  const key = relationKey(aId, bId);
  return normalizeUnderMap(map).connections.some((c) => relationKey(c.a, c.b) === key);
};
/** How many discoverable connections remain unmade — drives the "there's more" pull. */
export const undiscoveredRelationCount = (map) => {
  const m = normalizeUnderMap(map);
  const made = new Set(m.connections.map((c) => relationKey(c.a, c.b)));
  return m.relations.filter((r) => !made.has(relationKey(r.a, r.b))).length;
};
export const latestNode = (map) => normalizeUnderMap(map).nodes[0] || null;
