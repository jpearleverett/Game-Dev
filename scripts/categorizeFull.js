#!/usr/bin/env node
/**
 * Complete categorization with verbose logging
 * Run with: node scripts/categorizeFull.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const MANIFEST_PATH = './src/data/manyShot/chunks_manifest.json';
const OUTPUT_DIR = './src/data/manyShot';
const BATCH_SIZE = 10;

// Scene categories
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

function getGeminiApiKey() {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  try {
    const envContent = fs.readFileSync('.env', 'utf-8');
    const match = envContent.match(/GEMINI_API_KEY=(.+)/);
    if (match) return match[1].trim();
  } catch (err) {}
  return null;
}

function callGemini(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
      },
      systemInstruction: {
        parts: [{
          text: `You are a literary analyst specializing in noir detective fiction.

Your task is to categorize scenes from Dennis Lehane's "Mystic River" by their primary function in noir storytelling.

Scene Categories:
${Object.entries(SCENE_CATEGORIES).map(([key, desc]) => `- ${key}: ${desc}`).join('\n')}

Focus on:
1. Primary function - What is this scene's main purpose?
2. Quality - How well-crafted is it as a teaching example?
3. Techniques - What specific craft elements does it demonstrate?

Be precise and consistent. Categorization is for teaching AI to write noir fiction.

Respond ONLY with valid JSON, no markdown formatting.`
        }]
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API returned ${res.statusCode}: ${data}`));
          return;
        }
        try {
          const response = JSON.parse(data);
          const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            reject(new Error('No text in response'));
            return;
          }
          resolve(text);
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

function buildPrompt(chunks) {
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
  prompt += `5. Brief reason for categorization\n\n`;
  prompt += `Return ONLY this JSON structure:\n`;
  prompt += `{\n`;
  prompt += `  "scenes": [\n`;
  prompt += `    {\n`;
  prompt += `      "chunkId": "chunk_0001",\n`;
  prompt += `      "primaryCategory": "confrontation",\n`;
  prompt += `      "secondaryCategories": ["dialogue_tension"],\n`;
  prompt += `      "tags": ["dialogue-driven", "psychological"],\n`;
  prompt += `      "quality": "excellent",\n`;
  prompt += `      "reason": "Masterful use of subtext in confrontation"\n`;
  prompt += `    }\n`;
  prompt += `  ]\n`;
  prompt += `}\n`;

  return prompt;
}

function generateCategoryFiles(manifest) {
  console.log('\n[Generate] Creating category files...');

  const byCategory = {};
  let categorizedCount = 0;

  manifest.forEach(chunk => {
    if (!chunk.category) return;
    categorizedCount++;
    if (!byCategory[chunk.category]) byCategory[chunk.category] = [];
    byCategory[chunk.category].push(chunk);
  });

  console.log(`[Generate] Found ${categorizedCount} categorized chunks across ${Object.keys(byCategory).length} categories`);

  for (const [category, chunks] of Object.entries(byCategory)) {
    const excellentChunks = chunks.filter(c => c.quality === 'excellent');
    const goodChunks = chunks.filter(c => c.quality === 'good');
    const sortedChunks = [...excellentChunks, ...goodChunks];

    const exportContent = `/**
 * ${category.toUpperCase()} SCENES - Many-shot examples from Mystic River
 * ${SCENE_CATEGORIES[category]}
 * Total: ${sortedChunks.length} examples (${excellentChunks.length} excellent)
 */

export const ${category.toUpperCase()}_SCENES = [
${sortedChunks.map(chunk => `  \`${chunk.text.replace(/`/g, '\\`')}\`,\n`).join('')}];

export const ${category.toUpperCase()}_METADATA = {
  category: '${category}',
  description: '${SCENE_CATEGORIES[category]}',
  totalExamples: ${sortedChunks.length},
  averageWords: ${Math.round(sortedChunks.reduce((sum, c) => sum + c.wordCount, 0) / sortedChunks.length)},
};
`;

    const filePath = path.join(OUTPUT_DIR, `${category}Scenes.js`);
    fs.writeFileSync(filePath, exportContent, 'utf-8');
    console.log(`[Generate]   ✅ ${category}Scenes.js: ${sortedChunks.length} scenes (${excellentChunks.length} excellent)`);
  }

  // Generate index
  const categories = Object.keys(byCategory);
  const indexContent = `/**
 * Many-shot scene examples from Mystic River
 * Auto-generated from categorization
 */

${categories.map(cat => `import { ${cat.toUpperCase()}_SCENES, ${cat.toUpperCase()}_METADATA } from './${cat}Scenes';`).join('\n')}

export const MANY_SHOT_SCENES = {
${categories.map(cat => `  ${cat}: ${cat.toUpperCase()}_SCENES,`).join('\n')}
};

export const MANY_SHOT_METADATA = {
${categories.map(cat => `  ${cat}: ${cat.toUpperCase()}_METADATA,`).join('\n')}
};

export function getScenesByCategory(category, limit = 50) {
  return MANY_SHOT_SCENES[category]?.slice(0, limit) || [];
}

export function getMixedScenes(limit = 100) {
  const categories = Object.keys(MANY_SHOT_SCENES);
  const perCategory = Math.ceil(limit / categories.length);
  return categories.flatMap(cat =>
    MANY_SHOT_SCENES[cat].slice(0, perCategory)
  ).slice(0, limit);
}
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.js'), indexContent, 'utf-8');
  console.log('[Generate]   ✅ index.js created\n');

  return byCategory;
}

async function main() {
  console.log('='.repeat(60));
  console.log('MYSTIC RIVER SCENE CATEGORIZATION');
  console.log('='.repeat(60));

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.error('\n❌ No GEMINI_API_KEY found!');
    console.error('Set with: export GEMINI_API_KEY="your-key-here"');
    console.error('Or add to .env file: GEMINI_API_KEY=your-key-here\n');
    process.exit(1);
  }

  console.log('✅ API key found\n');

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  console.log(`📚 Loaded ${manifest.length} chunks\n`);

  const alreadyCategorized = manifest.filter(c => c.category).length;
  if (alreadyCategorized > 0) {
    console.log(`⚠️  Found ${alreadyCategorized} already categorized chunks`);
    console.log('Starting from where we left off...\n');
  }

  const results = [];
  let processed = 0;
  const totalBatches = Math.ceil(manifest.length / BATCH_SIZE);

  console.log(`Processing ${manifest.length} chunks in ${totalBatches} batches of ${BATCH_SIZE}`);
  console.log(`Estimated cost: ~$0.10\n`);
  console.log('='.repeat(60));

  for (let i = 0; i < manifest.length; i += BATCH_SIZE) {
    const batch = manifest.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    // Skip if all chunks in batch already categorized
    const uncategorized = batch.filter(c => !c.category);
    if (uncategorized.length === 0) {
      console.log(`[Batch ${batchNum}/${totalBatches}] ⏭️  Already done\n`);
      continue;
    }

    console.log(`[Batch ${batchNum}/${totalBatches}] Processing ${batch.length} chunks (${i + 1}-${Math.min(i + BATCH_SIZE, manifest.length)})...`);

    try {
      const prompt = buildPrompt(batch);
      const response = await callGemini(prompt, apiKey);

      // Clean markdown if present
      let cleanJson = response.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/```\n?/g, '');
      }

      const categorized = JSON.parse(cleanJson);

      categorized.scenes.forEach(scene => {
        const chunkIndex = manifest.findIndex(c => c.id === scene.chunkId);
        if (chunkIndex >= 0) {
          manifest[chunkIndex].category = scene.primaryCategory;
          manifest[chunkIndex].secondaryCategories = scene.secondaryCategories || [];
          manifest[chunkIndex].tags = scene.tags || [];
          manifest[chunkIndex].quality = scene.quality;
          manifest[chunkIndex].categoryReason = scene.reason;
          processed++;
        }
        results.push(scene);
      });

      console.log(`[Batch ${batchNum}/${totalBatches}] ✅ Categorized ${batch.length} scenes`);
      console.log(`[Batch ${batchNum}/${totalBatches}] 📊 Progress: ${processed}/${manifest.length} (${Math.round(processed/manifest.length*100)}%)\n`);

      // Save progress after each batch
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
      fs.writeFileSync(
        path.join(OUTPUT_DIR, 'categorization_results.json'),
        JSON.stringify(results, null, 2),
        'utf-8'
      );

      // Rate limiting
      if (i + BATCH_SIZE < manifest.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`[Batch ${batchNum}/${totalBatches}] ❌ Error: ${error.message}`);
      console.log('Progress saved. You can re-run to continue from here.\n');

      // Still save progress
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');

      // Ask if should continue
      console.log('Continuing with next batch...\n');
    }
  }

  console.log('='.repeat(60));
  console.log(`✅ Categorization complete!`);
  console.log(`📊 Processed ${processed} chunks\n`);

  const byCategory = generateCategoryFiles(manifest);

  console.log('='.repeat(60));
  console.log('📈 FINAL SUMMARY');
  console.log('='.repeat(60));

  Object.entries(byCategory).forEach(([cat, chunks]) => {
    const excellent = chunks.filter(c => c.quality === 'excellent').length;
    const good = chunks.filter(c => c.quality === 'good').length;
    const average = chunks.filter(c => c.quality === 'average').length;
    console.log(`${cat.padEnd(20)} ${chunks.length.toString().padStart(3)} total (${excellent} excellent, ${good} good, ${average} average)`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('🎉 DONE!');
  console.log('='.repeat(60));
  console.log('\nFiles created in src/data/manyShot/:');
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.js'));
  files.forEach(f => console.log(`  - ${f}`));
  console.log('\nNext step: Integrate into StoryGenerationService.js');
  console.log('See MANY_SHOT_WORKFLOW.md for integration examples\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
