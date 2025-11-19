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
  FlatList,
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
import ConfettiCannon from "react-native-confetti-cannon";

import ScreenSurface from "../components/ScreenSurface";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { FONTS, FONT_SIZES } from "../constants/typography";
import { SPACING, RADIUS } from "../constants/layout";
import useResponsiveLayout from "../hooks/useResponsiveLayout";
import { createCasePalette } from "../theme/casePalette";
import { getStoryEntry, ROOT_PATH_KEY } from "../data/storyContent";

const NOISE_TEXTURE = require("../../assets/images/ui/backgrounds/noise-texture.png");
const BOARD_CORNER_TL = require("../../assets/images/ui/decorative/corner-ornament-tl.png");
const BOARD_CORNER_TR = require("../../assets/images/ui/decorative/corner-ornament-tr.png");
const BOARD_CORNER_BL = require("../../assets/images/ui/decorative/corner-ornament-bl.png");
const BOARD_CORNER_BR = require("../../assets/images/ui/decorative/corner-ornament-br.png");

const FONT_TWEAK_FACTOR = 0.95;
const shrinkFont = (value) =>
  Math.max(10, Math.floor(value * FONT_TWEAK_FACTOR));

const BINDER_RING_COUNT = 4;
const MAX_NARRATIVE_PAGE_CHARACTERS = 820;

function paginateNarrativeSegments(
  segments,
  maxCharacters = MAX_NARRATIVE_PAGE_CHARACTERS,
) {
  if (!Array.isArray(segments) || !segments.length) {
    return [];
  }

  const pages = [];

  segments.forEach((rawSegment, segmentIndex) => {
    if (typeof rawSegment !== "string") {
      return;
    }

    const normalizedParagraphs = rawSegment
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .reduce((acc, paragraph) => {
        if (!paragraph) {
          return acc;
        }

        if (paragraph.length <= maxCharacters) {
          acc.push(paragraph);
          return acc;
        }

        let start = 0;
        while (start < paragraph.length) {
          let chunkEnd = Math.min(start + maxCharacters, paragraph.length);
          if (chunkEnd < paragraph.length) {
            const whitespaceIndex = paragraph.lastIndexOf(" ", chunkEnd);
            if (whitespaceIndex > start + maxCharacters * 0.4) {
              chunkEnd = whitespaceIndex;
            }
          }
          const chunk = paragraph.slice(start, chunkEnd).trim();
          if (!chunk) {
            break;
          }
          acc.push(chunk);
          start = chunkEnd;
        }
        return acc;
      }, []);

    if (!normalizedParagraphs.length) {
      return;
    }

    const pageParagraphs = [];
    let currentPage = [];

    const flushCurrentPage = () => {
      if (!currentPage.length) {
        return;
      }
      pageParagraphs.push(currentPage.join("\n\n"));
      currentPage = [];
    };

    normalizedParagraphs.forEach((paragraph) => {
      const candidate = currentPage.concat(paragraph).join("\n\n");
      if (candidate.length <= maxCharacters || currentPage.length === 0) {
        currentPage.push(paragraph);
        return;
      }

      flushCurrentPage();
      currentPage.push(paragraph);
    });

    flushCurrentPage();

    pageParagraphs.forEach((pageText, pageIndex) => {
      pages.push({
        key: `${segmentIndex}-${pageIndex}`,
        text: pageText,
        segmentIndex,
        pageIndex,
        totalPagesForSegment: pageParagraphs.length,
      });
    });
  });

  return pages;
}

function formatCountdown(nextUnlockAt) {
  if (!nextUnlockAt) return null;
  const target = new Date(nextUnlockAt).getTime();
  const now = Date.now();
  if (target <= now) return "Unlocking soon";
  const diff = target - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function parseDailyIntro(intro) {
  if (typeof intro !== "string") return null;
  const lines = intro
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  const [slugRaw, focusRaw, ...rest] = lines;
  const slug = slugRaw || null;
  const focus = focusRaw || null;
  const remainder = rest;
  const detail =
    remainder.length > 0
      ? remainder.join("\n")
      : !focus && slug
      ? slug
      : null;
  return {
    slug,
    focus,
    detail,
    remainder,
    lines,
  };
}

function splitSummaryLines(text) {
  if (typeof text !== "string") {
    return [];
  }
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function CaseFileScreen({
  activeCase,
  nextUnlockAt,
  storyCampaign,
  onSelectDecision,
  onBack,
  isStoryMode = false,
  onContinueStory,
  onReturnHome,
}) {
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
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    }, [unlockTarget]);

    const palette = useMemo(() => createCasePalette(activeCase), [activeCase]);
    const { sizeClass, moderateScale, scaleSpacing, scaleRadius } =
      useResponsiveLayout();

    const compact = sizeClass === "xsmall" || sizeClass === "small";
    const medium = sizeClass === "medium";

    const horizontalPadding = scaleSpacing(
      compact ? 0 : medium ? SPACING.xs : SPACING.sm,
    );
    const verticalPadding = scaleSpacing(compact ? SPACING.lg : SPACING.xl);
    const contentGap = scaleSpacing(compact ? SPACING.lg : SPACING.xl);
    const boardFrameRadius = scaleRadius(RADIUS.xl + 6);
    const boardRadius = scaleRadius(RADIUS.xl);
    const boardContentPaddingH = scaleSpacing(
      compact ? SPACING.xs : SPACING.sm,
    );
    const boardContentPaddingV = scaleSpacing(
      compact ? SPACING.xs : SPACING.sm,
    );
    const boardShadowRadius = Math.max(18, scaleSpacing(SPACING.xl));
    const boardShadowOffsetY = scaleSpacing(SPACING.md);
    const sectionGap = scaleSpacing(compact ? SPACING.md : SPACING.lg);
    const summaryPanelLift = Math.round(sectionGap * 0.4);
    const summaryPanelPadding = scaleSpacing(
      compact ? SPACING.xs : SPACING.sm,
    );
    const metaBadgeRadius = scaleRadius(RADIUS.md);
    const metaBadgePaddingV = scaleSpacing(compact ? SPACING.xs : SPACING.sm);
    const metaBadgePaddingH = scaleSpacing(compact ? SPACING.sm : SPACING.md);
    const blockRadius = scaleRadius(RADIUS.lg);

    const heroTitleSize = shrinkFont(
      moderateScale(compact ? FONT_SIZES.title : FONT_SIZES.display),
    );
    const heroNumberSize = shrinkFont(moderateScale(FONT_SIZES.sm));
    const slugSize = shrinkFont(moderateScale(FONT_SIZES.xs));
    const focusSize = shrinkFont(
      moderateScale(compact ? FONT_SIZES.xs : FONT_SIZES.sm),
    );
    const summaryBaseSize = compact ? FONT_SIZES.sm : FONT_SIZES.md;
    const summarySize = shrinkFont(moderateScale(summaryBaseSize));
    const summaryLineHeight = Math.round(summarySize * (compact ? 1.4 : 1.52));
  const narrativeSize = shrinkFont(moderateScale(FONT_SIZES.md));
  const narrativeLineHeight = Math.round(
    narrativeSize * (compact ? 1.56 : 1.68),
  );
  const footerLabelSize = shrinkFont(moderateScale(FONT_SIZES.xs));
  const footerValueSize = shrinkFont(
    moderateScale(compact ? FONT_SIZES.md : FONT_SIZES.lg),
  );
  const heroLetterRadius = scaleRadius(RADIUS.xl);
  const heroLetterPaddingV = scaleSpacing(compact ? SPACING.md : SPACING.lg);
  const heroLetterPaddingH = scaleSpacing(compact ? SPACING.lg : SPACING.xl);
  const heroLetterGap = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const heroLetterDividerThickness = Math.max(1, Math.round(scaleSpacing(1)));
  const heroLetterTapeWidth = Math.max(
    82,
    Math.round(scaleSpacing(compact ? SPACING.xxl : SPACING.xxl + SPACING.sm)),
  );
  const heroLetterTapeHeight = Math.max(
    20,
    Math.round(scaleSpacing(SPACING.sm) + 4),
  );
  const heroLetterShadowRadius = Math.max(
    12,
    Math.round(scaleSpacing(SPACING.md)),
  );
  const heroLetterShadowOffset = Math.max(
    6,
    Math.round(scaleSpacing(compact ? SPACING.sm : SPACING.md)),
  );
  const heroLetterQuoteSize = shrinkFont(
    moderateScale(compact ? FONT_SIZES.md : FONT_SIZES.lg),
  );
  const heroLetterQuoteLineHeight = Math.round(
    heroLetterQuoteSize * (compact ? 1.54 : 1.6),
  );
  const heroBannerPadding = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const heroDividerThickness = Math.max(1, Math.round(scaleSpacing(1)));
  const boardGlowSize = Math.max(
    220,
    Math.round(scaleSpacing(compact ? SPACING.xxl : SPACING.xxl + SPACING.sm)),
  );
  const pinSize = Math.max(14, Math.round(moderateScale(compact ? 18 : 22)));
  const pinOffset = Math.max(12, Math.round(pinSize * 0.65));
  const boardTapeWidth = Math.max(
    72,
    Math.round(scaleSpacing(compact ? SPACING.xxl : SPACING.xxl + SPACING.sm)),
  );
    const boardTapeHeight = Math.max(
      18,
      Math.round(scaleSpacing(SPACING.sm) + 6),
    );
    const boardTapeOffset = scaleSpacing(SPACING.xl);
    const narrativeSectionPaddingH = scaleSpacing(
      compact ? SPACING.xs : SPACING.sm,
    );
    const narrativeSectionPaddingV = scaleSpacing(
      compact ? SPACING.sm : SPACING.md,
    );
      const narrativePagePaddingH = scaleSpacing(
        compact ? SPACING.sm : SPACING.md,
      );
    const narrativePagePaddingV = scaleSpacing(compact ? SPACING.md : SPACING.lg);
    const narrativePageGap = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const narrativeRingSize = Math.max(
    14,
    Math.round(scaleSpacing(compact ? SPACING.md : SPACING.lg)),
  );
  const narrativeSegmentLabelSize = shrinkFont(moderateScale(FONT_SIZES.xs));
    const narrativePaginationGap = scaleSpacing(
      compact ? SPACING.xs : SPACING.sm,
    );
    const narrativePaginationDot = Math.max(6, Math.round(scaleSpacing(3)));
    const narrativePaginationDotActive = Math.max(
      22,
      Math.round(scaleSpacing(compact ? SPACING.sm : SPACING.md)),
    );
    const narrativeArrowSize = Math.max(
      40,
      Math.round(scaleSpacing(compact ? SPACING.xl : SPACING.xxl)),
    );
    const narrativeArrowInset = scaleSpacing(compact ? SPACING.sm : SPACING.md);
    const narrativeArrowFontSize = Math.round(narrativeArrowSize * 0.48);

  const dailyIntro = useMemo(
    () => parseDailyIntro(activeCase?.dailyIntro),
    [activeCase?.dailyIntro],
  );

  const caseSummary = useMemo(() => {
    if (
      typeof activeCase?.briefing?.summary === "string" &&
      activeCase.briefing.summary.trim()
    ) {
      return activeCase.briefing.summary.trim();
    }
    return null;
  }, [activeCase?.briefing?.summary]);

  const storyMeta = useMemo(() => {
    if (activeCase?.storyMeta) {
      return activeCase.storyMeta;
    }
    const caseNumber =
      typeof activeCase?.caseNumber === "string" ? activeCase.caseNumber : null;
    if (!caseNumber) {
      return null;
    }
    const chapterSlice = caseNumber.slice(0, 3);
    const chapterNumber = Number(chapterSlice);
    const chapterKey = Number.isNaN(chapterNumber) ? null : chapterNumber;
    const pathKey =
      (chapterKey &&
        storyCampaign?.pathHistory &&
        storyCampaign.pathHistory[chapterKey]) ||
      storyCampaign?.currentPathKey ||
      ROOT_PATH_KEY;
    return getStoryEntry(caseNumber, pathKey) || null;
  }, [
    activeCase?.caseNumber,
    activeCase?.storyMeta,
    storyCampaign?.currentPathKey,
    storyCampaign?.pathHistory,
  ]);

  const storySummary = useMemo(() => {
    if (!storyMeta) {
      return null;
    }
    const subchapterIndex = Number(storyMeta.subchapter);
    if (
      subchapterIndex === 1 &&
      typeof storyMeta.previously === "string" &&
      storyMeta.previously.trim()
    ) {
      const lines = splitSummaryLines(storyMeta.previously);
      if (lines.length) {
        return {
          lines,
          kind: "previously",
        };
      }
    }
    if (
      subchapterIndex > 1 &&
      typeof storyMeta.bridgeText === "string" &&
      storyMeta.bridgeText.trim()
    ) {
      const lines = splitSummaryLines(storyMeta.bridgeText);
      if (lines.length) {
        return {
          lines,
          kind: "bridgeText",
        };
      }
    }
    return null;
  }, [storyMeta]);
  const subchapterIndex = Number(storyMeta?.subchapter);
  const isThirdSubchapter = subchapterIndex === 3;

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
      const slug =
        typeof dailyIntro.slug === "string" && dailyIntro.slug.trim().length > 0
          ? dailyIntro.slug.trim()
          : null;
      const focus =
        typeof dailyIntro.focus === "string" && dailyIntro.focus.trim().length > 0
          ? dailyIntro.focus.trim()
          : null;
      const remainderLines = Array.isArray(dailyIntro.remainder)
        ? dailyIntro.remainder
            .map((line) =>
              typeof line === "string" ? line.replace(/\r/g, "").trim() : "",
            )
            .filter(Boolean)
        : [];
      const showSlugSeparately = Boolean(slug && focus);
      const lines = showSlugSeparately
        ? remainderLines
        : [
            ...(slug ? [slug] : []),
            ...remainderLines,
          ];

      if (!slug && !focus && !lines.length) {
        return null;
      }

      return {
        type: "dailyIntro",
        lines,
        focus,
        slug,
        showSlugSeparately,
      };
    }

    if (caseSummary) {
      const lines = caseSummary
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (!lines.length) {
        return null;
      }
      return {
        type: "caseSummary",
        lines,
        focus: null,
      };
    }

    return null;
  }, [caseSummary, dailyIntro, storySummary]);

    const narrative = useMemo(() => {
      const metaNarrative = storyMeta?.narrative;
      if (Array.isArray(metaNarrative)) {
        return metaNarrative.filter(Boolean);
      }
      if (typeof metaNarrative === "string" && metaNarrative.trim()) {
        return [metaNarrative];
      }
      if (Array.isArray(activeCase?.narrative)) {
        return activeCase.narrative.filter(Boolean);
      }
      if (typeof activeCase?.narrative === "string" && activeCase.narrative.trim()) {
        return [activeCase.narrative];
      }
      return [];
    }, [storyMeta, activeCase?.narrative]);

  const narrativePages = useMemo(
    () => paginateNarrativeSegments(narrative),
    [narrative],
  );

  const caseNumber = activeCase?.caseNumber;
  const storyDecision = activeCase?.storyDecision;
  const awaitingDecision = Boolean(
    storyDecision &&
      storyCampaign?.awaitingDecision &&
      storyCampaign?.pendingDecisionCase === caseNumber,
  );
  const storyLocked = Boolean(!awaitingDecision && storyUnlockAt);
  const storyActiveCaseNumber = storyCampaign?.activeCaseNumber;
  const pendingStoryAdvance = Boolean(
    !awaitingDecision &&
      storyActiveCaseNumber &&
      caseNumber &&
      storyActiveCaseNumber !== caseNumber,
  );
  const nextStoryLabel =
    storyCampaign?.chapter != null && storyCampaign?.subchapter != null
      ? `Chapter ${storyCampaign.chapter}.${storyCampaign.subchapter}`
      : "the next chapter";
    const decisionChoice = Array.isArray(storyCampaign?.choiceHistory)
      ? storyCampaign.choiceHistory.find((entry) => entry.caseNumber === caseNumber)
      : null;
    const lastDecision = storyCampaign?.lastDecision;
  const showDecision = Boolean(storyDecision);
    const selectedOptionKey =
      decisionChoice?.optionKey ||
      (lastDecision?.caseNumber === caseNumber ? lastDecision.optionKey : null);
    const displayCaseNumber = caseNumber || "---";
  const decisionOptions = useMemo(
    () => (Array.isArray(storyDecision?.options) ? storyDecision.options : []),
    [storyDecision?.options],
  );
  const shouldGateDecisionPanel = awaitingDecision && isThirdSubchapter;
  const [decisionPanelRevealed, setDecisionPanelRevealed] = useState(
    !shouldGateDecisionPanel,
  );
  useEffect(() => {
    if (!shouldGateDecisionPanel) {
      setDecisionPanelRevealed(true);
    }
  }, [shouldGateDecisionPanel]);
  const handleRevealDecisionPanel = useCallback(() => {
    if (!showDecision || decisionPanelRevealed) {
      return;
    }
    setDecisionPanelRevealed(true);
    requestAnimationFrame(() => {
      if (scrollRef.current?.scrollToEnd) {
        scrollRef.current.scrollToEnd({ animated: true });
      } else if (scrollRef.current?.scrollTo) {
        scrollRef.current.scrollTo({
          y: Number.MAX_SAFE_INTEGER,
          animated: true,
        });
      }
    });
    if (Haptics?.selectionAsync) {
      Haptics.selectionAsync().catch(() => {});
    }
  }, [decisionPanelRevealed, showDecision]);
  const hasLockedDecision =
    Boolean(
      !awaitingDecision &&
        resolvedSelectionKey &&
        lastDecision?.caseNumber === caseNumber,
    );
  const showDecisionPrompt =
    showDecision && shouldGateDecisionPanel && !decisionPanelRevealed;
  const showDecisionPanel =
    decisionPanelRevealed && (showDecision || hasLockedDecision);
  const showDecisionOptions = showDecision && awaitingDecision;
  const choiceAnimations = useRef(new Map()).current;
  const ensureChoiceAnim = useCallback(
    (optionKey) => {
      if (!optionKey) {
        return null;
      }
      if (!choiceAnimations.has(optionKey)) {
        choiceAnimations.set(optionKey, new Animated.Value(0));
      }
      return choiceAnimations.get(optionKey);
    },
    [choiceAnimations],
  );
  const [localSelection, setLocalSelection] = useState(selectedOptionKey);
  useEffect(() => {
    setLocalSelection(selectedOptionKey);
  }, [selectedOptionKey]);
  const resolvedSelectionKey = localSelection || selectedOptionKey || null;
  const selectedOptionDetails = useMemo(
    () =>
      decisionOptions.find((option) => option.key === resolvedSelectionKey) ||
      null,
    [decisionOptions, resolvedSelectionKey],
  );
  const [lockedOptionSnapshot, setLockedOptionSnapshot] = useState(null);
  useEffect(() => {
    setLockedOptionSnapshot(null);
  }, [caseNumber]);
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
  const pulseChoice = useCallback(
    (optionKey) => {
      const anim = ensureChoiceAnim(optionKey);
      if (!anim) {
        return;
      }
      anim.stopAnimation();
      Animated.sequence([
        Animated.spring(anim, {
          toValue: 1,
          stiffness: 260,
          damping: 18,
          mass: 0.5,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    },
    [ensureChoiceAnim],
  );
  const [celebrationActive, setCelebrationActive] = useState(false);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const decisionSectionRef = useRef(null);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: -10, y: 0 });
  const toastTimeoutRef = useRef(null);
  const [choiceToast, setChoiceToast] = useState(null);
  const lockCelebrationScale = useRef(new Animated.Value(0.9)).current;
  const lockCelebrationOpacity = useRef(new Animated.Value(0)).current;
  const lockCelebrationKeyRef = useRef(null);
  useEffect(() => {
    if (
      !hasLockedDecision ||
      !lastDecision ||
      lastDecision.caseNumber !== caseNumber
    ) {
      if (!hasLockedDecision) {
        lockCelebrationKeyRef.current = null;
        Animated.timing(lockCelebrationOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
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
        Animated.spring(lockCelebrationScale, {
          toValue: 1.08,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.spring(lockCelebrationScale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(lockCelebrationOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    caseNumber,
    hasLockedDecision,
    lastDecision,
    lockCelebrationOpacity,
    lockCelebrationScale,
  ]);
  const updateConfettiOrigin = useCallback(() => {
    if (
      !decisionSectionRef.current ||
      typeof decisionSectionRef.current.measureInWindow !== "function"
    ) {
      return;
    }
    decisionSectionRef.current.measureInWindow((x, y, width, height) => {
      setConfettiOrigin({
        x: x + width / 2,
        y: y + height * 0.1,
      });
    });
  }, []);
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);
  const handleDecisionLayout = useCallback(() => {
    requestAnimationFrame(updateConfettiOrigin);
  }, [updateConfettiOrigin]);
  const choiceStatusText = awaitingDecision
    ? "Choose the intel dossier to branch this subchapter."
    : resolvedSelectionKey
    ? "Branch locked."
    : "Awaiting HQ update.";
  const choiceStatusSubtext = awaitingDecision
    ? "Your selection rewrites the third subchapter."
    : summaryOptionDetails && resolvedSelectionKey
    ? `Option ${resolvedSelectionKey} • ${
        summaryOptionDetails.title || "Recorded choice"
      }`
    : null;
  const storyPromptConfig = useMemo(() => {
    if (!isStoryMode) {
      return null;
    }
    if (pendingStoryAdvance) {
      return {
        title: "Next Chapter Ready",
        body: `${nextStoryLabel} is staged on the evidence board.`,
        hint: "Continue when you're ready to keep chasing the Confessor.",
        actionLabel: "Continue Investigation",
        actionIcon: "▶",
        onPress: typeof onContinueStory === "function" ? onContinueStory : null,
      };
    }
    if (isThirdSubchapter && storyLocked) {
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
  }, [
    countdown,
    isStoryMode,
    isThirdSubchapter,
    nextStoryLabel,
    onContinueStory,
    onReturnHome,
    pendingStoryAdvance,
    storyLocked,
  ]);
  const handleSelectOption = useCallback(
    (option) => {
      if (!option || !awaitingDecision || !onSelectDecision || !caseNumber) {
        return;
      }
      setLocalSelection(option.key);
      setChoiceToast({ optionKey: option.key, title: option.title });
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = setTimeout(() => {
        setChoiceToast(null);
        toastTimeoutRef.current = null;
      }, 4200);
      pulseChoice(option.key);
      setCelebrationKey((prev) => prev + 1);
      setCelebrationActive(true);
      requestAnimationFrame(updateConfettiOrigin);
      if (Haptics?.impactAsync) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      onSelectDecision(caseNumber, option.key);
    },
    [
      awaitingDecision,
      caseNumber,
      onSelectDecision,
      pulseChoice,
      updateConfettiOrigin,
    ],
  );

  const lockedDecisionMeta = useMemo(() => {
    if (!hasLockedDecision || !lastDecision) {
      return null;
    }
    return {
      optionKey: resolvedSelectionKey,
      pathKey: lastDecision.nextPathKey || null,
      nextChapter: lastDecision.nextChapter || null,
      lockedAt: lastDecision.selectedAt || null,
    };
  }, [hasLockedDecision, lastDecision, resolvedSelectionKey]);
  const lockedDecisionTimestamp = useMemo(() => {
    if (!lockedDecisionMeta?.lockedAt) {
      return null;
    }
    try {
      return new Date(lockedDecisionMeta.lockedAt).toLocaleString();
    } catch (error) {
      return null;
    }
  }, [lockedDecisionMeta?.lockedAt]);

    const [narrativeWidth, setNarrativeWidth] = useState(0);
    const [activePage, setActivePage] = useState(0);
    const narrativeListRef = useRef(null);
    const narrativeFlipAnim = useRef(new Animated.Value(0)).current;
    const flipLockRef = useRef(false);

  const handleNarrativeLayout = useCallback(
    (event) => {
      const { width } = event.nativeEvent.layout;
      if (!width) {
        return;
      }
      if (Math.abs(width - narrativeWidth) > 2) {
        setNarrativeWidth(width);
      }
    },
    [narrativeWidth],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 });

  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length) {
      const nextIndex = viewableItems[0]?.index ?? 0;
      if (typeof nextIndex === "number") {
          setActivePage(nextIndex);
      }
    }
  });

    useEffect(() => {
      setActivePage(0);
      if (!narrativeListRef.current) {
        return;
      }
      try {
        narrativeListRef.current.scrollToIndex({ index: 0, animated: false });
      } catch (error) {
        narrativeListRef.current.scrollToOffset({ offset: 0, animated: false });
      }
    }, [narrativePages]);

  const narrativePageWidth = useMemo(() => {
    if (!narrativeWidth) {
      return 0;
    }
    const width = narrativeWidth - narrativeSectionPaddingH * 2;
    return width > 0 ? width : 0;
  }, [narrativeSectionPaddingH, narrativeWidth]);

    const goToPage = useCallback(
      (index, animated = true) => {
        if (!narrativeListRef.current || !narrativePages.length) {
          return;
        }
        const clampedIndex = Math.min(
          Math.max(index, 0),
          narrativePages.length - 1,
        );
        if (clampedIndex === activePage) {
          return;
        }
        try {
          narrativeListRef.current.scrollToIndex({
            index: clampedIndex,
            animated,
          });
        } catch (error) {
          if (!narrativePageWidth) {
            return;
          }
          const fallbackSpacing = narrativePageWidth + narrativePageGap;
          narrativeListRef.current.scrollToOffset({
            offset: Math.max(0, fallbackSpacing * clampedIndex),
            animated,
          });
        }
      },
      [
        activePage,
        narrativePageGap,
        narrativePageWidth,
        narrativePages.length,
      ],
    );
    const triggerPageFlip = useCallback(
      (direction) => {
        if (!direction || flipLockRef.current) {
          return;
        }
        const targetIndex = activePage + direction;
        if (targetIndex < 0 || targetIndex > narrativePages.length - 1) {
          return;
        }

        flipLockRef.current = true;
        narrativeFlipAnim.stopAnimation();
        narrativeFlipAnim.setValue(0);

        Animated.sequence([
          Animated.timing(narrativeFlipAnim, {
            toValue: direction > 0 ? -1 : 1,
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(narrativeFlipAnim, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          flipLockRef.current = false;
        });

        setActivePage(targetIndex);
        goToPage(targetIndex);
      },
      [
        activePage,
        goToPage,
        narrativeFlipAnim,
        narrativePages.length,
        setActivePage,
      ],
    );

    const flipRotation = narrativeFlipAnim.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: ["6deg", "0deg", "-6deg"],
    });
    const narrativePerspective = Math.max(
      620,
      Math.round(
        (narrativePageWidth || scaleSpacing(SPACING.xl)) * 1.6,
      ),
    );

    const isStoryLock = Boolean(storyUnlockAt);
    const hasUnlockTimer = Boolean(unlockTarget);
    let unlockLabel;
    let unlockValue;

    if (hasUnlockTimer) {
      unlockLabel = countdown
        ? isStoryLock
          ? 'Next chapter unlocks in'
          : 'Next case unlocks in'
        : isStoryLock
          ? 'Next chapter unlocks'
          : 'Next case unlocks';
      unlockValue = countdown || (isStoryLock ? 'After 24 hours' : 'At dawn');
    } else if (pendingStoryAdvance) {
      unlockLabel = 'Next case ready';
      unlockValue = 'Available now';
    } else if (awaitingDecision) {
      unlockLabel = 'Branch choice required';
      unlockValue = 'Select an option';
    } else {
      unlockLabel = 'Case status';
      unlockValue = 'Active';
    }

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
        <SecondaryButton
          label="Back to Results"
          arrow
          onPress={onBack}
          style={styles.backButton}
        />

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
          <LinearGradient
            colors={["rgba(58, 36, 18, 0.96)", "rgba(28, 16, 8, 0.98)"]}
            start={{ x: 0.12, y: 0 }}
            end={{ x: 0.88, y: 1 }}
            style={[styles.boardFrame, { borderRadius: boardFrameRadius }]}
          >
            <LinearGradient
              colors={["#d9b78b", "#c68f57", "#ab6b34"]}
              locations={[0, 0.55, 1]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={[styles.boardSurface, { borderRadius: boardRadius }]}
            >
              <View
                pointerEvents="none"
                style={[
                  styles.boardGlow,
                  {
                    width: boardGlowSize,
                    height: boardGlowSize,
                    borderRadius: boardGlowSize,
                    backgroundColor: palette.glow,
                  },
                ]}
              />
              <RNImage
                source={NOISE_TEXTURE}
                style={styles.boardNoise}
                resizeMode="repeat"
                pointerEvents="none"
              />
              <Image
                source={BOARD_CORNER_TL}
                style={[styles.boardCorner, styles.boardCornerTl]}
                pointerEvents="none"
              />
              <Image
                source={BOARD_CORNER_TR}
                style={[styles.boardCorner, styles.boardCornerTr]}
                pointerEvents="none"
              />
              <Image
                source={BOARD_CORNER_BL}
                style={[styles.boardCorner, styles.boardCornerBl]}
                pointerEvents="none"
              />
              <Image
                source={BOARD_CORNER_BR}
                style={[styles.boardCorner, styles.boardCornerBr]}
                pointerEvents="none"
              />

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
                <View
                  pointerEvents="none"
                  style={[
                    styles.boardPin,
                    styles.boardPinLeft,
                    {
                      width: pinSize,
                      height: pinSize,
                      borderRadius: pinSize / 2,
                      top: -pinOffset,
                    },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    styles.boardPin,
                    styles.boardPinRight,
                    {
                      width: pinSize,
                      height: pinSize,
                      borderRadius: pinSize / 2,
                      top: -pinOffset,
                    },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    styles.boardTape,
                    styles.boardTapeLeft,
                    {
                      width: boardTapeWidth,
                      height: boardTapeHeight,
                      top: -boardTapeOffset,
                    },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    styles.boardTape,
                    styles.boardTapeRight,
                    {
                      width: boardTapeWidth,
                      height: boardTapeHeight,
                      top: -boardTapeOffset * 0.72,
                    },
                  ]}
                />

                  <View style={[styles.heroBlock, { gap: sectionGap }]}>
                  <View style={styles.heroLetterStack}>
                    <View
                      pointerEvents="none"
                      style={[
                        styles.heroLetterShadow,
                        {
                          borderRadius: heroLetterRadius,
                          shadowRadius: heroLetterShadowRadius,
                          shadowOffset: {
                            width: 0,
                            height: heroLetterShadowOffset,
                          },
                          transform: [
                            { rotate: compact ? "-0.8deg" : "-0.5deg" },
                          ],
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.heroLetterPaper,
                        {
                          borderRadius: heroLetterRadius,
                          paddingHorizontal: heroLetterPaddingH,
                          paddingVertical: heroLetterPaddingV,
                          gap: heroLetterGap,
                          transform: [
                            { rotate: compact ? "-0.8deg" : "-0.5deg" },
                          ],
                        },
                      ]}
                    >
                      <Image
                        source={NOISE_TEXTURE}
                        style={[
                          styles.heroLetterNoise,
                          { borderRadius: heroLetterRadius },
                        ]}
                        pointerEvents="none"
                      />
                      <LinearGradient
                        pointerEvents="none"
                        colors={["rgba(255, 255, 255, 0.3)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0.14 }}
                        style={[
                          styles.heroLetterSheen,
                          { borderRadius: heroLetterRadius },
                        ]}
                      />
                      <View
                        pointerEvents="none"
                        style={[
                          styles.heroLetterTape,
                          styles.heroLetterTapeLeft,
                          {
                            width: heroLetterTapeWidth,
                            height: heroLetterTapeHeight,
                          },
                        ]}
                      />
                      <View
                        pointerEvents="none"
                        style={[
                          styles.heroLetterTape,
                          styles.heroLetterTapeRight,
                          {
                            width: heroLetterTapeWidth,
                            height: heroLetterTapeHeight,
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.caseNumber,
                          {
                            fontSize: heroNumberSize,
                            color: "#5b3a24",
                            letterSpacing: compact ? 2.4 : 3.2,
                          },
                        ]}
                      >
                          {`Case File #${displayCaseNumber}`}
                      </Text>
                        <Text
                          style={[
                            styles.caseTitle,
                            {
                              fontSize: heroTitleSize,
                              color: "#27160c",
                              letterSpacing: compact ? 3 : 4.2,
                              lineHeight: Math.round(
                                heroTitleSize * (compact ? 1.08 : 1.12),
                              ),
                            },
                          ]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.45}
                          lineBreakStrategyIOS="hangul-word"
                        >
                          {activeCase.title}
                        </Text>
                      <View
                        pointerEvents="none"
                        style={[
                          styles.heroLetterDivider,
                          {
                            height: heroLetterDividerThickness,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View
                  style={[
                    styles.heroDivider,
                    {
                      height: heroDividerThickness,
                      backgroundColor: "rgba(248, 216, 168, 0.16)",
                    },
                  ]}
                />

                  {summaryContent ? (
                    <View
                      style={[
                        styles.summaryPanel,
                        {
                          borderRadius: blockRadius,
                            padding: summaryPanelPadding,
                          borderColor: "rgba(190, 134, 68, 0.42)",
                          backgroundColor: "rgba(250, 236, 210, 0.96)",
                          gap: scaleSpacing(SPACING.xs),
                          marginTop: summaryPanelLift ? -summaryPanelLift : 0,
                        },
                      ]}
                    >
                      <View
                        style={[styles.summaryTape, styles.summaryTapeLeft]}
                        pointerEvents="none"
                      />
                      <View
                        style={[styles.summaryTape, styles.summaryTapeRight]}
                        pointerEvents="none"
                      />
                      <Image
                        source={NOISE_TEXTURE}
                        style={[
                          styles.summaryNoise,
                          { borderRadius: blockRadius },
                        ]}
                        pointerEvents="none"
                      />
                        {summaryContent.type === "dailyIntro" &&
                        summaryContent.showSlugSeparately &&
                        summaryContent.slug ? (
                          <Text
                            style={[
                              styles.summaryText,
                              {
                                fontSize: summarySize,
                                lineHeight: summaryLineHeight,
                                color: "#2b1a10",
                              },
                            ]}
                          >
                            {summaryContent.slug}
                          </Text>
                        ) : null}
                        {summaryContent.focus ? (
                        <View style={styles.summaryFocusRow}>
                          <Text
                            style={[
                              styles.summaryFocusLabel,
                              { fontSize: slugSize },
                            ]}
                          >
                            FOCUS
                          </Text>
                          <Text
                            style={[
                              styles.summaryFocus,
                              {
                                fontSize: focusSize,
                              },
                            ]}
                          >
                            {summaryContent.focus}
                          </Text>
                        </View>
                      ) : null}
                      {summaryContent.lines.map((line, index) => (
                        <Text
                          key={`summary-line-${index}`}
                          style={[
                            styles.summaryText,
                            {
                              fontSize: summarySize,
                              lineHeight: summaryLineHeight,
                              color: "#2b1a10",
                            },
                          ]}
                        >
                          {line}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                    {showDecisionPrompt ? (
                      <View
                        style={[
                          styles.choiceSignalCard,
                          {
                            borderRadius: blockRadius,
                            borderColor: palette.border,
                            backgroundColor: "rgba(12, 6, 2, 0.82)",
                            padding: scaleSpacing(SPACING.sm),
                            gap: scaleSpacing(SPACING.xs),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceSignalLabel,
                            { color: palette.accent, fontSize: slugSize },
                          ]}
                        >
                          Pathfork Advisory
                        </Text>
                        <Text
                          style={[
                            styles.choiceSignalBody,
                              {
                                color: palette.highlightText,
                                fontSize: narrativeSize,
                                lineHeight: narrativeLineHeight,
                              },
                          ]}
                        >
                          Finish the journal entry. Once every page is turned, choose the path that
                          rewrites this case.
                        </Text>
                      </View>
                    ) : null}

                  {narrativePages.length > 0 ? (
                    <View
                    onLayout={handleNarrativeLayout}
                    style={[
                      styles.narrativeSection,
                      {
                        borderRadius: blockRadius,
                        borderColor: palette.border,
                        paddingHorizontal: narrativeSectionPaddingH,
                        paddingVertical: narrativeSectionPaddingV,
                        gap: narrativePageGap,
                      },
                      ]}
                    >
                      <Animated.View
                        style={[
                            styles.narrativePagerWrapper,
                            {
                              transform: [
                                { perspective: narrativePerspective },
                                { rotateY: flipRotation },
                              ],
                            },
                          ]}
                      >
                        <FlatList
                          ref={narrativeListRef}
                          data={narrativePages}
                          keyExtractor={(item) => item.key}
                          horizontal
                          pagingEnabled
                          scrollEnabled={false}
                          showsHorizontalScrollIndicator={false}
                          snapToAlignment="center"
                          decelerationRate="fast"
                          contentContainerStyle={styles.narrativePagerContent}
                          renderItem={({ item, index }) => {
                            const text =
                              typeof item?.text === "string"
                                ? item.text.trim()
                                : "";
                            if (!text) {
                              return null;
                            }

                            const isFirstPage = index === 0;
                            const isLastPage =
                              index === narrativePages.length - 1;
                            const pageWidth =
                              narrativePageWidth > 0
                                ? narrativePageWidth
                                : undefined;
                            const entryNumber = String(
                              item.segmentIndex + 1,
                            ).padStart(2, "0");
                            const entryLabel =
                              item.totalPagesForSegment > 1
                                ? `Journal Entry ${entryNumber} - Page ${String(
                                    item.pageIndex + 1,
                                  ).padStart(2, "0")}/${String(
                                    item.totalPagesForSegment,
                                  ).padStart(2, "0")}`
                                : `Journal Entry ${entryNumber}`;
                            const firstLetter = text.charAt(0);
                            const remainder = text.slice(1);
                              const showRevealButton = showDecisionPrompt && isLastPage;

                            return (
                              <View
                                style={[
                                  styles.narrativePage,
                                  {
                                    width: pageWidth ?? "100%",
                                    paddingHorizontal: narrativePagePaddingH,
                                    paddingVertical: narrativePagePaddingV,
                                    borderRadius: blockRadius,
                                    marginRight: isLastPage
                                      ? 0
                                      : narrativePageGap,
                                  },
                                ]}
                              >
                                <Pressable
                                  style={[
                                    styles.narrativeTapZone,
                                    styles.narrativeTapZoneLeft,
                                  ]}
                                  disabled={index === 0}
                                  onPress={() => triggerPageFlip(-1)}
                                  accessibilityRole="button"
                                  accessibilityLabel="Previous page"
                                  android_ripple={{
                                    color: "rgba(0, 0, 0, 0.08)",
                                  }}
                                  hitSlop={{
                                    left: 6,
                                    right: 12,
                                    top: 12,
                                    bottom: 12,
                                  }}
                                />
                                <Pressable
                                  style={[
                                    styles.narrativeTapZone,
                                    styles.narrativeTapZoneRight,
                                  ]}
                                  disabled={isLastPage}
                                  onPress={() => triggerPageFlip(1)}
                                  accessibilityRole="button"
                                  accessibilityLabel="Next page"
                                  android_ripple={{
                                    color: "rgba(0, 0, 0, 0.08)",
                                  }}
                                  hitSlop={{
                                    left: 12,
                                    right: 6,
                                    top: 12,
                                    bottom: 12,
                                  }}
                                />
                                <Image
                                  source={NOISE_TEXTURE}
                                  style={[
                                    styles.narrativePageNoise,
                                    { borderRadius: blockRadius },
                                  ]}
                                  pointerEvents="none"
                                />
                                <LinearGradient
                                  pointerEvents="none"
                                  colors={["rgba(0, 0, 0, 0.12)", "transparent"]}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 0.32, y: 1 }}
                                  style={[
                                    styles.narrativePageGradient,
                                    { borderRadius: blockRadius },
                                  ]}
                                />
                                <View
                                  pointerEvents="none"
                                  style={[
                                    styles.narrativePageTape,
                                    styles.narrativePageTapeLeft,
                                    {
                                      width: heroLetterTapeWidth * 0.68,
                                    },
                                  ]}
                                />
                                <View
                                  pointerEvents="none"
                                  style={[
                                    styles.narrativePageTape,
                                    styles.narrativePageTapeRight,
                                    {
                                      width: heroLetterTapeWidth * 0.54,
                                    },
                                  ]}
                                />
                                <View
                                  pointerEvents="none"
                                  style={[
                                    styles.narrativeRingColumn,
                                    {
                                      left: -(narrativeRingSize * 0.58),
                                      width: narrativeRingSize,
                                    },
                                  ]}
                                >
                                  {Array.from({ length: BINDER_RING_COUNT }).map(
                                    (_, ringIndex) => (
                                      <View
                                        key={`ring-${ringIndex}`}
                                        style={[
                                          styles.narrativeRing,
                                          {
                                            width: narrativeRingSize,
                                            height: narrativeRingSize,
                                            borderRadius:
                                              narrativeRingSize / 2,
                                          },
                                        ]}
                                      />
                                    ),
                                  )}
                                </View>

                                <View
                                  style={[
                                    styles.narrativeEntryBody,
                                    { gap: scaleSpacing(SPACING.xs) },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.narrativeSegmentLabel,
                                      {
                                        fontSize: narrativeSegmentLabelSize,
                                        color: "#5a3c26",
                                        letterSpacing: compact ? 1.8 : 2.4,
                                      },
                                    ]}
                                  >
                                    {entryLabel.toUpperCase()}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.narrativeParagraph,
                                      {
                                        fontSize: narrativeSize,
                                        lineHeight: narrativeLineHeight,
                                      },
                                    ]}
                                  >
                                    {isFirstPage ? (
                                      <Text>
                                        <Text
                                          style={[
                                            styles.narrativeDropCap,
                                            {
                                              color: palette.accent,
                                              fontSize: narrativeSize * 2.1,
                                              lineHeight: Math.round(
                                                narrativeLineHeight * 1.18,
                                              ),
                                            },
                                          ]}
                                        >
                                          {firstLetter}
                                        </Text>
                                        <Text
                                          style={styles.narrativeParagraphRest}
                                        >
                                          {remainder}
                                        </Text>
                                      </Text>
                                    ) : (
                                      text
                                    )}
                                  </Text>
                                </View>

                                <View
                                  style={styles.narrativePageStamp}
                                  pointerEvents="none"
                                >
                                  <Text
                                    style={[
                                      styles.narrativePageStampText,
                                      { fontSize: slugSize },
                                    ]}
                                  >
                                    {`PAGE ${String(index + 1).padStart(2, "0")}`}
                                  </Text>
                                </View>
                                  {showRevealButton ? (
                                    <Pressable
                                      style={({ pressed }) => [
                                        styles.narrativeChoiceButton,
                                        {
                                          borderRadius: blockRadius,
                                          marginTop: scaleSpacing(SPACING.md),
                                        },
                                        pressed && styles.narrativeChoiceButtonPressed,
                                      ]}
                                      onPress={handleRevealDecisionPanel}
                                      accessibilityRole="button"
                                      accessibilityLabel="Reveal branching choice"
                                    >
                                      <Text
                                        style={[
                                          styles.narrativeChoiceLabel,
                                          {
                                            fontSize: narrativeSize,
                                          },
                                        ]}
                                      >
                                        Seal Your Path
                                      </Text>
                                      <Text
                                        style={[
                                          styles.narrativeChoiceHint,
                                          { fontSize: slugSize },
                                        ]}
                                      >
                                        Tap to bring up HQ's branching dossier.
                                      </Text>
                                    </Pressable>
                                  ) : null}
                              </View>
                            );
                          }}
                          viewabilityConfig={viewabilityConfig.current}
                          onViewableItemsChanged={
                            handleViewableItemsChanged.current
                          }
                        />
                      </Animated.View>

                      <Pressable
                        style={[
                          styles.narrativePageArrow,
                          styles.narrativePageArrowLeft,
                          {
                            width: narrativeArrowSize,
                            height: narrativeArrowSize,
                            borderRadius: narrativeArrowSize / 2,
                            transform: [
                              { translateY: -narrativeArrowSize / 2 },
                            ],
                            left: -narrativeArrowInset,
                          },
                          activePage === 0 && styles.narrativePageArrowDisabled,
                        ]}
                        disabled={activePage === 0}
                        onPress={() => triggerPageFlip(-1)}
                        accessibilityRole="button"
                        accessibilityLabel="Previous journal page"
                        android_ripple={{
                          color: "rgba(255, 255, 255, 0.18)",
                        }}
                        hitSlop={{ left: 12, right: 6, top: 12, bottom: 12 }}
                      >
                        <Text
                          style={[
                            styles.narrativePageArrowLabel,
                            {
                              fontSize: narrativeArrowFontSize,
                              letterSpacing: Math.max(
                                2,
                                Math.round(narrativeArrowFontSize * 0.22),
                              ),
                            },
                          ]}
                        >
                          {"<"}
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.narrativePageArrow,
                          styles.narrativePageArrowRight,
                          {
                            width: narrativeArrowSize,
                            height: narrativeArrowSize,
                            borderRadius: narrativeArrowSize / 2,
                            transform: [
                              { translateY: -narrativeArrowSize / 2 },
                            ],
                            right: -narrativeArrowInset,
                          },
                          activePage === narrativePages.length - 1 &&
                            styles.narrativePageArrowDisabled,
                        ]}
                        disabled={activePage === narrativePages.length - 1}
                        onPress={() => triggerPageFlip(1)}
                        accessibilityRole="button"
                        accessibilityLabel="Next journal page"
                        android_ripple={{
                          color: "rgba(255, 255, 255, 0.18)",
                        }}
                        hitSlop={{ left: 6, right: 12, top: 12, bottom: 12 }}
                      >
                        <Text
                          style={[
                            styles.narrativePageArrowLabel,
                            {
                              fontSize: narrativeArrowFontSize,
                              letterSpacing: Math.max(
                                2,
                                Math.round(narrativeArrowFontSize * 0.22),
                              ),
                            },
                          ]}
                        >
                          {">"}
                        </Text>
                      </Pressable>

                      <View
                        style={[
                          styles.narrativePagination,
                          {
                            gap: narrativePaginationGap,
                          },
                        ]}
                      >
                        <View style={styles.narrativePaginationTrack}>
                          {narrativePages.map((page, index) => (
                            <View
                              key={`page-dot-${page.key}`}
                              style={[
                                styles.narrativePaginationDot,
                                {
                                  width:
                                    index === activePage
                                      ? narrativePaginationDotActive
                                      : narrativePaginationDot,
                                  height:
                                    index === activePage
                                      ? narrativePaginationDot
                                      : narrativePaginationDot,
                                  backgroundColor:
                                    index === activePage
                                      ? palette.accent
                                      : "rgba(250, 236, 210, 0.38)",
                                  opacity: index === activePage ? 1 : 0.45,
                                  marginRight:
                                    index === narrativePages.length - 1
                                      ? 0
                                      : Math.max(
                                          4,
                                          Math.round(
                                            narrativePaginationGap / 1.8,
                                          ),
                                        ),
                                },
                              ]}
                            />
                          ))}
                        </View>
                        <Text
                          style={[
                            styles.narrativePaginationLabel,
                            {
                              color: palette.badgeText,
                              fontSize: slugSize,
                            },
                          ]}
                        >
                          {`Page ${String(activePage + 1).padStart(
                            2,
                            "0",
                          )} of ${String(narrativePages.length).padStart(
                            2,
                            "0",
                          )}`}
                        </Text>
                      </View>
                  </View>
                ) : null}

            {storyPromptConfig ? (
              <View
                style={[
                  styles.storyPromptCard,
                  {
                    borderRadius: blockRadius,
                    borderColor: palette.border,
                    padding: scaleSpacing(SPACING.md),
                    gap: scaleSpacing(SPACING.xs),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.storyPromptLabel,
                    { color: palette.accent, fontSize: slugSize },
                  ]}
                >
                  {storyPromptConfig.title}
                </Text>
                <Text
                  style={[
                    styles.storyPromptBody,
                    {
                      color: palette.highlightText,
                      fontSize: narrativeSize,
                      lineHeight: narrativeLineHeight,
                    },
                  ]}
                >
                  {storyPromptConfig.body}
                </Text>
                {storyPromptConfig.hint ? (
                  <Text
                    style={[
                      styles.storyPromptHint,
                      { color: palette.badgeText, fontSize: slugSize },
                    ]}
                  >
                    {storyPromptConfig.hint}
                  </Text>
                ) : null}
                <PrimaryButton
                  label={storyPromptConfig.actionLabel}
                  icon={storyPromptConfig.actionIcon}
                  onPress={storyPromptConfig.onPress}
                  disabled={!storyPromptConfig.onPress}
                  fullWidth
                />
              </View>
            ) : null}

                    {showDecisionPanel ? (
                    <View
                      ref={decisionSectionRef}
                      onLayout={handleDecisionLayout}
                      style={[
                        styles.decisionSection,
                        {
                          borderRadius: blockRadius,
                          borderColor: palette.border,
                          padding: scaleSpacing(SPACING.lg),
                          gap: scaleSpacing(SPACING.md),
                        },
                      ]}
                    >
                      <View style={styles.decisionHeaderRow}>
                        <View style={styles.decisionHeaderText}>
                          <Text
                            style={[
                              styles.decisionTitle,
                              { fontSize: summarySize, color: palette.accent },
                            ]}
                          >
                            Branch Divergence
                          </Text>
                            <Text
                              style={[
                                styles.decisionSubtitle,
                                {
                                  color: palette.highlightText,
                                  fontSize: narrativeSize,
                                },
                              ]}
                            >
                            {choiceStatusText}
                          </Text>
                        </View>
                      </View>

                      {choiceStatusSubtext ? (
                        <Text
                          style={[
                            styles.decisionStatusHelper,
                            { color: palette.badgeText, fontSize: slugSize },
                          ]}
                        >
                          {choiceStatusSubtext}
                        </Text>
                      ) : null}

                        {showDecisionOptions &&
                        Array.isArray(storyDecision?.intro) &&
                        storyDecision.intro.length ? (
                        <View
                          style={[
                            styles.decisionIntroCard,
                            {
                              borderRadius: blockRadius,
                              borderColor: palette.border,
                              padding: scaleSpacing(SPACING.sm),
                              gap: scaleSpacing(SPACING.xs),
                            },
                          ]}
                        >
                            {storyDecision?.intro.map((line, index) => (
                            <Text
                              key={`decision-intro-${index}`}
                              style={[
                                styles.decisionIntro,
                                { fontSize: narrativeSize, color: palette.badgeText },
                              ]}
                            >
                              {line}
                            </Text>
                          ))}
                        </View>
                      ) : null}

                        {showDecisionOptions && decisionOptions.length ? (
                          <View
                            style={[
                              styles.decisionOptionGrid,
                              { gap: scaleSpacing(SPACING.md) },
                            ]}
                          >
                            {decisionOptions.map((option) => {
                              const selected = resolvedSelectionKey === option.key;
                              const optionAnim = ensureChoiceAnim(option.key);
                              const baseScale = selected ? 1.02 : 1;
                              const cardScale = optionAnim
                                ? optionAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [baseScale, baseScale + 0.06],
                                  })
                                : baseScale;
                              const cardRotate = optionAnim
                                ? optionAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ["0deg", selected ? "-1deg" : "-0.4deg"],
                                  })
                                : "0deg";
                              const glowOpacity = optionAnim
                                ? optionAnim.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [0, 0.5, 0],
                                  })
                                : 0;

                              return (
                                <Pressable
                                  key={`decision-${option.key}`}
                                  style={({ pressed }) => [
                                    styles.decisionOptionPressable,
                                    pressed &&
                                      awaitingDecision &&
                                      styles.decisionOptionPressablePressed,
                                  ]}
                                  onPress={() => handleSelectOption(option)}
                                  disabled={!awaitingDecision}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Select option ${option.key}`}
                                >
                                  <Animated.View
                                    style={[
                                      styles.decisionOption,
                                      {
                                        borderRadius: blockRadius,
                                        borderColor: selected
                                          ? palette.accent
                                          : "rgba(244, 224, 200, 0.28)",
                                        backgroundColor: selected
                                          ? "rgba(250,236,210,0.16)"
                                          : "rgba(6,4,10,0.78)",
                                        transform: [{ scale: cardScale }, { rotate: cardRotate }],
                                      },
                                      !awaitingDecision &&
                                        !selected &&
                                        styles.decisionOptionDisabled,
                                    ]}
                                  >
                                    <Animated.View
                                      pointerEvents="none"
                                      style={[
                                        styles.decisionOptionGlow,
                                        {
                                          borderRadius: blockRadius,
                                          opacity: glowOpacity,
                                          backgroundColor: palette.accent,
                                        },
                                      ]}
                                    />
                                    <View style={styles.decisionOptionHeader}>
                                      <View style={styles.decisionOptionChip}>
                                        <Text
                                          style={[
                                            styles.decisionOptionLabel,
                                            { color: palette.accent },
                                          ]}
                                        >
                                          {`Option ${option.key}`}
                                        </Text>
                                      </View>
                                      <View
                                        style={[
                                          styles.decisionOptionStatusBadge,
                                          {
                                            borderColor: selected
                                              ? palette.accent
                                              : "rgba(244, 224, 200, 0.24)",
                                            backgroundColor: selected
                                              ? "rgba(250,236,210,0.12)"
                                              : "rgba(12, 8, 6, 0.6)",
                                          },
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.decisionOptionStatus,
                                            {
                                              color: selected ? palette.accent : palette.badgeText,
                                            },
                                          ]}
                                        >
                                          {selected
                                            ? awaitingDecision
                                              ? "Locking..."
                                              : "Path locked"
                                            : awaitingDecision
                                            ? "Tap to lock"
                                            : "Recorded"}
                                        </Text>
                                      </View>
                                    </View>

                                    <Text
                                      style={[
                                        styles.decisionOptionTitle,
                                        {
                                          color: palette.highlightText,
                                          fontSize: narrativeSize,
                                        },
                                      ]}
                                    >
                                      {option.title}
                                    </Text>

                                    {option.consequence ? (
                                      <Text style={styles.decisionOptionDetail}>
                                        {option.consequence}
                                      </Text>
                                    ) : null}

                                    <View style={styles.decisionOptionMetaRow}>
                                      {option.focus ? (
                                        <View style={styles.decisionOptionPill}>
                                          <Text style={styles.decisionOptionPillText}>
                                            {option.focus}
                                          </Text>
                                        </View>
                                      ) : null}
                                      {option.stats ? (
                                        <View style={styles.decisionOptionPill}>
                                          <Text style={styles.decisionOptionPillText}>
                                            {option.stats}
                                          </Text>
                                        </View>
                                      ) : null}
                                    </View>

                                    {option.outcome ? (
                                      <View style={styles.decisionOptionOutcomeCard}>
                                        <Text style={styles.decisionOptionOutcome}>
                                          {option.outcome}
                                        </Text>
                                      </View>
                                    ) : null}
                                  </Animated.View>
                                </Pressable>
                              );
                            })}
                          </View>
                        ) : null}

                        {hasLockedDecision && lockedDecisionMeta ? (
                          <Animated.View
                            style={[
                              styles.lockedDecisionCard,
                              {
                                borderRadius: blockRadius,
                                borderColor: palette.accent,
                                opacity: lockCelebrationOpacity,
                                transform: [{ scale: lockCelebrationScale }],
                              },
                            ]}
                          >
                            <View
                              pointerEvents="none"
                              style={[
                                styles.lockedDecisionGlow,
                                { borderRadius: blockRadius },
                              ]}
                            />
                            <Text
                              style={[
                                styles.lockedDecisionLabel,
                                { color: palette.accent, fontSize: slugSize },
                              ]}
                            >
                              Path Locked
                            </Text>
                            <Text
                              style={[
                                styles.lockedDecisionTitle,
                                { color: palette.highlightText, fontSize: narrativeSize },
                              ]}
                            >
                              {`Option ${lockedDecisionMeta.optionKey} · ${
                                summaryOptionDetails?.title || "Branch confirmed"
                              }`}
                            </Text>
                            <View style={styles.lockedDecisionMetaRow}>
                              {lockedDecisionMeta.nextChapter ? (
                                <View style={styles.lockedDecisionChip}>
                                  <Text style={styles.lockedDecisionChipLabel}>
                                    Next Chapter
                                  </Text>
                                  <Text style={styles.lockedDecisionChipValue}>
                                    {`Chapter ${lockedDecisionMeta.nextChapter}`}
                                  </Text>
                                </View>
                              ) : null}
                              {lockedDecisionMeta.pathKey ? (
                                <View style={styles.lockedDecisionChip}>
                                  <Text style={styles.lockedDecisionChipLabel}>
                                    Branch
                                  </Text>
                                  <Text style={styles.lockedDecisionChipValue}>
                                    {lockedDecisionMeta.pathKey}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            {lockedDecisionTimestamp ? (
                              <Text
                                style={[
                                  styles.lockedDecisionTimestamp,
                                  { color: palette.badgeText },
                                ]}
                              >
                                {`Locked ${lockedDecisionTimestamp}`}
                              </Text>
                            ) : null}
                            <Text
                              style={[
                                styles.lockedDecisionHint,
                                { color: palette.badgeText },
                              ]}
                            >
                              Return to the desk to continue along this path.
                            </Text>
                          </Animated.View>
                        ) : null}

                        {resolvedSelectionKey && summaryOptionDetails ? (
                          <View
                            style={[
                              styles.decisionSummary,
                              {
                                borderRadius: blockRadius,
                                borderColor: palette.accent,
                              },
                            ]}
                          >
                          <Text
                            style={[
                              styles.decisionSummaryLabel,
                              { color: palette.accent },
                            ]}
                          >
                            Locked Path
                          </Text>
                            <Text
                              style={[
                                styles.decisionSummaryValue,
                                { color: palette.highlightText },
                              ]}
                            >
                            {`Option ${resolvedSelectionKey} · ${
                              summaryOptionDetails.title || "Recorded choice"
                            }`}
                          </Text>
                        </View>
                      ) : null}

                        {choiceToast ? (
                          <View
                            style={[
                              styles.decisionToast,
                              {
                                borderRadius: blockRadius,
                                borderColor: palette.accent,
                              },
                            ]}
                          >
                          <Text
                            style={[
                              styles.decisionToastLabel,
                              { color: palette.accent },
                            ]}
                          >
                            Choice recorded
                          </Text>
                            <Text
                              style={[
                                styles.decisionToastValue,
                                { color: palette.highlightText },
                              ]}
                            >
                            {`Option ${choiceToast.optionKey} • ${choiceToast.title}`}
                          </Text>
                        </View>
                      ) : null}

                      {celebrationActive ? (
                        <View pointerEvents="none" style={styles.decisionConfettiLayer}>
                          <ConfettiCannon
                            key={`confetti-${celebrationKey}`}
                            count={72}
                            origin={confettiOrigin}
                            fadeOut
                            fallSpeed={2400}
                            explosionSpeed={360}
                            autoStart
                            colors={[
                              palette.accent,
                              "#ffe1a0",
                              "#ff9a62",
                              "#8ad9ff",
                              "#f5c8ff",
                            ]}
                            onAnimationEnd={() => setCelebrationActive(false)}
                          />
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                <View
                  style={[
                    styles.footerRibbon,
                    {
                      borderRadius: metaBadgeRadius,
                      paddingHorizontal: metaBadgePaddingH,
                      paddingVertical: metaBadgePaddingV,
                      borderColor: palette.border,
                      backgroundColor: palette.metricBackground,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.footerLabel,
                      {
                        fontSize: footerLabelSize,
                        color: palette.badgeText,
                      },
                    ]}
                  >
                    {unlockLabel.toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.footerValue,
                      {
                        fontSize: footerValueSize,
                        color: palette.accent,
                      },
                    ]}
                  >
                    {unlockValue}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </LinearGradient>
        </View>
      </ScrollView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    alignSelf: "flex-start",
  },
  boardWrapper: {
    position: "relative",
    overflow: "visible",
    borderWidth: 2,
    borderColor: "rgba(78, 50, 24, 0.82)",
    backgroundColor: "rgba(22, 12, 6, 0.92)",
    shadowColor: "#000",
    shadowOpacity: 0.42,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 22,
  },
  boardFrame: {
    flex: 1,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  boardSurface: {
    flex: 1,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  boardGlow: {
    position: "absolute",
    top: -160,
    left: -120,
    opacity: 0.32,
  },
  boardNoise: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.16,
  },
  boardCorner: {
    position: "absolute",
    width: 72,
    height: 72,
    opacity: 0.24,
  },
  boardCornerTl: {
    top: -10,
    left: -6,
  },
  boardCornerTr: {
    top: -10,
    right: -6,
    transform: [{ scaleX: -1 }],
  },
  boardCornerBl: {
    bottom: -10,
    left: -6,
    transform: [{ scaleY: -1 }],
  },
  boardCornerBr: {
    bottom: -10,
    right: -6,
    transform: [{ scaleX: -1 }, { scaleY: -1 }],
  },
  boardContent: {
    position: "relative",
    width: "100%",
  },
  boardPin: {
    position: "absolute",
    backgroundColor: "#5a221b",
    borderWidth: 2,
    borderColor: "#2a0d0a",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
    zIndex: 4,
  },
  boardPinLeft: {
    left: "22%",
  },
  boardPinRight: {
    right: "22%",
  },
  boardTape: {
    position: "absolute",
    backgroundColor: "rgba(251, 229, 184, 0.92)",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 3,
  },
  boardTapeLeft: {
    left: "18%",
    transform: [{ rotate: "-9deg" }],
  },
  boardTapeRight: {
    right: "18%",
    transform: [{ rotate: "7deg" }],
  },
  heroBlock: {
    flexDirection: "column",
    width: "100%",
  },
  heroHeaderRow: {
    width: "100%",
    flexWrap: "wrap",
  },
  heroBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  heroMetaBadge: {
    borderWidth: 1,
    gap: 4,
  },
  heroMetaLabel: {
    fontFamily: FONTS.mono,
    letterSpacing: 1.8,
  },
  heroMetaValue: {
    fontFamily: FONTS.primarySemiBold,
  },
  heroSlug: {
    fontFamily: FONTS.monoBold,
    textTransform: "uppercase",
  },
  heroLetterStack: {
    width: "100%",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  heroLetterShadow: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    shadowColor: "#000",
    shadowOpacity: 0.38,
    elevation: 12,
  },
  heroLetterPaper: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(82, 50, 28, 0.3)",
    backgroundColor: "rgba(255, 249, 236, 0.98)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    overflow: "hidden",
  },
  heroLetterNoise: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
  },
  heroLetterSheen: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  heroLetterTape: {
    position: "absolute",
    top: -16,
    height: 26,
    backgroundColor: "rgba(255, 237, 206, 0.9)",
    borderRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
  },
  heroLetterTapeLeft: {
    left: "18%",
    transform: [{ rotate: "-6deg" }],
  },
  heroLetterTapeRight: {
    right: "18%",
    transform: [{ rotate: "5deg" }],
  },
  heroLetterDivider: {
    width: "100%",
    backgroundColor: "rgba(62, 40, 22, 0.2)",
    opacity: 0.9,
  },
  heroLetterQuote: {
    fontFamily: FONTS.primary,
    color: "#3a2416",
    letterSpacing: 0.6,
  },
  heroLetterTag: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(92, 58, 34, 0.32)",
    backgroundColor: "rgba(248, 220, 182, 0.72)",
  },
  heroLetterTagText: {
    fontFamily: FONTS.primarySemiBold,
    letterSpacing: 1.4,
    color: "#3a2416",
  },
  heroDivider: {
    alignSelf: "stretch",
    borderRadius: 999,
  },
  caseNumber: {
    fontFamily: FONTS.monoBold,
    textTransform: "uppercase",
  },
  caseTitle: {
    fontFamily: FONTS.secondaryBold,
    textTransform: "uppercase",
  },
  metaLabel: {
    fontFamily: FONTS.mono,
    letterSpacing: 1.8,
  },
  summaryPanel: {
    position: "relative",
    borderWidth: 1,
    overflow: "visible",
  },
  summaryTape: {
    position: "absolute",
    top: -18,
    width: 84,
    height: 22,
    backgroundColor: "rgba(248, 230, 190, 0.9)",
    borderRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  summaryTapeLeft: {
    left: "18%",
    transform: [{ rotate: "-6deg" }],
  },
  summaryTapeRight: {
    right: "18%",
    transform: [{ rotate: "7deg" }],
  },
  summaryNoise: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.16,
  },
    summaryText: {
      fontFamily: FONTS.primary,
      fontStyle: "italic",
    },
  summaryFocusRow: {
    alignSelf: "flex-start",
    gap: 2,
  },
  summaryFocusLabel: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.6,
    color: "rgba(66, 40, 18, 0.6)",
  },
    summaryFocus: {
      fontFamily: FONTS.primarySemiBold,
      fontStyle: "italic",
      letterSpacing: 1.4,
      color: "#3a2416",
      textTransform: "uppercase",
    },
    choiceSignalCard: {
      borderWidth: 1,
    },
    choiceSignalLabel: {
      fontFamily: FONTS.monoBold,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    choiceSignalBody: {
      fontFamily: FONTS.primary,
      fontStyle: "italic",
      letterSpacing: 0.6,
    },
  storyPromptCard: {
    borderWidth: 1,
    backgroundColor: "rgba(8, 4, 2, 0.86)",
  },
  storyPromptLabel: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  storyPromptBody: {
    fontFamily: FONTS.primary,
    letterSpacing: 0.6,
  },
  storyPromptHint: {
    fontFamily: FONTS.mono,
    letterSpacing: 1.4,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  themeBadge: {
    borderWidth: 1,
    gap: 6,
    position: "relative",
    overflow: "hidden",
  },
  themeGallery: {
    position: "relative",
    borderWidth: 1,
  },
  themeGalleryHeader: {
    alignItems: "flex-start",
  },
  themeGalleryTitle: {
    fontFamily: FONTS.secondaryBold,
    textTransform: "uppercase",
  },
  themeGallerySubtitle: {
    fontFamily: FONTS.primary,
    letterSpacing: 0.6,
  },
  themeCardNoise: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  themeTapeAccent: {
    position: "absolute",
    top: -16,
    width: 72,
    height: 18,
    backgroundColor: "rgba(248, 230, 190, 0.88)",
    borderRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
  },
  themeTapeAccentLeft: {
    left: "18%",
    transform: [{ rotate: "-6deg" }],
  },
  themeTapeAccentRight: {
    right: "18%",
    transform: [{ rotate: "8deg" }],
  },
  themeValue: {
    fontFamily: FONTS.secondaryBold,
    textTransform: "uppercase",
  },
  narrativeSection: {
    position: "relative",
    borderWidth: 1,
    backgroundColor: "rgba(10, 8, 12, 0.9)",
    overflow: "visible",
  },
  narrativePagerContent: {
    paddingHorizontal: 0,
  },
    narrativePagerWrapper: {
      width: "100%",
      position: "relative",
    },
  narrativePage: {
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(92, 58, 34, 0.24)",
    backgroundColor: "rgba(255, 250, 236, 0.97)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  narrativePageNoise: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
  },
  narrativePageGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.28,
  },
  narrativePageTape: {
    position: "absolute",
    top: -18,
    height: 22,
    backgroundColor: "rgba(255, 235, 204, 0.9)",
    borderRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  narrativePageTapeLeft: {
    left: "12%",
    transform: [{ rotate: "-6deg" }],
  },
  narrativePageTapeRight: {
    right: "12%",
    transform: [{ rotate: "7deg" }],
  },
  narrativeRingColumn: {
    position: "absolute",
    top: 28,
    bottom: 28,
    justifyContent: "space-between",
    alignItems: "center",
  },
  narrativeRing: {
    backgroundColor: "rgba(28, 18, 12, 0.94)",
    borderWidth: 2,
    borderColor: "rgba(248, 226, 189, 0.68)",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  narrativeEntryBody: {
    flexDirection: "column",
  },
  narrativeSegmentLabel: {
    fontFamily: FONTS.mono,
  },
  narrativeParagraph: {
    fontFamily: FONTS.primary,
    letterSpacing: 0.4,
    color: "#2f1a10",
  },
  narrativeDropCap: {
    fontFamily: FONTS.secondaryBold,
    letterSpacing: 3,
    marginRight: 6,
  },
  narrativeParagraphRest: {
    fontFamily: FONTS.primary,
  },
  narrativePageStamp: {
    position: "absolute",
    bottom: 16,
    right: 18,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "rgba(255, 244, 215, 0.58)",
    borderColor: "rgba(92, 58, 34, 0.35)",
  },
  narrativePageStampText: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 2,
    color: "#4b2f1c",
  },
    narrativeChoiceButton: {
      position: "relative",
      borderWidth: 1,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: "rgba(255, 249, 236, 0.95)",
      borderColor: "rgba(92, 58, 34, 0.35)",
      alignItems: "flex-start",
      alignSelf: "stretch",
      gap: 4,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 16,
      zIndex: 20,
    },
    narrativeChoiceButtonPressed: {
      opacity: 0.9,
      transform: [{ translateY: 1 }],
    },
    narrativeChoiceLabel: {
      fontFamily: FONTS.secondaryBold,
      color: "#2f1a10",
      letterSpacing: 1.6,
    },
    narrativeChoiceHint: {
      fontFamily: FONTS.primary,
      color: "rgba(34, 20, 12, 0.7)",
      letterSpacing: 0.6,
    },
  narrativePagination: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  narrativePaginationTrack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  narrativePaginationDot: {
    height: 6,
    borderRadius: 999,
  },
    narrativePaginationLabel: {
      fontFamily: FONTS.mono,
      letterSpacing: 1.6,
    },
    narrativePageArrow: {
      position: "absolute",
      top: "50%",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(12, 8, 4, 0.85)",
      borderWidth: 1,
      borderColor: "rgba(248, 226, 189, 0.32)",
      shadowColor: "#000",
      shadowOpacity: 0.38,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
      zIndex: 8,
    },
    narrativePageArrowLeft: {
      left: 0,
    },
    narrativePageArrowRight: {
      right: 0,
    },
    narrativePageArrowLabel: {
      fontFamily: FONTS.secondaryBold,
      color: "rgba(255, 244, 215, 0.92)",
      textAlign: "center",
    },
    narrativePageArrowDisabled: {
      opacity: 0.45,
    },
  narrativeTapZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 6,
  },
  narrativeTapZoneLeft: {
    left: 0,
    width: "46%",
  },
  narrativeTapZoneRight: {
    right: 0,
    width: "46%",
  },
  footerRibbon: {
    borderWidth: 1,
    gap: 4,
    alignItems: "flex-start",
  },
  footerLabel: {
    fontFamily: FONTS.mono,
    letterSpacing: 2,
  },
  footerValue: {
    fontFamily: FONTS.secondaryBold,
    letterSpacing: 3,
  },
    decisionSection: {
      position: "relative",
      borderWidth: 1,
      backgroundColor: "rgba(8, 4, 2, 0.94)",
      overflow: "hidden",
    },
    decisionHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: SPACING.sm,
    },
    decisionHeaderText: {
      flex: 1,
      gap: 4,
    },
    decisionTitle: {
      fontFamily: FONTS.secondaryBold,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    decisionSubtitle: {
      fontFamily: FONTS.primarySemiBold,
      letterSpacing: 1,
    },
    decisionStatusHelper: {
      fontFamily: FONTS.primary,
      fontStyle: "italic",
      letterSpacing: 0.4,
    },
    decisionIntro: {
      fontFamily: FONTS.primary,
      color: "#d7c9b0",
    },
    decisionIntroCard: {
      borderWidth: 1,
      backgroundColor: "rgba(12, 6, 2, 0.72)",
    },
    decisionOptionGrid: {
      width: "100%",
    },
    decisionOptionPressable: {
      width: "100%",
    },
    decisionOptionPressablePressed: {
      transform: [{ translateY: 2 }],
      opacity: 0.92,
    },
    decisionOption: {
      borderWidth: 1,
      padding: SPACING.md,
      gap: 10,
      overflow: "hidden",
    },
    decisionOptionGlow: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0,
      shadowColor: "#000",
      shadowOpacity: 0.45,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    decisionOptionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: SPACING.sm,
    },
    decisionOptionChip: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: "rgba(244, 224, 200, 0.38)",
      backgroundColor: "rgba(24, 14, 8, 0.85)",
    },
    decisionOptionLabel: {
      fontFamily: FONTS.monoBold,
      letterSpacing: 1.8,
    },
    decisionOptionStatusBadge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderWidth: 1,
      borderRadius: RADIUS.md,
    },
    decisionOptionStatus: {
      fontFamily: FONTS.monoBold,
      letterSpacing: 1.4,
    },
    decisionOptionTitle: {
      fontFamily: FONTS.secondaryBold,
      letterSpacing: 1.5,
    },
    decisionOptionDetail: {
      fontFamily: FONTS.primary,
      color: "#c4b59b",
    },
    decisionOptionMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    decisionOptionPill: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(244, 224, 200, 0.28)",
      backgroundColor: "rgba(20, 12, 8, 0.78)",
    },
    decisionOptionPillText: {
      fontFamily: FONTS.mono,
      fontSize: FONT_SIZES.xs,
      letterSpacing: 1,
      color: "#d9c7a5",
    },
    decisionOptionOutcomeCard: {
      borderWidth: 1,
      borderRadius: RADIUS.md,
      padding: SPACING.sm,
      backgroundColor: "rgba(255, 237, 206, 0.12)",
      borderColor: "rgba(255, 237, 206, 0.24)",
    },
    decisionOptionOutcome: {
      fontFamily: FONTS.primary,
      color: "#e8dac0",
    },
    decisionOptionDisabled: {
      opacity: 0.55,
    },
    decisionSummary: {
      borderWidth: 1,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: "rgba(10, 6, 2, 0.85)",
      gap: 2,
    },
    decisionSummaryLabel: {
      fontFamily: FONTS.monoBold,
      letterSpacing: 1.4,
      fontSize: FONT_SIZES.xs,
    },
    decisionSummaryValue: {
      fontFamily: FONTS.primarySemiBold,
      fontSize: FONT_SIZES.md,
    },
    decisionToast: {
      borderWidth: 1,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: "rgba(255, 200, 140, 0.12)",
      gap: 2,
    },
    decisionToastLabel: {
      fontFamily: FONTS.monoBold,
      letterSpacing: 1.4,
      fontSize: FONT_SIZES.xs,
    },
    decisionToastValue: {
      fontFamily: FONTS.primarySemiBold,
      fontSize: FONT_SIZES.sm,
    },
  lockedDecisionCard: {
    borderWidth: 1,
    padding: SPACING.md,
    backgroundColor: "rgba(8, 4, 2, 0.92)",
    overflow: "hidden",
    gap: SPACING.sm,
  },
  lockedDecisionGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
    backgroundColor: "rgba(255, 214, 170, 0.5)",
  },
  lockedDecisionLabel: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  lockedDecisionTitle: {
    fontFamily: FONTS.secondaryBold,
    letterSpacing: 1.6,
  },
  lockedDecisionMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  lockedDecisionChip: {
    borderWidth: 1,
    borderColor: "rgba(244, 224, 200, 0.32)",
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: "rgba(16, 10, 6, 0.78)",
    gap: 2,
  },
  lockedDecisionChipLabel: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1.1,
    color: "rgba(255, 244, 215, 0.7)",
  },
  lockedDecisionChipValue: {
    fontFamily: FONTS.primarySemiBold,
    color: "#fff5dd",
    letterSpacing: 1.3,
  },
  lockedDecisionTimestamp: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1.1,
  },
  lockedDecisionHint: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 0.8,
  },
    decisionConfettiLayer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      pointerEvents: "none",
    },
});
