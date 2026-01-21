/**
 * Story Generation Service - Advanced Version
 *
 * Handles dynamic story generation using LLM for chapters 2-12.
 * Implements advanced prompting techniques:
 * - RAG (Retrieval Augmented Generation) with story bible grounding
 * - Few-shot learning with example passages
 * - Smart context windowing for token efficiency
 * - Consistency verification and self-checking
 * - Structured output parsing with validation
 */

import { lifecycleMethods } from './storyGeneration/lifecycle';
import { tokenUsageMethods } from './storyGeneration/tokenUsage';
import { personalityMethods } from './storyGeneration/personality';
import { storyArcMethods } from './storyGeneration/storyArc';
import { decisionConsequenceMethods } from './storyGeneration/decisionConsequences';
import { contextMethods } from './storyGeneration/context';
import { promptAssemblyMethods } from './storyGeneration/promptAssembly';
import { threadMethods } from './storyGeneration/threads';
import { generationMethods } from './storyGeneration/generation';
import { validationMethods } from './storyGeneration/validation';

class StoryGenerationService {
  constructor() {
    this.generatedStory = null;
    this.storyContext = null;
    this.isGenerating = false;
    this.consistencyLog = []; // Track facts for consistency checking
    this.pendingGenerations = new Map(); // Cache for in-flight generation promises
    this.pathPersonality = null; // Tracks cumulative player behavior pattern
    this.decisionConsequences = new Map(); // Tracks ongoing effects of player choices
    this.characterStates = new Map(); // Tracks character relationship/trust states
    this.narrativeThreads = []; // Active story threads that must be maintained

    // ========== Token Usage Tracking ==========
    // Track cumulative token usage across session for cost visibility
    this.tokenUsage = {
      totalPromptTokens: 0,
      totalCachedTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      callCount: 0,
      sessionStart: Date.now(),
    };

    // ========== Dynamic Personality Classification ==========
    // LLM-based player personality analysis (cached by choice history hash)
    this.dynamicPersonalityCache = {
      choiceHistoryHash: null,
      personality: null,
      timestamp: null,
    };

    // ========== NEW: Story Arc Planning System ==========
    this.storyArc = null; // Global story arc generated at start for consistency
    this.chapterOutlines = new Map(); // Pre-generated chapter outlines for seamless flow
    this.indexedFacts = null; // Smart fact index by relevance
    this.consistencyCheckpoints = new Map(); // Periodic state validation snapshots
    this.generatedConsequences = new Map(); // Dynamically generated decision consequences

    // ========== Thread Escalation System ==========
    // Tracks how many times a thread has been acknowledged without progress
    // After 2+ acknowledgments, threads become OVERDUE and must be resolved/failed
    this.threadAcknowledgmentCounts = new Map(); // threadId -> acknowledgment count

    // ========== Thread Archive System ==========
    // Stores resolved/failed threads compactly to reduce memory while preserving callback potential
    // Threads are archived when resolved and pruned after 3 chapters of distance
    this.archivedThreads = []; // Compressed archive of resolved threads
    this.maxArchivedThreads = 50; // Cap on archived thread storage
    this.archiveChapterRetention = 3; // Keep archived threads for N chapters after resolution

    // ========== Generation Retry Tracking ==========
    this.generationAttempts = new Map(); // Track retry attempts per content
    this.maxGenerationAttempts = 3; // Max attempts before failing

    // ========== Generation Concurrency Limiter ==========
    // Sequential only - no concurrent LLM requests
    // Concurrent requests cause network issues on mobile (connections killed after ~4 min)
    // and React Native doesn't support streaming so heartbeats don't help
    this.maxConcurrentGenerations = 1; // Sequential LLM calls only
    this.activeGenerationCount = 0; // Current in-flight generations
    this.generationWaitQueue = []; // Queue of { resolve, reject, key } for waiting generations

    // ========== A+ QUALITY: Setup/Payoff Registry ==========
    this._initializeSetupPayoffRegistry();

    // ========== CONTEXT CACHING OPTIMIZATION ==========
    // Cache for static prompt content (Story Bible, Character Reference, etc.)
    this.staticCacheKey = null; // Key for the static content cache
    this.staticCacheVersion = 3; // Increment when static content changes

    // Cache for "chapter start" prefixes (static + story up to previous chapter).
    // This lets subchapters within a chapter send only the delta (current chapter so far).
    this.chapterStartCacheVersion = 2; // Increment when chapter cache format changes
    this.chapterStartCacheKeys = new Map(); // logicalKey -> cacheKey

    // ========== PROMPT LOGGING FOR DEBUGGING ==========
    // Stores cache content locally so we can log the complete prompt sent to LLM
    this.chapterStartCacheContent = new Map(); // cacheKey -> { systemInstruction, content }
    this.fullPromptLoggingEnabled = false; // Toggle full prompt logging
  }
}

Object.assign(
  StoryGenerationService.prototype,
  lifecycleMethods,
  tokenUsageMethods,
  personalityMethods,
  storyArcMethods,
  decisionConsequenceMethods,
  contextMethods,
  promptAssemblyMethods,
  threadMethods,
  generationMethods,
  validationMethods
);

// Singleton instance
export const storyGenerationService = new StoryGenerationService();
export default storyGenerationService;
