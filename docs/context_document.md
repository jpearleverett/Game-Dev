# Dead Letters: AI Agent Context Document

This document is a comprehensive, code-accurate overview of the Dead Letters game.
It is intended to help an AI agent understand how the narrative, puzzles, LLM
generation, and UI flows work end to end. It reflects the current codebase
state (excluding the "Logic game mode" folder as requested by the owner).

If you change any of the systems described here, update this document to keep
it aligned with implementation details and constraints.

---

## 1) Repository map (high level)

- `App.js`: App root, providers, navigation, and global overlays.
- `src/`:
  - `context/`: Game, story, and audio contexts (global state, actions).
  - `hooks/`: Game logic, persistence, story generation, navigation helpers.
  - `services/`: LLMService, StoryGenerationService, Analytics, Purchases, LogicPuzzleService.
  - `data/`: Story bible, cases, endings, achievements, many-shot scenes.
  - `storage/`: AsyncStorage helpers for progress, story, puzzle state.
  - `screens/`: UI screens for story, puzzles, menus, archive, settings.
  - `components/`: Narrative readers, decision panels, puzzle UI, overlays.
  - `utils/`: Case merge helpers, text pagination, board helpers, logging (llmTrace.js).
- `proxy/`: Vercel Edge proxy for Gemini API.
- `scripts/`: Many-shot extraction and categorization pipeline for Mystic River.
- `docs/`: Gemini API docs, prompts, session summaries, story reference text.

---

## 2) Glossary and identifiers

- Chapter: 12 total, numbered 1-12.
- Subchapter: Each chapter has 3 subchapters (A, B, C).
- Case number format: `XXXS` where `XXX` is zero-padded chapter and `S` is A/B/C.
  - Examples: `001A`, `001B`, `001C`, `012C`.
- Story path key (chapter-level decisions):
  - Built from choices in C subchapters (A or B).
  - Example: after 1C=B and 2C=A, cumulative key is `BA`.
- Branching path key (within a subchapter):
  - Subchapter narrative has 2 choice points with 3 options each.
  - Keys are `1A/1B/1C` for the first choice and `2A/2B/2C` for the second.
  - Combined path key is `1B-2C` (first choice B, second choice C).
- `choiceHistory`: Chapter-level decisions (A/B at end of C subchapters).
- `branchingChoices`: Per-subchapter branching path decisions inside A/B/C narrative.

---

## 3) Core gameplay loop (story campaign)

1. Player starts a case (subchapter) from the Desk or Story campaign.
2. Narrative plays first (CaseFile screen), often as a paged reader.
3. Player solves the puzzle (Evidence Board or Logic Puzzle).
4. Result shown (CaseSolved screen).
5. If subchapter is C, player makes a chapter decision (A or B) to choose the
   next chapter path. LLM generation for the next chapter is kicked off early
   for narrative-first flow.

Narrative-first flow:
- For C subchapters, the decision is made before the puzzle so the next chapter
  can be generated while the player solves the puzzle.

---

## 4) Story structure and narrative branching

### 4.1 Overall campaign structure
- 12 chapters total.
- Each chapter has 3 subchapters: A, B, C.
- Subchapter C is the chapter-level decision point (A or B for the next chapter).

### 4.2 Branching narrative inside subchapters
- Each subchapter uses a branching narrative with two choice points.
- First choice: 3 options (1A, 1B, 1C).
- Second choice: 3 options (2A, 2B, 2C) for each first choice.
- Total paths: 3 x 3 = 9 unique story endings per subchapter.
- Each path has a separate decision bundle at the end of a C subchapter.

### 4.3 Why both choice systems exist
- Chapter-level decisions (A/B) shape long-term story direction and path
  personality.
- Subchapter branching choices shape the immediate narrative context and the
  specific decision options shown at the end of a C subchapter.

---

## 5) Data and state models

### 5.1 Progress and campaign state
Stored in AsyncStorage via `progressStorage.js` and managed by `usePersistence`.
Important fields:

- `progress.settings`: audio, accessibility, hints, verbose mode.
- `progress.storyCampaign`:
  - `chapter`, `subchapter`, `currentPathKey`, `activeCaseNumber`.
  - `choiceHistory`: chapter-level decisions with option details.
  - `branchingChoices`: subchapter branching path selections.
  - `pathHistory`: map of chapter to cumulative path key (chapter-level).
  - `awaitingDecision`: whether C subchapter decision is pending.
  - `completedCaseNumbers`: story cases that are done.
- `progress.endings`: unlocked endings and metadata.
- `progress.achievements`: unlocked achievements and points.
- `progress.chapterCheckpoints`: replay checkpoints for chapter select.
- `progress.gameplayStats`: streaks, solve times, totals.

### 5.2 Case data
`src/data/cases.js` contains the base case structure for Season 1.
Fields include:
- `caseNumber`, `day`, `title`, `mainTheme`, `outlierTheme`.
- `dailyIntro`, `briefing`, `clueSummaries`.
- `evidenceBoard` metadata and `board` words.
- Branching outlier sets (static for early chapters, dynamic for later).

The final case used by the UI is produced by merging:
- Base case data
- Story meta (LLM-generated narrative, decisions, summaries)
- Branching outlier data (static or generated)
- `caseMerger` selects the correct `storyDecision`:
  - If `pathDecisions` exists, it uses `branchingChoices.secondChoice` for the
    current case (falls back to `1A-2A`).
  - If not, it falls back to legacy `decision`.

### 5.3 Story content and generation cache
`src/data/storyContent.js` and `src/storage/generatedStoryStorage.js` manage:
- In-memory cache of generated story content.
- AsyncStorage persistence keyed by `caseNumber_pathKey`.
- Helpers to build the realized narrative from branching segments.

Generated entries include:
- `title`, `narrative`, `branchingNarrative` (opening, choices, endings).
- `decision` or `pathDecisions`.
- `briefing`, `storyMeta`, `narrativeThreads`, `consistencyFacts`.
- Metadata: `chapter`, `subchapter`, `generatedAt`, `wordCount`, `isFallback`.

`storyMeta` is used to populate case file overlays (recaps, directives, and
bridge text shown to the player).

### 5.4 Branching outlier sets
`src/data/branchingOutliers.js` (static for Chapter 1) and
`src/data/dynamicBranchingOutliers.js` (dynamic for Chapters 2-12) provide the
branch-specific puzzle word sets that align with story decisions.

### 5.5 Story context tracking
Stored in `generatedStoryStorage` as a separate story context:
- `decisionConsequencesByKey`: lightweight persistence of choice outcomes.
- `consistencyFactsByPathKey`: branch-scoped facts to prevent cross-path bleed.
- Backward compatibility: legacy `consistencyFacts` array.
- Character, plot, evidence, location, and narrative thread trackers.

### 5.6 Endings and achievements
- `endingsData.js` defines 16 endings with `pathKey`, archetype, and visuals.
- `achievementsData.js` defines story and gameplay achievements with conditions
  (endings reached, streaks, solve attempts, etc).

### 5.7 State management architecture
- `GameContext` uses `useReducer` and `gameReducer` for puzzle and case state.
- `StoryContext` manages story campaign state and LLM generation triggers.
- `AudioContext` manages SFX and ambient playback.
- Progress is persisted via `usePersistence` and hydrated on startup.
- `useStoryEngine` updates choice history, branching choices, and pending
  decisions, and persists critical transitions immediately.

---

## 6) Story generation pipeline (LLM)

### 6.1 Core services

- `StoryGenerationService.js` is the main orchestrator.
- `LLMService.js` handles direct or proxied Gemini calls, streaming, retries,
  and JSON repair.
- `useStoryGeneration.js` coordinates generation in the UI layer.
- `llmTrace.js` utility provides two logging systems:
  - **llmTrace()**: Structured LLM event logging with correlation IDs and
    subscriber support for `LLMDebugOverlay`.
  - **log utility**: Simple logging functions that respect verbose mode:
    - `log.error(scope, message, data?)` - Always logged
    - `log.warn(scope, message, data?)` - Always logged
    - `log.info(scope, message, data?)` - Always logged
    - `log.debug(scope, message, data?)` - Only when verbose mode enabled
  - Enable verbose mode in Settings to see debug logs (token usage, heartbeats,
    cache operations, generation details).

### 6.2 Prompt construction

StoryGenerationService builds prompts from multiple layers:

1. **System prompt** (`buildMasterSystemPrompt()`)
   - Dynamically builds from storyBible.js data (ABSOLUTE_FACTS, WRITING_STYLE,
     CONSISTENCY_RULES, ENGAGEMENT_REQUIREMENTS, etc.)
   - Defines writing identity, noir constraints, and non-negotiables.
   - Enforces close third-person POV, single quote dialogue, and style rules.
2. **Static cache content**
   - Story bible, character reference, craft techniques, style examples,
     and consistency rules.
   - Cached using explicit Gemini cached content for cost reduction.
3. **Dynamic prompt**
   - Story summary and current scene state.
   - Character knowledge and voice DNA.
   - Many-shot examples by beat type.
   - Active threads and engagement guidance.
   - Task block and self-critique block.

Prompts use XML-like section tags to reduce context bleed.

Story bible (`storyBible.js`) is the **single source of truth** for:
- Absolute facts (timeline, setting, core mystery).
- Writing style constraints (POV, tense, forbidden phrases).
- Voice DNA and example passages.
- Engagement requirements and micro-tension techniques.
- Annotated examples, negative examples, extended style grounding.
- Consistency rules, reveal timing, and setup/payoff registry.

All prompt-building methods read from storyBible.js - no hardcoded duplicates.

### 6.3 Branching narrative output
LLM outputs a structured JSON payload. For C subchapters:
- The main call returns branching narrative + a simple `decision`.
- A second call produces 9 `pathDecisions` (one per subchapter path) because
  a single schema with 9 nested decisions exceeds Gemini schema complexity limits.

### 6.4 Path decisions
`pathDecisions` is keyed by branching path (`1A-2A`, `1A-2B`, ...).
At runtime, the game selects the decision that matches the player's actual
branching choices within the subchapter.

### 6.5 Validation and word count
- LLM responses are validated with a secondary LLM pass (gated by config).
- JSON repair attempts are applied when output is truncated.
- Regex validation checks POV, forbidden phrases, and structural consistency.
- **Word count validation is warnings-only** (no automatic retry or expansion).
- Word count configuration (see `GENERATION_CONFIG.wordCount` in storyBible.js):
  - `minimum`: 900 words (3×300=900 word paths)
  - `target`: 1,050 words (3×350=1,050 expected per path)
  - `maximum`: 1,400 words
- Segment validation minimum: 300 words (ensures 3 segments meet 900 word path minimum).
- Validation gating flags (see `GENERATION_CONFIG.qualitySettings`):
  - `enableProseQualityValidation`
  - `enableSentenceVarietyValidation`
  - `enableLLMValidation`

### 6.6 Narrative expansion (REMOVED)
- `_expandNarrative()` and its grounding helper were removed entirely.
- Shorter stories are accepted rather than risking corrupted text.

### 6.7 Path personality
The player's choice history (A=methodical, B=aggressive) produces a path
personality profile. This feeds prompt instructions to align Jack's dialogue
and risk tolerance with the player's choices.

### 6.8 Background generation and prefetching
`useStoryGeneration.js` supports:
- Pre-generating upcoming subchapters and branches.
- A narrative-first flow where C-subchapter decisions trigger next chapter
  generation before the puzzle.
- Auto-retry when the app returns to foreground after backgrounded failure.
- Speculative prefetching:
  - Prefetch next subchapter branches after a C subchapter.
  - Prefetch first-choice branches to hide latency.
  - Sequential generation to avoid mobile network saturation.

---

## 7) LLMService behavior

LLMService manages:

- **Configuration**:
  - Proxy mode (production) via Vercel Edge Function.
  - Direct mode (dev) using embedded API key.
- **Temperature**:
  - Gemini 3 temperature is forced to 1.0 (regardless of caller input).
  - Setting below 1.0 causes looping or degraded performance on complex tasks.
- **Thinking**:
  - `thinkingLevel` defaults to high, can be overridden for specific tasks.
  - **Important:** Thinking tokens consume output budget. With "high" thinking,
    50-80% of `maxTokens` may go to reasoning before actual output.
  - Use `thinkingLevel: 'low'` for simple tasks (classification, validation).
  - Use `thinkingLevel: 'high'` for complex reasoning (narrative generation).
- **Token budgets** (see `GENERATION_CONFIG.maxTokens` in storyBible.js):
  - `subchapter`: 65,536 (Gemini 3 max output)
  - `pathDecisions`: 65,536
  - `arcPlanning`: 32,000 (complex multi-chapter planning)
  - `outline`: 32,000 (chapter outlines)
  - `consequences`: 16,000
  - `llmValidation`: 32,000
  - `expansion`: 32,000 (currently disabled)
  - `classification`: 8,000 (uses low thinking)
  - `validation`: 8,000 (uses low thinking)
- **Streaming**:
  - Priority: react-native-sse -> expo/fetch streaming -> response.text().
  - Heartbeats prevent mobile timeouts during Gemini thinking phase.
- **Retries**:
  - Exponential backoff with network checks.
- **Offline queue**:
  - Requests can be queued if offline, but callbacks are only kept in memory.
  - Queue persistence drops function references and stores callback IDs only.
- **Rate limiting**:
  - Minimum request interval and max concurrent requests to avoid 429s.

LLMService also supports explicit cached content creation, TTL updates, and
cache listing/deletion for cost optimization.

---

## 8) Proxy service (Gemini API)

The game uses a **Vercel Edge Function** (`proxy/api/gemini.js`) to proxy Gemini API requests:

- Secure API key storage in Vercel environment variables.
- True streaming with SSE heartbeats.
- Supports cached content creation and generation.
- Returns thought signatures for Gemini 3 reasoning continuity.
- Rate limiting and request validation.

The proxy URL is configured via `GEMINI_PROXY_URL` in `app.config.js` and `.env`.

---

## 9) Puzzle systems

### 9.1 Evidence board (word outliers)
- Player selects words that do not belong to the main theme.
- Board state includes main words, outlier words, confirmed outliers, and
  attempts remaining.
- Branching outlier sets allow story decisions to influence puzzle content,
  especially in C subchapters.
- Components:
  - `BoardGrid`, `WordCard`, `ConfirmedOutliers`, `BoardHeader`.
  - `StringLayer` for visual connections.
  - `AttemptCounter` for attempts left and colorblind mode.
  - `PolaroidStack` and `InteractivePolaroid` for evidence images.
- Word card states include default, selected, locked main, and locked outlier.
- Settings such as colorblind and high-contrast modes alter UI rendering.

### 9.2 Logic puzzle (grid-based)
- Grid with terrain (street, park, building, fog) and static objects (lamp, bench).
- Items are placed by the player using a tray.
- Clues (adjacency, direction, terrain) validate the solution.
- `LogicPuzzleService` generates grid, items, and clues using LLM + solver.
- State is persisted per case via `logicPuzzleStorage`.
- Components:
  - `LogicGrid`, `LogicItemTray`, `LogicClueDrawer`.
- Difficulty scales by chapter (easy to master).

---

## 10) UI architecture and screens

Key screens:

- `SplashScreen`: resource loading and entry.
- `PrologueScreen`: introduction narrative.
- `DeskScreen`: hub for current case, story campaign, and options.
- `StoryCampaignScreen`: campaign state, continue/restart.
- `CaseFileScreen`: narrative reader and decision panel.
- `EvidenceBoardScreen`: main puzzle screen.
- `LogicPuzzleScreen`: logic-grid puzzle.
- `CaseSolvedScreen`: results, share, continue.
- `ArchiveScreen`: previous cases list.
- `ChapterSelectScreen`: replay and branching tree visualization.
- `EndingGalleryScreen`: endings collection.
- `AchievementsScreen`: achievements and points.
- `SettingsScreen`: audio, accessibility, purchases, LLM settings.
- `MenuScreen`, `StatsScreen`.

Screen behavior highlights:
- `CaseFileScreen` chooses between `NarrativePager` (linear) and
  `BranchingNarrativeReader` (branching). Decision panels are gated so C
  subchapter decisions only appear after branching choices are complete.

Key components:

- `NarrativePager`: linear narrative with typewriter effect.
- `BranchingNarrativeReader`: two-choice branching narrative (9 paths).
- `DecisionPanel` and `DecisionDossier`: decision UX for C subchapters.
- `StoryGenerationOverlay`: full-screen generation progress and errors.
- `LLMDebugOverlay`: verbose log overlay for LLM diagnostics (enabled by
  `settings.verboseMode`).
- `CaseBriefOverlay`, `CaseHero`, `CaseSummary`: story meta display.
- `ScreenSurface`: shared background/texture scaffolding.
- `TypewriterText`: animated per-character narrative text.
- `SolvedStampAnimation`: "INTEL ACQUIRED" celebration overlay.
- `ShareableEndingCard`: ending summary share card.
- `NeonSign`, `DustLayer`: noir atmosphere visuals.
- `PathVisualizationTree`: SVG tree of chapter paths and endings.

### 10.1 UI utilities and helpers
- `textPagination.js` splits narrative into pages with sentence-aware breaks.
  - `findBreakPoint()` finds word boundaries, expanding search to avoid mid-word cuts.
  - `removeDuplicateContent()` detects and removes duplicate sentences.
- `caseFileHelpers.js` parses daily intros and summary lines.
- `boardUtils.js` builds polaroid labels and thumbtack placement metrics.
- `useCachedResources` preloads fonts and critical images before showing UI.

### 10.2 Text truncation constants
StoryGenerationService uses named constants for consistent truncation:
- `TRUNCATE_SUMMARY`: 500 chars (brief narrative summaries in prompts)
- `TRUNCATE_VALIDATION`: 3,000 chars (full narrative for validation)
- `TRUNCATE_DESCRIPTION`: 300 chars (thread/choice descriptions)
- `TRUNCATE_PREVIEW`: 100 chars (short previews in logs)

### 10.3 Recent navigation + branching fixes (Jan 2026)
- `AppNavigator` now synchronizes `CaseFile` navigation params with `GameContext`
  so `activeCase` matches the explicit `caseNumber` passed during story advances
  (avoids stale case state during 001A → 001B → 001C transitions).
- `CaseFileScreen` now tags branching progress with the current `caseNumber`
  and ignores progress updates from prior cases. This prevents auto-saving a
  previous subchapter’s branching path into the next case.
- Decision readiness is scoped to branching progress for the current case only,
  so the decision panel will not unlock based on stale progress.
- `DecisionPanel` guards its `onLayout` measurement updates to avoid repeated
  state churn that caused "Maximum update depth exceeded" and UI slowdowns on 001C.

---

## 11) Audio, haptics, and UI theming

- `useAudioController` maps current route to music/ambience loops.
- `AudioContext` exposes playVictory/playFailure/playSubmit and background loops.
- Haptics helper centralizes selection/impact feedback.
- `useResponsiveLayout` scales layout for device sizes.
- `casePalette.js` generates per-theme palettes from case themes.

---

## 12) Debugging and logging

### 12.1 Logging utility (`src/utils/llmTrace.js`)

The codebase uses a centralized logging utility with two systems:

**Structured tracing (`llmTrace`):**
- Used for LLM lifecycle events with correlation IDs
- Supports subscribers for real-time UI display
- Events are formatted with scope, traceId, and structured data

**Simple logging (`log`):**
- `log.error(scope, message, data?)` - Always logged (console.error)
- `log.warn(scope, message, data?)` - Always logged (console.warn)
- `log.info(scope, message, data?)` - Always logged (console.log)
- `log.debug(scope, message, data?)` - Only when `verboseModeEnabled`

### 12.2 Verbose mode

Enable via Settings > Verbose Mode. When enabled:
- `log.debug()` calls output to console
- `LLMDebugOverlay` shows real-time generation progress
- Token usage, cache operations, and streaming details are visible

### 12.3 What's logged at each level

- **Always visible (errors, warnings, info):**
- Generation failures and errors
- CHAIN triggers (`🔗 CHAIN: 001A → 001B`)
- CHAIN completions (`✅ CHAIN COMPLETE: 001B generated in 60.5s`)
- Network/connectivity issues

**Debug-only (verbose mode):**
- Token usage breakdowns (input/output/cost)
- SSE heartbeats during streaming
- Cache operations (create, reuse, expire)
- Generation starts and cache hits
- Speculative prefetch details
- Personality classification details
- Realized narrative path selections
- Background generation attempt details
- Pre-puzzle decision flow details

### 12.4 Log scopes

Common scopes used in logging:
- `LLMService` - Network, streaming, caching
- `StoryGenerationService` / `StoryGen` - Story generation, validation
- `useStoryGeneration` - UI layer generation coordination
- `GameContext` - Game state and case activation
- `StoryContext` - Story campaign state and background generation
- `useStoryEngine` - Choice history and branching decisions

---

## 13) Analytics and monetization

- `AnalyticsService` queues events until initialized.
  - Tracks screen views, word selections, decisions, level start/complete.
- `PurchaseService` uses `react-native-purchases` or a mock in dev.
  - Two core products: bribe (unlock next chapter) and full unlock.
- GameContext handles unlock timing (`nextUnlockAt`) and bribe-based unlocks.

---

## 14) Many-shot scene pipeline (Mystic River)

Purpose: Provide large sets of professional noir scenes for many-shot learning.

Pipeline:
1. `extractStoryReference.js` extracts text from `docs/storyreference.docx`.
2. `extractSceneChunks.js` splits into 300-500 word chunks.
3. `categorizeWithGemini.js` or `categorizeWithGeminiStandalone.js` labels each
   chunk by scene category (confrontation, investigation, etc).
4. Results are saved into `src/data/manyShot/*Scenes.js` files and `index.js`.

These scenes are used by StoryGenerationService to inject many-shot examples
based on the current beat type.

---

## 15) Storage strategy and pruning

Generated story content is stored in AsyncStorage with:
- In-memory cache for fast reads.
- Debounced writes to reduce storage churn.
- Write lock to avoid concurrent write races.
- Auto-pruning to stay under a target size (default 4MB) and to avoid iOS
  storage limits.
- Entry optimization before save (strip consistency facts, trim threads, drop
  derived summaries) to reduce storage size.
- Late-arriving generations do not overwrite story entries the player has
  already started reading (no fallback narratives are used).

Pruning priority:
- Keep the current path and recent chapters.
- Keep decision points (subchapter C).
- Prefer dropping old or fallback entries from alternative branches.

---

## 16) Known issues and discrepancies (important for agents)

These are identified gaps or important notes about the current code:

1. **LogicPuzzleScreen navigation after puzzle completion (FIXED)**
   - After solving a logic puzzle (A/B subchapters), the player must advance to
     the next subchapter (e.g., 1B → 1C).
   - **Problem**: Various race conditions with React state caused navigation to
     go back to the same subchapter instead of advancing.
   - **Solution**: Compute the next case number directly inside the callback
     (`handleContinueAfterSolve`) using `activeCase.caseNumber` at click time,
     rather than relying on pre-computed state variables.
   - The callback uses `parseCaseNumber()` and `formatCaseNumber()` to compute
     the next case, then calls `ensureStoryContent()` before navigating.
   - File: `src/screens/LogicPuzzleScreen.js`

2. **Undefined `hasFirstDecision` in GameContext (FIXED)**
   - `GameContext.js` referenced `hasFirstDecision` without defining it.
   - This caused "Property 'hasFirstDecision' doesn't exist" errors that broke
     story progression and displayed empty narrative screens.
   - Fix: Removed the undefined variable check entirely. Background generation
     now triggers based solely on chapter number (`chapter < 12`).
   - File: `src/context/GameContext.js`

3. **C subchapter decision handling in completeLogicPuzzle (FIXED)**
   - For C subchapters (final subchapter with chapter decision), the puzzle
     completion must set `awaitingDecision: true` so the decision panel appears.
   - `completeLogicPuzzle` in GameContext now properly handles both:
     - A/B subchapters: advances `activeCaseNumber` to next subchapter
     - C subchapters: sets `awaitingDecision: true` and `pendingDecisionCase`
   - This mirrors the Evidence Board completion flow.
   - File: `src/context/GameContext.js`

4. **Large docs and prompt artifacts**
   - Files like `docs/storyreference.txt` and prompt dumps are large.
   - When updating them, use chunked reads/writes to avoid tool limits.

5. **Narrative expansion is disabled**
   - `_expandNarrative()` caused text corruption (duplicate/cut text).
   - Function exists but is not called. Do not re-enable without fixing root cause.
   - Duplicate text from LLM output is partially handled by `removeDuplicateContent()`
     in textPagination.js, but only catches exact sentence duplicates, not
     mid-sentence phrase duplications.

6. **Two prompt building paths**
   - Cached (84%): `_buildDynamicPrompt()` builds inline.
   - Uncached (16%): `_buildGenerationPrompt()` → `_buildStyleSection()`.
   - When adding optimizations, **both paths must be updated**.

7. **AppNavigator CaseFile infinite re-render loop (FIXED)**
   - When navigating to CaseFile with a `caseNumber` param (e.g., after Logic Puzzle),
     an infinite loop could occur causing "Maximum update depth exceeded" errors.
   - **Root cause**: The `openStoryCase` callback was in the useEffect dependencies.
     When `openStoryCase` dispatched `ADVANCE_CASE`, the reducer created a new
     `boardLayouts` object, which cascaded through callback dependencies
     (`assignBoardLayout` → `setActiveCaseInternal` → `openStoryCase`), causing
     the callback to be recreated and the useEffect to re-run infinitely.
   - **Solution**: Added a `lastSyncedCaseRef` ref to track already-synced cases.
     The guard `if (lastSyncedCaseRef.current === caseFromParams.caseNumber) return;`
     prevents the effect from re-running after the case has been synced once.
   - File: `src/navigation/AppNavigator.js`

8. **001C board word overlap causing "only 7 main words" warning (FIXED)**
   - When loading 001C (subchapter C decision point), repeated warnings appeared:
     "Case 3 has only 7 main words; expected 12".
   - **Root cause**: The base case `mainWords` overlapped with `branchingOutlierSets`
     words. The `extractMainWords` function filters out any mainWords that appear
     in outlierWords, leaving insufficient unique main words.
   - Overlapping words were: EVIDENCE, INVESTIGATE, CONFRONT, ACTION, RISK.
   - **Solution**: Updated 001C `mainWords` in `cases.js` to use unique words that
     don't overlap with the branching outlier sets.
   - File: `src/data/cases.js`

9. **CaseFile showing wrong case after pre-puzzle decision (FIXED)**
   - After making a pre-puzzle decision on C subchapters (e.g., 001C), the screen
     would sometimes show the wrong case (001A) instead of staying on 001C.
   - **Root cause**: Two issues:
     1. The `caseFromParams` could become stale during re-renders caused by
        state updates (like setting `preDecision`).
     2. The `openStoryCase` callback in useEffect dependencies would change
        when state cascaded, causing the effect to re-run with potentially
        stale closure values.
   - **Solution**:
     1. Store `caseFromParams` in a ref (`initialCaseRef`) on first load and
        use `stableCaseFromParams` for computing `resolvedActiveCase`.
     2. Store `openStoryCase` in a ref (`openStoryCaseRef`) and remove it from
        the useEffect dependency array to prevent unnecessary effect runs.
   - File: `src/navigation/AppNavigator.js`

10. **Pre-puzzle decision shows "Continue Investigation" instead of puzzle button (FIXED)**
    - After making a pre-puzzle decision on C subchapters, the screen would show
      "Continue Investigation" button instead of "Solve Evidence Board" button.
      Clicking it would incorrectly navigate to 001A.
    - **Root cause**: React state timing issue. When `handleConfirmOption` called
      `onSelectDecisionBeforePuzzle`, it immediately followed with `setCelebrationActive(true)`.
      This local state change triggered a re-render BEFORE the `storyCampaign` prop
      had propagated from the parent (React batches state updates asynchronously).
      During that intermediate re-render, `preDecision` was still undefined, so
      `hasPreDecision` was false, causing `storyPromptConfig` to fall through to
      the "Continue Investigation" case based on `pendingStoryAdvance`.
    - **Solution**: Added `localPreDecisionKey` local state in CaseFileScreen that
      tracks when a pre-decision was made in the current session. This state is:
      1. Set synchronously in `handleConfirmOption` BEFORE calling the async prop
      2. Used in `hasPreDecision` calculation: `(preDecision?.caseNumber === caseNumber) || (localPreDecisionKey && isSubchapterC)`
      3. Reset when `caseNumber` changes (via useEffect)
      This ensures immediate UI feedback without waiting for prop propagation.
    - File: `src/screens/CaseFileScreen.js`

11. **selectDecisionBeforePuzzle uses stale activeCaseNumber (FIXED)**
    - After making a pre-puzzle decision on C subchapters, the decision could be saved
      against the wrong case number or rejected entirely.
    - **Root cause**: Both `useStoryEngine.selectDecisionBeforePuzzle` and
      `StoryContext.selectDecisionBeforePuzzleAndGenerate` read `storyCampaign.activeCaseNumber`
      from state, which could be stale if React's state updates hadn't propagated yet.
      The CaseFileScreen knew the correct case (from props), but the backend functions
      used potentially outdated state.
    - **Symptoms in logs**:
      - `WARN [useStoryEngine] selectDecisionBeforePuzzle called on non-C subchapter: 001A`
      - When the user was actually on 001C
      - Generation triggered for wrong chapter context
    - **Solution**: Added `explicitCaseNumber` parameter to both functions:
      1. `CaseFileScreen` now passes `caseNumber` as third argument to `onSelectDecisionBeforePuzzle`
      2. `selectDecisionBeforePuzzleAndGenerate` accepts and uses this explicit caseNumber
      3. `useStoryEngine.selectDecisionBeforePuzzle` accepts and uses this explicit caseNumber
      4. Both functions fall back to state if explicit caseNumber not provided (backward compatible)
      5. Added C subchapter validation in StoryContext to catch mismatches early
    - Files: `src/screens/CaseFileScreen.js`, `src/hooks/useStoryEngine.js`, `src/context/StoryContext.js`

12. **Duplicate "SUBCHAPTER CHAIN" triggers per subchapter (FIXED)**
    - When completing a branching narrative, the chain generation was triggered twice,
      causing duplicate "CHAIN COMPLETE" log messages.
    - **Root cause**: `saveBranchingChoiceAndPrefetch` called `triggerPrefetchAfterBranchingComplete`
      on every save that returned `true`. The branching flow calls save twice:
      1. `handleSecondChoice` saves with `isComplete: false` (player made choice, still reading)
      2. `handleBranchingComplete` saves with `isComplete: true` (finished reading)
      Both calls returned `true` and both triggered the chain. The deduplication in
      `StoryGenerationService` caught the second call ("Reusing pending generation"),
      but both completion callbacks were still executed.
    - **Symptoms in logs**:
      - `[useStoryGeneration] ✅ CHAIN COMPLETE: 001B generated in 60.5s`
      - `[useStoryGeneration] ✅ CHAIN COMPLETE: 001B generated in 62.3s`
    - **Solution**: Only trigger `triggerPrefetchAfterBranchingComplete` when `isComplete: false`.
      This ensures the chain is triggered once when the player makes their second choice,
      giving maximum generation time while the player reads the narrative ending text.
      Triggering on `isComplete: true` (finished reading) would waste valuable generation time.
    - File: `src/context/StoryContext.js`

---

## 17) Extending the system safely

When adding features or modifying behavior, maintain these invariants:

- Always preserve the path key formats:
  - Chapter path key: cumulative A/B choices, like `BAA`.
  - Branching path key: `1B-2C` style, do not prepend the first choice twice.
- Keep two-call approach for `pathDecisions`.
  - Do not attempt to embed 9 decisions into a single schema.
- Keep narrative-first flow for C subchapters.
  - Trigger generation as soon as the decision is made.
- Preserve cache usage and thought signatures.
  - Thought signatures are required for Gemini 3 function calls and image tasks,
    and recommended for continuity between text calls.
- Avoid changing prompt constraints without updating validation logic and
  schemas in tandem.
- When changing word count targets:
  - Ensure segment targets (3×N) exceed the minimum word count.
  - Update both `GENERATION_CONFIG.wordCount` and schema descriptions.
  - Do not re-enable `_expandNarrative()` - it causes text corruption.
- When changing maxTokens:
  - Account for thinking token overhead (50-80% with high thinking).
  - Use generous values for complex tasks (arc planning, outlines).
- Always log errors in catch blocks - never silently swallow exceptions.

---

## 18) Environment configuration

- `.env` and `app.config.js` control LLM access:
  - `GEMINI_PROXY_URL` (production proxy).
  - `APP_TOKEN` (optional proxy auth).
  - `GEMINI_API_KEY` (dev direct mode only).

Use the proxy in production to keep API keys off-device.

---

## 19) Recent changes (Jan 2026 - Prompt debugging session)

### 19.1 Character age update

Jack Halloway's age was changed from **29 to 35** across all files to fix
mathematical inconsistencies (a 29-year-old with "10 years" of career experience
was tight). Updated files:

- `src/data/storyBible.js`: ABSOLUTE_FACTS.jackAge, timeline entries
- `src/data/characterReference.js`: CHARACTERS.jackHalloway.age and appearance
- `src/services/StoryGenerationService.js`: All prompt strings referencing Jack's age

The change from "late 20s/early 30s" to explicit "35" improves consistency
between the story bible and generation prompts.

### 19.2 Prompt logging system

Added comprehensive prompt logging to see exactly what the LLM receives.
New method `_logCompletePrompt()` in StoryGenerationService outputs:

- System instruction (calls `buildMasterSystemPrompt()` to show actual content)
- Cached content (if using chapter-start cache)
- Dynamic prompt (story context, threads, task, etc.)

Logs appear as `[FULL PROMPT] 001B (Chapter 1.2) - CACHED GENERATION` in console.
This helps debug issues where the LLM receives unexpected context.

### 19.3 Prompt construction bug fixes

Three bugs in prompt construction were fixed:

1. **Thread truncation (line 3693)**
   - Bug: Regex `.{0,50}pattern.{0,50}` could start mid-word, causing
     "Victoria Blackwell" to become "oria Blackwell"
   - Fix: Use `matchAll()` to get position info, then trim to word boundaries
     when the match starts or ends mid-word

2. **Location detection (lines 4540-4565)**
   - Bug: Loop broke on first pattern match, missing later locations
   - Fix: Collect ALL matches from ALL patterns, track position with `match.index`,
     return the location appearing LAST in the narrative
   - Added more prepositions: "doors of", "stood in/at", "was in/at", etc.
   - Added more location types: Cafe, Club, Hotel, Tavern, Pub, etc.
   - Added fallback pattern for "[Name]'s [LocationType]" format

3. **Chapter range display (line 5649)**
   - Bug: When `chapter=1`, passing `maxChapter: 0` showed "Included chapters: 1 to 0"
   - Fix: Added guard that returns "This is the beginning of the story" when
     `maxChapter < minChapter`

### 19.4 Reset Progress clears generated story

The "Reset Progress" button in Settings now also clears generated story content.
Previously it only reset progress state, leaving old LLM-generated narratives
in AsyncStorage.

Updated file: `src/hooks/usePersistence.js`

The `clearProgress()` callback now calls `clearGeneratedStory()` from
`generatedStoryStorage.js`, ensuring:
- Story bible changes (like age updates) take effect on replay
- Player gets fresh LLM-generated content after reset
- No stale narrative data persists across playthroughs

### 19.5 Character reference cleanup (comprehensive)

**Only Jack Halloway and Victoria Blackwell are canonical characters.** The LLM
has creative freedom to generate any supporting characters as the story requires.
This is now enforced throughout the codebase.

#### Removed from StoryGenerationService.js

**Timeline validations removed** (previously blocked generation):
- Tom Wade friendship (30 years)
- Sarah partnership (13 years)
- Silas partnership (8 years)
- Eleanor imprisonment (8 years)
- Emily case (7 years ago)

**Voice validation patterns removed**:
- Voice signatures for Sarah, Eleanor, Silas, Tom, Grange
- Now only validates Victoria's voice (must not sound casual)

**Character tracking simplified**:
- Character knowledge tracker: only tracks Jack and Victoria
- Character dialogue history extraction: only extracts Victoria's dialogue
- Voice DNA section: only includes Jack and Victoria
- Character name variants: only Jack/Halloway and Victoria/Blackwell

**Legacy lore removed**:
- Victoria=Emily references and validation rules
- "Midnight Cartographer" alias
- "Confessor" alias

**Character-specific mechanics removed**:
- SarahTrust mechanics (trust increase/decrease)
- Silas-specific foreshadowing hooks (now generic "gatekeeper" patterns)

**Character lists simplified** (now only canonical characters):
- Stopwords for keyword extraction
- Thread normalization character detection
- Thread similarity calculation
- Fact indexing by character
- Scene character extraction

**Schema examples updated**:
- Replaced "Mention Tom's name" with "Change the subject"
- Replaced "meet Sarah at the docks" with "meet his contact at the docks"
- Replaced "confront the confessor" with "investigate the warehouse"

#### Removed from characterReference.js

- Removed 'cartographer' from `getVoiceDNA()` lookup
- Removed 'cartographer' from `getCharacter()` lookup

#### What remains (for post-processing only)

Name correction patterns now only target canonical names (Jack/Victoria) and
the canonical city name (Ashport). Non-canonical character misspellings were
removed to avoid implicitly legitimizing them in validation.

### 19.6 Victoria alias removal

(See section 19.5 for comprehensive details)

Removed aliases: "Midnight Cartographer", "Confessor", and "Emily" (legacy lore).
Victoria is now referred to only as "Victoria" or "Blackwell".

### 19.7 Reveal timing consistency

Fixed inconsistent reveal timing references throughout the codebase:
- **Correct timing**: First undeniable reveal occurs at END of Chapter 1C
- Fixed multiple places that incorrectly said "end of 2A"

### 19.8 Static 1A prose improvements

Improved the static Chapter 1A content in `storyNarrative.json`:
- Removed 3 instances of "somehow" (forbidden word per style guide)
- Replaced with stronger, more specific prose

### 19.9 Architecture refactor: Single source of truth

**Major refactoring** of `StoryGenerationService.js` to eliminate hardcoded
duplicates and establish `storyBible.js` as the single source of truth.

#### Problem solved

Previously, StoryGenerationService.js had hardcoded strings that duplicated
content from storyBible.js:
- Jack's age/description appeared in 6+ places as hardcoded strings
- Reveal timing rules were duplicated
- POV/tense rules were duplicated
- Character details were inconsistent between files

This caused sync issues when updating canonical data (e.g., changing Jack's age
required updates in multiple places, some of which were missed).

#### New architecture

```
storyBible.js (DATA)              StoryGenerationService.js (ASSEMBLY)
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│ ABSOLUTE_FACTS           │─────▶│ buildMasterSystemPrompt()           │
│ WRITING_STYLE            │─────▶│ buildPathDecisionsSystemPrompt()    │
│ CONSISTENCY_RULES        │─────▶│ _buildGroundingSection()            │
│ ENGAGEMENT_REQUIREMENTS  │─────▶│ _buildCraftTechniquesSection()      │
│ MICRO_TENSION_TECHNIQUES │─────▶│ _buildStyleSection()                │
│ SENTENCE_RHYTHM          │─────▶│ _buildCharacterSection()            │
│ EXAMPLE_PASSAGES         │─────▶│ buildExtendedStyleExamples()        │
│ ANNOTATED_EXAMPLES       │─────▶│ etc...                              │
│ NEGATIVE_EXAMPLES        │      │                                     │
└──────────────────────────┘      │ NO hardcoded prompt prose           │
                                  └─────────────────────────────────────┘
```

#### Key changes

1. **`MASTER_SYSTEM_PROMPT` → `buildMasterSystemPrompt()`**
   - Converted from hardcoded 80-line const to dynamic builder function
   - Now reads from: ABSOLUTE_FACTS, WRITING_STYLE, CONSISTENCY_RULES,
     ENGAGEMENT_REQUIREMENTS, MICRO_TENSION_TECHNIQUES, SENTENCE_RHYTHM
   - `<reveal_timing>` section pulls directly from CONSISTENCY_RULES[1-4]
   - `<craft_quality_checklist>` references ENGAGEMENT_REQUIREMENTS
   - All 6 usages updated to call the function

2. **`buildPathDecisionsSystemPrompt()`**
   - Already converted (earlier in session)
   - Uses ABSOLUTE_FACTS.protagonist, antagonist, setting

3. **Character details refactored**
   - Replaced hardcoded "Jack Halloway, 35, burned-out freelance investigator"
     with template literals using `ABSOLUTE_FACTS.protagonist.fullName`,
     `protagonist.age`, `protagonist.formerTitle`, etc.
   - Updated in: `_generateStoryArc()`, `_createFallbackStoryArc()`,
     `_generateDecisionConsequence()`, `_validateWithLLM()`,
     `_buildExpansionGrounding()`

4. **Reveal timing fixed**
   - All references to "2A" changed to "1C" to match CONSISTENCY_RULES
   - First undeniable reveal happens at END of Chapter 1C

#### Benefits

- **Single source of truth**: Change data in storyBible.js, all prompts update
- **No sync issues**: POV, tense, reveal timing, character details defined once
- **Consistent pattern**: All `_build*Section()` methods now follow same pattern
- **Easier maintenance**: Canonical data lives in one file
- **Logging works**: `_logCompletePrompt()` calls `buildMasterSystemPrompt()`
  to show actual prompt content during gameplay

#### Verification checklist

All prompt sections remain included:
- ✅ System prompt (now dynamic via builder)
- ✅ Story bible grounding (ABSOLUTE_FACTS)
- ✅ Character reference (CHARACTER_REFERENCE)
- ✅ Craft techniques (ENGAGEMENT_*, MICRO_TENSION, ICEBERG, SUBTEXT)
- ✅ Style examples (EXAMPLE_PASSAGES - 10 examples)
- ✅ Extended examples (EXTENDED_STYLE_GROUNDING - 4 scenes)
- ✅ Annotated examples (ANNOTATED_EXAMPLES - 19 examples)
- ✅ Negative examples (NEGATIVE_EXAMPLES - 4 examples)
- ✅ Many-shot examples (manyShot/index)
- ✅ Voice DNA (CHARACTER_REFERENCE)
- ✅ Forbidden phrases (WRITING_STYLE.absolutelyForbidden)
- ✅ Caching mechanism (uses buildMasterSystemPrompt() for systemInstruction)

### 19.10 Puzzle system simplification (evidence board)

**Major simplification** of the evidence board puzzle system in `StoryGenerationService.js`.
The puzzle word generation has been replaced with a static word list, pending a puzzle redesign.

#### Changes made

1. **`_generateBoardData()` simplified**
   - No longer uses narrative text for word generation
   - Returns a static 16-word list that gets shuffled
   - Still supports decision-point branching (splits into two sets of outliers)
   - Words: SHADOW, TRUTH, GLYPH, SILVER, TOKEN, ANCHOR, THRESHOLD, PATTERN,
     WITNESS, CIPHER, SIGNAL, TRACE, HIDDEN, PASSAGE, ARCHIVE, REFLECT

2. **Removed `puzzleCandidates` from schemas**
   - Removed from `STORY_CONTENT_SCHEMA` (properties and required array)
   - Removed from `DECISION_CONTENT_SCHEMA` (properties and required array)
   - LLM no longer generates puzzle word candidates

3. **Removed puzzle helper methods (~700 lines)**
   - `_extractKeywordsFromNarrative()` - keyword extraction from narrative text
   - `_selectOutlierWords()` - outlier word selection with theming
   - `_getSemanticClusters()` - 230+ line static semantic cluster definitions
   - `_extractDynamicClusters()` - dynamic cluster extraction from narrative
   - `_areSemanticallySimilar()` - semantic similarity checking
   - `_validatePuzzleSemanticsSync()` - sync semantic validation
   - `_validatePuzzleSemanticsWithLLM()` - async LLM-based validation
   - `_selectThemedWords()` - themed word selection for decisions
   - `_determineTheme()` - theme determination from outlier words

4. **Fixed undefined method bug**
   - `_extractAllTextFromBranchingNarrative()` was called but never defined
   - Replaced with direct use of `generatedContent.narrative` for word count

#### Result

- StoryGenerationService.js reduced from ~11,800 lines to ~10,100 lines
- Evidence board still functions with static words
- LLM generation is faster (no puzzleCandidates in output)
- Clean separation: puzzle will be redesigned separately from story generation

#### Why this change

The evidence board puzzle is being redesigned. Rather than maintain complex
semantic clustering code that will be replaced, a static word list provides:
- Consistent puzzle behavior during transition
- Reduced LLM token usage
- Simpler debugging
- Clear separation of concerns

### 19.11 Fallback narrative system removal

Removed the entire fallback narrative system from `StoryGenerationService.js`:

1. **Removed methods**
   - `_initializeFallbackTemplates()` - 140+ lines of hardcoded story paragraphs
   - `_normalizeFallbackTemplatesToThirdPerson()` - POV conversion
   - `_getFallbackContent()` - fallback content retrieval
   - `_generateMinimalFallback()` - minimal fallback generation
   - `_buildContextAwareFallback()` - context-aware fallback building

2. **Removed dead code**
   - `_generateStoryArc()` - LLM-based arc generation (never called)
   - `_generateChapterOutline()` - LLM-based outline generation (never called)
   - These methods were defined but never invoked; the "fallback" methods
     were actually the primary implementation

3. **Refactored methods**
   - `_createFallbackStoryArc` renamed to `_createStoryArc`
   - `_createFallbackChapterOutline` renamed to `_createChapterOutline`
   - Both now read from `STORY_STRUCTURE` in storyBible.js
   - `_getPacingGuidance` now reads from `STORY_STRUCTURE.pacing`

4. **Fixed hardcoded character references**
   - Replaced 25+ hardcoded "Jack Halloway" / "Victoria Blackwell" references
   - Now uses template literals with storyBible.js data
   - Example: `${protagonist.fullName}` instead of `'Jack Halloway'`

#### Result

- ~840 lines of fallback code removed
- Cleaner architecture: story bible is the single source of truth
- No more duplicate character data in service file

### 19.12 Case file screen UI simplification (Jan 2026)

Simplified the CaseFileScreen UI for a cleaner, more immersive narrative experience:

1. **Title section cleanup**
   - Removed "CASE FILE #001A" label from hero section - title now stands alone
   - Opening case (001A) renamed from "Dead Letter Office" to "The Visitor"
   - Title font size reduced for better proportions
   - Reduced padding throughout hero and content sections

2. **Bridge text/summary changes**
   - Chapter 1A (opening case) now skips the bridge text entirely
   - Summary panel tape decorations removed to reduce visual clutter
   - Spacing between title and content sections tightened

3. **Narrative journal cleanup**
   - Removed ALL segment labels from BranchingNarrativeReader
   - Previously showed "CASE FILE", "INVESTIGATION", "CONCLUSION" on pages
   - Now narrative starts cleanly without labels

4. **Navigation button**
   - Changed "Back to Results" to "Menu" - clearer for narrative-first flow
   - The case file screen is now the entry point, not a post-puzzle screen

#### Files modified

- `src/data/cases.js` - Changed 001A title
- `src/components/case-file/CaseHero.js` - Removed case number, reduced sizing
- `src/components/case-file/CaseSummary.js` - Removed tape decorations
- `src/components/BranchingNarrativeReader.js` - Removed segment labels
- `src/screens/CaseFileScreen.js` - Skip summary for 001A, reduced spacing

### 19.13 Story bible alignment + validation gating (Jan 2026)

**Story structure now drives runtime constants**
- `StoryGenerationService` derives chapter count, subchapter count, and the
  decision subchapter from `STORY_STRUCTURE` (no hardcoded 12/3/3).

**Reveal timing + setup/payoff moved to storyBible**
- Added `REVEAL_TIMING` and `SETUP_PAYOFF_REGISTRY` to `storyBible.js`.
- `StoryGenerationService` now uses these for:
  - Reveal timing checks (premature Under-Map exposure).
  - Setup/payoff validation (including payoff regex patterns).

**Path decision prompt safety**
- Template replacement now enforces all placeholders are filled.
- Unresolved placeholders throw with a clear error to avoid silent prompt
  corruption.

**Validation gating**
- New config toggles in `GENERATION_CONFIG.qualitySettings`:
  - `enableProseQualityValidation`
  - `enableSentenceVarietyValidation`
  - `enableLLMValidation`
- Defaults are `true`; can be disabled for low-latency gameplay.

**Removed unused helpers**
- Deleted unused fallback/expansion helpers (`_expandNarrative`,
  `_buildExpansionGrounding`, `getEmergencyFallback`, dramatic irony section).

---

## 20) What to read first if you are new

Recommended order for a fresh AI agent:

1. `src/services/StoryGenerationService.js`
2. `src/services/LLMService.js`
3. `src/data/storyBible.js`
4. `src/data/storyContent.js`
5. `src/context/StoryContext.js`
6. `src/hooks/useStoryGeneration.js`
7. `src/utils/caseMerger.js`
8. `src/screens/CaseFileScreen.js`
9. `src/components/BranchingNarrativeReader.js`
10. `src/storage/generatedStoryStorage.js`

This order gives you the full story system first, then UI and persistence.

