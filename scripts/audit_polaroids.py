import json

NARRATIVE_PATH = 'src/data/storyNarrative.json'

def audit_polaroids():
    try:
        with open(NARRATIVE_PATH, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Error: File not found.")
        return

    case_content = data.get('caseContent', {})
    
    missing_count = 0
    total_count = 0
    
    # We know cases range from 001A to 012C (roughly)
    # Let's just iterate through whatever is in the file.
    
    for case_id in sorted(case_content.keys()):
        print(f"Checking Case {case_id}...")
        for path_key in case_content[case_id]:
            if path_key == 'ROOT': continue # Skip ROOT if it's just a container, though usually it's a path too. 
            
            total_count += 1
            entry = case_content[case_id][path_key]
            
            if 'evidenceBoard' not in entry:
                print(f"  [MISSING] {path_key}")
                missing_count += 1
            else:
                # Optional: check if it has polaroids list
                if 'polaroids' not in entry['evidenceBoard'] or not entry['evidenceBoard']['polaroids']:
                     print(f"  [EMPTY] {path_key}")
                     missing_count += 1
                else:
                     # print(f"  [OK] {path_key}")
                     pass

    print(f"\nTotal Paths Checked: {total_count}")
    print(f"Missing Evidence Boards: {missing_count}")

if __name__ == "__main__":
    audit_polaroids()
