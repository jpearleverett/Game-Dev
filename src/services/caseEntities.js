/**
 * Case entity extraction.
 *
 * Pulls the people / places / times a deduction puzzle and the Case Board need,
 * from (in priority order):
 *   1. the static case definition (cases.js: board words, polaroids, clue summaries)
 *   2. dynamically generated story meta (narrative threads -> characters)
 *   3. canonical Ashport facts (story bible)
 *   4. a curated noir pool (so a puzzle can always be seeded)
 *
 * Everything is deterministic given a caseNumber, so a player always sees the
 * same alibi grid for the same beat. Pure module — no React, no storage I/O.
 */

import { ABSOLUTE_FACTS } from '../data/storyBible';

// ---- deterministic RNG ---------------------------------------------------

const hashString = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const seededRng = (seedStr) => {
  let a = hashString(String(seedStr || 'seed')) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = (arr, rng) => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const uniqueBy = (items, keyFn) => {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const k = keyFn(it);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
};

const titleCase = (w) =>
  String(w || '')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const slug = (v, fb = 'x') =>
  String(v || fb).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || fb;

// ---- curated Ashport pools (fallback flavour, always on-theme) -----------

const LOCATION_POOL = [
  "Murphy's Bar",
  'The Archive',
  'Brineglass Viaduct',
  'Sentinel Library',
  'Underbridge Market',
  'Acheron Avenue',
  'The Wharf',
  'The Threshold',
  'Blackwell Penthouse',
  'The Old Customs House',
];

const TIME_POOL = [
  'Before dusk',
  'Dusk',
  'Late evening',
  'Midnight',
  'After midnight',
  'Before dawn',
];

const SUSPECT_POOL = [
  'The Courier',
  'The Clerk',
  'The Widow',
  'The Dockhand',
  'The Fixer',
  'The Stranger',
  'The Landlord',
  'The Witness',
  'The Bartender',
  'The Archivist',
];

// Words that look like locations rather than people, so we route them correctly.
const LOCATION_HINTS = /(bar|archive|viaduct|library|market|avenue|wharf|threshold|penthouse|office|alley|door|tower|house|street|station|dock|bridge|room)/i;

// Generic nouns we never want to treat as a suspect name.
const STOPWORDS = new Set([
  'LETTER', 'ENVELOPE', 'PHOTO', 'DOOR', 'INK', 'STAMP', 'HANDWRITING',
  'SILVER', 'GLYPH', 'THRESHOLD', 'ACHERON', 'OFFICE', 'ALLEY',
]);

const isNameLike = (word) => {
  const w = String(word || '').trim();
  if (w.length < 3) return false;
  if (STOPWORDS.has(w.toUpperCase())) return false;
  if (LOCATION_HINTS.test(w)) return false;
  // Single token, alphabetic — proper-noun-ish.
  return /^[A-Za-z][A-Za-z'’-]+$/.test(w);
};

// ---- extraction ----------------------------------------------------------

const collectFromCase = (caseData) => {
  const names = [];
  const places = [];
  if (!caseData) return { names, places };

  const words = Array.isArray(caseData.board?.mainWords) ? caseData.board.mainWords : [];
  words.forEach((w) => {
    if (LOCATION_HINTS.test(w)) places.push(titleCase(w));
    else if (isNameLike(w)) names.push(titleCase(w));
  });

  const polaroids = caseData.evidenceBoard?.polaroids || [];
  polaroids.forEach((p) => {
    if (p?.title && isNameLike(p.title)) names.push(titleCase(p.title));
    if (p?.subtitle && LOCATION_HINTS.test(p.subtitle)) places.push(p.subtitle.trim());
  });

  return { names, places };
};

const collectFromStoryMeta = (storyMeta) => {
  const names = [];
  if (!storyMeta) return names;
  const threads = Array.isArray(storyMeta.narrativeThreads) ? storyMeta.narrativeThreads : [];
  threads.forEach((t) => {
    (Array.isArray(t?.characters) ? t.characters : []).forEach((c) => {
      const first = String(c || '').trim().split(/\s+/)[0];
      if (isNameLike(first)) names.push(titleCase(first));
    });
  });
  return names;
};

const canonicalLocations = () => {
  const loc = ABSOLUTE_FACTS?.setting?.keyLocations || {};
  return Object.values(loc)
    .map((d) => String(d || '').split(/[;:.]/)[0].trim())
    .filter(Boolean);
};

/**
 * Extract entity pools for a case. Always returns plenty of each kind.
 *
 * @param {string} caseNumber e.g. "002A"
 * @param {object} opts { caseData, storyMeta }
 * @returns {{ suspects: string[], locations: string[], times: string[], seed: string }}
 */
export const extractCaseEntities = (caseNumber, { caseData = null, storyMeta = null } = {}) => {
  const seed = `entities:${caseNumber || 'x'}`;
  const rng = seededRng(seed);

  const fromCase = collectFromCase(caseData);
  const fromMeta = collectFromStoryMeta(storyMeta);

  // Jack is the detective, never a suspect; Victoria is the architect, kept aside.
  const detective = ABSOLUTE_FACTS?.protagonist?.fullName?.split(/\s+/)[0] || 'Jack';

  let suspects = uniqueBy(
    [...fromCase.names, ...fromMeta].map((n) => titleCase(n)),
    (n) => n.toLowerCase(),
  ).filter((n) => n.toLowerCase() !== detective.toLowerCase());

  let locations = uniqueBy(
    [...fromCase.places, ...canonicalLocations()].map((p) => p.trim()),
    (p) => p.toLowerCase(),
  );

  // Pad from curated pools (shuffled per case) so we always have enough.
  suspects = uniqueBy([...suspects, ...shuffle(SUSPECT_POOL, rng)], (n) => n.toLowerCase());
  locations = uniqueBy([...locations, ...shuffle(LOCATION_POOL, rng)], (p) => p.toLowerCase());
  const times = shuffle(TIME_POOL, rng);

  return { suspects, locations, times, seed };
};

/** Convenience: the suspect list as Case-Board suspect records. */
export const suspectRecords = (caseNumber, opts, limit = 5) => {
  const { suspects } = extractCaseEntities(caseNumber, opts);
  return suspects.slice(0, limit).map((name) => ({ id: `suspect_${slug(name)}`, name }));
};
