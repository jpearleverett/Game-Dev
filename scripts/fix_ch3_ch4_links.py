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
    
    # --- FIX CHAPTER 3 (003C) LINKS ---
    if '003C' in case_content:
        for path_key in ['AA', 'AB', 'BA', 'BB']:
            if path_key in case_content['003C']:
                decision = case_content['003C'][path_key].get('decision')
                if decision and 'options' in decision:
                    for opt in decision['options']:
                        # Logic: If Option A (Methodical/Public), go Methodical
                        # If Option B (Aggressive/Shadow), go Aggressive
                        if opt['key'] == 'A':
                            opt['nextChapter'] = 4
                            opt['nextPathKey'] = 'METHODICAL'
                        elif opt['key'] == 'B':
                            opt['nextChapter'] = 4
                            opt['nextPathKey'] = 'AGGRESSIVE'

    # --- FIX CHAPTER 4 (004C) DECISIONS ---
    if '004C' in case_content:
        # Fix METHODICAL path
        if 'METHODICAL' in case_content['004C']:
            case_content['004C']['METHODICAL']['decision'] = {
                "intro": ["The final move of the day defines the next. Do you trust the system or yourself?"],
                "options": [
                    {
                        "key": "A",
                        "title": "Call Agent Martinez. Do it clean.",
                        "focus": "Lawful. Procedural. Safe.",
                        "stats": "+Lawful, +SarahTrust",
                        "nextChapter": 5,
                        "nextPathKey": "ML",
                        "consequence": "Jack remains a witness, not a suspect."
                    },
                    {
                        "key": "B",
                        "title": "We take him down ourselves.",
                        "focus": "Action. Vigilante. Risky.",
                        "stats": "+Action, -Lawful",
                        "nextChapter": 5,
                        "nextPathKey": "MA",
                        "consequence": "Jack secures the arrest but alienates the FBI."
                    }
                ]
            }

        # Fix AGGRESSIVE path
        if 'AGGRESSIVE' in case_content['004C']:
            case_content['004C']['AGGRESSIVE']['decision'] = {
                "intro": ["You have the monster. Now, do you have the discipline to survive him?"],
                "options": [
                    {
                        "key": "A",
                        "title": "Leave him for the FBI. Surrender.",
                        "focus": "Pragmatic. Survival. Compromise.",
                        "stats": "+Lawful, +SarahTrust",
                        "nextChapter": 5,
                        "nextPathKey": "AS",
                        "consequence": "Jack faces charges but stays in the game."
                    },
                    {
                        "key": "B",
                        "title": "Take him. We finish this off the grid.",
                        "focus": "Reckless. Fugitive. Final.",
                        "stats": "+Reckless, -Lawful",
                        "nextChapter": 5,
                        "nextPathKey": "AF",
                        "consequence": "Jack becomes a wanted man."
                    }
                ]
            }

    data['caseContent'] = case_content
    
    with open(NARRATIVE_PATH, 'w') as f:
        json.dump(data, f, indent=2)
    
    print("Successfully fixed Chapter 3 and 4 links.")

if __name__ == "__main__":
    main()
