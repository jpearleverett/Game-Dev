/**
 * Endgame terminal scenes (Move 3, docs §5). The 3-variant clarity spectrum:
 * the variant is chosen by how truly the player read the Under-Map across the
 * campaign (their Clarity), and the specific terminal text is flavored by the
 * final belief they sealed. Templated + deterministic (no LLM at the finale),
 * so the ending is stable and the selection is unit-testable.
 */
import { clarity, endingVariant } from './underMap';

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
 *            clarity: {resolved,correct,ratio} }}
 */
export function selectEnding(map) {
  const variant = endingVariant(map);
  const base = ENDINGS[variant] || ENDINGS.unproven;
  const cl = clarity(map);

  // Flavor the close with the LAST belief the player sealed.
  const theories = Array.isArray(map?.theories) ? map.theories : [];
  const lastBelief = theories.length ? theories[0].interpretation : null;
  let flavorLine = null;
  if (lastBelief) {
    if (variant === 'clear') flavorLine = `You staked everything on one reading — "${lastBelief}" — and the Under-Map bore it out.`;
    else if (variant === 'half') flavorLine = `Your last reading — "${lastBelief}" — was part of the truth, and part of the dark talking.`;
    else if (variant === 'deceived') flavorLine = `Your last reading — "${lastBelief}" — was the shape it wanted you to settle on.`;
  }

  return { ...base, flavorLine, clarity: cl };
}
