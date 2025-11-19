import { SEASON_ONE_CASES } from '../data/cases';
import {
    createBlankStoryCampaign,
} from '../storage/progressStorage';
import {
    formatCaseNumber,
    ROOT_PATH_KEY,
} from '../data/storyContent';
import { getBoardProfile } from '../utils/caseNumbers';

export const STATUS = {
    LOADING: 'LOADING',
    READY: 'READY',
    IN_PROGRESS: 'IN_PROGRESS',
    SOLVED: 'SOLVED',
    FAILED: 'FAILED',
};

const CASE_NUMBER_TO_DATA = new Map();
const CASE_NUMBER_TO_ID = new Map();
const CASE_ID_TO_NUMBER = new Map();

SEASON_ONE_CASES.forEach((caseData) => {
    CASE_NUMBER_TO_DATA.set(caseData.caseNumber, caseData);
    CASE_NUMBER_TO_ID.set(caseData.caseNumber, caseData.id);
    CASE_ID_TO_NUMBER.set(caseData.id, caseData.caseNumber);
});

export function resolveStoryPathKey(caseNumber, storyCampaign) {
    if (!caseNumber) {
        return ROOT_PATH_KEY;
    }
    if (!storyCampaign) {
        return ROOT_PATH_KEY;
    }
    const chapterSegment = caseNumber.slice(0, 3);
    const chapterNumber = parseInt(chapterSegment, 10);
    if (Number.isNaN(chapterNumber)) {
        return storyCampaign.currentPathKey || ROOT_PATH_KEY;
    }
    const historyKey =
        storyCampaign.pathHistory && storyCampaign.pathHistory[chapterNumber];
    if (historyKey) {
        return historyKey;
    }
    if (
        chapterNumber === storyCampaign.chapter &&
        storyCampaign.currentPathKey
    ) {
        return storyCampaign.currentPathKey;
    }
    return storyCampaign.currentPathKey || ROOT_PATH_KEY;
}

export function computeNextUnlockAt() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
}

export function computeStoryUnlockAt(hours = 24) {
    const now = new Date();
    now.setHours(now.getHours() + hours);
    return now.toISOString();
}

export function dedupeWords(words) {
    return Array.from(new Set(words));
}

export function dedupeIds(ids) {
    return Array.from(new Set(ids));
}

export function shuffleArray(source) {
    const array = Array.isArray(source) ? [...source] : [];
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function getCaseByNumber(caseNumber) {
    return CASE_NUMBER_TO_DATA.get(caseNumber) || null;
}

export function getCaseNumberById(caseId) {
    return CASE_ID_TO_NUMBER.get(caseId) || null;
}

export function normalizeStoryCampaignShape(campaign) {
    const defaults = createBlankStoryCampaign();
    const merged = {
        ...defaults,
        ...(campaign || {}),
    };
    merged.active = true;
    merged.pathHistory = {
        ...defaults.pathHistory,
        ...(campaign?.pathHistory || {}),
    };
    merged.choiceHistory = Array.isArray(campaign?.choiceHistory)
        ? campaign.choiceHistory
        : [];
    merged.completedCaseNumbers = Array.isArray(campaign?.completedCaseNumbers)
        ? campaign.completedCaseNumbers
        : [];
    merged.currentPathKey = normalizeStoryPathKey(merged.currentPathKey || ROOT_PATH_KEY);
    merged.pathHistory[merged.chapter] = merged.currentPathKey;
    if (!merged.activeCaseNumber) {
        merged.activeCaseNumber = formatCaseNumber(merged.chapter, merged.subchapter);
    }
    return merged;
}

// Helper needed for normalizeStoryCampaignShape if not exported from storyContent
// Checking imports... normalizeStoryPathKey is imported from ../data/storyContent in original file.
// I need to make sure I import it here too.
import { normalizeStoryPathKey } from '../data/storyContent';

export function extractOutlierWords(board, requiredCount = 4) {
    if (!board) return [];
    const raw = Array.isArray(board.outlierWords) ? board.outlierWords : [];
    const unique = dedupeWords(raw.filter(Boolean));
    if (unique.length < requiredCount) {
        console.warn(
            `[GameContext] Expected at least ${requiredCount} outlier words, received ${unique.length}.`,
        );
    }
    return unique.slice(0, requiredCount);
}

export function extractMainWords(board, outlierWords) {
    if (!board) return [];
    const outlierSet = new Set(outlierWords || []);
    if (Array.isArray(board.mainWords) && board.mainWords.length) {
        return dedupeWords(board.mainWords.filter((word) => word && !outlierSet.has(word)));
    }
    if (Array.isArray(board.grid) && board.grid.length) {
        return dedupeWords(
            board.grid
                .flat()
                .filter(Boolean)
                .filter((word) => !outlierSet.has(word)),
        );
    }
    return [];
}

export function generateBoardGrid(caseData) {
    const board = caseData?.board;
    if (!board) return [];
    const profile = getBoardProfile(caseData?.caseNumber);
    const totalSlots = profile.slots;
    const outlierWords = extractOutlierWords(board, profile.outlierTarget);
    const mainPool = extractMainWords(board, outlierWords);
    const requiredMainCount = Math.max(totalSlots - outlierWords.length, 0);

    if (mainPool.length < requiredMainCount) {
        console.warn(
            `[GameContext] Case ${caseData?.id ?? 'unknown'} has only ${mainPool.length} main words; expected ${requiredMainCount}.`,
        );
    }

    const selectedMain = mainPool.slice(0, requiredMainCount);
    const combined = [...selectedMain, ...outlierWords];
    let uniqueCombined = dedupeWords(combined);

    if (uniqueCombined.length < totalSlots) {
        const fallbackPool = [...mainPool, ...outlierWords].filter((word) => !uniqueCombined.includes(word));
        for (let i = 0; i < fallbackPool.length && uniqueCombined.length < totalSlots; i += 1) {
            uniqueCombined.push(fallbackPool[i]);
        }
    }

    if (uniqueCombined.length > totalSlots) {
        uniqueCombined = uniqueCombined.slice(0, totalSlots);
    } else if (uniqueCombined.length < totalSlots && uniqueCombined.length) {
        const deficit = totalSlots - uniqueCombined.length;
        console.warn(
            `[GameContext] Case ${caseData?.id ?? 'unknown'} is missing ${deficit} words to fill the grid.`,
        );
        const fallbackPool = [...mainPool, ...outlierWords];
        let index = 0;
        while (uniqueCombined.length < totalSlots && fallbackPool.length) {
            uniqueCombined.push(fallbackPool[index % fallbackPool.length]);
            index += 1;
        }
    }

    const shuffled = shuffleArray(uniqueCombined).slice(0, totalSlots);
    const grid = [];
    for (let row = 0; row < profile.rows; row += 1) {
        grid.push(shuffled.slice(row * profile.columns, (row + 1) * profile.columns));
    }
    return grid;
}
