import json

NARRATIVE_PATH = 'src/data/storyNarrative.json'

def main():
    try:
        with open(NARRATIVE_PATH, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Error: File not found.")
        return

    case_content = data.get('caseContent', {})
    
    if '012A' in case_content:
        if 'MAES' in case_content['012A']:
            entry = case_content['012A']['MAES']
            if 'evidenceBoard' in entry:
                print("012A - MAES has evidenceBoard.")
            else:
                print("012A - MAES exists but MISSING evidenceBoard.")
                # Add it
                entry['evidenceBoard'] = {
                    'polaroids': [
                        {'id': '12A-MAES-1', 'imageKey': 'default', 'title': 'VANCE', 'subtitle': 'ELIMINATED', 'detail': 'Swift. Ruthless. A permanent deletion from the narrative.'},
                        {'id': '12A-MAES-2', 'imageKey': 'harborPrecinct', 'title': 'THE BUNKER', 'subtitle': 'CONTROL', 'detail': 'Shielded by legal chaos. Running the intelligence. The new Overseer.'},
                        {'id': '12A-MAES-3', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'GONE', 'detail': 'She left a vacuum. I filled it. Stability through fear.'}
                    ]
                }
                print("Added evidenceBoard to 012A - MAES.")
        else:
            print("012A - MAES does NOT exist.")
            # Add it
            case_content['012A']['MAES'] = {
                "chapter": 12,
                "subchapter": 1,
                "title": "The Silent Takeover",
                "bridgeText": None,
                "narrative": "I rejected Sarah's call for legal purity... [Restored]",
                "evidenceBoard": {
                    "polaroids": [
                        {'id': '12A-MAES-1', 'imageKey': 'default', 'title': 'VANCE', 'subtitle': 'ELIMINATED', 'detail': 'Swift. Ruthless. A permanent deletion from the narrative.'},
                        {'id': '12A-MAES-2', 'imageKey': 'harborPrecinct', 'title': 'THE BUNKER', 'subtitle': 'CONTROL', 'detail': 'Shielded by legal chaos. Running the intelligence. The new Overseer.'},
                        {'id': '12A-MAES-3', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'GONE', 'detail': 'She left a vacuum. I filled it. Stability through fear.'}
                    ]
                }
            }
            print("Created 012A - MAES.")

    data['caseContent'] = case_content
    with open(NARRATIVE_PATH, 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    main()
