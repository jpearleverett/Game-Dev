import json
import os

NARRATIVE_PATH = 'src/data/storyNarrative.json'

def get_polaroid_data(case_id, path_key):
    # --- CHAPTER 9: THE EXHIBITION ---
    
    # 009A: The Retrospective
    if case_id == '009A':
        if path_key == 'AGGRESSIVE':
            return [
                {'id': '09A-AG-1', 'imageKey': 'harborPrecinct', 'title': 'THE GALLERY', 'subtitle': 'TRIUMPH', 'detail': 'My failures displayed as trophies. I earned the right to be here.'},
                {'id': '09A-AG-2', 'imageKey': 'sparkle', 'title': 'MRS. MARTINEZ', 'subtitle': 'RESPECT', 'detail': '"You broke the law to find the truth." She understands necessity.'},
                {'id': '09A-AG-3', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'ALLY', 'detail': '"You proved you\'re a necessary monster." We are the same.'}
            ]
        if path_key == 'METHODICAL':
            return [
                {'id': '09A-ME-1', 'imageKey': 'harborPrecinct', 'title': 'THE GALLERY', 'subtitle': 'ACCUSATION', 'detail': 'My failures cataloged. The cost of my "clean" hands.'},
                {'id': '09A-ME-2', 'imageKey': 'sparkle', 'title': 'MRS. MARTINEZ', 'subtitle': 'GRIEF', 'detail': '"Victoria told me you value your clearance rate more than truth." '},
                {'id': '09A-ME-3', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'DISAPPOINTMENT', 'detail': '"Admirable... but weak." She despises my procedural safety.'}
            ]

    # 009B: The Offer
    if case_id == '009B':
        if path_key == 'AGGRESSIVE':
            return [
                {'id': '09B-AG-1', 'imageKey': 'blackEnvelope', 'title': 'THE RECORDER', 'subtitle': 'EVIDENCE', 'detail': 'Emily screaming. I use the pain to fuel the power.'},
                {'id': '09B-AG-2', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'PARTNER', 'detail': '"We will rule the ashes." Offering me the Deputy Director role.'},
                {'id': '09B-AG-3', 'imageKey': 'default', 'title': 'CONTRACT', 'subtitle': 'POWER', 'detail': 'Control the city or rot in prison. The choice is easy.'}
            ]
        if path_key == 'METHODICAL':
            return [
                {'id': '09B-ME-1', 'imageKey': 'blackEnvelope', 'title': 'THE RECORDER', 'subtitle': 'GUILT', 'detail': 'The sound of hope dying. I cost her everything.'},
                {'id': '09B-ME-2', 'imageKey': 'silence', 'title': 'VICTORIA', 'subtitle': 'TEMPTATION', 'detail': '"Rebuild Ashport ruthlessly, but with integrity." A cage with a view.'},
                {'id': '09B-ME-3', 'imageKey': 'default', 'title': 'CONTRACT', 'subtitle': 'TRAP', 'detail': 'Join the shadow government or face the FBI. My future hangs on a signature.'}
            ]

    # 009C: The Final Choice
    if case_id == '009C':
        if path_key == 'AGGRESSIVE':
            return [
                {'id': '09C-AG-1', 'imageKey': 'silence', 'title': 'EMILY CROSS', 'subtitle': 'ARCHITECT', 'detail': '"Prove you\'re worthy of the throne."'},
                {'id': '09C-AG-2', 'imageKey': 'harborPrecinct', 'title': 'PRISON', 'subtitle': 'REJECTED', 'detail': 'I refuse to rot. I choose the power.'},
                {'id': '09C-AG-3', 'imageKey': 'blackEnvelope', 'title': 'THE EMPIRE', 'subtitle': 'ACCEPTED', 'detail': 'I sign the contract. I am the new enforcer.'}
            ]
        if path_key == 'METHODICAL':
            return [
                {'id': '09C-ME-1', 'imageKey': 'silence', 'title': 'EMILY CROSS', 'subtitle': 'VULNERABLE', 'detail': '"You built this cage for yourself." I see the scared girl inside.'},
                {'id': '09C-ME-2', 'imageKey': 'harborPrecinct', 'title': 'PRISON', 'subtitle': 'ACCEPTED', 'detail': 'I choose the cell. My redemption is in the consequence.'},
                {'id': '09C-ME-3', 'imageKey': 'blackEnvelope', 'title': 'THE EMPIRE', 'subtitle': 'REJECTED', 'detail': 'I walk away from the power. I choose my soul.'}
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
    target_cases = ['009A', '009B', '009C']
    updated_count = 0
    
    for case_id in target_cases:
        if case_id in case_content:
            for path_key in case_content[case_id]:
                polaroids = get_polaroid_data(case_id, path_key)
                if polaroids:
                    print(f"Injecting polaroids for {case_id} - {path_key}")
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
