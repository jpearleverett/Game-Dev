import json
import os

NARRATIVE_PATH = 'src/data/storyNarrative.json'

def generate_day8_polaroids(suffix, case_num):
    # Suffix is 5 chars, e.g. AFLGC
    # Char 1-3: Day 2-6 history
    # Char 4: Day 7 choice (G=Grange, M=Margaret, etc.)
    # Char 5: Day 8/Recent context?
    
    last_char = suffix[-1]
    
    # 008A: Arrested
    if case_num == '008A':
        p1 = {'id': f'08A-{suffix}-1', 'imageKey': 'harborPrecinct', 'title': 'FBI RAID', 'subtitle': '6 AM', 'detail': 'They came for me. Expected.'}
        p2 = {'id': f'08A-{suffix}-2', 'imageKey': 'keeper', 'title': 'CELLMATE', 'subtitle': 'NATHAN', 'detail': "Marcus Thornhill's nephew. \"You framed him.\""}
        p3 = {'id': f'08A-{suffix}-3', 'imageKey': 'blackEnvelope', 'title': 'NOTE', 'subtitle': 'VICTORIA', 'detail': '"Fight for it." She gave me the tools.'}
        
        if last_char in ['C', 'L', 'E', 'M']: # Lawful/Empathetic leanings
            p3['detail'] = '"Use the law against them." A lesson in procedure.'
        elif last_char in ['V', 'R', 'F', 'D', 'P', 'S']: # Aggressive/Power leanings
            p3['detail'] = '"Break the cage." A lesson in leverage.'
            
        return [p1, p2, p3]

    # 008B: Released
    if case_num == '008B':
        p1 = {'id': f'08B-{suffix}-1', 'imageKey': 'blackEnvelope', 'title': 'ORDER', 'subtitle': 'RELEASE', 'detail': 'Charges dropped. 36 hours later.'}
        p2 = {'id': f'08B-{suffix}-2', 'imageKey': 'silence', 'title': 'EMILY', 'subtitle': 'LESSON', 'detail': "The difference between victims who can fight and those who can't."}
        p3 = {'id': f'08B-{suffix}-3', 'imageKey': 'default', 'title': 'CLOCK', 'subtitle': 'TICKING', 'detail': 'Four days left. The game is closing.'}
        
        if last_char in ['C', 'L', 'E']:
            p1['detail'] = 'Evidence "misplaced." A clerical miracle.'
        elif last_char in ['V', 'R', 'F', 'D']:
            p1['detail'] = 'Witnesses recanted. Fear is effective.'
            
        return [p1, p2, p3]

    # 008C: The Choice Ahead
    if case_num == '008C':
        p1 = {'id': f'08C-{suffix}-1', 'imageKey': 'harborPrecinct', 'title': 'CROSSROADS', 'subtitle': 'TWO PATHS', 'detail': 'Join her or refuse her?'}
        p2 = {'id': f'08C-{suffix}-2', 'imageKey': 'blackEnvelope', 'title': 'FILES', 'subtitle': 'PENDING', 'detail': 'Five innocents waiting. My choice seals their fate.'}
        p3 = {'id': f'08C-{suffix}-3', 'imageKey': 'silence', 'title': 'GALLERY', 'subtitle': 'INVITE', 'detail': '"A Retrospective." She wants me to see the end.'}
        
        if last_char in ['C', 'L', 'E', 'M']:
            p1['subtitle'] = 'RESISTANCE'
            p1['detail'] = 'Refuse the power. Keep my soul.'
        elif last_char in ['V', 'R', 'F', 'D', 'P', 'S']:
            p1['subtitle'] = 'ALLIANCE'
            p1['detail'] = 'Take the power. Save the city.'
            
        return [p1, p2, p3]

    return []

def get_polaroid_data(case_id, path_key):
    if case_id.startswith('008'):
        return generate_day8_polaroids(path_key, case_id)
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
    target_cases = ['008A', '008B', '008C']
    updated_count = 0
    
    for case_id in target_cases:
        if case_id in case_content:
            for path_key in case_content[case_id]:
                polaroids = get_polaroid_data(case_id, path_key)
                if polaroids:
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
