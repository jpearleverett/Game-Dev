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
};

// ============================================================================
// WRITING STYLE GUIDELINES
// ============================================================================
export const WRITING_STYLE = {
  voice: {
    perspective: 'First person, Jack Halloway',
    tense: 'Present tense',
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
};

// ============================================================================
// CONSISTENCY RULES
// ============================================================================
export const CONSISTENCY_RULES = [
  'Jack ALWAYS refers to Victoria as "Victoria" or "the Confessor" until her true identity as Emily is revealed',
  'Emily Cross case was closed 7 years ago, not more, not less',
  'Eleanor has been in prison for 8 years exactly',
  'Tom Wade and Jack have been friends for 30 years exactly',
  'Jack and Sarah were partners for 13 years exactly',
  'Jack and Silas were partners for 8 years exactly',
  'The Confessor communicates via black envelopes with red wax seals',
  'Victoria wears red and has expensive French perfume with floral and patchouli notes',
  'Ashport is ALWAYS rainy or recently rained',
  'Jack drinks Jameson whiskey, never bourbon or scotch',
  'Murphy\'s Bar is below Jack\'s office',
  'There are exactly 5 innocents wrongfully convicted',
  'Marcus Thornhill committed suicide in lockup, never went to prison',
  'Richard Bellamy was an art dealer being blackmailed',
  'Grange had 23 victims total, 8 confirmed dead',
  'Helen Price had 53 consecutive wins in court',
];

// ============================================================================
// GENERATION PARAMETERS
// ============================================================================
export const GENERATION_CONFIG = {
  // Lower temperature for consistency, higher for creativity
  temperature: {
    narrative: 0.75,      // Balanced creativity with consistency
    dialogue: 0.80,       // Slightly more creative for dialogue
    decisions: 0.70,      // More controlled for important choices
    expansion: 0.65,      // Conservative when expanding
  },

  // Token limits
  maxTokens: {
    subchapter: 3500,     // Allow longer, richer content
    expansion: 2000,
    validation: 500,
  },

  // Word count requirements
  wordCount: {
    minimum: 500,
    target: 700,
    maximum: 1200,
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
