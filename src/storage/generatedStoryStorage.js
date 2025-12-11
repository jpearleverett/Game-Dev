/**
 * Generated Story Storage
 *
 * Handles persistent storage for dynamically generated story content.
 * Ensures generated chapters are saved and can be retrieved across sessions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const GENERATED_STORY_KEY = 'detective_portrait_generated_story_v1';
const STORY_CONTEXT_KEY = 'detective_portrait_story_context_v1';

/**
 * Load all generated story content
 */
export async function loadGeneratedStory() {
  try {
    const raw = await AsyncStorage.getItem(GENERATED_STORY_KEY);
    if (!raw) {
      return createBlankGeneratedStory();
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[GeneratedStoryStorage] Failed to load:', error);
    return createBlankGeneratedStory();
  }
}

/**
 * Save a generated chapter
 */
export async function saveGeneratedChapter(caseNumber, pathKey, entry) {
  try {
    const current = await loadGeneratedStory();
    const key = `${caseNumber}_${pathKey}`;

    current.chapters[key] = entry;
    current.lastUpdated = new Date().toISOString();
    current.totalGenerated = Object.keys(current.chapters).length;

    await AsyncStorage.setItem(GENERATED_STORY_KEY, JSON.stringify(current));
    return true;
  } catch (error) {
    console.warn('[GeneratedStoryStorage] Failed to save chapter:', error);
    return false;
  }
}

/**
 * Get a specific generated entry
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
