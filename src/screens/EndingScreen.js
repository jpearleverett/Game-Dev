import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenSurface from '../components/ScreenSurface';
import PrimaryButton from '../components/PrimaryButton';
import DustLayer from '../components/DustLayer';
import Celebration from '../components/Celebration';
import Stagger from '../components/motion/Stagger';
import Reveal from '../components/motion/Reveal';
import { useGame } from '../context/GameContext';
import { normalizeUnderMap } from '../data/underMap';
import { selectEnding } from '../data/endings';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

/**
 * The campaign finale (Move 3, §5). The Under-Map's clarity spectrum decides
 * which terminal scene the player reaches. Params may carry a pre-selected
 * ending (from TheoryScreen) or we derive it from the live map.
 */
export default function EndingScreen({ navigation, route }) {
  const game = useGame();
  const { progress } = game;
  const reducedMotion = !!progress?.settings?.reducedMotion;

  const ending = useMemo(() => {
    if (route?.params?.ending) return route.params.ending;
    return selectEnding(normalizeUnderMap(progress?.storyCampaign?.underMap));
  }, [route?.params?.ending, progress?.storyCampaign?.underMap]);

  const cl = ending?.clarity || { resolved: 0, correct: 0, ratio: 0 };

  const goHome = () => {
    // Back to the Desk (the campaign hub).
    navigation.reset({ index: 0, routes: [{ name: 'Desk' }] });
  };

  return (
    <ScreenSurface variant="default">
      {!reducedMotion ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}><DustLayer /></View>
      ) : null}

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Reveal reducedMotion={reducedMotion} distance={16} duration={520}>
          <View style={styles.kickerRow}>
            <MaterialCommunityIcons name="map-marker-check-outline" size={18} color={COLORS.accentSecondary} />
            <Text style={styles.kicker}>{ending?.kicker || 'THE THRESHOLD'} · THE UNDER-MAP</Text>
          </View>
          <Text style={styles.title}>{ending?.title || 'The Threshold'}</Text>
        </Reveal>

        {cl.resolved > 0 ? (
          <Reveal reducedMotion={reducedMotion} index={1} distance={12}>
            <View style={styles.clarityCard}>
              <MaterialCommunityIcons name="eye-outline" size={15} color={COLORS.accentSecondary} />
              <Text style={styles.clarityText}>
                You read the hidden world true {cl.correct} of {cl.resolved} times — {Math.round(cl.ratio * 100)}% clarity.
              </Text>
            </View>
          </Reveal>
        ) : null}

        <View style={styles.prose}>
          <Stagger reducedMotion={reducedMotion} delay={420} distance={14}>
            {(ending?.body || []).map((p, i) => (
              <Text key={i} style={styles.para}>{p}</Text>
            ))}
            {ending?.flavorLine ? <Text style={styles.flavor}>{ending.flavorLine}</Text> : null}
          </Stagger>
        </View>
      </ScrollView>

      {/* The Clear-Eyed ("true") ending earns a restrained ink-fleck burst. */}
      <Celebration active={ending?.variant === 'clear'} reducedMotion={reducedMotion} count={70} />

      <View style={styles.footer}>
        <PrimaryButton
          label="Close the file"
          onPress={goHome}
          icon={<MaterialCommunityIcons name="book-check-outline" size={18} color={COLORS.textSecondary} />}
        />
      </View>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  body: { paddingVertical: SPACING.xl, paddingBottom: SPACING.xxl },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  kicker: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.xs, letterSpacing: 3, color: COLORS.accentSecondary },
  title: { fontFamily: FONTS.secondaryBold, fontSize: FONT_SIZES.title, color: COLORS.offWhite, marginTop: SPACING.sm },
  clarityCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.lg,
    backgroundColor: 'rgba(241,197,114,0.07)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accentSoft, padding: SPACING.md,
  },
  clarityText: { flex: 1, fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.offWhite, lineHeight: LINE_HEIGHTS.cozy },
  prose: { marginTop: SPACING.xl, gap: SPACING.md },
  para: { fontFamily: FONTS.secondary, fontSize: FONT_SIZES.md, color: COLORS.offWhite, lineHeight: LINE_HEIGHTS.relaxed },
  flavor: { fontFamily: FONTS.secondary, fontStyle: 'italic', fontSize: FONT_SIZES.md, color: COLORS.amberLight || COLORS.accentSecondary, lineHeight: LINE_HEIGHTS.relaxed, marginTop: SPACING.sm },
  footer: { paddingTop: SPACING.md, paddingBottom: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.panelOutline },
});
