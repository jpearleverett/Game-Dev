/**
 * Gallery metadata for the shipped clarity-spectrum endings.
 */

export const ENDINGS = {
  ending_clear: {
    id: 'ending_clear',
    title: 'The Map Made Whole',
    archetype: 'clarity',
    summary: 'Jack reads the Under-Map true and steps through with his eyes open.',
    fullDescription: 'Every sealed belief that mattered held. The motifs, places, people, and phenomena resolve into one hidden shape beneath Ashport.',
    hint: 'Seal beliefs the story bears out.',
    icon: '✨',
    pathKey: 'clarity-clear',
    superPath: 'Clear-Eyed',
    color: '#F1C572',
    silhouette: 'star',
  },
  ending_half: {
    id: 'ending_half',
    title: 'A Map Half-Drawn',
    archetype: 'clarity',
    summary: 'Jack sees enough to know the Under-Map is real, and enough to know what he missed.',
    fullDescription: 'Some readings held. Some bent. The ending preserves the tension between discovered truth and the dark still talking.',
    hint: 'Let some beliefs hold and some be subverted.',
    icon: '◐',
    pathKey: 'clarity-half',
    superPath: 'Half-Blind',
    color: '#7DD3FC',
    silhouette: 'moon',
  },
  ending_deceived: {
    id: 'ending_deceived',
    title: 'The Shape You Wanted',
    archetype: 'deceived',
    summary: 'The hidden world gives Jack the answer he reached for.',
    fullDescription: 'Misread beliefs become a trap. The Under-Map flatters Jack until he is standing exactly where it wanted him.',
    hint: 'Keep choosing readings the story subverts.',
    icon: '🕳️',
    pathKey: 'clarity-deceived',
    superPath: 'Deceived',
    color: '#D46A5D',
    silhouette: 'void',
  },
  ending_unproven: {
    id: 'ending_unproven',
    title: 'The Threshold',
    archetype: 'unproven',
    summary: 'The map stays blank where Jack never committed to a reading.',
    fullDescription: 'This fallback ending appears when too few beliefs resolve to judge the worldview.',
    hint: 'Reach the end before the map has enough resolved beliefs.',
    icon: '🚪',
    pathKey: 'clarity-unproven',
    superPath: 'Unproven',
    color: '#A78BFA',
    silhouette: 'door',
  },
};

export const ENDINGS_LIST = Object.values(ENDINGS);
export const ENDING_COUNT = ENDINGS_LIST.length;

export const ENDINGS_BY_ARCHETYPE = ENDINGS_LIST.reduce((acc, ending) => {
  if (!acc[ending.archetype]) acc[ending.archetype] = [];
  acc[ending.archetype].push(ending);
  return acc;
}, {});

export const ENDINGS_BY_SUPERPATH = ENDINGS_LIST.reduce((acc, ending) => {
  if (!acc[ending.superPath]) acc[ending.superPath] = [];
  acc[ending.superPath].push(ending);
  return acc;
}, {});

export function getEndingByPathKey(pathKey) {
  return ENDINGS_LIST.find((e) => e.pathKey === pathKey) || null;
}

export function getEndingById(id) {
  return ENDINGS[id] || null;
}

export function isEndingPath(pathKey) {
  return ENDINGS_LIST.some((e) => e.pathKey === pathKey);
}

export const SILHOUETTE_PATHS = {
  star: 'M12 4l-2 6h-6l5 4-2 6 5-4 5 4-2-6 5-4h-6z',
  moon: 'M18 16.5A7 7 0 017.5 6a8 8 0 1010.5 10.5z',
  void: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a5 5 0 110 10 5 5 0 010-10z',
  door: 'M6 2h12v20H6V2zm8 10a1 1 0 100-2 1 1 0 000 2z',
};

export default ENDINGS;
