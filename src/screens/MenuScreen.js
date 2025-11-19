import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

export default function MenuScreen({ onBack, onReplayTutorial, onShare }) {
  const handleShare = () => {
    onShare?.(SHARE_MESSAGE);
  };

  return (
    <ScreenSurface variant="default" accentColor={COLORS.accentPrimary} contentStyle={styles.surface}>
      <View style={styles.container}>
        <SecondaryButton label="Back" arrow onPress={onBack} />

        <Text style={styles.title}>Menu</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Detective Portrait</Text>
          <Text style={styles.body}>
            Detective Portrait is a three-minute daily ritual. Solve one noir word case each day, follow the conspiracy,
            and return to the desk tomorrow. When the city sleeps, dive into the Story Campaign and work all fourteen cases in a single sitting.
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
          <Text style={styles.sectionTitle}>Share Detective Portrait</Text>
          <Text style={styles.body}>
            Invite a fellow detective. Your daily ritual becomes stronger when the case board grows.
          </Text>
          <PrimaryButton label="Share the Game" onPress={handleShare} />
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
});
