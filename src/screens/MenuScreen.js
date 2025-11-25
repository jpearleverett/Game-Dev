import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import ScreenSurface from '../components/ScreenSurface';
import SecondaryButton from '../components/SecondaryButton';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

const SHARE_MESSAGE = [
  'Detective Portrait',
  'A daily noir deduction ritual.',
  'Play today and solve the conspiracy.',
  'https://detectiveportrait.example/game',
].join('\n');

export default function MenuScreen({ 
  onBack, 
  onReplayTutorial, 
  onShare,
  onOpenEndingGallery,
  onOpenAchievements,
  onOpenChapterSelect,
  hasCompletedStory = false,
  endingsCount = 0,
  achievementsCount = 0,
  totalAchievements = 30,
}) {
  const handleShare = () => {
    onShare?.(SHARE_MESSAGE);
  };

  return (
    <ScreenSurface variant="default" accentColor={COLORS.accentPrimary} contentStyle={styles.surface}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <SecondaryButton label="Back" arrow onPress={onBack} />

        <Text style={styles.title}>Menu</Text>

        {/* Replayability Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="trophy" size={18} color={COLORS.amberLight} /> Case Archives
          </Text>
          <Text style={styles.body}>
            Track your progress, discover all endings, and replay from key decision points.
          </Text>
          
          <View style={styles.featureButtons}>
            <SecondaryButton 
              label={`Ending Gallery (${endingsCount}/16)`}
              icon={<MaterialCommunityIcons name="view-grid" size={16} color={COLORS.textSecondary} />}
              onPress={onOpenEndingGallery}
              style={styles.featureButton}
            />
            
            <SecondaryButton 
              label={`Achievements (${achievementsCount}/${totalAchievements})`}
              icon={<MaterialCommunityIcons name="medal" size={16} color={COLORS.textSecondary} />}
              onPress={onOpenAchievements}
              style={styles.featureButton}
            />
            
            <SecondaryButton 
              label={hasCompletedStory ? "Chapter Select" : "Chapter Select 🔒"}
              icon={<MaterialCommunityIcons name="source-branch" size={16} color={COLORS.textSecondary} />}
              onPress={onOpenChapterSelect}
              style={styles.featureButton}
              disabled={!hasCompletedStory}
            />
          </View>
          
          {!hasCompletedStory && (
            <Text style={styles.hint}>
              Complete the story campaign to unlock Chapter Select for replays.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Dead Letters</Text>
          <Text style={styles.body}>
            Dead Letters is a three-minute daily ritual. Solve one noir word case each day, follow the conspiracy,
            and return to the desk tomorrow. When the city sleeps, dive into the Story Campaign and discover 16 unique endings.
          </Text>
          <Text style={styles.body}>Version 1.0.0 - Season 1: The Vanishing</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Need a refresher?</Text>
          <Text style={styles.body}>
            Study the evidence. Select the outliers. Submit guesses to confirm what does not belong. Four attempts, three outliers, one truth.
          </Text>
          <PrimaryButton label="Replay Tutorial" onPress={onReplayTutorial} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share Dead Letters</Text>
          <Text style={styles.body}>
            Invite a fellow detective. Your daily ritual becomes stronger when the case board grows.
          </Text>
          <PrimaryButton label="Share the Game" onPress={handleShare} />
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
      gap: SPACING.xl,
    },
  title: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.display,
    color: COLORS.textPrimary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  section: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.panelOutline,
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  body: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.relaxed,
    color: COLORS.textSecondary,
  },
  featureButtons: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  featureButton: {
    alignSelf: 'stretch',
  },
  hint: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
});
