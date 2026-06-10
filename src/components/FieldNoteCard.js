/**
 * One-time, just-in-time teaching card (see src/data/fieldNotes.js). Shown the
 * first time a system touches the player — a held moment, not a toast. Diegetic:
 * a note pinned into Jack's field book.
 *
 * <FieldNoteCard note={FIELD_NOTES.x} visible onDismiss />
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { selectionHaptic } from '../utils/haptics';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';

export default function FieldNoteCard({ note, visible, onDismiss, reducedMotion = false }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    if (reducedMotion) { anim.setValue(1); return; }
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }).start();
  }, [visible, anim, reducedMotion]);

  if (!visible || !note) return null;

  const handleDismiss = () => { selectionHaptic(); onDismiss?.(); };

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.card,
          { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] },
        ]}
      >
        <View style={styles.pin} />
        <View style={styles.head}>
          <MaterialCommunityIcons name={note.icon || 'notebook-outline'} size={20} color={COLORS.underCyan} />
          <Text style={styles.kicker}>FIELD NOTE</Text>
        </View>
        <Text style={styles.title}>{note.title}</Text>
        <Text style={styles.body}>{note.body}</Text>
        <Pressable style={styles.btn} onPress={handleDismiss} accessibilityRole="button" accessibilityLabel="Dismiss field note">
          <Text style={styles.btnText}>Noted</Text>
        </Pressable>
        <Text style={styles.hint}>Re-read any field note in the Codex.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 80,
    backgroundColor: 'rgba(7,6,14,0.78)', alignItems: 'center', justifyContent: 'center', padding: 26,
  },
  card: {
    width: '100%', maxWidth: 380, borderRadius: 20, padding: 24, gap: 10, overflow: 'hidden',
    backgroundColor: 'rgba(22,18,36,0.97)', borderWidth: 1, borderColor: 'rgba(125,211,252,0.4)',
    shadowColor: COLORS.underCyan, shadowOpacity: 0.35, shadowRadius: 34, shadowOffset: { width: 0, height: 10 },
  },
  pin: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(125,211,252,0.55)' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  kicker: { fontFamily: FONTS.mono, fontSize: 10.5, letterSpacing: 3.4, color: COLORS.underCyan },
  title: { fontFamily: FONTS.secondaryBold, fontSize: 22, lineHeight: 26, color: '#f3eeff', marginTop: 2 },
  body: { fontFamily: FONTS.primary, fontSize: 14.5, lineHeight: 23, color: COLORS.textSecondary },
  btn: {
    marginTop: 8, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: COLORS.underViolet,
  },
  btnText: { fontFamily: FONTS.primarySemiBold, fontWeight: '700', fontSize: 14, color: '#15101f' },
  hint: { fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1, color: COLORS.textSubtle, textAlign: 'center' },
});
