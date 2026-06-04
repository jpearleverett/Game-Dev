import {
  isLayer1Partial,
  secondChoiceResponsesNeeded,
  secondChoiceResponsesComplete,
  mergeSecondChoiceResponses,
} from '../storyGeneration/lazyBranching';

const layer1 = () => ({
  opening: { text: 'open' },
  firstChoice: { prompt: 'p', options: [{ key: '1A', label: 'a', response: 'ra' }, { key: '1B', label: 'b', response: 'rb' }, { key: '1C', label: 'c', response: 'rc' }] },
  secondChoices: [
    { afterChoice: '1A', prompt: 'p', options: [{ key: '1A-2A', label: 'x', summary: 's' }, { key: '1A-2B', label: 'y', summary: 's' }, { key: '1A-2C', label: 'z', summary: 's' }] },
    { afterChoice: '1B', prompt: 'p', options: [{ key: '1B-2A', label: 'x', summary: 's' }, { key: '1B-2B', label: 'y', summary: 's' }, { key: '1B-2C', label: 'z', summary: 's' }] },
    { afterChoice: '1C', prompt: 'p', options: [{ key: '1C-2A', label: 'x', summary: 's' }, { key: '1C-2B', label: 'y', summary: 's' }, { key: '1C-2C', label: 'z', summary: 's' }] },
  ],
});

describe('lazyBranching', () => {
  test('detects a Layer-1 partial (missing second-choice responses)', () => {
    expect(isLayer1Partial(layer1())).toBe(true);
    expect(secondChoiceResponsesNeeded(layer1(), '1A')).toBe(true);
    expect(secondChoiceResponsesComplete(layer1(), '1A')).toBe(false);
  });

  test('merges Layer-2 responses for one firstChoice by key, leaves others untouched', () => {
    const merged = mergeSecondChoiceResponses(layer1(), '1A', {
      afterChoice: '1A',
      responses: [
        { key: '1A-2A', response: 'END A' },
        { key: '1A-2B', response: 'END B', details: [{ phrase: 'x', note: 'n' }] },
        { key: '1A-2C', response: 'END C' },
      ],
    });

    // 1A now complete...
    expect(secondChoiceResponsesComplete(merged, '1A')).toBe(true);
    const g1a = merged.secondChoices.find((g) => g.afterChoice === '1A');
    expect(g1a.options.map((o) => o.response)).toEqual(['END A', 'END B', 'END C']);
    expect(g1a.options[1].details).toEqual([{ phrase: 'x', note: 'n' }]);

    // ...but 1B / 1C still pending, and labels preserved.
    expect(secondChoiceResponsesNeeded(merged, '1B')).toBe(true);
    expect(merged.secondChoices.find((g) => g.afterChoice === '1A').options[0].label).toBe('x');

    // original not mutated
    expect(secondChoiceResponsesComplete(layer1(), '1A')).toBe(false);
  });

  test('matches positionally if keys are missing', () => {
    const merged = mergeSecondChoiceResponses(layer1(), '1B', {
      afterChoice: '1B',
      responses: [{ response: 'P0' }, { response: 'P1' }, { response: 'P2' }],
    });
    const g = merged.secondChoices.find((x) => x.afterChoice === '1B');
    expect(g.options.map((o) => o.response)).toEqual(['P0', 'P1', 'P2']);
  });

  test('a fully-populated tree is not a Layer-1 partial', () => {
    const full = mergeSecondChoiceResponses(
      mergeSecondChoiceResponses(
        mergeSecondChoiceResponses(layer1(), '1A', { responses: [{ key: '1A-2A', response: 'a' }, { key: '1A-2B', response: 'b' }, { key: '1A-2C', response: 'c' }] }),
        '1B', { responses: [{ key: '1B-2A', response: 'a' }, { key: '1B-2B', response: 'b' }, { key: '1B-2C', response: 'c' }] },
      ),
      '1C', { responses: [{ key: '1C-2A', response: 'a' }, { key: '1C-2B', response: 'b' }, { key: '1C-2C', response: 'c' }] },
    );
    expect(isLayer1Partial(full)).toBe(false);
  });

  test('empty payload is a no-op', () => {
    const bn = layer1();
    expect(mergeSecondChoiceResponses(bn, '1A', { responses: [] })).toBe(bn);
  });
});
