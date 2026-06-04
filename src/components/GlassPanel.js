import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/layout';

/**
 * GlassPanel — frosted dark-glass surface (Inkbleed Noir re-skin). Real blur via
 * expo-blur, a warm-ink tint for legibility, and a luminous hairline edge. Used
 * surgically for floating panels / overlays / hero cards so they read as
 * separate planes above the grain without adding extra color.
 *
 * `edge`: 'neutral' | 'violet' (the Under-Map glow) | 'amber' (the desk light).
 * Falls back gracefully to a tinted panel if the platform can't blur.
 */
export default function GlassPanel({
  children,
  intensity = 26,
  tint = 'dark',
  edge = 'neutral',
  radius = RADIUS.lg,
  strong = false,
  style,
  contentStyle,
  pointerEvents,
}) {
  const edgeColor = edge === 'violet' ? COLORS.glassEdge : edge === 'amber' ? COLORS.glassEdgeAmber : COLORS.glassBorder;
  const fill = strong ? COLORS.glassTintStrong : COLORS.glassTint;
  return (
    <View
      pointerEvents={pointerEvents}
      style={[styles.wrap, { borderRadius: radius, borderColor: edgeColor }, style]}
    >
      <BlurView
        intensity={intensity}
        tint={tint}
        // Enables a real backdrop blur on Android (no-op on iOS).
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} pointerEvents="none" />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  content: {
    position: 'relative',
  },
});
