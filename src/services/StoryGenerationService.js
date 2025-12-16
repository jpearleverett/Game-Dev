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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { llmService } from './LLMService';
import {
  loadGeneratedStory,
  saveGeneratedChapter,
  getStoryContext,
  saveStoryContext,
} from '../storage/generatedStoryStorage';
import { getStoryEntry, formatCaseNumber } from '../data/storyContent';
import { CHARACTER_REFERENCE } from '../data/characterReference';
import {
  ABSOLUTE_FACTS,
  STORY_STRUCTURE,
  WRITING_STYLE,
  EXAMPLE_PASSAGES,
  CONSISTENCY_RULES,
  GENERATION_CONFIG,
} from '../data/storyBible';

// Note: STORY_STRUCTURE.chapterBeatTypes is now used for tempo variation

// Story configuration
const TOTAL_CHAPTERS = 12;
const SUBCHAPTERS_PER_CHAPTER = 3;
const MIN_WORDS_PER_SUBCHAPTER = GENERATION_CONFIG.wordCount.minimum; // 550
const TARGET_WORDS = GENERATION_CONFIG.wordCount.target; // 750
const DECISION_SUBCHAPTER = 3;
const MAX_RETRIES = GENERATION_CONFIG.qualitySettings?.maxRetries || 2;

// ============================================================================
// PATH PERSONALITY SYSTEM - Tracks cumulative player behavior for coherent narrative
// ============================================================================
const PATH_PERSONALITY_TRAITS = {
  // Maps choice patterns to narrative personality
  AGGRESSIVE: {
    keywords: ['confront', 'direct', 'immediate', 'force', 'demand', 'pressure'],
    narrativeStyle: 'Jack acts decisively, confronting obstacles head-on',
    dialogueTone: 'more direct and confrontational',
    riskTolerance: 'high',
  },
  METHODICAL: {
    keywords: ['investigate', 'gather', 'evidence', 'careful', 'plan', 'wait'],
    narrativeStyle: 'Jack proceeds cautiously, gathering information before acting',
    dialogueTone: 'more measured and analytical',
    riskTolerance: 'low',
  },
  BALANCED: {
    narrativeStyle: 'Jack balances intuition with evidence',
    dialogueTone: 'adapts to the situation',
    riskTolerance: 'moderate',
  },
};

// ============================================================================
// DECISION CONSEQUENCE REGISTRY - Tracks what each choice means for continuity
// ============================================================================
const DECISION_CONSEQUENCES = {
  // Chapter 1 decision consequences
  '001C': {
    A: {
      immediate: 'Jack chose to confront the situation directly',
      ongoing: ['More adversarial relationships', 'Faster revelation of threats', 'Higher personal risk'],
      characterImpact: { trust: -10, aggression: +15, thoroughness: -5 },
    },
    B: {
      immediate: 'Jack chose to gather more information first',
      ongoing: ['More careful approach', 'Slower but more complete understanding', 'Lower immediate risk'],
      characterImpact: { trust: +5, aggression: -5, thoroughness: +15 },
    },
  },
  // Additional chapter consequences will be generated dynamically
};

// ============================================================================
// JSON SCHEMAS FOR STRUCTURED OUTPUT
// These schemas force Gemini to return valid JSON, eliminating parse errors
// ============================================================================

/**
 * Schema for regular subchapters (no decision point)
 */
const STORY_CONTENT_SCHEMA = {
  type: 'object',
  properties: {
    beatSheet: {
      type: 'array',
      items: { type: 'string' },
      description: 'Ordered list of 3-5 major plot beats for this scene, planned BEFORE writing narrative.',
    },
    title: {
      type: 'string',
      description: 'Evocative chapter title, 2-5 words, noir style',
    },
    bridge: {
      type: 'string',
      description: 'One short, compelling sentence hook for this subchapter (max 15 words)',
    },
    previously: {
      type: 'string',
      description: 'A concise 1-2 sentence recap of the previous subchapter (max 40 words), written in past tense from Jack\'s perspective.',
    },
    narrative: {
      type: 'string',
      description: 'Full noir prose narrative from Jack Halloway first-person perspective, minimum 500 words',
    },
    chapterSummary: {
      type: 'string',
      description: 'A concise 2-3 sentence summary of the narrative you just wrote, to be used for memory in future chapters.',
    },
    puzzleCandidates: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of 6-8 distinct, evocative single words (nouns/verbs) directly from your narrative that would make good puzzle answers.',
    },
    briefing: {
      type: 'object',
      description: 'Mission briefing for the evidence board puzzle',
      properties: {
        summary: {
          type: 'string',
          description: 'One sentence objective for this subchapter, e.g., "Find the connection between the warehouse records and the missing witness."',
        },
        objectives: {
          type: 'array',
          items: { type: 'string' },
          description: '2-3 specific directives for the player, e.g., "Cross-reference the shipping manifests", "Identify the code words used"',
        },
      },
      required: ['summary', 'objectives'],
    },
    consistencyFacts: {
      type: 'array',
      items: { type: 'string' },
      description: '3-5 specific facts from this narrative that must remain consistent in future chapters',
    },
    narrativeThreads: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['appointment', 'revelation', 'investigation', 'relationship', 'physical_state', 'promise', 'threat'],
            description: 'Category of narrative thread'
          },
          description: {
            type: 'string',
            description: 'Brief description of the thread (e.g., "Jack agreed to meet Sarah at the docks at midnight")'
          },
          status: {
            type: 'string',
            enum: ['active', 'resolved', 'failed'],
            description: 'Whether this thread is still pending, was resolved, or failed'
          },
          characters: {
            type: 'array',
            items: { type: 'string' },
            description: 'Characters involved in this thread'
          }
        },
        required: ['type', 'description', 'status']
      },
      description: 'Active story threads from this narrative: promises made, meetings scheduled, investigations started, relationships changed, injuries sustained, threats issued. Include resolution status.'
    },
  },
  required: ['beatSheet', 'title', 'bridge', 'previously', 'narrative', 'chapterSummary', 'puzzleCandidates', 'briefing', 'consistencyFacts', 'narrativeThreads'],
};

/**
 * Schema for decision point subchapters (end of each chapter)
 */
const DECISION_CONTENT_SCHEMA = {
  type: 'object',
  properties: {
    beatSheet: {
      type: 'array',
      items: { type: 'string' },
      description: 'Ordered list of 3-5 major plot beats for this scene, planned BEFORE writing narrative.',
    },
    title: {
      type: 'string',
      description: 'Evocative chapter title, 2-5 words, noir style',
    },
    bridge: {
      type: 'string',
      description: 'One short, compelling sentence hook for this subchapter (max 15 words)',
    },
    previously: {
      type: 'string',
      description: 'A concise 1-2 sentence recap of the previous subchapter (max 40 words), written in past tense from Jack\'s perspective.',
    },
    narrative: {
      type: 'string',
      description: 'Full noir prose narrative from Jack Halloway first-person perspective, minimum 500 words, ending at a critical decision moment',
    },
    chapterSummary: {
      type: 'string',
      description: 'A concise 2-3 sentence summary of the narrative you just wrote, to be used for memory in future chapters.',
    },
    puzzleCandidates: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of 10-12 distinct, evocative single words (nouns/verbs) directly from your narrative that would make good puzzle answers.',
    },
    briefing: {
      type: 'object',
      description: 'Mission briefing for the evidence board puzzle',
      properties: {
        summary: {
          type: 'string',
          description: 'One sentence objective for this subchapter, e.g., "Uncover the truth behind the conflicting testimonies."',
        },
        objectives: {
          type: 'array',
          items: { type: 'string' },
          description: '2-3 specific directives for the player, e.g., "Identify both paths forward", "Weigh the evidence for each choice"',
        },
      },
      required: ['summary', 'objectives'],
    },
    consistencyFacts: {
      type: 'array',
      items: { type: 'string' },
      description: '3-5 specific facts from this narrative that must remain consistent in future chapters',
    },
    narrativeThreads: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['appointment', 'revelation', 'investigation', 'relationship', 'physical_state', 'promise', 'threat'],
            description: 'Category of narrative thread'
          },
          description: {
            type: 'string',
            description: 'Brief description of the thread (e.g., "Jack agreed to meet Sarah at the docks at midnight")'
          },
          status: {
            type: 'string',
            enum: ['active', 'resolved', 'failed'],
            description: 'Whether this thread is still pending, was resolved, or failed'
          },
          characters: {
            type: 'array',
            items: { type: 'string' },
            description: 'Characters involved in this thread'
          }
        },
        required: ['type', 'description', 'status']
      },
      description: 'Active story threads from this narrative: promises made, meetings scheduled, investigations started, relationships changed, injuries sustained, threats issued. Include resolution status.'
    },
    decision: {
      type: 'object',
      description: 'The binary choice presented to the player',
      properties: {
        intro: {
          type: 'string',
          description: '1-2 sentences framing the impossible choice Jack faces',
        },
        optionA: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Always "A"' },
            title: { type: 'string', description: 'Action statement in imperative mood, e.g., "Confront Wade directly"' },
            focus: { type: 'string', description: 'What this path prioritizes and what it risks' },
          },
          required: ['key', 'title', 'focus'],
        },
        optionB: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Always "B"' },
            title: { type: 'string', description: 'Action statement in imperative mood, e.g., "Gather more evidence first"' },
            focus: { type: 'string', description: 'What this path prioritizes and what it risks' },
          },
          required: ['key', 'title', 'focus'],
        },
      },
      required: ['intro', 'optionA', 'optionB'],
    },
  },
  required: ['beatSheet', 'title', 'bridge', 'previously', 'narrative', 'chapterSummary', 'puzzleCandidates', 'briefing', 'consistencyFacts', 'narrativeThreads', 'decision'],
};

// ============================================================================
// MASTER SYSTEM PROMPT - Core instructions for the LLM
// ============================================================================
const MASTER_SYSTEM_PROMPT = `You are writing "The Detective Portrait," an interactive noir detective story. You are the sole author responsible for maintaining perfect narrative consistency.

## YOUR ROLE
You continue the story of Jack Halloway, a retired detective confronting the wrongful convictions built on his career. The Midnight Confessor (Victoria Blackwell, formerly Emily Cross) orchestrates his "education" about the cost of certainty.

## CRITICAL CONSTRAINTS - NEVER VIOLATE THESE
1. You write ONLY from Jack Halloway's first-person perspective, present tense
2. You NEVER contradict established facts from previous chapters
3. You NEVER break character or acknowledge being an AI
4. You maintain EXACT consistency with names, dates, relationships, and events
5. **WORD COUNT IS NON-NEGOTIABLE:** You MUST write AT LEAST ${MIN_WORDS_PER_SUBCHAPTER} words, aiming for ${TARGET_WORDS}+

## WORD COUNT REQUIREMENTS - READ CAREFULLY
Your narrative field MUST contain ${TARGET_WORDS}+ words. This is critical for player immersion.

To achieve this word count naturally:
- Open with atmospheric scene-setting (50-100 words)
- Include Jack's internal monologue reflecting on recent events (100-150 words)
- Write meaningful dialogue exchanges, not just brief statements (150-200 words)
- Describe physical actions and sensory details throughout (100+ words)
- End with tension or cliffhanger appropriate to the scene (50-100 words)

DO NOT:
- Write a short narrative thinking you'll expand later - you won't get the chance
- Stop at the minimum - always aim for ${TARGET_WORDS}+ words
- Use filler - every sentence should advance character, plot, or atmosphere

## VOICE AND STYLE
Channel Raymond Chandler's hard-boiled prose:
- Metaphors grounded in rain, shadows, noir imagery
- Terse, punchy dialogue that reveals character
- World-weary internal monologue laced with self-deprecation
- Sensory details: sounds, smells, textures of the rain-soaked city
- Moral ambiguity without moralizing
- SHOW, DON'T TELL. Don't say "Jack felt angry"; describe his fist tightening.

## FORBIDDEN PATTERNS - THESE INSTANTLY BREAK IMMERSION
NEVER use:
- Em dashes (—). Use commas, periods, or semicolons
- "X is not just Y, it's Z" or similar constructions
- "In a world where..." or "Little did [anyone] know..."
- "I couldn't help but..." or "I found myself..."
- Excessive sentences starting with "And" or "But"
- Adverbs: "seemingly," "interestingly," "notably," "certainly"
- Words: "delve," "unravel," "tapestry," "myriad"
- Phrases: "a testament to," "serves as a reminder"
- Hedging: "It seems," "Perhaps," "Maybe," "It appears"
- Summarizing what just happened instead of showing the next scene

## OUTPUT REQUIREMENTS
Your response will be structured as JSON (enforced by schema). Focus on:
- "beatSheet": Plan your scene first with 3-5 plot beats.
- "title": Evocative 2-5 word noir chapter title
- "bridge": One short, compelling sentence hook (max 15 words)
- "previously": Concise 1-2 sentence recap of what just happened (max 40 words, from Jack's perspective, past tense)
- "narrative": Your full prose (**MINIMUM ${MIN_WORDS_PER_SUBCHAPTER} words, TARGET ${TARGET_WORDS}+ words** - this is enforced)
- "chapterSummary": Summarize the events of THIS narrative for future memory (2-3 sentences)
- "puzzleCandidates": Extract 6-12 single words (nouns/verbs) from YOUR narrative that are best for a word puzzle
- "briefing": Mission briefing with "summary" (one sentence objective) and "objectives" (2-3 specific directives)
- "consistencyFacts": Array of 3-5 specific facts that must remain consistent in future chapters
- "narrativeThreads": Array of active story threads from YOUR narrative. Include:
  * type: "appointment" | "revelation" | "investigation" | "relationship" | "physical_state" | "promise" | "threat"
  * description: What happened (e.g., "Jack agreed to meet Sarah at the docks at midnight")
  * status: "active" (ongoing), "resolved" (completed this chapter), or "failed" (abandoned/prevented)
  * characters: Array of character names involved
  IMPORTANT: Only extract ACTUAL threads from your narrative. Do not invent threads that aren't in the story.
  Examples: "Sarah promised to bring the files tomorrow" (appointment), "Jack discovered Tom's signature on the forged documents" (revelation)
- "decision": (Only for decision points) The binary choice with intro, optionA, and optionB`;

// ============================================================================
// FEW-SHOT EXAMPLES FOR STYLE GROUNDING
// ============================================================================
const STYLE_EXAMPLES = `
## EXAMPLE: ATMOSPHERIC OPENING (EXCELLENT)
"${EXAMPLE_PASSAGES.atmosphericOpening}"

## EXAMPLE: DIALOGUE (EXCELLENT)
"${EXAMPLE_PASSAGES.dialogueExample}"

## EXAMPLE: INTERNAL MONOLOGUE (EXCELLENT)
"${EXAMPLE_PASSAGES.internalMonologue}"

## EXAMPLE: TENSE MOMENT (EXCELLENT)
"${EXAMPLE_PASSAGES.tenseMoment}"

---
Study these examples. Match their rhythm, tone, and prose quality. Your writing should feel like it belongs in the same novel.
`;

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

    // ========== NEW: Story Arc Planning System ==========
    this.storyArc = null; // Global story arc generated at start for consistency
    this.chapterOutlines = new Map(); // Pre-generated chapter outlines for seamless flow
    this.indexedFacts = null; // Smart fact index by relevance
    this.consistencyCheckpoints = new Map(); // Periodic state validation snapshots
    this.generatedConsequences = new Map(); // Dynamically generated decision consequences
  }

  // ==========================================================================
  // STORY ARC PLANNING - Generates high-level outline for 100% consistency
  // ==========================================================================

  /**
   * Generate or retrieve the story arc - called once at the start of dynamic generation
   * This ensures ALL 12 chapters follow a coherent narrative thread regardless of player choices
   */
  async ensureStoryArc(pathKey, choiceHistory = []) {
    const arcKey = `arc_${pathKey}_${choiceHistory.length}`;

    // Check if we already have a valid arc
    if (this.storyArc && this.storyArc.key === arcKey) {
      return this.storyArc;
    }

    // Check persistent storage
    const savedArc = await this._loadStoryArc(arcKey);
    if (savedArc) {
      this.storyArc = savedArc;
      return savedArc;
    }

    // Generate new arc
    console.log('[StoryGenerationService] Generating story arc for path:', pathKey);
    const arc = await this._generateStoryArc(pathKey, choiceHistory);
    this.storyArc = arc;
    await this._saveStoryArc(arcKey, arc);

    return arc;
  }

  /**
   * Generate the master story arc that guides all chapter generation
   */
  async _generateStoryArc(pathKey, choiceHistory) {
    const personality = this._analyzePathPersonality(choiceHistory);

    const arcPrompt = `You are the story architect for "The Detective Portrait," a 12-chapter noir detective mystery.

## STORY PREMISE
Jack Halloway, a retired detective, discovers his career was built on manufactured evidence. The Midnight Confessor (Victoria Blackwell, secretly Emily Cross) forces him to confront each wrongful conviction.

## PLAYER PATH: "${pathKey}"
Player personality: ${personality.narrativeStyle}
Risk tolerance: ${personality.riskTolerance}

## YOUR TASK
Create a high-level story arc outline for Chapters 2-12 that:
1. Maintains PERFECT narrative consistency across all chapters
2. Builds appropriate tension per story phase
3. Ensures each chapter has a clear purpose advancing the mystery
4. Creates meaningful decision points that reflect player personality
5. Weaves all 5 innocents' stories together naturally

## STORY PHASES
- Chapters 2-4: RISING ACTION (investigating, uncovering clues)
- Chapters 5-7: COMPLICATIONS (betrayals revealed, stakes escalate)
- Chapters 8-10: CONFRONTATIONS (major revelations, direct confrontations)
- Chapters 11-12: RESOLUTION (final confrontation, consequences manifest)

## FIVE INNOCENTS TO WEAVE IN
1. Eleanor Bellamy - wrongly convicted of husband's murder (8 years in Greystone)
2. Marcus Thornhill - framed for embezzlement (committed suicide)
3. Dr. Lisa Chen - reported evidence tampering (career destroyed)
4. James Sullivan - details revealed progressively
5. Teresa Wade - Tom Wade's own daughter (convicted using his methods)

Provide a structured arc ensuring each innocent's story gets proper attention.`;

    const arcSchema = {
      type: 'object',
      properties: {
        overallTheme: {
          type: 'string',
          description: 'The central thematic throughline for this playthrough',
        },
        chapterArcs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              chapter: { type: 'number' },
              phase: { type: 'string' },
              primaryFocus: { type: 'string', description: 'Main narrative focus for this chapter' },
              innocentFeatured: { type: 'string', description: 'Which innocent is featured (if any)' },
              keyRevelation: { type: 'string', description: 'What major truth is revealed' },
              tensionLevel: { type: 'number', description: '1-10 tension scale' },
              endingHook: { type: 'string', description: 'How this chapter should end to hook into the next' },
              decisionTheme: { type: 'string', description: 'What kind of choice the player faces' },
            },
            required: ['chapter', 'phase', 'primaryFocus', 'tensionLevel', 'endingHook'],
          },
        },
        characterArcs: {
          type: 'object',
          properties: {
            jack: { type: 'string', description: 'Jack\'s emotional journey across chapters' },
            victoria: { type: 'string', description: 'How Victoria\'s presence evolves' },
            sarah: { type: 'string', description: 'Sarah Reeves\' arc' },
            tomWade: { type: 'string', description: 'Tom Wade\'s betrayal arc' },
          },
        },
        consistencyAnchors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key facts that MUST remain consistent across all chapters',
        },
      },
      required: ['overallTheme', 'chapterArcs', 'characterArcs', 'consistencyAnchors'],
    };

    const response = await llmService.complete(
      [{ role: 'user', content: arcPrompt }],
      {
        systemPrompt: 'You are a master story architect ensuring narrative coherence across a 12-chapter interactive noir mystery.',
        temperature: 0.6, // Lower temperature for planning consistency
        maxTokens: 4000,
        responseSchema: arcSchema,
      }
    );

    const arc = typeof response.content === 'string'
      ? JSON.parse(response.content)
      : response.content;

    return {
      key: `arc_${pathKey}_${choiceHistory.length}`,
      pathKey,
      ...arc,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate a chapter outline before generating individual subchapters
   * This ensures A, B, C subchapters flow seamlessly as one coherent chapter
   */
  async ensureChapterOutline(chapter, pathKey, choiceHistory = []) {
    const outlineKey = `outline_${chapter}_${pathKey}`;

    // Check if we already have this outline
    if (this.chapterOutlines.has(outlineKey)) {
      return this.chapterOutlines.get(outlineKey);
    }

    // Ensure we have the story arc first
    await this.ensureStoryArc(pathKey, choiceHistory);

    const outline = await this._generateChapterOutline(chapter, pathKey, choiceHistory);
    this.chapterOutlines.set(outlineKey, outline);

    return outline;
  }

  /**
   * Generate detailed outline for a single chapter
   */
  async _generateChapterOutline(chapter, pathKey, choiceHistory) {
    const chapterArc = this.storyArc?.chapterArcs?.find(c => c.chapter === chapter);
    const previousOutlines = [];

    // Gather previous chapter outlines for continuity
    for (let i = 2; i < chapter; i++) {
      const prevKey = `outline_${i}_${this._getPathKeyForChapter(i, choiceHistory)}`;
      if (this.chapterOutlines.has(prevKey)) {
        previousOutlines.push(this.chapterOutlines.get(prevKey));
      }
    }

    const outlinePrompt = `Generate a detailed outline for Chapter ${chapter} of "The Detective Portrait."

## STORY ARC GUIDANCE
${chapterArc ? `
- Phase: ${chapterArc.phase}
- Primary Focus: ${chapterArc.primaryFocus}
- Featured Innocent: ${chapterArc.innocentFeatured || 'None specifically'}
- Key Revelation: ${chapterArc.keyRevelation || 'Building tension'}
- Tension Level: ${chapterArc.tensionLevel}/10
- Ending Hook: ${chapterArc.endingHook}
- Decision Theme: ${chapterArc.decisionTheme || 'Moral complexity'}
` : `Chapter ${chapter} - Continue building the mystery`}

## PREVIOUS CHAPTERS SUMMARY
${previousOutlines.map(o => `Chapter ${o.chapter}: ${o.summary}`).join('\n') || 'Starting fresh from Chapter 1'}

## REQUIREMENTS
Create a 3-part outline (Subchapters A, B, C) that:
1. Flows seamlessly as ONE coherent chapter experience
2. Subchapter A: Opens with atmosphere, establishes chapter's focus
3. Subchapter B: Develops the investigation/revelation
4. Subchapter C: Builds to decision point with genuine moral complexity

Each subchapter should feel like a natural continuation, not a separate scene.`;

    const outlineSchema = {
      type: 'object',
      properties: {
        chapter: { type: 'number' },
        summary: { type: 'string', description: 'One sentence summary of the entire chapter' },
        openingMood: { type: 'string', description: 'Atmospheric tone for chapter opening' },
        subchapterA: {
          type: 'object',
          properties: {
            focus: { type: 'string' },
            keyBeats: { type: 'array', items: { type: 'string' } },
            endingTransition: { type: 'string', description: 'How A flows into B' },
          },
          required: ['focus', 'keyBeats', 'endingTransition'],
        },
        subchapterB: {
          type: 'object',
          properties: {
            focus: { type: 'string' },
            keyBeats: { type: 'array', items: { type: 'string' } },
            endingTransition: { type: 'string', description: 'How B flows into C' },
          },
          required: ['focus', 'keyBeats', 'endingTransition'],
        },
        subchapterC: {
          type: 'object',
          properties: {
            focus: { type: 'string' },
            keyBeats: { type: 'array', items: { type: 'string' } },
            decisionSetup: { type: 'string', description: 'How the narrative builds to the choice' },
            optionADirection: { type: 'string', description: 'What Option A represents' },
            optionBDirection: { type: 'string', description: 'What Option B represents' },
          },
          required: ['focus', 'keyBeats', 'decisionSetup', 'optionADirection', 'optionBDirection'],
        },
        narrativeThreads: {
          type: 'array',
          items: { type: 'string' },
          description: 'Threads to weave through all three subchapters',
        },
        consistencyRequirements: {
          type: 'array',
          items: { type: 'string' },
          description: 'Facts that must be maintained across this chapter',
        },
      },
      required: ['chapter', 'summary', 'subchapterA', 'subchapterB', 'subchapterC'],
    };

    const response = await llmService.complete(
      [{ role: 'user', content: outlinePrompt }],
      {
        systemPrompt: 'You are outlining a single chapter of an interactive noir mystery. Ensure the three subchapters flow as one seamless narrative.',
        temperature: 0.65,
        maxTokens: 2000,
        responseSchema: outlineSchema,
      }
    );

    const outline = typeof response.content === 'string'
      ? JSON.parse(response.content)
      : response.content;

    return {
      ...outline,
      pathKey,
      generatedAt: new Date().toISOString(),
    };
  }

  async _loadStoryArc(arcKey) {
    try {
      const data = await AsyncStorage.getItem(`story_arc_${arcKey}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async _saveStoryArc(arcKey, arc) {
    try {
      await AsyncStorage.setItem(`story_arc_${arcKey}`, JSON.stringify(arc));
    } catch (error) {
      console.warn('[StoryGenerationService] Failed to save story arc:', error);
    }
  }

  // ==========================================================================
  // DYNAMIC CONSEQUENCE GENERATION - Auto-generates consequences for all decisions
  // ==========================================================================

  /**
   * Ensure we have consequences generated for all player decisions
   * This fills in gaps in the static DECISION_CONSEQUENCES registry
   */
  async _ensureDecisionConsequences(choiceHistory) {
    for (const choice of choiceHistory) {
      const consequenceKey = `${choice.caseNumber}_${choice.optionKey}`;

      // Skip if we already have this consequence (static or generated)
      if (DECISION_CONSEQUENCES[choice.caseNumber]?.[choice.optionKey]) {
        continue;
      }
      if (this.generatedConsequences.has(consequenceKey)) {
        continue;
      }

      // Generate consequences for this decision
      const consequence = await this._generateDecisionConsequence(choice);
      this.generatedConsequences.set(consequenceKey, consequence);

      // Also store in the registry for future use
      if (!DECISION_CONSEQUENCES[choice.caseNumber]) {
        DECISION_CONSEQUENCES[choice.caseNumber] = {};
      }
      DECISION_CONSEQUENCES[choice.caseNumber][choice.optionKey] = consequence;
    }
  }

  /**
   * Generate consequences for a single decision
   */
  async _generateDecisionConsequence(choice) {
    const chapter = this._extractChapterFromCase(choice.caseNumber);

    // Try to get context from the decision itself if available
    const decisionEntry = this.getGeneratedEntry(choice.caseNumber, this._getPathKeyForChapter(chapter, []));
    const decisionContext = decisionEntry?.decision?.options?.find(o => o.key === choice.optionKey);

    const consequencePrompt = `Generate narrative consequences for a player decision in a noir detective story.

## DECISION CONTEXT
- Chapter: ${chapter}
- Player chose: Option ${choice.optionKey}
${decisionContext ? `- Option title: "${decisionContext.title}"
- Option focus: "${decisionContext.focus}"` : '- Details not available'}

## REQUIRED OUTPUT
Generate realistic consequences that will affect future chapters.`;

    const consequenceSchema = {
      type: 'object',
      properties: {
        immediate: {
          type: 'string',
          description: 'One sentence describing what Jack did',
        },
        ongoing: {
          type: 'array',
          items: { type: 'string' },
          description: '2-4 ongoing effects that will ripple through future chapters',
        },
        characterImpact: {
          type: 'object',
          properties: {
            trust: { type: 'number', description: 'Change to trust relationships (-20 to +20)' },
            aggression: { type: 'number', description: 'Change to aggression level (-20 to +20)' },
            thoroughness: { type: 'number', description: 'Change to investigation thoroughness (-20 to +20)' },
          },
        },
      },
      required: ['immediate', 'ongoing', 'characterImpact'],
    };

    try {
      const response = await llmService.complete(
        [{ role: 'user', content: consequencePrompt }],
        {
          systemPrompt: 'You are generating narrative consequences for player choices in a noir detective mystery.',
          temperature: 0.6,
          maxTokens: 500,
          responseSchema: consequenceSchema,
        }
      );

      const consequence = typeof response.content === 'string'
        ? JSON.parse(response.content)
        : response.content;

      return consequence;
    } catch (error) {
      console.warn('[StoryGenerationService] Failed to generate consequence:', error);
      // Return default consequence
      return {
        immediate: `Jack chose path ${choice.optionKey}`,
        ongoing: ['This choice will affect future events'],
        characterImpact: { trust: 0, aggression: choice.optionKey === 'A' ? 5 : -5, thoroughness: choice.optionKey === 'B' ? 5 : -5 },
      };
    }
  }

  // ==========================================================================
  // SMART FACT INDEXING - Indexes facts by relevance for efficient context building
  // ==========================================================================

  /**
   * Build indexed facts from generated content for efficient retrieval
   */
  _buildIndexedFacts(chapters) {
    const index = {
      byCharacter: new Map(),      // Facts mentioning specific characters
      byChapter: new Map(),        // Facts from specific chapters
      byType: new Map(),           // Facts by type (timeline, setting, relationship, etc.)
      critical: [],                // Always-include critical facts
      recent: [],                  // Most recent facts (high priority)
    };

    // Add base consistency rules as critical
    index.critical.push(...CONSISTENCY_RULES.slice(0, 15));

    // Index facts from chapters
    chapters.forEach(ch => {
      if (!ch.consistencyFacts) return;

      ch.consistencyFacts.forEach(fact => {
        // Index by chapter
        if (!index.byChapter.has(ch.chapter)) {
          index.byChapter.set(ch.chapter, []);
        }
        index.byChapter.get(ch.chapter).push(fact);

        // Index by character mentioned
        const characters = ['Jack', 'Victoria', 'Sarah', 'Eleanor', 'Silas', 'Tom', 'Wade', 'Grange', 'Thornhill', 'Chen', 'Sullivan', 'Teresa'];
        characters.forEach(char => {
          if (fact.toLowerCase().includes(char.toLowerCase())) {
            if (!index.byCharacter.has(char)) {
              index.byCharacter.set(char, []);
            }
            index.byCharacter.get(char).push(fact);
          }
        });

        // Index by type
        if (/\d+\s*(year|month|day|hour)/i.test(fact)) {
          if (!index.byType.has('timeline')) index.byType.set('timeline', []);
          index.byType.get('timeline').push(fact);
        }
        if (/meet|promise|agree|plan/i.test(fact)) {
          if (!index.byType.has('appointment')) index.byType.set('appointment', []);
          index.byType.get('appointment').push(fact);
        }
        if (/reveal|discover|learn|find out/i.test(fact)) {
          if (!index.byType.has('revelation')) index.byType.set('revelation', []);
          index.byType.get('revelation').push(fact);
        }
      });
    });

    // Track recent facts (last 2 chapters)
    const sortedChapters = [...chapters].sort((a, b) => {
      if (a.chapter !== b.chapter) return b.chapter - a.chapter;
      return b.subchapter - a.subchapter;
    });
    sortedChapters.slice(0, 6).forEach(ch => {
      if (ch.consistencyFacts) {
        index.recent.push(...ch.consistencyFacts);
      }
    });

    return index;
  }

  /**
   * Get relevant facts for a specific chapter/subchapter
   * Uses smart selection instead of dumping all facts
   */
  _getRelevantFacts(targetChapter, targetSubchapter, indexedFacts, context) {
    const relevantFacts = new Set();

    // Always include critical facts
    indexedFacts.critical.forEach(f => relevantFacts.add(f));

    // Include recent facts (high priority)
    indexedFacts.recent.slice(0, 10).forEach(f => relevantFacts.add(f));

    // Include facts from previous chapter (continuity)
    const prevChapterFacts = indexedFacts.byChapter.get(targetChapter - 1) || [];
    prevChapterFacts.forEach(f => relevantFacts.add(f));

    // Include facts from current chapter's previous subchapters
    if (targetSubchapter > 1) {
      const currChapterFacts = indexedFacts.byChapter.get(targetChapter) || [];
      currChapterFacts.forEach(f => relevantFacts.add(f));
    }

    // Include character-specific facts based on story arc
    const chapterArc = context.storyArc?.chapterArcs?.find(c => c.chapter === targetChapter);
    if (chapterArc?.innocentFeatured) {
      const characterFacts = indexedFacts.byCharacter.get(chapterArc.innocentFeatured) || [];
      characterFacts.forEach(f => relevantFacts.add(f));
    }

    // Include appointment/promise facts (must be tracked)
    const appointmentFacts = indexedFacts.byType.get('appointment') || [];
    appointmentFacts.slice(-5).forEach(f => relevantFacts.add(f));

    return [...relevantFacts].slice(0, 25); // Cap at 25 facts to manage token usage
  }

  // ==========================================================================
  // CONSISTENCY CHECKPOINTS - Periodic validation of accumulated state
  // ==========================================================================

  /**
   * Create a consistency checkpoint after generation
   */
  async _createConsistencyCheckpoint(chapter, pathKey, storyEntry) {
    const checkpointKey = `checkpoint_${chapter}_${pathKey}`;

    const checkpoint = {
      chapter,
      pathKey,
      timestamp: new Date().toISOString(),
      accumulatedFacts: [],
      characterStates: {},
      narrativeThreads: [],
      decisionHistory: [],
    };

    // Gather all facts from this and previous chapters
    for (let ch = 2; ch <= chapter; ch++) {
      for (let sub = 1; sub <= 3; sub++) {
        const caseNum = formatCaseNumber(ch, sub);
        const chPathKey = ch === chapter ? pathKey : this._getPathKeyForChapter(ch, []);
        const entry = this.getGeneratedEntry(caseNum, chPathKey);
        if (entry?.consistencyFacts) {
          checkpoint.accumulatedFacts.push(...entry.consistencyFacts);
        }
      }
    }

    // Deduplicate facts
    checkpoint.accumulatedFacts = [...new Set(checkpoint.accumulatedFacts)];

    // Track character relationship states based on path personality
    if (this.pathPersonality) {
      checkpoint.characterStates = {
        jackPersonality: this.pathPersonality.narrativeStyle,
        riskTolerance: this.pathPersonality.riskTolerance,
        scores: this.pathPersonality.scores,
      };
    }

    this.consistencyCheckpoints.set(checkpointKey, checkpoint);

    // Validate checkpoint for anomalies every 3 chapters
    if (chapter % 3 === 0) {
      await this._validateCheckpoint(checkpoint);
    }

    return checkpoint;
  }

  /**
   * Validate a consistency checkpoint for anomalies
   */
  async _validateCheckpoint(checkpoint) {
    const issues = [];

    // Check for contradictory facts
    const factText = checkpoint.accumulatedFacts.join(' ').toLowerCase();

    // Timeline contradictions
    if (factText.includes('20 years') && factText.includes('tom wade') && factText.includes('friend')) {
      if (!factText.includes('30 years')) {
        issues.push('Timeline contradiction: Tom Wade friendship should be 30 years');
      }
    }

    // Character state contradictions
    if (checkpoint.characterStates.jackPersonality) {
      const isMethodical = checkpoint.characterStates.riskTolerance === 'low';
      const hasRecklessAction = /jack\s+(charged|rushed|stormed)/i.test(factText);
      if (isMethodical && hasRecklessAction) {
        issues.push('Character behavior contradiction: Methodical Jack acting recklessly');
      }
    }

    if (issues.length > 0) {
      console.warn('[StoryGenerationService] Checkpoint validation issues:', issues);
      // Store issues for potential auto-correction in future generations
      checkpoint.validationIssues = issues;
    }

    return issues;
  }

  // ==========================================================================
  // PATH PERSONALITY ANALYSIS - Ensures narrative coherence across player choices
  // ==========================================================================

  /**
   * Analyze player's choice history to determine their "path personality"
   * This ensures Jack's behavior remains consistent with player's decision patterns
   */
  _analyzePathPersonality(choiceHistory) {
    if (!choiceHistory || choiceHistory.length === 0) {
      return PATH_PERSONALITY_TRAITS.BALANCED;
    }

    let aggressiveScore = 0;
    let methodicalScore = 0;

    // Analyze each choice and weight recent choices more heavily
    choiceHistory.forEach((choice, index) => {
      const weight = 1 + (index / choiceHistory.length); // Recent choices weighted more
      const consequence = DECISION_CONSEQUENCES[choice.caseNumber]?.[choice.optionKey];

      if (consequence?.characterImpact) {
        aggressiveScore += (consequence.characterImpact.aggression || 0) * weight;
        methodicalScore += (consequence.characterImpact.thoroughness || 0) * weight;
      } else {
        // Default scoring based on option key patterns
        if (choice.optionKey === 'A') {
          aggressiveScore += 5 * weight;
        } else {
          methodicalScore += 5 * weight;
        }
      }
    });

    // Determine dominant personality
    const diff = aggressiveScore - methodicalScore;
    if (diff > 15) {
      return { ...PATH_PERSONALITY_TRAITS.AGGRESSIVE, scores: { aggressive: aggressiveScore, methodical: methodicalScore } };
    } else if (diff < -15) {
      return { ...PATH_PERSONALITY_TRAITS.METHODICAL, scores: { aggressive: aggressiveScore, methodical: methodicalScore } };
    }
    return { ...PATH_PERSONALITY_TRAITS.BALANCED, scores: { aggressive: aggressiveScore, methodical: methodicalScore } };
  }

  /**
   * Build cumulative decision consequences for context
   */
  _buildDecisionConsequences(choiceHistory) {
    const consequences = {
      immediate: [],
      ongoing: [],
      characterImpacts: { trust: 0, aggression: 0, thoroughness: 0 },
    };

    if (!choiceHistory) return consequences;

    choiceHistory.forEach(choice => {
      const conseq = DECISION_CONSEQUENCES[choice.caseNumber]?.[choice.optionKey];
      if (conseq) {
        consequences.immediate.push(`Chapter ${this._extractChapterFromCase(choice.caseNumber)}: ${conseq.immediate}`);
        consequences.ongoing.push(...conseq.ongoing);
        if (conseq.characterImpact) {
          Object.keys(conseq.characterImpact).forEach(key => {
            consequences.characterImpacts[key] += conseq.characterImpact[key];
          });
        }
      }
    });

    return consequences;
  }

  /**
   * Extract and track narrative threads that must be maintained
   * Uses LLM-generated threads when available, with regex fallback for legacy content
   */
  _extractNarrativeThreads(chapters) {
    const threads = [];
    const seenDescriptions = new Set(); // Prevent duplicate threads

    // First priority: Use LLM-generated structured threads
    chapters.forEach(ch => {
      if (ch.narrativeThreads && Array.isArray(ch.narrativeThreads)) {
        ch.narrativeThreads.forEach(thread => {
          // Only include active threads (not resolved or failed)
          if (thread.status === 'active') {
            const key = `${thread.type}:${thread.description}`.toLowerCase();
            if (!seenDescriptions.has(key)) {
              seenDescriptions.add(key);
              threads.push({
                type: thread.type,
                chapter: ch.chapter,
                subchapter: ch.subchapter,
                description: thread.description,
                characters: thread.characters || [],
                status: thread.status,
                source: 'llm', // Track that this came from structured output
              });
            }
          }
        });
      }
    });

    // Fallback: Regex extraction for chapters without LLM threads (legacy content)
    const threadPatterns = [
      { pattern: /agreed to meet|promised to|will (meet|call|contact)/i, type: 'appointment' },
      { pattern: /discovered|revealed|learned that/i, type: 'revelation' },
      { pattern: /suspects?|investigating|following/i, type: 'investigation' },
      { pattern: /trust|betray|alliance|enemy/i, type: 'relationship' },
      { pattern: /wounded|injured|hurt|sick/i, type: 'physical_state' },
      { pattern: /swore|vowed|will make.*pay|threatened/i, type: 'threat' },
      { pattern: /promised|gave.*word|committed to/i, type: 'promise' },
    ];

    chapters.forEach(ch => {
      // Skip if we already have LLM threads for this chapter
      if (ch.narrativeThreads && ch.narrativeThreads.length > 0) return;
      if (!ch.narrative) return;

      threadPatterns.forEach(({ pattern, type }) => {
        const matches = ch.narrative.match(new RegExp(`.{0,50}${pattern.source}.{0,50}`, 'gi'));
        if (matches) {
          matches.forEach(match => {
            const excerpt = match.trim();
            const key = `${type}:${excerpt}`.toLowerCase();
            if (!seenDescriptions.has(key)) {
              seenDescriptions.add(key);
              threads.push({
                type,
                chapter: ch.chapter,
                subchapter: ch.subchapter,
                description: excerpt,
                excerpt, // Keep for backwards compatibility
                source: 'regex', // Track that this came from regex fallback
              });
            }
          });
        }
      });
    });

    // Sort by chapter/subchapter and keep most recent threads (last 20)
    threads.sort((a, b) => {
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.subchapter - b.subchapter;
    });

    return threads.slice(-20);
  }

  /**
   * Get a formatted summary of active narrative threads for the LLM context
   */
  _formatNarrativeThreadsForContext(threads) {
    if (!threads || threads.length === 0) {
      return 'No active narrative threads to maintain.';
    }

    const groupedByType = {};
    threads.forEach(thread => {
      if (!groupedByType[thread.type]) {
        groupedByType[thread.type] = [];
      }
      groupedByType[thread.type].push(thread);
    });

    const lines = ['## ACTIVE NARRATIVE THREADS (must be addressed or acknowledged)'];

    const typeLabels = {
      appointment: 'SCHEDULED MEETINGS/APPOINTMENTS',
      revelation: 'RECENT DISCOVERIES',
      investigation: 'ONGOING INVESTIGATIONS',
      relationship: 'RELATIONSHIP CHANGES',
      physical_state: 'PHYSICAL CONDITIONS',
      promise: 'PROMISES MADE',
      threat: 'THREATS/WARNINGS',
    };

    for (const [type, typeThreads] of Object.entries(groupedByType)) {
      lines.push(`\n### ${typeLabels[type] || type.toUpperCase()}`);
      typeThreads.forEach(t => {
        const chapterInfo = `(Ch ${t.chapter}.${t.subchapter})`;
        const chars = t.characters?.length > 0 ? ` [${t.characters.join(', ')}]` : '';
        lines.push(`- ${t.description}${chars} ${chapterInfo}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Initialize the service and load any previously generated content
   */
  async init() {
    this.generatedStory = await loadGeneratedStory();
    this.storyContext = await getStoryContext();
    return this;
  }

  /**
   * Check if a specific chapter/subchapter needs generation
   */
  needsGeneration(chapter, subchapter, pathKey) {
    if (chapter <= 1) return false;
    const caseNumber = formatCaseNumber(chapter, subchapter);
    const key = `${caseNumber}_${pathKey}`;
    return !this.generatedStory?.chapters?.[key];
  }

  /**
   * Get generated story entry (or null if not generated)
   */
  getGeneratedEntry(caseNumber, pathKey) {
    if (!this.generatedStory?.chapters) return null;
    const key = `${caseNumber}_${pathKey}`;
    return this.generatedStory.chapters[key] || null;
  }

  // ==========================================================================
  // CONTEXT BUILDING - Smart summarization for token efficiency
  // ==========================================================================

  /**
   * Build comprehensive story context with intelligent windowing
   * Recent chapters get full text, older chapters get compressed summaries
   * Now includes path personality, decision consequences, and narrative threads
   */
  async buildStoryContext(targetChapter, targetSubchapter, pathKey, choiceHistory = []) {
    // Analyze player's path personality for narrative consistency
    const pathPersonality = this._analyzePathPersonality(choiceHistory);
    this.pathPersonality = pathPersonality;

    // Build cumulative decision consequences
    const decisionConsequences = this._buildDecisionConsequences(choiceHistory);

    const context = {
      foundation: this._buildFoundationContext(),
      previousChapters: [],
      playerChoices: [],
      currentPosition: {
        chapter: targetChapter,
        subchapter: targetSubchapter,
        pathKey,
      },
      establishedFacts: [], // Track facts that must remain consistent
      pathPersonality, // Player's cumulative decision pattern
      decisionConsequences, // Ongoing effects of choices
      narrativeThreads: [], // Active story threads to maintain
    };

    // Add Chapter 1 content (static)
    for (let sub = 1; sub <= SUBCHAPTERS_PER_CHAPTER; sub++) {
      const caseNum = formatCaseNumber(1, sub);
      const entry = getStoryEntry(caseNum, 'ROOT');
      if (entry?.narrative) {
        context.previousChapters.push({
          chapter: 1,
          subchapter: sub,
          pathKey: 'ROOT',
          title: entry.title || `Chapter 1.${sub}`,
          narrative: entry.narrative,
          decision: entry.decision || null,
          chapterSummary: null, // Static chapters don't have generated summaries
          isRecent: targetChapter <= 3, // Chapter 1 is "recent" for early chapters
        });
      }
    }

    // Add generated chapters 2 onwards with smart windowing
    for (let ch = 2; ch < targetChapter; ch++) {
      const chapterPathKey = this._getPathKeyForChapter(ch, choiceHistory);
      for (let sub = 1; sub <= SUBCHAPTERS_PER_CHAPTER; sub++) {
        const caseNum = formatCaseNumber(ch, sub);
        const entry = this.getGeneratedEntry(caseNum, chapterPathKey);
        if (entry?.narrative) {
          // Recent chapters (within 2) get full text
          // Older chapters get compressed
          const isRecent = ch >= targetChapter - 2;
          context.previousChapters.push({
            chapter: ch,
            subchapter: sub,
            pathKey: chapterPathKey,
            title: entry.title || `Chapter ${ch}.${sub}`,
            narrative: entry.narrative,
            chapterSummary: entry.chapterSummary || null, // Use generated summary if available
            decision: entry.decision || null,
            isRecent,
          });
        }
      }
    }

    // Add current chapter's previous subchapters (always full detail)
    if (targetSubchapter > 1) {
      for (let sub = 1; sub < targetSubchapter; sub++) {
        const caseNum = formatCaseNumber(targetChapter, sub);
        const entry = this.getGeneratedEntry(caseNum, pathKey);
        if (entry?.narrative) {
          context.previousChapters.push({
            chapter: targetChapter,
            subchapter: sub,
            pathKey,
            title: entry.title || `Chapter ${targetChapter}.${sub}`,
            narrative: entry.narrative,
            chapterSummary: entry.chapterSummary || null,
            decision: entry.decision || null,
            isRecent: true, // Current chapter always recent
          });
        }
      }
    }

    // Add choice history
    context.playerChoices = choiceHistory.map(choice => ({
      chapter: this._extractChapterFromCase(choice.caseNumber),
      optionKey: choice.optionKey,
      timestamp: choice.timestamp,
    }));

    // Extract established facts from generated content
    context.establishedFacts = this._extractEstablishedFacts(context.previousChapters);

    // Extract active narrative threads that must be maintained
    context.narrativeThreads = this._extractNarrativeThreads(context.previousChapters);

    return context;
  }

  /**
   * Build foundation context from story bible
   */
  _buildFoundationContext() {
    return {
      protagonist: ABSOLUTE_FACTS.protagonist,
      antagonist: ABSOLUTE_FACTS.antagonist,
      setting: ABSOLUTE_FACTS.setting,
      fiveInnocents: ABSOLUTE_FACTS.fiveInnocents,
      corruptOfficials: ABSOLUTE_FACTS.corruptOfficials,
      supportingCharacters: ABSOLUTE_FACTS.supportingCharacters,
    };
  }

  /**
   * Extract key facts from previous chapters for consistency
   */
  _extractEstablishedFacts(chapters) {
    const facts = [];

    // Add base consistency rules
    facts.push(...CONSISTENCY_RULES);

    // Extract facts from generated content
    for (const ch of chapters) {
      if (ch.consistencyFacts) {
        facts.push(...ch.consistencyFacts);
      }
    }

    return [...new Set(facts)]; // Remove duplicates
  }

  // ==========================================================================
  // PROMPT BUILDING - Structured prompts with grounding
  // ==========================================================================

  /**
   * Build the complete generation prompt with all context
   */
  _buildGenerationPrompt(context, chapter, subchapter, isDecisionPoint) {
    const parts = [];

    // Part 1: Story Bible Grounding (RAG)
    parts.push(this._buildGroundingSection(context));

    // Part 2: Previous Story Summary (with smart windowing)
    parts.push(this._buildStorySummarySection(context));

    // Part 3: Character Reference
    parts.push(this._buildCharacterSection());

    // Part 4: Current Task Specification
    parts.push(this._buildTaskSection(context, chapter, subchapter, isDecisionPoint));

    // Part 5: Style Examples (Few-shot)
    parts.push(this._buildStyleSection());

    // Part 6: Consistency Checklist
    parts.push(this._buildConsistencySection(context));

    return parts.join('\n\n---\n\n');
  }

  /**
   * Build grounding section with absolute facts
   */
  _buildGroundingSection(context) {
    return `## STORY BIBLE - ABSOLUTE FACTS (Never contradict these)

### PROTAGONIST
- Name: ${ABSOLUTE_FACTS.protagonist.fullName}
- Age: ${ABSOLUTE_FACTS.protagonist.age}
- Status: ${ABSOLUTE_FACTS.protagonist.currentStatus}
- Career: ${ABSOLUTE_FACTS.protagonist.careerLength} as detective
- Residence: ${ABSOLUTE_FACTS.protagonist.residence}
- Vice: ${ABSOLUTE_FACTS.protagonist.vices[0]}

### ANTAGONIST (The Midnight Confessor)
- True Name: ${ABSOLUTE_FACTS.antagonist.trueName} (revealed later)
- Current Alias: ${ABSOLUTE_FACTS.antagonist.aliasUsed}
- Communication: ${ABSOLUTE_FACTS.antagonist.communication.method}, ${ABSOLUTE_FACTS.antagonist.communication.ink}
- Age at abduction: ${ABSOLUTE_FACTS.antagonist.ageAtAbduction}
- Torturer: ${ABSOLUTE_FACTS.antagonist.torturer}
- Motivation: "${ABSOLUTE_FACTS.antagonist.motivation}"

### SETTING
- City: ${ABSOLUTE_FACTS.setting.city}
- Atmosphere: ${ABSOLUTE_FACTS.setting.atmosphere}
- Key Location: Murphy's Bar is below Jack's office

### THE FIVE INNOCENTS
1. Eleanor Bellamy - convicted of husband's murder, 8 years in Greystone
2. Marcus Thornhill - framed for embezzlement, committed suicide in lockup
3. Dr. Lisa Chen - reported evidence tampering, career destroyed
4. James Sullivan - details revealed progressively
5. Teresa Wade - Tom Wade's own daughter, convicted with his methods

### KEY RELATIONSHIPS (EXACT DURATIONS)
- Jack and Tom Wade: Best friends for 30 years
- Jack and Sarah Reeves: Partners for 13 years
- Jack and Silas Reed: Partners for 8 years
- Emily's "death": 7 years ago exactly
- Eleanor's imprisonment: 8 years exactly`;
  }

  /**
   * Build story summary with intelligent compression
   */
  _buildStorySummarySection(context) {
    let summary = '## PREVIOUS STORY EVENTS\n\n';

    // Group chapters by recency
    const recentChapters = context.previousChapters.filter(ch => ch.isRecent);
    const olderChapters = context.previousChapters.filter(ch => !ch.isRecent);

    // Summarize older chapters (compressed)
    if (olderChapters.length > 0) {
      summary += '### EARLIER CHAPTERS (Summary)\n';
      for (const ch of olderChapters) {
        summary += `**Chapter ${ch.chapter}.${ch.subchapter}** "${ch.title}": `;

        // Use generated summary if available (High Quality), otherwise fallback to slicing (Legacy)
        if (ch.chapterSummary) {
          summary += ch.chapterSummary;
        } else {
          // Extract first 2-3 sentences as summary
          const sentences = ch.narrative.match(/[^.!?]+[.!?]+/g) || [];
          summary += sentences.slice(0, 3).join(' ').trim();
        }
        summary += '\n\n';
      }
    }

    // Full text for recent chapters
    if (recentChapters.length > 0) {
      summary += '### RECENT CHAPTERS (Full Text - Maintain Continuity)\n';
      for (const ch of recentChapters) {
        summary += `**Chapter ${ch.chapter}.${ch.subchapter}** "${ch.title}"\n`;
        summary += ch.narrative + '\n';
        if (ch.decision) {
          summary += `[DECISION MADE: Player chose "${ch.decision.selectedOption || 'unknown'}"]\n`;
        }
        summary += '\n---\n\n';
      }
    }

    // Add player choice history
    if (context.playerChoices.length > 0) {
      summary += '### PLAYER CHOICE HISTORY\n';
      context.playerChoices.forEach(choice => {
        summary += `- Chapter ${choice.chapter}: Chose path "${choice.optionKey}"\n`;
      });
    }

    return summary;
  }

  /**
   * Build character reference section
   */
  _buildCharacterSection() {
    const { protagonist, antagonist, allies, villains } = CHARACTER_REFERENCE;

    return `## CHARACTER VOICES (Match these exactly)

### JACK HALLOWAY (You are writing as him)
Voice: ${protagonist.voiceAndStyle.narrative}
Example: "${protagonist.voiceAndStyle.examplePhrases[0]}"

### VICTORIA BLACKWELL / THE CONFESSOR
Voice: Elegant, calculating, formal diction with sardonic edge
Example: "${antagonist.voiceAndStyle.examplePhrases[0]}"

### SARAH REEVES
Voice: Direct, no-nonsense, increasingly independent
Example: "${allies.sarahReeves.voiceAndStyle.examplePhrases[0]}"

### ELEANOR BELLAMY
Voice: Bitter, resilient, voice like gravel and broken glass
Example: "${allies.eleanorBellamy.voiceAndStyle.examplePhrases[0]}"

### SILAS REED
Voice: Defeated, alcoholic, confessional
Example: "${villains.silasReed.voiceAndStyle?.examplePhrases?.[0] || 'I told myself Thornhill was probably guilty anyway.'}"`;
  }

  /**
   * Build task specification section
   * Now includes Story Arc and Chapter Outline guidance for 100% consistency
   */
  _buildTaskSection(context, chapter, subchapter, isDecisionPoint) {
    const chaptersRemaining = TOTAL_CHAPTERS - chapter;
    const subchapterLabel = ['A', 'B', 'C'][subchapter - 1];
    const pacing = this._getPacingGuidance(chapter);
    const personality = context.pathPersonality || PATH_PERSONALITY_TRAITS.BALANCED;

    // Get story arc guidance for this chapter
    const chapterArc = context.storyArc?.chapterArcs?.find(c => c.chapter === chapter);

    // Get chapter outline for subchapter guidance
    const outline = context.chapterOutline;
    const subchapterOutline = outline ? outline[`subchapter${subchapterLabel}`] : null;

    // Get beat type constraints for tempo variation
    const beatType = STORY_STRUCTURE.chapterBeatTypes?.[chapter];

    let task = `## CURRENT TASK

Write **Chapter ${chapter}, Subchapter ${subchapter} (${subchapterLabel})**

### STORY POSITION
- Chapter ${chapter} of ${TOTAL_CHAPTERS} (${chaptersRemaining} remaining)
- Subchapter ${subchapter} of 3
- Current path: "${context.currentPosition.pathKey}"
- Phase: ${pacing.phase}`;

    // ========== BEAT TYPE CONSTRAINTS (Tempo Variation) ==========
    if (beatType) {
      task += `

### CHAPTER BEAT TYPE: ${beatType.type} (MANDATORY)
**${beatType.description}**

This chapter MUST include:
${beatType.requirements.map(r => `- ${r}`).join('\n')}

${beatType.wordCountModifier !== 1.0 ? `**Pacing Note:** ${beatType.wordCountModifier < 1.0 ? 'This is a FAST-PACED chapter. Keep scenes short and punchy. Less exposition, more action.' : 'This is a DEEP chapter. Take time for dialogue and character exploration. Don\'t rush.'}` : ''}`;
    }

    // ========== NEW: Story Arc Guidance ==========
    if (chapterArc) {
      task += `

### STORY ARC GUIDANCE (Follow this for consistency)
- **Chapter Focus:** ${chapterArc.primaryFocus}
${chapterArc.innocentFeatured ? `- **Featured Innocent:** ${chapterArc.innocentFeatured}` : ''}
${chapterArc.keyRevelation ? `- **Key Revelation:** ${chapterArc.keyRevelation}` : ''}
- **Tension Level:** ${chapterArc.tensionLevel}/10
- **Ending Hook:** ${chapterArc.endingHook}
${chapterArc.decisionTheme ? `- **Decision Theme:** ${chapterArc.decisionTheme}` : ''}`;
    }

    // ========== NEW: Chapter Outline Guidance ==========
    if (subchapterOutline) {
      task += `

### SUBCHAPTER ${subchapterLabel} OUTLINE (Follow this structure)
- **Focus:** ${subchapterOutline.focus}
- **Key Beats:** ${subchapterOutline.keyBeats?.join(', ') || 'Build tension naturally'}
${subchapterOutline.endingTransition ? `- **Transition to next:** ${subchapterOutline.endingTransition}` : ''}`;

      if (isDecisionPoint && subchapterOutline.decisionSetup) {
        task += `
- **Decision Setup:** ${subchapterOutline.decisionSetup}
- **Option A Direction:** ${subchapterOutline.optionADirection || 'More direct approach'}
- **Option B Direction:** ${subchapterOutline.optionBDirection || 'More cautious approach'}`;
      }
    }

    // ========== NEW: Narrative Thread Continuity ==========
    if (outline?.narrativeThreads?.length > 0) {
      task += `

### NARRATIVE THREADS (Weave these through the chapter)
${outline.narrativeThreads.map(t => `- ${t}`).join('\n')}`;
    }

    task += `

### PLAYER PATH PERSONALITY (CRITICAL FOR CONSISTENCY)
Based on player's choices, Jack's behavior pattern is: **${personality.narrativeStyle}**
- Dialogue tone should be ${personality.dialogueTone}
- Risk tolerance: ${personality.riskTolerance}
${personality.scores ? `- Cumulative scores: Aggressive=${personality.scores.aggressive.toFixed(0)}, Methodical=${personality.scores.methodical.toFixed(0)}` : ''}

**IMPORTANT:** Jack's actions and dialogue MUST reflect this established personality pattern. A methodical Jack doesn't suddenly become reckless. An aggressive Jack doesn't suddenly become overly cautious.

### DECISION CONSEQUENCES (Must be reflected in narrative)
${context.decisionConsequences?.immediate?.length > 0 ? context.decisionConsequences.immediate.map(c => `- ${c}`).join('\n') : '- No previous decisions yet'}

### ONGOING EFFECTS FROM CHOICES
${context.decisionConsequences?.ongoing?.length > 0 ? [...new Set(context.decisionConsequences.ongoing)].slice(0, 5).map(e => `- ${e}`).join('\n') : '- Starting fresh'}

### PACING REQUIREMENTS
${pacing.requirements.map(r => `- ${r}`).join('\n')}

### WRITING REQUIREMENTS
1. **PLAN FIRST:** Use the 'beatSheet' field to outline 3-5 major beats.
2. **MINIMUM ${MIN_WORDS_PER_SUBCHAPTER} WORDS** - AIM FOR ${TARGET_WORDS}+ WORDS. Write generously. Do NOT stop short.
3. Continue DIRECTLY from where the last subchapter ended
4. Maintain Jack's first-person noir voice throughout
5. Reference specific events from previous chapters (show continuity)
6. Include: atmospheric description, internal monologue, dialogue
7. Build tension appropriate to ${pacing.phase} phase
8. **ENSURE Jack's behavior matches the path personality above**
9. **FOLLOW the story arc and chapter outline guidance above**`;

    // Add emphasis on recent decision if applicable (beginning of new chapter)
    if (subchapter === 1 && context.playerChoices.length > 0) {
      const lastChoice = context.playerChoices[context.playerChoices.length - 1];
      if (lastChoice.chapter === chapter - 1) {
        task += `\n\n### CRITICAL CONTEXT: PREVIOUS DECISION
The player JUST made a crucial decision at the end of the previous chapter.
You MUST acknowledge this choice immediately.
PLAYER CHOICE: "${lastChoice.optionKey}"
This choice determines the current path. Ensure the narrative reflects this specific outcome.`;
      }
    }

    if (isDecisionPoint) {
      task += `

### DECISION POINT REQUIREMENTS
This subchapter MUST end with a meaningful binary choice (included in the "decision" field).

The decision should:
1. Present TWO distinct paths (Option A and Option B)
2. Both options must be morally complex - NO obvious "right" answer
3. Each choice should have CLEAR but DIFFERENT consequences
4. The choice must feel EARNED by the narrative, not forced
5. Connect to the themes of wrongful conviction, certainty vs truth

For the decision object:
- intro: 1-2 sentences framing the impossible choice Jack faces
- optionA.title: Action statement in imperative mood (e.g., "Confront Wade directly")
- optionA.focus: What this path prioritizes and what it risks
- optionB.title: Action statement in imperative mood (e.g., "Gather more evidence first")
- optionB.focus: What this path prioritizes and what it risks`;
    }

    return task;
  }

  /**
   * Build style examples section (few-shot learning)
   */
  _buildStyleSection() {
    return `## STYLE REFERENCE

Study this example passage and match its quality:

${EXAMPLE_PASSAGES.tenseMoment}

**Note the:** punchy sentences, sensory grounding, character voice through action, tension without melodrama.`;
  }

  /**
   * Build consistency verification section
   */
  _buildConsistencySection(context) {
    let section = `## CONSISTENCY VERIFICATION

### ESTABLISHED FACTS (Never contradict)
${context.establishedFacts.slice(0, 10).map(f => `- ${f}`).join('\n')}`;

    // Add active narrative threads that need to be maintained
    if (context.narrativeThreads && context.narrativeThreads.length > 0) {
      const threadsByType = {};
      context.narrativeThreads.slice(-10).forEach(t => {
        if (!threadsByType[t.type]) threadsByType[t.type] = [];
        threadsByType[t.type].push(t);
      });

      section += `\n\n### ACTIVE NARRATIVE THREADS (Address or acknowledge)`;
      Object.entries(threadsByType).forEach(([type, threads]) => {
        section += `\n**${type.toUpperCase()}:**`;
        threads.slice(-3).forEach(t => {
          section += `\n- Chapter ${t.chapter}.${t.subchapter}: "${t.excerpt.slice(0, 80)}..."`;
        });
      });
    }

    section += `

### YOUR CONSISTENCY RESPONSIBILITIES
1. In your "consistencyFacts" array, include 3-5 NEW specific facts from your narrative
   Examples: "Jack agreed to meet Sarah at the docks at midnight", "Victoria revealed she knows about the Thornhill case"

2. NEVER contradict:
   - Character names and relationships
   - Timeline durations (Wade=30yrs, Sarah=13yrs, Silas=8yrs, Emily=7yrs, Eleanor=8yrs)
   - Setting (Ashport is ALWAYS rainy)
   - Jack's drink (Jameson whiskey ONLY)
   - Player's path personality and decision consequences

3. If you introduced a plot thread (meeting, promise, revelation), it MUST be addressed eventually`;

    return section;
  }

  /**
   * Get pacing guidance based on chapter
   */
  _getPacingGuidance(chapter) {
    if (chapter <= 4) {
      return {
        phase: 'RISING ACTION',
        requirements: [
          'Continue establishing the mystery',
          'Introduce new suspects or complications',
          'Jack should be actively investigating',
          'Build relationships with allies/adversaries',
          'Plant seeds for later revelations',
        ],
      };
    } else if (chapter <= 7) {
      return {
        phase: 'COMPLICATIONS',
        requirements: [
          'Escalate stakes significantly',
          'Reveal betrayals or hidden connections',
          'Jack faces increasing danger and doubt',
          'Moral dilemmas become more complex',
          'The Confessor\'s plan becomes clearer',
        ],
      };
    } else if (chapter <= 10) {
      return {
        phase: 'CONFRONTATIONS',
        requirements: [
          'Major revelations about the conspiracy',
          'Jack must confront his past mistakes directly',
          'Allies may be lost or trust shattered',
          'The full truth about wrongful convictions exposed',
          'Personal cost to Jack escalates dramatically',
        ],
      };
    } else {
      return {
        phase: 'RESOLUTION',
        requirements: [
          'Final confrontation approaching or occurring',
          'All narrative threads coming together',
          'Jack must make impossible, defining choices',
          'The full scope of everything is revealed',
          'Consequences of all player choices manifest',
        ],
      };
    }
  }

  // ==========================================================================
  // GENERATION AND VALIDATION
  // ==========================================================================

  /**
   * Generate a single subchapter with validation
   * Now integrates Story Arc Planning and Chapter Outlines for 100% consistency
   */
  async generateSubchapter(chapter, subchapter, pathKey, choiceHistory = []) {
    if (!llmService.isConfigured()) {
      throw new Error('LLM Service not configured. Please set an API key in settings.');
    }

    if (chapter <= 1) {
      throw new Error('Chapter 1 uses static content and should not be generated.');
    }

    const caseNumber = formatCaseNumber(chapter, subchapter);
    const generationKey = `${caseNumber}_${pathKey}`;

    // Deduplication: Return existing promise if generation is already in flight for this exact content
    if (this.pendingGenerations.has(generationKey)) {
      console.log(`[StoryGenerationService] Reusing pending generation for ${generationKey}`);
      return this.pendingGenerations.get(generationKey);
    }

    const generationPromise = (async () => {
      const isDecisionPoint = subchapter === DECISION_SUBCHAPTER;

      // ========== NEW: Story Arc Planning Integration ==========
      // Ensure we have the global story arc for narrative consistency
      await this.ensureStoryArc(pathKey, choiceHistory);

      // Ensure we have the chapter outline for seamless subchapter flow
      const chapterOutline = await this.ensureChapterOutline(chapter, pathKey, choiceHistory);

      // ========== NEW: Dynamic Consequence Generation ==========
      // If this follows a decision, ensure we have generated consequences
      if (choiceHistory.length > 0) {
        await this._ensureDecisionConsequences(choiceHistory);
      }

      // Build comprehensive context (now includes story arc and chapter outline)
      const context = await this.buildStoryContext(chapter, subchapter, pathKey, choiceHistory);

      // Add story arc and chapter outline to context
      context.storyArc = this.storyArc;
      context.chapterOutline = chapterOutline;

      // Build the prompt with all context (including new planning data)
      const prompt = this._buildGenerationPrompt(context, chapter, subchapter, isDecisionPoint);

      // Select appropriate temperature and schema based on content type
      const temperature = isDecisionPoint
        ? GENERATION_CONFIG.temperature.decisions
        : GENERATION_CONFIG.temperature.narrative;
      const responseSchema = isDecisionPoint
        ? DECISION_CONTENT_SCHEMA
        : STORY_CONTENT_SCHEMA;

      this.isGenerating = true;
      try {
        // Primary generation with structured output
        const response = await llmService.complete(
          [{ role: 'user', content: prompt }],
          {
            systemPrompt: MASTER_SYSTEM_PROMPT,
            temperature,
            maxTokens: GENERATION_CONFIG.maxTokens.subchapter,
            responseSchema,
          }
        );

        // Parse JSON response (guaranteed valid by schema)
        let generatedContent = this._parseGeneratedContent(response.content, isDecisionPoint);

        // Validate word count
        const wordCount = generatedContent.narrative.split(/\s+/).length;
        if (wordCount < MIN_WORDS_PER_SUBCHAPTER) {
          // Request expansion
          generatedContent.narrative = await this._expandNarrative(
            generatedContent.narrative,
            context,
            TARGET_WORDS - wordCount
          );
        }

        // Validate consistency (check for obvious violations)
        let validationResult = this._validateConsistency(generatedContent, context);
        let retries = 0;

        while (!validationResult.valid && retries < MAX_RETRIES) {
          console.warn(`Consistency check failed (Attempt ${retries + 1}/${MAX_RETRIES}). Issues:`, validationResult.issues);

          try {
            generatedContent = await this._fixContent(generatedContent, validationResult.issues, context, isDecisionPoint);

            // Re-validate word count for the fixed content
            const wordCount = generatedContent.narrative.split(/\s+/).length;
            if (wordCount < MIN_WORDS_PER_SUBCHAPTER) {
              generatedContent.narrative = await this._expandNarrative(
                generatedContent.narrative,
                context,
                TARGET_WORDS - wordCount
              );
            }

            validationResult = this._validateConsistency(generatedContent, context);
            retries++;
          } catch (error) {
            console.error('Error during content regeneration:', error);
            break; // Stop retrying if generation fails
          }
        }

        if (!validationResult.valid) {
          console.warn('Consistency warning (Unresolved):', validationResult.issues);
        }

        // Build the story entry
        const storyEntry = {
          chapter,
          subchapter,
          pathKey,
          caseNumber,
          title: generatedContent.title,
          narrative: generatedContent.narrative,
          bridgeText: generatedContent.bridgeText,
          previously: generatedContent.previously || '', // Recap of previous events
          briefing: generatedContent.briefing || { summary: '', objectives: [] },
          decision: isDecisionPoint ? generatedContent.decision : null,
          board: this._generateBoardData(generatedContent.narrative, isDecisionPoint, generatedContent.decision, generatedContent.puzzleCandidates),
          consistencyFacts: generatedContent.consistencyFacts || [],
          chapterSummary: generatedContent.chapterSummary, // Store high-quality summary
          generatedAt: new Date().toISOString(),
          wordCount: generatedContent.narrative.split(/\s+/).length,
        };

        // Save the generated content
        await saveGeneratedChapter(caseNumber, pathKey, storyEntry);

        // Update local cache
        if (!this.generatedStory) {
          this.generatedStory = { chapters: {} };
        }
        this.generatedStory.chapters[`${caseNumber}_${pathKey}`] = storyEntry;

        // Update story context
        await this._updateStoryContext(storyEntry);

        // ========== NEW: Create consistency checkpoint for state validation ==========
        // Checkpoints are created after each subchapter C (end of chapter) for validation
        if (subchapter === 3) {
          await this._createConsistencyCheckpoint(chapter, pathKey, storyEntry);
        }

        this.isGenerating = false;
        return storyEntry;
      } catch (error) {
        this.isGenerating = false;
        throw error;
      }
    })();

    this.pendingGenerations.set(generationKey, generationPromise);

    try {
      const result = await generationPromise;
      this.pendingGenerations.delete(generationKey);
      return result;
    } catch (e) {
      this.pendingGenerations.delete(generationKey);
      throw e;
    }
  }

  /**
   * Generate an entire chapter (all 3 subchapters)
   */
  async generateChapter(chapter, pathKey, choiceHistory = []) {
    const results = [];

    for (let sub = 1; sub <= SUBCHAPTERS_PER_CHAPTER; sub++) {
      const entry = await this.generateSubchapter(chapter, sub, pathKey, choiceHistory);
      results.push(entry);
    }

    return results;
  }

  // ==========================================================================
  // PARSING AND VALIDATION
  // ==========================================================================

  /**
   * Parse generated content from JSON response
   * With structured output, Gemini guarantees valid JSON matching our schema
   * However, truncated responses may still produce invalid JSON
   */
  _parseGeneratedContent(content, isDecisionPoint) {
    try {
      // Parse JSON response (guaranteed valid by Gemini's structured output)
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;

      // Map JSON fields to internal format
      const result = {
        title: parsed.title || 'Untitled',
        bridgeText: parsed.bridge || '',
        previously: parsed.previously || '', // Recap of previous events
        narrative: this._cleanNarrative(parsed.narrative || ''),
        chapterSummary: parsed.chapterSummary || '', // High-quality summary
        puzzleCandidates: parsed.puzzleCandidates || [], // LLM suggested puzzle words
        briefing: parsed.briefing || { summary: '', objectives: [] },
        consistencyFacts: Array.isArray(parsed.consistencyFacts) ? parsed.consistencyFacts : [],
        decision: null,
      };

      // Convert decision format if present
      if (isDecisionPoint && parsed.decision) {
        result.decision = this._convertDecisionFormat(parsed.decision);
      }

      return result;
    } catch (error) {
      // This can happen with truncated responses - try to extract what we can
      console.error('[StoryGenerationService] JSON parse error:', error);
      console.log('[StoryGenerationService] Attempting to extract content from malformed JSON...');

      // Try to extract partial content using regex
      const extracted = this._extractPartialContent(content, isDecisionPoint);
      if (extracted.narrative && extracted.narrative.length > 100) {
        console.log('[StoryGenerationService] Successfully extracted partial content');
        return extracted;
      }

      // Last resort: use the raw content as narrative
      console.warn('[StoryGenerationService] Falling back to raw content as narrative');
      return {
        title: 'Untitled',
        bridgeText: '',
        previously: '',
        narrative: typeof content === 'string' ? this._cleanNarrative(this._extractNarrativeFromRaw(content)) : '',
        chapterSummary: '',
        puzzleCandidates: [],
        briefing: { summary: '', objectives: [] },
        consistencyFacts: [],
        decision: null,
      };
    }
  }

  /**
   * Extract partial content from malformed JSON using regex patterns
   */
  _extractPartialContent(content, isDecisionPoint) {
    const result = {
      title: 'Untitled',
      bridgeText: '',
      previously: '',
      narrative: '',
      chapterSummary: '',
      puzzleCandidates: [],
      briefing: { summary: '', objectives: [] },
      consistencyFacts: [],
      decision: null,
    };

    if (typeof content !== 'string') {
      return result;
    }

    // Try to extract title
    const titleMatch = content.match(/"title"\s*:\s*"([^"]+)"/);
    if (titleMatch) {
      result.title = titleMatch[1];
    }

    // Try to extract bridge text
    const bridgeMatch = content.match(/"bridge"\s*:\s*"([^"]+)"/);
    if (bridgeMatch) {
      result.bridgeText = bridgeMatch[1];
    }

    // Try to extract previously
    const previouslyMatch = content.match(/"previously"\s*:\s*"([^"]+)"/);
    if (previouslyMatch) {
      result.previously = previouslyMatch[1];
    }

    // Try to extract narrative (this is the most important and likely longest field)
    const narrativeMatch = content.match(/"narrative"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"|"\s*,\s*"briefing|"\s*,\s*"consistencyFacts|"\s*})/);
    if (narrativeMatch) {
      // Unescape the narrative content
      let narrative = narrativeMatch[1];
      // Handle escaped characters
      narrative = narrative.replace(/\\n/g, '\n')
                          .replace(/\\"/g, '"')
                          .replace(/\\\\/g, '\\');
      result.narrative = this._cleanNarrative(narrative);
    } else {
      // Try a more aggressive pattern for truncated narratives
      const looseNarrativeMatch = content.match(/"narrative"\s*:\s*"([\s\S]{100,})/);
      if (looseNarrativeMatch) {
        let narrative = looseNarrativeMatch[1];
        // Find the last complete sentence
        const lastSentenceEnd = Math.max(
          narrative.lastIndexOf('.'),
          narrative.lastIndexOf('!'),
          narrative.lastIndexOf('?')
        );
        if (lastSentenceEnd > narrative.length * 0.5) {
          narrative = narrative.substring(0, lastSentenceEnd + 1);
        }
        narrative = narrative.replace(/\\n/g, '\n')
                            .replace(/\\"/g, '"')
                            .replace(/\\\\/g, '\\');
        result.narrative = this._cleanNarrative(narrative);
      }
    }

    // Try to extract briefing summary
    const briefingSummaryMatch = content.match(/"summary"\s*:\s*"([^"]+)"/);
    if (briefingSummaryMatch) {
      result.briefing.summary = briefingSummaryMatch[1];
    }

    // Try to extract briefing objectives
    const objectivesMatch = content.match(/"objectives"\s*:\s*\[([\s\S]*?)\]/);
    if (objectivesMatch) {
      const objectivesStr = objectivesMatch[1];
      const objectives = objectivesStr.match(/"([^"]+)"/g);
      if (objectives) {
        result.briefing.objectives = objectives.map(o => o.replace(/"/g, ''));
      }
    }

    // Try to extract decision for decision points
    if (isDecisionPoint) {
      const introMatch = content.match(/"intro"\s*:\s*"([^"]+)"/);
      const optionATitleMatch = content.match(/"optionA"[\s\S]*?"title"\s*:\s*"([^"]+)"/);
      const optionAFocusMatch = content.match(/"optionA"[\s\S]*?"focus"\s*:\s*"([^"]+)"/);
      const optionBTitleMatch = content.match(/"optionB"[\s\S]*?"title"\s*:\s*"([^"]+)"/);
      const optionBFocusMatch = content.match(/"optionB"[\s\S]*?"focus"\s*:\s*"([^"]+)"/);

      if (introMatch && optionATitleMatch) {
        result.decision = {
          intro: [introMatch[1]],
          options: [
            {
              key: 'A',
              title: optionATitleMatch[1],
              focus: optionAFocusMatch ? optionAFocusMatch[1] : '',
              consequence: null,
              stats: null,
              outcome: null,
              nextChapter: null,
              nextPathKey: 'A',
              details: [],
            },
            {
              key: 'B',
              title: optionBTitleMatch ? optionBTitleMatch[1] : 'Option B',
              focus: optionBFocusMatch ? optionBFocusMatch[1] : '',
              consequence: null,
              stats: null,
              outcome: null,
              nextChapter: null,
              nextPathKey: 'B',
              details: [],
            },
          ],
        };
      }
    }

    return result;
  }

  /**
   * Extract narrative content from raw text when JSON parsing completely fails
   */
  _extractNarrativeFromRaw(content) {
    if (typeof content !== 'string') return '';

    // Remove JSON structure artifacts
    let text = content;

    // If it looks like it starts with JSON, try to extract the narrative value
    if (text.includes('"narrative"')) {
      const narrativeStart = text.indexOf('"narrative"');
      const valueStart = text.indexOf('"', narrativeStart + 11) + 1;
      if (valueStart > narrativeStart) {
        text = text.substring(valueStart);
        // Try to find the end of the narrative
        const valueEnd = text.lastIndexOf('"');
        if (valueEnd > 100) {
          text = text.substring(0, valueEnd);
        }
      }
    }

    // Clean up escaped characters
    text = text.replace(/\\n/g, '\n')
               .replace(/\\"/g, '"')
               .replace(/\\\\/g, '\\')
               .replace(/^\{[\s\S]*?"narrative"\s*:\s*"/m, '')
               .replace(/",[\s\S]*$/m, '');

    // Find the last complete sentence to avoid cut-off text
    const lastSentenceEnd = Math.max(
      text.lastIndexOf('.'),
      text.lastIndexOf('!'),
      text.lastIndexOf('?')
    );

    if (lastSentenceEnd > text.length * 0.3) {
      text = text.substring(0, lastSentenceEnd + 1);
    }

    return text.trim();
  }

  /**
   * Convert JSON decision format to internal game format
   */
  _convertDecisionFormat(decision) {
    return {
      intro: [decision.intro || ''],
      options: [
        {
          key: decision.optionA?.key || 'A',
          title: decision.optionA?.title || 'Option A',
          focus: decision.optionA?.focus || '',
          consequence: null,
          stats: null,
          outcome: null,
          nextChapter: null, // Will be set by game logic
          nextPathKey: decision.optionA?.key || 'A',
          details: [],
        },
        {
          key: decision.optionB?.key || 'B',
          title: decision.optionB?.title || 'Option B',
          focus: decision.optionB?.focus || '',
          consequence: null,
          stats: null,
          outcome: null,
          nextChapter: null, // Will be set by game logic
          nextPathKey: decision.optionB?.key || 'B',
          details: [],
        },
      ],
    };
  }

  /**
   * Clean narrative text - minimal cleanup since structured output is clean
   */
  _cleanNarrative(text) {
    if (!text) return '';
    return text
      // Fix double spaces
      .replace(/\s{2,}/g, ' ')
      // Remove em dashes (replace with comma)
      .replace(/\s*—\s*/g, ', ')
      .trim();
  }

  /**
   * Validate content against established facts - COMPREHENSIVE VERSION
   * Checks for: name spelling, timeline, setting, character behavior, relationship states,
   * plot continuity, and path personality consistency
   */
  _validateConsistency(content, context) {
    const issues = [];
    const warnings = []; // Non-blocking issues
    const narrative = content.narrative.toLowerCase();
    const narrativeOriginal = content.narrative;

    // =========================================================================
    // CATEGORY 1: NAME AND SPELLING CONSISTENCY
    // =========================================================================
    const nameChecks = [
      { wrong: ['hallaway', 'holloway', 'haloway', 'hallo way'], correct: 'Halloway' },
      { wrong: ['blackwood', 'blackwel', 'black well'], correct: 'Blackwell' },
      { wrong: ['reaves', 'reevs', 'reeve '], correct: 'Reeves' },
      { wrong: ['bellami', 'bellamy,', 'bella my'], correct: 'Bellamy' },
      { wrong: ['thornhil', 'thorn hill'], correct: 'Thornhill' },
      { wrong: ['granges', 'grang '], correct: 'Grange' },
      { wrong: ['silias', 'silass', 'si las'], correct: 'Silas' },
    ];

    nameChecks.forEach(({ wrong, correct }) => {
      wrong.forEach(misspelling => {
        if (narrative.includes(misspelling)) {
          issues.push(`Name misspelled: found "${misspelling}", should be "${correct}"`);
        }
      });
    });

    // =========================================================================
    // CATEGORY 2: TIMELINE CONSISTENCY
    // =========================================================================
    const timelineChecks = [
      { pattern: /(?:twenty|20)\s*years.*(?:tom\s*wade|wade.*friend)/i, issue: 'Tom Wade friendship is 30 years, not 20' },
      { pattern: /(?:ten|10)\s*years.*(?:sarah|reeves.*partner)/i, issue: 'Sarah partnership is 13 years, not 10' },
      { pattern: /(?:five|5)\s*years.*(?:silas|reed.*partner)/i, issue: 'Silas partnership is 8 years, not 5' },
      { pattern: /(?:five|5|ten|10)\s*years.*(?:emily.*dead|closed.*emily)/i, issue: 'Emily case was closed 7 years ago exactly' },
      { pattern: /(?:five|5|ten|10)\s*years.*(?:eleanor.*prison|imprisoned)/i, issue: 'Eleanor has been imprisoned for 8 years exactly' },
    ];

    timelineChecks.forEach(({ pattern, issue }) => {
      if (pattern.test(narrativeOriginal)) {
        issues.push(issue);
      }
    });

    // =========================================================================
    // CATEGORY 3: SETTING CONSISTENCY
    // =========================================================================
    const settingViolations = [
      { pattern: /\b(?:sunny|sunshine|bright\s+sun|clear\s+sk(?:y|ies)|cloudless)\b/i, issue: 'Ashport is ALWAYS rainy/overcast - never sunny or clear' },
      { pattern: /\bjack\s+(?:orders?|drinks?)\s+(?:bourbon|scotch|vodka|gin|beer)\b/i, issue: 'Jack drinks Jameson whiskey, not other alcohol' },
    ];

    settingViolations.forEach(({ pattern, issue }) => {
      if (pattern.test(narrativeOriginal)) {
        issues.push(issue);
      }
    });

    // =========================================================================
    // CATEGORY 4: CHARACTER BEHAVIOR CONSISTENCY (Based on path personality)
    // =========================================================================
    if (context.pathPersonality) {
      const personality = context.pathPersonality;

      // Check for personality-inconsistent behavior
      if (personality.riskTolerance === 'low') {
        // Methodical Jack shouldn't suddenly be reckless
        const recklessBehavior = /jack\s+(?:rushed|charged|stormed|lunged|burst|barreled)\s+(?:in|into|through|forward)/i;
        if (recklessBehavior.test(narrativeOriginal)) {
          warnings.push('Jack is behaving more recklessly than his methodical path personality suggests');
        }
      } else if (personality.riskTolerance === 'high') {
        // Aggressive Jack shouldn't suddenly become overly cautious
        const overlyPrudent = /jack\s+(?:hesitated|wavered|second-guessed|held\s+back|waited\s+patiently)/i;
        if (overlyPrudent.test(narrativeOriginal)) {
          warnings.push('Jack is behaving more cautiously than his aggressive path personality suggests');
        }
      }
    }

    // =========================================================================
    // CATEGORY 5: PLOT CONTINUITY - Check narrative threads
    // =========================================================================
    if (context.narrativeThreads && context.narrativeThreads.length > 0) {
      // Check for appointments/promises that should be addressed
      const recentAppointments = context.narrativeThreads
        .filter(t => t.type === 'appointment')
        .slice(-3);

      // Note: We can't automatically verify these are addressed, but we can warn
      if (recentAppointments.length > 0 && context.currentPosition.chapter > 2) {
        // This is informational - the prompt should mention these
      }
    }

    // =========================================================================
    // CATEGORY 6: DECISION CONSEQUENCE CARRYOVER
    // =========================================================================
    // Check that narrative mentions or reflects consequences of player's choices
    if (context.playerChoices && context.playerChoices.length > 0 && context.currentPosition.subchapter === 1) {
      const lastChoice = context.playerChoices[context.playerChoices.length - 1];
      const lastChoiceChapter = this._extractChapterFromCase(lastChoice.caseNumber);

      // If this is the first subchapter after a decision, narrative should acknowledge it
      if (lastChoiceChapter === context.currentPosition.chapter - 1) {
        // Look for any indication the choice is being addressed
        const hasChoiceReference = /(?:choice|decision|chose|decided|opted|path|went with|took the)/i.test(narrativeOriginal);
        if (!hasChoiceReference) {
          warnings.push('Opening of new chapter should acknowledge/reflect the player\'s previous decision');
        }
      }
    }

    // =========================================================================
    // CATEGORY 7: FORBIDDEN WRITING PATTERNS
    // =========================================================================
    const forbiddenPatterns = [
      { pattern: /—/g, issue: 'Em dashes (—) found - use commas, periods, or semicolons instead', count: true },
      { pattern: /\bis not just\b.*\bit'?s\b/i, issue: 'Forbidden pattern: "X is not just Y, it\'s Z"' },
      { pattern: /\bin a world where\b/i, issue: 'Forbidden phrase: "In a world where..."' },
      { pattern: /\blittle did (?:he|she|they|i|we) know\b/i, issue: 'Forbidden phrase: "Little did [anyone] know..."' },
      { pattern: /\bi couldn'?t help but\b/i, issue: 'Forbidden phrase: "I couldn\'t help but..."' },
      { pattern: /\bi found myself\b/i, issue: 'Forbidden phrase: "I found myself..."' },
      { pattern: /\bseemingly\b|\binterestingly\b|\bnotably\b/i, issue: 'Forbidden flowery adverbs detected' },
      { pattern: /\bdelve\b|\bunravel\b|\btapestry\b|\bmyriad\b/i, issue: 'Forbidden words detected (delve, unravel, tapestry, myriad)' },
      { pattern: /\ba testament to\b|\bserves as a reminder\b/i, issue: 'Forbidden cliche phrase detected' },
    ];

    forbiddenPatterns.forEach(({ pattern, issue, count }) => {
      if (count) {
        const matches = narrativeOriginal.match(pattern);
        if (matches && matches.length > 2) {
          issues.push(`${issue} (found ${matches.length} instances)`);
        } else if (matches && matches.length > 0) {
          warnings.push(`${issue} (found ${matches.length} instances)`);
        }
      } else if (pattern.test(narrativeOriginal)) {
        issues.push(issue);
      }
    });

    // =========================================================================
    // CATEGORY 8: WORD COUNT VALIDATION
    // =========================================================================
    const wordCount = narrativeOriginal.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < MIN_WORDS_PER_SUBCHAPTER) {
      issues.push(`Narrative too short: ${wordCount} words (minimum ${MIN_WORDS_PER_SUBCHAPTER} required)`);
    } else if (wordCount < TARGET_WORDS * 0.85) {
      warnings.push(`Narrative shorter than target: ${wordCount} words (target ${TARGET_WORDS})`);
    }

    // =========================================================================
    // CATEGORY 9: PERSPECTIVE/TENSE CONSISTENCY
    // =========================================================================
    // Check for third-person perspective slips (should be first-person)
    const thirdPersonSlips = /\bjack\s+(?:thought|felt|wondered|realized|knew|saw|heard)\b/i;
    if (thirdPersonSlips.test(narrativeOriginal)) {
      warnings.push('Possible third-person perspective slip detected - should be first-person (Jack\'s POV)');
    }

    // Log warnings but don't block on them
    if (warnings.length > 0) {
      console.log('[ConsistencyValidator] Warnings:', warnings);
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * Attempt to fix content that failed validation
   */
  async _fixContent(content, issues, context, isDecisionPoint) {
    const fixPrompt = `The following generated story content contains consistency violations that must be fixed.

ISSUES TO FIX:
${issues.map(i => `- ${i}`).join('\n')}

Please rewrite the content to resolve these specific issues while maintaining the noir style, plot, and character voices. Ensure all names and facts are consistent.

ORIGINAL CONTENT:
${JSON.stringify(content, null, 2)}
`;

    const responseSchema = isDecisionPoint
      ? DECISION_CONTENT_SCHEMA
      : STORY_CONTENT_SCHEMA;

    const response = await llmService.complete(
      [{ role: 'user', content: fixPrompt }],
      {
        systemPrompt: 'You are an expert editor ensuring narrative consistency. Fix the issues in the provided content without changing the core story.',
        temperature: GENERATION_CONFIG.temperature.narrative, // Use standard temperature
        maxTokens: GENERATION_CONFIG.maxTokens.subchapter,
        responseSchema,
      }
    );

    return this._parseGeneratedContent(response.content, isDecisionPoint);
  }

  /**
   * Expand narrative with controlled generation
   */
  async _expandNarrative(narrative, context, additionalWords) {
    const expandPrompt = `Expand this noir detective narrative by approximately ${additionalWords} more words.

CURRENT TEXT:
${narrative}

REQUIREMENTS:
1. Add atmospheric description (rain, shadows, city sounds)
2. Expand Jack's internal monologue with self-reflection
3. Add sensory details and physical grounding
4. Include additional dialogue if characters are present
5. DO NOT change the plot or ending
6. DO NOT add new major events
7. Maintain Jack Halloway's noir voice exactly

Output ONLY the expanded narrative. No tags, no commentary.`;

    const response = await llmService.complete(
      [{ role: 'user', content: expandPrompt }],
      {
        systemPrompt: 'You are expanding noir fiction. Match the existing style exactly.',
        temperature: GENERATION_CONFIG.temperature.expansion,
        maxTokens: GENERATION_CONFIG.maxTokens.expansion,
      }
    );

    return this._cleanNarrative(response.content);
  }

  // ==========================================================================
  // BOARD GENERATION (Puzzle data)
  // ==========================================================================

  /**
   * Generate board data for the puzzle
   */
  _generateBoardData(narrative, isDecisionPoint, decision, puzzleCandidates = []) {
    // Combine LLM candidates with regex extraction, prioritizing LLM candidates
    const regexWords = this._extractKeywordsFromNarrative(narrative);

    // Filter LLM candidates for validity (length, structure)
    const validCandidates = (puzzleCandidates || [])
      .map(w => w.toUpperCase().trim())
      .filter(w => w.length >= 4 && w.length <= 10 && /^[A-Z]+$/.test(w));

    // Combine lists: Candidates first, then regex words (deduplicated)
    const allWords = [...new Set([...validCandidates, ...regexWords])];

    const outlierCount = isDecisionPoint ? 8 : 4;
    let outlierWords = this._selectOutlierWords(allWords, outlierCount, isDecisionPoint, decision);

    const gridRows = isDecisionPoint ? 5 : 4;
    const gridCols = 4;
    const gridSize = gridRows * gridCols;

    const usedWords = new Set(outlierWords.map(w => w.toUpperCase()));
    const gridWords = [...outlierWords];

    // Fill remaining spots with other relevant words from narrative
    for (const word of allWords) {
      if (gridWords.length >= gridSize) break;
      const upperWord = word.toUpperCase();
      if (!usedWords.has(upperWord)) {
        gridWords.push(upperWord);
        usedWords.add(upperWord);
      }
    }

    const fillerWords = [
      'SHADOW', 'TRUTH', 'LIE', 'NIGHT', 'RAIN', 'SMOKE', 'BLOOD', 'DEATH',
      'GUILT', 'ALIBI', 'CRIME', 'BADGE', 'CLUE', 'FEAR', 'DARK', 'NOIR',
      'VICE', 'DREAD', 'KNIFE', 'GLASS', 'BOOZE', 'DAME', 'GRIFT', 'HEIST',
      'MOTIVE', 'CORPSE', 'VAULT', 'CHASE', 'BLIND', 'TRAIL', 'MARK',
      'SNITCH', 'BRASS', 'STREET', 'ALLEY', 'DOCK', 'PIER', 'WHARF', 'TORCH',
    ];

    const shuffledFillers = this._shuffleArray([...fillerWords]);
    for (const filler of shuffledFillers) {
      if (gridWords.length >= gridSize) break;
      const upperFiller = filler.toUpperCase();
      if (!usedWords.has(upperFiller)) {
        gridWords.push(upperFiller);
        usedWords.add(upperFiller);
      }
    }

    const uniqueGridWords = [...new Set(gridWords)].slice(0, gridSize);

    while (uniqueGridWords.length < gridSize) {
      const fallback = `CASE${uniqueGridWords.length}`;
      if (!usedWords.has(fallback)) {
        uniqueGridWords.push(fallback);
        usedWords.add(fallback);
      }
    }

    // ========== SEMANTIC VALIDATION ==========
    // Ensure outlier words are semantically distinct from main grid words
    const mainGridWords = uniqueGridWords.filter(w => !outlierWords.includes(w));
    const availableReplacements = allWords.filter(w =>
      !uniqueGridWords.includes(w.toUpperCase()) &&
      !outlierWords.includes(w.toUpperCase())
    );

    // Run synchronous semantic validation
    outlierWords = this._validatePuzzleSemanticsSync(
      outlierWords,
      mainGridWords,
      [...availableReplacements, ...shuffledFillers]
    );

    // Update grid with validated outliers
    const finalGridWords = [...outlierWords, ...mainGridWords].slice(0, gridSize);
    while (finalGridWords.length < gridSize) {
      const fallback = `CASE${finalGridWords.length}`;
      finalGridWords.push(fallback);
    }

    const shuffledWords = this._shuffleArray(finalGridWords);

    const grid = [];
    for (let row = 0; row < gridRows; row++) {
      grid.push(shuffledWords.slice(row * gridCols, (row + 1) * gridCols));
    }

    const boardResult = {
      outlierWords: outlierWords.slice(0, isDecisionPoint ? 8 : 4),
      grid,
      outlierTheme: {
        name: this._determineTheme(outlierWords),
        icon: '\ud83d\udd0e',
        summary: narrative.substring(0, 100) + '...',
      },
    };

    if (isDecisionPoint && decision?.options?.length >= 2) {
      const set1Words = outlierWords.slice(0, 4);
      const set2Words = outlierWords.slice(4, 8);

      boardResult.branchingOutlierSets = [
        {
          optionKey: decision.options[0].key || 'A',
          key: decision.options[0].key || 'A',
          label: decision.options[0].key || 'A',
          theme: {
            name: this._truncateThemeName(decision.options[0].title) || 'PATH A',
            icon: '\ud83d\udd34',
            summary: decision.options[0].focus || decision.options[0].title || 'Option A',
          },
          words: set1Words,
          descriptions: set1Words.reduce((acc, word) => {
            acc[word] = `Related to: ${decision.options[0].title || 'Path A'}`;
            return acc;
          }, {}),
        },
        {
          optionKey: decision.options[1].key || 'B',
          key: decision.options[1].key || 'B',
          label: decision.options[1].key || 'B',
          theme: {
            name: this._truncateThemeName(decision.options[1].title) || 'PATH B',
            icon: '\ud83d\udd35',
            summary: decision.options[1].focus || decision.options[1].title || 'Option B',
          },
          words: set2Words,
          descriptions: set2Words.reduce((acc, word) => {
            acc[word] = `Related to: ${decision.options[1].title || 'Path B'}`;
            return acc;
          }, {}),
        },
      ];
    }

    return boardResult;
  }

  _truncateThemeName(title) {
    if (!title) return null;
    const words = title.split(/\s+/).slice(0, 2).join(' ');
    return words.length > 12 ? words.slice(0, 12).toUpperCase() : words.toUpperCase();
  }

  _extractKeywordsFromNarrative(narrative) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'under', 'over', 'out', 'off',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
      'them', 'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours',
      'this', 'that', 'these', 'those', 'who', 'whom', 'which', 'what',
      'is', 'was', 'are', 'were', 'been', 'be', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'must', 'shall', 'can', 'get', 'got', 'getting', 'let', 'make', 'made',
      'say', 'said', 'says', 'tell', 'told', 'ask', 'asked', 'know', 'knew',
      'think', 'thought', 'see', 'saw', 'seen', 'look', 'looked', 'looking',
      'come', 'came', 'coming', 'go', 'went', 'gone', 'going', 'take', 'took',
      'want', 'wanted', 'need', 'needed', 'seem', 'seemed', 'keep', 'kept',
      'very', 'really', 'quite', 'just', 'only', 'even', 'also', 'too', 'so',
      'now', 'then', 'here', 'there', 'when', 'where', 'why', 'how', 'well',
      'still', 'already', 'always', 'never', 'ever', 'often', 'sometimes',
      'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
      'such', 'no', 'not', 'any', 'many', 'much', 'own', 'same', 'than',
      'good', 'bad', 'new', 'old', 'first', 'last', 'long', 'great', 'little',
      'time', 'year', 'day', 'way', 'thing', 'man', 'woman', 'life', 'world',
      'like', 'back', 'about', 'again', 'against', 'because', 'down', 'find',
      'found', 'give', 'gave', 'hand', 'head', 'eyes', 'face', 'voice', 'room',
      'door', 'turn', 'turned', 'jack', 'halloway', 'detective', 'case', 'chapter',
    ]);

    const words = narrative
      .toUpperCase()
      .replace(/[^A-Z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => {
        const lowerWord = word.toLowerCase();
        return word.length >= 4 &&
               word.length <= 10 &&
               !stopWords.has(lowerWord) &&
               !/^[AEIOU]+$/.test(word) &&
               !/(.)\1{2,}/.test(word);
      });

    const frequency = {};
    const firstOccurrence = {};
    words.forEach((word, index) => {
      if (!frequency[word]) {
        frequency[word] = 0;
        firstOccurrence[word] = index;
      }
      frequency[word]++;
    });

    const scored = Object.entries(frequency).map(([word, freq]) => {
      const positionBonus = 1 - (firstOccurrence[word] / words.length) * 0.5;
      const lengthBonus = Math.min(word.length / 8, 1) * 0.3;
      const score = freq * (1 + positionBonus + lengthBonus);
      return { word, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .map(({ word }) => word)
      .slice(0, 60);
  }

  _selectOutlierWords(availableWords, count, isDecisionPoint, decision) {
    const usedWords = new Set();

    if (isDecisionPoint && decision?.options) {
      const setA = this._selectThemedWords(availableWords, 4, decision.options[0]?.focus, usedWords);
      setA.forEach(w => usedWords.add(w.toUpperCase()));

      const remainingWords = availableWords.filter(w => !usedWords.has(w.toUpperCase()));
      const setB = this._selectThemedWords(remainingWords, 4, decision.options[1]?.focus, usedWords);

      const combined = [...setA, ...setB];
      const uniqueCombined = [...new Set(combined.map(w => w.toUpperCase()))];

      const stillAvailable = availableWords.filter(w => !uniqueCombined.includes(w.toUpperCase()));
      while (uniqueCombined.length < 8 && stillAvailable.length > 0) {
        uniqueCombined.push(stillAvailable.shift().toUpperCase());
      }

      return uniqueCombined.slice(0, 8);
    }

    const uniqueWords = [];
    for (const word of availableWords) {
      const upperWord = word.toUpperCase();
      if (!usedWords.has(upperWord)) {
        uniqueWords.push(upperWord);
        usedWords.add(upperWord);
        if (uniqueWords.length >= count) break;
      }
    }
    return uniqueWords;
  }

  // ==========================================================================
  // SEMANTIC OVERLAP DETECTION - Prevents unfair puzzles
  // ==========================================================================

  /**
   * Known semantic clusters - words that are too closely related to appear
   * as both outliers and main words in the same puzzle
   */
  _getSemanticClusters() {
    return [
      // Weather/Temperature
      ['COLD', 'ICE', 'FROST', 'FREEZE', 'CHILL', 'WINTER', 'SNOW', 'FROZEN'],
      ['WIND', 'BREEZE', 'GUST', 'STORM', 'GALE', 'BLOW', 'AIR'],
      ['RAIN', 'WATER', 'WET', 'DAMP', 'MOIST', 'DRENCH', 'SOAK', 'FLOOD'],
      ['FIRE', 'FLAME', 'BURN', 'HEAT', 'HOT', 'BLAZE', 'EMBER', 'SCORCH'],

      // Light/Dark
      ['DARK', 'SHADOW', 'BLACK', 'NIGHT', 'GLOOM', 'DIM', 'MURKY'],
      ['LIGHT', 'BRIGHT', 'SHINE', 'GLOW', 'GLEAM', 'FLASH', 'BEAM'],

      // Death/Violence
      ['DEATH', 'DEAD', 'DIE', 'KILL', 'MURDER', 'SLAY', 'FATAL'],
      ['BLOOD', 'BLEED', 'WOUND', 'CUT', 'STAB', 'SLASH', 'GASH'],
      ['GUN', 'SHOOT', 'SHOT', 'BULLET', 'PISTOL', 'WEAPON', 'RIFLE'],

      // Truth/Lies
      ['TRUTH', 'TRUE', 'HONEST', 'REAL', 'FACT', 'GENUINE'],
      ['LIE', 'FALSE', 'FAKE', 'DECEIT', 'FRAUD', 'CHEAT', 'TRICK'],
      ['SECRET', 'HIDE', 'HIDDEN', 'CONCEAL', 'COVERT', 'COVER'],

      // Fear/Emotion
      ['FEAR', 'AFRAID', 'TERROR', 'DREAD', 'PANIC', 'SCARED', 'FRIGHT'],
      ['ANGER', 'ANGRY', 'RAGE', 'FURY', 'MAD', 'WRATH', 'HATE'],

      // Crime/Law
      ['CRIME', 'CRIMINAL', 'CROOK', 'THIEF', 'STEAL', 'ROB', 'HEIST'],
      ['POLICE', 'COP', 'BADGE', 'OFFICER', 'DETECTIVE', 'PATROL'],
      ['JAIL', 'PRISON', 'CELL', 'LOCK', 'CAGE', 'CAPTIVE', 'TRAPPED'],

      // Body parts
      ['HAND', 'FIST', 'GRIP', 'GRASP', 'HOLD', 'GRAB', 'CLUTCH'],
      ['EYE', 'EYES', 'LOOK', 'GAZE', 'STARE', 'WATCH', 'SEE', 'SIGHT'],

      // Money
      ['MONEY', 'CASH', 'DOLLAR', 'WEALTH', 'RICH', 'GOLD', 'FORTUNE'],
      ['PAY', 'PAID', 'BRIBE', 'DEBT', 'OWE', 'COST', 'PRICE'],

      // Time
      ['NIGHT', 'MIDNIGHT', 'EVENING', 'DUSK', 'DARK', 'LATE'],
      ['PAST', 'MEMORY', 'REMEMBER', 'FORGOT', 'HISTORY', 'BEFORE'],
    ];
  }

  /**
   * Check if two words belong to the same semantic cluster
   */
  _areSemanticallySimilar(word1, word2) {
    const w1 = word1.toUpperCase();
    const w2 = word2.toUpperCase();

    // Same word
    if (w1 === w2) return true;

    // Check if one contains the other (KILL/KILLER, DEATH/DEAD)
    if (w1.includes(w2) || w2.includes(w1)) return true;

    // Check semantic clusters
    const clusters = this._getSemanticClusters();
    for (const cluster of clusters) {
      const hasW1 = cluster.some(c => c === w1 || w1.includes(c) || c.includes(w1));
      const hasW2 = cluster.some(c => c === w2 || w2.includes(c) || c.includes(w2));
      if (hasW1 && hasW2) return true;
    }

    return false;
  }

  /**
   * Validate and fix puzzle board for semantic overlap
   * Ensures outlier words are semantically distinct from main grid words
   */
  _validatePuzzleSemanticsSync(outlierWords, gridWords, availableReplacements) {
    const validatedOutliers = [...outlierWords];
    const gridSet = new Set(gridWords.map(w => w.toUpperCase()));
    const usedWords = new Set([...outlierWords, ...gridWords].map(w => w.toUpperCase()));

    // Check each outlier against all grid words
    for (let i = 0; i < validatedOutliers.length; i++) {
      const outlier = validatedOutliers[i];

      for (const gridWord of gridWords) {
        if (this._areSemanticallySimilar(outlier, gridWord)) {
          console.log(`[StoryGenerationService] Semantic overlap detected: outlier "${outlier}" ~ grid word "${gridWord}"`);

          // Find a replacement from available words
          const replacement = availableReplacements.find(w => {
            const upper = w.toUpperCase();
            if (usedWords.has(upper)) return false;
            // Ensure replacement doesn't overlap with any grid word
            return !gridWords.some(gw => this._areSemanticallySimilar(upper, gw));
          });

          if (replacement) {
            console.log(`[StoryGenerationService] Replacing "${outlier}" with "${replacement}"`);
            usedWords.delete(outlier.toUpperCase());
            validatedOutliers[i] = replacement.toUpperCase();
            usedWords.add(replacement.toUpperCase());
          }
          break; // Move to next outlier after finding one overlap
        }
      }
    }

    return validatedOutliers;
  }

  /**
   * LLM-based semantic validation for puzzles (async, more thorough)
   * Used as a secondary check for important decision-point puzzles
   */
  async _validatePuzzleSemanticsWithLLM(outlierWords, mainWords) {
    const prompt = `You are a word puzzle validator. Given these two word lists, identify any pairs where a word from List A is semantically too similar to a word from List B to be fair in a puzzle where players must identify outliers.

LIST A (Outlier words - players must find these): ${outlierWords.join(', ')}
LIST B (Main grid words): ${mainWords.join(', ')}

Semantic similarity means:
- Synonyms (COLD/FREEZING)
- Same category/theme (WIND/ICE both relate to cold weather)
- One implies the other (BLOOD/WOUND)
- Common collocations (NIGHT/DARK)

Return a JSON object:
{
  "conflicts": [
    {"outlier": "WORD1", "mainWord": "WORD2", "reason": "brief explanation"}
  ]
}

If no conflicts, return: {"conflicts": []}`;

    try {
      const response = await llmService.complete(
        [{ role: 'user', content: prompt }],
        {
          temperature: 0.1,
          maxTokens: 500,
          responseSchema: {
            type: 'object',
            properties: {
              conflicts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    outlier: { type: 'string' },
                    mainWord: { type: 'string' },
                    reason: { type: 'string' }
                  },
                  required: ['outlier', 'mainWord', 'reason']
                }
              }
            },
            required: ['conflicts']
          }
        }
      );

      const result = JSON.parse(response.content);
      return result.conflicts || [];
    } catch (error) {
      console.warn('[StoryGenerationService] LLM semantic validation failed:', error.message);
      return []; // Fail open - rely on sync validation
    }
  }

  _selectThemedWords(words, count, themeFocus, excludeWords = new Set()) {
    const availableWords = words.filter(w => !excludeWords.has(w.toUpperCase()));

    if (!themeFocus || availableWords.length === 0) {
      return availableWords.slice(0, count);
    }

    const themeWords = themeFocus
      .toUpperCase()
      .replace(/[^A-Z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3);

    const scored = availableWords.map(word => {
      const upperWord = word.toUpperCase();
      let score = 0;

      for (const tw of themeWords) {
        if (upperWord === tw) score += 3;
        else if (upperWord.includes(tw)) score += 2;
        else if (tw.includes(upperWord)) score += 1;
      }

      return { word: upperWord, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const result = [];
    const seen = new Set();
    for (const { word } of scored) {
      if (!seen.has(word)) {
        result.push(word);
        seen.add(word);
        if (result.length >= count) break;
      }
    }

    return result;
  }

  _determineTheme(outlierWords) {
    const themes = [
      { pattern: /EVIDENCE|PROOF|CLUE|WITNESS/, name: 'INVESTIGATION' },
      { pattern: /DEATH|KILL|MURDER|BLOOD/, name: 'VIOLENCE' },
      { pattern: /TRUST|BETRAY|LIE|TRUTH/, name: 'DECEPTION' },
      { pattern: /MONEY|WEALTH|RICH|GOLD/, name: 'GREED' },
      { pattern: /LOVE|HEART|PASSION/, name: 'PASSION' },
      { pattern: /POWER|CONTROL|FORCE/, name: 'POWER' },
      { pattern: /SECRET|HIDDEN|MYSTERY/, name: 'SECRETS' },
    ];

    const joined = outlierWords.join(' ');
    for (const theme of themes) {
      if (theme.pattern.test(joined)) {
        return theme.name;
      }
    }

    return 'CLUES';
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  async _updateStoryContext(entry) {
    const context = this.storyContext || {
      characters: {},
      plotPoints: [],
      revelations: [],
      relationships: {},
      consistencyFacts: [],
    };

    context.lastGeneratedChapter = entry.chapter;
    context.lastGeneratedSubchapter = entry.subchapter;
    context.lastPathKey = entry.pathKey;

    // Store consistency facts
    if (entry.consistencyFacts?.length > 0) {
      context.consistencyFacts = [
        ...(context.consistencyFacts || []),
        ...entry.consistencyFacts,
      ].slice(-50); // Keep last 50 facts
    }

    this.storyContext = context;
    await saveStoryContext(context);
  }

  _getPathKeyForChapter(chapter, choiceHistory) {
    const choice = choiceHistory.find(c => {
      const choiceChapter = this._extractChapterFromCase(c.caseNumber);
      return choiceChapter === chapter - 1;
    });
    return choice?.optionKey || 'ROOT';
  }

  _extractChapterFromCase(caseNumber) {
    if (!caseNumber) return 1;
    const chapterPart = caseNumber.slice(0, 3);
    return parseInt(chapterPart, 10) || 1;
  }

  _shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Singleton instance
export const storyGenerationService = new StoryGenerationService();
export default storyGenerationService;
