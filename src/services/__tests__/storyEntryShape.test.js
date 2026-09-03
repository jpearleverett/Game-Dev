/**
 * CLAUDE.md §5 invariant #3: the generated storyEntry is built from a field
 * whitelist, and it MUST carry the Under-Map fields. It once did not, and the
 * board stayed empty for every generated chapter — the player read a scene,
 * tapped nothing, and reached a CONNECT gate with no material.
 *
 * The whitelist lives inside a long async function, so rather than trying to
 * drive a whole generation, this reads the source and asserts the shape. That
 * is enough to catch the failure mode: a field-list edit that drops one of them.
 */

const fs = require('fs');
const path = require('path');

const GENERATION_SRC = fs.readFileSync(
  path.join(__dirname, '../storyGeneration/generation.js'),
  'utf8',
);

const storyEntryBlock = () => {
  const start = GENERATION_SRC.indexOf('const storyEntry = {');
  expect(start).toBeGreaterThan(-1);
  const end = GENERATION_SRC.indexOf('\n      };', start);
  expect(end).toBeGreaterThan(start);
  return GENERATION_SRC.slice(start, end);
};

describe('the generated storyEntry carries everything the game reads back', () => {
  const block = storyEntryBlock();

  test.each([
    ['branchingNarrative', 'the scene itself'],
    ['fragments', 'EXAMINE material and the Under-Map board'],
    ['relations', 'what a probe can connect'],
    ['echoes', 'the mapping-shaped-the-story payoff'],
    ['beliefResolution', 'the verdict banner and clarity'],
    ['foilName', "The Other Reader's name, pinned once"],
    ['pathDecisions', 'the nine path-specific beliefs'],
    ['narrative', 'the canonical read-through later chapters use as context'],
    ['narrativeThreads', 'the thread ledger'],
    ['briefing', 'the daily board briefing'],
  ])('%s is on the entry (%s)', (field) => {
    expect(block).toMatch(new RegExp(`^\\s*${field}:`, 'm'));
  });

  test('the Under-Map fields are read from the generated content, not hardcoded empty', () => {
    expect(block).toMatch(/fragments:\s*Array\.isArray\(generatedContent\.fragments\)/);
    expect(block).toMatch(/relations:\s*Array\.isArray\(generatedContent\.relations\)/);
  });
});

describe('the repair pass cannot silently drop what it cannot re-emit', () => {
  test('fields absent from the repair schema are preserved across it', () => {
    // _fixContent regenerates against a schema with no pathDecisions and, on a C
    // beat, none of the Under-Map fields. Without this the first validation
    // failure collapsed nine path-specific beliefs into one generic decision and
    // emptied the board.
    expect(GENERATION_SRC).toContain('preservedAcrossRepair');
    ['pathDecisions', 'fragments', 'relations', 'echoes', 'beliefResolution', 'foilName'].forEach((field) => {
      expect(GENERATION_SRC).toMatch(new RegExp(`preservedAcrossRepair[\\s\\S]{0,400}${field}:`));
    });
  });

  test('the canonical narrative is rebuilt after a repair, not left empty', () => {
    // _fixContent returns a freshly parsed object whose narrative is empty; the
    // entry was being stored that way, with wordCount 0, and read as the story
    // so far by every later chapter.
    expect(GENERATION_SRC).toContain('ensureCanonicalNarrative(generatedContent);');
    const repairLoop = GENERATION_SRC.slice(
      GENERATION_SRC.indexOf('while (!validationResult.valid && retries < MAX_RETRIES)'),
    );
    expect(repairLoop.slice(0, 1500)).toContain('ensureCanonicalNarrative(generatedContent);');
  });
});
