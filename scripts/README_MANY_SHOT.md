# Many-Shot Scene Categorization System

Automatically extract and categorize scenes from Mystic River for many-shot learning in story generation.

## Quick Start (Termux/Android)

**Important:** Use the **Standalone** versions of scripts on Termux (they work with plain Node.js):

```bash
# Step 1: Extract text from .docx (already done!)
node scripts/extractStoryReference.js

# Step 2: Split into scene chunks (already done!)
node scripts/extractSceneChunks.js

# Step 3: Test with 5 chunks (FREE - verify it works)
node scripts/testCategorizationStandalone.js

# Step 4: Run full categorization (~$0.10)
node scripts/categorizeWithGeminiStandalone.js
```

**Script Versions:**
- `testCategorization.js` - Requires React Native (won't work on Termux)
- `testCategorizationStandalone.js` - ✅ Works on Termux (use this!)
- `categorizeWithGemini.js` - Requires React Native (won't work on Termux)
- `categorizeWithGeminiStandalone.js` - ✅ Works on Termux (use this!)

## What This Does

1. **Extracts 433 scene chunks** (~300 words each) from Mystic River
2. **Uses Gemini to categorize** each chunk by scene type:
   - confrontation
   - investigation
   - revelation
   - interrogation
   - atmospheric
   - dialogue_tension
   - internal_monologue
   - darkest_moment
   - decision_point
   - action
   - aftermath
   - setup

3. **Generates organized files** in `src/data/manyShot/`:
   - `confrontationScenes.js` - 50-100 confrontation examples
   - `revelationScenes.js` - 50-100 revelation examples
   - `investigationScenes.js` - 50-100 investigation examples
   - etc.

4. **Ready to use** in your story generation prompts

## Cost Estimate

Processing 100 chunks (for testing):
- ~10 batches × 10 chunks each
- ~800 words per batch × 10 batches = ~8,000 input tokens
- ~500 output tokens per batch × 10 batches = ~5,000 output tokens
- **Total cost: ~$0.01-0.02** with Gemini 3 Flash

Processing all 433 chunks:
- **Total cost: ~$0.05-0.10**

## Integration into Story Generation

### Option 1: Add to Static Cache (Best for consistent use)

```javascript
// src/services/StoryGenerationService.js - in _buildStaticCacheContent()

import { getScenesByCategory } from '../data/manyShot';

_buildStaticCacheContent() {
  const parts = [];

  // ... existing content ...

  // Add many-shot examples for confrontations (always useful in noir)
  parts.push('<many_shot_confrontations>');
  const confrontationExamples = getScenesByCategory('confrontation', 50);
  parts.push(confrontationExamples.join('\n\n---\n\n'));
  parts.push('</many_shot_confrontations>');

  return parts.join('\n\n');
}
```

### Option 2: Conditional Based on Beat Type (Best for targeted use)

```javascript
// src/services/StoryGenerationService.js - in _buildDynamicPrompt()

import { getScenesByCategory } from '../data/manyShot';

_buildDynamicPrompt(context, chapter, subchapter, isDecisionPoint) {
  const parts = [];

  // ... existing dynamic content ...

  // Conditionally add many-shot based on beat type
  const beatType = this._getBeatType(chapter, subchapter);

  if (beatType.includes('Conflict') || beatType.includes('Confrontation')) {
    parts.push('<many_shot_examples>');
    parts.push('## Confrontation Scene Examples (from Mystic River):');
    const examples = getScenesByCategory('confrontation', 30);
    parts.push(examples.join('\n\n---\n\n'));
    parts.push('</many_shot_examples>');
    parts.push('\nWrite your confrontation scene in this style.\n');
  }

  if (subchapter === 3 || isDecisionPoint) {
    // Decision points benefit from revelation examples
    parts.push('<many_shot_revelations>');
    const examples = getScenesByCategory('revelation', 30);
    parts.push(examples.join('\n\n---\n\n'));
    parts.push('</many_shot_revelations>');
  }

  // ... rest of prompt ...
}
```

### Option 3: Mixed Examples for General Quality

```javascript
// For general noir craft, use a mix of all categories

import { getMixedScenes } from '../data/manyShot';

// Add 100 varied examples showing different noir techniques
const mixedExamples = getMixedScenes(100);
parts.push(mixedExamples.join('\n\n---\n\n'));
```

## Customization

### Modify Categories

Edit `SCENE_CATEGORIES` in `categorizeWithGemini.js`:

```javascript
const SCENE_CATEGORIES = {
  // Add your own categories
  clue_discovery: 'Jack discovers a clue that changes his understanding',
  victoria_interaction: 'Scene with Victoria Blackwell',
  // ...
};
```

### Filter by Quality

```javascript
// Only use "excellent" rated scenes
import { MANY_SHOT_SCENES } from '../data/manyShot/confrontationScenes';

const excellentOnly = MANY_SHOT_SCENES.filter(scene =>
  scene.quality === 'excellent'
);
```

### Filter by Tags

```javascript
// Get only dialogue-heavy confrontations
import { confrontationScenes } from '../data/manyShot';

const dialogueHeavy = confrontationScenes.filter(scene =>
  scene.tags?.includes('dialogue-driven')
);
```

## Monitoring Impact

After integrating many-shot examples, track:

1. **Quality scores** - Do they improve for specific beat types?
2. **Retry rates** - Do fewer generations need retries?
3. **Token costs** - Many-shot adds tokens but should reduce retries

Expected improvements:
- Confrontation quality: 70-85 → 85-95
- Revelation quality: 75-85 → 85-95
- Overall consistency: +10-15%

## File Structure

```
src/data/manyShot/
├── chunks_manifest.json          # All 433 chunks with metadata
├── categorization_results.json   # Gemini's categorization decisions
├── confrontationScenes.js        # Exported confrontation examples
├── revelationScenes.js           # Exported revelation examples
├── investigationScenes.js        # Exported investigation examples
├── ... (other categories)
└── index.js                      # Master export file
```

## Advanced: Character-Specific Examples

You can also categorize by character for voice consistency:

```javascript
// Modify categorization to extract character-specific dialogue
const VICTORIA_DIALOGUE = chunks.filter(chunk =>
  chunk.text.includes('Victoria') &&
  chunk.text.match(/"[^"]{20,}"/g)  // Has quoted dialogue
);
```

## Next Steps

1. **Run categorization** (costs ~$0.10 for full novel)
2. **Review generated files** in `src/data/manyShot/`
3. **Integrate selectively** - start with 1-2 beat types
4. **Monitor quality** - track improvements
5. **Expand** if it helps specific problem areas

---

**Note:** Many-shot is the "nuclear option" for quality. Your current few-shot approach (17K chars) is already excellent. Only use this if you need fine-tuning-level quality for specific scene types.
