#!/usr/bin/env node
/**
 * Extract text from storyreference.docx (Mystic River)
 * Converts .docx XML to clean plain text
 */

const fs = require('fs');
const { execSync } = require('child_process');

const DOCX_PATH = './docs/storyreference.docx';
const OUTPUT_PATH = './docs/storyreference.txt';

console.log('[Extract] Extracting text from storyreference.docx...');

try {
  // Extract the word/document.xml from the .docx (which is a zip file)
  const xml = execSync(`unzip -p "${DOCX_PATH}" word/document.xml`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024  // 50MB buffer for large novels
  });

  // Parse XML to extract text content
  // Match all <w:t>text content</w:t> tags
  const textMatches = xml.matchAll(/<w:t[^>]*>([^<]+)<\/w:t>/g);
  const textParts = [];

  for (const match of textMatches) {
    textParts.push(match[1]);
  }

  // Join with spaces and clean up
  let fullText = textParts.join(' ');

  // Clean up common issues
  fullText = fullText
    .replace(/\s+/g, ' ')  // Multiple spaces -> single space
    .replace(/ \./g, '.')  // Space before period
    .replace(/ ,/g, ',')   // Space before comma
    .trim();

  // Write to output file
  fs.writeFileSync(OUTPUT_PATH, fullText, 'utf-8');

  const wordCount = fullText.split(/\s+/).length;
  const charCount = fullText.length;

  console.log(`[Extract] ✅ Success!`);
  console.log(`[Extract]    Output: ${OUTPUT_PATH}`);
  console.log(`[Extract]    Words: ${wordCount.toLocaleString()}`);
  console.log(`[Extract]    Characters: ${charCount.toLocaleString()}`);

} catch (error) {
  console.error('[Extract] ❌ Failed:', error.message);
  process.exit(1);
}
