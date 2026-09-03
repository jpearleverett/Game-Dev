/**
 * The model writes down its own open threads -- promises, appointments, threats
 * -- with an urgency and a due chapter. That ledger is what makes a chapter-2
 * obligation come due in chapter 5. It was being thrown away.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));
jest.mock('../LLMService', () => ({
  llmService: { init: jest.fn(), isConfigured: jest.fn(() => true), complete: jest.fn(async () => ({ content: '{}' })) },
}));
jest.mock('../../storage/generatedStoryStorage', () => ({ saveStoryContext: jest.fn(async () => true) }));

import { storyGenerationService as svc } from '../StoryGenerationService';

const fs = require('fs');
const path = require('path');

describe("the model's own thread ledger survives into the context", () => {
  const CONTEXT_SRC = fs.readFileSync(path.join(__dirname, '../storyGeneration/context.js'), 'utf8');

  test('every previousChapters push carries narrativeThreads', () => {
    // narrativeThreads is REQUIRED by the output schema and persisted on every
    // entry, but all four of these whitelists dropped it -- so the extractor's
    // stated first priority ("Use LLM-generated structured threads") never saw a
    // single thread in production.
    const pushes = CONTEXT_SRC.split('previousChapters.push({').slice(1);
    expect(pushes.length).toBeGreaterThanOrEqual(4);
    pushes.forEach((tail, i) => {
      const block = tail.slice(0, 900);
      expect(`push ${i} carries threads: ${/narrativeThreads:/.test(block)}`).toBe(`push ${i} carries threads: true`);
    });
  });

  test('a structured thread beats the regex fallback and keeps its urgency', () => {
    const chapters = [
      {
        chapter: 2,
        subchapter: 3,
        narrative: 'Jack promised the woman at the laundromat he would come back for the ledger.',
        narrativeThreads: [{
          type: 'promise',
          description: 'Jack owes Nadia Prine the ledger he took from the laundromat.',
          status: 'active',
          urgency: 'critical',
          dueChapter: 5,
        }],
      },
    ];
    const active = svc._extractNarrativeThreads(chapters);
    const found = active.find((t) => /Nadia Prine/.test(t.description || ''));
    expect(found).toBeTruthy();
    expect(found.urgency).toBe('critical');
    expect(found.dueChapter).toBe(5);
  });

  test('the regex fallback keeps the object of the promise, not just the verb', () => {
    // The patterns are alternations; interpolating one bare bound the context
    // windows to the first and last alternative only, so a middle match produced
    // "Jack promised" with everything that made it actionable stripped off.
    const chapters = [{
      chapter: 2,
      subchapter: 1,
      narrative: 'Jack gave his word that the ledger would be back on her counter before the market closed.',
    }];
    const active = svc._extractNarrativeThreads(chapters);
    const promise = active.find((t) => t.type === 'promise');
    expect(promise).toBeTruthy();
    expect(promise.description.length).toBeGreaterThan('gave his word'.length + 10);
    expect(promise.description).toMatch(/ledger|counter|market/);
  });

  test('a thread the model marked resolved is not resurrected by the regex', () => {
    const chapters = [
      {
        chapter: 2,
        subchapter: 1,
        narrative: 'Jack promised to return the ledger.',
        narrativeThreads: [{ type: 'promise', description: 'Jack promised to return the ledger.', status: 'active', urgency: 'normal' }],
      },
      {
        chapter: 3,
        subchapter: 1,
        narrative: 'He put the ledger back on the counter and left.',
        narrativeThreads: [{ type: 'promise', description: 'Jack promised to return the ledger.', status: 'resolved', urgency: 'normal', resolvedChapter: 3 }],
      },
    ];
    const active = svc._extractNarrativeThreads(chapters);
    expect(active.find((t) => /return the ledger/.test(t.description || ''))).toBeFalsy();
  });
});
