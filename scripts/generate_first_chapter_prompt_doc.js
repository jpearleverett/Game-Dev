/**
 * Generates a docs markdown file that shows the full prompt content the LLM sees,
 * modified for a "Chapter 1 / no prior story" scenario.
 *
 * This script intentionally avoids importing React Native modules.
 * It loads the pure-data modules by transforming ESM exports into a CommonJS-like sandbox.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

/**
 * Load an ESM-ish module that only uses `export const` / `export function` / `export default`.
 * We transform exports into assignments inside a VM context and return the gathered bindings.
 */
function loadESMExports(modulePath) {
  const src = readFile(modulePath);

  const exported = [];
  const exportConstRe = /export\s+const\s+([A-Za-z0-9_]+)\s*=/g;
  const exportFnRe = /export\s+function\s+([A-Za-z0-9_]+)\s*\(/g;
  let m;
  while ((m = exportConstRe.exec(src))) exported.push(m[1]);
  while ((m = exportFnRe.exec(src))) exported.push(m[1]);

  // Transform source.
  let transformed = src
    // Drop `export default ...` (we don't need it; and it may refer to names we already export)
    .replace(/export\s+default\s+[\s\S]*?;\s*$/m, '')
    // export const -> const
    .replace(/export\s+const\s+/g, 'const ')
    // export function -> function
    .replace(/export\s+function\s+/g, 'function ');

  // Expose the collected bindings.
  transformed += `\n\nmodule.exports = { ${[...new Set(exported)].join(', ')} };`;

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(transformed, sandbox, { filename: modulePath });
  return sandbox.module.exports;
}

function extractTemplateLiteral(fullSource, constName) {
  // Extracts content between backticks for: const NAME = `...`;
  // This avoids relying on runtime imports.
  const re = new RegExp(`const\\s+${constName}\\s*=\\s*\\\`([\\s\\S]*?)\\\`;`);
  const m = fullSource.match(re);
  if (!m) throw new Error(`Failed to extract template literal for ${constName}`);
  return m[1];
}

function extractFunctionReturnTemplateLiteral(fullSource, funcName) {
  // Extract return template literal for: const funcName = () => { ... return `...`; ... };
  // This is a best-effort string extraction assuming one return template literal.
  const startIdx = fullSource.indexOf(`const ${funcName} = () => {`);
  if (startIdx === -1) throw new Error(`Failed to find function ${funcName}`);
  const slice = fullSource.slice(startIdx);
  const returnIdx = slice.indexOf('return `');
  if (returnIdx === -1) throw new Error(`Failed to find return template literal for ${funcName}`);
  const afterReturn = slice.slice(returnIdx + 'return `'.length);
  const endIdx = afterReturn.indexOf('`;');
  if (endIdx === -1) throw new Error(`Failed to find end of return template literal for ${funcName}`);
  return afterReturn.slice(0, endIdx);
}

function buildGroundingSection({ TIMELINE, ABSOLUTE_FACTS, WRITING_STYLE }, { includeStyle } = { includeStyle: true }) {
  const safe = (v) => (v === undefined || v === null ? '' : String(v));

  const timelineLines = [];
  const yearsAgo = TIMELINE?.yearsAgo || {};
  const yearKeys = Object.keys(yearsAgo)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a);
  for (const y of yearKeys) {
    const entry = yearsAgo[y];
    if (Array.isArray(entry)) {
      timelineLines.push(`- ${y} years ago:`);
      entry.forEach((e) => timelineLines.push(`  - ${safe(e)}`));
    } else {
      timelineLines.push(`- ${y} years ago: ${safe(entry)}`);
    }
  }

  const missing = (ABSOLUTE_FACTS?.fiveInnocents || [])
    .map((p, i) => `${i + 1}. ${p.name} — ${p.role || 'Missing person'}; symbol: ${p.symbol || 'UNKNOWN'}; status: ${p.status || 'Unknown'}`)
    .join('\n');

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
- Alias/Title: ${safe(ABSOLUTE_FACTS.antagonist.titleUsed)} (${safe(ABSOLUTE_FACTS.antagonist.aliasUsed)})
- Communication: ${safe(ABSOLUTE_FACTS.antagonist.communication?.method)}; ink: ${safe(ABSOLUTE_FACTS.antagonist.communication?.ink)}
- Motivation: "${safe(ABSOLUTE_FACTS.antagonist.motivation)}"

### SETTING
- City: ${safe(ABSOLUTE_FACTS.setting.city)}
- Atmosphere: ${safe(ABSOLUTE_FACTS.setting.atmosphere)}
- Core mystery: ${safe(ABSOLUTE_FACTS.setting.coreMystery)}

### CORE CONSTRAINT (Reveal timing)
- Jack does NOT know the Under-Map is real at the start of Chapter 2.
- The FIRST undeniable reveal that the world is not what it seems occurs at the END of subchapter 2A.
- Before the end of 2A, anomalies must be plausibly deniable; keep the uncanny at the edges.

### THE FIVE MISSING ANCHORS (Each tied to a glyph)
${missing}

### TIMELINE (Use exact numbers; never approximate)
${timelineLines.length ? timelineLines.join('\n') : '- (No timeline entries)'}
`;

  if (includeStyle) {
    section += `
### WRITING STYLE REQUIREMENTS
**Voice:** ${WRITING_STYLE.voice.perspective}, ${WRITING_STYLE.voice.tense}
**Tone:** ${WRITING_STYLE.voice.tone}
**Influences:** ${WRITING_STYLE.influences.join(', ')}

**MUST INCLUDE:**
${WRITING_STYLE.mustInclude.map((item) => `- ${item}`).join('\n')}

**ABSOLUTELY FORBIDDEN (Never use these):**
${WRITING_STYLE.absolutelyForbidden.map((item) => `- ${item}`).join('\n')}`;
  }

  return section;
}

function buildCharacterSection({ CHARACTER_REFERENCE }) {
  const { protagonist, antagonist, allies, villains, victims, secondary } = CHARACTER_REFERENCE;
  const formatExamples = (phrases) => phrases.map((phrase) => `  - "${phrase}"`).join('\n');

  return `## CHARACTER VOICES (Match these exactly)

### JACK HALLOWAY (Protagonist - Narration is close third-person on Jack)
Role: ${protagonist.role}, ${protagonist.age}
Voice: ${protagonist.voiceAndStyle.narrative}
Internal Monologue: ${protagonist.voiceAndStyle.internalMonologue}
Dialogue: ${protagonist.voiceAndStyle.dialogue}
Example Phrases:
${formatExamples(protagonist.voiceAndStyle.examplePhrases)}

### VICTORIA BLACKWELL / THE CONFESSOR / EMILY CROSS
Role: ${antagonist.role}
Aliases: ${antagonist.aliases.join(', ')}
Voice (Speaking): ${antagonist.voiceAndStyle.speaking}
Voice (Written): ${antagonist.voiceAndStyle.written}
Example Phrases:
${formatExamples(antagonist.voiceAndStyle.examplePhrases)}

### SARAH REEVES
Role: ${allies.sarahReeves.role}
Voice: ${allies.sarahReeves.voiceAndStyle.speaking}
Example Phrases:
${formatExamples(allies.sarahReeves.voiceAndStyle.examplePhrases)}

### ELEANOR BELLAMY
Role: ${allies.eleanorBellamy.role}
Voice: ${allies.eleanorBellamy.voiceAndStyle.speaking}
Example Phrases:
${formatExamples(allies.eleanorBellamy.voiceAndStyle.examplePhrases)}

### TOM WADE
Role: ${villains.tomWade.role}
Voice: ${villains.tomWade.voiceAndStyle?.speaking || 'Friendly surface with technical jargon as deflection'}
Note: Jack's longtime friend (met ~12 years ago) who knows city records/symbol reports better than he admits

### SILAS REED
Role: ${villains.silasReed.role}
Voice: ${villains.silasReed.voiceAndStyle.speaking}
Example Phrases:
${formatExamples(villains.silasReed.voiceAndStyle.examplePhrases)}

### HELEN PRICE
Role: ${villains.helenPrice.title} - ${villains.helenPrice.role}
Voice: ${villains.helenPrice.voiceAndStyle.speaking}
Example Phrases:
${formatExamples(villains.helenPrice.voiceAndStyle.examplePhrases)}

### CLAIRE THORNHILL
Role: ${victims.claireThornhill.role}
Voice: ${victims.claireThornhill.voiceAndStyle.speaking}
Example Phrases:
${formatExamples(victims.claireThornhill.voiceAndStyle.examplePhrases)}

### MARCUS WEBB
Role: ${secondary.marcusWebb.role}
Voice: ${secondary.marcusWebb.voiceAndStyle.speaking}
Example Phrases:
${formatExamples(secondary.marcusWebb.voiceAndStyle.examplePhrases)}`;
}

function buildCraftTechniquesSection({
  ENGAGEMENT_REQUIREMENTS,
  MICRO_TENSION_TECHNIQUES,
  SENTENCE_RHYTHM,
  ICEBERG_TECHNIQUE,
  SUBTEXT_REQUIREMENTS,
}) {
  return `## CRAFT TECHNIQUES - How to Write Compelling Prose

### ENGAGEMENT REQUIREMENTS

**Question Economy:** ${ENGAGEMENT_REQUIREMENTS.questionEconomy.description}
- Balance Rule: ${ENGAGEMENT_REQUIREMENTS.questionEconomy.balanceRule}
- Question Types: Mystery (plot), Character (relationships), Threat (tension), Thematic (meaning)

**Final Line Hook:** ${ENGAGEMENT_REQUIREMENTS.finalLineHook.description}
Techniques:
${ENGAGEMENT_REQUIREMENTS.finalLineHook.techniques.map((t) => `- ${t}`).join('\n')}

**Personal Stakes Progression:**
- Chapters 2-4: ${ENGAGEMENT_REQUIREMENTS.personalStakes.progression.chapters2to4}
- Chapters 5-7: ${ENGAGEMENT_REQUIREMENTS.personalStakes.progression.chapters5to7}
- Chapters 8-10: ${ENGAGEMENT_REQUIREMENTS.personalStakes.progression.chapters8to10}
- Chapters 11-12: ${ENGAGEMENT_REQUIREMENTS.personalStakes.progression.chapters11to12}

**Revelation Gradient:**
- Micro (every subchapter): ${ENGAGEMENT_REQUIREMENTS.revelationGradient.levels.micro}
- Chapter (end of each): ${ENGAGEMENT_REQUIREMENTS.revelationGradient.levels.chapter}
- Arc (chapters 4, 7, 10): ${ENGAGEMENT_REQUIREMENTS.revelationGradient.levels.arc}

**Dramatic Irony:** ${ENGAGEMENT_REQUIREMENTS.dramaticIrony.description}
${ENGAGEMENT_REQUIREMENTS.dramaticIrony.examples.map((e) => `- ${e}`).join('\n')}

**Emotional Anchor:** ${ENGAGEMENT_REQUIREMENTS.emotionalAnchor.description}
Rule: ${ENGAGEMENT_REQUIREMENTS.emotionalAnchor.rule}

### MICRO-TENSION TECHNIQUES
${MICRO_TENSION_TECHNIQUES.description}

Every paragraph MUST contain at least one:
${MICRO_TENSION_TECHNIQUES.elements.map((e) => `- ${e}`).join('\n')}

**Warning:** ${MICRO_TENSION_TECHNIQUES.warning}

### SENTENCE RHYTHM (Noir Cadence)
${SENTENCE_RHYTHM.description}

Pattern example:
${SENTENCE_RHYTHM.pattern}

Rules:
${SENTENCE_RHYTHM.rules.map((r) => `- ${r}`).join('\n')}

### THE ICEBERG TECHNIQUE
${ICEBERG_TECHNIQUE.description}

Applications:
${ICEBERG_TECHNIQUE.applications.map((a) => `- ${a}`).join('\n')}

Principle: ${ICEBERG_TECHNIQUE.principle}

### SUBTEXT IN DIALOGUE
${SUBTEXT_REQUIREMENTS.description}

Layers:
- Surface: ${SUBTEXT_REQUIREMENTS.layers.surface}
- Actual: ${SUBTEXT_REQUIREMENTS.layers.actual}

Examples:
${SUBTEXT_REQUIREMENTS.examples.map((e) => `"${e.surface}" → Subtext: "${e.subtext}"`).join('\n')}

**Rule:** ${SUBTEXT_REQUIREMENTS.rule}`;
}

function buildVoiceDNASection({ VOICE_DNA }, charactersInScene = []) {
  // Always include Jack's voice
  const voicesToInclude = ['jack'];
  charactersInScene.forEach((char) => {
    const normalizedChar = String(char || '').toLowerCase();
    if (normalizedChar.includes('victoria') || normalizedChar.includes('emily')) voicesToInclude.push('victoria');
    else if (normalizedChar.includes('sarah')) voicesToInclude.push('sarah');
    else if (normalizedChar.includes('tom') || normalizedChar.includes('wade')) voicesToInclude.push('tomWade');
    else if (normalizedChar.includes('eleanor')) voicesToInclude.push('eleanor');
    else if (normalizedChar.includes('claire')) voicesToInclude.push('claire');
  });
  const uniqueVoices = [...new Set(voicesToInclude)];

  let voiceSection = `
## CHARACTER VOICE DNA
Use these patterns to maintain consistent character voices:

`;

  uniqueVoices.forEach((voiceKey) => {
    const voice = VOICE_DNA[voiceKey];
    if (!voice) return;

    voiceSection += `### ${voice.name}
**Sentence Patterns:**
${voice.sentencePatterns.map((p) => `- ${p}`).join('\n')}

**Vocabulary Tendencies:**
${voice.vocabularyTendencies.map((v) => `- ${v}`).join('\n')}

**Physical Tells:**
${voice.physicalTells.map((t) => `- ${t}`).join('\n')}

**Dialogue Rhythm:**
${voice.dialogueRhythm.map((r) => `- ${r}`).join('\n')}

`;
  });

  return voiceSection;
}

function buildKnowledgeSection() {
  // Mirrors the empty-state output of StoryGenerationService._buildKnowledgeSection
  return `## CHARACTER KNOWLEDGE STATE

### WHAT JACK KNOWS:
- Just beginning investigation

### WHAT JACK SUSPECTS (but hasn't confirmed):
- None yet

### WHAT JACK DOES NOT YET KNOW (do not reveal prematurely):
- What the Under-Map truly is (until the end of 2A)
- Victoria Blackwell’s full agenda and constraints
`;
}

function buildConsistencySectionEmpty() {
  // Mirrors the empty-state output of StoryGenerationService._buildConsistencySection
  return `## CONSISTENCY VERIFICATION

### ESTABLISHED FACTS (Never contradict)

### YOUR CONSISTENCY RESPONSIBILITIES
1. In your "consistencyFacts" array, include 3-5 NEW specific facts from your narrative
   Examples: "Jack agreed to meet Sarah at the docks at midnight", "Victoria revealed she knows about the Thornhill case"

2. NEVER contradict:
   - Character names and relationships
   - Timeline durations when the story bible specifies exact numbers (do not “round” key relationships/events)
   - The reveal timing: Under-Map becomes undeniable at the END of 2A, not earlier
   - Setting tone (modern city; hidden layer; no Tolkien-style fantasy)
   - Player's path personality and decision consequences

3. If you introduced a plot thread (meeting, promise, revelation), it MUST be addressed eventually`;
}

function buildEngagementGuidanceSection(chapter, subchapter) {
  // Mirrors StoryGenerationService._buildEngagementGuidanceSection when storyArc is unavailable.
  const subLabel = ['A', 'B', 'C'][subchapter - 1];
  let section = `## ENGAGEMENT GUIDANCE FOR THIS CHAPTER

`;

  section += `\n### SUBCHAPTER ${subLabel} (NO PRIOR STORY) ROLE\n`;
  if (subchapter === 1) {
    section += `- This is the OPENING of the story\n`;
    section += `- Establish atmosphere, Jack’s baseline, and the inciting disruption\n`;
    section += `- Plant the first questions and seeds of the larger pattern\n`;
    section += `- Hook: End with a question or complication that demands continuation\n`;
  } else if (subchapter === 2) {
    section += `- This is the DEVELOPMENT of the opening chapter\n`;
    section += `- Escalate the tension and deepen the investigation\n`;
    section += `- Deliver at least one micro-revelation\n`;
    section += `- Hook: End with raised stakes or a turning point\n`;
  } else {
    section += `- This is the CLIMAX/DECISION of the opening chapter\n`;
    section += `- Deliver the emotional anchor moment\n`;
    section += `- Build to an impossible choice\n`;
    section += `- Hook: The decision itself is the ultimate cliffhanger\n`;
  }

  return section;
}

function getBeatType(subchapter) {
  const subchapterLabel = ['A', 'B', 'C'][subchapter - 1] || 'A';
  if (subchapter === 1) return `Opening/Hook (${subchapterLabel})`;
  if (subchapter === 2) return `Development/Conflict (${subchapterLabel})`;
  if (subchapter === 3) return `Resolution/Decision (${subchapterLabel})`;
  return `Subchapter ${subchapterLabel}`;
}

function getPacingGuidance(chapter) {
  if (chapter <= 4) {
    return {
      phase: 'RISING ACTION',
    };
  }
  if (chapter <= 7) return { phase: 'COMPLICATIONS' };
  if (chapter <= 10) return { phase: 'CONFRONTATIONS' };
  return { phase: 'RESOLUTION' };
}

function buildTaskSection({ GENERATION_CONFIG }, context, chapter, subchapter, { totalChapters = 12 } = {}) {
  // This mirrors the important fields of StoryGenerationService._buildTaskSection for empty story arc/outline.
  // It intentionally keeps the same "CURRENT TASK" structure and includes the path personality block.
  const chaptersRemaining = totalChapters - chapter;
  const subchapterLabel = ['A', 'B', 'C'][subchapter - 1];
  const pacing = getPacingGuidance(chapter);
  const personality = context.pathPersonality;

  let task = `## CURRENT TASK

Write **Chapter ${chapter}, Subchapter ${subchapter} (${subchapterLabel})**

### STORY POSITION
- Chapter ${chapter} of ${totalChapters} (${chaptersRemaining} remaining)
- Subchapter ${subchapter} of 3
- Current path: "${context.currentPosition.pathKey}"
- Phase: ${pacing.phase}`;

  task += `

### PLAYER PATH PERSONALITY (CRITICAL FOR CONSISTENCY)
Based on player's choices, Jack's behavior pattern is: **${personality.narrativeStyle}**
- Dialogue tone should be ${personality.dialogueTone}
- Risk tolerance: ${personality.riskTolerance}

**IMPORTANT:** Jack's actions and dialogue MUST reflect this established personality pattern.`;

  // Add personality-specific voice guidance, matching the StoryGenerationService logic for balanced (default).
  task += `

**BALANCED JACK VOICE NOTE:**
Jack adapts his approach to the situation. He can be patient when it serves him, aggressive when pushed. Match the narrative moment—if stakes are high and time is short, he acts; if information is needed, he investigates.`;

  // Word count guidance is embedded in MASTER_SYSTEM_PROMPT; keep a small reminder here.
  task += `

### OUTPUT REQUIREMENTS
- Return VALID JSON only (schema enforced by the engine)
- Use SINGLE QUOTES for all dialogue
- Ensure the canonical "narrative" string matches your branching segments exactly
- Do not contradict ABSOLUTE_FACTS or CONSISTENCY_RULES
- Maintain plausible deniability of the Under-Map until the end of 2A`;

  // For Chapter 1 there are no previous threads; still keep the rule.
  task += `

### PREVIOUS_ACTIVE_THREADS (Must be addressed)
- None (this is the first chapter; there are no prior threads to carry forward)`;

  return task;
}

function buildStoryContextEmpty(chapter, subchapter) {
  // A modified "no prior story" variant of the story summary section.
  const header = '## COMPLETE STORY SO FAR (FULL TEXT)\n\n';
  let summary = header;
  summary += '**CRITICAL: You are writing the opening of the story. There is no prior narrative.**\n';
  summary += '**Do NOT recap events that do not exist yet. Begin at the story’s inciting moment.**\n\n';
  summary += '(No prior chapters. This is the first generated subchapter.)\n\n';

  summary += `\n${'#'.repeat(80)}\n`;
  summary += `## OPENING REQUIREMENTS\n\n`;
  summary += `You are writing Chapter ${chapter}, Subchapter ${subchapter} (${['A', 'B', 'C'][subchapter - 1]}).\n\n`;
  summary += `1. **START** at the inciting incident with Jack in Ashport\n`;
  summary += `2. **ESTABLISH** atmosphere, baseline, and the first disruption\n`;
  summary += `3. **PLANT** questions and hooks; do not explain everything\n`;
  summary += `4. **END** with a forward-driving hook that demands the next subchapter\n`;
  summary += `${'#'.repeat(80)}\n`;
  return summary;
}

function modifyMasterSystemPromptForFirstChapter(prompt) {
  let out = prompt;

  out = out.replace(
    '## CONTINUATION MANDATE - THIS IS YOUR PRIMARY DIRECTIVE',
    '## OPENING MANDATE - THIS IS YOUR PRIMARY DIRECTIVE'
  );
  out = out.replace(
    '**You are continuing an ongoing story. You are NOT summarizing or starting fresh.**',
    '**You are writing the very first subchapter of the story. There is no prior story text.**'
  );

  // Replace the continuation bullets block with an opening-specific version.
  const blockStart = out.indexOf('Your narrative MUST:');
  const blockEnd = out.indexOf('## CRITICAL CONSTRAINTS');
  if (blockStart !== -1 && blockEnd !== -1 && blockEnd > blockStart) {
    const before = out.slice(0, blockStart);
    const after = out.slice(blockEnd);
    const replacement = `Your narrative MUST:
1. **BEGIN AT STORY START** (no prior scene exists; do not reference unseen events)
2. **ESTABLISH BASELINE**: Jack’s life, Ashport’s atmosphere, and the normal that will be pressured
3. **INTRODUCE THE INCITING DISRUPTION**: the first dead letter / first glyph / first impossible detail
4. **SHOW, DON'T TELL**: write the actual scenes, not summary

Your opening must feel inevitable and specific: rain, reflections, paper, ink, the city behaving almost normally.
The mystery pressure should start immediately, even if the Under-Map remains deniable.`;
    out = before + replacement + '\n\n' + after;
  }

  return out;
}

function main() {
  const workspace = '/workspace';
  const storyBiblePath = path.join(workspace, 'src/data/storyBible.js');
  const characterRefPath = path.join(workspace, 'src/data/characterReference.js');
  const storyGenServicePath = path.join(workspace, 'src/services/StoryGenerationService.js');

  const storyBible = loadESMExports(storyBiblePath);
  const characterRef = loadESMExports(characterRefPath);
  const storyGenSource = readFile(storyGenServicePath);

  const MIN_WORDS_PER_SUBCHAPTER = storyBible.GENERATION_CONFIG.wordCount.minimum;

  // MASTER_SYSTEM_PROMPT
  const masterPromptTemplate = extractTemplateLiteral(storyGenSource, 'MASTER_SYSTEM_PROMPT');
  const masterPromptRaw = new Function('MIN_WORDS_PER_SUBCHAPTER', `return \`${masterPromptTemplate}\`;`)(
    MIN_WORDS_PER_SUBCHAPTER
  );
  const masterPromptFirstChapter = modifyMasterSystemPromptForFirstChapter(masterPromptRaw);

  // STYLE_EXAMPLES
  const styleExamplesTemplate = extractTemplateLiteral(storyGenSource, 'STYLE_EXAMPLES');
  const STYLE_EXAMPLES = new Function('EXAMPLE_PASSAGES', `return \`${styleExamplesTemplate}\`;`)(
    storyBible.EXAMPLE_PASSAGES
  );

  // buildExtendedStyleExamples() return template
  const extendedTemplate = extractFunctionReturnTemplateLiteral(storyGenSource, 'buildExtendedStyleExamples');
  const EXTENDED_EXAMPLES = new Function(
    'EXTENDED_STYLE_GROUNDING',
    'ANNOTATED_EXAMPLES',
    'NEGATIVE_EXAMPLES',
    `return \`${extendedTemplate}\`;`
  )(storyBible.EXTENDED_STYLE_GROUNDING, storyBible.ANNOTATED_EXAMPLES, storyBible.NEGATIVE_EXAMPLES);

  // Static cache content (as LLM sees it when cache is used)
  const groundingNoStyle = buildGroundingSection(storyBible, { includeStyle: false });
  const characterSection = buildCharacterSection(characterRef);
  const craftSection = buildCraftTechniquesSection(storyBible);

  const styleSection = `## WRITING STYLE - Voice DNA Examples

Voice: ${storyBible.WRITING_STYLE.voice.perspective}, ${storyBible.WRITING_STYLE.voice.tense}
Tone: ${storyBible.WRITING_STYLE.voice.tone}

Influences:
${storyBible.WRITING_STYLE.influences.map((i) => `- ${i}`).join('\n')}

### Forbidden Patterns (NEVER use):
${storyBible.WRITING_STYLE.absolutelyForbidden.map((f) => `- ${f}`).join('\n')}

### Required Elements:
${storyBible.WRITING_STYLE.mustInclude.map((r) => `- ${r}`).join('\n')}

### Example Passages:
${Object.entries(storyBible.EXAMPLE_PASSAGES)
  .map(([key, passage]) => {
    return `**${key}**:
${passage}`;
  })
  .join('\n\n')}

${STYLE_EXAMPLES}

${EXTENDED_EXAMPLES}
`;

  const rulesSection = `## CONSISTENCY CHECKLIST - Self-Validation Rules

Before generating, verify these facts are never contradicted:

${storyBible.CONSISTENCY_RULES.map((rule) => `- ${rule}`).join('\n')}
`;

  const staticCacheContent = [
    '<story_bible>',
    groundingNoStyle,
    '</story_bible>',
    '',
    '<character_reference>',
    characterSection,
    '</character_reference>',
    '',
    '<craft_techniques>',
    craftSection,
    '</craft_techniques>',
    '',
    '<style_examples>',
    styleSection,
    '</style_examples>',
    '',
    '<consistency_rules>',
    rulesSection,
    '</consistency_rules>',
  ].join('\n\n');

  // Dynamic prompt (as sent alongside cached content)
  const chapter = 1;
  const subchapter = 1;
  const isDecisionPoint = false;
  const beatType = getBeatType(subchapter);

  const context = {
    previousChapters: [],
    establishedFacts: [],
    narrativeThreads: [],
    playerChoices: [],
    currentPosition: { chapter, subchapter, pathKey: 'ROOT' },
    pathKey: 'ROOT',
    // No choices yet => balanced default
    pathPersonality: {
      narrativeStyle: 'Jack balances intuition with evidence',
      dialogueTone: 'adapts to the situation',
      riskTolerance: 'moderate',
    },
  };

  const dynamicPrompt = [
    '<story_context>',
    buildStoryContextEmpty(chapter, subchapter),
    '</story_context>',
    '',
    '<character_knowledge>',
    buildKnowledgeSection().trimEnd(),
    '</character_knowledge>',
    '',
    '<voice_dna>',
    buildVoiceDNASection(characterRef, []).trimEnd(),
    '</voice_dna>',
    '',
    '<active_threads>',
    buildConsistencySectionEmpty().trimEnd(),
    '</active_threads>',
    '',
    '<engagement_guidance>',
    buildEngagementGuidanceSection(chapter, subchapter).trimEnd(),
    '</engagement_guidance>',
    '',
    `<task>
Write subchapter ${chapter}.${subchapter} (${beatType}).

Before writing, plan:
1. What narrative threads from ACTIVE_THREADS must be addressed?
2. What is the emotional anchor for this subchapter?
3. How does this advance the chapter beat (${beatType})?

${buildTaskSection(storyBible, context, chapter, subchapter).trimEnd()}
</task>

<self_critique>
After generating your narrative, review it against these quality gates:

1. **Intent Alignment**: Did I answer the beat requirements, not just write prose?
2. **Thread Continuity**: Did I address at least 2 CRITICAL threads explicitly?
3. **Emotional Authenticity**: Is there a genuine gut-punch moment, not just plot?
4. **Timeline Precision**: Are all durations EXACT per ABSOLUTE_FACTS (never approximate)?
5. **Hook Quality**: Does the final line create unbearable forward momentum?
6. **Forbidden Patterns**: Did I avoid all forbidden phrases and constructions?

If any check fails, revise before returning your response.
</self_critique>`,
  ].join('\n\n');

  // Schema: extract STORY_CONTENT_SCHEMA object literal text for documentation.
  // This is "as used by the engine" for structured outputs.
  const schemaStart = storyGenSource.indexOf('const STORY_CONTENT_SCHEMA = {');
  const schemaEnd = storyGenSource.indexOf('};\n\n/**\n * Schema for decision-only generation', schemaStart);
  if (schemaStart === -1 || schemaEnd === -1) throw new Error('Failed to extract STORY_CONTENT_SCHEMA');
  const storySchemaText = storyGenSource.slice(schemaStart, schemaEnd).trim();

  const doc = `## Full LLM prompt (as-seen) — Chapter 1 / no prior story

This document shows the **entire prompt content** your game’s story generator provides to the LLM, but modified to reflect a **brand-new run** (Chapter 1, Subchapter A, with **no prior story**).

Nothing is truncated.

---

## 1) System instruction (modified for “first chapter”)

\`\`\`text
${masterPromptFirstChapter}
\`\`\`

---

## 2) Cached static content (what the model has “in context” for every generation)

This is the content your engine caches (story bible, character voices, craft techniques, style grounding, and consistency rules).

\`\`\`text
${staticCacheContent}
\`\`\`

---

## 3) Dynamic prompt (Chapter 1.1 / Subchapter A; no prior story)

\`\`\`text
${dynamicPrompt}
\`\`\`

---

## 4) Structured output schema (STORY_CONTENT_SCHEMA)

Your engine enforces structured JSON output using this schema:

\`\`\`text
${storySchemaText}
\`\`\`
`;

  const outPath = path.join(workspace, 'docs/LLM_PROMPT_AS_SEEN_FIRST_CHAPTER_FULL.md');
  writeFile(outPath, doc);
  console.log(`Wrote ${outPath} (${doc.length} chars)`);
}

main();

