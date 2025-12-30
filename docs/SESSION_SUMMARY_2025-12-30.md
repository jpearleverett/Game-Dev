# Session Summary: LLM Streaming & Path-Specific Decisions

**Date:** December 30, 2025
**Branch:** `claude/fix-llm-streaming-errors-7Uygh`
**Repository:** Game-Dev (React Native noir mystery game with LLM-generated story content)

---

## Overview

This session addressed multiple interconnected issues in the story generation system, focusing on:
1. SSE streaming reliability
2. Background app resilience
3. C subchapter decision timing and path-specific decisions
4. Branching narrative choice design

---

## Game Architecture Context

### Story Structure
- **12 Chapters**, each with **3 Subchapters (A, B, C)**
- **Subchapter C** is the "decision point" where players choose between Option A or Option B for the next chapter
- Each subchapter has **branching narrative**: 2 choice points × 3 options = **9 unique paths**
- Player reads ~500 words per playthrough; LLM generates all 9 paths (~2200 words total)

### Key Data Structures
- **`choiceHistory`**: Chapter-level decisions (Option A/B at end of each chapter's C subchapter)
- **`branchingChoices`**: Within-subchapter path tracking (e.g., "1B-2C" means chose option 1B then 2C)
- **`pathDecisions`**: NEW - 9 unique decision options, one per ending path
- **`storyCampaign`**: Player's full story progress and decision history

---

## Issues Fixed

### 1. SSE Streaming Reliability (Prior to This Session)
**Problem:** "Stream is locked" errors from `react-native-fetch-sse`, connection aborts from `expo/fetch`

**Solution:** Implemented `react-native-sse` library with heartbeat monitoring and immediate resolution when response received.

**Files:** `src/services/LLMService.js`

---

### 2. Timeline Validation False Positives

**Problem:** Validation was incorrectly flagging valid narrative as having timeline inconsistencies. The regex `.*` was too greedy, matching across the entire narrative instead of within sentences.

**Solution:** Constrained the regex to same-sentence matching with `[^.]{0,60}`:

```javascript
// Before (too greedy)
const pattern = new RegExp(`${escaped}.*${escaped}`, 'i');

// After (constrained to same sentence)
const pattern = new RegExp(`${escaped}[^.]{0,60}${escaped}`, 'i');
```

**File:** `src/services/StoryGenerationService.js`

---

### 3. Background App Resilience

**Problem:** DNS resolution failures when switching apps on Android (network connections killed when app goes to background).

**Solution:** Implemented AppState tracking with auto-retry when returning from background:

```javascript
// In useStoryGeneration.js
const pendingGenerationRef = useRef(null); // Store params for auto-retry
const [shouldAutoRetry, setShouldAutoRetry] = useState(false);

// AppState listener detects return from background
// If there was an error, triggers auto-retry
```

**Files:**
- `src/hooks/useStoryGeneration.js` - Added `shouldAutoRetry`, `getPendingGeneration`, `clearAutoRetry`
- `src/components/StoryGenerationOverlay.js` - Added "Reconnecting..." UI
- `src/navigation/AppNavigator.js` - Wired up auto-retry callbacks

---

### 4. C Subchapter Generation Timing

**Problem:** Generation for the next chapter started only after the puzzle was solved, causing delays.

**Solution:** Added `selectDecisionBeforePuzzleAndGenerate` wrapper that triggers generation immediately when the player makes their C subchapter decision (before puzzle):

```javascript
const selectDecisionBeforePuzzleAndGenerate = useCallback((optionKey, optionDetails = {}) => {
  selectDecisionBeforePuzzle(optionKey, optionDetails);
  // Trigger generation immediately
  if (isLLMConfigured && nextChapter <= 12) {
    generateForCase(nextCaseNumber, nextPathKey, nextChoiceHistory, branchingChoices)
      .then(/* ... */)
      .catch(/* ... */);
  }
}, [/* deps */]);
```

**File:** `src/context/StoryContext.js`

---

### 5. Decision Panel Timing

**Problem:** C subchapter decision options appeared before the player completed their branching choices within the subchapter.

**Solution:** Added `existingBranchingChoice` check to ensure decisions only show after branching is complete:

```javascript
const showDecisionOptions = showDecision && (
  awaitingDecision ||
  (isStoryMode && isSubchapterC && !isCaseSolved && !hasPreDecision && existingBranchingChoice)
);
```

**File:** `src/screens/CaseFileScreen.js`

---

### 6. Branching Narrative Logical Consistency

**Problem:** Choice responses could contradict the opening state (e.g., Claire refuses ledger in opening, but after choice Jack suddenly has it).

**Solution:** Added explicit logical consistency instructions to the branching narrative prompt:

```
**CRITICAL: LOGICAL CONSISTENCY BETWEEN SEGMENTS**
Each choice response MUST logically flow from BOTH:
- The opening's established state (what situation exists, what obstacles are present)
- The specific choice the player made (how they chose to act)

If the opening establishes a BARRIER (e.g., "Claire refuses to hand over the ledger"),
the choice response must:
- Show HOW Jack overcomes that barrier based on his chosen approach, OR
- Show Jack failing to overcome it and adapting, OR
- Show the consequences of that barrier still being in place
```

**File:** `src/services/StoryGenerationService.js` (MASTER_SYSTEM_PROMPT)

---

### 7. Path-Specific Decisions (Major Feature)

**Problem:** All 9 ending paths in a C subchapter showed the same decision options (Option A/B). The player's branching choices within the subchapter had no impact on the strategic options they faced.

**Solution:** Each of the 9 ending paths now has its own unique decision options.

#### Schema Change
Replaced single `decision` object with `pathDecisions` containing 9 entries:

```javascript
pathDecisions: {
  '1A-2A': { intro, optionA, optionB },
  '1A-2B': { intro, optionA, optionB },
  '1A-2C': { intro, optionA, optionB },
  '1B-2A': { intro, optionA, optionB },
  // ... all 9 paths
  '1C-2C': { intro, optionA, optionB },
}
```

#### Case Merging
Updated `caseMerger.js` to extract the correct path-specific decision:

```javascript
if (storyMeta.pathDecisions) {
  const branchingChoice = storyCampaign?.branchingChoices?.find(
    bc => bc.caseNumber === caseNumber
  );
  const pathKey = branchingChoice?.secondChoice || '1A-2A';
  merged.storyDecision = storyMeta.pathDecisions[pathKey] ||
                         storyMeta.pathDecisions['1A-2A'] || null;
} else {
  // Fallback for legacy single-decision format
  merged.storyDecision = storyMeta.decision || null;
}
```

#### Decision Details Flow
Updated `useStoryGeneration.js` `getOptionDetails()` to handle path-specific decisions:

```javascript
const getOptionDetails = (optionKey) => {
  let d = null;
  if (decisionEntry?.pathDecisions) {
    const branchingChoice = storyCampaign?.branchingChoices?.find(
      bc => bc.caseNumber === decisionCaseNumber
    );
    const pathKey = branchingChoice?.secondChoice || '1A-2A';
    d = decisionEntry.pathDecisions[pathKey] || decisionEntry.pathDecisions['1A-2A'];
  } else {
    d = decisionEntry?.decision;
  }
  // ... rest of extraction
};
```

#### Prompt Instructions
Added detailed guidance for generating 9 unique decisions:

```
**CRITICAL: Generate 9 UNIQUE decisions in the "pathDecisions" object**

WHY THIS MATTERS:
A player who took the aggressive path (e.g., 1A→1A-2A) should face decisions
that reflect THEIR journey. A player who took the cautious path (e.g., 1C→1C-2C)
should face decisions suited to THEIR situation.
```

**Files Modified:**
- `src/services/StoryGenerationService.js` - Schema, prompts, parsing, logging
- `src/utils/caseMerger.js` - Path-specific decision extraction
- `src/hooks/useStoryGeneration.js` - Decision details extraction

---

### 8. Situational Branching Choices (Not Personality-Aligned)

**Problem:** The 3 branching options within a subchapter were being designed as variations of aggression/caution (e.g., "Confront directly" / "Ask diplomatically" / "Observe silently") - essentially the same action with different intensity.

**Solution:** Updated CHOICE DESIGN guidance to emphasize situationally different actions:

```
**WRONG (personality-aligned):**
- "Confront him directly" (aggressive)
- "Ask diplomatically" (neutral)
- "Observe silently" (cautious)
These are the SAME action with different intensity. Boring!

**RIGHT (situationally different):**
In a scene where Jack finds Claire in her office:
- "Ask about the missing file" (pursue one lead)
- "Mention Tom's name" (pursue a different lead)
- "Examine the photographs on her desk" (investigate environment instead of talking)

**KEY PRINCIPLES:**
- Each option leads to DIFFERENT INFORMATION or DISCOVERIES
- Options can be: talk to different people, investigate different objects,
  go to different places, ask about different topics
- Player chooses WHAT to focus on, not HOW aggressively
```

**File:** `src/services/StoryGenerationService.js` (CHOICE DESIGN section and schema descriptions)

---

## Complete Flow: How Path-Specific Decisions Work

```
1. GENERATION
   └─> LLM generates C subchapter with pathDecisions (9 unique decisions)

2. STORAGE
   └─> Saved to generated story entry with all 9 pathDecisions

3. PLAYER PLAYS SUBCHAPTER
   └─> Makes branching choices (e.g., 1B then 2C)
   └─> branchingChoices updated: { caseNumber: "002C", secondChoice: "1B-2C" }

4. CASE MERGING
   └─> caseMerger looks up branchingChoices for this case
   └─> Extracts pathDecisions["1B-2C"] as storyDecision

5. UI DISPLAY
   └─> DecisionPanel shows the path-specific Option A and Option B
   └─> GameContext saves to pendingDecisionOptions

6. DECISION CONFIRMATION
   └─> Player picks Option A or B
   └─> choiceHistory updated with optionTitle and optionFocus from their path

7. NEXT CHAPTER CONTEXT
   └─> StoryGenerationService receives choiceHistory with full details
   └─> Prompt includes "CRITICAL CONTEXT: PREVIOUS DECISION" with exact wording
```

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/services/StoryGenerationService.js` | Schema (pathDecisions), prompts, parsing, logging, situational choices |
| `src/utils/caseMerger.js` | Path-specific decision extraction from branchingChoices |
| `src/hooks/useStoryGeneration.js` | getOptionDetails handles pathDecisions, auto-retry |
| `src/context/StoryContext.js` | selectDecisionBeforePuzzleAndGenerate |
| `src/screens/CaseFileScreen.js` | Decision panel timing (existingBranchingChoice check) |
| `src/components/StoryGenerationOverlay.js` | Auto-retry UI |
| `src/navigation/AppNavigator.js` | Auto-retry callback wiring |

---

## Commits Made

1. `f10082f5` - Trigger next chapter generation immediately when C subchapter decision is made
2. `74eff270` - Add auto-retry when returning from background after network failure
3. `a61a0c3a` - Add AppState handling for background resilience during generation
4. `f1c2596a` - Fix false positive timeline validation errors
5. `bda81fe6` - Implement path-specific decisions for C subchapters
6. `5876e252` - Update useStoryGeneration to extract decision details from pathDecisions
7. `3e997bd2` - Make branching choices situationally different, not personality-aligned

---

## Known Considerations

1. **Backward Compatibility**: All changes include fallbacks to legacy `decision` format
2. **Token Usage**: Generating 9 decisions increases token output slightly, but decisions are generated before narrative (protected from truncation)
3. **Testing**: These changes affect C subchapters only (subchapter 3 of each chapter)

---

## Next Steps / Potential Future Work

1. Test path-specific decisions in gameplay to verify distinct feel
2. Consider adding path-specific evidence discoveries (some clues only available on certain branching paths)
3. Monitor LLM output quality for the new situational choice design

---

## Technical Notes for AI Agents

### Key Patterns to Know
- **Case numbers**: Format `XXXS` where XXX is chapter (001-012), S is subchapter (1-3)
- **Path keys**: Format like "1B-2C" means first choice was B, second choice was C
- **branchingChoices vs choiceHistory**: branchingChoices = within-subchapter paths, choiceHistory = chapter-level A/B decisions

### Important Functions
- `computeBranchPathKey(choiceHistory, chapter)` - Computes cumulative path key
- `_analyzePathPersonality(choiceHistory)` - Determines player's narrative style
- `getStoryEntryAsync(caseNumber, pathKey)` - Fetches generated content
- `_convertDecisionFormat(decision)` - Converts raw JSON to internal format

### Schema Locations
- `DECISION_CONTENT_SCHEMA` (line ~669) - C subchapter schema with pathDecisions
- `NON_DECISION_CONTENT_SCHEMA` (line ~255) - A/B subchapter schema
- `BRANCHING_NARRATIVE_SCHEMA` (line ~224) - Branching structure within subchapters
