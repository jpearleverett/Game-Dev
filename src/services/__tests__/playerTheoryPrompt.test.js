jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));
jest.mock('../LLMService', () => ({
  llmService: { init: jest.fn(), isConfigured: jest.fn(() => true), complete: jest.fn(async () => ({ content: '{}' })) },
}));
jest.mock('../../storage/generatedStoryStorage', () => ({ saveStoryContext: jest.fn(async () => true) }));

import { promptAssemblyMethods } from '../storyGeneration/promptAssembly';
import { STORY_CONTENT_SCHEMA } from '../storyGeneration/schemas';
import { buildMasterSystemPrompt } from '../storyGeneration/prompts';
import {
  createBlankUnderMap,
  addFragments,
  addRelations,
  connectFragments,
  recordTheory,
  fragmentId,
  makeFragment,
} from '../../data/underMap';
import { getPuzzleMode, getPuzzleRouteName, PUZZLE_MODE } from '../../utils/puzzleMode';

const build = (um) => promptAssemblyMethods._buildPlayerTheorySection(um);

describe('_buildPlayerTheorySection', () => {
  test('empty / invalid map yields no section', () => {
    expect(build(null)).toBe('');
    expect(build(createBlankUnderMap())).toBe('');
    expect(build({})).toBe('');
  });

  test('surfaces sealed theory, staked fragments, revealed nodes, and examined fragments', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [
      { label: 'The shifting seal', kind: 'symbol', detail: 'wax that never warmed' },
      { label: 'Silver ink', kind: 'phenomenon', detail: 'it moves in the light' },
    ]);
    m = addRelations(m, [
      { aLabel: 'The shifting seal', bLabel: 'Silver ink', revelation: 'Both are made to be seen only by Jack.' },
    ]);
    const sealId = fragmentId('symbol', 'The shifting seal');
    const inkId = fragmentId('phenomenon', 'Silver ink');
    const res = connectFragments(m, sealId, inkId);
    expect(res.valid).toBe(true);
    m = res.map;
    m = recordTheory(m, { chapter: 1, fragmentIds: [sealId, inkId], interpretation: 'The Under-Map is signalling to me directly.' });

    const out = build(m);
    expect(out).toContain('sealed this theory');
    expect(out).toContain('The Under-Map is signalling to me directly.');
    expect(out).toContain('The shifting seal');
    expect(out).toContain('Silver ink');
    expect(out).toContain('made to be seen only by Jack');
    expect(out).toContain('not a whodunit');
    // Cross-chapter weaving + motif instructions must be present so the model
    // links new anomalies to ones the player already holds.
    expect(out).toContain('already holds');
    expect(out).toContain('Weaving');
    expect(out.toLowerCase()).toContain('recurring motif');
    // Fragment kinds are tagged so the model can reference them precisely.
    expect(out).toContain('[SYMBOL]');
    // Move 1: the model must author choose-the-truth decoys for each relation.
    expect(out).toContain('falseReadings');
    // Move 2: emit an echo when a scene pays off a revealed truth.
    expect(out).toContain('Echo:');
    // Move 3: a sealed belief can be borne out / subverted via beliefResolution,
    // tagged with the chapter it was sealed in.
    expect(out).toContain('beliefResolution');
    expect(out).toContain('chapter 1');
  });

  test('grounded beliefs steer resolution: mapping well must buy clarity', () => {
    const seal = (grounded) => {
      let m = createBlankUnderMap();
      m = addFragments(m, [{ label: 'The seal', kind: 'symbol' }]);
      return recordTheory(m, {
        chapter: 2,
        fragmentIds: [fragmentId('symbol', 'The seal')],
        interpretation: 'The map is reaching for me.',
        grounded,
      });
    };
    const held = build(seal(true));
    expect(held).toContain('SUPPORTED');
    expect(held).toContain('correct: true');
    const against = build(seal(false));
    expect(against).toContain('AGAINST');
    expect(against).toContain('correct: false');
    // No grounding signal -> neither directive appears.
    const neutral = build(seal(null));
    expect(neutral).not.toContain('SUPPORTED');
    expect(neutral).not.toContain('AGAINST');
  });

  test('a stale unresolved belief gets a hard resolve-now instruction', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [{ label: 'The seal', kind: 'symbol' }]);
    m = recordTheory(m, {
      chapter: 2,
      fragmentIds: [fragmentId('symbol', 'The seal')],
      interpretation: 'The map is reaching for me.',
    });
    // Two chapters later, still unresolved -> this scene must answer it.
    const stale = promptAssemblyMethods._buildPlayerTheorySection(m, 4);
    expect(stale).toContain('unanswered since chapter 2');
    expect(stale).toContain('THIS chapter');
    // Fresh seal -> only the soft lifecycle nudge.
    const fresh = promptAssemblyMethods._buildPlayerTheorySection(m, 3);
    expect(fresh).not.toContain('unanswered since');
    expect(fresh).toContain('within a chapter or two');
  });
});

describe('_buildContinuityAnchorSection', () => {
  const buildAnchor = (ctx, chapter) =>
    promptAssemblyMethods._buildContinuityAnchorSection(ctx, chapter);

  test('anchors immutable canon + timeline for the end-of-prompt position', () => {
    const out = buildAnchor({}, 4);
    // Core canon must be restated so long-context dilution does not drift names/roles.
    expect(out).toContain('Jack Halloway');
    expect(out).toContain('Victoria Blackwell');
    expect(out).toContain('Ashport');
    // Timeline anchor (Chapter N = Day N) keeps dates consistent across the campaign.
    expect(out).toContain('Day 4 of');
    // It must instruct the model not to contradict the established record.
    expect(out.toLowerCase()).toContain('do not contradict');
    // It stays an anchor, not a full ledger dump (kept compact).
    expect(out.length).toBeLessThan(900);
  });

  test('omits the timeline line when chapter is not finite', () => {
    const out = buildAnchor({}, NaN);
    expect(out).toContain('Jack Halloway');
    expect(out).not.toContain('Day NaN');
  });
});

describe('puzzle mode routing (CONNECT / THEORY)', () => {
  test('A/B beats route to the Under-Map CONNECT beat', () => {
    expect(getPuzzleMode('001A', true)).toBe(PUZZLE_MODE.CONNECT);
    expect(getPuzzleMode('003B', true)).toBe(PUZZLE_MODE.CONNECT);
    expect(getPuzzleRouteName(PUZZLE_MODE.CONNECT)).toBe('UnderMap');
  });

  test('C beats route to the THEORY climax', () => {
    expect(getPuzzleMode('001C', true)).toBe(PUZZLE_MODE.THEORY);
    expect(getPuzzleMode('007C', true)).toBe(PUZZLE_MODE.THEORY);
    expect(getPuzzleRouteName(PUZZLE_MODE.THEORY)).toBe('Theory');
  });

  test('non-story mode stays on the evidence board', () => {
    expect(getPuzzleMode('001A', false)).toBe(PUZZLE_MODE.EVIDENCE);
  });
});

describe('latent threads & the quake in <under_map_state>', () => {
  test('dangling threads are listed with the missing label to pay off', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [{ label: 'The brass key', kind: 'symbol' }]);
    m = addRelations(m, [
      { aLabel: 'The brass key', bLabel: 'The drowned door', revelation: 'Cut for a door underwater.' },
    ], { caseNumber: '002A' });
    const out = promptAssemblyMethods._buildPlayerTheorySection(m, 2);
    expect(out).toContain('Threads left hanging');
    expect(out).toContain('missing: "The drowned door"');
    expect(out).toContain('The brass key');
  });

  test('chapter 7 injects the quake against the oldest motif', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [makeFragment({ label: 'The closed eye', kind: 'symbol', caseNumber: '001A' })]);
    m = addFragments(m, [makeFragment({ label: 'The closed eye', kind: 'symbol', caseNumber: '003B' })]); // motif
    expect(promptAssemblyMethods._buildPlayerTheorySection(m, 7)).toContain('THE QUAKE');
    expect(promptAssemblyMethods._buildPlayerTheorySection(m, 7)).toContain('The closed eye');
    expect(promptAssemblyMethods._buildPlayerTheorySection(m, 6)).not.toContain('THE QUAKE');
  });

  test('every scene is asked to author one dangling thread', () => {
    let m = createBlankUnderMap();
    m = addFragments(m, [{ label: 'x', kind: 'symbol' }]);
    const out = promptAssemblyMethods._buildPlayerTheorySection(m, 2);
    // The count lives once, in the schema field the model writes into; the
    // prompt block names the mechanic and says what the endpoints must be.
    expect(out).toContain('dangling thread');
    expect(out.toLowerCase()).toContain('drift');
    expect(STORY_CONTENT_SCHEMA.properties.relations.description).toContain('dangling thread');
  });

  test('the relation count is stated once, in the schema, and nowhere contradicted', () => {
    const schemaDesc = STORY_CONTENT_SCHEMA.properties.relations.description;
    expect(schemaDesc).toContain('Author 4 relations');

    let m = createBlankUnderMap();
    m = addFragments(m, [{ label: 'x', kind: 'symbol' }]);
    const block = promptAssemblyMethods._buildPlayerTheorySection(m, 2);
    // No competing floor in the prompt block (this contradicted the schema and
    // the system prompt, and the model settled on the smallest number it saw).
    expect(block).not.toMatch(/at least (two|2|one|1|four|4) relations?/i);

    expect(buildMasterSystemPrompt()).not.toContain('Return an empty relations list');
  });
});

describe('the scene is given material from the whole run, not just last chapter', () => {
  const build = (um, chapter = 12) =>
    promptAssemblyMethods._buildPlayerTheorySection(um, chapter);

  const lateRun = ({ olderUnresolved = false } = {}) => {
    let m = createBlankUnderMap();
    // Beliefs for chapters 1-11. Chapter 9's is deliberately left hanging.
    for (let ch = 1; ch <= 11; ch += 1) {
      m = recordTheory(m, { chapter: ch, interpretation: `BELIEF-${String(ch).padStart(2, '0')}`, rejected: [`R${ch}`] });
      const leaveOpen = olderUnresolved && ch === 9;
      if (ch < 11 && !leaveOpen) {
        const { resolveTheory } = require('../../data/underMap');
        m = resolveTheory(m, ch, true);
      }
    }
    // Twenty truths, newest first, with two arc-scoped ones from early chapters.
    return {
      ...m,
      nodes: Array.from({ length: 20 }, (_, i) => ({
        id: `node_${i}`,
        revelation: `TRUTH-${String(20 - i).padStart(2, '0')}`,
        // The two OLDEST truths are the arc-spanning ones.
        scope: i >= 18 ? 'arc' : 'chapter',
      })),
    };
  };

  test('an arc-spanning truth from chapter 1 is still material to build on', () => {
    // A flat "newest six" meant that from about chapter three onward the material
    // the scene was told to BUILD ON was always the last chapter's, and an
    // arc-spanning truth surfaced in chapter 1 could only ever appear as a
    // prohibition in the canon block, never as fuel.
    const out = build(lateRun());
    expect(out).toContain('TRUTH-01');
    expect(out).toContain('TRUTH-02');
    expect(out).toContain('spans chapters');
  });

  test('it still leads with the recent, and stays a scene-sized list', () => {
    const out = build(lateRun());
    expect(out).toContain('TRUTH-20');
    const bullets = out.split('\n').filter((l) => l.trim().startsWith('• TRUTH-'));
    expect(bullets.length).toBeLessThanOrEqual(10);
  });

  test('a belief left hanging past its window is named so it CAN be resolved', () => {
    // Only the newest belief was ever named here, so one that slipped past the
    // two-chapter window became structurally unresolvable: the model was never
    // told it existed, and the player waited out a campaign for a verdict that
    // could not arrive.
    const out = build(lateRun({ olderUnresolved: true }));
    expect(out).toContain('BELIEF-09');
    expect(out).toContain('resolvesChapter: 9');
    expect(out).toContain('still not answered');
  });

  test('with nothing outstanding it does not invent a backlog', () => {
    const out = build(lateRun());
    expect(out).not.toContain('still not answered');
  });

  test('the decisions call gets the truths but not the authoring instructions', () => {
    const out = promptAssemblyMethods._buildPlayerTheorySection(lateRun({ olderUnresolved: true }), 12, { mode: 'decisions' });
    expect(out).toContain('TRUTH-01');
    expect(out).not.toContain('beliefResolution');
    expect(out).not.toContain('still not answered');
  });
});
