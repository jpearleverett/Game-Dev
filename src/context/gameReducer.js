import { SEASON_ONE_CASES } from '../data/cases';
import { createBlankProgress } from '../storage/progressStorage';
import { STATUS, dedupeWords } from '../utils/gameLogic';
import { isBranchingSubchapter, getBoardProfile } from '../utils/caseNumbers';

export const initialState = {
    hydrationComplete: false,
    cases: SEASON_ONE_CASES,
    progress: createBlankProgress(),
    activeCaseId: 1,
    attemptsRemaining: SEASON_ONE_CASES[0].attempts,
    selectedWords: [],
    confirmedOutliers: [],
    lockedMainWords: [],
    submissionHistory: [],
    status: STATUS.LOADING,
    mode: 'daily',
    lastUpdated: Date.now(),
    boardLayouts: {},
};

export function gameReducer(state, action) {
    switch (action.type) {
        case 'HYDRATE': {
            const {
                progress,
                activeCaseId,
                attemptsRemaining,
                selectedWords,
                confirmedOutliers,
                lockedMainWords,
                submissionHistory,
                status,
            } = action.payload;

            return {
                ...state,
                hydrationComplete: true,
                progress,
                activeCaseId,
                attemptsRemaining,
                selectedWords,
                confirmedOutliers,
                lockedMainWords,
                submissionHistory,
                status,
                mode: 'daily',
                lastUpdated: Date.now(),
            };
        }

        case 'SET_BOARD_LAYOUT': {
            const { caseId, grid } = action.payload || {};
            if (!caseId || !Array.isArray(grid)) {
                return state;
            }
            // Performance Optimization: Only keep the current board layout to prevent
            // state bloat and memory leaks after playing multiple puzzles.
            return {
                ...state,
                boardLayouts: {
                    [caseId]: grid,
                },
                lastUpdated: Date.now(),
            };
        }

        case 'SELECT_WORD': {
            const word = action.payload;
            if (state.confirmedOutliers.includes(word) || state.lockedMainWords.includes(word)) {
                return state;
            }

            const currentlySelected = state.selectedWords.includes(word);

            if (!currentlySelected) {
                const caseData = state.cases.find((c) => c.id === state.activeCaseId);
                const rawOutliers = caseData?.board?.outlierWords;
                const uniqueOutliers = Array.isArray(rawOutliers) ? dedupeWords(rawOutliers.filter(Boolean)) : [];

                // For C subchapters (third subchapter of any chapter),
                // the base case only has 4 outliers but the merged board has 8.
                // Use getBoardProfile to get the correct target outlier count.
                const isThirdSubchapter = caseData?.caseNumber &&
                                          isBranchingSubchapter(caseData.caseNumber);

                // Get the true number of outliers for this subchapter type
                let totalOutliers;
                if (isThirdSubchapter) {
                    const boardProfile = getBoardProfile(caseData.caseNumber);
                    totalOutliers = boardProfile?.outlierTarget || 8;
                } else {
                    totalOutliers = uniqueOutliers.length;
                }

                if (totalOutliers > 0) {
                    const remainingOutliers = Math.max(totalOutliers - state.confirmedOutliers.length, 0);
                    if (remainingOutliers === 0) {
                        return state;
                    }

                    let maxSelections;
                    if (isThirdSubchapter) {
                        // Start with 8, decrease by confirmed outliers
                        maxSelections = Math.min(8 - state.confirmedOutliers.length, remainingOutliers);
                    } else {
                        // Regular case: limit to remaining outliers
                        maxSelections = remainingOutliers;
                    }

                    if (state.selectedWords.length >= maxSelections) {
                        return state;
                    }
                }
            }

            const nextSelected = currentlySelected
                ? state.selectedWords.filter((w) => w !== word)
                : [...state.selectedWords, word];

            return {
                ...state,
                selectedWords: nextSelected,
                lastUpdated: Date.now(),
            };
        }

        case 'RESET_BOARD': {
            return {
                ...state,
                attemptsRemaining: action.payload.attemptsRemaining,
                selectedWords: [],
                confirmedOutliers: [],
                lockedMainWords: [],
                submissionHistory: [],
                status: STATUS.IN_PROGRESS,
                lastUpdated: Date.now(),
            };
        }

        case 'SUBMIT_GUESS': {
            const {
                attemptsRemaining,
                confirmedOutliers,
                lockedMainWords,
                submissionHistory,
                status,
            } = action.payload;
            return {
                ...state,
                attemptsRemaining,
                confirmedOutliers,
                lockedMainWords,
                submissionHistory,
                selectedWords: [],
                status,
                lastUpdated: Date.now(),
            };
        }

        case 'SET_STATUS': {
            return {
                ...state,
                status: action.payload,
                lastUpdated: Date.now(),
            };
        }

        case 'ADVANCE_CASE': {
            const { progress, activeCaseId, attemptsRemaining, layout } = action.payload;

            let nextLayouts = state.boardLayouts;
            if (layout && layout.caseId && Array.isArray(layout.grid)) {
                 nextLayouts = { [layout.caseId]: layout.grid };
            }

            return {
                ...state,
                progress: progress || state.progress, // progress is optional
                activeCaseId,
                attemptsRemaining,
                boardLayouts: nextLayouts,
                confirmedOutliers: [],
                lockedMainWords: [],
                selectedWords: [],
                submissionHistory: [],
                status: STATUS.IN_PROGRESS,
                lastUpdated: Date.now(),
            };
        }

        case 'SET_MODE': {
            return {
                ...state,
                mode: action.payload,
                lastUpdated: Date.now(),
            };
        }

        case 'UPDATE_PROGRESS': {
            return {
                ...state,
                progress: action.payload,
                lastUpdated: Date.now(),
            };
        }

        default:
            return state;
    }
}
