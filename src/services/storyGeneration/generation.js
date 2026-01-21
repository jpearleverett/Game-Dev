import { llmService } from '../LLMService';
import { llmTrace, createTraceId } from '../../utils/llmTrace';
import { formatCaseNumber } from '../../data/storyContent';
import { buildMasterSystemPrompt, buildPathDecisionsSystemPrompt, PATHDECISIONS_PROMPT_TEMPLATE } from './prompts';
import { fillTemplate } from './helpers';
import {
  DECISION_CONTENT_SCHEMA,
  DECISION_ONLY_SCHEMA,
  PATHDECISIONS_ONLY_SCHEMA,
  STORY_CONTENT_SCHEMA,
} from './schemas';
import {
  DECISION_SUBCHAPTER,
  MAX_RETRIES,
  MIN_WORDS_PER_SUBCHAPTER,
  SUBCHAPTERS_PER_CHAPTER,
  TRUNCATE_SUMMARY,
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

const normalizeBranchingChoices = (choices = []) => {
  if (!Array.isArray(choices)) return [];
  return choices
    .map(normalizeBranchingChoice)
    .filter(Boolean);
};

/**
 * Generate decision structure first (Pass 1 of two-pass generation)
 * This ensures decisions are always complete and contextually appropriate,
 * preventing truncation from producing generic placeholder choices
 */
async function _generateDecisionStructure(context, chapter) {
  const { protagonist, setting } = ABSOLUTE_FACTS;
  const decisionPrompt = `You are planning a critical decision point for Chapter ${chapter} of "Dead Letters."

## CURRENT STORY STATE
${context.storySummary || `${protagonist.fullName} is investigating a pattern of symbols and disappearances in ${setting.city}.`}

## RECENT EVENTS
${context.previousChapterSummary || `${protagonist.fullName} received another dead letter with an impossible glyph string.`}

## ACTIVE NARRATIVE THREADS
${context.narrativeThreads?.filter(t => t.status === 'active').slice(0, 5).map(t => `- [${t.urgency}] ${t.description}`).join('\n') || '- No active threads'}

## PATH PERSONALITY
${protagonist.fullName} has been playing ${context.pathPersonality?.narrativeStyle || 'a balanced approach'}.
Risk tolerance: ${context.pathPersonality?.riskTolerance || 'moderate'}

## CHAPTER BEAT TYPE
This chapter's required beat: ${STORY_STRUCTURE.chapterBeatTypes?.[chapter] || 'STANDARD'}

## YOUR TASK
Design a meaningful binary decision that:
1. Emerges naturally from the story situation
2. Has NO obvious "right" answer - both options have real costs
3. Connects to themes of certainty vs doubt, perception vs reality, and the cost of following a pattern
4. Fits the player's established personality while challenging them
5. Creates genuinely different story branches

Generate the decision structure FIRST. This will guide the narrative that leads to it.`;

  console.log(`[StoryGenerationService] Two-pass generation: Generating decision structure for Chapter ${chapter}`);

  const response = await llmService.complete(
    [{ role: 'user', content: decisionPrompt }],
    {
      systemPrompt: 'You are a narrative designer creating morally complex choices for a mystery thriller. Every decision must have real stakes and no clear "correct" answer.',
      maxTokens: GENERATION_CONFIG.maxTokens.outline,
      responseSchema: DECISION_ONLY_SCHEMA,
    }
  );

  try {
    const parsed = typeof response.content === 'string'
      ? JSON.parse(response.content)
      : response.content;

    console.log(`[StoryGenerationService] Decision structure generated: "${parsed.decision?.optionA?.title}" vs "${parsed.decision?.optionB?.title}"`);

    return parsed;
  } catch (error) {
    console.error('[StoryGenerationService] Failed to parse decision structure:', error);
    // Return a valid fallback structure
    return {
      decisionContext: 'Jack faces an impossible choice.',
      decision: {
        intro: 'The evidence points in two directions, and time is running out.',
        optionA: {
          key: 'A',
          title: 'Take direct action now',
          focus: 'Prioritizes immediate resolution and confrontation. Risks escalating the situation before all facts are known.',
          personalityAlignment: 'aggressive',
          narrativeSetup: 'The tension builds to a breaking point where waiting feels impossible.',
        },
        optionB: {
          key: 'B',
          title: 'Gather more evidence first',
          focus: 'Prioritizes thorough investigation and certainty. Risks letting the trail go cold or enemies preparing.',
          personalityAlignment: 'methodical',
          narrativeSetup: 'New information suggests there may be more to uncover.',
        },
      },
      keyMoments: ['Building tension', 'Key revelation', 'Forced choice'],
      emotionalArc: 'Tension building to difficult choice',
    };
  }
}

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
  const generationKey = `${caseNumber}_${effectivePathKey}`;
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

  // Store branchingChoices on instance so helper functions can access player's actual path
  // This enables _getPathDecisionData to look up path-specific decisions correctly
  this.currentBranchingChoices = branchingChoices;

  // Deduplication: Return existing promise if generation is already in flight for this exact content
  // But first check if the cached promise is stale (older than 3 minutes) - if so, discard it
  const MAX_PENDING_AGE_MS = 3 * 60 * 1000; // 3 minutes
  if (this.pendingGenerations.has(generationKey)) {
    const cachedPromise = this.pendingGenerations.get(generationKey);
    const promiseAge = Date.now() - (cachedPromise._createdAt || 0);

    if (promiseAge > MAX_PENDING_AGE_MS) {
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

  // Acquire a generation slot (waits if at capacity)
  await this._acquireGenerationSlot(generationKey);

  // After waiting for slot, check if content was generated by another request
  // This prevents duplicate generation when multiple requests queue for the same content
  const existingAfterWait = await this.getGeneratedEntryAsync(caseNumber, effectivePathKey);
  if (existingAfterWait) {
    console.log(`[StoryGenerationService] Content already exists after wait for ${generationKey}, skipping generation`);
    llmTrace('StoryGenerationService', traceId, 'generation.skip.existsAfterWait', {
      generationKey,
      caseNumber,
      pathKey: effectivePathKey,
    }, 'info');
    this._releaseGenerationSlot(generationKey);
    return existingAfterWait;
  }

  const generationPromise = (async () => {
    const isDecisionPoint = subchapter === DECISION_SUBCHAPTER;
    llmTrace('StoryGenerationService', traceId, 'generation.start', {
      generationKey,
      caseNumber,
      chapter,
      subchapter,
      isDecisionPoint,
      pathKey,
      choiceHistoryLength: choiceHistory?.length || 0,
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

    this.isGenerating = true;
    try {
      let generatedContent;

      // ========== SINGLE-PASS GENERATION WITH CONTEXT CACHING ==========
      // Decision schema has decision field BEFORE narrative, so decision is generated first
      // This eliminates the need for two-pass generation while ensuring complete decisions

      const schema = isDecisionPoint ? DECISION_CONTENT_SCHEMA : STORY_CONTENT_SCHEMA;
      let response;

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
        const usingChapterStartCache = typeof cacheKey === 'string' && cacheKey.startsWith(`story_chStart_c${chapter}_`);
        const dynamicPrompt = this._buildDynamicPrompt(
          context,
          chapter,
          subchapter,
          isDecisionPoint,
          {
            cachedHistoryMaxChapter: usingChapterStartCache ? chapter - 1 : null,
            includeManyShot: false,
          }
        );

        // ========== THOUGHT SIGNATURE CONTINUITY (Gemini 3) ==========
        // Retrieve previous thought signature for reasoning chain continuity
        const prevThoughtSignature = this._getPreviousThoughtSignature(chapter, subchapter, effectivePathKey);

        // Build prior messages with thought signature if available
        const priorMessages = [];
        if (prevThoughtSignature && context.previousChapters?.length > 0) {
          const lastChapter = context.previousChapters[context.previousChapters.length - 1];
          const prevNarrativeSummary = lastChapter?.narrative
            ? `Previous scene summary: ${lastChapter.narrative.slice(0, TRUNCATE_SUMMARY)}...`
            : 'Continuing the story...';
          priorMessages.push({ role: 'model', content: prevNarrativeSummary, thoughtSignature: prevThoughtSignature });
        }

        console.log(`[StoryGenerationService] ✅ Cached generation for Chapter ${chapter}.${subchapter}${prevThoughtSignature ? ' (with thought signature)' : ''}`);
        llmTrace('StoryGenerationService', traceId, 'prompt.built', {
          caseNumber,
          pathKey,
          chapter,
          subchapter,
          isDecisionPoint,
          cacheKey,
          cachingEnabled: true,
          dynamicPromptLength: dynamicPrompt?.length || 0,
          hasThoughtSignatureFromPrevious: !!prevThoughtSignature,
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

        response = await llmService.completeWithCache({
          cacheKey,
          dynamicPrompt,
          priorMessages,
          options: {
            maxTokens: GENERATION_CONFIG.maxTokens.subchapter,
            responseSchema: schema,
            thinkingConfig: {
              includeThoughts: process.env.INCLUDE_THOUGHTS === 'true', // Enable in dev to debug mystery logic
              thinkingLevel: 'high' // Maximize reasoning depth for complex narrative generation
            }
          },
        });
      } catch (cacheError) {
        console.warn('[StoryGenerationService] ⚠️ Caching failed:', cacheError.message);
        console.warn('[StoryGenerationService] Falling back to non-cached generation');
        // Fall through to non-cached generation
        response = null;
      }

      // Fallback: Use regular generation if caching failed
      if (!response) {
        console.log(`[StoryGenerationService] Regular generation for Chapter ${chapter}.${subchapter} (no caching)`);

        const prompt = this._buildGenerationPrompt(context, chapter, subchapter, isDecisionPoint);

        // ========== THOUGHT SIGNATURE CONTINUITY (Gemini 3) ==========
        // Per Gemini 3 docs: thought signatures maintain reasoning chain across multi-turn conversations.
        // Retrieve the thought signature from the previous subchapter and include it in the conversation.
        const prevThoughtSignature = this._getPreviousThoughtSignature(chapter, subchapter, effectivePathKey);

        // Build messages with thought signature if available
        // The thought signature must be attached to a model message with representative previous content
        const messages = [];
        if (prevThoughtSignature && context.previousChapters?.length > 0) {
          // Get a summary of the previous narrative for context
          const lastChapter = context.previousChapters[context.previousChapters.length - 1];
          const prevNarrativeSummary = lastChapter?.narrative
            ? `Previous scene summary: ${lastChapter.narrative.slice(0, TRUNCATE_SUMMARY)}...`
            : 'Continuing the story...';
          messages.push({ role: 'model', content: prevNarrativeSummary, thoughtSignature: prevThoughtSignature });
        }
        messages.push({ role: 'user', content: prompt });

        llmTrace('StoryGenerationService', traceId, 'prompt.built', {
          caseNumber,
          pathKey,
          chapter,
          subchapter,
          isDecisionPoint,
          cachingEnabled: false,
          promptLength: prompt?.length || 0,
          hasThoughtSignatureFromPrevious: !!prevThoughtSignature,
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
            traceId,
            requestContext: {
              caseNumber,
              chapter,
              subchapter,
              pathKey,
              isDecisionPoint,
              hasThoughtSignatureFromPrevious: !!prevThoughtSignature,
              reason,
            },
          }
        );
      }

      // Capture thought signature for multi-call reasoning continuity (Gemini 3)
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

      generatedContent = this._parseGeneratedContent(response.content, isDecisionPoint);
      llmTrace('StoryGenerationService', traceId, 'llm.response.parsed', {
        hasTitle: !!generatedContent?.title,
        narrativeLength: generatedContent?.narrative?.length || 0,
        hasBranchingNarrative: !!generatedContent?.branchingNarrative?.opening?.text,
        hasPathDecisions: !!generatedContent?.pathDecisions,
        hasSimpleDecision: !!generatedContent?.decision,
        hasBridgeText: !!generatedContent?.bridgeText,
        hasPreviously: !!generatedContent?.previously,
        hasPuzzleCandidates: Array.isArray(generatedContent?.puzzleCandidates),
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
          const messages = [{ role: 'user', content: pathDecisionsPrompt }];

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
                // Use 'high' thinkingLevel for complex multi-path reasoning per Gemini 3 best practices
                // This task requires understanding 9 different player journeys and deriving unique decisions
                thinkingLevel: 'high',
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
                messages[0].content = pathDecisionsPrompt + `\n\nIMPORTANT: Generate ORIGINAL decision variants. Each path should have unique framing. Attempt ${retryAttempt + 1}.`;
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
            // Convert array format to object format for compatibility
            const pathDecisionsObj = {};
            for (const pd of pathDecisionsParsed.pathDecisions) {
              if (pd.pathKey) {
                pathDecisionsObj[pd.pathKey] = {
                  intro: pd.intro,
                  optionA: pd.optionA,
                  optionB: pd.optionB,
                };
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

      // Build canonical narrative from branchingNarrative for validation/expansion
      // Uses opening + first choice (1A) + first ending (1A-2A) as the canonical path
      const hasNarrative = typeof generatedContent.narrative === 'string'
        && generatedContent.narrative.trim().length > 0;
      if (!hasNarrative && generatedContent.branchingNarrative) {
        const bn = generatedContent.branchingNarrative;
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
        generatedContent.narrative = parts.join('\n\n');
      }

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
      const baseQualitySettings = GENERATION_CONFIG?.qualitySettings || {};
      const overrideQualitySettings = options?.qualitySettingsOverride || {};
      const resolveQualityFlag = (key, fallback = true) => {
        if (typeof overrideQualitySettings[key] === 'boolean') return overrideQualitySettings[key];
        if (typeof baseQualitySettings[key] === 'boolean') return baseQualitySettings[key];
        return fallback;
      };
      const enableProseQualityValidation = resolveQualityFlag('enableProseQualityValidation');
      const enableSentenceVarietyValidation = resolveQualityFlag('enableSentenceVarietyValidation');
      const enableLLMValidation = resolveQualityFlag('enableLLMValidation');

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

      // Only retry if there are HARD continuity issues that require fixing
      while (!validationResult.valid && retries < MAX_RETRIES) {
        console.warn(`Consistency check failed (Attempt ${retries + 1}/${MAX_RETRIES}). Issues:`, validationResult.issues);

        try {
          generatedContent = await this._fixContent(generatedContent, validationResult.issues, context, isDecisionPoint);

          // Log word count after fix (expansion disabled to prevent text corruption)
          const fixedWordCount = generatedContent.narrative.split(/\s+/).length;
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
      // These are now handled via <internal_planning> in system prompt (Gemini 3 thinking handles internally).
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
        board: shouldGenerateBoard
          ? this._generateBoardData(isDecisionPoint, generatedContent.pathDecisions || generatedContent.decision)
          : null,
        narrativeThreads: Array.isArray(generatedContent.narrativeThreads) ? generatedContent.narrativeThreads : [],
        generatedAt: new Date().toISOString(),
        wordCount: generatedContent.narrative?.split(/\s+/).length || 0,
        // Thought signature for multi-chapter reasoning continuity (Gemini 3)
        // Persisted and passed to next chapter generation to maintain reasoning chain
        thoughtSignature: firstCallThoughtSignature || null,
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

  // Add timestamp for stale detection during pruning
  generationPromise._createdAt = Date.now();
  this.pendingGenerations.set(generationKey, generationPromise);

  // Create a timeout promise to prevent indefinite hangs
  // IMPORTANT: Must be longer than LLMService timeout (300s) * max retries (2)
  // to allow retries to complete. Adding buffer for network delays.
  // Formula: (300s * 2 attempts) + 60s buffer = 660s ≈ 11 minutes
  const GENERATION_TIMEOUT_MS = 11 * 60 * 1000; // 11 minutes (allows for 2 retries @ 300s each)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Generation timeout after ${GENERATION_TIMEOUT_MS / 1000}s for ${generationKey}`));
    }, GENERATION_TIMEOUT_MS);
  });

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
    // Always release the generation slot, even on error/fallback
    this._releaseGenerationSlot(generationKey);
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

export const generationMethods = {
  _generateDecisionStructure,
  _waitForGenerationSlot,
  _acquireGenerationSlot,
  _releaseGenerationSlot,
  generateSubchapter,
  generateChapter,
};
