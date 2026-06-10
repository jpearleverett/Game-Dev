/**
 * FIELD NOTES — the just-in-time teaching layer.
 *
 * The game's systems (whispers, sense tiers, latent threads, evidence echoes,
 * the Other Reader, incursions) are introduced by a one-time diegetic card at
 * the moment of FIRST CONTACT — not front-loaded in a tutorial the player can't
 * retain. Each note is written in the game's register (a note Jack might pin in
 * his field book), shown once (persisted in progress.seenLessons), and always
 * re-readable in the Codex's Field Notes glossary.
 *
 * Pure data. Keys are stable identifiers — never rename one casually (saves
 * persist them).
 */

export const FIELD_NOTES = {
  whisper: {
    key: 'whisper',
    icon: 'waveform',
    title: 'The Dark Answers Back',
    body:
      'A probe that finds nothing still buys you something. The whisper tells you which fragment still hums with an unfound thread — and which has given all it has. Spend your misses like coins; every one narrows the field.',
  },
  sense: {
    key: 'sense',
    icon: 'radar',
    title: 'Your Sense Sharpens',
    body:
      'Every truth you draw teaches Jack to read the dark. ATTUNED: hold a fragment and its hidden partners glimmer. Map deeper and the board begins to forgive — misses on familiar things stop costing you.',
  },
  latent: {
    key: 'latent',
    icon: 'arrow-down-right',
    title: 'Threads That Dive Deeper',
    body:
      'Some threads trail off the edge of what you hold — their other end hasn’t surfaced yet. Keep reading. When the missing piece appears in a scene, collect it, and the thread will connect itself.',
  },
  echoes: {
    key: 'echoes',
    icon: 'scale-balance',
    title: 'Weigh the Evidence',
    body:
      '◆ marks a claim your own surfaced truths vouch for. ◇ marks one you never mapped. The city tends to honor readings you can back — choose against your own evidence and expect to be proven wrong.',
  },
  otherReader: {
    key: 'otherReader',
    icon: 'account-question-outline',
    title: 'The Other Reader',
    body:
      'Every reading you turn away finds a believer. From the same signs you read, they concluded the opposite — and each time the city proves you wrong, their version gains ground. Read true and they fade to rumor. Read wrong, and one day they will have a face, a name, and your map.',
  },
  incursion: {
    key: 'incursion',
    icon: 'fountain-pen-tip',
    title: 'Their Ink on Your Map',
    body:
      'The Other Reader got here first. One connection stands drawn in their ink, holding THEIR reading of it. Probe the pair and choose the true reading to reclaim the thread — the map remembers whose hand drew what.',
  },
  dailyThread: {
    key: 'dailyThread',
    icon: 'calendar-star',
    title: 'The Map Remembers',
    body:
      'Once a day, something you collected drifts back to the surface. Settle it and the map banks you a probe for your next descent. The Under-Map favors the ones who keep coming back.',
  },
};

/** Ordered list for the Codex glossary. */
export const FIELD_NOTE_LIST = [
  FIELD_NOTES.whisper,
  FIELD_NOTES.sense,
  FIELD_NOTES.latent,
  FIELD_NOTES.echoes,
  FIELD_NOTES.otherReader,
  FIELD_NOTES.incursion,
  FIELD_NOTES.dailyThread,
];
