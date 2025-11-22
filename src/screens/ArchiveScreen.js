import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import ScreenSurface from '../components/ScreenSurface';
import SecondaryButton from '../components/SecondaryButton';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';
import { formatCaseOutlierThemes } from '../utils/themeDisplay';

export default function ArchiveScreen({ cases, progress, onSelectCase, onBack, onUnlockPremium }) {
  const enrichedCases = useMemo(
    () =>
      cases.map((caseData) => ({
        ...caseData,
        unlocked: progress.unlockedCaseIds.includes(caseData.id),
        solved: progress.solvedCaseIds.includes(caseData.id),
        failed: progress.failedCaseIds.includes(caseData.id),
      })),
    [cases, progress],
  );

  const premiumUnlocked = progress.premiumUnlocked;

  return (
    <ScreenSurface variant="default" accentColor={COLORS.accentPrimary} contentStyle={styles.surface}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <SecondaryButton label="Back" arrow onPress={onBack} />
        <Text style={styles.title}>Case Archive</Text>
        <Text style={styles.subtitle}>Season 1: The Vanishing</Text>

        <View style={styles.caseStack}>
          {enrichedCases.map((item) => (
            <View key={item.id} style={[styles.caseCard, !item.unlocked && styles.caseCardLocked]}>
              <View style={styles.caseHeader}>
                <Text style={styles.caseNumber}>#{item.caseNumber}</Text>
                <View style={[
                  styles.caseStatus,
                  item.solved && styles.caseStatusSolved,
                  item.failed && styles.caseStatusFailed,
                  !item.unlocked && styles.caseStatusLocked,
                ]}
                >
                  <Text style={styles.caseStatusText}>
                    {item.solved ? 'Solved' : item.failed ? 'Failed' : item.unlocked ? 'Unlocked' : 'Locked'}
                  </Text>
                </View>
              </View>
              <Text style={styles.caseTitle}>{item.title}</Text>
                <Text style={styles.caseThemes}>
                  {item.mainTheme.icon} {item.mainTheme.name} • {formatCaseOutlierThemes(item) || 'Unknown Theme'}
                </Text>
              {item.unlocked ? (
                <SecondaryButton
                  label={item.solved || item.failed ? 'Review Case' : 'Investigate'}
                  icon={item.solved 
                    ? <MaterialCommunityIcons name="check" size={18} color={COLORS.textSecondary} /> 
                    : item.failed 
                      ? <MaterialCommunityIcons name="close" size={18} color={COLORS.textSecondary} /> 
                      : <MaterialCommunityIcons name="magnify" size={18} color={COLORS.textSecondary} />
                  }
                  onPress={() => onSelectCase?.(item.id)}
                />
              ) : (
                <Text style={styles.lockedCopy}>Unlocks after the previous case is solved.</Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.futureBlock}>
          <Text style={styles.futureTitle}>
            Season 2: The Setup {premiumUnlocked ? '' : <MaterialCommunityIcons name="lock" size={16} color={COLORS.textSecondary} />}
          </Text>
          <Text style={styles.futureMeta}>14 cases · Premium archive</Text>
          {premiumUnlocked ? (
            <Text style={styles.futureCopy}>Season 2 cases unlock on launch day. Enjoy early access as a premium detective.</Text>
          ) : (
            <PrimaryButton label="Unlock Archive Key" onPress={onUnlockPremium} />
          )}
        </View>

        <View style={styles.futureBlock}>
          <Text style={styles.futureTitle}>
            Season 3: The Fall {premiumUnlocked ? '' : <MaterialCommunityIcons name="lock" size={16} color={COLORS.textSecondary} />}
          </Text>
          <Text style={styles.futureMeta}>14 cases · Premium archive</Text>
          {premiumUnlocked ? (
            <Text style={styles.futureCopy}>Season 3 will release after the investigation concludes. Your key keeps it ready.</Text>
          ) : (
            <PrimaryButton label="Unlock Archive Key" onPress={onUnlockPremium} />
          )}
        </View>
      </ScrollView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
    surface: {
      paddingHorizontal: SPACING.sm,
    },
    container: {
      flexGrow: 1,
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
  subtitle: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    letterSpacing: 1.6,
  },
  caseStack: {
    gap: SPACING.md,
  },
  caseCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.panelOutline,
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  caseCardLocked: {
    opacity: 0.6,
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caseNumber: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    letterSpacing: 1.6,
  },
  caseStatus: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.panelOutline,
    backgroundColor: 'rgba(21, 24, 32, 0.8)',
  },
  caseStatusSolved: {
    borderColor: 'rgba(241, 197, 114, 0.4)',
    backgroundColor: 'rgba(241, 197, 114, 0.18)',
  },
  caseStatusFailed: {
    borderColor: 'rgba(196, 92, 92, 0.4)',
    backgroundColor: 'rgba(196, 92, 92, 0.18)',
  },
  caseStatusLocked: {
    borderColor: 'rgba(90, 90, 90, 0.4)',
    backgroundColor: 'rgba(40, 42, 48, 0.4)',
  },
  caseStatusText: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textPrimary,
    letterSpacing: 1.4,
  },
  caseTitle: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  caseThemes: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
  },
  lockedCopy: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    letterSpacing: 1.2,
  },
  futureBlock: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.panelOutline,
    backgroundColor: 'rgba(21, 24, 32, 0.85)',
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  futureTitle: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  futureMeta: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
  },
  futureCopy: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: FONT_SIZES.md * 1.4,
  },
});
