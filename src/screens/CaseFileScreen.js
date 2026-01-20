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

import { FONTS, FONT_SIZES } from "../constants/typography";
import { SPACING, RADIUS } from "../constants/layout";
import useResponsiveLayout from "../hooks/useResponsiveLayout";
import { createCasePalette } from "../theme/casePalette";
import { getStoryEntry, ROOT_PATH_KEY } from "../data/storyContent";
import { getPuzzleActionLabel, getPuzzleMode, PUZZLE_MODE } from "../utils/puzzleMode";
import {
  formatCountdown,
  parseDailyIntro,
  splitSummaryLines,
} from "../utils/caseFileHelpers";
import { paginateNarrativeSegments, calculatePaginationParams } from "../utils/textPagination";

const NOISE_TEXTURE = require("../../assets/images/ui/backgrounds/noise-texture.png");
const BOARD_CORNER_TL = require("../../assets/images/ui/decorative/corner-ornament-tl.png");
const BOARD_CORNER_TR = require("../../assets/images/ui/decorative/corner-ornament-tr.png");
const BOARD_CORNER_BL = require("../../assets/images/ui/decorative/corner-ornament-bl.png");
const BOARD_CORNER_BR = require("../../assets/images/ui/decorative/corner-ornament-br.png");

const FONT_TWEAK_FACTOR = 0.95;
const shrinkFont = (value) => Math.max(10, Math.floor(value * FONT_TWEAK_FACTOR));

export default function CaseFileScreen({
  activeCase,
  nextUnlockAt,
  storyCampaign,
  solvedCaseIds = [],
  onSelectDecision,
  onSelectDecisionBeforePuzzle, // NARRATIVE-FIRST: Pre-puzzle decision for C subchapters
  onSaveBranchingChoice, // TRUE INFINITE BRANCHING: Save player's path through interactive narrative
  onProceedToPuzzle, // NARRATIVE-FIRST FLOW: Navigate to puzzle after narrative complete
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
        console.log("Failed to load ambient sound", error);
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
        console.log(`[CaseFileScreen] Looking for speculative cache with path: ${previousBranchingPath}`);
      }
    }

    return getStoryEntry(caseNumber, pathKey, previousBranchingPath) || null;
  }, [activeCase?.caseNumber, activeCase?.storyMeta, storyCampaign]);

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
  const branchingNarrative = useMemo(() => {
    return storyMeta?.branchingNarrative || activeCase?.branchingNarrative || null;
  }, [storyMeta?.branchingNarrative, activeCase?.branchingNarrative]);

  const hasBranchingNarrative = Boolean(branchingNarrative?.opening?.text);

  // State for tracking branching narrative progress and evidence
  const [branchingProgress, setBranchingProgress] = useState(null);
  const [collectedEvidence, setCollectedEvidence] = useState([]);

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
  }, [caseNumber]);

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

  const persistBranchingChoice = useCallback((result, { isComplete = true } = {}) => {
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
    onSaveBranchingChoice(caseNumber, firstChoice, secondChoice, { isComplete });
  }, [onSaveBranchingChoice, caseNumber, normalizeBranchingPath]);

  const handleBranchingComplete = useCallback((result) => {
    setBranchingProgress(result ? { ...result, caseNumber } : result);

    // TRUE INFINITE BRANCHING: Persist the player's actual path through the narrative
    // This enables future content to continue from their actual experience, not the canonical path
    if (result?.path && !branchingChoiceComplete) {
      persistBranchingChoice(result, { isComplete: true });
    }

    // NARRATIVE-FIRST FLOW: Mark narrative as complete so we can show "Proceed to Puzzle" button
    // Applies to ALL subchapters with branching narrative (including 1A)
    // Note: Prefetch is triggered by onSaveBranchingChoice -> saveBranchingChoiceAndPrefetch
    if (hasBranchingNarrative) {
      setNarrativeComplete(true);
    }
  }, [caseNumber, hasBranchingNarrative, persistBranchingChoice, branchingChoiceComplete]);

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
    // Note: No speculative prefetch needed - generation happens after second choice
    // via onSaveBranchingChoice -> triggerPrefetchAfterBranchingComplete
  }, []);

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

  const storyDecision = useMemo(() => {
    const fallback = activeCase?.storyDecision || storyMeta?.decision || null;

    const metaPathDecisions = storyMeta?.pathDecisions;
    if (!metaPathDecisions) return fallback;

    // Only C subchapters use pathDecisions.
    if (subchapterLetter !== 'C') return fallback;

    // Prefer the in-session completed path; fall back to persisted branching choice; then default.
    const defaultPathKey = '1A-2A';
    const pathKey = resolvedBranchingPath || defaultPathKey;

    if (Array.isArray(metaPathDecisions)) {
      const picked =
        metaPathDecisions.find((d) => d?.pathKey === pathKey) ||
        metaPathDecisions.find((d) => d?.pathKey === defaultPathKey) ||
        metaPathDecisions[0] ||
        fallback;
      return picked;
    }

    // Legacy object map format
    return metaPathDecisions[pathKey] || metaPathDecisions[defaultPathKey] || fallback;
  }, [
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

  // Handle both new schema (optionA/optionB objects) and old schema (options array)
  const decisionOptions = useMemo(() => {
    if (storyDecision?.optionA && storyDecision?.optionB) {
      // New schema: convert optionA/optionB to array format
      return [
        { key: 'A', ...storyDecision.optionA },
        { key: 'B', ...storyDecision.optionB },
      ];
    }
    // Old schema: use options array directly
    return Array.isArray(storyDecision?.options) ? storyDecision.options : [];
  }, [storyDecision?.optionA, storyDecision?.optionB, storyDecision?.options]);

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
  const showDecisionPrompt = showDecision && shouldGateDecisionPanel && !decisionPanelRevealed;
  const showDecisionPanel = decisionPanelRevealed && (showDecision || hasLockedDecision);

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
  const showDecisionOptions = showDecision && (
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
    ? "Choose the intel dossier to branch this subchapter."
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
        // C subchapter: Must make decision before puzzle
        if (hasPreDecision) {
          return {
            title: "Path Chosen",
            body: "Your decision is sealed. Now solve the evidence board to confirm your fate.",
            hint: "The puzzle awaits to complete this chapter.",
            actionLabel: puzzleActionLabel,
            actionIcon: "🔍",
            onPress: onProceedToPuzzle,
          };
        }
        // Decision not yet made - don't show puzzle button (let them decide first)
      } else if (narrativeReadyForPuzzle) {
        // A/B subchapter: Show puzzle after narrative is complete (branching choices made)
        return {
          title: "Ready to Investigate",
          body: puzzleMode === PUZZLE_MODE.LOGIC
            ? "The clues are laid out. Solve the logic grid to piece together what happened."
            : "The evidence awaits. Connect the dots to uncover the truth.",
          hint: null,
          actionLabel: puzzleActionLabel,
          actionIcon: "🔍",
          onPress: onProceedToPuzzle,
        };
      }
    }

    if (pendingStoryAdvance && !showNextBriefingCTA && !storyLocked && !hideContinueInvestigationCTA) {
      return {
        title: "Next Chapter Ready",
        body: `${nextStoryLabel} is staged on the evidence board.`,
        hint: "Continue when you're ready to keep chasing the Confessor.",
        actionLabel: "Continue Investigation",
        actionIcon: "▶",
        onPress: typeof onContinueStory === "function" ? onContinueStory : null,
      };
    }
    if (isThirdSubchapter && (storyLocked || hasLockedDecision)) {
      return {
        title: "Chapter Locked",
        body: "You've completed all three subchapters. HQ needs you home until the next chapter unlocks.",
        hint: countdown ? `Unlocks in ${countdown}` : "Unlock window opens soon.",
        actionLabel: "Return Home",
        actionIcon: "🏠",
        onPress: typeof onReturnHome === "function" ? onReturnHome : null,
      };
    }
    return null;
  }, [countdown, isStoryMode, isThirdSubchapter, nextStoryLabel, onContinueStory, onReturnHome, pendingStoryAdvance, showNextBriefingCTA, storyLocked, hasLockedDecision, isSubchapterC, narrativeComplete, existingBranchingChoice, isCaseSolved, onProceedToPuzzle, hasPreDecision, puzzleMode, puzzleActionLabel, hideContinueInvestigationCTA]);

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
            <LinearGradient
              colors={["#e6cca5", "#d4b080", "#b08656"]}
              locations={[0, 0.4, 1]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={[
                styles.boardSurface, 
                { 
                  borderRadius: boardRadius,
                  margin: 2, // Slight inset to show the frame
                }
              ]}
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
                    <Text style={[styles.choiceSignalLabel, { color: palette.accent, fontSize: slugSize }]}>Pathfork Advisory</Text>
                    <Text style={[styles.choiceSignalBody, { color: palette.highlightText, fontSize: narrativeSize, lineHeight: narrativeLineHeight }]}>
                      Finish the journal entry. Once every page is turned, choose the path that rewrites this case.
                    </Text>
                  </View>
                )}

                {/* Narrative Section - Branching or Linear */}
                {hasBranchingNarrative ? (
                  <View style={styles.narrativeSection}>
                    <BranchingNarrativeReader
                      key={caseNumber || 'branching-narrative'}
                      branchingNarrative={branchingNarrative}
                      palette={palette}
                      onComplete={handleBranchingComplete}
                      onFirstChoice={handleFirstChoice}
                      onSecondChoice={handleSecondChoice}
                      onEvidenceCollected={handleEvidenceCollected}
                      initialChoice={branchingChoiceSeed}
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
                        borderColor: palette.accent,
                        padding: scaleSpacing(SPACING.md),
                        gap: scaleSpacing(SPACING.sm),
                      },
                    ]}
                  >
                    <View style={styles.storyPromptHeader}>
                      <View style={[styles.storyPromptAccent, { backgroundColor: palette.accent }]} />
                      <Text style={[styles.storyPromptLabel, { color: palette.accent, fontSize: slugSize + 1 }]}>{storyPromptConfig.title}</Text>
                    </View>
                    <Text style={[styles.storyPromptBody, { color: palette.highlightText, fontSize: narrativeSize }]}>
                      {storyPromptConfig.body}
                    </Text>
                    {storyPromptConfig.hint && (
                      <Text style={[styles.storyPromptHint, { color: palette.badgeText, fontSize: slugSize }]}>{storyPromptConfig.hint}</Text>
                    )}
                    <View style={{ marginTop: scaleSpacing(SPACING.xs) }}>
                      <PrimaryButton
                        label={storyPromptConfig.actionLabel}
                        icon={storyPromptConfig.actionIcon}
                        onPress={storyPromptConfig.onPress}
                        disabled={!storyPromptConfig.onPress}
                        fullWidth
                      />
                    </View>
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
            </LinearGradient>
          </LinearGradient>
        </View>
      </ScrollView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  backButton: {
    alignSelf: "flex-start",
    opacity: 0.9,
  },
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
    backgroundColor: "#8b7355",  // Antique brass - subtler than red
    borderWidth: 1,
    borderColor: "#5a4a3a",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 1, height: 2 },
    elevation: 6,
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
  storyPromptCard: {
    borderWidth: 2,
    backgroundColor: "rgba(26, 18, 11, 0.95)",
    // Subtle inner glow effect via shadow
    shadowColor: "#d4a574",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  storyPromptLabel: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  storyPromptBody: {
    fontFamily: FONTS.primary,
    letterSpacing: 0.4,
    lineHeight: 24,
  },
  storyPromptHint: {
    fontFamily: FONTS.mono,
    letterSpacing: 1.2,
    fontStyle: "italic",
    opacity: 0.8,
  },
  storyPromptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  storyPromptAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
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