import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createBlankProgress,
  createBlankStoryCampaign,
  createBlankEndingsState,
  createBlankAchievementsState,
  createBlankChapterCheckpoints,
  createBlankGameplayStats,
  loadStoredProgress,
  saveStoredProgress,
  migrateProgress,
} from '../storage/progressStorage';
import { normalizeStoryCampaignShape } from '../utils/gameLogic';
import { SEASON_ONE_CASES, SEASON_ONE_CASE_COUNT } from '../data/cases';
import { getCaseByNumber } from '../utils/gameLogic';

// Debounce delay for auto-save (ms) - prevents excessive writes during rapid state changes
const SAVE_DEBOUNCE_MS = 500;

export function usePersistence() {
  const [progress, setProgress] = useState(createBlankProgress());
  const [hydrationComplete, setHydrationComplete] = useState(false);
  const saveTimerRef = useRef(null);

  // Hydrate on mount
  useEffect(() => {
    const hydrate = async () => {
      let stored = await loadStoredProgress();
      const blank = createBlankProgress();

      if (!stored) {
        stored = blank;
      } else {
        // Migrate old progress to new format
        stored = migrateProgress(stored) || stored;
        
        // Merge settings
        stored.settings = { ...blank.settings, ...(stored.settings || {}) };
        
        // Type checks
        if (typeof stored.seenPrologue !== 'boolean') stored.seenPrologue = false;
        if (typeof stored.premiumUnlocked !== 'boolean') stored.premiumUnlocked = false;
        
        // Normalize story
        if (!stored.storyCampaign) {
          stored.storyCampaign = createBlankStoryCampaign();
        } else {
          stored.storyCampaign = normalizeStoryCampaignShape(stored.storyCampaign);
        }

        // Ensure briefings object
        if (!stored.seenBriefings || typeof stored.seenBriefings !== 'object') {
          stored.seenBriefings = {};
        }
        
        // Ensure new state objects exist
        if (!stored.endings) stored.endings = createBlankEndingsState();
        if (!stored.achievements) stored.achievements = createBlankAchievementsState();
        if (!stored.chapterCheckpoints) stored.chapterCheckpoints = createBlankChapterCheckpoints();
        if (!stored.gameplayStats) stored.gameplayStats = createBlankGameplayStats();
      }

      // Ensure valid current case ID
      const storyCase = getCaseByNumber(stored.storyCampaign.activeCaseNumber) || null;
      const fallbackCase =
        storyCase ||
        SEASON_ONE_CASES.find((c) => c.id === stored.currentCaseId) ||
        SEASON_ONE_CASES[0];
      
      if (fallbackCase?.id) {
        stored.currentCaseId = fallbackCase.id;
        if (!stored.unlockedCaseIds.includes(fallbackCase.id)) {
          stored.unlockedCaseIds = Array.from(
            new Set([...stored.unlockedCaseIds, fallbackCase.id]),
          );
        }
      }

      // Check timer unlocks
      if (stored.nextUnlockAt) {
        const nowIso = new Date().toISOString();
        if (nowIso >= stored.nextUnlockAt) {
          const unlockedCount = stored.unlockedCaseIds.length;
          if (unlockedCount < SEASON_ONE_CASE_COUNT) {
            stored.unlockedCaseIds = Array.from(
              new Set([...stored.unlockedCaseIds, unlockedCount + 1]),
            );
          }
          stored.nextUnlockAt = null;
        }
      }

      setProgress(stored);
      setHydrationComplete(true);
    };

    hydrate();
  }, []);

  // Auto-save on change with debouncing to prevent excessive writes
  useEffect(() => {
    if (!hydrationComplete) return;

    // Clear any pending save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Debounce the save operation
    saveTimerRef.current = setTimeout(() => {
      saveStoredProgress(progress);
    }, SAVE_DEBOUNCE_MS);

    // Cleanup on unmount or before next effect
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [progress, hydrationComplete]);

  const updateProgress = useCallback((updates) => {
    setProgress((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const updateSettings = useCallback((partialSettings) => {
    setProgress((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...partialSettings,
      },
    }));
  }, []);

  const markPrologueSeen = useCallback(() => {
    setProgress((prev) => {
        if (prev.seenPrologue) return prev;
        return { ...prev, seenPrologue: true };
    });
  }, []);

  const setPremiumUnlocked = useCallback((value = true) => {
    setProgress((prev) => {
        if (prev.premiumUnlocked === value) return prev;
        return { ...prev, premiumUnlocked: value };
    });
  }, []);

  const markCaseBriefingSeen = useCallback((caseId) => {
    if (!caseId) return;
    setProgress((prev) => {
        const existing = prev.seenBriefings || {};
        if (existing[caseId]) return prev;
        return {
            ...prev,
            seenBriefings: { ...existing, [caseId]: true },
        };
    });
  }, []);

  const clearProgress = useCallback(async () => {
    const blank = createBlankProgress();
    await saveStoredProgress(blank);
    setProgress(blank);
    return blank;
  }, []);

  return {
    progress,
    hydrationComplete,
    updateProgress,
    updateSettings,
    markPrologueSeen,
    setPremiumUnlocked,
    markCaseBriefingSeen,
    clearProgress,
  };
}
