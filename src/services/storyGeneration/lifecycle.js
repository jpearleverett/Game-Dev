import { loadGeneratedStory, getStoryContext } from '../../storage/generatedStoryStorage';
import { formatCaseNumber } from '../../data/storyContent';
import { DECISION_CONSEQUENCES } from './constants';

/**
 * Initialize the service and load any previously generated content
 * Also resets in-memory state that shouldn't persist across sessions
 */
async function init() {
  this.generatedStory = await loadGeneratedStory();
  this.storyContext = await getStoryContext();

  // Hydrate any persisted dynamic decision consequences back into memory so
  // choice-driven context remains stable across app restarts.
  if (this.storyContext?.decisionConsequencesByKey && typeof this.storyContext.decisionConsequencesByKey === 'object') {
    try {
      for (const [k, consequence] of Object.entries(this.storyContext.decisionConsequencesByKey)) {
        const [caseNumber, optionKey] = String(k).split('_');
        if (!caseNumber || !optionKey) continue;
        if (!DECISION_CONSEQUENCES[caseNumber]) DECISION_CONSEQUENCES[caseNumber] = {};
        if (!DECISION_CONSEQUENCES[caseNumber][optionKey]) {
          DECISION_CONSEQUENCES[caseNumber][optionKey] = consequence;
        }
        this.generatedConsequences.set(`${caseNumber}_${optionKey}`, consequence);
      }
    } catch (e) {
      console.warn('[StoryGenerationService] Failed to hydrate decision consequences from storyContext:', e?.message);
    }
  }

  // Reset thread acknowledgment counts on init to prevent stale data from affecting
  // validation when starting a new session or reloading the app
  this.threadAcknowledgmentCounts.clear();

  // Also clear generation attempts to give fresh retries
  this.generationAttempts.clear();

  return this;
}

/**
 * Prune stale in-memory Map entries to prevent memory leaks in long sessions
 * Called periodically during generation to clean up abandoned paths
 *
 * @param {string} currentPathKey - The player's current path (entries matching this are preserved)
 * @param {number} currentChapter - The player's current chapter
 */
function pruneInMemoryMaps(currentPathKey, currentChapter) {
  let prunedCount = 0;

  // Prune generationAttempts: remove entries for chapters far behind current chapter
  for (const [key] of this.generationAttempts) {
    // Keys are like "002A_ABABAB" - extract chapter from first 3 chars
    const chapterNum = parseInt(key.slice(0, 3)) || 0;
    // Remove attempts for chapters more than 2 behind (they won't be retried)
    if (chapterNum < currentChapter - 2) {
      this.generationAttempts.delete(key);
      prunedCount++;
    }
  }

  // Prune threadAcknowledgmentCounts: keep only reasonably recent entries
  // Threads older than 20 entries are likely from abandoned paths
  if (this.threadAcknowledgmentCounts.size > 50) {
    // Take the 30 most recent by keeping entries, delete the rest
    const entries = Array.from(this.threadAcknowledgmentCounts.entries());
    const toRemove = entries.slice(0, entries.length - 30);
    for (const [key] of toRemove) {
      this.threadAcknowledgmentCounts.delete(key);
      prunedCount++;
    }
  }

  // Prune consistencyCheckpoints: keep only checkpoints for recent chapters
  for (const [key] of this.consistencyCheckpoints) {
    // Keys are like "chapter_3_ABABAB"
    const match = key.match(/chapter_(\d+)/);
    if (match) {
      const chapterNum = parseInt(match[1]) || 0;
      // Keep only checkpoints within 3 chapters of current
      if (chapterNum < currentChapter - 3) {
        this.consistencyCheckpoints.delete(key);
        prunedCount++;
      }
    }
  }

  // Prune chapterOutlines: keep only recent outlines
  for (const [key] of this.chapterOutlines) {
    // Keys are like "outline_3_ABABAB"
    const match = key.match(/outline_(\d+)/);
    if (match) {
      const chapterNum = parseInt(match[1]) || 0;
      // Keep only outlines within 2 chapters of current
      if (chapterNum < currentChapter - 2) {
        this.chapterOutlines.delete(key);
        prunedCount++;
      }
    }
  }

  // Prune decisionConsequences: remove entries for old chapters
  for (const [key] of this.decisionConsequences) {
    // Keys are like "decision_2_A" or contain chapter references
    const match = key.match(/(\d+)/);
    if (match) {
      const chapterNum = parseInt(match[1]) || 0;
      if (chapterNum < currentChapter - 3) {
        this.decisionConsequences.delete(key);
        prunedCount++;
      }
    }
  }

  // Prune characterStates: limit to reasonable size (50 entries max)
  if (this.characterStates.size > 50) {
    const entries = Array.from(this.characterStates.entries());
    const toRemove = entries.slice(0, entries.length - 30);
    for (const [key] of toRemove) {
      this.characterStates.delete(key);
      prunedCount++;
    }
  }

  // Prune generatedConsequences: remove old chapter consequences
  for (const [key] of this.generatedConsequences) {
    const match = key.match(/(\d+)/);
    if (match) {
      const chapterNum = parseInt(match[1]) || 0;
      if (chapterNum < currentChapter - 3) {
        this.generatedConsequences.delete(key);
        prunedCount++;
      }
    }
  }

  // Prune stale pendingGenerations: remove any that are older than 5 minutes
  // (they likely failed silently or were abandoned)
  const now = Date.now();
  for (const [key, promise] of this.pendingGenerations) {
    // Check if promise has been resolved/rejected by adding a flag
    if (promise._createdAt && now - promise._createdAt > 5 * 60 * 1000) {
      this.pendingGenerations.delete(key);
      prunedCount++;
      console.log(`[StoryGenerationService] Pruned stale pending generation: ${key}`);
    }
  }

  if (prunedCount > 0) {
    console.log(`[StoryGenerationService] Pruned ${prunedCount} stale in-memory entries`);
  }

  return prunedCount;
}

/**
 * Destroy the service and clean up all resources
 * Call this when unmounting or resetting the application
 */
function destroy() {
  console.log('[StoryGenerationService] Destroying service and cleaning up resources...');

  // Clear all Maps
  this.pendingGenerations.clear();
  this.decisionConsequences.clear();
  this.characterStates.clear();
  this.threadAcknowledgmentCounts.clear();
  this.chapterOutlines.clear();
  this.consistencyCheckpoints.clear();
  this.generatedConsequences.clear();
  this.generationAttempts.clear();

  // Clear other state
  this.generatedStory = null;
  this.storyContext = null;
  this.storyArc = null;
  this.indexedFacts = null;
  this.consistencyLog = [];
  this.narrativeThreads = [];
  this.pathPersonality = null;
  this.dynamicPersonalityCache = { choiceHistoryHash: null, personality: null, timestamp: null };
  this.tokenUsage = { totalPromptTokens: 0, totalCachedTokens: 0, totalCompletionTokens: 0, totalTokens: 0, callCount: 0, sessionStart: Date.now() };
  this.isGenerating = false;

  // Clear dynamic clusters
  this._currentDynamicClusters = null;

  // Clear generation concurrency state
  // Reject any waiting generations to prevent hanging promises
  this.generationWaitQueue.forEach(({ reject, key }) => {
    reject(new Error(`Generation ${key} cancelled: service destroyed`));
  });
  this.generationWaitQueue = [];
  this.activeGenerationCount = 0;

  // Clear thread archive
  this.archivedThreads = [];

  console.log('[StoryGenerationService] Cleanup complete');
}

/**
 * Check if a specific chapter/subchapter needs generation
 */
function needsGeneration(chapter, subchapter, pathKey) {
  if (chapter <= 1) return false;
  const caseNumber = formatCaseNumber(chapter, subchapter);
  const key = `${caseNumber}_${pathKey}`;
  return !this.generatedStory?.chapters?.[key];
}

/**
 * Get generated story entry (or null if not generated)
 * First checks in-memory cache, then falls back to storage
 */
function getGeneratedEntry(caseNumber, pathKey) {
  if (!this.generatedStory?.chapters) return null;
  const key = `${caseNumber}_${pathKey}`;
  return this.generatedStory.chapters[key] || null;
}

/**
 * Get generated story entry with async storage fallback
 * Ensures entries are found even if not in memory cache
 */
async function getGeneratedEntryAsync(caseNumber, pathKey) {
  // First try in-memory cache
  const memoryEntry = this.getGeneratedEntry(caseNumber, pathKey);
  if (memoryEntry) return memoryEntry;

  // Fall back to storage
  const { getGeneratedEntry: getFromStorage } = await import('../../storage/generatedStoryStorage');
  const storageEntry = await getFromStorage(caseNumber, pathKey);

  // If found in storage, add to memory cache
  if (storageEntry && this.generatedStory?.chapters) {
    const key = `${caseNumber}_${pathKey}`;
    this.generatedStory.chapters[key] = storageEntry;
  }

  return storageEntry;
}

export const lifecycleMethods = {
  init,
  pruneInMemoryMaps,
  destroy,
  needsGeneration,
  getGeneratedEntry,
  getGeneratedEntryAsync,
};
