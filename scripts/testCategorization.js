#!/usr/bin/env node
/**
 * Test the categorization system with a small sample
 * Processes just 5 chunks to verify everything works
 */

const fs = require('fs');
const path = require('path');
const { llmService } = require('../src/services/LLMService');

const MANIFEST_PATH = './src/data/manyShot/chunks_manifest.json';

async function testCategorization() {
  console.log('[Test] Testing categorization with 5 sample chunks...\n');

  await llmService.init();

  if (!llmService.isConfigured()) {
    console.error('[Test] ❌ LLM service not configured.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const testChunks = manifest.slice(0, 5);  // Just 5 for testing

  console.log('[Test] Sample chunks:');
  testChunks.forEach(chunk => {
    console.log(`  ${chunk.id}: ${chunk.wordCount} words`);
    console.log(`    "${chunk.preview}"`);
    console.log('');
  });

  const prompt = `Categorize these 5 scenes from "Mystic River" noir novel:

Scene Categories:
- confrontation: Detective confronting suspect/witness/superior with tension
- investigation: Examining evidence, searching, piecing clues
- revelation: Character realizes something crucial
- atmospheric: Setting mood, noir environment
- dialogue_tension: Conversation with subtext
- internal_monologue: Character thoughts/analysis

For each scene, provide:
1. Primary category
2. Quality (excellent/good/average)
3. Brief reason (1 sentence)

${testChunks.map((chunk, i) => `
## Scene ${i + 1}: ${chunk.id}
${chunk.text.substring(0, 600)}...
`).join('\n')}

Return as JSON array:
[
  {
    "chunkId": "chunk_0001",
    "category": "investigation",
    "quality": "excellent",
    "reason": "Demonstrates methodical evidence examination with noir atmosphere"
  },
  ...
]`;

  try {
    const response = await llmService.complete(
      [{ role: 'user', content: prompt }],
      {
        temperature: 0.3,
        maxTokens: 2000,
        systemPrompt: 'You are a literary analyst specializing in noir fiction categorization.'
      }
    );

    console.log('[Test] ✅ Gemini Response:');
    console.log(response.content);
    console.log('');
    console.log('[Test] Token usage:', response.usage);
    console.log('');
    console.log('[Test] ✅ Test successful! You can now run the full categorization:');
    console.log('[Test]    node scripts/categorizeWithGemini.js');

  } catch (error) {
    console.error('[Test] ❌ Failed:', error.message);
    process.exit(1);
  }
}

testCategorization();
