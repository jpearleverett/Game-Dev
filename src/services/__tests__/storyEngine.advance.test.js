/**
 * Integration test for the chapter-advance flow that broke before (the 1C->1A
 * reset). Renders the REAL usePersistence reducer wired to the REAL useStoryEngine
 * and exercises the actual decision-advance, asserting the in-memory campaign
 * advances correctly and is never clobbered back to defaults.
 */
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = {};
  return {
    getItem: jest.fn(async (k) => (k in store ? store[k] : null)),
    setItem: jest.fn(async (k, v) => { store[k] = v; }),
    removeItem: jest.fn(async (k) => { delete store[k]; }),
  };
});
jest.mock('../../storage/generatedStoryStorage', () => ({
  clearGeneratedStory: jest.fn(async () => true),
}));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { usePersistence } from '../../hooks/usePersistence';
import { useStoryEngine } from '../../hooks/useStoryEngine';

let api;
function Harness() {
  const { progress, hydrationComplete, updateProgress } = usePersistence();
  const engine = useStoryEngine(progress, updateProgress);
  api = { progress, hydrationComplete, updateProgress, engine };
  return null;
}

async function mount() {
  let r;
  await act(async () => { r = TestRenderer.create(React.createElement(Harness)); });
  await act(async () => {}); // flush async hydration
  return r;
}

async function seedC() {
  await act(async () => {
    api.updateProgress((prev) => ({
      storyCampaign: {
        ...prev.storyCampaign,
        chapter: 1,
        subchapter: 3,
        activeCaseNumber: '001C',
        currentPathKey: 'ROOT',
        choiceHistory: [],
        preDecision: null,
      },
    }));
  });
}

describe('chapter advance (1C climax) — no reset', () => {
  test('seal belief then apply: advances 1C -> 2A, never 1A', async () => {
    await mount();
    expect(api.hydrationComplete).toBe(true);
    await seedC();
    expect(api.progress.storyCampaign.activeCaseNumber).toBe('001C');

    // Seal the belief (the pre-decision) — separate render, as in the real flow.
    await act(async () => {
      api.engine.selectDecisionBeforePuzzle('A', { title: 'She is guiding you in', focus: 'drawn in' }, '001C');
    });
    expect(api.progress.storyCampaign.preDecision?.optionKey).toBe('A');
    expect(api.progress.storyCampaign.activeCaseNumber).toBe('001C'); // not advanced yet

    // Cross the threshold.
    await act(async () => { api.engine.applyPreDecision(); });

    const sc = api.progress.storyCampaign;
    expect(sc.chapter).toBe(2);
    expect(sc.subchapter).toBe(1);
    expect(sc.activeCaseNumber).toBe('002A'); // <-- the bug produced '001A'
    expect(sc.preDecision).toBeNull();
    expect(sc.choiceHistory).toHaveLength(1);
    expect(sc.choiceHistory[0].optionKey).toBe('A');
    expect(sc.choiceHistory[0].optionTitle).toBe('She is guiding you in');
  });

  test('seal + apply batched in one tick still composes (functional, no stale clobber)', async () => {
    await mount();
    await seedC();
    await act(async () => {
      // Both fire before a re-render. With object-merge + stale closures this
      // failed to advance (preDecision invisible); functional updates compose.
      api.engine.selectDecisionBeforePuzzle('B', { title: 'You are bait', focus: 'snare' }, '001C');
      api.engine.applyPreDecision();
    });
    const sc = api.progress.storyCampaign;
    expect(sc.activeCaseNumber).toBe('002A');
    expect(sc.choiceHistory[0].optionKey).toBe('B');
  });

  test('a concurrent unrelated write does not clobber the advance', async () => {
    await mount();
    await seedC();
    await act(async () => {
      api.engine.selectDecisionBeforePuzzle('A', { title: 'It is reaching for you' }, '001C');
    });
    await act(async () => {
      // Simulate a concurrent under-map write batched with the advance.
      api.updateProgress((prev) => ({
        storyCampaign: { ...prev.storyCampaign, underMap: { ...(prev.storyCampaign.underMap || {}), lastVisitedAt: 'now' } },
      }));
      api.engine.applyPreDecision();
    });
    const sc = api.progress.storyCampaign;
    expect(sc.activeCaseNumber).toBe('002A'); // advance survived
    expect(sc.underMap.lastVisitedAt).toBe('now'); // concurrent write survived
  });

  test('selectDecision (post-puzzle path) advances only when awaitingDecision', async () => {
    await mount();
    await act(async () => {
      api.updateProgress((prev) => ({
        storyCampaign: {
          ...prev.storyCampaign,
          chapter: 1, subchapter: 3, activeCaseNumber: '001C', choiceHistory: [],
          awaitingDecision: true, pendingDecisionCase: '001C',
          pendingDecisionOptions: { A: { title: 'belief A' }, B: { title: 'belief B' } },
        },
      }));
    });
    await act(async () => { api.engine.selectDecision('A'); });
    const sc = api.progress.storyCampaign;
    expect(sc.activeCaseNumber).toBe('002A');
    expect(sc.awaitingDecision).toBe(false);
    expect(sc.choiceHistory[0].optionTitle).toBe('belief A');
  });
});
