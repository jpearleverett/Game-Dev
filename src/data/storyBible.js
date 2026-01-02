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
    anchorDate: 'November 14, 2025', // Present day anchor - story begins on this date
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
    tone: 'Modern detective thriller with classic aesthetics',
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
    perspective: 'Third person limited (close on Jack Halloway)',
    tense: 'Past tense',
    tone: 'Literary crime fiction, psychologically rich, elegiac',
  },

  influences: [
    'Dennis Lehane (trauma echoing through time, working-class authenticity, grief as undercurrent)',
    'Tana French (atmospheric dread, psychological interiority, the past haunting the present)',
    'Kate Atkinson (structural complexity, dark wit beneath sorrow)',
    'Richard Price (dialogue that reveals class and character, institutional rot)',
  ],

  mustInclude: [
    'Atmospheric descriptions rooted in place and weather',
    'Deep psychological interiority revealing Jack\'s guilt and fractured self-perception',
    'Sensory details that trigger memory and emotion (sounds, smells, textures)',
    'Dialogue that reveals character, class, and unspoken history',
    'The weight of the past pressing on present moments',
    'Trauma expressed through behavior rather than explanation',
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
    'Summarizing dialogue (if conversation changes plot, write it in full direct dialogue - never "They talked for hours")',
    'Explaining character emotions directly (show through action and physical response, not narration)',
  ],
};

// ============================================================================
// EXAMPLE PASSAGES - For Few-Shot Learning
// ============================================================================
export const EXAMPLE_PASSAGES = {
  atmosphericOpening: `When Sean Devine and Jimmy Marcus were kids, their fathers worked together at the Coleman Candy plant and carried the stench of warm chocolate back home with them. It became a permanent character of their clothes, the beds they slept in, the vinyl backs of their car seats. Sean's kitchen smelled like a Fudgsicle, his bathroom like a Coleman Chew-Chew bar. By the time they were eleven, Sean and Jimmy had developed a hatred of sweets so total that they took their coffee black for the rest of their lives and never ate dessert.

On Saturdays, Jimmy's father would drop by the Devines' to have a beer with Sean's father. He'd bring Jimmy with him, and as one beer turned into six, plus two or three shots of Dewar's, Jimmy and Sean would play in the backyard, sometimes with Dave Boyle, a kid with girl's wrists and weak eyes who was always telling jokes he'd learned from his uncles. From the other side of the kitchen window screen, they could hear the hiss of the beer can pull-tabs, bursts of hard, sudden laughter, and the heavy snap of Zippos as Mr. Devine and Mr. Marcus lit their Luckys.`,

  dialogueExample: `"Sean sat on the back porch with Annabeth Marcus as she took tiny
sips from a glass of white wine and smoked her cigarettes no more than
halfway before she'd extinguish them, her face lit by the exposed bulb
above them. It was a strong face, never pretty probably, but always striking.
She was not unused to being stared at, Sean guessed, and yet she was
probably oblivious as to why she was worth the trouble. She reminded Sean
a bit of Jimmy's mother but without the air of resignation and defeat, and
she reminded Sean of his own mother in her complete and effortless self-
possession, reminded him of Jimmy, actually, in that way, as well. He could
see Annabeth Marcus as being a fun woman, but never a frivolous one.
"So," she said to Sean as he lit a cigarette for her, "what are you doing
with your evening after you're released from comforting me?"
 "I'm not— "
 She waved it away. "I appreciate it. So what're you doing?"
 "Going to see my mother."
"Really?"
 He nodded. "It's her birthday. Go celebrate it with her and the old man."
 "Uh-huh," she said. "And how long have you been divorced?"
 "It shows?"
 "You wear it like a suit."
 "Ah. Separated, actually, for a bit over a year."
 "She live here?"
 "Not anymore. She travels."
 "You said that with acid. 'Travels.'"
 "Did I?" He shrugged.
She held up a hand. "I hate to keep doing this to you— getting my mind
off Katie at your expense. So you don't have to answer any of my questions.
I'm just nosy, and you're an interesting guy."
He smiled. "No, I'm not. I'm actually very boring, Mrs. Marcus. You take
away my job, and I disappear."
 "Annabeth," she said. "Call me that, would you?"
 "Sure."
"I find it hard to believe, Trooper Devine, that you're boring. You know
what's odd, though?"
 "What's that?"
She turned in her chair and looked at him. "You don't strike me as the
kind of guy who'd give someone phantom tickets."
 "Why's that?"
 "It seems childish," she said. "You don't seem like a childish man."
Sean shrugged. In his experience, everyone was childish at one time or
another. It's what you reverted to, particularly when the shit piled up.
In more than a year, he'd never spoken to anyone about Lauren— not his
parents, his few stray friends, not even the police psychologist the
commander had made a brief and pointed mention of once Lauren's moving
out had become common knowledge around the barracks. But here was
Annabeth, a stranger who'd suffered a loss, and he could feel her probing
for his loss, needing to see it or share it or something along those lines,
needing to know, Sean figured, that she wasn't being singled out.
"My wife's a stage manager," he said quietly. "For road shows, you
know? Lord of the Dance toured the country last year— my wife stage-
managed. That sort of thing. She's doing one now— Annie Get Your Gun,
maybe. I'm not sure, to tell you the truth. Whatever they're recycling this
year. We were a weird couple. I mean, our jobs, right, how further apart can
you get?"
 "But you loved her," Annabeth said.
He nodded. "Yeah. Still do." He took a breath, leaning back in his chair
and sucking it down. "So the guy I gave the tickets to, he was…" Sean's
mouth went dry and he shook his head, had the sudden urge to just get the
hell off this porch and out of this house.
 "He was a rival?" Annabeth said, her voice delicate.
Sean took a cigarette from the pack and lit one, nodding. "That's a nice
word for it. Yeah, we'll say that. A rival. And my wife and I, we were going
through some shit for a while. Neither of us was around much, and so on.
And this, uh, rival— he moved in on her."
 "And you reacted badly," Annabeth said. A statement, not a question.
Sean rolled his eyes in her direction. "You know anyone who reacts
well?"
Annabeth gave him a hard look, one that seemed to suggest that sarcasm
was below him, or maybe just something she wasn't fan of in general.
 "You still love her, though."
"Sure. Hell, I think she still loves me." He stubbed out his cigarette. "She
calls me all the time. Calls me and doesn't talk."
 "Wait, she— "
 "I know," he said.
 "— calls you up and doesn't say a word?"
 "Yup. Been going on for about eight months now."
Annabeth laughed. "No offense, but that's the weirdest thing I've heard in
a while."
"No argument." He watched a fly dart in and away from the bare
lightbulb. "One of these days, I figure, she's gotta talk. That's what I'm
holding out for."
He heard his half-assed chuckle die in the night and the echo of it
embarrassed him. So they sat in silence for a bit, smoking, listening to the
buzz of the fly as it made its crazy darts toward the light.
"What's her name?" Annabeth asked. "This whole time, you've never
once said her name."
 "Lauren," he said. "Her name's Lauren."
 Her name hung in the air for a bit like the loose strand of a cobweb.
"And you loved her since you were kids?”
"Freshman year of college," he said. "Yeah, I guess we were kids."
He could remember a November rainstorm, the two of them kissing for
the first time in a doorway, the feel of goose bumps on her flesh, both of
them shaking.
 "Maybe that's the problem," Annabeth said.
 Sean looked at her. "That we're not kids anymore?"
 "One of you, at least," she said.
 Sean didn't ask which one.
"Jimmy told me you said Katie was planning to elope with Brendan
Harris."
 Sean nodded.
 "Well, that's just it, isn't it?"
 He turned in his chair. "What?"
She blew a stream of smoke up at the empty clotheslines. "These silly
dreams you have when you're young. I mean, what, Katie and Brendan
Harris were going to make a life in Las Vegas? How long would that little
Eden have lasted? Maybe they'd be on their second trailer park, second kid,
but it would hit them sooner or later— life isn't happily ever after and
golden sunsets and shit like that. It's work. The person you love is rarely
worthy of how big your love is. Because no one is worthy of that and
maybe no one deserves the burden of it, either. You'll be let down. You'll be
disappointed and have your trust broken and have a lot of real sucky days.
You lose more than you win. You hate the person you love as much as you
love him. But, shit, you roll up your sleeves and work— at everything—
because that's what growing older is."
 "Annabeth," Sean said, "anyone ever tell you that you're a hard woman?"
She turned her head to him, her eyes closed, a dreamy smile on her face.
"All the time."`,

  internalMonologue: `The first night Jimmy spent at Deer Island Correctional, he'd sat up all night, from nine to six, wondering if his cellmate would come for him. The guy had been a New Hampshire biker named Woodrell Daniels who'd crossed into Massachusetts one night on a methamphetamine deal, stopped in a bar for several whiskey nightcaps, and ended up blinding a guy with a pool stick. Woodrell Daniels was a big meat slab of a man covered in tattoos and knife scars, and he'd looked at Jimmy and let loose this dry whisper of a chuckle that went through Jimmy's heart like a length of pipe.

"We'll see you later," Woodrell said at lights-out. "We'll see you later," he repeated, and let loose another of those whispery chuckles.

So Jimmy stayed up all night, listening for sudden creaks in the bunk above him, knowing he'd have to go for Woodrell's trachea if it came down to it, and wondering if he'd be capable of getting one good punch through Woodrell's massive arms. Hit the throat, he told himself. Hit the throat, hit the throat, hit the throat, oh Jesus, here he comes...

But it was just Woodrell rolling over in his sleep, creaking those springs, the weight of his body bulging down through the mattress until it hung over Jimmy like the belly of an elephant.

Jimmy heard the prison as a living creature that night. A breathing engine. He heard rats fighting and chewing and screeching with a mad, high-pitched desperation. He heard whispers and moans and the seesaw creak of bedsprings going up and down, up and down. Water dripped and men talked in their sleep and a guard's shoes echoed from a distant hall. At four, he heard a scream, just one, that died so fast it lived longer in echo and memory than it ever had in reality, and Jimmy, at that moment, considered taking the pillow from under his head and pressing it to his own face.`,

  tenseMoment: `The beefy one crooked a finger at them, then wiggled it toward his chest until they stood in front of him. "Let me ask you something, okay?" He bent at his big belly and his huge head filled Sean's vision. "You guys think it's okay to fight in the middle of the street?"

Sean noticed a gold badge clipped to the belt buckle beside the big man's right hip.

"What's that?" The cop cupped a hand behind his ear.

"No, sir."

"No, sir."

"No, sir."

"A pack of punks, huh? That what you are?" He jerked his big thumb back at the man in the passenger seat. "Me and my partner, we've had our fill of you East Bucky punks scaring decent people off the street. You know?"

Sean and Jimmy didn't say anything.

"We're sorry," Dave Boyle said, and looked like he was about to cry.

"You kids from this street?" the big cop asked. His eyes scanned the homes on the left side of the street like he knew every occupant, would bag them if they lied.

"Yup," Jimmy said, and looked back over his shoulder at Sean's house.

"Yes, sir," Sean said.

Dave didn't say anything.

The cop looked down at him. "Huh? You say something, kid?"

"What?" Dave looked at Jimmy.

"Don't look at him. Look at me." The big cop breathed loudly through his nostrils. "You live here, kid?"

"Huh? No."

"No?" The cop bent over Dave. "Where you live, son?"

"Rester Street." Still looking at Jimmy.

"Flats trash in the Point?" The cop's cherry-red lips swiveled as if he were sucking a lollipop. "That can't be good for business, can it?"`,

  decisionSetup: `Jimmy looked up the street. "You know anyone on this street who leaves their keys in their car?"

Sean did. Mr. Griffin left them under the seat, and Dottie Fiore left them in her glove compartment, and Old Man Makowski, the drunk who listened to Sinatra records too loud all hours of the day and night, left them in the ignition most times.

But as he followed Jimmy's gaze and picked out the cars that he knew held keys, Sean felt a dull ache grow behind his eyes, and in the hard sunlight bouncing off the trunks and hoods, he could feel the weight of the street, its homes, the entire Point and its expectations for him. He was not a kid who stole cars. He was a kid who'd go to college someday, make something of himself that was bigger and better than a foreman or a truck loader. That was the plan, and Sean believed that plans worked out if you were careful, if you were cautious. It was like sitting through a movie, no matter how boring or confusing, until the end. Because at the end, sometimes things were explained or the ending itself was cool enough that you felt like sitting through all the boring stuff had been worth it.

He almost said this to Jimmy, but Jimmy was already moving up the street, looking in car windows, Dave running alongside him.`,

  // ========== NEW A+ QUALITY EXAMPLES ==========

  characterConfrontation: `Dave looked at Jimmy and then at Sean. His arm shot out awkwardly and hit Sean's shoulder. "Yeah, how come you don't want to do fun things?"

Sean couldn't believe Dave had just hit him. Dave.

He punched Dave in the chest, and Dave sat down.

Jimmy pushed Sean. "What the hell you doing?"

"He hit me," Sean said.

"He didn't hit you," Jimmy said.

Sean's eyes widened in disbelief and Jimmy's mimicked them.

"He hit me."

"He hit me," Jimmy said in a girl's voice, and pushed Sean again. "He's my fucking friend."

"So am I," Sean said.

"So am I," Jimmy said. "So am I, so am I, so am I."

Dave Boyle stood up and laughed.

Sean said, "Cut it out."

"Cut it out, cut it out, cut it out." Jimmy pushed Sean again, the heels of his hands digging into Sean's ribs. "Make me. You wanna make me?"

"You wanna make him?" And now Dave shoved Sean.

Sean had no idea how this had happened. He couldn't even remember what had made Jimmy mad anymore or why Dave had been stupid enough to hit him in the first place. One second they were standing by the car. Now they were in the middle of the street and Jimmy was pushing him, his face screwed up and stunted, his eyes black and small, Dave starting to join in.`,

  emotionalRevelation: `"You find her? Is it her?" Jimmy yelled. "Is it?"

Sean stayed motionless, holding Jimmy's eyes with his own, locking them until Jimmy's surging stare saw what Sean had just seen, saw that it was over now, the worst fear had been realized.

Jimmy began to scream and ropes of spit shot from his mouth. Another cop came down the slope to help the one on top of Jimmy, and Sean turned away. Jimmy's scream blew out into the air as a low, guttural thing, nothing sharp or high-pitched to it, an animal's first stage of reckoning with grief.

Sean had heard the screams of a lot of victims' parents over the years. Always there was a plaintive character to them, a beseechment for God or reason to return, tell them it was all a dream. But Jimmy's scream had none of that, only love and rage, in equal quantity, shredding the birds from the trees and echoing into the Channel.

Sean went back over and looked down at Katie Marcus. Connolly, the newest member of the unit, came up beside him, and they looked down for a while without saying anything, and Jimmy Marcus's scream continued to echo behind them, growing hoarse now but no less anguished.`,

  chaseSequence: `They were at South Station once, tossing an orange street hockey ball back and forth on the platform, and Jimmy missed Sean's throw and the ball bounced down onto the tracks. Before it occurred to Sean that Jimmy could even be thinking about it, Jimmy jumped off the platform and down onto the track, down there with the mice and the rats and the third rail.

People on the platform went nuts. They screamed at Jimmy. One woman turned the color of cigar ash as she bent at the knees and yelled, Get back up here, get back up here now, goddamnit! Sean heard a thick rumble that could have been a train entering the tunnel up at Washington Street or could have been trucks rolling along the street above, and the people on the platform heard it, too. They waved their arms, whipped their heads around to look for the subway police. One guy placed a forearm across his daughter's eyes.

Jimmy kept his head down, peering into the darkness under the platform for the ball. He found it. He wiped some black grime off it with his shirtsleeve and ignored the people kneeling on the yellow line, extending their hands down toward the track.

Dave nudged Sean and said, "Whew, huh?" too loud.

Jimmy walked along the center of the track toward the stairs at the far end of the platform, where the tunnel opened gaping and dark, and a heavier rumble shook the station, and people were jumping now, banging fists into their hips. Jimmy took his time, strolling really, then he looked back over his shoulder, caught Sean's eyes, and grinned.

Dave said, "He's smiling. He's just nuts. You know?"`,

  investigationScene: `Sean rolled off Jimmy and they both stood up, expecting to see the two cops again but seeing Mr. Devine instead, coming down the front steps toward them.

"The hell you two doing?"

"Nothing."

"Nothing." Sean's father frowned as he reached the sidewalk. "Get out of the middle of the street."

They reached the sidewalk beside him.

"Weren't there three of you?" Mr. Devine looked up the street. "Where's Dave?"

"What?"

"Dave." Sean's father looked at Sean and Jimmy. "Wasn't Dave with you?"

"We were fighting in the street."

"What?"

"We were fighting in the street and the cops came."

"When was this?"

"Like five minutes ago."

"Okay. So, the cops came."

"And they picked Dave up."

Sean's father looked up and down the street again. "They what? They picked him up?"

"To take him home. I lied. I said I lived here. Dave said he lived in the Flats, and they—"

"What are you talking about? Sean, what'd the cops look like?"

"Huh?"

"Were they wearing uniforms?"

"No. No, they—"

"Then how'd you know they were cops?"

"I didn't. They..."

"They what?"

"He had a badge," Jimmy said. "On his belt."

"What kind of badge?"

"Gold?"

"Okay. But what'd it say on it?"

"Say?"

"The words. Were there words you could read?"

"No. I don't know."

Sean looked at his father. He didn't seem to know where to put his hands. He put them in his pockets, then he pulled them out, wiped them on his pants. He said, "I'll be damned," very softly, and he looked down to the end of the street as if Dave hovered at the corner, a dancing mirage just beyond Sean's field of vision.`,

  quietMoment: `Even after all the crying she'd done with Annabeth and Nadine and Sara. Even after she'd held Annabeth on the living room floor as her cousin shook for five violent minutes of heaving spasms. Even after she'd found Jimmy standing in the dark of Katie's bedroom, his daughter's pillow held up to his face. He hadn't been weeping or talking to himself or making any noise whatsoever. He merely stood with that pillow pressed to his face and breathed in the smell of his daughter's hair and cheeks, over and over. Inhale, exhale. Inhale, exhale...

Even after all that, it still hadn't sunk in entirely. Katie, she felt, would walk through that door any minute now, bounce into the kitchen and steal a piece of bacon from the plate on the stove. Katie couldn't be dead. She couldn't.`,
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
  'Ashport is neon-lit, morally gray, modern day with classic aesthetics',

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
  // Temperature settings
  // IMPORTANT (Gemini 3): temperature MUST be 1.0. The LLM layer enforces this.
  // Keep this section for backward compatibility and future provider swaps,
  // but do not set values below 1.0 in this codebase.
  temperature: {
    narrative: 1.0,
    dialogue: 1.0,
    decisions: 1.0,
    expansion: 1.0,
  },

  // Token limits - Gemini 3 Flash Preview supports up to 65,536 tokens output (64k)
  // 500-1000 words ≈ 700-1400 tokens + JSON structure overhead
  // Gemini 3 Flash Preview: 1M input / 64k output per docs/gemini_3_developer_guide.md
  maxTokens: {
    subchapter: 65536,    // Gemini 3 Flash Preview max output (64k tokens)
    expansion: 8000,      // For expansion requests
    validation: 1000,     // For validation passes
    pathDecisions: 65536, // Same as subchapter - no reason to limit (pay for actual tokens only)
  },

  // Context windowing - controls how much prior story text is sent to the LLM.
  // AGGRESSIVE settings for 1M+ token context windows.
  // Full story context = maximum continuity and coherence.
  contextWindowing: {
    // Older chapters: include full summaries for all
    maxOlderChapterEntries: 36,  // All chapters (12 chapters × 3 subchapters = 36 max)
    // Recent chapters: FULL TEXT, no truncation
    maxRecentChapterEntries: 9,  // Last 3 full chapters at full detail
    maxRecentNarrativeCharsPerEntry: 12000,  // Full chapter text (~3000 words max)
    // Current chapter: complete sibling context
    maxCurrentChapterBackrefCharsPerEntry: 15000,  // No truncation
    // Global cap - with 1M tokens, we can be generous
    maxPreviousEventsChars: 150000,  // ~40k tokens - still only 4% of context
    // Facts/threads - include everything relevant
    maxFactsInPrompt: 100,  // All established facts
    maxThreadsInPrompt: 50,  // All active plot threads
  },

  // Word count requirements - optimized for fast background generation
  wordCount: {
    minimum: 850,         // ~1.5 pages, enough for immersion
    target: 900,          // Lean but quality-focused - faster generation
    maximum: 1200,        // Cap to ensure fast generation
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
  },
};

// ============================================================================
// EXTENDED STYLE GROUNDING - Longer examples for deep pattern learning
// ============================================================================
export const EXTENDED_STYLE_GROUNDING = {
  // A complete scene with rising tension (shows pacing, dialogue interleaved with action, psychological complicity)
  tensionScene: `She found some plastic gloves under the sink, ones she used when cleaning the toilet, and she put them on and checked for any tears in the rubber. When she was satisfied there were none, she took his shirt from the sink and his jeans off the floor. The jeans were dark with blood, too, and left a smear on the white tile.

"How'd you get it on your jeans?"

"What?"

"The blood."

He looked at them hanging from her hand. He looked at the floor. "I was kneeling over him." He shrugged. "I dunno. I guess it splashed up, like on the shirt."

"Oh."

He met her eyes. "Yeah. Oh."

"So," she said.

"So."

"So, I'll wash these in the kitchen sink."

"Okay."

"Okay," she said, and backed out of the bathroom, left him standing there, one hand fluttering under the water, waiting for it to get hot.

In the kitchen, she dumped the clothes in the sink and ran the water, watched the blood and filmy chips of flesh and, oh Christ, pieces of brain, she was pretty sure, wash down the drain. It amazed her how much the human body could bleed. They said you had six pints in you, but to Celeste it always seemed like so much more.

She held her gloved hands under the water and checked them again for holes. None. She poured dishwashing liquid all over the T-shirt and scoured it with steel wool, then squeezed it out and went through the whole process again until the water that dripped from the shirt when she squeezed was no longer pink but clear. She did the same with the jeans, and by that time Dave was out of the shower and sitting at the kitchen table with a towel wrapped around his waist, smoking one of the long white cigarettes her mother had left behind in the cupboard and drinking a beer, watching her.

"Fucked up," he said softly.

She nodded.

"I mean, you know?" he whispered. "You go out, expecting one thing, a Saturday night, nice weather, and then..." He stood and came over by her, leaned against the oven, and watched her wring out the left leg of his jeans.

"Why aren't you using the washing machine in the pantry?"

She looked over at him. "Evidence, sweetie."

"Evidence?"

"Well, I dunno for sure, but I figure blood and...other stuff have a better chance of sticking to the insides of a washing machine than to a sink drain."

He let out a low whistle. "Evidence."

"Evidence," she said, giving in to a grin now, feeling conspiratorial, dangerous, part of something big and worthwhile.

"Damn, babe," he said. "You're a genius."

She finished wringing out the jeans and shut off the water, took a small bow.

Four in the morning, and she was more awake than she'd been in years. She was Christmas-morning-when-you're-eight kind of awake. Her blood was caffeine.

Your whole life, you wished for something like this. You told yourself you didn't, but you did. To be involved in a drama. And not the drama of unpaid bills and minor, shrieking marital squabbles. No. This was real life, but bigger than real life. This was hyper-real. Her husband may have killed a bad man. And if that bad man really was dead, the police would want to find out who did it. And if the trail actually led here, to Dave, they'd need evidence.

Because it all came down to evidence. And she'd just washed the evidence down the kitchen sink drain and out into the dark sewers.`,

  // A revelation moment (shows how to deliver information that recontextualizes everything)
  revelationScene: `Jimmy could hear them through the small speaker, whispering, giggling, and it horrified him to picture them and think of his sins at the same time.

I killed a man. The wrong man.

It burned in him, that knowledge, that shame.

I killed Dave Boyle.

It dripped, still burning, down into his belly. It drizzled through him.

I murdered. I murdered an innocent man.

"Oh, honey," Annabeth said, searching his face. "Oh, baby, what's wrong? Is it Katie? Baby, you look like you're dying."

She came around the table, a fearsome mix of worry and love in her eyes. She straddled Jimmy and took his face in her hands and made him look in her eyes.

"Tell me. Tell me what's wrong."

Jimmy wanted to hide from her. Her love hurt too much right now. He wanted to dissolve from her warm hands and find someplace dark and cavelike where no love or light could reach and he could curl into a ball and moan his grief and self-hatred into the black.

"Jimmy," she whispered. She kissed his eyelids. "Jimmy, talk to me. Please."`,

  // A chapter ending (shows how to create that "one more chapter" compulsion)
  chapterEnding: `An hour later, in Sean's kitchen, two other cops asked Sean and Jimmy a bunch of questions, and then a third guy showed up and drew sketches of the men in the brown car based on what Jimmy and Sean told them. The big blond cop looked meaner on the sketch pad, his face even bigger, but otherwise it was him. The second guy, the one who'd kept his eyes on the side-view, didn't look much like anything at all, a blur with black hair really, because Sean and Jimmy couldn't remember him too well.

Jimmy's father showed up and stood in the corner of the kitchen looking mad and distracted, his eyes watery, weaving a bit as if the wall kept moving behind him. He didn't speak to Sean's father, and no one spoke to him. With his usual capacity for sudden movement muted, he seemed smaller to Sean, less real somehow, like if Sean looked away he'd look back to find him dissolved into the wallpaper.

After they'd gone over it four or five times, everyone left, the cops, the guy who'd drawn on the pad, Jimmy and his father. Sean's mother went into her bedroom and shut the door, and Sean could hear muffled crying a few minutes later.

He sat out on the porch and his father told him he hadn't done anything wrong, that he and Jimmy were smart not to have gotten in that car. His father patted his knee and said things would turn out fine. Dave will be home tonight. You'll see.

His father shut up then. He sipped his beer and sat with Sean, but Sean could feel he'd drifted away on him, was maybe in the back bedroom with Sean's mother, or down in the cellar building his birdhouses.

Sean looked up the street at the rows of cars, the shiny glint of them. He told himself that this, all of this, was part of some plan that made sense. He just couldn't see it yet. He would someday, though. The adrenaline that had been rushing through his body since Dave had been driven away and he and Jimmy had rolled on the street fighting finally flushed out through his pores like waste.

He saw the place where he, Jimmy, and Dave Boyle had fought by the Bel Air and he waited for the new hollow spaces formed as the adrenaline had left his body to fill back in. He waited for the plan to re-form and make sense. He waited and watched the street and felt its hum and waited some more until his father stood up and they went back inside.`,

  // Dialogue under tension (shows subtext, what's unsaid, power dynamics)
  dialogueUnderTension: `Sean could see what Jimmy had done, and Jimmy could see that knowledge appear in Sean.

"You fucking did it, didn't you?" Sean said. "You killed him."

Jimmy stood up, holding on to the banister. "Don't know what you're talking about."

"You killed both of them—Ray Harris and Dave Boyle. Jesus, Jimmy, I came down here thinking the whole idea was nuts, but I can see it in your face, man. You crazy, lunatic, fucking psycho piece of shit. You did it. You killed Dave. You killed Dave Boyle. Our friend, Jimmy."

Jimmy snorted. "Our friend. Yeah, okay, Point Boy, he was your good buddy. Hung with him all the time, right?"

Sean stepped into his face. "He was our friend, Jimmy. Remember?"

Jimmy looked into Sean's eyes, wondered if he was going to take a swing at him.

"Last time I saw Dave," he said, "was at my house last night." He pushed Sean aside and crossed the street onto Gannon. "That's the last time I saw Dave."

"You're full of shit."

He turned, arms wide as he looked back at Sean. "Then arrest me, you're so sure."

"I'll get the evidence," Sean said. "You know I will."

"You'll get shit," Jimmy said. "Thanks for busting my daughter's killers, Sean. Really. Maybe if you'd been a little faster, though?" Jimmy shrugged and turned his back on him, started walking down Gannon Street.`,
};

// ============================================================================
// ANNOTATED EXAMPLES - Teaching WHY techniques work
// ============================================================================
export const ANNOTATED_EXAMPLES = {
  sensoryWorldBuildingExample: {
    passage: `When Sean Devine and Jimmy Marcus were kids, their fathers worked together at the Coleman Candy plant and carried the stench of warm chocolate back home with them. It became a permanent character of their clothes, the beds they slept in, the vinyl backs of their car seats. Sean's kitchen smelled like a Fudgsicle, his bathroom like a Coleman Chew-Chew bar. By the time they were eleven, Sean and Jimmy had developed a hatred of sweets so total that they took their coffee black for the rest of their lives and never ate dessert.`,
    annotations: [
      'Opens with SENSORY DETAIL (chocolate smell) that establishes working-class world without stating it',
      'The word "stench" instead of "scent" shows how environment becomes burden, not comfort',
      '"Permanent character" personifies the smell, makes it a presence in their lives',
      'Specific brand names (Fudgsicle, Coleman Chew-Chew) make the world concrete and real',
      'Final sentence shows CONSEQUENCE of sensory experience - shaped them for life',
      'Entire childhood and class position established through one smell in one paragraph',
    ],
  },

  characterThroughActionExample: {
    passage: `Jimmy kept his head down, peering into the darkness under the platform for the ball. He found it. He wiped some black grime off it with his shirtsleeve and ignored the people kneeling on the yellow line, extending their hands down toward the track.

Dave nudged Sean and said, "Whew, huh?" too loud.

Jimmy walked along the center of the track toward the stairs at the far end of the platform, where the tunnel opened gaping and dark, and a heavier rumble shook the station, and people were jumping now, banging fists into their hips. Jimmy took his time, strolling really, then he looked back over his shoulder, caught Sean's eyes, and grinned.`,
    annotations: [
      'Character revealed entirely through ACTION - no internal thoughts needed',
      '"Ignored the people" shows Jimmy\'s defiance, his separation from normal fear',
      'Dave\'s nervous reaction ("Whew, huh?" too loud) contrasts with Jimmy\'s calm',
      '"Strolling really" - the adverb "really" shows even narrator is impressed/appalled',
      'The backward glance and grin - Jimmy KNOWS what he\'s doing, courts danger deliberately',
      'We understand Jimmy\'s psychology without a single line of internal monologue',
    ],
  },

  crowdAsCharacterExample: {
    passage: `People on the platform went nuts. They screamed at Jimmy. One woman turned the color of cigar ash as she bent at the knees and yelled, Get back up here, get back up here now, goddamnit! Sean heard a thick rumble that could have been a train entering the tunnel up at Washington Street or could have been trucks rolling along the street above, and the people on the platform heard it, too. They waved their arms, whipped their heads around to look for the subway police. One guy placed a forearm across his daughter's eyes.`,
    annotations: [
      'Crowd reaction SHOWS the danger Jimmy is in - we feel it through others\' fear',
      '"Color of cigar ash" - specific, unexpected color comparison creates visual',
      'Dialogue rendered without quotes ("Get back up here") merges into the chaos',
      'Ambiguous rumble ("could have been...could have been") puts reader in uncertainty WITH Sean',
      'Father covering daughter\'s eyes - visceral detail implying expected violence',
      'Scene tension comes from WITNESSES, not narrator telling us it\'s tense',
    ],
  },

  dialogueRevealingClassExample: {
    passage: `"You remember what we talked about," his father said, and patted Sean's shoulder in dismissal.

Sean left the tool room and walked through the cool basement wondering if what made him enjoy Jimmy's company was the same thing that made his father enjoy hanging out with Mr. Marcus, drinking Saturday into Sunday, laughing too hard and too suddenly, and if that was what his mother was afraid of.`,
    annotations: [
      'Father\'s brevity ("You remember what we talked about") shows working-class restraint',
      'The pat is "dismissal" - physical gesture carries emotional weight without explanation',
      'Sean\'s wondering is INDIRECT - he doesn\'t ask, he observes and infers',
      '"Drinking Saturday into Sunday" - the preposition makes time blur like the drinking does',
      '"Laughing too hard and too suddenly" - the excess signals something OFF about the friendship',
      'Mother\'s unspoken fear becomes the real subject - what ISN\'T said matters most',
    ],
  },

  threatThroughNormalityExample: {
    passage: `It was a dark brown car, square and long like the kind police detectives drove, a Plymouth or something, and its bumper stopped by their legs and the two cops looked out through the windshield at them, their faces watery in the reflected trees that swam across the glass.

Sean felt a sudden lurch in the morning, a shifting in the softness of it.`,
    annotations: [
      'Car described in mundane terms first - "Plymouth or something" - normalizing the threat',
      '"Bumper stopped by their legs" - physical proximity creates implicit menace',
      '"Faces watery in the reflected trees" - distortion suggests unreality, wrongness',
      '"Sudden lurch in the morning" - not in his stomach, but in TIME ITSELF',
      '"Shifting in the softness" - the day had been soft; now it hardens into danger',
      'Threat announced not by what the men DO but by how the world FEELS different',
    ],
  },

  complexEmotionThroughObjectExample: {
    passage: `Jimmy took the glove and he felt bad about it. Sean would miss it. Jimmy took the glove and he felt good about it. Sean would miss it.

Jimmy watched his father stumble ahead of him, the old fuck looking like he'd crumple and turn into a puddle of himself any second, and he hated Sean.

He hated Sean and he'd been dumb to think they could have been friends, and he knew he'd hold on to this glove for the rest of his life, take care of it, never show it to anyone, and he'd never, not once, use the goddamn thing.`,
    annotations: [
      'Contradictory feelings stated back-to-back - "felt bad...felt good" - shows emotional complexity',
      'Repeated "Sean would miss it" - same fact means different things depending on emotion',
      'Hatred transferred to Sean when it belongs to the father - psychological displacement',
      '"Hold on to this glove for the rest of his life" - the object becomes symbol of wound',
      '"Never show it...never use it" - possession without use = pure pain, pure memory',
      'A stolen glove carries the weight of class, friendship, family, shame, and defiance',
    ],
  },

  waitingAsCharacterExample: {
    passage: `Sean looked at the place where he, Jimmy, and Dave Boyle had fought by the Bel Air and he waited for the new hollow spaces formed as the adrenaline had left his body to fill back in. He waited for the plan to re-form and make sense. He waited and watched the street and felt its hum and waited some more until his father stood up and they went back inside.`,
    annotations: [
      '"Hollow spaces formed as adrenaline left" - physical sensation of emotional aftermath',
      'Repetition of "waited" four times - the rhythm ENACTS the waiting, makes reader feel it',
      '"The plan to re-form and make sense" - Sean believes in order, in things working out',
      'Street has a "hum" - the ordinary world continues, indifferent to his trauma',
      'No resolution comes - the waiting ends not with answer but with going back inside',
      'Character revealed through what he HOPES FOR, not what he does',
    ],
  },

  psychologicalComplicityExample: {
    passage: `Four in the morning, and she was more awake than she'd been in years. She was Christmas-morning-when-you're-eight kind of awake. Her blood was caffeine.

Your whole life, you wished for something like this. You told yourself you didn't, but you did. To be involved in a drama. And not the drama of unpaid bills and minor, shrieking marital squabbles. No. This was real life, but bigger than real life. This was hyper-real. Her husband may have killed a bad man. And if that bad man really was dead, the police would want to find out who did it.

Because it all came down to evidence. And she'd just washed the evidence down the kitchen sink drain and out into the dark sewers.`,
    annotations: [
      '"Christmas-morning-when-you're-eight kind of awake" - disturbing simile makes complicity feel childlike, innocent',
      'Shift to second person ("Your whole life") - implicates the READER in the dark fantasy',
      '"You told yourself you didn\'t, but you did" - the brutal honesty about human nature',
      '"Hyper-real" - she\'s experiencing her accessory-to-murder moment as heightened living',
      'The mundane details (sink, sewers) ground the horror in domestic reality',
      'No moral judgment from narrator - we watch her become complicit without authorial comment',
      'Shows how ordinary people slide into darkness through small, practical steps',
    ],
  },

  acceptingDarknessExample: {
    passage: `And it occurred to him as he began to shave that he was evil. No big thing, really, no earth-shattering clang of bells erupting in his heart. Just that—an occurrence, a momentary realization that fell like gently grasping fingers through his chest.

So I am then.

He looked in the mirror and felt very little of anything at all. He loved his daughters and he loved his wife. And they loved him. He found certainty in them, complete certainty. Few men—few people—had that.

He'd killed a man for a crime the man had probably not committed. If that weren't bad enough, he felt very little regret.

He was evil? So be it. He could live with it because he had love in his heart and he had certainty. As trade-offs went, it wasn't half bad.`,
    annotations: [
      '"No big thing, really" - the casualness of self-damning realization is MORE chilling than drama',
      '"Gently grasping fingers through his chest" - the evil arrives tenderly, not violently',
      '"So I am then" - three words, isolated, accepting. No fight, no denial.',
      'He weighs evil against love and certainty as if balancing a ledger - moral calculus',
      '"Very little regret" - the absence of expected emotion reveals character depth',
      '"As trade-offs went, it wasn\'t half bad" - the banality of accepted evil is the horror',
      'Shows how monsters justify themselves through what they STILL possess, not what they\'ve lost',
    ],
  },

  silentReconnectionExample: {
    passage: `He said, "I'm sorry."

And Lauren spoke. "For what?"

"For putting it all on you."

"Okay..."

"Hey—"

"Hey—"

"You go ahead," he said.

"I...hell, Sean, I'm sorry, too. I didn't mean to—"

"It's okay," he said. "Really." He took a deep breath, sucking in the soiled, stale-sweat stench of his cruiser. "I want to see you. I want to see my daughter."

And Lauren answered, "How do you know she's yours?"

"She's mine."

"But the blood test—"

"She's mine," he said. "I don't need a blood test. Will you come home, Lauren? Will you?"`,
    annotations: [
      'After a year of silent phone calls, "I\'m sorry" breaks everything open - power of withheld words',
      'Overlapping "Hey—" shows both trying to reconnect at once - rhythm of reconciliation',
      '"Stale-sweat stench of his cruiser" - even transcendent moments grounded in sensory reality',
      'Paternity question deflected by emotional certainty: "She\'s mine" - faith over fact',
      'Repeated "She\'s mine" and "Will you?" - the desperation under the calm surface',
      'The mundane setting (car, phone) makes the emotional stakes feel MORE real, not less',
      'Resolution comes through vulnerability, not grand gesture',
    ],
  },

  burnoutMonologueExample: {
    passage: `Lately, though, he'd just been tired in general. Tired of people. Tired of books and TV and the nightly news and songs on the radio that sounded exactly like other songs on the radio he'd heard years before and hadn't liked much in the first place. He was tired of his clothes and tired of his hair and tired of other people's clothes and other people's hair. He was tired of wishing things made sense. Tired of office politics and who was screwing who, both figuratively and otherwise. He'd gotten to a point where he was pretty sure he'd heard everything anyone had to say on any given subject and so it seemed he spent his days listening to old recordings of things that hadn't seemed fresh the first time he'd heard them.

Maybe he was simply tired of life, of the absolute effort it took to get up every goddamned morning and walk out into the same fucking day with only slight variations in the weather and the food.`,
    annotations: [
      'Anaphora ("Tired of...tired of...tired of") creates crushing rhythm of exhaustion',
      'Exhaustion expands from specific (books, TV) to universal (life itself) - escalating despair',
      '"Tired of his hair and tired of other people\'s hair" - the absurdist specificity makes it real',
      '"Old recordings of things that hadn\'t seemed fresh the first time" - perception of repetition',
      '"Same fucking day with only slight variations" - depression rendered as sameness, not sadness',
      'No emotional words like "depressed" or "hopeless" - state shown through perception, not label',
      'Shows burnout through what the character NOTICES, not what they feel',
    ],
  },

  memoryErasureExample: {
    passage: `They had never been friends. They had never played stickball and kick-the-can and 76 on Rester Street. They had never spent a year of Saturdays hanging with Sean Devine, playing war in the gravel pits off Harvest, jumping roof to roof from the industrial garages near Pope Park, watching Jaws together at the Charles, huddled down in their seats and screaming. They had never practiced skids on their bikes together or argued over who would be Starsky, who would be Hutch, and who would get stuck being Kolchak from The Night Stalker.`,
    annotations: [
      'Negation structure ("never...never...never") erases shared history line by line',
      'Specific childhood memories (Starsky/Hutch, Jaws, kick-the-can) make the erasure painful',
      'The more vivid the denied memory, the more we feel what\'s being lost',
      'Psychological defense mechanism rendered as narrative technique',
      'Reader knows these things DID happen - dramatic irony creates tension',
      'Shows trauma response: rewriting history to survive the present',
      'Each "never" is a small violence against the past',
    ],
  },

  darkEmpowermentExample: {
    passage: `He'd heard somewhere of ancient cultures that used to eat the hearts of the people they murdered. They ate the hearts, and the dead were subsumed into them. It gave them power, the power of two, the spirit of two. Dave felt that way. No, he hadn't eaten anyone's heart. He wasn't that fucked in the head. But he had felt the glory of the predator. He had murdered. And he had done right. And he had stilled the monster inside of him, the freak who longed to touch a young boy's hand and melt into his embrace.

That freak was fucking gone now, man. Gone down to hell with Dave's victim.`,
    annotations: [
      '"Ancient cultures" reference gives murder a mythic, almost sacred justification',
      '"Glory of the predator" - the word "glory" is chilling in this context',
      '"He wasn\'t that fucked in the head" - the partial denial makes it worse, not better',
      'Murder as therapy: he killed to silence his own inner monster',
      '"Done right" - moral certainty after murder is more disturbing than guilt',
      'The colloquial "fucking gone now, man" - casual tone about murder',
      'Shows how perpetrators justify violence as self-improvement or purification',
    ],
  },

  physicalDecayAsTraumaExample: {
    passage: `Her skin was pale and her hair was speckled with dandruff and she kept pulling on her fingers as if trying to pop them from the sockets.

She blinked at Sean. She said, "Hey, Trooper Devine."

Sean held out his hand because she looked like she needed contact or she'd float away. "Hi, Celeste. Call me Sean. It's okay."

She shook his hand. Her palm was clammy, her fingers hot, and she let go almost as soon as they'd touched.`,
    annotations: [
      'Physical deterioration (pale, dandruff) shows psychological collapse without stating it',
      '"Pulling on her fingers as if trying to pop them from sockets" - self-harm impulse as tic',
      '"Float away" - others can SEE her dissociation; it\'s visible, not internal',
      'Contradictory sensations (clammy palm, hot fingers) show dysregulation',
      'Immediate release of handshake - she can\'t sustain human contact',
      'Her trauma shown entirely through physical description and brief action',
      'The body keeps the score: grief manifests as decay',
    ],
  },

  victimHumanizationExample: {
    passage: `Underneath the blood on the body and pooled beneath it and the mildew clinging to the concrete around it, Sean could smell her perfume, just a hint of it, slightly sweet, slightly sensual, the lightest scent, which made him think of high school dates and dark cars, the panicky fumbling through fabric and the electric grazing of flesh.`,
    annotations: [
      'Perfume persists through blood and mildew - life asserting itself against death',
      '"Slightly sweet, slightly sensual" - the victim was a person with desires, not just a body',
      'Detective\'s memory triggered by scent - universal human experience',
      '"High school dates and dark cars" - perfume connects to innocence, youth, first love',
      '"Panicky fumbling...electric grazing" - sensory language resurrects the victim\'s aliveness',
      'The paragraph moves from death (blood, mildew) to life (perfume, desire) - structural humanization',
      'Shows how to honor the victim while describing crime scene - they were SOMEONE',
    ],
  },
};

// ============================================================================
// NEGATIVE EXAMPLES - What NOT to write (with explanations)
// ============================================================================
export const NEGATIVE_EXAMPLES = {
  tellDontShow: {
    badVersion: `Jack suddenly felt a wave of shock wash over him as he realized the horrifying truth. The weight of the revelation was almost too much to bear. He couldn't help but notice that everything had changed in that moment, and he felt a profound sense of betrayal.`,
    problems: [
      '"Suddenly" - false urgency, tells instead of shows',
      '"Felt a wave of shock" - abstract emotion, not physical',
      '"Weight of the revelation" - cliché metaphor',
      '"Couldn\'t help but notice" - forbidden phrase, passive voice',
      '"In that moment" - filler phrase, adds nothing',
      '"Profound sense of betrayal" - abstract, tells reader what to feel',
    ],
    goodVersion: `The signature on the page—Jack knew that handwriting. Had known it for thirty years.

Tom.

His coffee cup found the desk. Jack didn't remember setting it down. Didn't remember his hands going numb. The only thing that existed was that signature and the lie it exposed.`,
    whyItWorks: [
      'Physical action (cup finding desk) shows dissociation',
      '"Didn\'t remember" shows shock through lost time',
      'One-word paragraph creates impact through isolation',
      'Specific (signature, handwriting) beats abstract (betrayal, shock)',
    ],
  },

  overwrittenDialogue: {
    badVersion: `"I can't believe what you've done," Jack said angrily, his voice trembling with rage. "You've betrayed everything we ever stood for. How could you do this to me, to us, to everything we built together?"

"You have to understand," Tom replied desperately, "I never meant for it to go this far. I was just trying to help, to make sure the guilty paid for their crimes."`,
    problems: [
      'Adverb tags ("angrily," "desperately") tell what dialogue should show',
      'Characters explaining their emotions explicitly',
      'Dialogue too on-the-nose—people don\'t speak their subtext',
      'No physical action—talking heads',
      'Melodramatic phrasing ("everything we ever stood for")',
    ],
    goodVersion: `"Tom." Just the name. Jack couldn't find more.

"Let me explain—"

"Don't." Jack's hand found the edge of the desk. Held on. "Just tell me how many. How many cases. How many people."

Tom didn't answer. The silence was answer enough.`,
    whyItWorks: [
      'Minimal dialogue does more than speeches',
      'Physical grounding (hand on desk) shows need for stability',
      '"Just the name" - narration notes the inadequacy of words',
      'The unanswered question is more damning than any answer',
      'Subtext (devastation, betrayal) lives beneath simple words',
    ],
  },

  flatPacing: {
    badVersion: `Jack walked to the warehouse. He opened the door and went inside. He looked around at all the boxes. There were a lot of them. He opened one box and found documents. The documents were about cases. He read some of them. They were very interesting. He found evidence of corruption.`,
    problems: [
      'Every sentence same length and structure',
      'No variation in rhythm—monotonous',
      'Action without meaning or tension',
      '"Very interesting" - empty value judgment',
      'No sensory detail, no atmosphere',
      'Events listed rather than experienced',
    ],
    goodVersion: `The warehouse door complained on its hinges—metal on rust, the sound of something that wanted to stay closed.

Jack paused. Let his eyes adjust.

Boxes. Hundreds of them. Floor to ceiling in rows that stretched back into darkness, each one labeled in a handwriting that made his stomach drop.

He knew that handwriting.

The first box came open with a whisper of old tape. Inside: case files. Not copies—originals, annotated in margins and between lines with the casual precision of a man who never expected to be caught.`,
    whyItWorks: [
      'Varied sentence length creates rhythm',
      'Sensory details (rusty hinges, sound) establish atmosphere',
      'Short paragraphs create pacing, build tension',
      'Delayed recognition ("he knew that handwriting") creates dread',
      'Specific physical details (whisper of tape) make scene real',
    ],
  },

  heavyForeshadowing: {
    badVersion: `Jack looked at Tom, not knowing that this would be the last time he would see his friend as anything other than a monster. Little did he know that the contents of that folder would change everything forever. The truth was waiting, and when it came, nothing would ever be the same.`,
    problems: [
      '"Little did he know" - forbidden phrase, breaks immersion',
      'Tells reader something important is coming—destroys tension',
      '"Change everything forever" - vague, melodramatic',
      'Narrator intruding with future knowledge Jack doesn\'t have',
      'Promises impact instead of delivering it',
    ],
    goodVersion: `Jack handed Tom the folder. Just like he had a hundred times before. Just like he would again, he assumed, because some things didn't change.

Tom's smile stayed perfectly in place as he took it.

Perfectly.

In thirty years, Jack had never noticed how little that smile moved.`,
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
      character: 'Will Sarah forgive Jack? Can Tom be redeemed? (Relationship questions)',
      threat: 'Will Grange find him? Is Victoria ally or enemy? (Tension questions)',
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
      'The caller ID showed a number Jack knew by heart. Tom\'s number. But Tom was dead.',
      'Sarah didn\'t answer. Couldn\'t. Because standing behind her, gun drawn, was the last person Jack expected.',
      'He\'d always been the evidence.',
    ],
  },

  // Personal stakes escalation
  personalStakes: {
    description: 'What Jack personally loses should escalate through the story',
    progression: {
      chapters2to4: 'Jack\'s self-image and reputation at stake',
      chapters5to7: 'Jack\'s relationships at stake (Sarah, his sense of purpose)',
      chapters8to10: 'Jack\'s freedom and physical safety at stake',
      chapters11to12: 'Jack\'s redemption and legacy at stake',
    },
    requirement: 'Each chapter must make clear what Jack loses if he fails THIS chapter.',
  },

  // Revelation gradient
  revelationGradient: {
    description: 'Revelations should follow a deliberate pattern',
    levels: {
      micro: 'Every subchapter - a clue, a connection, a small truth (e.g., a name, a date, a lie exposed)',
      chapter: 'End of each chapter - a character\'s true nature revealed, a conspiracy layer peeled',
      arc: 'Chapters 4, 7, 10 - game-changers that recontextualize everything the reader thought they knew',
    },
    rule: 'Revelations should make readers say "I KNEW something was off" or "Oh god, that changes everything"',
  },

  // Dramatic irony leverage
  dramaticIrony: {
    description: 'The reader knows things Jack doesn\'t - USE THIS',
    examples: [
      'Reader knows Victoria = Emily before Jack does',
      'Reader suspects Tom before Jack confirms it',
      'Reader sees danger Jack walks into blind',
    ],
    technique: 'Write scenes where readers CRINGE at Jack\'s ignorance. Let them see the trap closing.',
  },

  // The ticking clock
  tickingClock: {
    description: 'Time pressure should be FELT, not just mentioned',
    implementation: {
      element: 'What time-sensitive pressure exists (midnight meeting, 24 hours until evidence destroyed)',
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
    'Paragraph breaks create pacing—don\'t be afraid of one-line paragraphs',
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
    'Victoria touches her wrist when lying—we never learn why',
    'Tom\'s laugh changes when Helen Price is mentioned',
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
      surface: '"Coffee?" Sarah asked.',
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
  WRITING_STYLE,
  EXAMPLE_PASSAGES,
  CONSISTENCY_RULES,
  GENERATION_CONFIG,
  EXTENDED_STYLE_GROUNDING,
  ANNOTATED_EXAMPLES,
  NEGATIVE_EXAMPLES,
  ENGAGEMENT_REQUIREMENTS,
  MICRO_TENSION_TECHNIQUES,
  SENTENCE_RHYTHM,
  ICEBERG_TECHNIQUE,
  SUBTEXT_REQUIREMENTS,
};
