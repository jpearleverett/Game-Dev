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

/**
 * Hook for managing story generation
 */
export function useStoryGeneration(storyCampaign) {
  const [status, setStatus] = useState(GENERATION_STATUS.IDLE);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [generationType, setGenerationType] = useState(GENERATION_TYPE.IMMEDIATE);
  const generationRef = useRef(null);

  // Check if LLM is configured on mount
  useEffect(() => {
    const checkConfig = async () => {
      await llmService.init();
      setIsConfigured(llmService.isConfigured());
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
      return null; // Already generated
    }

    setStatus(GENERATION_STATUS.GENERATING);
    setGenerationType(GENERATION_TYPE.IMMEDIATE);
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

      if (needsGen) {
        // Generate in background without blocking
        setStatus(GENERATION_STATUS.GENERATING);
        setGenerationType(GENERATION_TYPE.PRELOAD);

        const subIndex = { 'B': 2, 'C': 3 }[subLetter];
        storyGenerationService.generateSubchapter(chapter, subIndex, pathKey, choiceHistory)
          .then(entry => {
            if (entry) {
              updateGeneratedCache(caseNumber, pathKey, entry);
            }
          })
          .catch(err => {
            console.warn(`Background generation failed for ${caseNumber}:`, err.message);
          });
      }
    }
  }, [isConfigured, needsGeneration]);

  /**
   * Analyze choice history to predict most likely next path
   * Returns the path (A or B) that the player is more likely to choose
   */
  const predictNextPath = useCallback((choiceHistory) => {
    if (!choiceHistory || choiceHistory.length === 0) {
      // No history - default to A (slightly more common first choice)
      return { primary: 'A', secondary: 'B', confidence: 0.55 };
    }

    // Count A vs B choices
    const counts = { A: 0, B: 0 };
    // Weight recent choices more heavily
    choiceHistory.forEach((choice, index) => {
      const weight = 1 + (index / choiceHistory.length);
      counts[choice.optionKey] = (counts[choice.optionKey] || 0) + weight;
    });

    const total = counts.A + counts.B;
    const aRatio = counts.A / total;

    // If player has shown strong preference, predict that path
    if (aRatio > 0.65) {
      return { primary: 'A', secondary: 'B', confidence: aRatio };
    } else if (aRatio < 0.35) {
      return { primary: 'B', secondary: 'A', confidence: 1 - aRatio };
    }

    // If balanced, look at most recent choice as tiebreaker
    const lastChoice = choiceHistory[choiceHistory.length - 1]?.optionKey || 'A';
    return { primary: lastChoice, secondary: lastChoice === 'A' ? 'B' : 'A', confidence: 0.55 };
  }, []);

  /**
   * Pre-generate upcoming content with SMART path prediction
   * Uses player's choice history to prioritize likely paths
   * Only generates secondary path when player is closer to decision point
   */
  const pregenerate = useCallback(async (currentChapter, pathKey, choiceHistory = []) => {
    if (!isConfigured || currentChapter >= 12) {
      return;
    }

    const nextChapter = currentChapter + 1;
    const firstCaseOfNextChapter = `${String(nextChapter).padStart(3, '0')}A`;

    // Predict which path player is more likely to choose
    const prediction = predictNextPath(choiceHistory);

    // Always generate the primary (predicted) path first
    const needsPrimaryGen = await needsGeneration(firstCaseOfNextChapter, prediction.primary);

    if (needsPrimaryGen) {
      setStatus(GENERATION_STATUS.GENERATING);
      setGenerationType(GENERATION_TYPE.PRELOAD);

      const speculativeHistory = [
        ...choiceHistory,
        {
          caseNumber: formatCaseNumber(currentChapter, 3),
          optionKey: prediction.primary,
          timestamp: new Date().toISOString()
        }
      ];

      // Generate primary path first (don't await)
      generateChapter(nextChapter, prediction.primary, speculativeHistory);
    }

    // Only generate secondary path if:
    // 1. Primary is already generated, OR
    // 2. Prediction confidence is low (player is unpredictable), OR
    // 3. Player has made many choices (has shown varied behavior)
    const shouldGenerateSecondary = !needsPrimaryGen ||
                                     prediction.confidence < 0.6 ||
                                     choiceHistory.length >= 3;

    if (shouldGenerateSecondary) {
      const needsSecondaryGen = await needsGeneration(firstCaseOfNextChapter, prediction.secondary);

      if (needsSecondaryGen) {
        setStatus(GENERATION_STATUS.GENERATING);
        setGenerationType(GENERATION_TYPE.PRELOAD);

        const speculativeHistorySecondary = [
          ...choiceHistory,
          {
            caseNumber: formatCaseNumber(currentChapter, 3),
            optionKey: prediction.secondary,
            timestamp: new Date().toISOString()
          }
        ];

        // Generate secondary path (don't await)
        generateChapter(nextChapter, prediction.secondary, speculativeHistorySecondary);
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
