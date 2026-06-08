import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Line, Circle } from 'react-native-svg';
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

  const reveal = useCallback(() => {
    setSelected(['rain', 'map']);
    setMessage(null);
    onSolved();
  }, [onSolved]);

  const selectedSet = new Set(selected);
  return (
    <View style={styles.demoWrap}>
      <View style={styles.readerDemo}>
        <Text style={styles.readerLine}>
          Jack crossed the platform. The <Text style={styles.demoAnomaly}>wrong rain</Text> fell upward through the lamps.
        </Text>
        <Text style={styles.readerHint}>Tap colored anomalies in real scenes to pin them here.</Text>
      </View>

      <View style={styles.mapDemo}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
          {(solved || (selectedSet.has('rain') && selectedSet.has('map'))) ? (
            <Line x1="28" y1="24" x2="72" y2="58" stroke={COLORS.underCyan} strokeWidth="2.4" />
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
                {
                  borderColor: isSelected || solved ? fragment.color : COLORS.panelOutline,
                  backgroundColor: isSelected || solved ? `${fragment.color}22` : 'rgba(20,16,32,0.72)',
                },
                pressed && !solved && styles.cellPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Under-Map fragment ${fragment.label}${isSelected ? ', selected' : ''}`}
            >
              <CircleBadge color={fragment.color} />
              <Text style={styles.starLabel}>{fragment.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {message ? <Text style={styles.demoMessage}>{message}</Text> : null}

      {solved ? (
        <View style={styles.demoSolvedRow}>
          <MaterialCommunityIcons name="check-decagram" size={20} color={COLORS.accentSecondary} />
          <Text style={styles.demoSolvedText}>Truth surfaced: the rain is drawing the map, not falling from the sky.</Text>
        </View>
      ) : (
        <View style={styles.demoActions}>
          <SecondaryButton label="Read Connection" onPress={check} size="compact" />
          <Pressable onPress={reveal} hitSlop={8} accessibilityRole="button">
            <Text style={styles.revealLink}>Reveal truth</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function CircleBadge({ color }) {
  return (
    <Svg width={22} height={22}>
      <Circle cx={11} cy={11} r={8} fill={color} opacity={0.9} />
      <Circle cx={11} cy={11} r={10} stroke={color} strokeWidth={1} fill="none" opacity={0.55} />
    </Svg>
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
  demoStar: {
    position: 'absolute',
    width: 104,
    minHeight: 64,
    marginLeft: -52,
    marginTop: -32,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cellPressed: {
    opacity: 0.85,
  },
  starLabel: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.4,
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
    alignItems: 'center',
    gap: SPACING.sm,
  },
  revealLink: {
    fontFamily: FONTS.primaryMedium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
    letterSpacing: 1,
    marginTop: SPACING.xs,
  },
  demoSolvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  demoSolvedText: {
    fontFamily: FONTS.primaryMedium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accentSecondary,
    flexShrink: 1,
    textAlign: 'left',
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
