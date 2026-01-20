import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../../utils/llmTrace';
import { ABSOLUTE_FACTS, REVEAL_TIMING, STORY_STRUCTURE } from '../../data/storyBible';
import { DECISION_SUBCHAPTER } from './constants';
import { formatSubchapterLabel } from './helpers';

// ==========================================================================
// STORY ARC PLANNING - Generates high-level outline for 100% consistency
// ==========================================================================

/**
 * Generate or retrieve the story arc - called once at the start of dynamic generation
 * This ensures ALL 12 chapters follow a coherent narrative thread regardless of player choices
 *
 * PERSONALITY DRIFT HANDLING:
 * If the player's personality has shifted significantly since the arc was created,
 * we adapt the remaining (unplayed) chapters rather than fully regenerating.
 * This preserves narrative continuity while allowing the story to evolve with the player.
 */
async function ensureStoryArc(choiceHistory = []) {
  const currentPersonality = this._analyzePathPersonality(choiceHistory);
  const superPathKey = this._getSuperPathKey(choiceHistory);
  const arcKey = `arc_${superPathKey}`;

  // If we have an existing arc, check for personality drift
  if (this.storyArc) {
    const drift = this._detectPersonalityDrift(this.storyArc, currentPersonality, choiceHistory);

    if (drift.shouldAdapt) {
      log.debug('StoryGenerationService', `Personality drift: ${drift.from} -> ${drift.to} (magnitude: ${drift.magnitude.toFixed(1)})`);

      // Adapt the arc for the new personality (only future chapters)
      const currentChapter = Math.max(2, choiceHistory.length + 2); // Estimate current chapter
      const adaptedArc = await this._adaptStoryArcForDrift(this.storyArc, currentPersonality, currentChapter, choiceHistory);
      this.storyArc = adaptedArc;
      await this._saveStoryArc(adaptedArc.key, adaptedArc);
      return adaptedArc;
    }

    // No significant drift, return existing arc
    if (this.storyArc.key === arcKey) {
      return this.storyArc;
    }
  }

  // Check persistent storage
  const savedArc = await this._loadStoryArc(arcKey);
  if (savedArc) {
    // Check for drift against saved arc too
    const drift = this._detectPersonalityDrift(savedArc, currentPersonality, choiceHistory);
    if (drift.shouldAdapt) {
      log.debug('StoryGenerationService', `Personality drift from saved arc: ${drift.from} -> ${drift.to}`);
      const currentChapter = Math.max(2, choiceHistory.length + 2);
      const adaptedArc = await this._adaptStoryArcForDrift(savedArc, currentPersonality, currentChapter, choiceHistory);
      this.storyArc = adaptedArc;
      await this._saveStoryArc(adaptedArc.key, adaptedArc);
      return adaptedArc;
    }

    this.storyArc = savedArc;
    return savedArc;
  }

  // Build story arc from STORY_STRUCTURE data (no LLM call needed)
  log.debug('StoryGenerationService', `Building story arc for super-path: ${superPathKey}`);
  const storyArc = this._createStoryArc(superPathKey, choiceHistory);
  storyArc.personalitySnapshot = {
    riskTolerance: currentPersonality.riskTolerance,
    scores: currentPersonality.scores || { aggressive: 0, methodical: 0 },
    choiceCount: choiceHistory.length,
  };
  this.storyArc = storyArc;
  await this._saveStoryArc(arcKey, storyArc);
  return storyArc;
}

/**
 * Detect if player personality has drifted significantly from when the arc was created.
 *
 * Drift is significant when:
 * 1. Risk tolerance category has changed (low->high, high->low, or to/from moderate)
 * 2. Score magnitude has shifted by more than 20 points
 * 3. At least 2 new decisions have been made since arc creation
 */
function _detectPersonalityDrift(arc, currentPersonality, choiceHistory) {
  const snapshot = arc.personalitySnapshot;

  // No snapshot means old arc format - can't detect drift
  if (!snapshot) {
    return { shouldAdapt: false, magnitude: 0 };
  }

  const currentScores = currentPersonality.scores || { aggressive: 0, methodical: 0 };
  const snapshotScores = snapshot.scores || { aggressive: 0, methodical: 0 };

  // Calculate score drift magnitude
  const aggressiveDrift = currentScores.aggressive - snapshotScores.aggressive;
  const methodicalDrift = currentScores.methodical - snapshotScores.methodical;
  const magnitude = Math.abs(aggressiveDrift - methodicalDrift);

  // Check if risk tolerance category changed
  const categoryChanged = snapshot.riskTolerance !== currentPersonality.riskTolerance;

  // Require at least 2 new decisions to consider adaptation
  const newDecisions = choiceHistory.length - (snapshot.choiceCount || 0);
  const hasEnoughNewDecisions = newDecisions >= 2;

  // Determine if we should adapt
  // Threshold: category change OR significant score drift (>25 points)
  const significantDrift = magnitude > 25;
  const shouldAdapt = hasEnoughNewDecisions && (categoryChanged || significantDrift);

  return {
    shouldAdapt,
    magnitude,
    from: snapshot.riskTolerance,
    to: currentPersonality.riskTolerance,
    categoryChanged,
    newDecisions,
    aggressiveDrift,
    methodicalDrift,
  };
}

/**
 * Adapt the story arc for a personality shift without regenerating played chapters.
 *
 * This preserves:
 * - Chapter arcs that have already been played
 * - Core consistency anchors
 * - Character arc foundations
 *
 * This adapts:
 * - Future chapter focuses and tension levels
 * - Decision themes for upcoming choices
 * - Overall theme evolution
 */
async function _adaptStoryArcForDrift(originalArc, newPersonality, currentChapter, choiceHistory) {
  const newSuperPathKey = this._getSuperPathKey(choiceHistory);

  // Start with the original arc
  const adaptedArc = {
    ...originalArc,
    key: `arc_${newSuperPathKey}`,
    superPathKey: newSuperPathKey,
    previousSuperPathKey: originalArc.superPathKey,
    adaptedAt: new Date().toISOString(),
    adaptedFromChapter: currentChapter,
    personalitySnapshot: {
      riskTolerance: newPersonality.riskTolerance,
      scores: newPersonality.scores || { aggressive: 0, methodical: 0 },
      choiceCount: choiceHistory.length,
    },
  };

  // Adapt the overall theme to reflect personality evolution
  adaptedArc.overallTheme = this._adaptThemeForPersonality(
    originalArc.overallTheme,
    originalArc.superPathKey,
    newSuperPathKey
  );

  // Adapt future chapter arcs (preserve played chapters)
  if (adaptedArc.chapterArcs && Array.isArray(adaptedArc.chapterArcs)) {
    adaptedArc.chapterArcs = adaptedArc.chapterArcs.map(chapterArc => {
      // Don't modify chapters already played
      if (chapterArc.chapter < currentChapter) {
        return chapterArc;
      }

      // Adapt future chapters for new personality
      return this._adaptChapterArcForPersonality(chapterArc, newPersonality, originalArc.superPathKey);
    });
  }

  // Update character arcs to reflect evolution
  if (adaptedArc.characterArcs) {
    adaptedArc.characterArcs = {
      ...adaptedArc.characterArcs,
      jack: this._adaptJackArcForPersonality(
        adaptedArc.characterArcs.jack,
        newPersonality,
        currentChapter
      ),
    };
  }

  log.debug('StoryGenerationService', `Arc adapted: ${originalArc.superPathKey} -> ${newSuperPathKey}`);

  return adaptedArc;
}

/**
 * Adapt the overall theme when personality shifts
 */
function _adaptThemeForPersonality(originalTheme, oldPath, newPath) {
  // If shifting to aggressive, emphasize action and confrontation
  if (newPath === 'AGGRESSIVE' && oldPath !== 'AGGRESSIVE') {
    if (originalTheme.includes('patient') || originalTheme.includes('investigation')) {
      return originalTheme.replace(
        /patient investigation|careful investigation|truth-seeking/gi,
        'decisive action and hard truths'
      );
    }
    return `${originalTheme}, now driven by urgency and confrontation`;
  }

  // If shifting to methodical, emphasize evidence and patience
  if (newPath === 'METHODICAL' && oldPath !== 'METHODICAL') {
    if (originalTheme.includes('action') || originalTheme.includes('confrontation')) {
      return originalTheme.replace(
        /decisive action|confrontation|urgency/gi,
        'methodical truth-seeking'
      );
    }
    return `${originalTheme}, tempered by careful investigation`;
  }

  // Shifting to balanced
  if (newPath === 'BALANCED') {
    return `${originalTheme}, adapting approach as circumstances demand`;
  }

  return originalTheme;
}

/**
 * Adapt a single chapter arc for the new personality
 */
function _adaptChapterArcForPersonality(chapterArc, newPersonality, oldPath) {
  const adapted = { ...chapterArc };

  // Adjust tension levels based on personality
  if (newPersonality.riskTolerance === 'high') {
    // Aggressive players: higher tension, more confrontational focuses
    adapted.tensionLevel = Math.min(10, (chapterArc.tensionLevel || 5) + 1);
    if (adapted.decisionTheme) {
      adapted.decisionTheme = adapted.decisionTheme.replace(
        /wait|gather|investigate carefully/gi,
        'act decisively'
      );
    }
  } else if (newPersonality.riskTolerance === 'low') {
    // Methodical players: slightly lower tension, more investigation focus
    adapted.tensionLevel = Math.max(1, (chapterArc.tensionLevel || 5) - 1);
    if (adapted.decisionTheme) {
      adapted.decisionTheme = adapted.decisionTheme.replace(
        /confront|attack|force/gi,
        'investigate thoroughly'
      );
    }
  }

  // Add personality adaptation note
  adapted.personalityAdapted = true;
  adapted.adaptedForPath = newPersonality.riskTolerance;

  return adapted;
}

/**
 * Adapt Jack's character arc description for personality evolution
 */
function _adaptJackArcForPersonality(originalJackArc, newPersonality, currentChapter) {
  const phaseDescriptor = currentChapter <= 4 ? 'early' :
                          currentChapter <= 7 ? 'mid-story' :
                          currentChapter <= 10 ? 'late' : 'final';

  if (newPersonality.riskTolerance === 'high') {
    return `${originalJackArc}. In the ${phaseDescriptor} chapters, Jack's patience wears thin and he pushes harder for answers.`;
  } else if (newPersonality.riskTolerance === 'low') {
    return `${originalJackArc}. In the ${phaseDescriptor} chapters, Jack becomes more deliberate, building his case methodically.`;
  }

  return `${originalJackArc}. In the ${phaseDescriptor} chapters, Jack adapts his approach to the situation at hand.`;
}

/**
 * Create story arc structure for consistent chapter generation.
 * Uses STORY_STRUCTURE from storyBible.js for phases and beat types.
 */
function _createStoryArc(superPathKey, choiceHistory) {
  const personality = this._analyzePathPersonality(choiceHistory);
  const { protagonist, antagonist } = ABSOLUTE_FACTS;
  const { pacing, chapterBeatTypes } = STORY_STRUCTURE;

  // Customize theme based on player personality
  const theme = personality.riskTolerance === 'high'
    ? 'Redemption through decisive action and confrontation'
    : personality.riskTolerance === 'low'
      ? 'Redemption through patient investigation and truth-seeking'
      : 'Redemption through confronting past mistakes';

  // Helper to get phase from STORY_STRUCTURE.pacing
  const getPhase = (chapter) => {
    if (chapter <= 4) return pacing.chapters2to4.phase;
    if (chapter <= 7) return pacing.chapters5to7.phase;
    if (chapter <= 10) return pacing.chapters8to10.phase;
    return pacing.chapters11to12.phase;
  };

  // Helper to get beat type from STORY_STRUCTURE.chapterBeatTypes
  const getBeatType = (chapter) => chapterBeatTypes[chapter]?.type || 'INVESTIGATION';
  const revealLabel = REVEAL_TIMING?.underMap?.firstUndeniable?.label || `1${formatSubchapterLabel(DECISION_SUBCHAPTER)}`;

  return {
    key: `arc_${superPathKey}`,
    superPathKey,
    playerPersonality: personality.riskTolerance || 'balanced',
    overallTheme: theme,
    chapterArcs: [
      { chapter: 2, phase: getPhase(2), beatType: getBeatType(2), primaryFocus: 'First threshold and first anchor thread', tensionLevel: 4, endingHook: 'A glyph behaves like a rule', personalStakes: `${protagonist.fullName}'s grip on "normal" reality`, emotionalAnchor: 'The moment an ordinary place stops behaving like a place' },
      { chapter: 3, phase: getPhase(3), beatType: getBeatType(3), primaryFocus: `Second anchor thread; ${antagonist.trueName}'s rules sharpen`, tensionLevel: 5, endingHook: 'A warning arrives too soon', personalStakes: `${protagonist.fullName}'s trust in his own senses`, emotionalAnchor: 'Realizing someone is guiding his route' },
      { chapter: 4, phase: getPhase(4), beatType: getBeatType(4), primaryFocus: 'Containment pressure appears', tensionLevel: 6, endingHook: 'A site is sealed', personalStakes: `${protagonist.fullName}'s ability to keep working openly`, emotionalAnchor: 'Watching denial happen in real time' },
      { chapter: 5, phase: getPhase(5), beatType: getBeatType(5), primaryFocus: 'Pattern across anchors becomes undeniable', tensionLevel: 7, endingHook: 'A map that should not exist', personalStakes: `${protagonist.fullName}'s relationship with allies and with the city itself`, emotionalAnchor: 'A friend dodges the wrong question' },
      { chapter: 6, phase: getPhase(6), beatType: getBeatType(6), primaryFocus: 'Under-Map navigation and consequences', tensionLevel: 7, endingHook: 'A shortcut takes a price', personalStakes: `${protagonist.fullName}'s safety`, emotionalAnchor: 'Crossing a line that cannot be uncrossed' },
      { chapter: 7, phase: getPhase(7), beatType: getBeatType(7), primaryFocus: 'Containment forces tighten', tensionLevel: 8, endingHook: 'A witness vanishes', personalStakes: `${protagonist.fullName}'s moral line: protect a person vs chase a clue`, emotionalAnchor: 'Choosing what to save' },
      { chapter: 8, phase: getPhase(8), beatType: getBeatType(8), primaryFocus: `${antagonist.trueName}'s agenda surfaces`, tensionLevel: 8, endingHook: 'A demand, not a hint', personalStakes: `${protagonist.fullName}'s autonomy`, emotionalAnchor: 'Realizing the "help" is also a trap' },
      { chapter: 9, phase: getPhase(9), beatType: getBeatType(9), primaryFocus: 'Anchor nexus; symbols collide', tensionLevel: 9, endingHook: 'A threshold fails', personalStakes: `${protagonist.fullName}'s life and someone else's`, emotionalAnchor: 'A rescue attempt goes wrong' },
      { chapter: 10, phase: getPhase(10), beatType: getBeatType(10), primaryFocus: 'The mechanism behind the anchors', tensionLevel: 9, endingHook: 'The pattern names a culprit', personalStakes: `What ${protagonist.fullName} is willing to break`, emotionalAnchor: 'Accepting that rules can be weaponized' },
      { chapter: 11, phase: getPhase(11), beatType: getBeatType(11), primaryFocus: 'Final confrontation with containment', tensionLevel: 10, endingHook: 'Choose the city\'s shape', personalStakes: `${protagonist.fullName}'s identity: observer or participant`, emotionalAnchor: 'Owning the choice that changes everything' },
      { chapter: 12, phase: getPhase(12), beatType: getBeatType(12), primaryFocus: 'Consequences manifest', tensionLevel: 9, endingHook: 'A new map begins', personalStakes: `${protagonist.fullName}'s legacy and what he leaves open`, emotionalAnchor: 'A quiet cost paid in full' },
    ],
    characterArcs: {
      protagonist: `From skeptical pattern-hunter to Under-Map-literate investigator`,
      antagonist: `Guide who tests ${protagonist.fullName}'s capacity to read rules without becoming a weapon`,
    },
    consistencyAnchors: [
      `${protagonist.fullName} is ${protagonist.age} years old and does NOT start with Under-Map knowledge`,
      `${antagonist.trueName} guides ${protagonist.fullName} via dead letters, silver ink, and rules`,
      `The Under-Map is real; the first undeniable reveal happens at the end of ${revealLabel}`,
      'Glyphs behave like a language with constraints; do not "magic-system" explain - show',
      'Anchor disappearances form a deliberate pattern',
      `Only ${protagonist.fullName} and ${antagonist.trueName} are defined characters; LLM creates supporting characters as needed`,
    ],
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Collapse fine-grained branch history into a stable "super-path" label.
 * This is used to key story-arc planning so we don't regenerate arcs every chapter.
 */
function _getSuperPathKey(choiceHistory = []) {
  const personality = this._analyzePathPersonality(choiceHistory);
  if (personality?.riskTolerance === 'high') return 'AGGRESSIVE';
  if (personality?.riskTolerance === 'low') return 'METHODICAL';
  return 'BALANCED';
}

/**
 * Generate a chapter outline before generating individual subchapters
 * This ensures A, B, C subchapters flow seamlessly as one coherent chapter
 */
async function ensureChapterOutline(chapter, choiceHistory = []) {
  const chapterPathKey = this._getPathKeyForChapter(chapter, choiceHistory);
  const outlineKey = `outline_${chapter}_${chapterPathKey}`;

  // Check if we already have this outline
  if (this.chapterOutlines.has(outlineKey)) {
    return this.chapterOutlines.get(outlineKey);
  }

  // Ensure we have the story arc first
  await this.ensureStoryArc(choiceHistory);

  // Build chapter outline from STORY_STRUCTURE data (no LLM call needed)
  console.log(`[StoryGenerationService] Building chapter outline for Chapter ${chapter}`);
  const chapterOutline = this._createChapterOutline(chapter, chapterPathKey);
  this.chapterOutlines.set(outlineKey, chapterOutline);
  return chapterOutline;
}

/**
 * Create chapter outline structure using STORY_STRUCTURE from storyBible.js.
 * Provides consistent structure for story generation.
 */
function _createChapterOutline(chapter, pathKey) {
  const { protagonist, setting } = ABSOLUTE_FACTS;
  const { pacing, chapterBeatTypes } = STORY_STRUCTURE;

  // Get phase and beat type from STORY_STRUCTURE
  let pacingData;
  if (chapter <= 4) pacingData = pacing.chapters2to4;
  else if (chapter <= 7) pacingData = pacing.chapters5to7;
  else if (chapter <= 10) pacingData = pacing.chapters8to10;
  else pacingData = pacing.chapters11to12;

  const beatType = chapterBeatTypes[chapter] || { type: 'INVESTIGATION', description: 'Methodical evidence gathering' };
  const tensionLevel = Math.min(10, 4 + Math.floor(chapter / 2));

  return {
    chapter,
    pathKey,
    summary: `Chapter ${chapter}: ${protagonist.fullName} continues the investigation into the symbols and the hidden layer beneath ${setting.city}.`,
    openingMood: 'Mystery-thriller atmosphere with building unease',
    openingCausality: 'The chapter opens by showing the immediate consequence of the player\'s last decision (location, character reaction, and next action).',
    mustReference: [`${setting.city} damp/reflections`, `The jukebox below ${protagonist.fullName}'s office`, 'A dead letter with silver ink', 'One named character from the current investigation'],
    subchapterA: {
      focus: `Opening: ${beatType.description}`,
      keyBeats: [
        `${protagonist.fullName} reflects on recent discoveries`,
        'New information comes to light',
        'The investigation takes a turn',
      ],
      endingTransition: 'A lead demands immediate attention',
    },
    subchapterB: {
      focus: `Development: The mystery deepens`,
      keyBeats: [
        `${protagonist.fullName} pursues the new lead`,
        'Unexpected obstacles arise',
        'A piece of the puzzle falls into place',
      ],
      endingTransition: `${protagonist.fullName} faces a difficult choice`,
    },
    subchapterC: {
      focus: 'Climax: Decision point',
      keyBeats: [
        'Tensions reach a breaking point',
        'The truth demands a response',
        `${protagonist.fullName} must choose the path forward`,
      ],
      decisionSetup: 'A choice between two difficult paths',
    },
    tensionLevel,
    phase: pacingData.phase,
    beatType: beatType.type,
    consistencyAnchors: [
      `${protagonist.fullName} seeks the truth`,
      'The conspiracy runs deep',
      'Every choice has consequences',
    ],
    generatedAt: new Date().toISOString(),
  };
}

async function _loadStoryArc(arcKey) {
  try {
    const data = await AsyncStorage.getItem(`story_arc_${arcKey}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('[StoryGenerationService] Failed to load story arc:', error.message);
    return null;
  }
}

async function _saveStoryArc(arcKey, arc) {
  try {
    await AsyncStorage.setItem(`story_arc_${arcKey}`, JSON.stringify(arc));
  } catch (error) {
    console.warn('[StoryGenerationService] Failed to save story arc:', error);
  }
}

export const storyArcMethods = {
  ensureStoryArc,
  _detectPersonalityDrift,
  _adaptStoryArcForDrift,
  _adaptThemeForPersonality,
  _adaptChapterArcForPersonality,
  _adaptJackArcForPersonality,
  _createStoryArc,
  _getSuperPathKey,
  ensureChapterOutline,
  _createChapterOutline,
  _loadStoryArc,
  _saveStoryArc,
};
