import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

/**
 * CornerFrame — wraps content in four L-shaped "targeting / dossier" brackets
 * (no full border), the surveillance-file motif. A bold, game-y frame that
 * reads nothing like a web card. `inset` pulls brackets in/out from the edges.
 */
export default function CornerFrame({
  children,
  color = COLORS.accentSecondary,
  size = 18,
  thickness = 2,
  inset = 0,
  style,
}) {
  const base = { position: 'absolute', width: size, height: size, borderColor: color };
  return (
    <View style={[styles.wrap, style]}>
      {children}
      <View pointerEvents="none" style={[base, { top: inset, left: inset, borderTopWidth: thickness, borderLeftWidth: thickness }]} />
      <View pointerEvents="none" style={[base, { top: inset, right: inset, borderTopWidth: thickness, borderRightWidth: thickness }]} />
      <View pointerEvents="none" style={[base, { bottom: inset, left: inset, borderBottomWidth: thickness, borderLeftWidth: thickness }]} />
      <View pointerEvents="none" style={[base, { bottom: inset, right: inset, borderBottomWidth: thickness, borderRightWidth: thickness }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
});
