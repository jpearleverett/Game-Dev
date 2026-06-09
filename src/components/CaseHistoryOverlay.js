import React, { useCallback, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable, ImageBackground, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PrimaryButton from './PrimaryButton';
import { FONTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';
import { COLORS } from '../constants/colors';

const CASE_FILE_BG = require('../../assets/images/ui/backgrounds/case-file-bg.jpg');

// Match the live reader's "noir paper" body so re-reading feels like the same case file.
const PAPER_TEXT = {
  fontFamily: FONTS.primary,
  color: '#332617',
  fontSize: 16,
  lineHeight: 30,
};
const PAPER_LABEL_FONT = Platform.OS === 'ios' ? 'Courier' : 'monospace';

/**
 * Read-only "The Case So Far" overlay.
 *
 * Shows every prior subchapter's REALIZED prose (the exact path the player took),
 * oldest at top → most recent at bottom. Opens scrolled to the bottom so it reads
 * continuously back from where the player just was; they can scroll up to the very
 * beginning, jump to the start, or snap back to the live page (close).
 *
 * This is deliberately inert — no choices, no EXAMINE taps — so it can never disturb
 * the live interactive reader or the Under-Map.
 *
 * @param {boolean} visible
 * @param {Array<{caseNumber, chapter, letter, title, text}>} history - ordered oldest→newest
 * @param {Function} onClose - return to the live page ("snap to latest")
 */
export default function CaseHistoryOverlay({ visible, history = [], onClose }) {
  const scrollRef = useRef(null);
  const snapBottomRef = useRef(true);

  useEffect(() => {
    if (visible) snapBottomRef.current = true;
  }, [visible]);

  const handleContentSize = useCallback(() => {
    if (snapBottomRef.current && scrollRef.current) {
      snapBottomRef.current = false;
      scrollRef.current.scrollToEnd({ animated: false });
    }
  }, []);

  const jumpToStart = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <ImageBackground source={CASE_FILE_BG} resizeMode="cover" style={styles.bg}>
        <View style={styles.lighten} pointerEvents="none" />

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>THE CASE SO FAR</Text>
            <Text style={styles.sub}>Everything you've read up to now — scroll back as far as you like.</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Return to the latest page">
            <MaterialCommunityIcons name="close" size={22} color="#332617" />
          </Pressable>
        </View>

        {history.length > 1 ? (
          <Pressable onPress={jumpToStart} hitSlop={8} style={styles.jumpStart} accessibilityRole="button">
            <MaterialCommunityIcons name="arrow-up" size={13} color="#5a4a33" />
            <Text style={styles.jumpStartText}>JUMP TO THE BEGINNING</Text>
          </Pressable>
        ) : null}

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollBody}
          onContentSizeChange={handleContentSize}
          showsVerticalScrollIndicator={false}
        >
          {history.length === 0 ? (
            <Text style={[styles.body, { opacity: 0.7 }]}>The case has only just begun. There's nothing behind you yet.</Text>
          ) : (
            history.map((item) => (
              <View key={item.caseNumber} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryRule} />
                  <Text style={styles.entryLabel}>
                    {`CHAPTER ${String(item.chapter).padStart(2, '0')} · ${item.letter}`}
                    {item.title ? `  —  ${item.title.toUpperCase()}` : ''}
                  </Text>
                  <View style={styles.entryRule} />
                </View>
                <Text style={styles.body}>{item.text}</Text>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label="Return to where you left off"
            onPress={onClose}
            fullWidth
            icon={<MaterialCommunityIcons name="arrow-right-bold" size={18} color={COLORS.textSecondary} />}
          />
        </View>
      </ImageBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  lighten: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(247,240,224,0.30)' },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
  },
  kicker: { fontFamily: PAPER_LABEL_FONT, fontSize: 13, letterSpacing: 2.4, fontWeight: 'bold', color: '#332617' },
  sub: { fontFamily: FONTS.primary, fontSize: 12, color: '#5a4a33', marginTop: 4 },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(51,38,23,0.08)', borderWidth: 1, borderColor: 'rgba(51,38,23,0.18)',
  },
  jumpStart: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center',
    paddingVertical: 5, paddingHorizontal: 12, marginBottom: 2,
  },
  jumpStartText: { fontFamily: PAPER_LABEL_FONT, fontSize: 10, letterSpacing: 1.4, color: '#5a4a33' },
  scroll: { flex: 1 },
  scrollBody: { paddingHorizontal: 24, paddingTop: SPACING.sm, paddingBottom: SPACING.xl },
  entry: { marginBottom: SPACING.xl },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.md },
  entryRule: { flex: 1, height: 1, backgroundColor: 'rgba(51,38,23,0.22)' },
  entryLabel: { fontFamily: PAPER_LABEL_FONT, fontSize: 10.5, letterSpacing: 1.2, color: '#5a4a33', maxWidth: '74%', textAlign: 'center' },
  body: { ...PAPER_TEXT },
  footer: {
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
    borderTopWidth: 1, borderTopColor: 'rgba(51,38,23,0.15)',
    backgroundColor: 'rgba(247,240,224,0.55)',
  },
});
