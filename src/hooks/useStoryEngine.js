import { useCallback } from 'react';
import { normalizeStoryCampaignShape, computeStoryUnlockAt, formatCaseNumber } from '../utils/gameLogic';
import { resolveStoryPathKey, getStoryEntry, computeBranchPathKey } from '../data/storyContent';
import { saveStoredProgress } from '../storage/progressStorage';
import { log } from '../utils/llmTrace';

// Configurable unlock delay (24 hours default)
const CHAPTER_UNLOCK_DELAY_MS = 24 * 60 * 60 * 1000;

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
    if (!storyCampaign.awaitingDecision) return;

    const decisionCase = storyCampaign.pendingDecisionCase;
    const decisionTime = new Date().toISOString();
    const nextChapter = storyCampaign.chapter + 1;
    const nextSubchapter = 1;
    const nextCaseNumber = formatCaseNumber(nextChapter, nextSubchapter);

    // Build updated choice history first, then compute the cumulative branch key for the next chapter.
    // This ensures generated content is keyed by the full decision history (not just "A"/"B").
    // Include optionTitle and optionFocus so the LLM knows WHAT the player chose
    const pendingOptions = storyCampaign.pendingDecisionOptions || {};
    const selectedOption = pendingOptions[optionKey] || {};
    const nextChoiceHistory = [
      ...storyCampaign.choiceHistory,
      {
        caseNumber: decisionCase,
        optionKey: optionKey,
        optionTitle: selectedOption.title || null,  // e.g., "Go to the wharf and confront the confessor"
        optionFocus: selectedOption.focus || null,  // e.g., "Prioritizes direct confrontation over evidence"
        timestamp: decisionTime,
      },
    ];
    const nextPathKey = computeBranchPathKey(nextChoiceHistory, nextChapter);

    const updatedStory = {
      ...storyCampaign,
      awaitingDecision: false,
      pendingDecisionCase: null,
      lastDecision: {
        caseNumber: decisionCase,
        selectedAt: decisionTime,
        optionKey: optionKey,
        nextChapter: nextChapter,
        nextPathKey,
      },
      choiceHistory: nextChoiceHistory.map((entry) => ({
        ...entry,
        // Useful for UI history display and debugging
        nextPathKey: computeBranchPathKey(nextChoiceHistory, parseInt(entry.caseNumber?.slice(0, 3), 10) + 1),
      })),
      pathHistory: {
        ...storyCampaign.pathHistory,
        // Store the cumulative branch key for this chapter for deterministic retrieval.
        [nextChapter]: nextPathKey,
      },
      currentPathKey: nextPathKey,
      chapter: nextChapter,
      subchapter: nextSubchapter,
      activeCaseNumber: nextCaseNumber,
      nextStoryUnlockAt: nextChapter > 3
        ? new Date(Date.now() + CHAPTER_UNLOCK_DELAY_MS).toISOString()
        : null
    };

    updateProgress({
        storyCampaign: updatedStory,
        nextUnlockAt: updatedStory.nextStoryUnlockAt
    });

    // Force persistent save immediately to prevent save scumming
    saveStoredProgress({
        ...progress,
        storyCampaign: updatedStory,
        nextUnlockAt: updatedStory.nextStoryUnlockAt
    }).catch((err) => {
      // Log error but don't block - the in-memory state is already updated
      // This prevents data loss from being completely silent
      console.error('[useStoryEngine] Failed to persist decision:', err);
    });

  }, [storyCampaign, updateProgress, progress]);

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

    // STALE STATE FIX: Use explicit caseNumber from UI if provided, fall back to state
    const caseNumber = explicitCaseNumber || storyCampaign.activeCaseNumber;
    if (!caseNumber) return;

    // Check if this is actually a C subchapter
    const subchapterLetter = caseNumber.slice(-1);
    if (subchapterLetter !== 'C') {
      console.warn('[useStoryEngine] selectDecisionBeforePuzzle called on non-C subchapter:', caseNumber);
      return;
    }

    const updatedStory = {
      ...storyCampaign,
      preDecision: {
        caseNumber,
        optionKey,
        optionTitle: optionDetails.title || null,
        optionFocus: optionDetails.focus || null,
        timestamp: new Date().toISOString(),
      },
    };

    log.debug('useStoryEngine', `Pre-puzzle decision stored for ${caseNumber}: Option ${optionKey}`);

    updateProgress({ storyCampaign: updatedStory });

    // Force persistent save immediately
    saveStoredProgress({
      ...progress,
      storyCampaign: updatedStory,
    }).catch((err) => {
      console.error('[useStoryEngine] Failed to persist pre-decision:', err);
    });

  }, [storyCampaign, updateProgress, progress]);

  /**
   * Apply a pre-made decision after solving the puzzle.
   * This is called by submitGuess when a C subchapter puzzle is solved
   * and a preDecision exists for that case.
   */
  const applyPreDecision = useCallback(() => {
    const preDecision = storyCampaign.preDecision;
    if (!preDecision) return false;

    // Verify the pre-decision is for the current case
    if (preDecision.caseNumber !== storyCampaign.activeCaseNumber) {
      console.warn('[useStoryEngine] Pre-decision case mismatch:', preDecision.caseNumber, 'vs', storyCampaign.activeCaseNumber);
      return false;
    }

    const optionKey = preDecision.optionKey;
    const decisionCase = preDecision.caseNumber;
    const decisionTime = preDecision.timestamp;
    const nextChapter = storyCampaign.chapter + 1;
    const nextSubchapter = 1;
    const nextCaseNumber = formatCaseNumber(nextChapter, nextSubchapter);

    const nextChoiceHistory = [
      ...storyCampaign.choiceHistory,
      {
        caseNumber: decisionCase,
        optionKey: optionKey,
        optionTitle: preDecision.optionTitle || null,
        optionFocus: preDecision.optionFocus || null,
        timestamp: decisionTime,
      },
    ];
    const nextPathKey = computeBranchPathKey(nextChoiceHistory, nextChapter);

    const updatedStory = {
      ...storyCampaign,
      preDecision: null, // Clear the pre-decision
      awaitingDecision: false,
      pendingDecisionCase: null,
      lastDecision: {
        caseNumber: decisionCase,
        selectedAt: decisionTime,
        optionKey: optionKey,
        nextChapter: nextChapter,
        nextPathKey,
      },
      choiceHistory: nextChoiceHistory.map((entry) => ({
        ...entry,
        nextPathKey: computeBranchPathKey(nextChoiceHistory, parseInt(entry.caseNumber?.slice(0, 3), 10) + 1),
      })),
      pathHistory: {
        ...storyCampaign.pathHistory,
        [nextChapter]: nextPathKey,
      },
      currentPathKey: nextPathKey,
      chapter: nextChapter,
      subchapter: nextSubchapter,
      activeCaseNumber: nextCaseNumber,
      nextStoryUnlockAt: nextChapter > 3
        ? new Date(Date.now() + CHAPTER_UNLOCK_DELAY_MS).toISOString()
        : null
    };

    log.debug('useStoryEngine', `Applied pre-decision for ${decisionCase}: advancing to Chapter ${nextChapter}`);

    updateProgress({
      storyCampaign: updatedStory,
      nextUnlockAt: updatedStory.nextStoryUnlockAt
    });

    saveStoredProgress({
      ...progress,
      storyCampaign: updatedStory,
      nextUnlockAt: updatedStory.nextStoryUnlockAt
    }).catch((err) => {
      console.error('[useStoryEngine] Failed to persist applied pre-decision:', err);
    });

    return true;
  }, [storyCampaign, updateProgress, progress]);

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

    const existingChoices = storyCampaign.branchingChoices || [];
    const existingIndex = existingChoices.findIndex(bc => bc.caseNumber === caseNumber);
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
        return false;
      }
      if (existing.isComplete === false && isComplete) {
        const updatedChoice = {
          ...existing,
          isComplete: true,
          completedAt: new Date().toISOString(),
        };
        const updatedChoices = [...existingChoices];
        updatedChoices[existingIndex] = updatedChoice;
        const updatedStory = {
          ...storyCampaign,
          branchingChoices: updatedChoices,
        };
        updateProgress({
          storyCampaign: updatedStory,
        });
        saveStoredProgress({
          ...progress,
          storyCampaign: updatedStory,
        }).catch((err) => {
          console.error('[useStoryEngine] Failed to persist branching choice update:', err);
        });
        return true;
      }
      return false;
    }

    const newChoice = {
      caseNumber,
      firstChoice: fc,
      secondChoice: sc,
      completedAt: new Date().toISOString(),
      isComplete,
    };

    const updatedChoices = [...existingChoices, newChoice];

    const updatedStory = {
      ...storyCampaign,
      branchingChoices: updatedChoices,
    };

    log.debug('useStoryEngine', `Saving branching choice for ${caseNumber}: ${fc} -> ${sc}`);

    updateProgress({
      storyCampaign: updatedStory,
    });

    // Force persistent save immediately
    saveStoredProgress({
      ...progress,
      storyCampaign: updatedStory,
    }).catch((err) => {
      console.error('[useStoryEngine] Failed to persist branching choice:', err);
    });

    return true;
  }, [storyCampaign, updateProgress, progress]);

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
