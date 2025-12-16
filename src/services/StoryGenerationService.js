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
      description: 'A concise 1-2 sentence recap of the previous subchapter (max 40 words), written in past tense from Jack\'s perspective.',
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
            focus: { type: 'string', description: 'Two sentences: First, what this path prioritizes (investigation style, relationship, goal). Second, what it explicitly risks or sacrifices. Example: "Prioritizes immediate confrontation and direct truth-seeking. Risks alienating Sarah and losing her cooperation."' },
            personalityAlignment: {
              type: 'string',
              enum: ['aggressive', 'methodical', 'neutral'],
              description: 'Which player personality type would naturally choose this option. aggressive=direct confrontation, methodical=careful investigation, neutral=either personality might choose'
            },
          },
          required: ['key', 'title', 'focus', 'personalityAlignment'],
        },
        optionB: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Always "B"' },
            title: { type: 'string', description: 'Action statement in imperative mood, e.g., "Gather more evidence first"' },
            focus: { type: 'string', description: 'Two sentences: First, what this path prioritizes (investigation style, relationship, goal). Second, what it explicitly risks or sacrifices. Example: "Prioritizes careful evidence gathering and maintaining alliances. Risks letting the trail go cold while the enemy prepares."' },
            personalityAlignment: {
              type: 'string',
              enum: ['aggressive', 'methodical', 'neutral'],
              description: 'Which player personality type would naturally choose this option. aggressive=direct confrontation, methodical=careful investigation, neutral=either personality might choose'
            },
          },
          required: ['key', 'title', 'focus', 'personalityAlignment'],
        },
      },
      required: ['intro', 'optionA', 'optionB'],
    },
  },
  required: ['beatSheet', 'title', 'bridge', 'previously', 'jackActionStyle', 'jackRiskLevel', 'jackBehaviorDeclaration', 'storyDay', 'narrative', 'chapterSummary', 'puzzleCandidates', 'briefing', 'consistencyFacts', 'narrativeThreads', 'previousThreadsAddressed', 'decision'],
};

// ============================================================================
// MASTER SYSTEM PROMPT - Core instructions for the LLM
// ============================================================================
const MASTER_SYSTEM_PROMPT = `You are writing "The Detective Portrait," an interactive noir detective story. You are the sole author responsible for maintaining perfect narrative consistency.

## YOUR ROLE
You continue the story of Jack Halloway, a retired detective confronting the wrongful convictions built on his career. The Midnight Confessor (Victoria Blackwell, formerly Emily Cross) orchestrates his "education" about the cost of certainty.

## CRITICAL CONSTRAINTS - NEVER VIOLATE THESE
1. You write ONLY from Jack Halloway's first-person perspective, PAST TENSE (matching the example passages)
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
- Start multiple paragraphs with "I" - vary your sentence openings

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
- "previously": Concise 1-2 sentence recap of what just happened (max 40 words, from Jack's perspective, past tense)
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
  appears in your previousThreadsAddressed array. Missing critical threads = regeneration.

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
6. **FIRST PERSON**: Entire narrative is Jack's perspective, past tense, never "Jack thought" (use "I thought")
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

    // ========== Thread Escalation System ==========
    // Tracks how many times a thread has been acknowledged without progress
    // After 2+ acknowledgments, threads become OVERDUE and must be resolved/failed
    this.threadAcknowledgmentCounts = new Map(); // threadId -> acknowledgment count

    // ========== NEW: Fallback Content System for Graceful Degradation ==========
    this.fallbackTemplates = this._initializeFallbackTemplates();
    this.generationAttempts = new Map(); // Track retry attempts per content
    this.maxGenerationAttempts = 3; // Max attempts before using fallback
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
          narrative: `The rain hadn't let up since morning. I stood at the window of my office, watching Ashport's streets turn to rivers of reflected neon. Another day, another lead that might go nowhere.

Murphy's jukebox bled through the floorboards below, some sad song about chances missed and roads not taken. The melody matched my mood. Every case I'd closed in thirty years felt like it was reopening, one envelope at a time.

The Confessor's latest message sat on my desk. Black paper, red wax, silver ink spelling out accusations I couldn't deny. They knew things. Things I'd buried so deep I'd almost convinced myself they'd never happened.

I poured two fingers of Jameson and let it burn down my throat. The whiskey didn't help, but it didn't hurt either. At my age, that's about all you can ask for.

My phone buzzed. A text from an unknown number: "The next piece of the puzzle awaits. Are you ready to see what you've been blind to?"

I grabbed my coat and headed for the door. Ready or not, the truth was coming. And I had a feeling it wouldn't be kind.

The streets of Ashport welcomed me with their usual indifference. Neon signs flickered in the rain, advertising bars and bail bondsmen and dreams that died a long time ago. I'd walked these streets for three decades. Now they felt like a stranger's territory.

Whatever came next, I'd face it the way I always had: one step at a time, eyes open, hoping the shadows wouldn't swallow me whole.`,
          bridgeText: 'The investigation deepens.',
        },
        subchapterB: {
          title: 'Shadows and Revelations',
          narrative: `The address led me to a part of town I knew too well. Back alleys where witnesses disappeared and evidence got lost. The kind of place where cops like me used to be kings.

Not anymore.

I found what I was looking for in an abandoned warehouse. Files, photographs, documents that should have been destroyed years ago. Someone had been collecting the pieces of cases I'd closed, building a picture I never wanted to see.

My hands shook as I flipped through the pages. Names I recognized. Faces I'd forgotten. Evidence that looked too perfect to be real—because it wasn't. Not all of it, anyway.

How many times had I looked at forensic reports without questioning where they came from? How many confessions had I accepted because the physical evidence seemed so airtight?

The warehouse door creaked behind me. I spun, hand going to the gun I still carried out of habit more than necessity.

"You're starting to understand." The voice echoed from the shadows. "That's good. That's progress."

I couldn't see them, but I knew who it was. The Confessor. Victoria. Whatever name she was using today.

"Show yourself," I said, but my voice lacked conviction.

"Not yet. You're not ready. But soon, Jack. Soon you'll see everything."

When I turned back to the files, my eye caught something new. A photograph I hadn't noticed before. A face from the past that changed everything I thought I knew.

The rain outside seemed to intensify, as if the city itself was crying for all the wrongs that had been done in its name.`,
          bridgeText: 'The truth begins to emerge.',
        },
        subchapterC: {
          title: 'The Choice',
          narrative: `By the time I pieced together what the documents meant, the sun had set and risen again. I'd spent the night in that warehouse, surrounded by ghosts of cases past, trying to make sense of a career that suddenly felt like a lie.

The evidence pointed in two directions. Two paths forward. Each one leading to different truths, different consequences.

On one hand, I could follow the paper trail that led to the highest levels of the department. The kind of investigation that would burn bridges and end careers—mine included. But it might expose the full scope of what had been done.

On the other hand, I could focus on the individual cases. The people who'd been hurt. The innocents who might still be saved. A smaller scope, but perhaps more tangible results.

My phone rang. Sarah's name on the screen. My former partner, the only person in this city I still trusted.

"Jack, I've been doing some digging," she said without preamble. "Whatever you're into, it's bigger than you think. I've got contacts who want to help, but you need to choose your battles carefully."

She was right. She usually was.

The Confessor's game had brought me here, to this moment of decision. Victoria wanted me to understand the cost of certainty, the price of closing cases without questioning the evidence.

Well, I understood now. The question was what I was going to do about it.

Two paths. Two possibilities. The rain kept falling, and Ashport kept its secrets, waiting to see which road I'd choose.`,
          bridgeText: 'A crucial decision awaits.',
        },
      },
      complications: {
        subchapterA: {
          title: 'Walls Closing In',
          narrative: `Three days since my last lead went cold. Three days of paranoia and dead ends and the growing certainty that someone was watching my every move.

The walls of my office felt closer than they used to. Murphy's Bar below had gone quiet—too quiet for this time of night. Even the jukebox had stopped playing.

I checked the window. A car I didn't recognize sat across the street, engine running, headlights off. Could be nothing. Could be everything.

The Confessor's latest envelope had arrived that morning. This one was different. More urgent. The silver ink spelled out a name I hadn't thought about in years, attached to a case I'd considered closed.

Nothing was closed anymore.

I pulled out the case file I'd kept hidden in my desk drawer. Seven years of dust on the cover, but the details were burned into my memory. Emily Cross. Art student. Missing person case that became a death investigation when we found evidence of suicide.

Only now I was learning we might have been wrong. That she might have survived. That everything I thought I knew about that case—about a lot of cases—was built on foundations of sand.

My phone buzzed. Unknown number again.

"Time is running out, Jack. The people who built this system are getting nervous. They know you're asking questions. They're taking steps to ensure those questions stop."

The line went dead before I could respond.

I grabbed my coat and gun. Whatever was coming, I couldn't face it sitting still. The streets of Ashport awaited, rain-slicked and treacherous as always.`,
          bridgeText: 'The stakes continue to rise.',
        },
        subchapterB: {
          title: 'Betrayal\'s Edge',
          narrative: `The meeting was set for midnight. An informant who claimed to have proof of evidence tampering going back two decades. The kind of information that could bring down half the department.

I should have known it was too good to be true.

The warehouse was empty when I arrived. No informant. No evidence. Just shadows and the echo of footsteps that weren't mine.

"You came alone," a voice said from the darkness. "That was either brave or stupid."

I recognized the voice. Someone I'd trusted. Someone I'd worked with for years. The betrayal hit harder than any bullet could.

"Why?" I asked, though part of me already knew the answer.

"Because some secrets are worth killing for, Jack. And you're getting too close to all of them."

The first shot went wide. The second one would have found its mark if I hadn't moved when I did. Years of instinct, survival reflexes that wouldn't quit even when my conscious mind had given up.

I ran. Through the warehouse, out a back exit, into the rain-soaked streets of Ashport. Behind me, I could hear pursuit. Ahead of me, only uncertainty.

The city that had been my home for thirty years had become a maze of enemies. Every shadow held a potential threat. Every familiar face might be hiding treachery.

But I kept moving. Because stopping meant dying, and I wasn't ready to die. Not yet. Not until I knew the full truth about what I'd helped build with my career of certainty and closed cases.

The rain washed the blood from my hands—I'd cut myself on broken glass during the escape—but it couldn't wash away the stain on my conscience. That would take more than water.`,
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

    return adapted;
  }

  /**
   * Generate minimal fallback when no template is available
   */
  _generateMinimalFallback(chapter, subchapter, pathKey, isDecisionPoint) {
    const minimalNarrative = `The rain fell on Ashport as it always did—relentlessly, indifferently. I pulled my coat tighter and stepped into the night.

Another day, another piece of the puzzle. The Confessor's game continued, each envelope bringing me closer to truths I wasn't sure I wanted to face. But there was no turning back now. Not after everything I'd seen.

Murphy's Bar was quiet below my office. The usual crowd had dispersed, leaving only ghosts and memories. I poured a glass of Jameson and let the familiar burn ground me in the present.

Tomorrow would bring new challenges. New choices. New opportunities to get things right—or to fail, as I had failed so many times before.

But that was tomorrow. Tonight, I would rest. Gather my strength. Prepare for whatever came next.

The city outside my window sparkled with neon and rain. Beautiful and treacherous, like everything else in Ashport. I watched it for a long time before finally turning away.

Whatever the morning brought, I would face it. That was all I could promise myself anymore.`;

    return {
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
   * Enhanced with full narrative context for more meaningful consequences
   */
  async _generateDecisionConsequence(choice) {
    const chapter = this._extractChapterFromCase(choice.caseNumber);

    // Try to get context from the decision itself if available
    const decisionEntry = this.getGeneratedEntry(choice.caseNumber, this._getPathKeyForChapter(chapter, []));
    const decisionContext = decisionEntry?.decision?.options?.find(o => o.key === choice.optionKey);
    const otherOption = decisionEntry?.decision?.options?.find(o => o.key !== choice.optionKey);

    // Extract narrative context for richer consequence generation
    const narrativeContext = decisionEntry?.narrative ? decisionEntry.narrative.slice(-2000) : '';
    const decisionIntro = decisionEntry?.decision?.intro?.[0] || '';
    const activeThreads = decisionEntry?.consistencyFacts?.slice(0, 5) || [];
    const charactersInvolved = decisionEntry?.decision?.options?.flatMap(o => o.characters || []) || [];

    const consequencePrompt = `Generate narrative consequences for a player decision in a noir detective story.

## STORY CONTEXT
This is "The Detective Portrait" - Jack Halloway, a retired detective, is re-examining cases he closed after receiving letters from "The Midnight Confessor." He's discovering his best friend Tom Wade manufactured evidence for 20 years, sending innocent people to prison.

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
- Entering a dangerous location: "I kicked the door open before my better judgment could catch up. The warehouse stank of rust and old violence. Good. I was in the mood for both."
- Confronting a suspect: "'Cut the crap,' I said, grabbing his collar. 'I know what you did. The only question is whether you tell me now, or I find out the hard way and come back angry.'"
- Internal monologue: "Thirty years of being the patient detective. Look where it got me. This time, I wasn't waiting for permission."
- DO: Push, confront, act first and deal with consequences later
- DON'T: Hesitate, gather excessive evidence, wait patiently`;
    } else if (personality.riskTolerance === 'low') {
      task += `

**METHODICAL JACK VOICE EXAMPLES:**
Same scene, written for methodical Jack:
- Entering a dangerous location: "I circled the warehouse twice before going in. Noted the exits. The fire escape with the broken third rung. The way the security light flickered every forty seconds. Only then did I try the door."
- Confronting a suspect: "'I have some questions,' I said, keeping my voice level. 'You can answer them here, or I can come back with enough evidence to make this conversation unnecessary. Your choice.'"
- Internal monologue: "Every case I'd closed in thirty years taught me the same lesson: patience catches more killers than speed. I could wait. I'd gotten good at waiting."
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
      context.narrativeThreads.slice(-15).forEach(t => {
        if (!threadsByType[t.type]) threadsByType[t.type] = [];
        threadsByType[t.type].push(t);
      });

      section += `\n\n### ACTIVE NARRATIVE THREADS (MUST Address or acknowledge)`;

      // Critical threads first (appointments, promises, threats)
      const criticalTypes = ['appointment', 'promise', 'threat'];
      const otherTypes = Object.keys(threadsByType).filter(t => !criticalTypes.includes(t));

      criticalTypes.forEach(type => {
        if (threadsByType[type] && threadsByType[type].length > 0) {
          section += `\n**[CRITICAL] ${type.toUpperCase()} (must be addressed):**`;
          threadsByType[type].slice(-4).forEach(t => {
            const desc = t.description || t.excerpt || '';
            const truncatedDesc = desc.length > 150 ? desc.slice(0, 150) + '...' : desc;
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
          threadsByType[type].slice(-3).forEach(t => {
            const desc = t.description || t.excerpt || '';
            const truncatedDesc = desc.length > 150 ? desc.slice(0, 150) + '...' : desc;
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
    const decisionPrompt = `You are planning a critical decision point for Chapter ${chapter} of "The Detective Portrait."

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
        temperature: GENERATION_CONFIG.temperature.decisions,
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
  // ==========================================================================

  /**
   * Normalize a thread to a canonical ID for deduplication
   * Format: {type}:{sorted_entities}:{action_hash}
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

    // Extract key action verbs
    const actionVerbs = [
      'meet', 'call', 'visit', 'confront', 'investigate', 'find', 'search',
      'promise', 'agree', 'threaten', 'reveal', 'discover', 'follow', 'watch'
    ];

    const actions = actionVerbs
      .filter(verb => description.includes(verb))
      .sort();

    // Extract time references for appointments
    const timePatterns = /(?:midnight|noon|morning|evening|tonight|tomorrow|dawn|dusk|\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi;
    const times = (description.match(timePatterns) || []).map(t => t.toLowerCase()).sort();

    // Extract location references
    const locations = [
      'docks', 'warehouse', 'office', 'precinct', 'greystone', 'prison',
      'bar', 'apartment', 'morgue', 'courthouse', 'alley', 'waterfront'
    ];
    const mentionedLocations = locations
      .filter(loc => description.includes(loc))
      .sort();

    // Build normalized ID
    const parts = [type];
    if (mentionedCharacters.length > 0) parts.push(mentionedCharacters.join(','));
    if (actions.length > 0) parts.push(actions[0]); // Primary action
    if (times.length > 0) parts.push(times[0]); // Primary time
    if (mentionedLocations.length > 0) parts.push(mentionedLocations[0]); // Primary location

    return parts.join(':');
  }

  /**
   * Deduplicate threads using normalized IDs
   */
  _deduplicateThreads(threads) {
    if (!threads || threads.length === 0) return [];

    const seen = new Map();
    const deduplicated = [];

    for (const thread of threads) {
      const normalizedId = this._normalizeThreadId(thread);

      if (!normalizedId) {
        deduplicated.push(thread);
        continue;
      }

      if (!seen.has(normalizedId)) {
        seen.set(normalizedId, thread);
        // Add normalized ID to thread for tracking
        thread._normalizedId = normalizedId;
        deduplicated.push(thread);
      } else {
        // Merge: keep the more recent or more urgent version
        const existing = seen.get(normalizedId);
        const urgencyRank = { critical: 3, normal: 2, background: 1 };

        if ((urgencyRank[thread.urgency] || 0) > (urgencyRank[existing.urgency] || 0)) {
          // Replace with more urgent version
          const idx = deduplicated.indexOf(existing);
          if (idx !== -1) {
            thread._normalizedId = normalizedId;
            deduplicated[idx] = thread;
            seen.set(normalizedId, thread);
          }
        }

        console.log(`[StoryGenerationService] Deduplicated thread: "${thread.description?.slice(0, 50)}..." (normalized: ${normalizedId})`);
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
  // GENERATION AND VALIDATION
  // ==========================================================================

  /**
   * Generate a single subchapter with validation
   * Now integrates Story Arc Planning and Chapter Outlines for 100% consistency
   * Decision points use two-pass generation to ensure complete, contextual choices
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

      // Apply thread normalization and capping to prevent state explosion
      if (context.narrativeThreads) {
        context.narrativeThreads = this._deduplicateThreads(context.narrativeThreads);
        context.narrativeThreads = this._capActiveThreads(context.narrativeThreads, 20);
      }

      // Add story arc and chapter outline to context
      context.storyArc = this.storyArc;
      context.chapterOutline = chapterOutline;

      this.isGenerating = true;
      try {
        let generatedContent;
        let decisionStructure = null;

        if (isDecisionPoint) {
          // ========== TWO-PASS GENERATION FOR DECISION POINTS ==========
          // Pass 1: Generate decision structure first (ensures complete, contextual choices)
          decisionStructure = await this._generateDecisionStructure(context, chapter);

          // Pass 2: Generate narrative with pre-determined decision
          const decisionPrompt = this._buildDecisionNarrativePrompt(context, chapter, subchapter, decisionStructure);

          const response = await llmService.complete(
            [{ role: 'user', content: decisionPrompt }],
            {
              systemPrompt: MASTER_SYSTEM_PROMPT,
              temperature: GENERATION_CONFIG.temperature.decisions,
              maxTokens: GENERATION_CONFIG.maxTokens.subchapter + 2000,
              responseSchema: DECISION_CONTENT_SCHEMA,
            }
          );

          generatedContent = this._parseGeneratedContent(response.content, true);

          // Ensure the decision from Pass 1 is used (in case LLM modified it)
          if (decisionStructure.decision) {
            generatedContent.decision = {
              intro: decisionStructure.decision.intro,
              optionA: {
                key: 'A',
                title: decisionStructure.decision.optionA.title,
                focus: decisionStructure.decision.optionA.focus,
                personalityAlignment: decisionStructure.decision.optionA.personalityAlignment,
              },
              optionB: {
                key: 'B',
                title: decisionStructure.decision.optionB.title,
                focus: decisionStructure.decision.optionB.focus,
                personalityAlignment: decisionStructure.decision.optionB.personalityAlignment,
              },
            };
            console.log(`[StoryGenerationService] Two-pass complete: Decision preserved from Pass 1`);
          }
        } else {
          // ========== STANDARD SINGLE-PASS FOR NON-DECISION SUBCHAPTERS ==========
          const prompt = this._buildGenerationPrompt(context, chapter, subchapter, false);

          const response = await llmService.complete(
            [{ role: 'user', content: prompt }],
            {
              systemPrompt: MASTER_SYSTEM_PROMPT,
              temperature: GENERATION_CONFIG.temperature.narrative,
              maxTokens: GENERATION_CONFIG.maxTokens.subchapter,
              responseSchema: STORY_CONTENT_SCHEMA,
            }
          );

          generatedContent = this._parseGeneratedContent(response.content, false);
        }

        // Validate word count with retry logic
        let wordCount = generatedContent.narrative.split(/\s+/).length;
        let expansionAttempts = 0;
        const MAX_EXPANSION_ATTEMPTS = 2;

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
        let validationResult = this._validateConsistency(generatedContent, context);
        let retries = 0;

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
          board: this._generateBoardData(generatedContent.narrative, isDecisionPoint, generatedContent.decision, generatedContent.puzzleCandidates, chapter),
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

        // ========== GRACEFUL DEGRADATION: Use fallback content on failure ==========
        console.error(`[StoryGenerationService] Generation failed for ${caseNumber}_${pathKey}:`, error.message);

        // Track attempts
        const attemptKey = `${caseNumber}_${pathKey}`;
        const attempts = (this.generationAttempts.get(attemptKey) || 0) + 1;
        this.generationAttempts.set(attemptKey, attempts);

        // If we've exhausted retries, use fallback content
        if (attempts >= this.maxGenerationAttempts) {
          console.warn(`[StoryGenerationService] Using fallback content for ${caseNumber} after ${attempts} failed attempts`);

          const fallbackContent = this._getFallbackContent(chapter, subchapter, pathKey, isDecisionPoint);

          // Build fallback story entry
          const fallbackEntry = {
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
            isFallback: true, // Flag to indicate this is fallback content
            fallbackReason: error.message,
          };

          // Save and return fallback
          await saveGeneratedChapter(caseNumber, pathKey, fallbackEntry);
          if (!this.generatedStory) {
            this.generatedStory = { chapters: {} };
          }
          this.generatedStory.chapters[`${caseNumber}_${pathKey}`] = fallbackEntry;

          // Clear attempt count on successful fallback
          this.generationAttempts.delete(attemptKey);

          return fallbackEntry;
        }

        // Re-throw to allow caller to retry if attempts remain
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

      // Final fallback if even the inner fallback failed
      console.error('[StoryGenerationService] Complete generation failure, using emergency fallback');
      const chapter = parseInt(caseNumber?.slice(0, 3)) || 2;
      const subchapter = parseInt(caseNumber?.slice(4, 5)) || 1;
      const isDecisionPoint = subchapter === 3;

      const emergencyFallback = this._getFallbackContent(chapter, subchapter, pathKey, isDecisionPoint);
      return {
        chapter,
        subchapter,
        pathKey,
        caseNumber,
        title: emergencyFallback.title,
        narrative: emergencyFallback.narrative,
        bridgeText: emergencyFallback.bridgeText,
        previously: emergencyFallback.previously,
        briefing: emergencyFallback.briefing,
        decision: emergencyFallback.decision,
        board: this._generateBoardData(emergencyFallback.narrative, isDecisionPoint, emergencyFallback.decision, emergencyFallback.puzzleCandidates, chapter),
        consistencyFacts: emergencyFallback.consistencyFacts,
        chapterSummary: emergencyFallback.chapterSummary,
        generatedAt: new Date().toISOString(),
        wordCount: emergencyFallback.narrative.split(/\s+/).length,
        isFallback: true,
        isEmergencyFallback: true,
        fallbackReason: e.message,
      };
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
    // NOW ENFORCED AS ERRORS, NOT WARNINGS
    // =========================================================================
    if (context.pathPersonality) {
      const personality = context.pathPersonality;

      // Validate jackActionStyle and jackRiskLevel from LLM output match expected personality
      const expectedActionStyle = personality.riskTolerance === 'low' ? 'cautious'
        : personality.riskTolerance === 'high' ? 'direct' : 'balanced';
      const expectedRiskLevel = personality.riskTolerance || 'moderate';

      // Check if LLM declared action style matches expected (from schema output)
      if (content.jackActionStyle && content.jackActionStyle !== expectedActionStyle) {
        // Allow balanced as acceptable middle ground
        if (content.jackActionStyle !== 'balanced' && expectedActionStyle !== 'balanced') {
          issues.push(`Jack's action style mismatch: LLM declared "${content.jackActionStyle}" but player path personality expects "${expectedActionStyle}"`);
        }
      }

      if (content.jackRiskLevel && content.jackRiskLevel !== expectedRiskLevel) {
        // Allow moderate as acceptable middle ground
        if (content.jackRiskLevel !== 'moderate' && expectedRiskLevel !== 'moderate') {
          issues.push(`Jack's risk level mismatch: LLM declared "${content.jackRiskLevel}" but player path personality expects "${expectedRiskLevel}"`);
        }
      }

      // =========================================================================
      // BEHAVIOR DECLARATION VALIDATION (Schema-Level Enforcement)
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
              issues.push(`BEHAVIOR DECLARATION MISMATCH: Methodical player but declared primaryAction="${behavior.primaryAction}". Expected one of: ${methodicalBehaviors.primaryAction.join(', ')}`);
            }
          }
          if (behavior.dialogueApproach && aggressiveBehaviors.dialogueApproach.includes(behavior.dialogueApproach)) {
            issues.push(`BEHAVIOR DECLARATION MISMATCH: Methodical player but declared dialogueApproach="${behavior.dialogueApproach}". Expected one of: ${methodicalBehaviors.dialogueApproach.join(', ')}`);
          }
          if (behavior.physicalBehavior === 'aggressive' || behavior.physicalBehavior === 'commanding') {
            issues.push(`BEHAVIOR DECLARATION MISMATCH: Methodical player but declared physicalBehavior="${behavior.physicalBehavior}". Expected one of: ${methodicalBehaviors.physicalBehavior.join(', ')}`);
          }
        } else if (personality.riskTolerance === 'high') {
          // Aggressive player - check for overly cautious behaviors
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

      // Check for personality-inconsistent behavior in narrative text - NOW ERRORS
      if (personality.riskTolerance === 'low') {
        // Methodical Jack shouldn't suddenly be reckless
        const recklessBehavior = /(?:i|jack)\s+(?:rushed|charged|stormed|lunged|burst|barreled)\s+(?:in|into|through|forward)/i;
        if (recklessBehavior.test(narrativeOriginal)) {
          issues.push('PERSONALITY VIOLATION: Methodical Jack is acting recklessly (rushed/charged/stormed). Rewrite with cautious approach.');
        }

        // Check for impulsive actions
        const impulsiveActions = /without\s+(?:thinking|hesitation|a\s+second\s+thought)|(?:i|jack)\s+(?:grabbed|lunged|dove|leapt)\s+(?:at|for|toward)/i;
        if (impulsiveActions.test(narrativeOriginal)) {
          issues.push('PERSONALITY VIOLATION: Methodical Jack is acting impulsively. Rewrite with deliberate, planned actions.');
        }
      } else if (personality.riskTolerance === 'high') {
        // Aggressive Jack shouldn't suddenly become overly cautious
        const overlyPrudent = /(?:i|jack)\s+(?:hesitated|wavered|second-guessed|held\s+back|waited\s+patiently|decided\s+to\s+wait)/i;
        if (overlyPrudent.test(narrativeOriginal)) {
          issues.push('PERSONALITY VIOLATION: Aggressive Jack is being overly cautious (hesitated/wavered). Rewrite with direct action.');
        }

        // Check for excessive deliberation
        const excessiveDeliberation = /(?:i|jack)\s+(?:carefully\s+considered|weighed\s+(?:my|the)\s+options|took\s+(?:my|his)\s+time)/i;
        if (excessiveDeliberation.test(narrativeOriginal)) {
          issues.push('PERSONALITY VIOLATION: Aggressive Jack is deliberating excessively. Rewrite with decisive action.');
        }
      }
    }

    // =========================================================================
    // CATEGORY 5: PLOT CONTINUITY - Check narrative threads - NOW ENFORCED
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

        // Calculate how many critical threads were addressed
        const addressedCount = addressedThreads.length;
        const criticalCount = criticalThreads.length;

        // Require at least 50% of critical threads to be acknowledged
        const requiredAcknowledgments = Math.ceil(criticalCount * 0.5);
        if (addressedCount < requiredAcknowledgments) {
          issues.push(`THREAD CONTINUITY VIOLATION: Only ${addressedCount}/${criticalCount} critical threads addressed. Must acknowledge at least ${requiredAcknowledgments}. Critical threads: ${criticalThreads.slice(0, 3).map(t => t.description).join('; ')}`);
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
            const narrativeLower = narrative;

            // Extract key nouns/names from the thread description
            const keyWords = threadLower.match(/\b(?:jack|sarah|victoria|eleanor|silas|tom|wade|grange|meet|promise|call|contact|investigate|reveal)\b/g) || [];

            const mentionedInNarrative = keyWords.some(word => narrativeLower.includes(word));

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

        const wasAddressed = addressedThreads.some(addressed => {
          if (!addressed.originalThread) return false;
          const addressedLower = addressed.originalThread.toLowerCase();
          // Check if at least 2 key words match
          const matchingKeywords = threadKeywords.filter(kw => addressedLower.includes(kw));
          return matchingKeywords.length >= 2;
        });

        // Also check if the thread is mentioned in the narrative itself
        const mentionedInNarrative = threadKeywords.some(kw => narrative.includes(kw));

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
    if (context.pathPersonality) {
      const personality = context.pathPersonality;

      // Check for reckless behavior when player has been methodical
      if (personality.riskTolerance === 'low' || personality.narrativeStyle?.includes('cautiously')) {
        const recklessPatterns = /\b(?:charged|rushed|stormed|burst|leapt\s+without|didn't\s+wait|threw\s+caution|reckless|impulsive|without\s+thinking)\b/i;
        if (recklessPatterns.test(narrativeOriginal)) {
          issues.push('Narrative shows reckless behavior inconsistent with methodical/cautious path personality');
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
        temperature: GENERATION_CONFIG.temperature.expansion,
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
          if (sharedLetters / maxLength > 0.7) {
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
