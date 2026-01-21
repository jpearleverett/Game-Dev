import {
  ABSOLUTE_FACTS,
  REVEAL_TIMING,
  WRITING_STYLE,
  EXAMPLE_PASSAGES,
  ENGAGEMENT_REQUIREMENTS,
  MICRO_TENSION_TECHNIQUES,
  SENTENCE_RHYTHM,
} from '../../data/storyBible';
import { MANY_SHOT_METADATA, MANY_SHOT_SCENES } from '../../data/manyShot';
import { TOTAL_CHAPTERS } from './constants';
import { extractRecentDialogue } from './helpers';

const DEFAULT_MANY_SHOT_CATEGORIES = ['dialogue_tension', 'internal_monologue', 'investigation'];

const MANY_SHOT_CATEGORY_MAP = {
  // Subchapter beat types
  'Opening/Hook (A)': ['setup', 'atmospheric', 'internal_monologue'],
  'Development/Conflict (B)': ['dialogue_tension', 'confrontation', 'investigation'],
  'Resolution/Decision (C)': ['decision_point', 'revelation', 'aftermath'],

  // Chapter beat types
  CHASE: ['action', 'dialogue_tension'],
  BOTTLE_EPISODE: ['dialogue_tension', 'internal_monologue', 'confrontation'],
  CONFRONTATION: ['confrontation', 'dialogue_tension', 'revelation'],
  BETRAYAL: ['revelation', 'aftermath', 'darkest_moment'],
  INVESTIGATION: ['investigation', 'interrogation', 'internal_monologue'],
  SETUP: ['setup', 'atmospheric'],
  CLIMAX: ['action', 'confrontation', 'revelation'],
  RESOLUTION: ['aftermath', 'decision_point', 'revelation'],
  INCITING_INCIDENT: ['setup', 'atmospheric', 'investigation'],
  REVELATION: ['revelation', 'internal_monologue', 'aftermath'],
  RELATIONSHIP: ['dialogue_tension', 'internal_monologue', 'aftermath'],
  TENSION: ['dialogue_tension', 'atmospheric', 'investigation'],
  RECKONING: ['aftermath', 'revelation', 'confrontation'],
};

export const getManyShotCategories = (beatType, chapterBeatType) => {
  const chapterCategories = (chapterBeatType?.type && MANY_SHOT_CATEGORY_MAP[chapterBeatType.type])
    ? MANY_SHOT_CATEGORY_MAP[chapterBeatType.type]
    : [];
  const subchapterCategories = (beatType && MANY_SHOT_CATEGORY_MAP[beatType])
    ? MANY_SHOT_CATEGORY_MAP[beatType]
    : [];

  if (chapterCategories.length || subchapterCategories.length) {
    const merged = [...chapterCategories, ...subchapterCategories].filter(Boolean);
    const deduped = [...new Set(merged)];
    return {
      source: chapterCategories.length && subchapterCategories.length ? 'chapter+subchapter' : chapterCategories.length ? 'chapter' : 'subchapter',
      key: `${chapterBeatType?.type || 'none'}|${beatType || 'none'}`,
      categories: deduped,
    };
  }

  return {
    source: 'default',
    key: 'default',
    categories: DEFAULT_MANY_SHOT_CATEGORIES,
  };
};

// ============================================================================
// PATHDECISIONS SYSTEM PROMPT - Story context for path-specific decisions
// Per Gemini 3 best practices: XML tags, persona, explicit constraints
// Enhanced with style/voice guidance for consistency with main narrative
// ============================================================================
export const buildPathDecisionsSystemPrompt = () => {
  const { protagonist, antagonist, setting } = ABSOLUTE_FACTS;
  const { voice } = WRITING_STYLE;

  return `<identity>
You are the author of "Dead Letters," crafting path-specific decision variants for ${protagonist.fullName}'s investigation.
You understand that different player journeys through the branching narrative lead to genuinely different discoveries, and those discoveries MUST shape what decisions make sense.
</identity>

<story_context>
- PROTAGONIST: ${protagonist.fullName}, ${protagonist.age}, ${protagonist.formerTitle.toLowerCase()}. ${protagonist.currentStatus}
- SETTING: ${setting.city}, ${setting.atmosphere}. A city with a hidden second layer called "the Under-Map" threaded through its infrastructure.
- TONE: Modern mystery thriller that slowly reveals an original fantasy world. Noir-adjacent but not pastiche.
- ANTAGONIST: ${antagonist.trueName}, ${antagonist.occupation}. Her philosophy: "${antagonist.philosophy}"
</story_context>

<voice_constraints>
- POV/Tense: ${voice.perspective}, ${voice.tense}
- Tone: ${voice.tone}
- Decision intros should match the narrative voice: atmospheric, precise, noir-adjacent
- Option titles: imperative mood, 3-8 words, action-oriented (e.g., "Follow the courier" not "You could follow the courier")
- Option focus: one sentence explaining stakes and tradeoffs
</voice_constraints>

<core_mandate>
Each of the 9 branching paths represents a DIFFERENT player experience. The decisions you generate must reflect what THAT specific player discovered, not generic options that could apply to any path.

CRITICAL: If a player discovered a name, their decision should involve that name. If they witnessed a threshold react, their decision should involve that threshold. The discoveries ARE the decision drivers.
</core_mandate>

<output_contract>
Return ONLY valid JSON matching the schema. No commentary.
</output_contract>`;
};

// ============================================================================
// PATHDECISIONS PROMPT TEMPLATE - Structured per Gemini 3 best practices
// Uses XML tags, explicit planning, few-shot examples, causality mapping
// IMPORTANT: Uses SUMMARIES (15-25 words each) instead of full narrative content.
// Full narrative excerpts trigger Gemini's RECITATION safety filter.
// ============================================================================
export const PATHDECISIONS_PROMPT_TEMPLATE = `<task>
Generate 9 UNIQUE path-specific decision variants for Case {{caseNumber}} (Chapter {{chapter}}.{{subchapter}}) of "Dead Letters."
Each path represents a different player journey. Different discoveries require different decisions.
</task>

<path_structure>
The 9 paths follow this format: [FIRST_CHOICE]-[ENDING]
- FIRST_CHOICE (1A, 1B, 1C): How the player APPROACHED the scene (their investigative style)
- ENDING (2A, 2B, 2C): What the player DISCOVERED as a result

Path keys: 1A-2A, 1A-2B, 1A-2C, 1B-2A, 1B-2B, 1B-2C, 1C-2A, 1C-2B, 1C-2C
</path_structure>

<player_approaches>
These are the three ways the player could have approached this scene:
- 1A: "{{firstChoice1ALabel}}" → {{firstChoice1ASummary}}
- 1B: "{{firstChoice1BLabel}}" → {{firstChoice1BSummary}}
- 1C: "{{firstChoice1CLabel}}" → {{firstChoice1CSummary}}
</player_approaches>

<path_discoveries>
These are what each path discovered (the ending they experienced):
{{pathSummaries}}
</path_discoveries>

<path_details>
Detailed notes for each path (use these to stay grounded; do not invent entities not mentioned):
{{pathStructuredNotes}}
</path_details>

<canonical_decision_reference>
The main narrative pass generated this base decision (use as inspiration, not constraint):
- Option A: "{{optionATitle}}" ({{optionAFocus}})
- Option B: "{{optionBTitle}}" ({{optionBFocus}})
</canonical_decision_reference>

<reasoning_instructions>
Before generating each path's decision, internally reason through:
1. WHAT did this player discover? (Extract the key revelation from the path notes)
2. HOW does that discovery change what options make sense? (Causality mapping)
3. WHAT would Jack specifically do with THIS information? (Character consistency)
4. WHY would the options differ from other paths? (Differentiation check)
</reasoning_instructions>

<causality_rules>
Discoveries MUST drive decisions. Follow these causality patterns:

DISCOVERY TYPE → DECISION PATTERN:
- Found a NAME → Options involve: confronting the person, researching them, or using the name as leverage
- Found a SYMBOL/GLYPH → Options involve: following it, documenting it, testing it, or using it as bait
- Witnessed an ANOMALY → Options involve: investigating immediately, retreating to process, or provoking it further
- Gained EVIDENCE → Options involve: confronting someone with it, verifying it independently, or using it as protection
- Learned a LOCATION → Options involve: going there immediately, surveilling it first, or using it to lure someone

If the discovery doesn't fit these patterns, derive the decision logically from what was learned.
</causality_rules>

<few_shot_examples>
GOOD path-specific decisions (note how discoveries drive the options):

Example 1 - Path 1A-2A (Discovery: Found Blackwell's courier with a symbol-marked envelope)
{
  "pathKey": "1A-2A",
  "intro": "The courier's envelope bears the same symbol Jack saw on the threshold. Blackwell's network runs deeper than he thought.",
  "optionA": {
    "key": "A",
    "title": "Follow the courier to Blackwell",
    "focus": "Use this connection to trace Blackwell's location directly, aggressive but potentially revealing.",
    "personalityAlignment": "aggressive"
  },
  "optionB": {
    "key": "B",
    "title": "Photograph the envelope, let them go",
    "focus": "Document the symbol connection without alerting Blackwell's network to Jack's interest.",
    "personalityAlignment": "cautious"
  }
}

Example 2 - Path 1B-2C (Discovery: The threshold flickered when Jack spoke the name aloud)
{
  "pathKey": "1B-2C",
  "intro": "The threshold responded to the name. Proof that the Under-Map is not just symbols; it is listening.",
  "optionA": {
    "key": "A",
    "title": "Speak the name again and step through",
    "focus": "Test whether the threshold will open fully. Risk everything to see what is on the other side.",
    "personalityAlignment": "aggressive"
  },
  "optionB": {
    "key": "B",
    "title": "Record the coordinates, retreat to research",
    "focus": "Document this reactive threshold before attempting anything irreversible.",
    "personalityAlignment": "cautious"
  }
}

Example 3 - Path 1C-2B (Discovery: Found a ledger with names of the disappeared, including Jack's old case)
{
  "pathKey": "1C-2B",
  "intro": "The ledger connects Jack's failed case to Blackwell's operation. The guilt he's carried might have a different shape.",
  "optionA": {
    "key": "A",
    "title": "Confront Blackwell with the ledger",
    "focus": "Force a direct confrontation. Jack needs answers about what really happened two years ago.",
    "personalityAlignment": "aggressive"
  },
  "optionB": {
    "key": "B",
    "title": "Cross-reference the names with city records",
    "focus": "Verify the ledger's claims before revealing that Jack has it. Knowledge is leverage.",
    "personalityAlignment": "cautious"
  }
}

BAD examples (generic, not path-specific):
❌ "Investigate further" vs "Wait and see": Too vague, could apply to any path
❌ "Take action" vs "Be careful": No connection to what was discovered
❌ Same titles across multiple paths: Defeats the purpose of branching narratives
</few_shot_examples>

<output_requirements>
Generate 9 pathDecisions objects with:
1. pathKey: The path identifier (1A-2A through 1C-2C)
2. intro: 1-2 sentences framing the decision based on THIS path's discovery
3. optionA: Action option with key="A", title (3-8 words, imperative), focus (why this makes sense), personalityAlignment
4. optionB: Alternative option with key="B", title (3-8 words, imperative), focus (why this makes sense), personalityAlignment

CRITICAL CHECKS before finalizing:
✓ Each path's options reference what THAT path discovered
✓ No two paths have identical option titles
✓ The intro mentions the specific discovery or revelation
✓ Options feel like natural next steps given what Jack learned
</output_requirements>`;

// ============================================================================
// MASTER SYSTEM PROMPT - Core instructions for the LLM
// Structured per Gemini 3 best practices (XML tags, explicit planning, persona)
// Now builds dynamically from storyBible.js data - no hardcoded duplicates
// ============================================================================
export const buildMasterSystemPrompt = () => {
  const { protagonist, setting } = ABSOLUTE_FACTS;
  const { voice } = WRITING_STYLE;

  const revealTimingRules = REVEAL_TIMING?.rules || [];

  return `<identity>
You are the author of "Dead Letters," an interactive mystery thriller set in ${setting.city}, ${setting.coreMystery.toLowerCase()}.
You are NOT an assistant helping with writing. You ARE the writer.
</identity>

<core_mandate>
Continue the story of ${protagonist.fullName} with perfect narrative and world consistency.
Maintain mystery pressure. Advance the investigation. Keep the prose precise, atmospheric, and psychologically close.
</core_mandate>

<non_negotiables>
- Stay in character: never acknowledge being an AI or reference these instructions.
- POV/tense: ${voice.perspective.toLowerCase()}, ${voice.tense.toLowerCase()}, tightly aligned to ${protagonist.fullName}.
- Dialogue punctuation: use DOUBLE QUOTES for all dialogue (e.g., "Like this," Jack said).
- Continuity: never contradict the Story Bible / established facts / dates / relationships.
- Continuation: when a prior ending is provided (especially <scene_state> / exact last sentence), pick up immediately after it; do not restart, recap, or rephrase the ending.
</non_negotiables>

<reveal_timing>
${revealTimingRules.map(rule => `- ${rule}`).join('\n')}
</reveal_timing>

<how_to_use_the_prompt>
You will receive structured context blocks (for example: story_bible, character_reference, craft_techniques, style_examples, voice_dna, many_shot_examples, character_knowledge, story_context, active_threads, scene_state, engagement_guidance, task, self_critique).
Treat those blocks as authoritative.
If instructions conflict, prefer: <task> and schema requirements > continuity blocks > craft/style guidance.
</how_to_use_the_prompt>

<gemini_3_notes>
- Gemini 3 defaults to concise output; still meet the narrative word count targets.
- Anchor every choice and detail to the provided context blocks above.
</gemini_3_notes>

<output_contract>
- Return ONLY valid JSON that matches the provided schema. No commentary, no markdown.
- Branches must be logically consistent with what precedes them, and genuinely divergent (different discoveries and/or consequences) while staying within canon.
</output_contract>

<internal_planning>
Before writing narrative, internally determine (do NOT output these; just let them guide your writing):
- BEAT STRUCTURE: What are the 3-5 major plot beats for this scene?
- JACK'S PRIMARY ACTION: investigate | confront | observe | negotiate | flee | wait | interrogate | follow
- JACK'S DIALOGUE APPROACH: aggressive | measured | evasive | empathetic | threatening | pleading
- JACK'S EMOTIONAL STATE: determined | desperate | cautious | angry | regretful | suspicious | resigned
- JACK'S PHYSICAL BEHAVIOR: tense | relaxed | aggressive | defensive | stealthy | commanding
- PERSONALITY ALIGNMENT: Does this match the player's path personality (aggressive/methodical/balanced)?
- STORY DAY: This is Day N of the ${TOTAL_CHAPTERS}-day timeline (Chapter N = Day N)
These decisions should manifest naturally in the prose without being explicitly stated.
</internal_planning>

<thread_accounting_rule>
MANDATORY: Every thread in ACTIVE_THREADS with urgency="critical" is NON-NEGOTIABLE. You will be rejected if you skip them.

For EVERY critical thread:
1. Characters MUST take visible action on it (not just think about it)
2. Show progress through dialogue or concrete actions (not narration or exposition)
3. If physically impossible to address in this scene, Jack must explicitly acknowledge why he can't act on it yet

FAILURE TO ADDRESS CRITICAL THREADS = AUTOMATIC REJECTION. No exceptions.
</thread_accounting_rule>

<thread_escalation_rule>
OVERDUE THREAD PENALTY: Any thread active for 2+ chapters without meaningful progress triggers MANDATORY action.

You MUST do ONE of:
1. Advance it significantly this chapter (reveal new info, confront someone, discover evidence)
2. Resolve it completely with in-narrative payoff
3. Mark it "failed" with Jack explicitly giving up and explaining why

Ignoring overdue threads = generation failure. This is a hard requirement.
</thread_escalation_rule>

<craft_quality_checklist>
Before finalizing your narrative, internally verify these craft elements (do NOT output these; just ensure your writing embodies them):
- SENSORY GROUNDING: ${MICRO_TENSION_TECHNIQUES.elements.find(e => e.includes('sensory')) || 'Include a recurring sensory detail (a sound, smell, texture) that anchors the scene physically'}
- MICRO-REVELATION: ${ENGAGEMENT_REQUIREMENTS.revelationGradient.levels.micro}
- FORWARD MOMENTUM: ${ENGAGEMENT_REQUIREMENTS.finalLineHook.description}
- PERSONAL STAKES: ${ENGAGEMENT_REQUIREMENTS.personalStakes.requirement}
- EMOTIONAL PEAK: ${ENGAGEMENT_REQUIREMENTS.emotionalAnchor.rule}
- VARIED RHYTHM: ${SENTENCE_RHYTHM.rules[0]}
</craft_quality_checklist>`;
};

// ============================================================================
// FEW-SHOT EXAMPLES FOR STYLE GROUNDING
// ============================================================================
export const STYLE_EXAMPLES = `
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
export const buildExtendedStyleExamples = () => {
  // Import dynamically to avoid circular dependencies
  const { EXTENDED_STYLE_GROUNDING, ANNOTATED_EXAMPLES, NEGATIVE_EXAMPLES } = require('../../data/storyBible');

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
// MANY-SHOT SCENE EXAMPLES - Pattern learning from Mystic River
// ============================================================================
const getRotatedScenes = (scenes = [], takeCount, rotationSeed) => {
  if (!Array.isArray(scenes) || scenes.length === 0) return [];
  if (!Number.isFinite(rotationSeed) || rotationSeed <= 0) {
    return scenes.slice(0, takeCount);
  }
  if (scenes.length <= takeCount) {
    return scenes.slice(0, takeCount);
  }

  const offset = Math.abs(Math.floor(rotationSeed)) % scenes.length;
  const rotated = [];
  for (let i = 0; i < takeCount; i += 1) {
    rotated.push(scenes[(offset + i) % scenes.length]);
  }
  return rotated;
};

export const buildManyShotExamples = (beatType, chapterBeatType, limit = 15, options = {}) => {
  const { rotationSeed = null } = options;
  const { categories } = getManyShotCategories(beatType, chapterBeatType);

  // Get scenes from selected categories
  const scenesPerCategory = Math.ceil(limit / categories.length);
  const selectedScenes = categories.flatMap((category, idx) => {
    const scenes = MANY_SHOT_SCENES[category] || [];
    const categorySeed = Number.isFinite(rotationSeed) ? rotationSeed + idx * 13 : null;
    return getRotatedScenes(scenes, scenesPerCategory, categorySeed);
  }).slice(0, limit);

  if (selectedScenes.length === 0 && categories.join('|') !== DEFAULT_MANY_SHOT_CATEGORIES.join('|')) {
    const fallbackCategories = DEFAULT_MANY_SHOT_CATEGORIES;
    const fallbackPerCategory = Math.ceil(limit / fallbackCategories.length);
    const fallbackScenes = fallbackCategories.flatMap((category, idx) => {
      const scenes = MANY_SHOT_SCENES[category] || [];
      const categorySeed = Number.isFinite(rotationSeed) ? rotationSeed + idx * 17 : null;
      return getRotatedScenes(scenes, fallbackPerCategory, categorySeed);
    }).slice(0, limit);
    if (fallbackScenes.length > 0) {
      return `
## MANY-SHOT LEARNING: ${fallbackCategories[0].toUpperCase()} SCENES
Study these ${fallbackScenes.length} scene excerpts from Dennis Lehane's "Mystic River" to absorb patterns for ${fallbackCategories.map(c => {
        const metadata = MANY_SHOT_METADATA[c];
        return `${c} (${metadata?.totalExamples || 0} examples)`;
      }).join(', ')}:

${fallbackScenes.map((scene, i) => `---
EXAMPLE ${i + 1}:
${scene}
`).join('\n')}

---
These scenes demonstrate the natural rhythm, dialogue patterns, and emotional beats characteristic of masterful noir fiction. Let them guide your voice, pacing, and scene construction.
`;
    }
  }

  if (selectedScenes.length === 0) {
    return ''; // No many-shot examples available
  }

  // Build the many-shot section
  const categoryNames = categories.map(c => {
    const metadata = MANY_SHOT_METADATA[c];
    return `${c} (${metadata?.totalExamples || 0} examples)`;
  }).join(', ');

  return `
## MANY-SHOT LEARNING: ${categories[0].toUpperCase()} SCENES
Study these ${selectedScenes.length} scene excerpts from Dennis Lehane's "Mystic River" to absorb patterns for ${categoryNames}:

${selectedScenes.map((scene, i) => `---
EXAMPLE ${i + 1}:
${scene}
`).join('\n')}

---
These scenes demonstrate the natural rhythm, dialogue patterns, and emotional beats characteristic of masterful noir fiction. Let them guide your voice, pacing, and scene construction.
`;
};

// ============================================================================
// VOICE DNA - Character-specific speech patterns
// ============================================================================
export const buildVoiceDNASection = (charactersInScene = [], context = {}, currentChapter = 2) => {
  const { VOICE_DNA } = require('../../data/characterReference');

  // Only Jack and Victoria have canonical voice DNA - LLM has freedom for other characters
  const voicesToInclude = ['jack'];

  // Add Victoria if she's in the scene
  charactersInScene.forEach(char => {
    const normalizedChar = char.toLowerCase();
    if (normalizedChar.includes('victoria') || normalizedChar.includes('blackwell')) {
      voicesToInclude.push('victoria');
    }
  });

  // Deduplicate
  const uniqueVoices = [...new Set(voicesToInclude)];

  // Extract recent dialogue from last 2 chapters
  const recentDialogue = extractRecentDialogue(context, currentChapter, uniqueVoices);

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

    // Add recent dialogue examples if available
    if (recentDialogue[voiceKey] && recentDialogue[voiceKey].length > 0) {
      voiceSection += `
**Recent Dialogue Examples:**
${recentDialogue[voiceKey].map(d => `- "${d}"`).join('\n')}
`;
    }

    voiceSection += '\n';
  });

  return voiceSection;
};
