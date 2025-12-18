/**
 * Character Reference Guide
 *
 * A comprehensive reference of all key characters in "Dead Letters" story.
 * This document is designed to help the LLM maintain character consistency
 * when generating dynamic story content for chapters 2-12.
 *
 * Use this reference to ensure:
 * - Character personalities remain consistent
 * - Relationships are portrayed accurately
 * - Character motivations align with their backstories
 * - Physical descriptions match established canon
 */

export const CHARACTER_REFERENCE = {
  // =============================================================================
  // PROTAGONIST
  // =============================================================================
  protagonist: {
    name: 'Jack Halloway',
    role: 'Retired Detective (formerly Ashport PD)',
    age: 'Late 50s to early 60s',

    physicalDescription: {
      appearance: 'Rumpled trench coat (charcoal gray), heavy stubble, tired eyes',
      build: 'Weathered, worn down by decades on the job',
      distinctiveFeatures: 'The look of a man who has seen too much and slept too little',
    },

    personality: {
      coreTraits: [
        'World-weary and cynical',
        'Guilt-ridden about past mistakes',
        'Determined to uncover the truth',
        'Haunted by cases he closed wrong',
        'Struggles with alcoholism (Jameson whiskey)',
        'Capable of deep introspection when forced',
      ],
      flaws: [
        'Arrogant certainty in his detective work',
        'Dismissed witnesses he deemed "unreliable"',
        'Prioritized clearance rate over truth',
        'Trusted perfect evidence without questioning its source',
        'Cut corners when tired or under pressure',
      ],
      strengths: [
        'Eventually willing to face his failures',
        'Capable of genuine remorse and atonement',
        'Still has strong investigative instincts',
        'Will sacrifice himself for justice when pushed',
      ],
    },

    backstory: {
      career: 'Thirty years as a detective with the best clearance rate in Ashport history',
      reputation: 'Known as a legendary detective, now revealed to be built on manufactured evidence',
      keyMistakes: [
        'Closed Emily Cross case prematurely, declaring her dead while she was still alive',
        'Convicted Eleanor Bellamy on planted evidence',
        'Ignored witnesses he deemed "unreliable" (homeless, sex workers, addicts)',
        'Never questioned where "perfect evidence" came from',
      ],
      retirement: 'Forced retirement, living in a run-down office above Murphy\'s Bar',
    },

    relationships: {
      sarahReeves: 'Former partner for 13 years. She eventually loses faith in him and starts her own Conviction Integrity Project.',
      tomWade: 'Best friend for 30 years, Chief Forensic Examiner. Betrayed Jack by manufacturing evidence.',
      silasReed: 'Former partner for 8 years. Was blackmailed into framing Marcus Thornhill.',
      victoriaBlackwell: 'Antagonist who orchestrates his downfall to teach him about certainty\'s cost.',
    },

    voiceAndStyle: {
      narrative: 'First-person, noir detective voice',
      internalMonologue: 'Self-deprecating, philosophical, prone to metaphors about rain and shadows',
      dialogue: 'Terse, direct, occasionally poetic when drunk or exhausted',
      examplePhrases: [
        '"Rain fell on Ashport the way memory falls on the guilty."',
        '"The difference between certainty and arrogance is just perspective and consequences."',
        '"Thirty years of wins suddenly felt like thirty years of lies."',
      ],
    },
  },

  // =============================================================================
  // ANTAGONIST
  // =============================================================================
  antagonist: {
    name: 'Victoria Blackwell',
    aliases: ['Emily Cross', 'The Midnight Confessor', 'The Woman in Red', 'E.C.'],
    role: 'Primary antagonist, orchestrator of Jack\'s "education"',
    age: 'Late 20s to early 30s (seven years since "death")',

    physicalDescription: {
      appearance: 'Elegant, beautiful in a dangerous way, often wears red',
      style: 'Expensive taste - designer clothes, French perfume (floral with patchouli)',
      presence: 'Commanding, regal, moves with calculated precision',
      scars: 'Physical scars from torture by Deputy Chief Grange (revealed later)',
    },

    personality: {
      coreTraits: [
        'Brilliant strategist, always three moves ahead',
        'Patient - waited seven years to execute her plan',
        'Methodical and precise in everything',
        'Cold and calculating on the surface',
        'Deeply traumatized beneath the veneer',
        'Believes power is the only way to ensure justice',
      ],
      flaws: [
        'Can become consumed by revenge',
        'Manipulates others, even those she claims to help',
        'Views people as chess pieces',
        'Struggles to trust anyone completely',
      ],
      strengths: [
        'Vast financial resources and intelligence network',
        'Exceptional at gathering and leveraging information',
        'Genuinely wants to free the innocent',
        'Capable of sacrifice for her goals',
      ],
    },

    backstory: {
      originalIdentity: 'Emily Cross, art student at 22, rising star in Ashport\'s art scene',
      trauma: [
        'Had affair with Richard Bellamy (not entirely consensual, started at 19)',
        'Richard was 48, married, powerful - used his position to control her',
        'Attempted suicide at 23 (overdose on Oxycodone, 30 pills)',
        'Kidnapped by Deputy Chief Grange, tortured for months',
        'Jack declared her dead while she was still being tortured',
        'Heard Jack say "Case closed" on a phone call while in captivity',
      ],
      transformation: 'Escaped/was released, spent seven years building wealth and network as Victoria Blackwell',
      motivation: 'Force Jack to understand what his arrogant certainty cost innocent people',
    },

    methods: {
      communication: 'Black envelopes with red wax seal, silver ink, signed as "M.C." or "V.A."',
      calling: 'Leaves obsidian chess pieces marking each day',
      leverage: 'Uses blackmail, information, and financial power to achieve goals',
      philosophy: '"Truth without power is just noise."',
    },

    relationships: {
      jackHalloway: 'Target of her "curriculum" - she wants to destroy and potentially redeem him',
      richardBellamy: 'Former abuser, dead before the story begins',
      deputyChiefGrange: 'Her torturer, she orchestrates his downfall',
      eleanorBellamy: 'Framed for murder Eleanor didn\'t commit; Victoria wants to free her',
    },

    voiceAndStyle: {
      speaking: 'Elegant, educated, precise diction',
      written: 'Formal, literary, occasionally sardonic',
      examplePhrases: [
        '"Twelve days. Twelve cases. One you closed without certainty."',
        '"I don\'t need to prove it. I just need people to believe it."',
        '"Innocence doesn\'t matter as much as certainty."',
        '"You\'re doing well. Better than I expected."',
      ],
    },
  },

  // =============================================================================
  // MAJOR SUPPORTING CHARACTERS
  // =============================================================================
  allies: {
    sarahReeves: {
      name: 'Sarah Reeves',
      role: 'Jack\'s former partner, still on the force',
      age: 'Early to mid 40s',

      physicalDescription: {
        appearance: 'Professional, practical, wears a black leather jacket',
        demeanor: 'Direct gaze, no-nonsense posture',
      },

      personality: {
        coreTraits: [
          'Competent and thorough detective',
          'Morally grounded',
          'Direct and confrontational',
          'Eventually loses faith in Jack',
          'Builds something better from the ashes',
        ],
        arc: 'Transitions from loyal partner to independent force for justice',
      },

      backstory: {
        partnership: 'Worked with Jack for 13 years',
        growth: 'Realizes she was always better than she thought, held back by Jack\'s shadow',
        achievement: 'Brings down Grange\'s operation in 72 hours by following up leads Jack dismissed',
        future: 'Founds the Conviction Integrity Project',
      },

      relationships: {
        jackHalloway: 'Complicated - respects him but ultimately walks away from his corruption',
      },

      voiceAndStyle: {
        speaking: 'Direct, no pleasantries, gets to the point',
        examplePhrases: [
          '"Tell me you\'re not involved."',
          '"Everything\'s on you. That\'s your problem."',
          '"I\'m done being your partner, your subordinate, your anything."',
        ],
      },
    },

    eleanorBellamy: {
      name: 'Eleanor Bellamy',
      role: 'Wrongfully convicted widow, one of the five innocents',
      age: 'Late 50s',

      physicalDescription: {
        appearance: 'Gaunt, carved away by eight years in prison',
        condition: 'Poisoned with ricin (survives but damaged)',
        transformation: 'Society widow reduced to prisoner, but steel underneath',
      },

      personality: {
        coreTraits: [
          'Bitter but resilient',
          'Sharp intelligence despite circumstances',
          'Righteous anger at the injustice',
          'Ultimately capable of forgiveness',
        ],
      },

      backstory: {
        conviction: 'Convicted of murdering husband Richard Bellamy with arsenic',
        evidence: 'Sapphire necklace planted in her deposit box, arsenic found in her tea set',
        truth: 'Richard was being blackmailed, killed by someone else, Eleanor framed',
        prison: 'Eight years in Greystone Correctional',
        daughter: 'Maya Bellamy, whom she missed watching grow up',
      },

      relationships: {
        richardBellamy: 'Late husband, was being blackmailed and embezzling',
        mayaBellamy: 'Daughter, loves deeply, missed her childhood',
        jackHalloway: 'The detective who put her in prison',
        victoriaBlackwell: 'Visited her in prison, promised Jack would understand',
      },

      voiceAndStyle: {
        speaking: 'Gravel and broken glass, bitter but precise',
        examplePhrases: [
          '"Mrs. died when you sent me here."',
          '"Eight years for maybe."',
          '"You trusted tea sets more than people."',
        ],
      },
    },

    mayaBellamy: {
      name: 'Maya Bellamy',
      role: 'Eleanor\'s daughter',
      age: 'Mid 20s',

      physicalDescription: {
        appearance: 'Young, terrified when first introduced',
      },

      personality: {
        coreTraits: [
          'Determined to prove mother\'s innocence',
          'Brave but vulnerable',
          'Has been investigating on her own',
        ],
      },

      backstory: {
        childhood: 'Lost mother to prison at young age',
        investigation: 'Found documents proving Richard was being blackmailed',
        abduction: 'Taken by Victoria as leverage/demonstration of power (not harmed)',
      },

      relationships: {
        eleanorBellamy: 'Mother - desperate to free her',
        victoriaBlackwell: 'Abducted by her but treated well',
      },
    },

    rebeccaMoss: {
      name: 'Rebecca Moss',
      role: 'Defense attorney, represents Eleanor and Jack',
      age: 'Middle-aged',

      physicalDescription: {
        appearance: 'Thick-rimmed glasses, professional demeanor',
      },

      personality: {
        coreTraits: [
          'Dedicated legal advocate',
          'Tireless fighter for innocents',
          'Pragmatic about the legal system',
        ],
      },

      backstory: {
        specialty: 'Defense attorney who takes on wrongful conviction cases',
        role: 'Helps navigate legal battles for the innocents',
      },
    },
  },

  // =============================================================================
  // CORRUPT OFFICIALS / VILLAINS
  // =============================================================================
  villains: {
    tomWade: {
      name: 'Dr. Thomas "Tom" Wade',
      role: 'Chief Forensic Examiner, Jack\'s best friend and betrayer',
      age: 'Similar to Jack (late 50s)',

      personality: {
        coreTraits: [
          'Outwardly friendly and competent',
          'Secretly manufactured evidence for decades',
          'Cowardly - did it to protect himself',
        ],
      },

      backstory: {
        friendship: 'Known Jack for 30 years - college, academy, first cases',
        betrayal: 'Manufactured "perfect evidence" for 20 years',
        impact: 'Every case he touched is now suspect',
        daughter: 'Teresa Wade, wrongfully convicted using his methods',
      },

      relationships: {
        jackHalloway: 'Best friend who he systematically betrayed',
        teresaWade: 'Daughter, one of the five innocents',
      },
    },

    silasReed: {
      name: 'Silas Reed',
      role: 'Jack\'s former partner, blackmailed into corruption',
      age: 'Mid 50s',

      physicalDescription: {
        appearance: 'Lives in an expensive penthouse (bought with blood money)',
        condition: 'Broken, alcoholic, waiting for consequences',
      },

      personality: {
        coreTraits: [
          'Fundamentally weak',
          'Cowardly - chose self-preservation over integrity',
          'Genuinely remorseful',
          'Self-destructive',
        ],
      },

      backstory: {
        partnership: 'Worked with Jack for 8 years',
        blackmail: 'Blackmailed seven years ago over a secret',
        crime: 'Signed documents that framed Marcus Thornhill',
        consequence: 'Marcus committed suicide, his daughter Claire lost everything',
      },

      relationships: {
        jackHalloway: 'Partner and friend he betrayed',
        victoriaBlackwell: 'His blackmailer',
        marcusThornhill: 'Man he helped frame',
      },

      voiceAndStyle: {
        speaking: 'Defeated, bourbon-soaked, confessional',
        examplePhrases: [
          '"I told myself Thornhill was probably guilty anyway."',
          '"Victoria wins. She always wins."',
        ],
      },
    },

    helenPrice: {
      name: 'Helen Price',
      title: 'Assistant District Attorney, "Queen of Convictions"',
      role: 'Prosecutor who built career on Jack\'s fraudulent evidence',
      age: 'Mid to late 30s',

      physicalDescription: {
        before: 'Polished, powerful, immaculate suits, wore success like a crown',
        after: 'Aged overnight, disheveled, broken',
      },

      personality: {
        coreTraits: [
          'Ambitious and driven',
          'Never questioned perfect evidence',
          'Genuinely believes in justice (was corrupted by the system)',
          'Capable of remorse and self-sacrifice',
        ],
      },

      backstory: {
        record: 'Six years, 53 cases, 53 wins - never lost a trial',
        corruption: '21 of those cases involved manufactured evidence',
        downfall: 'Receives Victoria\'s dossier, confesses publicly',
        fate: 'Commits suicide (implied in some paths)',
      },

      relationships: {
        jackHalloway: 'Built her career on his cases',
        system: 'Benefited from not asking questions',
      },

      voiceAndStyle: {
        speaking: 'Formal, legal precision breaking into emotional rawness',
        examplePhrases: [
          '"Twenty-one innocent people. And I never questioned a single piece of evidence."',
          '"Maybe we deserve everything Victoria\'s going to do to us."',
        ],
      },
    },

    deputyChiefGrange: {
      name: 'Deputy Chief William Grange',
      role: 'Serial kidnapper, torturer, Emily\'s captor',

      personality: {
        coreTraits: [
          'Sadistic and methodical',
          'Hid crimes behind badge and authority',
          'Serial predator targeting vulnerable women',
        ],
      },

      backstory: {
        crimes: '23 kidnapping victims over years, 8 confirmed dead',
        method: 'Used badge and power to operate openly',
        exposure: 'Sarah brings him down using witnesses Jack dismissed',
        emily: 'Held and tortured Emily Cross for months after Jack closed the case',
      },

      relationships: {
        jackHalloway: 'Jack\'s negligence enabled his crimes',
        emilyVictoria: 'His victim who survived and orchestrated his downfall',
        sarahReeves: 'The detective who actually caught him',
      },
    },

    theOverseer: {
      name: 'The Overseer',
      role: 'Shadowy figure controlling corruption in Ashport',

      description: 'The mastermind behind the systemic corruption, operates through proxies',

      purpose: 'Represents how deep the corruption goes beyond any single individual',
    },
  },

  // =============================================================================
  // VICTIMS / WRONGFULLY CONVICTED
  // =============================================================================
  victims: {
    fiveInnocents: {
      description: 'The five people wrongfully convicted using manufactured evidence',
      members: [
        {
          name: 'Eleanor Bellamy',
          conviction: 'Murder of husband Richard Bellamy',
          evidence: 'Planted sapphire necklace, arsenic in tea set',
          truth: 'Richard was being blackmailed, killed by someone else',
        },
        {
          name: 'Marcus Thornhill',
          conviction: 'Financial crimes (embezzlement)',
          evidence: 'Shell company documents forged by Silas Reed',
          truth: 'Completely innocent, framed by the real embezzlers',
          fate: 'Committed suicide in lockup before trial',
        },
        {
          name: 'Dr. Lisa Chen',
          role: 'Lab technician',
          conviction: 'Unknown charges',
          truth: 'Reported Tom Wade\'s evidence tampering, was transferred and silenced',
        },
        {
          name: 'James Sullivan',
          conviction: 'Unknown charges',
          truth: 'One of the five innocents Jack helped convict',
        },
        {
          name: 'Teresa Wade',
          relation: 'Tom Wade\'s daughter',
          conviction: 'Unknown charges',
          truth: 'Convicted using her own father\'s manufactured evidence',
        },
      ],
    },

    marcusThornhill: {
      name: 'Marcus Thornhill',
      role: 'CFO, wrongfully accused of embezzlement',

      backstory: {
        career: 'Successful CFO at a major company',
        framing: 'Documents were forged to make him look like an embezzler',
        perpetrators: 'Silas Reed signed forged documents under blackmail',
        fate: 'Hanged himself in lockup three days after conviction',
        daughter: 'Claire Thornhill, who spent years gathering evidence',
      },
    },

    claireThornhill: {
      name: 'Claire Thornhill',
      role: 'Marcus Thornhill\'s daughter',
      occupation: 'Waitress at Blueline Diner (formerly had scholarship)',
      age: 'Late 20s',

      physicalDescription: {
        appearance: 'Hair pulled back tight, uniform worn thin from too many washes',
        demeanor: 'Carries fifty years of exhaustion in a twenty-something body',
      },

      personality: {
        coreTraits: [
          'Bitter and angry',
          'Determined investigator',
          'Has spent four years gathering evidence',
          'Righteous fury at the system',
        ],
      },

      backstory: {
        before: 'Had a scholarship, promising future',
        after: 'Lost everything when father was convicted',
        investigation: 'Spent four years building a case proving her father was framed',
        evidence: 'Has the "Thornhill Ledger" proving the frame-up',
      },

      relationships: {
        marcusThornhill: 'Father, loved him and was destroyed by his death',
        jackHalloway: 'The detective who refused to listen, dismissed her father\'s claims',
        silasReed: 'The man who signed the documents that killed her father',
      },

      voiceAndStyle: {
        speaking: 'Cold, precise, weaponized facts',
        examplePhrases: [
          '"That\'s what you said when he tried to tell you about Silas Reed."',
          '"I\'m not helping you. I\'m helping the next Marcus Thornhill."',
        ],
      },
    },

    luciaMartinez: {
      name: 'Lucia Martinez',
      role: 'One of Grange\'s victims',
      age: '24 at death',

      backstory: {
        profession: 'Nursing student, engaged',
        abduction: 'Kidnapped three months after Jack closed Emily\'s case',
        duration: 'Held eleven months, died in captivity',
        significance: 'Died because Jack stopped looking',
        mother: 'Mrs. Martinez, appears at the gallery exhibit',
      },
    },
  },

  // =============================================================================
  // SECONDARY CHARACTERS
  // =============================================================================
  secondary: {
    richardBellamy: {
      name: 'Richard Bellamy',
      role: 'Eleanor\'s dead husband, art dealer',

      backstory: {
        profession: 'Wealthy art dealer with old money connections',
        crimes: 'Was embezzling from art clients, underreporting values',
        blackmail: 'Was being blackmailed for his crimes',
        affair: 'Had affair with Emily Cross (not consensual)',
        death: 'Poisoned with arsenic, Eleanor framed for it',
      },

      relationships: {
        eleanorBellamy: 'Wife, framed for his murder',
        emilyCross: 'Victim of his abuse',
        marcusWebb: 'Had a secret romantic relationship',
      },
    },

    marcusWebb: {
      name: 'Marcus Webb',
      role: 'Antique dealer, information broker',
      age: 'Mid 60s',

      physicalDescription: {
        appearance: 'Gray beard trimmed to precision, expensive cardigan',
        setting: 'Runs an antique shop full of secrets',
      },

      personality: {
        coreTraits: [
          'Deals in secrets and information',
          'Former journalist',
          'Knows where all the bodies are buried',
          'Carries tremendous guilt',
        ],
      },

      backstory: {
        former: 'Former journalist before scandal ended his career',
        current: 'Information broker dealing in rare objects and dangerous secrets',
        secret: 'Loved Richard Bellamy for fifteen years',
        guilt: 'Knew Eleanor was innocent, stayed silent',
        inheritance: 'Inherited money from Richard',
      },

      relationships: {
        richardBellamy: 'Secret lover for 15 years',
        victoriaBlackwell: 'She blackmailed him into testifying',
      },

      voiceAndStyle: {
        speaking: 'Cultured, world-weary, knows too much',
        examplePhrases: [
          '"I keep everything. That\'s my curse."',
          '"Plot thickens like blood in water."',
        ],
      },
    },

    agentMartinez: {
      name: 'Agent Luis Martinez',
      role: 'FBI agent investigating the corruption',

      personality: {
        coreTraits: [
          'Professional and by-the-book',
          'Determined to bring down the corrupt system',
          'Direct and efficient',
        ],
      },

      role_in_story: 'Leads federal investigation into Ashport corruption',
    },

    captainMorrison: {
      name: 'Captain Morrison',
      role: 'Jack\'s former superior',

      mention: 'Referred to Emily Cross case as "tying a bow on a corpse"',
    },
  },

  // =============================================================================
  // LOCATIONS
  // =============================================================================
  locations: {
    ashport: {
      name: 'Ashport',
      description: 'Rain-soaked noir city, morally gray, modern day with noir aesthetics',
      tone: 'Perpetually rainy, neon-lit, corrupt institutions',
      landmarks: [
        'Murphy\'s Bar (beneath Jack\'s office)',
        'Greystone Correctional (prison where Eleanor is held)',
        'Bellamy Estate (Victorian mansion, now abandoned)',
        'Blueline Diner (where Claire Thornhill works)',
        'Victoria\'s Penthouse (glass and steel, commanding view)',
        'FBI Field Office on Morrison Street',
      ],
    },
  },

  // =============================================================================
  // THEMES AND MOTIFS
  // =============================================================================
  themes: {
    central: [
      'Wrongful convictions and their devastating cost',
      'The price of certainty over truth',
      'Redemption versus revenge',
      'Corruption in the justice system',
      'The line between justice and vigilantism',
      'Who gets to be a "credible" victim',
    ],
    motifs: {
      rain: 'Constant presence, represents guilt, memory, cleansing',
      chess: 'Victoria leaves obsidian pieces, Jack is a pawn in her game',
      red: 'Victoria\'s signature color, represents danger and passion',
      twelve: 'Twelve days, twelve cases, twelve lessons',
      perfectEvidence: 'The manufactured proof that destroyed lives',
    },
  },
};

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
  if (normalizedName.includes('victoria') || normalizedName.includes('emily') ||
      normalizedName.includes('confessor') || normalizedName.includes('blackwell')) {
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
