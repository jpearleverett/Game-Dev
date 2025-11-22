import { BRANCHING_OUTLIER_SETS } from '../data/branchingOutliers';
import { resolveStoryPathKey, ROOT_PATH_KEY } from '../data/storyContent';
import { getCaseNumberById } from './gameLogic'; // Ensure this is safe or copy it
import { getBoardProfile } from './caseNumbers';

/**
 * Merges the raw case data with story-specific overrides (branching outliers, narrative text).
 * 
 * @param {Object} baseCase The static case definition from cases.js
 * @param {Object} storyCampaign The current story progress object
 * @param {Function} getStoryEntryFn Dependency injection for getStoryEntry to avoid circular imports if needed
 * @returns {Object} A new case object with dynamic properties merged in
 */
export function mergeCaseWithStory(baseCase, storyCampaign, getStoryEntryFn) {
    if (!baseCase) return null;

    const caseNumber = baseCase.caseNumber || getCaseNumberById(baseCase.id);
    
    // 1. Resolve Path Key
    // If no story campaign, we default to ROOT or whatever the case has.
    const pathKey = storyCampaign 
        ? resolveStoryPathKey(caseNumber, storyCampaign) 
        : ROOT_PATH_KEY;

    // 2. Fetch Narrative Metadata (Text, Decisions)
    let storyMeta = null;
    if (getStoryEntryFn && caseNumber) {
        storyMeta = getStoryEntryFn(caseNumber, pathKey);
    }

    // 3. Check for Branching Outlier Sets
    // These override the static board.outlierWords
    let branchingBoardOverrides = {};
    const branchingSet = BRANCHING_OUTLIER_SETS[caseNumber];
    
    if (branchingSet && branchingSet.sets) {
        // We need to map the pathKey (e.g., 'A', 'B', 'PATHA') to the optionKey in the sets ('A', 'B')
        // Heuristic: Check if pathKey contains 'A' or 'B'
        const normalizedPath = String(pathKey).toUpperCase();
        
        // Find the matching set
        const targetSet = branchingSet.sets.find(s => {
            // strict match or fuzzy match
            return s.optionKey === normalizedPath || normalizedPath.includes(s.optionKey);
        }) || branchingSet.sets[0]; // Default to first if no match found

        if (targetSet) {
            branchingBoardOverrides = {
                outlierWords: targetSet.words,
                // If the set has a specific theme, we might want to expose it
                branchingTheme: targetSet.theme,
                // We might also want to override descriptions if the game supports it
                clueSummaries: {
                    ...(baseCase.clueSummaries || {}),
                    outliers: {
                        ...(baseCase.clueSummaries?.outliers || {}),
                        ...(targetSet.descriptions || {})
                    }
                }
            };
        }
    }

    // 4. Merge Board Profile (Dynamic columns/rows)
    const boardProfile = getBoardProfile(caseNumber);

    // 5. Construct the Final Object
    const merged = {
        ...baseCase,
        ...branchingBoardOverrides, // Apply top-level overrides like clueSummaries
        board: {
            ...(baseCase.board || {}),
            ...branchingBoardOverrides, // Apply board-level overrides like outlierWords
            profile: boardProfile,
        },
    };

    // 6. Merge Story Metadata
    if (storyMeta) {
        merged.storyMeta = storyMeta;
        merged.storyDecision = storyMeta.decision || null;
        merged.narrative = storyMeta.narrative ? [storyMeta.narrative] : merged.narrative;
        merged.bridgeText = storyMeta.bridgeText ? [storyMeta.bridgeText] : merged.bridgeText;
        if (storyMeta.evidenceBoard) {
            merged.evidenceBoard = storyMeta.evidenceBoard;
        }
    }

    return merged;
}
