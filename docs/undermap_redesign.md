# Dead Letters — Under-Map Puzzle↔Story Redesign

**Status:** Implemented (Moves 1–5, 8) + on-device playtest fixes. See §13.
**Author:** design pass, 2026-06.

> **§13 — Playtest fixes (on-device round 1).** Three issues surfaced playing on device:
> 1. **"Most subchapters had nothing to connect."** Root causes: completion backfill only
>    re-collected the *opening's* fragments; `addRelations` matched labels exactly (the model's
>    wording drift dropped relations); `fragments`/`relations` weren't required. Fixes: backfill
>    **all** scene fragments at the gate; **fuzzy label resolution** (exact→slug→contains) in
>    `addRelations`; `fragments`/`relations` made **required** + prompt demands ≥2 intra-scene
>    pairs; and a **deterministic safety net** in `validation._ensureConnectableRelations` that
>    synthesizes kind-bond relations (with templated decoys) when the model under-delivers — so a
>    CONNECT beat is **never empty**. (C/THEORY beats are skipped.)
> 2. **"The fragment list grows forever."** The CONNECT screen now partitions into **"Threads you
>    can still link"** (fragments in an unfound relation) up front, with the rest collapsed into a
>    **"Show the rest of the map"** archive.
> 3. **"The map shifts every time / isn't obviously a map."** Each fragment now gets a **persistent
>    normalized position** at creation (`makeFragment.pos`, deterministic, chapter-ringed); the
>    constellation honors it (no reflow) and draws faint **chapter territory rings**. The
>    force-directed mode is retained in the layout util but no longer used by the screen.
**Scope:** the story-campaign loop only — READ → EXAMINE → **CONNECT** → **THEORY**. The
daily word puzzle (`EvidenceBoardScreen`) is out of scope except where noted as a future
on-ramp.
**Decided constraints (locked):**
- Puzzle stakes = **tense but forgiving** (see §3.1). Limited probes + streak + choose-the-truth,
  but running out of probes **never hard-blocks** progress. Unfound links stay *sensed* for later.
- **Endings** = a **3-variant clarity spectrum** (Clear-Eyed / Half-Blind / Deceived), with
  final-act belief *flavor* steering which variant lands (see §5).
- **Keystone** = a fragment with `seen ≥ 3` **that spans ≥2 chapters** (see §6).
- **Full scope is committed:** the daily on-ramp (§8.1) and the constellation Under-Map (§7) are
  in-scope deliverables, not "future" — see the roadmap in §9.

---

## 0. TL;DR

The bones are right (clean immutable `underMap.js`, tactile inline EXAMINE, a generation loop
that already ingests the map). The problems are:

1. **CONNECT is a brute-force search, not a deduction.** Wrong pairs cost nothing; the 2-slot
   bench can be mashed through every pair in seconds.
2. **The puzzle is an optional gate**, skippable with *"press on into the dark,"* with no felt
   consequence.
3. **The story↔puzzle causality is invisible** — the map steers generation softly, but the
   player never *sees* "because I mapped X, Y happened."
4. **No stakes, no failure, no mastery curve.** Even the THEORY climax has `correct: null` —
   the player never learns if they were *right* about reality.
5. **Fragment kinds are decorative**, giving the player no grip to reason with.
6. **The "Under-Map" is a list, not a map** — the core fantasy ("watch reality draw itself") is
   told via a % bar, not shown.

The redesign is one reframe and five moves:

> **The Under-Map is the game's deduction engine and its collection artifact: connecting is
> reasoning made visible, and every connection visibly rewrites what Jack sees next.**

- **Move 1 — Deduction with stakes** (P0): probes + streak + choose-the-truth + kind-bonds.
- **Move 2 — The ECHO** (P0): the next scene opens with a visible callback to what you mapped.
- **Move 3 — Belief truth + Clarity** (P1): beliefs become right/wrong, accruing toward a true ending.
- **Move 5 — Keystones** (P1): motifs that recur become arc-level truths.
- **Move 4 — Constellation Under-Map** (P2): the list becomes a growing star-map artifact.

P0/P1 ride on a few cheap schema fields the model fills alongside what it already outputs, so
generation latency barely moves.

---

## 1. Current state (verified against code)

### 1.1 The loop as built
- `getPuzzleMode` (`src/utils/puzzleMode.js`): story **A/B → CONNECT → `UnderMap`**, story **C →
  THEORY → `Theory`**, non-story → EVIDENCE.
- **EXAMINE:** `CaseFileScreen` turns `storyMeta.fragments` (those with a verbatim `phrase`) into
  `examinableDetails`, merges them into every reader segment's `details`;
  `BranchingNarrativeReader` highlights kind-colored phrases and, on tap, calls
  `onExamineFragment` → `ingestSceneFragments`. On completion it backfills the opening's
  fragments so the next beat always has material.
- **CONNECT (`UnderMapScreen`):** a 2-slot bench. `connectFragments(map, a, b)` checks for an
  authored relation under the undirected key; match → reveals a `node` (the relation's
  `revelation`); miss → `{ valid:false }`, feedback *"No link here…"*, **no cost**. Footer:
  *"Draw a connection… — or press on into the dark."* "Continue the descent" generates + advances.
- **THEORY (`TheoryScreen`):** pick a belief (the chapter decision framed as competing
  interpretations), stake fragments, seal → records a theory (`correct` left `null`) and the
  pre-decision that branches the next chapter → "Cross the threshold."

### 1.2 The data model (`src/data/underMap.js`)
- `fragment { id, label, kind, detail, phrase, anomalous, seen, firstCaseNumber, lastCaseNumber, … }`,
  `kind ∈ {symbol, place, person, phenomenon}`.
- `relation { id, a, b, revelation }` — authored by the model **by label**, resolved to ids.
- `connection` (player-made correct link), `node` (revealed truth), `theory` (sealed C belief).
- Helpers: `addFragments` (dedup by id; re-collect **deepens** a motif via `seen++`),
  `addRelations` (label→id resolution, re-resolved as fragments arrive), `connectFragments`,
  `recordTheory`. Selectors: `isMotif`, `motifCount`, `mapDepth`, `undiscoveredRelationCount`.

### 1.3 Generation steering (`promptAssembly.js` `_buildPlayerTheorySection`)
Injects `<under_map_state>` into the narrative + pathDecisions prompts: collected fragments (by
kind), revealed nodes, sealed theory, and a WEAVING instruction (author ≥1 relation linking a NEW
fragment to one the player ALREADY HOLDS; re-surface motifs by exact label). The schema
(`schemas.js`) asks for `fragments[]` and `relations[] {aLabel,bLabel,revelation}`.

### 1.4 Why it isn't addictive yet
See §0 items 1–6. The crux: the *mechanic* (search) contradicts the *fantasy* (deduction), the
*loop* is open (causality unfelt), and the *mystery* has no truth value.

---

## 2. The reframe

> **The Under-Map is the deduction engine and the collection artifact.**

Three felt promises that must become true:
1. **Connecting is reasoning** — you think *before* you tap, and you decide *what a link means*.
2. **The loop is visible** — you watch your connections rewrite the next scene.
3. **The mystery has a truth** — you eventually learn whether you saw clearly or were deceived,
   and that determines the ending you reach.

---

## 3. Move 1 — CONNECT becomes a deduction (P0)

Three mechanics that compound. All tuned to **tense but forgiving**.

### 3.1 Probes + streak (tension without a wall)

- Each descent grants a **probe budget**: `budget = 3 + floor(connectableFragments / 3)`, where
  `connectableFragments` counts fragments that participate in at least one *unfound* relation
  (so the budget scales with how much there is to find, never with noise).
- A **wrong probe** (a pair that shares no relation) costs **one probe** and bites thematically:
  the map recoils (existing `doShake`), lights dim briefly, low/rigid haptic, copy like
  *"The dark doesn't answer. (2 probes left.)"*
- A **correct pair** costs **nothing** — finding a true link is never punished; only blind
  guessing is.
- **Forgiving rule (locked):** running out of probes **does not block** "Continue the descent."
  Remaining unfound relations simply stay **`sensed`** — surfaced faintly on the map and
  re-attemptable on any later visit (the Under-Map is re-openable from the Desk). You never
  strand the player behind LLM-authored relations that may be uneven.
- **Streak:** track `flawlessDescents` (descents where every probe landed). Surface it in the
  header and on the constellation later. Breaking it is a soft sting, not a penalty.

> A subtle "sense" assist keeps it fair: after a wrong probe (or ~8s idle with probes left), two
> fragments that *do* share an unfound relation pulse faintly. Preserves flow; rewards attention.

### 3.2 Choose-the-truth (the actual "aha")

When a probed pair **does** share a relation, **don't auto-reveal**. Present **3 candidate
readings** — the true `revelation` + 2 plausible decoys — and ask *"What does this connection
mean?"*

- **Correct read:** full reveal (existing `revealCard` animation), node added, streak preserved,
  success haptic + `playVictory`.
- **Wrong read:** the node reveals **blurred/uncertain** ("The link holds, but its meaning won't
  settle — read the scene again") — it still counts as a *connection* (so progress isn't lost)
  but the node is marked `unresolvedReading` and yields a weaker/no ECHO until reread. This nudges
  rereading without punishing. (Forgiving: no probe cost for a wrong *reading* — the probe paid
  for finding the pair; the reading is the bonus layer.)

**Generation cost:** the model already emits `revelation`. Add `falseReadings: [string, string]`
per relation — two *incorrect but tempting* one-sentence readings of the same pair. Near-zero
marginal tokens.

### 3.3 Kinds become bonds (deductive grip)

Today kinds only color icons. Give the player *soft, learnable* rules so they can suspect a pair
before probing — which is what makes limited probes fair:

- `symbol ↔ place` — *a mark is carved into somewhere.*
- `phenomenon ↔ person` — *the wrongness clings to someone.*
- `place ↔ person` — *somewhere remembers someone.*
- `symbol ↔ phenomenon` — *the mark is what makes the wrongness happen.*
- Same-kind and `person ↔ person` bonds are **rare** (flag as "an unusual pairing" when probed).

These are **hints, not hard gates** (generative relations won't always obey). On the bench, when
both slots are filled, show a one-line read of the bond: *"A symbol and a place — these often
bond."* vs *"A person and a person rarely touch directly."* This gives the player a *reason* to
probe, turning the budget into a thinking budget.

> Prompt nudge: in `_buildPlayerTheorySection`'s WEAVING block and the schema description for
> `relations`, encourage authoring relations that follow the bond grammar where natural, so the
> hints correlate with truth often enough to be trustworthy.

### 3.4 Data-model changes (`underMap.js`)
- `connectFragments` returns, on a found relation:
  `{ map, found: { relation }, readings: [trueRevelation, ...falseReadings] (shuffled), valid:true }`
  **without** committing the node yet. Add a second step `resolveReading(map, relationId, chosenRevelation)`
  that commits the node (`unresolvedReading` flag if `chosenRevelation !== relation.revelation`).
- Probe/streak state lives on the map: `underMap.session = { probesUsed, flawlessDescents }` or,
  cleaner, keep per-descent probe state in screen state and persist only `flawlessDescents` +
  `sensedRelationIds` on the map. (Prefer: ephemeral probe count in `UnderMapScreen`, durable
  `flawlessDescents` + `node.unresolvedReading` + `relation` "sensed" derivable from
  `undiscoveredRelationCount`.)
- New selectors: `connectableFragmentCount(map)`, `sensedRelations(map)`,
  `probeBudgetFor(map)`.
- Keep everything **pure + immutable**; extend `underMap.test.js` for: budget math, wrong-read
  blurred node, forgiving no-block, streak increment/reset.

### 3.5 UI changes (`UnderMapScreen.js`)
- Probe meter in header (e.g. `◆◆◆◇` + "3 probes"). Streak chip.
- After a found pair: the **3-way reading chooser** (replaces instant reveal). Decoys shuffled.
- Bond-hint line on the bench when both slots filled.
- "Continue the descent" copy adapts: *"X mapped, Y still sensed — descend, or keep reading the
  dark."* Never disabled by probe exhaustion.

### 3.6 Schema/prompt (`schemas.js`, `promptAssembly.js`)
- `relations.items.properties.falseReadings`: `{ type:'array', items:{type:'string'}, minItems:2,
  maxItems:2, description:'Two tempting but FALSE one-sentence readings of this same pair…' }`.
- Encourage bond-grammar relations in the `relations` description + WEAVING block.

### 3.7 Acceptance criteria
- A player cannot reveal all nodes by blind mashing within a budget; doing so requires reasoning
  or spending the (limited) budget and accepting some nodes stay sensed.
- Running out of probes still advances the story (forgiving rule holds).
- Choosing the wrong reading produces a blurred node, not a dead end.
- `npx jest` green; Babel parse-check on each edited RN file.

---

## 4. Move 2 — The ECHO: make the loop loud (P0)

The map already steers generation; make the payoff **visible**.

- Generation returns, for the scene opening, `echoes: [{ nodeId, line }]` — a short in-fiction
  callback tying a *specific revealed node* to *this* scene ("The silver ink you puzzled out —
  it's here again, bleeding through the ledger.").
- `CaseFileScreen` / `BranchingNarrativeReader` render an **"↳ This follows from what you mapped"**
  banner above/within the opening, linking back to the node.
- **Inverse (loss aversion):** if the player left a relation **sensed/unfound** last beat, the
  model may surface `unmappedCost: { fragmentLabel, line }` — *"You never worked out the silver
  ink; it costs Jack here."* Drives completionism next descent.

### 4.1 Plumbing
- `schemas.js`: add `echoes` (and optional `unmappedCost`) to the subchapter schema.
- `generation.js`: **carry `echoes` through the field whitelist** when assembling `storyEntry`
  (CLAUDE.md invariant #3 — the entry is built from a whitelist; new fields must be added or they
  vanish). Same care as `fragments`/`relations`.
- `promptAssembly.js`: in `<under_map_state>`, pass revealed `node.id`s + which relations remain
  *sensed*, and instruct: "If you reference a prior discovery, emit an `echoes` entry naming the
  nodeId and the exact line that pays it off."
- `useStoryGeneration.js` already threads `underMap`; ensure node ids + sensed set are available
  to the prompt builder (extend `currentUnderMap` payload if needed).

### 4.2 Acceptance criteria
- When the player revealed ≥1 node in the prior beat, the next opening shows an ECHO referencing a
  real node id at least most of the time (LLM-soft; validate on device).
- ECHO degrades gracefully to nothing if the model omits it (never a blank banner).

---

## 5. Move 3 — Beliefs get a truth; Clarity drives the ending (P1)

`theory.correct` already exists (currently `null`). Light it up.

- At **chapter start**, the model authors a hidden `chapterTruth` (the actual reading of the hidden
  world this chapter). Stored server-/entry-side, **not shown** to the player.
- The belief sealed in THEORY is later **confirmed or subverted** in-narrative; set
  `theory.correct` when the resolving beat generates. Wrong beliefs are **not a fail-state** — the
  story refracts through the misreading (still good fiction).
- Accrue into a **Clarity / Worldview meter**: `clarity = correctBeliefs / sealedBeliefs` (plus
  a small bonus for resolved-reading nodes — see §3.2). Surface it as *"how truly you see the
  Under-Map."*

**Decided — the ending is a 3-variant clarity spectrum:**

| Variant | Clarity gate | Feel |
|---------|--------------|------|
| **Clear-Eyed** | `clarity ≥ 0.66` | You saw the Under-Map for what it is. The "true" ending. |
| **Half-Blind** | `0.33 ≤ clarity < 0.66` | You grasped part of it; the rest stays warped. Bittersweet. |
| **Deceived** | `clarity < 0.33` | The hidden world wore the shape you wanted. You were led. |

- The clarity gate picks the **variant**; the **flavor** of the player's final-act sealed
  belief(s) steers the *specific* terminal scene within that variant (so two Clear-Eyed players
  who believed different things get differently-colored true endings). This keeps it a bounded,
  authorable set (3 variants × belief-flavor) rather than an unmanageable combinatorial tree.
- Wrong beliefs are **never a fail-state** — they route you down the spectrum, not into a
  game-over. This is the retention spine: *"keep playing to learn if you were right, and to earn
  the Clear-Eyed ending."*
- **Tuning note:** thresholds are constants (`CLARITY_TRUE = 0.66`, `CLARITY_PARTIAL = 0.33`),
  trivially re-balanced once season length / belief count settles.

### 5.1 Plumbing — IMPLEMENTATION NOTE
Rather than store a hidden `chapterTruth` string and fuzzy-match the sealed belief against it
(brittle), resolution is reported by the model **as it writes the next chapter**: a
`beliefResolution { resolvesChapter, correct, line }` field. This is more robust (no string
matching) and more narratively coherent (the story itself decides whether the player's reading
held), and the prompt explicitly invites SUBVERSION so it isn't self-graded into always-correct.

- `schemas.js`/`promptAssembly.js`: `beliefResolution` field + a prompt instruction tied to the
  sealed belief's actual chapter number. ✅ **DONE**
- `validation.js`: `_normalizeBeliefResolution` (drops malformed signals to null). ✅ **DONE**
- `generation.js`: `beliefResolution` carried through the entry whitelist. ✅ **DONE**
- `underMap.js`: `resolveTheory(map, chapter, correct)` + `clarity(map)` + `endingVariant(map)` +
  `CLARITY_TRUE/CLARITY_PARTIAL`. Pure + tested. ✅ **DONE**
- `GameContext.js`: `resolveUnderMapBelief({chapter,correct})` (functional, idempotent — guards on
  an existing unresolved theory since `normalizeUnderMap` always clones). ✅ **DONE**
- `CaseFileScreen.js`: applies `storyMeta.beliefResolution` on scene load (ref-guarded once per
  case; the action is idempotent too). ✅ **DONE**
- `TheoryScreen.js`: prior-belief payoff card ("YOUR LAST READING HELD TRUE / WAS SUBVERTED") +
  a Clarity readout. Seal flow untouched (CLAUDE.md §5 invariants respected). ✅ **DONE**
- **Endgame branch — DONE:** `src/data/endings.js` (`selectEnding` — pure + tested: maps the
  clarity spectrum → Clear-Eyed / Half-Blind / Deceived / Unproven, flavored by the last sealed
  belief); `EndingScreen.js` (registered as the `Ending` route); `TheoryScreen.crossThreshold`
  detects the finale (`chapter >= TOTAL_CHAPTERS`), calls `unlockEnding`, and routes to the ending
  instead of generating a nonexistent chapter 13. ✅

### 5.2 Acceptance criteria
- A sealed belief eventually flips `correct` to true/false based on `chapterTruth`.
- Clarity is derivable, monotonic-ish, and visible.
- Endings differ by clarity (at minimum two terminal variants wired).

---

## 6. Move 5 — Keystones: cross-chapter mastery (P1)

- **Decided — Keystone = `seen ≥ 3` AND the fragment spans ≥2 chapters** (i.e.
  `parseCaseNumber(firstCaseNumber).chapter !== parseCaseNumber(lastCaseNumber).chapter`).
  `isMotif` stays at `seen > 1`; `isKeystone` adds the cross-chapter span requirement so a
  fragment re-tapped three times *within one chapter* doesn't cheaply qualify — keystones must
  genuinely recur **across** chapters, which is the cross-chapter mastery this mechanic exists to
  reward. Thresholds are constants (`KEYSTONE_SEEN = 3`, `KEYSTONE_MIN_CHAPTER_SPAN = 2`),
  re-tunable as season length settles.
- Connecting a keystone pulls from an **arc-relation pool** (relations the model tags
  `scope:'arc'`) and reveals an **arc-level truth** — bigger than a chapter node, rarer, with a
  distinct "deep reveal" animation. Variable-ratio reward.
- Rewards the exact skill the game is about (noticing a thread *across* chapters) and gives
  veterans a ceiling newcomers can't reach.

### 6.1 Plumbing
- `schemas.js`: optional `scope: 'chapter' | 'arc'` on relations.
- `underMap.js`: `isKeystone`, arc-node handling in `connectFragments`/`resolveReading`.
- Small UI in `UnderMapScreen` (keystone badge upgrade from the motif `×n` chip).

---

## 7. Move 4 — The constellation Under-Map (P2, committed)

Replace the vertical card list with a **dark star-map**:
- Fragments = nodes, connections = glowing lines, revealed nodes light **regions** (one per
  chapter), depth-% becomes a *visibly filling* map of reality.
- **Phase 1 — DONE:** radial/cluster layout grouped by chapter region (cheap, deterministic, tested).
- **Phase 2 — DONE:** deterministic force-directed refinement (`forceRefine` in `underMapLayout.js`)
  seeded from the cluster layout — repulsion + spring + centering with cooling, no randomness and no
  `reanimated` dependency, so it stays pure + unit-tested. Skipped above `FORCE_MAX_NODES` (60) and
  for <3 nodes (falls back to cluster). The component renders `mode: 'force'`.
- Persistent across the whole campaign. Because branching + each player's specific connections
  differ, **no two maps look alike** — the unique, screenshot-shareable artifact.

> Keep the existing list available as an accessible/reduced-motion fallback.

---

## 8. Retention / meta layer (layered on, cheap)

- **Curiosity-gap close:** each ECHO ends on *"one thread still unmapped."* Open loop → return.
- **Streaks on the map:** `flawlessDescents` + days-played, shown on the constellation.
- **Variable reward:** keystone/arc-truths are rarer + bigger (most addictive schedule).
- **Chapter 1 is static (`storyNarrative.json`) → the tutorial.** 1A/1B teach probes +
  choose-the-truth + bonds before generative chapters begin. Author 1A/1B `falseReadings` + bond-
  obeying relations by hand for a clean first impression.

### 8.1 Daily on-ramp (P2, committed)

Turn the dormant `EvidenceBoard` daily from a sidecar into a habit loop that *feeds the campaign
map*:

- **The overnight stir.** Once per day, "the Under-Map stirs": a single **drifting fragment**
  appears as a sense-able point on the constellation, plus a local notification — *"The Under-Map
  shifted overnight. One thread is sense-able."* This is the daily hook (no server needed; gated
  on `lastVisitedAt` / a `lastDailyStirAt` timestamp on the map).
- **What the daily gives.** Completing the daily word puzzle (`EvidenceBoard`, untouched
  mechanically) **resolves that day's drifting fragment** — pinning it permanently to the map and,
  if it completes a sense-able relation, granting a **free probe-less reveal** (a "the map gave you
  one" gift). This makes the daily *matter to the campaign* without coupling their mechanics.
- **Streak.** A **days-mapped streak** (consecutive days the player resolved the stir), surfaced on
  the constellation next to `flawlessDescents`. Missing a day softly resets it; a small "the map
  forgot a little" dimming, never a hard penalty (consistent with tense-but-forgiving).
- **Cold-content safety.** The drifting fragment is drawn from already-collected motifs (re-surface
  to deepen) or from a small curated daily pool, so the daily never depends on un-generated
  campaign content and works even if the player is between chapters.
- **Plumbing:** `underMap.js` (`drawDailyStir`/`resolveDailyStir` + `dailyStreak`/`dailyStir`
  selectors — pure + tested); a notification scheduler (Expo notifications) gated by settings; a
  thin bridge from `EvidenceBoardScreen` completion → `resolveDailyStir`; constellation surfacing
  of the drifting node + streak. **No change to the daily puzzle's own rules.**

**STATUS:**
- `underMap.js` model (`drawDailyStir`, `resolveDailyStir`, `dailyStreak`/`dailyStir`/
  `dailyStirFragment`, streak-with-missed-day-reset) — pure + tested. ✅ **DONE**
- `GameContext`: `drawUnderMapDailyStir` / `resolveUnderMapDailyStir` (functional, churn-guarded). ✅ **DONE**
- `UnderMapScreen`: draws the stir on open and shows a "THE UNDER-MAP STIRRED OVERNIGHT" banner;
  tapping "trace it" advances the days-mapped streak and loads the fragment onto the bench. ✅ **DONE**
- **Overnight push notification — DONE:** `expo-notifications ~0.32.17` added; `src/services/
  dailyStirNotifications.js` schedules a daily local reminder (defensive — silent no-op on web /
  denied permission / unavailable module). Scheduled from the Under-Map mount once the player has
  fragments, opt-out via `settings.dailyStirRemindersDisabled`. (Notification *firing* still needs
  on-device confirmation.) ✅
- **Daily word-puzzle bridge — DONE:** the non-story (daily) SOLVED path in `submitGuess` now
  resolves the day's stir via a **functional, underMap-only** `updateProgress` — clobber-safe and
  respecting the "don't write storyCampaign from non-story solves" guard. ✅

---

## 9. Roadmap

| Pri | Move | Why | Effort |
|-----|------|-----|--------|
| **P0** | 1 — deduction (probes/streak/choose-the-truth/bonds) | Converts non-puzzle → real deduction. Highest leverage. | M |
| **P0** | 2 — the ECHO | Makes story↔puzzle causality *felt*. | S–M |
| **P1** | 3 — belief truth + Clarity → true ending | Long-game retention spine; reuses `correct`. | M |
| **P1** | 5 — keystones / arc-truths | Cross-chapter mastery + variable reward. | S |
| **P2** | 4 — constellation map | Unique, shareable collection artifact. | L |
| **P2** | 8 — daily on-ramp + streak surfacing | Habit formation. | S–M |

Suggested build order: **1 → 2 → (tune on device) → 3 → 5 → 4 → 8.**

---

## 10. Risks & invariants to respect

- **CLAUDE.md §5 invariants are load-bearing.** Campaign advances must stay functional
  `updateProgress(prev => …)`; advance is forward-only and derived from the completed case; the
  generated `storyEntry` is built from a **field whitelist** (any new field — `echoes`,
  `falseReadings`, `chapterTruth`, `scope` — must be added there or it's dropped); EXAMINE phrases
  must stay short, verbatim substrings.
- **Generative unevenness** is the main design risk for Move 1. Mitigations: forgiving no-block,
  the "sense" assist, bond-hints that correlate with truth, and `validation.js`-side derivation as
  a fallback (it already derives fragments from prose `details`). Consider a light validator that
  drops malformed `falseReadings`/`echoes` rather than surfacing them raw.
- **Latency:** new fields are tiny; they piggyback on existing structured output. No new round-trips
  except Move 3's chapter-start `chapterTruth` (already a chapter-start moment).
- **Back-compat:** all new map fields default safely in `normalizeUnderMap`; old saves keep working
  (no `falseReadings` → fall back to instant reveal; no `echoes` → no banner).

## 11. Verification plan (this environment can't run the RN UI)
- `npx jest` for `underMap.test.js` (extend with budget/streak/blurred-node/forgiving cases) and
  the persistence+advance integration test.
- `node -e 'require("@babel/core").transformFileSync("<path>")'` parse-check on each edited RN file.
- On-device (Pixel/iOS via Expo Go, `npx expo start -c` to clear cache so chapters regenerate):
  verify probe tension, choose-the-truth aha, ECHO callbacks recur and feel meaningful, forgiving
  no-block, and Clarity payoff at a chapter boundary.

---

## 12. Decisions (resolved)
All four review questions are now decided — the redesign covers the full scope.

1. **Clarity → endings → DECIDED:** a **3-variant spectrum** (Clear-Eyed ≥ 0.66 / Half-Blind /
   Deceived < 0.33), with final-act belief *flavor* steering the specific terminal scene within a
   variant. Bounded and authorable. (§5)
2. **Keystone threshold → DECIDED:** `seen ≥ 3` **and spans ≥2 chapters**, so keystones reward
   genuine cross-chapter recurrence. (§6)
3. **Daily on-ramp → DECIDED: in scope (P2).** The overnight "stir" drops a sense-able fragment +
   a notification; completing the daily word puzzle resolves it into the campaign map and can gift
   a probe-less reveal. Mechanics of the daily puzzle itself are untouched. (§8.1)
4. **Constellation map → DECIDED: in scope (P2).** Phased: radial/cluster by chapter region first,
   force-directed graph second, with a reduced-motion list fallback. (§7)

### Remaining tuning knobs (not blockers — settle on device)
- Clarity thresholds (`CLARITY_TRUE`, `CLARITY_PARTIAL`) and keystone constants
  (`KEYSTONE_SEEN`, `KEYSTONE_MIN_CHAPTER_SPAN`).
- Probe budget formula (§3.1) and the "sense" assist timing.
- Daily-streak reset softness and the drifting-fragment source pool (§8.1).
