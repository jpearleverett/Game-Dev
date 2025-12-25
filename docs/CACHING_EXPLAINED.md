# Context Caching Explained

## How Context Caching Actually Saves Money

### The Key Insight: Pre-Processing

When you cache content with Gemini, you're not just "skipping the upload" - you're **skipping the expensive processing step**.

**Without Caching:**
```
Request 1:
  Upload 100k tokens → Gemini processes (converts to embeddings, attention) → Generate
  Cost: 100k @ $0.50/1M = $0.05

Request 2:
  Upload same 100k tokens → Gemini processes AGAIN (from scratch) → Generate
  Cost: 100k @ $0.50/1M = $0.05

Request 3:
  Upload same 100k tokens → Gemini processes AGAIN (from scratch) → Generate
  Cost: 100k @ $0.50/1M = $0.05

Total: $0.15
```

**With Caching:**
```
Request 1:
  Upload 40k static tokens → Gemini processes AND STORES internal representation
  Upload 60k dynamic tokens → Gemini processes → Combine cached + new → Generate
  Cost: 40k @ $0.50/1M + 60k @ $0.50/1M = $0.05

Request 2:
  Gemini LOADS pre-processed 40k from storage (instant, no re-processing)
  Upload 60k new dynamic tokens → Gemini processes → Combine → Generate
  Cost: 40k @ ~$0.125/1M + 60k @ $0.50/1M = $0.005 + $0.03 = $0.035

Request 3:
  Gemini LOADS pre-processed 40k from storage (instant, no re-processing)
  Upload 60k new dynamic tokens → Gemini processes → Combine → Generate
  Cost: 40k @ ~$0.125/1M + 60k @ $0.50/1M = $0.005 + $0.03 = $0.035

Total: $0.12 (20% savings)
```

### What "Processing" Means

When Gemini processes tokens, it:
1. **Tokenizes** the text (splits into tokens)
2. **Embeds** each token (converts to high-dimensional vectors)
3. **Computes attention** (determines which tokens relate to which)
4. **Builds context** (creates internal representation of meaning)

This is **computationally expensive** - it's the main cost of LLMs.

When you cache content, Gemini **stores steps 2-4**. On subsequent requests, it just **loads the pre-computed representation** instead of re-doing all that work.

### Why You Still Pay (But Less)

Gemini charges for cached tokens because:
- **Storage cost**: They store your pre-processed representation
- **Retrieval cost**: Loading from storage has a cost (but cheaper than processing)
- **Memory cost**: Keeping cached content accessible in fast memory

The 75% discount (~$0.125/1M vs $0.50/1M for input) reflects that **retrieval << processing** in cost.

### The LLM Still "Sees" Everything

**Important**: The LLM doesn't lose any context. It still has access to all 100k tokens worth of information. The difference is:
- **No cache**: Processes all 100k tokens from scratch
- **Cache**: Loads 40k pre-processed + processes 60k new

The final generation uses the FULL context in both cases.

---

## Complete Content Breakdown

### ✅ STATIC CACHE (~40-50k tokens)

This content **never changes** across story generations:

#### 1. Story Bible (~10k tokens)
```javascript
TIMELINE: {
  thirtyYearsAgo: "Jack meets Tom Wade as a rookie cop...",
  sevenYearsAgo: "Emily Cross case...",
  ...
}

ABSOLUTE_FACTS: {
  protagonist: ["Jack Halloway, 57 years old", "30-year police career", ...],
  antagonist: ["Victoria Blackwell (actually Emily Cross)", ...],
  fiveInnocents: [...],
  keyRelationships: {...}
}
```

#### 2. Character Reference (~5k tokens)
```javascript
CHARACTER_REFERENCE: {
  jackHalloway: {
    age: "57",
    background: "Retired detective...",
    personality: "Cynical but moral...",
    appearance: "Salt-and-pepper hair...",
    speechPattern: "Terse, clipped...",
    relationshipWithJack: "N/A (protagonist)",
    secrets: "...",
    motivations: "..."
  },
  victoria: {...},
  sarah: {...},
  tom: {...},
  ...
}
```

#### 3. Craft Techniques (~8k tokens)
```javascript
ENGAGEMENT_REQUIREMENTS: {
  questionEconomy: "Every subchapter must raise 1-2 new questions...",
  finalLineHook: "Last sentence creates unbearable forward momentum...",
  personalStakes: {
    progression: {
      chapters2to4: "Jack's professional reputation at stake",
      chapters5to7: "Personal relationships threatened",
      ...
    }
  },
  revelationGradient: {...},
  dramaticIrony: {...},
  emotionalAnchor: {...}
}

MICRO_TENSION_TECHNIQUES: {
  description: "Every paragraph must contain at least one...",
  elements: [
    "Sensory detail that implies threat",
    "Dialogue that says one thing, means another",
    ...
  ]
}

SENTENCE_RHYTHM: {...}
ICEBERG_TECHNIQUE: {...}
SUBTEXT_REQUIREMENTS: {...}
```

#### 4. Writing Style Examples (~15k tokens)
```javascript
WRITING_STYLE: {
  description: "Channel Raymond Chandler's hard-boiled prose",
  forbidden: [
    "Em dashes (—)",
    "X is not just Y, it's Z",
    "couldn't help but notice",
    "seemingly, profoundly, delve, unravel",
    ...
  ],
  required: [
    "Metaphors grounded in rain/shadows/noir imagery",
    "Terse punchy dialogue",
    "World-weary internal monologue",
    ...
  ]
}

EXAMPLE_PASSAGES: {
  atmosphericOpening: "The rain had a way of making Ashport look...",
  tenseMoment: "Jack's hand hovered over the doorknob...",
  hardboiledDialogue: "'You're late.' Sarah didn't look up...",
  internalMonologue: "Thirty years of this and Jack still...",
  bestDialogue: "...",
  ...
}

STYLE_EXAMPLES: `
## EXAMPLE: ATMOSPHERIC OPENING (EXCELLENT)
"${EXAMPLE_PASSAGES.atmosphericOpening}"

**Analysis:** Note the use of rain as metaphor, terse sentences...

## EXAMPLE: TENSE MOMENT (EXCELLENT)
...
`

// ✅ NEW: Extended examples with annotations
EXTENDED_STYLE_GROUNDING: {
  tensionScene: "Jack's fingers tightened around the steering wheel...",
  revelationScene: "The photograph landed on the desk...",
  chapterEnding: "He turned the corner and stopped cold...",
  dialogueUnderTension: "'So you found him.' Victoria's voice...",
}

ANNOTATED_EXAMPLES: {
  physicalEmotionExample: {
    passage: "Jack's jaw clenched. The file felt heavier...",
    annotations: [
      "Physical action shows emotion (jaw clenched = anger/tension)",
      "Metaphorical weight (file 'felt heavier' = burden of truth)",
      "No telling ('he was angry') - all showing",
      ...
    ]
  },
  dialogueSubtextExample: {...},
  tensionBuildingExample: {...},
  chapterHookExample: {...}
}

// ✅ NEW: Negative examples (bad vs good)
NEGATIVE_EXAMPLES: {
  tellDontShow: {
    badVersion: "Jack was very angry about the situation...",
    problems: [
      "Tells emotion instead of showing",
      "Vague ('the situation')",
      "Adverb ('very') weakens instead of strengthens"
    ],
    goodVersion: "Jack's fist hit the desk. The coffee mug jumped..."
  },
  overwrittenDialogue: {
    badVersion: "'I can't believe you would do this!' she exclaimed...",
    problems: [
      "Exclamation point + 'exclaimed' is redundant",
      "Dialogue explains itself ('I can't believe') instead of implying",
      "Adverb tags ('angrily') tell what dialogue should show"
    ],
    goodVersion: "'You.' Sarah's voice was flat. 'Get out.'"
  },
  flatPacing: {...},
  heavyForeshadowing: {...}
}
```

#### 5. Consistency Rules (~3k tokens)
```javascript
CONSISTENCY_RULES: {
  description: "Self-validation checklist before finalizing narrative",
  mandatoryChecks: [
    "Timeline consistency (check dates, durations)",
    "Character knowledge (Jack can't know what reader knows)",
    "Physical continuity (weather, locations, injuries)",
    ...
  ],
  commonErrors: [
    "Jack suddenly knowing things he shouldn't",
    "Contradicting established timeline",
    "Character personalities shifting",
    ...
  ]
}
```

#### Total Static: ~40-50k tokens
- **Cached cost**: ~$0.005-$0.006 per request (75% discount)
- **Without cache**: ~$0.020-$0.025 per request
- **Savings**: ~$0.015-$0.019 per request

---

### 🔄 DYNAMIC PROMPT (~57k-507k tokens)

This content **changes every request** based on story state:

#### 1. Complete Story History (~50k-500k tokens, grows with each chapter)
```javascript
_buildStorySummarySection(context) {
  // FULL TEXT of all previous chapters (no truncation with 1M context)
  for (const ch of context.previousChapters) {
    summary += `### Chapter ${ch.chapter}, Subchapter ${ch.subchapter}: "${ch.title}"\n`;
    summary += ch.narrative; // FULL narrative text

    if (ch.isImmediatelyPrevious) {
      summary += `\n>>> YOUR NARRATIVE MUST CONTINUE FROM HERE <<<\n`;
    }
  }
}
```

#### 2. Character Knowledge State (~3k tokens)
```javascript
_buildKnowledgeSection(context) {
  // What Jack knows vs. suspects vs. doesn't know yet
  // Prevents information leaks between reader and character

  jackKnows: [
    "Victoria Blackwell is connected to his past cases",
    "Tom signed forensic reports on the Five Innocents cases",
    ...
  ]

  jackSuspects: [
    "Tom may have been involved in evidence tampering",
    ...
  ]

  jackDoesNotKnow: [
    "Victoria IS Emily Cross (reader knows, Jack doesn't)",
    "Grange is the serial kidnapper (not discovered until Ch7)",
    ...
  ]
}
```

#### 3. Voice DNA - Character Dialogue Patterns (~2k tokens, varies by scene)
```javascript
buildVoiceDNASection(charactersInScene) {
  // ✅ DYNAMIC: Only includes characters in THIS scene

  // If scene has Jack + Victoria:
  return `
  ### Jack Halloway
  **Sentence Patterns:**
  - Short, declarative. Rarely over 10 words.
  - Questions are blunt: "Where were you?" not "Can you tell me where..."

  **Vocabulary:** cop slang, noir metaphors, cynical observations
  **Physical Tells:** jaw clench, thousand-yard stare, sardonic smile

  ### Victoria Blackwell
  **Sentence Patterns:**
  - Elegant, measured. Rhetorical questions.
  - Uses Jack's full name when emotional

  **Vocabulary:** precise, educated, occasionally archaic
  **Physical Tells:** controlled stillness, sharp sudden movements when mask slips
  `;

  // If scene only has Jack + Tom, Victoria's patterns not included
}
```

#### 4. Dramatic Irony - Chapter-Specific (~1k tokens, varies by chapter)
```javascript
buildDramaticIronySection(chapter, pathKey, choiceHistory) {
  // ✅ DYNAMIC: Different ironies depending on chapter

  const ironies = [];

  // Chapters 1-8: Victoria = Emily irony
  if (chapter <= 8) {
    ironies.push({
      secret: "Victoria Blackwell is Emily Cross",
      jackKnows: chapter < 6 ? "Victoria as mysterious benefactor" :
                               "Victoria has connection to his past",
      readerKnows: "Victoria IS Emily, the woman Jack failed",
      useFor: "Write scenes where Victoria drops hints Jack misses"
    });
  }

  // Chapters 1-5: Tom's betrayal irony
  if (chapter <= 5) {
    ironies.push({
      secret: "Tom manufactured evidence for 20 years",
      jackKnows: "Trusts Tom completely as best friend",
      readerKnows: "Tom is not what he seems",
      useFor: "Jack relies on Tom - maximum dramatic tension"
    });
  }

  // Chapters 4-9: Grange as predator
  if (chapter >= 4 && chapter <= 9) {
    ironies.push({
      secret: "Grange is serial kidnapper with 23 victims",
      jackKnows: chapter < 7 ? "Grange is political obstacle" :
                               "Grange is dangerous but extent unknown",
      readerKnows: "Full scope of Grange's evil",
      useFor: "Let readers feel danger Jack doesn't grasp"
    });
  }
}
```

#### 5. Consistency Checklist (~2k tokens, grows with story)
```javascript
_buildConsistencySection(context) {
  // Established facts that must never be contradicted
  establishedFacts: [
    "Jack met Tom 30 years ago at the academy (Ch1)",
    "Emily's death was ruled accident 7 years ago (Ch1)",
    "Jack has arthritis in his left hand (Ch2.1)",
    "Sarah gave Jack a key to her apartment (Ch3.2)",
    ...
  ]

  // Active narrative threads
  activeThreads: [
    {
      type: "appointment",
      description: "Jack agreed to meet Sarah at midnight at Murphy's",
      chapter: 4,
      subchapter: 2,
      status: "CRITICAL - must address this subchapter"
    },
    {
      type: "investigation",
      description: "Jack started checking warehouse records",
      chapter: 4,
      subchapter: 1,
      status: "In progress"
    },
    ...
  ]
}
```

#### 6. Current Scene State (~2k tokens)
```javascript
_buildSceneStateSection(context, chapter, subchapter) {
  // Exact continuation point

  lastScene: {
    location: "Murphy's Bar, back booth",
    time: "11:47 PM, Day 5",
    weather: "Rain finally stopped",
    charactersPresent: ["Jack", "Murphy"],
    jackPhysicalState: "Exhausted, 2 whiskeys in",
    lastAction: "Murphy slid the envelope across the table",
    mood: "Tense anticipation"
  }

  continuationInstructions: `
  Your narrative MUST:
  - Start exactly where Chapter 4.2 ended (Jack receiving envelope)
  - Maintain location (Murphy's Bar)
  - Keep time continuous (approaching midnight)
  - Show Jack's reaction to envelope contents
  `
}
```

#### 7. Engagement Guidance (~1k tokens)
```javascript
_buildEngagementGuidanceSection(context, chapter, subchapter) {
  // Personal stakes for THIS chapter

  currentStakes: {
    chapter: 5,
    phase: "Rising Action",
    personalStake: "Jack's relationship with Sarah is threatened by his obsession",
    emotionalArc: "Trust → Doubt → Confrontation",
    requiredRevelation: "Micro: Jack discovers Tom lied about warehouse visit",
    hookSetup: "Setup revelation about Grange's involvement for Ch6"
  }
}
```

#### 8. Current Task (~1k tokens)
```javascript
_buildTaskSection(context, chapter, subchapter, isDecisionPoint) {
  if (isDecisionPoint) {
    return `Generate Chapter ${chapter}, Subchapter ${subchapter} (DECISION POINT):
    - Write ${TARGET_WORDS}+ word narrative leading to decision
    - Decision must be morally complex with no clear "right" answer
    - Options must be meaningfully different (not cosmetic)
    - Setup decision with proper narrative tension
    `;
  } else {
    return `Generate Chapter ${chapter}, Subchapter ${subchapter}:
    - MINIMUM ${MIN_WORDS} words, TARGET ${TARGET_WORDS}+ words
    - Continue EXACTLY from previous subchapter endpoint
    - SHOW don't TELL (actual scenes, not summaries)
    - End with compelling hook for next subchapter
    `;
  }
}
```

#### Total Dynamic: ~57k-507k tokens
- **Cost**: $0.028-$0.254 per request (full price)
- **Grows** with story length

---

## Complete Prompt Structure

### FINAL ASSEMBLED PROMPT

```
[CACHED STATIC CONTENT - 40-50k tokens @ 75% discount]
├─ Story Bible (timeline, absolute facts)
├─ Character Reference (all characters)
├─ Craft Techniques (engagement, micro-tension, rhythm)
├─ Writing Style (forbidden patterns, required elements)
├─ ALL Example Passages
├─ Extended Style Grounding (full scenes)
├─ Annotated Examples (with WHY THIS WORKS)
├─ Negative Examples (bad vs good with problems)
└─ Consistency Rules template

[DYNAMIC CONTENT - 57k-507k tokens @ full price]
├─ Complete Story History (all previous chapters, full text)
├─ Character Knowledge State (what Jack knows/suspects/doesn't know)
├─ Voice DNA (dialogue patterns for characters in THIS scene)
├─ Dramatic Irony (ironies active in THIS chapter)
├─ Consistency Checklist (established facts + active threads)
├─ Current Scene State (exact continuation point)
├─ Engagement Guidance (stakes for THIS chapter)
├─ **"Based on all the information above, here is your task:"**
└─ Current Task (generate THIS subchapter with specific requirements)
```

### Prompt Order Rationale

Per Gemini 3 docs:
> "When working with large datasets, place your specific instructions or questions at the end of the prompt, after the data context. Anchor the model's reasoning to the provided data by starting your question with a phrase like, 'Based on the information above...'"

**Data Context First:**
- Static guidelines (cached)
- Story history
- Current state

**Task/Instructions Last:**
- "Based on all information above..." (anchoring)
- Specific task for this generation

---

## Cost Analysis Example

### Chapter 5 Generation (200k total tokens)

**Without Caching:**
```
Input: 200k tokens @ $0.50/1M = $0.100
Output: 800 tokens @ $3.00/1M = $0.0024
Total: $0.1024
```

**With Caching:**
```
Static (cached): 45k tokens @ $0.125/1M = $0.0056
Dynamic (new): 155k tokens @ $0.50/1M = $0.0775
Output: 800 tokens @ $3.00/1M = $0.0024
Total: $0.0855

Savings: $0.0169 (16.5%)
```

### Chapter 10 Generation (500k total tokens)

**Without Caching:**
```
Input: 500k tokens @ $0.50/1M = $0.250
Output: 800 tokens @ $3.00/1M = $0.0024
Total: $0.2524
```

**With Caching:**
```
Static (cached): 45k tokens @ $0.125/1M = $0.0056
Dynamic (new): 455k tokens @ $0.50/1M = $0.2275
Output: 800 tokens @ $3.00/1M = $0.0024
Total: $0.2355

Savings: $0.0169 (6.7%)
```

### Key Insight

**Absolute savings stays constant** (~$0.017 per request) because the cached content size doesn't change.

**Percentage savings decreases** as story grows because dynamic content becomes larger relative to static content.

But you still save the same absolute amount every single request!

**Over 100 requests (full playthrough):**
- Savings: 100 × $0.017 = **$1.70**
- Plus implicit caching benefits: **+$0.30-$0.50**
- **Total savings: ~$2-2.20 (15-20%)**

---

## What's Different from Original Prompt

### BEFORE (No Caching)

Every request sent:
1. System Prompt + Story Bible
2. Story History
3. Character Reference
4. Character Knowledge
5. Style Examples (static + dynamic mixed)
6. Consistency Checklist
7. Scene State
8. Engagement Guidance
9. Craft Techniques
10. Task

**Problem:** Items 1, 3, 9 (and parts of 5) were identical every request but charged full price.

### AFTER (With Caching)

**Cached once (reused for all requests):**
- System Prompt
- Story Bible
- Character Reference
- Craft Techniques
- All Static Style Examples
- Negative Examples
- Annotated Examples

**Sent fresh each request:**
- Story History
- Character Knowledge
- Voice DNA (dynamic: per scene)
- Dramatic Irony (dynamic: per chapter)
- Consistency Checklist
- Scene State
- Engagement Guidance
- Task

**Result:** Same total information, lower cost.

---

## Summary

**How it saves money:**
- Gemini pre-processes and stores static content
- Subsequent requests load pre-processed representation (cheaper than re-processing)
- You pay ~75% less for cached tokens vs. new tokens
- LLM still "sees" all the same information

**What's cached:**
- Everything that doesn't change between requests
- ~40-50k tokens of guidelines, examples, rules
- Includes negative examples, annotated examples, extended grounding

**What's not cached:**
- Everything that's different each request
- Story history (grows with each chapter)
- Character-specific and chapter-specific context
- Current scene state and task

**Prompt order:**
- All context (static + dynamic) first
- Task/instructions at the end
- "Based on information above..." anchoring

**Savings:**
- ~$0.017 per request (constant)
- 15-20% over full playthrough
- Same quality, slightly faster
