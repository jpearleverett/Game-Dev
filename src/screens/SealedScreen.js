import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image as RNImage } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenSurface from '../components/ScreenSurface';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import { useGame } from '../context/GameContext';
import { normalizeUnderMap } from '../data/underMap';
import { parseCaseNumber } from '../data/storyContent';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';

const NOISE = require('../../assets/images/ui/backgrounds/noise-texture.png');

/** A rising ember mote. */
function Ember({ left, delay, dur, drift, reducedMotion }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) return undefined;
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: dur, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t, dur, delay, reducedMotion]);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -150] });
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, drift] });
  const opacity = t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] });
  return (
    <Animated.View pointerEvents="none" style={[styles.ember, { left, opacity, transform: [{ translateY }, { translateX }] }]} />
  );
}

export default function SealedScreen({ navigation, route }) {
  const game = useGame();
  const { progress } = game;
  const reducedMotion = !!progress?.settings?.reducedMotion;
  const storyCampaign = progress?.storyCampaign || {};
  const map = useMemo(() => normalizeUnderMap(storyCampaign.underMap), [storyCampaign.underMap]);

  const sealedChapter = route?.params?.chapter ?? storyCampaign.chapter ?? 1;
  const nextCaseNumber = route?.params?.nextCaseNumber || null;
  const nextChapter = nextCaseNumber ? parseCaseNumber(nextCaseNumber).chapter : sealedChapter + 1;
  const beliefTitle = route?.params?.beliefTitle
    || (map.theories[0] && map.theories[0].interpretation)
    || 'A reading of the hidden world';

  // Stamp + seal entrance.
  const stamp = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) { stamp.setValue(1); return undefined; }
    const a = Animated.spring(stamp, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [stamp, reducedMotion]);
  const aura = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(aura, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(aura, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [aura, reducedMotion]);

  const embers = useMemo(() => Array.from({ length: 12 }).map((_, i) => {
    const r = ((i * 2654435761) % 1000) / 1000;
    return { key: i, left: `${(22 + r * 56).toFixed(0)}%`, dur: 3000 + r * 3000, delay: -(r * 4000), drift: r * 30 - 15 };
  }), []);

  const sealScale = stamp.interpolate({ inputRange: [0, 1], outputRange: [2.0, 1] });
  const sealOpacity = stamp.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] });
  const auraScale = aura.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const auraOpacity = aura.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  const goNext = () => {
    if (nextCaseNumber) navigation.replace('CaseFile', { caseNumber: nextCaseNumber });
    else navigation.reset({ index: 0, routes: [{ name: 'Desk' }] });
  };
  const goDesk = () => navigation.reset({ index: 0, routes: [{ name: 'Desk' }] });

  return (
    <ScreenSurface variant="desk" glow="amber" contentStyle={styles.surface}>
      <View style={styles.body}>
        <View style={styles.sealStage}>
          {embers.map((e) => <Ember key={e.key} {...e} reducedMotion={reducedMotion} />)}
          <Animated.View pointerEvents="none" style={[styles.sealAura, { opacity: auraOpacity, transform: [{ scale: auraScale }] }]} />
          <Animated.View style={[styles.sealWax, { opacity: sealOpacity, transform: [{ scale: sealScale }] }]}>
            <LinearGradient
              colors={['#e8744f', '#c44a32', '#8f2c1c', '#6f1f12']}
              locations={[0, 0.42, 0.78, 1]}
              start={{ x: 0.32, y: 0.22 }}
              end={{ x: 0.82, y: 0.9 }}
              style={StyleSheet.absoluteFill}
            />
            <RNImage source={NOISE} style={styles.waxTex} resizeMode="repeat" pointerEvents="none" />
            <View style={styles.waxHighlight} pointerEvents="none" />
            <View style={styles.emboss}>
              <Text style={styles.sealCh}>CH</Text>
              <Text style={styles.sealNum}>{String(sealedChapter).padStart(3, '0')}</Text>
            </View>
          </Animated.View>
          <Animated.View style={[styles.sealStamp, { opacity: sealOpacity }]}>
            <Text style={styles.sealStampText}>SEALED</Text>
          </Animated.View>
        </View>

        <Text style={styles.kicker}>BELIEF COMMITTED</Text>
        <Text style={styles.quote}>“{beliefTitle}.”</Text>
        <Text style={styles.sub}>The Under-Map holds your reading. It will bend the next chapter toward what you believe.</Text>

        <View style={styles.statRow}>
          {[['+3', 'FRAGMENTS'], ['+1', 'TRUTH'], ['▸', `CHAPTER ${String(nextChapter).padStart(3, '0')}`]].map(([n, l]) => (
            <View key={l} style={styles.stat}>
              <Text style={styles.statNum}>{n}</Text>
              <Text style={styles.statLabel}>{l}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label={nextCaseNumber ? `Cross into Chapter ${String(nextChapter).padStart(3, '0')}` : 'Return to the desk'}
            onPress={goNext}
          />
          <SecondaryButton label="Return to the desk" onPress={goDesk} style={{ marginTop: 10 }} />
        </View>
      </View>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  surface: { paddingHorizontal: 0 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 30 },

  sealStage: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center' },
  sealAura: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(224,90,60,0.28)' },
  sealWax: {
    width: 150, height: 150, overflow: 'hidden',
    borderTopLeftRadius: 74, borderTopRightRadius: 78, borderBottomRightRadius: 72, borderBottomLeftRadius: 76,
    shadowColor: '#c44a32', shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  waxTex: { ...StyleSheet.absoluteFillObject, opacity: 0.18 },
  waxHighlight: { position: 'absolute', top: 14, left: 22, width: 54, height: 38, borderRadius: 30, backgroundColor: 'rgba(255,190,160,0.35)' },
  emboss: { alignItems: 'center', justifyContent: 'center' },
  sealCh: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 3.4, color: '#f7cab8', opacity: 0.85 },
  sealNum: { fontFamily: FONTS.secondaryBold, fontSize: 44, lineHeight: 46, color: '#fbdccf' },
  sealStamp: {
    position: 'absolute', bottom: 4, right: -6, transform: [{ rotate: '-9deg' }],
    backgroundColor: 'rgba(120,30,20,0.5)', borderWidth: 1, borderColor: 'rgba(255,180,160,0.6)', borderRadius: 4,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  sealStampText: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 3.4, color: '#ffe7df' },

  ember: { position: 'absolute', bottom: 40, width: 3, height: 3, borderRadius: 2, backgroundColor: '#ffb27a', shadowColor: '#ff9a55', shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },

  kicker: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 3, color: COLORS.coral, marginTop: 34 },
  quote: { fontFamily: FONTS.secondaryBold, fontSize: 25, lineHeight: 30, color: COLORS.textPrimary, textAlign: 'center', marginTop: 12, maxWidth: 300 },
  sub: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 0.4, color: COLORS.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 18, maxWidth: 280 },

  statRow: { flexDirection: 'row', gap: 22, marginVertical: 30 },
  stat: { alignItems: 'center' },
  statNum: { fontFamily: FONTS.secondaryBold, fontSize: 22, color: COLORS.amberLight },
  statLabel: { fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1.2, color: COLORS.textSubtle, marginTop: 3 },

  actions: { width: '100%', maxWidth: 320 },
});
