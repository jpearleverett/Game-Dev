import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Line, Circle, Path } from 'react-native-svg';

import ScreenSurface from '../components/ScreenSurface';
import SecondaryButton from '../components/SecondaryButton';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

// Chapter data with branching info
const CHAPTERS = [
  { chapter: 1, title: 'The Beginning', branches: ['ROOT'], isBranch: false },
  { chapter: 2, title: 'First Steps', branches: ['A', 'B'], isBranch: true },
  { chapter: 3, title: 'Crossroads', branches: ['AA', 'AB', 'BA', 'BB'], isBranch: true },
  { chapter: 4, title: 'The Turn', branches: ['A', 'M'], isBranch: true, superPathSplit: true },
  { chapter: 5, title: 'Commitment', branches: ['AF', 'AS', 'MA', 'ML'], isBranch: true },
  { chapter: 6, title: 'Consequences', branches: ['AFL', 'AFV', 'ASL', 'ASR', 'MAC', 'MAV', 'MLE', 'MLI'], isBranch: true },
  { chapter: 7, title: 'Point of No Return', branches: ['*'], isBranch: true, many: true },
  { chapter: 8, title: 'The Reckoning', branches: ['*'], isBranch: true, many: true },
  { chapter: 9, title: 'Convergence', branches: ['A', 'M'], isBranch: true },
  { chapter: 10, title: 'The Choice', branches: ['AA', 'AP', 'MA', 'MP'], isBranch: true },
  { chapter: 11, title: 'Aftermath', branches: ['AAE', 'APE', 'MAF', 'MPJ'], isBranch: true },
  { chapter: 12, title: 'Endings', branches: ['*'], isBranch: true, many: true, isEnding: true },
];

/**
 * Timeline Node Component
 */
function TimelineNode({ 
  chapter, 
  isCompleted, 
  isCurrent, 
  isLocked, 
  pathKey,
  onSelect,
  compact,
  nodeSize,
}) {
  const nodeColor = isCompleted 
    ? COLORS.successGreen 
    : isCurrent 
      ? COLORS.amberLight 
      : COLORS.fogGray;

  const pathColor = pathKey?.startsWith('A') || pathKey === 'ROOT'
    ? COLORS.accentPrimary
    : COLORS.rainBlue;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.node,
        { width: nodeSize, height: nodeSize },
        pressed && !isLocked && styles.nodePressed,
        isLocked && styles.nodeLocked,
      ]}
      onPress={() => !isLocked && onSelect?.(chapter)}
      disabled={isLocked}
    >
      <View
        style={[
          styles.nodeCircle,
          {
            width: nodeSize - 8,
            height: nodeSize - 8,
            borderRadius: (nodeSize - 8) / 2,
            borderColor: nodeColor,
            backgroundColor: isCompleted 
              ? nodeColor + '30'
              : isCurrent 
                ? nodeColor + '20'
                : 'transparent',
          },
        ]}
      >
        {isCompleted && (
          <MaterialCommunityIcons 
            name="check" 
            size={compact ? 14 : 18} 
            color={nodeColor} 
          />
        )}
        {isCurrent && !isCompleted && (
          <View style={[styles.currentDot, { backgroundColor: nodeColor }]} />
        )}
        {isLocked && (
          <MaterialCommunityIcons 
            name="lock" 
            size={compact ? 12 : 14} 
            color={COLORS.textMuted} 
          />
        )}
      </View>
      {chapter.isBranch && (
        <View style={[styles.branchIndicator, { backgroundColor: pathColor + '40' }]}>
          <MaterialCommunityIcons 
            name="source-branch" 
            size={10} 
            color={pathColor} 
          />
        </View>
      )}
    </Pressable>
  );
}

/**
 * Chapter Card Component
 */
function ChapterCard({
  chapter,
  isCompleted,
  isCurrent,
  isLocked,
  pathKey,
  onSelect,
  compact,
}) {
  const statusColor = isCompleted 
    ? COLORS.successGreen 
    : isCurrent 
      ? COLORS.amberLight 
      : COLORS.textMuted;

  const handleSelect = () => {
    if (isLocked) {
      Alert.alert(
        'Chapter Locked',
        'Complete the story campaign at least once to unlock chapter select.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isCompleted && !isCurrent) {
      Alert.alert(
        'Not Yet Reached',
        'You haven\'t reached this chapter in your current playthrough yet.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      `Start from Chapter ${chapter.chapter}?`,
      'This will create a new playthrough branch from this point. Your current progress will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Here', 
          onPress: () => onSelect?.(chapter),
        },
      ]
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chapterCard,
        isCompleted && styles.chapterCardCompleted,
        isCurrent && styles.chapterCardCurrent,
        isLocked && styles.chapterCardLocked,
        pressed && styles.chapterCardPressed,
      ]}
      onPress={handleSelect}
    >
      <View style={styles.chapterHeader}>
        <View style={styles.chapterNumberContainer}>
          <Text style={[styles.chapterNumber, { color: statusColor }]}>
            {chapter.chapter}
          </Text>
        </View>
        <View style={styles.chapterInfo}>
          <Text style={styles.chapterTitle}>{chapter.title}</Text>
          <Text style={[styles.chapterStatus, { color: statusColor }]}>
            {isLocked ? 'Locked' : isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Available'}
          </Text>
        </View>
        {chapter.isBranch && !chapter.many && (
          <View style={styles.branchBadge}>
            <MaterialCommunityIcons 
              name="source-branch" 
              size={14} 
              color={COLORS.rainBlue} 
            />
            <Text style={styles.branchCount}>{chapter.branches.length}</Text>
          </View>
        )}
        {chapter.isEnding && (
          <View style={[styles.branchBadge, styles.endingBadge]}>
            <MaterialCommunityIcons 
              name="flag-checkered" 
              size={14} 
              color={COLORS.amberLight} 
            />
          </View>
        )}
      </View>

      {pathKey && isCompleted && (
        <View style={styles.pathRow}>
          <Text style={styles.pathLabel}>Path taken:</Text>
          <View style={[
            styles.pathTag,
            { backgroundColor: pathKey.startsWith('A') ? COLORS.accentSoft : 'rgba(111, 170, 213, 0.2)' }
          ]}>
            <Text style={[
              styles.pathTagText,
              { color: pathKey.startsWith('A') ? COLORS.accentPrimary : COLORS.rainBlue }
            ]}>
              {pathKey}
            </Text>
          </View>
        </View>
      )}

      {chapter.superPathSplit && (
        <View style={styles.superPathInfo}>
          <Text style={styles.superPathText}>
            ⚡ Super-path split: Aggressive vs Methodical
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function ChapterSelectScreen({
  storyCampaign,
  checkpoints = [],
  isUnlocked = false,
  onSelectChapter,
  onBack,
}) {
  const { sizeClass, moderateScale, scaleSpacing } = useResponsiveLayout();
  const compact = sizeClass === 'xsmall' || sizeClass === 'small';

  // Prepare chapter data with completion status
  const enrichedChapters = useMemo(() => {
    const currentChapter = storyCampaign?.chapter || 1;
    const pathHistory = storyCampaign?.pathHistory || {};
    const completedCases = storyCampaign?.completedCaseNumbers || [];

    return CHAPTERS.map((chapter) => {
      const isCompleted = chapter.chapter < currentChapter || 
        (storyCampaign?.completed && chapter.chapter <= currentChapter);
      const isCurrent = chapter.chapter === currentChapter;
      const pathKey = pathHistory[chapter.chapter] || null;

      return {
        ...chapter,
        isCompleted,
        isCurrent,
        isLocked: !isUnlocked,
        pathKey,
      };
    });
  }, [storyCampaign, isUnlocked]);

  const nodeSize = compact ? 44 : 56;

  return (
    <ScreenSurface variant="default" accentColor={COLORS.accentPrimary} contentStyle={styles.surface}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <SecondaryButton label="Back" arrow onPress={onBack} />

        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: moderateScale(compact ? FONT_SIZES.title : FONT_SIZES.display) }]}>
            Chapter Select
          </Text>
          <Text style={[styles.subtitle, { fontSize: moderateScale(FONT_SIZES.md) }]}>
            Jump to key decision points
          </Text>
        </View>

        {!isUnlocked && (
          <View style={styles.lockedBanner}>
            <MaterialCommunityIcons name="lock" size={24} color={COLORS.amberLight} />
            <View style={styles.lockedBannerText}>
              <Text style={styles.lockedTitle}>Chapter Select Locked</Text>
              <Text style={styles.lockedDescription}>
                Complete the story campaign at least once to unlock the ability to replay from any chapter.
              </Text>
            </View>
          </View>
        )}

        {/* Timeline Visualization */}
        <View style={styles.timeline}>
          <View style={styles.timelineLine} />
          <View style={styles.timelineNodes}>
            {enrichedChapters.map((chapter, index) => (
              <View key={chapter.chapter} style={styles.timelineNodeWrapper}>
                <TimelineNode
                  chapter={chapter}
                  isCompleted={chapter.isCompleted}
                  isCurrent={chapter.isCurrent}
                  isLocked={chapter.isLocked}
                  pathKey={chapter.pathKey}
                  onSelect={onSelectChapter}
                  compact={compact}
                  nodeSize={nodeSize}
                />
                {index < enrichedChapters.length - 1 && (
                  <View 
                    style={[
                      styles.timelineConnector,
                      chapter.isCompleted && styles.timelineConnectorCompleted,
                    ]} 
                  />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Chapter Cards */}
        <View style={styles.chapterList}>
          {enrichedChapters.map((chapter) => (
            <ChapterCard
              key={chapter.chapter}
              chapter={chapter}
              isCompleted={chapter.isCompleted}
              isCurrent={chapter.isCurrent}
              isLocked={chapter.isLocked}
              pathKey={chapter.pathKey}
              onSelect={onSelectChapter}
              compact={compact}
            />
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.successGreen }]} />
              <Text style={styles.legendText}>Completed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.amberLight }]} />
              <Text style={styles.legendText}>Current</Text>
            </View>
            <View style={styles.legendItem}>
              <MaterialCommunityIcons name="source-branch" size={14} color={COLORS.rainBlue} />
              <Text style={styles.legendText}>Branch Point</Text>
            </View>
            <View style={styles.legendItem}>
              <MaterialCommunityIcons name="flag-checkered" size={14} color={COLORS.amberLight} />
              <Text style={styles.legendText}>Endings</Text>
            </View>
          </View>
        </View>

        {/* Warning */}
        <View style={styles.warningBox}>
          <MaterialCommunityIcons name="alert-outline" size={18} color={COLORS.amberLight} />
          <Text style={styles.warningText}>
            Starting from a previous chapter will create a new playthrough branch. Your original progress is preserved in the Ending Gallery.
          </Text>
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
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: 'rgba(241, 197, 114, 0.1)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(241, 197, 114, 0.3)',
  },
  lockedBannerText: {
    flex: 1,
    gap: SPACING.xs,
  },
  lockedTitle: {
    fontFamily: FONTS.primaryBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.amberLight,
  },
  lockedDescription: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: LINE_HEIGHTS.cozy,
  },
  timeline: {
    position: 'relative',
    paddingVertical: SPACING.md,
  },
  timelineLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(157, 150, 141, 0.3)',
    marginLeft: -1,
  },
  timelineNodes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  timelineNodeWrapper: {
    alignItems: 'center',
  },
  timelineConnector: {
    width: 20,
    height: 2,
    backgroundColor: 'rgba(157, 150, 141, 0.3)',
    marginTop: -20,
  },
  timelineConnectorCompleted: {
    backgroundColor: COLORS.successGreen + '60',
  },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCircle: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodePressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  nodeLocked: {
    opacity: 0.5,
  },
  currentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  branchIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterList: {
    gap: SPACING.md,
  },
  chapterCard: {
    padding: SPACING.lg,
    backgroundColor: 'rgba(31, 27, 24, 0.9)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(157, 150, 141, 0.15)',
    gap: SPACING.sm,
  },
  chapterCardCompleted: {
    borderColor: 'rgba(123, 165, 141, 0.3)',
  },
  chapterCardCurrent: {
    borderColor: 'rgba(241, 197, 114, 0.4)',
    backgroundColor: 'rgba(241, 197, 114, 0.05)',
  },
  chapterCardLocked: {
    opacity: 0.6,
  },
  chapterCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  chapterNumberContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(157, 150, 141, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNumber: {
    fontFamily: FONTS.monoBold,
    fontSize: FONT_SIZES.lg,
  },
  chapterInfo: {
    flex: 1,
    gap: 2,
  },
  chapterTitle: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  chapterStatus: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  branchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(111, 170, 213, 0.15)',
    borderRadius: RADIUS.sm,
  },
  endingBadge: {
    backgroundColor: 'rgba(241, 197, 114, 0.15)',
  },
  branchCount: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.rainBlue,
  },
  pathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pathLabel: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  pathTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  pathTagText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1,
  },
  superPathInfo: {
    paddingTop: SPACING.xs,
  },
  superPathText: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.amberLight,
    fontStyle: 'italic',
  },
  legend: {
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
  legendItems: {
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
    color: COLORS.textSecondary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: 'rgba(241, 197, 114, 0.08)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(241, 197, 114, 0.2)',
  },
  warningText: {
    flex: 1,
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    lineHeight: LINE_HEIGHTS.cozy,
  },
});
