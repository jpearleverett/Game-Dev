import React, { createContext, useContext, useEffect, useCallback, useState, useMemo } from 'react';
import { SEASON_ONE_CASES } from '../data/cases';
import { STATUS, getCaseByNumber, formatCaseNumber, normalizeStoryCampaignShape } from '../utils/gameLogic';
import { resolveStoryPathKey, ROOT_PATH_KEY, isDynamicChapter, hasStoryContent, updateGeneratedCache } from '../data/storyContent';
import { usePersistence } from '../hooks/usePersistence';
import { useGameLogic } from '../hooks/useGameLogic';
import { useStoryEngine } from '../hooks/useStoryEngine';
import { useStoryGeneration, GENERATION_STATUS } from '../hooks/useStoryGeneration';
import { notificationHaptic, impactHaptic, Haptics } from '../utils/haptics';
import { analytics } from '../services/AnalyticsService';
import { purchaseService } from '../services/PurchaseService';
import { ACHIEVEMENTS } from '../data/achievementsData';

const GameStateContext = createContext(null);
const GameDispatchContext = createContext(null);

export { STATUS };
export const GAME_STATUS = STATUS;

export function GameProvider({ children }) {
  const audioRef = React.useRef(null);

  useEffect(() => {
    analytics.init();
  }, []);

  const setAudioController = useCallback((controller) => {
    audioRef.current = controller;
  }, []);

  const {
    progress,
    hydrationComplete,
    updateProgress,
    updateSettings,
    markPrologueSeen,
    setPremiumUnlocked,
    markCaseBriefingSeen,
    clearProgress,
  } = usePersistence();

  const {
    gameState,
    activeCase,
    toggleWordSelection: coreToggleWordSelection,
    submitGuess: coreSubmitGuess,
    resetBoardForCase,
    initializeGame,
    setActiveCaseInternal,
    gameDispatch,
  } = useGameLogic(SEASON_ONE_CASES, progress, updateProgress);

  const {
    storyCampaign,
    selectDecision: storySelectDecisionCore,
    activateStoryCase: storyActivateCase,
  } = useStoryEngine(progress, updateProgress);

  // Wrap selectDecision to trigger story generation after the first decision
  const storySelectDecision = useCallback(async (optionKey) => {
    // Get chapter info before making the decision
    const currentChapter = storyCampaign?.chapter || 1;
    const isFirstDecision = (storyCampaign?.choiceHistory?.length || 0) === 0;

    // Make the decision
    storySelectDecisionCore(optionKey);

    // After first decision (at 1.3), trigger generation for the first case of chapter 2
    // so it's ready immediately. The pregeneration of subsequent chapters is handled
    // by activateStoryCase when the player enters subchapter A of any chapter.
    if (isFirstDecision && currentChapter === 1 && isLLMConfigured) {
      const nextChapter = 2;
      const nextCaseNumber = formatCaseNumber(nextChapter, 1);
      // The path key for chapter 2 is the option chosen at 1.3
      const pathKey = optionKey;

      // Generate content for the first case of chapter 2
      await ensureStoryContent(nextCaseNumber, pathKey);
    }
  }, [storySelectDecisionCore, storyCampaign, isLLMConfigured, ensureStoryContent]);

  // Story generation hook for dynamic content
  const {
    status: generationStatus,
    progress: generationProgress,
    error: generationError,
    isConfigured: isLLMConfigured,
    isGenerating,
    generationType,
    isPreloading,
    configureLLM,
    needsGeneration,
    generateForCase,
    generateChapter,
    pregenerate,
    pregenerateCurrentChapterSiblings,
    cancelGeneration,
    clearError: clearGenerationError,
  } = useStoryGeneration(storyCampaign);

  const [mode, setMode] = useState('daily');

  // State for tracking if we're waiting for generation
  const [awaitingGeneration, setAwaitingGeneration] = useState(false);

  // Helper to get current path key for analytics
  const getCurrentPathKey = useCallback((caseNumber) => {
      if (!progress.storyCampaign || !caseNumber) return ROOT_PATH_KEY;
      return resolveStoryPathKey(caseNumber, progress.storyCampaign);
  }, [progress.storyCampaign]);

  // Initialize game state when persistence is ready
  useEffect(() => {
    if (hydrationComplete && !gameState.hydrationComplete) {
      let initialCaseId = progress.currentCaseId;
      initializeGame(progress, initialCaseId);
    }
  }, [hydrationComplete, gameState.hydrationComplete, progress, initializeGame]);

  /**
   * Check and generate story content if needed for a case
   */
  const ensureStoryContent = useCallback(async (caseNumber, pathKey) => {
    // Chapter 1 is static, no generation needed
    if (!isDynamicChapter(caseNumber)) {
      return { ok: true, generated: false };
    }

    // Check if content exists
    const hasContent = await hasStoryContent(caseNumber, pathKey);
    if (hasContent) {
      return { ok: true, generated: false };
    }

    // Check if LLM is configured
    if (!isLLMConfigured) {
      return { ok: false, reason: 'llm-not-configured' };
    }

    // Generate the content
    setAwaitingGeneration(true);
    try {
      const entry = await generateForCase(
        caseNumber,
        pathKey,
        storyCampaign?.choiceHistory || []
      );

      if (entry) {
        return { ok: true, generated: true, entry };
      }
      return { ok: false, reason: 'generation-failed' };
    } catch (error) {
      return { ok: false, reason: 'generation-error', error: error.message };
    } finally {
      setAwaitingGeneration(false);
    }
  }, [isLLMConfigured, generateForCase, storyCampaign?.choiceHistory]);

  const activateStoryCase = useCallback(
    async ({ skipLock = false, mode: targetMode = 'daily' } = {}) => {
      // Story Mode Logic
      if (targetMode === 'story') {
          const result = storyActivateCase({ skipLock });
          if (!result.ok) return result;

          const caseNumber = result.caseNumber;
          const pathKey = getCurrentPathKey(caseNumber);

          // Check if we need to generate content for this case
          // Only generate for dynamic chapters AFTER the player has made their first decision
          // (i.e., after completing 1.3 and choosing a path)
          const hasFirstDecision = (storyCampaign?.choiceHistory?.length || 0) > 0;
          if (isDynamicChapter(caseNumber) && hasFirstDecision) {
            const genResult = await ensureStoryContent(caseNumber, pathKey);
            if (!genResult.ok) {
              return {
                ok: false,
                reason: genResult.reason,
                error: genResult.error,
                caseNumber
              };
            }
          }

          const targetCase = getCaseByNumber(caseNumber);

          if (!targetCase) return { ok: false, reason: 'missing-case-data' };

          setActiveCaseInternal(targetCase.id);
          setMode('story');

          // Analytics
          analytics.logLevelStart(targetCase.id, 'story', pathKey);

          // Pre-generate content in background (only at start of chapter, i.e., subchapter A)
          // This prevents duplicate pregeneration when activating B and C subchapters
          const { chapter, subchapter } = parseCaseNumber(caseNumber);
          if (chapter < 12 && hasFirstDecision && subchapter === 1) {
            // Generate B and C of current chapter while player reads A and solves the puzzle
            // This gives us 6-23 minutes of gameplay time to generate in background
            pregenerateCurrentChapterSiblings(chapter, pathKey, storyCampaign?.choiceHistory || []);

            // Also pregenerate the next chapter (for both decision paths)
            pregenerate(chapter, pathKey, storyCampaign?.choiceHistory || []);
          }

          return { ok: true, caseId: targetCase.id };
      }

      // Daily Mode Logic
      const targetCaseId = progress.currentCaseId;
      const targetCase = SEASON_ONE_CASES.find(c => c.id === targetCaseId) || SEASON_ONE_CASES[0];

      setActiveCaseInternal(targetCase.id);
      setMode('daily');
      analytics.logLevelStart(targetCase.id, 'daily');
      return { ok: true, caseId: targetCase.id };

    },
    [storyActivateCase, setActiveCaseInternal, progress.currentCaseId, getCurrentPathKey, ensureStoryContent, pregenerate, pregenerateCurrentChapterSiblings, storyCampaign?.choiceHistory]
  );

  // Helper to parse case number (imported from storyContent)
  const parseCaseNumber = (caseNumber) => {
    if (!caseNumber) return { chapter: 1, subchapter: 1 };
    const chapterSegment = caseNumber.slice(0, 3);
    const letter = caseNumber.slice(3, 4);
    const chapter = parseInt(chapterSegment, 10) || 1;
    const subchapter = { 'A': 1, 'B': 2, 'C': 3 }[letter] || 1;
    return { chapter, subchapter };
  };

  const enterStoryCampaign = useCallback(({ reset = false } = {}) => {
    if (reset) {
        updateProgress({ storyCampaign: normalizeStoryCampaignShape(null) });
        return true;
    }
    return activateStoryCase({ mode: 'story' });
  }, [updateProgress, activateStoryCase]);

  const continueStoryCampaign = useCallback(() => {
    return activateStoryCase({ mode: 'story' });
  }, [activateStoryCase]);

  const openStoryCase = useCallback((caseId) => {
      const targetCase = SEASON_ONE_CASES.find(c => c.id === caseId);
      if (!targetCase) return false;
      
      setActiveCaseInternal(targetCase.id);
      setMode('story');
      
      const pathKey = getCurrentPathKey(targetCase.caseNumber);
      analytics.logLevelStart(targetCase.id, 'story', pathKey);
      return true;
  }, [setActiveCaseInternal, getCurrentPathKey]);

  const exitStoryCampaign = useCallback(() => {
      setMode('daily');
      const dailyCaseId = progress.currentCaseId;
      setActiveCaseInternal(dailyCaseId);
  }, [progress.currentCaseId, setActiveCaseInternal]);

  const ensureDailyStoryCase = useCallback(() => {
      // If there is a pending story case, sync to it so Daily Mode reflects current progress
      const story = normalizeStoryCampaignShape(progress.storyCampaign);
      if (story.activeCaseNumber && !story.awaitingDecision) {
          const storyCase = SEASON_ONE_CASES.find(c => c.caseNumber === story.activeCaseNumber);
          if (storyCase && storyCase.id !== progress.currentCaseId) {
              // Sync daily case to story case
              setActiveCaseInternal(storyCase.id);
              setMode('daily');
              updateProgress({ currentCaseId: storyCase.id });
              return { ok: true, caseId: storyCase.id };
          }
      }
      return activateStoryCase({ mode: 'daily' });
  }, [progress.storyCampaign, progress.currentCaseId, activateStoryCase, setActiveCaseInternal, updateProgress]);

  const purchaseBribe = useCallback(async () => {
      try {
          const offerings = await purchaseService.getOfferings();
          const bribePackage = offerings?.current?.availablePackages?.find(
              p => p.product.identifier === 'com.deadletters.bribe_clerk'
          );
          
          if (!bribePackage) throw new Error('Bribe package not found');
  
          const { customerInfo } = await purchaseService.purchasePackage(bribePackage);
          
          if (customerInfo.entitlements.active['com.deadletters.bribe_clerk']?.isActive) {
               const currentStory = normalizeStoryCampaignShape(progress.storyCampaign);
               
               // Determine if we should also advance the case immediately
               let updates = {
                   storyCampaign: {
                       ...currentStory,
                       nextStoryUnlockAt: null 
                   }
               };

               if (currentStory.activeCaseNumber) {
                   const nextCase = SEASON_ONE_CASES.find(c => c.caseNumber === currentStory.activeCaseNumber);
                   if (nextCase) {
                       setActiveCaseInternal(nextCase.id);
                       updates.currentCaseId = nextCase.id;
                   }
               }
               
               updateProgress(updates);
               notificationHaptic(Haptics.NotificationFeedbackType.Success);
               return true;
          }
          return false;
      } catch (e) {
          if (!e.userCancelled) {
            console.warn('Bribe purchase failed', e);
          }
          return false;
      }
  }, [progress.storyCampaign, updateProgress, setActiveCaseInternal]);

  const purchaseFullUnlock = useCallback(async () => {
       try {
          const offerings = await purchaseService.getOfferings();
          const fullPackage = offerings?.current?.availablePackages?.find(
              p => p.product.identifier === 'com.deadletters.full_unlock'
          );
          
          if (!fullPackage) throw new Error('Full unlock package not found');
  
          const { customerInfo } = await purchaseService.purchasePackage(fullPackage);
          
          if (customerInfo.entitlements.active['com.deadletters.full_unlock']?.isActive) {
               updateProgress({
                   premiumUnlocked: true,
                   storyCampaign: {
                       ...normalizeStoryCampaignShape(progress.storyCampaign),
                       fullUnlock: true,
                       nextStoryUnlockAt: null
                   }
               });
               notificationHaptic(Haptics.NotificationFeedbackType.Success);
               return true;
          }
          return false;
      } catch (e) {
          if (!e.userCancelled) {
            console.warn('Full unlock purchase failed', e);
          }
          return false;
      }
  }, [progress.storyCampaign, updateProgress]);

  const unlockNextCaseIfReady = useCallback(() => {
      if (!progress.nextUnlockAt) return;
      const nowIso = new Date().toISOString();
      if (nowIso >= progress.nextUnlockAt) {
          const currentUnlocked = progress.unlockedCaseIds || [];
          const seasonCount = SEASON_ONE_CASES.length; 
          if (currentUnlocked.length < seasonCount) {
               const nextId = currentUnlocked.length + 1;
               updateProgress({
                   unlockedCaseIds: Array.from(new Set([...currentUnlocked, nextId])),
                   nextUnlockAt: null
               });
          }
      }
  }, [progress, updateProgress]);

  const advanceToCase = useCallback((caseId) => {
      setActiveCaseInternal(caseId);
      if (mode === 'daily') {
          updateProgress({ currentCaseId: caseId });
      }
  }, [setActiveCaseInternal, mode, updateProgress]);

  const toggleWordSelection = useCallback((word) => {
    coreToggleWordSelection(word);
  }, [coreToggleWordSelection]);

  const submitGuess = useCallback(() => {
      const result = coreSubmitGuess();
      if (!result) return;

      const { status: nextStatus, attemptsUsed, caseId } = result;

      // Analytics
      const pathKey = getCurrentPathKey(activeCase.caseNumber);
      if (nextStatus === STATUS.SOLVED) {
        analytics.logLevelComplete(caseId, mode, attemptsUsed, true, pathKey);
      } else if (nextStatus === STATUS.FAILED) {
        analytics.logLevelComplete(caseId, mode, attemptsUsed, false, pathKey);
      }

      if (nextStatus === STATUS.SOLVED) {
          notificationHaptic(Haptics.NotificationFeedbackType.Success);
          audioRef.current?.playVictory?.();
      } else if (nextStatus === STATUS.FAILED) {
          notificationHaptic(Haptics.NotificationFeedbackType.Error);
          audioRef.current?.playFailure?.();
      } else {
          impactHaptic(Haptics.ImpactFeedbackStyle.Medium);
          audioRef.current?.playSubmit?.();
      }
      
      if (nextStatus === STATUS.SOLVED || nextStatus === STATUS.FAILED) {
          const nowIso = new Date().toISOString();
          
          // 1. Handle Story Mode Consequences
          const currentStory = normalizeStoryCampaignShape(progress.storyCampaign);
          const isStoryCase = activeCase.caseNumber === currentStory.activeCaseNumber;

          if (mode === 'story' || (isStoryCase && nextStatus === STATUS.SOLVED)) {
              const completedCaseNumbers = Array.from(
                  new Set([...(currentStory.completedCaseNumbers || []), activeCase.caseNumber])
              );
              
              const isFinalSubchapter = currentStory.subchapter >= 3; 
              
              let updatedStory = {
                  ...currentStory,
                  completedCaseNumbers,
                  startedAt: currentStory.startedAt || nowIso,
              };

              if (isFinalSubchapter) {
                  updatedStory = {
                      ...updatedStory,
                      awaitingDecision: true,
                      pendingDecisionCase: activeCase.caseNumber,
                      lastDecision: null,
                  };
              } else {
                  const nextSubchapter = currentStory.subchapter + 1;
                  const nextCaseNumber = formatCaseNumber(currentStory.chapter, nextSubchapter);
                  updatedStory = {
                      ...updatedStory,
                      subchapter: nextSubchapter,
                      activeCaseNumber: nextCaseNumber,
                      awaitingDecision: false,
                      pendingDecisionCase: null,
                  };
              }
              
              updateProgress({
                  storyCampaign: updatedStory,
                  nextUnlockAt: updatedStory.nextStoryUnlockAt
              });

          } else {
              // 2. Handle Daily/Archive Mode Consequences
              const distributionKey = nextStatus === STATUS.SOLVED 
                  ? Math.max(1, Math.min(activeCase.attempts || 4, attemptsUsed)) 
                  : 'fail';
              
              const unlockedCaseIds = Array.from(new Set([...progress.unlockedCaseIds, caseId]));
              
              const newStats = {
                  streak: nextStatus === STATUS.SOLVED ? progress.streak + 1 : 0,
                  bestStreak: nextStatus === STATUS.SOLVED 
                      ? Math.max(progress.bestStreak, progress.streak + 1) 
                      : progress.bestStreak,
                  solvedCaseIds: nextStatus === STATUS.SOLVED
                      ? Array.from(new Set([...progress.solvedCaseIds, caseId]))
                      : progress.solvedCaseIds,
                  failedCaseIds: nextStatus === STATUS.FAILED
                      ? Array.from(new Set([...progress.failedCaseIds, caseId]))
                      : progress.failedCaseIds,
                  attemptsDistribution: {
                      ...progress.attemptsDistribution,
                      [distributionKey]: (progress.attemptsDistribution[distributionKey] || 0) + 1
                  },
                  lastPlayedDate: nowIso,
                  unlockedCaseIds,
              };
              
              updateProgress(newStats);
          }
      }
  }, [coreSubmitGuess, mode, progress, activeCase, updateProgress, getCurrentPathKey]);

  // ========== ENDINGS & ACHIEVEMENTS SYSTEM ==========

  /**
   * Unlock an ending when player reaches it
   */
  const unlockEnding = useCallback((endingId, playthroughDetails = {}) => {
    const nowIso = new Date().toISOString();
    const currentEndings = progress.endings || { unlockedEndingIds: [], endingDetails: {}, totalEndingsReached: 0 };
    
    // Check if already unlocked
    const alreadyUnlocked = currentEndings.unlockedEndingIds.includes(endingId);
    
    const updatedEndings = {
      ...currentEndings,
      unlockedEndingIds: alreadyUnlocked 
        ? currentEndings.unlockedEndingIds 
        : [...currentEndings.unlockedEndingIds, endingId],
      endingDetails: {
        ...currentEndings.endingDetails,
        [endingId]: {
          unlockedAt: currentEndings.endingDetails[endingId]?.unlockedAt || nowIso,
          lastReachedAt: nowIso,
          reachCount: (currentEndings.endingDetails[endingId]?.reachCount || 0) + 1,
          ...playthroughDetails,
        },
      },
      totalEndingsReached: currentEndings.totalEndingsReached + 1,
      firstEndingId: currentEndings.firstEndingId || endingId,
      firstEndingAt: currentEndings.firstEndingAt || nowIso,
    };

    // Also unlock chapter select after first ending
    const updatedCheckpoints = {
      ...(progress.chapterCheckpoints || {}),
      unlocked: true,
    };

    updateProgress({ 
      endings: updatedEndings,
      chapterCheckpoints: updatedCheckpoints,
    });

    // Log analytics
    analytics.logEvent?.('ending_unlocked', { endingId, isNew: !alreadyUnlocked });
    
    return !alreadyUnlocked; // Return true if this was a new unlock
  }, [progress.endings, progress.chapterCheckpoints, updateProgress]);

  /**
   * Unlock an achievement
   */
  const unlockAchievement = useCallback((achievementId, context = {}) => {
    const nowIso = new Date().toISOString();
    const currentAchievements = progress.achievements || { unlockedAchievementIds: [], achievementDetails: {}, totalPoints: 0 };

    // Check if already unlocked
    if (currentAchievements.unlockedAchievementIds.includes(achievementId)) {
      return false; // Already unlocked
    }

    // Use module-scoped ACHIEVEMENTS (imported at top of file for performance)
    const achievement = ACHIEVEMENTS[achievementId];
    const points = achievement?.points || 0;

    const updatedAchievements = {
      ...currentAchievements,
      unlockedAchievementIds: [...currentAchievements.unlockedAchievementIds, achievementId],
      achievementDetails: {
        ...currentAchievements.achievementDetails,
        [achievementId]: {
          unlockedAt: nowIso,
          ...context,
        },
      },
      totalPoints: currentAchievements.totalPoints + points,
      lastCheckedAt: nowIso,
    };

    updateProgress({ achievements: updatedAchievements });

    // Haptic feedback for achievement unlock (throttled)
    notificationHaptic(Haptics.NotificationFeedbackType.Success);

    // Log analytics
    analytics.logEvent?.('achievement_unlocked', { achievementId, points });

    return true;
  }, [progress.achievements, updateProgress]);

  /**
   * Check and unlock achievements based on current state
   */
  const checkAchievements = useCallback(() => {
    // Use module-scoped ACHIEVEMENTS (imported at top of file for performance)
    const currentAchievements = progress.achievements?.unlockedAchievementIds || [];
    const newUnlocks = [];

    // Check prologue achievement
    if (progress.seenPrologue && !currentAchievements.includes('THE_BEGINNING')) {
      if (unlockAchievement('THE_BEGINNING')) newUnlocks.push('THE_BEGINNING');
    }

    // Check streak achievements
    if (progress.streak >= 5 && !currentAchievements.includes('STREAK_FIVE')) {
      if (unlockAchievement('STREAK_FIVE')) newUnlocks.push('STREAK_FIVE');
    }
    if (progress.streak >= 10 && !currentAchievements.includes('STREAK_TEN')) {
      if (unlockAchievement('STREAK_TEN')) newUnlocks.push('STREAK_TEN');
    }

    // Check total solved achievements
    const totalSolved = progress.solvedCaseIds?.length || 0;
    if (totalSolved >= 10 && !currentAchievements.includes('CASE_CRACKER')) {
      if (unlockAchievement('CASE_CRACKER')) newUnlocks.push('CASE_CRACKER');
    }
    if (totalSolved >= 50 && !currentAchievements.includes('VETERAN_INVESTIGATOR')) {
      if (unlockAchievement('VETERAN_INVESTIGATOR')) newUnlocks.push('VETERAN_INVESTIGATOR');
    }

    // Check perfect solve (1 attempt)
    const perfectSolves = progress.attemptsDistribution?.[1] || 0;
    if (perfectSolves > 0 && !currentAchievements.includes('PERFECT_DETECTIVE')) {
      if (unlockAchievement('PERFECT_DETECTIVE')) newUnlocks.push('PERFECT_DETECTIVE');
    }

    // Check ending achievements
    const unlockedEndings = progress.endings?.unlockedEndingIds || [];
    
    // First ending
    if (unlockedEndings.length >= 1 && !currentAchievements.includes('FIRST_ENDING')) {
      if (unlockAchievement('FIRST_ENDING')) newUnlocks.push('FIRST_ENDING');
    }
    
    // Halfway
    if (unlockedEndings.length >= 8 && !currentAchievements.includes('HALFWAY_THERE')) {
      if (unlockAchievement('HALFWAY_THERE')) newUnlocks.push('HALFWAY_THERE');
    }
    
    // Completionist
    if (unlockedEndings.length >= 16 && !currentAchievements.includes('COMPLETIONIST')) {
      if (unlockAchievement('COMPLETIONIST')) newUnlocks.push('COMPLETIONIST');
    }

    // Time-based hidden achievements
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4 && !currentAchievements.includes('NIGHT_OWL')) {
      if (unlockAchievement('NIGHT_OWL')) newUnlocks.push('NIGHT_OWL');
    }
    if (hour >= 5 && hour < 7 && !currentAchievements.includes('EARLY_BIRD')) {
      if (unlockAchievement('EARLY_BIRD')) newUnlocks.push('EARLY_BIRD');
    }

    return newUnlocks;
  }, [progress, unlockAchievement]);

  /**
   * Save a chapter checkpoint for replay
   */
  const saveChapterCheckpoint = useCallback((chapter, subchapter, pathKey) => {
    const nowIso = new Date().toISOString();
    const currentCheckpoints = progress.chapterCheckpoints || { checkpoints: [], unlocked: false };
    
    // Create checkpoint snapshot
    const checkpoint = {
      id: `${chapter}-${subchapter}-${pathKey}-${Date.now()}`,
      chapter,
      subchapter,
      pathKey,
      savedAt: nowIso,
      storyCampaignSnapshot: { ...progress.storyCampaign },
    };

    // Keep only the last checkpoint per chapter-path combination
    const existingIndex = currentCheckpoints.checkpoints.findIndex(
      cp => cp.chapter === chapter && cp.pathKey === pathKey
    );

    let updatedCheckpoints;
    if (existingIndex >= 0) {
      updatedCheckpoints = [...currentCheckpoints.checkpoints];
      updatedCheckpoints[existingIndex] = checkpoint;
    } else {
      updatedCheckpoints = [...currentCheckpoints.checkpoints, checkpoint];
    }

    updateProgress({
      chapterCheckpoints: {
        ...currentCheckpoints,
        checkpoints: updatedCheckpoints,
      },
    });
  }, [progress.chapterCheckpoints, progress.storyCampaign, updateProgress]);

  /**
   * Start replay from a specific chapter checkpoint
   */
  const startFromChapter = useCallback((checkpoint) => {
    if (!checkpoint?.storyCampaignSnapshot) return false;

    const nowIso = new Date().toISOString();
    
    // Restore story campaign from checkpoint
    const restoredCampaign = {
      ...checkpoint.storyCampaignSnapshot,
      // Mark this as a replay branch
      isReplayBranch: true,
      replayStartedAt: nowIso,
      replayFromChapter: checkpoint.chapter,
    };

    updateProgress({
      storyCampaign: restoredCampaign,
      chapterCheckpoints: {
        ...progress.chapterCheckpoints,
        activeReplayBranch: checkpoint.id,
      },
    });

    return true;
  }, [progress.chapterCheckpoints, updateProgress]);

  /**
   * Update gameplay stats (for time-based achievements)
   */
  const updateGameplayStats = useCallback((updates) => {
    const currentStats = progress.gameplayStats || {};
    updateProgress({
      gameplayStats: {
        ...currentStats,
        ...updates,
      },
    });
  }, [progress.gameplayStats, updateProgress]);

  const stateValue = useMemo(() => ({
    ...gameState,
    progress,
    hydrationComplete,
    activeCase,
    mode,
    cases: SEASON_ONE_CASES,
    // Story generation state
    storyGeneration: {
      status: generationStatus,
      progress: generationProgress,
      error: generationError,
      isConfigured: isLLMConfigured,
      isGenerating,
      generationType,
      isPreloading,
      awaitingGeneration,
    },
  }), [gameState, progress, hydrationComplete, activeCase, mode, generationStatus, generationProgress, generationError, isLLMConfigured, isGenerating, generationType, isPreloading, awaitingGeneration]);

  const dispatchValue = useMemo(() => ({
    toggleWordSelection,
    submitGuess,
    resetBoardForCase,
    advanceToCase,
    unlockNextCaseIfReady,
    updateSettings,
    markPrologueSeen,
    setPremiumUnlocked,
    clearProgress,
    markCaseBriefingSeen,
    enterStoryCampaign,
    continueStoryCampaign,
    openStoryCase,
    exitStoryCampaign,
    ensureDailyStoryCase,
    selectStoryDecision: storySelectDecision,
    setAudioController,
    purchaseBribe,
    purchaseFullUnlock,
    // Story generation actions
    configureLLM,
    ensureStoryContent,
    generateForCase,
    generateChapter,
    cancelGeneration,
    clearGenerationError,
    // Endings & Achievements
    unlockEnding,
    unlockAchievement,
    checkAchievements,
    saveChapterCheckpoint,
    startFromChapter,
    updateGameplayStats,
  }), [
    toggleWordSelection,
    submitGuess,
    resetBoardForCase,
    advanceToCase,
    unlockNextCaseIfReady,
    updateSettings,
    markPrologueSeen,
    setPremiumUnlocked,
    clearProgress,
    markCaseBriefingSeen,
    enterStoryCampaign,
    continueStoryCampaign,
    openStoryCase,
    exitStoryCampaign,
    ensureDailyStoryCase,
    storySelectDecision,
    setAudioController,
    purchaseBribe,
    purchaseFullUnlock,
    configureLLM,
    ensureStoryContent,
    generateForCase,
    generateChapter,
    cancelGeneration,
    clearGenerationError,
    unlockEnding,
    unlockAchievement,
    checkAchievements,
    saveChapterCheckpoint,
    startFromChapter,
    updateGameplayStats,
  ]);

  return (
    <GameDispatchContext.Provider value={dispatchValue}>
      <GameStateContext.Provider value={stateValue}>
        {children}
      </GameStateContext.Provider>
    </GameDispatchContext.Provider>
  );
}

export function useGame() {
  const state = useContext(GameStateContext);
  const dispatch = useContext(GameDispatchContext);
  
  if (!state || !dispatch) {
    throw new Error('useGame must be used within a GameProvider');
  }
  
  return useMemo(() => ({ ...state, ...dispatch }), [state, dispatch]);
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
}

export function useGameDispatch() {
  const context = useContext(GameDispatchContext);
  if (!context) {
    throw new Error('useGameDispatch must be used within a GameProvider');
  }
  return context;
}
