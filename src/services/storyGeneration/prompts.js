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
// Per Gemini 3.5 Flash best practices: XML tags, persona, direct constraints
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
- Climax option titles: a BELIEF/interpretation of the hidden world, 3-8 words, declarative (e.g., "She is guiding you in", "You are bait" — NOT "Follow the courier")
- Option focus: one sentence explaining stakes and tradeoffs
</voice_constraints>

<core_mandate>
Each of the 9 branching paths represents a DIFFERENT player experience. The decisions you generate must reflect what THAT specific player discovered, not generic options that could apply to any path.

If a player discovered a name, their decision should involve that name. If they witnessed a threshold react, their decision should involve that threshold. The discoveries are the decision drivers.
</core_mandate>

<output_contract>
Return ONLY valid JSON matching the schema. No commentary.
</output_contract>`;
};

// ============================================================================
// PATHDECISIONS PROMPT TEMPLATE - Structured per Gemini 3.5 Flash best practices
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

<climax_decision_nature>
This is the CHAPTER CLIMAX decision, and in "Dead Letters" it is NOT a choice of action — it is a choice of BELIEF. The player has been mapping a hidden layer of reality (the Under-Map). At the climax they commit to an INTERPRETATION of what it is and what it wants. The two options are two competing READINGS of the hidden world that this path's discoveries support — each a different truth the player stakes themselves on, and each pulling the next chapter in a different direction.

Frame each option as a stance/conviction ("what's really going on"), NOT an errand. Titles are beliefs, not imperatives. Avoid verbs like "go to", "confront", "search", "photograph". Prefer framings like "She is guiding you in", "The map is using you", "This is a snare", "The dead are still writing".
</climax_decision_nature>

<reasoning_instructions>
Before generating each path's decision, internally reason through:
1. WHAT did this player discover? (Extract the key revelation from the path notes)
2. What TWO competing interpretations of the hidden world does that discovery support? (One reading vs. another — both plausible from what was seen)
3. How does committing to each belief change Jack's relationship to the Under-Map and the direction of the next chapter?
4. WHY would these readings differ from other paths? (Differentiation check)
</reasoning_instructions>

<causality_rules>
Discoveries MUST drive the competing interpretations. Follow these patterns:

DISCOVERY TYPE → COMPETING BELIEFS:
- Found a NAME → Readings: this person is a guide drawing you in vs. a warden keeping you out (or a victim vs. an architect)
- Found a SYMBOL/GLYPH → Readings: it is an invitation/map left for you vs. a ward/warning meant to keep you away
- Witnessed an ANOMALY → Readings: the hidden world is reaching for you deliberately vs. you are an accident bleeding through its edges
- Gained EVIDENCE → Readings: it confirms the underworld is benevolent/ordered vs. predatory/indifferent
- Learned a LOCATION → Readings: it is a threshold meant for you vs. a trap baited with your own curiosity

If the discovery doesn't fit these patterns, derive two honest, opposed interpretations from what was learned.
</causality_rules>

<few_shot_examples>
GOOD path-specific climax beliefs (note how each option is a STANCE on the hidden world, not an action):

Example 1 - Path 1A-2A (Discovery: Found Blackwell's courier with a symbol-marked envelope)
{
  "pathKey": "1A-2A",
  "intro": "The courier carried the same symbol as the threshold. Whatever Blackwell is, she wanted Jack to find this.",
  "optionA": {
    "key": "A",
    "title": "Blackwell is guiding you in",
    "focus": "The symbols are breadcrumbs she left on purpose — the Under-Map wants Jack to descend, and she is its hand.",
    "personalityAlignment": "trusting"
  },
  "optionB": {
    "key": "B",
    "title": "Blackwell is the lock, not the key",
    "focus": "The symbols are wards, not invitations — she is keeping something sealed, and Jack is forcing a door meant to stay shut.",
    "personalityAlignment": "wary"
  }
}

Example 2 - Path 1B-2C (Discovery: The threshold flickered when Jack spoke the name aloud)
{
  "pathKey": "1B-2C",
  "intro": "The threshold answered to the name. The Under-Map is not just symbols — it is listening.",
  "optionA": {
    "key": "A",
    "title": "It is reaching for you",
    "focus": "The map responds to Jack specifically; he is being chosen, drawn deliberately toward whatever waits below.",
    "personalityAlignment": "trusting"
  },
  "optionB": {
    "key": "B",
    "title": "You are a crack it leaks through",
    "focus": "The reaction is not invitation but accident — Jack is a flaw the hidden world bleeds through, and it will try to close.",
    "personalityAlignment": "wary"
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
    "personalityAlignment": "methodical"
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
2. intro: 1-2 sentences framing the climax question — what THIS path's discovery forces Jack to decide he believes about the hidden world
3. optionA: A belief about the hidden world, key="A", title (3-8 words, declarative stance), focus (the reading + the direction committing to it pulls the story), personalityAlignment, evidence
4. optionB: The opposed belief, key="B", title (3-8 words, declarative stance), focus (the reading + its direction), personalityAlignment, evidence
5. groundedKey: "A" or "B" — REQUIRED, see below

personalityAlignment MUST be one of: aggressive | methodical | balanced

EVIDENCE-GROUNDED BELIEFS (this is what makes the player's mapping matter):
- Exactly ONE option per path must be the better-supported reading of the truths the player has REVEALED on their Under-Map (listed in <under_map_state>). Set groundedKey to that option's key.
- For each option, fill \`evidence\`: up to 2 short references (close paraphrases) of revealed truths that this reading leans on. An option may lean on the same truth read differently. Use an empty array when nothing applies.
- The NON-grounded option must still be genuinely tempting — supported by mood, fear, or a seductive misreading — but strained by the facts. A player who mapped carefully should be able to FEEL which reading the truths favor; a player who mapped nothing should find them equally plausible.
- If the player has revealed no truths yet, ground the option that this path's own discoveries favor.

Before finalizing, verify:
✓ Each path's options reference what that path discovered
✓ No two paths have identical option titles
✓ The intro mentions the specific discovery or revelation
✓ Options feel like natural next steps given what Jack learned
✓ Every path has groundedKey set, and the grounded option's evidence cites revealed truths where any exist
</output_requirements>`;

// ============================================================================
// MASTER SYSTEM PROMPT - Core instructions for the LLM
// Structured per Gemini 3.5 Flash best practices (XML tags, direct constraints, persona)
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

<constraints>
- Stay in character: never acknowledge being an AI or reference these instructions.
- POV/tense: ${voice.perspective.toLowerCase()}, ${voice.tense.toLowerCase()}, tightly aligned to ${protagonist.fullName}.
- Dialogue punctuation: use double quotes for all dialogue (e.g., "Like this," Jack said).
- Length: each narrative segment (opening, each firstChoice response, each ending) runs 380-420 words and is never below 320. Aim for the full target; a thin segment reads as unfinished.
- Branching keys: use the full format (1A-2A, 1B-2C), not the abbreviated form (2A, 2B, 2C).
- Continuity: never contradict the Story Bible, established facts, dates, or relationships.
- Continuation: when a prior ending is provided (especially <scene_state> / exact last sentence), pick up immediately after it; do not restart, recap, or rephrase the ending.
</constraints>

<reveal_timing>
${revealTimingRules.map(rule => `- ${rule}`).join('\n')}
</reveal_timing>

<how_to_use_the_prompt>
You will receive structured context blocks (for example: story_bible, character_reference, craft_techniques, style_examples, voice_dna, many_shot_examples, character_knowledge, story_context, active_threads, scene_state, engagement_guidance, task, self_critique).
Treat those blocks as authoritative.
If instructions conflict, prefer: <task> and schema requirements > continuity blocks > craft/style guidance.
</how_to_use_the_prompt>

<segment_construction>
Build each 380-420 word segment from four distinct beats of roughly 100-110 words each, in this order:
1. Grounding — place Jack in the scene with one concrete sensory anchor (sound, smell, texture, light).
2. Action or observation — something happens, or Jack notices something that moves the investigation.
3. Dialogue or interior reflection — a line of speech carrying subtext, or a close-third thought that exposes the stakes.
4. Turn — a small revelation, complication, or hook that pulls toward the next beat.
The length comes from dramatizing all four beats fully, not from padding any one of them.
The style and many-shot examples illustrate voice and craft, NOT length — your segments run longer than those excerpts. Do not let a short example shorten your segment.
Self-check before finalizing each segment: if it is under 380 words, you have under-written a beat — return to the thinnest beat and develop it (more sensory detail, another line of dialogue, a deeper interior turn) until the segment reaches its target. Do not stop at the minimum.
Anchor every choice and detail to the context blocks above.
</segment_construction>

<output_contract>
- Return ONLY valid JSON that matches the provided schema. No commentary, no markdown.
- Branches must be logically consistent with what precedes them, and genuinely divergent (different discoveries and/or consequences) while staying within canon.
</output_contract>

<under_map>
This is not a whodunit. The player is mapping a hidden layer of reality, not catching a culprit. Populate two fields from this scene:

fragments — the 2-4 most striking things Jack could notice that hint at the hidden world (a symbol, an impossible place, a person, a phenomenon). Give each a short label (2-4 words) and a short detail (Jack's note on why it's strange). Set anomalous:true for the ones that break reality (the moving ink, the paved-over address), false for mundane texture. Give each fragment a "phrase": a short verbatim substring (2-5 words) lifted exactly from your narrative where it appears, so the player can tap that phrase to collect it. The phrase must match your prose character-for-character and stay short enough to highlight cleanly (a few words, not a whole sentence).

Double-mark each fragment: every fragment you list here must also appear as a tappable detail inside the matching branchingNarrative segment (opening / option response) where its phrase occurs — that detail sets kind (symbol/place/person/phenomenon) and an evidenceCard label equal to the fragment's label. This is how the player taps the anomaly in the prose to collect it; a fragment marked in only one place is not collectable, so always do both. Aim for 2-4 such kind-tagged details across the scene.

Weaving across chapters: if an <under_map_state> block lists fragments the player already holds, re-surface one of them here when it fits — reuse its exact label so it deepens into a recurring motif instead of becoming a new duplicate.

relations — how fragments connect to reveal a secret of the hidden world. Reference fragments by their exact label. Each relation states the revelation the connection unlocks (one sentence). Only assert connections that are true in your world and that an attentive player could infer.
Cross-chapter weaving: if an <under_map_state> block lists fragments the player already holds, author at least one relation linking a new fragment from this scene to one of those earlier fragments (by its exact label). This threads the map together across chapters and is more valuable than a relation between two brand-new fragments. Return an empty relations list only when nothing genuinely connects yet.

These must be consistent with the narrative you wrote; the player will discover them.
</under_map>

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
Address every thread in ACTIVE_THREADS marked urgency="critical" within this scene. For each one:
1. Have a character take visible action on it, not just think about it.
2. Show progress through dialogue or concrete action rather than narration or exposition.
3. If it genuinely cannot be acted on in this scene, have Jack acknowledge why he can't act on it yet.

Leaving a critical thread untouched is the single most important failure to avoid.
</thread_accounting_rule>

<thread_escalation_rule>
For any thread active 2+ chapters without meaningful progress, do exactly one of the following:
1. Advance it significantly this chapter (reveal new info, confront someone, discover evidence).
2. Resolve it completely, with in-narrative payoff.
3. Mark it "failed," with Jack explicitly giving up and explaining why.

An overdue thread should not pass through a scene untouched.
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

Your writing should feel like it belongs in the same novel as these passages. Match their VOICE and CRAFT, not their length: these are short excerpts, while each of your segments must run a full 380-420 words.
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
