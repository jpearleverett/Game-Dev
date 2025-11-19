import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'detective_portrait_progress_v1';

export async function loadStoredProgress() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[Storage] Failed to load progress', error);
    return null;
  }
}

export async function saveStoredProgress(progress) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.warn('[Storage] Failed to save progress', error);
  }
}

export async function clearStoredProgress() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[Storage] Failed to clear progress', error);
  }
}

export const createBlankStoryCampaign = () => ({
  active: true,
  chapter: 1,
  subchapter: 1,
  currentPathKey: 'ROOT',
  activeCaseNumber: '001A',
  awaitingDecision: false,
  pendingDecisionCase: null,
  nextStoryUnlockAt: null,
  pathHistory: {
    1: 'ROOT',
  },
  choiceHistory: [],
  completedCaseNumbers: [],
  lastDecision: null,
  startedAt: null,
  completedAt: null,
  completed: false,
});

export const createBlankProgress = () => ({
  unlockedCaseIds: [1],
  solvedCaseIds: [],
  failedCaseIds: [],
  seenBriefings: {},
  streak: 0,
  bestStreak: 0,
  attemptsDistribution: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    fail: 0,
  },
  lastSolveDate: null,
  nextUnlockAt: null,
  currentCaseId: 1,
  seenPrologue: false,
  premiumUnlocked: false,
  settings: {
    sfxVolume: 0.8,
    musicVolume: 0.6,
    ambienceVolume: 0.4,
    reducedMotion: false,
    colorBlindMode: false,
    highContrast: false,
    hintsEnabled: false,
  },
  shareHistory: [],
  storyCampaign: createBlankStoryCampaign(),
});
