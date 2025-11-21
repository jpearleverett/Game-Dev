import json
import os

NARRATIVE_PATH = 'src/data/storyNarrative.json'

def get_polaroid_data(case_id, path_key):
    # --- DAY 2: THE CHOICE ---
    if case_id.startswith('002'):
        # Path A = Methodical (Claire/Evidence), Path B = Aggressive (Silas/Raid)
        
        if case_id == '002A':
            if path_key == 'A': # Methodical
                return [
                    {'id': '02A-A-1', 'imageKey': 'voice', 'title': 'CLAIRE', 'subtitle': 'THE DINER', 'detail': 'She served coffee and hate. "You killed him." But she kept the ledger.'},
                    {'id': '02A-A-2', 'imageKey': 'blackEnvelope', 'title': 'THE LEDGER', 'subtitle': 'EVIDENCE', 'detail': 'Financial records. Shell companies. Silas Reed\'s signature on the payouts.'},
                    {'id': '02A-A-3', 'imageKey': 'keeper', 'title': 'SILAS REED', 'subtitle': 'SUSPECT', 'detail': 'My partner. My friend. The man who framed an innocent father.'}
                ]
            if path_key == 'B': # Aggressive
                return [
                    {'id': '02A-B-1', 'imageKey': 'keeper', 'title': 'PENTHOUSE', 'subtitle': 'THE RAID', 'detail': 'Kicked down the door. Silas in a silk robe. Terror, not guilt.'},
                    {'id': '02A-B-2', 'imageKey': 'default', 'title': 'BOURBON', 'subtitle': 'SPILLED', 'detail': 'He crumbled instantly. "They blackmailed me!" No dignity in the end.'},
                    {'id': '02A-B-3', 'imageKey': 'blackEnvelope', 'title': 'PHOTOS', 'subtitle': 'LEVERAGE', 'detail': 'Silas with a man. Seven years ago. The secret that bought his soul.'}
                ]

        if case_id == '002B':
            if path_key == 'A': # Methodical (Confront w/ Evidence)
                return [
                    {'id': '02B-A-1', 'imageKey': 'keeper', 'title': 'SILAS', 'subtitle': 'BALCONY', 'detail': 'He didn\'t run. He knew I had the ledger. "I sacrificed a stranger."'},
                    {'id': '02B-A-2', 'imageKey': 'blackEnvelope', 'title': 'FLASH DRIVE', 'subtitle': 'PROOF', 'detail': 'Claire\'s evidence on the glass table. The weight of eight million dollars.'},
                    {'id': '02B-A-3', 'imageKey': 'voice', 'title': 'CLAIRE', 'subtitle': 'AVENGED', 'detail': 'She kept the receipts. She brought down a cop from a diner booth.'}
                ]
            if path_key == 'B': # Aggressive (The Missing Piece)
                return [
                    {'id': '02B-B-1', 'imageKey': 'keeper', 'title': 'SILAS', 'subtitle': 'DRAGGED', 'detail': 'Forced him to the diner. "Tell her what you did." Brutal justice.'},
                    {'id': '02B-B-2', 'imageKey': 'voice', 'title': 'CLAIRE', 'subtitle': 'KNIFE', 'detail': 'She grabbed a steak knife. I had to stop her. "Get him out of my sight."'},
                    {'id': '02B-B-3', 'imageKey': 'blackEnvelope', 'title': 'THE DRIVE', 'subtitle': 'THROWN', 'detail': 'She threw the evidence at me. I got the truth, but I lost the moral high ground.'}
                ]

        if case_id == '002C':
            if path_key == 'A': # Methodical (Arrest Silas)
                return [
                    {'id': '02C-A-1', 'imageKey': 'keeper', 'title': 'CUFFS', 'subtitle': 'ARRESTED', 'detail': 'Silas in the back of the car. "I don\t know the name!" He was just a tool.'},
                    {'id': '02C-A-2', 'imageKey': 'sparkle', 'title': 'MAYA', 'subtitle': 'HOSTAGE', 'detail': 'Victoria had her. "You chose the dirtiest path, Jack."'},
                    {'id': '02C-A-3', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'TEACHER', 'detail': '"Corruption is the rot in your own house." She let us go. Lesson learned.'}
                ]
            if path_key == 'B': # Aggressive (Storm Penthouse)
                return [
                    {'id': '02C-B-1', 'imageKey': 'default', 'title': 'DOOR', 'subtitle': 'KICKED', 'detail': 'Shot the lock. Stormed in. Subtlety is dead.'},
                    {'id': '02C-B-2', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'UNIMPRESSED', 'detail': 'Sipping tea. "Rage blinds you, Detective." She controlled the room without a weapon.'},
                    {'id': '02C-B-3', 'imageKey': 'keeper', 'title': 'SILAS', 'subtitle': 'BROKEN', 'detail': '"The call came from Internal Affairs." The rot goes higher than the partner.'}
                ]

    # --- DAY 3: THE CONSPIRACY ---
    # Keys: AA, AB, BA, BB (First letter = Day 1 choice, Second = Day 2 choice)
    # Actually, Day 3 keys might depend on previous choices or just be their own branches.
    # Based on narrative file, Day 3 keys are AA, AB, BA, BB.
    # A = Methodical, B = Aggressive.
    # AA = Methodical D1 -> Methodical D2
    # AB = Methodical D1 -> Aggressive D2
    # BA = Aggressive D1 -> Methodical D2
    # BB = Aggressive D1 -> Aggressive D2

    if case_id == '003A': # Sarah's Investigation
        if path_key == 'AA':
            return [
                {'id': '03A-AA-1', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'ARCHIVE', 'detail': 'She pulled the files legally. "Clean hands, Jack." The Price-Reed connection.'},
                {'id': '03A-AA-2', 'imageKey': 'blackEnvelope', 'title': 'MEMOS', 'subtitle': 'PRICE FIRM', 'detail': 'Handwritten orders from Helen Price. The golden girl was the architect.'},
                {'id': '03A-AA-3', 'imageKey': 'keeper', 'title': 'SILAS', 'subtitle': 'LINK', 'detail': 'His ledger connects the firm to the frame-ups. A paper trail of ruined lives.'}
            ]
        if path_key == 'AB':
            return [
                {'id': '03A-AB-1', 'imageKey': 'keeper', 'title': 'SILAS', 'subtitle': 'BATHROOM', 'detail': 'Locked in my office. Feeding him coffee. "I\'m not a rat!" But he talked.'},
                {'id': '03A-AB-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'FURIOUS', 'detail': '"You\'re compromising the investigation." She hates the cowboy antics.'},
                {'id': '03A-AB-3', 'imageKey': 'blackEnvelope', 'title': 'DROP SITE', 'subtitle': 'HARBOR', 'detail': 'Helen\'s dead drop. The condemned precinct. Where the money met the lie.'}
            ]
        if path_key == 'BA':
            return [
                {'id': '03A-BA-1', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'COLD', 'detail': 'She won\'t look at me. "You risked his life." The partnership is cracking.'},
                {'id': '03A-BA-2', 'imageKey': 'blackEnvelope', 'title': 'IA REPORT', 'subtitle': 'GHOST', 'detail': 'Internal surveillance. A secure network monitoring Silas. No names yet.'},
                {'id': '03A-BA-3', 'imageKey': 'buyer', 'title': 'MARCUS WEBB', 'subtitle': 'TARGET', 'detail': 'He\'s the weak link. I need to break him to find the source.'}
            ]
        if path_key == 'BB':
            return [
                {'id': '03A-BB-1', 'imageKey': 'default', 'title': 'MILLER', 'subtitle': 'IA ANALYST', 'detail': 'Slammed him against his car. "Helen Price! She\'s the Queen!" Confession by force.'},
                {'id': '03A-BB-2', 'imageKey': 'blackEnvelope', 'title': 'INSURANCE', 'subtitle': 'POLICY', 'detail': 'A ledger in Helen\'s safe. The list of every sin.'},
                {'id': '03A-BB-3', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'ABSENT', 'detail': 'She\'s not here. I\'m doing this alone. The cost of rage is isolation.'}
            ]

    if case_id == '003B': # Marcus Webb
        if path_key == 'AA':
            return [
                {'id': '03B-AA-1', 'imageKey': 'buyer', 'title': 'MARCUS WEBB', 'subtitle': 'CORNERED', 'detail': 'Pale. Shaking. "Helen promised silence!" We used the memos to break him.'},
                {'id': '03B-AA-2', 'imageKey': 'blackEnvelope', 'title': 'AFFIDAVIT', 'subtitle': 'SIGNED', 'detail': 'He confessed. Helen ordered the cover-up. The legal noose tightens.'},
                {'id': '03B-AA-3', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'MSG', 'detail': '"Ask Helen for the Insurance Policy." She\'s guiding the takedown.'}
            ]
        if path_key == 'AB':
            return [
                {'id': '03B-AB-1', 'imageKey': 'keeper', 'title': 'SILAS', 'subtitle': 'HIDDEN', 'detail': 'Stashed in a parking garage. "Stay put." Using him as leverage against Webb.'},
                {'id': '03B-AB-2', 'imageKey': 'buyer', 'title': 'WEBB', 'subtitle': 'TRICKED', 'detail': '"Silas confessed." A lie to get the truth. He signed the affidavit to save himself.'},
                {'id': '03B-AB-3', 'imageKey': 'blackEnvelope', 'title': 'LEDGER', 'subtitle': 'LEAD', 'detail': '"It\'s in her safe!" The Insurance Policy. The final piece.'}
            ]
        if path_key == 'BA':
            return [
                {'id': '03B-BA-1', 'imageKey': 'buyer', 'title': 'WEBB', 'subtitle': 'PACKING', 'detail': 'Trying to run. "She threatened to take everything!"'},
                {'id': '03B-BA-2', 'imageKey': 'default', 'title': 'LOCKED DOOR', 'subtitle': 'TRAPPED', 'detail': 'I didn\'t let him leave. "Give me the safe combination."'},
                {'id': '03B-BA-3', 'imageKey': 'blackEnvelope', 'title': 'TESTIMONY', 'subtitle': 'FORCED', 'detail': 'He signed. Not for justice, but to avoid the headlines. Fear is a powerful motivator.'}
            ]
        if path_key == 'BB':
            return [
                {'id': '03B-BB-1', 'imageKey': 'default', 'title': 'STATUE', 'subtitle': 'SMASHED', 'detail': 'Bronze Apollo through glass. "I don\'t need proof, Marcus. I need a name!"'},
                {'id': '03B-BB-2', 'imageKey': 'buyer', 'title': 'WEBB', 'subtitle': 'BROKEN', 'detail': 'Weeping on the floor. "Tom! Tom Wade! He manufactured the evidence!"'},
                {'id': '03B-BB-3', 'imageKey': 'tomWade', 'title': 'TOM WADE', 'subtitle': 'BETRAYAL', 'detail': 'My best friend. The architect. The realization hit harder than the statue.'}
            ]

    if case_id == '003C': # Helen Price / The End of Day 3
        if path_key == 'AA':
            return [
                {'id': '03C-AA-1', 'imageKey': 'lex', 'title': 'HELEN PRICE', 'subtitle': 'DENIAL', 'detail': '"I was maintaining order!" She believed her own lie. Stability over justice.'},
                {'id': '03C-AA-2', 'imageKey': 'blackEnvelope', 'title': 'THE SAFE', 'subtitle': 'OPENED', 'detail': 'The Insurance Policy. T.W. next to every fabrication. Tom Wade.'},
                {'id': '03C-AA-3', 'imageKey': 'tomWade', 'title': 'ARCHITECT', 'subtitle': 'REVEALED', 'detail': '"He loved being the god who decided the truth." My friend, the monster.'}
            ]
        if path_key == 'AB':
            return [
                {'id': '03C-AB-1', 'imageKey': 'lex', 'title': 'HELEN', 'subtitle': 'CORNERED', 'detail': '"Silas ran! You\'re incompetent!" She tried to fight.'},
                {'id': '03C-AB-2', 'imageKey': 'blackEnvelope', 'title': 'AFFIDAVIT', 'subtitle': 'WEBB', 'detail': 'Her face went pale. The paper trail ended her reign.'},
                {'id': '03C-AB-3', 'imageKey': 'default', 'title': 'DECISION', 'subtitle': 'LOOMING', 'detail': 'Confess publicly or give up the source? The final squeeze.'}
            ]
        if path_key == 'BA':
            return [
                {'id': '03C-BA-1', 'imageKey': 'default', 'title': 'OFFICE', 'subtitle': 'LOCKED', 'detail': 'I locked us in. "Security won\'t save you." The aggressive end.'},
                {'id': '03C-BA-2', 'imageKey': 'lex', 'title': 'HELEN', 'subtitle': 'TEARS', 'detail': '"It was for stability!" The excuse of every tyrant. She gave up the ledger.'},
                {'id': '03C-BA-3', 'imageKey': 'tomWade', 'title': 'T.W.', 'subtitle': 'CONFIRMED', 'detail': 'Tom Wade. The initials in the book. The knife in my back.'}
            ]
        if path_key == 'BB':
            return [
                {'id': '03C-BB-1', 'imageKey': 'lex', 'title': 'HELEN', 'subtitle': 'TERRIFIED', 'detail': 'She saw the blood on my knuckles. She knew I was done talking.'},
                {'id': '03C-BB-2', 'imageKey': 'default', 'title': 'WRIST', 'subtitle': 'GRABBED', 'detail': 'Stopped her from reaching the alarm. "Give me the ledger."'},
                {'id': '03C-BB-3', 'imageKey': 'tomWade', 'title': 'THE TRUTH', 'subtitle': 'EXPOSED', 'detail': 'Tom Wade. The reckless path led straight to the heart of the betrayal.'}
            ]

    return []

def main():
    print(f"Loading {NARRATIVE_PATH}...")
    try:
        with open(NARRATIVE_PATH, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Error: File not found.")
        return

    case_content = data.get('caseContent', {})
    target_cases = ['002A', '002B', '002C', '003A', '003B', '003C']
    updated_count = 0
    
    for case_id in target_cases:
        if case_id in case_content:
            for path_key in case_content[case_id]:
                polaroids = get_polaroid_data(case_id, path_key)
                if polaroids:
                    print(f"Injecting polaroids for {case_id} - {path_key}")
                    if 'evidenceBoard' not in case_content[case_id][path_key]:
                         case_content[case_id][path_key]['evidenceBoard'] = {}
                    case_content[case_id][path_key]['evidenceBoard']['polaroids'] = polaroids
                    updated_count += 1
    
    data['caseContent'] = case_content
    
    with open(NARRATIVE_PATH, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Successfully updated {updated_count} paths in {NARRATIVE_PATH}.")

if __name__ == "__main__":
    main()
