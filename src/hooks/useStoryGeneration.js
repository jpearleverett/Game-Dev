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

/**
 * Hook for managing story generation
 */
export function useStoryGeneration(storyCampaign) {
  const [status, setStatus] = useState(GENERATION_STATUS.IDLE);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
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
   * Pre-generate upcoming content (call when player is likely to need it soon)
   */
  const pregenerate = useCallback(async (currentChapter, pathKey, choiceHistory = []) => {
    if (!isConfigured || currentChapter >= 12) {
      return;
    }

    const nextChapter = currentChapter + 1;

    // Check if next chapter needs generation
    const firstCaseOfNextChapter = `${String(nextChapter).padStart(3, '0')}A`;
    const needsGen = await needsGeneration(firstCaseOfNextChapter, pathKey);

    if (needsGen) {
      // Generate in background without blocking
      setStatus(GENERATION_STATUS.GENERATING);
      generateChapter(nextChapter, pathKey, choiceHistory);
    }
  }, [isConfigured, needsGeneration, generateChapter]);

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

    // Actions
    configureLLM,
    needsGeneration,
    generateForCase,
    generateChapter,
    pregenerate,
    cancelGeneration,
    clearError,
  };
}

export default useStoryGeneration;
