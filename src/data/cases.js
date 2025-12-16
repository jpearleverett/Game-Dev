import { BRANCHING_OUTLIER_SETS } from './branchingOutliers';

const RAW_SEASON_ONE_CASES = [
    {
      id: 1,
      caseNumber: '001A',

      day: 1,
      title: 'Midnight Delivery',
    mainTheme: { name: 'COMMUNICATION', icon: '✉️' },
    outlierTheme: { name: 'BEGINNINGS', icon: '🔓' },
    attempts: 4,
      dailyIntro:
        `Some confessions arrive at midnight. Some arrive seven years late. All of them cost something.`,
      briefing: {
        summary:
          'A mysterious envelope appeared at your door. Scan the items on your desk to identify the four methods the Confessor is using to stalk you.',
        objectives: [
          'Scan your desk for the specific communication channels the Confessor weaponises.',
          'Isolate the four specific methods she used to deliver her ultimatum.',
          'Lock the grid to prove you can hear her signal.'
        ]
      },
      
      evidenceBoard: {
        polaroids: [
          {
            id: '001A-confessor-arrival',
            imageKey: 'silas', // Fallback or placeholder if silence not avail, but using mapped keys
            imageKey: 'silence',
            title: 'MIDNIGHT VISITOR',
            subtitle: '2:47 AM ARRIVAL',
            detail: 'Perfumed stranger. No knock. Just the slide of paper under the door and the scent of expensive French perfume lingering like a ghost.'
          },
          {
            id: '001A-eleanor-call',
            imageKey: 'sparkle',
            title: 'ELEANOR\'S PLEA',
            subtitle: 'GREYSTONE EMERGENCY',
            detail: 'Sarah called at 3 AM. Eleanor Bellamy poisoned with ricin. She swore she was framed eight years ago. She swore there was a woman in red.'
          },
          {
            id: '001A-ultimatum-envelope',
            imageKey: 'default',
            title: 'BLACK ENVELOPE',
            subtitle: 'THE ULTIMATUM',
            detail: '"Twelve days. Twelve cases. One you closed without certainty." Heavy stock. Red wax seal. The game piece that started the clock.'
          }
        ]
      },
    board: {
      mainWords: [
        'LETTER',
        'EMAIL',
        'TEXT',
        'CALL',
        'VOICEMSG',
        'MEMO',
        'NOTE',
        'FAX',
        'CHAT',
        'DISPATCH',
        'TELEGRAM',
        'MESSAGE'
      ],
      outlierWords: ['ORIGIN', 'START', 'FIRST', 'DAWN']
    },
    clueSummaries: {
      main:
        'You found the BEGINNINGS. Now read the journal to see how Jack uses it.',
      outliers: {
        ORIGIN: 'Points Jack straight back to the Emily Cross file he buried—the origin she demands he reopen.',
        START: 'Marks the first square in her twelve-day gauntlet and the moment the game truly begins.',
        FIRST: 'Reminds him there was a first innocent he ignored, and that certainty cut someone loose.',
        DAWN: 'Foreshadows the daily unlocks—he can rest, but the next reckoning arrives at dawn regardless.'
      }
    }
        
  },
  {
      id: 2,
      caseNumber: '001B',

      day: 1,
      title: "The Widow's Testimony",
      mainTheme: { name: 'COMMUNICATION', icon: '✉️' },
      outlierTheme: { name: 'GEMSTONES', icon: '💎' },
      attempts: 4,
      dailyIntro: `PREVIOUSLY: Black envelope at 2:47 AM. Twelve cases. One closed without certainty.
Sarah called—Eleanor Bellamy poisoned at Greystone. Evidence stolen. Twelve files, twelve days.
The woman in red. Always the woman in red. Jack's certainty turned to ash.`,
      briefing: {
        summary:
          'Eleanor claims she was framed. Profile her financial status. Isolate the four luxury items that don\'t fit a struggling widow\'s budget.',
        objectives: [
          'Review the case file for items that don\'t match Eleanor\'s financial profile.',
          'Identify the four expensive objects planted in her safety deposit box.',
          'Clear the board to expose the evidence that was manufactured.'
        ]
      },
            evidenceBoard: {
        polaroids: [
          {
            id: '001B-visitation-booth',
            imageKey: 'sparkle',
            title: 'GREYSTONE VISIT',
            subtitle: 'DYING DECLARATION',
            detail: 'Eleanor looked like charcoal sketches of her former self. Shackled. Coughing blood. "Mrs. died when you sent me here."'
          },
          {
            id: '001B-scarlet-visitor',
            imageKey: 'silence',
            title: 'SCARLET VISITOR',
            subtitle: 'PRISON LOG',
            detail: 'A woman in red visited three weeks ago. Told Eleanor that Jack Halloway would come. That he would finally learn what certainty costs.'
          },
          {
            id: '001B-ricin-note',
            imageKey: 'default',
            title: 'RICIN NOTE',
            subtitle: 'TRAY MESSAGE',
            detail: '"The widow knows the truth. Ask her about the woman in red." Found under her dinner tray. A prompt, not just a threat.'
          }
        ]
      },
      board: {
        mainWords: [
          'CONFESSION',
          'VISITATION',
          'PRISON',
          'SHACKLES',
          'GUARD',
          'LETTER',
          'VOICE',
          'WHISPER',
          'TRUTH',
          'PLEA',
          'CAGE',
          'WITNESS'
        ],
        outlierWords: ['SAPPHIRE', 'NECKLACE', 'JEWEL', 'STONE']
      },
      clueSummaries: {
        main:
          'You found the GEMSTONES. Now read the journal to see how Jack uses it.',
        outliers: {
          SAPPHIRE: 'Shines a light on the planted necklace that sank the trial.',
          NECKLACE: 'Names the forged heirloom that never appeared in Richard’s catalog.',
          JEWEL: 'Signals the luxury bait Victoria used to manufacture certainty.',
          STONE: 'Reminds Jack that every glittering clue was a weapon placed in plain sight.'
        }
      }
              
  },
  {
      id: 3,
      caseNumber: '001C',

      day: 1,
      title: 'The Sapphire Trail',
      mainTheme: { name: 'COMMUNICATION', icon: '✉️' },
      outlierTheme: { name: 'CHESS PIECES', icon: '♟️' },
      attempts: 4,
      dailyIntro: `PREVIOUSLY: Eleanor in Greystone, dying from ricin. Eight years for maybe.
She told him about the woman in red—elegant, dangerous, building evidence.
Maya called, terrified. Then silence. Victoria had her. The widow's truth, too late to matter.`,
      briefing: {
        summary:
          'The Confessor left a calling card on the desk. Decode the specific game pieces she is using to describe your team.',
        objectives: [
          'Analyze the chess board left by the Confessor.',
          'Identify the four pieces representing the players in this game.',
          'Decipher the metaphor to understand the threat.'
        ]
      },
      
      evidenceBoard: {
        polaroids: [
          {
            id: '001C-ruined-study',
            imageKey: 'default',
            title: 'BELLAMY STUDY',
            subtitle: 'CRACKED SAFE',
            detail: 'Richard\'s study. The safe was empty. The jewelry catalog was missing. Proof that the sapphire necklace was never recorded in his meticulous logs.'
          },
          {
            id: '001C-day-one-pawn',
            imageKey: 'silence',
            title: 'OBSIDIAN PAWN',
            subtitle: 'GAME PIECE',
            detail: 'Left on the desk. "DAY ONE: THE INNOCENT SUFFER." A heavy stone token marking the first casualty of the Confessor\'s lesson.'
          },
          {
            id: '001C-sarah-sweep',
            imageKey: 'voice',
            title: 'SARAH REEVES',
            subtitle: 'PARTNER SWEEP',
            detail: 'Sarah beat me to the scene. Found the break-in. Warned me that seven years ago, Emily Cross disappeared.'
          }
        ]
      },
      board: {
        mainWords: [
          'STUDY',
          'LEDGER',
          'SAFE',
          'CATALOG',
          'DOOR',
          'FOOTSTEP',
          'FLASHLIGHT',
          'FILE',
          'PHOTO',
          'PAWN',
          'LETTER',
          'EVIDENCE'
        ],
        outlierWords: ['PAWN', 'KNIGHT', 'BISHOP', 'CHECK']
      },
      clueSummaries: {
        main:
          'You found the CHESS PIECES. Now read the journal to see how Jack uses it.',
        outliers: {
          PAWN: 'Marks the first chess piece Victoria uses to grade his progress.',
          KNIGHT: 'Hints at the unseen moves already positioned against Jack.',
          BISHOP: 'Signals the diagonal strikes—evidence that cuts across his assumptions.',
          CHECK: 'Warns that the Confessor is measuring how close she is to cornering him.'
        }
      }
            
  },
  {
      id: 4,
      caseNumber: '002A',

      day: 2,
      title: 'Corporate Sins',
      mainTheme: { name: 'CRIME SCENE', icon: '🩸' },
      outlierTheme: { name: 'COVER-UP', icon: '🧤' },
      attempts: 4,
      dailyIntro:
        `PREVIOUSLY: The widow spoke of the woman in red. Maya vanished. The sapphire was planted.
Victoria Ashford is Emily Cross—the ghost Jack declared dead. Evidence can be manufactured.`,
      briefing: {
        summary:
          'The suicide scene feels staged. Find the four cleaning supplies that shouldn\'t be in a dirty holding cell.',
        objectives: [
          'Examine the crime scene photos for inconsistencies.',
          'Locate the cleaning agents used to wipe the evidence.',
          'Prove the scene was sanitized before the police arrived.'
        ]
      },
      
      evidenceBoard: {
        polaroids: [
          {
            id: '002A-claire-dossier',
            imageKey: 'voice',
            title: 'CLAIRE THORNHILL',
            subtitle: 'DAUGHTER\'S GRIEF',
            detail: 'Waitress at the Blueline. Eyes full of rage. She\'s been documenting my failures for four years, ever since her father died in my custody.'
          },
          {
            id: '002A-silas-surveillance',
            imageKey: 'keeper',
            title: 'SILAS REED',
            subtitle: 'PARTNER SIGNATURE',
            detail: 'Claire\'s evidence points to Silas. He signed the witness statements. He handled the transfer records. He smoothed the edges.'
          },
          {
            id: '002A-blueline-backroom',
            imageKey: 'default',
            title: 'BLUELINE DINER',
            subtitle: 'MIDNIGHT COFFEE',
            detail: 'A booth patched with duct tape. Claire served coffee and truth. "Trust is just another word for blindness," she said.'
          }
        ]
      },
      board: {
        mainWords: [
          'TAPE',
          'GLASS',
          'PRINTS',
          'BLOOD',
          'SHELL',
          'FIBER',
          'CHALK',
          'CAMERA',
          'EVIDENCE',
          'SWAB',
          'DUST',
          'MARK'
        ],
        outlierWords: ['BLEACH', 'WIPE', 'SCRUB', 'SOLVENT']
      },
      clueSummaries: {
        main:
          'You found the COVER-UP. Now read the journal to see how Jack uses it.',
        outliers: { BLEACH: 'Used to clean the cell.', WIPE: 'Removes fingerprints.', SCRUB: 'Erases biological evidence.', SOLVENT: 'Dissolves residue.' }
      }
            
  },
    {
      id: 5,
      caseNumber: '002B',

      day: 2,
      title: "Partner's Guilt",
      mainTheme: { name: 'CRIME SCENE', icon: '🩸' },
      outlierTheme: { name: 'BLACKMAIL', icon: '🗝️' },
      attempts: 4,
      dailyIntro: `PREVIOUSLY: Marcus Thornhill's photos, annotated in red. Egyptian cotton where there should be polyester.
Claire served coffee at midnight, delivered rage with cream and sugar. Her father hung in lockup.
Victoria's warning: Day Two coming. Jack's phone, locked in his drawer, buzzing with ghosts.`,
      briefing: {
        summary:
          'Silas didn\'t do this for money. Find the words describing the leverage used against him.',
        objectives: [
          'Investigate Silas\'s personal records for coercion.',
          'Identify the threats used to force his compliance.',
          'Uncover the blackmail material holding him hostage.'
        ]
      },
      
      evidenceBoard: {
        polaroids: [
          {
            id: '002B-silas-confession',
            imageKey: 'keeper',
            title: 'SILAS CONFESSES',
            subtitle: 'MARINA BALCONY',
            detail: 'Twenty-third floor. A glass of bourbon and a ruined career. He was blackmailed. "I sacrificed a stranger to save my family."'
          },
          {
            id: '002B-encrypted-orders',
            imageKey: 'buyer',
            title: 'SHADOW LEDGER',
            subtitle: 'BLACKMAIL ORDERS',
            detail: 'Encrypted files sent to Silas. Directives to frame Thornhill. "Sign here. Backdate this." The price of his secret.'
          },
          {
            id: '002B-marina-balcony',
            imageKey: 'default',
            title: 'MARINA TOWER',
            subtitle: 'THE FALL',
            detail: 'The view from the balcony costs six figures. Silas paid for it with Marcus Thornhill\'s life. Now he pays with his own.'
          }
        ]
      },
      board: {
        mainWords: [
          'PARTNER',
          'LOYALTY',
          'BADGE',
          'OATH',
          'CASE',
          'REPORT',
          'PATROL',
          'BACKUP',
          'TRUST',
          'STATUTE',
          'EVIDENCE',
          'CONFESSION'
        ],
        outlierWords: ['THREAT', 'PHOTO', 'SECRET', 'EXPOSURE']
      },
        clueSummaries: {
          main:
            'You found the BLACKMAIL. Now read the journal to see how Jack uses it.',
          outliers: { THREAT: 'The leverage used against him.', PHOTO: 'The evidence of his affair.', SECRET: 'What he wanted to hide.', EXPOSURE: 'The fear that drove him.' }
        }
            
  },
    {
      id: 6,
      caseNumber: '002C',

      day: 2,
      title: "The Daughter's Gambit",
      mainTheme: { name: 'CRIME SCENE', icon: '🩸' },
      outlierTheme: { name: 'REVENGE', icon: '🗡️' },
      attempts: 4,
      dailyIntro: `PREVIOUSLY: Silas Reed confessed through tears. Blackmailed seven years ago, signed documents that framed Marcus. Thirty years as partners. Jack never saw it. Never asked. Certainty made him blind.
The system protects itself. Victoria taught Silas that lesson first.`,
      briefing: {
        summary:
          'Victoria staged the penthouse to manipulate you. Identify the theatrical props she used to set the scene.',
        objectives: [
          'Survey the penthouse environment for staged elements.',
          'Isolate the objects placed to curate a specific narrative.',
          'Deconstruct the scene to reveal the manipulation.'
        ]
      },
      
      evidenceBoard: {
        polaroids: [
          {
            id: '002C-maya-hostage',
            imageKey: 'sparkle',
            title: 'MAYA BELLAMY',
            subtitle: 'PENTHOUSE GUEST',
            detail: 'Drinking tea on a white leather sofa. Confused, terrified, but unharmed. A pawn used to demonstrate reach.'
          },
          {
            id: '002C-victoria-reveal',
            imageKey: 'silence',
            title: 'VICTORIA ASHFORD',
            subtitle: 'THE REVEAL',
            detail: 'Emily Cross, alive. In a deep red dress. "Certainty is just another word for blindness." She built an empire to teach this lesson.'
          },
          {
            id: '002C-blackwell-skyline',
            imageKey: 'default',
            title: 'BLACKWELL VIEW',
            subtitle: 'CITY OVERLOOK',
            detail: 'The entire city looks like a toy set from up here. Victoria watches Ashport burn from the highest tower.'
          }
        ]
      },
      board: {
        mainWords: [
          'PENTHOUSE',
          'WINDOW',
          'TEA',
          'CAR',
          'DRIVER',
          'CAMERA',
          'PHOTO',
          'INVITE',
          'SECRET',
          'FLOOR',
          'ESCAPE',
          'POWER'
        ],
        outlierWords: ['PAYBACK', 'VENDETTA', 'SCORE', 'GRUDGE']
      },
      clueSummaries: {
        main:
          'You found the REVENGE. Now read the journal to see how Jack uses it.',
        outliers: {
          PAYBACK: 'Signals that every choice is designed to settle the score.',
          VENDETTA: 'Names the personal crusade driving the entire spectacle.',
          SCORE: 'Reminds Jack that Victoria is keeping tally for every injustice.',
          GRUDGE: 'Underscores that revenge is the currency Victoria deals in.'
        }
      }
            
  },
    {
      id: 7,
      caseNumber: '003A',

      day: 3,
      title: "Sarah's Investigation",
      mainTheme: { name: 'IDENTITY', icon: '🪪' },
      outlierTheme: { name: 'BURIED', icon: '🕳️' },
      attempts: 4,
      dailyIntro:
        `PREVIOUSLY: Claire Thornhill served rage. Silas confessed to blackmail, framed Marcus.
Victoria held Maya like a chess piece. Offered Jack her empire. Trust is blindness.`,
      briefing: {
        summary:
          'Sarah claims the evidence was never lost. Find the words that prove it was deliberately buried in the archives.',
        objectives: [
          'Search the archive logs.',
          'Identify terms of concealment.',
          'Locate the buried files.'
        ]
      },
            evidenceBoard: {
        polaroids: [
          {
            id: '003A-archive-raid',
            imageKey: 'voice',
            title: 'SARAH REEVES',
            subtitle: 'ARCHIVE BREACH',
            detail: 'She didn\'t wait for permission. Broke into the condemned precinct. Pulled every file I ever touched.'
          },
          {
            id: '003A-waterlogged-files',
            imageKey: 'default',
            title: 'BURIED FILES',
            subtitle: 'CONDEMNED PRECINCT',
            detail: 'Water-damaged boxes. "Dismissed Witness." "Unreliable." The pattern was there in the damp paper. I just refused to see it.'
          },
          {
            id: '003A-flash-drive',
            imageKey: 'default',
            title: 'BLACK DRIVE',
            subtitle: 'THE EVIDENCE',
            detail: 'Sarah handed it to me at dawn. Twenty-one cases. Every single one had a witness I ignored or a clue I buried.'
          }
        ]
      },

    board: {
      mainWords: [
          'NAME',
          'ALIAS',
          'PAST',
          'FAMILY',
          'JOB',
          'HABIT',
          'SECRET',
          'FILE',
          'REPORT',
          'PROFILE',
          'WITNESS',
          'TRUTH'
      ],
        outlierWords: ['DUST', 'BASEMENT', 'ARCHIVE', 'BURIED']
    },
      clueSummaries: {
        main:
            'You found the BURIED. Now read the journal to see how Jack uses it.',
        outliers: { DUST: 'Covering the forgotten files.', BASEMENT: 'Where the truth was hidden.', ARCHIVE: 'The deep storage unit.', BURIED: 'Evidence Jack tried to ignore.' }
      }
              
  },
    {
      id: 8,
      caseNumber: '003B',

      day: 3,
      title: "The Dealer's Information",
      mainTheme: { name: 'IDENTITY', icon: '🪪' },
      outlierTheme: { name: 'SECRETS', icon: '🔐' },
      attempts: 4,
      dailyIntro: `PREVIOUSLY: Sarah broke into Jack's condemned precinct. Found every dismissed witness, every buried report.
Every case had the same pattern—evidence appearing perfectly, witnesses marked unreliable.
Helen Price prosecuted all five innocents. The Queen built her crown on Jack's fraud.`,
      briefing: {
        summary:
          'Marcus claims he was just Richard\'s friend. Filter the board for terms that suggest a deeper, romantic connection.',
        objectives: [
          'Analyze the relationship.',
          'Identify romantic terms.',
          'Expose the secret affair.'
        ]
      },
      
      evidenceBoard: {
        polaroids: [
          {
            id: '003B-marcus-backroom',
            imageKey: 'buyer',
            title: 'MARCUS WEBB',
            subtitle: 'ANTIQUE DEALER',
            detail: 'He deals in secrets and old money. Loved Richard Bellamy for fifteen years. Stayed silent while Eleanor went to prison.'
          },
          {
            id: '003B-emily-portrait',
            imageKey: 'sparkle',
            title: 'EMILY CROSS',
            subtitle: 'GALLERY PORTRAIT',
            detail: 'Young. Talented. Richard\'s hand on her shoulder, too possessive. The photo proves the affair—and the motive.'
          },
          {
            id: '003B-ledger',
            imageKey: 'default',
            title: 'SECRET LEDGER',
            subtitle: 'EMBEZZLEMENT',
            detail: 'Richard was stealing from his clients to pay blackmail. Marcus had the proofs. Cowardice kept them hidden in a drawer.'
          }
        ]
      },
      board: {
        mainWords: [
          'DOSSIER',
          'LEDGER',
          'CLIPPING',
          'PHOTO',
          'ARCHIVE',
          'ANTIQUE',
          'LETTER',
          'SECRET',
          'AGREEMENT',
          'GHOST',
          'MENTOR',
          'LOVER'
        ],
        outlierWords: ['LOVER', 'SECRET', 'AFFAIR', 'TRYST']
      },
      clueSummaries: {
        main:
          'You found the SECRETS. Now read the journal to see how Jack uses it.',
        outliers: { LOVER: 'The role Marcus really played.', SECRET: 'What Richard was hiding.', AFFAIR: 'The reason for the secrecy.', TRYST: 'Meetings in the dark.' }
      }
            
  },
  {
      id: 9,
      caseNumber: '003C',

      day: 3,
      title: 'The First Move',
      mainTheme: { name: 'IDENTITY', icon: '🪪' },
      outlierTheme: { name: 'CORRUPTION', icon: '💵' },
      attempts: 4,
      dailyIntro: `PREVIOUSLY: Marcus Webb dealt in secrets at his antique shop. Loved Richard for fifteen years, stayed silent.
Emily Cross was Richard's victim—affair that wasn't consensual. Marcus inherited money, knew Eleanor was innocent.
Victoria blackmailed him into testifying. Tomorrow at ten AM. Cowardice dressed as redemption.`,
      briefing: {
        summary:
          'Helen\'s conviction rate is perfect. Find the financial terms that bought those verdicts.',
        objectives: [
          'Follow the money trail.',
          'Identify terms of bribery.',
          'Link payment to justice.'
        ]
      },
      
      evidenceBoard: {
        polaroids: [
          {
            id: '003C-helen-breakdown',
            imageKey: 'lex',
            title: 'HELEN PRICE',
            subtitle: 'THE QUEEN',
            detail: 'Fifty-three wins. Zero losses. The Queen of Convictions. Now just a terrified woman in a stained suit, realizing her kingdom is ash.'
          },
          {
            id: '003C-annotated-dossier',
            imageKey: 'default',
            title: 'RED DOSSIER',
            subtitle: 'ANNOTATED FILES',
            detail: 'Victoria delivered it herself. Every manufactured conviction circled in red ink. A roadmap of our corruption.'
          },
          {
            id: '003C-interview-room',
            imageKey: 'default',
            title: 'INTERVIEW THREE',
            subtitle: 'CONFESSION ROOM',
            detail: 'Where we used to break suspects. Now Helen sits there, breaking herself. The glass is one-way, but the truth goes both directions.'
          }
        ]
      },
    board: {
      mainWords: [
          'COURT',
          'DOCKET',
          'EVIDENCE',
          'BRIEF',
          'OATH',
          'WITNESS',
          'GAVEL',
          'RECORD',
          'STATUTE',
          'APPEAL',
          'VERDICT',
          'TRUTH'
      ],
        outlierWords: ['PAYOFF', 'KICKBACK', 'BRIBE', 'GRAFT']
    },
      clueSummaries: {
        main:
            'You found the CORRUPTION. Now read the journal to see how Jack uses it.',
        outliers: { PAYOFF: 'Money for silence.', KICKBACK: 'The price of a conviction.', BRIBE: 'Buying the verdict.', GRAFT: 'The rot in the system.' }
      }
              
  },
  {
    id: 10,
    caseNumber: '004A',

    day: 4,
    title: "The Queen's Confession",
    mainTheme: { name: 'ROYALTY', icon: '👑' },
    outlierTheme: { name: 'INHERITANCE', icon: '📜' },
    attempts: 4,
      dailyIntro:
        `PREVIOUSLY: Sarah found dismissed witnesses, walked away to build clean.
Marcus Webb loved Richard, stayed silent. Helen Price crumbled—fifty-three wins, Jack's fraud.
Twenty-one innocents. Tom Wade's name on every case. The system buries truth.`,
    briefing: {
        summary:
          'Helen is sticking to the PR script. Isolate the four \'Private\' emotions she is hiding behind her public apology.',
        objectives: [
          'Decode the public statement.',
          'Identify hidden emotions.',
          'Find the private truth.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '004A-price-podium',
                imageKey: 'lex',
                title: 'CITY HALL',
                subtitle: 'PUBLIC FALL',
                detail: 'Helen at the podium. The flashbulbs are blinding. She\'s reading the statement we wrote, dismantling her own legend line by line.'
              },
              {
                id: '004A-press-row',
                imageKey: 'default',
                title: 'PRESS ROW',
                subtitle: 'THE VULTURES',
                detail: 'They smell blood. A hundred cameras capturing the exact moment the "Queen of Convictions" abdicates.'
              },
              {
                id: '004A-surveillance-clip',
                imageKey: 'default',
                title: 'TORTURE TAPE',
                subtitle: 'THE PROOF',
                detail: 'The footage Victoria supplied. It shows Grange\'s methods. It shows what we allowed to happen in the name of "results."'
              }
            ]
          },    board: {
      mainWords: [
        'CROWN',
        'THRONE',
        'KINGDOM',
        'PALACE',
        'EMPIRE',
        'COURT',
        'SCEPTER',
        'CORONATION',
        'MONARCH',
        'REGENT',
        'JEWEL',
        'LEGACY'
      ],
      outlierWords: ['GUILT', 'SHAME', 'SUICIDE', 'NOTE']
    },
    clueSummaries: {
      main:
        'You found the INHERITANCE. Now read the journal to see how Jack uses it.',
      outliers: { GUILT: 'The emotion behind the apology.', SHAME: 'What she felt in private.', SUICIDE: 'The tragic end she chose.', NOTE: 'Her final confession.' }
    }
          
  },

  {
    id: 11,
    caseNumber: '004B',

    day: 4,
    title: "Sarah's Move",
    mainTheme: { name: 'GOVERNMENT', icon: '🏛️' },
    outlierTheme: { name: 'CORRUPTION', icon: '💵' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: Helen's press conference—Queen of Convictions crumbled. Jack confessed at the podium.
Victoria sent video: Emily alive, screaming, while Jack declared her dead. Grange visible, badge clear.
Victoria played checkmate. Confessions became prologue. The real monster exposed at noon.`,
    briefing: {
        summary:
          'Grange claims he\'s a decorated officer. Find the \'Criminal\' acts hidden in his record.',
        objectives: [
          'Review the service record.',
          'Identify illegal acts.',
          'Expose the real monster.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '004B-sarah-briefing',
                imageKey: 'voice',
                title: 'FBI BRIEFING',
                subtitle: 'SARAH\'S MOVE',
                detail: 'Sarah found twenty-three victims in seventy-two hours. Handed the binder to Agent Martinez. She didn\'t wait for my permission.'
              },
              {
                id: '004B-witness-binder',
                imageKey: 'default',
                title: 'WITNESS BINDER',
                subtitle: 'DISMISSED VOICES',
                detail: 'Twelve witnesses I marked "unreliable." Sex workers. Addicts. Homeless. Sarah listened. They led her straight to Grange\'s operation.'
              },
              {
                id: '004B-grange-arrest',
                imageKey: 'keeper',
                title: 'GRANGE ARRESTED',
                subtitle: 'NOON RAID',
                detail: 'Deputy Chief William Grange. Badge visible. Knife in hand on the tape. Arrested at noon. The system finally eating its own.'
              }
            ]
          },    board: {
      mainWords: [
        'AFFIDAVIT',
        'TESTIMONY',
        'BINDER',
        'EVIDENCE',
        'CASEFILE',
        'WITNESS',
        'STATEMENT',
        'SUBPOENA',
        'ARREST',
        'FBI',
        'LEVERAGE',
        'TRUTH'
      ],
      outlierWords: ['TORTURE', 'KIDNAP', 'ABUSE', 'FORCE']
    },
    clueSummaries: {
      main:
        'You found the CORRUPTION. Now read the journal to see how Jack uses it.',
      outliers: { TORTURE: 'What Grange did in that room.', KIDNAP: 'Taking Emily Cross.', ABUSE: 'Power weaponised.', FORCE: 'The only language he spoke.' }
    }
          
  },

  {
    id: 12,
    caseNumber: '004C',

    day: 4,
    title: 'The Portrait',
    mainTheme: { name: 'IDENTITY', icon: '💡' },
    outlierTheme: { name: 'BETRAYAL', icon: '🗡️' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: Grange arrested. Sarah brought down twenty-three kidnapping victims in seventy-two hours—witnesses Jack dismissed.
She found his operation by following leads Jack marked insufficient. Twelve witnesses who didn't matter.
Sarah walked away. Starting her own firm. Jack had made her better by being worse.`,
    briefing: {
        summary:
          'Victoria painted a portrait. Find the \'Empty\' words describing what she sees in Jack\'s eyes.',
        objectives: [
          'Analyze the portrait.',
          'Identify terms of hollowness.',
          'Face your reflection.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '004C-victoria-lesson',
                imageKey: 'silence',
                title: 'VICTORIA ASHFORD',
                subtitle: 'PENTHOUSE LESSON',
                detail: 'She poured bourbon with a shaking hand. Admitted I surprised her. "For six hours, I thought you\'d beaten me."'
              },
              {
                id: '004C-portrait-reveal',
                imageKey: 'sparkle',
                title: 'LUCIA MARTINEZ',
                subtitle: 'VICTIM NINETEEN',
                detail: 'Nursing student. Engaged. Taken three months after I closed the Cross case. Died because I stopped looking.'
              },
              {
                id: '004C-lisa-envelope',
                imageKey: 'default',
                title: 'DAY FIVE',
                subtitle: 'NEXT ENVELOPE',
                detail: 'Black paper. Red seal. Inside: Dr. Lisa Chen. The woman my best friend destroyed to protect himself.'
              }
            ]
          },    board: {
      mainWords: [
        'PENTHOUSE',
        'WINDOW',
        'BOURBON',
        'PORTRAIT',
        'LETTER',
        'ENVELOPE',
        'TEXT',
        'PHOTO',
        'PROMISE',
        'RECKONING',
        'CURRICULUM',
        'POWER'
      ],
      outlierWords: ['HOLLOW', 'VOID', 'DEAD', 'EMPTY']
    },
    clueSummaries: {
      main:
        'You found the BETRAYAL. Now read the journal to see how Jack uses it.',
      outliers: { HOLLOW: 'Jack\'s eyes in the portrait.', VOID: 'Where his soul should be.', DEAD: 'How he looked at victims.', EMPTY: 'The cost of certainty.' }
    }
          
  },

  {
    id: 13,
    caseNumber: '005A',

    day: 5,
    title: 'Evidence Rooms and Lies',
    mainTheme: { name: 'FORENSICS', icon: '🔬' },
    outlierTheme: { name: 'TAMPERING', icon: '🧪' },
    attempts: 4,
    dailyIntro:
      `PREVIOUSLY: Helen fell. Grange video showed Emily screaming while Jack closed her case.
Sarah brought down Grange—twenty-three victims, eight dead. Victoria's scars visible.
Monsters wear badges. Being right about being wrong changes nothing.`,
    briefing: {
        summary:
          'Review Tom\'s lab logs. Identify the four administrative terms that prove he forged Lisa\'s signature.',
        objectives: [
          'Audit the lab reports.',
          'Identify administrative forgery.',
          'Prove the falsification.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '005A-lisa-release',
                imageKey: 'lex',
                title: 'LISA CHEN',
                subtitle: 'GREYSTONE RELEASE',
                detail: 'Released at 9:15 AM. Four years older. Thinner. Harder. "Statistically speaking, I calculated a 73% probability you\'d appear."'
              },
              {
                id: '005A-victoria-orders',
                imageKey: 'default',
                title: 'BLACK ENVELOPE',
                subtitle: 'DAY FIVE ORDERS',
                detail: '"The real fraud was her supervisor—your friend." Victoria\'s handwriting. Elegant. Mocking. Truthful.'
              },
              {
                id: '005A-evidence-drive',
                imageKey: 'default',
                title: 'FLASH DRIVE',
                subtitle: 'THE EVIDENCE',
                detail: 'Two hundred seventeen cases. At least sixty provably false. Tom Wade wasn\'t just efficient. He was a mass murderer using the state as his weapon.'
              }
            ]
          },    board: {
      mainWords: [
        'EVIDENCE',
        'DNA',
        'FIBERS',
        'TOXICOLOGY',
        'SAMPLE',
        'ANALYSIS',
        'AUTOPSY',
        'CHAIN',
        'MICROSCOPE',
        'SEQUENCER',
        'REPORT',
        'LABCOAT'
      ],
      outlierWords: ['LOGIN', 'PASSWORD', 'ACCESS', 'STAMP']
    },
    clueSummaries: {
      main:
        'You found the TAMPERING. Now read the journal to see how Jack uses it.',
      outliers: { LOGIN: 'Digital footprint of the forgery.', PASSWORD: 'Stolen credentials.', ACCESS: 'Unauthorized entry.', STAMP: 'The fake approval.' }
    }
        
  },

  {
    id: 14,
    caseNumber: '005B',

    day: 5,
    title: 'Sarah Finds the Lab',
    mainTheme: { name: 'INVESTIGATION', icon: '🕵️' },
    outlierTheme: { name: 'FABRICATION', icon: '🧵' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: Lisa Chen released from Greystone. Four years for Tom's crimes. She calculated probabilities, spoke in data.
Tom framed her when she caught him altering DNA. She handed Jack a flash drive—two hundred seventeen cases.
At least sixty provably false. Best friend, mass murderer. Prison as weapon.`,
    briefing: {
        summary:
          'Tom didn\'t hang himself. Find the \'Murder\' evidence disguised as suicide.',
        objectives: [
          'Examine the crime scene.',
          'Identify signs of struggle.',
          'Prove it was murder.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '005B-helios-warehouse',
                imageKey: 'default',
                title: 'HELIOS LAB',
                subtitle: 'PHANTOM WAREHOUSE',
                detail: 'Registered to a shell company. Inside: a full forensic lab. DNA sequencers. Samples labeled with my case numbers. The factory floor of my career.'
              },
              {
                id: '005B-sarah-command',
                imageKey: 'voice',
                title: 'SARAH REEVES',
                subtitle: 'THE REAL DETECTIVE',
                detail: 'She found it in three days. Cross-referenced property records. Did the work I was too arrogant to do. "You\'re contaminated evidence, Jack."'
              },
              {
                id: '005B-tom-wade-call',
                imageKey: 'keeper',
                title: 'TOM WADE',
                subtitle: '2 AM CALL',
                detail: '"I\'m not a monster, Jack. I\'m a soldier." He confessed. Justified it. Said he saved society by ensuring convictions. Then the line went dead.'
              }
            ]
          },    board: {
      mainWords: [
        'WAREHOUSE',
        'SHELL',
        'SEQUENCER',
        'FREEZER',
        'SAMPLES',
        'EVIDENCE',
        'CHAIN',
        'WARRANT',
        'CASEFILE',
        'BLUEPRINT',
        'LEDGER',
        'FLASHDRIVE'
      ],
      outlierWords: ['STRANGLE', 'FORCE', 'BRUISE', 'STAGE']
    },
    clueSummaries: {
      main:
        'You found the FABRICATION. Now read the journal to see how Jack uses it.',
      outliers: { STRANGLE: 'Cause of death hidden by the rope.', FORCE: 'Signs of struggle.', BRUISE: 'Marks on the neck.', STAGE: 'Making it look like suicide.' }
    }
        
  },

  {
    id: 15,
    caseNumber: '005C',

    day: 5,
    title: 'The Counter-Move',
    mainTheme: { name: 'LEVERAGE', icon: '♟️' },
    outlierTheme: { name: 'BETRAYAL', icon: '🗡️' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: Sarah found Tom's secret lab. Forty-eight phantom locations. Evidence labeled with Jack's case numbers.
Tom called at 2 AM. Confessed his philosophy—ensuring justice by manufacturing it. Then hung himself.
Or Victoria staged it. Marine-grade rope. Foreign DNA. Perfect evidence is usually manufactured.`,
    briefing: {
        summary:
          'Jack is fighting back. Find the \'Action\' verbs to start the offensive.',
        objectives: [
          'Plan the counter-attack.',
          'Identify active measures.',
          'Start the hunt.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '005C-marine-rope',
                imageKey: 'default',
                title: 'MARINE ROPE',
                subtitle: 'STAGED SUICIDE',
                detail: 'Tom never owned a boat. The rope was marine-grade. Traced back to a marina owned by one of Victoria\'s shell companies.'
              },
              {
                id: '005C-dna-scrapings',
                imageKey: 'default',
                title: 'DEFENSIVE DNA',
                subtitle: 'UNDER NAILS',
                detail: 'Foreign DNA under Tom\'s fingernails. Female. Victoria didn\'t just order it. She was there. She made sure he didn\'t choose his own ending.'
              },
              {
                id: '005C-marina-map',
                imageKey: 'silence',
                title: 'VICTORIA ASHFORD',
                subtitle: 'THE EXECUTIONER',
                detail: '"He didn\'t get to choose his ending. Just like I didn\'t get to choose mine." She admitted it. And she knew I wouldn\'t arrest her yet.'
              }
            ]
          },    board: {
      mainWords: [
        'EVIDENCE',
        'LEVERAGE',
        'COUNTERMOVE',
        'TRACE',
        'MARINA',
        'YACHT',
        'KNOT',
        'ROPE',
        'DNA',
        'SCRAPINGS',
        'CONFRONT',
        'CHOICE'
      ],
      outlierWords: ['HUNT', 'TRAP', 'CHASE', 'STRIKE']
    },
    clueSummaries: {
      main:
        'You found the BETRAYAL. Now read the journal to see how Jack uses it.',
      outliers: { HUNT: 'Jack goes on the offensive.', TRAP: 'Setting the snare.', CHASE: 'Running her down.', STRIKE: 'The counter-move.' }
    }
        
    },
    {
      id: 16,
      caseNumber: '006A',

      day: 6,
      title: "The Ex-Wife's Price",
      mainTheme: { name: 'WEALTH', icon: '💰' },
      outlierTheme: { name: 'REVENGE', icon: '🩸' },
      attempts: 4,
    dailyIntro:
      `PREVIOUSLY: Lisa walked free with Tom's flash drive. Sarah found his secret lab—two hundred seventeen cases.
Tom confessed at 2 AM, then hung himself. Or Victoria staged it. Jack chose learning over certainty.
Best friends make you weapons you don't know you've become.`,
    briefing: {
        summary:
          'Margaret claims the carjacking was random violence. Find the words that prove it was a targeted act of revenge.',
        objectives: [
          'Analyze the attack pattern.',
          'Identify terms of retaliation.',
          'Prove it was payback.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '006A-margaret-porch',
                imageKey: 'sparkle',
                title: 'MARGARET PRICE',
                subtitle: 'THE EX-WIFE',
                detail: 'New husband. New life. She looked at me like a bill she thought she\'d paid. "You look like garbage," she said.'
              },
              {
                id: '006A-carjacked-sedan',
                imageKey: 'default',
                title: 'CARJACKING REPORT',
                subtitle: 'FIVE YEARS AGO',
                detail: 'She was held at gunpoint. Terrorized. It wasn\'t random. It was Marcus Thornhill\'s revenge against me, taken out on her.'
              },
              {
                id: '006A-kitchen-wall',
                imageKey: 'default',
                title: 'EMMA HALLOWAY',
                subtitle: 'MY DAUGHTER',
                detail: 'Six years old. Blonde pigtails. "Who\'s that?" she asked. "Just someone who used to know mommy." I\'m a stranger to my own child.'
              }
            ]
          },    board: {
      mainWords: [
        'ALIMONY',
        'SETTLEMENT',
        'MORTGAGE',
        'SAVINGS',
        'COLLEGE',
        'SECURITY',
        'FENCE',
        'INSURANCE',
        'PAYMENT',
        'LEDGER',
        'HOME',
        'STABILITY'
      ],
      outlierWords: ['TARGET', 'PAYBACK', 'RETALIATE', 'THREAT']
    },
    clueSummaries: {
      main:
        'You found the REVENGE. Now read the journal to see how Jack uses it.',
      outliers: {
        TARGET: 'Marks the moment Thornhill aimed at Margaret instead of Jack.',
        PAYBACK: 'Connects the carjacking to revenge for a framed conviction.',
        RETALIATE: 'Shows how justice twisted back on the innocents in Jack’s orbit.',
        THREAT: 'Keeps the lingering danger in view every time the player clears a row.'
      }
    }
        
  },

  {
    id: 17,
    caseNumber: '006B',

    day: 6,
    title: "Jack's Choice",
    mainTheme: { name: 'LOYALTY', icon: '🤝' },
    outlierTheme: { name: 'ISOLATION', icon: '🌒' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: Margaret's house. White picket fence, vanilla candles. She was carjacked five years ago—Marcus Thornhill's revenge.
She told Jack she was terrified to leave the house. Divorced him because staying married was dangerous.
Emma ran in. Six years old. Doesn't know Jack exists. Margaret's built a life without him.`,
    briefing: {
        summary:
          'Sarah is considering the promotion. Find the words that describe the isolation she will face if she accepts.',
        objectives: [
          'Assess the social cost.',
          'Identify terms of solitude.',
          'Predict the loneliness.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '006B-murphys-booth',
                imageKey: 'voice',
                title: 'SARAH REEVES',
                subtitle: 'MURPHY\'S BAR',
                detail: 'She looked exhausted. Victoria offered her Deputy Director. "I\'m considering it. She\'s actually effective."'
              },
              {
                id: '006B-job-offer',
                imageKey: 'silence',
                title: 'JOB OFFER',
                subtitle: 'DEPUTY DIRECTOR',
                detail: 'Three times her salary. Real resources. Victoria was recruiting the only person who could actually stop her.'
              },
              {
                id: '006B-wade-case-box',
                imageKey: 'default',
                title: 'WADE EVIDENCE',
                subtitle: 'THE LEVERAGE',
                detail: 'I gave Sarah the proof Victoria killed Tom. "Use it. Burn her if she touches you." I chose Sarah over the game.'
              }
            ]
          },    board: {
      mainWords: [
        'BARSTOOL',
        'ULTIMATUM',
        'EVIDENCE',
        'PHONE',
        'OFFER',
        'SALARY',
        'BADGE',
        'ALLIES',
        'TRUST',
        'THREAT',
        'BARGAIN',
        'LINE'
      ],
      outlierWords: ['ALONE', 'EXILE', 'DISTANCE', 'SILENCE']
    },
    clueSummaries: {
      main:
        'You found the ISOLATION. Now read the journal to see how Jack uses it.',
      outliers: {
        ALONE: 'Warns that whichever path Sarah chooses leaves someone isolated.',
        EXILE: 'Foreshadows careers and friendships lost once Victoria reacts.',
        DISTANCE: 'Echoes the gap growing between partner and mentor.',
        SILENCE: 'Reminds players the only reply Victoria fears is the evidence Jack surrendered.'
      }
    }
        
  },

  {
    id: 18,
    caseNumber: '006C',

    day: 6,
    title: 'The Confirmation',
    mainTheme: { name: 'TRUTH', icon: '🕯️' },
    outlierTheme: { name: 'REVELATION', icon: '✨' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: Murphy's Bar at noon. Sarah exhausted, considering Victoria's job offer—Deputy Director, real resources.
Jack showed her Tom's murder evidence. Made a choice: threatened Victoria to protect Sarah.
Sarah forwarded it. Victoria backed down. Jack made an active move and won.`,
    briefing: {
        summary:
          'The official report calls it a \'cold case\'. Find the words that prove it was a calculated cover-up.',
        objectives: [
          'Expose the calculated cover-up.',
          'Identify terms of active concealment.',
          'Rewrite the official history.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '006C-silas-arraignment',
                imageKey: 'keeper',
                title: 'SILAS REED',
                subtitle: 'GUILTY PLEA',
                detail: 'He wept in open court. His family wouldn\'t look at him. I did that. I created the world where he broke.'
              },
              {
                id: '006C-emily-scar-study',
                imageKey: 'silence',
                title: 'VICTORIA / EMILY',
                subtitle: 'THE SCAR',
                detail: 'Above the left eyebrow. Same bone structure. Same eyes. Victoria Ashford is Emily Cross. The woman I declared dead.'
              },
              {
                id: '006C-cross-files',
                imageKey: 'default',
                title: 'CROSS FILE',
                subtitle: 'CLOSED TOO SOON',
                detail: 'I closed her case while she was being tortured. She survived. Rebuilt herself. And came back to teach me.'
              }
            ]
          },    board: {
      mainWords: [
        'COURTHOUSE',
        'ARRAIGNMENT',
        'PLEA',
        'FILE',
        'PHOTO',
        'SCAR',
        'BEAUTYMARK',
        'TIMELINE',
        'EVIDENCE',
        'PATTERN',
        'REALIZATION',
        'TRUTH'
      ],
      outlierWords: ['REVEAL', 'EPIPHANY', 'AWAKENING', 'VISION']
    },
    clueSummaries: {
      main:
        'You found the REVELATION. Now read the journal to see how Jack uses it.',
      outliers: {
        REVEAL: 'Signals the mask dropping when Jack says her name aloud.',
        EPIPHANY: 'Marks the shock that he closed the case while she was still alive.',
        AWAKENING: 'Shows Jack finally seeing what Emily wanted him to learn.',
        VISION: 'Captures the act of staring at photos until truth becomes undeniable.'
      }
    }
        
    },
    {
      id: 19,
      caseNumber: '007A',

      day: 7,
      title: 'The Gambit',
    mainTheme: { name: 'TRUTH', icon: '⚖️' },
    outlierTheme: { name: 'DECEPTION', icon: '🎭' },
    attempts: 4,
      dailyIntro:
        `PREVIOUSLY: Margaret's terror—Thornhill's revenge five years ago. Sarah leveraged Tom's evidence.
Jack laid photos side by side. Victoria Ashford is Emily Cross—the ghost he declared dead.
Everyone you love pays for crimes they didn't commit.`,
    briefing: {
        summary:
          'Victoria\'s evidence seems perfect. Find the words that show how she manufactured the timeline.',
        objectives: [
          'Deconstruct the timeline.',
          'Identify fabricated events.',
          'Expose the architect\'s hand.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '007A-appeals-chamber',
                imageKey: 'sparkle',
                title: 'APPEALS COURT',
                subtitle: 'THE GAMBIT',
                detail: 'I took the stand. Told them my word was worthless. Presented Victoria\'s evidence instead. "Believe the documents, not me."'
              },
              {
                id: '007A-exhibit-folder',
                imageKey: 'default',
                title: 'EXHIBIT A',
                subtitle: 'THE PROOF',
                detail: 'Receipts. Security footage. Everything Victoria gathered. Authentic. Irrefutable. The truth I was too lazy to find.'
              },
              {
                id: '007A-eleanor-freed',
                imageKey: 'sparkle',
                title: 'ELEANOR FREED',
                subtitle: 'CONVICTION OVERTURNED',
                detail: 'She walked out. Didn\'t thank me. Just acknowledged that I\'d finally done my job. Eight years too late.'
              }
            ]
          },    board: {
      mainWords: [
        'TESTIMONY',
        'EVIDENCE',
        'EXHIBIT',
        'AFFIDAVIT',
        'APPEAL',
        'RECESS',
        'RECORD',
        'TRANSCRIPT',
        'VERDICT',
        'WITNESS',
        'CREDIBILITY',
        'OBJECTION'
      ],
      outlierWords: ['FORGED', 'CONCEALED', 'SHELL', 'STAGED']
    },
    clueSummaries: {
      main:
        'You found the DECEPTION. Now read the journal to see how Jack uses it.',
      outliers: {
        FORGED: 'Calls out the fabricated records Jack once trusted.',
        CONCEALED: 'Highlights the evidence the prosecution buried eight years ago.',
        SHELL: 'Points to the corporations Victoria traced to expose the frame.',
        STAGED: 'Reminds the player that Richard’s murder scene was orchestrated.'
      }
    }
        
  },

  {
    id: 20,
    caseNumber: '007B',

    day: 7,
    title: "Sarah's Decision",
    mainTheme: { name: 'LOYALTY', icon: '🤝' },
    outlierTheme: { name: 'BETRAYAL', icon: '🗡️' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: Eleanor's appeal. Ten AM. Jack used Victoria's evidence—shell companies, security footage, credit cards.
Three-hour recess. Documents verified authentic. Motion granted. Eleanor freed after eight years.
Evidence beats testimony. Victoria's manipulation worked. Results matter more than Jack's pride.`,
    briefing: {
        summary:
          'Sarah left the force. Find the words that prove she didn\'t quit, but was recruiting.',
        objectives: [
          'Trace Sarah\'s movements.',
          'Identify recruitment terms.',
          'Reveal the new alliance.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '007B-sarah-packing',
                imageKey: 'voice',
                title: 'SARAH LEAVES',
                subtitle: 'PACKING BOXES',
                detail: 'She declined Victoria\'s offer. Declined me too. "I\'m a better detective than both of you."'
              },
              {
                id: '007B-integrity-roadmap',
                imageKey: 'lex',
                title: 'INTEGRITY PROJECT',
                subtitle: 'NEW TEAM',
                detail: 'Claire Thornhill. Lisa Chen. Eleanor Bellamy. Sarah\'s building an army from the people I destroyed.'
              },
              {
                id: '007B-shell-architect',
                imageKey: 'default',
                title: 'PRICE FIRM',
                subtitle: 'THE ARCHITECTS',
                detail: 'Sarah found the link. Geoffrey Price\'s law firm built Victoria\'s shell companies. Helen\'s father. The rot goes deep.'
              }
            ]
          },    board: {
      mainWords: [
        'PARTNER',
        'BADGE',
        'ALLY',
        'TRUST',
        'PROJECT',
        'FUNDING',
        'EVIDENCE',
        'NETWORK',
        'OFFICE',
        'BOXES',
        'RESIGN',
        'FUTURE'
      ],
      outlierWords: ['DEFECTION', 'SEVER', 'RECRUIT', 'LEVERAGE']
    },
    clueSummaries: {
      main:
        'You found the BETRAYAL. Now read the journal to see how Jack uses it.',
      outliers: {
        DEFECTION: 'Signals how Victoria tried to flip her with promises of power.',
        SEVER: 'Marks the break from Jack and the department.',
        RECRUIT: 'Points to the allies she brings into the Integrity Project.',
        LEVERAGE: 'Shows Sarah holds evidence against both Victoria and Jack if needed.'
      }
    }
        
  },

  {
    id: 21,
    caseNumber: '007C',

    day: 7,
    title: 'Alone',
    mainTheme: { name: 'ISOLATION', icon: '🌑' },
    outlierTheme: { name: 'ABSENCE', icon: '🚪' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: Sarah's office. Empty boxes. Shield on desk like evidence. She's been gone three days—just paperwork.
Ashport Conviction Integrity Project. Claire, Lisa, Eleanor. Building something real with people Jack destroyed.
Victoria offered Deputy Director. Sarah said no. She's a better detective than both of them.`,
    briefing: {
        summary:
          'The office feels empty. Find the words that define what is missing from your life.',
        objectives: [
          'Inventory the void.',
          'Identify terms of loss.',
          'Confront the silence.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '007C-empty-desk',
                imageKey: 'default',
                title: 'EMPTY DESK',
                subtitle: 'PARTNER GONE',
                detail: 'For the first time in eight years, her chair is empty. No backup. No conscience. Just me and the work.'
              },
              {
                id: '007C-stacked-files',
                imageKey: 'default',
                title: 'FIVE FILES',
                subtitle: 'INNOCENT VICTIMS',
                detail: 'Five people I framed. Five lives I need to fix. And now I have to do it alone.'
              },
              {
                id: '007C-day-seven-text',
                imageKey: 'silence',
                title: 'E.C. TEXT',
                subtitle: 'DAY SEVEN ENDS',
                detail: '"Truth without power is just noise." She signed it E.C. Emily Cross. She knows I know.'
              }
            ]
          },    board: {
      mainWords: [
        'OFFICE',
        'SILENCE',
        'FILE',
        'RAIN',
        'WHISKEY',
        'DESK',
        'CLOCK',
        'SHADOW',
        'WINDOW',
        'CASELOAD',
        'NIGHT',
        'WEIGHT'
      ],
      outlierWords: ['ABSENCE', 'VOID', 'VACANCY', 'ECHO']
    },
    clueSummaries: {
      main:
        'You found the ABSENCE. Now read the journal to see how Jack uses it.',
      outliers: {
        ABSENCE: 'Marks Sarah’s departure and the missing partnership.',
        VOID: 'Highlights the emotional crater left after the appeal.',
        VACANCY: 'Signals the empty chair opposite Jack’s desk.',
        ECHO: 'Leaves only the Confessor’s messages resonating in the silence.'
      }
    }
        
    },
    {
      id: 22,
      caseNumber: '008A',

      day: 8,
      title: 'Arrested',
    mainTheme: { name: 'TRUST NETWORK', icon: '🔗' },
    outlierTheme: { name: 'PAYOFF', icon: '💵' },
    attempts: 4,
    dailyIntro:
        `PREVIOUSLY: Eleanor freed with Victoria's evidence. Sarah packed boxes, building her project.
The people Jack destroyed, rebuilding without him. Sarah ahead now. Jack alone, partnerless.
Truth without power is just noise. Confessing doesn't equal redemption.`,
    briefing: {
        summary:
          'They say money talks. Find the paper trail that bought the silence of an entire department.',
        objectives: [
          'Follow the money.',
          'Identify bribes and payoffs.',
          'Link the funding to the silence.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '008A-fbi-at-dawn',
                imageKey: 'default',
                title: 'FBI RAID',
                subtitle: '6 AM ARREST',
                detail: 'They came for Tom Wade\'s murder. I knew they would. I went peacefully.'
              },
              {
                id: '008A-federal-holding',
                imageKey: 'keeper',
                title: 'NATHAN THORNHILL',
                subtitle: 'CELLMATE',
                detail: 'Marcus Thornhill\'s nephew. Nineteen. Serving twenty years. "You\'re that cop. You framed my uncle."'
              },
              {
                id: '008A-victoria-note',
                imageKey: 'default',
                title: 'HANDWRITTEN NOTE',
                subtitle: 'FROM VICTORIA',
                detail: '"Fight for it. They couldn\'t. You can." She gave me the resources to fight my own arrest. A lesson in privilege.'
              }
            ]
          },    board: {
      mainWords: [
        'ARREST',
        'WARRANT',
        'CELL',
        'LAWYER',
        'MOTION',
        'FILING',
        'AFFIDAVIT',
        'EVIDENCE',
        'NOTE',
        'NEPHEW',
        'SENTENCE',
        'HEARING'
      ],
      outlierWords: ['PAYOFF', 'BRIBED', 'LEVERAGE', 'INFLUENCE']
    },
    clueSummaries: {
      main:
        'You found the PAYOFF. Now read the journal to see how Jack uses it.',
      outliers: {
        PAYOFF: 'Points to how Victoria bankrolls the fight the innocent never could afford.',
        BRIBED: 'Hints at the corrupted system that kept Marcus Thornhill caged.',
        LEVERAGE: 'Shows Victoria weaponising resources to reshape outcomes.',
        INFLUENCE: 'Underscores the power imbalance between Jack and those he once framed.'
      }
    }
        
  },

  {
    id: 23,
    caseNumber: '008B',

    day: 8,
    title: 'Released',
    mainTheme: { name: 'POWER', icon: '🔌' },
    outlierTheme: { name: 'CONTROL', icon: '🎛️' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: FBI at Jack's door at 6 AM. Arrested for Tom's murder. Federal holding. Cellmate: Nathan Thornhill.
Victoria left a note—tools the innocent never had. Jack filed motions for thirty-six hours.
The system makes fighting so expensive most people can't. But Jack could. Because Victoria gave him resources.`,
    briefing: {
        summary:
          'You were released early. Find the words that prove this wasn\'t luck, but a calculated move.',
        objectives: [
          'Analyze the release order.',
          'Identify terms of manipulation.',
          'See the strings attached.'
        ]
      },
    
      evidenceBoard: {
        polaroids: [
          {
            id: '008B-release-order',
            imageKey: 'default',
            title: 'RELEASE ORDER',
            subtitle: '36 HOURS LATER',
            detail: 'I walked out. Charges dropped. Evidence "misplaced." Not because I was innocent. Because Victoria decided the lesson was over.'
          },
          {
            id: '008B-emily-message',
            imageKey: 'silence',
            title: 'EMILY CROSS',
            subtitle: 'THE LESSON',
            detail: 'She showed me the difference between victims who can\'t fight and victims who aren\'t allowed to fight.'
          },
          {
            id: '008B-missing-time',
            imageKey: 'default',
            title: 'LOST TIME',
            subtitle: 'THE COST',
            detail: 'Thirty-six hours. Nathan Thornhill has twenty years. I got a glimpse. He gets the life.'
          }
        ]
      },
    board: {
      mainWords: [
        'FOOTAGE',
        'TIMESTAMP',
        'ALIBI',
        'RELEASE',
        'GATE',
        'AIR',
        'PHONE',
        'MESSAGE',
        'CHOICE',
        'OFFER',
        'CONTROL',
        'POWER'
      ],
      outlierWords: ['PUPPET', 'STRINGS', 'MASTER', 'PERMISSION']
    },
    clueSummaries: {
      main:
        'You found the CONTROL. Now read the journal to see how Jack uses it.',
      outliers: {
        PUPPET: 'Shows Jack walking free only because Victoria allows it.',
        STRINGS: 'Calls out the invisible pull she maintains.',
        MASTER: 'Names the person really commanding the board.',
        PERMISSION: 'Reminds players the justice system moved only when she said so.'
      }
    }
        
  },

  {
    id: 24,
    caseNumber: '008C',

    day: 8,
    title: 'The Choice Ahead',
    mainTheme: { name: 'CHOICE', icon: '⚔️' },
    outlierTheme: { name: 'TEMPTATION', icon: '🍷' },
    attempts: 4,
    dailyIntro: ``,
    briefing: {
        summary:
          'Two paths lie ahead. Find the words that define the cost of the easy way out.',
        objectives: [
          'Weigh the options.',
          'Identify the price of submission.',
          'Calculate the cost of your soul.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '008C-forked-road',
                imageKey: 'default',
                title: 'FORKED ROAD',
                subtitle: 'TWO PATHS',
                detail: 'Join Victoria and watch corrupt justice work. Or refuse and watch the innocent suffer in procedural purgatory.'
              },
              {
                id: '008C-pending-cases',
                imageKey: 'default',
                title: 'FIVE FILES',
                subtitle: 'STILL WAITING',
                detail: 'Eleanor. Marcus. Lisa. James. Teresa. Their lives hang in the balance of my indecision. Four days left.'
              },
              {
                id: '008C-victoria-gallery',
                imageKey: 'silence',
                title: 'GALLERY INVITE',
                subtitle: 'PERFECT EVIDENCE',
                detail: 'Museum-quality paper. "A Retrospective Exhibition." Victoria wants me to see my career framed on a wall.'
              }
            ]
          },    board: {
      mainWords: [
        'OPTION',
        'ALLIANCE',
        'RESIST',
        'JOIN',
        'MORAL',
        'LEDGER',
        'BALANCE',
        'COST',
        'BENEFIT',
        'CLOCK',
        'PRESSURE',
        'DECISION'
      ],
      outlierWords: ['TEMPT', 'BARGAIN', 'SACRIFICE', 'SUBMISSION']
    },
    clueSummaries: {
      main:
        'You found the TEMPTATION. Now read the journal to see how Jack uses it.',
      outliers: {
        TEMPT: 'Signals the allure of joining the Confessor’s empire.',
        BARGAIN: 'Marks the price attached to every potential partnership.',
        SACRIFICE: 'Reminds Jack someone will pay no matter what he chooses.',
        SUBMISSION: 'Warns that accepting power may mean surrendering himself.'
      }
    }
        
    },
    {
      id: 25,
      caseNumber: '009A',

      day: 9,
      title: 'The Exhibition',
    mainTheme: { name: 'IDENTITY', icon: '💡' },
    outlierTheme: { name: 'UNKNOWN', icon: '❓' },
    attempts: 4,
    dailyIntro:
        `PREVIOUSLY: FBI took Jack for Tom's murder. Nathan Thornhill delivered Victoria's message—fight.
Thirty-six hours filing motions, learning powerlessness. Victoria released him. Eleanor's appeal processed.
Victoria could destroy Jack anytime. Making him live is worse.`,
    briefing: {
        summary:
          'The artist is hiding in plain sight. Find the words that describe the anonymity of the creator.',
        objectives: [
          'Profile the artist.',
          'Identify terms of mystery.',
          'Unmask the ghost.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '009A-gallery-entry',
                imageKey: 'default',
                title: 'THE GALLERY',
                subtitle: 'EXHIBIT A',
                detail: 'Eleanor\'s sapphire necklace. Displayed like a trophy. "How $200,000 bought eight years of innocence."'
              },
              {
                id: '009A-forged-reports',
                imageKey: 'sparkle',
                title: 'MRS. MARTINEZ',
                subtitle: 'THE MOTHER',
                detail: '"She looks like me." Lucia\'s mother stood by the photo. Eleven months her daughter screamed. I stopped looking.'
              },
              {
                id: '009A-empty-eyes',
                imageKey: 'silence',
                title: 'THE PORTRAIT',
                subtitle: 'EMPTY EYES',
                detail: 'Ten feet tall. Charcoal. My face. But the eyes were dead. "I painted this while I was held," she said.'
              }
            ]
          },    board: {
      mainWords: [
        'GALLERY',
        'EXHIBIT',
        'NECKLACE',
        'TIMELINE',
        'DOCUMENT',
        'PORTRAIT',
        'CONTRACT',
        'INVITATION',
        'SPOTLIGHT',
        'CURATOR',
        'PATRON',
        'ULTIMATUM'
      ],
      outlierWords: ['UNKNOWN', 'MYSTERY', 'QUESTION', 'MASK']
    },
    clueSummaries: {
      main:
        'You found the UNKNOWN. Now read the journal to see how Jack uses it.',
      outliers: {
        UNKNOWN: 'Points to the unanswered questions the exhibits force Jack to confront.',
        MYSTERY: 'Signals the secrets still hidden in Victoria’s narrative.',
        QUESTION: 'Challenges the certainty Jack once carried through each case.',
        MASK: 'Shows how the portrait reveals and conceals identity at once.'
      }
    }
        
  },

  {
    id: 26,
    caseNumber: '009B',

    day: 9,
    title: "Sarah's Bombshell",
    mainTheme: { name: 'GOVERNMENT', icon: '🏛️' },
    outlierTheme: { name: 'CORRUPTION', icon: '💵' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: The Lamplight Gallery. Five exhibits—five cases. Lucia Martinez's badge. Mrs. Martinez standing there.
Jack's portrait: ten feet tall, eyes empty. Victoria offered him Deputy Director. Join her empire.
Sarah in the corner. Making her choice. City Hall on fire. The city burns.`,
    briefing: {
        summary:
          'Sarah exposed the network. Find the financial terms that greased the wheels of the city\'s corruption.',
        objectives: [
          'Follow the bribes.',
          'Identify payment methods.',
          'Expose the graft.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '009B-city-hall',
                imageKey: 'default',
                title: 'CITY HALL',
                subtitle: 'FBI RAID',
                detail: 'Swarming with agents. Warrants executed. Records seized. The Price firm at the center of the web.'
              },
              {
                id: '009B-sarah-podium',
                imageKey: 'voice',
                title: 'SARAH REEVES',
                subtitle: 'THE PRESSER',
                detail: 'She stood at the podium. "Systematic corruption spanning two decades." She stole Victoria\'s narrative and made it justice.'
              },
              {
                id: '009B-helen-note',
                imageKey: 'lex',
                title: 'HELEN PRICE',
                subtitle: 'THE END',
                detail: 'Suicide note released by her lawyer. Fifteen pages of confession. She couldn\'t live with what her family built.'
              }
            ]
          },    board: {
      mainWords: [
        'PRESS',
        'WARRANT',
        'ARREST',
        'NETWORK',
        'LAW FIRM',
        'SHELL',
        'LEDGER',
        'FBI',
        'BURNING',
        'EVIDENCE',
        'PARTNER',
        'LEGITIMACY'
      ],
      outlierWords: ['BRIBE', 'KICKBACK', 'PAYOFF', 'BLACKMAIL']
    },
    clueSummaries: {
      main:
        'You found the CORRUPTION. Now read the journal to see how Jack uses it.',
      outliers: {
        BRIBE: 'Highlights the financial grease that kept the system running.',
        KICKBACK: 'Shows the favors traded through Price & Associates.',
        PAYOFF: 'Connects the corruption to quietly silenced cases.',
        BLACKMAIL: 'Reminds players how Victoria once leveraged the same secrets.'
      }
    }
        
  },

  {
    id: 27,
    caseNumber: '009C',

    day: 9,
    title: 'The Package',
    mainTheme: { name: 'TRAUMA', icon: '🩸' },
    outlierTheme: { name: 'REVELATION', icon: '✨' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: Sarah struck. FBI raids, twenty-three arrests. Helen Price dead—suicide. Marcus Webb testified finally.
Sarah stole Victoria's narrative. Made it legitimate prosecution. Became the hero of her own story.
Victoria called—furious, vulnerable. Sarah proved you don't need to become a monster to fight monsters.`,
    briefing: {
        summary:
          'The package contains a recording. Find the sequence of sounds that proves Emily was alive when you closed the case.',
        objectives: [
          'Listen to the timeline.',
          'Sequence the scream and the click.',
          'Reconstruct the betrayal.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '009C-blood-recorder',
                imageKey: 'default',
                title: 'THE RECORDER',
                subtitle: 'BLOODSTAINED',
                detail: 'Old. Scratched. Red ribbon. "Listen to what you couldn\'t find seven years ago."'
              },
              {
                id: '009C-ec-scrawl',
                imageKey: 'silence',
                title: 'EMILY CROSS',
                subtitle: 'THE TAPE',
                detail: 'Forty-seven days in. She begged for help. Then Grange played my voice closing her case. Then she screamed.'
              },
              {
                id: '009C-midnight-rain',
                imageKey: 'voice',
                title: 'SARAH REEVES',
                subtitle: 'THE WITNESS',
                detail: 'We sat in the dark. Listened to Emily scream. "She\'s not trying to destroy you," Sarah said. "She\'s trying to save you."'
              }
            ]
          },    board: {
      mainWords: [
        'PACKAGE',
        'RECORDER',
        'SCREAM',
        'VOICE',
        'CAPTIVITY',
        'TORTURE',
        'PHONECALL',
        'APOLOGY',
        'PROMISE',
        'RESPONSIBILITY',
        'PRISON',
        'REBUILD'
      ],
      outlierWords: ['CAPTURE', 'SCREAM', 'PHONECALL', 'SILENCE']
    },
    clueSummaries: {
      main:
        'You found the REVELATION. Now read the journal to see how Jack uses it.',
      outliers: { CAPTURE: 'The abduction event.', SCREAM: 'The sound on the tape.', PHONECALL: 'Jack\'s voice closing the case.', SILENCE: 'The end of the recording.' }
    }
        
    },
    {
      id: 28,
      caseNumber: '010A',

      day: 10,
      title: 'The Impossible Choice',
    mainTheme: { name: 'IDENTITY', icon: '🪞' },
    outlierTheme: { name: 'UNKNOWN', icon: '❓' },
    attempts: 4,
    dailyIntro:
        `PREVIOUSLY: Victoria's gallery. Mrs. Martinez at her daughter's photo. Victoria offered Deputy Director.
Sarah struck—FBI raids, Helen dead. The recording: Emily screaming, Jack's voice closing her case.
Understanding doesn't resurrect the dead. Sarah stole Victoria's endgame clean.`,
    briefing: {
        summary:
          'The law says one thing, your conscience another. Find the words that define the gap between them.',
        objectives: [
          'Define the moral conflict.',
          'Identify terms of duty vs humanity.',
          'Measure the cost of the law.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '010A-agent-martinez',
                imageKey: 'buyer',
                title: 'AGENT MARTINEZ',
                subtitle: 'THE CALL',
                detail: '"We\'re moving on Victoria Ashford at dawn." The FBI was ready. The evidence was piled high.'
              },
              {
                id: '010A-wade-evidence',
                imageKey: 'default',
                title: 'TOM\'S MURDER',
                subtitle: 'THE LEVERAGE',
                detail: 'I had the DNA. The rope fibers. The proof Victoria killed Tom. I could end it right now.'
              },
              {
                id: '010A-appeal-dockets',
                imageKey: 'default',
                title: 'FIVE DOCKETS',
                subtitle: 'THE INNOCENTS',
                detail: 'Eleanor. James. Lisa. Marcus. Teresa. Their freedom depended on Victoria\'s files remaining clean for 24 hours.'
              }
            ]
          },    board: {
      mainWords: [
        'PHONECALL',
        'WARRANT',
        'DEADLINE',
        'APPEAL',
        'DOSSIER',
        'CONFESSION',
        'ROPE',
        'DNA',
        'EVIDENCE',
        'MERCY',
        'JUSTICE',
        'MIDNIGHT'
      ],
      outlierWords: ['UNKNOWN', 'AMBIGUITY', 'GREY', 'PARADOX']
    },
    clueSummaries: {
      main:
        'You found the UNKNOWN. Now read the journal to see how Jack uses it.',
      outliers: {
        UNKNOWN: 'Highlights how neither option guarantees a righteous outcome.',
        AMBIGUITY: 'Keeps the moral fog front and centre for players.',
        GREY: 'Reminds that legal black-and-white fails here.',
        PARADOX: 'Names the conflicting truths Jack must hold at once.'
      }
    }
        
  },

  {
    id: 29,
    caseNumber: '010B',

    day: 10,
    title: 'The Decision',
    mainTheme: { name: 'MERCY', icon: '🕊️' },
    outlierTheme: { name: 'CHOICE', icon: '⚖️' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: Martinez called. FBI moving on Victoria at dawn. Eleanor's appeal tomorrow afternoon.
Jack had the choice: arrest Victoria now, five innocents stay convicted. Or wait twenty-four hours.
Justice or mercy. Punishment or salvation. No good answer. Four hours to decide.`,
    briefing: {
        summary:
          'Jack is torn between two duties. Isolate the four reasons to choose Mercy over Law.',
        objectives: [
          'Weigh the moral options.',
          'Identify concepts of forgiveness.',
          'Choose the path of mercy.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '010B-recorded-confession',
                imageKey: 'default',
                title: 'THE CHOICE',
                subtitle: 'OBSTRUCTION',
                detail: '"I\'m asking you to wait twenty-four hours." I told Martinez. I chose the five innocents over the one guilty.'
              },
              {
                id: '010B-twentyfour-deal',
                imageKey: 'silence',
                title: 'THE CALL',
                subtitle: 'TO VICTORIA',
                detail: '"Give me twenty-four hours of Emily, not Victoria." I warned her. Trusted her not to run.'
              },
              {
                id: '010B-five-case-files',
                imageKey: 'default',
                title: 'FIVE LIVES',
                subtitle: 'THE WAGER',
                detail: 'I bet my career, my freedom, and my soul on the hope that mercy was worth the risk.'
              }
            ]
          },    board: {
      mainWords: [
        'MERCY',
        'JUSTICE',
        'DELAY',
        'PROMISE',
        'TWENTYFOUR',
        'CONFIDENCE',
        'TRUST',
        'WARNING',
        'OUTCOME',
        'ARITHMETIC',
        'FREEDOM',
        'OBSTRUCTION'
      ],
      outlierWords: ['INNOCENT', 'SAVE', 'PROMISE', 'TRUST']
    },
    clueSummaries: {
      main:
        'You found the CHOICE. Now read the journal to see how Jack uses it.',
      outliers: { INNOCENT: 'The five lives at stake.', SAVE: 'The goal of the delay.', PROMISE: 'The vow to free them.', TRUST: 'The gamble on Victoria.' }
    }
        
  },

  {
    id: 30,
    caseNumber: '010C',

    day: 10,
    title: 'The Consequences',
    mainTheme: { name: 'CONSEQUENCE', icon: '📜' },
    outlierTheme: { name: 'SACRIFICE', icon: '🩸' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: Ten PM. Jack chose mercy. Called Martinez: wait twenty-four hours. Let appeals process first.
Called Victoria: warned her FBI was coming. Twenty-four hours of Emily, not Victoria. Don't make me regret this.
Victoria kept her promise. Didn't run. Jack chose five innocents over doing his job.`,
    briefing: {
        summary:
          'Every action has a reaction. Find the words that describe the price you must pay for doing the right thing.',
        objectives: [
          'Calculate the personal cost.',
          'Identify terms of sacrifice.',
          'Accept the burden.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '010C-exoneration-orders',
                imageKey: 'sparkle',
                title: 'ELEANOR FREED',
                subtitle: '2 PM APPEAL',
                detail: 'It worked. The evidence held. Eleanor walked out. James walked out. Lisa walked out.'
              },
              {
                id: '010C-fbi-testimony',
                imageKey: 'buyer',
                title: 'AGENT MARTINEZ',
                subtitle: 'THE CALL',
                detail: '"She didn\'t run." Martinez sounded shocked. Victoria stayed put. My gamble paid off.'
              },
              {
                id: '010C-emily-promise',
                imageKey: 'silence',
                title: 'EMILY CROSS',
                subtitle: 'PROMISE KEPT',
                detail: '"I\'m ready for arrest. Thank you for the impossible choice." She kept her word. She was Emily at the end.'
              }
            ]
          },    board: {
      mainWords: [
        'EXONERATION',
        'VACATED',
        'FREEDOM',
        'APOLOGY',
        'REUNION',
        'POSTHUMOUS',
        'OBSTRUCTION',
        'TESTIMONY',
        'ARRAIGNMENT',
        'DEFENSE',
        'PROMISE',
        'ACCOUNTABILITY'
      ],
      outlierWords: ['SACRIFICE', 'PENANCE', 'RECKONING', 'REDEMPTION']
    },
    clueSummaries: {
      main:
        'You found the SACRIFICE. Now read the journal to see how Jack uses it.',
      outliers: {
        SACRIFICE: 'Marks Jack giving up his freedom to free others.',
        PENANCE: 'Signals the personal cost he accepts.',
        RECKONING: 'Shows the justice system turning back on him.',
        REDEMPTION: 'Hints that consequence might finally heal what certainty broke.'
      }
    }
        
    },
    {
      id: 31,
      caseNumber: '011A',

      day: 11,
      title: 'FBI Headquarters',
    mainTheme: { name: 'RESOLUTION', icon: '🪧' },
    outlierTheme: { name: 'MYSTERY', icon: '🕵️' },
    attempts: 4,
    dailyIntro:
      `PREVIOUSLY: The impossible choice. Jack told Martinez: wait twenty-four hours. Five innocents or one guilty.
By 5 PM: all five freed. Jack gave FBI everything, accepted obstruction charges. Victoria kept her promise.
Some choices are between legal and right. Sometimes those are mutually exclusive.`,
    briefing: {
        summary:
          'The case is closing, but the story isn\'t over. Find the words that admit what remains unfinished.',
        objectives: [
          'Identify unresolved threads.',
          'Acknowledge the unknown.',
          'Face the mystery.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '011A-fbi-interview',
                imageKey: 'buyer',
                title: 'FBI ROOM',
                subtitle: 'THE CONFESSION',
                detail: 'I gave them everything. The gun. The badge. The truth. "I prioritized outcome over procedure."'
              },
              {
                id: '011A-wade-evidence',
                imageKey: 'default',
                title: 'WADE FILE',
                subtitle: 'EVIDENCE LOG',
                detail: 'DNA. Rope fibers. Victoria\'s confession tape. The case against her was airtight. I handed it over.'
              },
              {
                id: '011A-ec-exchange',
                imageKey: 'silence',
                title: 'EMILY TEXT',
                subtitle: 'ONE LAST REQUEST',
                detail: '"Come say goodbye." She wanted one last meeting. Before prison. Before the end.'
              }
            ]
          },    board: {
      mainWords: [
        'TESTIMONY',
        'TRANSCRIPT',
        'RECORDER',
        'WARRANT',
        'EVIDENCE',
        'DNA',
        'ROPE',
        'COUNTS',
        'MARTINEZ',
        'CONFESSION',
        'OBSTRUCTION',
        'CHOICE'
      ],
      outlierWords: ['MYSTERY', 'UNKNOWN', 'UNWRITTEN', 'UNFINISHED']
    },
    clueSummaries: {
      main:
        'You found the MYSTERY. Now read the journal to see how Jack uses it.',
      outliers: {
        MYSTERY: 'Reminds players Victoria still holds secrets even as charges fall.',
        UNKNOWN: 'Signals the uncertain verdict awaiting Jack.',
        UNWRITTEN: 'Points to the story Day Twelve will finish.',
        UNFINISHED: 'Shows justice is still in progress despite resolutions.'
      }
    }
        
  },

  {
    id: 32,
    caseNumber: '011B',

    day: 11,
    title: 'Waiting',
    mainTheme: { name: 'TRUST', icon: '🤝' },
    outlierTheme: { name: 'REDEMPTION', icon: '🕯️' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: Jack at FBI headquarters. Gave them everything. Tom's murder evidence. Victoria's operation. The twenty-four hour delay.
Martinez charged him with obstruction. But all five innocents freed by 5 PM. Eleanor, James, Lisa, Marcus, Teresa.
Jack chose five innocents over one guilty. Even if it destroyed him. Especially if it destroyed him.`,
    briefing: {
        summary:
          'The night is long. Find the words that offer a path to forgiveness in the dark.',
        objectives: [
          'Search for redemption.',
          'Identify terms of grace.',
          'Find the light.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '011B-margaret-call',
                imageKey: 'sparkle',
                title: 'MARGARET CALL',
                subtitle: 'PRIDE AND FEAR',
                detail: '"You chose them over yourself." She understood. For the first time in years, she was proud.'
              },
              {
                id: '011B-integrity-plan',
                imageKey: 'voice',
                title: 'SARAH TEXT',
                subtitle: 'LEGAL DEFENSE',
                detail: 'Rebecca Moss will represent me. Necessity defense. "What you did was heroic." Sarah never gave up on me.'
              },
              {
                id: '011B-emily-rain',
                imageKey: 'silence',
                title: 'EMILY CROSS',
                subtitle: 'THE RAIN',
                detail: '2 AM. Jeans and sweatshirt. No mask. "I needed you to see something." She was finally just herself.'
              }
            ]
          },    board: {
      mainWords: [
        'MIDNIGHT',
        'RAIN',
        'PROMISE',
        'TRUST',
        'COFFEE',
        'LAWYER',
        'DEFENSE',
        'TEXT',
        'VISIT',
        'DOORBELL',
        'EMILY',
        'GOODBYE'
      ],
      outlierWords: ['REDEMPTION', 'GRACE', 'HUMANITY', 'FORGIVENESS']
    },
    clueSummaries: {
      main:
        'You found the REDEMPTION. Now read the journal to see how Jack uses it.',
      outliers: {
        REDEMPTION: 'Marks how the night lets both Jack and Emily reach for better selves.',
        GRACE: 'Signals the compassion extended by Margaret and Sarah.',
        HUMANITY: 'Shows Victoria shedding the mask long enough to be Emily.',
        FORGIVENESS: 'Hints that healing may follow consequence.'
      }
    }
        
  },

  {
    id: 33,
    caseNumber: '011C',

    day: 11,
    title: 'Dawn',
    mainTheme: { name: 'ACCOUNTABILITY', icon: '⚖️' },
    outlierTheme: { name: 'SACRIFICE', icon: '🩸' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: That night Jack waited. Margaret called—proud and terrified. Sarah texted about Rebecca Moss.
At 2 AM Victoria appeared—not the penthouse predator. Hair down, jeans, Emily for the first time.
She needed him to see Emily once last time. At dawn FBI arrested her. She went peacefully.`,
    briefing: {
        summary:
          'The sun rises on a new world. Find the words that demand a reckoning for the old one.',
        objectives: [
          'Assess the debt.',
          'Identify terms of accountability.',
          'Demand payment.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '011C-necessity-notes',
                imageKey: 'default',
                title: 'LEGAL STRATEGY',
                subtitle: 'NECESSITY DEFENSE',
                detail: 'Rebecca Moss: "You chose the lesser harm." Eleanor, James, and Lisa prepared to testify for me.'
              },
              {
                id: '011C-sarah-support',
                imageKey: 'voice',
                title: 'SARAH REEVES',
                subtitle: 'THE RIDE',
                detail: 'She drove me to the courthouse. 8:30 AM. "When you get out, you work with us." A future, waiting.'
              },
              {
                id: '011C-emily-dawn-message',
                imageKey: 'silence',
                title: 'EMILY TEXT',
                subtitle: 'THE FAREWELL',
                detail: '"See you in twelve years." She was ready. Arrested at dawn. Peaceful. Human.'
              }
            ]
          },    board: {
      mainWords: [
        'ARRAIGNMENT',
        'DEFENSE',
        'NECESSITY',
        'TESTIMONY',
        'WITNESS',
        'PLEA',
        'PROMISE',
        'ARREST',
        'COURTHOUSE',
        'SENTENCE',
        'ACCOUNTABILITY',
        'COURAGE'
      ],
      outlierWords: ['SACRIFICE', 'PENANCE', 'RECKONING', 'FUTURE']
    },
    clueSummaries: {
      main:
        'You found the SACRIFICE. Now read the journal to see how Jack uses it.',
      outliers: {
        SACRIFICE: 'Marks Jack and Emily accepting the cost of their choices.',
        PENANCE: 'Signals the years they expect to serve.',
        RECKONING: 'Shows the justice system finally turning on its architects.',
        FUTURE: 'Hints that change is still possible after consequences.'
      }
    }
        
    },
    {
      id: 34,
      caseNumber: '012A',

      day: 12,
      title: 'Day Twelve',
    mainTheme: { name: 'RESOLUTION', icon: '🪧' },
    outlierTheme: { name: 'UNANSWERED', icon: '❓' },
    attempts: 4,
    dailyIntro:
      `PREVIOUSLY: Jack confessed obstruction at FBI. Sarah offered defense. At 2 AM, Victoria appeared—Emily now, not the predator.
They stood inches apart. Two damaged people in wreckage. Emily left to face arrest. Kept her promise.
Some endings are just acknowledgments that being seen matters.`,
    briefing: {
        summary:
          'The warehouse is full of ghosts. Find the four objects that will determine if Victoria lives or dies.',
        objectives: [
          'Survey the scene.',
          'Locate the weapon.',
          'Determine the ending.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '012A-warehouse-floor',
                imageKey: 'default',
                title: 'THE WAREHOUSE',
                subtitle: 'FINAL SCENE',
                detail: 'Rain on the roof. Concrete floor. The place where Tom died. Where Victoria was born. Where Emily returned.'
              },
              {
                id: '012A-unloaded-revolver',
                imageKey: 'default',
                title: 'THE GUN',
                subtitle: 'EMPTY CHAMBER',
                detail: 'I gave her the choice. But I removed the bullets. Protecting her from becoming a killer one last time.'
              },
              {
                id: '012A-burned-contract',
                imageKey: 'silence',
                title: 'EMILY CROSS',
                subtitle: 'THE TEARS',
                detail: 'She pulled the trigger. Click. Then she cried. Laughed. And finally let Victoria go.'
              }
            ]
          },    board: {
      mainWords: [
        'WAREHOUSE',
        'TRIGGER',
        'REVENGE',
        'HEALING',
        'RAIN',
        'GUN',
        'CONFESSION',
        'TRUST',
        'EMPIRE',
        'MONSTER',
        'EMILY',
        'MOVE'
      ],
      outlierWords: ['GUN', 'BULLET', 'TRIGGER', 'EMPTY']
    },
    clueSummaries: {
      main:
        'You found the UNANSWERED. Now read the journal to see how Jack uses it.',
      outliers: { GUN: 'The weapon of choice.', BULLET: 'What was missing.', TRIGGER: 'The final decision.', EMPTY: 'The truth revealed.' }
    }
        
  },

  {
    id: 35,
    caseNumber: '012B',

    day: 12,
    title: 'Aftermath',
    mainTheme: { name: 'LEGACY', icon: '🏛️' },
    outlierTheme: { name: 'FREEDOM', icon: '🕊️' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: The warehouse. Jack placed a gun between them. Gave Victoria the choice—monster or person.
She picked it up. Aimed. Pulled the trigger. Empty. He'd stacked the deck to protect her.
Victoria laughed and cried. Jack called Sarah. Ready to confess, turn himself in, face consequences.`,
    briefing: {
        summary:
          'The end of the road. Find the words that describe life after the case.',
        objectives: [
          'Look beyond the immediate crisis.',
          'Identify terms of legacy.',
          'Decide what comes next.'
        ]
      },
    
          evidenceBoard: {
            polaroids: [
              {
                id: '012B-lucia-countdown',
                imageKey: 'sparkle',
                title: 'LUCIA CARD',
                subtitle: 'YEAR SEVEN',
                detail: 'Mrs. Martinez sent it. 5,113 days. A reminder that understanding doesn\'t resurrect the dead.'
              },
              {
                id: '012B-dismissed-ledger',
                imageKey: 'lex',
                title: 'LISA CHEN',
                subtitle: 'THE PAPER',
                detail: '"The Halloway Effect." She published a paper on my corruption. It\'s brilliant. And accurate.'
              },
              {
                id: '012B-prison-letters',
                imageKey: 'voice',
                title: 'SARAH LETTER',
                subtitle: 'YEAR THREE',
                detail: '"You taught me how to be a bad detective. I\'m using that to be a good one." She fixed everything I broke.'
              }
            ]
          },    board: {
      mainWords: [
        'PRISON',
        'LETTER',
        'FOUNDATION',
        'PROGRAM',
        'LAW',
        'SUICIDE',
        'VISIT',
        'CARD',
        'ARTICLE',
        'STATISTIC',
        'LEGACY',
        'REFORM'
      ],
      outlierWords: ['FREEDOM', 'SPITE', 'GRIEF', 'ABSENCE']
    },
    clueSummaries: {
      main:
        'You found the FREEDOM. Now read the journal to see how Jack uses it.',
      outliers: {
        FREEDOM: 'Marks the lives reclaimed even as the pain lingers.',
        SPITE: 'Captures James Sullivan channeling anger into change.',
        GRIEF: 'Keeps Lucia and Teresa’s losses front and centre.',
        ABSENCE: 'Echoes the silence from people who never wrote back.'
      }
    }
        
  },

  {
    id: 36,
    caseNumber: '012C',

    day: 12,
    title: 'Release',
    mainTheme: { name: 'SECOND CHANCE', icon: '♻️' },
    outlierTheme: { name: 'UNCERTAINTY', icon: '❔' },
    attempts: 4,
    dailyIntro: `PREVIOUSLY: Seven years inside. Forty-eight to fifty-five. Eleanor remarried, never forgave. Marcus Webb in Paris.
Mrs. Martinez sent cards—days Lucia would still be alive. Lisa wrote papers. James started Second Look.
Sarah freed forty-three innocents. Victoria vanished—warehouse burned, crossed to Canada. Gone or rebuilt.`,
    briefing: {
        summary:
          'The future is unwritten. Find the words that express doubt and possibility.',
        objectives: [
          'Contemplate the unknown.',
          'Identify terms of chance.',
          'Step into the future.'
        ]
      },
    
    evidenceBoard: {
      polaroids: [
        {
          id: '012C-integrity-vote',
          imageKey: 'harborPrecinct',
          title: 'Integrity Commission Vote',
          subtitle: 'Four to three in Jack\'s favor',
          detail: ''
        },
        {
          id: '012C-fallen-king',
          imageKey: 'blackEnvelope',
          title: 'Fallen White King',
          subtitle: 'Chess piece waiting on Jack\'s desk',
          detail: ''
        },
        {
          id: '012C-coffee-napkin',
          imageKey: 'blackEnvelope',
          title: 'Coffee Shop Napkin',
          subtitle: 'Emma Reeves? scribbled invitation',
          detail: ''
        }
      ]
    },
    board: {
      mainWords: [
        'RELEASE',
        'PROBATION',
        'DESK',
        'OVERSIGHT',
        'INTEGRITY',
        'VOTE',
        'NAPKIN',
        'KING',
        'CASELOAD',
        'FOLDER',
        'PROJECT',
        'MOVE'
      ],
      outlierWords: ['UNCERTAINTY', 'SECONDCHANCE', 'TRUCE', 'ECHO']
    },
    clueSummaries: {
      main:
        'You found the UNCERTAINTY. Now read the journal to see how Jack uses it.',
      outliers: {
        UNCERTAINTY: 'Says tomorrow is unwritten even after redemption efforts.',
        SECONDCHANCE: 'Marks the fragile opportunity Sarah and the others grant him.',
        TRUCE: 'Hints at the uneasy alliances inside the project.',
        ECHO: 'Leaves room for Emma’s quiet presence in the world.'
      }
    }
        
  }
];

const mergeBranchingMeta = (caseData) => {
  const meta = BRANCHING_OUTLIER_SETS[caseData.caseNumber];
  if (!meta) {
    return caseData;
  }
  const sets = Array.isArray(meta.sets) ? meta.sets : [];
  if (!sets.length && meta.attempts == null) {
    return caseData;
  }
  const branchingSets = sets.map((set, index) => {
    const normalizedWords = Array.from(
      new Set((set.words || []).map((word) => String(word).toUpperCase())),
    );
    const theme = set.theme
      ? {
          name: set.theme.name || null,
          icon: set.theme.icon || null,
          summary: set.theme.summary || null
        }
      : null;
    return {
      key: set.optionKey || set.key || String.fromCharCode(65 + index),
      optionKey: set.optionKey || set.key || String.fromCharCode(65 + index),
      label: set.label || null,
      words: normalizedWords,
      theme,
      descriptions: set.descriptions || {}
    };
  });
  const dedupedWords = Array.from(
    new Set(
      branchingSets.flatMap((set) => set.words),
    ),
  );
  const board = caseData.board || {};
  const branchingSetsForBoard = branchingSets.length
    ? branchingSets.map(({ descriptions, ...rest }) => rest)
    : [];
  const updatedBoard =
    branchingSets.length > 0
      ? {
          ...board,
          outlierWords: dedupedWords.length ? dedupedWords : board.outlierWords,
          branchingOutlierSets: branchingSetsForBoard
        }
      : board;
  let clueSummaries = caseData.clueSummaries || null;
  if (branchingSets.length > 0) {
    const outlierWordSet = new Set(dedupedWords.map((word) => String(word).toUpperCase()));
    const filteredOutliers = {};
    const baseOutliers = caseData.clueSummaries?.outliers || {};
    Object.entries(baseOutliers).forEach(([word, detail]) => {
      if (!word || !detail) return;
      if (outlierWordSet.has(String(word).toUpperCase())) {
        filteredOutliers[word] = detail;
      }
    });
    branchingSets.forEach((set) => {
      Object.entries(set.descriptions || {}).forEach(([word, detail]) => {
        if (!word || !detail) return;
        if (outlierWordSet.has(String(word).toUpperCase())) {
          filteredOutliers[word] = detail;
        }
      });
    });
    clueSummaries = {
      ...(caseData.clueSummaries || {}),
      outliers: filteredOutliers
    };
  }
  const branchingThemeMeta = branchingSets
    .map((set) => {
      if (!set.theme) return null;
      return {
        key: set.optionKey || set.key,
        optionKey: set.optionKey || set.key,
        name: set.theme.name,
        icon: set.theme.icon,
        summary: set.theme.summary
      };
    })
    .filter(Boolean);
  return {
    ...caseData,
    attempts: meta.attempts ?? caseData.attempts,
    board: updatedBoard,
    clueSummaries: clueSummaries || caseData.clueSummaries,
    branchingOutlierThemes: branchingThemeMeta.length ? branchingThemeMeta : caseData.branchingOutlierThemes || null
  };
};

export const SEASON_ONE_CASES = RAW_SEASON_ONE_CASES.map(mergeBranchingMeta);

export const SEASON_ONE_CASE_COUNT = SEASON_ONE_CASES.length;
