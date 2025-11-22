import { useCallback } from 'react';
import { normalizeStoryCampaignShape, computeStoryUnlockAt, formatCaseNumber } from '../utils/gameLogic';
import { resolveStoryPathKey, getStoryEntry } from '../data/storyContent';
import { saveStoredProgress } from '../storage/progressStorage';

export function useStoryEngine(progress, updateProgress, setActiveCaseInternal) {
  
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

    const updatedStory = {
      ...storyCampaign,
      awaitingDecision: false,
      pendingDecisionCase: null,
      lastDecision: {
        caseNumber: decisionCase,
        selectedAt: decisionTime,
        optionKey: optionKey,
        nextChapter: nextChapter
      },
      choiceHistory: [
        ...storyCampaign.choiceHistory,
        {
          caseNumber: decisionCase,
          optionKey: optionKey,
          timestamp: decisionTime
        }
      ],
      pathHistory: {
        ...storyCampaign.pathHistory,
        [nextChapter]: optionKey
      },
      currentPathKey: optionKey,
      chapter: nextChapter,
      subchapter: nextSubchapter,
      activeCaseNumber: nextCaseNumber,
      nextStoryUnlockAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
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
    }).catch(() => {});

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
              const nowIso = new Date().toISOString();
              if (nowIso < storyCampaign.nextStoryUnlockAt) {
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
  };
}
