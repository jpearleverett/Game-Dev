/**
 * Dynamic Branching Outliers
 *
 * Provides branching outlier sets for decision points.
 * For Chapter 1: Uses static data from branchingOutliers.js
 * For Chapters 2-12: Uses data from generated story content
 */

import { BRANCHING_OUTLIER_SETS } from './branchingOutliers';
import { isDynamicChapter, normalizeStoryPathKey, parseCaseNumber } from './storyContent';
import { getGeneratedEntry } from '../storage/generatedStoryStorage';

/**
 * Get branching outlier sets for a case (sync version for Chapter 1)
 */
export function getBranchingOutlierSets(caseNumber, pathKey) {
  // Only use static data for Chapter 1
  if (!isDynamicChapter(caseNumber)) {
    const caseData = BRANCHING_OUTLIER_SETS[caseNumber];
    if (!caseData) return null;

    const normalizedKey = normalizeStoryPathKey(pathKey);

    // Try path-specific, then ROOT
    if (caseData[normalizedKey]) {
      return {
        attempts: caseData.attempts || 5,
        ...caseData[normalizedKey],
      };
    }
    if (caseData['ROOT']) {
      return {
        attempts: caseData.attempts || 5,
        ...caseData['ROOT'],
      };
    }

    return null;
  }

  // For dynamic chapters, return null (use async version)
  return null;
}

/**
 * Get branching outlier sets for a case (async version for all chapters)
 */
export async function getBranchingOutlierSetsAsync(caseNumber, pathKey) {
  if (!caseNumber) return null;

  // Check if this is a decision subchapter (ends in 'C')
  const { subchapter } = parseCaseNumber(caseNumber);
  if (subchapter !== 3) {
    // Not a decision point
    return null;
  }

  // For Chapter 1, use static data
  if (!isDynamicChapter(caseNumber)) {
    return getBranchingOutlierSets(caseNumber, pathKey);
  }

  // For dynamic chapters, get from generated content
  const normalizedKey = normalizeStoryPathKey(pathKey);
  const generatedEntry = await getGeneratedEntry(caseNumber, normalizedKey);

  if (!generatedEntry?.decision || !generatedEntry?.board) {
    return null;
  }

  // Build branching outlier structure from generated content
  return buildBranchingFromGenerated(generatedEntry);
}

/**
 * Build branching outlier structure from generated story entry
 */
function buildBranchingFromGenerated(entry) {
  if (!entry.decision?.options || entry.decision.options.length < 2) {
    return null;
  }

  const board = entry.board || {};
  const decision = entry.decision;

  // If the board already has branchingOutlierSets, use them
  if (board.branchingOutlierSets) {
    return {
      attempts: 5,
      sets: board.branchingOutlierSets,
    };
  }

  // Otherwise, build from decision options and outlier words
  const outlierWords = board.outlierWords || [];

  // Split outliers between the two options (4 each for decision points)
  const set1Words = outlierWords.slice(0, 4);
  const set2Words = outlierWords.slice(4, 8);

  const sets = [
    {
      optionKey: decision.options[0].key,
      label: decision.options[0].key,
      theme: {
        name: decision.options[0].title?.slice(0, 12).toUpperCase() || 'OPTION A',
        icon: '\ud83d\udd2e',
        summary: decision.options[0].title || 'Option A',
      },
      words: set1Words,
      descriptions: set1Words.reduce((acc, word) => {
        acc[word] = `Part of the '${decision.options[0].key}' path choice.`;
        return acc;
      }, {}),
    },
    {
      optionKey: decision.options[1].key,
      label: decision.options[1].key,
      theme: {
        name: decision.options[1].title?.slice(0, 12).toUpperCase() || 'OPTION B',
        icon: '\ud83d\udd2e',
        summary: decision.options[1].title || 'Option B',
      },
      words: set2Words,
      descriptions: set2Words.reduce((acc, word) => {
        acc[word] = `Part of the '${decision.options[1].key}' path choice.`;
        return acc;
      }, {}),
    },
  ];

  return {
    attempts: 5,
    sets,
  };
}

/**
 * Get all outlier words for a case (both sets combined)
 */
export async function getAllOutlierWordsAsync(caseNumber, pathKey) {
  const branchingData = await getBranchingOutlierSetsAsync(caseNumber, pathKey);

  if (!branchingData?.sets) {
    return [];
  }

  return branchingData.sets.reduce((all, set) => {
    return [...all, ...(set.words || [])];
  }, []);
}

/**
 * Check if a case is a decision point
 */
export function isDecisionPoint(caseNumber) {
  if (!caseNumber) return false;
  return caseNumber.endsWith('C');
}

/**
 * Get number of attempts for a case
 */
export async function getAttemptsForCase(caseNumber, pathKey) {
  const { subchapter } = parseCaseNumber(caseNumber);

  // Decision points (C subchapters) have 5 attempts
  if (subchapter === 3) {
    const branchingData = await getBranchingOutlierSetsAsync(caseNumber, pathKey);
    return branchingData?.attempts || 5;
  }

  // Regular subchapters have 4 attempts
  return 4;
}
