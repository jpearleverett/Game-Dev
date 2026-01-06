# Many-Shot Scene Extraction & Categorization - Complete System

## 📚 What You Have

Your **storyreference.docx** (Mystic River by Dennis Lehane):
- ✅ **136,271 words** extracted
- ✅ **433 scene chunks** created (~300 words each)
- ✅ Ready for AI-powered categorization

## 🔧 System Components

### 1. Text Extraction
**File:** `scripts/extractStoryReference.js`
- Converts .docx → plain text
- Output: `docs/storyreference.txt`

### 2. Scene Chunking
**File:** `scripts/extractSceneChunks.js`
- Splits novel into 300-500 word chunks
- Output: `src/data/manyShot/chunks_manifest.json`

### 3. AI Categorization
**File:** `scripts/categorizeWithGemini.js`
- Uses Gemini to classify each chunk by scene type
- Processes in batches of 10 chunks
- Outputs organized category files

### 4. Usage Guide
**File:** `scripts/README_MANY_SHOT.md`
- Integration examples
- Cost estimates
- Best practices

## 🚀 Quick Start

```bash
# Test with 5 chunks first (verify it works)
node scripts/testCategorization.js

# Run full categorization (433 chunks, ~$0.10 cost)
node scripts/categorizeWithGemini.js
```

## 📊 What You'll Get

After running categorization:

```
src/data/manyShot/
├── confrontationScenes.js       # 40-60 confrontation examples
├── revelationScenes.js          # 30-50 revelation examples
├── investigationScenes.js       # 50-70 investigation examples
├── dialogueTensionScenes.js     # 40-60 tense dialogue examples
├── atmosphericScenes.js         # 30-50 mood-setting examples
├── internalMonologueScenes.js   # 40-60 thought examples
├── darkestMomentScenes.js       # 20-30 despair examples
└── index.js                     # Easy imports
```

Each file exports:
```javascript
export const CONFRONTATION_SCENES = [
  `Scene 1: 300-word example...`,
  `Scene 2: 300-word example...`,
  // ... 50+ more
];

export const CONFRONTATION_METADATA = {
  totalExamples: 58,
  averageWords: 314,
  commonTags: ['dialogue-driven', 'psychological', 'tense']
};
```

## 🎯 Integration Example

### Before (Your Current Few-Shot)
```javascript
// You have ~17K chars of annotated examples
const styleExamples = buildExtendedStyleExamples();
// 4-10 carefully curated examples with "WHY THIS WORKS" annotations
```

### After (Adding Many-Shot)
```javascript
// Option A: Add to static cache (always available)
import { getScenesByCategory } from '../data/manyShot';

_buildStaticCacheContent() {
  // ... existing 17K of annotated examples ...

  // Add 50 confrontation examples (no annotations, just examples)
  const confrontations = getScenesByCategory('confrontation', 50);
  parts.push(confrontations.join('\n\n'));
}
```

```javascript
// Option B: Conditional based on beat type (more targeted)
_buildDynamicPrompt(context, chapter, subchapter) {
  const beatType = this._getBeatType(chapter, subchapter);

  if (beatType.includes('Conflict')) {
    // Add 30 confrontation examples just for this type of scene
    const examples = getScenesByCategory('confrontation', 30);
    parts.push(examples.join('\n\n'));
  }
}
```

## 💰 Cost Analysis

### Initial Categorization (One-Time)
- 433 chunks ÷ 10 per batch = 44 batches
- ~1,000 tokens input × 44 = 44,000 input tokens
- ~500 tokens output × 44 = 22,000 output tokens
- **Total: ~$0.10** (Gemini 3 Flash pricing)

### Ongoing Usage (Per Story Generation)
**Option A: Static cache (50 scenes)**
- 50 scenes × 300 words = ~37,500 tokens
- Cached: $0.00005/hour storage
- **Cost: Minimal** (pays for itself if it prevents 1 retry)

**Option B: Conditional (30 scenes)**
- 30 scenes × 300 words = ~22,500 tokens
- Added to each generation: ~$0.003 per call
- **Worth it if:** Quality improves or retries decrease

## 📈 When to Use Many-Shot

### ✅ Use Many-Shot If:
- Specific scene types show quality variance (confrontations 70-85, need 85-95)
- You want fine-tuning quality without fine-tuning cost
- You have good source material (you do - Mystic River!)

### ❌ Skip Many-Shot If:
- Current quality is consistently high (85-90/100) ← **This is you!**
- Token budget is tight
- No specific problem areas identified

## 🎓 The Difference

| Approach | What | Your Status |
|----------|------|-------------|
| **Few-shot** | 5-10 annotated examples teaching principles | ✅ You have this (17K chars) |
| **Many-shot** | 50-100+ raw examples for pattern learning | 🟡 System ready, run when needed |

**Your current approach is working (85-90 quality).** Many-shot is available when you need it for specific improvements.

## 🔍 Next Steps

1. **Test first:** `node scripts/testCategorization.js` (free, 5 chunks)
2. **Review test results** - does categorization make sense?
3. **Run full categorization** - `node scripts/categorizeWithGemini.js` (~$0.10)
4. **Integrate selectively** - start with 1 category for 1 beat type
5. **Measure impact** - did quality improve? Retries decrease?
6. **Expand or remove** based on results

## 📝 Scene Categories Available

After categorization, you'll have examples for:

1. **confrontation** - Detective vs suspect/witness/superior
2. **investigation** - Evidence examination, searching
3. **revelation** - Moment of realization
4. **interrogation** - Formal questioning
5. **atmospheric** - Noir mood-setting
6. **dialogue_tension** - Subtext-heavy conversations
7. **internal_monologue** - Character thoughts
8. **darkest_moment** - Despair, hopelessness
9. **decision_point** - Character choosing between options
10. **action** - Physical confrontation
11. **aftermath** - Processing major events
12. **setup** - Establishing context

Each category will have 20-70 examples depending on how common that scene type is in Mystic River.

---

## Summary

You now have a **complete system** to:
- ✅ Extract scenes from your reference novel
- ✅ Categorize them automatically with Gemini
- ✅ Organize by scene type
- ✅ Integrate into your story generation

**Cost:** ~$0.10 one-time setup
**Benefit:** Fine-tuning quality for specific scene types
**Status:** Ready to run when needed

Your current few-shot approach is excellent. Use this when you identify specific areas that need improvement.
