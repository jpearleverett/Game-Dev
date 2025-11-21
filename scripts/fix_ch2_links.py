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
    
    if '002C' in case_content:
        # Fix Path A
        if 'A' in case_content['002C']:
            decision = case_content['002C']['A'].get('decision')
            if decision and 'options' in decision:
                for opt in decision['options']:
                    if opt['key'] == 'A':
                        opt['nextChapter'] = 3
                        opt['nextPathKey'] = 'AA'
                    elif opt['key'] == 'B':
                        opt['nextChapter'] = 3
                        opt['nextPathKey'] = 'AB'
        
        # Fix Path B
        if 'B' in case_content['002C']:
            decision = case_content['002C']['B'].get('decision')
            if decision and 'options' in decision:
                for opt in decision['options']:
                    if opt['key'] == 'A':
                        opt['nextChapter'] = 3
                        opt['nextPathKey'] = 'BA'
                    elif opt['key'] == 'B':
                        opt['nextChapter'] = 3
                        opt['nextPathKey'] = 'BB'

    data['caseContent'] = case_content
    
    with open(NARRATIVE_PATH, 'w') as f:
        json.dump(data, f, indent=2)
    
    print("Successfully fixed Chapter 2 links.")

if __name__ == "__main__":
    main()
