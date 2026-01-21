import { llmService } from '../LLMService';
import { CHARACTER_REFERENCE } from '../../data/characterReference';
import {
  ABSOLUTE_FACTS,
  ENGAGEMENT_REQUIREMENTS,
  EXAMPLE_PASSAGES,
  GENERATION_CONFIG,
  ICEBERG_TECHNIQUE,
  MICRO_TENSION_TECHNIQUES,
  SENTENCE_RHYTHM,
  STORY_STRUCTURE,
  SUBTEXT_REQUIREMENTS,
  TIMELINE,
  WRITING_STYLE,
} from '../../data/storyBible';
import {
  MIN_WORDS_PER_SUBCHAPTER,
  PATH_PERSONALITY_TRAITS,
  TOTAL_CHAPTERS,
  TRUNCATE_DESCRIPTION,
} from './constants';
import {
  STYLE_EXAMPLES,
  buildExtendedStyleExamples,
  buildManyShotExamples,
  buildMasterSystemPrompt,
  buildVoiceDNASection,
  getManyShotCategories,
} from './prompts';

// ==========================================================================
// PROMPT BUILDING - Structured prompts with grounding
// ==========================================================================

/**
 * Build extended style examples for cache (wrapper for buildExtendedStyleExamples)
 */
function _buildExtendedStyleExamplesForCache() {
  try {
    const examples = buildExtendedStyleExamples();
    // Verify content was actually built
    if (!examples || examples.length < 1000) {
      console.error('[StoryGenerationService] ⚠️ Extended style examples suspiciously short or empty!', {
        length: examples?.length || 0,
        expected: '5000+ chars',
      });
    } else {
      console.log(`[StoryGenerationService] ✅ Extended examples built: ${examples.length} chars`);
    }
    return examples;
  } catch (e) {
    console.error('[StoryGenerationService] ❌ FAILED to build extended style examples:', e.message);
    console.error('[StoryGenerationService] Stack:', e.stack);
    return '';
  }
}

const sanitizeCacheKeyPart = (value, fallback = 'default') => {
  const safe = String(value || '')
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return safe || fallback;
};

const getManyShotSignature = (beatType, chapterBeatType, hasExamples, rotationSeed = null) => {
  const { categories } = getManyShotCategories(beatType, chapterBeatType);
  const signature = hasExamples ? categories.join('_') : 'none';
  const rotationTag = Number.isFinite(rotationSeed) ? `r${Math.abs(Math.floor(rotationSeed))}` : 'r0';
  return sanitizeCacheKeyPart(`ms_${signature}_${rotationTag}`, 'ms_none');
};

/**
 * Build static content for caching (Story Bible, Characters, Craft Techniques, etc.)
 * This content doesn't change across requests and is perfect for caching.
 */
function _buildStaticCacheContent() {
  const parts = [];

  // Part 1: Story Bible Grounding (STATIC)
  // Avoid duplicating writing-style rules in cache: style lives in <style_examples>.
  const groundingSection = this._buildGroundingSection(null, { includeStyle: false });
  parts.push('<story_bible>');
  parts.push(groundingSection);
  parts.push('</story_bible>');
  console.log(`[Cache] Grounding section: ${groundingSection.length} chars`);

  // Part 2: Character Reference (STATIC)
  const characterSection = this._buildCharacterSection();
  parts.push('<character_reference>');
  parts.push(characterSection);
  parts.push('</character_reference>');
  console.log(`[Cache] Character section: ${characterSection.length} chars`);

  // Part 3: Craft Techniques (STATIC)
  const craftSection = this._buildCraftTechniquesSection();
  parts.push('<craft_techniques>');
  parts.push(craftSection);
  parts.push('</craft_techniques>');
  console.log(`[Cache] Craft techniques: ${craftSection.length} chars`);

  // Part 4: Writing Style Examples (STATIC)
  const extendedExamples = this._buildExtendedStyleExamplesForCache();
  console.log(`[Cache] Extended examples: ${extendedExamples.length} chars`);

  const styleSection = `## WRITING STYLE - Voice DNA Examples

Voice: ${WRITING_STYLE.voice.perspective}, ${WRITING_STYLE.voice.tense}
Tone: ${WRITING_STYLE.voice.tone}

Influences:
${WRITING_STYLE.influences.map(i => `- ${i}`).join('\n')}

### Forbidden Patterns (NEVER use):
${WRITING_STYLE.absolutelyForbidden.map(f => `- ${f}`).join('\n')}

### Required Elements:
${WRITING_STYLE.mustInclude.map(r => `- ${r}`).join('\n')}

${STYLE_EXAMPLES}

${extendedExamples}
`;
  parts.push('<style_examples>');
  parts.push(styleSection);
  parts.push('</style_examples>');
  console.log(`[Cache] Style section total: ${styleSection.length} chars`);

  // NOTE: Consistency rules NOT included in static cache - they are in _buildDynamicPrompt
  // so that thread data can be updated dynamically per request

  const fullContent = parts.join('\n\n');
  console.log(`[Cache] TOTAL static content: ${fullContent.length} chars (~${Math.round(fullContent.length / 4)} tokens est.)`);

  return fullContent;
}

/**
 * Get or create cache for static content (beat-specific many-shot cached)
 */
async function _ensureStaticCache(beatType, chapterBeatType) {
  const manyShotExamples = buildManyShotExamples(beatType, chapterBeatType, 15);
  const manyShotSignature = getManyShotSignature(beatType, chapterBeatType, Boolean(manyShotExamples));
  const cacheKey = `story_static_${manyShotSignature}_v${this.staticCacheVersion}`;

  const cachedKey = this.staticCacheKeysBySignature?.get(manyShotSignature);
  if (cachedKey) {
    const cached = await llmService.getCache(cachedKey);
    if (cached) {
      this.staticCacheKey = cachedKey;
      return cachedKey;
    }
    this.staticCacheKeysBySignature.delete(manyShotSignature);
  }

  // Check if cache exists
  const existing = await llmService.getCache(cacheKey);
  if (existing) {
    this.staticCacheKey = cacheKey;
    this.staticCacheKeysBySignature.set(manyShotSignature, cacheKey);
    console.log(`[StoryGenerationService] ♻️ Using existing static cache: ${cacheKey}`);
    return cacheKey;
  }

  // Create new cache
  console.log('[StoryGenerationService] 🔧 Creating static content cache...');

  // Per Gemini implicit caching docs: "put large and common contents at the beginning"
  // Many-shot examples (~20k tokens) are the largest stable content, so they go FIRST.
  // This maximizes implicit cache hits across requests with similar prefixes.
  const staticParts = [];
  if (manyShotExamples) {
    staticParts.push('<many_shot_examples>');
    staticParts.push(manyShotExamples);
    staticParts.push('</many_shot_examples>');
  }
  staticParts.push(this._buildStaticCacheContent());
  const staticContent = staticParts.join('\n\n');

  await llmService.createCache({
    key: cacheKey,
    model: 'gemini-3-flash-preview',
    systemInstruction: buildMasterSystemPrompt(),
    content: staticContent,
    ttl: '7200s', // 2 hours (story sessions typically < 2 hours)
    metadata: {
      version: this.staticCacheVersion,
      created: new Date().toISOString(),
      type: 'story_generation_static',
      manyShotSignature,
    },
  });

  this.staticCacheKey = cacheKey;
  this.staticCacheKeysBySignature.set(manyShotSignature, cacheKey);
  console.log(`[StoryGenerationService] ✅ Static cache created: ${cacheKey}`);

  return cacheKey;
}

/**
 * Get or create a chapter-start cache.
 * Includes the full static cache content PLUS beat-specific many-shot examples
 * and the story-so-far up to the end of the previous chapter.
 *
 * This reduces per-subchapter prompt size by moving the large shared prefix into an explicit cache.
 */
async function _ensureChapterStartCache(chapter, subchapter, effectivePathKey, choiceHistory, context) {
  const beatType = this._getBeatType(chapter, subchapter);
  const chapterBeatType = STORY_STRUCTURE.chapterBeatTypes?.[chapter];
  const rotationSeed = (Number.isFinite(chapter) ? chapter : 0) * 10 + (Number.isFinite(subchapter) ? subchapter : 0);
  const manyShotExamples = buildManyShotExamples(beatType, chapterBeatType, 15, { rotationSeed });
  const manyShotSignature = getManyShotSignature(beatType, chapterBeatType, Boolean(manyShotExamples), rotationSeed);

  // Hash only choices that occurred BEFORE this chapter; the chapter-start prefix should not depend
  // on decisions made inside the current chapter.
  const priorChoices = Array.isArray(choiceHistory)
    ? choiceHistory.filter((c) => {
        const ch = this._extractChapterFromCase(c?.caseNumber);
        return Number.isFinite(ch) ? ch < chapter : true;
      })
    : [];
  const priorChoicesHash = this._hashChoiceHistoryForCache(priorChoices);

  // Use a logical key to avoid collisions; store the actual cache key separately.
  const logicalKey = `chStart:${chapter}:path:${effectivePathKey}:beat:${manyShotSignature}:choices:${priorChoicesHash}:sv${this.staticCacheVersion}:v${this.chapterStartCacheVersion}`;
  const existingKey = this.chapterStartCacheKeys.get(logicalKey);
  if (existingKey) {
    const existing = await llmService.getCache(existingKey);
    if (existing) return existingKey;
    this.chapterStartCacheKeys.delete(logicalKey);
  }

  const safePath = String(effectivePathKey || 'ZZ').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) || 'ZZ';
  const cacheKey = `story_chStart_c${chapter}_${safePath}_${manyShotSignature}_sv${this.staticCacheVersion}_cv${this.chapterStartCacheVersion}_${priorChoicesHash}`;

  const existing = await llmService.getCache(cacheKey);
  if (existing) {
    this.chapterStartCacheKeys.set(logicalKey, cacheKey);
    console.log(`[StoryGenerationService] ♻️ Chapter-start cache HIT for Chapter ${chapter} (path: ${effectivePathKey})`);
    return cacheKey;
  }

  console.log(`[StoryGenerationService] 🔧 Creating chapter-start cache for Chapter ${chapter}...`);

  // Build static content (same payload as the normal static cache)
  const staticContent = this._buildStaticCacheContent();

  // Build story history up to end of previous chapter.
  const storyUpToPrevChapter = this._buildStorySummarySection(context, { maxChapter: chapter - 1 });

  // Chapter arc + outline are stable across A/B/C and help reduce repeated tokens.
  const chapterArc = context?.storyArc?.chapterArcs?.find((c) => c.chapter === chapter) || null;
  const chapterOutline = context?.chapterOutline || null;
  const arcAndOutline = `## CHAPTER GUIDANCE (Cached for this chapter)
${chapterArc ? `### Story Arc (Chapter ${chapter})
- Phase: ${chapterArc.phase || 'UNKNOWN'}
- Focus: ${chapterArc.primaryFocus || 'Unknown'}
${chapterArc.keyRevelation ? `- Key revelation: ${chapterArc.keyRevelation}` : ''}
${chapterArc.endingHook ? `- Ending hook: ${chapterArc.endingHook}` : ''}` : '### Story Arc\n- (Not available)'}

${chapterOutline ? `### Chapter Outline
Opening mood: ${chapterOutline.openingMood || 'Unknown'}
${Array.isArray(chapterOutline.mustReference) && chapterOutline.mustReference.length ? `Must reference:\n${chapterOutline.mustReference.slice(0, 8).map((x) => `- ${x}`).join('\n')}` : ''}` : '### Chapter Outline\n- (Not available)'}
`;

  // Per Gemini implicit caching docs: "put large and common contents at the beginning"
  // Many-shot examples (~20k tokens) are the largest stable content, so they go FIRST.
  const chapterCacheParts = [];
  if (manyShotExamples) {
    chapterCacheParts.push('<many_shot_examples>');
    chapterCacheParts.push(manyShotExamples);
    chapterCacheParts.push('</many_shot_examples>');
  }
  chapterCacheParts.push(
    staticContent,
    '<chapter_start_story_context>',
    storyUpToPrevChapter,
    '</chapter_start_story_context>',
    '<chapter_guidance>',
    arcAndOutline,
    '</chapter_guidance>'
  );

  const chapterCacheContent = chapterCacheParts.join('\n\n');

  await llmService.createCache({
    key: cacheKey,
    model: 'gemini-3-flash-preview',
    systemInstruction: buildMasterSystemPrompt(),
    content: chapterCacheContent,
    ttl: '7200s',
    metadata: {
      version: this.chapterStartCacheVersion,
      staticVersion: this.staticCacheVersion,
      chapter,
      pathKey: effectivePathKey,
      priorChoicesHash,
      manyShotSignature,
      created: new Date().toISOString(),
      type: 'story_generation_chapter_start',
    },
  });

  // Store cache content locally for prompt logging
  this.chapterStartCacheContent.set(cacheKey, {
    systemInstruction: buildMasterSystemPrompt(),
    content: chapterCacheContent,
  });

  this.chapterStartCacheKeys.set(logicalKey, cacheKey);
  console.log(`[StoryGenerationService] ✅ Chapter-start cache created: ${cacheKey}`);
  return cacheKey;
}

/**
 * Build dynamic prompt content (changes per request)
 * This is sent alongside the cached static content
 */
function _buildDynamicPrompt(
  context,
  chapter,
  subchapter,
  isDecisionPoint,
  { cachedHistoryMaxChapter = null } = {}
) {
  // NOTE: Many-shot examples are ALWAYS in the cache (static or chapter-start).
  // The includeManyShot parameter was removed to prevent duplication.
  const parts = [];

  // Per Gemini 3 docs: Use XML tags for structure clarity
  // "place your specific instructions or questions at the end of the prompt, after the data context"

  // Dynamic Part 1: Story context
  // If we're using a chapter-start cache, the story up to previous chapter is already cached.
  parts.push('<story_context>');
  if (Number.isFinite(cachedHistoryMaxChapter)) {
    const minChapter = Math.max(1, cachedHistoryMaxChapter + 1);
    parts.push(this._buildStorySummarySection(context, { minChapter, maxChapter: chapter }));
  } else {
    parts.push(this._buildStorySummarySection(context));
  }
  parts.push('</story_context>');

  // Dynamic Part 2: Character Knowledge State (who knows what)
  parts.push('<character_knowledge>');
  parts.push(this._buildKnowledgeSection(context));
  parts.push('</character_knowledge>');

  // Dynamic Part 3: Voice DNA + Many-Shot Examples (beat-specific)
  const charactersInScene = this._extractCharactersFromContext(context, chapter);
  const beatType = this._getBeatType(chapter, subchapter);
  const chapterBeatType = STORY_STRUCTURE.chapterBeatTypes?.[chapter];
  const chapterBeatLabel = chapterBeatType?.type || 'UNKNOWN';
  const rotationSeed = (Number.isFinite(chapter) ? chapter : 0) * 10 + (Number.isFinite(subchapter) ? subchapter : 0);

  // Voice DNA with recent dialogue examples
  const voiceDNA = buildVoiceDNASection(charactersInScene, context, chapter);
  if (voiceDNA) {
    parts.push('<voice_dna>');
    parts.push(voiceDNA);
    parts.push('</voice_dna>');
  }

  // NOTE: Many-shot examples are included in the cache (static or chapter-start).
  // They are NOT included here to avoid duplication. This is per Gemini best practices:
  // "put large and common contents at the beginning of your prompt" for implicit cache hits.
  // The many-shot examples (~20k tokens) are the largest stable content, so they go in cache.

  // NOTE: Dramatic irony section removed - LLM has creative freedom

  // Dynamic Part 4: Consistency Checklist (established facts + active threads)
  parts.push('<active_threads>');
  parts.push(this._buildConsistencySection(context));
  parts.push('</active_threads>');

  // Dynamic Part 6: Current Scene State (exact continuation point)
  const sceneState = this._buildSceneStateSection(context, chapter, subchapter);
  if (sceneState) {
    parts.push('<scene_state>');
    parts.push(sceneState);
    parts.push('</scene_state>');
  }

  // Dynamic Part 6.5: Character Dialogue History (voice consistency)
  // Only include if we have enough previous content (chapter 3+)
  if (chapter >= 3 && context.previousChapters?.length >= 3) {
    const dialogueHistory = this._extractCharacterDialogueHistory(context.previousChapters);
    const dialogueSection = this._buildDialogueHistorySection(dialogueHistory);
    if (dialogueSection) {
      parts.push('<character_voices>');
      parts.push(dialogueSection);
      parts.push('</character_voices>');
    }
  }

  // Dynamic Part 7: Personal Stakes & Engagement Guidance
  const engagementGuidance = this._buildEngagementGuidanceSection(context, chapter, subchapter);
  if (engagementGuidance) {
    parts.push('<engagement_guidance>');
    parts.push(engagementGuidance);
    parts.push('</engagement_guidance>');
  }

  // Dynamic Part 8: Current Task Specification (LAST per Gemini 3 best practices)
  const taskSpec = this._buildTaskSection(context, chapter, subchapter, isDecisionPoint);
  // Note: beatType already declared earlier for many-shot examples (line 5049)

  // Gemini 3 best practice: Anchor reasoning to context with transition phrase
  // NOTE: Self-critique checklist was moved to system prompt's <craft_quality_checklist>
  // to avoid duplication. Gemini 3's native thinking handles quality validation internally.
  parts.push(`
<task>
Based on all the context provided above (story_bible, character_reference, character_knowledge, voice_dna, many_shot_examples, story_context, active_threads, scene_state, engagement_guidance), write subchapter ${chapter}.${subchapter} (${beatType}; chapter beat: ${chapterBeatLabel}).

Before writing, plan internally (do not output the plan):
1. What narrative threads from ACTIVE_THREADS must be addressed?
2. What is the emotional anchor for this subchapter?
3. How does this advance the chapter beat (${chapterBeatLabel})?

${taskSpec}
</task>`);

  return parts.join('\n\n');
}

/**
 * Build the complete generation prompt with all context
 * LEGACY METHOD - kept for backward compatibility, but now uses caching internally
 */
function _buildGenerationPrompt(context, chapter, subchapter, isDecisionPoint) {
  const parts = [];

  // Part 1: Story Bible Grounding (RAG)
  // Note: includeStyle=false because style is in <style_examples>
  parts.push('<story_bible>');
  parts.push(this._buildGroundingSection(context, { includeStyle: false }));
  parts.push('</story_bible>');

  // Part 2: Complete Story So Far (FULL TEXT)
  parts.push('<story_context>');
  parts.push(this._buildStorySummarySection(context));
  parts.push('</story_context>');

  // Part 3: Character Reference
  parts.push('<character_reference>');
  parts.push(this._buildCharacterSection());
  parts.push('</character_reference>');

  // Part 4: Character Knowledge State (who knows what)
  parts.push('<character_knowledge>');
  parts.push(this._buildKnowledgeSection(context));
  parts.push('</character_knowledge>');

  // Part 5: Style Examples (Few-shot) + dynamic voice DNA
  // NOTE: Many-shot examples are now ALWAYS in the cache (static or chapter-start)
  // to avoid duplication and optimize for implicit caching.
  // Determine which characters might be in this scene based on context
  const charactersInScene = this._extractCharactersFromContext(context, chapter);
  const pathKey = context.pathKey || '';
  const choiceHistory = context.playerChoices || [];
  const beatType = this._getBeatType(chapter, subchapter);
  const chapterBeatType = STORY_STRUCTURE.chapterBeatTypes?.[chapter];
  const chapterBeatLabel = chapterBeatType?.type || 'UNKNOWN';
  // Calculate rotationSeed for consistent many-shot selection (used in cache, referenced here for context)
  const rotationSeed = (Number.isFinite(chapter) ? chapter : 0) * 10 + (Number.isFinite(subchapter) ? subchapter : 0);
  parts.push('<style_examples>');
  parts.push(this._buildStyleSection(charactersInScene, chapter, pathKey, choiceHistory, beatType, chapterBeatType, context));
  parts.push('</style_examples>');

  const voiceDNA = buildVoiceDNASection(charactersInScene, context, chapter);
  if (voiceDNA) {
    parts.push('<voice_dna>');
    parts.push(voiceDNA);
    parts.push('</voice_dna>');
  }

  // NOTE: Many-shot examples removed from non-cached path.
  // They are included in _ensureStaticCache() and _ensureChapterStartCache() instead.
  // This eliminates duplication and ensures consistent cache behavior.
  // If this is a fallback non-cached generation, many-shot examples may be missing,
  // but the style examples above provide sufficient guidance.

  // Part 6: Consistency Checklist
  parts.push('<active_threads>');
  parts.push(this._buildConsistencySection(context));
  parts.push('</active_threads>');

  // Part 7: Current Scene State (CRITICAL - exact continuation point)
  const sceneState = this._buildSceneStateSection(context, chapter, subchapter);
  if (sceneState) {
    parts.push('<scene_state>');
    parts.push(sceneState);
    parts.push('</scene_state>');
  }

  // Part 8: Personal Stakes & Engagement Guidance (from story arc)
  const engagementGuidance = this._buildEngagementGuidanceSection(context, chapter, subchapter);
  if (engagementGuidance) {
    parts.push('<engagement_guidance>');
    parts.push(engagementGuidance);
    parts.push('</engagement_guidance>');
  }

  // Part 9: Craft Techniques (static storyBible reference)
  parts.push('<craft_techniques>');
  parts.push(this._buildCraftTechniquesSection());
  parts.push('</craft_techniques>');

  // Part 10: Current Task Specification (LAST for recency effect)
  // Gemini 3 best practice: Anchor reasoning to context with transition phrase
  // NOTE: Self-critique checklist is in system prompt's <craft_quality_checklist>
  const taskSpec = this._buildTaskSection(context, chapter, subchapter, isDecisionPoint);
  parts.push(`
<task>
Based on all the context provided above (story_bible, character_reference, character_knowledge, voice_dna, many_shot_examples, story_context, active_threads, scene_state, engagement_guidance), write subchapter ${chapter}.${subchapter} (${beatType}; chapter beat: ${chapterBeatLabel}).

Before writing, plan internally (do not output the plan):
1. What narrative threads from ACTIVE_THREADS must be addressed?
2. What is the emotional anchor for this subchapter?
3. How does this advance the chapter beat (${chapterBeatLabel})?

${taskSpec}
</task>`);

  return parts.join('\n\n');
}

/**
 * Build craft techniques section with engagement requirements, micro-tension, rhythm, etc.
 * These are static techniques from storyBible that guide HOW to write compelling prose.
 */
function _buildCraftTechniquesSection() {
  return `## CRAFT TECHNIQUES - How to Write Compelling Prose

### ENGAGEMENT REQUIREMENTS

**Question Economy:** ${ENGAGEMENT_REQUIREMENTS.questionEconomy.description}
- Balance Rule: ${ENGAGEMENT_REQUIREMENTS.questionEconomy.balanceRule}
- Question Types: Mystery (plot), Character (relationships), Threat (tension), Thematic (meaning)

**Final Line Hook:** ${ENGAGEMENT_REQUIREMENTS.finalLineHook.description}
Techniques:
${ENGAGEMENT_REQUIREMENTS.finalLineHook.techniques.map(t => `- ${t}`).join('\n')}

**Personal Stakes Progression:**
- Chapters 1-4: ${ENGAGEMENT_REQUIREMENTS.personalStakes.progression.chapters1to4}
- Chapters 5-9: ${ENGAGEMENT_REQUIREMENTS.personalStakes.progression.chapters5to9}
- Chapters 10-12: ${ENGAGEMENT_REQUIREMENTS.personalStakes.progression.chapters10to12}

**Revelation Gradient:**
- Micro (every subchapter): ${ENGAGEMENT_REQUIREMENTS.revelationGradient.levels.micro}
- Chapter (end of each): ${ENGAGEMENT_REQUIREMENTS.revelationGradient.levels.chapter}
- Arc (chapters 4, 7, 10): ${ENGAGEMENT_REQUIREMENTS.revelationGradient.levels.arc}

**Emotional Anchor:** ${ENGAGEMENT_REQUIREMENTS.emotionalAnchor.description}
Rule: ${ENGAGEMENT_REQUIREMENTS.emotionalAnchor.rule}

### MICRO-TENSION TECHNIQUES
${MICRO_TENSION_TECHNIQUES.description}

Every paragraph MUST contain at least one:
${MICRO_TENSION_TECHNIQUES.elements.map(e => `- ${e}`).join('\n')}

**Warning:** ${MICRO_TENSION_TECHNIQUES.warning}

### SENTENCE RHYTHM (Noir Cadence)
${SENTENCE_RHYTHM.description}

Pattern example:
${SENTENCE_RHYTHM.pattern}

Rules:
${SENTENCE_RHYTHM.rules.map(r => `- ${r}`).join('\n')}

### THE ICEBERG TECHNIQUE
${ICEBERG_TECHNIQUE.description}

Applications:
${ICEBERG_TECHNIQUE.applications.map(a => `- ${a}`).join('\n')}

Principle: ${ICEBERG_TECHNIQUE.principle}

### SUBTEXT IN DIALOGUE
${SUBTEXT_REQUIREMENTS.description}

Layers:
- Surface: ${SUBTEXT_REQUIREMENTS.layers.surface}
- Actual: ${SUBTEXT_REQUIREMENTS.layers.actual}

Examples:
${SUBTEXT_REQUIREMENTS.examples.map(e => `"${e.surface}" → Subtext: "${e.subtext}"`).join('\n')}

**Rule:** ${SUBTEXT_REQUIREMENTS.rule}

### BRANCHING CHOICE DESIGN (For Interactive Narratives)

When generating branching choices (firstChoice options 1A/1B/1C and secondChoices options 1A-2A/1A-2B/1A-2C, 1B-2A/1B-2B/1B-2C, 1C-2A/1C-2B/1C-2C):

**Options A and B (Standard Choices):**
- Two distinct, logical approaches to the situation
- One typically more aggressive/direct, one more cautious/methodical
- Both should be defensible choices with meaningful consequences

**Option C (WILDCARD - Required for all C options):**
- The WILDCARD option should be unexpected, creative, or unconventional
- It offers a surprising third path that players might not have considered
- Examples of wildcard approaches:
  - Doing something seemingly unrelated that yields unexpected results
  - Taking a risky gamble or bold action outside normal behavior
  - Using humor, misdirection, or an unorthodox tactic
  - Acting on intuition rather than logic
  - Making an unexpected alliance or revealing hidden information
- The wildcard should still be IN CHARACTER for Jack (noir detective, not silly)
- It should feel like a "what if I tried THIS?" moment
- The response should deliver on the promise of the unexpected choice

**Wildcard Quality Check:**
- Does option C feel genuinely different from A and B? (Not just a third variation)
- Would a player be surprised and intrigued by this option?
- Does it add variety and replayability to the narrative?`;
}

/**
 * Extract characters likely to appear in a scene based on context
 */
function _extractCharactersFromContext(context, chapter) {
  const characters = [];

  // Always include Jack (protagonist)
  // Check story arc for chapter-specific characters
  if (this.storyArc?.chapterArcs) {
    const chapterArc = this.storyArc.chapterArcs.find(a => a.chapter === chapter);
    if (chapterArc?.innocentFeatured) {
      characters.push(chapterArc.innocentFeatured);
    }
  }

  // Check active threads for characters
  if (context.narrativeThreads) {
    context.narrativeThreads.forEach(thread => {
      if (thread.characters) {
        characters.push(...thread.characters);
      }
    });
  }

  // Check recent narrative for character mentions
  // Only check for Victoria - she's the only canonical character besides Jack who needs voice DNA
  // Other characters are LLM-generated and don't have predefined voice patterns
  if (context.previousChapters?.length > 0) {
    const recentChapter = context.previousChapters[context.previousChapters.length - 1];
    if (recentChapter?.narrative) {
      const narrative = recentChapter.narrative.toLowerCase();
      if (narrative.includes('victoria') || narrative.includes('blackwell')) characters.push('Victoria');
    }
  }

  // Deduplicate and return
  return [...new Set(characters)];
}

/**
 * Build engagement guidance section with personal stakes and emotional anchors
 */
function _buildEngagementGuidanceSection(context, chapter, subchapter) {
  let section = `## ENGAGEMENT GUIDANCE FOR THIS CHAPTER\n\n`;

  // Get chapter-specific guidance from story arc
  if (this.storyArc?.chapterArcs) {
    const chapterArc = this.storyArc.chapterArcs.find(a => a.chapter === chapter);
    if (chapterArc) {
      section += `### CHAPTER ${chapter} FOCUS\n`;
      section += `**Phase:** ${chapterArc.phase}\n`;
      section += `**Primary Focus:** ${chapterArc.primaryFocus}\n`;
      section += `**Tension Level:** ${chapterArc.tensionLevel}/10\n`;

      if (chapterArc.personalStakes) {
        section += `\n### PERSONAL STAKES (What Jack loses if he fails HERE)\n`;
        section += `${chapterArc.personalStakes}\n`;
        section += `\n**Make the reader FEEL this is at risk. Show it, don't tell it.**\n`;
      }

      if (chapterArc.emotionalAnchor) {
        section += `\n### EMOTIONAL ANCHOR (The gut-punch moment for this chapter)\n`;
        section += `${chapterArc.emotionalAnchor}\n`;
        section += `\n**This is not plot. This is FEELING. Write it to hit the reader in the chest.**\n`;
      }

      if (chapterArc.keyRevelation) {
        section += `\n### KEY REVELATION\n`;
        section += `${chapterArc.keyRevelation}\n`;
      }

      section += `\n### ENDING HOOK\n`;
      section += `This chapter should end with: "${chapterArc.endingHook}"\n`;
      section += `\n**For subchapter ${['A', 'B', 'C'][subchapter - 1]}: Build toward this ending while creating micro-hooks at the end of your subchapter.**\n`;
    }
  }

  // Add subchapter-specific guidance
  section += `\n### SUBCHAPTER ${['A', 'B', 'C'][subchapter - 1]} ROLE\n`;
  if (subchapter === 1) {
    section += `- This is the OPENING of the chapter\n`;
    section += `- Establish atmosphere and continue from the previous choice\n`;
    section += `- Plant the seeds of this chapter's conflict\n`;
    section += `- Hook: End with a question or complication that demands continuation\n`;
  } else if (subchapter === 2) {
    section += `- This is the MIDDLE of the chapter\n`;
    section += `- Escalate the tension established in A\n`;
    section += `- Deliver at least one micro-revelation\n`;
    section += `- Hook: End with raised stakes or a turning point\n`;
  } else {
    section += `- This is the CLIMAX/DECISION of the chapter\n`;
    section += `- Deliver the emotional anchor moment\n`;
    section += `- Build to an impossible choice\n`;
    section += `- Hook: The decision itself is the ultimate cliffhanger\n`;
  }

  return section;
}

/**
 * Build grounding section with absolute facts
 */
function _buildGroundingSection(context, { includeStyle = true } = {}) {
  const safe = (v) => (v === undefined || v === null ? '' : String(v));

  const timelineLines = [];
  // TIMELINE DATA SOURCE NOTE:
  // - `src/data/storyBible.js` currently stores Jack's timeline under `TIMELINE.jackHistory`
  //   (a mix of numeric keys + "childhood") and story start details under `TIMELINE.storyStart`.
  // - Older iterations used `TIMELINE.yearsAgo`.
  // This prompt builder supports BOTH so we don't silently drop canonical history.

  // Always include story-start anchor if available.
  if (TIMELINE?.storyStart) {
    if (TIMELINE.storyStart.anchorDate) timelineLines.push(`- Story starts on: ${safe(TIMELINE.storyStart.anchorDate)}`);
    if (TIMELINE.storyStart.jackAge) timelineLines.push(`- Jack's age at story start: ${safe(TIMELINE.storyStart.jackAge)}`);
    if (TIMELINE.storyStart.jackState) timelineLines.push(`- Jack's state at story start: ${safe(TIMELINE.storyStart.jackState)}`);
  }

  // Prefer explicit yearsAgo if present; otherwise fall back to jackHistory.
  const yearsAgo = TIMELINE?.yearsAgo;
  if (yearsAgo && typeof yearsAgo === 'object') {
    const yearKeys = Object.keys(yearsAgo)
      .map(k => Number(k))
      .filter(n => Number.isFinite(n))
      .sort((a, b) => b - a);
    for (const y of yearKeys) {
      const entry = yearsAgo[y];
      if (Array.isArray(entry)) {
        timelineLines.push(`- ${y} years ago:`);
        entry.forEach(e => timelineLines.push(`  - ${safe(e)}`));
      } else {
        timelineLines.push(`- ${y} years ago: ${safe(entry)}`);
      }
    }
  } else {
    const jackHistory = TIMELINE?.jackHistory;
    if (jackHistory && typeof jackHistory === 'object') {
      if (jackHistory.childhood) timelineLines.push(`- Childhood: ${safe(jackHistory.childhood)}`);

      const numericKeys = Object.keys(jackHistory)
        .filter(k => k !== 'childhood')
        .map(k => Number(k))
        .filter(n => Number.isFinite(n))
        .sort((a, b) => b - a);

      for (const k of numericKeys) {
        const entry = jackHistory[k];
        if (Array.isArray(entry)) {
          timelineLines.push(`- Timeline marker ${k}:`);
          entry.forEach(e => timelineLines.push(`  - ${safe(e)}`));
        } else {
          timelineLines.push(`- Timeline marker ${k}: ${safe(entry)}`);
        }
      }
    }
  }

  let section = `## STORY BIBLE - ABSOLUTE FACTS (Never contradict these)

### PROTAGONIST
- Name: ${safe(ABSOLUTE_FACTS.protagonist.fullName)}
- Age: ${safe(ABSOLUTE_FACTS.protagonist.age)}
- Status: ${safe(ABSOLUTE_FACTS.protagonist.currentStatus)}
- Work background: ${safe(ABSOLUTE_FACTS.protagonist.careerLength)}
- Residence: ${safe(ABSOLUTE_FACTS.protagonist.residence)}
- Vice: ${safe(ABSOLUTE_FACTS.protagonist.vices?.[0])}

### ANTAGONIST / GUIDE FIGURE
- Name: ${safe(ABSOLUTE_FACTS.antagonist.trueName)}
- Alias used: ${safe(ABSOLUTE_FACTS.antagonist.aliasUsed)}
- Public-facing role: ${safe(ABSOLUTE_FACTS.antagonist.occupation)}
- Communication: ${safe(ABSOLUTE_FACTS.antagonist.communication?.method)}; ink: ${safe(ABSOLUTE_FACTS.antagonist.communication?.ink)}
- Motivation: "${safe(ABSOLUTE_FACTS.antagonist.motivation)}"

### SETTING
- City: ${safe(ABSOLUTE_FACTS.setting.city)}
- Atmosphere: ${safe(ABSOLUTE_FACTS.setting.atmosphere)}
- Core mystery: ${safe(ABSOLUTE_FACTS.setting.coreMystery)}

### CREATIVE FREEDOM
- The LLM may generate any supporting characters, locations, and plot elements as the story requires.
- Only Jack Halloway and Victoria Blackwell have canonical definitions.

### TIMELINE (Use exact numbers; never approximate)
${timelineLines.length ? timelineLines.join('\n') : '- (No timeline entries)'}
`;

  // Writing style is large and repeated elsewhere; include only when needed.
  if (includeStyle) {
    section += `
### WRITING STYLE REQUIREMENTS
**Voice:** ${WRITING_STYLE.voice.perspective}, ${WRITING_STYLE.voice.tense}
**Tone:** ${WRITING_STYLE.voice.tone}
**Influences:** ${WRITING_STYLE.influences.join(', ')}

**MUST INCLUDE:**
${WRITING_STYLE.mustInclude.map(item => `- ${item}`).join('\n')}

**ABSOLUTELY FORBIDDEN (Never use these):**
${WRITING_STYLE.absolutelyForbidden.map(item => `- ${item}`).join('\n')}`;
  }

  return section;
}

/**
 * Build COMPLETE story history with FULL narratives
 *
 * With 1M token context window, we include the ENTIRE story text.
 * This ensures the LLM has full context for proper continuation.
 */
function _buildStorySummarySection(context, { minChapter = 1, maxChapter = Infinity } = {}) {
  const clampMin = Number.isFinite(minChapter) ? minChapter : 1;
  const clampMax = Number.isFinite(maxChapter) ? maxChapter : Infinity;

  // Guard: If maxChapter < minChapter (e.g., chapter 1 with maxChapter=0), no previous story exists
  if (clampMax < clampMin) {
    return '## STORY CONTEXT\n\n**This is the beginning of the story. No previous chapters exist.**\n';
  }

  const isFiltered = clampMin !== 1 || clampMax !== Infinity;
  const header = isFiltered
    ? `## STORY CONTEXT (FULL TEXT)\n\n**Included chapters:** ${clampMin} to ${clampMax === Infinity ? 'latest' : clampMax}\n\n`
    : '## COMPLETE STORY SO FAR (FULL TEXT)\n\n';

  let summary = header;
  summary += '**CRITICAL: You are continuing an ongoing story. Read ALL of this carefully.**\n';
  summary += '**Your new subchapter MUST continue EXACTLY from where the previous subchapter ended.**\n';
  summary += '**DO NOT summarize, skip, or rehash events. Pick up the narrative mid-scene if needed.**\n\n';

  // Build quick lookup: decision chapter -> choice object (from choice history)
  const choicesByChapter = new Map();
  if (Array.isArray(context.playerChoices)) {
    context.playerChoices.forEach((c) => {
      if (c?.chapter) choicesByChapter.set(c.chapter, c);
    });
  }

  // Sort all chapters chronologically, then filter by requested range.
  const allChapters = [...context.previousChapters].sort((a, b) => {
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.subchapter - b.subchapter;
  }).filter((ch) => ch.chapter >= clampMin && ch.chapter <= clampMax);

  // Track the immediately preceding subchapter for emphasis
  const currentChapter = context.currentPosition?.chapter;
  const currentSubchapter = context.currentPosition?.subchapter;

  // Find the immediately previous subchapter (within the filtered window)
  let immediatelyPrevious = null;
  if (currentSubchapter > 1) {
    // Previous subchapter in same chapter
    immediatelyPrevious = allChapters.find(
      ch => ch.chapter === currentChapter && ch.subchapter === currentSubchapter - 1
    );
  } else if (currentChapter > 1) {
    // Last subchapter of previous chapter
    immediatelyPrevious = allChapters.find(
      ch => ch.chapter === currentChapter - 1 && ch.subchapter === 3
    );
  }

  // ========== FULL NARRATIVE INCLUSION ==========
  // With Gemini 3's 1M token context window, the entire 12-chapter story (~42k tokens)
  // uses only ~4% of context capacity. No summarization needed - include everything.
  // Full context maximizes consistency across the 12-chapter arc.

  for (const ch of allChapters) {
    const isImmediatelyPrevious = (
      immediatelyPrevious &&
      ch.chapter === immediatelyPrevious.chapter &&
      ch.subchapter === immediatelyPrevious.subchapter
    );

    // Chapter header with emphasis for immediately previous
    if (isImmediatelyPrevious) {
      summary += `\n${'='.repeat(80)}\n`;
      summary += '### >>> IMMEDIATELY PREVIOUS SUBCHAPTER - CONTINUE FROM HERE <<<\n';
      summary += `### Chapter ${ch.chapter}, Subchapter ${ch.subchapter} (${['A', 'B', 'C'][ch.subchapter - 1]}): "${ch.title}"\n`;
      summary += `${'='.repeat(80)}\n\n`;
    } else {
      summary += `\n### Chapter ${ch.chapter}, Subchapter ${ch.subchapter} (${['A', 'B', 'C'][ch.subchapter - 1]}): "${ch.title}"\n\n`;
    }

    // Include FULL narrative text for ALL chapters - no summarization needed with 1M context
    if (ch.narrative) {
      summary += ch.narrative;
      summary += '\n';
    }

    // Mark decision points and what the player chose
    if (ch.subchapter === 3) {
      const choice = choicesByChapter.get(ch.chapter);
      if (choice?.optionKey) {
        const title = choice.optionTitle ? ` "${choice.optionTitle}"` : '';
        const focus = choice.optionFocus ? `\n   Focus: ${choice.optionFocus}` : '';
        summary += `\n[>>> PLAYER DECISION at end of Chapter ${ch.chapter}: CHOSE OPTION ${choice.optionKey}${title}${focus}`;

        // If this is the most recent decision affecting current chapter
        if (ch.chapter === currentChapter - 1) {
          summary += '\n   *** THIS CHOICE MUST DRIVE THE OPENING OF YOUR NARRATIVE ***';
          summary += '\n   *** SHOW THIS SCENE HAPPENING - DO NOT SKIP OR SUMMARIZE IT ***';
        }
        summary += ']\n';
      }

      // Also show the decision options that were presented
      // Handle both legacy (decision) and new (pathDecisions) formats
      // Use player's actual branching path for path-specific decision lookup
      let decisionData = ch.decision; // Default to legacy format
      if (ch.pathDecisions) {
        // Try to look up path-specific decision using player's branchingPath
        const playerPath = ch.branchingPath || '1A-2A';
        if (Array.isArray(ch.pathDecisions)) {
          decisionData = ch.pathDecisions.find(d => d.pathKey === playerPath)
            || ch.pathDecisions.find(d => d.pathKey === '1A-2A')
            || ch.pathDecisions[0]
            || ch.decision;
        } else {
          decisionData = ch.pathDecisions[playerPath] || ch.pathDecisions['1A-2A'] || ch.decision;
        }
      }
      // Handle both formats: options array (legacy) or optionA/optionB (new)
      const options = decisionData?.options || (decisionData?.optionA && decisionData?.optionB
        ? [{ key: 'A', ...decisionData.optionA }, { key: 'B', ...decisionData.optionB }]
        : null);
      if (options) {
        summary += '\n[Decision options were:\n';
        options.forEach(opt => {
          const chosen = choice?.optionKey === opt.key ? ' ← CHOSEN' : '';
          summary += `   ${opt.key}: "${opt.title}" - ${opt.focus}${chosen}\n`;
        });
        summary += ']\n';
      }
    }

    // Emphasize continuation point
    if (isImmediatelyPrevious) {
      summary += `\n${'='.repeat(80)}\n`;
      summary += '>>> YOUR NARRATIVE MUST CONTINUE FROM THE END OF THIS TEXT <<<\n';

      // Extract and highlight the last few sentences
      const sentences = ch.narrative?.match(/[^.!?]+[.!?]+/g) || [];
      if (sentences.length > 0) {
        const lastSentences = sentences.slice(-3).join(' ').trim();
        summary += `\nTHE STORY ENDED WITH:\n"${lastSentences}"\n`;
        summary += '\n>>> PICK UP EXACTLY HERE. What happens NEXT? <<<\n';
      }
      summary += `${'='.repeat(80)}\n`;
    }

    summary += '\n---\n';
  }

  // Add explicit player choice history section
  if (context.playerChoices.length > 0) {
    summary += '\n### PLAYER CHOICE HISTORY (All decisions made)\n';
    context.playerChoices.forEach(choice => {
      const title = choice.optionTitle ? `: "${choice.optionTitle}"` : '';
      const focus = choice.optionFocus ? ` (${choice.optionFocus})` : '';
      summary += `- Chapter ${choice.chapter} Decision: Option ${choice.optionKey}${title}${focus}\n`;
    });
    summary += '\n';
  }

  // NOTE: Continuation requirements are in _buildSceneStateSection and _buildTaskSection
  // to avoid duplication

  return summary;
}

/**
 * Build character reference section
 */
function _buildCharacterSection() {
  const { protagonist, antagonist } = CHARACTER_REFERENCE;

  // Helper to format example phrases
  const formatExamples = (phrases) => {
    return phrases.map(phrase => `  - "${phrase}"`).join('\n');
  };

  return `## CHARACTER VOICES (Defined Characters)

### JACK HALLOWAY (Protagonist - Narration is close third-person on Jack)
Role: ${protagonist.role}, ${protagonist.age}
Voice: ${protagonist.voiceAndStyle.narrative}
Internal Monologue: ${protagonist.voiceAndStyle.internalMonologue}
Dialogue: ${protagonist.voiceAndStyle.dialogue}
Example Phrases:
${formatExamples(protagonist.voiceAndStyle.examplePhrases)}

### VICTORIA BLACKWELL
Role: ${antagonist.role}
Aliases: ${antagonist.aliases.join(', ')}
Voice (Speaking): ${antagonist.voiceAndStyle.speaking}
Voice (Written): ${antagonist.voiceAndStyle.written}
Example Phrases:
${formatExamples(antagonist.voiceAndStyle.examplePhrases)}

### OTHER CHARACTERS
The LLM has creative freedom to generate any supporting characters as the story requires.
Create distinctive voices for any new characters that serve the narrative.`;
}

/**
 * Build task specification section
 * Now includes Story Arc and Chapter Outline guidance for 100% consistency
 */
function _buildTaskSection(context, chapter, subchapter, isDecisionPoint) {
  const chaptersRemaining = TOTAL_CHAPTERS - chapter;
  const subchapterLabel = ['A', 'B', 'C'][subchapter - 1];
  const pacing = this._getPacingGuidance(chapter);
  const personality = context.pathPersonality || PATH_PERSONALITY_TRAITS.BALANCED;

  // Get story arc guidance for this chapter
  const chapterArc = context.storyArc?.chapterArcs?.find(c => c.chapter === chapter);

  // Get chapter outline for subchapter guidance
  const outline = context.chapterOutline;
  const subchapterOutline = outline ? outline[`subchapter${subchapterLabel}`] : null;

  // Get beat type constraints for tempo variation
  const beatType = STORY_STRUCTURE.chapterBeatTypes?.[chapter];

  let task = `## CURRENT TASK

Write **Chapter ${chapter}, Subchapter ${subchapter} (${subchapterLabel})**

### STORY POSITION
- Chapter ${chapter} of ${TOTAL_CHAPTERS} (${chaptersRemaining} remaining)
- Subchapter ${subchapter} of 3
- Current path: "${context.currentPosition.pathKey}"
- Phase: ${pacing.phase}`;

  // ========== BEAT TYPE CONSTRAINTS (Tempo Variation) ==========
  if (beatType) {
    task += `

### CHAPTER BEAT TYPE: ${beatType.type} (MANDATORY)
**${beatType.description}**

This chapter MUST include:
${beatType.requirements.map(r => `- ${r}`).join('\n')}`;

    // Add beat-type-specific pacing instructions
    if (beatType.type === 'CHASE') {
      task += `

**CHASE PACING MANDATE:**
- Keep paragraphs under 4 sentences
- No internal monologue longer than 2 sentences
- Use ACTION VERBS: ran, ducked, slammed, grabbed, dove
- Short dialogue exchanges (1-2 lines max)
- Breathless sentence fragments are OK: "Corner. Left. Another alley."
- Physical sensations: burning lungs, pounding heart, rain in eyes
- Time pressure in every scene: "Thirty seconds. Maybe less."`;
    } else if (beatType.type === 'BOTTLE_EPISODE') {
      task += `

**BOTTLE EPISODE PACING MANDATE:**
- Extended dialogue exchanges (5+ back-and-forth minimum)
- Stay in ONE primary location the entire chapter
- Deep character exploration through conversation
- Allow pauses, silences, meaningful looks
- Internal monologue between dialogue beats
- No scene cuts to other locations
- Psychological tension over physical action`;
    } else if (beatType.type === 'CONFRONTATION' || beatType.type === 'BETRAYAL') {
      task += `

**CONFRONTATION PACING MANDATE:**
- Build to the confrontation through the first half
- The confrontation itself should be LONG and detailed
- Every word in the dialogue carries weight
- Physical descriptions of tension (clenched jaw, white knuckles)
- Allow for emotional gut-punches with space to breathe after`;
    } else if (beatType.wordCountModifier < 1.0) {
      task += `

**PACING NOTE:** This is a FAST-PACED chapter. Keep scenes short and punchy. Less exposition, more action.`;
    } else if (beatType.wordCountModifier > 1.0) {
      task += `

**PACING NOTE:** This is a DEEP chapter. Take time for dialogue and character exploration. Don't rush.`;
    }
  }

  // ========== NEW: Story Arc Guidance ==========
  if (chapterArc) {
    task += `

### STORY ARC GUIDANCE (Follow this for consistency)
- **Chapter Focus:** ${chapterArc.primaryFocus}
${chapterArc.innocentFeatured ? `- **Featured Innocent:** ${chapterArc.innocentFeatured}` : ''}
${chapterArc.keyRevelation ? `- **Key Revelation:** ${chapterArc.keyRevelation}` : ''}
- **Tension Level:** ${chapterArc.tensionLevel}/10
- **Ending Hook:** ${chapterArc.endingHook}
${chapterArc.decisionTheme ? `- **Decision Theme:** ${chapterArc.decisionTheme}` : ''}`;
  }

  // ========== NEW: Chapter Outline Guidance ==========
  if (subchapterOutline) {
    task += `

### SUBCHAPTER ${subchapterLabel} OUTLINE (Follow this structure)
- **Focus:** ${subchapterOutline.focus}
- **Key Beats:** ${subchapterOutline.keyBeats?.join(', ') || 'Build tension naturally'}
${subchapterOutline.endingTransition ? `- **Transition to next:** ${subchapterOutline.endingTransition}` : ''}`;

    if (isDecisionPoint && subchapterOutline.decisionSetup) {
      task += `
- **Decision Setup:** ${subchapterOutline.decisionSetup}
- **Option A Direction:** ${subchapterOutline.optionADirection || 'More direct approach'}
- **Option B Direction:** ${subchapterOutline.optionBDirection || 'More cautious approach'}`;
    }
  }

  // ========== NEW: Outline Causality + Must-Reference Anchors ==========
  if (outline?.openingCausality && subchapter === 1) {
    task += `

### OPENING CAUSALITY (Mandatory)
${outline.openingCausality}`;
  }
  if (Array.isArray(outline?.mustReference) && outline.mustReference.length > 0) {
    task += `

### MUST-REFERENCE ANCHORS (Mandatory)
${outline.mustReference.slice(0, 6).map((x) => `- ${x}`).join('\n')}`;
  }

  // ========== NEW: Narrative Thread Continuity ==========
  if (outline?.narrativeThreads?.length > 0) {
    task += `

### NARRATIVE THREADS (Weave these through the chapter)
${outline.narrativeThreads.map(t => `- ${t}`).join('\n')}`;
  }

  const baseTargetWords = GENERATION_CONFIG?.wordCount?.target || MIN_WORDS_PER_SUBCHAPTER;
  const promptTargetMultiplier = GENERATION_CONFIG?.wordCount?.promptTargetMultiplier || 1;
  const targetWords = Math.max(
    baseTargetWords,
    Math.round(baseTargetWords * promptTargetMultiplier)
  );
  const segmentMinWords = 300;
  const segmentMaxWords = 350;
  const totalSegments = 13; // opening + 3 firstChoice + 9 endings
  const totalMinWords = segmentMinWords * totalSegments;
  const totalMaxWords = segmentMaxWords * totalSegments;

  task += `

### PLAYER PATH PERSONALITY (CRITICAL FOR CONSISTENCY)
Based on player's choices, the protagonist's behavior pattern is: **${personality.narrativeStyle}**
- Dialogue tone should be ${personality.dialogueTone}
- Risk tolerance: ${personality.riskTolerance}
${personality.scores ? `- Cumulative scores: Aggressive=${personality.scores.aggressive.toFixed(0)}, Methodical=${personality.scores.methodical.toFixed(0)}` : ''}

**IMPORTANT:** ${ABSOLUTE_FACTS.protagonist.fullName}'s actions and dialogue MUST reflect this established personality pattern.`;

  // Add personality-specific voice examples
  if (personality.riskTolerance === 'high') {
    task += `

**AGGRESSIVE JACK VOICE EXAMPLES:**
Same scene, written for aggressive Jack:
- Entering a dangerous location: "Jack kicked the door open before better judgment could catch up. The warehouse stank of rust and old violence. Good. He was in the mood for both."
- Confronting a suspect: "Cut the crap," Jack said, grabbing his collar. "I know what you did. The only question is whether you tell me now, or I find out the hard way and come back angry."
- Internal monologue: "He'd spent years being the patient one. Look where it got him. This time, he wasn't waiting for permission."
- DO: Push, confront, act first and deal with consequences later
- DON'T: Hesitate, gather excessive evidence, wait patiently`;
  } else if (personality.riskTolerance === 'low') {
    task += `

**METHODICAL JACK VOICE EXAMPLES:**
Same scene, written for methodical Jack:
- Entering a dangerous location: "Jack circled the warehouse twice before going in. Noted the exits. The fire escape with the broken third rung. The way the security light flickered every forty seconds. Only then did he try the door."
- Confronting a suspect: "I've got some questions," Jack said, keeping his voice level. "You can answer them here, or I can come back with enough evidence to make this conversation unnecessary. Your choice."
- Internal monologue: "Patterns rewarded patience more than bravado. He could wait. He'd gotten good at waiting."
- DO: Observe, plan, build the case methodically, leverage information
- DON'T: Rush in, confront without evidence, take unnecessary risks`;
  } else {
    task += `

**BALANCED JACK VOICE NOTE:**
Jack adapts his approach to the situation. He can be patient when it serves him, aggressive when pushed. Match the narrative moment: if stakes are high and time is short, he acts; if information is needed, he investigates.`;
  }

  task += `

### DECISION CONSEQUENCES (Must be reflected in narrative)
${context.decisionConsequences?.immediate?.length > 0 ? context.decisionConsequences.immediate.map(c => `- ${c}`).join('\n') : '- No previous decisions yet'}

### ONGOING EFFECTS FROM CHOICES
${context.decisionConsequences?.ongoing?.length > 0 ? [...new Set(context.decisionConsequences.ongoing)].slice(0, 5).map(e => `- ${e}`).join('\n') : '- Starting fresh'}

### MOST RECENT PLAYER DECISION (This MUST drive this subchapter)
${context.lastDecision
  ? `- Decision: Chapter ${context.lastDecision.chapter} (${context.lastDecision.caseNumber}) => Option "${context.lastDecision.optionKey}"
- Chosen action: ${context.lastDecision.chosenTitle || '(title unavailable)'}
- Immediate consequence to OPEN ON: ${context.lastDecision.immediate}
- The road not taken: ${context.lastDecision.otherTitle || '(unknown)'}`
  : '- None (start of story)'}

### PACING REQUIREMENTS
${pacing.requirements.map(r => `- ${r}`).join('\n')}

### WRITING REQUIREMENTS
1. **PLAN FIRST:** Internally outline 3-5 major beats before writing. Do NOT output the outline.
2. **BRANCHING LENGTH REQUIREMENTS:**
   - Each narrative segment (opening + each response) must be ${segmentMinWords}-${segmentMaxWords} words.
   - Each complete path (opening + firstChoice response + ending response) must be >= ${MIN_WORDS_PER_SUBCHAPTER} words (target ~${targetWords}).
   - Total output across all segments should land around ${totalMinWords}-${totalMaxWords} words.
3. Continue DIRECTLY from where the last subchapter ended
4. Maintain third-person limited voice throughout (no first-person narration)
5. Reference specific events from previous chapters (show continuity)
6. Include: atmospheric description, internal monologue, dialogue
7. Build tension appropriate to ${pacing.phase} phase
8. **ENSURE the protagonist's behavior matches the path personality above**
9. **FOLLOW the story arc and chapter outline guidance above**`;

  // Add emphasis on recent decision if applicable (beginning of new chapter)
  if (subchapter === 1 && context.playerChoices.length > 0) {
    const lastChoice = context.playerChoices[context.playerChoices.length - 1];
    if (lastChoice.chapter === chapter - 1) {
      // Use the stored title/focus if available, otherwise fall back to key
      const choiceTitle = lastChoice.optionTitle || `Option ${lastChoice.optionKey}`;
      const choiceFocus = lastChoice.optionFocus ? `\nFOCUS: ${lastChoice.optionFocus}` : '';

      task += `\n\n### CRITICAL CONTEXT: PREVIOUS DECISION
The player JUST made a crucial decision at the end of the previous chapter.
You MUST SHOW THIS SCENE - do NOT skip it or summarize it as past events.

PLAYER'S CHOICE: "${choiceTitle}"${choiceFocus}

**MANDATORY REQUIREMENTS:**
1. The chapter MUST OPEN with Jack actively pursuing this choice - we see the scene unfold in real-time
2. DO NOT start with "After going to..." or "Having confronted..." - START IN THE MOMENT
3. The FIRST 200+ WORDS should be the actual scene of the chosen action
4. Show sensory details: what Jack sees, hears, feels as he takes this action
5. Include dialogue and character reactions from whoever Jack encounters

Example of WRONG approach: "After Jack confronted his contact at the wharf, he returned to his office..."
Example of CORRECT approach: "The salt wind cut through Jack's coat as he stepped onto the weathered planks of the wharf. A silhouette emerged from the fog..."`;
    }
  }

  if (isDecisionPoint) {
    task += `

### DECISION POINT REQUIREMENTS
This subchapter ends with a binary choice that becomes the chapter-ending decision.

**Return ONLY the base decision in the "decision" field** (intro, optionA, optionB).
Do NOT include pathDecisions in this response. Path-specific decisions are generated in a second call.

**DECISION DESIGN REQUIREMENTS:**
1. Present TWO distinct, defensible paths (Option A and Option B)
2. Both options must be morally complex - NO obvious "right" answer
3. The decision must feel EARNED by the current narrative
4. Connect to the themes of wrongful conviction, certainty vs truth
5. The intro should frame the dilemma in 1-2 sentences (max 50 words)

**For EACH option:**
- title: Action statement in imperative mood (3-8 words)
- focus: What this path prioritizes and what it risks (1 sentence)
- personalityAlignment: aggressive | cautious | balanced`;
  }

  return task;
}

/**
 * Build style examples section (few-shot learning)
 */
function _buildStyleSection(charactersInScene = [], chapter = 2, pathKey = '', choiceHistory = [], beatType = '', chapterBeatType = null, context = {}) {
  // Build extended examples section
  let extendedExamples = '';
  try {
    extendedExamples = buildExtendedStyleExamples();
    if (!extendedExamples || extendedExamples.length < 1000) {
      console.error('[StoryGen] ⚠️ Extended examples missing/short in _buildStyleSection!', extendedExamples?.length);
    }
  } catch (e) {
    console.error('[StoryGen] ❌ Extended examples FAILED:', e.message);
    extendedExamples = '';
  }

  // NOTE: Many-shot examples and voice DNA are injected separately to keep
  // cached and non-cached prompt structures consistent.

  return `## STYLE REFERENCE

Study this example passage and match its quality:

${EXAMPLE_PASSAGES.tenseMoment}

**Note the:** punchy sentences, sensory grounding, character voice through action, tension without melodrama.

${STYLE_EXAMPLES}

${extendedExamples}`;
}

/**
 * Build consistency verification section
 */
function _buildConsistencySection(context) {
  const cw = GENERATION_CONFIG?.contextWindowing || {};
  const maxFacts = cw.maxFactsInPrompt || 60;
  const maxThreads = cw.maxThreadsInPrompt || 30;
  const currentChapter = context.currentPosition?.chapter || 1;

  let section = `## CONSISTENCY VERIFICATION

### ESTABLISHED FACTS (Never contradict)
${context.establishedFacts.slice(0, maxFacts).map(f => `- ${f}`).join('\n')}`;

  // ========== ENHANCED THREAD PRIORITY INJECTION ==========
  // Sort threads by priority: urgency × overdue status
  // Critical/overdue threads MUST be addressed in the narrative
  if (context.narrativeThreads && context.narrativeThreads.length > 0) {
    // Calculate priority score for each thread
    const prioritizedThreads = context.narrativeThreads
      .filter(t => t.status === 'active')
      .map(t => {
        // Base priority from urgency
        let priority = t.urgency === 'critical' ? 3 : t.urgency === 'normal' ? 2 : 1;

        // Overdue bonus (threads past their due chapter)
        const isOverdue = t.dueChapter && currentChapter > t.dueChapter;
        if (isOverdue) priority += 5;

        // Type bonus (appointments/promises/threats are more urgent)
        const urgentTypes = ['appointment', 'promise', 'threat'];
        if (urgentTypes.includes(t.type)) priority += 1;

        return { ...t, priority, isOverdue };
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxThreads);

    // Separate mandatory vs optional threads
    const mandatoryThreads = prioritizedThreads.filter(t => t.priority >= 4 || t.isOverdue);
    const optionalThreads = prioritizedThreads.filter(t => t.priority < 4 && !t.isOverdue);

    // ========== MANDATORY THREAD REQUIREMENTS (Cannot be ignored) ==========
    if (mandatoryThreads.length > 0) {
      section += `\n\n${'='.repeat(60)}`;
      section += '\n### MANDATORY THREAD REQUIREMENTS';
      section += `\n${'='.repeat(60)}`;
      section += '\n**These threads MUST be addressed in your narrative. Failure to address them is a consistency violation.**\n';

      mandatoryThreads.forEach((t, idx) => {
        const overdueTag = t.isOverdue ? '⚠️ OVERDUE' : '';
        const priorityTag = t.urgency === 'critical' ? '🔴 CRITICAL' : '🟡 URGENT';
        const desc = t.description || t.excerpt || '';
        const truncatedDesc = desc.length > TRUNCATE_DESCRIPTION ? desc.slice(0, TRUNCATE_DESCRIPTION) + '...' : desc;

        section += `\n${idx + 1}. [${priorityTag}${overdueTag ? ' ' + overdueTag : ''}] ${t.type.toUpperCase()}`;
        section += `\n   "${truncatedDesc}"`;
        if (t.characters && t.characters.length > 0) {
          section += `\n   Characters: ${t.characters.join(', ')}`;
        }
        if (t.dueChapter) {
          section += `\n   Due by: Chapter ${t.dueChapter}${t.isOverdue ? ' (OVERDUE!)' : ''}`;
        }
        section += '\n';
      });

      section += '\n>>> YOU MUST address ALL threads above through dialogue or action, not just thoughts <<<';
      section += `\n${'='.repeat(60)}`;
    }

    // ========== ACTIVE THREADS (Should address if possible) ==========
    if (optionalThreads.length > 0) {
      section += '\n\n### ACTIVE THREADS (Address if narratively appropriate)';

      const threadsByType = {};
      optionalThreads.forEach(t => {
        if (!threadsByType[t.type]) threadsByType[t.type] = [];
        threadsByType[t.type].push(t);
      });

      Object.keys(threadsByType).forEach(type => {
        section += `\n**${type.toUpperCase()}:**`;
        threadsByType[type].forEach(t => {
          const desc = t.description || t.excerpt || '';
          const truncatedDesc = desc.length > TRUNCATE_DESCRIPTION ? desc.slice(0, TRUNCATE_DESCRIPTION) + '...' : desc;
          section += `\n- Ch${t.chapter || '?'}: "${truncatedDesc}"`;
        });
      });
    }
  }

  // NOTE: Thread handling rules (mandatory requirements, escalation) are defined in
  // the system prompt's <thread_accounting_rule> and <thread_escalation_rule> sections.
  // We don't repeat them here to avoid duplication and reduce token count.

  return section;
}

/**
 * Get pacing guidance based on chapter
 */
function _getBeatType(chapter, subchapter) {
  // Return a simple beat type description for the task prompt
  const subchapterLabel = ['A', 'B', 'C'][subchapter - 1] || 'A';
  if (subchapter === 1) return `Opening/Hook (${subchapterLabel})`;
  if (subchapter === 2) return `Development/Conflict (${subchapterLabel})`;
  if (subchapter === 3) return `Resolution/Decision (${subchapterLabel})`;
  return `Subchapter ${subchapterLabel}`;
}

function _getPacingGuidance(chapter) {
  const { protagonist, antagonist } = ABSOLUTE_FACTS;
  const { pacing } = STORY_STRUCTURE;

  // Get pacing data from STORY_STRUCTURE
  let pacingData;
  if (chapter <= 4) pacingData = pacing.chapters2to4;
  else if (chapter <= 7) pacingData = pacing.chapters5to7;
  else if (chapter <= 10) pacingData = pacing.chapters8to10;
  else pacingData = pacing.chapters11to12;

  // Build requirements based on phase
  const phaseRequirements = {
    'RISING ACTION': [
      'Continue establishing the mystery',
      'Introduce new suspects or complications',
      `${protagonist.fullName} should be actively investigating`,
      'Build relationships with allies/adversaries',
      'Plant seeds for later revelations',
    ],
    'COMPLICATIONS': [
      'Escalate stakes significantly',
      'Reveal betrayals or hidden connections',
      `${protagonist.fullName} faces increasing danger and doubt`,
      'Moral dilemmas become more complex',
      `${antagonist.trueName}\'s guidance and rules become clearer`,
    ],
    'CONFRONTATIONS': [
      'Major revelations about the pattern and the forces shaping it',
      `${protagonist.fullName} must confront what the city is doing - and what to do back`,
      'Allies may be lost or trust shattered',
      'The full shape of the pattern emerges',
      `Personal cost to ${protagonist.fullName} escalates dramatically`,
    ],
    'RESOLUTION': [
      'Final confrontation approaching or occurring',
      'All narrative threads coming together',
      `${protagonist.fullName} must make impossible, defining choices`,
      'The full scope of everything is revealed',
      'Consequences of all player choices manifest',
    ],
  };

  return {
    phase: pacingData.phase,
    requirements: phaseRequirements[pacingData.phase] || phaseRequirements['RISING ACTION'],
  };
}

/**
 * Build prompt for narrative generation with pre-determined decision (Pass 2)
 */
function _buildDecisionNarrativePrompt(context, chapter, subchapter, decisionStructure) {
  const basePrompt = this._buildGenerationPrompt(context, chapter, subchapter, true);

  const decisionGuidance = `

## PRE-DETERMINED DECISION (Your narrative MUST lead to this exact choice)
The following decision has already been designed. Your narrative must naturally build toward it.

### DECISION INTRO (Use this exact text or very close variation):
"${decisionStructure.decision.intro}"

### OPTION A: "${decisionStructure.decision.optionA.title}"
- Focus: ${decisionStructure.decision.optionA.focus}
- Personality: ${decisionStructure.decision.optionA.personalityAlignment}
- Narrative setup: ${decisionStructure.decision.optionA.narrativeSetup}

### OPTION B: "${decisionStructure.decision.optionB.title}"
- Focus: ${decisionStructure.decision.optionB.focus}
- Personality: ${decisionStructure.decision.optionB.personalityAlignment}
- Narrative setup: ${decisionStructure.decision.optionB.narrativeSetup}

### KEY MOMENTS TO INCLUDE:
${decisionStructure.keyMoments.map((m, i) => `${i + 1}. ${m}`).join('\n')}

### EMOTIONAL ARC:
${decisionStructure.emotionalArc}

### CRITICAL INSTRUCTION:
Copy the decision object EXACTLY as provided above into your response. Do not modify the decision titles, focus, or intro. Your narrative should make these choices feel earned and natural, but the decision text itself is FIXED.`;

  return basePrompt + decisionGuidance;
}

/**
 * Log the complete prompt sent to the LLM for debugging.
 * This outputs the EXACT prompt the LLM receives, including system instruction,
 * cached content, and dynamic prompt.
 *
 * @param {Object} options - Logging options
 * @param {string} options.caseNumber - Case being generated
 * @param {number} options.chapter - Chapter number
 * @param {number} options.subchapter - Subchapter number
 * @param {string} options.cacheKey - Cache key if using cached generation
 * @param {string} options.dynamicPrompt - Dynamic prompt content
 * @param {string} options.fullPrompt - Full prompt for non-cached generation
 * @param {boolean} options.isCached - Whether using cached generation
 */
function _logCompletePrompt({ caseNumber, chapter, subchapter, cacheKey, dynamicPrompt, fullPrompt, isCached }) {
  const separator = '='.repeat(80);
  const subSeparator = '-'.repeat(80);

  console.log(`\n${separator}`);
  console.log(`[FULL PROMPT] ${caseNumber} (Chapter ${chapter}.${subchapter}) - ${isCached ? 'CACHED' : 'NON-CACHED'} GENERATION`);
  console.log(`${separator}\n`);

  if (isCached && cacheKey) {
    // For cached generation, retrieve and log the cache content
    const cacheContent = this.chapterStartCacheContent.get(cacheKey);

    console.log(`${subSeparator}`);
    console.log('[PART 1: SYSTEM INSTRUCTION]');
    console.log(`${subSeparator}`);
    if (cacheContent?.systemInstruction) {
      console.log(cacheContent.systemInstruction);
    } else {
      console.log('(System instruction from cache - content not available locally)');
      console.log('Note: buildMasterSystemPrompt() is used as the system instruction.');
    }

    console.log(`\n${subSeparator}`);
    console.log('[PART 2: CACHED CONTENT (Static + Story Context)]');
    console.log(`${subSeparator}`);
    if (cacheContent?.content) {
      console.log(cacheContent.content);
    } else {
      console.log(`(Cached content not available locally - cache key: ${cacheKey})`);
      console.log('Cache was created in a previous session or content was not stored.');
    }

    console.log(`\n${subSeparator}`);
    console.log('[PART 3: DYNAMIC PROMPT (Sent with this request)]');
    console.log(`${subSeparator}`);
    if (dynamicPrompt) {
      console.log(dynamicPrompt);
    } else {
      console.log('(No dynamic prompt)');
    }

  } else {
    // For non-cached generation, log the system prompt and full prompt
    console.log(`${subSeparator}`);
    console.log('[PART 1: SYSTEM PROMPT]');
    console.log(`${subSeparator}`);
    console.log(buildMasterSystemPrompt());

    console.log(`\n${subSeparator}`);
    console.log('[PART 2: USER PROMPT (Full generation prompt)]');
    console.log(`${subSeparator}`);
    if (fullPrompt) {
      console.log(fullPrompt);
    } else {
      console.log('(No prompt content)');
    }
  }

  console.log(`\n${separator}`);
  console.log(`[END OF FULL PROMPT] ${caseNumber}`);
  console.log(`${separator}\n`);
}

export const promptAssemblyMethods = {
  setFullPromptLoggingEnabled(enabled = false) {
    this.fullPromptLoggingEnabled = Boolean(enabled);
  },
  _buildExtendedStyleExamplesForCache,
  _buildStaticCacheContent,
  _ensureStaticCache,
  _ensureChapterStartCache,
  _buildDynamicPrompt,
  _buildGenerationPrompt,
  _buildCraftTechniquesSection,
  _extractCharactersFromContext,
  _buildEngagementGuidanceSection,
  _buildGroundingSection,
  _buildStorySummarySection,
  _buildCharacterSection,
  _buildTaskSection,
  _buildStyleSection,
  _buildConsistencySection,
  _getBeatType,
  _getPacingGuidance,
  _buildDecisionNarrativePrompt,
  _logCompletePrompt,
};
