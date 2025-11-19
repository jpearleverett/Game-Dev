import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { SEASON_ONE_CASES, SEASON_ONE_CASE_COUNT } from '../data/cases';
import {
  createBlankProgress,
  createBlankStoryCampaign,
  loadStoredProgress,
  saveStoredProgress,
} from '../storage/progressStorage';
import {
  formatCaseNumber,
  getStoryEntry,
} from '../data/storyContent';
import { getBoardProfile } from '../utils/caseNumbers';
import {
  STATUS,
  resolveStoryPathKey,
  dedupeWords,
  getCaseByNumber,
  getCaseNumberById,
  normalizeStoryCampaignShape,
  generateBoardGrid,
  computeStoryUnlockAt,
} from '../utils/gameLogic';
import { gameReducer, initialState } from './gameReducer';

const GameContext = createContext(null);

export { STATUS };
export const GAME_STATUS = STATUS;

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const assignBoardLayout = useCallback(
    (caseData, { force = false } = {}) => {
      if (!caseData?.id) {
        return null;
      }
      const existing = state.boardLayouts[caseData.id];
      if (existing && !force) {
        return existing;
      }
      const grid = generateBoardGrid(caseData);
      dispatch({
        type: 'SET_BOARD_LAYOUT',
        payload: {
          caseId: caseData.id,
          grid,
        },
      });
      return grid;
    },
    [state.boardLayouts, dispatch],
  );

  const activateStoryCase = useCallback(
    ({ skipLock = false, mode = 'daily' } = {}) => {
      const story = normalizeStoryCampaignShape(state.progress.storyCampaign);
      const caseNumber = story.activeCaseNumber;
      if (!caseNumber) {
        return { ok: false, reason: 'missing-case' };
      }
      if (!skipLock) {
        if (story.awaitingDecision) {
          return { ok: false, reason: 'decision-required' };
        }
        if (story.nextStoryUnlockAt) {
          const nowIso = new Date().toISOString();
          if (nowIso < story.nextStoryUnlockAt) {
            return {
              ok: false,
              reason: 'locked',
              unlockAt: story.nextStoryUnlockAt,
            };
          }
        }
      }
      const targetCase = getCaseByNumber(caseNumber) || state.cases[0] || null;
      if (!targetCase) {
        return { ok: false, reason: 'missing-case-data' };
      }
      if (state.activeCaseId === targetCase.id && state.mode === mode) {
        return { ok: true, caseId: targetCase.id, alreadyActive: true };
      }
      assignBoardLayout(targetCase, { force: true });
      const progressPayload = {
        ...state.progress,
        currentCaseId: targetCase.id,
        storyCampaign: story,
      };
      dispatch({
        type: 'ADVANCE_CASE',
        payload: {
          progress: progressPayload,
          activeCaseId: targetCase.id,
          attemptsRemaining: targetCase.attempts,
        },
      });
      if (state.mode !== mode) {
        dispatch({ type: 'SET_MODE', payload: mode });
      }
      return { ok: true, caseId: targetCase.id };
    },
    [state.progress, state.cases, state.activeCaseId, state.mode, assignBoardLayout],
  );

  const ensureDailyStoryCase = useCallback(
    () => activateStoryCase({ mode: 'daily' }),
    [activateStoryCase],
  );

  const activeCase = useMemo(() => {
    const baseCase = state.cases.find((c) => c.id === state.activeCaseId) || state.cases[0] || null;
    if (!baseCase) {
      return null;
    }
    const layout = state.boardLayouts[baseCase.id];
    const fallbackGrid = Array.isArray(baseCase.board?.grid) ? baseCase.board.grid : [];
    const resolvedGrid = Array.isArray(layout) && layout.length ? layout : fallbackGrid;

    const caseNumber = baseCase.caseNumber || getCaseNumberById(baseCase.id);
    const boardProfile = getBoardProfile(caseNumber);
    const storyCampaign = state.progress.storyCampaign || createBlankStoryCampaign();
    let storyMeta = null;
    if (caseNumber) {
      const pathKey = resolveStoryPathKey(caseNumber, storyCampaign);
      storyMeta = getStoryEntry(caseNumber, pathKey);
    }

    const mergedCase = {
      ...baseCase,
      board: {
        ...(baseCase.board || {}),
        grid: resolvedGrid,
        profile: boardProfile,
      },
    };

    if (storyMeta) {
      mergedCase.storyMeta = storyMeta;
      mergedCase.storyDecision = storyMeta.decision || null;
      mergedCase.narrative = storyMeta.narrative ? [storyMeta.narrative] : mergedCase.narrative;
      mergedCase.bridgeText = storyMeta.bridgeText ? [storyMeta.bridgeText] : mergedCase.bridgeText;
    }

    return mergedCase;
  }, [state.activeCaseId, state.cases, state.boardLayouts, state.mode, state.progress.storyCampaign]);

  useEffect(() => {
    const hydrate = async () => {
      let stored = await loadStoredProgress();
      const blank = createBlankProgress();
      if (!stored) {
        stored = blank;
      } else {
        stored.settings = {
          ...blank.settings,
          ...(stored.settings || {}),
        };
        if (typeof stored.seenPrologue !== 'boolean') {
          stored.seenPrologue = false;
        }
        if (typeof stored.premiumUnlocked !== 'boolean') {
          stored.premiumUnlocked = false;
        }
        const defaultStory = createBlankStoryCampaign();
        if (!stored.storyCampaign) {
          stored.storyCampaign = defaultStory;
        } else {
          stored.storyCampaign = normalizeStoryCampaignShape(stored.storyCampaign);
        }
      }

      if (!stored.seenBriefings || typeof stored.seenBriefings !== 'object') {
        stored.seenBriefings = {};
      }

      if (!stored.storyCampaign) {
        stored.storyCampaign = createBlankStoryCampaign();
      } else {
        stored.storyCampaign = normalizeStoryCampaignShape(stored.storyCampaign);
      }

      const storyCase =
        getCaseByNumber(stored.storyCampaign.activeCaseNumber) || null;
      const fallbackCase =
        storyCase ||
        SEASON_ONE_CASES.find((c) => c.id === stored.currentCaseId) ||
        SEASON_ONE_CASES[0];
      const nextCase = fallbackCase;
      if (nextCase?.id) {
        stored.currentCaseId = nextCase.id;
        if (!stored.unlockedCaseIds.includes(nextCase.id)) {
          stored.unlockedCaseIds = Array.from(
            new Set([...stored.unlockedCaseIds, nextCase.id]),
          );
        }
      }

      // Unlock additional cases if timer expired
      if (stored.nextUnlockAt) {
        const nowIso = new Date().toISOString();
        if (nowIso >= stored.nextUnlockAt) {
          const unlockedCount = stored.unlockedCaseIds.length;
          if (unlockedCount < SEASON_ONE_CASE_COUNT) {
            stored.unlockedCaseIds = Array.from(
              new Set([
                ...stored.unlockedCaseIds,
                unlockedCount + 1,
              ]),
            );
          }
          stored.nextUnlockAt = null;
        }
      }

      const initialGrid = generateBoardGrid(nextCase);
      dispatch({
        type: 'SET_BOARD_LAYOUT',
        payload: {
          caseId: nextCase.id,
          grid: initialGrid,
        },
      });

      dispatch({
        type: 'HYDRATE',
        payload: {
          progress: stored,
          activeCaseId: nextCase.id,
          attemptsRemaining: nextCase.attempts,
          selectedWords: [],
          confirmedOutliers: [],
          lockedMainWords: [],
          submissionHistory: [],
          status: STATUS.IN_PROGRESS,
        },
      });
    };

    hydrate();
  }, []);

  useEffect(() => {
    if (!state.hydrationComplete) return;
    saveStoredProgress(state.progress);
  }, [state.progress, state.hydrationComplete]);

  const toggleWordSelection = (word) => {
    if (state.status !== STATUS.IN_PROGRESS) return;
    dispatch({ type: 'SELECT_WORD', payload: word });
  };

  useEffect(() => {
    if (!state.hydrationComplete || state.mode !== 'daily') return;
    const desiredCaseId = state.progress.currentCaseId;
    if (desiredCaseId && desiredCaseId !== state.activeCaseId) {
      const targetCase = state.cases.find((c) => c.id === desiredCaseId) || state.cases[0];
      if (targetCase) {
        const layout = generateBoardGrid(targetCase);
        dispatch({
          type: 'SET_BOARD_LAYOUT',
          payload: {
            caseId: targetCase.id,
            grid: layout,
          },
        });
      }
      dispatch({
        type: 'ADVANCE_CASE',
        payload: {
          progress: state.progress,
          activeCaseId: targetCase.id,
          attemptsRemaining: targetCase.attempts,
        },
      });
    }
  }, [state.progress.currentCaseId, state.hydrationComplete, state.cases, state.activeCaseId, state.mode, dispatch]);

  const resetBoardForCase = (caseId) => {
    const targetCase = state.cases.find((c) => c.id === caseId) || state.cases[0] || null;
    if (!targetCase) {
      return;
    }
    assignBoardLayout(targetCase, { force: true });
    dispatch({
      type: 'RESET_BOARD',
      payload: {
        attemptsRemaining: targetCase.attempts,
      },
    });
  };

  const recordProgressUpdate = useCallback((nextProgress) => {
    dispatch({ type: 'UPDATE_PROGRESS', payload: nextProgress });
  }, []);

  const updateSettings = useCallback(
    (partialSettings) => {
      const merged = {
        ...state.progress,
        settings: {
          ...state.progress.settings,
          ...partialSettings,
        },
      };
      recordProgressUpdate(merged);
    },
    [state.progress, recordProgressUpdate],
  );

  const markPrologueSeen = useCallback(() => {
    if (state.progress.seenPrologue) return;
    recordProgressUpdate({ ...state.progress, seenPrologue: true });
  }, [state.progress, recordProgressUpdate]);

  const setPremiumUnlocked = useCallback(
    (value = true) => {
      if (state.progress.premiumUnlocked === value) return;
      recordProgressUpdate({ ...state.progress, premiumUnlocked: value });
    },
    [state.progress, recordProgressUpdate],
  );

  const markCaseBriefingSeen = useCallback(
    (caseId) => {
      if (!caseId) return;
      const existing = state.progress.seenBriefings || {};
      if (existing[caseId]) return;
      recordProgressUpdate({
        ...state.progress,
        seenBriefings: {
          ...existing,
          [caseId]: true,
        },
      });
    },
    [state.progress, recordProgressUpdate],
  );

  const submitGuess = () => {
    if (!state.selectedWords.length || state.status !== STATUS.IN_PROGRESS) {
      return;
    }
    const caseData = activeCase;
    const outliers = caseData.board.outlierWords;
    const newlyConfirmedOutliers = state.selectedWords.filter((word) => outliers.includes(word));
    const newlyLockedMains = state.selectedWords.filter((word) => !outliers.includes(word));

    const nextConfirmed = dedupeWords([...state.confirmedOutliers, ...newlyConfirmedOutliers]);
    const nextLocked = dedupeWords([...state.lockedMainWords, ...newlyLockedMains]);
    const nextAttemptsRemaining = Math.max(state.attemptsRemaining - 1, 0);
    const nextHistory = [
      ...state.submissionHistory,
      {
        guess: state.selectedWords,
        correctCount: newlyConfirmedOutliers.length,
        incorrectCount: newlyLockedMains.length,
        attemptsRemaining: nextAttemptsRemaining,
        timestamp: Date.now(),
      },
    ];

    let nextStatus = state.status;
    if (nextConfirmed.length === outliers.length) {
      nextStatus = STATUS.SOLVED;
    } else if (nextAttemptsRemaining === 0) {
      nextStatus = STATUS.FAILED;
    } else {
      nextStatus = STATUS.IN_PROGRESS;
    }

    dispatch({
      type: 'SUBMIT_GUESS',
      payload: {
        attemptsRemaining: nextAttemptsRemaining,
        confirmedOutliers: nextConfirmed,
        lockedMainWords: nextLocked,
        submissionHistory: nextHistory,
        status: nextStatus,
      },
    });

    if (nextStatus === STATUS.SOLVED || nextStatus === STATUS.FAILED) {
      const attemptsUsed = caseData.attempts - nextAttemptsRemaining;
      const now = new Date();
      const nowIso = now.toISOString();

      const baseStory = normalizeStoryCampaignShape(state.progress.storyCampaign);
      const caseNumber = caseData.caseNumber || baseStory.activeCaseNumber;
      const completedCaseNumbers = Array.from(
        new Set([...(baseStory.completedCaseNumbers || []), caseNumber]),
      );
      const isFinalSubchapter = baseStory.subchapter >= 3;
      let updatedStory = {
        ...baseStory,
        completedCaseNumbers,
        startedAt: baseStory.startedAt || nowIso,
      };

      if (isFinalSubchapter) {
        updatedStory = {
          ...updatedStory,
          awaitingDecision: true,
          pendingDecisionCase: caseNumber,
          lastDecision: null,
        };
      } else {
        const nextSubchapter = baseStory.subchapter + 1;
        const nextCaseNumber = formatCaseNumber(baseStory.chapter, nextSubchapter);
        updatedStory = {
          ...updatedStory,
          subchapter: nextSubchapter,
          activeCaseNumber: nextCaseNumber,
          awaitingDecision: false,
          pendingDecisionCase: null,
        };
      }

      if (state.mode === 'story') {
        const nextProgress = {
          ...state.progress,
          storyCampaign: updatedStory,
          nextUnlockAt: updatedStory.nextStoryUnlockAt,
        };
        recordProgressUpdate(nextProgress);
      } else {
        const distributionKey =
          nextStatus === STATUS.SOLVED
            ? Math.max(1, Math.min(caseData.attempts, attemptsUsed))
            : 'fail';
        const unlockedCaseIds = Array.from(
          new Set([...state.progress.unlockedCaseIds, caseData.id]),
        );

        const updatedProgress = {
          ...state.progress,
          storyCampaign: updatedStory,
          unlockedCaseIds,
          streak: nextStatus === STATUS.SOLVED ? state.progress.streak + 1 : 0,
          bestStreak:
            nextStatus === STATUS.SOLVED
              ? Math.max(state.progress.bestStreak, state.progress.streak + 1)
              : state.progress.bestStreak,
          solvedCaseIds:
            nextStatus === STATUS.SOLVED
              ? Array.from(new Set([...state.progress.solvedCaseIds, caseData.id]))
              : state.progress.solvedCaseIds,
          failedCaseIds:
            nextStatus === STATUS.FAILED
              ? Array.from(new Set([...state.progress.failedCaseIds, caseData.id]))
              : state.progress.failedCaseIds,
          attemptsDistribution: {
            ...state.progress.attemptsDistribution,
            [distributionKey]: (state.progress.attemptsDistribution[distributionKey] || 0) + 1,
          },
          lastPlayedDate: nowIso,
        };
        recordProgressUpdate(updatedProgress);
      }
    }
  };

  const advanceToCase = (caseId) => {
    const targetCase = state.cases.find((c) => c.id === caseId) || state.cases[0];
    assignBoardLayout(targetCase, { force: true });
    dispatch({
      type: 'ADVANCE_CASE',
      payload: {
        progress: state.progress,
        activeCaseId: targetCase.id,
        attemptsRemaining: targetCase.attempts,
      },
    });
  };

  const unlockNextCaseIfReady = useCallback(() => {
    if (!state.progress.nextUnlockAt) return;
    const nowIso = new Date().toISOString();
    if (nowIso >= state.progress.nextUnlockAt) {
      const unlockedCount = state.progress.unlockedCaseIds.length;
      if (unlockedCount < SEASON_ONE_CASE_COUNT) {
        const nextProgress = {
          ...state.progress,
          unlockedCaseIds: Array.from(
            new Set([...state.progress.unlockedCaseIds, unlockedCount + 1]),
          ),
          nextUnlockAt: null,
        };
        recordProgressUpdate(nextProgress);
      }
    }
  }, [state.progress, recordProgressUpdate]);

  const clearProgress = async () => {
    const blank = createBlankProgress();
    await saveStoredProgress(blank);
    dispatch({
      type: 'HYDRATE',
      payload: {
        progress: blank,
        activeCaseId: 1,
        attemptsRemaining: SEASON_ONE_CASES[0].attempts,
        selectedWords: [],
        confirmedOutliers: [],
        lockedMainWords: [],
        submissionHistory: [],
        status: STATUS.IN_PROGRESS,
      },
    });
  };

  const enterStoryCampaign = useCallback(
    ({ reset = false } = {}) => {
      if (reset) {
        const blankStory = createBlankStoryCampaign();
        const nextProgress = {
          ...state.progress,
          storyCampaign: blankStory,
        };
        recordProgressUpdate(nextProgress);
        return true;
      }
      return activateStoryCase({ mode: 'story' });
    },
    [state.progress, recordProgressUpdate, activateStoryCase],
  );

  const continueStoryCampaign = useCallback(() => {
    return activateStoryCase({ mode: 'story' });
  }, [activateStoryCase]);

  const openStoryCase = useCallback(
    (caseId) => {
      const targetCase = state.cases.find((c) => c.id === caseId);
      if (!targetCase) return false;

      assignBoardLayout(targetCase, { force: true });
      dispatch({
        type: 'ADVANCE_CASE',
        payload: {
          progress: state.progress,
          activeCaseId: targetCase.id,
          attemptsRemaining: targetCase.attempts,
        },
      });
      dispatch({ type: 'SET_MODE', payload: 'story' });
      return true;
    },
    [state.cases, state.progress, assignBoardLayout],
  );

  const exitStoryCampaign = useCallback(() => {
    dispatch({ type: 'SET_MODE', payload: 'daily' });
  }, []);

  const selectStoryDecision = useCallback(
    (optionKey) => {
      const story = normalizeStoryCampaignShape(state.progress.storyCampaign);
      if (!story.awaitingDecision) return;

      const decisionCase = story.pendingDecisionCase;
      const decisionTime = new Date().toISOString();

      const nextChapter = story.chapter + 1;
      const nextSubchapter = 1;
      const nextCaseNumber = formatCaseNumber(nextChapter, nextSubchapter);

      const updatedStory = {
        ...story,
        awaitingDecision: false,
        pendingDecisionCase: null,
        lastDecision: {
          caseNumber: decisionCase,
          selectedAt: decisionTime,
          optionKey: optionKey,
          nextChapter: nextChapter
        },
        choiceHistory: [
          ...story.choiceHistory,
          {
            caseNumber: decisionCase,
            optionKey: optionKey,
            timestamp: decisionTime
          }
        ],
        pathHistory: {
          ...story.pathHistory,
          [nextChapter]: optionKey
        },
        currentPathKey: optionKey,
        chapter: nextChapter,
        subchapter: nextSubchapter,
        activeCaseNumber: nextCaseNumber,
        nextStoryUnlockAt: computeStoryUnlockAt(24)
      };

      const nextProgress = {
        ...state.progress,
        storyCampaign: updatedStory,
        nextUnlockAt: updatedStory.nextStoryUnlockAt
      };

      recordProgressUpdate(nextProgress);
    },
    [state.progress, recordProgressUpdate],
  );

  const value = {
    ...state,
    activeCase,
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
    selectStoryDecision,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
