export const formatSubchapterLabel = (subchapter) => ['A', 'B', 'C'][subchapter - 1] || String(subchapter);

export const fillTemplate = (template, replacements, { label } = {}) => {
  let result = String(template || '');
  for (const [key, value] of Object.entries(replacements || {})) {
    const safeValue = value == null ? '' : String(value);
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(pattern, safeValue);
  }

  const unresolved = result.match(/\{\{[^}]+\}\}/g);
  if (unresolved && unresolved.length > 0) {
    const contextLabel = label ? ` (${label})` : '';
    const message = `Unresolved template placeholders${contextLabel}: ${[...new Set(unresolved)].join(', ')}`;
    console.error(`[StoryGenerationService] ${message}`);
    throw new Error(message);
  }

  return result;
};

/**
 * Get name variants for character matching
 * NOTE: Only Jack and Victoria are canonical - other characters are LLM-generated
 */
export const getCharacterNameVariants = (charKey) => {
  const variants = {
    jack: ['Jack', 'Halloway'],
    victoria: ['Victoria', 'Blackwell'],
  };
  return variants[charKey] || [charKey];
};

/**
 * Extract recent dialogue from the last 2 chapters for specified characters
 */
export const extractRecentDialogue = (context, currentChapter, characterKeys) => {
  const dialogueMap = {};
  characterKeys.forEach(key => { dialogueMap[key] = []; });

  if (!context.chapters || context.chapters.length === 0) {
    return dialogueMap;
  }

  // Get last 2 chapters of content
  const startChapter = Math.max(1, currentChapter - 2);
  const chaptersToScan = [];

  for (let ch = startChapter; ch < currentChapter; ch++) {
    const chapterData = context.chapters.find(c => c.chapter === ch);
    if (chapterData && chapterData.subchapters) {
      chapterData.subchapters.forEach(sub => {
        if (sub.narrative) {
          chaptersToScan.push(sub.narrative);
        }
        // Also check branching narrative paths if they exist
        if (sub.branchingNarrative) {
          const bn = sub.branchingNarrative;
          if (bn.opening?.text) chaptersToScan.push(bn.opening.text);
          if (bn.firstChoice?.options) {
            bn.firstChoice.options.forEach(opt => {
              if (opt.response) chaptersToScan.push(opt.response);
            });
          }
          if (bn.secondChoices) {
            bn.secondChoices.forEach(sc => {
              if (sc.options) {
                sc.options.forEach(opt => {
                  if (opt.response) chaptersToScan.push(opt.response);
                });
              }
            });
          }
        }
      });
    }
  }

  // Extract dialogue using simple regex matching
  // Looking for patterns like: "..." said Victoria, Victoria said "...", "dialogue."
  characterKeys.forEach(charKey => {
    const charNames = getCharacterNameVariants(charKey);
    const allText = chaptersToScan.join(' ');

    charNames.forEach(name => {
      // Pattern 1: "dialogue" said Name / Name said "dialogue"
      const pattern1 = new RegExp(`[""]([^""]{10,100})[""]\\s*(?:said|asked|replied|whispered|muttered)\\s+${name}`, 'gi');
      const pattern2 = new RegExp(`${name}\\s+(?:said|asked|replied|whispered|muttered)\\s*[""]([^""]{10,100})[""]`, 'gi');

      let matches1 = allText.matchAll(pattern1);
      let matches2 = allText.matchAll(pattern2);

      for (const match of matches1) {
        if (dialogueMap[charKey].length < 3) {
          dialogueMap[charKey].push(match[1].trim());
        }
      }

      for (const match of matches2) {
        if (dialogueMap[charKey].length < 3) {
          dialogueMap[charKey].push(match[1].trim());
        }
      }
    });
  });

  return dialogueMap;
};
