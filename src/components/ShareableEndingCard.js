import React, { useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Share,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Path, Text as SvgText, G, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { getEndingById } from '../data/endingsData';

/**
 * Stats bar for the ending card
 */
function StatsBar({ stats, width }) {
  const maxValue = Math.max(...Object.values(stats), 1);
  const barHeight = 6;
  const labels = {
    chapters: 'Chapters',
    decisions: 'Decisions',
    attempts: 'Attempts',
  };

  return (
    <View style={styles.statsContainer}>
      {Object.entries(stats).map(([key, value]) => (
        <View key={key} style={styles.statRow}>
          <Text style={styles.statLabel}>{labels[key] || key}</Text>
          <View style={styles.statBarContainer}>
            <View 
              style={[
                styles.statBar, 
                { width: `${(value / maxValue) * 100}%` },
              ]} 
            />
          </View>
          <Text style={styles.statValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Visual Detective Profile Card for Sharing
 */
function DetectiveProfileCard({ 
  ending, 
  stats,
  playerName = 'Detective',
  completionDate,
  compact,
}) {
  if (!ending) return null;

  const formattedDate = completionDate 
    ? new Date(completionDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    : new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={['#1a1612', '#2a2420', '#1a1612']}
        style={styles.cardBackground}
      >
        {/* Noir texture overlay */}
        <View style={styles.noirOverlay} />
        
        {/* Case Closed Stamp */}
        <View style={styles.stampContainer}>
          <View style={styles.stamp}>
            <Text style={styles.stampText}>CASE CLOSED</Text>
          </View>
        </View>

        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.headerLabel}>DEAD LETTERS</Text>
          <Text style={styles.headerSubtitle}>Detective Profile</Text>
        </View>

        {/* Ending Icon & Title */}
        <View style={styles.endingSection}>
          <View style={[styles.endingIconContainer, { backgroundColor: ending.color + '30' }]}>
            <Text style={styles.endingIcon}>{ending.icon}</Text>
          </View>
          <Text style={styles.endingTitle}>{ending.title}</Text>
          <Text style={styles.endingSummary}>{ending.summary}</Text>
        </View>

        {/* Divider with ornament */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerOrnament}>◆</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Stats */}
        <StatsBar stats={stats} />

        {/* Path Badge */}
        <View style={styles.pathSection}>
          <View style={[
            styles.pathBadge,
            { 
              backgroundColor: ending.superPath === 'Aggressive' 
                ? 'rgba(212, 106, 93, 0.2)' 
                : 'rgba(111, 170, 213, 0.2)',
              borderColor: ending.superPath === 'Aggressive'
                ? COLORS.accentPrimary + '60'
                : COLORS.rainBlue + '60',
            }
          ]}>
            <Text style={[
              styles.pathText,
              { 
                color: ending.superPath === 'Aggressive' 
                  ? COLORS.accentPrimary 
                  : COLORS.rainBlue 
              }
            ]}>
              {ending.superPath} Path
            </Text>
          </View>
          <Text style={styles.pathKey}>Route: {ending.pathKey}</Text>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.footerDate}>{formattedDate}</Text>
          <Text style={styles.footerBrand}>detectiveportrait.app</Text>
        </View>

        {/* Corner ornaments */}
        <View style={[styles.cornerOrnament, styles.cornerTL]}>
          <Text style={styles.cornerText}>┌</Text>
        </View>
        <View style={[styles.cornerOrnament, styles.cornerTR]}>
          <Text style={styles.cornerText}>┐</Text>
        </View>
        <View style={[styles.cornerOrnament, styles.cornerBL]}>
          <Text style={styles.cornerText}>└</Text>
        </View>
        <View style={[styles.cornerOrnament, styles.cornerBR]}>
          <Text style={styles.cornerText}>┘</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

/**
 * Build shareable text message
 */
function buildShareText(ending, stats, completionDate) {
  const date = completionDate 
    ? new Date(completionDate).toLocaleDateString()
    : new Date().toLocaleDateString();

  return [
    `🕵️ DEAD LETTERS - CASE CLOSED`,
    ``,
    `${ending.icon} ${ending.title}`,
    `"${ending.summary}"`,
    ``,
    `📊 Stats:`,
    `• ${stats.chapters} Chapters`,
    `• ${stats.decisions} Decisions`,
    `• ${stats.attempts} Total Attempts`,
    ``,
    `🛤️ ${ending.superPath} Path (${ending.pathKey})`,
    ``,
    `📅 ${date}`,
    ``,
    `Can you discover all 16 endings?`,
    `https://detectiveportrait.app`,
  ].join('\n');
}

/**
 * ShareableEndingCard Component
 * 
 * Displays a visual "Detective Profile" card that can be shared
 * when completing an ending in Dead Letters.
 */
export default function ShareableEndingCard({
  endingId,
  stats = { chapters: 12, decisions: 11, attempts: 24 },
  completionDate,
  onShare,
  onClose,
  playerName = 'Detective',
}) {
  const { sizeClass, moderateScale, scaleSpacing } = useResponsiveLayout();
  const compact = sizeClass === 'xsmall' || sizeClass === 'small';

  const ending = useMemo(() => getEndingById(endingId), [endingId]);

  if (!ending) {
    return null;
  }

  const handleShare = async () => {
    const shareText = buildShareText(ending, stats, completionDate);
    
    try {
      const result = await Share.share({
        message: shareText,
        title: `Dead Letters - ${ending.title}`,
      });
      
      if (result.action === Share.sharedAction) {
        onShare?.({ success: true, ending, method: result.activityType });
      }
    } catch (error) {
      console.warn('Share failed:', error);
      onShare?.({ success: false, error });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Share Your Ending</Text>
        <Text style={styles.subtitle}>Show the world your detective skills</Text>
      </View>

      <DetectiveProfileCard
        ending={ending}
        stats={stats}
        playerName={playerName}
        completionDate={completionDate}
        compact={compact}
      />

      <View style={styles.actions}>
        <PrimaryButton
          label="Share Card"
          icon="📤"
          onPress={handleShare}
        />
        <SecondaryButton
          label="Close"
          onPress={onClose}
        />
      </View>

      <Text style={styles.hint}>
        Your ending card will be shared as text. Take a screenshot to share the visual card!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  title: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  cardContainer: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 15,
  },
  cardBackground: {
    padding: SPACING.xl,
    gap: SPACING.lg,
    position: 'relative',
  },
  noirOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    opacity: 0.3,
  },
  stampContainer: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    transform: [{ rotate: '12deg' }],
    zIndex: 10,
  },
  stamp: {
    borderWidth: 3,
    borderColor: '#b51c1c',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(181, 28, 28, 0.1)',
  },
  stampText: {
    fontFamily: FONTS.monoBold,
    fontSize: FONT_SIZES.sm,
    color: '#b51c1c',
    letterSpacing: 3,
  },
  cardHeader: {
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  headerLabel: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.amberLight,
    letterSpacing: 4,
  },
  headerSubtitle: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  endingSection: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  endingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  endingIcon: {
    fontSize: 40,
  },
  endingTitle: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.title,
    color: COLORS.textPrimary,
    letterSpacing: 2,
    textAlign: 'center',
  },
  endingSummary: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: LINE_HEIGHTS.cozy,
    paddingHorizontal: SPACING.md,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginVertical: SPACING.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(157, 150, 141, 0.3)',
  },
  dividerOrnament: {
    fontFamily: FONTS.secondary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.amberLight,
  },
  statsContainer: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statLabel: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    width: 70,
    letterSpacing: 0.5,
  },
  statBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(157, 150, 141, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  statBar: {
    height: '100%',
    backgroundColor: COLORS.amberLight,
    borderRadius: 3,
  },
  statValue: {
    fontFamily: FONTS.monoBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    width: 30,
    textAlign: 'right',
  },
  pathSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  pathBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  pathText: {
    fontFamily: FONTS.primarySemiBold,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 1,
  },
  pathKey: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(157, 150, 141, 0.2)',
  },
  footerDate: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  footerBrand: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.amberLight,
    letterSpacing: 1,
  },
  cornerOrnament: {
    position: 'absolute',
  },
  cornerTL: {
    top: 8,
    left: 8,
  },
  cornerTR: {
    top: 8,
    right: 8,
  },
  cornerBL: {
    bottom: 8,
    left: 8,
  },
  cornerBR: {
    bottom: 8,
    right: 8,
  },
  cornerText: {
    fontFamily: FONTS.mono,
    fontSize: 18,
    color: 'rgba(157, 150, 141, 0.4)',
  },
  actions: {
    gap: SPACING.sm,
  },
  hint: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
