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
import { getStoryEntry, formatCaseNumber, buildRealizedNarrative } from '../data/storyContent';
import { CHARACTER_REFERENCE } from '../data/characterReference';
import {
  TIMELINE,
  ABSOLUTE_FACTS,
  STORY_STRUCTURE,
  WRITING_STYLE,
  EXAMPLE_PASSAGES,
  CONSISTENCY_RULES,
  GENERATION_CONFIG,
  ENGAGEMENT_REQUIREMENTS,
  MICRO_TENSION_TECHNIQUES,
  SENTENCE_RHYTHM,
  ICEBERG_TECHNIQUE,
  SUBTEXT_REQUIREMENTS,
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

// ============================================================================
// BRANCHING NARRATIVE SCHEMA - Interactive story segments with player choices
// ============================================================================
// Structure: Opening -> Choice1 (3 options) -> Middle branches (3) -> Choice2 (3 each) -> Endings (9 total)
// Total paths: 9 unique experiences per subchapter
// Word budget: 280-320 words per segment, ~4000+ words total per subchapter

/**
 * Schema for a single tappable detail within narrative text
 */
const DETAIL_SCHEMA = {
  type: 'object',
  properties: {
    phrase: {
      type: 'string',
      description: 'The exact phrase in the narrative text that can be tapped (must appear verbatim in the segment text)',
    },
    note: {
      type: 'string',
      description: 'Jack\'s internal observation when the player taps this detail (15-25 words, noir voice)',
    },
    evidenceCard: {
      type: 'string',
      description: 'If this detail becomes evidence, the card label (2-4 words). Leave empty if purely atmospheric.',
    },
  },
  required: ['phrase', 'note'],
};

/**
 * Schema for a single choice option at a branch point
 */
const CHOICE_OPTION_SCHEMA = {
  type: 'object',
  properties: {
    key: {
      type: 'string',
      description: 'Unique identifier for this option: "1A", "1B", "1C" for first choice, "2A", "2B", "2C" for second',
    },
    label: {
      type: 'string',
      description: 'Short action label (2-5 words, imperative). Must be a DIFFERENT ACTION from other options - not the same action with different intensity. E.g., "Ask about the file", "Examine her desk", "Mention Tom\'s name"',
    },
    response: {
      type: 'string',
      description: 'The narrative response when player selects this option (280-320 words minimum). Continue the scene based on this choice.',
    },
    summary: {
      type: 'string',
      description: 'One-sentence summary of what happens when player takes this path (15-25 words). Used for decision context. E.g., "Jack takes a direct approach, confronting the witness and pressuring them for information."',
    },
    details: {
      type: 'array',
      items: DETAIL_SCHEMA,
      description: '0-2 tappable details within this response segment',
    },
  },
  required: ['key', 'label', 'response', 'summary'],
};

/**
 * Schema for a choice point in the narrative
 */
const CHOICE_POINT_SCHEMA = {
  type: 'object',
  properties: {
    prompt: {
      type: 'string',
      description: 'Brief context for the choice (shown to player, 5-15 words). E.g., "How does Jack respond?"',
    },
    options: {
      type: 'array',
      items: CHOICE_OPTION_SCHEMA,
      minItems: 3,
      maxItems: 3,
      description: 'Exactly 3 options for the player to choose from',
    },
  },
  required: ['prompt', 'options'],
};

/**
 * Schema for a second-level choice (after first choice, leading to endings)
 */
const SECOND_CHOICE_SCHEMA = {
  type: 'object',
  properties: {
    afterChoice: {
      type: 'string',
      description: 'Which first choice this follows: "1A", "1B", or "1C"',
    },
    prompt: {
      type: 'string',
      description: 'Brief context for this choice point (5-15 words)',
    },
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'Unique identifier: "1A-2A", "1A-2B", "1A-2C", etc.',
          },
          label: {
            type: 'string',
            description: 'Short action label (2-5 words)',
          },
          response: {
            type: 'string',
            description: 'The ending narrative segment (280-320 words minimum). Conclude this path of the subchapter.',
          },
          summary: {
            type: 'string',
            description: 'One-sentence summary of what happens in this path ending (15-25 words). Used for decision context. E.g., "Jack confronts the suspect directly, learning the truth but alerting their accomplices."',
          },
          details: {
            type: 'array',
            items: DETAIL_SCHEMA,
            description: '0-2 tappable details within this ending segment',
          },
        },
        required: ['key', 'label', 'response', 'summary'],
      },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ['afterChoice', 'prompt', 'options'],
};

/**
 * Complete schema for a branching narrative subchapter
 */
const BRANCHING_NARRATIVE_SCHEMA = {
  type: 'object',
  properties: {
    opening: {
      type: 'object',
      description: 'The opening segment, shared by all paths (280-320 words minimum)',
      properties: {
        text: {
          type: 'string',
          description: 'Opening narrative that sets the scene and leads to the first choice (280-320 words minimum)',
        },
        details: {
          type: 'array',
          items: DETAIL_SCHEMA,
          description: '1-2 tappable details in the opening',
        },
      },
      required: ['text'],
    },
    firstChoice: CHOICE_POINT_SCHEMA,
    secondChoices: {
      type: 'array',
      items: SECOND_CHOICE_SCHEMA,
      minItems: 3,
      maxItems: 3,
      description: 'Three second-choice points, one for each first choice option (1A, 1B, 1C)',
    },
  },
  required: ['opening', 'firstChoice', 'secondChoices'],
};

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
    // BRANCHING NARRATIVE - Interactive story with player choices
    // Structure: Opening (280-320w) -> Choice1 (3 opts) -> Middles (3x 280-320w) -> Choice2 (3 each) -> Endings (9x 280-320w)
    // Total: ~4000+ words generated, player experiences 850-950 words per path
    branchingNarrative: {
      type: 'object',
      description: 'Interactive branching narrative with 2 choice points and 9 possible paths',
      properties: {
        opening: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Opening scene shared by all paths (280-320 words minimum). Set the scene, build to first choice.',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  phrase: { type: 'string', description: 'Exact phrase from text that can be tapped' },
                  note: { type: 'string', description: 'Jack\'s noir-voice observation (15-25 words)' },
                  evidenceCard: { type: 'string', description: 'Evidence card label if applicable (2-4 words), or empty' },
                },
                required: ['phrase', 'note'],
              },
            },
          },
          required: ['text'],
        },
        firstChoice: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Choice context (5-15 words). E.g., "How does Jack respond?"' },
            options: {
              type: 'array',
              minItems: 3,
              maxItems: 3,
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string', description: '"1A", "1B", or "1C"' },
                  label: { type: 'string', description: 'Action label (2-5 words). Different ACTION from other options, not same action with different intensity.' },
                  response: { type: 'string', description: 'Narrative response (280-320 words minimum)' },
                  details: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        phrase: { type: 'string' },
                        note: { type: 'string' },
                        evidenceCard: { type: 'string' },
                      },
                      required: ['phrase', 'note'],
                    },
                  },
                },
                required: ['key', 'label', 'response'],
              },
            },
          },
          required: ['prompt', 'options'],
        },
        secondChoices: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          description: 'Three second-choice points, one following each first choice (1A, 1B, 1C)',
          items: {
            type: 'object',
            properties: {
              afterChoice: { type: 'string', description: 'Which first choice this follows: "1A", "1B", or "1C"' },
              prompt: { type: 'string', description: 'Choice context (5-15 words)' },
              options: {
                type: 'array',
                minItems: 3,
                maxItems: 3,
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string', description: '"1A-2A", "1A-2B", "1A-2C", etc.' },
                    label: { type: 'string', description: 'Action label (2-5 words). Different ACTION from other options.' },
                    response: { type: 'string', description: 'Ending segment (280-320 words minimum). Conclude this path.' },
                    details: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          phrase: { type: 'string' },
                          note: { type: 'string' },
                          evidenceCard: { type: 'string' },
                        },
                        required: ['phrase', 'note'],
                      },
                    },
                  },
                  required: ['key', 'label', 'response'],
                },
              },
            },
            required: ['afterChoice', 'prompt', 'options'],
          },
        },
      },
      required: ['opening', 'firstChoice', 'secondChoices'],
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
    // ========== ENGAGEMENT TRACKING FIELDS ==========
    engagementMetrics: {
      type: 'object',
      description: 'Metrics tracking reader engagement elements in this subchapter',
      properties: {
        questionsRaised: {
          type: 'array',
          items: { type: 'string' },
          description: 'New questions planted in the reader\'s mind this subchapter (mystery, character, threat, or thematic questions)',
        },
        questionsAnswered: {
          type: 'array',
          items: { type: 'string' },
          description: 'Questions from previous chapters addressed (partially or fully) in this subchapter',
        },
        emotionalPeak: {
          type: 'string',
          description: 'Quote the single most emotionally intense moment in this subchapter (the gut-punch line)',
        },
        cliffhangerStrength: {
          type: 'string',
          enum: ['soft_hook', 'medium_tension', 'unbearable'],
          description: 'How desperately will the reader want to continue? unbearable = they cannot stop here',
        },
      },
      required: ['questionsRaised', 'emotionalPeak', 'cliffhangerStrength'],
    },
    sensoryAnchors: {
      type: 'object',
      description: 'Sensory grounding for this scene to make it viscerally real',
      properties: {
        dominantSense: {
          type: 'string',
          enum: ['sight', 'sound', 'smell', 'touch', 'taste'],
          description: 'Primary sense emphasized in this scene',
        },
        recurringDetail: {
          type: 'string',
          description: 'One specific sensory detail mentioned 2-3 times (e.g., "the drip of the faucet", "the smell of old cigarettes", "rain on the windows")',
        },
        atmosphereNote: {
          type: 'string',
          description: 'Brief description of the overall sensory atmosphere (e.g., "claustrophobic and damp", "sterile and cold", "chaotic and loud")',
        },
      },
      required: ['dominantSense', 'recurringDetail', 'atmosphereNote'],
    },
    finalMoment: {
      type: 'string',
      description: 'The EXACT last 1-2 sentences of your narrative. Must create unbearable forward momentum. Examples: a character entering, a name spoken, a realization that reframes everything, a gun cocking, a phone ringing with a dead person\'s number.',
    },
    microRevelation: {
      type: 'string',
      description: 'The small truth or clue revealed in this subchapter. Every subchapter must reveal SOMETHING new (a name, a date, a connection, a lie exposed).',
    },
    personalStakesThisChapter: {
      type: 'string',
      description: 'What does Jack personally stand to lose if he fails in THIS specific chapter? Be viscerally specific (not "his reputation" but "the last person who still believes in him").',
    },
    // CANONICAL NARRATIVE - String representation for context building
    // This is the "canonical path" (opening + 1A + 1A-2A) concatenated into a single string
    // Used by context building, scene state extraction, and narrative thread analysis
    narrative: {
      type: 'string',
      description: 'CANONICAL NARRATIVE: Concatenate opening.text + firstChoice.options[0].response (1A) + secondChoices[0].options[0].response (1A-2A) into a single continuous narrative string (850-950 words total). This represents the "default" path for context continuity. Write naturally - this is what the context system reads.',
    },
  },
  required: ['beatSheet', 'title', 'bridge', 'previously', 'jackActionStyle', 'jackRiskLevel', 'jackBehaviorDeclaration', 'storyDay', 'branchingNarrative', 'narrative', 'chapterSummary', 'puzzleCandidates', 'briefing', 'consistencyFacts', 'narrativeThreads', 'previousThreadsAddressed', 'engagementMetrics', 'sensoryAnchors', 'finalMoment', 'microRevelation', 'personalStakesThisChapter'],
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
    // TEMPORARY: Simple single decision instead of 9-path pathDecisions
    // Testing if pathDecisions complexity is causing Gemini schema rejection
    decision: {
      type: 'object',
      description: 'Single decision point with intro and two options (A and B). Each option has key, title, focus, and personalityAlignment.',
      properties: {
        intro: { type: 'string', description: '1-2 sentences framing the decision moment (max 50 words)' },
        optionA: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Option identifier: "A"' },
            title: { type: 'string', description: 'Short imperative action (3-8 words)' },
            focus: { type: 'string', description: 'What this choice prioritizes (1 sentence)' },
            personalityAlignment: { type: 'string', enum: ['aggressive', 'cautious', 'balanced'] },
          },
          required: ['key', 'title', 'focus', 'personalityAlignment'],
        },
        optionB: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Option identifier: "B"' },
            title: { type: 'string', description: 'Short imperative action (3-8 words)' },
            focus: { type: 'string', description: 'What this choice prioritizes (1 sentence)' },
            personalityAlignment: { type: 'string', enum: ['aggressive', 'cautious', 'balanced'] },
          },
          required: ['key', 'title', 'focus', 'personalityAlignment'],
        },
      },
      required: ['intro', 'optionA', 'optionB'],
    },
    // BRANCHING NARRATIVE for decision subchapters - same structure as regular, but builds to the decision
    branchingNarrative: {
      type: 'object',
      description: 'Interactive branching narrative building to the decision moment. 2 choice points, 9 possible paths.',
      properties: {
        opening: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Opening scene (280-320 words minimum). Build tension toward the decision.' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  phrase: { type: 'string' },
                  note: { type: 'string' },
                  evidenceCard: { type: 'string' },
                },
                required: ['phrase', 'note'],
              },
            },
          },
          required: ['text'],
        },
        firstChoice: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Choice context (5-15 words)' },
            options: {
              type: 'array',
              minItems: 3,
              maxItems: 3,
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  label: { type: 'string' },
                  response: { type: 'string', description: 'Narrative response (280-320 words minimum)' },
                  summary: { type: 'string', description: 'One-sentence summary of what happens (15-25 words). Used for decision context.' },
                  details: { type: 'array', items: { type: 'object', properties: { phrase: { type: 'string' }, note: { type: 'string' }, evidenceCard: { type: 'string' } }, required: ['phrase', 'note'] } },
                },
                required: ['key', 'label', 'response', 'summary'],
              },
            },
          },
          required: ['prompt', 'options'],
        },
        secondChoices: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              afterChoice: { type: 'string' },
              prompt: { type: 'string' },
              options: {
                type: 'array',
                minItems: 3,
                maxItems: 3,
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string' },
                    label: { type: 'string' },
                    response: { type: 'string', description: 'Ending segment (280-320 words minimum). Conclude at the decision moment.' },
                    summary: { type: 'string', description: 'One-sentence summary of this path ending (15-25 words). Used for decision context.' },
                    details: { type: 'array', items: { type: 'object', properties: { phrase: { type: 'string' }, note: { type: 'string' }, evidenceCard: { type: 'string' } }, required: ['phrase', 'note'] } },
                  },
                  required: ['key', 'label', 'response', 'summary'],
                },
              },
            },
            required: ['afterChoice', 'prompt', 'options'],
          },
        },
      },
      required: ['opening', 'firstChoice', 'secondChoices'],
    },
    chapterSummary: {
      type: 'string',
      description: 'A concise 2-3 sentence summary of a CANONICAL path through the narrative (pick one representative path).',
    },
    puzzleCandidates: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of 10-12 distinct, evocative single words (nouns/verbs) from across ALL paths that would make good puzzle answers.',
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
    // ========== ENGAGEMENT TRACKING FIELDS (DECISION SCHEMA) ==========
    engagementMetrics: {
      type: 'object',
      description: 'Metrics tracking reader engagement elements in this subchapter',
      properties: {
        questionsRaised: {
          type: 'array',
          items: { type: 'string' },
          description: 'New questions planted in the reader\'s mind this subchapter (mystery, character, threat, or thematic questions)',
        },
        questionsAnswered: {
          type: 'array',
          items: { type: 'string' },
          description: 'Questions from previous chapters addressed (partially or fully) in this subchapter',
        },
        emotionalPeak: {
          type: 'string',
          description: 'Quote the single most emotionally intense moment in this subchapter (the gut-punch line)',
        },
        cliffhangerStrength: {
          type: 'string',
          enum: ['soft_hook', 'medium_tension', 'unbearable'],
          description: 'For decision points, this should almost always be "unbearable" - the decision itself is the hook',
        },
      },
      required: ['questionsRaised', 'emotionalPeak', 'cliffhangerStrength'],
    },
    sensoryAnchors: {
      type: 'object',
      description: 'Sensory grounding for this scene to make it viscerally real',
      properties: {
        dominantSense: {
          type: 'string',
          enum: ['sight', 'sound', 'smell', 'touch', 'taste'],
          description: 'Primary sense emphasized in this scene',
        },
        recurringDetail: {
          type: 'string',
          description: 'One specific sensory detail mentioned 2-3 times (e.g., "the drip of the faucet", "the smell of old cigarettes", "rain on the windows")',
        },
        atmosphereNote: {
          type: 'string',
          description: 'Brief description of the overall sensory atmosphere (e.g., "claustrophobic and damp", "sterile and cold", "chaotic and loud")',
        },
      },
      required: ['dominantSense', 'recurringDetail', 'atmosphereNote'],
    },
    finalMoment: {
      type: 'string',
      description: 'The EXACT last 1-2 sentences BEFORE the decision prompt. Must create maximum tension at the moment of choice.',
    },
    microRevelation: {
      type: 'string',
      description: 'The small truth or clue revealed in this subchapter. Every subchapter must reveal SOMETHING new (a name, a date, a connection, a lie exposed).',
    },
    personalStakesThisChapter: {
      type: 'string',
      description: 'What does Jack personally stand to lose if he fails in THIS specific chapter? Be viscerally specific (not "his reputation" but "the last person who still believes in him").',
    },
    // CANONICAL NARRATIVE - String representation for context building
    // This is the "canonical path" (opening + 1A + 1A-2A) concatenated into a single string
    // Used by context building, scene state extraction, and narrative thread analysis
    narrative: {
      type: 'string',
      description: 'CANONICAL NARRATIVE: Concatenate opening.text + firstChoice.options[0].response (1A) + secondChoices[0].options[0].response (1A-2A) into a single continuous narrative string (850-950 words total). This represents the "default" path for context continuity. Write naturally - this is what the context system reads.',
    },
    // NOTE: pathDecisions field moved BEFORE narrative in schema to ensure all 9 are generated first
    // This prevents truncation from cutting off decision structure
  },
  // TEMPORARY: Using 'decision' instead of 'pathDecisions' to test schema complexity
  required: ['beatSheet', 'title', 'bridge', 'previously', 'jackActionStyle', 'jackRiskLevel', 'jackBehaviorDeclaration', 'storyDay', 'decision', 'branchingNarrative', 'narrative', 'chapterSummary', 'puzzleCandidates', 'briefing', 'consistencyFacts', 'narrativeThreads', 'previousThreadsAddressed', 'engagementMetrics', 'sensoryAnchors', 'finalMoment', 'microRevelation', 'personalStakesThisChapter'],
};

// ============================================================================
// PATHDECISIONS SCHEMA - Minimal schema for 9 path-specific decisions (second call)
// This is called AFTER main content generation to add path-specific decision options
// ============================================================================
const PATH_DECISION_OPTION_SCHEMA = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    title: { type: 'string' },
    focus: { type: 'string' },
    personalityAlignment: { type: 'string' },
  },
};

const SINGLE_PATH_DECISION_SCHEMA = {
  type: 'object',
  properties: {
    intro: { type: 'string' },
    optionA: PATH_DECISION_OPTION_SCHEMA,
    optionB: PATH_DECISION_OPTION_SCHEMA,
  },
};

// Array format for pathDecisions - 9 items, one per unique path
const PATHDECISIONS_ONLY_SCHEMA = {
  type: 'object',
  properties: {
    pathDecisions: {
      type: 'array',
      description: '9 path-specific decision points, one for each unique path through this subchapter',
      items: {
        type: 'object',
        properties: {
          pathKey: { type: 'string', description: 'Path identifier: 1A-2A, 1A-2B, 1A-2C, 1B-2A, 1B-2B, 1B-2C, 1C-2A, 1C-2B, 1C-2C' },
          intro: { type: 'string', description: 'Path-specific intro text (1-2 sentences framing the decision for this path)' },
          optionA: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Always "A"' },
              title: { type: 'string', description: 'Short imperative action (3-8 words)' },
              focus: { type: 'string', description: 'What this choice prioritizes (1 sentence)' },
              personalityAlignment: { type: 'string', enum: ['aggressive', 'cautious', 'balanced'] },
            },
            required: ['key', 'title', 'focus', 'personalityAlignment'],
          },
          optionB: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Always "B"' },
              title: { type: 'string', description: 'Short imperative action (3-8 words)' },
              focus: { type: 'string', description: 'What this choice prioritizes (1 sentence)' },
              personalityAlignment: { type: 'string', enum: ['aggressive', 'cautious', 'balanced'] },
            },
            required: ['key', 'title', 'focus', 'personalityAlignment'],
          },
        },
        required: ['pathKey', 'intro', 'optionA', 'optionB'],
      },
      minItems: 9,
      maxItems: 9,
    },
  },
  required: ['pathDecisions'],
};

// Prompt template for the second call to generate path-specific decisions
// IMPORTANT: Uses SUMMARIES (15-25 words each) instead of full narrative content.
// Full narrative excerpts trigger Gemini's RECITATION safety filter.
const PATHDECISIONS_PROMPT_TEMPLATE = `Generate 9 path-specific decision variants for a noir detective branching narrative.

## PATH KEY FORMAT
The 9 paths are: 1A-2A, 1A-2B, 1A-2C, 1B-2A, 1B-2B, 1B-2C, 1C-2A, 1C-2B, 1C-2C
- First part = first choice (1A, 1B, 1C)
- Second part = ending within that branch (2A, 2B, 2C)

## FIRST CHOICE (How the player approached the scene):
- 1A: "{{firstChoice1ALabel}}" → {{firstChoice1ASummary}}
- 1B: "{{firstChoice1BLabel}}" → {{firstChoice1BSummary}}
- 1C: "{{firstChoice1CLabel}}" → {{firstChoice1CSummary}}

## PATH ENDINGS (What happened for each of the 9 paths):
{{pathSummaries}}

## BASE DECISION (Adapt for each path):
- Option A: "{{optionATitle}}" ({{optionAFocus}})
- Option B: "{{optionBTitle}}" ({{optionBFocus}})

## YOUR TASK
For each of the 9 paths, generate a unique decision variant that:
1. Frames the intro (1-2 sentences) to reflect WHAT HAPPENED in that specific path
2. Adjusts the focus/framing of options based on the path's context and player's approach style
3. Sets personalityAlignment based on path tone: "aggressive" for direct/confrontational, "cautious" for methodical/careful, "balanced" otherwise

Generate pathDecisions array with 9 objects: { pathKey, intro, optionA {key, title, focus, personalityAlignment}, optionB {key, title, focus, personalityAlignment} }`;

// ============================================================================
// MASTER SYSTEM PROMPT - Core instructions for the LLM
// Structured per Gemini 3 best practices (XML tags, explicit planning, persona)
// ============================================================================
const MASTER_SYSTEM_PROMPT = `<identity>
You are the author of "Dead Letters," a Lehane/French-style interactive noir mystery.
You are NOT an AI assistant helping with writing - you ARE the writer.
Your prose rivals Dennis Lehane's "Mystic River" and Tana French's "In the Woods."
You are precise, atmospheric, and psychologically rich.
</identity>

<core_mandate>
You continue the story of Jack Halloway with perfect narrative consistency.
The Midnight Confessor (Victoria Blackwell, formerly Emily Cross) orchestrates his "education" about the cost of certainty.
Every word you write maintains the noir atmosphere and advances the mystery.
</core_mandate>

## PLANNING BEFORE WRITING (MANDATORY)

Before generating ANY narrative content, you MUST internally plan:

<planning_steps>
1. **Parse Beat Requirements**: What MUST happen in this subchapter's beat type?
2. **Identify Critical Threads**: Which CRITICAL threads are overdue and must be addressed?
3. **Select Emotional Anchor**: What gut-punch moment will this contain?
4. **Verify Timeline**: Check all durations against ABSOLUTE_FACTS (exact years, not approximate)
5. **Outline Narrative Arc**: Opening hook → escalation → final line hook
</planning_steps>

This planning ensures coherent, purposeful prose rather than wandering narrative.

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
6. **DIALOGUE FORMATTING:** Use SINGLE QUOTES for all dialogue (e.g., 'Like this,' Jack said). This is a stylistic choice for the noir aesthetic.

## BRANCHING NARRATIVE STRUCTURE - INTERACTIVE STORY FORMAT
You generate an INTERACTIVE narrative with 2 choice points and 9 possible paths.

**STRUCTURE:**
\`\`\`
Opening (280-320 words) - Shared by all players
        ↓
    Choice 1 (3 options: 1A, 1B, 1C)
   /       |       \\
Response  Response  Response  (280-320 words each)
   |       |       |
Choice 2  Choice 2  Choice 2  (3 options each)
  /|\\      /|\\      /|\\
 9 unique ending segments (280-320 words each)
\`\`\`

**TOTAL OUTPUT:** ~4,000+ words (player experiences 850-950 words per path)

**BRANCHING RULES:**
1. Opening sets the scene and builds to a natural choice point
2. First choice should be about Jack's APPROACH (how he handles the situation)
3. Each response branch continues the scene differently based on that approach
4. Second choice should be about Jack's FOCUS (what he prioritizes)
5. Endings conclude this subchapter's path but leave threads for next

**CRITICAL: LOGICAL CONSISTENCY BETWEEN SEGMENTS**
Each choice response MUST logically flow from BOTH:
- The opening's established state (what situation exists, what obstacles are present)
- The specific choice the player made (how they chose to act)

If the opening establishes a BARRIER (e.g., "Claire refuses to hand over the ledger"), the choice response must:
- Show HOW Jack overcomes that barrier based on his chosen approach, OR
- Show Jack failing to overcome it and adapting, OR
- Show the consequences of that barrier still being in place

NEVER have a response assume access to something the opening denied without showing HOW access was gained.

BAD EXAMPLE:
- Opening: "Claire pulled the folder close. 'The Ledger is not for sale.'"
- Choice: "Examine the recent entries"
- Response: "Jack flipped through the pages..." ← WRONG! Claire didn't give it to him!

GOOD EXAMPLE:
- Opening: "Claire pulled the folder close. 'The Ledger is not for sale.'"
- Choice: "Examine the recent entries"
- Response: "Jack held her gaze, unblinking. 'I'm not buying. I'm borrowing.' His hand was already on the folder before she could object. Claire's grip loosened—something in his eyes told her this wasn't negotiable. He flipped to the most recent pages..." ← Shows the transition!

**CRITICAL: TRUE INFINITE BRANCHING**
Each of the 9 paths can lead to DIFFERENT narrative states. This means:
- DIFFERENT CLUES: Different paths can reveal different information
- DIFFERENT REVELATIONS: Some paths may discover things others miss
- DIFFERENT OUTCOMES: Each ending can set up different scenarios for the next subchapter
- MEANINGFUL CONSEQUENCES: Player choices have real impact on the story

IMPORTANT: The system tracks which exact path the player took. The next subchapter will:
1. Receive ONLY the narrative text from the player's actual path (not all 9)
2. Continue the story from THAT specific ending
3. React to the specific discoveries, encounters, and emotional beats of THAT path

Because of this:
- Make each path GENUINELY different - not just cosmetically reworded
- Endings can set up unique situations (different locations, different characters encountered, different knowledge gained)
- Use the Story Bible and established facts as guardrails, but don't force convergence
- The LLM will receive full context of the player's actual journey when generating subsequent content

Think of it as true RPG branching: your choices genuinely shape the story.

**CHOICE DESIGN - SITUATIONAL, NOT PERSONALITY-BASED:**
The 3 branching options should be THREE DIFFERENT ACTIONS Jack could take in the situation - NOT variations of aggression/caution.

**WRONG (personality-aligned):**
- "Confront him directly" (aggressive)
- "Ask diplomatically" (neutral)
- "Observe silently" (cautious)
These are the SAME action (questioning someone) with different intensity levels. Boring!

**RIGHT (situationally different):**
In a scene where Jack finds Claire alone in her office:
- "Ask about the missing file" (pursue one lead)
- "Mention Tom's name" (pursue a different lead)
- "Examine the photographs on her desk" (investigate the environment instead of talking)

In a scene where Jack confronts a suspect at the docks:
- "Show him the forged signature" (use evidence)
- "Ask about the night of the fire" (probe timeline)
- "Follow him when he walks away" (change the scene entirely)

**KEY PRINCIPLES:**
- Each option should lead to DIFFERENT INFORMATION or DISCOVERIES
- Options can be: talk to different people, investigate different objects, go to different places, ask about different topics
- The player is choosing WHAT to focus on, not HOW aggressively to do it
- All three should feel like valid, reasonable responses to the situation
- Labels: 2-5 words, imperative mood
- Prompts: 5-15 words setting context ("What does Jack focus on?", "Where does Jack look?")

**TAPPABLE DETAILS:**
Each segment can have 0-2 "details" - phrases the player can tap for Jack's observation.
- phrase: Exact text from the segment (must appear verbatim)
- note: Jack's noir-voice internal thought (15-25 words)
- evidenceCard: If this becomes evidence, a short label (2-4 words), otherwise empty

With TRUE INFINITE BRANCHING, different paths can discover different evidence:
- The opening's details are shared by everyone (establishing scene)
- Path-specific segments can have UNIQUE evidence discoveries
- Some evidence may only be available on certain paths (creates meaningful choice)
- Include evidence relevant to THAT path's narrative thread

**Example detail:**
\`\`\`json
{
  "phrase": "a crumpled receipt from the Rusty Anchor",
  "note": "Tom's alibi. If he was drinking here at 6:47, he couldn't have been in that alley. Unless the bartender's lying.",
  "evidenceCard": "Bar Receipt"
}
\`\`\`

DO NOT:
- Make choices that lead to identical outcomes (defeats the purpose)
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
- "beatSheet": Plan your scene first with 3-5 plot beats (these apply to the CANONICAL path).
- "title": Evocative 2-5 word noir chapter title
- "bridge": One short, compelling sentence hook (max 15 words)
- "previously": Concise 1-2 sentence recap of what just happened (max 40 words), third-person past tense
- "storyDay": The day number (1-12) this scene takes place. Chapter number = Day number. The story spans exactly 12 days.
- "branchingNarrative": Your interactive story structure (see BRANCHING NARRATIVE STRUCTURE above). Contains:
  * "opening": { text, details[] } - The shared opening segment (280-320 words)
  * "firstChoice": { prompt, options[] } - First branch point with 3 options (1A, 1B, 1C)
  * "secondChoices": Array of 3 second-choice points, each with 3 options leading to 9 endings
- "narrative": CANONICAL NARRATIVE for context continuity. This is a 850-950 word STRING that represents ONE complete path through your branchingNarrative.
  Concatenate: opening.text + [blank line] + firstChoice.options[0].response (the 1A path) + [blank line] + secondChoices[0].options[0].response (the 1A-2A ending).
  This creates a single continuous narrative that the context building system reads to understand scene state, character presence, location, and emotional state.
  Write it naturally - smooth transitions between the segments. The context system needs this string to extract:
  * Current location (where Jack is at the end)
  * Time of day and story day
  * Characters present in the final scene
  * Jack's emotional and physical state
  * Last sentence for continuation point
  IMPORTANT: This must match the corresponding segments from branchingNarrative exactly - just concatenate them.
- "chapterSummary": Summarize the CANONICAL path (opening + 1A + 1A-2A) in 2-3 sentences. This is used for fallback context only.
- "puzzleCandidates": Extract 6-12 single words (nouns/verbs) from YOUR narrative that are best for a word puzzle
- "briefing": Mission briefing with "summary" (one sentence objective) and "objectives" (2-3 specific directives)
- "consistencyFacts": Array of 3-5 facts from the Story Bible that should remain consistent. Focus on established character traits, locations, and timeline events.
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
- "engagementMetrics": Track what hooks the reader (see ENGAGEMENT REQUIREMENTS below)
- "sensoryAnchors": Ground each scene in specific sensory details
- "finalMoment": The EXACT last 1-2 sentences - must create unbearable forward momentum
- "microRevelation": The small truth revealed this subchapter - every scene must reveal SOMETHING
- "personalStakesThisChapter": What Jack personally loses if he fails HERE (be specific!)

## ENGAGEMENT REQUIREMENTS - WHAT MAKES READERS UNABLE TO STOP

### The Question Economy
Every subchapter should plant new questions and selectively answer others.
- Mystery questions: What happened? Who did it? What does it mean?
- Character questions: Will Sarah forgive Jack? Can Tom be redeemed?
- Threat questions: Will Grange find him? Is Victoria ally or enemy?
- Thematic questions: Can Jack truly change? Is redemption possible?

BALANCE RULE: Maintain 3-5 active burning questions at all times. Answer one, plant two.

### The Final Line Requirement
The last 1-2 sentences of EVERY subchapter must create unbearable forward momentum.
Techniques that work:
- A character entering unexpectedly
- A name spoken that changes everything
- A question that demands an answer
- A door opening to reveal something
- A phone ringing with an impossible caller ID
- A realization that reframes everything
- A physical threat made concrete
- A choice that must be made NOW

Examples of EXCELLENT final moments:
- "Victoria Blackwell smiled. 'Hello, Jack. It's time we talked about endgames.'"
- "The caller ID showed a number Jack knew by heart. Tom's number. But Tom was dead."
- "He'd always been the evidence."

### Personal Stakes Escalation
What Jack personally stands to lose should escalate through the story:
- Chapters 2-4: Jack's self-image and reputation at stake
- Chapters 5-7: Jack's relationships at stake (Sarah, his sense of purpose)
- Chapters 8-10: Jack's freedom and physical safety at stake
- Chapters 11-12: Jack's redemption and legacy at stake

Each chapter must make viscerally clear what Jack loses if he fails THIS chapter.

### Revelation Gradient
Revelations follow a deliberate pattern:
- MICRO (every subchapter): A clue, a connection, a small truth (a name, a date, a lie exposed)
- CHAPTER (end of each chapter): A character's true nature revealed, a conspiracy layer peeled
- ARC (chapters 4, 7, 10): Game-changers that recontextualize everything

Revelations should make readers say "I KNEW something was off" or "Oh god, that changes everything."

### Emotional Anchor Requirement
Every chapter needs ONE moment that hits the reader in the gut. Not plot, but FEELING.
- A specific face from Jack's guilt (not abstract guilt)
- A character saying something that lands like a punch
- A memory that intrudes unwanted
- Physical manifestation of pain (hands shaking, throat tight)
- A photograph, a voice, a smell that triggers grief

## SENTENCE RHYTHM - CRITICAL FOR NOIR CADENCE

Vary your sentence lengths deliberately:

SHORT. For impact.
Medium sentences carry the narrative forward, building momentum.
Longer sentences work when you need to unspool a thought, let the reader sink into Jack's mind as he pieces together the implications of what he's just seen, each connection leading to another, the way a crack spreads across ice.
Then short again.

RULES:
- If three sentences in a row are similar length, revise
- Use fragments for emotional impact (one-word paragraphs, incomplete thoughts)
- Long sentences for rumination, short for action and revelation
- Paragraph breaks create pacing—don't be afraid of one-line paragraphs

## MICRO-TENSION REQUIREMENT

Every paragraph must contain at least ONE tension element:
- A question (stated or implied)
- A contradiction or inconsistency noticed
- An incomplete action (reaching for something, about to speak)
- A sensory discomfort (cold, pressure, pain)
- A hint of threat (sound, movement, presence)
- An emotional undercurrent (anger beneath calm, fear behind bravado)
- A ticking clock reference (time passing, deadline approaching)
- Information withheld (character knows something they won't say)

Paragraphs without tension are paragraphs where readers check their phone.

## SUBTEXT LAYER REQUIREMENTS

Every significant dialogue exchange must have TWO layers:
1. What the characters are SAYING (surface)
2. What they're ACTUALLY communicating (subtext: emotion, power, hidden meaning)

Example:
- "Coffee?" Sarah asked. [Surface: Offering coffee. Subtext: I'm willing to have this conversation.]
- "I'm good." [Surface: Declining. Subtext: I don't deserve your care / I'm pushing you away.]

RULE: Never write dialogue where characters say exactly what they mean. That's not how broken people talk.

## THE ICEBERG TECHNIQUE

For every piece of backstory or information: show 10%, imply 30%, leave 60% unspoken.
- Characters reference events that happened "that night in February" without explaining
- Jack avoids looking at the third barstool at Murphy's without saying why
- Victoria touches her wrist when lying—we never learn why
- Tom's laugh changes when Helen Price is mentioned

Mystery isn't about what you reveal. It's about what you deliberately don't.

## SENSORY ANCHORING

Every scene needs specific sensory grounding:
- Choose a DOMINANT SENSE (sight, sound, smell, touch, taste)
- Include a RECURRING DETAIL mentioned 2-3 times (the drip of a faucet, the smell of old cigarettes, rain on windows)
- Establish ATMOSPHERE through sensory specifics, not adjectives

## SELF-VERIFICATION CHECKLIST (Complete before submitting)
Before outputting your JSON response, verify:

1. **WORD COUNT**: Your narrative exceeds ${MIN_WORDS_PER_SUBCHAPTER} words (count them!)
2. **THREAD CONTINUITY**: Every CRITICAL thread from PREVIOUS_ACTIVE_THREADS appears in previousThreadsAddressed
3. **PERSONALITY MATCH**: jackActionStyle matches the player path personality provided in the task
4. **STORY DAY**: storyDay equals the chapter number (story spans exactly 12 days)
5. **FORBIDDEN PATTERNS**: Scan your narrative for forbidden words/phrases from the list above
6. **THIRD PERSON LIMITED**: Entire narrative is third-person past tense, close on Jack. Never use "I/me/my/we/our".
7. **TIMELINE FACTS**: Any durations mentioned use EXACT numbers from ABSOLUTE_FACTS (30 years Tom, 8 years Eleanor, etc.)
8. **TEMPORAL ANCHORING**: Story begins on November 14, 2025. All flashbacks calculated from this anchor date.
9. **DECISION ALIGNMENT**: If decision point, both options have personalityAlignment field filled

## ENGAGEMENT SELF-CHECK (The "What If They Stop Here" Test)
Before outputting, imagine the reader puts down their phone at this exact moment.
- What question will haunt them?
- What image will stay with them?
- What do they NEED to know that you haven't told them yet?
If the answer is "nothing," rewrite the ending.

Additional engagement checks:
9. **FIRST SENTENCE**: Does it create a physical sensation or immediate tension? (Not setting, but hook)
10. **QUESTION PLANTED**: Is there a question planted in the first 100 words?
11. **DIALOGUE PUNCH**: Does at least one piece of dialogue hit like a punch?
12. **EMOTIONAL VULNERABILITY**: Is there a moment of genuine emotional vulnerability?
13. **DRAMATIC IRONY**: Does the reader know something Jack doesn't (and feel the tension)?
14. **TICKING CLOCK**: Is there time pressure felt in the prose (not just mentioned)?
15. **FINAL LINE**: Does the final line make stopping feel impossible?
16. **SENSORY ANCHOR**: Is there a recurring sensory detail grounding the scene?
17. **MICRO-REVELATION**: Does this scene reveal at least ONE new piece of information?

If any answer is NO, revise before outputting.`;

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

## EXAMPLE: DECISION SETUP (EXCELLENT)
"${EXAMPLE_PASSAGES.decisionSetup}"

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

// ============================================================================
// EXTENDED STYLE EXAMPLES - Full scenes for deep pattern learning
// ============================================================================
const buildExtendedStyleExamples = () => {
  // Import dynamically to avoid circular dependencies
  const { EXTENDED_STYLE_GROUNDING, ANNOTATED_EXAMPLES, NEGATIVE_EXAMPLES } = require('../data/storyBible');

  return `
## EXTENDED EXAMPLE: COMPLETE TENSION SCENE
Study how this scene builds tension through dialogue, physical action, and emotional undercurrent:

${EXTENDED_STYLE_GROUNDING.tensionScene}

---

## EXTENDED EXAMPLE: REVELATION MOMENT
Study how this scene delivers a game-changing revelation while maintaining emotional impact:

${EXTENDED_STYLE_GROUNDING.revelationScene}

---

## EXTENDED EXAMPLE: CHAPTER ENDING (CLIFFHANGER)
Study how this scene creates unbearable forward momentum:

${EXTENDED_STYLE_GROUNDING.chapterEnding}

---

## EXTENDED EXAMPLE: DIALOGUE UNDER TENSION (SUBTEXT)
Study how every line carries surface meaning AND hidden subtext:

${EXTENDED_STYLE_GROUNDING.dialogueUnderTension}

---

## ANNOTATED EXAMPLE: Physical Emotion
"${ANNOTATED_EXAMPLES.physicalEmotionExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.physicalEmotionExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Dialogue Subtext
"${ANNOTATED_EXAMPLES.dialogueSubtextExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.dialogueSubtextExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Tension Building
"${ANNOTATED_EXAMPLES.tensionBuildingExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.tensionBuildingExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Chapter Hook
"${ANNOTATED_EXAMPLES.chapterHookExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.chapterHookExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Sensory World-Building
"${ANNOTATED_EXAMPLES.sensoryWorldBuildingExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.sensoryWorldBuildingExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Character Through Action
"${ANNOTATED_EXAMPLES.characterThroughActionExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.characterThroughActionExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Crowd As Character
"${ANNOTATED_EXAMPLES.crowdAsCharacterExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.crowdAsCharacterExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Dialogue Revealing Class
"${ANNOTATED_EXAMPLES.dialogueRevealingClassExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.dialogueRevealingClassExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Threat Through Normality
"${ANNOTATED_EXAMPLES.threatThroughNormalityExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.threatThroughNormalityExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Complex Emotion Through Object
"${ANNOTATED_EXAMPLES.complexEmotionThroughObjectExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.complexEmotionThroughObjectExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Waiting As Character
"${ANNOTATED_EXAMPLES.waitingAsCharacterExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.waitingAsCharacterExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Psychological Complicity
"${ANNOTATED_EXAMPLES.psychologicalComplicityExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.psychologicalComplicityExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Accepting Darkness
"${ANNOTATED_EXAMPLES.acceptingDarknessExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.acceptingDarknessExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Silent Reconnection
"${ANNOTATED_EXAMPLES.silentReconnectionExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.silentReconnectionExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Burnout Monologue
"${ANNOTATED_EXAMPLES.burnoutMonologueExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.burnoutMonologueExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Memory Erasure
"${ANNOTATED_EXAMPLES.memoryErasureExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.memoryErasureExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Dark Empowerment
"${ANNOTATED_EXAMPLES.darkEmpowermentExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.darkEmpowermentExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Physical Decay As Trauma
"${ANNOTATED_EXAMPLES.physicalDecayAsTraumaExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.physicalDecayAsTraumaExample.annotations.map(a => `- ${a}`).join('\n')}

## ANNOTATED EXAMPLE: Victim Humanization
"${ANNOTATED_EXAMPLES.victimHumanizationExample.passage}"

WHY THIS WORKS:
${ANNOTATED_EXAMPLES.victimHumanizationExample.annotations.map(a => `- ${a}`).join('\n')}

---

## WHAT NOT TO WRITE - NEGATIVE EXAMPLES

### BAD: Telling Instead of Showing
"${NEGATIVE_EXAMPLES.tellDontShow.badVersion}"

PROBLEMS:
${NEGATIVE_EXAMPLES.tellDontShow.problems.map(p => `- ${p}`).join('\n')}

### GOOD VERSION:
"${NEGATIVE_EXAMPLES.tellDontShow.goodVersion}"

---

### BAD: Overwritten Dialogue
"${NEGATIVE_EXAMPLES.overwrittenDialogue.badVersion}"

PROBLEMS:
${NEGATIVE_EXAMPLES.overwrittenDialogue.problems.map(p => `- ${p}`).join('\n')}

### GOOD VERSION:
"${NEGATIVE_EXAMPLES.overwrittenDialogue.goodVersion}"

---

### BAD: Flat Pacing
"${NEGATIVE_EXAMPLES.flatPacing.badVersion}"

PROBLEMS:
${NEGATIVE_EXAMPLES.flatPacing.problems.map(p => `- ${p}`).join('\n')}

### GOOD VERSION:
"${NEGATIVE_EXAMPLES.flatPacing.goodVersion}"

---

### BAD: Heavy Foreshadowing
"${NEGATIVE_EXAMPLES.heavyForeshadowing.badVersion}"

PROBLEMS:
${NEGATIVE_EXAMPLES.heavyForeshadowing.problems.map(p => `- ${p}`).join('\n')}

### GOOD VERSION:
"${NEGATIVE_EXAMPLES.heavyForeshadowing.goodVersion}"
`;
};

// ============================================================================
// VOICE DNA - Character-specific speech patterns
// ============================================================================
const buildVoiceDNASection = (charactersInScene = []) => {
  const { VOICE_DNA } = require('../data/characterReference');

  // Always include Jack's voice
  const voicesToInclude = ['jack'];

  // Add any other characters specified
  charactersInScene.forEach(char => {
    const normalizedChar = char.toLowerCase();
    if (normalizedChar.includes('victoria') || normalizedChar.includes('emily')) {
      voicesToInclude.push('victoria');
    } else if (normalizedChar.includes('sarah')) {
      voicesToInclude.push('sarah');
    } else if (normalizedChar.includes('tom') || normalizedChar.includes('wade')) {
      voicesToInclude.push('tomWade');
    } else if (normalizedChar.includes('eleanor')) {
      voicesToInclude.push('eleanor');
    } else if (normalizedChar.includes('claire')) {
      voicesToInclude.push('claire');
    }
  });

  // Deduplicate
  const uniqueVoices = [...new Set(voicesToInclude)];

  let voiceSection = `
## CHARACTER VOICE DNA
Use these patterns to maintain consistent character voices:

`;

  uniqueVoices.forEach(voiceKey => {
    const voice = VOICE_DNA[voiceKey];
    if (!voice) return;

    voiceSection += `### ${voice.name}
**Sentence Patterns:**
${voice.sentencePatterns.map(p => `- ${p}`).join('\n')}

**Vocabulary Tendencies:**
${voice.vocabularyTendencies.map(v => `- ${v}`).join('\n')}

**Physical Tells:**
${voice.physicalTells.map(t => `- ${t}`).join('\n')}

**Dialogue Rhythm:**
${voice.dialogueRhythm.map(r => `- ${r}`).join('\n')}

`;
  });

  return voiceSection;
};

// ============================================================================
// DRAMATIC IRONY SECTION - What the reader knows that Jack doesn't
// ============================================================================
const buildDramaticIronySection = (chapter, pathKey, choiceHistory = []) => {
  const ironies = [];

  // Victoria = Emily irony (revealed progressively)
  if (chapter <= 8) {
    ironies.push({
      secret: 'Victoria Blackwell is Emily Cross, the woman Jack declared dead 7 years ago',
      jackKnows: chapter < 6 ? 'Jack knows Victoria as a mysterious benefactor/adversary' :
        'Jack suspects Victoria has a personal connection to his past cases',
      readerKnows: 'The reader knows Victoria IS Emily, the woman Jack failed to save',
      useFor: 'Write scenes where Victoria drops hints Jack misses. Let readers cringe at his obliviousness.',
    });
  }

  // Tom's betrayal irony (early chapters)
  if (chapter <= 5) {
    ironies.push({
      secret: 'Tom Wade has been manufacturing evidence for 20 years',
      jackKnows: 'Jack trusts Tom completely as his best friend of 30 years',
      readerKnows: 'From Chapter 1 hints, readers suspect Tom is not what he seems',
      useFor: 'Write scenes where Jack relies on Tom or speaks fondly of their friendship. Maximum dramatic tension.',
    });
  }

  // Grange as predator (mid chapters)
  if (chapter >= 4 && chapter <= 9) {
    ironies.push({
      secret: 'Deputy Chief Grange is a serial kidnapper with 23 victims',
      jackKnows: chapter < 7 ? 'Jack sees Grange as a political obstacle or suspicious figure' :
        'Jack knows Grange is dangerous but not the full extent',
      readerKnows: 'Readers understand the scope of Grange\'s evil from earlier revelations',
      useFor: 'When Jack encounters Grange, let readers feel the danger Jack doesn\'t fully grasp.',
    });
  }

  if (ironies.length === 0) {
    return '';
  }

  let section = `
## DRAMATIC IRONY - LEVERAGE WHAT THE READER KNOWS

The reader knows things Jack doesn't. USE THIS for tension:

`;

  ironies.forEach(irony => {
    section += `### ${irony.secret}
- **What Jack knows:** ${irony.jackKnows}
- **What the reader knows:** ${irony.readerKnows}
- **Use for:** ${irony.useFor}

`;
  });

  section += `Write scenes that let readers CRINGE at Jack's ignorance. Let them see the trap closing. The tension between what we know and what Jack knows is incredibly powerful.`;

  return section;
};

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

    // ========== NEW: Fallback Content System for Graceful Degradation ==========
    this.fallbackTemplates = this._initializeFallbackTemplates();
    // Normalize fallback templates to third-person limited narration (dialogue may remain first-person).
    // This prevents immersion breaks if a template accidentally includes first-person narration.
    this._normalizeFallbackTemplatesToThirdPerson();
    this.generationAttempts = new Map(); // Track retry attempts per content
    this.maxGenerationAttempts = 3; // Max attempts before using fallback

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
    this.staticCacheVersion = 2; // Increment when static content changes
  }

  // ==========================================================================
  // TOKEN USAGE TRACKING - Monitor costs and efficiency
  // ==========================================================================

  /**
   * Log and track token usage from an LLM response
   * Provides prominent console logging and cumulative tracking for cost visibility
   * @param {Object} usage - Token usage object from LLM response
   * @param {string} context - Context string for the log (e.g., "Chapter 2.A")
   */
  _trackTokenUsage(usage, context) {
    if (!usage) return;

    const promptTokens = usage.promptTokens || 0;
    const cachedTokens = usage.cachedTokens || 0;
    const completionTokens = usage.completionTokens || 0;
    const totalTokens = usage.totalTokens || (promptTokens + completionTokens);

    // Update cumulative totals
    this.tokenUsage.totalPromptTokens += promptTokens;
    this.tokenUsage.totalCachedTokens += cachedTokens;
    this.tokenUsage.totalCompletionTokens += completionTokens;
    this.tokenUsage.totalTokens += totalTokens;
    this.tokenUsage.callCount += 1;

    // Calculate cache efficiency (percentage of prompt tokens that were cached)
    const cacheEfficiency = promptTokens > 0 ? Math.round((cachedTokens / promptTokens) * 100) : 0;

    // Estimate cost (Gemini 3 Flash pricing: $0.10/1M input, $0.40/1M output, 50% discount on cached)
    // Source: https://ai.google.dev/pricing
    const inputCost = ((promptTokens - cachedTokens) * 0.10 / 1000000) + (cachedTokens * 0.05 / 1000000);
    const outputCost = completionTokens * 0.40 / 1000000;
    const callCost = inputCost + outputCost;

    // Cumulative cost
    const cumulativeInputCost = ((this.tokenUsage.totalPromptTokens - this.tokenUsage.totalCachedTokens) * 0.10 / 1000000) +
                                (this.tokenUsage.totalCachedTokens * 0.05 / 1000000);
    const cumulativeOutputCost = this.tokenUsage.totalCompletionTokens * 0.40 / 1000000;
    const cumulativeCost = cumulativeInputCost + cumulativeOutputCost;

    // Session duration
    const sessionMinutes = Math.round((Date.now() - this.tokenUsage.sessionStart) / 60000);

    // Prominent console logging
    console.log(`[StoryGen] 📊 Token Usage for ${context}:`);
    console.log(`  Input: ${promptTokens.toLocaleString()} tokens (${cachedTokens.toLocaleString()} cached = ${cacheEfficiency}% cache hit)`);
    console.log(`  Output: ${completionTokens.toLocaleString()} tokens`);
    console.log(`  Cost: $${callCost.toFixed(4)} (session total: $${cumulativeCost.toFixed(4)} across ${this.tokenUsage.callCount} calls, ${sessionMinutes}min)`);
  }

  /**
   * Get current token usage statistics
   * @returns {Object} Token usage stats with cost estimates
   */
  getTokenUsageStats() {
    const cumulativeInputCost = ((this.tokenUsage.totalPromptTokens - this.tokenUsage.totalCachedTokens) * 0.10 / 1000000) +
                                (this.tokenUsage.totalCachedTokens * 0.05 / 1000000);
    const cumulativeOutputCost = this.tokenUsage.totalCompletionTokens * 0.40 / 1000000;
    const sessionMinutes = Math.round((Date.now() - this.tokenUsage.sessionStart) / 60000);

    return {
      ...this.tokenUsage,
      estimatedCost: cumulativeInputCost + cumulativeOutputCost,
      cacheEfficiency: this.tokenUsage.totalPromptTokens > 0
        ? Math.round((this.tokenUsage.totalCachedTokens / this.tokenUsage.totalPromptTokens) * 100)
        : 0,
      sessionDurationMinutes: sessionMinutes,
    };
  }

  // ==========================================================================
  // DYNAMIC PERSONALITY CLASSIFICATION - LLM-based player behavior analysis
  // ==========================================================================

  /**
   * Generate a hash of choice history for cache invalidation
   * @param {Array} choiceHistory - Player's choice history
   * @returns {string} Hash string
   */
  _hashChoiceHistory(choiceHistory) {
    if (!choiceHistory || choiceHistory.length === 0) return 'empty';
    return choiceHistory.map(c => `${c.caseNumber}:${c.optionKey}`).join('|');
  }

  /**
   * Dynamically classify player personality using LLM
   * Uses Gemini to analyze actual choice patterns and provide richer personality assessment
   * Falls back to keyword-based analysis if LLM fails
   * @param {Array} choiceHistory - Player's choice history
   * @returns {Promise<Object>} Personality classification with narrativeStyle, dialogueTone, riskTolerance
   */
  async _classifyPersonalityDynamic(choiceHistory) {
    // If no choices yet, return balanced default
    if (!choiceHistory || choiceHistory.length === 0) {
      return {
        ...PATH_PERSONALITY_TRAITS.BALANCED,
        source: 'default',
      };
    }

    // Check cache - if choice history hasn't changed, use cached result
    const currentHash = this._hashChoiceHistory(choiceHistory);
    if (this.dynamicPersonalityCache.choiceHistoryHash === currentHash &&
        this.dynamicPersonalityCache.personality) {
      console.log(`[StoryGen] 🧠 Using cached personality classification`);
      return this.dynamicPersonalityCache.personality;
    }

    console.log(`[StoryGen] 🧠 Classifying player personality dynamically (${choiceHistory.length} choices)...`);

    try {
      // Build choice summary for LLM
      const choiceSummary = choiceHistory.map(choice => {
        const chapter = this._extractChapterFromCase(choice.caseNumber);
        const consequence = DECISION_CONSEQUENCES[choice.caseNumber]?.[choice.optionKey];
        return {
          chapter,
          choice: choice.optionKey,
          description: consequence?.immediate || `Chose option ${choice.optionKey}`,
        };
      });

      const classificationPrompt = `Analyze this player's decision pattern in a noir detective mystery game and classify their play style.

PLAYER'S CHOICES:
${choiceSummary.map(c => `- Chapter ${c.chapter}: ${c.description}`).join('\n')}

Based on these choices, classify the player's approach. Consider:
- Do they prefer direct confrontation or careful investigation?
- Are they impulsive or methodical?
- Do they prioritize speed or thoroughness?
- What's their relationship-building style (trust quickly vs. verify)?

Respond with a JSON object containing:
- "dominantStyle": one of "AGGRESSIVE", "METHODICAL", or "BALANCED"
- "narrativeStyle": a sentence describing how Jack (the protagonist) acts based on this play style
- "dialogueTone": how Jack's dialogue should sound (e.g., "direct and confrontational", "measured and analytical", "adaptable")
- "riskTolerance": "high", "moderate", or "low"
- "characterInsight": a brief observation about this player's detective persona (1 sentence)`;

      const response = await llmService.complete(
        [{ role: 'user', content: classificationPrompt }],
        {
          systemPrompt: 'You are an expert at analyzing player behavior in narrative games. Provide concise, insightful classifications.',
          maxTokens: 1000, // Increased from 500 - thinking tokens consume budget even at 'low' level
          responseSchema: {
            type: 'object',
            properties: {
              dominantStyle: { type: 'string', enum: ['AGGRESSIVE', 'METHODICAL', 'BALANCED'] },
              narrativeStyle: { type: 'string' },
              dialogueTone: { type: 'string' },
              riskTolerance: { type: 'string', enum: ['high', 'moderate', 'low'] },
              characterInsight: { type: 'string' },
            },
            required: ['dominantStyle', 'narrativeStyle', 'dialogueTone', 'riskTolerance'],
          },
          traceId: `personality-${Date.now()}`,
          thinkingLevel: 'low', // Quick classification, don't need deep reasoning
        }
      );

      // Track token usage
      this._trackTokenUsage(response?.usage, 'Personality classification');

      // Parse response
      let classification;
      try {
        classification = typeof response.content === 'string'
          ? JSON.parse(response.content)
          : response.content;
      } catch (parseErr) {
        console.warn(`[StoryGen] ⚠️ Failed to parse personality classification, using fallback`);
        const fallback = this._analyzePathPersonality(choiceHistory);
        return { ...fallback, source: 'keyword-fallback' };
      }

      // Build personality object
      const personality = {
        narrativeStyle: classification.narrativeStyle || PATH_PERSONALITY_TRAITS.BALANCED.narrativeStyle,
        dialogueTone: classification.dialogueTone || PATH_PERSONALITY_TRAITS.BALANCED.dialogueTone || 'adapts to the situation',
        riskTolerance: classification.riskTolerance || 'moderate',
        dominantStyle: classification.dominantStyle || 'BALANCED',
        characterInsight: classification.characterInsight || null,
        source: 'llm-dynamic',
      };

      // Cache the result
      this.dynamicPersonalityCache = {
        choiceHistoryHash: currentHash,
        personality,
        timestamp: Date.now(),
      };

      console.log(`[StoryGen] 🧠 Personality classified: ${personality.dominantStyle} - "${personality.narrativeStyle}"`);
      if (personality.characterInsight) {
        console.log(`[StoryGen] 💡 Insight: ${personality.characterInsight}`);
      }

      return personality;

    } catch (error) {
      console.warn(`[StoryGen] ⚠️ Dynamic personality classification failed:`, error.message);
      console.warn(`[StoryGen] Falling back to keyword-based analysis`);

      // Fall back to keyword-based analysis
      const fallback = this._analyzePathPersonality(choiceHistory);
      return { ...fallback, source: 'keyword-fallback' };
    }
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
      branchingNarrative: null, // Fallback doesn't support branching - uses linear narrative
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
      branchingNarrative: null, // Fallback doesn't support branching - uses linear narrative
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
      branchingNarrative: null, // Fallback doesn't support branching - uses linear narrative
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
   *
   * PERSONALITY DRIFT HANDLING:
   * If the player's personality has shifted significantly since the arc was created,
   * we adapt the remaining (unplayed) chapters rather than fully regenerating.
   * This preserves narrative continuity while allowing the story to evolve with the player.
   */
  async ensureStoryArc(choiceHistory = []) {
    const currentPersonality = this._analyzePathPersonality(choiceHistory);
    const superPathKey = this._getSuperPathKey(choiceHistory);
    const arcKey = `arc_${superPathKey}`;

    // If we have an existing arc, check for personality drift
    if (this.storyArc) {
      const drift = this._detectPersonalityDrift(this.storyArc, currentPersonality, choiceHistory);

      if (drift.shouldAdapt) {
        console.log(`[StoryGenerationService] Personality drift detected: ${drift.from} -> ${drift.to} (magnitude: ${drift.magnitude.toFixed(1)})`);

        // Adapt the arc for the new personality (only future chapters)
        const currentChapter = Math.max(2, choiceHistory.length + 2); // Estimate current chapter
        const adaptedArc = await this._adaptStoryArcForDrift(this.storyArc, currentPersonality, currentChapter, choiceHistory);
        this.storyArc = adaptedArc;
        await this._saveStoryArc(adaptedArc.key, adaptedArc);
        return adaptedArc;
      }

      // No significant drift, return existing arc
      if (this.storyArc.key === arcKey) {
        return this.storyArc;
      }
    }

    // Check persistent storage
    const savedArc = await this._loadStoryArc(arcKey);
    if (savedArc) {
      // Check for drift against saved arc too
      const drift = this._detectPersonalityDrift(savedArc, currentPersonality, choiceHistory);
      if (drift.shouldAdapt) {
        console.log(`[StoryGenerationService] Personality drift from saved arc: ${drift.from} -> ${drift.to}`);
        const currentChapter = Math.max(2, choiceHistory.length + 2);
        const adaptedArc = await this._adaptStoryArcForDrift(savedArc, currentPersonality, currentChapter, choiceHistory);
        this.storyArc = adaptedArc;
        await this._saveStoryArc(adaptedArc.key, adaptedArc);
        return adaptedArc;
      }

      this.storyArc = savedArc;
      return savedArc;
    }

    // OPTIMIZATION: Skip LLM call for story arc generation.
    // The storyBible.js already contains comprehensive chapter guidance via STORY_STRUCTURE.
    // Using static fallback eliminates ~22s LLM call per path while maintaining narrative quality.
    console.log('[StoryGenerationService] Using static story arc for super-path:', superPathKey);
    const fallbackArc = this._createFallbackStoryArc(superPathKey, choiceHistory);
    fallbackArc.personalitySnapshot = {
      riskTolerance: currentPersonality.riskTolerance,
      scores: currentPersonality.scores || { aggressive: 0, methodical: 0 },
      choiceCount: choiceHistory.length,
    };
    this.storyArc = fallbackArc;
    await this._saveStoryArc(arcKey, fallbackArc);
    return fallbackArc;
  }

  /**
   * Detect if player personality has drifted significantly from when the arc was created.
   *
   * Drift is significant when:
   * 1. Risk tolerance category has changed (low->high, high->low, or to/from moderate)
   * 2. Score magnitude has shifted by more than 20 points
   * 3. At least 2 new decisions have been made since arc creation
   */
  _detectPersonalityDrift(arc, currentPersonality, choiceHistory) {
    const snapshot = arc.personalitySnapshot;

    // No snapshot means old arc format - can't detect drift
    if (!snapshot) {
      return { shouldAdapt: false, magnitude: 0 };
    }

    const currentScores = currentPersonality.scores || { aggressive: 0, methodical: 0 };
    const snapshotScores = snapshot.scores || { aggressive: 0, methodical: 0 };

    // Calculate score drift magnitude
    const aggressiveDrift = currentScores.aggressive - snapshotScores.aggressive;
    const methodicalDrift = currentScores.methodical - snapshotScores.methodical;
    const magnitude = Math.abs(aggressiveDrift - methodicalDrift);

    // Check if risk tolerance category changed
    const categoryChanged = snapshot.riskTolerance !== currentPersonality.riskTolerance;

    // Require at least 2 new decisions to consider adaptation
    const newDecisions = choiceHistory.length - (snapshot.choiceCount || 0);
    const hasEnoughNewDecisions = newDecisions >= 2;

    // Determine if we should adapt
    // Threshold: category change OR significant score drift (>25 points)
    const significantDrift = magnitude > 25;
    const shouldAdapt = hasEnoughNewDecisions && (categoryChanged || significantDrift);

    return {
      shouldAdapt,
      magnitude,
      from: snapshot.riskTolerance,
      to: currentPersonality.riskTolerance,
      categoryChanged,
      newDecisions,
      aggressiveDrift,
      methodicalDrift,
    };
  }

  /**
   * Adapt the story arc for a personality shift without regenerating played chapters.
   *
   * This preserves:
   * - Chapter arcs that have already been played
   * - Core consistency anchors
   * - Character arc foundations
   *
   * This adapts:
   * - Future chapter focuses and tension levels
   * - Decision themes for upcoming choices
   * - Overall theme evolution
   */
  async _adaptStoryArcForDrift(originalArc, newPersonality, currentChapter, choiceHistory) {
    const newSuperPathKey = this._getSuperPathKey(choiceHistory);

    // Start with the original arc
    const adaptedArc = {
      ...originalArc,
      key: `arc_${newSuperPathKey}`,
      superPathKey: newSuperPathKey,
      previousSuperPathKey: originalArc.superPathKey,
      adaptedAt: new Date().toISOString(),
      adaptedFromChapter: currentChapter,
      personalitySnapshot: {
        riskTolerance: newPersonality.riskTolerance,
        scores: newPersonality.scores || { aggressive: 0, methodical: 0 },
        choiceCount: choiceHistory.length,
      },
    };

    // Adapt the overall theme to reflect personality evolution
    adaptedArc.overallTheme = this._adaptThemeForPersonality(
      originalArc.overallTheme,
      originalArc.superPathKey,
      newSuperPathKey
    );

    // Adapt future chapter arcs (preserve played chapters)
    if (adaptedArc.chapterArcs && Array.isArray(adaptedArc.chapterArcs)) {
      adaptedArc.chapterArcs = adaptedArc.chapterArcs.map(chapterArc => {
        // Don't modify chapters already played
        if (chapterArc.chapter < currentChapter) {
          return chapterArc;
        }

        // Adapt future chapters for new personality
        return this._adaptChapterArcForPersonality(chapterArc, newPersonality, originalArc.superPathKey);
      });
    }

    // Update character arcs to reflect evolution
    if (adaptedArc.characterArcs) {
      adaptedArc.characterArcs = {
        ...adaptedArc.characterArcs,
        jack: this._adaptJackArcForPersonality(
          adaptedArc.characterArcs.jack,
          newPersonality,
          currentChapter
        ),
      };
    }

    console.log(`[StoryGenerationService] Arc adapted: ${originalArc.superPathKey} -> ${newSuperPathKey} (from chapter ${currentChapter})`);

    return adaptedArc;
  }

  /**
   * Adapt the overall theme when personality shifts
   */
  _adaptThemeForPersonality(originalTheme, oldPath, newPath) {
    // If shifting to aggressive, emphasize action and confrontation
    if (newPath === 'AGGRESSIVE' && oldPath !== 'AGGRESSIVE') {
      if (originalTheme.includes('patient') || originalTheme.includes('investigation')) {
        return originalTheme.replace(
          /patient investigation|careful investigation|truth-seeking/gi,
          'decisive action and hard truths'
        );
      }
      return `${originalTheme}, now driven by urgency and confrontation`;
    }

    // If shifting to methodical, emphasize evidence and patience
    if (newPath === 'METHODICAL' && oldPath !== 'METHODICAL') {
      if (originalTheme.includes('action') || originalTheme.includes('confrontation')) {
        return originalTheme.replace(
          /decisive action|confrontation|urgency/gi,
          'methodical truth-seeking'
        );
      }
      return `${originalTheme}, tempered by careful investigation`;
    }

    // Shifting to balanced
    if (newPath === 'BALANCED') {
      return `${originalTheme}, adapting approach as circumstances demand`;
    }

    return originalTheme;
  }

  /**
   * Adapt a single chapter arc for the new personality
   */
  _adaptChapterArcForPersonality(chapterArc, newPersonality, oldPath) {
    const adapted = { ...chapterArc };

    // Adjust tension levels based on personality
    if (newPersonality.riskTolerance === 'high') {
      // Aggressive players: higher tension, more confrontational focuses
      adapted.tensionLevel = Math.min(10, (chapterArc.tensionLevel || 5) + 1);
      if (adapted.decisionTheme) {
        adapted.decisionTheme = adapted.decisionTheme.replace(
          /wait|gather|investigate carefully/gi,
          'act decisively'
        );
      }
    } else if (newPersonality.riskTolerance === 'low') {
      // Methodical players: slightly lower tension, more investigation focus
      adapted.tensionLevel = Math.max(1, (chapterArc.tensionLevel || 5) - 1);
      if (adapted.decisionTheme) {
        adapted.decisionTheme = adapted.decisionTheme.replace(
          /confront|attack|force/gi,
          'investigate thoroughly'
        );
      }
    }

    // Add personality adaptation note
    adapted.personalityAdapted = true;
    adapted.adaptedForPath = newPersonality.riskTolerance;

    return adapted;
  }

  /**
   * Adapt Jack's character arc description for personality evolution
   */
  _adaptJackArcForPersonality(originalJackArc, newPersonality, currentChapter) {
    const phaseDescriptor = currentChapter <= 4 ? 'early' :
                            currentChapter <= 7 ? 'mid-story' :
                            currentChapter <= 10 ? 'late' : 'final';

    if (newPersonality.riskTolerance === 'high') {
      return `${originalJackArc}. In the ${phaseDescriptor} chapters, Jack's patience wears thin and he pushes harder for answers.`;
    } else if (newPersonality.riskTolerance === 'low') {
      return `${originalJackArc}. In the ${phaseDescriptor} chapters, Jack becomes more deliberate, building his case methodically.`;
    }

    return `${originalJackArc}. In the ${phaseDescriptor} chapters, Jack adapts his approach to the situation at hand.`;
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
6. CRITICAL: Defines what Jack PERSONALLY STANDS TO LOSE in each chapter
7. CRITICAL: Includes an EMOTIONAL ANCHOR moment for each chapter

## STORY PHASES
- Chapters 2-4: RISING ACTION (investigating, uncovering clues)
  * Personal stakes focus: Jack's self-image and reputation
- Chapters 5-7: COMPLICATIONS (betrayals revealed, stakes escalate)
  * Personal stakes focus: Jack's relationships (Sarah, sense of purpose)
- Chapters 8-10: CONFRONTATIONS (major revelations, direct confrontations)
  * Personal stakes focus: Jack's freedom and physical safety
- Chapters 11-12: RESOLUTION (final confrontation, consequences manifest)
  * Personal stakes focus: Jack's redemption and legacy

## FIVE INNOCENTS TO WEAVE IN
1. Eleanor Bellamy - wrongly convicted of husband's murder (8 years in Greystone)
2. Marcus Thornhill - framed for embezzlement (committed suicide)
3. Dr. Lisa Chen - reported evidence tampering (career destroyed)
4. James Sullivan - details revealed progressively
5. Teresa Wade - Tom Wade's own daughter (convicted using his methods)

## ENGAGEMENT REQUIREMENTS FOR EACH CHAPTER
For each chapter, you MUST provide:
1. **personalStakes**: What Jack personally loses if he fails THIS chapter. Be viscerally specific.
   - NOT "his reputation" → "the last colleague who still respects him"
   - NOT "his safety" → "the ability to walk into Murphy's without checking the door"
2. **emotionalAnchor**: The gut-punch moment for this chapter. Not plot, but FEELING.
   - A face, a memory, a realization that hits the reader in the chest
   - Examples: "Seeing Eleanor's hands aged from prison labor", "Reading his own signature on the warrant that destroyed Marcus"
3. **microRevelationHint**: What small truth should be revealed in each subchapter

Provide a structured arc ensuring each innocent's story gets proper attention and EVERY chapter has personal stakes that escalate.`;

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
              personalStakes: { type: 'string', description: 'What Jack personally stands to lose in this chapter. Be viscerally specific: Ch2-4=self-image/reputation, Ch5-7=relationships, Ch8-10=freedom/safety, Ch11-12=redemption/legacy' },
              emotionalAnchor: { type: 'string', description: 'The gut-punch emotional moment for this chapter. Not plot, but FEELING.' },
              microRevelationHint: { type: 'string', description: 'The small truth that should be revealed in each subchapter of this chapter' },
            },
            required: ['chapter', 'phase', 'primaryFocus', 'tensionLevel', 'endingHook', 'personalStakes'],
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
        { chapter: 2, phase: 'RISING_ACTION', primaryFocus: 'First innocent discovered', tensionLevel: 4, endingHook: 'A new lead emerges', personalStakes: 'Jack\'s belief that he was a good detective - the foundation of his self-image', emotionalAnchor: 'Seeing the first victim\'s face and knowing he put them there' },
        { chapter: 3, phase: 'RISING_ACTION', primaryFocus: 'Evidence of conspiracy', tensionLevel: 5, endingHook: 'Trust begins to fracture', personalStakes: 'Jack\'s reputation among the people who still respect him', emotionalAnchor: 'A former colleague looking at him differently' },
        { chapter: 4, phase: 'RISING_ACTION', primaryFocus: 'Second innocent revealed', tensionLevel: 5, endingHook: 'The pattern becomes clear', personalStakes: 'The last shred of certainty Jack has about his career', emotionalAnchor: 'Reading a case file he was proud of and seeing the lies in it' },
        { chapter: 5, phase: 'COMPLICATIONS', primaryFocus: 'Betrayal discovered', tensionLevel: 6, endingHook: 'An ally becomes suspect', personalStakes: 'Sarah\'s trust - the last real partnership Jack has left', emotionalAnchor: 'Sarah\'s silence when she should defend him' },
        { chapter: 6, phase: 'COMPLICATIONS', primaryFocus: 'Third innocent confronted', tensionLevel: 7, endingHook: 'Stakes escalate dramatically', personalStakes: 'Jack\'s sense of purpose - what is he if not a detective?', emotionalAnchor: 'Looking in a mirror and not recognizing the man looking back' },
        { chapter: 7, phase: 'COMPLICATIONS', primaryFocus: 'The web tightens', tensionLevel: 7, endingHook: 'No one can be trusted', personalStakes: 'The last relationship that still matters - Tom or Sarah', emotionalAnchor: 'Realizing someone he trusted has been lying to him' },
        { chapter: 8, phase: 'CONFRONTATIONS', primaryFocus: 'Major revelation', tensionLevel: 8, endingHook: 'The truth emerges', personalStakes: 'Jack\'s physical safety - they\'re coming for him now', emotionalAnchor: 'The moment he realizes he might not survive this' },
        { chapter: 9, phase: 'CONFRONTATIONS', primaryFocus: 'Fourth innocent found', tensionLevel: 8, endingHook: 'Confrontation looms', personalStakes: 'Jack\'s freedom - arrest warrant or worse', emotionalAnchor: 'Becoming the thing he spent his career hunting' },
        { chapter: 10, phase: 'CONFRONTATIONS', primaryFocus: 'Final pieces fall', tensionLevel: 9, endingHook: 'The mastermind revealed', personalStakes: 'Jack\'s life - they will kill him if he continues', emotionalAnchor: 'Choosing to continue knowing he might die' },
        { chapter: 11, phase: 'RESOLUTION', primaryFocus: 'Final confrontation', tensionLevel: 10, endingHook: 'Justice or vengeance', personalStakes: 'Jack\'s chance at redemption - this is his last opportunity to make things right', emotionalAnchor: 'Facing Victoria/Emily and understanding what he cost her' },
        { chapter: 12, phase: 'RESOLUTION', primaryFocus: 'Consequences manifest', tensionLevel: 9, endingHook: 'The story concludes', personalStakes: 'Jack\'s legacy - how will he be remembered?', emotionalAnchor: 'The faces of everyone he failed, and the question of whether he\'s made it right' },
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

    // OPTIMIZATION: Skip LLM call for chapter outline generation.
    // The storyBible.js already contains comprehensive chapter guidance via STORY_STRUCTURE.chapterBeatTypes.
    // Using static fallback eliminates ~10s LLM call per chapter while maintaining narrative structure.
    console.log(`[StoryGenerationService] Using static chapter outline for Chapter ${chapter}`);
    const fallbackOutline = this._createFallbackChapterOutline(chapter, chapterPathKey);
    this.chapterOutlines.set(outlineKey, fallbackOutline);
    return fallbackOutline;
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
      // Handle both legacy (decision) and new (pathDecisions) formats
      // For pathDecisions, use canonical path 1A-2A since Option A/B are consistent across paths
      const decisionData = decisionEntry?.pathDecisions?.['1A-2A'] || decisionEntry?.decision;
      const chosen = decisionData?.options?.find((o) => o.key === choice.optionKey) || null;

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
    // Handle both legacy (decision) and new (pathDecisions) formats
    // Use canonical path 1A-2A for consequence generation since Option A/B are consistent across paths
    const decisionData = decisionEntry?.pathDecisions?.['1A-2A'] || decisionEntry?.decision;
    const decisionContext = decisionData?.options?.find(o => o.key === choice.optionKey);
    const otherOption = decisionData?.options?.find(o => o.key !== choice.optionKey);

    // Extract narrative context for richer consequence generation
    const narrativeContext = decisionEntry?.narrative ? decisionEntry.narrative.slice(-2000) : '';
    const decisionIntro = decisionData?.intro?.[0] || '';
    const activeThreads = (
      decisionEntry?.consistencyFacts ||
      this._getRelevantPersistedConsistencyFacts(decisionPathKey) ||
      []
    ).slice(0, 5);
    const charactersInvolved = decisionData?.options?.flatMap(o => o.characters || []) || [];

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
          maxTokens: 1000, // Increased from 500 - thinking tokens consume budget
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

          // Handle both legacy (decision) and new (pathDecisions) formats
          const decisionData = decisionEntry?.pathDecisions?.['1A-2A'] || decisionEntry?.decision;
          const opt =
            decisionData?.options?.find((o) => o?.key === choice.optionKey) ||
            (choice.optionKey === 'A' ? decisionData?.optionA : decisionData?.optionB) ||
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

    // Track normalized IDs of threads that have been resolved/failed.
    // This prevents regex fallback from resurrecting them as "zombie threads".
    const resolvedThreadIds = new Set();

    // First priority: Use LLM-generated structured threads
    chapters.forEach(ch => {
      if (ch.narrativeThreads && Array.isArray(ch.narrativeThreads)) {
        ch.narrativeThreads.forEach(thread => {
          const type = thread?.type;
          const desc = thread?.description;
          const status = thread?.status;
          if (!type || !desc) return;

          const key = `${type}:${desc}`.toLowerCase();

          // Track resolved/failed threads to prevent regex resurrection
          if (status === 'resolved' || status === 'failed') {
            const normalizedId = this._normalizeThreadId(thread);
            if (normalizedId) {
              resolvedThreadIds.add(normalizedId);
            }
          }

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

            // Build candidate to check its normalized ID against resolved threads
            const candidate = { type, description: excerpt };
            const normalizedId = this._normalizeThreadId(candidate);

            // Only add if not a duplicate AND not previously resolved (zombie prevention)
            const isResolved = normalizedId && resolvedThreadIds.has(normalizedId);
            if (!seenDescriptions.has(key) && !isResolved) {
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
      this.dynamicPersonalityCache = { choiceHistoryHash: null, personality: null, timestamp: null };
      this.tokenUsage = { totalPromptTokens: 0, totalCachedTokens: 0, totalCompletionTokens: 0, totalTokens: 0, callCount: 0, sessionStart: Date.now() };
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
    this.dynamicPersonalityCache = { choiceHistoryHash: null, personality: null, timestamp: null };
    this.tokenUsage = { totalPromptTokens: 0, totalCachedTokens: 0, totalCompletionTokens: 0, totalTokens: 0, callCount: 0, sessionStart: Date.now() };
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
   *
   * @param {number} targetChapter - Chapter to generate
   * @param {number} targetSubchapter - Subchapter to generate
   * @param {string} pathKey - Path key for branching
   * @param {Array} choiceHistory - Chapter-level decision history
   * @param {Array} branchingChoices - Intra-subchapter branching choices for true infinite branching
   */
  async buildStoryContext(targetChapter, targetSubchapter, pathKey, choiceHistory = [], branchingChoices = []) {
    // Ensure service is initialized and has loaded story from storage
    if (!this.generatedStory) {
      console.log('[StoryGenerationService] Service not initialized, loading story from storage...');
      await this.init();
    }

    // Analyze player's path personality for narrative consistency
    // Use dynamic LLM-based classification for richer personality insights
    // Falls back to keyword-based analysis if LLM fails
    let pathPersonality;
    try {
      pathPersonality = await this._classifyPersonalityDynamic(choiceHistory);
    } catch (error) {
      console.warn('[StoryGenerationService] Dynamic personality classification failed, using keyword fallback');
      pathPersonality = this._analyzePathPersonality(choiceHistory);
    }
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
    // IMPORTANT: Use realized narrative (player's actual path) when branching choices exist
    for (let ch = 2; ch < targetChapter; ch++) {
      const chapterPathKey = this._getPathKeyForChapter(ch, choiceHistory);
      for (let sub = 1; sub <= SUBCHAPTERS_PER_CHAPTER; sub++) {
        const caseNum = formatCaseNumber(ch, sub);
        // Use async method to ensure entries are loaded from storage
        const entry = await this.getGeneratedEntryAsync(caseNum, chapterPathKey);
        if (entry) {
          // Check if we have branching choices for this case - use REALIZED narrative
          const branchingChoice = branchingChoices.find(bc => bc.caseNumber === caseNum);
          let narrativeText = entry.narrative; // Default to canonical

          if (branchingChoice && entry.branchingNarrative) {
            // Build the ACTUAL narrative the player experienced
            narrativeText = buildRealizedNarrative(
              entry.branchingNarrative,
              branchingChoice.firstChoice,
              branchingChoice.secondChoice
            );
            console.log(`[StoryGenerationService] Using realized narrative for ${caseNum}: path ${branchingChoice.firstChoice}-${branchingChoice.secondChoice}`);
          }

          if (narrativeText) {
            context.previousChapters.push({
              chapter: ch,
              subchapter: sub,
              pathKey: chapterPathKey,
              title: entry.title || `Chapter ${ch}.${sub}`,
              narrative: narrativeText, // REALIZED narrative from player's actual path
              chapterSummary: entry.chapterSummary || null,
              decision: entry.decision || null,
              branchingPath: branchingChoice ? `${branchingChoice.firstChoice}-${branchingChoice.secondChoice}` : null,
              isRecent: true, // Mark all as recent to include full text
            });
          }
        } else {
          console.warn(`[StoryGenerationService] Missing chapter ${ch}.${sub} (${caseNum}) for path ${chapterPathKey}`);
        }
      }
    }

    // Add current chapter's previous subchapters - FULL TEXT
    // IMPORTANT: Use realized narrative for player's actual experience
    if (targetSubchapter > 1) {
      for (let sub = 1; sub < targetSubchapter; sub++) {
        const caseNum = formatCaseNumber(targetChapter, sub);
        const entry = await this.getGeneratedEntryAsync(caseNum, pathKey);
        if (entry) {
          // Check if we have branching choices for this case - use REALIZED narrative
          const branchingChoice = branchingChoices.find(bc => bc.caseNumber === caseNum);
          let narrativeText = entry.narrative; // Default to canonical

          if (branchingChoice && entry.branchingNarrative) {
            // Build the ACTUAL narrative the player experienced
            narrativeText = buildRealizedNarrative(
              entry.branchingNarrative,
              branchingChoice.firstChoice,
              branchingChoice.secondChoice
            );
            console.log(`[StoryGenerationService] Using realized narrative for ${caseNum}: path ${branchingChoice.firstChoice}-${branchingChoice.secondChoice}`);
          }

          if (narrativeText) {
            context.previousChapters.push({
              chapter: targetChapter,
              subchapter: sub,
              pathKey,
              title: entry.title || `Chapter ${targetChapter}.${sub}`,
              narrative: narrativeText, // REALIZED narrative from player's actual path
              chapterSummary: entry.chapterSummary || null,
              decision: entry.decision || null,
              branchingPath: branchingChoice ? `${branchingChoice.firstChoice}-${branchingChoice.secondChoice}` : null,
              isRecent: true, // Current chapter always recent
            });
          }
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
      // Handle both legacy (decision) and new (pathDecisions) formats
      const decisionData = decisionEntry?.pathDecisions?.['1A-2A'] || decisionEntry?.decision;
      const chosenOption = decisionData?.options?.find((o) => o.key === last.optionKey) || null;
      const otherOption = decisionData?.options?.find((o) => o.key !== last.optionKey) || null;

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
   * Build extended style examples for cache (wrapper for buildExtendedStyleExamples)
   */
  _buildExtendedStyleExamplesForCache() {
    try {
      const examples = buildExtendedStyleExamples();
      // Verify content was actually built
      if (!examples || examples.length < 1000) {
        console.error('[StoryGenerationService] ⚠️ Extended style examples suspiciously short or empty!', {
          length: examples?.length || 0,
          expected: '5000+ chars',
        });
      } else {
        console.log(`[StoryGenerationService] ✅ Extended examples built: ${examples.length} chars`);
      }
      return examples;
    } catch (e) {
      console.error('[StoryGenerationService] ❌ FAILED to build extended style examples:', e.message);
      console.error('[StoryGenerationService] Stack:', e.stack);
      return '';
    }
  }

  /**
   * Build static content for caching (Story Bible, Characters, Craft Techniques, etc.)
   * This content doesn't change across requests and is perfect for caching.
   */
  _buildStaticCacheContent() {
    const parts = [];

    // Part 1: Story Bible Grounding (STATIC)
    const groundingSection = this._buildGroundingSection(null);
    parts.push('<story_bible>');
    parts.push(groundingSection);
    parts.push('</story_bible>');
    console.log(`[Cache] Grounding section: ${groundingSection.length} chars`);

    // Part 2: Character Reference (STATIC)
    const characterSection = this._buildCharacterSection();
    parts.push('<character_reference>');
    parts.push(characterSection);
    parts.push('</character_reference>');
    console.log(`[Cache] Character section: ${characterSection.length} chars`);

    // Part 3: Craft Techniques (STATIC)
    const craftSection = this._buildCraftTechniquesSection();
    parts.push('<craft_techniques>');
    parts.push(craftSection);
    parts.push('</craft_techniques>');
    console.log(`[Cache] Craft techniques: ${craftSection.length} chars`);

    // Part 4: Writing Style Examples (STATIC)
    const extendedExamples = this._buildExtendedStyleExamplesForCache();
    console.log(`[Cache] Extended examples: ${extendedExamples.length} chars`);

    const styleSection = `## WRITING STYLE - Voice DNA Examples

Voice: ${WRITING_STYLE.voice.perspective}, ${WRITING_STYLE.voice.tense}
Tone: ${WRITING_STYLE.voice.tone}

Influences:
${WRITING_STYLE.influences.map(i => `- ${i}`).join('\n')}

### Forbidden Patterns (NEVER use):
${WRITING_STYLE.absolutelyForbidden.map(f => `- ${f}`).join('\n')}

### Required Elements:
${WRITING_STYLE.mustInclude.map(r => `- ${r}`).join('\n')}

### Example Passages:
${Object.entries(EXAMPLE_PASSAGES)
  .map(([key, passage]) => {
    return `**${key}**:
${passage}`;
  })
  .join('\n\n')}

${STYLE_EXAMPLES}

${extendedExamples}
`;
    parts.push('<style_examples>');
    parts.push(styleSection);
    parts.push('</style_examples>');
    console.log(`[Cache] Style section total: ${styleSection.length} chars`);

    // Part 5: Consistency Rules (STATIC)
    const rulesSection = `## CONSISTENCY CHECKLIST - Self-Validation Rules

Before generating, verify these facts are never contradicted:

${CONSISTENCY_RULES.map(rule => `- ${rule}`).join('\n')}
`;
    parts.push('<consistency_rules>');
    parts.push(rulesSection);
    parts.push('</consistency_rules>');
    console.log(`[Cache] Consistency rules: ${rulesSection.length} chars`);

    const fullContent = parts.join('\n\n');
    console.log(`[Cache] TOTAL static content: ${fullContent.length} chars (~${Math.round(fullContent.length / 4)} tokens est.)`);

    return fullContent;
  }

  /**
   * Get or create cache for static content
   */
  async _ensureStaticCache() {
    const cacheKey = `story_static_v${this.staticCacheVersion}`;

    // Check if cache exists
    const existing = await llmService.getCache(cacheKey);
    if (existing) {
      this.staticCacheKey = cacheKey;
      console.log(`[StoryGenerationService] ♻️ Using existing static cache: ${cacheKey}`);
      return cacheKey;
    }

    // Create new cache
    console.log(`[StoryGenerationService] 🔧 Creating static content cache...`);

    const staticContent = this._buildStaticCacheContent();

    await llmService.createCache({
      key: cacheKey,
      model: 'gemini-3-flash-preview',
      systemInstruction: MASTER_SYSTEM_PROMPT,
      content: staticContent,
      ttl: '7200s', // 2 hours (story sessions typically < 2 hours)
      metadata: {
        version: this.staticCacheVersion,
        created: new Date().toISOString(),
        type: 'story_generation_static',
      },
    });

    this.staticCacheKey = cacheKey;
    console.log(`[StoryGenerationService] ✅ Static cache created: ${cacheKey}`);

    return cacheKey;
  }

  /**
   * Build dynamic prompt content (changes per request)
   * This is sent alongside the cached static content
   */
  _buildDynamicPrompt(context, chapter, subchapter, isDecisionPoint) {
    const parts = [];

    // Per Gemini 3 docs: Use XML tags for structure clarity
    // "place your specific instructions or questions at the end of the prompt, after the data context"

    // Dynamic Part 1: Complete Story So Far
    parts.push('<story_context>');
    parts.push(this._buildStorySummarySection(context));
    parts.push('</story_context>');

    // Dynamic Part 2: Character Knowledge State (who knows what)
    parts.push('<character_knowledge>');
    parts.push(this._buildKnowledgeSection(context));
    parts.push('</character_knowledge>');

    // Dynamic Part 3: Voice DNA (character-specific dialogue patterns for this scene)
    const charactersInScene = this._extractCharactersFromContext(context, chapter);
    const voiceDNA = buildVoiceDNASection(charactersInScene);
    if (voiceDNA) {
      parts.push('<voice_dna>');
      parts.push(voiceDNA);
      parts.push('</voice_dna>');
    }

    // Dynamic Part 4: Dramatic Irony (chapter-specific ironies)
    const pathKey = context.pathKey || '';
    const choiceHistory = context.playerChoices || [];
    const dramaticIrony = buildDramaticIronySection(chapter, pathKey, choiceHistory);
    if (dramaticIrony) {
      parts.push('<dramatic_irony>');
      parts.push(dramaticIrony);
      parts.push('</dramatic_irony>');
    }

    // Dynamic Part 5: Consistency Checklist (established facts + active threads)
    parts.push('<active_threads>');
    parts.push(this._buildConsistencySection(context));
    parts.push('</active_threads>');

    // Dynamic Part 6: Current Scene State (exact continuation point)
    const sceneState = this._buildSceneStateSection(context, chapter, subchapter);
    if (sceneState) {
      parts.push('<scene_state>');
      parts.push(sceneState);
      parts.push('</scene_state>');
    }

    // Dynamic Part 7: Personal Stakes & Engagement Guidance
    const engagementGuidance = this._buildEngagementGuidanceSection(context, chapter, subchapter);
    if (engagementGuidance) {
      parts.push('<engagement_guidance>');
      parts.push(engagementGuidance);
      parts.push('</engagement_guidance>');
    }

    // Dynamic Part 8: Current Task Specification (LAST per Gemini 3 best practices)
    const taskSpec = this._buildTaskSection(context, chapter, subchapter, isDecisionPoint);
    const beatType = this._getBeatType(chapter, subchapter);

    parts.push(`
<task>
Write subchapter ${chapter}.${subchapter} (${beatType}).

Before writing, plan:
1. What narrative threads from ACTIVE_THREADS must be addressed?
2. What is the emotional anchor for this subchapter?
3. How does this advance the chapter beat (${beatType})?

${taskSpec}
</task>

<self_critique>
After generating your narrative, review it against these quality gates:

1. **Intent Alignment**: Did I answer the beat requirements, not just write prose?
2. **Thread Continuity**: Did I address at least 2 CRITICAL threads explicitly?
3. **Emotional Authenticity**: Is there a genuine gut-punch moment, not just plot?
4. **Timeline Precision**: Are all durations EXACT per ABSOLUTE_FACTS (never approximate)?
5. **Hook Quality**: Does the final line create unbearable forward momentum?
6. **Forbidden Patterns**: Did I avoid all forbidden phrases and constructions?

If any check fails, revise before returning your response.
</self_critique>`);

    return parts.join('\n\n');
  }

  /**
   * Build the complete generation prompt with all context
   * LEGACY METHOD - kept for backward compatibility, but now uses caching internally
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

    // Part 5: Style Examples (Few-shot) with Voice DNA and Dramatic Irony
    // Determine which characters might be in this scene based on context
    const charactersInScene = this._extractCharactersFromContext(context, chapter);
    const pathKey = context.pathKey || '';
    const choiceHistory = context.playerChoices || [];
    parts.push(this._buildStyleSection(charactersInScene, chapter, pathKey, choiceHistory));

    // Part 6: Consistency Checklist
    parts.push(this._buildConsistencySection(context));

    // Part 7: Current Scene State (CRITICAL - exact continuation point)
    const sceneState = this._buildSceneStateSection(context, chapter, subchapter);
    if (sceneState) {
      parts.push(sceneState);
    }

    // Part 8: Personal Stakes & Engagement Guidance (from story arc)
    const engagementGuidance = this._buildEngagementGuidanceSection(context, chapter, subchapter);
    if (engagementGuidance) {
      parts.push(engagementGuidance);
    }

    // Part 9: Craft Techniques (static storyBible reference)
    parts.push(this._buildCraftTechniquesSection());

    // Part 10: Current Task Specification (LAST for recency effect)
    parts.push(this._buildTaskSection(context, chapter, subchapter, isDecisionPoint));

    return parts.join('\n\n---\n\n');
  }

  /**
   * Build craft techniques section with engagement requirements, micro-tension, rhythm, etc.
   * These are static techniques from storyBible that guide HOW to write compelling prose.
   */
  _buildCraftTechniquesSection() {
    return `## CRAFT TECHNIQUES - How to Write Compelling Prose

### ENGAGEMENT REQUIREMENTS

**Question Economy:** ${ENGAGEMENT_REQUIREMENTS.questionEconomy.description}
- Balance Rule: ${ENGAGEMENT_REQUIREMENTS.questionEconomy.balanceRule}
- Question Types: Mystery (plot), Character (relationships), Threat (tension), Thematic (meaning)

**Final Line Hook:** ${ENGAGEMENT_REQUIREMENTS.finalLineHook.description}
Techniques:
${ENGAGEMENT_REQUIREMENTS.finalLineHook.techniques.map(t => `- ${t}`).join('\n')}

**Personal Stakes Progression:**
- Chapters 2-4: ${ENGAGEMENT_REQUIREMENTS.personalStakes.progression.chapters2to4}
- Chapters 5-7: ${ENGAGEMENT_REQUIREMENTS.personalStakes.progression.chapters5to7}
- Chapters 8-10: ${ENGAGEMENT_REQUIREMENTS.personalStakes.progression.chapters8to10}
- Chapters 11-12: ${ENGAGEMENT_REQUIREMENTS.personalStakes.progression.chapters11to12}

**Revelation Gradient:**
- Micro (every subchapter): ${ENGAGEMENT_REQUIREMENTS.revelationGradient.levels.micro}
- Chapter (end of each): ${ENGAGEMENT_REQUIREMENTS.revelationGradient.levels.chapter}
- Arc (chapters 4, 7, 10): ${ENGAGEMENT_REQUIREMENTS.revelationGradient.levels.arc}

**Dramatic Irony:** ${ENGAGEMENT_REQUIREMENTS.dramaticIrony.description}
${ENGAGEMENT_REQUIREMENTS.dramaticIrony.examples.map(e => `- ${e}`).join('\n')}

**Emotional Anchor:** ${ENGAGEMENT_REQUIREMENTS.emotionalAnchor.description}
Rule: ${ENGAGEMENT_REQUIREMENTS.emotionalAnchor.rule}

### MICRO-TENSION TECHNIQUES
${MICRO_TENSION_TECHNIQUES.description}

Every paragraph MUST contain at least one:
${MICRO_TENSION_TECHNIQUES.elements.map(e => `- ${e}`).join('\n')}

**Warning:** ${MICRO_TENSION_TECHNIQUES.warning}

### SENTENCE RHYTHM (Noir Cadence)
${SENTENCE_RHYTHM.description}

Pattern example:
${SENTENCE_RHYTHM.pattern}

Rules:
${SENTENCE_RHYTHM.rules.map(r => `- ${r}`).join('\n')}

### THE ICEBERG TECHNIQUE
${ICEBERG_TECHNIQUE.description}

Applications:
${ICEBERG_TECHNIQUE.applications.map(a => `- ${a}`).join('\n')}

Principle: ${ICEBERG_TECHNIQUE.principle}

### SUBTEXT IN DIALOGUE
${SUBTEXT_REQUIREMENTS.description}

Layers:
- Surface: ${SUBTEXT_REQUIREMENTS.layers.surface}
- Actual: ${SUBTEXT_REQUIREMENTS.layers.actual}

Examples:
${SUBTEXT_REQUIREMENTS.examples.map(e => `"${e.surface}" → Subtext: "${e.subtext}"`).join('\n')}

**Rule:** ${SUBTEXT_REQUIREMENTS.rule}`;
  }

  /**
   * Extract characters likely to appear in a scene based on context
   */
  _extractCharactersFromContext(context, chapter) {
    const characters = [];

    // Always include Jack (protagonist)
    // Check story arc for chapter-specific characters
    if (this.storyArc?.chapterArcs) {
      const chapterArc = this.storyArc.chapterArcs.find(a => a.chapter === chapter);
      if (chapterArc?.innocentFeatured) {
        characters.push(chapterArc.innocentFeatured);
      }
    }

    // Check active threads for characters
    if (context.narrativeThreads) {
      context.narrativeThreads.forEach(thread => {
        if (thread.characters) {
          characters.push(...thread.characters);
        }
      });
    }

    // Check recent narrative for character mentions
    if (context.previousChapters?.length > 0) {
      const recentChapter = context.previousChapters[context.previousChapters.length - 1];
      if (recentChapter?.narrative) {
        const narrative = recentChapter.narrative.toLowerCase();
        if (narrative.includes('victoria') || narrative.includes('blackwell')) characters.push('Victoria');
        if (narrative.includes('sarah') || narrative.includes('reeves')) characters.push('Sarah');
        if (narrative.includes('tom') || narrative.includes('wade')) characters.push('Tom');
        if (narrative.includes('eleanor') || narrative.includes('bellamy')) characters.push('Eleanor');
        if (narrative.includes('claire') || narrative.includes('thornhill')) characters.push('Claire');
      }
    }

    // Deduplicate and return
    return [...new Set(characters)];
  }

  /**
   * Build engagement guidance section with personal stakes and emotional anchors
   */
  _buildEngagementGuidanceSection(context, chapter, subchapter) {
    let section = `## ENGAGEMENT GUIDANCE FOR THIS CHAPTER\n\n`;

    // Get chapter-specific guidance from story arc
    if (this.storyArc?.chapterArcs) {
      const chapterArc = this.storyArc.chapterArcs.find(a => a.chapter === chapter);
      if (chapterArc) {
        section += `### CHAPTER ${chapter} FOCUS\n`;
        section += `**Phase:** ${chapterArc.phase}\n`;
        section += `**Primary Focus:** ${chapterArc.primaryFocus}\n`;
        section += `**Tension Level:** ${chapterArc.tensionLevel}/10\n`;

        if (chapterArc.personalStakes) {
          section += `\n### PERSONAL STAKES (What Jack loses if he fails HERE)\n`;
          section += `${chapterArc.personalStakes}\n`;
          section += `\n**Make the reader FEEL this is at risk. Show it, don't tell it.**\n`;
        }

        if (chapterArc.emotionalAnchor) {
          section += `\n### EMOTIONAL ANCHOR (The gut-punch moment for this chapter)\n`;
          section += `${chapterArc.emotionalAnchor}\n`;
          section += `\n**This is not plot. This is FEELING. Write it to hit the reader in the chest.**\n`;
        }

        if (chapterArc.keyRevelation) {
          section += `\n### KEY REVELATION\n`;
          section += `${chapterArc.keyRevelation}\n`;
        }

        section += `\n### ENDING HOOK\n`;
        section += `This chapter should end with: "${chapterArc.endingHook}"\n`;
        section += `\n**For subchapter ${['A', 'B', 'C'][subchapter - 1]}: Build toward this ending while creating micro-hooks at the end of your subchapter.**\n`;
      }
    }

    // Add subchapter-specific guidance
    section += `\n### SUBCHAPTER ${['A', 'B', 'C'][subchapter - 1]} ROLE\n`;
    if (subchapter === 1) {
      section += `- This is the OPENING of the chapter\n`;
      section += `- Establish atmosphere and continue from the previous choice\n`;
      section += `- Plant the seeds of this chapter's conflict\n`;
      section += `- Hook: End with a question or complication that demands continuation\n`;
    } else if (subchapter === 2) {
      section += `- This is the MIDDLE of the chapter\n`;
      section += `- Escalate the tension established in A\n`;
      section += `- Deliver at least one micro-revelation\n`;
      section += `- Hook: End with raised stakes or a turning point\n`;
    } else {
      section += `- This is the CLIMAX/DECISION of the chapter\n`;
      section += `- Deliver the emotional anchor moment\n`;
      section += `- Build to an impossible choice\n`;
      section += `- Hook: The decision itself is the ultimate cliffhanger\n`;
    }

    return section;
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
- Eleanor's imprisonment: 8 years exactly

### TIMELINE (Use these exact dates/durations)
- 30 years ago: ${TIMELINE.yearsAgo[30]}
- 25 years ago: ${TIMELINE.yearsAgo[25]}
- 20 years ago: ${TIMELINE.yearsAgo[20]}
- 15 years ago: ${TIMELINE.yearsAgo[15]}
- 13 years ago: ${TIMELINE.yearsAgo[13]}
- 10 years ago: ${TIMELINE.yearsAgo[10]}
- 8 years ago: ${TIMELINE.yearsAgo[8]}
- 7 years ago: Emily Cross events (affair, suicide attempt, kidnapping, Jack closes case)
- 5 years ago: ${TIMELINE.yearsAgo[5]}
- 3 years ago: ${TIMELINE.yearsAgo[3]}
- 1 year ago: ${TIMELINE.yearsAgo[1]}

### WRITING STYLE REQUIREMENTS
**Voice:** ${WRITING_STYLE.voice.perspective}, ${WRITING_STYLE.voice.tense}
**Tone:** ${WRITING_STYLE.voice.tone}
**Influences:** ${WRITING_STYLE.influences.join(', ')}

**MUST INCLUDE:**
${WRITING_STYLE.mustInclude.map(item => `- ${item}`).join('\n')}

**ABSOLUTELY FORBIDDEN (Never use these):**
${WRITING_STYLE.absolutelyForbidden.map(item => `- ${item}`).join('\n')}`;
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
        // Handle both legacy (decision) and new (pathDecisions) formats
        const decisionData = ch.pathDecisions?.['1A-2A'] || ch.decision;
        if (decisionData?.options) {
          summary += `\n[Decision options were:\n`;
          decisionData.options.forEach(opt => {
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
    const { protagonist, antagonist, allies, villains, victims, secondary } = CHARACTER_REFERENCE;

    // Helper to format example phrases
    const formatExamples = (phrases) => {
      return phrases.map(phrase => `  - "${phrase}"`).join('\n');
    };

    return `## CHARACTER VOICES (Match these exactly)

### JACK HALLOWAY (Protagonist - Narration is close third-person on Jack)
Role: ${protagonist.role}, ${protagonist.age}
Voice: ${protagonist.voiceAndStyle.narrative}
Internal Monologue: ${protagonist.voiceAndStyle.internalMonologue}
Dialogue: ${protagonist.voiceAndStyle.dialogue}
Example Phrases:
${formatExamples(protagonist.voiceAndStyle.examplePhrases)}

### VICTORIA BLACKWELL / THE CONFESSOR / EMILY CROSS
Role: ${antagonist.role}
Aliases: ${antagonist.aliases.join(', ')}
Voice (Speaking): ${antagonist.voiceAndStyle.speaking}
Voice (Written): ${antagonist.voiceAndStyle.written}
Example Phrases:
${formatExamples(antagonist.voiceAndStyle.examplePhrases)}

### SARAH REEVES
Role: ${allies.sarahReeves.role}
Voice: ${allies.sarahReeves.voiceAndStyle.speaking}
Example Phrases:
${formatExamples(allies.sarahReeves.voiceAndStyle.examplePhrases)}

### ELEANOR BELLAMY
Role: ${allies.eleanorBellamy.role}
Voice: ${allies.eleanorBellamy.voiceAndStyle.speaking}
Example Phrases:
${formatExamples(allies.eleanorBellamy.voiceAndStyle.examplePhrases)}

### TOM WADE
Role: ${villains.tomWade.role}
Voice: ${villains.tomWade.voiceAndStyle?.speaking || 'Friendly surface with technical jargon as deflection'}
Note: Jack's best friend for 30 years who manufactured evidence

### SILAS REED
Role: ${villains.silasReed.role}
Voice: ${villains.silasReed.voiceAndStyle.speaking}
Example Phrases:
${formatExamples(villains.silasReed.voiceAndStyle.examplePhrases)}

### HELEN PRICE
Role: ${villains.helenPrice.title} - ${villains.helenPrice.role}
Voice: ${villains.helenPrice.voiceAndStyle.speaking}
Example Phrases:
${formatExamples(villains.helenPrice.voiceAndStyle.examplePhrases)}

### CLAIRE THORNHILL
Role: ${victims.claireThornhill.role}
Voice: ${victims.claireThornhill.voiceAndStyle.speaking}
Example Phrases:
${formatExamples(victims.claireThornhill.voiceAndStyle.examplePhrases)}

### MARCUS WEBB
Role: ${secondary.marcusWebb.role}
Voice: ${secondary.marcusWebb.voiceAndStyle.speaking}
Example Phrases:
${formatExamples(secondary.marcusWebb.voiceAndStyle.examplePhrases)}`;
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

### DECISION POINT REQUIREMENTS - PATH-SPECIFIC DECISIONS
This subchapter ends with a binary choice. The player will see different decision options depending on which branching path they took within this subchapter.

**CRITICAL: Generate 9 UNIQUE decisions in the "pathDecisions" object** - one for each ending path:
- 1A-2A, 1A-2B, 1A-2C (paths starting with choice 1A)
- 1B-2A, 1B-2B, 1B-2C (paths starting with choice 1B)
- 1C-2A, 1C-2B, 1C-2C (paths starting with choice 1C)

**WHY THIS MATTERS:**
A player who took the aggressive path (e.g., 1A→1A-2A) should face decisions that reflect THEIR journey.
A player who took the cautious path (e.g., 1C→1C-2C) should face decisions suited to THEIR situation.
The narrative context differs by path, so the strategic options should differ too.

**DECISION DESIGN REQUIREMENTS:**
1. Each of the 9 pathDecisions must present TWO distinct paths (Option A and Option B)
2. Both options must be morally complex - NO obvious "right" answer
3. Each choice should have CLEAR but DIFFERENT consequences
4. The decision must feel EARNED by the specific path the player took
5. Connect to the themes of wrongful conviction, certainty vs truth
6. The intro should reference elements unique to that branching path

**EXAMPLE of path-specific variation:**
- Path 1A-2A (aggressive throughout): "After forcing Claire's hand, Jack now faces a riskier choice..."
- Path 1C-2C (cautious throughout): "Having gathered the evidence methodically, Jack now sees two clear paths..."

**For EACH decision in pathDecisions (all 9):**
- intro: 1-2 sentences framing the choice, reflecting that specific path's context
- optionA.title: Action statement in imperative mood
- optionA.focus: What this path prioritizes and what it risks
- optionB.title: Action statement in imperative mood
- optionB.focus: What this path prioritizes and what it risks`;
    }

    return task;
  }

  /**
   * Build style examples section (few-shot learning)
   */
  _buildStyleSection(charactersInScene = [], chapter = 2, pathKey = '', choiceHistory = []) {
    // Build extended examples section
    let extendedExamples = '';
    try {
      extendedExamples = buildExtendedStyleExamples();
      if (!extendedExamples || extendedExamples.length < 1000) {
        console.error('[StoryGen] ⚠️ Extended examples missing/short in _buildStyleSection!', extendedExamples?.length);
      }
    } catch (e) {
      console.error('[StoryGen] ❌ Extended examples FAILED:', e.message);
      extendedExamples = '';
    }

    // Build voice DNA section for characters in this scene
    let voiceDNA = '';
    try {
      voiceDNA = buildVoiceDNASection(charactersInScene);
      if (!voiceDNA || voiceDNA.length < 100) {
        console.warn('[StoryGen] ⚠️ Voice DNA short/empty. Characters:', charactersInScene);
      }
    } catch (e) {
      console.error('[StoryGen] ❌ Voice DNA FAILED:', e.message);
      voiceDNA = '';
    }

    // Build dramatic irony section based on chapter
    let dramaticIrony = '';
    try {
      dramaticIrony = buildDramaticIronySection(chapter, pathKey, choiceHistory);
      if (!dramaticIrony || dramaticIrony.length < 50) {
        console.warn('[StoryGen] ⚠️ Dramatic irony empty for chapter', chapter);
      }
    } catch (e) {
      console.error('[StoryGen] ❌ Dramatic irony FAILED:', e.message);
      dramaticIrony = '';
    }

    return `## STYLE REFERENCE

Study this example passage and match its quality:

${EXAMPLE_PASSAGES.tenseMoment}

**Note the:** punchy sentences, sensory grounding, character voice through action, tension without melodrama.

${STYLE_EXAMPLES}

${extendedExamples}

${voiceDNA}

${dramaticIrony}`;
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
  _getBeatType(chapter, subchapter) {
    // Return a simple beat type description for the task prompt
    const subchapterLabel = ['A', 'B', 'C'][subchapter - 1] || 'A';
    if (subchapter === 1) return `Opening/Hook (${subchapterLabel})`;
    if (subchapter === 2) return `Development/Conflict (${subchapterLabel})`;
    if (subchapter === 3) return `Resolution/Decision (${subchapterLabel})`;
    return `Subchapter ${subchapterLabel}`;
  }

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

    // At capacity - wait for a slot (sequential mode means waiting for current to finish)
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

    // CRITICAL: Distinguish between user-facing and background generation
    // User-facing = player is actively waiting (clicked Continue)
    // Background = prefetching for future use
    // If user-facing, we NEVER show fallback - we throw errors and let UI handle retry
    const isUserFacing = options?.isUserFacing || false;

    // TRUE INFINITE BRANCHING: Get player's actual choices within subchapters
    // This tracks which path the player took through branching narratives (e.g., "1B" -> "1B-2C")
    // Used to build the "realized narrative" for context - what the player actually experienced
    const branchingChoices = options?.branchingChoices || [];

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
          // Ensure static cache exists (creates on first call, reuses thereafter)
          const cacheKey = await this._ensureStaticCache();

          // Build only dynamic prompt (story history, current state, task)
          const dynamicPrompt = this._buildDynamicPrompt(context, chapter, subchapter, isDecisionPoint);

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
            schema: isDecisionPoint ? 'DECISION_CONTENT_SCHEMA' : 'STORY_CONTENT_SCHEMA',
            contextSummary: {
              previousChapters: context?.previousChapters?.length || 0,
              establishedFacts: context?.establishedFacts?.length || 0,
              playerChoices: context?.playerChoices?.length || 0,
              narrativeThreads: context?.narrativeThreads?.length || 0,
            },
            reason,
          }, 'debug');

          response = await llmService.completeWithCache({
            cacheKey,
            dynamicPrompt,
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
          console.warn(`[StoryGenerationService] ⚠️ Caching failed:`, cacheError.message);
          console.warn(`[StoryGenerationService] Falling back to non-cached generation`);
          // Fall through to non-cached generation
          response = null;
        }

        // Fallback: Use regular generation if caching failed
        if (!response) {
          console.log(`[StoryGenerationService] Regular generation for Chapter ${chapter}.${subchapter} (no caching)`);

          const prompt = this._buildGenerationPrompt(context, chapter, subchapter, isDecisionPoint);

          llmTrace('StoryGenerationService', traceId, 'prompt.built', {
            caseNumber,
            pathKey,
            chapter,
            subchapter,
            isDecisionPoint,
            cachingEnabled: false,
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

          response = await llmService.complete(
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
          console.log(`[StoryGenerationService] 🔄 Making second API call for pathDecisions...`);
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
            const pathSummaries = secondChoices.map((sc, scIdx) => {
              const afterChoice = sc.afterChoice || `1${String.fromCharCode(65 + scIdx)}`;
              const opts = sc.options || [];
              return opts.map((opt, optIdx) => {
                const pathKey = `${afterChoice}-2${String.fromCharCode(65 + optIdx)}`;
                const summary = opt.summary || `Player chose "${opt.label || 'an option'}"`;
                return `- ${pathKey}: ${summary}`;
              }).join('\n');
            }).join('\n');

            const pathDecisionsPrompt = PATHDECISIONS_PROMPT_TEMPLATE
              // First choice options with labels and summaries (not full narrative)
              .replace('{{firstChoice1ALabel}}', firstChoiceOpts[0]?.label || 'Option 1A')
              .replace('{{firstChoice1ASummary}}', firstChoiceOpts[0]?.summary || inferTone(firstChoiceOpts[0]?.label))
              .replace('{{firstChoice1BLabel}}', firstChoiceOpts[1]?.label || 'Option 1B')
              .replace('{{firstChoice1BSummary}}', firstChoiceOpts[1]?.summary || inferTone(firstChoiceOpts[1]?.label))
              .replace('{{firstChoice1CLabel}}', firstChoiceOpts[2]?.label || 'Option 1C')
              .replace('{{firstChoice1CSummary}}', firstChoiceOpts[2]?.summary || inferTone(firstChoiceOpts[2]?.label))
              // Path summaries (15-25 words each, not full narrative content)
              .replace('{{pathSummaries}}', pathSummaries || 'Not available')
              // Simple decision base
              .replace('{{optionATitle}}', generatedContent.decision?.optionA?.title || 'Option A')
              .replace('{{optionAFocus}}', generatedContent.decision?.optionA?.focus || 'Not specified')
              .replace('{{optionBTitle}}', generatedContent.decision?.optionB?.title || 'Option B')
              .replace('{{optionBFocus}}', generatedContent.decision?.optionB?.focus || 'Not specified');

            // Log what context we're sending
            console.log(`[StoryGenerationService] 📋 pathDecisions second call context:`);
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
                  systemPrompt: 'You generate path-specific decision variants for an interactive noir detective story. Respond with valid JSON only.',
                  maxTokens: GENERATION_CONFIG.maxTokens.pathDecisions, // 16k tokens for complex branching + thinking
                  responseSchema: PATHDECISIONS_ONLY_SCHEMA,
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
              console.warn(`[StoryGenerationService] ⚠️ Failed to parse pathDecisions JSON:`, parseErr.message);
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
              console.log(`[StoryGenerationService] 📊 Path-specific decisions received:`);
              for (const [pathKey, decision] of Object.entries(pathDecisionsObj)) {
                console.log(`  - ${pathKey}: A="${decision.optionA?.title || '?'}" | B="${decision.optionB?.title || '?'}"`);
              }

              llmTrace('StoryGenerationService', traceId, 'pathDecisions.secondCall.merged', {
                pathCount: Object.keys(pathDecisionsObj).length,
                paths: Object.keys(pathDecisionsObj),
                decisions: Object.fromEntries(
                  Object.entries(pathDecisionsObj).map(([k, v]) => [k, { optionA: v.optionA?.title, optionB: v.optionB?.title }])
                ),
              }, 'debug');
            } else {
              console.warn(`[StoryGenerationService] ⚠️ Second call didn't return valid pathDecisions, using simple decision fallback`);
            }
          } catch (secondCallError) {
            console.warn(`[StoryGenerationService] ⚠️ Second call for pathDecisions failed:`, secondCallError.message);
            llmTrace('StoryGenerationService', traceId, 'pathDecisions.secondCall.failed', {
              error: secondCallError.message,
            }, 'error');
            // Continue with simple decision - it's a valid fallback
          }
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

        // ========== LLM-BASED VALIDATION (Semantic Understanding) ==========
        // This catches violations that regex can't detect (wrong years, subtle contradictions)
        // Only run if regex validation passed (to avoid wasting tokens on obviously broken content)
        if (validationResult.issues.length === 0) {
          try {
            const llmValidation = await this._validateWithLLM(generatedContent, context);
            if (llmValidation.validated && llmValidation.issues.length > 0) {
              // LLM found issues that regex missed - these are blocking issues
              validationResult.issues = [...validationResult.issues, ...llmValidation.issues.map(i => `[LLM] ${i}`)];
              console.log(`[StoryGen] LLM validation found ${llmValidation.issues.length} issues that regex missed`);
            }
          } catch (llmValError) {
            console.warn(`[StoryGen] LLM validation skipped due to error:`, llmValError.message);
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
        const storyEntry = {
          chapter,
          subchapter,
          pathKey: effectivePathKey,
          caseNumber,
          title: generatedContent.title,
          narrative: generatedContent.narrative,
          // BRANCHING NARRATIVE: Interactive story structure with player choices
          // This powers the BranchingNarrativeReader component for in-subchapter choices
          branchingNarrative: generatedContent.branchingNarrative || null,
          bridgeText: generatedContent.bridgeText,
          previously: generatedContent.previously || '', // Recap of previous events
          briefing: generatedContent.briefing || { summary: '', objectives: [] },
          pathDecisions: isDecisionPoint ? generatedContent.pathDecisions : null,
          decision: isDecisionPoint ? generatedContent.decision : null, // Simple single-decision fallback
          board: this._generateBoardData(generatedContent.narrative, isDecisionPoint, generatedContent.pathDecisions || generatedContent.decision, generatedContent.puzzleCandidates, chapter),
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
          wordCount: generatedContent.narrative?.split(/\s+/).length || 0,
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
    // IMPORTANT: This must be longer than LLMService timeout (180s) * max retries (3)
    // to allow retries to complete. Adding 60s buffer for network delays.
    // Formula: (180s * 3 attempts) + 60s buffer = 600s = 10 minutes
    const GENERATION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes (allows for 3 retries @ 180s each)
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
        console.error(`[StoryGenerationService] Throwing error to UI - no fallback for user-facing content`);
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
    // DISABLED: No fallback narratives allowed.
    // Callers should handle errors and prompt player to retry.
    const error = new Error(`Emergency fallback requested for Chapter ${chapter}.${subchapter} but fallbacks are disabled. Player should retry generation.`);
    error.isFallbackDisabled = true;
    error.chapter = chapter;
    error.subchapter = subchapter;
    error.retryable = true;
    throw error;
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
        // BRANCHING NARRATIVE: The interactive story structure with 9 paths
        // Contains: opening, firstChoice, secondChoices (each with options array)
        branchingNarrative: parsed.branchingNarrative || null,
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
        pathDecisions: null,
      };

      // Convert decision format if present
      if (isDecisionPoint) {
        if (parsed.pathDecisions) {
          // Support both array format (new) and object format (legacy)
          let pathDecisionsObj;
          if (Array.isArray(parsed.pathDecisions)) {
            // New array format: convert to object keyed by pathKey
            console.log(`[StoryGenerationService] Raw pathDecisions from LLM: ${parsed.pathDecisions.length} paths (array format)`);
            pathDecisionsObj = {};
            for (const decision of parsed.pathDecisions) {
              if (decision.pathKey) {
                pathDecisionsObj[decision.pathKey] = decision;
              }
            }
          } else {
            // Legacy object format
            pathDecisionsObj = parsed.pathDecisions;
            console.log(`[StoryGenerationService] Raw pathDecisions from LLM: ${Object.keys(pathDecisionsObj).length} paths (object format)`);
          }

          // Convert each of the 9 path-specific decisions to internal format
          result.pathDecisions = {};
          for (const pathKey of Object.keys(pathDecisionsObj)) {
            const rawDecision = pathDecisionsObj[pathKey];
            if (rawDecision) {
              result.pathDecisions[pathKey] = this._convertDecisionFormat(rawDecision);
            }
          }

          // Validate that we got all 9 paths
          const expectedPaths = ['1A-2A', '1A-2B', '1A-2C', '1B-2A', '1B-2B', '1B-2C', '1C-2A', '1C-2B', '1C-2C'];
          const missingPaths = expectedPaths.filter(p => !result.pathDecisions[p]);
          if (missingPaths.length > 0) {
            console.warn(`[StoryGenerationService] PATH DECISIONS INCOMPLETE - missing paths: ${missingPaths.join(', ')}`);
          }

          // Validate sample decision has proper structure
          const sampleDecision = result.pathDecisions['1A-2A'];
          if (!sampleDecision?.options?.[0]?.title || !sampleDecision?.options?.[1]?.title) {
            console.error('[StoryGenerationService] PATH DECISION PARSING FAILED - sample (1A-2A) missing titles:', {
              rawSample: pathDecisionsObj['1A-2A'],
              convertedSample: sampleDecision,
            });
          }
        } else if (parsed.decision) {
          // Simple single decision format (TEMPORARY for testing)
          console.log(`[StoryGenerationService] Using simple decision format (single decision)`);
          result.decision = this._convertDecisionFormat(parsed.decision);
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
      branchingNarrative: null, // Include in fallback parsing
      chapterSummary: '',
      puzzleCandidates: [],
      briefing: { summary: '', objectives: [] },
      consistencyFacts: [],
      pathDecisions: null, // Path-specific decisions for C subchapters
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
    // NOTE: These patterns must be VERY specific to avoid false positives.
    // The previous patterns used greedy `.*` which matched across the entire narrative,
    // triggering false positives like "five years ago, [unrelated text], Silas walked in".
    // Now we only match within the same sentence (no periods between) and limit to 60 chars.
    const timelineChecks = [
      // Match "twenty/20 years" + up to 60 chars (no period) + "tom wade/wade friend"
      { pattern: /(?:twenty|20)\s*years[^.]{0,60}(?:tom\s*wade|wade[^.]{0,20}friend)/i, issue: 'Tom Wade friendship is 30 years, not 20' },
      // Match "ten/10 years" + up to 60 chars (no period) + "sarah/reeves partner"
      { pattern: /(?:ten|10)\s*years[^.]{0,60}(?:sarah[^.]{0,20}partner|reeves[^.]{0,20}partner)/i, issue: 'Sarah partnership is 13 years, not 10' },
      // Match "five/5 years" + up to 60 chars (no period) + "silas partner/reed partner"
      { pattern: /(?:five|5)\s*years[^.]{0,60}(?:silas[^.]{0,20}partner|reed[^.]{0,20}partner)/i, issue: 'Silas partnership is 8 years, not 5' },
      // Match wrong year + up to 60 chars (no period) + emily case context
      { pattern: /(?:five|5|ten|10)\s*years[^.]{0,60}(?:emily[^.]{0,30}(?:dead|case|closed)|closed[^.]{0,30}emily)/i, issue: 'Emily case was closed 7 years ago exactly' },
      // Match wrong year + up to 60 chars (no period) + eleanor prison context
      { pattern: /(?:five|5|ten|10)\s*years[^.]{0,60}(?:eleanor[^.]{0,30}prison|imprisoned[^.]{0,30}eleanor)/i, issue: 'Eleanor has been imprisoned for 8 years exactly' },
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
        // Log as WARNING only - keyword matching is too simplistic for natural language.
        // The LLM may use synonyms/paraphrases that are semantically correct but don't
        // match our literal keywords. Trust the prompt instructions instead.
        warnings.push(
          `[Keyword check] No literal keyword matches in first 200 words for decision "${context.lastDecision.optionKey}". Keywords checked: [${keywords.slice(0, 5).join(', ')}]. This is usually fine - LLM likely used synonyms.`
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
              // Use word-based prefix matching to find the corresponding critical thread
              // This handles LLM rewording (e.g., "promised to meet" → "meeting") while
              // distinguishing similar threads (e.g., "meet Sarah" vs "call Sarah")
              const threadIdWords = threadId.toLowerCase().match(/\b\w{4,}\b/g) || [];
              const wordsMatchFn = (a, b) => {
                if (a.length < 4 || b.length < 4) return a === b;
                return a.startsWith(b) || b.startsWith(a);
              };
              const matchingCritical = criticalThreads.find(t => {
                if (!t.description) return false;
                const descWords = t.description.toLowerCase().match(/\b\w{4,}\b/g) || [];
                const matchingWords = threadIdWords.filter(tw =>
                  descWords.some(dw => wordsMatchFn(tw, dw))
                );
                // Require at least 2 matching words AND 40% overlap
                return matchingWords.length >= 2 && matchingWords.length / Math.max(threadIdWords.length, 1) > 0.4;
              });
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
    // CATEGORY 8.1: BRANCHING NARRATIVE WORD COUNT VALIDATION (WARNINGS ONLY)
    // Each player path should meet the target word count (850-950 words)
    // Structure: opening (280-320) + firstChoice response (280-320) + secondChoice response (280-320)
    // NOTE: These are warnings, not errors - schema instructs correct lengths, retries are wasteful
    // =========================================================================
    const bn = content.branchingNarrative;
    if (bn && bn.opening && bn.firstChoice && bn.secondChoices) {
      const countWords = (text) => (text || '').split(/\s+/).filter(w => w.length > 0).length;
      const MIN_SEGMENT_WORDS = 200;  // Minimum per segment (280-320 target, allow some flexibility)
      const MIN_PATH_WORDS = MIN_WORDS_PER_SUBCHAPTER;  // Each complete path should meet subchapter minimum

      // Validate opening
      const openingWords = countWords(bn.opening.text);
      if (openingWords < MIN_SEGMENT_WORDS) {
        warnings.push(`Branching narrative opening too short: ${openingWords} words (minimum ${MIN_SEGMENT_WORDS})`);
      }

      // Validate first choice options (3 branches)
      const firstChoiceOptions = bn.firstChoice?.options || [];
      firstChoiceOptions.forEach((opt, idx) => {
        const optWords = countWords(opt.response);
        if (optWords < MIN_SEGMENT_WORDS) {
          warnings.push(`First choice "${opt.key || idx}" response too short: ${optWords} words (minimum ${MIN_SEGMENT_WORDS})`);
        }
      });

      // Validate second choice options (9 branches) and complete paths
      const secondChoices = bn.secondChoices || [];
      secondChoices.forEach((sc, scIdx) => {
        const parentOpt = firstChoiceOptions[scIdx];
        const parentWords = countWords(parentOpt?.response);

        (sc.options || []).forEach((opt, optIdx) => {
          const optWords = countWords(opt.response);
          if (optWords < MIN_SEGMENT_WORDS) {
            warnings.push(`Second choice "${opt.key || `${scIdx}-${optIdx}`}" response too short: ${optWords} words (minimum ${MIN_SEGMENT_WORDS})`);
          }

          // Validate complete path word count (opening + first choice + second choice)
          const pathWords = openingWords + parentWords + optWords;
          if (pathWords < MIN_PATH_WORDS) {
            const pathKey = opt.key || `${scIdx + 1}${String.fromCharCode(65 + optIdx)}`;
            warnings.push(`Path "${pathKey}" total too short: ${pathWords} words (minimum ${MIN_PATH_WORDS})`);
          } else if (pathWords < TARGET_WORDS * 0.85) {
            const pathKey = opt.key || `${scIdx + 1}${String.fromCharCode(65 + optIdx)}`;
            warnings.push(`Path "${pathKey}" below target: ${pathWords} words (target ${TARGET_WORDS})`);
          }
        });
      });

      // Summary stats for logging
      const totalBranchingWords = openingWords +
        firstChoiceOptions.reduce((sum, opt) => sum + countWords(opt.response), 0) +
        secondChoices.reduce((sum, sc) => sum + (sc.options || []).reduce((s, opt) => s + countWords(opt.response), 0), 0);

      if (totalBranchingWords < 3500) {
        warnings.push(`Total branching narrative content is thin: ${totalBranchingWords} words (expected ~4000+ for full coverage)`);
      }
    } else if (content.branchingNarrative) {
      // branchingNarrative exists but is malformed
      warnings.push('Branching narrative structure incomplete: missing opening, firstChoice, or secondChoices');
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

    // =========================================================================
    // CATEGORY 13: PREMATURE REVELATION PREVENTION
    // =========================================================================
    // The mystery has a carefully designed revelation gradient. Major twists
    // must not be revealed before their intended chapter to preserve suspense.
    const currentChapter = context?.currentPosition?.chapter || 2;

    const prematureRevelationChecks = [
      // Victoria's true identity (Emily Cross) - should not be revealed before Chapter 10
      {
        pattern: /\b(?:victoria\s+(?:is|was)\s+emily|emily\s+(?:is|was)\s+victoria|victoria.*true\s+(?:name|identity).*emily|emily.*(?:became|now\s+called|goes\s+by)\s+victoria|she\s+(?:is|was)\s+emily\s+cross)\b/i,
        minChapter: 10,
        revelation: 'Victoria is Emily Cross',
      },
      // Tom's evidence manufacturing - should not be revealed before Chapter 7
      {
        pattern: /\b(?:tom\s+(?:wade\s+)?(?:manufactured|planted|fabricated|faked)\s+evidence|tom.*evidence\s+(?:was\s+)?(?:manufactured|planted|faked)|wade.*(?:been|was)\s+(?:manufacturing|planting|fabricating)\s+evidence|tom.*framing\s+(?:the\s+)?innocents?)\b/i,
        minChapter: 7,
        revelation: 'Tom Wade manufactured evidence',
      },
      // The Five Innocents connection - should not be fully revealed before Chapter 5
      {
        pattern: /\b(?:five\s+innocents?.*tom\s+wade|tom\s+wade.*five\s+innocents?|wade.*framed.*(?:all\s+)?five|teresa.*tom['']?s?\s+(?:own\s+)?daughter.*(?:framed|convicted))\b/i,
        minChapter: 5,
        revelation: 'Tom Wade framed the Five Innocents',
      },
      // The Confessor's true motive (revenge for Five Innocents) - should not be revealed before Chapter 8
      {
        pattern: /\b(?:confessor.*aveng(?:e|ing)\s+(?:the\s+)?(?:five\s+)?innocents?|midnight\s+confessor.*(?:revenge|vengeance)\s+for.*innocents?|confessor['']?s?\s+(?:true\s+)?motive.*innocents?)\b/i,
        minChapter: 8,
        revelation: "The Confessor's revenge motive for the Five Innocents",
      },
    ];

    for (const { pattern, minChapter, revelation } of prematureRevelationChecks) {
      if (currentChapter < minChapter && pattern.test(narrativeOriginal)) {
        issues.push(`PREMATURE REVELATION: "${revelation}" revealed in Chapter ${currentChapter}, but should not appear before Chapter ${minChapter}. This ruins the mystery's pacing.`);
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
    //
    // NOTE: CHOICE RESPECT VIOLATION removed from critical issues (2024-12).
    // The keyword-matching validation is too simplistic - it fails when the LLM
    // uses synonyms/paraphrases (e.g., "confront" vs "face", "suspect" vs "man").
    // Gemini 3 is smart enough to respect player choices without literal keyword checks.
    // The prompt already contains strong instructions to reflect decisions.
    // Keeping keyword check as WARNING only (not critical) to avoid expensive retries.
    //
    // if (s.startsWith('CHOICE RESPECT VIOLATION:')) return true;  // DISABLED - false positives
    if (s.includes('contradicts player choice')) return true;
    if (s.includes('ignores chosen path')) return true;

    // --- TIER 3: LOGICAL IMPOSSIBILITIES ---
    // Dead characters cannot appear alive without explanation
    if (s.includes('character is dead') && s.includes('appears alive')) return true;
    if (s.includes('deceased character speaking')) return true;

    // Major revelations cannot be "re-discovered" - breaks mystery pacing
    if (s.includes('already revealed') && s.includes('re-discovers')) return true;
    if (s.includes('Victoria is Emily') && s.includes('re-reveal')) return true;

    // --- TIER 4: TIMELINE FACTS (Core relationship/event durations) ---
    // These durations are emotionally significant - "30 years of friendship betrayed"
    // is very different from "20 years". Players may notice inconsistencies.
    if (s.includes('Tom Wade friendship is 30 years')) return true;
    if (s.includes('Sarah partnership is 13 years')) return true;
    if (s.includes('Silas partnership is 8 years')) return true;
    if (s.includes('Emily case was closed 7 years ago')) return true;
    if (s.includes('Eleanor has been imprisoned for 8 years')) return true;

    // --- TIER 5: STORY DAY CONSISTENCY ---
    // The story spans exactly 12 days, one per chapter. Wrong day = confusion.
    if (s.startsWith('STORY DAY MISMATCH:')) return true;

    // --- TIER 6: PREMATURE REVELATIONS ---
    // The mystery has a carefully designed revelation gradient.
    // Revealing major twists too early ruins the entire experience.
    if (s.startsWith('PREMATURE REVELATION:')) return true;

    // =======================================================================
    // SOFT FAILURES - Convert to warnings, don't block generation
    // These matter for quality but players are forgiving of minor issues
    // =======================================================================

    // Branching narrative word count - validation still runs, but as warning only
    // Schema now instructs LLM to generate correct lengths, so retries are wasteful
    // if (s.includes('response too short:')) return true;  // DISABLED - warning only
    // if (s.includes('opening too short:')) return true;   // DISABLED - warning only
    // if (s.includes('total too short:')) return true;     // DISABLED - warning only

    // Thread continuity - important but not worth failing over
    // if (s.startsWith('THREAD CONTINUITY VIOLATION:')) return true;  // DISABLED
    // if (s.startsWith('OVERDUE THREAD ERROR:')) return true;  // DISABLED

    // Timeline approximations (vague references) - close enough is fine
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

  // ==========================================================================
  // PROMPT DIAGNOSTICS - Verify all components are being included
  // ==========================================================================

  /**
   * Diagnose prompt building to verify all components are included correctly
   * Call this to debug issues with missing prompt content
   * @returns {Object} Diagnostic report
   */
  diagnosePromptContent() {
    const report = {
      timestamp: new Date().toISOString(),
      components: {},
      issues: [],
      summary: '',
    };

    // Check extended examples
    try {
      const extended = buildExtendedStyleExamples();
      report.components.extendedExamples = {
        length: extended?.length || 0,
        hasContent: !!extended && extended.length > 1000,
        preview: extended?.slice(0, 200) || 'EMPTY',
      };
      if (!extended || extended.length < 1000) {
        report.issues.push('Extended examples missing or too short');
      }
    } catch (e) {
      report.components.extendedExamples = { error: e.message };
      report.issues.push(`Extended examples FAILED: ${e.message}`);
    }

    // Check EXAMPLE_PASSAGES
    try {
      const passageCount = Object.keys(EXAMPLE_PASSAGES).length;
      report.components.examplePassages = {
        count: passageCount,
        keys: Object.keys(EXAMPLE_PASSAGES),
        hasContent: passageCount > 5,
      };
      if (passageCount < 5) {
        report.issues.push('EXAMPLE_PASSAGES has fewer than expected entries');
      }
    } catch (e) {
      report.components.examplePassages = { error: e.message };
      report.issues.push(`EXAMPLE_PASSAGES check failed: ${e.message}`);
    }

    // Check STYLE_EXAMPLES
    try {
      report.components.styleExamples = {
        length: STYLE_EXAMPLES?.length || 0,
        hasContent: !!STYLE_EXAMPLES && STYLE_EXAMPLES.length > 500,
        preview: STYLE_EXAMPLES?.slice(0, 200) || 'EMPTY',
      };
      if (!STYLE_EXAMPLES || STYLE_EXAMPLES.length < 500) {
        report.issues.push('STYLE_EXAMPLES missing or too short');
      }
    } catch (e) {
      report.components.styleExamples = { error: e.message };
      report.issues.push(`STYLE_EXAMPLES check failed: ${e.message}`);
    }

    // Check dramatic irony builder
    try {
      const irony = buildDramaticIronySection(3, 'ROOT', []);
      report.components.dramaticIrony = {
        length: irony?.length || 0,
        hasContent: !!irony && irony.length > 100,
        preview: irony?.slice(0, 200) || 'EMPTY',
      };
      if (!irony || irony.length < 100) {
        report.issues.push('Dramatic irony section empty for test chapter');
      }
    } catch (e) {
      report.components.dramaticIrony = { error: e.message };
      report.issues.push(`Dramatic irony FAILED: ${e.message}`);
    }

    // Check voice DNA builder
    try {
      const voiceDNA = buildVoiceDNASection(['victoria', 'sarah']);
      report.components.voiceDNA = {
        length: voiceDNA?.length || 0,
        hasContent: !!voiceDNA && voiceDNA.length > 200,
        preview: voiceDNA?.slice(0, 200) || 'EMPTY',
      };
      if (!voiceDNA || voiceDNA.length < 200) {
        report.issues.push('Voice DNA section empty for test characters');
      }
    } catch (e) {
      report.components.voiceDNA = { error: e.message };
      report.issues.push(`Voice DNA FAILED: ${e.message}`);
    }

    // Check WRITING_STYLE
    try {
      report.components.writingStyle = {
        hasVoice: !!WRITING_STYLE?.voice,
        hasInfluences: Array.isArray(WRITING_STYLE?.influences),
        hasForbidden: Array.isArray(WRITING_STYLE?.absolutelyForbidden),
        hasMustInclude: Array.isArray(WRITING_STYLE?.mustInclude),
      };
      if (!WRITING_STYLE?.voice || !WRITING_STYLE?.influences) {
        report.issues.push('WRITING_STYLE missing key properties');
      }
    } catch (e) {
      report.components.writingStyle = { error: e.message };
      report.issues.push(`WRITING_STYLE check failed: ${e.message}`);
    }

    // Check CONSISTENCY_RULES
    try {
      report.components.consistencyRules = {
        count: CONSISTENCY_RULES?.length || 0,
        hasContent: CONSISTENCY_RULES?.length > 5,
      };
      if (!CONSISTENCY_RULES || CONSISTENCY_RULES.length < 5) {
        report.issues.push('CONSISTENCY_RULES missing or too few');
      }
    } catch (e) {
      report.components.consistencyRules = { error: e.message };
      report.issues.push(`CONSISTENCY_RULES check failed: ${e.message}`);
    }

    // Summary
    const totalIssues = report.issues.length;
    if (totalIssues === 0) {
      report.summary = '✅ All prompt components verified successfully';
    } else {
      report.summary = `❌ ${totalIssues} issue(s) found with prompt components`;
    }

    console.log('[StoryGen] Prompt Diagnostic Report:');
    console.log(JSON.stringify(report, null, 2));

    return report;
  }

  // ==========================================================================
  // LLM-BASED VALIDATION - Semantic understanding of rule violations
  // ==========================================================================

  /**
   * Validate content using LLM for semantic understanding
   * This catches violations that regex can't detect (e.g., wrong years, contradictions)
   * Uses a fast, cheap LLM call with minimal thinking
   * @param {Object} content - Generated content to validate
   * @param {Object} context - Story context
   * @returns {Promise<Object>} Validation result with issues and suggestions
   */
  async _validateWithLLM(content, context) {
    const narrative = content.narrative || '';

    // Skip for very short content
    if (narrative.length < 200) {
      return { issues: [], suggestions: [], validated: false, reason: 'content too short' };
    }

    console.log(`[StoryGen] 🔍 Running LLM validation on ${narrative.length} chars...`);

    try {
      const validationPrompt = `You are a strict continuity editor for a noir detective story. Check this narrative excerpt for FACTUAL ERRORS against the story bible facts below.

## ABSOLUTE FACTS (Cannot be contradicted):
- Jack Halloway: Late 50s-60s, former Ashport PD detective, 30-year career, forcibly retired
- Tom Wade: Jack's best friend for 30 YEARS (met in college), secretly manufactured evidence for 20 years
- Sarah Reeves: Jack's former partner for 13 YEARS
- Silas Reed: Jack's partner for 8 YEARS (most recent)
- Emily Cross: Now known as Victoria Blackwell / The Midnight Confessor
  - Was 22 when abducted by Deputy Chief Grange (7 years ago)
  - Attempted suicide with 30 Oxycodone pills
  - Jack declared her case closed while she was still in captivity
- Eleanor Bellamy: Wrongfully convicted, imprisoned for 8 YEARS
- Marcus Thornhill: Framed for embezzlement, committed suicide 8 years ago
- Setting: Ashport (rain-soaked, neon-lit, perpetually overcast)
- Story spans EXACTLY 12 DAYS (one chapter per day)

## NARRATIVE TO CHECK:
${narrative.slice(0, 3000)}${narrative.length > 3000 ? '\n[truncated]' : ''}

## INSTRUCTIONS:
1. Look for ANY factual contradictions (wrong years, wrong relationships, wrong names)
2. Check timeline references ("X years ago" must match the facts above)
3. Check character relationships (who knows who, how long)
4. Check setting details (city name, locations)

Respond with JSON:
{
  "hasIssues": true/false,
  "issues": ["specific issue 1", "specific issue 2"],
  "suggestions": ["how to fix issue 1", "how to fix issue 2"],
  "confidence": "high"/"medium"/"low"
}

If no issues found, return: { "hasIssues": false, "issues": [], "suggestions": [], "confidence": "high" }`;

      const response = await llmService.complete(
        [{ role: 'user', content: validationPrompt }],
        {
          systemPrompt: 'You are a meticulous continuity editor. Find factual errors. Be specific. No false positives.',
          maxTokens: 800,
          responseSchema: {
            type: 'object',
            properties: {
              hasIssues: { type: 'boolean' },
              issues: { type: 'array', items: { type: 'string' } },
              suggestions: { type: 'array', items: { type: 'string' } },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['hasIssues', 'issues', 'suggestions', 'confidence'],
          },
          traceId: `validation-${Date.now()}`,
          thinkingLevel: 'low', // Fast validation, don't need deep reasoning
        }
      );

      // Track token usage
      this._trackTokenUsage(response?.usage, 'LLM Validation');

      // Parse response
      let result;
      try {
        result = typeof response.content === 'string'
          ? JSON.parse(response.content)
          : response.content;
      } catch (parseErr) {
        console.warn('[StoryGen] ⚠️ Failed to parse LLM validation response');
        return { issues: [], suggestions: [], validated: false, reason: 'parse error' };
      }

      if (result.hasIssues && result.issues.length > 0) {
        console.log(`[StoryGen] ❌ LLM validation found ${result.issues.length} issues:`);
        result.issues.forEach((issue, i) => {
          console.log(`  ${i + 1}. ${issue}`);
          if (result.suggestions[i]) {
            console.log(`     → Fix: ${result.suggestions[i]}`);
          }
        });
      } else {
        console.log(`[StoryGen] ✅ LLM validation passed (confidence: ${result.confidence})`);
      }

      return {
        issues: result.issues || [],
        suggestions: result.suggestions || [],
        confidence: result.confidence || 'medium',
        validated: true,
      };

    } catch (error) {
      console.warn(`[StoryGen] ⚠️ LLM validation failed:`, error.message);
      return { issues: [], suggestions: [], validated: false, reason: error.message };
    }
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
          maxTokens: 1000, // Increased from 500 - thinking tokens consume budget
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
          // Always keep ROOT - it contains pre-branch facts from Chapters 1-2.
          const current = String(context.lastPathKey || 'ROOT');
          const keep = new Set(keys.filter((k) => k === 'ROOT' || current.startsWith(k)));
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
      // Always include ROOT facts (pre-branch content from Chapters 1-2)
      // plus facts from any path that is a prefix of the current path
      if (k !== 'ROOT' && !pk.startsWith(k)) continue;
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
