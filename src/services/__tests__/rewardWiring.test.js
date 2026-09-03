/**
 * Two rewards the game hands out were wired to the wrong moment, and both
 * failure modes are invisible at runtime — the player just quietly stops being
 * paid, or quietly re-reads a chapter they already read.
 *
 * These guard the wiring rather than the pure models (which underMap.test.js
 * already covers): the models were always correct, it was the call sites that
 * were wrong.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));

const fs = require('fs');
const path = require('path');

const src = (rel) => fs.readFileSync(path.join(__dirname, '../..', rel), 'utf8');

describe("today's stir is paid for by mapping, not by tapping", () => {
  const desk = src('screens/DeskScreen.js');
  const underMapScreen = src('screens/UnderMapScreen.js');
  const gameContext = src('context/GameContext.js');

  test('the Desk card only opens the board', () => {
    // It used to bank the +1 probe and advance the days-mapped streak on tap,
    // before a single thread was drawn — so the real gates (a true reading, the
    // daily word puzzle) always found the stir already settled and no-op'd.
    const handler = desk.slice(desk.indexOf('const onDailyStirPress'), desk.indexOf('const onDailyStirPress') + 400);
    expect(handler).toContain('onOpenCaseBoard');
    expect(handler).not.toContain('onResolveDailyStir');
    expect(desk).not.toContain('onResolveDailyStir');
  });

  test('drawing a true reading settles it, and only on the freeform board', () => {
    // Settling deepens the drifted fragment (seen + 1), which moves the
    // Under-Map generation signature. Doing that inside a gated A/B descent
    // would invalidate the prefetch that descent exists to cover.
    expect(underMapScreen).toContain('settlesDailyStir: !asPuzzle');
    expect(underMapScreen.match(/settlesDailyStir: !asPuzzle/g)).toHaveLength(2); // both reveal paths

    const fn = gameContext.slice(
      gameContext.indexOf('const resolveUnderMapReading'),
      gameContext.indexOf('const markLessonSeen'),
    );
    expect(fn).toContain('settlesDailyStir = false');
    expect(fn).toMatch(/settles\s*=\s*settlesDailyStir\s*&&\s*mappedTruth/);
    expect(fn).toMatch(/settles \? umResolveStir/);
  });

  test('the prefetch is signed for the map the player will actually carry', () => {
    // Prefetching against the pre-stir map produces a scene signed for a map
    // that no longer exists, which the gate then throws away.
    const fn = gameContext.slice(
      gameContext.indexOf('const resolveUnderMapReading'),
      gameContext.indexOf('const markLessonSeen'),
    );
    expect(fn).toMatch(/prefetchAfterUnderMapReveal[\s\S]{0,200}settles \? umResolveStir\(result\.map\) : result\.map/);
  });

  test('solving the daily word puzzle still settles it', () => {
    expect(gameContext).toMatch(/nextStatus === STATUS\.SOLVED[\s\S]{0,600}umResolveStir/);
  });
});

describe('a restart does not replay the previous run', () => {
  test('clearing progress drops the generated chapters through the service', () => {
    // Removing the AsyncStorage keys alone left every chapter in the in-memory
    // caches that are read FIRST, so a wipe inside a running session served the
    // old run's prose back.
    expect(src('hooks/usePersistence.js')).toContain('storyGenerationService.resetGeneratedContent()');
  });

  test('New Game+ drops them too', () => {
    const ctx = src('context/GameContext.js');
    const reset = ctx.slice(ctx.indexOf('const enterStoryCampaign'), ctx.indexOf('const continueStoryCampaign'));
    expect(reset).toContain('resetGeneratedContent');
  });

  test('the service reset empties the in-memory story cache as well as storage', async () => {
    jest.resetModules();
    jest.doMock('../../storage/generatedStoryStorage', () => ({
      loadGeneratedStory: jest.fn(async () => null),
      getStoryContext: jest.fn(async () => null),
      clearGeneratedStory: jest.fn(async () => true),
    }));
    const { lifecycleMethods } = require('../storyGeneration/lifecycle');
    const storyContent = require('../../data/storyContent');
    const { clearGeneratedStory } = require('../../storage/generatedStoryStorage');

    storyContent.updateGeneratedCache('002A', 'ROOT', { caseNumber: '002A', narrative: ['stale'] });
    expect(storyContent.getStoryEntry('002A', 'ROOT')).toBeTruthy();

    const service = {
      generatedStory: { chapters: { '002A_ROOT': {} } },
      storyContext: { some: 'state' },
      chapterOutlines: new Map([['a', 1]]),
      consistencyCheckpoints: new Map(),
      generatedConsequences: new Map(),
      generationAttempts: new Map(),
      threadAcknowledgmentCounts: new Map(),
      decisionConsequences: new Map(),
      characterStates: new Map(),
      chapterStartCacheKeys: new Map([['k', 'v']]),
      chapterStartCacheContent: new Map([['k', {}]]),
      narrativeThreads: [{}],
      archivedThreads: [{}],
      consistencyLog: [{}],
    };
    await lifecycleMethods.resetGeneratedContent.call(service);

    expect(storyContent.getStoryEntry('002A', 'ROOT')).toBeNull();
    expect(service.generatedStory).toEqual({ chapters: {} });
    expect(service.storyContext).toBeNull();
    expect(service.chapterStartCacheKeys.size).toBe(0);
    expect(service.narrativeThreads).toEqual([]);
    expect(clearGeneratedStory).toHaveBeenCalled();
  });
});
