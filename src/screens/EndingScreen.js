import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenSurface from '../components/ScreenSurface';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import DustLayer from '../components/DustLayer';
import Celebration from '../components/Celebration';
import Stagger from '../components/motion/Stagger';
import Reveal from '../components/motion/Reveal';
import ShareCard from '../components/ShareCard';
import { useGame } from '../context/GameContext';
import { normalizeUnderMap } from '../data/underMap';
import { selectEnding, closingReport } from '../data/endings';
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
  const map = useMemo(() => normalizeUnderMap(progress?.storyCampaign?.underMap), [progress?.storyCampaign?.underMap]);
  // The CLOSING REPORT: the player's own run, line by line — the artifact.
  const report = useMemo(() => closingReport(map, ending), [map, ending]);
  const [sharing, setSharing] = useState(false);

  const goHome = () => {
    // Back to the Desk (the campaign hub).
    navigation.reset({ index: 0, routes: [{ name: 'Desk' }] });
  };

  return (
    <ScreenSurface variant="default" glow="violet">
      {!reducedMotion ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}><DustLayer /></View>
      ) : null}

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Reveal reducedMotion={reducedMotion} distance={16} duration={520}>
          <View style={styles.kickerRow}>
            <MaterialCommunityIcons name="map-marker-check-outline" size={18} color={COLORS.underViolet} />
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
            {ending?.foilLine ? <Text style={[styles.flavor, styles.foilFlavor]}>{ending.foilLine}</Text> : null}
          </Stagger>
        </View>

        {/* The case file's last page — composed from the player's actual run. */}
        {report.lines.length ? (
          <View style={styles.report}>
            <Text style={styles.reportTitle}>{report.title}</Text>
            {report.lines.map((l, i) => (
              <Text key={i} style={styles.reportLine}>{l}</Text>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* The Clear-Eyed ("true") ending earns a restrained ink-fleck burst. */}
      <Celebration active={ending?.variant === 'clear'} reducedMotion={reducedMotion} count={70} />

      <View style={styles.footer}>
        <SecondaryButton
          label="Share"
          size="compact"
          onPress={() => setSharing(true)}
          icon={<MaterialCommunityIcons name="share-variant-outline" size={16} color={COLORS.textSecondary} />}
        />
        <PrimaryButton
          label="Close the file"
          onPress={goHome}
          icon={<MaterialCommunityIcons name="book-check-outline" size={18} color={COLORS.textSecondary} />}
        />
      </View>

      <ShareCard
        visible={sharing}
        map={map}
        ending={ending}
        chapter={progress?.storyCampaign?.chapter || null}
        onClose={() => setSharing(false)}
      />
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  body: { paddingVertical: SPACING.xl, paddingBottom: SPACING.xxl },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  kicker: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.xs, letterSpacing: 3, color: COLORS.underViolet },
  title: { fontFamily: FONTS.secondaryBold, fontSize: FONT_SIZES.title, color: COLORS.offWhite, marginTop: SPACING.sm },
  clarityCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.lg,
    backgroundColor: 'rgba(241,197,114,0.07)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accentSoft, padding: SPACING.md,
  },
  clarityText: { flex: 1, fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.offWhite, lineHeight: LINE_HEIGHTS.cozy },
  prose: { marginTop: SPACING.xl, gap: SPACING.md },
  para: { fontFamily: FONTS.secondary, fontSize: FONT_SIZES.md, color: COLORS.offWhite, lineHeight: LINE_HEIGHTS.relaxed },
  flavor: { fontFamily: FONTS.secondary, fontStyle: 'italic', fontSize: FONT_SIZES.md, color: COLORS.amberLight || COLORS.accentSecondary, lineHeight: LINE_HEIGHTS.relaxed, marginTop: SPACING.sm },
  foilFlavor: { color: COLORS.bloodRed },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.panelOutline },
  report: {
    marginTop: SPACING.xl, padding: SPACING.lg, gap: SPACING.xs,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(241,197,114,0.3)', backgroundColor: 'rgba(26,21,14,0.5)',
  },
  reportTitle: { fontFamily: FONTS.monoBold, fontSize: FONT_SIZES.xs, letterSpacing: 2.6, color: COLORS.amberLight, marginBottom: SPACING.xs },
  reportLine: { fontFamily: FONTS.mono, fontSize: 11, lineHeight: 17, color: COLORS.textSecondary },
});
