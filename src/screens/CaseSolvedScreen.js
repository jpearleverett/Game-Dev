import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image as RNImage,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import ScreenSurface from "../components/ScreenSurface";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from "../constants/typography";
import { SPACING, RADIUS } from "../constants/layout";
import useResponsiveLayout from "../hooks/useResponsiveLayout";
import { GAME_STATUS } from "../context/GameContext";
import { createCasePalette } from "../theme/casePalette";
import { formatCaseOutlierThemes } from "../utils/themeDisplay";

const BOARD_NOISE_TEXTURE = require("../../assets/images/ui/backgrounds/noise-texture.png");
const BOARD_CORNER_TL = require("../../assets/images/ui/decorative/corner-ornament-tl.png");
const BOARD_CORNER_TR = require("../../assets/images/ui/decorative/corner-ornament-tr.png");
const BOARD_CORNER_BL = require("../../assets/images/ui/decorative/corner-ornament-bl.png");
const BOARD_CORNER_BR = require("../../assets/images/ui/decorative/corner-ornament-br.png");

const FONT_TWEAK_FACTOR = 0.95;
const shrinkFont = (value) =>
  Math.max(10, Math.floor(value * FONT_TWEAK_FACTOR));
const STAMP_COLOR = "#b51c1c";
const createThumbtackMetrics = (size) => {
  const head = Math.max(12, size);
  const rimThickness = Math.max(2, Math.round(head * 0.16));
  const innerHead = Math.max(6, head - rimThickness * 2);

  const stemHeight = Math.max(8, Math.round(head * 0.72));
  const stemWidth = Math.max(4, Math.round(head * 0.32));
  const stemHighlightWidth = Math.max(2, Math.round(stemWidth * 0.44));
  const stemInset = Math.round(stemHeight * 0.42);
  const visibleStem = Math.max(4, stemHeight - stemInset);
  const stemTop = head - stemInset;
  const stemHighlightHeight = Math.max(3, Math.round(visibleStem * 0.72));
  const stemHighlightTop = head + Math.round(visibleStem * 0.16);

  const tipHeight = Math.max(4, Math.round(head * 0.36));
  const tipWidth = Math.max(stemWidth + 2, Math.round(head * 0.34));
  const tipInset = Math.round(tipHeight * 0.22);
  const tipTop = head + visibleStem - tipInset;

  const offset = Math.round(head * 0.72);
  const clearance = Math.max(8, Math.round(head * 0.52));
  const shineSize = Math.max(4, Math.round(head * 0.4));
  const shineTop = Math.round(head * 0.22);
  const shineLeft = Math.round(head * 0.28);
  const horizontalJitter = Math.max(2, Math.round(head * 0.18));
  const angleRange = 9;
  const pivotOffset = Math.round(head * 0.46);

  return {
    head,
    stemHeight,
    stemWidth,
    stemTop,
    stemHighlightWidth,
    stemHighlightHeight,
    stemHighlightTop,
    tipHeight,
    tipWidth,
    tipTop,
    rimThickness,
    innerHead,
    offset,
    clearance,
    shineSize,
    shineTop,
    shineLeft,
    horizontalJitter,
    angleRange,
    pivotOffset,
  };
};

const pseudoRandomFromSeed = (seed) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const value = (hash >>> 0) / 4294967295;
  return Number.isFinite(value) && value > 0 ? value : 0.5;
};

const createThumbtackVariance = (seed, maxHorizontal = 0, maxAngle = 0) => {
  const center = (value) => value * 2 - 1;
  const horizontalBase = pseudoRandomFromSeed(`${seed}-horizontal`);
  const rotationBase = pseudoRandomFromSeed(`${seed}-angle`);

  const horizontalOffset = center(horizontalBase) * maxHorizontal;

  let angle = center(rotationBase) * maxAngle;
  if (maxAngle > 0) {
    const direction = rotationBase >= 0.5 ? 1 : -1;
    const minTilt = maxAngle * 0.35;
    if (Math.abs(angle) < minTilt) {
      angle = direction * minTilt;
    }
  }

  return { horizontalOffset, angle };
};

function buildShareMessage(caseData, submissionHistory, solved) {
  const attempts = solved ? submissionHistory.length : caseData.attempts;
  const rows = submissionHistory.map((entry) => {
    const greens = "🟩".repeat(entry.correctCount);
    const blacks = "⬛".repeat(entry.incorrectCount);
    const blanks = "⬛".repeat(
      Math.max(0, caseData.board.outlierWords.length - entry.correctCount),
    );
    return `${greens}${blacks || blanks}`;
  });

  if (!solved) {
    rows.push("⬛".repeat(caseData.board.outlierWords.length));
  }

  return [
    `🕵️ Detective Portrait - Case #${caseData.caseNumber}: ${caseData.title}`,
    ...rows,
    solved
      ? `Solved in ${attempts}/${caseData.attempts} attempts`
      : "Out of attempts... see you tomorrow.",
  ].join("\n");
}

export default function CaseSolvedScreen({
  activeCase,
  status,
  submissionHistory,
  confirmedOutliers = [],
  onReadCaseFile,
  onShare,
  onReturnHome,
  isStoryMode = false,
  storyCampaign = null,
  onAdvanceStory,
}) {
  const palette = useMemo(() => createCasePalette(activeCase), [activeCase]);
  const solved = status === GAME_STATUS.SOLVED;
  const caseNumber = activeCase?.caseNumber;
  const hasStoryCampaign = Boolean(storyCampaign);
  const awaitingDecision = Boolean(
    hasStoryCampaign &&
      storyCampaign?.awaitingDecision &&
      storyCampaign?.pendingDecisionCase === caseNumber,
  );
  const storyLocked = Boolean(
    hasStoryCampaign && !awaitingDecision && storyCampaign?.nextStoryUnlockAt,
  );

  const mainWords = useMemo(() => {
    const allWords = activeCase.board.grid.flat();
    return allWords.filter(
      (word) => !activeCase.board.outlierWords.includes(word),
    );
  }, [activeCase]);

  const shareMessage = useMemo(
    () => buildShareMessage(activeCase, submissionHistory, solved),
    [activeCase, submissionHistory, solved],
  );

  const victoryStamp = solved ? "Case Closed" : "Out of Attempts";
  const missedOutliers = useMemo(
    () =>
      activeCase.board.outlierWords.filter(
        (word) => !confirmedOutliers.includes(word),
      ),
    [activeCase.board.outlierWords, confirmedOutliers],
  );

  const missedSummary = missedOutliers.length
    ? missedOutliers.join(", ")
    : "No new leads recovered";
  const branchingOutlierThemes = activeCase?.branchingOutlierThemes;
  const hasBranchingThemes =
    Array.isArray(branchingOutlierThemes) && branchingOutlierThemes.length > 0;
  const outlierThemeListLabel =
    formatCaseOutlierThemes(activeCase, { separator: "  •  " }) || null;
  const patternDescriptor =
    hasBranchingThemes && branchingOutlierThemes.length > 1
      ? "The patterns were"
      : "The pattern was";
  const encouragement = solved
    ? null
    : `You missed: ${missedSummary}. ${patternDescriptor} ${
        outlierThemeListLabel || "the pattern you were chasing"
      }. Take a breath and come back fresh.`;

  let storyActionLabel = solved ? "Continue Story" : "Retry Case";
  if (awaitingDecision) {
    storyActionLabel = "Make Your Branch Choice";
  } else if (storyLocked) {
    storyActionLabel = "Chapter Locked";
  }
  const storyActionIcon = solved ? "▶" : "↻";
  const storyActionDisabled = awaitingDecision || storyLocked;

  const { sizeClass, isLandscape, moderateScale, scaleSpacing, scaleRadius } =
    useResponsiveLayout();

  const layoutConfig = useMemo(() => {
    const compact =
      !isLandscape &&
      (sizeClass === "xsmall" ||
        sizeClass === "small" ||
        sizeClass === "medium");
    return {
      compact,
      horizontalPadding: compact ? SPACING.sm : SPACING.lg,
      verticalSpacing: compact ? SPACING.lg : SPACING.xl,
      boardFramePadding: 0,
      boardContentPadding: compact ? SPACING.md : SPACING.md + SPACING.xs,
      sectionGap: compact ? SPACING.md : SPACING.lg + SPACING.sm,
      headerGap: compact ? SPACING.sm : SPACING.md,
      metaGap: SPACING.xs,
      metaWrapGap: compact ? SPACING.xs : SPACING.sm,
      notePadding: compact ? SPACING.md : SPACING.lg,
      themeGap: compact ? SPACING.md : SPACING.lg,
      sharePadding: compact ? SPACING.md : SPACING.lg,
      shareInnerPadding: compact ? SPACING.sm : SPACING.md,
      shareGap: compact ? SPACING.sm : SPACING.md,
      themeDirection: compact ? "column" : "row",
      surfaceHorizontalPadding: compact ? 0 : undefined,
    };
  }, [isLandscape, sizeClass]);

  const {
    compact,
    horizontalPadding,
    verticalSpacing,
    boardFramePadding,
    sectionGap,
    headerGap,
    metaGap,
    metaWrapGap,
    notePadding,
    themeGap,
    sharePadding,
    shareInnerPadding,
    shareGap,
    themeDirection,
    surfaceHorizontalPadding,
    boardContentPadding,
  } = layoutConfig;

  const horizontalPaddingValue = scaleSpacing(horizontalPadding);
  const verticalSpacingValue = scaleSpacing(verticalSpacing);
  const boardFramePaddingValue = scaleSpacing(boardFramePadding);
  const sectionGapValue = scaleSpacing(sectionGap);
  const headerGapValue = scaleSpacing(headerGap);
  const metaGapValue = scaleSpacing(metaGap);
  const metaWrapGapValue = scaleSpacing(metaWrapGap);
  const notePaddingValue = scaleSpacing(notePadding);
  const themeGapValue = scaleSpacing(themeGap);
  const sharePaddingValue = scaleSpacing(sharePadding);
  const shareInnerPaddingValue = scaleSpacing(shareInnerPadding);
  const shareGapValue = scaleSpacing(shareGap);
  const surfaceHorizontalPaddingValue =
    surfaceHorizontalPadding != null
      ? scaleSpacing(surfaceHorizontalPadding)
      : undefined;
  const boardContentPaddingValue = scaleSpacing(boardContentPadding);

  const boardFrameRadius = scaleRadius(RADIUS.xl + 6);
  const boardRadius = scaleRadius(RADIUS.xl);
  const cardRadius = scaleRadius(RADIUS.lg);
  const slipRadius = scaleRadius(RADIUS.md);
  const polaroidRadius = scaleRadius(RADIUS.lg);
  const pinSize = Math.max(12, Math.round(moderateScale(compact ? 16 : 18)));
  const pinOffset = Math.max(10, Math.round(pinSize * 0.6));
  const boardGlowSize = Math.max(
    220,
    Math.round(scaleSpacing(compact ? SPACING.xxl : SPACING.xxl + SPACING.sm)),
  );
  const boardShadowRadius = Math.max(18, scaleSpacing(SPACING.xl));
  const boardShadowOffsetY = scaleSpacing(SPACING.md);
  const metaBadgePaddingH = scaleSpacing(SPACING.sm);
  const metaBadgePaddingV = scaleSpacing(SPACING.xs);
  const shareTearHeight = Math.max(12, Math.round(scaleSpacing(SPACING.sm)));
  const shareLineGap = Math.max(4, Math.round(shareGapValue * 0.8));

  const stampSize = shrinkFont(moderateScale(FONT_SIZES.sm));
  const caseNumberSize = shrinkFont(moderateScale(FONT_SIZES.md));
  const titleSize = shrinkFont(
    moderateScale(compact ? FONT_SIZES.title : FONT_SIZES.display),
  );
  const titleHorizontalPadding = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const subtitleSize = shrinkFont(
    moderateScale(compact ? FONT_SIZES.md : FONT_SIZES.lg),
  );
  const metaLabelSize = shrinkFont(moderateScale(FONT_SIZES.xs));
  const metaValueSize = shrinkFont(
    moderateScale(compact ? FONT_SIZES.sm : FONT_SIZES.md),
  );
  const summaryFontSizeValue = shrinkFont(
    moderateScale(compact ? FONT_SIZES.md : FONT_SIZES.lg),
  );
  const summaryLineHeight = Math.round(
    summaryFontSizeValue * (compact ? 1.46 : 1.58),
  );
  const themeLabelSize = shrinkFont(moderateScale(FONT_SIZES.sm));
  const themeNameSize = shrinkFont(
    moderateScale(compact ? FONT_SIZES.lg : FONT_SIZES.title),
  );
  const themeWordsSize = shrinkFont(
    moderateScale(compact ? FONT_SIZES.md : FONT_SIZES.lg),
  );
  const shareLabelSize = shrinkFont(moderateScale(FONT_SIZES.sm));
  const shareLineSize = shrinkFont(moderateScale(FONT_SIZES.sm));
  const shareLineHeight = Math.round(shareLineSize * 1.44);

  const attemptsUsed = submissionHistory.length;
  const titleThumbtack = createThumbtackMetrics(
    Math.max(16, Math.round(moderateScale(compact ? 20 : 24))),
  );
  const titleThumbtackVariance = useMemo(
    () =>
      createThumbtackVariance(
        `title-${activeCase?.id ?? "unknown"}`,
        titleThumbtack.horizontalJitter,
        titleThumbtack.angleRange,
      ),
    [activeCase?.id, titleThumbtack],
  );

  const heroMeta = useMemo(() => {
    const items = [
      {
        id: "attempts",
        label: "Attempts Used",
        value: `${attemptsUsed}/${activeCase.attempts}`,
      },
    ];
    if (activeCase?.day != null) {
      items.push({ id: "day", label: "Day", value: `Day ${activeCase.day}` });
    }
    return items;
  }, [activeCase, attemptsUsed]);

  const caseNumberDisplay = activeCase.caseNumber || "---";
  return (
    <ScreenSurface
      variant="desk"
      accentColor={palette.accent}
      contentStyle={
        surfaceHorizontalPaddingValue != null
          ? { paddingHorizontal: surfaceHorizontalPaddingValue }
          : undefined
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          {
            paddingHorizontal: horizontalPaddingValue,
            paddingVertical: verticalSpacingValue,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.stack, { gap: verticalSpacingValue }]}>
          <View
            style={[
              styles.boardWrapper,
              {
                borderRadius: boardFrameRadius,
                padding: boardFramePaddingValue,
                shadowRadius: boardShadowRadius,
                shadowOffset: { width: 0, height: boardShadowOffsetY },
              },
            ]}
          >
            <LinearGradient
              colors={["rgba(58, 36, 18, 0.96)", "rgba(28, 16, 8, 0.98)"]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
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
                  source={BOARD_NOISE_TEXTURE}
                  style={styles.boardNoise}
                  resizeMode="repeat"
                  pointerEvents="none"
                />
                <ExpoImage
                  source={BOARD_CORNER_TL}
                  style={[styles.boardCorner, styles.boardCornerTl]}
                  pointerEvents="none"
                />
                <ExpoImage
                  source={BOARD_CORNER_TR}
                  style={[styles.boardCorner, styles.boardCornerTr]}
                  pointerEvents="none"
                />
                <ExpoImage
                  source={BOARD_CORNER_BL}
                  style={[styles.boardCorner, styles.boardCornerBl]}
                  pointerEvents="none"
                />
                <ExpoImage
                  source={BOARD_CORNER_BR}
                  style={[styles.boardCorner, styles.boardCornerBr]}
                  pointerEvents="none"
                />

                <View
                  style={[
                    styles.boardInner,
                    {
                      gap: sectionGapValue,
                      paddingHorizontal: boardContentPaddingValue,
                      paddingVertical: boardContentPaddingValue,
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
                    style={[styles.boardHeaderRow, { gap: headerGapValue }]}
                  >
                    <View
                      style={[
                        styles.boardStamp,
                        {
                          borderRadius: slipRadius,
                          borderColor: `${STAMP_COLOR}80`,
                          backgroundColor: "rgba(181, 28, 28, 0.12)",
                          paddingHorizontal: scaleSpacing(SPACING.sm),
                          paddingVertical: scaleSpacing(SPACING.xs),
                          transform: [{ rotate: "-4deg" }],
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.boardStampText,
                          {
                            fontSize: stampSize,
                            color: STAMP_COLOR,
                            textShadowColor: "rgba(0,0,0,0.25)",
                            textShadowOffset: { width: 0, height: 2 },
                            textShadowRadius: 4,
                          },
                        ]}
                      >
                        {victoryStamp.toUpperCase()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.caseNumberTag,
                        {
                          borderRadius: slipRadius,
                          paddingHorizontal: scaleSpacing(SPACING.sm),
                          paddingVertical: scaleSpacing(SPACING.xs),
                          borderColor: "rgba(249, 221, 172, 0.3)",
                          backgroundColor: "rgba(20, 12, 8, 0.82)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.caseNumberText,
                          {
                            fontSize: caseNumberSize,
                            color: palette.badgeText,
                          },
                        ]}
                      >
                        {`Case #${caseNumberDisplay}`}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.titleCard,
                      {
                        borderRadius: cardRadius,
                        borderColor: "rgba(255, 225, 176, 0.28)",
                        paddingHorizontal: notePaddingValue,
                        paddingBottom: notePaddingValue,
                          paddingTop:
                            notePaddingValue +
                            titleThumbtack.clearance,
                        shadowRadius: Math.max(10, scaleSpacing(SPACING.lg)),
                        shadowOffset: {
                          width: 0,
                          height: scaleSpacing(SPACING.sm),
                        },
                      },
                    ]}
                  >
                    <View
                      pointerEvents="none"
                      style={[
                        styles.thumbtackContainer,
                        {
                          width: titleThumbtack.head,
                          height:
                            titleThumbtack.head +
                            titleThumbtack.stemHeight,
                          top: -titleThumbtack.offset,
                          marginLeft: -titleThumbtack.head / 2,
                          transform: [
                            {
                              translateX:
                                titleThumbtackVariance.horizontalOffset,
                            },
                            {
                              translateY: -titleThumbtack.pivotOffset,
                            },
                            {
                              rotate: `${titleThumbtackVariance.angle}deg`,
                            },
                            {
                              translateY:
                                titleThumbtack.pivotOffset +
                                Math.round(titleThumbtack.head * 0.04),
                            },
                          ],
                        },
                      ]}
                    >
                        <View
                          style={[
                            styles.thumbtackStem,
                            {
                              width: titleThumbtack.stemWidth,
                              height: titleThumbtack.stemHeight,
                              top: titleThumbtack.stemTop,
                              left:
                                (titleThumbtack.head - titleThumbtack.stemWidth) /
                                2,
                              borderRadius: Math.round(
                                titleThumbtack.stemWidth * 0.65,
                              ),
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.thumbtackStemSheen,
                            {
                              width: titleThumbtack.stemHighlightWidth,
                              height: titleThumbtack.stemHighlightHeight,
                              top: titleThumbtack.stemHighlightTop,
                              left:
                                (titleThumbtack.head - titleThumbtack.stemWidth) /
                                  2 +
                                Math.round(titleThumbtack.stemWidth * 0.16),
                              borderRadius: Math.round(
                                titleThumbtack.stemHighlightWidth / 2,
                              ),
                            },
                          ]}
                        />
                      <View
                        style={[
                          styles.thumbtackHead,
                          {
                            width: titleThumbtack.head,
                            height: titleThumbtack.head,
                            borderRadius: titleThumbtack.head / 2,
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={["#f49b78", "#c44a28", "#4a0f0a"]}
                          locations={[0, 0.52, 1]}
                          start={{ x: 0.18, y: 0.12 }}
                          end={{ x: 0.86, y: 0.88 }}
                          style={[
                            styles.thumbtackHeadGradient,
                            {
                              borderRadius: titleThumbtack.innerHead / 2,
                              top: titleThumbtack.rimThickness,
                              right: titleThumbtack.rimThickness,
                              bottom: titleThumbtack.rimThickness,
                              left: titleThumbtack.rimThickness,
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.thumbtackInnerShadow,
                            {
                              borderRadius: titleThumbtack.innerHead / 2,
                              top: titleThumbtack.rimThickness,
                              right: titleThumbtack.rimThickness,
                              bottom: titleThumbtack.rimThickness,
                              left: titleThumbtack.rimThickness,
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.thumbtackHighlight,
                            {
                              width: Math.round(titleThumbtack.shineSize * 1.4),
                              height: titleThumbtack.shineSize,
                              borderRadius: titleThumbtack.shineSize,
                              top: titleThumbtack.shineTop,
                              left: titleThumbtack.shineLeft,
                            },
                          ]}
                        />
                      </View>
                    </View>
                        <Text
                          style={[
                            styles.caseTitle,
                            {
                              fontSize: titleSize,
                              color: palette.highlightText,
                              letterSpacing: compact ? 2.4 : 3.4,
                              lineHeight: Math.round(
                                titleSize * (compact ? 1.08 : 1.12),
                              ),
                              paddingHorizontal: titleHorizontalPadding,
                            },
                          ]}
                          adjustsFontSizeToFit
                          numberOfLines={2}
                          minimumFontScale={0.45}
                          ellipsizeMode="tail"
                          lineBreakStrategyIOS="hangul-word"
                        >
                        {activeCase.title}
                      </Text>
                    {heroMeta.length > 0 ? (
                      <View
                        style={[
                          styles.metaRow,
                          {
                            gap: metaWrapGapValue,
                            marginTop: scaleSpacing(SPACING.sm),
                          },
                        ]}
                      >
                        {heroMeta.map((item) => (
                          <View
                            key={item.id}
                            style={[
                              styles.metaBadge,
                              {
                                borderRadius: slipRadius,
                                paddingHorizontal: metaBadgePaddingH,
                                paddingVertical: metaBadgePaddingV,
                                borderColor: "rgba(249, 221, 172, 0.28)",
                                backgroundColor: "rgba(36, 22, 12, 0.88)",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.metaLabel,
                                {
                                  fontSize: metaLabelSize,
                                  color: "rgba(249, 221, 172, 0.7)",
                                },
                              ]}
                            >
                              {item.label}
                            </Text>
                            <Text
                              style={[
                                styles.metaValue,
                                {
                                  fontSize: metaValueSize,
                                  color: palette.highlightText,
                                },
                              ]}
                            >
                              {item.value}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>

                  {encouragement ? (
                    <View
                      style={[
                        styles.summaryNote,
                        {
                          borderRadius: cardRadius,
                          borderColor: "rgba(190, 134, 68, 0.45)",
                          padding: notePaddingValue,
                          shadowRadius: Math.max(8, scaleSpacing(SPACING.md)),
                          shadowOffset: {
                            width: 0,
                            height: scaleSpacing(SPACING.xs) + 2,
                          },
                        },
                      ]}
                    >
                      <View
                        style={[styles.noteTape, styles.noteTapeLeft]}
                        pointerEvents="none"
                      />
                      <View
                        style={[styles.noteTape, styles.noteTapeRight]}
                        pointerEvents="none"
                      />
                      <Text
                        style={[
                          styles.summaryText,
                          {
                            fontSize: summaryFontSizeValue,
                            lineHeight: summaryLineHeight,
                          },
                        ]}
                      >
                        {encouragement}
                      </Text>
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.themeRow,
                      {
                        flexDirection: themeDirection,
                        gap: themeGapValue,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.themeCard,
                        themeDirection === "column" && styles.themeCardStacked,
                        {
                          borderRadius: polaroidRadius,
                          padding: notePaddingValue,
                          borderColor: "rgba(48, 32, 18, 0.32)",
                          shadowRadius: Math.max(8, scaleSpacing(SPACING.md)),
                          shadowOffset: {
                            width: 0,
                            height: scaleSpacing(SPACING.xs) + 2,
                          },
                        },
                      ]}
                    >
                      <View
                        style={[styles.themeTape, styles.themeTapePrimary]}
                        pointerEvents="none"
                      />
                      <Text
                        style={[
                          styles.themeLabel,
                          {
                            fontSize: themeLabelSize,
                            color: "#3c2414",
                          },
                        ]}
                      >
                        Main Theme ({mainWords.length})
                      </Text>
                      <Text
                        style={[
                          styles.themeName,
                          {
                            fontSize: themeNameSize,
                            color: "#2a180d",
                          },
                        ]}
                      >
                        {activeCase.mainTheme.icon} {activeCase.mainTheme.name}
                      </Text>
                      <Text
                        style={[
                          styles.themeWords,
                          {
                            fontSize: themeWordsSize,
                            color: "#59402a",
                          },
                        ]}
                      >
                        {mainWords.join(", ")}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.themeCard,
                        styles.themeAccent,
                        themeDirection === "column" && styles.themeCardStacked,
                        {
                          borderRadius: polaroidRadius,
                          padding: notePaddingValue,
                          shadowRadius: Math.max(8, scaleSpacing(SPACING.md)),
                          shadowOffset: {
                            width: 0,
                            height: scaleSpacing(SPACING.xs) + 2,
                          },
                        },
                      ]}
                    >
                      <View
                        style={[styles.themeTape, styles.themeTapeSecondary]}
                        pointerEvents="none"
                      />
                      <Text
                        style={[
                          styles.themeLabel,
                          styles.themeAccentLabel,
                          {
                            fontSize: themeLabelSize,
                          },
                        ]}
                      >
                        Outliers ({activeCase.board.outlierWords.length})
                      </Text>
                        <Text
                          style={[
                            styles.themeName,
                            styles.themeAccentText,
                            {
                              fontSize: themeNameSize,
                            },
                          ]}
                        >
                          {outlierThemeListLabel || "Unknown Theme"}
                        </Text>
                      <Text
                        style={[
                          styles.themeWords,
                          styles.themeAccentText,
                          {
                            fontSize: themeWordsSize,
                          },
                        ]}
                      >
                        {activeCase.board.outlierWords.join(", ")}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.shareSlip,
                      {
                        borderRadius: slipRadius,
                        borderColor: "rgba(54, 54, 54, 0.16)",
                        padding: sharePaddingValue,
                        shadowRadius: Math.max(8, scaleSpacing(SPACING.md)),
                        shadowOffset: {
                          width: 0,
                          height: scaleSpacing(SPACING.xs) + 2,
                        },
                      },
                    ]}
                  >
                    <View
                      pointerEvents="none"
                      style={[
                        styles.shareTear,
                        {
                          height: shareTearHeight,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.shareLabel,
                        {
                          fontSize: shareLabelSize,
                          color: "#352f27",
                        },
                      ]}
                    >
                      Share Preview
                    </Text>
                    <View
                      style={[
                        styles.sharePreview,
                        {
                          borderRadius: slipRadius,
                          padding: shareInnerPaddingValue,
                          borderColor: "rgba(16, 12, 8, 0.48)",
                          gap: shareLineGap,
                        },
                      ]}
                    >
                      {shareMessage.split("\n").map((line, index) => (
                        <Text
                          key={`${line}-${index}`}
                          style={[
                            styles.shareLine,
                            {
                              fontSize: shareLineSize,
                              lineHeight: shareLineHeight,
                              color: palette.highlightText,
                            },
                          ]}
                        >
                          {line}
                        </Text>
                      ))}
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </LinearGradient>
          </View>

          <View
            style={[
              styles.actionColumn,
              {
                gap: scaleSpacing(SPACING.md),
              },
            ]}
          >
            {isStoryMode ? (
              <>
                  <PrimaryButton
                    label={storyActionLabel}
                    icon={storyActionIcon}
                    disabled={storyActionDisabled}
                    onPress={() => {
                      if (!storyActionDisabled) {
                        onAdvanceStory?.();
                      }
                    }}
                  />
                  {awaitingDecision ? (
                    <Text style={styles.storyStatusText}>
                      Open the case file to choose your next path.
                    </Text>
                  ) : null}
                  {storyLocked && !awaitingDecision ? (
                    <Text style={styles.storyStatusText}>
                      Next chapter unlocks after the current lock expires.
                    </Text>
                  ) : null}
                <SecondaryButton
                  label="Read Case File"
                  onPress={() => onReadCaseFile?.()}
                  icon="📁"
                />
                <SecondaryButton
                  label="Share Results"
                  onPress={() => onShare?.(shareMessage)}
                  icon="📤"
                />
                <SecondaryButton
                  label="Return to Story Hub"
                  onPress={onReturnHome}
                  icon="🗂️"
                />
              </>
            ) : (
                <>
                  <PrimaryButton
                    label="Read Case File"
                    onPress={() => onReadCaseFile?.()}
                    icon="📁"
                  />
                  <SecondaryButton
                    label="Share Results"
                    onPress={() => onShare?.(shareMessage)}
                    icon="📤"
                  />
              {hasStoryCampaign && awaitingDecision ? (
                <Text style={styles.storyStatusText}>
                  Branch choice available in the case file.
                </Text>
              ) : null}
              {hasStoryCampaign && storyLocked && !awaitingDecision ? (
                <Text style={styles.storyStatusText}>
                  Next chapter unlocks after the daily lock expires.
                </Text>
              ) : null}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
  },
  stack: {
    width: "100%",
    alignSelf: "stretch",
    alignItems: "stretch",
  },
  boardWrapper: {
    position: "relative",
    width: "100%",
    backgroundColor: "rgba(22, 12, 6, 0.9)",
    borderWidth: 2,
    borderColor: "rgba(78, 50, 24, 0.85)",
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
  boardNoise: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.16,
  },
  boardCorner: {
    position: "absolute",
    width: 72,
    height: 72,
    opacity: 0.28,
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
  boardGlow: {
    position: "absolute",
    top: -160,
    left: -120,
    opacity: 0.38,
  },
  boardInner: {
    flex: 1,
    position: "relative",
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
    elevation: 6,
    zIndex: 4,
  },
  boardPinLeft: {
    left: "22%",
  },
  boardPinRight: {
    right: "22%",
  },
  boardHeaderRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  boardStamp: {
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  boardStampText: {
    fontFamily: FONTS.primarySemiBold,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  caseNumberTag: {
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  caseNumberText: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 2.6,
    textTransform: "uppercase",
  },
  titleCard: {
    width: "100%",
    backgroundColor: "rgba(22, 14, 8, 0.92)",
    borderWidth: 1,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    alignItems: "center",
  },
  caseTitle: {
    fontFamily: FONTS.secondaryBold,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    textAlign: "center",
    alignSelf: "stretch",
    flexShrink: 1,
  },
  metaRow: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  metaBadge: {
    borderWidth: 1,
    gap: 6,
  },
  metaLabel: {
    fontFamily: FONTS.mono,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  metaValue: {
    fontFamily: FONTS.primarySemiBold,
  },
  summaryNote: {
    width: "100%",
    borderWidth: 1,
    position: "relative",
    backgroundColor: "rgba(250, 236, 210, 0.96)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  noteTape: {
    position: "absolute",
    top: -14,
    width: 44,
    height: 18,
    backgroundColor: "rgba(254, 240, 188, 0.88)",
    borderRadius: 5,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
  },
  noteTapeLeft: {
    left: 24,
    transform: [{ rotate: "-10deg" }],
  },
  noteTapeRight: {
    right: 24,
    transform: [{ rotate: "12deg" }],
  },
  summaryText: {
    fontFamily: FONTS.primary,
    color: "#2b1a10",
  },
  themeRow: {
    width: "100%",
    alignSelf: "stretch",
  },
  themeCard: {
    position: "relative",
    flex: 1,
    borderWidth: 1,
    backgroundColor: "#fef9f0",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  themeCardStacked: {
    width: "100%",
    alignSelf: "stretch",
  },
  themeTape: {
    position: "absolute",
    top: -16,
    left: "20%",
    right: "20%",
    height: 18,
    backgroundColor: "rgba(249, 231, 176, 0.92)",
    borderRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
  },
  themeTapePrimary: {
    transform: [{ rotate: "-5deg" }],
  },
  themeTapeSecondary: {
    transform: [{ rotate: "6deg" }],
  },
  themeLabel: {
    fontFamily: FONTS.mono,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  themeName: {
    fontFamily: FONTS.secondaryBold,
    textTransform: "uppercase",
    marginTop: 6,
  },
  themeWords: {
    marginTop: 10,
    fontFamily: FONTS.primary,
    lineHeight: LINE_HEIGHTS.relaxed,
  },
    storyStatusText: {
      fontFamily: FONTS.mono,
      color: "#d7c9b0",
      textAlign: "center",
    },
  themeAccent: {
    borderColor: "rgba(241, 193, 116, 0.6)",
    backgroundColor: "rgba(255, 244, 216, 0.98)",
  },
  themeAccentText: {
    color: "#8d4c18",
  },
  themeAccentLabel: {
    color: "#8d4c18",
  },
  thumbtackContainer: {
    position: "absolute",
    left: "50%",
    zIndex: 6,
    alignItems: "center",
  },
  thumbtackStem: {
    position: "absolute",
    backgroundColor: "#551f14",
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  thumbtackStemSheen: {
    position: "absolute",
    backgroundColor: "rgba(255, 216, 190, 0.32)",
    opacity: 0.9,
  },
  thumbtackPoint: {
    position: "absolute",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#3c120c",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  thumbtackHead: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#2d0c07",
    borderWidth: 1,
    borderColor: "#170503",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 9,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbtackHeadGradient: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  thumbtackInnerShadow: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    opacity: 0.4,
    transform: [{ scaleX: 0.84 }, { scaleY: 0.72 }],
  },
  thumbtackHighlight: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    opacity: 0.85,
    transform: [{ rotate: "-22deg" }, { scaleX: 1.12 }, { scaleY: 0.68 }],
  },
  shareSlip: {
    width: "100%",
    borderWidth: 1,
    backgroundColor: "rgba(246, 244, 238, 0.98)",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  shareTear: {
    position: "absolute",
    top: -12,
    left: "14%",
    right: "14%",
    backgroundColor: "rgba(230, 224, 206, 0.88)",
    borderRadius: 8,
    transform: [{ rotate: "2deg" }],
  },
  shareLabel: {
    fontFamily: FONTS.mono,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  sharePreview: {
    borderWidth: 1,
    backgroundColor: "rgba(8, 10, 16, 0.86)",
  },
  shareLine: {
    fontFamily: FONTS.mono,
    letterSpacing: 1.2,
  },
  actionColumn: {
    alignSelf: "stretch",
  },
});
