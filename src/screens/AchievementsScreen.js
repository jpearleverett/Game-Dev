import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import ScreenSurface from '../components/ScreenSurface';
import SecondaryButton from '../components/SecondaryButton';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import {
  ACHIEVEMENTS_LIST,
  ACHIEVEMENT_COUNT,
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENTS_BY_CATEGORY,
  RARITY_CONFIG,
  getTotalPossiblePoints,
  calculateEarnedPoints,
  getAchievementProgress,
  getVisibleAchievements,
} from '../data/achievementsData';

/**
 * Achievement Card Component
 */
function AchievementCard({ achievement, isUnlocked, unlockedAt, compact }) {
  const rarityConfig = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common;
  
  // Hidden achievements show ??? until unlocked
  const isHidden = achievement.hidden && !isUnlocked;
  const displayTitle = isHidden ? '???' : achievement.title;
  const displayDescription = isHidden ? 'Hidden achievement' : achievement.description;
  const displayIcon = isHidden ? '❓' : achievement.icon;

  return (
    <View
      style={[
        styles.achievementCard,
        isUnlocked && styles.achievementCardUnlocked,
        !isUnlocked && styles.achievementCardLocked,
        { borderColor: isUnlocked ? rarityConfig.borderColor : 'rgba(157, 150, 141, 0.15)' },
      ]}
    >
      <View style={styles.achievementHeader}>
        <View 
          style={[
            styles.achievementIconContainer,
            { backgroundColor: isUnlocked ? rarityConfig.backgroundColor : 'rgba(157, 150, 141, 0.1)' },
          ]}
        >
          <Text style={styles.achievementIcon}>{displayIcon}</Text>
          {isUnlocked && (
            <View style={styles.checkBadge}>
              <MaterialCommunityIcons name="check-circle" size={14} color={COLORS.successGreen} />
            </View>
          )}
        </View>
        <View style={styles.achievementInfo}>
          <Text 
            style={[
              styles.achievementTitle,
              !isUnlocked && styles.achievementTitleLocked,
            ]}
            numberOfLines={1}
          >
            {displayTitle}
          </Text>
          <Text 
            style={[
              styles.achievementDescription,
              !isUnlocked && styles.achievementDescriptionLocked,
            ]}
            numberOfLines={2}
          >
            {displayDescription}
          </Text>
        </View>
        <View style={styles.achievementMeta}>
          <View style={[styles.pointsBadge, { backgroundColor: rarityConfig.backgroundColor }]}>
            <Text style={[styles.pointsText, { color: rarityConfig.color }]}>
              {achievement.points}
            </Text>
          </View>
          <Text style={[styles.rarityText, { color: rarityConfig.color }]}>
            {rarityConfig.label}
          </Text>
        </View>
      </View>

      {!isUnlocked && !isHidden && achievement.hint && (
        <View style={styles.hintRow}>
          <MaterialCommunityIcons name="lightbulb-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.hintText} numberOfLines={1}>
            {achievement.hint}
          </Text>
        </View>
      )}

      {isUnlocked && unlockedAt && (
        <View style={styles.unlockedRow}>
          <MaterialCommunityIcons name="calendar-check" size={14} color={COLORS.successGreen} />
          <Text style={styles.unlockedText}>
            Unlocked {new Date(unlockedAt).toLocaleDateString()}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Category Section Header
 */
function CategoryHeader({ category, count, unlockedCount, expanded, onToggle }) {
  const categoryLabels = {
    [ACHIEVEMENT_CATEGORIES.STORY]: { label: 'Story Achievements', icon: 'book-open-variant' },
    [ACHIEVEMENT_CATEGORIES.GAMEPLAY]: { label: 'Gameplay Achievements', icon: 'gamepad-variant' },
    [ACHIEVEMENT_CATEGORIES.HIDDEN]: { label: 'Hidden Achievements', icon: 'eye-off' },
  };

  const { label, icon } = categoryLabels[category] || { label: 'Achievements', icon: 'trophy' };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.categoryHeader,
        pressed && styles.categoryHeaderPressed,
      ]}
      onPress={onToggle}
    >
      <View style={styles.categoryLeft}>
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.amberLight} />
        <Text style={styles.categoryLabel}>{label}</Text>
      </View>
      <View style={styles.categoryRight}>
        <Text style={styles.categoryCount}>
          {unlockedCount}/{count}
        </Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.textMuted}
        />
      </View>
    </Pressable>
  );
}

export default function AchievementsScreen({
  unlockedAchievementIds = [],
  achievementDetails = {},
  totalPoints = 0,
  onBack,
}) {
  const { sizeClass, moderateScale, scaleSpacing } = useResponsiveLayout();
  const compact = sizeClass === 'xsmall' || sizeClass === 'small';

  // Expanded categories state
  const [expandedCategories, setExpandedCategories] = useState({
    [ACHIEVEMENT_CATEGORIES.STORY]: true,
    [ACHIEVEMENT_CATEGORIES.GAMEPLAY]: true,
    [ACHIEVEMENT_CATEGORIES.HIDDEN]: true,
  });

  // Calculate stats
  const earnedPoints = useMemo(() => calculateEarnedPoints(unlockedAchievementIds), [unlockedAchievementIds]);
  const maxPoints = useMemo(() => getTotalPossiblePoints(), []);
  const progressPercent = useMemo(() => getAchievementProgress(unlockedAchievementIds), [unlockedAchievementIds]);

  // Filter and group achievements
  const visibleAchievements = useMemo(() => getVisibleAchievements(unlockedAchievementIds), [unlockedAchievementIds]);

  const groupedAchievements = useMemo(() => {
    const groups = {};
    Object.values(ACHIEVEMENT_CATEGORIES).forEach(category => {
      const categoryAchievements = ACHIEVEMENTS_BY_CATEGORY[category] || [];
      groups[category] = {
        total: categoryAchievements.length,
        unlocked: categoryAchievements.filter(a => unlockedAchievementIds.includes(a.id)).length,
        items: categoryAchievements,
      };
    });
    return groups;
  }, [unlockedAchievementIds]);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  return (
    <ScreenSurface variant="default" accentColor={COLORS.accentPrimary} contentStyle={styles.surface}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <SecondaryButton label="Back" arrow onPress={onBack} />

        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: moderateScale(compact ? FONT_SIZES.title : FONT_SIZES.display) }]}>
            Achievements
          </Text>
          <Text style={[styles.subtitle, { fontSize: moderateScale(FONT_SIZES.md) }]}>
            Your detective accomplishments
          </Text>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{unlockedAchievementIds.length}</Text>
            <Text style={styles.statLabel}>Unlocked</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{ACHIEVEMENT_COUNT}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.amberLight }]}>{earnedPoints}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Overall Progress</Text>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={[COLORS.amberLight, COLORS.amberGlow]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
        </View>

        {/* Achievement Categories */}
        {Object.entries(groupedAchievements).map(([category, data]) => (
          <View key={category} style={styles.categorySection}>
            <CategoryHeader
              category={category}
              count={data.total}
              unlockedCount={data.unlocked}
              expanded={expandedCategories[category]}
              onToggle={() => toggleCategory(category)}
            />
            {expandedCategories[category] && (
              <View style={styles.categoryContent}>
                {data.items.map((achievement) => {
                  const isUnlocked = unlockedAchievementIds.includes(achievement.id);
                  const details = achievementDetails[achievement.id] || {};
                  
                  // Skip hidden achievements that aren't unlocked
                  if (achievement.hidden && !isUnlocked) {
                    return (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        isUnlocked={false}
                        unlockedAt={null}
                        compact={compact}
                      />
                    );
                  }

                  return (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      isUnlocked={isUnlocked}
                      unlockedAt={details.unlockedAt}
                      compact={compact}
                    />
                  );
                })}
              </View>
            )}
          </View>
        ))}

        {/* Rarity Legend */}
        <View style={styles.legendSection}>
          <Text style={styles.legendTitle}>Rarity Guide</Text>
          <View style={styles.legendGrid}>
            {Object.entries(RARITY_CONFIG).map(([key, config]) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: config.color }]} />
                <Text style={[styles.legendText, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 100% Completion */}
        {progressPercent === 100 && (
          <View style={styles.completionBanner}>
            <Text style={styles.completionIcon}>🏆</Text>
            <Text style={styles.completionTitle}>Platinum Detective</Text>
            <Text style={styles.completionText}>
              You've unlocked every achievement. A true master of the craft.
            </Text>
          </View>
        )}
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
  header: {
    gap: SPACING.xs,
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(31, 27, 24, 0.9)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(157, 150, 141, 0.15)',
    padding: SPACING.lg,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCard: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statValue: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.title,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(157, 150, 141, 0.2)',
  },
  progressContainer: {
    gap: SPACING.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: FONTS.primarySemiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  progressPercent: {
    fontFamily: FONTS.monoBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.amberLight,
  },
  progressBar: {
    height: 10,
    backgroundColor: 'rgba(157, 150, 141, 0.2)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  categorySection: {
    gap: SPACING.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(31, 27, 24, 0.95)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(157, 150, 141, 0.15)',
  },
  categoryHeaderPressed: {
    opacity: 0.8,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categoryLabel: {
    fontFamily: FONTS.primaryBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categoryCount: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  categoryContent: {
    gap: SPACING.sm,
    paddingLeft: SPACING.xs,
  },
  achievementCard: {
    padding: SPACING.md,
    backgroundColor: 'rgba(31, 27, 24, 0.85)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  achievementCardUnlocked: {
    backgroundColor: 'rgba(40, 36, 32, 0.95)',
  },
  achievementCardLocked: {
    opacity: 0.7,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  achievementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  achievementIcon: {
    fontSize: 24,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.background,
    borderRadius: 7,
  },
  achievementInfo: {
    flex: 1,
    gap: 2,
  },
  achievementTitle: {
    fontFamily: FONTS.primaryBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  achievementTitleLocked: {
    color: COLORS.textMuted,
  },
  achievementDescription: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: LINE_HEIGHTS.tight,
  },
  achievementDescriptionLocked: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  achievementMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  pointsBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  pointsText: {
    fontFamily: FONTS.monoBold,
    fontSize: FONT_SIZES.sm,
  },
  rarityText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(157, 150, 141, 0.1)',
  },
  hintText: {
    flex: 1,
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  unlockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(123, 165, 141, 0.2)',
  },
  unlockedText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.successGreen,
  },
  legendSection: {
    padding: SPACING.md,
    backgroundColor: 'rgba(157, 150, 141, 0.08)',
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  legendTitle: {
    fontFamily: FONTS.primarySemiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
  },
  completionBanner: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: SPACING.sm,
  },
  completionIcon: {
    fontSize: 56,
  },
  completionTitle: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.xl,
    color: '#F59E0B',
    letterSpacing: 2,
  },
  completionText: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: LINE_HEIGHTS.relaxed,
  },
});
