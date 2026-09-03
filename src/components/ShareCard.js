/**
 * Shareable artifact: the player's Under-Map as an image. Every player's
 * constellation is unique — this is the thing that leaves the game (the Wordle
 * grid of Dead Letters). Renders a stylized card, captures it with
 * react-native-view-shot, and hands it to the native share sheet.
 *
 * Self-contained modal: <ShareCard visible map chapter ending? onClose />.
 * Fully defensive — capture/share failures degrade to a soft message.
 */
import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import UnderMapConstellation from './UnderMapConstellation';
import { normalizeUnderMap, clarity, mapDepth, foil, foilIsManifest } from '../data/underMap';
import { analytics } from '../services/AnalyticsService';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';

export default function ShareCard({ visible, map: rawMap, chapter = null, ending = null, onClose }) {
  const shotRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const map = normalizeUnderMap(rawMap);
  const cl = clarity(map);
  const depth = mapDepth(map);
  const fl = foil(map);
  const latestBelief = map.theories[0]?.interpretation || null;
  const clarityPct = Math.round(cl.ratio * 100);

  const handleShare = useCallback(async () => {
    if (busy) return;
    setBusy(true); setNote(null);
    try {
      const uri = await shotRef.current?.capture?.();
      if (!uri) throw new Error('capture failed');
      const ok = await Sharing.isAvailableAsync();
      if (!ok) throw new Error('sharing unavailable');
      analytics.logEvent('share_card', { chapter, hasEnding: !!ending, clarityPct });
      await Sharing.shareAsync(uri.startsWith('file://') ? uri : `file://${uri}`, {
        mimeType: 'image/png',
        dialogTitle: 'Share your reading of Ashport',
      });
    } catch (_e) {
      setNote('Couldn’t open the share sheet on this device.');
    } finally {
      setBusy(false);
    }
  }, [busy, chapter, ending, clarityPct]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 0.95 }} style={styles.shot}>
          <View style={styles.card}>
            <Text style={styles.wordmark}>DEAD LETTERS</Text>
            <Text style={styles.sub}>
              {ending ? `MY ENDING · ${String(ending.kicker || ending.title || '').toUpperCase()}` : 'MY READING OF THE HIDDEN WORLD'}
            </Text>
            <View style={styles.constWrap} pointerEvents="none">
              <UnderMapConstellation map={map} height={190} />
            </View>
            <View style={styles.statRow}>
              {chapter ? (
                <View style={styles.stat}><Text style={styles.statNum}>{String(chapter).padStart(2, '0')}</Text><Text style={styles.statLabel}>CHAPTER</Text></View>
              ) : null}
              <View style={styles.stat}><Text style={styles.statNum}>{depth.drawn}</Text><Text style={styles.statLabel}>TRUTHS</Text></View>
              <View style={styles.stat}><Text style={styles.statNum}>{map.fragments.length}</Text><Text style={styles.statLabel}>FRAGMENTS</Text></View>
              {cl.resolved > 0 ? (
                <View style={styles.stat}><Text style={styles.statNum}>{clarityPct}%</Text><Text style={styles.statLabel}>CLARITY</Text></View>
              ) : null}
            </View>
            {latestBelief ? (
              <Text style={styles.belief}>“{latestBelief}”</Text>
            ) : null}
            {fl?.belief && foilIsManifest(map) ? (
              <Text style={styles.foilLine}>The Other Reader{fl.name ? ` — ${fl.name} —` : ''} is still out there.</Text>
            ) : null}
            <Text style={styles.tagline}>map the city beneath the city</Text>
          </View>
        </ViewShot>

        {note ? <Text style={styles.note}>{note}</Text> : null}
        <View style={styles.btnRow}>
          <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose} disabled={busy}>
            <Text style={styles.btnGhostText}>Close</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnPrimary, busy && { opacity: 0.6 }]} onPress={handleShare} disabled={busy}>
            <Text style={styles.btnPrimaryText}>{busy ? 'Preparing…' : 'Share'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(7,6,14,0.92)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  shot: { width: '100%', maxWidth: 380 },
  card: {
    borderRadius: 20, padding: 22, gap: 10, overflow: 'hidden',
    backgroundColor: '#100c1c', borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)',
  },
  wordmark: { fontFamily: FONTS.secondaryBold, fontSize: 24, letterSpacing: 2, color: '#f3eeff', textAlign: 'center', textShadowColor: COLORS.underGlow, textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  sub: { fontFamily: FONTS.mono, fontSize: 9.5, letterSpacing: 2.4, color: COLORS.underCyan, textAlign: 'center' },
  constWrap: { borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(10,8,18,0.8)', marginTop: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 4 },
  stat: { alignItems: 'center' },
  statNum: { fontFamily: FONTS.secondaryBold, fontSize: 20, color: COLORS.amberLight },
  statLabel: { fontFamily: FONTS.mono, fontSize: 8.5, letterSpacing: 1.4, color: COLORS.textSubtle, marginTop: 1 },
  belief: { fontFamily: FONTS.secondary, fontStyle: 'italic', fontSize: 14, lineHeight: 20, color: COLORS.textPrimary, textAlign: 'center', marginTop: 4 },
  foilLine: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 0.6, color: COLORS.bloodRed, textAlign: 'center' },
  tagline: { fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 2, color: COLORS.textSubtle, textAlign: 'center', marginTop: 6 },
  note: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.bloodRed, marginTop: 12 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: { paddingVertical: 13, paddingHorizontal: 28, borderRadius: 12 },
  btnPrimary: { backgroundColor: COLORS.underViolet },
  btnPrimaryText: { fontFamily: FONTS.primarySemiBold, fontWeight: '700', fontSize: 14, color: '#15101f' },
  btnGhost: { borderWidth: 1, borderColor: 'rgba(245,230,205,0.25)' },
  btnGhostText: { fontFamily: FONTS.primarySemiBold, fontSize: 14, color: COLORS.textPrimary },
});
