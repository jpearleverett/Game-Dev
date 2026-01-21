import { llmService } from '../LLMService';
import { getStoryEntry } from '../../data/storyContent';
import { ABSOLUTE_FACTS, GENERATION_CONFIG } from '../../data/storyBible';
import { saveStoryContext } from '../../storage/generatedStoryStorage';
import { DECISION_CONSEQUENCES } from './constants';

// ==========================================================================
// DYNAMIC CONSEQUENCE GENERATION - Auto-generates consequences for all decisions
// ==========================================================================

/**
 * Ensure we have consequences generated for all player decisions
 * This fills in gaps in the static DECISION_CONSEQUENCES registry
 */
async function _ensureDecisionConsequences(choiceHistory) {
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
function _ensureDecisionConsequencesFast(choiceHistory) {
  const history = Array.isArray(choiceHistory) ? choiceHistory : [];
  if (history.length === 0) return;

  const ctx = this.storyContext || {};
  if (!ctx.decisionConsequencesByKey) ctx.decisionConsequencesByKey = {};

  const deriveFromDecisionEntry = (choice) => {
    const chapter = this._extractChapterFromCase(choice.caseNumber);
    const decisionPathKey = this._getPathKeyForChapter(chapter, history);
    const decisionEntry = this.getGeneratedEntry(choice.caseNumber, decisionPathKey) || getStoryEntry(choice.caseNumber, 'ROOT');
    // Handle both legacy (decision) and new (pathDecisions) formats
    // Use player's actual branching path for path-specific decision lookup
    const decisionData = this._getPathDecisionData(decisionEntry, choice.caseNumber, this.currentBranchingChoices || []);
    const chosen = decisionData?.options?.find((o) => o.key === choice.optionKey)
      || (choice.optionKey === 'A' ? decisionData?.optionA : decisionData?.optionB)
      || null;

    const title = chosen?.title || `Option ${choice.optionKey}`;
    const focus = chosen?.focus || '';
    const stats = chosen?.stats || '';

    const ongoing = [];
    if (typeof stats === 'string') {
      if (stats.toLowerCase().includes('investig')) ongoing.push('Jack gains better leads through evidence');
      if (stats.toLowerCase().includes('aggress')) ongoing.push("Jack's approach grows more confrontational");
    }
    if (typeof focus === 'string' && focus.length > 0) {
      ongoing.unshift(`Tone shift: ${focus}`);
    }

    // Character impact based on approach - not tied to specific non-canonical characters
    const lowerFocus = focus.toLowerCase();
    const characterImpact = {
      aggression: lowerFocus.includes('confront') ? 10 : (lowerFocus.includes('cautious') || lowerFocus.includes('methodical')) ? -5 : 0,
      thoroughness: lowerFocus.includes('evidence') ? 10 : 0,
    };

    // Make the "immediate" consequence feel concrete even without an LLM call.
    // Titles are imperative; convert to an infinitive-ish phrase ("Confront the suspect" -> "confront the suspect").
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
async function _generateDecisionConsequence(choice, fullChoiceHistory = []) {
  const { protagonist, antagonist, setting } = ABSOLUTE_FACTS;
  const chapter = this._extractChapterFromCase(choice.caseNumber);

  // Try to get context from the decision itself if available
  const decisionPathKey = this._getPathKeyForChapter(chapter, fullChoiceHistory);
  const decisionEntry = this.getGeneratedEntry(choice.caseNumber, decisionPathKey);
  // Handle both legacy (decision) and new (pathDecisions) formats
  // Use player's actual branching path for path-specific decision lookup
  const decisionData = this._getPathDecisionData(decisionEntry, choice.caseNumber, this.currentBranchingChoices || []);
  const decisionContext = decisionData?.options?.find(o => o.key === choice.optionKey)
    || (choice.optionKey === 'A' ? decisionData?.optionA : decisionData?.optionB);
  const otherOption = decisionData?.options?.find(o => o.key !== choice.optionKey)
    || (choice.optionKey === 'A' ? decisionData?.optionB : decisionData?.optionA);

  // Extract narrative context for richer consequence generation
  const narrativeContext = decisionEntry?.narrative ? decisionEntry.narrative.slice(-2000) : '';
  const decisionIntro = decisionData?.intro?.[0] || '';
  const activeThreads = (
    decisionEntry?.consistencyFacts ||
    this._getRelevantPersistedConsistencyFacts(decisionPathKey) ||
    []
  ).slice(0, 5);
  const charactersInvolved = decisionData?.options?.flatMap(o => o.characters || []) || [];

  const consequencePrompt = `Generate narrative consequences for a player decision in an interactive mystery thriller with a hidden fantasy layer (the Under-Map).

## STORY CONTEXT
This is "Dead Letters" - ${protagonist.fullName}, a ${protagonist.age}-year-old ${protagonist.formerTitle.toLowerCase()}, is pulled into a hidden reality threaded through ${setting.city}'s streets. ${antagonist.trueName} sends dead letters with glyph strings and tokens that steer him toward thresholds and missing people.

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
        systemPrompt: 'You are generating narrative consequences for player choices in a mystery thriller with a hidden fantasy layer.',
        maxTokens: GENERATION_CONFIG.maxTokens.consequences,
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

/**
 * Build cumulative decision consequences for context
 */
function _buildDecisionConsequences(choiceHistory) {
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

export const decisionConsequenceMethods = {
  _ensureDecisionConsequences,
  _ensureDecisionConsequencesFast,
  _generateDecisionConsequence,
  _buildDecisionConsequences,
};
