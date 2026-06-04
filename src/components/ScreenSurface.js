import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { COLORS } from '../constants/colors';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import AtmosphereLayer from './AtmosphereLayer';
import { useGameStateOptional } from '../context/GameContext';

/**
 * ScreenSurface — the shared frame every screen sits in. As of the Inkbleed Noir
 * re-skin its backdrop IS the cinematic AtmosphereLayer (deep ink gradient, grain,
 * glow blooms, drifting rain, vignette), so the whole app reads as one
 * atmospheric place. A faint accent light-sweep drifts over the top.
 *
 * `glow`: 'amber' (the daily noir world, default) | 'violet'/'cyan' (the Under-Map's
 * supernatural layer). Reduced motion is honored globally (read from settings).
 */
export default function ScreenSurface({
  children,
  style,
  contentStyle,
  variant = 'default',
  overlay,
  accentColor = COLORS.accentPrimary,
  reducedMotion = false,
  frameless = false,
  atmosphere = true,
  glow,
}) {
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const { containerPadding, surfacePadding, sizeClass, isLandscape } = useResponsiveLayout();
  const gameState = useGameStateOptional();
  const rm = reducedMotion || !!gameState?.progress?.settings?.reducedMotion;
  const glowTone = glow || (variant === 'bright' ? 'amber' : 'amber');

  useEffect(() => {
    if (rm) {
      sweepAnim.setValue(0.5);
      return undefined;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(sweepAnim, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweepAnim, { toValue: 0, duration: 7000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [sweepAnim, rm]);

  const highlightColor = useMemo(
    () => (variant === 'desk' ? COLORS.accentPrimary : accentColor),
    [variant, accentColor],
  );

  const sweepTranslate = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-220, 220] });
  const sweepOpacity = sweepAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.26, 0] });

  const calculatedPaddingBottom = useMemo(() => {
    if (isLandscape && sizeClass !== 'xlarge') return Math.max(containerPadding, 20);
    return containerPadding + 8;
  }, [containerPadding, isLandscape, sizeClass]);

  const safeTopInset = Platform.select({
    ios: 12,
    android: StatusBar.currentHeight ? StatusBar.currentHeight / 2 : 12,
    default: 12,
  });

  return (
    <View style={[styles.root, style]}>
      {atmosphere ? <AtmosphereLayer reducedMotion={rm} glow={glowTone} /> : null}
      <View
        style={[
          styles.frame,
          {
            paddingHorizontal: containerPadding,
            paddingTop: containerPadding + safeTopInset,
            paddingBottom: calculatedPaddingBottom,
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.lightSweep,
            {
              backgroundColor: highlightColor,
              opacity: sweepOpacity,
              transform: [{ translateX: sweepTranslate }, { rotate: '10deg' }],
            },
          ]}
        />
        <View
          style={[
            styles.inner,
            !frameless && { paddingHorizontal: surfacePadding, paddingVertical: surfacePadding },
            contentStyle,
          ]}
        >
          {children}
        </View>
      </View>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.ink,
  },
  frame: {
    flex: 1,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
  },
  lightSweep: {
    position: 'absolute',
    top: '-40%',
    bottom: '-40%',
    width: 220,
    borderRadius: 220,
    opacity: 0,
    shadowColor: COLORS.accentSoft,
    shadowOpacity: 0.75,
    shadowRadius: 85,
    shadowOffset: { width: 0, height: 0 },
  },
});
