#!/usr/bin/env node
/**
 * Use Gemini to categorize scene chunks from Mystic River
 *
 * Processes chunks in batches and categorizes each by scene type
 * Uses your existing LLMService for consistency
 */

const fs = require('fs');
const path = require('path');

// Import your LLM service
const { llmService } = require('../src/services/LLMService');

const MANIFEST_PATH = './src/data/manyShot/chunks_manifest.json';
const OUTPUT_DIR = './src/data/manyShot';
const BATCH_SIZE = 10;  // Process 10 chunks per Gemini call for efficiency
const MAX_CHUNKS = 100; // Limit for testing (remove later for full processing)

// Scene categories aligned with your story beats
const SCENE_CATEGORIES = {
  confrontation: 'Detective confronting suspect, witness, or superior with underlying tension',
  investigation: 'Examining evidence, searching locations, piecing together clues',
  revelation: 'Character realizes something crucial, moment of clarity or horror',
  interrogation: 'Formal questioning scene with power dynamics',
  atmospheric: 'Setting mood, noir atmosphere, environmental description',
  dialogue_tension: 'Conversation with subtext and underlying conflict',
  internal_monologue: 'Character thoughts, analysis, emotional processing',
  darkest_moment: 'Despair, hopelessness, all seems lost',
  decision_point: 'Character must choose between difficult options',
  action: 'Physical confrontation, chase, violence',
  aftermath: 'Processing events after major incident',
  setup: 'Establishing context, relationships, or situation'
};

const CATEGORIZATION_SCHEMA = {
  type: 'object',
  properties: {
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          chunkId: { type: 'string' },
          primaryCategory: {
            type: 'string',
            enum: Object.keys(SCENE_CATEGORIES)
          },
          secondaryCategories: {
            type: 'array',
            items: {
              type: 'string',
              enum: Object.keys(SCENE_CATEGORIES)
            },
            maxItems: 2
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific techniques used: dialogue-driven, sensory-rich, fast-paced, psychological, violence, etc.'
          },
          quality: {
            type: 'string',
            enum: ['excellent', 'good', 'average'],
            description: 'How well-crafted is this example for teaching noir writing?'
          },
          reason: {
            type: 'string',
            description: 'Brief explanation of categorization (1 sentence)'
          }
        },
        required: ['chunkId', 'primaryCategory', 'quality', 'reason']
      }
    }
  },
  required: ['scenes']
};

async function main() {
  console.log('[Categorize] Initializing LLM service...');
  await llmService.init();

  if (!llmService.isConfigured()) {
    console.error('[Categorize] ❌ LLM service not configured. Set GEMINI_API_KEY or proxy URL.');
    process.exit(1);
  }

  console.log('[Categorize] Loading chunks manifest...');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

  const chunksToProcess = manifest.slice(0, MAX_CHUNKS);
  console.log(`[Categorize] Processing ${chunksToProcess.length} chunks...`);

  const results = [];
  let processed = 0;

  // Process in batches
  for (let i = 0; i < chunksToProcess.length; i += BATCH_SIZE) {
    const batch = chunksToProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunksToProcess.length / BATCH_SIZE);

    console.log(`\n[Categorize] Batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`);

    // Build prompt for batch
    const prompt = buildCategorizationPrompt(batch);

    try {
      const response = await llmService.complete(
        [{ role: 'user', content: prompt }],
        {
          temperature: 0.3,  // Lower temp for consistent categorization
          maxTokens: 4000,
          responseSchema: CATEGORIZATION_SCHEMA,
          systemPrompt: buildSystemPrompt()
        }
      );

      const categorized = JSON.parse(response.content);

      // Merge results
      categorized.scenes.forEach(scene => {
        const chunkIndex = manifest.findIndex(c => c.id === scene.chunkId);
        if (chunkIndex >= 0) {
          manifest[chunkIndex].category = scene.primaryCategory;
          manifest[chunkIndex].secondaryCategories = scene.secondaryCategories || [];
          manifest[chunkIndex].tags = scene.tags || [];
          manifest[chunkIndex].quality = scene.quality;
          manifest[chunkIndex].categoryReason = scene.reason;
        }
        results.push(scene);
        processed++;
      });

      console.log(`[Categorize] ✅ Batch ${batchNum} complete (${processed}/${chunksToProcess.length} total)`);

      // Save progress after each batch
      saveProgress(manifest, results);

      // Rate limiting - wait 2s between batches
      if (i + BATCH_SIZE < chunksToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`[Categorize] ❌ Batch ${batchNum} failed:`, error.message);
      // Continue with next batch rather than failing completely
    }
  }

  console.log('\n[Categorize] ✅ Categorization complete!');
  console.log(`[Categorize] Processed: ${processed} chunks`);

  // Generate final output files organized by category
  generateCategoryFiles(manifest);
}

function buildSystemPrompt() {
  return `You are a literary analyst specializing in noir detective fiction.

Your task is to categorize scenes from Dennis Lehane's "Mystic River" by their primary function in noir storytelling.

Scene Categories:
${Object.entries(SCENE_CATEGORIES).map(([key, desc]) => `- ${key}: ${desc}`).join('\n')}

Focus on:
1. **Primary function** - What is this scene's main purpose?
2. **Quality** - How well-crafted is it as a teaching example?
3. **Techniques** - What specific craft elements does it demonstrate?

Be precise and consistent. Categorization is for teaching AI to write noir fiction.`;
}

function buildCategorizationPrompt(chunks) {
  let prompt = `Categorize these ${chunks.length} scenes from "Mystic River":\n\n`;

  chunks.forEach((chunk, i) => {
    prompt += `## Chunk ${chunk.id}\n`;
    prompt += `[${chunk.wordCount} words]\n`;
    prompt += `${chunk.text.substring(0, 800)}...\n\n`;
  });

  prompt += `\nFor each chunk, provide:\n`;
  prompt += `1. Primary category (required)\n`;
  prompt += `2. Secondary categories if applicable (max 2)\n`;
  prompt += `3. Specific craft tags (dialogue-driven, sensory-rich, etc.)\n`;
  prompt += `4. Quality rating (excellent/good/average)\n`;
  prompt += `5. Brief reason for categorization\n`;

  return prompt;
}

function saveProgress(manifest, results) {
  // Save updated manifest
  fs.writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  // Save categorization results
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'categorization_results.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );
}

function generateCategoryFiles(manifest) {
  console.log('\n[Categorize] Generating category files...');

  const byCategory = {};

  // Group by primary category
  manifest.forEach(chunk => {
    if (!chunk.category) return;

    if (!byCategory[chunk.category]) {
      byCategory[chunk.category] = [];
    }

    byCategory[chunk.category].push(chunk);
  });

  // Save each category to its own file
  for (const [category, chunks] of Object.entries(byCategory)) {
    const excellentChunks = chunks.filter(c => c.quality === 'excellent');
    const goodChunks = chunks.filter(c => c.quality === 'good');

    // Sort by quality
    const sortedChunks = [...excellentChunks, ...goodChunks];

    // Generate exports for use in prompts
    const exportContent = `/**
 * ${category.toUpperCase()} SCENES - Many-shot examples from Mystic River
 *
 * ${SCENE_CATEGORIES[category]}
 *
 * Total examples: ${sortedChunks.length}
 * Excellent: ${excellentChunks.length}
 * Good: ${goodChunks.length}
 */

export const ${category.toUpperCase()}_SCENES = [
${sortedChunks.map(chunk => `  // ${chunk.id} - ${chunk.wordCount} words - ${chunk.tags?.join(', ') || 'no tags'}
  \`${chunk.text.replace(/`/g, '\\`')}\`,
`).join('\n')}
];

export const ${category.toUpperCase()}_METADATA = {
  category: '${category}',
  description: '${SCENE_CATEGORIES[category]}',
  totalExamples: ${sortedChunks.length},
  averageWords: ${Math.round(sortedChunks.reduce((sum, c) => sum + c.wordCount, 0) / sortedChunks.length)},
  commonTags: [${[...new Set(sortedChunks.flatMap(c => c.tags || []))].map(t => `'${t}'`).join(', ')}]
};
`;

    const filename = `${category}Scenes.js`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, filename),
      exportContent,
      'utf-8'
    );

    console.log(`[Categorize]    ✅ ${filename}: ${sortedChunks.length} scenes (${excellentChunks.length} excellent)`);
  }

  // Generate index file
  const categories = Object.keys(byCategory);
  const indexContent = `/**
 * Many-shot scene examples from Mystic River by Dennis Lehane
 * Auto-generated by categorizeWithGemini.js
 */

${categories.map(cat => `import { ${cat.toUpperCase()}_SCENES, ${cat.toUpperCase()}_METADATA } from './${cat}Scenes';`).join('\n')}

export const MANY_SHOT_SCENES = {
${categories.map(cat => `  ${cat}: ${cat.toUpperCase()}_SCENES,`).join('\n')}
};

export const MANY_SHOT_METADATA = {
${categories.map(cat => `  ${cat}: ${cat.toUpperCase()}_METADATA,`).join('\n')}
};

/**
 * Get scenes by category
 */
export function getScenesByCategory(category, limit = 50) {
  return MANY_SHOT_SCENES[category]?.slice(0, limit) || [];
}

/**
 * Get mixed scenes for general noir craft
 */
export function getMixedScenes(limit = 100) {
  const categories = Object.keys(MANY_SHOT_SCENES);
  const perCategory = Math.ceil(limit / categories.length);

  return categories.flatMap(cat =>
    MANY_SHOT_SCENES[cat].slice(0, perCategory)
  ).slice(0, limit);
}
`;

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'index.js'),
    indexContent,
    'utf-8'
  );

  console.log(`[Categorize]    ✅ index.js: Master export file`);

  // Summary
  console.log('\n[Categorize] 📊 Summary:');
  console.log(`[Categorize]    Categories: ${categories.length}`);
  console.log(`[Categorize]    Total scenes: ${manifest.filter(c => c.category).length}`);

  Object.entries(byCategory).forEach(([cat, chunks]) => {
    const excellent = chunks.filter(c => c.quality === 'excellent').length;
    console.log(`[Categorize]      ${cat}: ${chunks.length} (${excellent} excellent)`);
  });
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('[Categorize] Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };
