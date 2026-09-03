/**
 * Endgame terminal scenes (Move 3, docs §5). The 3-variant clarity spectrum:
 * the variant is chosen by how truly the player read the Under-Map across the
 * campaign (their Clarity), and the specific terminal text is flavored by the
 * final belief they sealed. Templated + deterministic (no LLM at the finale),
 * so the ending is stable and the selection is unit-testable.
 */
import { clarity, endingVariant, foil, foilPresence, CLARITY_TRUE, CLARITY_PARTIAL } from './underMap';

export const ENDING_VARIANTS = {
  CLEAR: 'clear',
  HALF: 'half',
  DECEIVED: 'deceived',
  UNPROVEN: 'unproven',
};

const ENDINGS = {
  clear: {
    id: 'ending_clear',
    variant: 'clear',
    title: 'The Map Made Whole',
    kicker: 'CLEAR-EYED',
    body: [
      'It comes together the way a name comes back to you — all at once, and then it was never gone. Ashport lies under Ashport, the way it always has, and for the first time Jack sees both at once without the seam tearing him in half.',
      'Every thread he pulled held. The marks, the places that forget themselves, the people who were never quite where the city kept them — they were one shape the whole time, and he read it true.',
      'Blackwell had said the Under-Map only shows itself to those who can bear the seeing. Jack bears it. He steps through with his eyes open, and the dark, for once, makes room.',
    ],
  },
  half: {
    id: 'ending_half',
    variant: 'half',
    title: 'A Map Half-Drawn',
    kicker: 'HALF-BLIND',
    body: [
      'Some of it resolves. Enough that Jack knows the Under-Map is real, that he was right to chase it — and enough, too, that he knows how much of it he still cannot see.',
      'The lines he drew true glow steady. The ones he guessed at flicker and will not settle. He walks out of Ashport understanding the shape of the wound without being able to name what made it.',
      'It is not nothing. A man can live on half a truth. But he will lie awake on the other half for the rest of his life.',
    ],
  },
  deceived: {
    id: 'ending_deceived',
    variant: 'deceived',
    title: 'The Shape You Wanted',
    kicker: 'DECEIVED',
    body: [
      'The Under-Map gave Jack exactly the answers he reached for. That should have been the warning. Reality does not flatter; only a thing that wants something from you tells you what you hoped to hear.',
      'He built his map out of the readings that comforted him, and the hidden world wore each of them like a borrowed coat. By the time the seams showed, he was already standing where it wanted him.',
      'Somewhere beneath Ashport, something closes a ledger in silver ink. The handwriting is his. It was always going to be his.',
    ],
  },
  unproven: {
    id: 'ending_unproven',
    variant: 'unproven',
    title: 'The Threshold',
    kicker: 'UNREAD',
    body: [
      'Jack reaches the end of the map he was given and finds it blank past here — not because there is nothing, but because he never committed to a reading long enough to test it.',
      'The Under-Map waits. It is patient. It has been patient for a very long time.',
    ],
  },
};

/**
 * Choose the ending for a finished campaign.
 * @returns {{ id, variant, title, kicker, body: string[], flavorLine: string|null,
 *            foilLine: string|null, clarity: {resolved,correct,ratio} }}
 */
export function selectEnding(map) {
  const cl = clarity(map);
  const theories = Array.isArray(map?.theories) ? map.theories : [];
  // Newest first (recordTheory prepends), so this is the belief sealed at the
  // chapter-12 climax.
  const last = theories.length ? theories[0] : null;
  const lastBelief = last ? last.interpretation : null;

  // The final belief is never borne out: there is no chapter 13 to emit a
  // beliefResolution for it, so it stays `correct: null` forever and `clarity`
  // (which counts only resolved beliefs) cannot see it. Left alone it is the one
  // reading in a twelve-chapter run that changes nothing about the ending it
  // reaches. Count it as a HALF vote, using the only honest signal available at
  // seal time: whether the player chose the reading their own revealed truths
  // supported. It can only move an ending that was already sitting on a
  // threshold, which is exactly where a last reading should matter.
  const finalIsUnresolved = !!(last && last.correct == null && last.grounded != null);
  let variant = endingVariant(map);
  if (finalIsUnresolved && cl.resolved > 0) {
    const ratio = (cl.correct + (last.grounded ? 0.5 : 0)) / (cl.resolved + 0.5);
    variant = ratio >= CLARITY_TRUE ? 'clear' : ratio >= CLARITY_PARTIAL ? 'half' : 'deceived';
  }
  const base = ENDINGS[variant] || ENDINGS.unproven;

  // Flavor the close with the LAST belief the player sealed. When it was never
  // tested, say so rather than claiming the Under-Map bore it out.
  let flavorLine = null;
  if (lastBelief && finalIsUnresolved) {
    flavorLine = last.grounded
      ? `You walked out on one reading — "${lastBelief}" — and everything you had surfaced stood behind it.`
      : `You walked out on one reading — "${lastBelief}" — against everything you had surfaced.`;
  } else if (lastBelief) {
    if (variant === 'clear') flavorLine = `You staked everything on one reading — "${lastBelief}" — and the Under-Map bore it out.`;
    else if (variant === 'half') flavorLine = `Your last reading — "${lastBelief}" — was part of the truth, and part of the dark talking.`;
    else if (variant === 'deceived') flavorLine = `Your last reading — "${lastBelief}" — was the shape it wanted you to settle on.`;
  }

  // The Other Reader pays off the road not taken once they have grown into a presence.
  const fl = foil(map);
  let foilLine = null;
  if (fl && fl.belief && foilPresence(map) >= 2) {
    if (variant === 'deceived') foilLine = `And the one who read it the other way — "${fl.belief}" — is already standing where you are only now arriving.`;
    else if (variant === 'half') foilLine = `The other reader, who held to "${fl.belief}", kept the half of it you let go.`;
    else if (variant === 'clear') foilLine = `The one who read it as "${fl.belief}" is nowhere to be found now. Where they were certain, you were right.`;
  }

  return { ...base, flavorLine, foilLine, clarity: cl };
}

/**
 * The ending a finished campaign actually REACHED, by its recorded id.
 *
 * "Revisit the ending" recomputed it from the frozen map every time, which is
 * only correct as long as the computation never changes. It has changed twice
 * (blurred readings no longer count as truths; the final belief now carries
 * weight), so a player could be shown a different ending than the one they
 * finished on. The recorded id is the record; the map still supplies the
 * flavour, the foil line and the clarity figures.
 */
export function selectEndingById(map, endingId) {
  const base = endingId
    ? Object.values(ENDINGS).find((e) => e.id === endingId)
    : null;
  const computed = selectEnding(map);
  if (!base || base.variant === computed.variant) return computed;
  return { ...computed, ...base, clarity: computed.clarity };
}


/**
 * The CLOSING REPORT — the case file's last page, composed deterministically
 * from the player's actual run (their beliefs and verdicts, what recurred, who
 * read against them). This is the personal artifact of the campaign: every line
 * is the player's own story, in the register of a report Jack types up at the
 * end. No LLM at the finale (stable, instant, testable).
 *
 * @returns {{ title: string, lines: string[] }}
 */
export function closingReport(map, ending = null) {
  const theories = Array.isArray(map?.theories) ? map.theories : [];
  const fragments = Array.isArray(map?.fragments) ? map.fragments : [];
  const cl = clarity(map);
  const lines = [];

  // The record of readings, oldest first (theories are stored newest-first).
  [...theories].reverse().forEach((t) => {
    if (!t?.interpretation) return;
    // A belief the story never got to test still says something: whether the
    // player's own surfaced truths stood behind it. That is what the final
    // chapter's reading is judged on, so the report should not call it blank.
    const verdict = t.correct === true ? 'HELD'
      : t.correct === false ? 'SUBVERTED'
      : t.grounded === true ? 'UNTESTED · THE TRUTHS BACKED IT'
      : t.grounded === false ? 'UNTESTED · THE TRUTHS DID NOT'
      : 'UNANSWERED';
    lines.push(`CH ${String(t.chapter ?? '?').padStart(2, '0')} — "${t.interpretation}" · ${verdict}`);
  });

  // What kept coming back.
  const motifs = fragments.filter((f) => (f.seen || 1) > 1).sort((a, b) => (b.seen || 1) - (a.seen || 1));
  if (motifs.length) {
    const top = motifs.slice(0, 3).map((f) => `"${f.label}" (×${f.seen})`).join(', ');
    lines.push(`What kept resurfacing: ${top}.`);
  }

  // The rival's last entry.
  const fl = foil(map);
  if (fl?.belief) {
    const manifest = foilPresence(map) >= 2;
    lines.push(manifest
      ? `The Other Reader${fl.name ? `, ${fl.name},` : ''} held to "${fl.belief}" to the end.`
      : `Somewhere in Ashport, someone still reads it as "${fl.belief}".`);
  }

  if (cl.resolved > 0) {
    lines.push(`Final clarity: ${cl.correct} of ${cl.resolved} readings held true.`);
  }

  return {
    title: ending?.variant === 'clear' ? 'CASE CLOSED — READ TRUE'
      : ending?.variant === 'deceived' ? 'CASE CLOSED — MISREAD'
      : 'CASE CLOSED',
    lines,
  };
}
