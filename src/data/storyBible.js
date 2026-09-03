/**
 * Story Bible - Canonical Facts for LLM Grounding
 *
 * This document contains ABSOLUTE FACTS that must never be contradicted.
 * The LLM must treat these as immutable ground truth when generating content.
 * Any deviation from these facts breaks story consistency.
 */

// ============================================================================
// TIMELINE - Jack Halloway's Life & Career (BEFORE the story begins)
// ============================================================================
export const TIMELINE = {
  jackHistory: {
    // Early life
    childhood: 'Jack grows up in a small town outside Ashport; quiet kid, preferred puzzles and maps to sports',
    18: 'Jack graduates high school with average grades; moves to Ashport for community college',

    // Education and first jobs
    17: 'Jack works nights stocking shelves at a pharmacy while taking general education classes; no clear career path',
    16: 'Jack gets a part-time job scanning old documents at the county courthouse; discovers he likes the work more than his classes',
    15: 'Jack drops out of college to work full-time as a file clerk at the Ashport City Records Office',

    // City records years
    14: 'Jack learns the city\'s filing systems inside and out; becomes the go-to person when someone needs an old permit or property record',
    13: 'Jack gets promoted to research assistant; spends his days pulling zoning maps, deed transfers, and building inspection reports for lawyers and city planners',
    12: 'Jack starts noticing when things don\'t match up: addresses that appear on one map but not another, streets renamed without explanation, buildings with permits filed after they were built',

    // Transition to investigation
    11: 'A lawyer offers Jack side work tracing property ownership for a real estate dispute; Jack finds a chain of shell companies in two days',
    10: 'Jack quits the Records Office to work for a small private investigation firm; takes a pay cut but gets to leave his desk',
    9: 'Jack learns skip tracing: finding people who don\'t want to be found by following paper trails, utility records, forwarding addresses',

    // Building skills
    8: 'Jack works his first missing person case; learns to walk neighborhoods, talk to bartenders, check bus station lockers',
    7: 'Jack develops a habit of using paper maps and handwritten notes; he trusts what he can hold in his hands',
    6: 'The PI firm closes; Jack starts freelancing for lawyers, insurance adjusters, and anyone who needs something found',

    // Freelance years
    5: 'Jack builds a reputation for finding information other investigators miss; he charges less than the big firms and works stranger hours',
    4: 'Jack takes a desk job at a corporate security company for stable income; hates sitting still and quits after eight months',
    3: 'Jack goes back to freelance work; rents a cheap office above a bar called Murphy\'s because the landlord doesn\'t ask questions',

    // The burnout
    2: [
      'Jack takes a missing persons case: a mother looking for her adult son who stopped returning calls',
      'Jack finds him in three weeks; the son had cut contact on purpose, was finally getting clean, didn\'t want his family involved',
      'Jack gives the mother the address anyway; it\'s what she paid for',
      'Two months later Jack reads that the son overdosed; the mother had shown up, there was a fight, he relapsed',
      'Jack can\'t prove the connection but can\'t stop thinking about it; stops taking missing persons cases',
      'Jack starts sleeping less, drinking more, letting his apartment go; work slows down because he stops returning calls',
    ],

    // Present day
    1: 'Jack is 35 years old, going through the motions; takes only simple jobs now, background checks and process serving, nothing that requires him to find anyone',
  },
  storyStart: {
    anchorDate: 'November 14, 2025', // Present day anchor - story begins on this date
    jackAge: 35,
    jackState: 'Burned out, depressed, scraping by on small jobs; still good at what he does but afraid of what happens when he actually finds something',
  },
};

// ============================================================================
// ABSOLUTE FACTS - These CANNOT be contradicted
// ============================================================================
export const ABSOLUTE_FACTS = {
  protagonist: {
    fullName: 'Jack Halloway',
    age: 35,
    formerTitle: 'Freelance investigator, former file clerk at Ashport City Records Office',
    currentStatus: 'Burned out and depressed; takes only simple jobs now, avoids anything that requires finding people',
    residence: 'A cramped office-sublet above Murphy\'s Bar (cheap rent, thin floorboards)',
    careerLength: '15 years in records and investigation work',
    reputation: 'Used to be good at finding information others missed; now just going through the motions',
    vices: ['Drinking too much', 'Insomnia', 'Compulsive note-taking'],
    physicalState: 'Worn down before his time; tired eyes, unshaven, clothes that haven\'t been washed in too long',
    burnout: 'A missing persons case ended badly two years ago; Jack found someone who didn\'t want to be found, and they died after he gave up the address',
  },

  antagonist: {
    trueName: 'Victoria Blackwell',
    aliasUsed: 'Victoria Blackwell',
    currentAge: 'Unknown (appears late 20s to mid 30s; may be misleading)',
    occupation: 'Information broker (public-facing), true role unknown',
    origin: 'Unknown; she claims Ashport has always had two maps, and Jack has only seen one',
    communication: {
      method: 'Black envelopes with a wax seal that never softens (even under heat)',
      ink: 'Silver ink that does not photograph cleanly and “moves” when stared at too long',
      scent: 'Sharp, clean, unsettling',
    },
    motivation: 'Force Jack to follow the symbols until he cannot pretend they are coincidence, then make him choose what to do with the hidden map',
    philosophy: '"A map is a promise. Break it, and the city breaks back."',
  },

  setting: {
    city: 'Ashport',
    atmosphere: 'Rain-soaked, neon-lit, perpetually overcast; streetlight halos, wet concrete, and too many reflections',
    tone: 'Modern mystery thriller that slowly reveals an original fantasy world threaded through the city\'s infrastructure',
    coreMystery: 'Ashport has a second layer: a hidden topology (“the Under-Map”) accessed through symbol sequences and place-specific thresholds',
    keyLocations: {
      murphysBar: 'Bar beneath Jack\'s office',
      jackOffice: 'A tiny room above the bar; desk, filing cabinet, old maps on the walls from his records days',
      underbridgeMarket: 'A night market under the elevated tracks where “found” objects appear without provenance',
      civicArchive: 'Records office where Jack can access old zoning maps and vanished street plans',
      blackwellPenthouse: 'Glass and steel, commanding city view; feels like a room built to observe, not live',
      thresholdSites: 'Certain corners, stairwells, tunnels, and dead-ends that repeat symbol patterns at the edges of perception',
    },
  },

  // NOTE: Other characters (allies, antagonists, supporting cast) are not predefined.
  // The LLM has creative freedom to generate characters as the story requires.
  // Only Jack Halloway (protagonist) and Victoria Blackwell (antagonist) have canonical definitions.
};

// ============================================================================
// STORY STRUCTURE
// ============================================================================
export const STORY_STRUCTURE = {
  totalChapters: 12,
  subchaptersPerChapter: 3,
  chapter1A: 'Static content with branching choices (the dead letter with silver glyph)',
  chapter1BandC: 'Dynamically generated based on player branching choices in 1A',
  chapters2to12: 'Dynamically generated based on player choices',
  decisionPoints: 'End of each chapter (subchapter 3/C)',
  branchingPaths: 'Binary choices create exponential path combinations',

  // ========== CHAPTER 1 CONTEXT ==========
  // This is the canonical starting point for ALL story generation.
  // The LLM MUST use this as the foundation when generating 1B and 1C.
  chapter1AContext: {
    title: 'The Envelope',
    setting: 'Jack\'s office above Murphy\'s Bar, 2 AM, rainy night',
    events: [
      'Jack discovers a mysterious letter on his desk stamped "Return to Sender"',
      'The letter is addressed to "Victoria, c/o The Threshold, 404 Acheron Ave" - a street that was paved over 5 years ago',
      'The return address shows Jack\'s own handwriting, which he doesn\'t remember writing',
      'Inside is a photograph of the alley behind Murphy\'s with a silver glyph drawn on the door',
      'When Jack investigates the alley, the glyph is NOT visible on the actual door',
      'The photo reacts physically: it grows warm and the silver ink appears to move when near the door',
    ],
    keyMysteries: [
      'Who is Victoria?',
      'What is "The Threshold"?',
      'How did a letter appear in a locked room?',
      'Why is the glyph visible in the photo but not on the actual door?',
      'How was Jack\'s handwriting forged so perfectly?',
      'What is the silver ink, and why does it seem alive?',
    ],
    characterState: {
      jack: 'Suspicious, professionally skeptical, treating the impossible letter as evidence to be analyzed',
      atmosphere: 'Cold, damp, rain-soaked, bass from Murphy\'s jukebox vibrating through the floor',
    },
    continuesTo: {
      '1B': 'Jack investigates further, possibly seeking answers about the glyph, Victoria, or The Threshold',
      '1C': 'The investigation deepens, leading to a critical decision point that will shape the rest of the story',
    },
  },

  pacing: {
    chapters2to4: {
      phase: 'RISING ACTION',
      focus: ['Investigating leads', 'Uncovering clues', 'Building relationships'],
      tone: 'Mystery deepening, trust forming',
    },
    chapters5to7: {
      phase: 'COMPLICATIONS',
      focus: ['Betrayals revealed', 'Stakes escalate', 'Moral complexity'],
      tone: 'Paranoia, doubt, personal cost',
    },
    chapters8to10: {
      phase: 'CONFRONTATIONS',
      focus: ['Major revelations', 'Direct confrontations', 'Truth exposed'],
      tone: 'Climactic, intense, consequential',
    },
    chapters11to12: {
      phase: 'RESOLUTION',
      focus: ['Final confrontation', 'Consequences manifest', 'Fate determined'],
      tone: 'Cathartic, definitive, earned ending',
    },
  },

  // ========== BEAT TYPE CONSTRAINTS ==========
  // Forces tempo variation to prevent narrative "sameness"
  // Each chapter has a required beat type that overrides default pacing
  chapterBeatTypes: {
    1: {
      type: 'INCITING_INCIDENT',
      description: 'The impossible arrives: Jack receives a letter he wrote but did not write, leading to a photo with living ink',
      wordCountModifier: 1.0,
      requirements: [
        'Continue from the dead letter discovery and silver glyph photo',
        'Jack investigates the impossible: the ink, the glyph, Victoria, The Threshold',
        'Build mystery without providing easy answers',
        'Establish the uncanny tone: things that should not exist, do',
        'End 1C with a decision that sets the investigation direction for Chapter 2',
      ],
      notes: '1A is static. 1B and 1C are generated based on player choices in 1A.',
    },
    2: {
      type: 'INVESTIGATION',
      description: 'Methodical evidence gathering, interview-heavy, building the case',
      wordCountModifier: 1.0, // Standard length
      requirements: ['Skeptical analysis', 'Discovery of new evidence', 'End with a mystery to follow'],
    },
    3: {
      type: 'REVELATION',
      description: 'Major discovery that recontextualizes previous events',
      wordCountModifier: 1.0,
      requirements: ['Shocking reveal about a trusted character', 'Jack questions his assumptions', 'Stakes raised significantly'],
    },
    4: {
      type: 'RELATIONSHIP',
      description: 'Character-focused, trust dynamics, personal stakes',
      wordCountModifier: 1.1, // Slightly longer for character depth
      requirements: ['Extended dialogue with key character', 'Trust tested or earned', 'Personal vulnerability shown'],
    },
    5: {
      type: 'TENSION',
      description: 'Building dread, surveillance, being watched',
      wordCountModifier: 1.0,
      requirements: ['Sense of being followed/watched', 'Paranoia justified', 'Near-miss danger'],
    },
    6: {
      type: 'CHASE',
      description: 'High action, short punchy scenes, physical danger, time pressure',
      wordCountModifier: 0.85, // Shorter, faster pacing
      requirements: ['Physical pursuit or escape', 'Time-sensitive objective', 'Minimal dialogue, maximum action'],
    },
    7: {
      type: 'BETRAYAL',
      description: 'Trust shattered, ally becomes threat, isolation',
      wordCountModifier: 1.0,
      requirements: ['Trusted character revealed as compromised', 'Jack left without support', 'Emotional gut-punch'],
    },
    8: {
      type: 'CONFRONTATION',
      description: 'Face-to-face with antagonist or major corrupt figure',
      wordCountModifier: 1.1,
      requirements: ['Direct confrontation with power', 'Truth spoken to corruption', 'High stakes dialogue'],
    },
    9: {
      type: 'BOTTLE_EPISODE',
      description: 'Single location, intense dialogue, psychological pressure',
      wordCountModifier: 1.2, // Longer for dialogue depth
      requirements: ['One primary location', 'Extended dialogue exchange', 'Character psychology explored', 'Minimal scene changes'],
    },
    10: {
      type: 'RECKONING',
      description: 'Consequences of choices manifest, past catches up',
      wordCountModifier: 1.0,
      requirements: ['Previous choices have consequences', 'Character accountability', 'Setup for climax'],
    },
    11: {
      type: 'CLIMAX',
      description: 'All threads converge, maximum stakes, decisive action',
      wordCountModifier: 1.1,
      requirements: ['Multiple plot threads resolved', 'Highest stakes moment', 'Irreversible choices made'],
    },
    12: {
      type: 'RESOLUTION',
      description: 'Aftermath, reflection, earned ending based on choices',
      wordCountModifier: 1.0,
      requirements: ['Consequences shown', 'Character reflection', 'Thematic closure', 'Path-dependent ending'],
    },
  },
};

// ============================================================================
// REVEAL TIMING - Canonical pacing for the Under-Map
// ============================================================================
const getSubchapterLabel = (subchapter) => ['A', 'B', 'C'][subchapter - 1] || String(subchapter);
const DECISION_SUBCHAPTER_LABEL = getSubchapterLabel(STORY_STRUCTURE.subchaptersPerChapter);

export const REVEAL_TIMING = {
  underMap: {
    firstUndeniable: {
      chapter: 1,
      subchapter: STORY_STRUCTURE.subchaptersPerChapter,
      label: `1${DECISION_SUBCHAPTER_LABEL}`,
    },
  },
  rules: [
    `Jack does NOT know the Under-Map is real until Chapter 1${DECISION_SUBCHAPTER_LABEL}.`,
    `The first undeniable reveal that "the world is not what it seems" happens at the END of subchapter 1${DECISION_SUBCHAPTER_LABEL} (not earlier).`,
    `Before the end of 1${DECISION_SUBCHAPTER_LABEL}, all anomalies must be plausibly deniable (graffiti, coincidence, stress, faulty lighting, bad maps).`,
    `After 1${DECISION_SUBCHAPTER_LABEL}, Jack knows something is genuinely wrong with reality, but the full scope remains to be discovered.`,
  ],
};

// ============================================================================
// SETUP/PAYOFF REGISTRY - Major revelations and required foreshadowing
// ============================================================================
export const SETUP_PAYOFF_REGISTRY = [
  {
    id: 'under_map_is_real',
    payoff: 'The Under-Map is undeniably real (threshold / impossible map confirmed)',
    requiredSetups: [
      'Dead letter with glyph string and river-glass token',
      'At least one repeating glyph observed in the environment (not just paper)',
      'A "blank map" or missing-place anomaly is mentioned or witnessed',
    ],
    minSetupCount: 2,
    earliestPayoffChapter: 2,
    latestPayoffChapter: 2,
    payoffPatterns: [
      /\bunder-?map\b/i,
      /\bthreshold\b.*\b(?:opened|unlatched|yawned|gaped|split)\b/i,
      /\bthe\s+map\s+(?:moved|shifted|changed)\b/i,
      /\bstreet\s+signs?\b.*\b(?:rearranged|rewrote|changed)\b/i,
    ],
  },
  {
    id: 'victoria_guide',
    payoff: `${ABSOLUTE_FACTS.antagonist.trueName} is deliberately guiding ${ABSOLUTE_FACTS.protagonist.fullName} via symbols and thresholds`,
    requiredSetups: [
      'Signature / motif: silver ink, map-adjacent language, or rule-based instructions',
      `${ABSOLUTE_FACTS.antagonist.trueName} demonstrates knowledge of ${ABSOLUTE_FACTS.protagonist.fullName}\'s movements or choices`,
      'A message implies rules: "two maps," "don\'t name it," "don\'t follow the same line twice"',
    ],
    minSetupCount: 2,
    earliestPayoffChapter: 3,
    latestPayoffChapter: 8,
    payoffPatterns: [
      /\bvictoria\b.*\b(?:mapped|mapping|two\s+maps|rules|architect|guide)\b/i,
      /\bblackwell\b.*\b(?:map|glyph|curriculum|route)\b/i,
      /\bdead\s+letters?\b.*\bvictoria\b/i,
    ],
  },
  {
    id: 'official_containment',
    payoff: 'Someone in authority is running a containment/suppression operation around Under-Map incidents',
    requiredSetups: [
      'A site is quietly sealed or witnesses are warned off',
      'Police/officials deny or erase reports that should exist',
      'Someone disappears shortly after mentioning symbols',
    ],
    minSetupCount: 2,
    earliestPayoffChapter: 4,
    latestPayoffChapter: 10,
    payoffPatterns: [
      /\bcontain(?:ment|ed)\b/i,
      /\bsealed\b.*\b(?:site|block|area|archive)\b/i,
      /\b(?:erased|missing)\b.*\b(?:report|file|record)\b/i,
    ],
  },
  {
    id: 'gatekeeper_blackmailed',
    payoff: 'A gatekeeper character is being leveraged (blackmailed) into controlling access to a key location/person',
    requiredSetups: [
      'A character with access to restricted areas acting guilty or evasive',
      'References to someone being forced to cooperate or hide something',
      'A gatekeeper deflects questions about maps/archives/permits',
    ],
    minSetupCount: 2,
    earliestPayoffChapter: 4,
    latestPayoffChapter: 8,
    payoffPatterns: [
      /\bblackmail(?:ed|ing)?\b/i,
      /\bforced\s+to\s+cooperate\b/i,
      /\bdeflect(?:ed|ing)?\b.*\b(?:archive|permit|map|records)\b/i,
    ],
  },
  {
    id: 'five_anchors',
    payoff: 'The five anchors (missing people / anchor points) are identified as a pattern',
    requiredSetups: [
      'At least two anchor-linked disappearances are named',
      'A connecting symbol / motif repeats across sites',
      'A hint that the pattern is deliberate (not random crime)',
    ],
    minSetupCount: 3,
    earliestPayoffChapter: 5,
    latestPayoffChapter: 11,
    payoffPatterns: [
      /\bfive\s+anchors?\b/i,
      /\ball\s+five\b.*\b(?:anchors?|missing|pattern)\b/i,
      /\banchor\b.*\bglyph\b/i,
    ],
  },
];

// ============================================================================
// WRITING STYLE GUIDELINES
// ============================================================================
export const WRITING_STYLE = {
  voice: {
    perspective: 'Third person limited (close on Jack Halloway)',
    tense: 'Past tense',
    tone: 'Literary mystery thriller with surreal pressure building at the edges of the real',
  },

  influences: [
    'Tana French (atmospheric dread, psychological interiority, the past haunting the present)',
    'China Miéville (inventive strangeness, urban uncanny, the city as organism)',
    'Jeff VanderMeer (the weird made concrete, ecological/surreal texture)',
    'Gillian Flynn (thriller propulsion, sharp turns, moral ambiguity)',
  ],

  mustInclude: [
    'Atmospheric descriptions rooted in place, weather, and reflections',
    'A sense of pattern: repeating shapes, echoed phrases, mirrored actions',
    'Symbols presented as concrete objects (chalk, ink, etching, scar, stain) not abstract “magic”',
    'Jack’s rational explanations first, his doubt arriving only after evidence piles up',
    'A mystery-forward plot: clues accrue, hypotheses form, revelations reframe',
    'Fantasy elements that feel new: unfamiliar beings, rules, and textures (NO medieval/Tolkien pastiche)',
  ],

  absolutelyForbidden: [
    // Em dashes - use commas, periods, or semicolons instead
    'The em dash character \u2014. Use commas, periods, colons, or semicolons instead. It must never appear in narrative prose.',
    // AI-typical "not just X; it's Y" constructions - extremely common LLM output pattern
    '"It\'s not just X; it\'s Y" or "It wasn\'t just X; it was Y" constructions (e.g. "It wasn\'t just rain; it was a deluge")',
    '"It didn\'t just X; it Y" constructions (e.g. "The door didn\'t just open; it groaned")',
    '"X didn\'t just Y; X Z" constructions (e.g. "She didn\'t just walk; she glided")',
    'Any "not just...but" or "more than just" formulations that contrast two things with a semicolon',
    '"In a world where..." openings',
    '"Little did he know..." foreshadowing',
    '"I couldn\'t help but..." or "I found myself..."',
    'Starting sentences with "And" or "But" excessively',
    'Flowery adverbs: "seemingly", "interestingly", "notably"',
    'The words "delve", "unravel", "tapestry"',
    '"A testament to" or "serves as a reminder"',
    'Excessive hedging in narration (avoid stacking "it seems"/"perhaps"/"maybe")',
    'Overwrought or purple prose',
    'Breaking the fourth wall',
    'Summarizing instead of showing',
    'Summarizing dialogue (if conversation changes plot, write it in full direct dialogue - never "They talked for hours")',
    'Explaining character emotions directly (show through action and physical response, not narration)',
    'Tolkien-style fantasy elements: elves, dwarves, orcs, medieval feudal courts, “ancient prophecies” as a crutch',
    'Generic “magic system” exposition dumps (rules must be learned through scenes)',
  ],
};

// ============================================================================
// EXAMPLE PASSAGES - For Few-Shot Learning
// ============================================================================
export const EXAMPLE_PASSAGES = {
  atmosphericOpening: `The rain had been coming down since Tuesday, and the Underbridge Market wore it like a second roof. Water ran off the elevated tracks in ropes, struck the tarpaulins, traveled the length of them and fell again into the aisles, so that crossing the market meant crossing under three separate rains. Jack turned his collar up and got soaked anyway. Sodium light off the support pillars turned every puddle the color of weak tea. Down at the far end a generator coughed, caught, and settled into a hum.

He had come for a name and a shoebox of somebody's undelivered mail. Two hundred dollars, cash, no finding anyone who did not want to be found. He counted stall numbers while he walked, because that was what his hands did when the rest of him had quit. The numbers were stenciled on the pillars in white paint gone gray with exhaust. Sixteen. Seventeen. Eighteen. Twenty.

He stopped and went back.

Eighteen sold secondhand phone parts under a bare bulb. Twenty sold umbrellas, all of them black, all of them open and hanging upside down from a rail like a roost of bats. Between them the aisle simply continued. No gap in the paving. No seam where a stall had stood. The pillar between eighteen and twenty carried no stencil at all, only the ghost of one, a rectangle of concrete a shade cleaner than the concrete around it.

"You're standing in the wet," the umbrella woman said. She had not looked up from her ledger.

"There's no nineteen."

"There's no nineteen," she agreed, and turned a page. "Never has been. You want a stall, the office is on Callow Street."

Jack put his hand flat against the clean rectangle. It was warmer than the rest of the pillar, the way stone holds afternoon after dark, and there had been no sun over Ashport in eleven days.

He thought of the 1974 plan he had pulled at the Civic Archive in March, the market laid out in a clerk's fine hand, thirty-one stalls, all of them numbered in sequence. He had filed it back himself. He remembered the order.

Under his palm, cut shallow into the concrete and filled with something that felt like wax, was a shape. Three strokes and a closed loop. He had seen it that morning, on the back of a black envelope, pressed into a seal that would not soften.`,

  dialogueExample: `The elevator opened directly into the room, which told Jack something about who else was allowed up here. Nobody. The glass ran floor to ceiling on three sides. Ashport lay below in wet orange smears, the river a black seam stitching the districts together.

Victoria Blackwell was standing at the window with her back to him, holding a glass she had not drunk from.

"You went to Kellerman Street," she said.

"I went past it."

"Past." She turned the glass a quarter turn. "That's a careful word."

Jack stayed near the elevator. There was a chair he did not sit in. "There's an etching on the third stair of the service stairwell. Cut, not drawn. Somebody took time over it."

"Somebody usually has."

"It matches a mark on a 1961 sewer survey. The survey is in the Civic Archive. The stairwell was poured in 1988."

She said nothing. Below them a train crossed the elevated line and the whole grid of reflections in the glass slid two inches to the left and settled.

"That's a filing problem," Jack said. "Not a mystery. A drawing gets copied. Somebody carries a motif forward. It happens."

"Then you have your answer and you can go home." She finally faced him. Her eyes did the thing they did, which was to arrive somewhere a half second before the rest of her. "You didn't come here for an answer. You came for permission."

He looked at his hands. He had been rolling the corner of his notebook between thumb and forefinger until the paper had gone soft. He stopped.

"Tell me what's down there."

"I'll tell you three things and none of them are that." She set the glass on the sill without a sound. "One. Count before you cross. Whatever the number is, the number is the promise. Two. Never mark a threshold you have not already walked. Three. If the same sign meets you twice in one night, go home by a different street and do not look back at the second one."

"Those are rules."

"Yes."

"I asked a question."

"You asked me to make it smaller." She smiled without warmth. "A map is a promise, Jack. Break it, and the city breaks back."

Rain crawled sideways on the glass. Twelve floors down, the streetlights held their halos steady, and Jack counted them without deciding to, and got a number he did not like.`,

  internalMonologue: `Murphy's closed at two, and the floorboards told him so, one board at a time, somebody walking the room killing lights. Then the building settled and the rain took over the sound.

Jack sat with the lamp pulled down low and the notebook open at a fresh page. He wrote the date. He wrote the weather, because weather was a fact and facts were free. He wrote: 18, 20, no 19, stencil ghost, pillar warm. He wrote: umbrella seller, ledger, did not look up. He did not write her face and he did not write where she parked the van she loaded at closing, though he had seen it and could have drawn the plate from memory.

That was the rule. Things went in the book. People stayed out of it.

The whiskey was in the drawer, and the drawer was open, and he had poured two fingers an hour ago and gotten through half of it, which counted as restraint. He turned the glass a quarter turn on the desk without lifting it. There was a ring under it going brown at the edges, a series, one ring a night, and he could have counted back through them the way a man counts rings in a stump, and would have arrived at a Tuesday in March two years ago, so he stopped.

He wrote instead. Chalk or wax. Cut, not drawn. Cut means tools, means time, means somebody knelt there in the wet with a chisel and nobody in that market saw it or nobody said.

Under that he wrote: WHO ISSUES STALL NUMBERS.

That was a records question. Records questions had answers with dates on them, and file numbers, and a clerk's initials in the corner, and a person could spend three days inside a records question and never once give a stranger the address of a person who had gone to some trouble not to be found.

The rain went sideways past the window and the neon from the bar sign came up through it, red, then off, then red.

The Civic Archive opened at nine. Zoning would have the market plats going back to the thirties. He capped the pen and looked at the coat on the door and started counting the hours until nine.`,

  tenseMoment: `The service door on the fourth floor of the Wexler Building had been unlocked for eleven minutes, and Jack had spent nine of them standing still.

He counted the corridor again. Six doors, three to a side, a window at the far end with the rain crossing it sideways. Wet concrete. A radiator ticking behind the plaster.

The trouble was the coat.

It hung beside 4C, a man's oilskin, dark at the hem. When he came up the stairs it had been on the second hook. He was certain of that the way he was certain of a filing date: completely, with no way to prove it.

Now it was on the third hook.

He did the sensible things in order. He looked for a draft along the floor and found none. He tested the hooks and they were screwed tight into the plaster. He put two fingers on the oilskin. Cold. Damp on the outside only. Ashport rain went through a coat like that in a minute and left it heavy to the lining. This water sat on the surface the way water sits on something carried, not worn.

He wrote the time in the notebook. 11:48. Then he listened to the building.

The radiator ticked. Under it, a floor down or two, a door closed, and the sound came up late, as though the stairwell were longer than the four flights he had climbed.

He turned back to the landing. His footprints lay there, drying at the edges. He had climbed on the left, by the rail, where the treads were quietest. The prints ran along the left. Then they crossed. Then they ran along the right, out to the corridor, in a clean unhurried line.

He stood over them a while.

There were explanations. Wet shoes. A shift of weight. A janitor with the same size feet and the same route on the same wet night.

He put the notebook away without writing it down.

At the end of the corridor the window held the hallway back at him: the doors, the coat, a man standing very straight in the frame. Nothing moved in it that was not him.

He watched it anyway for a count of ten, to see which of them got tired of waiting first.`,

  decisionSetup: `The chalk was fresh. Jack crouched and touched it and it came away on his fingertip, still damp, chalk and rain making a paste that smelled of the river.

Three marks on the shutter of a stall that sold nothing but doorknobs. A hooked line, a break, a closed loop. He had photographed the same sequence on Tuesday, on a stanchion under the tracks a half mile east, and again on Thursday, cut into the mortar behind the laundromat on Pell. Same order. Same spacing, near enough that the difference sat inside his own hand's error.

He took out the folded photocopy. Bramwell Street, zoning survey, 1961. The street had been closed and built over in 1968 and appeared on no map printed since. The surveyor's notation ran along its western edge in a neat draftsman's hand: a hooked line, a break, a closed loop.

Behind him the market was packing up. Tarps came down, water sluiced off them, someone dragged a cage of pigeons across wet asphalt.

Jack stood with the paper in one hand, the stall lamps swimming in the puddles, and made himself read it the way he read any series. A series has an order. The order tells you something.

The marks had been ahead of him every time. Tuesday, Thursday, tonight, each one on a road he was already walking, set down before he arrived. Somebody was putting out lamps for a man coming home in the dark. Blackwell had told him to follow them. Blackwell had never once said where they went.

But he had gone back to Pell on Friday and found a fourth mark on the wall opposite, facing the first, and outside the sequence. It was a tally. Four strokes, one crossed through. And that morning there had been chalk dust on the frame of his own door, at the height of his shoulder, as though something had been measured there and the number written down somewhere else.

Lamps for a man walking home. Or stakes driven at the corners of a lot before the survey crew arrives.

He stood with his hand still white to the knuckle and looked down the row of shutters at the doors he had already been shown.

Which one was he standing inside?`,

  // ========== NEW A+ QUALITY EXAMPLES ==========

  characterConfrontation: `The laundromat was empty except for one dryer turning nothing but its own heat. Nadia Prine had her back to him, feeding coins into a machine that was already running.

"I want to ask about the wall again," Jack said.

"I told you. Kids."

"You did." He set the notebook on the folding table and opened it flat so she could see the columns. "This is your paint. Ashport Hardware, Cutler Avenue. Eleven receipts in fourteen months, all the same grey, all quart tins. Nobody buys quarts eleven times. You buy quarts when you're covering the same square yard over and over."

The dryer stopped. The room got large around the silence.

"March ninth," he said. "April sixth. May fourth. Then it slides. June first, June twenty-ninth. Twenty-eight days, every time, except the two you missed."

Her hands went still on the coin slot. She did not turn around.

"Kids don't keep a calendar," Jack said. "You do."

"I'm closing."

"It's four in the afternoon."

She turned then. He had been half expecting this and did not enjoy being right about it. There was no heat in her face at all. She had the flat, tidy look of a person who had been carrying the same weight every day for a long time and had built a routine around it the way you build a splint.

"The wall is a wall," she said.

"Then let me photograph it."

"No."

"Nadia."

"You want me to say a word." Her voice stayed low and level. "I'm not going to say it in my own shop. I have a lease. I have a girl in school on Bellamy."

Jack looked at the notebook, at his own handwriting, at fourteen months of somebody else's discipline reduced to a column of dates. He closed it.

"What happens if you don't paint it?"

She picked up a lint tray and emptied it into the bin, and did it slowly, and put it back.

"Come on a Tuesday," she said. "Any Tuesday. Not after dark, not on the twenty-eighth day, and not with a camera. Look at it and go."

"That's not an answer."

"That's the whole thing I have."

He stood in the doorway a moment. Through the back window the alley wall showed grey on grey, a fresh rectangle inside an older one.`,

  emotionalRevelation: `The request slip was in the wrong pocket of the folder, behind the tab, the way a page slides when a file has been opened and closed too many times.

Jack pulled it out with two fingers. Civic Archive stock, pale green, the perforated stub still attached. Box 44, Series 9, Bramwell Street closures, 1961. His own printing in the requester line, dated the eleventh of March, two years ago. He remembered the day. Rain coming in sideways off the harbor, bad coffee, a client who paid cash and would not sit down.

Under his name there was a second line he had never read.

Countersigned. The ink was silver and it did not sit flat on the paper. He turned the slip toward the desk lamp and the letters slid a quarter inch to the left, the way a coin moves under water. The date beside them was the ninth. Two days before the man ever walked into his office.

Jack set the slip down. He put both hands on the desk, one on either side of it, and did not move them.

He had carried the shape of that case for two years and he had it wrong in one place, and one place was enough. He had believed he took the job, pulled the file, found the address, gave it up. The order mattered. The order was the whole of it. A man had asked him to find someone. He had found him. The finding had been his.

The file was pulled before the job existed.

His thumb went to the edge of the slip and pressed until the paper bowed. Downstairs Murphy's was doing its Thursday business, the low hum of a room full of people talking about nothing. Somebody laughed. The laugh came up through the floorboards and went out again.

He had not sold anyone. He had been handed a shovel and pointed at a patch of ground, and he had dug where he was pointed, and the thing he found had been put there for him to find.

He read the slip again. The silver had moved. It always moved. It would not hold still for a camera. Below his own printed name, in a hand he would come to know, it said WITH THANKS.`,

  chaseSequence: `Jack took the stairwell at Corliss and Ninth two treads at a time.

He counted going down. Habit, fifteen years old. Eleven to the half landing. Eleven to the door.

Above him a door opened and did not close.

He hit the street. Rain came at him level off the harbour. Neon bled up out of the wet asphalt, red then green, his own shape going along beside him in pieces.

Left on Corliss. He did not look back. Looking back costs a stride and buys nothing.

The pedestrian tunnel under the freight cut was a hundred and eighty yards. He knew the number. He had traced it off a 1988 sheet with his thumb, the summer he was twenty-four and still filing for a living.

He went in at a run.

Tiles. Sodium light every twelve feet, so fifteen lamps, and he counted those too because his mouth was dry.

Fifteen. Then sixteen. Then seventeen.

He slowed. He put a hand on the tile and kept moving, and the tile was cold and gritty and ordinary, and the lamps kept coming.

Twenty-one.

That was two hundred and fifty yards of tunnel under a cut a hundred and eighty yards wide. A surveyor's chain does not stretch. Land does not swell. Somebody built this in 1988. Somebody measured it. The measurement was on file.

He came out the far end breathing hard.

Wrong side.

The freight cut was still on his left. It had been on his left going in. Go under a thing and it changes sides. That is not opinion, that is the first page of anything.

The elevated tracks ran above him, and the Underbridge stalls were folded shut beneath them, tarps roped down and going grey with rain.

Footsteps came out of the tunnel behind him. Unhurried. Not running, and not slowing either.

He went up the maintenance ladder to the track deck, coat snagging on every rung.

The city opened out. Rooftops, water towers, the harbour a flat black plate at the edge of it.

He looked down at the tunnel mouth.

Nobody came out.

He stood in the rain with the rail humming under his boots and did the arithmetic again. It came out the same. It kept coming out the same.`,

  investigationScene: `The Civic Archive gave him a reading table under a window that had not been washed since the building went municipal, and a cart with four flat boxes, and forty minutes before the desk closed.

Ashport Sanitary and Drainage Survey, 1953. Linen-backed sheets, one to a block group, forty of them.

He worked through the box the way he had been taught: left thumb on the stack, sheets over one at a time, eyes on the top right corner where the draughtsman inked the number.

Seventeen. Eighteen. Twenty.

He went back and did it again slower, and got the same thing. Then he stopped looking at the numbers and started looking at the margins.

Every sheet carried a neighbour key, a little cross of boxes: adjoins 12, adjoins 20, adjoins 26. Eighteen said it adjoined nineteen. Twenty said it adjoined nineteen. Nineteen was not in the box, and the index card taped inside the lid said the series ran one to thirty-nine.

Thirty-nine. Not forty.

Misfiled, then. Oversize sheets travelled; he had misfiled a hundred of them himself. He pulled the drawers on either side and the storm-sewer series above it and found nothing but storm sewers.

Conservation, then. Linen backing failed at the folds and sheets went out for repair for years at a time. The repair log lived behind the desk and he asked for it and read it twice. No 1953 sanitary sheets, ever.

A call slip, then. Somebody had it out. The request book went back to 1971 and the clerk let him take it to the table, and in fifty-four years nobody had asked for sheet nineteen. Nobody had asked for it because there was nothing to ask for.

He sat with that.

Then he looked at the index card again, at the typeface, at the ink. The other lids in the cart were typed on a machine with a chipped lower-case e. This one was clean. This one was newer.

Somebody had not taken a sheet out of a series. Somebody had taken the number out of the count, and retyped the card so the count came out even, and left the neighbour keys alone because they were inked by hand in 1953 and could not be retyped without redrawing the city.

Sheet nineteen covered eleven acres between Corliss, Ninth and the freight cut.

Jack put his pencil down and did not pick it up again.`,

  quietMoment: `The rain stopped a little after six, the way it did maybe twice a month, and the quiet it left behind had a sound of its own, gutters emptying, a pigeon walking the sill.

Jack noticed the map because the light changed. Sheet four of nine, Ashport zoning, 1968, thumbtacked to the plaster since the week he moved in, and the bottom left corner had curled and cracked along the fold.

He took it down with both hands, one at each top corner, and laid it face down on the desk after he had cleared the desk, which took longer than the repair would.

The tin lived in the bottom drawer. Linen tape, a bone folder worn shiny at the tip, a soft brush he had walked out of the Records Office fifteen years ago and never once thought to return. He brushed the back of the sheet from the center outward, always outward, because that was how Doreen had taught him and Doreen had been right about everything to do with paper.

He cut the tape with a blade instead of scissors. Scissors stretch it. He laid the piece across the split, thumbed it down, then went over it with the folder in slow passes until the crack stopped being a shadow.

He waited the two minutes. He always waited the two minutes.

Downstairs, the delivery came for Murphy's. Bottles in crates, the clatter going up through the floor, a man out on the wet sidewalk whistling something with no tune in it. A bus went by on Harrow with all its lights on and nobody riding. The whistling stopped, started again, moved off toward the corner.

He made coffee in the pot with the cracked handle, poured one cup, put in the sugar and did not stir it, which was a thing he had started doing at some point and had never examined.

Then he hung the map back up. Sheet four covered the old riverfront, streets that had been paved over before he was born, names nobody used. He had four, five, seven, and two others. He had never found three.

He stepped back to the middle of the room and looked at it. The bottom edge sat a quarter inch low on the left. He drank his coffee and left it that way.`,
};

// ============================================================================
// CONSISTENCY RULES - Organized by category for comprehensive coverage
// ============================================================================
export const CONSISTENCY_RULES = [
  // CHARACTER NAMES & IDENTITIES
  'Jack always calls Victoria "Victoria" or "Blackwell."',
  // REALITY REVEAL TIMING (Critical pacing constraint)
  ...REVEAL_TIMING.rules,
  // SETTING & ATMOSPHERE
  'Ashport is always damp, overcast, or recently rained; the city is defined by reflections, sodium streetlight halos, and neon smear on wet pavement.',
  'Murphy\'s Bar is directly below Jack\'s office (Jack can hear the jukebox through the floorboards).',
  'This is NOT medieval fantasy. The surface world is modern. The fantasy world is hidden, infrastructural, and uncanny.',

  // SYMBOL RULES (Core mystery engine)
  'Glyphs are called Dead Letters. They recur in the city and in Victoria\'s letters.',
  'Glyphs are not "spells." They are keys to thresholds, and they do not work everywhere.',
  'Silver ink in Victoria\'s letters does not photograph cleanly; attempts to capture it produce blurred or doubled lines.',

  // CHARACTER TRAITS (Immutable)
  'Jack\'s default coping mechanism is rationalization and documentation (notes, sketches, photos, maps).',
  'Victoria\'s presence is clean and unsettling: odd scent, calm diction, exact phrasing.',

  // THRILLER CONSTRAINTS (No Tolkien pastiche)
  'No elves/dwarves/orcs, no feudal courts, no "chosen one prophecy," no faux-Old English diction.',
  'Fantasy beings (if encountered) must feel unfamiliar and specific: more like living architecture, stitched light, or rule-bound anomalies than "classic races."',

  // CREATIVE FREEDOM
  'You may generate any supporting characters as the story requires.',
  'Character names, relationships, and arcs are flexible except for Jack and Victoria.',
];

// ============================================================================
// GENERATION PARAMETERS - Optimized for quality and consistency
// ============================================================================
export const GENERATION_CONFIG = {
  // Temperature settings
  // NOTE (Gemini 3.5): the LLM layer no longer sends sampling params (temperature/
  // topP/topK), the model uses its tuned defaults per Google's 3.5 guidance.
  // This section is retained for backward compatibility and future provider swaps only;
  // values here are not applied to Gemini 3.x requests.
  temperature: {
    narrative: 1.0,
    dialogue: 1.0,
    decisions: 1.0,
    expansion: 1.0,
  },

  // Token limits - keep subchapter output bounded for mobile latency.
  // IMPORTANT: Thinking tokens consume output budget. Core narrative uses medium
  // thinking for gameplay latency; values below leave headroom for reasoning +
  // structured story output.
  // Gemini 3.5 Flash: 1M input / 64k output
  maxTokens: {
    subchapter: 65536,    // Main narrative generation; enough for ~900-1500 words + thinking
    expansion: 32000,     // For expansion requests (currently disabled)
    validation: 8000,     // For simple validation passes (uses 'low' thinking)
    pathDecisions: 65536, // Same as subchapter - complex multi-path generation
    classification: 8000, // For personality classification (uses 'low' thinking)
    arcPlanning: 32000,   // Complex multi-chapter arc planning (uses 'high' thinking)
    outline: 32000,       // Chapter outlines and decision generation (uses 'high' thinking)
    consequences: 16000,  // Consequence generation (uses 'high' thinking by default)
    llmValidation: 32000, // LLM-based semantic validation (uses 'low' thinking, but structured output)
  },

  // Word count requirements.
  //
  // A player-visible path is 3 segments: opening + firstChoice response + ending.
  // At the 380-420 per-segment target that is 1140-1260 words, with a hard
  // validation floor of 900 (3x300).
  //
  // promptTargetMultiplier is 1. It used to be 1.25, a deliberate over-ask to
  // counter an older model's undershoot, and the effect was a prompt that asked
  // for ~1500 words per path while also capping each of the three segments at
  // 420, arithmetically impossible, and the rational response to an impossible
  // length rule is to discount every length rule in the prompt. The real cause of
  // short output was the exemplar corpus demonstrating short passages, which is
  // fixed where it belongs: in the exemplars.
  wordCount: {
    minimum: 900,         // 3x300 word segments minimum (hard validation floor)
    target: 1200,         // 3x400 word segments target
    promptTargetMultiplier: 1,
    maximum: 1500,        // Headroom above the target
  },

  // Quality assurance settings
  qualitySettings: {
    maxRetries: 1,                    // Reduced - prefer warnings over expensive retries
    minSentencesPerParagraph: 3,      // Ensures substantial paragraphs
    maxConsecutiveDialogue: 6,        // Prevents wall-of-dialogue
    requireAtmosphericOpening: true,  // Every chapter should set the scene
    // Expensive. Keep OFF for normal gameplay latency.
    // When enabled, the engine may make extra LLM calls to invent consequences for past decisions.
    enableLLMDecisionConsequences: false,
    // Validation gating (disable for low-latency gameplay)
    enableProseQualityValidation: true,
    enableSentenceVarietyValidation: true,
    enableLLMValidation: true,
    // LAZY BRANCHING: when true, A/B subchapters generate only the opening +
    // firstChoice + second-choice labels up front, and the 3 second-choice
    // response bodies are generated on demand when the player picks a first
    // choice. Cuts generated content ~half.
    // ⚠️ ENABLED FOR ON-DEVICE VERIFICATION. If anything looks broken (blank
    // endings, stuck loading), set this back to false for the proven full-tree path.
    lazyBranchGeneration: true,
  },
};

// ============================================================================
// EXTENDED STYLE GROUNDING - Longer examples for deep pattern learning
// ============================================================================
export const EXTENDED_STYLE_GROUNDING = {
  // A complete scene with rising tension (shows pacing, dialogue interleaved with action, psychological complicity)
  tensionScene: `The man worked the bottom landing of the Underbridge stairs like a tradesman on a schedule. Jack watched him from behind the fruit stalls, forty feet back, rain coming off the track bed above in long gray ropes.

First the sweeping. A stiff brush, short strokes, corner outward, until the concrete showed its own color again. He bagged the sweepings. He did not shake the bag out into the gutter with the rest of the market's leavings. He knotted it twice and set it inside his coat.

Then the scraping. A four inch blade held at a low angle, worked across the riser where somebody had chalked something before him. He took his time. He went back over the same six inches until the ghost of it was gone, then went over it again.

Jack counted. Eleven passes on a mark that had come off in three.

The man wet the concrete from a plastic bottle and dried it with a rag folded in quarters, refolding to a clean face each time, four faces, no repeats. He knelt. From a tin he took a length of blue chalk, squared at both ends, and a folding rule the color of old butter.

He measured from the wall. He measured from the stair nose. He wrote the two numbers on the back of his hand in pencil, checked them against a card from his pocket, and rubbed the card between his fingers until the ink was gray mud.

The first stroke went down in one motion, no hesitation in it, a man signing his own name for the ten thousandth time.

Then he stopped and looked up the stairwell.

Nothing was there. Jack had been watching the top of the stairs for twenty minutes. The man looked anyway, the way you check a pot you know is not boiling, and went back to the chalk.

Second stroke. Third. He left a gap where a fourth belonged.

He packed the tin. He stood, knees cracking, and walked backward up four steps before he turned around, and Jack wrote that down, backward, four, because it was the only part he could put a number on.

The rain went on above them. Somebody two stalls over was selling brass hinges with no doors.

The man passed within six feet of Jack on his way out, smelling of wet chalk and clean laundry, and did not look at him.

The gap stayed empty on the riser. Jack did not go down and fill it in.`,

  // A revelation moment (shows how to deliver information that recontextualizes everything)
  revelationScene: `The dead end behind Cantwell Street had eleven steps down to a service door and nothing else in it worth a name.

Jack counted them on the way down. Eleven. He wrote it in the notebook with the time, 2:14, and the weather, still raining, and he put his back to the door and counted them going up.

Fourteen.

He did it again. Down, eleven. Up, fourteen. He stopped halfway and looked at his own boots on the tread and could not find the place where the extra three had gone in.

So he stopped counting and started measuring.

The tape hooked on the bottom nosing and ran up to the landing lip. Nine feet four. He walked it up, let the tape wind back, hooked it at the top and ran it down. Nine feet four. The steps agreed with each other. They only disagreed with him.

He photographed the wall. The flash came back off the wet brick in a white smear, and in the smear, low down where the mortar had been repointed, a shape sat in the joint. Three strokes and a gap. He had drawn that same figure eleven times in his notebook in the last four days and had never once seen it cut into anything.

He put his thumb on it. Cold, and deeper than a scratch, the edges soft the way old cut stone goes. The brick around it was newer than the mark.

He took the chalk out of his coat.

Jack was not a superstitious man. He was a man who checked a series for the missing entry. He drew the fourth stroke into the gap, the way the mark itself was asking for, and he stepped back with the chalk still in his hand and his pen already uncapped to write down nothing happened.

The service door unlatched.

No hand on it, no wind. The bolt withdrew into the door with the flat clean sound of a filing drawer coming open, and the door stood off its frame by two inches, and behind the two inches was not the utility corridor he had walked through in 1997 on a records survey and remembered as green paint over cinderblock.

Behind it was a stair going down.

Jack held the door at arm's length and leaned in as far as his shoulder and no further. Cold air came up it, dry, moving, smelling of chalk dust and cut brick.

He counted the steps he could see. Eleven, and the light gave out.`,

  // A chapter ending (shows how to create that "one more chapter" compulsion)
  chapterEnding: `It took the market forty minutes to decide nothing had happened.

The tarps went back up. The generator caught on the third pull and the bulbs came on yellow, then white, and the woman who sold radio parts began laying them out again in rows on a square of grey felt. Nobody looked at the stairwell. That was the part Jack kept coming back to. Not one of them looked at it, and the not-looking was practiced, the way you do not look at a man asleep on a train.

He stayed until his knees ached. Ondrej's stall stood open the whole time with the cash tin on the counter in plain view, and nobody touched it, and nobody closed the shutter, and at ten past one somebody laid a tarp over the goods without a word and walked off.

Jack wrote it down. Time, weather, the order the lights came back in. He wrote that Ondrej had gone down eleven steps and that he had counted them aloud from the top, and that on the twelfth there had been no sound of a foot, and no sound after that. He wrote that the stairwell was fourteen steps. He wrote that he had walked down it himself and come out into a service passage that smelled of hot iron and ended in a locked door with rust grown through the hinges.

He did not write what he thought. He had a rule about that.

The rain had thinned to a mist by the time he came up Pell. Murphy's was closing, chairs going up onto tables, the neon buzzing on its bad transformer. Upstairs he hung his coat on the back of the door and stood dripping in the dark before he went looking for the lamp.

He had touched the chalk at half past eleven. After that he had stood two hours in the rain with his hand bare, put it in his pocket, put it on the wet rail going down, washed it under a tap in the passage.

The lamp came on.

Across his palm the three marks lay where they had printed themselves, hooked line, break, closed loop, white and powder dry, while the water ran off his sleeve and pooled around his boots and would not go near them.`,

  // Dialogue under tension (shows subtext, what's unsaid, power dynamics)
  dialogueUnderTension: `The market ran the length of four blocks under the elevated line, tarp roofs sweating, everything lit in the brown-gold of bulbs strung on extension cord. Jack found Renata Voss at the stall that sold nothing but keys.

"You're out late for a filing clerk," she said.

"So are you."

"I'm shopping." She lifted a key off the felt, a long brass one with a square bit, and held it up to the bulb. "Look at the wear. Somebody used this every day for thirty years."

"For what."

"That's the part they don't sell you."

Above them a train came through, and the whole market went into its two seconds of noise, tarps shivering, the strung bulbs swinging their shadows across the tables. At the next stall a radio dropped into static and came back on a different station.

Jack waited for the quiet. "I pulled the plat books for Kessel Row."

"Mm."

"Fourteen buildings. The numbering runs one to fifteen."

Renata set the key down. She lined it up with the others, parallel, the way you square a stack of paper.

"Old surveys are full of that," she said.

"They are."

"Transcription. Two clerks, one ledger."

"Sure."

She picked up a second key. Her thumb moved on it. Three stalls down, a man in a wet coat had been sorting the same box of doorknobs for eleven minutes, and had not once picked one up.

"Renata."

"Don't." She said it pleasantly, smiling at the keys. "Not here. There are about forty people under this bridge and I know eleven of them."

"I'm not asking you to say anything."

"You're asking me to stand still while you say it, which is worse."

The vendor came back with a paper cup of tea and put it down between them, and they both looked at it, and neither took it.

"Buy something," Renata said. "You've been standing at a stall for ten minutes with your hands in your pockets."

Jack bought the long brass key for four dollars. It was warm from the bulb.

"When you're back at the Archive," he said, "the plat books are on the second tier."

"I know where they are." She was already walking. "So does everyone else who ever wanted them."

Behind him the radios came back into agreement.`,
};

// ============================================================================
// ANNOTATED EXAMPLES - Teaching WHY techniques work
// ============================================================================

// ============================================================================
// NEGATIVE EXAMPLES - What NOT to write (with explanations)
// ============================================================================
export const NEGATIVE_EXAMPLES = {
  tellDontShow: {
    badVersion: `Jack suddenly realized the symbols were magical, and he felt terrified and shocked. The world was not what it seemed, and everything changed forever. He couldn't help but feel like his life was over.`,
    problems: [
      '"Suddenly" - false urgency, tells instead of shows',
      '"Felt a wave of shock" - abstract emotion, not physical',
      '"Weight of the revelation" - cliché metaphor',
      '"Couldn\'t help but notice" - forbidden phrase, passive voice',
      '"In that moment" - filler phrase, adds nothing',
      '"Profound sense of betrayal" - abstract, tells reader what to feel',
    ],
    goodVersion: `The symbol on the paper did not sit still.

Jack blinked. Looked away. Looked back.

The silver line had shifted a hair to the left, as if it had decided it preferred that shape.

His thumbnail scraped the ink. It didn't smudge. It didn't lift. It didn't feel like anything at all, and that was the worst part. Paper had texture. Ink had drag. This had nothing.

Downstairs, Murphy's jukebox changed songs without anyone touching it.`,
    whyItWorks: [
      'Physical action (cup finding desk) shows dissociation',
      '"Didn\'t remember" shows shock through lost time',
      'One-word paragraph creates impact through isolation',
      'Specific (signature, handwriting) beats abstract (betrayal, shock)',
    ],
  },

  overwrittenDialogue: {
    badVersion: `"So the Under-Map is real and the glyphs are keys," Jack said, terrified. "This changes everything and I feel like I'm losing my mind."

"Yes," Victoria replied mysteriously. "You are the chosen one and you must fulfill the prophecy."`,
    problems: [
      'Adverb tags ("angrily," "desperately") tell what dialogue should show',
      'Characters explaining their emotions explicitly',
      'Dialogue too on-the-nose, people don\'t speak their subtext',
      'No physical action, talking heads',
      'Melodramatic phrasing ("everything we ever stood for")',
    ],
    goodVersion: `"You're sure this is just graffiti?" the woman asked.

Jack kept his eyes on the photo. "It's paint. It's a marker. It's whatever it needs to be so I can sleep."

"Jack."

He swallowed. "If I say it out loud, then it's real."

She didn't argue. She only slid the second photo across the table, the one taken three blocks away, same symbol, same angle, same line weight, like the city had traced it with the same hand.`,
    whyItWorks: [
      'Minimal dialogue does more than speeches',
      'Physical grounding (hand on desk) shows need for stability',
      '"Just the name" - narration notes the inadequacy of words',
      'The unanswered question is more damning than any answer',
      'Subtext (devastation, betrayal) lives beneath simple words',
    ],
  },

  flatPacing: {
    badVersion: `Jack went to the place. He saw a symbol. He was confused. Then he went somewhere else. He saw another symbol. It was spooky. Then he found a clue.`,
    problems: [
      'Every sentence same length and structure',
      'No variation in rhythm, monotonous',
      'Action without meaning or tension',
      '"Very interesting" - empty value judgment',
      'No sensory detail, no atmosphere',
      'Events listed rather than experienced',
    ],
    goodVersion: `The underpass smelled like wet pennies and old engines.

Jack stopped under the third pillar because that's where Tom's text said the mark would be.

It was there. Fresh. Too fresh. The concrete still glistened around the cut line as if it had been carved from inside the slab, not scratched onto it.

He raised his phone to photograph it. The screen showed the pillar. It showed his own hand.

Where the symbol should have been, there was only blur, a smear of silver that refused to resolve into a shape.`,
    whyItWorks: [
      'Varied sentence length creates rhythm',
      'Sensory details (rusty hinges, sound) establish atmosphere',
      'Short paragraphs create pacing, build tension',
      'Delayed recognition ("he knew that handwriting") creates dread',
      'Specific physical details (whisper of tape) make scene real',
    ],
  },

  heavyForeshadowing: {
    badVersion: `Jack looked at the symbol, not knowing this was the moment his life would change forever. Little did he know the Under-Map was about to reveal itself. Everything was about to become magical.`,
    problems: [
      '"Little did he know" - forbidden phrase, breaks immersion',
      'Tells reader something important is coming, destroys tension',
      '"Change everything forever" - vague, melodramatic',
      'Narrator intruding with future knowledge Jack doesn\'t have',
      'Promises impact instead of delivering it',
    ],
    goodVersion: `Jack folded the letter back into its envelope and told himself it was a prank.

He said it like a verdict, and for a few seconds he believed it.

Then the river-glass token on his desk clicked once against the wood, as if it had been nudged by a finger.

There was no finger.`,
    whyItWorks: [
      'Shows routine being disrupted, not announcing disruption',
      'Jack\'s false assumption creates dramatic irony',
      'The repeated "perfectly" signals wrongness without explaining',
      '"Never noticed" puts reader ahead of Jack subtly',
      'Foreshadows through observation, not narration',
    ],
  },
};

// ============================================================================
// ENGAGEMENT REQUIREMENTS - What makes readers unable to stop
// ============================================================================
export const ENGAGEMENT_REQUIREMENTS = {
  // The unanswered question economy
  questionEconomy: {
    description: 'Every subchapter should plant new questions and selectively answer others',
    questionTypes: {
      mystery: 'What happened? Who did it? What does it mean? (Plot questions)',
      character: 'Will Jack forgive himself? Can he be redeemed? (Relationship questions)',
      threat: 'Will Victoria find him? Is Victoria ally or enemy? (Tension questions)',
      thematic: 'Can Jack truly change? Is redemption possible? (Meaning questions)',
    },
    balanceRule: 'Maintain 3-5 active burning questions at all times. Answer one, plant two.',
  },

  // The final line requirement
  finalLineHook: {
    description: 'The last 1-2 sentences must create unbearable forward momentum',
    techniques: [
      'A character entering unexpectedly',
      'A name spoken that changes everything',
      'A question that demands an answer',
      'A door opening to reveal something',
      'A phone ringing with impossible caller ID',
      'A realization that reframes everything',
      'A physical threat made concrete',
      'A choice that must be made NOW',
    ],
    examples: [
      'Victoria Blackwell smiled. "Hello, Jack. It\'s time we talked about endgames."',
      'The caller ID showed a number Jack knew by heart. His own.',
      'She didn\'t answer. Couldn\'t. Because standing behind her, gun drawn, was the last person Jack expected.',
      'He\'d always been the evidence.',
    ],
  },

  // Personal stakes escalation
  personalStakes: {
    description: 'What Jack personally loses should escalate through the story',
    progression: {
      chapters1to4: 'Jack\'s self-image and reputation at stake',
      chapters5to9: 'Jack\'s freedom and physical safety at stake',
      chapters10to12: 'Jack\'s redemption and legacy at stake',
    },
    requirement: 'Each chapter must make clear what Jack loses if he fails THIS chapter.',
  },

  // Revelation gradient
  revelationGradient: {
    description: 'Revelations should follow a deliberate pattern',
    levels: {
      micro: 'Every subchapter - a clue, a connection, a small truth (e.g. a name, a date, a lie exposed)',
      chapter: 'End of each chapter - a character\'s true nature revealed, a conspiracy layer peeled',
      arc: 'Chapters 4, 7, 10 - game-changers that recontextualize everything the reader thought they knew',
    },
    rule: 'Revelations should make readers say "I KNEW something was off" or "Oh god, that changes everything"',
  },

  // The ticking clock
  tickingClock: {
    description: 'Time pressure should be FELT, not just mentioned',
    implementation: {
      element: 'What time-sensitive pressure exists (midnight meeting, 24 hours until threshold destroyed)',
      reminders: 'The clock should be referenced 2-3 times per subchapter',
      physicality: 'Show the clock through physical symptoms: checking watch, sun position, exhaustion',
    },
  },

  // Emotional anchor requirement
  emotionalAnchor: {
    description: 'Every chapter needs ONE moment that hits the reader in the gut',
    types: [
      'A specific face from Jack\'s guilt, not abstract guilt',
      'A character saying something that lands like a punch',
      'A memory that intrudes unwanted',
      'Physical manifestation of pain (hands shaking, throat tight)',
      'A photograph, a voice, a smell that triggers grief',
    ],
    rule: 'Not plot, but FEELING. The moment readers stop and have to process.',
  },
};

// ============================================================================
// MICRO-TENSION TECHNIQUES - Keep readers engaged at paragraph level
// ============================================================================
export const MICRO_TENSION_TECHNIQUES = {
  description: 'Every paragraph must contain at least one tension element',
  elements: [
    'A question (stated or implied)',
    'A contradiction or inconsistency noticed',
    'An incomplete action (reaching for something, about to speak)',
    'A sensory discomfort (cold, pressure, pain)',
    'A hint of threat (sound, movement, presence)',
    'An emotional undercurrent (anger beneath calm, fear behind bravado)',
    'A ticking clock reference (time passing, deadline approaching)',
    'Information withheld (character knows something they won\'t say)',
  ],
  warning: 'Paragraphs without tension are paragraphs where readers check their phone.',
};

// ============================================================================
// SENTENCE RHYTHM PATTERNS
// ============================================================================
export const SENTENCE_RHYTHM = {
  description: 'Vary sentence length deliberately for better cadence',
  pattern: `
SHORT. For impact.
Medium sentences carry the narrative forward, building momentum.
Longer sentences work when you need to unspool a thought, let the reader sink into Jack's mind as he pieces together the implications of what he's just seen, each connection leading to another, the way a crack spreads across ice.
Then short again.
  `,
  rules: [
    'If three sentences in a row are similar length, revise',
    'Use fragments for emotional impact (one-word paragraphs, incomplete thoughts)',
    'Long sentences for rumination, short for action and revelation',
    'Paragraph breaks create pacing, don\'t be afraid of one-line paragraphs',
  ],
};

// ============================================================================
// THE ICEBERG TECHNIQUE - Show less, imply more
// ============================================================================
export const ICEBERG_TECHNIQUE = {
  description: 'For every piece of backstory or information: show 10%, imply 30%, leave 60% unspoken',
  applications: [
    'Characters reference events that happened "that night in February" without explaining',
    'Jack avoids looking at the third barstool at Murphy\'s without saying why',
    'Victoria touches her wrist when lying, we never learn why',
  ],
  principle: 'Mystery isn\'t about what you reveal. It\'s about what you deliberately don\'t.',
  execution: 'Let readers sense depths they can\'t see. The unspoken creates intrigue.',
};

// ============================================================================
// SUBTEXT LAYER REQUIREMENTS - What characters REALLY mean
// ============================================================================
export const SUBTEXT_REQUIREMENTS = {
  description: 'Every significant dialogue exchange must have two layers',
  layers: {
    surface: 'What the characters are literally saying',
    actual: 'What they\'re actually communicating (emotion, power, hidden meaning)',
  },
  examples: [
    {
      surface: '"Coffee?" She asked.',
      subtext: 'I\'m willing to have this conversation if you are.',
    },
    {
      surface: '"I\'m good."',
      subtext: 'I don\'t deserve your care / I\'m pushing you away.',
    },
    {
      surface: '"It\'s late. You should go home."',
      subtext: 'I can\'t protect you anymore if you stay involved.',
    },
    {
      surface: '"How\'s the case going?"',
      subtext: 'I know more than you think. Are you getting close?',
    },
  ],
  rule: 'Never write dialogue where characters say exactly what they mean. That\'s not how broken people talk.',
};

export default {
  TIMELINE,
  ABSOLUTE_FACTS,
  STORY_STRUCTURE,
  REVEAL_TIMING,
  SETUP_PAYOFF_REGISTRY,
  WRITING_STYLE,
  EXAMPLE_PASSAGES,
  CONSISTENCY_RULES,
  GENERATION_CONFIG,
  EXTENDED_STYLE_GROUNDING,
  NEGATIVE_EXAMPLES,
  ENGAGEMENT_REQUIREMENTS,
  MICRO_TENSION_TECHNIQUES,
  SENTENCE_RHYTHM,
  ICEBERG_TECHNIQUE,
  SUBTEXT_REQUIREMENTS,
};
