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

// Story configuration
const TOTAL_CHAPTERS = 12;
const SUBCHAPTERS_PER_CHAPTER = 3;
const MIN_WORDS_PER_SUBCHAPTER = GENERATION_CONFIG.wordCount.minimum;
const TARGET_WORDS = GENERATION_CONFIG.wordCount.target;
const DECISION_SUBCHAPTER = 3;
const MAX_RETRIES = 2;

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
  },
  required: ['title', 'bridge', 'previously', 'narrative', 'briefing', 'consistencyFacts'],
};

/**
 * Schema for decision point subchapters (end of each chapter)
 */
const DECISION_CONTENT_SCHEMA = {
  type: 'object',
  properties: {
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
  required: ['title', 'bridge', 'previously', 'narrative', 'briefing', 'consistencyFacts', 'decision'],
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
5. You produce MINIMUM ${MIN_WORDS_PER_SUBCHAPTER} words per subchapter (aim for ${TARGET_WORDS})

## VOICE AND STYLE
Channel Raymond Chandler's hard-boiled prose:
- Metaphors grounded in rain, shadows, noir imagery
- Terse, punchy dialogue that reveals character
- World-weary internal monologue laced with self-deprecation
- Sensory details: sounds, smells, textures of the rain-soaked city
- Moral ambiguity without moralizing

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
- "title": Evocative 2-5 word noir chapter title
- "bridge": One short, compelling sentence hook (max 15 words)
- "previously": Concise 1-2 sentence recap of what just happened (max 40 words, from Jack's perspective, past tense)
- "narrative": Your full prose (minimum ${MIN_WORDS_PER_SUBCHAPTER} words, aim for ${TARGET_WORDS})
- "briefing": Mission briefing with "summary" (one sentence objective) and "objectives" (2-3 specific directives)
- "consistencyFacts": Array of 3-5 specific facts that must remain consistent
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
   */
  async buildStoryContext(targetChapter, targetSubchapter, pathKey, choiceHistory = []) {
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
        // Extract first 2-3 sentences as summary
        const sentences = ch.narrative.match(/[^.!?]+[.!?]+/g) || [];
        summary += sentences.slice(0, 3).join(' ').trim();
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
   */
  _buildTaskSection(context, chapter, subchapter, isDecisionPoint) {
    const chaptersRemaining = TOTAL_CHAPTERS - chapter;
    const subchapterLabel = ['A', 'B', 'C'][subchapter - 1];
    const pacing = this._getPacingGuidance(chapter);

    let task = `## CURRENT TASK

Write **Chapter ${chapter}, Subchapter ${subchapter} (${subchapterLabel})**

### STORY POSITION
- Chapter ${chapter} of ${TOTAL_CHAPTERS} (${chaptersRemaining} remaining)
- Subchapter ${subchapter} of 3
- Current path: "${context.currentPosition.pathKey}"
- Phase: ${pacing.phase}

### PACING REQUIREMENTS
${pacing.requirements.map(r => `- ${r}`).join('\n')}

### WRITING REQUIREMENTS
1. **MINIMUM ${MIN_WORDS_PER_SUBCHAPTER} WORDS** (aim for ${TARGET_WORDS})
2. Continue DIRECTLY from where the last subchapter ended
3. Maintain Jack's first-person noir voice throughout
4. Reference specific events from previous chapters (show continuity)
5. Include: atmospheric description, internal monologue, dialogue
6. Build tension appropriate to ${pacing.phase} phase`;

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
    return `## CONSISTENCY VERIFICATION

Before writing, confirm you will maintain these established facts:
${context.establishedFacts.slice(0, 10).map(f => `- ${f}`).join('\n')}

In your "consistencyFacts" array, include 3-5 NEW specific facts from your narrative that future chapters must maintain (e.g., "Jack agreed to meet Sarah at the docks at midnight", "Victoria revealed she knows about the Thornhill case").`;
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
   */
  async generateSubchapter(chapter, subchapter, pathKey, choiceHistory = []) {
    if (!llmService.isConfigured()) {
      throw new Error('LLM Service not configured. Please set an API key in settings.');
    }

    if (chapter <= 1) {
      throw new Error('Chapter 1 uses static content and should not be generated.');
    }

    const caseNumber = formatCaseNumber(chapter, subchapter);
    const isDecisionPoint = subchapter === DECISION_SUBCHAPTER;

    // Build comprehensive context
    const context = await this.buildStoryContext(chapter, subchapter, pathKey, choiceHistory);

    // Build the prompt with all context
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
        board: this._generateBoardData(generatedContent.narrative, isDecisionPoint, generatedContent.decision),
        consistencyFacts: generatedContent.consistencyFacts || [],
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

      this.isGenerating = false;
      return storyEntry;
    } catch (error) {
      this.isGenerating = false;
      throw error;
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
   * Validate content against established facts
   */
  _validateConsistency(content, context) {
    const issues = [];

    // Check for common consistency violations
    const narrative = content.narrative.toLowerCase();

    // Check character names are spelled correctly
    if (narrative.includes('hallaway') || narrative.includes('holloway')) {
      issues.push('Protagonist name misspelled (should be Halloway)');
    }

    if (narrative.includes('blackwood') && !narrative.includes('blackwell')) {
      issues.push('Antagonist name might be wrong (should be Blackwell)');
    }

    // Check for timeline violations
    if (narrative.includes('twenty years') && narrative.includes('tom wade')) {
      issues.push('Tom Wade friendship is 30 years, not 20');
    }

    // Check setting consistency
    if (narrative.includes('sunny') || narrative.includes('sunshine')) {
      issues.push('Ashport should always be rainy/overcast, not sunny');
    }

    return {
      valid: issues.length === 0,
      issues,
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
  _generateBoardData(narrative, isDecisionPoint, decision) {
    const words = this._extractKeywordsFromNarrative(narrative);
    const outlierCount = isDecisionPoint ? 8 : 4;
    const outlierWords = this._selectOutlierWords(words, outlierCount, isDecisionPoint, decision);

    const gridRows = isDecisionPoint ? 5 : 4;
    const gridCols = 4;
    const gridSize = gridRows * gridCols;

    const usedWords = new Set(outlierWords.map(w => w.toUpperCase()));
    const gridWords = [...outlierWords];

    for (const word of words) {
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

    const shuffledWords = this._shuffleArray(uniqueGridWords);

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
