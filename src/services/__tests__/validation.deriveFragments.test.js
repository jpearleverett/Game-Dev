jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));
jest.mock('../LLMService', () => ({
  llmService: { init: jest.fn(), isConfigured: jest.fn(() => true), complete: jest.fn(async () => ({ content: '{}' })) },
}));
jest.mock('../../storage/generatedStoryStorage', () => ({ saveStoryContext: jest.fn(async () => true) }));

import { validationMethods } from '../storyGeneration/validation';

const derive = (bn) => validationMethods._deriveFragmentsFromBranching(bn);

describe('_deriveFragmentsFromBranching (EXAMINE fallback for generated scenes)', () => {
  test('returns nothing for empty/garbage', () => {
    expect(derive(null)).toEqual([]);
    expect(derive({})).toEqual([]);
    expect(derive({ opening: { details: [] } })).toEqual([]);
  });

  test('derives a fragment from EVERY tappable detail across all segments (kind/card optional)', () => {
    const bn = {
      opening: {
        text: '...',
        details: [
          { phrase: 'the moving ink', note: 'It shifts.', evidenceCard: 'Moving Ink', kind: 'phenomenon' },
          { phrase: 'a damp coat', note: 'Just rain.', evidenceCard: '' }, // no card/kind -> still a fragment (label condensed from phrase)
        ],
      },
      firstChoice: {
        options: [
          { key: '1A', details: [{ phrase: 'the brass key', note: 'Old.', evidenceCard: 'Brass Key' }] }, // evidenceCard, no kind -> phenomenon
        ],
      },
      secondChoices: [
        { afterChoice: '1A', options: [{ key: '1A-2A', details: [{ phrase: 'Acheron Avenue', note: 'Paved over.', kind: 'place' }] }] },
      ],
    };
    const out = derive(bn);
    const labels = out.map((f) => f.label);
    expect(labels).toContain('Moving Ink');
    expect(labels).toContain('Brass Key');
    expect(labels).toContain('Acheron Avenue'); // kind, no evidenceCard -> label condensed from phrase
    // Every tappable detail is collectable. Without an evidenceCard the label is
    // condensed from the phrase (leading article dropped) rather than being the
    // raw clause: the label is the fragment's identity, so it has to be short and
    // stable enough for a later scene to reuse it and deepen the motif.
    expect(labels).toContain('damp coat');
    expect(out.find((f) => f.label === 'damp coat').phrase).toBe('a damp coat');

    const ink = out.find((f) => f.label === 'Moving Ink');
    expect(ink.kind).toBe('phenomenon');
    expect(ink.phrase).toBe('the moving ink');
    const key = out.find((f) => f.label === 'Brass Key');
    expect(key.kind).toBe('phenomenon'); // default when no kind
    const place = out.find((f) => f.label === 'Acheron Avenue');
    expect(place.kind).toBe('place');
  });

  test('dedupes by label across segments', () => {
    const bn = {
      opening: { details: [{ phrase: 'the glyph', note: 'x', evidenceCard: 'The Glyph', kind: 'symbol' }] },
      firstChoice: { options: [{ details: [{ phrase: 'the glyph again', note: 'y', evidenceCard: 'The Glyph', kind: 'symbol' }] }] },
    };
    expect(derive(bn).filter((f) => f.label === 'The Glyph')).toHaveLength(1);
  });
});

describe('_parseGeneratedContent populates fragments end-to-end (the bug: none appeared in 1B/1C)', () => {
  test('a generated scene with NO top-level fragments still yields tappable fragments from details', () => {
    const content = {
      title: 'The Edge of the Grid',
      branchingNarrative: {
        opening: {
          text: 'The ink moved on the page while he read 14 Acheron Avenue aloud.',
          details: [
            { phrase: 'The ink moved', note: 'Ink does not move on its own.', evidenceCard: 'Moving Ink', kind: 'phenomenon' },
            { phrase: '14 Acheron Avenue', note: 'A street paved over a decade ago.', evidenceCard: 'Acheron Avenue', kind: 'place' },
            { phrase: 'the rain', note: 'Just weather.', evidenceCard: '' }, // no card -> still collectable (label=phrase)
          ],
        },
        firstChoice: {
          prompt: 'What now?',
          options: [
            { key: '1A', label: 'Ask the courier', response: 'Marco would not meet his eyes.', details: [{ phrase: 'Marco', note: 'The courier who knows more than he says.', evidenceCard: 'Marco', kind: 'person' }] },
          ],
        },
        secondChoices: [],
      },
      // NOTE: deliberately NO top-level `fragments` — reproduces what the model emitted.
    };

    const result = validationMethods._parseGeneratedContent(content, false);
    const labels = result.fragments.map((f) => f.label);
    expect(labels).toEqual(expect.arrayContaining(['Moving Ink', 'Acheron Avenue', 'Marco']));
    // Every derived fragment must carry a verbatim phrase so EXAMINE can highlight it.
    result.fragments.forEach((f) => expect(typeof f.phrase === 'string' && f.phrase.length).toBeTruthy());
    // Kinds preserved from the tagged details.
    expect(result.fragments.find((f) => f.label === 'Acheron Avenue').kind).toBe('place');
    expect(result.fragments.find((f) => f.label === 'Marco').kind).toBe('person');
  });

  test('explicit top-level fragments are kept and merged with derived ones', () => {
    const content = {
      title: 'x',
      fragments: [{ label: 'A black envelope', kind: 'symbol', detail: 'expensive', phrase: 'black envelope' }],
      branchingNarrative: {
        opening: { text: 'the seal was cold', details: [{ phrase: 'the seal', note: 'cold wax', evidenceCard: 'The Seal', kind: 'symbol' }] },
        firstChoice: { options: [] },
        secondChoices: [],
      },
    };
    const result = validationMethods._parseGeneratedContent(content, false);
    const labels = result.fragments.map((f) => f.label);
    expect(labels).toEqual(expect.arrayContaining(['A black envelope', 'The Seal']));
  });
});

describe('UNDER-MAP deduction fields survive parsing (Moves 1 & 2)', () => {
  const baseBN = {
    opening: { text: 'x', details: [] },
    firstChoice: { options: [] },
    secondChoices: [],
  };

  test('relations carry falseReadings (choose-the-truth decoys)', () => {
    const content = {
      title: 'x',
      branchingNarrative: baseBN,
      relations: [
        {
          aLabel: 'The seal', bLabel: 'The ink',
          revelation: 'Both answer to rules ink and wax do not obey.',
          falseReadings: ['A client used fancy materials.', 'A printing trick, nothing more.'],
        },
      ],
    };
    const out = validationMethods._parseGeneratedContent(content, false);
    expect(out.relations[0].falseReadings).toEqual([
      'A client used fancy materials.',
      'A printing trick, nothing more.',
    ]);
  });

  test('relations without falseReadings normalize to an empty array (clean reveal)', () => {
    const content = {
      title: 'x',
      branchingNarrative: baseBN,
      relations: [{ aLabel: 'A', bLabel: 'B', revelation: 'They are one.' }],
    };
    const out = validationMethods._parseGeneratedContent(content, false);
    expect(out.relations[0].falseReadings).toEqual([]);
    expect(out.relations[0].scope).toBe('chapter'); // default
  });

  test('CONNECT guarantee: under-delivered relations are topped up to 2 from this scene fragments', () => {
    const content = {
      title: 'x',
      branchingNarrative: {
        opening: {
          text: 'The seal on 14 Acheron Avenue caught the lamplight wrong.',
          details: [
            { phrase: 'The seal', note: 'a mark', evidenceCard: 'The Seal', kind: 'symbol' },
            { phrase: '14 Acheron Avenue', note: 'a street', evidenceCard: 'Acheron Avenue', kind: 'place' },
            { phrase: 'lamplight wrong', note: 'the glow', evidenceCard: 'Wrong Lamplight', kind: 'phenomenon' },
          ],
        },
        firstChoice: { options: [] },
        secondChoices: [],
      },
      // Model authored NO relations.
    };
    const out = validationMethods._parseGeneratedContent(content, false); // A/B beat
    const labelSet = new Set(out.fragments.map((f) => f.label.toLowerCase()));
    const resolvable = out.relations.filter(
      (r) => labelSet.has(String(r.aLabel).toLowerCase()) && labelSet.has(String(r.bLabel).toLowerCase()),
    );
    expect(resolvable.length).toBeGreaterThanOrEqual(2);
    // Fallbacks carry a revelation + two false readings (choose-the-truth still works).
    resolvable.forEach((r) => {
      expect(typeof r.revelation).toBe('string');
      expect(r.revelation.length).toBeGreaterThan(0);
      expect(r.falseReadings).toHaveLength(2);
    });
  });

  test('CONNECT guarantee does NOT fire on C/decision beats', () => {
    const content = {
      title: 'x',
      branchingNarrative: {
        opening: { text: 'a b c', details: [
          { phrase: 'a', note: 'x', evidenceCard: 'A', kind: 'symbol' },
          { phrase: 'b', note: 'y', evidenceCard: 'B', kind: 'place' },
        ] },
        firstChoice: { options: [] },
        secondChoices: [],
      },
    };
    const out = validationMethods._parseGeneratedContent(content, true); // C/decision
    expect(out.relations).toEqual([]); // no fabricated relations on THEORY beats
  });

  test('arc-scoped relations survive parsing (keystone payoff)', () => {
    const content = {
      title: 'x',
      branchingNarrative: baseBN,
      relations: [{ aLabel: 'A', bLabel: 'B', revelation: 'One signal across the map.', scope: 'arc' }],
    };
    const out = validationMethods._parseGeneratedContent(content, false);
    expect(out.relations[0].scope).toBe('arc');
  });

  test('echoes survive parsing and drop entries with no line', () => {
    const content = {
      title: 'x',
      branchingNarrative: baseBN,
      echoes: [
        { nodeRef: 'The ink marks who carries it.', line: 'The silver was on the ledger again.' },
        { nodeRef: 'orphan with no line' },
      ],
    };
    const out = validationMethods._parseGeneratedContent(content, false);
    expect(out.echoes).toHaveLength(1);
    expect(out.echoes[0]).toEqual({
      nodeRef: 'The ink marks who carries it.',
      line: 'The silver was on the ledger again.',
    });
  });

  test('beliefResolution survives parsing only when shaped correctly', () => {
    const ok = validationMethods._parseGeneratedContent({
      title: 'x',
      branchingNarrative: baseBN,
      beliefResolution: { resolvesChapter: 2, correct: false, line: 'Blackwell was never guiding you.' },
    }, false);
    expect(ok.beliefResolution).toEqual({ resolvesChapter: 2, correct: false, line: 'Blackwell was never guiding you.' });

    // Missing/!boolean correct or non-numeric chapter -> dropped to null.
    const bad = validationMethods._parseGeneratedContent({
      title: 'x', branchingNarrative: baseBN, beliefResolution: { resolvesChapter: 'two', correct: 'yes' },
    }, false);
    expect(bad.beliefResolution).toBeNull();

    const none = validationMethods._parseGeneratedContent({ title: 'x', branchingNarrative: baseBN }, false);
    expect(none.beliefResolution).toBeNull();
  });

  test('foilName is captured (trimmed) when present, null otherwise', () => {
    const named = validationMethods._parseGeneratedContent({
      title: 'x', branchingNarrative: baseBN, foilName: '  The Cartographer  ',
    }, false);
    expect(named.foilName).toBe('The Cartographer');

    const none = validationMethods._parseGeneratedContent({ title: 'x', branchingNarrative: baseBN }, false);
    expect(none.foilName).toBeNull();

    const tooLong = validationMethods._parseGeneratedContent({
      title: 'x', branchingNarrative: baseBN, foilName: 'z'.repeat(200),
    }, false);
    expect(tooLong.foilName).toBeNull();
  });

  test('a phrase that is nowhere in the prose loses its tap target, not the whole scene', () => {
    const content = {
      title: 'x',
      branchingNarrative: {
        opening: { text: 'The rain rose through the station lights.' },
        firstChoice: { options: [] },
        secondChoices: [],
      },
      fragments: [{ label: 'Missing phrase', kind: 'phenomenon', phrase: 'silver staircase' }],
      relations: [],
    };
    const issues = validationMethods._validateUnderMapPlayability(content);
    // Reporting this as hard-critical bought a full scene rewrite from a repair
    // prompt that is never told about the Under-Map, so the same mismatch came
    // back after ~70s. The fragment survives; only the tap is dropped.
    expect(issues).toEqual([]);
    expect(content.fragments[0].phrase).toBe('');
    expect(content.fragments[0].label).toBe('Missing phrase');
  });

  test('a phrase that differs only in case or spacing is repaired to the exact prose substring', () => {
    const content = {
      title: 'x',
      branchingNarrative: {
        opening: { text: 'He watched the Silver\n  Staircase turn back on itself.' },
        firstChoice: { options: [] },
        secondChoices: [],
      },
      fragments: [{ label: 'Silver Staircase', kind: 'place', phrase: 'silver staircase' }],
      relations: [],
    };
    expect(validationMethods._validateUnderMapPlayability(content)).toEqual([]);
    // Rewritten to what the reader will actually find in the rendered prose.
    expect(content.fragments[0].phrase).toBe('Silver\n  Staircase');
  });

  test('a missing cross-chapter weave is deferred to a latent thread, not a hard failure', () => {
    validationMethods.currentUnderMap = {
      fragments: [{ label: 'Old Rain', kind: 'phenomenon' }],
    };
    const issues = validationMethods._validateUnderMapPlayability({
      title: 'x',
      branchingNarrative: {
        opening: { text: 'The new door opened under the bridge.' },
        firstChoice: { options: [] },
        secondChoices: [],
      },
      fragments: [{ label: 'New Door', kind: 'place', phrase: 'new door' }],
      relations: [{ aLabel: 'New Door', bLabel: 'Bridge Shadow', revelation: 'They share a lock.' }],
    });
    // A missed cross-chapter weave is deferred, not fatal: addRelations stores an
    // unresolved endpoint as a latent relation and promotes it when the fragment
    // arrives, so failing the scene bought a slow rewrite that could not target it.
    expect(issues).toEqual([]);

    const fixed = validationMethods._validateUnderMapPlayability({
      title: 'x',
      branchingNarrative: {
        opening: { text: 'The new door opened under the old rain.' },
        firstChoice: { options: [] },
        secondChoices: [],
      },
      fragments: [{ label: 'New Door', kind: 'place', phrase: 'new door' }],
      relations: [{ aLabel: 'New Door', bLabel: 'Old Rain', revelation: 'The door opens only when the old rain returns.' }],
    });
    expect(fixed).toEqual([]);
    validationMethods.currentUnderMap = null;
  });
});

describe('fragment labels stay short enough to be an identity', () => {
  test('a whole prose clause is condensed, and the full phrase is kept for tapping', () => {
    const bn = {
      opening: {
        details: [
          {
            phrase: 'the rain that fell upward past the third-floor sills',
            note: 'Wrong direction.',
            evidenceCard: '',
            kind: 'phenomenon',
          },
        ],
      },
    };
    const [frag] = validationMethods._deriveFragmentsFromBranching(bn);
    expect(frag.label).toBe('rain that fell upward');
    expect(frag.label.split(' ').length).toBeLessThanOrEqual(4);
    // The tappable substring must stay verbatim, or EXAMINE cannot highlight it.
    expect(frag.phrase).toBe('the rain that fell upward past the third-floor sills');
  });

  test('an over-long label arriving on an explicit fragment is condensed too', () => {
    const out = validationMethods._normalizeFragments([
      { label: 'the long slow tolling of a bell somewhere under the street', kind: 'phenomenon', phrase: 'the long slow tolling' },
    ]);
    expect(out[0].label).toBe('long slow tolling of');
  });

  test('an explicit evidenceCard always wins over the condensed phrase', () => {
    const bn = {
      opening: { details: [{ phrase: 'the rain that fell upward past the sills', note: 'x', evidenceCard: 'Upward Rain', kind: 'phenomenon' }] },
    };
    expect(validationMethods._deriveFragmentsFromBranching(bn)[0].label).toBe('Upward Rain');
  });
});

describe('EXAMINE phrases survive the prose cleaner', () => {
  test('an em dash in a phrase is rewritten the same way it is in the prose', () => {
    const normalized = validationMethods._normalizeBranchingNarrative({
      opening: {
        text: 'He turned the brass token — still warm — over in his hand.',
        details: [{ phrase: 'the brass token — still warm', note: 'Warm.', evidenceCard: 'Brass Token' }],
      },
      firstChoice: { options: [] },
      secondChoices: [],
    });
    const phrase = normalized.opening.details[0].phrase;
    // The reader looks this up verbatim in the cleaned prose; if the transform is
    // applied to one and not the other, the anomaly can never be tapped.
    expect(phrase).not.toContain('—');
    expect(normalized.opening.text).toContain(phrase);
  });

  test('an explicit fragment phrase is cleaned identically', () => {
    const [frag] = validationMethods._normalizeFragments([
      { label: 'Brass Token', kind: 'symbol', phrase: 'the brass token — still warm' },
    ]);
    expect(frag.phrase).toBe('the brass token, still warm');
  });
});
