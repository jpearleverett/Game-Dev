// Pure campaign-advance helpers, shared by useStoryEngine (applyPreDecision /
// selectDecision) and GameContext (completeLogicPuzzle). Keeping the advance math
// in one pure place means every caller advances identically and can be driven from
// inside a functional updateProgress((prev) => ...), which reads the LATEST state
// at write time (clobber-safe).
//
// IMPORTANT: the next position is derived from the COMPLETED case number (the
// param), NOT from current.activeCaseNumber. Navigation and campaign-advance had
// drifted out of sync (the player floats forward by route param while the campaign
// position lagged), and keying the advance off activeCaseNumber made the drift
// permanent (every advance SKIPped). Deriving from the completed case + only ever
// moving FORWARD makes the advance robust and idempotent.

import { formatCaseNumber } from './gameLogic';
import { computeBranchPathKey, parseCaseNumber } from '../data/storyContent';

// Gate cadence: the seal→wait→verdict rhythm IS the retention heartbeat, so it
// starts early (chapter 3) with a short, gentle gate while the habit forms, and
// lengthens once the player is invested. Chapters 1-2 stay binge-able (the hook).
export const CHAPTER_UNLOCK_DELAY_MS = 12 * 60 * 60 * 1000;       // chapters 6+
export const EARLY_CHAPTER_UNLOCK_DELAY_MS = 6 * 60 * 60 * 1000;  // chapters 3-5
export const FIRST_GATED_CHAPTER = 3; // chapters 1-2 are never gated
export const LONG_GATE_CHAPTER = 6;   // full-length gates from here

function nextUnlockAt(nextChapter) {
  if (nextChapter < FIRST_GATED_CHAPTER) return null;
  const delay = nextChapter >= LONG_GATE_CHAPTER ? CHAPTER_UNLOCK_DELAY_MS : EARLY_CHAPTER_UNLOCK_DELAY_MS;
  return new Date(Date.now() + delay).toISOString();
}

/** Sortable order key for a case number, e.g. "002B" -> 2*10+2 = 22. */
export function caseOrder(caseNumber) {
  if (!caseNumber) return 0;
  const { chapter, subchapter } = parseCaseNumber(caseNumber);
  return (chapter || 0) * 10 + (subchapter || 0);
}

/**
 * Advance to the next CHAPTER after a committed decision (the C-climax belief or a
 * post-puzzle decision). `current` must already be normalized. `decisionCase` is the
 * completed C case (e.g. "001C"); the next chapter is derived from IT, not from
 * current.chapter. Returns the updated storyCampaign.
 */
export function advanceWithDecision(current, { decisionCase, optionKey, optionTitle = null, optionFocus = null, timestamp }) {
  const { chapter } = parseCaseNumber(decisionCase);
  const nextChapter = chapter + 1;
  const nextCaseNumber = formatCaseNumber(nextChapter, 1);
  const nextChoiceHistory = [
    ...(Array.isArray(current.choiceHistory) ? current.choiceHistory : []),
    { caseNumber: decisionCase, optionKey, optionTitle, optionFocus, timestamp },
  ];
  const nextPathKey = computeBranchPathKey(nextChoiceHistory, nextChapter);
  return {
    ...current,
    completedCaseNumbers: Array.from(new Set([...(current.completedCaseNumbers || []), decisionCase])),
    preDecision: null,
    awaitingDecision: false,
    pendingDecisionCase: null,
    lastDecision: { caseNumber: decisionCase, selectedAt: timestamp, optionKey, nextChapter, nextPathKey },
    choiceHistory: nextChoiceHistory.map((entry) => ({
      ...entry,
      nextPathKey: computeBranchPathKey(nextChoiceHistory, parseInt(entry.caseNumber?.slice(0, 3), 10) + 1),
    })),
    pathHistory: { ...current.pathHistory, [nextChapter]: nextPathKey },
    currentPathKey: nextPathKey,
    chapter: nextChapter,
    subchapter: 1,
    activeCaseNumber: nextCaseNumber,
    nextStoryUnlockAt: nextUnlockAt(nextChapter),
  };
}

/**
 * Advance to the next SUBCHAPTER (A->B, B->C). `current` must be normalized;
 * `caseNumber` is the just-completed case. The next position is derived from
 * `caseNumber` so it works even if current.activeCaseNumber had drifted.
 */
export function advanceSubchapter(current, caseNumber, { startedAt } = {}) {
  const { chapter, subchapter } = parseCaseNumber(caseNumber);
  const nextSubchapter = subchapter + 1;
  const nextCaseNumber = formatCaseNumber(chapter, nextSubchapter);
  return {
    ...current,
    completedCaseNumbers: Array.from(new Set([...(current.completedCaseNumbers || []), caseNumber])),
    startedAt: current.startedAt || startedAt || null,
    chapter,
    subchapter: nextSubchapter,
    activeCaseNumber: nextCaseNumber,
    awaitingDecision: false,
    pendingDecisionCase: null,
  };
}
