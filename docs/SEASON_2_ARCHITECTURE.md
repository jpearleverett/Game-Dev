# Season 2 — Architecture Sketch

The engine is content-agnostic: a season is (1) a story bible, (2) a 12-chapter
arc with beats, (3) a static chapter-1A seed (`storyNarrative.json` register),
(4) `SEASON_ONE_CASES`-style metadata. Everything else — fragments, relations,
beliefs, the foil, clarity, endings — is generated/derived at play time.

## What carries over (already shipped)

- **NG+ memory:** `seedNewGamePlus` carries the foil (named, presence 1,
  `fromChapter: null` = "prior-season reader") into a fresh campaign. The same
  mechanism is the bridge INTO season 2: a season-2 campaign seeded from the
  player's season-1 ending is one function call.
- **Ending → premise:** `endings.closingReport` + `storyCampaign.endingId` give
  season 2's generation context a one-paragraph "previously" that is the
  player's own story.

## What a season 2 needs (work list)

1. **New story bible** (`storyBible.js` second registry, keyed by season):
   protagonist state post-S1, new antagonist/foil dynamics, new district of
   Ashport or a second city on the Under-Map.
2. **Season key in the campaign shape** (`storyCampaign.season`, default 1) +
   season-aware `SEASON_ONE_CASES` lookup. The advance math (`storyAdvance`),
   Under-Map, and puzzle routing need zero changes.
3. **Authored 1A seed** for season 2 (same 13-node tree format).
4. **Arc quake** authored at S2-ch7 (the prompt hook already keys on
   `currentChapter === 7` and the oldest motif — it generalizes).
5. **Content pruning**: season 1 generated entries can be archived once season 2
   starts (storage already prunes; add a season boundary rule).

## Premise candidates (pick at writing time)

- **The Tide Ledger:** season 1's Under-Map was ONE reading. Season 2 opens with
  the map redrawing itself — the foil's worldview made manifest in the city.
  (Strongest if the player ended `deceived`.)
- **The Second Reader:** Jack trains someone; the player reads through two sets
  of eyes; beliefs can now CONFLICT between them.
- **The Unsent:** the dead letters were replies. Season 2 maps who was writing
  back.
