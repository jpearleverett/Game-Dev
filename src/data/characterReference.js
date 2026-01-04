/**
 * Character Reference Guide
 *
 * A comprehensive reference of key characters in "Dead Letters".
 * This is used to keep the LLM consistent during generation.
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
        'Fixates on “solving” instead of resting',
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
      tomWade: 'Longtime friend (met ~12 years ago). Tom has access to maps/archives and a habit of withholding.',
      sarahReeves: 'A pragmatic ally; refuses melodrama; pushes Jack to verify before escalating.',
      victoriaBlackwell: 'The sender of dead letters. A guide, a trap, and a question in human form.',
      deputyChiefGrange: 'Official pressure that makes witnesses disappear and sites “close for maintenance”.',
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
    role: 'Primary antagonist/guide; architect of Jack’s route through the mystery',
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
        'Protective of the Under-Map’s “grammar” while exploiting it',
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
      origin: 'Connected to Ashport’s semiotics/urban-mapping underground',
      motive: 'Force Jack to see the pattern, then decide what kind of person follows it',
    },
    methods: {
      communication: 'Dead letters with silver ink, river-glass tokens, and rule-like phrasing',
      philosophy: '"If you name it too early, you lose it."',
    },
    relationships: {
      jackHalloway: 'Subject of her “curriculum”',
      deputyChiefGrange: 'An obstacle and competitor in control of information',
      tomWade: 'A pressure point she can exploit',
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

  allies: {
    sarahReeves: {
      name: 'Sarah Reeves',
      role: 'Pragmatic ally; investigator-type (not a noir cop stereotype)',
      age: '30s-40s',
      physicalDescription: {
        appearance: 'Practical clothes, sharp posture, always moving with purpose',
        demeanor: 'Direct gaze; no patience for theatrics',
      },
      personality: {
        coreTraits: [
          'Skeptical but fair',
          'Protective of people over theories',
          'Keeps Jack honest about what he actually knows',
        ],
        arc: 'From “this is nothing” to “this is real and dangerous”',
      },
      voiceAndStyle: {
        speaking: 'Blunt, efficient, asks for specifics',
        examplePhrases: [
          '"Show me the photo. Not the story."',
          '"If it repeats, it’s not random."',
          '"Don’t go alone."',
        ],
      },
    },

    eleanorBellamy: {
      name: 'Eleanor Bellamy',
      role: 'Anchor-linked survivor / pattern historian (not “wrongfully convicted” canon)',
      age: '50s',
      physicalDescription: {
        appearance: 'Weathered, sharp-eyed, hands that don’t stop moving',
      },
      personality: {
        coreTraits: ['Suspicious', 'Precise', 'Hard to impress', 'Strangely calm around symbols'],
      },
      voiceAndStyle: {
        speaking: 'Clipped, exact, allergic to exaggeration',
        examplePhrases: [
          '"Don’t call it a sign. It’s a rule."',
          '"If it’s there, it wants to be seen."',
        ],
      },
    },

    mayaBellamy: {
      name: 'Maya Bellamy',
      role: 'Eleanor’s daughter; amateur researcher',
      age: 'Mid 20s',
    },

    rebeccaMoss: {
      name: 'Rebecca Moss',
      role: 'Counsel/advocate figure (legal/administrative pressure relief)',
      age: 'Middle-aged',
    },
  },

  villains: {
    tomWade: {
      name: 'Thomas "Tom" Wade',
      role: 'Friend with access to archives/maps; knows more than he says',
      age: 'Late 20s to 30s',
      personality: {
        coreTraits: ['Friendly surface', 'Deflects with “practical” reasons', 'Avoids naming things'],
      },
      backstory: {
        friendship: 'Met Jack ~12 years ago through city work/adjacent circles',
        secret: 'Has collected symbol reports and “blank map” anomalies longer than he admits',
      },
      voiceAndStyle: {
        speaking: 'Warm, evasive when cornered; uses logistics as cover',
        examplePhrases: [
          '"It’s probably a maintenance thing."',
          '"Let’s not make it bigger than it is."',
          '"I can get you the file—tomorrow."',
        ],
      },
    },

    silasReed: {
      name: 'Silas Reed',
      role: 'Fixer / gatekeeper to permits, access, and quiet favors',
      age: '40s-50s',
      personality: { coreTraits: ['Smooth', 'Deflects with jokes', 'Scared of the wrong people'] },
      voiceAndStyle: {
        speaking: 'Charm as armor; laughs too quickly',
        examplePhrases: ['"You didn’t hear that from me."', '"Wrong door, Jack."', '"Some lines are expensive."'],
      },
    },

    helenPrice: {
      name: 'Helen Price',
      title: 'City counsel / development liaison',
      role: 'Institutional pressure; makes places “disappear” via paperwork',
      age: '30s-40s',
      voiceAndStyle: {
        speaking: 'Polite, legalistic, weaponized calm',
        examplePhrases: ['"That’s not in the public record."', '"You’re mistaken."', '"This site is closed."'],
      },
    },

    deputyChiefGrange: {
      name: 'Deputy Chief William Grange',
      role: 'Containment/suppression operator around Under-Map incidents',
      personality: { coreTraits: ['Quiet authority', 'Denial as policy', 'Removes witnesses'] },
    },

    theOverseer: {
      name: 'The Overseer',
      role: 'Shadow influence behind containment decisions',
      description: 'A mechanism more than a person; appears through proxies',
    },
  },

  victims: {
    fiveInnocents: {
      description: 'Legacy key: treat as the five anchors / missing threads tied to the glyph pattern',
      members: [
        { name: 'Eleanor Bellamy', role: 'anchor-linked survivor' },
        { name: 'Maris Vell', role: 'missing linguist' },
        { name: 'Niko Serrane', role: 'lost transit worker' },
        { name: 'Saffron Pike', role: 'vanished street photographer' },
        { name: 'Teresa Wade', role: 'missing relative / pressure point on Tom' },
      ],
    },

    claireThornhill: {
      name: 'Claire Thornhill',
      role: 'A witness who notices patterns; keeps a private log',
      age: '20s-30s',
      voiceAndStyle: {
        speaking: 'Fast, nervous precision; dates, times, receipts',
        examplePhrases: ['"It happened twice."', '"That’s not the same sign."', '"I wrote it down."'],
      },
    },
  },

  secondary: {
    marcusWebb: {
      name: 'Marcus Webb',
      role: 'Antique dealer / information broker for odd artifacts',
      age: '60s',
      voiceAndStyle: {
        speaking: 'Cultured, cautious, trades in hints',
        examplePhrases: ['"Some objects remember."', '"You want a map? Define map."', '"Careful what you carry."'],
      },
    },
    agentMartinez: {
      name: 'Agent Luis Martinez',
      role: 'External investigator who notices suppression patterns',
    },
    captainMorrison: {
      name: 'Captain Morrison',
      role: 'Institutional voice; denies anomalies politely',
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
      'Short declaratives when startled (“Again.”)',
      'Careful accumulation when reasoning (list-like, observational)',
      'Fragments when the world slips (“Not a trick. Not a prank.”)',
    ],
    vocabularyTendencies: [
      'Pattern words: “repeat,” “align,” “rule,” “signal,” “noise”',
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
      'Map language: “route,” “line,” “legend,” “scale,” “blank”',
      'Constraint language: “don’t,” “never,” “once,” “until”',
    ],
    physicalTells: [
      'Stillness as dominance',
      'Touches nothing unless it’s deliberate',
    ],
    dialogueRhythm: [
      'Waits for Jack to speak first',
      'Ends exchanges with a single clean instruction',
    ],
  },

  sarah: {
    name: 'Sarah Reeves',
    sentencePatterns: ['Direct, clipped', 'Specific questions', 'No metaphors unless mocking one'],
    vocabularyTendencies: ['Verification language: “show me,” “prove,” “timeline,” “source”'],
    physicalTells: ['Looks at the evidence, not the storyteller'],
    dialogueRhythm: ['Quick back-and-forth; interrupts if Jack spirals'],
  },

  tomWade: {
    name: 'Tom Wade',
    sentencePatterns: ['Friendly openings, evasive endings', 'Answers with logistics', 'Hedges when cornered'],
    vocabularyTendencies: ['Records language: “file,” “permit,” “archive,” “maintenance,” “routing”'],
    physicalTells: ['Busy hands (phone, keys) when lying'],
    dialogueRhythm: ['Over-explains safe details; skips dangerous nouns'],
  },

  eleanor: {
    name: 'Eleanor Bellamy',
    sentencePatterns: ['Short, exact', 'Corrects imprecision', 'Refuses exaggeration'],
    vocabularyTendencies: ['Rule language: “always,” “never,” “if/then”'],
    physicalTells: ['Watches exits and corners automatically'],
    dialogueRhythm: ['Silence as pressure; answers only what was asked'],
  },

  claire: {
    name: 'Claire Thornhill',
    sentencePatterns: ['Fast, data-forward', 'Dates/times', 'Questions that are really panic checks'],
    vocabularyTendencies: ['Receipt language: “timestamp,” “photo,” “log,” “again”'],
    physicalTells: ['Keeps a notebook/phone log close'],
    dialogueRhythm: ['Rushes, then apologizes; repeats key details'],
  },
};

/**
 * Get voice DNA for a specific character
 * @param {string} name - Character name or partial name
 * @returns {Object|null} Voice DNA configuration or null if not found
 */
export function getVoiceDNA(name) {
  const normalizedName = name.toLowerCase();

  // Direct match
  for (const [key, dna] of Object.entries(VOICE_DNA)) {
    if (normalizedName.includes(key.toLowerCase()) ||
        normalizedName.includes(dna.name.toLowerCase().split(' ')[0].toLowerCase())) {
      return dna;
    }
  }

  // Check aliases
  if (normalizedName.includes('victoria') ||
      normalizedName.includes('cartographer') || normalizedName.includes('blackwell')) {
    return VOICE_DNA.victoria;
  }

  if (normalizedName.includes('halloway')) {
    return VOICE_DNA.jack;
  }

  if (normalizedName.includes('reeves')) {
    return VOICE_DNA.sarah;
  }

  if (normalizedName.includes('wade')) {
    return VOICE_DNA.tomWade;
  }

  if (normalizedName.includes('bellamy') && !normalizedName.includes('maya')) {
    return VOICE_DNA.eleanor;
  }

  if (normalizedName.includes('thornhill') && !normalizedName.includes('marcus')) {
    return VOICE_DNA.claire;
  }

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

  // Check allies
  for (const [key, character] of Object.entries(CHARACTER_REFERENCE.allies)) {
    if (normalizedName.includes(key.toLowerCase()) ||
        normalizedName.includes(character.name.toLowerCase().split(' ')[0])) {
      return character;
    }
  }

  // Check villains
  for (const [key, character] of Object.entries(CHARACTER_REFERENCE.villains)) {
    if (normalizedName.includes(key.toLowerCase()) ||
        (character.name && normalizedName.includes(character.name.toLowerCase().split(' ')[0]))) {
      return character;
    }
  }

  // Check victims
  if (CHARACTER_REFERENCE.victims[normalizedName]) {
    return CHARACTER_REFERENCE.victims[normalizedName];
  }

  // Check secondary
  for (const [key, character] of Object.entries(CHARACTER_REFERENCE.secondary)) {
    if (normalizedName.includes(key.toLowerCase()) ||
        (character.name && normalizedName.includes(character.name.toLowerCase().split(' ')[0]))) {
      return character;
    }
  }

  return null;
}

/**
 * Get all characters mentioned in a narrative path
 */
export function getCharactersForPath(pathKey) {
  // Core characters appear in all paths
  const coreCharacters = [
    CHARACTER_REFERENCE.protagonist,
    CHARACTER_REFERENCE.antagonist,
    CHARACTER_REFERENCE.allies.sarahReeves,
    CHARACTER_REFERENCE.allies.eleanorBellamy,
  ];

  // Add path-specific characters based on choices
  // This can be expanded as needed
  return coreCharacters;
}

export default CHARACTER_REFERENCE;
