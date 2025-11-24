
import re
import sys

FILE_PATH = 'src/data/cases.js'

def audit_cases():
    with open(FILE_PATH, 'r') as f:
        content = f.read()

    # Regex to capture case objects
    # We look for caseNumber and then scan for fields
    
    # List of expected cases
    seasons = range(1, 2) # Season 1
    days = range(1, 13)
    letters = ['A', 'B', 'C']
    
    expected_cases = []
    for d in days:
        for l in letters:
            expected_cases.append(f"{d:03d}{l}")
            
    print(f"Auditing {len(expected_cases)} cases in {FILE_PATH}...")
    
    errors = 0
    
    for case_num in expected_cases:
        # Find case block
        case_pattern = re.compile(r"caseNumber:\s*'" + case_num + r"'")
        match = case_pattern.search(content)
        
        if not match:
            print(f"[MISSING] Case {case_num} not found in file.")
            errors += 1
            continue
            
        # Search forward for briefing and narrative
        # This is a simple scan, might be fragile if order varies, but cases.js structure is consistent
        start_idx = match.end()
        chunk = content[start_idx:start_idx+5000] # Look ahead 5000 chars
        
        # Check Briefing Summary
        briefing_match = re.search(r"briefing:\s*\{[^}]*summary:\s*'([^']*)'", chunk, re.DOTALL)
        if briefing_match:
            summary = briefing_match.group(1)
            if len(summary) < 20 or "Find the words" in summary or "Solve the puzzle" in summary:
                 # Heuristic for generic
                 if "Find the words" in summary and "claims" not in summary: # Allow "Find the words that prove X"
                     print(f"[WEAK BRIEFING] {case_num}: {summary}")
                     # errors += 1 # Don't fail strictly, just warn
        else:
            # Might be double quotes or template literal
            briefing_match_dq = re.search(r'briefing:\s*\{[^}]*summary:\s*"([^"]*)"', chunk, re.DOTALL)
            if briefing_match_dq:
                summary = briefing_match_dq.group(1)
            else:
                print(f"[MISSING BRIEFING] {case_num} summary not found.")
                errors += 1
        
        # Check Narrative Callback
        # Look for narrative: [ ` ...
        narrative_match = re.search(r"narrative:\s*\[\s*`([^`]*)`", chunk, re.DOTALL)
        if narrative_match:
            narrative_text = narrative_match.group(1)
            if "{puzzle_callback}" not in narrative_text:
                # Check if it was added as a template var in a different way?
                # The user asked for {puzzle_callback} specifically.
                print(f"[MISSING CALLBACK] {case_num} narrative does not contain {{puzzle_callback}}.")
                print(f"   Start: {narrative_text[:50]}...")
                errors += 1
        else:
             print(f"[MISSING NARRATIVE] {case_num} narrative array not found.")
             errors += 1

    if errors == 0:
        print("SUCCESS: All cases passed audit.")
    else:
        print(f"FAILURE: {errors} errors found.")

if __name__ == "__main__":
    audit_cases()
