import { selectEnding } from '../endings';
import { createBlankUnderMap, recordTheory, resolveTheory } from '../underMap';

const withBeliefs = (results) => {
  let m = createBlankUnderMap();
  results.forEach((_, i) => { m = recordTheory(m, { chapter: i + 1, fragmentIds: ['a'], interpretation: `belief ${i + 1}` }); });
  results.forEach((correct, i) => { m = resolveTheory(m, i + 1, correct); });
  return m;
};

describe('selectEnding', () => {
  test('unproven when no belief has resolved', () => {
    const e = selectEnding(createBlankUnderMap());
    expect(e.variant).toBe('unproven');
    expect(e.id).toBe('ending_unproven');
    expect(Array.isArray(e.body)).toBe(true);
    expect(e.flavorLine).toBeNull(); // no sealed belief
  });

  test('clear ending at high clarity, flavored by the last belief', () => {
    const e = selectEnding(withBeliefs([true, true, false])); // 2/3 >= 0.66
    expect(e.variant).toBe('clear');
    expect(e.id).toBe('ending_clear');
    expect(e.clarity).toEqual({ resolved: 3, correct: 2, ratio: 2 / 3 });
    // theories prepend newest-first -> last sealed is "belief 3".
    expect(e.flavorLine).toContain('belief 3');
  });

  test('half ending at middling clarity', () => {
    const e = selectEnding(withBeliefs([true, false, false])); // 1/3 ~0.33
    expect(e.variant).toBe('half');
    expect(e.id).toBe('ending_half');
  });

  test('deceived ending at low clarity', () => {
    const e = selectEnding(withBeliefs([false, false])); // 0/2
    expect(e.variant).toBe('deceived');
    expect(e.id).toBe('ending_deceived');
    expect(e.flavorLine).toContain('shape it wanted');
    expect(e.foilLine).toBeNull(); // withBeliefs seals no rejected readings -> no foil
  });

  test('a manifest foil (presence >= 2) pays off in the close', () => {
    let m = createBlankUnderMap();
    m = recordTheory(m, { chapter: 1, fragmentIds: ['a'], interpretation: 'right 1', rejected: ['the door is a mouth'] });
    m = recordTheory(m, { chapter: 2, fragmentIds: ['a'], interpretation: 'right 2', rejected: ['the door is a mouth'] });
    m = resolveTheory(m, 1, false);
    m = resolveTheory(m, 2, false); // both subverted -> presence 2 (manifest), deceived (0/2)
    const e = selectEnding(m);
    expect(e.variant).toBe('deceived');
    expect(e.foilLine).toContain('the door is a mouth');
  });
});

describe('the reading the player walks out on', () => {
  const { selectEnding: pick } = require('../endings');

  const run = (resolved, finalGrounded) => ({
    theories: [
      // Newest first: the chapter-12 belief, sealed and never borne out.
      { chapter: 12, interpretation: 'The map was always a mouth.', correct: null, grounded: finalGrounded },
      ...resolved.map((correct, i) => ({ chapter: 11 - i, interpretation: `belief ${i}`, correct })),
    ],
  });

  test('an ungrounded final reading can cost an ending sitting on the line', () => {
    // Two of three borne out is 0.667, a hair over CLARITY_TRUE. The final
    // belief has no resolution to count, so before this it changed nothing.
    expect(pick(run([true, true, false], null)).variant).toBe('clear');
    expect(pick(run([true, true, false], false)).variant).toBe('half');
  });

  test('a grounded final reading holds the better ending', () => {
    expect(pick(run([true, true, false], true)).variant).toBe('clear');
  });

  test('it cannot overturn an ending that was not close', () => {
    expect(pick(run([false, false, false, false], true)).variant).toBe('deceived');
    expect(pick(run([true, true, true, true], false)).variant).toBe('clear');
  });

  test('the close does not claim an untested reading was borne out', () => {
    const held = pick(run([true, true, false], true));
    expect(held.flavorLine).toContain('walked out on');
    expect(held.flavorLine).not.toContain('bore it out');
    expect(pick(run([true, true, false], false)).flavorLine).toContain('against everything you had surfaced');
  });
});

describe('revisiting the ending shows the one that was reached', () => {
  const { selectEndingById } = require('../endings');

  const run = (correct) => ({
    theories: correct.map((c, i) => ({ chapter: 12 - i, interpretation: `belief ${i}`, correct: c })),
  });

  test('the recorded id wins over a recomputation that has since changed', () => {
    // "Revisit the ending" recomputed from the frozen map every time, which is
    // only correct while the computation never changes. It has changed twice.
    const map = run([false, false, false]); // computes to 'deceived'
    const revisited = selectEndingById(map, 'ending_clear');
    expect(revisited.variant).toBe('clear');
    expect(revisited.title).toBe('The Map Made Whole');
    // The figures still come from the run itself.
    expect(revisited.clarity).toEqual({ resolved: 3, correct: 0, ratio: 0 });
  });

  test('with no recorded id it falls back to the computation', () => {
    expect(selectEndingById(run([true, true, true]), null).variant).toBe('clear');
    expect(selectEndingById(run([false, false, false]), null).variant).toBe('deceived');
  });

  test('an unknown id does not blank the ending', () => {
    expect(selectEndingById(run([true, true, true]), 'ending_nonsense').variant).toBe('clear');
  });
});

describe('every belief the player sealed counts for something', () => {
  const { selectEnding: pick } = require('../endings');

  const run = (specs) => ({
    // Newest first, as recordTheory stores them.
    theories: specs.map((sp, i) => ({
      chapter: specs.length - i,
      interpretation: `belief ${i}`,
      correct: sp.correct,
      grounded: sp.grounded,
    })),
  });

  test('an unanswered belief is no longer worth literally nothing', () => {
    // beliefResolution is an optional emission. clarity() drops an unproven
    // belief from BOTH numerator and denominator, so a run where the model
    // skipped it for most chapters had its ending decided by whichever handful
    // happened to get answered -- and a player whose early readings were all
    // sound but never borne out reached the same ending as one who never sealed
    // them at all.
    const twoAnswered = [{ correct: true, grounded: true }, { correct: true, grounded: true }];
    const fourSkipped = [
      { correct: null, grounded: false },
      { correct: null, grounded: false },
      { correct: null, grounded: false },
      { correct: null, grounded: false },
    ];
    // Two held, four ungrounded-and-untested: 2 / (2 + 2) = 0.5 -> half.
    expect(pick(run([...fourSkipped, ...twoAnswered])).variant).toBe('half');
    // The same two held with nothing skipped is still the clear ending.
    expect(pick(run(twoAnswered)).variant).toBe('clear');
  });

  test('untested but well-grounded readings pull the other way', () => {
    const specs = [
      { correct: null, grounded: true },
      { correct: null, grounded: true },
      { correct: true, grounded: true },
      { correct: false, grounded: false },
    ];
    // (1 + 1) / (2 + 1) = 0.667 -> clear, where the resolved pair alone is 0.5.
    expect(pick(run(specs)).variant).toBe('clear');
  });

  test('a belief with no grounding recorded still abstains', () => {
    // Nothing honest to say about it, so it changes nothing either way.
    const specs = [{ correct: null, grounded: null }, { correct: true, grounded: true }];
    expect(pick(run(specs)).variant).toBe('clear');
  });

  test('with nothing resolved at all the run is still unproven', () => {
    expect(pick(run([{ correct: null, grounded: true }])).variant).toBe('unproven');
  });
});
