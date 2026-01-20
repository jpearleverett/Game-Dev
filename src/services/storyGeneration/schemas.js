/**
 * Schema for a single tappable detail within narrative text
 */
export const DETAIL_SCHEMA = {
  type: 'object',
  properties: {
    phrase: {
      type: 'string',
      description: 'The exact phrase in the narrative text that can be tapped (must appear verbatim in the segment text)',
    },
    note: {
      type: 'string',
      description: 'Jack\'s internal observation when the player taps this detail (15-25 words)',
    },
    evidenceCard: {
      type: 'string',
      description: 'If this detail becomes evidence, the card label (2-4 words). Leave empty if purely atmospheric.',
    },
  },
  required: ['phrase', 'note'],
};

/**
 * Schema for a single choice option at a branch point
 */
export const CHOICE_OPTION_SCHEMA = {
  type: 'object',
  properties: {
    key: {
      type: 'string',
      description: 'Unique identifier for this option: "1A", "1B", "1C" for first choice, "2A", "2B", "2C" for second',
    },
    label: {
      type: 'string',
      description: 'Short action label (2-5 words, imperative). Must be a DIFFERENT ACTION from other options - not the same action with different intensity. E.g., "Ask about the file", "Examine her desk", "Change the subject". NOTE: For option C (1C or 2C), make this a WILDCARD choice - unexpected, creative, or unconventional action that adds fun and variation.',
    },
    response: {
      type: 'string',
      description: 'The narrative response when player selects this option (300-350 words). Continue the scene based on this choice.',
    },
    summary: {
      type: 'string',
      description: 'One-sentence summary of what happens when player takes this path (15-25 words). Used for decision context. E.g., "Jack takes a direct approach, confronting the witness and pressuring them for information."',
    },
    details: {
      type: 'array',
      items: DETAIL_SCHEMA,
      description: '0-2 tappable details within this response segment',
    },
  },
  required: ['key', 'label', 'response', 'summary'],
};

/**
 * Schema for a choice point in the narrative
 */
export const CHOICE_POINT_SCHEMA = {
  type: 'object',
  properties: {
    prompt: {
      type: 'string',
      description: 'Brief context for the choice (shown to player, 5-15 words). E.g., "How does Jack respond?"',
    },
    options: {
      type: 'array',
      items: CHOICE_OPTION_SCHEMA,
      minItems: 3,
      maxItems: 3,
      description: 'Exactly 3 options for the player to choose from',
    },
  },
  required: ['prompt', 'options'],
};

/**
 * Schema for a second-level choice (after first choice, leading to endings)
 */
export const SECOND_CHOICE_SCHEMA = {
  type: 'object',
  properties: {
    afterChoice: {
      type: 'string',
      description: 'Which first choice this follows: "1A", "1B", or "1C"',
    },
    prompt: {
      type: 'string',
      description: 'Brief context for this choice point (5-15 words)',
    },
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'Unique identifier: "1A-2A", "1A-2B", "1A-2C", etc.',
          },
          label: {
            type: 'string',
            description: 'Short action label (2-5 words). NOTE: For 2C options (e.g., 1A-2C, 1B-2C, 1C-2C), make this a WILDCARD choice - unexpected, creative, or unconventional action that adds fun and variation.',
          },
          response: {
            type: 'string',
            description: 'The ending narrative segment (300-350 words). Conclude this path of the subchapter.',
          },
          summary: {
            type: 'string',
            description: 'One-sentence summary of what happens in this path ending (15-25 words). Used for decision context. E.g., "Jack confronts the suspect directly, learning the truth but alerting their accomplices."',
          },
          details: {
            type: 'array',
            items: DETAIL_SCHEMA,
            description: '0-2 tappable details within this ending segment',
          },
        },
        required: ['key', 'label', 'response', 'summary'],
      },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ['afterChoice', 'prompt', 'options'],
};

/**
 * Complete schema for a branching narrative subchapter
 */
export const BRANCHING_NARRATIVE_SCHEMA = {
  type: 'object',
  properties: {
    opening: {
      type: 'object',
      description: 'The opening segment, shared by all paths (300-350 words)',
      properties: {
        text: {
          type: 'string',
          description: 'Opening narrative that sets the scene and leads to the first choice (300-350 words)',
        },
        details: {
          type: 'array',
          items: DETAIL_SCHEMA,
          description: '1-2 tappable details in the opening',
        },
      },
      required: ['text'],
    },
    firstChoice: CHOICE_POINT_SCHEMA,
    secondChoices: {
      type: 'array',
      items: SECOND_CHOICE_SCHEMA,
      minItems: 3,
      maxItems: 3,
      description: 'Three second-choice points, one for each first choice option (1A, 1B, 1C)',
    },
  },
  required: ['opening', 'firstChoice', 'secondChoices'],
};

/**
 * Schema for regular subchapters (no decision point)
 */
export const STORY_CONTENT_SCHEMA = {
  type: 'object',
  properties: {
    // NOTE: beatSheet, jackActionStyle, jackRiskLevel, jackBehaviorDeclaration, storyDay
    // were moved to <internal_planning> in system prompt - Gemini 3's native thinking
    // handles these internally without outputting them, reducing token usage by ~20%.
    title: {
      type: 'string',
      description: 'Evocative chapter title, 2-5 words',
    },
    bridge: {
      type: 'string',
      description: 'One short, compelling sentence hook for this subchapter (max 15 words)',
    },
    previously: {
      type: 'string',
      description: 'A concise 1-2 sentence recap of the previous subchapter (max 40 words), third-person past tense.',
    },
    // BRANCHING NARRATIVE - Interactive story with player choices
    // Structure: Opening (300-350w) -> Choice1 (3 opts) -> Middles (3x 300-350w) -> Choice2 (3 each) -> Endings (9x 300-350w)
    // Total: ~4000+ words generated, player experiences 850-950 words per path
    branchingNarrative: {
      type: 'object',
      description: 'Interactive branching narrative with 2 choice points and 9 possible paths',
      properties: {
        opening: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Opening scene shared by all paths (300-350 words). Set the scene, build to first choice.',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  phrase: { type: 'string', description: 'Exact phrase from text that can be tapped' },
                  note: { type: 'string', description: 'Jack\'s observation (15-25 words)' },
                  evidenceCard: { type: 'string', description: 'Evidence card label if applicable (2-4 words), or empty' },
                },
                required: ['phrase', 'note'],
              },
            },
          },
          required: ['text'],
        },
        firstChoice: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Choice context (5-15 words). E.g., "How does Jack respond?"' },
            options: {
              type: 'array',
              minItems: 3,
              maxItems: 3,
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string', description: '"1A", "1B", or "1C"' },
                  label: { type: 'string', description: 'Action label (2-5 words). Different ACTION from other options, not same action with different intensity. NOTE: For option 1C, make this a WILDCARD choice - unexpected, creative, or unconventional action that adds fun and variation.' },
                  response: { type: 'string', description: 'Narrative response (300-350 words)' },
                  details: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        phrase: { type: 'string' },
                        note: { type: 'string' },
                        evidenceCard: { type: 'string' },
                      },
                      required: ['phrase', 'note'],
                    },
                  },
                },
                required: ['key', 'label', 'response'],
              },
            },
          },
          required: ['prompt', 'options'],
        },
        secondChoices: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          description: 'Three second-choice points, one following each first choice (1A, 1B, 1C)',
          items: {
            type: 'object',
            properties: {
              afterChoice: { type: 'string', description: 'Which first choice this follows: "1A", "1B", or "1C"' },
              prompt: { type: 'string', description: 'Choice context (5-15 words)' },
              options: {
                type: 'array',
                minItems: 3,
                maxItems: 3,
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string', description: '"1A-2A", "1A-2B", "1A-2C", etc.' },
                    label: { type: 'string', description: 'Action label (2-5 words). Different ACTION from other options. NOTE: For 2C options (1A-2C, 1B-2C, 1C-2C), make this a WILDCARD choice - unexpected, creative, or unconventional action that adds fun and variation.' },
                    response: { type: 'string', description: 'Ending segment (300-350 words). Conclude this path.' },
                    details: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          phrase: { type: 'string' },
                          note: { type: 'string' },
                          evidenceCard: { type: 'string' },
                        },
                        required: ['phrase', 'note'],
                      },
                    },
                  },
                  required: ['key', 'label', 'response'],
                },
              },
            },
            required: ['afterChoice', 'prompt', 'options'],
          },
        },
      },
      required: ['opening', 'firstChoice', 'secondChoices'],
    },
    // NOTE: chapterSummary removed - 'previously' + 'narrative' already provide this; was never displayed
    // NOTE: puzzleCandidates removed - puzzle uses static word list now
    briefing: {
      type: 'object',
      description: 'Mission briefing for the evidence board puzzle',
      properties: {
        summary: {
          type: 'string',
          description: 'One sentence objective for this subchapter, e.g., "Find the connection between the warehouse records and the missing witness."',
        },
        objectives: {
          type: 'array',
          items: { type: 'string' },
          description: '2-3 specific directives for the player, e.g., "Cross-reference the shipping manifests", "Identify the code words used"',
        },
      },
      required: ['summary', 'objectives'],
    },
    // NOTE: consistencyFacts removed - was deleted before storage anyway; narrative threads handle continuity
    // NOTE: previousThreadsAddressed removed - was deleted before storage; thread tracking handled in system prompt
    narrativeThreads: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['appointment', 'revelation', 'investigation', 'relationship', 'physical_state', 'promise', 'threat'],
            description: 'Category of narrative thread'
          },
          description: {
            type: 'string',
            description: 'Brief description of the thread (e.g., "Jack agreed to meet his contact at the docks at midnight")'
          },
          status: {
            type: 'string',
            enum: ['active', 'resolved', 'failed'],
            description: 'Whether this thread is still pending, was resolved, or failed'
          },
          urgency: {
            type: 'string',
            enum: ['critical', 'normal', 'background'],
            description: 'How urgent is this thread? critical=must resolve within 1-2 chapters'
          },
          characters: {
            type: 'array',
            items: { type: 'string' },
            description: 'Characters involved in this thread'
          },
          dueChapter: {
            type: 'number',
            description: 'Chapter number by which this MUST be resolved (critical=current+1, normal=current+3)'
          }
        },
        required: ['type', 'description', 'status', 'urgency']
      },
      description: 'Active story threads: promises, meetings, investigations, relationships, injuries, threats.'
    },
  },
  required: ['title', 'bridge', 'previously', 'branchingNarrative', 'briefing', 'narrativeThreads'],
};

// ============================================================================
// DECISION-ONLY SCHEMA - Used for 2-pass generation (decision structure only)
// ============================================================================
export const DECISION_ONLY_SCHEMA = {
  type: 'object',
  properties: {
    decisionContext: {
      type: 'string',
      description: 'Brief description of the narrative situation leading to this choice (2-3 sentences)',
    },
    decision: {
      type: 'object',
      description: 'The binary choice - generate this FIRST before any narrative',
      properties: {
        intro: {
          type: 'string',
          description: '1-2 sentences framing the impossible choice Jack faces',
        },
        optionA: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Always "A"' },
            title: { type: 'string', description: 'Action statement in imperative mood, e.g., "Confront Wade directly"' },
            focus: { type: 'string', description: 'Two sentences: What this path prioritizes and what it risks.' },
            personalityAlignment: {
              type: 'string',
              enum: ['aggressive', 'methodical', 'neutral'],
              description: 'Which player personality type would naturally choose this option',
            },
            narrativeSetup: {
              type: 'string',
              description: 'How the narrative should build toward this option being presented (1-2 sentences)',
            },
          },
          required: ['key', 'title', 'focus', 'personalityAlignment', 'narrativeSetup'],
        },
        optionB: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Always "B"' },
            title: { type: 'string', description: 'Action statement in imperative mood, e.g., "Gather more evidence first"' },
            focus: { type: 'string', description: 'Two sentences: What this path prioritizes and what it risks.' },
            personalityAlignment: {
              type: 'string',
              enum: ['aggressive', 'methodical', 'neutral'],
              description: 'Which player personality type would naturally choose this option',
            },
            narrativeSetup: {
              type: 'string',
              description: 'How the narrative should build toward this option being presented (1-2 sentences)',
            },
          },
          required: ['key', 'title', 'focus', 'personalityAlignment', 'narrativeSetup'],
        },
      },
      required: ['intro', 'optionA', 'optionB'],
    },
    keyMoments: {
      type: 'array',
      items: { type: 'string' },
      description: '3-5 key moments/beats the narrative must include to naturally lead to this decision',
    },
    emotionalArc: {
      type: 'string',
      description: 'The emotional journey Jack experiences in this scene (tension, revelation, confrontation, etc.)',
    },
  },
  required: ['decisionContext', 'decision', 'keyMoments', 'emotionalArc'],
};

/**
 * Schema for decision point subchapters (end of each chapter)
 * NOTE: Same slimmed schema as STORY_CONTENT_SCHEMA - dead fields moved to system prompt
 */
export const DECISION_CONTENT_SCHEMA = {
  type: 'object',
  properties: {
    // NOTE: beatSheet, jackActionStyle, jackRiskLevel, jackBehaviorDeclaration, storyDay
    // were moved to <internal_planning> in system prompt - Gemini 3's native thinking
    // handles these internally without outputting them, reducing token usage by ~20%.
    title: {
      type: 'string',
      description: 'Evocative chapter title, 2-5 words',
    },
    bridge: {
      type: 'string',
      description: 'One short, compelling sentence hook for this subchapter (max 15 words)',
    },
    previously: {
      type: 'string',
      description: 'A concise 1-2 sentence recap of the previous subchapter (max 40 words), third-person past tense.',
    },
    // Decision structure for chapter-ending choices
    // Testing if pathDecisions complexity is causing Gemini schema rejection
    decision: {
      type: 'object',
      description: 'Single decision point with intro and two options (A and B). Each option has key, title, focus, and personalityAlignment.',
      properties: {
        intro: { type: 'string', description: '1-2 sentences framing the decision moment (max 50 words)' },
        optionA: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Option identifier: "A"' },
            title: { type: 'string', description: 'Short imperative action (3-8 words)' },
            focus: { type: 'string', description: 'What this choice prioritizes (1 sentence)' },
            personalityAlignment: { type: 'string', enum: ['aggressive', 'cautious', 'balanced'] },
          },
          required: ['key', 'title', 'focus', 'personalityAlignment'],
        },
        optionB: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Option identifier: "B"' },
            title: { type: 'string', description: 'Short imperative action (3-8 words)' },
            focus: { type: 'string', description: 'What this choice prioritizes (1 sentence)' },
            personalityAlignment: { type: 'string', enum: ['aggressive', 'cautious', 'balanced'] },
          },
          required: ['key', 'title', 'focus', 'personalityAlignment'],
        },
      },
      required: ['intro', 'optionA', 'optionB'],
    },
    // BRANCHING NARRATIVE for decision subchapters - same structure as regular, but builds to the decision
    branchingNarrative: {
      type: 'object',
      description: 'Interactive branching narrative building to the decision moment. 2 choice points, 9 possible paths.',
      properties: {
        opening: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Opening scene (300-350 words). Build tension toward the decision.' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  phrase: { type: 'string' },
                  note: { type: 'string' },
                  evidenceCard: { type: 'string' },
                },
                required: ['phrase', 'note'],
              },
            },
          },
          required: ['text'],
        },
        firstChoice: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Choice context (5-15 words)' },
            options: {
              type: 'array',
              minItems: 3,
              maxItems: 3,
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  label: { type: 'string', description: 'Action label (2-5 words). NOTE: For option 1C, make this a WILDCARD choice - unexpected, creative, or unconventional action that adds fun and variation.' },
                  response: { type: 'string', description: 'Narrative response (300-350 words)' },
                  summary: { type: 'string', description: 'One-sentence summary of what happens (15-25 words). Used for decision context.' },
                  details: { type: 'array', items: { type: 'object', properties: { phrase: { type: 'string' }, note: { type: 'string' }, evidenceCard: { type: 'string' } }, required: ['phrase', 'note'] } },
                },
                required: ['key', 'label', 'response', 'summary'],
              },
            },
          },
          required: ['prompt', 'options'],
        },
        secondChoices: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              afterChoice: { type: 'string' },
              prompt: { type: 'string' },
              options: {
                type: 'array',
                minItems: 3,
                maxItems: 3,
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string' },
                    label: { type: 'string', description: 'Action label (2-5 words). NOTE: For 2C options (1A-2C, 1B-2C, 1C-2C), make this a WILDCARD choice - unexpected, creative, or unconventional action that adds fun and variation.' },
                    response: { type: 'string', description: 'Ending segment (300-350 words). Conclude at the decision moment.' },
                    summary: { type: 'string', description: 'One-sentence summary of this path ending (15-25 words). Used for decision context.' },
                    details: { type: 'array', items: { type: 'object', properties: { phrase: { type: 'string' }, note: { type: 'string' }, evidenceCard: { type: 'string' } }, required: ['phrase', 'note'] } },
                  },
                  required: ['key', 'label', 'response', 'summary'],
                },
              },
            },
            required: ['afterChoice', 'prompt', 'options'],
          },
        },
      },
      required: ['opening', 'firstChoice', 'secondChoices'],
    },
    // NOTE: chapterSummary removed - 'previously' + 'narrative' already provide this
    // NOTE: puzzleCandidates removed - puzzle uses static word list now
    briefing: {
      type: 'object',
      description: 'Mission briefing',
      properties: {
        summary: {
          type: 'string',
          description: 'One sentence objective for this subchapter, e.g., "Uncover the truth behind the conflicting testimonies."',
        },
        objectives: {
          type: 'array',
          items: { type: 'string' },
          description: '2-3 specific directives for the player',
        },
      },
      required: ['summary', 'objectives'],
    },
    // NOTE: consistencyFacts removed - was deleted before storage anyway
    // NOTE: previousThreadsAddressed removed - was deleted before storage; handled in system prompt
    narrativeThreads: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['appointment', 'revelation', 'investigation', 'relationship', 'physical_state', 'promise', 'threat'],
            description: 'Category of narrative thread'
          },
          description: {
            type: 'string',
            description: 'Brief description of the thread'
          },
          status: {
            type: 'string',
            enum: ['active', 'resolved', 'failed'],
            description: 'Whether this thread is still pending, was resolved, or failed'
          },
          urgency: {
            type: 'string',
            enum: ['critical', 'normal', 'background'],
            description: 'How urgent is this thread? critical=must resolve within 1-2 chapters'
          },
          characters: {
            type: 'array',
            items: { type: 'string' },
            description: 'Characters involved in this thread'
          },
          dueChapter: {
            type: 'number',
            description: 'Chapter number by which this MUST be resolved (critical=current+1, normal=current+3)'
          }
        },
        required: ['type', 'description', 'status', 'urgency']
      },
      description: 'Active story threads: promises, meetings, investigations, relationships, injuries, threats.'
    },
  },
  required: ['title', 'bridge', 'previously', 'decision', 'branchingNarrative', 'briefing', 'narrativeThreads'],
};

// ============================================================================
// PATHDECISIONS SCHEMA - Minimal schema for 9 path-specific decisions (second call)
// This is called AFTER main content generation to add path-specific decision options
// ============================================================================
export const PATH_DECISION_OPTION_SCHEMA = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    title: { type: 'string' },
    focus: { type: 'string' },
    personalityAlignment: { type: 'string' },
  },
};

export const SINGLE_PATH_DECISION_SCHEMA = {
  type: 'object',
  properties: {
    intro: { type: 'string' },
    optionA: PATH_DECISION_OPTION_SCHEMA,
    optionB: PATH_DECISION_OPTION_SCHEMA,
  },
};

// Array format for pathDecisions - 9 items, one per unique path
export const PATHDECISIONS_ONLY_SCHEMA = {
  type: 'object',
  properties: {
    pathDecisions: {
      type: 'array',
      description: '9 path-specific decision points, one for each unique path through this subchapter',
      items: {
        type: 'object',
        properties: {
          pathKey: { type: 'string', description: 'Path identifier: 1A-2A, 1A-2B, 1A-2C, 1B-2A, 1B-2B, 1B-2C, 1C-2A, 1C-2B, 1C-2C' },
          intro: { type: 'string', description: 'Path-specific intro text (1-2 sentences framing the decision for this path)' },
          optionA: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Always "A"' },
              title: { type: 'string', description: 'Short imperative action (3-8 words)' },
              focus: { type: 'string', description: 'What this choice prioritizes (1 sentence)' },
              personalityAlignment: { type: 'string', enum: ['aggressive', 'cautious', 'balanced'] },
            },
            required: ['key', 'title', 'focus', 'personalityAlignment'],
          },
          optionB: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Always "B"' },
              title: { type: 'string', description: 'Short imperative action (3-8 words)' },
              focus: { type: 'string', description: 'What this choice prioritizes (1 sentence)' },
              personalityAlignment: { type: 'string', enum: ['aggressive', 'cautious', 'balanced'] },
            },
            required: ['key', 'title', 'focus', 'personalityAlignment'],
          },
        },
        required: ['pathKey', 'intro', 'optionA', 'optionB'],
      },
      minItems: 9,
      maxItems: 9,
    },
  },
  required: ['pathDecisions'],
};
