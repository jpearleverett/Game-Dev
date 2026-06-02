import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenSurface from '../components/ScreenSurface';
import SecondaryButton from '../components/SecondaryButton';
import PrimaryButton from '../components/PrimaryButton';
import { useGame } from '../context/GameContext';
import { normalizeCaseBoard, CLUE_SOURCE, CLUE_WEIGHT } from '../data/caseBoard';
import { COLORS, CARD_STATES } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

const SOURCE_META = {
  [CLUE_SOURCE.BOARD]: { label: 'EVIDENCE', icon: 'magnify' },
  [CLUE_SOURCE.ALIBI]: { label: 'ALIBI', icon: 'map-marker-alert' },
  [CLUE_SOURCE.CHOICE]: { label: 'LEAD', icon: 'directions-fork' },
  [CLUE_SOURCE.ACCUSATION]: { label: 'ACCUSATION', icon: 'gavel' },
};

const PIN_COLOR = {
  [CLUE_WEIGHT.MINOR]: CARD_STATES.lockedMain.pin,
  [CLUE_WEIGHT.MAJOR]: CARD_STATES.lockedOutlier.pin,
  [CLUE_WEIGHT.BREAKER]: CARD_STATES.selected.pin,
};

export default function CaseBoardScreen({ navigation }) {
  const game = useGame();
  const { progress, setCaseTheory, touchCaseBoard } = game;

  const board = useMemo(
    () => normalizeCaseBoard(progress?.storyCampaign?.caseBoard),
    [progress?.storyCampaign?.caseBoard],
  );

  useEffect(() => { touchCaseBoard?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const breakers = board.clues.filter((c) => c.weight === CLUE_WEIGHT.BREAKER).length;
  const theorySuspect = board.theory
    ? board.suspects.find((s) => s.id === board.theory.suspectId)
    : null;
  const theoryClue = board.theory?.clueId
    ? board.clues.find((c) => c.id === board.theory.clueId)
    : null;

  const onPickSuspect = (s) => {
    if (board.theory?.suspectId === s.id) {
      setCaseTheory?.(null);
    } else {
      // attach the strongest breaker clue, if any, as supporting evidence
      const support = board.clues.find((c) => c.weight === CLUE_WEIGHT.BREAKER) || board.clues[0];
      setCaseTheory?.({ suspectId: s.id, clueId: support?.id || null });
    }
  };

  return (
    <ScreenSurface variant="default">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.kickerWrap}>
            <MaterialCommunityIcons name="bulletin-board" size={18} color={COLORS.accentSecondary} />
            <Text style={styles.kicker}>THE CASE BOARD</Text>
          </View>
          <SecondaryButton
            label="Close"
            size="compact"
            onPress={() => navigation.goBack()}
            icon={<MaterialCommunityIcons name="close" size={16} color={COLORS.textSecondary} />}
          />
        </View>
        <Text style={styles.title}>Dead Letters</Text>
        <Text style={styles.status}>
          {board.clues.length} {board.clues.length === 1 ? 'lead' : 'leads'}
          {'  ·  '}
          {board.suspects.length} {board.suspects.length === 1 ? 'name' : 'names'}
          {breakers > 0 ? `  ·  ${breakers} case-breaker${breakers === 1 ? '' : 's'}` : ''}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Working theory */}
        <View style={[styles.theoryBand, theorySuspect && styles.theoryBandActive]}>
          <MaterialCommunityIcons
            name={theorySuspect ? 'account-alert' : 'help-circle-outline'}
            size={20}
            color={theorySuspect ? COLORS.accentSecondary : COLORS.textMuted}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.theoryLabel}>WORKING THEORY</Text>
            {theorySuspect ? (
              <Text style={styles.theoryText}>
                <Text style={styles.theoryName}>{theorySuspect.name}</Text>
                {theoryClue ? ` — ${theoryClue.label}` : ' is your prime suspect.'}
              </Text>
            ) : (
              <Text style={styles.theoryEmpty}>Tap a name below to mark your prime suspect.</Text>
            )}
          </View>
        </View>

        {/* Suspects */}
        {board.suspects.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>THE NAMES</Text>
            <View style={styles.suspectWrap}>
              {board.suspects.map((s) => {
                const isTheory = board.theory?.suspectId === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => onPickSuspect(s)}
                    style={[
                      styles.suspectChip,
                      isTheory && styles.suspectChipTheory,
                      s.cleared && styles.suspectChipCleared,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Suspect ${s.name}${isTheory ? ', prime suspect' : ''}`}
                  >
                    <MaterialCommunityIcons
                      name={isTheory ? 'target-account' : s.cleared ? 'account-off' : 'account'}
                      size={15}
                      color={isTheory ? COLORS.background : s.cleared ? COLORS.textMuted : COLORS.textSecondary}
                    />
                    <Text style={[
                      styles.suspectChipText,
                      isTheory && styles.suspectChipTextTheory,
                      s.cleared && styles.suspectChipTextCleared,
                    ]}>
                      {s.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {/* Clues */}
        <Text style={styles.sectionLabel}>PINNED</Text>
        {board.clues.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="paperclip" size={26} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              The board is bare. Work a scene and crack an alibi — what you find gets pinned here.
            </Text>
          </View>
        ) : (
          <View style={styles.clueColumn}>
            {board.clues.map((clue) => {
              const meta = SOURCE_META[clue.source] || SOURCE_META[CLUE_SOURCE.BOARD];
              const isBreaker = clue.weight === CLUE_WEIGHT.BREAKER;
              return (
                <View key={clue.id} style={[styles.card, isBreaker && styles.cardBreaker]}>
                  <View style={[styles.pin, { backgroundColor: PIN_COLOR[clue.weight] || CARD_STATES.lockedMain.pin }]} />
                  <View style={styles.cardTagRow}>
                    <MaterialCommunityIcons name={meta.icon} size={12} color={CARD_STATES.default.lineColor && '#6a5644'} />
                    <Text style={styles.cardTag}>{meta.label}</Text>
                    {isBreaker ? <Text style={styles.breakerTag}>CASE-BREAKER</Text> : null}
                    {clue.chapter ? <Text style={styles.cardChapter}>Ch.{clue.chapter}</Text> : null}
                  </View>
                  <Text style={styles.cardLabel}>{clue.label}</Text>
                  {clue.detail ? <Text style={styles.cardDetail}>{clue.detail}</Text> : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {board.suspects.length > 0 ? (
        <View style={styles.footer}>
          <PrimaryButton
            label="Make Your Accusation"
            onPress={() => navigation.navigate('Accusation')}
            icon={<MaterialCommunityIcons name="gavel" size={18} color={COLORS.textSecondary} />}
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
  title: { fontFamily: FONTS.secondaryBold, fontSize: FONT_SIZES.title, color: COLORS.offWhite, marginTop: SPACING.sm },
  status: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: SPACING.xs, letterSpacing: 0.5 },
  body: { paddingVertical: SPACING.md, paddingBottom: SPACING.xl },
  footer: { paddingTop: SPACING.sm },
  // Theory band
  theoryBand: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.panelOutline,
    padding: SPACING.md, marginBottom: SPACING.lg,
  },
  theoryBandActive: { borderColor: COLORS.accentSoft, backgroundColor: COLORS.surfaceAlt },
  theoryLabel: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.xs, letterSpacing: 2, color: COLORS.textMuted },
  theoryText: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2, lineHeight: LINE_HEIGHTS.cozy },
  theoryName: { fontFamily: FONTS.primarySemiBold, color: COLORS.accentSecondary },
  theoryEmpty: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: 2 },
  // Sections
  sectionLabel: {
    fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.xs, letterSpacing: 3, color: COLORS.textSecondary,
    marginBottom: SPACING.sm, marginTop: SPACING.xs,
  },
  // Suspects
  suspectWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  suspectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: SPACING.xs + 2, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.panelOutline, backgroundColor: COLORS.surface,
  },
  suspectChipTheory: { backgroundColor: COLORS.accentSecondary, borderColor: COLORS.accentSecondary },
  suspectChipCleared: { opacity: 0.5 },
  suspectChipText: { fontFamily: FONTS.primaryMedium, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  suspectChipTextTheory: { color: COLORS.background, fontFamily: FONTS.primarySemiBold },
  suspectChipTextCleared: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  // Empty
  empty: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xl },
  emptyText: {
    fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textMuted,
    textAlign: 'center', lineHeight: LINE_HEIGHTS.cozy, paddingHorizontal: SPACING.lg,
  },
  // Clue cards (index-card aesthetic)
  clueColumn: { gap: SPACING.md },
  card: {
    backgroundColor: CARD_STATES.default.backgroundColor,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: CARD_STATES.default.borderColor,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    shadowColor: COLORS.shadowStrong,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  cardBreaker: { borderColor: CARD_STATES.selected.borderColor, borderWidth: 1.5 },
  pin: {
    position: 'absolute', top: -6, left: '50%', marginLeft: -6,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  cardTagRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  cardTag: { fontFamily: FONTS.monoBold, fontSize: 10, letterSpacing: 1.5, color: '#6a5644' },
  breakerTag: { fontFamily: FONTS.monoBold, fontSize: 10, letterSpacing: 1.5, color: CARD_STATES.selected.pin },
  cardChapter: { marginLeft: 'auto', fontFamily: FONTS.mono, fontSize: 10, color: '#8a6f52' },
  cardLabel: { fontFamily: FONTS.primaryBold, fontSize: FONT_SIZES.md, color: CARD_STATES.default.textColor, lineHeight: LINE_HEIGHTS.cozy },
  cardDetail: {
    fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: '#4a3120',
    marginTop: SPACING.xs, lineHeight: LINE_HEIGHTS.cozy,
  },
});
