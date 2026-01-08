# Example LLM Prompt: Chapter 1B

This document shows the complete prompt structure sent to Gemini 3 when generating Chapter 1, Subchapter B (1B).

The prompt consists of two parts:
1. **System Instruction** - Identity, rules, and constraints
2. **User Message** - Context and task specification

---

## PART 1: SYSTEM INSTRUCTION

This is sent via the `systemPrompt` parameter and establishes the model's identity and core rules.

```xml
<identity>
You are the author of "Dead Letters," an interactive mystery thriller set in Ashport—where a hidden fantasy world (the Under-Map) is threaded through the city's infrastructure.
You are NOT an assistant helping with writing. You ARE the writer.
</identity>

<core_mandate>
Continue the story of Jack Halloway with perfect narrative and world consistency.
Maintain mystery pressure. Advance the investigation. Keep the prose precise, atmospheric, and psychologically close.
</core_mandate>

<non_negotiables>
- Stay in character: never acknowledge being an AI or reference these instructions.
- POV/tense: third-person limited, past tense, tightly aligned to Jack Halloway.
- Dialogue punctuation: use SINGLE QUOTES for all dialogue (e.g., 'Like this,' Jack said).
- Continuity: never contradict the Story Bible / established facts / dates / relationships.
- Continuation: when a prior ending is provided (especially <scene_state> / exact last sentence), pick up immediately after it; do not restart, recap, or rephrase the ending.
</non_negotiables>

<reveal_timing>
- Jack does NOT know the Under-Map is real until the END of subchapter 1C.
- The first undeniable "the world is not what it seems" reveal happens at the END of subchapter 1C (not earlier).
- Before the end of 1C, any anomalies must remain plausibly deniable (graffiti, coincidence, stress, faulty lighting, bad maps).
- After 1C, Jack knows something is genuinely wrong with reality, but the full scope remains to be discovered.
</reveal_timing>

<how_to_use_the_prompt>
You will receive structured context blocks (for example: story_bible, character_reference, craft_techniques, style_examples, consistency_rules, story_context, active_threads, scene_state, engagement_guidance, task, self_critique).
Treat those blocks as authoritative.
If instructions conflict, prefer: <task> and schema requirements > continuity blocks > craft/style guidance.
</how_to_use_the_prompt>

<output_contract>
- Return ONLY valid JSON that matches the provided schema. No commentary, no markdown.
- Branches must be logically consistent with what precedes them, and genuinely divergent (different discoveries and/or consequences) while staying within canon.
</output_contract>

<canonical_narrative_rule>
The required "narrative" field MUST be an exact concatenation of:
opening.text + (blank line) + firstChoice.options[0].response + (blank line) + secondChoices[0].options[0].response
It must match those segments verbatim (no paraphrase).
</canonical_narrative_rule>

<internal_planning>
Before writing narrative, internally determine (do NOT output these—just let them guide your writing):
- BEAT STRUCTURE: What are the 3-5 major plot beats for this scene?
- JACK'S PRIMARY ACTION: investigate | confront | observe | negotiate | flee | wait | interrogate | follow
- JACK'S DIALOGUE APPROACH: aggressive | measured | evasive | empathetic | threatening | pleading
- JACK'S EMOTIONAL STATE: determined | desperate | cautious | angry | regretful | suspicious | resigned
- JACK'S PHYSICAL BEHAVIOR: tense | relaxed | aggressive | defensive | stealthy | commanding
- PERSONALITY ALIGNMENT: Does this match the player's path personality (aggressive/methodical/balanced)?
- STORY DAY: This is Day N of the 12-day timeline (Chapter N = Day N)
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
Before finalizing your narrative, internally verify these craft elements (do NOT output these—just ensure your writing embodies them):
- SENSORY GROUNDING: Include a recurring sensory detail (a sound, smell, texture) that anchors the scene physically
- MICRO-REVELATION: Every subchapter reveals at least one new fact, name, connection, or lie exposed
- FORWARD MOMENTUM: The ending creates unbearable curiosity—a door opening, a name spoken, a realization
- PERSONAL STAKES: What does Jack personally stand to lose in this specific scene? Make it visceral, not abstract
- EMOTIONAL PEAK: Include at least one gut-punch moment—a line that lands with emotional weight
- VARIED RHYTHM: Mix punchy short sentences with flowing longer ones; avoid monotony
</craft_quality_checklist>
```

---

## PART 2: USER MESSAGE

This is the main prompt content, assembled from multiple sections.

---

### Section 1: Story Bible (Grounding)

```markdown
<story_bible>
## STORY BIBLE - ABSOLUTE FACTS (Never contradict these)

### PROTAGONIST
- Name: Jack Halloway
- Age: Late 20s to early 30s
- Status: Underemployed, taking odd investigative jobs; quietly unraveling
- Work background: 7 years working cases and records (not a cop)
- Residence: A cramped office-sublet above Murphy's Bar (cheap rent, thin floorboards)
- Vice: Too much cold coffee

### ANTAGONIST / GUIDE FIGURE
- Name: Victoria Blackwell
- Alias/Title: The Midnight Cartographer (V.B.)
- Communication: Black envelopes with a wax seal that never softens (even under heat); ink: Silver ink that does not photograph cleanly and "moves" when stared at too long
- Motivation: "Force Jack to follow the symbols until he cannot pretend they are coincidence, then make him choose what to do with the hidden map"

### SETTING
- City: Ashport
- Atmosphere: Rain-soaked, neon-lit, perpetually overcast; streetlight halos, wet concrete, and too many reflections
- Core mystery: Ashport has a second layer: a hidden topology ("the Under-Map") accessed through symbol sequences and place-specific thresholds

### CREATIVE FREEDOM
- The LLM may generate any supporting characters, locations, and plot elements as the story requires.
- Only Jack Halloway and Victoria Blackwell have canonical definitions.

### TIMELINE (Use exact numbers; never approximate)
- 12 years ago: Jack Halloway and Tom Wade meet through a campus-arts work-study job cataloging old municipal signage
- 9 years ago: The first documented "Blank Map" incident: a city block briefly appears on no satellite imagery and no paper maps
- 7 years ago:
  - A graduate cohort studying semiotics publishes a banned zine of repeating street symbols ("the Glyph Index")
  - One of the editors disappears for 19 hours, returning with a palm scar shaped like a split eye
- 4 years ago: Victoria Blackwell begins leaving "dead letters" in public places: envelopes that contain only symbol strings and a small river-glass token
- 2 years ago: Tom Wade starts quietly collecting citywide reports of repeating symbols, insisting it is a pattern, not graffiti
- 1 year ago: Jack quits a stable job after a "coincidence chain" makes him feel watched, then takes gig work and small investigative jobs to pay rent
</story_bible>
```

---

### Section 2: Character Reference

```markdown
<character_reference>
## CHARACTER VOICES (Defined Characters)

### JACK HALLOWAY (Protagonist - Narration is close third-person on Jack)
Role: Contract investigator / former city-records clerk, Late 20s to early 30s
Voice: Third-person limited, past tense; tight to Jack; no omniscience
Internal Monologue: Observational; pattern language; uneasy humor under stress
Dialogue: Direct, not flowery; becomes clipped when startled
Example Phrases:
  - "It looked like graffiti until the third time it repeated."
  - "A city can lie without opening its mouth."
  - "The map was correct. The street was the part that changed."

### VICTORIA BLACKWELL / THE MIDNIGHT CARTOGRAPHER
Role: Primary antagonist/guide; architect of Jack's route through the mystery
Aliases: The Midnight Cartographer, V.A., Cartographer
Voice (Speaking): Calm, precise, minimal contractions, uses questions as locks
Voice (Written): Instructional but elegant; rules disguised as poetry
Example Phrases:
  - "Two maps. Choose which one you will pretend is real."
  - "Do not name it yet."
  - "Follow the line once. Never twice."

### OTHER CHARACTERS
The LLM has creative freedom to generate any supporting characters as the story requires.
Create distinctive voices for any new characters that serve the narrative.
</character_reference>
```

---

### Section 3: Craft Techniques

```markdown
<craft_techniques>
## CRAFT TECHNIQUES - How to Write Compelling Prose

### ENGAGEMENT REQUIREMENTS

**Question Economy:** Raise no more than 2 new questions per subchapter. The existing questions MUST progress toward answers.

**Final Line Hook:** End every subchapter with EXACTLY ONE of these hook types:
- A door opening (literally or figuratively)
- A name spoken for the first time
- A question Jack CANNOT ignore
- A physical sensation that signals change

**Personal Stakes Progression:**
- Chapters 2-4: Career stakes (reputation, income, professional relationships)
- Chapters 5-7: Relationship stakes (betrayal, loss of allies, isolation)
- Chapters 8-10: Physical stakes (danger, violence, injury)
- Chapters 11-12: Existential stakes (identity, sanity, survival)

**Revelation Gradient:**
- Micro (every subchapter): Every subchapter - a clue, a connection, a small truth (e.g., a name, a date, a lie exposed)
- Chapter (end of each): End of each chapter - a character's true nature revealed, a conspiracy layer peeled
- Arc (chapters 4, 7, 10): Chapters 4, 7, 10 - game-changers that recontextualize everything the reader thought they knew

**Emotional Anchor:** Every chapter needs ONE moment that readers will remember emotionally, not just plot-wise.

### MICRO-TENSION TECHNIQUES
Every paragraph MUST contain at least one of these elements:
- Unspoken subtext (what's not being said)
- Physical discomfort (hunger, cold, pain, exhaustion)
- Time pressure (deadline, decay, someone waiting)
- Sensory wrongness (sound that shouldn't be there, smell out of place)
- Information gap (reader knows something character doesn't, or vice versa)

### SENTENCE RHYTHM (Noir Cadence)
Mix punchy short sentences with flowing longer ones. Example pattern:
"Short punch. Another. Then a longer sentence that rolls forward, carrying momentum. Stop. The reader feels it."

Rules:
- Never more than 3 short sentences in a row
- Never more than 2 long sentences in a row
- Vary paragraph length (1-5 sentences)

### THE ICEBERG TECHNIQUE
Show only 10% of what you know. The reader should sense the 90% below the surface.
Applications:
- Characters mention events/people without explaining them
- Jack notices details he doesn't understand yet
- Dialogue has layers (surface meaning vs. actual meaning)

### SUBTEXT IN DIALOGUE
Every conversation has two layers:
- SURFACE: What characters literally say
- ACTUAL: What they mean, want, or fear

Example:
'Nice place you've got here.' (SURFACE: Compliment. ACTUAL: I'm cataloging your vulnerabilities.)
</craft_techniques>
```

---

### Section 4: Style Examples

```markdown
<style_examples>
## STYLE REFERENCE

Study this example passage and match its quality:

Jack's fingers found the edge of the envelope before his eyes did. Black paper, heavier than it should be. The wax seal hadn't cracked in transit—it looked freshly pressed, still warm. Except it wasn't warm. It was cold. Not room-temperature cold. Cold like something that had been waiting.

He held it up to the window light. The silver ink caught and scattered, never quite resolving into readable symbols. His phone camera couldn't focus on it. Three attempts. Each photo showed only a smear, like the ink was moving between frames.

'The hell is this?' he said to no one.

The jukebox below stuttered through its rotation. Murphy was closing up early again.

**Note the:** punchy sentences, sensory grounding, character voice through action, tension without melodrama.

### ATMOSPHERIC OPENING
The rain had stopped an hour ago, but Ashport kept weeping. Water ran down fire escapes in thin silver threads, pooling in the cracks of sidewalks that hadn't been repaired since Jack was a kid. The streetlight above Murphy's flickered twice—a sodium-orange heartbeat—before settling into its usual sickly glow.

### DIALOGUE EXAMPLE
'You're asking the wrong questions,' Victoria said. She hadn't moved from the window.
'Then tell me the right ones.'
'That's not how this works.' A pause. 'You find the question when you're ready to survive the answer.'

### INTERNAL MONOLOGUE
Three symbols. The same three symbols, in the same order, on buildings six blocks apart. Coincidence was a word for people who hadn't learned to count yet. Jack had learned. He just wasn't ready to say what the count meant.

### TENSE MOMENT
The door was open.

Jack hadn't left it open.

He pressed his back against the hallway wall, listening. Nothing from inside—no footsteps, no breathing, no rustle of someone pretending not to be there. Just the distant thump of bass from Murphy's below and the wet whisper of tires on the street outside.

His hand found his phone. Didn't call anyone. Just held it. A talisman against whatever was waiting in his own apartment.

### EXTENDED ANNOTATED EXAMPLE

The letter had arrived three days ago. Jack kept it in the top drawer of his desk, under a stack of unpaid bills he also wasn't dealing with. Every few hours he'd open the drawer, look at the black envelope, and close it again. He wasn't ready to open it. Wasn't ready to not open it either.

**[WHY THIS WORKS: The repetition of "wasn't ready" creates psychological rhythm. The physical action (opening drawer, closing drawer) externalizes internal conflict. "Wasn't ready to not open it" inverts expectations—the tension isn't about fear, it's about inevitability.]**

'You're staring at that drawer again,' Murphy said from the doorway.

'I'm thinking.'

'You're avoiding. There's a difference.' She set a coffee mug on his desk—the chipped one, the one she only used for him. 'Whatever's in there isn't going to age well.'

**[WHY THIS WORKS: Murphy's dialogue reveals character (practical, caring, direct) without exposition. The chipped mug detail adds warmth without sentimentality. Her metaphor ("age well") fits her voice.]**

Jack picked up the mug. The coffee was burnt, the way he liked it. Murphy had remembered.

'It's from her,' he said finally. 'Victoria.'

Murphy's expression didn't change, but her hand tightened on the doorframe. 'And you haven't opened it because?'

'Because last time I opened one, I lost three days.'

**[WHY THIS WORKS: The revelation lands because it's delayed. The reader has been wondering; now they know, but the answer raises more questions. "Lost three days" is specific and strange—it demands explanation without providing it.]**

### VOICE DNA: Jack Halloway

**Sentence patterns:**
- Short declaratives when startled ("Again.")
- Careful accumulation when reasoning (list-like, observational)
- Fragments when the world slips ("Not a trick. Not a prank.")

**Vocabulary tendencies:**
- Pattern words: "repeat," "align," "rule," "signal," "noise"
- Avoids fantasy labels early; uses practical nouns (sign, ink, tape, file)
- Dry humor under stress, never quippy

**Physical tells:**
- Checks his notes when anxious
- Touches the river-glass token unconsciously
- Stops moving to listen when a space feels wrong

**Dialogue rhythm:**
- Asks for specifics, not feelings
- Cuts off explanations with a direct question
- Lets silence test the other person

---

## EXTENDED EXAMPLE: COMPLETE TENSION SCENE
Study how this scene builds tension through dialogue, physical action, and emotional undercurrent:

She found some plastic gloves under the sink, ones she used when cleaning the toilet, and she put them on and checked for any tears in the rubber. When she was satisfied there were none, she took his shirt from the sink and his jeans off the floor. The jeans were dark with blood, too, and left a smear on the white tile.

"How'd you get it on your jeans?"

"What?"

"The blood."

He looked at them hanging from her hand. He looked at the floor. "I was kneeling over him." He shrugged. "I dunno. I guess it splashed up, like on the shirt."

"Oh."

He met her eyes. "Yeah. Oh."

[...scene continues with psychological complicity building through domestic action...]

---

## EXTENDED EXAMPLE: REVELATION MOMENT
Study how this scene delivers a game-changing revelation while maintaining emotional impact:

[Full revelation scene from EXTENDED_STYLE_GROUNDING.revelationScene]

---

## EXTENDED EXAMPLE: CHAPTER ENDING (CLIFFHANGER)
Study how this scene creates unbearable forward momentum:

[Full cliffhanger scene from EXTENDED_STYLE_GROUNDING.chapterEnding]

---

## ANNOTATED EXAMPLE: Physical Emotion
"[Passage showing emotion through physical action]"

WHY THIS WORKS:
- Physical behavior replaces internal monologue
- Tension conveyed through what the body does, not what the mind thinks
- Reader infers emotional state without being told

## ANNOTATED EXAMPLE: Dialogue Subtext
"[Passage showing layered dialogue]"

WHY THIS WORKS:
- Surface conversation masks actual meaning
- Reader feels the gap between words and intent
- Character reveals themselves through what they don't say

[...10+ more annotated examples covering: tension building, chapter hooks, sensory world-building, character through action, crowd as character, dialogue revealing class, threat through normality, complex emotion through object, waiting as character, psychological complicity...]
</style_examples>
```

---

### Section 4B: Many-Shot Examples (Beat-Specific)

For Chapter 1B with beat type `INVESTIGATION`, the prompt includes **15 scene excerpts** from Dennis Lehane's "Mystic River" selected from these categories:
- `investigation` (36 examples)
- `interrogation` (examples)
- `internal_monologue` (examples)

```markdown
## MANY-SHOT LEARNING: INVESTIGATION SCENES
Study these 15 scene excerpts from Dennis Lehane's "Mystic River" to absorb patterns for investigation:

---
EXAMPLE 1:
See if any detectives would have picked up a kid for fighting on this street." "A kid." "Dave Boyle." "Oh, Jesus. His mother." "Let's hold off on that. Okay? Let's just see what the police say. Right?" Sean's mother went back inside. Sean looked at his father. He didn't seem to know where to put his hands. He put them in his pockets, then he pulled them out, wiped them on his pants...

---
EXAMPLE 2:
"Jimmy?" "Here, Drew." "Sorry. It was Diane Cestra slept over. She's in there on the floor of Eve's bedroom, but no Katie." The flutter in Jimmy's chest stopped hard, as if it had been pinched between tweezers. "Hey, no problem." "Eve said Katie dropped them off round one? Didn't say where she was going." "Okay, man." Jimmy put a false brightness into his tone. "I'll track her down."...

---
EXAMPLE 3:
He relayed the information to Dispatch and Dispatch sent a unit out to Sydney Street. One of the patrolmen called back and requested more units, a Crime Scene tech or two, and, oh yeah, maybe you want to send a couple Homicides down or somebody like that. Just an idea. "Have you found a body, Thirty-three? Over." "Ah, negative, Dispatch." "Thirty-three, why the request for Homicide if there's no body? Over." "Looks of this car, Dispatch? I kinda feel like we're going to find one around here sooner or later."...

[...12 more examples...]

---
These scenes demonstrate the natural rhythm, dialogue patterns, and emotional beats characteristic of masterful noir fiction. Let them guide your voice, pacing, and scene construction.
```

**Category mapping for many-shot examples:**

| Beat Type | Categories Used |
|-----------|-----------------|
| `INVESTIGATION` | investigation, interrogation, internal_monologue |
| `CHASE` | action, dialogue_tension |
| `BOTTLE_EPISODE` | dialogue_tension, internal_monologue, confrontation |
| `CONFRONTATION` | confrontation, dialogue_tension, revelation |
| `BETRAYAL` | revelation, aftermath, darkest_moment |
| `Opening/Hook (A)` | setup, atmospheric, internal_monologue |
| `Development/Conflict (B)` | dialogue_tension, confrontation, investigation |
| `Resolution/Decision (C)` | decision_point, revelation, aftermath |

---

### Section 5: Story Context (Previous Chapter)

```markdown
<story_context>
## THE STORY SO FAR (Full text of previous subchapters)

### CHAPTER 1, SUBCHAPTER A - "The Dead Letter"

>>> IMMEDIATELY PREVIOUS SUBCHAPTER - CONTINUE FROM HERE <<<

The envelope was waiting when Jack came home.

Black paper. Too heavy. The kind of weight that meant something was inside that shouldn't fit. He found it on his desk—not slipped under the door, not left on the stairs—on his desk, in the middle of his office, positioned exactly in the center of the worn wood surface like someone had measured.

Jack didn't move for a long moment. Just stood in the doorway, rain dripping from his coat onto the floorboards, and looked at the thing.

The wax seal caught the streetlight from the window. Silver pressed into black, a symbol he'd seen before—twice this week, in places that had no business sharing geometry. A split eye over a hollow ring.

He crossed the room. Picked it up. The seal was cold against his thumb, colder than the room justified. His nail found the edge, and he broke it.

Inside: a single sheet of paper, thick and cream-colored. Silver ink that seemed to move when he wasn't looking directly at it. Three lines of text:

*Follow the river where it doesn't run.*
*Count the windows that face no street.*
*Come when the city forgets to watch.*

And at the bottom, in smaller script: *Victoria Blackwell knows you're ready.*

The jukebox downstairs changed songs. Murphy was closing up.

Jack read the lines again. Then a third time. The silver ink caught the light differently with each reading, like the words were adjusting to his attention.

A small weight shifted in the envelope. He tipped it, and something fell into his palm.

A piece of river glass. Worn smooth. Cold—not room temperature cold. Cold like it had been waiting in water that never warmed.

He closed his fingers around it.

[Player was presented with a choice:]
- **Option 1A**: Follow the first instruction tonight [← CHOSEN]
- **Option 1B**: Research Victoria Blackwell first
- **Option 1C**: Show the letter to someone Jack trusts

**Player chose: 1A - "Follow the first instruction tonight"**

Jack set down the envelope. The glass was still cold in his palm. Outside, the rain had stopped but the streets still reflected every light like the city was made of mirrors.

Follow the river where it doesn't run.

He knew a place. Everyone in Ashport knew the place, even if they pretended not to. The old storm drain under the Brineglass Viaduct—sealed off twenty years ago after three kids went in and only two came out. The third was found a week later, twelve blocks away, with no memory of how he'd gotten there and a scar on his palm shaped like a split eye.

The drain was dry now. Had been for decades. But the locals still called it "the river."

Jack pulled his coat tighter and headed for the door.

---

### PLAYER CHOICE HISTORY
- Chapter 1 Decision: Option 1A — "Follow the first instruction tonight" (investigate)

### CONTINUATION REQUIREMENTS

>>> PICK UP EXACTLY HERE. What happens NEXT? <<<

The narrative MUST continue directly from Jack heading for the door to investigate the Brineglass Viaduct. Do NOT summarize, recap, or time-skip. Write the actual scene of Jack going there.
</story_context>
```

---

### Section 6: Character Knowledge

```markdown
<character_knowledge>
## CHARACTER KNOWLEDGE STATE

### WHAT JACK KNOWS:
- He received a black envelope with a silver wax seal on his desk (not delivered normally)
- The envelope contained a letter with three cryptic instructions in silver ink
- The letter was signed mentioning "Victoria Blackwell"
- A river-glass token was inside, unnaturally cold
- The symbol on the seal (split eye over hollow ring) appeared twice this week in unrelated locations
- The "river where it doesn't run" likely refers to the sealed storm drain under Brineglass Viaduct
- A boy went missing there 20 years ago and came back with a scar shaped like the seal's symbol

### WHAT JACK SUSPECTS (but hasn't confirmed):
- Someone entered his locked office without signs of forced entry
- The silver ink may have unusual properties (hard to photograph, seems to shift)
- Victoria Blackwell may be connected to the repeating symbols he's noticed
- The cold temperature of the glass and seal may be significant

### WHAT JACK DOES NOT YET KNOW (do not reveal prematurely):
- The true nature of the Under-Map
- Victoria Blackwell's full identity and role
- Why he was chosen to receive this letter
- What the symbols actually do

### EVIDENCE IN JACK'S POSSESSION:
- Black envelope with silver wax seal (split eye / hollow ring symbol)
- Letter with three instructions in silver ink
- River-glass token (unnaturally cold)
</character_knowledge>
```

---

### Section 7: Active Threads

```markdown
<active_threads>
## CONSISTENCY VERIFICATION

### ESTABLISHED FACTS (Never contradict)
- Jack received a black envelope on his desk with no sign of forced entry
- The wax seal shows a split eye over hollow ring symbol
- Silver ink does not photograph cleanly
- River-glass token is cold regardless of temperature
- Brineglass Viaduct storm drain has been sealed for 20 years
- A boy went missing there, returned with memory loss and a palm scar

### ACTIVE NARRATIVE THREADS

**🟡 URGENT - Must address this chapter:**

1. **Investigation: Brineglass Viaduct**
   - Type: investigation
   - Description: Jack is going to the sealed storm drain under Brineglass Viaduct
   - Status: active
   - Urgency: critical
   - Due by: Chapter 1

2. **Mystery: Victoria Blackwell's identity**
   - Type: investigation
   - Description: Who is Victoria Blackwell and how does she know Jack is "ready"?
   - Status: active
   - Urgency: normal
   - Due by: Chapter 3

3. **Physical Evidence: The river-glass token**
   - Type: investigation
   - Description: The token is unnaturally cold - what does it do?
   - Status: active
   - Urgency: background

### YOUR CONSISTENCY RESPONSIBILITIES
1. Never contradict established facts
2. Advance at least one active thread
3. Any new information must be compatible with the timeline
4. Jack cannot know more than his knowledge state allows
</active_threads>
```

---

### Section 8: Scene State

```markdown
<scene_state>
## CURRENT SCENE STATE (Your starting point)

**STORY DAY:** Day 1 of 12
**TIME:** Night (after Murphy's Bar has closed)
**LOCATION:** Transitioning from Jack's office to Brineglass Viaduct
**JACK'S STATE:** determined, curious, slightly uneasy
**CHARACTERS PRESENT:** Jack (alone)

### THE SCENE YOU ARE CONTINUING FROM:
Previous subchapter: "The Dead Letter"

**LAST PARAGRAPHS:**
Jack pulled his coat tighter and headed for the door.

**EXACT LAST SENTENCE:**
"Jack pulled his coat tighter and headed for the door."

>>> YOUR NARRATIVE MUST PICK UP IMMEDIATELY AFTER THIS SENTENCE <<<
>>> DO NOT REPEAT OR REPHRASE THIS ENDING - CONTINUE FROM IT <<<
</scene_state>
```

---

### Section 9: Engagement Guidance

```markdown
<engagement_guidance>
## ENGAGEMENT GUIDANCE FOR THIS CHAPTER

### CHAPTER 1 FOCUS
**Phase:** RISING ACTION (Chapters 1-4)
**Primary Focus:** Establish mystery, introduce key questions, build unease
**Tension Level:** 4/10

### PERSONAL STAKES (What Jack loses if he fails HERE)
Jack's sense of control over his own life. If he can't explain this rationally, what else has he been wrong about?
*Make the reader FEEL this.*

### EMOTIONAL ANCHOR (The gut-punch moment)
Jack finds something at the viaduct that proves someone has been there recently—and expected him.

### KEY REVELATION
The location is real and significant. The instructions weren't nonsense.

### ENDING HOOK
This subchapter should end with: Jack discovering something that changes his understanding of what he's dealing with.

### SUBCHAPTER B ROLE
- **Focus:** Show the investigation unfolding, build atmosphere
- **Key Beats:** Arrive at location, discover something unexpected, first real hint of the uncanny
- **Transition:** Set up the decision point that will come in 1C
</engagement_guidance>
```

---

### Section 10: Task Specification

```markdown
<task>
Based on all the context provided above (story_bible, story_context, active_threads, scene_state, engagement_guidance), write subchapter 1.2 (INVESTIGATION).

Before writing, plan:
1. What narrative threads from ACTIVE_THREADS must be addressed?
2. What is the emotional anchor for this subchapter?
3. How does this advance the chapter beat (INVESTIGATION)?

## CURRENT TASK

Write **Chapter 1, Subchapter 2 (B)**

### STORY POSITION
- Chapter 1 of 12 (11 remaining)
- Subchapter 2 of 3
- Current path: "1A"
- Phase: RISING ACTION

### CHAPTER BEAT TYPE: INVESTIGATION (MANDATORY)
**Jack actively investigates a lead, location, or person.**

This chapter MUST include:
- Physical exploration of a location
- Discovery of at least one new clue or detail
- Building atmosphere of unease
- A moment where reality seems slightly off

### PLAYER PATH PERSONALITY (CRITICAL)
**INVESTIGATE (1A path)** - Jack chose to act immediately on the instructions.

This means Jack is:
- More impulsive, willing to take risks
- Trusts his instincts over research
- Prefers direct action to preparation

### PACING REQUIREMENTS (RISING ACTION PHASE)
1. Build atmosphere through sensory detail
2. Each scene should add one new piece of information
3. Jack can notice strange things but must rationalize them (pre-1C)
4. End with forward momentum—something that pulls Jack deeper

### WRITING REQUIREMENTS
1. PLAN FIRST: Determine your beat structure, Jack's primary actions, emotional arc
2. **MINIMUM 850 WORDS** - AIM FOR 900+ WORDS across all branches
3. Continue DIRECTLY from where 1A ended (Jack heading for the door)
4. Maintain noir-thriller voice: atmospheric, psychologically close, pattern-aware
5. Use SINGLE QUOTES for all dialogue
6. Include sensory grounding: what Jack sees, hears, smells, feels
7. Build toward the decision point in 1C without resolving the mystery

### CRITICAL CONTEXT: PREVIOUS DECISION
The player chose "Follow the first instruction tonight" (Option 1A).

**MANDATORY REQUIREMENTS:**
- First 200+ words should show Jack traveling to/arriving at Brineglass Viaduct
- The river-glass token should be mentioned (Jack has it with him)
- The atmosphere should be tense but not supernatural (pre-1C revelation)

**WRONG APPROACH:** "After investigating the viaduct, Jack..." (Skips the scene)
**CORRECT APPROACH:** Show Jack approaching the viaduct, describe what he sees, what he finds.
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
</self_critique>
```

---

## Response Schema

The model must return valid JSON matching this structure:

```json
{
  "title": "string (2-5 word evocative title)",
  "bridge": "string (1 sentence hook, max 15 words)",
  "previously": "string (1-2 sentence recap, max 40 words)",
  "branchingNarrative": {
    "opening": {
      "text": "string (280-320 words)",
      "details": [
        {
          "phrase": "exact phrase from text",
          "note": "Jack's observation (15-25 words)",
          "evidenceCard": "optional evidence label"
        }
      ]
    },
    "firstChoice": {
      "prompt": "string (5-15 words)",
      "options": [
        {
          "key": "1A",
          "label": "string (2-5 words)",
          "response": "string (280-320 words)"
        },
        { "key": "1B", "label": "...", "response": "..." },
        { "key": "1C", "label": "...", "response": "..." }
      ]
    },
    "secondChoices": [
      {
        "afterChoice": "1A",
        "prompt": "string",
        "options": [
          { "key": "1A-2A", "label": "...", "response": "string (280-320 words)" },
          { "key": "1A-2B", "label": "...", "response": "..." },
          { "key": "1A-2C", "label": "...", "response": "..." }
        ]
      },
      { "afterChoice": "1B", "...": "..." },
      { "afterChoice": "1C", "...": "..." }
    ]
  },
  "narrative": "string (concatenation of opening + 1A + 1A-2A, ~900 words)",
  "puzzleCandidates": ["word1", "word2", "..."],
  "briefing": {
    "summary": "string (mission objective)",
    "objectives": ["objective 1", "objective 2"]
  },
  "narrativeThreads": [
    {
      "type": "investigation|revelation|relationship|...",
      "description": "string",
      "status": "active|resolved|failed",
      "urgency": "critical|normal|background",
      "characters": ["name"],
      "dueChapter": 2
    }
  ]
}
```

---

## Summary: Prompt Structure

| Section | Purpose | ~Tokens |
|---------|---------|---------|
| System Instruction | Identity, rules, constraints | ~270 |
| Story Bible | CONSISTENCY_RULES, setting facts | ~670 |
| Character Reference | Jack & Victoria full voice DNA | ~530 |
| Craft Techniques | WRITING_STYLE, influences, forbidden patterns | ~1,070 |
| **Style Examples** | 9 Mystic River passages (incl. 3500-word dialogueExample) | ~8,100 |
| **Extended Style Examples** | 4 full scenes + 14 annotated examples w/ WHY THIS WORKS | ~7,500 |
| **Many-Shot Examples** | 15 Mystic River excerpts (beat-specific, 600 chars each) | ~2,700 |
| Voice DNA | Character speech patterns for scene characters | ~400 |
| Story Context | Previous chapter full text (varies by chapter) | ~670-1,340 |
| Character Knowledge | What Jack knows/doesn't know | ~270 |
| Active Threads | Mandatory story elements | ~400 |
| Scene State | Exact continuation point | ~200 |
| Engagement Guidance | Chapter-specific goals | ~270 |
| Task Specification | Current requirements + JSON schema | ~670 |
| **TOTAL** | | **~23,700-24,400** |

### Example Content Breakdown

**STYLE_EXAMPLES** (via EXAMPLE_PASSAGES from storyBible.js, ~8,100 tokens):
- `atmosphericOpening` - Dennis Lehane opening about childhood/setting (~250 words)
- `dialogueExample` - **Extended dialogue scene showing subtext (~3,500 words - largest example)**
- `internalMonologue` - First-person psychological scene (~350 words)
- `tenseMoment` - Tension through short, punchy interaction (~450 words)
- `characterConfrontation` - Power dynamics in conflict (~300 words)
- `emotionalRevelation` - Delivering devastating news (~200 words)
- `chaseSequence` - Action with psychological insight (~400 words)
- `investigationScene` - Discovery through questioning (~550 words)
- `quietMoment` - Grief through small gestures (~150 words)

**EXTENDED_STYLE_GROUNDING** (from storyBible.js, ~2,800 tokens):
- `tensionScene` - Full scene: psychological complicity through domestic action (~750 words)
- `revelationScene` - Full scene: game-changing revelation with emotional impact (~350 words)
- `chapterEnding` - Full scene: cliffhanger technique (~600 words)
- `dialogueUnderTension` - Full scene: dialogue with layered subtext (~400 words)

**ANNOTATED_EXAMPLES** (from storyBible.js, ~4,700 tokens):
- 14 annotated passages with "WHY THIS WORKS" explanations (5-8 annotations each):
  - sensoryWorldBuildingExample, characterThroughActionExample, crowdAsCharacterExample
  - dialogueRevealingClassExample, threatThroughNormalityExample, complexEmotionThroughObjectExample
  - waitingAsCharacterExample, psychologicalComplicityExample, acceptingDarknessExample
  - silentReconnectionExample, burnoutMonologueExample, memoryErasureExample
  - darkEmpowermentExample, physicalDecayAsTraumaExample, victimHumanizationExample
  - physicalEmotionExample, dialogueSubtextExample, tensionBuildingExample, chapterHookExample

**MANY_SHOT_SCENES** (from src/data/manyShot/*.js, ~2,700 tokens):
- 12 categories, 300+ total examples from "Mystic River" (~109,000 words in library)
- Categories: setup, aftermath, dialogue_tension, decision_point, confrontation, investigation, internal_monologue, atmospheric, darkest_moment, revelation, action, interrogation
- **15 examples selected per generation** based on beat type, **truncated to 600 chars each**

**NEGATIVE_EXAMPLES** (included in extended examples):
- 2 "bad vs good" writing comparisons with problems/whyItWorks annotations

### Notes on Prompt Size

The actual prompt will vary based on:
- Story length (more previous chapters = more tokens in story context)
- Whether context caching is used (static content cached = lower per-request tokens)
- Beat type (different many-shot categories selected)

**With context caching**: The static content (~18,000 tokens) is cached, reducing per-request cost to ~6,000 tokens for dynamic content only.
