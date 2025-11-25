import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

import ScreenSurface from '../components/ScreenSurface';
import SecondaryButton from '../components/SecondaryButton';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { ENDINGS_LIST, ENDING_COUNT, SILHOUETTE_PATHS } from '../data/endingsData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Ending Card Component - Shows locked silhouette or unlocked ending
 */
function EndingCard({ ending, isUnlocked, discoveredAt, onPress, cardSize, compact }) {
  const rarityColors = {
    common: COLORS.fogGray,
    uncommon: COLORS.successGreen,
    rare: COLORS.rainBlue,
    legendary: COLORS.amberLight,
  };

  const cardContent = isUnlocked ? (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        styles.cardUnlocked,
        { width: cardSize, height: cardSize * 1.3 },
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress?.(ending)}
    >
      <LinearGradient
        colors={[ending.color + '40', ending.color + '20', 'rgba(0,0,0,0.3)']}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardIconContainer}>
          <Text style={[styles.cardIcon, { fontSize: compact ? 28 : 36 }]}>
            {ending.icon}
          </Text>
        </View>
        <Text
          style={[
            styles.cardTitle,
            { fontSize: compact ? FONT_SIZES.xs : FONT_SIZES.sm },
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {ending.title}
        </Text>
        <View style={styles.cardFooter}>
          <MaterialCommunityIcons
            name="check-circle"
            size={compact ? 12 : 14}
            color={COLORS.successGreen}
          />
          {discoveredAt && (
            <Text style={[styles.cardDate, { fontSize: compact ? 8 : 10 }]}>
              {new Date(discoveredAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  ) : (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        styles.cardLocked,
        { width: cardSize, height: cardSize * 1.3 },
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress?.(ending)}
    >
      <View style={styles.cardLockedInner}>
        <View style={styles.silhouetteContainer}>
          <Svg
            width={compact ? 32 : 44}
            height={compact ? 32 : 44}
            viewBox="0 0 24 24"
          >
            <Path
              d={SILHOUETTE_PATHS[ending.silhouette] || SILHOUETTE_PATHS.crown}
              fill="rgba(157, 150, 141, 0.3)"
            />
          </Svg>
        </View>
        <MaterialCommunityIcons
          name="lock"
          size={compact ? 16 : 20}
          color="rgba(157, 150, 141, 0.5)"
          style={styles.lockIcon}
        />
        <Text
          style={[
            styles.cardHint,
            { fontSize: compact ? 8 : 9 },
          ]}
          numberOfLines={2}
        >
          {ending.hint}
        </Text>
      </View>
    </Pressable>
  );

  return cardContent;
}

/**
 * Ending Detail Modal Content
 */
function EndingDetailView({ ending, isUnlocked, discoveredAt, onClose, compact }) {
  if (!ending) return null;

  return (
    <View style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <SecondaryButton label="Back" arrow onPress={onClose} />
      </View>

      <View style={[styles.detailCard, { borderColor: isUnlocked ? ending.color + '60' : COLORS.panelOutline }]}>
        <LinearGradient
          colors={isUnlocked 
            ? [ending.color + '30', 'rgba(31, 27, 24, 0.95)']
            : ['rgba(40, 36, 32, 0.95)', 'rgba(31, 27, 24, 0.95)']}
          style={styles.detailGradient}
        >
          <View style={styles.detailIconRow}>
            <Text style={styles.detailIcon}>{isUnlocked ? ending.icon : '❓'}</Text>
            <View style={styles.detailBadges}>
              <View style={[styles.pathBadge, { backgroundColor: ending.superPath === 'Aggressive' ? 'rgba(212, 106, 93, 0.2)' : 'rgba(111, 170, 213, 0.2)' }]}>
                <Text style={[styles.pathBadgeText, { color: ending.superPath === 'Aggressive' ? COLORS.accentPrimary : COLORS.rainBlue }]}>
                  {ending.superPath}
                </Text>
              </View>
              {isUnlocked && (
                <View style={styles.unlockedBadge}>
                  <MaterialCommunityIcons name="check-decagram" size={14} color={COLORS.successGreen} />
                  <Text style={styles.unlockedBadgeText}>Discovered</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.detailTitle}>
            {isUnlocked ? ending.title : 'Unknown Ending'}
          </Text>

          <Text style={styles.detailSummary}>
            {isUnlocked ? ending.summary : ending.hint}
          </Text>

          {isUnlocked && (
            <>
              <View style={styles.detailDivider} />
              <Text style={styles.detailDescription}>
                {ending.fullDescription}
              </Text>
              {discoveredAt && (
                <Text style={styles.detailDate}>
                  Discovered: {new Date(discoveredAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              )}
            </>
          )}

          {!isUnlocked && (
            <View style={styles.lockedHintContainer}>
              <MaterialCommunityIcons name="lightbulb-outline" size={18} color={COLORS.amberLight} />
              <Text style={styles.lockedHintText}>
                {ending.hint}
              </Text>
            </View>
          )}
        </LinearGradient>
      </View>
    </View>
  );
}

export default function EndingGalleryScreen({
  unlockedEndingIds = [],
  endingDetails = {},
  onBack,
  onSelectEnding,
}) {
  const { sizeClass, width, moderateScale, scaleSpacing } = useResponsiveLayout();
  const compact = sizeClass === 'xsmall' || sizeClass === 'small';

  const [selectedEnding, setSelectedEnding] = React.useState(null);

  // Calculate card size for 4x4 grid
  const gridPadding = scaleSpacing(SPACING.md);
  const gridGap = scaleSpacing(compact ? SPACING.xs : SPACING.sm);
  const availableWidth = width - gridPadding * 2;
  const cardSize = Math.floor((availableWidth - gridGap * 3) / 4);

  // Prepare endings with unlock status
  const enrichedEndings = useMemo(() => {
    return ENDINGS_LIST.map((ending) => ({
      ...ending,
      isUnlocked: unlockedEndingIds.includes(ending.id),
      discoveredAt: endingDetails[ending.id]?.unlockedAt || null,
    }));
  }, [unlockedEndingIds, endingDetails]);

  // Stats
  const unlockedCount = unlockedEndingIds.length;
  const progressPercent = Math.round((unlockedCount / ENDING_COUNT) * 100);

  const handleCardPress = (ending) => {
    setSelectedEnding(ending);
  };

  const handleCloseDetail = () => {
    setSelectedEnding(null);
  };

  if (selectedEnding) {
    const isUnlocked = unlockedEndingIds.includes(selectedEnding.id);
    const discoveredAt = endingDetails[selectedEnding.id]?.unlockedAt;
    return (
      <ScreenSurface variant="default" accentColor={COLORS.accentPrimary}>
        <EndingDetailView
          ending={selectedEnding}
          isUnlocked={isUnlocked}
          discoveredAt={discoveredAt}
          onClose={handleCloseDetail}
          compact={compact}
        />
      </ScreenSurface>
    );
  }

  return (
    <ScreenSurface variant="default" accentColor={COLORS.accentPrimary} contentStyle={styles.surface}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: gridPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <SecondaryButton label="Back" arrow onPress={onBack} />

        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: moderateScale(compact ? FONT_SIZES.title : FONT_SIZES.display) }]}>
            Ending Gallery
          </Text>
          <Text style={[styles.subtitle, { fontSize: moderateScale(FONT_SIZES.md) }]}>
            Season 1: The Vanishing
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={[COLORS.amberLight, COLORS.amberGlow]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {unlockedCount}/{ENDING_COUNT} Endings Discovered
          </Text>
        </View>

        {/* 4x4 Grid */}
        <View style={[styles.grid, { gap: gridGap }]}>
          {enrichedEndings.map((ending) => (
            <EndingCard
              key={ending.id}
              ending={ending}
              isUnlocked={ending.isUnlocked}
              discoveredAt={ending.discoveredAt}
              onPress={handleCardPress}
              cardSize={cardSize}
              compact={compact}
            />
          ))}
        </View>

        {/* Hint Section */}
        {unlockedCount < ENDING_COUNT && (
          <View style={styles.hintSection}>
            <MaterialCommunityIcons name="information-outline" size={18} color={COLORS.textMuted} />
            <Text style={styles.hintText}>
              Tap any card to see hints for discovering new endings. Your choices in the story campaign determine which endings you can reach.
            </Text>
          </View>
        )}

        {/* Completionist Message */}
        {unlockedCount === ENDING_COUNT && (
          <View style={styles.completionSection}>
            <Text style={styles.completionIcon}>🏆</Text>
            <Text style={styles.completionTitle}>Completionist!</Text>
            <Text style={styles.completionText}>
              You've discovered all 16 endings. Every path has been walked, every truth revealed.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  surface: {
    paddingHorizontal: 0,
  },
  container: {
    flexGrow: 1,
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
  progressContainer: {
    gap: SPACING.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(157, 150, 141, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  cardUnlocked: {
    borderWidth: 1,
    borderColor: 'rgba(241, 197, 114, 0.3)',
  },
  cardLocked: {
    borderWidth: 1,
    borderColor: 'rgba(157, 150, 141, 0.2)',
    backgroundColor: 'rgba(31, 27, 24, 0.8)',
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  cardGradient: {
    flex: 1,
    padding: SPACING.sm,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 36,
  },
  cardTitle: {
    fontFamily: FONTS.primarySemiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  cardDate: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  cardLockedInner: {
    flex: 1,
    padding: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  silhouetteContainer: {
    opacity: 0.6,
  },
  lockIcon: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
  },
  cardHint: {
    fontFamily: FONTS.primary,
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  hintSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: 'rgba(157, 150, 141, 0.08)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(157, 150, 141, 0.15)',
  },
  hintText: {
    flex: 1,
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    lineHeight: LINE_HEIGHTS.cozy,
  },
  completionSection: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: 'rgba(241, 197, 114, 0.1)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(241, 197, 114, 0.3)',
    gap: SPACING.sm,
  },
  completionIcon: {
    fontSize: 48,
  },
  completionTitle: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.amberLight,
    letterSpacing: 2,
  },
  completionText: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: LINE_HEIGHTS.relaxed,
  },
  // Detail View Styles
  detailContainer: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  detailHeader: {
    flexDirection: 'row',
  },
  detailCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailGradient: {
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  detailIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailIcon: {
    fontSize: 56,
  },
  detailBadges: {
    gap: SPACING.xs,
    alignItems: 'flex-end',
  },
  pathBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  pathBadgeText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(123, 165, 141, 0.15)',
    borderRadius: RADIUS.sm,
  },
  unlockedBadgeText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.successGreen,
    letterSpacing: 1,
  },
  detailTitle: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.title,
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  detailSummary: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    lineHeight: LINE_HEIGHTS.relaxed,
    fontStyle: 'italic',
  },
  detailDivider: {
    height: 1,
    backgroundColor: 'rgba(157, 150, 141, 0.2)',
    marginVertical: SPACING.sm,
  },
  detailDescription: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: LINE_HEIGHTS.relaxed,
  },
  detailDate: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  lockedHintContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: 'rgba(241, 197, 114, 0.1)',
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  lockedHintText: {
    flex: 1,
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    color: COLORS.amberLight,
    lineHeight: LINE_HEIGHTS.cozy,
    fontStyle: 'italic',
  },
});
