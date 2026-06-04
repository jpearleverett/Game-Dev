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

// CONNECT-as-deduction tuning (see docs/undermap_redesign.md §3.1).
// Probe budget = base + one extra per N "connectable" fragments, so it scales
// with how much there is to find, never with noise.
export const PROBE_BASE = 3;
export const PROBE_PER_FRAGMENTS = 3;

// KEYSTONE tuning (Move 5, see docs §6): a fragment becomes a Keystone once it
// has recurred enough AND spanned enough chapters — rewarding cross-chapter
// pattern recognition, not within-chapter repetition.
export const KEYSTONE_SEEN = 3;
export const KEYSTONE_MIN_CHAPTER_SPAN = 2;

const slug = (v, fb = 'x') =>
  String(v || fb).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || fb;

/** Stable fragment id from kind + label so the same discovery is never double-pinned. */
export const fragmentId = (kind, label) => `frag_${slug(kind, 'x')}_${slug(label)}`;
const norm = (v) => String(v || '').trim().toLowerCase();
/** A relation is undirected; key it order-independently. */
const relationKey = (aId, bId) => [aId, bId].sort().join('::');

export const createBlankUnderMap = () => ({
  fragments: [],     // { id, label, kind, detail, anomalous, caseNumber, chapter, discoveredAt }
  relations: [],     // { id, a, b, revelation, falseReadings } — discoverable truth (a/b are fragment ids)
  connections: [],   // { a, b, relationId, at, unresolvedReading } — player-made links
  nodes: [],         // { id, label, revelation, at, unresolvedReading } — revealed Under-Map nodes
  theories: [],      // { chapter, fragmentIds, interpretation, correct, at }
  // CONNECT-as-deduction streak: consecutive descents mapped without a wrong probe.
  flawlessStreak: 0,
  bestFlawlessStreak: 0,
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
    flawlessStreak: Number.isFinite(map.flawlessStreak) ? map.flawlessStreak : 0,
    bestFlawlessStreak: Number.isFinite(map.bestFlawlessStreak) ? map.bestFlawlessStreak : 0,
  };
};

/** Two tempting-but-FALSE readings the model authors per relation (for choose-the-truth). */
const cleanFalseReadings = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .slice(0, 2);

export const makeFragment = ({ label, kind, detail = '', anomalous = true, caseNumber = null, chapter = null }) => {
  const k = KIND_SET.has(kind) ? kind : FRAGMENT_KIND.PHENOMENON;
  const now = new Date().toISOString();
  return {
    id: fragmentId(k, label),
    label: String(label || '').trim(),
    kind: k,
    detail: String(detail || '').trim(),
    anomalous: !!anomalous,
    caseNumber,
    chapter,
    // MOTIF tracking: how many times this anomaly has re-surfaced across scenes.
    seen: 1,
    firstCaseNumber: caseNumber,
    lastCaseNumber: caseNumber,
    discoveredAt: now,
    lastSeenAt: now,
  };
};

/**
 * Add collected fragments. New fragments are prepended (newest-first). A fragment
 * whose id already exists is a RECURRING MOTIF: instead of being dropped, it
 * DEEPENS the existing one (bumps `seen`, updates lastCaseNumber/lastSeenAt, and
 * fills in a detail if it had none). This is what lets anomalies thread through
 * the story and gain meaning over chapters.
 */
export const addFragments = (map, fragments = []) => {
  const m = normalizeUnderMap(map);
  const byId = new Map(m.fragments.map((f) => [f.id, f]));
  const incoming = [];
  let changed = false;
  (Array.isArray(fragments) ? fragments : []).forEach((raw) => {
    if (!raw || !raw.label) return;
    const f = raw.id ? raw : makeFragment(raw);
    const existing = byId.get(f.id);
    if (existing) {
      byId.set(f.id, {
        ...existing,
        seen: (existing.seen || 1) + 1,
        lastCaseNumber: f.caseNumber || f.lastCaseNumber || existing.lastCaseNumber || existing.caseNumber || null,
        lastSeenAt: new Date().toISOString(),
        detail: existing.detail || f.detail || '',
      });
      changed = true;
      return;
    }
    byId.set(f.id, f);
    incoming.push(f);
    changed = true;
  });
  if (!changed) return m;
  // Keep existing order (with deepened updates applied), prepend the brand-new ones.
  const updatedExisting = m.fragments.map((f) => byId.get(f.id) || f);
  return { ...m, fragments: [...incoming, ...updatedExisting].slice(0, MAX_FRAGMENTS) };
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
    next.push({
      id: raw.id || `rel_${slug(caseNumber || 'x')}_${idx}_${slug(revelation).slice(0, 24)}`,
      a: aId,
      b: bId,
      revelation,
      falseReadings: cleanFalseReadings(raw.falseReadings),
      // 'arc' relations reveal an arc-level truth (bigger than a chapter node).
      scope: raw.scope === 'arc' ? 'arc' : 'chapter',
    });
  });
  if (next.length === m.relations.length) return m;
  return { ...m, relations: next };
};

/**
 * STEP 1 of the deduction — probe a pair WITHOUT mutating the map.
 * Tells the caller whether a relation exists between the two fragments and, if
 * so, surfaces the candidate readings (the true revelation + the model's false
 * readings) for the player to choose from. A probe that finds no relation is a
 * "wrong probe" (the caller spends a probe); a probe that finds one is free.
 *
 * Returns { valid, relation|null, alreadyConnected, unresolvedReading, readings|null }.
 * `readings` is { correct, options } with `options` DETERMINISTIC (correct first)
 * so this stays pure/testable — the UI shuffles for display via readingChoices().
 */
export const senseConnection = (map, aId, bId) => {
  const m = normalizeUnderMap(map);
  if (!aId || !bId || aId === bId) {
    return { valid: false, relation: null, alreadyConnected: false, unresolvedReading: false, readings: null };
  }
  const key = relationKey(aId, bId);
  const relation = m.relations.find((r) => relationKey(r.a, r.b) === key) || null;
  if (!relation) {
    return { valid: false, relation: null, alreadyConnected: false, unresolvedReading: false, readings: null };
  }
  const existing = m.connections.find((c) => relationKey(c.a, c.b) === key) || null;
  return {
    valid: true,
    relation,
    alreadyConnected: !!existing,
    unresolvedReading: !!existing?.unresolvedReading,
    readings: { correct: relation.revelation, options: [relation.revelation, ...(relation.falseReadings || [])] },
  };
};

/**
 * STEP 2 of the deduction — commit a connection with the player's chosen reading.
 * `chosenRevelation` is the interpretation the player picked; omit it (or pass
 * null) to auto-commit the true reading (used by the back-compat connectFragments).
 *
 * A correct reading reveals the node fully. A WRONG reading still draws the
 * connection (progress is never lost) but flags the node `unresolvedReading`
 * (blurred — nudges a re-read) until the player resolves it correctly later.
 *
 * Returns { map, valid, node|null, revealed:{node}|null, alreadyConnected, correctReading, upgraded }.
 */
export const resolveReading = (map, aId, bId, chosenRevelation = null) => {
  const m = normalizeUnderMap(map);
  const miss = { map: m, valid: false, node: null, revealed: null, alreadyConnected: false, correctReading: false, upgraded: false };
  if (!aId || !bId || aId === bId) return miss;
  const key = relationKey(aId, bId);
  const relation = m.relations.find((r) => relationKey(r.a, r.b) === key);
  if (!relation) return miss;

  // No explicit choice → treat as correct (auto-resolve). Otherwise compare.
  const correctReading = chosenRevelation == null ? true : norm(chosenRevelation) === norm(relation.revelation);
  const nodeId = `node_${relation.id}`;
  const now = new Date().toISOString();
  const existingNode = m.nodes.find((n) => n.id === nodeId) || null;
  const existingConn = m.connections.find((c) => relationKey(c.a, c.b) === key) || null;

  if (existingConn) {
    // Already drawn. A correct reading can UPGRADE a previously-blurred node.
    if (correctReading && existingNode?.unresolvedReading) {
      const nodes = m.nodes.map((n) => (n.id === nodeId ? { ...n, unresolvedReading: false } : n));
      const connections = m.connections.map((c) =>
        relationKey(c.a, c.b) === key ? { ...c, unresolvedReading: false } : c,
      );
      const upgraded = { ...existingNode, unresolvedReading: false };
      return { map: { ...m, nodes, connections }, valid: true, node: upgraded, revealed: null, alreadyConnected: true, correctReading: true, upgraded: true };
    }
    return { map: m, valid: true, node: existingNode, revealed: null, alreadyConnected: true, correctReading, upgraded: false };
  }

  const node = {
    id: nodeId,
    label: relation.revelation,
    revelation: relation.revelation,
    unresolvedReading: !correctReading,
    scope: relation.scope === 'arc' ? 'arc' : 'chapter',
    at: now,
  };
  const nodes = existingNode ? m.nodes : [node, ...m.nodes].slice(0, MAX_NODES);
  const connections = [{ a: aId, b: bId, relationId: relation.id, at: now, unresolvedReading: !correctReading }, ...m.connections];
  return { map: { ...m, connections, nodes }, valid: true, node, revealed: { node }, alreadyConnected: false, correctReading, upgraded: false };
};

/**
 * Back-compat one-shot connect: sense + auto-resolve the TRUE reading.
 * Returns the legacy shape { map, revealed:{node}|null, alreadyConnected, valid }.
 * New callers should use senseConnection + resolveReading for the deduction flow.
 */
export const connectFragments = (map, aId, bId) => {
  const res = resolveReading(map, aId, bId, null);
  return {
    map: res.map,
    revealed: res.alreadyConnected ? null : res.revealed,
    alreadyConnected: !!res.alreadyConnected,
    valid: !!res.valid,
  };
};

/** Shuffle a relation's reading options for display (pure given an rng). */
export const readingChoices = (readings, rng = Math.random) => {
  const options = Array.isArray(readings?.options) ? [...readings.options] : [];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
};

/**
 * Record the outcome of a descent for the flawless-mapping streak. A descent
 * with any wrong probe resets the streak (soft sting); a clean one extends it.
 */
export const recordDescent = (map, { hadMisstep = false } = {}) => {
  const m = normalizeUnderMap(map);
  const flawlessStreak = hadMisstep ? 0 : (m.flawlessStreak || 0) + 1;
  const bestFlawlessStreak = Math.max(m.bestFlawlessStreak || 0, flawlessStreak);
  return { ...m, flawlessStreak, bestFlawlessStreak };
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

/**
 * Resolve a sealed belief once the story bears it out (Move 3). Marks the named
 * chapter's still-unresolved theory correct/incorrect — wrong beliefs are NOT a
 * fail-state, they just steer the player down the clarity spectrum.
 */
export const resolveTheory = (map, chapter, correct) => {
  const m = normalizeUnderMap(map);
  let changed = false;
  const theories = m.theories.map((t) => {
    if (t.chapter === chapter && t.correct == null) {
      changed = true;
      return { ...t, correct: !!correct };
    }
    return t;
  });
  return changed ? { ...m, theories } : m;
};

export const touchUnderMap = (map) => ({ ...normalizeUnderMap(map), lastVisitedAt: new Date().toISOString() });

// ---- Clarity / Worldview & ending spectrum (Move 3, see docs §5) ----------

export const CLARITY_TRUE = 0.66;    // >= -> the Clear-Eyed ("true") ending
export const CLARITY_PARTIAL = 0.33; // >= -> Half-Blind; below -> Deceived

/**
 * How truly the player sees the Under-Map: the share of their RESOLVED beliefs
 * that proved correct. Returns { resolved, correct, ratio }.
 */
export const clarity = (map) => {
  const m = normalizeUnderMap(map);
  const resolved = m.theories.filter((t) => t.correct != null);
  const correct = resolved.filter((t) => t.correct).length;
  return { resolved: resolved.length, correct, ratio: resolved.length ? correct / resolved.length : 0 };
};

/**
 * The ending variant the player's accumulated clarity steers toward. The
 * specific terminal scene within a variant is further colored by final-act
 * belief flavor (wired at the endgame). 'unproven' until any belief resolves.
 */
export const endingVariant = (map) => {
  const { resolved, ratio } = clarity(map);
  if (!resolved) return 'unproven';
  if (ratio >= CLARITY_TRUE) return 'clear';
  if (ratio >= CLARITY_PARTIAL) return 'half';
  return 'deceived';
};

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

/** The relations still unmade — "sensed" links the player can still draw (drives the assist pulse). */
export const sensedRelations = (map) => {
  const m = normalizeUnderMap(map);
  const made = new Set(m.connections.map((c) => relationKey(c.a, c.b)));
  return m.relations.filter((r) => !made.has(relationKey(r.a, r.b)));
};

/** Distinct fragments that participate in at least one still-unfound relation. */
export const connectableFragmentCount = (map) => {
  const ids = new Set();
  sensedRelations(map).forEach((r) => { ids.add(r.a); ids.add(r.b); });
  return ids.size;
};

/** Probe budget for a descent: base + one per N connectable fragments (see §3.1). */
export const probeBudgetFor = (map) =>
  PROBE_BASE + Math.floor(connectableFragmentCount(map) / PROBE_PER_FRAGMENTS);

/** Connections drawn but whose meaning the player hasn't yet read correctly (blurred nodes). */
export const unresolvedReadingCount = (map) =>
  normalizeUnderMap(map).nodes.filter((n) => n.unresolvedReading).length;

export const flawlessStreak = (map) => normalizeUnderMap(map).flawlessStreak || 0;
export const bestFlawlessStreak = (map) => normalizeUnderMap(map).bestFlawlessStreak || 0;
export const latestNode = (map) => normalizeUnderMap(map).nodes[0] || null;

/** A fragment is a MOTIF once it has re-surfaced more than once. */
export const isMotif = (fragment) => !!fragment && (fragment.seen || 1) > 1;
/** How many collected fragments have become recurring motifs. */
export const motifCount = (map) => normalizeUnderMap(map).fragments.filter(isMotif).length;

/** Chapter number from a case number like "003B" -> 3 (null if unparseable). */
const chapterOf = (caseNumber) => {
  const n = parseInt(String(caseNumber || '').slice(0, 3), 10);
  return Number.isFinite(n) ? n : null;
};

/**
 * A KEYSTONE is a motif that has recurred enough (`seen >= KEYSTONE_SEEN`) AND
 * spanned enough chapters (>= KEYSTONE_MIN_CHAPTER_SPAN) — so within-chapter
 * repetition alone never qualifies. Connecting keystones tends to surface
 * arc-level truths (the long-game payoff for cross-chapter attention).
 */
export const isKeystone = (fragment) => {
  if (!fragment || (fragment.seen || 1) < KEYSTONE_SEEN) return false;
  const a = chapterOf(fragment.firstCaseNumber);
  const b = chapterOf(fragment.lastCaseNumber);
  if (a == null || b == null) return false;
  return Math.abs(b - a) + 1 >= KEYSTONE_MIN_CHAPTER_SPAN;
};
export const keystoneCount = (map) => normalizeUnderMap(map).fragments.filter(isKeystone).length;
/** How many revealed nodes are arc-level truths. */
export const arcNodeCount = (map) =>
  normalizeUnderMap(map).nodes.filter((n) => n.scope === 'arc').length;

/**
 * How "deep" the hidden world has been mapped: the share of discoverable
 * connections the player has actually drawn (0..1). Drives the "the map is taking
 * shape" progression. Returns { drawn, total, ratio }.
 */
export const mapDepth = (map) => {
  const m = normalizeUnderMap(map);
  const made = new Set(m.connections.map((c) => relationKey(c.a, c.b)));
  const total = new Set(m.relations.map((r) => relationKey(r.a, r.b))).size;
  const drawn = m.relations.filter((r) => made.has(relationKey(r.a, r.b))).length;
  return { drawn, total, ratio: total > 0 ? Math.min(1, drawn / total) : 0 };
};
