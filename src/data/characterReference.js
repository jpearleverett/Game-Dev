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
    role: 'Contract investigator / former city-records clerk',
    age: 'Late 20s to early 30s',
    physicalDescription: {
      appearance: 'Younger, worn down; ink-stained fingers; tired eyes; coat that never quite dries',
      build: 'Lean, restless energy',
      distinctiveFeatures: 'Carries a battered notebook; always scanning for patterns',
    },
    personality: {
      coreTraits: [
        'Pattern-obsessed, skeptical, stubbornly rational (until reality forces a rewrite)',
        'Empathetic but guarded',
        'Feels watched even when nothing is there',
        'Compulsively documents details',
      ],
      flaws: [
        'Overcorrects into cynicism when afraid',
        'Fixates on "solving" instead of resting',
        'Trust issues (especially with institutions)',
      ],
      strengths: [
        'Notices repeating structures others dismiss',
        'Follows a thread without glamorizing it',
        'Can change his mind when the evidence truly changes',
      ],
    },
    backstory: {
      career: 'Worked records and small investigative jobs; knows how cities hide facts in paperwork',
      currentLife: 'Underemployed; living above Murphy\'s Bar; chasing odd jobs and stranger patterns',
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
    aliases: ['The Midnight Cartographer', 'V.A.', 'Cartographer'],
    role: 'Primary antagonist/guide; architect of Jack's route through the mystery',
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
        'Protective of the Under-Map's "grammar" while exploiting it',
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
      origin: 'Connected to Ashport's semiotics/urban-mapping underground',
      motive: 'Force Jack to see the pattern, then decide what kind of person follows it',
    },
    methods: {
      communication: 'Dead letters with silver ink, river-glass tokens, and rule-like phrasing',
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
      'Short declaratives when startled ("Again.")',
      'Careful accumulation when reasoning (list-like, observational)',
      'Fragments when the world slips ("Not a trick. Not a prank.")',
    ],
    vocabularyTendencies: [
      'Pattern words: "repeat," "align," "rule," "signal," "noise"',
      'Avoids fantasy labels early; uses practical nouns (sign, ink, tape, file)',
      'Dry humor under stress, never quippy',
    ],
    physicalTells: [
      'Checks his notes when anxious',
      'Touches the river-glass token unconsciously',
      'Stops moving to listen when a space feels wrong',
    ],
    dialogueRhythm: [
      'Asks for specifics, not feelings',
      'Cuts off explanations with a direct question',
      'Lets silence test the other person',
    ],
  },

  victoria: {
    name: 'Victoria Blackwell / The Midnight Cartographer',
    sentencePatterns: [
      'Controlled sentences, no filler',
      'Questions used as locks',
      'Rules disguised as statements',
    ],
    vocabularyTendencies: [
      'Map language: "route," "line," "legend," "scale," "blank"',
      'Constraint language: "don't," "never," "once," "until"',
    ],
    physicalTells: [
      'Stillness as dominance',
      'Touches nothing unless it's deliberate',
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
  if (normalizedName.includes('victoria') ||
      normalizedName.includes('cartographer') || normalizedName.includes('blackwell')) {
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
  if (normalizedName.includes('victoria') ||
      normalizedName.includes('cartographer') || normalizedName.includes('blackwell')) {
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
