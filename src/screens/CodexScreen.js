import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import ScreenSurface from '../components/ScreenSurface';
import ShareCard from '../components/ShareCard';
import { FIELD_NOTE_LIST } from '../data/fieldNotes';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../context/GameContext';
import {
  normalizeUnderMap,
  clarity,
  endingVariant,
  foil,
  foilPresence,
  mapDepth,
  isMotif,
  isKeystone,
  motifCount,
  keystoneCount,
  arcNodeCount,
  bestFlawlessStreak,
  dailyStreak,
  FRAGMENT_KIND,
} from '../data/underMap';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';

const KIND_COLOR = {
  [FRAGMENT_KIND.SYMBOL]: COLORS.kindSymbol,
  [FRAGMENT_KIND.PLACE]: COLORS.kindPlace,
  [FRAGMENT_KIND.PERSON]: COLORS.kindPerson,
  [FRAGMENT_KIND.PHENOMENON]: COLORS.kindPhenomenon,
};
const colorFor = (k) => KIND_COLOR[k] || COLORS.underViolet;
const KIND_LABEL = {
  [FRAGMENT_KIND.SYMBOL]: 'Symbols',
  [FRAGMENT_KIND.PLACE]: 'Places',
  [FRAGMENT_KIND.PERSON]: 'People',
  [FRAGMENT_KIND.PHENOMENON]: 'Phenomena',
};

const VARIANT = {
  unproven: {
    label: 'Unproven',
    color: COLORS.textMuted,
    line: 'No reading has been tested yet. Seal a belief at a chapter’s end; the next chapter bears it out — or betrays it.',
  },
  clear: {
    label: 'Clear-eyed',
    color: COLORS.underCyan,
    line: 'You have read the hidden world true. Your worldview is steering toward an ending only the clear-sighted reach.',
  },
  half: {
    label: 'Half-deceived',
    color: COLORS.amberLight,
    line: 'Some readings held; others were subverted. The world is steering you toward a murkier end.',
  },
  deceived: {
    label: 'Deceived',
    color: COLORS.bloodRed,
    line: 'The hidden world has misled you more than not. You are being drawn toward an ending built on false belief.',
  },
};

function Section({ title, count, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {count != null ? <Text style={styles.sectionCount}>{count}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export default function CodexScreen({ navigation }) {
  const { progress } = useGame();
  const map = useMemo(() => normalizeUnderMap(progress?.storyCampaign?.underMap), [progress?.storyCampaign?.underMap]);
  const [sharing, setSharing] = useState(false);

  const cl = useMemo(() => clarity(map), [map]);
  const variant = useMemo(() => endingVariant(map), [map]);
  const fl = useMemo(() => foil(map), [map]);
  const flPresence = useMemo(() => foilPresence(map), [map]);
  const flLine = flPresence >= 3 ? 'Ascendant. Their reading is becoming the truth of the hidden world.'
    : flPresence === 2 ? 'Walking Ashport with a face now. The city is bending toward their reading.'
    : flPresence === 1 ? 'Glimpsed twice at the edges. Gaining ground each time you read wrong.'
    : 'A rumor at the margins — the road you did not take, waiting.';
  const depth = useMemo(() => mapDepth(map), [map]);
  const depthPct = Math.round(depth.ratio * 100);
  const v = VARIANT[variant] || VARIANT.unproven;

  const theories = useMemo(() => [...map.theories].sort((a, b) => (b.chapter || 0) - (a.chapter || 0)), [map.theories]);
  const nodes = useMemo(() => map.nodes.filter((n) => n && n.revelation && !n.unresolvedReading), [map.nodes]);
  const motifs = useMemo(
    () => map.fragments.filter(isMotif).sort((a, b) => (b.seen || 0) - (a.seen || 0)),
    [map.fragments],
  );
  const kindCounts = useMemo(() => {
    const counts = {};
    map.fragments.forEach((f) => { counts[f.kind] = (counts[f.kind] || 0) + 1; });
    return counts;
  }, [map.fragments]);

  const empty = map.fragments.length === 0 && theories.length === 0;

  return (
    <ScreenSurface variant="default" glow="violet" frameless contentStyle={styles.surface}>
      <View style={styles.header}>
        <View style={styles.headRow}>
          <Text style={styles.kicker}>◇ THE UNDER-MAP</Text>
          <View style={styles.headActions}>
            {map.fragments.length > 0 ? (
              <Pressable onPress={() => setSharing(true)} hitSlop={10}>
                <Text style={styles.shareLink}>SHARE</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}><Text style={styles.close}>✕</Text></Pressable>
          </View>
        </View>
        <Text style={styles.title}>Your Reading of{'\n'}the Hidden World</Text>
        <View style={styles.depthWrap}>
          <View style={styles.depthTrack}><View style={[styles.depthFill, { width: `${Math.max(3, depthPct)}%` }]} /></View>
          <Text style={styles.depthLabel}>
            {depthPct >= 100 ? 'The hidden world stands revealed' : depthPct >= 50 ? 'The map is taking shape' : 'Something is forming in the dark'} · {depthPct}% mapped
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {empty ? (
          <Text style={styles.empty}>
            Nothing mapped yet. Read the scenes, collect the anomalies that don’t belong, and connect them on the Under-Map. Your reading of the hidden world will assemble here.
          </Text>
        ) : null}

        {/* Worldview / ending steer */}
        <View style={[styles.worldview, { borderColor: v.color + '66' }]}>
          <Text style={styles.worldviewKicker}>WHERE YOUR BELIEFS STEER</Text>
          <Text style={[styles.worldviewLabel, { color: v.color }]}>{v.label}</Text>
          {cl.resolved > 0 ? (
            <Text style={styles.worldviewClarity}>You read the hidden world true {cl.correct} of {cl.resolved} times · {Math.round(cl.ratio * 100)}% clarity</Text>
          ) : null}
          <Text style={styles.worldviewLine}>{v.line}</Text>
        </View>

        {/* The Other Reader — the road not taken, given a face */}
        {fl ? (
          <View style={styles.foilCard}>
            <Text style={styles.foilKicker}>◆ THE OTHER READER</Text>
            <Text style={styles.foilBelief}>“{fl.belief}”</Text>
            <Text style={styles.foilLine}>{flLine}</Text>
          </View>
        ) : null}

        {/* Stat strip */}
        <View style={styles.statStrip}>
          {[
            [map.fragments.length, 'FRAGMENTS'],
            [nodes.length, 'TRUTHS'],
            [motifCount(map), 'MOTIFS'],
            [keystoneCount(map), 'KEYSTONES'],
            [arcNodeCount(map), 'ARC TRUTHS'],
            [bestFlawlessStreak(map), 'BEST STREAK'],
            [Math.max(dailyStreak(map), map.bestDailyStreak || 0), 'DAYS MAPPED'],
          ].map(([n, l]) => (
            <View key={l} style={styles.stat}>
              <Text style={styles.statNum}>{n}</Text>
              <Text style={styles.statLabel}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Beliefs sealed */}
        {theories.length > 0 ? (
          <Section title="Beliefs you have sealed" count={theories.length}>
            {theories.map((t, i) => {
              const status = t.correct == null ? 'unproven' : t.correct ? 'true' : 'false';
              return (
                <View key={i} style={styles.belief}>
                  <View style={styles.beliefHead}>
                    <Text style={styles.beliefChapter}>CH {String(t.chapter || 0).padStart(3, '0')}</Text>
                    <Text style={[
                      styles.beliefStatus,
                      status === 'true' && { color: COLORS.amberLight },
                      status === 'false' && { color: COLORS.bloodRed },
                    ]}>
                      {status === 'true' ? 'HELD TRUE' : status === 'false' ? 'SUBVERTED' : 'UNPROVEN'}
                    </Text>
                  </View>
                  <Text style={styles.beliefText}>“{t.interpretation}”</Text>
                </View>
              );
            })}
          </Section>
        ) : null}

        {/* Truths revealed */}
        {nodes.length > 0 ? (
          <Section title="Truths you have surfaced" count={nodes.length}>
            {nodes.map((n, i) => (
              <View key={i} style={styles.truth}>
                <Text style={[styles.truthMark, n.scope === 'arc' && styles.truthMarkArc]}>{n.scope === 'arc' ? '◆' : '•'}</Text>
                <View style={{ flex: 1 }}>
                  {n.scope === 'arc' ? <Text style={styles.arcTag}>ARC TRUTH · the payoff for your long attention</Text> : null}
                  <Text style={styles.truthText}>{n.revelation}</Text>
                </View>
              </View>
            ))}
          </Section>
        ) : null}

        {/* Motifs & keystones */}
        {motifs.length > 0 ? (
          <Section title="Recurring motifs" count={motifs.length}>
            <View style={styles.motifWrap}>
              {motifs.map((f) => {
                const key = isKeystone(f);
                return (
                  <View key={f.id} style={[styles.motif, key && styles.motifKey]}>
                    <View style={[styles.kdot, { backgroundColor: colorFor(f.kind), shadowColor: colorFor(f.kind) }]} />
                    <Text style={styles.motifLabel}>{f.label}</Text>
                    <Text style={styles.motifSeen}>×{f.seen || 1}{key ? ' · keystone' : ''}</Text>
                  </View>
                );
              })}
            </View>
          </Section>
        ) : null}

        {/* Fragments by kind */}
        {map.fragments.length > 0 ? (
          <Section title="Fragments collected" count={map.fragments.length}>
            <View style={styles.kindRow}>
              {Object.keys(KIND_LABEL).map((k) => (
                <View key={k} style={styles.kindChip}>
                  <View style={[styles.kdot, { backgroundColor: colorFor(k), shadowColor: colorFor(k) }]} />
                  <Text style={styles.kindCount}>{kindCounts[k] || 0}</Text>
                  <Text style={styles.kindName}>{KIND_LABEL[k]}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        <View style={{ height: 28 }} />
        {/* FIELD NOTES glossary: every system lesson, re-readable any time. */}
        <Section title="Field notes" count={FIELD_NOTE_LIST.length}>
          {FIELD_NOTE_LIST.map((n) => (
            <View key={n.key} style={styles.fieldNote}>
              <View style={styles.fieldNoteHead}>
                <MaterialCommunityIcons name={n.icon || 'notebook-outline'} size={14} color={COLORS.underCyan} />
                <Text style={styles.fieldNoteTitle}>{n.title}</Text>
              </View>
              <Text style={styles.fieldNoteBody}>{n.body}</Text>
            </View>
          ))}
        </Section>
      </ScrollView>

      <ShareCard
        visible={sharing}
        map={map}
        chapter={progress?.storyCampaign?.chapter || null}
        onClose={() => setSharing(false)}
      />
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  surface: { paddingHorizontal: 0, paddingVertical: 0 },
  header: { paddingHorizontal: 22, paddingTop: 30, paddingBottom: 14 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kicker: { fontFamily: FONTS.mono, fontSize: 10.5, letterSpacing: 2.6, color: COLORS.underCyan, textShadowColor: COLORS.underCyanGlow, textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } },
  close: { fontFamily: FONTS.mono, fontSize: 18, color: COLORS.textMuted },
  headActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  shareLink: { fontFamily: FONTS.monoBold, fontSize: 10.5, letterSpacing: 2, color: COLORS.underCyan },
  fieldNote: {
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(125,211,252,0.18)',
    backgroundColor: 'rgba(14,18,28,0.5)', padding: 13, gap: 6, marginBottom: 8,
  },
  fieldNoteHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldNoteTitle: { fontFamily: FONTS.primarySemiBold, fontSize: 13.5, color: COLORS.textPrimary },
  fieldNoteBody: { fontFamily: FONTS.primary, fontSize: 12, lineHeight: 18, color: COLORS.textMuted },
  title: { fontFamily: FONTS.secondaryBold, fontSize: 29, lineHeight: 32, color: '#f3eeff', textShadowColor: COLORS.underGlow, textShadowRadius: 26, textShadowOffset: { width: 0, height: 0 } },

  depthWrap: { marginTop: 16 },
  depthTrack: { height: 4, borderRadius: 3, backgroundColor: 'rgba(167,139,250,0.18)', overflow: 'hidden' },
  depthFill: { height: 4, borderRadius: 3, backgroundColor: COLORS.underViolet },
  depthLabel: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 0.6, color: COLORS.textMuted, marginTop: 7 },

  scroll: { flex: 1 },
  scrollBody: { paddingHorizontal: 22, paddingTop: 6 },
  empty: { fontFamily: FONTS.primary, fontSize: 14, lineHeight: 22, color: COLORS.textMuted, marginVertical: 24 },

  worldview: { borderWidth: 1, borderRadius: 16, padding: 18, backgroundColor: 'rgba(20,16,30,0.6)', marginTop: 8 },
  worldviewKicker: { fontFamily: FONTS.mono, fontSize: 9.5, letterSpacing: 2.4, color: COLORS.textMuted },
  worldviewLabel: { fontFamily: FONTS.secondaryBold, fontSize: 26, marginTop: 6 },
  worldviewClarity: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 0.4, color: COLORS.textSecondary, marginTop: 8 },
  worldviewLine: { fontFamily: FONTS.primary, fontSize: 13.5, lineHeight: 21, color: COLORS.textSecondary, marginTop: 10 },
  foilCard: { borderWidth: 1, borderColor: COLORS.bloodRed + '55', borderRadius: 16, padding: 18, backgroundColor: 'rgba(30,14,16,0.55)', marginTop: 12 },
  foilKicker: { fontFamily: FONTS.mono, fontSize: 9.5, letterSpacing: 2.4, color: COLORS.bloodRed },
  foilBelief: { fontFamily: FONTS.secondaryBold, fontSize: 17, lineHeight: 24, color: COLORS.textPrimary, marginTop: 8 },
  foilLine: { fontFamily: FONTS.primary, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary, marginTop: 8 },

  statStrip: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 18, marginHorizontal: -6 },
  stat: { width: '33.33%', paddingHorizontal: 6, paddingVertical: 8, alignItems: 'center' },
  statNum: { fontFamily: FONTS.secondaryBold, fontSize: 22, color: COLORS.underViolet },
  statLabel: { fontFamily: FONTS.mono, fontSize: 8.5, letterSpacing: 1, color: COLORS.textSubtle, marginTop: 2 },

  section: { marginTop: 26 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { fontFamily: FONTS.secondaryBold, fontSize: 17, color: '#e9e2ff' },
  sectionCount: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textMuted },

  belief: { borderLeftWidth: 2, borderLeftColor: 'rgba(167,139,250,0.4)', paddingLeft: 12, marginBottom: 14 },
  beliefHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  beliefChapter: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1.6, color: COLORS.textMuted },
  beliefStatus: { fontFamily: FONTS.monoBold, fontSize: 9.5, letterSpacing: 1.6, color: COLORS.textSubtle },
  beliefText: { fontFamily: FONTS.primary, fontStyle: 'italic', fontSize: 14.5, lineHeight: 21, color: COLORS.textPrimary },

  truth: { flexDirection: 'row', gap: 10, marginBottom: 13 },
  truthMark: { fontFamily: FONTS.mono, fontSize: 13, color: COLORS.underCyan, lineHeight: 21 },
  truthMarkArc: { color: COLORS.amberLight },
  arcTag: { fontFamily: FONTS.monoBold, fontSize: 8.5, letterSpacing: 1.4, color: COLORS.amberLight, marginBottom: 3 },
  truthText: { fontFamily: FONTS.primary, fontSize: 14, lineHeight: 21, color: COLORS.textSecondary },

  motifWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  motif: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.22)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  motifKey: { borderColor: 'rgba(241,197,114,0.5)', backgroundColor: 'rgba(241,197,114,0.08)' },
  motifLabel: { fontFamily: FONTS.primary, fontSize: 12.5, color: COLORS.textPrimary },
  motifSeen: { fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted },

  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kindChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6 },
  kindCount: { fontFamily: FONTS.secondaryBold, fontSize: 16, color: COLORS.textPrimary },
  kindName: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 0.6, color: COLORS.textMuted },

  kdot: { width: 8, height: 8, borderRadius: 4, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
});
