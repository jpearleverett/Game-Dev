import storyNarrative from './storyNarrative.json';

const CASE_CONTENT = storyNarrative?.caseContent || {};

export const ROOT_PATH_KEY = 'ROOT';

export function normalizeStoryPathKey(token) {
  if (!token) {
    return ROOT_PATH_KEY;
  }
  const cleaned = String(token)
    .replace(/super-path/gi, '')
    .replace(/path/gi, '')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  return cleaned || ROOT_PATH_KEY;
}

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

export function formatCaseNumber(chapter, subchapter) {
  const letters = ['A', 'B', 'C'];
  const letter = letters[subchapter - 1] || letters[0];
  return `${String(chapter).padStart(3, '0')}${letter}`;
}

export function getStoryEntry(caseNumber, pathKey) {
  if (!caseNumber) return null;
  const bucket = CASE_CONTENT[caseNumber];
  if (!bucket) return null;
  const normalizedKey = normalizeStoryPathKey(pathKey);
  return (
    bucket[normalizedKey] ||
    bucket[ROOT_PATH_KEY] ||
    bucket[Object.keys(bucket)[0]]
  );
}

export function getStoryDecision(caseNumber, pathKey) {
  const entry = getStoryEntry(caseNumber, pathKey);
  return entry?.decision || null;
}

export function getStoryBridgeText(caseNumber, pathKey) {
  const entry = getStoryEntry(caseNumber, pathKey);
  return entry?.bridgeText || null;
}

export function getStoryNarrative(caseNumber, pathKey) {
  const entry = getStoryEntry(caseNumber, pathKey);
  if (!entry?.narrative) {
    return [];
  }
  return Array.isArray(entry.narrative) ? entry.narrative : [entry.narrative];
}

export function getStoryMeta(caseNumber, pathKey) {
  const entry = getStoryEntry(caseNumber, pathKey);
  if (!entry) return null;
  return {
    chapter: entry.chapter,
    subchapter: entry.subchapter,
    title: entry.title,
    bridgeText: entry.bridgeText,
    decision: entry.decision || null,
  };
}
