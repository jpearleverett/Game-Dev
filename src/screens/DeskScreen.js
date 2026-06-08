import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Image as RNImage } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Circle } from 'react-native-svg';

import ScreenSurface from '../components/ScreenSurface';
import NeonSign from '../components/NeonSign';
import PressableScale from '../components/PressableScale';
import Stagger from '../components/motion/Stagger';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { createCasePalette } from '../theme/casePalette';
import { mapDepth, foilPresence } from '../data/underMap';

const NOISE = require('../../assets/images/ui/backgrounds/noise-texture.png');
const DEAD_LETTERS_LOGO = require('../../assets/images/ui/branding/logo.png');

const BEATS = ['Read', 'Examine', 'Connect', 'Theory'];

function formatCountdown(nextUnlockAt) {
  if (!nextUnlockAt) return null;
  const target = new Date(nextUnlockAt).getTime();
  const now = Date.now();
  if (target <= now) return 'Unlocking soon';
  const diff = target - now;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function DeskScreen({
  activeCase,
  progress,
  onStartCase,
  onOpenArchive,
  onOpenStats,
  onOpenSettings,
  onOpenMenu,
  onOpenStoryCampaign,
  onOpenCaseBoard,
  onOpenCodex,
  onPickUpTrail,
  onBribe,
}) {
  const storyCampaign = progress.storyCampaign || {};
  const reducedMotion = !!progress?.settings?.reducedMotion;
  const underMap = storyCampaign?.underMap || {};
  const fragments = underMap?.fragments?.length || 0;
  const truths = underMap?.nodes?.length || 0;
  const totalRelations = underMap?.relations?.length || 0;
  const depth = mapDepth(underMap);
  const depthPct = Math.round(depth.ratio * 100);
  const foilHeat = foilPresence(underMap);
  const nextStoryUnlockAt = storyCampaign?.nextStoryUnlockAt;
  const [countdown, setCountdown] = useState(formatCountdown(nextStoryUnlockAt));

  useEffect(() => {
    if (!nextStoryUnlockAt) { setCountdown(null); return undefined; }
    const update = () => setCountdown(formatCountdown(nextStoryUnlockAt));
    update();
    const timer = setInterval(update, 5000);
    return () => clearInterval(timer);
  }, [nextStoryUnlockAt]);

  const caseNumber = activeCase?.caseNumber || '001A';
  const chapterStr = caseNumber.slice(0, 3);
  const letter = caseNumber.slice(3, 4) || 'A';
  const storyChapter = storyCampaign.chapter || 1;
  const completedSubchapters = Array.isArray(storyCampaign.completedCaseNumbers) ? storyCampaign.completedCaseNumbers.length : 0;
  const awaitingDecision = Boolean(storyCampaign.awaitingDecision && storyCampaign.pendingDecisionCase);
  const storyLocked = Boolean(!awaitingDecision && nextStoryUnlockAt);
  const completedCaseNumbers = Array.isArray(storyCampaign.completedCaseNumbers) ? storyCampaign.completedCaseNumbers : [];
  const branchingChoices = Array.isArray(storyCampaign.branchingChoices) ? storyCampaign.branchingChoices : [];
  const caseRead = branchingChoices.some((bc) => bc?.caseNumber === caseNumber) || completedCaseNumbers.includes(caseNumber);
  const caseCompleted = completedCaseNumbers.includes(caseNumber);
  const activeBeatIndex = caseCompleted
    ? 0
    : !caseRead
      ? 0
      : letter.toUpperCase() === 'C'
        ? 3
        : 2;
  const beatStates = BEATS.map((beat, index) => ({
    label: beat,
    active: index === activeBeatIndex || (!caseRead && index === 1),
    done: caseRead && index < activeBeatIndex,
  }));

  const solved = activeCase?.id ? progress.solvedCaseIds.includes(activeCase.id) : false;
  const latestTheory = Array.isArray(underMap?.theories) && underMap.theories.length ? underMap.theories[0] : null;
  const teaser = storyLocked && latestTheory?.interpretation
    ? `When the lock lifts, Ashport tests what you believed: "${latestTheory.interpretation}".`
    : !caseRead
      ? 'Read the next letter. Sense the phrases that do not belong, and pin them to the Under-Map.'
      : letter.toUpperCase() === 'C'
        ? 'The chapter has shown its signs. Commit the belief the hidden world will answer.'
        : 'The scene left fragments behind. Descend and connect them before they sink out of sight.';

  const primaryLabel = storyLocked
    ? 'Pick up the trail'
    : solved
      ? 'Review the case file'
      : !caseRead
        ? 'Read & sense anomalies'
        : letter.toUpperCase() === 'C'
          ? 'Seal your belief'
          : 'Descend into the Under-Map';

  const tap = (cb) => () => { Haptics.selectionAsync().catch(() => {}); cb?.(); };
  const onPrimary = storyLocked && onPickUpTrail ? onPickUpTrail : onStartCase;

  const { moderateScale } = useResponsiveLayout();
  const palette = useMemo(() => createCasePalette(activeCase), [activeCase]);

  return (
    <ScreenSurface variant="desk" glow="amber" frameless contentStyle={styles.surface} accentColor={palette.accent}>
      {/* lamp pool */}
      <View pointerEvents="none" style={styles.lampPool} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* rain-glass window with neon */}
        <View style={styles.window}>
          <LinearGradient
            colors={['#0b0a12', '#161425', '#0c0a14']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.windowTint} pointerEvents="none" />
          <Text style={styles.windowIdLeft} pointerEvents="none">ASHPORT · 2:14 AM</Text>
          <View style={styles.windowNeon} pointerEvents="none">
            <NeonSign logoSource={DEAD_LETTERS_LOGO} style={styles.neon} />
          </View>
          <Pressable onPress={tap(onOpenSettings)} hitSlop={10} style={styles.settingsBtn}>
            <MaterialCommunityIcons name="cog-outline" size={20} color={COLORS.accentCyan} />
          </Pressable>
          {onOpenMenu ? (
            <Pressable onPress={tap(onOpenMenu)} hitSlop={10} style={styles.manualBtn}>
              <MaterialCommunityIcons name="book-open-variant" size={20} color={COLORS.amberLight} />
            </Pressable>
          ) : null}
          <View style={styles.windowSill} pointerEvents="none" />
        </View>

        <Text style={styles.idStrip}>JACK HALLOWAY · PRIVATE INVESTIGATOR</Text>

        <Stagger reducedMotion={reducedMotion} distance={16}>
          {/* the case dossier — aged paper folder */}
          <View style={styles.folder}>
            <View style={styles.folderTab}><Text style={styles.folderTabText}>CASE {chapterStr} · {letter}</Text></View>
            <View style={styles.paper}>
              <RNImage source={NOISE} style={styles.paperGrain} resizeMode="repeat" pointerEvents="none" />
              <View style={styles.clip} pointerEvents="none" />
              <View style={styles.stampOpen}><Text style={styles.stampOpenText}>{solved ? 'CLOSED' : 'OPEN'}</Text></View>
              <Text style={styles.typed}>CURRENT CASE FILE</Text>
              <Text style={styles.inkTitle}>{activeCase.title}</Text>
              <Text style={styles.teaser}>{teaser}</Text>

              <View style={styles.beatTrack}>
                {beatStates.map((b, i) => (
                  <React.Fragment key={b.label}>
                    <View style={styles.beatNode}>
                      <View style={[styles.beatDot, b.done && styles.beatDotDone, b.active && styles.beatDotOn]} />
                      <Text style={[styles.beatName, b.done && styles.beatNameDone, b.active && styles.beatNameOn]}>{b.label.toUpperCase()}</Text>
                    </View>
                    {i < BEATS.length - 1 ? <View style={styles.beatLine} /> : null}
                  </React.Fragment>
                ))}
              </View>

              <PressableScale onPress={tap(onPrimary)} reducedMotion={reducedMotion} style={styles.btnStamp} haptic={false}>
                <Text style={styles.btnStampText}>{primaryLabel}</Text>
                <Text style={styles.btnStampArrow}>▸</Text>
              </PressableScale>
              {storyLocked && countdown ? (
                <Text style={styles.lockNote}>Next chapter unlocks in {countdown}</Text>
              ) : null}
              {storyLocked && onBribe ? (
                <Pressable onPress={tap(onBribe)}><Text style={styles.bribeNote}>Bribe the clerk to rush it ($0.99)</Text></Pressable>
              ) : null}
              {depth.total > 0 ? (
                <Text style={styles.mapPulse}>
                  Under-Map {depthPct}% drawn{foilHeat >= 2 ? ' · The Other Reader has a face' : foilHeat >= 1 ? ' · another reading stirs' : ''}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Under-Map descent aperture */}
          <PressableScale onPress={tap(onOpenCaseBoard)} reducedMotion={reducedMotion} style={styles.aperture} containerStyle={styles.apertureWrap}>
            <View style={styles.apertureGlow} pointerEvents="none" />
            <Svg width={60} height={50} style={{ flex: 0 }}>
              <Line x1="12" y1="14" x2="42" y2="24" stroke={COLORS.underViolet} strokeWidth="1.4" opacity="0.8" />
              <Line x1="42" y1="24" x2="26" y2="40" stroke={COLORS.underCyan} strokeWidth="1.4" opacity="0.8" />
              <Circle cx="12" cy="14" r="3" fill={COLORS.kindSymbol} />
              <Circle cx="42" cy="24" r="3.4" fill={COLORS.kindPhenomenon} />
              <Circle cx="26" cy="40" r="3" fill={COLORS.kindPlace} />
              <Circle cx="50" cy="13" r="2.4" fill={COLORS.kindPerson} opacity="0.85" />
            </Svg>
            <View style={styles.apertureText}>
              <Text style={styles.apertureKicker}>DESCEND ▾</Text>
              <Text style={styles.apertureTitle}>The Under-Map</Text>
              <Text style={styles.apertureSub}>
                {truths} / {Math.max(totalRelations, truths)} truths surfaced
              </Text>
            </View>
            <Text style={styles.apertureArrow}>↓</Text>
          </PressableScale>

          {/* Codex — your reading of the hidden world */}
          {onOpenCodex ? (
            <Pressable onPress={tap(onOpenCodex)} style={styles.codexLink}>
              <MaterialCommunityIcons name="book-open-variant" size={15} color={COLORS.underViolet} />
              <Text style={styles.codexLinkText}>CODEX · HIDDEN WORLD</Text>
              <Text style={styles.codexLinkArrow}>→</Text>
            </Pressable>
          ) : null}

          {/* Story campaign — ghost entry */}
          <Pressable onPress={tap(onOpenStoryCampaign)} style={styles.storyLink}>
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={16} color={COLORS.coral} />
            <Text style={styles.storyLinkText}>HISTORY</Text>
            <Text style={styles.storyLinkArrow}>→</Text>
          </Pressable>

          {/* stat tags — Fragments / Truths / Chapter (per the design); tappable for nav */}
          <View style={styles.statRow}>
            <Pressable style={styles.statTag} onPress={tap(onOpenArchive)}>
              <Text style={styles.statNum}>{String(fragments).padStart(2, '0')}</Text>
              <Text style={styles.statLabel}>FRAGMENTS</Text>
            </Pressable>
            <Pressable style={styles.statTag} onPress={tap(onOpenStats)}>
              <Text style={styles.statNum}>{String(truths).padStart(2, '0')}</Text>
              <Text style={styles.statLabel}>TRUTHS</Text>
            </Pressable>
            <View style={styles.statTag}>
              <Text style={styles.statNum}>{String(storyChapter).padStart(2, '0')}</Text>
              <Text style={styles.statLabel}>CHAPTER</Text>
            </View>
          </View>
        </Stagger>
      </ScrollView>
    </ScreenSurface>
  );
}

const PAPER = '#e7dcc2';

const styles = StyleSheet.create({
  surface: { paddingHorizontal: 0, paddingVertical: 0 },
  scroll: { flex: 1 },
  container: { paddingBottom: 36 },
  lampPool: { ...StyleSheet.absoluteFillObject, zIndex: 0 },

  // Rain-glass window
  window: { position: 'relative', height: 210, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(245,230,205,0.1)' },
  windowTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,9,14,0.36)',
  },
  windowNeon: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  neon: { transform: [{ rotate: '-2deg' }] },
  windowIdLeft: { position: 'absolute', top: 16, left: 16, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1.6, color: COLORS.textMuted, zIndex: 5 },
  settingsBtn: { position: 'absolute', top: 16, right: 16, padding: 6, zIndex: 5 },
  manualBtn: { position: 'absolute', top: 16, right: 52, padding: 6, zIndex: 5 },
  windowSill: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 14, backgroundColor: '#1c150e' },

  idStrip: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 2.4, color: COLORS.textMuted, textAlign: 'center', paddingTop: 16, paddingHorizontal: 24 },

  // Paper dossier
  folder: { paddingTop: 20, paddingHorizontal: 20, marginTop: 18 },
  folderTab: {
    position: 'absolute', top: 0, left: 44, zIndex: 3,
    backgroundColor: '#cdb988', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10,
    borderTopLeftRadius: 9, borderTopRightRadius: 9,
  },
  folderTabText: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1.8, color: '#3a2c1c' },
  paper: {
    position: 'relative', backgroundColor: PAPER, borderRadius: 4, padding: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 18 }, elevation: 14,
  },
  paperGrain: { ...StyleSheet.absoluteFillObject, opacity: 0.10 },
  clip: {
    position: 'absolute', top: 4, right: 28, width: 16, height: 44, zIndex: 3,
    borderWidth: 3, borderBottomWidth: 0, borderColor: '#ad9472', borderTopLeftRadius: 9, borderTopRightRadius: 9,
  },
  stampOpen: { position: 'absolute', top: 34, right: 18, zIndex: 3, transform: [{ rotate: '9deg' }], borderWidth: 2, borderColor: '#9a3b2e', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3, opacity: 0.62 },
  stampOpenText: { fontFamily: FONTS.monoBold, fontSize: 12, letterSpacing: 2, color: '#9a3b2e' },
  typed: { fontFamily: FONTS.mono, fontSize: 10.5, letterSpacing: 1.6, color: '#9a3b2e' },
  inkTitle: { fontFamily: FONTS.secondaryBold, fontSize: 28, lineHeight: 30, color: '#241a12', marginTop: 8, marginBottom: 10 },
  teaser: { fontFamily: FONTS.primary, fontSize: 13.5, lineHeight: 21, color: '#4a3a28', marginBottom: 18 },

  beatTrack: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  beatNode: { alignItems: 'center', gap: 6 },
  beatDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#c4af86', borderWidth: 1, borderColor: '#9a8460' },
  beatDotDone: { backgroundColor: '#6d7b62', borderColor: '#516447' },
  beatDotOn: { backgroundColor: '#c0563f', borderColor: '#c0563f' },
  beatName: { fontFamily: FONTS.mono, fontSize: 8.5, letterSpacing: 0.8, color: '#8a7656' },
  beatNameDone: { color: '#587047' },
  beatNameOn: { color: '#9a3b2e' },
  beatLine: { flex: 1, height: 1, marginBottom: 14, marginHorizontal: 2, backgroundColor: 'rgba(169,144,102,0.5)' },

  btnStamp: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 10, backgroundColor: '#b14430',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  btnStampText: { fontFamily: FONTS.primarySemiBold, fontWeight: '700', fontSize: 14, letterSpacing: 0.3, color: '#fce7d9' },
  btnStampArrow: { fontFamily: FONTS.mono, fontSize: 14, color: '#fce7d9' },
  lockNote: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1, color: '#7a5a3a', textAlign: 'center', marginTop: 10 },
  bribeNote: { fontFamily: FONTS.mono, fontSize: 11, color: '#9a3b2e', textAlign: 'center', marginTop: 8, textDecorationLine: 'underline' },
  mapPulse: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 0.8, color: '#6c4d85', textAlign: 'center', marginTop: 10 },

  // Aperture
  apertureWrap: { paddingHorizontal: 20, marginTop: 18 },
  aperture: {
    flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, borderRadius: 18, overflow: 'hidden',
    backgroundColor: 'rgba(20,16,30,0.7)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.28)',
  },
  apertureGlow: {
    position: 'absolute', right: -34, top: '50%', width: 170, height: 170, borderRadius: 170,
    transform: [{ translateY: -85 }], backgroundColor: COLORS.underGlowSoft,
  },
  apertureText: { flex: 1 },
  apertureKicker: { fontFamily: FONTS.mono, fontSize: 10.5, letterSpacing: 3, color: COLORS.underViolet, marginBottom: 5 },
  apertureTitle: { fontFamily: FONTS.secondaryBold, fontSize: 19, color: COLORS.textPrimary },
  apertureSub: { fontFamily: FONTS.mono, fontSize: 10.5, color: COLORS.textMuted, marginTop: 3 },
  apertureArrow: { color: COLORS.underViolet, fontSize: 20 },

  storyLink: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 4, marginTop: 14 },
  storyLinkText: { fontFamily: FONTS.mono, fontSize: 11, lineHeight: 16, letterSpacing: 2.4, color: COLORS.coral },
  storyLinkArrow: { fontFamily: FONTS.mono, fontSize: 13, color: COLORS.coral },

  codexLink: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 5, marginTop: 16 },
  codexLinkText: { fontFamily: FONTS.mono, fontSize: 10.5, lineHeight: 16, letterSpacing: 2, color: COLORS.underViolet },
  codexLinkArrow: { fontFamily: FONTS.mono, fontSize: 13, color: COLORS.underViolet },

  // Stat tags
  statRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 18 },
  statTag: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', borderRadius: 12,
    backgroundColor: 'rgba(30,25,20,0.72)', borderWidth: 1, borderColor: COLORS.hair,
  },
  statNum: { fontFamily: FONTS.secondaryBold, fontSize: 24, color: COLORS.amberLight },
  statLabel: { fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1.4, color: COLORS.textSubtle, marginTop: 2 },
});
