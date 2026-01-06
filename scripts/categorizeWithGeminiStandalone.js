#!/usr/bin/env node
/**
 * Standalone categorization script
 * Makes direct Gemini API calls without React Native dependencies
 * Works in plain Node.js on Termux
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const MANIFEST_PATH = './src/data/manyShot/chunks_manifest.json';
const OUTPUT_DIR = './src/data/manyShot';
const BATCH_SIZE = 10;
const MAX_CHUNKS = process.env.MAX_CHUNKS ? parseInt(process.env.MAX_CHUNKS) : 100;

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

// Get API key
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

// Make API call
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

function saveProgress(manifest, results) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'categorization_results.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );
}

function generateCategoryFiles(manifest) {
  console.log('\n[Categorize] Generating category files...');

  const byCategory = {};
  manifest.forEach(chunk => {
    if (!chunk.category) return;
    if (!byCategory[chunk.category]) byCategory[chunk.category] = [];
    byCategory[chunk.category].push(chunk);
  });

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

    fs.writeFileSync(path.join(OUTPUT_DIR, `${category}Scenes.js`), exportContent, 'utf-8');
    console.log(`[Categorize]    ✅ ${category}Scenes.js: ${sortedChunks.length} scenes`);
  }

  // Generate index
  const categories = Object.keys(byCategory);
  const indexContent = `/**
 * Many-shot scene examples from Mystic River
 * Auto-generated by categorizeWithGeminiStandalone.js
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
  console.log(`[Categorize]    ✅ index.js created`);

  console.log('\n[Categorize] 📊 Summary:');
  Object.entries(byCategory).forEach(([cat, chunks]) => {
    const excellent = chunks.filter(c => c.quality === 'excellent').length;
    console.log(`[Categorize]      ${cat}: ${chunks.length} (${excellent} excellent)`);
  });
}

async function main() {
  console.log('[Categorize] Standalone categorization starting...\n');

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.error('[Categorize] ❌ No GEMINI_API_KEY found!');
    console.error('[Categorize] Set with: export GEMINI_API_KEY="your-key-here"');
    process.exit(1);
  }

  console.log('[Categorize] ✅ API key found');
  console.log(`[Categorize] Processing up to ${MAX_CHUNKS} chunks...\n`);

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const chunksToProcess = manifest.slice(0, MAX_CHUNKS);

  const results = [];
  let processed = 0;

  for (let i = 0; i < chunksToProcess.length; i += BATCH_SIZE) {
    const batch = chunksToProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunksToProcess.length / BATCH_SIZE);

    console.log(`[Batch ${batchNum}/${totalBatches}] Processing ${batch.length} chunks...`);

    try {
      const prompt = buildPrompt(batch);
      const response = await callGemini(prompt, apiKey);

      // Clean up markdown if present
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
        }
        results.push(scene);
        processed++;
      });

      console.log(`[Batch ${batchNum}/${totalBatches}] ✅ Complete (${processed}/${chunksToProcess.length} total)\n`);

      saveProgress(manifest, results);

      // Rate limiting
      if (i + BATCH_SIZE < chunksToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`[Batch ${batchNum}/${totalBatches}] ❌ Failed: ${error.message}`);
      console.error('[Categorize] Continuing with next batch...\n');
    }
  }

  console.log('\n[Categorize] ✅ Categorization complete!');
  console.log(`[Categorize] Processed: ${processed} chunks`);

  generateCategoryFiles(manifest);

  console.log('\n[Categorize] 🎉 Done! Files created in src/data/manyShot/');
  console.log('[Categorize] You can now integrate these into StoryGenerationService.js');
}

main().catch(error => {
  console.error('[Categorize] Fatal error:', error);
  process.exit(1);
});
