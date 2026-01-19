import React, { createContext, useContext, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useStoryEngine } from '../hooks/useStoryEngine';
import { useStoryGeneration } from '../hooks/useStoryGeneration';
import {
  resolveStoryPathKey,
  ROOT_PATH_KEY,
  isDynamicChapter,
  hasStoryContent,
  computeBranchPathKey,
  normalizeStoryPathKey,
} from '../data/storyContent';
import { formatCaseNumber, normalizeStoryCampaignShape } from '../utils/gameLogic';
import { analytics } from '../services/AnalyticsService';
import { createTraceId, llmTrace } from '../utils/llmTrace';

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
    selectDecisionBeforePuzzle,
    applyPreDecision,
    activateStoryCase,
    saveBranchingChoice,
  } = useStoryEngine(progress, updateProgress);

  const {
    status: generationStatus,
    progress: generationProgress,
    error: generationError,
    isConfigured: isLLMConfigured,
    isGenerating,
    generationType,
    isPreloading,
    // Background resilience: auto-retry when returning from background after network failure
    shouldAutoRetry,
    getPendingGeneration,
    clearAutoRetry,
    configureLLM,
    needsGeneration,
    generateForCase,
    generateChapter,
    pregenerate,
    pregenerateCurrentChapterSiblings,
    prefetchNextChapterBranchesAfterC,
    triggerPrefetchAfterBranchingComplete, // TRUE INFINITE BRANCHING: Prefetch after player completes branching narrative
    // NOTE: speculativePrefetchForFirstChoice removed - no longer needed with narrative-first flow
    cancelGeneration,
    clearError: clearGenerationError,
  } = useStoryGeneration(storyCampaign);

  // Keep refs in sync to avoid stale closures
  const branchingChoicesRef = useRef([]);

  useEffect(() => {
    choiceHistoryRef.current = storyCampaign?.choiceHistory || [];
  }, [storyCampaign?.choiceHistory]);

  useEffect(() => {
    branchingChoicesRef.current = storyCampaign?.branchingChoices || [];
  }, [storyCampaign?.branchingChoices]);

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
   *
   * This function ensures content is available for a case before the player
   * can continue. It will generate new content if needed, and always returns
   * success if ANY content (including fallback) is available.
   */
  // TRUE INFINITE BRANCHING: Added branchingChoices parameter for realized narrative context
  const ensureStoryContent = useCallback(async (caseNumber, pathKey, optimisticChoiceHistory = null, branchingChoices = null) => {
    const traceId = createTraceId(`ensure_${caseNumber}_${pathKey}`);
    llmTrace('StoryContext', traceId, 'ensureStoryContent.start', {
      caseNumber,
      pathKey,
      hasOptimisticHistory: !!optimisticChoiceHistory,
      optimisticHistoryLength: optimisticChoiceHistory?.length || 0,
    }, 'info');
    // Chapter 1 is static, no generation needed
    if (!isDynamicChapter(caseNumber)) {
      llmTrace('StoryContext', traceId, 'ensureStoryContent.skip.static', { caseNumber }, 'debug');
      return { ok: true, generated: false };
    }

    // Normalize and canonicalize pathKey.
    // Dynamic chapters are keyed by the *cumulative* branch key (e.g. "BA", "BB"), not raw "A"/"B".
    const history = optimisticChoiceHistory || choiceHistoryRef.current;
    const { chapter } = parseCaseNumber(caseNumber);
    const computed = computeBranchPathKey(history, chapter);
    const canonicalPathKey = computed && computed !== ROOT_PATH_KEY
      ? computed
      : normalizeStoryPathKey(pathKey);

    // Check if content exists (either generated or cached) under the canonical key.
    const hasContent = await hasStoryContent(caseNumber, canonicalPathKey);
    if (hasContent) {
      llmTrace('StoryContext', traceId, 'ensureStoryContent.cache.hit', {
        caseNumber,
        pathKey,
        canonicalPathKey,
      }, 'debug');
      return { ok: true, generated: false };
    }

    // Check if LLM is configured
    if (!isLLMConfigured) {
      llmTrace('StoryContext', traceId, 'ensureStoryContent.fail.notConfigured', { caseNumber, pathKey }, 'warn');
      return { ok: false, reason: 'llm-not-configured' };
    }

    // Generate the content
    try {
      // CRITICAL: For user-facing generation, generateForCase will throw on error
      // It returns null on failure, which triggers the error path below
      // The UI will show a retry screen - player NEVER sees fallback content
      // TRUE INFINITE BRANCHING: Use provided branchingChoices or fall back to ref
      const effectiveBranchingChoices = branchingChoices || branchingChoicesRef.current;
      const entry = await generateForCase(
        caseNumber,
        canonicalPathKey,
        history,
        effectiveBranchingChoices
      );

      if (entry) {
        llmTrace('StoryContext', traceId, 'ensureStoryContent.ok', {
          caseNumber,
          pathKey,
          canonicalPathKey,
          generated: true,
          isFallback: !!entry.isFallback,
          isEmergencyFallback: !!entry.isEmergencyFallback,
          wordCount: entry.wordCount,
        }, entry.isFallback || entry.isEmergencyFallback ? 'warn' : 'info');
        return {
          ok: true,
          generated: true,
          entry,
          isFallback: entry.isFallback || false,
          isEmergencyFallback: entry.isEmergencyFallback || false,
        };
      }

      // Generation failed - return error to trigger UI retry screen
      console.error('[StoryContext] Generation failed - player must retry');
      llmTrace('StoryContext', traceId, 'ensureStoryContent.fail.nullEntry', {
        caseNumber,
        pathKey,
        canonicalPathKey,
      }, 'error');
      return { ok: false, reason: 'generation-failed', error: 'Chapter generation failed. Please try again.' };
    } catch (error) {
      console.error('[StoryContext] Unexpected error in ensureStoryContent:', error.message);
      llmTrace('StoryContext', traceId, 'ensureStoryContent.fail.error', {
        caseNumber,
        pathKey,
        error: error.message,
      }, 'error');
      return { ok: false, reason: 'generation-error', error: error.message };
    }
  }, [isLLMConfigured, generateForCase]);

  /**
   * Handle background generation logic seamlessly
   * Called when entering a case to ensure upcoming content is ready
   *
   * TRUE INFINITE BRANCHING UPDATE:
   * For subchapters A and B (which have branching narratives), we NO LONGER prefetch siblings
   * immediately. Instead, prefetching happens AFTER the player completes their branching choices.
   * This ensures the next subchapter's context includes the player's ACTUAL experience.
   *
   * See: triggerPrefetchAfterBranchingComplete() called from saveBranchingChoice()
   */
  const handleBackgroundGeneration = useCallback((caseNumber, pathKey) => {
    if (!isLLMConfigured) return;

    const { chapter, subchapter } = parseCaseNumber(caseNumber);
    // Use refs to avoid stale closures
    const choiceHistory = choiceHistoryRef.current;
    const branchingChoices = branchingChoicesRef.current; // TRUE INFINITE BRANCHING
    const traceId = createTraceId(`bg_${caseNumber}_${pathKey}`);
    llmTrace('StoryContext', traceId, 'backgroundGeneration.trigger', {
      caseNumber,
      pathKey,
      chapter,
      subchapter,
      choiceHistoryLength: choiceHistory?.length || 0,
      branchingChoicesLength: branchingChoices?.length || 0,
    }, 'debug');

    // Strategy (updated for TRUE INFINITE BRANCHING):
    // 1. For subchapters A and B: Do NOT prefetch siblings here - wait for branching choice
    // 2. For subchapter C (decision point): Prefetch BOTH possible next chapter paths
    //
    // OLD BEHAVIOR (disabled):
    // For subchapters A and B, we used to call pregenerateCurrentChapterSiblings immediately.
    // This no longer works with branching narratives because the next subchapter's context
    // depends on which path the player took through the branching narrative.
    //
    // NEW BEHAVIOR:
    // Prefetching is now triggered by triggerPrefetchAfterBranchingComplete() which is called
    // when the player completes the branching narrative and saveBranchingChoice() is invoked.

    // SUBCHAPTER C FLOW: Do NOT prefetch when entering C anymore
    // With the new narrative-first flow for C:
    // 1. Player reads branching narrative first
    // 2. After branching complete, prefetch is triggered via triggerPrefetchAfterBranchingComplete()
    // 3. Player solves puzzle (gives LLM time to generate)
    // 4. Player makes chapter decision
    //
    // The prefetch now happens AFTER narrative complete, when we have the player's
    // complete branching path through C for proper context.
    // See: triggerPrefetchAfterBranchingComplete() in useStoryGeneration.js

    // NOTE: For chapters 2+, sibling prefetch now happens via triggerPrefetchAfterBranchingComplete()
    // This ensures the context includes the player's realized narrative from their branching choices.
  }, [isLLMConfigured, parseCaseNumber]);

  const selectStoryDecision = useCallback(async (optionKey) => {
    const traceId = createTraceId(`decision_${storyCampaign?.pendingDecisionCase || 'unknown'}`);
    llmTrace('StoryContext', traceId, 'decision.select.start', {
      optionKey,
      pendingDecisionCase: storyCampaign?.pendingDecisionCase,
      currentChapter: storyCampaign?.chapter,
      currentSubchapter: storyCampaign?.subchapter,
      currentPathKey: storyCampaign?.currentPathKey,
      choiceHistoryLength: storyCampaign?.choiceHistory?.length || 0,
    }, 'info');
    // Clear any previous background generation error when starting a new decision
    setBackgroundGenerationError(null);

    // Get chapter info before making the decision
    const currentChapter = storyCampaign?.chapter || 1;
    // Current choice history before update
    const currentHistory = storyCampaign?.choiceHistory || [];

    // Make the decision (updates state/persistence asynchronously)
    storySelectDecisionCore(optionKey);
    llmTrace('StoryContext', traceId, 'decision.select.queuedStateUpdate', {
      optionKey,
      note: 'Progress state update is async; Continue may be pressed immediately after.',
    }, 'debug');

    // After ANY decision, trigger background generation for the next chapter
    // This ensures content is ready when the player clicks "Continue Investigation"
    // The pathKey is the option just chosen - this determines the immediate next content
    if (isLLMConfigured && currentChapter < 12) {
      const nextChapter = currentChapter + 1;
      const nextCaseNumber = formatCaseNumber(nextChapter, 1);
      // IMPORTANT: next content is keyed by the *cumulative* branch key (e.g. "BA", "BB"), not raw "A"/"B".
      // Using raw keys causes cache mismatches and apparent scene skips.

      // Construct optimistic history including the choice just made
      const pendingOptions = storyCampaign?.pendingDecisionOptions || {};
      const selectedOption = pendingOptions?.[optionKey] || {};
      const optimisticChoiceHistory = [
        ...currentHistory,
        {
          caseNumber: formatCaseNumber(currentChapter, 3), // Decision happens at subchapter 3
          optionKey: optionKey,
          optionTitle: selectedOption.title || null,
          optionFocus: selectedOption.focus || null,
          timestamp: new Date().toISOString()
        }
      ];

      const nextPathKey = computeBranchPathKey(optimisticChoiceHistory, nextChapter);

      // Trigger generation with retry logic
      // With root causes fixed (typos, word count, stylistic warnings), fewer retries needed
      const maxAttempts = 3;
      const bgGenId = `bg_${Date.now().toString(36)}`;

      console.log(`[StoryContext] [${bgGenId}] Starting background generation for ${nextCaseNumber} (path: ${nextPathKey})`);
      llmTrace('StoryContext', traceId, 'decision.post.prefetchChosen.start', {
        nextCaseNumber,
        nextChapter,
        pathKey: nextPathKey,
        bgGenId,
      }, 'info');

      const attemptGeneration = async (attempt = 1) => {
        const attemptStart = Date.now();
        console.log(`[StoryContext] [${bgGenId}] Attempt ${attempt}/${maxAttempts} for ${nextCaseNumber}...`);

        try {
          // CRITICAL: Flush any pending storage writes before generation
          // This ensures that previously generated content (e.g., 002A) is available
          // when generating dependent content (e.g., 002B which needs 002A for context)
          const { flushPendingWrites } = await import('../storage/generatedStoryStorage');
          await flushPendingWrites();

          // TRUE INFINITE BRANCHING: Pass branchingChoices for realized narrative context
          const result = await ensureStoryContent(nextCaseNumber, nextPathKey, optimisticChoiceHistory, branchingChoicesRef.current);
          const attemptDuration = Date.now() - attemptStart;

          if (result.ok) {
            // Success! Clear any error state
            setBackgroundGenerationError(null);

            if (result.isFallback || result.isEmergencyFallback) {
              // Fallback was used - not ideal but game continues
              console.warn(`[StoryContext] [${bgGenId}] Completed with FALLBACK content in ${attemptDuration}ms (attempt ${attempt})`);
            } else {
              // AI-generated content - ideal path
              console.log(`[StoryContext] [${bgGenId}] SUCCESS with AI content in ${attemptDuration}ms (attempt ${attempt})`);
            }
            llmTrace('StoryContext', traceId, 'decision.post.prefetchChosen.complete', {
              ok: true,
              nextCaseNumber,
              pathKey: nextPathKey,
              isFallback: !!result.isFallback,
              isEmergencyFallback: !!result.isEmergencyFallback,
              attempt,
              attemptDurationMs: attemptDuration,
            }, result.isFallback || result.isEmergencyFallback ? 'warn' : 'info');
            return;
          }

          // Check if we should retry
          if (result.reason === 'llm-not-configured') {
            console.warn(`[StoryContext] [${bgGenId}] LLM not configured - cannot generate`);
            return;
          }

          if (attempt < maxAttempts) {
            // Exponential backoff: 2s, 4s, 8s, 16s, 32s
            const delay = Math.pow(2, attempt) * 1000;
            console.warn(`[StoryContext] [${bgGenId}] Attempt ${attempt} failed (${result.reason}) after ${attemptDuration}ms, retrying in ${delay/1000}s...`);

            setTimeout(() => {
              attemptGeneration(attempt + 1);
            }, delay);
          } else {
            // All retries exhausted
            setBackgroundGenerationError({
              caseNumber: nextCaseNumber,
              reason: result.reason,
              error: result.error,
              timestamp: new Date().toISOString(),
              attempts: attempt
            });
            console.error(`[StoryContext] [${bgGenId}] FAILED after ${attempt} attempts. Last reason: ${result.reason}`);
            llmTrace('StoryContext', traceId, 'decision.post.prefetchChosen.complete', {
              ok: false,
              nextCaseNumber,
              pathKey: nextPathKey,
              reason: result.reason,
              error: result.error,
              attempt,
            }, 'error');
          }
        } catch (err) {
          const attemptDuration = Date.now() - attemptStart;

          if (attempt < maxAttempts) {
            const delay = Math.pow(2, attempt) * 1000;
            console.warn(`[StoryContext] [${bgGenId}] Attempt ${attempt} threw after ${attemptDuration}ms: ${err.message}. Retrying in ${delay/1000}s...`);

            setTimeout(() => {
              attemptGeneration(attempt + 1);
            }, delay);
          } else {
            setBackgroundGenerationError({
              caseNumber: nextCaseNumber,
              reason: 'unexpected-error',
              error: err.message,
              timestamp: new Date().toISOString(),
              attempts: attempt
            });
            console.error(`[StoryContext] [${bgGenId}] FAILED with error after ${attempt} attempts: ${err.message}`);
            llmTrace('StoryContext', traceId, 'decision.post.prefetchChosen.complete', {
              ok: false,
              nextCaseNumber,
              pathKey: nextPathKey,
              reason: 'unexpected-error',
              error: err.message,
              attempt,
            }, 'error');
          }
        }
      };

      // Start background generation (non-blocking)
      attemptGeneration();
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
      // Background resilience: auto-retry when returning from background after network failure
      shouldAutoRetry,
      getPendingGeneration,
    },
    getCurrentPathKey,
  }), [storyCampaign, generationStatus, generationProgress, generationError, backgroundGenerationError, isLLMConfigured, isGenerating, generationType, isPreloading, shouldAutoRetry, getPendingGeneration, getCurrentPathKey]);

  /**
   * TRUE INFINITE BRANCHING: Wrapper that saves branching choice AND triggers prefetch.
   * This ensures that after the player completes their branching narrative path,
   * we immediately start generating the next subchapter with their realized narrative.
   */
  const saveBranchingChoiceAndPrefetch = useCallback((caseNumber, firstChoice, secondChoice, options = {}) => {
    const isComplete = options?.isComplete !== false;
    // Save the branching choice to storyCampaign
    const didSave = saveBranchingChoice(caseNumber, firstChoice, secondChoice, { isComplete });
    if (!didSave) {
      return;
    }

    // DUPLICATE CHAIN FIX: Only trigger prefetch when isComplete is true.
    // This prevents double chain triggers when:
    // 1. handleSecondChoice saves with isComplete:false (player made choice, still reading)
    // 2. handleBranchingComplete saves with isComplete:true (finished reading)
    // Both calls would otherwise trigger the chain, causing duplicate generation attempts.
    if (!isComplete) {
      return;
    }

    // Get current state for prefetching
    const currentCampaign = normalizeStoryCampaignShape(progress.storyCampaign);
    const pathKey = resolveStoryPathKey(caseNumber, currentCampaign);
    const choiceHistory = currentCampaign.choiceHistory || [];

    // Build the updated branchingChoices including the one we just saved
    const newChoice = {
      caseNumber,
      firstChoice,
      secondChoice,
      completedAt: new Date().toISOString(),
      isComplete,
    };
    const filteredChoices = (currentCampaign.branchingChoices || []).filter(
      (choice) => choice.caseNumber !== caseNumber,
    );
    const branchingChoices = [...filteredChoices, newChoice];

    // Trigger prefetch for next subchapter with the updated branchingChoices
    if (isLLMConfigured) {
      triggerPrefetchAfterBranchingComplete(caseNumber, pathKey, choiceHistory, branchingChoices);
    }
  }, [saveBranchingChoice, progress.storyCampaign, isLLMConfigured, triggerPrefetchAfterBranchingComplete]);

  /**
   * NARRATIVE-FIRST FLOW: Wrapper that stores pre-puzzle decision AND triggers next chapter generation.
   * When player makes their decision at C subchapter (before solving puzzle), we immediately
   * start generating the next chapter in the background. This way, when the puzzle is solved,
   * the next chapter is already ready or nearly ready.
   *
   * @param {string} optionKey - The selected option ('A' or 'B')
   * @param {object} optionDetails - Details about the selected option (title, focus, etc.)
   * @param {string} explicitCaseNumber - The case number from the UI (to avoid stale state issues)
   */
  const selectDecisionBeforePuzzleAndGenerate = useCallback((optionKey, optionDetails = {}, explicitCaseNumber = null) => {
    if (!optionKey) return;

    // STALE STATE FIX: Use explicit caseNumber from UI if provided, fall back to state
    const currentCampaign = normalizeStoryCampaignShape(progress.storyCampaign);
    const caseNumber = explicitCaseNumber || currentCampaign.activeCaseNumber;

    if (!caseNumber) return;

    // Validate this is a C subchapter before proceeding
    const subchapterLetter = caseNumber.slice(-1);
    if (subchapterLetter !== 'C') {
      console.warn('[StoryContext] selectDecisionBeforePuzzleAndGenerate called on non-C subchapter:', caseNumber);
      return;
    }

    // Store the decision (pass explicit caseNumber to avoid stale state)
    selectDecisionBeforePuzzle(optionKey, optionDetails, caseNumber);

    // Calculate next chapter info
    const chapter = currentCampaign.chapter;
    const nextChapter = chapter + 1;
    const nextCaseNumber = formatCaseNumber(nextChapter, 1); // Next chapter, subchapter A

    // Build the choice history including this new decision
    const nextChoiceHistory = [
      ...(currentCampaign.choiceHistory || []),
      {
        caseNumber,
        optionKey,
        optionTitle: optionDetails.title || null,
        optionFocus: optionDetails.focus || null,
        timestamp: new Date().toISOString(),
      },
    ];

    // Calculate the path key for the next chapter
    const nextPathKey = computeBranchPathKey(nextChoiceHistory, nextChapter);

    // Get current branching choices for context
    const branchingChoices = currentCampaign.branchingChoices || [];

    // Trigger generation for next chapter immediately
    if (isLLMConfigured && nextChapter <= 12) {
      console.log(`[StoryContext] Pre-puzzle decision made for ${caseNumber}: Option ${optionKey}`);
      console.log(`[StoryContext] Immediately triggering generation for ${nextCaseNumber} (path: ${nextPathKey})`);

      // Generate in background - don't await
      generateForCase(nextCaseNumber, nextPathKey, nextChoiceHistory, branchingChoices)
        .then((result) => {
          if (result) {
            console.log(`[StoryContext] Pre-puzzle generation complete for ${nextCaseNumber}`);
          }
        })
        .catch((err) => {
          console.warn(`[StoryContext] Pre-puzzle generation failed for ${nextCaseNumber}:`, err.message);
          // Don't set error state - player can still solve puzzle and retry after
        });
    }
  }, [selectDecisionBeforePuzzle, progress.storyCampaign, isLLMConfigured, generateForCase]);

  // NOTE: speculativePrefetchForFirstChoice has been removed
  // With NARRATIVE-FIRST FLOW, we no longer need speculative prefetch after first choice
  // Generation now happens after branching complete (second choice), giving exact path

  const dispatchValue = useMemo(() => ({
    activateStoryCase,
    selectStoryDecision,
    selectDecisionBeforePuzzle: selectDecisionBeforePuzzleAndGenerate, // NARRATIVE-FIRST: Pre-puzzle decision + immediate generation
    applyPreDecision, // NARRATIVE-FIRST: Apply pre-made decision after puzzle
    saveBranchingChoice: saveBranchingChoiceAndPrefetch, // TRUE INFINITE BRANCHING: Save + prefetch
    ensureStoryContent,
    handleBackgroundGeneration, // Exposed for GameContext
    prefetchNextChapterBranchesAfterC, // Exposed for early Chapter 2 prefetch
    configureLLM,
    generateForCase,
    generateChapter,
    pregenerate,
    pregenerateCurrentChapterSiblings,
    cancelGeneration,
    clearGenerationError,
    clearBackgroundGenerationError,
    clearAutoRetry, // Clear auto-retry flag after handling
  }), [
    activateStoryCase,
    selectStoryDecision,
    selectDecisionBeforePuzzleAndGenerate,
    applyPreDecision,
    saveBranchingChoiceAndPrefetch,
    ensureStoryContent,
    handleBackgroundGeneration,
    prefetchNextChapterBranchesAfterC,
    configureLLM,
    generateForCase,
    generateChapter,
    pregenerate,
    pregenerateCurrentChapterSiblings,
    cancelGeneration,
    clearGenerationError,
    clearBackgroundGenerationError,
    clearAutoRetry,
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
