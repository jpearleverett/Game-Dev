import { useCallback } from 'react';
import { normalizeStoryCampaignShape, computeStoryUnlockAt, formatCaseNumber } from '../utils/gameLogic';
import { resolveStoryPathKey, getStoryEntry, computeBranchPathKey } from '../data/storyContent';
import { saveStoredProgress } from '../storage/progressStorage';

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
   * Save player's branching choice within a subchapter (for true infinite branching).
   * This tracks which path the player took through the interactive narrative,
   * allowing future content to continue from their ACTUAL experience.
   *
   * @param {string} caseNumber - The case where the choice was made (e.g., "002A")
   * @param {string} firstChoice - The first choice key (e.g., "1A", "1B", "1C")
   * @param {string} secondChoice - The second choice key (e.g., "1A-2A", "1B-2C")
   */
  const saveBranchingChoice = useCallback((caseNumber, firstChoice, secondChoice) => {
    if (!caseNumber || !firstChoice || !secondChoice) {
      console.warn('[useStoryEngine] saveBranchingChoice called with missing params:', { caseNumber, firstChoice, secondChoice });
      return;
    }

    const existingChoices = storyCampaign.branchingChoices || [];

    // Check if we already have a choice for this case (shouldn't happen, but be safe)
    const alreadyExists = existingChoices.some(bc => bc.caseNumber === caseNumber);
    if (alreadyExists) {
      console.log(`[useStoryEngine] Branching choice for ${caseNumber} already exists, skipping`);
      return;
    }

    const newChoice = {
      caseNumber,
      firstChoice,
      secondChoice,
      completedAt: new Date().toISOString(),
    };

    const updatedChoices = [...existingChoices, newChoice];

    const updatedStory = {
      ...storyCampaign,
      branchingChoices: updatedChoices,
    };

    console.log(`[useStoryEngine] Saving branching choice for ${caseNumber}: ${firstChoice} -> ${secondChoice}`);

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
      activateStoryCase,
      saveBranchingChoice,
  };
}
