import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import { useStoryEngine } from '../hooks/useStoryEngine';
import { useStoryGeneration } from '../hooks/useStoryGeneration';
import { resolveStoryPathKey, ROOT_PATH_KEY, isDynamicChapter, hasStoryContent } from '../data/storyContent';
import { formatCaseNumber, normalizeStoryCampaignShape } from '../utils/gameLogic';
import { analytics } from '../services/AnalyticsService';

const StoryStateContext = createContext(null);
const StoryDispatchContext = createContext(null);

export function StoryProvider({ children, progress, updateProgress }) {

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

  // Helper to get current path key for analytics
  const getCurrentPathKey = useCallback((caseNumber) => {
      if (!progress.storyCampaign || !caseNumber) return ROOT_PATH_KEY;
      return resolveStoryPathKey(caseNumber, progress.storyCampaign);
  }, [progress.storyCampaign]);

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
      // Use optimistic history if provided, otherwise fallback to current state
      const history = optimisticChoiceHistory || storyCampaign?.choiceHistory || [];

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
  }, [isLLMConfigured, generateForCase, storyCampaign?.choiceHistory]);

  const selectStoryDecision = useCallback(async (optionKey) => {
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
      ensureStoryContent(nextCaseNumber, pathKey, optimisticChoiceHistory).catch(err => {
         console.warn('[StoryContext] Background generation failed:', err);
      });
    }
  }, [storySelectDecisionCore, storyCampaign, isLLMConfigured, ensureStoryContent]);

  const stateValue = useMemo(() => ({
    storyCampaign,
    generation: {
      status: generationStatus,
      progress: generationProgress,
      error: generationError,
      isConfigured: isLLMConfigured,
      isGenerating,
      generationType,
      isPreloading,
    },
    getCurrentPathKey,
  }), [storyCampaign, generationStatus, generationProgress, generationError, isLLMConfigured, isGenerating, generationType, isPreloading, getCurrentPathKey]);

  const dispatchValue = useMemo(() => ({
    activateStoryCase,
    selectStoryDecision,
    ensureStoryContent,
    configureLLM,
    generateForCase,
    generateChapter,
    pregenerate,
    pregenerateCurrentChapterSiblings,
    cancelGeneration,
    clearGenerationError,
  }), [
    activateStoryCase,
    selectStoryDecision,
    ensureStoryContent,
    configureLLM,
    generateForCase,
    generateChapter,
    pregenerate,
    pregenerateCurrentChapterSiblings,
    cancelGeneration,
    clearGenerationError,
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
