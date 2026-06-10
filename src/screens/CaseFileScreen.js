import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image as RNImage,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Audio } from 'expo-av';

import ScreenSurface from "../components/ScreenSurface";
import SecondaryButton from "../components/SecondaryButton";
import PrimaryButton from "../components/PrimaryButton";
import NarrativePager from "../components/NarrativePager";
import BranchingNarrativeReader from "../components/BranchingNarrativeReader";
import CaseHero from "../components/case-file/CaseHero";
import CaseSummary from "../components/case-file/CaseSummary";
import DecisionPanel from "../components/case-file/DecisionPanel";
import { useGame } from "../context/GameContext";
import { FIELD_NOTES } from "../data/fieldNotes";
import FieldNoteCard from "../components/FieldNoteCard";

import { FONTS, FONT_SIZES } from "../constants/typography";
import { COLORS } from "../constants/colors";
import { SPACING, RADIUS } from "../constants/layout";
import useResponsiveLayout from "../hooks/useResponsiveLayout";
import { createCasePalette } from "../theme/casePalette";
import { getStoryEntry, ROOT_PATH_KEY, buildRealizedNarrative, fragmentsOnRealizedPath, getStoryEntryAsync, parseCaseNumber, computeBranchPathKey } from "../data/storyContent";
import { getPuzzleActionLabel, getPuzzleMode, PUZZLE_MODE } from "../utils/puzzleMode";
import { resolveStoryDecision, decisionOptionsFrom } from "../utils/storyDecision";
import {
  formatCountdown,
  parseDailyIntro,
  splitSummaryLines,
} from "../utils/caseFileHelpers";
import { paginateNarrativeSegments, calculatePaginationParams } from "../utils/textPagination";
import { isLayer1Partial, secondChoiceResponsesNeeded } from "../services/storyGeneration/lazyBranching";

const NOISE_TEXTURE = require("../../assets/images/ui/backgrounds/noise-texture.png");
const CORKBOARD_BG = require("../../assets/images/ui/backgrounds/corkboardbg.jpg");
const BOARD_CORNER_TL = require("../../assets/images/ui/decorative/corner-ornament-tl.png");
const BOARD_CORNER_TR = require("../../assets/images/ui/decorative/corner-ornament-tr.png");
const BOARD_CORNER_BL = require("../../assets/images/ui/decorative/corner-ornament-bl.png");
const BOARD_CORNER_BR = require("../../assets/images/ui/decorative/corner-ornament-br.png");

const FONT_TWEAK_FACTOR = 0.95;
const shrinkFont = (value) => Math.max(10, Math.floor(value * FONT_TWEAK_FACTOR));

// Ambient sound asset can fail to decode on some devices; log it once, not on
// every mount, to keep the console readable.
let ambientSoundWarned = false;

export default function CaseFileScreen({
  activeCase,
  nextUnlockAt,
  storyCampaign,
  solvedCaseIds = [],
  onSelectDecision,
  onSelectDecisionBeforePuzzle, // NARRATIVE-FIRST: Pre-puzzle decision for C subchapters
  onSaveBranchingChoice, // TRUE INFINITE BRANCHING: Save player's path through interactive narrative
  onEnsureSecondChoiceResponses, // LAZY BRANCHING: fill second-choice responses on demand
  onProceedToPuzzle, // NARRATIVE-FIRST FLOW: Navigate to puzzle after narrative complete
  onIngestFragments, // UNDER-MAP: ingest scene fragments/relations into the board
  onResolveBelief, // UNDER-MAP: bear out a sealed belief when the scene resolves it (Clarity)
  onNameFoil, // UNDER-MAP: pin The Other Reader's name when a scene first names them
  onBack,
  isStoryMode = false,
  onContinueStory,
  onReturnHome,
  isGenerating = false,
  generationStatus,
  generationError,
  // Background resilience: auto-retry after returning from background
  shouldAutoRetry = false,
  getPendingGeneration,
  onAutoRetry,
}) {
  const { width: screenWidth, sizeClass, moderateScale, scaleSpacing, scaleRadius } = useResponsiveLayout();
  const compact = sizeClass === "xsmall" || sizeClass === "small";
  const medium = sizeClass === "medium";
  const { progress: gameProgress, markLessonSeen } = useGame();
  const reducedMotion = !!gameProgress?.settings?.reducedMotion;

  // Audio: Ambient Background
  const [sound, setSound] = useState();

  useEffect(() => {
    let soundObject = null;
    
    async function loadAmbientSound() {
      try {
        // Unload any existing sound first if necessary
        if (soundObject) await soundObject.unloadAsync();
        
        const { sound } = await Audio.Sound.createAsync(
           require("../../assets/audio/music/menu-ambient.mp3"),
           { isLooping: true, volume: 0.15, shouldPlay: true }
        );
        soundObject = sound;
        setSound(sound);
      } catch (error) {
        if (!ambientSoundWarned) {
          ambientSoundWarned = true;
          console.warn("[CaseFile] Ambient sound failed to load (logged once):", error?.message || error);
        }
      }
    }
    
    loadAmbientSound();
    
    return () => {
       if (soundObject) {
         soundObject.unloadAsync();
       }
    };
  }, []);

  const storyUnlockAt = storyCampaign?.nextStoryUnlockAt;
  const unlockTarget = storyUnlockAt || nextUnlockAt;
  const [countdown, setCountdown] = useState(formatCountdown(unlockTarget));
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!unlockTarget) {
      setCountdown(null);
      return undefined;
    }
    const tick = () => {
      setCountdown(formatCountdown(unlockTarget));
    };
    tick();
    // Use 5s interval to reduce re-renders (60/min -> 12/min)
    const timer = setInterval(tick, 5000);
    return () => clearInterval(timer);
  }, [unlockTarget]);

  // Background resilience: auto-retry when returning from background after network failure
  const autoRetryTriggeredRef = useRef(false);
  useEffect(() => {
    if (shouldAutoRetry && !autoRetryTriggeredRef.current && onAutoRetry) {
      autoRetryTriggeredRef.current = true;
      console.log('[CaseFileScreen] Auto-retry triggered after background return');
      // Brief delay so user sees "Reconnecting..." message
      const timer = setTimeout(() => {
        onAutoRetry();
      }, 1500);
      return () => clearTimeout(timer);
    }
    if (!shouldAutoRetry) {
      autoRetryTriggeredRef.current = false;
    }
  }, [shouldAutoRetry, onAutoRetry]);

  const palette = useMemo(() => createCasePalette(activeCase), [activeCase]);

  // Layout Metrics
  const horizontalPadding = scaleSpacing(compact ? 0 : medium ? SPACING.xs : SPACING.sm);
  const verticalPadding = scaleSpacing(compact ? SPACING.lg : SPACING.xl);
  const contentGap = scaleSpacing(compact ? SPACING.md : SPACING.lg);
  const boardFrameRadius = scaleRadius(RADIUS.xl + 6);
  const boardRadius = scaleRadius(RADIUS.xl);
  const boardContentPaddingH = scaleSpacing(compact ? SPACING.xs : SPACING.sm);
  const boardContentPaddingV = scaleSpacing(compact ? SPACING.xs : SPACING.sm);
  const boardShadowRadius = Math.max(18, scaleSpacing(SPACING.xl));
  const boardShadowOffsetY = scaleSpacing(SPACING.md);
  const sectionGap = scaleSpacing(compact ? SPACING.xs : SPACING.sm);
  
  const boardGlowSize = Math.max(220, Math.round(scaleSpacing(compact ? SPACING.xxl : SPACING.xxl + SPACING.sm)));
  const pinSize = Math.max(14, Math.round(moderateScale(compact ? 18 : 22)));
  const pinOffset = Math.max(12, Math.round(pinSize * 0.65));
  const boardTapeWidth = Math.max(72, Math.round(scaleSpacing(compact ? SPACING.xxl : SPACING.xxl + SPACING.sm)));
  const boardTapeHeight = Math.max(18, Math.round(scaleSpacing(SPACING.sm) + 6));
  const boardTapeOffset = scaleSpacing(SPACING.xl);

  // Typography Constants
  const narrativeSize = shrinkFont(moderateScale(FONT_SIZES.md));
  const narrativeLineHeight = Math.round(narrativeSize * (compact ? 1.56 : 1.68));
  const slugSize = shrinkFont(moderateScale(FONT_SIZES.xs));
  const footerLabelSize = shrinkFont(moderateScale(FONT_SIZES.xs));
  const footerValueSize = shrinkFont(moderateScale(compact ? FONT_SIZES.md : FONT_SIZES.lg));

  // Data Processing
  const dailyIntro = useMemo(() => parseDailyIntro(activeCase?.dailyIntro), [activeCase?.dailyIntro]);

  const caseSummary = useMemo(() => {
    if (typeof activeCase?.briefing?.summary === "string" && activeCase.briefing.summary.trim()) {
      return activeCase.briefing.summary.trim();
    }
    return null;
  }, [activeCase?.briefing?.summary]);

  const storyMeta = useMemo(() => {
    if (activeCase?.storyMeta) return activeCase.storyMeta;
    const caseNumber = typeof activeCase?.caseNumber === "string" ? activeCase.caseNumber : null;
    if (!caseNumber) return null;

    const chapterSlice = caseNumber.slice(0, 3);
    const chapterNumber = Number(chapterSlice);
    const chapterKey = Number.isNaN(chapterNumber) ? null : chapterNumber;
    const pathKey = (chapterKey && storyCampaign?.pathHistory && storyCampaign.pathHistory[chapterKey]) ||
      storyCampaign?.currentPathKey || ROOT_PATH_KEY;

    // TRUE INFINITE BRANCHING: Check if we have a branching choice from the previous subchapter
    // If so, use it to look up speculatively cached content
    const subchapterLetter = caseNumber.slice(3, 4);
    let previousBranchingPath = null;

    if (subchapterLetter === 'B' || subchapterLetter === 'C') {
      // Find the previous subchapter's case number
      const prevLetter = subchapterLetter === 'B' ? 'A' : 'B';
      const prevCaseNumber = `${chapterSlice}${prevLetter}`;

      // Look for the branching choice from that case
      const branchingChoices = storyCampaign?.branchingChoices || [];
      const prevChoice = branchingChoices.find(bc => bc.caseNumber === prevCaseNumber);
      if (prevChoice?.secondChoice) {
        previousBranchingPath = prevChoice.secondChoice;
      }
    }

    return getStoryEntry(caseNumber, pathKey, previousBranchingPath) || null;
  }, [activeCase?.caseNumber, activeCase?.storyMeta, storyCampaign]);

  // UNDER-MAP: fragments are collected by EXAMINING (tapping anomalies in the prose).
  // For scenes WITHOUT a branching narrative reader (no prose to tap), fall back to
  // ingesting the whole scene at load so the board still fills. Branching scenes
  // ingest via tap + a completion backfill (see handleBranchingComplete) so no
  // uncollected fragment is ever lost before the CONNECT/THEORY beat.
  const ingestedCaseRef = useRef(null);
  useEffect(() => {
    if (typeof onIngestFragments !== "function") return;
    const caseNumber = storyMeta?.caseNumber || activeCase?.caseNumber;
    if (!caseNumber) return;
    if (ingestedCaseRef.current === caseNumber) return;
    const hasReader = Boolean(
      (storyMeta?.branchingNarrative || activeCase?.branchingNarrative)?.opening?.text,
    );
    if (hasReader) return; // collected inline / backfilled on completion
    const fragments = Array.isArray(storyMeta?.fragments) ? storyMeta.fragments : [];
    const relations = Array.isArray(storyMeta?.relations) ? storyMeta.relations : [];
    if (!fragments.length && !relations.length) return;
    ingestedCaseRef.current = caseNumber;
    onIngestFragments(fragments, relations, {
      caseNumber,
      chapter: storyMeta?.chapter,
      subchapter: storyMeta?.subchapter,
    });
  }, [storyMeta, activeCase?.caseNumber, onIngestFragments]);

  const storySummary = useMemo(() => {
    if (!storyMeta) return null;
    const subchapterIndex = Number(storyMeta.subchapter);
    
    if (subchapterIndex === 1 && typeof storyMeta.previously === "string" && storyMeta.previously.trim()) {
      const lines = splitSummaryLines(storyMeta.previously);
      if (lines.length) return { lines, kind: "previously" };
    }
    
    if (subchapterIndex > 1 && typeof storyMeta.bridgeText === "string" && storyMeta.bridgeText.trim()) {
      const lines = splitSummaryLines(storyMeta.bridgeText);
      if (lines.length) return { lines, kind: "bridgeText" };
    }
    return null;
  }, [storyMeta]);

  const summaryContent = useMemo(() => {
    // Skip summary for the opening case - let the narrative speak for itself
    const currentCaseNumber = activeCase?.caseNumber;
    if (currentCaseNumber === '001A') return null;

    if (storySummary?.lines?.length) {
      return {
        type: "storyMeta",
        lines: storySummary.lines,
        focus: null,
        slug: null,
        showSlugSeparately: false,
      };
    }
    if (dailyIntro) {
      const { slug, focus, lines } = dailyIntro;
      if (!slug && !focus && !lines.length) return null;
      return {
        type: "dailyIntro",
        lines,
        focus,
        slug,
        showSlugSeparately: Boolean(slug && focus),
      };
    }
    if (caseSummary) {
      const lines = splitSummaryLines(caseSummary);
      if (!lines.length) return null;
      return { type: "caseSummary", lines, focus: null };
    }
    return null;
  }, [activeCase?.caseNumber, caseSummary, dailyIntro, storySummary]);

  // Check if we have branching narrative (new interactive format)
  const sourceBranchingNarrative = useMemo(() => {
    return storyMeta?.branchingNarrative || activeCase?.branchingNarrative || null;
  }, [storyMeta?.branchingNarrative, activeCase?.branchingNarrative]);

  // LAZY BRANCHING: when second-choice responses are generated on demand, hold
  // the merged narrative locally so the reader sees the filled-in responses.
  const [lazyBranchingNarrative, setLazyBranchingNarrative] = useState(null);
  const [lazyLoadingFor, setLazyLoadingFor] = useState(null); // firstChoice key currently generating
  const branchingNarrative = lazyBranchingNarrative || sourceBranchingNarrative;

  const hasBranchingNarrative = Boolean(branchingNarrative?.opening?.text);

  // UNDER-MAP / EXAMINE: this scene's collectable fragments + their relations.
  const sceneFragments = useMemo(
    () => (Array.isArray(storyMeta?.fragments) ? storyMeta.fragments : []),
    [storyMeta?.fragments],
  );
  const sceneRelations = useMemo(
    () => (Array.isArray(storyMeta?.relations) ? storyMeta.relations : []),
    [storyMeta?.relations],
  );

  // UNDER-MAP ECHO: callbacks tying this scene to truths the player already
  // revealed. Only shown when the player actually HAS revealed something — so a
  // player who skipped the connections never sees "this follows from what you mapped."
  const sceneEchoes = useMemo(
    () => (Array.isArray(storyMeta?.echoes) ? storyMeta.echoes.filter((e) => e && e.line) : []),
    [storyMeta?.echoes],
  );
  const hasRevealedNodes = (storyCampaign?.underMap?.nodes?.length || 0) > 0;
  const showEcho = isStoryMode && hasRevealedNodes && sceneEchoes.length > 0;

  // BELIEF RESOLUTION (Move 3): when a generated scene reports that a sealed
  // belief was borne out (or subverted), record it so the player's Clarity
  // accrues. The context action is idempotent; a ref keeps it to once per case.
  const resolvedBeliefRef = useRef(null);
  useEffect(() => {
    if (typeof onResolveBelief !== "function") return;
    const br = storyMeta?.beliefResolution;
    if (!br || !Number.isFinite(Number(br.resolvesChapter)) || typeof br.correct !== "boolean") return;
    const sceneKey = storyMeta?.caseNumber || activeCase?.caseNumber || null;
    const applyKey = `${sceneKey}:${br.resolvesChapter}`;
    if (resolvedBeliefRef.current === applyKey) return;
    resolvedBeliefRef.current = applyKey;
    onResolveBelief({ chapter: Number(br.resolvesChapter), correct: br.correct });
  }, [storyMeta?.beliefResolution, storyMeta?.caseNumber, activeCase?.caseNumber, onResolveBelief]);

  // THE OTHER READER: when a scene names the foil (presence >= 2), pin the name once
  // so it stays fixed across chapters. nameUnderMapFoil is idempotent (skips if the
  // foil is already named), so firing on every render with a name is safe.
  useEffect(() => {
    const name = storyMeta?.foilName;
    if (typeof onNameFoil === "function" && typeof name === "string" && name.trim()) {
      onNameFoil(name.trim());
    }
  }, [storyMeta?.foilName, onNameFoil]);

  // BELIEF VERDICT (Consequence): when this scene resolves a belief the player
  // sealed earlier, show the verdict up front — the reciprocity moment that makes
  // the Theory beat matter ("you believed X; tonight it held / was subverted").
  const beliefVerdict = useMemo(() => {
    const br = storyMeta?.beliefResolution;
    if (!isStoryMode || !br || typeof br.correct !== "boolean") return null;
    const ch = Number(br.resolvesChapter);
    if (!Number.isFinite(ch)) return null;
    const theories = storyCampaign?.underMap?.theories || [];
    const belief = (theories.find((t) => t.chapter === ch) || {}).interpretation || null;
    if (!belief && !br.line) return null;
    // When the reading is subverted, name the road not taken gaining ground.
    const foilObj = storyCampaign?.underMap?.foil || null;
    const foilBelief = !br.correct && foilObj && foilObj.belief ? foilObj.belief : null;
    return { correct: br.correct, line: (br.line || "").trim(), belief, foilBelief };
  }, [storyMeta?.beliefResolution, storyCampaign?.underMap?.theories, storyCampaign?.underMap?.foil, isStoryMode]);

  // FIELD NOTE: the first time a reading is SUBVERTED, stop and introduce The
  // Other Reader properly — the player just created their antagonist and the
  // ambient copy alone does not teach that. One-time (persisted).
  const [fieldNote, setFieldNote] = useState(null);
  useEffect(() => {
    if (!beliefVerdict || beliefVerdict.correct !== false) return;
    if ((gameProgress?.seenLessons || {})[FIELD_NOTES.otherReader.key]) return;
    setFieldNote(FIELD_NOTES.otherReader);
    markLessonSeen?.(FIELD_NOTES.otherReader.key);
  }, [beliefVerdict, gameProgress?.seenLessons, markLessonSeen]);

  // The echo banner shows the TRUTH the scene follows from (the player's mapping) —
  // not the scene's own sentence, which they're about to read anyway. Require a
  // nodeRef and de-dupe so we never stack the same callback twice.
  const visibleEchoes = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const e of sceneEchoes) {
      const ref = (e?.nodeRef || "").trim();
      if (!ref) continue;
      const key = ref.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
    return out;
  }, [sceneEchoes]);
  const showEchoCard = showEcho && visibleEchoes.length > 0;

  // VERDICT AS A MOMENT: the belief payoff stamps onto the page when the scene opens
  // (slam + haptic), so the player FEELS their reading mattered — then rests compact.
  // Re-arms per chapter so each arrival earns its beat. Honors reduced motion.
  const stampAnim = useRef(new Animated.Value(1)).current;
  const stampedRef = useRef(false);
  useEffect(() => { stampedRef.current = false; }, [storyMeta?.caseNumber, activeCase?.caseNumber]);
  useEffect(() => {
    if (!beliefVerdict || stampedRef.current) return;
    stampedRef.current = true;
    if (reducedMotion) { stampAnim.setValue(1); return; }
    stampAnim.setValue(0);
    Haptics.notificationAsync?.(
      beliefVerdict.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    ).catch?.(() => {});
    Animated.timing(stampAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.back(2)), useNativeDriver: true }).start();
  }, [beliefVerdict, reducedMotion, stampAnim]);

  // Build detail-shaped "examinables" from fragments that name a verbatim prose
  // phrase, so the reader can highlight + collect them inline (the EXAMINE beat).
  const examinableDetails = useMemo(() => {
    return sceneFragments
      .filter((f) => f && f.label && typeof f.phrase === "string" && f.phrase.trim())
      .map((f) => ({
        phrase: f.phrase.trim(),
        note: (f.detail && f.detail.trim()) || `${f.label} — something here doesn't belong.`,
        evidenceCard: f.label,
        kind: f.kind || "phenomenon",
        __fragment: true,
      }));
  }, [sceneFragments]);

  // Merge the examinables into every segment's details. parseTextWithDetails only
  // highlights phrases actually present in a given page, so appending everywhere is
  // safe — a fragment lights up only on the page whose prose contains its phrase.
  const examinableBranchingNarrative = useMemo(() => {
    if (!branchingNarrative) return branchingNarrative;
    if (!examinableDetails.length) return branchingNarrative;
    const fragmentPhrases = new Set(examinableDetails.map((d) => d.phrase.toLowerCase()));
    // A fragment examinable takes precedence over a plain observation on the same
    // phrase, so the anomaly is collectable (not just flavor). Drop colliding originals.
    const withExtra = (details) => [
      ...(Array.isArray(details) ? details : []).filter(
        (d) => !(d && typeof d.phrase === "string" && fragmentPhrases.has(d.phrase.toLowerCase())),
      ),
      ...examinableDetails,
    ];
    const mapOptions = (options) =>
      (Array.isArray(options) ? options : []).map((opt) => ({ ...opt, details: withExtra(opt?.details) }));
    return {
      ...branchingNarrative,
      opening: branchingNarrative.opening
        ? { ...branchingNarrative.opening, details: withExtra(branchingNarrative.opening.details) }
        : branchingNarrative.opening,
      firstChoice: branchingNarrative.firstChoice
        ? { ...branchingNarrative.firstChoice, options: mapOptions(branchingNarrative.firstChoice.options) }
        : branchingNarrative.firstChoice,
      secondChoices: Array.isArray(branchingNarrative.secondChoices)
        ? branchingNarrative.secondChoices.map((sc) => ({ ...sc, options: mapOptions(sc?.options) }))
        : branchingNarrative.secondChoices,
    };
  }, [branchingNarrative, examinableDetails]);

  // State for tracking branching narrative progress and evidence
  const [branchingProgress, setBranchingProgress] = useState(null);
  const [collectedEvidence, setCollectedEvidence] = useState([]);
  // EXAMINE: labels collected via tapping this visit, to avoid redundant ingests.
  const examinedLabelsRef = useRef(new Set());
  useEffect(() => { examinedLabelsRef.current = new Set(); }, [caseNumber]);

  const handleExamineFragment = useCallback((frag) => {
    if (!frag || !frag.label || typeof onIngestFragments !== "function") return;
    if (examinedLabelsRef.current.has(frag.label)) return;
    examinedLabelsRef.current.add(frag.label);
    // Ingest the single tapped fragment + the scene relations (relations re-resolve
    // as more fragments are collected, so it's safe to pass them every time).
    onIngestFragments([frag], sceneRelations, {
      caseNumber: storyMeta?.caseNumber || activeCase?.caseNumber,
      chapter: storyMeta?.chapter,
      subchapter: storyMeta?.subchapter,
    });
  }, [onIngestFragments, sceneRelations, storyMeta?.caseNumber, storyMeta?.chapter, storyMeta?.subchapter, activeCase?.caseNumber]);

  // NARRATIVE-FIRST FLOW: Track if narrative is complete (ready for puzzle)
  // Applies to ALL subchapters in chapters 2+ (not just C)
  const [narrativeComplete, setNarrativeComplete] = useState(false);

  // LOCAL STATE FIX: Track pre-decision made in this session to avoid timing issues
  // When onSelectDecisionBeforePuzzle is called, the prop `storyCampaign.preDecision`
  // may not update immediately due to React's batched state updates. This local state
  // ensures we immediately know we've made a decision without waiting for prop propagation.
  const [localPreDecisionKey, setLocalPreDecisionKey] = useState(null);

  // Check chapter and subchapter info
  const caseNumber = activeCase?.caseNumber;
  const chapterStr = caseNumber?.slice(0, 3);
  const chapter = chapterStr ? parseInt(chapterStr, 10) : 1;
  const subchapterLetter = caseNumber?.slice(3, 4);
  const isSubchapterC = subchapterLetter === 'C';
  const puzzleMode = useMemo(() => getPuzzleMode(caseNumber, isStoryMode), [caseNumber, isStoryMode]);
  const puzzleActionLabel = getPuzzleActionLabel(puzzleMode);
  // The C climax now commits the chapter decision AS a belief on the Theory screen,
  // so the inline decision panel is suppressed here for the theory climax.
  const isTheoryClimax = isStoryMode && isSubchapterC && puzzleMode === PUZZLE_MODE.THEORY;

  // Check if we already have a branching choice for this case (came back after puzzle)
  const existingBranchingChoice = useMemo(() => {
    if (!hasBranchingNarrative || !caseNumber) return null;
    const branchingChoices = storyCampaign?.branchingChoices || [];
    return branchingChoices.find(bc => bc.caseNumber === caseNumber);
  }, [hasBranchingNarrative, caseNumber, storyCampaign?.branchingChoices]);

  const branchingChoiceComplete = Boolean(
    existingBranchingChoice && existingBranchingChoice.isComplete !== false,
  );

  useEffect(() => {
    setBranchingProgress(null);
    setCollectedEvidence([]);
    setNarrativeComplete(false);
    setLocalPreDecisionKey(null); // Reset local pre-decision tracking when case changes
    setLazyBranchingNarrative(null); // LAZY BRANCHING: drop merged narrative on case change
    setLazyLoadingFor(null);
  }, [caseNumber]);

  // The path key under which this case's content is stored (mirrors storyMeta resolution).
  const branchingPathKey = useMemo(() => {
    if (!caseNumber) return ROOT_PATH_KEY;
    const chapterNumber = Number(caseNumber.slice(0, 3));
    const chapterKey = Number.isNaN(chapterNumber) ? null : chapterNumber;
    return (chapterKey && storyCampaign?.pathHistory && storyCampaign.pathHistory[chapterKey])
      || storyCampaign?.currentPathKey
      || ROOT_PATH_KEY;
  }, [caseNumber, storyCampaign?.pathHistory, storyCampaign?.currentPathKey]);

  // READ-BACK: assemble the realized prose of every subchapter BEFORE the current one,
  // oldest→newest. These are handed to BranchingNarrativeReader, which prepends them as
  // read-only pages so the player can page back through the whole case (the live reader
  // still owns the current subchapter). Each chapter is read at the branch the player took.
  //
  // Built ASYNC via getStoryEntryAsync so it hydrates entries from persistent storage that
  // aren't in the in-memory cache yet (e.g. a freshly resumed session) — this GUARANTEES no
  // prior subchapter is silently skipped. The reader preserves the player's live page if the
  // history arrives a beat late.
  const [caseHistory, setCaseHistory] = useState([]);

  // Position-based gate (sync): is there ANY prior subchapter to read back into?
  const hasPriorHistory = useMemo(() => {
    if (!isStoryMode || !caseNumber) return false;
    const { chapter, subchapter } = parseCaseNumber(caseNumber);
    return chapter > 1 || subchapter > 1;
  }, [isStoryMode, caseNumber]);

  // STABLE content signature for the read-back history. The prior subchapters' realized
  // paths only change when the player advances or makes a branching choice — NOT when they
  // tap a fragment. But every campaign write (incl. an EXAMINE Under-Map write) recreates
  // the choiceHistory/branchingChoices array refs via normalizeStoryCampaignShape, so keying
  // the assembly effect on those refs made EXAMINE rebuild history → liveStartIndex flips →
  // the reader jumps. This signature is identical when the content is identical, so the
  // effect (and the reader's page layout) stays put while you read.
  const historyDepKey = useMemo(() => {
    if (!hasPriorHistory || !caseNumber) return '';
    const ch = (storyCampaign?.choiceHistory || []).map((c) => `${c?.caseNumber}:${c?.optionKey}`).join(',');
    const bc = (storyCampaign?.branchingChoices || []).map((b) => `${b?.caseNumber}:${b?.firstChoice}:${b?.secondChoice}`).join(',');
    return `${caseNumber}|${storyCampaign?.currentPathKey || ''}|${ch}|${bc}`;
  }, [hasPriorHistory, caseNumber, storyCampaign?.choiceHistory, storyCampaign?.branchingChoices, storyCampaign?.currentPathKey]);

  useEffect(() => {
    let cancelled = false;
    if (!hasPriorHistory || !caseNumber) { setCaseHistory([]); return () => { cancelled = true; }; }
    const { chapter: curChapter, subchapter: curSub } = parseCaseNumber(caseNumber);
    const choiceHistory = storyCampaign?.choiceHistory || [];
    const branchingChoices = storyCampaign?.branchingChoices || [];
    const pathHistory = storyCampaign?.pathHistory || {};
    (async () => {
      const out = [];
      for (let ch = 1; ch <= curChapter; ch += 1) {
        const pathKey = ch === 1
          ? ROOT_PATH_KEY
          : (computeBranchPathKey(choiceHistory, ch) || pathHistory[ch] || storyCampaign?.currentPathKey || ROOT_PATH_KEY);
        const maxSub = ch < curChapter ? 3 : curSub - 1; // stop before the current subchapter
        for (let sub = 1; sub <= maxSub; sub += 1) {
          const cn = `${String(ch).padStart(3, '0')}${['A', 'B', 'C'][sub - 1]}`;
          // eslint-disable-next-line no-await-in-loop
          const entry = await getStoryEntryAsync(cn, pathKey);
          if (!entry) {
            // A missing entry silently shortens "The Case So Far" — usually a
            // path-key mismatch between generation and replay. Surface it.
            console.warn(`[CaseFile] read-back skipped ${cn} (no entry at pathKey ${pathKey})`);
            continue;
          }
          const bc = branchingChoices.find((b) => b.caseNumber === cn);
          const text = (bc && entry.branchingNarrative)
            ? buildRealizedNarrative(entry.branchingNarrative, bc.firstChoice, bc.secondChoice)
            : (entry.narrative || '');
          if (text && text.trim()) {
            out.push({ caseNumber: cn, chapter: ch, letter: ['A', 'B', 'C'][sub - 1], title: entry.title || null, text: text.trim() });
          }
        }
      }
      if (!cancelled) { setCaseHistory(out); }
    })();
    return () => { cancelled = true; };
    // Keyed on the stable content signature so an EXAMINE/Under-Map write never rebuilds it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyDepKey]);

  const branchingChoiceSeed = useMemo(() => {
    if (!existingBranchingChoice) return null;
    return {
      firstChoice: existingBranchingChoice.firstChoice,
      secondChoice: existingBranchingChoice.secondChoice,
    };
  }, [existingBranchingChoice]);

  const normalizeBranchingPath = useCallback((path, firstChoiceHint) => {
    const rawPath = String(path || '').trim();
    const rawFirst = typeof firstChoiceHint === 'string' ? firstChoiceHint.trim() : '';
    let normalized = rawPath;
    if (rawPath && rawFirst && !rawPath.includes('-')) {
      normalized = `${rawFirst}-${rawPath}`;
    } else if (!rawPath && rawFirst) {
      normalized = rawFirst;
    }
    const upper = String(normalized || '').toUpperCase();
    const dupMatch = upper.match(/^(1[ABC])-(1[ABC]-2[ABC])$/);
    const deduped = dupMatch ? dupMatch[2] : upper;
    const parts = deduped.split('-');
    const firstChoice = parts[0] || rawFirst.toUpperCase();
    return { firstChoice, secondChoice: deduped };
  }, []);

  const persistBranchingChoice = useCallback((result, { isComplete = true, underMapSnapshot = null } = {}) => {
    if (!onSaveBranchingChoice || !caseNumber) return;
    const rawPath = result?.path || result?.secondChoice || '';
    const rawFirst = result?.firstChoice || '';
    const { firstChoice, secondChoice } = normalizeBranchingPath(rawPath, rawFirst);
    if (!firstChoice || !secondChoice) {
      console.warn('[CaseFileScreen] Branching choice missing normalized keys:', {
        caseNumber,
        rawPath,
        rawFirst,
      });
      return;
    }
    onSaveBranchingChoice(caseNumber, firstChoice, secondChoice, { isComplete, underMapSnapshot });
  }, [onSaveBranchingChoice, caseNumber, normalizeBranchingPath]);

  const handleBranchingComplete = useCallback((result) => {
    setBranchingProgress(result ? { ...result, caseNumber } : result);

    // TRUE INFINITE BRANCHING: Persist the player's actual path through the narrative
    // This enables future content to continue from their actual experience, not the canonical path
    // NARRATIVE-FIRST FLOW: Mark narrative as complete so we can show "Proceed to Puzzle" button
    // Applies to ALL subchapters with branching narrative (including 1A)
    // Note: Prefetch is triggered by onSaveBranchingChoice -> saveBranchingChoiceAndPrefetch
    if (hasBranchingNarrative) {
      setNarrativeComplete(true);
    }

    // UNDER-MAP backfill (PATH-SCOPED): collect the fragments the player's chosen
    // path surfaced, so the CONNECT/THEORY beat is never starved if they didn't tap
    // everything — WITHOUT bleeding in content from branches they skipped. A fragment
    // is path-relevant when its verbatim phrase appears in the prose actually read
    // (opening + the chosen first-choice response + the chosen ending). Phrase-less
    // fragments are scene-general (not tappable, not branch-attributable) so they pass
    // through. Relations self-scope: addRelations only materializes a relation once
    // BOTH endpoints exist in the map, so a skipped branch's relations never form,
    // while cross-chapter links (to fragments the player already holds) still resolve.
    let underMapSnapshot = null;
    if (typeof onIngestFragments === "function" && (sceneFragments.length || sceneRelations.length)) {
      // Reconstruct the exact prose the player walked using the SAME helper the
      // generation pipeline uses for continuity (opening + chosen first response +
      // chosen ending), so the Under-Map and the next-scene prompt agree on what
      // "happened". A phrase-bearing fragment only enters the map if its phrase is
      // in that prose; phrase-less fragments are scene-general (not tappable, not
      // branch-attributable) and pass through.
      const prose = branchingNarrative
        ? buildRealizedNarrative(branchingNarrative, result?.firstChoice, result?.path || result?.secondChoice)
        : "";
      const pathFragments = fragmentsOnRealizedPath(sceneFragments, prose);
      underMapSnapshot = onIngestFragments(pathFragments, sceneRelations, {
        caseNumber,
        chapter: storyMeta?.chapter,
        subchapter: storyMeta?.subchapter,
      });
    }

    if (result?.path && !branchingChoiceComplete) {
      persistBranchingChoice(result, { isComplete: true, underMapSnapshot });
    }
  }, [caseNumber, hasBranchingNarrative, persistBranchingChoice, branchingChoiceComplete, onIngestFragments, sceneFragments, sceneRelations, branchingNarrative, storyMeta?.chapter, storyMeta?.subchapter]);

  const handleSecondChoice = useCallback((result) => {
    if (!result?.path) return;
    if (branchingChoiceComplete) return;
    persistBranchingChoice(result, { isComplete: false });
  }, [persistBranchingChoice, branchingChoiceComplete]);

  useEffect(() => {
    if (!branchingProgress?.path) return;
    if (branchingChoiceComplete) return;
    if (branchingProgress?.caseNumber && branchingProgress.caseNumber !== caseNumber) return;
    persistBranchingChoice(branchingProgress, { isComplete: true });
  }, [branchingProgress?.path, branchingProgress?.caseNumber, branchingChoiceComplete, persistBranchingChoice, caseNumber]);

  const handleEvidenceCollected = useCallback((evidence) => {
    setCollectedEvidence(prev => [...prev, evidence]);
  }, []);

  // NARRATIVE-FIRST FLOW: First choice is now just for tracking, no speculative prefetch
  // With narrative-first, we wait until branching is COMPLETE to generate next content
  // This means we only generate 1 version (the exact path player took), not 3 speculative versions
  const handleFirstChoice = useCallback((firstChoiceKey) => {
    // LAZY BRANCHING: if the narrative is a Layer-1 partial, generate the chosen
    // first choice's 3 second-choice responses now (masked while the player reads
    // the first-choice response). No-op for full-tree content (flag off).
    if (
      typeof onEnsureSecondChoiceResponses === 'function' &&
      caseNumber &&
      branchingNarrative &&
      isLayer1Partial(branchingNarrative) &&
      secondChoiceResponsesNeeded(branchingNarrative, firstChoiceKey)
    ) {
      setLazyLoadingFor(firstChoiceKey);
      Promise.resolve(
        onEnsureSecondChoiceResponses(caseNumber, branchingPathKey, firstChoiceKey, branchingNarrative),
      )
        .then((mergedBN) => {
          if (mergedBN) setLazyBranchingNarrative(mergedBN);
        })
        .catch(() => {})
        .finally(() => setLazyLoadingFor(null));
    }
  }, [onEnsureSecondChoiceResponses, caseNumber, branchingNarrative, branchingPathKey]);

  // Legacy linear narrative (for Chapter 1 or fallback)
  const narrative = useMemo(() => {
    // If we have branching narrative, skip legacy processing
    if (hasBranchingNarrative) return [];

    const metaNarrative = storyMeta?.narrative;
    if (Array.isArray(metaNarrative)) return metaNarrative.filter(Boolean);
    if (typeof metaNarrative === "string" && metaNarrative.trim()) return [metaNarrative];
    if (Array.isArray(activeCase?.narrative)) {
      const original = activeCase.narrative.filter(Boolean);

      if (original.length > 0 && activeCase.board?.outlierWords?.length > 0) {
        const outliers = activeCase.board.outlierWords.slice(0, 4).join(". ");

        // Check for {puzzle_callback} placeholder
        if (original[0].includes("{puzzle_callback}")) {
           const updatedFirstPage = original[0].replace("{puzzle_callback}", outliers);
           return [updatedFirstPage, ...original.slice(1)];
        }

        // Fallback: Prepend if no placeholder found
        const intro = `INTEL LOG: ${outliers}. The pattern was undeniable.\n\n`;
        return [intro + original[0], ...original.slice(1)];
      }
      return original;
    }
    if (typeof activeCase?.narrative === "string" && activeCase.narrative.trim()) return [activeCase.narrative];
    return [];
  }, [storyMeta, activeCase?.narrative, activeCase?.board?.outlierWords, hasBranchingNarrative]);

  // Calculate pagination parameters based on actual page dimensions and typography.
  // This uses line-based pagination to prevent text cutoff at the bottom of pages.
  const pageHeight = Math.round(moderateScale(compact ? 450 : 540));

  // Calculate page width by subtracting all container paddings from screen width
  // Screen → horizontalPadding → boardContentPaddingH → sectionPaddingH → pagePaddingH
  const sectionPaddingH = scaleSpacing(compact ? SPACING.xs : SPACING.sm);
  const pagePaddingH = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const pagePaddingV = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const totalHorizontalPadding = (horizontalPadding + boardContentPaddingH + sectionPaddingH + pagePaddingH) * 2;
  const estimatedPageWidth = Math.max(200, screenWidth - totalHorizontalPadding);

  const paginationParams = useMemo(() => calculatePaginationParams({
    pageHeight,
    pageWidth: estimatedPageWidth,
    fontSize: narrativeSize,
    lineHeight: narrativeLineHeight,
    verticalPadding: pagePaddingV * 2, // top + bottom padding
    labelHeight: 24, // Journal entry label height (tighter)
    bottomReserved: scaleSpacing(SPACING.lg) + 20, // Page stamp area (reduced for better fill)
  }), [pageHeight, estimatedPageWidth, narrativeSize, narrativeLineHeight, pagePaddingV, scaleSpacing]);

  const narrativePages = useMemo(
    () => paginateNarrativeSegments(narrative, paginationParams),
    [narrative, paginationParams]
  );

  // Game State Logic
  // Decision data can be:
  // - `activeCase.storyDecision` (injected by caseMerger after looking up pathDecisions)
  // - `storyMeta.decision` (legacy single decision)
  // - `storyMeta.pathDecisions` (new: 9 decisions keyed by branching narrative ending path)
  //
  // For subchapter C, we want the decision options to reflect the *player's realized path*
  // through the branching narrative immediately after the second choice is made, even before
  // persistence updates propagate back into `activeCase`.
  const resolvedBranchingPath = useMemo(() => {
    const fromSession = typeof branchingProgress?.path === 'string' && branchingProgress.path
      ? branchingProgress.path
      : null;
    const fromStored = typeof existingBranchingChoice?.secondChoice === 'string' && existingBranchingChoice.secondChoice
      ? existingBranchingChoice.secondChoice
      : null;
    return fromSession || fromStored || null;
  }, [branchingProgress?.path, existingBranchingChoice?.secondChoice]);

  const storyDecision = useMemo(() => resolveStoryDecision({
    activeCaseStoryDecision: activeCase?.storyDecision,
    metaDecision: storyMeta?.decision,
    metaPathDecisions: storyMeta?.pathDecisions,
    subchapterLetter,
    branchingPath: resolvedBranchingPath,
  }), [
    activeCase?.storyDecision,
    storyMeta?.decision,
    storyMeta?.pathDecisions,
    subchapterLetter,
    resolvedBranchingPath,
  ]);
  const awaitingDecision = Boolean(storyDecision && storyCampaign?.awaitingDecision && storyCampaign?.pendingDecisionCase === caseNumber);
  const storyLocked = Boolean(!awaitingDecision && storyUnlockAt);
  const storyActiveCaseNumber = storyCampaign?.activeCaseNumber;
  const completedCaseNumbers = storyCampaign?.completedCaseNumbers || [];
  const isCaseSolved = completedCaseNumbers.includes(activeCase?.caseNumber) || solvedCaseIds.includes(activeCase?.id);

  const pendingStoryAdvance = Boolean(!awaitingDecision && storyActiveCaseNumber && caseNumber && storyActiveCaseNumber !== caseNumber);

  // NARRATIVE-FIRST FLOW: For C subchapters, check if pre-decision has already been made
  // (Moved up to support puzzlePhasePending calculation)
  // LOCAL STATE FIX: Also check localPreDecisionKey for immediate feedback before prop propagates
  const preDecision = storyCampaign?.preDecision;
  const hasPreDecision = (preDecision && preDecision.caseNumber === caseNumber) ||
                         (localPreDecisionKey && isSubchapterC);

  // NARRATIVE-FIRST FIX: Check if puzzle phase is active (narrative complete but puzzle not solved)
  // For A/B subchapters: puzzle is pending after narrative is read
  // For C subchapters: puzzle is pending after decision is made
  const narrativeReadyForPuzzleCheck = narrativeComplete || existingBranchingChoice;
  const puzzlePhasePending = !isCaseSolved && (
    (isSubchapterC && hasPreDecision) ||
    (!isSubchapterC && narrativeReadyForPuzzleCheck)
  );

  // Check if narrative is currently in progress (not yet complete)
  const hasNarrative = hasBranchingNarrative || narrativePages.length > 0;
  const narrativeInProgress = Boolean(hasNarrative && !narrativeComplete && !existingBranchingChoice);
  const hideContinueInvestigationCTA = narrativeInProgress || puzzlePhasePending;

  // Don't show "Continue Investigation" if:
  // - Puzzle is pending (narrative done, puzzle not done)
  // - Narrative is in progress (still reading)
  const showNextBriefingCTA = Boolean((pendingStoryAdvance || isCaseSolved) && typeof onContinueStory === "function" && !storyLocked && !awaitingDecision && !hideContinueInvestigationCTA);
  const nextStoryLabel = storyCampaign?.chapter != null && storyCampaign?.subchapter != null 
    ? `Chapter ${storyCampaign.chapter}.${storyCampaign.subchapter}` 
    : "the next chapter";
    
  const decisionChoice = Array.isArray(storyCampaign?.choiceHistory)
    ? storyCampaign.choiceHistory.find((entry) => entry.caseNumber === caseNumber)
    : null;
  const lastDecision = storyCampaign?.lastDecision;
  const showDecision = Boolean(storyDecision);
  const selectedOptionKey = decisionChoice?.optionKey || (lastDecision?.caseNumber === caseNumber ? lastDecision.optionKey : null);

  const decisionOptions = useMemo(() => decisionOptionsFrom(storyDecision), [storyDecision]);

  const subchapterIndex = Number(storyMeta?.subchapter);
  const isThirdSubchapter = subchapterIndex === 3;

  // NARRATIVE-FIRST FLOW: Skip gating if player already read the narrative before the puzzle
  // For dynamic chapters: existingBranchingChoice means narrative was completed
  // For all chapters: isCaseSolved means they've returned after solving the puzzle
  const narrativeAlreadyRead = Boolean(branchingChoiceComplete) || isCaseSolved;
  const shouldGateDecisionPanel = awaitingDecision && isThirdSubchapter && !narrativeAlreadyRead;
  const [decisionPanelRevealed, setDecisionPanelRevealed] = useState(!shouldGateDecisionPanel);

  useEffect(() => {
    if (!shouldGateDecisionPanel) {
      setDecisionPanelRevealed(true);
    }
  }, [shouldGateDecisionPanel]);

  const handleRevealDecisionPanel = useCallback(() => {
    if (!showDecision || decisionPanelRevealed) return;
    setDecisionPanelRevealed(true);
    requestAnimationFrame(() => {
      if (scrollRef.current?.scrollToEnd) {
        scrollRef.current.scrollToEnd({ animated: true });
      }
    });
    if (Haptics?.selectionAsync) Haptics.selectionAsync().catch(() => {});
  }, [decisionPanelRevealed, showDecision]);

  // Include pre-decision as a "locked" decision for display purposes
  // (preDecision and hasPreDecision are now defined earlier to support puzzlePhasePending)
  const hasLockedDecision = Boolean(
    (!awaitingDecision && selectedOptionKey && lastDecision?.caseNumber === caseNumber) ||
    hasPreDecision
  );
  const showDecisionPrompt = !isTheoryClimax && showDecision && shouldGateDecisionPanel && !decisionPanelRevealed;
  const showDecisionPanel = !isTheoryClimax && decisionPanelRevealed && (showDecision || hasLockedDecision);

  // Show decision options when:
  // 1. Normal flow: awaitingDecision is true (after puzzle solved), OR
  // 2. Narrative-first C subchapter: before puzzle, but ONLY after branching narrative is complete
  //    (existingBranchingChoice means player has made both sets of branching choices)
  // 3. For Chapter 1 (no branching narrative): show when in story mode C subchapter before puzzle
  const branchingProgressForCase = branchingProgress && (
    !branchingProgress.caseNumber || branchingProgress.caseNumber === caseNumber
  );
  const branchingDecisionReady = hasBranchingNarrative
    ? Boolean(branchingChoiceComplete) || Boolean(branchingProgressForCase) || narrativeComplete
    : true;
  const showDecisionOptions = !isTheoryClimax && showDecision && (
    awaitingDecision ||
    (isStoryMode && isSubchapterC && !isCaseSolved && !hasPreDecision && (
      branchingDecisionReady
    ))
  );

  const [localSelection, setLocalSelection] = useState(selectedOptionKey);
  useEffect(() => { setLocalSelection(selectedOptionKey); }, [selectedOptionKey]);
  // Include pre-decision in resolved selection (using local state for immediate feedback)
  const resolvedSelectionKey = localSelection || selectedOptionKey ||
    (preDecision?.caseNumber === caseNumber ? preDecision.optionKey : null) ||
    (localPreDecisionKey && isSubchapterC ? localPreDecisionKey : null);
  
  const selectedOptionDetails = useMemo(() => decisionOptions.find((o) => o.key === resolvedSelectionKey) || null, [decisionOptions, resolvedSelectionKey]);
  const [lockedOptionSnapshot, setLockedOptionSnapshot] = useState(null);
  
  useEffect(() => { setLockedOptionSnapshot(null); }, [caseNumber]);
  useEffect(() => {
    if (resolvedSelectionKey && selectedOptionDetails) {
      setLockedOptionSnapshot({
        key: resolvedSelectionKey,
        title: selectedOptionDetails.title,
        consequence: selectedOptionDetails.consequence,
        focus: selectedOptionDetails.focus,
        stats: selectedOptionDetails.stats,
        outcome: selectedOptionDetails.outcome,
      });
    }
  }, [resolvedSelectionKey, selectedOptionDetails]);
  
  const summaryOptionDetails = selectedOptionDetails || lockedOptionSnapshot;
  const showGoHomeButton = Boolean(isThirdSubchapter && resolvedSelectionKey && typeof onReturnHome === "function" && !storyLocked);

  // Animation Refs
  const [celebrationActive, setCelebrationActive] = useState(false);
  const lockCelebrationScale = useRef(new Animated.Value(0.9)).current;
  const lockCelebrationOpacity = useRef(new Animated.Value(0)).current;
  const lockCelebrationKeyRef = useRef(null);

  // Effects for animations
  useEffect(() => {
    if (!hasLockedDecision || !lastDecision || lastDecision.caseNumber !== caseNumber) {
      if (!hasLockedDecision) {
        lockCelebrationKeyRef.current = null;
        lockCelebrationOpacity.setValue(0);
        lockCelebrationScale.setValue(0.9);
      }
      return;
    }
    const celebrationKey = `${lastDecision.caseNumber}-${lastDecision.optionKey}-${lastDecision.selectedAt || "recent"}`;
    if (lockCelebrationKeyRef.current === celebrationKey) {
      lockCelebrationOpacity.setValue(1);
      lockCelebrationScale.setValue(1);
      return;
    }
    lockCelebrationKeyRef.current = celebrationKey;
    lockCelebrationScale.setValue(0.85);
    lockCelebrationOpacity.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.spring(lockCelebrationScale, { toValue: 1.08, friction: 6, tension: 120, useNativeDriver: true }),
        Animated.spring(lockCelebrationScale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
      ]),
      Animated.timing(lockCelebrationOpacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [caseNumber, hasLockedDecision, lastDecision, lockCelebrationOpacity, lockCelebrationScale]);

  const choiceStatusText = awaitingDecision
    ? "Choose the reading that branches this subchapter."
    : resolvedSelectionKey
    ? "Branch locked."
    : "Awaiting HQ update.";
  const choiceStatusSubtext = awaitingDecision
    ? "Your selection rewrites the third subchapter."
    : summaryOptionDetails && resolvedSelectionKey
    ? `Option ${resolvedSelectionKey} • ${summaryOptionDetails.title || "Recorded choice"}`
    : null;

  const storyPromptConfig = useMemo(() => {
    if (!isStoryMode) return null;

    // NARRATIVE-FIRST FLOW: After narrative complete, show "Proceed to Evidence Board"
    // This gives the LLM time to generate next content while player solves the puzzle
    // Applies to ALL chapters (including Chapter 1 static content)
    const narrativeReadyForPuzzle = narrativeComplete || existingBranchingChoice;

    // For C subchapters: Only show "Solve Puzzle" AFTER decision is made (hasPreDecision)
    // For A/B subchapters: Show "Solve Puzzle" after narrative is complete
    if (!isCaseSolved && typeof onProceedToPuzzle === "function") {
      if (isSubchapterC) {
        // C climax: once the scene is read, go form your theory. The chapter
        // decision IS the belief committed on the Theory screen (no separate
        // inline decision), so we surface the CTA after the narrative is complete.
        if (isTheoryClimax) {
          if (narrativeReadyForPuzzle) {
            return {
              title: "The Threshold",
              body: "You've seen what this chapter had to show. Commit your theory of the Under-Map — the belief you stake decides what it reveals next.",
              hint: "Connect what you've found into a reading of the hidden world.",
              actionLabel: puzzleActionLabel,
              actionIcon: "🔮",
              // Pass the resolved belief options so the Theory climax presents them.
              onPress: () => onProceedToPuzzle(decisionOptions),
            };
          }
          // Still reading — no CTA yet.
        } else if (hasPreDecision) {
          // Legacy/non-theory C beat: decision already made on this screen.
          return {
            title: "Path Chosen",
            body: "Your decision is sealed. Now read the Under-Map to confirm your fate.",
            hint: "The descent completes this chapter.",
            actionLabel: puzzleActionLabel,
            actionIcon: "🔍",
            onPress: onProceedToPuzzle,
          };
        }
      } else if (narrativeReadyForPuzzle) {
        // A/B subchapter: Show puzzle after narrative is complete (branching choices made)
        const connectBeat = puzzleMode === PUZZLE_MODE.CONNECT;
        return {
          title: connectBeat
            ? "The Under-Map Stirs"
            : puzzleMode === PUZZLE_MODE.LOGIC
              ? "Logic Grid Ready"
              : "Evidence Board Ready",
          body: connectBeat
            ? "The scene left threads behind. Descend into the Under-Map and draw the connections to reveal what hides beneath."
            : puzzleMode === PUZZLE_MODE.LOGIC
              ? "The narrative threads are woven. Now solve the logic grid to unlock your next move."
              : "The narrative threads are woven. Now untangle the evidence to unlock your next move.",
          hint: connectBeat
            ? "Connect the fragments to pull the hidden world into view."
            : "Solve the puzzle to continue the investigation.",
          actionLabel: puzzleActionLabel,
          actionIcon: connectBeat ? "🗺️" : "🔍",
          onPress: onProceedToPuzzle,
        };
      }
    }

    if (pendingStoryAdvance && !showNextBriefingCTA && !storyLocked && !hideContinueInvestigationCTA) {
      return {
        title: "Next Chapter Ready",
        body: `${nextStoryLabel} is waiting under the city.`,
        hint: "Continue when you're ready to follow the map deeper.",
        actionLabel: "Continue Investigation",
        actionIcon: "▶",
        onPress: typeof onContinueStory === "function" ? onContinueStory : null,
      };
    }
    if (isThirdSubchapter && (storyLocked || hasLockedDecision)) {
      return {
        title: "Chapter Locked",
        body: "You've completed all three subchapters. The Under-Map needs time to answer.",
        hint: countdown ? `Unlocks in ${countdown}` : "Unlock window opens soon.",
        actionLabel: "Return Home",
        actionIcon: "🏠",
        onPress: typeof onReturnHome === "function" ? onReturnHome : null,
      };
    }
    return null;
  }, [countdown, isStoryMode, isThirdSubchapter, nextStoryLabel, onContinueStory, onReturnHome, pendingStoryAdvance, showNextBriefingCTA, storyLocked, hasLockedDecision, isSubchapterC, isTheoryClimax, decisionOptions, narrativeComplete, existingBranchingChoice, isCaseSolved, onProceedToPuzzle, hasPreDecision, puzzleMode, puzzleActionLabel, hideContinueInvestigationCTA]);

  const handleSelectOption = useCallback((option) => {
    if (!option) return;
    // Allow selection for both normal flow (awaitingDecision) and pre-puzzle C subchapter flow
    const canSelect = awaitingDecision || (isStoryMode && isSubchapterC && !isCaseSolved && !hasPreDecision);
    if (!canSelect) return;
    setLocalSelection(option.key);
    if (Haptics?.selectionAsync) Haptics.selectionAsync();
  }, [awaitingDecision, isStoryMode, isSubchapterC, isCaseSolved, hasPreDecision]);

  const handleConfirmOption = useCallback((optionKey) => {
    if (!optionKey || !caseNumber) return;

    // Get the selected option details for the pre-decision
    const selectedOption = decisionOptions.find(opt => opt.key === optionKey);

    // NARRATIVE-FIRST FLOW: For C subchapters before puzzle, use pre-puzzle decision
    if (!awaitingDecision && isStoryMode && isSubchapterC && !isCaseSolved && onSelectDecisionBeforePuzzle) {
      console.log(`[CaseFileScreen] Pre-puzzle decision for ${caseNumber}: Option ${optionKey}`);
      // LOCAL STATE FIX: Set local tracking BEFORE calling the prop function
      // This ensures the UI updates immediately, even before the storyCampaign prop propagates
      setLocalPreDecisionKey(optionKey);
      // STALE STATE FIX: Pass caseNumber explicitly to avoid race conditions with storyCampaign state
      onSelectDecisionBeforePuzzle(optionKey, selectedOption || {}, caseNumber);
      setCelebrationActive(true);
      if (Haptics?.notificationAsync) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    // Normal flow: after puzzle solved
    if (!awaitingDecision || !onSelectDecision) return;
    onSelectDecision(optionKey);
    setCelebrationActive(true);
    if (Haptics?.notificationAsync) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [awaitingDecision, caseNumber, onSelectDecision, onSelectDecisionBeforePuzzle, isStoryMode, isSubchapterC, isCaseSolved, decisionOptions]);

  const lockedDecisionMeta = useMemo(() => {
    if (!hasLockedDecision || !lastDecision) return null;
    return {
      optionKey: resolvedSelectionKey,
      pathKey: lastDecision.nextPathKey || null,
      nextChapter: lastDecision.nextChapter || null,
      lockedAt: lastDecision.selectedAt || null,
    };
  }, [hasLockedDecision, lastDecision, resolvedSelectionKey]);

  const lockedDecisionTimestamp = useMemo(() => {
    if (!lockedDecisionMeta?.lockedAt) return null;
    try { return new Date(lockedDecisionMeta.lockedAt).toLocaleString(); } catch (error) { return null; }
  }, [lockedDecisionMeta?.lockedAt]);

  const handleNextCaseRibbonPress = useCallback(() => {
    if (Haptics?.selectionAsync) Haptics.selectionAsync().catch(() => {});
    onContinueStory?.();
  }, [onContinueStory]);

  const nextCaseButtonEnabled = Boolean(pendingStoryAdvance && !countdown && typeof onContinueStory === "function");
  
  const unlockLabel = countdown
    ? storyLocked ? 'Next chapter unlocks in' : 'Next case unlocks in'
    : storyLocked ? 'Next chapter unlocks' : 'Next case unlocks';
  const unlockValue = countdown || (storyLocked ? 'After 24 hours' : 'At dawn');
  const footerRibbonStyle = {
      borderRadius: scaleRadius(RADIUS.md),
      paddingHorizontal: scaleSpacing(compact ? SPACING.sm : SPACING.md),
      paddingVertical: scaleSpacing(compact ? SPACING.xs : SPACING.sm),
      borderColor: palette.border,
      backgroundColor: palette.metricBackground,
  };

  return (
    <ScreenSurface variant="desk" accentColor={palette.accent}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingVertical: verticalPadding,
            gap: contentGap,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SecondaryButton label="Menu" arrow onPress={onBack} style={styles.backButton} />

        <View
          style={[
            styles.boardWrapper,
            {
              borderRadius: boardFrameRadius,
              shadowRadius: boardShadowRadius,
              shadowOffset: { width: 0, height: boardShadowOffsetY },
            },
          ]}
        >
          {/* Outer dark frame (The "Case" container) */}
          <LinearGradient
            colors={["#2a1d15", "#1a120b", "#0f0804"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.boardFrame, { borderRadius: boardFrameRadius }]}
          >
            {/* Inner "Cork/Wood" Surface */}
            <ImageBackground
              source={CORKBOARD_BG}
              resizeMode="repeat"
              style={[
                styles.boardSurface,
                {
                  borderRadius: boardRadius,
                  margin: 2, // Slight inset to show the frame
                }
              ]}
              imageStyle={{ borderRadius: boardRadius }}
            >
              {/* Board Visuals - Atmospheric Layers */}
              <View pointerEvents="none" style={[styles.boardGlow, { width: boardGlowSize, height: boardGlowSize, borderRadius: boardGlowSize, backgroundColor: palette.glow }]} />
              
              {/* Heavy Grain Texture */}
              <RNImage source={NOISE_TEXTURE} style={styles.boardNoise} resizeMode="repeat" pointerEvents="none" />
              
              {/* Vignette for depth */}
              <LinearGradient
                colors={["rgba(60, 40, 20, 0)", "rgba(40, 25, 10, 0.1)", "rgba(20, 10, 5, 0.3)"]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />

              {/* Decorative Corners */}
              <Image source={BOARD_CORNER_TL} style={[styles.boardCorner, styles.boardCornerTl]} pointerEvents="none" />
              <Image source={BOARD_CORNER_TR} style={[styles.boardCorner, styles.boardCornerTr]} pointerEvents="none" />
              <Image source={BOARD_CORNER_BL} style={[styles.boardCorner, styles.boardCornerBl]} pointerEvents="none" />
              <Image source={BOARD_CORNER_BR} style={[styles.boardCorner, styles.boardCornerBr]} pointerEvents="none" />

              <View
                style={[
                  styles.boardContent,
                  {
                    paddingHorizontal: boardContentPaddingH,
                    paddingVertical: boardContentPaddingV,
                    gap: sectionGap,
                  },
                ]}
              >
                {/* Pins and Tape - Holding the file together */}
                <View pointerEvents="none" style={[styles.boardPin, styles.boardPinLeft, { width: pinSize, height: pinSize, borderRadius: pinSize / 2, top: -pinOffset }]} />
                <View pointerEvents="none" style={[styles.boardPin, styles.boardPinRight, { width: pinSize, height: pinSize, borderRadius: pinSize / 2, top: -pinOffset }]} />
                
                {/* Realistic Tape */}
                <View pointerEvents="none" style={[styles.boardTape, styles.boardTapeLeft, { width: boardTapeWidth, height: boardTapeHeight, top: -boardTapeOffset }]}>
                    <View style={styles.tapeGloss} />
                </View>
                <View pointerEvents="none" style={[styles.boardTape, styles.boardTapeRight, { width: boardTapeWidth, height: boardTapeHeight, top: -boardTapeOffset * 0.72 }]}>
                    <View style={styles.tapeGloss} />
                </View>

                {/* Hero Section */}
                <CaseHero activeCase={activeCase} compact={compact} />

                <View style={[styles.heroDivider, { height: 1, backgroundColor: "rgba(248, 216, 168, 0.08)" }]} />

                {/* Summary Section */}
                <CaseSummary content={summaryContent} compact={compact} />

                {/* Story Prompt (Advisory) */}
                {showDecisionPrompt && (
                  <View
                    style={[
                      styles.choiceSignalCard,
                      {
                        borderRadius: scaleRadius(RADIUS.lg),
                        borderColor: palette.border,
                        backgroundColor: "rgba(12, 6, 2, 0.82)",
                        padding: scaleSpacing(SPACING.sm),
                        gap: scaleSpacing(SPACING.xs),
                      },
                    ]}
                  >
                    <Text style={[styles.choiceSignalLabel, { color: palette.accent, fontSize: slugSize }]}>UNDER-MAP SIGNAL</Text>
                    <Text style={[styles.choiceSignalBody, { color: palette.highlightText, fontSize: narrativeSize, lineHeight: narrativeLineHeight }]}>
                      Finish the letter. Once every page is turned, choose the thread that rewrites this reading.
                    </Text>
                  </View>
                )}

                {/* BELIEF VERDICT — your sealed reading of the hidden world, borne out or
                    subverted. Stamps onto the page on arrival (see stampAnim). */}
                {beliefVerdict && (
                  <Animated.View
                    style={[
                      styles.verdictCard,
                      beliefVerdict.correct ? styles.verdictTrue : styles.verdictFalse,
                      { borderRadius: scaleRadius(RADIUS.lg), paddingVertical: scaleSpacing(SPACING.xs), paddingHorizontal: scaleSpacing(SPACING.sm), gap: scaleSpacing(3) },
                      {
                        opacity: stampAnim,
                        transform: [
                          { scale: stampAnim.interpolate({ inputRange: [0, 1], outputRange: [1.22, 1] }) },
                          { rotate: stampAnim.interpolate({ inputRange: [0, 1], outputRange: [beliefVerdict.correct ? "-3deg" : "4deg", beliefVerdict.correct ? "0deg" : "-1.5deg"] }) },
                        ],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.verdictKicker,
                        { color: beliefVerdict.correct ? COLORS.accentSecondary : COLORS.bloodRed, fontSize: slugSize },
                      ]}
                    >
                      {beliefVerdict.correct ? "◆ YOUR READING HELD TRUE" : "◆ YOUR READING WAS SUBVERTED"}
                    </Text>
                    {beliefVerdict.belief ? (
                      <Text style={[styles.verdictBelief, { color: palette.badgeText, fontSize: slugSize }]} numberOfLines={2}>
                        You believed: “{beliefVerdict.belief}”
                      </Text>
                    ) : null}
                    {beliefVerdict.line ? (
                      <Text style={[styles.verdictLine, { color: palette.highlightText, fontSize: narrativeSize, lineHeight: narrativeLineHeight }]}>
                        {beliefVerdict.line}
                      </Text>
                    ) : null}
                    {beliefVerdict.foilBelief ? (
                      <Text style={[styles.verdictBelief, { color: COLORS.bloodRed, fontStyle: "italic", fontSize: slugSize }]} numberOfLines={3}>
                        The Other Reader gains ground — “{beliefVerdict.foilBelief}”
                      </Text>
                    ) : null}
                  </Animated.View>
                )}

                {/* UNDER-MAP ECHO — the loop made visible: this scene follows from what you mapped */}
                {showEchoCard && (
                  <View
                    style={[
                      styles.echoCard,
                      { borderRadius: scaleRadius(RADIUS.lg), borderColor: palette.border, paddingVertical: scaleSpacing(SPACING.xs), paddingHorizontal: scaleSpacing(SPACING.sm), gap: scaleSpacing(3) },
                    ]}
                  >
                    <Text style={[styles.echoKicker, { color: palette.accent, fontSize: slugSize }]}>↳ THIS FOLLOWS FROM WHAT YOU MAPPED</Text>
                    {visibleEchoes.map((e, i) => (
                      <Text key={i} style={[styles.echoFrom, { color: palette.badgeText, fontSize: slugSize }]} numberOfLines={2}>“{e.nodeRef}”</Text>
                    ))}
                  </View>
                )}

                {/* Narrative Section - Branching or Linear */}
                {hasBranchingNarrative ? (
                  <View style={styles.narrativeSection}>
                    <BranchingNarrativeReader
                      key={caseNumber || 'branching-narrative'}
                      branchingNarrative={examinableBranchingNarrative}
                      palette={palette}
                      onComplete={handleBranchingComplete}
                      onFirstChoice={handleFirstChoice}
                      secondChoiceLoading={!!lazyLoadingFor}
                      onSecondChoice={handleSecondChoice}
                      onEvidenceCollected={handleEvidenceCollected}
                      onExamineFragment={handleExamineFragment}
                      initialChoice={branchingChoiceSeed}
                      history={caseHistory}
                    />
                  </View>
                ) : narrativePages.length > 0 && (
                  <View style={styles.narrativeSection}>
                    <NarrativePager
                      pages={narrativePages}
                      palette={palette}
                      showDecisionPrompt={showDecisionPrompt}
                      onRevealDecision={handleRevealDecisionPanel}
                      onComplete={() => {
                        // NARRATIVE-FIRST FLOW: Mark linear narrative as complete
                        // Applies to fallback scenarios for dynamic chapters
                        if (isStoryMode) {
                          setNarrativeComplete(true);
                        }
                      }}
                    />
                  </View>
                )}

                {/* CTA for next briefing */}
                {showNextBriefingCTA && (
                  <View style={{ marginTop: scaleSpacing(SPACING.xs) }}>
                    <PrimaryButton
                      label={isGenerating ? "Generating Chapter..." : generationError ? "Retry Chapter Generation" : "Continue Investigation"}
                      onPress={onContinueStory}
                      disabled={isGenerating}
                      fullWidth
                    />
                    {isGenerating && (
                      <Text style={[styles.generatingHint, { color: palette.badgeText, fontSize: slugSize, marginTop: scaleSpacing(SPACING.xs) }]}>
                        Please wait while the next chapter is being generated...
                      </Text>
                    )}
                    {generationError && !isGenerating && (
                      <Text style={[styles.errorHint, { color: '#ff4444', fontSize: slugSize, marginTop: scaleSpacing(SPACING.xs) }]}>
                        ⚠️ {generationError}
                      </Text>
                    )}
                  </View>
                )}

                {/* Story Prompt Logic (e.g. Next Chapter Ready or Locked) */}
                {storyPromptConfig && (
                  <View
                    style={[
                      styles.storyPromptCard,
                      {
                        borderRadius: scaleRadius(RADIUS.lg),
                        borderColor: palette.border,
                        padding: scaleSpacing(SPACING.md),
                        gap: scaleSpacing(SPACING.xs),
                      },
                    ]}
                  >
                    <Text style={[styles.storyPromptLabel, { color: palette.accent, fontSize: slugSize }]}>{storyPromptConfig.title}</Text>
                    <Text style={[styles.storyPromptBody, { color: palette.highlightText, fontSize: narrativeSize, lineHeight: narrativeLineHeight }]}>
                      {storyPromptConfig.body}
                    </Text>
                    {storyPromptConfig.hint && (
                      <Text style={[styles.storyPromptHint, { color: palette.badgeText, fontSize: slugSize }]}>{storyPromptConfig.hint}</Text>
                    )}
                    <PrimaryButton
                      label={storyPromptConfig.actionLabel}
                      icon={storyPromptConfig.actionIcon}
                      onPress={storyPromptConfig.onPress}
                      disabled={!storyPromptConfig.onPress}
                      fullWidth
                    />
                  </View>
                )}

                {/* Decision Panel */}
                <DecisionPanel
                  palette={palette}
                  compact={compact}
                  showDecisionPanel={showDecisionPanel}
                  showDecisionOptions={showDecisionOptions}
                  storyDecision={storyDecision}
                  decisionOptions={decisionOptions}
                  choiceStatusText={choiceStatusText}
                  choiceStatusSubtext={choiceStatusSubtext}
                  handleSelectOption={handleSelectOption}
                  handleConfirmOption={handleConfirmOption}
                  resolvedSelectionKey={resolvedSelectionKey}
                  lockedDecisionMeta={lockedDecisionMeta}
                  summaryOptionDetails={summaryOptionDetails}
                  choiceToast={null} // Passed choiceToast as null, relying on internal state of DecisionPanel if needed or lifting it up. 
                  // The original had choiceToast state, but didn't see logic setting it other than initialization. 
                  // Assuming not critical or can be re-added.
                  celebrationActive={celebrationActive}
                  setCelebrationActive={setCelebrationActive}
                  hasLockedDecision={hasLockedDecision}
                  lockCelebrationOpacity={lockCelebrationOpacity}
                  lockCelebrationScale={lockCelebrationScale}
                  lockedDecisionTimestamp={lockedDecisionTimestamp}
                />

                {/* Footer */}
                {!showNextBriefingCTA && (
                  <View
                    style={[
                      styles.footerRow,
                      showGoHomeButton && styles.footerRowSplit,
                      showGoHomeButton && { gap: scaleSpacing(SPACING.md) },
                    ]}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.footerRibbon,
                        nextCaseButtonEnabled && styles.footerRibbonButton,
                        footerRibbonStyle,
                        showGoHomeButton && styles.footerRibbonGrow,
                        pressed && nextCaseButtonEnabled && styles.footerRibbonPressed,
                      ]}
                      disabled={!nextCaseButtonEnabled}
                      accessibilityRole="button"
                      onPress={handleNextCaseRibbonPress}
                    >
                      <Text style={[styles.footerLabel, { fontSize: footerLabelSize, color: palette.badgeText }]}>
                        {unlockLabel.toUpperCase()}
                      </Text>
                      <Text style={[styles.footerValue, { fontSize: footerValueSize, color: palette.accent }]}>
                        {unlockValue}
                      </Text>
                      {nextCaseButtonEnabled && (
                        <Text style={[styles.footerHint, { color: palette.badgeText, fontSize: slugSize }]}>
                          Tap to review the next briefing
                        </Text>
                      )}
                    </Pressable>

                    {showGoHomeButton && (
                      <SecondaryButton
                        label="Go Home"
                        onPress={onReturnHome}
                        size={compact ? "compact" : "default"}
                        style={[styles.goHomeButton, compact && styles.goHomeButtonFullWidth]}
                      />
                    )}
                  </View>
                )}
              </View>
            </ImageBackground>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* One-time teaching card: The Other Reader, at the first subverted verdict. */}
      <FieldNoteCard note={fieldNote} visible={!!fieldNote} onDismiss={() => setFieldNote(null)} reducedMotion={reducedMotion} />
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  backButton: { alignSelf: "flex-start" },
  boardWrapper: {
    position: "relative",
    overflow: "visible",
    borderWidth: 1,
    borderColor: "rgba(40, 25, 15, 0.5)",
    backgroundColor: "#1a120b",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 20 },
    elevation: 24,
  },
  boardFrame: { flex: 1, width: "100%", position: "relative", overflow: "hidden", padding: 1 },
  boardSurface: { flex: 1, width: "100%", position: "relative", overflow: "hidden" },
  boardGlow: { position: "absolute", top: -120, left: -80, opacity: 0.5 },
  boardNoise: { ...StyleSheet.absoluteFillObject, opacity: 0.08 },
  boardCorner: { position: "absolute", width: 72, height: 72, opacity: 0.4 },
  boardCornerTl: { top: -4, left: -4 },
  boardCornerTr: { top: -4, right: -4, transform: [{ scaleX: -1 }] },
  boardCornerBl: { bottom: -4, left: -4, transform: [{ scaleY: -1 }] },
  boardCornerBr: { bottom: -4, right: -4, transform: [{ scaleX: -1 }, { scaleY: -1 }] },
  boardContent: { position: "relative", width: "100%" },
  boardPin: {
    position: "absolute",
    backgroundColor: "#7a2e24",
    borderWidth: 1,
    borderColor: "#4a150f",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 1, height: 2 },
    elevation: 8,
    zIndex: 4,
  },
  boardPinLeft: { left: "22%" },
  boardPinRight: { right: "22%" },
  boardTape: {
    position: "absolute",
    backgroundColor: "rgba(245, 230, 200, 0.85)",
    borderRadius: 2,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
    zIndex: 3,
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  tapeGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  boardTapeLeft: { left: "18%", transform: [{ rotate: "-9deg" }] },
  boardTapeRight: { right: "18%", transform: [{ rotate: "7deg" }] },
  heroDivider: { alignSelf: "stretch", borderRadius: 999 },
  choiceSignalCard: { borderWidth: 1 },
  choiceSignalLabel: { fontFamily: FONTS.monoBold, letterSpacing: 2, textTransform: "uppercase" },
  choiceSignalBody: { fontFamily: FONTS.primary, fontStyle: "italic", letterSpacing: 0.6 },
  narrativeSection: { position: "relative", overflow: "visible" },
  echoCard: { borderWidth: 1, backgroundColor: "rgba(20, 12, 4, 0.78)" },
  echoKicker: { fontFamily: FONTS.monoBold, letterSpacing: 1.6, textTransform: "uppercase" },
  echoFrom: { fontFamily: FONTS.primary, fontStyle: "italic", letterSpacing: 0.4 },
  echoLine: { fontFamily: FONTS.primary, letterSpacing: 0.4 },
  verdictCard: { borderWidth: 1 },
  verdictTrue: { backgroundColor: "rgba(26, 18, 4, 0.82)", borderColor: "rgba(241, 197, 114, 0.45)" },
  verdictFalse: { backgroundColor: "rgba(26, 8, 6, 0.82)", borderColor: "rgba(200, 90, 80, 0.45)" },
  verdictKicker: { fontFamily: FONTS.monoBold, letterSpacing: 2, textTransform: "uppercase" },
  verdictBelief: { fontFamily: FONTS.primary, fontStyle: "italic", letterSpacing: 0.4 },
  verdictLine: { fontFamily: FONTS.primary, letterSpacing: 0.4 },
  storyPromptCard: { borderWidth: 1, backgroundColor: "rgba(8, 4, 2, 0.86)" },
  storyPromptLabel: { fontFamily: FONTS.monoBold, letterSpacing: 2, textTransform: "uppercase" },
  storyPromptBody: { fontFamily: FONTS.primary, letterSpacing: 0.6 },
  storyPromptHint: { fontFamily: FONTS.mono, letterSpacing: 1.4 },
  footerRow: { width: "100%" },
  footerRowSplit: { flexDirection: "row", flexWrap: "wrap", alignItems: "stretch" },
  footerRibbon: { borderWidth: 1, gap: 4, alignItems: "flex-start" },
  footerRibbonButton: { shadowColor: "#000", shadowOpacity: 0.42, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  footerRibbonPressed: { transform: [{ translateY: 2 }], opacity: 0.92 },
  footerRibbonGrow: { flex: 1, minWidth: 0 },
  footerLabel: { fontFamily: FONTS.mono, letterSpacing: 2 },
  footerValue: { fontFamily: FONTS.secondaryBold, letterSpacing: 3 },
  footerHint: { fontFamily: FONTS.primarySemiBold, textTransform: "uppercase", letterSpacing: 1.2 },
  goHomeButton: { flexShrink: 0, alignSelf: "flex-start" },
  goHomeButtonFullWidth: { alignSelf: "stretch", flexGrow: 1 },
  generatingHint: { fontFamily: FONTS.mono, letterSpacing: 1.2, textAlign: "center", fontStyle: "italic" },
  errorHint: { fontFamily: FONTS.mono, letterSpacing: 1.2, textAlign: "center", fontWeight: "bold" },
});