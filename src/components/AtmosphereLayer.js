import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Image as RNImage, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../constants/colors';

const NOISE = require('../../assets/images/ui/backgrounds/noise-texture.png');

/** A single falling rain streak (the lamp-lit world's rain on glass). */
function RainStreak({ x, length, delay, duration, height, tint }) {
  const y = useRef(new Animated.Value(-length)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(y, { toValue: height + length, duration, delay, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [y, height, length, duration, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x, top: 0, width: 1, height: length,
        backgroundColor: tint, transform: [{ translateY: y }, { rotate: '8deg' }],
      }}
    />
  );
}

/** A slow-drifting light-leak bloom. */
function Leak({ size, top, left, right, bottom, color, reducedMotion, dx, dy, dur }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: dur, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: dur, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, reducedMotion, dur]);
  const tx = t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const ty = t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', width: size, height: size, borderRadius: size,
        top, left, right, bottom, backgroundColor: color,
        transform: [{ translateX: tx }, { translateY: ty }],
      }}
    />
  );
}

/**
 * AtmosphereLayer — the cinematic backdrop from the "Inkbleed Noir, elevated"
 * design. WARM tone (glow=amber): lamp-lit ink with amber/coral light-leaks,
 * grain, rain on glass, vignette. COLD tone (glow=violet/cyan): the glow-beneath
 * — a violet/cyan nebula with drifting leaks. Honors reduced motion.
 */
export default function AtmosphereLayer({ reducedMotion = false, rain = true, glow = 'amber', intensity = 1 }) {
  const { width, height } = useWindowDimensions();
  const cold = glow === 'violet' || glow === 'cyan';

  const streaks = useMemo(() => {
    if (!rain || reducedMotion || width <= 0) return [];
    const count = cold ? 8 : 16;
    return Array.from({ length: count }).map((_, i) => ({
      key: i,
      x: Math.round((i / count) * width + ((i * 53) % 37)),
      length: 40 + ((i * 29) % 70),
      delay: (i * 180) % 2600,
      duration: 1600 + ((i * 240) % 1800),
    }));
  }, [rain, reducedMotion, width, cold]);

  const base = cold ? GRADIENTS.coldBase : GRADIENTS.warmBase;
  const leak1 = cold ? 'rgba(167,139,250,0.30)' : 'rgba(241,197,114,0.20)';
  const leak2 = cold ? 'rgba(103,232,249,0.22)' : 'rgba(224,113,95,0.18)';
  const rainTint = cold ? 'rgba(150,200,250,0.10)' : 'rgba(190,205,225,0.10)';
  const bloom = Math.max(300, Math.round(width * 0.92));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={base} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />

      <Leak size={bloom} top={-bloom * 0.46} right={-bloom * 0.3} color={leak1} reducedMotion={reducedMotion} dx={-18} dy={14} dur={19000} />
      <Leak size={bloom * 1.1} bottom={-bloom * 0.5} left={-bloom * 0.36} color={leak2} reducedMotion={reducedMotion} dx={16} dy={-12} dur={23000} />

      <RNImage source={NOISE} style={[StyleSheet.absoluteFill, { opacity: 0.09 }]} resizeMode="repeat" />

      {streaks.map((s) => (
        <RainStreak key={s.key} x={s.x} length={s.length} delay={s.delay} duration={s.duration} height={height} tint={rainTint} />
      ))}

      {/* Cinematic vignette (matches the design's radial + linear darken). */}
      <LinearGradient
        colors={['rgba(0,0,0,0.42)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.55)']}
        locations={[0, 0.2, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.34)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.34)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
