/**
 * useStoryGeneration Hook
 *
 * React hook for managing dynamic story generation.
 * Handles triggering generation, tracking progress, and error states.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { storyGenerationService } from '../services/StoryGenerationService';
import { llmService } from '../services/LLMService';
import {
  isDynamicChapter,
  hasStoryContent,
  updateGeneratedCache,
  parseCaseNumber,
  formatCaseNumber,
} from '../data/storyContent';

// Generation states
export const GENERATION_STATUS = {
  IDLE: 'idle',
  CHECKING: 'checking',
  GENERATING: 'generating',
  COMPLETE: 'complete',
  ERROR: 'error',
  NOT_CONFIGURED: 'not_configured',
};

// Generation types - distinguishes immediate needs vs background pre-loading
export const GENERATION_TYPE = {
  IMMEDIATE: 'immediate',  // Generating content the player needs right now
  PRELOAD: 'preload',      // Pre-loading upcoming content in background
};

// Cache miss tracking - when player picks unexpected path
export const CACHE_MISS_TYPE = {
  NONE: 'none',            // Content was pre-loaded (expected path)
  UNEXPECTED: 'unexpected', // Player chose unpredicted path, content not ready
};

/**
 * Hook for managing story generation
 */
export function useStoryGeneration(storyCampaign) {
  const [status, setStatus] = useState(GENERATION_STATUS.IDLE);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [generationType, setGenerationType] = useState(GENERATION_TYPE.IMMEDIATE);
  const [isCacheMiss, setIsCacheMiss] = useState(false); // Track unexpected path choices
  const generationRef = useRef(null);
  const lastPredictionRef = useRef(null); // Track what we predicted

  // Track mounted state to prevent state updates on unmounted component
  const isMountedRef = useRef(true);
  // Track pending timeouts for cleanup
  const pendingTimeoutsRef = useRef(new Set());

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Clear all pending timeouts
      pendingTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      pendingTimeoutsRef.current.clear();
      // Reset refs
      generationRef.current = null;
      lastPredictionRef.current = null;
    };
  }, []);

  // Check if LLM is configured on mount
  useEffect(() => {
    const checkConfig = async () => {
      await llmService.init();
      if (isMountedRef.current) {
        setIsConfigured(llmService.isConfigured());
      }
    };
    checkConfig();
  }, []);

  // Initialize story generation service
  useEffect(() => {
    storyGenerationService.init();
  }, []);

  /**
   * Configure the LLM service with API key
   */
  const configureLLM = useCallback(async (apiKey, provider = 'openai', model = 'gpt-4o') => {
    llmService.setApiKey(apiKey);
    await llmService.setConfig({ provider, model });
    setIsConfigured(true);
    setError(null);
  }, []);

  /**
   * Check if a specific case needs generation
   */
  const needsGeneration = useCallback(async (caseNumber, pathKey) => {
    if (!isDynamicChapter(caseNumber)) {
      return false;
    }
    const hasContent = await hasStoryContent(caseNumber, pathKey);
    return !hasContent;
  }, []);

  /**
   * Generate content for a specific case
   * Tracks whether this is a "cache miss" (player chose unexpected path)
   */
  const generateForCase = useCallback(async (caseNumber, pathKey, choiceHistory = []) => {
    if (!isConfigured) {
      setStatus(GENERATION_STATUS.NOT_CONFIGURED);
      setError('LLM not configured. Please set an API key in settings.');
      return null;
    }

    const { chapter, subchapter } = parseCaseNumber(caseNumber);

    // Skip if not dynamic
    if (!isDynamicChapter(caseNumber)) {
      return null;
    }

    // Check if already generated
    const hasContent = await hasStoryContent(caseNumber, pathKey);
    if (hasContent) {
      setIsCacheMiss(false);
      return null; // Already generated
    }

    // Determine if this is a cache miss (player chose unexpected path)
    // A cache miss occurs when we predicted a different path than what was chosen
    // Threshold aligned with pregenerate: we generate both paths when confidence < 0.70
    // So only flag cache miss when we were confident (>= 0.70) but player chose differently
    const wasCacheMiss = lastPredictionRef.current &&
      lastPredictionRef.current.primary !== pathKey &&
      lastPredictionRef.current.confidence >= 0.70;

    setStatus(GENERATION_STATUS.GENERATING);
    setGenerationType(GENERATION_TYPE.IMMEDIATE);
    setIsCacheMiss(wasCacheMiss);
    setError(null);
    setProgress({ current: 0, total: 1 });

    try {
      generationRef.current = true;

      const entry = await storyGenerationService.generateSubchapter(
        chapter,
        subchapter,
        pathKey,
        choiceHistory
      );

      if (!generationRef.current) {
        // Generation was cancelled
        return null;
      }

      // Update cache
      updateGeneratedCache(caseNumber, pathKey, entry);

      setProgress({ current: 1, total: 1 });
      setStatus(GENERATION_STATUS.COMPLETE);

      return entry;
    } catch (err) {
      setStatus(GENERATION_STATUS.ERROR);
      setError(err.message);
      return null;
    } finally {
      generationRef.current = false;
    }
  }, [isConfigured]);

  /**
   * Generate all subchapters for a chapter
   */
  const generateChapter = useCallback(async (chapter, pathKey, choiceHistory = []) => {
    if (!isConfigured) {
      setStatus(GENERATION_STATUS.NOT_CONFIGURED);
      setError('LLM not configured. Please set an API key in settings.');
      return null;
    }

    if (chapter < 2) {
      return null; // Chapter 1 is static
    }

    setStatus(GENERATION_STATUS.GENERATING);
    setError(null);
    setProgress({ current: 0, total: 3 });

    try {
      generationRef.current = true;

      const results = [];
      for (let sub = 1; sub <= 3; sub++) {
        if (!generationRef.current) {
          // Generation was cancelled
          return results;
        }

        const caseNumber = `${String(chapter).padStart(3, '0')}${['A', 'B', 'C'][sub - 1]}`;

        // Skip if already generated
        const hasContent = await hasStoryContent(caseNumber, pathKey);
        if (hasContent) {
          setProgress({ current: sub, total: 3 });
          continue;
        }

        const entry = await storyGenerationService.generateSubchapter(
          chapter,
          sub,
          pathKey,
          choiceHistory
        );

        updateGeneratedCache(caseNumber, pathKey, entry);
        results.push(entry);
        setProgress({ current: sub, total: 3 });
      }

      setStatus(GENERATION_STATUS.COMPLETE);
      return results;
    } catch (err) {
      setStatus(GENERATION_STATUS.ERROR);
      setError(err.message);
      return null;
    } finally {
      generationRef.current = false;
    }
  }, [isConfigured]);

  /**
   * Pre-generate the remaining subchapters of the current chapter (B and C)
   * Called when player enters subchapter A to ensure B and C are ready
   * when they finish reading and solving the puzzle for A
   */
  const pregenerateCurrentChapterSiblings = useCallback(async (chapter, pathKey, choiceHistory = []) => {
    if (!isConfigured || chapter < 2) {
      return;
    }

    // Generate subchapters B and C in background
    const subchaptersToGenerate = ['B', 'C'];

    for (const subLetter of subchaptersToGenerate) {
      const caseNumber = `${String(chapter).padStart(3, '0')}${subLetter}`;
      const needsGen = await needsGeneration(caseNumber, pathKey);

      if (needsGen && isMountedRef.current) {
        // Generate in background without blocking
        setStatus(GENERATION_STATUS.GENERATING);
        setGenerationType(GENERATION_TYPE.PRELOAD);

        const subIndex = { 'B': 2, 'C': 3 }[subLetter];
        storyGenerationService.generateSubchapter(chapter, subIndex, pathKey, choiceHistory)
          .then(entry => {
            // Guard against state updates on unmounted component
            if (entry && isMountedRef.current) {
              updateGeneratedCache(caseNumber, pathKey, entry);
            }
          })
          .catch(err => {
            console.warn(`[useStoryGeneration] Background generation failed for ${caseNumber}:`, err.message);
          });
      }
    }
  }, [isConfigured, needsGeneration]);

  /**
   * Analyze choice history to predict most likely next path
   * Returns the path (A or B) that the player is more likely to choose
   *
   * Enhanced with DECISION FRAMING ANALYSIS:
   * - Analyzes the upcoming decision text to detect aggressive vs cautious framing
   * - If player's personality aligns with a framed option, increases confidence
   *
   * @param {Array} choiceHistory - Array of previous choices
   * @param {Object} upcomingDecision - Optional: the decision object for the upcoming choice
   */
  const predictNextPath = useCallback((choiceHistory, upcomingDecision = null) => {
    if (!choiceHistory || choiceHistory.length === 0) {
      // No history - default to A (slightly more common first choice)
      // Increased base confidence from 0.55 to 0.60 to reduce cache misses
      return { primary: 'A', secondary: 'B', confidence: 0.60 };
    }

    // Count A vs B choices with weighted recency
    const counts = { A: 0, B: 0 };
    // Weight recent choices MORE heavily (exponential instead of linear)
    choiceHistory.forEach((choice, index) => {
      // Exponential weighting: later choices count more
      const weight = Math.pow(1.5, index);
      counts[choice.optionKey] = (counts[choice.optionKey] || 0) + weight;
    });

    const total = counts.A + counts.B;
    const aRatio = counts.A / total;

    // Determine player personality from choice patterns
    let playerPersonality = 'balanced';
    if (aRatio > 0.65) {
      playerPersonality = 'aggressive'; // Option A is typically more direct/confrontational
    } else if (aRatio < 0.35) {
      playerPersonality = 'methodical'; // Option B is typically more cautious
    }

    // ========== DECISION PERSONALITY ALIGNMENT ANALYSIS ==========
    // Uses LLM-generated personalityAlignment when available, falls back to regex framing analysis
    let framingBonus = 0;
    let framingPrediction = null;
    let alignmentSource = null;

    if (upcomingDecision?.optionA && upcomingDecision?.optionB) {
      // PRIORITY 1: Use LLM-generated personalityAlignment if available (most accurate)
      const optionAAlignment = upcomingDecision.optionA.personalityAlignment;
      const optionBAlignment = upcomingDecision.optionB.personalityAlignment;

      if (optionAAlignment || optionBAlignment) {
        alignmentSource = 'llm';

        // Match player personality to option alignment
        if (playerPersonality === 'aggressive') {
          if (optionAAlignment === 'aggressive' && optionBAlignment !== 'aggressive') {
            framingBonus = 0.15; // Higher bonus for explicit LLM alignment
            framingPrediction = 'A';
          } else if (optionBAlignment === 'aggressive' && optionAAlignment !== 'aggressive') {
            framingBonus = 0.15;
            framingPrediction = 'B';
          }
        } else if (playerPersonality === 'methodical') {
          if (optionAAlignment === 'methodical' && optionBAlignment !== 'methodical') {
            framingBonus = 0.15;
            framingPrediction = 'A';
          } else if (optionBAlignment === 'methodical' && optionAAlignment !== 'methodical') {
            framingBonus = 0.15;
            framingPrediction = 'B';
          }
        }

        // For balanced players, prefer neutral options if available
        if (playerPersonality === 'balanced') {
          if (optionAAlignment === 'neutral' && optionBAlignment !== 'neutral') {
            framingBonus = 0.08;
            framingPrediction = 'A';
          } else if (optionBAlignment === 'neutral' && optionAAlignment !== 'neutral') {
            framingBonus = 0.08;
            framingPrediction = 'B';
          }
        }
      }

      // PRIORITY 2: Fall back to regex-based framing analysis if no LLM alignment
      if (!framingPrediction) {
        alignmentSource = 'regex';
        const optionATitle = (upcomingDecision.optionA.title || '').toLowerCase();
        const optionBTitle = (upcomingDecision.optionB.title || '').toLowerCase();
        const optionAFocus = (upcomingDecision.optionA.focus || '').toLowerCase();
        const optionBFocus = (upcomingDecision.optionB.focus || '').toLowerCase();

        // Aggressive/Direct keywords
        const aggressivePatterns = /\b(confront|direct|demand|force|now|immediately|attack|charge|push|challenge|expose|reveal|accuse)\b/i;

        // Cautious/Methodical keywords
        const cautiousPatterns = /\b(gather|wait|investigate|careful|evidence|plan|prepare|observe|patience|consider|analyze|research|surveillance)\b/i;

        const optionAIsAggressive = aggressivePatterns.test(optionATitle) || aggressivePatterns.test(optionAFocus);
        const optionBIsCautious = cautiousPatterns.test(optionBTitle) || cautiousPatterns.test(optionBFocus);
        const optionBIsAggressive = aggressivePatterns.test(optionBTitle) || aggressivePatterns.test(optionBFocus);
        const optionAIsCautious = cautiousPatterns.test(optionATitle) || cautiousPatterns.test(optionAFocus);

        // If player personality aligns with option framing, boost confidence
        if (playerPersonality === 'aggressive' && optionAIsAggressive && !optionBIsAggressive) {
          framingBonus = 0.10;
          framingPrediction = 'A';
        } else if (playerPersonality === 'aggressive' && optionBIsAggressive && !optionAIsAggressive) {
          framingBonus = 0.10;
          framingPrediction = 'B';
        } else if (playerPersonality === 'methodical' && optionBIsCautious && !optionAIsCautious) {
          framingBonus = 0.10;
          framingPrediction = 'B';
        } else if (playerPersonality === 'methodical' && optionAIsCautious && !optionBIsCautious) {
          framingBonus = 0.10;
          framingPrediction = 'A';
        }
      }
    }

    // ========== FINAL PREDICTION ==========
    let primary, secondary, confidence;

    // If player has shown strong preference, predict that path
    if (aRatio > 0.65) {
      primary = 'A';
      secondary = 'B';
      confidence = Math.min(0.85, aRatio + framingBonus); // Cap at 85%
    } else if (aRatio < 0.35) {
      primary = 'B';
      secondary = 'A';
      confidence = Math.min(0.85, (1 - aRatio) + framingBonus);
    } else {
      // Balanced player - use framing prediction if available, else recent choice
      if (framingPrediction) {
        primary = framingPrediction;
        secondary = framingPrediction === 'A' ? 'B' : 'A';
        confidence = 0.60 + framingBonus;
      } else {
        // Use most recent choice as tiebreaker
        const lastChoice = choiceHistory[choiceHistory.length - 1]?.optionKey || 'A';
        primary = lastChoice;
        secondary = lastChoice === 'A' ? 'B' : 'A';
        confidence = 0.55;
      }
    }

    return { primary, secondary, confidence, playerPersonality, framingUsed: !!framingPrediction, alignmentSource };
  }, []);

  /**
   * Pre-generate upcoming content with MULTI-TIER lookahead strategy
   * Uses player's choice history to prioritize likely paths
   * Now generates up to 2 chapters ahead for seamless gameplay
   *
   * BALANCED PLAYER OPTIMIZATION: For players with balanced/unpredictable patterns,
   * both paths are generated in TRUE parallel to eliminate cache miss latency.
   */
  const pregenerate = useCallback(async (currentChapter, pathKey, choiceHistory = []) => {
    if (!isConfigured || currentChapter >= 12) {
      return;
    }

    // ========== TIER 1: Immediate next chapter (highest priority) ==========
    const nextChapter = currentChapter + 1;
    const firstCaseOfNextChapter = `${String(nextChapter).padStart(3, '0')}A`;

    // Predict which path player is more likely to choose
    const prediction = predictNextPath(choiceHistory);

    // Store prediction for cache miss detection
    lastPredictionRef.current = prediction;

    // ========== BALANCED PLAYER DETECTION ==========
    // For balanced players (low confidence OR explicitly balanced personality),
    // generate BOTH paths immediately in true parallel to eliminate wait times
    const isBalancedPlayer = prediction.playerPersonality === 'balanced' ||
                             prediction.confidence < 0.70;

    // Check what needs generation upfront (parallel async checks)
    const [needsPrimaryGen, needsSecondaryGen] = await Promise.all([
      needsGeneration(firstCaseOfNextChapter, prediction.primary),
      needsGeneration(firstCaseOfNextChapter, prediction.secondary),
    ]);

    // Build speculative histories
    const speculativeHistoryPrimary = [
      ...choiceHistory,
      {
        caseNumber: formatCaseNumber(currentChapter, 3),
        optionKey: prediction.primary,
        timestamp: new Date().toISOString()
      }
    ];

    const speculativeHistorySecondary = [
      ...choiceHistory,
      {
        caseNumber: formatCaseNumber(currentChapter, 3),
        optionKey: prediction.secondary,
        timestamp: new Date().toISOString()
      }
    ];

    // ========== PARALLEL GENERATION FOR BALANCED PLAYERS ==========
    if (isBalancedPlayer) {
      console.log(`[useStoryGeneration] Balanced player detected (confidence: ${prediction.confidence.toFixed(2)}, personality: ${prediction.playerPersonality}). Generating both paths in parallel.`);

      setStatus(GENERATION_STATUS.GENERATING);
      setGenerationType(GENERATION_TYPE.PRELOAD);

      // Fire both generations simultaneously - don't await, let them run in parallel
      if (needsPrimaryGen) {
        generateChapter(nextChapter, prediction.primary, speculativeHistoryPrimary);
      }
      if (needsSecondaryGen) {
        generateChapter(nextChapter, prediction.secondary, speculativeHistorySecondary);
      }
    } else {
      // ========== CONFIDENT PREDICTION: Prioritize primary path ==========
      if (needsPrimaryGen) {
        setStatus(GENERATION_STATUS.GENERATING);
        setGenerationType(GENERATION_TYPE.PRELOAD);
        generateChapter(nextChapter, prediction.primary, speculativeHistoryPrimary);
      }

      // Generate secondary path if:
      // 1. Primary is already generated, OR
      // 2. Player has made many choices (has shown varied behavior)
      const shouldGenerateSecondary = !needsPrimaryGen || choiceHistory.length >= 3;

      if (shouldGenerateSecondary && needsSecondaryGen) {
        setStatus(GENERATION_STATUS.GENERATING);
        setGenerationType(GENERATION_TYPE.PRELOAD);
        generateChapter(nextChapter, prediction.secondary, speculativeHistorySecondary);
      }
    }

    // ========== TIER 2: Two chapters ahead (lower priority, speculative) ==========
    // Only generate if next chapter is already mostly ready and we're past early game
    if (currentChapter >= 3 && nextChapter < 12 && !needsPrimaryGen) {
      const twoAheadChapter = currentChapter + 2;
      const firstCaseTwoAhead = `${String(twoAheadChapter).padStart(3, '0')}A`;

      // Build speculative history for two chapters ahead (assume primary path for both)
      const speculativeHistoryTier2 = [
        ...choiceHistory,
        {
          caseNumber: formatCaseNumber(currentChapter, 3),
          optionKey: prediction.primary,
          timestamp: new Date().toISOString()
        },
        {
          caseNumber: formatCaseNumber(nextChapter, 3),
          optionKey: prediction.primary, // Assume same pattern continues
          timestamp: new Date().toISOString()
        }
      ];

      const needsTier2Gen = await needsGeneration(firstCaseTwoAhead, prediction.primary);

      if (needsTier2Gen) {
        // Use a slight delay to prioritize Tier 1 completion
        // Track timeout for cleanup on unmount
        const timeoutId = setTimeout(async () => {
          pendingTimeoutsRef.current.delete(timeoutId);

          // Guard against unmounted component
          if (!isMountedRef.current) return;

          setGenerationType(GENERATION_TYPE.PRELOAD);
          // Only generate first subchapter of Tier 2 to save resources
          const tier2CaseNumber = firstCaseTwoAhead;
          const { chapter: tier2Chapter, subchapter: tier2Sub } = parseCaseNumber(tier2CaseNumber);
          try {
            await storyGenerationService.generateSubchapter(
              tier2Chapter,
              tier2Sub,
              prediction.primary,
              speculativeHistoryTier2
            );
          } catch (err) {
            console.warn('[useStoryGeneration] Tier 2 pre-load failed:', err.message);
          }
        }, 5000); // 5 second delay to prioritize Tier 1

        pendingTimeoutsRef.current.add(timeoutId);
      }
    }
  }, [isConfigured, needsGeneration, generateChapter, predictNextPath]);

  /**
   * Cancel ongoing generation
   */
  const cancelGeneration = useCallback(() => {
    generationRef.current = false;
    setStatus(GENERATION_STATUS.IDLE);
  }, []);

  /**
   * Reset error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setStatus(GENERATION_STATUS.IDLE);
  }, []);

  return {
    // State
    status,
    progress,
    error,
    isConfigured,
    isGenerating: status === GENERATION_STATUS.GENERATING,
    generationType,
    isPreloading: status === GENERATION_STATUS.GENERATING && generationType === GENERATION_TYPE.PRELOAD,
    isCacheMiss, // True when player chose an unexpected path and content wasn't pre-loaded

    // Actions
    configureLLM,
    needsGeneration,
    generateForCase,
    generateChapter,
    pregenerate,
    pregenerateCurrentChapterSiblings,
    cancelGeneration,
    clearError,
  };
}

export default useStoryGeneration;
