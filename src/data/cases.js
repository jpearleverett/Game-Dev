import { BRANCHING_OUTLIER_SETS } from './branchingOutliers';

const RAW_SEASON_ONE_CASES = [
    {
      id: 1,
      caseNumber: '001A',
      season: 1,
      day: 1,
      title: 'Midnight Delivery',
    mainTheme: { name: 'COMMUNICATION', icon: '✉️' },
    outlierTheme: { name: 'BEGINNINGS', icon: '🔓' },
    attempts: 4,
      dailyIntro:
        `Some confessions arrive at midnight. Some arrive seven years late. All of them cost something.`,
      briefing: {
        summary:
          'A midnight ultimatum drags Jack back into the Confessor\'s game the moment the black envelope hits his desk.',
        objectives: [
          'Trace every communication channel the Confessor weaponises to pull Jack onto the board.',
          'Flag the opening moves that signal how Day One will unfold.',
          'Lock the grid before attempts expire to earn the narrative drop.',
        ],
      },
      bridgeText: [
        "The first message always arrives when you're not looking. By the time you read it, the game has already begun.",
      ],

      evidenceBoard: {
        polaroids: [
          {
            id: '001A-confessor-arrival',
            imageKey: 'silas', // Fallback or placeholder if silence not avail, but using mapped keys
            imageKey: 'silence',
            title: 'MIDNIGHT VISITOR',
            subtitle: '2:47 AM ARRIVAL',
            detail: 'Perfumed stranger. No knock. Just the slide of paper under the door and the scent of expensive French perfume lingering like a ghost.',
          },
          {
            id: '001A-eleanor-call',
            imageKey: 'sparkle',
            title: 'ELEANOR\'S PLEA',
            subtitle: 'GREYSTONE EMERGENCY',
            detail: 'Sarah called at 3 AM. Eleanor Bellamy poisoned with ricin. She swore she was framed eight years ago. She swore there was a woman in red.',
          },
          {
            id: '001A-ultimatum-envelope',
            imageKey: 'default',
            title: 'BLACK ENVELOPE',
            subtitle: 'THE ULTIMATUM',
            detail: '"Twelve days. Twelve cases. One you closed without certainty." Heavy stock. Red wax seal. The game piece that started the clock.',
          },
        ],
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
        'MESSAGE',
      ],
      outlierWords: ['ORIGIN', 'START', 'FIRST', 'DAWN'],
    },
    clueSummaries: {
      main:
        'Every main-word is a way the Midnight Confessor pushes the investigation—letters, calls, dispatches—so spotting them proves you can follow her signal.',
      outliers: {
        ORIGIN: 'Points Jack straight back to the Emily Cross file he buried—the origin she demands he reopen.',
        START: 'Marks the first square in her twelve-day gauntlet and the moment the game truly begins.',
        FIRST: 'Reminds him there was a first innocent he ignored, and that certainty cut someone loose.',
        DAWN: 'Foreshadows the daily unlocks—he can rest, but the next reckoning arrives at dawn regardless.',
      },
    },
    narrative: [
        `Rain fell on Ashport the way memory falls on the guilty—relentless, cold, and impossible to outrun. My office sat four floors above street level, a corner box that smelled like yesterday's cigarettes and broken promises. Three hundred a month bought me water-stained walls and a view of Murphy's Bar, where neon script bled red through the window—GIRLS and DRINKS flickering like a dying heartbeat, painting everything in the color of old sins.

The clock said 2:47 AM. My body said older than that.

I needed sleep. What I had was Jameson in a coffee cup and the high-frequency whine of thirty years' worth of gunfire playing symphony in my skull. The bottle was half empty. Had been for three days. Same bottle. Same drunk. Same detective pretending retirement was a choice instead of a sentence.

Then I heard them—footsteps on the stairs.

Wrong. All wrong. Not the stumbling percussion of Murphy's refugees looking for a place to piss. Not the heavy tread of cops who still thought I might know something useful. These steps were a metronome. Precise. Someone who'd memorized which boards creaked and how to avoid them. Someone who'd practiced this approach the way a priest practices benediction—with intent and certainty and the quiet confidence of ritual.

My .38 Special was in the desk drawer, buried under case files I'd never finish and bills I couldn't pay. I had it in my hand before the shadow stopped outside my door. Old habits. The kind that keep you breathing when thinking would get you killed.

No knock. No introduction. Just the whisper of paper sliding under wood, intimate as a confession.

By the time I yanked the door open, the hallway was empty. Nothing but the ghost of perfume—something French and expensive, the kind that costs more than I made in a month back when I still made money. It hung in the air like an accusation, floral notes cut with something darker. Patchouli, maybe. Or regret.

The envelope lay on the threshold like a black tongue. Heavy paper. Red wax seal. My name in silver ink that caught the dying neon and turned it into something beautiful and terrible: *Detective Jack Halloway*.

Not "Former Detective." Not "Mr. Halloway." Someone who knew I still wore the title like a dead man wears his wedding ring—unable to take it off, unwilling to admit it doesn't mean anything anymore.

Inside, elegant script—the kind they teach at boarding schools where tuition costs more than my car:

**"Dearest Detective,**

**Twelve days. Twelve cases. Eleven you closed with absolute certainty. One you closed without it.**

**By the end, you'll understand what you took from me.**

**The game begins now.**

**—The Midnight Confessor"**

I read it three times. The paper was expensive—you could tell by the weight, by the way the ink sat on the surface instead of bleeding through. This wasn't some crank with a grudge and a laser printer. This was money. Old money. The kind that doesn't threaten—it promises.

Twelve cases. Eleven with certainty. One without.

The bourbon in my stomach turned to battery acid. Thirty years wearing a badge means cutting corners becomes second nature. You make assumptions. Take educated guesses and baptize them as facts. Call it intuition when it's really just exhaustion. I had more than one case I'd closed on fumes and arrogance. But which one haunted the Midnight Confessor?

My phone lit up, the screen turning my hands corpse-blue. Sarah Reeves. My former partner. The only cop who'd still take my calls at three in the morning, though I suspected that was less about loyalty and more about hoping I'd finally drunk myself to death so she could stop worrying.

"Tell me you're not involved." No hello. No preamble. Sarah had given up on pleasantries about the same time she'd given up on me.

"In what?"

"Eleanor Bellamy. Someone tried to poison her tonight at Greystone."

The name hit like a fist. Eleanor Bellamy. Eight years ago. Society widow with a weakness for gin and a dead husband who'd mysteriously ingested enough arsenic to kill a horse.

I'd closed that case in three weeks. Found arsenic in her tea set—the good china, the kind that costs a month's salary per plate. Found a sapphire necklace worth two hundred grand in her safety deposit box, purchased two days before her husband choked to death on his own tongue. Motive was clear as vodka: Richard Bellamy had money. Eleanor wanted it. Dead husbands don't contest prenups.

She'd sworn someone framed her. Kept talking about a woman in red. A mystery woman who'd visited Richard the night before he died. Mentioned her seventeen times in interrogation. I'd put it in my report and marked it *"unreliable—subject in denial, manufacturing alternative suspects."*

The evidence was perfect. I'd never questioned where perfect evidence comes from.

"What poison?" My voice came out rust and gravel.

"Ricin. Warden found a note under her dinner tray: *'The widow knows the truth. Ask her about the woman in red.'"*

My throat went to sandpaper. The woman in red. Eight years later and she was back.

"Jack, listen to me." Sarah's voice dropped to that register she used when she was about to deliver bad news. "Someone broke into Evidence Room C last night. Professional job. Knew exactly which lockers to hit, which cameras to avoid. Stole twelve case files. Your cases, Jack. Your biggest wins. The ones that made you a legend."

I looked at the black envelope again. The silver ink seemed to move in the neon light, like something alive. *Twelve cases. Twelve days.*

"Jack, if someone's targeting your old cases, you're either bait or the next victim." Sarah's voice had that edge she got when she was trying not to say *I told you so.* "Your call. But if Eleanor Bellamy dies tonight, that's on you too. Add it to the list."

"If Eleanor's innocent, I put her there. That's already on me."

"Everything's on you. That's your problem. You carry the world but never actually do anything about it." The line went dead. Sarah had gotten good at exits.

I grabbed my coat—the long one, charcoal gray, the one that had seen better decades. If Eleanor was innocent, I needed to hear it from her mouth. Needed to look in the eyes of someone whose life I'd destroyed and ask if I'd gotten it wrong.

And if I'd been wrong once, how many other times? Thirty years of certainty suddenly felt like thirty years of arrogance. The difference between the two is just perspective and consequences.

**[PUZZLE THEME: COMMUNICATION / OUTLIER: BEGINNINGS]**`,
      ],
    unknownMessage:
      '"Day One complete. You\'ve learned that evidence can be manufactured. That innocence can be bought and sold. That the woman in red was always there—you just refused to see her."',
  },
  {
      id: 2,
      caseNumber: '001B',
      season: 1,
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
          'Eleanor Bellamy finally speaks on her own terms, forcing Jack to confront the precision of the frame he ignored.',
        objectives: [
          "Follow Eleanor's account to catalogue every voice that contradicts Jack's original case file.",
          'Highlight the gemstone anomalies that prove evidence can be manufactured.',
          'Secure the full testimony before attempts run out to trigger Victoria’s next move.',
        ],
      },
      bridgeText: [
        'Prison keeps secrets better than confessionals. But some secrets are worth dying to tell.',
      ],
      evidenceBoard: {
        polaroids: [
          {
            id: '001B-visitation-booth',
            imageKey: 'sparkle',
            title: 'GREYSTONE VISIT',
            subtitle: 'DYING DECLARATION',
            detail: 'Eleanor looked like charcoal sketches of her former self. Shackled. Coughing blood. "Mrs. died when you sent me here."',
          },
          {
            id: '001B-scarlet-visitor',
            imageKey: 'silence',
            title: 'SCARLET VISITOR',
            subtitle: 'PRISON LOG',
            detail: 'A woman in red visited three weeks ago. Told Eleanor that Jack Halloway would come. That he would finally learn what certainty costs.',
          },
          {
            id: '001B-ricin-note',
            imageKey: 'default',
            title: 'RICIN NOTE',
            subtitle: 'TRAY MESSAGE',
            detail: '"The widow knows the truth. Ask her about the woman in red." Found under her dinner tray. A prompt, not just a threat.',
          },
        ],
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
          'WITNESS',
        ],
        outlierWords: ['SAPPHIRE', 'NECKLACE', 'JEWEL', 'STONE'],
      },
      clueSummaries: {
        main:
          'Every main-word tracks the testimony and access points that should have cleared Eleanor years ago.',
        outliers: {
          SAPPHIRE: 'Shines a light on the planted necklace that sank the trial.',
          NECKLACE: 'Names the forged heirloom that never appeared in Richard’s catalog.',
          JEWEL: 'Signals the luxury bait Victoria used to manufacture certainty.',
          STONE: 'Reminds Jack that every glittering clue was a weapon placed in plain sight.',
        },
      },
        narrative: [
          `Greystone Correctional squatted on the edge of Ashport like a tombstone in a suit. The smell hit me twenty yards from the entrance—industrial cleaner trying to mask the rot underneath, like perfume on a corpse. Inside was worse. Fluorescent lights that turned skin cadaver-gray. Cinder block walls painted that particular shade of institutional green that only exists in prisons and morgues. The air tasted like despair and disinfectant.

Eleanor Bellamy looked like God had sketched her in charcoal and then smudged the edges. Eight years inside had carved away everything soft—the widow who'd worn pearls to her arraignment was gone. What remained was bone, fury, and the kind of emptiness that comes from screaming so long you forget what your voice used to sound like.

They brought her into the visitors' room in shackles. Unnecessary. She was five-foot-three and couldn't have weighed more than a hundred pounds. But rules are rules, and the system loves its rules more than it loves reason.

"Detective Halloway." Not a question. A confirmation. The way you'd identify a tumor or a bullet wound. Something that had destroyed you from the inside.

"Mrs. Bellamy."

"It's Eleanor." Her voice was gravel and broken glass. "Mrs. died when you sent me here. Along with everything else I used to be." She coughed—wet, painful. The ricin had ravaged her throat, left it raw. "She said you'd come. Said you'd finally understand."

"Who?"

"The woman who visited three weeks ago." Eleanor leaned forward, her shackles singing their small song of captivity. "Elegant. Beautiful in that way that feels dangerous. Like looking at a painting of something that could kill you. Wearing perfume that cost more than this entire prison. I asked her name. She smiled and said, 'Tell him the woman in red sent her regards.'"

The air in the room got thinner. The woman in red. The phantom Eleanor had sworn existed. The one I'd marked as *fabrication* in my report.

"She said she was preparing something for you. An education, she called it. Said you'd learn what certainty costs when you measure it in years stolen from innocent people."

"Tell me about the night your husband died."

Eleanor's laugh was desert-dry. "Why? You didn't believe me the first ten times. Didn't believe me at the trial. Didn't believe my appeals. Why should I perform for you now?"

"Maybe I was wrong."

She laughed. Then coughed—hard, wet, the kind that brings blood. She spat into a tissue. Red on white. "Eight years for *maybe.* Eight years of eating food that tastes like cardboard and malice. Eight years of every door locked, every minute controlled. Eight years of missing my daughter's childhood. All for *maybe*."

"Eleanor, please—"

"Don't *Eleanor* me. Not now. Not after eight years of silence." But she kept talking anyway. Maybe because she'd been waiting eight years for someone to actually listen. "The woman in red came the night before Richard died. I was in bed. I heard them in his study. Their voices carried through the heating vents—our house was old, the kind with architecture that keeps no secrets."

She closed her eyes, remembering. "They were arguing. About money. About leverage. About secrets that could destroy people. Richard sounded terrified. I'd never heard him scared before. He said, 'You can't prove any of that.' And she laughed. Cold. Like winter in a voice. She said, 'I don't need to prove it. I just need people to believe it. And they will. Because I'm very good at building evidence.'"

Eleanor opened her eyes. They were the color of steel. "Then she said something I'll never forget: 'You're either with me or you're evidence.' Two days later, Richard was dead. Arsenic. And suddenly I was the obvious suspect."

"Why didn't you tell me?"

"I DID." The shout echoed off cinder block. A guard started moving. Eleanor waved him off, lowered her voice to something sharp and bitter. "I told you seventeen times. In interrogation. In statements. In the trial. I begged you to find her. You wrote it in your report: *'Subject fixated on phantom woman in red. Classic deflection. Unreliable.'" She smiled without humor. "You trusted tea sets more than people. Trusted arsenic residue more than my sworn testimony."

That landed. Those were my exact words. Written in blue ink on a report that sent her to Greystone for eight years. I'd been so certain. So goddamn sure of myself.

"The sapphire necklace," I said. "The two-hundred-thousand-dollar one in your safety deposit box. How do you explain that?"

"I can't. I never saw it before the trial." She leaned back, the chair creaking. "Richard cataloged every piece of jewelry I owned. Insurance purposes. He was meticulous about that kind of thing. Made a list every year, photographs and appraisals. That necklace wasn't in any catalog. It appeared in my deposit box like a ghost. Someone planted it."

"Who?"

"The woman who visited me three weeks ago. She wouldn't give me her name. But she told me everything else." Eleanor's breath came labored, each word costing her. "She said you'd destroyed something precious to her. That she'd spent seven years building the resources to destroy you back. That she'd been patient. Methodical. And now it was time for you to learn what you'd cost."

She met my eyes. Hers were dying. Mine felt ancient.

"She said something that stuck with me, Detective. She said, 'Innocence doesn't matter as much as certainty. Your detective was certain I was guilty. The system believed his certainty more than my truth.' Then she smiled. It was not a kind smile. She said, 'And Detective Halloway? He's guilty of the worst crime—being certain when he should have been curious.'"

Seven years. That timeline scratched at something in my memory like a rat in the walls. Insistent. Familiar. But I couldn't place it. Not yet.

Outside, rain had turned to sleet. Ashport's weather matched its soul—cold, hostile, and determined to make you miserable. My phone buzzed. Sarah:

**"Someone broke into Bellamy estate tonight. Anonymous tip said you'd be there. Don't go. It's a trap. And Jack? I mean it. DO NOT GO."**

I should've called it in. Should've coordinated with Sarah. Done it by the book. The right way. The safe way.

But I was Jack Halloway. I'd closed Eleanor's case in three weeks. I'd been certain then. Maybe certainty was the trap I kept walking into.

I turned the car toward the Bellamy estate. Into the trap. Into the rain. Into whatever the Midnight Confessor had planned.

Because the only thing worse than being wrong is never finding out.

My phone rang. Number I didn't recognize. I answered anyway—you don't ignore calls at three in the morning when someone's staging your destruction.

A woman's voice. Young. Terrified. Breathing like she'd been running.

"Detective Halloway? This is Maya. Maya Bellamy. Eleanor's daughter." Words tumbling over each other, desperate to get out. "My mother didn't kill Richard. I can prove it. I found documents—Richard's real financial records. He was being blackmailed. I have—"

Background sounds. A door opening. Heavy footsteps. Male voices, low and threatening.

"Maya?"

"I have to go. Don't trust—" Her voice dropped to a whisper, urgent, terrified. Then nothing. Dead air. The particular silence that comes when a phone is violently disconnected.

I tried calling back. Got the disconnect tone—that three-note melody that means the number doesn't exist anymore. Burner phone. Probably in pieces in a dumpster by now.

Behind me, headlights bloomed in the rearview mirror. Black sedan. Following too close. Not even pretending to be subtle.

My phone buzzed. Text from unknown number:

**"Maya Bellamy is safe, Detective. She's with me. We're having tea and discussing her mother's innocence. Such a sweet girl. So trusting. Come to the Bellamy estate. See what truth looks like when you finally bother to look for it. —M.C."**

Attached: a photo. Maya Bellamy sitting in an expensive penthouse—floor-to-ceiling windows, modern furniture, the kind of wealth that doesn't need to announce itself. She was drinking tea from delicate china. Alive. Unharmed. But her eyes had that glassy look of someone in shock. The look of a civilian who'd just learned that the world is crueler than she'd imagined.

I drove toward the Bellamy estate through Ashport's rain, watching the black sedan follow three car lengths back. Professional distance. Not trying to hide. Wanting me to know I was being herded.

The city blurred past—neon and streetlights reflecting off wet pavement, turning everything into an impressionist painting of urban decay. I'd lived here forty years. Thought I knew every street, every corner, every shadow. Now I realized I'd never actually *seen* Ashport. I'd just moved through it with my eyes closed and my certainty up, arresting people and closing cases and never once asking if I was building something or just breaking it down.

Everything I'd built was about to burn. Maybe it deserved to.

**[OUTLIER THEME: GEMSTONES]**`,
      ],
      unknownMessage:
        '"Maya Bellamy is safe, Detective. She\'s with me. We\'re discussing her mother\'s innocence. Come to the Bellamy estate. See what truth looks like when you finally bother to look. —M.C."',
  },
  {
      id: 3,
      caseNumber: '001C',
      season: 1,
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
          'Another break-in at the Bellamy estate exposes the falsified evidence Jack once accepted without question.',
        objectives: [
          'Comb the estate for every overlooked clue that proves the frame was staged.',
          'Track the Confessor’s chess metaphors to anticipate her next move.',
          'Secure the grid before your attempts expire to unlock the next narrative drop.',
        ],
      },
      bridgeText: [
        'Sometimes evidence tells the truth. Sometimes it tells the story someone needed you to believe.',
      ],

      evidenceBoard: {
        polaroids: [
          {
            id: '001C-ruined-study',
            imageKey: 'default',
            title: 'BELLAMY STUDY',
            subtitle: 'CRACKED SAFE',
            detail: 'Richard\'s study. The safe was empty. The jewelry catalog was missing. Proof that the sapphire necklace was never recorded in his meticulous logs.',
          },
          {
            id: '001C-day-one-pawn',
            imageKey: 'silence',
            title: 'OBSIDIAN PAWN',
            subtitle: 'GAME PIECE',
            detail: 'Left on the desk. "DAY ONE: THE INNOCENT SUFFER." A heavy stone token marking the first casualty of the Confessor\'s lesson.',
          },
          {
            id: '001C-sarah-sweep',
            imageKey: 'voice',
            title: 'SARAH REEVES',
            subtitle: 'PARTNER SWEEP',
            detail: 'Sarah beat me to the scene. Found the break-in. Warned me that seven years ago, Emily Cross disappeared.',
          },
        ],
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
          'EVIDENCE',
        ],
        outlierWords: ['PAWN', 'KNIGHT', 'BISHOP', 'CHECK'],
      },
      clueSummaries: {
        main:
          'Main words catalogue the evidence trail Jack ignored inside the Bellamy estate.',
        outliers: {
          PAWN: 'Marks the first chess piece Victoria uses to grade his progress.',
          KNIGHT: 'Hints at the unseen moves already positioned against Jack.',
          BISHOP: 'Signals the diagonal strikes—evidence that cuts across his assumptions.',
          CHECK: 'Warns that the Confessor is measuring how close she is to cornering him.',
        },
      },
      narrative: [
          `The Bellamy estate sat on three acres of manicured despair. Once upon a time, it had been the kind of house that appeared in architectural magazines—Victorian bones with modern renovations, the perfect marriage of old money and new taste. Now it was a mausoleum. Eight years of abandonment had turned elegance into rot. Overgrown hedges. Windows dark as dead eyes. The fountain in the circular driveway was dry, full of dead leaves and the skeletons of small things that had crawled in looking for water and never found it.

The front door was open. Not kicked in. Not forced. Just open. An invitation or a trap. In my experience, they were usually the same thing.

I drew the .38 Special and went in.

The house smelled like dust and memory and the particular silence of places where bad things happened. My footsteps echoed on marble floors. Furniture was still here, covered in sheets like ghosts. Pictures still on the walls—Richard and Eleanor at charity galas, on vacations, at their wedding. Smiling. Back when they'd been alive in all the ways that mattered.

Richard's study was at the end of the hall. Light bled underneath the door—thin and yellow, like something poisonous. I kicked it open, gun raised, heart hammering.

Sarah Reeves sat in Richard's leather chair behind his mahogany desk, hands raised, looking more annoyed than afraid.

"Jesus Christ, Jack. You trying to give me a heart attack?"

"What the hell are you doing here?" I holstered the gun, hands shaking from adrenaline.

"My job. Which apparently includes following you around and stopping you from contaminating crime scenes." She stood, moved to the wall behind the desk where a painting hung—some pastoral scene that probably cost more than I'd make in five years. Behind it, the safe. Door open. Empty. "Someone opened this tonight. Professional job. Knew the combination or had tools good enough that it didn't matter. Took everything."

"Richard's jewelry catalog," I said.

"How'd you know that?"

"Eleanor told me. Said Richard cataloged every piece of jewelry she owned. That sapphire necklace—the one that sent her to prison—it was never in the catalog. Someone planted it. Perfect evidence that appeared out of nowhere."

Sarah studied me with those cop eyes she'd perfected over thirteen years as my partner. The ones that could tell when you were lying, when you were scared, and when you were finally, devastatingly right.

"You believe her."

"I'm starting to think I should have believed her eight years ago."

"I'm starting to think I was wrong." The words tasted like pennies. "Someone's been planning this for seven years. Someone with money, connections, and the patience to build a case against me the same way I built cases against them. Methodical. Perfect. Impossible to refute."

"Seven years," Sarah repeated, her detective brain already running permutations. "That's specific. Not five. Not ten. Seven. What happened seven years ago?"

I ran through my cases. That year I'd closed thirty-seven. Murders, assaults, robberies, fraud. I'd been at the peak of my career—the legendary Jack Halloway, best clearance rate in Ashport history. But one case stuck out like a broken tooth.

"Emily Cross," I said. "Art student. Twenty-two. Found in the Ashport River. I closed it in three weeks, ruled it a mob hit."

Sarah's face changed. "The one Captain Morrison called 'tying a bow on a corpse'?"

"Yeah." The memory tasted sour. "Body was badly decomposed. Dental records were a maybe. But we were under pressure—the mayor wanted it closed before it affected tourism. So I found enough evidence to call it solved. Moved on. Maybe I should've kept looking."

"Maybe?" Sarah's voice had an edge. "Jack, that case haunted you. I remember you used to drink more after we closed it. I asked if you were okay. You said you were fine. You said the evidence was clear."

"I lied. To you. To myself. To everyone." I sat down in one of Richard's expensive chairs. It creaked under my weight. "The evidence was enough. Not clear. Just enough. I was tired. I wanted the win. So I took it."

Sarah crossed her arms. That pose she got when she was processing something she didn't want to accept. "You think this is about Emily Cross?"

"I think someone believes I failed her. And now they're making me pay for it. Twelve cases. Twelve days. Starting with Eleanor—another woman I failed. Maybe it's all connected. Maybe the Midnight Confessor is telling me a story, one case at a time, until I finally understand what I've been doing wrong for thirty years."

On the desk, centered on the blotter like an offering: a black chess piece. A pawn. Obsidian, carved with precision, catching the light like something alive. I picked it up. Heavy. Real stone. Expensive.

Carved into the base in delicate script: **"DAY ONE: THE INNOCENT SUFFER."**

A game piece. A message. A promise of eleven more days to come.

My phone buzzed. I looked at the screen and felt something cold settle in my chest.

A photo. Taken tonight. Inside my office. Someone sitting in my chair—I could see the silhouette through the window behind them. On the desk, laid out like evidence: Emily Cross's case file. The one I'd archived seven years ago and tried to forget.

Caption: **"She's not dead, Detective. She never was. You just needed her to be. You needed the case closed more than you needed the truth. So you made a body fit. Made dental records 'close enough.' Made a theory into fact. And Emily Cross disappeared. Not into the river. Just... disappeared. While you collected commendations."**

Another photo. Newspaper clipping, yellowed with age. *Emily Cross with mentor Richard Bellamy at her debut gallery opening. Rising star in Ashport's art scene brings fresh perspective to classical themes.*

The woman in the photo was young, beautiful, dark hair falling in waves. Wearing a red dress. Smiling. But there was something in her eyes—even in the grainy newsprint reproduction, I could see it. A shadow. Like she was looking at something just off-camera that scared her.

And there was something familiar about that face. The angle of the jaw. The way she held herself. Something I couldn't quite place but that itched at my memory like a word on the tip of my tongue.

"Emily Cross," I said slowly, the pieces starting to fit together in ways I didn't like. "Seven years ago. What if she's not dead?"

Sarah went very still. "Jack, the body was pulled from the river. You identified it."

"A body was pulled. Badly decomposed. Dental records were marginal—the ME said seventy percent match. I called it good enough because I needed it to be good enough." I stood, pacing, the chess piece still in my hand. "What if someone faked the identification? What if Emily survived whatever happened to her? What if she came back?"

"Came back for what?"

"For this. For revenge. For justice. For whatever you call it when someone makes you understand what you took from them." I turned to Sarah. "You mentioned Victoria Ashford in the car. The woman who appeared out of nowhere seven years ago. Impossibly wealthy. Connected to everyone who matters. You think she's connected to Emily?"

"I don't know." Sarah pulled out her phone, started pulling up files. "But the timeline matches. Emily disappeared seven years ago. Victoria appeared seven years ago—I can't find any record of her before that. No birth certificate. No school records. Nothing. Like she materialized fully formed with a fortune and a grudge."

She showed me her screen—Victoria Ashford. Society photos. Charity galas. Art openings. Always in red. Always beautiful. Always slightly out of focus, like she didn't want to be clearly photographed.

"And Victoria knows details about your cases that only someone with serious resources and motivation could find. Details that aren't in public records. Details that would take years of patient investigation to uncover."

Another text arrived. The phone buzzed in my hand like a living thing.

**"Day One complete, Detective. Congratulations. You've learned that evidence can be manufactured. That innocence can be bought and sold like any other commodity. That the woman in red Eleanor Bellamy swore she saw wasn't a phantom or a delusion or a convenient lie. She was real. She was always there. You just refused to see her.**

**Tomorrow brings a businessman's fall. A daughter who paid for her father's sins. A partner's betrayal that cuts deeper than you can imagine.**

**Sleep well tonight, Jack Halloway. If you can.**

**—The Midnight Confessor"**

Final photo. This one hit like a bullet.

Emily Cross. Seven years ago. Standing in this very study. Right where Sarah and I were standing. With Richard Bellamy. Too close. His hand on her shoulder, possessive. She was wearing a red dress—the same one from the gallery opening photo. Looking young and beautiful and deeply, desperately uncomfortable.

The woman in red. She'd been real all along. Eleanor Bellamy hadn't been lying or delusional or manufacturing suspects.

She'd been right.

And I'd called her crazy. Written it in my report. Used it to convict her.

Sarah grabbed my arm. Her fingers were cold. "Jack. We need to leave. Now. This house is compromised. We're being watched. And whoever the Midnight Confessor is, they know exactly where we are and what we're finding."

"She's not going to kill me." I looked around the study—at the empty safe, the covered furniture, the photos of a life that used to be. "This isn't about killing. She's going to make me live with what I did. Day by day. Case by case. One revelation at a time. Until I understand completely. Until it's so deep in my bones that I can never forget."

We stood in Richard Bellamy's study, surrounded by dust and ruin and the ghosts of all the lives that had ended or been broken in this room. I felt something vast and patient settling around me like a net. Like gravity. Like fate.

This wasn't revenge. Not really.

It was curriculum.

The Midnight Confessor was teaching me. And I had eleven more days of lessons to learn.

Sarah's phone rang. The sound was too loud in the dead silence of the estate. She answered, listened, and I watched her face go through stages of comprehension. Confusion. Understanding. Horror. The gray that settles into skin when you realize how outmatched you are.

"Understood. Yes. I'll tell him." She hung up. Looked at me with something like pity. "Maya Bellamy just walked into the precinct. Alone. Unharmed. Says a woman named Victoria picked her up after her car broke down on Riverside Drive. Gave her a ride home. Made her tea. They talked about Eleanor's case. Maya says Victoria was 'lovely.' Said she seemed genuinely concerned about justice. About truth."

Sarah's jaw tightened. "Maya has no idea who Victoria really is. Thinks she's just a concerned citizen. A philanthropist interested in wrongful conviction cases."

"Victoria's sending a message."

"What message?"

"That she can get to anyone. Anywhere. Anytime." I looked at the chess piece in my hand. A pawn. The weakest piece on the board. "That she has resources I can't match. Reach I can't counter. That there's nothing I can do to stop her. I'm not playing defense. I'm not even playing the same game. She's three moves ahead and I don't even know all the pieces."

I set the pawn on Richard's desk. It stood there in the lamplight, small and dark and patient.

Day One was over. I'd learned that Eleanor Bellamy might be innocent. That the woman in red was real. That someone had spent seven years planning my destruction with the precision of a master craftsman.

Eleven days to go.

Twelve cases to revisit.

And somewhere in Ashport, Emily Cross—or Victoria Ashford, or whoever she'd become—was watching. Waiting. Counting down.

Somewhere in Ashport's rain, Emily Cross—Victoria Ashford—the woman I'd declared dead seven years ago because closing the case was easier than finding the truth—was smiling.

Not with pleasure. I didn't think. But with satisfaction. The satisfaction of a chess master who'd just opened with a move so perfect that the outcome was inevitable. All that remained was watching me figure it out. Move by move. Day by day. Case by case.

The game had just begun.

And I'd already lost.

I just didn't know the score yet.

**[OUTLIER THEME: CHESS PIECES]**`,
      ],
      unknownMessage:
        '"Day One complete. You\'ve learned that evidence can be manufactured. That innocence can be bought and sold. That the woman in red was always there—you just refused to see her."',
  },
  {
      id: 4,
      caseNumber: '002A',
      season: 1,
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
          'Claire Thornhill reopens her father’s case, demanding Jack dismantle the crime scene he once accepted without question.',
        objectives: [
          'Group the legitimate scene tools to rebuild how the investigation should have looked.',
          'Spot every sign of a cover-up that kept Silas Reed’s involvement buried.',
          'Beat the attempt timer so Claire releases the files that expose the frame.',
        ],
      },
      bridgeText: [
        'The evidence was perfect. The conviction certain. The truth seven years buried. Until his daughter started digging.',
      ],

      evidenceBoard: {
        polaroids: [
          {
            id: '002A-claire-dossier',
            imageKey: 'voice',
            title: 'CLAIRE THORNHILL',
            subtitle: 'DAUGHTER\'S GRIEF',
            detail: 'Waitress at the Blueline. Eyes full of rage. She\'s been documenting my failures for four years, ever since her father died in my custody.',
          },
          {
            id: '002A-silas-surveillance',
            imageKey: 'keeper',
            title: 'SILAS REED',
            subtitle: 'PARTNER SIGNATURE',
            detail: 'Claire\'s evidence points to Silas. He signed the witness statements. He handled the transfer records. He smoothed the edges.',
          },
          {
            id: '002A-blueline-backroom',
            imageKey: 'default',
            title: 'BLUELINE DINER',
            subtitle: 'MIDNIGHT COFFEE',
            detail: 'A booth patched with duct tape. Claire served coffee and truth. "Trust is just another word for blindness," she said.',
          },
        ],
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
          'MARK',
        ],
        outlierWords: ['BLEACH', 'WIPE', 'ALIBI', 'SCRUB'],
      },
      clueSummaries: {
        main:
          'Every main-word is a standard crime-scene tool, underscoring how professional the Thornhill setup looked until you start questioning it.',
        outliers: {
          BLEACH: 'Signals the chemical Silas used to erase traces and why the photos were too clean.',
          WIPE: 'Points to the forced fingerprint narrative—those surfaces were scrubbed for a reason.',
          ALIBI: 'Flags the fabricated timeline Silas constructed to keep eyes off his offshore transfers.',
          SCRUB: 'Reminds Jack that someone actively removed evidence long after the scene was sealed.',
        },
      },
      narrative: [
          `Dawn broke like a wound over Ashport. Bruised sky hemorrhaging gray light through my office window. I hadn't slept. Hadn't tried. Sleep was for people who didn't have ghosts cataloging their failures.

My office smelled wrong—perfume lingering like accusations. That French cologne again, expensive and deliberate. Victoria had been here. While I was at Greystone watching Eleanor cough blood, Victoria had walked through my sanctuary, touching my things, leaving her scent like a territorial predator marking prey.

Nothing obviously moved. But everything felt violated.

On my desk: a black chess knight, carved from obsidian, positioned precisely in the center of the blotter. Beside it, an envelope. Black paper. Red wax. My name in silver ink that caught the dying neon from Murphy's Bar below.

And something else. Something worse.

Crime scene photos. Marcus Thornhill's death. The lockup cell. The bedsheet noose. His face purple and swollen, tongue protruding like a final accusation. I'd closed that case in six hours. Suicide. Open and shut. Another file cleared, another conviction sealed, another notch in my legend.

But someone had gone through these photos with a red pen. Surgical annotations. Clinical dissection of my incompetence.

*"EVIDENCE PLANTED"* written across the sheet that shouldn't have been in his cell—high-thread-count Egyptian cotton in a facility that issued sandpaper polyester.

*"WITNESS COERCED"* beside the guard's statement, with timestamps showing he'd been off-shift when he claimed to have checked on Thornhill.

*"SCENE CONTAMINATED"* circling my footprints through the cell before forensics arrived, because I'd been so goddamn certain it was suicide I'd walked right through the crime scene like I owned death itself.

Someone had turned my greatest hits into a catalog of failures. Every shortcut. Every assumption. Every moment of arrogant certainty that had sent an innocent man to his death.

I opened the envelope. Her handwriting was elegant. Mocking. Beautiful the way poison is beautiful in crystal glasses.

**"Day Two, Detective. Remember Marcus Thornhill? CFO. Embezzler. Suicide in lockup. You closed that case before his daughter could say goodbye. She remembers. She's been photographing your crime scene failures for seven years. Documenting. Cataloging. Building a case against the great Jack Halloway. She works mornings at the Blueline. 5th and Morrison. Between the pawn shop where she sold her mother's wedding ring and the check-cashing place where she cashes the pittance that keeps her alive. Go see what your certainty costs. —M.C."**

Business card attached: **BLUELINE DINER. Claire Thornhill. Morning Shift. Coffee $2. Answers: Priceless.**

I called Sarah. Four rings before she answered, voice rough with sleep and suspicion.

"This better be good, Jack."

"Marcus Thornhill. Four years ago. What do you remember?"

Silence. Sheets rustling. The sound of someone sitting up, instantly awake. "Embezzlement. Eight million. Offshore accounts in Cayman. Suicide in lockup three days after arraignment. Why?"

"Run me through the evidence."

"At four in the morning?"

"Sarah."

Another pause. I heard her laptop opening. Keys clicking. "Shell corporations. Wire transfers. Digital trail leading directly to his personal accounts. Prosecution had seventeen bankers testifying. Six forensic accountants. Perfect paper trail. Silas provided witness statements from colleagues. Tom Wade certified the digital evidence chain. Open and shut. Thornhill hanged himself before trial. Case closed." She stopped typing. "Jack. What's happening?"

"What if it was too perfect?"

"Jesus Christ." Not a question. Understanding. "Victoria got to you."

"Victoria got to Thornhill's daughter. She's been investigating for four years. Apparently I missed some things."

"You miss a lot of things when you're too busy being a legend." She hung up.

I deserved that. Deserved worse.

---

The Blueline Diner squatted between institutional failures like a monument to broken dreams. To the left: Sam's Pawn & Loan, its window displaying wedding rings, guitars, and desperation. To the right: FastCash Check Cashing, promising money now, dignity never. The diner itself looked like it had given up sometime in the seventies and was just running on inertia and grease.

Inside smelled like burnt coffee, cheap bacon, and shattered futures. Linoleum cracked and yellow. Booths patched with duct tape. Fluorescent lights humming like dying insects. A place where people came when they'd run out of better options.

Claire Thornhill moved through the tables like water through stones—efficient, necessary, inevitable. Late twenties but carrying fifty years of exhaustion. Hair pulled back tight. Uniform clean but worn thin from too many washes. Moving with the practiced economy of someone who'd learned that wasted motion meant wasted money.

She had her father's eyes. I'd stared at those eyes in interrogation. Watched them plead. Watched them break. Watched them go empty when he realized I wasn't listening.

Now his daughter wore them. Except hers weren't empty. They were full. Full of rage and grief and the particular fury that comes from watching someone you love destroyed by a system that doesn't care enough to even notice.

I sat at the counter. She approached with a coffeepot, not looking up.

"What can I get you?"

"Claire Thornhill?"

Her hand stopped mid-pour. She looked up. Recognition hit her face like a physical blow. Then the recognition hardened into something sharp and dangerous.

"Get out."

"I need to talk—"

"I need a lot of things. My father back. My mother not dead from grief. My scholarship reinstated. My life returned." She set down the coffeepot carefully. Too carefully. The way you handle things when you're imagining using them as weapons. "Get. The fuck. Out."

"I got a letter. About your father's case."

"Congratulations. I got a coffin. I got a second coffin six months later. I got twenty thousand in legal debt. I got kicked out of Northwestern. I got this shithole job at five-fifty an hour plus tips." She was smiling now. Not a friendly smile. A smile with teeth. "Order something or fuck off. Those are your choices."

Every eye in the diner was on us now. A cook watching through the window. An old man in a booth. A teenage mother feeding a baby. An audience to my public shaming.

"What if I was wrong?"

She laughed. Not ha-ha funny. The laugh you make when the universe reveals itself as a cosmic joke and you're the punchline. "Wrong. Oh, that's beautiful. That's poetry. Four years of me screaming I was wrong and no one listened. Four years of lawyers telling me I didn't have standing, cops telling me I was delusional, judges telling me to move on. Four years of working doubles at this grease trap, sleeping four hours a night, investigating in every spare second. And now—NOW—the great Detective Jack Halloway thinks maybe, possibly, he might have been WRONG."

She grabbed her jacket from under the counter. "Jimmy! I'm taking my break! If anyone needs coffee, they can pour it themselves!"

Outside, rain starting again. Always raining in Ashport. The city weeping or washing blood down the gutters, hard to tell which.

Claire lit a cigarette with hands that shook. Not fear. Rage. The kind that's been burning so long it's become part of your DNA.

"Let me guess. Someone's playing games with you. Someone's making you look bad. Someone's threatening your precious reputation. And suddenly you give a shit about my father."

"Someone's targeting me. Using my old cases. Your father's was Day Two."

"Day Two." She took a drag. "How cute. A countdown. A game. Meanwhile my father's been dead four years. My mother six months after. But hey, at least you get dramatic reveals and puzzle pieces. Must be fascinating."

"I want the truth."

"You HAD the truth!" She was yelling now. Not caring who heard. Past caring about anything. "My father told you the truth! In interrogation! In his cell! In letters! He told you he'd been framed! He gave you names! He begged you to look at the documents! And you said—" She pulled out a phone. Pulled up a video. My voice. Four years ago.

"Mr. Thornhill, the evidence is overwhelming. You had access. You had motive. You had opportunity. Whether you want to admit it or not, the facts are clear. I suggest you focus on making a deal rather than constructing elaborate conspiracy theories."

She stopped the video. "That's you. That's what you said when he tried to tell you about Silas Reed. You called it an 'elaborate conspiracy theory.' You said the facts were clear. You were so fucking certain."

The cigarette was burning down to her fingers. She didn't notice.

"Three weeks ago, a woman came here. Elegant. Beautiful. Looked like money and power and everything I used to think I'd be before your 'facts' destroyed my family. She sat at that counter. Ordered coffee. Left a thousand-dollar tip and an envelope."

She pulled it from her jacket. Black paper. Red wax. Already opened.

I took it. Read it.

**"Bravo, Jack. Claire has been a very busy girl. Four years of investigation. Four years of following paper trails you were too lazy to follow. Four years of finding witnesses you dismissed as unreliable. She has documents. The REAL transfer records. The ones that show the money went through shell companies your partner Silas Reed had access to. Yes. Your partner. The man you trusted. The man you worked with for eight years. The man who signed the documents that sent Marcus Thornhill to his death. Day Two's lesson: Trust is just another word for blindness. And you, Detective, have been blind for a very long time. —M.C."**

My stomach dropped into somewhere cold and dark.

"What documents?"

Claire pulled out her phone again. Swiped to photos. Financial records. Corporate filings. Signatures.

"I've been investigating for four years. Every spare moment. Every dollar I could save. I hired a forensic accountant—cost me eight thousand but he found it. The shell corporations the prosecution said my father created? They were registered through Crawford & Associates. A law firm that does legal work for Ashport PD."

She zoomed in on signatures. "Silas Reed. Signed as witness on six different incorporation documents. All backdated to look like my father created them. But the notary stamps are wrong. The paper stock doesn't match. The signatures don't hold up under forensic analysis."

Silas. My partner. My friend. The man who'd backed me up for eight years. Who'd been at my daughter's christening. Who'd helped me move after my divorce.

"Why didn't you bring this forward?"

"I TRIED!" She threw the cigarette down. "I filed motions. I contacted the DA. I went to the FBI. Every single person told me the same thing: I didn't have standing. The case was closed. My father was dead. I had no legal right to challenge a closed conviction. And besides—who was going to believe me over the great Jack Halloway? The detective who never gets it wrong?"

She lit another cigarette. Hand steadier now. Rage transformed into something colder. More focused.

"Every lawyer I contacted said the same thing: 'You're asking us to believe a decorated detective and his partner framed your father. That's an extraordinary claim. You don't have extraordinary evidence.' Except I DID. I had all of this. But it didn't matter. Because you were certain. And certainty is more powerful than truth."

She handed me a flash drive. "Everything's on there. The shell companies. The backdated documents. Silas Reed's signatures. The real money trail. Proof my father was framed. Proof you sent an innocent man to die because you couldn't be bothered to look past the perfect evidence someone gift-wrapped for you."

"I'm sorry."

"Fuck your sorry." But she said it quietly. Tiredly. Like she'd run out of rage and found only exhaustion underneath. "Sorry doesn't resurrect the dead. Sorry doesn't give me my scholarship back. Sorry doesn't make my mother's heart not give out from grief."

She turned to go back inside. Stopped.

"That woman—Victoria—she said something before she left. She said my father was one of five innocent people. That you'd meet them all. Day by day. One case at a time. Until you understood what your arrogance costs." Claire met my eyes. "She said most people never understand. That they die still believing they were heroes. But you? She thinks maybe you can learn. That maybe you're capable of understanding what you've done."

"What do you think?"

"I think it's four years too late. But maybe some other father gets saved because you finally learned your lesson." She dropped her cigarette. Ground it under her heel. "Don't thank me. I'm not helping you. I'm helping the next Marcus Thornhill. The one who might survive because you finally learned to look past perfect evidence."

She went back inside. The door closing was quieter than her father's cell door had been. But it sounded just as final.

I stood in the rain, holding proof my partner had destroyed an innocent man. Holding evidence I should have found four years ago if I'd been a detective instead of a legend.

Day Two. And I'd already learned trust was just another word for blindness.

But I hadn't learned who I could trust. Or if I could trust anyone at all.

Including myself.

**[PUZZLE THEME: CRIME SCENE / OUTLIER: COVER-UP]**`,
    ],
      unknownMessage:
        '"Day Two\'s lesson: Trust is just another word for blindness. —M.C."',
  },
    {
      id: 5,
      caseNumber: '002B',
      season: 1,
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
          'Silas Reed confesses to framing Marcus Thornhill, forcing Jack to confront the blind trust that fuelled the cover-up.',
        objectives: [
          'Trace Silas’s confession to map every point where leverage replaced evidence.',
          'Tag the blackmail vocabulary that reveals how the frame was maintained.',
          'Solve the grid before your attempts expire so Silas turns himself in.',
        ],
      },
      bridgeText: [
        'Some partners have your back. Some have a knife behind theirs.',
      ],

      evidenceBoard: {
        polaroids: [
          {
            id: '002B-silas-confession',
            imageKey: 'keeper',
            title: 'SILAS CONFESSES',
            subtitle: 'MARINA BALCONY',
            detail: 'Twenty-third floor. A glass of bourbon and a ruined career. He was blackmailed. "I sacrificed a stranger to save my family."',
          },
          {
            id: '002B-encrypted-orders',
            imageKey: 'buyer',
            title: 'SHADOW LEDGER',
            subtitle: 'BLACKMAIL ORDERS',
            detail: 'Encrypted files sent to Silas. Directives to frame Thornhill. "Sign here. Backdate this." The price of his secret.',
          },
          {
            id: '002B-marina-balcony',
            imageKey: 'default',
            title: 'MARINA TOWER',
            subtitle: 'THE FALL',
            detail: 'The view from the balcony costs six figures. Silas paid for it with Marcus Thornhill\'s life. Now he pays with his own.',
          },
        ],
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
          'CONFESSION',
        ],
        outlierWords: ['LEVERAGE', 'THREAT', 'PRESSURE', 'BARGAIN'],
      },
        clueSummaries: {
          main:
            'Main words trace the partnership Silas weaponised—and the duties Jack ignored.',
          outliers: {
            LEVERAGE: 'Names the secret Silas protected instead of the truth.',
            THREAT: 'Highlights the ultimatum that turned a detective into an accomplice.',
            PRESSURE: 'Captures the weight that kept him silent for seven years.',
            BARGAIN: 'Reminds Jack that every confession Silas gave was purchased with fear.',
          },
        },
      narrative: [
          `The Marina District rose from Ashport's waterfront like a middle finger to the rot below. Glass towers. Expensive cars. People who'd learned the secret: in this city, you either feed on the desperate or become them. No middle ground. No mercy for the in-between.

Silas Reed's building was all chrome and privilege. Twenty floors of people who'd climbed over bodies to get that view of the bay. I'd been here before. Christmas parties. His daughter's graduation. Standing on that balcony drinking good bourbon, feeling like kings surveying our kingdom.

We'd been idiots. Kings of garbage. Lords of lies.

The doorman recognized me. Expensive suit, practiced smile, the kind of discretion that costs six figures a year.

"Detective Halloway. Mr. Reed is expecting you. Twenty-third floor. He said to tell you the door's open."

He'd been expecting me. Of course he had. Victoria had sent him the same letter. The same warning. The same opportunity to confess before I arrived asking questions.

She was orchestrating this. Every move. Every revelation. Puppet master pulling strings while we danced our predetermined dance.

The elevator was mirrored. I watched myself rise—fifty-two years old, looking seventy, running on cigarettes and guilt. The face of a man who'd just learned his partner was corrupt. His best friend a fraud. His entire career built on lies someone else had manufactured and gift-wrapped.

Twenty-third floor. The doors opened to a private foyer. Silas's door stood ajar. Not casual. Deliberate. A man who'd decided to stop running and just wait for the bullet.

I drew the .38 anyway. Old habits. Trust nothing. Especially not open doors.

Inside was catalog-perfect. Mid-century modern. Everything expensive and tasteful. The kind of apartment you see in architecture magazines. Clean lines. Neutral colors. No soul. No warmth. Just money trying to fill the space where a life should be.

Silas sat on the balcony. Bourbon in a crystal glass. Watching the bay like it held answers. Like the water could wash him clean if he stared at it long enough.

"Took you long enough," he said without turning around.

I holstered the gun. Stepped onto the balcony. The wind was cold. Twenty-three floors up, everything looked small. People like ants. Cars like toys. The city reduced to something manageable. Something you could pretend you controlled.

"How'd you know I was coming?"

"Because I know you, Jack. Someone hands you a puzzle, you tear everything apart until you find the pieces that fit." He sipped bourbon. Good stuff. Single malt. Probably older than the lies that bought it. "Plus, I got a letter this morning. Black envelope. Red wax. Very dramatic. Said you'd figure it out. Said you'd come asking questions. Said I should tell you everything or she'd tell it for me. And I've learned—when Victoria Ashford gives you a choice, you take the one that hurts less."

"Victoria."

"That's what she's calling herself now." He finally turned. And I saw it—the exhaustion. The defeat. Gray in his beard that hadn't been there last month. Lines around his eyes carved by sleepless nights. The particular devastation that comes from carrying guilt so long it's become your skeleton.

"You want to know if I helped frame Marcus Thornhill. Answer's yes."

I'd prepared for denials. Excuses. Anything but honesty. It hit harder than I expected.

"Why?"

He laughed. Not humor. The sound people make when the universe's cruelty becomes so obvious you can either laugh or scream. "Why. That's the question, isn't it? Why do good men do evil things? Why do we destroy innocents? Why do we—"

"Silas."

"I'm gay, Jack."

The words landed like stones. Heavy. Final.

He stood. Walked to the railing. Looked out at the bay. "Married eighteen years. Two kids in private school. House in the suburbs. White picket fence. Everything perfect. Everything a lie. Because I'm gay. Have been my whole life. And seven years ago, someone found out."

The bourbon glass trembled in his hand.

"They sent photos. Me with a man I'd been seeing. Nothing explicit. Just intimate. Holding hands. Kissing. Living the life I couldn't have publicly because I was terrified." He drained the glass. Poured another. "The letter said I had forty-eight hours to decide: help them with a case or watch my family destroyed. My career ended. My entire life exposed."

"The Thornhill case."

"The Thornhill case. They sent documents. Told me where to sign. How to backdate them. Made it easy. Just my signature as a witness. Just a few dates changed. Just one man's life destroyed so mine stayed intact." He met my eyes. "And I told myself it was fine. Thornhill was probably guilty anyway. The evidence was there. I was just... smoothing the process. Making sure justice happened. That's what I told myself while I signed those papers."

"He wasn't guilty."

"I know that now. Knew it then, if I'm honest. But I was terrified. My sons were thirteen and fifteen. My wife was running for school board. My career—twenty years of work, Jack. Twenty years of being good at something. Being respected. Mattering." He laughed again. Bitter. "I chose all that over one man's life. And I'd do it again. That's what makes it worse. If I had to choose again—family or stranger—I'd choose family. Every time. I'm not even sorry about that part."

"You should be."

"Should I? What would you have done? If someone threatened Emma? Margaret? Would you have been noble? Would you have sacrificed your family for a stranger?" He turned. "Don't answer. I know you would. Because you're Jack Halloway. The legend. The one who always does right. Except you didn't do right either. You just never got caught choosing wrong."

That landed harder than it should have.

"Who was it? Who blackmailed you?"

"I don't know. All communication was encrypted. Dead drops in public places. Burner phones. I never saw a face. Never heard a voice that wasn't digitally distorted." He poured me bourbon without asking. I took it. "Three weeks ago, I got a final message. Said my part was done. Said you'd figure it out eventually. Said I should tell you everything or live with the knowledge that I'd destroyed an innocent man and never faced consequences."

"You could've come forward. Any time in the last seven years."

"Could've. Didn't." He sat down heavily. Looking every day of his fifty-five years. "You want to know why? Because I'm a coward. I watched you send Marcus Thornhill to prison. Watched him hang himself three days later. Watched his daughter's life implode. Watched Claire drop out of school, lose her scholarship, lose everything. And I said nothing. Did nothing. Because I was more afraid of being exposed than being guilty."

"Jesus, Silas."

"Don't. Don't act horrified. You did the same thing. Different method, same result. You took perfect evidence and never questioned where it came from. Never asked how I always found the right witness. Never wondered why our cases closed so cleanly." He drank. "We were partners, Jack. You think I could've done this without you being willfully blind? You LET me do it. Because it made you look good. Made us both look good. We were the best team in Ashport because we never asked inconvenient questions."

"That's not—"

"It is. And you know it. Victoria knows it. That's why she's doing this. Not to punish me. To make you see that you're not the victim here. You're the weapon. The tool. The perfect, arrogant detective who was so desperate to be the best that you'd ignore any evidence that complicated your narrative."

We sat in silence. Two corrupt cops. Two men who'd destroyed an innocent life to protect ourselves. Different methods. Same crime.

"You're turning yourself in," I said. Not a question.

"Today. I called my lawyer this morning. We have an appointment at FBI at four." He looked at his watch. "Two hours. Enough time to sit here and pretend I'm still the man my sons think I am."

"And then?"

"Then I go to prison. Lose my marriage. Lose my kids. Lose everything I destroyed Marcus Thornhill to protect. Funny how that works. I sacrificed a stranger to save my family. Now I lose both." He poured another drink. Hand steady now. Past trembling. Past caring. "Victoria wins. She always wins. Because she knows exactly what we fear. And she's patient enough to let us destroy ourselves."

My phone rang. Sarah. I answered.

"Jack, we've got a problem."

"Another one?"

"Maya Bellamy—Eleanor's daughter—she's missing."

The bourbon turned to acid in my stomach. "When?"

"This morning. Left her apartment at seven AM. Security footage shows a black Mercedes picking her up. She got in willingly. Smiling. Like she knew the driver."

"Get me that footage."

"Already sending it."

I checked my email. The video loaded. Maya Bellamy standing outside her building. Morning light. Coffee in hand. A black Mercedes S-Class pulling up. Tinted windows. Driver invisible.

But as the car pulled away, turning, the sun caught the window just right. One second. One glimpse.

A woman with dark hair. Red dress. Pale skin.

Victoria.

Victoria had Maya. And Maya had gotten in the car smiling. Like she trusted her. Like the woman in the Mercedes was a friend. A benefactor. Someone here to help.

I looked at Silas. He'd seen it too. On his phone. Same video. Victoria had sent it to both of us simultaneously. Showing us she was three moves ahead. Always. Forever.

"She's not going to hurt her," Silas said. "That's not Victoria's game. She only hurts guilty people. Maya's innocent. She's just a prop. A demonstration of power. A reminder that Victoria can get to anyone, anywhere, anytime."

"You sound like you know her well."

"I've been studying her for three weeks. Ever since that final message. Trying to understand who she is. What she wants. How to survive her." He turned off his phone. "She's not interested in collateral damage. She's interested in justice. Twisted, manipulative, illegal justice. But justice nonetheless. She won't hurt Maya. She'll use her to make a point. Then let her go."

"How can you be sure?"

"Because that's what she does. Every move calculated. Every revelation timed. She's not a monster, Jack. She's a victim who learned how to weaponize trauma. There's a difference."

"Is there?"

"I don't know anymore." He stood. Finished his bourbon. "Two hours until I turn myself in. What are you going to do?"

"Find Maya. Make sure Victoria knows she can't just—"

"Can't just what? Do exactly what we did? Manipulate evidence? Control outcomes? Use people as tools?" He walked to the door. "She learned from the best, Jack. She learned from us."

He left. Going to prepare for his confession. His fall. His transformation from decorated cop to convicted felon.

I stayed on the balcony. Looking out at Ashport. At the city we'd supposedly protected. At the kingdom we'd built on corpses.

My phone buzzed. Text from unknown number:

**"Maya Bellamy is safe, Detective. Enjoying afternoon tea. Learning about her mother's case. Learning what you did. What your partner did. What the system does to innocent people when guilty men don't do their jobs. Day Two, and you've learned trust is just another word for blindness. Tomorrow brings a warehouse. A reckoning. And the moment you realize the monster isn't Victoria. It's the reflection in your mirror. —M.C."**

Another text. Photo. Maya sitting in an expensive penthouse. Victoria beside her. Both drinking tea. Maya looking confused but unharmed. Victoria looking directly at the camera. Smiling.

Not a threat. A promise. That she was in control. That she'd always been in control. That every revelation, every horror, every moment of understanding was exactly what she'd planned.

Day Two. And I'd learned my partner was corrupt. My cases manufactured. My career built on a foundation of lies and blackmail and convenient blindness.

I stood there as the sun set over Ashport. The city turning gold. Beautiful the way poison is beautiful. The way dying things are beautiful in their final light.

And I understood: Victoria wasn't destroying me. I'd destroyed myself years ago. She was just making sure I couldn't look away from what I'd become.

**[OUTLIER THEME: BLACKMAIL]**`,
        ],
      unknownMessage:
        '"Day Two complete. You\'ve learned that trust is just another word for blindness. And you\'ve been blind for seven years."',
  },
    {
      id: 6,
      caseNumber: '002C',
      season: 1,
      day: 2,
      title: "The Daughter's Gambit",
      mainTheme: { name: 'CRIME SCENE', icon: '🩸' },
      outlierTheme: { name: 'REVENGE', icon: '🗡️' },
      attempts: 4,
      dailyIntro: `PREVIOUSLY: Silas Reed confessed through tears. Blackmailed seven years ago, signed documents that framed Marcus. Thirty years as partners. Jack never saw it. Never asked. Certainty made him blind.
The system protects itself. Victoria taught Silas that lesson first.`,
      briefing: {
        summary:
          'Victoria lures Jack to the penthouse with Maya Bellamy as bait, showcasing how far she’ll go to control the board.',
        objectives: [
          'Read the Confessor’s staging inside the penthouse to expose how revenge fuels her plan.',
          'Track every threat leveled at Maya so you can predict the next victim.',
          'Solve quickly to capture the evidence before Victoria changes the script again.',
        ],
      },
      bridgeText: [
        'Some meetings are warnings. Some are lessons in how powerless you really are.',
      ],

      evidenceBoard: {
        polaroids: [
          {
            id: '002C-maya-hostage',
            imageKey: 'sparkle',
            title: 'MAYA BELLAMY',
            subtitle: 'PENTHOUSE GUEST',
            detail: 'Drinking tea on a white leather sofa. Confused, terrified, but unharmed. A pawn used to demonstrate reach.',
          },
          {
            id: '002C-victoria-reveal',
            imageKey: 'silence',
            title: 'VICTORIA ASHFORD',
            subtitle: 'THE REVEAL',
            detail: 'Emily Cross, alive. In a deep red dress. "Certainty is just another word for blindness." She built an empire to teach this lesson.',
          },
          {
            id: '002C-blackwell-skyline',
            imageKey: 'default',
            title: 'BLACKWELL VIEW',
            subtitle: 'CITY OVERLOOK',
            detail: 'The entire city looks like a toy set from up here. Victoria watches Ashport burn from the highest tower.',
          },
        ],
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
          'POWER',
        ],
        outlierWords: ['PAYBACK', 'VENDETTA', 'SCORE', 'GRUDGE'],
      },
      clueSummaries: {
        main:
          'Main words track Victoria’s staging inside the penthouse and the leverage she flaunts.',
        outliers: {
          PAYBACK: 'Signals that every choice is designed to settle the score.',
          VENDETTA: 'Names the personal crusade driving the entire spectacle.',
          SCORE: 'Reminds Jack that Victoria is keeping tally for every injustice.',
          GRUDGE: 'Underscores that revenge is the currency Victoria deals in.',
        },
      },
      narrative: [
          `The text arrived at sunset. When the light was dying. When Ashport turned from gray to black without bothering with beauty in between.

Unknown number. But I knew who it was. Had known since the first black envelope. Since the chess piece. Since the moment I'd realized someone was orchestrating my destruction with the precision of a master playing against a novice.

**"Looking for Maya? She's safe. Enjoying afternoon tea and a view that costs more than you made in your entire career. I've told her some interesting stories about her mother. About you. About how justice really works in Ashport. She's confused. Scared. But unharmed. Come see for yourself. Blackwell Building. Penthouse. Come alone, Detective. Day Two deserves a proper ending. We both do. —V.A."**

Address attached. The Blackwell Building. Top floor. Most expensive real estate in Ashport. The kind of place where money doesn't just talk—it whispers, and entire governments bend to listen.

I called Sarah. "I've got Victoria's location."

"Don't." Not a request. A command. "Jack, it's a trap. Obviously a trap. Textbook. She wants you alone, vulnerable, where she controls every variable."

"She has Maya Bellamy."

"Then we go in tactical. SWAT. Negotiators. By the book. Not whatever suicide run you're planning."

"She said come alone. Two hours. If I don't show—"

"If you DO show, you might not come back." Her voice dropped. Changed. "Jack, listen to me. You're running on guilt and no sleep. You're not thinking clearly. Let me coordinate. Let me—"

"Two hours." I hung up.

Driving through Ashport at dusk. The city transitioning. Day shift going home. Night shift waking up. That in-between hour when predators hunt and prey realizes too late that safety was an illusion.

The Blackwell Building rose from downtown like a monument to inequality. Fifty floors of glass and steel. Each floor more expensive than the last. Ordinary people lived on floors one through ten. Rich people on twenty through thirty. And at the top? The people who'd learned that wealth wasn't about money—it was about power. About looking down at the world and knowing you were untouchable.

Victoria lived at the top. Of course she did.

The parking garage was empty. My car looked like poverty next to the Mercedes, Teslas, and one Bentley that probably cost more than my entire career earnings.

I found a keycard on my driver's seat. Black plastic. Silver lettering: **WELCOME, DETECTIVE HALLOWAY. PENTHOUSE ACCESS. DON'T KEEP HER WAITING.**

She'd been in my car. While I was with Silas. While I was learning my partner was corrupt. She'd walked to my vehicle, picked the lock or just used whatever high-tech tool rich criminals use, left the card, and disappeared.

Always three moves ahead. Always watching. Always in control.

The elevator required the keycard. I swiped it. The panel lit up. Only one button: PENTHOUSE. No other options. No escape routes. No choice but up.

The elevator was glass. I watched Ashport shrink below me. Watched the city reduce to lights and shadows. Watched my reflection in the glass—fifty-two, exhausted, running on fumes and failure. A man ascending to his judgment.

The elevator opened directly into the penthouse. No hallway. No foyer. Just immediate wealth. Floor-to-ceiling windows overlooking the entire city. Modern furniture that looked like art installations. Everything white and chrome and expensive. The kind of space that says: money isn't a concern, only power matters.

Maya Bellamy sat on a white leather sofa that probably cost five grand. Drinking tea from delicate china. Looking confused. Frightened. But alive. Unharmed.

She looked up when I entered. "Detective Halloway?"

"Maya. Are you okay?"

"I... I think so? Miss Ashford has been very kind. She picked me up this morning. Said she wanted to discuss my mother's case. That she had evidence Mom was innocent. That you were involved. That—" She looked around, bewildered. "What's happening?"

"Where is she?"

"Who?"

"Victoria."

"Miss Ashford? She's in the other room. She said you'd come. Said you always come. Said men like you can't resist puzzles even when the puzzle is a trap."

The bedroom door opened.

And Victoria Ashford walked out.

I'd seen photos. Security footage. Glimpses in cars. But nothing prepared me for the reality.

Tall. Five-ten in heels that added another three inches. Dark hair falling in waves to her shoulders. Red dress. Not scarlet. Not crimson. That deep, dark red that looks black until the light hits it right. Then it burns.

And her eyes. Christ, her eyes.

Blue. Sapphire blue. Cold enough to burn. Sharp enough to cut. Looking at me with an intensity that made me feel dissected. Cataloged. Understood completely.

Beautiful. Devastatingly beautiful. The kind of beauty that felt weaponized. Designed to distract. To disarm. To make you lower your guard right before she destroyed you.

She moved like liquid violence. Every step measured. Confident. A predator in her natural habitat, comfortable with the kill.

"Hello, Detective." Her voice was silk wrapped around razor blades. Smooth. Cultured. Dangerous. "Right on time. You're more predictable than you think."

"Let Maya go."

"Maya's free to leave anytime. Aren't you, dear?" Victoria smiled at her. Warm. Almost maternal. Then turned back to me. Ice. "But she won't. Because she wants to know if her mother is really innocent. If the great Jack Halloway actually destroyed eight years of Eleanor's life. Don't you, Maya?"

Maya looked between us. Terrified. Confused. But she didn't stand up.

"What do you want?"

"I want you to understand what your certainty costs." Victoria poured bourbon from a crystal decanter. Expensive bourbon. The kind you can taste the age in. "I want you to see the pattern you've been blind to for thirty years."

She handed me bourbon without asking. I took it. Needed it.

"You close cases, Detective. Perfect cases. Perfect evidence. Perfect convictions. But have you ever wondered where that perfect evidence comes from? Who benefits when you don't look too closely?"

"What are you talking about?"

"I'm talking about five innocent people rotting in prison because you were more interested in your clearance rate than truth. Eleanor Bellamy. Marcus Thornhill. Three others you haven't met yet." She sipped her bourbon. Watching me. "I'm talking about a system so corrupt it protects itself by making men like you feel like heroes."

She moved closer. Circling. Predator behavior.

"Your mother is innocent, Maya." Victoria's voice softened when she addressed her. Then turned back to ice for me. "Eleanor Bellamy didn't kill Richard. Someone else did. Someone with motive. Someone with access. Someone the great Jack Halloway never bothered to find because the evidence against Eleanor was so beautifully perfect."

"Who killed him?" Maya whispered.

"That's what Detective Halloway is going to find out. Aren't you, Detective?" Victoria walked to the window. Looked out at Ashport sprawling below. "Day Three brings a warehouse. Evidence. Proof of corruption that goes deeper than you imagine. You'll meet someone who documented everything. Someone who paid the price while you collected commendations."

"Why are you doing this?"

"Because someone has to." She turned. Her eyes catching the dying light. For a moment—just a moment—I saw something underneath the predator. Something wounded. Something that had learned to weaponize pain. "You've spent thirty years being certain. Being right. Being legendary. But certainty is just another word for blindness. And you've been blind so long, you can't even see the damage in your wake."

"Who are you?"

"Someone who cares about truth more than you ever did." She pressed a button. The elevator opened behind me. "Take Maya home. Make sure she understands: her mother is innocent. You destroyed Eleanor's life. And you're going to fix it. Or I'll destroy everything you have left. Family. Friends. Legacy. Everything. Clear?"

"Crystal."

"Good." Victoria walked back to the window. Dismissing me. "Day Three, Detective. And then Day Four. And Five. Twelve days. Twelve cases. By the end, you'll understand what your arrogance costs. What happens when detectives choose reputation over truth. When they send innocent people to rot because perfect evidence is easier than actual investigation."

She turned back, silhouetted against the dying light. "Now get out."

Maya stood. Shaking. We walked to the elevator in silence. As the doors closed, I looked back.

Victoria Ashford stood at the window. Red dress. Dark hair. Looking down at Ashport like a queen surveying her kingdom. Like someone who'd learned that power was the only protection against being destroyed by men like me.

She was wealthy. Connected. Impossibly precise in her orchestration. And she hated me with the focused intensity of someone who'd spent years planning this moment.

But who she was? Why she cared about my cases? What drove her to build an empire just to watch me fall?

I had no idea.

The elevator descended. Maya broke down crying. I should've comforted her. Should've said something. But I had nothing. No words. No comfort. Just the crushing weight of understanding that someone was three moves ahead and I didn't even know the game we were playing.

I dropped Maya at her apartment. She got out without speaking. Walked to her door. Stopped.

"Is it true? My mother is innocent?"

"Yes."

"And you knew? Or could have known?"

"I should have known. I didn't look hard enough. I trusted perfect evidence instead of actual investigation."

"My mother lost eight years. I lost my mother for eight years. Grew up without her. Missed—" Her voice broke. "She missed everything. Birthdays. Graduations. My first heartbreak. Everything. Because you couldn't be bothered to look past perfect evidence."

"I'm sorry."

"Everyone's sorry." She went inside. The door closing was quieter than it should have been. Softer than the damage warranted.

I sat in my car. Rain starting again. Always raining in Ashport.

My phone rang. Sarah.

"Are you alive?"

"Physically."

"And Maya?"

"Safe. Home. Traumatized but unharmed."

"What happened?"

"I met Victoria. She's... calculating. Powerful. Has resources I can't even comprehend. She knows every case I've worked. Every shortcut I took. Every corner I cut." I started the engine. "She talked about five innocent people. Eleanor. Marcus Thornhill. Three others I haven't met yet. She's orchestrating this whole thing to make me understand what my arrogance cost."

Silence. "Who is she, Jack? Where did she come from?"

"I don't know. She appeared—what, seven years ago? Impossibly wealthy. Connected to everyone who matters. She's built an empire in this city and I never even noticed until she decided to burn my life down." I looked up at the Blackwell Building. At the penthouse at the top. "She hates me. Specifically. Personally. This isn't just about justice. This is revenge."

"Revenge for what?"

"That's what I need to figure out. What did I do to her? When? How? She's spent years planning this. Building resources. Documenting my failures. Waiting for the perfect moment to strike." I pulled over. "Sarah, I need you to dig into Victoria Ashford. Everything. Where she came from. How she got her money. Who she's connected to. There has to be a reason she's targeting me specifically."

"You think you wronged her somehow? Personally?"

"I must have. People don't spend seven years building empires to destroy detectives they've never met. This is personal. I just don't know why yet." The words tasted like blood. "And until I figure out what I did to her—what case, what victim, what failure drove her to this—I'm just dancing to her tune."

"What are you going to do?"

"Play the game. Free the five innocent people. Follow her breadcrumbs. And somewhere along the way, figure out who Victoria Ashford really is and why destroying me matters so much to her." I drove toward home. Toward another sleepless night. Toward Day Three. "Because there's a reason she's doing this. A personal reason. And I need to understand it before Day Twelve."

"That might destroy you."

"I know." I looked at my reflection in the rearview mirror. Exhausted. Guilty. Lost. "But living with this—not knowing who she is, not understanding why she hates me—that would be worse. Better to face it. Better to learn the truth, whatever it costs."

"Jack—"

"Day Three starts at dawn. I'll need backup. Files. Everything on Victoria Ashford. Everything on my old cases. Everything I missed. Everything I should have seen." I paused. "And Sarah? Thank you. For not giving up on me. For being better than I ever was."

"Don't thank me yet. You've got eleven days left. And something tells me Day Three is going to be worse than Two." But her voice softened. "But Jack? For what it's worth? Understanding what you did wrong—that's the first step. Not redemption. Just... less wrong. Keep going. Do the work. We'll see what's left when you're done."

She hung up.

I drove home through rain. Through darkness. Through a city that looked different now that I understood I'd never really seen it.

Day Two was over. I'd learned my partner was corrupt. My cases manufactured. My legend built on lies and convenient blindness.

But worse—much worse—I'd learned that someone hated me enough to spend seven years building an empire just to orchestrate my destruction. Someone who knew every case. Every failure. Every innocent person I'd sent to rot.

Victoria Ashford was a mystery. Wealthy. Powerful. Connected. And focused on me with the precision of someone who'd made destroying me their life's work.

But why? What had I done to her? What case had I failed that made her spend years planning this revenge?

Trust is just another word for blindness, Victoria had said.

She was right. I'd been blind for thirty years. Blind to my shortcuts. Blind to my arrogance. Blind to the innocent people I'd destroyed.

But I was choosing to see now. Finally. Completely. Devastatingly.

Even if the truth destroyed me.

Especially if the truth destroyed me.

Because somewhere in my past was the answer. The case. The victim. The failure that had created Victoria Ashford.

And I had eleven days to figure it out before Day Twelve arrived and whatever she had planned became irreversible.

The rain fell harder. I drove home to an apartment that felt emptier than it should. To a life I was only now realizing had been hollow for decades.

Day Three would bring new revelations. New horrors. New understanding.

I just hoped I'd survive learning what I'd done to deserve this.

Whatever it was.

**[OUTLIER THEME: REVENGE]**`,
        ],
      unknownMessage:
        '"You\'re always one step behind, Jack. That’s what happens when you stop looking for the truth. —M.C."',
  },
    {
      id: 7,
      caseNumber: '003A',
      season: 1,
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
          'Sarah raids the condemned precinct, unearthing every statement Jack once buried to keep his record perfect.',
        objectives: [
          'Catalogue the witnesses Sarah rediscovered so the case file finally tells the truth.',
          'Surface the details Jack ignored—the ones that show certainty was manufactured.',
          'Solve before attempts expire to keep pace with Sarah’s investigation.',
        ],
      },
      bridgeText: [
        'The cases you abandon haunt you. And the evidence you dismissed? That’s what kills you.',
      ],
      evidenceBoard: {
        polaroids: [
          {
            id: '003A-archive-raid',
            imageKey: 'voice',
            title: 'SARAH REEVES',
            subtitle: 'ARCHIVE BREACH',
            detail: 'She didn\'t wait for permission. Broke into the condemned precinct. Pulled every file I ever touched.',
          },
          {
            id: '003A-waterlogged-files',
            imageKey: 'default',
            title: 'BURIED FILES',
            subtitle: 'CONDEMNED PRECINCT',
            detail: 'Water-damaged boxes. "Dismissed Witness." "Unreliable." The pattern was there in the damp paper. I just refused to see it.',
          },
          {
            id: '003A-flash-drive',
            imageKey: 'default',
            title: 'BLACK DRIVE',
            subtitle: 'THE EVIDENCE',
            detail: 'Sarah handed it to me at dawn. Twenty-one cases. Every single one had a witness I ignored or a clue I buried.',
          },
        ],
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
          'TRUTH',
      ],
        outlierWords: ['GRAVE', 'DEPTH', 'DUST', 'EARTH'],
    },
      clueSummaries: {
        main:
            'Main words rebuild the identities Jack discarded when he closed cases too quickly.',
        outliers: {
            GRAVE: 'Marks where each testimony was buried in the archive.',
            DEPTH: 'Signals how far Sarah had to dig to find the truth.',
            DUST: 'Reminds Jack that ignored records still gather judgment.',
            EARTH: 'Anchors the idea that evidence stays where you leave it—until someone cares enough to exhume it.',
        },
      },
      narrative: [
          `I was halfway to the old Harbor Street precinct—driving through Ashport's industrial guts where the city doesn't bother pretending to be civilized—when Sarah called.

"Don't go there." No greeting. No explanation. Just orders delivered in that voice she used when she'd already figured out the answer and was watching me stumble toward it three steps behind.

"What?"

"The condemned precinct. Your old files. Don't go. I'm already here."

Of course she was. Sarah had always been better at this than me. Faster. Smarter. Less burdened by the weight of her own mythology.

"Sarah—"

"I've been here three hours, Jack. Pulled every case file you worked in the last decade. Broke in through the loading dock, picked three locks, disabled the security system that doesn't actually work anymore. And Jack? You need to see this. You need to see what I found in your kingdom of ghosts."

Twenty minutes later, I found her in my old office.

The Harbor Street precinct had been condemned for seven years—asbestos, black mold, structural damage that would cost more to fix than to demolish. It sat on the waterfront like a rotting tooth, windows boarded, doors chained, slowly sinking into the toxic mud that passed for soil near the docks.

Sarah had broken in through a side entrance. I followed her trail—picked locks, disabled alarms, footprints in dust thick as snow. She'd been here for hours. Methodical. Thorough. Everything I'd never bothered to be.

My old office was on the third floor. Water damage had turned the ceiling into abstract art—brown stains bleeding across acoustic tiles, the ghost of pipes that had burst during the winter the city abandoned this building to die.

Files spread across the floor like a paper graveyard. Water-damaged but readable. Sarah had gone through every case I'd touched, every report I'd signed, every conviction I'd built. She'd broken in before me, picked the same locks, found the same evidence.

But she'd gone further. That was Sarah. Always one step ahead. Always asking the questions I was too arrogant to consider.

"Look at this." She held up the Bellamy file—thick manila folder gone soft with water damage, my handwriting bleeding across reports like accusations. "Anonymous witness report. Woman in red leaving the Bellamy residence the night Richard died. You marked it 'unreliable witness.'"

I remembered. Call came in at 2 AM. Witness wouldn't give a name. Spoke in whispers. Sounded terrified. I'd written it off as a crank. Or worse—I'd buried it because it complicated the neat story I was building.

"The caller wouldn't identify themselves," I said.

"Because you didn't try to find them." Sarah's voice was scalpel-sharp. She pulled out three more files, dropped them at my feet like evidence at a crime scene. "Thornhill case—witness saw a woman meeting with Silas Reed at a coffee shop on Morrison. Gave you a description. You dismissed her as 'not credible' because she was a barista with a misdemeanor for pot possession three years ago. Chen case—lab tech reported Tom Wade's evidence tampering. Transferred to a different facility before trial. You didn't follow up. Sullivan case—neighbor testified the planted gun wasn't Sullivan's, showed you time-stamped security footage proving it. Testimony excluded because you decided the camera angles were 'inconclusive.'"

She stood, brushing dust off her jeans. The morning light through boarded windows cut her face into planes of shadow and anger.

"Every case has a dismissed witness, Jack. Every single one. Every case has evidence you buried because it didn't fit your theory. I spent three hours in this tomb going through your greatest hits. Want to know what you were doing? Feeling guilty? Drinking? Waiting for Victoria to give you permission to investigate?"

"I was—"

"You were reacting. Like you always do. Playing defense. Victoria feeds you a case, you chase it like a trained dog. She shows you evidence, you examine it on her schedule. She dictates the pace, the sequence, the revelations. And you follow. Obedient. Grateful for the education." Sarah grabbed her jacket—black leather, worn at the elbows, the one she'd worn for ten years because she couldn't afford to replace it on a detective's salary. "I'm done waiting for you to figure this out. I'm investigating Victoria directly. Her shell corporations. Her money trail. Her operation. Without your permission. Without waiting for her to leave clues like breadcrumbs for slow children."

"Sarah, that's dangerous—"

"So is sitting around waiting for her next revelation like she's some kind of avenging angel instead of a murderer with better PR." She walked toward the door. Stopped in the doorframe, silhouetted against the dim light from the stairwell. "Oh, and Jack? Those contractors who 'tried to kill you' yesterday? The ones who ambushed you at the warehouse? I have security footage. They're not Victoria's people. They work for someone else. Someone who doesn't want these files exposed. Which means Victoria isn't the only player in this game. There are other forces. Other players. And while you're having your emotional education, I'm going to find out who else wants you dead. And why."

She tossed me a flash drive—small and black, spinning through dusty air like a verdict. "That's everything I found. Every dismissed witness. Every buried report. Every inconvenient truth you decided to ignore. Review it. Absorb it. Learn from it. Because tomorrow, I'm confronting the real question: if Victoria didn't send those contractors, who did? And what are they trying to hide that's worth killing you to protect?"

She left. Her footsteps echoed down the condemned stairwell—confident, certain, fading into the building's silence.

I stood in my old office, surrounded by the ghosts of cases I'd closed too fast and bodies I'd counted too carelessly. Holding evidence Sarah had found in three hours that I'd ignored for seven years. The flash drive was warm from her pocket. It felt like an indictment.

She wasn't my partner anymore. She was ahead of me. Asking better questions. Making active moves while I played defense. Building cases while I deconstructed my own mythology.

And for the first time, I realized with something like pride and something like grief: Sarah wasn't waiting to be saved. She was building her own case. Against Victoria. Against me. Against the entire corrupt apparatus we'd served.

And she was better at it than I'd ever been.

I spent three hours in that condemned building, going through water-damaged files while rain hammered the roof and somewhere below me the structure groaned like a dying animal.

Every case had the same signature—the same pattern I'd been too blind or too arrogant to see. Evidence that appeared perfectly at exactly the right moment. Witnesses I'd dismissed for being inconvenient. Conclusions I'd reached at speed because closing cases mattered more than solving them.

Eleanor Bellamy: Woman in red witness dismissed. Called seventeen times. Marked unreliable because she wouldn't show her face.

Marcus Thornhill: Accounting irregularities pointing to Silas Reed. Buried in an appendix I'd never read because the main narrative was so clean.

Dr. Lisa Chen: Lab tech who reported Wade's evidence tampering. Transferred to a different facility three weeks before trial. I'd noted it and moved on.

James Sullivan: Gang member who claimed evidence was planted. Had security footage. Time-stamped. Clear. I'd decided the angles were wrong and excluded his testimony.

Pattern recognition. That's what made me good. Except I'd been recognizing the wrong patterns—finding what confirmed my theories instead of what contradicted them.

My phone buzzed, the sound obscene in the silence. Victoria. Always Victoria. Always watching.

**"Good work, Detective. You're learning to question your certainty. How does it feel, realizing every conviction was built on sand? Tomorrow brings a queen's fall. Ask yourself: who profited from your perfect conviction rate? Who built their career on your corruption? Day Three's lesson: The system isn't broken. It's designed this way. You were just a useful tool. —M.C."**

A queen's fall. Someone in power. Someone who'd used my cases to build something.

I went through every case Victoria had mentioned, spreading files across the water-stained floor. Looking for the common thread. The connecting tissue. The pattern underneath the pattern.

There it was. Simple. Obvious. How had I missed it?

Every case—all five innocent victims—prosecuted by the same person.

Assistant District Attorney Helen Price. "Queen of Convictions." Fifty-three cases. Fifty-three wins. Perfect record. Never lost a trial. Never questioned evidence. Never hesitated.

Because I'd been feeding her perfect cases. Perfect evidence. Perfect convictions. Making her look like a genius when really she was just the final link in a chain of corruption.

Day Three wasn't about me anymore. It was never just about me.

It was about exposing everyone who'd benefited from my willful blindness. Everyone who'd climbed over innocent bodies to reach the top. Everyone who'd known—or should have known—that perfect evidence doesn't exist. It's manufactured.

**[PUZZLE THEME: IDENTITY / OUTLIER: BURIED]**`,
        ],
        unknownMessage:
          '"Good work, Detective. You’re learning to question your certainty. Tomorrow brings a queen’s fall. Ask who profited from your perfect conviction rate. —M.C."',
  },
    {
      id: 8,
      caseNumber: '003B',
      season: 1,
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
          'Marcus Webb lays out Emily Cross’s past, revealing the secrets Jack ignored when he rushed to close her case.',
        objectives: [
          'Track every detail Marcus preserved about Emily’s relationship with Richard.',
          'Expose the hidden secrets that prove the frame was deliberate.',
          'Solve quickly so Marcus testifies before fear silences him again.',
        ],
      },
      bridgeText: [
        'Some deals are made in antique shops that smell like secrets and old money.',
      ],

      evidenceBoard: {
        polaroids: [
          {
            id: '003B-marcus-backroom',
            imageKey: 'buyer',
            title: 'MARCUS WEBB',
            subtitle: 'ANTIQUE DEALER',
            detail: 'He deals in secrets and old money. Loved Richard Bellamy for fifteen years. Stayed silent while Eleanor went to prison.',
          },
          {
            id: '003B-emily-portrait',
            imageKey: 'sparkle',
            title: 'EMILY CROSS',
            subtitle: 'GALLERY PORTRAIT',
            detail: 'Young. Talented. Richard\'s hand on her shoulder, too possessive. The photo proves the affair—and the motive.',
          },
          {
            id: '003B-ledger',
            imageKey: 'default',
            title: 'SECRET LEDGER',
            subtitle: 'EMBEZZLEMENT',
            detail: 'Richard was stealing from his clients to pay blackmail. Marcus had the proofs. Cowardice kept them hidden in a drawer.',
          },
        ],
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
          'LOVER',
        ],
        outlierWords: ['WHISPER', 'CIPHER', 'PASSWORD', 'CODE'],
      },
      clueSummaries: {
        main:
          'Main words catalogue the secrets Marcus kept—evidence that should have cleared Eleanor years ago.',
        outliers: {
          WHISPER: 'Signals the quiet exchanges Marcus traded for safety.',
          CIPHER: 'Points to the encrypted life Emily built after she disappeared.',
          PASSWORD: 'Reminds you that access to the truth has always been gated.',
          CODE: 'Exposes the set of rules Victoria rewrote while Jack slept on the file.',
        },
      },
      narrative: [
          `Marcus Webb's antique shop occupied a narrow building wedged between a tattoo parlor that smelled like ink and regret and a Vietnamese restaurant where the pho was excellent and the owner didn't ask questions. The building itself was old Ashport—brick and wrought iron, the kind that had survived earthquakes and fires and urban renewal because it was too stubborn to die.

Hand-painted sign above the door: **WEBB'S CURIOSITIES - BY APPOINTMENT ONLY.** Translation: if you didn't have money or information worth trading, don't bother knocking.

I'd known Marcus fifteen years—back when he was still a journalist, before the scandal that ended his career and turned him into what he was now. Ex-reporter turned information broker. He dealt in rare objects, old money, and dangerous secrets. The kind of man who knew where bodies were buried because he'd helped dig the holes and sometimes filled them in.

The shop was dark. Closed sign in the window. But I knew Marcus was inside. He was always inside. Living above the shop, surrounded by the detritus of other people's lives, trading in secrets the way normal people trade in stock certificates.

I knocked. Waited. Knocked again.

His voice came through the door, muffled and suspicious. "Jack Halloway. You dead or just pretending?"

"Need to talk."

"Office hours are—"

"It's about Victoria Ashford."

Silence. Long enough that I thought he'd walked away. Then I heard locks turning. Three of them. The kind that meant he had things worth protecting. Or things worth hiding.

"Back door. Ten minutes. Come alone." A pause. "And Jack? If you're wired, I'll know. And we'll have a different kind of conversation."

The back entrance led to a storage room that smelled like Victorian furniture, pipe tobacco, and the particular must of secrets kept too long in dark places. Antiques lined the walls—furniture, paintings, objects that had outlived their original owners and now waited for new ones. Everything expensive. Everything with history. Everything with blood somewhere in its provenance.

Marcus sat at an ornate desk that probably cost more than I'd make in a year—back when I still made money. Gray beard trimmed to precision. Cardigan that looked soft as sin and probably cost more than my car. Reading glasses perched on his nose. A book open in front of him—something old, leather-bound, the kind collectors kill for.

He looked up. Studied me the way an art appraiser studies a painting. "You look terrible, Jack. Like Lazarus exhumed too early. Before the miracle had time to take."

"Feel worse."

"Good. Suffering builds character." He closed the book—gently, reverently—and poured tea from Qing dynasty porcelain that was probably worth more than everything I owned. "Victoria Ashford. There's a name that conjures ghosts. Summons demons. Makes strong men check their doors at night."

"What do you know?"

"Less than Orpheus knew about looking back." Marcus sipped his tea, watching me over the rim. "The Ashfords made their fortune in shipping. Eighteen-fifties. Opium from China to San Francisco. Made millions while men died in the holds and on the docks. Then they pivoted—weapons during the First World War. Made millions more. Then they learned the most profitable trade of all: silence. Information. Leverage. Made millions more by knowing when to speak and when to keep quiet." He set down the cup. "Victoria appeared seven years ago—fully formed, impossibly educated, inheriting an empire when her father's heart finally surrendered to the weight of his crimes."

"What kind of business?"

"The only business that matters. Information brokerage. Leverage as currency. She has dossiers on everyone who matters in this city—judges, mayors, commissioners, business leaders, crime bosses. And detectives who fancy themselves infallible." Marcus poured more tea, the ritual giving him time to choose his words. "She's built her own kingdom, Jack. Shadow government. Power without the throne, which is the most dangerous kind because no one knows who to blame. While Helen Price wore the crown publicly—Queen of Convictions, darling of the press—Victoria pulled the strings behind it. Whispered in the right ears. Applied pressure in the right places. The real queen was never in the courtroom. She was in the shadows. Where queens belong if they want to keep their heads."

I leaned forward. The pieces were there. I just needed to say them out loud. Make them real.

"She's Emily Cross."

Marcus set down his cup carefully. Precisely. The way you handle delicate things when your hands aren't quite steady. "That's... actually, yes. That tracks. That makes terrible, perfect sense." He stood, walked to a filing cabinet, pulled out a folder. "Emily's family had money. Old textile fortune. Lowell, Massachusetts. Made millions on the backs of immigrant labor. If she wanted to disappear and rebuild herself as someone new, she'd have the connections. The resources. The education. The old-money networks that don't ask questions when someone needs to vanish."

"Why did she disappear?"

"Why does any smart person disappear, Jack? Because staying visible would've killed her. Literally or figuratively, does it matter?" He handed me the folder. "Emily Cross. I kept clippings. Journalist habit. Can't shake it even after they run you out of the profession for asking inconvenient questions about powerful people."

Inside: newspaper articles about Emily's disappearance. Society photos from gallery openings and charity galas. Emily young and beautiful and full of promise. And one clipping that stopped me cold, that made my chest tighten with understanding and regret.

*Emily Cross with mentor Richard Bellamy at her debut gallery exhibition. Rising star in Ashport's art scene brings fresh perspective to classical themes.*

The photo showed them standing together. Richard's hand on Emily's shoulder. Too familiar. Too possessive. Emily's smile not quite reaching her eyes. The body language of a young woman who'd learned to endure touch she didn't want.

"Richard Bellamy," I said. My voice sounded distant. "Eleanor's husband. The first victim. The first case in Victoria's twelve days."

"Plot thickens like blood in water." Marcus leaned back in his chair, fingers steepled. "If Emily had motive to kill Richard—and given their relationship, she had motive in spades—and if Victoria is Emily, or avenging Emily, or somehow connected to Emily's story—then Eleanor Bellamy is innocent. And you put her away. Built the case. Testified at trial. Made it stick."

"What would Richard have done to her?" But I already knew. Had known from the moment I saw that photo. The angle of Emily's shoulders. The forced smile. The way her body leaned away while his hand held her in place.

Marcus pulled out another photo. Different event. Same dynamic. Emily and Richard at what looked like a private gallery showing. Too close. Too familiar. His hand on her shoulder, fingers pressing into her collarbone. Her face turned away from the camera, toward shadow.

"They were lovers. If you can call it that." Marcus's voice went flat. Clinical. The tone he used when he was reporting facts he didn't want to feel. "Started when she was nineteen. Richard was forty-eight. Married. Powerful. Connected. Everything she needed to succeed in Ashport's art world. And from what I heard—and I heard plenty because Ashport's elite can't keep secrets from each other—it wasn't entirely consensual. Not at first. Maybe not ever."

He hesitated. Poured more tea he didn't drink.

"What?"

"Emily tried to end her life six months before she disappeared. Pills. Oxycodone. Took thirty of them. Survived because her roommate found her in time." Marcus met my eyes. Gray and tired and full of the weight of knowing too many things about too many people. "Family hushed it up. Paid the hospital. Threatened the roommate. Made it disappear the way rich families make inconvenient truths disappear. But I kept the records. I keep everything. That's my curse."

"Something broke her."

"Something. Someone. Richard Bellamy broke her long before Grange kidnapped her. Long before you declared her dead and closed her case and moved on to the next file."

The pieces were coming together like a crime scene photograph developing in chemical baths. Slow. Inevitable. Damning.

But I still didn't understand Victoria's role. Was she Emily herself, risen from the grave? Was she avenging Emily—family member seeking justice? Friend? Lover? Someone who'd survived when Emily didn't?

"I need more information on Victoria Ashford. Who she was before seven years ago. Where she came from. How she built her empire so fast."

I stopped at the door, hand on the frame. Something about his voice. The way it cracked when he talked about Richard. The way he wouldn't meet my eyes.

"Marcus? You loved Richard, didn't you?"

His face went still. Carved from marble. For a long moment he just looked at the tea in his hands, watching steam rise and dissipate like memory. Like hope.

"For fifteen years." The words came out barely above a whisper. "We were secret partners. Lovers. Not the public kind—the kind that meets in rented apartments and hotel rooms and pretends to be strangers at parties. Eleanor knew. She'd always known. Didn't care because she and Richard had an arrangement. She got the respectability and the bank account. He got freedom to be himself when no one was watching." His voice cracked. Broke. "Richard wanted respectability more than he wanted anything real. I wanted him more than I wanted my own self-respect. We were both cowards in different ways."

"Why didn't you testify at Eleanor's trial? You could have given her an alibi. Provided evidence that someone else had motive to kill Richard."

"Because I was terrified." He set down the teacup. His hands were shaking. "This was eight years ago, Jack. Being openly gay in Ashport society? Career suicide. Social death. I'd already lost my journalism career. My reputation was all I had left. So I chose it over an innocent woman's life." He finally met my eyes. "I let Eleanor take the fall for a murder I knew she didn't commit because I was more afraid of judgment than guilt. More afraid of losing what little I had left than of watching an innocent woman go to prison. That's who I am. That's what I did. And I've been living with it every day since."

"Jesus, Marcus."

"Don't." He stood, walked to the window, looked out at the alley behind his shop. Garbage bins. Fire escapes. The back sides of buildings where no one pretends things are beautiful. "Victoria came to see me three weeks ago. Just appeared in the shop like smoke. Elegant. Terrifying. Beautiful in the way a knife is beautiful. She laid out everything—photos of me and Richard in compromising positions, financial records showing I'd inherited money from him, proof I knew Eleanor was innocent and stayed silent." He poured more tea but his hands were shaking so badly it sloshed over the rim. "She offered me a choice: testify at Eleanor's appeal or watch her expose me publicly. Destroy everything I'd built by staying silent. Show the world exactly what kind of coward I am."

"So you're testifying."

"Tomorrow morning. Federal court. Ten AM." He turned to face me. "I'll tell them everything. About Richard and Emily's affair. About it not being consensual. About him embezzling from clients to pay her off, keep her quiet. About the night I saw Emily leave his study in tears, mascara running, threatening to expose him. About Richard calling me in a panic, saying someone was blackmailing him. About all of it." Marcus's voice was steady now. Decision made. "I should've done it eight years ago. Should've stepped forward when Eleanor was arrested. Should've told the truth when it might have saved her from prison. But I didn't. Now I'm doing it because I'm being blackmailed by a woman who's better at this game than I ever was. That's not courage. That's just a different kind of cowardice. But Eleanor will go free. And maybe that's enough."

"It still helps Eleanor. Gets her out of prison. Gives her life back."

"Does it?" Marcus walked me to the door. "Or does it just make me feel better about being complicit for eight years? Does confessing under blackmail really count as redemption? Or is it just another transaction—my public shame for Eleanor's freedom?" He opened the door. Rain was falling. Always falling. "Victoria said something before she left. Something that's been eating at me. She said: 'Some people destroy innocence through action. Some through inaction. Both are guilty. Both will answer. The only difference is that people who act can lie to themselves about their motives. People who do nothing can't even claim they didn't know.' I think she's right. I think inaction is worse. Because at least if you do something, you can claim you thought it was necessary. If you do nothing, you're just a coward. And I was a coward for eight years."

I left Marcus Webb's shop with more questions than answers. But at least I understood the shape of it now. The skeleton underneath the skin.

Richard Bellamy had abused Emily Cross. Young, promising artist. Used his power and connections to trap her in a relationship she couldn't escape. Maybe Emily killed him—or maybe someone killed him to protect her. Either way, Eleanor Bellamy was innocent.

And I'd sent Eleanor to prison for it. Built the case. Made it stick. Collected my commendation while an innocent woman rotted in Greystone.

And Victoria Ashford—Emily Cross, risen from the dead—had spent seven years building power. Accumulating leverage. Waiting for the perfect moment to make me understand what my arrogance had cost. Not just Eleanor. But all of them. All five innocent victims.

**[OUTLIER THEME: SECRETS]**`,
        ],
      unknownMessage:
        '"Some people destroy innocence through action. Some through inaction. Both are guilty. Both will answer. —V.A."',
  },
  {
      id: 9,
      caseNumber: '003C',
      season: 1,
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
          'Helen Price cracks, offering a confession that exposes how far the justice system bent for Jack’s certainty.',
        objectives: [
          'Document Helen’s admissions so every innocent person she prosecuted can be freed.',
          'Trace the corruption trail linking Jack’s evidence to Helen’s perfect record.',
          'Solve quickly to get Helen’s testimony in front of the FBI before she recants.',
        ],
      },
      bridgeText: [
        'Some choices are made in the moment between deciding to fight and deciding to flee.',
      ],

      evidenceBoard: {
        polaroids: [
          {
            id: '003C-helen-breakdown',
            imageKey: 'lex',
            title: 'HELEN PRICE',
            subtitle: 'THE QUEEN',
            detail: 'Fifty-three wins. Zero losses. The Queen of Convictions. Now just a terrified woman in a stained suit, realizing her kingdom is ash.',
          },
          {
            id: '003C-annotated-dossier',
            imageKey: 'default',
            title: 'RED DOSSIER',
            subtitle: 'ANNOTATED FILES',
            detail: 'Victoria delivered it herself. Every manufactured conviction circled in red ink. A roadmap of our corruption.',
          },
          {
            id: '003C-interview-room',
            imageKey: 'default',
            title: 'INTERVIEW THREE',
            subtitle: 'CONFESSION ROOM',
            detail: 'Where we used to break suspects. Now Helen sits there, breaking herself. The glass is one-way, but the truth goes both directions.',
          },
        ],
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
          'TRUTH',
      ],
        outlierWords: ['BRIBE', 'PAYOFF', 'SCANDAL', 'FRAUD'],
    },
      clueSummaries: {
        main:
            'Main words map the courtroom machinery Helen once commanded—now turned against her.',
        outliers: {
            BRIBE: 'Exposes the cash that greased Helen’s perfect record.',
            PAYOFF: 'Links the convictions to the rewards she and Jack enjoyed.',
            SCANDAL: 'Hints at the public collapse Sarah is orchestrating.',
            FRAUD: 'Names the foundational lie their careers were built on.',
        },
      },
      narrative: [
          `I was halfway to my car—walking through rain that had turned to sleet, the city trying to decide between drowning us and freezing us—when Sarah called.

"Get to the precinct. Now." Her voice had that edge. The one that meant something was breaking. "Helen Price just showed up. Walked in through the front door like she owned the place. Wants to talk to you specifically. Says Victoria visited her. Says she's ready to confess."

My stomach dropped. "Confess to what?"

"Everything. Her perfect conviction record. The fifty-three cases built on your evidence. Her entire career. She's coming apart at the seams, Jack. Crying. Shaking. Talking about her father's law firm and offshore accounts and corruption that goes deeper than we thought. And she wants immunity. Or she wants to burn. I can't tell which. Maybe both."

I was already running back to the car, slipping on wet pavement, the city trying to kill me in small ways. "I'll be there in ten."

Helen Price was in Interview Room 3 when I arrived. The Queen of Convictions. Fifty-three wins. Zero losses. The golden child of Ashport's justice system.

She looked like she'd aged twenty years overnight. The polish was gone. No makeup—I could see the bags under her eyes, dark as bruises. Hair disheveled, falling out of the chignon she usually wore like a crown. Hands shaking around a coffee cup that was probably cold by now. Still wearing yesterday's suit. Wrinkled. Stained. The armor of a queen who'd just learned her kingdom was built on corpses.

Sarah stood in observation, arms crossed, watching through the one-way glass. She looked at me when I arrived. "She's been sitting there twenty minutes. Won't talk to anyone else. Won't leave. Won't accept a lawyer. Just sits there shaking and asking for you. I think she's having a breakdown. Or she's the best actor I've ever seen."

I went in.

Helen looked up when the door opened. Her eyes were red. Bloodshot. The eyes of someone who'd been crying for hours. Or who hadn't slept in days. Or both.

"Detective Halloway." Her voice was hoarse. Raw.

"Ms. Price."

"Just Helen. I'm not 'Ms. Price' anymore. I'm resigning tomorrow morning. Or today. Or maybe I already have. Time feels strange." She dropped a folder on the table between us. Heavy. Thick. "I got a letter this morning. Hand-delivered to my apartment. Black envelope. Red wax seal. Inside was a complete dossier of every case I prosecuted using your evidence. Every single one. With annotations in red ink. Clinical dissection. Showing which pieces of evidence were manufactured. Which witnesses were coerced. Which suspects were innocent."

"How many were manufactured?" My voice came out flat. Dead. I knew the answer would destroy her. Was already destroying her.

"Twenty-one." The words came out broken. Like she was coughing up glass. "Twenty-one innocent people. Twenty-one cases out of fifty-three. And I never questioned a single piece of evidence. Not once. Never asked how you always found that perfect final clue. Never wondered why your forensics always came back exactly when we needed them. Never stopped to think that perfect cases don't exist in the real world. Only in fairy tales. And frame jobs."

"Because questioning me would've meant questioning yourself. Your record. Your reputation."

"Yes." She laughed. Not humor. The sound of something breaking. "I was so proud of my record. The Queen of Convictions. Ashport's golden child. And it was all built on your fraud. Our fraud. I stood in court and made juries believe. Made judges rule. Sent innocent people to prison while I collected accolades."

"Our fraud," I said. "You benefited just as much as I did. Maybe more."

"I know." She met my eyes. Hers were dying. Mine felt ancient. "That's why I'm here. That's why I'm confessing. That's why I'm ending this before Victoria does it for me." She pulled out another folder from her briefcase. Black. Expensive. Lawyer's leather. "Victoria gave me this last night. Appeared at my apartment like a ghost. She laid this on my coffee table and said when you came asking—and you would, because you're predictable—I should give it to you."

Inside: complete documentation of Eleanor Bellamy's case. The sapphire necklace purchase—real receipts showing it was bought two days before Richard's death by someone using a shell company. Forged documents proving the necklace was planted in Eleanor's deposit box. Dismissed witness reports—all of them, collected, annotated, showing a pattern I'd ignored. And something new. Something I'd never seen before.

Financial records. Wire transfers from an offshore account to Richard Bellamy. Twenty payments over six months. Each one exactly the same amount: $50,000. Totaling a million dollars.

Blackmail payments.

"Richard was being blackmailed," I said.

"According to Victoria's documentation, yes. Someone discovered Richard was embezzling from his art clients. Skimming from sales. Underreporting values. Taking cash under the table. Threatened to expose him unless he paid. He paid for six months. Then refused. So they killed him and framed Eleanor." Helen looked at the files spread between us. "Victoria seems to know exactly who did it. Probably Emily Cross herself. But she's not saying. Not yet. That's not the lesson for today."

"Then Eleanor really is innocent. Has been innocent this whole time."

"They all are." Helen's voice went quiet. Defeated. "Eleanor. Marcus Thornhill. Dr. Lisa Chen. James Sullivan. Teresa Wade. Five innocent people. Five lives destroyed. All convicted using your evidence. All prosecuted by me in court. All sent to prison while we collected commendations and promotions and the grateful thanks of a city that thought we were heroes." She met my eyes. "We destroyed them, Jack. We destroyed five innocent people. And Victoria's making sure everyone knows. Making sure the public sees that their Queen of Convictions was really just a puppet. A performer. A useful idiot who never asked where the perfect evidence came from."

My phone buzzed. The sound was obscene in the interview room's silence. Victoria. Always Victoria. Always watching. Always three moves ahead.

**"Day Three complete, Detective. Congratulations. You've learned that the system protects itself by burying inconvenient truths. That people like Helen Price build careers on your corruption. That everyone benefits from not looking too closely at perfect evidence. Tomorrow, the Queen falls publicly. And you'll discover who gave you the perfect evidence in the first place. Who manufactured it. Who turned you into the weapon that destroyed five innocent lives. Hint: Your best friend. —M.C."**

My best friend. Tom Wade. Chief Forensic Examiner. The man who'd provided the evidence for every major case I'd ever closed.

If Tom had been manufacturing evidence—if he'd been creating perfect cases out of thin air—then my entire career was built on his fraud. Every win. Every conviction. Every medal and commendation. All of it resting on a foundation of lies.

"Jesus Christ," I said. The words came out barely above a whisper. Revelation and horror mixing into something that tasted like copper. Like blood.

Helen looked at me. Saw something change in my face. "What? What is it?"

"Tom Wade." I stood, the chair scraping back. "He's been feeding me perfect evidence for years. Twenty years. Every case. Every conviction. It was always Tom who found that final piece. That perfect clue. The DNA that shouldn't have been there. The fingerprint in the impossible location. The trace evidence that proved guilt beyond reasonable doubt." I started pacing. Couldn't stop moving. "He's been manufacturing it. All of it. For twenty years."

"The forensic examiner? Dr. Wade?" Helen's face went even paler. "Oh God. If he's been manufacturing evidence..."

"My best friend." The words tasted like betrayal. "Thirty years I've known him. College. Academy. First cases. Divorces. Deaths. Birthdays. He was at my daughter's christening. I was at his wedding. And he's been lying to me for twenty years. Turning me into a weapon. Making me destroy innocent people while I thought I was delivering justice." I turned to Helen. "Victoria's going after him next. Day Four. She's going to expose him. Publicly. Completely. Everything he's done. Everything we've done using his manufactured evidence."

"Every case he touched gets reviewed. Reopened. Challenged." Helen was doing the math. I could see it in her eyes. "That's hundreds of cases. Maybe thousands. The entire criminal justice system in Ashport is about to collapse."

"That's the point. She's not just exposing me. She's not even just exposing you. She's exposing the entire institutional apparatus. Showing that it's rotten from top to bottom. That perfect cases are always manufactured. That certainty is just another word for fraud."

"So what do we do?" Helen looked lost. Broken. Queen without a kingdom.

"You cooperate with FBI. Give them everything. Every file. Every case. Every piece of evidence you know or suspect was manufactured." I headed for the door. "Confess. Take whatever deal they offer. Help free the innocent. That's all we can do now. Try to undo some of the damage before Victoria does it for us."

"Jack?" Helen's voice stopped me at the door. Quiet. Almost a whisper. "What Victoria's doing—using my cases to expose the system. Forcing us to confess. Making sure the public sees how corrupt we are. She's right, isn't she? We are corrupt. Not in the dramatic way. Not taking bribes or selling evidence. But in the everyday way. The way that's worse because we convinced ourselves we were heroes. Maybe we deserve what's coming. Maybe we deserve worse."

I looked back at her. Queen of Convictions. Fifty-three wins. Twenty-one of them innocent. Sitting in an interview room in yesterday's suit, makeup running, career ending, understanding too late what she'd become.

"Maybe," I said. "Maybe we deserve everything Victoria's going to do to us. But the five innocent people don't deserve to stay in prison while we figure out our guilt. They didn't choose this. We chose it for them. So we owe them. We owe them freedom. Truth. Acknowledgment. Everything we can give them. Even if it destroys us in the process."

I left Helen Price in that interview room, broken and confessing, kingdom burning, crown melting.

And I understood with the clarity of exhaustion and revelation:

Victoria wasn't just destroying me. She was burning down the entire justice system in Ashport. Exposing the rot. Showing the public that their heroes were frauds. That perfect cases were lies. That the system protected itself by sacrificing the innocent.

One case. One day. One revelation at a time.

Twelve days. Twelve cases. Twelve lessons in how corruption worked when good people convinced themselves they were heroes.

And I was helping her do it.

Not because she was forcing me. Because she was right.

The system was broken. We were broken. And maybe the only way to fix it was to burn it all down and start over.

Even if we burned with it.

**[OUTLIER THEME: CORRUPTION]**`,
        ],
        unknownMessage:
          '"Day Three complete. You’ve learned the system protects itself by burying inconvenient truths. Tomorrow the Queen falls. Hint: Your best friend. —M.C."',
  },
  {
    id: 10,
    caseNumber: '004A',
    season: 1,
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
        'Helen Price steps to the podium, and Jack watches the crown he forged for her melt in public.',
      objectives: [
        'Trace every royal metaphor that framed Helen’s reign and burn them down.',
        'Collect the institutional roles she calls out so the review starts immediately.',
        'Finish the grid before the cameras cut so you control the confession tape.',
      ],
    },
    bridgeText: [
      'Confession brings cameras and questions and the cold certainty that sorry changes nothing.',
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '004A-price-podium',
                imageKey: 'lex',
                title: 'CITY HALL',
                subtitle: 'PUBLIC FALL',
                detail: 'Helen at the podium. The flashbulbs are blinding. She\'s reading the statement we wrote, dismantling her own legend line by line.',
              },
              {
                id: '004A-press-row',
                imageKey: 'default',
                title: 'PRESS ROW',
                subtitle: 'THE VULTURES',
                detail: 'They smell blood. A hundred cameras capturing the exact moment the "Queen of Convictions" abdicates.',
              },
              {
                id: '004A-surveillance-clip',
                imageKey: 'default',
                title: 'TORTURE TAPE',
                subtitle: 'THE PROOF',
                detail: 'The footage Victoria supplied. It shows Grange\'s methods. It shows what we allowed to happen in the name of "results."',
              },
            ],
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
        'LEGACY',
      ],
      outlierWords: ['HEIR', 'LINEAGE', 'ESTATE', 'INHERITANCE'],
    },
    clueSummaries: {
      main:
        'Main words dismantle the monarchy Helen built from Jack’s perfect cases.',
      outliers: {
        HEIR: 'Points to the people who should inherit justice once Helen steps down.',
        LINEAGE: 'Tracks the chain of convictions that must now be reviewed.',
        ESTATE: 'Signals the power structures crumbling with her confession.',
        INHERITANCE: 'Reminds Jack that every crown leaves a cost someone must pay.',
      },
    },
      narrative: [
        `The press conference was at ten AM. I got there at nine-thirty and already couldn't find a seat.

City Hall's press room was built for thirty people. They'd packed in a hundred. Every major network had cameras. Print reporters crushed shoulder-to-shoulder, notebooks out, phones recording. The cameras were positioned like a firing squad—all angles covered, no escape, every moment documented for posterity.

The air was electric. Blood in the water. Sharks circling. Journalists could smell a career ending the way vultures smell death. They'd come to watch Helen Price fall and they were going to make sure it was documented from every angle.

Helen sat at the podium, flanked by her attorney—expensive suit, practiced neutrality—and two FBI agents who looked like they'd rather be anywhere else. She'd aged twenty years overnight. The polish was gone. No makeup. Hair unwashed and pulled back in a hasty ponytail. The tailored suits that usually made her look like power itself were replaced by a simple black dress. Funeral clothes. She was burying herself.

They'd called her the Queen of Convictions. Six years. Fifty-three cases. Fifty-three wins. Never lost a trial. Never questioned evidence. Never hesitated. She'd been inevitable. Unstoppable. The prosecutor every defense attorney feared and every victim's family prayed for.

She'd worn her record like a crown. Built her kingdom on my perfect cases, brick by brick, conviction by conviction. Every trial a coronation. Every verdict a jewel in her legacy.

Prosecutors from three states had recruited her. She'd been offered a federal judgeship at thirty-four—youngest in state history. The Governor had called personally. The Attorney General had written recommendations.

And now the kingdom was burning. The crown melting. The jewels revealed as glass.

I sat in the back row, collar up, trying to be anonymous. Watching the woman I'd made into a legend prepare to fall. Watching my corruption become public spectacle.

Helen leaned into the microphone. Her hands were shaking. You could see it even from the back row.

"My name is Assistant District Attorney Helen Price. For six years, I've prosecuted cases with what I believed was integrity. I was wrong." Her voice shook but held. Barely. "Twenty-one cases my office prosecuted have serious evidentiary problems. These cases were built on fabricated or manipulated evidence. I will be stepping down effective immediately and cooperating fully with federal investigations."

The room erupted. Reporters shouting questions. Cameras flashing like artillery fire. The Queen abdicating her throne and the kingdom was already tearing itself apart, fighting over the scraps.

Helen raised her hand. The gesture of someone used to commanding attention. It worked. The room quieted. Not silent. But quiet enough.

"I'm calling for immediate review of every case I prosecuted that used evidence from Detective Jack Halloway and Chief Forensic Examiner Dr. Thomas Wade. Every case. No exceptions. Those who are innocent will be freed. Those who were wrongly convicted will receive—" Her voice broke. "Will receive whatever restitution we can offer. Which will never be enough. But it's all we have."

She stepped back from the podium.

I stood. Walked through the crowd. Took her place at the microphone.

The room went silent. Recognition spreading like poison. Someone whispered my name. Then someone else. Within seconds, everyone knew who I was. What I was.

The legendary Jack Halloway. Best clearance rate in Ashport history. Standing at a podium to confess I'd sent innocent people to prison for thirty years.

"My name is Jack Halloway. For thirty years, I was considered one of Ashport's best detectives." I looked out at the cameras. At the reporters. At Ashport watching through screens. "I was wrong about that. About a lot of things. I sent innocent people to prison. Not through malice. Through arrogance. I trusted my certainty more than evidence. I closed cases to protect my reputation instead of finding truth. I took shortcuts. I dismissed witnesses. I accepted perfect evidence without questioning where it came from or who manufactured it."

The room was silent now. You could hear the cameras. The breathing. The scratch of pens on paper.

"I'm cooperating with FBI. I'm providing all files, all evidence, all contacts, all testimony. Every case I worked will be reviewed. Those who are innocent will be freed. Those I wronged will receive whatever justice we can still provide. And I will face whatever consequences come. Because that's what should happen when you destroy innocent lives. You answer for it."

More chaos then. Questions shouted. Cameras surging forward. The feeding frenzy I'd expected. Deserved.

My phone buzzed in my pocket. I pulled it out. Text from Victoria:

**"Well played, Detective. You moved before I could. Took control of the narrative. I'm impressed. Genuinely. But you're still three moves behind. Check your email. Today's real lesson is about to begin. —V.A."**

I opened my email. New message. Subject line: **"CHECKMATE."**

Attached: video file. I clicked it. The screen filled with grainy security camera footage. Black and white. Time-stamped. Seven years ago.

A basement. Concrete walls. Single bulb. And in the center of the frame: a woman tied to a chair.

Emily Cross. Alive. Bruised. Bleeding. Screaming into a gag.

And standing behind her, just visible in the frame: Deputy Chief William Grange. Badge visible. Face clear. Holding a knife.

The timestamp showed March 23rd. Seven years ago.

The same day I'd declared Emily dead and closed her case. The day I'd called her family and said we'd found a body. The day I'd filed my final report and moved on to the next file.

While she was still alive. Still being tortured. Still screaming for someone to find her.

Sarah appeared at my side, pushing through the crowd. "Jack? What's wrong? You look like you've seen—"

I showed her the phone. The video. Emily's face. Grange's knife. The timestamp.

Sarah's face went white. All color draining. "Oh my God. Oh my God, Jack. Is that—"

"Emily Cross. Alive. The day I declared her dead." My voice didn't sound like mine. "Grange had her. And I closed the case. Gave up. Let him keep her for six more months while I closed other cases and collected commendations."

"She's been one move ahead the whole time." I looked around the press room. At the cameras. At the reporters still processing my confession. "We confess publicly, try to take control of the narrative. And she reveals the real monster. Makes us look like we were protecting him. Like our confessions were damage control, not actual remorse."

"Jack, we need to—"

Across the room, FBI agents were already moving. Phones out. Radios crackling. Someone had sent them the same video. Probably Victoria, simultaneously, perfectly timed.

Agent Martinez was barking orders. "Get Grange. Now. I want him in custody in twenty minutes. And someone get that video to the DA. We need warrants. We need—"

Deputy Chief William Grange was about to have a very bad day. The worst day. The kind that ended careers and started prison sentences and made you wish you'd died before the truth caught up.

And Victoria had orchestrated all of it.

From her penthouse, from her empire of leverage and patience, she'd watched us confess. Watched us try to take control. Then she'd dropped a bomb that made us look complicit. Made our confessions look like we'd known about Grange all along. Made us look like we were trying to get ahead of the scandal instead of actually atoning.

Day Four wasn't about us taking the fall. It was about exposing that the entire system was rotten. That corruption went deeper than two detectives and a prosecutor. That the Deputy Chief himself—the man who was supposed to oversee us—was worse than anything we'd done.

And we'd just given Victoria the perfect platform. The cameras were already here. The press was already assembled. All she had to do was provide the evidence and watch us burn.

Checkmate. She'd called it. She'd been right.

**[PUZZLE THEME: ROYALTY / OUTLIER: INHERITANCE]**`,
      ],
    unknownMessage:
      '"Well played. You moved before I could. But you\'re still three moves behind. Check your email. —V.A."',
  },

  {
    id: 11,
    caseNumber: '004B',
    season: 1,
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
        'Sarah delivers the evidence Jack buried, proving Grange’s operation survived because the system ignored the unheard.',
      objectives: [
        'Catalogue every witness Sarah rehabilitates so the FBI can act on their testimony.',
        'Spot the corruption cues that kept Grange protected for seven years.',
        'Solve quickly so Sarah’s new Conviction Integrity Project launches with momentum.',
      ],
    },
    bridgeText: [
      "Some arrests are the moment when good men realize they've been working for evil.",
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '004B-sarah-briefing',
                imageKey: 'voice',
                title: 'FBI BRIEFING',
                subtitle: 'SARAH\'S MOVE',
                detail: 'Sarah found twenty-three victims in seventy-two hours. Handed the binder to Agent Martinez. She didn\'t wait for my permission.',
              },
              {
                id: '004B-witness-binder',
                imageKey: 'default',
                title: 'WITNESS BINDER',
                subtitle: 'DISMISSED VOICES',
                detail: 'Twelve witnesses I marked "unreliable." Sex workers. Addicts. Homeless. Sarah listened. They led her straight to Grange\'s operation.',
              },
              {
                id: '004B-grange-arrest',
                imageKey: 'keeper',
                title: 'GRANGE ARRESTED',
                subtitle: 'NOON RAID',
                detail: 'Deputy Chief William Grange. Badge visible. Knife in hand on the tape. Arrested at noon. The system finally eating its own.',
              },
            ],
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
        'TRUTH',
      ],
      outlierWords: ['BRIBE', 'KICKBACK', 'CONTRACTOR', 'BLACKMAIL'],
    },
    clueSummaries: {
      main:
        'Main words showcase the paperwork Sarah assembled to finish the job Jack abandoned.',
      outliers: {
        BRIBE: 'Names the hush money flowing through Grange’s network.',
        KICKBACK: 'Tracks the favors that kept the operation alive.',
        CONTRACTOR: 'Points to the private teams that enforced his terror.',
        BLACKMAIL: 'Reminds Jack that silence was weaponised against every witness he ignored.',
      },
    },
      narrative: [
        `Deputy Chief Grange was arrested at noon. I should have been there. Should have watched the man who'd tortured Emily Cross get dragged out in cuffs. Should have seen justice delivered.

But I didn't watch from Sarah's office.

Because Sarah wasn't there. Again. Always one step ahead. Always where the real work was happening while I stumbled behind, learning lessons I should have learned decades ago.

I found her at the FBI field office on Morrison Street. Through the glass walls of a conference room, I could see her sitting across from Agent Luis Martinez, handing over a binder thick as a phone book.

I walked in without knocking. "What are you doing here?"

Sarah looked up. Didn't seem surprised to see me. She never did anymore. "Finishing what you started. Or actually—starting what you never did. Depends on how generous I'm feeling about your incompetence."

She slid the binder across the table to Martinez. Professional. Confident. The move of someone who'd done this before and knew exactly how much leverage she was handing over. "Agent Martinez, this contains evidence of twenty-three kidnapping victims connected to Deputy Chief William Grange. Property records showing he owns or controls seven locations through shell companies. Financial transfers showing payments to security contractors. And witness statements I tracked down personally over the last seventy-two hours—twelve witnesses Detective Halloway interviewed and dismissed as unreliable."

Martinez flipped through it. Page after page. Photos. Financial records. Witness statements. His face went from professional neutrality to pale shock. "How did you—how long have you been working this?"

"Seventy-two hours. No sleep. A lot of coffee." Sarah stood, started pacing. Energy vibrating off her. The energy of someone who'd just brought down a monster and knew it. "By doing actual detective work. By following leads Detective Halloway dismissed. By interviewing witnesses he marked as 'unreliable' or 'attention-seeking' or 'not credible.'"

She turned to me. Her eyes were hard. "Three days ago, Jack told me Victoria Ashford was orchestrating his downfall. Using his old cases. Exposing his corruption. I decided to investigate her. Find out who she was. What she wanted. Where she came from." She crossed her arms. "What I found was evidence of Grange's operation. Evidence that was always there. Buried in dismissed reports and closed files and witness statements Jack decided weren't worth following up on."

She pulled out a stack of papers. Dropped them on the table. "I found twelve witnesses who reported suspicious activity at Grange properties over the last seven years. Young women being moved at night. Screaming from basements. Security contractors threatening anyone who got too close. Detective Halloway dismissed eleven of them." She looked at me. "Called them 'attention seekers' or 'unreliable' or just marked the files 'insufficient evidence to proceed.' One was a sex worker. Two were addicts. Three were homeless. He decided their testimony didn't matter because they weren't the kind of victims the system cares about."

"Sarah—"

"I interviewed all twelve. In three days." She wasn't yelling. Didn't need to. Her voice was cold enough to freeze. "Every single one described the same pattern. Young women being moved at night in unmarked vans. Screaming from basements—specific locations that match properties Grange owns through shell companies. Security contractors threatening anyone who asked questions—contractors who are on Grange's personal payroll. It's all documented. All corroborated. All sitting in Jack's files marked 'insufficient evidence.'"

She turned back to Martinez. "I have sworn affidavits. Video evidence from security cameras near Grange's properties. Financial records showing shell companies. Witness testimony. Everything you need to prosecute. Everything that was there seven years ago if anyone had bothered to look."

Martinez looked at me. His face was stone. "You knew about these witnesses? You interviewed them?"

"I... I interviewed them. Took statements. Then I didn't follow up. I thought—" The words died. What could I say? That I'd been lazy? Arrogant? Blind?

"He thought they didn't matter because they weren't credible victims." Sarah's voice was steel wrapped in ice. "Women who sell their bodies. Men who sleep in alleys. People the system already decided were disposable. So he dismissed them. Buried their statements. Moved on to cases that would look better on his record. And Grange kept operating. Kept kidnapping. Kept torturing. For seven more years."

She grabbed her coat from the back of the chair. Black leather. The one she'd worn for years. "I'm done working cases you assign me. I'm done waiting for your permission to investigate. I'm done being your partner, your subordinate, your anything." She slung it over her shoulder. "I'm starting my own firm. Conviction Integrity Project. First case: reviewing every witness you ever dismissed as 'unreliable.' Every person you decided didn't matter. Every voice you silenced because it complicated your narrative."

"Sarah, wait—"

"No." She turned at the door. "I'm done waiting. I spent thirteen years waiting. Waiting for you to notice I had ideas. Leads. Instincts of my own. Waiting for you to treat me like a partner instead of an assistant. Waiting for you to be the detective you pretended to be." She met my eyes. "Turns out I'm a better detective without you. Faster. More thorough. Less burdened by mythology and ego. Seventy-two hours and I brought down a serial kidnapper. How long did you work that case? Three weeks? Then you gave up. Moved on. Declared the victim dead because that was easier than admitting you couldn't solve it."

She walked out. Didn't slam the door. Didn't need to. The quiet click was somehow worse.

Martinez closed the binder. Looked at me. "She's right, you know. Every witness statement she gathered—I just checked. They were all in your original files. Flagged. Noted. Dismissed. You had all of this seven years ago. You just decided it wasn't worth pursuing."

"I know."

"Twenty-three victims." He stood. Started packing the evidence. "Eight confirmed dead. Fifteen alive but damaged. Some we'll never find because the trail's gone cold. Because you decided homeless people and sex workers weren't worth your time."

I watched Sarah through the window. Loading boxes into her car. Documents. Files. Evidence. Building her new life. Her new firm. Her new identity as someone who actually gave a damn about the victims instead of the clearance rate.

She didn't look back. Didn't wave. Didn't acknowledge I existed. Just loaded her car and drove away.

She'd just brought down Grange's entire operation. Twenty-three victims. Seven years of horror. And she'd done it in seventy-two hours. Without me. Without Victoria. Without anyone's help. Just competent, thorough, relentless detective work.

The work I should have done seven years ago.

And she was walking away. Not because I'd betrayed her. Not because I'd used her. But because she'd finally realized something that should have been obvious thirteen years ago:

She didn't need me. Had never needed me. She'd just been convinced she did because that's what the system taught young detectives—defer to the legend, learn from the master, don't question the clearance rate.

Now she knew better. And she was gone.

**[OUTLIER THEME: CORRUPTION]**`,
      ],
    unknownMessage:
      "\"Some arrests are the moment when good men realize they've been working for evil. —M.C.\"",
  },

  {
    id: 12,
    caseNumber: '004C',
    season: 1,
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
        'Victoria stages a lesson at the Blackwell penthouse, forcing Jack to stare at the portrait of the detective she believes he really is.',
      objectives: [
        'Track the staging elements Victoria uses to control the meeting.',
        'Highlight the moments of betrayal that define her revenge curriculum.',
        'Finish before she hands you Day Five’s envelope so you keep your footing.',
      ],
    },
    bridgeText: [
      'Some meetings are the moment you realize the person offering salvation is the one who damned you first.',
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '004C-victoria-lesson',
                imageKey: 'silence',
                title: 'VICTORIA ASHFORD',
                subtitle: 'PENTHOUSE LESSON',
                detail: 'She poured bourbon with a shaking hand. Admitted I surprised her. "For six hours, I thought you\'d beaten me."',
              },
              {
                id: '004C-portrait-reveal',
                imageKey: 'sparkle',
                title: 'LUCIA MARTINEZ',
                subtitle: 'VICTIM NINETEEN',
                detail: 'Nursing student. Engaged. Taken three months after I closed the Cross case. Died because I stopped looking.',
              },
              {
                id: '004C-lisa-envelope',
                imageKey: 'default',
                title: 'DAY FIVE',
                subtitle: 'NEXT ENVELOPE',
                detail: 'Black paper. Red seal. Inside: Dr. Lisa Chen. The woman my best friend destroyed to protect himself.',
              },
            ],
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
        'POWER',
      ],
      outlierWords: ['BETRAYAL', 'TRUST', 'DEBT', 'REVENGE'],
    },
    clueSummaries: {
      main:
        'Main words capture every element Victoria choreographs to keep Jack off balance.',
      outliers: {
        BETRAYAL: 'Names the core lesson—trust is a blade she now wields.',
        TRUST: 'Reminds Jack this meeting exists because he broke everyone’s faith.',
        DEBT: 'Signals the reckoning she insists he still owes.',
        REVENGE: 'Defines the engine driving her twelve-day curriculum.',
      },
    },
      narrative: [
        `The Blackwell Building. Penthouse. Victoria's kingdom of glass and steel.

I took the elevator up, using the same keycard she'd left in my car two days ago. The one that said she could get to me anytime, anywhere. The one that meant I was always being watched, always being herded, always three moves behind.

The elevator was glass. I watched Ashport spread below me—the press conference already making news, Helen Price's face on every screen, my confession playing on loop. The city learning that its heroes were frauds. That justice was a performance. That perfect cases were manufactured.

Victoria had done this. Orchestrated all of it. And I'd helped. Played my part perfectly. Given her exactly what she wanted.

The doors opened directly into the penthouse.

Victoria stood by the floor-to-ceiling windows, looking down at Ashport. At the city that was learning to hate people like me. She was wearing red—the same dress, or maybe a different one, hard to tell. Always red. Always that particular shade that looked black until the light hit it right.

She didn't turn when I entered. Just kept watching the city burn below. Metaphorically. Though with her, you could never be entirely sure.

"Detective Halloway. Right on schedule." Her voice was different. Not the cold precision from our first meeting. Something else. Something almost tired.

"Is that what I am? Predictable?"

"Yes. But you're learning. That's different." She finally turned. I expected triumph. Satisfaction. The look of a chess master who'd just won. What I saw was something else. Something I hadn't seen before.

Exhaustion. The kind that comes from carrying weight too long.

"You moved before I expected today." She walked to the bar, poured bourbon into crystal glasses. Her hands weren't quite steady. "Took control of the narrative. Confessed before I could expose you. I'm impressed. Genuinely."

"And surprised?"

"Terrified, actually." She handed me bourbon without asking. I took it. "I didn't predict you'd confess publicly. Didn't account for you having that kind of courage. Or that kind of strategic thinking. For six hours this morning—between your confession and my releasing the Grange video—I thought you'd beaten me. Actually beaten me. Changed the game. Made me irrelevant."

"Victoria showing weakness?" I sipped the bourbon. Good. Too good for my taste. The kind you drink when you're celebrating or mourning and can't tell which.

"Victoria learning she's not omnipotent." She sat down heavily. The first time I'd seen her do anything that wasn't choreographed. "I spent three years planning your public destruction. Every detail. Every revelation. Every moment designed to maximize your humiliation. And you moved first. Made yourself the confessor instead of the condemned. That's—" She stopped. Drank. "That's actually smart. Strategic. I should have predicted it. Should have accounted for you growing a spine. But I didn't. And for six hours, I was scrambling. Actually scrambling. Playing defense for the first time in seven years."

She met my eyes. Hers were different. Less ice. More fire. "I'm not infallible, Jack. I can be surprised. Outmaneuvered. Made to feel powerless. And it's terrifying. I'd forgotten what it felt like. To not be three moves ahead. To actually be scared someone might beat me."

"Good." I sat down across from her. "You should know what that feels like. Being powerless. Being surprised. Being three steps behind someone who's controlling everything."

"I do now." She drank. The bourbon disappearing fast. She poured more. "Sarah Reeves is better than I gave her credit for. She didn't just investigate me. She investigated around me. Found things I missed. Used my revenge plot as cover to build her own case. That's—" Victoria laughed. Bitter. "That's actually brilliant. I'm furious and impressed in equal measure."

She stood. Walked to the window. "How many people did Grange kidnap?"

"Twenty-three confirmed. Eight dead. Fifteen alive but—" I stopped. Looked at her back. At the way she held herself. Rigid. Controlled. Barely. "You were one of them."

"Number fourteen." She said it clinically. Like she was reading from a file. Then her voice cracked. Broke. Became something raw. "Lucia Martinez was number nineteen. Twenty-four years old. Nursing student. Second year at Ashport General. Engaged. Planning a wedding. Had her whole life ahead of her." Victoria's hand shook as she poured more bourbon. Spilled some. Didn't notice. "She was taken three months after you closed my case. Three months after you declared me dead and moved on. Grange held her for eleven months. Tortured her the same way he tortured me. She died in that basement while he was still operating. While you were closing other cases. Collecting commendations. Being Ashport's legendary detective."

She turned. I saw tears. First time I'd seen her cry. "I met her mother last year. Mrs. Martinez. Told her I was investigating Grange. Trying to build a case. She asked me one question. Just one. 'Why did the detective stop looking for my daughter?' I didn't have an answer. Because the only answer is the truth. You gave up. You declared me dead because it was easier than admitting you couldn't solve the case. And Lucia Martinez died because of it."

"I'm sorry." The words were inadequate. Pathetic. But they were all I had.

"Sorry." She laughed. Not humor. The sound of something broken trying to pretend it's whole. "Mrs. Martinez said the same thing when I told her Lucia was never coming home. When I showed her the evidence. When I explained that her daughter died because a detective decided she wasn't worth looking for. Sorry doesn't resurrect the dead, Jack. Sorry doesn't give Mrs. Martinez her daughter back. Sorry doesn't undo eleven months of torture." 

She moved closer. Close enough I could see her eyes were red. Not from crying now. From days of it. Weeks. Years. "But you know what? I don't want your apology. Fuck your apology. I want your understanding. Do you understand yet, Jack? Really understand? What your arrogance costs? What happens when you give up because a case is too hard or a victim is already dead or finding the truth would complicate your legend?"

"Yes."

"Do you? Really?" She was inches away now. I could smell her perfume. Something expensive and French and underneath it, bourbon. "Because I think you understand intellectually. In your head. You know you were wrong. You know people died. You know your shortcuts had consequences. But do you understand it in your bones? In your gut? The way I understand it? The way I wake up every night seeing Lucia Martinez's face? The way I live every day knowing she died because I survived and you stopped looking?"

"Help me understand, then." I met her eyes. "That's what this is about, right? Not just revenge. Education. You want me to understand. Not just know. Understand."

"That's what Days Five through Twelve are for." She stepped back. Poured more bourbon. Drank it fast. "You're doing well. Better than I expected. You confessed publicly. Exposed Helen Price. Cooperated with FBI. Set Grange's arrest in motion. But you're still not where you need to be."

"Where's that?"

"Destroyed." She said it simply. Like it was obvious. Like there was no other possible destination. "Completely destroyed. The way I was destroyed. When you've lost everything—reputation, career, friends, hope, the ability to look at yourself in the mirror without seeing a monster—then we'll talk about understanding. When you wake up every night seeing their faces. When you can't go a day without remembering what you did. When the weight of it is so heavy you can barely breathe. Then you'll understand."

"And after?" I drank my bourbon. "After Day Twelve? After I'm destroyed? After I understand? What then?"

"Then?" She laughed. Empty. "Then you get to live with it. Every single day. Every single night. The knowledge that you failed. That people died. That you can never fix it completely. That sorry doesn't resurrect the dead. That confession doesn't undo torture. That understanding doesn't give Mrs. Martinez her daughter back." Her voice cracked. Broke. "That's the price of certainty, Detective. That's what happens when you play god with other people's lives. You get to live forever knowing you were wrong. And that living is worse than dying. That's the price. And you're going to pay it. Just like I'm paying it."

She walked to her desk. Opened a drawer. Pulled out an envelope. Black paper. Red wax seal. The same as always. Like a calling card. Like a death sentence delivered with elegance.

"Day Five. Tomorrow." She held it out. Her hand wasn't shaking anymore. Back to control. Back to the predator. "You'll meet someone who trusted you completely. Someone who believed in the system. Believed in justice. Believed that if they told the truth, they'd be protected. And you'll learn what that trust cost them. What happens when good people work for monsters and the monsters are your friends."

She handed it to me. Our fingers touched. Hers were cold. "Go home, Jack. Rest if you can. I doubt you will. Tomorrow brings worse. They all do. Each day worse than the last. That's the design. That's the point."

I took the envelope. Started toward the elevator. My hand was on the call button when her voice stopped me.

"Jack?" 

I turned.

Victoria stood at the window. Silhouetted against Ashport's lights. Small. Alone. For the first time, she looked fragile. Like the facade was cracking. Like underneath the predator was just a woman who'd been destroyed and was trying to make someone else understand what that felt like.

"You asked earlier if there were other victims. People Grange hurt. People you failed." She didn't turn around. Just kept looking at the city. "There's one you haven't considered."

"Who?"

"Me." She said it quietly. "I'm a victim too. Of Grange. Of you. Of a system that values efficiency over truth. Of detectives who'd rather close cases than find answers. Of a justice system that sacrifices the inconvenient to protect the powerful." 

She finally turned. The light caught her face. I saw scars. Faint. Along her hairline. Her jaw. The kind you only see if you're looking for them. The kind that plastic surgeons spend years trying to hide. The kind that never quite go away no matter how much money you throw at them.

"The difference between us, Jack?" She smiled. Sad. Broken. "I crawled out of my grave. Survived. Rebuilt myself. Became someone who could fight back. You?" She turned back to the window. "You're still digging yours. One day at a time. One revelation at a time. And you'll keep digging until you understand that being buried alive is the only way to really understand what you did to people like me."

I left without responding. What could I say? She was right. About all of it.

The elevator descended. Glass walls. Ashport spreading below. I watched my reflection in the glass—fifty-two years old, looking seventy, carrying the weight of thirty years of arrogance and twenty-three victims and one woman who'd survived hell and decided to make me understand what hell felt like.

I opened Victoria's envelope.

Inside: a photo. Dr. Lisa Chen. Being released from Greystone Correctional. Walking through the gates. Carrying a cardboard box of possessions. Looking hollow. Broken. The way people look when they've spent years in prison for a crime they didn't commit and the system finally admits it was wrong but can't give them back the time it stole.

And a note. Victoria's handwriting. Elegant. Mocking.

**"Day Five: The woman who told the truth and lost everything. Dr. Lisa Chen reported evidence tampering. Your best friend Tom Wade framed her to protect himself. Sent her to prison for four years while he kept manufacturing evidence. Kept making you look like a legend. Kept destroying innocent lives. Tomorrow, you'll meet her. You'll hear what happened. And you'll understand what happens when good people work for monsters and the monsters are your friends. —M.C."**

Tom Wade. My best friend for thirty years. College. Police academy. First cases. Divorces. Deaths. Birthdays. The man I'd trusted completely. The man who'd made me great by manufacturing evidence for twenty years. The man who'd destroyed Dr. Chen's life because she'd tried to expose him.

The elevator reached the ground floor. The doors opened. I walked out into Ashport's night.

Day Four was over. Helen Price had fallen. Grange had been arrested. Sarah had walked away. Victoria had shown vulnerability for the first time.

And Day Five would destroy whatever friendship I had left. Whatever illusions I still carried about the people I'd trusted.

Eight more days. Eight more lessons. Eight more ways to understand what my certainty had cost.

I drove home through rain. Always raining. The city weeping. Or washing blood away. Still couldn't tell which.

**[OUTLIER THEME: BETRAYAL]**`,
      ],
    unknownMessage:
      "\"Day Five: The woman who told the truth and lost everything. Your best friend Tom Wade framed her to protect himself. Tomorrow, you'll understand what happens when good people work for monsters. —M.C.\"",

  },

  {
    id: 13,
    caseNumber: '005A',
    season: 1,
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
        'Lisa Chen walks free with proof Tom Wade corrupted two hundred seventeen cases, forcing Jack to face the friend who weaponised him.',
      objectives: [
        'Document the forensic tools and locations Lisa cites so the FBI can reopen every compromised file.',
        'Trace the relationships ruptured by Wade’s betrayal—mother, daughter, partner—to fuel the new review.',
        'Lock in the board before the fog clears so the narrative drop hits with maximum weight.',
      ],
    },
    bridgeText: [
      "The evidence doesn't lie. Except when it's manufactured by your best friend for twenty years.",
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '005A-lisa-release',
                imageKey: 'lex',
                title: 'LISA CHEN',
                subtitle: 'GREYSTONE RELEASE',
                detail: 'Released at 9:15 AM. Four years older. Thinner. Harder. "Statistically speaking, I calculated a 73% probability you\'d appear."',
              },
              {
                id: '005A-victoria-orders',
                imageKey: 'default',
                title: 'BLACK ENVELOPE',
                subtitle: 'DAY FIVE ORDERS',
                detail: '"The real fraud was her supervisor—your friend." Victoria\'s handwriting. Elegant. Mocking. Truthful.',
              },
              {
                id: '005A-evidence-drive',
                imageKey: 'default',
                title: 'FLASH DRIVE',
                subtitle: 'THE EVIDENCE',
                detail: 'Two hundred seventeen cases. At least sixty provably false. Tom Wade wasn\'t just efficient. He was a mass murderer using the state as his weapon.',
              },
            ],
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
        'LABCOAT',
      ],
      outlierWords: ['FORGED', 'PLANTED', 'ALTERED', 'SWAPPED'],
    },
    clueSummaries: {
      main:
        'Main words catalogue the forensic workflow Lisa watched Tom corrupt—samples, analysis, reports now under review.',
      outliers: {
        FORGED: 'Flags the signatures Wade forged to frame Lisa and protect himself.',
        PLANTED: 'Calls out the evidence he seeded into lockers and lab logs.',
        ALTERED: 'Reminds players every clean result he touched became contaminated.',
        SWAPPED: 'Points to the login and sample swaps that stole four years of Lisa’s life.',
      },
    },
    narrative: [
      `Day Five arrived with fog thick enough to drown in.

Victoria's envelope: **"Day Five, Detective. Do you remember Dr. Lisa Chen? She remembers you. You sent her to prison for fabricating forensic evidence. She was innocent. The real fraud was her supervisor—your friend. Address attached. —V.A."**

Dr. Lisa Chen. Four years ago. Accused of altering DNA results, falsifying toxicology reports, taking bribes. The evidence was overwhelming: her signature, her login credentials, her lab access.

I'd arrested her personally. Watched her cry. Heard her claim innocence.

Never believed her. Because the evidence was perfect. And because the man who'd provided it—Dr. Thomas Wade—was my friend.

Sarah called. "Lisa Chen's being released this morning. Nine AM. Greystone. FBI wants you there."

"Why?"

"She's been talking. Says Wade framed her. Says she has proof he's been falsifying evidence for years."

"Where's Tom?"

"Missing. Hasn't shown up for work in three days. FBI has a warrant but can't find him."

I drove to Greystone through fog. The prison emerged like a tombstone.

FBI agents. Media trucks. Lisa's release was front-page news after my Day Four confession.

At nine-fifteen, Lisa Chen walked out.

Four years had carved her into someone new. Thinner. Harder. Eyes that had seen things that don't heal. She wore donated clothes and carried one cardboard box.

Her daughter waited by a beat-up Honda. Twenty now. Had been sixteen when Lisa went in. The daughter wouldn't look at her mother.

I approached. "Dr. Chen?"

Lisa turned. "Detective Halloway. Statistically speaking, I calculated a 73% probability you'd appear. Observation confirms hypothesis."

"I need to talk to you."

"Request denied. Insufficient motivation to engage."

"It's about Tom Wade. About what he did."

That stopped her. "So. Evidence finally penetrated your confirmation bias. Four years, two months, seventeen days post-conviction, and you're 'starting to' consider I was correct."

"I'm starting to—"

"'Starting to.' Fascinating qualifier." She was already walking toward me. "What variable changed?"

"Everything. Someone's been teaching me what I did wrong. Who I should've investigated." I lit a cigarette, offered one. She took it. "Victoria Ashford sent me. Said you were innocent. Said Tom framed you."

"Subject visited facility three weeks ago. Observation: elegant presentation, expensive perfume. Vocal affect cold, calculated." Lisa took a drag. "Subject predicted your eventual comprehension. Quote: 'Detective Halloway possesses intelligence but exhibits severe cognitive rigidity. Educational methodology requires repeated trauma exposure.' Unquote."

"Tom Wade is a psychopath. Charming. Brilliant. Empty where his conscience should be. He's been falsifying evidence for twenty years. Started small—adjusting results. Became bigger—manufacturing evidence."

"Why frame you?"

"Because I caught him. Saw him altering a DNA profile. Confronted him. He smiled. Said I had two choices: stay quiet or lose everything. I chose to speak up." She crushed out the cigarette. "He made it look like I was the one falsifying. Used my login credentials. Forged my signature. Planted reports in my locker. And when you investigated, you believed him. Because he was your friend."

The words landed like bullets.

"I'm sorry."

"Sorry doesn't give me four years back. Doesn't repair my relationship with my daughter." She turned to walk away. "But for what it's worth—I believe you're trying. That counts for something."

"Lisa, wait. Victoria said you have proof."

She pulled a flash drive from her pocket. "Every case Tom Wade touched that had suspicious evidence. Two hundred seventeen cases. At least sixty provably false."

"Jesus Christ."

"Your friend is a mass murderer. Just used prison as his weapon. More efficient than a gun. More permanent than poison." She handed me the drive. "Give this to FBI. Free the innocent. They deserve that much."

"Lisa—"

"Dr. Chen. We're not friends." She turned toward her daughter. "Oh, and Detective? Your partner Sarah called me last week. Asked if I wanted to work with her new integrity project. I said yes. So we'll be colleagues now. Uncomfortable for you, I imagine."

"I deserve uncomfortable."

"Yes. You do." She walked to her daughter. They stood three feet apart—close enough to touch, far enough to show four years of damage. The daughter wouldn't look at her.

They got in the car without speaking. Drove away. Fog swallowing them like ghosts.

I stood in Greystone's parking lot, holding proof that my best friend was a monster, watching a family I'd broken try to rebuild from shattered pieces.

I stood in Greystone's parking lot, holding proof that my best friend was a monster.

**[PUZZLE THEME: FORENSICS / OUTLIER: TAMPERING]**`,
    ],
    unknownMessage:
      '"Day Five, Detective. Do you remember Dr. Lisa Chen? She remembers you. You sent her to prison for fabricating forensic evidence. She was innocent. The real fraud was her supervisor—your friend. Address attached. —V.A."',
  },

  {
    id: 14,
    caseNumber: '005B',
    season: 1,
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
        'Sarah exposes Tom Wade’s phantom lab and drags decades of fabricated evidence into the light while Jack listens to his friend confess.',
      objectives: [
        'Track every shell company, warehouse, and fake address Sarah cites so the task force can seize them.',
        'Log the lab equipment Tom hid—sequencers, freezers, synths—to map how each case was manipulated.',
        'Capture the emotional beats of Tom’s final call so the narrative lands when the board clears.',
      ],
    },
    bridgeText: [
      "Some phone calls come at two AM from friends who've decided confession beats capture.",
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '005B-helios-warehouse',
                imageKey: 'default',
                title: 'HELIOS LAB',
                subtitle: 'PHANTOM WAREHOUSE',
                detail: 'Registered to a shell company. Inside: a full forensic lab. DNA sequencers. Samples labeled with my case numbers. The factory floor of my career.',
              },
              {
                id: '005B-sarah-command',
                imageKey: 'voice',
                title: 'SARAH REEVES',
                subtitle: 'THE REAL DETECTIVE',
                detail: 'She found it in three days. Cross-referenced property records. Did the work I was too arrogant to do. "You\'re contaminated evidence, Jack."',
              },
              {
                id: '005B-tom-wade-call',
                imageKey: 'keeper',
                title: 'TOM WADE',
                subtitle: '2 AM CALL',
                detail: '"I\'m not a monster, Jack. I\'m a soldier." He confessed. Justified it. Said he saved society by ensuring convictions. Then the line went dead.',
              },
            ],
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
        'FLASHDRIVE',
      ],
      outlierWords: ['FORGERY', 'COUNTERFEIT', 'STAGED', 'DECOY'],
    },
    clueSummaries: {
      main:
        'Main words map Sarah’s discovery—warehouses, shell fronts, gear—that proves Wade industrialised forensic fraud.',
      outliers: {
        FORGERY: 'Marks the fake reports that backed every perfect conviction.',
        COUNTERFEIT: 'Highlights the substitute samples Wade swapped into evidence lockers.',
        STAGED: 'Calls out the crime scenes he manufactured to keep cases tidy.',
        DECOY: 'Reminds Jack how phantom addresses and labs misdirected every audit.',
      },
    },
    narrative: [
      `I was driving to FBI headquarters when Sarah called.

"I found it."

"Found what?"

"Tom Wade's lab. The real one. Not his official office—the one where he's been manufacturing evidence for twenty years."

"How—"

"Remember three days ago when I said I was investigating Victoria? I lied. Well, half-lied. I was investigating you. Going through every case you closed with Tom's forensics. Looking for patterns." Her voice was tight. Excited. "Forty-eight cases had evidence collected at addresses that don't exist. Phantom locations. I cross-referenced property records. Found three properties registered to shell companies Tom had access to."

"Sarah—"

"I'm at one now. Industrial district. Warehouse registered to 'Helios Consulting.' Inside: full forensic lab. DNA sequencers. Chemical synthesizers. And Jack? Samples. Hundreds of them. Labeled with case numbers. Your case numbers."

"Get out of there. Now. If Tom knows—"

"Tom's already gone. Place has been abandoned for 48 hours. But he left everything. Like he wanted it found." A pause. "I'm calling FBI. This is bigger than Tom. Bigger than you. This is systematic evidence fabrication over two decades."

"I'm on my way—"

"No. You're contaminated evidence. You worked these cases. You can't be anywhere near this scene." Her voice softened slightly. "Jack, I know you want to help. But the best thing you can do is stay away. Let me handle this. Let me be the detective who does it right."

She hung up.

I sat in my car, knowing Sarah had just done in three days what I should've done in thirty years. She'd found the evidence. Built the case. Done the work.

Without me. Without Victoria. Just competent, thorough detective work.

By evening, FBI had everything. Sarah's investigation. Lisa's flash drive. Tom's lab. The entire apparatus of corruption I'd enabled for twenty years.

Tom Wade was the most wanted man in Ashport.

And Sarah Reeves was the detective who'd brought him down.

My phone rang at 2 AM. Tom's personal number. The one I'd had in my contacts for thirty years.

I answered.

"Jack. It's me."

His voice was the same. Calm. Measured. The voice that had talked me through my divorce, my crises, my doubts.

"Where are you, Tom?"

"Doesn't matter. I'll be gone by morning. I'm calling because you deserve to know why."

"Why you framed innocent people?"

"Why I helped you become the best detective in Ashport. Every case you closed perfectly? That was me. Providing evidence that would stick. Ensuring convictions. Making you a legend."

"By framing innocent people."

"By ensuring the guilty didn't escape on technicalities. You think the system works? It doesn't. Criminals walk every day because evidence gets contaminated, witnesses recant, lawyers find loopholes. I fixed that." His voice hardened. "I made sure justice actually happened."

"That's not justice. That's tyranny."

"That's pragmatism. And you benefited from it for decades." He laughed. "Don't act sanctimonious now. You loved the perfect cases. Never questioned how I always found that one piece of evidence that sealed it."

"Because I trusted you."

"Exactly. Trust. The ultimate blindness." Tom sighed. "But Victoria changed the game. She's been collecting evidence. Against me. Against you. She's not interested in justice—she's interested in revenge."

"She survived six months of torture because I closed her case too fast. I'd say revenge is justified."

"Is it? Because she's doing the same thing I did—manipulating evidence to get the outcome she wants. We're not different. She just has better PR."

I couldn't argue.

"Turn yourself in, Tom. Face trial. Tell the truth."

"The truth?" He laughed again, bitter. "The truth is I saved hundreds of people by convicting the guilty. Yes, some innocent got caught. Collateral damage. Acceptable losses."

"Acceptable to who?"

"To society. To victims. To families who want closure more than process." His voice softened. "I'm not a monster, Jack. I'm a soldier. Fighting a war with the only weapons that work. If that makes me a villain, fine. But remember—you were right there beside me."

"I know."

Silence. Two old friends. Two guilty men. Connected by decades of misplaced trust.

"Victoria's not done with you. Days Six through Twelve get worse. She's building to something. And I think I know what."

"What?"

"She's not just exposing corrupt cops. She's exposing the entire system. Showing that justice is a fiction. That evidence can always be manipulated. By Day Twelve, she's going to prove that everything we built—the entire criminal justice system—is fraudulent."

"How do you know?"

"Because I would do the same thing." Tom sighed. "Goodbye, Jack. I'm sorry I made you into what you are. That's my real crime. Not the falsified evidence. But taking a good detective and turning him into someone who valued certainty over truth."

The line went dead.

Sarah texted: **"Tom Wade found dead. Apparent suicide. FBI is securing the scene. I'm sorry, Jack."**

I drove to the scene. Industrial district. Abandoned warehouse. The same one where we'd busted a drug ring ten years ago.

He hung himself from the rafters. Left a note: **"Some cases you solve. Some cases solve you. I'm sorry, Jack. —Tom"**

FBI swarmed. Photographers. Investigators. Media helicopters.

I stood in the rain outside, smoking, watching them carry out my oldest friend in a body bag.

Sarah appeared beside me. Didn't speak.

"He called me," I said finally. "Before he died. Confessed. Explained his philosophy. Still thought he was right."

"Was he?"

"About me being complicit? Yes."

The ME pulled me aside. "The rope. The knot. The positioning. This is textbook. Perfect execution. Like he'd done it before."

"He was a forensic examiner. He'd seen hundreds of suicides."

"Sure. But look at this." He showed me photos. "No rope burns. No defensive wounds. He just... did it. Perfectly. On the first try."

"So?"

"So people don't kill themselves perfectly. They hesitate. They struggle." The ME met my eyes. "This looks staged. Perfect evidence is usually manufactured."

Victoria. She'd killed Tom and staged it to look like suicide.

Because letting him die on his own terms would be mercy.

And Victoria doesn't do mercy.

Day Five was over. Tom was dead. Lisa was broken.

And tomorrow I'd face the woman I'd failed in a completely different way.

**[OUTLIER THEME: FABRICATION]**`,
    ],
    unknownMessage:
      "\"Jack. It's me.\"",
  },

  {
    id: 15,
    caseNumber: '005C',
    season: 1,
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
        'Jack finally pushes back, gathering proof that Victoria executed Tom Wade while choosing to keep the game alive.',
      objectives: [
        'Log the traces—DNA, rope, marina records—that prove the suicide was staged.',
        'Capture the power exchanges between Jack and Victoria to show how leverage shifts.',
        'Finish the board before dawn so Day Six unlocks with Jack no longer passive.',
      ],
    },
    bridgeText: [
      "Some bodies tell lies. And some tell the story of friends who became monsters while you weren't looking.",
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '005C-marine-rope',
                imageKey: 'default',
                title: 'MARINE ROPE',
                subtitle: 'STAGED SUICIDE',
                detail: 'Tom never owned a boat. The rope was marine-grade. Traced back to a marina owned by one of Victoria\'s shell companies.',
              },
              {
                id: '005C-dna-scrapings',
                imageKey: 'default',
                title: 'DEFENSIVE DNA',
                subtitle: 'UNDER NAILS',
                detail: 'Foreign DNA under Tom\'s fingernails. Female. Victoria didn\'t just order it. She was there. She made sure he didn\'t choose his own ending.',
              },
              {
                id: '005C-marina-map',
                imageKey: 'silence',
                title: 'VICTORIA ASHFORD',
                subtitle: 'THE EXECUTIONER',
                detail: '"He didn\'t get to choose his ending. Just like I didn\'t get to choose mine." She admitted it. And she knew I wouldn\'t arrest her yet.',
              },
            ],
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
        'CHOICE',
      ],
      outlierWords: ['BETRAYAL', 'LOYALTY', 'TRUST', 'REVENGE'],
    },
    clueSummaries: {
      main:
        'Main words track Jack’s first offensive move—following rope fibers, marina ledgers, and leverage shifts to confront Victoria.',
      outliers: {
        BETRAYAL: 'Names the core wound—friends weaponised each other until murder felt justified.',
        LOYALTY: 'Asks who Jack still owes after Tom’s staged death.',
        TRUST: 'Reminds the player that blind faith created every victim in this arc.',
        REVENGE: 'Signals Victoria’s motive for executing Tom instead of letting courts decide.',
      },
    },
    narrative: [
      `I sat in the rain outside the warehouse. Tom's body inside. The weight of thirty years pressing down.

Then I realized something: Victoria had been controlling everything. Every revelation. Every timing. Every move.

But Tom's death—if she'd staged it—meant she'd left evidence. She always left evidence. That was her signature.

I called the ME back. "The suicide scene. You said it was too perfect."

"Yeah. Like he'd practiced it."

"What if someone else positioned the body? Made it look like suicide?"

"Possible. But we'd need proof."

"Check his hands again. Under the nails. If someone positioned him, there might be defensive DNA."

"I already did standard—"

"Do it again. Deep scraping. And check the rope fibers. Compare them to fibers in Tom's car, his house, his office. If he bought that rope himself, there'll be trace evidence of it somewhere in his life."

Silence. "That's... actually smart. Give me two hours."

Two hours later, he called back. "You were right. Foreign DNA under his nails. Female. And the rope—it's marine-grade. Tom Wade lived inland his whole life. Never owned a boat."

"But I know who does."

Victoria's shell corporations included a yacht company. Marina holdings. She'd used rope from her own inventory.

For the first time in five days, I had leverage.

I called her. "I know you killed Tom. DNA evidence. The rope. I can prove it."

Silence. Then laughter. "Good work, Detective. That's the Jack Halloway I remember. The one who actually investigates." Her voice changed. "So what now? You turn me in? Expose me? End the game early?"

"No. I want to understand why. He would've gone to prison anyway. Why kill him?"

"Because I needed you to feel what I felt. And Tom's suicide would've been his choice. His escape. I couldn't allow that." Her voice went cold. "He didn't get to choose his ending. Just like I didn't get to choose mine."

"So you murdered him."

"I executed him. There's a difference." Long pause. Her voice changed—softer, younger. "Jack? When Grange had me in that cell... you know what the worst part was? It wasn't the torture. It was hearing your voice on that phone call. So calm. So certain. 'Case closed.' Those two words killed me more than anything Grange did."

I couldn't speak.

"I hate you for that. But I also..." She stopped. Breathing. "I also see you trying now. Investigating. Actually caring. And part of me—the part that's still Emily—wishes you'd done that seven years ago. Before I became this."

"Emily—"

"Don't call me that. Not yet. I'm not ready." Her voice hardened back to Victoria. "But you're learning, Jack. You're actually investigating. Fighting back. That's progress. Keep the evidence. Use it if you want. But know this: if you expose me now, the game ends. And you'll never understand what the next seven days would've taught you."

She hung up.

I sat in my car, holding evidence that could destroy Victoria. Could end this. Could send her to prison.

But I also knew she was right. If I moved now, I'd stop the education. Stop the revelations. Stop learning what my certainty had cost.

I'd spent thirty years taking the easy path. The certain path. The quick conviction.

This time, I'd wait. Let it play out. Learn everything.

Even if it destroyed me.

Sarah texted: **"Tom Wade officially ruled suicide. FBI closing the case. You letting them?"**

I replied: **"For now. I have evidence proving otherwise. But I'm not using it yet."**

**"Why not?"**

**"Because Victoria's right. I need to understand. All of it. Before I act."**

**"That's either growth or Stockholm syndrome."**

**"Maybe both."**

I drove home. Day Five was over. Tom was dead. Lisa was broken. And I'd made my first active move against Victoria.

It hadn't stopped her. But I'd proven I wasn't completely powerless.

And that mattered.

**[OUTLIER THEME: BETRAYAL]**`,
    ],
    unknownMessage:
      "\"Good work, Detective. That's the Jack Halloway I remember. The one who actually investigates.\"",
    },
    {
      id: 16,
      caseNumber: '006A',
      season: 1,
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
        'Margaret lays out the bill for Jack’s certainty, revealing how Thornhill’s retaliation turned their marriage into collateral damage.',
      objectives: [
        'Log the financial and emotional debts Margaret lists so Day Six’s board mirrors what she paid.',
        'Trace how wealth and security markers—mortgage, tuition, fences—became targets once Jack made enemies.',
        'Finish the grid before school pickup so the narrative lands before Emma walks back in.',
      ],
    },
    bridgeText: [
      "The people we love pay for the enemies we make. That's not philosophy. That's arithmetic with bodies.",
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '006A-margaret-porch',
                imageKey: 'sparkle',
                title: 'MARGARET PRICE',
                subtitle: 'THE EX-WIFE',
                detail: 'New husband. New life. She looked at me like a bill she thought she\'d paid. "You look like garbage," she said.',
              },
              {
                id: '006A-carjacked-sedan',
                imageKey: 'default',
                title: 'CARJACKING REPORT',
                subtitle: 'FIVE YEARS AGO',
                detail: 'She was held at gunpoint. Terrorized. It wasn\'t random. It was Marcus Thornhill\'s revenge against me, taken out on her.',
              },
              {
                id: '006A-kitchen-wall',
                imageKey: 'default',
                title: 'EMMA HALLOWAY',
                subtitle: 'MY DAUGHTER',
                detail: 'Six years old. Blonde pigtails. "Who\'s that?" she asked. "Just someone who used to know mommy." I\'m a stranger to my own child.',
              },
            ],
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
        'STABILITY',
      ],
      outlierWords: ['TARGET', 'PAYBACK', 'RETALIATE', 'THREAT'],
    },
    clueSummaries: {
      main:
        'Main words follow the comforts Margaret fought to rebuild—mortgage, savings, stability—after Jack’s enemies weaponised their wealth.',
      outliers: {
        TARGET: 'Marks the moment Thornhill aimed at Margaret instead of Jack.',
        PAYBACK: 'Connects the carjacking to revenge for a framed conviction.',
        RETALIATE: 'Shows how justice twisted back on the innocents in Jack’s orbit.',
        THREAT: 'Keeps the lingering danger in view every time the player clears a row.',
      },
    },
    narrative: [
      `Day Six started with rain and regret.

Margaret Halloway—now Margaret Price—lived in Riverside with her husband David and daughter Emma. White picket fence. Everything I couldn't give her when we were married because I was too busy being Ashport's greatest detective.

I hadn't seen her in two years. Hadn't wanted to see the life she'd built without me.

She answered the door in yoga pants and a Northwestern sweatshirt—the one I'd bought her fifteen years ago. Looking at me the way you look at a bill you thought you'd already paid.

"Jack. No."

"Margaret, I need—"

"Don't care. No. Bye." She started closing the door.

"Five minutes. Please."

She stopped. Looked me over—six days no sleep, five days no shower, running on cigarettes and regret. "You look like garbage."

"I know."

"Good." She stepped back. "David's at work. Emma's at school. You've got till 2:45. She doesn't know you exist and we're keeping it that way. Clear?"

"Clear."

Inside: coffee smell, vanilla candles, normalcy. Kids' drawings on the fridge. Family photos on walls. Being happy. Being everything I'd walked away from.

"Coffee?"

"If you're making—"

"I'm not. That was a test. You failed." But she poured me a cup anyway. Black. Wrong. She used to know I took it with cream. "Talk fast."

"Victoria said you paid for my sins. What does that mean?"

Her jaw tightened. "You really don't know?"

"Know what?"

"Jesus Christ, Jack. Five years ago, while we were still married, I was carjacked. Remember?"

I did. She'd been held at gunpoint, her car stolen, found three hours later traumatized. I'd worked the case two days before my captain reassigned it.

"I remember."

"It wasn't random. It was targeted. The man who carjacked me worked for someone you'd sent to prison." She met my eyes. "Marcus Thornhill. Before he died. Before you realized you'd framed him. He thought you'd destroyed his life deliberately. So he hired someone to terrify me."

My stomach dropped. "Margaret, I didn't know—"

"Of course you didn't know! You never knew! You were too busy closing cases, maintaining your precious clearance rate!" She paced. "I told you something felt wrong. Told you the man knew my name, my schedule, details about you. You said it was trauma. Told me to see a therapist."

"I'm sorry."

"Sorry doesn't fix PTSD. Sorry doesn't give me back the year I spent terrified to leave the house." She wiped her eyes angrily. "I divorced you because staying married to you was literally dangerous. Your enemies couldn't touch you, so they touched me. And you didn't even notice."

"Why didn't you tell me? After?"

"Because you still didn't believe Thornhill was innocent. Still thought I was having a breakdown." She sat down. "And I was so tired. Tired of being collateral damage in your heroic narrative."

"Victoria Ashford visited you."

"Three weeks ago. Told me about your cases. About the innocent people. About Marcus Thornhill. Asked if I'd help expose you." She looked at me. "I said no."

"Why?"

"Because despite everything, I don't hate you. I just can't be around you." She met my eyes. "You're not a bad man. You're just a man who was so desperate to be good at something that you stopped questioning whether you were doing good. There's a difference."

The door opened. Emma ran in—six years old, blonde pigtails, bright smile. She stopped when she saw me.

"Who's that?"

"Just someone who used to know mommy," Margaret said. "Say hi."

"Hi." Emma waved. Then ran to the kitchen.

I stood. "I should go."

"Jack?" Margaret walked me to the door. "Victoria Ashford. Is she dangerous?"

"Very."

"Will she come after us? After Emma?"

"No. She only hurts guilty people." I paused. "But be careful anyway. And if anything strange happens—call Sarah Reeves. Not me."

"Why not you?"

"Because I'm being watched too closely. Sarah can protect you better."

I left before Margaret could see my hands shaking.

**[PUZZLE THEME: WEALTH / OUTLIER: REVENGE]**`,
    ],
    unknownMessage:
      '"Day Six, Detective. Margaret paid your debt so you could chase perfection. —V.A."',
  },

  {
    id: 17,
    caseNumber: '006B',
    season: 1,
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
        'At Murphy’s Bar, Jack hands Sarah the leverage to burn Victoria, choosing her freedom over his own penance.',
      objectives: [
        'Track the offers, threats, and numbers Sarah lays out so the board reflects the recruitment pressure.',
        'Capture Jack’s surrender of the Tom Wade evidence as a turning point in their partnership.',
        'Solve before last call so the narrative drop lands with Sarah’s unanswered decision.',
      ],
    },
    bridgeText: [
      "Some investigations require drinking with the one person who understands what it's like when everything burns.",
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '006B-murphys-booth',
                imageKey: 'voice',
                title: 'SARAH REEVES',
                subtitle: 'MURPHY\'S BAR',
                detail: 'She looked exhausted. Victoria offered her Deputy Director. "I\'m considering it. She\'s actually effective."',
              },
              {
                id: '006B-job-offer',
                imageKey: 'silence',
                title: 'JOB OFFER',
                subtitle: 'DEPUTY DIRECTOR',
                detail: 'Three times her salary. Real resources. Victoria was recruiting the only person who could actually stop her.',
              },
              {
                id: '006B-wade-case-box',
                imageKey: 'default',
                title: 'WADE EVIDENCE',
                subtitle: 'THE LEVERAGE',
                detail: 'I gave Sarah the proof Victoria killed Tom. "Use it. Burn her if she touches you." I chose Sarah over the game.',
              },
            ],
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
        'LINE',
      ],
      outlierWords: ['ALONE', 'EXILE', 'DISTANCE', 'SILENCE'],
    },
    clueSummaries: {
      main:
        'Main words lock in the negotiation—offers, salaries, threats—that define Sarah and Jack’s confrontation at Murphy’s.',
      outliers: {
        ALONE: 'Warns that whichever path Sarah chooses leaves someone isolated.',
        EXILE: 'Foreshadows careers and friendships lost once Victoria reacts.',
        DISTANCE: 'Echoes the gap growing between partner and mentor.',
        SILENCE: 'Reminds players the only reply Victoria fears is the evidence Jack surrendered.',
      },
    },
    narrative: [
      `Sarah met me at Murphy's Bar at noon. She looked worse than I'd ever seen her. Dark circles. Unwashed hair. The kind of exhaustion that comes from not sleeping because closing your eyes means seeing things you can't unsee.

"You look like shit," I said.

"Right back at you." She ordered club soda. I got Jameson. "Margaret okay?"

"Traumatized. But safe. Victoria's been watching everyone I've ever failed or loved."

"I know. She's been watching me too." Sarah pulled out her phone. Showed me photos. "These arrived yesterday. Me leaving the precinct. At the grocery store. At my apartment." She showed me the last one: **"Day Seven, Captain. Your choice. Join me or watch your career become collateral damage. —V.A."**

My stomach dropped. "She's threatening you."

"She's recruiting me." Sarah put the phone away. "She offered me Deputy Director. Three times my salary. Real resources. And Jack? I'm considering it."

The words hit like a fist.

"Sarah, you can't—"

"Can't what? Join someone who's actually effective? Victoria's freed five innocent people in six days. How many have we freed?"

"By murdering Tom Wade. By blackmailing everyone. By—"

"By doing what works." Sarah's voice was flat. "I've been investigating her operation. Seventeen shell corporations. Eight hundred million in assets. She's built a shadow justice system. And it delivers results."

I pulled out my phone. Showed her the evidence from Tom's death. "I can prove she killed him. DNA. Rope fibers. She confessed to me. I can end this right now."

Sarah stared at the evidence. "Why haven't you?"

"Because..." I stopped. Good question. "Because I need to understand what Days Seven through Twelve teach me."

"That's not a reason. That's rationalization." She met my eyes. "You're protecting her. Just like you protected Tom. You're doing it again."

"No. I'm choosing to finish what she started. To learn. To actually understand instead of acting on certainty."

"Or you're afraid." Sarah stood. "If you expose her, you lose your teacher. Your punishment. Your education. And maybe part of you wants this. Wants to be destroyed. Because it's easier than actually changing."

"That's not—"

"Isn't it? You have evidence of murder. You're sitting on it. Why?" She grabbed her coat. "I'm meeting Victoria tomorrow night. Hearing her full pitch. And Jack? Unless you give me a reason not to—a real reason, not guilt or loyalty or sentiment—I'm taking the job. Because I'm done being powerless."

She walked toward the door. I made a choice.

"Wait."

She stopped.

I slid my phone across the bar. The evidence of Tom's murder. "Take this. Give it to Victoria. Tell her I know what she did. Tell her if she tries to recruit you, I'll use it. I'll expose her. End the game. Send her to prison."

"You'd do that? Burn your own education?"

"To protect you? Yes." I met her eyes. "You're not collateral damage. You're not a pawn. And I won't let Victoria use you the way I did."

Sarah picked up the phone. Read the evidence. Her face changed.

"You're serious."

"Completely. Tell her to back off. Or I move. Today."

"And if she calls your bluff?"

"Then I prove I've actually changed by choosing you over my own redemption arc." I poured another drink. "I spent thirteen years using you. I'm done. Make your own choice. But know that Victoria's off the table. I'll burn her first."

Sarah studied me for a long moment. "You actually mean it."

"Yeah."

"That's either the most manipulative thing you've ever done, or you've actually grown a conscience." She pocketed her phone. "I'll think about it."

"Sarah—"

"I said I'll think about it. That's more than you deserve." She walked to the door. Stopped. "For what it's worth? This is the first time I've actually believed you've changed. Because you chose losing me over controlling me."

She left.

I sat alone at the bar, knowing I'd just bet everything on one move.

If Victoria called my bluff, I'd have to follow through. Expose her. End the game. Stop learning.

But I'd done it to protect Sarah. Not control her. Not manipulate her. Actually protect her.

Maybe that's what transformation looked like. Choosing someone else's freedom over your own narrative.

My phone buzzed: **"Interesting move, Detective. Sarah just forwarded me your evidence. You're learning to play chess. Good. Tomorrow's Day Seven. Come alone. We need to talk. —V.A."**

Another text: **"And Jack? Threatening me to protect Sarah? That's actual growth. I'm impressed. The offer for her is withdrawn. She's free to choose her own path. Just like you're letting her. —V.A."**

I stared at the message. Victoria had backed down.

I'd made an active move. And won.

**[OUTLIER THEME: ISOLATION]**`,
    ],
    unknownMessage:
      "\"Interesting move, Detective. You're learning to play chess. —V.A.\"",
  },

  {
    id: 18,
    caseNumber: '006C',
    season: 1,
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
        'Jack watches his former partner plead guilty, then finally admits Victoria is Emily Cross before Day Seven begins.',
      objectives: [
        'Trace the courtroom fallout—arraignment, pleas, families—to show how corruption shatters more than suspects.',
        'Document the photo comparisons and scars that confirm Victoria’s true identity.',
        'Solve before dawn so the epiphany that E.C. stands for Emily Cross lands with maximum weight.',
      ],
    },
    bridgeText: [
      'Some revelations come from staring at old case files until your eyes finally see what they refused to see.',
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '006C-silas-arraignment',
                imageKey: 'keeper',
                title: 'SILAS REED',
                subtitle: 'GUILTY PLEA',
                detail: 'He wept in open court. His family wouldn\'t look at him. I did that. I created the world where he broke.',
              },
              {
                id: '006C-emily-scar-study',
                imageKey: 'silence',
                title: 'VICTORIA / EMILY',
                subtitle: 'THE SCAR',
                detail: 'Above the left eyebrow. Same bone structure. Same eyes. Victoria Ashford is Emily Cross. The woman I declared dead.',
              },
              {
                id: '006C-cross-files',
                imageKey: 'default',
                title: 'CROSS FILE',
                subtitle: 'CLOSED TOO SOON',
                detail: 'I closed her case while she was being tortured. She survived. Rebuilt herself. And came back to teach me.',
              },
            ],
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
        'TRUTH',
      ],
      outlierWords: ['REVEAL', 'EPIPHANY', 'AWAKENING', 'VISION'],
    },
    clueSummaries: {
      main:
        'Main words chart Jack’s confirmation—courtroom consequences and the side-by-side files that prove Victoria is Emily.',
      outliers: {
        REVEAL: 'Signals the mask dropping when Jack says her name aloud.',
        EPIPHANY: 'Marks the shock that he closed the case while she was still alive.',
        AWAKENING: 'Shows Jack finally seeing what Emily wanted him to learn.',
        VISION: 'Captures the act of staring at photos until truth becomes undeniable.',
      },
    },
    narrative: [
      `Before going home, I stopped at the courthouse. Silas Reed's arraignment.

My former partner sat in orange, hands cuffed, looking smaller than I'd ever seen him. When they read the charges—conspiracy, evidence tampering, accessory to false imprisonment—he wept.

His husband sat in the gallery. Wouldn't look at him.

Their sons—both teenagers—stared at their father like he was a stranger.

"Mr. Reed," the judge said. "How do you plead?"

"Guilty, Your Honor. To all charges." His voice broke. "And I'm sorry. To Marcus Thornhill's family. To everyone I hurt by being a coward."

They led him away. His husband left without a word. The sons followed, heads down, ashamed to share his name.

I'd done that. Not just to Marcus Thornhill. But to Silas's family too. By creating an environment where corruption flourished.

---

I went home. Spread out every photo I had of Emily Cross's case. The crime scene. The body. The autopsy reports.

And I looked at Victoria's face on my phone. From yesterday. From the penthouse.

Same scar above the left eyebrow. Same beauty mark below the right eye. Same bone structure. Same eyes.

Seven years older. Harder. Rebuilt.

But the same face.

I pulled out Marcus Webb's folder. Found the society photo: Emily Cross at a gallery opening. Smiling. Alive. Before.

I held it next to my phone.

The same face.

Victoria Ashford was Emily Cross.

The woman I'd declared dead. The case I'd closed too fast. The victim I'd abandoned because an unsolved murder hurt my clearance rate.

She was alive. Had been alive this whole time.

And she'd spent seven years building an empire to destroy me.

The realization hit like a physical blow.

Because I'd just realized what Victoria had said six days ago: *"What happened to her, Detective? After you stopped looking?"*

Not "what happened to Emily." "What happened to HER."

She'd been telling me the whole time. Waiting for me to figure it out.

I called Sarah. Voice not sounding like mine.

"She's Emily Cross. Victoria Ashford. She's Emily. The woman I declared dead seven years ago. She's alive. She's been alive this whole time."

Silence. Then: "Jack, are you sure?"

"I'm looking at her face right now. Same scar. Same features. Same goddamn beauty mark in the exact same spot. I declared her dead while she was being tortured. I closed her case and moved on and she survived and became Victoria and spent SEVEN YEARS planning this."

"Oh my God."

"Emily Cross was kidnapped. Tortured for six months. And I closed her case in twenty-two days because it made me look bad. She didn't die in that warehouse. She escaped. Changed her name. Built an empire. And came back to teach me what my certainty cost."

"What are you going to do?"

"I don't know. But tomorrow's Day Seven. And now I know exactly what I'm being punished for."

I hung up.

Sat in the rain outside Murphy's while Ashport drowned around me.

And I understood what the Midnight Confessor wanted.

Not revenge. Not justice.

Just for me to see her. Actually see her. The person I'd failed to save because saving her would've meant admitting I couldn't close a case perfectly.

Emily Cross had died seven years ago while I filed paperwork.

Victoria Ashford had risen from those ashes to make me watch everything burn.

And she was right to do it.

My phone buzzed: **"Good work today. You've finally connected the pieces. Tomorrow brings a courtroom. Eleanor Bellamy's appeal. You'll testify. You'll tell the truth. And you'll lose anyway. That's Day Seven's lesson: Truth without power is just noise. —E.C."**

E.C. Not M.C.

Emily Cross. Not the Midnight Confessor.

She wasn't hiding anymore.

Day Six was over.

And tomorrow I'd learn that being right about being wrong meant nothing if the system didn't care.

**[OUTLIER THEME: REVELATION]**`,
    ],
    unknownMessage:
      "\"Good work today. You've finally connected the pieces. —E.C.\"",
    },
    {
      id: 19,
      caseNumber: '007A',
      season: 1,
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
        'Jack takes the stand at Eleanor’s appeal, admitting his word means nothing while presenting Victoria’s evidence to free her.',
      objectives: [
        'Catalog the courtroom machinery—judges, recesses, exhibits—that turned truth into a strategy.',
        'Track the forged records and shell companies that expose the original deception.',
        'Finish the grid before the verdict so the narrative lands with Eleanor walking free.',
      ],
    },
    bridgeText: [
      'The courtroom is theater. And sometimes the truth is just the opening act before the real show.',
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '007A-appeals-chamber',
                imageKey: 'sparkle',
                title: 'APPEALS COURT',
                subtitle: 'THE GAMBIT',
                detail: 'I took the stand. Told them my word was worthless. Presented Victoria\'s evidence instead. "Believe the documents, not me."',
              },
              {
                id: '007A-exhibit-folder',
                imageKey: 'default',
                title: 'EXHIBIT A',
                subtitle: 'THE PROOF',
                detail: 'Receipts. Security footage. Everything Victoria gathered. Authentic. Irrefutable. The truth I was too lazy to find.',
              },
              {
                id: '007A-eleanor-freed',
                imageKey: 'sparkle',
                title: 'ELEANOR FREED',
                subtitle: 'CONVICTION OVERTURNED',
                detail: 'She walked out. Didn\'t thank me. Just acknowledged that I\'d finally done my job. Eight years too late.',
              },
            ],
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
        'OBJECTION',
      ],
      outlierWords: ['FORGED', 'CONCEALED', 'SHELL', 'STAGED'],
    },
    clueSummaries: {
      main:
        'Main words chart the courtroom gambit that frees Eleanor—testimony, exhibits, and a verdict built on real proof.',
      outliers: {
        FORGED: 'Calls out the fabricated records Jack once trusted.',
        CONCEALED: 'Highlights the evidence the prosecution buried eight years ago.',
        SHELL: 'Points to the corporations Victoria traced to expose the frame.',
        STAGED: 'Reminds the player that Richard’s murder scene was orchestrated.',
      },
    },
    narrative: [
      `Eleanor Bellamy's appeal. Ten AM. I wasn't playing by Victoria's rules anymore.

Rebecca Moss called me to the stand. "Detective Halloway. You arrested my client eight years ago. Now you say she's innocent. Why should we believe you?"

"You shouldn't."

That stopped her. "I'm sorry?"

"My word is worthless." I pulled out a folder. "But you should believe this."

The documents: sapphire necklace purchased three days before Richard Bellamy's death. Shell corporation. Security footage. Credit card records. Everything proving Eleanor was framed.

"Where did you get this?" Moss asked.

"From someone who actually investigated."

The prosecutor objected. The judge studied the documents. Three-hour recess for independent verification.

Three hours later: authentic.

"Motion granted. Mrs. Bellamy, you're free to go. Conviction overturned."

Eleanor stared at me. Not gratitude. Acknowledgment.

Outside, Sarah waited. "Victoria sent that evidence, didn't she?"

"She helped Eleanor. I was just the delivery mechanism."

"That's not redemption, Jack."

"No. But Eleanor's free. Results matter more than my pride."

My phone buzzed: **"Evidence beats testimony. Results beat apologies. Tomorrow you learn that sometimes the only way to fix the system is to burn it down. —V.A."**

I'd won using Victoria's evidence. Her manipulation. Her system.

Maybe you can't beat corruption by staying clean.

Or maybe that was exactly what Victoria wanted me to believe.

**[PUZZLE THEME: TRUTH / OUTLIER: DECEPTION]**`,
    ],
    unknownMessage:
      '"Evidence beats testimony. Results beat apologies. —V.A."',
  },

  {
    id: 20,
    caseNumber: '007B',
    season: 1,
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
        'Sarah packs up her office, declining Victoria’s offer while building a new integrity project with the people Jack failed.',
      objectives: [
        'Track the allies she names—Claire, Lisa, Eleanor—to map the new team taking shape.',
        'Log the shell corporations and timelines that prove Victoria’s network is wider than Jack feared.',
        'Solve before Sarah walks out so the puzzle lands with the partnership officially over.',
      ],
    },
    bridgeText: [
      'Some partnerships survive lies. But none survive the moment you admit you used someone.',
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '007B-sarah-packing',
                imageKey: 'voice',
                title: 'SARAH LEAVES',
                subtitle: 'PACKING BOXES',
                detail: 'She declined Victoria\'s offer. Declined me too. "I\'m a better detective than both of you."',
              },
              {
                id: '007B-integrity-roadmap',
                imageKey: 'lex',
                title: 'INTEGRITY PROJECT',
                subtitle: 'NEW TEAM',
                detail: 'Claire Thornhill. Lisa Chen. Eleanor Bellamy. Sarah\'s building an army from the people I destroyed.',
              },
              {
                id: '007B-shell-architect',
                imageKey: 'default',
                title: 'PRICE FIRM',
                subtitle: 'THE ARCHITECTS',
                detail: 'Sarah found the link. Geoffrey Price\'s law firm built Victoria\'s shell companies. Helen\'s father. The rot goes deep.',
              },
            ],
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
        'FUTURE',
      ],
      outlierWords: ['DEFECTION', 'SEVER', 'RECRUIT', 'LEVERAGE'],
    },
    clueSummaries: {
      main:
        'Main words follow Sarah’s choice—packing boxes, funding a new project, and walking away from the badge.',
      outliers: {
        DEFECTION: 'Signals how Victoria tried to flip her with promises of power.',
        SEVER: 'Marks the break from Jack and the department.',
        RECRUIT: 'Points to the allies she brings into the Integrity Project.',
        LEVERAGE: 'Shows Sarah holds evidence against both Victoria and Jack if needed.',
      },
    },
    narrative: [
      `Sarah's office. Empty boxes. Her detective shield on the desk like evidence of a crime.

"You're leaving."

"Three days ago. This is just paperwork." She kept packing. "Ashport Conviction Integrity Project. Claire Thornhill as lead investigator. Dr. Lisa Chen on forensics. Eleanor funding it. I'm building something real with the people you destroyed."

"That's good."

"It's necessary." She taped a box shut. "While you've been having your emotional education, I've been doing actual detective work. Victoria's shell corporations? Fifteen created by Geoffrey Price's law firm. Helen's father. Dead five years but his firm's still operating."

"Meaning?"

"Victoria isn't working alone. She's part of something bigger." Sarah grabbed her keys. "FBI moves on the Price firm tomorrow. Twenty-four hours before everything escalates."

"Sarah—"

"Victoria offered me Deputy Director. Three times salary. Real power. I said no." She stopped at the door. "Not because of you. Because I'm a better detective than both of you. And I don't need corrupt resources to prove it."

She left.

Sarah wasn't my partner anymore. She was a third player. Making her own moves.

And she was ahead of both of us.

**[PUZZLE THEME: LOYALTY / OUTLIER: BETRAYAL]**`,
    ],
    unknownMessage:
      "\"Victoria offered me Deputy Director. I said no. Because I'm a better detective than both of you.\"",
  },

  {
    id: 21,
    caseNumber: '007C',
    season: 1,
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
        'Night falls on Day Seven with Jack alone in his office, realizing the cost of telling the truth when power refuses to listen.',
      objectives: [
        'Catalog the empty office details—files, lights, rain—that underscore his isolation.',
        'Highlight the remaining cases and victims to keep the stakes present even without allies.',
        'Close the board before the Midnight Confessor’s text arrives to emphasize the silence.',
      ],
    },
    bridgeText: [
      'Day Seven ends with absence. The partner is gone. What remains is just the work.',
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '007C-empty-desk',
                imageKey: 'default',
                title: 'EMPTY DESK',
                subtitle: 'PARTNER GONE',
                detail: 'For the first time in eight years, her chair is empty. No backup. No conscience. Just me and the work.',
              },
              {
                id: '007C-stacked-files',
                imageKey: 'default',
                title: 'FIVE FILES',
                subtitle: 'INNOCENT VICTIMS',
                detail: 'Five people I framed. Five lives I need to fix. And now I have to do it alone.',
              },
              {
                id: '007C-day-seven-text',
                imageKey: 'silence',
                title: 'E.C. TEXT',
                subtitle: 'DAY SEVEN ENDS',
                detail: '"Truth without power is just noise." She signed it E.C. Emily Cross. She knows I know.',
              },
            ],
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
        'WEIGHT',
      ],
      outlierWords: ['ABSENCE', 'VOID', 'VACANCY', 'ECHO'],
    },
    clueSummaries: {
      main:
        'Main words capture the empty office—rain on the window, whiskey on the desk, and files waiting without allies.',
      outliers: {
        ABSENCE: 'Marks Sarah’s departure and the missing partnership.',
        VOID: 'Highlights the emotional crater left after the appeal.',
        VACANCY: 'Signals the empty chair opposite Jack’s desk.',
        ECHO: 'Leaves only the Confessor’s messages resonating in the silence.',
      },
    },
    narrative: [
      `I sat in my office for the first time in eight years without Sarah Reeves having my back.

The silence was deafening.

My phone buzzed: **"Day Seven complete. You told the truth and lost your last ally. Tomorrow brings art and mirrors. A portrait of what you've become. And an offer that will cost everything or save nothing. —E.C."**

Tomorrow. Day Eight.

I poured a drink and stared at case files.

Five innocent people still in prison. My testimony useless. My partner gone. My credibility destroyed.

And Victoria still playing chess while I scrambled to learn the rules.

Day Seven was over. And I was alone.

**[OUTLIER THEME: ABSENCE]**`,
    ],
    unknownMessage:
      '"Day Seven complete. You told the truth and lost your last ally. Tomorrow brings art and mirrors. —E.C."',
    },
    {
      id: 22,
      caseNumber: '008A',
      season: 1,
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
        'Jack is arrested for Tom Wade’s murder and forced to navigate federal holding, meeting Nathan Thornhill and learning how Victoria orchestrates even his lessons.',
      objectives: [
        'Trace the support network—Nathan, lawyers, motions—that proves who can fight back and who cannot.',
        'Highlight the procedural steps Jack files so players feel the grind the innocent face.',
        'Solve before the thirty-six-hour clock expires to mirror the urgency of securing release.',
      ],
    },
    bridgeText: [
      "The law doesn't care about truth. Only proof. And proof is just evidence someone chose to believe.",
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '008A-fbi-at-dawn',
                imageKey: 'default',
                title: 'FBI RAID',
                subtitle: '6 AM ARREST',
                detail: 'They came for Tom Wade\'s murder. I knew they would. I went peacefully.',
              },
              {
                id: '008A-federal-holding',
                imageKey: 'keeper',
                title: 'NATHAN THORNHILL',
                subtitle: 'CELLMATE',
                detail: 'Marcus Thornhill\'s nephew. Nineteen. Serving twenty years. "You\'re that cop. You framed my uncle."',
              },
              {
                id: '008A-victoria-note',
                imageKey: 'default',
                title: 'HANDWRITTEN NOTE',
                subtitle: 'FROM VICTORIA',
                detail: '"Fight for it. They couldn\'t. You can." She gave me the resources to fight my own arrest. A lesson in privilege.',
              },
            ],
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
        'HEARING',
      ],
      outlierWords: ['PAYOFF', 'BRIBED', 'LEVERAGE', 'INFLUENCE'],
    },
    clueSummaries: {
      main:
        'Main words walk through the arrest and legal scramble—warrants, filings, and the allies Jack suddenly needs.',
      outliers: {
        PAYOFF: 'Points to how Victoria bankrolls the fight the innocent never could afford.',
        BRIBED: 'Hints at the corrupted system that kept Marcus Thornhill caged.',
        LEVERAGE: 'Shows Victoria weaponising resources to reshape outcomes.',
        INFLUENCE: 'Underscores the power imbalance between Jack and those he once framed.',
      },
    },
    narrative: [
      `FBI at my door. 6 AM. Expected.

"Jack Halloway. You're here for Tom Wade's murder. I'll come peacefully."

Federal holding. Cellmate: nineteen, drug possession, twenty years.

"You're that cop. You framed my uncle. Marcus Thornhill."

"I'm sorry."

"Everyone's sorry." But he didn't turn away. "I'm Nathan. Marcus's nephew. Victoria visited last week. Said you'd end up here. Said to give you this."

Handwritten note from his mattress:

**"Detective—You're experiencing what they experienced. But I'm giving you tools they never had. Nathan's lawyer has evidence proving your innocence. But you have to ask for it. Fight for it. They couldn't. You can. —V.A."**

I called Sarah. "Contact Nathan Thornhill's lawyer. Victoria provided evidence clearing me. But I have to fight for it formally."

For thirty-six hours, I filed motions. Requested evidence. Challenged procedures. Did everything the innocent victims I'd destroyed couldn't afford to do.

The system doesn't just fail the innocent. It makes fighting back so expensive that most people can't.

But I could. Because Victoria gave me resources.

She was teaching me the difference between victims who can't fight and victims who aren't allowed to fight.

And I'd spent thirty years never asking which was which.

**[PUZZLE THEME: TRUST NETWORK / OUTLIER: PAYOFF]**`,
    ],
    unknownMessage:
      "\"Detective—You're experiencing what they experienced. Fight for it. —V.A.\"",
  },

  {
    id: 23,
    caseNumber: '008B',
    season: 1,
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
        'Thirty-six hours later Jack walks out because Victoria decides the lesson is over, proving who really controls the justice machine.',
      objectives: [
        'Document the timeline of filings and the sudden appearance of exculpatory footage.',
        'Track the texts from Victoria and Sarah to show how power shifts offstage.',
        'Solve before the gates open to capture the sensation of conditional freedom.',
      ],
    },
    bridgeText: [
      'Some releases come from the person who framed you deciding the lesson is over.',
    ],

      evidenceBoard: {
        polaroids: [
          {
            id: '008B-release-order',
            imageKey: 'default',
            title: 'RELEASE ORDER',
            subtitle: '36 HOURS LATER',
            detail: 'I walked out. Charges dropped. Evidence "misplaced." Not because I was innocent. Because Victoria decided the lesson was over.',
          },
          {
            id: '008B-emily-message',
            imageKey: 'silence',
            title: 'EMILY CROSS',
            subtitle: 'THE LESSON',
            detail: 'She showed me the difference between victims who can\'t fight and victims who aren\'t allowed to fight.',
          },
          {
            id: '008B-missing-time',
            imageKey: 'default',
            title: 'LOST TIME',
            subtitle: 'THE COST',
            detail: 'Thirty-six hours. Nathan Thornhill has twenty years. I got a glimpse. He gets the life.',
          },
        ],
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
        'POWER',
      ],
      outlierWords: ['PUPPET', 'STRINGS', 'MASTER', 'PERMISSION'],
    },
    clueSummaries: {
      main:
        'Main words capture the engineered release—fresh footage, open gates, and the messages that dictate Jack’s next move.',
      outliers: {
        PUPPET: 'Shows Jack walking free only because Victoria allows it.',
        STRINGS: 'Calls out the invisible pull she maintains.',
        MASTER: 'Names the person really commanding the board.',
        PERMISSION: 'Reminds players the justice system moved only when she said so.',
      },
    },
    narrative: [
      `Thirty-six hours later: "You're being released. New evidence. Security footage showing you elsewhere during Tom's death."

Victoria.

Outside, my phone buzzed: **"Day Eight complete. You've felt what they felt. I could destroy you anytime. But making you live is worse. Four days left. —E.C."**

During my thirty-six hours, Eleanor's appeal had been granted. The others would follow.

The system was reforming.

And I'd had nothing to do with it. Victoria had orchestrated everything.

Sarah texted: **"Eleanor's out. Others will follow. Victoria did what we couldn't. Are you sure you should refuse her offer? —SR"**

Four days left. Then the choice: join Victoria or refuse her.

Work for a monster who delivers justice, or work alone and accomplish nothing.

Some choices aren't between good and evil. They're between two different kinds of evil.

**[OUTLIER THEME: CONTROL]**`,
    ],
    unknownMessage:
      "\"Day Eight complete. You've felt what they felt. —E.C.\"",
  },

  {
    id: 24,
    caseNumber: '008C',
    season: 1,
    day: 8,
    title: 'The Choice Ahead',
    mainTheme: { name: 'CHOICE', icon: '⚔️' },
    outlierTheme: { name: 'TEMPTATION', icon: '🍷' },
    attempts: 4,
    dailyIntro: ``,
    briefing: {
      summary:
        'Freed but indebted, Jack weighs the looming offer from Victoria against the justice she delivers, with four days left to decide.',
      objectives: [
        'Collect the options and consequences Sarah and Victoria lay out so the puzzle feels like a strategic ledger.',
        'Highlight the remaining innocent cases and the cost of joining versus resisting.',
        'Close the board before dawn to mirror the dwindling time to choose.',
      ],
    },
    bridgeText: [
      "The law doesn't care about truth. Only proof. And the proof she offers tastes like power.",
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '008C-forked-road',
                imageKey: 'default',
                title: 'FORKED ROAD',
                subtitle: 'TWO PATHS',
                detail: 'Join Victoria and watch corrupt justice work. Or refuse and watch the innocent suffer in procedural purgatory.',
              },
              {
                id: '008C-pending-cases',
                imageKey: 'default',
                title: 'FIVE FILES',
                subtitle: 'STILL WAITING',
                detail: 'Eleanor. Marcus. Lisa. James. Teresa. Their lives hang in the balance of my indecision. Four days left.',
              },
              {
                id: '008C-victoria-gallery',
                imageKey: 'silence',
                title: 'GALLERY INVITE',
                subtitle: 'PERFECT EVIDENCE',
                detail: 'Museum-quality paper. "A Retrospective Exhibition." Victoria wants me to see my career framed on a wall.',
              },
            ],
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
        'DECISION',
      ],
      outlierWords: ['TEMPT', 'BARGAIN', 'SACRIFICE', 'SUBMISSION'],
    },
    clueSummaries: {
      main:
        'Main words arrange the strategic choices—alliances, costs, and the ticking clock toward Victoria’s offer.',
      outliers: {
        TEMPT: 'Signals the allure of joining the Confessor’s empire.',
        BARGAIN: 'Marks the price attached to every potential partnership.',
        SACRIFICE: 'Reminds Jack someone will pay no matter what he chooses.',
        SUBMISSION: 'Warns that accepting power may mean surrendering himself.',
      },
    },
    narrative: [
      `Four days left.

The system was reforming without me. Victoria orchestrated every reversal, every release, every lesson I thought I was learning on my own.

Sarah's text replayed on my screen: **"Are you sure you should refuse her offer?"**

If I joined her, the innocent walked free. Corruption crumbled. Outcomes happened.

If I refused, I kept my soul—and condemned people to stay caged because the system prefers procedure over mercy.

Some choices aren't between good and evil. They're between whose evil you can live with.

Day Eight ended with the understanding that power can be leveraged for justice, even when wielded by the guilty.

And I had four days to decide whether that made me complicit or redeemed.

**[OUTLIER THEME: TEMPTATION]**`,
    ],
    unknownMessage:
      '"Four days left. Choose whose evil you can live with. —E.C."',
    },
    {
      id: 25,
      caseNumber: '009A',
      season: 1,
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
        'Victoria unveils a gallery of Jack’s cases, forcing him to confront every failure as public art and dangling an ultimatum to join her empire.',
      objectives: [
        'Document each exhibit—necklace, lab reports, timelines—to catalog the evidence she weaponised as art.',
        'Meet the people in the gallery, especially Lucia’s mother, to feel the personal cost of Jack’s certainty.',
        'Hold the board until the contract ultimatum lands so the narrative hits with the weight of the choice ahead.',
      ],
    },
    bridgeText: [
      "Some exhibitions exist only to show you what you've destroyed.",
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '009A-gallery-entry',
                imageKey: 'default',
                title: 'THE GALLERY',
                subtitle: 'EXHIBIT A',
                detail: 'Eleanor\'s sapphire necklace. Displayed like a trophy. "How $200,000 bought eight years of innocence."',
              },
              {
                id: '009A-forged-reports',
                imageKey: 'sparkle',
                title: 'MRS. MARTINEZ',
                subtitle: 'THE MOTHER',
                detail: '"She looks like me." Lucia\'s mother stood by the photo. Eleven months her daughter screamed. I stopped looking.',
              },
              {
                id: '009A-empty-eyes',
                imageKey: 'silence',
                title: 'THE PORTRAIT',
                subtitle: 'EMPTY EYES',
                detail: 'Ten feet tall. Charcoal. My face. But the eyes were dead. "I painted this while I was held," she said.',
              },
            ],
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
        'ULTIMATUM',
      ],
      outlierWords: ['UNKNOWN', 'MYSTERY', 'QUESTION', 'MASK'],
    },
    clueSummaries: {
      main:
        'Main words trace Victoria’s retrospective—every curated piece, invitation, and contract that reframes Jack’s history.',
      outliers: {
        UNKNOWN: 'Points to the unanswered questions the exhibits force Jack to confront.',
        MYSTERY: 'Signals the secrets still hidden in Victoria’s narrative.',
        QUESTION: 'Challenges the certainty Jack once carried through each case.',
        MASK: 'Shows how the portrait reveals and conceals identity at once.',
      },
    },
    narrative: [
      `Day Nine started with an invitation. Black envelope. Museum-quality paper.

**You are cordially invited to: PERFECT EVIDENCE - A Retrospective Exhibition. Featuring: The Works of Victoria Ashford. Lamplight Gallery, 9 AM.**

I went at nine.

The Lamplight Gallery occupied a converted warehouse. Floor-to-ceiling windows. White walls. Track lighting.

Every installation was one of my cases.

**Exhibit A:** Eleanor's sapphire necklace in a display case. *"Perfect Evidence: How $200,000 bought eight years of innocence."*

**Exhibit B:** Marcus Thornhill's documents. Silas Reed's signatures blown up. *"Perfect Evidence: How a blackmailed partner destroyed a family."*

**Exhibit C:** Dr. Lisa Chen's lab reports with Tom Wade's corrections visible in UV light. *"Perfect Evidence: How a best friend manufactured truth for twenty years."*

**Exhibit D:** A nursing student's ID badge in a frame. Lucia Martinez, age 24. Beside it: a timeline showing she was kidnapped three months after I closed Emily's case. Held eleven months. Died in captivity. Below the display: *"Perfect Evidence: How certainty kills."*

I stared at Lucia's photo. Young. Smiling. Alive. Before.

"She looks like me."

I turned. A woman in her fifties. Same eyes as the photo. Mrs. Martinez.

"You're—"

"Lucia's mother. Victoria invited me. Said the detective who stopped looking would be here." She studied the exhibit. "Eleven months my daughter screamed in that basement. While you wrote reports and closed files and collected commendations."

"I'm sorry."

"Everyone's sorry. After." She touched the glass. "Victoria told me you declared Emily dead. Moved on. Said you valued your clearance rate more than finding the truth. Is that true?"

"Yes."

"At least you're honest now." She walked to the next exhibit. "Too late for Lucia. But maybe it means something to someone."

Five exhibits. Five innocent victims. One dead girl who'd still be alive if I'd kept looking. Each case displayed like art. Like trophies of my failure.

At the center, facing the entrance: a portrait. Ten feet tall. Charcoal on canvas.

My face. Rendered in perfect detail. But the eyes were empty. Dead.

Victoria stood in front of it, wearing black. Champagne in hand.

"Hello, Detective. What do you think of my work?"

"It's devastating."

"Thank you. I worked very hard on your eyes. Getting the emptiness right took six months." She sipped champagne. "I painted this while I was held. Had nothing else to do but imagine your face. The man who declared me dead."

"I'm sorry."

"Sorry. You keep saying that word." She set down her glass. "But you can help me finish what I started. The five innocents go free. The system gets exposed. And you..." She pulled out a document. "You work for me."

"Work for you?"

"Deputy Director of Investigations. Blackwell Industries. Legitimate work. Real resources. Help me build something that actually functions." She handed me the contract. "Or refuse. Go to prison. Your choice."

"You want me to join your empire. Built on blackmail and manipulation."

"I want you to help me make it better. Less corrupt. More effective." Her eyes were hard. "I'm offering work that matters. A chance to actually fix things instead of just confessing."

"And if I refuse?"

"Then you go to prison on manufactured evidence again. I'll frame you for something worse. Perfect evidence. Just like you taught me."

Behind her, the gallery filled with people. Art collectors. Society figures. And in the corner: Sarah Reeves.

She saw me. Looked away.

"Sarah's here," Victoria said. "Making her choice. Between staying broken, joining my empire, or building something new." She turned back. "What's your choice, Detective?"

I looked at the portrait. At the empty eyes.

"I need time."

"You have until Day Twelve. But know this: refusing doesn't make you noble. It just makes you powerless." Victoria walked away. "Enjoy the exhibition. Today also brings the city burning. And a recording you can't unhear."

I stood in front of my portrait. Surrounded by my failures. Displayed like art for Ashport's elite.

Then my phone buzzed. News alert. City Hall on fire.

**[PUZZLE THEME: IDENTITY / OUTLIER: UNKNOWN]**`,
    ],
    unknownMessage:
      '"Enjoy the exhibition. You have until Day Twelve. —V.A."',
  },

  {
    id: 26,
    caseNumber: '009B',
    season: 1,
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
        'Sarah exposes Ashport’s corruption network on live television, turning Victoria’s revenge map into a legitimate federal takedown.',
      objectives: [
        'Track the raids, arrests, and shell corporations Sarah details during the press conference.',
        'Record how Helen Price, Marcus Webb, and the Price law firm fit into the collapsing power structure.',
        'Hold the board through Victoria’s furious call to feel the moment her control fractures.',
      ],
    },
    bridgeText: [
      'Corruption stays hidden until someone lights the match. Today, Ashport learns what happens when all the secrets burn at once.',
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '009B-city-hall',
                imageKey: 'default',
                title: 'CITY HALL',
                subtitle: 'FBI RAID',
                detail: 'Swarming with agents. Warrants executed. Records seized. The Price firm at the center of the web.',
              },
              {
                id: '009B-sarah-podium',
                imageKey: 'voice',
                title: 'SARAH REEVES',
                subtitle: 'THE PRESSER',
                detail: 'She stood at the podium. "Systematic corruption spanning two decades." She stole Victoria\'s narrative and made it justice.',
              },
              {
                id: '009B-helen-note',
                imageKey: 'lex',
                title: 'HELEN PRICE',
                subtitle: 'THE END',
                detail: 'Suicide note released by her lawyer. Fifteen pages of confession. She couldn\'t live with what her family built.',
              },
            ],
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
        'LEGITIMACY',
      ],
      outlierWords: ['BRIBE', 'KICKBACK', 'PAYOFF', 'BLACKMAIL'],
    },
    clueSummaries: {
      main:
        'Main words chronicle Sarah’s federal takedown—press briefings, warrants, and the network collapsing on live TV.',
      outliers: {
        BRIBE: 'Highlights the financial grease that kept the system running.',
        KICKBACK: 'Shows the favors traded through Price & Associates.',
        PAYOFF: 'Connects the corruption to quietly silenced cases.',
        BLACKMAIL: 'Reminds players how Victoria once leveraged the same secrets.',
      },
    },
    narrative: [
      `I left the gallery and my phone rang. Sarah.

"Turn on the news. Now."

Every channel: FBI swarming city offices. Arrests. Raids.

But this wasn't Victoria's doing.

"I did it," Sarah said. "Remember three days ago when I told you Victoria wasn't working alone? I was right. Geoffrey Price's law firm—they've been creating shell corporations for twenty years. Not just for Victoria. For everyone. Mayor Harrison. Chief Justice Chen. Commissioner Davis. The entire institutional network."

"Sarah, what did you do?"

"I gave FBI everything. Three years of financial records. Two hundred fifty shell companies. Four thousand pages of documentation. And Jack? Victoria didn't compile it. I did. By following the trail she started, but going further. Deeper. Tracing every connection she missed."

On TV: FBI agents leading city officials out in handcuffs. But the press conference wasn't Victoria standing at the podium.

It was Sarah.

"This morning, in coordination with federal prosecutors, we executed warrants on seventeen city offices and three law firms. The evidence shows systematic corruption spanning two decades, facilitated by a network of shell corporations created by Price & Associates..."

She looked professional. Confident. Nothing like the partner who'd followed my lead for thirteen years.

A reporter shouted: "What about former ADA Helen Price? Will she face charges?"

Sarah's face was stone. "Helen Price took her own life last night. She left a note apologizing to the families of those wrongfully convicted. Her father's law firm was the architect of this corruption network. She discovered his involvement last week and couldn't live with what her family had built."

My stomach dropped. Helen was dead. The Queen of Convictions had chosen her own ending rather than face what came next.

Another reporter: "Sources say Marcus Webb, antiquities dealer, testified before a grand jury yesterday. Can you confirm?"

"Mr. Webb provided crucial testimony regarding the Richard Bellamy murder. His statement establishes Eleanor Bellamy's innocence and identifies the actual killer. That information is sealed pending ongoing investigations."

Marcus had testified. Finally. Eight years late, but he'd done it.

"I took your investigation," Sarah continued on the phone while I watched her on TV. "I took Victoria's revenge plot. And I turned it into actual prosecution. Twenty-three arrests. Seventeen more pending. And Jack? Victoria's furious. I stole her narrative. Became the hero before she could."

"She'll come after you."

"Let her try. I have FBI protection. Witness testimony. And something she doesn't: legal legitimacy." A pause. "You were right about one thing. Results matter. But you were wrong about another: you don't need corruption to get them. You just need to actually do the work."

On screen, Sarah fielded questions: "Detective Reeves, how did you uncover this network?"

"By following evidence previous investigations dismissed. By interviewing witnesses who were considered 'unreliable.' By doing thorough detective work instead of taking shortcuts."

A reporter: "Sources say Victoria Ashford was planning to reveal this corruption. Did you coordinate with her?"

"No. Victoria Ashford is a person of interest in multiple ongoing investigations. Her so-called 'whistleblowing' was selective exposure designed to serve her agenda. This investigation serves justice."

Sarah had just stolen Victoria's endgame. Turned her revenge plot into legitimate prosecution. Became the hero of her own story.

And left both Victoria and me scrambling to catch up.

My phone rang. Not a text. A call. Victoria. I answered.

"You're watching." Her voice was different. Tight. Angry. Raw.

"Yeah."

"She stole it." Not controlled. Not three-moves-ahead. Just furious. "I spent three years building that exposure. Documenting every transaction. Creating the perfect reveal. And she just—took it. Turned it into HER story. Made herself the hero."

"You sound surprised."

"I am." Pause. Breathing. "I planned for you confessing. For the gallery burning. For everything. But I didn't plan for Sarah to outmaneuver me. To actually become an independent player." A bitter laugh. "You taught her well. She learned to steal narratives from the best."

"Victoria—"

"I'm not omnipotent, Jack. I can't predict everything. Sarah just proved that." Her voice cracked. "I wanted to be the one who exposed the system. I wanted credit. Validation. Proof that I'd done something that mattered. And she took it. Made it legitimate. Made me irrelevant."

I'd never heard her sound like this. Vulnerable. Genuinely hurt.

"You still freed five innocent people. You still exposed the corruption."

"Sarah did. I just provided the map. She drove the actual car." Silence. "You know what's worse? She's right. She did it clean. No murders. No manipulation. Just evidence and persistence. She proved you don't need to become a monster to fight monsters."

"That's a good thing."

"Is it? Because it means I became Victoria Ashford for nothing. I could've stayed Emily. Could've fought clean. Could've been Sarah." Her voice hardened. "Tomorrow you get the recording. The proof of what you cost me. And maybe you'll understand why I needed to be three moves ahead. Because when you're not—when someone surprises you—it feels like this. And it's awful."

She hung up.

I stared at my phone. Victoria—always controlled, always calculated, always ahead—had just admitted failure. Had shown vulnerability. Had proven she wasn't omnipotent.

Sarah hadn't just stolen her narrative. She'd broken the illusion that Victoria was untouchable.

For the first time in twelve days, I saw the truth: Victoria was just a person. Damaged. Brilliant. Dangerous. But still just a person who could be surprised, outmaneuvered, and hurt.

And maybe that meant she could also heal.

**[PUZZLE THEME: GOVERNMENT / OUTLIER: CORRUPTION]**`,
    ],
    unknownMessage:
      '"I took the map and made it justice. —Sarah Reeves"',
  },

  {
    id: 27,
    caseNumber: '009C',
    season: 1,
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
        'Late at night a bloodstained recorder arrives, forcing Jack and Sarah to listen to Emily’s captivity and the moment his closure sealed her fate.',
      objectives: [
        'Transcribe key moments from the recording—Emily’s pleas, Jack’s phone call, Grange’s threats.',
        'Capture the emotional fallout as Sarah reframes Victoria’s motives and Jack commits to accountability.',
        'Solve before the tape ends so the board lands with the realization that transformation may still be possible.',
      ],
    },
    bridgeText: [
      'Some packages are hand-delivered at midnight like confessions nobody asked for.',
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '009C-blood-recorder',
                imageKey: 'default',
                title: 'THE RECORDER',
                subtitle: 'BLOODSTAINED',
                detail: 'Old. Scratched. Red ribbon. "Listen to what you couldn\'t find seven years ago."',
              },
              {
                id: '009C-ec-scrawl',
                imageKey: 'silence',
                title: 'EMILY CROSS',
                subtitle: 'THE TAPE',
                detail: 'Forty-seven days in. She begged for help. Then Grange played my voice closing her case. Then she screamed.',
              },
              {
                id: '009C-midnight-rain',
                imageKey: 'voice',
                title: 'SARAH REEVES',
                subtitle: 'THE WITNESS',
                detail: 'We sat in the dark. Listened to Emily scream. "She\'s not trying to destroy you," Sarah said. "She\'s trying to save you."',
              },
            ],
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
        'REBUILD',
      ],
      outlierWords: ['REVEAL', 'AWAKEN', 'SEE', 'UNDERSTAND'],
    },
    clueSummaries: {
      main:
        'Main words sit inside the package—the recorder, the screams, and Jack’s vow to face prison after hearing the truth.',
      outliers: {
        REVEAL: 'Marks the layers of Emily’s story finally exposed.',
        AWAKEN: 'Signals Jack waking fully to his role in her suffering.',
        SEE: 'Captures Sarah’s insight into Victoria’s motives.',
        UNDERSTAND: 'Shows both of them grasping what transformation will require.',
      },
    },
    narrative: [
      `The package arrived at Sarah's house that night. She called me at 11 PM.

"Jack? You need to come here. Now."

I drove through rain. She answered looking like she'd aged ten years in six hours.

"What's wrong?"

On the coffee table: a black box. Red ribbon. My name in silver ink.

"It came an hour ago. I opened it. Listened to the first five minutes. Then stopped. Called you. Jack... it's bad."

I sat down. Opened the box.

Inside: a digital recorder. Old. Scratched. Blood on the casing.

And a note: **"Day Nine. Listen to what you couldn't find seven years ago. Then understand why I'm not the monster. —E.C."**

Sarah sat across from me. "Do you want me to stay?"

"Yes."

I pressed play.

Dead air. Static. Then—breathing. Heavy. Panicked.

Emily's voice. Young. Terrified.

"My name is Emily Cross. Today is March 19th. I've been held for forty-seven days. They're—"

A man's voice: "Say it again. Clearly."

"Please. Someone find me. My father knows—"

The sound of a blow. Emily crying—small, broken sounds.

Sarah reached to stop it. I caught her hand. "We need to hear it."

The recording continued. Hours condensed. Emily in darkness. Tortured. Interrogated. Grange's voice throughout.

Water sounds. Drowning. Emily gasping, choking.

Then—forty-seven minutes in—my voice.

Clean. Professional. Bored.

On a phone call. Grange had played it for Emily on speaker.

"Captain, I'm closing the Cross case. Body matches description. Dental records confirm. She's dead. I'm moving on to the Morrison homicide. That one's got actual leads."

Pause. "Yeah, I know the family wants closure. They've got it. Case closed."

Click.

Emily's scream. Raw. Broken. Primal. The sound hope makes when it dies.

The sound went on for a full minute.

Then Grange: "See? Nobody's looking anymore. You're dead, Emily. Officially. Which means I can do whatever I want to you."

The recording continued. Six months condensed. Emily losing herself. Planning.

Last entry—the day she escaped:

"I survived. I escaped. And I will make them all pay. Every person who failed me. Jack Halloway first. Because his arrogance let this happen."

Silence.

Sarah stopped the playback.

We sat in the dark, listening to rain.

My hands shaking since I'd heard my own voice declaring Emily dead while she screamed.

"She was alive," Sarah said finally. "For six months. While you closed her case."

"I know."

"Jesus, Jack. How did we become this?"

"One case at a time. One corner cut. One certainty too many." I stood. "Victoria's right. The system broke her. And I was the weapon it used."

"So what now?"

"Now I finish what I started. Free the five. Take responsibility." I turned back. "And then I answer for it. Properly. I go to prison. Where I belong."

Sarah was quiet. Then: "I listened to that recording and realized something. Victoria's not trying to destroy you. She's trying to make you understand. And I think she might actually care what happens to you."

"That doesn't make sense."

"Doesn't it? She's spent seven years building this. She could've killed you Day One. She didn't. She's teaching you. Systematically. Patiently. I think Emily Cross is still in there. And she's trying to save you from being what destroyed her."

"By destroying me?"

"By rebuilding you. Breaking you down. So you can be something different."

**[OUTLIER THEME: REVELATION]**`,
    ],
    unknownMessage:
      "\"Day Nine. Listen to what you couldn't find. —E.C.\"",
    },
    {
      id: 28,
      caseNumber: '010A',
      season: 1,
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
        'FBI schedules Victoria’s arrest, forcing Jack to weigh Tom Wade’s murder evidence against the appeals that depend on her documentation.',
      objectives: [
        'Record the legal levers—warrants, appeals, filing deadlines—that make the decision impossible.',
        'Track which innocents still rely on Victoria’s evidence so the stakes stay personal.',
        'Finish the grid before midnight to mirror Jack’s shrinking window to choose.',
      ],
    },
    bridgeText: [
      "Art galleries exist to show you what you can't look away from. Even when you want to.",
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '010A-agent-martinez',
                imageKey: 'buyer',
                title: 'AGENT MARTINEZ',
                subtitle: 'THE CALL',
                detail: '"We\'re moving on Victoria Ashford at dawn." The FBI was ready. The evidence was piled high.',
              },
              {
                id: '010A-wade-evidence',
                imageKey: 'default',
                title: 'TOM\'S MURDER',
                subtitle: 'THE LEVERAGE',
                detail: 'I had the DNA. The rope fibers. The proof Victoria killed Tom. I could end it right now.',
              },
              {
                id: '010A-appeal-dockets',
                imageKey: 'default',
                title: 'FIVE DOCKETS',
                subtitle: 'THE INNOCENTS',
                detail: 'Eleanor. James. Lisa. Marcus. Teresa. Their freedom depended on Victoria\'s files remaining clean for 24 hours.',
              },
            ],
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
        'MIDNIGHT',
      ],
      outlierWords: ['UNKNOWN', 'AMBIGUITY', 'GREY', 'PARADOX'],
    },
    clueSummaries: {
      main:
        'Main words circle Jack’s ledger—phone calls, warrants, evidence—while he decides whose justice comes first.',
      outliers: {
        UNKNOWN: 'Highlights how neither option guarantees a righteous outcome.',
        AMBIGUITY: 'Keeps the moral fog front and centre for players.',
        GREY: 'Reminds that legal black-and-white fails here.',
        PARADOX: 'Names the conflicting truths Jack must hold at once.',
      },
    },
    narrative: [
      `Day Ten started with a phone call from FBI Agent Martinez.

"Detective Halloway. We need to talk. About Victoria Ashford."

"What about her?"

"We're moving on her tomorrow. Twenty-three counts including murder, conspiracy, money laundering. Sarah Reeves provided enough evidence to get warrants. We'll arrest her at dawn."

My stomach dropped. "Tomorrow?"

"Unless you have a reason we should wait." He paused. "You have evidence she killed Dr. Wade. That was five days ago. You haven't reported it. Why?"

Because I was learning. Because I needed to understand. Because—

"Jack, if you're protecting her—"

"I'm not. I'll send you everything I have. Give me two hours."

I hung up. Stared at my phone.

The evidence of Tom's murder. DNA. Rope. Victoria's confession on recording. Everything needed to put her away for life.

But tomorrow was also Eleanor Bellamy's final appeal. Victoria had provided the evidence. If FBI arrested Victoria first, that evidence becomes fruit of the poisonous tree. Inadmissible. Eleanor stays in prison.

Same with Marcus's posthumous exoneration. Lisa Chen's case review. James Sullivan's appeal. All dependent on Victoria's documentation. All compromised if she's arrested before they're processed.

I called Sarah. "FBI is moving on Victoria tomorrow. Dawn raid."

"Good. She's a murderer."

"Eleanor's appeal is tomorrow afternoon. If Victoria's arrested first—"

"The evidence gets challenged. I know." Sarah was quiet. "But Jack, she killed Tom. She let twenty-three people die. She can't just... walk free because timing is inconvenient."

"I have a choice. I can send FBI my evidence tonight. They arrest her tomorrow morning. Victoria goes to prison, justice is served. But Eleanor, Marcus, Lisa, James—they all stay convicted. The appeals fail. They rot."

"Or?"

"Or I wait. Twenty-four hours. Let Eleanor's appeal process. Let the other cases finalize. Then give FBI everything. Victoria gets one more day of freedom. But five innocent people go free."

"That's not a choice, Jack. That's obstruction."

"I know. But if I act on principle—if I do the 'right thing' and turn in a murderer immediately—five innocent people stay in prison. Maybe for years. Maybe forever." I looked at the evidence files. "What's the right answer?"

"There isn't one. That's the point." Sarah's voice was hard. "You're asking me to help you decide between justice and mercy. Between doing your job and saving innocents. Between being the cop you were trained to be and being the person you're trying to become."

"So what do I do?"

"I don't know. But I know this: whatever you choose, you have to live with it. If you wait and Victoria kills someone else tomorrow, that's on you. If you act now and five innocent people die in prison, that's also on you." She paused. "Welcome to being an actual human being instead of a certainty machine. It's awful."

She hung up.

I sat in my apartment. Evidence of murder in one hand. Files of five innocent people in the other.

Both choices were right. Both choices were wrong.

Wait, and I'm protecting a murderer. Act, and I'm dooming innocents.

This was the choice Victoria had been building toward. Not Day Eleven's "join me or refuse me." This. Right now. The moment where I had to decide what mattered more: punishment or salvation. Justice or mercy. The law or the outcome.

I thought about Eleanor. Eight years in Greystone. Tomorrow could be her last day there.

I thought about Tom. Dead. Murdered. Justice demanded Victoria pay.

I thought about the twenty-three people Victoria let die to build her victim narrative. Justice demanded she answer for them.

I thought about Marcus Thornhill. Dead by suicide. His daughter Claire fighting for seven years to clear his name. Tomorrow could be the day.

No good answer. No clean solution. Just a choice that would define who I actually was underneath all the guilt and education and transformation.

I looked at the clock. 8 PM. I had until midnight to decide. After that, FBI would move with or without my evidence.

Four hours to choose between being right and being good.

And I didn't know which was which anymore.

**[PUZZLE THEME: IDENTITY / OUTLIER: UNKNOWN]**`,
    ],
    unknownMessage:
      '"Four hours. Choose who you are. —E.C."',
  },

  {
    id: 29,
    caseNumber: '010B',
    season: 1,
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
        'Jack delays Victoria’s arrest for twenty-four hours, trusting Emily to stay put so five innocent people can walk free before he turns himself in.',
      objectives: [
        'Track the calls with Martinez and Victoria that frame the ethical tightrope.',
        'List the innocents whose appeals hinge on the delay to keep their names in focus.',
        'Solve before dawn to mirror the promise of “twenty-four hours of Emily, not Victoria.”',
      ],
    },
    bridgeText: [
      "Some meetings happen when you finally admit you're staring at your own reflection.",
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '010B-recorded-confession',
                imageKey: 'default',
                title: 'THE CHOICE',
                subtitle: 'OBSTRUCTION',
                detail: '"I\'m asking you to wait twenty-four hours." I told Martinez. I chose the five innocents over the one guilty.',
              },
              {
                id: '010B-twentyfour-deal',
                imageKey: 'silence',
                title: 'THE CALL',
                subtitle: 'TO VICTORIA',
                detail: '"Give me twenty-four hours of Emily, not Victoria." I warned her. Trusted her not to run.',
              },
              {
                id: '010B-five-case-files',
                imageKey: 'default',
                title: 'FIVE LIVES',
                subtitle: 'THE WAGER',
                detail: 'I bet my career, my freedom, and my soul on the hope that mercy was worth the risk.',
              },
            ],
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
        'OBSTRUCTION',
      ],
      outlierWords: ['CHOICE', 'CONSEQUENCE', 'GAMBLE', 'RISK'],
    },
    clueSummaries: {
      main:
        'Main words track the moral calculus—mercy, justice, trust—in Jack’s deliberate obstruction.',
      outliers: {
        CHOICE: 'Reinforces that every action locks in a side of the ledger.',
        CONSEQUENCE: 'Foreshadows the charges Jack will face.',
        GAMBLE: 'Names the risk of Victoria running or killing again.',
        RISK: 'Keeps players mindful that mercy might still backfire.',
      },
    },
    narrative: [
      `At 10 PM, I made my choice.

I called Agent Martinez. "The evidence you wanted. I'm not sending it tonight."

"Excuse me?"

"Eleanor Bellamy's appeal is tomorrow at 2 PM. James Sullivan's case review processes at noon. Lisa Chen's exoneration hearing is at 10 AM. All dependent on Victoria's documentation. If you arrest her at dawn, that evidence becomes compromised. Five innocent people stay convicted."

"So you're asking me to delay arresting a murderer—"

"I'm asking you to wait twenty-four hours. Let the appeals process. Then I'll give you everything. Every piece of evidence. Full testimony. She goes away for life. But five innocent people go free first."

Martinez was quiet. "You're asking me to prioritize outcome over procedure."

"I'm asking you to choose between punishing one guilty person and freeing five innocent ones. If those are mutually exclusive—and today they are—which matters more?"

"This is obstruction of justice."

"This is choosing between justice and Justice. Between doing my job and doing what's right. And I'm choosing the innocents. If that makes me guilty, fine. Add it to the list." I looked at Tom's evidence. "Twenty-four hours. Then she's yours."

"And if she kills someone tomorrow? If she flees? If something goes wrong?"

"Then it's on me. I'll take responsibility. I'll testify that I had evidence and chose to withhold it. I'll go to prison for obstruction. But I won't doom five innocent people to save my conscience."

Martinez exhaled. "You're betting everything on this."

"I am."

"Why?"

"Because for thirty years I chose certainty over truth. I chose my career over innocents. I chose being right over being good." I stood. "This time I'm choosing differently. Even if it destroys me."

"Twenty-four hours," Martinez said. "But Jack? I'm documenting this call. If anything happens—anything—you're going down for obstruction, accessory after the fact, everything. Clear?"

"Clear. And worth it."

I hung up.

Then I called Victoria. "I know FBI is coming for you. Tomorrow. Dawn raid. Sarah gave them everything."

Silence. "And you're warning me why?"

"Because I'm giving you twenty-four hours. Eleanor's appeal, James's case review, Lisa's hearing—they all process tomorrow. Your evidence needs to be clean. Legitimate. Not compromised by your arrest."

"So you're protecting me."

"I'm protecting them. The five innocent people. But Victoria—after tomorrow, after the appeals process, I'm giving FBI everything I have on Tom's murder. Everything. You'll go away for life. Use these twenty-four hours well. Because they're the last freedom you'll have."

"You're choosing mercy over justice."

"I'm choosing five innocents over one guilty. That's not mercy. That's arithmetic." I looked out the window. "But I need you to promise me something."

"What?"

"Don't run. Don't hurt anyone. Don't do anything that makes me regret this choice. Give me twenty-four hours of Emily, not Victoria. Can you do that?"

Long silence. When she spoke, her voice was different. Smaller. "You're trusting me."

"I'm trusting Emily. The person who survived. The one who's still in there somewhere. Not Victoria. Emily."

"Why?"

"Because someone should've trusted you seven years ago. Someone should've kept looking. Someone should've believed you were worth saving." I pulled out the evidence files. "I failed you then. I'm not failing these five now. But I need you to not make me regret choosing mercy."

"Jack—"

"Twenty-four hours, Emily. Then you answer for Tom. For the twenty-three. For everything. But tomorrow, five innocent people go free. That's what your seven years of work was supposed to accomplish. Don't fuck it up now."

I hung up.

I'd just protected a murderer. Warned her about FBI. Gave her time to flee. Any one of those was a felony. Together, they'd put me away for years.

But if it meant Eleanor, Marcus, Lisa, James, and Teresa went free?

Worth it.

I sat in my apartment, waiting for dawn. Waiting to see if I'd chosen right.

Knowing I'd never actually know if "right" existed.

**[OUTLIER THEME: CHOICE]**`,
    ],
    unknownMessage:
      '"Twenty-four hours. Be Emily, not Victoria. —Jack"',
  },

  {
    id: 30,
    caseNumber: '010C',
    season: 1,
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
        'Jack watches five innocents walk free, then turns himself in, accepting obstruction charges as the price of choosing mercy over procedure.',
      objectives: [
        'Log each courtroom victory to keep the freed names unforgettable.',
        'Note the legal fallout—charges, defenses, promises—awaiting Jack after his confession.',
        'Solve before Day Eleven begins to underline the cost of doing the right wrong thing.',
      ],
    },
    bridgeText: [
      'Day Ten ends with questions that have no good solutions.',
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '010C-exoneration-orders',
                imageKey: 'sparkle',
                title: 'ELEANOR FREED',
                subtitle: '2 PM APPEAL',
                detail: 'It worked. The evidence held. Eleanor walked out. James walked out. Lisa walked out.',
              },
              {
                id: '010C-fbi-testimony',
                imageKey: 'buyer',
                title: 'AGENT MARTINEZ',
                subtitle: 'THE CALL',
                detail: '"She didn\'t run." Martinez sounded shocked. Victoria stayed put. My gamble paid off.',
              },
              {
                id: '010C-emily-promise',
                imageKey: 'silence',
                title: 'EMILY CROSS',
                subtitle: 'PROMISE KEPT',
                detail: '"I\'m ready for arrest. Thank you for the impossible choice." She kept her word. She was Emily at the end.',
              },
            ],
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
        'ACCOUNTABILITY',
      ],
      outlierWords: ['SACRIFICE', 'PENANCE', 'RECKONING', 'REDEMPTION'],
    },
    clueSummaries: {
      main:
        'Main words follow the dominoes—orders vacated, testimonies filed—as mercy ripples through the courts.',
      outliers: {
        SACRIFICE: 'Marks Jack giving up his freedom to free others.',
        PENANCE: 'Signals the personal cost he accepts.',
        RECKONING: 'Shows the justice system turning back on him.',
        REDEMPTION: 'Hints that consequence might finally heal what certainty broke.',
      },
    },
    narrative: [
      `Day Eleven, 10 AM. Lisa Chen's exoneration hearing.

I sat in the back of the courtroom. Watching. Praying my choice had been right.

The judge reviewed Victoria's forensic evidence. The documentation showing Tom Wade had manufactured the case against Lisa. The proof that she'd been framed for reporting his corruption.

"In light of this evidence, Dr. Chen's conviction is hereby overturned. Dr. Chen, you are exonerated. The state offers its apologies for this miscarriage of justice."

Lisa walked free. Four years stolen. But free.

One down.

---

Noon. James Sullivan's case review. The ballistics evidence from Tom's manufactured lab. Proof the gun had never been James's. Security footage from his daughter's birthday party—he'd been at Chuck E. Cheese when the murder happened.

"Mr. Sullivan, this conviction is vacated. You are free to go."

James hugged his daughter. She was fifteen now. Had been nine when I'd arrested him. Six years. Gone.

But he was free.

Two down.

---

2 PM. Eleanor Bellamy's appeal. The sapphire necklace purchase records. The shell company documentation. Everything proving she'd been framed by Emily Cross to cover Richard's murder.

"Mrs. Bellamy, your conviction is overturned. You are released immediately."

Eleanor walked out of that courtroom after eight years. Fifty-six years old. Half her fifties stolen.

But free.

Three down.

---

By 5 PM, all five were processed. Eleanor. James. Lisa. Marcus's posthumous exoneration. Teresa's arson conviction overturned.

Five innocent people freed.

Because I'd chosen mercy over justice. Because I'd protected a murderer for twenty-four hours. Because I'd broken every rule I'd ever sworn to uphold.

At 5:30 PM, I called Agent Martinez. "The appeals are done. Five innocent people are free. Now I'll give you everything on Victoria Ashford."

"We know. We've been waiting." His voice was hard. "And Jack? We're adding obstruction of justice to your charges. You protected a murderer. You warned her about our raid. You gave her time to flee."

"I know. I accept that. But did she flee?"

Silence. "No. She's still at her penthouse. Waiting. Like you told her to." He paused. "Why didn't she run?"

"Because somewhere under Victoria Ashford, Emily Cross still exists. And Emily wouldn't run from this." I grabbed my jacket. "I'm coming to FBI. I'll give formal testimony. Tell you everything. And then I'll turn myself in for obstruction."

"Jack—"

"It's the right thing to do. I broke the law. I accept consequences. But five innocent people are free. That's what matters."

I hung up.

Sarah called immediately. "You chose them."

"I did."

"You're going to prison for obstruction."

"I know."

"Was it worth it?"

I thought about Eleanor walking free. James hugging his daughter. Lisa starting over.

"Yes. Completely. I'd make the same choice again." I looked out at Ashport. "For thirty years I chose the law over people. This time I chose differently. If that's a crime, I'll pay for it. But at least I'm paying for doing something right instead of being rewarded for doing something wrong."

"That's either the most moral thing you've ever done or the dumbest."

"Probably both." I grabbed my keys. "I'm going to FBI. To give them Victoria. And then to accept whatever comes."

Sarah was quiet. Then: "Jack? I'm proud of you. For choosing the hard right over the easy wrong. Even if it destroys you."

"Thanks. That means more than you know."

I drove to FBI headquarters. To give them Victoria. To accept responsibility for obstruction. To face consequences for the first time in my career.

But five innocent people were free.

And for the first time in thirty years, I'd chosen mercy over certainty.

Even if it destroyed me.

Especially if it destroyed me.

Because some choices aren't about what's legal. They're about what's right.

And sometimes those are mutually exclusive.

**[OUTLIER THEME: SACRIFICE]**`,
    ],
    unknownMessage:
      '"Five walked free. Now I face the cost. —Jack"',
    },
    {
      id: 31,
      caseNumber: '011A',
      season: 1,
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
        'Jack turns over every detail of Victoria’s operation at FBI headquarters while confessing to obstruction, accepting that justice and the law are no longer the same thing for him.',
      objectives: [
        'Log the evidence he delivers—DNA, recordings, rope fibers—to close Tom Wade’s case.',
        'Capture the official record of his voluntary obstruction confession.',
        'Note the warrants, counts, and timelines Martinez cites so the board mirrors the legal stakes.',
      ],
    },
    bridgeText: [
      "The day before the end is always the longest. Because you know what's coming. And you can't stop it.",
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '011A-fbi-interview',
                imageKey: 'buyer',
                title: 'FBI ROOM',
                subtitle: 'THE CONFESSION',
                detail: 'I gave them everything. The gun. The badge. The truth. "I prioritized outcome over procedure."',
              },
              {
                id: '011A-wade-evidence',
                imageKey: 'default',
                title: 'WADE FILE',
                subtitle: 'EVIDENCE LOG',
                detail: 'DNA. Rope fibers. Victoria\'s confession tape. The case against her was airtight. I handed it over.',
              },
              {
                id: '011A-ec-exchange',
                imageKey: 'silence',
                title: 'EMILY TEXT',
                subtitle: 'ONE LAST REQUEST',
                detail: '"Come say goodbye." She wanted one last meeting. Before prison. Before the end.',
              },
            ],
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
        'CHOICE',
      ],
      outlierWords: ['MYSTERY', 'UNKNOWN', 'UNWRITTEN', 'UNFINISHED'],
    },
    clueSummaries: {
      main:
        'Main words map the formal record—transcripts, counts, evidence—that closes Tom Wade’s murder and opens Jack’s own case.',
      outliers: {
        MYSTERY: 'Reminds players Victoria still holds secrets even as charges fall.',
        UNKNOWN: 'Signals the uncertain verdict awaiting Jack.',
        UNWRITTEN: 'Points to the story Day Twelve will finish.',
        UNFINISHED: 'Shows justice is still in progress despite resolutions.',
      },
    },
    narrative: [
      `I walked into FBI headquarters at 6 PM. Agent Martinez waited with three other agents and a stenographer.

"Detective Halloway. You're here to give testimony regarding Victoria Ashford?"

"And to turn myself in for obstruction of justice." I set down my phone, my gun, my badge. "I have evidence Victoria Ashford murdered Dr. Thomas Wade. DNA. Forensics. Her confession on recording. Everything you need."

"And you've had this evidence for five days."

"Six days. I obtained it Day Five. Held it until tonight. Because five innocent people's appeals were dependent on Victoria's evidence remaining uncompromised. If I'd acted immediately, they'd still be in prison."

Martinez looked at the other agents. "That's textbook obstruction."

"I know. I'm confessing. I prioritized outcome over procedure. I protected a murderer to save innocents. I accept full responsibility and whatever charges you file."

"Why?"

"Because for thirty years I did the opposite. I prioritized procedure over outcome. I destroyed innocents to maintain my clearance rate. I upheld the law while breaking justice." I met his eyes. "This time I chose differently. If that's criminal, prosecute me. But those five people are free. And I'd make the same choice again."

Martinez started the recorder. "This is Agent Luis Martinez, FBI. November 15th, 6:14 PM. Subject is former Detective Jack Halloway, voluntary testimony regarding Victoria Ashford and self-reported obstruction of justice."

I spent three hours telling them everything. Victoria's operation. Tom's murder. The evidence. The choice. The twenty-four hour delay.

By 9 PM, they had everything.

"We'll take Victoria into custody tonight," Martinez said. "And Jack? We're charging you with obstruction. You'll be arraigned tomorrow. Bail unlikely given the severity."

"I understand."

"Why did you do it? Really?"

"Because someone needed to choose the five innocents over the one guilty. And it couldn't be Victoria—she's a murderer. It couldn't be you—you're bound by procedure. So it had to be me. The person who'd already broken everything. The only one who could afford to break one more rule if it meant saving five lives."

"That's not how the law works."

"I know. But it's how justice works. And for thirty years I confused the two. Now I understand the difference." I stood. "Are you arresting me tonight?"

"Tomorrow. After arraignment. For now—don't leave town. Don't contact Victoria. Don't destroy evidence."

"Understood."

I walked out of FBI headquarters. Knowing I'd be back tomorrow in cuffs. Knowing I'd likely spend years in prison for obstruction.

But five innocent people were free.

And Victoria hadn't fled. She'd stayed. Like I'd asked. Like Emily would.

My phone buzzed. Unknown number. Victoria.

**"FBI is outside my building. I could run. I have resources. Passports. Money. I could disappear and you'd take the fall alone. Why did you trust me not to?"**

I typed back: **"Because Emily Cross wouldn't run from what she'd done. And I believe Emily is still in there. Prove me right. —Jack"**

Long pause. Then: **"Day Twelve. Tomorrow. 10 AM. The warehouse. Come say goodbye before they take us both away. —E.C."**

**"I'll be there. —Jack"**

I drove home. Knowing tomorrow was the end. Knowing I'd chosen mercy over justice, innocents over procedure, being good over being right.

And knowing I'd never regret it.

**[PUZZLE THEME: RESOLUTION / OUTLIER: MYSTERY]**`,
    ],
    unknownMessage:
      '"Day Twelve. Come say goodbye. —E.C."',
  },

  {
    id: 32,
    caseNumber: '011B',
    season: 1,
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
        'The longest night brings Margaret’s call, Sarah’s plan, and Emily’s final visit as Jack waits to see whether mercy was a mistake.',
      objectives: [
        'Record the allies who rally—Margaret, Sarah, Rebecca Moss—before dawn.',
        'Trace Emily’s rain-soaked visit that proves she kept the twenty-four-hour promise.',
        'Capture the emotional ledger of trust that sets the stage for Day Twelve.',
      ],
    },
    bridgeText: [
      "The last night is always the longest. Because you know what you're about to do. And you know you can't take it back.",
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '011B-margaret-call',
                imageKey: 'sparkle',
                title: 'MARGARET CALL',
                subtitle: 'PRIDE AND FEAR',
                detail: '"You chose them over yourself." She understood. For the first time in years, she was proud.',
              },
              {
                id: '011B-integrity-plan',
                imageKey: 'voice',
                title: 'SARAH TEXT',
                subtitle: 'LEGAL DEFENSE',
                detail: 'Rebecca Moss will represent me. Necessity defense. "What you did was heroic." Sarah never gave up on me.',
              },
              {
                id: '011B-emily-rain',
                imageKey: 'silence',
                title: 'EMILY CROSS',
                subtitle: 'THE RAIN',
                detail: '2 AM. Jeans and sweatshirt. No mask. "I needed you to see something." She was finally just herself.',
              },
            ],
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
        'GOODBYE',
      ],
      outlierWords: ['REDEMPTION', 'GRACE', 'HUMANITY', 'FORGIVENESS'],
    },
    clueSummaries: {
      main:
        'Main words sit in the quiet hours—calls, texts, visits—that prove trust still matters before the arrests.',
      outliers: {
        REDEMPTION: 'Marks how the night lets both Jack and Emily reach for better selves.',
        GRACE: 'Signals the compassion extended by Margaret and Sarah.',
        HUMANITY: 'Shows Victoria shedding the mask long enough to be Emily.',
        FORGIVENESS: 'Hints that healing may follow consequence.',
      },
    },
    narrative: [
      `That night, I sat in my apartment, knowing tomorrow would bring arrests for us both.

Margaret called. "Jack. I heard from Sarah. You're facing obstruction charges."

"Three to five years. Maybe more."

"And the five innocent people?"

"Free. All of them. Eleanor. James. Lisa. Marcus posthumously. Teresa. All free."

Long silence. "You chose them over yourself."

"I chose them over the law. Over my career. Over thirty years of certainty and corruption." I looked at the city lights. "And I'd do it again. Every time."

"I'm proud of you. Terrified. But proud."

"Thanks, Mags. That means everything."

Sarah texted: **"Rebecca Moss will represent you. She's reviewing your case. There might be defenses—necessity, competing harms. Don't talk to anyone. —Sarah"**

I texted back: **"I confessed on recording. There's nothing to defend. But thank you. —Jack"**

**"There's ALWAYS something. And Jack? What you did—choosing five innocents over one guilty—that's not criminal. That's heroic. We'll fight this. —Sarah"**

At 2 AM, my doorbell rang.

Victoria stood in the rain. Not the Victoria from the penthouse. Hair down. No makeup. Wearing jeans and a sweatshirt. Looking more like the twenty-two-year-old in the old photos than the monster she'd become.

"Can I come in?"

I stepped aside.

She walked to my window. Looked out at Ashport. "FBI's coming at dawn. For both of us. I could run. I have passports, money, three different identities ready. But you asked me for twenty-four hours of Emily, not Victoria. So I'm here. Being Emily. One last time before I'm gone."

"Why?"

"Because I need you to see something." She turned. And for the first time, I saw Emily Cross. Really saw her. Not Victoria's mask. Not the ghost in old photos. But the actual person underneath everything.

"Seven years ago, when you declared me dead, part of me was relieved. Because being Emily hurt too much. Richard's abuse. Grange's torture. Your abandonment. So I buried her. Built Victoria on top of her grave. Told myself Emily was too weak to survive."

"But she wasn't."

"No. She wasn't. She survived six months of torture planning revenge. She rebuilt herself into someone powerful. She spent seven years systematically destroying everyone who failed her." Her voice cracked. "But here's what I didn't understand: destroying you didn't bring Emily back. It just made Victoria stronger. Until I couldn't tell which one I was anymore."

She moved closer. "Then you did something impossible. You chose five innocents over your freedom. You trusted me not to run. You saw Emily when I couldn't see her myself."

We stood inches apart. The rain drumming. Ashport sleeping. Two damaged people in the wreckage of what we'd done to each other.

"If I'd looked for you seven years ago—"

"We'd both be different people. Maybe better. Maybe not." She touched my face. Gentle. Careful. Like I was something breakable. "But we can't live in hypotheticals, Jack. We only get what actually happened. And what happened is I became Victoria. And you're becoming someone better. And tomorrow we both pay for who we were."

"I'm sorry. For all of it."

"I know. And that matters. It doesn't fix anything. But it matters." She dropped her hand. "FBI is outside. I should go. Let them arrest me at dawn like we planned. But I wanted you to see Emily one last time. To know she's still here. Somewhere under all the damage."

"Emily—"

"Don't. If you call me that, I might not be able to leave. And I need to leave. Need to face what I've done. Need to be Emily, not Victoria. Even if it destroys me."

She walked to the door. Stopped. "In another life—one where you kept looking, where I didn't become Victoria—do you think we could have been friends?"

"Yeah. I think we could've been a lot of things."

She nodded. Left. The rain swallowed her.

At 6 AM, FBI arrested her at her penthouse. She went peacefully. No fight. No running.

Being Emily, not Victoria.

Keeping her promise.`,
    ],
    unknownMessage:
      '"Twenty-four hours of Emily. Promise kept. —J."',
  },

  {
    id: 33,
    caseNumber: '011C',
    season: 1,
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
        'Morning brings arraignment preparations, Rebecca Moss’s strategy, and Emily’s final text as both she and Jack accept the price of choosing mercy over certainty.',
      objectives: [
        'Track the legal plan Rebecca outlines—necessity, competing harms, witness testimony.',
        'Record the promises Sarah and Victoria make before the arraignments.',
        'Finish the board before the courthouse doors open to feel the inevitability of consequence.',
      ],
    },
    bridgeText: [
      'Day Eleven ends with a dawn that no longer waits for your doubts.',
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '011C-necessity-notes',
                imageKey: 'default',
                title: 'LEGAL STRATEGY',
                subtitle: 'NECESSITY DEFENSE',
                detail: 'Rebecca Moss: "You chose the lesser harm." Eleanor, James, and Lisa prepared to testify for me.',
              },
              {
                id: '011C-sarah-support',
                imageKey: 'voice',
                title: 'SARAH REEVES',
                subtitle: 'THE RIDE',
                detail: 'She drove me to the courthouse. 8:30 AM. "When you get out, you work with us." A future, waiting.',
              },
              {
                id: '011C-emily-dawn-message',
                imageKey: 'silence',
                title: 'EMILY TEXT',
                subtitle: 'THE FAREWELL',
                detail: '"See you in twelve years." She was ready. Arrested at dawn. Peaceful. Human.',
              },
            ],
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
        'COURAGE',
      ],
      outlierWords: ['SACRIFICE', 'PENANCE', 'RECKONING', 'FUTURE'],
    },
    clueSummaries: {
      main:
        'Main words sit on the courthouse steps—defenses, pleas, testimony—that define what comes after mercy.',
      outliers: {
        SACRIFICE: 'Marks Jack and Emily accepting the cost of their choices.',
        PENANCE: 'Signals the years they expect to serve.',
        RECKONING: 'Shows the justice system finally turning on its architects.',
        FUTURE: 'Hints that change is still possible after consequences.',
      },
    },
    narrative: [
      `Day Twelve, 6 AM. My phone rang. Agent Martinez.

"Detective Halloway. We're taking Victoria Ashford into custody in thirty minutes. Your arraignment is at 10 AM. Be at the courthouse. Don't make us come find you."

"I'll be there."

"Jack? For what it's worth—what you did was illegal. But it wasn't wrong. Not the way you're thinking."

"Thanks. That helps. A little."

I hung up. Got dressed. The old suit. The one I'd worn to Eleanor's trial. Marcus's funeral. Every time I'd destroyed someone's life with certainty.

Fitting to wear it to my own destruction.

At 7 AM, Sarah showed up. With Rebecca Moss. Eleanor Bellamy's attorney. The one who'd freed her yesterday.

"We're representing you," Rebecca said. Curt. Professional. Furious. "And we're building a necessity defense. You were forced to choose between two harms—turning in a murderer immediately, or delaying to save five innocent lives. You chose the lesser harm. That's not criminal. That's moral courage."

"I confessed."

"You confessed to prioritizing outcome over procedure. That's not obstruction. That's triage." She pulled out files. "Eleanor, James, and Lisa are all prepared to testify that your delay saved their lives. That without it, they'd still be in prison. The judge will have to weigh that against the twenty-four hour delay in Victoria's arrest."

"Victoria didn't flee. Didn't hurt anyone. Just waited like I asked."

"Because you trusted her to be better than her worst self. And she was." Sarah met my eyes. "Jack, you broke a rule to save five lives. That's not corruption. That's heroism. We're going to make the court see that."

"And if they don't?"

"Then you go to prison for three to five years. And when you get out, you work with us at the Conviction Integrity Project. Either way, you don't disappear. You don't martyr yourself. You show up and do the work." Sarah handed me coffee. "Deal?"

"Deal."

At 8 AM, my phone buzzed. Victoria. One last text before FBI took her phone.

**"I'm ready. For arrest. For trial. For consequences. Because you showed me Emily could still exist. Thank you. For the impossible choice. For trusting me. For believing I was worth saving. See you in twelve years. Or however long it takes. —Emily Cross"**

I typed back: **"You were always worth saving. I just couldn't see it seven years ago. Be Emily. Not Victoria. And maybe we both get out of this human. —Jack"**

At 8:30 AM, Sarah drove me to the courthouse. For arraignment. For charges. For consequences.

But five innocent people were free.

And I'd finally chosen mercy over certainty, people over procedure, being good over being right.

Whatever happened next, I'd made the right impossible choice.

Even if it destroyed me.

**[OUTLIER THEME: SACRIFICE]**`,
    ],
    unknownMessage:
      "\"I'm ready. See you in twelve years. —Emily Cross\"",
    },
    {
      id: 34,
      caseNumber: '012A',
      season: 1,
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
        'At the warehouse Jack gives Victoria an empty gun and forces the final choice: kill him and stay a monster, or walk away and let Emily Cross live again.',
      objectives: [
        'Log the symbolic pieces in the warehouse—gun, contract, portrait fragments.',
        'Track the questions Jack hurls about identity, revenge, and healing.',
        'Finish the grid before the final click of the empty trigger so the tension lands.',
      ],
    },
    bridgeText: [
      'The twelfth day. The last case. The final move. Can monsters ever become human again?',
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '012A-warehouse-floor',
                imageKey: 'default',
                title: 'THE WAREHOUSE',
                subtitle: 'FINAL SCENE',
                detail: 'Rain on the roof. Concrete floor. The place where Tom died. Where Victoria was born. Where Emily returned.',
              },
              {
                id: '012A-unloaded-revolver',
                imageKey: 'default',
                title: 'THE GUN',
                subtitle: 'EMPTY CHAMBER',
                detail: 'I gave her the choice. But I removed the bullets. Protecting her from becoming a killer one last time.',
              },
              {
                id: '012A-burned-contract',
                imageKey: 'silence',
                title: 'EMILY CROSS',
                subtitle: 'THE TEARS',
                detail: 'She pulled the trigger. Click. Then she cried. Laughed. And finally let Victoria go.',
              },
            ],
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
        'MOVE',
      ],
      outlierWords: ['UNANSWERED', 'QUESTION', 'MASK', 'VOID'],
    },
    clueSummaries: {
      main:
        'Main words sit inside the warehouse endgame—gun, rain, trust—as Jack pushes Victoria toward a final decision.',
      outliers: {
        UNANSWERED: 'Some questions stay unresolved even after the trigger falls.',
        QUESTION: 'Mirrors the doubts plaguing both Jack and Emily.',
        MASK: 'Signals Victoria’s persona slipping as Emily surfaces.',
        VOID: 'Leaves space for whatever future she chooses.',
      },
    },
    narrative: [
      `Victoria stood in the warehouse, rain drumming on the roof, staring at the gun I'd placed between us.

"You're serious."

"Completely."

"You want me to shoot you."

"I want you to choose. Really choose. Not manipulate. Not orchestrate. Just decide: are you a monster seeking revenge, or a person seeking healing?" I didn't move. "Take the gun. Pull the trigger. End this. Or walk away and stop being Victoria Ashford. Stop being the weapon trauma made you."

Victoria stared at me. And for the first time in twelve days, I saw genuine surprise on her face.

"You... you actually surprised me." Her voice was different. Quieter. "I didn't predict this. I ran every scenario. Every possible move you could make. But I didn't see this coming."

"Maybe you're not as omnipotent as you thought."

"Or maybe..." She blinked. "Maybe there's still enough of Emily in me to be surprised by actual honesty." She picked up the gun slowly. "I've been three moves ahead this entire time. Controlling everything. Predicting everything. And you just... gave me a loaded gun and trusted that I'd make the right choice."

"I can't just *stop* being Victoria."

"Why not? She's not real. She's a role you played to survive. Emily Cross was real. The twenty-two-year-old artist. She's still in there. Buried. But there."

"Emily died in that cell."

"Did she? Or did she just hide? Wait? Rebuild?" I moved closer. "You spent seven years teaching me what certainty costs. You succeeded. I'm destroyed. My career gone. My credibility shattered. Everyone I loved either traumatized or gone. You won, Victoria. You won completely."

"So?"

"So what now? You keep being Victoria forever? You spend the rest of your life blackmailing and manipulating? Is that what Emily Cross survived for? To become a more sophisticated Grange?"

She picked up the gun. Aimed it at me. Her hand shaking.

"You have no right to say her name."

"I have every right. I killed her. I declared her dead while she was screaming. I abandoned her. I created Victoria Ashford. So I'm taking responsibility." I met her eyes. "Shoot me. Kill the man who failed you. Or put down the gun and kill Victoria instead. Become something new."

"What if I can't? What if Victoria is all that's left?"

"Then you're still more honest than I ever was. At least you know what you are." I didn't flinch. "But I don't think Victoria is all that's left. I think Emily's still fighting. That's why you made me understand instead of just killing me Day One. That's why you freed the innocent. That's why you're crying right now."

She was crying. Tears running down her face. The gun shaking harder.

"I hate you."

"I know."

"I hate you so much. You gave up on me."

"I know. And I'm sorry. And I know sorry doesn't fix anything. But it's true."

She pulled the trigger.

Click.

Empty.

I'd removed the bullets while she was watching. Old habit. Always control the room.

She stared at the gun. At me. Understanding flooding her face.

"You son of a bitch." But she was laughing. Crying and laughing. "You gave me a choice but stacked the deck. You offered me a gun but made sure I couldn't use it."

"I was protecting you."

"From what?"

"From becoming someone who killed an unarmed man in cold blood. From crossing a line you can't uncross. From losing whatever piece of Emily Cross is still in there." I took the gun back. "You're right. I cheated. I manipulated. But this time? I was controlling to save you from yourself instead of destroying you."

She sat down on a crate. Still crying. Still laughing. Looking more human than I'd ever seen her.

"What am I supposed to do now?"

"Whatever you want. You've exposed the corruption. Freed the innocent. Delivered more justice in twelve days than I did in thirty years. You've won. You can walk away now. Start over. Be anyone you want."

"I don't know how to be anyone except Victoria."

"Then learn. Same way you learned to be Victoria. One day at a time." I sat beside her. "I'm going to prison. For real. Turning myself in. Facing actual consequences. Maybe seven years. And when I get out? I'm working for Sarah. Helping free people. Doing it right."

"That's not redemption."

"No. But it's responsibility. It's trying. It's choosing to be less wrong every day even though I'll never be right." I looked at her. "You could do the same. Dismantle your empire. Testify as Emily Cross. Actually pursue justice. Be the person Richard tried to destroy. Be the person Grange couldn't break. Be the person I failed to save but who saved herself anyway."

Victoria—Emily—whoever she was—stared at the warehouse walls.

"What happens to you? After prison?"

"I work for Sarah. Help investigate wrongful convictions. Live quietly. Try to do less harm." I stood. "What happens to you is your choice. But Emily? If you're still in there? You survived. You won. You don't have to be Victoria anymore. You can just... be."

She stood. Faced me. And for the first time in seven years, I saw Emily Cross looking back.

"I'll think about it."

"That's all I can ask."

"Jack?" She met my eyes. "Thank you. For finally seeing me. For finally understanding. For finally trying."

"I'm seven years late."

"Yes. But late is better than never." She walked toward the door. Stopped. "They'll find evidence. That I was here. That you were here."

"Let them. I'm done hiding."

She nodded. Left.

I stood alone in the warehouse where Tom had died, where Victoria had been born, where everything had ended and begun.

And I called Sarah. "It's done. I'm ready to confess. To turn myself in. To face actual consequences. Pick me up?"

"Already on my way."

**[PUZZLE THEME: RESOLUTION / OUTLIER: UNANSWERED]**`,
    ],
    unknownMessage:
      '"Already on my way." —Sarah',
  },

  {
    id: 35,
    caseNumber: '012B',
    season: 1,
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
        'Seven years in prison give Jack a front-row seat to the ripple effects: freed innocents rebuilding, families recalibrating, and Emily disappearing into new identities.',
      objectives: [
        'Catalogue the lives changed—Eleanor, Marcus’s family, Lisa, James, Teresa—as the system repairs itself.',
        'Note the letters, cards, and news clippings that keep Jack accountable.',
        'Blend the statistics of reform with the human cost so the puzzle feels like long-term consequence.',
      ],
    },
    bridgeText: [
      'Some endings are clean. Some are messy. And some are just pauses between moves in a game that never ends.',
    ],

          evidenceBoard: {
            polaroids: [
              {
                id: '012B-lucia-countdown',
                imageKey: 'sparkle',
                title: 'LUCIA CARD',
                subtitle: 'YEAR SEVEN',
                detail: 'Mrs. Martinez sent it. 5,113 days. A reminder that understanding doesn\'t resurrect the dead.',
              },
              {
                id: '012B-dismissed-ledger',
                imageKey: 'lex',
                title: 'LISA CHEN',
                subtitle: 'THE PAPER',
                detail: '"The Halloway Effect." She published a paper on my corruption. It\'s brilliant. And accurate.',
              },
              {
                id: '012B-prison-letters',
                imageKey: 'voice',
                title: 'SARAH LETTER',
                subtitle: 'YEAR THREE',
                detail: '"You taught me how to be a bad detective. I\'m using that to be a good one." She fixed everything I broke.',
              },
            ],
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
        'REFORM',
      ],
      outlierWords: ['FREEDOM', 'SPITE', 'GRIEF', 'ABSENCE'],
    },
    clueSummaries: {
      main:
        'Main words track the seven-year ledger—letters, foundations, programs—that chart the fallout of Jack’s choices.',
      outliers: {
        FREEDOM: 'Marks the lives reclaimed even as the pain lingers.',
        SPITE: 'Captures James Sullivan channeling anger into change.',
        GRIEF: 'Keeps Lucia and Teresa’s losses front and centre.',
        ABSENCE: 'Echoes the silence from people who never wrote back.',
      },
    },
    narrative: [
      `I turned myself in to FBI that afternoon. Confessed to everything. Evidence tampering. False reports. Corruption. Conspiracy.

They charged me with eighteen counts. Gave me a deal: seven years in exchange for full cooperation.

I took it. No appeals. No fighting. Just acceptance.

The trial was brief. The sentence fair. The consequences real.

I went to Ashport State Prison at forty-eight years old. Released at fifty-five.

Seven years to think. To process. To understand. Seven years to become someone different.

---

During those seven years:

Eleanor Bellamy remarried. Started a foundation for wrongful conviction advocacy. Named it the Lucia Martinez Foundation—after the girl who died because I stopped looking. Visited me once, eighteen months in. We sat across bulletproof glass, phones to our ears.

"I don't forgive you," she said. "But I'm trying to. That's something."

"That's more than I deserve."

"Yes. It is." She hung up. Never came back. I understood.

---

Marcus Thornhill's daughter Claire got her degree. Northwestern. Full ride. Became a lawyer specializing in wrongful conviction cases. Works with Sarah's non-profit.

Marcus Webb testified at Eleanor's appeal, then disappeared. Moved to Paris. Last I heard, he'd opened a small gallery. Never returned my letters. Some betrayals echo too long for forgiveness.

Silas Reed served three years of a seven-year sentence. Got out early for cooperation. His husband divorced him. His sons changed their names. He works at a hardware store now, anonymous and alone. I saw him once, across the street. We didn't speak. Didn't need to. We both knew what we'd lost.

Helen Price's suicide note was published by her lawyer per her instructions. Fifteen pages detailing every case she'd corrupted, every corner she'd cut, every innocent person she'd helped destroy. Her final act was complete honesty. It destroyed her family's legacy but freed five more innocent people. The Price firm was dismantled. Her father's name removed from the courthouse plaque.

---

Mrs. Martinez visited me once. Year four. Brought photos of Lucia.

"My daughter wanted to be a pediatric nurse. Save children." She pushed the photos through the slot. "Instead, she became a lesson. Evidence of what your arrogance costs."

"I'm sorry isn't enough—"

"It isn't anything." But she kept talking. "Victoria Ashford—Emily Cross—she visited me three times. The last time, she cried. Said she was sorry she couldn't save Lucia. That she'd spent seven years making you understand, but understanding doesn't resurrect the dead." Mrs. Martinez met my eyes. "She asked if I wanted her to hurt you more. I said no. Hurting you wouldn't bring Lucia home. But making you actually do better? Maybe that was worth something."

She left. Never came back. But every year on Lucia's birthday, I got a card. No name. Just a photo of Lucia and a number. The days she'd still be alive if I'd kept looking.

Year one: 2,556 days.

Year seven: 5,113 days.

Each card a reminder that sorry was arithmetic, not absolution.

---

She came to the prison once. Not to see me—to consult on a case. Saw me in the visiting room. Our eyes met for three seconds. She looked away. Kept walking.

I understood. Some debts can never be paid.

---

Dr. Lisa Chen rebuilt her career. Teaches forensic ethics at Ashport University. Writes papers about institutional corruption. One—published in the Journal of Forensic Sciences—cited my case as the definitive example of systemic failure. 

Title: "The Halloway Effect: How Certainty Bias Creates Institutional Corruption."

She was right. That's exactly what I did.

---

James Sullivan—the gang murder case I'd closed with manufactured ballistics—got released sixteen months into my sentence. Turned out he'd been in county lockup the night of the killing. Impossible alibi I'd never bothered checking because Tom's ballistics were "conclusive."

James went back to his neighborhood. Started a program for kids at risk of gang recruitment. Called it "Second Look"—teaching kids to question authority, verify evidence, think critically.

He was asked in an interview if he'd forgiven Detective Halloway.

"Nah. Fuck that guy. But I learned from what he did to me. Learned that the system lies. That evidence can be manufactured. That you gotta think for yourself. So I'm teaching that. Not because of forgiveness. Because of spite."

Fair.

---

Teresa Wade—Tom's wife, framed for arson when she'd threatened to expose him—got released, divorced Tom posthumously (didn't know that was possible, but apparently it is), and moved to Portland.

She sent me one letter. Three years in.

*"Detective Halloway—I'm writing this because my therapist says it will help. It won't. But here it is: I don't forgive you. You enabled Tom for twenty years. You created an environment where his fraud flourished. You made him feel invincible. And when I tried to stop him, you arrested me for arson I didn't commit. You destroyed my life to protect your friend. I hope prison teaches you something. I doubt it will. Some people are just broken forever. —Teresa Wade"*

I read it fifty times. She was right. About everything.

---

Margaret sent a letter once. Two years in. Emma's drawing enclosed—stick figures labeled MOM, DAD, ME. The "DAD" figure was David, her new father.

*"Jack—Emma's doing well. She asks about you sometimes—I tell her you're someone who used to know me a long time ago. When she's older, maybe I'll tell her the truth. Maybe not. I hope you're finding peace. Or at least understanding why peace is impossible. Good luck. —M"*

I wrote back: "Thank you for Emma. Thank you for leaving. I'm working on understanding."

She never replied. I didn't expect her to.

Sarah Reeves built the Ashport Conviction Integrity Project into something formidable. Not just seventeen innocent people freed—forty-three total by year seven. Not just cases under review—systematic reform. She'd gotten two state laws changed. Created a model that six other cities adopted. Trained eighty-five lawyers in conviction integrity work.

She testified before Congress. Wrote a book: *Dismissed Evidence: How America's Justice System Fails the Vulnerable*. Became the face of reform.

And she did it without me. Without Victoria. Without anyone's corruption or manipulation.

The project had real funding—eight million in grants. A staff of twenty-three. An office in the old Lamplight Gallery building, reclaimed from Victoria's shell corporation and repurposed.

Sarah sent me one letter. Year three.

*"Jack—The project freed its twentieth innocent person today. James Rodriguez. Drug conviction. You arrested him in 2012. Dismissed three witnesses who saw him at his daughter's birthday party during the supposed crime. I interviewed all three. They remembered. We got security footage from Chuck E. Cheese. He'd been telling the truth for eleven years.*

*I'm not writing for your redemption. I'm writing because you should know: every case you fucked up, I'm fixing. Every witness you dismissed, I'm interviewing. Every shortcut you took, I'm walking back and doing right.*

*You taught me how to be a bad detective. I'm using that education to be a good one. Thank you for the lesson. Even if you didn't mean to teach it. —SR"*

That's what transformation actually looked like. Not my redemption. Sarah's excellence.

And Victoria—Emily—whoever she'd become?

She vanished. FBI declared Victoria Ashford deceased after the warehouse burned three days after our confrontation. Arson. Deliberate. No body found.

Security footage showed a woman matching her description at the Canadian border two days before the fire.

Then nothing. For seven years, nothing.

She was gone. Or hiding. Or rebuilt into someone new. I'd never know.

And maybe that was right.

**[OUTLIER THEME: FREEDOM]**`,
    ],
    unknownMessage:
      '"Every case you fucked up, I\'m fixing. —SR"',
  },

  {
    id: 36,
    caseNumber: '012C',
    season: 1,
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
        'Jack steps out of prison into Sarah’s probationary job offer, a hostile welcome committee, and a chess piece reminder that the work never ends.',
      objectives: [
        'Document the board vote that puts Jack on probation under Lisa’s supervision.',
        'Trace the rules of his new role—no shortcuts, full transparency, constant oversight.',
        'End the puzzle with the fallen white king so players feel the unresolved future with Emma.',
      ],
    },
    bridgeText: [
      'Seven years is long enough to change. Long enough to become someone who might deserve a second chance.',
    ],

    evidenceBoard: {
      polaroids: [
        {
          id: '012C-integrity-vote',
          imageKey: 'harborPrecinct',
          title: 'Integrity Commission Vote',
          subtitle: 'Four to three in Jack\'s favor',
          detail: '',
        },
        {
          id: '012C-fallen-king',
          imageKey: 'blackEnvelope',
          title: 'Fallen White King',
          subtitle: 'Chess piece waiting on Jack\'s desk',
          detail: '',
        },
        {
          id: '012C-coffee-napkin',
          imageKey: 'blackEnvelope',
          title: 'Coffee Shop Napkin',
          subtitle: 'Emma Reeves? scribbled invitation',
          detail: '',
        },
      ],
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
        'MOVE',
      ],
      outlierWords: ['UNCERTAINTY', 'SECONDCHANCE', 'TRUCE', 'ECHO'],
    },
    clueSummaries: {
      main:
        'Main words catalogue Jack’s new reality—probationary work, oversight, the chess piece that keeps him honest.',
      outliers: {
        UNCERTAINTY: 'Says tomorrow is unwritten even after redemption efforts.',
        SECONDCHANCE: 'Marks the fragile opportunity Sarah and the others grant him.',
        TRUCE: 'Hints at the uneasy alliances inside the project.',
        ECHO: 'Leaves room for Emma’s quiet presence in the world.',
      },
    },
    narrative: [
      `They released me on a Tuesday. Gray sky. Cold wind. Seven years older. Seven years different.

Sarah was waiting outside. Not alone.

Eleanor Bellamy stood beside her. Dr. Lisa Chen. Claire Thornhill. Three of the people I'd destroyed.

"Sarah?" I looked at her. "What's happening?"

"A vote," Sarah said. "You applied to work for the Conviction Integrity Project two years ago. From prison. I told you we'd consider it upon release. The board voted this morning."

Eleanor stepped forward. "I voted no. You destroyed eight years of my life. Working with you would be torture."

"I understand."

Lisa Chen next. "I voted yes. Conditional. You work probationary period. One year. Unpaid. Report to me directly. First sign you're reverting to old patterns—you're gone."

"Accepted."

Claire Thornhill last. "I voted no. Then yes. Then no again." She looked at Sarah. "But Sarah convinced me. She said you've changed. That you're useful. That the work matters more than my feelings." She met my eyes. "I don't forgive you. But I'll work with you. For my father. For the others."

Sarah pulled out a folder. "Four to three. You're hired. Probationary investigator. No salary for year one. You report to Lisa. You work the cases I assign. You interview the witnesses I choose. And Jack? If you fuck up once—if you take one shortcut, dismiss one witness, manufacture one piece of evidence—I'll personally make sure you go back inside. Clear?"

"Clear."

"Good." She handed me the folder. "Your first case. Detective Marcus Santos. Perfect conviction rate. Forty-three closed cases in three years. Every single one with testimony from the same confidential informant who doesn't seem to exist."

I opened the folder. Recognized the pattern immediately. "He's manufacturing witnesses."

"Prove it. You have three weeks. Lisa will supervise. Eleanor will audit your work. Claire will verify your findings." Sarah walked toward her car. "And Jack? This isn't redemption. This is you earning the right to do basic detective work. Don't fuck it up."

She drove away. The three women stood watching me. Waiting to see if I'd actually changed or if this was just another performance.

"Where do we start?" I asked.

Lisa consulted her tablet. "Witness statements. All forty-three cases. Cross-referencing addresses, phone numbers, appearance descriptions. Looking for patterns you would've ignored."

"Okay."

"And Detective Halloway?" Lisa's voice was clinical. "You will address me as Dr. Chen. You will follow my protocols exactly. You will not deviate, improvise, or 'trust your gut.' You will do thorough, methodical, documented work. Or you will fail. Understood?"

"Understood."

Eleanor handed me a key card. "Office is on the third floor. Desk by the window. Shared space. No privacy. Claire will be watching everything you do."

"That's fair."

They walked inside. I followed. Starting my second career. Not as the best detective in Ashport. As the worst one. The one who had to earn every second chance.

But at least I was working. At least the work mattered.

And at least Sarah had built something where even people like me could try to do better.

An hour later, Eleanor Bellamy walked past carrying case files. Stopped when she saw me. Our eyes met.

She didn't say anything. Didn't smile. Didn't frown. Just looked at me for five long seconds.

Then kept walking. Like I was furniture. Like I was nothing.

Dr. Lisa Chen came in at two PM. Saw me. Walked directly to Sarah's office without acknowledgment. Emerged twenty minutes later with documents.

Stopped at my desk. "Detective Halloway."

"Dr. Chen."

"I've been asked to review forensic evidence in the Morrison case. I understand you worked it originally. I'll need your notes. All of them. Including the ones you didn't file officially." Her voice was clinical. Professional. Cold. "Sarah says you're trying to help now. We'll see. Actions matter more than intentions. Prove you've changed."

She left. No forgiveness. No reconciliation. Just brutal professionalism.

James Sullivan showed up at four. Didn't acknowledge me. Met with Sarah for thirty minutes. Left. Stopped at the door. Turned.

"You that cop?"

"Yeah."

"You done being a piece of shit?"

"Working on it."

"Work harder." He left.

Sarah sat down across from me. "This is what the work looks like. They're never going to forgive you. Most of them are never going to even tolerate you. You can work your entire life trying to make amends. They'll never be made. Not fully."

"I know."

"And you're okay with that?"

"I don't get to be okay with it. I just have to live with it." I looked at the wall of faces—innocent people we were trying to save. Forty-three cases under review. Seventeen freed. Twenty-six still fighting. "Is that enough?"

"I don't know. But it's all we've got."

"Then it'll have to be enough."

I took the desk. Started working. Day by day. Case by case.

Trying to fix what I'd broken. Knowing I never could. Knowing I'd keep trying anyway.

And on my first day, at the bottom of my desk drawer, I found an envelope. Black paper. Red seal. No name.

Inside, a single chess piece. A white king. Lying on its side. Fallen.

And a note:

**"The game never ends, Detective. We just stop playing. Or we don't. Your move. —E.C."**

I put the king on my desk. Where I could see it every day. A reminder.

Some cases you solve. Some cases solve you.

And some cases—the ones that truly matter—you work on until you die.

Whether it helps or not. Whether anyone forgives you or not. Whether it makes any difference at all or not.

You just keep working.

Because stopping means everything you destroyed meant nothing.

And that would be worse than any prison.

---

**EPILOGUE - Three Years Later**

The coffee shop was called New Grounds. Corner of Morrison and Fifth. I'd never been there before. But Sarah mentioned it once—said she'd seen something there. Wouldn't say what.

I walked in on a Tuesday. Cold outside. Warm inside. Smelled like coffee and burnt sugar.

"Sit anywhere," someone said from the back.

I chose a corner booth. Spread out case files. Marcus Santos investigation. Forty-three perfect convictions. Same pattern Tom had used.

The waitress approached. "Coffee?"

"Black."

She poured without looking up. I glanced at her hands. Steady. Professional. The name tag said "EMMA."

Then she looked at me.

The eyes. Or eyes similar enough. The scar above the left eyebrow—or makeup that looked like one. The beauty mark below the right eye—or not. The light was bad.

Older. Different hair. Different everything. But maybe the same face. Or maybe I was seeing what I wanted to see.

"Emily?"

She didn't react. Just kept pouring. "You have me confused with someone."

"Do I?"

"I'm Emma. Emma Reeves. I've worked here eight months. I don't know anyone named Emily." Her voice was flat. Practiced. Too practiced.

"Sorry. You look like someone I used to know."

"People say that a lot. I have one of those faces." She finished pouring. Started to walk away.

"She survived something terrible. Six months of torture. Became someone else to deal with it. Built an empire. Then disappeared."

Emma stopped. Didn't turn around. "Sounds dramatic."

"It was. She made me understand what I'd done. What I'd cost her. Changed my entire life."

"Is that supposed to mean something to me?"

"I don't know. Is it?"

She turned. Looked at me. And for three seconds I saw something behind the waitress mask. Recognition. Maybe. Or anger. Or nothing. Just a tired worker wanting to finish her shift.

"I don't know you," she said. "And you don't know me. Sometimes people disappear because they want to stay disappeared. You understand?"

"I think so."

"Good." She walked away. Served other tables. Brought me coffee twice more without speaking.

I watched her for an hour. Trying to decide if it was really her. If "Emma Reeves" was Emily Cross. Or if Victoria Ashford was still playing games. Or if this was just a stranger who happened to look familiar in bad lighting.

I couldn't tell.

Before I left, I wrote on a napkin: **"If you're her: I'm sorry. If you're not: ignore this. Either way: you don't owe me anything. —J.H."**

I left it under my coffee cup. Paid. Walked out.

At the door, I glanced back. She was clearing my table. Saw the napkin. Read it.

No expression. No reaction. Just crumpled it. Threw it away. Kept working.

I never went back.

I don't know if that was Emily Cross, choosing to be someone new. Or Victoria Ashford, running one more game. Or Emma Reeves, a stranger I burdened with my guilt.

I'll never know.

Sarah asked me later if I found what I was looking for.

"I don't know what I found."

"Maybe that's the point."

Maybe.

Some stories don't end. They just stop. Mid-sentence. Mid-thought. You're left wondering: Was that her? Did she make it? Is she free or just hiding?

And you never find out.

Because some people don't want to be found. Even by the people who failed them. Especially by those people.

And maybe that's not survival. Maybe that's victory.

Leaving you uncertain forever.

---

**THE END**

\`\`\`
═══════════════════════════════════════
CASE FILE: DAY TWELVE - CLOSED
═══════════════════════════════════════

FINAL STATUS:
- Five innocent victims freed
- Jack served 7 years, now works for Sarah
- Victoria/Emily rebuilt as Emma, living quietly
- System reformed, slowly, imperfectly
- The game ended. Or paused. Or transformed.

FINAL LESSON:
"Some cases you solve. Some cases solve you.
And some cases you work on for the rest of your life.
Not because it fixes anything.
But because stopping would mean giving up.
And giving up would mean they won."

In noir, redemption isn't earned. It's pursued. Forever.
Without ever arriving.

That's not tragedy. That's honesty.

THE MIDNIGHT CONFESSOR - END
═══════════════════════════════════════
\`\`\`

**[CHESS PIECE: WHITE KING - Fallen but still in play]**

---

*Some truths take twelve days to learn.*  
*Some take seven years.*  
*Some take a lifetime.*

*And some you never learn at all.*  
*You just pay for not knowing.*

**- THE MIDNIGHT CONFESSOR -**

---

**CREDITS**

*A detective noir story where each chapter unlocks after solving word puzzles.*  
*Justice through games. Truth through patterns. Redemption through understanding.*

*The game is over.*  
*Or it's just beginning.*  
*You decide.*
`,
    ],
    unknownMessage:
      '"The game never ends. Your move. —E.C."',
  },
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
          summary: set.theme.summary || null,
        }
      : null;
    return {
      key: set.optionKey || set.key || String.fromCharCode(65 + index),
      optionKey: set.optionKey || set.key || String.fromCharCode(65 + index),
      label: set.label || null,
      words: normalizedWords,
      theme,
      descriptions: set.descriptions || {},
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
          branchingOutlierSets: branchingSetsForBoard,
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
      outliers: filteredOutliers,
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
        summary: set.theme.summary,
      };
    })
    .filter(Boolean);
  return {
    ...caseData,
    attempts: meta.attempts ?? caseData.attempts,
    board: updatedBoard,
    clueSummaries: clueSummaries || caseData.clueSummaries,
    branchingOutlierThemes: branchingThemeMeta.length ? branchingThemeMeta : caseData.branchingOutlierThemes || null,
  };
};

export const SEASON_ONE_CASES = RAW_SEASON_ONE_CASES.map(mergeBranchingMeta);

export const SEASON_ONE_CASE_COUNT = SEASON_ONE_CASES.length;
