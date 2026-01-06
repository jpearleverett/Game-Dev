#!/usr/bin/env node
/**
 * Categorize scenes from Mystic River using Gemini
 *
 * Strategy:
 * 1. Split novel into scene chunks (~300-500 words)
 * 2. Use Gemini to classify each scene by type
 * 3. Save categorized scenes to organized files
 *
 * Scene Categories (aligned with your story beats):
 * - confrontation: Detective confronting suspect/witness/superior
 * - investigation: Examining evidence, searching locations
 * - revelation: Character realizes something crucial
 * - interrogation: Formal questioning scene
 * - atmospheric: Setting mood, noir atmosphere
 * - dialogue_tension: Conversation with underlying conflict
 * - internal_monologue: Character's thoughts/analysis
 * - darkest_moment: All hope seems lost
 * - decision_point: Character must choose between options
 */

const fs = require('fs');
const path = require('path');

// Read the extracted novel
const NOVEL_PATH = './docs/storyreference.txt';
const OUTPUT_DIR = './src/data/manyShot';

console.log('[Categorize] Loading Mystic River...');

const fullText = fs.readFileSync(NOVEL_PATH, 'utf-8');
const wordCount = fullText.split(/\s+/).length;

console.log(`[Categorize] Loaded ${wordCount.toLocaleString()} words`);

// Split into scenes (heuristic: paragraph breaks + min word count)
function extractScenes(text, minWords = 250, maxWords = 600) {
  // Split by double line breaks or chapter markers
  const paragraphs = text.split(/\n\n+|\. {2,}/);

  const scenes = [];
  let currentScene = [];
  let currentWordCount = 0;

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/);
    const paraWords = words.length;

    if (paraWords < 10) continue;  // Skip very short paragraphs

    currentScene.push(para.trim());
    currentWordCount += paraWords;

    // If we've reached min words and hit a good break point, save scene
    if (currentWordCount >= minWords && currentWordCount <= maxWords) {
      scenes.push(currentScene.join('\n\n'));
      currentScene = [];
      currentWordCount = 0;
    }
    // If we've exceeded max words, save anyway
    else if (currentWordCount > maxWords) {
      scenes.push(currentScene.join('\n\n'));
      currentScene = [];
      currentWordCount = 0;
    }
  }

  // Add remaining scene
  if (currentScene.length > 0) {
    scenes.push(currentScene.join('\n\n'));
  }

  return scenes;
}

console.log('[Categorize] Extracting scenes...');
const scenes = extractScenes(fullText);
console.log(`[Categorize] Found ${scenes.length} potential scenes`);

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Save scenes for manual review or batch processing
const scenesManifest = scenes.map((scene, index) => ({
  id: `scene_${String(index + 1).padStart(4, '0')}`,
  wordCount: scene.split(/\s+/).length,
  preview: scene.substring(0, 150) + '...',
  fullText: scene
}));

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'scenes_manifest.json'),
  JSON.stringify(scenesManifest, null, 2),
  'utf-8'
);

console.log(`[Categorize] ✅ Saved ${scenes.length} scenes to ${OUTPUT_DIR}/scenes_manifest.json`);
console.log('[Categorize] Next step: Run categorizeScenesWithGemini.js to classify scenes');
