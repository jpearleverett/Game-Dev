# Dead Letters — Agent Guide (read this first)

This is the authoritative, current-state context for the **Dead Letters** game.
If you change a system described here, update this file. Older docs that described
the pre-redesign game (the whodunit/alibi version) have been removed.

---

## 1. What this is (current state)

**Dead Letters** is an Expo / React Native (SDK 54, React 19) mobile game. The
player is **Jack Halloway**, a former-detective PI in rain-soaked **Ashport** who
is pulled into a hidden, mystical layer of reality called **the Under-Map**. It
is **science-fiction mystery, NOT a detective whodunit** — there are no suspects,
alibis, or culprits. The fantasy is *mapping a reality that doesn't want to be
seen*, and slowly revealing its secrets.

Story content is **generated on-device by Google Gemini** (`gemini-3.5-flash`)
through a Vercel proxy, with branching narrative and infinite path divergence.

> **History note:** the game was refactored from an older "noir detective +
> word-puzzle + alibi deduction" design into the Under-Map design. The whodunit
> code has been **deleted**: the Deduction/CaseBoard/Accusation/LogicPuzzle
> screens + their components, DeductionService, caseEntities, and the
> generation-side whodunit cruft (the `caseFile`/suspects/culprit output schema
> and the `<player_deduction>` prompt injection) are gone — so the model no
> longer generates "culprit" framing. A separate **daily word-puzzle mode**
> (EvidenceBoard) still exists and is untouched, but the *story campaign* is all
> Under-Map. `src/data/caseBoard.js` remains only for save back-compat and for
> a couple of constants EvidenceBoard still imports.

---

## 2. The core gameplay loop (story campaign)

Each **chapter** has three subchapters: **A, B, C** (e.g. `001A`, `001B`, `001C`).

```
READ      Read the generated branching narrative (3 segments deep: opening →
          first choice → second choice). Player choices fork the story.
EXAMINE   Tap kind-colored "anomaly" phrases in the prose to COLLECT fragments
          onto the Under-Map.
CONNECT   (A & B beats) Descend into the Under-Map and draw connections between
          fragments. A connection that matches a known relation reveals a NODE
          (a truth about the hidden world). Then "Continue the descent" → next.
THEORY    (C beat = chapter climax) Commit a BELIEF about the hidden world —
          the chapter's decision is framed as competing interpretations. Review
          your evidence (read-only reference; tap a fragment to re-read its clue),
          pick the belief, seal it, then "Cross the threshold" → next chapter. The
          sealed belief steers the next chapter's generation. (The belief is the
          only choice; fragments are not staked/graded — see §8.)
```

Fragments are **cumulative** across the whole campaign and **recur as motifs**
(re-collecting one deepens it). The Under-Map visibly **assembles** over chapters
(a "map is taking shape" depth meter).

### Subchapter → beat routing
`src/utils/puzzleMode.js` `getPuzzleMode(caseNumber, isStoryMode)`:
- Story **A / B** → `PUZZLE_MODE.CONNECT` → route `UnderMap`
- Story **C** → `PUZZLE_MODE.THEORY` → route `Theory`
- Non-story (daily) → `PUZZLE_MODE.EVIDENCE` → route `Board` (EvidenceBoard)

---

## 3. The Under-Map system

**Model:** `src/data/underMap.js` — pure, immutable, fully tested
(`src/services/__tests__/underMap.test.js`). A campaign holds one Under-Map at
`progress.storyCampaign.underMap`.

Shape: `{ fragments, relations, connections, nodes, theories, foil, lastVisitedAt }`.
- **fragment**: `{ id, label, kind, detail, phrase, anomalous, seen, firstCaseNumber, lastCaseNumber, ... }`. `kind ∈ {symbol, place, person, phenomenon}`. `id = frag_<kind>_<label-slug>`. `phrase` is the verbatim prose substring the player taps.
- **relation**: `{ id, a, b, revelation }` — the discoverable connection *truth* (a/b are fragment ids; the model authors these by label, resolved to ids).
- **connection**: a player-made correct link. **node**: the revelation a connection unlocks.
- **theory**: `{ chapter, fragmentIds, interpretation, rejected, correct, at }` — the sealed C-beat belief. `correct` is tri-state (null = unproven, true = held, false = subverted); `rejected` is the competing readings the player turned away from.
- **foil**: `{ belief, fromChapter, presence, name } | null` — "The Other Reader," a single evolving antagonist born from the rejected reading. `presence` (clamped [-3,3]) grows when a belief is subverted, recedes when it holds. **Wired end to end:** `TheoryScreen` seals `rejected` → `recordTheory` sets the creed → `resolveTheory` moves `presence` → `promptAssembly._buildOtherReaderSection` steers generation (presence-scaled) → the model names them (`foilName` → captured by `nameFoil`, pinned thereafter) → surfaced in the verdict banner, the Codex card, and the ending. Selectors `foil`/`foilPresence`/`foilIsManifest`/`nameFoil` in `underMap.js`.

Key helpers: `makeFragment`, `addFragments` (dedups by id; **re-collecting deepens a motif** — bumps `seen`), `addRelations` (resolves labels→ids, re-resolves as more fragments arrive), `connectFragments` (returns `{ map, revealed:{node}|null, valid, alreadyConnected }`), `recordTheory`. Selectors: `isMotif`, `motifCount`, `mapDepth` (share of relations drawn), `undiscoveredRelationCount`.

**Screens:** `src/screens/UnderMapScreen.js` (CONNECT board — also opened freeform from the Desk), `src/screens/TheoryScreen.js` (C climax belief commit). `GameContext` exposes `ingestSceneFragments`, `connectUnderMap`, `recordUnderMapTheory` (takes `rejected` → seeds the foil), `resolveUnderMapBelief`, `nameUnderMapFoil`, `touchUnderMap`.

**EXAMINE wiring:** `CaseFileScreen` builds `examinableDetails` from `storyMeta.fragments` (those with a `phrase`) and merges them into the branching reader's per-segment `details`. `BranchingNarrativeReader` highlights fragment phrases (kind-colored ink) and, on tap, calls `onExamineFragment` → `ingestSceneFragments`. On narrative completion it backfills the opening's fragments so the CONNECT/THEORY beat always has material.

---

## 4. Story generation pipeline (Gemini)

- **Service:** `src/services/storyGeneration/` — `generation.js` (orchestration), `promptAssembly.js` (prompt building), `prompts.js` (static prompt text), `schemas.js` (structured-output schemas), `validation.js` (parse + normalize + quality), `lazyBranching.js`, `personality.js`, `threads.js`, `storyArc.js`.
- **Hook:** `src/hooks/useStoryGeneration.js` → `src/context/StoryContext.js` (`ensureStoryContent`) → `src/hooks/useStoryEngine.js`.
- **Proxy:** `proxy/` (Vercel Edge function at `https://game-dev-tan.vercel.app/api/gemini`), SSE streaming with heartbeats. Configured via `GEMINI_PROXY_URL` (see `.env.example`).
- **Caching:** Gemini context caching (chapter-start prefix cache, ~24-28k cached tokens) + an in-memory `generatedCache` in `src/data/storyContent.js` + persisted `src/storage/generatedStoryStorage.js` (with pruning).
- **Many-shot:** `src/data/manyShot/` (scene-type exemplars) is **live** — `promptAssembly.js` injects them for quality. (Built by `scripts/` + `MANY_SHOT_WORKFLOW.md`.)
- **Thinking level:** narrative uses `medium`; path-decisions / personality use `low`. No temperature/topP. Latency is dominated by thinking (TTFT).

### Under-Map steers generation (`<under_map_state>`)
`promptAssembly.js` `_buildPlayerTheorySection(underMap)` builds a block injected
into the main narrative prompt AND the pathDecisions prompt. It lists the
player's **collected fragments (with kinds)**, **revealed nodes**, and **sealed
theory**, and instructs the model to:
1. Author at least one relation linking a NEW fragment to one the player ALREADY HOLDS (cross-chapter weaving).
2. Build the prose on truths the player has revealed.
3. Re-surface recurring motifs by reusing an earlier fragment's exact label.

The Under-Map is threaded in via `useStoryGeneration.js` (`underMapRef` →
`options.underMap` → `this.currentUnderMap` in generation.js).

Alongside it, `_buildOtherReaderSection(underMap)` injects a separate, presence-scaled
`<the_other_reader>` block (the foil — see §3) into both prompts.

**The Under-Map is also the dynamic CONSISTENCY spine.** `_buildContinuityAnchorSection`
(promptAssembly.js) injects the player's **revealed node truths** and **sealed
beliefs** (with their resolved status: held / subverted / unproven) into the
end-of-prompt `<continuity_anchors>` block as HARD "do not contradict" canon — the
high-attention position that counters Gemini 3.5 Flash's long-context dilution.
This is distinct from `<under_map_state>` (a generative "weave this in" instruction).
Note: the old model-emitted `consistencyFacts` ledger is **retired** — it was
removed from the schemas (`schemas.js`), so the model no longer emits facts and the
path-keyed `consistencyFactsByPathKey` persistence in `validation.js`/`context.js`
is dead (kept only by `branchFacts.test.js`). The `ESTABLISHED FACTS` prompt
section now renders only the static `CONSISTENCY_RULES`; dynamic facts come from the
Under-Map canon above + `narrativeThreads` + the full realized story text.

### C-beat decisions are BELIEFS
`prompts.js` pathDecisions section frames the 9 path-specific C decisions as
competing **interpretations of the hidden world** (declarative beliefs like
*"Blackwell is guiding you in"* vs *"The symbol is a tracking lock"*), not
imperative actions.

---

## 5. State, persistence, and CRITICAL invariants

- `src/hooks/usePersistence.js` owns `progress` (a `useState`) and `updateProgress`. **`updateProgress` supports a functional updater `updateProgress(prev => updates)` and auto-persists** (debounced AsyncStorage save). There is no separate manual save needed.
- `src/context/GameContext.js` is the hub (state + dispatch). `src/utils/gameLogic.js` `normalizeStoryCampaignShape` repairs/normalizes the campaign (incl. `underMap`, legacy `caseBoard`).

### ⚠️ Invariants you must not break (these caused real, hard bugs)

1. **Campaign advances MUST use functional `updateProgress(prev => …)`.** Object-merge writes against a closure `progress` clobber concurrent background-generation writes (this stranded the player at 001A). The advance helpers live in `src/utils/storyAdvance.js` (`advanceWithDecision`, `advanceSubchapter`) and are used by `useStoryEngine` (`applyPreDecision`, `selectDecision`, `selectDecisionBeforePuzzle`) and `GameContext.completeLogicPuzzle`. **Never** reintroduce a stale `saveStoredProgress({...progress})`.
2. **Advance is FORWARD-ONLY and derived from the completed case.** `completeLogicPuzzle` computes the next position from the *param* `caseNumber` (via `caseOrder`/`parseCaseNumber`), and only moves forward. This is robust to nav/campaign drift — do not re-add a `caseNumber === activeCaseNumber` hard guard that can permanently skip.
3. **The generated entry assembly must carry `fragments`/`relations`.** In `generation.js` the final `storyEntry` is built from a *field whitelist* — it must include `fragments` and `relations`, or the board never populates for generated chapters.
4. **EXAMINE needs verbatim, SHORT phrases.** A fragment's `phrase` must be a short (2-5 word) substring that appears character-for-character in the rendered prose, or the reader can't highlight it. The prompt enforces this; `validation.js` `_deriveFragmentsFromBranching` also derives fragments from the prose `details` (which the model fills reliably) as a fallback.

---

## 6. Repository map (the parts that matter)

```
src/
  navigation/AppNavigator.js     Stack routes. Story puzzle routes: UnderMap, Theory. Daily: Board.
  context/
    GameContext.js               State+dispatch hub; completeLogicPuzzle (advance), under-map actions
    StoryContext.js              ensureStoryContent + background generation
    AudioContext.js
  hooks/
    usePersistence.js            progress + updateProgress (functional, auto-save)
    useStoryEngine.js            decision/advance functions (functional)
    useStoryGeneration.js        Gemini generateForCase; threads the Under-Map into options
    useNavigationActions.js      screen navigation actions
  screens/
    CaseFileScreen.js            READ + EXAMINE; routes to the beat puzzle
    UnderMapScreen.js            CONNECT board (A/B gate + freeform from Desk)
    TheoryScreen.js              C climax: commit a belief
    EvidenceBoardScreen.js       DAILY word-puzzle (non-story). Still live.
    DeskScreen.js, StoryCampaignScreen.js, CaseSolvedScreen.js, ... (menus/meta)
  components/
    BranchingNarrativeReader.js  branching reader + inline tappable EXAMINE phrases
  data/
    underMap.js                  Under-Map pure model (the spine)
    storyContent.js              getStoryEntry, generatedCache, path keys, parseCaseNumber, computeBranchPathKey
    storyNarrative.json          STATIC chapter-1A content (full 13-node branch tree, written in the Under-Map register; seeded fragments/relations). Only 001A.ROOT is authored; other keys are generated/cached.
    cases.js                     SEASON_ONE_CASES placeholders
    caseBoard.js                 LEGACY (retired alibi board) — kept only for save back-compat + EvidenceBoard constants
    manyShot/                    live generation exemplars
  utils/
    storyAdvance.js              pure advance helpers (advanceWithDecision/advanceSubchapter/caseOrder)
    storyDecision.js             resolveStoryDecision / decisionOptionsFrom (shared by CaseFile + Theory)
    puzzleMode.js                getPuzzleMode/getPuzzleRouteName (CONNECT/THEORY/EVIDENCE)
    gameLogic.js                 normalizeStoryCampaignShape, formatCaseNumber
  services/storyGeneration/      LLM pipeline (see §4)
  storage/                       AsyncStorage progress + generated-story persistence
proxy/                           Vercel Gemini proxy (Edge function)
docs/gemini_*.md                 Gemini API reference (caching/structured-output/thinking/etc.) — keep
scripts/, MANY_SHOT_WORKFLOW.md  many-shot data tooling (live data, one-time tooling)
```

---

## 7. Running, building, and testing

- **Run on device:** Expo Go (tested on Pixel 10 Pro via Termux, and iOS). `npx expo start -c` (the `-c` clears the cache — needed after content/prompt changes so chapters regenerate). Requires the proxy URL in `.env` (`GEMINI_PROXY_URL=https://game-dev-tan.vercel.app/api/gemini`).
- **Cursor Cloud can run the RN UI and live model when the environment is configured.** Use Expo (`npx expo start -c`) for UI/manual testing and the configured `GEMINI_PROXY_URL` for live generation checks when a task needs end-to-end validation.
- Baseline automated verification still applies:
  - `npx jest` — unit/integration tests (incl. a real `usePersistence`+`useStoryEngine` advance test via `react-test-renderer`).
  - Babel parse-check any RN file you edit: `node -e 'require("@babel/core").transformFileSync("<path>")'`.
- After changing generation/content, the player must start a **fresh** run (cached pre-change entries won't reflect changes).

---

## 8. Where we left off / open threads

**Working & verified on-device:** full loop A→B→C→next chapter; campaign advance (no 1C→1A reset); EXAMINE fragments appear and are tappable in generated chapters; belief-framed C climax; cross-chapter weaving + revealed-truth steering + recurring motifs + a "map is taking shape" depth meter.

**Belief payoff is SHIPPED (don't re-build it).** A sealed belief is borne out or subverted and accrues into the ending reached. The model emits `beliefResolution { resolvesChapter, correct, line }` (schema + `promptAssembly.js` prompt pressure to subvert); `CaseFileScreen` shows an in-scene verdict banner ("YOUR READING HELD TRUE / WAS SUBVERTED") and calls `onResolveBelief` → `resolveTheory`; `clarity()`/`endingVariant()` drive the 3-variant finale in `src/data/endings.js` (`EndingScreen`, `CodexScreen` worldview readout). The whole spine lives on `theory.correct`.

**READ-beat polish (shipped, in `BranchingNarrativeReader` + `TypewriterText`):** uncollected anomalies shimmer (a **backgroundColor** pulse — do NOT change it to `opacity`; opacity on a nested `<Text>` is a no-op in RN, which is why the first version never animated); a per-page "ANOMALIES SENSED n/m" meter ticks + flares a mote and stamps "PAGE FULLY SENSED"; the Under-Map bleeds violet/cyan through the page margins, deepening with `mapDepth`; an examine sting (`playSelect`); punctuation-aware "dramatic pacing" in the typewriter; a Playfair drop-cap on the scene opening. All honor `reducedMotion` (read from `GameContext`).

**Theory screen is read-only evidence + one decision (post-playtest).** The C-beat shows WHAT YOU UNCOVERED (truths) → YOUR EVIDENCE (fragments, **read-only**; tap to expand a clue) → WHAT DO YOU BELIEVE? (the lone decision, last/above SEAL). The old "stake your evidence" selection was a fake choice — `theory.fragmentIds` is recorded but never read by clarity/generation/foil — so it's gone; all fragments are recorded silently. The belief is the only thing the chapter answers.

**Verdict & echo presentation (post-playtest).** The belief verdict **stamps** onto the case file on arrival (`stampAnim`: scale-slam + haptic + slight tilt — held square, subverted askew) then rests compact, so the payoff feels earned without being a wall. The verdict shows kicker + your belief + a one-line summary; the echo is lean (the mapped-truth `nodeRef` only, de-duped) — neither previews the scene's own sentences anymore. The Under-Map constellation also de-emphasizes "inert" fragments (those in no still-unfound relation) so the connectable threads stay vivid.

**The Other Reader (foil) is SHIPPED end to end (Phases 1-5).** The Station-Eleven "Prophet" mirror: the reading the player rejects at a C-beat gets a champion who is vindicated each time the player is subverted, escalating from a rumor to a named, recurring antagonist, and paying off in the verdict banner / Codex / ending. See the `foil` entry in §3. **Unverified on-device** — it's LLM-driven; needs a playtest that deliberately seals-then-subverts a couple of beliefs to push `presence` to ≥2 and confirm the prompt yields a coherent recurring antagonist (not a generic thug) with a stable name.

**Perceived-latency / seamless generation (shipped).** The two gateways that used to
expose generation time — finishing the CONNECT beat and sealing a THEORY — are now hidden
behind cover the player is already spending:
- **Theory prefetch no longer self-clobbers.** `TheoryScreen` speculatively prefetches the
  next chapter for *each* candidate belief on mount (`prefetchTheoryBranches` →
  `prefetchNextChapterBranchesAfterC`, keyed by `underMapByOption` + a per-belief
  `underMapGenerationSignature`). Sealing calls `recordUnderMapTheory`, which mutates the
  campaign Under-Map (M0→M1) and re-renders the screen — which **re-fired the prefetch
  effect with a double-recorded map**, overwriting the correctly-signed prefetch so
  `crossThreshold`'s signature check missed and the player ate a full regen. The effect now
  bails when `sealed` (`if (sealed) return;`), so the pre-seal signature survives and the
  cross is an instant cache hit. This is THE fix for the post-seal wait.
- **Cross WAITS for the next chapter (no fallback flash).** `crossThreshold` `await`s
  `ensureStoryContent` (keyed to the sealed-belief map + `requireFreshUnderMap`) before
  navigating to `Sealed`. With the prefetch-clobber fix above this is usually an instant
  cache hit; the honest "Crossing…" hold on a cold cache is still preferable to navigating
  early and rendering placeholder/fallback prose (which an earlier decouple attempt did —
  reverted). NOTE: the real bottleneck is raw generation latency (~70s/scene, single slot),
  not gateway positioning — see the latency caveat below.
- **The CONNECT beat warms the next subchapter on open.** `UnderMapScreen` calls
  `prefetchAfterUnderMapReveal(gateCaseNumber, map)` on mount (not just on first reveal), so
  the whole connection-drawing puzzle is cover. Deduped; `handleContinue` already hits the
  cache without forcing a regen.
The cache-key contract these rely on lives in `src/utils/underMapGeneration.js`
(`underMapGenerationSignature`).

**LATENCY REALITY (on-device, 2026-06-09):** the above only hides generation when the
generation FITS inside the cover window. On a Pixel 10 Pro a single scene takes **~70s**
(`gemini-3.5-flash`, `thinkingLevel: 'medium'`, ~84% cached prompt, ~3.9k completion tokens),
nearly all of it model *thinking* (TTFT). Cover windows (a CONNECT puzzle, a THEORY
deliberation) are ~20-40s — so the prefetch is *correct* (logs show all duplicate requests
dedupe onto one in-flight generation) but starts only ~1 beat ahead and **cannot fully cover
70s with 20-40s**. This is a hard ceiling while thinking stays at `medium` and lookahead stays
context-accurate (both deliberate product choices — keep prose quality, keep branching
coherence). Don't expect the gateway wait to vanish; expect it reduced and never *worse*.

What IS done within those choices: **`maxConcurrentGenerations` is now 2** (was 1). This
guarantees the urgent scene the player waits for always has a free slot instead of queuing
behind a speculative prefetch, and lets the two C-beat belief branches prewarm in PARALLEL
(`prefetchNextChapterBranchesAfterC` now fires `startOne('A')`/`startOne('B')` via
`Promise.allSettled`). To keep that safe, each belief prefetch is keyed by its Under-Map
signature `refreshKey` (`compactUnderMapSignature`), so a SEAL's `crossThreshold` generation
(same signature → same `generationKey`) **dedupes onto the in-flight prefetch** rather than
starting a duplicate that would fill the second slot. Do NOT raise concurrency above 2 on
mobile, and do NOT drop the prefetch `refreshKey` alignment or parallel speculation becomes a
self-block. The remaining levers (NOT taken, by choice): `thinkingLevel` `medium`→`low`
(`generation.js` ~475/531) for raw speed at a prose-quality cost; deeper-than-1-beat lookahead
for more cover at a branching-coherence cost.

**Open / candidate next work:**
- **Tune cross-chapter weaving strength.** The model is *instructed* to link new fragments to earlier ones; it's LLM-driven, so verify on device whether links actually recur and feel meaningful. If weak, increase prompt pressure or add a deterministic "seed an earlier fragment into each scene" step.
- **Generation length.** Scenes generate ~600-650 words (below the 900 minimum; expansion is disabled for speed). Revisit if quality/length needs to rise.
- **Legacy cleanup (optional):** `caseBoard.js` and the `GameContext` case-board actions are retired but kept for save back-compat; `EvidenceBoardScreen`/daily mode is independent. Remove only with intent.

**Diagnostics:** the `[ADV]`/`[FRAG]`/`[EXAMINE]` console logs used to debug the reset and fragment flow have been removed.
