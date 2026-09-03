import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
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
import storyGenerationService from '../services/StoryGenerationService';
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
      let stored = null;
      const blank = createBlankProgress();
      try {
        stored = await loadStoredProgress();

        if (!stored) {
          stored = blank;
        } else {
          // Migrate old progress to new format
          stored = migrateProgress(stored) || stored;
        
          // Merge settings
          stored.settings = { ...blank.settings, ...(stored.settings || {}) };

          // The counters the Stats screen and submitGuess read. Only
          // unlockedCaseIds was ever repaired, so a save written before these
          // existed (or corrupted to a non-array) threw on the first .length or
          // .includes and took hydration down with it.
          if (!Array.isArray(stored.solvedCaseIds)) stored.solvedCaseIds = [];
          if (!Array.isArray(stored.failedCaseIds)) stored.failedCaseIds = [];
          if (!Array.isArray(stored.unlockedCaseIds)) stored.unlockedCaseIds = [...blank.unlockedCaseIds];
          if (!stored.attemptsDistribution || typeof stored.attemptsDistribution !== 'object') {
            stored.attemptsDistribution = { ...blank.attemptsDistribution };
          }
          if (!stored.seenLessons || typeof stored.seenLessons !== 'object') stored.seenLessons = {};
        
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
      
        // Ensure unlockedCaseIds is an array before using it
        if (!Array.isArray(stored.unlockedCaseIds)) {
          stored.unlockedCaseIds = [1];
        }

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

      } catch (e) {
        // Every step above walks arbitrary persisted data (migrateProgress,
        // normalizeStoryCampaignShape and its board/Under-Map normalizers, date
        // arithmetic). A single throw left hydrationComplete false forever, and
        // the app sat on its loading state with no error and no way forward.
        // A corrupt save should cost the save, not the app.
        console.warn('[Persistence] hydrate failed, starting fresh:', e?.message);
        stored = blank;
      } finally {
        setProgress(stored || blank);
        setHydrationComplete(true);
      }
    };

    hydrate();
  }, []);

  // Latest progress, readable from a flush that is not driven by the effect.
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const flushProgressNow = useCallback(() => {
    if (!hydrationComplete) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    saveStoredProgress(progressRef.current);
  }, [hydrationComplete]);

  // Auto-save on change with debouncing to prevent excessive writes
  useEffect(() => {
    if (!hydrationComplete) return;

    // Clear any pending save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Debounce the save operation
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      saveStoredProgress(progress);
    }, SAVE_DEBOUNCE_MS);

    // Cleanup before the next effect. Deliberately NOT cancelling on teardown
    // without writing: the cleanup used to drop a pending save on unmount, so
    // sealing a belief and immediately leaving lost it.
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        saveStoredProgress(progressRef.current);
      }
    };
  }, [progress, hydrationComplete]);

  // Backgrounding is the other way the debounced write was lost: the OS suspends
  // the JS thread before a 500ms timer fires, so a belief sealed and then
  // immediately backgrounded never reached storage and the player replayed the
  // beat (regenerating a scene that no longer matched their map).
  useEffect(() => {
    if (!hydrationComplete) return undefined;
    let sub = null;
    try {
      sub = AppState.addEventListener('change', (next) => {
        if (next === 'inactive' || next === 'background') flushProgressNow();
      });
    } catch (e) {
      // No AppState on this platform (or in a test renderer). The debounced save
      // and the unmount flush still cover the common cases.
      console.warn('[usePersistence] AppState unavailable; skipping background flush:', e?.message);
    }
    return () => {
      try { sub?.remove?.(); } catch (_e) { /* nothing to remove */ }
    };
  }, [hydrationComplete, flushProgressNow]);

  const updateProgress = useCallback((updatesOrFn) => {
    setProgress((prev) => {
      // Support a functional updater so callers can read the LATEST state and
      // avoid clobbering concurrent writes (e.g. a story advance happening at the
      // same time as a Case Board write).
      const updates = typeof updatesOrFn === 'function' ? updatesOrFn(prev) : updatesOrFn;
      if (!updates) return prev;
      return { ...prev, ...updates };
    });
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

  const markTutorialComplete = useCallback(() => {
    setProgress((prev) => {
        if (prev.tutorialCompleted) return prev;
        return { ...prev, tutorialCompleted: true };
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
    // Also drop every generated chapter so the player gets fresh content (this is
    // what makes story-bible and prompt changes take effect). It has to go
    // through the service: removing the AsyncStorage keys alone left the
    // chapters in the in-memory caches that are read first, so a wipe inside a
    // running session silently replayed the old run.
    await storyGenerationService.resetGeneratedContent();
    setProgress(blank);
    return blank;
  }, []);

  return {
    progress,
    hydrationComplete,
    flushProgressNow,
    updateProgress,
    updateSettings,
    markPrologueSeen,
    markTutorialComplete,
    setPremiumUnlocked,
    markCaseBriefingSeen,
    clearProgress,
  };
}
