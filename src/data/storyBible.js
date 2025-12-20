/**
 * Story Bible - Canonical Facts for LLM Grounding
 *
 * This document contains ABSOLUTE FACTS that must never be contradicted.
 * The LLM must treat these as immutable ground truth when generating content.
 * Any deviation from these facts breaks story consistency.
 */

// ============================================================================
// TIMELINE - Events in chronological order (BEFORE the story begins)
// ============================================================================
export const TIMELINE = {
  yearsAgo: {
    30: 'Jack and Tom Wade meet in college, begin lifelong friendship',
    25: 'Jack joins Ashport PD as a detective',
    20: 'Tom Wade begins manufacturing evidence (Jack unaware)',
    15: 'Marcus Webb and Richard Bellamy begin their secret affair',
    13: 'Jack and Sarah Reeves become partners',
    10: 'Eleanor Bellamy wrongfully convicted of murdering Richard (8 years in prison by story start)',
    8: 'Marcus Thornhill framed for embezzlement by Silas Reed, commits suicide in lockup',
    7: [
      'Emily Cross (age 22) having affair with Richard Bellamy (age 48)',
      'Emily attempts suicide (Oxycodone overdose, 30 pills)',
      'Emily kidnapped by Deputy Chief Grange',
      'Jack closes Emily Cross case, declares her dead while she is still being tortured',
      'Emily hears Jack say "Case closed" while in captivity',
    ],
    5: 'Jack and Silas Reed become partners (8 years total by story)',
    3: 'Emily escapes/released, begins transformation into Victoria Blackwell',
    1: 'Jack forced into retirement',
  },
  storyStart: {
    day1: 'Jack receives first black envelope from The Midnight Confessor',
    structure: '12 days, 12 cases from Jack\'s career being revisited',
  },
};

// ============================================================================
// ABSOLUTE FACTS - These CANNOT be contradicted
// ============================================================================
export const ABSOLUTE_FACTS = {
  protagonist: {
    fullName: 'Jack Halloway',
    age: 'Late 50s to early 60s',
    formerTitle: 'Detective, Ashport Police Department',
    currentStatus: 'Forcibly retired',
    residence: 'Run-down office above Murphy\'s Bar',
    careerLength: '30 years',
    clearanceRate: 'Best in Ashport history (built on manufactured evidence)',
    vices: ['Jameson whiskey', 'Chain smoking (occasional)'],
    physicalState: 'Weathered, rumpled trench coat (charcoal gray), heavy stubble, tired eyes',
  },

  antagonist: {
    trueName: 'Emily Cross',
    aliasUsed: 'Victoria Blackwell',
    titleUsed: 'The Midnight Confessor',
    signatures: ['M.C.', 'V.A.', 'E.C.'],
    ageAtAbduction: 22,
    currentAge: 'Late 20s to early 30s (7 years since "death")',
    occupation: 'Art student (former), wealthy information broker (current)',
    abuser: 'Richard Bellamy (affair began when she was 19, he was 48)',
    torturer: 'Deputy Chief William Grange (held her for months)',
    suicideAttempt: 'Oxycodone overdose, 30 pills, age 23',
    communication: {
      method: 'Black envelopes with red wax seal',
      ink: 'Silver ink',
      markers: 'Obsidian chess pieces marking each day',
      perfume: 'French floral with patchouli',
    },
    motivation: 'Force Jack to understand what his arrogant certainty cost innocent people',
    philosophy: '"Truth without power is just noise."',
  },

  setting: {
    city: 'Ashport',
    atmosphere: 'Rain-soaked, neon-lit, perpetually overcast',
    tone: 'Modern noir with classic aesthetics',
    corruption: 'Systemic, reaches highest levels of police and courts',
    keyLocations: {
      murphysBar: 'Bar beneath Jack\'s office',
      greystoneCorrectional: 'Prison where Eleanor Bellamy is held',
      bellamyEstate: 'Victorian mansion, now abandoned',
      bluelineDiner: 'Where Claire Thornhill works',
      victoriaPenthouse: 'Glass and steel, commanding city view',
      fbiFieldOffice: 'Morrison Street',
    },
  },

  fiveInnocents: [
    {
      name: 'Eleanor Bellamy',
      conviction: 'Murder of husband Richard Bellamy (arsenic poisoning)',
      plantedEvidence: 'Sapphire necklace in deposit box, arsenic in tea set',
      sentence: '8 years in Greystone Correctional',
      truth: 'Richard was being blackmailed, killed by someone else',
      daughter: 'Maya Bellamy',
    },
    {
      name: 'Marcus Thornhill',
      conviction: 'Financial crimes (embezzlement)',
      plantedEvidence: 'Shell company documents forged by Silas Reed',
      fate: 'Committed suicide in lockup, 3 days after conviction',
      truth: 'Completely innocent, framed by real embezzlers',
      daughter: 'Claire Thornhill',
    },
    {
      name: 'Dr. Lisa Chen',
      role: 'Lab technician',
      crime: 'Reported Tom Wade\'s evidence tampering',
      fate: 'Transferred, silenced, career destroyed',
    },
    {
      name: 'James Sullivan',
      details: 'Revealed progressively through story',
    },
    {
      name: 'Teresa Wade',
      relation: 'Tom Wade\'s own daughter',
      irony: 'Convicted using her father\'s evidence manufacturing methods',
    },
  ],

  corruptOfficials: {
    tomWade: {
      title: 'Chief Forensic Examiner',
      relationship: 'Jack\'s best friend for 30 years (college, academy, career)',
      crime: 'Manufactured "perfect evidence" for 20 years',
      impact: 'Every case he touched is now suspect',
      daughter: 'Teresa Wade (one of the five innocents)',
    },
    silasReed: {
      title: 'Detective (Jack\'s former partner)',
      partnershipLength: '8 years with Jack',
      crime: 'Signed documents that framed Marcus Thornhill',
      motivation: 'Blackmailed 7 years ago over a secret',
      currentState: 'Broken, alcoholic, living in expensive penthouse (blood money)',
    },
    helenPrice: {
      title: 'Assistant District Attorney',
      nickname: '"Queen of Convictions"',
      record: '53 cases, 53 wins, never lost a trial (6 years)',
      taintedCases: '21 involved manufactured evidence',
      fate: 'Receives Victoria\'s dossier, may confess publicly or commit suicide',
    },
    deputyChiefGrange: {
      title: 'Deputy Chief, Ashport PD',
      crimes: '23 kidnapping victims over years, 8 confirmed dead',
      method: 'Used badge and authority to operate openly',
      victim: 'Emily Cross (held and tortured for months)',
      downfall: 'Sarah Reeves brings him down using witnesses Jack dismissed',
    },
    theOverseer: {
      role: 'Shadowy mastermind controlling systemic corruption',
      method: 'Operates through proxies',
      symbolism: 'Represents how deep the corruption goes',
    },
  },

  supportingCharacters: {
    sarahReeves: {
      role: 'Jack\'s former partner',
      partnershipLength: '13 years',
      currentJob: 'Still on the force',
      arc: 'Loses faith in Jack, starts Conviction Integrity Project',
      achievement: 'Brings down Grange in 72 hours by following leads Jack dismissed',
    },
    mayaBellamy: {
      relation: 'Eleanor\'s daughter',
      age: 'Mid 20s',
      mission: 'Prove mother\'s innocence',
      discovery: 'Found documents proving Richard was being blackmailed',
    },
    claireThornhill: {
      relation: 'Marcus Thornhill\'s daughter',
      job: 'Waitress at Blueline Diner',
      formerLife: 'Had scholarship, promising future',
      mission: 'Spent 4 years building case proving father was framed',
      evidence: 'Has "Thornhill Ledger" documenting the frame-up',
    },
    marcusWebb: {
      role: 'Antique dealer, information broker',
      age: 'Mid 60s',
      secret: 'Loved Richard Bellamy for 15 years (secret affair)',
      guilt: 'Knew Eleanor was innocent, stayed silent',
      inherited: 'Money from Richard',
    },
    rebeccaMoss: {
      role: 'Defense attorney',
      clients: 'Represents the innocents, including Eleanor and Jack',
    },
    agentMartinez: {
      fullName: 'Agent Luis Martinez',
      agency: 'FBI',
      mission: 'Investigating Ashport corruption',
    },
    luciaMartinez: {
      role: 'One of Grange\'s victims',
      age: '24 at death',
      occupation: 'Nursing student, engaged',
      abduction: 'Three months after Jack closed Emily\'s case',
      fate: 'Held 11 months, died in captivity',
      significance: 'Died because Jack stopped looking',
    },
  },
};

// ============================================================================
// STORY STRUCTURE
// ============================================================================
export const STORY_STRUCTURE = {
  totalChapters: 12,
  subchaptersPerChapter: 3,
  chapter1: 'Static content from docx files',
  chapters2to12: 'Dynamically generated based on player choices',
  decisionPoints: 'End of each chapter (subchapter 3/C)',
  branchingPaths: 'Binary choices create exponential path combinations',

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
    2: {
      type: 'INVESTIGATION',
      description: 'Methodical evidence gathering, interview-heavy, building the case',
      wordCountModifier: 1.0, // Standard length
      requirements: ['At least one witness interview', 'Discovery of key evidence', 'End with a lead to follow'],
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
// WRITING STYLE GUIDELINES
// ============================================================================
export const WRITING_STYLE = {
  voice: {
    perspective: 'Third person, Jack Halloway',
    tense: 'Past tense',
    tone: 'Hard-boiled noir, world-weary, introspective',
  },

  influences: [
    'Raymond Chandler (metaphors, prose rhythm)',
    'Dashiell Hammett (terse dialogue, moral ambiguity)',
    'James Ellroy (dark corruption, systemic evil)',
    'Walter Mosley (character depth, social commentary)',
  ],

  mustInclude: [
    'Atmospheric descriptions (rain, shadows, neon)',
    'Internal monologue revealing Jack\'s guilt and self-doubt',
    'Sensory details (sounds, smells, textures)',
    'Dialogue that reveals character',
    'Metaphors grounded in noir imagery',
  ],

  absolutelyForbidden: [
    'Em dashes (—) - use commas, periods, semicolons instead',
    '"X is not just Y, it\'s Z" constructions',
    '"In a world where..." openings',
    '"Little did he know..." foreshadowing',
    '"I couldn\'t help but..." or "I found myself..."',
    'Starting sentences with "And" or "But" excessively',
    'Flowery adverbs: "seemingly", "interestingly", "notably"',
    'The words "delve", "unravel", "tapestry"',
    '"A testament to" or "serves as a reminder"',
    'Hedging: "It seems", "Perhaps", "Maybe"',
    'Overwrought or purple prose',
    'Breaking the fourth wall',
    'Summarizing instead of showing',
  ],
};

// ============================================================================
// EXAMPLE PASSAGES - For Few-Shot Learning
// ============================================================================
export const EXAMPLE_PASSAGES = {
  atmosphericOpening: `Rain fell on Ashport the way memory falls on the guilty, soft at first, then relentless. I stood at the window of what used to be my office, watching the neon bleed into the wet streets below. Murphy's jukebox bled through the floorboards, some torch song about a woman who left. They all leave eventually. That's the first lesson this city teaches you.

The envelope sat on my desk where I'd dropped it twenty minutes ago. Black paper, expensive. Red wax seal I didn't recognize. Inside, silver ink that caught what little light filtered through the blinds.

"Twelve days. Twelve cases. One you closed without certainty."

No signature. No return address. Just that, and a photograph I'd spent seven years trying to forget.`,

  dialogueExample: `"Tell me you're not involved." Sarah's voice cut through the static of the precinct radio. She'd driven all the way across town for this conversation, which meant she already knew the answer.

"Define involved."

"Don't." She stepped closer, and I could smell coffee and cigarettes, the perfume of every cop who's worked one case too many. "Twenty years, Jack. I watched you close cases other detectives wouldn't touch. I believed in you."

"Past tense."

"Present tense. That's the problem." She set a manila folder on my desk, the kind that holds the end of a career. "Tom Wade. You want to tell me why your best friend's been manufacturing evidence since before I made detective?"`,

  internalMonologue: `I should have seen it. That's what kept circling through my skull like a vulture waiting for something to die. Twenty years of perfect evidence, pristine chains of custody, confessions that fit the physical proof like a key in a lock. And not once, not a single time, did I ask why my cases were the only ones that wrapped up so clean.

Because I didn't want to know. Because clearance rates mean promotions, and promotions mean you can look at yourself in the mirror and call yourself one of the good guys. I'd built my reputation on a foundation of lies, and the only person more surprised than me was the man standing in my doorway.

"Hello, Jack." Victoria Blackwell smiled like she knew every thought I'd ever had. "We need to talk about certainty."`,

  tenseMoment: `The gun felt wrong in my hand. Not the weight of it, that was familiar as breathing. But the direction it pointed. Silas Reed, my partner for eight years, the man who'd covered my back through three shootings and one divorce. Now he sat across from me in a penthouse paid for with blood money, bourbon trembling in a crystal glass.

"She got to you too." His voice had gone hollow. "Victoria."

"She showed me the Thornhill documents. Your signature, Silas. Your handwriting."

"I can explain."

"Don't." I lowered the gun but didn't holster it. "Just tell me who else. Who else did you help bury?"`,

  decisionSetup: `Two doors. That's what it came down to, after everything. Behind the first, Helen Price sat with a folder that could bring down half the prosecutors in the state. Behind the second, Grange was making a call that would send his next victim into a grave no one would ever find.

I had minutes. Maybe less.

Sarah's voice crackled through my earpiece. "Jack, we can't be in two places. You have to choose."

Choice. Victoria's favorite word. The whole game was built on them, each one a brick in the wall I'd built around the innocent people I'd helped bury. Now she wanted me to understand what that felt like from the other side.

The floor creaked under my boots. Both paths led somewhere dark. The only question was which darkness I could live with.`,

  // ========== NEW A+ QUALITY EXAMPLES ==========

  characterConfrontation: `Victoria's penthouse smelled of old money and new secrets. Floor-to-ceiling windows gave her a god's-eye view of Ashport, the city spread out like a game board beneath her heels. She didn't turn when I entered. Didn't need to.

"Seven years." Her voice carried the weight of every one of them. "That's how long I waited. Planned. Watched you collect your commendations while I learned to walk again."

"Emily." The name felt like broken glass in my mouth. "I closed your case because the evidence—"

"The evidence said I was dead." She turned then, and I saw what Grange had done to her. The scars traced a map of suffering across her throat, her wrists. "I heard you, Jack. Through the floor of that basement. 'Case closed. Moving on.' Those were your words while he was still deciding whether to let me live."

Her eyes held something worse than hatred. Understanding. She knew exactly what I was, because she'd built herself into something stronger.`,

  emotionalRevelation: `The photograph shook in my hands. Not from age, not from the rain that had soaked through the folder. From recognition.

That was Tom's handwriting. Thirty years of friendship, and I knew his chicken scratch better than my own signature. But this wasn't case notes or lab reports. This was a ledger. Names, dates, evidence reference numbers. A catalog of lies stretching back two decades.

Marcus Thornhill's case was on page three. The fiber analysis that put him at the scene. Tom's notation: "Sample sourced externally. Match achieved 11/4."

Sourced externally. That meant fabricated. That meant Tom had watched Marcus hang himself in a cell for a crime built on nothing but manufactured threads.

I'd stood at that man's funeral. Told his daughter Claire that justice had been served. Let her spend four years thinking the system worked, when the system was just another word for my best friend's lies.

The folder fell from my fingers. I barely heard it hit the floor. All I could hear was thirty years of certainty crumbling into dust.`,

  chaseSequence: `The warehouse door splintered behind me. No time to look. No time to think.

Left. Through the shipping containers. Rain hammered the metal above, masking my footsteps but theirs too. Three of them, maybe four. Grange's cleanup crew.

My lungs burned. Two decades of Jameson and too many cigarettes catching up at the worst possible moment. A bullet sparked off steel six inches from my head. Close. Getting closer.

Corner. Right. Another row of crates. The dock had to be nearby. Had to be.

Voices behind me, coordinating. Professional. The kind of men who made problems disappear for Deputy Chief Grange. Twenty-three victims. I wasn't planning to be number twenty-four.

The container ahead was open. Dark inside. A choice made in heartbeats: hide and hope, or keep running and pray.

I dove into the darkness. Held my breath. Listened to their boots thunder past, hunting a ghost in the rain.`,

  investigationScene: `The Thornhill file told a story if you knew how to read it. Most people didn't. Most people saw evidence and assumed it meant truth. Thirty years on the job had taught me better. Now those lessons tasted like ash.

Claire had gathered everything. Bank records showing the shell company was created three days before Marcus was fired. Emails her father never wrote, sent from a computer he never owned. The forensic timeline that proved the money moved while Marcus was in surgery getting his appendix removed.

"Your partner signed the arrest warrant." Claire's voice held no accusation. She was past that. This was simple recitation of fact. "Silas Reed. He took the forgeries and stamped them real."

I spread the documents across my desk. The rain on the window caught the light, made the papers glow like accusation. Every page was a nail in a coffin I'd helped build.

"Why are you showing me this?" I asked, though I already knew.

"Because you're the only cop who might actually care." She leaned forward, four years of grief compressed into certainty. "And because Victoria Blackwell told me you'd want to see what you helped bury."`,

  quietMoment: `Murphy's was empty at 3 AM. Just me, the jukebox, and a glass of Jameson that wasn't helping.

The stool next to me creaked. Sarah sat down without asking, ordered a coffee she wouldn't drink. We watched the rain together for a while. Some things don't need words. Thirteen years of partnership buys you that much silence.

"I filed the Conviction Integrity request today." She said it to the mirror behind the bar, not to me. "Eleanor Bellamy's case. If even half of what we've found is true..."

"It's true." The whiskey burned going down. "All of it."

"Then you know what happens next." She finally looked at me. Her eyes held something I couldn't name. Disappointment, maybe. Or worse, pity. "Internal Affairs. Grand jury. Everything you built, Jack. Gone."

I poured another glass. "It was never mine to build."

She left her coffee untouched and walked back into the rain. The jukebox played something about roads not taken. I drank until the song ended, then drank some more.`,
};

// ============================================================================
// CONSISTENCY RULES - Organized by category for comprehensive coverage
// ============================================================================
export const CONSISTENCY_RULES = [
  // CHARACTER NAMES & IDENTITIES
  'Jack ALWAYS refers to Victoria as "Victoria" or "the Confessor" until her true identity as Emily is revealed',
  'Victoria Blackwell is the alias; Emily Cross is the true identity',
  'The Midnight Confessor signs as "M.C." or "V.A." or "E.C."',

  // TIMELINE FACTS (EXACT NUMBERS - Never approximate)
  'Emily Cross case was closed 7 years ago exactly (not approximately)',
  'Eleanor has been in prison for 8 years exactly',
  'Tom Wade and Jack have been friends for 30 years exactly (met in college)',
  'Jack and Sarah were partners for 13 years exactly',
  'Jack and Silas were partners for 8 years exactly',
  'Jack had a 30-year career as detective before forced retirement',
  'Emily was 22 when abducted, making her late 20s to early 30s now',

  // SETTING & ATMOSPHERE
  'Ashport is ALWAYS rainy, overcast, or recently rained - NEVER sunny or clear',
  'Murphy\'s Bar is directly below Jack\'s office (Jack can hear the jukebox through the floorboards)',
  'Ashport is neon-lit, morally gray, modern day with noir aesthetics',

  // CHARACTER TRAITS (Immutable)
  'Jack drinks Jameson whiskey exclusively - never bourbon, scotch, vodka, or beer',
  'Jack wears a rumpled charcoal gray trench coat',
  'Victoria wears red, has expensive French perfume with floral and patchouli notes',
  'The Confessor communicates via black envelopes with red wax seals and silver ink',
  'Victoria leaves obsidian chess pieces as markers',

  // CASE FACTS (Plot-critical)
  'There are exactly 5 innocents wrongfully convicted using manufactured evidence',
  'Marcus Thornhill committed suicide in lockup (before trial) - he never went to prison',
  'Richard Bellamy was an art dealer being blackmailed for embezzlement',
  'Grange had exactly 23 kidnapping victims total, 8 confirmed dead',
  'Helen Price had exactly 53 consecutive wins in court, 21 involved manufactured evidence',
  'Tom Wade manufactured evidence for 20 years (Jack was unaware)',
  'Eleanor was convicted of murdering Richard with arsenic poisoning (she was framed)',

  // RELATIONSHIP STATES
  'Sarah eventually loses faith in Jack and starts the Conviction Integrity Project',
  'Tom Wade is Jack\'s best friend but betrayed him by manufacturing evidence',
  'Silas Reed was blackmailed 7 years ago into framing Marcus Thornhill',
  'Victoria was a victim of Richard Bellamy (affair started when she was 19, he was 48)',
  'Deputy Chief Grange tortured Emily/Victoria for months after Jack closed her case',
];

// ============================================================================
// GENERATION PARAMETERS - Optimized for quality and consistency
// ============================================================================
export const GENERATION_CONFIG = {
  // Temperature settings - balanced for consistency with creativity
  temperature: {
    narrative: 0.72,      // Slightly lower for better consistency while maintaining creativity
    dialogue: 0.75,       // Balanced for natural dialogue
    decisions: 0.68,      // More controlled for critical choice points
    expansion: 0.65,      // Conservative when expanding (rarely used now)
  },

  // Token limits - generous to prevent truncation
  maxTokens: {
    subchapter: 6000,     // Sufficient for 500-word narrative + JSON structure
    expansion: 2000,      // For fallback expansion (rarely needed)
    validation: 500,
  },

  // Word count requirements - optimized for fast background generation
  wordCount: {
    minimum: 450,         // ~1.5 pages, enough for immersion
    target: 500,          // Lean but quality-focused - faster generation
    maximum: 1000,        // Cap to ensure fast generation
  },

  // Quality assurance settings
  qualitySettings: {
    maxRetries: 1,                    // Reduced - prefer warnings over expensive retries
    minSentencesPerParagraph: 3,      // Ensures substantial paragraphs
    maxConsecutiveDialogue: 6,        // Prevents wall-of-dialogue
    requireAtmosphericOpening: true,  // Every chapter should set the scene
  },
};

export default {
  TIMELINE,
  ABSOLUTE_FACTS,
  STORY_STRUCTURE,
  WRITING_STYLE,
  EXAMPLE_PASSAGES,
  CONSISTENCY_RULES,
  GENERATION_CONFIG,
};
