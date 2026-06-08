import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import ScreenSurface from '../components/ScreenSurface';
import SecondaryButton from '../components/SecondaryButton';
import PrimaryButton from '../components/PrimaryButton';
import Stagger from '../components/motion/Stagger';
import { useGame } from '../context/GameContext';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

const SHARE_MESSAGE = [
  'Dead Letters',
  'Map a hidden reality beneath Ashport.',
  'Read the letters, sense anomalies, and seal what you believe.',
  'https://deadletters.app/game',
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
  const game = useGame();
  const reducedMotion = !!game?.progress?.settings?.reducedMotion;
  const handleShare = () => {
    onShare?.(SHARE_MESSAGE);
  };

  return (
    <ScreenSurface variant="default" accentColor={COLORS.accentPrimary} contentStyle={styles.surface}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <SecondaryButton label="Back" arrow onPress={onBack} />

        <Stagger reducedMotion={reducedMotion} distance={14}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>FIELD MANUAL</Text>
          <Text style={styles.title}>MENU</Text>
        </View>

        {/* Replayability Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="trophy" size={18} color={COLORS.amberLight} /> Under-Map Records
          </Text>
          <Text style={styles.body}>
            Track mapped truths, belief outcomes, endings, and replay branches from key thresholds.
          </Text>
          
          <View style={styles.featureButtons}>
            <SecondaryButton 
              label={`Ending Gallery (${endingsCount})`}
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
            Dead Letters is a branching sci-fi mystery about mapping a hidden layer of Ashport. Read the letters, collect impossible fragments, connect them on the Under-Map, and commit beliefs the story can bear out or subvert.
          </Text>
          <Text style={styles.body}>Version 1.0.0 - Season 1: The Under-Map</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Need a refresher?</Text>
          <Text style={styles.body}>
            Read carefully. Tap colored anomalies to pin fragments, connect related fragments to surface truths, then seal the belief Ashport will test.
          </Text>
          <PrimaryButton label="Replay Tutorial" onPress={onReplayTutorial} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share Dead Letters</Text>
          <Text style={styles.body}>
            Invite another reader. Every map of Ashport tells a different truth.
          </Text>
          <PrimaryButton label="Share the Game" onPress={handleShare} />
        </View>
        </Stagger>
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
  titleBlock: { gap: 2 },
  eyebrow: { fontFamily: FONTS.monoBold, fontSize: FONT_SIZES.xs, letterSpacing: 4, color: COLORS.accentSecondary, textTransform: 'uppercase' },
  title: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.display,
    color: COLORS.offWhite,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  section: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderColor: COLORS.panelOutline,
    borderLeftColor: COLORS.accentSecondary,
    backgroundColor: 'rgba(0,0,0,0.28)',
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accentSecondary,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
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
