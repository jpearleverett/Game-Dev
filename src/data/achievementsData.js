/**
 * Dead Letters: Achievements System
 * 
 * Achievements are organized into categories:
 * - Story: Reaching specific endings and paths
 * - Gameplay: Performance-based achievements
 * - Hidden: Secret achievements discovered through specific actions
 */

export const ACHIEVEMENT_CATEGORIES = {
  STORY: 'story',
  GAMEPLAY: 'gameplay',
  HIDDEN: 'hidden',
};

export const ACHIEVEMENTS = {
  // === STORY ACHIEVEMENTS ===
  
  // Ending-specific achievements
  THE_TYRANTS_CROWN: {
    id: 'THE_TYRANTS_CROWN',
    title: "The Tyrant's Crown",
    description: 'Reach The Tyrant ending',
    hint: 'Seize power at every opportunity',
    icon: '👑',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    condition: { type: 'ending', endingId: 'TYRANT' },
    points: 100,
    rarity: 'rare',
  },
  CLEAN_HANDS: {
    id: 'CLEAN_HANDS',
    title: 'Clean Hands',
    description: 'Reach The Martyr ending',
    hint: 'Some prices are worth paying',
    icon: '🕊️',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    condition: { type: 'ending', endingId: 'MARTYR_A' },
    points: 100,
    rarity: 'rare',
  },
  GHOST_PROTOCOL: {
    id: 'GHOST_PROTOCOL',
    title: 'Ghost Protocol',
    description: 'Reach The Wandering Ghost ending',
    hint: 'Disappear completely',
    icon: '👻',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    condition: { type: 'ending', endingId: 'WANDERING_GHOST' },
    points: 100,
    rarity: 'rare',
  },
  SHADOW_HEIR: {
    id: 'SHADOW_HEIR',
    title: 'Shadow Heir',
    description: 'Reach The Overseer ending',
    hint: 'Inherit the shadow network',
    icon: '🎭',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    condition: { type: 'ending', endingId: 'OVERSEER_A' },
    points: 100,
    rarity: 'rare',
  },
  SCALES_OF_JUSTICE: {
    id: 'SCALES_OF_JUSTICE',
    title: 'Scales of Justice',
    description: 'Reach The Reformer ending',
    hint: 'Work within the system',
    icon: '⚖️',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    condition: { type: 'ending', endingId: 'REFORMER_A' },
    points: 100,
    rarity: 'rare',
  },
  QUIET_WISDOM: {
    id: 'QUIET_WISDOM',
    title: 'Quiet Wisdom',
    description: 'Reach The Quiet Man ending',
    hint: 'Speak softly and carry influence',
    icon: '🤫',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    condition: { type: 'ending', endingId: 'QUIET_MAN' },
    points: 100,
    rarity: 'rare',
  },
  MASTER_BUILDER: {
    id: 'MASTER_BUILDER',
    title: 'Master Builder',
    description: 'Reach The Architect ending',
    hint: 'Build something lasting',
    icon: '🏛️',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    condition: { type: 'ending', endingId: 'ARCHITECT' },
    points: 100,
    rarity: 'rare',
  },
  CASTAWAY: {
    id: 'CASTAWAY',
    title: 'Castaway',
    description: 'Reach The Isolate ending',
    hint: 'Cut all ties',
    icon: '🏝️',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    condition: { type: 'ending', endingId: 'ISOLATE' },
    points: 100,
    rarity: 'rare',
  },
  
  // Path completion achievements
  COMPLETIONIST: {
    id: 'COMPLETIONIST',
    title: 'Completionist',
    description: 'Unlock all 16 endings',
    hint: 'See every possible future',
    icon: '🏆',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    condition: { type: 'all_endings' },
    points: 500,
    rarity: 'legendary',
  },
  THE_LONG_ROAD: {
    id: 'THE_LONG_ROAD',
    title: 'The Long Road',
    description: 'Complete the Methodical super-path',
    hint: 'Patience is a virtue',
    icon: '🛤️',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    condition: { type: 'superpath', superPath: 'Methodical' },
    points: 150,
    rarity: 'uncommon',
  },
  BURN_IT_DOWN: {
    id: 'BURN_IT_DOWN',
    title: 'Burn It Down',
    description: 'Complete the Aggressive super-path',
    hint: 'Sometimes you have to break things',
    icon: '🔥',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    condition: { type: 'superpath', superPath: 'Aggressive' },
    points: 150,
    rarity: 'uncommon',
  },
  FIRST_ENDING: {
    id: 'FIRST_ENDING',
    title: 'The First Truth',
    description: 'Reach your first ending',
    hint: 'Complete the story campaign',
    icon: '📖',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    condition: { type: 'any_ending' },
    points: 50,
    rarity: 'common',
  },
  HALFWAY_THERE: {
    id: 'HALFWAY_THERE',
    title: 'Halfway There',
    description: 'Unlock 8 different endings',
    hint: 'Explore half the possibilities',
    icon: '📊',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    condition: { type: 'ending_count', count: 8 },
    points: 200,
    rarity: 'rare',
  },
  
  // === GAMEPLAY ACHIEVEMENTS ===
  
  PERFECT_DETECTIVE: {
    id: 'PERFECT_DETECTIVE',
    title: 'Perfect Detective',
    description: 'Solve a case in 1 attempt',
    hint: 'Trust your instincts',
    icon: '🎯',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    condition: { type: 'solve_attempts', attempts: 1 },
    points: 75,
    rarity: 'uncommon',
  },
  NO_STONE_UNTURNED: {
    id: 'NO_STONE_UNTURNED',
    title: 'No Stone Unturned',
    description: 'Find all outliers on your first guess',
    hint: 'Spot all the anomalies at once',
    icon: '🔍',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    condition: { type: 'first_guess_complete' },
    points: 100,
    rarity: 'rare',
  },
  AGAINST_THE_CLOCK: {
    id: 'AGAINST_THE_CLOCK',
    title: 'Against the Clock',
    description: 'Complete a case in under 60 seconds',
    hint: 'Speed is of the essence',
    icon: '⏱️',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    condition: { type: 'time_limit', seconds: 60 },
    points: 75,
    rarity: 'uncommon',
  },
  MARATHON_MAN: {
    id: 'MARATHON_MAN',
    title: 'Marathon Man',
    description: 'Complete full story in one session',
    hint: 'Dedicate an evening to justice',
    icon: '🏃',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    condition: { type: 'single_session' },
    points: 150,
    rarity: 'rare',
  },
  CASE_CRACKER: {
    id: 'CASE_CRACKER',
    title: 'Case Cracker',
    description: 'Solve 10 cases',
    hint: 'Practice makes perfect',
    icon: '📁',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    condition: { type: 'total_solved', count: 10 },
    points: 50,
    rarity: 'common',
  },
  VETERAN_INVESTIGATOR: {
    id: 'VETERAN_INVESTIGATOR',
    title: 'Veteran Investigator',
    description: 'Solve 50 cases',
    hint: 'A true professional',
    icon: '🏅',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    condition: { type: 'total_solved', count: 50 },
    points: 150,
    rarity: 'rare',
  },
  STREAK_FIVE: {
    id: 'STREAK_FIVE',
    title: 'Hot Streak',
    description: 'Solve 5 cases in a row',
    hint: 'Keep the momentum going',
    icon: '🔥',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    condition: { type: 'streak', count: 5 },
    points: 50,
    rarity: 'common',
  },
  STREAK_TEN: {
    id: 'STREAK_TEN',
    title: 'Unstoppable',
    description: 'Solve 10 cases in a row',
    hint: 'A legend in the making',
    icon: '💫',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    condition: { type: 'streak', count: 10 },
    points: 100,
    rarity: 'uncommon',
  },
  DAILY_RITUAL: {
    id: 'DAILY_RITUAL',
    title: 'Daily Ritual',
    description: 'Play for 7 consecutive days',
    hint: 'Make it a habit',
    icon: '📅',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    condition: { type: 'consecutive_days', count: 7 },
    points: 100,
    rarity: 'uncommon',
  },
  
  // === HIDDEN ACHIEVEMENTS ===
  
  TRUST_ISSUES: {
    id: 'TRUST_ISSUES',
    title: 'Trust Issues',
    description: 'Reach 0 Sarah Trust',
    hint: '???',
    icon: '💔',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    condition: { type: 'sarah_trust', value: 0 },
    points: 50,
    rarity: 'rare',
    hidden: true,
  },
  VICTORIAS_FAVORITE: {
    id: 'VICTORIAS_FAVORITE',
    title: "Victoria's Favorite",
    description: 'Side with Victoria in every decision',
    hint: '???',
    icon: '🖤',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    condition: { type: 'all_victoria' },
    points: 100,
    rarity: 'rare',
    hidden: true,
  },
  THE_THIRD_OPTION: {
    id: 'THE_THIRD_OPTION',
    title: 'The Third Option',
    description: 'Find the hidden path',
    hint: '???',
    icon: '🚪',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    condition: { type: 'secret_path' },
    points: 150,
    rarity: 'legendary',
    hidden: true,
  },
  NIGHT_OWL: {
    id: 'NIGHT_OWL',
    title: 'Night Owl',
    description: 'Solve a case between midnight and 4 AM',
    hint: '???',
    icon: '🦉',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    condition: { type: 'time_of_day', start: 0, end: 4 },
    points: 25,
    rarity: 'common',
    hidden: true,
  },
  EARLY_BIRD: {
    id: 'EARLY_BIRD',
    title: 'Early Bird',
    description: 'Solve a case between 5 AM and 7 AM',
    hint: '???',
    icon: '🐦',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    condition: { type: 'time_of_day', start: 5, end: 7 },
    points: 25,
    rarity: 'common',
    hidden: true,
  },
  PERSISTENT: {
    id: 'PERSISTENT',
    title: 'Persistent',
    description: 'Retry a failed case and solve it',
    hint: '???',
    icon: '🔄',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    condition: { type: 'retry_success' },
    points: 50,
    rarity: 'common',
    hidden: true,
  },
  THE_BEGINNING: {
    id: 'THE_BEGINNING',
    title: 'The Beginning',
    description: 'Read the full prologue',
    hint: '???',
    icon: '📜',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    condition: { type: 'prologue_complete' },
    points: 10,
    rarity: 'common',
    hidden: true,
  },
};

// Array format for easy iteration
export const ACHIEVEMENTS_LIST = Object.values(ACHIEVEMENTS);

// Total achievement count
export const ACHIEVEMENT_COUNT = ACHIEVEMENTS_LIST.length;

// Group by category
export const ACHIEVEMENTS_BY_CATEGORY = {
  [ACHIEVEMENT_CATEGORIES.STORY]: ACHIEVEMENTS_LIST.filter(a => a.category === ACHIEVEMENT_CATEGORIES.STORY),
  [ACHIEVEMENT_CATEGORIES.GAMEPLAY]: ACHIEVEMENTS_LIST.filter(a => a.category === ACHIEVEMENT_CATEGORIES.GAMEPLAY),
  [ACHIEVEMENT_CATEGORIES.HIDDEN]: ACHIEVEMENTS_LIST.filter(a => a.category === ACHIEVEMENT_CATEGORIES.HIDDEN),
};

// Rarity definitions for UI styling
export const RARITY_CONFIG = {
  common: {
    label: 'Common',
    color: '#9CA3AF',
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
  uncommon: {
    label: 'Uncommon',
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  rare: {
    label: 'Rare',
    color: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  legendary: {
    label: 'Legendary',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
};

/**
 * Get achievement by ID
 */
export function getAchievementById(id) {
  return ACHIEVEMENTS[id] || null;
}

/**
 * Calculate total possible points
 */
export function getTotalPossiblePoints() {
  return ACHIEVEMENTS_LIST.reduce((sum, a) => sum + a.points, 0);
}

/**
 * Calculate earned points from unlocked achievements
 */
export function calculateEarnedPoints(unlockedIds = []) {
  return unlockedIds.reduce((sum, id) => {
    const achievement = ACHIEVEMENTS[id];
    return sum + (achievement?.points || 0);
  }, 0);
}

/**
 * Get visible achievements (excludes hidden until unlocked)
 */
export function getVisibleAchievements(unlockedIds = []) {
  return ACHIEVEMENTS_LIST.filter(a => !a.hidden || unlockedIds.includes(a.id));
}

/**
 * Get achievement progress percentage
 */
export function getAchievementProgress(unlockedIds = []) {
  return Math.round((unlockedIds.length / ACHIEVEMENT_COUNT) * 100);
}

export default ACHIEVEMENTS;
