#!/usr/bin/env node
/**
 * Standalone test categorization script
 * Makes direct Gemini API calls without React Native dependencies
 * Works in plain Node.js on Termux
 */

const fs = require('fs');
const https = require('https');

const MANIFEST_PATH = './src/data/manyShot/chunks_manifest.json';

// Get API key from environment or config
function getGeminiApiKey() {
  // Try environment variable first
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  // Try reading from .env file
  try {
    const envContent = fs.readFileSync('.env', 'utf-8');
    const match = envContent.match(/GEMINI_API_KEY=(.+)/);
    if (match) {
      return match[1].trim();
    }
  } catch (err) {
    // .env doesn't exist or can't be read
  }

  return null;
}

// Make direct HTTPS request to Gemini API
function callGemini(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000,
      },
      systemInstruction: {
        parts: [{
          text: 'You are a literary analyst specializing in noir detective fiction. Categorize scenes precisely and consistently.'
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

      res.on('data', (chunk) => {
        data += chunk;
      });

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

    req.on('error', (err) => {
      reject(err);
    });

    req.write(requestBody);
    req.end();
  });
}

async function testCategorization() {
  console.log('[Test] Standalone categorization test\n');

  // Check for API key
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.error('[Test] ❌ No GEMINI_API_KEY found!');
    console.error('[Test] Set it with: export GEMINI_API_KEY="your-key-here"');
    console.error('[Test] Or add it to your .env file');
    process.exit(1);
  }

  console.log('[Test] ✅ API key found');

  // Load chunks
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const testChunks = manifest.slice(0, 5);

  console.log(`[Test] Testing with ${testChunks.length} sample chunks:\n`);
  testChunks.forEach((chunk, i) => {
    console.log(`  ${i + 1}. ${chunk.id} (${chunk.wordCount} words)`);
    console.log(`     "${chunk.preview}"\n`);
  });

  const prompt = `Categorize these 5 scenes from "Mystic River" noir novel.

Scene Categories:
- confrontation: Detective confronting suspect/witness/superior with tension
- investigation: Examining evidence, searching locations, piecing clues
- revelation: Character realizes something crucial
- atmospheric: Setting mood, noir environment description
- dialogue_tension: Conversation with subtext and conflict
- internal_monologue: Character thoughts, analysis, processing

For each scene, provide:
1. Primary category
2. Quality (excellent/good/average)
3. Brief reason (1 sentence)

Respond ONLY with a JSON array, no markdown formatting:
[
  {
    "chunkId": "chunk_0001",
    "category": "investigation",
    "quality": "excellent",
    "reason": "Demonstrates methodical evidence examination with noir atmosphere"
  }
]

Scenes to categorize:

${testChunks.map((chunk, i) => `
## Scene ${i + 1}: ${chunk.id}
[${chunk.wordCount} words]
${chunk.text.substring(0, 600)}...
`).join('\n')}

Remember: Return ONLY the JSON array, no other text.`;

  console.log('[Test] Calling Gemini API...\n');

  try {
    const response = await callGemini(prompt, apiKey);

    console.log('[Test] ✅ Response received:\n');
    console.log(response);
    console.log('\n');

    // Try to parse as JSON
    try {
      // Remove markdown code blocks if present
      let cleanJson = response.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleanJson);
      console.log('[Test] ✅ Valid JSON response!');
      console.log('[Test] Categorized scenes:');
      parsed.forEach(scene => {
        console.log(`  - ${scene.chunkId}: ${scene.category} (${scene.quality})`);
        console.log(`    Reason: ${scene.reason}`);
      });
      console.log('\n[Test] ✅ Test successful!');
      console.log('[Test] Ready to run full categorization with:');
      console.log('[Test]    node scripts/categorizeWithGeminiStandalone.js');
    } catch (parseErr) {
      console.log('[Test] ⚠️  Response is not JSON, but categorization worked');
      console.log('[Test] You may need to adjust the prompt or parse the response differently');
    }

  } catch (error) {
    console.error('[Test] ❌ Failed:', error.message);
    if (error.message.includes('401')) {
      console.error('[Test] API key may be invalid or expired');
    } else if (error.message.includes('429')) {
      console.error('[Test] Rate limit exceeded, wait a moment and retry');
    }
    process.exit(1);
  }
}

testCategorization();
