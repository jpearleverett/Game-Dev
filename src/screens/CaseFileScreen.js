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
import CaseHero from "../components/case-file/CaseHero";
import CaseSummary from "../components/case-file/CaseSummary";
import DecisionPanel from "../components/case-file/DecisionPanel";

import { FONTS, FONT_SIZES } from "../constants/typography";
import { SPACING, RADIUS } from "../constants/layout";
import useResponsiveLayout from "../hooks/useResponsiveLayout";
import { createCasePalette } from "../theme/casePalette";
import { getStoryEntry, ROOT_PATH_KEY } from "../data/storyContent";
import {
  formatCountdown,
  parseDailyIntro,
  splitSummaryLines,
} from "../utils/caseFileHelpers";
import { paginateNarrativeSegments } from "../utils/textPagination";

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
  onBack,
  isStoryMode = false,
  onContinueStory,
  onReturnHome,
}) {
  const { sizeClass, moderateScale, scaleSpacing, scaleRadius } = useResponsiveLayout();
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

  const palette = useMemo(() => createCasePalette(activeCase), [activeCase]);

  // Layout Metrics
  const horizontalPadding = scaleSpacing(compact ? 0 : medium ? SPACING.xs : SPACING.sm);
  const verticalPadding = scaleSpacing(compact ? SPACING.lg : SPACING.xl);
  const contentGap = scaleSpacing(compact ? SPACING.lg : SPACING.xl);
  const boardFrameRadius = scaleRadius(RADIUS.xl + 6);
  const boardRadius = scaleRadius(RADIUS.xl);
  const boardContentPaddingH = scaleSpacing(compact ? SPACING.xs : SPACING.sm);
  const boardContentPaddingV = scaleSpacing(compact ? SPACING.xs : SPACING.sm);
  const boardShadowRadius = Math.max(18, scaleSpacing(SPACING.xl));
  const boardShadowOffsetY = scaleSpacing(SPACING.md);
  const sectionGap = scaleSpacing(compact ? SPACING.md : SPACING.lg);
  
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
      
    return getStoryEntry(caseNumber, pathKey) || null;
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
  }, [caseSummary, dailyIntro, storySummary]);

  const narrative = useMemo(() => {
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
  }, [storyMeta, activeCase?.narrative, activeCase?.board?.outlierWords]);

  // Adjusted for Courier Prime (Monospace) + Increased Line Height
  // Monospace is wider, so we need fewer characters per page to prevent overflow.
  const pageCharLimit = compact ? 400 : 580;
  const narrativePages = useMemo(() => paginateNarrativeSegments(narrative, pageCharLimit), [narrative, pageCharLimit]);

  // Game State Logic
  const caseNumber = activeCase?.caseNumber;
  const storyDecision = activeCase?.storyDecision;
  const awaitingDecision = Boolean(storyDecision && storyCampaign?.awaitingDecision && storyCampaign?.pendingDecisionCase === caseNumber);
  const storyLocked = Boolean(!awaitingDecision && storyUnlockAt);
  const storyActiveCaseNumber = storyCampaign?.activeCaseNumber;
  const completedCaseNumbers = storyCampaign?.completedCaseNumbers || [];
  const isCaseSolved = completedCaseNumbers.includes(activeCase?.caseNumber) || solvedCaseIds.includes(activeCase?.id);

  const pendingStoryAdvance = Boolean(!awaitingDecision && storyActiveCaseNumber && caseNumber && storyActiveCaseNumber !== caseNumber);
  const showNextBriefingCTA = Boolean((pendingStoryAdvance || isCaseSolved) && typeof onContinueStory === "function" && !storyLocked && !awaitingDecision);
  const nextStoryLabel = storyCampaign?.chapter != null && storyCampaign?.subchapter != null 
    ? `Chapter ${storyCampaign.chapter}.${storyCampaign.subchapter}` 
    : "the next chapter";
    
  const decisionChoice = Array.isArray(storyCampaign?.choiceHistory) 
    ? storyCampaign.choiceHistory.find((entry) => entry.caseNumber === caseNumber) 
    : null;
  const lastDecision = storyCampaign?.lastDecision;
  const showDecision = Boolean(storyDecision);
  const selectedOptionKey = decisionChoice?.optionKey || (lastDecision?.caseNumber === caseNumber ? lastDecision.optionKey : null);
  const decisionOptions = useMemo(() => (Array.isArray(storyDecision?.options) ? storyDecision.options : []), [storyDecision?.options]);

  const subchapterIndex = Number(storyMeta?.subchapter);
  const isThirdSubchapter = subchapterIndex === 3;
  const shouldGateDecisionPanel = awaitingDecision && isThirdSubchapter;
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

  const hasLockedDecision = Boolean(!awaitingDecision && selectedOptionKey && lastDecision?.caseNumber === caseNumber);
  const showDecisionPrompt = showDecision && shouldGateDecisionPanel && !decisionPanelRevealed;
  const showDecisionPanel = decisionPanelRevealed && (showDecision || hasLockedDecision);
  const showDecisionOptions = showDecision && awaitingDecision;

  const [localSelection, setLocalSelection] = useState(selectedOptionKey);
  useEffect(() => { setLocalSelection(selectedOptionKey); }, [selectedOptionKey]);
  const resolvedSelectionKey = localSelection || selectedOptionKey || null;
  
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
    if (pendingStoryAdvance && !showNextBriefingCTA && !storyLocked) {
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
  }, [countdown, isStoryMode, isThirdSubchapter, nextStoryLabel, onContinueStory, onReturnHome, pendingStoryAdvance, showNextBriefingCTA, storyLocked, hasLockedDecision]);

  const handleSelectOption = useCallback((option) => {
    if (!option || !awaitingDecision) return;
    setLocalSelection(option.key);
    if (Haptics?.selectionAsync) Haptics.selectionAsync();
  }, [awaitingDecision]);

  const handleConfirmOption = useCallback((optionKey) => {
    if (!optionKey || !awaitingDecision || !onSelectDecision || !caseNumber) return;
    onSelectDecision(optionKey);
    setCelebrationActive(true);
    if (Haptics?.notificationAsync) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [awaitingDecision, caseNumber, onSelectDecision]);

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
        <SecondaryButton label="Back to Results" arrow onPress={onBack} style={styles.backButton} />

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

                <View style={[styles.heroDivider, { height: 1, backgroundColor: "rgba(248, 216, 168, 0.16)" }]} />

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

                {/* Narrative Pager */}
                {narrativePages.length > 0 && (
                  <View style={styles.narrativeSection}>
                    <NarrativePager
                      pages={narrativePages}
                      palette={palette}
                      showDecisionPrompt={showDecisionPrompt}
                      onRevealDecision={handleRevealDecisionPanel}
                    />
                  </View>
                )}

                {/* CTA for next briefing */}
                {showNextBriefingCTA && (
                  <View style={{ marginTop: scaleSpacing(SPACING.xs) }}>
                    <PrimaryButton label="Continue Investigation" onPress={onContinueStory} fullWidth />
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
});