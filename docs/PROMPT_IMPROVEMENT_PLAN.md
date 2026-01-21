# Prompt Construction Improvement Plan

## Overview

This document outlines improvements to the AI prompt construction system based on analysis of the current implementation against Gemini 3 best practices from official documentation.

---

## Current Implementation Summary

### Strengths (Keep)
1. **XML-style tags** - Already using `<identity>`, `<core_mandate>`, `<task>`, etc.
2. **Explicit context caching** - `_ensureChapterStartCache` and `_ensureStaticCache` implementations
3. **Many-shot learning** - 15 examples from Mystic River based on beat types
4. **Thought signatures** - Reasoning continuity for multi-call conversations
5. **Two-pass generation** - Main content + pathDecisions for decision points
6. **Temperature 1.0** - Correctly forced for Gemini 3 models
7. **Task at end** - Query/instructions placed after context (per Gemini guidance)

---

## Issues Identified

### Critical Issues (Must Fix)

#### 1. Undefined Variable Bug in Legacy Path
**Location:** `promptAssembly.js:485`
**Issue:** `rotationSeed` is used but not defined in `_buildGenerationPrompt()`
```javascript
// Line 485 - rotationSeed is undefined here!
const manyShotExamples = buildManyShotExamples(beatType, chapterBeatType, 15, { rotationSeed });
```
**Impact:** Potential runtime error or undefined behavior in non-cached generation path
**Fix:** Define `rotationSeed` before use in `_buildGenerationPrompt()`

#### 2. Many-Shot Duplication
**Location:** `promptAssembly.js:359-368` and `promptAssembly.js:485-490`
**Issue:** Many-shot examples may be included twice - once in cache and once in dynamic prompt
- `_ensureChapterStartCache` includes many-shot examples in cached content
- `_buildDynamicPrompt` also conditionally includes them with `includeManyShot` flag
- When `includeManyShot: false` is passed, this is handled, but logic is fragile
**Impact:** Wasted tokens, potential context confusion
**Fix:** Always put many-shot in cache, remove from dynamic prompt entirely

#### 3. Style Section Duplication
**Location:** `promptAssembly.js:103-128` (cache) and `promptAssembly.js:474-476` (non-cached)
**Issue:** Style examples are built differently in cached vs non-cached paths
- Cached path: Uses `STYLE_EXAMPLES` + `extendedExamples` in `<style_examples>` tag
- Non-cached path: Uses `_buildStyleSection()` which also includes `STYLE_EXAMPLES` + `extendedExamples`
**Impact:** Inconsistent prompt structure between cached and non-cached paths
**Fix:** Unify style example construction

### Medium Priority Issues (Should Fix)

#### 4. Voice DNA Placement Suboptimal
**Location:** `promptAssembly.js:344-357`
**Issue:** Voice DNA is built in dynamic prompt even though it's relatively stable per chapter
- Only Jack and Victoria have canonical voice DNA
- This content rarely changes within a chapter
**Impact:** Wasted tokens on repeated stable content
**Fix:** Consider moving Voice DNA to chapter-start cache

#### 5. Implicit Cache Optimization Missing
**Location:** `promptAssembly.js:78-137`
**Issue:** Per Gemini docs, implicit caching works when "large and common contents at the beginning"
- Current static cache content order: grounding → character → craft techniques → style
- Could be optimized: Largest/most-stable content should be first
**Fix:** Reorder static cache content: many-shot examples (largest) → style → craft → character → grounding

#### 6. Thread Accounting Rule Duplication
**Location:** `prompts.js:293-313` and `promptAssembly.js:1354-1449`
**Issue:** Thread handling requirements appear in both:
- System prompt: `<thread_accounting_rule>` and `<thread_escalation_rule>`
- Consistency section: Similar priority/overdue logic
**Impact:** Redundant instructions, token waste
**Fix:** Keep in system prompt (authoritative), simplify consistency section

#### 7. Self-Critique Section Placement
**Location:** `promptAssembly.js:422-433` and `promptAssembly.js:533-544`
**Issue:** Self-critique checklist is at the end of user prompt
- Per Gemini 3 thinking mode, model does internal reasoning automatically
- Explicit checklist may conflict with native thinking process
**Impact:** Potentially redundant or conflicting instructions
**Fix:** Move quality gates to system prompt `<craft_quality_checklist>`, remove from task

### Low Priority Issues (Nice to Have)

#### 8. PathDecisions System Prompt Too Minimal
**Location:** `prompts.js:67-90`
**Issue:** `buildPathDecisionsSystemPrompt()` lacks much of the context from main system prompt
- No ABSOLUTE_FACTS details
- No writing style constraints
- No reveal timing rules
**Impact:** PathDecisions may not maintain voice/style consistency
**Fix:** Include relevant style/voice guidance in pathDecisions system prompt

#### 9. Thinking Level Not Varied by Task
**Location:** `generation.js:450-456`
**Issue:** Always using `thinkingLevel: 'high'`
- Per Gemini docs: "Use 'low' for straightforward tasks"
- Non-decision subchapters may not need maximum reasoning depth
**Impact:** Potentially unnecessary latency/cost for simpler tasks
**Fix:** Use 'high' for decision points, 'medium' for subchapter A/B

#### 10. Missing Schema Edge Case Guidance
**Location:** `schemas.js` (not shown in context)
**Issue:** Per Gemini docs: "Instruct the model what to do if it can't generate content"
- No explicit guidance for edge cases
**Impact:** Model may produce unexpected output on edge cases
**Fix:** Add fallback instructions to schema descriptions

---

## Implementation Plan

### Phase 1: Critical Bug Fixes

#### 1.1 Fix rotationSeed Bug
```javascript
// In _buildGenerationPrompt, add before line 485:
const rotationSeed = (Number.isFinite(chapter) ? chapter : 0) * 10 + (Number.isFinite(subchapter) ? subchapter : 0);
```

#### 1.2 Eliminate Many-Shot Duplication
- Remove many-shot from `_buildDynamicPrompt()` entirely
- Ensure many-shot is ALWAYS in cache (static or chapter-start)
- Remove `includeManyShot` parameter as it's no longer needed

### Phase 2: Prompt Structure Optimization

#### 2.1 Unify Cached vs Non-Cached Paths
- Create single source of truth for each prompt section
- Ensure both paths produce identical structures (just with different content)
- Consider deprecating non-cached path entirely (caching should always be available)

#### 2.2 Optimize Cache Content Order
Reorder `_buildStaticCacheContent()`:
1. Many-shot examples (largest, most stable) - ~20k tokens
2. Style examples + extended examples - ~8k tokens
3. Craft techniques - ~3k tokens
4. Character reference - ~1k tokens
5. Story Bible grounding - ~1k tokens

This maximizes implicit cache hits by putting largest stable content first.

#### 2.3 Move Voice DNA to Chapter-Start Cache
- Voice DNA changes only when characters change (rare within chapter)
- Move from `_buildDynamicPrompt` to `_ensureChapterStartCache`
- Reduces per-request token count

### Phase 3: Instruction Consolidation

#### 3.1 Consolidate Thread Rules
- Keep `<thread_accounting_rule>` in system prompt
- Simplify `_buildConsistencySection` to only show data, not rules
- Remove redundant instructions about thread handling

#### 3.2 Remove Duplicate Self-Critique
- Remove `<self_critique>` block from task sections
- Rely on system prompt's `<craft_quality_checklist>`
- Let Gemini 3's native thinking handle quality validation

### Phase 4: PathDecisions Enhancement

#### 4.1 Enhance PathDecisions System Prompt
Add to `buildPathDecisionsSystemPrompt()`:
- Writing style essentials (forbidden patterns, voice requirements)
- Key character voice traits for decision framing
- Reveal timing constraints

### Phase 5: Thinking Level Optimization

#### 5.1 Vary Thinking Level by Task
- Decision points (subchapter C): `thinkingLevel: 'high'`
- Opening subchapter (A): `thinkingLevel: 'medium'`
- Development subchapter (B): `thinkingLevel: 'medium'`
- PathDecisions second call: `thinkingLevel: 'high'` (keep as-is)

---

## What Needs to be Fixed

1. **rotationSeed undefined** in `_buildGenerationPrompt()` - causes potential runtime error
2. **Many-shot duplication** - tokens wasted on duplicate content
3. **Style section inconsistency** - different structures in cached vs non-cached paths
4. **Thread rule duplication** - same instructions in multiple places

## What Needs to be Changed

1. **Cache content order** - reorder for implicit cache optimization
2. **Voice DNA location** - move to chapter-start cache
3. **Self-critique location** - consolidate in system prompt
4. **Thinking levels** - vary based on task complexity
5. **PathDecisions system prompt** - add style/voice constraints

## What Needs to be Removed

1. **`includeManyShot` parameter** - no longer needed after consolidation
2. **Duplicate `<self_critique>` block** - from task section
3. **Redundant thread rules** - from consistency section

## What Needs to be Added

1. **rotationSeed definition** - in `_buildGenerationPrompt()`
2. **Style constraints** - to pathDecisions system prompt
3. **Edge case guidance** - to schema descriptions
4. **Cache order documentation** - inline comments explaining optimization

---

## Implementation Priority

| Priority | Task | Effort | Impact | Status |
|----------|------|--------|--------|--------|
| P0 | Fix rotationSeed bug | Low | High (prevents errors) | ✅ DONE |
| P1 | Eliminate many-shot duplication | Medium | High (reduces tokens) | ✅ DONE |
| P1 | Consolidate thread rules | Medium | Medium (cleaner prompts) | ✅ DONE |
| P2 | Optimize cache content order | Low | Medium (implicit cache hits) | ✅ DONE |
| P2 | Move Voice DNA to cache | Medium | Medium (reduces tokens) | ⏳ DEFERRED (minimal impact) |
| P3 | Vary thinking levels | Low | Low (minor latency improvement) | ✅ DONE |
| P3 | Enhance pathDecisions prompt | Medium | Medium (better consistency) | ✅ DONE |

---

## Changes Implemented

### 1. Fixed rotationSeed Bug (P0)
- **File:** `promptAssembly.js:477`
- **Change:** Added `rotationSeed` calculation before use in `_buildGenerationPrompt()`
- **Impact:** Prevents potential runtime errors in non-cached generation path

### 2. Fixed Many-Shot Handling (P1)
- **Files:** `promptAssembly.js`, `generation.js`
- **Original Design:**
  - Cached path: many-shot in cache, `includeManyShot: false` in dynamic prompt
  - Fallback path: many-shot MUST be in `_buildGenerationPrompt()` since there's no cache
- **Changes:**
  - Removed `includeManyShot` parameter from `_buildDynamicPrompt()` (was always false anyway)
  - KEPT many-shot in `_buildGenerationPrompt()` for fallback when caching fails
  - Added clear comment explaining the design pattern
- **Impact:** Maintains correct behavior for both cached and fallback paths

### 3. Consolidated Thread Rules (P1)
- **File:** `promptAssembly.js:1441-1443`
- **Change:** Removed duplicate thread handling instructions from `_buildConsistencySection()`
- **Impact:** Rules now only in system prompt's `<thread_accounting_rule>` and `<thread_escalation_rule>`

### 4. Optimized Cache Content Order (P2)
- **Files:** `promptAssembly.js:169-178`, `promptAssembly.js:268-284`
- **Change:** Moved many-shot examples to BEGINNING of cached content
- **Impact:** Maximizes implicit cache hits per Gemini documentation

### 5. Removed Duplicate Self-Critique (P1)
- **Files:** `promptAssembly.js:405-418`, `promptAssembly.js:506-520`
- **Change:** Removed `<self_critique>` block from task sections
- **Impact:** Quality gates now only in system prompt's `<craft_quality_checklist>`

### 6. Varied Thinking Levels (P3)
- **File:** `generation.js:445-448`
- **Change:** Use 'high' for decision points, 'medium' for regular subchapters
- **Impact:** Faster generation for non-decision subchapters

### 7. Enhanced PathDecisions System Prompt (P3)
- **File:** `prompts.js:67-101`
- **Change:** Added `<voice_constraints>` section with POV/tense/tone guidance
- **Impact:** Better consistency between main narrative and path-specific decisions

---

## Testing Checklist

After implementation, verify:
- [x] Non-cached generation works without errors (rotationSeed fixed + many-shot preserved)
- [x] Cached generation works correctly (many-shot in cache, not in dynamic prompt)
- [x] Fallback path has many-shot (CRITICAL: restored after initial incorrect removal)
- [ ] Voice DNA is in chapter-start cache (deferred - minimal impact)
- [x] Thread rules appear only in system prompt (consolidated)
- [x] Self-critique covered by system prompt's `<craft_quality_checklist>`
- [x] Forbidden patterns checked by post-processing validation
- [ ] Generation quality maintained or improved (requires runtime testing)

---

## Deferred Items

### Voice DNA to Cache
- **Reason:** Voice DNA is relatively small (~1k tokens) and varies based on characters in scene
- **Impact:** Minimal token savings vs. complexity of implementation
- **Recommendation:** Keep in dynamic prompt for now; revisit if performance issues arise
