import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeStoryPathKey, ROOT_PATH_KEY } from '../data/storyContent';

const STORAGE_PREFIX = 'logic_puzzle:';

const buildKey = (caseNumber, pathKey) => {
  const safeCase = caseNumber || 'unknown';
  const safePath = normalizeStoryPathKey(pathKey || ROOT_PATH_KEY);
  return `${STORAGE_PREFIX}${safeCase}_${safePath}`;
};

export async function loadLogicPuzzle(caseNumber, pathKey) {
  if (!caseNumber) return null;
  try {
    const raw = await AsyncStorage.getItem(buildKey(caseNumber, pathKey));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[logicPuzzleStorage] Failed to load puzzle state:', error);
    return null;
  }
}

export async function saveLogicPuzzle(caseNumber, pathKey, payload) {
  if (!caseNumber) return;
  try {
    await AsyncStorage.setItem(buildKey(caseNumber, pathKey), JSON.stringify(payload));
  } catch (error) {
    console.warn('[logicPuzzleStorage] Failed to save puzzle state:', error);
  }
}

export async function clearLogicPuzzle(caseNumber, pathKey) {
  if (!caseNumber) return;
  try {
    await AsyncStorage.removeItem(buildKey(caseNumber, pathKey));
  } catch (error) {
    console.warn('[logicPuzzleStorage] Failed to clear puzzle state:', error);
  }
}

export async function clearLogicPuzzleAllForCase(caseNumber) {
  if (!caseNumber) return;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const targets = keys.filter((key) => key.startsWith(`${STORAGE_PREFIX}${caseNumber}_`));
    if (targets.length) {
      await AsyncStorage.multiRemove(targets);
    }
  } catch (error) {
    console.warn('[logicPuzzleStorage] Failed to clear case puzzles:', error);
  }
}
