import { BRANCHING_OUTLIER_SETS } from '../data/branchingOutliers';
import { resolveStoryPathKey, ROOT_PATH_KEY, isDynamicChapter, getStoryEntryAsync } from '../data/storyContent';
import { getBranchingOutlierSetsAsync } from '../data/dynamicBranchingOutliers';
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
    let branchingSet = BRANCHING_OUTLIER_SETS[caseNumber];
    
    // If the branching set structure has path keys, resolve the specific set for the current path
    if (branchingSet && !branchingSet.sets) {
        if (branchingSet[pathKey]) {
            branchingSet = branchingSet[pathKey];
        } else if (branchingSet[ROOT_PATH_KEY]) {
            branchingSet = branchingSet[ROOT_PATH_KEY];
        }
    }
    
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

    // 6. Merge Story Metadata (Narrative, Polaroids, Briefing)
    if (storyMeta) {
        merged.storyMeta = storyMeta;
        merged.storyDecision = storyMeta.decision || null;
        merged.narrative = storyMeta.narrative ? [storyMeta.narrative] : merged.narrative;
        merged.bridgeText = storyMeta.bridgeText ? [storyMeta.bridgeText] : merged.bridgeText;

        // Merge generated 'previously' text for recap sections
        if (storyMeta.previously) {
            merged.previously = storyMeta.previously;
        }

        // Merge generated briefing for mission objectives
        if (storyMeta.briefing) {
            merged.briefing = {
                ...(merged.briefing || {}),
                ...storyMeta.briefing,
            };
        }

        // IMPORTANT: Narrative evidenceBoard (Polaroids) overrides the static one
        if (storyMeta.evidenceBoard) {
            merged.evidenceBoard = storyMeta.evidenceBoard;
        }
    }

    return merged;
}

/**
 * Async version of mergeCaseWithStory that supports dynamically generated content.
 * For chapters 2-12, this will use generated story content if available.
 */
export async function mergeCaseWithStoryAsync(baseCase, storyCampaign, getStoryEntryFn) {
    if (!baseCase) return null;

    const caseNumber = baseCase.caseNumber || getCaseNumberById(baseCase.id);

    // 1. Resolve Path Key
    const pathKey = storyCampaign
        ? resolveStoryPathKey(caseNumber, storyCampaign)
        : ROOT_PATH_KEY;

    // 2. Fetch Narrative Metadata - use async for dynamic chapters
    let storyMeta = null;
    if (caseNumber) {
        if (isDynamicChapter(caseNumber)) {
            // For dynamic chapters (2-12), use async fetch
            storyMeta = await getStoryEntryAsync(caseNumber, pathKey);
        } else if (getStoryEntryFn) {
            // For Chapter 1, use provided sync function
            storyMeta = getStoryEntryFn(caseNumber, pathKey);
        }
    }

    // 3. Handle Branching Outlier Sets - use async for dynamic chapters
    let branchingBoardOverrides = {};
    let branchingSet = null;

    if (isDynamicChapter(caseNumber)) {
        // For dynamic chapters, get branching data from generated content
        branchingSet = await getBranchingOutlierSetsAsync(caseNumber, pathKey);
    } else {
        // For Chapter 1, use static branching sets
        branchingSet = BRANCHING_OUTLIER_SETS[caseNumber];

        // If the branching set structure has path keys, resolve the specific set
        if (branchingSet && !branchingSet.sets) {
            if (branchingSet[pathKey]) {
                branchingSet = branchingSet[pathKey];
            } else if (branchingSet[ROOT_PATH_KEY]) {
                branchingSet = branchingSet[ROOT_PATH_KEY];
            }
        }
    }

    if (branchingSet && branchingSet.sets) {
        // CASE TYPE: DECISION POINT
        const allSets = branchingSet.sets;

        // Flatten all words from all sets
        const allOutlierWords = allSets.reduce((acc, set) => {
            return [...acc, ...(set.words || [])];
        }, []);

        branchingBoardOverrides = {
            branchingOutlierSets: allSets,
            outlierWords: allOutlierWords,
            clueSummaries: {
                ...(baseCase.clueSummaries || {}),
                outliers: {
                    ...(baseCase.clueSummaries?.outliers || {}),
                    ...allSets.reduce((acc, set) => ({ ...acc, ...(set.descriptions || {}) }), {})
                }
            }
        };
    } else if (storyMeta && storyMeta.board) {
        // CASE TYPE: NARRATIVE VARIANT
        branchingBoardOverrides = {
            ...storyMeta.board
        };
    }

    // 4. Merge Board Profile
    const boardProfile = getBoardProfile(caseNumber);

    // 5. Construct the Final Object
    const merged = {
        ...baseCase,
        ...branchingBoardOverrides,
        board: {
            ...(baseCase.board || {}),
            ...branchingBoardOverrides,
            profile: boardProfile,
        },
    };

    // 6. Merge Story Metadata (Narrative, Polaroids, Briefing)
    if (storyMeta) {
        merged.storyMeta = storyMeta;
        merged.storyDecision = storyMeta.decision || null;
        merged.narrative = storyMeta.narrative ? [storyMeta.narrative] : merged.narrative;
        merged.bridgeText = storyMeta.bridgeText ? [storyMeta.bridgeText] : merged.bridgeText;

        // Merge generated 'previously' text for recap sections
        if (storyMeta.previously) {
            merged.previously = storyMeta.previously;
        }

        // Merge generated briefing for mission objectives
        if (storyMeta.briefing) {
            merged.briefing = {
                ...(merged.briefing || {}),
                ...storyMeta.briefing,
            };
        }

        if (storyMeta.evidenceBoard) {
            merged.evidenceBoard = storyMeta.evidenceBoard;
        }
    }

    return merged;
}
