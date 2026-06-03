import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenSurface from '../components/ScreenSurface';
import SecondaryButton from '../components/SecondaryButton';
import PrimaryButton from '../components/PrimaryButton';
import DustLayer from '../components/DustLayer';
import { useGame } from '../context/GameContext';
import { useAudio } from '../context/AudioContext';
import { selectionHaptic, impactHaptic, notificationHaptic, Haptics } from '../utils/haptics';
import {
  normalizeUnderMap,
  undiscoveredRelationCount,
  areConnected,
  FRAGMENT_KIND,
} from '../data/underMap';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

const KIND_META = {
  [FRAGMENT_KIND.SYMBOL]: { icon: 'star-four-points-outline', color: COLORS.accentSecondary, label: 'SYMBOL' },
  [FRAGMENT_KIND.PLACE]: { icon: 'map-marker-outline', color: COLORS.accentCyan, label: 'PLACE' },
  [FRAGMENT_KIND.PERSON]: { icon: 'account-outline', color: COLORS.bloodRed, label: 'PERSON' },
  [FRAGMENT_KIND.PHENOMENON]: { icon: 'shimmer', color: COLORS.accentViolet, label: 'ANOMALY' },
};
const metaFor = (kind) => KIND_META[kind] || KIND_META[FRAGMENT_KIND.PHENOMENON];

export default function UnderMapScreen({ navigation }) {
  const game = useGame();
  const audio = useAudio();
  const { progress, connectUnderMap, touchUnderMap } = game;
  const reducedMotion = !!progress?.settings?.reducedMotion;

  const map = useMemo(
    () => normalizeUnderMap(progress?.storyCampaign?.underMap),
    [progress?.storyCampaign?.underMap],
  );

  useEffect(() => { touchUnderMap?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [slotA, setSlotA] = useState(null);
  const [slotB, setSlotB] = useState(null);
  const [feedback, setFeedback] = useState(null); // { tone:'reveal'|'known'|'none', text }

  // Reveal + shake animations.
  const reveal = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const linkGlow = useRef(new Animated.Value(0)).current;

  const fragById = useCallback((id) => map.fragments.find((f) => f.id === id) || null, [map.fragments]);
  const remaining = undiscoveredRelationCount(map);

  useEffect(() => {
    // Link line glows when both slots are filled.
    Animated.timing(linkGlow, {
      toValue: slotA && slotB ? 1 : 0,
      duration: reducedMotion ? 0 : 240,
      useNativeDriver: false,
    }).start();
  }, [slotA, slotB, linkGlow, reducedMotion]);

  const loadSlot = useCallback((id) => {
    selectionHaptic();
    setFeedback(null);
    if (slotA === id) { setSlotA(null); return; }
    if (slotB === id) { setSlotB(null); return; }
    if (!slotA) { setSlotA(id); return; }
    if (!slotB) { setSlotB(id); return; }
    // both full -> replace B
    setSlotB(id);
  }, [slotA, slotB]);

  const doReveal = useCallback(() => {
    reveal.setValue(0);
    Animated.sequence([
      Animated.timing(reveal, { toValue: 1, duration: reducedMotion ? 0 : 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [reveal, reducedMotion]);

  const doShake = useCallback(() => {
    if (reducedMotion) return;
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0.6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shake, reducedMotion]);

  const attemptConnect = useCallback(() => {
    if (!slotA || !slotB) return;
    const result = connectUnderMap?.(slotA, slotB);
    if (result?.alreadyConnected) {
      setFeedback({ tone: 'known', text: 'Already mapped.' });
      selectionHaptic();
      setSlotA(null); setSlotB(null);
      return;
    }
    if (result?.valid && result?.revealed?.node) {
      notificationHaptic(Haptics.NotificationFeedbackType.Success);
      audio?.playVictory?.();
      setFeedback({ tone: 'reveal', text: result.revealed.node.revelation });
      doReveal();
      setSlotA(null); setSlotB(null);
    } else {
      impactHaptic(Haptics.ImpactFeedbackStyle.Rigid);
      setFeedback({ tone: 'none', text: 'No link here — at least not one you can see yet.' });
      doShake();
    }
  }, [slotA, slotB, connectUnderMap, audio, doReveal, doShake]);

  const renderSlot = (id, side) => {
    const f = id ? fragById(id) : null;
    const m = f ? metaFor(f.kind) : null;
    return (
      <Animated.View style={[
        styles.slot,
        f && { borderColor: m.color, transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) }] },
      ]}>
        {f ? (
          <>
            <MaterialCommunityIcons name={m.icon} size={18} color={m.color} />
            <Text style={styles.slotLabel} numberOfLines={2}>{f.label}</Text>
          </>
        ) : (
          <Text style={styles.slotEmpty}>{side}</Text>
        )}
      </Animated.View>
    );
  };

  const linkColor = linkGlow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(157,150,141,0.35)', 'rgba(196,62,96,0.95)'] });

  return (
    <ScreenSurface variant="default">
      {!reducedMotion ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}><DustLayer /></View>
      ) : null}

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.kickerWrap}>
            <MaterialCommunityIcons name="map-marker-path" size={18} color={COLORS.accentSecondary} />
            <Text style={styles.kicker}>THE UNDER-MAP</Text>
          </View>
          <SecondaryButton label="Close" size="compact" onPress={() => navigation.goBack()}
            icon={<MaterialCommunityIcons name="close" size={16} color={COLORS.textSecondary} />} />
        </View>
        <Text style={styles.status}>
          {map.fragments.length} {map.fragments.length === 1 ? 'fragment' : 'fragments'}
          {'  ·  '}{map.nodes.length} revealed
          {remaining > 0 ? `  ·  ${remaining} connection${remaining === 1 ? '' : 's'} you can sense` : ''}
        </Text>
      </View>

      {map.fragments.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="map-search-outline" size={28} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>
            Nothing pinned yet. Examine the scenes — the things that don't belong are the threads into the Under-Map.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Connection bench */}
          <Text style={styles.sectionLabel}>DRAW A CONNECTION</Text>
          <View style={styles.bench}>
            {renderSlot(slotA, 'Pick one')}
            <Animated.View style={[styles.link, { backgroundColor: linkColor }]} />
            {renderSlot(slotB, 'Pick another')}
          </View>

          {feedback ? (
            feedback.tone === 'reveal' ? (
              <Animated.View style={[styles.revealCard, {
                opacity: reveal,
                transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
              }]}>
                <View style={styles.revealHeader}>
                  <MaterialCommunityIcons name="map-marker-star" size={20} color={COLORS.accentSecondary} />
                  <Text style={styles.revealKicker}>THE MAP REVEALS</Text>
                </View>
                <Text style={styles.revealText}>{feedback.text}</Text>
              </Animated.View>
            ) : (
              <Text style={[styles.feedback, feedback.tone === 'none' && styles.feedbackNone]}>{feedback.text}</Text>
            )
          ) : null}

          <PrimaryButton
            label="Connect"
            onPress={attemptConnect}
            disabled={!slotA || !slotB}
            icon={<MaterialCommunityIcons name="vector-link" size={18} color={COLORS.textSecondary} />}
            style={{ marginTop: SPACING.md }}
          />

          {/* Fragments */}
          <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>FRAGMENTS</Text>
          <View style={styles.fragWrap}>
            {map.fragments.map((f) => {
              const m = metaFor(f.kind);
              const selected = f.id === slotA || f.id === slotB;
              const linked = map.connections.some((c) => c.a === f.id || c.b === f.id);
              return (
                <Pressable
                  key={f.id}
                  onPress={() => loadSlot(f.id)}
                  style={[styles.frag, { borderColor: selected ? m.color : COLORS.panelOutline }, selected && { backgroundColor: COLORS.surfaceAlt }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.label}: ${f.label}`}
                >
                  <View style={styles.fragTop}>
                    <MaterialCommunityIcons name={m.icon} size={14} color={m.color} />
                    <Text style={[styles.fragKind, { color: m.color }]}>{m.label}</Text>
                    {linked ? <MaterialCommunityIcons name="vector-link" size={12} color={COLORS.accentSecondary} style={{ marginLeft: 'auto' }} /> : null}
                  </View>
                  <Text style={styles.fragLabel}>{f.label}</Text>
                  {f.detail ? <Text style={styles.fragDetail} numberOfLines={2}>{f.detail}</Text> : null}
                </Pressable>
              );
            })}
          </View>

          {/* Revealed nodes */}
          {map.nodes.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>WHAT THE MAP HAS REVEALED</Text>
              <View style={styles.nodeList}>
                {map.nodes.map((n) => (
                  <View key={n.id} style={styles.nodeRow}>
                    <MaterialCommunityIcons name="map-marker-check" size={16} color={COLORS.accentSecondary} />
                    <Text style={styles.nodeText}>{n.revelation}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {remaining > 0 ? (
            <Text style={styles.deeper}>The map runs deeper. {remaining} connection{remaining === 1 ? '' : 's'} wait to be drawn.</Text>
          ) : null}
        </ScrollView>
      )}
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: SPACING.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kickerWrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  kicker: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.sm, letterSpacing: 3, color: COLORS.accentSecondary },
  status: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: SPACING.xs, letterSpacing: 0.5 },
  body: { paddingVertical: SPACING.md, paddingBottom: SPACING.xl },
  sectionLabel: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.xs, letterSpacing: 3, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  // Bench
  bench: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  slot: {
    flex: 1, minHeight: 64, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.panelOutline,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', padding: SPACING.sm, gap: 4,
  },
  slotLabel: { fontFamily: FONTS.primaryMedium, fontSize: FONT_SIZES.xs, color: COLORS.offWhite, textAlign: 'center' },
  slotEmpty: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.textMuted, letterSpacing: 1 },
  link: { width: 28, height: 3, borderRadius: 2 },
  // Reveal
  revealCard: {
    marginTop: SPACING.md, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.accentSoft, padding: SPACING.lg, gap: SPACING.sm,
  },
  revealHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  revealKicker: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.sm, letterSpacing: 3, color: COLORS.accentSecondary },
  revealText: { fontFamily: FONTS.secondary, fontSize: FONT_SIZES.md, color: COLORS.offWhite, lineHeight: LINE_HEIGHTS.relaxed },
  feedback: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.md, lineHeight: LINE_HEIGHTS.cozy },
  feedbackNone: { color: COLORS.textMuted, fontStyle: 'italic' },
  // Fragments
  fragWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  frag: {
    width: '47%', flexGrow: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.panelOutline, padding: SPACING.md, gap: 4,
  },
  fragTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fragKind: { fontFamily: FONTS.monoBold, fontSize: 10, letterSpacing: 1.5 },
  fragLabel: { fontFamily: FONTS.primarySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.offWhite },
  fragDetail: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.textMuted, lineHeight: LINE_HEIGHTS.cozy },
  // Nodes
  nodeList: { gap: SPACING.sm },
  nodeRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: 'rgba(241,197,114,0.06)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(241,197,114,0.25)', padding: SPACING.md,
  },
  nodeText: { flex: 1, fontFamily: FONTS.secondary, fontSize: FONT_SIZES.sm, color: COLORS.offWhite, lineHeight: LINE_HEIGHTS.cozy },
  deeper: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: SPACING.lg },
  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg },
  emptyText: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: LINE_HEIGHTS.relaxed },
});
