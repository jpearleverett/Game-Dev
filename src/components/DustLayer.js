import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 12;

const Particle = ({ delay }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(Math.random() * width)).current;
  const translateY = useRef(new Animated.Value(Math.random() * height)).current;

  useEffect(() => {
    const runAnimation = () => {
      // Randomize start position slightly
      translateX.setValue(Math.random() * width);
      translateY.setValue(Math.random() * height);
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 4000 + Math.random() * 4000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 4000 + Math.random() * 4000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(translateY, {
          toValue: translateY._value - 100, // Drift up
          duration: 10000 + Math.random() * 5000,
          useNativeDriver: true,
        })
      ).start();
    };

    const timer = setTimeout(runAnimation, delay);
    return () => clearTimeout(timer);
  }, []);

  const size = Math.random() * 3 + 1;

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.4, 0],
          }),
          transform: [{ translateX }, { translateY }],
        },
      ]}
    />
  );
};

export default function DustLayer() {
  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle key={i} delay={i * 800} />
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
