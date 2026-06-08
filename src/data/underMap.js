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

/** Chapter number from a case number like "003B" -> 3 (null if unparseable). */
const chapterOf = (caseNumber) => {
  const n = parseInt(String(caseNumber || '').slice(0, 3), 10);
  return Number.isFinite(n) ? n : null;
};

/** Stable [0,1) hash of a string (FNV-1a-ish) for deterministic positioning. */
const hash01 = (str, salt = 0) => {
  let h = (2166136261 ^ salt) >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
};

/**
 * A fragment's PERSISTENT position on the map (normalized 0..1), assigned once
 * at creation and never moved — so the Under-Map reads as a stable place that
 * GROWS rather than reflowing every render. Chapters fan outward in rings (the
 * hidden world drawing itself from a core), with the angle seeded by the id.
 */
const assignPosition = (id, caseNumber) => {
  const chapter = chapterOf(caseNumber) || 1;
  const angle = hash01(id, 1) * Math.PI * 2;
  const ringBase = Math.min(0.42, 0.12 + (chapter - 1) * 0.045);
  const r = Math.max(0.06, ringBase + (hash01(id, 2) - 0.5) * 0.07);
  return { nx: 0.5 + r * Math.cos(angle), ny: 0.5 + r * Math.sin(angle), chapter };
};

export const createBlankUnderMap = () => ({
  fragments: [],     // { id, label, kind, detail, anomalous, caseNumber, chapter, discoveredAt }
  relations: [],     // { id, a, b, revelation, falseReadings } — discoverable truth (a/b are fragment ids)
  connections: [],   // { a, b, relationId, at, unresolvedReading } — player-made links
  nodes: [],         // { id, label, revelation, at, unresolvedReading } — revealed Under-Map nodes
  theories: [],      // { chapter, fragmentIds, interpretation, rejected, correct, at }
  // "The Other Reader" (the road not taken): a single evolving foil born from the
  // interpretation the player REJECTED at each C-beat. `presence` accrues as the
  // player's beliefs are subverted (the foil's worldview gaining ground in Ashport)
  // and recedes as they hold true. null until a belief is sealed with a rejected
  // reading. The Station-Eleven "Prophet" mirror — the same signs, read the other way.
  foil: null,        // { belief, fromChapter, presence, name }
  // CONNECT-as-deduction streak: consecutive descents mapped without a wrong probe.
  flawlessStreak: 0,
  bestFlawlessStreak: 0,
  // Daily on-ramp (§8.1): the fragment that "drifted to the surface" today + the
  // days-mapped streak.
  dailyStir: null,        // { date:'YYYY-MM-DD', fragmentId, resolved }
  dailyStreak: 0,
  bestDailyStreak: 0,
  lastDailyResolved: null, // 'YYYY-MM-DD'
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
    foil: map.foil && typeof map.foil === 'object' ? map.foil : null,
    flawlessStreak: Number.isFinite(map.flawlessStreak) ? map.flawlessStreak : 0,
    bestFlawlessStreak: Number.isFinite(map.bestFlawlessStreak) ? map.bestFlawlessStreak : 0,
    dailyStir: map.dailyStir && typeof map.dailyStir === 'object' ? map.dailyStir : null,
    dailyStreak: Number.isFinite(map.dailyStreak) ? map.dailyStreak : 0,
    bestDailyStreak: Number.isFinite(map.bestDailyStreak) ? map.bestDailyStreak : 0,
    lastDailyResolved: map.lastDailyResolved || null,
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
  const id = fragmentId(k, label);
  return {
    id,
    label: String(label || '').trim(),
    kind: k,
    // Persistent map position (assigned once; never moves). See assignPosition.
    pos: assignPosition(id, caseNumber),
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
  const byNorm = new Map(m.fragments.map((f) => [norm(f.label), f.id]));
  const bySlug = new Map(m.fragments.map((f) => [slug(f.label), f.id]));
  // Resolve a relation's label to a fragment id, tolerant of the model's wording
  // drift: exact (normalized) -> slug -> fuzzy contains. This recovers many
  // relations that would otherwise silently fail to resolve (the #1 cause of a
  // CONNECT beat having "nothing to link").
  const resolveLabel = (label) => {
    if (!label) return null;
    const n = norm(label);
    if (byNorm.has(n)) return byNorm.get(n);
    const s = slug(label);
    if (bySlug.has(s)) return bySlug.get(s);
    if (n.length >= 4) {
      const hit = m.fragments.find((f) => {
        const fn = norm(f.label);
        return fn.length >= 4 && (fn.includes(n) || n.includes(fn));
      });
      if (hit) return hit.id;
    }
    return null;
  };
  const have = new Set(m.relations.map((r) => relationKey(r.a, r.b)));
  const next = [...m.relations];
  (Array.isArray(relations) ? relations : []).forEach((raw, idx) => {
    if (!raw) return;
    const aId = raw.a || resolveLabel(raw.aLabel);
    const bId = raw.b || resolveLabel(raw.bLabel);
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
  const connections = [
    { a: aId, b: bId, relationId: relation.id, at: now, unresolvedReading: !correctReading, scope: node.scope },
    ...m.connections,
  ];
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

// The Other Reader's presence is bounded so no single run of luck pins the foil
// at an extreme — it stays a dial the late game can read, not a binary flag.
export const FOIL_PRESENCE_MIN = -3;
export const FOIL_PRESENCE_MAX = 3;
const clampPresence = (n) =>
  Math.max(FOIL_PRESENCE_MIN, Math.min(FOIL_PRESENCE_MAX, Number.isFinite(n) ? n : 0));

export const recordTheory = (map, theory) => {
  const m = normalizeUnderMap(map);
  if (!theory || !Array.isArray(theory.fragmentIds) || theory.fragmentIds.length === 0) return m;
  // The strongest reading the player turned away from becomes the foil's creed.
  // `presence` persists across C-beats (one evolving antagonist, not one per chapter).
  const rejected = cleanFalseReadings(theory.rejected);
  const foilBelief = rejected[0] || null;
  const nextFoil = foilBelief
    ? {
        belief: foilBelief,
        fromChapter: theory.chapter ?? null,
        presence: m.foil ? clampPresence(m.foil.presence) : 0,
        name: (m.foil && m.foil.name) || null,
      }
    : m.foil;
  return {
    ...m,
    foil: nextFoil,
    theories: [
      {
        chapter: theory.chapter ?? null,
        fragmentIds: theory.fragmentIds,
        interpretation: String(theory.interpretation || '').trim(),
        rejected,
        correct: theory.correct != null ? !!theory.correct : null,
        at: new Date().toISOString(),
      },
      ...m.theories,
    ],
  };
};

/**
 * Pin The Other Reader's name once the story names them (presence >= 2). Idempotent:
 * a no-op if there is no foil, the name is empty, or the foil is already named — so
 * the identity stays fixed across chapters once set.
 */
export const nameFoil = (map, name) => {
  const m = normalizeUnderMap(map);
  const clean = String(name || '').trim();
  if (!m.foil || !clean || m.foil.name) return m;
  return { ...m, foil: { ...m.foil, name: clean } };
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
  if (!changed) return m;
  // The Other Reader gains ground when the player's reading is subverted (the city
  // bends toward the road they didn't take) and recedes when it holds true. No foil
  // yet (the player never turned a reading away) => nothing to move.
  let foil = m.foil;
  if (foil) {
    foil = { ...foil, presence: clampPresence((foil.presence || 0) + (correct ? -1 : 1)) };
  }
  return { ...m, theories, foil };
};

// ---- Daily on-ramp (§8.1) -------------------------------------------------

const dayKey = (iso) => String(iso || '').slice(0, 10); // 'YYYY-MM-DD'
const dayDiff = (a, b) => {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null;
  return Math.round((tb - ta) / 86400000);
};

/**
 * Draw the day's "stir": one already-collected fragment drifts to the surface
 * (preferring recurring motifs so the daily deepens the campaign map). Idempotent
 * per day. Pure given `rng`. No-op if the player has collected nothing yet.
 */
export const drawDailyStir = (map, nowIso = new Date().toISOString(), rng = Math.random) => {
  const m = normalizeUnderMap(map);
  const today = dayKey(nowIso);
  if (m.dailyStir && m.dailyStir.date === today) return m; // already stirred today
  if (!m.fragments.length) return m;
  const motifs = m.fragments.filter((f) => (f.seen || 1) > 1);
  const pool = motifs.length ? motifs : m.fragments;
  const pick = pool[Math.floor(rng() * pool.length) % pool.length];
  return { ...m, dailyStir: { date: today, fragmentId: pick.id, resolved: false } };
};

/**
 * Resolve today's stir (e.g. when the daily puzzle is completed): deepen the
 * drifting fragment and advance the days-mapped streak (consecutive days; a
 * missed day softly resets to 1). Idempotent once resolved.
 */
export const resolveDailyStir = (map, nowIso = new Date().toISOString()) => {
  const m = normalizeUnderMap(map);
  const today = dayKey(nowIso);
  const stir = m.dailyStir;
  if (!stir || stir.date !== today || stir.resolved) return m;
  const streak = m.lastDailyResolved && dayDiff(m.lastDailyResolved, today) === 1
    ? (m.dailyStreak || 0) + 1
    : 1;
  const fragments = m.fragments.map((f) =>
    f.id === stir.fragmentId ? { ...f, seen: (f.seen || 1) + 1, lastSeenAt: new Date().toISOString() } : f,
  );
  return {
    ...m,
    fragments,
    dailyStir: { ...stir, resolved: true },
    dailyStreak: streak,
    bestDailyStreak: Math.max(m.bestDailyStreak || 0, streak),
    lastDailyResolved: today,
  };
};

export const dailyStir = (map) => normalizeUnderMap(map).dailyStir || null;
export const dailyStreak = (map) => normalizeUnderMap(map).dailyStreak || 0;
/** The fragment object that drifted to the surface today (null if none / unresolved-source missing). */
export const dailyStirFragment = (map) => {
  const m = normalizeUnderMap(map);
  if (!m.dailyStir) return null;
  return m.fragments.find((f) => f.id === m.dailyStir.fragmentId) || null;
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

/** The Other Reader, or null if the player has never turned a reading away. */
export const foil = (map) => normalizeUnderMap(map).foil || null;

/** How present the foil's worldview has become (FOIL_PRESENCE_MIN..MAX; 0 if none). */
export const foilPresence = (map) => {
  const f = normalizeUnderMap(map).foil;
  return f ? clampPresence(f.presence) : 0;
};

/**
 * Whether the foil has grown into a felt presence in Ashport — the threshold at
 * which generation/UI should give the road-not-taken a face. Tunable.
 */
export const foilIsManifest = (map) => foilPresence(map) >= 2;

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
