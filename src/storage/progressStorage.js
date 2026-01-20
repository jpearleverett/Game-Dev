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
  // BRANCHING CHOICES: Track player's actual path through each subchapter's branching narrative
  // Each entry: { caseNumber: "002A", firstChoice: "1B", secondChoice: "1B-2C", completedAt: timestamp }
  // This enables true infinite branching - next subchapter continues from player's ACTUAL experience
  branchingChoices: [],
  completedCaseNumbers: [],
  lastDecision: null,
  startedAt: null,
  completedAt: null,
  completed: false,
  // Ending reached on completion
  endingId: null,
  endingReachedAt: null,
});

/**
 * Create blank endings tracking state
 */
export const createBlankEndingsState = () => ({
  // Array of ending IDs that have been unlocked
  unlockedEndingIds: [],
  // Map of endingId -> { unlockedAt, playthrough details }
  endingDetails: {},
  // Total number of times any ending was reached
  totalEndingsReached: 0,
  // First ending reached
  firstEndingId: null,
  firstEndingAt: null,
});

/**
 * Create blank achievements tracking state
 */
export const createBlankAchievementsState = () => ({
  // Array of achievement IDs that have been unlocked
  unlockedAchievementIds: [],
  // Map of achievementId -> { unlockedAt, context }
  achievementDetails: {},
  // Total points earned
  totalPoints: 0,
  // Timestamp when achievements were last checked
  lastCheckedAt: null,
});

/**
 * Create blank chapter checkpoints for replay
 */
export const createBlankChapterCheckpoints = () => ({
  // Array of checkpoint objects for chapter select
  // Each checkpoint: { chapter, subchapter, pathKey, savedAt, storyCampaignSnapshot }
  checkpoints: [],
  // Whether chapter select is unlocked (requires first completion)
  unlocked: false,
  // Active replay branch (null if not replaying)
  activeReplayBranch: null,
});

/**
 * Create blank gameplay stats for time-based achievements
 */
export const createBlankGameplayStats = () => ({
  // Total cases started
  totalCasesStarted: 0,
  // Total time spent (milliseconds)
  totalPlayTime: 0,
  // Fastest case solve time (milliseconds)
  fastestSolveTime: null,
  // Session start time (ISO string)
  sessionStartedAt: null,
  // Consecutive days played
  consecutiveDays: 0,
  // Last play date (for streak tracking)
  lastPlayDate: null,
  // Cases solved in one attempt
  perfectSolves: 0,
  // First guess complete (all outliers found)
  firstGuessComplete: 0,
  // Retried cases that were then solved
  retrySuccesses: [],
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
    verboseMode: false,
    logFullPrompts: false,
    enableProseQualityValidation: true,
    enableSentenceVarietyValidation: true,
    enableLLMValidation: true,
  },
  shareHistory: [],
  storyCampaign: createBlankStoryCampaign(),
  // New: Endings tracking
  endings: createBlankEndingsState(),
  // New: Achievements tracking
  achievements: createBlankAchievementsState(),
  // New: Chapter checkpoints for replay
  chapterCheckpoints: createBlankChapterCheckpoints(),
  // New: Gameplay stats for achievements
  gameplayStats: createBlankGameplayStats(),
  // Version for migrations
  progressVersion: 2,
});

/**
 * Migrate old progress format to new format
 */
export function migrateProgress(oldProgress) {
  if (!oldProgress) return null;
  
  // Already migrated
  if (oldProgress.progressVersion >= 2) return oldProgress;
  
  return {
    ...oldProgress,
    endings: oldProgress.endings || createBlankEndingsState(),
    achievements: oldProgress.achievements || createBlankAchievementsState(),
    chapterCheckpoints: oldProgress.chapterCheckpoints || createBlankChapterCheckpoints(),
    gameplayStats: oldProgress.gameplayStats || createBlankGameplayStats(),
    storyCampaign: {
      ...createBlankStoryCampaign(),
      ...oldProgress.storyCampaign,
      endingId: oldProgress.storyCampaign?.endingId || null,
      endingReachedAt: oldProgress.storyCampaign?.endingReachedAt || null,
    },
    progressVersion: 2,
  };
}
