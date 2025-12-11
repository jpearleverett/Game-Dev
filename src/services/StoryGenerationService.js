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

    let prompt = `${previousSummary}

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

    // Fill grid with words
    const gridWords = [...outlierWords];
    const nonOutliers = words.filter(w => !outlierWords.includes(w));

    // Add non-outlier words to fill the grid
    while (gridWords.length < gridSize && nonOutliers.length > 0) {
      gridWords.push(nonOutliers.shift());
    }

    // Fill remaining spots with common noir words if needed
    const fillerWords = ['SHADOW', 'TRUTH', 'LIE', 'NIGHT', 'RAIN', 'SMOKE', 'BLOOD', 'DEATH'];
    while (gridWords.length < gridSize) {
      const filler = fillerWords[Math.floor(Math.random() * fillerWords.length)];
      if (!gridWords.includes(filler)) {
        gridWords.push(filler);
      }
    }

    // Shuffle grid words
    const shuffledWords = this._shuffleArray(gridWords.slice(0, gridSize));

    // Create grid structure
    const grid = [];
    for (let row = 0; row < gridRows; row++) {
      grid.push(shuffledWords.slice(row * gridCols, (row + 1) * gridCols));
    }

    // Create outlier theme
    const themeName = this._determineTheme(outlierWords);

    return {
      outlierWords: outlierWords.slice(0, isDecisionPoint ? 8 : 4),
      grid,
      outlierTheme: {
        name: themeName,
        icon: '\ud83d\udd0e',
        summary: narrative.substring(0, 100) + '...',
      },
    };
  }

  /**
   * Extract keywords from narrative text
   */
  _extractKeywordsFromNarrative(narrative) {
    // Common words to exclude
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this',
      'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'him', 'us',
      'them', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
      'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
      'such', 'no', 'not', 'only', 'same', 'so', 'than', 'too', 'very',
      'just', 'also', 'now', 'here', 'there', 'then', 'once', 'again',
    ]);

    // Extract words
    const words = narrative
      .toUpperCase()
      .replace(/[^A-Z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 3 && word.length <= 12 && !stopWords.has(word.toLowerCase()));

    // Count frequency
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Sort by frequency and return unique words
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 50);
  }

  /**
   * Select outlier words for the puzzle
   */
  _selectOutlierWords(availableWords, count, isDecisionPoint, decision) {
    // For decision points, create two themed sets
    if (isDecisionPoint && decision?.options) {
      const setA = this._selectThemedWords(availableWords, 4, decision.options[0]?.focus);
      const setB = this._selectThemedWords(
        availableWords.filter(w => !setA.includes(w)),
        4,
        decision.options[1]?.focus
      );
      return [...setA, ...setB];
    }

    // For regular subchapters, just pick 4 thematically related words
    return availableWords.slice(0, count);
  }

  /**
   * Select words related to a theme
   */
  _selectThemedWords(words, count, themeFocus) {
    if (!themeFocus) {
      return words.slice(0, count);
    }

    // Extract keywords from the theme focus
    const themeWords = themeFocus
      .toUpperCase()
      .replace(/[^A-Z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3);

    // Find words that might relate to the theme
    const themeRelated = words.filter(word =>
      themeWords.some(tw => word.includes(tw) || tw.includes(word))
    );

    // Combine theme-related and other words
    const result = [...new Set([...themeRelated, ...words])];
    return result.slice(0, count);
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
