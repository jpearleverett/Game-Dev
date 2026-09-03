/**
 * Guards on the prose corpus that ships inside every generation prompt.
 *
 * The exemplars are the strongest signal the model gets: it matches what it is
 * shown far more reliably than what it is told. Before this suite existed the
 * corpus was verbatim excerpts from a published novel in a different genre, and
 * the prompt instructed the model to write "in the same novel as these
 * passages" — so the register, the paragraph shape and the em dash rule were all
 * being taught wrong by demonstration while being stated correctly in prose.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));
jest.mock('../LLMService', () => ({ llmService: { init: jest.fn(), isConfigured: () => true } }));
jest.mock('../../storage/generatedStoryStorage', () => ({ saveStoryContext: jest.fn(async () => true) }));

import {
  buildMasterSystemPrompt,
  STYLE_EXAMPLES,
  buildExtendedStyleExamples,
  buildManyShotExamples,
} from '../storyGeneration/prompts';
import { EXAMPLE_PASSAGES, EXTENDED_STYLE_GROUNDING, WRITING_STYLE, NEGATIVE_EXAMPLES } from '../../data/storyBible';

const promptBlocks = () => ({
  system: buildMasterSystemPrompt(),
  style: STYLE_EXAMPLES,
  extended: buildExtendedStyleExamples(),
  manyShot: buildManyShotExamples(),
});

const allPassages = () => [
  ...Object.entries(EXAMPLE_PASSAGES),
  ...Object.entries(EXTENDED_STYLE_GROUNDING),
];

describe('the prompt corpus is the game\'s own prose', () => {
  test('no text from another author reaches the model', () => {
    const text = Object.values(promptBlocks()).join('\n');
    expect(text).not.toMatch(/Sean Devine|Jimmy Marcus|Coleman Candy|Deer Island|Annabeth|Dave Boyle/i);
    expect(text).not.toMatch(/Mystic River|Dennis Lehane/i);
  });

  test('every exemplar is grounded in Ashport', () => {
    allPassages().forEach(([name, prose]) => {
      expect(`${name}: ${prose}`).toMatch(/Ashport|Jack|Halloway|Blackwell|Under-?Map|Murphy|Underbridge|Civic Archive/);
    });
  });
});

describe('the exemplars demonstrate what the rules ask for', () => {
  test('each runs at the segment target rather than being a short excerpt', () => {
    allPassages().forEach(([name, prose]) => {
      const words = prose.trim().split(/\s+/).length;
      // The stated target is 380-420. A corpus of short excerpts is what taught
      // the model to under-write against that number.
      expect({ name, words }).toEqual({ name, words: expect.any(Number) });
      expect(words).toBeGreaterThanOrEqual(340);
      expect(words).toBeLessThanOrEqual(520);
    });
  });

  test('each has real paragraph structure, for a paged reader', () => {
    allPassages().forEach(([name, prose]) => {
      const paragraphs = prose.trim().split(/\n\s*\n/).filter(Boolean);
      expect(`${name} paragraphs: ${paragraphs.length}`).toBe(`${name} paragraphs: ${paragraphs.length}`);
      expect(paragraphs.length).toBeGreaterThanOrEqual(4);
    });
  });

  test('none contains the em dash the rules forbid', () => {
    allPassages().forEach(([name, prose]) => {
      expect(`${name}: ${prose.includes('—')}`).toBe(`${name}: false`);
    });
  });

  test('none uses the banned constructions', () => {
    const banned = [
      /\bit (?:was|is)n['’]t just\b/i,
      /\bdid ?n['’]t just\b/i,
      /\bmore than just\b/i,
      /\blittle did\b/i,
      /\bunbeknownst\b/i,
      /\bsomehow\b/i,
      /\bseemingly\b/i,
      /\b(?:delve|unravel|tapestry|myriad|whilst)\b/i,
      /(^|\n)\s*Suddenly\b/,
    ];
    allPassages().forEach(([name, prose]) => {
      banned.forEach((re) => {
        expect(`${name} matches ${re}: ${re.test(prose)}`).toBe(`${name} matches ${re}: false`);
      });
    });
  });

  test('all dialogue uses double quotes', () => {
    allPassages().forEach(([name, prose]) => {
      // A single-quoted line of dialogue would demonstrate the wrong punctuation.
      expect(`${name}: ${/(^|\n)\s*['‘][A-Z]/.test(prose)}`).toBe(`${name}: false`);
    });
  });
});

describe('the em dash rule stays credible', () => {
  test('it names the character it bans, and nothing else in the prompt uses one', () => {
    const rule = WRITING_STYLE.absolutelyForbidden.find((r) => /em dash/i.test(r));
    expect(rule).toContain('—');

    Object.entries(promptBlocks()).forEach(([block, text]) => {
      text.split('\n').forEach((line) => {
        if (!line.includes('—')) return;
        // The only legitimate appearance is the rule stating the prohibition.
        expect(`${block}: ${line.trim().slice(0, 80)}`).toMatch(/em dash/i);
      });
    });
  });
});

describe('the retired many-shot corpus stays retired', () => {
  test('it contributes nothing to the prompt', () => {
    expect(buildManyShotExamples()).toBe('');
  });
});

describe('the negative examples annotate themselves, not an earlier draft', () => {
  // Every quoted fragment in `problems` used to come from a badVersion that had
  // since been rewritten: the prompt told the model that "Felt a wave of shock"
  // and "Couldn't help but notice" were the faults in a passage containing
  // neither. A demonstration that does not match its own label teaches nothing.
  const quoted = (line) => Array.from(line.matchAll(/"([^"]{4,})"/g)).map((m) => m[1]);
  const norm = (t) => String(t).replace(/[\u2018\u2019]/g, "'").toLowerCase();

  Object.entries(NEGATIVE_EXAMPLES).forEach(([name, ex]) => {
    test(`${name}: every phrase quoted as a problem appears in its badVersion`, () => {
      const bad = norm(ex.badVersion);
      ex.problems.forEach((p) => {
        quoted(p).forEach((phrase) => {
          expect(`${name} problems quote "${phrase}": ${bad.includes(norm(phrase))}`)
            .toBe(`${name} problems quote "${phrase}": true`);
        });
      });
    });

    test(`${name}: every phrase quoted as working appears in its goodVersion`, () => {
      const good = norm(ex.goodVersion);
      (ex.whyItWorks || []).forEach((w) => {
        quoted(w).forEach((phrase) => {
          expect(`${name} whyItWorks quotes "${phrase}": ${good.includes(norm(phrase))}`)
            .toBe(`${name} whyItWorks quotes "${phrase}": true`);
        });
      });
    });
  });
});
