import React, { useEffect, useMemo, useState } from 'react';
import { Image as RNImage, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import ScreenSurface from '../components/ScreenSurface';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import NeonSign from '../components/NeonSign';
import DustLayer from '../components/DustLayer';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/layout';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { createCasePalette } from '../theme/casePalette';
import { formatCaseOutlierThemes } from '../utils/themeDisplay';

const BOARD_NOISE_TEXTURE = require('../../assets/images/ui/backgrounds/noise-texture.png');
const BOARD_CORNER_TL = require('../../assets/images/ui/decorative/corner-ornament-tl.png');
const BOARD_CORNER_TR = require('../../assets/images/ui/decorative/corner-ornament-tr.png');
const BOARD_CORNER_BL = require('../../assets/images/ui/decorative/corner-ornament-bl.png');
const BOARD_CORNER_BR = require('../../assets/images/ui/decorative/corner-ornament-br.png');
const DEAD_LETTERS_LOGO = require('../../assets/images/ui/branding/logo.png');

function formatCountdown(nextUnlockAt) {
  if (!nextUnlockAt) return null;
  const target = new Date(nextUnlockAt).getTime();
  const now = Date.now();
  if (target <= now) return 'Unlocking soon';
  const diff = target - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatLockTimestamp(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return null;
  }
}

const DEFAULT_PATH_SUMMARY = {
  title: 'Ghost Route',
  description: 'Whoever charted this trail forgot to label it, but it still reeks of trouble.',
};

const PATH_SUMMARIES = {
  ROOT: {
    title: 'Uncharted Route',
    description: 'Keep working the case to learn which poison you really picked.',
  },
  A: {
    title: 'Ledger Trail',
    description: 'You followed the daughter with the receipts—paper over gunpowder.',
  },
  B: {
    title: 'Gunmetal Shortcut',
    description: 'You stared Silas down first and let instinct write the paperwork later.',
  },
  AGGRESSIVE: {
    title: 'Confessor\'s Dare',
    description: 'You demanded names before alibis, daring the Midnight Confessor to blink.',
  },
  METHODICAL: {
    title: 'Clean Hands Pact',
    description: 'You dragged the truth into the daylight even if it cut you open.',
  },
  AFL: {
    title: 'Run-and-Report',
    description: 'You bolted into the rain but still handed the files to the suits.',
  },
  AFV: {
    title: 'Fugitive Justice',
    description: 'You stayed on the lam, serving verdicts with bruised knuckles.',
  },
  ASL: {
    title: 'Static Surveillance',
    description: 'You sat tight under neon hum and trusted the Feds to kick the right door.',
  },
  ASR: {
    title: 'Broken Tether',
    description: 'You cut the monitor and outran the sirens to grab the evidence yourself.',
  },
  MACLF: {
    title: 'Survival Clause',
    description: 'You bargained with Blackwell to keep breathing, letting trust take the hit.',
  },
  MACLS: {
    title: 'Martyr\'s Signature',
    description: 'You inked a confession to keep Sarah clean, trading freedom for penance.',
  },
  MAER: {
    title: 'Integrity League',
    description: 'You joined the reformers and promised to air every filthy secret.',
  },
  MAES: {
    title: 'Shadow Executor',
    description: 'You weaponized Blackwell\'s bankroll to erase threats off the books.',
  },
  MLE: {
    title: 'Heart-First Lead',
    description: 'You chased the victims\' people before politicking the room.',
  },
  MLEJ: {
    title: 'James\' Lifeline',
    description: 'You sprinted to Sullivan\'s lawyer to keep his appeal breathing.',
  },
  MLEJE: {
    title: 'Emily Unmasked',
    description: 'You swore to broadcast her torture file—and your role in it.',
  },
  MLEJF: {
    title: 'Blood-Money Brief',
    description: 'You slid Tom\'s offshore cash across the table to buy time.',
  },
  MLEM: {
    title: 'Margaret\'s Anchor',
    description: 'You pulled your ex into the mess, trading nostalgia for intel.',
  },
  MLI: {
    title: 'Casefile Surgeon',
    description: 'You cracked the docket yourself, scalpel-clean and by the book.',
  },
  MLIC: {
    title: 'Sterile Evidence',
    description: 'You only moved the uncontaminated slugs and let the rest rot.',
  },
  MLICC: {
    title: 'Necessary Leak',
    description: 'You tipped the right ears to save the judge and Teresa before the fire.',
  },
  MLICL: {
    title: 'Letter of the Law',
    description: 'You refused shortcuts and let Sarah fight it in daylight.',
  },
  MLIT: {
    title: 'Stacked Deck',
    description: 'You slammed the slugs and the ledger down, chain of custody be damned.',
  },
  MLITF: {
    title: 'Slush-Fund Rescue',
    description: 'You cracked Tom\'s offshore vault to bankroll the appeals.',
  },
  MLITR: {
    title: 'Dry-Wallet Stand',
    description: 'You kept your hands off the dirty cash and trusted the public defender.',
  },
};

function getPathSummary(pathKey) {
  if (!pathKey) {
    return PATH_SUMMARIES.ROOT;
  }
  const normalized = String(pathKey).trim().toUpperCase();
  return PATH_SUMMARIES[normalized] || DEFAULT_PATH_SUMMARY;
}

export default function DeskScreen({
  activeCase,
  progress,
  onStartCase,
  onOpenArchive,
  onOpenStats,
  onOpenSettings,
  onOpenMenu,
  onOpenStoryCampaign,
  onBribe,
}) {
  const storyCampaign = progress.storyCampaign || {};
  const nextStoryUnlockAt = storyCampaign?.nextStoryUnlockAt;
  const [countdown, setCountdown] = useState(formatCountdown(nextStoryUnlockAt));

  useEffect(() => {
    if (!nextStoryUnlockAt) {
      setCountdown(null);
      return;
    }
    const update = () => setCountdown(formatCountdown(nextStoryUnlockAt));
    update();
    // Use 5s interval to reduce re-renders (60/min -> 12/min)
    // Countdown only shows hours/minutes, so 5s precision is sufficient
    const timer = setInterval(update, 5000);
    return () => clearInterval(timer);
  }, [nextStoryUnlockAt]);

  const solved = progress.solvedCaseIds.includes(activeCase.id);
  const failed = progress.failedCaseIds.includes(activeCase.id);
  const completed = solved || failed;
  const briefingSeen = Boolean(progress.seenBriefings && progress.seenBriefings[activeCase.id]);
  const completedSubchapters = Array.isArray(storyCampaign.completedCaseNumbers)
    ? storyCampaign.completedCaseNumbers.length
    : 0;
  const totalSubchapters = 12;
    const storyChapter = storyCampaign.chapter || 1;
    const storySubchapter = storyCampaign.subchapter || 1;
    const awaitingDecision = Boolean(storyCampaign.awaitingDecision && storyCampaign.pendingDecisionCase);
    const storyLocked = Boolean(!awaitingDecision && nextStoryUnlockAt);
    const activeCaseNumber = activeCase?.caseNumber;
    const storyActiveCaseNumber = storyCampaign?.activeCaseNumber;
    const pendingStoryAdvance = Boolean(
      !awaitingDecision &&
        !storyLocked &&
        storyActiveCaseNumber &&
        activeCaseNumber &&
        storyActiveCaseNumber !== activeCaseNumber,
    );
    const primaryLabel = pendingStoryAdvance
      ? 'Continue Investigation'
      : awaitingDecision
        ? 'Review Branch Choice'
        : storyLocked
          ? 'Chapter Locked'
          : completed
            ? (solved ? 'Review Case Results' : 'Review Case Debrief')
            : briefingSeen
              ? 'Open Case File'
              : 'Investigate';
    const primaryIcon = pendingStoryAdvance
      ? <MaterialCommunityIcons name="arrow-right-circle" size={20} color={COLORS.textSecondary} />
      : awaitingDecision
        ? <MaterialCommunityIcons name="source-branch" size={20} color={COLORS.textSecondary} />
        : storyLocked
          ? <MaterialCommunityIcons name="timer-sand" size={20} color={COLORS.textSecondary} />
          : completed
            ? solved
              ? <MaterialCommunityIcons name="file-document-check" size={20} color={COLORS.textSecondary} />
              : <MaterialCommunityIcons name="file-document-alert" size={20} color={COLORS.textSecondary} />
            : <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />;

    const statusLine = useMemo(() => {
      if (awaitingDecision) {
        return 'Awaiting Branch Decision';
      }
      if (storyLocked) {
        return 'Chapter Locked';
      }
      if (pendingStoryAdvance) {
        return 'Next Subchapter Ready';
      }
      if (completed) {
        return solved ? 'Case Solved' : 'Out of Attempts';
      }
      return 'Active Investigation';
    }, [awaitingDecision, storyLocked, pendingStoryAdvance, completed, solved]);

  const lastDecision = storyCampaign?.lastDecision || null;
  const lockedPathKey = storyCampaign.currentPathKey || 'ROOT';
  const hasLockedPath = Boolean(lastDecision?.optionKey);
  const lockedChapterLabel = lastDecision?.nextChapter
    ? `Chapter ${lastDecision.nextChapter}`
    : null;
  const lockedTimestamp = formatLockTimestamp(lastDecision?.selectedAt);
  const lockedPathSummary = useMemo(
    () => getPathSummary(hasLockedPath ? lockedPathKey : 'ROOT'),
    [lockedPathKey, hasLockedPath],
  );
    const isEarlyIntroSubchapter = storyChapter === 1 && storySubchapter >= 1 && storySubchapter <= 3;
    const shouldHidePathCardForIntro = !hasLockedPath && isEarlyIntroSubchapter;

    const showCaseThemes = solved;
    const mainThemeDisplay = showCaseThemes
      ? `${activeCase.mainTheme.icon} ${activeCase.mainTheme.name}`
      : '🔒 Unknown';
    const outlierThemeDisplay = showCaseThemes
      ? formatCaseOutlierThemes(activeCase, { separator: '  •  ' }) || 'Unknown Theme'
      : '🔒 Unknown';

  const handleQuickPress = (callback) => () => {
    Haptics.selectionAsync().catch(() => {});
    callback?.();
  };

  const handleStoryPress = handleQuickPress(onOpenStoryCampaign);
  const handleSettingsPress = handleQuickPress(onOpenSettings);
  
  const handleBribe = async () => {
      if (onBribe) {
          const success = await onBribe();
          if (success) {
              Alert.alert("Bribe Accepted", "The clerk slides the file across the desk.");
          }
      }
  };

  const { sizeClass, moderateScale, scaleSpacing, scaleRadius } = useResponsiveLayout();
  const compact = sizeClass === 'xsmall' || sizeClass === 'small';
  const medium = sizeClass === 'medium';
  const narrow = compact || medium;

  const palette = useMemo(() => createCasePalette(activeCase), [activeCase]);

  const sectionGap = scaleSpacing(narrow ? SPACING.lg : SPACING.xl);
  const scrollPaddingBottom = scaleSpacing(narrow ? SPACING.xxl : SPACING.gutter);
  const boardFrameRadius = scaleRadius(RADIUS.xl + 6);
  const boardSurfaceRadius = scaleRadius(RADIUS.xl);
  const boardContentPaddingH = scaleSpacing(narrow ? SPACING.lg : SPACING.xl);
  const boardContentPaddingV = scaleSpacing(narrow ? SPACING.md : SPACING.lg);
  const boardShadowRadius = Math.max(18, scaleSpacing(SPACING.xl));
  const boardShadowOffsetY = scaleSpacing(SPACING.md);
  const boardGlowSize = Math.max(220, Math.round(scaleSpacing(narrow ? SPACING.xxl : SPACING.xxl + SPACING.sm)));
  const boardGlowColor = palette?.glow ?? 'rgba(249, 215, 170, 0.48)';
  const chipPaddingV = scaleSpacing(compact ? SPACING.xs : SPACING.sm);
  const chipPaddingH = scaleSpacing(narrow ? SPACING.md : SPACING.lg);
  const quickSpacing = scaleSpacing(SPACING.md);
  const quickCardRadius = scaleRadius(RADIUS.lg);
  const quickPaddingV = scaleSpacing(compact ? SPACING.md : SPACING.lg);
  const quickPaddingH = scaleSpacing(narrow ? SPACING.lg : SPACING.xl);
  const footerSpacing = scaleSpacing(SPACING.lg);
  const settingsButtonSize = scaleSpacing(compact ? SPACING.lg : SPACING.xl);
  const settingsIconSize = moderateScale(compact ? FONT_SIZES.xl : FONT_SIZES.title);

  const caseNumberFont = moderateScale(narrow ? FONT_SIZES.sm : FONT_SIZES.md);
  const caseNumberLetter = narrow ? 1.8 : 2.4;
  const caseTitleFont = moderateScale(narrow ? FONT_SIZES.title : FONT_SIZES.display);
  const caseTitleLetter = narrow ? 2.4 : 3.6;
  const statusFont = moderateScale(narrow ? FONT_SIZES.xs : FONT_SIZES.sm);
  const statusLetter = narrow ? 1.4 : 2.2;
  const chipLabelFont = moderateScale(FONT_SIZES.xs);
  const chipLabelLetter = narrow ? 1.3 : 1.9;
  const chipValueFont = moderateScale(narrow ? FONT_SIZES.md : FONT_SIZES.lg);
  const chipValueLetter = narrow ? 1.6 : 2.2;
  const progressValueFont = moderateScale(narrow ? FONT_SIZES.md : FONT_SIZES.lg);
  const progressValueLetter = narrow ? 1.4 : 1.9;
  const countdownLabelFont = moderateScale(FONT_SIZES.xs);
  const countdownValueFont = moderateScale(narrow ? FONT_SIZES.lg : FONT_SIZES.xl);
  const quickTitleFont = moderateScale(FONT_SIZES.sm);
  const quickTitleLetter = narrow ? 1.4 : 1.8;
  const quickValueFont = moderateScale(narrow ? FONT_SIZES.lg : FONT_SIZES.xl);
  const quickValueLetter = narrow ? 1.6 : 2;
  const quickMetaFont = moderateScale(narrow ? FONT_SIZES.xs : FONT_SIZES.sm);
  const quickMetaLetter = narrow ? 1.1 : 1.4;
  const utilityLabelFont = moderateScale(FONT_SIZES.md);
  const utilityLabelLetter = narrow ? 1.8 : 2.2;
  const utilityMetaFont = moderateScale(FONT_SIZES.xs);
  const utilityMetaLetter = narrow ? 1.2 : 1.5;

  return (
    <ScreenSurface variant="desk" accentColor={palette.accent}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { gap: sectionGap, paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topSection, { gap: scaleSpacing(SPACING.sm) }]}>
          <View style={[styles.headerBar, { marginBottom: scaleSpacing(SPACING.sm) }]}>
            <Pressable
              onPress={handleSettingsPress}
              hitSlop={8}
              style={({ pressed }) => [
                styles.settingsButton,
                {
                  width: settingsButtonSize,
                  height: settingsButtonSize,
                  borderRadius: settingsButtonSize / 2,
                },
                pressed && styles.settingsButtonPressed,
              ]}
            >
              <MaterialCommunityIcons
                name="cog"
                size={settingsIconSize}
                color={COLORS.accentCyan}
                style={styles.settingsIcon}
              />
            </Pressable>
          </View>
          <NeonSign logoSource={DEAD_LETTERS_LOGO} style={styles.neonSign} />
        </View>

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
        <DustLayer />
        <LinearGradient
          colors={['rgba(58, 36, 18, 0.96)', 'rgba(28, 16, 8, 0.98)']}
          start={{ x: 0.12, y: 0 }}
          end={{ x: 0.88, y: 1 }}
          style={[styles.boardFrame, { borderRadius: boardFrameRadius }]}
        >
          <LinearGradient
            colors={['#d9b78b', '#c68f57', '#ab6b34']}
            locations={[0, 0.55, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.boardSurface, { borderRadius: boardSurfaceRadius }]}
          >
            <View
              pointerEvents="none"
              style={[
                styles.boardGlow,
                {
                  width: boardGlowSize,
                  height: boardGlowSize,
                  borderRadius: boardGlowSize,
                  backgroundColor: boardGlowColor,
                },
              ]}
            />
            <RNImage
              source={BOARD_NOISE_TEXTURE}
              style={styles.boardNoise}
              resizeMode="repeat"
              pointerEvents="none"
            />
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
                  gap: scaleSpacing(SPACING.md),
                },
              ]}
            >
              <View
                style={[styles.caseHeader, { marginBottom: scaleSpacing(SPACING.md) }, narrow && styles.caseHeaderStack]}
              >
                <View style={[styles.caseHeadingBlock, narrow && styles.caseHeadingBlockWide]}>
                  <Text
                    style={[styles.caseNumber, { fontSize: caseNumberFont, letterSpacing: caseNumberLetter }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    CASE #{activeCase.caseNumber}
                  </Text>
                  <Text
                    style={[
                      styles.caseTitle,
                      {
                        fontSize: caseTitleFont,
                        letterSpacing: caseTitleLetter,
                        lineHeight: Math.round(caseTitleFont * 1.02),
                      },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.45}
                    lineBreakStrategyIOS="hangul-word"
                  >
                    {`\u2022 ${activeCase.title.toUpperCase()}`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusStamp,
                    completed ? (solved ? styles.statusStampSolved : styles.statusStampFailed) : styles.statusStampActive,
                    !narrow && styles.statusStampAligned,
                  ]}
                >
                  <Text style={[styles.statusText, { fontSize: statusFont, letterSpacing: statusLetter }]}>STATUS: {statusLine.toUpperCase()}</Text>
                </View>
              </View>

              <View
                style={[styles.themeRow, narrow && styles.themeRowStack, { gap: scaleSpacing(SPACING.md) }]}
              >
                <View
                  style={[
                    styles.themeCard,
                    {
                      paddingVertical: chipPaddingV,
                      paddingHorizontal: chipPaddingH,
                      borderRadius: scaleRadius(RADIUS.lg),
                    },
                  ]}
                >
                  <Text style={[styles.themeLabel, { fontSize: chipLabelFont, letterSpacing: chipLabelLetter }]}>Main Theme</Text>
                  <Text
                    style={[styles.themeValue, { fontSize: chipValueFont, letterSpacing: chipValueLetter }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {mainThemeDisplay}
                  </Text>
                </View>
                <View
                  style={[
                    styles.themeCard,
                    styles.themeCardAlt,
                    {
                      paddingVertical: chipPaddingV,
                      paddingHorizontal: chipPaddingH,
                      borderRadius: scaleRadius(RADIUS.lg),
                    },
                  ]}
                >
                  <Text style={[styles.themeLabelAlt, { fontSize: chipLabelFont, letterSpacing: chipLabelLetter }]}>Outlier Theme</Text>
                  <Text
                    style={[styles.themeValueAlt, { fontSize: chipValueFont, letterSpacing: chipValueLetter }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {outlierThemeDisplay}
                  </Text>
                </View>
              </View>

                <View
                  style={[styles.actionBlock, { marginTop: scaleSpacing(SPACING.sm), gap: scaleSpacing(SPACING.sm) }]}
                >
                  {storyLocked ? (
                     <PrimaryButton 
                        label="Bribe Clerk ($0.99)" 
                        icon={<MaterialCommunityIcons name="cash-multiple" size={20} color={COLORS.textSecondary} />} 
                        onPress={handleBribe} 
                        fullWidth 
                     />
                  ) : (
                     <PrimaryButton label={primaryLabel} icon={primaryIcon} onPress={onStartCase} fullWidth />
                  )}
                </View>

                <View style={[styles.progressRow, { marginTop: scaleSpacing(SPACING.sm) }]}>
                  <View style={styles.progressBlock}>
                    <Text style={styles.progressLabel}>Next Up:</Text>
                    <Text
                      style={[styles.progressValue, { fontSize: progressValueFont, letterSpacing: progressValueLetter }]}
                    >
                      {`Chapter ${storyChapter}.${storySubchapter}`}
                    </Text>
                  </View>
                  {storyLocked ? (
                    <View
                      style={[
                        styles.countdownBlock,
                        {
                          paddingVertical: chipPaddingV,
                          paddingHorizontal: chipPaddingH,
                          borderRadius: scaleRadius(RADIUS.lg),
                        },
                      ]}
                    >
                      <Text style={[styles.countdownLabel, { fontSize: countdownLabelFont }]}>Next Chapter</Text>
                      <Text style={[styles.countdownValue, { fontSize: countdownValueFont }]}>{countdown || 'Unlocking soon'}</Text>
                    </View>
                  ) : null}
                </View>

                {shouldHidePathCardForIntro ? null : (
                  <View
                    style={[
                      styles.pathCard,
                      {
                        marginTop: scaleSpacing(SPACING.sm),
                        borderRadius: scaleRadius(RADIUS.lg),
                        paddingVertical: chipPaddingV,
                        paddingHorizontal: chipPaddingH,
                      },
                    ]}
                  >
                    <Text style={[styles.pathCardLabel, { fontSize: chipLabelFont, letterSpacing: chipLabelLetter }]}>
                      Locked Path
                    </Text>
                    {hasLockedPath ? (
                      <>
                        <Text
                          style={[styles.pathCardTitle, { fontSize: chipValueFont, letterSpacing: chipValueLetter }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                        >
                          {lockedPathSummary.title}
                        </Text>
                        <Text
                          style={[styles.pathCardDescription, { fontSize: statusFont, letterSpacing: statusLetter }]}
                          numberOfLines={2}
                        >
                          {lockedPathSummary.description}
                        </Text>
                        <View style={styles.pathCardMetaRow}>
                          {lockedChapterLabel ? (
                            <Text style={[styles.pathCardMetaText, { fontSize: statusFont, letterSpacing: statusLetter }]}>
                              {lockedChapterLabel}
                            </Text>
                          ) : null}
                        </View>
                        {lockedTimestamp ? (
                          <Text style={[styles.pathCardTimestamp, { fontSize: countdownLabelFont }]}>
                            {`Sealed ${lockedTimestamp}`}
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text style={[styles.pathCardHint, { fontSize: statusFont, letterSpacing: statusLetter }]}>
                        Complete Subchapter 3 to choose a branch.
                      </Text>
                    )}
                  </View>
                )}
            </View>
          </LinearGradient>
        </LinearGradient>
      </View>

        <View style={[styles.quickRow, { gap: quickSpacing }, compact && styles.quickRowStack]}>
          <Pressable
            style={[
              styles.quickCard,
              {
                borderRadius: quickCardRadius,
                paddingVertical: quickPaddingV,
                paddingHorizontal: quickPaddingH,
              },
            ]}
            onPress={handleQuickPress(onOpenArchive)}
          >
                <Text style={[styles.quickTitle, { fontSize: quickTitleFont, letterSpacing: quickTitleLetter }]}>Archive</Text>
                <Text style={[styles.quickValue, { fontSize: quickValueFont, letterSpacing: quickValueLetter }]}>
                  {completedSubchapters} / {totalSubchapters}
                </Text>
                <Text style={[styles.quickMeta, { fontSize: quickMetaFont, letterSpacing: quickMetaLetter }]}>Subchapters completed</Text>
          </Pressable>
          <Pressable
            style={[
              styles.quickCard,
              {
                borderRadius: quickCardRadius,
                paddingVertical: quickPaddingV,
                paddingHorizontal: quickPaddingH,
              },
            ]}
            onPress={handleQuickPress(onOpenStats)}
          >
            <Text style={[styles.quickTitle, { fontSize: quickTitleFont, letterSpacing: quickTitleLetter }]}>Stats</Text>
            <Text style={[styles.quickValue, { fontSize: quickValueFont, letterSpacing: quickValueLetter }]}>
              {progress.streak} days
            </Text>
            <Text style={[styles.quickMeta, { fontSize: quickMetaFont, letterSpacing: quickMetaLetter }]}>Days on the Force</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.storyCard,
            {
              borderRadius: quickCardRadius,
              paddingVertical: quickPaddingV,
              paddingHorizontal: quickPaddingH,
              gap: scaleSpacing(SPACING.md),
            },
            (compact || medium) && styles.storyCardStack,
          ]}
        >
          <View style={styles.storyTextBlock}>
            <Text style={styles.storyTitle}>Story Campaign</Text>
            <Text style={styles.storySubtitle}>Work the full arc without the nightly wait.</Text>
          </View>
          <PrimaryButton 
            label="Enter" 
            icon={<MaterialCommunityIcons name="book-open-page-variant" size={20} color={COLORS.textSecondary} />} 
            onPress={handleStoryPress} 
            fullWidth={compact || medium} 
          />
        </View>

        <View style={[styles.footerSpacer, { height: footerSpacing }]} />
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
  topSection: {
    alignItems: 'stretch',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    flexShrink: 0,
  },
  settingsButton: {
    backgroundColor: 'rgba(21, 24, 32, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(246, 236, 219, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  settingsButtonPressed: {
    backgroundColor: 'rgba(30, 33, 42, 0.92)',
    transform: [{ translateY: 1 }],
  },
  settingsIcon: {
    textShadowColor: 'rgba(5, 12, 18, 0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  neonSign: {
    alignSelf: 'stretch',
    transform: [{ rotate: '-2.5deg' }],
  },
  boardWrapper: {
    position: 'relative',
    backgroundColor: 'rgba(22, 12, 6, 0.92)',
    borderWidth: 2,
    borderColor: 'rgba(78, 50, 24, 0.82)',
    shadowColor: '#000',
    shadowOpacity: 0.38,
    elevation: 18,
    overflow: 'visible',
  },
  boardFrame: {
    flex: 1,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  boardSurface: {
    flex: 1,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  boardGlow: {
    position: 'absolute',
    top: -140,
    left: -110,
    opacity: 0.32,
  },
  boardNoise: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.16,
  },
  boardCorner: {
    position: 'absolute',
    width: 64,
    height: 64,
    opacity: 0.24,
  },
  boardCornerTl: {
    top: -8,
    left: -6,
  },
  boardCornerTr: {
    top: -8,
    right: -6,
    transform: [{ scaleX: -1 }],
  },
  boardCornerBl: {
    bottom: -8,
    left: -6,
    transform: [{ scaleY: -1 }],
  },
  boardCornerBr: {
    bottom: -8,
    right: -6,
    transform: [{ scaleX: -1 }, { scaleY: -1 }],
  },
  boardContent: {
    position: 'relative',
    width: '100%',
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  caseHeaderStack: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  caseHeadingBlock: {
    flexShrink: 1,
    gap: SPACING.xs,
  },
  caseHeadingBlockWide: {
    width: '100%',
  },
  caseNumber: {
    fontFamily: FONTS.monoBold,
    color: '#715435',
    letterSpacing: 3,
  },
  caseTitle: {
    fontFamily: FONTS.secondaryBold,
    color: '#3b2618',
    letterSpacing: 4,
    flexShrink: 1,
  },
  statusStamp: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusStampAligned: {
    marginLeft: 'auto',
  },
  statusStampActive: {
    backgroundColor: 'rgba(212, 106, 93, 0.18)',
    borderColor: 'rgba(156, 54, 42, 0.45)',
  },
  statusStampSolved: {
    backgroundColor: 'rgba(123, 165, 141, 0.2)',
    borderColor: 'rgba(63, 109, 84, 0.45)',
  },
  statusStampFailed: {
    backgroundColor: 'rgba(196, 92, 92, 0.22)',
    borderColor: 'rgba(130, 54, 54, 0.45)',
  },
  statusText: {
    fontFamily: FONTS.primarySemiBold,
    color: '#3b2618',
  },
  themeRow: {
    flexDirection: 'row',
  },
  themeRowStack: {
    flexDirection: 'column',
    gap: SPACING.sm,
  },
      themeCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 251, 242, 0.78)',
        borderWidth: 1,
        borderColor: 'rgba(166, 123, 82, 0.28)',
        gap: SPACING.xs,
      },
      themeCardAlt: {
        backgroundColor: 'rgba(62, 26, 31, 0.8)',
        borderColor: 'rgba(255, 166, 130, 0.5)',
      },
    themeLabel: {
      fontFamily: FONTS.primary,
      letterSpacing: 1.6,
      color: '#715435',
      textTransform: 'uppercase',
    },
    themeLabelAlt: {
      fontFamily: FONTS.primary,
      textTransform: 'uppercase',
      color: '#ffe0d4',
      letterSpacing: 1.8,
    },
    themeValue: {
      fontFamily: FONTS.secondaryBold,
      color: '#2f1f14',
    },
    themeValueAlt: {
      fontFamily: FONTS.secondaryBold,
      color: '#fff3eb',
    },
  actionBlock: {
    alignSelf: 'stretch',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  progressBlock: {
    flex: 1,
    gap: SPACING.xs,
  },
  progressLabel: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1.4,
    color: '#7c5b3c',
    textTransform: 'uppercase',
  },
  progressValue: {
    fontFamily: FONTS.primaryMedium,
    color: '#3b2618',
  },
  countdownBlock: {
    backgroundColor: 'rgba(24, 22, 28, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(210, 180, 140, 0.32)',
    alignItems: 'flex-start',
    gap: SPACING.xs / 2,
  },
  countdownLabel: {
    fontFamily: FONTS.primary,
    letterSpacing: 1.4,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
    countdownValue: {
      fontFamily: FONTS.secondaryBold,
      color: COLORS.offWhite,
      letterSpacing: 2.6,
    },
    pathCard: {
      borderWidth: 1,
      borderColor: 'rgba(246, 236, 219, 0.18)',
      backgroundColor: 'rgba(18, 19, 24, 0.9)',
      gap: SPACING.xs,
    },
    pathCardLabel: {
      fontFamily: FONTS.primary,
      color: COLORS.textMuted,
      textTransform: 'uppercase',
    },
    pathCardTitle: {
      fontFamily: FONTS.secondaryBold,
      color: COLORS.offWhite,
      textTransform: 'none',
    },
    pathCardDescription: {
      fontFamily: FONTS.primary,
      color: COLORS.textSecondary,
      lineHeight: 20,
    },
    pathCardMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    pathCardMetaText: {
      fontFamily: FONTS.primarySemiBold,
      color: COLORS.offWhite,
    },
    pathCardTimestamp: {
      fontFamily: FONTS.mono,
      color: COLORS.textSecondary,
      letterSpacing: 1.4,
    },
    pathCardHint: {
      fontFamily: FONTS.primary,
      color: COLORS.textSecondary,
    },
  quickRow: {
    flexDirection: 'row',
  },
  quickRowStack: {
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  quickCard: {
    flex: 1,
    backgroundColor: 'rgba(18, 19, 24, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(246, 236, 219, 0.08)',
    gap: SPACING.xs,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  quickTitle: {
    fontFamily: FONTS.primary,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  quickValue: {
    fontFamily: FONTS.secondaryBold,
    color: COLORS.offWhite,
  },
  quickMeta: {
    fontFamily: FONTS.primary,
    color: COLORS.textSecondary,
  },
  storyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(24, 26, 33, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(246, 236, 219, 0.1)',
  },
  storyCardStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: SPACING.sm,
  },
  storyTextBlock: {
    flex: 1,
    gap: SPACING.xs,
  },
  storyTitle: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.lg,
    letterSpacing: 2.2,
    color: COLORS.offWhite,
  },
  storySubtitle: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 1.2,
    color: COLORS.textSecondary,
  },
  footerSpacer: {
    width: '100%',
  },
});
