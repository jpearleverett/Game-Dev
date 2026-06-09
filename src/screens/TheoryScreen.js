import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Line as SvgLine, Circle as SvgCircle } from 'react-native-svg';
import ScreenSurface from '../components/ScreenSurface';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import DustLayer from '../components/DustLayer';
import Celebration from '../components/Celebration';
import PressableScale from '../components/PressableScale';
import Reveal from '../components/motion/Reveal';
import { useGame } from '../context/GameContext';
import { useAudio } from '../context/AudioContext';
import { selectionHaptic, notificationHaptic, impactHaptic, Haptics } from '../utils/haptics';
import { normalizeUnderMap, FRAGMENT_KIND, isMotif, clarity, endingVariant, recordTheory as umRecordTheory } from '../data/underMap';
import { selectEnding } from '../data/endings';
import { TOTAL_CHAPTERS } from '../services/storyGeneration/constants';
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
  [FRAGMENT_KIND.PERSON]: { icon: 'account-outline', color: COLORS.kindPerson },
  [FRAGMENT_KIND.PHENOMENON]: { icon: 'shimmer', color: COLORS.accentViolet },
};
const metaFor = (kind) => KIND_META[kind] || KIND_META[FRAGMENT_KIND.PHENOMENON];

// Per-belief tone (the design cycles amber → violet → cyan across the cards).
const BELIEF_TONES = [COLORS.amberLight, COLORS.underViolet, COLORS.underCyan];
const toneFor = (i) => BELIEF_TONES[i % BELIEF_TONES.length];

/** A small staked-fragment constellation glyph, tone-colored (design's belief-glyph). */
function BeliefGlyph({ tone, on }) {
  const pts = [
    { x: 26, y: 10 }, { x: 42, y: 34 }, { x: 10, y: 34 },
  ];
  return (
    <Svg width={52} height={52}>
      {pts.map((p, i) => {
        const q = pts[(i + 1) % pts.length];
        return <SvgLine key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={on ? 'rgba(220,225,255,0.6)' : 'rgba(160,160,180,0.3)'} strokeWidth="1" />;
      })}
      {pts.map((p, i) => (
        <SvgCircle key={`c${i}`} cx={p.x} cy={p.y} r={on ? 3 : 2.4} fill={tone} opacity={on ? 1 : 0.7} />
      ))}
    </Svg>
  );
}

export default function TheoryScreen({ navigation, route }) {
  const game = useGame();
  const audio = useAudio();
  const {
    progress,
    recordUnderMapTheory,
    completeLogicPuzzle,
    selectDecisionBeforePuzzle,
    prefetchTheoryBranches,
    unlockEnding,
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

  // CLARITY (Move 3): how truly the player has read the hidden world so far, and
  // the most recent belief the story has borne out or subverted.
  const cl = useMemo(() => clarity(map), [map]);
  const variant = useMemo(() => endingVariant(map), [map]);
  const lastResolved = useMemo(() => map.theories.find((t) => t.correct != null) || null, [map.theories]);
  const clarityLabel = variant === 'clear' ? 'You are reading the Under-Map true.'
    : variant === 'half' ? 'You see some of it; the rest stays warped.'
    : variant === 'deceived' ? 'The hidden world is wearing the shape you want.'
    : 'No belief has been borne out yet.';

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
  const [expanded, setExpanded] = useState(() => new Set()); // fragments whose clue is opened
  const [sealed, setSealed] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [genError, setGenError] = useState(null);

  const sealAnim = useRef(new Animated.Value(0)).current;
  const chosenBelief = beliefs.find((b) => b.key === beliefKey) || null;
  const prefetchKeyRef = useRef(null);

  const buildTheoryMapForBelief = useCallback((belief) => {
    if (!belief) return map;
    const fragmentIds = map.fragments.map((f) => f.id);
    if (!fragmentIds.length) return map;
    const interpretation = belief.title || belief.focus || 'A reading of the hidden world.';
    const rejected = beliefs
      .filter((b) => b && b.key !== belief.key)
      .map((b) => b.title || b.focus || '')
      .filter(Boolean);
    return umRecordTheory(map, { chapter, fragmentIds, interpretation, rejected });
  }, [beliefs, chapter, map]);

  useEffect(() => {
    if (!caseNumber || !beliefs.length || chapter >= TOTAL_CHAPTERS) return;
    if (typeof prefetchTheoryBranches !== 'function') return;
    const key = `${caseNumber}:${beliefs.map((b) => `${b.key}:${b.title || b.focus || ''}`).join('|')}:${map.fragments.length}:${map.theories.length}`;
    if (prefetchKeyRef.current === key) return;
    prefetchKeyRef.current = key;
    const underMapByOption = {};
    beliefs.forEach((belief) => {
      if (belief?.key) underMapByOption[belief.key] = buildTheoryMapForBelief(belief);
    });
    prefetchTheoryBranches(caseNumber, underMapByOption);
  }, [beliefs, buildTheoryMapForBelief, caseNumber, chapter, map.fragments.length, map.theories.length, prefetchTheoryBranches]);

  // Evidence is read-only reference: tapping a fragment expands its full clue to help
  // the player weigh their reading. It is NOT staked/graded — the belief is the choice.
  const toggleExpand = useCallback((id) => {
    selectionHaptic();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const sealTheory = useCallback(() => {
    if (sealed) return;
    // A belief must be chosen (when options exist) — it IS the chapter decision.
    if (beliefs.length && !chosenBelief) {
      impactHaptic(Haptics.ImpactFeedbackStyle.Rigid);
      setGenError('Choose what you believe before you seal it.');
      return;
    }
    // All collected fragments are recorded with the sealed reading (for the record /
    // Codex). There is no player-facing staking — evidence is reference, not a choice.
    const fragmentIds = map.fragments.map((f) => f.id);
    const interpretation = chosenBelief?.title || chosenBelief?.focus || 'A reading of the hidden world.';
    // The readings the player turned away from — these seed "The Other Reader" (the
    // foil born from the road not taken). underMap.recordTheory takes the strongest.
    const rejected = beliefs
      .filter((b) => b && b.key !== chosenBelief?.key)
      .map((b) => b.title || b.focus || '')
      .filter(Boolean);
    const sealedMap = chosenBelief ? buildTheoryMapForBelief(chosenBelief) : map;

    // The belief is the chapter decision: store it as the pre-decision (drives the
    // branch into the next chapter) AND record it on the Under-Map as a sealed theory.
    selectDecisionBeforePuzzle?.(
      chosenBelief?.key || 'A',
      { title: chosenBelief?.title, focus: chosenBelief?.focus },
      caseNumber,
      { underMap: sealedMap },
    );
    if (fragmentIds.length) {
      recordUnderMapTheory?.({ chapter, fragmentIds, interpretation, rejected });
    }

    setGenError(null);
    notificationHaptic(Haptics.NotificationFeedbackType.Success);
    audio?.playVictory?.();
    setSealed(true);
    sealAnim.setValue(0);
    if (reducedMotion) { sealAnim.setValue(1); }
    else { Animated.spring(sealAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start(); }
  }, [sealed, beliefs, chosenBelief, map, buildTheoryMapForBelief, selectDecisionBeforePuzzle, caseNumber, recordUnderMapTheory, chapter, audio, sealAnim, reducedMotion]);

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

    // FINALE (Move 3, §5): after the last chapter's belief is sealed there is no
    // chapter to generate — the clarity spectrum decides which ending is reached.
    const sealedChapter = parseCaseNumber(caseNumber).chapter;
    if (sealedChapter >= TOTAL_CHAPTERS) {
      const ending = selectEnding(map);
      unlockEnding?.(ending.id, {
        variant: ending.variant,
        clarityRatio: ending.clarity?.ratio ?? 0,
        finalChapter: sealedChapter,
      });
      navigation.replace('Ending', { ending });
      return;
    }

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
    // Cross via the wax-seal chapter-close (design's Sealed screen).
    navigation.replace('Sealed', {
      beliefTitle: chosenBelief?.title || (map.theories[0] && map.theories[0].interpretation) || null,
      chapter: sealedChapter,
      nextCaseNumber,
    });
  }, [continuing, caseNumber, caseId, map, chosenBelief, unlockEnding, storyCampaign.preDecision, storyCampaign.choiceHistory, game, completeLogicPuzzle, navigation]);

  const sealScale = sealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const sealOpacity = sealAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] });

  return (
    <ScreenSurface variant="default" glow="violet">
      {!reducedMotion ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}><DustLayer /></View>
      ) : null}
      {/* light-shaft from above — the threshold (design) */}
      <View pointerEvents="none" style={styles.lightShaft} />

      <View style={styles.header}>
        <View style={styles.kickerRow}>
          <MaterialCommunityIcons name="eye-circle-outline" size={18} color={COLORS.underViolet} />
          <Text style={styles.kicker}>THE THEORY{chapter ? ` · CHAPTER ${chapter}` : ''}</Text>
        </View>
        <Text style={styles.title}>What do you believe?</Text>
        <Text style={styles.lede}>
          Choose what you believe is really happening beneath Ashport. The chapter ahead bears your reading out — or subverts it — and steers where the story goes.
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* How the LAST belief was borne out, and the player's running Clarity */}
        {lastResolved ? (
          <View style={[styles.resolvedCard, lastResolved.correct ? styles.resolvedTrue : styles.resolvedFalse]}>
            <View style={styles.resolvedHeader}>
              <MaterialCommunityIcons
                name={lastResolved.correct ? 'check-decagram-outline' : 'alert-decagram-outline'}
                size={16}
                color={lastResolved.correct ? COLORS.accentSecondary : COLORS.bloodRed}
              />
              <Text style={styles.resolvedKicker}>{lastResolved.correct ? 'YOUR LAST READING HELD TRUE' : 'YOUR LAST READING WAS SUBVERTED'}</Text>
            </View>
            {lastResolved.interpretation ? <Text style={styles.resolvedBelief}>“{lastResolved.interpretation}”</Text> : null}
          </View>
        ) : null}

        {cl.resolved > 0 ? (
          <View style={styles.clarityRow}>
            <MaterialCommunityIcons name="eye-outline" size={14} color={COLORS.accentSecondary} />
            <Text style={styles.clarityText}>
              Clarity: {cl.correct} of {cl.resolved} readings held true · {clarityLabel}
            </Text>
          </View>
        ) : null}

        {/* What the map has revealed so far (context for the choice; full list in the Codex) */}
        {map.nodes.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>WHAT THE MAP HAS REVEALED</Text>
            <Text style={styles.sectionHint}>The truths you've pulled from the Under-Map — what your reading rests on.</Text>
            <View style={styles.nodeList}>
              {map.nodes.slice(0, 3).map((n) => (
                <View key={n.id} style={styles.nodeRow}>
                  <MaterialCommunityIcons name="map-marker-star" size={15} color={COLORS.accentSecondary} />
                  <Text style={styles.nodeText}>{n.revelation}</Text>
                </View>
              ))}
              {map.nodes.length > 3 ? (
                <Text style={styles.nodeMore}>+{map.nodes.length - 3} more truth{map.nodes.length - 3 === 1 ? '' : 's'} you've uncovered</Text>
              ) : null}
            </View>
          </>
        ) : null}

        {/* YOUR EVIDENCE — read-only reference to weigh BEFORE the choice. Tap to read a clue. */}
        <Text style={[styles.sectionLabel, { marginTop: map.nodes.length ? SPACING.lg : 0 }]}>YOUR EVIDENCE</Text>
        {map.fragments.length === 0 ? (
          <Text style={styles.muted}>You collected no fragments this chapter — the map stays dark. You can still commit a read.</Text>
        ) : (
          <>
            <Text style={styles.sectionHint}>Everything you've gathered. Tap a fragment to re-read its clue, then choose your reading below.</Text>
            <View style={styles.fragWrap}>
              {map.fragments.map((f) => {
                const m = metaFor(f.kind);
                const open = expanded.has(f.id);
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => toggleExpand(f.id)}
                    style={[styles.frag, { borderLeftColor: m.color, borderColor: COLORS.panelOutline }]}
                    accessibilityRole="button"
                    accessibilityLabel={f.label}
                    accessibilityHint="Tap to read the full clue"
                  >
                    <View style={styles.fragTop}>
                      <MaterialCommunityIcons name={m.icon} size={14} color={m.color} />
                      {isMotif(f) ? (
                        <View style={[styles.motifBadge, { marginLeft: 'auto' }]}>
                          <MaterialCommunityIcons name="refresh" size={10} color={COLORS.amberLight || COLORS.accentSecondary} />
                          <Text style={styles.motifText}>×{f.seen}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.fragLabel}>{f.label}</Text>
                    {f.detail ? <Text style={styles.fragDetail} numberOfLines={open ? undefined : 2}>{f.detail}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* WHAT DO YOU BELIEVE? — the chapter's one decision, the climax (last, above SEAL) */}
        <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>WHAT DO YOU BELIEVE?</Text>
        {beliefs.length > 0 ? (
          <Text style={styles.sectionHint}>Your one real choice. The chapter ahead bears it out — or subverts it.</Text>
        ) : null}
        {beliefs.length === 0 ? (
          <Text style={styles.muted}>The way forward is yours to take. Seal your read and press on.</Text>
        ) : (
          <View style={styles.beliefList}>
            {beliefs.map((b, bi) => {
              const active = b.key === beliefKey;
              const tone = toneFor(bi);
              const body = b.focus || b.consequence;
              return (
                <Reveal key={b.key} index={bi} reducedMotion={reducedMotion} distance={10}>
                <PressableScale
                  reducedMotion={reducedMotion}
                  onPress={() => { if (!sealed) { setBeliefKey(b.key); setGenError(null); } }}
                  disabled={sealed}
                  style={[styles.beliefCard, active && { borderColor: tone, backgroundColor: `${tone}1f` }, sealed && !active && { opacity: 0.4 }]}
                  accessibilityLabel={b.title || 'A reading of the hidden world'}
                >
                  <View style={styles.beliefTop}>
                    <BeliefGlyph tone={tone} on={active} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.beliefTitle, active && { color: COLORS.offWhite }]}>{b.title || 'A reading of the hidden world'}</Text>
                      {!active ? <Text style={styles.beliefHint}>TAP TO WEIGH THIS READING</Text> : null}
                    </View>
                    <Text style={[styles.beliefMark, { color: tone, textShadowColor: tone }]}>{active ? '◆' : '◇'}</Text>
                  </View>
                  {active && body ? (
                    <Text style={styles.beliefBody}>{body}</Text>
                  ) : null}
                </PressableScale>
                </Reveal>
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

      {/* Committing a belief is the chapter's weight-bearing moment — mark it. */}
      <Celebration active={sealed} reducedMotion={reducedMotion} count={48} />
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: SPACING.sm },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  kicker: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.sm, letterSpacing: 3, color: COLORS.underViolet },
  title: { fontFamily: FONTS.secondaryBold, fontSize: FONT_SIZES.title, color: '#f3eeff', marginTop: SPACING.sm, textShadowColor: COLORS.underGlow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 26 },
  lede: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, lineHeight: LINE_HEIGHTS.cozy },
  scroll: { flex: 1 },
  body: { paddingVertical: SPACING.md, paddingBottom: SPACING.xl },
  sectionLabel: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.xs, letterSpacing: 3, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  sectionHint: { fontFamily: FONTS.primary, fontSize: 11.5, color: COLORS.textMuted, marginTop: -SPACING.xs, marginBottom: SPACING.sm, lineHeight: 16 },
  nodeMore: { fontFamily: FONTS.mono, fontSize: 10.5, letterSpacing: 0.4, color: COLORS.textSubtle, marginTop: 2, marginLeft: 22 },
  // Clarity / belief resolution (Move 3)
  resolvedCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md, gap: SPACING.xs, marginBottom: SPACING.sm },
  resolvedTrue: { backgroundColor: 'rgba(241,197,114,0.07)', borderColor: COLORS.accentSoft },
  resolvedFalse: { backgroundColor: 'rgba(196,62,96,0.08)', borderColor: 'rgba(196,62,96,0.35)' },
  resolvedHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  resolvedKicker: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.xs, letterSpacing: 2, color: COLORS.textSecondary },
  resolvedBelief: { fontFamily: FONTS.secondary, fontStyle: 'italic', fontSize: FONT_SIZES.sm, color: COLORS.offWhite, lineHeight: LINE_HEIGHTS.cozy },
  clarityRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.lg },
  clarityText: { flex: 1, fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontStyle: 'italic', lineHeight: LINE_HEIGHTS.cozy },
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
    backgroundColor: 'rgba(34,28,52,0.5)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(167,139,250,0.16)',
    padding: 17, gap: SPACING.xs,
  },
  beliefCardActive: { borderColor: COLORS.underViolet, backgroundColor: 'rgba(167,139,250,0.12)' },
  beliefTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  beliefTitle: { fontFamily: FONTS.secondaryBold, fontSize: 18, lineHeight: 21, color: COLORS.textPrimary },
  beliefHint: { fontFamily: FONTS.mono, fontSize: 9.5, letterSpacing: 1.2, color: COLORS.textSubtle, textTransform: 'uppercase', marginTop: 4 },
  beliefMark: { fontSize: 16, marginLeft: 6, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  beliefBody: { fontFamily: FONTS.primary, fontSize: 13.5, lineHeight: 22, color: COLORS.textSecondary, marginTop: 12 },
  lightShaft: { position: 'absolute', top: -60, alignSelf: 'center', width: 260, height: 360, borderRadius: 180, backgroundColor: 'rgba(167,139,250,0.08)' },
  // Fragments
  fragWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  frag: {
    width: '47%', flexGrow: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderLeftWidth: 3, borderColor: COLORS.panelOutline, padding: SPACING.md, gap: 4,
  },
  fragTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  motifBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, backgroundColor: 'rgba(241,197,114,0.12)' },
  motifText: { fontFamily: FONTS.monoBold, fontSize: 9, letterSpacing: 0.5, color: COLORS.amberLight || COLORS.accentSecondary },
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
