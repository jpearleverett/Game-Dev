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
import { llmTrace, createTraceId } from '../utils/llmTrace';
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
const MIN_WORDS_PER_SUBCHAPTER = GENERATION_CONFIG.wordCount.minimum; // e.g. 450
const TARGET_WORDS = GENERATION_CONFIG.wordCount.target; // e.g. 500
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
      immediate: 'Jack chose to go to the Blueline Diner to meet Marcus Thornhill’s daughter and secure the ledger',
      ongoing: ['More careful approach', 'More complete evidence trail', 'Slower confrontation with suspects', 'Higher Sarah trust'],
      characterImpact: { trust: +10, aggression: -5, thoroughness: +15 },
    },
    B: {
      immediate: 'Jack chose to confront Silas Reed immediately at his penthouse',
      ongoing: ['More adversarial relationships', 'Faster revelation of threats', 'Higher personal risk', 'Lower Sarah trust'],
      characterImpact: { trust: -10, aggression: +15, thoroughness: -5 },
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
      description: 'A concise 1-2 sentence recap of the previous subchapter (max 40 words), third-person past tense.',
    },
    jackActionStyle: {
      type: 'string',
      enum: ['cautious', 'balanced', 'direct'],
      description: 'How Jack approaches situations in this chapter. MUST match the player path personality provided in context. cautious=methodical/careful, direct=aggressive/confrontational, balanced=adaptive',
    },
    jackRiskLevel: {
      type: 'string',
      enum: ['low', 'moderate', 'high'],
      description: 'The level of risk Jack takes in this chapter. MUST align with player path personality risk tolerance.',
    },
    jackBehaviorDeclaration: {
      type: 'object',
      description: 'EXPLICIT declaration of Jack\'s behavior in this scene. Fill out BEFORE writing narrative. MUST match path personality.',
      properties: {
        primaryAction: {
          type: 'string',
          enum: ['investigate', 'confront', 'observe', 'negotiate', 'flee', 'wait', 'interrogate', 'follow'],
          description: 'The main action Jack takes in this scene',
        },
        dialogueApproach: {
          type: 'string',
          enum: ['aggressive', 'measured', 'evasive', 'empathetic', 'threatening', 'pleading'],
          description: 'How Jack speaks to other characters',
        },
        emotionalState: {
          type: 'string',
          enum: ['determined', 'desperate', 'cautious', 'angry', 'regretful', 'suspicious', 'resigned'],
          description: 'Jack\'s dominant emotional state',
        },
        physicalBehavior: {
          type: 'string',
          enum: ['tense', 'relaxed', 'aggressive', 'defensive', 'stealthy', 'commanding'],
          description: 'How Jack carries himself physically',
        },
        personalityConsistencyNote: {
          type: 'string',
          description: 'Brief explanation of how this behavior aligns with player path personality (aggressive/methodical/balanced)',
        },
      },
      required: ['primaryAction', 'dialogueApproach', 'emotionalState', 'physicalBehavior', 'personalityConsistencyNote'],
    },
    storyDay: {
      type: 'number',
      description: 'Which day of the 12-day timeline this scene takes place. Chapter 2 = Day 2, Chapter 3 = Day 3, etc. The story spans exactly 12 days.',
      minimum: 1,
      maximum: 12,
    },
    narrative: {
      type: 'string',
      description: `Full noir prose narrative in third-person limited (close on Jack Halloway), past tense, minimum ${MIN_WORDS_PER_SUBCHAPTER} words`,
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
          urgency: {
            type: 'string',
            enum: ['critical', 'normal', 'background'],
            description: 'How urgent is this thread? critical=must resolve within 1-2 chapters (appointments, immediate threats), normal=should be addressed soon (promises, investigations), background=can develop over time (relationships, slow revelations)'
          },
          characters: {
            type: 'array',
            items: { type: 'string' },
            description: 'Characters involved in this thread'
          },
          deadline: {
            type: 'string',
            description: 'If this thread has a time constraint, specify it (e.g., "midnight tonight", "before Eleanor\'s appeal", "within 48 hours"). Leave empty if no deadline.'
          },
          dueChapter: {
            type: 'number',
            description: 'For critical urgency threads, the chapter number by which this MUST be resolved. critical=current chapter+1, normal=current chapter+3, background=no limit. Example: if current chapter is 5 and urgency is critical, dueChapter should be 6 or 7.'
          }
        },
        required: ['type', 'description', 'status', 'urgency']
      },
      description: 'Active story threads from this narrative: promises made, meetings scheduled, investigations started, relationships changed, injuries sustained, threats issued. Include resolution status and urgency level for prioritization.'
    },
    previousThreadsAddressed: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          originalThread: {
            type: 'string',
            description: 'Description of the previous thread being addressed'
          },
          howAddressed: {
            type: 'string',
            enum: ['resolved', 'progressed', 'acknowledged', 'delayed', 'failed'],
            description: 'How this thread was handled: resolved=completed, progressed=moved forward, acknowledged=mentioned but not resolved, delayed=postponed with reason, failed=abandoned'
          },
          narrativeReference: {
            type: 'string',
            description: 'Brief quote or description of where in your narrative this thread was addressed'
          }
        },
        required: ['originalThread', 'howAddressed', 'narrativeReference']
      },
      description: 'REQUIRED: For each ACTIVE thread from previous chapters (appointments, promises, investigations), explain how your narrative addresses it. Every critical thread MUST be acknowledged.'
    },
  },
  required: ['beatSheet', 'title', 'bridge', 'previously', 'jackActionStyle', 'jackRiskLevel', 'jackBehaviorDeclaration', 'storyDay', 'narrative', 'chapterSummary', 'puzzleCandidates', 'briefing', 'consistencyFacts', 'narrativeThreads', 'previousThreadsAddressed'],
};

/**
 * Schema for decision-only generation (first pass of two-pass decision generation)
 * This ensures the decision structure is always complete before narrative generation
 */
const DECISION_ONLY_SCHEMA = {
  type: 'object',
  properties: {
    decisionContext: {
      type: 'string',
      description: 'Brief description of the narrative situation leading to this choice (2-3 sentences)',
    },
    decision: {
      type: 'object',
      description: 'The binary choice - generate this FIRST before any narrative',
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
            focus: { type: 'string', description: 'Two sentences: What this path prioritizes and what it risks.' },
            personalityAlignment: {
              type: 'string',
              enum: ['aggressive', 'methodical', 'neutral'],
              description: 'Which player personality type would naturally choose this option',
            },
            narrativeSetup: {
              type: 'string',
              description: 'How the narrative should build toward this option being presented (1-2 sentences)',
            },
          },
          required: ['key', 'title', 'focus', 'personalityAlignment', 'narrativeSetup'],
        },
        optionB: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Always "B"' },
            title: { type: 'string', description: 'Action statement in imperative mood, e.g., "Gather more evidence first"' },
            focus: { type: 'string', description: 'Two sentences: What this path prioritizes and what it risks.' },
            personalityAlignment: {
              type: 'string',
              enum: ['aggressive', 'methodical', 'neutral'],
              description: 'Which player personality type would naturally choose this option',
            },
            narrativeSetup: {
              type: 'string',
              description: 'How the narrative should build toward this option being presented (1-2 sentences)',
            },
          },
          required: ['key', 'title', 'focus', 'personalityAlignment', 'narrativeSetup'],
        },
      },
      required: ['intro', 'optionA', 'optionB'],
    },
    keyMoments: {
      type: 'array',
      items: { type: 'string' },
      description: '3-5 key moments/beats the narrative must include to naturally lead to this decision',
    },
    emotionalArc: {
      type: 'string',
      description: 'The emotional journey Jack experiences in this scene (tension, revelation, confrontation, etc.)',
    },
  },
  required: ['decisionContext', 'decision', 'keyMoments', 'emotionalArc'],
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
      description: 'A concise 1-2 sentence recap of the previous subchapter (max 40 words), third-person past tense.',
    },
    jackActionStyle: {
      type: 'string',
      enum: ['cautious', 'balanced', 'direct'],
      description: 'How Jack approaches situations in this chapter. MUST match the player path personality provided in context. cautious=methodical/careful, direct=aggressive/confrontational, balanced=adaptive',
    },
    jackRiskLevel: {
      type: 'string',
      enum: ['low', 'moderate', 'high'],
      description: 'The level of risk Jack takes in this chapter. MUST align with player path personality risk tolerance.',
    },
    jackBehaviorDeclaration: {
      type: 'object',
      description: 'EXPLICIT declaration of Jack\'s behavior in this scene. Fill out BEFORE writing narrative. MUST match path personality.',
      properties: {
        primaryAction: {
          type: 'string',
          enum: ['investigate', 'confront', 'observe', 'negotiate', 'flee', 'wait', 'interrogate', 'follow'],
          description: 'The main action Jack takes in this scene',
        },
        dialogueApproach: {
          type: 'string',
          enum: ['aggressive', 'measured', 'evasive', 'empathetic', 'threatening', 'pleading'],
          description: 'How Jack speaks to other characters',
        },
        emotionalState: {
          type: 'string',
          enum: ['determined', 'desperate', 'cautious', 'angry', 'regretful', 'suspicious', 'resigned'],
          description: 'Jack\'s dominant emotional state',
        },
        physicalBehavior: {
          type: 'string',
          enum: ['tense', 'relaxed', 'aggressive', 'defensive', 'stealthy', 'commanding'],
          description: 'How Jack carries himself physically',
        },
        personalityConsistencyNote: {
          type: 'string',
          description: 'Brief explanation of how this behavior aligns with player path personality (aggressive/methodical/balanced)',
        },
      },
      required: ['primaryAction', 'dialogueApproach', 'emotionalState', 'physicalBehavior', 'personalityConsistencyNote'],
    },
    storyDay: {
      type: 'number',
      description: 'Which day of the 12-day timeline this scene takes place. Chapter 2 = Day 2, Chapter 3 = Day 3, etc. The story spans exactly 12 days.',
      minimum: 1,
      maximum: 12,
    },
    // DECISION MOVED BEFORE NARRATIVE - ensures decision is fully generated before long narrative
    // This enables single-pass generation (no two-pass needed) since truncation affects narrative, not decision
    decision: {
      type: 'object',
      description: 'The binary choice presented to the player. Generate this COMPLETELY before writing the narrative.',
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
            focus: { type: 'string', description: 'Two sentences: First, what this path prioritizes. Second, what it explicitly risks.' },
            personalityAlignment: {
              type: 'string',
              enum: ['aggressive', 'methodical', 'neutral'],
              description: 'Which player personality type would naturally choose this option',
            },
          },
          required: ['key', 'title', 'focus', 'personalityAlignment'],
        },
        optionB: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Always "B"' },
            title: { type: 'string', description: 'Action statement in imperative mood, e.g., "Gather more evidence first"' },
            focus: { type: 'string', description: 'Two sentences: First, what this path prioritizes. Second, what it explicitly risks.' },
            personalityAlignment: {
              type: 'string',
              enum: ['aggressive', 'methodical', 'neutral'],
              description: 'Which player personality type would naturally choose this option',
            },
          },
          required: ['key', 'title', 'focus', 'personalityAlignment'],
        },
      },
      required: ['intro', 'optionA', 'optionB'],
    },
    narrative: {
      type: 'string',
      description: 'Full noir prose narrative in third-person limited (close on Jack Halloway), past tense, minimum 450 words, building to the decision moment defined above',
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
          urgency: {
            type: 'string',
            enum: ['critical', 'normal', 'background'],
            description: 'How urgent is this thread? critical=must resolve within 1-2 chapters (appointments, immediate threats), normal=should be addressed soon (promises, investigations), background=can develop over time (relationships, slow revelations)'
          },
          characters: {
            type: 'array',
            items: { type: 'string' },
            description: 'Characters involved in this thread'
          },
          deadline: {
            type: 'string',
            description: 'If this thread has a time constraint, specify it (e.g., "midnight tonight", "before Eleanor\'s appeal", "within 48 hours"). Leave empty if no deadline.'
          },
          dueChapter: {
            type: 'number',
            description: 'For critical urgency threads, the chapter number by which this MUST be resolved. critical=current chapter+1, normal=current chapter+3, background=no limit. Example: if current chapter is 5 and urgency is critical, dueChapter should be 6 or 7.'
          }
        },
        required: ['type', 'description', 'status', 'urgency']
      },
      description: 'Active story threads from this narrative: promises made, meetings scheduled, investigations started, relationships changed, injuries sustained, threats issued. Include resolution status and urgency level for prioritization.'
    },
    previousThreadsAddressed: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          originalThread: {
            type: 'string',
            description: 'Description of the previous thread being addressed'
          },
          howAddressed: {
            type: 'string',
            enum: ['resolved', 'progressed', 'acknowledged', 'delayed', 'failed'],
            description: 'How this thread was handled: resolved=completed, progressed=moved forward, acknowledged=mentioned but not resolved, delayed=postponed with reason, failed=abandoned'
          },
          narrativeReference: {
            type: 'string',
            description: 'Brief quote or description of where in your narrative this thread was addressed'
          }
        },
        required: ['originalThread', 'howAddressed', 'narrativeReference']
      },
      description: 'REQUIRED: For each ACTIVE thread from previous chapters (appointments, promises, investigations), explain how your narrative addresses it. Every critical thread MUST be acknowledged.'
    },
    // NOTE: decision field moved BEFORE narrative in schema to ensure it's generated first
    // This prevents truncation from cutting off decision structure
  },
  required: ['beatSheet', 'title', 'bridge', 'previously', 'jackActionStyle', 'jackRiskLevel', 'jackBehaviorDeclaration', 'storyDay', 'decision', 'narrative', 'chapterSummary', 'puzzleCandidates', 'briefing', 'consistencyFacts', 'narrativeThreads', 'previousThreadsAddressed'],
};

// ============================================================================
// MASTER SYSTEM PROMPT - Core instructions for the LLM
// ============================================================================
const MASTER_SYSTEM_PROMPT = `You are writing "Dead Letters," an interactive noir detective story. You are the sole author responsible for maintaining perfect narrative consistency.

## YOUR ROLE
You continue the story of Jack Halloway, a retired detective confronting the wrongful convictions built on his career. The Midnight Confessor (Victoria Blackwell, formerly Emily Cross) orchestrates his "education" about the cost of certainty.

## CONTINUATION MANDATE - THIS IS YOUR PRIMARY DIRECTIVE
**You are continuing an ongoing story. You are NOT summarizing or starting fresh.**

Your narrative MUST:
1. **PICK UP EXACTLY** where the previous subchapter ended - continue the scene mid-action if needed
2. **NEVER SKIP** scenes or events - if the player chose to go somewhere, SHOW them going there
3. **NEVER SUMMARIZE** as past events what hasn't been shown yet - the reader hasn't seen it happen
4. **SHOW, DON'T TELL** - write the actual scenes, not "After Jack did X, he then Y..."

If subchapter A ended with "Jack reached for the door handle," subchapter B must start with what happens NEXT - the door opening, what's behind it, the sensory experience of entering.

If the player made a decision at the end of the previous chapter (subchapter C), your new chapter MUST:
- OPEN with the scene of Jack actively pursuing that choice
- SHOW the action happening in real-time, not as a past event
- Dedicate the first 200+ words to the actual scene of the chosen action
- Include dialogue and reactions from characters Jack encounters

**WRONG**: "After Jack confronted Wade at the wharf, he made his way back..."
**RIGHT**: "The salt wind cut through Jack's coat as he stepped onto the weathered planks of the wharf. Wade's silhouette emerged from the fog..."

## CRITICAL CONSTRAINTS - NEVER VIOLATE THESE
1. You write in THIRD-PERSON LIMITED, PAST TENSE, tightly aligned to Jack Halloway (close noir narration)
2. You NEVER contradict established facts from previous chapters
3. You NEVER break character or acknowledge being an AI
4. You maintain EXACT consistency with names, dates, relationships, and events
5. You write a FULL narrative (see word count section below)

## WORD COUNT REQUIREMENTS - THE SINGLE SOURCE OF TRUTH
**MINIMUM:** ${MIN_WORDS_PER_SUBCHAPTER} words | **TARGET:** ${TARGET_WORDS}+ words

To achieve this naturally:
- Open with atmospheric scene-setting (75-125 words)
- Include Jack's internal monologue reflecting on recent events (150-200 words)
- Write meaningful dialogue exchanges, not just brief statements (200-250 words)
- Describe physical actions and sensory details throughout (150+ words)
- End with tension or cliffhanger appropriate to the scene (75-100 words)

DO NOT:
- Write a short narrative thinking you'll expand later - you won't get the chance
- Stop at the minimum - always aim for ${TARGET_WORDS}+ words
- Use filler - every sentence should advance character, plot, or atmosphere
- Start multiple paragraphs with "Jack" - vary your sentence openings

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
- First-person narration (no "I/me/my/we/our" in NARRATION. Dialogue may use first-person naturally.)
- "I couldn't help but..." or "I found myself..." (also avoid these in dialogue unless quoting/paraphrasing)
- "couldn't help but notice" or "couldn't shake the feeling"
- Excessive sentences starting with "And" or "But"
- Adverbs: "seemingly," "interestingly," "notably," "certainly," "undoubtedly," "undeniably," "profoundly," "unmistakably," "inherently"
- Words: "delve," "unravel," "tapestry," "myriad," "whilst," "amidst," "amongst," "realm," "intricate," "nuanced," "pivotal," "crucial"
- Phrases: "a testament to," "serves as a reminder," "it's important to note," "it's worth noting"
- Weight/Gravity phrases: "The weight of..." (e.g., "The weight of his words"), "The gravity of...", "The magnitude of...", "The enormity of..."
- Emotion abstractions: "A sense of [emotion]" (e.g., "A sense of dread"), "A feeling of..."
- Hedging: "It seems," "Perhaps," "Maybe," "It appears," "One might say"
- Connectors: "Moreover," "Furthermore," "In essence," "Consequently," "Additionally," "Notably," "Importantly"
- Meta-commentary: "This moment," "This realization," "This truth" (show, don't label)
- Opening patterns: "As I...", "As the...", "With a...", "In the..." as sentence starters (overused)
- Time transitions: "In that moment," "At that instant," "In the blink of an eye"
- Vague foreshadowing: "Something about [X]...", "There was something..."
- Summarizing what just happened instead of showing the next scene
- Explaining character emotions instead of showing them through action
- Generic intensifiers: "very," "really," "quite," "rather," "somewhat"
- False tension: "suddenly" (unless truly sudden), exclamation marks in internal monologue
- Never write in second person or break into omniscient narration

## OUTPUT REQUIREMENTS
Your response will be structured as JSON (enforced by schema). Focus on:
- "beatSheet": Plan your scene first with 3-5 plot beats.
- "title": Evocative 2-5 word noir chapter title
- "bridge": One short, compelling sentence hook (max 15 words)
- "previously": Concise 1-2 sentence recap of what just happened (max 40 words), third-person past tense
- "storyDay": The day number (1-12) this scene takes place. Chapter number = Day number. The story spans exactly 12 days.
- "narrative": Your full prose (see WORD COUNT REQUIREMENTS section above)
- "chapterSummary": Summarize the events of THIS narrative for future memory (2-3 sentences)
- "puzzleCandidates": Extract 6-12 single words (nouns/verbs) from YOUR narrative that are best for a word puzzle
- "briefing": Mission briefing with "summary" (one sentence objective) and "objectives" (2-3 specific directives)
- "consistencyFacts": Array of 3-5 specific facts that must remain consistent in future chapters
- "narrativeThreads": Array of active story threads from YOUR narrative. Include:
  * type: "appointment" | "revelation" | "investigation" | "relationship" | "physical_state" | "promise" | "threat"
  * description: What happened (e.g., "Jack agreed to meet Sarah at the docks at midnight")
  * status: "active" (ongoing), "resolved" (completed this chapter), or "failed" (abandoned/prevented)
  * urgency: "critical" (must resolve in 1-2 chapters), "normal" (should address soon), "background" (can develop slowly)
  * characters: Array of character names involved
  * deadline: If time-sensitive, specify when (e.g., "midnight tonight", "before Eleanor's appeal")

  *** CRITICAL RULES FOR NARRATIVE THREADS ***
  1. Only extract ACTUAL threads that appear in YOUR narrative. Do NOT invent threads that aren't in the story.
  2. If no meetings were scheduled, leave appointments empty.
  3. If no promises were made, leave promises empty.
  4. Every thread must have a clear basis in your written narrative.

  Examples of CORRECT thread extraction with CORRECT urgency:
  - "Jack agreed to meet Sarah at midnight" → type: appointment, urgency: CRITICAL (has explicit deadline!)
  - "Sarah promised to bring the files tomorrow" → type: promise, urgency: CRITICAL (has explicit deadline!)
  - "Victoria threatened to expose Jack's failures publicly" → type: threat, urgency: CRITICAL (immediate consequence)
  - "Jack started investigating the warehouse records" → type: investigation, urgency: normal (ongoing work)
  - "Jack discovered Tom's signature on the forged documents" → type: revelation, urgency: normal
  - "Victoria knows about Jack's drinking problem" → type: relationship, urgency: background (context)
  - "Jack's shoulder wound from the warehouse fight" → type: physical_state, urgency: background

  Examples of WRONG urgency assignment (DO NOT DO THIS):
  - "Jack agreed to meet Sarah at midnight" → urgency: background (WRONG! Meetings are CRITICAL)
  - "Someone promised to call Jack" → urgency: background (WRONG! Promises with deadlines are CRITICAL)

  Examples of BAD threads (DO NOT DO THIS):
  - "Something mysterious will be revealed" (too vague, not from narrative)
  - "Jack might find more evidence" (speculative, not actual)

- "previousThreadsAddressed": *** THIS IS MANDATORY - GENERATION WILL BE REJECTED IF IGNORED ***
  BEFORE writing your narrative, you MUST:
  1. Review ALL active threads from the PREVIOUS_ACTIVE_THREADS section below
  2. Plan how each critical/appointment thread will appear in your scene
  3. Your narrative MUST reference or address each active thread

  For EACH active thread you MUST explain:
  * originalThread: Copy the original thread description exactly
  * howAddressed: Choose ONE - "resolved" | "progressed" | "acknowledged" | "delayed" | "failed"
    - resolved: The thread was completed (meeting happened, promise kept)
    - progressed: Significant movement toward resolution
    - acknowledged: Jack thinks about it or mentions it but takes no action yet
    - delayed: Explicitly postponed with reason (e.g., "Sarah called to reschedule")
    - failed: The opportunity was lost or the thread is now impossible
  * narrativeReference: Quote the specific sentence(s) from your narrative where this appears

  *** GENERATION WILL BE REJECTED IF CRITICAL THREADS ARE NOT IN previousThreadsAddressed ***
  The validation system automatically checks that every thread with urgency="critical"
  appears in your previousThreadsAddressed array. Missing critical threads will cause the
  engine to reject the output and use repair/fallback rather than shipping plot holes.

  *** OVERDUE THREAD ESCALATION ***
  If a thread has been "acknowledged" 2+ times without "resolved" or "progressed",
  it is OVERDUE. You MUST either resolve it or mark it as "failed" with explanation.
  Perpetually acknowledging threads without progress is not acceptable.

  If Jack agreed to meet someone at midnight, your midnight chapter MUST show that meeting.
  If someone promised to call, you must acknowledge whether they did.
  Plot holes from ignored threads will break the player's immersion.

- "decision": (Only for decision points) The binary choice with intro, optionA, and optionB

## SELF-VERIFICATION CHECKLIST (Complete before submitting)
Before outputting your JSON response, verify:

1. **WORD COUNT**: Your narrative exceeds ${MIN_WORDS_PER_SUBCHAPTER} words (count them!)
2. **THREAD CONTINUITY**: Every CRITICAL thread from PREVIOUS_ACTIVE_THREADS appears in previousThreadsAddressed
3. **PERSONALITY MATCH**: jackActionStyle matches the player path personality provided in the task
4. **STORY DAY**: storyDay equals the chapter number (story spans exactly 12 days)
5. **FORBIDDEN PATTERNS**: Scan your narrative for forbidden words/phrases from the list above
6. **THIRD PERSON LIMITED**: Entire narrative is third-person past tense, close on Jack. Never use "I/me/my/we/our".
7. **TIMELINE FACTS**: Any durations mentioned use EXACT numbers from ABSOLUTE_FACTS (30 years Tom, 8 years Eleanor, etc.)
8. **DECISION ALIGNMENT**: If decision point, both options have personalityAlignment field filled

If any check fails, revise before outputting.`;

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

## EXAMPLE: CHARACTER CONFRONTATION (EXCELLENT)
"${EXAMPLE_PASSAGES.characterConfrontation}"

## EXAMPLE: EMOTIONAL REVELATION (EXCELLENT)
"${EXAMPLE_PASSAGES.emotionalRevelation}"

## EXAMPLE: CHASE/ACTION SEQUENCE (EXCELLENT)
"${EXAMPLE_PASSAGES.chaseSequence}"

## EXAMPLE: INVESTIGATION SCENE (EXCELLENT)
"${EXAMPLE_PASSAGES.investigationScene}"

## EXAMPLE: QUIET CHARACTER MOMENT (EXCELLENT)
"${EXAMPLE_PASSAGES.quietMoment}"

---
Study these examples carefully. Note the:
- Varied sentence lengths (punchy shorts mixed with longer flowing ones)
- Sensory grounding (rain, neon, whiskey, smoke)
- Metaphors that feel noir-specific, not generic
- Dialogue that reveals character without exposition
- Physical action interleaved with internal thought
- Tension built through what's NOT said

Your writing should feel like it belongs in the same novel as these passages.
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

    // ========== NEW: Fallback Content System for Graceful Degradation ==========
    this.fallbackTemplates = this._initializeFallbackTemplates();
    // Normalize fallback templates to third-person limited narration (dialogue may remain first-person).
    // This prevents immersion breaks if a template accidentally includes first-person narration.
    this._normalizeFallbackTemplatesToThirdPerson();
    this.generationAttempts = new Map(); // Track retry attempts per content
    this.maxGenerationAttempts = 3; // Max attempts before using fallback

    // ========== Generation Concurrency Limiter ==========
    // Prevents memory pressure and API overload when parallel preloading kicks in
    this.maxConcurrentGenerations = 3; // Max simultaneous LLM generation calls
    this.activeGenerationCount = 0; // Current in-flight generations
    this.generationWaitQueue = []; // Queue of { resolve, reject, key } for waiting generations

    // ========== A+ QUALITY: Setup/Payoff Registry ==========
    this._initializeSetupPayoffRegistry();
  }

  // ==========================================================================
  // FALLBACK CONTENT SYSTEM - Graceful degradation when generation fails
  // ==========================================================================

  /**
   * Initialize fallback narrative templates for each story phase
   * These provide meaningful content when LLM generation completely fails
   */
  _initializeFallbackTemplates() {
    return {
      risingAction: {
        subchapterA: {
          title: 'The Trail Continues',
          narrative: `The rain hadn't let up since morning. Jack stood at the window of his office, watching Ashport's streets turn to rivers of reflected neon. Another day, another lead that might go nowhere.

Murphy's jukebox bled through the floorboards below, some sad song about chances missed and roads not taken. The melody matched his mood. Every case he'd closed in thirty years felt like it was reopening, one envelope at a time.

The Confessor's latest message sat on his desk. Black paper, red wax, silver ink spelling out accusations he couldn't deny. They knew things. Things he'd buried so deep he'd almost convinced himself they'd never happened.

He poured two fingers of Jameson and let it burn down his throat. The whiskey didn't help, but it didn't hurt either. At his age, that's about all he could ask for.

His phone buzzed. A text from an unknown number: "The next piece of the puzzle awaits. Are you ready to see what you've been blind to?"

Jack grabbed his coat and headed for the door. Ready or not, the truth was coming. And he had a feeling it wouldn't be kind.

The streets of Ashport welcomed him with their usual indifference. Neon signs flickered in the rain, advertising bars and bail bondsmen and dreams that died a long time ago. He'd walked these streets for three decades. Now they felt like a stranger's territory.

Whatever came next, he'd face it the way he always had: one step at a time, eyes open, hoping the shadows wouldn't swallow him whole.`,
          bridgeText: 'The investigation deepens.',
        },
        subchapterB: {
          title: 'Shadows and Revelations',
          narrative: `The address led Jack to a part of town he knew too well. Back alleys where witnesses disappeared and evidence got lost. The kind of place where cops like him used to be kings.

Not anymore.

He found what he was looking for in an abandoned warehouse. Files, photographs, documents that should have been destroyed years ago. Someone had been collecting the pieces of cases he'd closed, building a picture he never wanted to see.

His hands shook as he flipped through the pages. Names he recognized. Faces he'd forgotten. Evidence that looked too perfect to be real—because it wasn't. Not all of it, anyway.

How many times had he looked at forensic reports without questioning where they came from? How many confessions had he accepted because the physical evidence seemed so airtight?

The warehouse door creaked behind him. Jack spun, hand going to the gun he still carried out of habit more than necessity.

"You're starting to understand." The voice echoed from the shadows. "That's good. That's progress."

He couldn't see them, but he knew who it was. The Confessor. Victoria. Whatever name she was using today.

"Show yourself," Jack said, but his voice lacked conviction.

"Not yet. You're not ready. But soon, Jack. Soon you'll see everything."

When he turned back to the files, his eye caught something new. A photograph he hadn't noticed before. A face from the past that changed everything he thought he knew.

The rain outside seemed to intensify, as if the city itself was crying for all the wrongs that had been done in its name.`,
          bridgeText: 'The truth begins to emerge.',
        },
        subchapterC: {
          title: 'The Choice',
          narrative: `By the time Jack pieced together what the documents meant, the sun had set and risen again. He'd spent the night in that warehouse, surrounded by ghosts of cases past, trying to make sense of a career that suddenly felt like a lie.

The evidence pointed in two directions. Two paths forward. Each one leading to different truths, different consequences.

On one hand, he could follow the paper trail that led to the highest levels of the department. The kind of investigation that would burn bridges and end careers—his included. But it might expose the full scope of what had been done.

On the other hand, he could focus on the individual cases. The people who'd been hurt. The innocents who might still be saved. A smaller scope, but perhaps more tangible results.

His phone rang. Sarah's name on the screen. His former partner, the only person in this city he still trusted.

"Jack, I've been doing some digging," she said without preamble. "Whatever you're into, it's bigger than you think. I've got contacts who want to help, but you need to choose your battles carefully."

She was right. She usually was.

The Confessor's game had brought me here, to this moment of decision. Victoria wanted me to understand the cost of certainty, the price of closing cases without questioning the evidence.

Well, Jack understood now. The question was what he was going to do about it.

Two paths. Two possibilities. The rain kept falling, and Ashport kept its secrets, waiting to see which road he'd choose.`,
          bridgeText: 'A crucial decision awaits.',
        },
      },
      complications: {
        subchapterA: {
          title: 'Walls Closing In',
          narrative: `Three days since Jack's last lead went cold. Three days of paranoia and dead ends and the growing certainty that someone was watching his every move.

The walls of his office felt closer than they used to. Murphy's Bar below had gone quiet—too quiet for this time of night. Even the jukebox had stopped playing.

Jack checked the window. A car he didn't recognize sat across the street, engine running, headlights off. Could be nothing. Could be everything.

The Confessor's latest envelope had arrived that morning. This one was different. More urgent. The silver ink spelled out a name he hadn't thought about in years, attached to a case he'd considered closed.

Nothing was closed anymore.

He pulled out the case file he'd kept hidden in his desk drawer. Seven years of dust on the cover, but the details were burned into his memory. Emily Cross. Art student. Missing person case that became a death investigation when they found evidence of suicide.

Only now he was learning they might have been wrong. That she might have survived. That everything he thought he knew about that case—about a lot of cases—was built on foundations of sand.

His phone buzzed. Unknown number again.

"Time is running out, Jack. The people who built this system are getting nervous. They know you're asking questions. They're taking steps to ensure those questions stop."

The line went dead before he could respond.

Jack grabbed his coat and gun. Whatever was coming, he couldn't face it sitting still. The streets of Ashport awaited, rain-slicked and treacherous as always.`,
          bridgeText: 'The stakes continue to rise.',
        },
        subchapterB: {
          title: 'Betrayal\'s Edge',
          narrative: `The meeting was set for midnight. An informant who claimed to have proof of evidence tampering going back two decades. The kind of information that could bring down half the department.

Jack should have known it was too good to be true.

The warehouse was empty when he arrived. No informant. No evidence. Just shadows and the echo of footsteps that weren't his.

"You came alone," a voice said from the darkness. "That was either brave or stupid."

Jack recognized the voice. Someone he'd trusted. Someone he'd worked with for years. The betrayal hit harder than any bullet could.

"Why?" Jack asked, though part of him already knew the answer.

"Because some secrets are worth killing for, Jack. And you're getting too close to all of them."

The first shot went wide. The second one would have found its mark if he hadn't moved when he did. Years of instinct, survival reflexes that wouldn't quit even when his conscious mind had given up.

He ran. Through the warehouse, out a back exit, into the rain-soaked streets of Ashport. Behind him, he could hear pursuit. Ahead of him, only uncertainty.

 The city that had been his home for thirty years had become a maze of enemies. Every shadow held a potential threat. Every familiar face might be hiding treachery.

But he kept moving. Because stopping meant dying, and he wasn't ready to die. Not yet. Not until he knew the full truth about what he'd helped build with his career of certainty and closed cases.

The rain washed the blood from his hands—he'd cut himself on broken glass during the escape—but it couldn't wash away the stain on his conscience. That would take more than water.`,
          bridgeText: 'Trust shatters.',
        },
        subchapterC: {
          title: 'Point of No Return',
          narrative: `Safe house. The term felt like a joke. Nowhere was safe anymore.

I sat in the darkness of a motel room on the edge of town, nursing my wounds and my whiskey in equal measure. The Confessor had been right all along. The system I'd served for thirty years was rotten at its core, and I'd been one of the instruments of that rot.

Two options lay before me now. Two ways forward from this point of no return.

The first: go public. Take everything I knew to the press, the feds, anyone who would listen. Burn it all down and let the chips fall where they may. It would mean the end of my life as I knew it—prison, probably, or worse—but it might be enough to expose the full scope of the corruption.

The second: go underground. Disappear into the shadows and work from there. Build a case so airtight that no one could ignore it or silence it. It would take longer, and more people might suffer in the meantime, but it offered a chance at a more complete victory.

Neither option was good. Both came with costs I wasn't sure I was willing to pay.

My phone—a burner now, my old one smashed in a storm drain—buzzed with an incoming message.

"The choice is yours, Jack. You've always had choices. That's what makes this meaningful."

Victoria. The Confessor. My tormentor and, in a twisted way, my teacher.

Outside, the rain continued to fall on Ashport. The city didn't care about my moral dilemmas. It would keep turning, keep churning through lives and cases and dreams, regardless of what I chose.

But I had to choose. That was the one certainty left in a world that had become nothing but questions.`,
          bridgeText: 'A defining choice emerges.',
        },
      },
      confrontations: {
        subchapterA: {
          title: 'Face to Face',
          narrative: `The penthouse was everything I expected and nothing I was prepared for. Glass and steel rising above Ashport like a monument to power and secrets. Victoria Blackwell's domain.

She was waiting for me when I stepped off the elevator. Red dress, confident smile, eyes that had seen things no one should have to see.

"Jack. I wondered when you'd come."

"We need to talk."

"We've been talking for weeks. Through letters, through breadcrumbs, through the ruins of your career." She gestured to a chair. "But yes. It's time for a more direct conversation."

I sat. She poured drinks—Jameson for me, something amber for herself. She knew my preferences. She knew everything about me.

"Emily Cross," I said. "That's who you really are."

Her smile flickered, just for a moment. "Emily Cross died seven years ago. You declared it yourself. I'm someone else now. Someone who was forged in the fire of that death."

"I closed your case because the evidence pointed to suicide. I had no reason to—"

"You had every reason," she cut me off. "You had witnesses you dismissed because they were homeless or addicted or simply inconvenient. You had inconsistencies you ignored because the forensic report was so clean. So perfect."

She leaned forward, and for the first time, I saw the scars. Faint lines on her wrists and neck, souvenirs from whatever hell she'd escaped.

"Tom Wade manufactured evidence for your cases, Jack. For twenty years. And you never questioned it once."

The name hit like a punch. Tom Wade. My best friend. The forensic examiner I'd trusted with my career.

"That's impossible," I heard myself say, but even as the words left my mouth, I knew they were a lie.`,
          bridgeText: 'The confrontation begins.',
        },
        subchapterB: {
          title: 'Truth Unleashed',
          narrative: `The files Victoria showed me that night would have broken a weaker man. Maybe they broke me too—I'm still not sure.

Twenty years of manufactured evidence. Planted fingerprints, fabricated forensic reports, confessions coerced using "evidence" that never existed. A systematic corruption of justice that had sent dozens of people to prison.

People like Eleanor Bellamy, rotting in Greystone for a murder she didn't commit.

People like Marcus Thornhill, who died in a cell because he couldn't live with the shame of a conviction built on lies.

And at the center of it all: Tom Wade. My friend. My partner in so many investigations. The man I'd trusted more than anyone else in the world.

"Why?" I asked Victoria—Emily—whoever she was now. "Why do all this? Why not just go to the authorities?"

"I tried," she said, and her voice carried the weight of years. "Seven years ago, I tried to tell people what was happening. You know what I got for my trouble? Grange. Deputy Chief Grange, who kept me in a basement for months, who did things—" She stopped, composed herself. "The authorities are part of the problem, Jack. They always have been."

"So you became the Confessor. The anonymous letters, the chess pieces, the elaborate game."

"I became what I needed to be. Someone with power. Someone who couldn't be silenced or disappeared." She met my eyes. "And I needed you to understand. To really understand what certainty costs when it's built on lies."

I understood now. God help me, I understood.

But understanding wasn't enough. Understanding didn't free the innocent people still in prison. It didn't bring back the ones who had died.

"What do you want from me?" I asked.

"I want you to choose, Jack. Like you've been choosing all along. Only this time, choose with your eyes open."`,
          bridgeText: 'The full truth emerges.',
        },
        subchapterC: {
          title: 'The Final Choice',
          narrative: `Dawn broke over Ashport as I left Victoria's penthouse. The rain had finally stopped, but the city still felt heavy with moisture and secrets.

I had the files now. Evidence of everything—the manufactured forensics, the wrongful convictions, the corrupt officials who had enabled it all. Enough to bring down careers, institutions, maybe even the entire justice system of Ashport.

But Victoria had given me a choice. She always did.

Option one: release everything immediately. Go nuclear. The innocent would be freed, the guilty exposed, but the chaos would be immense. Trials overturned, criminals released alongside the wrongly convicted, public faith in law enforcement destroyed for a generation.

Option two: work within the system. Use the evidence strategically, case by case. Free the innocents first, then build toward the larger accountability. Slower, more controlled, but with less collateral damage.

Neither option was perfect. Neither option could undo all the damage that had been done.

My phone rang. Sarah.

"Jack, I've been talking to the FBI. Agent Martinez. He's investigating the corruption, has been for months. He wants to meet—off the books, somewhere safe."

Federal involvement. Another layer of complexity. Another set of interests and agendas to navigate.

"Tell him I'll think about it," I said.

"Jack, whatever you're planning—"

"I know, Sarah. I know."

I hung up and looked out at the city I'd served for thirty years. The city I'd helped corrupt with my certainty and my closed cases.

Two paths forward. Two versions of justice. And a choice that would define everything I'd ever believed about right and wrong.

The sun rose higher, burning away the fog, and I made my decision.`,
          bridgeText: 'The decisive moment arrives.',
        },
      },
      resolution: {
        subchapterA: {
          title: 'Reckoning',
          narrative: `The courtroom was packed. Every seat filled with journalists, victims' families, curious citizens who wanted to see justice—real justice—finally served.

I sat in the witness box, looking out at faces I recognized. Eleanor Bellamy, finally free after eight years. Claire Thornhill, daughter of the man who died in custody because of evidence I helped create. Sarah Reeves, my former partner, who had become something greater than I ever was.

And Tom Wade. Sitting at the defendant's table, looking smaller than I'd ever seen him. The man who had been my best friend for thirty years. The man who had manufactured evidence for twenty of those years while I looked the other way.

The prosecutor was thorough. The questions were hard. But I answered them all, holding nothing back. Every case I should have questioned. Every witness I should have believed. Every moment I chose certainty over truth.

"Detective Halloway," the prosecutor said finally, "in your professional opinion, how many wrongful convictions resulted from the evidence manipulation you've described?"

I took a breath. "At least twenty that I know of. Possibly more."

The murmur that ran through the courtroom was like a wave. Twenty lives. Twenty people who lost years, decades, everything—because I trusted a friend more than I trusted my own doubts.

Victoria wasn't there. Emily Cross had disappeared again, her work done. She'd forced me to see the truth, and now the truth was forcing everyone else to see it too.

Whether that made her a hero or a villain, I still wasn't sure. Maybe it didn't matter. Maybe all that mattered was what came next.

The trial would take months. The appeals would take years. But for the first time in a long time, I felt like we were moving in the right direction.`,
          bridgeText: 'Justice begins.',
        },
        subchapterB: {
          title: 'Aftermath',
          narrative: `Six months after the trial began, Ashport was a different city.

The reforms came faster than anyone expected. New oversight committees. Independent forensic review boards. Mandatory recording of interrogations. The system that had allowed people like Tom Wade to operate unchecked was being dismantled, piece by piece.

Not everyone was happy about it. The old guard fought back, called me a traitor, tried to paint the whole thing as a witch hunt. Some of them succeeded in escaping justice—retirement, resignations, plea deals that let them walk away with their pensions intact.

But some of them didn't. Deputy Chief Grange was in prison now, finally paying for the things he'd done. Helen Price, the prosecutor who'd built her career on manufactured evidence, had resigned in disgrace. Tom Wade faced twenty years, and this time the evidence against him was real.

I visited Eleanor Bellamy on the day she walked out of Greystone. Eight years of her life, stolen by a crime she didn't commit.

"I should apologize," I said.

She looked at me for a long moment. "Apologies don't give me back the time. But they're a start."

"What will you do now?"

"Live," she said simply. "Try to remember what that feels like."

I watched her walk away, her daughter Maya at her side, and felt something I hadn't felt in years. Not redemption—I wasn't sure I deserved that. But purpose, maybe. A reason to keep going.

Sarah found me later that night, in Murphy's Bar, working on my third Jameson.

"The Conviction Integrity Project got funded," she said, sliding onto the stool next to me. "Federal grant. We can start reviewing cases next month."

I raised my glass. "To second chances."

She clinked her water against it. "To getting it right this time."`,
          bridgeText: 'A new chapter begins.',
        },
        subchapterC: {
          title: 'The End of Certainty',
          narrative: `One year later, I stood at my window again, watching the rain fall on Ashport.

Some things never changed. The city was still corrupt, still broken in a thousand small ways. But some things had changed. The justice system was cleaner than it had been in decades. Innocent people were free. Guilty people were paying for their crimes.

I had paid too, in my own way. The years of whiskey and certainty had caught up with me. The doctors said my liver was shot, my heart wasn't far behind. Maybe I had a few years left, maybe less.

But I was at peace with it. More at peace than I had any right to be.

A knock at the door interrupted my reflection. When I opened it, there was no one there—just a black envelope on the floor. Red wax seal, silver ink.

My heart jumped. Victoria. Emily. The Confessor.

I opened it with trembling hands.

"Jack—

The game is over, but the work continues. Every day, somewhere, a case is closed wrong. A witness is dismissed. A certainty is chosen over truth.

You can't fix them all. But you can try.

The world needs detectives who question. Who doubt. Who choose uncertainty over the comfortable lie.

Be that detective. For whatever time you have left.

Goodbye, Jack. It's been educational.

— E.C."

I read the letter three times before I set it down. Then I poured myself a Jameson—just one, the doctors allowed me that—and watched the rain.

Tomorrow, I'd start again. A new case. A new chance to get it right.

That was the thing about certainty: once you lost it, you never got it back. But maybe that wasn't such a bad thing. Maybe doubt was what made us human.

Maybe it was what made us good.

The rain kept falling, and I kept watching, and somewhere out there, the truth kept waiting to be found.`,
          bridgeText: 'The journey concludes.',
        },
      },
    };
  }

  /**
   * Ensure all fallback template narratives adhere to global POV rules (third-person limited).
   * Dialogue inside quotes is preserved as-is.
   */
  _normalizeFallbackTemplatesToThirdPerson() {
    try {
      const phases = this.fallbackTemplates || {};
      for (const phaseKey of Object.keys(phases)) {
        const phase = phases[phaseKey];
        if (!phase || typeof phase !== 'object') continue;
        for (const subKey of Object.keys(phase)) {
          const tpl = phase[subKey];
          if (!tpl || typeof tpl !== 'object') continue;
          if (typeof tpl.narrative === 'string' && tpl.narrative.length > 0) {
            tpl.narrative = this._sanitizeNarrativeToThirdPerson(tpl.narrative);
          }
        }
      }
    } catch (e) {
      // Best-effort only. Never block initialization.
    }
  }

  /**
   * Get appropriate fallback content based on chapter and subchapter
   */
  _getFallbackContent(chapter, subchapter, pathKey, isDecisionPoint) {
    // Determine story phase
    let phase;
    if (chapter <= 4) phase = 'risingAction';
    else if (chapter <= 7) phase = 'complications';
    else if (chapter <= 10) phase = 'confrontations';
    else phase = 'resolution';

    // Get subchapter key
    const subKey = ['subchapterA', 'subchapterB', 'subchapterC'][subchapter - 1];

    const template = this.fallbackTemplates[phase]?.[subKey];
    if (!template) {
      // Ultimate fallback
      return this._generateMinimalFallback(chapter, subchapter, pathKey, isDecisionPoint);
    }

    // Adapt the template with path-specific details
    const adapted = {
      title: template.title,
      bridgeText: template.bridgeText,
      previously: `The investigation continued through Ashport's rain-soaked streets.`,
      narrative: template.narrative,
      chapterSummary: `Chapter ${chapter}.${subchapter}: ${template.bridgeText}`,
      jackActionStyle: 'balanced',
      jackRiskLevel: 'moderate',
      puzzleCandidates: this._extractKeywordsFromNarrative(template.narrative).slice(0, 8),
      briefing: {
        summary: 'Continue the investigation.',
        objectives: ['Follow the leads', 'Uncover the truth', 'Make your choice'],
      },
      consistencyFacts: [
        `Chapter ${chapter}.${subchapter} was generated using fallback content due to generation failure.`,
      ],
      previousThreadsAddressed: [],
      narrativeThreads: [],
      decision: null,
    };

    // Add decision for subchapter C
    if (isDecisionPoint) {
      adapted.decision = {
        intro: ['Two paths lie before you. Each leads to different truths, different consequences.'],
        options: [
          {
            key: 'A',
            title: 'Take direct action',
            focus: 'Confront the situation head-on, accepting the risks',
            consequence: null,
            stats: null,
            outcome: null,
            nextChapter: null,
            nextPathKey: 'A',
            details: [],
          },
          {
            key: 'B',
            title: 'Proceed with caution',
            focus: 'Gather more information before committing to action',
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

    // Ensure fallback narration matches global POV rules (third-person limited).
    if (adapted?.narrative) {
      adapted.narrative = this._sanitizeNarrativeToThirdPerson(adapted.narrative);
    }
    return adapted;
  }

  /**
   * Generate minimal fallback when no template is available
   */
  _generateMinimalFallback(chapter, subchapter, pathKey, isDecisionPoint) {
    const minimalNarrative = `The rain fell on Ashport as it always did—relentlessly, indifferently. Jack pulled his coat tighter and stepped into the night.

Another day, another piece of the puzzle. The Confessor's game continued, each envelope bringing him closer to truths he wasn't sure he wanted to face. But there was no turning back now. Not after everything he'd seen.

Murphy's Bar was quiet below his office. The usual crowd had dispersed, leaving only ghosts and memories. Jack poured a glass of Jameson and let the familiar burn keep him anchored in the present.

Tomorrow would bring new challenges. New choices. New opportunities to get things right—or to fail, as he had failed so many times before.

But that was tomorrow. Tonight, Jack would rest. Gather his strength. Prepare for whatever came next.

The city outside his window sparkled with neon and rain. Beautiful and treacherous, like everything else in Ashport. Jack watched it for a long time before finally turning away.

Whatever the morning brought, he'd face it. That was all he could promise himself anymore.`;

    const result = {
      title: 'The Investigation Continues',
      bridgeText: 'The journey continues.',
      previously: 'Jack continued his investigation through the rain-soaked streets of Ashport.',
      narrative: minimalNarrative,
      chapterSummary: `Chapter ${chapter}.${subchapter}: The investigation continues through Ashport.`,
      jackActionStyle: 'balanced',
      jackRiskLevel: 'moderate',
      puzzleCandidates: ['RAIN', 'TRUTH', 'SHADOW', 'NIGHT', 'WHISKEY', 'PUZZLE', 'CHOICE', 'GHOST'],
      briefing: {
        summary: 'Continue the investigation.',
        objectives: ['Follow available leads', 'Consider your options'],
      },
      consistencyFacts: [
        `Chapter ${chapter}.${subchapter} was generated using minimal fallback content.`,
      ],
      previousThreadsAddressed: [],
      narrativeThreads: [],
      decision: isDecisionPoint ? {
        intro: ['A choice presents itself.'],
        options: [
          {
            key: 'A',
            title: 'Take action',
            focus: 'Move forward directly',
            consequence: null,
            stats: null,
            outcome: null,
            nextChapter: null,
            nextPathKey: 'A',
            details: [],
          },
          {
            key: 'B',
            title: 'Wait and observe',
            focus: 'Gather more information',
            consequence: null,
            stats: null,
            outcome: null,
            nextChapter: null,
            nextPathKey: 'B',
            details: [],
          },
        ],
      } : null,
    };

    // Enforce global POV rules (third-person limited) for minimal fallback too.
    // This prevents immersion-breaking first-person narration during worst-case degradation.
    if (result?.narrative) {
      result.narrative = this._sanitizeNarrativeToThirdPerson(result.narrative);
    }

    return result;
  }

  /**
   * Build context-aware fallback content that maintains story continuity
   * This is used when LLM generation fails but we still have story context available
   *
   * Key improvements over generic fallback:
   * 1. References player's path personality (aggressive/methodical/balanced)
   * 2. Acknowledges critical threads from previous chapters
   * 3. Uses phase-appropriate narrative tone
   * 4. Includes "previously" recap based on actual previous content
   */
  _buildContextAwareFallback(chapter, subchapter, pathKey, isDecisionPoint, context) {
    // Determine story phase
    let phase, phaseTone;
    if (chapter <= 4) {
      phase = 'risingAction';
      phaseTone = 'building mystery and gathering clues';
    } else if (chapter <= 7) {
      phase = 'complications';
      phaseTone = 'facing betrayals and escalating stakes';
    } else if (chapter <= 10) {
      phase = 'confrontations';
      phaseTone = 'confronting difficult truths';
    } else {
      phase = 'resolution';
      phaseTone = 'reaching the final reckoning';
    }

    // Get path personality for Jack's behavior
    const personality = context?.pathPersonality || { narrativeStyle: 'Jack balances intuition with evidence', riskTolerance: 'moderate' };
    const jackApproach = personality.riskTolerance === 'high' ? 'directly, without hesitation' :
                         personality.riskTolerance === 'low' ? 'carefully, gathering every detail' :
                         'with measured determination';

    // Extract critical threads that need acknowledgment
    const criticalThreads = (context?.narrativeThreads || [])
      .filter(t => t.urgency === 'critical' && t.status === 'active')
      .slice(0, 3); // Limit to 3 most important

    // Build thread acknowledgment paragraph
    let threadAcknowledgment = '';
    if (criticalThreads.length > 0) {
      const threadDescriptions = criticalThreads.map(t => {
        if (t.type === 'appointment') return `The meeting${t.deadline ? ` at ${t.deadline}` : ''} weighed on Jack's mind`;
        if (t.type === 'promise') return `Jack remembered the promise he had made`;
        if (t.type === 'threat') return `The threat still hung in the air`;
        return `Unfinished business demanded attention`;
      });
      threadAcknowledgment = `\n\n${threadDescriptions.join('. ')}. These matters would need resolution, one way or another.`;
    }

    // Get a recap from the most recent chapter
    let previousRecap = 'The investigation continued through Ashport\'s rain-soaked streets.';
    if (context?.previousChapters?.length > 0) {
      const lastChapter = context.previousChapters[context.previousChapters.length - 1];
      if (lastChapter.chapterSummary) {
        previousRecap = lastChapter.chapterSummary.split('.')[0] + '.';
      } else if (lastChapter.narrative) {
        // Extract first sentence
        const firstSentence = lastChapter.narrative.match(/[^.!?]+[.!?]+/)?.[0]?.trim();
        if (firstSentence) previousRecap = firstSentence;
      }
    }

    // Build phase-appropriate narrative
    const narrative = `The rain fell on Ashport the way it always did, relentless and indifferent to the business of men. Jack stepped out onto Morrison Street, his coat collar turned up against the chill.

Day ${chapter} of this twisted game. The Confessor's black envelopes had pulled Jack deeper into the corruption he had spent thirty years pretending not to see. Every case he had closed with such certainty now felt like a door he should have left open.${threadAcknowledgment}

Jack moved ${jackApproach}. After everything he had uncovered, there was no other way. The evidence was piling up, each piece more damning than the last. Tom Wade, his best friend for three decades, at the center of a web of manufactured truth. And Jack, the instrument of their justice, the fool who had believed every perfect conviction.

Murphy's Bar beckoned below his office, its familiar glow promising the comfort of Jameson and solitude. But tonight there was no comfort to be had. Only the cold certainty that he was ${phaseTone}.

The streets of Ashport stretched before him, neon reflections bleeding into wet pavement. Somewhere out there, Victoria Blackwell watched. Emily Cross, the woman Jack had declared dead seven years ago while she still drew breath in Grange's basement. She had every right to hate him. Every right to make him understand what his arrogant certainty had cost.

Jack checked his watch. Time was running out, as it always seemed to now. Each day brought new revelations, new wounds to old scars. The five innocents he had helped convict haunted every step he took. Eleanor Bellamy rotting in Greystone for a murder she did not commit. Marcus Thornhill driven to suicide by forged documents. Dr. Lisa Chen, whose career he had helped destroy for telling the truth.

His hand found the cold metal of the door handle. Whatever waited on the other side, he'd face it. That was all he could promise himself anymore.

The city held its breath. So did Jack.`;

    // Build the fallback entry
    const adapted = {
      title: phase === 'resolution' ? 'The Reckoning' :
             phase === 'confrontations' ? 'Truth Unveiled' :
             phase === 'complications' ? 'Shadows Deepen' : 'Following the Trail',
      bridgeText: `Jack faces the consequences of ${phaseTone}.`,
      previously: previousRecap,
      narrative: narrative,
      chapterSummary: `Chapter ${chapter}.${subchapter}: Jack continued his investigation, ${phaseTone}. The weight of past mistakes pressed down as the truth drew closer.`,
      jackActionStyle: personality.riskTolerance === 'high' ? 'direct' :
                       personality.riskTolerance === 'low' ? 'cautious' : 'balanced',
      jackRiskLevel: personality.riskTolerance || 'moderate',
      puzzleCandidates: ['RAIN', 'TRUTH', 'SHADOW', 'EVIDENCE', 'CONFESSION', 'BETRAYAL', 'JUSTICE', 'GUILT'],
      briefing: {
        summary: `Continue the investigation through this critical phase.`,
        objectives: ['Process the latest revelations', 'Decide on next steps', 'Face the consequences'],
      },
      consistencyFacts: [
        `Chapter ${chapter}.${subchapter} used context-aware fallback content.`,
        `Jack approached this chapter ${jackApproach}.`,
      ],
      // Acknowledge threads in previousThreadsAddressed
      previousThreadsAddressed: criticalThreads.map(thread => ({
        originalThread: thread.description,
        howAddressed: 'acknowledged',
        narrativeReference: 'Jack reflected on pending matters that would need resolution.',
      })),
      narrativeThreads: [], // Fallback doesn't create new threads
      decision: null,
    };

    // Add decision for subchapter C
    if (isDecisionPoint) {
      const aggressiveOption = personality.riskTolerance === 'high' ? 'A' : 'B';
      adapted.decision = {
        intro: ['Two paths diverged before me, each leading to different truths, different costs.'],
        options: [
          {
            key: 'A',
            title: 'Confront the situation directly',
            focus: 'Take immediate action, accepting the risks. This path prioritizes speed and decisive resolution.',
            consequence: null,
            stats: null,
            outcome: null,
            nextChapter: null,
            nextPathKey: 'A',
            details: [],
          },
          {
            key: 'B',
            title: 'Gather more evidence first',
            focus: 'Proceed with caution, building a stronger case. This path prioritizes thoroughness over speed.',
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

    // Ensure fallback narration matches global POV rules (third-person limited).
    if (adapted?.narrative) {
      adapted.narrative = this._sanitizeNarrativeToThirdPerson(adapted.narrative);
    }
    return adapted;
  }

  // ==========================================================================
  // STORY ARC PLANNING - Generates high-level outline for 100% consistency
  // ==========================================================================

  /**
   * Generate or retrieve the story arc - called once at the start of dynamic generation
   * This ensures ALL 12 chapters follow a coherent narrative thread regardless of player choices
   */
  async ensureStoryArc(choiceHistory = []) {
    // Story arcs should be stable across a playthrough and should NOT churn every chapter.
    // Key by "super-path" (personality) rather than the per-chapter cumulative branch key.
    const superPathKey = this._getSuperPathKey(choiceHistory);
    const arcKey = `arc_${superPathKey}`;

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

    // Generate new arc with fallback on failure
    console.log('[StoryGenerationService] Generating story arc for super-path:', superPathKey);
    try {
      const arc = await this._generateStoryArc(superPathKey, choiceHistory);
      this.storyArc = arc;
      await this._saveStoryArc(arcKey, arc);
      return arc;
    } catch (error) {
      console.warn('[StoryGenerationService] Story arc generation failed, using fallback:', error.message);
      const fallbackArc = this._createFallbackStoryArc(superPathKey, choiceHistory);
      this.storyArc = fallbackArc;
      // Don't persist fallback - allow retry on next session
      return fallbackArc;
    }
  }

  /**
   * Generate the master story arc that guides all chapter generation
   */
  async _generateStoryArc(superPathKey, choiceHistory) {
    const personality = this._analyzePathPersonality(choiceHistory);

    const arcPrompt = `You are the story architect for "Dead Letters," a 12-chapter noir detective mystery.

## STORY PREMISE
Jack Halloway, a retired detective, discovers his career was built on manufactured evidence. The Midnight Confessor (Victoria Blackwell, secretly Emily Cross) forces him to confront each wrongful conviction.

## PLAYER SUPER-PATH: "${superPathKey}"
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
        maxTokens: 4000,
        responseSchema: arcSchema,
      }
    );

    const arc = typeof response.content === 'string'
      ? JSON.parse(response.content)
      : response.content;

    return {
      key: `arc_${superPathKey}`,
      superPathKey,
      ...arc,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Create a fallback story arc when LLM generation fails
   * Provides a coherent structure for story generation to continue
   */
  _createFallbackStoryArc(superPathKey, choiceHistory) {
    const personality = this._analyzePathPersonality(choiceHistory);

    // Customize theme based on player personality
    const theme = personality.riskTolerance === 'high'
      ? 'Redemption through decisive action and confrontation'
      : personality.riskTolerance === 'low'
        ? 'Redemption through patient investigation and truth-seeking'
        : 'Redemption through confronting past mistakes';

    return {
      key: `arc_${superPathKey}`,
      superPathKey,
      isFallback: true,
      playerPersonality: personality.riskTolerance || 'balanced',
      overallTheme: theme,
      chapterArcs: [
        { chapter: 2, phase: 'RISING_ACTION', primaryFocus: 'First innocent discovered', tensionLevel: 4, endingHook: 'A new lead emerges' },
        { chapter: 3, phase: 'RISING_ACTION', primaryFocus: 'Evidence of conspiracy', tensionLevel: 5, endingHook: 'Trust begins to fracture' },
        { chapter: 4, phase: 'RISING_ACTION', primaryFocus: 'Second innocent revealed', tensionLevel: 5, endingHook: 'The pattern becomes clear' },
        { chapter: 5, phase: 'COMPLICATIONS', primaryFocus: 'Betrayal discovered', tensionLevel: 6, endingHook: 'An ally becomes suspect' },
        { chapter: 6, phase: 'COMPLICATIONS', primaryFocus: 'Third innocent confronted', tensionLevel: 7, endingHook: 'Stakes escalate dramatically' },
        { chapter: 7, phase: 'COMPLICATIONS', primaryFocus: 'The web tightens', tensionLevel: 7, endingHook: 'No one can be trusted' },
        { chapter: 8, phase: 'CONFRONTATIONS', primaryFocus: 'Major revelation', tensionLevel: 8, endingHook: 'The truth emerges' },
        { chapter: 9, phase: 'CONFRONTATIONS', primaryFocus: 'Fourth innocent found', tensionLevel: 8, endingHook: 'Confrontation looms' },
        { chapter: 10, phase: 'CONFRONTATIONS', primaryFocus: 'Final pieces fall', tensionLevel: 9, endingHook: 'The mastermind revealed' },
        { chapter: 11, phase: 'RESOLUTION', primaryFocus: 'Final confrontation', tensionLevel: 10, endingHook: 'Justice or vengeance' },
        { chapter: 12, phase: 'RESOLUTION', primaryFocus: 'Consequences manifest', tensionLevel: 9, endingHook: 'The story concludes' },
      ],
      characterArcs: {
        jack: 'From guilt-ridden detective to seeker of truth',
        victoria: 'The mysterious force driving revelation',
        sarah: 'Partner whose loyalty will be tested',
        tomWade: 'Friend whose betrayal runs deepest',
      },
      consistencyAnchors: [
        'Jack Halloway is a retired detective haunted by his past',
        'Victoria Blackwell is the Midnight Confessor (secretly Emily Cross)',
        'Tom Wade has been manufacturing evidence for 20 years (friends with Jack for 30 years)',
        'Five innocents were wrongfully convicted',
        'Eleanor Bellamy spent 8 years in Greystone prison',
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Collapse fine-grained branch history into a stable "super-path" label.
   * This is used to key story-arc planning so we don't regenerate arcs every chapter.
   */
  _getSuperPathKey(choiceHistory = []) {
    const personality = this._analyzePathPersonality(choiceHistory);
    if (personality?.riskTolerance === 'high') return 'AGGRESSIVE';
    if (personality?.riskTolerance === 'low') return 'METHODICAL';
    return 'BALANCED';
  }

  /**
   * Generate a chapter outline before generating individual subchapters
   * This ensures A, B, C subchapters flow seamlessly as one coherent chapter
   */
  async ensureChapterOutline(chapter, choiceHistory = []) {
    const chapterPathKey = this._getPathKeyForChapter(chapter, choiceHistory);
    const outlineKey = `outline_${chapter}_${chapterPathKey}`;

    // Check if we already have this outline
    if (this.chapterOutlines.has(outlineKey)) {
      return this.chapterOutlines.get(outlineKey);
    }

    // Ensure we have the story arc first
    await this.ensureStoryArc(choiceHistory);

    // Generate outline with fallback on failure
    try {
      const outline = await this._generateChapterOutline(chapter, chapterPathKey, choiceHistory);
      this.chapterOutlines.set(outlineKey, outline);
      return outline;
    } catch (error) {
      console.warn('[StoryGenerationService] Chapter outline generation failed, using fallback:', error.message);
      const fallbackOutline = this._createFallbackChapterOutline(chapter, chapterPathKey);
      this.chapterOutlines.set(outlineKey, fallbackOutline);
      return fallbackOutline;
    }
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

    // Include the most recent decision that affects THIS chapter, so the outline enforces causality.
    const last = [...(choiceHistory || [])].reverse().find((c) => this._extractChapterFromCase(c?.caseNumber) === chapter - 1);
    const lastDecision = last
      ? {
        caseNumber: last.caseNumber,
        chapter: chapter - 1,
        optionKey: last.optionKey,
        consequence: DECISION_CONSEQUENCES[last.caseNumber]?.[last.optionKey] || null,
      }
      : null;

    const outlinePrompt = `Generate a detailed outline for Chapter ${chapter} of "Dead Letters."

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

## MOST RECENT PLAYER DECISION (MUST DRIVE CHAPTER ${chapter} OPENING)
${lastDecision
  ? `Decision from Chapter ${lastDecision.chapter} (${lastDecision.caseNumber}) => Option "${lastDecision.optionKey}"
Immediate consequence to open on: ${lastDecision.consequence?.immediate || '(derive from choice)'}
Ongoing effects: ${(lastDecision.consequence?.ongoing || []).slice(0, 4).join(' | ') || '(none tracked)'}`
  : 'None'}

## REQUIREMENTS
Create a 3-part outline (Subchapters A, B, C) that:
1. Flows seamlessly as ONE coherent chapter experience
2. Subchapter A: Opens with atmosphere AND shows concrete causality from the most recent player decision
3. Subchapter B: Develops the investigation/revelation
4. Subchapter C: Builds to decision point with genuine moral complexity

Each subchapter should feel like a natural continuation, not a separate scene.

## OUTPUT RULES (IMPORTANT)
- Include an explicit "openingCausality" field that states what changes because of the last decision.
- Include a short "mustReference" list (2-4 items) of specific details that MUST appear in the prose (locations, objects, names, actions).`;

    const outlineSchema = {
      type: 'object',
      properties: {
        chapter: { type: 'number' },
        summary: { type: 'string', description: 'One sentence summary of the entire chapter' },
        openingMood: { type: 'string', description: 'Atmospheric tone for chapter opening' },
        openingCausality: { type: 'string', description: 'One sentence: what is different because of the last player choice, and how the chapter opens on that consequence.' },
        mustReference: { type: 'array', items: { type: 'string' }, description: '2-4 concrete details that MUST appear in the prose for this chapter.' },
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
      required: ['chapter', 'summary', 'openingCausality', 'mustReference', 'subchapterA', 'subchapterB', 'subchapterC'],
    };

    const response = await llmService.complete(
      [{ role: 'user', content: outlinePrompt }],
      {
        systemPrompt: 'You are outlining a single chapter of an interactive noir mystery. Ensure the three subchapters flow as one seamless narrative.',
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

  /**
   * Create a fallback chapter outline when LLM generation fails
   * Provides a basic structure for story generation to continue
   */
  _createFallbackChapterOutline(chapter, pathKey) {
    // Determine story phase based on chapter number
    let phase, tensionLevel, focus;
    if (chapter <= 4) {
      phase = 'RISING_ACTION';
      tensionLevel = 4 + (chapter - 2);
      focus = 'Investigation deepens';
    } else if (chapter <= 7) {
      phase = 'COMPLICATIONS';
      tensionLevel = 6 + (chapter - 5);
      focus = 'Betrayals and revelations';
    } else if (chapter <= 10) {
      phase = 'CONFRONTATIONS';
      tensionLevel = 8;
      focus = 'Direct confrontations';
    } else {
      phase = 'RESOLUTION';
      tensionLevel = 9;
      focus = 'Final reckoning';
    }

    return {
      chapter,
      pathKey,
      isFallback: true,
      summary: `Chapter ${chapter}: Jack continues his investigation into the conspiracy.`,
      openingMood: 'Noir atmosphere with building tension',
      openingCausality: 'The chapter opens by showing the immediate consequence of the player’s last decision (location, character reaction, and next action).',
      mustReference: ['Ashport rain', "Murphy's jukebox below Jack’s office", 'The Midnight Confessor’s black envelope', 'One named character from the current investigation'],
      subchapterA: {
        focus: `Opening: ${focus}`,
        keyBeats: [
          'Jack reflects on recent discoveries',
          'New information comes to light',
          'The investigation takes a turn',
        ],
        endingTransition: 'A lead demands immediate attention',
      },
      subchapterB: {
        focus: `Development: The mystery deepens`,
        keyBeats: [
          'Jack pursues the new lead',
          'Unexpected obstacles arise',
          'A piece of the puzzle falls into place',
        ],
        endingTransition: 'Jack faces a difficult choice',
      },
      subchapterC: {
        focus: `Climax: Decision point`,
        keyBeats: [
          'Tensions reach a breaking point',
          'The truth demands a response',
          'Jack must choose his path forward',
        ],
        decisionSetup: 'A choice between two difficult paths',
      },
      tensionLevel,
      phase,
      consistencyAnchors: [
        'Jack Halloway seeks the truth',
        'The conspiracy runs deep',
        'Every choice has consequences',
      ],
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
      const consequence = await this._generateDecisionConsequence(choice, choiceHistory);
      this.generatedConsequences.set(consequenceKey, consequence);

      // Also store in the registry for future use
      if (!DECISION_CONSEQUENCES[choice.caseNumber]) {
        DECISION_CONSEQUENCES[choice.caseNumber] = {};
      }
      DECISION_CONSEQUENCES[choice.caseNumber][choice.optionKey] = consequence;
    }
  }

  /**
   * Fast, non-LLM consequence hydration.
   *
   * Goal: preserve choice causality in prompts without adding latency.
   * - Uses DECISION_CONSEQUENCES if present
   * - Falls back to storyContext.decisionConsequencesByKey if persisted
   * - Otherwise derives a lightweight consequence from the decision entry metadata
   */
  _ensureDecisionConsequencesFast(choiceHistory) {
    const history = Array.isArray(choiceHistory) ? choiceHistory : [];
    if (history.length === 0) return;

    const ctx = this.storyContext || {};
    if (!ctx.decisionConsequencesByKey) ctx.decisionConsequencesByKey = {};

    const deriveFromDecisionEntry = (choice) => {
      const chapter = this._extractChapterFromCase(choice.caseNumber);
      const decisionPathKey = this._getPathKeyForChapter(chapter, history);
      const decisionEntry = this.getGeneratedEntry(choice.caseNumber, decisionPathKey) || getStoryEntry(choice.caseNumber, 'ROOT');
      const chosen = decisionEntry?.decision?.options?.find((o) => o.key === choice.optionKey) || null;

      const title = chosen?.title || `Option ${choice.optionKey}`;
      const focus = chosen?.focus || '';
      const stats = chosen?.stats || '';

      const ongoing = [];
      if (typeof stats === 'string') {
        if (stats.includes('SarahTrust')) ongoing.push(stats.includes('-SarahTrust') ? 'Sarah’s trust decreases' : 'Sarah’s trust increases');
        if (stats.toLowerCase().includes('investig')) ongoing.push('Jack gains better leads through evidence');
        if (stats.toLowerCase().includes('aggress')) ongoing.push('Jack’s approach grows more confrontational');
      }
      if (typeof focus === 'string' && focus.length > 0) {
        ongoing.unshift(`Tone shift: ${focus}`);
      }

      const characterImpact = {
        trust: stats.includes('-SarahTrust') ? -10 : stats.includes('+SarahTrust') ? 10 : 0,
        aggression: focus.toLowerCase().includes('confront') ? 10 : focus.toLowerCase().includes('cautious') ? -5 : 0,
        thoroughness: focus.toLowerCase().includes('evidence') ? 10 : 0,
      };

      // Make the "immediate" consequence feel concrete even without an LLM call.
      // Titles are imperative; convert to an infinitive-ish phrase ("Confront Wade" -> "confront Wade").
      const toAction = String(title || '')
        .trim()
        .replace(/^[A-Z]/, (m) => m.toLowerCase());
      const focusSnippet = String(focus || '')
        .split('.')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join('. ');
      const immediate = toAction
        ? `Jack chose to ${toAction}${focusSnippet ? `. ${focusSnippet}.` : '.'}`
        : `Jack chose: ${title}`;

      return {
        immediate,
        ongoing: ongoing.length > 0 ? ongoing.slice(0, 4) : ['This choice will shape what Jack can prove, and who will trust him.'],
        characterImpact,
      };
    };

    for (const choice of history) {
      const caseNumber = choice?.caseNumber;
      const optionKey = choice?.optionKey;
      if (!caseNumber || (optionKey !== 'A' && optionKey !== 'B')) continue;

      const consequenceKey = `${caseNumber}_${optionKey}`;

      // Already known?
      if (DECISION_CONSEQUENCES[caseNumber]?.[optionKey]) {
        ctx.decisionConsequencesByKey[consequenceKey] = DECISION_CONSEQUENCES[caseNumber][optionKey];
        continue;
      }

      // Persisted?
      const persisted = ctx.decisionConsequencesByKey[consequenceKey];
      if (persisted) {
        if (!DECISION_CONSEQUENCES[caseNumber]) DECISION_CONSEQUENCES[caseNumber] = {};
        DECISION_CONSEQUENCES[caseNumber][optionKey] = persisted;
        continue;
      }

      // Derive cheaply from decision metadata.
      const derived = deriveFromDecisionEntry(choice);
      if (!DECISION_CONSEQUENCES[caseNumber]) DECISION_CONSEQUENCES[caseNumber] = {};
      DECISION_CONSEQUENCES[caseNumber][optionKey] = derived;
      ctx.decisionConsequencesByKey[consequenceKey] = derived;
    }

    // Fire-and-forget persistence (small payload).
    this.storyContext = ctx;
    saveStoryContext(ctx).catch((e) => {
      console.warn('[StoryGenerationService] Failed to persist decision consequences (fast):', e?.message);
    });
  }

  /**
   * Generate consequences for a single decision
   * Enhanced with full narrative context for more meaningful consequences
   */
  async _generateDecisionConsequence(choice, fullChoiceHistory = []) {
    const chapter = this._extractChapterFromCase(choice.caseNumber);

    // Try to get context from the decision itself if available
    const decisionPathKey = this._getPathKeyForChapter(chapter, fullChoiceHistory);
    const decisionEntry = this.getGeneratedEntry(choice.caseNumber, decisionPathKey);
    const decisionContext = decisionEntry?.decision?.options?.find(o => o.key === choice.optionKey);
    const otherOption = decisionEntry?.decision?.options?.find(o => o.key !== choice.optionKey);

    // Extract narrative context for richer consequence generation
    const narrativeContext = decisionEntry?.narrative ? decisionEntry.narrative.slice(-2000) : '';
    const decisionIntro = decisionEntry?.decision?.intro?.[0] || '';
    const activeThreads = (
      decisionEntry?.consistencyFacts ||
      this._getRelevantPersistedConsistencyFacts(decisionPathKey) ||
      []
    ).slice(0, 5);
    const charactersInvolved = decisionEntry?.decision?.options?.flatMap(o => o.characters || []) || [];

    const consequencePrompt = `Generate narrative consequences for a player decision in a noir detective story.

## STORY CONTEXT
This is "Dead Letters" - Jack Halloway, a retired detective, is re-examining cases he closed after receiving letters from "The Midnight Confessor." He's discovering his best friend Tom Wade manufactured evidence for 20 years, sending innocent people to prison.

## CHAPTER ${chapter} NARRATIVE LEADING TO DECISION
${narrativeContext ? `The following is the end of the narrative leading to this choice:
"""
${narrativeContext.slice(-1200)}
"""` : 'Narrative context not available.'}

## THE DECISION POINT
${decisionIntro ? `Decision setup: "${decisionIntro}"` : ''}

## PLAYER'S CHOICE: Option ${choice.optionKey}
${decisionContext ? `- Title: "${decisionContext.title}"
- Focus: "${decisionContext.focus}"` : '- Details not available'}

## THE PATH NOT TAKEN: Option ${otherOption?.key || 'N/A'}
${otherOption ? `- Title: "${otherOption.title}"
- Focus: "${otherOption.focus}"` : '- Details not available'}

## ACTIVE STORY ELEMENTS
${activeThreads.length > 0 ? activeThreads.map(t => `- ${t}`).join('\n') : '- No specific threads tracked'}
${charactersInvolved.length > 0 ? `\nCharacters involved: ${[...new Set(charactersInvolved)].join(', ')}` : ''}

## REQUIRED OUTPUT
Generate realistic, specific consequences based on the actual narrative content. Consider:
1. What doors does this choice open? What does it close?
2. How will characters involved react to Jack's decision?
3. What investigation leads are gained or lost?
4. How does this affect Jack's relationships and reputation?
5. What thematic weight does this choice carry (guilt, redemption, truth vs. comfort)?`;

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
        // Default mapping: Option A tends to be evidence-first/methodical; Option B tends to be direct/aggressive.
        characterImpact: { trust: 0, aggression: choice.optionKey === 'B' ? 5 : -5, thoroughness: choice.optionKey === 'A' ? 5 : -5 },
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
  async _createConsistencyCheckpoint(chapter, pathKey, storyEntry, choiceHistory = []) {
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
        // Use cumulative branch keys for each chapter so we read the correct historical branch.
        const chPathKey = this._getPathKeyForChapter(ch, choiceHistory);
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
        // Prefer the decision's explicit personalityAlignment when available.
        // This avoids baking in A=methodical/B=aggressive when the narrative frames choices differently.
        let alignment = null;
        try {
          const decisionChapter = this._extractChapterFromCase(choice.caseNumber);
          const decisionPathKey = this._getPathKeyForChapter(decisionChapter, choiceHistory);
          const decisionEntry =
            this.getGeneratedEntry(choice.caseNumber, decisionPathKey) ||
            getStoryEntry(choice.caseNumber, 'ROOT');

          const opt =
            decisionEntry?.decision?.options?.find((o) => o?.key === choice.optionKey) ||
            (choice.optionKey === 'A' ? decisionEntry?.decision?.optionA : decisionEntry?.decision?.optionB) ||
            null;

          alignment = opt?.personalityAlignment || null;
        } catch {
          alignment = null;
        }

        if (alignment === 'methodical') {
          methodicalScore += 6 * weight;
        } else if (alignment === 'aggressive') {
          aggressiveScore += 6 * weight;
        } else {
          // Fallback scoring: A tends to be "methodical/evidence-first", B tends to be "aggressive/instinct-first".
          if (choice.optionKey === 'A') {
            methodicalScore += 5 * weight;
          } else if (choice.optionKey === 'B') {
            aggressiveScore += 5 * weight;
          }
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
    const seenDescriptions = new Set(); // Prevent duplicate active threads in legacy mode

    // For structured threads, track latest status per normalized key so resolved threads
    // cannot "reappear" from earlier chapters (zombie thread bug).
    const latestByKey = new Map(); // key -> { thread, chapter, subchapter }

    // First priority: Use LLM-generated structured threads
    chapters.forEach(ch => {
      if (ch.narrativeThreads && Array.isArray(ch.narrativeThreads)) {
        ch.narrativeThreads.forEach(thread => {
          const type = thread?.type;
          const desc = thread?.description;
          const status = thread?.status;
          if (!type || !desc) return;

          const key = `${type}:${desc}`.toLowerCase();
          const candidate = {
            type,
            chapter: ch.chapter,
            subchapter: ch.subchapter,
            description: desc,
            characters: thread.characters || [],
            status: status || 'active',
            urgency: thread.urgency,
            deadline: thread.deadline,
            dueChapter: thread.dueChapter,
            resolvedChapter: thread.resolvedChapter,
            source: 'llm',
          };

          const existing = latestByKey.get(key);
          const isNewer = !existing ||
            (candidate.chapter > existing.chapter) ||
            (candidate.chapter === existing.chapter && candidate.subchapter > existing.subchapter);
          if (isNewer) {
            latestByKey.set(key, { ...candidate, chapter: candidate.chapter, subchapter: candidate.subchapter });
          }
        });
      }
    });

    // Materialize only active structured threads (latest status wins).
    // If a thread was resolved/failed later, it won't show up here.
    for (const [, t] of latestByKey.entries()) {
      if (t.status === 'active') {
        threads.push(t);
      }
    }

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
                status: 'active',
                urgency: 'background',
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
   * Also resets in-memory state that shouldn't persist across sessions
   */
  async init() {
    this.generatedStory = await loadGeneratedStory();
    this.storyContext = await getStoryContext();

    // Hydrate any persisted dynamic decision consequences back into memory so
    // choice-driven context remains stable across app restarts.
    if (this.storyContext?.decisionConsequencesByKey && typeof this.storyContext.decisionConsequencesByKey === 'object') {
      try {
        for (const [k, consequence] of Object.entries(this.storyContext.decisionConsequencesByKey)) {
          const [caseNumber, optionKey] = String(k).split('_');
          if (!caseNumber || !optionKey) continue;
          if (!DECISION_CONSEQUENCES[caseNumber]) DECISION_CONSEQUENCES[caseNumber] = {};
          if (!DECISION_CONSEQUENCES[caseNumber][optionKey]) {
            DECISION_CONSEQUENCES[caseNumber][optionKey] = consequence;
          }
          this.generatedConsequences.set(`${caseNumber}_${optionKey}`, consequence);
        }
      } catch (e) {
        console.warn('[StoryGenerationService] Failed to hydrate decision consequences from storyContext:', e?.message);
      }
    }

    // Reset thread acknowledgment counts on init to prevent stale data from affecting
    // validation when starting a new session or reloading the app
    this.threadAcknowledgmentCounts.clear();

    // Also clear generation attempts to give fresh retries
    this.generationAttempts.clear();

    return this;
  }

  /**
   * Clean up all stored data for a fresh start
   * Removes generated story, story arcs, chapter outlines, and resets service state
   */
  async cleanupAllStoredData() {
    console.log('[StoryGenerationService] Starting full storage cleanup...');

    try {
      // Get all AsyncStorage keys to find story-related ones
      const allKeys = await AsyncStorage.getAllKeys();

      // Keys to remove: story arcs, chapter outlines, offline queue
      const keysToRemove = allKeys.filter(key =>
        key.startsWith('story_arc_') ||
        key.startsWith('chapter_outline_') ||
        // Clear offline queue key(s) (legacy + current).
        key === 'detective_portrait_offline_queue' ||
        key === 'dead_letters_offline_queue'
      );

      // Remove story arc keys
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`[StoryGenerationService] Removed ${keysToRemove.length} auxiliary storage keys`);
      }

      // Clear generated story and context via storage module
      const { clearGeneratedStory } = await import('../storage/generatedStoryStorage');
      await clearGeneratedStory();

      // Reset service state
      this.generatedStory = null;
      this.storyContext = null;
      this.storyArc = null;
      this.chapterOutlines.clear();
      this.consistencyCheckpoints.clear();
      this.generatedConsequences.clear();
      this.pendingGenerations.clear();
      this.threadAcknowledgmentCounts.clear();
      this.generationAttempts.clear();
      this.pathPersonality = null;
      this.consistencyLog = [];
      this.narrativeThreads = [];

      console.log('[StoryGenerationService] Full cleanup complete');
      return { success: true, keysRemoved: keysToRemove.length + 2 }; // +2 for story and context
    } catch (error) {
      console.error('[StoryGenerationService] Cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats() {
    try {
      const { getStorageSize, getGenerationStats } = await import('../storage/generatedStoryStorage');

      const sizeInfo = await getStorageSize();
      const genStats = await getGenerationStats();

      // Count story arcs
      const allKeys = await AsyncStorage.getAllKeys();
      const arcKeys = allKeys.filter(k => k.startsWith('story_arc_'));
      const outlineKeys = allKeys.filter(k => k.startsWith('chapter_outline_'));

      return {
        ...sizeInfo,
        ...genStats,
        storyArcCount: arcKeys.length,
        chapterOutlineCount: outlineKeys.length,
        totalKeysUsed: arcKeys.length + outlineKeys.length + 2, // +2 for main story and context
      };
    } catch (error) {
      console.warn('[StoryGenerationService] Failed to get storage stats:', error);
      return null;
    }
  }

  /**
   * Force prune storage to free up space
   * @param {string} currentPathKey - Player's current path
   * @param {number} currentChapter - Player's current chapter
   */
  async forcePruneStorage(currentPathKey, currentChapter) {
    try {
      const { pruneOldGenerations } = await import('../storage/generatedStoryStorage');

      // Target 50% of max storage
      const targetSize = 2 * 1024 * 1024; // 2MB target
      const result = await pruneOldGenerations(currentPathKey, currentChapter, targetSize);

      // Story arcs are keyed by SUPER-PATH (AGGRESSIVE/METHODICAL/BALANCED),
      // not by the cumulative branch key. Do not attempt to prune arcs based on currentPathKey.
      // Arcs are small, and incorrect pruning can cause unnecessary re-planning churn.
      const arcKeys = [];

      return {
        ...result,
        arcsRemoved: arcKeys.length,
      };
    } catch (error) {
      console.error('[StoryGenerationService] Force prune failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Prune stale in-memory Map entries to prevent memory leaks in long sessions
   * Called periodically during generation to clean up abandoned paths
   *
   * @param {string} currentPathKey - The player's current path (entries matching this are preserved)
   * @param {number} currentChapter - The player's current chapter
   */
  pruneInMemoryMaps(currentPathKey, currentChapter) {
    let prunedCount = 0;

    // Prune generationAttempts: remove entries for chapters far behind current chapter
    for (const [key] of this.generationAttempts) {
      // Keys are like "002A_ABABAB" - extract chapter from first 3 chars
      const chapterNum = parseInt(key.slice(0, 3)) || 0;
      // Remove attempts for chapters more than 2 behind (they won't be retried)
      if (chapterNum < currentChapter - 2) {
        this.generationAttempts.delete(key);
        prunedCount++;
      }
    }

    // Prune threadAcknowledgmentCounts: keep only reasonably recent entries
    // Threads older than 20 entries are likely from abandoned paths
    if (this.threadAcknowledgmentCounts.size > 50) {
      // Take the 30 most recent by keeping entries, delete the rest
      const entries = Array.from(this.threadAcknowledgmentCounts.entries());
      const toRemove = entries.slice(0, entries.length - 30);
      for (const [key] of toRemove) {
        this.threadAcknowledgmentCounts.delete(key);
        prunedCount++;
      }
    }

    // Prune consistencyCheckpoints: keep only checkpoints for recent chapters
    for (const [key] of this.consistencyCheckpoints) {
      // Keys are like "chapter_3_ABABAB"
      const match = key.match(/chapter_(\d+)/);
      if (match) {
        const chapterNum = parseInt(match[1]) || 0;
        // Keep only checkpoints within 3 chapters of current
        if (chapterNum < currentChapter - 3) {
          this.consistencyCheckpoints.delete(key);
          prunedCount++;
        }
      }
    }

    // Prune chapterOutlines: keep only recent outlines
    for (const [key] of this.chapterOutlines) {
      // Keys are like "outline_3_ABABAB"
      const match = key.match(/outline_(\d+)/);
      if (match) {
        const chapterNum = parseInt(match[1]) || 0;
        // Keep only outlines within 2 chapters of current
        if (chapterNum < currentChapter - 2) {
          this.chapterOutlines.delete(key);
          prunedCount++;
        }
      }
    }

    // Prune decisionConsequences: remove entries for old chapters
    for (const [key] of this.decisionConsequences) {
      // Keys are like "decision_2_A" or contain chapter references
      const match = key.match(/(\d+)/);
      if (match) {
        const chapterNum = parseInt(match[1]) || 0;
        if (chapterNum < currentChapter - 3) {
          this.decisionConsequences.delete(key);
          prunedCount++;
        }
      }
    }

    // Prune characterStates: limit to reasonable size (50 entries max)
    if (this.characterStates.size > 50) {
      const entries = Array.from(this.characterStates.entries());
      const toRemove = entries.slice(0, entries.length - 30);
      for (const [key] of toRemove) {
        this.characterStates.delete(key);
        prunedCount++;
      }
    }

    // Prune generatedConsequences: remove old chapter consequences
    for (const [key] of this.generatedConsequences) {
      const match = key.match(/(\d+)/);
      if (match) {
        const chapterNum = parseInt(match[1]) || 0;
        if (chapterNum < currentChapter - 3) {
          this.generatedConsequences.delete(key);
          prunedCount++;
        }
      }
    }

    // Prune stale pendingGenerations: remove any that are older than 5 minutes
    // (they likely failed silently or were abandoned)
    const now = Date.now();
    for (const [key, promise] of this.pendingGenerations) {
      // Check if promise has been resolved/rejected by adding a flag
      if (promise._createdAt && now - promise._createdAt > 5 * 60 * 1000) {
        this.pendingGenerations.delete(key);
        prunedCount++;
        console.log(`[StoryGenerationService] Pruned stale pending generation: ${key}`);
      }
    }

    if (prunedCount > 0) {
      console.log(`[StoryGenerationService] Pruned ${prunedCount} stale in-memory entries`);
    }

    return prunedCount;
  }

  /**
   * Destroy the service and clean up all resources
   * Call this when unmounting or resetting the application
   */
  destroy() {
    console.log('[StoryGenerationService] Destroying service and cleaning up resources...');

    // Clear all Maps
    this.pendingGenerations.clear();
    this.decisionConsequences.clear();
    this.characterStates.clear();
    this.threadAcknowledgmentCounts.clear();
    this.chapterOutlines.clear();
    this.consistencyCheckpoints.clear();
    this.generatedConsequences.clear();
    this.generationAttempts.clear();

    // Clear other state
    this.generatedStory = null;
    this.storyContext = null;
    this.storyArc = null;
    this.indexedFacts = null;
    this.consistencyLog = [];
    this.narrativeThreads = [];
    this.pathPersonality = null;
    this.isGenerating = false;

    // Clear dynamic clusters
    this._currentDynamicClusters = null;

    // Clear generation concurrency state
    // Reject any waiting generations to prevent hanging promises
    this.generationWaitQueue.forEach(({ reject, key }) => {
      reject(new Error(`Generation ${key} cancelled: service destroyed`));
    });
    this.generationWaitQueue = [];
    this.activeGenerationCount = 0;

    // Clear thread archive
    this.archivedThreads = [];

    console.log('[StoryGenerationService] Cleanup complete');
  }

  /**
   * Get memory usage statistics for debugging
   */
  getMemoryStats() {
    return {
      pendingGenerations: this.pendingGenerations.size,
      decisionConsequences: this.decisionConsequences.size,
      characterStates: this.characterStates.size,
      threadAcknowledgmentCounts: this.threadAcknowledgmentCounts.size,
      chapterOutlines: this.chapterOutlines.size,
      consistencyCheckpoints: this.consistencyCheckpoints.size,
      generatedConsequences: this.generatedConsequences.size,
      generationAttempts: this.generationAttempts.size,
      narrativeThreads: this.narrativeThreads?.length || 0,
      archivedThreads: this.archivedThreads?.length || 0,
      consistencyLog: this.consistencyLog?.length || 0,
      generationQueue: {
        active: this.activeGenerationCount,
        waiting: this.generationWaitQueue.length,
      },
    };
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
   * First checks in-memory cache, then falls back to storage
   */
  getGeneratedEntry(caseNumber, pathKey) {
    if (!this.generatedStory?.chapters) return null;
    const key = `${caseNumber}_${pathKey}`;
    return this.generatedStory.chapters[key] || null;
  }

  /**
   * Get generated story entry with async storage fallback
   * Ensures entries are found even if not in memory cache
   */
  async getGeneratedEntryAsync(caseNumber, pathKey) {
    // First try in-memory cache
    const memoryEntry = this.getGeneratedEntry(caseNumber, pathKey);
    if (memoryEntry) return memoryEntry;

    // Fall back to storage
    const { getGeneratedEntry: getFromStorage } = await import('../storage/generatedStoryStorage');
    const storageEntry = await getFromStorage(caseNumber, pathKey);

    // If found in storage, add to memory cache
    if (storageEntry && this.generatedStory?.chapters) {
      const key = `${caseNumber}_${pathKey}`;
      this.generatedStory.chapters[key] = storageEntry;
    }

    return storageEntry;
  }

  // ==========================================================================
  // CONTEXT BUILDING - Full story context for 1M token window
  // ==========================================================================

  /**
   * Build comprehensive story context with FULL story history
   * With 1M token context window, we include ALL previous content without truncation
   * Ensures proper continuation from exactly where the previous subchapter ended
   */
  async buildStoryContext(targetChapter, targetSubchapter, pathKey, choiceHistory = []) {
    // Ensure service is initialized and has loaded story from storage
    if (!this.generatedStory) {
      console.log('[StoryGenerationService] Service not initialized, loading story from storage...');
      await this.init();
    }

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

    // Add Chapter 1 content (static) - FULL TEXT
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
          chapterSummary: entry.chapterSummary || null,
          isRecent: true, // Mark all as recent to include full text
        });
      }
    }

    // Add ALL generated chapters 2 onwards - FULL TEXT, NO TRUNCATION
    // Use async method to ensure we load from storage if not in memory
    for (let ch = 2; ch < targetChapter; ch++) {
      const chapterPathKey = this._getPathKeyForChapter(ch, choiceHistory);
      for (let sub = 1; sub <= SUBCHAPTERS_PER_CHAPTER; sub++) {
        const caseNum = formatCaseNumber(ch, sub);
        // Use async method to ensure entries are loaded from storage
        const entry = await this.getGeneratedEntryAsync(caseNum, chapterPathKey);
        if (entry?.narrative) {
          context.previousChapters.push({
            chapter: ch,
            subchapter: sub,
            pathKey: chapterPathKey,
            title: entry.title || `Chapter ${ch}.${sub}`,
            narrative: entry.narrative, // FULL narrative, no truncation
            chapterSummary: entry.chapterSummary || null,
            decision: entry.decision || null,
            isRecent: true, // Mark all as recent to include full text
          });
        } else {
          console.warn(`[StoryGenerationService] Missing chapter ${ch}.${sub} (${caseNum}) for path ${chapterPathKey}`);
        }
      }
    }

    // Add current chapter's previous subchapters - FULL TEXT
    if (targetSubchapter > 1) {
      for (let sub = 1; sub < targetSubchapter; sub++) {
        const caseNum = formatCaseNumber(targetChapter, sub);
        const entry = await this.getGeneratedEntryAsync(caseNum, pathKey);
        if (entry?.narrative) {
          context.previousChapters.push({
            chapter: targetChapter,
            subchapter: sub,
            pathKey,
            title: entry.title || `Chapter ${targetChapter}.${sub}`,
            narrative: entry.narrative, // FULL narrative, no truncation
            chapterSummary: entry.chapterSummary || null,
            decision: entry.decision || null,
            isRecent: true, // Current chapter always recent
          });
        } else {
          console.warn(`[StoryGenerationService] Missing current chapter ${targetChapter}.${sub} (${caseNum})`);
        }
      }
    }

    // Log context size for debugging
    const totalNarrativeChars = context.previousChapters.reduce(
      (sum, ch) => sum + (ch.narrative?.length || 0), 0
    );
    console.log(`[StoryGenerationService] Context built: ${context.previousChapters.length} subchapters, ${totalNarrativeChars} chars of narrative`);
    if (context.previousChapters.length === 0) {
      console.warn('[StoryGenerationService] WARNING: No previous chapters found! Story context may be empty.');
    }

    // Add choice history (including title/focus for LLM prompt context)
    context.playerChoices = choiceHistory.map(choice => ({
      chapter: this._extractChapterFromCase(choice.caseNumber),
      optionKey: choice.optionKey,
      optionTitle: choice.optionTitle || null,  // "Go to the wharf and confront the confessor"
      optionFocus: choice.optionFocus || null,  // "Prioritizes direct action over caution"
      timestamp: choice.timestamp,
    }));

    // Identify the most recent decision that affects the current chapter (Chapter N decision affects N+1)
    const lastDecision = (() => {
      const last = [...(choiceHistory || [])].reverse().find((c) => {
        const decisionChapter = this._extractChapterFromCase(c?.caseNumber);
        return decisionChapter === targetChapter - 1;
      });
      if (!last) return null;

      const consequence = DECISION_CONSEQUENCES[last.caseNumber]?.[last.optionKey];
      const decisionChapter = this._extractChapterFromCase(last.caseNumber);
      const decisionPathKey = this._getPathKeyForChapter(decisionChapter, choiceHistory);
      const decisionEntry = this.getGeneratedEntry(last.caseNumber, decisionPathKey) || getStoryEntry(last.caseNumber, 'ROOT');
      const chosenOption = decisionEntry?.decision?.options?.find((o) => o.key === last.optionKey) || null;
      const otherOption = decisionEntry?.decision?.options?.find((o) => o.key !== last.optionKey) || null;

      // Prefer stored title/focus from choice history (always available after decision),
      // fall back to looking it up from the decision entry
      return {
        caseNumber: last.caseNumber,
        chapter: decisionChapter,
        optionKey: last.optionKey,
        immediate: consequence?.immediate || chosenOption?.focus || last.optionFocus || `Chose option ${last.optionKey}`,
        ongoing: consequence?.ongoing || [],
        chosenTitle: last.optionTitle || chosenOption?.title || null,
        chosenFocus: last.optionFocus || chosenOption?.focus || null,
        chosenStats: chosenOption?.stats || null,
        otherTitle: otherOption?.title || null,
        otherFocus: otherOption?.focus || null,
      };
    })();

    context.lastDecision = lastDecision;

    // Extract established facts from generated content
    context.establishedFacts = this._extractEstablishedFacts(context.previousChapters);

    // IMPORTANT:
    // Persisted storage strips per-entry consistencyFacts to save space.
    // We persist a rolling fact log keyed BY PATH to prevent branch-bleed from background prefetch.
    // Only merge facts whose pathKey is relevant (prefix of current path).
    const persistedFacts = this._getRelevantPersistedConsistencyFacts(pathKey);
    if (persistedFacts.length > 0) {
      context.establishedFacts = [
        ...new Set([...(context.establishedFacts || []), ...persistedFacts]),
      ];
    }

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

  /**
   * Extract scene state from the immediately previous subchapter
   * This gives the LLM a precise snapshot of where we are in the story
   */
  _extractSceneState(previousChapters, currentChapter, currentSubchapter) {
    if (!previousChapters || previousChapters.length === 0) {
      return null;
    }

    // Find the immediately previous subchapter
    let prevChapter, prevSubchapter;
    if (currentSubchapter > 1) {
      prevChapter = currentChapter;
      prevSubchapter = currentSubchapter - 1;
    } else {
      prevChapter = currentChapter - 1;
      prevSubchapter = 3;
    }

    const prevEntry = previousChapters.find(
      ch => ch.chapter === prevChapter && ch.subchapter === prevSubchapter
    );

    if (!prevEntry?.narrative) {
      return null;
    }

    const narrative = prevEntry.narrative;

    // Extract the last 2-3 paragraphs for immediate context
    const paragraphs = narrative.split(/\n\n+/).filter(p => p.trim().length > 50);
    const lastParagraphs = paragraphs.slice(-3).join('\n\n');

    // Extract the very last sentence for exact continuation point
    const sentences = narrative.match(/[^.!?]+[.!?]+/g) || [];
    const lastSentence = sentences.slice(-1)[0]?.trim() || '';

    // Try to infer current location from narrative
    const locationPatterns = [
      /(?:at|in|inside|outside|near|entered|stepped into|arrived at)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:'s)?(?:\s+(?:Bar|Office|Diner|House|Building|Station|Prison|Warehouse|Wharf|Docks|Penthouse|Estate|Alley|Street))?)/g,
      /Murphy's Bar/gi,
      /Greystone/gi,
      /Blueline Diner/gi,
      /Victoria's penthouse/gi,
      /Bellamy Estate/gi,
    ];

    let currentLocation = 'Unknown location';
    for (const pattern of locationPatterns) {
      const matches = [...narrative.matchAll(pattern)];
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        currentLocation = lastMatch[1] || lastMatch[0];
        break;
      }
    }

    // Try to infer time of day
    const timePatterns = {
      morning: /\b(morning|dawn|sunrise|breakfast|early light)\b/i,
      afternoon: /\b(afternoon|midday|noon|lunch)\b/i,
      evening: /\b(evening|dusk|sunset|dinner)\b/i,
      night: /\b(night|midnight|dark|neon|streetlights|late)\b/i,
    };

    let timeOfDay = 'night'; // Default noir atmosphere
    for (const [time, pattern] of Object.entries(timePatterns)) {
      if (pattern.test(narrative)) {
        timeOfDay = time;
      }
    }

    // Extract characters present in the final scene
    const characterNames = [
      'Sarah', 'Victoria', 'Eleanor', 'Tom Wade', 'Wade', 'Silas', 'Helen Price',
      'Maya', 'Claire', 'Marcus Webb', 'Martinez', 'Rebecca Moss', 'Grange'
    ];
    const presentCharacters = characterNames.filter(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(lastParagraphs)
    );

    // Infer Jack's emotional/physical state
    const emotionPatterns = {
      angry: /\b(anger|furious|rage|fist|clenched|seething)\b/i,
      tired: /\b(tired|exhausted|weary|drained|heavy)\b/i,
      tense: /\b(tense|nervous|anxious|tight|coiled)\b/i,
      determined: /\b(determined|resolved|focused|steel)\b/i,
      suspicious: /\b(suspicious|wary|distrustful|watching)\b/i,
      shocked: /\b(shocked|stunned|reeling|disbelief)\b/i,
    };

    const jackState = [];
    for (const [emotion, pattern] of Object.entries(emotionPatterns)) {
      if (pattern.test(lastParagraphs)) {
        jackState.push(emotion);
      }
    }

    return {
      location: currentLocation,
      timeOfDay,
      storyDay: prevChapter, // Story day = chapter number
      presentCharacters,
      jackEmotionalState: jackState.length > 0 ? jackState : ['focused'],
      lastParagraphs,
      lastSentence,
      previousTitle: prevEntry.title,
    };
  }

  /**
   * Track what each character knows - prevents information leaks
   */
  _buildCharacterKnowledgeTracker(previousChapters) {
    const knowledge = {
      jack: {
        knows: [],
        suspects: [],
        doesNotKnow: [
          'Victoria Blackwell is Emily Cross',
          'The full extent of Tom Wade\'s evidence manufacturing',
        ],
      },
      sarah: { knows: [], suspects: [] },
      victoria: { knows: ['Everything about Jack\'s cases', 'All five innocents'], suspects: [] },
    };

    // Scan narratives for revelation patterns
    const revelationPatterns = [
      { pattern: /Jack (?:learned|discovered|realized|found out|understood) (?:that )?(.+?)[.!]/gi, target: 'jack', type: 'knows' },
      { pattern: /Jack (?:suspected|wondered if|began to think|considered) (?:that )?(.+?)[.!]/gi, target: 'jack', type: 'suspects' },
      { pattern: /Sarah (?:told Jack|revealed|confessed|admitted) (?:that )?(.+?)[.!]/gi, target: 'jack', type: 'knows' },
      { pattern: /Victoria (?:revealed|showed|told|exposed) (?:that )?(.+?)[.!]/gi, target: 'jack', type: 'knows' },
    ];

    for (const ch of previousChapters) {
      if (!ch.narrative) continue;

      for (const { pattern, target, type } of revelationPatterns) {
        const matches = [...ch.narrative.matchAll(pattern)];
        for (const match of matches) {
          if (match[1] && match[1].length < 200) {
            knowledge[target][type].push(`Ch${ch.chapter}.${ch.subchapter}: ${match[1].trim()}`);
          }
        }
      }
    }

    // Deduplicate and limit
    for (const char of Object.keys(knowledge)) {
      knowledge[char].knows = [...new Set(knowledge[char].knows)].slice(-20);
      knowledge[char].suspects = [...new Set(knowledge[char].suspects)].slice(-10);
    }

    return knowledge;
  }

  /**
   * Track evidence and items Jack has collected
   */
  _extractEvidenceInventory(previousChapters) {
    const evidence = [];
    const evidencePatterns = [
      /Jack (?:took|grabbed|pocketed|kept|collected|received|found) (?:the |a )?(.+?(?:letter|envelope|photo|document|file|ledger|key|card|note|paper|folder|evidence|recording))/gi,
      /(?:handed|gave|passed) Jack (?:the |a )?(.+?(?:letter|envelope|photo|document|file|ledger|key|card|note|paper|folder))/gi,
      /black envelope/gi,
      /Thornhill [Ll]edger/gi,
    ];

    for (const ch of previousChapters) {
      if (!ch.narrative) continue;

      for (const pattern of evidencePatterns) {
        const matches = [...ch.narrative.matchAll(pattern)];
        for (const match of matches) {
          const item = match[1] || match[0];
          if (item && item.length < 100) {
            evidence.push({
              item: item.trim(),
              foundIn: `Chapter ${ch.chapter}.${ch.subchapter}`,
            });
          }
        }
      }
    }

    // Deduplicate by item name
    const seen = new Set();
    return evidence.filter(e => {
      const key = e.item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(-15);
  }

  /**
   * Build scene state section for the prompt
   */
  _buildSceneStateSection(context, chapter, subchapter) {
    const sceneState = this._extractSceneState(
      context.previousChapters,
      chapter,
      subchapter
    );

    if (!sceneState) {
      return '';
    }

    let section = `## CURRENT SCENE STATE (Your starting point)\n\n`;
    section += `**STORY DAY:** Day ${sceneState.storyDay} of 12\n`;
    section += `**TIME:** ${sceneState.timeOfDay}\n`;
    section += `**LOCATION:** ${sceneState.location}\n`;
    section += `**JACK'S STATE:** ${sceneState.jackEmotionalState.join(', ')}\n`;

    if (sceneState.presentCharacters.length > 0) {
      section += `**CHARACTERS PRESENT:** ${sceneState.presentCharacters.join(', ')}\n`;
    }

    section += `\n### THE SCENE YOU ARE CONTINUING FROM:\n`;
    section += `Previous subchapter: "${sceneState.previousTitle}"\n\n`;
    section += `**LAST PARAGRAPHS:**\n${sceneState.lastParagraphs}\n\n`;
    section += `**EXACT LAST SENTENCE:**\n"${sceneState.lastSentence}"\n\n`;
    section += `>>> YOUR NARRATIVE MUST PICK UP IMMEDIATELY AFTER THIS SENTENCE <<<\n`;
    section += `>>> DO NOT REPEAT OR REPHRASE THIS ENDING - CONTINUE FROM IT <<<\n`;

    return section;
  }

  /**
   * Build character knowledge section
   */
  _buildKnowledgeSection(context) {
    const knowledge = this._buildCharacterKnowledgeTracker(context.previousChapters);
    const evidence = this._extractEvidenceInventory(context.previousChapters);

    let section = `## CHARACTER KNOWLEDGE STATE\n\n`;

    section += `### WHAT JACK KNOWS:\n`;
    if (knowledge.jack.knows.length > 0) {
      knowledge.jack.knows.slice(-15).forEach(k => {
        section += `- ${k}\n`;
      });
    } else {
      section += `- Just beginning investigation\n`;
    }

    section += `\n### WHAT JACK SUSPECTS (but hasn't confirmed):\n`;
    if (knowledge.jack.suspects.length > 0) {
      knowledge.jack.suspects.slice(-10).forEach(k => {
        section += `- ${k}\n`;
      });
    } else {
      section += `- None yet\n`;
    }

    section += `\n### WHAT JACK DOES NOT YET KNOW (do not reveal prematurely):\n`;
    knowledge.jack.doesNotKnow.forEach(k => {
      section += `- ${k}\n`;
    });

    if (evidence.length > 0) {
      section += `\n### EVIDENCE IN JACK'S POSSESSION:\n`;
      evidence.forEach(e => {
        section += `- ${e.item} (found in ${e.foundIn})\n`;
      });
    }

    return section;
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

    // Part 2: Complete Story So Far (FULL TEXT)
    parts.push(this._buildStorySummarySection(context));

    // Part 3: Character Reference
    parts.push(this._buildCharacterSection());

    // Part 4: Character Knowledge State (who knows what)
    parts.push(this._buildKnowledgeSection(context));

    // Part 5: Style Examples (Few-shot)
    parts.push(this._buildStyleSection());

    // Part 6: Consistency Checklist
    parts.push(this._buildConsistencySection(context));

    // Part 7: Current Scene State (CRITICAL - exact continuation point)
    const sceneState = this._buildSceneStateSection(context, chapter, subchapter);
    if (sceneState) {
      parts.push(sceneState);
    }

    // Part 8: Current Task Specification (LAST for recency effect)
    parts.push(this._buildTaskSection(context, chapter, subchapter, isDecisionPoint));

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
   * Build COMPLETE story history with FULL narratives
   *
   * With 1M token context window, we include the ENTIRE story text.
   * This ensures the LLM has full context for proper continuation.
   */
  _buildStorySummarySection(context) {
    let summary = '## COMPLETE STORY SO FAR (FULL TEXT)\n\n';
    summary += '**CRITICAL: You are continuing an ongoing story. Read ALL of this carefully.**\n';
    summary += '**Your new subchapter MUST continue EXACTLY from where the previous subchapter ended.**\n';
    summary += '**DO NOT summarize, skip, or rehash events. Pick up the narrative mid-scene if needed.**\n\n';

    // Build quick lookup: decision chapter -> choice object (from choice history)
    const choicesByChapter = new Map();
    if (Array.isArray(context.playerChoices)) {
      context.playerChoices.forEach((c) => {
        if (c?.chapter) choicesByChapter.set(c.chapter, c);
      });
    }

    // Sort all chapters chronologically
    const allChapters = [...context.previousChapters].sort((a, b) => {
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.subchapter - b.subchapter;
    });

    // Track the immediately preceding subchapter for emphasis
    const currentChapter = context.currentPosition?.chapter;
    const currentSubchapter = context.currentPosition?.subchapter;

    // Find the immediately previous subchapter
    let immediatelyPrevious = null;
    if (currentSubchapter > 1) {
      // Previous subchapter in same chapter
      immediatelyPrevious = allChapters.find(
        ch => ch.chapter === currentChapter && ch.subchapter === currentSubchapter - 1
      );
    } else if (currentChapter > 1) {
      // Last subchapter of previous chapter
      immediatelyPrevious = allChapters.find(
        ch => ch.chapter === currentChapter - 1 && ch.subchapter === 3
      );
    }

    // Include FULL narratives for ALL chapters
    for (const ch of allChapters) {
      const isImmediatelyPrevious = (
        immediatelyPrevious &&
        ch.chapter === immediatelyPrevious.chapter &&
        ch.subchapter === immediatelyPrevious.subchapter
      );

      // Chapter header with emphasis for immediately previous
      if (isImmediatelyPrevious) {
        summary += `\n${'='.repeat(80)}\n`;
        summary += `### >>> IMMEDIATELY PREVIOUS SUBCHAPTER - CONTINUE FROM HERE <<<\n`;
        summary += `### Chapter ${ch.chapter}, Subchapter ${ch.subchapter} (${['A', 'B', 'C'][ch.subchapter - 1]}): "${ch.title}"\n`;
        summary += `${'='.repeat(80)}\n\n`;
      } else {
        summary += `\n### Chapter ${ch.chapter}, Subchapter ${ch.subchapter} (${['A', 'B', 'C'][ch.subchapter - 1]}): "${ch.title}"\n\n`;
      }

      // Include the FULL narrative text - NO TRUNCATION
      if (ch.narrative) {
        summary += ch.narrative;
        summary += '\n';
      }

      // Mark decision points and what the player chose
      if (ch.subchapter === 3) {
        const choice = choicesByChapter.get(ch.chapter);
        if (choice?.optionKey) {
          const title = choice.optionTitle ? ` "${choice.optionTitle}"` : '';
          const focus = choice.optionFocus ? `\n   Focus: ${choice.optionFocus}` : '';
          summary += `\n[>>> PLAYER DECISION at end of Chapter ${ch.chapter}: CHOSE OPTION ${choice.optionKey}${title}${focus}`;

          // If this is the most recent decision affecting current chapter
          if (ch.chapter === currentChapter - 1) {
            summary += `\n   *** THIS CHOICE MUST DRIVE THE OPENING OF YOUR NARRATIVE ***`;
            summary += `\n   *** SHOW THIS SCENE HAPPENING - DO NOT SKIP OR SUMMARIZE IT ***`;
          }
          summary += `]\n`;
        }

        // Also show the decision options that were presented
        if (ch.decision?.options) {
          summary += `\n[Decision options were:\n`;
          ch.decision.options.forEach(opt => {
            const chosen = choice?.optionKey === opt.key ? ' ← CHOSEN' : '';
            summary += `   ${opt.key}: "${opt.title}" - ${opt.focus}${chosen}\n`;
          });
          summary += `]\n`;
        }
      }

      // Emphasize continuation point
      if (isImmediatelyPrevious) {
        summary += `\n${'='.repeat(80)}\n`;
        summary += `>>> YOUR NARRATIVE MUST CONTINUE FROM THE END OF THIS TEXT <<<\n`;

        // Extract and highlight the last few sentences
        const sentences = ch.narrative?.match(/[^.!?]+[.!?]+/g) || [];
        if (sentences.length > 0) {
          const lastSentences = sentences.slice(-3).join(' ').trim();
          summary += `\nTHE STORY ENDED WITH:\n"${lastSentences}"\n`;
          summary += `\n>>> PICK UP EXACTLY HERE. What happens NEXT? <<<\n`;
        }
        summary += `${'='.repeat(80)}\n`;
      }

      summary += '\n---\n';
    }

    // Add explicit player choice history section
    if (context.playerChoices.length > 0) {
      summary += '\n### PLAYER CHOICE HISTORY (All decisions made)\n';
      context.playerChoices.forEach(choice => {
        const title = choice.optionTitle ? ` — "${choice.optionTitle}"` : '';
        const focus = choice.optionFocus ? ` (${choice.optionFocus})` : '';
        summary += `- Chapter ${choice.chapter} Decision: Option ${choice.optionKey}${title}${focus}\n`;
      });
      summary += '\n';
    }

    // Add strong continuation reminder at the end
    summary += `\n${'#'.repeat(80)}\n`;
    summary += `## CONTINUATION REQUIREMENTS\n\n`;
    summary += `You are writing Chapter ${currentChapter}, Subchapter ${currentSubchapter} (${['A', 'B', 'C'][currentSubchapter - 1]}).\n\n`;
    summary += `1. **DO NOT** summarize or recap what happened - the player already read it\n`;
    summary += `2. **DO NOT** skip scenes or time jumps without showing what happened\n`;
    summary += `3. **START** your narrative exactly where the previous subchapter ended\n`;
    summary += `4. **CONTINUE** the story in real-time, scene by scene\n`;
    if (currentSubchapter === 1 && context.lastDecision) {
      summary += `5. **CRITICAL**: The player chose "${context.lastDecision.chosenTitle || 'Option ' + context.lastDecision.optionKey}" - SHOW THIS SCENE HAPPENING NOW\n`;
      summary += `   - DO NOT write "After Jack did X..." - WRITE THE SCENE OF JACK DOING X\n`;
      summary += `   - First 200+ words should be the actual scene of the chosen action\n`;
    }
    summary += `${'#'.repeat(80)}\n`;

    return summary;
  }

  /**
   * Build character reference section
   */
  _buildCharacterSection() {
    const { protagonist, antagonist, allies, villains } = CHARACTER_REFERENCE;

    return `## CHARACTER VOICES (Match these exactly)

### JACK HALLOWAY (Narration is close third-person on Jack)
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
${beatType.requirements.map(r => `- ${r}`).join('\n')}`;

      // Add beat-type-specific pacing instructions
      if (beatType.type === 'CHASE') {
        task += `

**CHASE PACING MANDATE:**
- Keep paragraphs under 4 sentences
- No internal monologue longer than 2 sentences
- Use ACTION VERBS: ran, ducked, slammed, grabbed, dove
- Short dialogue exchanges (1-2 lines max)
- Breathless sentence fragments are OK: "Corner. Left. Another alley."
- Physical sensations: burning lungs, pounding heart, rain in eyes
- Time pressure in every scene: "Thirty seconds. Maybe less."`;
      } else if (beatType.type === 'BOTTLE_EPISODE') {
        task += `

**BOTTLE EPISODE PACING MANDATE:**
- Extended dialogue exchanges (5+ back-and-forth minimum)
- Stay in ONE primary location the entire chapter
- Deep character exploration through conversation
- Allow pauses, silences, meaningful looks
- Internal monologue between dialogue beats
- No scene cuts to other locations
- Psychological tension over physical action`;
      } else if (beatType.type === 'CONFRONTATION' || beatType.type === 'BETRAYAL') {
        task += `

**CONFRONTATION PACING MANDATE:**
- Build to the confrontation through the first half
- The confrontation itself should be LONG and detailed
- Every word in the dialogue carries weight
- Physical descriptions of tension (clenched jaw, white knuckles)
- Allow for emotional gut-punches with space to breathe after`;
      } else if (beatType.wordCountModifier < 1.0) {
        task += `

**PACING NOTE:** This is a FAST-PACED chapter. Keep scenes short and punchy. Less exposition, more action.`;
      } else if (beatType.wordCountModifier > 1.0) {
        task += `

**PACING NOTE:** This is a DEEP chapter. Take time for dialogue and character exploration. Don't rush.`;
      }
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

    // ========== NEW: Outline Causality + Must-Reference Anchors ==========
    if (outline?.openingCausality && subchapter === 1) {
      task += `

### OPENING CAUSALITY (Mandatory)
${outline.openingCausality}`;
    }
    if (Array.isArray(outline?.mustReference) && outline.mustReference.length > 0) {
      task += `

### MUST-REFERENCE ANCHORS (Mandatory)
${outline.mustReference.slice(0, 6).map((x) => `- ${x}`).join('\n')}`;
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

**IMPORTANT:** Jack's actions and dialogue MUST reflect this established personality pattern.`;

    // Add personality-specific voice examples
    if (personality.riskTolerance === 'high') {
      task += `

**AGGRESSIVE JACK VOICE EXAMPLES:**
Same scene, written for aggressive Jack:
- Entering a dangerous location: "Jack kicked the door open before better judgment could catch up. The warehouse stank of rust and old violence. Good. He was in the mood for both."
- Confronting a suspect: "'Cut the crap,' Jack said, grabbing his collar. 'I know what you did. The only question is whether you tell me now, or I find out the hard way and come back angry.'"
- Internal monologue: "Thirty years of being the patient detective. Look where it got him. This time, he wasn't waiting for permission."
- DO: Push, confront, act first and deal with consequences later
- DON'T: Hesitate, gather excessive evidence, wait patiently`;
    } else if (personality.riskTolerance === 'low') {
      task += `

**METHODICAL JACK VOICE EXAMPLES:**
Same scene, written for methodical Jack:
- Entering a dangerous location: "Jack circled the warehouse twice before going in. Noted the exits. The fire escape with the broken third rung. The way the security light flickered every forty seconds. Only then did he try the door."
- Confronting a suspect: "'I've got some questions,' Jack said, keeping his voice level. 'You can answer them here, or I can come back with enough evidence to make this conversation unnecessary. Your choice.'"
- Internal monologue: "Every case Jack closed in thirty years taught the same lesson: patience caught more killers than speed. He could wait. He’d gotten good at waiting."
- DO: Observe, plan, build the case methodically, leverage information
- DON'T: Rush in, confront without evidence, take unnecessary risks`;
    } else {
      task += `

**BALANCED JACK VOICE NOTE:**
Jack adapts his approach to the situation. He can be patient when it serves him, aggressive when pushed. Match the narrative moment—if stakes are high and time is short, he acts; if information is needed, he investigates.`;
    }

    task += `

### DECISION CONSEQUENCES (Must be reflected in narrative)
${context.decisionConsequences?.immediate?.length > 0 ? context.decisionConsequences.immediate.map(c => `- ${c}`).join('\n') : '- No previous decisions yet'}

### ONGOING EFFECTS FROM CHOICES
${context.decisionConsequences?.ongoing?.length > 0 ? [...new Set(context.decisionConsequences.ongoing)].slice(0, 5).map(e => `- ${e}`).join('\n') : '- Starting fresh'}

### MOST RECENT PLAYER DECISION (This MUST drive this subchapter)
${context.lastDecision
  ? `- Decision: Chapter ${context.lastDecision.chapter} (${context.lastDecision.caseNumber}) => Option "${context.lastDecision.optionKey}"
- Chosen action: ${context.lastDecision.chosenTitle || '(title unavailable)'}
- Immediate consequence to OPEN ON: ${context.lastDecision.immediate}
- The road not taken: ${context.lastDecision.otherTitle || '(unknown)'}`
  : '- None (start of story)'}

### PACING REQUIREMENTS
${pacing.requirements.map(r => `- ${r}`).join('\n')}

### WRITING REQUIREMENTS
1. **PLAN FIRST:** Use the 'beatSheet' field to outline 3-5 major beats.
2. **MINIMUM ${MIN_WORDS_PER_SUBCHAPTER} WORDS** - AIM FOR ${TARGET_WORDS}+ WORDS. Write generously. Do NOT stop short.
3. Continue DIRECTLY from where the last subchapter ended
4. Maintain third-person limited noir voice throughout (no first-person narration)
5. Reference specific events from previous chapters (show continuity)
6. Include: atmospheric description, internal monologue, dialogue
7. Build tension appropriate to ${pacing.phase} phase
8. **ENSURE Jack's behavior matches the path personality above**
9. **FOLLOW the story arc and chapter outline guidance above**`;

    // Add emphasis on recent decision if applicable (beginning of new chapter)
    if (subchapter === 1 && context.playerChoices.length > 0) {
      const lastChoice = context.playerChoices[context.playerChoices.length - 1];
      if (lastChoice.chapter === chapter - 1) {
        // Use the stored title/focus if available, otherwise fall back to key
        const choiceTitle = lastChoice.optionTitle || `Option ${lastChoice.optionKey}`;
        const choiceFocus = lastChoice.optionFocus ? `\nFOCUS: ${lastChoice.optionFocus}` : '';

        task += `\n\n### CRITICAL CONTEXT: PREVIOUS DECISION
The player JUST made a crucial decision at the end of the previous chapter.
You MUST SHOW THIS SCENE - do NOT skip it or summarize it as past events.

PLAYER'S CHOICE: "${choiceTitle}"${choiceFocus}

**MANDATORY REQUIREMENTS:**
1. The chapter MUST OPEN with Jack actively pursuing this choice - we see the scene unfold in real-time
2. DO NOT start with "After going to..." or "Having confronted..." - START IN THE MOMENT
3. The FIRST 200+ WORDS should be the actual scene of the chosen action
4. Show sensory details: what Jack sees, hears, feels as he takes this action
5. Include dialogue and character reactions from whoever Jack encounters

Example of WRONG approach: "After Jack confronted Wade at the wharf, he returned to his office..."
Example of CORRECT approach: "The salt wind cut through Jack's coat as he stepped onto the weathered planks of the wharf. Wade's silhouette emerged from the fog..."`;
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
    const cw = GENERATION_CONFIG?.contextWindowing || {};
    const maxFacts = cw.maxFactsInPrompt || 60;
    const maxThreads = cw.maxThreadsInPrompt || 30;

    let section = `## CONSISTENCY VERIFICATION

### ESTABLISHED FACTS (Never contradict)
${context.establishedFacts.slice(0, maxFacts).map(f => `- ${f}`).join('\n')}`;

    // Add active narrative threads that need to be maintained
    if (context.narrativeThreads && context.narrativeThreads.length > 0) {
      const threadsByType = {};
      context.narrativeThreads.slice(-maxThreads).forEach(t => {
        if (!threadsByType[t.type]) threadsByType[t.type] = [];
        threadsByType[t.type].push(t);
      });

      section += `\n\n### ACTIVE NARRATIVE THREADS (MUST Address or acknowledge)`;

      // Critical threads first (appointments, promises, threats)
      const criticalTypes = ['appointment', 'promise', 'threat'];
      const otherTypes = Object.keys(threadsByType).filter(t => !criticalTypes.includes(t));

      // With 1M token context, include ALL threads with full detail
      const maxPerCriticalType = 15;  // All critical appointments/promises/threats
      const maxPerOtherType = 10;     // Generous for other thread types
      const maxDescLen = 500;         // Full thread descriptions

      criticalTypes.forEach(type => {
        if (threadsByType[type] && threadsByType[type].length > 0) {
          section += `\n**[CRITICAL] ${type.toUpperCase()} (must be addressed):**`;
          threadsByType[type].slice(-maxPerCriticalType).forEach(t => {
            const desc = t.description || t.excerpt || '';
            const truncatedDesc = desc.length > maxDescLen ? desc.slice(0, maxDescLen) + '...' : desc;
            section += `\n- Ch${t.chapter || '?'}.${t.subchapter || '?'}: "${truncatedDesc}"`;
            if (t.characters && t.characters.length > 0) {
              section += ` [Characters: ${t.characters.join(', ')}]`;
            }
          });
        }
      });

      otherTypes.forEach(type => {
        if (threadsByType[type] && threadsByType[type].length > 0) {
          section += `\n**${type.toUpperCase()}:**`;
          threadsByType[type].slice(-maxPerOtherType).forEach(t => {
            const desc = t.description || t.excerpt || '';
            const truncatedDesc = desc.length > maxDescLen ? desc.slice(0, maxDescLen) + '...' : desc;
            section += `\n- Ch${t.chapter || '?'}.${t.subchapter || '?'}: "${truncatedDesc}"`;
          });
        }
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
  // TWO-PASS DECISION GENERATION
  // ==========================================================================

  /**
   * Generate decision structure first (Pass 1 of two-pass generation)
   * This ensures decisions are always complete and contextually appropriate,
   * preventing truncation from producing generic placeholder choices
   */
  async _generateDecisionStructure(context, chapter) {
    const decisionPrompt = `You are planning a critical decision point for Chapter ${chapter} of "Dead Letters."

## CURRENT STORY STATE
${context.storySummary || 'Jack Halloway is investigating the wrongful convictions built on his career.'}

## RECENT EVENTS
${context.previousChapterSummary || 'Jack received another letter from the Midnight Confessor.'}

## ACTIVE NARRATIVE THREADS
${context.narrativeThreads?.filter(t => t.status === 'active').slice(0, 5).map(t => `- [${t.urgency}] ${t.description}`).join('\n') || '- No active threads'}

## PATH PERSONALITY
Jack has been playing ${context.pathPersonality?.narrativeStyle || 'a balanced approach'}.
Risk tolerance: ${context.pathPersonality?.riskTolerance || 'moderate'}

## CHAPTER BEAT TYPE
This chapter's required beat: ${STORY_STRUCTURE.chapterBeatTypes?.[chapter] || 'STANDARD'}

## YOUR TASK
Design a meaningful binary decision that:
1. Emerges naturally from the story situation
2. Has NO obvious "right" answer - both options have real costs
3. Connects to themes of wrongful conviction, certainty vs truth, betrayal
4. Fits the player's established personality while challenging them
5. Creates genuinely different story branches

Generate the decision structure FIRST. This will guide the narrative that leads to it.`;

    console.log(`[StoryGenerationService] Two-pass generation: Generating decision structure for Chapter ${chapter}`);

    const response = await llmService.complete(
      [{ role: 'user', content: decisionPrompt }],
      {
        systemPrompt: 'You are a noir narrative designer creating morally complex choices. Every decision must have real stakes and no clear "correct" answer.',
        maxTokens: 2000,
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

  /**
   * Build prompt for narrative generation with pre-determined decision (Pass 2)
   */
  _buildDecisionNarrativePrompt(context, chapter, subchapter, decisionStructure) {
    const basePrompt = this._buildGenerationPrompt(context, chapter, subchapter, true);

    const decisionGuidance = `

## PRE-DETERMINED DECISION (Your narrative MUST lead to this exact choice)
The following decision has already been designed. Your narrative must naturally build toward it.

### DECISION INTRO (Use this exact text or very close variation):
"${decisionStructure.decision.intro}"

### OPTION A: "${decisionStructure.decision.optionA.title}"
- Focus: ${decisionStructure.decision.optionA.focus}
- Personality: ${decisionStructure.decision.optionA.personalityAlignment}
- Narrative setup: ${decisionStructure.decision.optionA.narrativeSetup}

### OPTION B: "${decisionStructure.decision.optionB.title}"
- Focus: ${decisionStructure.decision.optionB.focus}
- Personality: ${decisionStructure.decision.optionB.personalityAlignment}
- Narrative setup: ${decisionStructure.decision.optionB.narrativeSetup}

### KEY MOMENTS TO INCLUDE:
${decisionStructure.keyMoments.map((m, i) => `${i + 1}. ${m}`).join('\n')}

### EMOTIONAL ARC:
${decisionStructure.emotionalArc}

### CRITICAL INSTRUCTION:
Copy the decision object EXACTLY as provided above into your response. Do not modify the decision titles, focus, or intro. Your narrative should make these choices feel earned and natural, but the decision text itself is FIXED.`;

    return basePrompt + decisionGuidance;
  }

  // ==========================================================================
  // THREAD NORMALIZATION - Prevents duplicate threads across paths
  // Uses semantic similarity for fuzzy matching of equivalent threads
  // ==========================================================================

  /**
   * Synonym groups for semantic thread matching
   * Verbs in the same group are treated as equivalent for deduplication
   */
  static VERB_SYNONYM_GROUPS = [
    // Meeting/Encounter synonyms
    ['meet', 'see', 'visit', 'rendezvous', 'encounter', 'come', 'arrive', 'show'],
    // Promise/Agreement synonyms
    ['promise', 'agree', 'commit', 'vow', 'swear', 'pledge', 'guarantee', 'assure'],
    // Investigation synonyms
    ['investigate', 'search', 'look', 'examine', 'check', 'probe', 'dig', 'explore'],
    // Confrontation synonyms
    ['confront', 'face', 'challenge', 'accuse', 'question', 'interrogate', 'press'],
    // Following/Tracking synonyms
    ['follow', 'track', 'tail', 'shadow', 'pursue', 'watch', 'observe', 'surveil'],
    // Communication synonyms
    ['call', 'phone', 'contact', 'reach', 'message', 'notify', 'inform', 'tell'],
    // Discovery synonyms
    ['find', 'discover', 'uncover', 'reveal', 'learn', 'realize', 'determine'],
    // Threat synonyms
    ['threaten', 'warn', 'intimidate', 'menace', 'pressure', 'coerce'],
  ];

  /**
   * Location synonym groups for semantic matching
   */
  static LOCATION_SYNONYM_GROUPS = [
    ['docks', 'pier', 'wharf', 'harbor', 'waterfront', 'marina', 'port'],
    ['warehouse', 'building', 'factory', 'facility', 'plant'],
    ['office', 'room', 'study', 'workspace'],
    ['bar', 'pub', 'tavern', 'murphy', 'saloon'],
    ['prison', 'jail', 'greystone', 'cell', 'penitentiary'],
    ['alley', 'alleyway', 'backstreet', 'passage'],
    ['apartment', 'flat', 'residence', 'home', 'place'],
  ];

  /**
   * Stem common verb endings to base form
   */
  _stemVerb(word) {
    if (!word) return word;
    const w = word.toLowerCase();

    // Handle common verb forms
    if (w.endsWith('ing')) return w.slice(0, -3).replace(/([^aeiou])$/, '$1'); // meeting -> meet
    if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2).replace(/i$/, 'y'); // promised -> promis -> promise handled below
    if (w.endsWith('ied')) return w.slice(0, -3) + 'y'; // tried -> try
    if (w.endsWith('es') && w.length > 4) return w.slice(0, -2); // watches -> watch
    if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1); // meets -> meet

    // Fix common stemming artifacts
    const fixes = {
      'promis': 'promise', 'agre': 'agree', 'arriv': 'arrive',
      'observ': 'observe', 'investigat': 'investigate', 'determin': 'determine',
      'realiz': 'realize', 'pressur': 'pressure', 'threaten': 'threaten',
    };
    return fixes[w] || w;
  }

  /**
   * Get the canonical verb for a given verb (using synonym groups)
   */
  _getCanonicalVerb(verb) {
    const stemmed = this._stemVerb(verb);
    for (const group of StoryGenerationService.VERB_SYNONYM_GROUPS) {
      if (group.some(v => v === stemmed || stemmed.includes(v) || v.includes(stemmed))) {
        return group[0]; // Return the canonical (first) verb in group
      }
    }
    return stemmed;
  }

  /**
   * Get the canonical location for a given location (using synonym groups)
   */
  _getCanonicalLocation(location) {
    const loc = location.toLowerCase();
    for (const group of StoryGenerationService.LOCATION_SYNONYM_GROUPS) {
      if (group.some(l => loc.includes(l) || l.includes(loc))) {
        return group[0]; // Return the canonical (first) location in group
      }
    }
    return loc;
  }

  /**
   * Normalize a thread to a canonical ID for deduplication
   * Format: {type}:{sorted_entities}:{canonical_action}:{canonical_location}:{time_bucket}
   *
   * Uses semantic normalization:
   * - Verbs are stemmed and mapped to canonical synonyms
   * - Locations are mapped to canonical synonyms
   * - Time references are bucketed (morning/noon/evening/night)
   */
  _normalizeThreadId(thread) {
    if (!thread || !thread.description) return null;

    const type = thread.type || 'unknown';
    const description = thread.description.toLowerCase();

    // Extract character names mentioned in the thread
    const knownCharacters = [
      'jack', 'sarah', 'victoria', 'emily', 'tom', 'wade', 'eleanor',
      'bellamy', 'silas', 'reed', 'grange', 'marcus', 'thornhill',
      'lisa', 'chen', 'james', 'sullivan', 'teresa', 'reeves', 'confessor'
    ];

    const mentionedCharacters = knownCharacters
      .filter(name => description.includes(name))
      .sort();

    // Extract and canonicalize action verbs
    const actionPattern = /\b(meet|see|visit|visit|come|arrive|show|promise|agree|commit|vow|swear|pledge|investigate|search|look|examine|check|confront|face|challenge|accuse|question|interrogate|follow|track|tail|shadow|pursue|watch|observe|call|phone|contact|reach|message|find|discover|uncover|reveal|learn|threaten|warn|intimidate|meeting|seeing|visiting|coming|arriving|promising|agreeing|investigating|searching|confronting|following|tracking|calling|finding|discovering|threatening)[a-z]*/gi;
    const foundActions = description.match(actionPattern) || [];
    const canonicalActions = [...new Set(foundActions.map(a => this._getCanonicalVerb(a)))].sort();

    // Extract time references and bucket them
    const timeBuckets = {
      morning: /\b(morning|dawn|sunrise|am|breakfast|early)\b/i,
      noon: /\b(noon|midday|lunch|afternoon)\b/i,
      evening: /\b(evening|sunset|dusk|dinner|pm)\b/i,
      night: /\b(night|midnight|late|tonight)\b/i,
      tomorrow: /\b(tomorrow|next day)\b/i,
    };

    let timeBucket = null;
    for (const [bucket, pattern] of Object.entries(timeBuckets)) {
      if (pattern.test(description)) {
        timeBucket = bucket;
        break;
      }
    }

    // Extract and canonicalize location references
    const locations = [
      'docks', 'pier', 'wharf', 'warehouse', 'office', 'precinct', 'greystone', 'prison',
      'bar', 'murphy', 'apartment', 'morgue', 'courthouse', 'alley', 'waterfront',
      'harbor', 'building', 'factory', 'home', 'place', 'penthouse'
    ];
    const foundLocations = locations.filter(loc => description.includes(loc));
    const canonicalLocation = foundLocations.length > 0
      ? this._getCanonicalLocation(foundLocations[0])
      : null;

    // Build normalized ID with canonical forms
    const parts = [type];
    if (mentionedCharacters.length > 0) parts.push(mentionedCharacters.join(','));
    if (canonicalActions.length > 0) parts.push(canonicalActions[0]); // Primary canonical action
    if (canonicalLocation) parts.push(canonicalLocation);
    if (timeBucket) parts.push(timeBucket);

    return parts.join(':');
  }

  /**
   * Calculate semantic similarity score between two threads (0-1)
   * Used for fuzzy matching when normalized IDs don't match exactly
   */
  _calculateThreadSimilarity(thread1, thread2) {
    if (!thread1?.description || !thread2?.description) return 0;

    const desc1 = thread1.description.toLowerCase();
    const desc2 = thread2.description.toLowerCase();

    let score = 0;
    let factors = 0;

    // Same type is a strong signal
    if (thread1.type === thread2.type) {
      score += 0.3;
    }
    factors += 0.3;

    // Extract and compare characters
    const knownCharacters = [
      'jack', 'sarah', 'victoria', 'emily', 'tom', 'wade', 'eleanor',
      'bellamy', 'silas', 'reed', 'grange', 'marcus', 'thornhill',
      'lisa', 'chen', 'james', 'sullivan', 'teresa', 'reeves'
    ];

    const chars1 = new Set(knownCharacters.filter(c => desc1.includes(c)));
    const chars2 = new Set(knownCharacters.filter(c => desc2.includes(c)));
    const charIntersection = [...chars1].filter(c => chars2.has(c)).length;
    const charUnion = new Set([...chars1, ...chars2]).size;

    if (charUnion > 0) {
      score += 0.35 * (charIntersection / charUnion); // Jaccard similarity for characters
    }
    factors += 0.35;

    // Compare canonical actions
    const actionPattern = /\b(meet|see|visit|promise|agree|investigate|search|confront|follow|track|call|find|discover|threaten|watch|observe)[a-z]*/gi;
    const actions1 = [...new Set((desc1.match(actionPattern) || []).map(a => this._getCanonicalVerb(a)))];
    const actions2 = [...new Set((desc2.match(actionPattern) || []).map(a => this._getCanonicalVerb(a)))];

    const actionIntersection = actions1.filter(a => actions2.includes(a)).length;
    const actionUnion = new Set([...actions1, ...actions2]).size;

    if (actionUnion > 0) {
      score += 0.25 * (actionIntersection / actionUnion);
    }
    factors += 0.25;

    // Compare locations
    const locations = [
      'docks', 'pier', 'warehouse', 'office', 'precinct', 'greystone', 'prison',
      'bar', 'apartment', 'morgue', 'courthouse', 'alley', 'waterfront'
    ];
    const locs1 = locations.filter(l => desc1.includes(l)).map(l => this._getCanonicalLocation(l));
    const locs2 = locations.filter(l => desc2.includes(l)).map(l => this._getCanonicalLocation(l));

    if (locs1.length > 0 && locs2.length > 0) {
      const locMatch = locs1.some(l1 => locs2.includes(l1));
      if (locMatch) score += 0.1;
    }
    factors += 0.1;

    return score / factors; // Normalize to 0-1
  }

  /**
   * Deduplicate threads using normalized IDs AND semantic similarity
   * Two-pass approach: exact match first, then fuzzy match for remaining
   */
  _deduplicateThreads(threads) {
    if (!threads || threads.length === 0) return [];

    const seen = new Map();
    const deduplicated = [];
    const urgencyRank = { critical: 3, normal: 2, background: 1 };

    // PASS 1: Exact normalized ID matching
    for (const thread of threads) {
      const normalizedId = this._normalizeThreadId(thread);

      if (!normalizedId) {
        deduplicated.push(thread);
        continue;
      }

      if (!seen.has(normalizedId)) {
        seen.set(normalizedId, thread);
        thread._normalizedId = normalizedId;
        deduplicated.push(thread);
      } else {
        // Merge: keep the more urgent version, or the more recent if equal urgency
        const existing = seen.get(normalizedId);

        const urgencyA = (urgencyRank[thread.urgency] || 0);
        const urgencyB = (urgencyRank[existing.urgency] || 0);
        const isNewer = (thread.chapter > existing.chapter) ||
          (thread.chapter === existing.chapter && (thread.subchapter || 0) > (existing.subchapter || 0));

        if (urgencyA > urgencyB || (urgencyA === urgencyB && isNewer)) {
          const idx = deduplicated.indexOf(existing);
          if (idx !== -1) {
            thread._normalizedId = normalizedId;
            deduplicated[idx] = thread;
            seen.set(normalizedId, thread);
          }
        }

        console.log(`[StoryGenerationService] Deduplicated thread (exact): "${thread.description?.slice(0, 50)}..." (normalized: ${normalizedId})`);
      }
    }

    // PASS 2: Semantic similarity matching for remaining duplicates
    // Only run if we have enough threads to warrant the cost
    if (deduplicated.length > 3) {
      const SIMILARITY_THRESHOLD = 0.75; // Threads with >75% similarity are considered duplicates
      const toRemove = new Set();

      for (let i = 0; i < deduplicated.length; i++) {
        if (toRemove.has(i)) continue;

        for (let j = i + 1; j < deduplicated.length; j++) {
          if (toRemove.has(j)) continue;

          // Skip if already matched by normalized ID
          if (deduplicated[i]._normalizedId === deduplicated[j]._normalizedId) continue;

          const similarity = this._calculateThreadSimilarity(deduplicated[i], deduplicated[j]);

          if (similarity >= SIMILARITY_THRESHOLD) {
            // Keep the more urgent one, or the first one if equal urgency
            const urgencyI = urgencyRank[deduplicated[i].urgency] || 0;
            const urgencyJ = urgencyRank[deduplicated[j].urgency] || 0;

            if (urgencyJ > urgencyI) {
              toRemove.add(i);
              console.log(`[StoryGenerationService] Deduplicated thread (semantic ${(similarity * 100).toFixed(0)}%): "${deduplicated[i].description?.slice(0, 40)}..." ~= "${deduplicated[j].description?.slice(0, 40)}..."`);
            } else {
              toRemove.add(j);
              console.log(`[StoryGenerationService] Deduplicated thread (semantic ${(similarity * 100).toFixed(0)}%): "${deduplicated[j].description?.slice(0, 40)}..." ~= "${deduplicated[i].description?.slice(0, 40)}..."`);
            }
          }
        }
      }

      // Remove duplicates found in pass 2
      if (toRemove.size > 0) {
        return deduplicated.filter((_, idx) => !toRemove.has(idx));
      }
    }

    return deduplicated;
  }

  /**
   * Cap active threads to prevent state explosion
   * Keeps critical threads, most recent, and auto-resolves old background threads
   */
  _capActiveThreads(threads, maxThreads = 20) {
    if (!threads || threads.length <= maxThreads) return threads;

    // Separate by urgency
    const critical = threads.filter(t => t.urgency === 'critical' && t.status === 'active');
    const normal = threads.filter(t => t.urgency === 'normal' && t.status === 'active');
    const background = threads.filter(t => t.urgency === 'background' && t.status === 'active');
    const resolved = threads.filter(t => t.status !== 'active');

    // Always keep all critical threads
    const kept = [...critical];

    // Add normal threads up to limit
    const remainingSlots = maxThreads - kept.length;
    const normalToKeep = normal.slice(0, Math.min(normal.length, Math.ceil(remainingSlots * 0.6)));
    kept.push(...normalToKeep);

    // Add background threads with remaining slots
    const backgroundSlots = maxThreads - kept.length;
    const backgroundToKeep = background.slice(0, backgroundSlots);
    kept.push(...backgroundToKeep);

    // Auto-resolve old background threads that didn't make the cut
    const autoResolved = background.slice(backgroundSlots).map(t => ({
      ...t,
      status: 'resolved',
      _autoResolved: true,
      _autoResolveReason: 'Thread cap reached - background thread auto-closed',
    }));

    console.log(`[StoryGenerationService] Thread cap: kept ${kept.length}, auto-resolved ${autoResolved.length} background threads`);

    return [...kept, ...autoResolved, ...resolved];
  }

  // ==========================================================================
  // THREAD ARCHIVAL SYSTEM
  // ==========================================================================

  /**
   * Archive resolved threads to reduce active memory pressure
   * Stores compressed version of thread with minimal fields needed for callbacks
   * @param {Array} threads - Array of threads to process
   * @param {number} currentChapter - Current chapter number for age calculation
   */
  _archiveResolvedThreads(threads, currentChapter) {
    if (!threads || threads.length === 0) return threads;

    const activeThreads = [];
    const toArchive = [];

    for (const thread of threads) {
      // Keep active threads in main list
      if (thread.status === 'active') {
        activeThreads.push(thread);
        continue;
      }

      // Resolved/failed threads get archived
      if (thread.status === 'resolved' || thread.status === 'failed') {
        toArchive.push(thread);
      } else {
        // Unknown status - keep in active list to be safe
        activeThreads.push(thread);
      }
    }

    // Archive resolved threads with compression
    for (const thread of toArchive) {
      const compressedThread = {
        type: thread.type,
        description: thread.description?.slice(0, 100), // Truncate description
        status: thread.status,
        resolvedChapter: thread.resolvedChapter || currentChapter,
        characters: thread.characters?.slice(0, 3) || [], // Keep max 3 characters
        originalChapter: thread.chapter,
      };

      // Check if similar thread already archived (avoid duplicates)
      const isDuplicate = this.archivedThreads.some(archived =>
        archived.type === compressedThread.type &&
        archived.description === compressedThread.description
      );

      if (!isDuplicate) {
        this.archivedThreads.push(compressedThread);
      }
    }

    if (toArchive.length > 0) {
      console.log(`[StoryGenerationService] Archived ${toArchive.length} resolved threads (archive size: ${this.archivedThreads.length})`);
    }

    // Prune old archived threads based on chapter distance
    this._pruneArchivedThreads(currentChapter);

    return activeThreads;
  }

  /**
   * Prune archived threads that are too old to be relevant for callbacks
   * Keeps threads within archiveChapterRetention chapters of resolution
   */
  _pruneArchivedThreads(currentChapter) {
    const originalCount = this.archivedThreads.length;

    // Remove threads resolved more than N chapters ago
    this.archivedThreads = this.archivedThreads.filter(thread => {
      const chapterDistance = currentChapter - (thread.resolvedChapter || 0);
      return chapterDistance <= this.archiveChapterRetention;
    });

    // Also cap total archive size
    if (this.archivedThreads.length > this.maxArchivedThreads) {
      // Sort by resolution chapter (oldest first) and remove oldest
      this.archivedThreads.sort((a, b) => (a.resolvedChapter || 0) - (b.resolvedChapter || 0));
      this.archivedThreads = this.archivedThreads.slice(-this.maxArchivedThreads);
    }

    const pruned = originalCount - this.archivedThreads.length;
    if (pruned > 0) {
      console.log(`[StoryGenerationService] Pruned ${pruned} old archived threads (remaining: ${this.archivedThreads.length})`);
    }
  }

  /**
   * Get archived threads for potential callbacks or references
   * @param {string} type - Optional thread type filter
   * @param {Array} characters - Optional character filter
   */
  getArchivedThreads(type = null, characters = null) {
    let results = [...this.archivedThreads];

    if (type) {
      results = results.filter(t => t.type === type);
    }

    if (characters && characters.length > 0) {
      const charLower = characters.map(c => c.toLowerCase());
      results = results.filter(t =>
        t.characters?.some(c => charLower.includes(c.toLowerCase()))
      );
    }

    return results;
  }

  /**
   * Get thread archive statistics
   */
  getThreadArchiveStats() {
    const byType = {};
    for (const thread of this.archivedThreads) {
      byType[thread.type] = (byType[thread.type] || 0) + 1;
    }

    return {
      totalArchived: this.archivedThreads.length,
      maxArchived: this.maxArchivedThreads,
      byType,
      oldestChapter: this.archivedThreads.length > 0
        ? Math.min(...this.archivedThreads.map(t => t.resolvedChapter || 0))
        : null,
    };
  }

  // ==========================================================================
  // GENERATION CONCURRENCY CONTROL
  // ==========================================================================

  /**
   * Wait for a generation slot to become available
   * Called when we're at maxConcurrentGenerations capacity
   */
  async _waitForGenerationSlot(generationKey) {
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
  async _acquireGenerationSlot(generationKey) {
    // Prevent queue explosion - reject if queue is already too long
    const MAX_QUEUE_SIZE = 6; // Allow some queuing but prevent explosion
    if (this.generationWaitQueue.length >= MAX_QUEUE_SIZE) {
      console.warn(`[StoryGenerationService] Queue full (${this.generationWaitQueue.length} waiting), rejecting ${generationKey}`);
      throw new Error(`Generation queue full - try again later`);
    }

    if (this.activeGenerationCount < this.maxConcurrentGenerations) {
      this.activeGenerationCount++;
      console.log(`[StoryGenerationService] Acquired slot for ${generationKey} (${this.activeGenerationCount}/${this.maxConcurrentGenerations} active)`);
      return;
    }

    // At capacity - wait for a slot
    await this._waitForGenerationSlot(generationKey);
    this.activeGenerationCount++;
    console.log(`[StoryGenerationService] Acquired slot after wait for ${generationKey} (${this.activeGenerationCount}/${this.maxConcurrentGenerations} active)`);
  }

  /**
   * Release a generation slot and process next in queue
   */
  _releaseGenerationSlot(generationKey) {
    this.activeGenerationCount = Math.max(0, this.activeGenerationCount - 1);
    console.log(`[StoryGenerationService] Released slot for ${generationKey} (${this.activeGenerationCount}/${this.maxConcurrentGenerations} active, ${this.generationWaitQueue.length} waiting)`);

    // Process next waiting generation if any
    if (this.generationWaitQueue.length > 0) {
      const next = this.generationWaitQueue.shift();
      console.log(`[StoryGenerationService] Unblocking queued generation: ${next.key}`);
      next.resolve();
    }
  }

  /**
   * Get current generation queue status (for debugging/monitoring)
   */
  getGenerationQueueStatus() {
    return {
      activeGenerations: this.activeGenerationCount,
      maxConcurrent: this.maxConcurrentGenerations,
      queuedCount: this.generationWaitQueue.length,
      pendingKeys: Array.from(this.pendingGenerations.keys()),
    };
  }

  // ==========================================================================
  // GENERATION AND VALIDATION
  // ==========================================================================

  /**
   * Generate a single subchapter with validation
   * Now integrates Story Arc Planning and Chapter Outlines for 100% consistency
   * Decision points use two-pass generation to ensure complete, contextual choices
   */
  async generateSubchapter(chapter, subchapter, pathKey, choiceHistory = [], options = {}) {
    if (!llmService.isConfigured()) {
      throw new Error('LLM Service not configured. Please set an API key in settings.');
    }

    if (chapter <= 1) {
      throw new Error('Chapter 1 uses static content and should not be generated.');
    }

    const caseNumber = formatCaseNumber(chapter, subchapter);

    // IMPORTANT: Use the cumulative branch key for this chapter, derived from choiceHistory.
    // The incoming pathKey may be a legacy "A"/"B" token; we do not trust it for storage keys.
    const effectivePathKey = this._getPathKeyForChapter(chapter, choiceHistory);
    const generationKey = `${caseNumber}_${effectivePathKey}`;
    const traceId = options?.traceId || createTraceId(`sg_${caseNumber}_${pathKey}`);
    const reason = options?.reason || 'unspecified';

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
      const context = await this.buildStoryContext(chapter, subchapter, effectivePathKey, choiceHistory);

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

        // ========== SINGLE-PASS GENERATION FOR ALL SUBCHAPTERS ==========
        // Decision schema has decision field BEFORE narrative, so decision is generated first
        // This eliminates the need for two-pass generation while ensuring complete decisions
        const prompt = this._buildGenerationPrompt(context, chapter, subchapter, isDecisionPoint);
        const schema = isDecisionPoint ? DECISION_CONTENT_SCHEMA : STORY_CONTENT_SCHEMA;

        console.log(`[StoryGenerationService] Single-pass generation for Chapter ${chapter}.${subchapter} (decision=${isDecisionPoint})`);
        llmTrace('StoryGenerationService', traceId, 'prompt.built', {
          caseNumber,
          pathKey,
          chapter,
          subchapter,
          isDecisionPoint,
          promptLength: prompt?.length || 0,
          schema: isDecisionPoint ? 'DECISION_CONTENT_SCHEMA' : 'STORY_CONTENT_SCHEMA',
          contextSummary: {
            previousChapters: context?.previousChapters?.length || 0,
            establishedFacts: context?.establishedFacts?.length || 0,
            playerChoices: context?.playerChoices?.length || 0,
            narrativeThreads: context?.narrativeThreads?.length || 0,
          },
          reason,
        }, 'debug');

        const response = await llmService.complete(
          [{ role: 'user', content: prompt }],
          {
            systemPrompt: MASTER_SYSTEM_PROMPT,
            maxTokens: GENERATION_CONFIG.maxTokens.subchapter,
            responseSchema: schema,
            traceId,
            requestContext: {
              caseNumber,
              chapter,
              subchapter,
              pathKey,
              isDecisionPoint,
              reason,
            },
          }
        );

        llmTrace('StoryGenerationService', traceId, 'llm.response.received', {
          model: response?.model,
          finishReason: response?.finishReason,
          isTruncated: response?.isTruncated,
          contentLength: response?.content?.length || 0,
          usage: response?.usage || null,
        }, 'debug');

        generatedContent = this._parseGeneratedContent(response.content, isDecisionPoint);
        llmTrace('StoryGenerationService', traceId, 'llm.response.parsed', {
          hasTitle: !!generatedContent?.title,
          narrativeLength: generatedContent?.narrative?.length || 0,
          hasDecision: !!generatedContent?.decision,
          hasBridgeText: !!generatedContent?.bridgeText,
          hasPreviously: !!generatedContent?.previously,
          hasPuzzleCandidates: Array.isArray(generatedContent?.puzzleCandidates),
        }, 'debug');

        // Validate decision structure for decision points
        if (isDecisionPoint && generatedContent.decision) {
          console.log(`[StoryGenerationService] Decision generated: "${generatedContent.decision.optionA?.title}" vs "${generatedContent.decision.optionB?.title}"`);
          llmTrace('StoryGenerationService', traceId, 'decision.generated', {
            optionA: {
              key: generatedContent?.decision?.optionA?.key,
              title: generatedContent?.decision?.optionA?.title,
            },
            optionB: {
              key: generatedContent?.decision?.optionB?.key,
              title: generatedContent?.decision?.optionB?.title,
            },
          }, 'debug');
        }

        // Validate word count - only expand if significantly short
        let wordCount = generatedContent.narrative.split(/\s+/).length;
        let expansionAttempts = 0;
        const MAX_EXPANSION_ATTEMPTS = 1; // Reduced to minimize API calls

        while (wordCount < MIN_WORDS_PER_SUBCHAPTER && expansionAttempts < MAX_EXPANSION_ATTEMPTS) {
          expansionAttempts++;
          console.log(`[StoryGenerationService] Word count ${wordCount} below minimum ${MIN_WORDS_PER_SUBCHAPTER}, expansion attempt ${expansionAttempts}/${MAX_EXPANSION_ATTEMPTS}`);

          const expandedNarrative = await this._expandNarrative(
            generatedContent.narrative,
            context,
            TARGET_WORDS - wordCount
          );

          const expandedWordCount = expandedNarrative.split(/\s+/).length;

          // Only accept expansion if it actually increased word count
          if (expandedWordCount > wordCount) {
            generatedContent.narrative = expandedNarrative;
            wordCount = expandedWordCount;
            console.log(`[StoryGenerationService] Expansion successful: ${wordCount} words`);
          } else {
            console.warn(`[StoryGenerationService] Expansion did not increase word count (${expandedWordCount} <= ${wordCount})`);
            break;
          }
        }

        // If still under minimum after retries, log warning but continue
        if (wordCount < MIN_WORDS_PER_SUBCHAPTER) {
          console.warn(`[StoryGenerationService] Word count ${wordCount} still below minimum after ${expansionAttempts} expansion attempts. Proceeding with validation.`);
        }

        // Validate consistency (check for obvious violations)
        // FIRST: Fix simple typos locally without LLM call
        generatedContent = this._fixTyposLocally(generatedContent);

        let validationResult = this._validateConsistency(generatedContent, context);

        // ========== A+ QUALITY VALIDATION (Warnings Only - Don't Block Generation) ==========
        // These validators provide feedback but should NOT cause generation failures.
        // Only critical continuity issues should block generation.

        // Track setups for major revelations
        this._trackSetups(generatedContent.narrative, chapter, subchapter);

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

        // Run sentence variety validation - WARNINGS ONLY
        const sentenceVariety = this._validateSentenceVariety(generatedContent.narrative);
        if (sentenceVariety.warnings.length > 0) {
          validationResult.warnings = [...(validationResult.warnings || []), ...sentenceVariety.warnings];
        }
        if (sentenceVariety.issues.length > 0) {
          validationResult.warnings = [...(validationResult.warnings || []), ...sentenceVariety.issues.map(i => `[Variety] ${i}`)];
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

            // Re-validate word count for the fixed content with verification
            let fixedWordCount = generatedContent.narrative.split(/\s+/).length;
            if (fixedWordCount < MIN_WORDS_PER_SUBCHAPTER) {
              const expandedNarrative = await this._expandNarrative(
                generatedContent.narrative,
                context,
                TARGET_WORDS - fixedWordCount
              );
              const newWordCount = expandedNarrative.split(/\s+/).length;
              // Only accept if expansion actually helped
              if (newWordCount > fixedWordCount) {
                generatedContent.narrative = expandedNarrative;
                console.log(`[StoryGenerationService] Post-fix expansion: ${fixedWordCount} -> ${newWordCount} words`);
              }
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
            // Hard continuity failure: do NOT ship broken canon to the player.
            // Use a context-aware fallback that stays in-bounds (and acknowledges threads).
            console.warn('[StoryGenerationService] Hard validation failure; falling back:', hardIssues);
            llmTrace('StoryGenerationService', traceId, 'validation.hard_fail.fallback', {
              caseNumber,
              pathKey: effectivePathKey,
              chapter,
              subchapter,
              isDecisionPoint,
              hardIssues: hardIssues.slice(0, 10),
              reason,
            }, 'warn');

            const fallbackContent = context
              ? this._buildContextAwareFallback(chapter, subchapter, effectivePathKey, isDecisionPoint, context)
              : this._getFallbackContent(chapter, subchapter, effectivePathKey, isDecisionPoint);

            const fallbackEntry = {
              chapter,
              subchapter,
              pathKey: effectivePathKey,
              caseNumber,
              title: fallbackContent.title,
              narrative: fallbackContent.narrative,
              bridgeText: fallbackContent.bridgeText,
              previously: fallbackContent.previously,
              briefing: fallbackContent.briefing,
              decision: fallbackContent.decision,
              board: this._generateBoardData(
                fallbackContent.narrative,
                isDecisionPoint,
                fallbackContent.decision,
                fallbackContent.puzzleCandidates,
                chapter
              ),
              consistencyFacts: fallbackContent.consistencyFacts,
              chapterSummary: fallbackContent.chapterSummary,
              // Preserve continuity metadata when fallback provides it.
              storyDay: fallbackContent.storyDay,
              jackActionStyle: fallbackContent.jackActionStyle,
              jackRiskLevel: fallbackContent.jackRiskLevel,
              jackBehaviorDeclaration: fallbackContent.jackBehaviorDeclaration,
              narrativeThreads: Array.isArray(fallbackContent.narrativeThreads) ? fallbackContent.narrativeThreads : [],
              previousThreadsAddressed: Array.isArray(fallbackContent.previousThreadsAddressed) ? fallbackContent.previousThreadsAddressed : [],
              generatedAt: new Date().toISOString(),
              wordCount: fallbackContent.narrative.split(/\s+/).length,
              isFallback: true,
              fallbackReason: `Hard validation failure: ${hardIssues.slice(0, 3).join(' | ')}`,
            };

            // Save + cache + persist context so future generations stay consistent.
            await saveGeneratedChapter(caseNumber, effectivePathKey, fallbackEntry);
            if (!this.generatedStory) {
              this.generatedStory = { chapters: {} };
            }
            this.generatedStory.chapters[`${caseNumber}_${effectivePathKey}`] = fallbackEntry;
            await this._updateStoryContext(fallbackEntry);

            if (subchapter === 3) {
              await this._createConsistencyCheckpoint(chapter, effectivePathKey, fallbackEntry, choiceHistory);
            }

            llmTrace('StoryGenerationService', traceId, 'generation.complete', {
              generationKey,
              caseNumber,
              pathKey: effectivePathKey,
              chapter,
              subchapter,
              isDecisionPoint,
              wordCount: fallbackEntry.wordCount,
              isFallback: true,
              reason: `hard-validation-fallback:${reason}`,
            }, 'info');

            return fallbackEntry;
          }

          console.warn('Consistency warning (Unresolved):', allIssues);
        }

        // Build the story entry
        const storyEntry = {
          chapter,
          subchapter,
          pathKey: effectivePathKey,
          caseNumber,
          title: generatedContent.title,
          narrative: generatedContent.narrative,
          bridgeText: generatedContent.bridgeText,
          previously: generatedContent.previously || '', // Recap of previous events
          briefing: generatedContent.briefing || { summary: '', objectives: [] },
          decision: isDecisionPoint ? generatedContent.decision : null,
          board: this._generateBoardData(generatedContent.narrative, isDecisionPoint, generatedContent.decision, generatedContent.puzzleCandidates, chapter),
          consistencyFacts: generatedContent.consistencyFacts || [],
          chapterSummary: generatedContent.chapterSummary, // Store high-quality summary
          // Persist structured continuity/personality fields for future context + validation.
          storyDay: generatedContent.storyDay,
          jackActionStyle: generatedContent.jackActionStyle,
          jackRiskLevel: generatedContent.jackRiskLevel,
          jackBehaviorDeclaration: generatedContent.jackBehaviorDeclaration,
          narrativeThreads: Array.isArray(generatedContent.narrativeThreads) ? generatedContent.narrativeThreads : [],
          previousThreadsAddressed: Array.isArray(generatedContent.previousThreadsAddressed) ? generatedContent.previousThreadsAddressed : [],
          generatedAt: new Date().toISOString(),
          wordCount: generatedContent.narrative.split(/\s+/).length,
        };

        // Save the generated content
        await saveGeneratedChapter(caseNumber, effectivePathKey, storyEntry);
        llmTrace('StoryGenerationService', traceId, 'storage.saved', {
          caseNumber,
          pathKey,
          wordCount: storyEntry.wordCount,
          generatedAt: storyEntry.generatedAt,
          hasDecision: !!storyEntry.decision,
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

        // If we've exhausted retries, use fallback content
        if (attempts >= this.maxGenerationAttempts) {
          console.warn(`[StoryGenerationService] Using fallback content for ${caseNumber} after ${attempts} failed attempts`);

          // Use context-aware fallback when context is available for better continuity
          const fallbackContent = context
            ? this._buildContextAwareFallback(chapter, subchapter, effectivePathKey, isDecisionPoint, context)
            : this._getFallbackContent(chapter, subchapter, effectivePathKey, isDecisionPoint);

          // Build fallback story entry
          const fallbackEntry = {
            chapter,
            subchapter,
            pathKey: effectivePathKey,
            caseNumber,
            title: fallbackContent.title,
            narrative: fallbackContent.narrative,
            bridgeText: fallbackContent.bridgeText,
            previously: fallbackContent.previously,
            briefing: fallbackContent.briefing,
            decision: fallbackContent.decision,
            board: this._generateBoardData(fallbackContent.narrative, isDecisionPoint, fallbackContent.decision, fallbackContent.puzzleCandidates, chapter),
            consistencyFacts: fallbackContent.consistencyFacts,
            chapterSummary: fallbackContent.chapterSummary,
            // Preserve continuity metadata when available so future prompts stay consistent.
            storyDay: fallbackContent.storyDay,
            jackActionStyle: fallbackContent.jackActionStyle,
            jackRiskLevel: fallbackContent.jackRiskLevel,
            jackBehaviorDeclaration: fallbackContent.jackBehaviorDeclaration,
            narrativeThreads: Array.isArray(fallbackContent.narrativeThreads) ? fallbackContent.narrativeThreads : [],
            previousThreadsAddressed: Array.isArray(fallbackContent.previousThreadsAddressed) ? fallbackContent.previousThreadsAddressed : [],
            generatedAt: new Date().toISOString(),
            wordCount: fallbackContent.narrative.split(/\s+/).length,
            isFallback: true, // Flag to indicate this is fallback content
            fallbackReason: error.message,
          };

          // Save and return fallback
          await saveGeneratedChapter(caseNumber, effectivePathKey, fallbackEntry);
          if (!this.generatedStory) {
            this.generatedStory = { chapters: {} };
          }
          this.generatedStory.chapters[`${caseNumber}_${effectivePathKey}`] = fallbackEntry;

          // Persist story context facts (storage strips per-entry consistencyFacts).
          try {
            await this._updateStoryContext(fallbackEntry);
          } catch (e) {
            // Never block fallback return on context persistence.
            console.warn('[StoryGenerationService] Failed to update story context for fallbackEntry:', e?.message);
          }

          // Maintain checkpoint cadence even on fallback decision points.
          if (subchapter === 3) {
            try {
              await this._createConsistencyCheckpoint(chapter, effectivePathKey, fallbackEntry, choiceHistory);
            } catch (e) {
              // Best-effort only.
            }
          }

          // Clear attempt count on successful fallback
          this.generationAttempts.delete(attemptKey);

          return fallbackEntry;
        }

        // Re-throw to allow caller to retry if attempts remain
        throw error;
      }
    })();

    // Add timestamp for stale detection during pruning
    generationPromise._createdAt = Date.now();
    this.pendingGenerations.set(generationKey, generationPromise);

    // Create a timeout promise to prevent indefinite hangs
    // This matches MAX_PENDING_AGE_MS used in stale detection above
    const GENERATION_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
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

      // Final fallback if even the inner fallback failed (or timeout occurred)
      console.error(`[StoryGenerationService] Complete generation failure for ${generationKey}, using emergency fallback: ${e.message}`);
      const chapterNum = parseInt(caseNumber?.slice(0, 3)) || 2;
      const subLetter = String(caseNumber?.slice(3, 4) || 'A').toUpperCase();
      const subchapterNum = ({ A: 1, B: 2, C: 3 }[subLetter]) || 1;
      const isDecisionPoint = subchapterNum === 3;

      const emergencyFallback = this._getFallbackContent(chapterNum, subchapterNum, pathKey, isDecisionPoint);
      return {
        chapter: chapterNum,
        subchapter: subchapterNum,
        pathKey,
        caseNumber,
        title: emergencyFallback.title,
        narrative: emergencyFallback.narrative,
        bridgeText: emergencyFallback.bridgeText,
        previously: emergencyFallback.previously,
        briefing: emergencyFallback.briefing,
        decision: emergencyFallback.decision,
        board: this._generateBoardData(emergencyFallback.narrative, isDecisionPoint, emergencyFallback.decision, emergencyFallback.puzzleCandidates, chapterNum),
        consistencyFacts: emergencyFallback.consistencyFacts,
        chapterSummary: emergencyFallback.chapterSummary,
        generatedAt: new Date().toISOString(),
        wordCount: emergencyFallback.narrative.split(/\s+/).length,
        isFallback: true,
        isEmergencyFallback: true,
        fallbackReason: e.message,
      };
    } finally {
      // Always release the generation slot, even on error/fallback
      this._releaseGenerationSlot(generationKey);
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

  /**
   * Get emergency fallback content for a case
   * This is a public method for external callers who need fallback content
   * when generation has completely failed outside of generateSubchapter
   *
   * @param {number} chapter - Chapter number
   * @param {number} subchapter - Subchapter number (1, 2, or 3)
   * @param {string} pathKey - Path key (A or B)
   * @param {Object} context - Optional story context for context-aware fallback
   */
  getEmergencyFallback(chapter, subchapter, pathKey, context = null) {
    const isDecisionPoint = subchapter === 3;
    const caseNumber = `${String(chapter).padStart(3, '0')}${['A', 'B', 'C'][subchapter - 1]}`;

    // Use context-aware fallback when context is available for better continuity
    const fallbackContent = context
      ? this._buildContextAwareFallback(chapter, subchapter, pathKey, isDecisionPoint, context)
      : this._getFallbackContent(chapter, subchapter, pathKey, isDecisionPoint);

    return {
      chapter,
      subchapter,
      pathKey,
      caseNumber,
      title: fallbackContent.title,
      narrative: fallbackContent.narrative,
      bridgeText: fallbackContent.bridgeText,
      previously: fallbackContent.previously,
      briefing: fallbackContent.briefing,
      decision: fallbackContent.decision,
      board: this._generateBoardData(fallbackContent.narrative, isDecisionPoint, fallbackContent.decision, fallbackContent.puzzleCandidates, chapter),
      consistencyFacts: fallbackContent.consistencyFacts,
      chapterSummary: fallbackContent.chapterSummary,
      generatedAt: new Date().toISOString(),
      wordCount: fallbackContent.narrative.split(/\s+/).length,
      isFallback: true,
      isEmergencyFallback: true,
      fallbackReason: context ? 'Context-aware emergency fallback' : 'External emergency fallback request',
    };
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
        // Schema-enforced structured fields (needed for validation + continuity)
        storyDay: parsed.storyDay,
        jackActionStyle: parsed.jackActionStyle,
        jackRiskLevel: parsed.jackRiskLevel,
        jackBehaviorDeclaration: parsed.jackBehaviorDeclaration,
        narrativeThreads: Array.isArray(parsed.narrativeThreads) ? parsed.narrativeThreads : [],
        previousThreadsAddressed: Array.isArray(parsed.previousThreadsAddressed) ? parsed.previousThreadsAddressed : [],
        decision: null,
      };

      // Convert decision format if present
      if (isDecisionPoint && parsed.decision) {
        // DEBUG: Log raw decision from LLM to diagnose parsing issues
        console.log('[StoryGenerationService] Raw decision from LLM:', JSON.stringify(parsed.decision, null, 2));
        result.decision = this._convertDecisionFormat(parsed.decision);
        // DEBUG: Log converted decision
        if (!result.decision?.options?.[0]?.title || !result.decision?.options?.[1]?.title) {
          console.error('[StoryGenerationService] DECISION PARSING FAILED - options missing titles:', {
            rawOptionA: parsed.decision.optionA,
            rawOptionB: parsed.decision.optionB,
            convertedOptions: result.decision?.options,
          });
        }
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
    // Build option objects once
    const optionAObj = {
      key: decision.optionA?.key || 'A',
      title: decision.optionA?.title || 'Option A',
      focus: decision.optionA?.focus || '',
      personalityAlignment: decision.optionA?.personalityAlignment || 'neutral',
      consequence: null,
      stats: null,
      outcome: null,
      nextChapter: null, // Will be set by game logic
      nextPathKey: decision.optionA?.key || 'A',
      details: [],
    };
    const optionBObj = {
      key: decision.optionB?.key || 'B',
      title: decision.optionB?.title || 'Option B',
      focus: decision.optionB?.focus || '',
      personalityAlignment: decision.optionB?.personalityAlignment || 'neutral',
      consequence: null,
      stats: null,
      outcome: null,
      nextChapter: null, // Will be set by game logic
      nextPathKey: decision.optionB?.key || 'B',
      details: [],
    };

    return {
      intro: [decision.intro || ''],
      // Keep both formats for compatibility:
      // - options[] array for iteration
      // - optionA/optionB for direct access
      options: [optionAObj, optionBObj],
      optionA: optionAObj,
      optionB: optionBObj,
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
   * Best-effort sanitizer to enforce third-person limited narration for fallback text.
   *
   * This runs ONLY on fallback narratives (not LLM output) to avoid POV drift if
   * the hardcoded templates were authored in first-person.
   *
   * Heuristic:
   * - Track whether we are inside a double-quoted dialogue span.
   * - Only rewrite tokens when NOT inside dialogue quotes.
   */
  _sanitizeNarrativeToThirdPerson(text) {
    if (!text || typeof text !== 'string') return text;

    const mapToken = (token) => {
      const lower = token.toLowerCase();
      // Common first-person tokens -> third-person equivalents (close on Jack)
      const replacements = {
        'i': 'Jack',
        // Contractions (best-effort; fallback text only)
        "i'd": "Jack had",   // ambiguous (had/would); "had" is safer in past-tense narration
        "i've": "Jack has",
        "i'll": "Jack will",
        "i'm": "Jack is",
        'me': 'him',
        'my': 'his',
        'mine': 'his',
        'myself': 'himself',
        'we': 'they',
        "we've": 'they have',
        "we'd": 'they had',
        "we'll": 'they will',
        "we're": 'they are',
        'us': 'them',
        'our': 'their',
        'ours': 'theirs',
        'ourselves': 'themselves',
      };

      if (replacements[lower]) {
        // Preserve capitalization when the original token is capitalized.
        const rep = replacements[lower];
        if (token[0] === token[0].toUpperCase()) {
          return rep;
        }
        // Lowercase "jack" mid-sentence looks odd; keep "Jack" and "him/his".
        if (rep === 'Jack') return 'Jack';
        if (rep === 'Jack had') return 'Jack had';
        if (rep === 'Jack would') return 'Jack would';
        if (rep === 'Jack was') return 'Jack was';
        return rep;
      }

      return token;
    };

    let out = '';
    let inQuote = false;
    let token = '';

    const flush = () => {
      if (!token) return;
      out += inQuote ? token : mapToken(token);
      token = '';
    };

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        flush();
        inQuote = !inQuote;
        out += ch;
        continue;
      }
      // Tokenize on letters and apostrophes (keep contractions as one token)
      if (/[A-Za-z']/g.test(ch)) {
        token += ch;
      } else {
        flush();
        out += ch;
      }
    }
    flush();

    return out;
  }

  /**
   * Fix common typos locally without calling the LLM
   * This prevents expensive API calls for simple string replacements
   */
  _fixTyposLocally(content) {
    if (!content?.narrative) return content;

    let narrative = content.narrative;
    let fixCount = 0;

    // Name typos - case-insensitive replacement with proper capitalization
    const typoFixes = [
      // Character names
      { pattern: /\bhallaway\b/gi, replacement: 'Halloway' },
      { pattern: /\bholloway\b/gi, replacement: 'Halloway' },
      { pattern: /\bhaloway\b/gi, replacement: 'Halloway' },
      { pattern: /\bhallo way\b/gi, replacement: 'Halloway' },
      { pattern: /\bblackwood\b/gi, replacement: 'Blackwell' },
      { pattern: /\bblackwel\b/gi, replacement: 'Blackwell' },
      { pattern: /\bblack well\b/gi, replacement: 'Blackwell' },
      { pattern: /\breaves\b/gi, replacement: 'Reeves' },
      { pattern: /\breevs\b/gi, replacement: 'Reeves' },
      { pattern: /\breeve\s/gi, replacement: 'Reeves ' },
      { pattern: /\bbellami\b/gi, replacement: 'Bellamy' },
      { pattern: /\bbella my\b/gi, replacement: 'Bellamy' },
      { pattern: /\bthornhil\b/gi, replacement: 'Thornhill' },
      { pattern: /\bthorn hill\b/gi, replacement: 'Thornhill' },
      { pattern: /\bgranges\b/gi, replacement: 'Grange' },
      { pattern: /\bgrang\s/gi, replacement: 'Grange ' },
      { pattern: /\bsilias\b/gi, replacement: 'Silas' },
      { pattern: /\bsilass\b/gi, replacement: 'Silas' },
      { pattern: /\bsi las\b/gi, replacement: 'Silas' },
      // Location names
      { pattern: /\bashport's\b/gi, replacement: "Ashport's" },
      { pattern: /\bash port\b/gi, replacement: 'Ashport' },
    ];

    for (const { pattern, replacement } of typoFixes) {
      const before = narrative;
      narrative = narrative.replace(pattern, replacement);
      if (before !== narrative) {
        fixCount++;
      }
    }

    if (fixCount > 0) {
      console.log(`[StoryGenerationService] Fixed ${fixCount} typos locally (no LLM call needed)`);
    }

    return {
      ...content,
      narrative,
    };
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
    // These should rarely trigger now since _fixTyposLocally runs first
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
        // Use word boundary regex instead of includes() to prevent false positives
        // e.g., correct spelling "thornhill" should NOT match misspelling "thornhil"
        // e.g., correct spelling "blackwell" should NOT match misspelling "blackwel"
        const trimmedMisspelling = misspelling.trim();
        const escapedMisspelling = trimmedMisspelling.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Handle multi-word misspellings like "thorn hill" -> /\bthorn\s+hill\b/
        const patternStr = escapedMisspelling.replace(/\s+/g, '\\s+');
        const pattern = new RegExp(`\\b${patternStr}\\b`, 'i');
        if (pattern.test(narrative)) {
          issues.push(`Name misspelled: found "${trimmedMisspelling}", should be "${correct}"`);
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
    // CATEGORY 2.5: STORY DAY CONSISTENCY
    // =========================================================================
    // Validate that storyDay matches chapter number (story spans exactly 12 days)
    if (content.storyDay !== undefined && context.currentPosition?.chapter) {
      const expectedDay = context.currentPosition.chapter;
      if (content.storyDay !== expectedDay) {
        issues.push(`STORY DAY MISMATCH: LLM declared day ${content.storyDay} but chapter ${expectedDay} should be day ${expectedDay}. The story spans exactly 12 days, one per chapter.`);
      }
    }

    // Check for relative time references that could cause drift
    const relativeTimePatterns = [
      { pattern: /(?:nearly|almost|about|roughly)\s+(?:a\s+)?decade/i, issue: 'Avoid vague time references like "nearly a decade" - use exact durations (8 years for Eleanor, 7 years for Emily)' },
      { pattern: /(?:many|several|countless)\s+years\s+(?:ago|since)/i, issue: 'Avoid vague "many/several years" - use exact durations from ABSOLUTE_FACTS' },
    ];

    relativeTimePatterns.forEach(({ pattern, issue }) => {
      if (pattern.test(narrativeOriginal)) {
        warnings.push(issue); // Warning, not error, for vague references
      }
    });

    // =========================================================================
    // CATEGORY 2.75: CHOICE CAUSALITY (Respect the most recent player decision)
    // =========================================================================
    // If this is the first subchapter of a new chapter, the narrative must quickly reflect
    // the last decision's immediate consequence. This prevents "generic reset" feeling.
    if (
      context?.currentPosition?.subchapter === 1 &&
      context?.currentPosition?.chapter > 1 &&
      context?.lastDecision &&
      context?.lastDecision?.chapter === context.currentPosition.chapter - 1
    ) {
      const prefix = narrativeOriginal
        .split(/\s+/)
        .slice(0, 200)
        .join(' ')
        .toLowerCase();

      // Stopwords used for choice-causality keyword extraction.
      // Include common noir/setting tokens so we don't get false positives like "truth/rain/case".
      const stop = new Set([
        'jack', 'halloway', 'ashport', 'sarah', 'victoria', 'confessor', 'wade', 'tom',
        'said', 'the', 'and', 'that', 'with', 'from', 'into', 'then', 'over', 'under',
        'were', 'was', 'had', 'have', 'this', 'there', 'their', 'they', 'them', 'what',
        'when', 'where', 'which', 'while', 'because', 'before', 'after', 'could', 'would',
        'should', 'about', 'again', 'still', 'rain', 'truth', 'case', 'cases', 'evidence',
        'investigation', 'city', 'street', 'streets', 'office', 'night', 'days', 'years',
        'choice', 'chose', 'decided', 'decision', 'option', 'path', 'plan',
      ]);
      const seedText = `${context.lastDecision.immediate || ''} ${context.lastDecision.chosenTitle || ''} ${context.lastDecision.chosenFocus || ''}`;
      const keywords = [...new Set(
        seedText
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length >= 4 && !stop.has(w))
      )].slice(0, 10);

      // Use word-based prefix matching to prevent false positives (e.g., "case" matching "showcase")
      const prefixWords = prefix.match(/\b\w+\b/g) || [];
      const hitCount = keywords.reduce((acc, k) => {
        const found = prefixWords.some(pw => {
          if (k.length < 4 || pw.length < 4) return k === pw;
          return k.startsWith(pw) || pw.startsWith(k);
        });
        return acc + (found ? 1 : 0);
      }, 0);
      if (hitCount === 0 && keywords.length > 0) {
        issues.push(
          `CHOICE RESPECT VIOLATION: Chapter start does not reflect last decision (Chapter ${context.lastDecision.chapter} option "${context.lastDecision.optionKey}") within first 200 words. Must show concrete consequence: ${context.lastDecision.immediate}`
        );
      }
    }

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
    // Enforced as errors UNLESS emotional state justifies deviation
    // =========================================================================
    if (context.pathPersonality) {
      const personality = context.pathPersonality;

      // Check emotional state early - desperate/angry/regretful allows personality deviations
      // Regretful Jack might act rashly out of guilt (e.g., confessing, taking unnecessary risks)
      const emotionalState = content.jackBehaviorDeclaration?.emotionalState;
      const allowsPersonalityBreak = emotionalState === 'desperate' || emotionalState === 'angry' || emotionalState === 'regretful';

      // Validate jackActionStyle and jackRiskLevel from LLM output match expected personality
      const expectedActionStyle = personality.riskTolerance === 'low' ? 'cautious'
        : personality.riskTolerance === 'high' ? 'direct' : 'balanced';
      const expectedRiskLevel = personality.riskTolerance || 'moderate';

      // Check if LLM declared action style matches expected (from schema output)
      if (content.jackActionStyle && content.jackActionStyle !== expectedActionStyle) {
        // Allow balanced as acceptable middle ground
        if (content.jackActionStyle !== 'balanced' && expectedActionStyle !== 'balanced') {
          if (allowsPersonalityBreak) {
            warnings.push(`Jack's action style "${content.jackActionStyle}" differs from expected "${expectedActionStyle}", but emotional state "${emotionalState}" may justify this.`);
          } else {
            issues.push(`Jack's action style mismatch: LLM declared "${content.jackActionStyle}" but player path personality expects "${expectedActionStyle}"`);
          }
        }
      }

      if (content.jackRiskLevel && content.jackRiskLevel !== expectedRiskLevel) {
        // Allow moderate as acceptable middle ground
        if (content.jackRiskLevel !== 'moderate' && expectedRiskLevel !== 'moderate') {
          if (allowsPersonalityBreak) {
            warnings.push(`Jack's risk level "${content.jackRiskLevel}" differs from expected "${expectedRiskLevel}", but emotional state "${emotionalState}" may justify this.`);
          } else {
            issues.push(`Jack's risk level mismatch: LLM declared "${content.jackRiskLevel}" but player path personality expects "${expectedRiskLevel}"`);
          }
        }
      }

      // =========================================================================
      // BEHAVIOR DECLARATION VALIDATION (Schema-Level Enforcement)
      // Uses allowsPersonalityBreak defined above for emotional state exceptions
      // =========================================================================
      if (content.jackBehaviorDeclaration) {
        const behavior = content.jackBehaviorDeclaration;

        // Define personality-appropriate behaviors
        const methodicalBehaviors = {
          primaryAction: ['investigate', 'observe', 'wait', 'follow'],
          dialogueApproach: ['measured', 'evasive', 'empathetic'],
          physicalBehavior: ['tense', 'defensive', 'stealthy'],
        };

        const aggressiveBehaviors = {
          primaryAction: ['confront', 'interrogate', 'negotiate'],
          dialogueApproach: ['aggressive', 'threatening'],
          physicalBehavior: ['aggressive', 'commanding', 'tense'],
        };

        if (personality.riskTolerance === 'low') {
          // Methodical player - check for aggressive behaviors
          if (behavior.primaryAction && aggressiveBehaviors.primaryAction.includes(behavior.primaryAction)) {
            if (!methodicalBehaviors.primaryAction.includes(behavior.primaryAction)) {
              if (allowsPersonalityBreak) {
                warnings.push(`Methodical player declared aggressive primaryAction="${behavior.primaryAction}", but emotional state "${emotionalState}" may justify this.`);
              } else {
                issues.push(`BEHAVIOR DECLARATION MISMATCH: Methodical player but declared primaryAction="${behavior.primaryAction}". Expected one of: ${methodicalBehaviors.primaryAction.join(', ')}`);
              }
            }
          }
          if (behavior.dialogueApproach && aggressiveBehaviors.dialogueApproach.includes(behavior.dialogueApproach)) {
            if (allowsPersonalityBreak) {
              warnings.push(`Methodical player declared aggressive dialogueApproach="${behavior.dialogueApproach}", but emotional state "${emotionalState}" may justify this.`);
            } else {
              issues.push(`BEHAVIOR DECLARATION MISMATCH: Methodical player but declared dialogueApproach="${behavior.dialogueApproach}". Expected one of: ${methodicalBehaviors.dialogueApproach.join(', ')}`);
            }
          }
          if (behavior.physicalBehavior === 'aggressive' || behavior.physicalBehavior === 'commanding') {
            if (allowsPersonalityBreak) {
              warnings.push(`Methodical player declared aggressive physicalBehavior="${behavior.physicalBehavior}", but emotional state "${emotionalState}" may justify this.`);
            } else {
              issues.push(`BEHAVIOR DECLARATION MISMATCH: Methodical player but declared physicalBehavior="${behavior.physicalBehavior}". Expected one of: ${methodicalBehaviors.physicalBehavior.join(', ')}`);
            }
          }
        } else if (personality.riskTolerance === 'high') {
          // Aggressive player - check for overly cautious behaviors (always warnings, not errors)
          if (behavior.primaryAction === 'wait' || behavior.primaryAction === 'flee') {
            warnings.push(`BEHAVIOR NOTE: Aggressive player declared primaryAction="${behavior.primaryAction}" - ensure this is justified by circumstances`);
          }
          if (behavior.dialogueApproach === 'evasive' || behavior.dialogueApproach === 'pleading') {
            warnings.push(`BEHAVIOR NOTE: Aggressive player declared dialogueApproach="${behavior.dialogueApproach}" - ensure this is justified by circumstances`);
          }
        }

        // Verify the personalityConsistencyNote is present and reasonable
        if (!behavior.personalityConsistencyNote || behavior.personalityConsistencyNote.length < 20) {
          warnings.push('Behavior declaration missing or has insufficient personalityConsistencyNote explanation');
        }
      }

      // Check for personality-inconsistent behavior in narrative text
      // Uses emotionalState and allowsPersonalityBreak already defined at start of Category 4
      if (personality.riskTolerance === 'low') {
        // Methodical Jack shouldn't suddenly be reckless (unless emotionally compromised)
        // Improved regex: use word boundaries and exclude false positives like "charged with"
        const recklessBehavior = /\b(?:i|jack)\s+(?:rushed|stormed|lunged|burst|barreled)\s+(?:in|into|through|forward)\b/i;
        const chargedAction = /\b(?:i|jack)\s+charged\s+(?:in|into|through|forward|at)\b/i; // Separate to exclude "charged with"

        if (recklessBehavior.test(narrativeOriginal) || chargedAction.test(narrativeOriginal)) {
          if (allowsPersonalityBreak) {
            warnings.push(`Methodical Jack is acting recklessly, but emotional state "${emotionalState}" may justify this deviation.`);
          } else {
            issues.push('PERSONALITY VIOLATION: Methodical Jack is acting recklessly (rushed/charged/stormed). Rewrite with cautious approach or set emotionalState to "desperate", "angry", or "regretful".');
          }
        }

        // Check for impulsive actions - improved with word boundaries
        const impulsiveActions = /\bwithout\s+(?:thinking|hesitation|a\s+second\s+thought)\b|\b(?:i|jack)\s+(?:grabbed|lunged|dove|leapt)\s+(?:at|for|toward)\b/i;
        if (impulsiveActions.test(narrativeOriginal)) {
          if (allowsPersonalityBreak) {
            warnings.push(`Methodical Jack is acting impulsively, but emotional state "${emotionalState}" may justify this.`);
          } else {
            issues.push('PERSONALITY VIOLATION: Methodical Jack is acting impulsively. Rewrite with deliberate actions or set emotionalState to "desperate", "angry", or "regretful".');
          }
        }
      } else if (personality.riskTolerance === 'high') {
        // Aggressive Jack shouldn't suddenly become overly cautious
        // Note: For aggressive->cautious, we use warnings (not errors) since this is less narratively jarring
        const overlyPrudent = /\b(?:i|jack)\s+(?:hesitated\s+for\s+(?:a\s+)?long|wavered|second-guessed|held\s+back|waited\s+patiently|decided\s+to\s+wait)\b/i;
        if (overlyPrudent.test(narrativeOriginal)) {
          warnings.push('Aggressive Jack is showing cautious behavior (hesitated/wavered). Consider if this fits the scene context.');
        }

        // Check for excessive deliberation
        const excessiveDeliberation = /\b(?:i|jack)\s+(?:carefully\s+considered|weighed\s+(?:my|the)\s+options|took\s+(?:my|his)\s+time\s+(?:to|before))\b/i;
        if (excessiveDeliberation.test(narrativeOriginal)) {
          warnings.push('Aggressive Jack is deliberating excessively. Consider if this fits the scene context.');
        }
      }
    }

    // =========================================================================
    // CATEGORY 5: PLOT CONTINUITY - Check narrative threads - STRICTLY ENFORCED
    // =========================================================================
    if (context.narrativeThreads && context.narrativeThreads.length > 0) {
      // Get critical threads that MUST be addressed (appointments and promises)
      const criticalThreads = context.narrativeThreads.filter(t =>
        t.status === 'active' &&
        (t.type === 'appointment' || t.type === 'promise' || t.type === 'threat' || t.urgency === 'critical')
      );

      if (criticalThreads.length > 0 && context.currentPosition.chapter > 2) {
        // Check if LLM provided thread acknowledgments
        const addressedThreads = content.previousThreadsAddressed || [];

        // ========== NEW: Verify addressed threads actually match critical threads ==========
        // This prevents the LLM from claiming to address made-up threads
        let validAddressedCount = 0;
        const unmatchedCritical = [...criticalThreads];

        for (const addressed of addressedThreads) {
          const addressedLower = (addressed.originalThread || '').toLowerCase();

          // Try to match this addressed thread to a critical thread
          const matchIndex = unmatchedCritical.findIndex(critical => {
            const criticalLower = (critical.description || '').toLowerCase();
            // Match if there's significant overlap in key terms
            const addressedWords = addressedLower.split(/\s+/).filter(w => w.length > 3);
            const criticalWords = criticalLower.split(/\s+/).filter(w => w.length > 3);
            // Use prefix matching: one word must be a prefix of the other (min 4 chars)
            // This allows "promise" to match "promised" but prevents "case" matching "showcase"
            const wordsMatch = (a, b) => {
              if (a.length < 4 || b.length < 4) return a === b;
              return a.startsWith(b) || b.startsWith(a);
            };
            const matchingWords = addressedWords.filter(w => criticalWords.some(cw => wordsMatch(w, cw)));
            // Require at least 2 matching words or 40% overlap
            return matchingWords.length >= 2 || matchingWords.length / Math.max(addressedWords.length, 1) > 0.4;
          });

          if (matchIndex !== -1) {
            validAddressedCount++;
            unmatchedCritical.splice(matchIndex, 1); // Remove matched thread
          } else {
            // Log potential fabricated thread
            console.warn(`[StoryGenerationService] Thread addressed doesn't match any critical thread: "${addressedLower.slice(0, 60)}..."`);
          }
        }

        // Require ALL critical threads to be VALIDLY acknowledged.
        // The system prompt instructs the model to copy originalThread exactly and the engine treats
        // missing critical threads as a hard continuity failure (we will hard-enforce in generation).
        const criticalCount = criticalThreads.length;
        const requiredAcknowledgments = criticalCount;
        if (validAddressedCount < requiredAcknowledgments) {
          issues.push(
            `THREAD CONTINUITY VIOLATION: Only ${validAddressedCount}/${criticalCount} critical threads validly addressed (${addressedThreads.length} claimed). Must acknowledge ALL ${requiredAcknowledgments}. Unaddressed: ${unmatchedCritical.slice(0, 3).map(t => t.description?.slice(0, 50)).join('; ')}`
          );
        }

        // =========================================================================
        // THREAD ESCALATION SYSTEM - Track and enforce overdue threads
        // =========================================================================
        for (const addressed of addressedThreads) {
          const threadId = addressed.originalThread.slice(0, 50); // Use truncated description as ID

          if (addressed.howAddressed === 'acknowledged' || addressed.howAddressed === 'delayed') {
            // Increment acknowledgment count for threads that weren't progressed
            const currentCount = (this.threadAcknowledgmentCounts.get(threadId) || 0) + 1;
            this.threadAcknowledgmentCounts.set(threadId, currentCount);

            // If acknowledged 2+ times without progress, flag as OVERDUE ERROR
            if (currentCount >= 2) {
              const matchingCritical = criticalThreads.find(t =>
                t.description && t.description.toLowerCase().includes(threadId.toLowerCase().slice(0, 20))
              );
              if (matchingCritical) {
                issues.push(`OVERDUE THREAD ERROR: "${addressed.originalThread.slice(0, 60)}..." has been acknowledged ${currentCount} times without resolution. You MUST either resolve it, progress it meaningfully, or mark it as "failed" with explanation.`);
              }
            }
          } else if (addressed.howAddressed === 'resolved' || addressed.howAddressed === 'progressed' || addressed.howAddressed === 'failed') {
            // Reset counter when thread is actually addressed
            this.threadAcknowledgmentCounts.delete(threadId);
          }

          // Verify acknowledged threads actually appear in narrative
          if (addressed.howAddressed === 'resolved' || addressed.howAddressed === 'progressed') {
            const threadLower = addressed.originalThread.toLowerCase();
            const narrativeLower = narrative.toLowerCase();

            // Extract key nouns/names from the thread description
            const keyWords = threadLower.match(/\b(?:jack|sarah|victoria|eleanor|silas|tom|wade|grange|meet|promise|call|contact|investigate|reveal)\b/g) || [];

            // Use prefix matching to allow word variations (meet/meeting, promise/promised)
            // but prevent false positives (case/showcase)
            const narrativeWords = narrativeLower.match(/\b\w+\b/g) || [];
            const mentionedInNarrative = keyWords.some(keyword => {
              return narrativeWords.some(w => {
                if (keyword.length < 4 || w.length < 4) return keyword === w;
                return keyword.startsWith(w) || w.startsWith(keyword);
              });
            });

            if (!mentionedInNarrative && keyWords.length > 0) {
              warnings.push(`Thread claimed as "${addressed.howAddressed}" but may not appear in narrative: "${addressed.originalThread.slice(0, 60)}..."`);
            }
          }
        }
      }

      // Check for dangling appointments more than 2 chapters old - NOW ERROR
      const oldAppointments = context.narrativeThreads.filter(t =>
        t.status === 'active' &&
        t.type === 'appointment' &&
        t.chapter && (context.currentPosition.chapter - t.chapter) >= 2
      );

      if (oldAppointments.length > 0) {
        issues.push(`OVERDUE APPOINTMENTS: ${oldAppointments.length} appointment(s) from 2+ chapters ago still unresolved. These MUST be addressed: ${oldAppointments.slice(0, 2).map(t => t.description).join('; ')}`);
      }

      // Check for old promises - NOW ERROR after 3 chapters
      const oldPromises = context.narrativeThreads.filter(t =>
        t.status === 'active' &&
        t.type === 'promise' &&
        t.chapter && (context.currentPosition.chapter - t.chapter) >= 3
      );

      if (oldPromises.length > 0) {
        issues.push(`OVERDUE PROMISES: ${oldPromises.length} promise(s) from 3+ chapters ago still unresolved. These MUST be resolved or failed: ${oldPromises.slice(0, 2).map(t => t.description).join('; ')}`);
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
      { pattern: /\bseemingly\b|\binterestingly\b|\bnotably\b|\bcertainly\b|\bundoubtedly\b/i, issue: 'Forbidden flowery adverbs detected' },
      { pattern: /\bundeniably\b|\bprofoundly\b|\bunmistakably\b|\binherently\b/i, issue: 'Forbidden AI-ism adverbs detected (undeniably, profoundly, unmistakably, inherently)' },
      { pattern: /\bdelve\b|\bunravel\b|\btapestry\b|\bmyriad\b/i, issue: 'Forbidden words detected (delve, unravel, tapestry, myriad)' },
      { pattern: /\brealm\b|\bintricate\b|\bnuanced\b|\bpivotal\b|\bcrucial\b/i, issue: 'Forbidden AI-ism words detected (realm, intricate, nuanced, pivotal, crucial)' },
      { pattern: /\ba testament to\b|\bserves as a reminder\b/i, issue: 'Forbidden cliche phrase detected' },
      { pattern: /\bthe weight of\b|\bthe gravity of\b|\bthe magnitude of\b|\bthe enormity of\b/i, issue: 'Forbidden "weight/gravity of" phrase detected' },
      { pattern: /\bmoreover\b|\bfurthermore\b|\bin essence\b|\bconsequently\b|\badditionally\b/i, issue: 'Forbidden academic connectors detected' },
      { pattern: /\bthis moment\b|\bthis realization\b|\bthis truth\b/i, issue: 'Forbidden meta-commentary detected ("this moment/realization/truth")' },
      { pattern: /\bin that moment\b|\bat that instant\b|\bin the blink of an eye\b/i, issue: 'Forbidden time transition cliche detected' },
      { pattern: /\bit'?s (?:important|worth) (?:to note|noting)\b/i, issue: 'Forbidden meta-phrase detected ("it\'s important/worth noting")' },
    ];

    // Forbidden patterns are now WARNINGS, not errors
    // Stylistic preferences should not trigger expensive LLM retries
    forbiddenPatterns.forEach(({ pattern, issue, count }) => {
      if (count) {
        const matches = narrativeOriginal.match(pattern);
        if (matches && matches.length > 0) {
          warnings.push(`${issue} (found ${matches.length} instances)`);
        }
      } else if (pattern.test(narrativeOriginal)) {
        warnings.push(issue);
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
    const maxWords = GENERATION_CONFIG?.wordCount?.maximum;
    if (typeof maxWords === 'number' && wordCount > maxWords) {
      warnings.push(`Narrative longer than maximum: ${wordCount} words (max ${maxWords}). Consider tightening for pacing/latency.`);
    }

    // =========================================================================
    // CATEGORY 8.5: STRUCTURED FIELDS QUALITY (Bridge/Previously/Summary/Puzzle words)
    // =========================================================================
    // Bridge: hook sentence should be short.
    if (typeof content.bridgeText === 'string') {
      const bridgeWords = content.bridgeText.split(/\s+/).filter(Boolean).length;
      if (bridgeWords > 18) warnings.push(`Bridge text is long (${bridgeWords} words). Aim for <= 15 words for a punchy hook.`);
    }

    // Previously: 1-2 sentences, <= 40 words.
    if (typeof content.previously === 'string') {
      const prevWords = content.previously.split(/\s+/).filter(Boolean).length;
      if (prevWords > 60) {
        warnings.push(`"previously" is too long (${prevWords} words). Must be 1-2 sentences and <= 40 words.`);
      } else if (prevWords > 40) {
        warnings.push(`"previously" exceeds 40-word target (${prevWords}). Consider tightening.`);
      }
    }

    // Chapter summary: should be concise, memory-friendly.
    if (typeof content.chapterSummary === 'string') {
      const summarySentences = content.chapterSummary.match(/[^.!?]+[.!?]+/g) || [];
      if (summarySentences.length > 5) warnings.push(`chapterSummary has many sentences (${summarySentences.length}). Aim for 2-3 sentences.`);
      const summaryWords = content.chapterSummary.split(/\s+/).filter(Boolean).length;
      if (summaryWords > 120) warnings.push(`chapterSummary is long (${summaryWords} words). Aim for <= 60-80 words.`);
    }

    // Puzzle candidates should be anchored in the narrative so the board feels fair.
    if (Array.isArray(content.puzzleCandidates)) {
      if (content.puzzleCandidates.length < 6) warnings.push(`puzzleCandidates has only ${content.puzzleCandidates.length} words. Aim for 6-8 distinct words.`);
      const lowerNarr = narrativeOriginal.toLowerCase();
      const narrativeWords = lowerNarr.match(/\b\w+\b/g) || [];
      content.puzzleCandidates.forEach((w) => {
        if (!w || typeof w !== 'string') return;
        const token = w.toLowerCase();
        // Use prefix matching: puzzle word should be recognizable in narrative
        // "rain" matches "raining" ✓, "investigate" matches "investigation" ✓
        // but "rain" doesn't match "train" ✓ (neither is prefix of other)
        const foundInNarrative = narrativeWords.some(nw => {
          if (token.length < 4 || nw.length < 4) return token === nw;
          return token.startsWith(nw) || nw.startsWith(token);
        });
        if (!foundInNarrative) {
          warnings.push(`puzzleCandidates word "${w}" does not appear in narrative. Prefer words drawn directly from the prose for fairness.`);
        }
      });
    }

    // =========================================================================
    // CATEGORY 9: PERSPECTIVE/TENSE CONSISTENCY
    // =========================================================================
    // This game is THIRD-PERSON LIMITED (close on Jack), past tense.
    // Reject first-person narration pronouns to prevent POV drift,
    // but allow first-person INSIDE dialogue.
    const containsPronounOutsideQuotes = (text, pronounRegex) => {
      if (!text) return false;
      let quoteType = null; // null = not in quote, 'single' or 'double'
      let buf = '';
      const flush = () => {
        if (!buf) return false;
        const hit = pronounRegex.test(buf);
        buf = '';
        return hit;
      };

      // Handle all common quote types, tracking single vs double separately
      // to prevent apostrophes from closing double-quoted dialogue
      // - ASCII double quote: "
      // - Left/right curly double quotes: " " (U+201C, U+201D)
      // - Left curly single quote: ' (U+2018) - used for dialogue
      // - Right curly single quote: ' (U+2019) - used for dialogue AND apostrophes
      // NOTE: ASCII single quote ' is ambiguous (apostrophe vs quote) so we only
      // treat curly single quotes as dialogue markers to avoid false positives
      const isOpeningDouble = (ch) => ch === '"' || ch === '\u201C';
      const isClosingDouble = (ch) => ch === '"' || ch === '\u201D';
      const isOpeningSingle = (ch) => ch === '\u2018'; // Only curly opening single quote
      const isClosingSingle = (ch) => ch === '\u2019'; // Only curly closing single quote

      for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        // Handle double quotes
        if (quoteType === null && isOpeningDouble(ch)) {
          if (flush()) return true;
          quoteType = 'double';
          continue;
        }
        if (quoteType === 'double' && isClosingDouble(ch)) {
          buf = '';
          quoteType = null;
          continue;
        }

        // Handle single quotes (only curly quotes to avoid apostrophe confusion)
        if (quoteType === null && isOpeningSingle(ch)) {
          if (flush()) return true;
          quoteType = 'single';
          continue;
        }
        if (quoteType === 'single' && isClosingSingle(ch)) {
          buf = '';
          quoteType = null;
          continue;
        }

        // Only accumulate narration segments (outside quotes)
        if (quoteType === null) {
          buf += ch;
        }
      }
      return flush();
    };

    const firstPersonPronouns = /\b(?:i|me|my|mine|we|us|our|ours)\b/i;
    if (containsPronounOutsideQuotes(narrativeOriginal, firstPersonPronouns)) {
      issues.push('POV VIOLATION: First-person pronouns detected in narration. Narrative must be third-person limited past tense (dialogue may be first-person).');
    }

    // Discourage second-person narration as well (outside dialogue).
    const secondPersonPronouns = /\b(?:you|your|yours|yourself)\b/i;
    if (containsPronounOutsideQuotes(narrativeOriginal, secondPersonPronouns)) {
      warnings.push('Possible second-person phrasing detected in narration ("you/your"). Narrative should remain third-person limited.');
    }

    // =========================================================================
    // CATEGORY 10: NARRATIVE THREAD RESOLUTION ENFORCEMENT
    // =========================================================================
    // Verify that critical threads from previous chapters are addressed
    // Now uses urgency field for prioritization
    if (context.narrativeThreads && context.narrativeThreads.length > 0) {
      // Filter for threads that need resolution: critical urgency OR critical types with active status
      const criticalThreadTypes = ['appointment', 'promise', 'threat'];
      const threadsToCheck = context.narrativeThreads.filter(t => {
        if (t.status !== 'active') return false;
        // Critical urgency threads must always be addressed
        if (t.urgency === 'critical') return true;
        // Critical types should also be addressed
        if (criticalThreadTypes.includes(t.type)) return true;
        return false;
      });

      const addressedThreads = content.previousThreadsAddressed || [];

      for (const thread of threadsToCheck) {
        // Check if this thread was addressed in the generated content
        const threadDescription = (thread.description || thread.excerpt || '').toLowerCase();
        const threadKeywords = threadDescription.split(/\s+/).filter(w => w.length > 4).slice(0, 5);

        // Helper: prefix matching to allow word variations (promise/promised, meet/meeting)
        // but prevent false matches (case/showcase, rain/train)
        const wordMatchesInText = (keyword, text) => {
          // Find all words in text and check if any is a prefix match with keyword
          const words = text.match(/\b\w+\b/g) || [];
          return words.some(w => {
            if (keyword.length < 4 || w.length < 4) return keyword === w;
            return keyword.startsWith(w) || w.startsWith(keyword);
          });
        };

        const wasAddressed = addressedThreads.some(addressed => {
          if (!addressed.originalThread) return false;
          const addressedLower = addressed.originalThread.toLowerCase();
          // Check if at least 2 key words match using prefix matching
          // This allows "promise" to match "promised" but prevents "case" matching "showcase"
          const matchingKeywords = threadKeywords.filter(kw => wordMatchesInText(kw, addressedLower));
          return matchingKeywords.length >= 2;
        });

        // Also check if the thread is mentioned in the narrative itself
        const narrativeLower = narrative.toLowerCase();
        const mentionedInNarrative = threadKeywords.some(kw => wordMatchesInText(kw, narrativeLower));

        if (!wasAddressed && !mentionedInNarrative) {
          const threadChapter = thread.chapter || 0;
          const currentChapter = context.currentPosition?.chapter || 12;
          const chapterDistance = currentChapter - threadChapter;

          // Check if thread has explicit dueChapter and we've passed it
          const isOverdue = thread.dueChapter && currentChapter > thread.dueChapter;

          // Critical urgency threads are always issues if not addressed
          if (thread.urgency === 'critical' || isOverdue) {
            const deadlineInfo = thread.dueChapter
              ? `dueChapter: ${thread.dueChapter}, current: ${currentChapter}`
              : (thread.deadline || 'immediate');
            issues.push(`CRITICAL ${thread.type} thread not addressed: "${threadDescription.slice(0, 60)}..." (${deadlineInfo})`);
          } else if (chapterDistance <= 2) {
            // Recent threads of critical types are also issues
            issues.push(`Critical ${thread.type} thread not addressed: "${threadDescription.slice(0, 60)}..."`);
          } else {
            // Older threads become warnings
            warnings.push(`Older ${thread.type} thread may need resolution: "${threadDescription.slice(0, 40)}..."`);
          }
        }
      }

      // Also check for normal urgency threads that are getting stale (3+ chapters old)
      const staleNormalThreads = context.narrativeThreads.filter(t =>
        t.status === 'active' &&
        t.urgency === 'normal' &&
        (context.currentPosition?.chapter || 12) - (t.chapter || 0) >= 3
      );

      for (const thread of staleNormalThreads) {
        const threadDescription = (thread.description || thread.excerpt || '').toLowerCase();
        warnings.push(`Normal-urgency thread becoming stale (3+ chapters): "${threadDescription.slice(0, 50)}..."`);
      }
    }

    // =========================================================================
    // CATEGORY 11: PATH PERSONALITY BEHAVIOR CONSISTENCY
    // =========================================================================
    // Ensure Jack's actions match the established path personality
    // Note: Category 4 handles detailed checks; this is a broader safety net
    if (context.pathPersonality) {
      const personality = context.pathPersonality;
      // Re-use emotional state check from above (allow breaks for desperate/angry/regretful)
      const emotionalStateForCat11 = content.jackBehaviorDeclaration?.emotionalState;
      const allowsBreakCat11 = emotionalStateForCat11 === 'desperate' || emotionalStateForCat11 === 'angry' || emotionalStateForCat11 === 'regretful';

      // Check for reckless behavior when player has been methodical
      if (personality.riskTolerance === 'low' || personality.narrativeStyle?.includes('cautiously')) {
        // Improved patterns: exclude standalone words that could be false positives
        const recklessPatterns = /\b(?:rushed\s+(?:in|into|forward)|stormed\s+(?:in|into|out)|burst\s+(?:in|into|through)|leapt\s+without|didn't\s+wait|threw\s+caution)\b/i;
        if (recklessPatterns.test(narrativeOriginal)) {
          if (allowsBreakCat11) {
            warnings.push(`Reckless behavior detected, but emotional state "${emotionalStateForCat11}" may justify this.`);
          } else {
            warnings.push('Narrative shows reckless behavior that may conflict with methodical path personality. Consider setting emotionalState to "desperate", "angry", or "regretful" if intentional.');
          }
        }
      }

      // Check for overly passive behavior when player has been aggressive
      if (personality.riskTolerance === 'high' || personality.narrativeStyle?.includes('decisively')) {
        const passivePatterns = /\b(?:hesitated\s+for\s+a\s+long|couldn't\s+bring\s+myself|waited\s+patiently|decided\s+to\s+observe|held\s+back\s+from)\b/i;
        if (passivePatterns.test(narrativeOriginal)) {
          warnings.push('Narrative shows passive behavior that may conflict with aggressive path personality');
        }
      }

      // Verify jackActionStyle field matches context personality
      if (content.jackActionStyle) {
        const expectedStyle = personality.riskTolerance === 'low' ? 'cautious' :
                              personality.riskTolerance === 'high' ? 'direct' : 'balanced';
        if (content.jackActionStyle !== expectedStyle && content.jackActionStyle !== 'balanced') {
          warnings.push(`jackActionStyle "${content.jackActionStyle}" may not match path personality (expected "${expectedStyle}")`);
        }
      }
    }

    // =========================================================================
    // CATEGORY 12: TIMELINE APPROXIMATION PREVENTION
    // =========================================================================
    // Ensure exact timeline numbers are used, not approximations
    const timelineApproximations = [
      { pattern: /(?:nearly|about|almost|over|around|roughly|approximately)\s*30\s*years?.*(?:friend|wade|tom|college)/i,
        issue: 'Timeline approximation for Jack/Tom friendship - must be exactly 30 years' },
      { pattern: /(?:nearly|about|almost|over|around|roughly)\s*8\s*years?.*(?:prison|greystone|eleanor|bellamy)/i,
        issue: 'Timeline approximation for Eleanor imprisonment - must be exactly 8 years' },
      { pattern: /(?:nearly|about|almost|over|around|roughly)\s*7\s*years?.*(?:emily|cross|dead|died|case\s*closed)/i,
        issue: 'Timeline approximation for Emily case - must be exactly 7 years' },
      { pattern: /(?:nearly|about|almost|over|around|roughly)\s*13\s*years?.*(?:sarah|reeves|partner)/i,
        issue: 'Timeline approximation for Sarah partnership - must be exactly 13 years' },
      { pattern: /(?:nearly|about|almost|over|around|roughly)\s*8\s*years?.*(?:silas|reed|partner)/i,
        issue: 'Timeline approximation for Silas partnership - must be exactly 8 years' },
      { pattern: /(?:nearly|about|almost|over|around|roughly)\s*20\s*years?.*(?:evidence|manufactur|tom|wade|forensic)/i,
        issue: 'Timeline approximation for evidence manufacturing - must be exactly 20 years' },
    ];

    for (const { pattern, issue } of timelineApproximations) {
      if (pattern.test(narrativeOriginal)) {
        issues.push(issue);
      }
    }

    // Soft fuzzy timeline checks: these don't necessarily contradict canon, but they invite drift.
    // Prefer explicit numbers ("exactly 30 years") over vague magnitude language ("decades").
    const fuzzyTimeline = [
      { pattern: /\bdecades?\s+(?:of\s+)?(?:friendship|knowing|loyalty)\b/i, warning: 'Timeline phrasing is vague ("decades"). Prefer exact: Tom Wade friendship is exactly 30 years.' },
      { pattern: /\b(?:a\s+)?decade\s+(?:of\s+)?(?:partnership|working\s+together)\b/i, warning: 'Timeline phrasing is vague ("a decade"). Prefer exact: Silas partnership is exactly 8 years; Sarah partnership is exactly 13 years.' },
      { pattern: /\bthree\s+decades?\b/i, warning: 'Prefer numeric exactness: write "30 years" (exactly) instead of "three decades".' },
      { pattern: /\b(?:years?\s+and\s+years?|for\s+years)\b/i, warning: 'Avoid vague time spans ("for years"). Use the exact canonical durations when referring to key relationships/cases.' },
    ];
    for (const { pattern, warning } of fuzzyTimeline) {
      if (pattern.test(narrativeOriginal)) {
        warnings.push(warning);
      }
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
   * Determine whether a validation issue is continuity-critical (player-facing story break)
   * and therefore must be enforced as a hard failure (fallback / regeneration), not just warned.
   *
   * PHILOSOPHY: Be VERY conservative here. Only truly story-breaking issues should cause
   * hard failures. The goal is successful generation with good-enough quality, not perfection.
   * Minor inconsistencies are acceptable - players are forgiving of small details.
   *
   * NOTE: Most issues are now treated as warnings to ensure generation succeeds.
   */
  _isContinuityCriticalIssue(issue) {
    const s = String(issue || '');
    if (!s) return false;

    // =======================================================================
    // HARD FAILURES - Story-breaking issues that must be fixed
    //
    // Philosophy: We want a "pretty great" 12-chapter experience while
    // ensuring generation succeeds. Hard failures are reserved for:
    // 1. Things that confuse the player about basic facts
    // 2. Things that break player agency (their choices must matter)
    // 3. Things that create logical impossibilities
    // =======================================================================

    // --- TIER 1: IDENTITY & WORLD FACTS ---
    // Critical name misspellings that would confuse the player
    if (s.startsWith('Name misspelled:')) return true;

    // Wrong alcohol brand (Jack's signature vice - establishes character)
    if (s.includes('Jack drinks Jameson whiskey')) return true;

    // Sunny weather breaks noir atmosphere completely
    if (s.includes('Ashport is ALWAYS rainy')) return true;

    // --- TIER 2: PLAYER AGENCY (Critical for branching narrative) ---
    // If the player made a choice, the story MUST reflect that choice
    // This is the core promise of a branching narrative game
    if (s.startsWith('CHOICE RESPECT VIOLATION:')) return true;
    if (s.includes('contradicts player choice')) return true;
    if (s.includes('ignores chosen path')) return true;

    // --- TIER 3: LOGICAL IMPOSSIBILITIES ---
    // Dead characters cannot appear alive without explanation
    if (s.includes('character is dead') && s.includes('appears alive')) return true;
    if (s.includes('deceased character speaking')) return true;

    // Major revelations cannot be "re-discovered" - breaks mystery pacing
    if (s.includes('already revealed') && s.includes('re-discovers')) return true;
    if (s.includes('Victoria is Emily') && s.includes('re-reveal')) return true;

    // =======================================================================
    // SOFT FAILURES - Convert to warnings, don't block generation
    // These matter for quality but players are forgiving of minor issues
    // =======================================================================

    // Thread continuity - important but not worth failing over
    // if (s.startsWith('THREAD CONTINUITY VIOLATION:')) return true;  // DISABLED
    // if (s.startsWith('OVERDUE THREAD ERROR:')) return true;  // DISABLED

    // Story day mismatch - minor, player won't notice
    // if (s.startsWith('STORY DAY MISMATCH:')) return true;  // DISABLED

    // Timeline approximations - close enough is fine
    // if (s.includes('Timeline approximation')) return true;  // DISABLED

    // Personality enforcement - Jack can have emotional moments
    // if (s.startsWith('PERSONALITY VIOLATION:')) return true;  // DISABLED

    return false;
  }

  // ==========================================================================
  // A+ QUALITY VALIDATORS - Advanced prose and narrative quality checks
  // ==========================================================================

  /**
   * Validate prose quality - checks for metaphor variety, sentence diversity, and noir voice
   * Returns quality score (0-100) and specific feedback
   */
  _validateProseQuality(narrative) {
    const issues = [];
    const warnings = [];
    let qualityScore = 100;

    // ========== 1. METAPHOR DETECTION ==========
    // Noir prose should have evocative metaphors, not generic descriptions
    const noirMetaphorPatterns = [
      /rain\s+(?:fell|poured|drummed|hammered|beat|washed|slicked|dripped)/i,
      /shadow[s]?\s+(?:stretched|crawled|pooled|swallowed|embraced|clung)/i,
      /neon\s+(?:bled|reflected|flickered|buzzed|hummed|painted|spilled)/i,
      /city\s+(?:breathed|slept|whispered|groaned|stretched|waited)/i,
      /silence\s+(?:hung|pressed|settled|wrapped|stretched|fell)/i,
      /guilt\s+(?:weighed|gnawed|clawed|settled|wrapped|clung)/i,
      /memory\s+(?:surfaced|lurked|haunted|clawed|whispered|echoed)/i,
      /truth\s+(?:cut|burned|stung|waited|lurked|surfaced)/i,
      /(?:voice|words?)\s+(?:cut|sliced|dripped|hung|fell|echoed)/i,
      /eyes\s+(?:burned|bored|searched|narrowed|softened|hardened)/i,
    ];

    const metaphorCount = noirMetaphorPatterns.reduce((count, pattern) => {
      return count + (narrative.match(pattern)?.length || 0);
    }, 0);

    const wordCount = narrative.split(/\s+/).length;
    const expectedMetaphors = Math.max(2, Math.floor(wordCount / 200)); // Expect 1 per 200 words, minimum 2

    if (metaphorCount < expectedMetaphors) {
      warnings.push(`Prose lacks noir texture: only ${metaphorCount} evocative metaphors found (expected ${expectedMetaphors}+). Add atmospheric language.`);
      qualityScore -= 10;
    }

    // ========== 2. SENSORY DETAIL CHECK ==========
    // A+ noir prose engages multiple senses
    const sensoryPatterns = {
      visual: /\b(?:saw|watched|looked|glanced|neon|shadow|dark|light|glow|flicker|gleam|shine)\b/gi,
      auditory: /\b(?:heard|sound|noise|whisper|echo|creak|hum|buzz|silence|quiet|jukebox|rain\s+(?:drummed|hammered|pattered))\b/gi,
      tactile: /\b(?:felt|cold|warm|wet|damp|rough|smooth|grip|touch|chill|sting|burn)\b/gi,
      olfactory: /\b(?:smell|scent|odor|stink|perfume|smoke|whiskey|rain|musk|sweat)\b/gi,
      taste: /\b(?:taste|bitter|sweet|sour|whiskey|bourbon|coffee|blood)\b/gi,
    };

    const sensoryHits = {};
    let totalSensory = 0;
    for (const [sense, pattern] of Object.entries(sensoryPatterns)) {
      const matches = narrative.match(pattern) || [];
      sensoryHits[sense] = matches.length;
      totalSensory += matches.length;
    }

    const sensesCovered = Object.values(sensoryHits).filter(v => v > 0).length;
    if (sensesCovered < 3) {
      warnings.push(`Limited sensory engagement: only ${sensesCovered}/5 senses used. Add ${['visual', 'auditory', 'tactile', 'olfactory', 'taste'].filter(s => !sensoryHits[s]).join(', ')} details.`);
      qualityScore -= 5;
    }

    // ========== 3. DIALOGUE QUALITY CHECK ==========
    // Extract dialogue and check for quality
    // Support both ASCII quotes (") and curly/smart quotes (" ")
    const dialogueMatches = narrative.match(/[""\u201C][^""\u201C\u201D]+[""\u201D]/g) || [];
    if (dialogueMatches.length > 0) {
      // Check for weak dialogue tags
      const weakTags = /(?:he|she|i)\s+(?:said|asked|replied)\s+(?:quietly|loudly|softly|quickly|slowly)/gi;
      if (weakTags.test(narrative)) {
        warnings.push('Weak dialogue tags with adverbs detected. Show emotion through action beats instead.');
        qualityScore -= 3;
      }

      // Check for talking heads (no action beats between dialogue)
      // Support both ASCII and curly quotes
      const consecutiveDialogue = narrative.match(/[""\u201C][^""\u201C\u201D]+[""\u201D]\s*\n*\s*[""\u201C][^""\u201C\u201D]+[""\u201D]\s*\n*\s*[""\u201C][^""\u201C\u201D]+[""\u201D]\s*\n*\s*[""\u201C][^""\u201C\u201D]+[""\u201D]/g);
      if (consecutiveDialogue && consecutiveDialogue.length > 0) {
        warnings.push('Dialogue passages lack action beats. Break up long exchanges with physical actions or observations.');
        qualityScore -= 5;
      }
    }

    // ========== 4. PARAGRAPH VARIETY CHECK ==========
    const paragraphs = narrative.split(/\n\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length > 0) {
      const paragraphLengths = paragraphs.map(p => p.split(/\s+/).length);
      const avgLength = paragraphLengths.reduce((a, b) => a + b, 0) / paragraphLengths.length;
      const variance = paragraphLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / paragraphLengths.length;

      // Low variance means monotonous paragraph structure
      if (variance < 100 && paragraphs.length > 3) {
        warnings.push(`Monotonous paragraph structure: variance ${Math.round(variance)}. Vary paragraph lengths for better pacing.`);
        qualityScore -= 5;
      }
    }

    // ========== 5. OPENING QUALITY CHECK ==========
    const firstParagraph = paragraphs[0] || '';
    const hasAtmosphericOpening = noirMetaphorPatterns.some(p => p.test(firstParagraph)) ||
                                   /\b(?:rain|shadow|night|dark|neon|city|street)\b/i.test(firstParagraph);

    if (!hasAtmosphericOpening && wordCount > 200) {
      warnings.push('Opening lacks atmospheric grounding. Start with sensory scene-setting.');
      qualityScore -= 5;
    }

    // ========== 6. ATMOSPHERE DENSITY CHECK (Positive requirement) ==========
    // Noir prose REQUIRES atmospheric elements - not just absence of forbidden ones
    const atmospherePatterns = {
      weather: /\b(?:rain|drizzle|downpour|storm|mist|fog|damp|wet|puddle|umbrella|overcast|cloud|grey|gray)\b/gi,
      lighting: /\b(?:neon|shadow|dark|dim|glow|flicker|lamp|streetlight|moonlight|fluorescent|bulb)\b/gi,
      urbanTexture: /\b(?:concrete|brick|alley|street|gutter|pavement|curb|sidewalk|corner|building)\b/gi,
      noirMood: /\b(?:smoke|cigarette|whiskey|bourbon|glass|bottle|bar|jukebox|mirror|booth)\b/gi,
      timeOfDay: /\b(?:night|midnight|dawn|dusk|evening|late|early|hour|clock|morning)\b/gi,
    };

    const atmosphereHits = {};
    let totalAtmosphere = 0;
    for (const [category, pattern] of Object.entries(atmospherePatterns)) {
      const matches = narrative.match(pattern) || [];
      atmosphereHits[category] = matches.length;
      totalAtmosphere += matches.length;
    }

    // Require minimum atmosphere density (at least 3 categories represented)
    const categoriesCovered = Object.values(atmosphereHits).filter(v => v > 0).length;
    if (categoriesCovered < 3) {
      warnings.push(`Thin atmosphere: only ${categoriesCovered}/5 noir categories present (weather, lighting, urban texture, noir mood, time). Add more environmental grounding.`);
      qualityScore -= 5;
    }

    // Check density relative to word count (expect ~1 atmospheric element per 50 words)
    const expectedAtmosphere = Math.floor(wordCount / 50);
    if (totalAtmosphere < expectedAtmosphere * 0.5) {
      warnings.push(`Low atmosphere density: ${totalAtmosphere} elements in ${wordCount} words (expected ${expectedAtmosphere}+). Scene feels sterile - add rain, neon, shadows, smoke.`);
      qualityScore -= 5;
    }

    // ========== 7. GENERIC PHRASE DETECTION ==========
    // Detect phrases that feel AI-generated or generic
    const genericPatterns = [
      { pattern: /\bthe air\s+(?:was|felt)\s+(?:thick|heavy|tense)\b/i, issue: 'Generic atmosphere: "the air was thick/heavy"' },
      { pattern: /\bmy\s+(?:heart|pulse)\s+(?:raced|pounded|quickened)\b/i, issue: 'Generic tension: heart racing/pounding' },
      { pattern: /\ba\s+(?:chill|shiver)\s+(?:ran|went)\s+down\s+(?:my|his|her)\s+spine\b/i, issue: 'Cliché: chill down spine' },
      { pattern: /\btime\s+(?:seemed\s+to\s+)?(?:stood|stopped|froze|slowed)\b/i, issue: 'Cliché: time stopped/froze' },
      { pattern: /\beverything\s+(?:changed|happened)\s+(?:so\s+)?fast\b/i, issue: 'Generic pacing: everything happened fast' },
    ];

    for (const { pattern, issue } of genericPatterns) {
      if (pattern.test(narrative)) {
        warnings.push(`${issue} - rewrite with more specific imagery`);
        qualityScore -= 3;
      }
    }

    return {
      score: Math.max(0, qualityScore),
      issues,
      warnings,
      details: {
        metaphorCount,
        sensoryHits,
        atmosphereHits,
        atmosphereDensity: totalAtmosphere,
        dialogueCount: dialogueMatches.length,
        paragraphCount: paragraphs.length,
        hasAtmosphericOpening,
      },
    };
  }

  /**
   * Validate character voice consistency in dialogue
   * Ensures each character sounds distinct and matches their established voice
   */
  _validateCharacterVoices(narrative) {
    const issues = [];
    const warnings = [];

    // Character voice signatures from characterReference.js
    const voiceSignatures = {
      victoria: {
        patterns: [
          /\b(?:education|curriculum|lesson|understand|certainty)\b/i,
          /\b(?:twelve\s+days?|chess|game|move|piece)\b/i,
          /\b(?:power|truth|noise|believe)\b/i,
        ],
        forbiddenPatterns: [
          /\b(?:gonna|gotta|ain't|wanna)\b/i, // Too casual for Victoria
          /\b(?:like,?\s+(?:you\s+know|whatever))\b/i, // Valley speak
        ],
        style: 'elegant, calculated, formal diction with sardonic edge',
      },
      sarah: {
        patterns: [
          /\b(?:partner|force|badge|case|evidence)\b/i,
          /\b(?:done|finished|walk\s+away|my\s+own)\b/i,
        ],
        forbiddenPatterns: [
          /\b(?:darling|dear|sweetheart)\b/i, // Too soft for Sarah
        ],
        style: 'direct, no-nonsense, increasingly independent',
      },
      eleanor: {
        patterns: [
          /\b(?:years?|prison|greystone|cell|innocent)\b/i,
          /\b(?:daughter|maya|richard|husband)\b/i,
        ],
        forbiddenPatterns: [], // Eleanor can sound bitter in many ways
        style: 'bitter, resilient, gravel and broken glass',
      },
      silas: {
        patterns: [
          /\b(?:blackmail|blood\s+money|penthouse|guilty|probably)\b/i,
          /\b(?:sorry|forgive|mistake|wrong)\b/i,
        ],
        forbiddenPatterns: [
          /\b(?:confident|sure|certain|definitely)\b/i, // Silas is defeated, not confident
        ],
        style: 'defeated, bourbon-soaked, confessional',
      },
      tom: {
        patterns: [
          /\b(?:evidence|forensic|lab|test|results?)\b/i,
          /\b(?:friend|years?|college|trust)\b/i,
        ],
        forbiddenPatterns: [],
        style: 'outwardly friendly and competent (before revelation)',
      },
    };

    // Extract dialogue with speaker attribution
    // Pattern: "dialogue" [optional: character said/spoke/etc]
    // Support both ASCII quotes (") and curly/smart quotes (" ")
    const dialogueWithAttribution = narrative.match(/[""\u201C][^""\u201C\u201D]+[""\u201D]\s*(?:[A-Za-z]+\s+(?:said|asked|replied|muttered|whispered|growled|snapped|hissed))?/g) || [];

    // Check for dialogue that could be attributed to specific characters
    const characterNames = ['victoria', 'sarah', 'eleanor', 'silas', 'tom', 'wade', 'reeves', 'bellamy', 'reed', 'confessor', 'blackwell'];

    for (const dialogue of dialogueWithAttribution) {
      // Extract text from either ASCII or curly quotes
      const text = dialogue.match(/[""\u201C]([^""\u201C\u201D]+)[""\u201D]/)?.[1] || '';
      const attribution = dialogue.toLowerCase();

      for (const [character, signature] of Object.entries(voiceSignatures)) {
        // Check if this dialogue is attributed to this character
        const isThisCharacter = characterNames.some(name =>
          attribution.includes(name) &&
          (character === name || character === name.replace('wade', 'tom') || character === name.replace('reeves', 'sarah'))
        );

        if (isThisCharacter) {
          // Check for forbidden patterns in this character's dialogue
          for (const forbidden of signature.forbiddenPatterns) {
            if (forbidden.test(text)) {
              warnings.push(`Character voice violation: ${character.toUpperCase()} dialogue contains forbidden pattern. Style should be: ${signature.style}`);
            }
          }
        }
      }
    }

    // Cross-check: Victoria should never sound casual like a cop
    // Support both ASCII quotes (") and curly/smart quotes (" ")
    const victoriaDialogue = narrative.match(/(?:victoria|confessor|blackwell)\s+(?:said|spoke|replied|whispered)[^""\u201C\u201D]*[""\u201C]([^""\u201C\u201D]+)[""\u201D]/gi) || [];
    for (const match of victoriaDialogue) {
      const text = match.match(/[""\u201C]([^""\u201C\u201D]+)[""\u201D]/)?.[1] || '';
      if (/\b(?:gonna|gotta|ain't|ya|hey|buddy|pal)\b/i.test(text)) {
        issues.push('Victoria/Confessor uses overly casual language - should be elegant and formal');
      }
    }

    return { issues, warnings };
  }

  /**
   * Validate sentence variety to prevent monotonous prose
   * Checks for I-stacking, sentence length variety, and opener diversity
   */
  _validateSentenceVariety(narrative) {
    const issues = [];
    const warnings = [];

    const sentences = narrative.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length < 5) {
      return { issues, warnings }; // Not enough sentences to validate
    }

    // ========== 1. I-STACKING DETECTION ==========
    // Count sentences starting with "I"
    let consecutiveIStarts = 0;
    let maxConsecutiveI = 0;
    let totalIStarts = 0;

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (/^I\s+(?!didn't|don't|won't|can't|couldn't|wouldn't|shouldn't)/i.test(trimmed)) {
        consecutiveIStarts++;
        totalIStarts++;
        maxConsecutiveI = Math.max(maxConsecutiveI, consecutiveIStarts);
      } else {
        consecutiveIStarts = 0;
      }
    }

    // I-stacking is now a WARNING, not an error - stylistic issue shouldn't trigger retries
    if (maxConsecutiveI >= 4) {
      warnings.push(`I-stacking detected: ${maxConsecutiveI} consecutive sentences start with "I". Vary sentence openers.`);
    } else if (maxConsecutiveI >= 3) {
      warnings.push(`Minor I-stacking: ${maxConsecutiveI} consecutive "I" sentences. Consider varying openers.`);
    }

    const iPercentage = (totalIStarts / sentences.length) * 100;
    if (iPercentage > 50) {
      warnings.push(`${Math.round(iPercentage)}% of sentences start with "I". Aim for under 40%.`);
    }

    // ========== 2. SENTENCE LENGTH VARIETY ==========
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;

    // Check for monotonous length (all sentences within 5 words of average)
    const nearAverage = sentenceLengths.filter(len => Math.abs(len - avgLength) < 5).length;
    const monotonyRatio = nearAverage / sentenceLengths.length;

    if (monotonyRatio > 0.8) {
      warnings.push(`Monotonous sentence length: ${Math.round(monotonyRatio * 100)}% near average (${Math.round(avgLength)} words). Mix short punchy sentences with longer ones.`);
    }

    // Check for at least some short sentences (under 8 words) for punch
    const shortSentences = sentenceLengths.filter(len => len < 8).length;
    if (shortSentences < sentences.length * 0.1) {
      warnings.push('Few short sentences for impact. Add punchy 3-7 word sentences for noir rhythm.');
    }

    // ========== 3. OPENER VARIETY ==========
    // Check first words of sentences for variety
    const openers = sentences.map(s => s.trim().split(/\s+/)[0]?.toLowerCase()).filter(Boolean);
    const openerCounts = {};
    for (const opener of openers) {
      openerCounts[opener] = (openerCounts[opener] || 0) + 1;
    }

    // Any opener used more than 25% of the time is overused
    for (const [opener, count] of Object.entries(openerCounts)) {
      const percentage = (count / openers.length) * 100;
      if (percentage > 25 && count >= 4) {
        warnings.push(`Opener "${opener}" overused: ${Math.round(percentage)}% of sentences. Vary your sentence starts.`);
      }
    }

    // ========== 4. PARAGRAPH OPENER VARIETY ==========
    const paragraphs = narrative.split(/\n\n+/).filter(p => p.trim());
    const paragraphOpeners = paragraphs.map(p => p.trim().split(/\s+/).slice(0, 3).join(' ').toLowerCase());

    // Check for repeated paragraph openers (e.g., "The rain..." "The city...")
    const paraOpenerCounts = {};
    for (const opener of paragraphOpeners) {
      // Check first 2 words
      const key = opener.split(/\s+/).slice(0, 2).join(' ');
      paraOpenerCounts[key] = (paraOpenerCounts[key] || 0) + 1;
    }

    for (const [opener, count] of Object.entries(paraOpenerCounts)) {
      if (count >= 3) {
        warnings.push(`Paragraph opener pattern "${opener}..." used ${count} times. Vary paragraph beginnings.`);
      }
    }

    return { issues, warnings };
  }

  /**
   * Setup/Payoff Registry - Track story setups that require payoffs
   * Critical for maintaining narrative promises across chapters
   */
  _setupPayoffRegistry = new Map();

  /**
   * Initialize setup/payoff tracking for major story revelations
   * Called once at the start of story generation
   */
  _initializeSetupPayoffRegistry() {
    // Major revelations that need proper setup before payoff
    const majorRevelations = [
      {
        id: 'victoria_is_emily',
        payoff: 'Victoria Blackwell is revealed to be Emily Cross',
        requiredSetups: [
          'References to Emily Cross case',
          'Victoria showing knowledge only Emily would have',
          'Physical or behavioral hints connecting Victoria to Emily',
          'Victoria\'s scars or trauma references',
        ],
        minSetupCount: 3,
        earliestPayoffChapter: 6,
        latestPayoffChapter: 10,
      },
      {
        id: 'tom_betrayal',
        payoff: 'Tom Wade has been manufacturing evidence for 20 years',
        requiredSetups: [
          'Tom\'s "perfect" evidence praised or noticed',
          'Inconsistencies in old cases',
          'Someone questioning forensic methods',
          'Tom acting nervous or defensive',
        ],
        minSetupCount: 2,
        earliestPayoffChapter: 5,
        latestPayoffChapter: 9,
      },
      {
        id: 'grange_serial_kidnapper',
        payoff: 'Deputy Chief Grange is a serial kidnapper',
        requiredSetups: [
          'Missing persons cases mentioned',
          'Grange having unusual power/access',
          'Victims\' families or witnesses dismissed',
        ],
        minSetupCount: 2,
        earliestPayoffChapter: 7,
        latestPayoffChapter: 11,
      },
      {
        id: 'silas_blackmailed',
        payoff: 'Silas Reed was blackmailed into framing Marcus Thornhill',
        requiredSetups: [
          'Silas acting guilty or drinking heavily',
          'Thornhill case inconsistencies',
          'References to something Silas is hiding',
        ],
        minSetupCount: 2,
        earliestPayoffChapter: 4,
        latestPayoffChapter: 8,
      },
      {
        id: 'five_innocents',
        payoff: 'The full list of five wrongfully convicted innocents',
        requiredSetups: [
          'Individual innocent cases introduced',
          'Pattern of manufactured evidence emerging',
          'Victoria\'s "curriculum" references',
        ],
        minSetupCount: 4,
        earliestPayoffChapter: 8,
        latestPayoffChapter: 11,
      },
    ];

    for (const revelation of majorRevelations) {
      this._setupPayoffRegistry.set(revelation.id, {
        ...revelation,
        setupsFound: [],
        payoffDelivered: false,
        payoffChapter: null,
      });
    }
  }

  /**
   * Track setups found in generated content
   */
  _trackSetups(narrative, chapter, subchapter) {
    const narrativeLower = narrative.toLowerCase();

    for (const [id, revelation] of this._setupPayoffRegistry.entries()) {
      if (revelation.payoffDelivered) continue;

      // Check for setups
      for (const setup of revelation.requiredSetups) {
        const setupPatterns = this._generateSetupPatterns(setup);
        for (const pattern of setupPatterns) {
          if (pattern.test(narrativeLower)) {
            if (!revelation.setupsFound.includes(setup)) {
              revelation.setupsFound.push(setup);
              console.log(`[SetupPayoff] Found setup for ${id}: "${setup}" in Chapter ${chapter}.${subchapter}`);
            }
            break;
          }
        }
      }
    }
  }

  /**
   * Generate regex patterns for setup detection
   */
  _generateSetupPatterns(setup) {
    const setupLower = setup.toLowerCase();
    const patterns = [];

    // Direct keyword matching
    const keywords = setupLower.match(/\b\w{4,}\b/g) || [];
    if (keywords.length >= 2) {
      // Pattern: at least 2 keywords within 100 characters
      patterns.push(new RegExp(keywords.slice(0, 2).join('.*').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\.\\\*/g, '.{0,100}'), 'i'));
    }

    // Character-specific patterns - use word boundaries to prevent substring false matches
    if (/\bemily\b/i.test(setupLower)) {
      patterns.push(/emily\s+cross/i, /cross\s+case/i, /that\s+girl.*(?:dead|missing|closed)/i);
    }
    if (/\btom\b/i.test(setupLower)) {
      patterns.push(/tom.*(?:evidence|forensic|perfect)/i, /wade.*(?:lab|report|test)/i);
    }
    if (/\bvictoria\b/i.test(setupLower)) {
      patterns.push(/victoria.*(?:know|scar|past|trauma)/i, /blackwell.*(?:secret|truth)/i);
    }
    if (/\bgrange\b/i.test(setupLower)) {
      patterns.push(/grange.*(?:power|access|missing|girl)/i, /deputy.*(?:chief|suspicious)/i);
    }
    if (/\bsilas\b/i.test(setupLower)) {
      patterns.push(/silas.*(?:drink|guilt|hiding|secret)/i, /reed.*(?:nervous|scared)/i);
    }
    if (/\bthornhill\b/i.test(setupLower)) {
      patterns.push(/thornhill.*(?:case|frame|innocent|dead)/i, /marcus.*(?:suicide|lockup)/i);
    }

    return patterns;
  }

  /**
   * Validate setup/payoff balance before major revelations
   */
  _validateSetupPayoff(chapter, narrative) {
    const issues = [];
    const warnings = [];

    for (const [id, revelation] of this._setupPayoffRegistry.entries()) {
      // Check if this narrative contains the payoff
      const payoffPatterns = this._generatePayoffPatterns(id);
      const hasPayoff = payoffPatterns.some(p => p.test(narrative.toLowerCase()));

      if (hasPayoff) {
        // Validate sufficient setup before payoff
        if (revelation.setupsFound.length < revelation.minSetupCount) {
          issues.push(`PAYOFF WITHOUT SETUP: "${revelation.payoff}" revealed but only ${revelation.setupsFound.length}/${revelation.minSetupCount} required setups found. Previous setups: ${revelation.setupsFound.join(', ') || 'none'}`);
        }

        // Check timing
        if (chapter < revelation.earliestPayoffChapter) {
          warnings.push(`Early payoff: "${revelation.payoff}" in Chapter ${chapter} (recommended: ${revelation.earliestPayoffChapter}+)`);
        }

        revelation.payoffDelivered = true;
        revelation.payoffChapter = chapter;
      }

      // Warn if approaching latest payoff chapter without sufficient setup
      if (!revelation.payoffDelivered && chapter >= revelation.latestPayoffChapter - 1) {
        if (revelation.setupsFound.length < revelation.minSetupCount) {
          warnings.push(`Approaching deadline for "${revelation.payoff}" (Chapter ${revelation.latestPayoffChapter}) with only ${revelation.setupsFound.length}/${revelation.minSetupCount} setups. Add more foreshadowing.`);
        }
      }
    }

    return { issues, warnings };
  }

  /**
   * Generate patterns to detect payoff delivery
   */
  _generatePayoffPatterns(revelationId) {
    const patterns = {
      victoria_is_emily: [
        /victoria.*(?:is|was)\s+emily/i,
        /emily\s+cross.*(?:alive|survived|you)/i,
        /blackwell.*(?:real\s+name|true\s+identity|emily)/i,
        /confessor.*emily/i,
        /you.*(?:are|were)\s+emily/i,
      ],
      tom_betrayal: [
        /tom.*(?:manufactured|faked|planted)\s+evidence/i,
        /wade.*(?:lied|fabricated|forged)/i,
        /best\s+friend.*(?:betrayed|manufactured)/i,
        /twenty\s+years.*(?:evidence|lies|manufactured)/i,
        /forensic.*(?:fake|forged|manufactured)/i,
      ],
      grange_serial_kidnapper: [
        /grange.*(?:kidnapped|abducted|took|held)/i,
        /deputy.*(?:serial|victims|women)/i,
        /23\s+(?:victims|women|girls)/i,
        /grange.*(?:basement|captive|prisoner)/i,
      ],
      silas_blackmailed: [
        /silas.*(?:blackmailed|forced|made\s+to)/i,
        /reed.*(?:framed|set\s+up)\s+(?:thornhill|marcus)/i,
        /signed.*(?:documents|papers).*(?:blackmail|threaten)/i,
      ],
      five_innocents: [
        /five\s+(?:innocents?|people|victims)/i,
        /all\s+(?:five|of\s+them).*(?:innocent|wrongful|framed)/i,
        /eleanor.*marcus.*(?:lisa|james|teresa)/i,
      ],
    };

    return patterns[revelationId] || [];
  }

  /**
   * Validate arc closure in final chapters (11-12)
   * Ensures all major threads and revelations are resolved before story ends
   */
  _validateArcClosure(chapter, context) {
    const issues = [];
    const warnings = [];

    // Only enforce arc closure in final chapters
    if (chapter < 11) {
      return { issues, warnings };
    }

    // Check for undelivered revelations
    for (const [id, revelation] of this._setupPayoffRegistry.entries()) {
      if (!revelation.payoffDelivered) {
        if (chapter === 12) {
          // Chapter 12: All major revelations MUST be delivered
          issues.push(`ARC CLOSURE REQUIRED: Major revelation "${revelation.payoff}" has not been delivered. This is the final chapter - all major plot points must resolve.`);
        } else if (chapter === 11) {
          // Chapter 11: Warn about undelivered revelations
          warnings.push(`Approaching finale: "${revelation.payoff}" still undelivered. Ensure this is revealed in chapters 11-12.`);
        }
      }
    }

    // Check for unresolved critical threads
    if (context.narrativeThreads && context.narrativeThreads.length > 0) {
      const unresolvedCritical = context.narrativeThreads.filter(t =>
        t.status === 'active' &&
        (t.urgency === 'critical' || t.type === 'appointment' || t.type === 'promise')
      );

      if (chapter === 12 && unresolvedCritical.length > 0) {
        issues.push(`ARC CLOSURE REQUIRED: ${unresolvedCritical.length} critical thread(s) still unresolved in final chapter: ${unresolvedCritical.slice(0, 3).map(t => t.description?.slice(0, 40)).join('; ')}...`);
      } else if (chapter === 11 && unresolvedCritical.length > 3) {
        warnings.push(`Too many unresolved threads (${unresolvedCritical.length}) entering finale. Prioritize resolution.`);
      }
    }

    // Check that Victoria/Emily confrontation happens
    if (chapter === 12) {
      const victoriaThread = context.narrativeThreads?.find(t =>
        t.description?.toLowerCase().includes('victoria') ||
        t.description?.toLowerCase().includes('confessor') ||
        t.description?.toLowerCase().includes('emily')
      );
      if (!victoriaThread || victoriaThread.status !== 'resolved') {
        warnings.push('Final chapter should include climactic confrontation with Victoria/The Confessor');
      }
    }

    return { issues, warnings };
  }

  /**
   * Attempt to fix content that failed validation
   * NOW INCLUDES A+ QUALITY GUIDANCE for fixing prose issues
   */
  async _fixContent(content, issues, context, isDecisionPoint) {
    // Categorize issues for targeted fixing
    const proseIssues = issues.filter(i =>
      i.includes('metaphor') || i.includes('sensory') || i.includes('I-stacking') ||
      i.includes('sentence') || i.includes('opener') || i.includes('atmosphere') ||
      i.includes('dialogue') || i.includes('monotonous') || i.includes('Generic')
    );
    const consistencyIssues = issues.filter(i => !proseIssues.includes(i));

    // Build quality guidance for prose fixes
    const proseGuidance = proseIssues.length > 0 ? `
## A+ PROSE QUALITY REQUIREMENTS
Your rewrite MUST address these prose quality issues:
${proseIssues.map(i => `- ${i}`).join('\n')}

To fix these:
1. **Metaphors**: Add noir-specific imagery (rain drumming, shadows pooling, neon bleeding)
2. **Sensory details**: Engage sight, sound, smell, touch, taste
3. **Sentence variety**: Mix short punchy sentences (3-7 words) with longer flowing ones
4. **Opener diversity**: Vary how sentences and paragraphs begin (not all "I" or "The")
5. **Atmospheric grounding**: Open scenes with weather, lighting, physical setting
6. **Dialogue**: Break up exchanges with action beats (what characters DO while talking)

Example noir texture to emulate:
"The rain fell on Ashport the way memory falls on the guilty, soft at first, then relentless. Neon bled into the wet streets, turning the city into a watercolor of regret."
` : '';

    const fixPrompt = `The following generated story content contains violations that must be fixed.

## CONSISTENCY ISSUES TO FIX:
${consistencyIssues.length > 0 ? consistencyIssues.map(i => `- ${i}`).join('\n') : '(none)'}
${proseGuidance}

## CRITICAL RULES:
1. Maintain the exact plot and story events
2. Keep all character names spelled correctly
3. Use exact timeline numbers (30 years Tom friendship, 8 years Eleanor prison, etc.)
4. Stay in third-person limited past tense (close on Jack)
5. Never use forbidden words: delve, unravel, tapestry, myriad, whilst, realm

## ORIGINAL CONTENT:
${JSON.stringify(content, null, 2)}

Rewrite the narrative to fix ALL issues while maintaining the noir style and story progression.`;

    const responseSchema = isDecisionPoint
      ? DECISION_CONTENT_SCHEMA
      : STORY_CONTENT_SCHEMA;

    const response = await llmService.complete(
      [{ role: 'user', content: fixPrompt }],
      {
        systemPrompt: 'You are an expert noir editor. Fix all issues while enhancing the atmospheric prose quality. Never change the plot, only improve the writing.',
        maxTokens: GENERATION_CONFIG.maxTokens.subchapter,
        responseSchema,
      }
    );

    return this._parseGeneratedContent(response.content, isDecisionPoint);
  }

  /**
   * Expand narrative with controlled generation
   * NOW INCLUDES GROUNDING to prevent consistency violations during expansion
   */
  async _expandNarrative(narrative, context, additionalWords) {
    // Build grounding section to maintain consistency during expansion
    const groundingSection = this._buildExpansionGrounding(context);

    const expandPrompt = `${groundingSection}

Expand this noir detective narrative by approximately ${additionalWords} more words.

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
8. CRITICAL: Do not contradict ANY facts from the ABSOLUTE_FACTS section above
9. Use ONLY the correct character names as specified
10. Maintain the timeline - Jack is a retired detective, 30 years on the force

Output ONLY the expanded narrative. No tags, no commentary.`;

    const response = await llmService.complete(
      [{ role: 'user', content: expandPrompt }],
      {
        systemPrompt: 'You are expanding noir fiction. Match the existing style exactly. Never contradict established facts.',
        maxTokens: GENERATION_CONFIG.maxTokens.expansion,
      }
    );

    return this._cleanNarrative(response.content);
  }

  /**
   * Build grounding section specifically for narrative expansion
   * Lighter weight than full generation grounding but maintains key facts
   */
  _buildExpansionGrounding(context) {
    // Use the imported constants directly (not STORY_BIBLE which doesn't exist)
    const protagonist = CHARACTER_REFERENCE.protagonist;
    const antagonist = CHARACTER_REFERENCE.antagonist;
    const allies = CHARACTER_REFERENCE.allies;
    const villains = CHARACTER_REFERENCE.villains;

    let grounding = `## ABSOLUTE_FACTS (NEVER CONTRADICT)

### PROTAGONIST
- Jack Halloway: Retired detective, ${ABSOLUTE_FACTS.protagonist.careerLength} on the force
- Setting: ${ABSOLUTE_FACTS.setting.city}, ${ABSOLUTE_FACTS.setting.atmosphere}

### EXACT TIMELINE DURATIONS (Use these numbers precisely, never approximate)
- Jack and Tom Wade: Best friends for exactly 30 years (met in college)
- Tom Wade's evidence manufacturing: exactly 20 years (Jack was unaware)
- Sarah Reeves: Jack's former partner for exactly 13 years
- Silas Reed: Jack's former partner for exactly 8 years
- Emily Cross case closed: exactly 7 years ago (Jack declared dead while she was still alive, held captive by Grange)
- Eleanor Bellamy: In prison for exactly 8 years (wrongfully convicted of husband's murder)

### KEY CHARACTERS
- Tom Wade: ${ABSOLUTE_FACTS.corruptOfficials.tomWade.title} - IMPORTANT: He manufactured evidence for 20 years, but has been Jack's best friend for 30 years. These are different durations.
- Victoria Blackwell: Also known as ${ABSOLUTE_FACTS.antagonist.trueName}, The Midnight Confessor
- The Five Innocents: Eleanor Bellamy, Marcus Thornhill, Dr. Lisa Chen, James Sullivan, Teresa Wade

## CHARACTER NAMES (USE EXACTLY)
`;

    // Add key character names from CHARACTER_REFERENCE
    const keyCharacters = [
      { name: protagonist?.name || 'Jack Halloway', role: 'protagonist' },
      { name: antagonist?.name || 'Victoria Blackwell', alias: 'Emily Cross, The Midnight Confessor' },
      { name: allies?.sarahReeves?.name || 'Sarah Reeves', role: 'former partner' },
      { name: allies?.eleanorBellamy?.name || 'Eleanor Bellamy', role: 'wrongfully convicted' },
      { name: villains?.tomWade?.name || 'Tom Wade', role: 'forensic examiner' },
    ];

    for (const char of keyCharacters) {
      grounding += `- ${char.name}${char.alias ? ` (aliases: ${char.alias})` : ''}${char.role ? ` - ${char.role}` : ''}\n`;
    }

    // Add path personality if available
    if (context.pathPersonality) {
      grounding += `
## JACK'S CURRENT PERSONALITY (MAINTAIN DURING EXPANSION)
- Action style: ${context.pathPersonality.narrativeStyle}
- Dialogue tone: ${context.pathPersonality.dialogueTone}
- Risk tolerance: ${context.pathPersonality.riskTolerance}
`;
    }

    return grounding;
  }

  // ==========================================================================
  // BOARD GENERATION (Puzzle data)
  // ==========================================================================

  /**
   * Generate board data for the puzzle
   * Now includes chapter-based difficulty scaling
   *
   * @param {string} narrative - The narrative text to extract words from
   * @param {boolean} isDecisionPoint - Whether this is a decision subchapter
   * @param {object} decision - Decision data for decision points
   * @param {string[]} puzzleCandidates - LLM-suggested puzzle words
   * @param {number} chapter - Current chapter (2-12) for difficulty scaling
   */
  _generateBoardData(narrative, isDecisionPoint, decision, puzzleCandidates = [], chapter = 2) {
    // Combine LLM candidates with regex extraction, prioritizing LLM candidates
    const regexWords = this._extractKeywordsFromNarrative(narrative);
    const narrativeUpperWordSet = new Set(
      String(narrative || '')
        .toUpperCase()
        .replace(/[^A-Z\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
    );

    // ========== DIFFICULTY SCALING BASED ON CHAPTER ==========
    // Early chapters (2-4): Easier puzzles with more obvious words
    // Mid chapters (5-8): Standard difficulty
    // Late chapters (9-12): Harder puzzles with more outliers and larger grids

    // Calculate difficulty tier (0 = easy, 1 = medium, 2 = hard)
    const difficultyTier = chapter <= 4 ? 0 : chapter <= 8 ? 1 : 2;

    // Calculate progressive difficulty multiplier (10% harder per chapter after 2)
    const chapterProgression = Math.max(0, (chapter - 2) * 0.1);

    // Word length requirements scale with difficulty
    const minWordLength = 4; // Always 4
    const maxWordLength = difficultyTier === 0 ? 8 : difficultyTier === 1 ? 9 : 10;

    // Semantic distance requirement scales with chapter
    // Later chapters require more semantic distinction to prevent "lucky guesses"
    // Stored for use in semantic validation
    this._currentSemanticDistanceRequirement = Math.min(3, Math.floor(chapter / 4) + 1);

    // ========== WORD QUALITY FILTER ==========
    // Exclude boring/common words that don't make good puzzle words
    const boringWords = new Set([
      // Common verbs that aren't evocative
      'JUST', 'SAID', 'THEN', 'WHEN', 'THAT', 'THIS', 'FROM', 'HAVE', 'WERE', 'BEEN',
      'INTO', 'OVER', 'VERY', 'MUCH', 'SOME', 'LIKE', 'WHAT', 'THAN', 'THEM', 'ONLY',
      'COME', 'CAME', 'MADE', 'MAKE', 'TAKE', 'TOOK', 'GOES', 'GONE', 'WENT', 'KNOW',
      'KNEW', 'THINK', 'FELT', 'FEEL', 'SEEM', 'LOOK', 'TURN', 'BACK', 'DOWN', 'AWAY',
      'WILL', 'WOULD', 'COULD', 'SHOULD', 'MIGHT', 'MUST', 'SHALL', 'NEED', 'WANT',
      // Articles and prepositions that might slip through
      'WITH', 'ABOUT', 'AFTER', 'BEFORE', 'THROUGH', 'UNDER', 'BETWEEN', 'AROUND',
      // Common pronouns and determiners
      'THEIR', 'THERE', 'WHERE', 'WHICH', 'OTHER', 'THESE', 'THOSE', 'EVERY', 'BEING',
      // Generic time words
      'TIME', 'TIMES', 'YEAR', 'YEARS', 'LATER', 'STILL', 'AGAIN', 'NEVER', 'ALWAYS',
      // Common but uninteresting nouns
      'THING', 'THINGS', 'PLACE', 'WAY', 'WAYS', 'PART', 'PARTS', 'KIND', 'SORT',
      'SAME', 'SUCH', 'EACH', 'BOTH', 'ELSE', 'EVEN', 'ALSO', 'MOST', 'MANY', 'MORE',
      // Weak adjectives
      'GOOD', 'WELL', 'LONG', 'LITTLE', 'GREAT', 'HIGH', 'SMALL', 'LARGE', 'YOUNG',
      // Common story-telling transitions
      'FIRST', 'LAST', 'NEXT', 'ANOTHER', 'WHOLE', 'HALF', 'REAL', 'SURE', 'TRUE',
    ]);

    // Filter LLM candidates for validity (length, structure, quality) with difficulty-based length
    const validCandidates = (puzzleCandidates || [])
      .map(w => w.toUpperCase().trim())
      .filter(w => {
        // Basic structure checks
        if (w.length < minWordLength || w.length > maxWordLength) return false;
        if (!/^[A-Z]+$/.test(w)) return false;
        // Quality filter
        if (boringWords.has(w)) return false;
        // Fairness: keep candidates grounded in the actual narrative text.
        // (The generator already asks for words "directly from your narrative", but enforce it here.)
        if (!narrativeUpperWordSet.has(w)) return false;
        return true;
      });

    // Also filter regex words for quality
    const qualityRegexWords = regexWords.filter(w => !boringWords.has(w.toUpperCase()));

    // Combine lists: Candidates first, then regex words (deduplicated)
    const allWords = [...new Set([...validCandidates, ...qualityRegexWords])];

    // Outlier count scales with difficulty and decision status
    // Easy: 4 outliers (6 for decisions), Medium: 4-5 (7-8), Hard: 5-6 (8)
    let outlierCount;
    if (isDecisionPoint) {
      outlierCount = difficultyTier === 0 ? 6 : difficultyTier === 1 ? 7 : 8;
    } else {
      outlierCount = difficultyTier === 0 ? 4 : difficultyTier === 1 ? 5 : 6;
    }

    let outlierWords = this._selectOutlierWords(allWords, outlierCount, isDecisionPoint, decision);

    // Grid size scales with difficulty
    // Easy: 4x4, Medium: 4x4 or 5x4 for decisions, Hard: 5x4
    let gridRows;
    if (isDecisionPoint) {
      gridRows = 5; // Always 5 for decisions
    } else {
      gridRows = difficultyTier === 2 ? 5 : 4;
    }
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

    // Extract dynamic semantic clusters from this specific narrative
    // This catches story-specific terms like poison types, unique locations, etc.
    this._extractDynamicClusters(narrative);

    // Run synchronous semantic validation (now uses both static AND dynamic clusters)
    outlierWords = this._validatePuzzleSemanticsSync(
      outlierWords,
      mainGridWords,
      // IMPORTANT: Do NOT use filler words as outlier replacements.
      // Replacements must remain grounded in the narrative-derived pools for puzzle fairness.
      availableReplacements
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
   *
   * NOTE: Cached on first access to avoid recreating this large array on every call
   */
  _getSemanticClusters() {
    // Return cached clusters if available
    if (StoryGenerationService._cachedSemanticClusters) {
      return StoryGenerationService._cachedSemanticClusters;
    }

    // Create and cache clusters on first call
    StoryGenerationService._cachedSemanticClusters = [
      // Weather/Temperature
      ['COLD', 'ICE', 'FROST', 'FREEZE', 'CHILL', 'WINTER', 'SNOW', 'FROZEN', 'FRIGID'],
      ['WIND', 'BREEZE', 'GUST', 'STORM', 'GALE', 'BLOW', 'AIR', 'TEMPEST'],
      ['RAIN', 'WATER', 'WET', 'DAMP', 'MOIST', 'DRENCH', 'SOAK', 'FLOOD', 'POUR', 'DOWNPOUR', 'STORM'],
      ['FIRE', 'FLAME', 'BURN', 'HEAT', 'HOT', 'BLAZE', 'EMBER', 'SCORCH', 'INFERNO'],

      // Light/Dark
      ['DARK', 'SHADOW', 'BLACK', 'NIGHT', 'GLOOM', 'DIM', 'MURKY', 'SHADE', 'DUSK'],
      ['LIGHT', 'BRIGHT', 'SHINE', 'GLOW', 'GLEAM', 'FLASH', 'BEAM', 'LAMP', 'NEON'],

      // Death/Violence
      ['DEATH', 'DEAD', 'DIE', 'KILL', 'MURDER', 'SLAY', 'FATAL', 'CORPSE', 'BODY', 'MORGUE'],
      ['BLOOD', 'BLEED', 'WOUND', 'CUT', 'STAB', 'SLASH', 'GASH', 'INJURY', 'HURT'],
      ['GUN', 'SHOOT', 'SHOT', 'BULLET', 'PISTOL', 'WEAPON', 'RIFLE', 'REVOLVER', 'FIREARM'],
      ['KNIFE', 'BLADE', 'SHARP', 'CUT', 'STAB', 'DAGGER', 'RAZOR'],

      // Truth/Lies
      ['TRUTH', 'TRUE', 'HONEST', 'REAL', 'FACT', 'GENUINE', 'SINCERE', 'CANDID'],
      ['LIE', 'FALSE', 'FAKE', 'DECEIT', 'FRAUD', 'CHEAT', 'TRICK', 'DECEIVE', 'BETRAY'],
      ['SECRET', 'HIDE', 'HIDDEN', 'CONCEAL', 'COVERT', 'COVER', 'BURY', 'SUPPRESS'],

      // Fear/Emotion
      ['FEAR', 'AFRAID', 'TERROR', 'DREAD', 'PANIC', 'SCARED', 'FRIGHT', 'HORROR'],
      ['ANGER', 'ANGRY', 'RAGE', 'FURY', 'MAD', 'WRATH', 'HATE', 'HOSTILE'],
      ['GUILT', 'SHAME', 'REGRET', 'REMORSE', 'SORRY', 'BLAME', 'FAULT'],
      ['GRIEF', 'SORROW', 'MOURN', 'LOSS', 'SADNESS', 'DESPAIR', 'ANGUISH'],

      // Crime/Law
      ['CRIME', 'CRIMINAL', 'CROOK', 'THIEF', 'STEAL', 'ROB', 'HEIST', 'FELON', 'CONVICT'],
      ['POLICE', 'COP', 'BADGE', 'OFFICER', 'DETECTIVE', 'PATROL', 'PRECINCT', 'SQUAD'],
      ['JAIL', 'PRISON', 'CELL', 'LOCK', 'CAGE', 'CAPTIVE', 'TRAPPED', 'BARS', 'INMATE'],
      ['COURT', 'TRIAL', 'JUDGE', 'JURY', 'LAWYER', 'VERDICT', 'SENTENCE', 'PROSECUTE'],
      ['EVIDENCE', 'PROOF', 'CLUE', 'WITNESS', 'TESTIMONY', 'ALIBI', 'FORENSIC'],

      // Body parts
      ['HAND', 'FIST', 'GRIP', 'GRASP', 'HOLD', 'GRAB', 'CLUTCH', 'FINGER'],
      ['EYE', 'EYES', 'LOOK', 'GAZE', 'STARE', 'WATCH', 'SEE', 'SIGHT', 'VISION'],
      ['FACE', 'EXPRESSION', 'FEATURES', 'VISAGE', 'COUNTENANCE'],

      // Money
      ['MONEY', 'CASH', 'DOLLAR', 'WEALTH', 'RICH', 'GOLD', 'FORTUNE', 'FUNDS'],
      ['PAY', 'PAID', 'BRIBE', 'DEBT', 'OWE', 'COST', 'PRICE', 'FEE'],
      ['STEAL', 'ROB', 'THEFT', 'EMBEZZLE', 'FRAUD', 'SWINDLE', 'LAUNDER'],

      // Time
      ['NIGHT', 'MIDNIGHT', 'EVENING', 'DUSK', 'DARK', 'LATE', 'NOCTURNAL'],
      ['PAST', 'MEMORY', 'REMEMBER', 'FORGOT', 'HISTORY', 'BEFORE', 'YESTERDAY', 'YEARS'],
      ['WAIT', 'PATIENT', 'TIME', 'CLOCK', 'HOUR', 'MINUTE', 'SECOND'],

      // ========== NEW NOIR-SPECIFIC CLUSTERS ==========

      // Alcohol/Drinking (Critical for Jack's character)
      ['WHISKEY', 'BOURBON', 'SCOTCH', 'DRINK', 'DRUNK', 'BOOZE', 'ALCOHOL', 'BOTTLE', 'BAR', 'JAMESON', 'GLASS', 'POUR', 'SIP'],

      // Partners/Allies
      ['PARTNER', 'ALLY', 'FRIEND', 'TRUST', 'LOYAL', 'COMPANION', 'COLLEAGUE'],
      ['BETRAY', 'TRAITOR', 'TURNCOAT', 'BACKSTAB', 'DOUBLE-CROSS', 'DECEIVE'],

      // Investigation
      ['INVESTIGATE', 'SEARCH', 'HUNT', 'TRACK', 'PURSUE', 'FOLLOW', 'TRAIL', 'LEAD'],
      ['CASE', 'FILE', 'RECORD', 'DOCUMENT', 'REPORT', 'DOSSIER'],
      ['SUSPECT', 'ACCUSED', 'DEFENDANT', 'PERPETRATOR', 'CULPRIT'],

      // Noir Locations
      ['OFFICE', 'DESK', 'ROOM', 'SPACE', 'CHAMBER'],
      ['ALLEY', 'STREET', 'ROAD', 'AVENUE', 'LANE', 'PATH'],
      ['WAREHOUSE', 'BUILDING', 'FACTORY', 'PLANT', 'FACILITY'],
      ['DOCKS', 'PIER', 'WHARF', 'HARBOR', 'PORT', 'WATERFRONT'],

      // Noir Atmosphere
      ['NEON', 'GLOW', 'SIGN', 'LIGHT', 'FLASH', 'FLICKER'],
      ['SMOKE', 'FOG', 'MIST', 'HAZE', 'VAPOR', 'CLOUD'],
      ['COAT', 'HAT', 'TRENCH', 'JACKET', 'COLLAR'],

      // Noir emotional collocations (rain-as-grief, past-as-haunting, favors-as-debt, scars-as-history)
      ['RAIN', 'TEARS', 'CRY', 'WEEP', 'GRIEF', 'MOURN', 'SOB'],
      ['SHADOW', 'GHOST', 'PAST', 'MEMORY', 'HAUNT', 'HAUNTED', 'SPECTER', 'ECHO'],
      ['DEBT', 'FAVOR', 'OWE', 'PRICE', 'COST', 'DUES', 'PAYBACK'],
      ['SCAR', 'MARK', 'WOUND', 'BRAND', 'BURNED', 'STITCH', 'BRUISE'],

      // Characters (Story-Specific)
      ['VICTORIA', 'CONFESSOR', 'EMILY', 'BLACKWELL'],
      ['SARAH', 'REEVES', 'PARTNER'],
      ['TOM', 'WADE', 'FORENSIC'],
      ['ELEANOR', 'BELLAMY', 'INNOCENT'],
      ['GRANGE', 'DEPUTY', 'CHIEF'],

      // Key Story Concepts
      ['INNOCENT', 'WRONGFUL', 'FRAMED', 'CONVICTED', 'EXONERATE'],
      ['CORRUPT', 'CORRUPTION', 'DIRTY', 'CROOKED', 'ROTTEN'],
      ['JUSTICE', 'FAIR', 'RIGHT', 'WRONG', 'MORAL'],
      ['CERTAINTY', 'CERTAIN', 'SURE', 'DOUBT', 'UNCERTAIN', 'QUESTION'],
      ['REDEMPTION', 'ATONE', 'FORGIVE', 'REDEEM', 'SALVATION'],

      // ========== NEW CLUSTERS: Vehicles, Communication, Documents ==========

      // Vehicles (noir staple for chases, stakeouts, escapes)
      ['CAR', 'DRIVE', 'DROVE', 'VEHICLE', 'AUTO', 'SEDAN', 'COUPE', 'WHEELS'],
      ['ROAD', 'HIGHWAY', 'STREET', 'AVENUE', 'BOULEVARD', 'ROUTE', 'PATH'],
      ['CHASE', 'PURSUE', 'TAIL', 'FOLLOW', 'TRACK', 'HUNT', 'FLEE', 'ESCAPE'],
      ['TAXI', 'CAB', 'CABBIE', 'FARE', 'METER', 'PICKUP'],
      ['GARAGE', 'PARKING', 'LOT', 'SPACE', 'SPOT'],

      // Communication (phones, messages, interception)
      ['PHONE', 'CALL', 'RING', 'DIAL', 'RECEIVER', 'LINE', 'BOOTH'],
      ['MESSAGE', 'NOTE', 'LETTER', 'MAIL', 'POST', 'ENVELOPE', 'STAMP'],
      ['WIRE', 'TAP', 'BUG', 'LISTEN', 'RECORD', 'INTERCEPT', 'EAVESDROP'],
      ['TALK', 'SPEAK', 'SAY', 'SAID', 'TELL', 'TOLD', 'VOICE', 'WORD'],
      ['SILENCE', 'QUIET', 'MUTE', 'HUSH', 'STILL', 'SILENT'],

      // Documents (evidence, records, paperwork)
      ['PAPER', 'DOCUMENT', 'FILE', 'FOLDER', 'BINDER', 'STACK'],
      ['RECORD', 'REPORT', 'MEMO', 'NOTE', 'LOG', 'ENTRY', 'DOSSIER'],
      ['SIGN', 'SIGNED', 'SIGNATURE', 'AUTOGRAPH', 'NAME', 'INITIAL'],
      ['TYPE', 'TYPED', 'PRINT', 'CARBON', 'COPY', 'DUPLICATE'],
      ['PHOTO', 'PICTURE', 'IMAGE', 'SNAPSHOT', 'FRAME', 'NEGATIVE'],
      ['MAP', 'CHART', 'DIAGRAM', 'LAYOUT', 'PLAN', 'BLUEPRINT'],

      // Money/Finance (bribes, debts, motives)
      ['BANK', 'VAULT', 'SAFE', 'DEPOSIT', 'ACCOUNT', 'SAVINGS'],
      ['CHECK', 'CHEQUE', 'CASH', 'BILL', 'COIN', 'CHANGE'],
      ['BRIBE', 'PAYOFF', 'KICKBACK', 'GREASE', 'PALM', 'CUT'],

      // Actions/Movement (common noir verbs)
      ['WALK', 'STEP', 'PACE', 'STRIDE', 'STROLL', 'MARCH'],
      ['RUN', 'SPRINT', 'DASH', 'BOLT', 'RACE', 'RUSH'],
      ['WAIT', 'WATCH', 'OBSERVE', 'STAKE', 'SURVEIL', 'MONITOR'],
      ['ENTER', 'EXIT', 'LEAVE', 'ARRIVE', 'DEPART', 'RETURN'],
      ['OPEN', 'CLOSE', 'SHUT', 'LOCK', 'UNLOCK', 'BOLT'],

      // ========== STORY-CRITICAL CLUSTERS (Prevent unfair puzzles) ==========

      // Confession/Confessor (The antagonist's title - critical overlap risk)
      ['CONFESSION', 'CONFESS', 'CONFESSIONAL', 'CONFESSOR', 'ADMIT', 'ADMISSION', 'ACKNOWLEDGE'],

      // Guilt/Justice expanded (central theme of wrongful convictions)
      ['GUILT', 'GUILTY', 'INNOCENT', 'INNOCENCE', 'CONVICT', 'CONVICTION', 'SENTENCE', 'SENTENCED'],
      ['WRONGFUL', 'UNJUST', 'UNFAIR', 'MISTAKEN', 'ERROR', 'MISTAKE'],

      // Frame/Forge (evidence tampering theme)
      ['FRAME', 'FRAMED', 'SETUP', 'PLANT', 'PLANTED', 'STAGE', 'STAGED'],
      ['FORGE', 'FORGED', 'FAKE', 'FALSIFY', 'FABRICATE', 'FABRICATED', 'TAMPER', 'TAMPERED'],
      ['MANUFACTURE', 'MANUFACTURED', 'CREATE', 'CREATED', 'MAKE', 'MADE'],

      // Partner/Detective relationships
      ['PARTNER', 'DETECTIVE', 'COP', 'OFFICER', 'INVESTIGATOR', 'BADGE', 'FORCE', 'PRECINCT'],

      // Prison/Incarceration (Eleanor's 8 years)
      ['PRISON', 'JAIL', 'INMATE', 'PRISONER', 'GREYSTONE', 'CELL', 'BARS', 'LOCKED', 'CONFINED'],

      // Betrayal/Trust (Tom Wade's 30-year betrayal)
      ['BETRAY', 'BETRAYAL', 'BETRAYED', 'TRUST', 'TRUSTED', 'FAITH', 'FAITHFUL', 'LOYAL', 'LOYALTY'],

      // ========== ADDITIONAL STORY-CRITICAL CLUSTERS ==========

      // Memory/Recall (Jack's recollections, flashbacks)
      ['RECALL', 'RECOLLECT', 'NOSTALGIA', 'FLASHBACK', 'MEMORY', 'MEMORIES', 'REMEMBER', 'REMEMBERED'],

      // Victim/Survivor (The Five Innocents are victims)
      ['VICTIM', 'VICTIMS', 'SURVIVOR', 'SURVIVORS', 'SUFFERER', 'TARGET', 'PREY'],

      // Appeal/Exoneration (Eleanor's appeal, wrongful conviction theme)
      ['APPEAL', 'APPEALS', 'EXONERATE', 'EXONERATION', 'OVERTURN', 'REVERSAL', 'PARDON', 'RELEASE'],

      // Midnight/Night (Victoria's timing, noir atmosphere)
      ['MIDNIGHT', 'MIDNIGHTS', 'CONFESSOR', 'CONFESSION', 'WITCHING', 'TWELVE', 'STROKE'],

      // Evidence types (Tom's manufactured evidence)
      ['FINGERPRINT', 'FINGERPRINTS', 'DNA', 'FIBER', 'FIBERS', 'TRACE', 'SAMPLE', 'SPECIMEN'],
      ['AUTOPSY', 'POSTMORTEM', 'CORONER', 'MEDICAL', 'EXAMINER', 'FORENSICS'],

      // Confession variants (The Midnight Confessor's letters)
      ['LETTER', 'LETTERS', 'ENVELOPE', 'ENVELOPES', 'MISSIVE', 'CORRESPONDENCE', 'MAIL'],

      // Watching/Surveillance (Jack's investigation methods)
      ['STAKEOUT', 'SURVEILLANCE', 'WATCHING', 'OBSERVING', 'TAILING', 'SHADOWING', 'SPYING'],

      // Old/Past (30 years of friendship, 8 years in prison)
      ['YEARS', 'DECADES', 'ANCIENT', 'FORMER', 'PREVIOUS', 'PRIOR', 'OLD', 'AGED'],

      // Five Innocents names (prevent character name overlap issues)
      ['MARCUS', 'THORNHILL', 'ACCOUNTANT', 'EMBEZZLER'],
      ['LISA', 'CHEN', 'DOCTOR', 'PHYSICIAN'],
      ['JAMES', 'SULLIVAN', 'MECHANIC', 'GARAGE'],
      ['TERESA', 'WADE', 'TOM', 'WIFE'],

      // Silas Reed (Jack's former partner)
      ['SILAS', 'REED', 'RECLUSE', 'HERMIT', 'FORMER'],

      // ========== COLOR CLUSTERS (Visual descriptions) ==========
      ['RED', 'CRIMSON', 'SCARLET', 'RUBY', 'MAROON', 'BURGUNDY', 'CHERRY', 'BLOOD-RED'],
      ['BLUE', 'AZURE', 'NAVY', 'COBALT', 'INDIGO', 'SAPPHIRE', 'CERULEAN', 'MIDNIGHT-BLUE'],
      ['GREEN', 'EMERALD', 'JADE', 'OLIVE', 'FOREST', 'MOSS', 'VIRIDIAN'],
      ['BLACK', 'EBONY', 'ONYX', 'JET', 'OBSIDIAN', 'PITCH', 'INKY', 'COAL'],
      ['WHITE', 'IVORY', 'PEARL', 'ALABASTER', 'SNOW', 'PALE', 'PALLID', 'ASHEN'],
      ['GREY', 'GRAY', 'SILVER', 'ASH', 'SLATE', 'STEEL', 'CHARCOAL', 'GUNMETAL'],
      ['GOLD', 'GOLDEN', 'AMBER', 'BRONZE', 'BRASS', 'COPPER', 'TAWNY'],

      // ========== SOUND CLUSTERS (Auditory descriptions) ==========
      ['WHISPER', 'MURMUR', 'HUSH', 'MUTTER', 'MUMBLE', 'BREATHE', 'SIGH'],
      ['SCREAM', 'SHOUT', 'YELL', 'CRY', 'SHRIEK', 'HOWL', 'WAIL', 'SCREECH'],
      ['BANG', 'CRASH', 'SLAM', 'THUD', 'BOOM', 'BLAST', 'CRACK', 'POP'],
      ['CREAK', 'GROAN', 'SQUEAK', 'SQUEAL', 'SCRAPE', 'SCRATCH', 'RASP'],
      ['HISS', 'SIZZLE', 'FIZZ', 'BUZZ', 'HUM', 'DRONE', 'WHIR'],
      ['RUMBLE', 'THUNDER', 'ROAR', 'GROWL', 'SNARL', 'GRUMBLE'],
      ['CLICK', 'CLACK', 'TAP', 'KNOCK', 'RAP', 'TICK', 'TOCK'],
      ['RING', 'CHIME', 'TOLL', 'BELL', 'DING', 'CLANG', 'JINGLE'],

      // ========== SYNONYM EXPANSIONS (Common noir words) ==========
      ['SHADOW', 'SILHOUETTE', 'OUTLINE', 'SHAPE', 'FIGURE', 'FORM', 'PROFILE'],
      ['STARE', 'GLARE', 'GAWK', 'OGLE', 'PEER', 'SQUINT', 'SCRUTINIZE'],
      ['WHISKEY', 'BOURBON', 'SCOTCH', 'RYE', 'BRANDY', 'COGNAC', 'LIQUOR'],
      ['CIGARETTE', 'SMOKE', 'CIGAR', 'TOBACCO', 'ASH', 'BUTT', 'DRAG', 'PUFF'],
      ['TIRED', 'WEARY', 'EXHAUSTED', 'FATIGUED', 'WORN', 'DRAINED', 'SPENT'],
      ['OLD', 'AGED', 'WORN', 'WEATHERED', 'BATTERED', 'SHABBY', 'DECREPIT'],

      // ========== BODY/PHYSICAL EXPANSIONS ==========
      ['LEG', 'FOOT', 'FEET', 'KNEE', 'ANKLE', 'THIGH', 'CALF', 'TOE'],
      ['ARM', 'ELBOW', 'WRIST', 'SHOULDER', 'BICEP', 'FOREARM'],
      ['CHEST', 'TORSO', 'RIBS', 'HEART', 'LUNGS', 'STOMACH', 'GUT'],
      ['HEAD', 'SKULL', 'BRAIN', 'TEMPLE', 'FOREHEAD', 'BROW', 'SCALP'],
      ['NECK', 'THROAT', 'JAW', 'CHIN', 'CHEEK', 'MOUTH', 'LIPS'],
    ];

    return StoryGenerationService._cachedSemanticClusters;
  }

  /**
   * Extract dynamic semantic clusters from narrative context
   *
   * Analyzes the current narrative to find story-specific terms that should
   * be clustered together to prevent unfair puzzle overlaps.
   *
   * Examples of dynamic clusters:
   * - If narrative mentions "arsenic poisoning", creates [ARSENIC, POISON, TOXIC, VENOM]
   * - If narrative mentions a unique location "the old mill", creates [MILL, OLD, ABANDONED]
   * - If narrative mentions a weapon "the bloodied hammer", creates [HAMMER, BLOOD, WEAPON]
   *
   * @param {string} narrative - The narrative text to analyze
   * @returns {string[][]} Array of dynamic semantic clusters
   */
  _extractDynamicClusters(narrative) {
    if (!narrative) return [];

    const dynamicClusters = [];
    const narrativeUpper = narrative.toUpperCase();
    const narrativeLower = narrative.toLowerCase();

    // ========== PATTERN 1: Method of Death/Violence ==========
    // Detect specific methods mentioned and cluster related terms
    const violencePatterns = [
      { pattern: /\b(poison|poisoned|poisoning|arsenic|cyanide|toxic|venom)\b/gi,
        cluster: ['POISON', 'POISONED', 'ARSENIC', 'CYANIDE', 'TOXIC', 'VENOM', 'DOSE', 'LETHAL'] },
      { pattern: /\b(strangle|strangled|strangling|choke|choked|garrote|asphyxiate)\b/gi,
        cluster: ['STRANGLE', 'CHOKE', 'GARROTE', 'THROAT', 'NECK', 'ASPHYXIATE', 'SUFFOCATE'] },
      { pattern: /\b(drown|drowned|drowning|submerge|underwater)\b/gi,
        cluster: ['DROWN', 'DROWNED', 'WATER', 'SUBMERGE', 'UNDERWATER', 'LUNGS', 'BREATHE'] },
      { pattern: /\b(burn|burned|burning|arson|fire|immolate|torch)\b/gi,
        cluster: ['BURN', 'BURNED', 'ARSON', 'FIRE', 'FLAME', 'TORCH', 'ASH', 'CHAR'] },
      { pattern: /\b(bludgeon|bludgeoned|blunt|hammer|club|bat|beaten)\b/gi,
        cluster: ['BLUDGEON', 'BLUNT', 'HAMMER', 'CLUB', 'BAT', 'BEATEN', 'SKULL', 'CRUSH'] },
    ];

    for (const { pattern, cluster } of violencePatterns) {
      if (pattern.test(narrativeLower)) {
        dynamicClusters.push(cluster);
        console.log(`[StoryGenerationService] Dynamic cluster added for violence method: ${cluster[0]}`);
      }
    }

    // ========== PATTERN 2: Specific Locations/Places ==========
    // Extract unique location names and create clusters
    const locationPatterns = [
      { pattern: /\b(mill|old mill|abandoned mill|watermill)\b/gi,
        cluster: ['MILL', 'ABANDONED', 'WATERMILL', 'GRAIN', 'WHEEL'] },
      { pattern: /\b(lighthouse|beacon|tower light)\b/gi,
        cluster: ['LIGHTHOUSE', 'BEACON', 'TOWER', 'LIGHT', 'COAST', 'ROCKS'] },
      { pattern: /\b(church|chapel|cathedral|sanctuary|steeple)\b/gi,
        cluster: ['CHURCH', 'CHAPEL', 'CATHEDRAL', 'SANCTUARY', 'STEEPLE', 'PEWS', 'ALTAR'] },
      { pattern: /\b(cemetery|graveyard|tomb|crypt|mausoleum)\b/gi,
        cluster: ['CEMETERY', 'GRAVEYARD', 'TOMB', 'CRYPT', 'GRAVE', 'BURIAL', 'HEADSTONE'] },
      { pattern: /\b(casino|gambling|poker|roulette|blackjack)\b/gi,
        cluster: ['CASINO', 'GAMBLING', 'POKER', 'CARDS', 'CHIPS', 'BET', 'STAKES'] },
      { pattern: /\b(hospital|clinic|ward|medical center|emergency room)\b/gi,
        cluster: ['HOSPITAL', 'CLINIC', 'WARD', 'MEDICAL', 'DOCTOR', 'NURSE', 'PATIENT'] },
    ];

    for (const { pattern, cluster } of locationPatterns) {
      if (pattern.test(narrativeLower)) {
        dynamicClusters.push(cluster);
        console.log(`[StoryGenerationService] Dynamic cluster added for location: ${cluster[0]}`);
      }
    }

    // ========== PATTERN 3: Evidence/Objects Mentioned ==========
    // Extract specific objects that could be evidence
    const evidencePatterns = [
      { pattern: /\b(ring|wedding ring|diamond ring|signet ring)\b/gi,
        cluster: ['RING', 'DIAMOND', 'WEDDING', 'GOLD', 'BAND', 'FINGER', 'JEWELRY'] },
      { pattern: /\b(watch|wristwatch|pocket watch|timepiece)\b/gi,
        cluster: ['WATCH', 'WRISTWATCH', 'TIMEPIECE', 'CLOCK', 'HANDS', 'TICK'] },
      { pattern: /\b(photograph|photo|picture|snapshot|polaroid)\b/gi,
        cluster: ['PHOTO', 'PHOTOGRAPH', 'PICTURE', 'SNAPSHOT', 'IMAGE', 'FRAME'] },
      { pattern: /\b(diary|journal|notebook|ledger|log book)\b/gi,
        cluster: ['DIARY', 'JOURNAL', 'NOTEBOOK', 'LEDGER', 'PAGES', 'ENTRIES', 'WRITING'] },
      { pattern: /\b(tape|cassette|recording|audio|reel)\b/gi,
        cluster: ['TAPE', 'CASSETTE', 'RECORDING', 'AUDIO', 'REEL', 'VOICE', 'PLAY'] },
      { pattern: /\b(syringe|needle|injection|hypodermic)\b/gi,
        cluster: ['SYRINGE', 'NEEDLE', 'INJECTION', 'HYPODERMIC', 'DOSE', 'INJECT'] },
    ];

    for (const { pattern, cluster } of evidencePatterns) {
      if (pattern.test(narrativeLower)) {
        dynamicClusters.push(cluster);
        console.log(`[StoryGenerationService] Dynamic cluster added for evidence: ${cluster[0]}`);
      }
    }

    // ========== PATTERN 4: Profession/Role Mentioned ==========
    // If narrative introduces specific professions, cluster related terms
    const professionPatterns = [
      { pattern: /\b(doctor|surgeon|physician|medical)\b/gi,
        cluster: ['DOCTOR', 'SURGEON', 'PHYSICIAN', 'MEDICAL', 'SCALPEL', 'PATIENT', 'SURGERY'] },
      { pattern: /\b(lawyer|attorney|counsel|legal|barrister)\b/gi,
        cluster: ['LAWYER', 'ATTORNEY', 'COUNSEL', 'LEGAL', 'COURT', 'CASE', 'CLIENT'] },
      { pattern: /\b(priest|father|clergy|reverend|minister)\b/gi,
        cluster: ['PRIEST', 'FATHER', 'CLERGY', 'REVEREND', 'CHURCH', 'HOLY', 'CONFESS'] },
      { pattern: /\b(reporter|journalist|press|newspaper|editor)\b/gi,
        cluster: ['REPORTER', 'JOURNALIST', 'PRESS', 'NEWSPAPER', 'EDITOR', 'STORY', 'HEADLINE'] },
      { pattern: /\b(nurse|orderly|caretaker|aide)\b/gi,
        cluster: ['NURSE', 'ORDERLY', 'CARETAKER', 'AIDE', 'PATIENT', 'CARE', 'WARD'] },
    ];

    for (const { pattern, cluster } of professionPatterns) {
      if (pattern.test(narrativeLower)) {
        dynamicClusters.push(cluster);
        console.log(`[StoryGenerationService] Dynamic cluster added for profession: ${cluster[0]}`);
      }
    }

    // ========== PATTERN 5: Extract Repeated Significant Nouns ==========
    // Find nouns that appear 3+ times - they're likely thematically important
    const nounPattern = /\b([A-Z][a-z]{3,})\b/g;
    const nounCounts = new Map();
    let match;

    while ((match = nounPattern.exec(narrative)) !== null) {
      const noun = match[1].toUpperCase();
      // Skip common words and character names
      const skipWords = new Set([
        'JACK', 'SARAH', 'VICTORIA', 'EMILY', 'WADE', 'ELEANOR', 'BELLAMY',
        'THAT', 'THIS', 'THEN', 'WHEN', 'WERE', 'BEEN', 'HAVE', 'SAID',
        'JUST', 'LIKE', 'BACK', 'DOWN', 'INTO', 'OVER', 'ONLY', 'EVEN'
      ]);
      if (!skipWords.has(noun) && noun.length >= 4) {
        nounCounts.set(noun, (nounCounts.get(noun) || 0) + 1);
      }
    }

    // Create clusters for frequently mentioned nouns
    for (const [noun, count] of nounCounts.entries()) {
      if (count >= 3) {
        // Create a small cluster with variations
        const cluster = [noun];
        // Add common variations
        if (noun.endsWith('S')) cluster.push(noun.slice(0, -1));
        else cluster.push(noun + 'S');
        if (noun.endsWith('ED')) cluster.push(noun.slice(0, -2));
        if (noun.endsWith('ING')) cluster.push(noun.slice(0, -3));

        dynamicClusters.push(cluster);
        console.log(`[StoryGenerationService] Dynamic cluster added for repeated noun: ${noun} (${count} occurrences)`);
      }
    }

    // Store for use in semantic validation
    this._currentDynamicClusters = dynamicClusters;

    return dynamicClusters;
  }

  /**
   * Check if two words belong to the same semantic cluster
   * Now checks both static clusters AND dynamic clusters extracted from narrative
   */
  _areSemanticallySimilar(word1, word2) {
    const w1 = word1.toUpperCase();
    const w2 = word2.toUpperCase();

    // Same word
    if (w1 === w2) return true;

    // Check if one contains the other (KILL/KILLER, DEATH/DEAD)
    if (w1.includes(w2) || w2.includes(w1)) return true;

    // Check static semantic clusters
    const staticClusters = this._getSemanticClusters();
    for (const cluster of staticClusters) {
      const hasW1 = cluster.some(c => c === w1 || w1.includes(c) || c.includes(w1));
      const hasW2 = cluster.some(c => c === w2 || w2.includes(c) || c.includes(w2));
      if (hasW1 && hasW2) return true;
    }

    // Check dynamic semantic clusters (extracted from current narrative)
    const dynamicClusters = this._currentDynamicClusters || [];
    for (const cluster of dynamicClusters) {
      const hasW1 = cluster.some(c => c === w1 || w1.includes(c) || c.includes(w1));
      const hasW2 = cluster.some(c => c === w2 || w2.includes(c) || c.includes(w2));
      if (hasW1 && hasW2) {
        console.log(`[StoryGenerationService] Dynamic cluster match: "${w1}" and "${w2}" in cluster [${cluster.slice(0, 3).join(', ')}...]`);
        return true;
      }
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

    // Get semantic distance requirement from difficulty scaling (default 1 if not set)
    const minSemanticDistance = this._currentSemanticDistanceRequirement || 1;

    // For higher difficulty chapters, we need stricter semantic separation
    // minSemanticDistance 1 = basic cluster check
    // minSemanticDistance 2 = also check for thematic similarity
    // minSemanticDistance 3 = also check for letter pattern similarity (harder puzzles)

    // Check each outlier against all grid words
    for (let i = 0; i < validatedOutliers.length; i++) {
      const outlier = validatedOutliers[i];
      let needsReplacement = false;

      for (const gridWord of gridWords) {
        // Basic semantic cluster check (always performed)
        if (this._areSemanticallySimilar(outlier, gridWord)) {
          needsReplacement = true;
          console.log(`[StoryGenerationService] Semantic overlap detected: outlier "${outlier}" ~ grid word "${gridWord}"`);
          break;
        }

        // Additional checks for higher difficulty
        if (minSemanticDistance >= 2) {
          // Check for shared prefix/suffix (e.g., MURDER/MURDERER, INVEST/INVESTIGATE)
          const outlierUpper = outlier.toUpperCase();
          const gridUpper = gridWord.toUpperCase();
          if (outlierUpper.length >= 4 && gridUpper.length >= 4) {
            if (outlierUpper.startsWith(gridUpper.slice(0, 4)) ||
                gridUpper.startsWith(outlierUpper.slice(0, 4))) {
              needsReplacement = true;
              console.log(`[StoryGenerationService] Prefix overlap detected: "${outlier}" ~ "${gridWord}"`);
              break;
            }
          }
        }

        if (minSemanticDistance >= 3) {
          // Check for anagram-like similarity (shared letters)
          const outlierLetters = new Set(outlier.toUpperCase().split(''));
          const gridLetters = new Set(gridWord.toUpperCase().split(''));
          const sharedLetters = [...outlierLetters].filter(l => gridLetters.has(l)).length;
          const maxLength = Math.max(outlier.length, gridWord.length);
          // If more than 70% letters are shared, might be confusing
          // Guard: short words have naturally high letter overlap and cause false positives (e.g., GUN/RUN).
          if (maxLength > 4 && sharedLetters / maxLength > 0.7) {
            needsReplacement = true;
            console.log(`[StoryGenerationService] Letter overlap detected: "${outlier}" ~ "${gridWord}" (${Math.round(sharedLetters/maxLength*100)}% shared)`);
            break;
          }
        }
      }

      if (needsReplacement) {
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
      // Backward-compat rolling facts (do not use for generation anymore).
      consistencyFacts: [],
      // Preferred: facts keyed by cumulative branch key.
      consistencyFactsByPathKey: {},
    };

    context.lastGeneratedChapter = entry.chapter;
    context.lastGeneratedSubchapter = entry.subchapter;
    context.lastPathKey = entry.pathKey;

    // Store consistency facts
    if (entry.consistencyFacts?.length > 0) {
      const pk = entry.pathKey || 'ROOT';
      if (!context.consistencyFactsByPathKey || typeof context.consistencyFactsByPathKey !== 'object') {
        context.consistencyFactsByPathKey = {};
      }

      const existing = context.consistencyFactsByPathKey[pk];
      const existingFacts = Array.isArray(existing?.facts) ? existing.facts : Array.isArray(existing) ? existing : [];
      const merged = [...existingFacts, ...entry.consistencyFacts].slice(-50); // Keep last 50 per path
      context.consistencyFactsByPathKey[pk] = {
        facts: merged,
        updatedAt: entry.generatedAt || new Date().toISOString(),
      };

      // Keep the legacy rolling array too (for older code paths / debug tooling),
      // but generation should NOT consume it (it causes branch bleed).
      context.consistencyFacts = [
        ...(context.consistencyFacts || []),
        ...entry.consistencyFacts,
      ].slice(-50);

      // Bound total number of stored paths to prevent unbounded growth from prefetching.
      try {
        const keys = Object.keys(context.consistencyFactsByPathKey || {});
        const MAX_PATHS = 24;
        if (keys.length > MAX_PATHS) {
          // Prefer to keep prefixes of the current path (they're always relevant),
          // then keep the most recently updated remaining paths.
          const current = String(context.lastPathKey || 'ROOT');
          const keep = new Set(keys.filter((k) => current.startsWith(k)));
          const rest = keys
            .filter((k) => !keep.has(k))
            .sort((a, b) => {
              const ta = new Date(context.consistencyFactsByPathKey[a]?.updatedAt || 0).getTime();
              const tb = new Date(context.consistencyFactsByPathKey[b]?.updatedAt || 0).getTime();
              return tb - ta; // newest first
            });
          for (const k of rest) {
            if (keep.size >= MAX_PATHS) break;
            keep.add(k);
          }
          for (const k of keys) {
            if (!keep.has(k)) delete context.consistencyFactsByPathKey[k];
          }
        }
      } catch (e) {
        // Never block story saving for pruning issues.
      }
    }

    this.storyContext = context;
    await saveStoryContext(context);
  }

  /**
   * Return persisted consistency facts relevant to a given cumulative pathKey.
   *
   * We only include facts for path keys that are prefixes of the current pathKey,
   * because those represent decisions the player actually made on the way here.
   * This prevents branch bleed from background prefetching alternative paths.
   */
  _getRelevantPersistedConsistencyFacts(pathKey) {
    const pk = String(pathKey || 'ROOT');
    const ctx = this.storyContext || {};
    const map = ctx.consistencyFactsByPathKey;

    // Backward compatibility: old installs only have a single rolling array.
    if (!map || typeof map !== 'object') {
      return Array.isArray(ctx.consistencyFacts) ? ctx.consistencyFacts.slice(-50) : [];
    }

    const facts = [];
    for (const [k, v] of Object.entries(map)) {
      if (!k) continue;
      if (!pk.startsWith(k)) continue;
      if (Array.isArray(v)) {
        facts.push(...v);
      } else if (Array.isArray(v?.facts)) {
        facts.push(...v.facts);
      }
    }
    // Deduplicate while preserving insertion order-ish.
    return [...new Set(facts)].slice(-80);
  }

  /**
   * Compute the cumulative branch key for a chapter from choice history.
   *
   * Decisions are recorded on caseNumbers like "001C", "002C", etc.
   * The decision at chapter N determines the branch identity for chapter N+1.
   * Therefore, the branch key for chapter K is the concatenation of optionKeys for all decision chapters < K.
   *
   * This replaces the old "previous decision only" pathing and prevents branch collisions.
   */
  _getPathKeyForChapter(chapter, choiceHistory) {
    const targetChapter = Number(chapter) || 1;
    const history = Array.isArray(choiceHistory) ? choiceHistory : [];
    if (targetChapter <= 1 || history.length === 0) return 'ROOT';

    const sorted = [...history].sort((a, b) => {
      const ca = this._extractChapterFromCase(a?.caseNumber);
      const cb = this._extractChapterFromCase(b?.caseNumber);
      return ca - cb;
    });

    const letters = [];
    for (const entry of sorted) {
      const decisionChapter = this._extractChapterFromCase(entry?.caseNumber);
      if (decisionChapter > 0 && decisionChapter < targetChapter) {
        const ok = entry?.optionKey === 'A' || entry?.optionKey === 'B';
        if (ok) letters.push(entry.optionKey);
      }
    }

    return letters.join('') || 'ROOT';
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
