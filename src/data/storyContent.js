import storyNarrative from './storyNarrative.json';
import { getGeneratedEntry as loadGeneratedEntry, deleteGeneratedEntry } from '../storage/generatedStoryStorage';

const CASE_CONTENT = storyNarrative?.caseContent || {};

export const ROOT_PATH_KEY = 'ROOT';

// Chapter 1A is static, all other subchapters (1B, 1C, and chapters 2-12) are dynamically generated
const FIRST_FULLY_DYNAMIC_CHAPTER = 2;

/**
 * Check if a case number requires dynamic generation.
 * Chapter 1A is static; Chapter 1B, 1C, and all of chapters 2-12 are dynamic.
 */
export function isDynamicChapter(caseNumber) {
  if (!caseNumber) return false;
  const chapterSegment = caseNumber.slice(0, 3);
  const chapterNumber = parseInt(chapterSegment, 10);
  if (Number.isNaN(chapterNumber)) return false;

  // Chapters 2-12 are fully dynamic
  if (chapterNumber >= FIRST_FULLY_DYNAMIC_CHAPTER) return true;

  // Chapter 1: only subchapter A is static, B and C are dynamic
  if (chapterNumber === 1) {
    const subchapterLetter = caseNumber.slice(3, 4).toUpperCase();
    // 1B and 1C are dynamic, 1A is static
    return subchapterLetter === 'B' || subchapterLetter === 'C';
  }

  return false;
}

/**
 * Check if a case number is for static Chapter 1A content.
 * Used for special handling of the static opening chapter.
 */
export function isStaticChapter1A(caseNumber) {
  if (!caseNumber) return false;
  return caseNumber.toUpperCase() === '001A';
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
    if (chapterNumber >= FIRST_FULLY_DYNAMIC_CHAPTER) {
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

/**
 * Get story entry from cache or static content.
 *
 * TRUE INFINITE BRANCHING: When previousBranchingPath is provided, first checks
 * for speculatively cached content that was generated based on a specific
 * branching path from the previous subchapter (e.g., "1B-2C").
 *
 * @param {string} caseNumber - The case to retrieve (e.g., "002B")
 * @param {string} pathKey - The chapter-level path key (e.g., "ROOT", "A", "BA")
 * @param {string} previousBranchingPath - Optional: The previous subchapter's branching path (e.g., "1B-2C")
 */
export function getStoryEntry(caseNumber, pathKey, previousBranchingPath = null) {
  if (!caseNumber) return null;

  const normalizedKey = normalizeStoryPathKey(pathKey);

  // For dynamic chapters, check generated cache first
  if (isDynamicChapter(caseNumber)) {
    // TRUE INFINITE BRANCHING: First try speculative cache key if branchingPath provided
    if (previousBranchingPath) {
      const speculativeCacheKey = `${caseNumber}_${normalizedKey}_${previousBranchingPath}`;
      const speculativeCached = generatedCache[speculativeCacheKey];
      if (speculativeCached) {
        console.log(`[storyContent] Using speculatively cached content for ${caseNumber} (path: ${previousBranchingPath})`);
        return speculativeCached;
      }
    }

    // Standard cache key (no branching path)
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

/**
 * Get story metadata for a case.
 *
 * TRUE INFINITE BRANCHING: When previousBranchingPath is provided, checks for
 * speculatively cached content generated for that specific branching path.
 */
export function getStoryMeta(caseNumber, pathKey, previousBranchingPath = null) {
  const entry = getStoryEntry(caseNumber, pathKey, previousBranchingPath);
  if (!entry) return null;
  return {
    chapter: entry.chapter,
    subchapter: entry.subchapter,
    title: entry.title,
    bridgeText: entry.bridgeText,
    decision: entry.decision || null,
    // Include branchingNarrative if present (new interactive format)
    branchingNarrative: entry.branchingNarrative || null,
    // Legacy narrative for backwards compatibility
    narrative: entry.narrative || null,
  };
}

// ============================================================================
// ASYNC FUNCTIONS FOR DYNAMIC STORY GENERATION
// ============================================================================

// Note: generatedCache is declared above getStoryEntry for sync access

/**
 * Load generated story entry into cache
 *
 * TRUE INFINITE BRANCHING: When previousBranchingPath is provided, first checks
 * for speculatively cached content before loading from storage.
 */
async function loadToCache(caseNumber, pathKey, previousBranchingPath = null) {
  // TRUE INFINITE BRANCHING: First check for speculative cache entry
  if (previousBranchingPath) {
    const speculativeKey = `${caseNumber}_${pathKey}_${previousBranchingPath}`;
    if (generatedCache[speculativeKey]) {
      return generatedCache[speculativeKey];
    }
  }

  // Standard cache loading
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
 *
 * TRUE INFINITE BRANCHING: When previousBranchingPath is provided, first checks
 * for speculatively cached content that was generated for a specific branching path.
 *
 * @param {string} caseNumber - The case to retrieve
 * @param {string} pathKey - The chapter-level path key
 * @param {string} previousBranchingPath - Optional: Previous subchapter's branching path (e.g., "1B-2C")
 */
export async function getStoryEntryAsync(caseNumber, pathKey, previousBranchingPath = null) {
  if (!caseNumber) return null;

  // For Chapter 1 (static), use existing function
  if (!isDynamicChapter(caseNumber)) {
    return getStoryEntry(caseNumber, pathKey, previousBranchingPath);
  }

  // For dynamic chapters, try to load from generated storage (with speculative check)
  const normalizedKey = normalizeStoryPathKey(pathKey);
  const generated = await loadToCache(caseNumber, normalizedKey, previousBranchingPath);

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
 * TRUE INFINITE BRANCHING: Supports speculative cache lookup via previousBranchingPath.
 */
export async function getStoryMetaAsync(caseNumber, pathKey, previousBranchingPath = null) {
  const entry = await getStoryEntryAsync(caseNumber, pathKey, previousBranchingPath);
  if (!entry) return null;
  return {
    chapter: entry.chapter,
    subchapter: entry.subchapter,
    title: entry.title,
    bridgeText: entry.bridgeText,
    decision: entry.decision || null,
    // Include branchingNarrative if present (new interactive format)
    branchingNarrative: entry.branchingNarrative || null,
    // Legacy narrative for backwards compatibility
    narrative: entry.narrative || null,
  };
}

/**
 * Get branching narrative specifically
 */
export function getStoryBranchingNarrative(caseNumber, pathKey) {
  const entry = getStoryEntry(caseNumber, pathKey);
  return entry?.branchingNarrative || null;
}

/**
 * Async version of getStoryBranchingNarrative
 */
export async function getStoryBranchingNarrativeAsync(caseNumber, pathKey) {
  const entry = await getStoryEntryAsync(caseNumber, pathKey);
  return entry?.branchingNarrative || null;
}

/**
 * Update cache with newly generated content
 *
 * TRUE INFINITE BRANCHING: When speculativeBranchingPath is provided, the cache
 * key includes the branching path for speculative content lookup.
 *
 * @param {string} caseNumber - The case number (e.g., "002B")
 * @param {string} pathKey - The chapter-level path key (e.g., "ROOT")
 * @param {Object} entry - The story entry to cache
 * @param {string} speculativeBranchingPath - Optional: For speculative caching (e.g., "1B-2C")
 */
export function updateGeneratedCache(caseNumber, pathKey, entry, speculativeBranchingPath = null) {
  const normalizedKey = normalizeStoryPathKey(pathKey);
  const key = speculativeBranchingPath
    ? `${caseNumber}_${normalizedKey}_${speculativeBranchingPath}`
    : `${caseNumber}_${normalizedKey}`;
  generatedCache[key] = entry;
  if (speculativeBranchingPath) {
    console.log(`[storyContent] Speculatively cached ${caseNumber} for branching path ${speculativeBranchingPath}`);
  }
}

/**
 * Invalidate (delete) a specific cache entry, forcing regeneration on next access.
 * Used when we need to regenerate content with updated context (e.g., after branching choices are made).
 * Deletes from both in-memory cache and persistent storage.
 *
 * @param {string} caseNumber - The case number (e.g., "002B")
 * @param {string} pathKey - The chapter-level path key (e.g., "ROOT")
 * @returns {Promise<boolean>} True if an entry was deleted, false if no entry existed
 */
export async function invalidateCacheEntry(caseNumber, pathKey) {
  const normalizedKey = normalizeStoryPathKey(pathKey);
  const key = `${caseNumber}_${normalizedKey}`;

  let deleted = false;

  // Delete from in-memory cache
  if (generatedCache[key]) {
    delete generatedCache[key];
    deleted = true;
    console.log(`[storyContent] Invalidated in-memory cache for ${caseNumber} (path: ${normalizedKey})`);
  }

  // Delete from persistent storage
  try {
    const storageDeleted = await deleteGeneratedEntry(caseNumber, normalizedKey);
    if (storageDeleted) {
      deleted = true;
      console.log(`[storyContent] Invalidated persistent storage for ${caseNumber} (path: ${normalizedKey})`);
    }
  } catch (err) {
    console.warn(`[storyContent] Failed to delete from persistent storage: ${err.message}`);
  }

  return deleted;
}

/**
 * Build the "realized narrative" from a branchingNarrative based on player's actual choices.
 * This is the text the player actually experienced, NOT the canonical path.
 *
 * @param {Object} branchingNarrative - The full branching structure
 * @param {string} firstChoiceKey - The key of the first choice made (e.g., "1A", "1B", "1C")
 * @param {string} secondChoiceKey - The key of the second choice made (e.g., "1A-2A", "1B-2C")
 * @returns {string} The concatenated narrative text for the player's actual path
 */
export function buildRealizedNarrative(branchingNarrative, firstChoiceKey, secondChoiceKey) {
  if (!branchingNarrative) return '';

  const normalizeBranchPath = (firstKey, secondKey) => {
    const fk = String(firstKey || '').trim().toUpperCase();
    const sk = String(secondKey || '').trim().toUpperCase();
    if (!fk || !sk) return sk || fk || null;
    if (/^1[ABC]-2[ABC]$/.test(sk)) return sk;
    if (/^2[ABC]$/.test(sk) && /^1[ABC]$/.test(fk)) return `${fk}-${sk}`;
    return sk;
  };

  const parts = [];

  // Opening (shared by all paths)
  if (branchingNarrative.opening?.text) {
    parts.push(branchingNarrative.opening.text);
  }

  // First choice response
  if (branchingNarrative.firstChoice?.options && firstChoiceKey) {
    const firstOption = branchingNarrative.firstChoice.options.find(o => o.key === firstChoiceKey);
    if (firstOption?.response) {
      parts.push(firstOption.response);
    }
  }

  // Second choice response (ending)
  if (branchingNarrative.secondChoices && firstChoiceKey && secondChoiceKey) {
    // Find the secondChoice group that corresponds to the first choice
    const secondChoiceGroup = branchingNarrative.secondChoices.find(sc => sc.afterChoice === firstChoiceKey);
    if (secondChoiceGroup?.options) {
      const normalizedSecond = normalizeBranchPath(firstChoiceKey, secondChoiceKey);
      const secondOption = secondChoiceGroup.options.find((o) => (
        normalizeBranchPath(firstChoiceKey, o?.key) === normalizedSecond
      ));
      if (secondOption?.response) {
        parts.push(secondOption.response);
      }
    }
  }

  return parts.join('\n\n');
}

/**
 * Get the realized narrative for a specific case number based on stored branching choices.
 * Falls back to canonical narrative if no branching choices are stored.
 *
 * @param {string} caseNumber - The case number (e.g., "002A")
 * @param {string} pathKey - The path key for this case
 * @param {Array} branchingChoices - The player's stored branching choices
 * @returns {string} The narrative text the player actually experienced
 */
export function getRealizedNarrativeForCase(caseNumber, pathKey, branchingChoices = []) {
  const entry = getStoryEntry(caseNumber, pathKey);
  if (!entry) return '';

  // Check if we have branching choices for this case
  const branchingChoice = branchingChoices.find(bc => bc.caseNumber === caseNumber);

  if (branchingChoice && entry.branchingNarrative) {
    // Build from player's actual path
    return buildRealizedNarrative(
      entry.branchingNarrative,
      branchingChoice.firstChoice,
      branchingChoice.secondChoice
    );
  }

  // Fall back to canonical narrative
  return entry.narrative || '';
}

/**
 * Async version of getRealizedNarrativeForCase
 */
export async function getRealizedNarrativeForCaseAsync(caseNumber, pathKey, branchingChoices = []) {
  const entry = await getStoryEntryAsync(caseNumber, pathKey);
  if (!entry) return '';

  // Check if we have branching choices for this case
  const branchingChoice = branchingChoices.find(bc => bc.caseNumber === caseNumber);

  if (branchingChoice && entry.branchingNarrative) {
    // Build from player's actual path
    return buildRealizedNarrative(
      entry.branchingNarrative,
      branchingChoice.firstChoice,
      branchingChoice.secondChoice
    );
  }

  // Fall back to canonical narrative
  return entry.narrative || '';
}
