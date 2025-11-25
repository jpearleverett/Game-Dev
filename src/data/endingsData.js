/**
 * Dead Letters: Endings Data
 * 
 * 16 unique endings based on the story branching paths
 * Each ending has a unique archetype, hints for discovery, and unlock conditions
 */

export const ENDINGS = {
  // Aggressive Path Endings (A-track)
  TYRANT: {
    id: 'TYRANT',
    title: 'The Tyrant',
    archetype: 'tyrant',
    summary: 'You became the shadow ruler. Ashport is safe, but at what cost to your soul?',
    fullDescription: 'Jack assumes full control of the Blackwell shadow government. He is never arrested or convicted, using his leverage to ensure honest politicians are elected and corruption is swiftly eliminated. He saves the city, but becomes the secret tyrant.',
    hint: 'Choose power at every turn. Embrace the shadow.',
    icon: '👑',
    pathKey: 'AACP',
    superPath: 'Aggressive',
    color: '#8B0000',
    silhouette: 'crown',
  },
  EXILE: {
    id: 'EXILE',
    title: 'The Exile',
    archetype: 'exile',
    summary: 'You escaped the city, but can never return. Freedom or prison?',
    fullDescription: 'Jack flees Ashport with the evidence, living in permanent exile. The city is left to fend for itself while he watches from afar, unable to return.',
    hint: 'When cornered, choose escape over confrontation.',
    icon: '🌅',
    pathKey: 'AAER',
    superPath: 'Aggressive',
    color: '#D2691E',
    silhouette: 'horizon',
  },
  REFORMER_A: {
    id: 'REFORMER_A',
    title: 'The Reformer',
    archetype: 'reformer',
    summary: 'You chose the system. Slow change, but lasting change.',
    fullDescription: 'Jack works within the system to create meaningful reform. The Conviction Integrity Project becomes a national model for justice reform.',
    hint: 'Trust the institutions, even when they fail you.',
    icon: '⚖️',
    pathKey: 'AACS',
    superPath: 'Aggressive',
    color: '#2E8B57',
    silhouette: 'scales',
  },
  OVERSEER_A: {
    id: 'OVERSEER_A',
    title: 'The Overseer',
    archetype: 'overseer',
    summary: 'Victoria\'s heir. The puppet master pulls new strings.',
    fullDescription: 'Jack inherits Victoria\'s network and becomes the new Overseer, continuing her legacy of shadow control over Ashport.',
    hint: 'Accept the crown when it is offered.',
    icon: '🎭',
    pathKey: 'APEF',
    superPath: 'Aggressive',
    color: '#4B0082',
    silhouette: 'mask',
  },
  
  // Aggressive Path Endings (A-track) continued
  WANDERING_GHOST: {
    id: 'WANDERING_GHOST',
    title: 'The Wandering Ghost',
    archetype: 'ghost',
    summary: 'Neither alive nor dead. You haunt the city\'s conscience.',
    fullDescription: 'Jack disappears completely, becoming an urban legend. Some say he still walks the streets, a ghost seeking redemption.',
    hint: 'Let go of everything. Become nothing.',
    icon: '👻',
    pathKey: 'APLR',
    superPath: 'Aggressive',
    color: '#708090',
    silhouette: 'specter',
  },
  REDEEMED: {
    id: 'REDEEMED',
    title: 'The Redeemed',
    archetype: 'redeemed',
    summary: 'You paid the price. The debt is settled.',
    fullDescription: 'Jack serves his time and emerges with his conscience clear. He dedicates his remaining years to helping others avoid his mistakes.',
    hint: 'Accept punishment. Find peace in atonement.',
    icon: '🕊️',
    pathKey: 'AAE',
    superPath: 'Aggressive',
    color: '#F0E68C',
    silhouette: 'dove',
  },
  MARTYR_A: {
    id: 'MARTYR_A',
    title: 'The Martyr',
    archetype: 'martyr',
    summary: 'You died for the truth. History will remember.',
    fullDescription: 'Jack sacrifices himself to expose the conspiracy, becoming a symbol of justice that inspires a new generation.',
    hint: 'Some truths are worth dying for.',
    icon: '✝️',
    pathKey: 'APE',
    superPath: 'Aggressive',
    color: '#FFD700',
    silhouette: 'flame',
  },
  HERMIT: {
    id: 'HERMIT',
    title: 'The Hermit',
    archetype: 'hermit',
    summary: 'You walked away from it all. Silence is its own wisdom.',
    fullDescription: 'Jack retreats from society entirely, living in isolation. The city continues without him, for better or worse.',
    hint: 'Sometimes the best move is no move at all.',
    icon: '🏔️',
    pathKey: 'MAF',
    superPath: 'Aggressive',
    color: '#A0522D',
    silhouette: 'mountain',
  },
  
  // Methodical Path Endings (M-track)
  REFORMER_M: {
    id: 'REFORMER_M',
    title: 'The Reformer',
    archetype: 'reformer',
    summary: 'Patient justice. The system bends to your will.',
    fullDescription: 'Through careful, methodical work, Jack transforms the justice system from within. Real change takes time.',
    hint: 'Patience and persistence overcome all obstacles.',
    icon: '⚖️',
    pathKey: 'MAER',
    superPath: 'Methodical',
    color: '#2E8B57',
    silhouette: 'scales',
  },
  OVERSEER_M: {
    id: 'OVERSEER_M',
    title: 'The Overseer',
    archetype: 'overseer',
    summary: 'Control from the shadows. Order through oversight.',
    fullDescription: 'Jack carefully builds his own network, becoming a benevolent Overseer who guides the city toward justice.',
    hint: 'Build power slowly. Use it wisely.',
    icon: '🎭',
    pathKey: 'MAES',
    superPath: 'Methodical',
    color: '#4B0082',
    silhouette: 'mask',
  },
  TYRANT_M: {
    id: 'TYRANT_M',
    title: 'The Tyrant',
    archetype: 'tyrant',
    summary: 'Methodical rule. Every piece in its place.',
    fullDescription: 'Jack\'s careful planning results in total control. The city runs like clockwork under his watchful eye.',
    hint: 'Plan every move. Leave nothing to chance.',
    icon: '👑',
    pathKey: 'MAFP',
    superPath: 'Methodical',
    color: '#8B0000',
    silhouette: 'crown',
  },
  EXILE_M: {
    id: 'EXILE_M',
    title: 'The Exile',
    archetype: 'exile',
    summary: 'A calculated departure. Strategic retreat.',
    fullDescription: 'Jack executes a carefully planned exit, leaving behind a network of allies to continue the work.',
    hint: 'Know when to leave. Plan your exit.',
    icon: '🌅',
    pathKey: 'MAFS',
    superPath: 'Methodical',
    color: '#D2691E',
    silhouette: 'horizon',
  },
  QUIET_MAN: {
    id: 'QUIET_MAN',
    title: 'The Quiet Man',
    archetype: 'quiet',
    summary: 'You speak softly. The city listens.',
    fullDescription: 'Jack becomes an advisor, working behind the scenes to guide policy and protect the innocent without fanfare.',
    hint: 'Influence without power. Guidance without glory.',
    icon: '🤫',
    pathKey: 'MPJD',
    superPath: 'Methodical',
    color: '#5F9EA0',
    silhouette: 'whisper',
  },
  ARCHITECT: {
    id: 'ARCHITECT',
    title: 'The Architect',
    archetype: 'architect',
    summary: 'You built something that will outlast you.',
    fullDescription: 'Jack creates lasting institutions that continue to fight corruption long after he\'s gone.',
    hint: 'Build for the future. Think in generations.',
    icon: '🏛️',
    pathKey: 'MPJR',
    superPath: 'Methodical',
    color: '#4682B4',
    silhouette: 'building',
  },
  ISOLATE: {
    id: 'ISOLATE',
    title: 'The Isolate',
    archetype: 'isolate',
    summary: 'Alone, but free. The price of independence.',
    fullDescription: 'Jack withdraws from all relationships, choosing solitude over compromise. He answers to no one.',
    hint: 'Cut all ties. Trust no one.',
    icon: '🏝️',
    pathKey: 'MPLF',
    superPath: 'Methodical',
    color: '#6B8E23',
    silhouette: 'island',
  },
  MARTYR_M: {
    id: 'MARTYR_M',
    title: 'The Martyr',
    archetype: 'martyr',
    summary: 'A calculated sacrifice. Maximum impact.',
    fullDescription: 'Jack\'s carefully planned sacrifice creates the maximum possible change, his death a catalyst for revolution.',
    hint: 'Make your death count for something.',
    icon: '✝️',
    pathKey: 'MPLJ',
    superPath: 'Methodical',
    color: '#FFD700',
    silhouette: 'flame',
  },
};

// Array format for easy iteration
export const ENDINGS_LIST = Object.values(ENDINGS);

// Unique endings (some share archetypes but are distinct endings)
export const ENDING_COUNT = ENDINGS_LIST.length;

// Group endings by archetype for display
export const ENDINGS_BY_ARCHETYPE = ENDINGS_LIST.reduce((acc, ending) => {
  if (!acc[ending.archetype]) {
    acc[ending.archetype] = [];
  }
  acc[ending.archetype].push(ending);
  return acc;
}, {});

// Group endings by super-path
export const ENDINGS_BY_SUPERPATH = {
  Aggressive: ENDINGS_LIST.filter(e => e.superPath === 'Aggressive'),
  Methodical: ENDINGS_LIST.filter(e => e.superPath === 'Methodical'),
};

/**
 * Get ending by path key from story campaign completion
 */
export function getEndingByPathKey(pathKey) {
  return ENDINGS_LIST.find(e => e.pathKey === pathKey) || null;
}

/**
 * Get ending by ID
 */
export function getEndingById(id) {
  return ENDINGS[id] || null;
}

/**
 * Check if a path key represents a valid ending
 */
export function isEndingPath(pathKey) {
  return ENDINGS_LIST.some(e => e.pathKey === pathKey);
}

/**
 * Silhouette SVG paths for locked endings
 */
export const SILHOUETTE_PATHS = {
  crown: 'M12 4l-2 6h-6l5 4-2 6 5-4 5 4-2-6 5-4h-6z',
  horizon: 'M2 16h20v2H2v-2zm0-2l4-4 4 4 4-4 4 4 4-4v6H2v-6z',
  scales: 'M12 2L8 6h8l-4-4zm-7 8l3-3v12l-3-3v-6zm14 0l-3-3v12l3-3v-6zm-7 2a2 2 0 100-4 2 2 0 000 4z',
  mask: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  specter: 'M12 2c-4 0-8 3-8 8v10c0 1 1 2 2 2h2c0-1 1-2 2-2s2 1 2 2 1 2 2 2 2-1 2-2 1-2 2-2 2 1 2 2h2c1 0 2-1 2-2V10c0-5-4-8-8-8z',
  dove: 'M12 3c-2 0-4 1-5 3H4c-1 0-2 1-2 2v4l3 3v4c0 1 1 2 2 2h6v-2h2v2h2c1 0 2-1 2-2v-4l3-3V8c0-1-1-2-2-2h-3c-1-2-3-3-5-3z',
  flame: 'M12 2c-1 3-4 5-4 9 0 3 2 5 4 5s4-2 4-5c0-4-3-6-4-9z',
  mountain: 'M12 4L2 20h20L12 4zm0 4l6 10H6l6-10z',
  whisper: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2v-2zm0-10h2v8h-2V6z',
  building: 'M4 2v20h16V2H4zm14 18H6V4h12v16zM8 6h2v2H8V6zm4 0h2v2h-2V6zm4 0h2v2h-2V6z',
  island: 'M12 2C6.48 2 2 6.48 2 12c0 2.5.9 4.8 2.4 6.5L12 12l7.6 6.5c1.5-1.7 2.4-4 2.4-6.5 0-5.52-4.48-10-10-10z',
};

export default ENDINGS;
