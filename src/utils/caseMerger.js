import { BRANCHING_OUTLIER_SETS } from '../data/branchingOutliers';
import { resolveStoryPathKey, ROOT_PATH_KEY } from '../data/storyContent';
import { getCaseNumberById } from './gameLogic'; 
import { getBoardProfile } from './caseNumbers';

/**
 * Merges the raw case data with story-specific overrides.
 * Handles both:
 * 1. Narrative Branching (Deep Paths like 'AA', 'AP') -> Overrides text/polaroids
 * 2. Decision Puzzles (C-Cases) -> Injecting multiple outlier sets for the user to find
 */
export function mergeCaseWithStory(baseCase, storyCampaign, getStoryEntryFn) {
    if (!baseCase) return null;

    const caseNumber = baseCase.caseNumber || getCaseNumberById(baseCase.id);
    
    // 1. Resolve Path Key
    const pathKey = storyCampaign 
        ? resolveStoryPathKey(caseNumber, storyCampaign) 
        : ROOT_PATH_KEY;

    // 2. Fetch Narrative Metadata (Text, Decisions, EvidenceBoard Overrides)
    let storyMeta = null;
    if (getStoryEntryFn && caseNumber) {
        storyMeta = getStoryEntryFn(caseNumber, pathKey);
    }

    // 3. Handle Branching Outlier Sets (The "Puzzle" Logic)
    let branchingBoardOverrides = {};
    const branchingSet = BRANCHING_OUTLIER_SETS[caseNumber];
    
    if (branchingSet && branchingSet.sets) {
        // CASE TYPE: DECISION POINT (e.g., 001C)
        // For these cases, the user must see ALL options (A and B) on the board.
        // We do NOT filter by path history here, because the user is making the choice *now*.
        
        const allSets = branchingSet.sets;
        
        // Flatten all words from all sets to create the master outlier list
        const allOutlierWords = allSets.reduce((acc, set) => {
            return [...acc, ...(set.words || [])];
        }, []);

        branchingBoardOverrides = {
            // The board needs to know the sets to color-code them (Red vs Blue paths)
            branchingOutlierSets: allSets,
            outlierWords: allOutlierWords,
            
            // Clue summaries might need to be merged so hints work for both paths
            clueSummaries: {
                ...(baseCase.clueSummaries || {}),
                outliers: {
                    ...(baseCase.clueSummaries?.outliers || {}),
                    // Merge descriptions from all sets
                    ...allSets.reduce((acc, set) => ({ ...acc, ...(set.descriptions || {}) }), {})
                }
            }
        };
    } else if (storyMeta && storyMeta.board) {
        // CASE TYPE: NARRATIVE VARIANT (e.g., 010A-AA vs 010A-AP)
        // If the narrative JSON provides specific board data for a path, we use it.
        // This allows "Path A" to have different puzzle words than "Path B" if data exists.
        branchingBoardOverrides = {
            ...storyMeta.board
        };
    }

    // 4. Merge Board Profile (Dynamic columns/rows)
    const boardProfile = getBoardProfile(caseNumber);
    
    // For branching boards, we might need to force larger dimensions if word count is high
    if (branchingSet && branchingSet.sets.length >= 2) {
        // Optional: Ensure profile has enough slots for 2 sets of outliers + main words
        // The getBoardProfile utility usually handles 'branching: true' logic based on case number suffixes
    }

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

    // 6. Merge Story Metadata (Narrative, Polaroids)
    if (storyMeta) {
        merged.storyMeta = storyMeta;
        merged.storyDecision = storyMeta.decision || null;
        merged.narrative = storyMeta.narrative ? [storyMeta.narrative] : merged.narrative;
        merged.bridgeText = storyMeta.bridgeText ? [storyMeta.bridgeText] : merged.bridgeText;
        
        // IMPORTANT: Narrative evidenceBoard (Polaroids) overrides the static one
        if (storyMeta.evidenceBoard) {
            merged.evidenceBoard = storyMeta.evidenceBoard;
        }
    }

    return merged;
}
