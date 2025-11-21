import json
import os

NARRATIVE_PATH = 'src/data/storyNarrative.json'

def get_polaroid_data(case_id, path_key):
    # --- DAY 4: THE RECKONING ---
    if case_id == '004A':
        if path_key == 'AGGRESSIVE': # The Interrogation (Trap)
            return [
                {'id': '04A-AG-1', 'imageKey': 'lex', 'title': 'HELEN PRICE', 'subtitle': 'BROKEN', 'detail': 'Trembling at her desk. "Call him." She betrayed her architect to save herself.'},
                {'id': '04A-AG-2', 'imageKey': 'default', 'title': 'SPEAKERPHONE', 'subtitle': 'THE TRAP', 'detail': 'Tom\'s voice. "I\'ll fix this." Walking into the ambush.'},
                {'id': '04A-AG-3', 'imageKey': 'default', 'title': 'MY GUN', 'subtitle': 'WAITING', 'detail': 'Checked the clip. Shadows drawn. Monsters hunt best in the dark.'}
            ]
        if path_key == 'METHODICAL': # The Podium (Press Conference)
            return [
                {'id': '04A-ME-1', 'imageKey': 'harborPrecinct', 'title': 'PODIUM', 'subtitle': 'CITY HALL', 'detail': 'Blinding lights. "I lied." The Queen admitted her reign was fake.'},
                {'id': '04A-ME-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'WITNESS', 'detail': 'Standing in the wings. Watching us burn it down to save it.'},
                {'id': '04A-ME-3', 'imageKey': 'blackEnvelope', 'title': 'LEDGER', 'subtitle': 'EXPOSED', 'detail': 'Laid out for the cameras. The names. The dates. The end.'}
            ]

    if case_id == '004B':
        if path_key == 'AGGRESSIVE': # Sarah's Intervention (Beating Tom)
            return [
                {'id': '04B-AG-1', 'imageKey': 'tomWade', 'title': 'TOM WADE', 'subtitle': 'BLOODY', 'detail': 'On the floor. "I fixed the system!" Defending his crimes while bleeding.'},
                {'id': '04B-AG-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'STOPPING ME', 'detail': '"Jack! Don\'t!" She pulled me back from the edge of murder.'},
                {'id': '04B-AG-3', 'imageKey': 'blackEnvelope', 'title': 'PHONE ALERT', 'subtitle': 'GRANGE', 'detail': 'Victoria released the video. Grange had Emily. The real monster revealed.'}
            ]
        if path_key == 'METHODICAL': # The Counter-Move (Grange Revealed)
            return [
                {'id': '04B-ME-1', 'imageKey': 'blackEnvelope', 'title': 'VIDEO FILE', 'subtitle': 'CHECKMATE', 'detail': 'Emily screaming. Grange holding the knife. Timestamped seven years ago.'},
                {'id': '04B-ME-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'RUNNING', 'detail': '"We need to go." Fleeing the press to catch the Deputy Chief.'},
                {'id': '04B-ME-3', 'imageKey': 'harborPrecinct', 'title': 'YACHT CLUB', 'subtitle': 'THE HUNT', 'detail': 'Grange at the docks. Trying to run. We\'re five minutes out.'}
            ]

    if case_id == '004C':
        if path_key == 'AGGRESSIVE': # Fugitive/Kidnapper
            return [
                {'id': '04C-AG-1', 'imageKey': 'tomWade', 'title': 'TRUNK', 'subtitle': 'KIDNAPPED', 'detail': 'My best friend in the boot of his own car. I crossed the line.'},
                {'id': '04C-AG-2', 'imageKey': 'harborPrecinct', 'title': 'SAFEHOUSE', 'subtitle': 'OFF GRID', 'detail': 'Nowhere to go. Wanted man. But I have the source of the rot.'},
                {'id': '04C-AG-3', 'imageKey': 'blackEnvelope', 'title': 'INSURANCE', 'subtitle': 'BURNING', 'detail': 'The ledger in my hand. I chose truth over law.'}
            ]
        if path_key == 'METHODICAL': # Arrest/Lawful
            return [
                {'id': '04C-ME-1', 'imageKey': 'keeper', 'title': 'GRANGE', 'subtitle': 'ARRESTED', 'detail': 'Cuffed on the dock. "Seven years too late." Satisfying weight of steel.'},
                {'id': '04C-ME-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'RESPECT', 'detail': '"You risked everything." We did it clean. But the cost was high.'},
                {'id': '04C-ME-3', 'imageKey': 'default', 'title': 'FBI', 'subtitle': 'TAKEOVER', 'detail': 'Handing him over. The system takes the credit. But we know who caught him.'}
            ]

    # --- DAY 5: THE FUGITIVE / THE WITNESS ---
    # Keys: AF (Aggressive-Fugitive), AS (Aggressive-Surrender), MA (Methodical-Aggressive), ML (Methodical-Lawful)

    if case_id == '005A':
        if path_key == 'AF': # Running on Fumes
            return [
                {'id': '05A-AF-1', 'imageKey': 'default', 'title': 'STOLEN CAR', 'subtitle': 'HOME', 'detail': 'Sleeping in the back. Coffee and adrenaline. Hunted by my own partner.'},
                {'id': '05A-AF-2', 'imageKey': 'voice', 'title': 'CLAIRE', 'subtitle': 'GRAVEYARD', 'detail': 'Met among the tombstones. "You promised justice." She gave me the coordinates.'},
                {'id': '05A-AF-3', 'imageKey': 'harborPrecinct', 'title': 'HELIOS', 'subtitle': 'TARGET', 'detail': 'Satellite photo. The lab where the lies were made. Victoria is cleaning it.'}
            ]
        if path_key == 'AS': # Legal Wreckage (Ankle Monitor)
            return [
                {'id': '05A-AS-1', 'imageKey': 'default', 'title': 'ANKLE MONITOR', 'subtitle': 'TETHERED', 'detail': 'House arrest. Chafing plastic. A vigilante on a leash.'},
                {'id': '05A-AS-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'PROXY', 'detail': 'She went to Greystone for me. I sat in the car, useless.'},
                {'id': '05A-AS-3', 'imageKey': 'lex', 'title': 'LISA CHEN', 'subtitle': 'RELEASED', 'detail': 'She handed me the drive. "Find James and Teresa." A victim giving orders.'}
            ]
        if path_key == 'MA': # Tainted Witness
            return [
                {'id': '05A-MA-1', 'imageKey': 'buyer', 'title': 'MARTINEZ', 'subtitle': 'HOSTILE', 'detail': '"You\'re a liability." Dragged into a closet. The FBI hates me.'},
                {'id': '05A-MA-2', 'imageKey': 'lex', 'title': 'LISA CHEN', 'subtitle': 'SCORN', 'detail': '"You exchanged one violence for another." She sees right through me.'},
                {'id': '05A-MA-3', 'imageKey': 'blackEnvelope', 'title': 'FLASH DRIVE', 'subtitle': 'THE KEY', 'detail': 'Victoria sent it. "Results without accountability." A lesson in hypocrisy.'}
            ]
        if path_key == 'ML': # Lab Rat's Release
            return [
                {'id': '05A-ML-1', 'imageKey': 'lex', 'title': 'LISA CHEN', 'subtitle': 'FREED', 'detail': '"Statistically, I expected arrogance." She saw shame. That was progress.'},
                {'id': '05A-ML-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'SHIELD', 'detail': 'Standing between me and the victim. Protective. Professional.'},
                {'id': '05A-ML-3', 'imageKey': 'tomWade', 'title': 'CONFESSION', 'subtitle': 'IMPLICATED', 'detail': 'Tom talked. He framed her. I believed him because he was my friend.'}
            ]

    if case_id == '005B':
        if path_key == 'AF': # The Empty Lab
            return [
                {'id': '05B-AF-1', 'imageKey': 'harborPrecinct', 'title': 'HELIOS', 'subtitle': 'EMPTY', 'detail': 'Broken window. Sterile floor. Victoria cleaned it out.'},
                {'id': '05B-AF-2', 'imageKey': 'blackEnvelope', 'title': 'FILE CABINET', 'subtitle': 'LEFT BEHIND', 'detail': 'Marked with a "V". The Chen Dossier. She left the victims, took the tools.'},
                {'id': '05B-AF-3', 'imageKey': 'silence', 'title': 'TEXT MSG', 'subtitle': 'VICTORIA', 'detail': '"You\'re always one step behind." Mocking me. Guiding me.'}
            ]
        if path_key == 'AS': # Prisoner's Deal
            return [
                {'id': '05B-AS-1', 'imageKey': 'harborPrecinct', 'title': 'JAIL VISIT', 'subtitle': 'TOM WADE', 'detail': 'Separated by glass. "You ruined my life, Jack."'},
                {'id': '05B-AS-2', 'imageKey': 'tomWade', 'title': 'TERESA', 'subtitle': 'BETRAYAL', 'detail': '"She found my notebooks." He framed his wife to save his career. Monstrous.'},
                {'id': '05B-AS-3', 'imageKey': 'blackEnvelope', 'title': 'HELIOS', 'subtitle': 'LOCATION', 'detail': 'He gave up the lab. Hoping for a deal. Victoria is already there.'}
            ]
        if path_key == 'MA': # Victoria's Ultimatum
            return [
                {'id': '05B-MA-1', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'LEAVING', 'detail': 'Packing her box. "I\'m done." My aggression cost me my partner.'},
                {'id': '05B-MA-2', 'imageKey': 'blackEnvelope', 'title': 'THE CHOICE', 'subtitle': 'ISOLATION', 'detail': 'Victoria demands I come alone. Sarah demands I stop. I can\'t have both.'},
                {'id': '05B-MA-3', 'imageKey': 'silence', 'title': 'TEXT MSG', 'subtitle': 'WATERFRONT', 'detail': 'Next briefing. Alone. "You chose isolation; now embrace it."'}
            ]
        if path_key == 'ML': # Collateral Damage
            return [
                {'id': '05B-ML-1', 'imageKey': 'lex', 'title': 'LISA CHEN', 'subtitle': 'THE CAR', 'detail': '"Victoria told me to wait." She knew I\'d be the one to free her.'},
                {'id': '05B-ML-2', 'imageKey': 'blackEnvelope', 'title': 'TWO NAMES', 'subtitle': 'NEW VICTIMS', 'detail': 'James Sullivan. Teresa Wade. Two more lives broken by Tom\'s lies.'},
                {'id': '05B-ML-3', 'imageKey': 'buyer', 'title': 'MARTINEZ', 'subtitle': 'WARNING', 'detail': '"You\'re a necessary evil." I\'m a witness, but barely.'}
            ]

    if case_id == '005C':
        if path_key == 'AF': # Victim's Mercy
            return [
                {'id': '05C-AF-1', 'imageKey': 'default', 'title': 'BLACK MERCEDES', 'subtitle': 'THE RIDE', 'detail': 'Lisa Chen in the back. Not Victoria. A victim saving her persecutor.'},
                {'id': '05C-AF-2', 'imageKey': 'blackEnvelope', 'title': 'KEYCARD', 'subtitle': 'GRANGE', 'detail': 'Stolen from his boat. Access to his private lockup. The final target.'},
                {'id': '05C-AF-3', 'imageKey': 'lex', 'title': 'LISA CHEN', 'subtitle': 'DEAL', 'detail': '"I don\'t forgive you. But I need you to find Teresa." Mercy for a purpose.'}
            ]
        if path_key == 'AS': # The Legal Line
            return [
                {'id': '05C-AS-1', 'imageKey': 'default', 'title': 'ANKLE MONITOR', 'subtitle': 'LIMIT', 'detail': 'I can\'t leave. I have to trust the FBI to hit Helios.'},
                {'id': '05C-AS-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'FIRM', 'detail': '"I won\'t risk my career for your ego." She\'s right. I have to wait.'},
                {'id': '05C-AS-3', 'imageKey': 'blackEnvelope', 'title': 'THE CHOICE', 'subtitle': 'CUT IT?', 'detail': 'Stay and be safe? or Cut the monitor and run?'}
            ]
        if path_key == 'MA': # Break or Betrayal
            return [
                {'id': '05C-MA-1', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'GONE', 'detail': 'She drove away. I chose the vigilante path. I am alone.'},
                {'id': '05C-MA-2', 'imageKey': 'silence', 'title': 'WAREHOUSE', 'subtitle': 'COORDINATES', 'detail': '"Good. You are unbound." Victoria approves of my isolation.'},
                {'id': '05C-MA-3', 'imageKey': 'blackEnvelope', 'title': 'NAMES', 'subtitle': 'SAVED', 'detail': 'I told Sarah about Teresa. Saved the case, lost the partner.'}
            ]
        if path_key == 'ML': # First Step
            return [
                {'id': '05C-ML-1', 'imageKey': 'blackEnvelope', 'title': 'CASE FILES', 'subtitle': 'CROSS REF', 'detail': 'Linking Chen to Sullivan. The pattern of fraud is clear.'},
                {'id': '05C-ML-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'HOPE', 'detail': '"We can get them out." Rebuilding justice, one file at a time.'},
                {'id': '05C-ML-3', 'imageKey': 'silence', 'title': 'TEXT MSG', 'subtitle': 'URGENCY', 'detail': '"Justice delayed is justice denied." Victoria pushing us to move faster.'}
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
    target_cases = ['004A', '004B', '004C', '005A', '005B', '005C']
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
