import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenSurface from '../components/ScreenSurface';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import DustLayer from '../components/DustLayer';
import { selectionHaptic } from '../utils/haptics';
import { COLORS, CARD_STATES } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

// Self-contained demo board. NOT wired to real game state, so it can never
// corrupt the player's actual case 1A progress. The three "evidence" words are
// the outliers the player must find; the other six form two mundane groups.
const DEMO_OUTLIERS = ['LEDGER', 'REVOLVER', 'ALIBI'];
const DEMO_WORDS = [
  'RAIN', 'LEDGER', 'PIER',
  'FOG', 'CRANE', 'REVOLVER',
  'ALIBI', 'FROST', 'BARGE',
];

const STEPS = [
  {
    key: 'intro',
    icon: 'incognito',
    title: 'Welcome, Detective',
    body:
      'You are Jack Halloway, a burned-out investigator in the rain-soaked city of Ashport. ' +
      'Each case unfolds as a story you shape with your choices, punctuated by puzzles that test how you read a scene.',
  },
  {
    key: 'evidence',
    icon: 'bulletin-board',
    title: 'Work the Evidence Board',
    body:
      'Most words on the board belong to hidden groups. A few do not. ' +
      'Those outliers are your real leads. Find the ones that break the pattern, and the investigation moves forward.',
  },
  {
    key: 'demo',
    icon: 'gesture-tap',
    title: 'Try It',
    body:
      'Six of these words form two ordinary groups (weather and the docks). Three are case evidence. ' +
      'Tap to select the three that don\'t belong, then check your work.',
  },
  {
    key: 'ready',
    icon: 'book-open-page-variant',
    title: 'The Rest Is Story',
    body:
      'Solve a board and the narrative continues. Some chapters use a logic grid instead, but the idea is the same: ' +
      'read carefully, deduce, decide. Your choices change what happens next. The first letter is already waiting.',
  },
];

function DemoBoard({ onSolved, solved }) {
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState(null);

  const toggle = useCallback((word) => {
    if (solved) return;
    selectionHaptic();
    setMessage(null);
    setSelected((prev) => {
      if (prev.includes(word)) return prev.filter((w) => w !== word);
      if (prev.length >= 3) return prev; // cap at three
      return [...prev, word];
    });
  }, [solved]);

  const check = useCallback(() => {
    if (selected.length !== 3) {
      setMessage('Select exactly three words.');
      return;
    }
    const correct = selected.every((w) => DEMO_OUTLIERS.includes(w));
    if (correct) {
      setMessage(null);
      onSolved();
    } else {
      setMessage('Not quite. Those words fit a group. Look for the three leads that don\'t.');
    }
  }, [selected, onSolved]);

  const reveal = useCallback(() => {
    setSelected(DEMO_OUTLIERS);
    setMessage(null);
    onSolved();
  }, [onSolved]);

  return (
    <View style={styles.demoWrap}>
      <View style={styles.grid}>
        {DEMO_WORDS.map((word) => {
          const isSelected = selected.includes(word);
          const isOutlier = DEMO_OUTLIERS.includes(word);
          const state = solved && isOutlier
            ? CARD_STATES.lockedOutlier
            : isSelected
              ? CARD_STATES.selected
              : CARD_STATES.default;
          return (
            <Pressable
              key={word}
              onPress={() => toggle(word)}
              disabled={solved}
              style={({ pressed }) => [
                styles.cell,
                {
                  backgroundColor: state.backgroundColor,
                  borderColor: state.borderColor,
                },
                pressed && !solved && styles.cellPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Evidence word ${word}${isSelected ? ', selected' : ''}`}
            >
              <Text style={[styles.cellText, { color: state.textColor }]}>{word}</Text>
            </Pressable>
          );
        })}
      </View>

      {message ? <Text style={styles.demoMessage}>{message}</Text> : null}

      {solved ? (
        <View style={styles.demoSolvedRow}>
          <MaterialCommunityIcons name="check-decagram" size={20} color={COLORS.accentSecondary} />
          <Text style={styles.demoSolvedText}>That's the read. Those three are your leads.</Text>
        </View>
      ) : (
        <View style={styles.demoActions}>
          <SecondaryButton label="Check Evidence" onPress={check} size="compact" />
          <Pressable onPress={reveal} hitSlop={8} accessibilityRole="button">
            <Text style={styles.revealLink}>Reveal answer</Text>
          </Pressable>
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
          <DemoBoard solved={demoSolved} onSolved={() => setDemoSolved(true)} />
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
  },
  bodyText: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.relaxed,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
  },
  // Demo board
  demoWrap: {
    marginTop: SPACING.xl,
    width: '100%',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    maxWidth: 360,
  },
  cell: {
    width: 104,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPressed: {
    opacity: 0.85,
  },
  cellText: {
    fontFamily: FONTS.primarySemiBold,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 1,
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
