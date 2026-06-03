import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenSurface from '../components/ScreenSurface';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import DustLayer from '../components/DustLayer';
import { useGame } from '../context/GameContext';
import { useAudio } from '../context/AudioContext';
import { selectionHaptic, notificationHaptic, impactHaptic, Haptics } from '../utils/haptics';
import { normalizeUnderMap, FRAGMENT_KIND } from '../data/underMap';
import {
  parseCaseNumber,
  formatCaseNumber,
  computeBranchPathKey,
  getStoryEntry,
  ROOT_PATH_KEY,
} from '../data/storyContent';
import { resolveStoryDecision, decisionOptionsFrom } from '../utils/storyDecision';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

const KIND_META = {
  [FRAGMENT_KIND.SYMBOL]: { icon: 'star-four-points-outline', color: COLORS.accentSecondary },
  [FRAGMENT_KIND.PLACE]: { icon: 'map-marker-outline', color: COLORS.accentCyan },
  [FRAGMENT_KIND.PERSON]: { icon: 'account-outline', color: COLORS.bloodRed },
  [FRAGMENT_KIND.PHENOMENON]: { icon: 'shimmer', color: COLORS.accentViolet },
};
const metaFor = (kind) => KIND_META[kind] || KIND_META[FRAGMENT_KIND.PHENOMENON];

export default function TheoryScreen({ navigation, route }) {
  const game = useGame();
  const audio = useAudio();
  const {
    progress,
    recordUnderMapTheory,
    completeLogicPuzzle,
    selectDecisionBeforePuzzle,
  } = game;
  const reducedMotion = !!progress?.settings?.reducedMotion;

  const storyCampaign = progress?.storyCampaign || {};
  const caseNumber = route?.params?.caseNumber || storyCampaign.activeCaseNumber || null;
  const caseId = route?.params?.caseId || game.activeCase?.id || null;
  const chapter = storyCampaign.chapter ?? (caseNumber ? parseCaseNumber(caseNumber).chapter : null);

  const map = useMemo(
    () => normalizeUnderMap(storyCampaign.underMap),
    [storyCampaign.underMap],
  );

  // The competing beliefs (the chapter decision, framed as interpretations of the
  // hidden world). Prefer options passed from the CaseFile; otherwise resolve them
  // ourselves so a direct/resumed entry still works.
  const beliefs = useMemo(() => {
    const passed = route?.params?.decisionOptions;
    if (Array.isArray(passed) && passed.length) return passed;
    const storyMeta = game.activeCase?.storyMeta
      || getStoryEntry(
        caseNumber,
        storyCampaign.pathHistory?.[chapter] || storyCampaign.currentPathKey || ROOT_PATH_KEY,
        null,
      )
      || null;
    const branchingPath = (storyCampaign.branchingChoices || [])
      .find((bc) => bc.caseNumber === caseNumber)?.secondChoice || null;
    const resolved = resolveStoryDecision({
      activeCaseStoryDecision: game.activeCase?.storyDecision,
      metaDecision: storyMeta?.decision,
      metaPathDecisions: storyMeta?.pathDecisions,
      subchapterLetter: caseNumber ? caseNumber.slice(3, 4) : null,
      branchingPath,
    });
    return decisionOptionsFrom(resolved);
  }, [route?.params?.decisionOptions, game.activeCase, caseNumber, chapter, storyCampaign.pathHistory, storyCampaign.currentPathKey, storyCampaign.branchingChoices]);

  const [beliefKey, setBeliefKey] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [sealed, setSealed] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [genError, setGenError] = useState(null);

  const sealAnim = useRef(new Animated.Value(0)).current;
  const chosenBelief = beliefs.find((b) => b.key === beliefKey) || null;

  const toggleFragment = useCallback((id) => {
    if (sealed) return;
    selectionHaptic();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, [sealed]);

  const sealTheory = useCallback(() => {
    if (sealed) return;
    // A belief must be chosen (when options exist) — it IS the chapter decision.
    if (beliefs.length && !chosenBelief) {
      impactHaptic(Haptics.ImpactFeedbackStyle.Rigid);
      setGenError('Choose what you believe before you seal it.');
      return;
    }
    const fragmentIds = selected.size > 0 ? Array.from(selected) : map.fragments.map((f) => f.id);
    const interpretation = chosenBelief?.title || chosenBelief?.focus || 'A reading of the hidden world.';

    // The belief is the chapter decision: store it as the pre-decision (drives the
    // branch into the next chapter) AND record it on the Under-Map as a sealed theory.
    selectDecisionBeforePuzzle?.(
      chosenBelief?.key || 'A',
      { title: chosenBelief?.title, focus: chosenBelief?.focus },
      caseNumber,
    );
    if (fragmentIds.length) {
      recordUnderMapTheory?.({ chapter, fragmentIds, interpretation });
    }

    setGenError(null);
    notificationHaptic(Haptics.NotificationFeedbackType.Success);
    audio?.playVictory?.();
    setSealed(true);
    sealAnim.setValue(0);
    if (reducedMotion) { sealAnim.setValue(1); }
    else { Animated.spring(sealAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start(); }
  }, [sealed, beliefs.length, chosenBelief, selected, map.fragments, selectDecisionBeforePuzzle, caseNumber, recordUnderMapTheory, chapter, audio, sealAnim, reducedMotion]);

  // Cross into the next chapter: pre-warm generation under the SAME key the advance
  // will set, then apply the sealed decision (clobber-safe) and navigate.
  const crossThreshold = useCallback(async () => {
    if (continuing || !caseNumber) return;
    const pre = storyCampaign.preDecision;
    if (!pre || pre.caseNumber !== caseNumber) {
      setGenError('Seal your theory first.');
      return;
    }
    setContinuing(true);
    setGenError(null);

    const nextChapter = parseCaseNumber(caseNumber).chapter + 1;
    const nextCaseNumber = formatCaseNumber(nextChapter, 1);
    const nextChoiceHistory = [
      ...(Array.isArray(storyCampaign.choiceHistory) ? storyCampaign.choiceHistory : []),
      {
        caseNumber: pre.caseNumber,
        optionKey: pre.optionKey,
        optionTitle: pre.optionTitle || null,
        optionFocus: pre.optionFocus || null,
      },
    ];
    const nextPathKey = computeBranchPathKey(nextChoiceHistory, nextChapter);

    try {
      await game.ensureStoryContent?.(nextCaseNumber, nextPathKey, nextChoiceHistory);
    } catch (_e) {
      setContinuing(false);
      setGenError('The next chapter would not take shape. Tap to try again.');
      return;
    }

    completeLogicPuzzle?.({ caseId, caseNumber, mistakes: 0 });
    navigation.replace('CaseFile', { caseNumber: nextCaseNumber });
  }, [continuing, caseNumber, caseId, storyCampaign.preDecision, storyCampaign.choiceHistory, game, completeLogicPuzzle, navigation]);

  const sealScale = sealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const sealOpacity = sealAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] });

  return (
    <ScreenSurface variant="default">
      {!reducedMotion ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}><DustLayer /></View>
      ) : null}

      <View style={styles.header}>
        <View style={styles.kickerRow}>
          <MaterialCommunityIcons name="eye-circle-outline" size={18} color={COLORS.accentSecondary} />
          <Text style={styles.kicker}>THE THEORY{chapter ? ` · CHAPTER ${chapter}` : ''}</Text>
        </View>
        <Text style={styles.title}>What is the Under-Map?</Text>
        <Text style={styles.lede}>
          Commit to a reading of the hidden world. The belief you stake decides which way it pulls you next — and what it lets you see.
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* What the map has revealed so far */}
        {map.nodes.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>WHAT THE MAP HAS REVEALED</Text>
            <View style={styles.nodeList}>
              {map.nodes.slice(0, 6).map((n) => (
                <View key={n.id} style={styles.nodeRow}>
                  <MaterialCommunityIcons name="map-marker-star" size={15} color={COLORS.accentSecondary} />
                  <Text style={styles.nodeText}>{n.revelation}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* The competing beliefs — this is the chapter decision */}
        <Text style={[styles.sectionLabel, { marginTop: map.nodes.length ? SPACING.lg : 0 }]}>WHAT DO YOU BELIEVE?</Text>
        {beliefs.length === 0 ? (
          <Text style={styles.muted}>The way forward is yours to take. Seal your read and press on.</Text>
        ) : (
          <View style={styles.beliefList}>
            {beliefs.map((b) => {
              const active = b.key === beliefKey;
              return (
                <Pressable
                  key={b.key}
                  onPress={() => { if (!sealed) { selectionHaptic(); setBeliefKey(b.key); setGenError(null); } }}
                  disabled={sealed}
                  style={[styles.beliefCard, active && styles.beliefCardActive, sealed && !active && { opacity: 0.4 }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View style={styles.beliefTop}>
                    <MaterialCommunityIcons
                      name={active ? 'radiobox-marked' : 'radiobox-blank'}
                      size={18}
                      color={active ? COLORS.accentSecondary : COLORS.textMuted}
                    />
                    <Text style={[styles.beliefTitle, active && { color: COLORS.offWhite }]}>{b.title || 'A reading of the hidden world'}</Text>
                  </View>
                  {(b.focus || b.consequence) ? (
                    <Text style={styles.beliefFocus}>{b.focus || b.consequence}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Stake the fragments as evidence */}
        <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>
          {sealed ? 'THE EVIDENCE YOU STAKED' : 'STAKE YOUR EVIDENCE'}
        </Text>
        {map.fragments.length === 0 ? (
          <Text style={styles.muted}>You collected no fragments this chapter — the map stays dark. You can still commit a read.</Text>
        ) : (
          <View style={styles.fragWrap}>
            {map.fragments.map((f) => {
              const m = metaFor(f.kind);
              const active = selected.has(f.id);
              const dim = sealed && !active && selected.size > 0;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => toggleFragment(f.id)}
                  disabled={sealed}
                  style={[
                    styles.frag,
                    { borderLeftColor: m.color, borderColor: active ? m.color : COLORS.panelOutline },
                    active && { backgroundColor: COLORS.surfaceAlt },
                    dim && { opacity: 0.4 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View style={styles.fragTop}>
                    <MaterialCommunityIcons name={m.icon} size={14} color={m.color} />
                    {active ? (
                      <MaterialCommunityIcons name="check-circle" size={14} color={m.color} style={{ marginLeft: 'auto' }} />
                    ) : null}
                  </View>
                  <Text style={styles.fragLabel}>{f.label}</Text>
                  {f.detail ? <Text style={styles.fragDetail} numberOfLines={2}>{f.detail}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        )}

        {genError ? <Text style={styles.error}>{genError}</Text> : null}

        {sealed ? (
          <Animated.View style={[styles.sealedCard, { opacity: sealOpacity, transform: [{ scale: sealScale }] }]}>
            <MaterialCommunityIcons name="seal-variant" size={26} color={COLORS.accentSecondary} />
            <Text style={styles.sealedKicker}>THEORY SEALED</Text>
            {chosenBelief?.title ? <Text style={styles.sealedBelief}>“{chosenBelief.title}”</Text> : null}
            <Text style={styles.sealedText}>
              You've committed your reading. Cross the threshold — the next chapter will answer it.
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <SecondaryButton
          label={sealed ? 'Reconsider' : 'Back'}
          size="compact"
          onPress={() => (sealed ? setSealed(false) : navigation.goBack())}
          icon={<MaterialCommunityIcons name={sealed ? 'lock-open-variant-outline' : 'arrow-left'} size={16} color={COLORS.textSecondary} />}
        />
        {!sealed ? (
          <PrimaryButton
            label="Seal your theory"
            onPress={sealTheory}
            disabled={beliefs.length > 0 && !chosenBelief}
            icon={<MaterialCommunityIcons name="seal" size={18} color={COLORS.textSecondary} />}
          />
        ) : (
          <PrimaryButton
            label={continuing ? 'Crossing…' : genError ? 'Retry' : 'Cross the threshold'}
            onPress={crossThreshold}
            disabled={continuing}
            icon={<MaterialCommunityIcons name="door-open" size={18} color={COLORS.textSecondary} />}
          />
        )}
      </View>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: SPACING.sm },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  kicker: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.sm, letterSpacing: 3, color: COLORS.accentSecondary },
  title: { fontFamily: FONTS.secondaryBold, fontSize: FONT_SIZES.title, color: COLORS.offWhite, marginTop: SPACING.sm },
  lede: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, lineHeight: LINE_HEIGHTS.cozy },
  scroll: { flex: 1 },
  body: { paddingVertical: SPACING.md, paddingBottom: SPACING.xl },
  sectionLabel: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.xs, letterSpacing: 3, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  // Nodes
  nodeList: { gap: SPACING.sm },
  nodeRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: 'rgba(241,197,114,0.06)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(241,197,114,0.22)', padding: SPACING.md,
  },
  nodeText: { flex: 1, fontFamily: FONTS.secondary, fontSize: FONT_SIZES.sm, color: COLORS.offWhite, lineHeight: LINE_HEIGHTS.cozy },
  // Beliefs
  beliefList: { gap: SPACING.sm },
  beliefCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.panelOutline,
    padding: SPACING.lg, gap: SPACING.xs,
  },
  beliefCardActive: { borderColor: COLORS.accentSecondary, backgroundColor: COLORS.surfaceAlt },
  beliefTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  beliefTitle: { flex: 1, fontFamily: FONTS.primarySemiBold, fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  beliefFocus: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.textMuted, lineHeight: LINE_HEIGHTS.cozy, marginLeft: 26 },
  // Fragments
  fragWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  frag: {
    width: '47%', flexGrow: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderLeftWidth: 3, borderColor: COLORS.panelOutline, padding: SPACING.md, gap: 4,
  },
  fragTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fragLabel: { fontFamily: FONTS.primarySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.offWhite },
  fragDetail: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.textMuted, lineHeight: LINE_HEIGHTS.cozy },
  muted: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textMuted, lineHeight: LINE_HEIGHTS.cozy },
  error: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.bloodRed, marginTop: SPACING.md, textAlign: 'center' },
  // Sealed
  sealedCard: {
    marginTop: SPACING.lg, alignItems: 'center', gap: SPACING.sm,
    backgroundColor: 'rgba(241,197,114,0.07)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.accentSoft, padding: SPACING.lg,
  },
  sealedKicker: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.sm, letterSpacing: 3, color: COLORS.accentSecondary },
  sealedBelief: { fontFamily: FONTS.secondary, fontStyle: 'italic', fontSize: FONT_SIZES.md, color: COLORS.offWhite, textAlign: 'center' },
  sealedText: { fontFamily: FONTS.secondary, fontSize: FONT_SIZES.sm, color: COLORS.offWhite, lineHeight: LINE_HEIGHTS.relaxed, textAlign: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.panelOutline },
});
