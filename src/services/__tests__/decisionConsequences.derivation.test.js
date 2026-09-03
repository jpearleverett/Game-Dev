/**
 * The DECISION CONSEQUENCES block tells the model what the player's choices have
 * done to the story. It was reading a hardcoded template instead of the run.
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
import { DECISION_CONSEQUENCES } from '../storyGeneration/constants';

const history = () => [
  { caseNumber: '001C', optionKey: 'A', optionTitle: 'Blackwell is guiding you in', optionFocus: 'The symbols are breadcrumbs she left on purpose.' },
  { caseNumber: '002C', optionKey: 'B', optionTitle: 'The map is using you', optionFocus: 'Jack is a tool it picked up.' },
];

describe('consequences come from the run, not from a template', () => {
  // The registry is module-level and the fast path writes derived values into it,
  // so each test needs the shipped template back.
  const template001C = JSON.parse(JSON.stringify(DECISION_CONSEQUENCES['001C']));
  beforeEach(() => {
    DECISION_CONSEQUENCES['001C'] = JSON.parse(JSON.stringify(template001C));
    delete DECISION_CONSEQUENCES['002C'];
    svc.storyContext = { decisionConsequencesByKey: {} };
  });

  test("chapter 1's consequence is the belief the player actually sealed", () => {
    // The static 001C entry ("Jack chose the methodical, evidence-focused
    // approach") is whodunit-era text, and it was consulted BEFORE derivation --
    // so every run asserted that sentence to the model as the chapter-1
    // consequence, whichever belief the player had really sealed.
    svc._ensureDecisionConsequencesFast(history());
    const built = svc._buildDecisionConsequences(history());
    const chapterOne = built.immediate.find((l) => l.startsWith('Chapter 1:'));

    expect(chapterOne).toContain('Blackwell is guiding you in');
    expect(chapterOne).not.toContain('methodical, evidence-focused approach');
    // And it reads as a belief, not as a mangled imperative. The old phrasing
    // lowercased the first letter and prefixed "Jack chose to", producing
    // "Jack chose to blackwell is guiding you in."
    expect(chapterOne).not.toMatch(/chose to blackwell/i);
    expect(chapterOne).toContain('committed to the reading');
  });

  test('the focus the player chose rides along with it', () => {
    svc._ensureDecisionConsequencesFast(history());
    const built = svc._buildDecisionConsequences(history());
    expect(built.ongoing.join(' ')).toContain('The symbols are breadcrumbs she left on purpose');
  });

  test('every chapter gets its own line, in order', () => {
    svc._ensureDecisionConsequencesFast(history());
    const built = svc._buildDecisionConsequences(history());
    expect(built.immediate).toHaveLength(2);
    expect(built.immediate[0]).toContain('Chapter 1:');
    expect(built.immediate[1]).toContain('Chapter 2:');
    expect(built.immediate[1]).toContain('The map is using you');
  });

  test('a save with no title on the choice still falls back to the template', () => {
    // Older saves predate optionTitle on choiceHistory; they must not end up with
    // "Jack chose to option a."
    svc.storyContext = { decisionConsequencesByKey: {} };
    const bare = [{ caseNumber: '001C', optionKey: 'A' }];
    svc._ensureDecisionConsequencesFast(bare);
    const built = svc._buildDecisionConsequences(bare);
    expect(built.immediate[0]).toContain('methodical, evidence-focused approach');
  });
});

describe('the ongoing-effects window keeps the recent, not the ancient', () => {
  const { promptAssemblyMethods: pa } = require('../storyGeneration/promptAssembly');
  const fs = require('fs');
  const path = require('path');

  test('the slice is taken from the end of the list', () => {
    // The list is built in chapter order. Slicing the FIRST five froze this block
    // on chapters 1 and 2 for the rest of the run, so by chapter 12 every
    // mid-campaign choice's ongoing effect was invisible.
    const src = fs.readFileSync(path.join(__dirname, '../storyGeneration/promptAssembly.js'), 'utf8');
    const block = src.slice(src.indexOf('### ONGOING EFFECTS FROM CHOICES'), src.indexOf('### Most recent player decision'));
    expect(block).toContain('.slice(-12)');
    expect(block).not.toMatch(/\.slice\(0,\s*5\)/);
    expect(typeof pa._buildTaskSection).toBe('function');
  });
});
