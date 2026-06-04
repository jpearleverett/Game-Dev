import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { COLORS } from '../constants/colors';

/**
 * Celebration — a restrained confetti burst for the game's payoff moments
 * (case solved, ending reached, theory sealed). Uses a NOIR palette — amber,
 * cream, coral "ink flecks", not rainbow — so it fits the aesthetic. No-ops when
 * inactive or reduced-motion is on. Renders as a non-interactive overlay.
 */
const INK_FLECKS = [
  COLORS.accentSecondary,
  COLORS.amberLight || COLORS.accentSecondary,
  COLORS.accentPrimary,
  COLORS.cigaretteSmoke || COLORS.textSecondary,
  COLORS.textSecondary,
];

export default function Celebration({
  active,
  reducedMotion = false,
  count = 55,
  colors = INK_FLECKS,
  fadeOut = true,
}) {
  const { width } = useWindowDimensions();
  if (!active || reducedMotion) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <ConfettiCannon
        count={count}
        origin={{ x: width / 2, y: -20 }}
        autoStart
        autoStartDelay={0}
        fadeOut={fadeOut}
        explosionSpeed={320}
        fallSpeed={2800}
        colors={colors}
      />
    </View>
  );
}
