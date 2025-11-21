import json
import os

NARRATIVE_PATH = 'src/data/storyNarrative.json'

def get_polaroid_data(case_id, path_key):
    # 010A: The Setup
    if case_id == '010A':
        if path_key == 'AA':
            return [
                {'id': '10A-AA-1', 'imageKey': 'harborPrecinct', 'title': 'NEW OFFICE', 'subtitle': 'ENFORCEMENT', 'detail': 'Concrete walls. High-tech security. Deputy Director of Enforcement. The muscle.'},
                {'id': '10A-AA-2', 'imageKey': 'blackEnvelope', 'title': 'THE BOX', 'subtitle': 'FABRICATION', 'detail': 'Evidence to frame Judge Chen. A bribe that never happened. Tom Wade\'s crime, now mine.'},
                {'id': '10A-AA-3', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'THE ORDER', 'detail': '"Plant the box. Get results." She demands loyalty through corruption.'}
            ]
        elif path_key == 'AP':
            return [
                {'id': '10A-AP-1', 'imageKey': 'harborPrecinct', 'title': 'HOLDING CELL', 'subtitle': 'FEDERAL CUSTODY', 'detail': 'Obstruction charges. Handcuffs. The uniform of a man who burned his life.'},
                {'id': '10A-AP-2', 'imageKey': 'voice', 'title': 'REBECCA MOSS', 'subtitle': 'THE DEFENSE', 'detail': '"Your aggression is killing us." My kidnapping charge tainted the evidence for the innocents.'},
                {'id': '10A-AP-3', 'imageKey': 'blackEnvelope', 'title': 'THE MOTION', 'subtitle': 'POISONED TREE', 'detail': 'Prosecutor arguing to toss everything. Innocents stay in prison to save face.'}
            ]
        elif path_key == 'MA':
            return [
                {'id': '10A-MA-1', 'imageKey': 'harborPrecinct', 'title': 'CORNER SUITE', 'subtitle': 'INVESTIGATIONS', 'detail': 'Glass and steel. Ruthless efficiency. Deputy Director of Investigations.'},
                {'id': '10A-MA-2', 'imageKey': 'blackEnvelope', 'title': 'ASSET LEDGER', 'subtitle': 'PRICE FIRM', 'detail': 'Absorbing the clientele. Expanding the intelligence division. Organizing the chaos.'},
                {'id': '10A-MA-3', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'THE STRATEGIST', 'detail': '"You bring legitimacy to my brutality." We are the system now.'}
            ]
        elif path_key == 'MP':
            return [
                {'id': '10A-MP-1', 'imageKey': 'harborPrecinct', 'title': 'COURTROOM', 'subtitle': 'ARRAIGNMENT', 'detail': 'Institutional gray. The judge looked at me with contempt. "Vigilante chaos." '},
                {'id': '10A-MP-2', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'STANDING TALL', 'detail': 'She stood by me. Risking her own clean break. A partner until the end.'},
                {'id': '10A-MP-3', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'THE NOD', 'detail': 'She pled not guilty. Met my eyes as she passed. A sad nod. Promise kept.'}
            ]

    # 010B: The Action
    if case_id == '010B':
        if path_key == 'AA':
            return [
                {'id': '10B-AA-1', 'imageKey': 'harborPrecinct', 'title': 'JUDGE CHAMBERS', 'subtitle': 'THE BREAK-IN', 'detail': 'Victoria\'s security made it easy. The drawer was waiting. The crime was ready.'},
                {'id': '10B-AA-2', 'imageKey': 'blackEnvelope', 'title': 'METAL BOX', 'subtitle': 'THE PLANT', 'detail': 'Cold steel. Heavy with old sins. One click to ruin an honest man.'},
                {'id': '10B-AA-3', 'imageKey': 'default', 'title': 'CHRONOS FILE', 'subtitle': 'THE TRUTH', 'detail': 'Not a bribe. Financial terrorism. Victoria isn\'t fighting corruption; she\'s destabilizing the grid.'}
            ]
        elif path_key == 'AP':
            return [
                {'id': '10B-AP-1', 'imageKey': 'harborPrecinct', 'title': 'SOLITARY', 'subtitle': 'MIDNIGHT', 'detail': 'Silence. Isolation. The lock slid open with an expensive click.'},
                {'id': '10B-AP-2', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'THE VISITOR', 'detail': '"You\'re still reckless, Jack." '},
                {'id': '10B-AP-3', 'imageKey': 'blackEnvelope', 'title': 'BLACK FILE', 'subtitle': 'UNTAINTED', 'detail': 'Original evidence from Tom\'s safe. Clean. The only way to save the five innocents is to run.'}
            ]
        elif path_key == 'MA':
            return [
                {'id': '10B-MA-1', 'imageKey': 'default', 'title': 'CHEN FILE', 'subtitle': 'BLACKMAIL', 'detail': 'Judge Arthur Chen. Honest man. Daughter with addiction. We\'re using her pain.'},
                {'id': '10B-MA-2', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'THE LOGIC', 'detail': '"He\'s a variable." Cold. Hard. We became the corruption we fought.'},
                {'id': '10B-MA-3', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'REJECTION', 'detail': '"I can\'t help you, Jack. You chose the shadow." Disappointment heavier than anger.'}
            ]
        elif path_key == 'MP':
            return [
                {'id': '10B-MP-1', 'imageKey': 'voice', 'title': 'SARAH REEVES', 'subtitle': 'DEFEAT', 'detail': '"Martinez is fighting dirty." Leaking documents. Painting me as the villain.'},
                {'id': '10B-MP-2', 'imageKey': 'blackEnvelope', 'title': 'DISMISSAL', 'subtitle': 'POISONED TREE', 'detail': 'The judge signed the motion. Evidence tossed. The innocents stay in prison.'},
                {'id': '10B-MP-3', 'imageKey': 'silence', 'title': 'BURNER PHONE', 'subtitle': 'THE LEAK', 'detail': '"The system won, Detective." Victoria offering one last dirty play to save them.'}
            ]

    # 010C: The Climax
    if case_id == '010C':
        if path_key == 'AA':
            return [
                {'id': '10C-AA-1', 'imageKey': 'default', 'title': 'SHATTERED GLASS', 'subtitle': 'THE SHOT', 'detail': 'I didn\'t shoot her. I shot the window. A final declaration of war.'},
                {'id': '10C-AA-2', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'THE CHOICE', 'detail': '"Expose me now, or I expose you first." Mutual destruction or mutual silence.'},
                {'id': '10C-AA-3', 'imageKey': 'blackEnvelope', 'title': 'CHRONOS FILE', 'subtitle': 'THE LEVERAGE', 'detail': 'Financial terrorism. I hold the city\'s fate in a stolen folder.'}
            ]
        elif path_key == 'AP':
            return [
                {'id': '10C-AP-1', 'imageKey': 'harborPrecinct', 'title': 'OPEN CELL', 'subtitle': 'THE EXIT', 'detail': 'The door stood open. The corridor beckoned. The sound of absolute freedom.'},
                {'id': '10C-AP-2', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'THE TEST', 'detail': '"Are you a man who respects the broken law, or one who delivers justice?"'},
                {'id': '10C-AP-3', 'imageKey': 'blackEnvelope', 'title': 'THE FILE', 'subtitle': 'THE COST', 'detail': 'Save the innocents by becoming a fugitive. Or stay and let them rot.'}
            ]
        elif path_key == 'MA':
            return [
                {'id': '10C-MA-1', 'imageKey': 'default', 'title': 'DROPPED FILE', 'subtitle': 'REFUSAL', 'detail': '"I won\'t be your Helen Price." I drew the line at blackmailing a judge.'},
                {'id': '10C-MA-2', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'FINAL LESSON', 'detail': '"You\'re a clean man who chose a dirty path." She wanted me to expose her.'},
                {'id': '10C-MA-3', 'imageKey': 'blackEnvelope', 'title': 'FLASH DRIVE', 'subtitle': 'THE LEGACY', 'detail': 'Everything. Shell corps. Evidence. The keys to the kingdom or the pyre.'}
            ]
        elif path_key == 'MP':
            return [
                {'id': '10C-MP-1', 'imageKey': 'default', 'title': 'BURNER PHONE', 'subtitle': 'THE LEAK', 'detail': 'Victoria\'s number. The Grange Ledger attached. One press to send.'},
                {'id': '10C-MP-2', 'imageKey': 'harborPrecinct', 'title': 'PRISON WALL', 'subtitle': 'THE CAGE', 'detail': 'Leak it and I\'m done. Stay silent and they\'re done. Law vs Justice.'},
                {'id': '10C-MP-3', 'imageKey': 'blackEnvelope', 'title': 'THE LEDGER', 'subtitle': 'THE TRUTH', 'detail': 'Offshore accounts. The map of the conspiracy. Radioactive.'}
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
    
    # Iterate through the cases and paths we want to update
    target_cases = ['010A', '010B', '010C']
    
    updated_count = 0
    
    for case_id in target_cases:
        if case_id in case_content:
            for path_key in case_content[case_id]:
                # Skip ROOT if it's just a container, but here keys are AA, AP etc.
                polaroids = get_polaroid_data(case_id, path_key)
                if polaroids:
                    print(f"Injecting polaroids for {case_id} - {path_key}")
                    case_content[case_id][path_key]['evidenceBoard'] = {
                        'polaroids': polaroids
                    }
                    updated_count += 1
    
    data['caseContent'] = case_content
    
    with open(NARRATIVE_PATH, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Successfully updated {updated_count} paths in {NARRATIVE_PATH}.")

if __name__ == "__main__":
    main()
