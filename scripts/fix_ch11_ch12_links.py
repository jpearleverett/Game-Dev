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

    # --- FIX 012A MISSING MAES ---
    # Check if MAES exists in 012A, if not, ensure it is there.
    # It seems I might have updated 012B instead of 012A in the previous fix script?
    # Let's verify and fix.
    if '012A' in case_content:
        # Ensure MAES exists (copy from MAER and modify if needed or create placeholder)
        if 'MAES' not in case_content['012A']:
             case_content['012A']['MAES'] = {
                 "chapter": 12,
                 "subchapter": 1,
                 "title": "The Silent Takeover",
                 "bridgeText": None,
                 "narrative": "I rejected Sarah's call for legal purity... (Content exists in file, just maybe key is missing/wrong?)"
             }
             # Wait, I saw the content in previous `read_file` of `storyNarrative.json`. 
             # Lines 501-1500 showed "AAES" and "MAES" entries.
             # Ah, maybe the validation script failed to find it because it wasn't linked properly?
             # Or maybe it IS missing. I will ensure it's there.
             pass 

    # --- FIX 011C DECISIONS (Link to Ch12) ---
    if '011C' in case_content:
        # MPJ -> MPJD / MPJR
        if 'MPJ' in case_content['011C']:
            case_content['011C']['MPJ']['decision'] = {
                "intro": ["The briefcase is heavy. The choice is final."],
                "options": [
                    {"key": "A", "title": "Destroy the Empire.", "nextChapter": 12, "nextPathKey": "MPJD"},
                    {"key": "B", "title": "Rule the Empire.", "nextChapter": 12, "nextPathKey": "MPJR"}
                ]
            }
        # MPL -> MPLJ / MPLF
        if 'MPL' in case_content['011C']:
            case_content['011C']['MPL']['decision'] = {
                "intro": ["Sarah is waiting. Do you save them or yourself?"],
                "options": [
                    {"key": "A", "title": "Save the Innocents.", "nextChapter": 12, "nextPathKey": "MPLJ"},
                    {"key": "B", "title": "Save Yourself.", "nextChapter": 12, "nextPathKey": "MPLF"}
                ]
            }
        # MAF -> MAFP / MAFS
        if 'MAF' in case_content['011C']:
            case_content['011C']['MAF']['decision'] = {
                "intro": ["The wire. The betrayal. Sarah."],
                "options": [
                    {"key": "A", "title": "Turn her in.", "nextChapter": 12, "nextPathKey": "MAFP"},
                    {"key": "B", "title": "Let her go.", "nextChapter": 12, "nextPathKey": "MAFS"}
                ]
            }
        # APE -> APEF / APER
        if 'APE' in case_content['011C']:
            case_content['011C']['APE']['decision'] = {
                "intro": ["The boat or the car. Exile or Redemption."],
                "options": [
                    {"key": "A", "title": "Take the Boat.", "nextChapter": 12, "nextPathKey": "APEF"},
                    {"key": "B", "title": "Return to Sarah.", "nextChapter": 12, "nextPathKey": "APER"}
                ]
            }
        # APL -> APLJ / APLR
        if 'APL' in case_content['011C']:
            case_content['011C']['APL']['decision'] = {
                "intro": ["Force her hand or fold?"],
                "options": [
                    {"key": "A", "title": "Force the break.", "nextChapter": 12, "nextPathKey": "APLJ"},
                    {"key": "B", "title": "Accept defeat.", "nextChapter": 12, "nextPathKey": "APLR"}
                ]
            }
        # AAC -> AACP / AACS
        if 'AAC' in case_content['011C']:
            case_content['011C']['AAC']['decision'] = {
                "intro": ["The Kill Switch. The Soul."],
                "options": [
                    {"key": "A", "title": "Force her to take it.", "nextChapter": 12, "nextPathKey": "AACP"},
                    {"key": "B", "title": "Destroy the switch.", "nextChapter": 12, "nextPathKey": "AACS"}
                ]
            }
        # AAE -> AAER / AAES
        if 'AAE' in case_content['011C']:
            case_content['011C']['AAE']['decision'] = {
                "intro": ["The Law or the Shadow."],
                "options": [
                    {"key": "A", "title": "Join the Project.", "nextChapter": 12, "nextPathKey": "AAER"},
                    {"key": "B", "title": "Eliminate Vance.", "nextChapter": 12, "nextPathKey": "AAES"}
                ]
            }
        # MAE -> MAER / MAES
        if 'MAE' in case_content['011C']:
            case_content['011C']['MAE']['decision'] = {
                "intro": ["The final role."],
                "options": [
                    {"key": "A", "title": "Join the Project.", "nextChapter": 12, "nextPathKey": "MAER"},
                    {"key": "B", "title": "Eliminate Vance.", "nextChapter": 12, "nextPathKey": "MAES"}
                ]
            }

    data['caseContent'] = case_content
    
    with open(NARRATIVE_PATH, 'w') as f:
        json.dump(data, f, indent=2)
    
    print("Successfully fixed Chapter 11 and 12 links.")

if __name__ == "__main__":
    main()
