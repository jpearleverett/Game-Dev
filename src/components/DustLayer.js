import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, View, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 12;

const Particle = ({ delay, initialX, initialY, fadeDuration, driftDuration }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(initialX)).current;
  const translateY = useRef(new Animated.Value(initialY)).current;

  // Store animation references for cleanup
  const fadeLoopRef = useRef(null);
  const driftLoopRef = useRef(null);

  useEffect(() => {
    let timer = null;

    const runAnimation = () => {
      // Reset position
      translateX.setValue(initialX);
      translateY.setValue(initialY);

      // Create and store fade animation loop
      fadeLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: fadeDuration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: fadeDuration,
            useNativeDriver: true,
          }),
        ])
      );
      fadeLoopRef.current.start();

      // Create and store drift animation loop
      driftLoopRef.current = Animated.loop(
        Animated.timing(translateY, {
          toValue: initialY - 100,
          duration: driftDuration,
          useNativeDriver: true,
        })
      );
      driftLoopRef.current.start();
    };

    timer = setTimeout(runAnimation, delay);

    // CRITICAL: Cleanup all animations on unmount
    return () => {
      if (timer) clearTimeout(timer);
      if (fadeLoopRef.current) fadeLoopRef.current.stop();
      if (driftLoopRef.current) driftLoopRef.current.stop();
      anim.stopAnimation();
      translateY.stopAnimation();
    };
  }, [delay, initialX, initialY, fadeDuration, driftDuration, anim, translateX, translateY]);

  // Memoize size to avoid recalculation on re-render
  const size = useMemo(() => Math.random() * 3 + 1, []);

  // Memoize opacity interpolation
  const opacity = useMemo(() => anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.4, 0],
  }), [anim]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    />
  );
};

// Pre-generate particle configurations once to avoid recalculation on each render
const PARTICLE_CONFIGS = Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
  key: i,
  delay: i * 800,
  initialX: Math.random() * width,
  initialY: Math.random() * height,
  fadeDuration: 4000 + Math.random() * 4000,
  driftDuration: 10000 + Math.random() * 5000,
}));

export default function DustLayer() {
  return (
    <View style={styles.container} pointerEvents="none">
      {PARTICLE_CONFIGS.map((config) => (
        <Particle
          key={config.key}
          delay={config.delay}
          initialX={config.initialX}
          initialY={config.initialY}
          fadeDuration={config.fadeDuration}
          driftDuration={config.driftDuration}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 245, 220, 0.3)', // Warm dust color
  },
});
