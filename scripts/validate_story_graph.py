import json
import sys

NARRATIVE_PATH = 'src/data/storyNarrative.json'

def format_case_number(chapter, subchapter):
    letters = ['A', 'B', 'C']
    letter = letters[subchapter - 1]
    return f"{str(chapter).padStart(3, '0')}{letter}"

def normalize_path_key(key):
    if not key: return 'ROOT'
    return key

def main():
    try:
        with open(NARRATIVE_PATH, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: {NARRATIVE_PATH} not found.")
        return

    case_content = data.get('caseContent', {})
    
    # Queue: (chapter, path_key)
    queue = [(1, 'ROOT')]
    visited = set()
    
    missing_entries = []
    broken_links = []
    
    print("Starting Story Graph Validation...\n")
    
    while queue:
        chapter, path_key = queue.pop(0)
        state_id = f"Ch{chapter}-{path_key}"
        
        if state_id in visited:
            continue
        visited.add(state_id)
        
        # Check all 3 subchapters for this chapter/path
        # Note: storyNarrative structure is caseContent[caseNumber][pathKey]
        
        # Subchapter 1 (A)
        case_a = f"{str(chapter).zfill(3)}A"
        if case_a not in case_content:
            # Only report if the case number itself is missing (rare)
            # missing_entries.append(f"Case {case_a} missing entirely from file")
            pass 
        
        # Check if path exists in A
        if case_a in case_content and path_key in case_content[case_a]:
            pass
        elif case_a in case_content and 'ROOT' in case_content[case_a]:
             # Fallback to ROOT is allowed if explicit path missing? 
             # Usually chapter 1 is ROOT, subsequent are specific.
             # If we are in Ch2 Path A, we expect 002A -> A.
             # If 002A has only ROOT, that might be a bug or design choice.
             # Let's assume explicit path required for branching chapters.
             if chapter > 1:
                 missing_entries.append(f"{case_a} missing path '{path_key}'")
        else:
             missing_entries.append(f"{case_a} missing path '{path_key}'")

        # Subchapter 2 (B)
        case_b = f"{str(chapter).zfill(3)}B"
        if case_b in case_content and path_key in case_content[case_b]:
            pass
        elif chapter > 1:
             missing_entries.append(f"{case_b} missing path '{path_key}'")

        # Subchapter 3 (C) - The Decision Point
        case_c = f"{str(chapter).zfill(3)}C"
        entry_c = None
        
        if case_c in case_content and path_key in case_content[case_c]:
            entry_c = case_content[case_c][path_key]
        elif chapter > 1:
             missing_entries.append(f"{case_c} missing path '{path_key}'")
        
        # If we found entry C, check decisions to find next nodes
        if entry_c:
            decision = entry_c.get('decision')
            if decision and 'options' in decision:
                for opt in decision['options']:
                    next_chapter = opt.get('nextChapter')
                    next_path = opt.get('nextPathKey')
                    
                    if next_chapter and next_path:
                        # Validate that next step exists?
                        # Actually just add to queue to validate later
                        # print(f"  -> Link found: Ch{next_chapter} Path {next_path}")
                        queue.append((next_chapter, next_path))
                    elif chapter < 12: # Chapter 12 might not have next chapters
                        broken_links.append(f"{case_c} ({path_key}) option '{opt.get('key')}' missing nextChapter/nextPathKey")
            elif chapter < 12:
                 # Chapter 12 ends the game, so no decision expected?
                 # Or maybe there are endings.
                 # If < 12, we expect a decision.
                 broken_links.append(f"{case_c} ({path_key}) missing decision block")

    print("-" * 40)
    if missing_entries:
        print(f"MISSING CONTENT ({len(missing_entries)}):")
        for m in missing_entries:
            print(f"  - {m}")
    else:
        print("No missing content entries found for reachable paths.")

    print("-" * 40)
    if broken_links:
        print(f"BROKEN LINKS ({len(broken_links)}):")
        for l in broken_links:
            print(f"  - {l}")
    else:
        print("All decision links appear valid.")
        
    print("-" * 40)
    print(f"Total unique chapter-paths validated: {len(visited)}")

if __name__ == "__main__":
    main()
