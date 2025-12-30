# Session Summary: LLM Streaming & Path-Specific Decisions

**Date:** December 30, 2025
**Branch:** `claude/fix-chapter-1-replay-uuLMH` (continued from `claude/fix-llm-streaming-errors-7Uygh`)
**Repository:** Game-Dev (React Native noir mystery game with LLM-generated story content)

---

## Overview

This session addressed multiple interconnected issues in the story generation system, focusing on:
1. SSE streaming reliability
2. Background app resilience
3. C subchapter decision timing and path-specific decisions
4. Branching narrative choice design
5. **[NEW] Gemini schema complexity limits - two-call approach for pathDecisions**
6. **[NEW] Word count increases and dialogue formatting**

---

## Game Architecture Context

### Story Structure
- **12 Chapters**, each with **3 Subchapters (A, B, C)**
- **Subchapter C** is the "decision point" where players choose between Option A or Option B for the next chapter
- Each subchapter has **branching narrative**: 2 choice points × 3 options = **9 unique paths**
- Player reads ~900 words per playthrough; LLM generates all 9 paths (~3900 words total)

### Key Data Structures
- **`choiceHistory`**: Chapter-level decisions (Option A/B at end of each chapter's C subchapter)
- **`branchingChoices`**: Within-subchapter path tracking (e.g., "1B-2C" means chose option 1B then 2C)
- **`pathDecisions`**: 9 unique decision options, one per ending path (generated via two-call approach)
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

### 9. Chapter 1C Decision Panel Fix
 
**Problem:** After adding the `existingBranchingChoice` requirement for showing decision options (to ensure branching choices are complete before showing decisions), Chapter 1C stopped showing its decision panel. Chapter 1 uses the legacy linear narrative format and doesn't have `branchingNarrative`. 

**Solution:** Only require `existingBranchingChoice` when `hasBranchingNarrative` is true:
```javascript
const showDecisionOptions = showDecision && (
  awaitingDecision ||
  (isStoryMode && isSubchapterC && !isCaseSolved && !hasPreDecision && (
    hasBranchingNarrative ? existingBranchingChoice : true
  ))
);

``` 

**File:** `src/screens/CaseFileScreen.js`

---

### 10. Gemini Schema Complexity - Two-Call Approach for pathDecisions

**Problem:** Chapter 2C generation failed immediately with "Failed to generate content" error. The `DECISION_CONTENT_SCHEMA` with all 9 pathDecisions embedded exceeded Gemini's schema complexity limits.

**Root Cause:** Gemini 3 Flash has undocumented limits on JSON schema complexity. A schema with 9 nested pathDecision objects (each containing intro, optionA, optionB with their properties) was too complex.

**Solution:** Split C subchapter generation into two API calls:

1. **First Call:** Generate main content with a simple single `decision` object
2. **Second Call:** Generate just the 9 pathDecisions with a minimal schema

```javascript
// PATHDECISIONS_ONLY_SCHEMA - minimal schema for second call
const PATHDECISIONS_ONLY_SCHEMA = {
  type: 'object',
  properties: {
    pathDecisions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pathKey: { type: 'string' },
          intro: { type: 'string' },
          optionA: { type: 'object', properties: { key, title, focus, personalityAlignment } },
          optionB: { type: 'object', properties: { key, title, focus, personalityAlignment } },
        },
      },
      minItems: 9,
      maxItems: 9,
    },
  },
  required: ['pathDecisions'],
};
```

The second call receives full context from the first call:
- Opening text
- All 3 first choice options (labels + responses)
- All 9 second choice endings (path keys, labels, responses)
- Simple decision structure to adapt

**File:** `src/services/StoryGenerationService.js` (lines 996-1089, 6880-7000)

---

### 11. pathDecisions Not Updating After Branching Narrative Completes

**Problem:** After player completed the branching narrative in 2C, the decision panel still showed the fallback "1A-2A" decision instead of the player's actual path decision.

**Root Cause:** `stableStoryCampaign` in `useGameLogic.js` didn't include `branchingChoices` in its dependency array. When the player completed the branching narrative and `branchingChoices` was updated, the `activeCase` wasn't re-merged with the new data.

**Solution:** Added `branchingChoices.length` to the `stableStoryCampaign` memo dependencies:

```javascript
const stableStoryCampaign = useMemo(() => {
  // ...
  if (
    current.chapter !== prev.chapter ||
    current.subchapter !== prev.subchapter ||
    // ... other checks ...
    (current.branchingChoices || []).length !== (prev.branchingChoices || []).length  // NEW
  ) {
    storyCampaignRef.current = current;
    return current;
  }
  return prev;
}, [/* ... */, (storyCampaign.branchingChoices || []).length]);  // NEW
```

**File:** `src/hooks/useGameLogic.js`

---

### 12. Word Count Increase (165 → 300 words per segment)

**Problem:** Each narrative segment was ~165 words, making player path experience only ~500 words total.

**Solution:** Increased all segment word counts to ~300 words:

| Segment | Old | New |
|---------|-----|-----|
| Opening | ~165 words | ~300 words |
| First choice responses (×3) | ~165 words each | ~300 words each |
| Endings (×9) | ~170 words each | ~300 words each |
| **Total generated** | ~2,200 words | ~3,900 words |
| **Per player path** | ~500 words | ~900 words |

**File:** `src/services/StoryGenerationService.js` (schema descriptions, MASTER_SYSTEM_PROMPT)

---

### 13. Dialogue Formatting - Single Quotes

**Problem:** LLM generations sometimes used double quotes for dialogue instead of single quotes (noir style convention).

**Solution:** Added explicit constraint to CRITICAL CONSTRAINTS section:

```
6. **DIALOGUE FORMATTING:** Use SINGLE QUOTES for all dialogue
   (e.g., 'Like this,' Jack said). This is a stylistic choice for the noir aesthetic.
```

**File:** `src/services/StoryGenerationService.js` (MASTER_SYSTEM_PROMPT)

---

### 14. Enhanced Logging for pathDecisions Second Call

**Problem:** Difficult to debug what context was being sent to the second API call.

**Solution:** Added comprehensive logging:

```
[StoryGenerationService] 🔄 Making second API call for pathDecisions...
[StoryGenerationService] 📋 pathDecisions second call context:
  - Opening: The rain hammered against the warehouse windows...
  - First choices: Confront directly, Wait and observe, Call for backup
  - Second choice groups: 3 (should be 3)
  - Total paths in prompt: 9 (should be 9)
  - Simple decision: "Go to the wharf" vs "Return to the office"
  - Prompt length: 4523 chars
[StoryGenerationService] ⏱️ pathDecisions second call completed in 8.2s
[StoryGenerationService] ✅ pathDecisions merged: 9 paths
[StoryGenerationService] 📊 Path-specific decisions received:
  - 1A-2A: A="Confront Wade at the docks" | B="Gather more evidence first"
  - 1A-2B: A="Press Wade for answers" | B="Take a cautious approach"
  ... (all 9 paths)
```

**File:** `src/services/StoryGenerationService.js`

---

## Complete Flow: How Path-Specific Decisions Work

```
1. GENERATION (Two-Call Approach)
   ├─> FIRST CALL: LLM generates C subchapter with simple decision + branchingNarrative
   │   └─> Returns: title, narrative, branchingNarrative (9 paths), simple decision
   │
   └─> SECOND CALL: LLM generates 9 pathDecisions using branchingNarrative context
       └─> Receives: opening, all first choices, all 9 endings, simple decision
       └─> Returns: pathDecisions array with 9 path-specific decision variants

2. STORAGE
   └─> Saved to generated story entry with all 9 pathDecisions (merged from both calls)

3. PLAYER PLAYS SUBCHAPTER
   └─> Makes branching choices (e.g., 1B then 2C)
   └─> branchingChoices updated: { caseNumber: "002C", secondChoice: "1B-2C" }
   └─> stableStoryCampaign updates (due to branchingChoices.length change)
   └─> activeCase re-merges with updated storyCampaign

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
| `src/services/StoryGenerationService.js` | Schema (pathDecisions), prompts, parsing, logging, situational choices, two-call approach, word counts, dialogue formatting |
| `src/utils/caseMerger.js` | Path-specific decision extraction from branchingChoices (supports both array and object formats) |
| `src/hooks/useStoryGeneration.js` | getOptionDetails handles pathDecisions, auto-retry |
| `src/hooks/useGameLogic.js` | Added branchingChoices to stableStoryCampaign dependencies |
| `src/context/StoryContext.js` | selectDecisionBeforePuzzleAndGenerate |
| `src/screens/CaseFileScreen.js` | Decision panel timing (existingBranchingChoice check), Chapter 1C fix |
| `src/components/StoryGenerationOverlay.js` | Auto-retry UI |
| `src/navigation/AppNavigator.js` | Auto-retry callback wiring |

---

## Commits Made

### Earlier Session (branch: `claude/fix-llm-streaming-errors-7Uygh`)
1. `f10082f5` - Trigger next chapter generation immediately when C subchapter decision is made
2. `74eff270` - Add auto-retry when returning from background after network failure
3. `a61a0c3a` - Add AppState handling for background resilience during generation
4. `f1c2596a` - Fix false positive timeline validation errors
5. `bda81fe6` - Implement path-specific decisions for C subchapters
6. `5876e252` - Update useStoryGeneration to extract decision details from pathDecisions
7. `3e997bd2` - Make branching choices situationally different, not personality-aligned
8. `48c3d991` - Fix Chapter 1C decision panel not showing options

### This Session (branch: `claude/fix-chapter-1-replay-uuLMH`)
9. `0dd19661` - Add two-call approach for C subchapter pathDecisions generation
10. `44578387` - Fix pathDecisions not updating after branching narrative completes
11. `1c215d11` - Enhance pathDecisions second API call with full branchingNarrative context
12. `0798c136` - Add path key format explanation and enhance logging for pathDecisions
13. `597b468c` - Increase segment word counts to 300 and enforce single quotes for dialogue

---

## Known Considerations

1. **Backward Compatibility**: All changes include fallbacks to legacy `decision` format (both array and object formats supported)
2. **Token Usage**: Generating 9 decisions requires a second API call, but keeps each call under Gemini's schema complexity limits
3. **Testing**: These changes affect C subchapters only (subchapter 3 of each chapter)
4. **Gemini Schema Limits**: Discovered that Gemini 3 Flash has undocumented schema complexity limits - complex nested schemas fail immediately
5. **Word Count Impact**: Increased from ~2200 to ~3900 total words generated per subchapter (player still experiences ~900 words per path)

---

## Next Steps / Potential Future Work

1. Test path-specific decisions in gameplay to verify distinct feel
2. Consider adding path-specific evidence discoveries (some clues only available on certain branching paths)
3. Monitor LLM output quality for the new situational choice design
4. Monitor generation time impact from increased word counts
5. Verify single quote formatting is consistently applied across all generated content

---

## Technical Notes for AI Agents

### Key Patterns to Know
- **Case numbers**: Format `XXXS` where XXX is chapter (001-012), S is subchapter (A, B, or C)
- **Path keys**: Format like "1B-2C" means first choice was B, second choice was C
- **branchingChoices vs choiceHistory**: branchingChoices = within-subchapter paths, choiceHistory = chapter-level A/B decisions
- **Two-call approach**: C subchapters use two API calls - first for main content, second for pathDecisions

### Important Functions
- `computeBranchPathKey(choiceHistory, chapter)` - Computes cumulative path key
- `_analyzePathPersonality(choiceHistory)` - Determines player's narrative style
- `getStoryEntryAsync(caseNumber, pathKey)` - Fetches generated content
- `_convertDecisionFormat(decision)` - Converts raw JSON to internal format
- `mergeCaseWithStory(baseCase, storyCampaign, getStoryEntryFn)` - Merges story data including pathDecisions lookup

### Schema Locations
- `DECISION_CONTENT_SCHEMA` (line ~669) - C subchapter schema with simple decision
- `PATHDECISIONS_ONLY_SCHEMA` (line ~1016) - Minimal schema for second call (9 pathDecisions)
- `NON_DECISION_CONTENT_SCHEMA` (line ~255) - A/B subchapter schema
- `BRANCHING_NARRATIVE_SCHEMA` (line ~224) - Branching structure within subchapters
- `PATHDECISIONS_PROMPT_TEMPLATE` (line ~1054) - Prompt template for second call with full branchingNarrative context

### Critical Dependencies
- `stableStoryCampaign` in `useGameLogic.js` must include `branchingChoices.length` to trigger re-merge after branching completes
- caseMerger looks up pathDecisions using `branchingChoice.secondChoice` as the key (e.g., "1B-2C")
