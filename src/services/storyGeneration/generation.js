import { llmService } from '../LLMService';
import { llmTrace, createTraceId } from '../../utils/llmTrace';
import { formatCaseNumber } from '../../data/storyContent';
import { buildMasterSystemPrompt, buildPathDecisionsSystemPrompt, PATHDECISIONS_PROMPT_TEMPLATE } from './prompts';
import { fillTemplate } from './helpers';
import {
  DECISION_CONTENT_SCHEMA,
  DECISION_CONTENT_LAYER1_SCHEMA,
  PATHDECISIONS_ONLY_SCHEMA,
  STORY_CONTENT_SCHEMA,
  STORY_CONTENT_LAYER1_SCHEMA,
  SECOND_CHOICE_RESPONSES_SCHEMA,
} from './schemas';

import { isChapterStartCacheKey } from './promptAssembly';
import {
  DECISION_SUBCHAPTER,
  MAX_RETRIES,
  MIN_WORDS_PER_SUBCHAPTER,
  SUBCHAPTERS_PER_CHAPTER,
} from './constants';
import { ABSOLUTE_FACTS, GENERATION_CONFIG, STORY_STRUCTURE } from '../../data/storyBible';
import { saveGeneratedChapter } from '../../storage/generatedStoryStorage';

// ==========================================================================
// TWO-PASS DECISION GENERATION
// ==========================================================================

const normalizeBranchingChoice = (choice) => {
  if (!choice || typeof choice !== 'object') return null;

  let firstChoice = String(choice.firstChoice || '').trim().toUpperCase();
  let secondChoice = String(choice.secondChoice || choice.path || '').trim().toUpperCase();

  if (!firstChoice && /^1[ABC]-2[ABC]$/.test(secondChoice)) {
    [firstChoice] = secondChoice.split('-');
  }

  if (/^2[ABC]$/.test(secondChoice) && /^1[ABC]$/.test(firstChoice)) {
    secondChoice = `${firstChoice}-${secondChoice}`;
  }

  const dupMatch = secondChoice.match(/^(1[ABC])-(1[ABC]-2[ABC])$/);
  if (dupMatch) {
    secondChoice = dupMatch[2];
  }

  if (!/^1[ABC]$/.test(firstChoice) && /^1[ABC]-2[ABC]$/.test(secondChoice)) {
    [firstChoice] = secondChoice.split('-');
  }

  if (!/^1[ABC]$/.test(firstChoice) || !/^1[ABC]-2[ABC]$/.test(secondChoice)) {
    return null;
  }

  return {
    ...choice,
    firstChoice,
    secondChoice,
  };
};

/**
 * No schema declares a top-level `narrative`; the prose lives inside
 * branchingNarrative. This synthesizes the canonical read-through (opening +
 * 1A + 1A-2A) that validation, word counts, prior-chapter context and the
 * stored entry all read.
 *
 * It has to be re-runnable: _fixContent returns a freshly parsed object whose
 * `narrative` is empty, so calling this only once (before validation) left a
 * repaired entry stored with an empty narrative and wordCount 0 — which later
 * chapters then read as the story so far.
 */
const ensureCanonicalNarrative = (content) => {
  if (!content) return content;
  const hasNarrative = typeof content.narrative === 'string' && content.narrative.trim().length > 0;
  if (hasNarrative || !content.branchingNarrative) return content;

  const bn = content.branchingNarrative;
  const parts = [];
  if (bn.opening?.text) parts.push(bn.opening.text);
  const firstOption = bn.firstChoice?.options?.find(o => o.key === '1A')
    || bn.firstChoice?.options?.[0];
  if (firstOption?.response) parts.push(firstOption.response);
  const firstKey = String(firstOption?.key || '1A').toUpperCase();
  const secondGroup = bn.secondChoices?.find(sc => String(sc.afterChoice || '').toUpperCase() === firstKey)
    || bn.secondChoices?.find(sc => String(sc.afterChoice || '').toUpperCase() === '1A')
    || bn.secondChoices?.[0];
  const secondOption = secondGroup?.options?.find(o => String(o.key || '').toUpperCase() === `${firstKey}-2A`)
    || secondGroup?.options?.find(o => String(o.key || '').toUpperCase() === '2A')
    || secondGroup?.options?.[0];
  if (secondOption?.response) parts.push(secondOption.response);
  content.narrative = parts.join('\n\n');
  return content;
};

const normalizeBranchingChoices = (choices = []) => {
  if (!Array.isArray(choices)) return [];
  return choices
    .map(normalizeBranchingChoice)
    .filter(Boolean);
};

// NOTE: `_generateDecisionStructure` (a two-pass decision generator) used to sit
// here. Generation went single-pass with context caching -- the decision field is
// ordered before the narrative in the schema, so it can never be truncated away
// -- and nothing has called this since. It carried its own prompt, its own schema
// and a hand-written fallback decision that would have been indistinguishable
// from generated content if anything ever had.


// ==========================================================================
// GENERATION CONCURRENCY CONTROL
// ==========================================================================

/**
 * Wait for a generation slot to become available
 * Called when we're at maxConcurrentGenerations capacity
 */
async function _waitForGenerationSlot(generationKey) {
  return new Promise((resolve, reject) => {
    this.generationWaitQueue.push({ resolve, reject, key: generationKey });
    console.log(`[StoryGenerationService] Generation ${generationKey} queued (${this.generationWaitQueue.length} waiting, ${this.activeGenerationCount}/${this.maxConcurrentGenerations} active)`);
  });
}

/**
 * Acquire a generation slot, waiting if necessary
 * Returns true when slot is acquired
 * Throws if queue is too long (prevents queue explosion from aggressive prefetching)
 */
async function _acquireGenerationSlot(generationKey) {
  // Prevent queue explosion - reject if queue is already too long
  const MAX_QUEUE_SIZE = 6; // Allow some queuing but prevent explosion
  if (this.generationWaitQueue.length >= MAX_QUEUE_SIZE) {
    console.warn(`[StoryGenerationService] Queue full (${this.generationWaitQueue.length} waiting), rejecting ${generationKey}`);
    throw new Error('Generation queue full - try again later');
  }

  if (this.activeGenerationCount < this.maxConcurrentGenerations) {
    this.activeGenerationCount++;
    console.log(`[StoryGenerationService] Acquired slot for ${generationKey} (${this.activeGenerationCount}/${this.maxConcurrentGenerations} active)`);
    return;
  }

  // At capacity - wait for a slot (sequential mode means waiting for current to finish)
  await this._waitForGenerationSlot(generationKey);
  this.activeGenerationCount++;
  console.log(`[StoryGenerationService] Acquired slot after wait for ${generationKey} (${this.activeGenerationCount}/${this.maxConcurrentGenerations} active)`);
}

/**
 * Release a generation slot and process next in queue
 */
function _releaseGenerationSlot(generationKey) {
  this.activeGenerationCount = Math.max(0, this.activeGenerationCount - 1);
  console.log(`[StoryGenerationService] Released slot for ${generationKey} (${this.activeGenerationCount}/${this.maxConcurrentGenerations} active, ${this.generationWaitQueue.length} waiting)`);

  // Process next waiting generation if any
  if (this.generationWaitQueue.length > 0) {
    const next = this.generationWaitQueue.shift();
    console.log(`[StoryGenerationService] Unblocking queued generation: ${next.key}`);
    next.resolve();
  }
}

// ==========================================================================
// GENERATION AND VALIDATION
// ==========================================================================

/**
 * Generate a single subchapter with validation
 * Now integrates Story Arc Planning and Chapter Outlines for 100% consistency
 * Decision points use two-pass generation to ensure complete, contextual choices
 */
async function generateSubchapter(chapter, subchapter, pathKey, choiceHistory = [], options = {}) {
  if (!llmService.isConfigured()) {
    throw new Error('LLM Service not configured. Please set an API key in settings.');
  }

  // Only Chapter 1A is static; 1B and 1C are dynamically generated like all other B/C subchapters
  if (chapter === 1 && subchapter === 1) {
    throw new Error('Chapter 1A uses static content and should not be generated.');
  }

  const caseNumber = formatCaseNumber(chapter, subchapter);

  // IMPORTANT: Use the cumulative branch key for this chapter, derived from choiceHistory.
  // The incoming pathKey may be a legacy "A"/"B" token; we do not trust it for storage keys.
  const effectivePathKey = this._getPathKeyForChapter(chapter, choiceHistory);
  const refreshKey = options?.refreshKey ? String(options.refreshKey).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) : '';
  const generationKey = refreshKey
    ? `${caseNumber}_${effectivePathKey}_refresh_${refreshKey}`
    : `${caseNumber}_${effectivePathKey}`;
  const traceId = options?.traceId || createTraceId(`sg_${caseNumber}_${pathKey}`);
  const reason = options?.reason || 'unspecified';

  // CRITICAL: Distinguish between user-facing and background generation
  // User-facing = player is actively waiting (clicked Continue)
  // Background = prefetching for future use
  // If user-facing, we NEVER show fallback - we throw errors and let UI handle retry
  const isUserFacing = options?.isUserFacing || false;

  // TRUE INFINITE BRANCHING: Get player's actual choices within subchapters
  // This tracks which path the player took through branching narratives (e.g., "1B" -> "1B-2C")
  // Used to build the "realized narrative" for context - what the player actually experienced
  const branchingChoices = normalizeBranchingChoices(options?.branchingChoices || []);
  const requestUnderMap = options?.underMap || null;
  const forceRegenerate = !!options?.forceRegenerate;

  // Deduplication: return the in-flight promise for this exact content.
  // A pending generation is only stale once it has actually settled without
  // being cleaned up, or has outlived the hard generation timeout. The previous
  // 3-minute age cut discarded live generations (LLMService alone allows 300s
  // per attempt), and the next request for that key started a SECOND real
  // generation of the same scene, consuming the other slot.
  const MAX_PENDING_AGE_MS = 11 * 60 * 1000; // matches GENERATION_TIMEOUT_MS
  if (this.pendingGenerations.has(generationKey)) {
    const cachedPromise = this.pendingGenerations.get(generationKey);
    const promiseAge = Date.now() - (cachedPromise._createdAt || 0);

    if (cachedPromise._settled || promiseAge > MAX_PENDING_AGE_MS) {
      // Promise is stale - likely hung or failed silently. Remove it and create a new one.
      console.warn(`[StoryGenerationService] Pending generation for ${generationKey} is stale (${Math.round(promiseAge / 1000)}s old). Discarding and retrying.`);
      llmTrace('StoryGenerationService', traceId, 'generation.dedupe.stale', {
        generationKey,
        caseNumber,
        pathKey,
        ageMs: promiseAge,
        reason
      }, 'warn');
      this.pendingGenerations.delete(generationKey);
      // Fall through to create a new generation
    } else {
      // Promise is still fresh - reuse it
      console.log(`[StoryGenerationService] Reusing pending generation for ${generationKey}`);
      llmTrace('StoryGenerationService', traceId, 'generation.dedupe.hit', { generationKey, caseNumber, pathKey, reason }, 'debug');
      return cachedPromise;
    }
  }

  // Whether this call actually holds a slot, so the outer finally releases
  // exactly the slots it took. _releaseGenerationSlot is not idempotent: it
  // decrements the active count and unblocks a queued generation, so releasing
  // one that was never acquired lets more than maxConcurrentGenerations run.
  let holdsSlot = false;

  const generationPromise = (async () => {
    // Acquire a generation slot (waits if at capacity)
    await this._acquireGenerationSlot(generationKey);
    holdsSlot = true;

    // Now that we have the slot, another request may have produced this content
    // while we waited.
    const existingAfterWait = forceRegenerate ? null : await this.getGeneratedEntryAsync(caseNumber, effectivePathKey);
    if (existingAfterWait) {
      console.log(`[StoryGenerationService] Content already exists after wait for ${generationKey}, skipping generation`);
      llmTrace('StoryGenerationService', traceId, 'generation.skip.existsAfterWait', {
        generationKey,
        caseNumber,
        pathKey: effectivePathKey,
      }, 'info');
      return existingAfterWait;
    }

    const isDecisionPoint = subchapter === DECISION_SUBCHAPTER;
    // Kept only as a fallback for prompt-assembly callers that have no context.
    // The authoritative per-request copies live on `context` (see below), because
    // two generations run concurrently and would overwrite these.
    this.currentBranchingChoices = branchingChoices;
    this.currentUnderMap = requestUnderMap;
    llmTrace('StoryGenerationService', traceId, 'generation.start', {
      generationKey,
      caseNumber,
      chapter,
      subchapter,
      isDecisionPoint,
      pathKey,
      choiceHistoryLength: choiceHistory?.length || 0,
      forceRegenerate,
      reason,
    }, 'info');

    // ========== NEW: Story Arc Planning Integration ==========
    // Ensure we have the global story arc for narrative consistency
    await this.ensureStoryArc(choiceHistory);

    // Periodic cleanup of in-memory Maps to prevent leaks in long sessions
    // Run at the start of each chapter (subchapter A) to avoid overhead
    if (subchapter === 1) {
      this.pruneInMemoryMaps(effectivePathKey, chapter);
    }

    // Ensure we have the chapter outline for seamless subchapter flow
    const chapterOutline = await this.ensureChapterOutline(chapter, choiceHistory);

    // ========== NEW: Dynamic Consequence Generation ==========
    // If this follows a decision, ensure we have generated consequences
    if (choiceHistory.length > 0) {
      // Keep gameplay fast: hydrate consequences without extra LLM calls.
      this._ensureDecisionConsequencesFast(choiceHistory);
      if (GENERATION_CONFIG.qualitySettings?.enableLLMDecisionConsequences) {
        // Optional, expensive improvement. Never block core narrative generation.
        this._ensureDecisionConsequences(choiceHistory).catch((e) => {
          console.warn('[StoryGenerationService] Background consequence generation failed:', e?.message);
        });
      }
    }

    // Build comprehensive context (now includes story arc and chapter outline)
    // TRUE INFINITE BRANCHING: Pass branchingChoices to build realized narrative from player's actual path
    const branchingChoicesForContext = branchingChoices || [];
    console.log(`[StoryGenerationService] 📖 Building context for ${caseNumber}:`, {
      pathKey: effectivePathKey,
      branchingChoicesCount: branchingChoicesForContext.length,
      branchingChoices: branchingChoicesForContext.map(bc => `${bc.caseNumber}:${bc.firstChoice}->${bc.secondChoice}`).join(', ') || '(none)',
    });
    const context = await this.buildStoryContext(chapter, subchapter, effectivePathKey, choiceHistory, branchingChoices);

    // Apply thread normalization, capping, and archival to prevent state explosion
    if (context.narrativeThreads) {
      context.narrativeThreads = this._deduplicateThreads(context.narrativeThreads);
      context.narrativeThreads = this._capActiveThreads(context.narrativeThreads, 20);
      // Archive resolved threads to reduce memory while preserving callback potential
      context.narrativeThreads = this._archiveResolvedThreads(context.narrativeThreads, chapter);
    }

    // Add story arc and chapter outline to context
    context.storyArc = this.storyArc;
    context.chapterOutline = chapterOutline;

    // Per-request Under-Map and realized branch history live on the CONTEXT, not
    // on the service. Prompt assembly reads them across many awaits, and with two
    // concurrent generation slots (the C-beat prefetches both candidate beliefs
    // in parallel) a singleton field is overwritten by whichever request runs
    // last — so a scene could be written for the other belief's map. The
    // singletons below are kept only as a fallback for callers without a context.
    context.underMap = requestUnderMap;
    context.branchingChoices = branchingChoices;

    this.isGenerating = true;
    try {
      let generatedContent;

      // ========== SINGLE-PASS GENERATION WITH CONTEXT CACHING ==========
      // Decision schema has decision field BEFORE narrative, so decision is generated first
      // This eliminates the need for two-pass generation while ensuring complete decisions

      // LAZY BRANCHING (opt-in): generate only opening + firstChoice + second-
      // choice labels now; the 3 response bodies are filled on demand
      // (generateSecondChoiceResponses) when the player picks a first choice.
      // Applies to A/B and C subchapters (C keeps its decision + pathDecisions).
      const _baseQ = GENERATION_CONFIG?.qualitySettings || {};
      const _overrideQ = options?.qualitySettingsOverride || {};
      const lazyBranchGeneration = typeof _overrideQ.lazyBranchGeneration === 'boolean'
        ? _overrideQ.lazyBranchGeneration
        : (typeof _baseQ.lazyBranchGeneration === 'boolean' ? _baseQ.lazyBranchGeneration : false);
      const useLazyBranching = lazyBranchGeneration;

      // The task section states how much prose this call is actually asking for.
      // Under lazy branching the model writes the opening plus the three
      // first-choice responses and only LABELS for the second choices, so a
      // prompt that quotes the full 13-segment budget contradicts the schema it
      // is handed. Stamp the effective mode onto the context the prompt reads.
      context.lazyBranchGeneration = useLazyBranching;

      const schema = isDecisionPoint
        ? (useLazyBranching ? DECISION_CONTENT_LAYER1_SCHEMA : DECISION_CONTENT_SCHEMA)
        : (useLazyBranching ? STORY_CONTENT_LAYER1_SCHEMA : STORY_CONTENT_SCHEMA);
      let response;
      // True once the cached model call has actually been issued, so the catch
      // below can tell a cache-setup failure from a generation failure.
      let cachedCallReady = false;

      // Try cached generation first (works in both proxy and direct mode)
      try {
        const beatType = this._getBeatType(chapter, subchapter);
        const chapterBeatType = STORY_STRUCTURE.chapterBeatTypes?.[chapter];

        // Prefer a chapter-start cache (static + story up to previous chapter) to reduce prompt size.
        // Falls back to the static-only cache if chapter-start caching fails for any reason.
        let cacheKey;
        try {
          cacheKey = await this._ensureChapterStartCache(
            chapter,
            subchapter,
            effectivePathKey,
            choiceHistory,
            context
          );
        } catch (e) {
          console.warn('[StoryGenerationService] ⚠️ Chapter-start cache unavailable, falling back to static cache:', e?.message);
          cacheKey = await this._ensureStaticCache(beatType, chapterBeatType);
        }

        // Build only dynamic prompt (delta context + current state + task).
        // If cacheKey is a chapter-start cache, omit story history up to previous chapter.
        const usingChapterStartCache = isChapterStartCacheKey(cacheKey, chapter);
        // Build dynamic prompt - many-shot examples are in the cache, not here
        const dynamicPrompt = this._buildDynamicPrompt(
          context,
          chapter,
          subchapter,
          isDecisionPoint,
          {
            cachedHistoryMaxChapter: usingChapterStartCache ? chapter - 1 : null,
          }
        );

        // ========== THOUGHT SIGNATURE CONTINUITY ==========
        // Intentionally no signature replay. Per the Gemini 3.x Flash contract,
        // signatures are optional for non-function-call JSON (omitting them does not
        // error, only "may degrade"), and carrying one forward would require replaying
        // the prior subchapter's full unmodified response (it must stay attached to the
        // exact part) — which doubles narrative tokens and re-triggers RECITATION.
        // Continuity is carried by explicit context instead (full story text, the
        // ESTABLISHED FACTS ledger, Under-Map state, and the <continuity_anchors> block).
        const priorMessages = [];
        const hasThoughtSignatureFromPrevious = false;

        console.log(`[StoryGenerationService] ✅ Cached generation for Chapter ${chapter}.${subchapter}`);
        llmTrace('StoryGenerationService', traceId, 'prompt.built', {
          caseNumber,
          pathKey,
          chapter,
          subchapter,
          isDecisionPoint,
          cacheKey,
          cachingEnabled: true,
          dynamicPromptLength: dynamicPrompt?.length || 0,
          hasThoughtSignatureFromPrevious,
          schema: isDecisionPoint ? 'DECISION_CONTENT_SCHEMA' : 'STORY_CONTENT_SCHEMA',
          contextSummary: {
            previousChapters: context?.previousChapters?.length || 0,
            establishedFacts: context?.establishedFacts?.length || 0,
            playerChoices: context?.playerChoices?.length || 0,
            narrativeThreads: context?.narrativeThreads?.length || 0,
          },
          reason,
        }, 'debug');

        // Log the complete prompt for debugging
        if (this.fullPromptLoggingEnabled) {
          this._logCompletePrompt({
            caseNumber,
            chapter,
            subchapter,
            cacheKey,
            dynamicPrompt,
            isCached: true,
          });
        }

        cachedCallReady = true;
        response = await llmService.completeWithCache({
          cacheKey,
          dynamicPrompt,
          priorMessages,
          options: {
            maxTokens: GENERATION_CONFIG.maxTokens.subchapter,
            responseSchema: schema,
            // Core narrative uses Gemini's medium reasoning tier to keep TTFT low
            // enough for background generation to finish while the player reads /
            // maps. Path-decisions / personality / validation stay low.
            thinkingLevel: options?.thinkingLevel || 'medium',
          },
        });
      } catch (cacheError) {
        // Only CACHE SETUP failures fall back to an uncached run. This catch used
        // to span the model call too, so a 500, a RECITATION block or a timeout
        // was reported as "Caching failed" and immediately retried as a full
        // uncached generation: the player waited out two ~70s generations at one
        // gateway, and a permanent failure was hidden behind a misleading log.
        if (cachedCallReady) throw cacheError;
        console.warn('[StoryGenerationService] ⚠️ Cache setup failed:', cacheError.message);
        console.warn('[StoryGenerationService] Falling back to non-cached generation');
        response = null;
      }

      // Fallback: Use regular generation if caching failed
      if (!response) {
        console.log(`[StoryGenerationService] Regular generation for Chapter ${chapter}.${subchapter} (no caching)`);

        const prompt = this._buildGenerationPrompt(context, chapter, subchapter, isDecisionPoint);

        // No signature replay here either (see the cached-path note above): a fresh
        // single-turn request, with continuity carried by the explicit context blocks.
        const messages = [{ role: 'user', content: prompt }];

        llmTrace('StoryGenerationService', traceId, 'prompt.built', {
          caseNumber,
          pathKey,
          chapter,
          subchapter,
          isDecisionPoint,
          cachingEnabled: false,
          promptLength: prompt?.length || 0,
          hasThoughtSignatureFromPrevious: false,
          schema: isDecisionPoint ? 'DECISION_CONTENT_SCHEMA' : 'STORY_CONTENT_SCHEMA',
          contextSummary: {
            previousChapters: context?.previousChapters?.length || 0,
            establishedFacts: context?.establishedFacts?.length || 0,
            playerChoices: context?.playerChoices?.length || 0,
            narrativeThreads: context?.narrativeThreads?.length || 0,
          },
          reason,
        }, 'debug');

        // Log the complete prompt for debugging
        if (this.fullPromptLoggingEnabled) {
          this._logCompletePrompt({
            caseNumber,
            chapter,
            subchapter,
            fullPrompt: prompt,
            isCached: false,
          });
        }

        response = await llmService.complete(
          messages,
          {
            systemPrompt: buildMasterSystemPrompt(),
            maxTokens: GENERATION_CONFIG.maxTokens.subchapter,
            responseSchema: schema,
            thinkingLevel: options?.thinkingLevel || 'medium',
            traceId,
            requestContext: {
              caseNumber,
              chapter,
              subchapter,
              pathKey,
              isDecisionPoint,
              hasThoughtSignatureFromPrevious: false,
              reason,
            },
          }
        );
      }

      // Capture the thought signature for telemetry/debug only (not replayed; see
      // the THOUGHT SIGNATURE CONTINUITY note above for why).
      const firstCallThoughtSignature = response?.thoughtSignature || null;

      // Log model thoughts if includeThoughts is enabled (debug mode)
      if (response?.candidates?.[0]?.content?.parts) {
        response.candidates[0].content.parts.forEach(part => {
          if (part.thought) {
            llmTrace('StoryGenerationService', traceId, 'model.reasoning', {
              thought: part.text,
              chapter,
              subchapter,
              thoughtType: 'narrative_planning'
            }, 'debug');
          }
        });
      }

      llmTrace('StoryGenerationService', traceId, 'llm.response.received', {
        model: response?.model,
        finishReason: response?.finishReason,
        isTruncated: response?.isTruncated,
        contentLength: response?.content?.length || 0,
        usage: response?.usage || null,
        hasThoughtSignature: !!firstCallThoughtSignature,
      }, 'debug');

      // Track token usage for first call
      this._trackTokenUsage(response?.usage, `Chapter ${chapter}.${subchapter} (main content)`);

      // A response cut off at the output ceiling is not parseable JSON, and the
      // partial-content recovery can only rebuild the opening — the branches,
      // the fragments and (on a C beat) the decision are simply gone. Retrying
      // costs one more generation; accepting it costs the player a broken scene
      // that is then written into the save as canon.
      if (response?.isTruncated || response?.finishReason === 'MAX_TOKENS' || response?.finishReason === 'LENGTH') {
        llmTrace('StoryGenerationService', traceId, 'llm.response.truncated', {
          finishReason: response?.finishReason,
          contentLength: response?.content?.length || 0,
          chapter,
          subchapter,
        }, 'warn');
        const truncErr = new Error(`Generation truncated at the output ceiling (${response?.finishReason || 'MAX_TOKENS'})`);
        truncErr.retryable = true;
        throw truncErr;
      }

      generatedContent = this._parseGeneratedContent(response.content, isDecisionPoint, requestUnderMap);
      llmTrace('StoryGenerationService', traceId, 'llm.response.parsed', {
        hasTitle: !!generatedContent?.title,
        narrativeLength: generatedContent?.narrative?.length || 0,
        hasBranchingNarrative: !!generatedContent?.branchingNarrative?.opening?.text,
        hasPathDecisions: !!generatedContent?.pathDecisions,
        hasSimpleDecision: !!generatedContent?.decision,
        hasBridgeText: !!generatedContent?.bridgeText,
        hasPreviously: !!generatedContent?.previously,
        hasPuzzleCandidates: Array.isArray(generatedContent?.puzzleCandidates),
        // UNDER-MAP: how many collectable fragments + relations this scene surfaced.
        fragments: Array.isArray(generatedContent?.fragments) ? generatedContent.fragments.length : 0,
        relations: Array.isArray(generatedContent?.relations) ? generatedContent.relations.length : 0,
      }, 'debug');

      // ========== SECOND CALL: Generate path-specific decisions ==========
      // If this is a decision point and we only have a simple decision (not full pathDecisions),
      // make a second API call with minimal schema to generate all 9 path-specific decisions
      if (isDecisionPoint && generatedContent.decision && !generatedContent.pathDecisions) {
        console.log('[StoryGenerationService] 🔄 Making second API call for pathDecisions...');
        llmTrace('StoryGenerationService', traceId, 'pathDecisions.secondCall.starting', {
          simpleDecisionIntro: generatedContent.decision?.intro?.slice(0, 100),
          optionATitle: generatedContent.decision?.optionA?.title,
          optionBTitle: generatedContent.decision?.optionB?.title,
        }, 'debug');

        try {
          // Build prompt using LABELS ONLY to avoid RECITATION safety filter
          // IMPORTANT: Do NOT echo back generated narrative content - this triggers RECITATION
          const bn = generatedContent.branchingNarrative || {};
          const firstChoiceOpts = bn.firstChoice?.options || [];
          const secondChoices = bn.secondChoices || [];

          // Helper to infer tone from choice label
          const inferTone = (label) => {
            const lower = (label || '').toLowerCase();
            if (lower.includes('confront') || lower.includes('demand') || lower.includes('force') || lower.includes('direct')) return 'aggressive/direct approach';
            if (lower.includes('investigate') || lower.includes('gather') || lower.includes('wait') || lower.includes('careful')) return 'cautious/methodical approach';
            return 'balanced approach';
          };

          // Build path summaries from the generated branching narrative
          // Uses the new 'summary' field (15-25 words each) instead of full narrative excerpts
          const pathSummaryMap = {};
          const pathSummaries = secondChoices.map((sc, scIdx) => {
            const afterChoice = sc.afterChoice || `1${String.fromCharCode(65 + scIdx)}`;
            const opts = sc.options || [];
            return opts.map((opt, optIdx) => {
              const pathKey = `${afterChoice}-2${String.fromCharCode(65 + optIdx)}`;
              const summary = opt.summary || `Player chose "${opt.label || 'an option'}"`;
              pathSummaryMap[pathKey] = summary;
              return `- ${pathKey}: ${summary}`;
            }).join('\n');
          }).join('\n');

          // Build richer structured notes without echoing full narrative (avoids RECITATION).
          // We include: per-path labels, summaries, evidence card labels, and extracted keywords.
          const extractKeywords = (text, max = 10) => {
            const STOP = new Set([
              'the','a','an','and','or','to','of','in','on','for','with','at','from','into','over','under','before','after',
              'he','she','they','him','her','them','his','their','its','this','that','these','those','as','is','be','been','being',
              'jack','halloway','now','then',
            ]);
            const tokens = String(text || '')
              .toLowerCase()
              .split(/[^a-z0-9]+/g)
              .map((t) => t.trim())
              .filter((t) => t && t.length >= 4 && !STOP.has(t));
            const uniq = [];
            for (const t of tokens) {
              if (!uniq.includes(t)) uniq.push(t);
              if (uniq.length >= max) break;
            }
            return uniq;
          };

          const getEvidenceCards = (details) => {
            const cards = [];
            const arr = Array.isArray(details) ? details : [];
            for (const d of arr) {
              const label = String(d?.evidenceCard || '').trim();
              if (label && !cards.includes(label)) cards.push(label);
            }
            return cards;
          };

          const firstChoiceByKey = {};
          for (const opt of firstChoiceOpts) {
            if (opt?.key) firstChoiceByKey[String(opt.key).toUpperCase()] = opt;
          }

          const pathStructuredNotes = secondChoices.map((sc) => {
            const afterChoice = String(sc.afterChoice || '').toUpperCase();
            const first = firstChoiceByKey[afterChoice] || null;
            const opts = Array.isArray(sc.options) ? sc.options : [];
            return opts.map((endOpt) => {
              const rawKey = String(endOpt?.key || '').toUpperCase();
              // Normalize keys if generator returned "2C" (we still want stable path keys in prompt)
              const normalizedKey = /^2[ABC]$/.test(rawKey) && /^1[ABC]$/.test(afterChoice) ? `${afterChoice}-${rawKey}` : rawKey;
              const evidenceCards = [
                // NOTE: Use `bn` (generatedContent.branchingNarrative) in this scope.
                // Referencing an undefined identifier here can break the whole second-call pipeline.
                ...getEvidenceCards(bn?.opening?.details),
                ...getEvidenceCards(first?.details),
                ...getEvidenceCards(endOpt?.details),
              ].slice(0, 6);
              const combinedText = [
                first?.label,
                first?.summary,
                endOpt?.label,
                endOpt?.summary,
                evidenceCards.join(' '),
              ].filter(Boolean).join(' | ');
              const keywords = extractKeywords(combinedText, 10);
              return [
                `- ${normalizedKey}:`,
                `  - firstChoiceLabel: "${first?.label || '?'}"`,
                `  - firstChoiceSummary: "${first?.summary || inferTone(first?.label)}"`,
                `  - endingLabel: "${endOpt?.label || '?'}"`,
                `  - endingSummary: "${endOpt?.summary || pathSummaryMap[normalizedKey] || ''}"`,
                `  - evidenceCards: [${evidenceCards.map((c) => `"${c}"`).join(', ')}]`,
                `  - keywords: [${keywords.map((k) => `"${k}"`).join(', ')}]`,
              ].join('\n');
            }).join('\n');
          }).join('\n');

          const pathDecisionsPrompt = fillTemplate(
            PATHDECISIONS_PROMPT_TEMPLATE,
            {
              caseNumber: caseNumber || `${chapter}.${subchapter}`,
              chapter: String(chapter),
              subchapter: String(subchapter),
              // First choice options with labels and summaries (not full narrative)
              firstChoice1ALabel: firstChoiceOpts[0]?.label || 'Option 1A',
              firstChoice1ASummary: firstChoiceOpts[0]?.summary || inferTone(firstChoiceOpts[0]?.label),
              firstChoice1BLabel: firstChoiceOpts[1]?.label || 'Option 1B',
              firstChoice1BSummary: firstChoiceOpts[1]?.summary || inferTone(firstChoiceOpts[1]?.label),
              firstChoice1CLabel: firstChoiceOpts[2]?.label || 'Option 1C',
              firstChoice1CSummary: firstChoiceOpts[2]?.summary || inferTone(firstChoiceOpts[2]?.label),
              // Path summaries (15-25 words each, not full narrative content)
              pathSummaries: pathSummaries || 'Not available',
              pathStructuredNotes: pathStructuredNotes || 'Not available',
              // Simple decision base
              optionATitle: generatedContent.decision?.optionA?.title || 'Option A',
              optionAFocus: generatedContent.decision?.optionA?.focus || 'Not specified',
              optionBTitle: generatedContent.decision?.optionB?.title || 'Option B',
              optionBFocus: generatedContent.decision?.optionB?.focus || 'Not specified',
            },
            { label: 'PATHDECISIONS_PROMPT_TEMPLATE' }
          );

          // Log what context we're sending
          console.log('[StoryGenerationService] 📋 pathDecisions second call context:');
          console.log(`  - First choices: ${firstChoiceOpts.map(o => `"${o?.label || '?'}" (${o?.summary ? 'has summary' : 'no summary'})`).join(', ')}`);
          console.log(`  - Path summaries: ${secondChoices.reduce((sum, sc) => sum + (sc.options?.filter(o => o?.summary)?.length || 0), 0)}/9 have summaries`);
          console.log(`  - Base decision: "${generatedContent.decision?.optionA?.title}" vs "${generatedContent.decision?.optionB?.title}"`);
          console.log(`  - Prompt length: ${pathDecisionsPrompt.length} chars (uses summaries, not full narrative)`);

          // UNDER-MAP: ground the 9 belief pairs in the living map — the
          // fragments collected, the truths revealed, the belief last sealed.
          //
          // Two things matter about how this is spliced in. It uses mode
          // 'decisions', which drops every instruction that names a field this
          // call's schema does not have (beliefResolution, relations,
          // falseReadings, echoes) — a low-thinking call should not be spending
          // its budget reconciling impossible asks. And it goes BEFORE
          // <output_requirements> rather than after it, because that block is
          // the ask: per Gemini 3.x guidance the instruction comes last, with
          // the context it reasons over above it.
          const pdContext = [];
          const pdTheory = this._buildPlayerTheorySection?.(requestUnderMap, chapter, { mode: 'decisions' });
          if (pdTheory) {
            pdContext.push(`<under_map_state>\n${pdTheory}\n</under_map_state>`);
          }
          // The rejected reading's champion shapes which belief is worth
          // rejecting, so the decisions call needs to know them too.
          const pdFoil = this._buildOtherReaderSection?.(requestUnderMap);
          if (pdFoil) {
            pdContext.push(`<the_other_reader>\n${pdFoil}\n</the_other_reader>`);
          }

          let basePathPrompt = pathDecisionsPrompt;
          if (pdContext.length) {
            const block = pdContext.join('\n\n');
            const askMarker = '<output_requirements>';
            const askAt = basePathPrompt.lastIndexOf(askMarker);
            basePathPrompt = askAt >= 0
              ? `${basePathPrompt.slice(0, askAt)}${block}\n\n${basePathPrompt.slice(askAt)}`
              : `${basePathPrompt}\n\n${block}`;
          }

          // Single user message - start fresh conversation for pathDecisions
          //
          // Why we don't use the thoughtSignature from the first call:
          // Per Gemini docs, thought signatures should be returned with the EXACT content
          // that generated them. Including the full 33k+ char first response just to use
          // the signature would be expensive and hit context limits. Since signatures are
          // optional for non-function-call responses (only recommended, not required),
          // we start a fresh request with a minimal prompt instead.
          //
          // The RECITATION issue was caused by echoing large chunks of LLM-generated
          // narrative content back to the model, which triggered the anti-memorization
          // safety filter. Using short summaries (15-25 words each) instead of full
          // narrative excerpts (~300 words each) provides necessary context without
          // triggering the safety filter.
          const messages = [{ role: 'user', content: basePathPrompt }];

          const pathDecisionsStartTime = Date.now();

          // Retry logic for RECITATION - this can happen if content still triggers safety filter
          let pathDecisionsResponse = null;
          let retryAttempt = 0;
          const MAX_PATHDECISIONS_RETRIES = 2;

          while (retryAttempt < MAX_PATHDECISIONS_RETRIES) {
            pathDecisionsResponse = await llmService.complete(
              messages,
              {
                // Use enhanced system prompt with story context, character info, and constraints
                // This significantly improves path-decision quality by grounding the model in the narrative world
                systemPrompt: buildPathDecisionsSystemPrompt(),
                maxTokens: GENERATION_CONFIG.maxTokens.pathDecisions, // 16k tokens for complex branching + thinking
                responseSchema: PATHDECISIONS_ONLY_SCHEMA,
                // 'low' thinking for fast multi-path decision generation.
                thinkingLevel: 'low',
                traceId: traceId + '-pathDecisions' + (retryAttempt > 0 ? `-retry${retryAttempt}` : ''),
                requestContext: {
                  caseNumber,
                  chapter,
                  subchapter,
                  pathKey,
                  secondCallFor: 'pathDecisions',
                  attempt: retryAttempt + 1,
                },
              }
            );

            // Check for RECITATION - if so, retry with slightly modified prompt
            if (pathDecisionsResponse?.finishReason === 'RECITATION') {
              retryAttempt++;
              console.warn(`[StoryGenerationService] ⚠️ RECITATION detected on pathDecisions (attempt ${retryAttempt}/${MAX_PATHDECISIONS_RETRIES})`);
              if (retryAttempt < MAX_PATHDECISIONS_RETRIES) {
                // Add uniqueness hint to prompt for retry
                messages[0].content = basePathPrompt + `\n\nIMPORTANT: Generate ORIGINAL decision variants. Each path should have unique framing. Attempt ${retryAttempt + 1}.`;
                await new Promise(r => setTimeout(r, 1000)); // Brief delay before retry
              }
            } else {
              break; // Success or other failure - exit retry loop
            }
          }

          const pathDecisionsElapsed = Date.now() - pathDecisionsStartTime;
          console.log(`[StoryGenerationService] ⏱️ pathDecisions second call completed in ${(pathDecisionsElapsed / 1000).toFixed(1)}s${retryAttempt > 0 ? ` (${retryAttempt} retries)` : ''}`);

          llmTrace('StoryGenerationService', traceId, 'pathDecisions.secondCall.received', {
            contentLength: pathDecisionsResponse?.content?.length || 0,
            finishReason: pathDecisionsResponse?.finishReason,
            elapsedMs: pathDecisionsElapsed,
            usage: pathDecisionsResponse?.usage || null,
            retryAttempts: retryAttempt,
          }, 'debug');

          // Track token usage for second call (pathDecisions)
          this._trackTokenUsage(pathDecisionsResponse?.usage, `Chapter ${chapter}.${subchapter} (pathDecisions)`);

          // Parse the pathDecisions response
          let pathDecisionsParsed;
          try {
            const rawContent = pathDecisionsResponse?.content;
            pathDecisionsParsed = rawContent ? (typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent) : null;
          } catch (parseErr) {
            console.warn('[StoryGenerationService] ⚠️ Failed to parse pathDecisions JSON:', parseErr.message);
            pathDecisionsParsed = null;
          }

          if (pathDecisionsParsed?.pathDecisions && Array.isArray(pathDecisionsParsed.pathDecisions)) {
            // Convert array format to object format for compatibility.
            //
            // This MUST go through _convertDecisionFormat rather than a hand-rolled
            // literal. The literal dropped `groundedKey`, which is the whole
            // evidence-grounded belief chain: without it decisionOptionsFrom stamps
            // grounded:null on every option, TheoryScreen seals theory.grounded as
            // null, and _buildPlayerTheorySection emits neither the hold nor the
            // subvert steering — so mapping well stopped buying clarity, silently.
            // The converter also normalizes personalityAlignment, clamps evidence to
            // two entries, and builds the options[] array the UI iterates.
            const pathDecisionsObj = {};
            for (const pd of pathDecisionsParsed.pathDecisions) {
              if (pd.pathKey) {
                pathDecisionsObj[pd.pathKey] = this._convertDecisionFormat(pd);
              }
            }
            generatedContent.pathDecisions = pathDecisionsObj;

            // Detailed logging of all 9 pathDecisions
            console.log(`[StoryGenerationService] ✅ pathDecisions merged: ${Object.keys(pathDecisionsObj).length} paths`);
            console.log('[StoryGenerationService] 📊 Path-specific decisions received:');
            for (const [pathKey, decision] of Object.entries(pathDecisionsObj)) {
              console.log(`  - ${pathKey}: A="${decision.optionA?.title || '?'}" | B="${decision.optionB?.title || '?'}"`);
            }

            // No clamping/fallback here: per-path pathDecisions are authoritative by design.
            // If the model drifts, we allow it. This is still better than collapsing to one decision.

            llmTrace('StoryGenerationService', traceId, 'pathDecisions.secondCall.merged', {
              pathCount: Object.keys(pathDecisionsObj).length,
              paths: Object.keys(pathDecisionsObj),
              decisions: Object.fromEntries(
                Object.entries(pathDecisionsObj).map(([k, v]) => [k, { optionA: v.optionA?.title, optionB: v.optionB?.title }])
              ),
            }, 'debug');
          } else {
            console.warn('[StoryGenerationService] ⚠️ Second call didn\'t return valid pathDecisions, using simple decision fallback');
          }
        } catch (secondCallError) {
          console.warn('[StoryGenerationService] ⚠️ Second call for pathDecisions failed:', secondCallError.message);
          llmTrace('StoryGenerationService', traceId, 'pathDecisions.secondCall.failed', {
            error: secondCallError.message,
          }, 'error');
          // Do not silently fall back for decision-point subchapters.
          // If pathDecisions cannot be generated, force a retry so the player doesn't see a collapsed decision set.
          const err = new Error(`Failed to generate pathDecisions: ${secondCallError.message}`);
          err.retryable = true;
          err.isPathDecisionsFailure = true;
          throw err;
        }
      }

      // Enforce: decision-point subchapters must have pathDecisions so the UI can show the correct
      // two-path decision set for the player's realized branching path.
      if (isDecisionPoint && !generatedContent.pathDecisions) {
        const err = new Error('Decision subchapter missing pathDecisions');
        err.retryable = true;
        err.isPathDecisionsFailure = true;
        throw err;
      }

      // Validate decision structure for decision points (path-specific decisions)
      if (isDecisionPoint && generatedContent.pathDecisions) {
        const pathKeys = Object.keys(generatedContent.pathDecisions);
        const sampleDecision = generatedContent.pathDecisions['1A-2A'] || generatedContent.pathDecisions[pathKeys[0]];
        console.log(`[StoryGenerationService] Path-specific decisions generated: ${pathKeys.length} paths, sample: "${sampleDecision?.optionA?.title}" vs "${sampleDecision?.optionB?.title}"`);
        llmTrace('StoryGenerationService', traceId, 'pathDecisions.generated', {
          pathCount: pathKeys.length,
          paths: pathKeys,
          samplePath: '1A-2A',
          sampleDecision: sampleDecision ? {
            optionA: { key: sampleDecision.optionA?.key, title: sampleDecision.optionA?.title },
            optionB: { key: sampleDecision.optionB?.key, title: sampleDecision.optionB?.title },
          } : null,
        }, 'debug');
      }

      // A parse that fell all the way through to raw text is not a scene: no
      // branching narrative, no fragments, no decision. Stored, it becomes a
      // chapter with nothing to examine and no way forward, cached under its
      // path key forever. Retry instead.
      if (generatedContent?.isFallback) {
        const parseErr = new Error(
          `Generation produced no usable structure (${generatedContent.fallbackReason || 'parse failure'})`,
        );
        parseErr.retryable = true;
        throw parseErr;
      }

      // Build canonical narrative from branchingNarrative for validation/expansion
      // Uses opening + first choice (1A) + first ending (1A-2A) as the canonical path
      ensureCanonicalNarrative(generatedContent);

      // Word count check - log but DO NOT expand
      // Expansion was causing text corruption (duplicate content, mid-word cuts like "ike taffy")
      // Shorter stories are preferable to corrupted text
      const wordCount = generatedContent.narrative?.split(/\s+/).length || 0;
      if (wordCount < MIN_WORDS_PER_SUBCHAPTER) {
        console.log(`[StoryGenerationService] Word count ${wordCount} below minimum ${MIN_WORDS_PER_SUBCHAPTER}, proceeding without expansion (expansion disabled)`);
      }

      // Validate consistency (check for obvious violations)
      // FIRST: Fix simple typos locally without LLM call
      generatedContent = this._fixTyposLocally(generatedContent);

      let validationResult = this._validateConsistency(generatedContent, context);
      const underMapPlayabilityIssues = this._validateUnderMapPlayability(generatedContent, requestUnderMap);
      if (underMapPlayabilityIssues.length > 0) {
        validationResult = {
          ...validationResult,
          valid: false,
          issues: [...(validationResult.issues || []), ...underMapPlayabilityIssues],
        };
      }
      const baseQualitySettings = GENERATION_CONFIG?.qualitySettings || {};
      const overrideQualitySettings = options?.qualitySettingsOverride || {};
      const resolveQualityFlag = (key, fallback = true) => {
        if (typeof overrideQualitySettings[key] === 'boolean') return overrideQualitySettings[key];
        if (typeof baseQualitySettings[key] === 'boolean') return baseQualitySettings[key];
        return fallback;
      };
      const enableProseQualityValidation = resolveQualityFlag('enableProseQualityValidation');
      const enableSentenceVarietyValidation = resolveQualityFlag('enableSentenceVarietyValidation');
      // Post-generation LLM validation disabled for now: it adds a serial ~5s LLM
      // call after every subchapter. Regex/prose checks below still run. To
      // re-enable, restore: resolveQualityFlag('enableLLMValidation').
      const enableLLMValidation = false;

      // ========== A+ QUALITY VALIDATION (Warnings Only - Don't Block Generation) ==========
      // These validators provide feedback but should NOT cause generation failures.
      // Only critical continuity issues should block generation.

      // Track setups for major revelations
      this._trackSetups(generatedContent.narrative, chapter, subchapter);

      if (enableProseQualityValidation) {
        // Run prose quality validation - WARNINGS ONLY
        const proseQuality = this._validateProseQuality(generatedContent.narrative);
        if (proseQuality.warnings.length > 0) {
          validationResult.warnings = [...(validationResult.warnings || []), ...proseQuality.warnings];
        }
        // Convert issues to warnings - prose quality should not block generation
        if (proseQuality.issues.length > 0) {
          validationResult.warnings = [...(validationResult.warnings || []), ...proseQuality.issues.map(i => `[Style] ${i}`)];
        }
        console.log(`[A+Quality] Prose quality score: ${proseQuality.score}/100`);
      }

      if (enableSentenceVarietyValidation) {
        // Run sentence variety validation - WARNINGS ONLY
        const sentenceVariety = this._validateSentenceVariety(generatedContent.narrative);
        if (sentenceVariety.warnings.length > 0) {
          validationResult.warnings = [...(validationResult.warnings || []), ...sentenceVariety.warnings];
        }
        if (sentenceVariety.issues.length > 0) {
          validationResult.warnings = [...(validationResult.warnings || []), ...sentenceVariety.issues.map(i => `[Variety] ${i}`)];
        }
      }

      // Run character voice validation - WARNINGS ONLY
      const characterVoice = this._validateCharacterVoices(generatedContent.narrative);
      if (characterVoice.warnings.length > 0) {
        validationResult.warnings = [...(validationResult.warnings || []), ...characterVoice.warnings];
      }
      if (characterVoice.issues.length > 0) {
        validationResult.warnings = [...(validationResult.warnings || []), ...characterVoice.issues.map(i => `[Voice] ${i}`)];
      }

      // Validate setup/payoff balance - WARNINGS ONLY
      const setupPayoff = this._validateSetupPayoff(chapter, generatedContent.narrative);
      if (setupPayoff.warnings.length > 0) {
        validationResult.warnings = [...(validationResult.warnings || []), ...setupPayoff.warnings];
      }
      if (setupPayoff.issues.length > 0) {
        validationResult.warnings = [...(validationResult.warnings || []), ...setupPayoff.issues.map(i => `[Setup] ${i}`)];
      }

      // Validate arc closure for final chapters (11-12) - WARNINGS ONLY
      const arcClosure = this._validateArcClosure(chapter, context);
      if (arcClosure.warnings.length > 0) {
        validationResult.warnings = [...(validationResult.warnings || []), ...arcClosure.warnings];
      }
      if (arcClosure.issues.length > 0) {
        validationResult.warnings = [...(validationResult.warnings || []), ...arcClosure.issues.map(i => `[Arc] ${i}`)];
      }

      // ========== LLM-BASED VALIDATION (Semantic Understanding) ==========
      // This catches violations that regex can't detect (wrong years, subtle contradictions)
      // Only run if regex validation passed (to avoid wasting tokens on obviously broken content)
      if (enableLLMValidation && validationResult.issues.length === 0) {
        try {
          const llmValidation = await this._validateWithLLM(generatedContent, context);
          if (llmValidation.validated && llmValidation.issues.length > 0) {
            // LLM found issues that regex missed - these are blocking issues
            validationResult.issues = [...validationResult.issues, ...llmValidation.issues.map(i => `[LLM] ${i}`)];
            console.log(`[StoryGen] LLM validation found ${llmValidation.issues.length} issues that regex missed`);
          }
        } catch (llmValError) {
          console.warn('[StoryGen] LLM validation skipped due to error:', llmValError.message);
          // Don't fail generation if LLM validation fails - regex validation already passed
        }
      }

      // Log all warnings for debugging without blocking generation
      if (validationResult.warnings?.length > 0) {
        console.log(`[A+Quality] ${validationResult.warnings.length} style warnings (non-blocking):`,
          validationResult.warnings.slice(0, 5));
      }

      // Check if there are any HARD issues that actually require fixing
      // If all issues are soft (non-critical), skip the retry loop entirely
      const allIssues = Array.isArray(validationResult.issues) ? validationResult.issues : [];
      const hardIssuesBeforeRetry = allIssues.filter((i) => this._isContinuityCriticalIssue(i));

      if (!validationResult.valid && hardIssuesBeforeRetry.length === 0) {
        // All issues are soft - convert to warnings and proceed without retry
        console.log(`[StoryGenerationService] ${allIssues.length} soft issues converted to warnings (no retry needed):`,
          allIssues.slice(0, 3));
        validationResult.warnings = [...(validationResult.warnings || []), ...allIssues.map(i => `[Soft] ${i}`)];
        validationResult.issues = [];
        validationResult.valid = true;
      }

      let retries = 0;

      // _fixContent re-generates against DECISION_CONTENT_SCHEMA / STORY_CONTENT_SCHEMA,
      // neither of which carries pathDecisions, and the C-beat schema carries none of
      // the Under-Map fields either. A single repair pass therefore used to return an
      // object with those fields absent, and the entry was stored that way: nine
      // path-specific beliefs collapsed to one generic decision, no fragments for the
      // board, no belief verdict. Hold them here and restore whatever the repair did
      // not itself produce.
      const preservedAcrossRepair = {
        pathDecisions: generatedContent.pathDecisions,
        fragments: generatedContent.fragments,
        relations: generatedContent.relations,
        echoes: generatedContent.echoes,
        beliefResolution: generatedContent.beliefResolution,
        foilName: generatedContent.foilName,
      };

      // Only retry if there are HARD continuity issues that require fixing
      while (!validationResult.valid && retries < MAX_RETRIES) {
        console.warn(`Consistency check failed (Attempt ${retries + 1}/${MAX_RETRIES}). Issues:`, validationResult.issues);

        try {
          generatedContent = await this._fixContent(generatedContent, validationResult.issues, context, isDecisionPoint);

          for (const [field, value] of Object.entries(preservedAcrossRepair)) {
            const repaired = generatedContent[field];
            const repairedIsEmpty = repaired == null || (Array.isArray(repaired) && repaired.length === 0);
            if (repairedIsEmpty && value != null) generatedContent[field] = value;
          }
          ensureCanonicalNarrative(generatedContent);

          // Log word count after fix (expansion disabled to prevent text corruption)
          const fixedWordCount = (generatedContent.narrative || '').split(/\s+/).filter(Boolean).length;
          if (fixedWordCount < MIN_WORDS_PER_SUBCHAPTER) {
            console.log(`[StoryGenerationService] Post-fix word count ${fixedWordCount} below minimum, proceeding without expansion`);
          }

          validationResult = this._validateConsistency(generatedContent, context);
          retries++;
        } catch (error) {
          console.error('Error during content regeneration:', error);
          break; // Stop retrying if generation fails
        }
      }

      if (!validationResult.valid) {
        const allIssues = Array.isArray(validationResult.issues) ? validationResult.issues : [];
        const hardIssues = allIssues.filter((i) => this._isContinuityCriticalIssue(i));

        if (hardIssues.length > 0) {
          // Hard continuity failure: throw error to prompt player retry.
          // No fallback narratives - player should retry generation.
          console.error('[StoryGenerationService] Hard validation failure after retries:', hardIssues);
          llmTrace('StoryGenerationService', traceId, 'validation.hard_fail.error', {
            caseNumber,
            pathKey: effectivePathKey,
            chapter,
            subchapter,
            isDecisionPoint,
            hardIssues: hardIssues.slice(0, 10),
            reason,
          }, 'error');

          const error = new Error(`Story generation failed validation: ${hardIssues.slice(0, 2).join('; ')}`);
          error.isValidationFailure = true;
          error.hardIssues = hardIssues;
          error.chapter = chapter;
          error.subchapter = subchapter;
          error.retryable = true;
          throw error;
        }

        console.warn('Consistency warning (Unresolved):', allIssues);
      }

      // Build the story entry
      // NOTE: Schema was slimmed down - beatSheet, jackActionStyle, jackRiskLevel, jackBehaviorDeclaration,
      // storyDay, chapterSummary, consistencyFacts, previousThreadsAddressed were removed from output.
      // These are now handled via <scene_requirements> in the system prompt (Gemini 3 thinking handles internally).
      const shouldGenerateBoard = isDecisionPoint;
      const storyEntry = {
        chapter,
        subchapter,
        pathKey: effectivePathKey,
        caseNumber,
        title: generatedContent.title,
        // Store canonical narrative (built from branchingNarrative 1A->1A-2A path) for context fallback
        narrative: generatedContent.narrative || null,
        // BRANCHING NARRATIVE: Interactive story structure with player choices
        branchingNarrative: generatedContent.branchingNarrative || null,
        bridgeText: generatedContent.bridgeText,
        previously: generatedContent.previously || '',
        briefing: generatedContent.briefing || { summary: '', objectives: [] },
        pathDecisions: isDecisionPoint ? generatedContent.pathDecisions : null,
        decision: isDecisionPoint ? generatedContent.decision : null,
        // UNDER-MAP / EXAMINE: carry the scene's collectable fragments + relations
        // onto the stored entry. (This whitelist previously dropped them, so the
        // board never populated for generated chapters.)
        fragments: Array.isArray(generatedContent.fragments) ? generatedContent.fragments : [],
        relations: Array.isArray(generatedContent.relations) ? generatedContent.relations : [],
        // UNDER-MAP ECHO: callbacks tying this scene to truths the player revealed.
        echoes: Array.isArray(generatedContent.echoes) ? generatedContent.echoes : [],
        // BELIEF RESOLUTION: whether a sealed belief was borne out here (drives Clarity).
        beliefResolution: generatedContent.beliefResolution || null,
        // THE OTHER READER: the name the model gave the foil, captured once.
        foilName: generatedContent.foilName || null,
        board: shouldGenerateBoard
          ? this._generateBoardData(isDecisionPoint, generatedContent.pathDecisions || generatedContent.decision)
          : null,
        narrativeThreads: Array.isArray(generatedContent.narrativeThreads) ? generatedContent.narrativeThreads : [],
        generatedAt: new Date().toISOString(),
        wordCount: generatedContent.narrative?.split(/\s+/).length || 0,
        // NOTE: the thought signature is intentionally NOT persisted on the entry —
        // it has no consumer (cross-subchapter replay is disabled by design; see the
        // THOUGHT SIGNATURE CONTINUITY note above) and would only bloat stored JSON.
      };

      // Save the generated content
      await saveGeneratedChapter(caseNumber, effectivePathKey, storyEntry);
      llmTrace('StoryGenerationService', traceId, 'storage.saved', {
        caseNumber,
        pathKey,
        wordCount: storyEntry.wordCount,
        hasBranchingNarrative: !!storyEntry.branchingNarrative?.opening?.text,
        generatedAt: storyEntry.generatedAt,
        hasPathDecisions: !!storyEntry.pathDecisions,
      }, 'debug');

      // Update local cache
      if (!this.generatedStory) {
        this.generatedStory = { chapters: {} };
      }
      this.generatedStory.chapters[`${caseNumber}_${effectivePathKey}`] = storyEntry;

      // Update story context
      await this._updateStoryContext(storyEntry);
      llmTrace('StoryGenerationService', traceId, 'context.updated', {
        caseNumber,
        pathKey,
        chapter,
        subchapter,
      }, 'debug');

      // ========== NEW: Create consistency checkpoint for state validation ==========
      // Checkpoints are created after each subchapter C (end of chapter) for validation
      if (subchapter === 3) {
        await this._createConsistencyCheckpoint(chapter, effectivePathKey, storyEntry, choiceHistory);
        llmTrace('StoryGenerationService', traceId, 'checkpoint.created', { chapter, pathKey: effectivePathKey, caseNumber }, 'debug');
      }

      this.isGenerating = false;
      llmTrace('StoryGenerationService', traceId, 'generation.complete', {
        generationKey,
        caseNumber,
        pathKey: effectivePathKey,
        chapter,
        subchapter,
        isDecisionPoint,
        wordCount: storyEntry.wordCount,
        isFallback: false,
        reason,
      }, 'info');
      return storyEntry;
    } catch (error) {
      this.isGenerating = false;

      // ========== GRACEFUL DEGRADATION: Use fallback content on failure ==========
      console.error(`[StoryGenerationService] Generation failed for ${caseNumber}_${effectivePathKey}:`, error.message);
      llmTrace('StoryGenerationService', traceId, 'generation.error', {
        generationKey,
        caseNumber,
        pathKey: effectivePathKey,
        chapter,
        subchapter,
        isDecisionPoint,
        error: error?.message,
        name: error?.name,
        reason,
      }, 'error');

      // Track attempts
      const attemptKey = `${caseNumber}_${effectivePathKey}`;
      const attempts = (this.generationAttempts.get(attemptKey) || 0) + 1;
      this.generationAttempts.set(attemptKey, attempts);

      // If we've exhausted retries, throw error - no fallback narratives
      if (attempts >= this.maxGenerationAttempts) {
        console.error(`[StoryGenerationService] Generation failed for ${caseNumber} after ${attempts} attempts - no fallback`);
        llmTrace('StoryGenerationService', traceId, 'generation.exhausted.error', {
          caseNumber,
          pathKey: effectivePathKey,
          chapter,
          subchapter,
          attempts,
          originalError: error.message,
          reason,
        }, 'error');

        // Clear attempt count
        this.generationAttempts.delete(attemptKey);

        // Throw retryable error for UI to handle
        const retryError = new Error(`Story generation failed after ${attempts} attempts: ${error.message}`);
        retryError.isGenerationFailure = true;
        retryError.attempts = attempts;
        retryError.chapter = chapter;
        retryError.subchapter = subchapter;
        retryError.retryable = true;
        throw retryError;
      }

      // Re-throw to allow caller to retry if attempts remain
      throw error;
    }
  })();

  // Registered synchronously, immediately after construction. It used to be
  // registered two awaits after the dedup check, so two callers arriving inside
  // that window both missed the map and both generated — including the
  // documented seal case, where the C-beat prefetch and crossThreshold are given
  // the same key precisely so they dedupe. With two slots, the duplicate took the
  // one the player was waiting on.
  generationPromise._createdAt = Date.now();
  generationPromise._settled = false;
  generationPromise.then(
    () => { generationPromise._settled = true; },
    () => { generationPromise._settled = true; },
  );
  this.pendingGenerations.set(generationKey, generationPromise);

  // Create a timeout promise to prevent indefinite hangs
  // IMPORTANT: Must be longer than LLMService timeout (300s) * max retries (2)
  // to allow retries to complete. Adding buffer for network delays.
  // Formula: (300s * 2 attempts) + 60s buffer = 660s ≈ 11 minutes
  const GENERATION_TIMEOUT_MS = 11 * 60 * 1000; // 11 minutes (allows for 2 retries @ 300s each)
  // The handle is kept so the loser of the race can be cancelled. Discarded, an
  // eleven-minute timer stayed armed after every successful generation, holding
  // its closure alive and eventually rejecting a promise nothing was waiting on.
  let timeoutHandle = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Generation timeout after ${GENERATION_TIMEOUT_MS / 1000}s for ${generationKey}`));
    }, GENERATION_TIMEOUT_MS);
  });
  // An unobserved rejection from the loser is not an error condition.
  timeoutPromise.catch(() => {});

  try {
    // Race between the actual generation and the timeout
    const result = await Promise.race([generationPromise, timeoutPromise]);
    this.pendingGenerations.delete(generationKey);
    return result;
  } catch (e) {
    this.pendingGenerations.delete(generationKey);

    // CRITICAL: If this is user-facing generation, NEVER show fallback
    // Instead, throw the error and let the UI show a proper retry screen
    if (isUserFacing) {
      console.error(`[StoryGenerationService] User-facing generation failed for ${generationKey}: ${e.message}`);
      console.error('[StoryGenerationService] Throwing error to UI - no fallback for user-facing content');
      llmTrace('StoryGenerationService', traceId, 'generation.userFacing.failed', {
        generationKey,
        caseNumber,
        pathKey: effectivePathKey,
        error: e.message,
        reason
      }, 'error');
      throw e; // Let UI handle retry
    }

    // For background/prefetch generation, also throw error - no fallback narratives
    // The prefetch will fail, and when player needs content, a new generation will be triggered
    console.error(`[StoryGenerationService] Background generation failure for ${generationKey} - no fallback: ${e.message}`);
    llmTrace('StoryGenerationService', traceId, 'generation.background.failed', {
      generationKey,
      caseNumber,
      pathKey: effectivePathKey,
      error: e.message,
      reason,
    }, 'error');

    // Throw error - caller (prefetch) will catch and log, player retries when needed
    throw e;
  } finally {
    if (timeoutHandle) { clearTimeout(timeoutHandle); timeoutHandle = null; }
    // Release exactly what was acquired: the slot is taken inside the tracked
    // promise now, and _acquireGenerationSlot can throw (queue full) without
    // ever taking one.
    if (holdsSlot) {
      holdsSlot = false;
      this._releaseGenerationSlot(generationKey);
    }
  }
}

/**
 * Generate an entire chapter (all 3 subchapters)
 */
async function generateChapter(chapter, pathKey, choiceHistory = []) {
  const results = [];

  for (let sub = 1; sub <= SUBCHAPTERS_PER_CHAPTER; sub++) {
    const entry = await this.generateSubchapter(chapter, sub, pathKey, choiceHistory);
    results.push(entry);
  }

  return results;
}

/**
 * LAZY BRANCHING — Layer 2: generate the three second-choice response bodies for
 * one firstChoice, given a Layer-1 branching narrative. Focused, fast (low
 * thinking), and consistent with the scene already written. Returns a payload
 * { afterChoice, responses } to be merged via mergeSecondChoiceResponses.
 */
async function generateSecondChoiceResponses(afterChoice, branchingNarrative, options = {}) {
  const norm = (v) => String(v || '').trim().toUpperCase();
  const target = norm(afterChoice);
  if (!branchingNarrative || !Array.isArray(branchingNarrative.secondChoices)) {
    throw new Error('generateSecondChoiceResponses: missing branchingNarrative');
  }
  const group = branchingNarrative.secondChoices.find((g) => norm(g?.afterChoice) === target);
  if (!group || !Array.isArray(group.options) || group.options.length === 0) {
    throw new Error(`generateSecondChoiceResponses: no second-choice group for ${target}`);
  }

  const firstOpt = (branchingNarrative.firstChoice?.options || []).find((o) => norm(o?.key) === target);
  const opening = branchingNarrative.opening?.text || '';
  const firstResponse = firstOpt?.response || '';
  const endings = group.options.map((o) => `- ${o.key}: "${o.label}"${o.summary ? ` — ${o.summary}` : ''}`).join('\n');

  const userPrompt = [
    '<task>',
    `Write the THREE ending segments for path ${target} of this scene. Each runs 380-420 words (never below 320) and concludes that branch with momentum, in the established voice. Develop each fully — a thin ending reads as unfinished.`,
    '</task>',
    '<scene_so_far>',
    opening,
    '',
    firstResponse,
    '</scene_so_far>',
    '<endings_to_write>',
    'Write exactly one ending per option below, matched by its key. Stay consistent with the scene above; do not contradict it.',
    endings,
    'Each ending carries 1-2 tappable `details`: a short verbatim phrase from that ending where an anomaly of the hidden world appears, a one-line note on why it is strange, a 2-4 word evidenceCard label, and its kind. Without them the last third of every path has nothing for the player to examine.',
    '</endings_to_write>',
    '<output_contract>',
    `Return ONLY JSON: { "afterChoice": "${target}", "responses": [ { "key": "...", "response": "...", "details": [ { "phrase": "...", "note": "...", "evidenceCard": "...", "kind": "symbol|place|person|phenomenon" } ] } ] } with exactly 3 responses. No commentary, no markdown.`,
    '</output_contract>',
  ].join('\n');

  // Layer 2 goes through the same slot discipline as a full subchapter. It used
  // to call straight through, so it could run alongside BOTH full generations and
  // put three concurrent requests on the wire from a device the limiter exists to
  // keep at two — and it fires exactly when the player is waiting on the reader,
  // which is the worst possible moment to be third in line at the API.
  const slotKey = `l2_${target}_${options.traceId || 'anon'}`;
  await this._acquireGenerationSlot(slotKey);
  let response;
  try {
    response = await llmService.complete(
      [{ role: 'user', content: userPrompt }],
      {
        systemPrompt: buildMasterSystemPrompt(),
        responseSchema: SECOND_CHOICE_RESPONSES_SCHEMA,
        maxTokens: 16000,
        thinkingLevel: 'low',
        traceId: options.traceId || createTraceId(`scResp_${target}`),
        requestContext: { secondChoiceResponsesFor: target, ...(options.requestContext || {}) },
      },
    );
  } finally {
    this._releaseGenerationSlot(slotKey);
  }

  let parsed;
  try {
    parsed = typeof response.content === 'string' ? JSON.parse(response.content) : response.content;
  } catch (e) {
    throw new Error(`generateSecondChoiceResponses: failed to parse response: ${e.message}`);
  }
  const rawResponses = Array.isArray(parsed?.responses) ? parsed.responses : [];
  const responses = rawResponses.map((r) => ({
    key: r?.key,
    response: typeof r?.response === 'string' ? this._cleanBranchingProse(r.response) : '',
    ...(Array.isArray(r?.details) ? { details: r.details } : {}),
  }));
  return { afterChoice: target, responses };
}

export const generationMethods = {
  _waitForGenerationSlot,
  _acquireGenerationSlot,
  _releaseGenerationSlot,
  generateSubchapter,
  generateChapter,
  generateSecondChoiceResponses,
};
