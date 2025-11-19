import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ScreenSurface from '../components/ScreenSurface';
import SecondaryButton from '../components/SecondaryButton';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

function barWidth(value) {
  const ratio = Math.min(1, value / 12);
  return `${Math.max(8, ratio * 100)}%`;
}

export default function StatsScreen({ progress, onBack }) {
  const distributionOrder = ['1', '2', '3', '4', 'fail'];
  const distributionLabels = {
    1: '1/4',
    2: '2/4',
    3: '3/4',
    4: '4/4',
    fail: 'Failed',
  };

  const solvedCount = progress.solvedCaseIds.length;
  const failedCount = progress.failedCaseIds.length;
  const attemptedCount = solvedCount + failedCount;
  const accuracy = attemptedCount ? Math.round((solvedCount / attemptedCount) * 100) : 0;

  return (
    <ScreenSurface variant="default" accentColor={COLORS.accentPrimary} contentStyle={styles.surface}>
      <View style={styles.container}>
        <SecondaryButton label="Back" arrow onPress={onBack} />
        <Text style={styles.title}>Statistics</Text>

        <View style={styles.card}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Current Streak</Text>
            <Text style={styles.metricValue}>{progress.streak} days</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Best Streak</Text>
            <Text style={styles.metricValue}>{progress.bestStreak} days</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Cases Solved</Text>
            <Text style={styles.metricValue}>{solvedCount}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Cases Attempted</Text>
            <Text style={styles.metricValue}>{attemptedCount}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Accuracy</Text>
            <Text style={styles.metricValue}>{accuracy}%</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Solve Distribution</Text>
          {distributionOrder.map((key) => (
            <View key={key} style={styles.distributionRow}>
              <Text style={styles.distributionLabel}>{distributionLabels[key]}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: barWidth(progress.attemptsDistribution[key] || 0) }]} />
              </View>
              <Text style={styles.distributionCount}>{progress.attemptsDistribution[key] || 0}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
    surface: {
      paddingHorizontal: SPACING.sm,
    },
    container: {
      flex: 1,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xl,
      gap: SPACING.lg,
    },
  title: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.display,
    color: COLORS.textPrimary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.panelOutline,
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
  },
  metricValue: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
  },
  sectionTitle: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 1.8,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  distributionLabel: {
    width: 48,
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  barTrack: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(241, 197, 114, 0.12)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: COLORS.accentSecondary,
    borderRadius: 7,
  },
  distributionCount: {
    width: 32,
    textAlign: 'right',
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
});
