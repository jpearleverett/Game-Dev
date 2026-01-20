import { log } from '../../utils/llmTrace';
import {
  buildRealizedNarrative,
  formatCaseNumber,
  getStoryEntry,
} from '../../data/storyContent';
import {
  ABSOLUTE_FACTS,
  CONSISTENCY_RULES,
  REVEAL_TIMING,
} from '../../data/storyBible';
import { DECISION_CONSEQUENCES, DECISION_SUBCHAPTER, SUBCHAPTERS_PER_CHAPTER } from './constants';
import { formatSubchapterLabel } from './helpers';

// ==========================================================================
// CONTEXT BUILDING - Full story context for 1M token window
// ==========================================================================

/**
 * Build comprehensive story context with FULL story history
 * With 1M token context window, we include ALL previous content without truncation
 * Ensures proper continuation from exactly where the previous subchapter ended
 *
 * @param {number} targetChapter - Chapter to generate
 * @param {number} targetSubchapter - Subchapter to generate
 * @param {string} pathKey - Path key for branching
 * @param {Array} choiceHistory - Chapter-level decision history
 * @param {Array} branchingChoices - Intra-subchapter branching choices for true infinite branching
 */
async function buildStoryContext(targetChapter, targetSubchapter, pathKey, choiceHistory = [], branchingChoices = []) {
  // Ensure service is initialized and has loaded story from storage
  if (!this.generatedStory) {
    console.log('[StoryGenerationService] Service not initialized, loading story from storage...');
    await this.init();
  }

  // Analyze player's path personality for narrative consistency
  // Use dynamic LLM-based classification for richer personality insights
  // Falls back to keyword-based analysis if LLM fails
  let pathPersonality;
  try {
    pathPersonality = await this._classifyPersonalityDynamic(choiceHistory);
  } catch (error) {
    console.warn('[StoryGenerationService] Dynamic personality classification failed, using keyword fallback');
    pathPersonality = this._analyzePathPersonality(choiceHistory);
  }
  this.pathPersonality = pathPersonality;

  // Build cumulative decision consequences
  const decisionConsequences = this._buildDecisionConsequences(choiceHistory);

  const context = {
    foundation: this._buildFoundationContext(),
    previousChapters: [],
    playerChoices: [],
    currentPosition: {
      chapter: targetChapter,
      subchapter: targetSubchapter,
      pathKey,
    },
    establishedFacts: [], // Track facts that must remain consistent
    pathPersonality, // Player's cumulative decision pattern
    decisionConsequences, // Ongoing effects of choices
    narrativeThreads: [], // Active story threads to maintain
  };

  // Branching narrative path formatting helper.
  // Our stored `secondChoice` is expected to be the full key (e.g., "1B-2C").
  // Logging it as `${firstChoice}-${secondChoice}` can produce confusing doubles like "1B-1B-2C".
  const formatBranchingPath = (firstChoice, secondChoice) => {
    const first = String(firstChoice || '').trim();
    const second = String(secondChoice || '').trim();
    if (!first && !second) return null;
    if (first && second && second.startsWith(`${first}-`)) return second;
    return first && second ? `${first}-${second}` : (second || first);
  };

  // Add Chapter 1A content (static) - FULL TEXT
  // Note: Only 1A is static; 1B and 1C are dynamically generated
  const chapter1AEntry = getStoryEntry('001A', 'ROOT');
  if (chapter1AEntry) {
    // Check if we have branching choices for 001A - use REALIZED narrative
    const branchingChoice1A = branchingChoices.find(bc => bc.caseNumber === '001A');
    let narrativeText1A = chapter1AEntry.narrative; // Default to canonical

    if (branchingChoice1A && chapter1AEntry.branchingNarrative) {
      // Build the ACTUAL narrative the player experienced
      narrativeText1A = buildRealizedNarrative(
        chapter1AEntry.branchingNarrative,
        branchingChoice1A.firstChoice,
        branchingChoice1A.secondChoice
      );
      console.log(`[StoryGenerationService] Using realized narrative for 001A: path ${formatBranchingPath(branchingChoice1A.firstChoice, branchingChoice1A.secondChoice)}`);
    }

    context.previousChapters.push({
      chapter: 1,
      subchapter: 1,
      pathKey: 'ROOT',
      title: chapter1AEntry.title || 'Chapter 1.1',
      narrative: narrativeText1A,
      decision: chapter1AEntry.decision || null,
      pathDecisions: chapter1AEntry.pathDecisions || null, // Store path-specific decisions for proper lookup
      chapterSummary: chapter1AEntry.chapterSummary || null,
      branchingPath: branchingChoice1A ? formatBranchingPath(branchingChoice1A.firstChoice, branchingChoice1A.secondChoice) : null,
      isRecent: true, // Mark as recent to include full text
    });
  }

  // Add Chapter 1B and 1C (dynamically generated) - FULL TEXT
  // These are loaded from generated storage just like chapters 2+
  // IMPORTANT: Only include them when generating chapters AFTER Chapter 1.
  // For Chapter 1 generation, current-chapter logic below handles prior subchapters.
  if (targetChapter > 1) {
    for (let sub = 2; sub <= SUBCHAPTERS_PER_CHAPTER; sub++) {
      const caseNum = formatCaseNumber(1, sub);
      const entry = await this.getGeneratedEntryAsync(caseNum, 'ROOT');
      if (entry) {
        // Check if we have branching choices for this case - use REALIZED narrative
        const branchingChoice = branchingChoices.find(bc => bc.caseNumber === caseNum);
        let narrativeText = entry.narrative; // Default to canonical

        if (branchingChoice && entry.branchingNarrative) {
          // Build the ACTUAL narrative the player experienced
          narrativeText = buildRealizedNarrative(
            entry.branchingNarrative,
            branchingChoice.firstChoice,
            branchingChoice.secondChoice
          );
          log.debug('StoryGenerationService', `Using realized narrative for ${caseNum}: path ${formatBranchingPath(branchingChoice.firstChoice, branchingChoice.secondChoice)}`);
        }

        if (narrativeText) {
          context.previousChapters.push({
            chapter: 1,
            subchapter: sub,
            pathKey: 'ROOT',
            title: entry.title || `Chapter 1.${sub}`,
            narrative: narrativeText,
            decision: entry.decision || null,
            pathDecisions: entry.pathDecisions || null, // Store path-specific decisions for proper lookup
            chapterSummary: entry.chapterSummary || null,
            branchingPath: branchingChoice ? formatBranchingPath(branchingChoice.firstChoice, branchingChoice.secondChoice) : null,
            isRecent: true, // Mark as recent to include full text
          });
        }
      } else {
        console.warn(`[StoryGenerationService] Missing chapter 1.${sub} (${caseNum}) - may need to be generated`);
      }
    }
  }

  // Add ALL generated chapters 2 onwards - FULL TEXT, NO TRUNCATION
  // Use async method to ensure we load from storage if not in memory
  // IMPORTANT: Use realized narrative (player's actual path) when branching choices exist
  for (let ch = 2; ch < targetChapter; ch++) {
    const chapterPathKey = this._getPathKeyForChapter(ch, choiceHistory);
    for (let sub = 1; sub <= SUBCHAPTERS_PER_CHAPTER; sub++) {
      const caseNum = formatCaseNumber(ch, sub);
      // Use async method to ensure entries are loaded from storage
      const entry = await this.getGeneratedEntryAsync(caseNum, chapterPathKey);
      if (entry) {
        // Check if we have branching choices for this case - use REALIZED narrative
        const branchingChoice = branchingChoices.find(bc => bc.caseNumber === caseNum);
        let narrativeText = entry.narrative; // Default to canonical

        if (branchingChoice && entry.branchingNarrative) {
          // Build the ACTUAL narrative the player experienced
          narrativeText = buildRealizedNarrative(
            entry.branchingNarrative,
            branchingChoice.firstChoice,
            branchingChoice.secondChoice
          );
          log.debug('StoryGenerationService', `Using realized narrative for ${caseNum}: path ${formatBranchingPath(branchingChoice.firstChoice, branchingChoice.secondChoice)}`);
        }

        if (narrativeText) {
          context.previousChapters.push({
            chapter: ch,
            subchapter: sub,
            pathKey: chapterPathKey,
            title: entry.title || `Chapter ${ch}.${sub}`,
            narrative: narrativeText, // REALIZED narrative from player's actual path
            chapterSummary: entry.chapterSummary || null,
            decision: entry.decision || null,
            pathDecisions: entry.pathDecisions || null, // Store path-specific decisions for proper lookup
            branchingPath: branchingChoice ? formatBranchingPath(branchingChoice.firstChoice, branchingChoice.secondChoice) : null,
            isRecent: true, // Mark all as recent to include full text
          });
        }
      } else {
        console.warn(`[StoryGenerationService] Missing chapter ${ch}.${sub} (${caseNum}) for path ${chapterPathKey}`);
      }
    }
  }

  // Add current chapter's previous subchapters - FULL TEXT
  // IMPORTANT: Use realized narrative for player's actual experience
  // Note: For Chapter 1, 1A is static (use getStoryEntry), 1B onwards are generated
  if (targetSubchapter > 1) {
    for (let sub = 1; sub < targetSubchapter; sub++) {
      const caseNum = formatCaseNumber(targetChapter, sub);

      // For Chapter 1A, use static content (already included above).
      if (targetChapter === 1 && sub === 1) {
        continue;
      }
      const entry = await this.getGeneratedEntryAsync(caseNum, pathKey);

      if (entry) {
        // Check if we have branching choices for this case - use REALIZED narrative
        const branchingChoice = branchingChoices.find(bc => bc.caseNumber === caseNum);
        let narrativeText = entry.narrative; // Default to canonical

        if (branchingChoice && entry.branchingNarrative) {
          // Build the ACTUAL narrative the player experienced
          narrativeText = buildRealizedNarrative(
            entry.branchingNarrative,
            branchingChoice.firstChoice,
            branchingChoice.secondChoice
          );
          log.debug('StoryGenerationService', `Using realized narrative for ${caseNum}: path ${formatBranchingPath(branchingChoice.firstChoice, branchingChoice.secondChoice)}`);
        }

        if (narrativeText) {
          context.previousChapters.push({
            chapter: targetChapter,
            subchapter: sub,
            pathKey,
            title: entry.title || `Chapter ${targetChapter}.${sub}`,
            narrative: narrativeText, // REALIZED narrative from player's actual path
            chapterSummary: entry.chapterSummary || null,
            decision: entry.decision || null,
            pathDecisions: entry.pathDecisions || null, // Store path-specific decisions for proper lookup
            branchingPath: branchingChoice ? formatBranchingPath(branchingChoice.firstChoice, branchingChoice.secondChoice) : null,
            isRecent: true, // Current chapter always recent
          });
        }
      } else {
        console.warn(`[StoryGenerationService] Missing current chapter ${targetChapter}.${sub} (${caseNum})`);
      }
    }
  }

  // Log context size for debugging
  const totalNarrativeChars = context.previousChapters.reduce(
    (sum, ch) => sum + (ch.narrative?.length || 0), 0
  );
  log.debug('StoryGenerationService', `Context built: ${context.previousChapters.length} subchapters, ${totalNarrativeChars} chars`);
  if (context.previousChapters.length === 0) {
    console.warn('[StoryGenerationService] WARNING: No previous chapters found! Story context may be empty.');
  }

  // Add choice history (including title/focus for LLM prompt context)
  context.playerChoices = choiceHistory.map(choice => ({
    chapter: this._extractChapterFromCase(choice.caseNumber),
    optionKey: choice.optionKey,
    optionTitle: choice.optionTitle || null,  // "Go to the wharf and investigate the warehouse"
    optionFocus: choice.optionFocus || null,  // "Prioritizes direct action over caution"
    timestamp: choice.timestamp,
  }));

  // Identify the most recent decision that affects the current chapter (Chapter N decision affects N+1)
  const lastDecision = (() => {
    const last = [...(choiceHistory || [])].reverse().find((c) => {
      const decisionChapter = this._extractChapterFromCase(c?.caseNumber);
      return decisionChapter === targetChapter - 1;
    });
    if (!last) return null;

    const consequence = DECISION_CONSEQUENCES[last.caseNumber]?.[last.optionKey];
    const decisionChapter = this._extractChapterFromCase(last.caseNumber);
    const decisionPathKey = this._getPathKeyForChapter(decisionChapter, choiceHistory);
    const decisionEntry = this.getGeneratedEntry(last.caseNumber, decisionPathKey) || getStoryEntry(last.caseNumber, 'ROOT');
    // Handle both legacy (decision) and new (pathDecisions) formats
    // Use player's actual branching path for path-specific decision lookup
    const decisionData = this._getPathDecisionData(decisionEntry, last.caseNumber, branchingChoices);
    const chosenOption = decisionData?.options?.find((o) => o.key === last.optionKey)
      || (last.optionKey === 'A' ? decisionData?.optionA : decisionData?.optionB)
      || null;
    const otherOption = decisionData?.options?.find((o) => o.key !== last.optionKey)
      || (last.optionKey === 'A' ? decisionData?.optionB : decisionData?.optionA)
      || null;

    // Prefer stored title/focus from choice history (always available after decision),
    // fall back to looking it up from the decision entry
    return {
      caseNumber: last.caseNumber,
      chapter: decisionChapter,
      optionKey: last.optionKey,
      immediate: consequence?.immediate || chosenOption?.focus || last.optionFocus || `Chose option ${last.optionKey}`,
      ongoing: consequence?.ongoing || [],
      chosenTitle: last.optionTitle || chosenOption?.title || null,
      chosenFocus: last.optionFocus || chosenOption?.focus || null,
      chosenStats: chosenOption?.stats || null,
      otherTitle: otherOption?.title || null,
      otherFocus: otherOption?.focus || null,
    };
  })();

  context.lastDecision = lastDecision;

  // Extract established facts from generated content
  context.establishedFacts = this._extractEstablishedFacts(context.previousChapters);

  // IMPORTANT:
  // Persisted storage strips per-entry consistencyFacts to save space.
  // We persist a rolling fact log keyed BY PATH to prevent branch-bleed from background prefetch.
  // Only merge facts whose pathKey is relevant (prefix of current path).
  const persistedFacts = this._getRelevantPersistedConsistencyFacts(pathKey);
  if (persistedFacts.length > 0) {
    context.establishedFacts = [
      ...new Set([...(context.establishedFacts || []), ...persistedFacts]),
    ];
  }

  // Extract active narrative threads that must be maintained
  context.narrativeThreads = this._extractNarrativeThreads(context.previousChapters);

  return context;
}

/**
 * Build foundation context from story bible
 */
function _buildFoundationContext() {
  return {
    protagonist: ABSOLUTE_FACTS.protagonist,
    antagonist: ABSOLUTE_FACTS.antagonist,
    setting: ABSOLUTE_FACTS.setting,
  };
}

/**
 * Extract key facts from previous chapters for consistency
 */
function _extractEstablishedFacts(chapters) {
  const facts = [];

  // Add base consistency rules
  facts.push(...CONSISTENCY_RULES);

  // Extract facts from generated content
  for (const ch of chapters) {
    if (ch.consistencyFacts) {
      facts.push(...ch.consistencyFacts);
    }
  }

  return [...new Set(facts)]; // Remove duplicates
}

/**
 * Extract scene state from the immediately previous subchapter
 * This gives the LLM a precise snapshot of where we are in the story
 */
function _extractSceneState(previousChapters, currentChapter, currentSubchapter) {
  if (!previousChapters || previousChapters.length === 0) {
    return null;
  }

  // Find the immediately previous subchapter
  let prevChapter, prevSubchapter;
  if (currentSubchapter > 1) {
    prevChapter = currentChapter;
    prevSubchapter = currentSubchapter - 1;
  } else {
    prevChapter = currentChapter - 1;
    prevSubchapter = 3;
  }

  const prevEntry = previousChapters.find(
    ch => ch.chapter === prevChapter && ch.subchapter === prevSubchapter
  );

  if (!prevEntry?.narrative) {
    return null;
  }

  const narrative = prevEntry.narrative;

  // Extract the last 2-3 paragraphs for immediate context
  const paragraphs = narrative.split(/\n\n+/).filter(p => p.trim().length > 50);
  const lastParagraphs = paragraphs.slice(-3).join('\n\n');

  // Extract the very last sentence for exact continuation point
  const sentences = narrative.match(/[^.!?]+[.!?]+/g) || [];
  const lastSentence = sentences.slice(-1)[0]?.trim() || '';

  // Try to infer current location from narrative
  // Fix: Collect ALL matches from ALL patterns, then take the one that appears LAST in the narrative
  const locationPatterns = [
    // Primary pattern: preposition/verb phrases before location
    /(?:at|in|inside|outside|near|entered|stepped into|arrived at|back to|returned to|reached|walked into|drove to|pulled up to|stood (?:in|outside|at)|was (?:in|at)|found himself (?:in|at)|doors of|through the doors of)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:'s)?(?:\s+(?:Bar|Office|Diner|House|Building|Station|Prison|Warehouse|Wharf|Docks|Penthouse|Estate|Alley|Street|Exchange|Cafe|Club|Hotel|Motel|Shop|Store|Market|Tavern|Pub|Restaurant|Garage|Lot|Plaza|Tower|Complex|Facility))?)/g,
    // Fallback: Any capitalized name followed by a location-type word
    /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:'s)?)\s+(?:Bar|Office|Diner|Warehouse|Wharf|Penthouse|Estate|Cafe|Club|Tavern|Pub|Restaurant)/gi,
    // Known locations
    /Murphy's Bar/gi,
    /Ashport Archive/gi,
    /Sentinel Library/gi,
    /Brineglass Viaduct/gi,
    /Victoria's building/gi,
    /Harmon Exchange/gi,
    /(?:the\s+)?(?:old\s+)?warehouse/gi,
  ];

  let currentLocation = 'Unknown location';
  let latestPosition = -1;

  // Collect matches from ALL patterns and find the one that appears LAST in the narrative
  for (const pattern of locationPatterns) {
    const matches = [...narrative.matchAll(pattern)];
    for (const match of matches) {
      if (match.index > latestPosition) {
        latestPosition = match.index;
        currentLocation = match[1] || match[0];
      }
    }
  }

  // Try to infer time of day
  const timePatterns = {
    morning: /\b(morning|dawn|sunrise|breakfast|early light)\b/i,
    afternoon: /\b(afternoon|midday|noon|lunch)\b/i,
    evening: /\b(evening|dusk|sunset|dinner)\b/i,
    night: /\b(night|midnight|dark|neon|streetlights|late)\b/i,
  };

  let timeOfDay = 'night'; // Default thriller atmosphere
  for (const [time, pattern] of Object.entries(timePatterns)) {
    if (pattern.test(narrative)) {
      timeOfDay = time;
    }
  }

  // Extract characters present in the final scene
  // Only canonical characters are listed - LLM-generated characters detected dynamically
  const canonicalCharacters = ['Jack', 'Victoria', 'Blackwell'];
  const presentCharacters = canonicalCharacters.filter(name =>
    new RegExp(`\\b${name}\\b`, 'i').test(lastParagraphs)
  );

  // Infer Jack's emotional/physical state
  const emotionPatterns = {
    angry: /\b(anger|furious|rage|fist|clenched|seething)\b/i,
    tired: /\b(tired|exhausted|weary|drained|heavy)\b/i,
    tense: /\b(tense|nervous|anxious|tight|coiled)\b/i,
    determined: /\b(determined|resolved|focused|steel)\b/i,
    suspicious: /\b(suspicious|wary|distrustful|watching)\b/i,
    shocked: /\b(shocked|stunned|reeling|disbelief)\b/i,
  };

  const jackState = [];
  for (const [emotion, pattern] of Object.entries(emotionPatterns)) {
    if (pattern.test(lastParagraphs)) {
      jackState.push(emotion);
    }
  }

  return {
    location: currentLocation,
    timeOfDay,
    storyDay: prevChapter, // Story day = chapter number
    presentCharacters,
    jackEmotionalState: jackState.length > 0 ? jackState : ['focused'],
    lastParagraphs,
    lastSentence,
    previousTitle: prevEntry.title,
  };
}

/**
 * Track what each character knows - prevents information leaks
 * NOTE: Only Jack and Victoria are canonical - other characters are LLM-generated
 */
function _buildCharacterKnowledgeTracker(previousChapters) {
  const revealChapter = REVEAL_TIMING?.underMap?.firstUndeniable?.chapter || 1;
  const revealSubchapter = REVEAL_TIMING?.underMap?.firstUndeniable?.subchapter || DECISION_SUBCHAPTER;
  const revealLabel = REVEAL_TIMING?.underMap?.firstUndeniable?.label || `${revealChapter}${formatSubchapterLabel(revealSubchapter)}`;
  const knowledge = {
    jack: {
      knows: [],
      suspects: [],
      doesNotKnow: [
        `What the Under-Map truly is (first undeniable reveal at end of ${revealLabel})`,
        'Victoria Blackwell\'s full agenda and constraints',
      ],
    },
    victoria: { knows: ['Far more about the Under-Map than Jack', 'Jack\'s likely routes and choices'], suspects: [] },
  };

  // Scan narratives for revelation patterns
  const revelationPatterns = [
    { pattern: /Jack (?:learned|discovered|realized|found out|understood) (?:that )?(.+?)[.!]/gi, target: 'jack', type: 'knows' },
    { pattern: /Jack (?:suspected|wondered if|began to think|considered) (?:that )?(.+?)[.!]/gi, target: 'jack', type: 'suspects' },
    { pattern: /Victoria (?:revealed|showed|told|exposed) (?:that )?(.+?)[.!]/gi, target: 'jack', type: 'knows' },
    // Generic pattern for any character revealing something to Jack
    { pattern: /(?:told Jack|revealed to Jack|confessed to Jack|admitted to Jack) (?:that )?(.+?)[.!]/gi, target: 'jack', type: 'knows' },
  ];

  for (const ch of previousChapters) {
    if (!ch.narrative) continue;

    for (const { pattern, target, type } of revelationPatterns) {
      const matches = [...ch.narrative.matchAll(pattern)];
      for (const match of matches) {
        if (match[1] && match[1].length < 200) {
          knowledge[target][type].push(`Ch${ch.chapter}.${ch.subchapter}: ${match[1].trim()}`);
        }
      }
    }
  }

  // Deduplicate and limit
  for (const char of Object.keys(knowledge)) {
    knowledge[char].knows = [...new Set(knowledge[char].knows)].slice(-20);
    knowledge[char].suspects = [...new Set(knowledge[char].suspects)].slice(-10);
  }

  return knowledge;
}

/**
 * Track evidence and items Jack has collected
 */
function _extractEvidenceInventory(previousChapters) {
  const evidence = [];
  const evidencePatterns = [
    /Jack (?:took|grabbed|pocketed|kept|collected|received|found) (?:the |a )?(.+?(?:dead\s+letter|letter|envelope|photo|document|file|key|card|note|paper|folder|token|map|printout))/gi,
    /(?:handed|gave|passed) Jack (?:the |a )?(.+?(?:dead\s+letter|letter|envelope|photo|document|file|key|card|note|paper|folder|token|map|printout))/gi,
    /dead letter/gi,
    /river-?glass/gi,
    /\bglyph\b/gi,
  ];

  for (const ch of previousChapters) {
    if (!ch.narrative) continue;

    for (const pattern of evidencePatterns) {
      const matches = [...ch.narrative.matchAll(pattern)];
      for (const match of matches) {
        const item = match[1] || match[0];
        if (item && item.length < 100) {
          evidence.push({
            item: item.trim(),
            foundIn: `Chapter ${ch.chapter}.${ch.subchapter}`,
          });
        }
      }
    }
  }

  // Deduplicate by item name
  const seen = new Set();
  return evidence.filter(e => {
    const key = e.item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(-15);
}

/**
 * Extract character dialogue history for voice consistency across chapters.
 * Per Gemini 3 best practices: track recent dialogue patterns per character
 * to maintain consistent voice across the 12-chapter arc.
 * NOTE: Only Victoria Blackwell is tracked - she's the only canonical character besides Jack.
 * Other characters are LLM-generated and don't need consistent voice tracking.
 * @param {Array} previousChapters - Previous chapter entries
 * @returns {Object} - Dialogue history per character
 */
function _extractCharacterDialogueHistory(previousChapters) {
  const characterDialogue = {
    'Victoria Blackwell': { lines: [], patterns: [], count: 0 },
  };

  // Patterns to identify Victoria speaking
  const speakerPatterns = [
    { name: 'Victoria Blackwell', patterns: [/(?:Victoria|Blackwell)\s+said/gi, /"[^"]+"\s+Victoria/gi, /"[^"]+"\s+Blackwell/gi] },
  ];

  // Extract dialogue from each chapter
  for (const ch of previousChapters) {
    if (!ch.narrative) continue;

    // Extract all dialogue (text in quotes)
    const dialogueMatches = ch.narrative.matchAll(/"([^"]+)"/g);

    for (const match of dialogueMatches) {
      const line = match[0];
      const lineContent = match[1];
      const lineIndex = match.index;

      // Determine speaker by looking at context around the quote
      const contextStart = Math.max(0, lineIndex - 100);
      const contextEnd = Math.min(ch.narrative.length, lineIndex + line.length + 100);
      const context = ch.narrative.slice(contextStart, contextEnd);

      for (const { name, patterns } of speakerPatterns) {
        const isThisSpeaker = patterns.some(p => p.test(context));
        if (isThisSpeaker && lineContent.length > 10 && lineContent.length < 200) {
          characterDialogue[name].lines.push({
            line: lineContent,
            chapter: ch.chapter,
            subchapter: ch.subchapter,
          });
          characterDialogue[name].count++;
          break;
        }
      }
    }
  }

  // Extract speech patterns for Victoria
  const victoriaData = characterDialogue['Victoria Blackwell'];
  if (victoriaData.lines.length >= 3) {
    const allLines = victoriaData.lines.map(l => l.line).join(' ');

    // Victoria patterns: cryptic, rule-bound
    if (/rule|must|cannot|boundary/i.test(allLines)) {
      victoriaData.patterns.push('References rules and boundaries');
    }
    if (/pattern|map|route|path/i.test(allLines)) {
      victoriaData.patterns.push('Uses mapping/pattern metaphors');
    }

    // Keep only last 5 lines (most recent)
    victoriaData.lines = victoriaData.lines.slice(-5);
  }

  return characterDialogue;
}

/**
 * Build character dialogue history section for the prompt
 * @param {Object} dialogueHistory - Result from _extractCharacterDialogueHistory
 * @returns {string} - Formatted section for prompt
 */
function _buildDialogueHistorySection(dialogueHistory) {
  if (!dialogueHistory) return '';

  let section = `\n## CHARACTER VOICE HISTORY\n`;
  section += `**Maintain consistent dialogue patterns for each character:**\n\n`;

  for (const [name, data] of Object.entries(dialogueHistory)) {
    if (data.lines.length === 0) continue;

    section += `### ${name}\n`;

    // Speech patterns
    if (data.patterns.length > 0) {
      section += `**Patterns:** ${data.patterns.join('; ')}\n`;
    }

    // Recent lines
    section += `**Recent dialogue:**\n`;
    data.lines.forEach(l => {
      section += `- Ch${l.chapter}: "${l.line.slice(0, 100)}${l.line.length > 100 ? '...' : ''}"\n`;
    });
    section += `\n`;
  }

  section += `>>> Maintain each character's established voice patterns <<<\n`;

  return section;
}

/**
 * Build scene state section for the prompt
 */
function _buildSceneStateSection(context, chapter, subchapter) {
  const sceneState = this._extractSceneState(
    context.previousChapters,
    chapter,
    subchapter
  );

  if (!sceneState) {
    return '';
  }

  let section = `## CURRENT SCENE STATE (Your starting point)\n\n`;
  section += `**STORY DAY:** Day ${sceneState.storyDay} of 12\n`;
  section += `**TIME:** ${sceneState.timeOfDay}\n`;
  section += `**LOCATION:** ${sceneState.location}\n`;
  section += `**JACK'S STATE:** ${sceneState.jackEmotionalState.join(', ')}\n`;

  if (sceneState.presentCharacters.length > 0) {
    section += `**CHARACTERS PRESENT:** ${sceneState.presentCharacters.join(', ')}\n`;
  }

  section += `\n### THE SCENE YOU ARE CONTINUING FROM:\n`;
  section += `Previous subchapter: "${sceneState.previousTitle}"\n\n`;
  section += `**LAST PARAGRAPHS:**\n${sceneState.lastParagraphs}\n\n`;
  section += `**EXACT LAST SENTENCE:**\n"${sceneState.lastSentence}"\n\n`;
  section += `>>> YOUR NARRATIVE MUST PICK UP IMMEDIATELY AFTER THIS SENTENCE <<<\n`;
  section += `>>> DO NOT REPEAT OR REPHRASE THIS ENDING - CONTINUE FROM IT <<<\n`;

  return section;
}

/**
 * Get the thought signature from the previous subchapter for reasoning continuity.
 * Per Gemini 3 docs: thought signatures maintain reasoning chain across multi-turn conversations.
 * @param {number} chapter - Current chapter
 * @param {number} subchapter - Current subchapter
 * @param {string} pathKey - Current path key
 * @returns {string|null} - The previous thought signature, or null if not available
 */
function _getPreviousThoughtSignature(chapter, subchapter, pathKey) {
  if (!this.generatedStory?.chapters) return null;

  // Determine the previous subchapter key
  let prevChapter = chapter;
  let prevSubchapter = subchapter - 1;

  if (prevSubchapter < 1) {
    // Go to previous chapter's last subchapter (typically 3)
    prevChapter = chapter - 1;
    prevSubchapter = 3;
  }

  if (prevChapter < 1) return null; // No previous for first subchapter

  // Find the matching entry from generated story
  const entries = Object.values(this.generatedStory.chapters);

  // For same chapter, use same pathKey; for previous chapter, derive from pathKey
  const targetKey = prevChapter === chapter
    ? pathKey
    : pathKey.split('-').slice(0, -1).join('-') || 'ROOT'; // Go up one branch level

  // Find entry matching chapter, subchapter, and closest path
  const matchingEntry = entries.find(e =>
    e.chapter === prevChapter &&
    e.subchapter === prevSubchapter &&
    (e.pathKey === targetKey || e.pathKey === 'ROOT' || targetKey === 'ROOT')
  );

  if (matchingEntry?.thoughtSignature) {
    log.debug('StoryGenerationService', `🧠 Found thought signature from ${prevChapter}.${prevSubchapter}`);
    return matchingEntry.thoughtSignature;
  }

  return null;
}

/**
 * Build character knowledge section
 */
function _buildKnowledgeSection(context) {
  const knowledge = this._buildCharacterKnowledgeTracker(context.previousChapters);
  const evidence = this._extractEvidenceInventory(context.previousChapters);

  let section = `## CHARACTER KNOWLEDGE STATE\n\n`;

  section += `### WHAT JACK KNOWS:\n`;
  if (knowledge.jack.knows.length > 0) {
    knowledge.jack.knows.slice(-15).forEach(k => {
      section += `- ${k}\n`;
    });
  } else {
    section += `- Just beginning investigation\n`;
  }

  section += `\n### WHAT JACK SUSPECTS (but hasn't confirmed):\n`;
  if (knowledge.jack.suspects.length > 0) {
    knowledge.jack.suspects.slice(-10).forEach(k => {
      section += `- ${k}\n`;
    });
  } else {
    section += `- None yet\n`;
  }

  section += `\n### WHAT JACK DOES NOT YET KNOW (do not reveal prematurely):\n`;
  knowledge.jack.doesNotKnow.forEach(k => {
    section += `- ${k}\n`;
  });

  if (evidence.length > 0) {
    section += `\n### EVIDENCE IN JACK'S POSSESSION:\n`;
    evidence.forEach(e => {
      section += `- ${e.item} (found in ${e.foundIn})\n`;
    });
  }

  return section;
}

// ==========================================================================
// SMART FACT INDEXING - Indexes facts by relevance for efficient context building
// ==========================================================================

/**
 * Build indexed facts from generated content for efficient retrieval
 */
function _buildIndexedFacts(chapters) {
  const index = {
    byCharacter: new Map(),      // Facts mentioning specific characters
    byChapter: new Map(),        // Facts from specific chapters
    byType: new Map(),           // Facts by type (timeline, setting, relationship, etc.)
    critical: [],                // Always-include critical facts
    recent: [],                  // Most recent facts (high priority)
  };

  // Add base consistency rules as critical
  index.critical.push(...CONSISTENCY_RULES.slice(0, 15));

  // Index facts from chapters
  chapters.forEach(ch => {
    if (!ch.consistencyFacts) return;

    ch.consistencyFacts.forEach(fact => {
      // Index by chapter
      if (!index.byChapter.has(ch.chapter)) {
        index.byChapter.set(ch.chapter, []);
      }
      index.byChapter.get(ch.chapter).push(fact);

      // Index by character mentioned - only canonical characters have static entries
      // Other character names are dynamically discovered from generated content
      const canonicalCharacters = ['Jack', 'Victoria', 'Blackwell'];
      canonicalCharacters.forEach(char => {
        if (fact.toLowerCase().includes(char.toLowerCase())) {
          if (!index.byCharacter.has(char)) {
            index.byCharacter.set(char, []);
          }
          index.byCharacter.get(char).push(fact);
        }
      });

      // Index by type
      if (/\d+\s*(year|month|day|hour)/i.test(fact)) {
        if (!index.byType.has('timeline')) index.byType.set('timeline', []);
        index.byType.get('timeline').push(fact);
      }
      if (/meet|promise|agree|plan/i.test(fact)) {
        if (!index.byType.has('appointment')) index.byType.set('appointment', []);
        index.byType.get('appointment').push(fact);
      }
      if (/reveal|discover|learn|find out/i.test(fact)) {
        if (!index.byType.has('revelation')) index.byType.set('revelation', []);
        index.byType.get('revelation').push(fact);
      }
    });
  });

  // Track recent facts (last 2 chapters)
  const sortedChapters = [...chapters].sort((a, b) => {
    if (a.chapter !== b.chapter) return b.chapter - a.chapter;
    return b.subchapter - a.subchapter;
  });
  sortedChapters.slice(0, 6).forEach(ch => {
    if (ch.consistencyFacts) {
      index.recent.push(...ch.consistencyFacts);
    }
  });

  return index;
}

/**
 * Get relevant facts for a specific chapter/subchapter
 * Uses smart selection instead of dumping all facts
 */
function _getRelevantFacts(targetChapter, targetSubchapter, indexedFacts, context) {
  const relevantFacts = new Set();

  // Always include critical facts
  indexedFacts.critical.forEach(f => relevantFacts.add(f));

  // Include recent facts (high priority)
  indexedFacts.recent.slice(0, 10).forEach(f => relevantFacts.add(f));

  // Include facts from previous chapter (continuity)
  const prevChapterFacts = indexedFacts.byChapter.get(targetChapter - 1) || [];
  prevChapterFacts.forEach(f => relevantFacts.add(f));

  // Include facts from current chapter's previous subchapters
  if (targetSubchapter > 1) {
    const currChapterFacts = indexedFacts.byChapter.get(targetChapter) || [];
    currChapterFacts.forEach(f => relevantFacts.add(f));
  }

  // Include character-specific facts based on story arc
  const chapterArc = context.storyArc?.chapterArcs?.find(c => c.chapter === targetChapter);
  if (chapterArc?.innocentFeatured) {
    const characterFacts = indexedFacts.byCharacter.get(chapterArc.innocentFeatured) || [];
    characterFacts.forEach(f => relevantFacts.add(f));
  }

  // Include appointment/promise facts (must be tracked)
  const appointmentFacts = indexedFacts.byType.get('appointment') || [];
  appointmentFacts.slice(-5).forEach(f => relevantFacts.add(f));

  return [...relevantFacts].slice(0, 25); // Cap at 25 facts to manage token usage
}

export const contextMethods = {
  buildStoryContext,
  _buildFoundationContext,
  _extractEstablishedFacts,
  _extractSceneState,
  _buildCharacterKnowledgeTracker,
  _extractEvidenceInventory,
  _extractCharacterDialogueHistory,
  _buildDialogueHistorySection,
  _buildSceneStateSection,
  _getPreviousThoughtSignature,
  _buildKnowledgeSection,
  _buildIndexedFacts,
  _getRelevantFacts,
};
