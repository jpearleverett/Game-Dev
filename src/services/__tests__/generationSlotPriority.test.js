/**
 * The generation slot economy, as exercised by a real playtest log.
 *
 * A single A-beat transition generated the SAME scene three times in 51 seconds
 * and the player still waited 30s at the gate. Three separate mechanisms:
 *
 *  1. The A/B chain prefetch passed an Under-Map but no refreshKey, and never
 *     recorded the resulting signature — so its scene could never be ACCEPTED by
 *     the freshness-gated read it exists to cover, and could not be deduped onto
 *     by a later signed prefetch. A guaranteed-wasted generation per beat.
 *  2. The wait queue was strictly FIFO, so the player's own blocking request sat
 *     behind two speculative prefetches (5.2s of the 30s) — pure loss, since
 *     nothing the player can see is produced by the work ahead of it.
 *  3. forceRegenerate skipped the post-wait existence re-check outright, so a
 *     scene that landed 2ms before the slot was granted was refused unseen and a
 *     third full generation ran (25s of the 30s).
 */

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
}));
jest.mock('expo-constants', () => ({
  expoConfig: { extra: { geminiProxyUrl: 'https://example.test/proxy' } },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
  multiRemove: jest.fn(async () => null),
  getAllKeys: jest.fn(async () => []),
}));
jest.mock('react-native-sse', () => function EventSourceStub() {});

const fs = require('fs');
const path = require('path');

const GEN_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'storyGeneration', 'generation.js'),
  'utf8'
);
const HOOK_SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'hooks', 'useStoryGeneration.js'),
  'utf8'
);

// A minimal stand-in for the service's slot bookkeeping, wired to the real
// functions so the ordering logic under test is the shipped one.
const makeService = (maxConcurrent = 2) => {
  const { generationMethods: mod } = require('../storyGeneration/generation');
  const svc = {
    activeGenerationCount: 0,
    maxConcurrentGenerations: maxConcurrent,
    generationWaitQueue: [],
  };
  svc._waitForGenerationSlot = mod._waitForGenerationSlot.bind(svc);
  svc._acquireGenerationSlot = mod._acquireGenerationSlot.bind(svc);
  svc._releaseGenerationSlot = mod._releaseGenerationSlot.bind(svc);
  return svc;
};

describe('generation slot priority', () => {
  let logSpy;
  beforeEach(() => { logSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { logSpy.mockRestore(); });

  it('drains a user-facing waiter ahead of speculative ones already queued', async () => {
    const svc = makeService(2);
    // Fill both slots with speculative work.
    await svc._acquireGenerationSlot('prefetch-a');
    await svc._acquireGenerationSlot('prefetch-b');
    expect(svc.activeGenerationCount).toBe(2);

    const order = [];
    // Two speculative waiters queue FIRST, then the player arrives.
    const q1 = svc._acquireGenerationSlot('prefetch-c', false).then(() => order.push('prefetch-c'));
    const q2 = svc._acquireGenerationSlot('prefetch-d', false).then(() => order.push('prefetch-d'));
    const player = svc._acquireGenerationSlot('player-gate', true).then(() => order.push('player-gate'));

    expect(svc.generationWaitQueue).toHaveLength(3);

    svc._releaseGenerationSlot('prefetch-a');
    await player;
    // The player jumps the two prefetches that were queued before them.
    expect(order[0]).toBe('player-gate');

    svc._releaseGenerationSlot('prefetch-b');
    await q1;
    svc._releaseGenerationSlot('player-gate');
    await q2;
    expect(order).toEqual(['player-gate', 'prefetch-c', 'prefetch-d']);
  });

  it('keeps FIFO order among speculative waiters', async () => {
    const svc = makeService(1);
    await svc._acquireGenerationSlot('active');
    const order = [];
    const a = svc._acquireGenerationSlot('first', false).then(() => order.push('first'));
    const b = svc._acquireGenerationSlot('second', false).then(() => order.push('second'));

    svc._releaseGenerationSlot('active');
    await a;
    svc._releaseGenerationSlot('first');
    await b;
    expect(order).toEqual(['first', 'second']);
  });

  it('never exceeds maxConcurrentGenerations', async () => {
    const svc = makeService(2);
    await svc._acquireGenerationSlot('one');
    await svc._acquireGenerationSlot('two');
    let third = false;
    svc._acquireGenerationSlot('three', true).then(() => { third = true; });
    await Promise.resolve();
    expect(third).toBe(false);
    expect(svc.activeGenerationCount).toBe(2);
  });
});

describe('the source contracts these fixes depend on', () => {
  it('the A/B chain prefetch is SIGNED: it passes a refreshKey and records the signature', () => {
    const start = HOOK_SRC.indexOf('const triggerPrefetchAfterBranchingComplete =');
    expect(start).toBeGreaterThan(-1);
    // The body runs until the next top-level const declaration of a callback.
    const body = HOOK_SRC.slice(start, start + 9000);
    expect(body).toMatch(/chainSignature/);
    expect(body).toMatch(/refreshKey:\s*chainSignature/);
    // and the result must be recorded, or the gate can never accept it
    expect(body).toMatch(/generatedUnderMapSignaturesRef\.current\.set/);
  });

  it('an empty Under-Map imposes no freshness requirement', () => {
    expect(HOOK_SRC).toMatch(/UNDER_MAP_EMPTY_SIGNATURE/);
    expect(HOOK_SRC).toMatch(/rawRequiredSignature\s*!==\s*UNDER_MAP_EMPTY_SIGNATURE/);
  });

  it('the post-wait re-check asks whether an entry satisfies the requirement, not whether force was set', () => {
    expect(GEN_SRC).toMatch(/satisfiesRequirement/);
    expect(GEN_SRC).toMatch(/candidate\.underMapSignature === requiredUnderMapSignature/);
    // The old unconditional bail must be gone.
    expect(GEN_SRC).not.toMatch(/const existingAfterWait = forceRegenerate \? null :/);
  });

  it('the stored entry carries the Under-Map signature so freshness survives a restart', () => {
    // The entry is built from a field whitelist (CLAUDE.md invariant 3), so the
    // field has to be in it explicitly or it is silently dropped.
    const wl = GEN_SRC.slice(GEN_SRC.indexOf('const storyEntry = {'));
    expect(wl.slice(0, 3000)).toMatch(/underMapSignature:/);
  });

  it('the wait queue is ordered by user-facing, not purely by arrival', () => {
    expect(GEN_SRC).toMatch(/findIndex\(\(w\) => w\.isUserFacing\)/);
  });
});
