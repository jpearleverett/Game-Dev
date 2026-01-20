import { llmService } from '../LLMService';
import { formatCaseNumber } from '../../data/storyContent';
import {
  ABSOLUTE_FACTS,
  GENERATION_CONFIG,
  REVEAL_TIMING,
  SETUP_PAYOFF_REGISTRY,
} from '../../data/storyBible';
import { saveStoryContext } from '../../storage/generatedStoryStorage';
import { DECISION_CONTENT_SCHEMA, STORY_CONTENT_SCHEMA } from './schemas';
import { DECISION_SUBCHAPTER, MIN_WORDS_PER_SUBCHAPTER, TRUNCATE_VALIDATION } from './constants';
import { formatSubchapterLabel } from './helpers';

class ValidationMethods {
  /**
   * Create a consistency checkpoint after generation
   */
  async _createConsistencyCheckpoint(chapter, pathKey, storyEntry, choiceHistory = []) {
    const checkpointKey = `checkpoint_${chapter}_${pathKey}`;

    const checkpoint = {
      chapter,
      pathKey,
      timestamp: new Date().toISOString(),
      accumulatedFacts: [],
      characterStates: {},
      narrativeThreads: [],
      decisionHistory: [],
    };

    // Gather all facts from this and previous chapters
    for (let ch = 2; ch <= chapter; ch++) {
      for (let sub = 1; sub <= 3; sub++) {
        const caseNum = formatCaseNumber(ch, sub);
        // Use cumulative branch keys for each chapter so we read the correct historical branch.
        const chPathKey = this._getPathKeyForChapter(ch, choiceHistory);
        const entry = this.getGeneratedEntry(caseNum, chPathKey);
        if (entry?.consistencyFacts) {
          checkpoint.accumulatedFacts.push(...entry.consistencyFacts);
        }
      }
    }

    // Deduplicate facts
    checkpoint.accumulatedFacts = [...new Set(checkpoint.accumulatedFacts)];

    // Track character relationship states based on path personality
    if (this.pathPersonality) {
      checkpoint.characterStates = {
        jackPersonality: this.pathPersonality.narrativeStyle,
        riskTolerance: this.pathPersonality.riskTolerance,
        scores: this.pathPersonality.scores,
      };
    }

    this.consistencyCheckpoints.set(checkpointKey, checkpoint);

    // Validate checkpoint for anomalies every 3 chapters
    if (chapter % 3 === 0) {
      await this._validateCheckpoint(checkpoint);
    }

    return checkpoint;
  }

  /**
   * Validate a consistency checkpoint for anomalies
   */
  async _validateCheckpoint(checkpoint) {
    const issues = [];

    // Check for contradictory facts
    const factText = checkpoint.accumulatedFacts.join(' ').toLowerCase();

    // Avoid hardcoding noir-era timeline assertions here. Canon is enforced via
    // ABSOLUTE_FACTS + CONSISTENCY_RULES in the prompt and by downstream validators.

    // Character state contradictions
    if (checkpoint.characterStates.jackPersonality) {
      const isMethodical = checkpoint.characterStates.riskTolerance === 'low';
      const hasRecklessAction = /jack\s+(charged|rushed|stormed)/i.test(factText);
      if (isMethodical && hasRecklessAction) {
        issues.push('Character behavior contradiction: Methodical Jack acting recklessly');
      }
    }

    if (issues.length > 0) {
      console.warn('[StoryGenerationService] Checkpoint validation issues:', issues);
      // Store issues for potential auto-correction in future generations
      checkpoint.validationIssues = issues;
    }

    return issues;
  }
  _parseGeneratedContent(content, isDecisionPoint) {
    try {
      // Parse JSON response (guaranteed valid by Gemini's structured output)
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;

      // Map JSON fields to internal format
      const result = {
        title: parsed.title || 'Untitled',
        bridgeText: parsed.bridge || '',
        previously: parsed.previously || '', // Recap of previous events
        narrative: this._cleanNarrative(parsed.narrative || ''),
        // BRANCHING NARRATIVE: The interactive story structure with 9 paths
        // Contains: opening, firstChoice, secondChoices (each with options array)
        branchingNarrative: parsed.branchingNarrative || null,
        chapterSummary: parsed.chapterSummary || '', // High-quality summary
        puzzleCandidates: parsed.puzzleCandidates || [], // LLM suggested puzzle words
        briefing: parsed.briefing || { summary: '', objectives: [] },
        consistencyFacts: Array.isArray(parsed.consistencyFacts) ? parsed.consistencyFacts : [],
        // NOTE: storyDay, jackActionStyle, jackRiskLevel, jackBehaviorDeclaration removed from schema
        // These are now handled via <internal_planning> in system prompt (Gemini 3 thinking)
        // Kept for backward compatibility with old saved data
        storyDay: parsed.storyDay,
        jackActionStyle: parsed.jackActionStyle,
        jackRiskLevel: parsed.jackRiskLevel,
        jackBehaviorDeclaration: parsed.jackBehaviorDeclaration,
        narrativeThreads: Array.isArray(parsed.narrativeThreads) ? parsed.narrativeThreads : [],
        previousThreadsAddressed: Array.isArray(parsed.previousThreadsAddressed) ? parsed.previousThreadsAddressed : [],
        pathDecisions: null,
      };

      // Convert decision format if present
      if (isDecisionPoint) {
        if (parsed.pathDecisions) {
          // Support both array format (new) and object format (legacy)
          let pathDecisionsObj;
          if (Array.isArray(parsed.pathDecisions)) {
            // New array format: convert to object keyed by pathKey
            console.log(`[StoryGenerationService] Raw pathDecisions from LLM: ${parsed.pathDecisions.length} paths (array format)`);
            pathDecisionsObj = {};
            for (const decision of parsed.pathDecisions) {
              if (decision.pathKey) {
                pathDecisionsObj[decision.pathKey] = decision;
              }
            }
          } else {
            // Legacy object format
            pathDecisionsObj = parsed.pathDecisions;
            console.log(`[StoryGenerationService] Raw pathDecisions from LLM: ${Object.keys(pathDecisionsObj).length} paths (object format)`);
          }

          // Convert each of the 9 path-specific decisions to internal format
          result.pathDecisions = {};
          for (const pathKey of Object.keys(pathDecisionsObj)) {
            const rawDecision = pathDecisionsObj[pathKey];
            if (rawDecision) {
              result.pathDecisions[pathKey] = this._convertDecisionFormat(rawDecision);
            }
          }

          // Validate that we got all 9 paths
          const expectedPaths = ['1A-2A', '1A-2B', '1A-2C', '1B-2A', '1B-2B', '1B-2C', '1C-2A', '1C-2B', '1C-2C'];
          const missingPaths = expectedPaths.filter(p => !result.pathDecisions[p]);
          if (missingPaths.length > 0) {
            console.warn(`[StoryGenerationService] PATH DECISIONS INCOMPLETE - missing paths: ${missingPaths.join(', ')}`);
          }

          // Validate sample decision has proper structure
          const sampleDecision = result.pathDecisions['1A-2A'];
          if (!sampleDecision?.options?.[0]?.title || !sampleDecision?.options?.[1]?.title) {
            console.error('[StoryGenerationService] PATH DECISION PARSING FAILED - sample (1A-2A) missing titles:', {
              rawSample: pathDecisionsObj['1A-2A'],
              convertedSample: sampleDecision,
            });
          }
        } else if (parsed.decision) {
          // Simple single decision format (TEMPORARY for testing)
          console.log(`[StoryGenerationService] Using simple decision format (single decision)`);
          result.decision = this._convertDecisionFormat(parsed.decision);
        }
      }

      return result;
    } catch (error) {
      // This can happen with truncated responses - try to extract what we can
      console.error('[StoryGenerationService] JSON parse error:', error);
      console.log('[StoryGenerationService] Attempting to extract content from malformed JSON...');

      // Try to extract partial content using regex
      const extracted = this._extractPartialContent(content, isDecisionPoint);
      if (extracted.narrative && extracted.narrative.length > 100) {
        console.log('[StoryGenerationService] Successfully extracted partial content');
        return extracted;
      }

      // Last resort: use the raw content as narrative
      console.warn('[StoryGenerationService] Falling back to raw content as narrative');
      return {
        title: 'Untitled',
        bridgeText: '',
        previously: '',
        narrative: typeof content === 'string' ? this._cleanNarrative(this._extractNarrativeFromRaw(content)) : '',
        chapterSummary: '',
        puzzleCandidates: [],
        briefing: { summary: '', objectives: [] },
        consistencyFacts: [],
        decision: null,
      };
    }
  }

  /**
   * Extract partial content from malformed JSON using regex patterns
   */
  _extractPartialContent(content, isDecisionPoint) {
    const result = {
      title: 'Untitled',
      bridgeText: '',
      previously: '',
      narrative: '',
      branchingNarrative: null, // Include in fallback parsing
      chapterSummary: '',
      puzzleCandidates: [],
      briefing: { summary: '', objectives: [] },
      consistencyFacts: [],
      pathDecisions: null, // Path-specific decisions for C subchapters
    };

    if (typeof content !== 'string') {
      return result;
    }

    // Try to extract title
    const titleMatch = content.match(/"title"\s*:\s*"([^"]+)"/);
    if (titleMatch) {
      result.title = titleMatch[1];
    }

    // Try to extract bridge text
    const bridgeMatch = content.match(/"bridge"\s*:\s*"([^"]+)"/);
    if (bridgeMatch) {
      result.bridgeText = bridgeMatch[1];
    }

    // Try to extract previously
    const previouslyMatch = content.match(/"previously"\s*:\s*"([^"]+)"/);
    if (previouslyMatch) {
      result.previously = previouslyMatch[1];
    }

    // Try to extract narrative (this is the most important and likely longest field)
    const narrativeMatch = content.match(/"narrative"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"|"\s*,\s*"briefing|"\s*,\s*"consistencyFacts|"\s*})/);
    if (narrativeMatch) {
      // Unescape the narrative content
      let narrative = narrativeMatch[1];
      // Handle escaped characters
      narrative = narrative.replace(/\\n/g, '\n')
                          .replace(/\\"/g, '"')
                          .replace(/\\\\/g, '\\');
      result.narrative = this._cleanNarrative(narrative);
    } else {
      // Try a more aggressive pattern for truncated narratives
      const looseNarrativeMatch = content.match(/"narrative"\s*:\s*"([\s\S]{100,})/);
      if (looseNarrativeMatch) {
        let narrative = looseNarrativeMatch[1];
        // Find the last complete sentence
        const lastSentenceEnd = Math.max(
          narrative.lastIndexOf('.'),
          narrative.lastIndexOf('!'),
          narrative.lastIndexOf('?')
        );
        if (lastSentenceEnd > narrative.length * 0.5) {
          narrative = narrative.substring(0, lastSentenceEnd + 1);
        }
        narrative = narrative.replace(/\\n/g, '\n')
                            .replace(/\\"/g, '"')
                            .replace(/\\\\/g, '\\');
        result.narrative = this._cleanNarrative(narrative);
      }
    }

    // Try to extract briefing summary
    const briefingSummaryMatch = content.match(/"summary"\s*:\s*"([^"]+)"/);
    if (briefingSummaryMatch) {
      result.briefing.summary = briefingSummaryMatch[1];
    }

    // Try to extract briefing objectives
    const objectivesMatch = content.match(/"objectives"\s*:\s*\[([\s\S]*?)\]/);
    if (objectivesMatch) {
      const objectivesStr = objectivesMatch[1];
      const objectives = objectivesStr.match(/"([^"]+)"/g);
      if (objectives) {
        result.briefing.objectives = objectives.map(o => o.replace(/"/g, ''));
      }
    }

    // Try to extract decision for decision points
    if (isDecisionPoint) {
      const introMatch = content.match(/"intro"\s*:\s*"([^"]+)"/);
      const optionATitleMatch = content.match(/"optionA"[\s\S]*?"title"\s*:\s*"([^"]+)"/);
      const optionAFocusMatch = content.match(/"optionA"[\s\S]*?"focus"\s*:\s*"([^"]+)"/);
      const optionBTitleMatch = content.match(/"optionB"[\s\S]*?"title"\s*:\s*"([^"]+)"/);
      const optionBFocusMatch = content.match(/"optionB"[\s\S]*?"focus"\s*:\s*"([^"]+)"/);

      if (introMatch && optionATitleMatch) {
        result.decision = {
          intro: [introMatch[1]],
          options: [
            {
              key: 'A',
              title: optionATitleMatch[1],
              focus: optionAFocusMatch ? optionAFocusMatch[1] : '',
              consequence: null,
              stats: null,
              outcome: null,
              nextChapter: null,
              nextPathKey: 'A',
              details: [],
            },
            {
              key: 'B',
              title: optionBTitleMatch ? optionBTitleMatch[1] : 'Option B',
              focus: optionBFocusMatch ? optionBFocusMatch[1] : '',
              consequence: null,
              stats: null,
              outcome: null,
              nextChapter: null,
              nextPathKey: 'B',
              details: [],
            },
          ],
        };
      }
    }

    return result;
  }

  /**
   * Extract narrative content from raw text when JSON parsing completely fails
   */
  _extractNarrativeFromRaw(content) {
    if (typeof content !== 'string') return '';

    // Remove JSON structure artifacts
    let text = content;

    // If it looks like it starts with JSON, try to extract the narrative value
    if (text.includes('"narrative"')) {
      const narrativeStart = text.indexOf('"narrative"');
      const valueStart = text.indexOf('"', narrativeStart + 11) + 1;
      if (valueStart > narrativeStart) {
        text = text.substring(valueStart);
        // Try to find the end of the narrative
        const valueEnd = text.lastIndexOf('"');
        if (valueEnd > 100) {
          text = text.substring(0, valueEnd);
        }
      }
    }

    // Clean up escaped characters
    text = text.replace(/\\n/g, '\n')
               .replace(/\\"/g, '"')
               .replace(/\\\\/g, '\\')
               .replace(/^\{[\s\S]*?"narrative"\s*:\s*"/m, '')
               .replace(/",[\s\S]*$/m, '');

    // Find the last complete sentence to avoid cut-off text
    const lastSentenceEnd = Math.max(
      text.lastIndexOf('.'),
      text.lastIndexOf('!'),
      text.lastIndexOf('?')
    );

    if (lastSentenceEnd > text.length * 0.3) {
      text = text.substring(0, lastSentenceEnd + 1);
    }

    return text.trim();
  }

  /**
   * Convert JSON decision format to internal game format
   */
  _convertDecisionFormat(decision) {
    // Build option objects once
    const optionAObj = {
      key: decision.optionA?.key || 'A',
      title: decision.optionA?.title || 'Option A',
      focus: decision.optionA?.focus || '',
      personalityAlignment: decision.optionA?.personalityAlignment || 'neutral',
      consequence: null,
      stats: null,
      outcome: null,
      nextChapter: null, // Will be set by game logic
      nextPathKey: decision.optionA?.key || 'A',
      details: [],
    };
    const optionBObj = {
      key: decision.optionB?.key || 'B',
      title: decision.optionB?.title || 'Option B',
      focus: decision.optionB?.focus || '',
      personalityAlignment: decision.optionB?.personalityAlignment || 'neutral',
      consequence: null,
      stats: null,
      outcome: null,
      nextChapter: null, // Will be set by game logic
      nextPathKey: decision.optionB?.key || 'B',
      details: [],
    };

    return {
      intro: [decision.intro || ''],
      // Keep both formats for compatibility:
      // - options[] array for iteration
      // - optionA/optionB for direct access
      options: [optionAObj, optionBObj],
      optionA: optionAObj,
      optionB: optionBObj,
    };
  }

  /**
   * Clean narrative text - minimal cleanup since structured output is clean
   */
  _cleanNarrative(text) {
    if (!text) return '';
    return text
      // Fix double spaces
      .replace(/\s{2,}/g, ' ')
      // Remove em dashes (replace with comma)
      .replace(/\s*—\s*/g, ', ')
      .trim();
  }

  /**
   * Return canonical name misspellings based on story bible facts.
   */
  _getCanonicalNameMisspellings() {
    const misspellings = [];
    const protagonistName = ABSOLUTE_FACTS?.protagonist?.fullName || '';
    const antagonistName = ABSOLUTE_FACTS?.antagonist?.trueName || '';
    const protagonistLast = protagonistName.trim().split(/\s+/).slice(-1)[0];
    const antagonistLast = antagonistName.trim().split(/\s+/).slice(-1)[0];

    const add = (correct, wrong) => {
      if (!correct || !Array.isArray(wrong) || wrong.length === 0) return;
      misspellings.push({ correct, wrong });
    };

    // Only include known variants for canonical characters to avoid drift.
    if (protagonistLast && /^halloway$/i.test(protagonistLast)) {
      add(protagonistLast, ['hallaway', 'holloway', 'haloway', 'hallo way']);
    }
    if (antagonistLast && /^blackwell$/i.test(antagonistLast)) {
      add(antagonistLast, ['blackwood', 'blackwel', 'black well']);
    }

    return misspellings;
  }

  /**
   * Fix common typos locally without calling the LLM
   * This prevents expensive API calls for simple string replacements
   */
  _fixTyposLocally(content) {
    if (!content?.narrative) return content;

    let narrative = content.narrative;
    let fixCount = 0;

    const typoFixes = [];
    const nameMisspellings = this._getCanonicalNameMisspellings();
    for (const entry of nameMisspellings) {
      for (const misspelling of entry.wrong) {
        const trimmed = String(misspelling || '').trim();
        if (!trimmed) continue;
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patternStr = escaped.replace(/\s+/g, '\\s+');
        typoFixes.push({
          pattern: new RegExp(`\\b${patternStr}\\b`, 'gi'),
          replacement: entry.correct,
        });
      }
    }

    const cityName = String(ABSOLUTE_FACTS?.setting?.city || '').trim();
    const cityLower = cityName.toLowerCase();
    if (cityLower === 'ashport') {
      const cityPossessive = cityName.endsWith('s') ? `${cityName}'` : `${cityName}'s`;
      typoFixes.push({ pattern: /\bashport's\b/gi, replacement: cityPossessive });
      typoFixes.push({ pattern: /\bash port\b/gi, replacement: cityName });
    }

    for (const { pattern, replacement } of typoFixes) {
      const before = narrative;
      narrative = narrative.replace(pattern, replacement);
      if (before !== narrative) {
        fixCount++;
      }
    }

    if (fixCount > 0) {
      console.log(`[StoryGenerationService] Fixed ${fixCount} typos locally (no LLM call needed)`);
    }

    return {
      ...content,
      narrative,
    };
  }

  /**
   * Validate content against established facts - COMPREHENSIVE VERSION
   * Checks for: name spelling, timeline, setting, character behavior, relationship states,
   * plot continuity, and path personality consistency
   */
  _validateConsistency(content, context) {
    const issues = [];
    const warnings = []; // Non-blocking issues
    const narrative = content.narrative.toLowerCase();
    const narrativeOriginal = content.narrative;

    // =========================================================================
    // CATEGORY 1: NAME AND SPELLING CONSISTENCY
    // These should rarely trigger now since _fixTyposLocally runs first
    // =========================================================================
    const nameChecks = this._getCanonicalNameMisspellings();

    nameChecks.forEach(({ wrong, correct }) => {
      wrong.forEach(misspelling => {
        // Use word boundary regex instead of includes() to prevent false positives
        // e.g., correct spelling "thornhill" should NOT match misspelling "thornhil"
        // e.g., correct spelling "blackwell" should NOT match misspelling "blackwel"
        const trimmedMisspelling = misspelling.trim();
        const escapedMisspelling = trimmedMisspelling.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Handle multi-word misspellings like "thorn hill" -> /\bthorn\s+hill\b/
        const patternStr = escapedMisspelling.replace(/\s+/g, '\\s+');
        const pattern = new RegExp(`\\b${patternStr}\\b`, 'i');
        if (pattern.test(narrative)) {
          issues.push(`Name misspelled: found "${trimmedMisspelling}", should be "${correct}"`);
        }
      });
    });

    // =========================================================================
    // CATEGORY 2: STORY DAY CONSISTENCY
    // =========================================================================
    // NOTE: storyDay field was removed from schema - now handled via <internal_planning> in system prompt.
    // The LLM determines storyDay internally (Chapter N = Day N) without outputting it.
    // NOTE: Character-specific timeline validations removed - only Jack and Victoria are canonical.
    // The LLM has creative freedom to generate supporting characters with their own timelines.

    // Check for relative time references that could cause drift
    const relativeTimePatterns = [
      { pattern: /(?:nearly|almost|about|roughly)\s+(?:a\s+)?decade/i, issue: 'Avoid vague time references like "nearly a decade" - use exact durations' },
      { pattern: /(?:many|several|countless)\s+years\s+(?:ago|since)/i, issue: 'Avoid vague "many/several years" - use exact durations from ABSOLUTE_FACTS' },
    ];

    relativeTimePatterns.forEach(({ pattern, issue }) => {
      if (pattern.test(narrativeOriginal)) {
        warnings.push(issue); // Warning, not error, for vague references
      }
    });

    // =========================================================================
    // CATEGORY 2.75: CHOICE CAUSALITY (Respect the most recent player decision)
    // =========================================================================
    // If this is the first subchapter of a new chapter, the narrative must quickly reflect
    // the last decision's immediate consequence. This prevents "generic reset" feeling.
    if (
      context?.currentPosition?.subchapter === 1 &&
      context?.currentPosition?.chapter > 1 &&
      context?.lastDecision &&
      context?.lastDecision?.chapter === context.currentPosition.chapter - 1
    ) {
      const prefix = narrativeOriginal
        .split(/\s+/)
        .slice(0, 200)
        .join(' ')
        .toLowerCase();

      // Stopwords used for choice-causality keyword extraction.
      // Include common noir/setting tokens so we don't get false positives like "truth/rain/case".
      // NOTE: Only includes canonical characters (Jack, Victoria/Blackwell) - others are LLM-generated.
      const stop = new Set([
        'jack', 'halloway', 'ashport', 'victoria', 'blackwell',
        'said', 'the', 'and', 'that', 'with', 'from', 'into', 'then', 'over', 'under',
        'were', 'was', 'had', 'have', 'this', 'there', 'their', 'they', 'them', 'what',
        'when', 'where', 'which', 'while', 'because', 'before', 'after', 'could', 'would',
        'should', 'about', 'again', 'still', 'truth', 'pattern', 'glyph', 'threshold', 'map',
        'investigation', 'city', 'street', 'streets', 'office', 'night', 'days', 'years',
        'choice', 'chose', 'decided', 'decision', 'option', 'path', 'plan',
      ]);
      const seedText = `${context.lastDecision.immediate || ''} ${context.lastDecision.chosenTitle || ''} ${context.lastDecision.chosenFocus || ''}`;
      const keywords = [...new Set(
        seedText
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length >= 4 && !stop.has(w))
      )].slice(0, 10);

      // Use word-based prefix matching to prevent false positives (e.g., "case" matching "showcase")
      const prefixWords = prefix.match(/\b\w+\b/g) || [];
      const hitCount = keywords.reduce((acc, k) => {
        const found = prefixWords.some(pw => {
          if (k.length < 4 || pw.length < 4) return k === pw;
          return k.startsWith(pw) || pw.startsWith(k);
        });
        return acc + (found ? 1 : 0);
      }, 0);
      if (hitCount === 0 && keywords.length > 0) {
        // Log as WARNING only - keyword matching is too simplistic for natural language.
        // The LLM may use synonyms/paraphrases that are semantically correct but don't
        // match our literal keywords. Trust the prompt instructions instead.
        warnings.push(
          `[Keyword check] No literal keyword matches in first 200 words for decision "${context.lastDecision.optionKey}". Keywords checked: [${keywords.slice(0, 5).join(', ')}]. This is usually fine - LLM likely used synonyms.`
        );
      }
    }

    // =========================================================================
    // CATEGORY 3: SETTING CONSISTENCY
    // =========================================================================
    const settingViolations = [
      { pattern: /\b(?:elf|elves|dwarf|dwarves|orc|orcs|goblin|goblins)\b/i, issue: 'Forbidden Tolkien-style fantasy element detected' },
      { pattern: /\b(?:kingdom|castle|feudal|knight|sword\s+and\s+sorcery)\b/i, issue: 'Forbidden medieval-fantasy setting drift detected' },
    ];

    settingViolations.forEach(({ pattern, issue }) => {
      if (pattern.test(narrativeOriginal)) {
        issues.push(issue);
      }
    });

    // =========================================================================
    // CATEGORY 4: CHARACTER BEHAVIOR CONSISTENCY (Based on path personality)
    // NOTE: jackActionStyle, jackRiskLevel, jackBehaviorDeclaration were removed from schema.
    // Behavior consistency is now validated through narrative text analysis only.
    // The LLM handles behavior planning internally via <internal_planning> in system prompt.
    // =========================================================================
    if (context.pathPersonality) {
      const personality = context.pathPersonality;

      // Check for personality-inconsistent behavior in narrative text
      // NOTE: These are now warnings only since we can't detect emotional state exceptions
      // without the schema field. Trust the <internal_planning> system prompt guidance.
      if (personality.riskTolerance === 'low') {
        // Methodical Jack shouldn't suddenly be reckless
        const recklessBehavior = /\b(?:i|jack)\s+(?:rushed|stormed|lunged|burst|barreled)\s+(?:in|into|through|forward)\b/i;
        const chargedAction = /\b(?:i|jack)\s+charged\s+(?:in|into|through|forward|at)\b/i;

        if (recklessBehavior.test(narrativeOriginal) || chargedAction.test(narrativeOriginal)) {
          warnings.push('Methodical Jack is acting recklessly (rushed/charged/stormed). Verify this fits the scene context.');
        }

        // Check for impulsive actions
        const impulsiveActions = /\bwithout\s+(?:thinking|hesitation|a\s+second\s+thought)\b|\b(?:i|jack)\s+(?:grabbed|lunged|dove|leapt)\s+(?:at|for|toward)\b/i;
        if (impulsiveActions.test(narrativeOriginal)) {
          warnings.push('Methodical Jack is acting impulsively. Verify this fits the scene context.');
        }
      } else if (personality.riskTolerance === 'high') {
        // Aggressive Jack shouldn't suddenly become overly cautious
        // Note: For aggressive->cautious, we use warnings (not errors) since this is less narratively jarring
        const overlyPrudent = /\b(?:i|jack)\s+(?:hesitated\s+for\s+(?:a\s+)?long|wavered|second-guessed|held\s+back|waited\s+patiently|decided\s+to\s+wait)\b/i;
        if (overlyPrudent.test(narrativeOriginal)) {
          warnings.push('Aggressive Jack is showing cautious behavior (hesitated/wavered). Consider if this fits the scene context.');
        }

        // Check for excessive deliberation
        const excessiveDeliberation = /\b(?:i|jack)\s+(?:carefully\s+considered|weighed\s+(?:my|the)\s+options|took\s+(?:my|his)\s+time\s+(?:to|before))\b/i;
        if (excessiveDeliberation.test(narrativeOriginal)) {
          warnings.push('Aggressive Jack is deliberating excessively. Consider if this fits the scene context.');
        }
      }
    }

    // =========================================================================
    // CATEGORY 5: PLOT CONTINUITY - Check narrative threads - STRICTLY ENFORCED
    // =========================================================================
    if (context.narrativeThreads && context.narrativeThreads.length > 0) {
      // Get critical threads that MUST be addressed (appointments and promises)
      const criticalThreads = context.narrativeThreads.filter(t =>
        t.status === 'active' &&
        (t.type === 'appointment' || t.type === 'promise' || t.type === 'threat' || t.urgency === 'critical')
      );

      if (criticalThreads.length > 0 && context.currentPosition.chapter > 2) {
        // Check if LLM provided thread acknowledgments
        const addressedThreads = content.previousThreadsAddressed || [];

        // ========== NEW: Verify addressed threads actually match critical threads ==========
        // This prevents the LLM from claiming to address made-up threads
        let validAddressedCount = 0;
        const unmatchedCritical = [...criticalThreads];

        for (const addressed of addressedThreads) {
          const addressedLower = (addressed.originalThread || '').toLowerCase();

          // Try to match this addressed thread to a critical thread
          const matchIndex = unmatchedCritical.findIndex(critical => {
            const criticalLower = (critical.description || '').toLowerCase();
            // Match if there's significant overlap in key terms
            const addressedWords = addressedLower.split(/\s+/).filter(w => w.length > 3);
            const criticalWords = criticalLower.split(/\s+/).filter(w => w.length > 3);
            // Use prefix matching: one word must be a prefix of the other (min 4 chars)
            // This allows "promise" to match "promised" but prevents "case" matching "showcase"
            const wordsMatch = (a, b) => {
              if (a.length < 4 || b.length < 4) return a === b;
              return a.startsWith(b) || b.startsWith(a);
            };
            const matchingWords = addressedWords.filter(w => criticalWords.some(cw => wordsMatch(w, cw)));
            // Require at least 2 matching words or 40% overlap
            return matchingWords.length >= 2 || matchingWords.length / Math.max(addressedWords.length, 1) > 0.4;
          });

          if (matchIndex !== -1) {
            validAddressedCount++;
            unmatchedCritical.splice(matchIndex, 1); // Remove matched thread
          } else {
            // Log potential fabricated thread
            console.warn(`[StoryGenerationService] Thread addressed doesn't match any critical thread: "${addressedLower.slice(0, 60)}..."`);
          }
        }

        // Require ALL critical threads to be VALIDLY acknowledged.
        // The system prompt instructs the model to copy originalThread exactly and the engine treats
        // missing critical threads as a hard continuity failure (we will hard-enforce in generation).
        const criticalCount = criticalThreads.length;
        const requiredAcknowledgments = criticalCount;
        if (validAddressedCount < requiredAcknowledgments) {
          issues.push(
            `THREAD CONTINUITY VIOLATION: Only ${validAddressedCount}/${criticalCount} critical threads validly addressed (${addressedThreads.length} claimed). Must acknowledge ALL ${requiredAcknowledgments}. Unaddressed: ${unmatchedCritical.slice(0, 3).map(t => t.description?.slice(0, 50)).join('; ')}`
          );
        }

        // =========================================================================
        // THREAD ESCALATION SYSTEM - Track and enforce overdue threads
        // =========================================================================
        for (const addressed of addressedThreads) {
          const threadId = addressed.originalThread.slice(0, 50); // Use truncated description as ID

          if (addressed.howAddressed === 'acknowledged' || addressed.howAddressed === 'delayed') {
            // Increment acknowledgment count for threads that weren't progressed
            const currentCount = (this.threadAcknowledgmentCounts.get(threadId) || 0) + 1;
            this.threadAcknowledgmentCounts.set(threadId, currentCount);

            // If acknowledged 2+ times without progress, flag as OVERDUE ERROR
            if (currentCount >= 2) {
              // Use word-based prefix matching to find the corresponding critical thread
              // This handles LLM rewording (e.g., "promised to meet" → "meeting") while
              // distinguishing similar threads (e.g., "meet contact" vs "call contact")
              const threadIdWords = threadId.toLowerCase().match(/\b\w{4,}\b/g) || [];
              const wordsMatchFn = (a, b) => {
                if (a.length < 4 || b.length < 4) return a === b;
                return a.startsWith(b) || b.startsWith(a);
              };
              const matchingCritical = criticalThreads.find(t => {
                if (!t.description) return false;
                const descWords = t.description.toLowerCase().match(/\b\w{4,}\b/g) || [];
                const matchingWords = threadIdWords.filter(tw =>
                  descWords.some(dw => wordsMatchFn(tw, dw))
                );
                // Require at least 2 matching words AND 40% overlap
                return matchingWords.length >= 2 && matchingWords.length / Math.max(threadIdWords.length, 1) > 0.4;
              });
              if (matchingCritical) {
                issues.push(`OVERDUE THREAD ERROR: "${addressed.originalThread.slice(0, 60)}..." has been acknowledged ${currentCount} times without resolution. You MUST either resolve it, progress it meaningfully, or mark it as "failed" with explanation.`);
              }
            }
          } else if (addressed.howAddressed === 'resolved' || addressed.howAddressed === 'progressed' || addressed.howAddressed === 'failed') {
            // Reset counter when thread is actually addressed
            this.threadAcknowledgmentCounts.delete(threadId);
          }

          // Verify acknowledged threads actually appear in narrative
          if (addressed.howAddressed === 'resolved' || addressed.howAddressed === 'progressed') {
            const threadLower = addressed.originalThread.toLowerCase();
            const narrativeLower = narrative.toLowerCase();

            // Extract key nouns/names from the thread description
            // Only canonical character names are matched - other characters are LLM-generated
            const keyWords = threadLower.match(/\b(?:jack|victoria|blackwell|meet|promise|call|contact|investigate|reveal)\b/g) || [];

            // Use prefix matching to allow word variations (meet/meeting, promise/promised)
            // but prevent false positives (case/showcase)
            const narrativeWords = narrativeLower.match(/\b\w+\b/g) || [];
            const mentionedInNarrative = keyWords.some(keyword => {
              return narrativeWords.some(w => {
                if (keyword.length < 4 || w.length < 4) return keyword === w;
                return keyword.startsWith(w) || w.startsWith(keyword);
              });
            });

            if (!mentionedInNarrative && keyWords.length > 0) {
              warnings.push(`Thread claimed as "${addressed.howAddressed}" but may not appear in narrative: "${addressed.originalThread.slice(0, 60)}..."`);
            }
          }
        }
      }

      // Check for dangling appointments more than 2 chapters old - NOW ERROR
      const oldAppointments = context.narrativeThreads.filter(t =>
        t.status === 'active' &&
        t.type === 'appointment' &&
        t.chapter && (context.currentPosition.chapter - t.chapter) >= 2
      );

      if (oldAppointments.length > 0) {
        issues.push(`OVERDUE APPOINTMENTS: ${oldAppointments.length} appointment(s) from 2+ chapters ago still unresolved. These MUST be addressed: ${oldAppointments.slice(0, 2).map(t => t.description).join('; ')}`);
      }

      // Check for old promises - NOW ERROR after 3 chapters
      const oldPromises = context.narrativeThreads.filter(t =>
        t.status === 'active' &&
        t.type === 'promise' &&
        t.chapter && (context.currentPosition.chapter - t.chapter) >= 3
      );

      if (oldPromises.length > 0) {
        issues.push(`OVERDUE PROMISES: ${oldPromises.length} promise(s) from 3+ chapters ago still unresolved. These MUST be resolved or failed: ${oldPromises.slice(0, 2).map(t => t.description).join('; ')}`);
      }
    }

    // =========================================================================
    // CATEGORY 6: DECISION CONSEQUENCE CARRYOVER
    // =========================================================================
    // Check that narrative mentions or reflects consequences of player's choices
    if (context.playerChoices && context.playerChoices.length > 0 && context.currentPosition.subchapter === 1) {
      const lastChoice = context.playerChoices[context.playerChoices.length - 1];
      const lastChoiceChapter = this._extractChapterFromCase(lastChoice.caseNumber);

      // If this is the first subchapter after a decision, narrative should acknowledge it
      if (lastChoiceChapter === context.currentPosition.chapter - 1) {
        // Look for any indication the choice is being addressed
        const hasChoiceReference = /(?:choice|decision|chose|decided|opted|path|went with|took the)/i.test(narrativeOriginal);
        if (!hasChoiceReference) {
          warnings.push('Opening of new chapter should acknowledge/reflect the player\'s previous decision');
        }
      }
    }

    // =========================================================================
    // CATEGORY 7: FORBIDDEN WRITING PATTERNS
    // =========================================================================
    const forbiddenPatterns = [
      { pattern: /—/g, issue: 'Em dashes (—) found - use commas, periods, or semicolons instead', count: true },
      { pattern: /\bis not just\b.*\bit'?s\b/i, issue: 'Forbidden pattern: "X is not just Y, it\'s Z"' },
      { pattern: /\bin a world where\b/i, issue: 'Forbidden phrase: "In a world where..."' },
      { pattern: /\blittle did (?:he|she|they|i|we) know\b/i, issue: 'Forbidden phrase: "Little did [anyone] know..."' },
      { pattern: /\bi couldn'?t help but\b/i, issue: 'Forbidden phrase: "I couldn\'t help but..."' },
      { pattern: /\bi found myself\b/i, issue: 'Forbidden phrase: "I found myself..."' },
      { pattern: /\bseemingly\b|\binterestingly\b|\bnotably\b|\bcertainly\b|\bundoubtedly\b/i, issue: 'Forbidden flowery adverbs detected' },
      { pattern: /\bundeniably\b|\bprofoundly\b|\bunmistakably\b|\binherently\b/i, issue: 'Forbidden AI-ism adverbs detected (undeniably, profoundly, unmistakably, inherently)' },
      { pattern: /\bdelve\b|\bunravel\b|\btapestry\b|\bmyriad\b/i, issue: 'Forbidden words detected (delve, unravel, tapestry, myriad)' },
      { pattern: /\bin the realm of\b|\bintricate\b|\bnuanced\b/i, issue: 'Forbidden AI-ism phrases detected (in the realm of, intricate, nuanced)' },
      { pattern: /\bpivotal\b|\bcrucial\b/i, issue: 'Overused emphasis words detected (pivotal, crucial) - consider stronger alternatives' },
      { pattern: /\ba testament to\b|\bserves as a reminder\b/i, issue: 'Forbidden cliche phrase detected' },
      // Removed: "weight of/gravity of" - these are legitimate phrases in noir fiction
      { pattern: /\bmoreover\b|\bfurthermore\b|\bin essence\b|\bconsequently\b|\badditionally\b/i, issue: 'Forbidden academic connectors detected' },
      { pattern: /\bthis moment\b|\bthis realization\b|\bthis truth\b/i, issue: 'Forbidden meta-commentary detected ("this moment/realization/truth")' },
      { pattern: /\bin that moment\b|\bat that instant\b|\bin the blink of an eye\b/i, issue: 'Forbidden time transition cliche detected' },
      { pattern: /\bit'?s (?:important|worth) (?:to note|noting)\b/i, issue: 'Forbidden meta-phrase detected ("it\'s important/worth noting")' },
    ];

    // Forbidden patterns are now WARNINGS, not errors
    // Stylistic preferences should not trigger expensive LLM retries
    forbiddenPatterns.forEach(({ pattern, issue, count }) => {
      if (count) {
        const matches = narrativeOriginal.match(pattern);
        if (matches && matches.length > 0) {
          warnings.push(`${issue} (found ${matches.length} instances)`);
        }
      } else if (pattern.test(narrativeOriginal)) {
        warnings.push(issue);
      }
    });

    // =========================================================================
    // CATEGORY 8: WORD COUNT VALIDATION (WARNINGS ONLY)
    // Expansion was causing text corruption so short narratives are now accepted
    // =========================================================================
    const wordCount = narrativeOriginal.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < MIN_WORDS_PER_SUBCHAPTER) {
      warnings.push(`Narrative shorter than minimum: ${wordCount} words (minimum ${MIN_WORDS_PER_SUBCHAPTER})`);
    } else if (wordCount < TARGET_WORDS * 0.85) {
      warnings.push(`Narrative shorter than target: ${wordCount} words (target ${TARGET_WORDS})`);
    }
    const maxWords = GENERATION_CONFIG?.wordCount?.maximum;
    if (typeof maxWords === 'number' && wordCount > maxWords) {
      warnings.push(`Narrative longer than maximum: ${wordCount} words (max ${maxWords}). Consider tightening for pacing/latency.`);
    }

    // =========================================================================
    // CATEGORY 8.1: BRANCHING NARRATIVE WORD COUNT VALIDATION (WARNINGS ONLY)
    // Each player path should meet the target word count (900-1050 words)
    // Structure: opening (300-350) + firstChoice response (300-350) + secondChoice response (300-350)
    // NOTE: These are warnings, not errors - schema instructs correct lengths, retries are wasteful
    // =========================================================================
    const bn = content.branchingNarrative;
    if (bn && bn.opening && bn.firstChoice && bn.secondChoices) {
      const countWords = (text) => (text || '').split(/\s+/).filter(w => w.length > 0).length;
      const MIN_SEGMENT_WORDS = 300;  // Minimum per segment (300-350 target). 3×300=900 word path minimum.
      const MIN_PATH_WORDS = MIN_WORDS_PER_SUBCHAPTER;  // Each complete path should meet subchapter minimum

      // Validate opening
      const openingWords = countWords(bn.opening.text);
      if (openingWords < MIN_SEGMENT_WORDS) {
        warnings.push(`Branching narrative opening too short: ${openingWords} words (minimum ${MIN_SEGMENT_WORDS})`);
      }

      // Validate first choice options (3 branches)
      const firstChoiceOptions = bn.firstChoice?.options || [];
      firstChoiceOptions.forEach((opt, idx) => {
        const optWords = countWords(opt.response);
        if (optWords < MIN_SEGMENT_WORDS) {
          warnings.push(`First choice "${opt.key || idx}" response too short: ${optWords} words (minimum ${MIN_SEGMENT_WORDS})`);
        }
      });

      // Validate second choice options (9 branches) and complete paths
      const secondChoices = bn.secondChoices || [];
      secondChoices.forEach((sc, scIdx) => {
        const parentOpt = firstChoiceOptions[scIdx];
        const parentWords = countWords(parentOpt?.response);

        (sc.options || []).forEach((opt, optIdx) => {
          const optWords = countWords(opt.response);
          if (optWords < MIN_SEGMENT_WORDS) {
            warnings.push(`Second choice "${opt.key || `${scIdx}-${optIdx}`}" response too short: ${optWords} words (minimum ${MIN_SEGMENT_WORDS})`);
          }

          // Validate complete path word count (opening + first choice + second choice)
          const pathWords = openingWords + parentWords + optWords;
          if (pathWords < MIN_PATH_WORDS) {
            const pathKey = opt.key || `${scIdx + 1}${String.fromCharCode(65 + optIdx)}`;
            warnings.push(`Path "${pathKey}" total too short: ${pathWords} words (minimum ${MIN_PATH_WORDS})`);
          } else if (pathWords < TARGET_WORDS * 0.85) {
            const pathKey = opt.key || `${scIdx + 1}${String.fromCharCode(65 + optIdx)}`;
            warnings.push(`Path "${pathKey}" below target: ${pathWords} words (target ${TARGET_WORDS})`);
          }
        });
      });

      // Summary stats for logging
      const totalBranchingWords = openingWords +
        firstChoiceOptions.reduce((sum, opt) => sum + countWords(opt.response), 0) +
        secondChoices.reduce((sum, sc) => sum + (sc.options || []).reduce((s, opt) => s + countWords(opt.response), 0), 0);

      if (totalBranchingWords < 3500) {
        warnings.push(`Total branching narrative content is thin: ${totalBranchingWords} words (expected ~4000+ for full coverage)`);
      }
    } else if (content.branchingNarrative) {
      // branchingNarrative exists but is malformed
      warnings.push('Branching narrative structure incomplete: missing opening, firstChoice, or secondChoices');
    }

    // =========================================================================
    // CATEGORY 8.5: STRUCTURED FIELDS QUALITY (Bridge/Previously/Summary/Puzzle words)
    // =========================================================================
    // Bridge: hook sentence should be short.
    if (typeof content.bridgeText === 'string') {
      const bridgeWords = content.bridgeText.split(/\s+/).filter(Boolean).length;
      if (bridgeWords > 18) warnings.push(`Bridge text is long (${bridgeWords} words). Aim for <= 15 words for a punchy hook.`);
    }

    // Previously: 1-2 sentences, <= 40 words.
    if (typeof content.previously === 'string') {
      const prevWords = content.previously.split(/\s+/).filter(Boolean).length;
      if (prevWords > 60) {
        warnings.push(`"previously" is too long (${prevWords} words). Must be 1-2 sentences and <= 40 words.`);
      } else if (prevWords > 40) {
        warnings.push(`"previously" exceeds 40-word target (${prevWords}). Consider tightening.`);
      }
    }

    // NOTE: chapterSummary validation removed - field no longer in schema
    // NOTE: puzzleCandidates validation removed - user preference

    // =========================================================================
    // CATEGORY 9: PERSPECTIVE/TENSE CONSISTENCY
    // =========================================================================
    // This game is THIRD-PERSON LIMITED (close on Jack), past tense.
    // Reject first-person narration pronouns to prevent POV drift,
    // but allow first-person INSIDE dialogue.
    const containsPronounOutsideQuotes = (text, pronounRegex) => {
      if (!text) return false;
      let quoteType = null; // null = not in quote, 'single' or 'double'
      let buf = '';
      const flush = () => {
        if (!buf) return false;
        const hit = pronounRegex.test(buf);
        buf = '';
        return hit;
      };

      // Handle all common quote types, tracking single vs double separately
      // to prevent apostrophes from closing double-quoted dialogue
      // - ASCII double quote: "
      // - Left/right curly double quotes: " " (U+201C, U+201D)
      // - ASCII single quote: ' (used for dialogue in this story)
      // - Left curly single quote: ' (U+2018) - used for dialogue
      // - Right curly single quote: ' (U+2019) - used for dialogue AND apostrophes
      // NOTE: We handle ASCII single quotes now by detecting apostrophes vs dialogue context
      const isOpeningDouble = (ch) => ch === '"' || ch === '\u201C';
      const isClosingDouble = (ch) => ch === '"' || ch === '\u201D';
      const isOpeningSingle = (ch) => ch === "'" || ch === '\u2018'; // ASCII or curly quote
      const isClosingSingle = (ch) => ch === "'" || ch === '\u2019'; // ASCII or curly quote

      for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        // Handle double quotes
        if (quoteType === null && isOpeningDouble(ch)) {
          if (flush()) return true;
          quoteType = 'double';
          continue;
        }
        if (quoteType === 'double' && isClosingDouble(ch)) {
          buf = '';
          quoteType = null;
          continue;
        }

        // Handle single quotes (detect apostrophes vs dialogue)
        if (quoteType === null && isOpeningSingle(ch)) {
          // Check if this looks like an apostrophe (letter on both sides) vs dialogue opening
          const nextChar = i + 1 < text.length ? text[i + 1] : '';
          const prevChar = i > 0 ? text[i - 1] : '';
          const isLikelyApostrophe = /[a-z]/i.test(prevChar) && /[a-z]/i.test(nextChar);

          if (!isLikelyApostrophe) {
            if (flush()) return true;
            quoteType = 'single';
            continue;
          }
        }
        if (quoteType === 'single' && isClosingSingle(ch)) {
          // Check if this closes dialogue (preceded by letter/punctuation, followed by space/punctuation)
          const prevChar = i > 0 ? text[i - 1] : '';
          const nextChar = i + 1 < text.length ? text[i + 1] : '';
          const isLikelyApostrophe = /[a-z]/i.test(prevChar) && /[a-z]/i.test(nextChar);

          if (!isLikelyApostrophe) {
            buf = '';
            quoteType = null;
            continue;
          }
        }

        // Only accumulate narration segments (outside quotes)
        if (quoteType === null) {
          buf += ch;
        }
      }
      return flush();
    };

    const firstPersonPronouns = /\b(?:i|me|my|mine|we|us|our|ours)\b/i;
    if (containsPronounOutsideQuotes(narrativeOriginal, firstPersonPronouns)) {
      issues.push('POV VIOLATION: First-person pronouns detected in narration. Narrative must be third-person limited past tense (dialogue may be first-person).');
    }

    // Discourage second-person narration as well (outside dialogue).
    const secondPersonPronouns = /\b(?:you|your|yours|yourself)\b/i;
    if (containsPronounOutsideQuotes(narrativeOriginal, secondPersonPronouns)) {
      warnings.push('Possible second-person phrasing detected in narration ("you/your"). Narrative should remain third-person limited.');
    }

    // =========================================================================
    // CATEGORY 10: NARRATIVE THREAD RESOLUTION ENFORCEMENT
    // =========================================================================
    // Verify that critical threads from previous chapters are addressed
    // Now uses urgency field for prioritization
    if (context.narrativeThreads && context.narrativeThreads.length > 0) {
      // Filter for threads that need resolution: critical urgency OR critical types with active status
      const criticalThreadTypes = ['appointment', 'promise', 'threat'];
      const threadsToCheck = context.narrativeThreads.filter(t => {
        if (t.status !== 'active') return false;
        // Critical urgency threads must always be addressed
        if (t.urgency === 'critical') return true;
        // Critical types should also be addressed
        if (criticalThreadTypes.includes(t.type)) return true;
        return false;
      });

      const addressedThreads = content.previousThreadsAddressed || [];

      for (const thread of threadsToCheck) {
        // Check if this thread was addressed in the generated content
        const threadDescription = (thread.description || thread.excerpt || '').toLowerCase();
        const threadKeywords = threadDescription.split(/\s+/).filter(w => w.length > 4).slice(0, 5);

        // Helper: prefix matching to allow word variations (promise/promised, meet/meeting)
        // but prevent false matches (case/showcase, rain/train)
        const wordMatchesInText = (keyword, text) => {
          // Find all words in text and check if any is a prefix match with keyword
          const words = text.match(/\b\w+\b/g) || [];
          return words.some(w => {
            if (keyword.length < 4 || w.length < 4) return keyword === w;
            return keyword.startsWith(w) || w.startsWith(keyword);
          });
        };

        const wasAddressed = addressedThreads.some(addressed => {
          if (!addressed.originalThread) return false;
          const addressedLower = addressed.originalThread.toLowerCase();
          // Check if at least 2 key words match using prefix matching
          // This allows "promise" to match "promised" but prevents "case" matching "showcase"
          const matchingKeywords = threadKeywords.filter(kw => wordMatchesInText(kw, addressedLower));
          return matchingKeywords.length >= 2;
        });

        // Also check if the thread is mentioned in the narrative itself
        const narrativeLower = narrative.toLowerCase();
        const mentionedInNarrative = threadKeywords.some(kw => wordMatchesInText(kw, narrativeLower));

        if (!wasAddressed && !mentionedInNarrative) {
          const threadChapter = thread.chapter || 0;
          const currentChapter = context.currentPosition?.chapter || 12;
          const chapterDistance = currentChapter - threadChapter;

          // Check if thread has explicit dueChapter and we've passed it
          const isOverdue = thread.dueChapter && currentChapter > thread.dueChapter;

          // Critical urgency threads are always issues if not addressed
          if (thread.urgency === 'critical' || isOverdue) {
            const deadlineInfo = thread.dueChapter
              ? `dueChapter: ${thread.dueChapter}, current: ${currentChapter}`
              : (thread.deadline || 'immediate');
            issues.push(`CRITICAL ${thread.type} thread not addressed: "${threadDescription.slice(0, 60)}..." (${deadlineInfo})`);
          } else if (chapterDistance <= 2) {
            // Recent threads of critical types are also issues
            issues.push(`Critical ${thread.type} thread not addressed: "${threadDescription.slice(0, 60)}..."`);
          } else {
            // Older threads become warnings
            warnings.push(`Older ${thread.type} thread may need resolution: "${threadDescription.slice(0, 40)}..."`);
          }
        }
      }

      // Also check for normal urgency threads that are getting stale (3+ chapters old)
      const staleNormalThreads = context.narrativeThreads.filter(t =>
        t.status === 'active' &&
        t.urgency === 'normal' &&
        (context.currentPosition?.chapter || 12) - (t.chapter || 0) >= 3
      );

      for (const thread of staleNormalThreads) {
        const threadDescription = (thread.description || thread.excerpt || '').toLowerCase();
        warnings.push(`Normal-urgency thread becoming stale (3+ chapters): "${threadDescription.slice(0, 50)}..."`);
      }
    }

    // =========================================================================
    // CATEGORY 11: PATH PERSONALITY BEHAVIOR CONSISTENCY
    // =========================================================================
    // Ensure Jack's actions match the established path personality
    // Note: Category 4 handles detailed checks; this is a broader safety net
    if (context.pathPersonality) {
      const personality = context.pathPersonality;
      // NOTE: jackBehaviorDeclaration removed from schema - now in <internal_planning>
      // Legacy validation kept for old data but won't run on new generations

      // Check for reckless behavior when player has been methodical
      if (personality.riskTolerance === 'low' || personality.narrativeStyle?.includes('cautiously')) {
        // Improved patterns: exclude standalone words that could be false positives
        const recklessPatterns = /\b(?:rushed\s+(?:in|into|forward)|stormed\s+(?:in|into|out)|burst\s+(?:in|into|through)|leapt\s+without|didn't\s+wait|threw\s+caution)\b/i;
        if (recklessPatterns.test(narrativeOriginal)) {
          warnings.push('Narrative shows reckless behavior that may conflict with methodical path personality');
        }
      }

      // Check for overly passive behavior when player has been aggressive
      if (personality.riskTolerance === 'high' || personality.narrativeStyle?.includes('decisively')) {
        const passivePatterns = /\b(?:hesitated\s+for\s+a\s+long|couldn't\s+bring\s+myself|waited\s+patiently|decided\s+to\s+observe|held\s+back\s+from)\b/i;
        if (passivePatterns.test(narrativeOriginal)) {
          warnings.push('Narrative shows passive behavior that may conflict with aggressive path personality');
        }
      }

      // NOTE: jackActionStyle field validation removed - field no longer in schema
    }

    // =========================================================================
    // CATEGORY 12: DRIFT PREVENTION (TIME LANGUAGE)
    // =========================================================================
    // Avoid vague magnitude phrasing that invites canon drift for key relationships.
    const fuzzyTimeline = [
      { pattern: /\bthree\s+decades?\b/i, warning: 'Avoid vague magnitude phrasing ("three decades"). Use exact canonical durations when referring to key relationships.' },
      { pattern: /\bdecades?\b/i, warning: 'Avoid vague magnitude phrasing ("decades"). Use exact canonical durations for key relationships.' },
      { pattern: /\b(?:years?\s+and\s+years?|for\s+years)\b/i, warning: 'Avoid vague time spans ("for years"). Use exact canonical durations when referring to key relationships.' },
    ];
    for (const { pattern, warning } of fuzzyTimeline) {
      if (pattern.test(narrativeOriginal)) warnings.push(warning);
    }

    // =========================================================================
    // CATEGORY 13: REVEAL TIMING (UNDER-MAP)
    // =========================================================================
    const currentChapter = context?.currentPosition?.chapter || 2;
    const currentSubchapter = context?.currentPosition?.subchapter || 1;
    const revealChapter = REVEAL_TIMING?.underMap?.firstUndeniable?.chapter || 1;
    const revealSubchapter = REVEAL_TIMING?.underMap?.firstUndeniable?.subchapter || DECISION_SUBCHAPTER;
    const revealLabel = REVEAL_TIMING?.underMap?.firstUndeniable?.label || `${revealChapter}${formatSubchapterLabel(revealSubchapter)}`;
    const isBeforeReveal = currentChapter < revealChapter ||
      (currentChapter === revealChapter && currentSubchapter < revealSubchapter);
    const isRevealSubchapter = currentChapter === revealChapter && currentSubchapter === revealSubchapter;

    const underMapExplicit = /\b(?:under-?map|threshold\s+(?:opened|gaped|unlatched)|the\s+city\s+rewrote\s+itself|map\s+that\s+wasn['']t\s+a\s+map)\b/i;
    // Before the reveal point, explicit Under-Map references are premature
    if (isBeforeReveal && underMapExplicit.test(narrativeOriginal)) {
      issues.push(`PREMATURE REVEAL: The Under-Map must remain plausibly deniable before the end of Chapter ${revealLabel}.`);
    }
    // In the reveal subchapter itself, only the ending should have the undeniable reveal
    if (isRevealSubchapter && underMapExplicit.test(narrativeOriginal)) {
      warnings.push(`Reveal timing note: Under-Map appears explicit in ${revealLabel}. Ensure this is at the END of the subchapter, not the beginning.`);
    }

    // Log warnings but don't block on them
    if (warnings.length > 0) {
      console.log('[ConsistencyValidator] Warnings:', warnings);
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * Determine whether a validation issue is continuity-critical (player-facing story break)
   * and therefore must be enforced as a hard failure (fallback / regeneration), not just warned.
   *
   * PHILOSOPHY: Be VERY conservative here. Only truly story-breaking issues should cause
   * hard failures. The goal is successful generation with good-enough quality, not perfection.
   * Minor inconsistencies are acceptable - players are forgiving of small details.
   *
   * NOTE: Most issues are now treated as warnings to ensure generation succeeds.
   */
  _isContinuityCriticalIssue(issue) {
    const s = String(issue || '');
    if (!s) return false;

    // =======================================================================
    // HARD FAILURES - Story-breaking issues that must be fixed
    //
    // Philosophy: We want a "pretty great" 12-chapter experience while
    // ensuring generation succeeds. Hard failures are reserved for:
    // 1. Things that confuse the player about basic facts
    // 2. Things that break player agency (their choices must matter)
    // 3. Things that create logical impossibilities
    // =======================================================================

    // --- TIER 1: IDENTITY & WORLD FACTS ---
    // Critical name misspellings that would confuse the player
    if (s.startsWith('Name misspelled:')) return true;

    // Avoid hardcoding noir-era “signature” constraints here; story bible enforces voice/tone.

    // --- TIER 2: PLAYER AGENCY (Critical for branching narrative) ---
    // If the player made a choice, the story MUST reflect that choice
    // This is the core promise of a branching narrative game
    //
    // NOTE: CHOICE RESPECT VIOLATION removed from critical issues (2024-12).
    // The keyword-matching validation is too simplistic - it fails when the LLM
    // uses synonyms/paraphrases (e.g., "confront" vs "face", "suspect" vs "man").
    // Gemini 3 is smart enough to respect player choices without literal keyword checks.
    // The prompt already contains strong instructions to reflect decisions.
    // Keeping keyword check as WARNING only (not critical) to avoid expensive retries.
    //
    // if (s.startsWith('CHOICE RESPECT VIOLATION:')) return true;  // DISABLED - false positives
    if (s.includes('contradicts player choice')) return true;
    if (s.includes('ignores chosen path')) return true;

    // --- TIER 3: LOGICAL IMPOSSIBILITIES ---
    // Dead characters cannot appear alive without explanation
    if (s.includes('character is dead') && s.includes('appears alive')) return true;
    if (s.includes('deceased character speaking')) return true;

    // Major revelations cannot be "re-discovered" - breaks mystery pacing
    if (s.includes('already revealed') && s.includes('re-discovers')) return true;

    // NOTE: Character-specific timeline blocking rules removed.
    // Only Jack and Victoria are canonical - LLM has creative freedom for supporting characters.

    // --- TIER 4: STORY DAY CONSISTENCY ---
    // The story spans exactly 12 days, one per chapter. Wrong day = confusion.
    if (s.startsWith('STORY DAY MISMATCH:')) return true;

    // --- TIER 6: PREMATURE REVELATIONS ---
    // The mystery has a carefully designed revelation gradient.
    // Revealing major twists too early ruins the entire experience.
    if (s.startsWith('PREMATURE REVELATION:')) return true;

    // =======================================================================
    // SOFT FAILURES - Convert to warnings, don't block generation
    // These matter for quality but players are forgiving of minor issues
    // =======================================================================

    // Branching narrative word count - validation still runs, but as warning only
    // Schema now instructs LLM to generate correct lengths, so retries are wasteful
    // if (s.includes('response too short:')) return true;  // DISABLED - warning only
    // if (s.includes('opening too short:')) return true;   // DISABLED - warning only
    // if (s.includes('total too short:')) return true;     // DISABLED - warning only

    // Thread continuity - important but not worth failing over
    // if (s.startsWith('THREAD CONTINUITY VIOLATION:')) return true;  // DISABLED
    // if (s.startsWith('OVERDUE THREAD ERROR:')) return true;  // DISABLED

    // Timeline approximations (vague references) - close enough is fine
    // if (s.includes('Timeline approximation')) return true;  // DISABLED

    // Personality enforcement - Jack can have emotional moments
    // if (s.startsWith('PERSONALITY VIOLATION:')) return true;  // DISABLED

    return false;
  }

  // ==========================================================================
  // A+ QUALITY VALIDATORS - Advanced prose and narrative quality checks
  // ==========================================================================

  /**
   * Validate prose quality - checks for metaphor variety, sentence diversity, and atmosphere/voice
   * Returns quality score (0-100) and specific feedback
   */
  _validateProseQuality(narrative) {
    const issues = [];
    const warnings = [];
    let qualityScore = 100;

    // ========== 1. METAPHOR DETECTION ==========
    // Noir prose should have evocative metaphors, not generic descriptions
    const noirMetaphorPatterns = [
      /rain\s+(?:fell|poured|drummed|hammered|beat|washed|slicked|dripped)/i,
      /shadow[s]?\s+(?:stretched|crawled|pooled|swallowed|embraced|clung)/i,
      /neon\s+(?:bled|reflected|flickered|buzzed|hummed|painted|spilled)/i,
      /city\s+(?:breathed|slept|whispered|groaned|stretched|waited)/i,
      /silence\s+(?:hung|pressed|settled|wrapped|stretched|fell)/i,
      /guilt\s+(?:weighed|gnawed|clawed|settled|wrapped|clung)/i,
      /memory\s+(?:surfaced|lurked|haunted|clawed|whispered|echoed)/i,
      /truth\s+(?:cut|burned|stung|waited|lurked|surfaced)/i,
      /(?:voice|words?)\s+(?:cut|sliced|dripped|hung|fell|echoed)/i,
      /eyes\s+(?:burned|bored|searched|narrowed|softened|hardened)/i,
    ];

    const metaphorCount = noirMetaphorPatterns.reduce((count, pattern) => {
      return count + (narrative.match(pattern)?.length || 0);
    }, 0);

    const wordCount = narrative.split(/\s+/).length;
    const expectedMetaphors = Math.max(2, Math.floor(wordCount / 200)); // Expect 1 per 200 words, minimum 2

    if (metaphorCount < expectedMetaphors) {
      warnings.push(`Prose lacks atmospheric texture: only ${metaphorCount} evocative metaphors found (expected ${expectedMetaphors}+). Add sensory/setting grounding.`);
      qualityScore -= 10;
    }

    // ========== 2. SENSORY DETAIL CHECK ==========
    // Strong prose engages multiple senses
    const sensoryPatterns = {
      visual: /\b(?:saw|watched|looked|glanced|neon|shadow|dark|light|glow|flicker|gleam|shine)\b/gi,
      auditory: /\b(?:heard|sound|noise|whisper|echo|creak|hum|buzz|silence|quiet|jukebox|rain\s+(?:drummed|hammered|pattered))\b/gi,
      tactile: /\b(?:felt|cold|warm|wet|damp|rough|smooth|grip|touch|chill|sting|burn)\b/gi,
      olfactory: /\b(?:smell|scent|odor|stink|perfume|smoke|whiskey|rain|musk|sweat)\b/gi,
      taste: /\b(?:taste|bitter|sweet|sour|whiskey|bourbon|coffee|blood)\b/gi,
    };

    const sensoryHits = {};
    let totalSensory = 0;
    for (const [sense, pattern] of Object.entries(sensoryPatterns)) {
      const matches = narrative.match(pattern) || [];
      sensoryHits[sense] = matches.length;
      totalSensory += matches.length;
    }

    const sensesCovered = Object.values(sensoryHits).filter(v => v > 0).length;
    if (sensesCovered < 3) {
      warnings.push(`Limited sensory engagement: only ${sensesCovered}/5 senses used. Add ${['visual', 'auditory', 'tactile', 'olfactory', 'taste'].filter(s => !sensoryHits[s]).join(', ')} details.`);
      qualityScore -= 5;
    }

    // ========== 3. DIALOGUE QUALITY CHECK ==========
    // Extract dialogue and check for quality
    // Support both ASCII quotes (") and curly/smart quotes (" ")
    const dialogueMatches = narrative.match(/[""\u201C][^""\u201C\u201D]+[""\u201D]/g) || [];
    if (dialogueMatches.length > 0) {
      // Check for weak dialogue tags
      const weakTags = /(?:he|she|i)\s+(?:said|asked|replied)\s+(?:quietly|loudly|softly|quickly|slowly)/gi;
      if (weakTags.test(narrative)) {
        warnings.push('Weak dialogue tags with adverbs detected. Show emotion through action beats instead.');
        qualityScore -= 3;
      }

      // Check for talking heads (no action beats between dialogue)
      // Support both ASCII and curly quotes
      const consecutiveDialogue = narrative.match(/[""\u201C][^""\u201C\u201D]+[""\u201D]\s*\n*\s*[""\u201C][^""\u201C\u201D]+[""\u201D]\s*\n*\s*[""\u201C][^""\u201C\u201D]+[""\u201D]\s*\n*\s*[""\u201C][^""\u201C\u201D]+[""\u201D]/g);
      if (consecutiveDialogue && consecutiveDialogue.length > 0) {
        warnings.push('Dialogue passages lack action beats. Break up long exchanges with physical actions or observations.');
        qualityScore -= 5;
      }
    }

    // ========== 4. PARAGRAPH VARIETY CHECK ==========
    const paragraphs = narrative.split(/\n\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length > 0) {
      const paragraphLengths = paragraphs.map(p => p.split(/\s+/).length);
      const avgLength = paragraphLengths.reduce((a, b) => a + b, 0) / paragraphLengths.length;
      const variance = paragraphLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / paragraphLengths.length;

      // Low variance means monotonous paragraph structure
      if (variance < 100 && paragraphs.length > 3) {
        warnings.push(`Monotonous paragraph structure: variance ${Math.round(variance)}. Vary paragraph lengths for better pacing.`);
        qualityScore -= 5;
      }
    }

    // ========== 5. OPENING QUALITY CHECK ==========
    const firstParagraph = paragraphs[0] || '';
    const hasAtmosphericOpening = noirMetaphorPatterns.some(p => p.test(firstParagraph)) ||
                                   /\b(?:rain|shadow|night|dark|neon|city|street)\b/i.test(firstParagraph);

    if (!hasAtmosphericOpening && wordCount > 200) {
      warnings.push('Opening lacks atmospheric grounding. Start with sensory scene-setting.');
      qualityScore -= 5;
    }

    // ========== 6. ATMOSPHERE DENSITY CHECK (Positive requirement) ==========
    // Noir prose REQUIRES atmospheric elements - not just absence of forbidden ones
    const atmospherePatterns = {
      weather: /\b(?:rain|drizzle|downpour|storm|mist|fog|damp|wet|puddle|umbrella|overcast|cloud|grey|gray)\b/gi,
      lighting: /\b(?:neon|shadow|dark|dim|glow|flicker|lamp|streetlight|moonlight|fluorescent|bulb)\b/gi,
      urbanTexture: /\b(?:concrete|brick|alley|street|gutter|pavement|curb|sidewalk|corner|building)\b/gi,
      noirMood: /\b(?:smoke|cigarette|whiskey|bourbon|glass|bottle|bar|jukebox|mirror|booth)\b/gi,
      timeOfDay: /\b(?:night|midnight|dawn|dusk|evening|late|early|hour|clock|morning)\b/gi,
    };

    const atmosphereHits = {};
    let totalAtmosphere = 0;
    for (const [category, pattern] of Object.entries(atmospherePatterns)) {
      const matches = narrative.match(pattern) || [];
      atmosphereHits[category] = matches.length;
      totalAtmosphere += matches.length;
    }

    // Require minimum atmosphere density (at least 3 categories represented)
    const categoriesCovered = Object.values(atmosphereHits).filter(v => v > 0).length;
    if (categoriesCovered < 3) {
      warnings.push(`Thin atmosphere: only ${categoriesCovered}/5 atmosphere categories present (weather, lighting, urban texture, mood, time). Add more environmental grounding.`);
      qualityScore -= 5;
    }

    // Check density relative to word count (expect ~1 atmospheric element per 50 words)
    const expectedAtmosphere = Math.floor(wordCount / 50);
    if (totalAtmosphere < expectedAtmosphere * 0.5) {
      warnings.push(`Low atmosphere density: ${totalAtmosphere} elements in ${wordCount} words (expected ${expectedAtmosphere}+). Scene feels sterile - add rain, neon, shadows, smoke.`);
      qualityScore -= 5;
    }

    // ========== 7. GENERIC PHRASE DETECTION ==========
    // Detect phrases that feel AI-generated or generic
    const genericPatterns = [
      { pattern: /\bthe air\s+(?:was|felt)\s+(?:thick|heavy|tense)\b/i, issue: 'Generic atmosphere: "the air was thick/heavy"' },
      { pattern: /\bmy\s+(?:heart|pulse)\s+(?:raced|pounded|quickened)\b/i, issue: 'Generic tension: heart racing/pounding' },
      { pattern: /\ba\s+(?:chill|shiver)\s+(?:ran|went)\s+down\s+(?:my|his|her)\s+spine\b/i, issue: 'Cliché: chill down spine' },
      { pattern: /\btime\s+(?:seemed\s+to\s+)?(?:stood|stopped|froze|slowed)\b/i, issue: 'Cliché: time stopped/froze' },
      { pattern: /\beverything\s+(?:changed|happened)\s+(?:so\s+)?fast\b/i, issue: 'Generic pacing: everything happened fast' },
    ];

    for (const { pattern, issue } of genericPatterns) {
      if (pattern.test(narrative)) {
        warnings.push(`${issue} - rewrite with more specific imagery`);
        qualityScore -= 3;
      }
    }

    return {
      score: Math.max(0, qualityScore),
      issues,
      warnings,
      details: {
        metaphorCount,
        sensoryHits,
        atmosphereHits,
        atmosphereDensity: totalAtmosphere,
        dialogueCount: dialogueMatches.length,
        paragraphCount: paragraphs.length,
        hasAtmosphericOpening,
      },
    };
  }

  /**
   * Validate character voice consistency in dialogue
   * Ensures Victoria sounds distinct and matches her established voice
   * NOTE: Only Jack and Victoria are canonical characters - LLM has freedom for others
   */
  _validateCharacterVoices(narrative) {
    const issues = [];
    const warnings = [];

    // Only Victoria has canonical voice constraints - other characters are LLM-generated
    // Victoria should never sound casual or use slang
    const victoriaDialogue = narrative.match(/(?:victoria|blackwell)\s+(?:said|spoke|replied|whispered)[^""\u201C\u201D]*[""\u201C]([^""\u201C\u201D]+)[""\u201D]/gi) || [];
    for (const match of victoriaDialogue) {
      const text = match.match(/[""\u201C]([^""\u201C\u201D]+)[""\u201D]/)?.[1] || '';
      if (/\b(?:gonna|gotta|ain't|ya|hey|buddy|pal|like,?\s+you\s+know|whatever)\b/i.test(text)) {
        issues.push('Victoria uses overly casual language - should be elegant and formal');
      }
    }

    return { issues, warnings };
  }

  // ==========================================================================
  // PROMPT DIAGNOSTICS - Verify all components are being included
  // ==========================================================================

  // ==========================================================================
  // LLM-BASED VALIDATION - Semantic understanding of rule violations
  // ==========================================================================

  /**
   * Validate content using LLM for semantic understanding
   * This catches violations that regex can't detect (e.g., wrong years, contradictions)
   * Uses a fast, cheap LLM call with minimal thinking
   * @param {Object} content - Generated content to validate
   * @param {Object} context - Story context
   * @returns {Promise<Object>} Validation result with issues and suggestions
   */
  async _validateWithLLM(content, context) {
    const { protagonist, antagonist, setting } = ABSOLUTE_FACTS;
    const narrative = content.narrative || '';
    const revealLabel = REVEAL_TIMING?.underMap?.firstUndeniable?.label || `1${formatSubchapterLabel(DECISION_SUBCHAPTER)}`;

    // Skip for very short content
    if (narrative.length < 200) {
      return { issues: [], suggestions: [], validated: false, reason: 'content too short' };
    }

    console.log(`[StoryGen] 🔍 Running LLM validation on ${narrative.length} chars...`);

    // ========== CRITICAL THREAD CHECKING ==========
    // Extract critical/overdue threads that MUST be addressed
    const currentChapter = context.currentPosition?.chapter || 1;
    const criticalThreads = (context.narrativeThreads || [])
      .filter(t => t.status === 'active')
      .filter(t => {
        const isOverdue = t.dueChapter && currentChapter > t.dueChapter;
        const isCritical = t.urgency === 'critical';
        const isUrgentType = ['appointment', 'promise', 'threat'].includes(t.type);
        return isOverdue || isCritical || isUrgentType;
      })
      .slice(0, 5); // Top 5 most critical threads

    const threadSection = criticalThreads.length > 0 ? `
## CRITICAL THREADS (Must be addressed in narrative):
${criticalThreads.map((t, i) => `${i + 1}. [${t.type}] ${t.description}${t.dueChapter ? ` (Due: Ch${t.dueChapter})` : ''}`).join('\n')}

Check if each critical thread above is addressed through dialogue or action (not just thoughts).
` : '';

    try {
      const validationPrompt = `You are a strict continuity editor for a modern mystery thriller with a hidden fantasy layer (the Under-Map). Check this narrative excerpt for FACTUAL ERRORS and THREAD VIOLATIONS.

## ABSOLUTE FACTS (Cannot be contradicted):
- ${protagonist.fullName}: ${protagonist.age} years old; ${protagonist.formerTitle.toLowerCase()}; ${protagonist.currentStatus.toLowerCase()}; initially does NOT know the Under-Map is real
- ${antagonist.trueName}: sends dead letters with ${antagonist.communication.ink.toLowerCase()}; guides Jack via rules and routes
- Setting: modern ${setting.city}; hidden layer threaded through infrastructure; no Tolkien-style medieval fantasy
- Reveal timing: first undeniable "the world is not what it seems" reveal occurs at the END of ${revealLabel}, not earlier
- Other characters: The LLM has creative freedom to generate supporting characters as needed
${threadSection}
## NARRATIVE TO CHECK:
${narrative.slice(0, TRUNCATE_VALIDATION)}${narrative.length > 3000 ? '\n[truncated]' : ''}

## INSTRUCTIONS:
1. Look for ANY factual contradictions (wrong years, wrong relationships, wrong names)
2. Check timeline references ("X years ago" must match the facts above)
3. Check character relationships (who knows who, how long)
4. Check setting details (city name, locations)
${criticalThreads.length > 0 ? '5. Verify each CRITICAL THREAD is addressed (through dialogue/action, not just thought)' : ''}

Respond with JSON:
{
  "hasIssues": true/false,
  "issues": ["specific issue 1", "specific issue 2"],
  "suggestions": ["how to fix issue 1", "how to fix issue 2"],
  "unaddressedThreads": ["thread description if not addressed"],
  "confidence": "high"/"medium"/"low"
}

If no issues found, return: { "hasIssues": false, "issues": [], "suggestions": [], "unaddressedThreads": [], "confidence": "high" }`;

      const response = await llmService.complete(
        [{ role: 'user', content: validationPrompt }],
        {
          systemPrompt: 'You are a meticulous continuity editor. Find factual errors and unaddressed plot threads. Be specific. No false positives.',
          maxTokens: GENERATION_CONFIG.maxTokens.llmValidation,
          responseSchema: {
            type: 'object',
            properties: {
              hasIssues: { type: 'boolean' },
              issues: { type: 'array', items: { type: 'string' } },
              suggestions: { type: 'array', items: { type: 'string' } },
              unaddressedThreads: { type: 'array', items: { type: 'string' } },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['hasIssues', 'issues', 'suggestions', 'unaddressedThreads', 'confidence'],
          },
          traceId: `validation-${Date.now()}`,
          thinkingLevel: 'low', // Fast validation, don't need deep reasoning
        }
      );

      // Track token usage
      this._trackTokenUsage(response?.usage, 'LLM Validation');

      // Check for truncation
      if (response.isTruncated || response.finishReason === 'MAX_TOKENS') {
        console.warn('[StoryGen] ⚠️ LLM validation response truncated (hit maxTokens). Validation skipped.');
        return { issues: [], suggestions: [], validated: false, reason: 'truncated response' };
      }

      // Parse response
      let result;
      try {
        result = typeof response.content === 'string'
          ? JSON.parse(response.content)
          : response.content;
      } catch (parseErr) {
        console.warn('[StoryGen] ⚠️ Failed to parse LLM validation response:', parseErr.message);
        return { issues: [], suggestions: [], validated: false, reason: 'parse error' };
      }

      // Combine regular issues with unaddressed thread issues
      const allIssues = [...(result.issues || [])];
      const unaddressedThreads = result.unaddressedThreads || [];

      // Add unaddressed threads as issues
      if (unaddressedThreads.length > 0) {
        unaddressedThreads.forEach(thread => {
          allIssues.push(`[THREAD] Unaddressed critical thread: ${thread}`);
        });
        console.log(`[StoryGen] ⚠️ ${unaddressedThreads.length} critical threads not addressed in narrative`);
      }

      if (allIssues.length > 0) {
        console.log(`[StoryGen] ❌ LLM validation found ${allIssues.length} issues:`);
        allIssues.forEach((issue, i) => {
          console.log(`  ${i + 1}. ${issue}`);
          // Safe access: check if suggestions array exists and has this index
          if (result.suggestions && result.suggestions[i]) {
            console.log(`     → Fix: ${result.suggestions[i]}`);
          }
        });
      } else {
        console.log(`[StoryGen] ✅ LLM validation passed (confidence: ${result.confidence || 'unknown'})`);
      }

      return {
        issues: allIssues,
        suggestions: result.suggestions || [],
        unaddressedThreads,
        confidence: result.confidence || 'medium',
        validated: true,
      };

    } catch (error) {
      console.warn(`[StoryGen] ⚠️ LLM validation failed:`, error.message);
      return { issues: [], suggestions: [], validated: false, reason: error.message };
    }
  }

  /**
   * Validate sentence variety to prevent monotonous prose
   * Checks for I-stacking, sentence length variety, and opener diversity
   */
  _validateSentenceVariety(narrative) {
    const issues = [];
    const warnings = [];

    const sentences = narrative.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length < 5) {
      return { issues, warnings }; // Not enough sentences to validate
    }

    // ========== 1. I-STACKING DETECTION ==========
    // Count sentences starting with "I"
    let consecutiveIStarts = 0;
    let maxConsecutiveI = 0;
    let totalIStarts = 0;

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (/^I\s+(?!didn't|don't|won't|can't|couldn't|wouldn't|shouldn't)/i.test(trimmed)) {
        consecutiveIStarts++;
        totalIStarts++;
        maxConsecutiveI = Math.max(maxConsecutiveI, consecutiveIStarts);
      } else {
        consecutiveIStarts = 0;
      }
    }

    // I-stacking is now a WARNING, not an error - stylistic issue shouldn't trigger retries
    if (maxConsecutiveI >= 4) {
      warnings.push(`I-stacking detected: ${maxConsecutiveI} consecutive sentences start with "I". Vary sentence openers.`);
    } else if (maxConsecutiveI >= 3) {
      warnings.push(`Minor I-stacking: ${maxConsecutiveI} consecutive "I" sentences. Consider varying openers.`);
    }

    const iPercentage = (totalIStarts / sentences.length) * 100;
    if (iPercentage > 50) {
      warnings.push(`${Math.round(iPercentage)}% of sentences start with "I". Aim for under 40%.`);
    }

    // ========== 2. SENTENCE LENGTH VARIETY ==========
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;

    // Check for monotonous length (all sentences within 5 words of average)
    const nearAverage = sentenceLengths.filter(len => Math.abs(len - avgLength) < 5).length;
    const monotonyRatio = nearAverage / sentenceLengths.length;

    if (monotonyRatio > 0.8) {
      warnings.push(`Monotonous sentence length: ${Math.round(monotonyRatio * 100)}% near average (${Math.round(avgLength)} words). Mix short punchy sentences with longer ones.`);
    }

    // Check for at least some short sentences (under 8 words) for punch
    const shortSentences = sentenceLengths.filter(len => len < 8).length;
    if (shortSentences < sentences.length * 0.1) {
      warnings.push('Few short sentences for impact. Add punchy 3-7 word sentences for rhythm.');
    }

    // ========== 3. OPENER VARIETY ==========
    // Check first words of sentences for variety
    const openers = sentences.map(s => s.trim().split(/\s+/)[0]?.toLowerCase()).filter(Boolean);
    const openerCounts = {};
    for (const opener of openers) {
      openerCounts[opener] = (openerCounts[opener] || 0) + 1;
    }

    // Any opener used more than 25% of the time is overused
    for (const [opener, count] of Object.entries(openerCounts)) {
      const percentage = (count / openers.length) * 100;
      if (percentage > 25 && count >= 4) {
        warnings.push(`Opener "${opener}" overused: ${Math.round(percentage)}% of sentences. Vary your sentence starts.`);
      }
    }

    // ========== 4. PARAGRAPH OPENER VARIETY ==========
    const paragraphs = narrative.split(/\n\n+/).filter(p => p.trim());
    const paragraphOpeners = paragraphs.map(p => p.trim().split(/\s+/).slice(0, 3).join(' ').toLowerCase());

    // Check for repeated paragraph openers (e.g., "The rain..." "The city...")
    const paraOpenerCounts = {};
    for (const opener of paragraphOpeners) {
      // Check first 2 words
      const key = opener.split(/\s+/).slice(0, 2).join(' ');
      paraOpenerCounts[key] = (paraOpenerCounts[key] || 0) + 1;
    }

    for (const [opener, count] of Object.entries(paraOpenerCounts)) {
      if (count >= 3) {
        warnings.push(`Paragraph opener pattern "${opener}..." used ${count} times. Vary paragraph beginnings.`);
      }
    }

    return { issues, warnings };
  }

  /**
   * Setup/Payoff Registry - Track story setups that require payoffs
   * Critical for maintaining narrative promises across chapters
   */
  _setupPayoffRegistry = new Map();

  /**
   * Initialize setup/payoff tracking for major story revelations
   * Called once at the start of story generation
   */
  _initializeSetupPayoffRegistry() {
    const registry = Array.isArray(SETUP_PAYOFF_REGISTRY) ? SETUP_PAYOFF_REGISTRY : [];
    if (!this._setupPayoffRegistry) {
      this._setupPayoffRegistry = new Map();
    }
    this._setupPayoffRegistry.clear();

    for (const revelation of registry) {
      if (!revelation?.id) continue;
      this._setupPayoffRegistry.set(revelation.id, {
        ...revelation,
        setupsFound: [],
        payoffDelivered: false,
        payoffChapter: null,
      });
    }
  }

  /**
   * Track setups found in generated content
   */
  _trackSetups(narrative, chapter, subchapter) {
    const narrativeLower = narrative.toLowerCase();

    for (const [id, revelation] of this._setupPayoffRegistry.entries()) {
      if (revelation.payoffDelivered) continue;

      // Check for setups
      for (const setup of revelation.requiredSetups) {
        const setupPatterns = this._generateSetupPatterns(setup);
        for (const pattern of setupPatterns) {
          if (pattern.test(narrativeLower)) {
            if (!revelation.setupsFound.includes(setup)) {
              revelation.setupsFound.push(setup);
              console.log(`[SetupPayoff] Found setup for ${id}: "${setup}" in Chapter ${chapter}.${subchapter}`);
            }
            break;
          }
        }
      }
    }
  }

  /**
   * Generate regex patterns for setup detection
   */
  _generateSetupPatterns(setup) {
    const setupLower = setup.toLowerCase();
    const patterns = [];

    // Direct keyword matching
    const keywords = setupLower.match(/\b\w{4,}\b/g) || [];
    if (keywords.length >= 2) {
      // Pattern: at least 2 keywords within 100 characters
      patterns.push(new RegExp(keywords.slice(0, 2).join('.*').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\.\\\*/g, '.{0,100}'), 'i'));
    }

    if (/\btom\b/i.test(setupLower)) {
      patterns.push(/tom.*(?:map|atlas|archive|symbols?|glyphs?)/i, /wade.*(?:map|atlas|archive|symbols?|glyphs?)/i);
    }
    if (/\bvictoria\b/i.test(setupLower)) {
      patterns.push(/victoria.*(?:know|knew|knows|watch|watched|map|mapped|cartograph)/i, /blackwell.*(?:secret|rules?|map|cartograph|glyph)/i);
    }
    if (/\bgrange\b/i.test(setupLower)) {
      patterns.push(/grange.*(?:sealed|contained|erased|suppressed|warning)/i, /deputy.*(?:chief|suspicious|sealed|contained)/i);
    }
    if (/\bsilas\b/i.test(setupLower)) {
      patterns.push(/silas.*(?:drink|guilt|hiding|secret)/i, /reed.*(?:nervous|scared)/i);
    }
    if (/\bthornhill\b/i.test(setupLower)) {
      patterns.push(/thornhill.*(?:case|frame|innocent|dead)/i, /marcus.*(?:suicide|lockup)/i);
    }

    return patterns;
  }

  /**
   * Validate setup/payoff balance before major revelations
   */
  _validateSetupPayoff(chapter, narrative) {
    const issues = [];
    const warnings = [];

    for (const [id, revelation] of this._setupPayoffRegistry.entries()) {
      // Check if this narrative contains the payoff
      const payoffPatterns = Array.isArray(revelation.payoffPatterns)
        ? revelation.payoffPatterns
        : this._generatePayoffPatterns(id);
      const hasPayoff = payoffPatterns.some(p => p.test(narrative.toLowerCase()));

      if (hasPayoff) {
        // Validate sufficient setup before payoff
        if (revelation.setupsFound.length < revelation.minSetupCount) {
          issues.push(`PAYOFF WITHOUT SETUP: "${revelation.payoff}" revealed but only ${revelation.setupsFound.length}/${revelation.minSetupCount} required setups found. Previous setups: ${revelation.setupsFound.join(', ') || 'none'}`);
        }

        // Check timing
        if (chapter < revelation.earliestPayoffChapter) {
          warnings.push(`Early payoff: "${revelation.payoff}" in Chapter ${chapter} (recommended: ${revelation.earliestPayoffChapter}+)`);
        }

        revelation.payoffDelivered = true;
        revelation.payoffChapter = chapter;
      }

      // Warn if approaching latest payoff chapter without sufficient setup
      if (!revelation.payoffDelivered && chapter >= revelation.latestPayoffChapter - 1) {
        if (revelation.setupsFound.length < revelation.minSetupCount) {
          warnings.push(`Approaching deadline for "${revelation.payoff}" (Chapter ${revelation.latestPayoffChapter}) with only ${revelation.setupsFound.length}/${revelation.minSetupCount} setups. Add more foreshadowing.`);
        }
      }
    }

    return { issues, warnings };
  }

  /**
   * Generate patterns to detect payoff delivery
   * NOTE: Prefer data-driven patterns from SETUP_PAYOFF_REGISTRY.
   */
  _generatePayoffPatterns(revelationId) {
    const registryEntry = this._setupPayoffRegistry.get(revelationId);
    if (Array.isArray(registryEntry?.payoffPatterns)) {
      return registryEntry.payoffPatterns;
    }
    return [];
  }

  /**
   * Validate arc closure in final chapters (11-12)
   * Ensures all major threads and revelations are resolved before story ends
   */
  _validateArcClosure(chapter, context) {
    const issues = [];
    const warnings = [];

    // Only enforce arc closure in final chapters
    if (chapter < 11) {
      return { issues, warnings };
    }

    // Check for undelivered revelations
    for (const [id, revelation] of this._setupPayoffRegistry.entries()) {
      if (!revelation.payoffDelivered) {
        if (chapter === 12) {
          // Chapter 12: All major revelations MUST be delivered
          issues.push(`ARC CLOSURE REQUIRED: Major revelation "${revelation.payoff}" has not been delivered. This is the final chapter - all major plot points must resolve.`);
        } else if (chapter === 11) {
          // Chapter 11: Warn about undelivered revelations
          warnings.push(`Approaching finale: "${revelation.payoff}" still undelivered. Ensure this is revealed in chapters 11-12.`);
        }
      }
    }

    // Check for unresolved critical threads
    if (context.narrativeThreads && context.narrativeThreads.length > 0) {
      const unresolvedCritical = context.narrativeThreads.filter(t =>
        t.status === 'active' &&
        (t.urgency === 'critical' || t.type === 'appointment' || t.type === 'promise')
      );

      if (chapter === 12 && unresolvedCritical.length > 0) {
        issues.push(`ARC CLOSURE REQUIRED: ${unresolvedCritical.length} critical thread(s) still unresolved in final chapter: ${unresolvedCritical.slice(0, 3).map(t => t.description?.slice(0, 40)).join('; ')}...`);
      } else if (chapter === 11 && unresolvedCritical.length > 3) {
        warnings.push(`Too many unresolved threads (${unresolvedCritical.length}) entering finale. Prioritize resolution.`);
      }
    }

    // Check that Victoria confrontation happens
    if (chapter === 12) {
      const victoriaThread = context.narrativeThreads?.find(t =>
        t.description?.toLowerCase().includes('victoria') ||
        t.description?.toLowerCase().includes('blackwell')
      );
      if (!victoriaThread || victoriaThread.status !== 'resolved') {
        warnings.push('Final chapter should include climactic confrontation involving Victoria Blackwell');
      }
    }

    return { issues, warnings };
  }

  /**
   * Attempt to fix content that failed validation
   * NOW INCLUDES A+ QUALITY GUIDANCE for fixing prose issues
   */
  async _fixContent(content, issues, context, isDecisionPoint) {
    // Categorize issues for targeted fixing
    const proseIssues = issues.filter(i =>
      i.includes('metaphor') || i.includes('sensory') || i.includes('I-stacking') ||
      i.includes('sentence') || i.includes('opener') || i.includes('atmosphere') ||
      i.includes('dialogue') || i.includes('monotonous') || i.includes('Generic')
    );
    const consistencyIssues = issues.filter(i => !proseIssues.includes(i));

    // Build quality guidance for prose fixes
    const proseGuidance = proseIssues.length > 0 ? `
## A+ PROSE QUALITY REQUIREMENTS
Your rewrite MUST address these prose quality issues:
${proseIssues.map(i => `- ${i}`).join('\n')}

To fix these:
1. **Metaphors**: Add modern urban-uncanny imagery (reflections misbehaving, signage “almost” shifting, paper/ink that feels alive)
2. **Sensory details**: Engage sight, sound, smell, touch, taste
3. **Sentence variety**: Mix short punchy sentences (3-7 words) with longer flowing ones
4. **Opener diversity**: Vary how sentences and paragraphs begin (not all "I" or "The")
5. **Atmospheric grounding**: Open scenes with weather, lighting, physical setting
6. **Dialogue**: Break up exchanges with action beats (what characters DO while talking)

Example texture to emulate:
"Ashport looked ordinary until you stared long enough. Reflections didn't match their sources. A street sign held a curve that belonged on paper, not metal. The city kept pretending nothing was happening."
` : '';

    const fixPrompt = `The following generated story content contains violations that must be fixed.

## CONSISTENCY ISSUES TO FIX:
${consistencyIssues.length > 0 ? consistencyIssues.map(i => `- ${i}`).join('\n') : '(none)'}
${proseGuidance}

## CRITICAL RULES:
1. Maintain the exact plot and story events
2. Keep all character names spelled correctly
3. Use exact canonical numbers when they matter (do not “round” or invent durations)
4. Stay in third-person limited past tense (close on Jack)
5. Never use forbidden words: delve, unravel, tapestry, myriad, whilst, realm

## ORIGINAL CONTENT:
${JSON.stringify(content, null, 2)}

Rewrite the narrative to fix ALL issues while maintaining the story's thriller tone and progression.`;

    const responseSchema = isDecisionPoint
      ? DECISION_CONTENT_SCHEMA
      : STORY_CONTENT_SCHEMA;

    const response = await llmService.complete(
      [{ role: 'user', content: fixPrompt }],
      {
        systemPrompt: 'You are an expert thriller editor. Fix all issues while enhancing atmosphere and clarity. Never change the plot, only improve the writing.',
        maxTokens: GENERATION_CONFIG.maxTokens.subchapter,
        responseSchema,
      }
    );

    return this._parseGeneratedContent(response.content, isDecisionPoint);
  }

  // ==========================================================================
  // BOARD GENERATION (Puzzle data)
  // ==========================================================================

  /**
   * Generate board data for the puzzle
   * Now uses static word list (puzzle redesign pending)
   *
   * @param {boolean} isDecisionPoint - Whether this is a decision subchapter
   * @param {object} decision - Decision data for decision points
   */
  _generateBoardData(isDecisionPoint, decision) {
    // Static word list for evidence board puzzle (puzzle redesign pending)
    const staticWords = [
      'SHADOW', 'TRUTH', 'GLYPH', 'SILVER', 'TOKEN', 'ANCHOR',
      'THRESHOLD', 'PATTERN', 'WITNESS', 'CIPHER', 'SIGNAL', 'TRACE',
      'HIDDEN', 'PASSAGE', 'ARCHIVE', 'REFLECT'
    ];

    // Shuffle the static words
    const shuffledWords = this._shuffleArray([...staticWords]);

    // Build 4x4 grid
    const grid = [];
    for (let row = 0; row < 4; row++) {
      grid.push(shuffledWords.slice(row * 4, (row + 1) * 4));
    }

    // First 4 words are "outliers" (placeholder until puzzle redesign)
    const outlierWords = shuffledWords.slice(0, 4);

    const boardResult = {
      outlierWords,
      grid,
      outlierTheme: {
        name: 'INVESTIGATION',
        icon: '\ud83d\udd0e',
        summary: 'Follow the clues...',
      },
    };

    // For decision points, split outliers into two sets
    if (isDecisionPoint && decision?.options?.length >= 2) {
      boardResult.branchingOutlierSets = [
        {
          optionKey: decision.options[0].key || 'A',
          key: decision.options[0].key || 'A',
          label: decision.options[0].key || 'A',
          theme: {
            name: 'PATH A',
            icon: '\ud83d\udd34',
            summary: decision.options[0].focus || 'Option A',
          },
          words: outlierWords.slice(0, 2),
          descriptions: {},
        },
        {
          optionKey: decision.options[1].key || 'B',
          key: decision.options[1].key || 'B',
          label: decision.options[1].key || 'B',
          theme: {
            name: 'PATH B',
            icon: '\ud83d\udd35',
            summary: decision.options[1].focus || 'Option B',
          },
          words: outlierWords.slice(2, 4),
          descriptions: {},
        },
      ];
    }

    return boardResult;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  async _updateStoryContext(entry) {
    const context = this.storyContext || {
      characters: {},
      plotPoints: [],
      revelations: [],
      relationships: {},
      // Backward-compat rolling facts (do not use for generation anymore).
      consistencyFacts: [],
      // Preferred: facts keyed by cumulative branch key.
      consistencyFactsByPathKey: {},
    };

    context.lastGeneratedChapter = entry.chapter;
    context.lastGeneratedSubchapter = entry.subchapter;
    context.lastPathKey = entry.pathKey;

    // Store consistency facts
    if (entry.consistencyFacts?.length > 0) {
      const pk = entry.pathKey || 'ROOT';
      if (!context.consistencyFactsByPathKey || typeof context.consistencyFactsByPathKey !== 'object') {
        context.consistencyFactsByPathKey = {};
      }

      const existing = context.consistencyFactsByPathKey[pk];
      const existingFacts = Array.isArray(existing?.facts) ? existing.facts : Array.isArray(existing) ? existing : [];
      const merged = [...existingFacts, ...entry.consistencyFacts].slice(-50); // Keep last 50 per path
      context.consistencyFactsByPathKey[pk] = {
        facts: merged,
        updatedAt: entry.generatedAt || new Date().toISOString(),
      };

      // Keep the legacy rolling array too (for older code paths / debug tooling),
      // but generation should NOT consume it (it causes branch bleed).
      context.consistencyFacts = [
        ...(context.consistencyFacts || []),
        ...entry.consistencyFacts,
      ].slice(-50);

      // Bound total number of stored paths to prevent unbounded growth from prefetching.
      try {
        const keys = Object.keys(context.consistencyFactsByPathKey || {});
        const MAX_PATHS = 24;
        if (keys.length > MAX_PATHS) {
          // Prefer to keep prefixes of the current path (they're always relevant),
          // then keep the most recently updated remaining paths.
          // Always keep ROOT - it contains pre-branch facts from Chapters 1-2.
          const current = String(context.lastPathKey || 'ROOT');
          const keep = new Set(keys.filter((k) => k === 'ROOT' || current.startsWith(k)));
          const rest = keys
            .filter((k) => !keep.has(k))
            .sort((a, b) => {
              const ta = new Date(context.consistencyFactsByPathKey[a]?.updatedAt || 0).getTime();
              const tb = new Date(context.consistencyFactsByPathKey[b]?.updatedAt || 0).getTime();
              return tb - ta; // newest first
            });
          for (const k of rest) {
            if (keep.size >= MAX_PATHS) break;
            keep.add(k);
          }
          for (const k of keys) {
            if (!keep.has(k)) delete context.consistencyFactsByPathKey[k];
          }
        }
      } catch (e) {
        // Never block story saving for pruning issues.
      }
    }

    this.storyContext = context;
    await saveStoryContext(context);
  }

  /**
   * Return persisted consistency facts relevant to a given cumulative pathKey.
   *
   * We only include facts for path keys that are prefixes of the current pathKey,
   * because those represent decisions the player actually made on the way here.
   * This prevents branch bleed from background prefetching alternative paths.
   */
  _getRelevantPersistedConsistencyFacts(pathKey) {
    const pk = String(pathKey || 'ROOT');
    const ctx = this.storyContext || {};
    const map = ctx.consistencyFactsByPathKey;

    // Backward compatibility: old installs only have a single rolling array.
    if (!map || typeof map !== 'object') {
      return Array.isArray(ctx.consistencyFacts) ? ctx.consistencyFacts.slice(-50) : [];
    }

    const facts = [];
    for (const [k, v] of Object.entries(map)) {
      if (!k) continue;
      // Always include ROOT facts (pre-branch content from Chapters 1-2)
      // plus facts from any path that is a prefix of the current path
      if (k !== 'ROOT' && !pk.startsWith(k)) continue;
      if (Array.isArray(v)) {
        facts.push(...v);
      } else if (Array.isArray(v?.facts)) {
        facts.push(...v.facts);
      }
    }
    // Deduplicate while preserving insertion order-ish.
    return [...new Set(facts)].slice(-80);
  }

  /**
   * Compute the cumulative branch key for a chapter from choice history.
   *
   * Decisions are recorded on caseNumbers like "001C", "002C", etc.
   * The decision at chapter N determines the branch identity for chapter N+1.
   * Therefore, the branch key for chapter K is the concatenation of optionKeys for all decision chapters < K.
   *
   * This replaces the old "previous decision only" pathing and prevents branch collisions.
   */
  _getPathKeyForChapter(chapter, choiceHistory) {
    const targetChapter = Number(chapter) || 1;
    const history = Array.isArray(choiceHistory) ? choiceHistory : [];
    if (targetChapter <= 1 || history.length === 0) return 'ROOT';

    const sorted = [...history].sort((a, b) => {
      const ca = this._extractChapterFromCase(a?.caseNumber);
      const cb = this._extractChapterFromCase(b?.caseNumber);
      return ca - cb;
    });

    const letters = [];
    for (const entry of sorted) {
      const decisionChapter = this._extractChapterFromCase(entry?.caseNumber);
      if (decisionChapter > 0 && decisionChapter < targetChapter) {
        const ok = entry?.optionKey === 'A' || entry?.optionKey === 'B';
        if (ok) letters.push(entry.optionKey);
      }
    }

    return letters.join('') || 'ROOT';
  }

  _extractChapterFromCase(caseNumber) {
    if (!caseNumber) return 1;
    const chapterPart = caseNumber.slice(0, 3);
    return parseInt(chapterPart, 10) || 1;
  }

  /**
   * Get the path-specific decision data for a case, using the player's actual branching path.
   *
   * For pathDecisions format: looks up the player's specific path (e.g., "1B-2C") from branchingChoices
   * Falls back to canonical "1A-2A" if no branchingChoice exists, then to legacy decision format.
   *
   * @param {Object} entry - The story entry containing pathDecisions or decision
   * @param {string} caseNumber - The case number to look up (e.g., "001C")
   * @param {Array} branchingChoices - Player's branching choices array
   * @returns {Object|null} The decision data (intro, optionA, optionB, or options array)
   */
  _getPathDecisionData(entry, caseNumber, branchingChoices = []) {
    if (!entry) return null;

    // Legacy format: single decision object
    if (!entry.pathDecisions) {
      return entry.decision || null;
    }

    // New format: 9 path-specific decisions
    // Find the player's branching choice for this case
    const branchingChoice = branchingChoices.find(bc => bc.caseNumber === caseNumber);
    const playerPath = branchingChoice?.secondChoice || null;

    // Support both array format (new) and object format (legacy pathDecisions)
    if (Array.isArray(entry.pathDecisions)) {
      // Array format: find by pathKey property
      if (playerPath) {
        const pathSpecific = entry.pathDecisions.find(d => d.pathKey === playerPath);
        if (pathSpecific) return pathSpecific;
      }
      // Fallback chain: canonical path -> first entry
      return entry.pathDecisions.find(d => d.pathKey === '1A-2A')
        || entry.pathDecisions[0]
        || entry.decision
        || null;
    } else {
      // Object format: lookup by key
      if (playerPath && entry.pathDecisions[playerPath]) {
        return entry.pathDecisions[playerPath];
      }
      return entry.pathDecisions['1A-2A'] || entry.decision || null;
    }
  }

  _shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Log the complete prompt sent to the LLM for debugging.
   * This outputs the EXACT prompt the LLM receives, including system instruction,
   * cached content, and dynamic prompt.
   *
   * @param {Object} options - Logging options
   * @param {string} options.caseNumber - Case being generated
   * @param {number} options.chapter - Chapter number
   * @param {number} options.subchapter - Subchapter number
   * @param {string} options.cacheKey - Cache key if using cached generation
   * @param {string} options.dynamicPrompt - Dynamic prompt content
   * @param {string} options.fullPrompt - Full prompt for non-cached generation
   * @param {boolean} options.isCached - Whether using cached generation
   */
}

const validationMethods = {};
Object.getOwnPropertyNames(ValidationMethods.prototype).forEach((name) => {
  if (name === 'constructor') return;
  validationMethods[name] = ValidationMethods.prototype[name];
});

export { validationMethods };
