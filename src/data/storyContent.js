import storyNarrative from './storyNarrative.json';
import { getGeneratedEntry as loadGeneratedEntry } from '../storage/generatedStoryStorage';

const CASE_CONTENT = storyNarrative?.caseContent || {};

export const ROOT_PATH_KEY = 'ROOT';

// Chapter 1 is always static, chapters 2-12 are dynamically generated
const FIRST_DYNAMIC_CHAPTER = 2;

/**
 * Check if a case number requires dynamic generation
 */
export function isDynamicChapter(caseNumber) {
  if (!caseNumber) return false;
  const chapterSegment = caseNumber.slice(0, 3);
  const chapterNumber = parseInt(chapterSegment, 10);
  return !Number.isNaN(chapterNumber) && chapterNumber >= FIRST_DYNAMIC_CHAPTER;
}

/**
 * Parse chapter and subchapter from case number
 */
export function parseCaseNumber(caseNumber) {
  if (!caseNumber) return { chapter: 1, subchapter: 1 };
  const chapterSegment = caseNumber.slice(0, 3);
  const letter = caseNumber.slice(3, 4);
  const chapter = parseInt(chapterSegment, 10) || 1;
  const subchapter = { 'A': 1, 'B': 2, 'C': 3 }[letter] || 1;
  return { chapter, subchapter };
}

export function normalizeStoryPathKey(token) {
  if (!token) {
    return ROOT_PATH_KEY;
  }
  const cleaned = String(token)
    .replace(/super-path/gi, '')
    .replace(/path/gi, '')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  return cleaned || ROOT_PATH_KEY;
}

/**
 * Compute a stable, cumulative branch key for a given chapter from choice history.
 *
 * IMPORTANT:
 * - Decisions are recorded on subchapter C caseNumbers (e.g., "001C", "002C").
 * - The choice made at Chapter N ("00NC") determines the branch identity for Chapter N+1.
 * - Therefore, the branch key for Chapter K is the sequence of optionKeys for decision chapters < K.
 *
 * Example:
 * - choiceHistory: [{caseNumber:"001C", optionKey:"A"}, {caseNumber:"002C", optionKey:"B"}]
 * - branchKey for chapter 3 => "AB"
 *
 * @param {Array} choiceHistory
 * @param {number} chapterNumber - The chapter being entered/generated (2..12)
 * @returns {string} Normalized path key ("ROOT" if no prior decisions)
 */
export function computeBranchPathKey(choiceHistory, chapterNumber) {
  const chapter = Number(chapterNumber) || 1;
  const history = Array.isArray(choiceHistory) ? choiceHistory : [];
  if (chapter <= 1 || history.length === 0) {
    return ROOT_PATH_KEY;
  }

  // Sort by decision chapter ascending for determinism.
  const sorted = [...history].sort((a, b) => {
    const ca = parseCaseNumber(a?.caseNumber).chapter;
    const cb = parseCaseNumber(b?.caseNumber).chapter;
    return ca - cb;
  });

  const letters = [];
  for (const entry of sorted) {
    const decisionChapter = parseCaseNumber(entry?.caseNumber).chapter;
    // decision at chapter N affects chapter N+1, so include decisions strictly before the target chapter
    if (decisionChapter > 0 && decisionChapter < chapter) {
      const ok = entry?.optionKey === 'A' || entry?.optionKey === 'B';
      if (ok) {
        letters.push(entry.optionKey);
      }
    }
  }

  return normalizeStoryPathKey(letters.join('')) || ROOT_PATH_KEY;
}

export function resolveStoryPathKey(caseNumber, storyCampaign) {
    if (!caseNumber) {
        return ROOT_PATH_KEY;
    }
    if (!storyCampaign) {
        return ROOT_PATH_KEY;
    }
    const chapterSegment = caseNumber.slice(0, 3);
    const chapterNumber = parseInt(chapterSegment, 10);
    if (Number.isNaN(chapterNumber)) {
        return storyCampaign.currentPathKey || ROOT_PATH_KEY;
    }

    // Prefer deterministic branch key from choiceHistory for dynamic chapters.
    // This prevents collisions where currentPathKey is only "A"/"B" or otherwise incomplete.
    if (chapterNumber >= FIRST_DYNAMIC_CHAPTER) {
      const computed = computeBranchPathKey(storyCampaign.choiceHistory, chapterNumber);
      if (computed && computed !== ROOT_PATH_KEY) {
        return computed;
      }
    }

    const historyKey =
        storyCampaign.pathHistory && storyCampaign.pathHistory[chapterNumber];
    if (historyKey) {
        return historyKey;
    }
    if (
        chapterNumber === storyCampaign.chapter &&
        storyCampaign.currentPathKey
    ) {
        return storyCampaign.currentPathKey;
    }
    return storyCampaign.currentPathKey || ROOT_PATH_KEY;
}

export function formatCaseNumber(chapter, subchapter) {
  const letters = ['A', 'B', 'C'];
  const letter = letters[subchapter - 1] || letters[0];
  return `${String(chapter).padStart(3, '0')}${letter}`;
}

// Cache for generated content loaded in memory (moved up for sync access)
let generatedCache = {};

export function getStoryEntry(caseNumber, pathKey) {
  if (!caseNumber) return null;

  const normalizedKey = normalizeStoryPathKey(pathKey);

  // For dynamic chapters, check generated cache first
  if (isDynamicChapter(caseNumber)) {
    const cacheKey = `${caseNumber}_${normalizedKey}`;
    const cached = generatedCache[cacheKey];
    if (cached) return cached;
    // If not in cache for dynamic chapter, return null (needs async generation)
    return null;
  }

  // For Chapter 1, use static content
  const bucket = CASE_CONTENT[caseNumber];
  if (!bucket) return null;
  return (
    bucket[normalizedKey] ||
    bucket[ROOT_PATH_KEY] ||
    bucket[Object.keys(bucket)[0]]
  );
}

export function getStoryDecision(caseNumber, pathKey) {
  const entry = getStoryEntry(caseNumber, pathKey);
  return entry?.decision || null;
}

export function getStoryBridgeText(caseNumber, pathKey) {
  const entry = getStoryEntry(caseNumber, pathKey);
  return entry?.bridgeText || null;
}

export function getStoryNarrative(caseNumber, pathKey) {
  const entry = getStoryEntry(caseNumber, pathKey);
  if (!entry?.narrative) {
    return [];
  }
  return Array.isArray(entry.narrative) ? entry.narrative : [entry.narrative];
}

export function getStoryMeta(caseNumber, pathKey) {
  const entry = getStoryEntry(caseNumber, pathKey);
  if (!entry) return null;
  return {
    chapter: entry.chapter,
    subchapter: entry.subchapter,
    title: entry.title,
    bridgeText: entry.bridgeText,
    decision: entry.decision || null,
  };
}

// ============================================================================
// ASYNC FUNCTIONS FOR DYNAMIC STORY GENERATION
// ============================================================================

// Note: generatedCache is declared above getStoryEntry for sync access

/**
 * Load generated story entry into cache
 */
async function loadToCache(caseNumber, pathKey) {
  const key = `${caseNumber}_${pathKey}`;
  if (!generatedCache[key]) {
    const entry = await loadGeneratedEntry(caseNumber, pathKey);
    if (entry) {
      generatedCache[key] = entry;
    }
  }
  return generatedCache[key] || null;
}

/**
 * Clear the generated content cache
 */
export function clearGeneratedCache() {
  generatedCache = {};
}

/**
 * Async version of getStoryEntry that handles dynamic content
 * For Chapter 1: Returns static content
 * For Chapters 2-12: Returns generated content if available, null if needs generation
 */
export async function getStoryEntryAsync(caseNumber, pathKey) {
  if (!caseNumber) return null;

  // For Chapter 1 (static), use existing function
  if (!isDynamicChapter(caseNumber)) {
    return getStoryEntry(caseNumber, pathKey);
  }

  // For dynamic chapters, try to load from generated storage
  const normalizedKey = normalizeStoryPathKey(pathKey);
  const generated = await loadToCache(caseNumber, normalizedKey);

  return generated || null;
}

/**
 * Check if story content exists (either static or generated)
 */
export async function hasStoryContent(caseNumber, pathKey) {
  if (!caseNumber) return false;

  // Chapter 1 always has static content
  if (!isDynamicChapter(caseNumber)) {
    return getStoryEntry(caseNumber, pathKey) !== null;
  }

  // Dynamic chapters need to check generated storage
  const normalizedKey = normalizeStoryPathKey(pathKey);
  const generated = await loadToCache(caseNumber, normalizedKey);
  return generated !== null;
}

/**
 * Async version of getStoryNarrative
 */
export async function getStoryNarrativeAsync(caseNumber, pathKey) {
  const entry = await getStoryEntryAsync(caseNumber, pathKey);
  if (!entry?.narrative) {
    return [];
  }
  return Array.isArray(entry.narrative) ? entry.narrative : [entry.narrative];
}

/**
 * Async version of getStoryDecision
 */
export async function getStoryDecisionAsync(caseNumber, pathKey) {
  const entry = await getStoryEntryAsync(caseNumber, pathKey);
  return entry?.decision || null;
}

/**
 * Async version of getStoryBridgeText
 */
export async function getStoryBridgeTextAsync(caseNumber, pathKey) {
  const entry = await getStoryEntryAsync(caseNumber, pathKey);
  return entry?.bridgeText || null;
}

/**
 * Async version of getStoryMeta
 */
export async function getStoryMetaAsync(caseNumber, pathKey) {
  const entry = await getStoryEntryAsync(caseNumber, pathKey);
  if (!entry) return null;
  return {
    chapter: entry.chapter,
    subchapter: entry.subchapter,
    title: entry.title,
    bridgeText: entry.bridgeText,
    decision: entry.decision || null,
  };
}

/**
 * Update cache with newly generated content
 */
export function updateGeneratedCache(caseNumber, pathKey, entry) {
  const key = `${caseNumber}_${normalizeStoryPathKey(pathKey)}`;
  generatedCache[key] = entry;
}
