import json
import os

NARRATIVE_PATH = 'src/data/storyNarrative.json'

def main():
    try:
        with open(NARRATIVE_PATH, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Error: File not found.")
        return

    case_content = data.get('caseContent', {})
    
    # Fix 012B - MAES
    if '012B' in case_content and 'MAES' in case_content['012B']:
        print("Injecting polaroids for 012B - MAES")
        polaroids = [
            {'id': '12B-MAES-1', 'imageKey': 'harborPrecinct', 'title': 'BUNKER', 'subtitle': 'ISOLATION', 'detail': 'Shielded by chaos. Protected by secrets. The Overseer.'},
            {'id': '12B-MAES-2', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'RELEASED', 'detail': '"Power is the only way." She vanished into the night.'},
            {'id': '12B-MAES-3', 'imageKey': 'voice', 'title': 'DONATION', 'subtitle': 'ANONYMOUS', 'detail': 'Funding Sarah\'s work. She doesn\'t know it\'s blood money.'}
        ]
        if 'evidenceBoard' not in case_content['012B']['MAES']:
             case_content['012B']['MAES']['evidenceBoard'] = {}
        case_content['012B']['MAES']['evidenceBoard']['polaroids'] = polaroids
        
        data['caseContent'] = case_content
        with open(NARRATIVE_PATH, 'w') as f:
            json.dump(data, f, indent=2)
        print("Successfully updated 012B - MAES.")
    else:
        print("Path 012B - MAES not found.")

if __name__ == "__main__":
    main()