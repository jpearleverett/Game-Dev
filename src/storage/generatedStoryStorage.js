/**
 * Generated Story Storage
 *
 * Handles persistent storage for dynamically generated story content.
 * Ensures generated chapters are saved and can be retrieved across sessions.
 *
 * Uses a write lock to prevent race conditions when multiple saves happen concurrently.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const GENERATED_STORY_KEY = 'detective_portrait_generated_story_v1';
const STORY_CONTEXT_KEY = 'detective_portrait_story_context_v1';

// ============================================================================
// WRITE LOCK - Prevents race conditions in concurrent saves
// ============================================================================

/**
 * Simple mutex implementation for storage writes
 * Ensures only one write operation happens at a time
 */
class StorageWriteLock {
  constructor() {
    this._locked = false;
    this._queue = [];
  }

  async acquire() {
    return new Promise((resolve) => {
      if (!this._locked) {
        this._locked = true;
        resolve();
      } else {
        this._queue.push(resolve);
      }
    });
  }

  release() {
    if (this._queue.length > 0) {
      const next = this._queue.shift();
      next();
    } else {
      this._locked = false;
    }
  }

  /**
   * Execute a function with the lock held
   * Automatically releases lock when done (even on error)
   */
  async withLock(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

// Singleton lock instance for all storage operations
const storyWriteLock = new StorageWriteLock();

// ============================================================================
// IN-MEMORY CACHE - Reduces deserialization overhead on repeated reads
// ============================================================================

/**
 * In-memory cache for the generated story
 * Reduces AsyncStorage reads and JSON parse operations
 */
let storyCache = null;
let storyCacheTimestamp = 0;
const CACHE_TTL_MS = 30000; // Cache valid for 30 seconds
let pendingFlush = null; // Debounced flush promise
let isDirty = false; // Track if cache has unwritten changes

/**
 * Invalidate the cache (call after external modifications)
 */
export function invalidateStoryCache() {
  storyCache = null;
  storyCacheTimestamp = 0;
}

/**
 * Load all generated story content
 * Uses in-memory cache to reduce deserialization overhead
 */
export async function loadGeneratedStory() {
  // Return cached version if still valid
  const now = Date.now();
  if (storyCache && (now - storyCacheTimestamp) < CACHE_TTL_MS) {
    return storyCache;
  }

  try {
    const raw = await AsyncStorage.getItem(GENERATED_STORY_KEY);
    if (!raw) {
      storyCache = createBlankGeneratedStory();
    } else {
      storyCache = JSON.parse(raw);
    }
    storyCacheTimestamp = now;
    isDirty = false;
    return storyCache;
  } catch (error) {
    console.warn('[GeneratedStoryStorage] Failed to load:', error);
    return createBlankGeneratedStory();
  }
}

/**
 * Flush cache to storage (debounced to reduce write frequency)
 */
async function flushCacheToStorage() {
  if (!storyCache || !isDirty) return;

  try {
    await AsyncStorage.setItem(GENERATED_STORY_KEY, JSON.stringify(storyCache));
    isDirty = false;
    console.log('[GeneratedStoryStorage] Cache flushed to storage');
  } catch (error) {
    console.warn('[GeneratedStoryStorage] Failed to flush cache:', error);
  }
}

/**
 * Schedule a debounced flush (consolidates multiple rapid saves)
 */
function scheduleDebouncedFlush() {
  if (pendingFlush) return pendingFlush;

  pendingFlush = new Promise((resolve) => {
    setTimeout(async () => {
      await flushCacheToStorage();
      pendingFlush = null;
      resolve();
    }, 500); // 500ms debounce
  });

  return pendingFlush;
}

/**
 * Optimize entry for storage by stripping fields that are only needed during generation
 * This reduces storage size without affecting gameplay
 */
function optimizeEntryForStorage(entry) {
  // Create a shallow copy to avoid mutating the original
  const optimized = { ...entry };

  // Remove consistencyFacts - only used during generation validation, not needed for playback
  if (optimized.consistencyFacts) {
    delete optimized.consistencyFacts;
  }

  // Compact continuity metadata to reduce storage growth.
  // These fields ARE important for future generation context, so we keep them but cap size.
  if (Array.isArray(optimized.narrativeThreads)) {
    optimized.narrativeThreads = optimized.narrativeThreads.slice(-25);
  }
  if (Array.isArray(optimized.previousThreadsAddressed)) {
    optimized.previousThreadsAddressed = optimized.previousThreadsAddressed
      .slice(-15)
      .map((t) => ({
        originalThread: t?.originalThread || '',
        howAddressed: t?.howAddressed || 'acknowledged',
        narrativeReference: (t?.narrativeReference || '').slice(0, 200),
      }));
  }

  // Optimize board data if present
  if (optimized.board) {
    const optimizedBoard = { ...optimized.board };

    // Remove outlierTheme.summary - it's just the first 100 chars of narrative (which we already store)
    if (optimizedBoard.outlierTheme?.summary) {
      optimizedBoard.outlierTheme = {
        name: optimizedBoard.outlierTheme.name,
        icon: optimizedBoard.outlierTheme.icon,
        // summary can be reconstructed from narrative if needed
      };
    }

    // For branchingOutlierSets, strip auto-generated descriptions (can be reconstructed)
    if (optimizedBoard.branchingOutlierSets) {
      optimizedBoard.branchingOutlierSets = optimizedBoard.branchingOutlierSets.map(set => {
        const optimizedSet = { ...set };
        // Keep theme but strip descriptions - they're auto-generated from title
        delete optimizedSet.descriptions;
        return optimizedSet;
      });
    }

    optimized.board = optimizedBoard;
  }

  return optimized;
}

/**
 * Save a generated chapter
 * Uses write lock and in-memory cache for better performance
 * Debounces storage writes for rapid successive saves
 */
export async function saveGeneratedChapter(caseNumber, pathKey, entry) {
  return storyWriteLock.withLock(async () => {
    try {
      // Load into cache if not already there
      if (!storyCache) {
        await loadGeneratedStory();
      }

      const key = `${caseNumber}_${pathKey}`;

      // Only update if the entry doesn't already exist or is newer
      const existingEntry = storyCache.chapters[key];
      if (existingEntry && existingEntry.generatedAt && entry.generatedAt) {
        if (new Date(existingEntry.generatedAt) >= new Date(entry.generatedAt)) {
          console.log(`[GeneratedStoryStorage] Skipping save for ${key} - existing entry is newer or same`);
          return true; // Already have this or newer
        }
      }

      // Optimize entry for storage to reduce size
      const optimizedEntry = optimizeEntryForStorage(entry);

      // Update cache with optimized entry
      storyCache.chapters[key] = optimizedEntry;
      storyCache.lastUpdated = new Date().toISOString();
      storyCache.totalGenerated = Object.keys(storyCache.chapters).length;
      isDirty = true;

      // Immediate write for important data (decision subchapters)
      // Debounced write for other updates
      if (entry.decision || entry.subchapter === 3) {
        await flushCacheToStorage();
      } else {
        scheduleDebouncedFlush();
      }

      // Auto-prune if storage utilization is high (async, don't block save)
      const currentChapter = entry.chapter || 2;
      autoPruneIfNeeded(pathKey, currentChapter, 80).then(result => {
        if (result.prunedCount > 0) {
          console.log(`[GeneratedStoryStorage] Auto-pruned ${result.prunedCount} entries after save`);
        }
      }).catch(err => {
        console.warn('[GeneratedStoryStorage] Auto-prune error:', err);
      });

      return true;
    } catch (error) {
      console.warn('[GeneratedStoryStorage] Failed to save chapter:', error);
      return false;
    }
  });
}

/**
 * Force flush any pending writes (call before app close or navigation)
 */
export async function flushPendingWrites() {
  if (isDirty) {
    await storyWriteLock.withLock(flushCacheToStorage);
  }
}

/**
 * Get a specific generated entry
 * Uses cached data when available
 */
export async function getGeneratedEntry(caseNumber, pathKey) {
  try {
    const story = await loadGeneratedStory();
    const key = `${caseNumber}_${pathKey}`;
    return story.chapters[key] || null;
  } catch (error) {
    console.warn('[GeneratedStoryStorage] Failed to get entry:', error);
    return null;
  }
}

/**
 * Check if a chapter/subchapter has been generated
 */
export async function hasGeneratedEntry(caseNumber, pathKey) {
  const entry = await getGeneratedEntry(caseNumber, pathKey);
  return entry !== null;
}

/**
 * Clear all generated story content (for restart)
 */
export async function clearGeneratedStory() {
  try {
    await AsyncStorage.removeItem(GENERATED_STORY_KEY);
    await AsyncStorage.removeItem(STORY_CONTEXT_KEY);
    // Invalidate cache after clearing storage
    invalidateStoryCache();
    isDirty = false;
    return true;
  } catch (error) {
    console.warn('[GeneratedStoryStorage] Failed to clear:', error);
    return false;
  }
}

/**
 * Load story context (character tracking, plot points, etc.)
 */
export async function getStoryContext() {
  try {
    const raw = await AsyncStorage.getItem(STORY_CONTEXT_KEY);
    if (!raw) {
      return createBlankStoryContext();
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[GeneratedStoryStorage] Failed to load context:', error);
    return createBlankStoryContext();
  }
}

/**
 * Save story context
 */
export async function saveStoryContext(context) {
  try {
    await AsyncStorage.setItem(STORY_CONTEXT_KEY, JSON.stringify(context));
    return true;
  } catch (error) {
    console.warn('[GeneratedStoryStorage] Failed to save context:', error);
    return false;
  }
}

/**
 * Get all generated chapters in order
 */
export async function getAllGeneratedChaptersInOrder() {
  const story = await loadGeneratedStory();
  const entries = Object.values(story.chapters);

  // Sort by chapter, then subchapter
  return entries.sort((a, b) => {
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.subchapter - b.subchapter;
  });
}

/**
 * Get generation statistics
 */
export async function getGenerationStats() {
  const story = await loadGeneratedStory();
  const entries = Object.values(story.chapters);

  const totalWords = entries.reduce((sum, e) => sum + (e.wordCount || 0), 0);
  const chaptersWithDecisions = entries.filter(e => e.decision).length;

  return {
    totalChaptersGenerated: entries.length,
    totalWordsGenerated: totalWords,
    averageWordsPerChapter: entries.length > 0 ? Math.round(totalWords / entries.length) : 0,
    chaptersWithDecisions,
    lastGenerated: story.lastUpdated,
  };
}

/**
 * Export generated story for backup
 */
export async function exportGeneratedStory() {
  const story = await loadGeneratedStory();
  const context = await getStoryContext();

  return {
    story,
    context,
    exportedAt: new Date().toISOString(),
    version: 1,
  };
}

/**
 * Import generated story from backup
 */
export async function importGeneratedStory(backup) {
  try {
    if (!backup?.story?.chapters) {
      throw new Error('Invalid backup format');
    }

    await AsyncStorage.setItem(GENERATED_STORY_KEY, JSON.stringify(backup.story));

    if (backup.context) {
      await AsyncStorage.setItem(STORY_CONTEXT_KEY, JSON.stringify(backup.context));
    }

    return true;
  } catch (error) {
    console.warn('[GeneratedStoryStorage] Failed to import:', error);
    return false;
  }
}

// ============================================================================
// STORAGE PRUNING STRATEGY - Prevents AsyncStorage quota exhaustion
// ============================================================================

/**
 * Maximum storage size in bytes (4MB to stay well under iOS 6MB limit)
 */
const MAX_STORAGE_BYTES = 4 * 1024 * 1024;

/**
 * Get current storage size estimate
 */
export async function getStorageSize() {
  try {
    const story = await loadGeneratedStory();
    const context = await getStoryContext();

    const storySize = JSON.stringify(story).length;
    const contextSize = JSON.stringify(context).length;

    return {
      storySize,
      contextSize,
      totalSize: storySize + contextSize,
      maxSize: MAX_STORAGE_BYTES,
      utilizationPercent: Math.round(((storySize + contextSize) / MAX_STORAGE_BYTES) * 100),
    };
  } catch (error) {
    console.warn('[GeneratedStoryStorage] Failed to get storage size:', error);
    return { totalSize: 0, maxSize: MAX_STORAGE_BYTES, utilizationPercent: 0 };
  }
}

/**
 * Prune old generated content to stay under storage limits
 * Strategy: Keep recent chapters and the player's current path, prune alternative paths
 *
 * @param {string} currentPathKey - The player's current path key (to preserve)
 * @param {number} currentChapter - The player's current chapter number
 * @param {number} maxSizeBytes - Maximum allowed storage size
 * @returns {Object} - Pruning results { prunedCount, freedBytes, newSize }
 */
export async function pruneOldGenerations(currentPathKey, currentChapter, maxSizeBytes = MAX_STORAGE_BYTES) {
  try {
    const story = await loadGeneratedStory();
    const entries = Object.entries(story.chapters);

    if (entries.length === 0) {
      return { prunedCount: 0, freedBytes: 0, newSize: 0 };
    }

    const initialSize = JSON.stringify(story).length;

    // If under limit, no pruning needed
    if (initialSize <= maxSizeBytes) {
      console.log('[GeneratedStoryStorage] Storage under limit, no pruning needed');
      return { prunedCount: 0, freedBytes: 0, newSize: initialSize };
    }

    console.log(`[GeneratedStoryStorage] Storage at ${initialSize} bytes, pruning to ${maxSizeBytes}`);

    // Score each entry for preservation priority
    const scoredEntries = entries.map(([key, entry]) => {
      let score = 0;

      // Higher score = more important to keep

      // Always keep very recent chapters across ALL paths.
      // This prevents accidental pruning of the player's real path when we prefetch/save
      // alternative branches (where the "currentPathKey" used for pruning might not match
      // the active playthrough).
      const entryChapter = entry.chapter || 1;
      const chapterDistance = Math.abs(currentChapter - entryChapter);
      if (chapterDistance <= 2) {
        score += 600; // pushes above the "never prune" threshold
      }

      // Current path gets highest priority
      // With cumulative branch keys, earlier chapters will have shorter prefix keys.
      // Preserve any entry whose path key is a prefix of the current path.
      const entryPathKey = typeof key === 'string' && key.includes('_') ? key.split('_').slice(1).join('_') : '';
      if (currentPathKey && entryPathKey) {
        if (String(currentPathKey).startsWith(String(entryPathKey))) {
          score += 1000;
        } else if (String(entryPathKey).startsWith(String(currentPathKey))) {
          // Also keep if it is a child/continuation path (rare, but safe)
          score += 500;
        }
      }

      // Recent chapters are more important
      score += (12 - chapterDistance) * 10; // Closer chapters score higher

      // Subchapter C (decision points) are more important
      if (entry.subchapter === 3) {
        // Decision points are continuity anchors; keep aggressively.
        score += 650;
      }

      // Recently generated content is more important
      const generatedAt = entry.generatedAt ? new Date(entry.generatedAt).getTime() : 0;
      const age = Date.now() - generatedAt;
      const ageHours = age / (1000 * 60 * 60);
      score += Math.max(0, 100 - ageHours); // Newer content scores higher

      // Fallback content is less important
      if (entry.isFallback) {
        score -= 200;
      }

      return { key, entry, score, size: JSON.stringify(entry).length };
    });

    // Sort by score (lowest first - these will be pruned first)
    scoredEntries.sort((a, b) => a.score - b.score);

    // Prune lowest-scored entries until we're under the limit
    let currentSize = initialSize;
    let prunedCount = 0;
    const prunedKeys = [];

    for (const { key, size, score } of scoredEntries) {
      if (currentSize <= maxSizeBytes) {
        break;
      }

      // Never prune entries with very high scores (current path, very recent)
      if (score > 500) {
        console.log(`[GeneratedStoryStorage] Skipping high-priority entry: ${key} (score: ${score})`);
        continue;
      }

      // Prune this entry
      delete story.chapters[key];
      currentSize -= size;
      prunedCount++;
      prunedKeys.push(key);

      console.log(`[GeneratedStoryStorage] Pruned: ${key} (${size} bytes, score: ${score})`);
    }

    // Save the pruned story
    if (prunedCount > 0) {
      story.totalGenerated = Object.keys(story.chapters).length;
      story.lastPruned = new Date().toISOString();
      await AsyncStorage.setItem(GENERATED_STORY_KEY, JSON.stringify(story));
    }

    const freedBytes = initialSize - currentSize;
    console.log(`[GeneratedStoryStorage] Pruned ${prunedCount} entries, freed ${freedBytes} bytes`);

    return {
      prunedCount,
      freedBytes,
      newSize: currentSize,
      prunedKeys,
    };
  } catch (error) {
    console.error('[GeneratedStoryStorage] Failed to prune:', error);
    return { prunedCount: 0, freedBytes: 0, newSize: 0, error: error.message };
  }
}

/**
 * Auto-prune if storage is above threshold
 * Called automatically after saving new content
 *
 * @param {string} currentPathKey - The player's current path key
 * @param {number} currentChapter - The player's current chapter number
 * @param {number} thresholdPercent - Trigger pruning above this utilization (default 80%)
 */
export async function autoPruneIfNeeded(currentPathKey, currentChapter, thresholdPercent = 80) {
  try {
    const { utilizationPercent, totalSize } = await getStorageSize();

    if (utilizationPercent >= thresholdPercent) {
      console.log(`[GeneratedStoryStorage] Auto-pruning triggered at ${utilizationPercent}% utilization`);

      // Target 60% utilization after pruning
      const targetSize = Math.floor(MAX_STORAGE_BYTES * 0.6);
      return await pruneOldGenerations(currentPathKey, currentChapter, targetSize);
    }

    return { prunedCount: 0, freedBytes: 0, newSize: totalSize };
  } catch (error) {
    console.warn('[GeneratedStoryStorage] Auto-prune check failed:', error);
    return { prunedCount: 0, freedBytes: 0, error: error.message };
  }
}

/**
 * Compact storage by removing null/undefined values and optimizing structure
 */
export async function compactStorage() {
  try {
    const story = await loadGeneratedStory();

    // Remove entries with null/undefined narratives
    const validEntries = Object.entries(story.chapters).filter(([, entry]) => {
      return entry && entry.narrative && entry.narrative.length > 0;
    });

    const compactedStory = {
      ...story,
      chapters: Object.fromEntries(validEntries),
      totalGenerated: validEntries.length,
      lastCompacted: new Date().toISOString(),
    };

    await AsyncStorage.setItem(GENERATED_STORY_KEY, JSON.stringify(compactedStory));

    const originalCount = Object.keys(story.chapters).length;
    const newCount = validEntries.length;

    return {
      removed: originalCount - newCount,
      remaining: newCount,
    };
  } catch (error) {
    console.warn('[GeneratedStoryStorage] Failed to compact:', error);
    return { removed: 0, remaining: 0, error: error.message };
  }
}

/**
 * Create blank generated story structure
 */
export function createBlankGeneratedStory() {
  return {
    chapters: {},
    lastUpdated: null,
    totalGenerated: 0,
    version: 1,
  };
}

/**
 * Create blank story context
 */
export function createBlankStoryContext() {
  return {
    // Track characters introduced in the story
    characters: {
      // Character name -> { firstAppearance, role, status, notes }
    },

    // Major plot points that have occurred
    plotPoints: [
      // { chapter, subchapter, event, significance }
    ],

    // Revelations made to the player
    revelations: [
      // { chapter, what, impact }
    ],

    // Relationship states
    relationships: {
      // character -> { trust: number, status: string }
    },

    // Items/evidence collected
    evidence: [
      // { name, foundIn, significance }
    ],

    // Locations visited
    locations: [
      // { name, firstVisit, significance }
    ],

    // Key narrative threads to maintain
    activeThreads: [
      // { name, introduced, status, resolution }
    ],

    // Generation metadata
    lastGeneratedChapter: null,
    lastGeneratedSubchapter: null,
    lastPathKey: null,

    // Persisted decision consequences (lightweight) so choice causality survives restarts
    // key format: "${caseNumber}_${optionKey}" => { immediate, ongoing, characterImpact }
    decisionConsequencesByKey: {},

    // Persisted consistency facts keyed by cumulative branch key.
    // This prevents branch-bleed when we prefetch both paths (e.g. "BA" vs "BB").
    // Shape: { [pathKey]: { facts: string[], updatedAt: isoString } }
    consistencyFactsByPathKey: {},
    // Backward-compatibility for older installs (was a single rolling array).
    // New code should prefer consistencyFactsByPathKey.
    consistencyFacts: [],

    version: 1,
  };
}

/**
 * Update character tracking in context
 */
export async function updateCharacterInContext(characterName, updates) {
  const context = await getStoryContext();

  context.characters[characterName] = {
    ...context.characters[characterName],
    ...updates,
  };

  await saveStoryContext(context);
}

/**
 * Add plot point to context
 */
export async function addPlotPoint(chapter, subchapter, event, significance) {
  const context = await getStoryContext();

  context.plotPoints.push({
    chapter,
    subchapter,
    event,
    significance,
    addedAt: new Date().toISOString(),
  });

  await saveStoryContext(context);
}

/**
 * Get narrative summary for LLM context
 */
export async function getNarrativeSummary() {
  const context = await getStoryContext();
  const story = await loadGeneratedStory();

  // Build a summary of all key story elements
  let summary = 'STORY STATE:\n\n';

  // Characters
  if (Object.keys(context.characters).length > 0) {
    summary += 'CHARACTERS:\n';
    for (const [name, info] of Object.entries(context.characters)) {
      summary += `- ${name}: ${info.role || 'unknown role'}, ${info.status || 'status unknown'}\n`;
    }
    summary += '\n';
  }

  // Major plot points
  if (context.plotPoints.length > 0) {
    summary += 'KEY EVENTS:\n';
    context.plotPoints.slice(-10).forEach(pp => {
      summary += `- Chapter ${pp.chapter}.${pp.subchapter}: ${pp.event}\n`;
    });
    summary += '\n';
  }

  // Active threads
  if (context.activeThreads?.length > 0) {
    summary += 'UNRESOLVED THREADS:\n';
    context.activeThreads
      .filter(t => t.status !== 'resolved')
      .forEach(t => {
        summary += `- ${t.name}: ${t.status || 'ongoing'}\n`;
      });
  }

  return summary;
}
