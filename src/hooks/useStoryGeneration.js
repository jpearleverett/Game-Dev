/**
 * useStoryGeneration Hook
 *
 * React hook for managing dynamic story generation.
 * Handles triggering generation, tracking progress, and error states.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { storyGenerationService } from '../services/StoryGenerationService';
import { llmService } from '../services/LLMService';
import { createTraceId, llmTrace } from '../utils/llmTrace';
import {
  isDynamicChapter,
  hasStoryContent,
  getStoryEntryAsync,
  updateGeneratedCache,
  parseCaseNumber,
  formatCaseNumber,
  computeBranchPathKey,
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
  const branchPrefetchInFlightRef = useRef(new Set()); // Prevent duplicate dual-path prefetch bursts
  const subchapterPrefetchInFlightRef = useRef(new Set()); // Prevent duplicate within-chapter subchapter prefetch

  /**
   * Prefetch next chapter (Subchapter A) for BOTH possible decision branches.
   * Triggered as soon as Subchapter C is generated so the eventual player choice is seamless.
   */
  const prefetchNextChapterBranchesAfterC = useCallback(async (currentChapter, choiceHistory = [], source = 'unknown') => {
    if (!isConfigured) return;
    if (!currentChapter || currentChapter >= 12) return;

    const decisionCaseNumber = formatCaseNumber(currentChapter, 3);
    const nextChapter = currentChapter + 1;
    const nextCaseNumber = formatCaseNumber(nextChapter, 1); // Next chapter, subchapter A

    const traceId = createTraceId(`prefetch_${decisionCaseNumber}`);
    llmTrace('useStoryGeneration', traceId, 'prefetch.branches.requested', {
      source,
      currentChapter,
      decisionCaseNumber,
      nextChapter,
      nextCaseNumber,
      choiceHistoryLength: choiceHistory?.length || 0,
    }, 'info');

    const startOne = async (optionKey) => {
      const optimisticHistory = [
        ...(choiceHistory || []),
        {
          caseNumber: decisionCaseNumber,
          optionKey,
          timestamp: new Date().toISOString(),
        },
      ];

      // IMPORTANT: dynamic generation is keyed by the cumulative branch key, not raw "A"/"B".
      const nextPathKey = computeBranchPathKey(optimisticHistory, nextChapter);
      const key = `${nextCaseNumber}_${nextPathKey}`;
      if (branchPrefetchInFlightRef.current.has(key)) {
        llmTrace('useStoryGeneration', traceId, 'prefetch.branches.skip.inflight', { key }, 'debug');
        return;
      }

      const already = await hasStoryContent(nextCaseNumber, nextPathKey);
      if (already) {
        llmTrace('useStoryGeneration', traceId, 'prefetch.branches.skip.cached', { key }, 'debug');
        return;
      }

      branchPrefetchInFlightRef.current.add(key);

      llmTrace('useStoryGeneration', traceId, 'prefetch.branch.start', {
        key,
        nextCaseNumber,
        optionKey,
        nextPathKey,
        optimisticHistoryLength: optimisticHistory.length,
      }, 'info');

      storyGenerationService.generateSubchapter(nextChapter, 1, nextPathKey, optimisticHistory, {
        traceId: createTraceId(`sg_${nextCaseNumber}_${nextPathKey}`),
        reason: `prefetch-next-chapter-branches:${source}`,
      })
        .then((entry) => {
          if (entry && isMountedRef.current) {
            // Cache under the actual returned pathKey (should equal nextPathKey, but treat as source of truth)
            updateGeneratedCache(nextCaseNumber, entry.pathKey || nextPathKey, entry);
          }
          llmTrace('useStoryGeneration', traceId, 'prefetch.branch.complete', {
            key,
            ok: !!entry,
            isFallback: !!(entry?.isFallback || entry?.isEmergencyFallback),
            wordCount: entry?.wordCount,
          }, 'info');
        })
        .catch((err) => {
          llmTrace('useStoryGeneration', traceId, 'prefetch.branch.error', {
            key,
            error: err?.message,
          }, 'warn');
        })
        .finally(() => {
          branchPrefetchInFlightRef.current.delete(key);
        });
    };

    // Fire both prefetches immediately (true parallel). LLMService has its own queue/rate-limiting.
    startOne('A');
    startOne('B');
  }, [isConfigured]);

  /**
   * Prefetch remaining subchapters (B/C) within the same chapter for the CURRENT path.
   * Triggered after an A/B subchapter is generated so the next "Continue" feels instant.
   */
  const prefetchRemainingSubchapters = useCallback((chapter, fromSubchapter, pathKey, choiceHistory = [], source = 'unknown') => {
    if (!isConfigured) return;
    if (!chapter || chapter < 2 || chapter > 12) return;
    if (!fromSubchapter || fromSubchapter >= 3) return;

    const canonicalPathKey = computeBranchPathKey(choiceHistory, chapter) || pathKey;
    const traceId = createTraceId(`prefetch_subs_${String(chapter).padStart(3, '0')}${['A', 'B', 'C'][fromSubchapter - 1]}`);

    const fireOne = async (sub) => {
      const caseNumber = formatCaseNumber(chapter, sub);
      const key = `${caseNumber}_${canonicalPathKey}`;
      if (subchapterPrefetchInFlightRef.current.has(key)) return;

      const already = await hasStoryContent(caseNumber, canonicalPathKey);
      if (already) return;

      subchapterPrefetchInFlightRef.current.add(key);
      llmTrace('useStoryGeneration', traceId, 'prefetch.subchapter.start', {
        source,
        chapter,
        sub,
        caseNumber,
        pathKey: canonicalPathKey,
      }, 'debug');

      storyGenerationService.generateSubchapter(chapter, sub, canonicalPathKey, choiceHistory, {
        traceId: createTraceId(`sg_${caseNumber}_${canonicalPathKey}`),
        reason: `prefetch-within-chapter:${source}`,
      })
        .then((entry) => {
          if (entry && isMountedRef.current) {
            updateGeneratedCache(caseNumber, entry.pathKey || canonicalPathKey, entry);
          }
          llmTrace('useStoryGeneration', traceId, 'prefetch.subchapter.complete', {
            caseNumber,
            ok: !!entry,
            isFallback: !!(entry?.isFallback || entry?.isEmergencyFallback),
          }, 'debug');
        })
        .catch((err) => {
          llmTrace('useStoryGeneration', traceId, 'prefetch.subchapter.error', {
            caseNumber,
            error: err?.message,
          }, 'warn');
        })
        .finally(() => {
          subchapterPrefetchInFlightRef.current.delete(key);
        });
    };

    // Prefetch next one or two subchapters.
    fireOne(fromSubchapter + 1);
    if (fromSubchapter + 2 <= 3) {
      // Small stagger so we prioritize the immediate next subchapter.
      let timeoutId = null;
      timeoutId = setTimeout(() => {
        try {
          fireOne(fromSubchapter + 2);
        } finally {
          if (timeoutId) pendingTimeoutsRef.current.delete(timeoutId);
        }
      }, 1200);
      pendingTimeoutsRef.current.add(timeoutId);
    }
  }, [isConfigured]);

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
  const configureLLM = useCallback(async (apiKey, _provider = 'gemini', model = null) => {
    llmService.setApiKey(apiKey);
    // Always Gemini in this app.
    // If a caller passes non-gemini values, force-correct to prevent hard failures in LLMService.
    const safeModel = typeof model === 'string' && model.toLowerCase().includes('gemini')
      ? model
      : 'gemini-3-flash-preview';
    await llmService.setConfig({ provider: 'gemini', model: safeModel });
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
   *
   * IMPORTANT: This function should NEVER return null for dynamic chapters.
   * The StoryGenerationService always returns fallback content on failure,
   * so we should always have something to return.
   */
  const generateForCase = useCallback(async (caseNumber, pathKey, choiceHistory = []) => {
    const genId = `gen_${Date.now().toString(36)}`;
    const startTime = Date.now();

    console.log(`[useStoryGeneration] [${genId}] generateForCase called: case=${caseNumber}, path=${pathKey}`);
    const traceId = createTraceId(`case_${caseNumber}_${pathKey}`);
    llmTrace('useStoryGeneration', traceId, 'generateForCase.called', {
      caseNumber,
      pathKey,
      choiceHistoryLength: choiceHistory?.length || 0,
    }, 'info');

    if (!isConfigured) {
      console.warn(`[useStoryGeneration] [${genId}] LLM not configured`);
      setStatus(GENERATION_STATUS.NOT_CONFIGURED);
      setError('LLM not configured. Please set an API key in settings.');
      return null;
    }

    const { chapter, subchapter } = parseCaseNumber(caseNumber);
    const canonicalPathKey = computeBranchPathKey(choiceHistory, chapter) || pathKey;

    // Skip if not dynamic
    if (!isDynamicChapter(caseNumber)) {
      console.log(`[useStoryGeneration] [${genId}] Skipping - not a dynamic chapter`);
      return null;
    }

    // Check if already generated
    const hasContent = await hasStoryContent(caseNumber, canonicalPathKey);
    if (hasContent) {
      console.log(`[useStoryGeneration] [${genId}] Content already exists in cache`);
      setIsCacheMiss(false);
      llmTrace('useStoryGeneration', traceId, 'generateForCase.cache.hit', {
        caseNumber,
        pathKey,
        canonicalPathKey,
      }, 'debug');
      // Even on a cache hit, proactively prefetch the remaining subchapters for this chapter
      // so the player never sees a mid-chapter generation stall.
      try {
        if (chapter && subchapter && subchapter < 3) {
          prefetchRemainingSubchapters(chapter, subchapter, canonicalPathKey, choiceHistory, `cache-hit:${caseNumber}`);

          // EARLY PREFETCH: When accessing subchapter B (even from cache), start prefetching
          // both next-chapter paths so content is ready when player reaches the decision.
          if (subchapter === 2 && chapter < 12) {
            prefetchNextChapterBranchesAfterC(chapter, choiceHistory, 'cache-hit:B-early');
          }
        }
      } catch (e) {
        llmTrace('useStoryGeneration', traceId, 'prefetch.subchapters.cacheHit.error', { error: e?.message }, 'warn');
      }
      // IMPORTANT: Return the cached entry so callers (ensureStoryContent) don't treat this as a failure.
      // hasStoryContent() loads the entry into the storyContent cache; retrieve it explicitly.
      return await getStoryEntryAsync(caseNumber, canonicalPathKey);
    }

    // Determine if this is a cache miss (player chose unexpected path)
    // lastPredictionRef predicts the DECISION optionKey ("A"/"B"), not the cumulative pathKey.
    const priorDecision = Array.isArray(choiceHistory)
      ? [...choiceHistory].reverse().find((c) => parseCaseNumber(c?.caseNumber).chapter === chapter - 1)
      : null;
    const actualOptionKey = priorDecision?.optionKey || null;
    const wasCacheMiss = !!(
      lastPredictionRef.current &&
      actualOptionKey &&
      lastPredictionRef.current.primary !== actualOptionKey &&
      lastPredictionRef.current.confidence >= 0.70
    );

    if (wasCacheMiss) {
      console.log(`[useStoryGeneration] [${genId}] CACHE MISS: predicted=${lastPredictionRef.current.primary}, actual=${pathKey}`);
    }

    setStatus(GENERATION_STATUS.GENERATING);
    setGenerationType(GENERATION_TYPE.IMMEDIATE);
    setIsCacheMiss(wasCacheMiss);
    setError(null);
    setProgress({ current: 0, total: 1 });

    console.log(`[useStoryGeneration] [${genId}] Starting generation for Chapter ${chapter}.${subchapter} (path ${pathKey})...`);

    try {
      generationRef.current = true;

      // generateSubchapter ALWAYS returns content (fallback on error)
      // This is guaranteed by the StoryGenerationService's error handling
      const entry = await storyGenerationService.generateSubchapter(
        chapter,
        subchapter,
        canonicalPathKey,
        choiceHistory,
        {
          traceId,
          reason: 'immediate-generateForCase',
        }
      );

      const duration = Date.now() - startTime;

      if (!generationRef.current) {
        // Generation was cancelled - but we still have the entry
        console.log(`[useStoryGeneration] [${genId}] Generation cancelled after ${duration}ms, but caching entry`);
        if (entry) {
          updateGeneratedCache(caseNumber, pathKey, entry);
        }
        return entry;
      }

      // Update cache
      updateGeneratedCache(caseNumber, entry?.pathKey || canonicalPathKey, entry);
      llmTrace('useStoryGeneration', traceId, 'generateForCase.cache.write', {
        caseNumber,
        pathKey: entry?.pathKey || pathKey,
        ok: !!entry,
        isFallback: !!(entry?.isFallback || entry?.isEmergencyFallback),
        wordCount: entry?.wordCount,
      }, 'debug');
      setProgress({ current: 1, total: 1 });

      // Log result details
      if (entry?.isFallback || entry?.isEmergencyFallback) {
        console.warn(`[useStoryGeneration] [${genId}] Completed with FALLBACK in ${duration}ms: ${entry.fallbackReason || 'unknown reason'}`);
        setStatus(GENERATION_STATUS.COMPLETE);
        setError(entry.fallbackReason || 'Using backup story content');
      } else {
        console.log(`[useStoryGeneration] [${genId}] SUCCESS with AI content in ${duration}ms. Title: "${entry?.title}", wordCount: ${entry?.wordCount || 'unknown'}`);
        setStatus(GENERATION_STATUS.COMPLETE);
      }

      // Prefetch remaining subchapters within this chapter for the current path.
      // This makes "Continue" transitions feel instant.
      try {
        if (chapter && subchapter && subchapter < 3) {
          prefetchRemainingSubchapters(chapter, subchapter, canonicalPathKey, choiceHistory, `generateForCase:${caseNumber}`);

          // EARLY PREFETCH: When subchapter B finishes, also start prefetching BOTH
          // next-chapter paths immediately. This way, by the time the player reaches
          // subchapter C and makes a decision, content for both options is likely ready.
          if (subchapter === 2 && chapter < 12) {
            console.log(`[useStoryGeneration] [${genId}] Subchapter B complete - starting early next-chapter prefetch`);
            prefetchNextChapterBranchesAfterC(chapter, choiceHistory, 'generateForCase:B-complete-early');
          }
        }
      } catch (e) {
        llmTrace('useStoryGeneration', traceId, 'prefetch.subchapters.trigger.error', { error: e?.message }, 'warn');
      }

      return entry;
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`[useStoryGeneration] [${genId}] ERROR after ${duration}ms: ${err.message}`);
      setStatus(GENERATION_STATUS.ERROR);
      setError(err.message);

      // Even on unexpected error, try to get emergency fallback content
      console.log(`[useStoryGeneration] [${genId}] Attempting emergency fallback...`);
      try {
        const fallbackEntry = storyGenerationService.getEmergencyFallback(
          chapter,
          subchapter,
          canonicalPathKey
        );
        if (fallbackEntry) {
          console.log(`[useStoryGeneration] [${genId}] Emergency fallback succeeded`);
          updateGeneratedCache(caseNumber, fallbackEntry?.pathKey || canonicalPathKey, fallbackEntry);
          return fallbackEntry;
        }
      } catch (fallbackErr) {
        console.error(`[useStoryGeneration] [${genId}] Emergency fallback FAILED: ${fallbackErr.message}`);
      }

      return null;
    } finally {
      generationRef.current = false;
      // If we just generated Subchapter C, immediately prefetch next chapter for BOTH branches.
      // This guarantees seamless "Continue Investigation" after the eventual player choice.
      try {
        if (chapter && subchapter === 3) {
          prefetchNextChapterBranchesAfterC(chapter, choiceHistory, 'generateForCase:C-complete');
        }
      } catch (e) {
        llmTrace('useStoryGeneration', traceId, 'prefetch.branches.trigger.error', { error: e?.message }, 'warn');
      }
    }
  }, [isConfigured, prefetchNextChapterBranchesAfterC, prefetchRemainingSubchapters]);

  /**
   * Generate all subchapters for a chapter
   * @param {number} chapter - Chapter number to generate
   * @param {string} pathKey - Path key (A or B)
   * @param {Array} choiceHistory - Player's choice history
   * @param {Object} options - Optional settings
   * @param {boolean} options.silent - If true, skip progress/status updates (for background preloading)
   */
  const generateChapter = useCallback(async (chapter, pathKey, choiceHistory = [], options = {}) => {
    const canonicalPathKey = computeBranchPathKey(choiceHistory, chapter) || pathKey;
    const { silent = false } = options;

    if (!isConfigured) {
      if (!silent) {
        setStatus(GENERATION_STATUS.NOT_CONFIGURED);
        setError('LLM not configured. Please set an API key in settings.');
      }
      return null;
    }

    if (chapter < 2) {
      return null; // Chapter 1 is static
    }

    // Only update status/progress for non-silent (user-facing) generations
    // Silent generations also don't use generationRef to avoid race conditions
    // when multiple parallel generations run simultaneously
    if (!silent) {
      setStatus(GENERATION_STATUS.GENERATING);
      setError(null);
      setProgress({ current: 0, total: 3 });
      generationRef.current = true;
    }

    try {
      const results = [];
      for (let sub = 1; sub <= 3; sub++) {
        // Only check cancellation for non-silent (user-facing) generations
        // Silent background generations should run to completion
        if (!silent && !generationRef.current) {
          // Generation was cancelled
          return results;
        }

        // Check if component unmounted (applies to all generations)
        if (!isMountedRef.current) {
          return results;
        }

        const caseNumber = `${String(chapter).padStart(3, '0')}${['A', 'B', 'C'][sub - 1]}`;

        // Skip if already generated
        const hasContent = await hasStoryContent(caseNumber, canonicalPathKey);
        if (hasContent) {
          if (!silent) {
            setProgress({ current: sub, total: 3 });
          }
          continue;
        }

        const entry = await storyGenerationService.generateSubchapter(
          chapter,
          sub,
          canonicalPathKey,
          choiceHistory,
          {
            traceId: createTraceId(`case_${caseNumber}_${canonicalPathKey}`),
            reason: silent ? 'preload-generateChapter' : 'immediate-generateChapter',
          }
        );

        updateGeneratedCache(caseNumber, entry?.pathKey || canonicalPathKey, entry);
        results.push(entry);
        if (!silent) {
          setProgress({ current: sub, total: 3 });
        }
      }

      if (!silent) {
        setStatus(GENERATION_STATUS.COMPLETE);
      }
      return results;
    } catch (err) {
      if (!silent) {
        setStatus(GENERATION_STATUS.ERROR);
        setError(err.message);
      } else {
        console.warn(`[useStoryGeneration] Silent generation failed for chapter ${chapter}:`, err.message);
      }
      return null;
    } finally {
      // Only reset generationRef for non-silent generations
      if (!silent) {
        generationRef.current = false;
      }
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

    // Capture parameters at call time to prevent stale closure issues
    // Even though JS block scoping handles this, being explicit improves readability
    const targetChapter = chapter;
    const targetPath = pathKey;
    const history = [...choiceHistory]; // Create a copy to prevent mutation issues

    // Generate subchapters B and C in background
    const subchaptersToGenerate = ['B', 'C'];

    // Set status once at the start, not in the loop (prevents thrashing)
    let anyNeedsGen = false;

    for (const subLetter of subchaptersToGenerate) {
      const caseNumber = `${String(targetChapter).padStart(3, '0')}${subLetter}`;
      const needsGen = await needsGeneration(caseNumber, targetPath);

      if (needsGen && isMountedRef.current) {
        if (!anyNeedsGen) {
          // Only set status once when we first find something to generate
          setStatus(GENERATION_STATUS.GENERATING);
          setGenerationType(GENERATION_TYPE.PRELOAD);
          anyNeedsGen = true;
        }

        // Capture loop variables in local scope for the async closure
        const targetCase = caseNumber;
        const subIndex = { 'B': 2, 'C': 3 }[subLetter];

        // Generate in background without blocking
        storyGenerationService.generateSubchapter(targetChapter, subIndex, targetPath, history)
          .then(entry => {
            // Guard against state updates on unmounted component
            if (entry && isMountedRef.current) {
              updateGeneratedCache(targetCase, targetPath, entry);
            }
            // If we just finished generating Subchapter C in the background, immediately prefetch BOTH next branches.
            if (subIndex === 3) {
              prefetchNextChapterBranchesAfterC(targetChapter, history, 'pregenerateCurrentChapterSiblings:C-complete');
            }
          })
          .catch(err => {
            console.warn(`[useStoryGeneration] Background generation failed for ${targetCase}:`, err.message);
          });
      }
    }
  }, [isConfigured, needsGeneration, prefetchNextChapterBranchesAfterC]);

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

    // Compute cumulative branch keys for next chapter for each speculative decision.
    const primaryNextPathKey = computeBranchPathKey(speculativeHistoryPrimary, nextChapter);
    const secondaryNextPathKey = computeBranchPathKey(speculativeHistorySecondary, nextChapter);

    const [needsPrimaryGen, needsSecondaryGen] = await Promise.all([
      needsGeneration(firstCaseOfNextChapter, primaryNextPathKey),
      needsGeneration(firstCaseOfNextChapter, secondaryNextPathKey),
    ]);

    // ========== PARALLEL GENERATION FOR BALANCED PLAYERS ==========
    if (isBalancedPlayer) {
      console.log(`[useStoryGeneration] Balanced player detected (confidence: ${prediction.confidence.toFixed(2)}, personality: ${prediction.playerPersonality}). Generating both paths in parallel.`);

      setStatus(GENERATION_STATUS.GENERATING);
      setGenerationType(GENERATION_TYPE.PRELOAD);

      // Fire both generations simultaneously with silent: true to prevent progress thrashing
      // When multiple generations run in parallel, they would otherwise interleave setProgress calls
      if (needsPrimaryGen) {
        generateChapter(nextChapter, primaryNextPathKey, speculativeHistoryPrimary, { silent: true });
      }
      if (needsSecondaryGen) {
        generateChapter(nextChapter, secondaryNextPathKey, speculativeHistorySecondary, { silent: true });
      }
    } else {
      // ========== CONFIDENT PREDICTION: Prioritize primary path ==========
      if (needsPrimaryGen) {
        setStatus(GENERATION_STATUS.GENERATING);
        setGenerationType(GENERATION_TYPE.PRELOAD);
        // Use silent: true for all background preloading to avoid UI state conflicts
        generateChapter(nextChapter, primaryNextPathKey, speculativeHistoryPrimary, { silent: true });
      }

      // Generate secondary path if:
      // 1. Primary is already generated, OR
      // 2. Player has made many choices (has shown varied behavior)
      const shouldGenerateSecondary = !needsPrimaryGen || choiceHistory.length >= 3;

      if (shouldGenerateSecondary && needsSecondaryGen) {
        setStatus(GENERATION_STATUS.GENERATING);
        setGenerationType(GENERATION_TYPE.PRELOAD);
        generateChapter(nextChapter, secondaryNextPathKey, speculativeHistorySecondary, { silent: true });
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

      const tier2PathKey = computeBranchPathKey(speculativeHistoryTier2, twoAheadChapter);
      const needsTier2Gen = await needsGeneration(firstCaseTwoAhead, tier2PathKey);

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
              tier2PathKey,
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
    prefetchNextChapterBranchesAfterC, // Prefetch both decision paths when entering subchapter C
    cancelGeneration,
    clearError,
  };
}

export default useStoryGeneration;
