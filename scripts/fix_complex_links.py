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

    # --- MAP 007C to 008A (4-char to 5-char) ---
    if '007C' in case_content:
        # Define the suffixes found in 008A for each 4-char prefix
        mapping = {
            'MLIC': ('C', 'L'), 'MLIT': ('F', 'R'),
            'MLEJ': ('E', 'F'), 'MLEM': ('F', 'S'),
            'MAVD': ('E', 'P'), 'MAVR': ('F', 'P'),
            'MACI': ('L', 'P'), 'MACL': ('F', 'S'),
            'ASRM': ('F', 'S'), 'ASRS': ('P', 'T'),
            'AFVF': ('D', 'L'), 'AFVJ': ('D', 'L'),
            'AFLG': ('C', 'V'), 'AFLM': ('C', 'V'),
            'ASLG': ('C', 'V'), 'ASLM': ('C', 'V'),
            # Fallbacks for missing/unknown
            'AFVF': ('D', 'L'), 'AFVJ': ('D', 'L') 
        }
        
        for key in case_content['007C']:
            if key == 'ROOT': continue
            
            suffixes = mapping.get(key, ('A', 'B')) # Default A/B if unknown
            
            case_content['007C'][key]['decision'] = {
                "intro": ["Day Seven ends. You are alone. How do you respond to the silence?"],
                "options": [
                    {"key": "A", "title": "Option A", "nextChapter": 8, "nextPathKey": key + suffixes[0]},
                    {"key": "B", "title": "Option B", "nextChapter": 8, "nextPathKey": key + suffixes[1]}
                ]
            }

    # --- MAP 010C to 011A (2-char to 3-char) ---
    if '010C' in case_content:
        # Mapping based on Ch11 keys: AAC, AAE, APE, APL, MAE, MAF, MPJ, MPL
        # AA -> AAC / AAE
        if 'AA' in case_content['010C']:
            case_content['010C']['AA']['decision'] = {
                "intro": ["The system is broken. How do you fix it?"],
                "options": [
                    {"key": "A", "title": "Contain the damage (Shadow).", "nextChapter": 11, "nextPathKey": "AAC"},
                    {"key": "B", "title": "Expose everything (Hero).", "nextChapter": 11, "nextPathKey": "AAE"}
                ]
            }
        # AP -> APE / APL
        if 'AP' in case_content['010C']:
            case_content['010C']['AP']['decision'] = {
                "intro": ["You are in a cage. Do you accept it?"],
                "options": [
                    {"key": "A", "title": "Escape (Fugitive).", "nextChapter": 11, "nextPathKey": "APE"},
                    {"key": "B", "title": "Accept Law (Prisoner).", "nextChapter": 11, "nextPathKey": "APL"}
                ]
            }
        # MA -> MAE / MAF
        if 'MA' in case_content['010C']:
            case_content['010C']['MA']['decision'] = {
                "intro": ["Victoria is gone. The empire remains."],
                "options": [
                    {"key": "A", "title": "Expose the Empire.", "nextChapter": 11, "nextPathKey": "MAE"},
                    {"key": "B", "title": "Flee and Rule.", "nextChapter": 11, "nextPathKey": "MAF"}
                ]
            }
        # MP -> MPJ / MPL
        if 'MP' in case_content['010C']:
            case_content['010C']['MP']['decision'] = {
                "intro": ["The final sacrifice. Justice or Law?"],
                "options": [
                    {"key": "A", "title": "Justice (Leak).", "nextChapter": 11, "nextPathKey": "MPJ"},
                    {"key": "B", "title": "Law (Appeal).", "nextChapter": 11, "nextPathKey": "MPL"}
                ]
            }

    data['caseContent'] = case_content
    
    with open(NARRATIVE_PATH, 'w') as f:
        json.dump(data, f, indent=2)
    
    print("Successfully fixed Chapter 7 and 10 links.")

if __name__ == "__main__":
    main()
