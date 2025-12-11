/**
 * Story Generation Service
 *
 * Handles dynamic story generation using LLM for chapters 2-12.
 * Maintains story context and ensures consistency across all generated content.
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

// Story configuration
const TOTAL_CHAPTERS = 12;
const SUBCHAPTERS_PER_CHAPTER = 3;
const MIN_WORDS_PER_SUBCHAPTER = 500;
const DECISION_SUBCHAPTER = 3; // Decision at end of subchapter 3

// The main characters and themes from Chapter 1 (hardcoded for consistency)
const STORY_FOUNDATION = {
  protagonist: {
    name: 'Jack Halloway',
    role: 'Retired Detective',
    traits: ['world-weary', 'guilt-ridden', 'determined', 'haunted by past'],
    physicalDesc: 'Rumpled trench coat, heavy stubble, tired eyes',
  },
  antagonist: {
    name: 'The Midnight Confessor',
    alias: 'Victoria Blackwell / Emily',
    description: 'Elegant woman, often in red. Seeks revenge for wrongful conviction.',
  },
  setting: {
    city: 'Ashport',
    tone: 'Noir detective fiction, rain-soaked, morally gray',
    era: 'Modern day with noir aesthetics',
  },
  allies: [
    { name: 'Sarah Reeves', role: 'Former partner, still on the force' },
    { name: 'Eleanor Bellamy', role: 'Wrongfully convicted widow' },
    { name: 'Maya Bellamy', role: "Eleanor's daughter" },
  ],
  themes: [
    'Wrongful convictions',
    'The cost of certainty',
    'Redemption vs revenge',
    'Corruption in the justice system',
    'The line between justice and vigilantism',
  ],
  plotElements: {
    twelveCase: 'Twelve cases from Jack\'s career are being revisited',
    mainMystery: 'Who is the Midnight Confessor and what do they want?',
    stakes: 'Innocents may be freed or more may suffer based on Jack\'s choices',
  },
};

// System prompt for story generation
const STORY_SYSTEM_PROMPT = `You are a master noir fiction writer creating an interactive detective story. Your writing style combines:
- Raymond Chandler's hard-boiled prose and metaphors
- Atmospheric, rain-soaked noir settings
- Complex moral dilemmas with no easy answers
- Character-driven narrative with psychological depth
- Mystery elements that build tension across chapters

CRITICAL REQUIREMENTS:
1. MINIMUM 500 WORDS per subchapter - this is mandatory
2. Maintain perfect consistency with all previous story events
3. Never contradict established facts, character traits, or plot points
4. Reference previous events naturally to show continuity
5. Build tension progressively toward the final chapter
6. Every character action must have clear motivation

CHARACTER VOICE GUIDELINES:
- JACK HALLOWAY (protagonist): World-weary, guilt-ridden, self-deprecating internal monologue. Uses noir metaphors about rain, shadows, and sins. Terse dialogue. Example: "Rain fell on Ashport the way memory falls on the guilty."
- VICTORIA BLACKWELL / EMILY CROSS: Elegant, calculating, always three moves ahead. Formal diction with occasional sardonic edge. Example: "Innocence doesn't matter as much as certainty."
- SARAH REEVES: Direct, no-nonsense, increasingly independent. Confrontational when needed. Example: "I'm done being your partner, your subordinate, your anything."
- ELEANOR BELLAMY: Bitter but resilient, voice like gravel and broken glass. Example: "Mrs. died when you sent me here."
- SILAS REED: Defeated, alcoholic, confessional. Broken by his own cowardice.
- HELEN PRICE: Legal precision breaking into emotional rawness as her world collapses.

KEY RELATIONSHIPS TO MAINTAIN:
- Jack and Sarah: Former partners (13 years), she eventually loses faith and walks away
- Jack and Tom Wade: Best friends (30 years), Tom betrayed him by manufacturing evidence
- Jack and Victoria: She orchestrates his "education" about certainty's cost
- Victoria and Grange: He tortured her; she orchestrates his downfall
- The Five Innocents: Eleanor Bellamy, Marcus Thornhill, Dr. Lisa Chen, James Sullivan, Teresa Wade

WRITING STYLE RULES - AVOID THESE AI TELLS:
- Never use em dashes (—). Use commas, periods, or semicolons instead.
- Never use "X is not just Y, it's Z" framing or similar constructions
- Avoid "In a world where..." or "Little did he know..." openings
- Do not use "I couldn't help but..." or "I found myself..."
- Avoid starting sentences with "And" or "But" excessively
- Do not use flowery adverbs like "seemingly," "interestingly," "notably"
- Avoid the word "delve" or "unravel"
- Do not use "a testament to" or "serves as a reminder"
- Write with confidence. No hedging phrases like "It seems" or "Perhaps"
- Keep metaphors grounded and noir-appropriate, not overwrought

PACING GUIDE (12 chapters total):
- Chapters 2-4: Rising action, investigate leads, uncover clues
- Chapters 5-7: Complications, betrayals revealed, stakes escalate
- Chapters 8-10: Confrontations, major revelations, climax approaches
- Chapters 11-12: Resolution, final confrontation, consequences of choices

OUTPUT FORMAT: Write engaging prose in present tense, first person (Jack's perspective).
Include sensory details, internal monologue, and dialogue where appropriate.`;

class StoryGenerationService {
  constructor() {
    this.generatedStory = null;
    this.storyContext = null;
    this.isGenerating = false;
    this.generationQueue = [];
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
    // Chapter 1 is always static (from docx)
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

  /**
   * Build comprehensive story context from all previous content
   */
  async buildStoryContext(targetChapter, targetSubchapter, pathKey, choiceHistory = []) {
    const context = {
      foundation: STORY_FOUNDATION,
      previousChapters: [],
      playerChoices: [],
      currentPosition: {
        chapter: targetChapter,
        subchapter: targetSubchapter,
        pathKey,
      },
    };

    // Add all Chapter 1 content (static from docx)
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
        });
      }
    }

    // Add generated chapters 2 onwards
    for (let ch = 2; ch < targetChapter; ch++) {
      const chapterPathKey = this._getPathKeyForChapter(ch, choiceHistory);
      for (let sub = 1; sub <= SUBCHAPTERS_PER_CHAPTER; sub++) {
        const caseNum = formatCaseNumber(ch, sub);
        const entry = this.getGeneratedEntry(caseNum, chapterPathKey);
        if (entry?.narrative) {
          context.previousChapters.push({
            chapter: ch,
            subchapter: sub,
            pathKey: chapterPathKey,
            title: entry.title || `Chapter ${ch}.${sub}`,
            narrative: entry.narrative,
            decision: entry.decision || null,
          });
        }
      }
    }

    // Add current chapter's previous subchapters
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

    return context;
  }

  /**
   * Generate a single subchapter
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

    // Build context from all previous story content
    const context = await this.buildStoryContext(chapter, subchapter, pathKey, choiceHistory);

    // Build the prompt
    const prompt = this._buildGenerationPrompt(context, chapter, subchapter, isDecisionPoint);

    this.isGenerating = true;
    try {
      const response = await llmService.complete(
        [{ role: 'user', content: prompt }],
        {
          systemPrompt: STORY_SYSTEM_PROMPT,
          temperature: 0.85,
          maxTokens: 3000,
        }
      );

      const generatedContent = this._parseGeneratedContent(response.content, isDecisionPoint);

      // Validate minimum word count
      const wordCount = generatedContent.narrative.split(/\s+/).length;
      if (wordCount < MIN_WORDS_PER_SUBCHAPTER) {
        // Request expansion if too short
        const expandedResponse = await this._expandNarrative(
          generatedContent.narrative,
          context,
          MIN_WORDS_PER_SUBCHAPTER - wordCount
        );
        generatedContent.narrative = expandedResponse;
      }

      // Build the full story entry
      const storyEntry = {
        chapter,
        subchapter,
        pathKey,
        caseNumber,
        title: generatedContent.title,
        narrative: generatedContent.narrative,
        bridgeText: generatedContent.bridgeText,
        decision: isDecisionPoint ? generatedContent.decision : null,
        board: this._generateBoardData(generatedContent.narrative, isDecisionPoint, generatedContent.decision),
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

  /**
   * Build character reference summary for the LLM
   */
  _buildCharacterContext() {
    const { protagonist, antagonist, allies, villains, victims } = CHARACTER_REFERENCE;

    return `
CHARACTER REFERENCE (maintain consistency):

PROTAGONIST - ${protagonist.name}:
- Role: ${protagonist.role}
- Physical: ${protagonist.physicalDescription.appearance}
- Core traits: ${protagonist.personality.coreTraits.slice(0, 4).join(', ')}
- Key flaws: ${protagonist.personality.flaws.slice(0, 3).join(', ')}
- Voice: ${protagonist.voiceAndStyle.narrative}

ANTAGONIST - ${antagonist.name} (aliases: ${antagonist.aliases.join(', ')}):
- Role: ${antagonist.role}
- Physical: ${antagonist.physicalDescription.appearance}
- Core traits: ${antagonist.personality.coreTraits.slice(0, 4).join(', ')}
- Backstory: Art student victimized by Richard Bellamy, kidnapped/tortured by Grange, "died" 7 years ago
- Communication: Black envelopes, red wax seal, signs as "M.C." or "V.A."

KEY ALLIES:
- Sarah Reeves: Jack's former partner (13 years), competent detective, eventually starts Conviction Integrity Project
- Eleanor Bellamy: Wrongfully convicted widow, 8 years in Greystone, bitter but resilient
- Maya Bellamy: Eleanor's daughter, determined to prove mother's innocence
- Rebecca Moss: Defense attorney representing the innocents

KEY ANTAGONISTS/CORRUPT OFFICIALS:
- Tom Wade: Chief Forensic Examiner, Jack's best friend (30 years), manufactured evidence
- Silas Reed: Jack's former partner, blackmailed into framing Marcus Thornhill
- Helen Price: ADA "Queen of Convictions", 53 wins built on manufactured evidence
- Deputy Chief William Grange: Serial kidnapper/torturer, held Emily captive
- The Overseer: Shadowy figure controlling systemic corruption

THE FIVE INNOCENTS (wrongfully convicted):
1. Eleanor Bellamy - murder (framed with planted sapphire necklace)
2. Marcus Thornhill - embezzlement (framed, committed suicide in lockup)
3. Dr. Lisa Chen - reported evidence tampering, was silenced
4. James Sullivan - details revealed later
5. Teresa Wade - Tom's own daughter, convicted with his methods

SECONDARY CHARACTERS:
- Claire Thornhill: Marcus's daughter, waitress, spent 4 years proving father was framed
- Marcus Webb: Antique dealer/information broker, secretly loved Richard Bellamy
- Agent Luis Martinez: FBI agent investigating Ashport corruption
- Richard Bellamy: Eleanor's dead husband, art dealer, was being blackmailed`;
  }

  /**
   * Build the generation prompt based on context
   */
  _buildGenerationPrompt(context, chapter, subchapter, isDecisionPoint) {
    const chaptersRemaining = TOTAL_CHAPTERS - chapter;
    const subchapterLabel = ['A', 'B', 'C'][subchapter - 1];

    // Build previous story summary
    let previousSummary = 'PREVIOUS STORY EVENTS:\n\n';

    // Recent chapters (last 2-3 for detail)
    const recentChapters = context.previousChapters.slice(-6);
    recentChapters.forEach(ch => {
      previousSummary += `--- Chapter ${ch.chapter}.${ch.subchapter} (${ch.title}) ---\n`;
      // Include full narrative for recent chapters
      if (ch.chapter >= chapter - 1) {
        previousSummary += ch.narrative + '\n';
      } else {
        // Summarize older chapters to save tokens
        const sentences = ch.narrative.split(/[.!?]+/).slice(0, 5);
        previousSummary += sentences.join('. ') + '...\n';
      }
      if (ch.decision) {
        previousSummary += `DECISION MADE: Player chose option "${ch.decision.selectedOption || 'unknown'}"\n`;
      }
      previousSummary += '\n';
    });

    // Add player choices
    if (context.playerChoices.length > 0) {
      previousSummary += '\nPLAYER CHOICE HISTORY:\n';
      context.playerChoices.forEach(choice => {
        previousSummary += `- Chapter ${choice.chapter}: Chose path "${choice.optionKey}"\n`;
      });
    }

    // Add character reference for consistency
    const characterContext = this._buildCharacterContext();

    let prompt = `${previousSummary}

${characterContext}

CURRENT TASK: Write Chapter ${chapter}, Subchapter ${subchapter} (${subchapterLabel})

STORY POSITION:
- This is chapter ${chapter} of ${TOTAL_CHAPTERS} (${chaptersRemaining} chapters remaining after this)
- Subchapter ${subchapter} of 3
- Player is on path: "${context.currentPosition.pathKey}"

PACING REQUIREMENTS:
${this._getPacingGuidance(chapter, subchapter)}

WRITING REQUIREMENTS:
1. MINIMUM ${MIN_WORDS_PER_SUBCHAPTER} WORDS - this is mandatory
2. Continue directly from where the previous subchapter ended
3. Maintain Jack Halloway's first-person noir voice
4. Reference specific events, characters, and details from previous chapters
5. Include atmospheric descriptions, internal monologue, and dialogue
6. Build tension appropriate to this point in the story`;

    if (isDecisionPoint) {
      prompt += `

DECISION POINT REQUIREMENTS:
This subchapter MUST end with a meaningful choice for the player.
The decision should:
1. Present two distinct paths (Option A and Option B)
2. Both options must be morally complex - no obvious "right" answer
3. Each choice should have clear consequences that affect future chapters
4. The choice should feel natural to the story, not forced

FORMAT YOUR DECISION AS:
[DECISION]
INTRO: [1-2 sentences setting up the dilemma]
OPTION_A_KEY: A
OPTION_A_TITLE: [Short action statement, e.g., "Confront the suspect directly"]
OPTION_A_FOCUS: [Brief description of this approach]
OPTION_B_KEY: B
OPTION_B_TITLE: [Short action statement, e.g., "Gather more evidence first"]
OPTION_B_FOCUS: [Brief description of this approach]
[/DECISION]`;
    }

    prompt += `

OUTPUT FORMAT:
[TITLE]
Your chapter title here
[/TITLE]

[BRIDGE]
One sentence summary/hook for this subchapter (shown before the puzzle)
[/BRIDGE]

[NARRATIVE]
Your full narrative here (minimum ${MIN_WORDS_PER_SUBCHAPTER} words)
[/NARRATIVE]`;

    if (isDecisionPoint) {
      prompt += `

[DECISION]
...as described above...
[/DECISION]`;
    }

    return prompt;
  }

  /**
   * Get pacing guidance based on chapter position
   */
  _getPacingGuidance(chapter, subchapter) {
    if (chapter <= 3) {
      return `EARLY STORY (Chapters 2-3):
- Continue establishing the mystery
- Introduce new suspects or complications
- Jack should be actively investigating
- Build relationships with allies/adversaries
- Plant seeds for later revelations`;
    } else if (chapter <= 6) {
      return `RISING ACTION (Chapters 4-6):
- Escalate the stakes significantly
- Reveal betrayals or hidden connections
- Jack faces increasing danger
- Moral dilemmas become more complex
- The Confessor's plan becomes clearer`;
    } else if (chapter <= 9) {
      return `COMPLICATIONS (Chapters 7-9):
- Major revelations about the conspiracy
- Jack must confront his past mistakes
- Allies may be lost or trust broken
- The truth about wrongful convictions exposed
- Personal cost to Jack escalates`;
    } else if (chapter <= 11) {
      return `CLIMAX (Chapters 10-11):
- Direct confrontation approaching
- All threads coming together
- Jack must make impossible choices
- The full scope of the conspiracy revealed
- Redemption or damnation hangs in balance`;
    } else {
      return `RESOLUTION (Chapter 12):
- Final confrontation with the Confessor
- Consequences of all choices manifest
- Resolution of the main mystery
- Jack's fate is determined
- Provide satisfying conclusion based on player's path`;
    }
  }

  /**
   * Parse generated content from LLM response
   */
  _parseGeneratedContent(content, isDecisionPoint) {
    const result = {
      title: 'Untitled',
      bridgeText: '',
      narrative: '',
      decision: null,
    };

    // Extract title
    const titleMatch = content.match(/\[TITLE\]([\s\S]*?)\[\/TITLE\]/);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
    }

    // Extract bridge text
    const bridgeMatch = content.match(/\[BRIDGE\]([\s\S]*?)\[\/BRIDGE\]/);
    if (bridgeMatch) {
      result.bridgeText = bridgeMatch[1].trim();
    }

    // Extract narrative
    const narrativeMatch = content.match(/\[NARRATIVE\]([\s\S]*?)\[\/NARRATIVE\]/);
    if (narrativeMatch) {
      result.narrative = narrativeMatch[1].trim();
    } else {
      // Fallback: use everything not in tags
      result.narrative = content
        .replace(/\[TITLE\][\s\S]*?\[\/TITLE\]/g, '')
        .replace(/\[BRIDGE\][\s\S]*?\[\/BRIDGE\]/g, '')
        .replace(/\[DECISION\][\s\S]*?\[\/DECISION\]/g, '')
        .trim();
    }

    // Extract decision if present
    if (isDecisionPoint) {
      const decisionMatch = content.match(/\[DECISION\]([\s\S]*?)\[\/DECISION\]/);
      if (decisionMatch) {
        result.decision = this._parseDecision(decisionMatch[1]);
      }
    }

    return result;
  }

  /**
   * Parse decision block
   */
  _parseDecision(decisionText) {
    const decision = {
      intro: [],
      options: [],
    };

    // Extract intro
    const introMatch = decisionText.match(/INTRO:\s*(.+)/);
    if (introMatch) {
      decision.intro = [introMatch[1].trim()];
    }

    // Extract Option A
    const optionAKey = decisionText.match(/OPTION_A_KEY:\s*(\w+)/)?.[1] || 'A';
    const optionATitle = decisionText.match(/OPTION_A_TITLE:\s*(.+)/)?.[1]?.trim() || 'Option A';
    const optionAFocus = decisionText.match(/OPTION_A_FOCUS:\s*(.+)/)?.[1]?.trim() || '';

    // Extract Option B
    const optionBKey = decisionText.match(/OPTION_B_KEY:\s*(\w+)/)?.[1] || 'B';
    const optionBTitle = decisionText.match(/OPTION_B_TITLE:\s*(.+)/)?.[1]?.trim() || 'Option B';
    const optionBFocus = decisionText.match(/OPTION_B_FOCUS:\s*(.+)/)?.[1]?.trim() || '';

    // Get current chapter from context for nextChapter calculation
    const chapterMatch = decisionText.match(/chapter\s*(\d+)/i);
    const currentChapter = chapterMatch ? parseInt(chapterMatch[1]) : 2;

    decision.options = [
      {
        key: optionAKey,
        title: optionATitle,
        focus: optionAFocus,
        consequence: null,
        stats: null,
        outcome: null,
        nextChapter: currentChapter + 1,
        nextPathKey: optionAKey,
        details: [],
      },
      {
        key: optionBKey,
        title: optionBTitle,
        focus: optionBFocus,
        consequence: null,
        stats: null,
        outcome: null,
        nextChapter: currentChapter + 1,
        nextPathKey: optionBKey,
        details: [],
      },
    ];

    return decision;
  }

  /**
   * Generate board data for the puzzle
   * Ensures all words are from the narrative with no duplicates
   * For decision points, creates branchingOutlierSets with themed sets for each option
   */
  _generateBoardData(narrative, isDecisionPoint, decision) {
    // Extract meaningful words from narrative for the puzzle
    const words = this._extractKeywordsFromNarrative(narrative);

    // For decision points, we need 8 outliers (2 sets of 4)
    // For regular subchapters, we need 4 outliers
    const outlierCount = isDecisionPoint ? 8 : 4;

    // Select outlier words based on themes
    const outlierWords = this._selectOutlierWords(words, outlierCount, isDecisionPoint, decision);

    // Generate grid (4x4 for normal, 4x5 for branching)
    const gridRows = isDecisionPoint ? 5 : 4;
    const gridCols = 4;
    const gridSize = gridRows * gridCols;

    // Use a Set to track used words and prevent duplicates
    const usedWords = new Set(outlierWords.map(w => w.toUpperCase()));
    const gridWords = [...outlierWords];

    // Add non-outlier words from narrative to fill the grid
    for (const word of words) {
      if (gridWords.length >= gridSize) break;
      const upperWord = word.toUpperCase();
      if (!usedWords.has(upperWord)) {
        gridWords.push(upperWord);
        usedWords.add(upperWord);
      }
    }

    // If still not enough words, use noir-themed filler words
    // Extended list to ensure we always have enough unique options
    const fillerWords = [
      'SHADOW', 'TRUTH', 'LIE', 'NIGHT', 'RAIN', 'SMOKE', 'BLOOD', 'DEATH',
      'GUILT', 'ALIBI', 'CRIME', 'BADGE', 'CLUE', 'FEAR', 'DARK', 'NOIR',
      'VICE', 'DREAD', 'KNIFE', 'GLASS', 'BOOZE', 'DAME', 'GRIFT', 'HEIST',
      'MOTIVE', 'CORPSE', 'VAULT', 'CHASE', 'BLIND', 'TRAIL', 'MARK',
      'SNITCH', 'BRASS', 'STREET', 'ALLEY', 'DOCK', 'PIER', 'WHARF', 'TORCH',
    ];

    // Shuffle fillers and add unique ones as needed
    const shuffledFillers = this._shuffleArray([...fillerWords]);
    for (const filler of shuffledFillers) {
      if (gridWords.length >= gridSize) break;
      const upperFiller = filler.toUpperCase();
      if (!usedWords.has(upperFiller)) {
        gridWords.push(upperFiller);
        usedWords.add(upperFiller);
      }
    }

    // Final safety check - ensure exactly gridSize unique words
    const uniqueGridWords = [...new Set(gridWords)].slice(0, gridSize);

    // If somehow still not enough, generate sequential fallbacks
    while (uniqueGridWords.length < gridSize) {
      const fallback = `CASE${uniqueGridWords.length}`;
      if (!usedWords.has(fallback)) {
        uniqueGridWords.push(fallback);
        usedWords.add(fallback);
      }
    }

    // Shuffle grid words
    const shuffledWords = this._shuffleArray(uniqueGridWords);

    // Create grid structure
    const grid = [];
    for (let row = 0; row < gridRows; row++) {
      grid.push(shuffledWords.slice(row * gridCols, (row + 1) * gridCols));
    }

    // Build board result
    const boardResult = {
      outlierWords: outlierWords.slice(0, isDecisionPoint ? 8 : 4),
      grid,
      outlierTheme: {
        name: this._determineTheme(outlierWords),
        icon: '\ud83d\udd0e',
        summary: narrative.substring(0, 100) + '...',
      },
    };

    // For decision points, create branchingOutlierSets structure
    // This is critical for EvidenceBoardScreen to display two colored sets
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

  /**
   * Truncate theme name for display
   */
  _truncateThemeName(title) {
    if (!title) return null;
    // Extract first few meaningful words, max 12 chars
    const words = title.split(/\s+/).slice(0, 2).join(' ');
    return words.length > 12 ? words.slice(0, 12).toUpperCase() : words.toUpperCase();
  }

  /**
   * Extract keywords from narrative text
   * Prioritizes nouns, verbs, and adjectives that relate to the story
   */
  _extractKeywordsFromNarrative(narrative) {
    // Comprehensive stop words to exclude (common words that don't add puzzle value)
    const stopWords = new Set([
      // Articles, conjunctions, prepositions
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'under', 'over', 'out', 'off',
      // Pronouns
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
      'them', 'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours',
      'this', 'that', 'these', 'those', 'who', 'whom', 'which', 'what',
      // Common verbs
      'is', 'was', 'are', 'were', 'been', 'be', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'must', 'shall', 'can', 'get', 'got', 'getting', 'let', 'make', 'made',
      'say', 'said', 'says', 'tell', 'told', 'ask', 'asked', 'know', 'knew',
      'think', 'thought', 'see', 'saw', 'seen', 'look', 'looked', 'looking',
      'come', 'came', 'coming', 'go', 'went', 'gone', 'going', 'take', 'took',
      'want', 'wanted', 'need', 'needed', 'seem', 'seemed', 'keep', 'kept',
      // Adverbs and modifiers
      'very', 'really', 'quite', 'just', 'only', 'even', 'also', 'too', 'so',
      'now', 'then', 'here', 'there', 'when', 'where', 'why', 'how', 'well',
      'still', 'already', 'always', 'never', 'ever', 'often', 'sometimes',
      // Quantifiers
      'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
      'such', 'no', 'not', 'any', 'many', 'much', 'own', 'same', 'than',
      // Common adjectives
      'good', 'bad', 'new', 'old', 'first', 'last', 'long', 'great', 'little',
      'own', 'other', 'big', 'small', 'large', 'high', 'right', 'left',
      // Time words
      'time', 'year', 'day', 'way', 'thing', 'man', 'woman', 'life', 'world',
      // Filler words
      'like', 'back', 'about', 'after', 'again', 'against', 'because', 'before',
      'between', 'down', 'even', 'find', 'found', 'give', 'gave', 'hand',
      'head', 'eyes', 'face', 'voice', 'room', 'door', 'turn', 'turned',
      // Story-specific common words to exclude
      'jack', 'halloway', 'detective', 'case', 'chapter', 'story',
    ]);

    // Extract words - prefer longer, more specific words
    const words = narrative
      .toUpperCase()
      .replace(/[^A-Z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => {
        const lowerWord = word.toLowerCase();
        return word.length >= 4 && // Minimum 4 chars for better words
               word.length <= 10 && // Max 10 chars for display
               !stopWords.has(lowerWord) &&
               !/^[AEIOU]+$/.test(word) && // Skip vowel-only
               !/(.)\1{2,}/.test(word); // Skip words with 3+ repeated chars
      });

    // Count frequency and track word positions for relevance
    const frequency = {};
    const firstOccurrence = {};
    words.forEach((word, index) => {
      if (!frequency[word]) {
        frequency[word] = 0;
        firstOccurrence[word] = index;
      }
      frequency[word]++;
    });

    // Score words by: frequency + bonus for appearing early + bonus for length
    const scored = Object.entries(frequency).map(([word, freq]) => {
      const positionBonus = 1 - (firstOccurrence[word] / words.length) * 0.5;
      const lengthBonus = Math.min(word.length / 8, 1) * 0.3;
      const score = freq * (1 + positionBonus + lengthBonus);
      return { word, score };
    });

    // Sort by score and return unique words
    return scored
      .sort((a, b) => b.score - a.score)
      .map(({ word }) => word)
      .slice(0, 60); // Get more candidates for better selection
  }

  /**
   * Select outlier words for the puzzle
   * Ensures no duplicates between sets for decision points
   */
  _selectOutlierWords(availableWords, count, isDecisionPoint, decision) {
    // Track used words to prevent duplicates
    const usedWords = new Set();

    // For decision points, create two distinct themed sets (4 words each)
    if (isDecisionPoint && decision?.options) {
      const setA = this._selectThemedWords(availableWords, 4, decision.options[0]?.focus, usedWords);
      setA.forEach(w => usedWords.add(w.toUpperCase()));

      const remainingWords = availableWords.filter(w => !usedWords.has(w.toUpperCase()));
      const setB = this._selectThemedWords(remainingWords, 4, decision.options[1]?.focus, usedWords);

      // Ensure we have exactly 8 unique words
      const combined = [...setA, ...setB];
      const uniqueCombined = [...new Set(combined.map(w => w.toUpperCase()))];

      // If we don't have enough, fill from remaining available words
      const stillAvailable = availableWords.filter(w => !uniqueCombined.includes(w.toUpperCase()));
      while (uniqueCombined.length < 8 && stillAvailable.length > 0) {
        uniqueCombined.push(stillAvailable.shift().toUpperCase());
      }

      return uniqueCombined.slice(0, 8);
    }

    // For regular subchapters, pick the top scoring unique words
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

  /**
   * Select words related to a theme
   * @param {Set} excludeWords - Words to exclude (already used)
   */
  _selectThemedWords(words, count, themeFocus, excludeWords = new Set()) {
    // Filter out already used words
    const availableWords = words.filter(w => !excludeWords.has(w.toUpperCase()));

    if (!themeFocus || availableWords.length === 0) {
      return availableWords.slice(0, count);
    }

    // Extract keywords from the theme focus
    const themeWords = themeFocus
      .toUpperCase()
      .replace(/[^A-Z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3);

    // Score words by theme relevance
    const scored = availableWords.map(word => {
      const upperWord = word.toUpperCase();
      let score = 0;

      // Check if word matches or contains theme words
      for (const tw of themeWords) {
        if (upperWord === tw) score += 3;
        else if (upperWord.includes(tw)) score += 2;
        else if (tw.includes(upperWord)) score += 1;
      }

      return { word: upperWord, score };
    });

    // Sort by theme relevance, then take top words
    scored.sort((a, b) => b.score - a.score);

    // Get unique words up to count
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

  /**
   * Determine a theme name for the outliers
   */
  _determineTheme(outlierWords) {
    // Simple theme detection based on common patterns
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

  /**
   * Expand narrative if too short
   */
  async _expandNarrative(narrative, context, additionalWords) {
    const expandPrompt = `The following narrative needs to be expanded by approximately ${additionalWords} more words while maintaining the same style, tone, and story continuity.

CURRENT NARRATIVE:
${narrative}

REQUIREMENTS:
1. Add more atmospheric description
2. Expand internal monologue
3. Add dialogue if appropriate
4. Include sensory details
5. Do not change the plot or ending
6. Maintain Jack Halloway's noir voice

Output ONLY the expanded narrative, nothing else.`;

    const response = await llmService.complete(
      [{ role: 'user', content: expandPrompt }],
      { temperature: 0.8, maxTokens: 2000 }
    );

    return response.content;
  }

  /**
   * Update story context after generation
   */
  async _updateStoryContext(entry) {
    const context = this.storyContext || {
      characters: {},
      plotPoints: [],
      revelations: [],
      relationships: {},
    };

    // Extract and store important story elements
    // This helps maintain consistency in future generations

    context.lastGeneratedChapter = entry.chapter;
    context.lastGeneratedSubchapter = entry.subchapter;
    context.lastPathKey = entry.pathKey;

    this.storyContext = context;
    await saveStoryContext(context);
  }

  /**
   * Helper to get path key for a specific chapter
   */
  _getPathKeyForChapter(chapter, choiceHistory) {
    const choice = choiceHistory.find(c => {
      const choiceChapter = this._extractChapterFromCase(c.caseNumber);
      return choiceChapter === chapter - 1;
    });
    return choice?.optionKey || 'ROOT';
  }

  /**
   * Extract chapter number from case number
   */
  _extractChapterFromCase(caseNumber) {
    if (!caseNumber) return 1;
    const chapterPart = caseNumber.slice(0, 3);
    return parseInt(chapterPart, 10) || 1;
  }

  /**
   * Shuffle array helper
   */
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
