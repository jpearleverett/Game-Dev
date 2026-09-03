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
// with how much there is to find, never with noise. Base is deliberately TIGHT
// (misses always whisper, so few probes still play fair) — scarcity is the
// tension engine; the daily-stir bonus is meant to be coveted.
export const PROBE_BASE = 2;
export const PROBE_PER_FRAGMENTS = 3;

// Latent (dangling) threads: relations authored with an endpoint the player
// does not hold yet. They wait here and auto-promote to real relations the
// moment the missing fragment is collected — the mechanical open loop that
// pulls the player into the next scene. Capped so they stay a hunger, not a pile.
export const MAX_LATENT_RELATIONS = 12;

// KEYSTONE tuning (Move 5, see docs §6): a fragment becomes a Keystone once it
// has recurred enough AND spanned enough chapters — rewarding cross-chapter
// pattern recognition, not within-chapter repetition.
export const KEYSTONE_SEEN = 3;
export const KEYSTONE_MIN_CHAPTER_SPAN = 2;

// SENSE TIERS: Jack's feel for the Under-Map sharpens as he maps it. Tiers are
// earned by TRUTHS DRAWN (total connections made across the campaign) so the
// power curve tracks real mastery, not board size. Each tier unlocks a felt
// ability on the CONNECT board:
//   tier 1 — ATTUNED: holding a fragment makes its still-hidden partners glimmer.
//   tier 2 — THE MAP REMEMBERS: a missed probe involving a motif costs nothing.
//   tier 3 — DEEPSIGHT: the first missed probe of each descent is forgiven.
export const SENSE_TIER_THRESHOLDS = [3, 8, 15];

// Daily-stir reward: resolving the day's thread banks bonus probes for the next
// gated descent (capped so it stays a nudge, not a stockpile).
export const MAX_PROBE_BONUS = 2;

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
  // Dangling threads: authored relations waiting on a fragment the player does
  // not hold yet ({ aLabel, bLabel, revelation, falseReadings, scope, caseNumber, at }).
  // Promoted to real relations automatically as fragments arrive.
  latentRelations: [],
  connections: [],   // { a, b, relationId, at, unresolvedReading, foilClaimed? } — player-made links
  nodes: [],         // { id, label, revelation, at, unresolvedReading, foilClaimed?, foilReading? } — revealed Under-Map nodes
  theories: [],      // { chapter, fragmentIds, interpretation, rejected, correct, grounded, at }
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
  // Bonus probes banked by resolving the daily stir; spent (zeroed) by the next
  // gated descent. This is the one mechanical thread from the daily loop into
  // the campaign economy.
  pendingProbeBonus: 0,
  // FOIL INCURSION: the chapter in which The Other Reader last claimed a thread
  // on the board (one claim max per chapter, at presence >= 2).
  lastFoilClaimChapter: null,
  // Per-descent economy for the gated CONNECT beat, persisted so leaving to
  // re-read the scene (which the game explicitly invites) does not refund the
  // probes, clear the misstep flag, re-arm DEEPSIGHT forgiveness and unlock the
  // pairs the player just blurred. Reset when the gate moves to a new case.
  descent: null,
  lastVisitedAt: null,
});

/**
 * True when a map already satisfies every shape guarantee normalizeUnderMap
 * makes, so normalizing it can return it unchanged.
 *
 * This matters for identity, not speed. normalizeUnderMap used to build a fresh
 * object every time, so every helper's no-op path returned a NEW map, and every
 * caller's `if (next === current.underMap) return null;` guard was unreachable.
 * Re-tapping a phrase already collected, a probe that matched nothing, a foil
 * claim that found nothing to claim: each still wrote a new campaign object,
 * re-rendered every screen subscribed to the game context and re-persisted the
 * whole progress blob.
 */
const isNormalizedUnderMap = (map) => (
  !!map
  && typeof map === 'object'
  && Array.isArray(map.fragments)
  && Array.isArray(map.relations)
  && Array.isArray(map.latentRelations)
  && Array.isArray(map.connections)
  && Array.isArray(map.nodes)
  && Array.isArray(map.theories)
  && (map.foil === null || (!!map.foil && typeof map.foil === 'object'))
  && Number.isFinite(map.flawlessStreak)
  && Number.isFinite(map.bestFlawlessStreak)
  && (map.dailyStir === null || (!!map.dailyStir && typeof map.dailyStir === 'object'))
  && Number.isFinite(map.dailyStreak)
  && Number.isFinite(map.bestDailyStreak)
  && (map.lastDailyResolved === null || typeof map.lastDailyResolved === 'string')
  && Number.isFinite(map.pendingProbeBonus)
  && map.pendingProbeBonus >= 0
  && map.pendingProbeBonus <= MAX_PROBE_BONUS
  && (map.lastFoilClaimChapter === null || Number.isFinite(map.lastFoilClaimChapter))
  && (map.descent === null || (!!map.descent && typeof map.descent === 'object'))
);

export const normalizeUnderMap = (map) => {
  if (isNormalizedUnderMap(map)) return map;
  const base = createBlankUnderMap();
  if (!map || typeof map !== 'object') return base;
  return {
    ...base,
    ...map,
    fragments: Array.isArray(map.fragments) ? map.fragments : [],
    relations: Array.isArray(map.relations) ? map.relations : [],
    latentRelations: Array.isArray(map.latentRelations) ? map.latentRelations : [],
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
    pendingProbeBonus: Number.isFinite(map.pendingProbeBonus)
      ? Math.max(0, Math.min(MAX_PROBE_BONUS, map.pendingProbeBonus))
      : 0,
    lastFoilClaimChapter: Number.isFinite(map.lastFoilClaimChapter) ? map.lastFoilClaimChapter : null,
    descent: map.descent && typeof map.descent === 'object' ? map.descent : null,
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
      const incomingCase = f.caseNumber || f.lastCaseNumber || null;
      const lastCase = existing.lastCaseNumber || existing.caseNumber || null;
      const sameScene = !!incomingCase && !!lastCase && incomingCase === lastCase;
      const nextDetail = existing.detail || f.detail || '';
      // A re-tap inside the same scene deepens nothing: same motif count, same
      // scene, no new detail. Rewriting lastSeenAt for it produced a new map on
      // every tap, which defeated every caller's no-op guard and re-persisted
      // the whole progress blob for nothing.
      if (sameScene && nextDetail === existing.detail) return;
      byId.set(f.id, {
        ...existing,
        seen: sameScene ? (existing.seen || 1) : (existing.seen || 1) + 1,
        lastCaseNumber: f.caseNumber || f.lastCaseNumber || existing.lastCaseNumber || existing.caseNumber || null,
        lastSeenAt: new Date().toISOString(),
        detail: nextDetail,
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
  const next = { ...m, fragments: capFragments([...incoming, ...updatedExisting], m) };
  // New fragments may be the missing endpoint of a dangling thread — promote.
  return incoming.length ? promoteLatentRelations(next) : next;
};

/**
 * Cap the board without breaking it.
 *
 * A flat `.slice(0, MAX_FRAGMENTS)` evicted oldest-first with no regard for what
 * the rest of the map points at, and nothing prunes relations: an evicted
 * endpoint left a relation that can never be drawn, so undiscoveredRelationCount
 * and mapDepth counted it forever. "CHAPTER MAPPED CLEAN" became unreachable,
 * depth could not reach 100%, and The Other Reader reported a permanent lead the
 * player had no way to close.
 *
 * So the cap is soft for load-bearing fragments: anything that is an endpoint of
 * a relation, a drawn connection, or a latent thread's resolved half stays.
 * Only inert fragments are evicted, oldest first.
 */
const capFragments = (fragments, map) => {
  if (fragments.length <= MAX_FRAGMENTS) return fragments;
  const protectedIds = new Set();
  (map.relations || []).forEach((r) => { protectedIds.add(r.a); protectedIds.add(r.b); });
  (map.connections || []).forEach((c) => { protectedIds.add(c.a); protectedIds.add(c.b); });
  let over = fragments.length - MAX_FRAGMENTS;
  const dropped = new Set();
  for (let i = fragments.length - 1; i >= 0 && over > 0; i -= 1) {
    const f = fragments[i];
    if (protectedIds.has(f.id)) continue;
    dropped.add(f.id);
    over -= 1;
  }
  return dropped.size ? fragments.filter((f) => !dropped.has(f.id)) : fragments;
};

/**
 * Label→id resolver shared by addRelations and latent-thread promotion. Tolerant
 * of the model's wording drift: exact (normalized) -> slug -> fuzzy contains.
 */
const makeLabelResolver = (fragments) => {
  // `fragments` is newest-first, and an id is kind + label, so the same label can
  // legitimately exist twice under different kinds ("The Seal" as a symbol in
  // chapter 1, as a place in chapter 4). Building these with `new Map(...map())`
  // let the LAST write win, i.e. the OLDEST fragment: a relation authored this
  // chapter resolved onto the chapter-1 star, so probing the pair the scene just
  // described MISSED and quietly spent a probe on a thread that really exists.
  // Keep the first (newest) entry for each key instead.
  const firstWins = (key) => {
    const out = new Map();
    fragments.forEach((f) => {
      const k = key(f.label);
      if (!out.has(k)) out.set(k, f.id);
    });
    return out;
  };
  const byNorm = firstWins(norm);
  const bySlug = firstWins(slug);
  return (label) => {
    if (!label) return null;
    const n = norm(label);
    if (byNorm.has(n)) return byNorm.get(n);
    const s = slug(label);
    if (bySlug.has(s)) return bySlug.get(s);
    if (n.length >= 4) {
      const hit = fragments.find((f) => {
        const fn = norm(f.label);
        return fn.length >= 4 && (fn.includes(n) || n.includes(fn));
      });
      if (hit) return hit.id;
    }
    return null;
  };
};

const latentKey = (aLabel, bLabel) => [norm(aLabel), norm(bLabel)].sort().join('::');

/**
 * Promote latent (dangling) threads whose endpoints can now BOTH be resolved
 * into real relations. Called whenever fragments or relations arrive. Pure.
 */
export const promoteLatentRelations = (map) => {
  const m = normalizeUnderMap(map);
  if (!m.latentRelations.length) return m;
  const resolveLabel = makeLabelResolver(m.fragments);
  const have = new Set(m.relations.map((r) => relationKey(r.a, r.b)));
  const promoted = [];
  const remaining = [];
  m.latentRelations.forEach((lat, idx) => {
    const aId = resolveLabel(lat.aLabel);
    const bId = resolveLabel(lat.bLabel);
    if (aId && bId) {
      // Both ends have arrived, so this thread is settled either way: it becomes
      // a relation, or it collapses (the two labels named one fragment, or the
      // pair is already connected). Retaining it would hold a capped slot
      // forever and keep telling the model to pay off a closed thread.
      const key = aId === bId ? null : relationKey(aId, bId);
      if (key && !have.has(key)) {
        have.add(key);
        promoted.push({
          id: `rel_${key}`,
          a: aId,
          b: bId,
          revelation: lat.revelation,
          falseReadings: cleanFalseReadings(lat.falseReadings),
          scope: lat.scope === 'arc' ? 'arc' : 'chapter',
        });
      }
      return; // resolved (or duplicate) — drop from latents either way
    }
    remaining.push(lat);
  });
  if (!promoted.length && remaining.length === m.latentRelations.length) return m;
  return { ...m, relations: [...m.relations, ...promoted], latentRelations: remaining };
};

/**
 * Add the story's relations (the discoverable connection truth). The LLM emits
 * relations by label; resolve them to fragment ids. Dedup by undirected key.
 */
export const addRelations = (map, relations = [], { caseNumber = null } = {}) => {
  const m = normalizeUnderMap(map);
  // Resolve a relation's label to a fragment id, tolerant of the model's wording
  // drift. A relation whose endpoint can't resolve YET is not dropped — it is
  // held as a LATENT thread and promoted when the missing fragment arrives
  // (the "this thread dives deeper" open loop).
  const resolveLabel = makeLabelResolver(m.fragments);
  const have = new Set(m.relations.map((r) => relationKey(r.a, r.b)));
  const haveLatent = new Set(m.latentRelations.map((l) => latentKey(l.aLabel, l.bLabel)));
  const next = [...m.relations];
  const nextLatent = [...m.latentRelations];
  (Array.isArray(relations) ? relations : []).forEach((raw, idx) => {
    if (!raw) return;
    const aId = raw.a || resolveLabel(raw.aLabel);
    const bId = raw.b || resolveLabel(raw.bLabel);
    const revelation = String(raw.revelation || '').trim();
    if (!revelation || (aId && bId && aId === bId)) return;
    if (!aId || !bId) {
      // One (or both) endpoints aren't held yet — keep the thread latent.
      if (raw.aLabel && raw.bLabel && !haveLatent.has(latentKey(raw.aLabel, raw.bLabel))) {
        haveLatent.add(latentKey(raw.aLabel, raw.bLabel));
        nextLatent.push({
          aLabel: String(raw.aLabel).trim(),
          bLabel: String(raw.bLabel).trim(),
          revelation,
          falseReadings: cleanFalseReadings(raw.falseReadings),
          scope: raw.scope === 'arc' ? 'arc' : 'chapter',
          caseNumber,
          at: new Date().toISOString(),
        });
        if (typeof console !== 'undefined') {
          console.warn(
            `[underMap] relation held LATENT — unresolved label(s): ${!aId ? `a="${raw.aLabel}"` : ''}${!aId && !bId ? ' ' : ''}${!bId ? `b="${raw.bLabel}"` : ''} (case ${caseNumber || '?'})`,
          );
        }
      }
      return;
    }
    const key = relationKey(aId, bId);
    if (have.has(key)) return;
    have.add(key);
    next.push({
      id: raw.id || `rel_${relationKey(aId, bId)}`,
      a: aId,
      b: bId,
      revelation,
      falseReadings: cleanFalseReadings(raw.falseReadings),
      // 'arc' relations reveal an arc-level truth (bigger than a chapter node).
      scope: raw.scope === 'arc' ? 'arc' : 'chapter',
    });
  });
  const latentTrimmed = nextLatent.slice(-MAX_LATENT_RELATIONS); // keep newest
  const latentUnchanged = latentTrimmed.length === m.latentRelations.length
    && latentTrimmed.every((lat, i) => lat === m.latentRelations[i]);
  if (next.length === m.relations.length && latentUnchanged) {
    // Still attempt promotion: a previously-latent thread may now resolve.
    return promoteLatentRelations(m);
  }
  return promoteLatentRelations({ ...m, relations: next, latentRelations: latentTrimmed });
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
    return { valid: false, relation: null, alreadyConnected: false, unresolvedReading: false, foilClaimed: false, foilReading: null, readings: null };
  }
  const key = relationKey(aId, bId);
  const relation = m.relations.find((r) => relationKey(r.a, r.b) === key) || null;
  if (!relation) {
    return { valid: false, relation: null, alreadyConnected: false, unresolvedReading: false, foilClaimed: false, foilReading: null, readings: null };
  }
  const existing = m.connections.find((c) => relationKey(c.a, c.b) === key) || null;
  const node = m.nodes.find((n) => n && n.id === `node_${relation.id}`) || null;
  return {
    valid: true,
    relation,
    alreadyConnected: !!existing,
    unresolvedReading: !!existing?.unresolvedReading,
    // The Other Reader's claim, and the false reading they hold it under. The
    // reading was authored and stored and rendered nowhere, so an incursion
    // reached the player as a red line and no words.
    foilClaimed: !!existing?.foilClaimed,
    foilReading: node?.foilReading || null,
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
  const miss = { map: m, valid: false, node: null, revealed: null, alreadyConnected: false, correctReading: false, upgraded: false, reclaimed: false };
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
    // Already drawn. A correct reading can UPGRADE a previously-blurred node —
    // including RECLAIMING one The Other Reader claimed first (their ink clears).
    if (correctReading && existingNode?.unresolvedReading) {
      const reclaimed = !!existingNode.foilClaimed;
      const nodes = m.nodes.map((n) => (n.id === nodeId ? { ...n, unresolvedReading: false, foilClaimed: false } : n));
      const connections = m.connections.map((c) =>
        relationKey(c.a, c.b) === key ? { ...c, unresolvedReading: false, foilClaimed: false } : c,
      );
      const upgraded = { ...existingNode, unresolvedReading: false, foilClaimed: false };
      return { map: { ...m, nodes, connections }, valid: true, node: upgraded, revealed: null, alreadyConnected: true, correctReading: true, upgraded: true, reclaimed };
    }
    return { map: m, valid: true, node: existingNode, revealed: null, alreadyConnected: true, correctReading, upgraded: false, reclaimed: false };
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
  return { map: { ...m, connections, nodes }, valid: true, node, revealed: { node }, alreadyConnected: false, correctReading, upgraded: false, reclaimed: false };
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
// `probeBudget` is frozen INTO the descent. It used to be recomputed at every
// mount from the live map while `probesUsed` was restored from here, and the
// budget shrinks as threads are drawn — so a player who took the game's own
// advice ("Re-read the scene, then return") came back to a smaller budget than
// the one they had already spent against, sometimes to none at all.
export const EMPTY_DESCENT = { caseNumber: null, probesUsed: 0, probeBudget: 0, hadMisstep: false, firstMissForgiven: false, blockedPairs: [] };

// The freeform board (opened from the Desk) meters separately from a gated
// descent: it is the daily on-ramp, not the chapter's puzzle.
export const FREEFORM_DESCENT_KEY = 'freeform';
export const FREEFORM_PROBE_BASE = 3;

/** The persisted descent state for `caseNumber`, or a fresh one if the gate moved. */
export const descentStateFor = (map, caseNumber) => {
  const m = normalizeUnderMap(map);
  const d = m.descent;
  if (!d || !caseNumber || d.caseNumber !== caseNumber) return { ...EMPTY_DESCENT, caseNumber: caseNumber || null };
  return {
    caseNumber,
    probesUsed: Number.isFinite(d.probesUsed) ? d.probesUsed : 0,
    probeBudget: Number.isFinite(d.probeBudget) ? d.probeBudget : 0,
    hadMisstep: !!d.hadMisstep,
    firstMissForgiven: !!d.firstMissForgiven,
    blockedPairs: Array.isArray(d.blockedPairs) ? d.blockedPairs : [],
  };
};

/** Merge a patch into the descent state for `caseNumber` (starting fresh if the gate moved). */
export const updateDescentState = (map, caseNumber, patch = {}) => {
  const m = normalizeUnderMap(map);
  const current = descentStateFor(m, caseNumber);
  const next = { ...current, ...patch, caseNumber: caseNumber || null };
  const same = m.descent
    && m.descent.caseNumber === next.caseNumber
    && m.descent.probesUsed === next.probesUsed
    && (m.descent.probeBudget || 0) === (next.probeBudget || 0)
    && !!m.descent.hadMisstep === next.hadMisstep
    && !!m.descent.firstMissForgiven === next.firstMissForgiven
    && Array.isArray(m.descent.blockedPairs)
    && m.descent.blockedPairs.length === next.blockedPairs.length
    && m.descent.blockedPairs.every((k, i) => k === next.blockedPairs[i]);
  if (same) return m;
  return { ...m, descent: next };
};

export const recordDescent = (map, { hadMisstep = false, used = true } = {}) => {
  const m = normalizeUnderMap(map);
  // `used` is false for a descent the player opened and left without probing
  // anything. It still ENDS (the per-descent state has to be cleared, or the
  // next visit to this gate restores a stale one), but it neither advances the
  // flawless streak nor spends the banked daily probe: the bank is the daily
  // loop's payment into the campaign, and walking through a board without
  // touching it should not burn it.
  const flawlessStreak = used ? (hadMisstep ? 0 : (m.flawlessStreak || 0) + 1) : (m.flawlessStreak || 0);
  const bestFlawlessStreak = Math.max(m.bestFlawlessStreak || 0, flawlessStreak);
  const pendingProbeBonus = used ? 0 : (m.pendingProbeBonus || 0);
  if (
    m.descent == null
    && flawlessStreak === (m.flawlessStreak || 0)
    && bestFlawlessStreak === (m.bestFlawlessStreak || 0)
    && pendingProbeBonus === (m.pendingProbeBonus || 0)
  ) {
    return m;
  }
  return { ...m, flawlessStreak, bestFlawlessStreak, pendingProbeBonus, descent: null };
};

// The Other Reader's presence is bounded so no single run of luck pins the foil
// at an extreme — it stays a dial the late game can read, not a binary flag.
export const FOIL_PRESENCE_MIN = -3;
export const FOIL_PRESENCE_MAX = 3;
const clampPresence = (n) =>
  Math.max(FOIL_PRESENCE_MIN, Math.min(FOIL_PRESENCE_MAX, Number.isFinite(n) ? n : 0));

export const recordTheory = (map, theory) => {
  const m = normalizeUnderMap(map);
  if (!theory || !String(theory.interpretation || '').trim()) return m;
  // The strongest reading the player turned away from becomes the foil's creed.
  // `presence` persists across C-beats (one evolving antagonist, not one per chapter).
  const rejected = cleanFalseReadings(theory.rejected);
  const foilBelief = rejected[0] || null;
  // `fromChapter: null` is what marks a NEW GAME+ foil as a prior-season reader
  // (the prompt's "they know how Jack reads" framing hangs off it). Stamping this
  // chapter over it at the first C-beat threw that away for the whole run.
  const carriedOver = !!(m.foil && m.foil.belief && m.foil.fromChapter == null);
  const nextFoil = foilBelief
    ? {
        belief: foilBelief,
        fromChapter: carriedOver ? null : (theory.chapter ?? null),
        presence: m.foil ? clampPresence(m.foil.presence) : 0,
        name: (m.foil && m.foil.name) || null,
      }
    : m.foil;
  return {
    ...m,
    foil: nextFoil,
    // Idempotent per chapter: an unresolved belief for this chapter is REPLACED,
    // not stacked. Sealing, tapping Reconsider and sealing again used to leave two
    // contradictory beliefs for one chapter, and resolveTheory flips every
    // unresolved theory for a chapter, so clarity double-counted it and the ending
    // was computed from more beliefs than the campaign has chapters.
    theories: [
      {
        chapter: theory.chapter ?? null,
        fragmentIds: Array.isArray(theory.fragmentIds) ? theory.fragmentIds : [],
        interpretation: String(theory.interpretation || '').trim(),
        rejected,
        correct: theory.correct != null ? !!theory.correct : null,
        // EVIDENCE-GROUNDED BELIEFS: whether the player chose the reading the
        // revealed truths better supported (true), chose against the evidence
        // (false), or there was no grounding signal (null). Steers resolution:
        // mapping well should causally buy clarity.
        grounded: theory.grounded != null ? !!theory.grounded : null,
        at: new Date().toISOString(),
      },
      ...m.theories.filter((t) => !(t && t.chapter === (theory.chapter ?? null) && t.correct == null)),
    ],
  };
};

/**
 * FOIL INCURSION: at presence >= 2, The Other Reader claims one still-hidden
 * thread when a chapter's descent opens — the connection appears already drawn
 * in THEIR ink, its node blurred and carrying their (false) reading. The player
 * reclaims it by probing the pair and choosing the TRUE reading (resolveReading's
 * upgrade path clears the claim). At most one claim per chapter; deterministic
 * pick so it is stable across re-renders. Pure.
 *
 * Returns { map, claimed: { relation, node } | null }.
 */
export const claimByFoil = (map, { chapter } = {}) => {
  const m = normalizeUnderMap(map);
  const none = { map: m, claimed: null };
  if (foilPresence(m) < 2) return none;
  if (!Number.isFinite(chapter) || m.lastFoilClaimChapter === chapter) return none;
  const candidates = sensedRelations(m);
  if (!candidates.length) return none;
  const rel = [...candidates].sort((a, b) => (a.id < b.id ? -1 : 1))[0];
  const nodeId = `node_${rel.id}`;
  if (m.nodes.some((n) => n.id === nodeId)) return none;
  const now = new Date().toISOString();
  const scope = rel.scope === 'arc' ? 'arc' : 'chapter';
  const node = {
    id: nodeId,
    label: rel.revelation,
    revelation: rel.revelation,
    // What the foil believes this connection means — shown until reclaimed.
    foilReading: (rel.falseReadings || [])[0] || null,
    unresolvedReading: true,
    foilClaimed: true,
    scope,
    at: now,
  };
  const connection = { a: rel.a, b: rel.b, relationId: rel.id, at: now, unresolvedReading: true, foilClaimed: true, scope };
  return {
    map: {
      ...m,
      nodes: [node, ...m.nodes].slice(0, MAX_NODES),
      connections: [connection, ...m.connections],
      lastFoilClaimChapter: chapter,
    },
    claimed: { relation: rel, node },
  };
};

/**
 * NEW GAME+: a fresh campaign that remembers being read. If the previous
 * (completed) run produced a foil, they carry over — named, at presence 1
 * (EDGES) — so the rival is part of this city from the first chapter.
 * `fromChapter: null` marks them as a prior-season reader for the prompt.
 */
export const seedNewGamePlus = (prevMap) => {
  const prev = normalizeUnderMap(prevMap);
  const blank = createBlankUnderMap();
  // The map resets; the player's record does not. The days-mapped streak and the
  // best-ever marks are surfaced on the Desk, the Codex and the Stats screen as
  // a multi-week history, and a restart used to silently zero all of it.
  // `pendingProbeBonus` deliberately does NOT carry: it is banked against a
  // specific run's next descent.
  const carried = {
    ...blank,
    dailyStreak: prev.dailyStreak || 0,
    bestDailyStreak: prev.bestDailyStreak || 0,
    lastDailyResolved: prev.lastDailyResolved || null,
    bestFlawlessStreak: prev.bestFlawlessStreak || 0,
  };
  if (!prev.foil || !prev.foil.belief) return carried;
  return {
    ...carried,
    foil: {
      belief: prev.foil.belief,
      fromChapter: null,
      presence: 1,
      name: prev.foil.name || null,
    },
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
    // The daily thread pays into the campaign: +1 probe banked for the next descent.
    pendingProbeBonus: Math.min(MAX_PROBE_BONUS, (m.pendingProbeBonus || 0) + 1),
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

/** How many authored threads still wait on a fragment the player doesn't hold. */
export const latentThreadCount = (map) => normalizeUnderMap(map).latentRelations.length;

/**
 * Held fragments that are one end of a latent (dangling) thread — the board
 * shows these with a thread trailing off into the dark ("its other end isn't
 * here yet"). Returns a Set of fragment ids.
 */
export const latentFragmentIds = (map) => {
  const m = normalizeUnderMap(map);
  if (!m.latentRelations.length) return new Set();
  const resolveLabel = makeLabelResolver(m.fragments);
  const out = new Set();
  m.latentRelations.forEach((lat) => {
    const aId = resolveLabel(lat.aLabel);
    const bId = resolveLabel(lat.bLabel);
    // Exactly one end held => that end visibly trails into the dark.
    if (aId && !bId) out.add(aId);
    if (bId && !aId) out.add(bId);
  });
  return out;
};

/** Distinct fragments that participate in at least one still-unfound relation. */
export const connectableFragmentCount = (map) => {
  const ids = new Set();
  sensedRelations(map).forEach((r) => { ids.add(r.a); ids.add(r.b); });
  return ids.size;
};

/**
 * Probe budget for a descent: base + one per N connectable fragments (see §3.1)
 * + any bonus banked from the daily stir (consumed by recordDescent).
 */
export const probeBudgetFor = (map) => {
  const m = normalizeUnderMap(map);
  return PROBE_BASE
    + Math.floor(connectableFragmentCount(m) / PROBE_PER_FRAGMENTS)
    + (m.pendingProbeBonus || 0);
};

/** Bonus probes banked from the daily stir (shown as "+N from the daily thread"). */
export const pendingProbeBonus = (map) => normalizeUnderMap(map).pendingProbeBonus || 0;

/**
 * Jack's earned sense of the Under-Map (0..3), from total truths drawn across the
 * campaign. See SENSE_TIER_THRESHOLDS for what each tier unlocks on the board.
 */
/**
 * Connections the player actually read TRUE: not blurred by a wrong reading, and
 * not one The Other Reader claimed. This is the basis for sense tiers, which are
 * meant to track mastery; counting every connection meant a player who chose the
 * wrong reading every single time still climbed to DEEPSIGHT.
 */
export const truthsDrawn = (map) => {
  const m = normalizeUnderMap(map);
  return m.connections.filter((c) => c && !c.unresolvedReading && !c.foilClaimed).length;
};

export const senseTier = (map) => {
  const drawn = truthsDrawn(map);
  let tier = 0;
  SENSE_TIER_THRESHOLDS.forEach((need) => { if (drawn >= need) tier += 1; });
  return tier;
};

/**
 * ATTUNED (sense tier 1): the fragments that share a still-hidden relation with
 * the given fragment — the board makes them glimmer while it is held. Pure; the
 * screen gates this on senseTier >= 1.
 */
export const attunedPartners = (map, fragmentId) => {
  if (!fragmentId) return [];
  const out = new Set();
  sensedRelations(map).forEach((r) => {
    if (r.a === fragmentId) out.add(r.b);
    if (r.b === fragmentId) out.add(r.a);
  });
  return [...out];
};

/** Stable small hash, so a glimmer never reshuffles between renders. */
const glimmerRank = (seed) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** How many decoys the glimmer carries at each sense tier (index = tier). */
export const GLIMMER_DECOYS = [0, 2, 1, 0];

/**
 * What ATTUNED actually shows when the player holds a fragment.
 *
 * `attunedPartners` alone named the exact partners, and holding a fragment costs
 * nothing (the probe is charged on the SECOND tap), so from tier 1 onward the
 * board answered itself: hold, read off the glimmer, connect, never miss. The
 * probe economy, the whispers and the sense tiers above it all stopped mattering.
 *
 * The glimmer is a SUPERSET instead, and it narrows as the sense is earned: two
 * decoys at tier 1, one at tier 2, none at DEEPSIGHT. Deterministic, so it is a
 * reading of the board rather than a reroll.
 */
export const attunedGlimmer = (map, fragmentId, tier = 1) => {
  const partners = attunedPartners(map, fragmentId);
  if (!fragmentId || !partners.length) return partners;
  const decoyCount = GLIMMER_DECOYS[Math.max(0, Math.min(GLIMMER_DECOYS.length - 1, tier))] || 0;
  if (decoyCount <= 0) return partners;
  const held = new Set([fragmentId, ...partners]);
  const decoys = normalizeUnderMap(map).fragments
    .filter((f) => !held.has(f.id))
    .map((f) => ({ id: f.id, rank: glimmerRank(`${fragmentId}:${f.id}`) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, decoyCount)
    .map((f) => f.id);
  return [...partners, ...decoys];
};

/**
 * Honest sonar for a missed probe: whether each fragment of the failed pair still
 * participates in ANY undiscovered relation ("live" = still hums with something
 * unfound; not live = its threads are already drawn). A spent probe should always
 * teach — this is the information it buys.
 */
export const missWhisper = (map, aId, bId) => {
  const live = new Set();
  sensedRelations(map).forEach((r) => { live.add(r.a); live.add(r.b); });
  return { aLive: live.has(aId), bLive: live.has(bId) };
};

/**
 * THE OTHER READER's pressure on the board: how many still-hidden threads the
 * foil is "ahead" by. Honest (never exceeds what remains undiscovered) and scaled
 * by presence, so the rival's lead is felt exactly when the player is being
 * out-read. 0 until the foil stirs (presence >= 1).
 */
export const foilThreadsAhead = (map) => {
  const presence = foilPresence(map);
  if (presence < 1) return 0;
  return Math.min(undiscoveredRelationCount(map), 1 + presence);
};

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
  // A blurred reading and a thread The Other Reader claimed are both CONNECTED
  // and both still unknown, so counting them here reported a map as more drawn
  // than it is: the depth meter rose for getting a meaning wrong, "the hidden
  // world stands revealed" could fire over readings the player never resolved,
  // and CHAPTER MAPPED CLEAN contradicted the reclaim prompt on the same screen.
  // truthsDrawn (which feeds the sense tiers) already filters exactly this way.
  const made = new Set(
    m.connections
      .filter((c) => !c.unresolvedReading && !c.foilClaimed)
      .map((c) => relationKey(c.a, c.b)),
  );
  const total = new Set(m.relations.map((r) => relationKey(r.a, r.b))).size;
  const drawn = m.relations.filter((r) => made.has(relationKey(r.a, r.b))).length;
  return { drawn, total, ratio: total > 0 ? Math.min(1, drawn / total) : 0 };
};
