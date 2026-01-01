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
  atmosphericOpening: `Rain fell on Ashport the way memory falls on the guilty, soft at first, then relentless. Jack stood at the window of what used to be his office, watching neon bleed into the wet streets below. Murphy's jukebox bled through the floorboards, some torch song about a woman who left. They all left eventually. That was the first lesson the city taught, and it never got tired of repeating itself.

The envelope sat on his desk where he’d dropped it twenty minutes ago. Black paper, expensive. A red wax seal he didn’t recognize. Inside, silver ink that caught what little light filtered through the blinds.

"Twelve days. Twelve cases. One you closed without certainty."

No signature. No return address. Just that, and a photograph Jack had spent seven years trying to forget.`,

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

  internalMonologue: `Jack should have seen it. The thought kept circling like a vulture waiting for something to die. Twenty years of perfect evidence, pristine chains of custody, confessions that fit the proof like a key in a lock. And not once, not a single time, had he asked why his cases were the only ones that wrapped up so clean.

Because he didn’t want to know. Because clearance rates meant promotions, and promotions meant a man could look in the mirror and call himself one of the good guys. Jack had built his reputation on a foundation of lies, and the only person more surprised than he was the woman standing in his doorway.

"Hello, Jack." Victoria Blackwell smiled like she knew every thought he'd ever had. "We need to talk about certainty."`,

  tenseMoment: `The gun felt wrong in Jack's hand. Not the weight of it—that was familiar as breathing—but the direction it pointed. Silas Reed, his partner for eight years, the man who'd covered his back through three shootings and one divorce. Now Silas sat across from him in a penthouse paid for with blood money, bourbon trembling in a crystal glass.

"She got to you too." Silas’s voice had gone hollow. "Victoria."

"She showed me the Thornhill documents. Your signature, Silas. Your handwriting."

"I can explain."

"Don't." Jack lowered the gun but didn’t holster it. "Just tell me who else. Who else did you help bury?"`,

  decisionSetup: `Two doors. That was what it came down to, after everything. Behind the first, Helen Price sat with a folder that could bring down half the prosecutors in the state. Behind the second, Grange was making a call that would send his next victim into a grave no one would ever find.

Jack had minutes. Maybe less.

Sarah's voice crackled through his earpiece. "Jack, we can't be in two places. You have to choose."

Choice. Victoria's favorite word. The whole game was built on them, each one a brick in the wall Jack had built around the innocent people he'd helped bury. Now she wanted him to understand what that felt like from the other side.

The floor creaked under his boots. Both paths led somewhere dark. The only question was which darkness he could live with.`,

  // ========== NEW A+ QUALITY EXAMPLES ==========

  characterConfrontation: `Victoria's penthouse smelled of old money and new secrets. Floor-to-ceiling windows gave her a god's-eye view of Ashport, the city spread out like a game board beneath her heels. She didn't turn when Jack entered. She didn't need to.

"Seven years." Her voice carried the weight of every one of them. "That's how long I waited. Planned. Watched you collect your commendations while I learned to walk again."

"Emily." The name felt like broken glass in Jack’s mouth. "I closed your case because the evidence—"

"The evidence said I was dead." She turned then, and Jack saw what Grange had done to her. The scars traced a map of suffering across her throat, her wrists. "I heard you, Jack. Through the floor of that basement. 'Case closed. Moving on.' Those were your words while he was still deciding whether to let me live."

Her eyes held something worse than hatred. Understanding. She knew exactly what he was, because she'd built herself into something stronger.`,

  emotionalRevelation: `The photograph shook in Jack's hands. Not from age, not from the rain that had soaked through the folder. From recognition.

That was Tom's handwriting. Thirty years of friendship, and Jack knew his chicken scratch better than his own signature. But this wasn't case notes or lab reports. This was a ledger. Names, dates, evidence reference numbers. A catalog of lies stretching back two decades.

Marcus Thornhill's case was on page three. The fiber analysis that put him at the scene. Tom's notation: "Sample sourced externally. Match achieved 11/4."

Sourced externally. That meant fabricated. That meant Tom had watched Marcus hang himself in a cell for a crime built on nothing but manufactured threads.

Jack had stood at that man's funeral. Told his daughter Claire that justice had been served. Let her spend four years thinking the system worked, when the system was just another word for his best friend's lies.

The folder fell from Jack's fingers. He barely heard it hit the floor. All he could hear was thirty years of certainty crumbling into dust.`,

  chaseSequence: `The warehouse door splintered behind Jack. No time to look. No time to think.

Left. Through the shipping containers. Rain hammered the metal above, masking his footsteps but theirs too. Three of them, maybe four. Grange's cleanup crew.

Jack’s lungs burned. Two decades of Jameson and too many cigarettes catching up at the worst possible moment. A bullet sparked off steel six inches from his head. Close. Getting closer.

Corner. Right. Another row of crates. The dock had to be nearby. Had to be.

Voices behind him, coordinating. Professional. The kind of men who made problems disappear for Deputy Chief Grange. Twenty-three victims. Jack wasn't planning to be number twenty-four.

The container ahead was open. Dark inside. A choice made in heartbeats: hide and hope, or keep running and pray.

Jack dove into the darkness. Held his breath. Listened to their boots thunder past, hunting a ghost in the rain.`,

  investigationScene: `The Thornhill file told a story if a man knew how to read it. Most people didn't. Most people saw evidence and assumed it meant truth. Thirty years on the job had taught Jack better. Now those lessons tasted like ash.

Claire had gathered everything. Bank records showing the shell company was created three days before Marcus was fired. Emails her father never wrote, sent from a computer he never owned. The forensic timeline that proved the money moved while Marcus was in surgery getting his appendix removed.

"Your partner signed the arrest warrant." Claire's voice held no accusation. She was past that. This was simple recitation of fact. "Silas Reed. He took the forgeries and stamped them real."

Jack spread the documents across his desk. The rain on the window caught the light, made the papers glow like accusation. Every page was a nail in a coffin he'd helped build.

"Why are you showing me this?" Jack asked, though he already knew.

"Because you're the only cop who might actually care." She leaned forward, four years of grief compressed into certainty. "And because Victoria Blackwell told me you'd want to see what you helped bury."`,

  quietMoment: `Murphy's was empty at 3 AM. Just Jack, the jukebox, and a glass of Jameson that wasn't helping.

The stool next to him creaked. Sarah sat down without asking, ordered a coffee she wouldn't drink. They watched the rain together for a while. Some things didn't need words. Thirteen years of partnership bought that much silence.

"I filed the Conviction Integrity request today." She said it to the mirror behind the bar, not to him. "Eleanor Bellamy's case. If even half of what we've found is true..."

"It's true." The whiskey burned going down. "All of it."

"Then you know what happens next." She finally looked at him. Her eyes held something Jack couldn't name. Disappointment, maybe. Or worse, pity. "Internal Affairs. Grand jury. Everything you built, Jack. Gone."

Jack poured another glass. "It was never his to build."

She left her coffee untouched and walked back into the rain. The jukebox played something about roads not taken. Jack drank until the song ended, then drank some more.`,
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
  },

  // Context windowing - controls how much prior story text is sent to the LLM.
  // AGGRESSIVE settings for 1M+ token context windows.
  // Full story context = maximum continuity and coherence.
  contextWindowing: {
    // Older chapters: include full summaries for all
    maxOlderChapterEntries: 30,  // All chapters (12 chapters × 3 subchapters = 36 max)
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
    // Expensive. Keep OFF for normal gameplay latency.
    // When enabled, the engine may make extra LLM calls to invent consequences for past decisions.
    enableLLMDecisionConsequences: false,
  },
};

// ============================================================================
// EXTENDED STYLE GROUNDING - Longer examples for deep pattern learning
// ============================================================================
export const EXTENDED_STYLE_GROUNDING = {
  // A complete scene with rising tension (shows pacing, dialogue interleaved with action)
  tensionScene: `The Blueline Diner smelled like coffee that had been sitting too long and secrets that had been kept even longer. Jack slid into the booth across from Claire Thornhill and watched her not look at him.

She was younger than he expected. Mid-twenties, maybe, with hair pulled back tight and a uniform worn thin from too many washes. But her eyes were older. They carried the kind of weight that came from watching a father hang himself in a jail cell.

"You're Halloway." Not a question.

"I'm Halloway."

The waitress appeared, refilled Claire's coffee without being asked, and vanished with the practiced invisibility of someone who'd learned not to hear things. Claire wrapped both hands around her cup but didn't drink.

"Victoria said you'd come. She said you were starting to understand."

Jack's coffee sat untouched. "What I understand is that your father was framed. What I understand is that my partner signed the documents that made it happen." He paused. "What I don't understand is why you're willing to talk to the detective who could have stopped it."

Claire laughed. It was not a pleasant sound. "Could have? You think that makes it better? 'Could have' means you saw something wrong and decided it wasn't your problem. 'Could have' means my father begged you to look at the evidence again, and you told him the case was closed."

The coffee in Jack's cup had gone cold. He drank it anyway. Cold coffee was still better than the taste of truth.

"Four years." Claire's voice dropped to something between a whisper and a weapon. "I've spent four years building the case you should have built in a weekend. Bank records. Shell company filings. Emails that were spoofed from accounts created days before the 'embezzlement' was discovered." She reached into her bag and pulled out a manila folder worn soft at the edges. "This is the Thornhill Ledger. Every lie, documented. Every signature, traced. Every person who looked the other way, named."

She slid it across the table.

"My father used to say the truth was the only thing that mattered. He believed in the system. Believed in people like you." She stood, dropped a five on the table. "He was wrong about all of it. But maybe, if you're half the detective you used to pretend to be, you can prove that he was right about one thing."

"What's that?"

Claire Thornhill looked at him the way a surgeon looks at a tumor. "That the truth comes out eventually. Even when good men fail to find it."

She walked out into the rain. Jack sat with the folder and the cold coffee and thirty years of certainty dissolving like sugar in water.`,

  // A revelation moment (shows how to deliver information that recontextualizes everything)
  revelationScene: `The storage unit was supposed to be empty. Tom had told him that, years ago, when he'd helped move Tom's ex-wife's things after the divorce. "Cleaned out completely," Tom had said. "Nothing left but dust and regret."

Tom had lied.

The boxes filled every available inch, stacked floor to ceiling with the kind of meticulous organization that spoke to decades of habit. Jack pulled down the nearest one, already knowing he wouldn't like what he found.

Case files. Hundreds of them. But not the official versions—these were annotated, marked up in Tom's distinctive handwriting. Jack recognized the first case: Morrison, 2019. Open-and-shut murder conviction. The forensic evidence had been airtight.

Except here, in Tom's private notes, was a different story. "Hair sample from secondary source—cleaning brush from barber." "Fingerprint lifted from subject's gym membership card, transferred via silicone." "Blood typing matched to donor sample from Red Cross drive."

Each annotation was a confession. Each page was a grave.

Jack's hands moved on their own, pulling box after box. Names he recognized. Cases he'd closed. Convictions he'd celebrated over drinks at Murphy's while Tom smiled and ordered another round.

Eleanor Bellamy. The sapphire necklace that proved she'd hidden assets. Tom's note: "Necklace purchased at estate sale, receipt destroyed. Deposit box key copied from locksmith records."

Marcus Thornhill. The forged financial documents. Tom's note: "Silas provided signatures under duress. Original blackmail materials in safety deposit box 447."

Dr. Lisa Chen. The lab tech who'd tried to blow the whistle. Tom's note: "Transfer paperwork expedited. Husband's immigration status flagged for leverage. Problem contained."

Twenty years. Twenty years of manufactured justice, and Jack had swallowed every piece of it because the evidence was too perfect to question.

He sat down on a box that couldn't hold his weight. Didn't care when it collapsed. Didn't care about anything except the sound of his own breathing and the weight of the paper scattered around him like fallen leaves.

His phone buzzed. A text from an unknown number.

"Now you see. Now you understand. The question is: what will you do about it? — V.B."

Jack looked at the message for a long time. Then he started photographing every page.`,

  // A chapter ending (shows how to create that "one more chapter" compulsion)
  chapterEnding: `Sarah found him at Murphy's. She always did.

"You look like hell." She didn't sit down.

"Feel like it too." Jack poured two fingers of Jameson. Then two more. "I figured it out. All of it. Tom, Silas, the whole machine."

"I know. I've been working the same case from the inside." She finally took the stool next to him. "Internal Affairs has a file three inches thick. We just needed someone who was there. Someone who could connect the dots."

"You need me to testify."

"I need you to do what you should have done twenty years ago. I need you to tell the truth."

The jukebox in the corner played something sad. It always played something sad. Jack had stopped hearing the specific songs years ago; they all blurred into the same melody of regret.

"If I do this, I lose everything. My pension. My reputation. Whatever's left of my name."

"If you don't do this, we lose the case. Tom walks. Silas walks. Everyone walks except the five people rotting in cells for crimes they didn't commit."

Jack drained his glass. The whiskey didn't burn anymore. Nothing did.

"There's something else." Sarah's voice dropped. "Victoria Blackwell. We've been tracking her movements. She's not just exposing corruption, Jack. She's dismantling something bigger. Something that goes beyond Tom, beyond the department. And she's doing it on a schedule."

"What kind of schedule?"

Sarah pulled out her phone. Showed him a photograph of a wall covered in photographs, connected by red string. In the center, circled in black marker: a date. Three days from now.

"We don't know what happens then. But every piece she's moved, every person she's exposed—it's all building to that moment." She put the phone away. "Whatever she's planning, Jack, you're part of it. She's been positioning you since the first envelope."

The door to Murphy's opened. A woman stepped inside, rain dripping from a red coat, eyes finding Jack's across the bar with the precision of a scope finding a target.

Victoria Blackwell smiled. "Hello, Jack. It's time we talked about endgames."

The jukebox skipped. The rain fell. And Jack realized, with the cold clarity of a man seeing his own grave, that he'd never been the detective in this story.

He'd always been the evidence.`,

  // Dialogue under tension (shows subtext, what's unsaid, power dynamics)
  dialogueUnderTension: `"You came alone." Victoria circled the desk, trailing one finger along its mahogany edge. "Either you're brave, or you're still underestimating me. I'm curious which."

"I came because you asked." Jack stayed near the door. Not afraid to enter. Just aware of exits. Old habit. "Your letter said you had information about Grange."

"I have information about everything." She sat, crossing her legs with the practiced ease of someone who'd learned to make every movement a statement. "But we're not here to talk about Grange. We're here to talk about you."

"I don't need to understand myself. I need to understand why you're doing this."

"No. You need to understand why you're letting me." She smiled, and it reached her eyes the way a scalpel reaches a wound—precisely, surgically. "You could have gone to the FBI the moment you found Tom's storage unit. You could have handed everything to Sarah and walked away. Instead, you're here. In my office. Playing my game."

Jack didn't answer. The silence stretched, filled only by the rain against the windows and the distant sound of traffic twenty stories below.

"You feel guilty." Victoria said it like a diagnosis. "Not about the convictions—not yet. You feel guilty because some part of you knew. Some part of you looked at the evidence Tom provided and thought 'this is too clean.' But that part was quieter than the part that wanted to close cases. That wanted the win."

"Is that why you chose me? For the guilt?"

"I chose you because you're capable of change. Most of them aren't." She stood, walked to the window. The city spread beneath her like a circuit board, all lights and hidden connections. "Tom Wade knows what he did. He simply doesn't care. Silas Reed knows, and it's eating him alive, but not enough to act. Helen Price knows, and she's already written her suicide note—she just hasn't decided on the date."

"And me?"

Victoria turned. In the rain-streaked light, the scars on her wrists were visible for just a moment before her sleeves fell back into place.

"You're the one who closed my case, Jack. You're the one who told the world I was dead while I was still screaming in that basement." Her voice never wavered. "And you're the one who can undo it. Not the conviction—that's already done. But the system. The machine that made me and Tom and Grange and all of it possible."

She walked toward him, stopped close enough that he could smell her perfume. French. Expensive. The same scent that had been on the envelopes.

"I'm offering you a choice. The same kind of choice you've been making your whole career, except this time you'll know the stakes. You can walk out that door, take what you know to the FBI, and spend the rest of your life testifying in courtrooms. They'll call you a hero. They'll say you did the right thing."

"Or?"

"Or you can stay. Play the game through to the end. Help me dismantle not just the corrupt cops, but the thing that makes cops corrupt. The thing that let a man like Grange operate in plain sight for twenty years." She smiled again, but this time it was almost sad. "The thing that made you possible, Jack. The thing that made both of us."

The rain fell. The city glittered. And Jack Halloway stood at the crossroads of everything he'd ever believed about justice.

"What happens if I stay?"

Victoria's smile widened. "Then we'll see what you're really made of."`,
};

// ============================================================================
// ANNOTATED EXAMPLES - Teaching WHY techniques work
// ============================================================================
export const ANNOTATED_EXAMPLES = {
  physicalEmotionExample: {
    passage: `The photograph shook in Jack's hands. Not from age—from recognition.`,
    annotations: [
      'Opens with PHYSICAL ACTION revealing emotion (hands shaking) - never say "Jack felt shocked"',
      'The dash creates a beat, a moment of realization the reader experiences WITH Jack',
      'The word "recognition" is more specific than "shock" - tells us this is about seeing something known',
      'Two short sentences create staccato rhythm that mirrors sudden realization',
    ],
  },

  dialogueSubtextExample: {
    passage: `"Coffee?" Sarah asked.

"I'm good."

She poured two cups anyway.`,
    annotations: [
      'Surface: Offering and declining coffee. Subtext: Testing if he\'ll accept care',
      '"I\'m good" is a deflection, not an answer—Jack pushes away comfort',
      'Sarah ignoring his refusal shows: she knows him, she won\'t let him retreat',
      'Action (pouring anyway) speaks louder than any dialogue could',
      'Three lines accomplish what a paragraph of internal monologue would do worse',
    ],
  },

  tensionBuildingExample: {
    passage: `The warehouse door was open three inches. It hadn't been open when Jack left.

Someone had been here.

Someone might still be here.

His hand found his gun. The weight was familiar. What waited inside was not.`,
    annotations: [
      'Establishes threat through ABSENCE of expected state (door position changed)',
      'Two short paragraphs that could be one—but separation creates mounting dread',
      '"Might still be" leaves threat unresolved, maintains tension',
      'Final paragraph contrasts familiar (gun) with unfamiliar (unknown threat)',
      'Note: No adverbs. No "suddenly." No telling us to be scared. Pure showing.',
    ],
  },

  revealPacingExample: {
    passage: `The signature on the document was familiar.

Too familiar.

Tom's handwriting. Tom's pen. Tom's distinctive loop on the letter "T" that Jack had seen on birthday cards and case files and the note Tom left when he borrowed Jack's car in '98.

Thirty years of friendship, catalogued in that one letter.

Thirty years of lies, proven in the line beneath it.`,
    annotations: [
      'Delays the reveal across multiple lines—builds anticipation',
      'Uses the mundane (birthday cards, borrowed car) to establish intimacy before betrayal',
      'Specific detail ("loop on the letter T") makes recognition visceral and undeniable',
      'Parallel structure in final lines (Thirty years of X / Thirty years of Y) creates impact',
      'The reveal isn\'t just WHO—it\'s the weight of the relationship destroyed',
    ],
  },

  chapterHookExample: {
    passage: `Victoria Blackwell smiled. "Hello, Jack. It's time we talked about endgames."

The jukebox skipped. The rain fell. And Jack realized, with the cold clarity of a man seeing his own grave, that he'd never been the detective in this story.

He'd always been the evidence.`,
    annotations: [
      'Character entrance at chapter end = irresistible hook',
      '"Endgames" promises confrontation and finality—reader MUST continue',
      'Jukebox skipping = tiny detail that creates unease, wrongness',
      'Final revelation reframes EVERYTHING reader thought they knew',
      'Last line is a conceptual gut-punch: Jack as evidence, not investigator',
      'This ending makes putting down the book feel physically difficult',
    ],
  },

  sensoryAnchoringExample: {
    passage: `The storage unit smelled of dust and old paper and something else—something chemical that reminded Jack of the forensics lab. Of Tom, hunched over a microscope, whistling off-key while he manufactured another conviction.

The smell was evidence. The smell was memory. The smell was thirty years of friendship rotting in cardboard boxes.`,
    annotations: [
      'Opens with specific, layered smells—not generic "musty"',
      '"Something chemical" creates mystery before explanation',
      'Connects physical sensation to memory and emotion',
      'Repetition of "the smell was" creates rhythm and escalation',
      'Synesthetic metaphor: "friendship rotting" makes abstract concrete',
    ],
  },

  microTensionExample: {
    passage: `Sarah\'s text was short. "Murphy's. Now. Come alone."

Jack read it twice. Sarah never texted in commands.

He grabbed his coat. Didn't check if it was raining. It was always raining.

Murphy's was six blocks away. He made it in four minutes. Would have made it in three, but his knee was acting up again—souvenir from a case he'd closed wrong, like all the others.`,
    annotations: [
      'Opens with unusual behavior—Sarah texting differently creates micro-tension',
      '"Read it twice" shows Jack registering wrongness without stating it',
      'Weather detail with resignation ("always raining") = character in single phrase',
      'Physical limitation (knee) does triple duty: realism, vulnerability, thematic guilt',
      'Every sentence adds tension or character—no filler, no pause in engagement',
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
// SENTENCE RHYTHM PATTERNS - Noir cadence
// ============================================================================
export const SENTENCE_RHYTHM = {
  description: 'Vary sentence length deliberately for noir cadence',
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
