import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenSurface from '../components/ScreenSurface';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING } from '../constants/layout';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

function formatCountdown(target) {
  if (!target) return null;
  const targetTime = new Date(target).getTime();
  const now = Date.now();
  if (targetTime <= now) return null;
  const diff = targetTime - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function useUnlockCountdown(target) {
  const [value, setValue] = useState(formatCountdown(target));
  useEffect(() => {
    if (!target) {
      setValue(null);
      return undefined;
    }
    const tick = () => setValue(formatCountdown(target));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [target]);
  return value;
}

export default function StoryCampaignScreen({
  storyCampaign,
  onContinueStory,
  onStartStory,
  onRestartStory,
  onBack,
  onExitToDesk,
}) {
  const { moderateScale, sizeClass, scaleSpacing } = useResponsiveLayout();
  const compact = sizeClass === 'xsmall' || sizeClass === 'small';
  const medium = sizeClass === 'medium';

  const campaign = useMemo(
    () => ({
      active: false,
      chapter: 1,
      subchapter: 1,
      currentPathKey: 'ROOT',
      choiceHistory: [],
      ...storyCampaign,
    }),
    [storyCampaign],
  );

  const awaitingDecision = Boolean(campaign.awaitingDecision);
  const countdown = useUnlockCountdown(campaign.nextStoryUnlockAt);
  const hasHistory = Array.isArray(campaign.choiceHistory) && campaign.choiceHistory.length > 0;
  const hasStarted = Boolean(campaign.startedAt || hasHistory);
  const resumeAvailable = hasStarted && !awaitingDecision && !campaign.nextStoryUnlockAt;
  const currentPathLabel = campaign.currentPathKey || 'ROOT';
  const historyEntries = hasHistory ? [...campaign.choiceHistory].reverse() : [];

  const heroStatusLine = awaitingDecision
    ? 'Branching choice required. Open the current case file to choose your path.'
    : countdown
      ? `Next chapter unlocks in ${countdown}.`
      : hasStarted
        ? `Ready for Chapter ${campaign.chapter}, Subchapter ${campaign.subchapter} · Path ${currentPathLabel}`
        : 'Begin the branching investigation with Chapter 1.';

  const handleRestart = () => {
    if (!onRestartStory) return;
    Alert.alert(
      'Restart Story Campaign',
      'This will reset your story progress and take you back to Chapter 1. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          style: 'destructive',
          onPress: () => onRestartStory?.(),
        },
      ],
    );
  };

  return (
    <ScreenSurface variant="default">
      <View style={[styles.headerRow, compact && styles.headerRowCompact]}>
        <SecondaryButton label="Desk" arrow onPress={onBack} />
        <SecondaryButton label="Daily Mode" icon="???" onPress={onExitToDesk} />
      </View>

      <View style={[styles.heroCard, compact && styles.heroCardCompact]}>
        <Text
          style={[
            styles.heroTitle,
            { fontSize: moderateScale(compact ? 26 : 30), letterSpacing: compact ? 2.5 : 4 },
          ]}
        >
          Story Campaign
        </Text>
        <Text
          style={[
            styles.heroSubtitle,
            { fontSize: moderateScale(FONT_SIZES.md), letterSpacing: compact ? 1.2 : 2 },
          ]}
        >
          All fourteen cases. No clocks, just clues.
        </Text>
          <Text
            style={[
              styles.heroStatus,
              {
                fontSize: moderateScale(FONT_SIZES.md),
                lineHeight: moderateScale(LINE_HEIGHTS.relaxed),
              },
            ]}
          >
            {heroStatusLine}
          </Text>

          <View style={[styles.heroActions, (compact || medium) && styles.heroActionsStack]}>
            <PrimaryButton
              label={resumeAvailable ? 'Continue Story' : hasStarted ? 'Resume Story' : 'Start Story'}
              icon={resumeAvailable ? '▶' : hasStarted ? '⏵' : '★'}
              disabled={
                awaitingDecision ||
                (!resumeAvailable && hasStarted && Boolean(campaign.nextStoryUnlockAt))
              }
              onPress={() => {
                if (resumeAvailable) {
                  onContinueStory?.();
                } else if (!hasStarted) {
                  onStartStory?.();
                }
              }}
            />
            <SecondaryButton
              label={hasHistory ? 'Restart Campaign' : 'Start Fresh'}
              icon="↺"
              onPress={hasHistory ? handleRestart : onStartStory}
              style={compact ? { alignSelf: 'stretch' } : null}
            />
          </View>
      </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { gap: scaleSpacing(SPACING.lg) }]}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[
              styles.sectionTitle,
              { fontSize: moderateScale(FONT_SIZES.lg), letterSpacing: compact ? 2.2 : 3 },
            ]}
          >
            Branch History
          </Text>
          {historyEntries.length ? (
            historyEntries.map((entry, index) => {
              const chapter = entry.nextChapter || parseInt(entry.caseNumber.slice(0, 3), 10);
              const timestamp = entry.selectedAt
                ? new Date(entry.selectedAt).toLocaleString()
                : 'Recently';
              return (
                <View
                  key={`${entry.caseNumber}-${entry.optionKey}-${index}`}
                  style={[
                    styles.historyCard,
                    {
                      borderRadius: 16,
                      padding: scaleSpacing(SPACING.md),
                      borderColor: 'rgba(203,167,113,0.24)',
                    },
                  ]}
                >
                  <Text style={styles.historyChapter}>{`Chapter ${chapter}`}</Text>
                  <Text style={styles.historyOption}>
                    {`Option ${entry.optionKey} → Path ${entry.nextPathKey || '—'}`}
                  </Text>
                  <Text style={styles.historyTimestamp}>{timestamp}</Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.historyEmpty}>
              No branching choices recorded yet. Solve Chapter 1 to begin the tree.
            </Text>
          )}
        </ScrollView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  heroCard: {
    backgroundColor: 'rgba(32, 26, 23, 0.92)',
    borderRadius: 18,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(203,167,113,0.18)',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  heroCardCompact: {
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  heroTitle: {
    fontFamily: FONTS.secondaryBold,
    fontSize: 30,
    letterSpacing: 4,
    color: COLORS.offWhite,
  },
  heroSubtitle: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    letterSpacing: 2,
    color: COLORS.cigaretteSmoke,
  },
  heroStatus: {
    fontFamily: FONTS.secondary,
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.relaxed,
    color: COLORS.cigaretteSmoke,
  },
  heroActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  heroActionsStack: {
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  scroll: {
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: FONTS.primaryBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.offWhite,
    letterSpacing: 3,
  },
  caseGrid: {
    gap: SPACING.md,
  },
  caseGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  caseCard: {
    backgroundColor: 'rgba(34,28,25,0.92)',
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(203,167,113,0.18)',
    gap: SPACING.sm,
  },
  caseCardCompact: {
    padding: SPACING.md,
    borderRadius: 14,
  },
  caseCardTablet: {
    width: '48%',
  },
  caseCardStatus_locked: {
    opacity: 0.45,
  },
  caseCardStatus_current: {
    borderColor: 'rgba(215,178,108,0.42)',
  },
  caseCardStatus_next: {
    borderColor: 'rgba(140,114,88,0.34)',
  },
  caseCardStatus_solved: {
    borderColor: 'rgba(215,178,108,0.24)',
  },
  caseCardStatus_failed: {
    borderColor: 'rgba(159,79,68,0.32)',
  },
  caseCardDisabled: {
    opacity: 0.4,
  },
  caseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caseHeaderRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  caseNumber: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 2,
    color: COLORS.fogGrayLight,
  },
  caseStatus: {
    fontFamily: FONTS.primaryBold,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  caseStatus_current: {
    color: COLORS.amberLight,
  },
  caseStatus_next: {
    color: COLORS.cigaretteSmoke,
  },
  caseStatus_solved: {
    color: COLORS.amberGlow,
  },
  caseStatus_failed: {
    color: COLORS.bloodRed,
  },
  caseStatus_locked: {
    color: COLORS.fogGray,
  },
  caseStatus_available: {
    color: COLORS.cigaretteSmoke,
  },
  caseTitle: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.offWhite,
    letterSpacing: 2,
  },
  caseMeta: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.fogGrayLight,
    letterSpacing: 1.5,
  },
    historyCard: {
      borderWidth: 1,
      backgroundColor: 'rgba(34,28,25,0.92)',
      gap: SPACING.xs,
    },
    historyChapter: {
      fontFamily: FONTS.secondaryBold,
      color: COLORS.offWhite,
      letterSpacing: 2,
    },
    historyOption: {
      fontFamily: FONTS.primary,
      color: COLORS.cigaretteSmoke,
    },
    historyTimestamp: {
      fontFamily: FONTS.mono,
      color: COLORS.fogGrayLight,
      fontSize: FONT_SIZES.xs,
    },
    historyEmpty: {
      fontFamily: FONTS.primary,
      color: COLORS.cigaretteSmoke,
    },
});

