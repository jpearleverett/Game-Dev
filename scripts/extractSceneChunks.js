#!/usr/bin/env node
/**
 * Extract scene chunks from Mystic River
 *
 * Since the text has no paragraph breaks, we'll use a sliding window approach:
 * - Find natural break points (sentence endings)
 * - Create 300-500 word chunks
 * - Preserve narrative coherence
 */

const fs = require('fs');
const path = require('path');

const NOVEL_PATH = './docs/storyreference.txt';
const OUTPUT_DIR = './src/data/manyShot';

console.log('[Extract] Loading novel...');
const fullText = fs.readFileSync(NOVEL_PATH, 'utf-8');

// Split into sentences (rough heuristic)
const sentences = fullText
  .split(/([.!?])\s+/)  // Split on sentence endings, keep punctuation
  .reduce((acc, part, i, arr) => {
    // Rejoin sentences with their punctuation
    if (i % 2 === 0 && i < arr.length - 1) {
      acc.push(part + arr[i + 1]);
    }
    return acc;
  }, []);

console.log(`[Extract] Found ${sentences.length.toLocaleString()} sentences`);

// Create chunks of 300-500 words
const TARGET_MIN = 300;
const TARGET_MAX = 500;

const chunks = [];
let currentChunk = [];
let currentWordCount = 0;

for (const sentence of sentences) {
  const words = sentence.trim().split(/\s+/);
  const wordCount = words.length;

  currentChunk.push(sentence);
  currentWordCount += wordCount;

  // If we're in the target range, save the chunk
  if (currentWordCount >= TARGET_MIN && currentWordCount <= TARGET_MAX) {
    chunks.push({
      text: currentChunk.join(' ').trim(),
      wordCount: currentWordCount,
      sentenceCount: currentChunk.length
    });
    currentChunk = [];
    currentWordCount = 0;
  }
  // If we've exceeded max, save what we have
  else if (currentWordCount > TARGET_MAX) {
    chunks.push({
      text: currentChunk.join(' ').trim(),
      wordCount: currentWordCount,
      sentenceCount: currentChunk.length
    });
    currentChunk = [];
    currentWordCount = 0;
  }
}

// Save remaining chunk if substantial
if (currentWordCount >= TARGET_MIN) {
  chunks.push({
    text: currentChunk.join(' ').trim(),
    wordCount: currentWordCount,
    sentenceCount: currentChunk.length
  });
}

console.log(`[Extract] Created ${chunks.length} chunks`);

// Create manifest with IDs and metadata
const manifest = chunks.map((chunk, index) => ({
  id: `chunk_${String(index + 1).padStart(4, '0')}`,
  wordCount: chunk.wordCount,
  sentenceCount: chunk.sentenceCount,
  preview: chunk.text.substring(0, 150).replace(/\s+/g, ' ') + '...',
  text: chunk.text,
  category: null,  // To be filled by Gemini
  tags: []         // To be filled by Gemini
}));

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Save manifest
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'chunks_manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf-8'
);

console.log(`[Extract] ✅ Saved manifest to ${OUTPUT_DIR}/chunks_manifest.json`);

// Stats
const avgWords = chunks.reduce((sum, c) => sum + c.wordCount, 0) / chunks.length;
console.log(`[Extract] Stats:`);
console.log(`[Extract]    Total chunks: ${chunks.length}`);
console.log(`[Extract]    Avg words per chunk: ${Math.round(avgWords)}`);
console.log(`[Extract]    Total words covered: ${chunks.reduce((sum, c) => sum + c.wordCount, 0).toLocaleString()}`);
