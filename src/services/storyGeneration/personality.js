import { llmService } from '../LLMService';
import { log } from '../../utils/llmTrace';
import { getStoryEntry } from '../../data/storyContent';
import { GENERATION_CONFIG } from '../../data/storyBible';
import { DECISION_CONSEQUENCES, PATH_PERSONALITY_TRAITS } from './constants';

// ==========================================================================
// DYNAMIC PERSONALITY CLASSIFICATION - LLM-based player behavior analysis
// ==========================================================================

/**
 * Generate a hash of choice history for cache invalidation
 * @param {Array} choiceHistory - Player's choice history
 * @returns {string} Hash string
 */
function _hashChoiceHistory(choiceHistory) {
  if (!choiceHistory || choiceHistory.length === 0) return 'empty';
  return choiceHistory.map(c => `${c.caseNumber}:${c.optionKey}`).join('|');
}

/**
 * URL-safe short hash for cache keys (do NOT use raw ":" / "|" strings in cache identifiers).
 * Deterministic, lightweight, and safe across JS runtimes.
 */
function _hashChoiceHistoryForCache(choiceHistory) {
  const s = this._hashChoiceHistory(choiceHistory);
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Convert to unsigned and base36 for compactness.
  return (h >>> 0).toString(36);
}

/**
 * Dynamically classify player personality using LLM
 * Uses Gemini to analyze actual choice patterns and provide richer personality assessment
 * Falls back to keyword-based analysis if LLM fails
 * @param {Array} choiceHistory - Player's choice history
 * @returns {Promise<Object>} Personality classification with narrativeStyle, dialogueTone, riskTolerance
 */
async function _classifyPersonalityDynamic(choiceHistory) {
  // If no choices yet, return balanced default
  if (!choiceHistory || choiceHistory.length === 0) {
    return {
      ...PATH_PERSONALITY_TRAITS.BALANCED,
      source: 'default',
    };
  }

  // Check cache - if choice history hasn't changed, use cached result
  const currentHash = this._hashChoiceHistory(choiceHistory);
  const cached = this.dynamicPersonalityCache.get(currentHash);
  if (cached) {
    log.debug('StoryGen', '🧠 Using cached personality classification');
    return cached;
  }

  log.debug('StoryGen', `🧠 Classifying player personality (${choiceHistory.length} choices)...`);

  try {
    // Build choice summary for LLM
    const choiceSummary = choiceHistory.map(choice => {
      const chapter = this._extractChapterFromCase(choice.caseNumber);
      const consequence = DECISION_CONSEQUENCES[choice.caseNumber]?.[choice.optionKey];
      return {
        chapter,
        choice: choice.optionKey,
        description: consequence?.immediate || `Chose option ${choice.optionKey}`,
      };
    });

    const classificationPrompt = `Analyze this player's decision pattern in an interactive mystery thriller (modern city + hidden fantasy layer) and classify their play style.

PLAYER'S CHOICES:
${choiceSummary.map(c => `- Chapter ${c.chapter}: ${c.description}`).join('\n')}

Based on these choices, classify the player's approach. Consider:
- Do they prefer direct confrontation or careful investigation?
- Are they impulsive or methodical?
- Do they prioritize speed or thoroughness?
- Do they treat anomalies as noise, or as a pattern worth chasing?

Respond with a JSON object containing:
- "dominantStyle": one of "AGGRESSIVE", "METHODICAL", or "BALANCED"
- "narrativeStyle": a sentence describing how Jack (the protagonist) acts based on this play style
- "dialogueTone": how Jack's dialogue should sound (e.g., "direct and confrontational", "measured and analytical", "adaptable")
- "riskTolerance": "high", "moderate", or "low"
- "characterInsight": a brief observation about this player's detective persona (1 sentence)`;

    const response = await llmService.complete(
      [{ role: 'user', content: classificationPrompt }],
      {
        systemPrompt: 'You are an expert at analyzing player behavior in narrative games. Provide concise, insightful classifications.',
        maxTokens: GENERATION_CONFIG.maxTokens.classification,
        responseSchema: {
          type: 'object',
          properties: {
            dominantStyle: { type: 'string', enum: ['AGGRESSIVE', 'METHODICAL', 'BALANCED'] },
            narrativeStyle: { type: 'string' },
            dialogueTone: { type: 'string' },
            riskTolerance: { type: 'string', enum: ['high', 'moderate', 'low'] },
            characterInsight: { type: 'string' },
          },
          required: ['dominantStyle', 'narrativeStyle', 'dialogueTone', 'riskTolerance'],
        },
        traceId: `personality-${Date.now()}`,
        thinkingLevel: 'low', // Quick classification, don't need deep reasoning
      }
    );

    // Track token usage
    this._trackTokenUsage(response?.usage, 'Personality classification');

    // Parse response
    let classification;
    try {
      classification = typeof response.content === 'string'
        ? JSON.parse(response.content)
        : response.content;
    } catch (parseErr) {
      console.warn(`[StoryGen] ⚠️ Failed to parse personality classification, using fallback`);
      const fallback = this._analyzePathPersonality(choiceHistory);
      return { ...fallback, source: 'keyword-fallback' };
    }

    // Build personality object
    const personality = {
      narrativeStyle: classification.narrativeStyle || PATH_PERSONALITY_TRAITS.BALANCED.narrativeStyle,
      dialogueTone: classification.dialogueTone || PATH_PERSONALITY_TRAITS.BALANCED.dialogueTone || 'adapts to the situation',
      riskTolerance: classification.riskTolerance || 'moderate',
      dominantStyle: classification.dominantStyle || 'BALANCED',
      characterInsight: classification.characterInsight || null,
      source: 'llm-dynamic',
    };

    // Cache the result. Keyed by hash and BOUNDED, because two speculative
    // branches classify different histories concurrently: a single-entry cache
    // meant each one evicted the other and both re-ran the round trip every time.
    this.dynamicPersonalityCache.set(currentHash, personality);
    if (this.dynamicPersonalityCache.size > 8) {
      const oldest = this.dynamicPersonalityCache.keys().next().value;
      this.dynamicPersonalityCache.delete(oldest);
    }

    log.debug('StoryGen', `🧠 Personality: ${personality.dominantStyle} - "${personality.narrativeStyle}"${personality.characterInsight ? ` (${personality.characterInsight})` : ''}`);

    return personality;

  } catch (error) {
    console.warn(`[StoryGen] ⚠️ Dynamic personality classification failed:`, error.message);
    console.warn(`[StoryGen] Falling back to keyword-based analysis`);

    // Fall back to keyword-based analysis
    const fallback = this._analyzePathPersonality(choiceHistory);
    return { ...fallback, source: 'keyword-fallback' };
  }
}

// ==========================================================================
// PATH PERSONALITY ANALYSIS - Ensures narrative coherence across player choices
// ==========================================================================

/**
 * Analyze player's choice history to determine their "path personality"
 * This ensures Jack's behavior remains consistent with player's decision patterns
 */
function _analyzePathPersonality(choiceHistory) {
  if (!choiceHistory || choiceHistory.length === 0) {
    return PATH_PERSONALITY_TRAITS.BALANCED;
  }

  let aggressiveScore = 0;
  let methodicalScore = 0;

  // Analyze each choice and weight recent choices more heavily
  choiceHistory.forEach((choice, index) => {
    const weight = 1 + (index / choiceHistory.length); // Recent choices weighted more
    const consequence = DECISION_CONSEQUENCES[choice.caseNumber]?.[choice.optionKey];

    if (consequence?.characterImpact) {
      aggressiveScore += (consequence.characterImpact.aggression || 0) * weight;
      methodicalScore += (consequence.characterImpact.thoroughness || 0) * weight;
    } else {
      // Prefer the decision's explicit personalityAlignment when available.
      // This avoids baking in A=methodical/B=aggressive when the narrative frames choices differently.
      let alignment = null;
      try {
        const decisionChapter = this._extractChapterFromCase(choice.caseNumber);
        const decisionPathKey = this._getPathKeyForChapter(decisionChapter, choiceHistory);
        const decisionEntry =
          this.getGeneratedEntry(choice.caseNumber, decisionPathKey) ||
          getStoryEntry(choice.caseNumber, 'ROOT');

        // Handle both legacy (decision) and new (pathDecisions) formats
        // Use player's actual branching path for path-specific decision lookup
        const decisionData = this._getPathDecisionData(decisionEntry, choice.caseNumber, this.currentBranchingChoices || []);
        const opt =
          decisionData?.options?.find((o) => o?.key === choice.optionKey) ||
          (choice.optionKey === 'A' ? decisionData?.optionA : decisionData?.optionB) ||
          null;

        alignment = opt?.personalityAlignment || null;
      } catch (error) {
        console.warn('[StoryGenerationService] Failed to get personality alignment:', error.message);
        alignment = null;
      }

      const normalizedAlignment = typeof alignment === 'string'
        ? (alignment.toLowerCase() === 'cautious' ? 'methodical' : alignment.toLowerCase())
        : null;

      if (normalizedAlignment === 'methodical') {
        methodicalScore += 6 * weight;
      } else if (normalizedAlignment === 'aggressive') {
        aggressiveScore += 6 * weight;
      } else {
        // Fallback scoring: A tends to be "methodical/evidence-first", B tends to be "aggressive/instinct-first".
        if (choice.optionKey === 'A') {
          methodicalScore += 5 * weight;
        } else if (choice.optionKey === 'B') {
          aggressiveScore += 5 * weight;
        }
      }
    }
  });

  // Determine dominant personality
  const diff = aggressiveScore - methodicalScore;
  if (diff > 15) {
    return { ...PATH_PERSONALITY_TRAITS.AGGRESSIVE, scores: { aggressive: aggressiveScore, methodical: methodicalScore } };
  } else if (diff < -15) {
    return { ...PATH_PERSONALITY_TRAITS.METHODICAL, scores: { aggressive: aggressiveScore, methodical: methodicalScore } };
  }
  return { ...PATH_PERSONALITY_TRAITS.BALANCED, scores: { aggressive: aggressiveScore, methodical: methodicalScore } };
}

export const personalityMethods = {
  _hashChoiceHistory,
  _hashChoiceHistoryForCache,
  _classifyPersonalityDynamic,
  _analyzePathPersonality,
  _cachedPersonalityFor,
  _refreshPersonalityInBackground,
};

/**
 * The classification already in hand for this history, or null. Synchronous.
 */
function _cachedPersonalityFor(choiceHistory) {
  if (!choiceHistory || choiceHistory.length === 0) return null;
  try {
    return this.dynamicPersonalityCache.get(this._hashChoiceHistory(choiceHistory)) || null;
  } catch (_e) {
    return null;
  }
}

/**
 * Warm the classification for NEXT time without blocking this generation.
 *
 * The classifier is a real LLM round trip and it ran first in buildStoryContext,
 * before a single prompt block was assembled: every cache miss put a full
 * request in front of the scene the player is waiting for, to choose an
 * adjective. The keyword analyzer covers the gap in the meantime.
 */
function _refreshPersonalityInBackground(choiceHistory) {
  if (!choiceHistory || choiceHistory.length === 0) return;
  try {
    if (this._cachedPersonalityFor(choiceHistory)) return;
    this._classifyPersonalityDynamic(choiceHistory).catch(() => {});
  } catch (_e) { /* never block generation on this */ }
}
