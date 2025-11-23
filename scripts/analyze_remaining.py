import json
from pathlib import Path

ROOT = Path('/workspace')
NARRATIVE_PATH = ROOT / "src" / "data" / "storyNarrative.json"

def check_remaining_chapters():
    if not NARRATIVE_PATH.exists():
        print("storyNarrative.json not found")
        return

    with open(NARRATIVE_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    case_content = data.get('caseContent', {})
    
    # Target Chapters
    targets = ["006", "007", "008", "009", "010", "011", "012"]
    
    print("--- Analysis of Remaining Chapters ---")
    for case_id in sorted(case_content.keys()):
        if any(case_id.startswith(t) for t in targets):
            paths = case_content[case_id]
            # Just check the first path for brevity in analysis
            first_path = next(iter(paths))
            entry = paths[first_path]
            
            board = entry.get('board', {})
            outliers = board.get('outlierWords', [])
            theme = board.get('outlierTheme', {}).get('name', 'UNKNOWN')
            briefing = entry.get('bridgeText', "")[:60].replace('\n', ' ')
            
            print(f"Case {case_id}: Theme='{theme}' Words={outliers}")
            print(f"  Briefing: {briefing}...")

if __name__ == "__main__":
    check_remaining_chapters()
