import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import Svg, { Path, Ellipse, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import ScreenSurface from '../components/ScreenSurface';
import { useGame } from '../context/GameContext';
import { useAudio } from '../context/AudioContext';
import { selectionHaptic, impactHaptic, notificationHaptic, Haptics } from '../utils/haptics';
import {
  normalizeUnderMap,
  undiscoveredRelationCount,
  sensedRelations,
  readingChoices,
  flawlessStreak,
  mapDepth,
  probeBudgetFor,
  FRAGMENT_KIND,
} from '../data/underMap';
import { parseCaseNumber, formatCaseNumber } from '../data/storyContent';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';

const KIND_COLOR = {
  [FRAGMENT_KIND.SYMBOL]: COLORS.kindSymbol,
  [FRAGMENT_KIND.PLACE]: COLORS.kindPlace,
  [FRAGMENT_KIND.PERSON]: COLORS.kindPerson,
  [FRAGMENT_KIND.PHENOMENON]: COLORS.kindPhenomenon,
};
const colorFor = (k) => KIND_COLOR[k] || COLORS.underViolet;

const hash01 = (str, salt = 0) => {
  let h = (2166136261 ^ salt) >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
};
const fragNorm = (f) => {
  if (f?.pos && Number.isFinite(f.pos.nx) && Number.isFinite(f.pos.ny)) return { nx: f.pos.nx, ny: f.pos.ny };
  return { nx: 0.12 + hash01(f.id, 1) * 0.76, ny: 0.12 + hash01(f.id, 2) * 0.76 };
};

/** Twinkling starfield backdrop. */
function Starfield({ reducedMotion }) {
  const stars = useMemo(
    () => Array.from({ length: 46 }).map((_, i) => ({
      key: i,
      left: `${((i * 2654435761) % 10000) / 100}%`,
      top: `${((i * 40503) % 9973) / 99.73}%`,
      size: 0.8 + ((i * 7) % 18) / 10,
      dur: 2400 + ((i * 311) % 4000),
      delay: (i * 137) % 6000,
    })),
    [],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map(({ key, ...rest }) => <Twinkle key={key} {...rest} reducedMotion={reducedMotion} />)}
    </View>
  );
}
function Twinkle({ left, top, size, dur, delay, reducedMotion }) {
  const o = useRef(new Animated.Value(reducedMotion ? 0.5 : 0.2)).current;
  useEffect(() => {
    if (reducedMotion) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 0.9, duration: dur / 2, delay, useNativeDriver: true }),
      Animated.timing(o, { toValue: 0.2, duration: dur / 2, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [o, dur, delay, reducedMotion]);
  return (
    <Animated.View style={{ position: 'absolute', left, top, width: size, height: size, borderRadius: size, backgroundColor: '#eae4ff', opacity: o }} />
  );
}

export default function UnderMapScreen({ navigation, route }) {
  const game = useGame();
  const audio = useAudio();
  const {
    progress, senseUnderMap, resolveUnderMapReading, recordUnderMapDescent, touchUnderMap,
    drawUnderMapDailyStir,
  } = game;
  const reducedMotion = !!progress?.settings?.reducedMotion;

  const asPuzzle = !!route?.params?.asPuzzle;
  const gateCaseNumber = route?.params?.caseNumber || progress?.storyCampaign?.activeCaseNumber || null;
  const gateCaseId = route?.params?.caseId || null;

  const map = useMemo(() => normalizeUnderMap(progress?.storyCampaign?.underMap), [progress?.storyCampaign?.underMap]);

  // Spread fragments across the field like the design's star-field — a stable
  // golden-angle (sunflower) distribution so stars fill the space evenly and
  // never bunch up. Stable: keyed by sorted id, independent of collection order.
  const placed = useMemo(() => {
    const frags = [...map.fragments].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const N = Math.max(1, frags.length);
    const GA = Math.PI * (3 - Math.sqrt(5));
    const byId = {};
    frags.forEach((f, i) => {
      const r = Math.sqrt((i + 0.5) / N) * (N <= 1 ? 0 : 0.42);
      const th = i * GA;
      byId[f.id] = {
        nx: Math.min(0.9, Math.max(0.1, 0.5 + r * Math.cos(th))),
        ny: Math.min(0.9, Math.max(0.12, 0.46 + r * Math.sin(th))),
      };
    });
    return byId;
  }, [map.fragments]);

  useEffect(() => { touchUnderMap?.(); drawUnderMapDailyStir?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [field, setField] = useState({ w: 0, h: 0 });
  const [selected, setSelected] = useState([]);
  const [node, setNode] = useState(null); // { aId, bId, mode:'choose'|'revealed'|'blurred', options, revelation }
  const [inspect, setInspect] = useState(null); // a fragment the player is reading (the full clue)
  // Probe economy (§3.1): a per-descent budget of attempts. A wrong pair costs a
  // probe; correct pairs are free. Running out never blocks "Continue" — unfound
  // links stay sensed for a later visit. Budget is fixed at descent start.
  const [probeBudget] = useState(() => probeBudgetFor(map));
  const [probesUsed, setProbesUsed] = useState(0);
  const probesLeft = Math.max(0, probeBudget - probesUsed);
  const [toast, setToast] = useState(null);
  const [revealsThisVisit, setRevealsThisVisit] = useState(0);
  const [continuing, setContinuing] = useState(false);
  const [genError, setGenError] = useState(null);
  const hadMisstepRef = useRef(false);
  const lockRef = useRef(false);
  const toastTimer = useRef(null);

  const shake = useRef(new Animated.Value(0)).current;
  const bloom = useRef(new Animated.Value(0)).current;
  const [bloomAt, setBloomAt] = useState(null);
  const ringPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) return undefined;
    const loop = Animated.loop(Animated.timing(ringPulse, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [ringPulse, reducedMotion]);
  const ringScale = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.5] });
  const ringOpacity = ringPulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.4, 0] });

  const remaining = undiscoveredRelationCount(map);
  const depth = mapDepth(map);
  const streak = flawlessStreak(map);
  const beat = gateCaseNumber ? gateCaseNumber.slice(3, 4) : 'A';

  const fragById = useCallback((id) => map.fragments.find((f) => f.id === id) || null, [map.fragments]);
  const posPx = useCallback((id) => {
    const p = placed[id];
    if (!p || !field.w) return { x: 0, y: 0 };
    return { x: p.nx * field.w, y: p.ny * field.h };
  }, [placed, field]);

  const arcPath = useCallback((aId, bId) => {
    const a = posPx(aId); const b = posPx(bId);
    const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
    const dx = b.x - a.x; const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len; const ny = dx / len;
    const bow = Math.min(40, len * 0.17);
    return `M ${a.x} ${a.y} Q ${mx + nx * bow} ${my + ny * bow} ${b.x} ${b.y}`;
  }, [posPx]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1700);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

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

  const triggerBloom = useCallback((aId, bId) => {
    const a = posPx(aId); const b = posPx(bId);
    setBloomAt({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    bloom.setValue(0);
    if (reducedMotion) { setBloomAt(null); return; }
    Animated.timing(bloom, { toValue: 1, duration: 760, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      .start(() => setBloomAt(null));
  }, [posPx, bloom, reducedMotion]);

  const evaluate = useCallback((pair) => {
    const sensed = senseUnderMap?.(pair[0], pair[1]);
    if (sensed?.valid && sensed.alreadyConnected && !sensed.unresolved) {
      showToast('Already mapped — this truth is known.');
      setSelected([]); lockRef.current = false;
      return;
    }
    if (sensed?.valid && sensed.readings) {
      selectionHaptic();
      const options = readingChoices(sensed.readings);
      if (options.length < 2) {
        // No decoys → reveal directly (matches the design's tap-connect-reveal).
        const res = resolveUnderMapReading?.(pair[0], pair[1], sensed.readings.correct);
        triggerBloom(pair[0], pair[1]);
        notificationHaptic(Haptics.NotificationFeedbackType.Success);
        audio?.playVictory?.();
        setRevealsThisVisit((n) => n + 1);
        setTimeout(() => {
          setNode({ aId: pair[0], bId: pair[1], mode: 'revealed', revelation: res?.node?.revelation || sensed.readings.correct });
          setSelected([]); lockRef.current = false;
        }, 480);
        return;
      }
      setNode({ aId: pair[0], bId: pair[1], mode: 'choose', options, unresolved: !!sensed.unresolved });
      lockRef.current = false;
      return;
    }
    // No resonance — a wrong probe costs one from the budget.
    hadMisstepRef.current = true;
    setProbesUsed((n) => n + 1);
    const left = Math.max(0, probeBudget - (probesUsed + 1));
    impactHaptic(Haptics.ImpactFeedbackStyle.Rigid);
    doShake();
    showToast(left > 0
      ? `The dark doesn't answer. ${left} probe${left === 1 ? '' : 's'} left.`
      : 'The dark falls silent. The rest stays sensed — continue the descent.');
    setSelected([]); lockRef.current = false;
  }, [senseUnderMap, resolveUnderMapReading, showToast, doShake, triggerBloom, audio, probeBudget, probesUsed]);

  const handleTapStar = useCallback((id) => {
    if (node || lockRef.current) return;
    setSelected((sel) => {
      if (sel.includes(id)) return sel.filter((s) => s !== id);
      if (sel.length >= 2) return sel;
      // Forming a pair (the probe) requires an unspent probe. Out of probes never
      // blocks the descent — it just stops further guessing this visit.
      if (sel.length === 1 && probesLeft <= 0) {
        showToast('Out of probes. The rest stays sensed — continue the descent.');
        return sel;
      }
      const next = [...sel, id];
      if (next.length === 2) {
        lockRef.current = true;
        setTimeout(() => evaluate(next), 300);
      } else {
        selectionHaptic();
      }
      return next;
    });
  }, [node, evaluate, probesLeft, showToast]);

  const chooseReading = useCallback((opt) => {
    if (!node) return;
    const res = resolveUnderMapReading?.(node.aId, node.bId, opt);
    if (res?.correctReading) {
      triggerBloom(node.aId, node.bId);
      notificationHaptic(Haptics.NotificationFeedbackType.Success);
      audio?.playVictory?.();
      if (!res.alreadyConnected || res.upgraded) setRevealsThisVisit((n) => n + 1);
      setNode((nd) => ({ ...nd, mode: 'revealed', revelation: res.node?.revelation || '' }));
    } else {
      hadMisstepRef.current = true;
      impactHaptic(Haptics.ImpactFeedbackStyle.Soft || Haptics.ImpactFeedbackStyle.Light);
      setNode((nd) => ({ ...nd, mode: 'blurred' }));
    }
  }, [node, resolveUnderMapReading, triggerBloom, audio]);

  const closeNode = useCallback(() => { setNode(null); setSelected([]); }, []);

  const handleContinue = useCallback(async () => {
    if (continuing || !asPuzzle || !gateCaseNumber) return;
    setContinuing(true); setGenError(null);
    if (hadMisstepRef.current || revealsThisVisit > 0) recordUnderMapDescent?.({ hadMisstep: hadMisstepRef.current });
    const { chapter, subchapter } = parseCaseNumber(gateCaseNumber);
    const nextCase = subchapter >= 3 ? null : formatCaseNumber(chapter, subchapter + 1);
    const nextPathKey = progress?.storyCampaign?.currentPathKey || 'ROOT';
    try {
      if (nextCase) await game.ensureStoryContent?.(nextCase, nextPathKey);
    } catch (_e) {
      setContinuing(false);
      setGenError('The descent stalled before the next scene took shape. Tap to try again.');
      return;
    }
    game.completeLogicPuzzle?.({ caseId: gateCaseId || game.activeCase?.id, caseNumber: gateCaseNumber, mistakes: 0 });
    navigation.replace('CaseFile', nextCase ? { caseNumber: nextCase } : undefined);
  }, [continuing, asPuzzle, gateCaseNumber, gateCaseId, revealsThisVisit, recordUnderMapDescent, progress?.storyCampaign?.currentPathKey, game, navigation]);

  const connectionList = map.connections;
  const selArc = selected.length === 2 && field.w ? arcPath(selected[0], selected[1]) : null;
  const shakeX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });
  const bloomScale = bloom.interpolate({ inputRange: [0, 1], outputRange: [0.2, 26] });
  const bloomOpacity = bloom.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] });
  const depthPct = Math.round(depth.ratio * 100);
  // Forgiving rule (§3.1): out of probes still advances the story.
  const canContinue = revealsThisVisit > 0 || remaining === 0 || probesLeft <= 0;
  const probeMeter = probeBudget <= 7
    ? '◆'.repeat(probesLeft) + '◇'.repeat(Math.max(0, probeBudget - probesLeft))
    : `${probesLeft}/${probeBudget}`;

  return (
    <ScreenSurface variant="default" glow="violet" frameless contentStyle={styles.surface}>
      <Starfield reducedMotion={reducedMotion} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headRow}>
          <Text style={styles.kickerCyan}>◇ DESCENDED · THE LAYER BENEATH</Text>
          <Text style={styles.kicker}>{(gateCaseNumber || '001A').slice(0, 3)} · {beat}</Text>
        </View>
        <Text style={styles.umTitle}>The Under-Map</Text>
        <Text style={styles.umInstr}>
          Trace a line between two fragments that belong together. A true pair surfaces a <Text style={{ color: COLORS.underCyan }}>node</Text> — a truth that does not want to be seen. <Text style={styles.umInstrHold}>Hold a fragment to read its clue.</Text>
        </Text>
        {map.fragments.length > 0 ? (
          <View style={styles.probeRow}>
            <Text style={[styles.probeGlyphs, probesLeft <= 1 && styles.probeGlyphsLow]}>{probeMeter}</Text>
            <Text style={styles.probeLabel}>
              {probesLeft === 0 ? 'no probes · the rest stays sensed' : `${probesLeft} probe${probesLeft === 1 ? '' : 's'} — a wrong link costs one`}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Constellation field */}
      <Animated.View
        style={[styles.field, { transform: [{ translateX: shakeX }] }]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setField((p) => (Math.abs(p.w - width) > 1 || Math.abs(p.h - height) > 1 ? { w: width, h: height } : p));
        }}
      >
        {field.w > 0 ? (
          <Svg width={field.w} height={field.h} style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgGradient id="arcgrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#c4b0ff" />
                <Stop offset="0.5" stopColor={COLORS.underViolet} />
                <Stop offset="1" stopColor={COLORS.underCyan} />
              </SvgGradient>
            </Defs>
            {[0.22, 0.34, 0.46].map((r, i) => (
              <Ellipse key={i} cx={field.w / 2} cy={field.h * 0.42} rx={field.w * (r + 0.02)} ry={field.h * r}
                fill="none" stroke="rgba(167,139,250,0.18)" strokeWidth="1" strokeDasharray="2 7" />
            ))}
            {connectionList.map((c, i) => {
              const d = arcPath(c.a, c.b);
              if (c.unresolvedReading) {
                return <Path key={`c${i}`} d={d} fill="none" stroke="rgba(157,150,141,0.5)" strokeWidth={2} strokeLinecap="round" strokeDasharray="4 6" />;
              }
              return (
                <React.Fragment key={`c${i}`}>
                  {/* soft bloom under-stroke (fakes the SVG gaussian glow) */}
                  <Path d={d} fill="none" stroke="url(#arcgrad)" strokeWidth={c.scope === 'arc' ? 9 : 7} strokeLinecap="round" opacity={0.22} />
                  <Path d={d} fill="none" stroke="url(#arcgrad)" strokeWidth={c.scope === 'arc' ? 3 : 2.2} strokeLinecap="round" opacity={0.97} />
                  <Path d={d} fill="none" stroke="#eee6ff" strokeWidth={0.8} strokeLinecap="round" opacity={0.5} />
                </React.Fragment>
              );
            })}
            {selArc ? (
              <React.Fragment>
                <Path d={selArc} fill="none" stroke="rgba(245,235,255,0.35)" strokeWidth={6} strokeLinecap="round" />
                <Path d={selArc} fill="none" stroke="rgba(245,235,255,0.85)" strokeWidth="1.6" strokeDasharray="3 6" strokeLinecap="round" />
              </React.Fragment>
            ) : null}
          </Svg>
        ) : null}

        {/* node bloom */}
        {bloomAt ? (
          <Animated.View pointerEvents="none" style={[styles.bloom, { left: bloomAt.x - 4, top: bloomAt.y - 4, opacity: bloomOpacity, transform: [{ scale: bloomScale }] }]} />
        ) : null}

        {/* stars */}
        {field.w > 0 && map.fragments.map((f) => {
          const p = placed[f.id] || { nx: 0.5, ny: 0.5 };
          const x = p.nx * field.w; const y = p.ny * field.h;
          const kc = colorFor(f.kind);
          const isSel = selected.includes(f.id);
          const mapped = connectionList.some((c) => c.a === f.id || c.b === f.id);
          return (
            <Pressable
              key={f.id}
              onPress={() => handleTapStar(f.id)}
              onLongPress={() => { if (!node) { selectionHaptic(); setInspect(f); } }}
              delayLongPress={240}
              style={[styles.star, { left: x - 45, top: y - 23 }]}
              accessibilityRole="button"
              accessibilityLabel={f.label}
              accessibilityHint="Tap to connect, hold to read the clue"
            >
              <View style={styles.coreWrap}>
                {!reducedMotion ? (
                  <Animated.View pointerEvents="none" style={[styles.starRing, { borderColor: kc, opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
                ) : null}
                <View style={[styles.starGlow, { backgroundColor: kc, opacity: isSel ? 0.95 : mapped ? 0.65 : 0.36, transform: [{ scale: isSel ? 1.2 : mapped ? 1 : 0.8 }] }]} />
                <View style={[styles.starCore, { backgroundColor: kc, shadowColor: kc }, isSel && styles.starCoreSel, mapped && { shadowRadius: 16 }]} />
              </View>
              <Text style={[styles.starLabel, isSel && styles.starLabelSel, mapped && styles.starLabelMapped]} numberOfLines={2}>{f.label}</Text>
            </Pressable>
          );
        })}

        {map.fragments.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>No fragments yet. Examine the scenes — the things that don’t belong are the threads into the Under-Map.</Text></View>
        ) : null}
      </Animated.View>

      {/* Depth meter + continue / bench */}
      <View style={styles.footer}>
        <View style={styles.depthWrap}>
          <View style={styles.depthTrack}>
            <View style={[styles.depthFill, { width: `${Math.max(4, depthPct)}%` }]} />
          </View>
          <Text style={styles.depthLabel}>
            {depthPct >= 100 ? 'The hidden world stands revealed' : depthPct >= 50 ? 'The map is taking shape' : 'Something is forming in the dark'} · {depthPct}%
            {streak > 0 ? `  ·  ${streak} flawless` : ''}
          </Text>
        </View>
        {asPuzzle && canContinue ? (
          <>
            {genError ? <Text style={styles.genError}>{genError}</Text> : null}
            <Pressable onPress={handleContinue} disabled={continuing} style={[styles.continueBtn, continuing && { opacity: 0.6 }]}>
              <Text style={styles.continueText}>{continuing ? 'Descending…' : genError ? 'Retry' : 'Continue the descent'}</Text>
              <Text style={styles.continueArrow}>↓</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.bench}>
            {selected.length === 0 && <Text style={styles.benchText}>Tap a fragment to begin a connection.</Text>}
            {selected.length === 1 && <Text style={styles.benchText}>Holding <Text style={styles.benchStrong}>{fragById(selected[0])?.label}</Text> — choose its pair.</Text>}
            {selected.length === 2 && <Text style={[styles.benchText, styles.benchReading]}>Reading the resonance…</Text>}
          </View>
        )}
        {asPuzzle ? (
          <Pressable onPress={() => navigation.goBack()} style={styles.reread}><Text style={styles.rereadText}>‹ Re-read the scene</Text></Pressable>
        ) : (
          <Pressable onPress={() => navigation.goBack()} style={styles.reread}><Text style={styles.rereadText}>‹ Close</Text></Pressable>
        )}
      </View>

      {toast ? (
        <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View>
      ) : null}

      {/* Clue inspector — read the full fragment the player collected */}
      {inspect ? (
        <Pressable style={styles.nodeOverlay} onPress={() => setInspect(null)}>
          <View style={styles.nodeCard} onStartShouldSetResponder={() => true}>
            <View style={styles.nodeSheen} />
            <View style={styles.inspectHead}>
              <View style={[styles.kdot, { backgroundColor: colorFor(inspect.kind), shadowColor: colorFor(inspect.kind) }]} />
              <Text style={[styles.inspectTag, { color: colorFor(inspect.kind) }]}>
                {String(inspect.kind || 'anomaly').toUpperCase()}{inspect.anomalous ? ' · ANOMALY' : ''}
              </Text>
            </View>
            <Text style={styles.nodeTitle}>{inspect.label}</Text>
            {inspect.detail ? (
              <Text style={styles.inspectDetail}>{inspect.detail}</Text>
            ) : (
              <Text style={[styles.inspectDetail, { color: COLORS.textMuted }]}>An anomaly Jack collected. Its meaning surfaces when you pair it with another fragment.</Text>
            )}
            {inspect.phrase ? (
              <Text style={styles.inspectPhrase}>Spotted in the scene: “{inspect.phrase}”</Text>
            ) : null}
            <Pressable style={styles.ghostBtn} onPress={() => setInspect(null)}><Text style={styles.ghostText}>Close</Text></Pressable>
          </View>
        </Pressable>
      ) : null}

      {/* Node card overlay (choose-the-truth → revelation) */}
      {node ? (
        <Pressable style={styles.nodeOverlay} onPress={node.mode === 'choose' ? undefined : closeNode}>
          <View style={styles.nodeCard} onStartShouldSetResponder={() => true}>
            <View style={styles.nodeSheen} />
            {node.mode === 'choose' ? (
              <>
                <Text style={styles.nodeTag}>◆ A NODE STIRS</Text>
                <Text style={styles.nodeTitle}>{node.unresolved ? 'Read it again — what does it mean?' : 'What does this connection mean?'}</Text>
                <View style={{ gap: 10, marginTop: 6 }}>
                  {node.options.map((opt, i) => (
                    <Pressable key={i} style={styles.readingOpt} onPress={() => chooseReading(opt)}>
                      <Text style={styles.readingText}>{opt}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : node.mode === 'blurred' ? (
              <>
                <Text style={[styles.nodeTag, { color: COLORS.textMuted }]}>◇ THE LINK WON’T SETTLE</Text>
                <Text style={styles.nodeRev}>The connection holds — but its meaning blurs. Read the scene again; return and read it true.</Text>
                <Pressable style={styles.ghostBtn} onPress={closeNode}><Text style={styles.ghostText}>Return to the map</Text></Pressable>
              </>
            ) : (
              <>
                <Text style={styles.nodeTag}>◆ NODE SURFACED</Text>
                <Text style={styles.nodeTitle}>{node.revelation}</Text>
                <View style={styles.nodeFrags}>
                  {[node.aId, node.bId].map((id) => {
                    const f = fragById(id);
                    return f ? (
                      <View key={id} style={styles.nodeFrag}>
                        <View style={[styles.kdot, { backgroundColor: colorFor(f.kind), shadowColor: colorFor(f.kind) }]} />
                        <Text style={styles.nodeFragText}>{f.label}</Text>
                      </View>
                    ) : null;
                  })}
                </View>
                <Pressable style={styles.ghostBtn} onPress={closeNode}><Text style={styles.ghostText}>Return to the map</Text></Pressable>
              </>
            )}
          </View>
        </Pressable>
      ) : null}
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  surface: { paddingHorizontal: 0, paddingVertical: 0 },
  header: { paddingHorizontal: 22, paddingTop: 30, paddingBottom: 12 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  kicker: { fontFamily: FONTS.mono, fontSize: 10.5, letterSpacing: 3, color: COLORS.textMuted },
  kickerCyan: { fontFamily: FONTS.mono, fontSize: 10.5, letterSpacing: 2.6, color: COLORS.underCyan, textShadowColor: COLORS.underCyanGlow, textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } },
  umTitle: { fontFamily: FONTS.secondaryBold, fontSize: 31, lineHeight: 33, color: '#f3eeff', textShadowColor: COLORS.underGlow, textShadowRadius: 30, textShadowOffset: { width: 0, height: 0 } },
  umInstr: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 0.3, color: COLORS.textMuted, marginTop: 9, lineHeight: 17 },
  umInstrHold: { color: COLORS.underCyan },
  probeRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12 },
  probeGlyphs: { fontFamily: FONTS.mono, fontSize: 14, letterSpacing: 2, color: COLORS.underCyan, textShadowColor: COLORS.underCyanGlow, textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } },
  probeGlyphsLow: { color: COLORS.bloodRed, textShadowColor: 'transparent' },
  probeLabel: { fontFamily: FONTS.mono, fontSize: 9.5, letterSpacing: 1.2, color: COLORS.textMuted, textTransform: 'uppercase', flexShrink: 1 },

  field: { flex: 1, marginHorizontal: 6, position: 'relative', minHeight: 0 },
  bloom: { position: 'absolute', width: 8, height: 8, borderRadius: 8, backgroundColor: '#cfe6ff' },

  star: { position: 'absolute', width: 90, alignItems: 'center', gap: 7, zIndex: 3 },
  coreWrap: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  starGlow: { position: 'absolute', width: 40, height: 40, borderRadius: 20, top: 3, left: 3 },
  starRing: { position: 'absolute', width: 26, height: 26, borderRadius: 13, top: 10, left: 10, borderWidth: 1 },
  starCore: {
    width: 13, height: 13, borderRadius: 7,
    shadowOpacity: 1, shadowRadius: 13, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  starCoreSel: { transform: [{ scale: 1.4 }], borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.9)' },
  starLabel: { fontFamily: FONTS.mono, fontSize: 9.5, color: COLORS.textMuted, textShadowColor: '#000', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  starLabelSel: { color: '#fff', fontFamily: FONTS.monoBold },
  starLabelMapped: { color: COLORS.fogGrayLight },

  empty: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyText: { fontFamily: FONTS.mono, fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },

  footer: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 16 },
  depthWrap: { marginBottom: 13, gap: 6 },
  depthTrack: { height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  depthFill: { height: 6, borderRadius: 999, backgroundColor: COLORS.underViolet },
  depthLabel: { fontFamily: FONTS.mono, fontSize: 9.5, letterSpacing: 0.6, color: COLORS.underCyan },

  continueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14,
    backgroundColor: COLORS.underViolet, shadowColor: COLORS.underViolet, shadowOpacity: 0.5, shadowRadius: 22, shadowOffset: { width: 0, height: 8 },
  },
  continueText: { fontFamily: FONTS.primarySemiBold, fontWeight: '700', fontSize: 14, color: '#15101f' },
  continueArrow: { fontFamily: FONTS.mono, fontSize: 14, color: '#15101f' },
  genError: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.bloodRed, textAlign: 'center', marginBottom: 8 },

  bench: {
    minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)', borderRadius: 14, backgroundColor: 'rgba(20,16,32,0.4)',
  },
  benchText: { fontFamily: FONTS.mono, fontSize: 11.5, color: COLORS.textMuted, textAlign: 'center', lineHeight: 17 },
  benchStrong: { color: COLORS.textPrimary, fontFamily: FONTS.monoBold },
  benchReading: { color: COLORS.underCyan },

  reread: { alignSelf: 'center', paddingVertical: 10 },
  rereadText: { fontFamily: FONTS.mono, fontSize: 12, letterSpacing: 0.6, color: COLORS.textMuted },

  toast: {
    position: 'absolute', bottom: 150, alignSelf: 'center', backgroundColor: 'rgba(14,11,24,0.92)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10,
  },
  toastText: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 0.4, color: COLORS.textSecondary },

  nodeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,6,14,0.66)', justifyContent: 'flex-end', zIndex: 40 },
  nodeCard: {
    margin: 14, padding: 24, borderRadius: 24, overflow: 'hidden',
    backgroundColor: 'rgba(20,16,34,0.92)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.34)',
    shadowColor: COLORS.underViolet, shadowOpacity: 0.5, shadowRadius: 40, shadowOffset: { width: 0, height: -8 },
  },
  nodeSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(200,230,255,0.6)' },
  nodeTag: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 4, color: COLORS.underCyan, textShadowColor: COLORS.underCyanGlow, textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } },
  nodeTitle: { fontFamily: FONTS.secondaryBold, fontSize: 21, lineHeight: 26, color: '#f3eeff', marginTop: 12 },
  nodeRev: { fontFamily: FONTS.primary, fontSize: 14.5, lineHeight: 23, color: COLORS.textSecondary, marginTop: 12 },
  nodeFrags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, marginBottom: 18 },
  nodeFrag: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  nodeFragText: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textSecondary },
  kdot: { width: 7, height: 7, borderRadius: 4, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  inspectHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  inspectTag: { fontFamily: FONTS.mono, fontSize: 10.5, letterSpacing: 3.4 },
  inspectDetail: { fontFamily: FONTS.primary, fontSize: 15, lineHeight: 23, color: COLORS.textSecondary, marginTop: 12 },
  inspectPhrase: { fontFamily: FONTS.mono, fontSize: 11.5, fontStyle: 'italic', letterSpacing: 0.3, lineHeight: 18, color: COLORS.textMuted, marginTop: 14, marginBottom: 4 },
  readingOpt: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', borderRadius: 12, padding: 14 },
  readingText: { fontFamily: FONTS.primary, fontSize: 14, lineHeight: 20, color: COLORS.textPrimary },
  ghostBtn: { marginTop: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,230,205,0.2)', backgroundColor: 'rgba(26,21,16,0.55)', alignItems: 'center' },
  ghostText: { fontFamily: FONTS.primarySemiBold, fontSize: 14, color: COLORS.textPrimary },
});
