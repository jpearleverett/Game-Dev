/**
 * DeductionService — the "alibi grid".
 *
 * A case-rooted logic puzzle: N suspects each occupy a distinct location on the
 * night in question (a bijection). Clues, drawn in the language of the case,
 * uniquely pin down who was where. One location is the crime scene; the suspect
 * truly there is the culprit, and their stated alibi is a lie. Solving the grid
 * cracks that contradiction open — the payoff that lands on the Case Board.
 *
 * Generation is fully deterministic (seeded by caseNumber) and entirely local —
 * no LLM, no network — so puzzles are stable, instant, and always solvable with
 * exactly one answer. Pure module (no React / storage).
 */

import { extractCaseEntities, seededRng } from './caseEntities';

export const CLUE_TYPE = {
  AT: 'AT',          // suspect is at exactly this location
  NOT_AT: 'NOT_AT',  // suspect is at none of these locations
  ONE_OF: 'ONE_OF',  // suspect is at one of these locations
};

const slug = (v, fb = 'x') =>
  String(v || fb).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || fb;

/** Grid size by chapter — small and tight so a deduction is 4–8 minutes, not 40. */
export const getDeductionSize = (chapter) => {
  const c = Number(chapter) || 1;
  if (c <= 2) return 4;
  if (c <= 5) return 5;
  return 6;
};

// ---- solver --------------------------------------------------------------

const clueAllows = (clue, suspectIdx, locIdx) => {
  // Returns whether placing `suspectIdx` at `locIdx` is consistent with clue.
  if (clue.suspect !== suspectIdx) return true;
  if (clue.type === CLUE_TYPE.AT) return clue.locations[0] === locIdx;
  if (clue.type === CLUE_TYPE.NOT_AT) return !clue.locations.includes(locIdx);
  if (clue.type === CLUE_TYPE.ONE_OF) return clue.locations.includes(locIdx);
  return true;
};

const permSatisfies = (perm, clues) =>
  clues.every((clue) => clueAllows(clue, clue.suspect, perm[clue.suspect]));

/**
 * Count solutions (bijections) consistent with the clue set, capped at `cap`.
 * Backtracking with per-suspect candidate pruning; N<=6 so this is trivial.
 */
const countSolutions = (n, clues, cap = 2) => {
  const used = new Array(n).fill(false);
  const perm = new Array(n).fill(-1);
  let count = 0;

  const cluesFor = (s) => clues.filter((c) => c.suspect === s);

  const place = (s) => {
    if (count >= cap) return;
    if (s === n) {
      count += 1;
      return;
    }
    const sClues = cluesFor(s);
    for (let l = 0; l < n; l += 1) {
      if (used[l]) continue;
      if (!sClues.every((c) => clueAllows(c, s, l))) continue;
      used[l] = true;
      perm[s] = l;
      place(s + 1);
      used[l] = false;
      perm[s] = -1;
      if (count >= cap) return;
    }
  };

  place(0);
  return count;
};

// ---- generation ----------------------------------------------------------

const buildCluePool = (n, truth, rng, difficulty) => {
  const pool = [];
  for (let s = 0; s < n; s += 1) {
    const trueLoc = truth[s];
    // Direct placement (easiest, most "confirming").
    pool.push({ type: CLUE_TYPE.AT, suspect: s, locations: [trueLoc], strength: 0 });
    // Several eliminations (the bread and butter of deduction).
    for (let l = 0; l < n; l += 1) {
      if (l !== trueLoc) pool.push({ type: CLUE_TYPE.NOT_AT, suspect: s, locations: [l], strength: 2 });
    }
    // "One of" with the true location plus a decoy or two.
    const decoys = [];
    for (let l = 0; l < n && decoys.length < 2; l += 1) {
      if (l !== trueLoc && rng() < 0.5) decoys.push(l);
    }
    if (decoys.length) {
      pool.push({
        type: CLUE_TYPE.ONE_OF,
        suspect: s,
        locations: shuffleSeeded([trueLoc, ...decoys], rng),
        strength: 1,
      });
    }
  }
  // Harder puzzles lean on eliminations/one-of; easier ones surface direct placements.
  const order = difficulty === 'easy' ? (a, b) => a.strength - b.strength : (a, b) => b.strength - a.strength;
  return shuffleSeeded(pool, rng).sort(order);
};

function shuffleSeeded(arr, rng) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const clueText = (clue, suspects, locations) => {
  const s = suspects[clue.suspect]?.name || 'Someone';
  const locNames = clue.locations.map((l) => locations[l]?.name || 'somewhere');
  if (clue.type === CLUE_TYPE.AT) {
    return `${s} was seen at ${locNames[0]} that night.`;
  }
  if (clue.type === CLUE_TYPE.NOT_AT) {
    return `Nothing places ${s} anywhere near ${locNames[0]}.`;
  }
  // ONE_OF
  if (locNames.length === 2) return `${s} was at ${locNames[0]} or ${locNames[1]} — not elsewhere.`;
  const last = locNames[locNames.length - 1];
  return `${s} was at one of: ${locNames.slice(0, -1).join(', ')} or ${last}.`;
};

/**
 * Generate a case-rooted alibi grid.
 *
 * @param {string} caseNumber e.g. "002C"
 * @param {object} opts { caseData, storyMeta, chapter, size, difficulty }
 */
export const generateDeductionPuzzle = (caseNumber, opts = {}) => {
  const chapter = opts.chapter ?? parseInt(String(caseNumber || '001').slice(0, 3), 10) ?? 1;
  const n = Math.max(3, Math.min(opts.size || getDeductionSize(chapter), 6));
  const difficulty = opts.difficulty || (chapter <= 2 ? 'easy' : chapter <= 5 ? 'medium' : 'hard');

  const seed = `deduction:${caseNumber}:${n}`;
  const rng = seededRng(seed);

  const pools = extractCaseEntities(caseNumber, { caseData: opts.caseData, storyMeta: opts.storyMeta });
  const suspects = pools.suspects.slice(0, n).map((name) => ({ id: `suspect_${slug(name)}`, name }));
  const locations = pools.locations.slice(0, n).map((name) => ({ id: `loc_${slug(name)}`, name }));

  // Truth: a random bijection suspectIndex -> locationIndex.
  const truth = shuffleSeeded([...Array(n).keys()], rng);

  // Greedily assemble a unique, minimal clue set.
  const pool = buildCluePool(n, truth, rng, difficulty);
  const chosen = [];
  for (const clue of pool) {
    if (countSolutions(n, chosen) === 1) break;
    chosen.push(clue);
  }
  // If the pool somehow under-constrained (shouldn't happen), top up with AT clues.
  for (let s = 0; s < n && countSolutions(n, chosen) > 1; s += 1) {
    chosen.push({ type: CLUE_TYPE.AT, suspect: s, locations: [truth[s]], strength: 0 });
  }
  // Minimise: drop any clue that isn't needed for uniqueness.
  for (let i = chosen.length - 1; i >= 0; i -= 1) {
    const without = chosen.slice(0, i).concat(chosen.slice(i + 1));
    if (countSolutions(n, without) === 1) chosen.splice(i, 1);
  }

  const clues = chosen.map((c, idx) => ({
    id: `dclue_${idx}`,
    type: c.type,
    suspectId: suspects[c.suspect].id,
    locationIds: c.locations.map((l) => locations[l].id),
    text: clueText(c, suspects, locations),
  }));

  // The crime scene + culprit + their false alibi.
  const sceneLocIdx = Math.floor(rng() * n);
  const culpritIdx = truth.indexOf(sceneLocIdx);
  let claimIdx = Math.floor(rng() * n);
  if (claimIdx === sceneLocIdx) claimIdx = (claimIdx + 1) % n;

  const solution = {};
  suspects.forEach((s, i) => { solution[s.id] = locations[truth[i]].id; });

  const culprit = suspects[culpritIdx];
  const scene = locations[sceneLocIdx];
  const claim = locations[claimIdx];

  const contradiction =
    `${culprit.name} swore they were at ${claim.name} that night — ` +
    `but the placements put them at ${scene.name}, where it happened.`;

  return {
    kind: 'deduction',
    caseNumber,
    seed,
    size: n,
    difficulty,
    suspects,
    locations,
    clues,
    solution,
    crime: {
      sceneLocationId: scene.id,
      sceneName: scene.name,
      culpritId: culprit.id,
      culpritName: culprit.name,
      claimLocationId: claim.id,
      claimName: claim.name,
    },
    contradiction,
    prompt: 'Place each suspect where the evidence — not their word — puts them.',
  };
};

/**
 * Count how many placements satisfy a generated puzzle's clues (capped).
 * Exposed mainly so tests can assert the puzzle has exactly one solution.
 */
export const countDeductionSolutions = (puzzle, cap = 5) => {
  const suspectIdx = new Map(puzzle.suspects.map((s, i) => [s.id, i]));
  const locIdx = new Map(puzzle.locations.map((l, i) => [l.id, i]));
  const clues = puzzle.clues.map((c) => ({
    type: c.type,
    suspect: suspectIdx.get(c.suspectId),
    locations: c.locationIds.map((id) => locIdx.get(id)),
  }));
  return countSolutions(puzzle.size, clues, cap);
};

/**
 * Check a player's placement against the solution.
 * @param {object} puzzle
 * @param {object} placement { [suspectId]: locationId }
 * @returns {{ solved: boolean, correctCount: number, total: number }}
 */
export const checkDeduction = (puzzle, placement = {}) => {
  const entries = Object.entries(puzzle?.solution || {});
  let correct = 0;
  entries.forEach(([sid, lid]) => {
    if (placement[sid] === lid) correct += 1;
  });
  // A valid solve also needs the placement to be a bijection (no two suspects
  // sharing a location), which the UI enforces, but we double-check here.
  const used = Object.values(placement).filter(Boolean);
  const bijection = new Set(used).size === used.length;
  return {
    solved: correct === entries.length && bijection,
    correctCount: correct,
    total: entries.length,
  };
};
