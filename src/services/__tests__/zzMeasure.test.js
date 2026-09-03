jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));
jest.mock('../../storage/generatedStoryStorage', () => ({
  loadGeneratedStory: jest.fn(async () => ({ chapters: {} })),
  saveGeneratedChapter: jest.fn(async () => true),
  getStoryContext: jest.fn(async () => ({})),
  saveStoryContext: jest.fn(async () => true),
}));
jest.mock('../LLMService', () => ({
  llmService: {
    init: jest.fn(async () => {}),
    isConfigured: jest.fn(() => true),
    complete: jest.fn(async () => ({ content: '{}', model: 'test', finishReason: 'STOP' })),
    getCache: jest.fn(async () => null),
    createCache: jest.fn(async () => ({ name: 'x' })),
  },
}));

import { storyGenerationService as S } from '../StoryGenerationService';

const WORD = 'rain sodium light wet concrete reflection paper ink glyph ';
const seg = (n) => (WORD.repeat(45) + ` marker${n}.`); // ~ 400 words
const narrative = (ch, sub) => [seg(`${ch}${sub}a`), seg(`${ch}${sub}b`), seg(`${ch}${sub}c`)].join('\n\n');

function makeContext(targetChapter) {
  const previousChapters = [];
  for (let ch = 1; ch < targetChapter; ch++) {
    for (let sub = 1; sub <= 3; sub++) {
      previousChapters.push({
        chapter: ch, subchapter: sub, pathKey: 'ROOT',
        title: `Chapter ${ch}.${sub}`,
        narrative: narrative(ch, sub),
        decision: sub === 3 ? { options: [{key:'A',title:'Belief A here',focus:'a focus sentence about it'},{key:'B',title:'Belief B here',focus:'another focus sentence'}] } : null,
        branchingPath: '1A-2A',
        isRecent: true,
      });
    }
  }
  const playerChoices = [];
  for (let ch = 1; ch < targetChapter; ch++) {
    playerChoices.push({ chapter: ch, optionKey: 'A', optionTitle: `Belief for chapter ${ch}`, optionFocus: 'A one sentence focus explaining the stakes and tradeoffs of it.' });
  }
  const narrativeThreads = [];
  for (let i = 0; i < 24; i++) {
    narrativeThreads.push({ type: i%2?'investigation':'promise', chapter: Math.max(1,targetChapter-3), subchapter: 1, description: `Thread number ${i} that must be tracked across the campaign and never dropped`, status: 'active', urgency: i<6?'critical':'normal', dueChapter: i<6? targetChapter-1 : null, characters: ['Jack'] });
  }
  return {
    foundation: {},
    previousChapters,
    playerChoices,
    currentPosition: { chapter: targetChapter, subchapter: 1, pathKey: 'AAAA' },
    establishedFacts: [],
    pathPersonality: { type: 'methodical', description: 'x' },
    decisionConsequences: null,
    narrativeThreads,
    storyArc: null,
    chapterOutline: null,
  };
}

function makeUnderMap(chapters) {
  const fragments = [];
  const nodes = [];
  const theories = [];
  for (let i = 0; i < chapters * 4; i++) {
    fragments.push({ id:`frag_symbol_f${i}`, label:`Fragment label ${i}`, kind:['symbol','place','person','phenomenon'][i%4], detail:'d', seen: i%3===0?2:1, firstCaseNumber:`00${1+Math.floor(i/4)}A` });
  }
  for (let i = 0; i < chapters * 2; i++) {
    nodes.push({ id:`n${i}`, revelation:`A revealed truth about the hidden world number ${i} that the player surfaced.` });
  }
  for (let i = 0; i < chapters; i++) {
    theories.push({ chapter: chapters - i, interpretation:`The player belief number ${i} about the hidden world`, correct: i%2?true:null, grounded: true });
  }
  return { fragments, nodes, theories, latentRelations: [{aLabel:'X thing', bLabel:'Y thing'}], relations: [], connections: [], foil: { belief:'The map is a predator', fromChapter:2, presence:2, name:'The Cartographer' } };
}

describe('MEASURE', () => {
  test('sizes', () => {
    const rows = [];
    for (const targetChapter of [2, 4, 8, 12]) {
      const ctx = makeContext(targetChapter);
      ctx.underMap = makeUnderMap(targetChapter);
      S.currentUnderMap = ctx.underMap;
      const full = S._buildStorySummarySection(ctx);
      const cached = S._buildStorySummarySection(ctx, { maxChapter: targetChapter - 1 });
      const dyn = S._buildStorySummarySection(ctx, { minChapter: targetChapter, maxChapter: targetChapter });
      ctx.establishedFacts = S._extractEstablishedFacts(ctx.previousChapters);
      const consistency = S._buildConsistencySection(ctx);
      const knowledge = S._buildKnowledgeSection(ctx);
      const theory = S._buildPlayerTheorySection(ctx.underMap, targetChapter);
      const anchors = S._buildContinuityAnchorSection(ctx, targetChapter);
      const dialogue = S._buildDialogueHistorySection(S._extractCharacterDialogueHistory(ctx.previousChapters));
      const dynPrompt = S._buildDynamicPrompt(ctx, targetChapter, 1, false, { cachedHistoryMaxChapter: targetChapter - 1 });
      // add chapter N's A beat so the B-beat window is non-empty
      const ctxB = makeContext(targetChapter);
      ctxB.underMap = ctx.underMap;
      ctxB.previousChapters.push({ chapter: targetChapter, subchapter: 1, pathKey:'AAAA', title:`Chapter ${targetChapter}.1`, narrative: narrative(targetChapter,1), branchingPath:'1A-2A', isRecent:true });
      ctxB.currentPosition = { chapter: targetChapter, subchapter: 2, pathKey:'AAAA' };
      ctxB.establishedFacts = S._extractEstablishedFacts(ctxB.previousChapters);
      const dynStoryB = S._buildStorySummarySection(ctxB, { minChapter: targetChapter, maxChapter: targetChapter });
      const dynPromptB = S._buildDynamicPrompt(ctxB, targetChapter, 2, false, { cachedHistoryMaxChapter: targetChapter - 1 });
      const choiceHistBlockInCache = (S._buildStorySummarySection(ctx, { maxChapter: targetChapter - 1 }).match(/PLAYER CHOICE HISTORY/g)||[]).length;
      const choiceHistBlockInDyn = (dynStoryB.match(/PLAYER CHOICE HISTORY/g)||[]).length;
      const engagement = S._buildEngagementGuidanceSection(ctx, targetChapter, 1) || '';
      const task = S._buildTaskSection(ctx, targetChapter, 1, false) || '';
      const taskC = S._buildTaskSection(ctx, targetChapter, 3, true) || '';
      const { buildVoiceDNASection } = require('../storyGeneration/prompts');
      const voice = buildVoiceDNASection(S._extractCharactersFromContext(ctx, targetChapter), ctx, targetChapter) || '';
      const uncached = S._buildGenerationPrompt(ctx, targetChapter, 1, false);
      rows.push({
        ch: targetChapter,
        fullStory: full.length,
        cachedStory: cached.length,
        dynStory: dyn.length,
        consistency: consistency.length,
        knowledge: knowledge.length,
        theory: theory.length,
        anchors: anchors.length,
        dialogue: dialogue.length,
        dynPromptA: dynPrompt.length,
        dynPromptB: dynPromptB.length,
        uncachedPrompt: uncached.length,
        dynStoryB: dynStoryB.length,
        choiceHistInCache: choiceHistBlockInCache,
        choiceHistInDyn: choiceHistBlockInDyn,
        engagement: engagement.length,
        task: task.length,
        taskC: taskC.length,
        voice: voice.length,
      });
    }
    console.log(JSON.stringify(rows, null, 1));
    // per-tag breakdown of the ch8 A-beat dynamic prompt
    {
      const ctx = makeContext(8); ctx.underMap = makeUnderMap(8); S.currentUnderMap = ctx.underMap;
      ctx.establishedFacts = S._extractEstablishedFacts(ctx.previousChapters);
      const dp = S._buildDynamicPrompt(ctx, 8, 1, false, { cachedHistoryMaxChapter: 7 });
      const re = /<([a-z_]+)>([\s\S]*?)<\/\1>/g;
      let m; const out = [];
      while ((m = re.exec(dp))) out.push([m[1], m[0].length]);
      out.push(['TOTAL', dp.length]);
      console.log('DYN BLOCKS', JSON.stringify(out));
      const taskIdx = dp.indexOf('<task>');
      console.log('task block chars', dp.length - taskIdx);
    }
    {
      const ctxA = makeContext(5); ctxA.currentPosition = { chapter:5, subchapter:1, pathKey:'AAAA' };
      const ctxB = makeContext(5); ctxB.currentPosition = { chapter:5, subchapter:2, pathKey:'AAAA' };
      const cachedA = S._buildStorySummarySection(ctxA, { maxChapter: 4 });
      const cachedB = S._buildStorySummarySection(ctxB, { maxChapter: 4 });
      console.log('CACHE CONTENT IDENTICAL A vs B?', cachedA === cachedB, cachedA.length, cachedB.length);
      console.log('A has continue-from-here marker?', cachedA.includes('Immediately previous subchapter (continue from here)'));
      console.log('B has continue-from-here marker?', cachedB.includes('Immediately previous subchapter (continue from here)'));
      // Which subchapter does the A-built cache mark?
      const idx = cachedA.indexOf('Immediately previous subchapter (continue from here)');
      console.log('A marker context:', JSON.stringify(cachedA.slice(idx, idx+180)));
    }
    const staticCache = S._buildStaticCacheContent();
    console.log('STATIC CACHE chars', staticCache.length);
    const { buildMasterSystemPrompt } = require('../storyGeneration/prompts');
    console.log('SYSTEM PROMPT chars', buildMasterSystemPrompt().length);
    expect(true).toBe(true);
  });
});
