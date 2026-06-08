/**
 * Dead Letters: Under-Map achievements.
 *
 * These reward the shipped campaign loop: EXAMINE fragments, CONNECT truths,
 * commit BELIEFS, and watch The Other Reader answer from the road not taken.
 */

export const ACHIEVEMENT_CATEGORIES = {
  STORY: 'story',
  GAMEPLAY: 'gameplay',
  HIDDEN: 'hidden',
};

export const ACHIEVEMENTS = {
  THE_BEGINNING: {
    id: 'THE_BEGINNING',
    title: 'The First Letter',
    description: 'Read the prologue and step into Ashport.',
    hint: 'Begin the story.',
    icon: '✉️',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    points: 10,
    rarity: 'common',
  },
  FIRST_FRAGMENT: {
    id: 'FIRST_FRAGMENT',
    title: 'Pinned to the Map',
    description: 'Collect your first anomaly fragment.',
    hint: 'Tap a colored phrase while reading.',
    icon: '◆',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    points: 25,
    rarity: 'common',
  },
  FIRST_TRUTH: {
    id: 'FIRST_TRUTH',
    title: 'Truth Surfaced',
    description: 'Reveal your first Under-Map node.',
    hint: 'Connect two related fragments.',
    icon: '🗺️',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    points: 40,
    rarity: 'common',
  },
  CLEAN_DESCENT: {
    id: 'CLEAN_DESCENT',
    title: 'Clean Descent',
    description: 'Surface a truth without a wrong probe.',
    hint: 'Read the clues before pairing fragments.',
    icon: '🕯️',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    points: 40,
    rarity: 'common',
  },
  FLAWLESS_THREE: {
    id: 'FLAWLESS_THREE',
    title: 'Cartographer Nerves',
    description: 'Build a three-descent flawless streak.',
    hint: 'Keep reading the map true.',
    icon: '🧭',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    points: 75,
    rarity: 'uncommon',
  },
  FIRST_BELIEF: {
    id: 'FIRST_BELIEF',
    title: 'Belief Committed',
    description: 'Seal your first theory of the hidden world.',
    hint: 'Reach a chapter C beat.',
    icon: '🔮',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    points: 50,
    rarity: 'common',
  },
  READING_HELD: {
    id: 'READING_HELD',
    title: 'Read True',
    description: 'Have a sealed belief borne out by the story.',
    hint: 'Let the next chapter test your theory.',
    icon: '☀️',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    points: 75,
    rarity: 'uncommon',
  },
  READING_SUBVERTED: {
    id: 'READING_SUBVERTED',
    title: 'The Map Lied Back',
    description: 'Have a sealed belief subverted.',
    hint: 'A wrong reading still shapes Ashport.',
    icon: '🌘',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    points: 75,
    rarity: 'uncommon',
  },
  MOTIF_DEEPENED: {
    id: 'MOTIF_DEEPENED',
    title: 'It Came Back',
    description: 'Deepen a recurring motif.',
    hint: 'Notice an anomaly when it returns.',
    icon: '🌀',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    points: 75,
    rarity: 'uncommon',
  },
  KEYSTONE_FOUND: {
    id: 'KEYSTONE_FOUND',
    title: 'Keystone',
    description: 'Find a motif that spans chapters.',
    hint: 'Track a recurring fragment across days.',
    icon: '💠',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    points: 125,
    rarity: 'rare',
  },
  MAP_TAKING_SHAPE: {
    id: 'MAP_TAKING_SHAPE',
    title: 'The Map Takes Shape',
    description: 'Draw at least half of the known Under-Map relations.',
    hint: 'Return to unfinished connections.',
    icon: '🌌',
    category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
    points: 100,
    rarity: 'rare',
  },
  OTHER_READER_STIRS: {
    id: 'OTHER_READER_STIRS',
    title: 'Road Not Taken',
    description: 'Give The Other Reader a foothold.',
    hint: 'Rejected beliefs have consequences.',
    icon: '👁️',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    points: 100,
    rarity: 'rare',
    hidden: true,
  },
  OTHER_READER_MANIFEST: {
    id: 'OTHER_READER_MANIFEST',
    title: 'A Face in the Rain',
    description: 'Bring The Other Reader fully into Ashport.',
    hint: '???',
    icon: '🎭',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    points: 150,
    rarity: 'legendary',
    hidden: true,
  },
  CHAPTER_THREE: {
    id: 'CHAPTER_THREE',
    title: 'No Longer Coincidence',
    description: 'Reach Chapter 3 of the campaign.',
    hint: 'Keep following the letters.',
    icon: '📚',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    points: 60,
    rarity: 'common',
  },
  FIRST_ENDING: {
    id: 'FIRST_ENDING',
    title: 'A Worldview Sealed',
    description: 'Reach any ending.',
    hint: 'Finish the campaign.',
    icon: '🏁',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    points: 150,
    rarity: 'rare',
  },
  CLEAR_EYED: {
    id: 'CLEAR_EYED',
    title: 'Clear-Eyed',
    description: 'Reach The Map Made Whole.',
    hint: 'Read the hidden world true.',
    icon: '✨',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    points: 200,
    rarity: 'legendary',
  },
  HALF_BLIND: {
    id: 'HALF_BLIND',
    title: 'Half-Blind',
    description: 'Reach A Map Half-Drawn.',
    hint: 'Some truths hold; some bend.',
    icon: '◐',
    category: ACHIEVEMENT_CATEGORIES.STORY,
    points: 150,
    rarity: 'rare',
  },
  DECEIVED: {
    id: 'DECEIVED',
    title: 'The Shape You Wanted',
    description: 'Reach the deceived ending.',
    hint: 'Let the hidden world flatter you.',
    icon: '🕳️',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    points: 150,
    rarity: 'rare',
    hidden: true,
  },
  NIGHT_READER: {
    id: 'NIGHT_READER',
    title: 'Night Reader',
    description: 'Open the map between midnight and 4 AM.',
    hint: 'Ashport is louder after midnight.',
    icon: '🦉',
    category: ACHIEVEMENT_CATEGORIES.HIDDEN,
    points: 25,
    rarity: 'common',
    hidden: true,
  },
};

export const ACHIEVEMENTS_LIST = Object.values(ACHIEVEMENTS);
export const ACHIEVEMENT_COUNT = ACHIEVEMENTS_LIST.length;

export const ACHIEVEMENTS_BY_CATEGORY = {
  [ACHIEVEMENT_CATEGORIES.STORY]: ACHIEVEMENTS_LIST.filter((a) => a.category === ACHIEVEMENT_CATEGORIES.STORY),
  [ACHIEVEMENT_CATEGORIES.GAMEPLAY]: ACHIEVEMENTS_LIST.filter((a) => a.category === ACHIEVEMENT_CATEGORIES.GAMEPLAY),
  [ACHIEVEMENT_CATEGORIES.HIDDEN]: ACHIEVEMENTS_LIST.filter((a) => a.category === ACHIEVEMENT_CATEGORIES.HIDDEN),
};

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

export function getAchievementById(id) {
  return ACHIEVEMENTS[id] || null;
}

export function getTotalPossiblePoints() {
  return ACHIEVEMENTS_LIST.reduce((sum, a) => sum + a.points, 0);
}

export function calculateEarnedPoints(unlockedIds = []) {
  return unlockedIds.reduce((sum, id) => sum + (ACHIEVEMENTS[id]?.points || 0), 0);
}

export function getVisibleAchievements(unlockedIds = []) {
  return ACHIEVEMENTS_LIST.filter((a) => !a.hidden || unlockedIds.includes(a.id));
}

export function getAchievementProgress(unlockedIds = []) {
  return Math.round((unlockedIds.length / ACHIEVEMENT_COUNT) * 100);
}

export default ACHIEVEMENTS;
