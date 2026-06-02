import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenSurface from '../components/ScreenSurface';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import DustLayer from '../components/DustLayer';
import { useGame } from '../context/GameContext';
import { useAudio } from '../context/AudioContext';
import { selectionHaptic, notificationHaptic, impactHaptic, Haptics } from '../utils/haptics';
import { normalizeCaseBoard, makeClue, CLUE_SOURCE, CLUE_WEIGHT } from '../data/caseBoard';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

export default function AccusationScreen({ navigation }) {
  const game = useGame();
  const audio = useAudio();
  const { progress, recordCaseAccusation, setCaseTheory, addCaseClue } = game;

  const board = useMemo(
    () => normalizeCaseBoard(progress?.storyCampaign?.caseBoard),
    [progress?.storyCampaign?.caseBoard],
  );
  const chapter = progress?.storyCampaign?.chapter ?? null;
  const reducedMotion = !!progress?.settings?.reducedMotion;

  // The breaker clues are the alibi contradictions; their suspectId is whose
  // alibi actually broke — the evidence-supported culprit for that beat.
  const breakerSuspectIds = useMemo(
    () => new Set(board.clues.filter((c) => c.weight === CLUE_WEIGHT.BREAKER && c.suspectId).map((c) => c.suspectId)),
    [board.clues],
  );
  const supportingClues = useMemo(
    () => board.clues.filter((c) => c.weight === CLUE_WEIGHT.BREAKER || c.weight === CLUE_WEIGHT.MAJOR),
    [board.clues],
  );

  const [suspectId, setSuspectId] = useState(board.theory?.suspectId || null);
  const [clueId, setClueId] = useState(board.theory?.clueId || null);
  const [result, setResult] = useState(null);

  const chosenSuspect = board.suspects.find((s) => s.id === suspectId) || null;
  const canAccuse = !!suspectId && !!clueId && !result;

  const makeAccusation = () => {
    if (!chosenSuspect) return;
    const supported = breakerSuspectIds.has(suspectId);
    recordCaseAccusation?.({
      chapter,
      suspectId,
      suspectName: chosenSuspect.name,
      clueId,
      correct: supported,
      outcome: supported ? 'supported' : 'unsupported',
    });
    setCaseTheory?.({ suspectId, clueId });
    addCaseClue?.(makeClue({
      label: `You named ${chosenSuspect.name}`,
      detail: supported
        ? 'The evidence on the board backs the accusation.'
        : 'A bold call — the board does not yet prove it.',
      source: CLUE_SOURCE.ACCUSATION,
      weight: supported ? CLUE_WEIGHT.BREAKER : CLUE_WEIGHT.MINOR,
      chapter,
      suspectId,
    }));
    if (supported) {
      audio?.playVictory?.();
      notificationHaptic(Haptics.NotificationFeedbackType.Success);
    } else {
      audio?.playSubmit?.();
      impactHaptic(Haptics.ImpactFeedbackStyle.Medium);
    }
    setResult({ supported, name: chosenSuspect.name });
  };

  if (board.suspects.length === 0) {
    return (
      <ScreenSurface variant="default">
        <View style={styles.header}>
          <Text style={styles.kicker}>MAKE YOUR CASE</Text>
        </View>
        <View style={styles.empty}>
          <MaterialCommunityIcons name="account-search-outline" size={28} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>
            You have no names yet. Work a few scenes and crack an alibi before you point a finger.
          </Text>
          <SecondaryButton label="Back to the Board" onPress={() => navigation.goBack()} size="compact" />
        </View>
      </ScreenSurface>
    );
  }

  return (
    <ScreenSurface variant="default">
      {!reducedMotion ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}><DustLayer /></View>
      ) : null}
      <View style={styles.header}>
        <View style={styles.kickerRow}>
          <MaterialCommunityIcons name="gavel" size={18} color={COLORS.accentSecondary} />
          <Text style={styles.kicker}>MAKE YOUR CASE</Text>
        </View>
        <Text style={styles.title}>Who did it?</Text>
        <Text style={styles.lede}>Name a suspect and the evidence you'll stake it on.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>THE ACCUSED</Text>
        <View style={styles.suspectWrap}>
          {board.suspects.map((s) => {
            const active = s.id === suspectId;
            return (
              <Pressable
                key={s.id}
                disabled={!!result}
                onPress={() => { selectionHaptic(); setSuspectId(s.id); }}
                style={[styles.suspectCard, active && styles.suspectCardActive]}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name={active ? 'target-account' : 'account'}
                  size={18}
                  color={active ? COLORS.background : COLORS.textSecondary}
                />
                <Text style={[styles.suspectText, active && styles.suspectTextActive]}>{s.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>YOUR EVIDENCE</Text>
        {supportingClues.length === 0 ? (
          <Text style={styles.muted}>No hard leads pinned yet — anything you name is a gamble.</Text>
        ) : (
          <View style={styles.clueList}>
            {supportingClues.map((c) => {
              const active = c.id === clueId;
              return (
                <Pressable
                  key={c.id}
                  disabled={!!result}
                  onPress={() => { selectionHaptic(); setClueId(c.id); }}
                  style={[styles.clueCard, active && styles.clueCardActive]}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons
                    name={active ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                    size={18}
                    color={active ? COLORS.accentSecondary : COLORS.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clueLabel}>{c.label}</Text>
                    {c.detail ? <Text style={styles.clueDetail} numberOfLines={2}>{c.detail}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {result ? (
          <View style={[styles.resultCard, result.supported ? styles.resultGood : styles.resultBad]}>
            <View style={styles.resultHeader}>
              <MaterialCommunityIcons
                name={result.supported ? 'scale-balance' : 'help-rhombus-outline'}
                size={22}
                color={result.supported ? COLORS.successGreen : COLORS.bloodRed}
              />
              <Text style={[styles.resultKicker, { color: result.supported ? COLORS.successGreen : COLORS.bloodRed }]}>
                {result.supported ? 'THE EVIDENCE HOLDS' : 'NOT YET PROVABLE'}
              </Text>
            </View>
            <Text style={styles.resultText}>
              {result.supported
                ? `The board backs you: ${result.name}'s alibi is a lie, and you can prove it. The accusation stands.`
                : `You've named ${result.name}, but the board can't carry it yet. Keep digging — find the contradiction that breaks their story.`}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <SecondaryButton
          label={result ? 'Done' : 'Back'}
          size="compact"
          onPress={() => navigation.goBack()}
          icon={<MaterialCommunityIcons name="arrow-left" size={18} color={COLORS.textSecondary} />}
        />
        {!result ? (
          <PrimaryButton
            label="Make the Accusation"
            onPress={makeAccusation}
            disabled={!canAccuse}
            icon={<MaterialCommunityIcons name="gavel" size={18} color={COLORS.textSecondary} />}
          />
        ) : null}
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
  body: { paddingVertical: SPACING.md, paddingBottom: SPACING.xl },
  sectionLabel: {
    fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.xs, letterSpacing: 3, color: COLORS.textSecondary,
    marginBottom: SPACING.sm, marginTop: SPACING.md,
  },
  suspectWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  suspectCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.panelOutline, backgroundColor: COLORS.surface,
  },
  suspectCardActive: { backgroundColor: COLORS.accentSecondary, borderColor: COLORS.accentSecondary },
  suspectText: { fontFamily: FONTS.primaryMedium, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  suspectTextActive: { color: COLORS.background, fontFamily: FONTS.primarySemiBold },
  clueList: { gap: SPACING.sm },
  clueCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.panelOutline,
    padding: SPACING.md,
  },
  clueCardActive: { borderColor: COLORS.accentSoft, backgroundColor: COLORS.surfaceAlt },
  clueLabel: { fontFamily: FONTS.primarySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.offWhite },
  clueDetail: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2, lineHeight: LINE_HEIGHTS.cozy },
  muted: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textMuted },
  resultCard: { marginTop: SPACING.lg, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, gap: SPACING.sm },
  resultGood: { borderColor: 'rgba(123,165,141,0.5)', backgroundColor: 'rgba(123,165,141,0.08)' },
  resultBad: { borderColor: 'rgba(196,92,92,0.5)', backgroundColor: 'rgba(196,92,92,0.08)' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  resultKicker: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.sm, letterSpacing: 2 },
  resultText: { fontFamily: FONTS.secondary, fontSize: FONT_SIZES.md, color: COLORS.offWhite, lineHeight: LINE_HEIGHTS.relaxed },
  empty: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xl },
  emptyText: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: LINE_HEIGHTS.cozy, paddingHorizontal: SPACING.lg },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md, paddingTop: SPACING.sm },
});
