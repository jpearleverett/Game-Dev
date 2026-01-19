/**
 * Story Bible - Canonical Facts for LLM Grounding
 *
 * This document contains ABSOLUTE FACTS that must never be contradicted.
 * The LLM must treat these as immutable ground truth when generating content.
 * Any deviation from these facts breaks story consistency.
 */

// ============================================================================
// TIMELINE - Jack Halloway's Life & Career (BEFORE the story begins)
// ============================================================================
export const TIMELINE = {
  jackHistory: {
    // Early life
    childhood: 'Jack grows up in a small town outside Ashport; quiet kid, preferred puzzles and maps to sports',
    18: 'Jack graduates high school with average grades; moves to Ashport for community college',

    // Education and first jobs
    17: 'Jack works nights stocking shelves at a pharmacy while taking general education classes; no clear career path',
    16: 'Jack gets a part-time job scanning old documents at the county courthouse; discovers he likes the work more than his classes',
    15: 'Jack drops out of college to work full-time as a file clerk at the Ashport City Records Office',

    // City records years
    14: 'Jack learns the city\'s filing systems inside and out; becomes the go-to person when someone needs an old permit or property record',
    13: 'Jack gets promoted to research assistant; spends his days pulling zoning maps, deed transfers, and building inspection reports for lawyers and city planners',
    12: 'Jack starts noticing when things don\'t match up: addresses that appear on one map but not another, streets renamed without explanation, buildings with permits filed after they were built',

    // Transition to investigation
    11: 'A lawyer offers Jack side work tracing property ownership for a real estate dispute; Jack finds a chain of shell companies in two days',
    10: 'Jack quits the Records Office to work for a small private investigation firm; takes a pay cut but gets to leave his desk',
    9: 'Jack learns skip tracing: finding people who don\'t want to be found by following paper trails, utility records, forwarding addresses',

    // Building skills
    8: 'Jack works his first missing person case; learns to walk neighborhoods, talk to bartenders, check bus station lockers',
    7: 'Jack develops a habit of using paper maps and handwritten notes; he trusts what he can hold in his hands',
    6: 'The PI firm closes; Jack starts freelancing for lawyers, insurance adjusters, and anyone who needs something found',

    // Freelance years
    5: 'Jack builds a reputation for finding information other investigators miss; he charges less than the big firms and works stranger hours',
    4: 'Jack takes a desk job at a corporate security company for stable income; hates sitting still and quits after eight months',
    3: 'Jack goes back to freelance work; rents a cheap office above a bar called Murphy\'s because the landlord doesn\'t ask questions',

    // The burnout
    2: [
      'Jack takes a missing persons case: a mother looking for her adult son who stopped returning calls',
      'Jack finds him in three weeks; the son had cut contact on purpose, was finally getting clean, didn\'t want his family involved',
      'Jack gives the mother the address anyway; it\'s what she paid for',
      'Two months later Jack reads that the son overdosed; the mother had shown up, there was a fight, he relapsed',
      'Jack can\'t prove the connection but can\'t stop thinking about it; stops taking missing persons cases',
      'Jack starts sleeping less, drinking more, letting his apartment go; work slows down because he stops returning calls',
    ],

    // Present day
    1: 'Jack is 29 years old, going through the motions; takes only simple jobs now, background checks and process serving, nothing that requires him to find anyone',
  },
  storyStart: {
    anchorDate: 'November 14, 2025', // Present day anchor - story begins on this date
    jackAge: 29,
    jackState: 'Burned out, depressed, scraping by on small jobs; still good at what he does but afraid of what happens when he actually finds something',
  },
};

// ============================================================================
// ABSOLUTE FACTS - These CANNOT be contradicted
// ============================================================================
export const ABSOLUTE_FACTS = {
  protagonist: {
    fullName: 'Jack Halloway',
    age: 29,
    formerTitle: 'Freelance investigator, former file clerk at Ashport City Records Office',
    currentStatus: 'Burned out and depressed; takes only simple jobs now, avoids anything that requires finding people',
    residence: 'A cramped office-sublet above Murphy\'s Bar (cheap rent, thin floorboards)',
    careerLength: 'About 10 years in records and investigation work',
    reputation: 'Used to be good at finding information others missed; now just going through the motions',
    vices: ['Drinking too much', 'Insomnia', 'Compulsive note-taking'],
    physicalState: 'Young but worn down; tired eyes, unshaven, clothes that haven\'t been washed in too long',
    burnout: 'A missing persons case ended badly two years ago; Jack found someone who didn\'t want to be found, and they died after he gave up the address',
  },

  antagonist: {
    trueName: 'Victoria Blackwell',
    aliasUsed: 'Victoria Blackwell',
    currentAge: 'Unknown (appears late 20s to mid 30s; may be misleading)',
    occupation: 'Information broker (public-facing), true role unknown',
    origin: 'Unknown; she claims Ashport has always had two maps, and Jack has only seen one',
    communication: {
      method: 'Black envelopes with a wax seal that never softens (even under heat)',
      ink: 'Silver ink that does not photograph cleanly and “moves” when stared at too long',
      scent: 'Sharp, clean, unsettling',
    },
    motivation: 'Force Jack to follow the symbols until he cannot pretend they are coincidence, then make him choose what to do with the hidden map',
    philosophy: '"A map is a promise. Break it, and the city breaks back."',
  },

  setting: {
    city: 'Ashport',
    atmosphere: 'Rain-soaked, neon-lit, perpetually overcast; streetlight halos, wet concrete, and too many reflections',
    tone: 'Modern mystery thriller that slowly reveals an original fantasy world threaded through the city’s infrastructure',
    coreMystery: 'Ashport has a second layer: a hidden topology (“the Under-Map”) accessed through symbol sequences and place-specific thresholds',
    keyLocations: {
      murphysBar: 'Bar beneath Jack\'s office',
      jackOffice: 'A tiny room above the bar; desk, filing cabinet, old maps on the walls from his records days',
      underbridgeMarket: 'A night market under the elevated tracks where “found” objects appear without provenance',
      civicArchive: 'Records office where Jack can access old zoning maps and vanished street plans',
      blackwellPenthouse: 'Glass and steel, commanding city view; feels like a room built to observe, not live',
      thresholdSites: 'Certain corners, stairwells, tunnels, and dead-ends that repeat symbol patterns at the edges of perception',
    },
  },

  // NOTE: Other characters (allies, antagonists, supporting cast) are not predefined.
  // The LLM has creative freedom to generate characters as the story requires.
  // Only Jack Halloway (protagonist) and Victoria Blackwell (antagonist) have canonical definitions.
};

// ============================================================================
// STORY STRUCTURE
// ============================================================================
export const STORY_STRUCTURE = {
  totalChapters: 12,
  subchaptersPerChapter: 3,
  chapter1A: 'Static content with branching choices (the dead letter with silver glyph)',
  chapter1BandC: 'Dynamically generated based on player branching choices in 1A',
  chapters2to12: 'Dynamically generated based on player choices',
  decisionPoints: 'End of each chapter (subchapter 3/C)',
  branchingPaths: 'Binary choices create exponential path combinations',

  // ========== CHAPTER 1 CONTEXT ==========
  // This is the canonical starting point for ALL story generation.
  // The LLM MUST use this as the foundation when generating 1B and 1C.
  chapter1AContext: {
    title: 'The Envelope',
    setting: 'Jack\'s office above Murphy\'s Bar, 2 AM, rainy night',
    events: [
      'Jack discovers a mysterious letter on his desk stamped "Return to Sender"',
      'The letter is addressed to "Victoria, c/o The Threshold, 404 Acheron Ave" - a street that was paved over 5 years ago',
      'The return address shows Jack\'s own handwriting, which he doesn\'t remember writing',
      'Inside is a photograph of the alley behind Murphy\'s with a silver glyph drawn on the door',
      'When Jack investigates the alley, the glyph is NOT visible on the actual door',
      'The photo reacts physically: it grows warm and the silver ink appears to move when near the door',
    ],
    keyMysteries: [
      'Who is Victoria?',
      'What is "The Threshold"?',
      'How did a letter appear in a locked room?',
      'Why is the glyph visible in the photo but not on the actual door?',
      'How was Jack\'s handwriting forged so perfectly?',
      'What is the silver ink, and why does it seem alive?',
    ],
    characterState: {
      jack: 'Suspicious, professionally skeptical, treating the impossible letter as evidence to be analyzed',
      atmosphere: 'Cold, damp, rain-soaked, bass from Murphy\'s jukebox vibrating through the floor',
    },
    continuesTo: {
      '1B': 'Jack investigates further, possibly seeking answers about the glyph, Victoria, or The Threshold',
      '1C': 'The investigation deepens, leading to a critical decision point that will shape the rest of the story',
    },
  },

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
    1: {
      type: 'INCITING_INCIDENT',
      description: 'The impossible arrives: Jack receives a letter he wrote but did not write, leading to a photo with living ink',
      wordCountModifier: 1.0,
      requirements: [
        'Continue from the dead letter discovery and silver glyph photo',
        'Jack investigates the impossible: the ink, the glyph, Victoria, The Threshold',
        'Build mystery without providing easy answers',
        'Establish the uncanny tone: things that should not exist, do',
        'End 1C with a decision that sets the investigation direction for Chapter 2',
      ],
      notes: '1A is static. 1B and 1C are generated based on player choices in 1A.',
    },
    2: {
      type: 'INVESTIGATION',
      description: 'Methodical evidence gathering, interview-heavy, building the case',
      wordCountModifier: 1.0, // Standard length
      requirements: ['Skeptical analysis', 'Discovery of new evidence', 'End with a mystery to follow'],
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
    tone: 'Literary mystery thriller with surreal pressure building at the edges of the real',
  },

  influences: [
    'Tana French (atmospheric dread, psychological interiority, the past haunting the present)',
    'China Miéville (inventive strangeness, urban uncanny, the city as organism)',
    'Jeff VanderMeer (the weird made concrete, ecological/surreal texture)',
    'Gillian Flynn (thriller propulsion, sharp turns, moral ambiguity)',
  ],

  mustInclude: [
    'Atmospheric descriptions rooted in place, weather, and reflections',
    'A sense of pattern: repeating shapes, echoed phrases, mirrored actions',
    'Symbols presented as concrete objects (chalk, ink, etching, scar, stain) not abstract “magic”',
    'Jack’s rational explanations first, his doubt arriving only after evidence piles up',
    'A mystery-forward plot: clues accrue, hypotheses form, revelations reframe',
    'Fantasy elements that feel new: unfamiliar beings, rules, and textures (NO medieval/Tolkien pastiche)',
  ],

  absolutelyForbidden: [
    'Em dashes (—) - use commas, periods, semicolons instead',
    '"X is not just Y, it\'s Z" constructions',
    'Constructions with the following sentence structure "The silver current didn\'t just move; it sang"',
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
    'Tolkien-style fantasy elements: elves, dwarves, orcs, medieval feudal courts, “ancient prophecies” as a crutch',
    'Generic “magic system” exposition dumps (rules must be learned through scenes)',
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
  'Jack always calls Victoria "Victoria" or "Blackwell."',
  // REALITY REVEAL TIMING (Critical pacing constraint)
  'Jack does NOT know the Under-Map is real until Chapter 1C.',
  'The first undeniable reveal that "the world is not what it seems" happens at the END of subchapter 1C (not earlier).',
  'Before the end of 1C, all anomalies must be plausibly deniable (graffiti, coincidence, stress, faulty lighting, bad maps).',
  'After 1C, Jack knows something is genuinely wrong with reality, but the full scope remains to be discovered.',

  // SETTING & ATMOSPHERE
  'Ashport is always damp, overcast, or recently rained; the city is defined by reflections, sodium streetlight halos, and neon smear on wet pavement.',
  'Murphy\'s Bar is directly below Jack\'s office (Jack can hear the jukebox through the floorboards).',
  'This is NOT medieval fantasy. The surface world is modern. The fantasy world is hidden, infrastructural, and uncanny.',

  // SYMBOL RULES (Core mystery engine)
  'Glyphs are called Dead Letters. They recur in the city and in Victoria\'s letters.',
  'Glyphs are not "spells." They are keys to thresholds, and they do not work everywhere.',
  'Silver ink in Victoria\'s letters does not photograph cleanly; attempts to capture it produce blurred or doubled lines.',

  // CHARACTER TRAITS (Immutable)
  'Jack\'s default coping mechanism is rationalization and documentation (notes, sketches, photos, maps).',
  'Victoria\'s presence is clean and unsettling: odd scent, calm diction, exact phrasing.',

  // THRILLER CONSTRAINTS (No Tolkien pastiche)
  'No elves/dwarves/orcs, no feudal courts, no "chosen one prophecy," no faux-Old English diction.',
  'Fantasy beings (if encountered) must feel unfamiliar and specific: more like living architecture, stitched light, or rule-bound anomalies than "classic races."',

  // CREATIVE FREEDOM
  'You may generate any supporting characters as the story requires.',
  'Character names, relationships, and arcs are flexible except for Jack and Victoria.',
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
  // IMPORTANT: Thinking tokens consume output budget! With default 'high' thinking,
  // the model may use 50-80% of tokens for reasoning before generating output.
  // Values below are generous to ensure quality output with full reasoning depth.
  // Gemini 3 Flash Preview: 1M input / 64k output per docs/gemini_3_developer_guide.md
  maxTokens: {
    subchapter: 65536,    // Gemini 3 max output - main narrative generation
    expansion: 8000,      // For expansion requests (currently disabled)
    validation: 2000,     // For simple validation passes (uses 'low' thinking)
    pathDecisions: 65536, // Same as subchapter - complex multi-path generation
    classification: 2000, // For personality classification (uses 'low' thinking)
    arcPlanning: 16000,   // Complex multi-chapter arc planning (uses 'high' thinking)
    outline: 8000,        // Chapter outlines and decision generation (uses 'high' thinking)
    consequences: 4000,   // Consequence generation (uses 'high' thinking by default)
    llmValidation: 16000, // LLM-based semantic validation (uses 'low' thinking, but structured output)
  },

  // Word count requirements - optimized for fast background generation
  // NOTE: 3 segments (opening + firstChoice + ending) at 300-350 words each = 900-1050 words per path
  wordCount: {
    minimum: 900,         // 3×300 word segments minimum
    target: 1050,         // 3×350 word segments target
    maximum: 1400,        // Cap to ensure fast generation
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
      '"Christmas-morning-when-you\'re-eight kind of awake" - disturbing simile makes complicity feel childlike, innocent',
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

  // ========== REQUIRED BY StoryGenerationService.js ==========

  physicalEmotionExample: {
    passage: `Jimmy began to scream and ropes of spit shot from his mouth. Another cop came down the slope to help the one on top of Jimmy, and Sean turned away. Jimmy's scream blew out into the air as a low, guttural thing, nothing sharp or high-pitched to it, an animal's first stage of reckoning with grief.

Sean had heard the screams of a lot of victims' parents over the years. Always there was a plaintive character to them, a beseechment for God or reason to return, tell them it was all a dream. But Jimmy's scream had none of that, only love and rage, in equal quantity, shredding the birds from the trees and echoing into the Channel.`,
    annotations: [
      '"Ropes of spit" - grief rendered through visceral, undignified physical detail',
      '"Low, guttural thing" - sound described as object, as if grief has mass and shape',
      '"Animal\'s first stage of reckoning" - dehumanization shows depth of loss',
      'Comparison to other screams establishes narrator\'s experience, then subverts expectation',
      '"No plaintive character...no beseechment" - defining by what\'s ABSENT',
      '"Love and rage, in equal quantity" - the duality of grief made explicit',
      '"Shredding the birds from the trees" - hyperbole that FEELS true, not exaggerated',
      'Emotion externalized through physical effects on the world, not internal description',
    ],
  },

  dialogueSubtextExample: {
    passage: `"You still love her, though."
"Sure. Hell, I think she still loves me." He stubbed out his cigarette. "She calls me all the time. Calls me and doesn't talk."
"Wait, she— "
"I know," he said.
"— calls you up and doesn't say a word?"
"Yup. Been going on for about eight months now."
Annabeth laughed. "No offense, but that's the weirdest thing I've heard in a while."
"No argument." He watched a fly dart in and away from the bare lightbulb. "One of these days, I figure, she's gotta talk. That's what I'm holding out for."
He heard his half-assed chuckle die in the night and the echo of it embarrassed him.`,
    annotations: [
      'Surface conversation about phone calls; actual subject is devotion and hope',
      '"Calls me and doesn\'t talk" - the absurd detail reveals depth of connection',
      'Annabeth\'s interruption ("Wait, she—") shows genuine surprise, makes it real',
      '"Eight months" - specific duration adds weight, shows this is an ongoing wound',
      '"What I\'m holding out for" - vulnerability disguised as casual observation',
      '"Half-assed chuckle died...embarrassed him" - self-awareness about exposing too much',
      'Domestic detail (fly, lightbulb) grounds emotional revelation in mundane reality',
      'He reveals his heart while pretending to share an amusing anecdote',
    ],
  },

  tensionBuildingExample: {
    passage: `It was a dark brown car, square and long like the kind police detectives drove, a Plymouth or something, and its bumper stopped by their legs and the two cops looked out through the windshield at them, their faces watery in the reflected trees that swam across the glass.

Sean felt a sudden lurch in the morning, a shifting in the softness of it.

The driver got out. He looked like a cop— blond crew cut, red face, white shirt, black-and-gold nylon tie, the heft of his gut dropping over his belt buckle like a stack of pancakes. The other one looked sick. He was skinny and tired-looking and stayed in his seat, one hand gripping his skull through greasy black hair, staring into the side-view mirror as the three boys came around near the driver's door.`,
    annotations: [
      '"Dark brown car" - mundane description normalizes the approaching threat',
      '"Bumper stopped by their legs" - physical proximity creates implicit danger',
      '"Faces watery in reflected trees" - distortion suggests something wrong, unreal',
      '"Sudden lurch in the morning, shifting in softness" - threat changes TIME, not just mood',
      'Cop described through cop-like details first, normalizing - then "looked sick" disrupts',
      'Second man staying in car, gripping skull, staring at mirror - wrongness through behavior',
      'Boys "came around" to the door - they approach the threat, not flee it',
      'Tension built through accumulating wrong details, not through telling reader to be scared',
    ],
  },

  chapterHookExample: {
    passage: `Jimmy looked at the Flats spread out before him as he and the old man walked under the deep shade of the el tracks and neared the place where Crescent bottomed out and the freight trains rumbled past the old, ratty drive-in and the Penitentiary Channel beyond, and he knew— deep, deep in his chest— that they'd never see Dave Boyle again.`,
    annotations: [
      'Long sentence mimics walking, creates rhythm of approaching dread',
      'Geographic specificity (Crescent, el tracks, Channel) grounds the revelation in place',
      '"Penitentiary Channel" - the word "penitentiary" foreshadows imprisonment, punishment',
      '"Deep, deep in his chest" - repetition emphasizes the physical weight of knowing',
      '"They\'d never see Dave Boyle again" - declarative finality, no hedging',
      'The certainty is FELT, not reasoned - makes it prophetic, inevitable',
      'Chapter ends on loss becoming permanent - reader MUST continue to know what happened',
      'The hook works because it confirms the reader\'s worst fear without explaining it',
    ],
  },
};

// ============================================================================
// NEGATIVE EXAMPLES - What NOT to write (with explanations)
// ============================================================================
export const NEGATIVE_EXAMPLES = {
  tellDontShow: {
    badVersion: `Jack suddenly realized the symbols were magical, and he felt terrified and shocked. The world was not what it seemed, and everything changed forever. He couldn't help but feel like his life was over.`,
    problems: [
      '"Suddenly" - false urgency, tells instead of shows',
      '"Felt a wave of shock" - abstract emotion, not physical',
      '"Weight of the revelation" - cliché metaphor',
      '"Couldn\'t help but notice" - forbidden phrase, passive voice',
      '"In that moment" - filler phrase, adds nothing',
      '"Profound sense of betrayal" - abstract, tells reader what to feel',
    ],
    goodVersion: `The symbol on the paper did not sit still.

Jack blinked. Looked away. Looked back.

The silver line had shifted a hair to the left, as if it had decided it preferred that shape.

His thumbnail scraped the ink. It didn't smudge. It didn't lift. It didn't feel like anything at all, and that was the worst part. Paper had texture. Ink had drag. This had nothing.

Downstairs, Murphy's jukebox changed songs without anyone touching it.`,
    whyItWorks: [
      'Physical action (cup finding desk) shows dissociation',
      '"Didn\'t remember" shows shock through lost time',
      'One-word paragraph creates impact through isolation',
      'Specific (signature, handwriting) beats abstract (betrayal, shock)',
    ],
  },

  overwrittenDialogue: {
    badVersion: `"So the Under-Map is real and the glyphs are keys," Jack said, terrified. "This changes everything and I feel like I'm losing my mind."

"Yes," Victoria replied mysteriously. "You are the chosen one and you must fulfill the prophecy."`,
    problems: [
      'Adverb tags ("angrily," "desperately") tell what dialogue should show',
      'Characters explaining their emotions explicitly',
      'Dialogue too on-the-nose—people don\'t speak their subtext',
      'No physical action—talking heads',
      'Melodramatic phrasing ("everything we ever stood for")',
    ],
    goodVersion: `"You're sure this is just graffiti?" Sarah asked.

Jack kept his eyes on the photo. "It's paint. It's a marker. It's whatever it needs to be so I can sleep."

"Jack."

He swallowed. "If I say it out loud, then it's real."

Sarah didn't argue. She only slid the second photo across the table, the one taken three blocks away, same symbol, same angle, same line weight, like the city had traced it with the same hand.`,
    whyItWorks: [
      'Minimal dialogue does more than speeches',
      'Physical grounding (hand on desk) shows need for stability',
      '"Just the name" - narration notes the inadequacy of words',
      'The unanswered question is more damning than any answer',
      'Subtext (devastation, betrayal) lives beneath simple words',
    ],
  },

  flatPacing: {
    badVersion: `Jack went to the place. He saw a symbol. He was confused. Then he went somewhere else. He saw another symbol. It was spooky. Then he found a clue.`,
    problems: [
      'Every sentence same length and structure',
      'No variation in rhythm—monotonous',
      'Action without meaning or tension',
      '"Very interesting" - empty value judgment',
      'No sensory detail, no atmosphere',
      'Events listed rather than experienced',
    ],
    goodVersion: `The underpass smelled like wet pennies and old engines.

Jack stopped under the third pillar because that's where Tom's text said the mark would be.

It was there. Fresh. Too fresh. The concrete still glistened around the cut line as if it had been carved from inside the slab, not scratched onto it.

He raised his phone to photograph it. The screen showed the pillar. It showed his own hand.

Where the symbol should have been, there was only blur, a smear of silver that refused to resolve into a shape.`,
    whyItWorks: [
      'Varied sentence length creates rhythm',
      'Sensory details (rusty hinges, sound) establish atmosphere',
      'Short paragraphs create pacing, build tension',
      'Delayed recognition ("he knew that handwriting") creates dread',
      'Specific physical details (whisper of tape) make scene real',
    ],
  },

  heavyForeshadowing: {
    badVersion: `Jack looked at the symbol, not knowing this was the moment his life would change forever. Little did he know the Under-Map was about to reveal itself. Everything was about to become magical.`,
    problems: [
      '"Little did he know" - forbidden phrase, breaks immersion',
      'Tells reader something important is coming—destroys tension',
      '"Change everything forever" - vague, melodramatic',
      'Narrator intruding with future knowledge Jack doesn\'t have',
      'Promises impact instead of delivering it',
    ],
    goodVersion: `Jack folded the letter back into its envelope and told himself it was a prank.

He said it like a verdict, and for a few seconds he believed it.

Then the river-glass token on his desk clicked once against the wood, as if it had been nudged by a finger.

There was no finger.`,
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
      character: 'Will Jack forgive himself? Can he be redeemed? (Relationship questions)',
      threat: 'Will Victoria find him? Is Victoria ally or enemy? (Tension questions)',
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
      'The caller ID showed a number Jack knew by heart. His own.',
      'She didn\'t answer. Couldn\'t. Because standing behind her, gun drawn, was the last person Jack expected.',
      'He\'d always been the evidence.',
    ],
  },

  // Personal stakes escalation
  personalStakes: {
    description: 'What Jack personally loses should escalate through the story',
    progression: {
      chapters1to4: 'Jack\'s self-image and reputation at stake',
      chapters5to9: 'Jack\'s freedom and physical safety at stake',
      chapters10to12: 'Jack\'s redemption and legacy at stake',
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

  // The ticking clock
  tickingClock: {
    description: 'Time pressure should be FELT, not just mentioned',
    implementation: {
      element: 'What time-sensitive pressure exists (midnight meeting, 24 hours until threshold destroyed)',
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
      surface: '"Coffee?" She asked.',
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
