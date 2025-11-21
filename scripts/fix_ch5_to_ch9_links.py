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

    # --- 1. FIX 005C (MA) ---
    if '005C' in case_content and 'MA' in case_content['005C']:
        decision = case_content['005C']['MA'].get('decision')
        if decision and 'options' in decision:
            for opt in decision['options']:
                if opt['key'] == 'A': # Vigilante
                    opt['nextChapter'] = 6
                    opt['nextPathKey'] = 'MAV'
                elif opt['key'] == 'B': # Cooperative
                    opt['nextChapter'] = 6
                    opt['nextPathKey'] = 'MAC'

    # --- 2. FIX 006C (Missing Decisions) ---
    if '006C' in case_content:
        # ASL -> ASLM / ASLG
        if 'ASL' in case_content['006C']:
            case_content['006C']['ASL']['decision'] = {
                "intro": ["The emotional cost of the case is high. Who do you turn to?"],
                "options": [
                    {"key": "A", "title": "Call Margaret.", "nextChapter": 7, "nextPathKey": "ASLM"},
                    {"key": "B", "title": "Focus on the Grange Ledger.", "nextChapter": 7, "nextPathKey": "ASLG"}
                ]
            }
        # ASR -> ASRM / ASRS
        if 'ASR' in case_content['006C']:
            case_content['006C']['ASR']['decision'] = {
                "intro": ["You are a fugitive. You need resources."],
                "options": [
                    {"key": "A", "title": "Ask Margaret for help.", "nextChapter": 7, "nextPathKey": "ASRM"},
                    {"key": "B", "title": "Steal what you need.", "nextChapter": 7, "nextPathKey": "ASRS"} # Assuming S=Steal/Spite
                ]
            }
        # AFL -> AFLM / AFLG
        if 'AFL' in case_content['006C']:
            case_content['006C']['AFL']['decision'] = {
                "intro": ["Back in the trap. Connection or Case?"],
                "options": [
                    {"key": "A", "title": "Call Margaret.", "nextChapter": 7, "nextPathKey": "AFLM"},
                    {"key": "B", "title": "Focus on the Ledger.", "nextChapter": 7, "nextPathKey": "AFLG"}
                ]
            }
        # AFV -> AFVF / AFVJ
        if 'AFV' in case_content['006C']:
            case_content['006C']['AFV']['decision'] = {
                "intro": ["Grange has a gun. You have the journal."],
                "options": [
                    {"key": "A", "title": "Fight him.", "nextChapter": 7, "nextPathKey": "AFVF"},
                    {"key": "B", "title": "Use the Journal as leverage.", "nextChapter": 7, "nextPathKey": "AFVJ"}
                ]
            }
        # Also need to fix MAC, MAV, MLE, MLI if they are missing decisions in 006C
        # MAV -> MAVD (Dark) / MAVR (Rebellion)
        if 'MAV' in case_content['006C']:
             case_content['006C']['MAV']['decision'] = {
                "intro": ["Silas is the loose end. Victoria demands a clean sweep."],
                "options": [
                    {"key": "A", "title": "Give him the vial.", "nextChapter": 7, "nextPathKey": "MAVD"},
                    {"key": "B", "title": "Refuse to kill him.", "nextChapter": 7, "nextPathKey": "MAVR"}
                ]
            }
        # MAC -> MACI (Intercept) / MACL (Legal)
        if 'MAC' in case_content['006C']:
             case_content['006C']['MAC']['decision'] = {
                "intro": ["Victoria's team is here. Do you act or call it in?"],
                "options": [
                    {"key": "A", "title": "Intercept them.", "nextChapter": 7, "nextPathKey": "MACI"},
                    {"key": "B", "title": "Call the FBI.", "nextChapter": 7, "nextPathKey": "MACL"}
                ]
            }
        # MLE -> MLEJ (Justice?) / MLEM (Mercy?) - Checking audit for 007A targets
        # Audit: MLEJ, MLEM.
        if 'MLE' in case_content['006C']:
             case_content['006C']['MLE']['decision'] = {
                "intro": ["Teresa is free. But the system is still broken."],
                "options": [
                    {"key": "A", "title": "Pursue full Justice.", "nextChapter": 7, "nextPathKey": "MLEJ"},
                    {"key": "B", "title": "Show Mercy to the clerks.", "nextChapter": 7, "nextPathKey": "MLEM"}
                ]
            }
        # MLI -> MLIC (Clean?) / MLIT (Trap?)
        # Audit: MLIC, MLIT.
        if 'MLI' in case_content['006C']:
             case_content['006C']['MLI']['decision'] = {
                "intro": ["The evidence is secure. How do you use it?"],
                "options": [
                    {"key": "A", "title": "Keep it Clean.", "nextChapter": 7, "nextPathKey": "MLIC"},
                    {"key": "B", "title": "Set a Trap.", "nextChapter": 7, "nextPathKey": "MLIT"}
                ]
            }

    # --- 3. FIX 007C (Missing Decisions for all 16 paths) ---
    if '007C' in case_content:
        # Iterate all potential 4-letter keys
        for key in case_content['007C']:
            if key == 'ROOT': continue
            # We need to map to 5-letter keys in 008A (e.g., key + 'C' or 'V')
            # Generic decision injection
            case_content['007C'][key]['decision'] = {
                "intro": ["Day Seven ends. You are alone. How do you respond to the silence?"],
                "options": [
                    {"key": "A", "title": "Focus on the Work (Clean).", "nextChapter": 8, "nextPathKey": key + "C"},
                    {"key": "B", "title": "Reach out to Victoria.", "nextChapter": 8, "nextPathKey": key + "V"}
                ]
            }

    # --- 4. FIX 008C (Convergence to Ch9) ---
    if '008C' in case_content:
        for key in case_content['008C']:
            if key == 'ROOT': continue
            # Determine Super-Path based on last char or general vibe
            # Simplification: Choice A -> Methodical, Choice B -> Aggressive?
            # Narrative says: A="Refuse/Resist", B="Join/Alliance"
            
            case_content['008C'][key]['decision'] = {
                "intro": ["The offer is on the table. Join the shadow or stand in the light?"],
                "options": [
                    {
                        "key": "A", 
                        "title": "Refuse Victoria. Trust the Law.", 
                        "nextChapter": 9, 
                        "nextPathKey": "METHODICAL"
                    },
                    {
                        "key": "B", 
                        "title": "Join Her. Embrace the Power.", 
                        "nextChapter": 9, 
                        "nextPathKey": "AGGRESSIVE"
                    }
                ]
            }

    # --- 5. FIX 009C (Ch10 Convergence) ---
    if '009C' in case_content:
        # METHODICAL -> MA / MP
        if 'METHODICAL' in case_content['009C']:
            case_content['009C']['METHODICAL']['decision'] = {
                "intro": ["The contract or the cell. Your final choice."],
                "options": [
                    {"key": "A", "title": "Refuse. Accept Prison.", "nextChapter": 10, "nextPathKey": "MP"},
                    {"key": "B", "title": "Accept. Join Her.", "nextChapter": 10, "nextPathKey": "MA"}
                ]
            }
        # AGGRESSIVE -> AA / AP
        if 'AGGRESSIVE' in case_content['009C']:
            case_content['009C']['AGGRESSIVE']['decision'] = {
                "intro": ["The throne or the cage. Prove you are worthy."],
                "options": [
                    {"key": "A", "title": "Refuse. Accept Prison.", "nextChapter": 10, "nextPathKey": "AP"},
                    {"key": "B", "title": "Accept. Join Her.", "nextChapter": 10, "nextPathKey": "AA"}
                ]
            }

    data['caseContent'] = case_content
    
    with open(NARRATIVE_PATH, 'w') as f:
        json.dump(data, f, indent=2)
    
    print("Successfully fixed Chapter 5, 6, 7, 8, and 9 links.")

if __name__ == "__main__":
    main()
