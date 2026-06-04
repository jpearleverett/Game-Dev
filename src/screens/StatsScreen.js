import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import ScreenSurface from '../components/ScreenSurface';
import SecondaryButton from '../components/SecondaryButton';
import Stagger from '../components/motion/Stagger';
import { EASE_OUT, DURATION } from '../utils/motion';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

/** A solve-distribution bar that grows from 0 to its value on mount. */
function StatBar({ value, index = 0, reducedMotion = false }) {
  const target = Math.max(0.08, Math.min(1, value / 12));
  const w = useRef(new Animated.Value(reducedMotion ? target : 0)).current;
  useEffect(() => {
    if (reducedMotion) return undefined;
    const anim = Animated.timing(w, {
      toValue: target,
      duration: DURATION.scene,
      delay: 180 + index * 60,
      easing: EASE_OUT,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  const width = w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return <Animated.View style={[styles.barFill, { width }]} />;
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
  const reducedMotion = !!progress?.settings?.reducedMotion;

  return (
    <ScreenSurface variant="default" accentColor={COLORS.accentPrimary} contentStyle={styles.surface}>
      <View style={styles.container}>
        <SecondaryButton label="Back" arrow onPress={onBack} />
        <Stagger reducedMotion={reducedMotion} distance={14}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>DETECTIVE RECORD</Text>
          <Text style={styles.title}>STATISTICS</Text>
        </View>

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
          {distributionOrder.map((key, i) => (
            <View key={key} style={styles.distributionRow}>
              <Text style={styles.distributionLabel}>{distributionLabels[key]}</Text>
              <View style={styles.barTrack}>
                <StatBar value={progress.attemptsDistribution[key] || 0} index={i} reducedMotion={reducedMotion} />
              </View>
              <Text style={styles.distributionCount}>{progress.attemptsDistribution[key] || 0}</Text>
            </View>
          ))}
        </View>
        </Stagger>
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
  titleBlock: { gap: 2 },
  eyebrow: { fontFamily: FONTS.monoBold, fontSize: FONT_SIZES.xs, letterSpacing: 4, color: COLORS.accentSecondary, textTransform: 'uppercase' },
  title: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.display,
    color: COLORS.offWhite,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderColor: COLORS.panelOutline,
    borderLeftColor: COLORS.accentSecondary,
    backgroundColor: 'rgba(0,0,0,0.30)',
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
