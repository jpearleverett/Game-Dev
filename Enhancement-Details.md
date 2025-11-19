# Dead Cells - Enhancement Specification

## Core Change
Add player agency through branching narrative choices tied to puzzle mechanics.

## New Chapter Structure

### Subchapters 1 & 2 (Linear)
- 16-word grid, find 4 outliers, 4 attempts
- Standard single-path narrative

### Subchapter 3 (Decision Point)
- 20-word grid, find 8 outliers (two sets of 4), 5-6 attempts
- Player identifies both sets, then chooses which lead to follow
- Chapter ends on choice cliffhanger

## Branching Flow

**Chapter N, Subchapter 3:** Player chooses Path A or Path B
 
**Chapter N+1, Subchapter 1:**
- Opens with unique 500-word intro based on choice (Path A version vs Path B version)
- Converges to same plot point by end of subchapter
- Rest of Subchapter 1 is shared content

**Chapter N+1, Subchapters 2 & 3:**
- Single narrative path (everyone experiences same content)
- New choice presented at end of Subchapter 3

**Result:** Each choice creates ~500 words of unique content, then merges. No exponential branching.

## Convergence Techniques

- **Different means, same information:** Path A discovers through investigation, Path B receives from Victoria
- **Same event, different perspective:** Both paths end up at same location/meeting
- **Parallel setbacks:** Both paths hit dead ends that force same conclusion

## Writing Scope

**Per Chapter:**
- Subchapter 1: 500 words (Path A) + 500 words (Path B) + 1000 words (converged) = 2000 words
- Subchapter 2: 1500 words (single path)
- Subchapter 3: 1500 words (single path + choice setup)
- **Total: ~5000 words per chapter**

**Full Game:**
- 12 chapters × 5000 words = ~60,000 words total
- Manageable for solo dev (novella length)

**Exception:**
- Chapter 12 final choice does NOT converge
- Provides 2-3 true endings based on player's final decision

## Player Experience
### Daily Players
1. Open app → see consequence of yesterday's choice (unique 500-word intro)
2. Experience convergence and shared narrative
3. Play Subchapter 1 puzzle (standard)
4. Play Subchapter 2 puzzle (standard)
5. Play Subchapter 3 puzzle (8 outliers, two sets)
6. Choose which investigative path to follow
7. 24-hour wait to see consequence

## Technical Notes
- Store player choice in progress/state: `lastChoice: 'choice-id-option'`
- On next chapter load, check `lastChoice` and serve appropriate `narrativeIntro.fromChoice` entry
- After Subchapter 1 convergence, clear choice-specific routing (everyone on same path)
- Puzzle difficulty curve: 4 outliers → 4 outliers → 8 outliers per chapter
