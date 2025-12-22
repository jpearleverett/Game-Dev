import { useReducer, useCallback, useMemo, useEffect, useRef } from 'react';
import { dedupeWords, generateBoardGrid, STATUS, getCaseNumberById } from '../utils/gameLogic';
import { getBoardProfile } from '../utils/caseNumbers';
import { getStoryEntry, resolveStoryPathKey } from '../data/storyContent';
import { createBlankStoryCampaign } from '../storage/progressStorage';
import { gameReducer, initialState } from '../context/gameReducer';
import { mergeCaseWithStory } from '../utils/caseMerger';

export function useGameLogic(cases, progress, updateProgress) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Hydrate reducer when persistence is ready
  useEffect(() => {
      if (state.hydrationComplete) return; // Already hydrated
  }, []);

  // Memoize story campaign to prevent unnecessary re-calcs if only timestamp changed
  // We serialize specific fields that matter for the evidence board content
  const storyCampaign = progress.storyCampaign || createBlankStoryCampaign();
  const storyCampaignRef = useRef(storyCampaign);
  
  const stableStoryCampaign = useMemo(() => {
    const current = storyCampaign;
    const prev = storyCampaignRef.current;

    // Check meaningful changes for board generation
    // IMPORTANT: choiceHistory is critical for path key resolution in dynamic chapters
    if (
        current.chapter !== prev.chapter ||
        current.subchapter !== prev.subchapter ||
        current.activeCaseNumber !== prev.activeCaseNumber ||
        current.currentPathKey !== prev.currentPathKey ||
        (current.completedCaseNumbers || []).length !== (prev.completedCaseNumbers || []).length ||
        (current.choiceHistory || []).length !== (prev.choiceHistory || []).length
    ) {
        storyCampaignRef.current = current;
        return current;
    }
    return prev;
  }, [storyCampaign.chapter, storyCampaign.subchapter, storyCampaign.activeCaseNumber, storyCampaign.currentPathKey, (storyCampaign.completedCaseNumbers || []).length, (storyCampaign.choiceHistory || []).length]);

  // Derived Active Case
  const activeCase = useMemo(() => {
    const baseCase = cases.find((c) => c.id === state.activeCaseId) || cases[0] || null;
    if (!baseCase) return null;

    // Merge dynamic story data (outliers, narrative, themes)
    const mergedCase = mergeCaseWithStory(baseCase, stableStoryCampaign, getStoryEntry);

    // Resolve Board Grid
    const layout = state.boardLayouts[baseCase.id];
    const fallbackGrid = Array.isArray(mergedCase.board?.grid) ? mergedCase.board.grid : [];
    const resolvedGrid = Array.isArray(layout) && layout.length ? layout : fallbackGrid;

    return {
      ...mergedCase,
      board: {
        ...(mergedCase.board || {}),
        grid: resolvedGrid,
      },
    };
  }, [state.activeCaseId, cases, state.boardLayouts, stableStoryCampaign]);

  const assignBoardLayout = useCallback(
    (caseData, { force = false, skipDispatch = false } = {}) => {
      if (!caseData?.id) return null;
      const existing = state.boardLayouts[caseData.id];
      if (existing && !force) return existing;
      
      const grid = generateBoardGrid(caseData);
      if (!skipDispatch) {
        dispatch({
            type: 'SET_BOARD_LAYOUT',
            payload: { caseId: caseData.id, grid },
        });
      }
      return grid;
    },
    [state.boardLayouts]
  );

  const resetBoardForCase = useCallback((caseId) => {
    let targetCase = cases.find((c) => c.id === caseId) || cases[0];
    if (!targetCase) return;
    
    // Use the memoized stable campaign here as well
    targetCase = mergeCaseWithStory(targetCase, stableStoryCampaign, getStoryEntry);
    
    if (targetCase.id !== state.activeCaseId) {
        const grid = assignBoardLayout(targetCase, { force: true, skipDispatch: true });
        dispatch({
            type: 'ADVANCE_CASE',
            payload: {
                activeCaseId: targetCase.id,
                attemptsRemaining: targetCase.attempts,
                layout: { caseId: targetCase.id, grid }
            }
        });
    } else {
        assignBoardLayout(targetCase, { force: true });
        dispatch({
          type: 'RESET_BOARD',
          payload: { attemptsRemaining: targetCase.attempts },
        });
    }
  }, [cases, assignBoardLayout, state.activeCaseId, stableStoryCampaign]);

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
      let targetCase = cases.find(c => c.id === initialCaseId) || cases[0];
      
      // Merge story data to ensure initial grid is correct for branching paths
      const storyCampaign = initialProgress?.storyCampaign || createBlankStoryCampaign();
      targetCase = mergeCaseWithStory(targetCase, storyCampaign, getStoryEntry);

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
  
  const setActiveCaseInternal = useCallback((caseId) => {
      let targetCase = cases.find(c => c.id === caseId);
      if (!targetCase) return;
      
      // Merge story data
      targetCase = mergeCaseWithStory(targetCase, stableStoryCampaign, getStoryEntry);

      const grid = assignBoardLayout(targetCase, { skipDispatch: true });
      dispatch({
          type: 'ADVANCE_CASE',
          payload: {
              activeCaseId: targetCase.id,
              attemptsRemaining: targetCase.attempts,
              layout: { caseId: targetCase.id, grid }
          }
      });
  }, [cases, assignBoardLayout, stableStoryCampaign]);

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
