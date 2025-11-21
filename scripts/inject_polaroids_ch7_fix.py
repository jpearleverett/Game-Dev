import json
import os

NARRATIVE_PATH = 'src/data/storyNarrative.json'

def generate_day7_polaroids(suffix, case_num):
    prefix = case_num[:3] 
    
    if case_num == '007A':
        p1 = {'id': f'07A-{suffix}-1', 'imageKey': 'default', 'title': 'COURT', 'subtitle': 'SESSION', 'detail': 'Truth vs Procedure.'}
        p2 = {'id': f'07A-{suffix}-2', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'READY', 'detail': 'She has the files.'}
        p3 = {'id': f'07A-{suffix}-3', 'imageKey': 'blackEnvelope', 'title': 'VERDICT', 'subtitle': 'WAITING', 'detail': 'The jury is out.'}

        if suffix.endswith('G'):
            p1 = {'id': f'07A-{suffix}-1', 'imageKey': 'blackEnvelope', 'title': 'GRANGE LINK', 'subtitle': 'SHELL CORP', 'detail': 'Tracing the money.'}
            p2 = {'id': f'07A-{suffix}-2', 'imageKey': 'harborPrecinct', 'title': 'COURTROOM', 'subtitle': 'EVIDENCE', 'detail': 'Presenting the ledger.'}
            p3 = {'id': f'07A-{suffix}-3', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'WATCHING', 'detail': 'She sees the system breaking.'}
        elif suffix.endswith('M'):
            p1 = {'id': f'07A-{suffix}-1', 'imageKey': 'sparkle', 'title': 'MARGARET', 'subtitle': 'SAFE', 'detail': 'She is watching the news.'}
            p2 = {'id': f'07A-{suffix}-2', 'imageKey': 'default', 'title': 'EMMA', 'subtitle': 'DRAWING', 'detail': 'A stick figure of Dad.'}
            p3 = {'id': f'07A-{suffix}-3', 'imageKey': 'harborPrecinct', 'title': 'COURTROOM', 'subtitle': 'SILENCE', 'detail': 'The verdict is coming.'}
        elif suffix.endswith('F'):
            p1 = {'id': f'07A-{suffix}-1', 'imageKey': 'keeper', 'title': 'GRANGE', 'subtitle': 'BRUISED', 'detail': 'He looks small in cuffs.'}
            p2 = {'id': f'07A-{suffix}-2', 'imageKey': 'default', 'title': 'MY HANDS', 'subtitle': 'SHAKING', 'detail': 'Adrenaline crash.'}
            p3 = {'id': f'07A-{suffix}-3', 'imageKey': 'voice', 'title': 'SARAH', 'subtitle': 'WORRIED', 'detail': 'You went too far.'}
        elif suffix.endswith('J'):
            p1 = {'id': f'07A-{suffix}-1', 'imageKey': 'blackEnvelope', 'title': 'JOURNAL', 'subtitle': 'EXHIBIT A', 'detail': 'Emily\'s words read aloud.'}
            p2 = {'id': f'07A-{suffix}-2', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'ABSENT', 'detail': 'She let me take the stage.'}
            p3 = {'id': f'07A-{suffix}-3', 'imageKey': 'default', 'title': 'GAVEL', 'subtitle': 'DOWN', 'detail': 'Judgment delivered.'}
            
        return [p1, p2, p3]

    if case_num == '007B':
        p1 = {'id': f'07B-{suffix}-1', 'imageKey': 'voice', 'title': 'BOXES', 'subtitle': 'PACKING', 'detail': 'Sarah clearing her desk.'}
        p2 = {'id': f'07B-{suffix}-2', 'imageKey': 'lex', 'title': 'INTEGRITY', 'subtitle': 'PROJECT', 'detail': 'Her new mission.'}
        p3 = {'id': f'07B-{suffix}-3', 'imageKey': 'default', 'title': 'BADGE', 'subtitle': 'LEFT BEHIND', 'detail': 'She left it on the desk.'}

        if suffix.endswith('G'):
            p3 = {'id': f'07B-{suffix}-3', 'imageKey': 'keeper', 'title': 'GRANGE', 'subtitle': 'GONE', 'detail': 'We got the bad guy, Jack.'}
        elif suffix.endswith('M'):
            p3 = {'id': f'07B-{suffix}-3', 'imageKey': 'sparkle', 'title': 'MARGARET', 'subtitle': 'PROUD', 'detail': 'She called me. Said you saved them.'}
            
        return [p1, p2, p3]

    if case_num == '007C':
        p1 = {'id': f'07C-{suffix}-1', 'imageKey': 'default', 'title': 'EMPTY CHAIR', 'subtitle': 'SILENCE', 'detail': 'No partner. No backup.'}
        p2 = {'id': f'07C-{suffix}-2', 'imageKey': 'blackEnvelope', 'title': 'TEXT', 'subtitle': 'VICTORIA', 'detail': 'You are alone now. Good.'}
        p3 = {'id': f'07C-{suffix}-3', 'imageKey': 'harborPrecinct', 'title': 'RAIN', 'subtitle': 'WINDOW', 'detail': 'Watching the city I tried to save.'}

        if 'V' in suffix:
            p3 = {'id': f'07C-{suffix}-3', 'imageKey': 'default', 'title': 'WHISKEY', 'subtitle': 'POURED', 'detail': 'Drinking to forget the violence.'}
            
        return [p1, p2, p3]

    return []

def get_polaroid_data(case_id, path_key):
    if case_id.startswith('007'):
        return generate_day7_polaroids(path_key, case_id)
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
    target_cases = ['007A', '007B', '007C']
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
