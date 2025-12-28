import React, { createContext, useContext, useEffect, useCallback, useState, useMemo } from 'react';
import { SEASON_ONE_CASES } from '../data/cases';
import { STATUS, getCaseByNumber, formatCaseNumber, normalizeStoryCampaignShape } from '../utils/gameLogic';
import { resolveStoryPathKey, ROOT_PATH_KEY, isDynamicChapter } from '../data/storyContent';
// Removed: internal usePersistence hook call
import { useGameLogic } from '../hooks/useGameLogic';
import { notificationHaptic, impactHaptic, Haptics } from '../utils/haptics';
import { analytics } from '../services/AnalyticsService';
import { createTraceId, llmTrace } from '../utils/llmTrace';
import { purchaseService } from '../services/PurchaseService';
import { ACHIEVEMENTS } from '../data/achievementsData';
import { useAudio } from './AudioContext';
import { useStory } from './StoryContext';

const GameStateContext = createContext(null);
const GameDispatchContext = createContext(null);

export { STATUS };
export const GAME_STATUS = STATUS;

// Updated: Accepts persistence props injected from parent
export function GameProvider({
  children,
  progress,
  hydrationComplete,
  updateProgress,
  updateSettings,
  markPrologueSeen,
  setPremiumUnlocked,
  markCaseBriefingSeen,
  clearProgress
}) {
  const audio = useAudio();
  const story = useStory();

  useEffect(() => {
    analytics.init();
  }, []);

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

  const [mode, setMode] = useState('daily');

  // Initialize game state when persistence is ready
  useEffect(() => {
    if (hydrationComplete && !gameState.hydrationComplete) {
      let initialCaseId = progress.currentCaseId;
      initializeGame(progress, initialCaseId);
    }
  }, [hydrationComplete, gameState.hydrationComplete, progress, initializeGame]);

  const activateStoryCase = useCallback(
    async ({ skipLock = false, mode: targetMode = 'daily' } = {}) => {
      // Story Mode Logic
      if (targetMode === 'story') {
          const traceId = createTraceId('activateStoryCase');
          const result = story.activateStoryCase({ skipLock });
          llmTrace('GameContext', traceId, 'activateStoryCase.activateStoryCaseResult', {
            ok: !!result?.ok,
            reason: result?.reason,
            skipLock,
            returnedCaseNumber: result?.caseNumber,
            awaitingDecision: !!story.storyCampaign?.awaitingDecision,
            pendingDecisionCase: story.storyCampaign?.pendingDecisionCase,
            storyChapter: story.storyCampaign?.chapter,
            storySubchapter: story.storyCampaign?.subchapter,
            activeCaseNumber: story.storyCampaign?.activeCaseNumber,
          }, result?.ok ? 'debug' : 'warn');
          if (!result.ok) return result;

          const caseNumber = result.caseNumber;
          const pathKey = story.getCurrentPathKey(caseNumber);
          llmTrace('GameContext', traceId, 'activateStoryCase.resolvedTarget', { caseNumber, pathKey }, 'debug');

          // Check if we need to generate content for this case
          const hasFirstDecision = (story.storyCampaign?.choiceHistory?.length || 0) > 0;
          if (isDynamicChapter(caseNumber) && hasFirstDecision) {
            console.log(`[GameContext] Ensuring story content for ${caseNumber} (path: ${pathKey})...`);
            const genStartTime = Date.now();
            const genResult = await story.ensureStoryContent(caseNumber, pathKey);
            const genDuration = Date.now() - genStartTime;
            llmTrace('GameContext', traceId, 'activateStoryCase.ensureStoryContent.result', {
              caseNumber,
              pathKey,
              ok: !!genResult?.ok,
              reason: genResult?.reason,
              generated: !!genResult?.generated,
              isFallback: !!genResult?.isFallback,
              isEmergencyFallback: !!genResult?.isEmergencyFallback,
              durationMs: genDuration,
            }, genResult?.ok ? 'debug' : 'warn');

            // CRITICAL: If generation fails, we MUST return error - never continue
            // Player will see error screen with retry button
            if (!genResult.ok) {
              console.error(`[GameContext] Cannot continue - generation failed: ${genResult.reason}`);
              console.error(`[GameContext] Error details: ${genResult.error || 'unknown error'}`);
              return {
                ok: false,
                reason: genResult.reason,
                error: genResult.error || 'Generation failed. Please try again.',
                caseNumber
              };
            } else {
              // Log success details
              if (genResult.isFallback || genResult.isEmergencyFallback) {
                console.warn(`[GameContext] Using FALLBACK content for ${caseNumber} (generated in ${genDuration}ms)`);
              } else if (genResult.generated) {
                console.log(`[GameContext] AI content ready for ${caseNumber} (generated in ${genDuration}ms)`);
              } else {
                console.log(`[GameContext] Content already cached for ${caseNumber}`);
              }
            }
          }

          const targetCase = getCaseByNumber(caseNumber);

          if (!targetCase) return { ok: false, reason: 'missing-case-data' };

          setActiveCaseInternal(targetCase.id);
          setMode('story');
          llmTrace('GameContext', traceId, 'activateStoryCase.navigationReady', {
            caseId: targetCase.id,
            caseNumber,
            pathKey,
          }, 'debug');

          // Analytics
          analytics.logLevelStart(targetCase.id, 'story', pathKey);

          // Trigger background generation via StoryContext
          // Now handles all subchapters robustly, not just subchapter 1
          const { chapter } = parseCaseNumber(caseNumber);
          if (chapter < 12 && hasFirstDecision) {
            story.handleBackgroundGeneration(caseNumber, pathKey);
          }

          // Early prefetch: When in Chapter 1 (pre-written), start generating Chapter 2 immediately
          // This ensures content is ready by the time player reaches the first decision in 001C
          if (chapter === 1 && story.generation?.isConfigured) {
            console.log(`[GameContext] Chapter 1 detected - prefetching Chapter 2 paths early`);
            llmTrace('GameContext', traceId, 'activateStoryCase.earlyPrefetch.chapter2', {
              caseNumber,
              note: 'Chapter 1 is pre-written, starting Chapter 2 generation now',
            }, 'info');
            // Prefetch both A and B paths for Chapter 2 with empty choice history
            // (player hasn't made any decisions yet)
            story.prefetchNextChapterBranchesAfterC(1, [], 'activateStoryCase:chapter1-early-prefetch');
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
    [story, setActiveCaseInternal, progress.currentCaseId]
  );

  // Helper to parse case number (duplicated from original context for local use)
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
      
      const pathKey = story.getCurrentPathKey(targetCase.caseNumber);
      analytics.logLevelStart(targetCase.id, 'story', pathKey);
      return true;
  }, [setActiveCaseInternal, story]);

  const exitStoryCampaign = useCallback(() => {
      setMode('daily');
      const dailyCaseId = progress.currentCaseId;
      setActiveCaseInternal(dailyCaseId);
  }, [progress.currentCaseId, setActiveCaseInternal]);

  const ensureDailyStoryCase = useCallback(() => {
      const currentStory = normalizeStoryCampaignShape(progress.storyCampaign);
      if (currentStory.activeCaseNumber && !currentStory.awaitingDecision) {
          const storyCase = SEASON_ONE_CASES.find(c => c.caseNumber === currentStory.activeCaseNumber);
          if (storyCase && storyCase.id !== progress.currentCaseId) {
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
      const pathKey = story.getCurrentPathKey(activeCase.caseNumber);
      if (nextStatus === STATUS.SOLVED) {
        analytics.logLevelComplete(caseId, mode, attemptsUsed, true, pathKey);
      } else if (nextStatus === STATUS.FAILED) {
        analytics.logLevelComplete(caseId, mode, attemptsUsed, false, pathKey);
      }

      if (nextStatus === STATUS.SOLVED) {
          notificationHaptic(Haptics.NotificationFeedbackType.Success);
          audio.playVictory();
      } else if (nextStatus === STATUS.FAILED) {
          notificationHaptic(Haptics.NotificationFeedbackType.Error);
          audio.playFailure();
      } else {
          impactHaptic(Haptics.ImpactFeedbackStyle.Medium);
          audio.playSubmit();
      }
      
      if (nextStatus === STATUS.SOLVED || nextStatus === STATUS.FAILED) {
          const nowIso = new Date().toISOString();
          
          const currentStory = normalizeStoryCampaignShape(progress.storyCampaign);
          const isStoryCase = activeCase.caseNumber === currentStory.activeCaseNumber;

          // Only update story state if we're solving the ACTUAL current story case.
          // This prevents state corruption when solving a non-story case while in story mode.
          if (isStoryCase && (mode === 'story' || nextStatus === STATUS.SOLVED)) {
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
                  // Store the decision options so we can include title/focus in choice history
                  // This enables the LLM to know WHAT the player chose, not just "A" or "B"
                  const pendingDecisionOptions = {};
                  if (activeCase.storyDecision?.optionA) {
                    pendingDecisionOptions.A = {
                      title: activeCase.storyDecision.optionA.title,
                      focus: activeCase.storyDecision.optionA.focus,
                    };
                  }
                  if (activeCase.storyDecision?.optionB) {
                    pendingDecisionOptions.B = {
                      title: activeCase.storyDecision.optionB.title,
                      focus: activeCase.storyDecision.optionB.focus,
                    };
                  }
                  // Fallback to options[] array if optionA/optionB not available
                  if (!pendingDecisionOptions.A && activeCase.storyDecision?.options?.[0]) {
                    const opt = activeCase.storyDecision.options[0];
                    pendingDecisionOptions[opt.key || 'A'] = { title: opt.title, focus: opt.focus };
                  }
                  if (!pendingDecisionOptions.B && activeCase.storyDecision?.options?.[1]) {
                    const opt = activeCase.storyDecision.options[1];
                    pendingDecisionOptions[opt.key || 'B'] = { title: opt.title, focus: opt.focus };
                  }

                  updatedStory = {
                      ...updatedStory,
                      awaitingDecision: true,
                      pendingDecisionCase: activeCase.caseNumber,
                      pendingDecisionOptions, // Store decision titles for LLM context
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
  }, [coreSubmitGuess, mode, progress, activeCase, updateProgress, story, audio]);

  // ========== ENDINGS & ACHIEVEMENTS SYSTEM ==========

  const unlockEnding = useCallback((endingId, playthroughDetails = {}) => {
    const nowIso = new Date().toISOString();
    const currentEndings = progress.endings || { unlockedEndingIds: [], endingDetails: {}, totalEndingsReached: 0 };
    
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

    const updatedCheckpoints = {
      ...(progress.chapterCheckpoints || {}),
      unlocked: true,
    };

    updateProgress({ 
      endings: updatedEndings,
      chapterCheckpoints: updatedCheckpoints,
    });

    analytics.logEvent?.('ending_unlocked', { endingId, isNew: !alreadyUnlocked });
    
    return !alreadyUnlocked;
  }, [progress.endings, progress.chapterCheckpoints, updateProgress]);

  const unlockAchievement = useCallback((achievementId, context = {}) => {
    const nowIso = new Date().toISOString();
    const currentAchievements = progress.achievements || { unlockedAchievementIds: [], achievementDetails: {}, totalPoints: 0 };

    if (currentAchievements.unlockedAchievementIds.includes(achievementId)) {
      return false;
    }

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
    notificationHaptic(Haptics.NotificationFeedbackType.Success);
    analytics.logEvent?.('achievement_unlocked', { achievementId, points });

    return true;
  }, [progress.achievements, updateProgress]);

  const checkAchievements = useCallback(() => {
    const currentAchievements = progress.achievements?.unlockedAchievementIds || [];
    const newUnlocks = [];

    if (progress.seenPrologue && !currentAchievements.includes('THE_BEGINNING')) {
      if (unlockAchievement('THE_BEGINNING')) newUnlocks.push('THE_BEGINNING');
    }

    if (progress.streak >= 5 && !currentAchievements.includes('STREAK_FIVE')) {
      if (unlockAchievement('STREAK_FIVE')) newUnlocks.push('STREAK_FIVE');
    }
    if (progress.streak >= 10 && !currentAchievements.includes('STREAK_TEN')) {
      if (unlockAchievement('STREAK_TEN')) newUnlocks.push('STREAK_TEN');
    }

    const totalSolved = progress.solvedCaseIds?.length || 0;
    if (totalSolved >= 10 && !currentAchievements.includes('CASE_CRACKER')) {
      if (unlockAchievement('CASE_CRACKER')) newUnlocks.push('CASE_CRACKER');
    }
    if (totalSolved >= 50 && !currentAchievements.includes('VETERAN_INVESTIGATOR')) {
      if (unlockAchievement('VETERAN_INVESTIGATOR')) newUnlocks.push('VETERAN_INVESTIGATOR');
    }

    const perfectSolves = progress.attemptsDistribution?.[1] || 0;
    if (perfectSolves > 0 && !currentAchievements.includes('PERFECT_DETECTIVE')) {
      if (unlockAchievement('PERFECT_DETECTIVE')) newUnlocks.push('PERFECT_DETECTIVE');
    }

    const unlockedEndings = progress.endings?.unlockedEndingIds || [];
    
    if (unlockedEndings.length >= 1 && !currentAchievements.includes('FIRST_ENDING')) {
      if (unlockAchievement('FIRST_ENDING')) newUnlocks.push('FIRST_ENDING');
    }
    
    if (unlockedEndings.length >= 8 && !currentAchievements.includes('HALFWAY_THERE')) {
      if (unlockAchievement('HALFWAY_THERE')) newUnlocks.push('HALFWAY_THERE');
    }
    
    if (unlockedEndings.length >= 16 && !currentAchievements.includes('COMPLETIONIST')) {
      if (unlockAchievement('COMPLETIONIST')) newUnlocks.push('COMPLETIONIST');
    }

    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4 && !currentAchievements.includes('NIGHT_OWL')) {
      if (unlockAchievement('NIGHT_OWL')) newUnlocks.push('NIGHT_OWL');
    }
    if (hour >= 5 && hour < 7 && !currentAchievements.includes('EARLY_BIRD')) {
      if (unlockAchievement('EARLY_BIRD')) newUnlocks.push('EARLY_BIRD');
    }

    return newUnlocks;
  }, [progress, unlockAchievement]);

  const saveChapterCheckpoint = useCallback((chapter, subchapter, pathKey) => {
    const nowIso = new Date().toISOString();
    const currentCheckpoints = progress.chapterCheckpoints || { checkpoints: [], unlocked: false };
    
    const checkpoint = {
      id: `${chapter}-${subchapter}-${pathKey}-${Date.now()}`,
      chapter,
      subchapter,
      pathKey,
      savedAt: nowIso,
      storyCampaignSnapshot: { ...progress.storyCampaign },
    };

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

  const startFromChapter = useCallback((checkpoint) => {
    if (!checkpoint?.storyCampaignSnapshot) return false;

    const nowIso = new Date().toISOString();
    
    const restoredCampaign = {
      ...checkpoint.storyCampaignSnapshot,
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
    storyGeneration: story.generation, // Mapping for backward compatibility if needed, or update consumers
  }), [gameState, progress, hydrationComplete, activeCase, mode, story.generation]);

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
    selectStoryDecision: story.selectStoryDecision,
    saveBranchingChoice: story.saveBranchingChoice, // TRUE INFINITE BRANCHING: Save player's interactive narrative path
    speculativePrefetchForFirstChoice: story.speculativePrefetchForFirstChoice, // TRUE INFINITE BRANCHING: Prefetch 3 paths after first choice
    // Audio is handled via AudioContext but exposed here if needed for backward compatibility or direct calls?
    // Ideally consumers use useAudio(), but GameContext was the facade.
    // We removed setAudioController from here.
    purchaseBribe,
    purchaseFullUnlock,
    // Story generation actions - delegated to StoryContext
    configureLLM: story.configureLLM,
    ensureStoryContent: story.ensureStoryContent,
    generateForCase: story.generateForCase,
    generateChapter: story.generateChapter,
    cancelGeneration: story.cancelGeneration,
    clearGenerationError: story.clearGenerationError,
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
    story,
    purchaseBribe,
    purchaseFullUnlock,
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
