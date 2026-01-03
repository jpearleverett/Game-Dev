# Session Summary: Context Windowing Cleanup & Branching Narrative Validation

**Date:** January 2, 2026
**Branch:** `claude/review-context-windowing-Dql0q`
**Repository:** Game-Dev (React Native noir mystery game with LLM-generated story content)

---

## Overview

This session focused on reviewing and cleaning up the `contextWindowing` configuration and adding validation for branching narrative word counts. Key outcomes:

1. **Removed dead code** - `contextWindowing` config was never used, comments were misleading
2. **Added branching narrative validation** - Ensures all 9 player paths meet word count requirements
3. **Fixed schema/validation mismatch** - Root cause of thin branching content on first generation attempts
4. **Changed validation to warnings-only** - Avoid expensive retries now that schema instructs correct lengths

---

## Initial Request: Review contextWindowing

**User Question:** "Read the Gemini documentation and assess if the contextWindowing part needs to change. Since there's a 1M context window for Gemini 3 Flash, we can include the entire story... but the storyBible.js contextWindowing section implies we're summarizing older chapters. Is this actually happening or are the comments wrong?"

### Investigation Results

**Finding 1: contextWindowing config was DEAD CODE**

The `contextWindowing` section in `storyBible.js:745-758` contained misleading comments:

```javascript
contextWindowing: {
  // Older chapters: include full summaries for all   ← MISLEADING
  maxOlderChapterEntries: 36,
  // Recent chapters: FULL TEXT, no truncation
  maxRecentChapterEntries: 9,
  // ... more unused values
}
```

**Grep search confirmed:** Zero references to `GENERATION_CONFIG.contextWindowing` anywhere in the codebase.

**Finding 2: Actual implementation uses FULL TEXT**

The `_buildStorySummarySection()` method in `StoryGenerationService.js:5644-5786` explicitly:
- Includes FULL narratives for ALL chapters
- Comments say "NO TRUNCATION" multiple places
- Never summarizes - the entire story is sent to the LLM

**Conclusion:** The comments described a summarization strategy that was either never implemented or was removed. The config was dead code.

---

## wordCount Config Review

**User Question:** "What about the word count requirements right below it?"

### Investigation Results

**All three wordCount values ARE actively used:**

| Config Value | Where Used |
|-------------|-----------|
| `minimum: 850` | `MIN_WORDS_PER_SUBCHAPTER` at line 44 |
| `target: 900` | `TARGET_WORDS` at line 45 |
| `maximum: 1200` | Validation warning at line 8875 |

**Usage:**
- In prompts (tells LLM the minimum)
- In validation (triggers issues/warnings)
- In expansion logic (attempts to reach target if below minimum)

---

## Branching Narrative Validation Gap

**User Question:** "My subchapters are branching narratives that require 4k+ words to ensure each version a player may see meets the target (900). Is this logic still working?"

### Critical Finding

The existing word count validation at `StoryGenerationService.js:8869` only validated the **canonical narrative** field (~500 words) - NOT the actual branching content.

| What | Validated? |
|------|-----------|
| `narrative` (canonical path) | YES |
| `branchingNarrative.opening.text` | NO |
| `branchingNarrative.firstChoice.options[].response` (3 branches) | NO |
| `branchingNarrative.secondChoices[].options[].response` (9 branches) | NO |

**Impact:** The LLM could generate 50-word stub responses for branches and pass validation as long as the canonical path looked okay.

---

## Implementation: Branching Narrative Validation

### Added Category 8.1 Validation

**File:** `StoryGenerationService.js:8880-8941`

New validation checks:
- Opening text: minimum 200 words
- Each first choice response (3): minimum 200 words
- Each second choice response (9): minimum 200 words
- Each complete path (9 paths): minimum 850 words (MIN_WORDS_PER_SUBCHAPTER)
- Total branching content: warning if < 3500 words

### Initially Wired as Critical Issues

**File:** `StoryGenerationService.js:9361-9366` (TIER 7)

Added branching word count issues as hard failures that trigger retries.

---

## Playtesting: Root Cause Discovery

User played through to Chapter 2A and provided logs showing:

```
WARN  Consistency check failed (Attempt 1/1). Issues:
  ["Narrative too short: 796 words (minimum 850 required)",
   "Second choice \"1A-2A\" response too short: 188 words (minimum 200)",
   "Path \"1A-2A\" total too short: 796 words (minimum 850)",
   ... 16 more similar issues]
```

**Key Insight:** The validation caught thin content, triggered a retry, and the retry succeeded with 992 words. But WHY was the first attempt generating thin content?

### Schema/Validation Mismatch Discovered

**Root Cause:** The schema told the LLM the WRONG word counts:

| Field | Schema Said | Validation Expected |
|-------|-------------|-------------------|
| `narrative` (canonical) | `~500 words` | 850 words minimum |
| Each segment | `~300 words` | 200 minimum per segment |

The LLM was FOLLOWING the schema's `~500 words` instruction, producing ~796 words, which then failed the 850 minimum check.

---

## Fix: Schema Word Count Alignment

### Updated All Schema Descriptions

**Changes made:**

| Location | Before | After |
|----------|--------|-------|
| Canonical `narrative` | `~500 words` | `850-950 words total` |
| Opening segment | `~300 words` | `280-320 words minimum` |
| First choice responses | `~300 words` | `280-320 words minimum` |
| Second choice responses | `~300 words` | `280-320 words minimum` |
| Total output | `~3,900 words` | `~4,000+ words` |

**Files modified:**
- Schema descriptions in `STORY_CONTENT_SCHEMA`
- Schema descriptions in `DECISION_POINT_SCHEMA`
- Prompt template structure diagram
- Code comments

---

## Final Change: Validation as Warnings Only

**User Request:** "Make the word count validation a warning rather than a failure requiring retry."

**Rationale:** Now that the schema instructs correct word counts, retries for word count issues are wasteful. The LLM should generate correct lengths on the first attempt.

### Changes Made

1. **Removed TIER 7 from `_isContinuityCriticalIssue()`**
   - Branching word count issues no longer trigger retries
   - Moved to soft failures section (commented out, like other soft issues)

2. **Changed Category 8.1 to push warnings instead of issues**
   - Validation still runs and logs for monitoring
   - Won't block generation or trigger expensive retries

---

## Bug Fix: Unescaped Apostrophe

**Error:** `SyntaxError: storyBible.js: Unexpected token`

**Cause:** In the `psychologicalComplicityExample.annotations` array:
```javascript
// BEFORE (broken)
'"Christmas-morning-when-you're-eight kind of awake"...'

// AFTER (fixed)
'"Christmas-morning-when-you\'re-eight kind of awake"...'
```

---

## Files Modified

### src/data/storyBible.js
- Removed unused `contextWindowing` config block (18 lines deleted)
- Fixed unescaped apostrophe in annotations

### src/services/StoryGenerationService.js
- Added Category 8.1: Branching Narrative Word Count Validation
- Updated all schema descriptions with correct word counts
- Updated prompt template structure diagram
- Added/removed TIER 7 in `_isContinuityCriticalIssue()`
- Changed branching validation from issues to warnings

---

## Commits

1. **`f0e1bb5`** - Remove unused contextWindowing config and add branching narrative validation
2. **`8409c5b`** - Wire branching narrative validation into critical issues
3. **`9f1691b`** - Fix unescaped apostrophe in storyBible.js
4. **`2721e7a`** - Fix schema word count mismatch causing thin branching content
5. **`f2de846`** - Change branching narrative word count validation to warnings only

---

## Key Learnings

### 1. Dead Code Creates Confusion
The `contextWindowing` config with its misleading comments caused user confusion about what the system was actually doing. Dead code should be removed promptly.

### 2. Schema Instructions Must Match Validation
When the schema told the LLM `~500 words` but validation expected 850, the LLM followed the schema and failed validation. These must be aligned.

### 3. Validation Strategy Depends on Prompt Quality
- If schema/prompts are vague: validation should be strict (trigger retries)
- If schema/prompts are precise: validation can be lenient (warnings only)

### 4. Branching Content Needs Explicit Validation
The original validation only checked the canonical path, missing 12 of the 13 narrative segments (opening + 3 first choices + 9 second choices). Each player path must be validated independently.

---

## Current State

### Word Count Flow

```
Schema instructs:
  Opening: 280-320 words
  First choices: 280-320 words each (x3)
  Second choices: 280-320 words each (x9)
  Canonical narrative: 850-950 words total
        ↓
LLM generates content
        ↓
Category 8.1 validates all segments and paths
        ↓
Warnings logged for monitoring (no retries)
        ↓
Content accepted
```

### Validation Behavior

| Issue Type | Before | After |
|-----------|--------|-------|
| Segment too short | Hard failure, retry | Warning only |
| Path too short | Hard failure, retry | Warning only |
| Total content thin | Warning | Warning |

---

## Next Steps

### Monitoring
- Watch logs for branching word count warnings
- If warnings are frequent, may need to strengthen schema instructions further

### Potential Future Work
- Consider adding segment-level word counts to the prompt template (not just schema)
- Track word count distribution across generated content for optimization

---

## Conclusion

This session successfully:
1. Removed 18 lines of dead/misleading `contextWindowing` code
2. Added comprehensive branching narrative validation (13 segments, 9 paths)
3. Fixed root cause of thin content (schema said ~500, validation expected 850)
4. Optimized validation to warnings-only (schema now instructs correct lengths)
5. Fixed syntax error from unescaped apostrophe

The branching narrative system now has proper word count monitoring, and the schema/validation alignment should result in adequate content on first generation attempts.
