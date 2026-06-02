import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenSurface from '../components/ScreenSurface';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import DustLayer from '../components/DustLayer';
import SolvedStampAnimation from '../components/SolvedStampAnimation';
import { useGame } from '../context/GameContext';
import { useAudio } from '../context/AudioContext';
import { selectionHaptic, impactHaptic, notificationHaptic, Haptics } from '../utils/haptics';
import { generateDeductionPuzzle, checkDeduction } from '../services/DeductionService';
import { makeClue, CLUE_SOURCE, CLUE_WEIGHT } from '../data/caseBoard';
import { parseCaseNumber, resolveStoryPathKey, formatCaseNumber } from '../data/storyContent';
import { loadLogicPuzzle, saveLogicPuzzle, clearLogicPuzzle } from '../storage/logicPuzzleStorage';
import { COLORS, CARD_STATES } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

const MARK = { PLACED: 'placed', RULED_OUT: 'ruled' };
const key = (sId, lId) => `${sId}|${lId}`;

export default function DeductionScreen({ navigation }) {
  const game = useGame();
  const audio = useAudio();
  const {
    activeCase,
    progress,
    completeLogicPuzzle,
    addCaseClue,
    addCaseSuspects,
  } = game;

  const caseNumber = activeCase?.caseNumber;
  const storyCampaign = progress?.storyCampaign;
  const { chapter } = parseCaseNumber(caseNumber);
  const pathKey = resolveStoryPathKey(caseNumber, storyCampaign);

  const puzzle = useMemo(
    () => (caseNumber
      ? generateDeductionPuzzle(caseNumber, {
          caseData: activeCase,
          storyMeta: activeCase?.storyMeta,
          chapter,
        })
      : null),
    [caseNumber, chapter, activeCase],
  );

  const reducedMotion = !!progress?.settings?.reducedMotion;
  const [marks, setMarks] = useState({});            // { 'sId|lId': 'placed'|'ruled' }
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [solved, setSolved] = useState(false);
  const [showStamp, setShowStamp] = useState(false);
  const [cluesOpen, setCluesOpen] = useState(true);
  const completedRef = useRef(false);

  // Entrance: gently fade/lift the board in.
  const enter = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) { enter.setValue(1); return; }
    Animated.timing(enter, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [enter, reducedMotion]);
  const enterStyle = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  // Restore any in-progress marks for this beat.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!caseNumber) return;
      const stored = await loadLogicPuzzle(caseNumber, pathKey);
      if (alive && stored?.deduction?.marks) {
        setMarks(stored.deduction.marks);
        setMistakes(stored.deduction.mistakes || 0);
      }
    })();
    return () => { alive = false; };
  }, [caseNumber, pathKey]);

  const persist = useCallback((nextMarks, nextMistakes) => {
    if (!caseNumber) return;
    saveLogicPuzzle(caseNumber, pathKey, {
      deduction: { marks: nextMarks, mistakes: nextMistakes },
    }).catch(() => {});
  }, [caseNumber, pathKey]);

  // Cycle a cell: neutral -> placed -> ruled-out -> neutral.
  // Placing enforces a working bijection: clears other placements in the same
  // suspect row and the same location column.
  const cycleCell = useCallback((sId, lId) => {
    if (solved) return;
    setFeedback(null);
    setMarks((prev) => {
      const k = key(sId, lId);
      const current = prev[k];
      const next = { ...prev };
      if (!current) {
        // place here, clear conflicts in row + column
        Object.keys(next).forEach((kk) => {
          const [ks, kl] = kk.split('|');
          if ((ks === sId || kl === lId) && next[kk] === MARK.PLACED) delete next[kk];
        });
        next[k] = MARK.PLACED;
        impactHaptic(Haptics.ImpactFeedbackStyle.Medium);
      } else if (current === MARK.PLACED) {
        next[k] = MARK.RULED_OUT;
        selectionHaptic();
      } else {
        delete next[k];
        selectionHaptic();
      }
      persist(next, mistakes);
      return next;
    });
  }, [solved, mistakes, persist]);

  // Derived placement: suspectId -> locationId (only fully-placed rows).
  const placement = useMemo(() => {
    const out = {};
    if (!puzzle) return out;
    puzzle.suspects.forEach((s) => {
      const loc = puzzle.locations.find((l) => marks[key(s.id, l.id)] === MARK.PLACED);
      if (loc) out[s.id] = loc.id;
    });
    return out;
  }, [marks, puzzle]);

  const allPlaced = puzzle && Object.keys(placement).length === puzzle.size;

  const handleCheck = useCallback(() => {
    if (!puzzle || !allPlaced) {
      setFeedback({ tone: 'warn', text: 'Place every suspect somewhere first.' });
      return;
    }
    const result = checkDeduction(puzzle, placement);
    if (result.solved) {
      setSolved(true);
      setShowStamp(true);
      setFeedback(null);
      clearLogicPuzzle(caseNumber, pathKey).catch(() => {});
      notificationHaptic(Haptics.NotificationFeedbackType.Success);
      audio?.playVictory?.();
    } else {
      const m = mistakes + 1;
      setMistakes(m);
      persist(marks, m);
      notificationHaptic(Haptics.NotificationFeedbackType.Error);
      audio?.playFailure?.();
      setFeedback({
        tone: 'error',
        text: `${result.correctCount} of ${result.total} placements hold up. The rest contradict the clues. Re-read and re-deduce.`,
      });
    }
  }, [puzzle, allPlaced, placement, caseNumber, pathKey, mistakes, marks, persist, audio]);

  // Pin the contradiction to the Case Board and advance the story.
  const handleContinue = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;

    try {
      addCaseSuspects?.(puzzle.suspects.map((s) => ({ name: s.name })));
      addCaseClue?.(makeClue({
        label: `${puzzle.crime.culpritName}'s alibi breaks`,
        detail: puzzle.contradiction,
        source: CLUE_SOURCE.ALIBI,
        weight: CLUE_WEIGHT.BREAKER,
        caseNumber,
        chapter,
        suspectId: puzzle.crime.culpritId,
      }));
    } catch (_e) { /* board is best-effort, never block progression */ }

    // Advance story state exactly like the logic puzzle did.
    completeLogicPuzzle?.({ caseId: activeCase?.id, caseNumber, mistakes });

    // Navigate to the next subchapter (deduction only runs on A/B, never final).
    const { chapter: ch, subchapter } = parseCaseNumber(caseNumber);
    const nextCase = subchapter >= 3 ? null : formatCaseNumber(ch, subchapter + 1);
    try {
      if (nextCase) {
        await game.ensureStoryContent?.(nextCase, storyCampaign?.currentPathKey || 'ROOT');
        navigation.replace('CaseFile', { caseNumber: nextCase });
      } else {
        navigation.replace('CaseFile');
      }
    } catch (_e) {
      navigation.replace('CaseFile', nextCase ? { caseNumber: nextCase } : undefined);
    }
  }, [puzzle, caseNumber, chapter, mistakes, activeCase?.id, completeLogicPuzzle, addCaseClue, addCaseSuspects, game, storyCampaign?.currentPathKey, navigation]);

  if (!puzzle) {
    return (
      <ScreenSurface variant="default">
        <View style={styles.center}>
          <Text style={styles.bodyText}>Preparing the board…</Text>
        </View>
      </ScreenSurface>
    );
  }

  return (
    <ScreenSurface variant="default">
      {!reducedMotion ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}><DustLayer /></View>
      ) : null}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.kickerRow}>
          <MaterialCommunityIcons name="map-marker-path" size={18} color={COLORS.accentSecondary} />
          <Text style={styles.kicker}>ALIBI BOARD</Text>
          {mistakes > 0 ? <Text style={styles.mistakes}>{mistakes} dead end{mistakes === 1 ? '' : 's'}</Text> : null}
        </View>
        <Text style={styles.title}>{activeCase?.title || 'Where Were They?'}</Text>
        <Text style={styles.prompt}>{puzzle.prompt}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Clues */}
        <Pressable onPress={() => setCluesOpen((o) => !o)} style={styles.cluesHeader} accessibilityRole="button">
          <MaterialCommunityIcons name="note-search-outline" size={18} color={COLORS.accentSecondary} />
          <Text style={styles.cluesTitle}>WHAT YOU KNOW</Text>
          <MaterialCommunityIcons name={cluesOpen ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textMuted} />
        </Pressable>
        {cluesOpen ? (
          <View style={styles.cluesList}>
            {puzzle.clues.map((c) => (
              <View key={c.id} style={styles.clueRow}>
                <View style={styles.clueDot} />
                <Text style={styles.clueText}>{c.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Suspect rows */}
        <View style={styles.boardHint}>
          <Text style={styles.boardHintText}>
            Tap a location: once to <Text style={styles.placedInline}>place</Text> the suspect there,
            again to <Text style={styles.ruledInline}>rule it out</Text>.
          </Text>
        </View>

        <Animated.View style={enterStyle}>
        {puzzle.suspects.map((s) => {
          const placedLoc = placement[s.id];
          return (
            <View key={s.id} style={[styles.suspectCard, placedLoc && styles.suspectCardPlaced]}>
              <View style={styles.suspectNameRow}>
                <MaterialCommunityIcons
                  name={placedLoc ? 'account-check' : 'account-question'}
                  size={18}
                  color={placedLoc ? COLORS.accentSecondary : COLORS.textMuted}
                />
                <Text style={styles.suspectName}>{s.name}</Text>
                {placedLoc ? (
                  <Text style={styles.suspectPlacedAt}>
                    {puzzle.locations.find((l) => l.id === placedLoc)?.name}
                  </Text>
                ) : null}
              </View>
              <View style={styles.chipWrap}>
                {puzzle.locations.map((l) => {
                  const m = marks[key(s.id, l.id)];
                  const state = m === MARK.PLACED
                    ? CARD_STATES.lockedOutlier
                    : m === MARK.RULED_OUT
                      ? CARD_STATES.lockedMain
                      : CARD_STATES.default;
                  return (
                    <Pressable
                      key={l.id}
                      onPress={() => cycleCell(s.id, l.id)}
                      disabled={solved}
                      style={({ pressed }) => [
                        styles.chip,
                        { backgroundColor: state.backgroundColor, borderColor: state.borderColor },
                        m === MARK.RULED_OUT && styles.chipRuled,
                        pressed && !solved && styles.chipPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${s.name} at ${l.name}${m ? `, ${m}` : ''}`}
                    >
                      {m === MARK.PLACED ? (
                        <MaterialCommunityIcons name="check-bold" size={13} color={state.textColor} />
                      ) : m === MARK.RULED_OUT ? (
                        <MaterialCommunityIcons name="close" size={13} color={state.textColor} />
                      ) : null}
                      <Text style={[styles.chipText, { color: state.textColor }, m === MARK.RULED_OUT && styles.chipTextRuled]}>
                        {l.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
        </Animated.View>

        {feedback ? (
          <Text style={[styles.feedback, feedback.tone === 'error' && styles.feedbackError, feedback.tone === 'warn' && styles.feedbackWarn]}>
            {feedback.text}
          </Text>
        ) : null}
      </ScrollView>

      {/* Footer / reveal */}
      {solved ? (
        <View style={styles.revealCard}>
          <View style={styles.revealHeader}>
            <MaterialCommunityIcons name="alert-decagram" size={22} color={COLORS.accentSecondary} />
            <Text style={styles.revealKicker}>CONTRADICTION</Text>
          </View>
          <Text style={styles.revealText}>{puzzle.contradiction}</Text>
          <PrimaryButton
            label="Pin to Case Board & Continue"
            onPress={handleContinue}
            icon={<MaterialCommunityIcons name="pin" size={18} color={COLORS.textSecondary} />}
          />
        </View>
      ) : (
        <View style={styles.footer}>
          <SecondaryButton
            label="Back"
            size="compact"
            onPress={() => navigation.goBack()}
            icon={<MaterialCommunityIcons name="arrow-left" size={18} color={COLORS.textSecondary} />}
          />
          <PrimaryButton
            label="Check Placements"
            onPress={handleCheck}
            disabled={!allPlaced}
            icon={<MaterialCommunityIcons name="magnify-scan" size={18} color={COLORS.textSecondary} />}
          />
        </View>
      )}

      <SolvedStampAnimation
        visible={showStamp}
        reducedMotion={reducedMotion}
        intelName={`${puzzle.crime.culpritName} — alibi broken`}
        onContinue={() => setShowStamp(false)}
      />
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: SPACING.sm },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  kicker: {
    fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.sm, letterSpacing: 3, color: COLORS.accentSecondary,
  },
  mistakes: {
    marginLeft: 'auto', fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.bloodRed, letterSpacing: 1,
  },
  title: {
    fontFamily: FONTS.secondaryBold, fontSize: FONT_SIZES.xl, color: COLORS.offWhite, marginTop: SPACING.xs,
  },
  prompt: {
    fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary,
    lineHeight: LINE_HEIGHTS.cozy, marginTop: SPACING.xs,
  },
  body: { paddingVertical: SPACING.md, paddingBottom: SPACING.xl },
  // Clues
  cluesHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.panelOutline,
  },
  cluesTitle: {
    fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.sm, letterSpacing: 2, color: COLORS.textSecondary, flex: 1,
  },
  cluesList: { paddingTop: SPACING.sm, paddingBottom: SPACING.md, gap: SPACING.sm },
  clueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  clueDot: {
    width: 6, height: 6, borderRadius: 3, marginTop: 7, backgroundColor: COLORS.accentSecondary,
  },
  clueText: {
    flex: 1, fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: LINE_HEIGHTS.cozy,
  },
  boardHint: { paddingVertical: SPACING.md },
  boardHintText: {
    fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.textMuted, lineHeight: LINE_HEIGHTS.cozy,
  },
  placedInline: { color: COLORS.accentSecondary, fontFamily: FONTS.primarySemiBold },
  ruledInline: { color: COLORS.textMuted, fontFamily: FONTS.primarySemiBold, textDecorationLine: 'line-through' },
  // Suspect cards
  suspectCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.panelOutline,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  suspectCardPlaced: { borderColor: COLORS.accentSoft, backgroundColor: COLORS.surfaceAlt },
  suspectNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  suspectName: { fontFamily: FONTS.primarySemiBold, fontSize: FONT_SIZES.md, color: COLORS.offWhite },
  suspectPlacedAt: {
    marginLeft: 'auto', fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.accentSecondary, letterSpacing: 0.5,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: SPACING.xs + 2, paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm, borderWidth: 1.5,
  },
  chipPressed: { opacity: 0.85 },
  chipRuled: { opacity: 0.6 },
  chipText: { fontFamily: FONTS.primaryMedium, fontSize: FONT_SIZES.xs, letterSpacing: 0.3 },
  chipTextRuled: { textDecorationLine: 'line-through' },
  // Feedback
  feedback: {
    fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary,
    marginTop: SPACING.md, lineHeight: LINE_HEIGHTS.cozy,
  },
  feedbackError: { color: COLORS.bloodRed },
  feedbackWarn: { color: COLORS.accentSecondary },
  bodyText: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: SPACING.md, paddingTop: SPACING.sm,
  },
  // Reveal
  revealCard: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.accentSoft,
    padding: SPACING.lg, gap: SPACING.md,
  },
  revealHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  revealKicker: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.sm, letterSpacing: 3, color: COLORS.accentSecondary },
  revealText: {
    fontFamily: FONTS.secondary, fontSize: FONT_SIZES.md, color: COLORS.offWhite, lineHeight: LINE_HEIGHTS.relaxed,
  },
});
