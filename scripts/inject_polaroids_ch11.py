import json
import os

NARRATIVE_PATH = 'src/data/storyNarrative.json'

def get_polaroid_data(case_id, path_key):
    # --- CHAPTER 11: THE CONSEQUENCE ---
    
    # 011A: The New Reality
    if case_id == '011A':
        if path_key == 'AAC': # Aggressive-Ally-Contain (Shadow Architect)
            return [
                {'id': '11A-AAC-1', 'imageKey': 'harborPrecinct', 'title': 'PENTHOUSE OFFICE', 'subtitle': 'THE THRONE', 'detail': 'View of the city I control. Safety purchased with silence.'},
                {'id': '11A-AAC-2', 'imageKey': 'blackEnvelope', 'title': 'BLACKWELL LEDGER', 'subtitle': 'MAINTENANCE', 'detail': 'Bribes. Blackmail. The oil that keeps the machine running.'},
                {'id': '11A-AAC-3', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'SILENCE', 'detail': 'She won\'t take my calls. She knows what I became to save the city.'}
            ]
        if path_key == 'AAE': # Aggressive-Ally-Expose (Hero/Cleaner)
            return [
                {'id': '11A-AAE-1', 'imageKey': 'harborPrecinct', 'title': 'SECURE SITE', 'subtitle': 'THE HANDOFF', 'detail': 'Meeting Sarah. Clean hands again. The city is chaotic but free.'},
                {'id': '11A-AAE-2', 'imageKey': 'blackEnvelope', 'title': 'CHRONOS FILE', 'subtitle': 'EXPOSED', 'detail': 'Leaked to the FBI. Financial terrorism stopped. Victoria in cuffs.'},
                {'id': '11A-AAE-3', 'imageKey': 'lex', 'title': 'JOB OFFER', 'subtitle': 'LEAD INVESTIGATOR', 'detail': '"We need your knowledge." Sarah offering a path back to the light.'}
            ]
        if path_key == 'APE': # Aggressive-Prisoner-Escape (Fugitive)
            return [
                {'id': '11A-APE-1', 'imageKey': 'harborPrecinct', 'title': 'SERVICE TUNNEL', 'subtitle': 'THE EXIT', 'detail': 'Slamming the door on prison. The cold air of exile.'},
                {'id': '11A-APE-2', 'imageKey': 'blackEnvelope', 'title': 'UNTAINTED FILE', 'subtitle': 'THE LEAK', 'detail': 'Sent to the world. Chaos. The innocents will be free, but I am hunted.'},
                {'id': '11A-APE-3', 'imageKey': 'default', 'title': 'GETAWAY CAR', 'subtitle': 'KEY UNDER HYDRANT', 'detail': 'Victoria\'s plan was flawless. A fast car. A new name. A lonely road.'}
            ]
        if path_key == 'APL': # Aggressive-Prisoner-Law (Convicted)
            return [
                {'id': '11A-APL-1', 'imageKey': 'harborPrecinct', 'title': 'PRISON CELL', 'subtitle': 'SIX YEARS', 'detail': 'The verdict was swift. Obstruction. The system protected itself.'},
                {'id': '11A-APL-2', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'DEFEAT', 'detail': '"They remain in prison." My integrity cost them everything.'},
                {'id': '11A-APL-3', 'imageKey': 'blackEnvelope', 'title': 'TINY NOTE', 'subtitle': 'VICTORIA\'S MSG', 'detail': '"I kept one clean piece." A hidden file in the gallery. A final chance.'}
            ]
        if path_key == 'MAE': # Methodical-Ally-Expose (Public Servant)
            return [
                {'id': '11A-MAE-1', 'imageKey': 'harborPrecinct', 'title': 'INTEGRITY OFFICE', 'subtitle': 'NEW BEGINNING', 'detail': 'Sarah\'s project. Clean desks. Righteous energy. A place to heal.'},
                {'id': '11A-MAE-2', 'imageKey': 'blackEnvelope', 'title': 'CHEN FILE', 'subtitle': 'LEAKED', 'detail': 'I exposed Victoria. Saved the judge. Paid the debt.'},
                {'id': '11A-MAE-3', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'PARTNER', 'detail': '"You have the knowledge." Building a future from the wreckage of the past.'}
            ]
        if path_key == 'MAF': # Methodical-Ally-Flee (Shadow Boss)
            return [
                {'id': '11A-MAF-1', 'imageKey': 'harborPrecinct', 'title': 'EMPTY PENTHOUSE', 'subtitle': 'ABANDONED', 'detail': 'Victoria vanished. I am the de facto head of a criminal empire.'},
                {'id': '11A-MAF-2', 'imageKey': 'blackEnvelope', 'title': 'SUB-NETWORK', 'subtitle': 'THE ROT', 'detail': 'Petty blackmail. Local corruption. The weeds growing in Victoria\'s garden.'},
                {'id': '11A-MAF-3', 'imageKey': 'silence', 'title': 'BURNER PHONE', 'subtitle': 'THE CALL', 'detail': '"You handle the maintenance." She left me holding the bag.'}
            ]
        if path_key == 'MPJ': # Methodical-Prisoner-Justice (Martyr)
            return [
                {'id': '11A-MPJ-1', 'imageKey': 'blackEnvelope', 'title': 'GRANGE LEDGER', 'subtitle': 'PUBLIC DOMAIN', 'detail': 'The leak worked. The innocents are free. My freedom was the price.'},
                {'id': '11A-MPJ-2', 'imageKey': 'harborPrecinct', 'title': 'HOLDING CELL', 'subtitle': 'TRANSFER', 'detail': 'Five years federal. The judge was shaking with rage.'},
                {'id': '11A-MPJ-3', 'imageKey': 'silence', 'title': 'OPEN DOOR', 'subtitle': 'THE BREAKOUT', 'detail': 'Lights out. Lock open. Victoria in a guard\'s uniform. "Get up, Detective."'}
            ]
        if path_key == 'MPL': # Methodical-Prisoner-Law (Failed Martyr)
            return [
                {'id': '11A-MPL-1', 'imageKey': 'harborPrecinct', 'title': 'COURT ORDER', 'subtitle': 'DENIED', 'detail': 'Evidence ruled inadmissible. Fruit of the poisonous tree. They stay in prison.'},
                {'id': '11A-MPL-2', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'BROKEN', 'detail': '"We lost, Jack." The weight of five lives crushing us both.'},
                {'id': '11A-MPL-3', 'imageKey': 'silence', 'title': 'VISITORS BOOTH', 'subtitle': 'VICTORIA', 'detail': '"Your integrity cost them their freedom." She came to show me the failure.'}
            ]

    # 011B: The Threat
    if case_id == '011B':
        if path_key == 'AAC':
            return [
                {'id': '11B-AAC-1', 'imageKey': 'default', 'title': 'VANCE', 'subtitle': 'THE MOLE', 'detail': 'A rogue asset. He has the kill-switch. He can wipe the city contracts.'},
                {'id': '11B-AAC-2', 'imageKey': 'blackEnvelope', 'title': 'KILL SWITCH', 'subtitle': 'THE THREAT', 'detail': 'Untraceable. Destructive. He trusts only Sarah Reeves.'},
                {'id': '11B-AAC-3', 'imageKey': 'voice', 'title': 'THE CALL', 'subtitle': 'ULTIMATUM', 'detail': '"Take the asset, Sarah. Or watch the city burn." Forcing her hand.'}
            ]
        if path_key == 'AAE':
            return [
                {'id': '11B-AAE-1', 'imageKey': 'default', 'title': 'CODED MESSAGE', 'subtitle': 'VANCE', 'detail': 'He stole the Chronos data. Selling it to a cartel. FBI is too slow.'},
                {'id': '11B-AAE-2', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'THE LAW', 'detail': '"We stick to the law!" She doesn\'t understand the speed of the shadow.'},
                {'id': '11B-AAE-3', 'imageKey': 'harborPrecinct', 'title': 'CROSSROADS', 'subtitle': 'DECISION', 'detail': 'Go back to the darkness to stop him? Or trust the slow wheels of justice?'}
            ]
        if path_key == 'APE':
            return [
                {'id': '11B-APE-1', 'imageKey': 'harborPrecinct', 'title': 'REMOTE MARINA', 'subtitle': 'THE BOAT', 'detail': 'Fueled. Ready. A dossier with a new life. Freedom smells like salt air.'},
                {'id': '11B-APE-2', 'imageKey': 'voice', 'title': 'PHONE CALL', 'subtitle': 'SARAH', 'detail': '"It\'s not over! The network is still active!" She tracked me.'},
                {'id': '11B-APE-3', 'imageKey': 'blackEnvelope', 'title': 'SERVER LOGS', 'subtitle': 'LOOSE ENDS', 'detail': 'I can leave, or I can help her finish it. But she won\'t break the law for me.'}
            ]
        if path_key == 'APL':
            return [
                {'id': '11B-APL-1', 'imageKey': 'default', 'title': 'GALLERY MAP', 'subtitle': 'THE FUSE BOX', 'detail': 'Victoria hid the Overseer\'s Report there. The only untainted evidence.'},
                {'id': '11B-APL-2', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'HORROR', 'detail': '"That\'s B&E. That\'s tampering." She\'s terrified of becoming what she fights.'},
                {'id': '11B-APL-3', 'imageKey': 'blackEnvelope', 'title': 'THE CHOICE', 'subtitle': 'CORRUPTION', 'detail': 'Force her to break the law, or let Eleanor die in prison. Moral blackmail.'}
            ]
        if path_key == 'MAE':
            return [
                {'id': '11B-MAE-1', 'imageKey': 'blackEnvelope', 'title': 'WHITE PAWN', 'subtitle': 'THE WARNING', 'detail': 'A new threat. Vance. He has the Overseer\'s Ledger. Targeting Sarah.'},
                {'id': '11B-MAE-2', 'imageKey': 'silence', 'title': 'JAIL CALL', 'subtitle': 'VICTORIA', 'detail': '"You exposed the head, but not the tail." She knows the threat is real.'},
                {'id': '11B-MAE-3', 'imageKey': 'default', 'title': 'BLACKWELL ASSETS', 'subtitle': 'THE TEMPTATION', 'detail': 'I can use the old network to stop him. Or trust the legal process.'}
            ]
        if path_key == 'MAF':
            return [
                {'id': '11B-MAF-1', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'THE MEETING', 'detail': 'She looks at me with cold assessment. "I won\'t work for the shadow."'},
                {'id': '11B-MAF-2', 'imageKey': 'blackEnvelope', 'title': 'AUDIT REQUEST', 'subtitle': 'THE MOLE', 'detail': 'I need her to find the leak. She refuses.'},
                {'id': '11B-MAF-3', 'imageKey': 'silence', 'title': 'TEXT MSG', 'subtitle': 'BETRAYAL', 'detail': '"The mole is Sarah Reeves." She\'s wearing a wire. She chose the law over me.'}
            ]
        if path_key == 'MPJ':
            return [
                {'id': '11B-MPJ-1', 'imageKey': 'harborPrecinct', 'title': 'SERVICE TUNNEL', 'subtitle': 'ESCAPE', 'detail': 'Slipping into the dark. The security failure was a gift.'},
                {'id': '11B-MPJ-2', 'imageKey': 'blackEnvelope', 'title': 'LEATHER BRIEFCASE', 'subtitle': 'THE KEYS', 'detail': 'Every asset. Every secret. The blueprints to the shadow empire.'},
                {'id': '11B-MPJ-3', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'FAREWELL', 'detail': '"I\'m done. You earned the right to choose." She\'s leaving to be Emily.'}
            ]
        if path_key == 'MPL':
            return [
                {'id': '11B-MPL-1', 'imageKey': 'blackEnvelope', 'title': 'CODED NOTE', 'subtitle': 'OFFSHORE KEY', 'detail': 'The only untainted evidence left. Proof of the Overseer.'},
                {'id': '11B-MPL-2', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'THE PLEA', 'detail': '"Teach her the necessary way." A final act of contrition.'},
                {'id': '11B-MPL-3', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'THE KEY', 'detail': 'It looks like a death warrant. It\'s the truth. But it\'s illegal.'}
            ]

    # 011C: The Resolution
    if case_id == '011C':
        if path_key == 'AAC':
            return [
                {'id': '11C-AAC-1', 'imageKey': 'harborPrecinct', 'title': 'DARK ROOM', 'subtitle': 'THE STATIC', 'detail': 'Vance waiting. Sarah entering the trap. I hold the cards.'},
                {'id': '11C-AAC-2', 'imageKey': 'blackEnvelope', 'title': 'KILL SWITCH', 'subtitle': 'THE COST', 'detail': 'Force her to take it? Corrupt her to save the city? or Sacrifice the power?'},
                {'id': '11C-AAC-3', 'imageKey': 'default', 'title': 'THE LEVERAGE', 'subtitle': 'THREAT', 'detail': 'I can destroy Vance\'s family. Or I can destroy Sarah\'s innocence.'}
            ]
        if path_key == 'AAE':
            return [
                {'id': '11C-AAE-1', 'imageKey': 'harborPrecinct', 'title': 'CROSSROADS', 'subtitle': 'THE GUN', 'detail': 'Heavy in my pocket. The law firm across the street.'},
                {'id': '11C-AAE-2', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'THE HOPE', 'detail': 'Trusting the slow process. Believing I can change.'},
                {'id': '11C-AAE-3', 'imageKey': 'default', 'title': 'SHADOW ASSETS', 'subtitle': 'THE TEMPTATION', 'detail': 'I can end this tonight. With one call. And a bullet.'}
            ]
        if path_key == 'APE':
            return [
                {'id': '11C-APE-1', 'imageKey': 'harborPrecinct', 'title': 'THE DOCK', 'subtitle': 'DEPARTURE', 'detail': 'The boat engine idling. The road back to the city burning.'},
                {'id': '11C-APE-2', 'imageKey': 'voice', 'title': 'PHONE SCREEN', 'subtitle': 'THE PLEA', 'detail': 'Sarah begging me to come back. To finish it right.'},
                {'id': '11C-APE-3', 'imageKey': 'default', 'title': 'TWO PATHS', 'subtitle': 'IDENTITY', 'detail': 'Permanent exile as a ghost? Or prison as a redeemed man?'}
            ]
        if path_key == 'APL':
            return [
                {'id': '11C-APL-1', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'THE WALL', 'detail': '"I won\'t become a criminal." She\'s holding the line.'},
                {'id': '11C-APL-2', 'imageKey': 'blackEnvelope', 'title': 'THE FILE', 'subtitle': 'THE LEVERAGE', 'detail': 'I can force her. Guilt is a powerful weapon. "You\'re condemning them."'},
                {'id': '11C-APL-3', 'imageKey': 'default', 'title': 'FINAL CHOICE', 'subtitle': 'BLACKMAIL', 'detail': 'Break her soul to save the innocent? Or let them rot to save her conscience?'}
            ]
        if path_key == 'MAE':
            return [
                {'id': '11C-MAE-1', 'imageKey': 'harborPrecinct', 'title': 'SARAH\'S OFFICE', 'subtitle': 'TWO FILES', 'detail': 'The legal case. The shadow assets. Slow or fast.'},
                {'id': '11C-MAE-2', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'THE PARTNER', 'detail': 'She believes in the law. She believes in me.'},
                {'id': '11C-MAE-3', 'imageKey': 'blackEnvelope', 'title': 'BLACKWELL CODES', 'subtitle': 'THE WEAPON', 'detail': 'I can dismantle Vance in an hour. But I lose the light.'}
            ]
        if path_key == 'MAF':
            return [
                {'id': '11C-MAF-1', 'imageKey': 'voice', 'title': 'THE WIRE', 'subtitle': 'BETRAYAL', 'detail': 'Hidden in her lapel. She\'s recording me. Evidence.'},
                {'id': '11C-MAF-2', 'imageKey': 'blackEnvelope', 'title': 'THE EMPIRE', 'subtitle': 'AT RISK', 'detail': 'If I let her go, Blackwell falls. I lose everything.'},
                {'id': '11C-MAF-3', 'imageKey': 'default', 'title': 'FINAL CHOICE', 'subtitle': 'SACRIFICE', 'detail': 'Turn her in to save the power? Or warn her and lose the throne?'}
            ]
        if path_key == 'MPJ':
            return [
                {'id': '11C-MPJ-1', 'imageKey': 'blackEnvelope', 'title': 'THE BRIEFCASE', 'subtitle': 'THE BOMB', 'detail': 'Everything. Every secret in Ashport. A weapon of mass destruction.'},
                {'id': '11C-MPJ-2', 'imageKey': 'harborPrecinct', 'title': 'GETAWAY CAR', 'subtitle': 'WAITING', 'detail': 'I can rule from the shadows. Or I can burn it all down.'},
                {'id': '11C-MPJ-3', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'GONE', 'detail': 'She left me the choice. Anarchy or Order. Martyr or King.'}
            ]
        if path_key == 'MPL':
            return [
                {'id': '11C-MPL-1', 'imageKey': 'blackEnvelope', 'title': 'THE KEY', 'subtitle': 'ILLEGAL', 'detail': 'It proves the conspiracy. But using it is a crime.'},
                {'id': '11C-MPL-2', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'THE PAWN', 'detail': 'I can make her a hero. Or I can make her corrupt to save myself.'},
                {'id': '11C-MPL-3', 'imageKey': 'default', 'title': 'FINAL PLAY', 'subtitle': 'SELFISHNESS', 'detail': 'Save the innocents? Or use the key to overturn my own conviction?'}
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
    target_cases = ['011A', '011B', '011C']
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
