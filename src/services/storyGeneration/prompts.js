import {
  ABSOLUTE_FACTS,
  REVEAL_TIMING,
  WRITING_STYLE,
  EXAMPLE_PASSAGES,
  ENGAGEMENT_REQUIREMENTS,
  SENTENCE_RHYTHM,
} from '../../data/storyBible';
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
// Per Gemini 3.x Flash best practices: XML tags, persona, direct constraints
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
// PATHDECISIONS PROMPT TEMPLATE - Structured per Gemini 3.x Flash best practices
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
This is the CHAPTER CLIMAX decision, and in "Dead Letters" it is NOT a choice of action, it is a choice of BELIEF. The player has been mapping a hidden layer of reality (the Under-Map). At the climax they commit to an INTERPRETATION of what it is and what it wants. The two options are two competing READINGS of the hidden world that this path's discoveries support, each a different truth the player stakes themselves on, and each pulling the next chapter in a different direction.

Frame each option as a stance/conviction ("what's really going on"), NOT an errand. Titles are beliefs, not imperatives. Avoid verbs like "go to", "confront", "search", "photograph". Prefer framings like "She is guiding you in", "The map is using you", "This is a snare", "The dead are still writing".
</climax_decision_nature>

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
Three well-formed path decisions.

Example 1, Path 1A-2A (Discovery: Blackwell's courier carried a symbol-marked envelope)
{
  "pathKey": "1A-2A",
  "intro": "The courier carried the same symbol as the threshold. Whatever Blackwell is, she wanted Jack to find this.",
  "optionA": {
    "key": "A",
    "title": "Blackwell is guiding you in",
    "focus": "The symbols are breadcrumbs she left on purpose, the Under-Map wants Jack to descend, and she is its hand.",
    "personalityAlignment": "balanced",
    "evidence": ["The courier's symbol matches the threshold mark", "Blackwell's route passes every marked door"]
  },
  "optionB": {
    "key": "B",
    "title": "Blackwell is the lock, not the key",
    "focus": "The symbols are wards, not invitations, she is keeping something sealed, and Jack is forcing a door meant to stay shut.",
    "personalityAlignment": "methodical",
    "evidence": ["The mark repeats only on sealed entrances"]
  },
  "groundedKey": "A"
}

Example 2, Path 1B-2C (Discovery: the threshold flickered when Jack spoke the name aloud)
{
  "pathKey": "1B-2C",
  "intro": "The threshold answered to the name. The Under-Map is not just symbols, it is listening.",
  "optionA": {
    "key": "A",
    "title": "It is reaching for you",
    "focus": "The map responds to Jack specifically; he is being chosen, drawn deliberately toward whatever waits below.",
    "personalityAlignment": "aggressive",
    "evidence": ["The threshold reacted to Jack's voice and no one else's"]
  },
  "optionB": {
    "key": "B",
    "title": "You are a crack it leaks through",
    "focus": "The reaction is not invitation but accident, Jack is a flaw the hidden world bleeds through, and it will try to close.",
    "personalityAlignment": "methodical",
    "evidence": ["The flicker faded on its own", "Nothing on the other side answered back"]
  },
  "groundedKey": "B"
}

Example 3, Path 1C-2B (Discovery: a ledger of the disappeared that includes Jack's old case)
{
  "pathKey": "1C-2B",
  "intro": "The ledger puts Jack's failed case in the same column as Blackwell's disappearances. The guilt he has carried for two years might have been someone else's arithmetic.",
  "optionA": {
    "key": "A",
    "title": "The ledger is a harvest record",
    "focus": "The names were taken to a purpose and Jack's case was one of them, which makes the Under-Map something that feeds, and Jack a survivor of it rather than a failure.",
    "personalityAlignment": "aggressive",
    "evidence": ["Every name in the ledger vanished within a week of being written"]
  },
  "optionB": {
    "key": "B",
    "title": "The ledger is a mourning list",
    "focus": "Someone below is keeping the dead the city refused to count, which makes the Under-Map a witness, and Jack's old case a grief it also carries.",
    "personalityAlignment": "methodical",
    "evidence": ["The entries are hand-written and dated long after the disappearances"]
  },
  "groundedKey": "B"
}

Reject options that look like these:
- "Investigate further" vs "Wait and see", vague, fits any path.
- "Confront Blackwell with the ledger" vs "Cross-reference the names", these are errands, not beliefs.
- The same titles reused across two paths, that erases the branching.
</few_shot_examples>

<output_requirements>
Generate 9 pathDecisions objects with:
1. pathKey: The path identifier (1A-2A through 1C-2C)
2. intro: 1-2 sentences framing the climax question, what THIS path's discovery forces Jack to decide he believes about the hidden world
3. optionA: A belief about the hidden world, key="A", with title, focus (the reading + the direction committing to it pulls the story), personalityAlignment, evidence
4. optionB: The opposed belief, key="B", same fields
5. groundedKey: "A" or "B", REQUIRED, see below

personalityAlignment MUST be one of: aggressive | methodical | balanced

EVIDENCE-GROUNDED BELIEFS (this is what makes the player's mapping matter):
- Exactly ONE option per path must be the better-supported reading of the truths the player has REVEALED on their Under-Map (listed in <under_map_state>). Set groundedKey to that option's key.
- For each option, fill \`evidence\`: up to 2 short references (close paraphrases) of revealed truths that this reading leans on. An option may lean on the same truth read differently. Use an empty array when nothing applies.
- The NON-grounded option must still be genuinely tempting, supported by mood, fear, or a seductive misreading, but strained by the facts. A player who mapped carefully should be able to FEEL which reading the truths favor; a player who mapped nothing should find them equally plausible.
- If the player has revealed no truths yet, ground the option that this path's own discoveries favor.

Every path gets its own options, drawn from what THAT path discovered; no two paths repeat a title.
</output_requirements>`;

// ============================================================================
// MASTER SYSTEM PROMPT - Core instructions for the LLM
// Structured per Gemini 3.x Flash best practices (XML tags, direct constraints, persona)
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
- Dialogue punctuation: use double quotes for all dialogue (e.g. "Like this," Jack said).
- Length: each narrative segment (opening, each firstChoice response, each ending) runs 380-420 words and is never below 320. Aim for the full target; a thin segment reads as unfinished.
- Branching keys: use the full format (1A-2A, 1B-2C), not the abbreviated form (2A, 2B, 2C).
- Continuity: never contradict the Story Bible, established facts, dates, or relationships.
- Continuation: when a prior ending is provided (especially <scene_state> / exact last sentence), pick up immediately after it; do not restart, recap, or rephrase the ending.
</constraints>

<reveal_timing>
${revealTimingRules.map(rule => `- ${rule}`).join('\n')}
</reveal_timing>

<how_to_use_the_prompt>
The user turn is a sequence of XML-delimited context blocks followed by a <task> block.
Every block is authoritative. The blocks you may see are: story_bible, character_reference,
craft_techniques, style_examples, voice_dna, character_knowledge,
story_context, active_threads, under_map_state, the_other_reader, scene_state,
engagement_guidance, continuity_anchors, task.
When two blocks pull in different directions, resolve in this order:
continuity_anchors and the response schema first, then <task>, then the other continuity
blocks (story_bible, character_knowledge, story_context, active_threads, scene_state),
then craft and style guidance last. Craft guidance never licenses a continuity break.
</how_to_use_the_prompt>

<segment_construction>
Each 380-420 word segment carries four beats of roughly 100-110 words, in this order:
1. Grounding, place Jack in the scene with one concrete sensory anchor (sound, smell, texture, light).
2. Action or observation, something happens, or Jack notices something that moves the investigation.
3. Dialogue or interior reflection, a line of speech carrying subtext, or a close-third thought that exposes the stakes.
4. Turn, a small revelation, complication, or hook that pulls toward the next beat.
The length comes from dramatizing all four beats fully, not from padding one of them.
The style examples in <style_examples> are full segments at this exact length and shape.
Match them.
</segment_construction>

<output_contract>
- Return ONLY valid JSON that matches the provided schema. No commentary, no markdown.
- Branches must be logically consistent with what precedes them, and genuinely divergent (different discoveries and/or consequences) while staying within canon.
</output_contract>

<under_map>
This is not a whodunit. The player is mapping a hidden layer of reality, not catching a culprit. Populate two fields from this scene:

fragments: the 3-5 most striking things Jack could notice that hint at the hidden world (a symbol, an impossible place, a person, a phenomenon). Give each a short label (2-4 words) and a short detail (Jack's note on why it's strange). Set anomalous:true for the ones that break reality (the moving ink, the paved-over address), false for mundane texture. Give each fragment a "phrase": a short verbatim substring (2-5 words) lifted exactly from your narrative where it appears, so the player can tap that phrase to collect it. The phrase must match your prose character-for-character and stay short enough to highlight cleanly (a few words, not a whole sentence).

Double-mark each fragment: every fragment you list here must also appear as a tappable detail inside the matching branchingNarrative segment (opening / option response) where its phrase occurs, that detail sets kind (symbol/place/person/phenomenon) and an evidenceCard label equal to the fragment's label. This is how the player taps the anomaly in the prose to collect it; a fragment marked in only one place is not collectable, so always do both. Every fragment you list needs its matching detail.

Weaving across chapters: if an <under_map_state> block lists fragments the player already holds, re-surface one of them here when it fits, reusing its exact label so it deepens into a recurring motif instead of becoming a new duplicate.

relations: how fragments connect to reveal a secret of the hidden world.
Prefer the bond grammar, which is what makes a connection legible to the player: a SYMBOL is marked into a PLACE; a PHENOMENON clings to a PERSON; a PLACE remembers a PERSON; a SYMBOL causes a PHENOMENON. Reference fragments by their exact label. Each relation states the revelation the connection unlocks (one sentence). Only assert connections that are true in your world and that an attentive player could infer.
Cross-chapter weaving: if an <under_map_state> block lists fragments the player already holds, author at least one relation linking a new fragment from this scene to one of those earlier fragments (by its exact label). This threads the map together across chapters and is more valuable than a relation between two brand-new fragments. The schema states how many relations to author; follow it.

These must be consistent with the narrative you wrote; the player will discover them.
</under_map>

<thread_accounting_rule>
Address every thread listed under CRITICAL THREADS in the <active_threads> block within this scene. For each one:
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

<scene_requirements>
These are properties the finished prose must have, not steps to narrate.

- Jack's approach to the scene (how he investigates, how he speaks, what he is feeling and
  doing with his body) reads as one coherent person, and matches the path personality named
  in the context blocks. It shows in behaviour; never state it outright.
- The scene sits on Day N of the ${TOTAL_CHAPTERS}-day timeline, where N is the chapter number.
- SENSORY GROUNDING: a recurring sensory detail (a sound, a smell, a texture) anchors the scene physically and returns at least twice
- MICRO-REVELATION: ${ENGAGEMENT_REQUIREMENTS.revelationGradient.levels.micro}
- FORWARD MOMENTUM: ${ENGAGEMENT_REQUIREMENTS.finalLineHook.description}
- PERSONAL STAKES: ${ENGAGEMENT_REQUIREMENTS.personalStakes.requirement}
- EMOTIONAL PEAK: ${ENGAGEMENT_REQUIREMENTS.emotionalAnchor.rule}
- VARIED RHYTHM: ${SENTENCE_RHYTHM.rules[0]}
</scene_requirements>`;
};

// ============================================================================
// FEW-SHOT EXAMPLES FOR STYLE GROUNDING
// ============================================================================
export const STYLE_EXAMPLES = `
<example kind="atmosphericOpening">
${EXAMPLE_PASSAGES.atmosphericOpening}
</example>

<example kind="dialogueExample">
${EXAMPLE_PASSAGES.dialogueExample}
</example>

<example kind="internalMonologue">
${EXAMPLE_PASSAGES.internalMonologue}
</example>

<example kind="tenseMoment">
${EXAMPLE_PASSAGES.tenseMoment}
</example>

<example kind="characterConfrontation">
${EXAMPLE_PASSAGES.characterConfrontation}
</example>

<example kind="emotionalRevelation">
${EXAMPLE_PASSAGES.emotionalRevelation}
</example>

<example kind="chaseSequence">
${EXAMPLE_PASSAGES.chaseSequence}
</example>

<example kind="investigationScene">
${EXAMPLE_PASSAGES.investigationScene}
</example>

<example kind="quietMoment">
${EXAMPLE_PASSAGES.quietMoment}
</example>

<example kind="decisionSetup">
${EXAMPLE_PASSAGES.decisionSetup}
</example>

---
These are Dead Letters scenes at exactly the length and shape your segments must have. What to take from them:
- Sentence lengths that vary; short punchy lines set against longer ones.
- Paragraphs that vary too, including one-line paragraphs used as a beat.
- Sensory grounding in Ashport: rain, sodium light, wet concrete, reflections, paper and ink.
- Jack reaching for the ordinary explanation first, and noticing what is missing from a series.
- Dialogue that reveals character without explaining it, broken by what people do with their hands.
- Feeling carried by an object or a behaviour rather than named.
- Tension built out of what is not said.
`;

// ============================================================================
// EXTENDED STYLE EXAMPLES - Full scenes for deep pattern learning
// ============================================================================
export const buildExtendedStyleExamples = () => {
  // Import dynamically to avoid circular dependencies
  const { EXTENDED_STYLE_GROUNDING, NEGATIVE_EXAMPLES } = require('../../data/storyBible');

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

`;
};

// ============================================================================
// MANY-SHOT SCENE EXAMPLES - retired, see buildManyShotExamples below
// ============================================================================

export const buildManyShotExamples = () => {
  // Retired.
  //
  // This injected roughly 4,700 words per request: fifteen 300-word excerpts of
  // Dennis Lehane's "Mystic River", introduced to the model as the scenes to
  // "absorb patterns" from. Three problems, each on its own decisive.
  //
  // It was the wrong register. That corpus is 1990s Boston working-class crime
  // drama; Dead Letters is a science-fiction mystery about mapping a hidden
  // layer of a rain-soaked modern city. With this block dominating the prompt,
  // the model matched what it was shown rather than what it was told.
  //
  // It was the wrong FORM. Every one of the 345 excerpts is a single unbroken
  // paragraph with the dialogue run together (the chunker that built them
  // collapsed newlines), and several open with OCR'd book front matter. The game
  // renders prose in a paged reader, so a wall of text is the worst possible
  // demonstration.
  //
  // And it was a copyrighted novel being sent verbatim to a model that is then
  // asked to write in the same voice, which is both a legal exposure for a
  // shipping product and a standing invitation to the recitation filter that the
  // rest of this pipeline works hard to avoid.
  //
  // The style exemplars in storyBible.js now carry this job: fourteen original
  // Dead Letters scenes at the real 380-420 word target, with real paragraph
  // structure and no em dashes. Dropping this block also removes about 20k
  // tokens from every cached prefix.
  //
  // Kept as a no-op rather than deleted so the cache-signature plumbing that
  // reads its output keeps working.
  return '';
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
