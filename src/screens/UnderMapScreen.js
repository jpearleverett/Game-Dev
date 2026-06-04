import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from 'react-native';
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
  isMotif,
  mapDepth,
  probeBudgetFor,
  sensedRelations,
  readingChoices,
  flawlessStreak,
  FRAGMENT_KIND,
} from '../data/underMap';
import { parseCaseNumber, formatCaseNumber } from '../data/storyContent';
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

// Kind-bond grammar (see docs/undermap_redesign.md §3.3): soft, learnable hints
// that give the player a REASON to suspect a pair before spending a probe.
const BOND_HINTS = {
  'place|symbol': 'A mark is carved into somewhere — these often bond.',
  'person|phenomenon': 'The wrongness clings to someone — these often bond.',
  'person|place': 'Somewhere remembers someone — these can bond.',
  'phenomenon|symbol': 'The mark is what makes the wrongness — these often bond.',
};
const bondHintFor = (kindA, kindB) => {
  if (!kindA || !kindB) return null;
  if (kindA === kindB) return 'Two of a kind rarely touch directly — but the dark surprises.';
  const key = [kindA, kindB].sort().join('|');
  return BOND_HINTS[key] || 'An unusual pairing — probe it and see.';
};

export default function UnderMapScreen({ navigation, route }) {
  const game = useGame();
  const audio = useAudio();
  const { progress, senseUnderMap, resolveUnderMapReading, recordUnderMapDescent, touchUnderMap } = game;
  const reducedMotion = !!progress?.settings?.reducedMotion;

  // CONNECT beat: when opened as a puzzle gate (A/B subchapters), the Under-Map
  // stands between the scene just read and the next one. Drawing connections is
  // the puzzle; "Continue the descent" generates + advances to the next scene.
  const asPuzzle = !!route?.params?.asPuzzle;
  const gateCaseNumber = route?.params?.caseNumber || progress?.storyCampaign?.activeCaseNumber || null;
  const gateCaseId = route?.params?.caseId || null;
  const [revealsThisVisit, setRevealsThisVisit] = useState(0);
  const [continuing, setContinuing] = useState(false);
  const [genError, setGenError] = useState(null);

  const map = useMemo(
    () => normalizeUnderMap(progress?.storyCampaign?.underMap),
    [progress?.storyCampaign?.underMap],
  );

  useEffect(() => { touchUnderMap?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [slotA, setSlotA] = useState(null);
  const [slotB, setSlotB] = useState(null);
  const [feedback, setFeedback] = useState(null); // { tone:'reveal'|'known'|'none'|'blur', text }
  // Choose-the-truth: { aId, bId, options:[...], unresolved:bool } when a relation is found.
  const [chooser, setChooser] = useState(null);

  // Probe budget for THIS descent (tense-but-forgiving): fixed at entry, never
  // hard-blocks "Continue the descent" when spent — unfound links stay sensed.
  const initialBudgetRef = useRef(null);
  if (initialBudgetRef.current == null) initialBudgetRef.current = Math.max(1, probeBudgetFor(map));
  const [probesLeft, setProbesLeft] = useState(initialBudgetRef.current);
  const [hadMisstep, setHadMisstep] = useState(false);
  // Sensed-assist: after a miss, faintly pulse two fragments that DO share an unfound link.
  const [hintIds, setHintIds] = useState(() => new Set());
  const hintTimer = useRef(null);
  useEffect(() => () => { if (hintTimer.current) clearTimeout(hintTimer.current); }, []);

  const streak = flawlessStreak(map);

  // Reveal + shake animations.
  const reveal = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const linkGlow = useRef(new Animated.Value(0)).current;

  const fragById = useCallback((id) => map.fragments.find((f) => f.id === id) || null, [map.fragments]);
  const remaining = undiscoveredRelationCount(map);
  const depth = mapDepth(map);
  const depthPct = Math.round(depth.ratio * 100);
  const depthLabel = depthPct >= 100 ? 'The hidden world stands revealed'
    : depthPct >= 75 ? 'The shape of it is unmistakable now'
    : depthPct >= 50 ? 'The map is taking shape'
    : depthPct >= 25 ? 'Something is forming in the dark'
    : 'The map runs deeper than this';

  const slotFragA = slotA ? fragById(slotA) : null;
  const slotFragB = slotB ? fragById(slotB) : null;
  const bondHint = slotFragA && slotFragB ? bondHintFor(slotFragA.kind, slotFragB.kind) : null;

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
    setChooser(null);
    if (slotA === id) { setSlotA(null); return; }
    if (slotB === id) { setSlotB(null); return; }
    if (!slotA) { setSlotA(id); return; }
    if (!slotB) { setSlotB(id); return; }
    // both full -> replace B
    setSlotB(id);
  }, [slotA, slotB]);

  const doReveal = useCallback(() => {
    reveal.setValue(0);
    if (reducedMotion) { reveal.setValue(1); return; }
    Animated.spring(reveal, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
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

  // After a wrong probe, faintly mark a real unfound pair so the player isn't lost.
  const pulseAssist = useCallback(() => {
    const sensed = sensedRelations(map);
    if (!sensed.length) return;
    const pick = sensed[Math.floor(Math.random() * sensed.length)];
    setHintIds(new Set([pick.a, pick.b]));
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintIds(new Set()), 2600);
  }, [map]);

  // STEP 1 — probe the pair. A miss spends a probe (tense). A hit opens choose-the-truth (free).
  const attemptProbe = useCallback(() => {
    if (!slotA || !slotB) return;
    const sensed = senseUnderMap?.(slotA, slotB);

    if (sensed?.valid && sensed.alreadyConnected && !sensed.unresolved) {
      setFeedback({ tone: 'known', text: 'Already mapped.' });
      selectionHaptic();
      setSlotA(null); setSlotB(null);
      return;
    }
    if (sensed?.valid && sensed.readings) {
      const options = readingChoices(sensed.readings);
      // No decoys authored (e.g. a prose-derived relation) → there's nothing to
      // deduce; reveal the single truth cleanly rather than faking a choice.
      if (options.length < 2) {
        const res = resolveUnderMapReading?.(slotA, slotB, sensed.readings.correct);
        setSlotA(null); setSlotB(null);
        notificationHaptic(Haptics.NotificationFeedbackType.Success);
        audio?.playVictory?.();
        setFeedback({ tone: 'reveal', text: res?.node?.revelation || sensed.readings.correct });
        if (!res?.alreadyConnected || res?.upgraded) setRevealsThisVisit((n) => n + 1);
        doReveal();
        return;
      }
      // A link is here — now READ it. (Re-reading an unresolved link is free too.)
      selectionHaptic();
      setFeedback(null);
      setChooser({ aId: slotA, bId: slotB, options, unresolved: !!sensed.unresolved });
      return;
    }

    // Miss — the dark doesn't answer. Spend a probe (forgiving: never blocks progress).
    const left = Math.max(0, probesLeft - 1);
    setProbesLeft(left);
    setHadMisstep(true);
    impactHaptic(Haptics.ImpactFeedbackStyle.Rigid);
    setFeedback({
      tone: 'none',
      text: left > 0
        ? `The dark doesn't answer. ${left} probe${left === 1 ? '' : 's'} left.`
        : "The dark goes quiet. You're out of probes — the rest stays sensed for later. Press on when ready.",
    });
    doShake();
    pulseAssist();
    setSlotA(null); setSlotB(null);
  }, [slotA, slotB, senseUnderMap, probesLeft, doShake, pulseAssist]);

  // STEP 2 — commit the chosen reading. Correct = sharp reveal; wrong = blurred (still drawn).
  const chooseReading = useCallback((optionText) => {
    if (!chooser) return;
    const result = resolveUnderMapReading?.(chooser.aId, chooser.bId, optionText);
    setChooser(null);
    setSlotA(null); setSlotB(null);

    if (result?.correctReading) {
      notificationHaptic(Haptics.NotificationFeedbackType.Success);
      audio?.playVictory?.();
      setFeedback({ tone: 'reveal', text: result.node?.revelation || 'The map reveals a truth.' });
      if (!result.alreadyConnected || result.upgraded) setRevealsThisVisit((n) => n + 1);
      doReveal();
    } else {
      impactHaptic(Haptics.ImpactFeedbackStyle.Soft || Haptics.ImpactFeedbackStyle.Light);
      setFeedback({
        tone: 'blur',
        text: "The link holds — but its meaning won't settle. Read the scene again; you can return and re-read it.",
      });
    }
  }, [chooser, resolveUnderMapReading, audio, doReveal]);

  // Generate-first, advance-on-success — mirrors the proven A/B advance contract.
  const handleContinueDescent = useCallback(async () => {
    if (continuing || !asPuzzle || !gateCaseNumber) return;
    setContinuing(true);
    setGenError(null);

    // Record the descent for the flawless-mapping streak BEFORE we leave.
    recordUnderMapDescent?.({ hadMisstep });

    const { chapter, subchapter } = parseCaseNumber(gateCaseNumber);
    const nextCase = subchapter >= 3 ? null : formatCaseNumber(chapter, subchapter + 1);
    const nextPathKey = progress?.storyCampaign?.currentPathKey || 'ROOT';

    try {
      if (nextCase) {
        await game.ensureStoryContent?.(nextCase, nextPathKey);
      }
    } catch (_e) {
      setContinuing(false);
      setGenError('The descent stalled before the next scene took shape. Tap to try again.');
      return;
    }

    game.completeLogicPuzzle?.({ caseId: gateCaseId || game.activeCase?.id, caseNumber: gateCaseNumber, mistakes: 0 });
    navigation.replace('CaseFile', nextCase ? { caseNumber: nextCase } : undefined);
  }, [continuing, asPuzzle, gateCaseNumber, gateCaseId, hadMisstep, recordUnderMapDescent, progress?.storyCampaign?.currentPathKey, game, navigation]);

  const renderSlot = (id, side) => {
    const f = id ? fragById(id) : null;
    const m = f ? metaFor(f.kind) : null;
    return (
      <Animated.View style={[
        styles.slot,
        f && {
          borderColor: m.color,
          backgroundColor: COLORS.surfaceAlt,
          transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) }],
        },
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
  const probeTotal = initialBudgetRef.current;

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
          <SecondaryButton label={asPuzzle ? 'Re-read' : 'Close'} size="compact" onPress={() => navigation.goBack()}
            icon={<MaterialCommunityIcons name={asPuzzle ? 'book-open-variant' : 'close'} size={16} color={COLORS.textSecondary} />} />
        </View>
        <Text style={styles.status}>
          {map.fragments.length} {map.fragments.length === 1 ? 'fragment' : 'fragments'}
          {'  ·  '}{map.nodes.length} revealed
          {remaining > 0 ? `  ·  ${remaining} link${remaining === 1 ? '' : 's'} you can sense` : ''}
        </Text>

        {/* Probe budget + flawless streak */}
        {map.fragments.length > 0 ? (
          <View style={styles.metaRow}>
            <View style={styles.probeWrap}>
              {Array.from({ length: probeTotal }).map((_, i) => (
                <MaterialCommunityIcons
                  key={i}
                  name={i < probesLeft ? 'rhombus' : 'rhombus-outline'}
                  size={13}
                  color={i < probesLeft ? COLORS.accentSecondary : COLORS.textMuted}
                />
              ))}
              <Text style={styles.probeText}>{probesLeft} probe{probesLeft === 1 ? '' : 's'}</Text>
            </View>
            {streak > 0 ? (
              <View style={styles.streakChip}>
                <MaterialCommunityIcons name="fire" size={12} color={COLORS.amberLight || COLORS.accentSecondary} />
                <Text style={styles.streakText}>{streak} flawless</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {depth.total > 0 ? (
          <View style={styles.depthWrap}>
            <View style={styles.depthTrack}>
              <View style={[styles.depthFill, { width: `${Math.max(4, depthPct)}%` }]} />
            </View>
            <Text style={styles.depthLabel}>{depthLabel} · {depthPct}% charted</Text>
          </View>
        ) : null}
      </View>

      {map.fragments.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="map-search-outline" size={28} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>
            Nothing pinned yet. Examine the scenes — the things that don't belong are the threads into the Under-Map.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Connection bench */}
          <Text style={styles.sectionLabel}>PROBE A CONNECTION</Text>
          <View style={styles.bench}>
            {renderSlot(slotA, 'Pick one')}
            <Animated.View style={[styles.link, { backgroundColor: linkColor }]} />
            {renderSlot(slotB, 'Pick another')}
          </View>

          {bondHint && !chooser && !feedback ? (
            <Text style={styles.bondHint}>{bondHint}</Text>
          ) : null}

          {/* STEP 2 — choose-the-truth */}
          {chooser ? (
            <View style={styles.chooserCard}>
              <View style={styles.chooserHeader}>
                <MaterialCommunityIcons name="help-rhombus-outline" size={18} color={COLORS.accentSecondary} />
                <Text style={styles.chooserKicker}>
                  {chooser.unresolved ? 'READ IT AGAIN — WHAT DOES IT MEAN?' : 'A LINK. WHAT DOES IT MEAN?'}
                </Text>
              </View>
              {chooser.options.map((opt, i) => (
                <Pressable
                  key={i}
                  onPress={() => chooseReading(opt)}
                  style={({ pressed }) => [styles.readingOption, pressed && { backgroundColor: COLORS.surfaceAlt }]}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="circle-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.readingText}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          ) : feedback ? (
            feedback.tone === 'reveal' ? (
              <Animated.View style={[styles.revealCard, {
                opacity: reveal.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
                transform: [
                  { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
                  { scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                ],
              }]}>
                <View style={styles.revealHeader}>
                  <MaterialCommunityIcons name="map-marker-star" size={20} color={COLORS.accentSecondary} />
                  <Text style={styles.revealKicker}>THE MAP REVEALS</Text>
                </View>
                <Text style={styles.revealText}>{feedback.text}</Text>
              </Animated.View>
            ) : feedback.tone === 'blur' ? (
              <View style={styles.blurCard}>
                <MaterialCommunityIcons name="blur" size={18} color={COLORS.amberLight || COLORS.accentSecondary} />
                <Text style={styles.blurText}>{feedback.text}</Text>
              </View>
            ) : (
              <Text style={[styles.feedback, feedback.tone === 'none' && styles.feedbackNone]}>{feedback.text}</Text>
            )
          ) : null}

          {!chooser ? (
            <PrimaryButton
              label="Probe"
              onPress={attemptProbe}
              disabled={!slotA || !slotB || probesLeft <= 0}
              icon={<MaterialCommunityIcons name="vector-link" size={18} color={COLORS.textSecondary} />}
              style={{ marginTop: SPACING.md }}
            />
          ) : null}

          {/* Fragments */}
          <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>FRAGMENTS</Text>
          <View style={styles.fragWrap}>
            {map.fragments.map((f) => {
              const m = metaFor(f.kind);
              const selected = f.id === slotA || f.id === slotB;
              const hinted = hintIds.has(f.id);
              const linked = map.connections.some((c) => c.a === f.id || c.b === f.id);
              return (
                <Pressable
                  key={f.id}
                  onPress={() => loadSlot(f.id)}
                  style={[
                    styles.frag,
                    { borderColor: selected ? m.color : (hinted ? COLORS.accentSecondary : COLORS.panelOutline), borderLeftColor: m.color },
                    (selected || hinted) && { backgroundColor: COLORS.surfaceAlt },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.label}: ${f.label}`}
                >
                  <View style={styles.fragTop}>
                    <MaterialCommunityIcons name={m.icon} size={14} color={m.color} />
                    <Text style={[styles.fragKind, { color: m.color }]}>{m.label}</Text>
                    {isMotif(f) ? (
                      <View style={[styles.motifBadge, { marginLeft: 'auto' }]}>
                        <MaterialCommunityIcons name="refresh" size={10} color={COLORS.amberLight || COLORS.accentSecondary} />
                        <Text style={styles.motifText}>×{f.seen}</Text>
                      </View>
                    ) : null}
                    {linked ? <MaterialCommunityIcons name="vector-link" size={12} color={COLORS.accentSecondary} style={{ marginLeft: isMotif(f) ? SPACING.xs : 'auto' }} /> : null}
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
                  <View key={n.id} style={[styles.nodeRow, n.unresolvedReading && styles.nodeRowBlur]}>
                    <MaterialCommunityIcons
                      name={n.unresolvedReading ? 'blur' : 'map-marker-check'}
                      size={16}
                      color={n.unresolvedReading ? COLORS.textMuted : COLORS.accentSecondary}
                    />
                    <Text style={[styles.nodeText, n.unresolvedReading && styles.nodeTextBlur]}>
                      {n.unresolvedReading ? 'A link you haven’t read true yet — re-read it to settle its meaning.' : n.revelation}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {remaining > 0 ? (
            <Text style={styles.deeper}>The map runs deeper. {remaining} link{remaining === 1 ? '' : 's'} wait to be drawn.</Text>
          ) : null}
        </ScrollView>
      )}

      {asPuzzle ? (
        <View style={styles.gateFooter}>
          <Text style={styles.gateHint}>
            {revealsThisVisit > 0
              ? `${revealsThisVisit} new ${revealsThisVisit === 1 ? 'truth' : 'truths'} drawn. The way down is open.`
              : remaining > 0
                ? 'Probe a connection to pull the map open — or press on into the dark.'
                : 'Nothing new to link here yet. Press on.'}
          </Text>
          {genError ? <Text style={styles.gateError}>{genError}</Text> : null}
          <PrimaryButton
            label={continuing ? 'Descending…' : genError ? 'Retry' : 'Continue the descent'}
            onPress={handleContinueDescent}
            disabled={continuing}
            icon={<MaterialCommunityIcons name="stairs-down" size={18} color={COLORS.textSecondary} />}
          />
        </View>
      ) : null}
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: SPACING.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kickerWrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  kicker: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.sm, letterSpacing: 3, color: COLORS.accentSecondary },
  status: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: SPACING.xs, letterSpacing: 0.5 },
  // Probe meter + streak
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.sm },
  probeWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  probeText: { fontFamily: FONTS.monoBold, fontSize: 10, letterSpacing: 0.5, color: COLORS.textSecondary, marginLeft: SPACING.xs },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(241,197,114,0.12)' },
  streakText: { fontFamily: FONTS.monoBold, fontSize: 9, letterSpacing: 0.5, color: COLORS.amberLight || COLORS.accentSecondary },
  // Map depth ("the map is taking shape")
  depthWrap: { marginTop: SPACING.sm, gap: 4 },
  depthTrack: { height: 4, borderRadius: 2, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
  depthFill: { height: 4, borderRadius: 2, backgroundColor: COLORS.accentSecondary },
  depthLabel: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.amberLight || COLORS.accentSecondary, fontStyle: 'italic', letterSpacing: 0.3 },
  // Motif badge
  motifBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, backgroundColor: 'rgba(241,197,114,0.12)' },
  motifText: { fontFamily: FONTS.monoBold, fontSize: 9, letterSpacing: 0.5, color: COLORS.amberLight || COLORS.accentSecondary },
  scroll: { flex: 1 },
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
  link: {
    width: 28, height: 3, borderRadius: 2,
    shadowColor: COLORS.bloodRed, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  bondHint: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.accentCyan, fontStyle: 'italic', marginTop: SPACING.sm, lineHeight: LINE_HEIGHTS.cozy },
  // Choose-the-truth
  chooserCard: {
    marginTop: SPACING.md, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.accentSoft, padding: SPACING.md, gap: SPACING.sm,
  },
  chooserHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  chooserKicker: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.xs, letterSpacing: 2, color: COLORS.accentSecondary, flex: 1 },
  readingOption: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.panelOutline, padding: SPACING.md,
  },
  readingText: { flex: 1, fontFamily: FONTS.secondary, fontSize: FONT_SIZES.sm, color: COLORS.offWhite, lineHeight: LINE_HEIGHTS.cozy },
  // Reveal
  revealCard: {
    marginTop: SPACING.md, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.accentSoft, padding: SPACING.lg, gap: SPACING.sm,
  },
  revealHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  revealKicker: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.sm, letterSpacing: 3, color: COLORS.accentSecondary },
  revealText: { fontFamily: FONTS.secondary, fontSize: FONT_SIZES.md, color: COLORS.offWhite, lineHeight: LINE_HEIGHTS.relaxed },
  // Blurred (wrong reading)
  blurCard: {
    marginTop: SPACING.md, flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: 'rgba(241,197,114,0.06)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(241,197,114,0.22)', padding: SPACING.md,
  },
  blurText: { flex: 1, fontFamily: FONTS.secondary, fontStyle: 'italic', fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: LINE_HEIGHTS.cozy },
  feedback: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.md, lineHeight: LINE_HEIGHTS.cozy },
  feedbackNone: { color: COLORS.textMuted, fontStyle: 'italic' },
  // Fragments
  fragWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  frag: {
    width: '47%', flexGrow: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderLeftWidth: 3, borderColor: COLORS.panelOutline, padding: SPACING.md, gap: 4,
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
  nodeRowBlur: { backgroundColor: 'rgba(157,150,141,0.06)', borderColor: COLORS.panelOutline },
  nodeText: { flex: 1, fontFamily: FONTS.secondary, fontSize: FONT_SIZES.sm, color: COLORS.offWhite, lineHeight: LINE_HEIGHTS.cozy },
  nodeTextBlur: { color: COLORS.textMuted, fontStyle: 'italic' },
  deeper: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: SPACING.lg },
  // Puzzle gate footer
  gateFooter: {
    paddingTop: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.panelOutline,
  },
  gateHint: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.textMuted, textAlign: 'center', lineHeight: LINE_HEIGHTS.cozy },
  gateError: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.bloodRed, textAlign: 'center' },
  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg },
  emptyText: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: LINE_HEIGHTS.relaxed },
});
