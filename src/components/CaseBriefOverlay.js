import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import { FONTS, FONT_SIZES } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/layout';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { createCasePalette } from '../theme/casePalette';

const FONT_TWEAK_FACTOR = 0.95;
const shrinkFont = (value) => Math.max(10, Math.floor(value * FONT_TWEAK_FACTOR));

function parseDailyIntro(dailyIntro) {
  if (typeof dailyIntro !== 'string' || !dailyIntro.trim()) {
    return null;
  }

  const lines = dailyIntro
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return null;
  }

  const [slug, focus, ...rest] = lines;
  return {
    slug,
    focus: focus || null,
    annotation: rest.length ? rest.join('\n') : null,
  };
}

export default function CaseBriefOverlay({
  visible,
  caseData,
  onDismiss,
  onOpenCaseFile,
  reducedMotion = false,
}) {
  const [shouldRender, setShouldRender] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const contentOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const contentTranslate = useRef(new Animated.Value(visible ? 0 : 24)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    if (reducedMotion) {
      backdropOpacity.setValue(visible ? 1 : 0);
      contentOpacity.setValue(visible ? 1 : 0);
      contentTranslate.setValue(0);
      if (!visible) {
        setShouldRender(false);
      }
      return;
    }

    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 340,
          useNativeDriver: true,
        }),
        Animated.spring(contentTranslate, {
          toValue: 0,
          damping: 18,
          stiffness: 160,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslate, {
          toValue: 24,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setShouldRender(false);
        }
      });
    }
  }, [visible, reducedMotion, shouldRender, backdropOpacity, contentOpacity, contentTranslate]);

  const {
    moderateScale,
    scaleSpacing,
    scaleRadius,
    sizeClass,
    containerPadding,
    surfacePadding,
    surfaceRadius,
    isTablet,
  } = useResponsiveLayout();

  const compact = sizeClass === 'xsmall' || sizeClass === 'small';
  const palette = useMemo(() => createCasePalette(caseData), [caseData]);
  const dailyIntro = useMemo(() => parseDailyIntro(caseData?.dailyIntro), [caseData?.dailyIntro]);
  const bridgeEntries = useMemo(() => {
    if (!caseData?.bridgeText || !Array.isArray(caseData.bridgeText)) {
      return [];
    }
    return caseData.bridgeText.filter(Boolean);
  }, [caseData]);

  const primaryObjectives = useMemo(() => {
    if (!caseData?.briefing?.objectives || !Array.isArray(caseData.briefing.objectives)) {
      return [];
    }
    return caseData.briefing.objectives.filter((entry) => typeof entry === 'string' && entry.trim().length > 0);
  }, [caseData?.briefing?.objectives]);

  const fallbackObjectives = useMemo(() => {
    const missions = [];
    const mainName = caseData?.mainTheme?.name ? caseData.mainTheme.name.toLowerCase() : null;
    const outlierName = caseData?.outlierTheme?.name ? caseData.outlierTheme.name.toLowerCase() : null;
    if (mainName) {
      missions.push(`Trace every ${mainName} cue on the board to confirm the main thread.`);
    }
    if (outlierName) {
      missions.push(`Isolate references to ${outlierName}—they often point to the outliers you need to tag.`);
    }
    missions.push('Lock your selections before the attempt counter runs dry to keep the investigation on track.');
    return missions;
  }, [caseData?.mainTheme?.name, caseData?.outlierTheme?.name]);

  const objectivesToShow = primaryObjectives.length > 0 ? primaryObjectives : fallbackObjectives;

  const summaryText = useMemo(() => {
    const customSummary = caseData?.briefing?.summary;
    if (typeof customSummary === 'string' && customSummary.trim().length > 0) {
      return customSummary.trim();
    }
    const intro = typeof caseData?.dailyIntro === 'string' ? caseData.dailyIntro : '';
    if (!intro) {
      return null;
    }
    const sanitized = intro
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!sanitized.length) {
      return null;
    }
    return sanitized.slice(0, 3).join('\n');
  }, [caseData?.briefing?.summary, caseData?.dailyIntro]);

  const clueSummary = caseData?.clueSummaries?.main || null;
  const clueOutliers = useMemo(() => {
    const entries = caseData?.clueSummaries?.outliers;
    if (!entries) return [];
    return Object.entries(entries).filter(([word, detail]) => Boolean(word) && Boolean(detail));
  }, [caseData]);

  const outlierWords = caseData?.board?.outlierWords || [];
  const detailedIntelUnlocked = Boolean(caseData?.allowBriefingSpoilers);

  const metrics = useMemo(() => {
    const items = [
      {
        id: 'attempts',
        label: 'Attempts',
        value: caseData?.attempts != null ? `${caseData.attempts}` : '—',
      },
      {
        id: 'outliers',
        label: 'Outliers',
        value: outlierWords.length ? `${outlierWords.length}` : '—',
      },
    ];
    return items;
  }, [caseData?.attempts, outlierWords.length]);

  const handleDismiss = () => {
    onDismiss?.();
  };

  if (!shouldRender || !caseData) {
    return null;
  }

  const cardRadius = scaleRadius(surfaceRadius);
  const sectionRadius = scaleRadius(RADIUS.lg);
  const badgeRadius = scaleRadius(RADIUS.md);
  const objectiveBadgeRadius = scaleRadius(RADIUS.sm);
  const headingSize = shrinkFont(moderateScale(compact ? FONT_SIZES.lg : FONT_SIZES.title));
  const heroTitleSize = shrinkFont(
    moderateScale(compact ? FONT_SIZES.display : FONT_SIZES.display + (sizeClass === 'xlarge' ? 6 : 2)),
  );
  const bodySize = shrinkFont(moderateScale(FONT_SIZES.md));
  const smallBodySize = shrinkFont(moderateScale(FONT_SIZES.sm));
  const badgeLabelSize = shrinkFont(moderateScale(FONT_SIZES.xs));
  const heroTitleLetterSpacing = compact ? 2.2 : 4;
  const heroSlugLetterSpacing = compact ? 2.6 : 4;
  const badgeLetterSpacing = compact ? 1.6 : 2;
  const bodyLineHeight = Math.round(bodySize * (compact ? 1.45 : 1.56));
  const smallBodyLineHeight = Math.round(smallBodySize * (compact ? 1.38 : 1.46));
  const summaryLineHeight = Math.round(bodySize * (compact ? 1.52 : 1.64));
  const metricValueSize = shrinkFont(moderateScale(FONT_SIZES.lg));
  const metricValueLineHeight = Math.round(metricValueSize * 1.18);

  const topPadding = scaleSpacing(compact ? SPACING.lg : SPACING.xl);
  const bottomPadding = scaleSpacing(compact ? SPACING.xl : SPACING.xxl) + surfacePadding;
  const pagePaddingHorizontal = isTablet
    ? containerPadding + scaleSpacing(compact ? SPACING.sm : SPACING.md)
    : scaleSpacing(0);
  const heroInnerPadding = surfacePadding + scaleSpacing(compact ? SPACING.xs : SPACING.sm);
  const verticalGap = scaleSpacing(compact ? SPACING.lg : SPACING.xl);
  const sectionGap = scaleSpacing(compact ? SPACING.md : SPACING.lg);
  const inlineGap = scaleSpacing(SPACING.sm);
  const badgeSpacing = scaleSpacing(SPACING.xs);
  const calloutPadding = scaleSpacing(SPACING.sm);

  const caseNumber = String(caseData.caseNumber || '---').padStart(3, '0');
  const seasonLabel = caseData?.season != null ? `Season ${caseData.season}` : null;
  const dayLabel = caseData?.day != null ? `Day ${caseData.day}` : null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View pointerEvents="none" style={[styles.backdropContainer, { opacity: backdropOpacity }]}>
        <LinearGradient
          colors={[palette.overlayStart, palette.overlayMid, palette.overlayEnd]}
          locations={[0, 0.55, 1]}
          style={styles.backdropGradient}
        />
        <View style={styles.backdropTint} />
      </Animated.View>

      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[
          styles.contentLayer,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslate }],
          },
        ]}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: topPadding,
              paddingBottom: bottomPadding,
              paddingHorizontal: pagePaddingHorizontal,
              gap: verticalGap,
            },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View
            style={[
              styles.heroSection,
              {
                borderRadius: cardRadius,
                padding: heroInnerPadding,
                backgroundColor: palette.surface,
                borderColor: palette.border,
                gap: sectionGap,
              },
            ]}
          >
            <View
              style={[
                styles.heroHeaderRow,
                compact
                  ? {
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: scaleSpacing(SPACING.xs),
                    }
                  : {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: scaleSpacing(SPACING.sm),
                    },
                {
                  marginBottom: scaleSpacing(SPACING.sm),
                },
              ]}
            >
                <Text
                  style={[
                    styles.heroSlug,
                    {
                      fontSize: smallBodySize,
                      color: palette.primary,
                      letterSpacing: heroSlugLetterSpacing,
                      lineHeight: smallBodyLineHeight,
                    },
                  ]}
                >
                  {dailyIntro?.slug || 'CASE BRIEFING'}
                </Text>
                <View
                  style={[
                    styles.heroBadgeRow,
                    {
                      gap: badgeSpacing,
                    },
                    compact
                      ? {
                          width: '100%',
                          justifyContent: 'flex-start',
                        }
                      : {
                          justifyContent: 'flex-end',
                        },
                  ]}
                >
                  {seasonLabel ? (
                    <View
                      style={[
                        styles.heroBadge,
                        {
                          borderRadius: badgeRadius,
                          borderColor: palette.border,
                          backgroundColor: palette.badgeBackground,
                          paddingHorizontal: scaleSpacing(SPACING.sm),
                          paddingVertical: scaleSpacing(SPACING.xs),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.heroBadgeText,
                          {
                            fontSize: badgeLabelSize,
                            color: palette.badgeText,
                            letterSpacing: badgeLetterSpacing,
                          },
                        ]}
                      >
                        {seasonLabel.toUpperCase()}
                      </Text>
                    </View>
                    ) : null}
                  {dayLabel ? (
                    <View
                      style={[
                        styles.heroBadge,
                        {
                          borderRadius: badgeRadius,
                          borderColor: palette.border,
                          backgroundColor: palette.badgeBackground,
                          paddingHorizontal: scaleSpacing(SPACING.sm),
                          paddingVertical: scaleSpacing(SPACING.xs),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.heroBadgeText,
                          {
                            fontSize: badgeLabelSize,
                            color: palette.badgeText,
                            letterSpacing: badgeLetterSpacing,
                          },
                        ]}
                      >
                        {dayLabel.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View
                style={[
                  styles.heroTitleBlock,
                  {
                    gap: scaleSpacing(SPACING.xs),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.heroTitle,
                    {
                      fontSize: heroTitleSize,
                      color: palette.highlightText,
                      letterSpacing: heroTitleLetterSpacing,
                      lineHeight: Math.round(heroTitleSize * (compact ? 1.08 : 1.12)),
                    },
                  ]}
                >
                  {caseData.title}
                </Text>
                <Text
                  style={[
                    styles.caseNumber,
                    {
                      fontSize: badgeLabelSize,
                      color: palette.badgeText,
                      letterSpacing: badgeLetterSpacing,
                    },
                  ]}
                >
                  Case File #{caseNumber}
                </Text>
              </View>

              {summaryText ? (
                <View
                  style={[
                    styles.summaryCard,
                    {
                      borderRadius: sectionRadius,
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                      padding: calloutPadding,
                      gap: scaleSpacing(SPACING.xs),
                    },
                  ]}
                >
                  {summaryText.split('\n').map((line, index) => (
                    <Text
                      key={`${line}-${index}`}
                      style={[
                        styles.heroSummaryLine,
                        {
                          fontSize: bodySize,
                          color: palette.subtleText,
                          lineHeight: summaryLineHeight,
                        },
                      ]}
                    >
                      {line}
                    </Text>
                  ))}
                </View>
              ) : null}

              {dailyIntro?.annotation ? (
                <View
                  style={[
                    styles.heroCallout,
                    {
                      borderRadius: badgeRadius,
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                      padding: calloutPadding,
                      gap: scaleSpacing(SPACING.xs),
                      borderLeftColor: palette.accent,
                      borderLeftWidth: 2,
                    },
                  ]}
                >
                  {dailyIntro.annotation.split('\n').map((line, index) => (
                    <Text
                      key={`${line}-${index}`}
                      style={[
                        styles.heroCalloutText,
                        {
                          fontSize: smallBodySize,
                          color: palette.badgeText,
                          lineHeight: smallBodyLineHeight,
                        },
                      ]}
                    >
                      {line}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={[styles.glowBar, { backgroundColor: palette.glow }]} />

              <View
                style={[
                  styles.metricRow,
                  {
                    gap: inlineGap,
                  },
                ]}
              >
                {metrics.map((metric) => (
                  <View
                    key={metric.id}
                    style={[
                      styles.metricCard,
                      {
                        borderRadius: badgeRadius,
                        borderColor: palette.border,
                        backgroundColor: palette.metricBackground,
                        paddingHorizontal: scaleSpacing(SPACING.md),
                        paddingVertical: scaleSpacing(SPACING.sm),
                        gap: scaleSpacing(SPACING.xs),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.metricLabel,
                        {
                          fontSize: badgeLabelSize,
                          color: palette.badgeText,
                          letterSpacing: badgeLetterSpacing,
                        },
                      ]}
                    >
                      {metric.label}
                    </Text>
                    <Text
                      style={[
                        styles.metricValue,
                        {
                          fontSize: metricValueSize,
                          color: palette.highlightText,
                          lineHeight: metricValueLineHeight,
                        },
                      ]}
                    >
                      {metric.value}
                    </Text>
                  </View>
                ))}
              </View>

            {objectivesToShow.length > 0 ? (
              <View
                style={[
                  styles.sectionCard,
                  {
                    borderRadius: sectionRadius,
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceAlt,
                    padding: surfacePadding + scaleSpacing(compact ? 0 : SPACING.xs),
                    gap: scaleSpacing(SPACING.sm),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sectionHeading,
                    {
                      fontSize: headingSize,
                      color: palette.primary,
                    },
                  ]}
                >
                  Primary Objectives
                </Text>
                <View style={[styles.objectiveList, { gap: inlineGap }]}>
                  {objectivesToShow.map((objective, index) => (
                    <View
                      key={`${objective}-${index}`}
                      style={[
                        styles.objectiveRow,
                        {
                          gap: inlineGap,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.objectiveBadge,
                          {
                            borderRadius: objectiveBadgeRadius,
                            borderColor: palette.border,
                            backgroundColor: palette.badgeBackground,
                            paddingHorizontal: scaleSpacing(SPACING.sm),
                            paddingVertical: scaleSpacing(SPACING.xs),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.objectiveBadgeText,
                            {
                              fontSize: smallBodySize,
                              color: palette.accent,
                            letterSpacing: badgeLetterSpacing,
                            lineHeight: smallBodyLineHeight,
                            },
                          ]}
                        >
                          {index + 1 < 10 ? `0${index + 1}` : index + 1}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.objectiveCopy,
                          {
                            fontSize: bodySize,
                            color: palette.highlightText,
                          },
                        ]}
                      >
                        {objective}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {bridgeEntries.length > 0 ? (
              <View
                style={[
                  styles.sectionCard,
                  {
                    borderRadius: sectionRadius,
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceAlt,
                    padding: surfacePadding + scaleSpacing(compact ? 0 : SPACING.xs),
                    gap: scaleSpacing(SPACING.sm),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sectionHeading,
                    {
                      fontSize: headingSize,
                      color: palette.primary,
                    },
                  ]}
                >
                  Detailed Intel
                </Text>
                {detailedIntelUnlocked ? (
                  <View style={[styles.bridgeList, { gap: inlineGap }]}>
                    {bridgeEntries.map((entry, index) => (
                      <View
                        key={`${entry}-${index}`}
                        style={[
                          styles.bridgeRow,
                          {
                            gap: inlineGap,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.bridgeBadge,
                            {
                              borderRadius: objectiveBadgeRadius,
                              borderColor: palette.border,
                              backgroundColor: palette.badgeBackground,
                              paddingHorizontal: scaleSpacing(SPACING.sm),
                              paddingVertical: scaleSpacing(SPACING.xs),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.bridgeBadgeText,
                              {
                                fontSize: smallBodySize,
                                color: palette.accent,
                            letterSpacing: badgeLetterSpacing,
                            lineHeight: smallBodyLineHeight,
                              },
                            ]}
                          >
                            {index + 1 < 10 ? `0${index + 1}` : index + 1}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.bridgeText,
                            {
                              fontSize: bodySize,
                              color: palette.subtleText,
                            },
                          ]}
                        >
                          {entry}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.lockedCopy,
                      {
                        fontSize: bodySize,
                        color: palette.badgeText,
                      },
                    ]}
                  >
                    Close the case to unlock the full field notes from the investigation.
                  </Text>
                )}
              </View>
            ) : null}

            {(clueSummary || clueOutliers.length > 0) ? (
              <View
                style={[
                  styles.sectionCard,
                  {
                    borderRadius: sectionRadius,
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceAlt,
                    padding: surfacePadding + scaleSpacing(compact ? 0 : SPACING.xs),
                    gap: scaleSpacing(SPACING.sm),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sectionHeading,
                    {
                      fontSize: headingSize,
                      color: palette.primary,
                    },
                  ]}
                >
                  Key Evidence
                </Text>
                {detailedIntelUnlocked ? (
                  <>
                    {clueSummary ? (
                      <Text
                        style={[
                          styles.copyPrimary,
                          {
                            fontSize: bodySize,
                            color: palette.subtleText,
                          },
                        ]}
                      >
                        {clueSummary}
                      </Text>
                    ) : null}
                    {clueOutliers.length > 0 ? (
                      <View style={[styles.evidenceList, { gap: inlineGap }]}>
                        {clueOutliers.map(([word, detail]) => (
                          <View
                            key={word}
                            style={[
                              styles.evidenceRow,
                              {
                                gap: inlineGap,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.evidenceBadge,
                                {
                                  borderRadius: badgeRadius,
                                  borderColor: palette.accent,
                                  backgroundColor: 'rgba(241, 197, 114, 0.16)',
                                  paddingHorizontal: scaleSpacing(SPACING.md),
                                  paddingVertical: scaleSpacing(SPACING.xs),
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.evidenceBadgeText,
                                  {
                                    fontSize: smallBodySize,
                                    color: palette.accent,
                              letterSpacing: badgeLetterSpacing,
                              lineHeight: smallBodyLineHeight,
                                  },
                                ]}
                              >
                                {word}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.evidenceDetail,
                                {
                                  fontSize: smallBodySize,
                                  color: palette.subtleText,
                                },
                              ]}
                            >
                              {detail}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </>
                ) : (
                  <Text
                    style={[
                      styles.lockedCopy,
                      {
                        fontSize: bodySize,
                        color: palette.badgeText,
                      },
                    ]}
                  >
                    Solve the board to receive the evidence digest and outlier breakdown.
                  </Text>
                )}
                </View>
              ) : null}

              <View style={[styles.footerActions, { gap: inlineGap }]}>
                <PrimaryButton
                  label="Begin Investigation"
                  icon="▶"
                  arrow={false}
                  onPress={handleDismiss}
                  fullWidth
                />
                {onOpenCaseFile ? (
                  <SecondaryButton
                    label="Review Case File"
                    icon="📁"
                    onPress={onOpenCaseFile}
                    style={styles.secondaryAction}
                  />
                ) : null}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 5, 8, 0.55)',
  },
  contentLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    width: '100%',
  },
  heroSlug: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  heroBadge: {
    borderWidth: 1,
  },
  heroBadgeText: {
    fontFamily: FONTS.mono,
    letterSpacing: 1.6,
  },
  heroTitleBlock: {
    width: '100%',
  },
  heroTitle: {
    fontFamily: FONTS.secondaryBold,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  caseNumber: {
    fontFamily: FONTS.mono,
    letterSpacing: 2,
  },
  summaryCard: {
    borderWidth: 1,
  },
  heroSummaryLine: {
    fontFamily: FONTS.primary,
  },
  heroCallout: {
    borderWidth: 1,
  },
  heroCalloutText: {
    fontFamily: FONTS.mono,
    letterSpacing: 1.4,
  },
  glowBar: {
    height: 2,
    borderRadius: 2,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricCard: {
    minWidth: 120,
    borderWidth: 1,
  },
  metricLabel: {
    fontFamily: FONTS.mono,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontFamily: FONTS.secondaryBold,
    letterSpacing: 2.4,
  },
  sectionCard: {
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  sectionHeading: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  copyPrimary: {
    fontFamily: FONTS.primary,
    lineHeight: 22,
  },
  objectiveList: {
    flexDirection: 'column',
  },
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  objectiveBadge: {
    borderWidth: 1,
  },
  objectiveBadgeText: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 2,
  },
  objectiveCopy: {
    flex: 1,
    fontFamily: FONTS.primary,
    lineHeight: 22,
  },
  bridgeList: {
    flexDirection: 'column',
  },
  bridgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bridgeBadge: {
    borderWidth: 1,
  },
  bridgeBadgeText: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 2,
  },
  bridgeText: {
    flex: 1,
    fontFamily: FONTS.primary,
    lineHeight: 22,
  },
  lockedCopy: {
    fontFamily: FONTS.primary,
    lineHeight: 22,
  },
  evidenceList: {
    flexDirection: 'column',
  },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  evidenceBadge: {
    borderWidth: 1,
  },
  evidenceBadgeText: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 2,
  },
  evidenceDetail: {
    flex: 1,
    fontFamily: FONTS.primary,
    lineHeight: 22,
  },
  footerActions: {
    marginTop: SPACING.md,
  },
  secondaryAction: {
    alignSelf: 'center',
  },
});
