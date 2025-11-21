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
        if 'MAFS' not in case_content['012A']:
            case_content['012A']['MAFS'] = {
                "chapter": 12,
                "subchapter": 1,
                "title": "The Final Warning",
                "bridgeText": "The only way to save the light is to burn the bridge behind you.",
                "narrative": "I called Sarah from the secure line in the penthouse. \"Victoria knows you're the mole. Get out. Now.\"\n\n\"Jack? Where are you?\"\n\n\"I'm gone. But I'm leaving the assets. The empire falls today. You need to be clear of the blast radius.\"\n\nI triggered the datadump from the secure server—burning the Blackwell network to the ground while I slipped away. I sacrificed the power I had secured to ensure Sarah's survival. I was a fugitive again, but this time, I was clean.",
                "evidenceBoard": {
                    "polaroids": [
                        {'id': '12A-MAFS-1', 'imageKey': 'voice', 'title': 'WARNING', 'subtitle': 'ESCAPE', 'detail': 'I told her to run. Saved her from Victoria\'s wrath.'},
                        {'id': '12A-MAFS-2', 'imageKey': 'blackEnvelope', 'title': 'ASSETS', 'subtitle': 'LOST', 'detail': 'Blackwell falls. I go to prison. But Sarah is clean.'},
                        {'id': '12A-MAFS-3', 'imageKey': 'keeper', 'title': 'PRISON', 'subtitle': 'SEVEN YEARS', 'detail': 'The final payment. Sarah visits. \"You saved me.\"'}
                    ]
                }
            }
    
    data['caseContent'] = case_content
    
    with open(NARRATIVE_PATH, 'w') as f:
        json.dump(data, f, indent=2)
    
    print("Successfully added 012A - MAFS.")

if __name__ == "__main__":
    main()