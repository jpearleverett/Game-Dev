import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { FONTS } from '../constants/typography';

/**
 * NeonWordmark — the design's coral neon-tube "DEAD LETTERS" (two glowing lines
 * + a mono sub), no border box. Approximates the multi-layer CSS text-shadow
 * with a coral glow + a soft halo bloom behind, and a subtle tube flicker.
 */
export default function NeonWordmark({ reducedMotion = false, size = 40, sub = 'An Ashport Mystery' }) {
  const flicker = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reducedMotion) return undefined;
    const seq = Animated.loop(Animated.sequence([
      Animated.delay(2600),
      Animated.timing(flicker, { toValue: 0.45, duration: 60, useNativeDriver: true }),
      Animated.timing(flicker, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(flicker, { toValue: 0.7, duration: 50, useNativeDriver: true }),
      Animated.timing(flicker, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.delay(1900),
      Animated.timing(flicker, { toValue: 0.3, duration: 50, useNativeDriver: true }),
      Animated.timing(flicker, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]));
    seq.start();
    return () => seq.stop();
  }, [flicker, reducedMotion]);

  const lineStyle = [styles.line, { fontSize: size, lineHeight: Math.round(size * 0.96) }];

  return (
    <View style={styles.wrap}>
      <View pointerEvents="none" style={styles.halo} />
      <Animated.View style={{ opacity: flicker, alignItems: 'center' }}>
        <Text style={lineStyle}>DEAD</Text>
        <Text style={lineStyle}>LETTERS</Text>
        {sub ? <Text style={[styles.sub, { fontSize: Math.round(size * 0.24) }]}>{sub.toUpperCase()}</Text> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: 300, height: 200, borderRadius: 150,
    backgroundColor: 'rgba(255,90,64,0.16)',
    top: -10,
  },
  line: {
    fontFamily: FONTS.secondaryBold,
    color: '#fff1ec',
    letterSpacing: 5,
    textAlign: 'center',
    textShadowColor: 'rgba(255,110,80,0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  sub: {
    fontFamily: FONTS.mono,
    color: 'rgba(255,214,205,0.82)',
    letterSpacing: 7,
    marginTop: 10,
    textShadowColor: 'rgba(255,90,64,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
