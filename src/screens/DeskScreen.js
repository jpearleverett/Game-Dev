import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import ScreenSurface from '../components/ScreenSurface';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import GlassPanel from '../components/GlassPanel';
import Stamp from '../components/noir/Stamp';
import CornerFrame from '../components/noir/CornerFrame';
import Stagger from '../components/motion/Stagger';
import PressableScale from '../components/PressableScale';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/layout';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { createCasePalette } from '../theme/casePalette';
import { formatCaseOutlierThemes } from '../utils/themeDisplay';

function formatCountdown(nextUnlockAt) {
  if (!nextUnlockAt) return null;
  const target = new Date(nextUnlockAt).getTime();
  const now = Date.now();
  if (target <= now) return 'Unlocking soon';
  const diff = target - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const DEFAULT_PATH_SUMMARY = {
  title: 'Ghost Route',
  description: 'Whoever charted this trail forgot to label it, but it still reeks of trouble.',
};

const PATH_SUMMARIES = {
  ROOT: { title: 'Uncharted Route', description: 'Keep working the case to learn which poison you really picked.' },
  A: { title: 'Ledger Trail', description: 'You followed the daughter with the receipts—paper over gunpowder.' },
  B: { title: 'Gunmetal Shortcut', description: 'You stared Silas down first and let instinct write the paperwork later.' },
  AGGRESSIVE: { title: 'Confessor\'s Dare', description: 'You demanded names before alibis, daring the Midnight Confessor to blink.' },
  METHODICAL: { title: 'Clean Hands Pact', description: 'You dragged the truth into the daylight even if it cut you open.' },
  AFL: { title: 'Run-and-Report', description: 'You bolted into the rain but still handed the files to the suits.' },
  AFV: { title: 'Fugitive Justice', description: 'You stayed on the lam, serving verdicts with bruised knuckles.' },
  ASL: { title: 'Static Surveillance', description: 'You sat tight under neon hum and trusted the Feds to kick the right door.' },
  ASR: { title: 'Broken Tether', description: 'You cut the monitor and outran the sirens to grab the evidence yourself.' },
  MACLF: { title: 'Survival Clause', description: 'You bargained with Blackwell to keep breathing, letting trust take the hit.' },
  MACLS: { title: 'Martyr\'s Signature', description: 'You inked a confession to keep Sarah clean, trading freedom for penance.' },
  MAER: { title: 'Integrity League', description: 'You joined the reformers and promised to air every filthy secret.' },
  MAES: { title: 'Shadow Executor', description: 'You weaponized Blackwell\'s bankroll to erase threats off the books.' },
  MLE: { title: 'Heart-First Lead', description: 'You chased the victims\' people before politicking the room.' },
  MLEJ: { title: 'James\' Lifeline', description: 'You sprinted to Sullivan\'s lawyer to keep his appeal breathing.' },
  MLEJE: { title: 'Emily Unmasked', description: 'You swore to broadcast her torture file—and your role in it.' },
  MLEJF: { title: 'Blood-Money Brief', description: 'You slid Tom\'s offshore cash across the table to buy time.' },
  MLEM: { title: 'Margaret\'s Anchor', description: 'You pulled your ex into the mess, trading nostalgia for intel.' },
  MLI: { title: 'Casefile Surgeon', description: 'You cracked the docket yourself, scalpel-clean and by the book.' },
  MLIC: { title: 'Sterile Evidence', description: 'You only moved the uncontaminated slugs and let the rest rot.' },
  MLICC: { title: 'Necessary Leak', description: 'You tipped the right ears to save the judge and Teresa before the fire.' },
  MLICL: { title: 'Letter of the Law', description: 'You refused shortcuts and let Sarah fight it in daylight.' },
  MLIT: { title: 'Stacked Deck', description: 'You slammed the slugs and the ledger down, chain of custody be damned.' },
  MLITF: { title: 'Slush-Fund Rescue', description: 'You cracked Tom\'s offshore vault to bankroll the appeals.' },
  MLITR: { title: 'Dry-Wallet Stand', description: 'You kept your hands off the dirty cash and trusted the public defender.' },
};

function getPathSummary(pathKey) {
  if (!pathKey) return PATH_SUMMARIES.ROOT;
  const normalized = String(pathKey).trim().toUpperCase();
  return PATH_SUMMARIES[normalized] || DEFAULT_PATH_SUMMARY;
}

export default function DeskScreen({
  activeCase,
  progress,
  onStartCase,
  onOpenArchive,
  onOpenStats,
  onOpenSettings,
  onOpenMenu,
  onOpenStoryCampaign,
  onOpenCaseBoard,
  onPickUpTrail,
  onBribe,
}) {
  const storyCampaign = progress.storyCampaign || {};
  const reducedMotion = !!progress?.settings?.reducedMotion;
  const underMapFragments = storyCampaign?.underMap?.fragments?.length || 0;
  const nextStoryUnlockAt = storyCampaign?.nextStoryUnlockAt;
  const [countdown, setCountdown] = useState(formatCountdown(nextStoryUnlockAt));

  useEffect(() => {
    if (!nextStoryUnlockAt) {
      setCountdown(null);
      return;
    }
    const update = () => setCountdown(formatCountdown(nextStoryUnlockAt));
    update();
    const timer = setInterval(update, 5000);
    return () => clearInterval(timer);
  }, [nextStoryUnlockAt]);

  const solved = progress.solvedCaseIds.includes(activeCase.id);
  const failed = progress.failedCaseIds.includes(activeCase.id);
  const completed = solved || failed;
  const briefingSeen = Boolean(progress.seenBriefings && progress.seenBriefings[activeCase.id]);
  const completedSubchapters = Array.isArray(storyCampaign.completedCaseNumbers)
    ? storyCampaign.completedCaseNumbers.length
    : 0;
  const totalSubchapters = 12;
  const storyChapter = storyCampaign.chapter || 1;
  const storySubchapter = storyCampaign.subchapter || 1;
  const awaitingDecision = Boolean(storyCampaign.awaitingDecision && storyCampaign.pendingDecisionCase);
  const storyLocked = Boolean(!awaitingDecision && nextStoryUnlockAt);
  const activeCaseNumber = activeCase?.caseNumber;
  const storyActiveCaseNumber = storyCampaign?.activeCaseNumber;
  const pendingStoryAdvance = Boolean(
    !awaitingDecision && !storyLocked && storyActiveCaseNumber && activeCaseNumber &&
      storyActiveCaseNumber !== activeCaseNumber,
  );

  const primaryLabel = pendingStoryAdvance
    ? 'Continue Investigation'
    : awaitingDecision
      ? 'Review Branch Choice'
      : storyLocked
        ? 'Chapter Locked'
        : completed
          ? (solved ? 'Review Case Results' : 'Review Case Debrief')
          : briefingSeen
            ? 'Open Case File'
            : 'Investigate';
  const primaryIcon = pendingStoryAdvance
    ? <MaterialCommunityIcons name="arrow-right-circle" size={20} color={COLORS.textSecondary} />
    : awaitingDecision
      ? <MaterialCommunityIcons name="source-branch" size={20} color={COLORS.textSecondary} />
      : storyLocked
        ? <MaterialCommunityIcons name="timer-sand" size={20} color={COLORS.textSecondary} />
        : completed
          ? (solved
            ? <MaterialCommunityIcons name="file-document-check" size={20} color={COLORS.textSecondary} />
            : <MaterialCommunityIcons name="file-document-alert" size={20} color={COLORS.textSecondary} />)
          : <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />;

  const statusLine = useMemo(() => {
    if (awaitingDecision) return 'Awaiting Branch';
    if (storyLocked) return 'Chapter Locked';
    if (pendingStoryAdvance) return 'Subchapter Ready';
    if (completed) return solved ? 'Case Solved' : 'Out of Attempts';
    return 'Active Investigation';
  }, [awaitingDecision, storyLocked, pendingStoryAdvance, completed, solved]);
  const statusColor = solved ? COLORS.successGreen : failed ? COLORS.bloodRed : awaitingDecision ? COLORS.underViolet : COLORS.accentSecondary;

  const lastDecision = storyCampaign?.lastDecision || null;
  const lockedPathKey = storyCampaign.currentPathKey || 'ROOT';
  const hasLockedPath = Boolean(lastDecision?.optionKey);
  const lockedPathSummary = useMemo(
    () => getPathSummary(hasLockedPath ? lockedPathKey : 'ROOT'),
    [lockedPathKey, hasLockedPath],
  );
  const isEarlyIntroSubchapter = storyChapter === 1 && storySubchapter >= 1 && storySubchapter <= 3;
  const showPathCard = hasLockedPath && !isEarlyIntroSubchapter;

  const showCaseThemes = solved;
  const outlierThemeDisplay = showCaseThemes
    ? formatCaseOutlierThemes(activeCase, { separator: '  •  ' }) || 'Unknown Theme'
    : null;

  const handleQuickPress = (callback) => () => {
    Haptics.selectionAsync().catch(() => {});
    callback?.();
  };
  const handleStoryPress = handleQuickPress(onOpenStoryCampaign);
  const handleSettingsPress = handleQuickPress(onOpenSettings);
  const handleBribe = async () => {
    if (onBribe) await onBribe();
  };

  const { sizeClass, moderateScale } = useResponsiveLayout();
  const compact = sizeClass === 'xsmall' || sizeClass === 'small';
  const palette = useMemo(() => createCasePalette(activeCase), [activeCase]);

  // Editorial type scale (dramatic, Persona-ish).
  const caseNoSize = moderateScale(compact ? 17 : 20);
  const titleSize = moderateScale(compact ? 36 : 48);
  const statNumSize = moderateScale(compact ? 40 : 52);

  return (
    <ScreenSurface variant="desk" accentColor={palette.accent}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.brand}>DEAD LETTERS</Text>
          <View style={styles.topRight}>
            <Text style={styles.brandSub}>ASHPORT · P.I.</Text>
            <Pressable onPress={handleSettingsPress} hitSlop={10} style={styles.settingsBtn}>
              <MaterialCommunityIcons name="cog-outline" size={22} color={COLORS.accentCyan} />
            </Pressable>
          </View>
        </View>

        <Stagger reducedMotion={reducedMotion} distance={18}>
          {/* HERO — the case file, editorial */}
          <View style={styles.hero}>
            <View style={styles.heroSlash} pointerEvents="none" />
            <Text style={styles.eyebrow}>ACTIVE CASE FILE</Text>
            <Text style={[styles.caseNo, { fontSize: caseNoSize }]}>№ {activeCase.caseNumber}</Text>
            <Text
              style={[styles.title, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.0) }]}
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {activeCase.title}
            </Text>
            <View style={styles.stampRow}>
              <Stamp label={`STATUS · ${statusLine}`} color={statusColor} angle={-4} size={compact ? 10 : 11} />
              {solved && outlierThemeDisplay ? (
                <Stamp label="INTEL ACQUIRED" color={COLORS.successGreen} angle={3} filled={false} size={compact ? 9 : 10} />
              ) : null}
            </View>
          </View>

          {/* Primary action */}
          {storyLocked ? (
            <View style={styles.lockedActions}>
              {onPickUpTrail ? (
                <PrimaryButton
                  label="Pick Up the Trail Now"
                  icon={<MaterialCommunityIcons name="shoe-print" size={20} color={COLORS.textSecondary} />}
                  onPress={handleQuickPress(onPickUpTrail)}
                  fullWidth
                />
              ) : null}
              {onBribe ? (
                <SecondaryButton
                  label="Bribe the clerk to rush it ($0.99)"
                  icon={<MaterialCommunityIcons name="cash-multiple" size={18} color={COLORS.textSecondary} />}
                  onPress={handleBribe}
                />
              ) : null}
            </View>
          ) : (
            <PrimaryButton label={primaryLabel} icon={primaryIcon} onPress={onStartCase} fullWidth />
          )}

          {/* NEXT line */}
          <Text style={styles.nextLine}>
            ▸ NEXT  ·  CHAPTER {storyChapter}.{storySubchapter}
            {storyLocked && countdown ? `  ·  UNLOCKS ${countdown}` : ''}
          </Text>

          {/* Giant-number stats */}
          <View style={styles.statRow}>
            <PressableScale reducedMotion={reducedMotion} containerStyle={styles.statFlex} style={styles.statBlock} onPress={handleQuickPress(onOpenArchive)}>
              <Text style={[styles.statNum, { fontSize: statNumSize }]}>
                {completedSubchapters}<Text style={styles.statDenom}>/{totalSubchapters}</Text>
              </Text>
              <Text style={styles.statLabel}>SUBCHAPTERS · ARCHIVE</Text>
            </PressableScale>
            <View style={styles.statDivider} />
            <PressableScale reducedMotion={reducedMotion} containerStyle={styles.statFlex} style={styles.statBlock} onPress={handleQuickPress(onOpenStats)}>
              <Text style={[styles.statNum, { fontSize: statNumSize }]}>{progress.streak}</Text>
              <Text style={styles.statLabel}>DAYS ON THE FORCE</Text>
            </PressableScale>
          </View>

          {/* Story campaign — amber glass strip */}
          <PressableScale reducedMotion={reducedMotion} onPress={handleStoryPress} style={styles.stripWrap}>
            <GlassPanel edge="amber" radius={RADIUS.lg} contentStyle={styles.strip}>
              <View style={styles.stripText}>
                <Text style={styles.stripTitle}>STORY CAMPAIGN</Text>
                <Text style={styles.stripSub}>Work the full arc — no clocks, just clues.</Text>
              </View>
              <MaterialCommunityIcons name="arrow-right-thin" size={26} color={COLORS.accentSecondary} />
            </GlassPanel>
          </PressableScale>

          {/* Under-Map — violet glass strip (the mystical layer) */}
          {onOpenCaseBoard ? (
            <PressableScale reducedMotion={reducedMotion} onPress={handleQuickPress(onOpenCaseBoard)} style={styles.stripWrap}>
              <GlassPanel edge="violet" radius={RADIUS.lg} contentStyle={styles.strip}>
                <MaterialCommunityIcons name="map-marker-path" size={24} color={COLORS.underViolet} />
                <View style={[styles.stripText, { marginLeft: SPACING.md }]}>
                  <Text style={[styles.stripTitle, { color: COLORS.underViolet }]}>THE UNDER-MAP</Text>
                  <Text style={styles.stripSub}>
                    {underMapFragments > 0
                      ? `${underMapFragments} ${underMapFragments === 1 ? 'fragment' : 'fragments'} charted`
                      : 'A reality that doesn’t want to be seen.'}
                  </Text>
                </View>
                <MaterialCommunityIcons name="arrow-right-thin" size={26} color={COLORS.underViolet} />
              </GlassPanel>
            </PressableScale>
          ) : null}

          {/* Sealed path — dossier corner-frame */}
          {showPathCard ? (
            <CornerFrame color={COLORS.accentSecondary} size={16} style={styles.pathFrame}>
              <View style={styles.pathInner}>
                <Text style={styles.pathKicker}>SEALED PATH</Text>
                <Text style={styles.pathTitle}>{lockedPathSummary.title}</Text>
                <Text style={styles.pathDesc} numberOfLines={2}>{lockedPathSummary.description}</Text>
              </View>
            </CornerFrame>
          ) : null}
        </Stagger>
      </ScrollView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: SPACING.gutter, gap: SPACING.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontFamily: FONTS.monoBold, fontSize: FONT_SIZES.sm, letterSpacing: 4, color: COLORS.offWhite },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  brandSub: { fontFamily: FONTS.mono, fontSize: FONT_SIZES.xs, letterSpacing: 2, color: COLORS.textMuted },
  settingsBtn: { padding: 4 },

  // Hero
  hero: { position: 'relative', paddingVertical: SPACING.sm, gap: SPACING.xs },
  heroSlash: {
    position: 'absolute', right: -40, top: 8, width: 220, height: 3,
    backgroundColor: COLORS.bloodRed, opacity: 0.85, transform: [{ rotate: '-26deg' }],
  },
  eyebrow: { fontFamily: FONTS.monoBold, fontSize: FONT_SIZES.xs, letterSpacing: 4, color: COLORS.accentSecondary, textTransform: 'uppercase' },
  caseNo: { fontFamily: FONTS.monoBold, letterSpacing: 4, color: 'rgba(246, 236, 219, 0.45)' },
  title: { fontFamily: FONTS.secondaryBold, color: COLORS.offWhite, letterSpacing: 1, textTransform: 'uppercase', marginTop: SPACING.xs },
  stampRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: SPACING.md, alignItems: 'center' },

  nextLine: { fontFamily: FONTS.mono, fontSize: FONT_SIZES.xs, letterSpacing: 2.4, color: COLORS.textMuted, textTransform: 'uppercase' },

  lockedActions: { gap: SPACING.sm },

  // Stats
  statRow: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.panelOutline, paddingVertical: SPACING.md },
  statFlex: { flex: 1 },
  statBlock: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: SPACING.sm },
  statNum: { fontFamily: FONTS.secondaryBold, color: COLORS.offWhite },
  statDenom: { fontFamily: FONTS.secondaryBold, color: COLORS.textMuted, fontSize: FONT_SIZES.lg },
  statLabel: { fontFamily: FONTS.mono, fontSize: 9.5, letterSpacing: 1.4, color: COLORS.accentSecondary, textTransform: 'uppercase', textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: COLORS.panelOutline, marginVertical: SPACING.sm },

  // Glass strips
  stripWrap: { width: '100%' },
  strip: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.lg, paddingHorizontal: SPACING.lg },
  stripText: { flex: 1, gap: 3 },
  stripTitle: { fontFamily: FONTS.secondaryBold, fontSize: FONT_SIZES.lg, letterSpacing: 2, color: COLORS.offWhite },
  stripSub: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, letterSpacing: 0.4, color: COLORS.textSecondary },

  // Sealed path
  pathFrame: { padding: SPACING.xs },
  pathInner: { padding: SPACING.lg, gap: SPACING.xs },
  pathKicker: { fontFamily: FONTS.monoBold, fontSize: FONT_SIZES.xs, letterSpacing: 3, color: COLORS.accentSecondary, textTransform: 'uppercase' },
  pathTitle: { fontFamily: FONTS.secondaryBold, fontSize: FONT_SIZES.lg, color: COLORS.offWhite, letterSpacing: 1 },
  pathDesc: { fontFamily: FONTS.primary, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
});
