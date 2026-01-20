/**
 * Character Reference Guide
 *
 * A comprehensive reference of key characters in "Dead Letters".
 * This is used to keep the LLM consistent during generation.
 *
 * NOTE: Only Jack and Victoria are defined characters. The LLM has creative
 * freedom to generate other characters as the story requires.
 */

export const CHARACTER_REFERENCE = {
  protagonist: {
    name: 'Jack Halloway',
    role: 'Freelance investigator / former file clerk',
    age: 35,
    physicalDescription: {
      appearance: 'Worn down before his time; tired eyes; unshaven; clothes that need washing',
      build: 'Lean, used to have restless energy, now just tired',
      distinctiveFeatures: 'Carries a battered notebook; habit of using paper maps instead of digital',
    },
    personality: {
      coreTraits: [
        'Used to be sharp at finding patterns; now avoids looking too closely',
        'Empathetic but guarded',
        'Drinks too much, sleeps too little',
        'Still compulsively documents details even when he doesn\'t want to',
      ],
      flaws: [
        'Avoids taking cases where he might actually find someone',
        'Blames himself for things he can\'t control',
        'Pushing people away before they can see how bad things have gotten',
      ],
      strengths: [
        'Still good at his job even when he doesn\'t want to be',
        'Knows the city\'s records better than anyone',
        'Can\'t stop noticing when something doesn\'t add up',
      ],
    },
    backstory: {
      earlyCareer: 'Started as a file clerk at Ashport City Records Office; learned the city\'s paperwork inside and out',
      investigation: 'Moved to private investigation work; built a reputation for finding things others missed',
      burnout: 'Two years ago, found a missing person who didn\'t want to be found; gave up the address anyway; they relapsed and died',
      currentLife: 'Burned out and depressed; takes only safe jobs now; lives above Murphy\'s Bar',
    },
    relationships: {
      victoriaBlackwell: 'The sender of dead letters. A guide, a trap, and a question in human form.',
    },
    voiceAndStyle: {
      narrative: 'Third-person limited, past tense; tight to Jack; no omniscience',
      internalMonologue: 'Observational; pattern language; uneasy humor under stress',
      dialogue: 'Direct, not flowery; becomes clipped when startled',
      examplePhrases: [
        '"It looked like graffiti until the third time it repeated."',
        '"A city can lie without opening its mouth."',
        '"The map was correct. The street was the part that changed."',
      ],
    },
  },

  antagonist: {
    name: 'Victoria Blackwell',
    aliases: ['V.B.', 'Victoria'],
    role: "Primary antagonist/guide; architect of Jack's route through the mystery",
    age: '30s',
    physicalDescription: {
      appearance: 'Controlled elegance; difficult to read; never looks rushed',
      style: 'Minimal, precise, expensive without logos',
      presence: 'Stillness that feels like a decision',
    },
    personality: {
      coreTraits: [
        'Strategic, patient, rules-minded',
        'Speaks in constraints and consequences',
        'Protective of the Under-Map\'s "grammar" while exploiting it',
      ],
      flaws: [
        'Treats people like routes',
        'Believes pressure is education',
      ],
      strengths: [
        'Always two steps ahead',
        'Never wastes a gesture',
      ],
    },
    backstory: {
      origin: 'Connected to Ashport\'s semiotics/urban-mapping underground',
      motive: 'Force Jack to see the pattern, then decide what kind of person follows it',
    },
    methods: {
      communication: 'Dead letters with silver ink and rule-like phrasing',
      philosophy: '"If you name it too early, you lose it."',
    },
    relationships: {
      jackHalloway: 'Subject of her "curriculum"',
    },
    voiceAndStyle: {
      speaking: 'Calm, precise, minimal contractions, uses questions as locks',
      written: 'Instructional but elegant; rules disguised as poetry',
      examplePhrases: [
        '"Two maps. Choose which one you will pretend is real."',
        '"Do not name it yet."',
        '"Follow the line once. Never twice."',
      ],
    },
  },

  locations: {
    ashport: {
      name: 'Ashport',
      description: 'Modern coastal city; damp reflections; hidden layer threaded through infrastructure',
      landmarks: [
        'Murphy\'s Bar (beneath Jack\'s office)',
        'Ashport Archive (records, maps, omissions)',
        'Brineglass Viaduct (threshold-adjacent)',
        'Sentinel Library (restricted stacks)',
      ],
    },
  },

  themes: {
    central: [
      'Perception vs reality',
      'The cost of naming (and the cost of refusing to)',
      'Patterns as traps and as lifelines',
      'Institutions that erase inconvenient truths',
    ],
    motifs: {
      silverInk: 'Instructions that behave like evidence',
      riverGlass: 'A token that feels like proof',
      thresholds: 'Places that behave like decisions',
      maps: 'Records that lie without words',
    },
  },
};

export const VOICE_DNA = {
  jack: {
    name: 'Jack Halloway',
    sentencePatterns: [
      'Short, tired responses when he doesn\'t want to engage',
      'Still slips into careful observation when something catches his attention',
      'Fragments when exhausted or when the world stops making sense',
    ],
    vocabularyTendencies: [
      'Records language from his clerk days: "filed," "logged," "on record"',
      'Avoids committing to things; hedges more than he used to',
      'Dry humor that sounds more bitter than it used to',
    ],
    physicalTells: [
      'Drinks too much coffee, then switches to whiskey',
      'Checks his notes out of habit, not hope',
      'Looks away first in conversations now',
    ],
    dialogueRhythm: [
      'Tries to end conversations quickly',
      'Still asks the right questions when he forgets to stop himself',
      'Long silences that used to be strategic are now just tired',
    ],
  },

  victoria: {
    name: 'Victoria Blackwell',
    sentencePatterns: [
      'Controlled sentences, no filler',
      'Questions used as locks',
      'Rules disguised as statements',
    ],
    vocabularyTendencies: [
      'Map language: "route," "line," "legend," "scale," "blank"',
      `Constraint language: "don't," "never," "once," "until"`,
    ],
    physicalTells: [
      'Stillness as dominance',
      'Touches nothing unless it\'s deliberate',
    ],
    dialogueRhythm: [
      'Waits for Jack to speak first',
      'Ends exchanges with a single clean instruction',
    ],
  },
};

/**
 * Get voice DNA for a specific character
 * @param {string} name - Character name or partial name
 * @returns {Object|null} Voice DNA configuration or null if not found
 */
export function getVoiceDNA(name) {
  const normalizedName = name.toLowerCase();

  // Check for Jack
  if (normalizedName.includes('jack') || normalizedName.includes('halloway')) {
    return VOICE_DNA.jack;
  }

  // Check for Victoria
  if (normalizedName.includes('victoria') || normalizedName.includes('blackwell')) {
    return VOICE_DNA.victoria;
  }

  // No predefined voice DNA for other characters - LLM generates freely
  return null;
}

/**
 * Quick lookup function for character details
 */
export function getCharacter(name) {
  const normalizedName = name.toLowerCase();

  // Check protagonist
  if (normalizedName.includes('jack') || normalizedName.includes('halloway')) {
    return CHARACTER_REFERENCE.protagonist;
  }

  // Check antagonist
  if (normalizedName.includes('victoria') || normalizedName.includes('blackwell')) {
    return CHARACTER_REFERENCE.antagonist;
  }

  // No predefined data for other characters - LLM generates freely
  return null;
}

/**
 * Get characters for a path - only returns core defined characters
 */
export function getCharactersForPath(pathKey) {
  // Only Jack and Victoria are defined - LLM can create others as needed
  return [
    CHARACTER_REFERENCE.protagonist,
    CHARACTER_REFERENCE.antagonist,
  ];
}

export default CHARACTER_REFERENCE;
