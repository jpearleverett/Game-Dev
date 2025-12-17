import React, { createContext, useContext, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useStoryEngine } from '../hooks/useStoryEngine';
import { useStoryGeneration } from '../hooks/useStoryGeneration';
import { resolveStoryPathKey, ROOT_PATH_KEY, isDynamicChapter, hasStoryContent } from '../data/storyContent';
import { formatCaseNumber, normalizeStoryCampaignShape } from '../utils/gameLogic';
import { analytics } from '../services/AnalyticsService';

const StoryStateContext = createContext(null);
const StoryDispatchContext = createContext(null);

export function StoryProvider({ children, progress, updateProgress }) {
  // Track background generation errors for UI feedback
  const [backgroundGenerationError, setBackgroundGenerationError] = useState(null);

  // Ref to current choice history - avoids stale closures in callbacks
  const choiceHistoryRef = useRef([]);

  const {
    storyCampaign,
    selectDecision: storySelectDecisionCore,
    activateStoryCase,
  } = useStoryEngine(progress, updateProgress);

  const {
    status: generationStatus,
    progress: generationProgress,
    error: generationError,
    isConfigured: isLLMConfigured,
    isGenerating,
    generationType,
    isPreloading,
    configureLLM,
    needsGeneration,
    generateForCase,
    generateChapter,
    pregenerate,
    pregenerateCurrentChapterSiblings,
    cancelGeneration,
    clearError: clearGenerationError,
  } = useStoryGeneration(storyCampaign);

  // Keep choiceHistoryRef in sync to avoid stale closures
  useEffect(() => {
    choiceHistoryRef.current = storyCampaign?.choiceHistory || [];
  }, [storyCampaign?.choiceHistory]);

  // Helper to get current path key for analytics
  const getCurrentPathKey = useCallback((caseNumber) => {
      if (!progress.storyCampaign || !caseNumber) return ROOT_PATH_KEY;
      return resolveStoryPathKey(caseNumber, progress.storyCampaign);
  }, [progress.storyCampaign]);

  // Helper to parse case number
  const parseCaseNumber = useCallback((caseNumber) => {
    if (!caseNumber) return { chapter: 1, subchapter: 1 };
    const chapterSegment = caseNumber.slice(0, 3);
    const letter = caseNumber.slice(3, 4);
    const chapter = parseInt(chapterSegment, 10) || 1;
    const subchapter = { 'A': 1, 'B': 2, 'C': 3 }[letter] || 1;
    return { chapter, subchapter };
  }, []);

  /**
   * Check and generate story content if needed for a case
   */
  const ensureStoryContent = useCallback(async (caseNumber, pathKey, optimisticChoiceHistory = null) => {
    // Chapter 1 is static, no generation needed
    if (!isDynamicChapter(caseNumber)) {
      return { ok: true, generated: false };
    }

    // Check if content exists
    const hasContent = await hasStoryContent(caseNumber, pathKey);
    if (hasContent) {
      return { ok: true, generated: false };
    }

    // Check if LLM is configured
    if (!isLLMConfigured) {
      return { ok: false, reason: 'llm-not-configured' };
    }

    // Generate the content
    try {
      // Use optimistic history if provided, otherwise fallback to ref (avoids stale closure)
      const history = optimisticChoiceHistory || choiceHistoryRef.current;

      const entry = await generateForCase(
        caseNumber,
        pathKey,
        history
      );

      if (entry) {
        return { ok: true, generated: true, entry };
      }
      return { ok: false, reason: 'generation-failed' };
    } catch (error) {
      return { ok: false, reason: 'generation-error', error: error.message };
    }
  }, [isLLMConfigured, generateForCase]);

  /**
   * Handle background generation logic seamlessly
   * Called when entering a case to ensure upcoming content is ready
   */
  const handleBackgroundGeneration = useCallback((caseNumber, pathKey) => {
    if (!isLLMConfigured) return;

    const { chapter, subchapter } = parseCaseNumber(caseNumber);
    // Use ref to avoid stale closure
    const choiceHistory = choiceHistoryRef.current;

    // Strategy:
    // 1. Ensure current chapter's remaining subchapters (siblings) are ready
    // 2. Ensure next chapter is pre-loading (lookahead)

    // Logic for Subchapters A (1) and B (2) -> Generate remaining siblings
    // If we are in A, we need B and C. If in B, we need C.
    if (chapter >= 2 && subchapter < 3) {
      pregenerateCurrentChapterSiblings(chapter, pathKey, choiceHistory);
    }

    // Logic for all Subchapters -> Look ahead to next chapter
    // If we are in A, B, or C, we should ensure the Next Chapter is ready.
    // This is especially critical for C, but useful for A/B to fill the queue.
    if (chapter >= 1 && chapter < 12) {
      pregenerate(chapter, pathKey, choiceHistory);
    }
  }, [isLLMConfigured, parseCaseNumber, pregenerateCurrentChapterSiblings, pregenerate]);

  const selectStoryDecision = useCallback(async (optionKey) => {
    // Clear any previous background generation error when starting a new decision
    setBackgroundGenerationError(null);

    // Get chapter info before making the decision
    const currentChapter = storyCampaign?.chapter || 1;
    // Current choice history before update
    const currentHistory = storyCampaign?.choiceHistory || [];
    const isFirstDecision = currentHistory.length === 0;

    // Make the decision (updates state/persistence asynchronously)
    storySelectDecisionCore(optionKey);

    // After first decision (at 1.3), trigger generation for the first case of chapter 2
    // We do this optimistically without waiting for state update to ensure seamless transition
    if (isFirstDecision && currentChapter === 1 && isLLMConfigured) {
      const nextChapter = 2;
      const nextCaseNumber = formatCaseNumber(nextChapter, 1);
      const pathKey = optionKey;

      // Construct optimistic history including the choice just made
      const optimisticChoiceHistory = [
        ...currentHistory,
        {
          caseNumber: formatCaseNumber(currentChapter, 3), // Decision happens at subchapter 3
          optionKey: optionKey,
          timestamp: new Date().toISOString()
        }
      ];

      // Trigger generation immediately - do NOT await if we want to return control to UI
      // However, ensureStoryContent handles deduplication via service now, so calling it here is safe.
      // If the user navigates immediately, the next call to ensureStoryContent will attach to this promise.
      ensureStoryContent(nextCaseNumber, pathKey, optimisticChoiceHistory)
        .then(result => {
          if (!result.ok && result.reason !== 'llm-not-configured') {
            // Track the error so UI can display it
            setBackgroundGenerationError({
              caseNumber: nextCaseNumber,
              reason: result.reason,
              error: result.error,
              timestamp: new Date().toISOString()
            });
            console.warn('[StoryContext] Background generation failed:', result);
          }
        })
        .catch(err => {
          // Unexpected error (not from ensureStoryContent result)
          setBackgroundGenerationError({
            caseNumber: nextCaseNumber,
            reason: 'unexpected-error',
            error: err.message,
            timestamp: new Date().toISOString()
          });
          console.error('[StoryContext] Background generation threw:', err);
        });
    }
  }, [storySelectDecisionCore, storyCampaign, isLLMConfigured, ensureStoryContent]);

  // Clear background generation error
  const clearBackgroundGenerationError = useCallback(() => {
    setBackgroundGenerationError(null);
  }, []);

  const stateValue = useMemo(() => ({
    storyCampaign,
    generation: {
      status: generationStatus,
      progress: generationProgress,
      error: generationError,
      backgroundError: backgroundGenerationError, // Track background generation failures
      isConfigured: isLLMConfigured,
      isGenerating,
      generationType,
      isPreloading,
    },
    getCurrentPathKey,
  }), [storyCampaign, generationStatus, generationProgress, generationError, backgroundGenerationError, isLLMConfigured, isGenerating, generationType, isPreloading, getCurrentPathKey]);

  const dispatchValue = useMemo(() => ({
    activateStoryCase,
    selectStoryDecision,
    ensureStoryContent,
    handleBackgroundGeneration, // Exposed for GameContext
    configureLLM,
    generateForCase,
    generateChapter,
    pregenerate,
    pregenerateCurrentChapterSiblings,
    cancelGeneration,
    clearGenerationError,
    clearBackgroundGenerationError,
  }), [
    activateStoryCase,
    selectStoryDecision,
    ensureStoryContent,
    handleBackgroundGeneration,
    configureLLM,
    generateForCase,
    generateChapter,
    pregenerate,
    pregenerateCurrentChapterSiblings,
    cancelGeneration,
    clearGenerationError,
    clearBackgroundGenerationError,
  ]);

  return (
    <StoryDispatchContext.Provider value={dispatchValue}>
      <StoryStateContext.Provider value={stateValue}>
        {children}
      </StoryStateContext.Provider>
    </StoryDispatchContext.Provider>
  );
}

export function useStoryState() {
  const context = useContext(StoryStateContext);
  if (!context) {
    throw new Error('useStoryState must be used within a StoryProvider');
  }
  return context;
}

export function useStoryDispatch() {
  const context = useContext(StoryDispatchContext);
  if (!context) {
    throw new Error('useStoryDispatch must be used within a StoryProvider');
  }
  return context;
}

export function useStory() {
  return { ...useStoryState(), ...useStoryDispatch() };
}
