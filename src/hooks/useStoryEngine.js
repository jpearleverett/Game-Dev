import { useCallback } from 'react';
import { normalizeStoryCampaignShape, computeStoryUnlockAt, formatCaseNumber } from '../utils/gameLogic';
import { resolveStoryPathKey, getStoryEntry, computeBranchPathKey } from '../data/storyContent';
import { advanceWithDecision, CHAPTER_UNLOCK_DELAY_MS, FIRST_GATED_CHAPTER } from '../utils/storyAdvance';
import { log } from '../utils/llmTrace';

export function useStoryEngine(progress, updateProgress) {

  const storyCampaign = normalizeStoryCampaignShape(progress.storyCampaign);

  const enterStoryCampaign = useCallback(({ reset = false } = {}) => {
    if (reset) {
       // Reset logic
       // We just return instructions for the persistence layer
       const blankStory = {
           // ... new blank story ...
           // Ideally imported from storage/progressStorage but we want to keep deps clean
           // For now let's assume the caller handles the deep reset or we use updateProgress
       };
       // This is tricky without the "createBlank" function.
       // Let's rely on the persistence layer's 'clearProgress' or similar if needed, 
       // or just reset the story part.
       updateProgress({
           storyCampaign: normalizeStoryCampaignShape(null) // Resets to defaults
       });
       return true;
    }
    
    // Just switch mode
    // The consumer needs to switch the "mode" state, which might be in GameContext
    return true; 
  }, [updateProgress]);

  const selectDecision = useCallback((optionKey) => {
    const decisionTime = new Date().toISOString();
    // Functional update reads the LATEST campaign at write time (clobber-safe);
    // persistence handled by the debounced auto-save.
    updateProgress((prev) => {
      const current = normalizeStoryCampaignShape(prev.storyCampaign);
      if (!current.awaitingDecision) return null;
      const selectedOption = (current.pendingDecisionOptions || {})[optionKey] || {};
      const updatedStory = advanceWithDecision(current, {
        decisionCase: current.pendingDecisionCase,
        optionKey,
        optionTitle: selectedOption.title || null,
        optionFocus: selectedOption.focus || null,
        timestamp: decisionTime,
      });
      return { storyCampaign: updatedStory, nextUnlockAt: updatedStory.nextStoryUnlockAt };
    });
  }, [updateProgress]);

  /**
   * NARRATIVE-FIRST FLOW: Select a decision BEFORE solving the puzzle.
   * This stores the decision as pending - it will be applied after the puzzle is solved.
   * Used in C subchapters where we show the decision options before the puzzle.
   *
   * @param {string} optionKey - The selected option ('A' or 'B')
   * @param {object} optionDetails - Details about the selected option (title, focus, etc.)
   * @param {string} explicitCaseNumber - The case number from the UI (to avoid stale state issues)
   */
  const selectDecisionBeforePuzzle = useCallback((optionKey, optionDetails = {}, explicitCaseNumber = null) => {
    if (!optionKey) return;

    const timestamp = new Date().toISOString();
    // Functional update reads the LATEST campaign so we never clobber a concurrent
    // write. Persistence is handled by the debounced auto-save.
    updateProgress((prev) => {
      const current = normalizeStoryCampaignShape(prev.storyCampaign);
      const caseNumber = explicitCaseNumber || current.activeCaseNumber;
      if (!caseNumber) return null;
      const subchapterLetter = caseNumber.slice(-1);
      if (subchapterLetter !== 'C') {
        console.warn('[useStoryEngine] selectDecisionBeforePuzzle called on non-C subchapter:', caseNumber);
        return null;
      }
      log.debug('useStoryEngine', `Pre-puzzle decision stored for ${caseNumber}: Option ${optionKey}`);
      return {
        storyCampaign: {
          ...current,
          preDecision: {
            caseNumber,
            optionKey,
            optionTitle: optionDetails.title || null,
            optionFocus: optionDetails.focus || null,
            timestamp,
          },
        },
      };
    });
  }, [updateProgress]);

  /**
   * Apply a pre-made decision after solving the puzzle.
   * This is called by submitGuess when a C subchapter puzzle is solved
   * and a preDecision exists for that case.
   */
  const applyPreDecision = useCallback(() => {
    // Functional update: read the LATEST campaign at write time so the advance can
    // never be clobbered by (or clobber) a concurrent write. Persistence is handled
    // by usePersistence's debounced auto-save — no manual saveStoredProgress here.
    updateProgress((prev) => {
      const current = normalizeStoryCampaignShape(prev.storyCampaign);
      const preDecision = current.preDecision;
      if (!preDecision) return null;
      if (preDecision.caseNumber !== current.activeCaseNumber) {
        console.warn('[useStoryEngine] Pre-decision case mismatch:', preDecision.caseNumber, 'vs', current.activeCaseNumber);
        return null;
      }
      const updatedStory = advanceWithDecision(current, {
        decisionCase: preDecision.caseNumber,
        optionKey: preDecision.optionKey,
        optionTitle: preDecision.optionTitle || null,
        optionFocus: preDecision.optionFocus || null,
        timestamp: preDecision.timestamp,
      });
      log.debug('useStoryEngine', `Applied pre-decision for ${preDecision.caseNumber}: advancing to Chapter ${updatedStory.chapter}`);
      return { storyCampaign: updatedStory, nextUnlockAt: updatedStory.nextStoryUnlockAt };
    });

    return true;
  }, [updateProgress]);

  /**
   * Save player's branching choice within a subchapter (for true infinite branching).
   * This tracks which path the player took through the interactive narrative,
   * allowing future content to continue from their ACTUAL experience.
   *
   * @param {string} caseNumber - The case where the choice was made (e.g., "002A")
   * @param {string} firstChoice - The first choice key (e.g., "1A", "1B", "1C")
   * @param {string} secondChoice - The second choice key (e.g., "1A-2A", "1B-2C")
   */
  const saveBranchingChoice = useCallback((caseNumber, firstChoice, secondChoice, options = {}) => {
    if (!caseNumber || !firstChoice || !secondChoice) {
      console.warn('[useStoryEngine] saveBranchingChoice called with missing params:', { caseNumber, firstChoice, secondChoice });
      return false;
    }
    const isComplete = options?.isComplete !== false;

    // Normalize + validate choice keys.
    // Branching narrative keys are expected to be:
    // - firstChoice: "1A" | "1B" | "1C"
    // - secondChoice: "1A-2A" .. "1C-2C"
    //
    // We've seen malformed keys get persisted (e.g. "A-A-B" or "1B-1B-2C").
    // Reject/normalize here so downstream story context and pathDecisions lookup stay correct.
    const fc = String(firstChoice).trim().toUpperCase();
    let sc = String(secondChoice).trim().toUpperCase();

    const firstOk = /^1[ABC]$/.test(fc);
    const secondFullOk = /^1[ABC]-2[ABC]$/.test(sc);
    const secondShortOk = /^2[ABC]$/.test(sc);

    if (firstOk && secondShortOk) {
      sc = `${fc}-${sc}`;
    }

    // If caller passed a duplicated form like "1B-1B-2C", collapse it.
    // Keep the trailing "1B-2C" segment.
    const dupMatch = sc.match(/^(1[ABC])-(1[ABC]-2[ABC])$/);
    if (dupMatch) {
      sc = dupMatch[2];
    }

    if (!firstOk || !/^1[ABC]-2[ABC]$/.test(sc)) {
      console.warn('[useStoryEngine] Rejecting malformed branching choice keys:', {
        caseNumber,
        firstChoice,
        secondChoice,
        normalizedFirst: fc,
        normalizedSecond: sc,
      });
      return false;
    }

    const nowIso = new Date().toISOString();
    // Functional update: read the LATEST campaign at write time so branching writes
    // never clobber a concurrent story advance. Persistence via debounced auto-save.
    updateProgress((prev) => {
      const current = normalizeStoryCampaignShape(prev.storyCampaign);
      const existingChoices = current.branchingChoices || [];
      const existingIndex = existingChoices.findIndex((bc) => bc.caseNumber === caseNumber);

      if (existingIndex >= 0) {
        const existing = existingChoices[existingIndex];
        const sameChoice = existing.firstChoice === fc && existing.secondChoice === sc;
        if (!sameChoice) {
          console.warn('[useStoryEngine] Branching choice mismatch - keeping existing choice:', {
            caseNumber,
            existingFirst: existing.firstChoice,
            existingSecond: existing.secondChoice,
            incomingFirst: fc,
            incomingSecond: sc,
          });
          return null;
        }
        if (existing.isComplete === false && isComplete) {
          const updatedChoices = [...existingChoices];
          updatedChoices[existingIndex] = { ...existing, isComplete: true, completedAt: nowIso };
          return { storyCampaign: { ...current, branchingChoices: updatedChoices } };
        }
        return null;
      }

      const newChoice = { caseNumber, firstChoice: fc, secondChoice: sc, completedAt: nowIso, isComplete };
      log.debug('useStoryEngine', `Saving branching choice for ${caseNumber}: ${fc} -> ${sc}`);
      return { storyCampaign: { ...current, branchingChoices: [...existingChoices, newChoice] } };
    });

    return true;
  }, [updateProgress]);

  // This logic was previously in 'activateStoryCase'
  const activateStoryCase = useCallback(({ skipLock = false } = {}) => {
      const caseNumber = storyCampaign.activeCaseNumber;
      if (!caseNumber) return { ok: false, reason: 'missing-case' };
      
      if (!skipLock) {
          if (storyCampaign.awaitingDecision) {
              return { ok: false, reason: 'decision-required' };
          }
          if (storyCampaign.nextStoryUnlockAt) {
              // Use Date objects for comparison to avoid timezone issues
              const now = new Date();
              const unlockTime = new Date(storyCampaign.nextStoryUnlockAt);
              if (now < unlockTime) {
                  return { ok: false, reason: 'locked', unlockAt: storyCampaign.nextStoryUnlockAt };
              }
          }
      }
      
      // We need to find the case ID for this number.
      // Since we don't have the full 'cases' list here, we return the caseNumber 
      // and let the GameContext map it to an ID.
      return { ok: true, caseNumber };
  }, [storyCampaign]);

  return {
      storyCampaign,
      enterStoryCampaign,
      selectDecision,
      selectDecisionBeforePuzzle,
      applyPreDecision,
      activateStoryCase,
      saveBranchingChoice,
  };
}
