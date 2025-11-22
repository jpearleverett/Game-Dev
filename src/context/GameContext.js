import React, { createContext, useContext, useEffect, useCallback, useState, useMemo } from 'react';
import { SEASON_ONE_CASES } from '../data/cases';
import { STATUS, getCaseByNumber, formatCaseNumber, normalizeStoryCampaignShape } from '../utils/gameLogic';
import { usePersistence } from '../hooks/usePersistence';
import { useGameLogic } from '../hooks/useGameLogic';
import { useStoryEngine } from '../hooks/useStoryEngine';
import * as Haptics from 'expo-haptics';
import { analytics } from '../services/AnalyticsService';

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
    selectDecision: storySelectDecision,
    activateStoryCase: storyActivateCase,
  } = useStoryEngine(progress, updateProgress);

  const [mode, setMode] = useState('daily');

  // Initialize game state when persistence is ready
  useEffect(() => {
    if (hydrationComplete && !gameState.hydrationComplete) {
      // Determine initial case ID
      let initialCaseId = progress.currentCaseId;
      
      // If story mode was active or we want to default to story logic, check here.
      // For now, we stick to the daily case unless we were in story mode? 
      // The original code defaulted to 'currentCaseId' which is the daily track.
      
      initializeGame(progress, initialCaseId);
    }
  }, [hydrationComplete, gameState.hydrationComplete, progress, initializeGame]);

  const activateStoryCase = useCallback(
    ({ skipLock = false, mode: targetMode = 'daily' } = {}) => {
      // Story Mode Logic
      if (targetMode === 'story') {
          const result = storyActivateCase({ skipLock });
          if (!result.ok) return result;
          
          const caseNumber = result.caseNumber;
          const targetCase = getCaseByNumber(caseNumber);
          
          if (!targetCase) return { ok: false, reason: 'missing-case-data' };
          
          setActiveCaseInternal(targetCase.id);
          setMode('story');
          analytics.logLevelStart(targetCase.id, 'story');
          return { ok: true, caseId: targetCase.id };
      } 
      
      // Daily Mode Logic
      // (Simplified for now, assumes normal daily flow)
      const targetCaseId = progress.currentCaseId;
      const targetCase = SEASON_ONE_CASES.find(c => c.id === targetCaseId) || SEASON_ONE_CASES[0];
      
      setActiveCaseInternal(targetCase.id);
      setMode('daily');
      analytics.logLevelStart(targetCase.id, 'daily');
      return { ok: true, caseId: targetCase.id };

    },
    [storyActivateCase, setActiveCaseInternal, progress.currentCaseId]
  );

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
      analytics.logLevelStart(targetCase.id, 'story');
      return true;
  }, [setActiveCaseInternal]);

  const exitStoryCampaign = useCallback(() => {
      setMode('daily');
      // Revert to daily case
      const dailyCaseId = progress.currentCaseId;
      setActiveCaseInternal(dailyCaseId);
  }, [progress.currentCaseId, setActiveCaseInternal]);

  const ensureDailyStoryCase = useCallback(() => {
      return activateStoryCase({ mode: 'daily' });
  }, [activateStoryCase]);

  const unlockNextCaseIfReady = useCallback(() => {
      if (!progress.nextUnlockAt) return;
      const nowIso = new Date().toISOString();
      if (nowIso >= progress.nextUnlockAt) {
          const currentUnlocked = progress.unlockedCaseIds || [];
          const seasonCount = SEASON_ONE_CASES.length; // Use length from data
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
      // We don't necessarily change mode here, usually used in Archives (daily mode)
  }, [setActiveCaseInternal]);

  const toggleWordSelection = useCallback((word) => {
    coreToggleWordSelection(word);
    // analytics.logWordSelected(word); // Optional: might be too noisy
  }, [coreToggleWordSelection]);

  // Wrapped Submit Logic handling consequences
  const submitGuess = useCallback(() => {
      const result = coreSubmitGuess();
      if (!result) return;

      const { status: nextStatus, attemptsUsed, caseId } = result;

      // Analytics
      if (nextStatus === STATUS.SOLVED) {
        analytics.logLevelComplete(caseId, mode, attemptsUsed, true);
      } else if (nextStatus === STATUS.FAILED) {
        analytics.logLevelComplete(caseId, mode, attemptsUsed, false);
      }

      if (nextStatus === STATUS.SOLVED) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          audioRef.current?.playVictory?.();
      } else if (nextStatus === STATUS.FAILED) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          audioRef.current?.playFailure?.();
      } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
              
              // Check if this was the last case of a subchapter
              const isFinalSubchapter = currentStory.subchapter >= 3; // Hardcoded rule from original
              
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
  }, [coreSubmitGuess, mode, progress, activeCase, updateProgress]);

  const stateValue = useMemo(() => ({
    ...gameState,
    progress,
    hydrationComplete,
    activeCase,
    mode,
    cases: SEASON_ONE_CASES,
  }), [gameState, progress, hydrationComplete, activeCase, mode]);

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
  
  // Merge for backward compatibility
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
