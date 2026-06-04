import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Image as RNImage, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../constants/colors';

const NOISE = require('../../assets/images/ui/backgrounds/noise-texture.png');

/** A single falling rain streak. */
function RainStreak({ x, length, delay, duration, height }) {
  const y = useRef(new Animated.Value(-length)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(y, {
        toValue: height + length,
        duration,
        delay,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [y, height, length, duration, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        width: 1,
        height: length,
        backgroundColor: 'rgba(190, 205, 225, 0.10)',
        transform: [{ translateY: y }, { rotate: '8deg' }],
      }}
    />
  );
}

/**
 * AtmosphereLayer — a cinematic, full-bleed backdrop for the Inkbleed Noir look:
 * a deep warm-black gradient, fine grain, soft violet/cyan glow blooms (the
 * "glow beneath"), a heavy vignette, and drifting rain. This is what makes a
 * screen read as an atmospheric *place* rather than a flat web background.
 * Honors reduced motion (drops the rain).
 */
export default function AtmosphereLayer({
  reducedMotion = false,
  rain = true,
  glow = 'violet',
  intensity = 1,
}) {
  const { width, height } = useWindowDimensions();

  const streaks = useMemo(() => {
    if (!rain || reducedMotion || width <= 0) return [];
    const count = 16;
    return Array.from({ length: count }).map((_, i) => ({
      key: i,
      x: Math.round((i / count) * width + ((i * 53) % 37)),
      length: 40 + ((i * 29) % 70),
      delay: (i * 180) % 2600,
      duration: 1600 + ((i * 240) % 1800),
    }));
  }, [rain, reducedMotion, width]);

  const glowColor = glow === 'cyan' ? COLORS.underCyanSoft : COLORS.underGlowSoft;
  const glow2 = glow === 'cyan' ? COLORS.underGlowSoft : COLORS.underCyanSoft;
  const bloom = Math.max(280, Math.round(width * 0.9));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={GRADIENTS.inkDepth}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Glow blooms — the supernatural light leaking up through the ink. */}
      <View
        style={{
          position: 'absolute', top: -bloom * 0.45, right: -bloom * 0.3,
          width: bloom, height: bloom, borderRadius: bloom,
          backgroundColor: glowColor, opacity: 0.9 * intensity,
        }}
      />
      <View
        style={{
          position: 'absolute', bottom: -bloom * 0.5, left: -bloom * 0.35,
          width: bloom, height: bloom, borderRadius: bloom,
          backgroundColor: glow2, opacity: 0.55 * intensity,
        }}
      />

      <RNImage source={NOISE} style={[StyleSheet.absoluteFill, { opacity: 0.10 }]} resizeMode="repeat" />

      {streaks.map((s) => (
        <RainStreak key={s.key} x={s.x} length={s.length} delay={s.delay} duration={s.duration} height={height} />
      ))}

      {/* Vignette — pull the eye to the centre. */}
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.55)']}
        locations={[0, 0.22, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.35)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
