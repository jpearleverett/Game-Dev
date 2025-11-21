import { useReducer, useCallback, useMemo, useEffect } from 'react';
import { dedupeWords, generateBoardGrid, STATUS, getCaseNumberById } from '../utils/gameLogic';
import { getBoardProfile } from '../utils/caseNumbers';
import { getStoryEntry, resolveStoryPathKey } from '../data/storyContent';
import { createBlankStoryCampaign } from '../storage/progressStorage';
import { gameReducer, initialState } from '../context/gameReducer';

export function useGameLogic(cases, progress, updateProgress) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Hydrate reducer when persistence is ready
  useEffect(() => {
      if (state.hydrationComplete) return; // Already hydrated
      
      // We trust the persistence hook to provide the initial progress, 
      // but the reducer needs to know the 'activeCaseId' derived from it.
      // However, to keep this hook pure, we might just want to sync the active case 
      // when the progress changes IF we aren't already playing.
      
      // Actually, the original context did a big "HYDRATE" dispatch.
      // We can replicate that or simplify.
      // Let's trust the consumer to call 'initializeGame' or similar.
  }, []);

  // Derived Active Case
  const activeCase = useMemo(() => {
    const baseCase = cases.find((c) => c.id === state.activeCaseId) || cases[0] || null;
    if (!baseCase) return null;

    const layout = state.boardLayouts[baseCase.id];
    const fallbackGrid = Array.isArray(baseCase.board?.grid) ? baseCase.board.grid : [];
    const resolvedGrid = Array.isArray(layout) && layout.length ? layout : fallbackGrid;

    const caseNumber = baseCase.caseNumber || getCaseNumberById(baseCase.id);
    const boardProfile = getBoardProfile(caseNumber);
    
    // Story Context
    const storyCampaign = progress.storyCampaign || createBlankStoryCampaign();
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
      if (storyMeta.evidenceBoard) {
        mergedCase.evidenceBoard = storyMeta.evidenceBoard;
      }
    }

    return mergedCase;
  }, [state.activeCaseId, cases, state.boardLayouts, progress.storyCampaign]);

  const assignBoardLayout = useCallback(
    (caseData, { force = false } = {}) => {
      if (!caseData?.id) return null;
      const existing = state.boardLayouts[caseData.id];
      if (existing && !force) return existing;
      
      const grid = generateBoardGrid(caseData);
      dispatch({
        type: 'SET_BOARD_LAYOUT',
        payload: { caseId: caseData.id, grid },
      });
      return grid;
    },
    [state.boardLayouts]
  );

  const resetBoardForCase = useCallback((caseId) => {
    const targetCase = cases.find((c) => c.id === caseId) || cases[0];
    if (!targetCase) return;
    
    assignBoardLayout(targetCase, { force: true });
    dispatch({
      type: 'RESET_BOARD',
      payload: { attemptsRemaining: targetCase.attempts },
    });
    // Note: We might need to update activeCaseId in state if it's different
    if (targetCase.id !== state.activeCaseId) {
        dispatch({
            type: 'ADVANCE_CASE',
            payload: {
                activeCaseId: targetCase.id,
                attemptsRemaining: targetCase.attempts
            }
        });
    }
  }, [cases, assignBoardLayout, state.activeCaseId]);

  const toggleWordSelection = useCallback((word) => {
    if (state.status !== STATUS.IN_PROGRESS) return;
    dispatch({ type: 'SELECT_WORD', payload: word });
  }, [state.status]);

  const submitGuess = useCallback(() => {
    if (!state.selectedWords.length || state.status !== STATUS.IN_PROGRESS || !activeCase) {
      return;
    }

    const outliers = activeCase.board.outlierWords;
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

    return {
        status: nextStatus,
        attemptsUsed: activeCase.attempts - nextAttemptsRemaining,
        caseId: activeCase.id
    };
  }, [state.selectedWords, state.status, activeCase, state.attemptsRemaining, state.confirmedOutliers, state.lockedMainWords, state.submissionHistory]);

  // Initialize/Hydrate logic
  const initializeGame = useCallback((initialProgress, initialCaseId) => {
      const targetCase = cases.find(c => c.id === initialCaseId) || cases[0];
      const initialGrid = generateBoardGrid(targetCase);
      
      dispatch({
        type: 'SET_BOARD_LAYOUT',
        payload: {
          caseId: targetCase.id,
          grid: initialGrid,
        },
      });

      dispatch({
        type: 'HYDRATE',
        payload: {
          activeCaseId: targetCase.id,
          attemptsRemaining: targetCase.attempts,
          selectedWords: [],
          confirmedOutliers: [],
          lockedMainWords: [],
          submissionHistory: [],
          status: STATUS.IN_PROGRESS,
        },
      });
  }, [cases]);
  
  // Helper to just switch the active case in the reducer
  const setActiveCaseInternal = useCallback((caseId) => {
      const targetCase = cases.find(c => c.id === caseId);
      if (!targetCase) return;
      assignBoardLayout(targetCase);
      dispatch({
          type: 'ADVANCE_CASE',
          payload: {
              activeCaseId: targetCase.id,
              attemptsRemaining: targetCase.attempts
          }
      });
  }, [cases, assignBoardLayout]);

  return {
    gameState: state,
    activeCase,
    toggleWordSelection,
    submitGuess,
    resetBoardForCase,
    initializeGame,
    setActiveCaseInternal,
    gameDispatch: dispatch
  };
}
