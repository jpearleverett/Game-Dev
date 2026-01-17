# Project Learnings & Context

## Gemini 3 Configuration

### 2026-01-17 - [Thinking Tokens Consume Output Budget]
**Learning:** Gemini 3's thinking tokens count against your `maxTokens` limit. With default "high" thinking, 50-80% of tokens may go to reasoning before actual output is generated.
**Action:** Set generous `maxTokens` values for tasks using high thinking:
- Simple tasks with `thinkingLevel: 'low'`: 2,000 tokens sufficient
- Complex planning (arc, outline): 8,000-16,000 tokens
- Main narrative generation: 65,536 (Gemini 3 max)

**Reference:** `docs/gemini_3_developer_guide.md`, `docs/gemini_thinking_documentation.md`

### 2026-01-17 - [Temperature Must Be 1.0]
**Learning:** Gemini 3's reasoning is optimized for temperature=1.0. Setting below 1.0 can cause looping or degraded performance on complex tasks.
**Action:** Never override temperature for Gemini 3 models. The LLMService enforces this.

### 2026-01-17 - [Use thinkingLevel Not thinkingBudget]
**Learning:** For Gemini 3, use `thinkingLevel` ("low", "medium", "high", "minimal") instead of the legacy `thinkingBudget` parameter.
**Action:**
- Use `thinkingLevel: 'low'` for simple tasks (classification, validation)
- Use `thinkingLevel: 'high'` (default) for complex reasoning (narrative generation)

---

## Story Generation

### 2026-01-17 - [Narrative Expansion Causes Text Corruption]
**Learning:** The `_expandNarrative()` function was causing duplicate/corrupted text (e.g., "ike taffy" instead of "like taffy"). When asked to "expand" content, the LLM sometimes:
1. Starts mid-word when trying to continue
2. Includes partial duplicate sentences
**Action:** Expansion is now disabled. Shorter stories are preferable to corrupted text. The function remains in code but is not called.

**File:** `src/services/StoryGenerationService.js`

### 2026-01-17 - [Word Count Math Must Add Up]
**Learning:** Schema told LLM "280-320 words per segment" but config required 850 minimum. With 3 segments at low end (280×3=840), stories fell short of minimum, triggering expansion.
**Action:**
- Lowered minimum from 850 to 800 words
- Increased segment target from 280-320 to 300-350 words
- New math: 3×300=900 words expected, safely above 800 minimum

**Files:** `src/data/storyBible.js`, `src/services/StoryGenerationService.js`

### 2026-01-17 - [Two Prompt Building Paths]
**Learning:** The caching system creates two separate prompt building paths:
- Uncached (16%): `_buildGenerationPrompt()` → `_buildStyleSection()`
- Cached (84%): `_buildDynamicPrompt()` (builds inline)

When optimizations are only added to one path, they miss most generations.
**Action:** Always grep for all code paths when adding optimizations. Both paths must be updated.

---

## Navigation & State

### 2026-01-17 - [Navigation Race Conditions]
**Learning:** In `LogicPuzzleScreen.js`, `targetCaseNumber` was calculated using `progress.storyCampaign.activeCaseNumber` which could be stale when `activeCase.caseNumber` had already updated via async state.
**Action:** Use `nextCaseNumber` directly calculated from chapter/subchapter instead of relying on async-updated state values.

**File:** `src/screens/LogicPuzzleScreen.js`

### 2026-01-17 - [State Updates Before Navigation Cause Flicker]
**Learning:** When state is updated before navigation, components re-render with new state before navigation occurs, causing visible UI glitches.
**Action:** Pass hints about intended navigation to state updates (`preserveStatus: true`), allowing them to preserve relevant state during transitions.

---

## Code Quality

### 2026-01-17 - [Centralize Configuration Values]
**Learning:** Hardcoded values scattered across code (maxTokens, truncation lengths) make tuning difficult and create inconsistencies.
**Action:**
- All `maxTokens` values now in `GENERATION_CONFIG.maxTokens`
- Truncation lengths defined as constants: `TRUNCATE_SUMMARY`, `TRUNCATE_VALIDATION`, `TRUNCATE_DESCRIPTION`, `TRUNCATE_PREVIEW`

### 2026-01-17 - [Never Silently Swallow Errors]
**Learning:** `try/catch` blocks that return `null` without logging make bugs undetectable in production.
**Action:** Always log errors, even for "best effort" operations:
```javascript
} catch (error) {
  console.warn('[Service] Operation failed:', error.message);
  return null; // or fallback
}
```

### 2026-01-17 - [Keep Comments Updated]
**Learning:** Comments like "e.g. 450" when actual value is 800 create confusion during debugging.
**Action:** When changing configuration values, search for and update related comments.

---

## Text Processing

### 2024-05-23 - [TypewriterText Performance]
**Learning:** `setInterval` with small delays (e.g. 8ms) for typewriter effects can overwhelm the JS thread, especially when causing state updates and re-renders.
**Action:** Use a `requestAnimationFrame` loop that calculates the number of characters to display based on elapsed time. This decouples the "typing speed" from the "frame rate", ensuring the UI updates at a smooth 60fps while still respecting the desired text appearance speed.

### 2026-01-17 - [Text Pagination Word Boundaries]
**Learning:** `findBreakPoint()` in text pagination could return `targetChars` when no space was found in search range, causing mid-word cuts.
**Action:** Expand search backward then forward to find ANY word boundary before falling back to target position.

**File:** `src/utils/textPagination.js`

---

## Configuration Reference

### maxTokens (GENERATION_CONFIG.maxTokens)
| Key | Value | Thinking Level | Purpose |
|-----|-------|----------------|---------|
| `subchapter` | 65,536 | high | Main narrative generation |
| `pathDecisions` | 65,536 | high | Multi-path decision generation |
| `arcPlanning` | 16,000 | high | Multi-chapter story arc planning |
| `outline` | 8,000 | high | Chapter outlines |
| `consequences` | 4,000 | high | Consequence generation |
| `llmValidation` | 16,000 | low | Semantic validation |
| `classification` | 2,000 | low | Personality classification |
| `validation` | 2,000 | low | Simple validation |

### Word Count (GENERATION_CONFIG.wordCount)
| Key | Value | Notes |
|-----|-------|-------|
| `minimum` | 800 | Allows 3×280=840 word paths to pass |
| `target` | 900 | 3×300=900 expected per path |
| `maximum` | 1,200 | Cap for fast generation |

### Truncation Constants
| Constant | Value | Use Case |
|----------|-------|----------|
| `TRUNCATE_SUMMARY` | 500 | Brief narrative summaries in prompts |
| `TRUNCATE_VALIDATION` | 3,000 | Full narrative for validation |
| `TRUNCATE_DESCRIPTION` | 300 | Thread/choice descriptions |
| `TRUNCATE_PREVIEW` | 100 | Short previews in logs |
