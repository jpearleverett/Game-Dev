import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Ellipse, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import ScreenSurface from '../components/ScreenSurface';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import DustLayer from '../components/DustLayer';
import { selectionHaptic } from '../utils/haptics';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

// Self-contained Under-Map demo. It is not wired to real progress, so it can
// teach EXAMINE -> CONNECT without touching the player's campaign state.
const DEMO_FRAGMENTS = [
  { id: 'rain', label: 'wrong rain', kind: 'phenomenon', x: 28, y: 24, color: COLORS.kindPhenomenon },
  { id: 'map', label: 'silver map', kind: 'symbol', x: 72, y: 58, color: COLORS.kindSymbol },
  { id: 'door', label: 'unmarked door', kind: 'place', x: 36, y: 78, color: COLORS.kindPlace },
];

const DEMO_STARFIELD = Array.from({ length: 28 }).map((_, i) => ({
  key: i,
  left: `${8 + ((i * 37) % 84)}%`,
  top: `${7 + ((i * 53) % 82)}%`,
  size: 1 + ((i * 7) % 12) / 10,
  opacity: 0.18 + ((i * 11) % 50) / 100,
}));

const demoArc = (a, b) => {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const bow = Math.min(12, len * 0.22);
  return `M ${a.x} ${a.y} Q ${mx + nx * bow} ${my + ny * bow} ${b.x} ${b.y}`;
};

const STEPS = [
  {
    key: 'intro',
    icon: 'map-search-outline',
    title: 'Welcome to the Under-Map',
    body:
      'You are Jack Halloway, a private investigator in rain-soaked Ashport. The real case is not who did it — it is what hidden reality is trying to show you.',
  },
  {
    key: 'examine',
    icon: 'gesture-tap',
    title: 'Sense Anomalies',
    body:
      'As you read, colored phrases shimmer when they do not belong. Tap them to pin fragments to the Under-Map.',
  },
  {
    key: 'demo',
    icon: 'vector-line',
    title: 'Connect the Fragments',
    body:
      'Tap two fragments that belong together. A true connection surfaces a hidden truth and moves the story forward.',
  },
  {
    key: 'ready',
    icon: 'eye-circle-outline',
    title: 'Seal What You Believe',
    body:
      'Each chapter ends by committing a belief about the hidden world. The next chapter bears that reading out — or proves how badly Ashport can lie.',
  },
];

function DemoUnderMap({ onSolved, solved }) {
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState(null);

  const toggle = useCallback((id) => {
    if (solved) return;
    selectionHaptic();
    setMessage(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((w) => w !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }, [solved]);

  const check = useCallback(() => {
    if (selected.length !== 2) {
      setMessage('Tap two fragments to draw a connection.');
      return;
    }
    const correct = selected.includes('rain') && selected.includes('map');
    if (correct) {
      setMessage(null);
      onSolved();
    } else {
      setMessage('No resonance yet. Try the wrong rain with the silver map.');
    }
  }, [selected, onSolved]);

  const selectedSet = new Set(selected);
  const rain = DEMO_FRAGMENTS.find((f) => f.id === 'rain');
  const map = DEMO_FRAGMENTS.find((f) => f.id === 'map');
  const showConnection = solved || (selectedSet.has('rain') && selectedSet.has('map'));
  const arc = demoArc(rain, map);
  return (
    <View style={styles.demoWrap}>
      <View style={styles.readerDemo}>
        <Text style={styles.readerLine}>
          Jack crossed the platform. The <Text style={styles.demoAnomaly}>wrong rain</Text> fell upward through the lamps.
        </Text>
        <Text style={styles.readerHint}>Tap colored anomalies in real scenes to pin them here.</Text>
      </View>

      <View style={styles.mapDemo}>
        {DEMO_STARFIELD.map((star) => (
          <View
            key={star.key}
            pointerEvents="none"
            style={[
              styles.demoStarSpeck,
              {
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                borderRadius: star.size,
                opacity: star.opacity,
              },
            ]}
          />
        ))}
        <View style={styles.demoMapHeader} pointerEvents="none">
          <Text style={styles.demoMapKicker}>◇ DESCENDED · TUTORIAL LAYER</Text>
          <Text style={styles.demoMapProbe}>{selected.length}/2 FRAGMENTS HELD</Text>
        </View>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGradient id="demoArcGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#c4b0ff" />
              <Stop offset="0.55" stopColor={COLORS.underViolet} />
              <Stop offset="1" stopColor={COLORS.underCyan} />
            </SvgGradient>
          </Defs>
          {[0.24, 0.36, 0.48].map((r, i) => (
            <Ellipse
              key={i}
              cx="50"
              cy="47"
              rx={r * 100}
              ry={r * 72}
              fill="none"
              stroke="rgba(167,139,250,0.18)"
              strokeWidth="0.6"
              strokeDasharray="1.5 5"
            />
          ))}
          {showConnection ? (
            <>
              <Path d={arc} fill="none" stroke="url(#demoArcGrad)" strokeWidth="6.5" strokeLinecap="round" opacity="0.24" />
              <Path d={arc} fill="none" stroke="url(#demoArcGrad)" strokeWidth="2.2" strokeLinecap="round" opacity="0.96" />
              <Path d={arc} fill="none" stroke="#eee6ff" strokeWidth="0.6" strokeLinecap="round" opacity="0.5" />
            </>
          ) : null}
        </Svg>
        {DEMO_FRAGMENTS.map((fragment) => {
          const isSelected = selectedSet.has(fragment.id);
          return (
            <Pressable
              key={fragment.id}
              onPress={() => toggle(fragment.id)}
              disabled={solved}
              style={({ pressed }) => [
                styles.demoStar,
                { left: `${fragment.x}%`, top: `${fragment.y}%` },
                pressed && !solved && styles.cellPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Under-Map fragment ${fragment.label}${isSelected ? ', selected' : ''}`}
            >
              <View style={styles.demoCoreWrap}>
                <View style={[styles.demoStarRing, { borderColor: fragment.color, opacity: isSelected || solved ? 0.8 : 0.34 }]} />
                <View style={[styles.demoStarGlow, { backgroundColor: fragment.color, opacity: isSelected || solved ? 0.82 : 0.38 }]} />
                <View style={[styles.demoStarCore, { backgroundColor: fragment.color, shadowColor: fragment.color }, (isSelected || solved) && styles.demoStarCoreSelected]} />
                {fragment.id === 'rain' ? (
                  <View style={styles.demoMotifBadge}><Text style={styles.demoMotifText}>×1</Text></View>
                ) : null}
              </View>
              <Text style={[styles.starLabel, (isSelected || solved) && styles.starLabelSelected]}>{fragment.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {message ? <Text style={styles.demoMessage}>{message}</Text> : null}

      {solved ? (
        <View style={styles.demoSolvedCard}>
          <View style={styles.demoSolvedSheen} />
          <Text style={styles.demoSolvedTag}>◆ NODE SURFACED</Text>
          <Text style={styles.demoSolvedTitle}>The rain is drawing the map, not falling from the sky.</Text>
          <View style={styles.demoNodeFrags}>
            {['wrong rain', 'silver map'].map((label) => (
              <View key={label} style={styles.demoNodeFrag}>
                <View style={styles.demoNodeDot} />
                <Text style={styles.demoNodeFragText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.demoActions}>
          <PrimaryButton
            label="Read Connection"
            onPress={check}
            disabled={selected.length !== 2}
            fullWidth
            arrow={false}
          />
        </View>
      )}
    </View>
  );
}

export default function TutorialScreen({ onComplete, onSkip, reducedMotion = false }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [demoSolved, setDemoSolved] = useState(false);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const isDemo = step.key === 'demo';
  const handleSkip = onSkip || onComplete;

  const canAdvance = !isDemo || demoSolved;

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete?.();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, [isLast, onComplete]);

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const primaryLabel = isLast ? 'Begin Investigation' : 'Next';

  const dots = useMemo(() => STEPS.map((s, i) => (
    <View
      key={s.key}
      style={[styles.dot, i === stepIndex && styles.dotActive]}
    />
  )), [stepIndex]);

  return (
    <ScreenSurface variant="default">
      {!reducedMotion ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}><DustLayer /></View>
      ) : null}
      <View style={styles.topBar}>
        <Text style={styles.kicker}>HOW TO PLAY</Text>
        <Pressable onPress={handleSkip} hitSlop={10} accessibilityRole="button">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons name={step.icon} size={30} color={COLORS.accentSecondary} />
        </View>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.bodyText}>{step.body}</Text>

        {isDemo ? (
          <DemoUnderMap solved={demoSolved} onSolved={() => setDemoSolved(true)} />
        ) : null}
      </ScrollView>

      <View style={styles.dotsRow}>{dots}</View>

      <View style={styles.footer}>
        {stepIndex > 0 ? (
          <SecondaryButton
            label="Back"
            onPress={goBack}
            size="compact"
            icon={<MaterialCommunityIcons name="arrow-left" size={18} color={COLORS.textSecondary} />}
          />
        ) : (
          <View style={styles.footerSpacer} />
        )}
        <PrimaryButton
          label={primaryLabel}
          onPress={goNext}
          disabled={!canAdvance}
          icon={<MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.textSecondary} />}
        />
      </View>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  kicker: {
    fontFamily: FONTS.primaryBold,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 3,
    color: COLORS.fogGray,
  },
  skip: {
    fontFamily: FONTS.primaryMedium,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 1,
    color: COLORS.textMuted,
  },
  body: {
    flexGrow: 1,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.panelOutline,
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.title,
    color: COLORS.offWhite,
    textAlign: 'center',
    marginBottom: SPACING.md,
    width: '100%',
    maxWidth: 380,
    paddingHorizontal: SPACING.sm,
  },
  bodyText: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.relaxed,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
    width: '100%',
    maxWidth: 420,
  },
  // Under-Map demo
  demoWrap: {
    marginTop: SPACING.xl,
    width: '100%',
    alignItems: 'center',
  },
  readerDemo: {
    width: '100%',
    maxWidth: 360,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.28)',
    backgroundColor: 'rgba(20,16,32,0.55)',
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  readerLine: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    lineHeight: LINE_HEIGHTS.relaxed,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  demoAnomaly: {
    color: COLORS.kindPhenomenon,
    backgroundColor: 'rgba(125,211,252,0.16)',
    fontFamily: FONTS.primarySemiBold,
  },
  readerHint: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 0.6,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  mapDemo: {
    width: '100%',
    maxWidth: 360,
    height: 220,
    marginTop: SPACING.xs,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.32)',
    backgroundColor: 'rgba(8,7,18,0.9)',
    overflow: 'hidden',
    position: 'relative',
  },
  demoStarSpeck: {
    position: 'absolute',
    backgroundColor: '#eae4ff',
  },
  demoMapHeader: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    top: SPACING.sm,
    zIndex: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  demoMapKicker: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    letterSpacing: 1.8,
    color: COLORS.underCyan,
    textShadowColor: COLORS.underCyanGlow,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
    flexShrink: 1,
  },
  demoMapProbe: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    letterSpacing: 1.2,
    color: COLORS.textMuted,
  },
  demoStar: {
    position: 'absolute',
    width: 92,
    minHeight: 64,
    marginLeft: -46,
    marginTop: -30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 5,
  },
  demoCoreWrap: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoStarRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  demoStarGlow: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  demoStarCore: {
    width: 13,
    height: 13,
    borderRadius: 7,
    shadowOpacity: 1,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  demoStarCoreSelected: {
    transform: [{ scale: 1.4 }],
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  demoMotifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: 'rgba(167,139,250,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoMotifText: {
    fontFamily: FONTS.monoBold,
    fontSize: 8,
    color: '#120d0a',
  },
  cellPressed: {
    opacity: 0.85,
  },
  starLabel: {
    fontFamily: FONTS.mono,
    fontSize: 9.5,
    color: COLORS.textMuted,
    textAlign: 'center',
    letterSpacing: 0.4,
    textShadowColor: '#000',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
  starLabelSelected: {
    color: '#fff',
    fontFamily: FONTS.monoBold,
  },
  demoMessage: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.bloodRed,
    textAlign: 'center',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  demoActions: {
    marginTop: SPACING.lg,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  demoSolvedCard: {
    width: '100%',
    maxWidth: 360,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.34)',
    backgroundColor: 'rgba(20,16,34,0.92)',
    overflow: 'hidden',
    shadowColor: COLORS.underViolet,
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -4 },
  },
  demoSolvedSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(200,230,255,0.6)',
  },
  demoSolvedTag: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    letterSpacing: 3,
    color: COLORS.underCyan,
    textShadowColor: COLORS.underCyanGlow,
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  demoSolvedTitle: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.lg,
    lineHeight: LINE_HEIGHTS.cozy,
    color: '#f3eeff',
    marginTop: SPACING.sm,
  },
  demoNodeFrags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  demoNodeFrag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    borderRadius: 999,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  demoNodeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.underCyan,
  },
  demoNodeFragText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  // Footer
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.panelOutline,
  },
  dotActive: {
    backgroundColor: COLORS.accentSecondary,
    borderColor: COLORS.accentSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  footerSpacer: {
    flex: 0,
  },
});
