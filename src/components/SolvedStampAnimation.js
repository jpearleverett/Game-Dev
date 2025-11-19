import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';
import { SPACING } from '../constants/layout';

export default function SolvedStampAnimation({ visible, onContinue, reducedMotion = false }) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const stampScale = useRef(new Animated.Value(0)).current;
  const stampRotation = useRef(new Animated.Value(0)).current;
  const stampOpacity = useRef(new Animated.Value(0)).current;
  const tapPromptOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      overlayOpacity.setValue(0);
      stampScale.setValue(0);
      stampRotation.setValue(0);
      stampOpacity.setValue(0);
      tapPromptOpacity.setValue(0);
      return;
    }

    if (reducedMotion) {
      // Simple fade-in for reduced motion
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(stampOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(tapPromptOpacity, {
          toValue: 1,
          duration: 300,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    // Full animation sequence
    Animated.sequence([
      // 1. Fade in overlay
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      // 2. Stamp impact animation
      Animated.parallel([
        // Scale: quick expand with bounce
        Animated.sequence([
          Animated.spring(stampScale, {
            toValue: 1.2,
            speed: 50,
            bounciness: 8,
            useNativeDriver: true,
          }),
          Animated.spring(stampScale, {
            toValue: 1,
            speed: 12,
            bounciness: 6,
            useNativeDriver: true,
          }),
        ]),
        // Rotation: slight tilt
        Animated.spring(stampRotation, {
          toValue: 1,
          speed: 30,
          bounciness: 4,
          useNativeDriver: true,
        }),
        // Opacity: fade in quickly
        Animated.timing(stampOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      // 3. Show tap prompt after stamp settles
      Animated.timing(tapPromptOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for tap prompt
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(tapPromptOpacity, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(tapPromptOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Start pulse after initial animation
    const pulseTimer = setTimeout(() => {
      pulseAnimation.start();
    }, 1000);

    return () => {
      clearTimeout(pulseTimer);
      pulseAnimation.stop();
    };
  }, [visible, reducedMotion, overlayOpacity, stampScale, stampRotation, stampOpacity, tapPromptOpacity]);

  if (!visible) {
    return null;
  }

  const rotationInterpolate = stampRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '-5deg'],
  });

  return (
    <Pressable style={styles.overlay} onPress={onContinue}>
      <Animated.View style={[styles.overlayBackground, { opacity: overlayOpacity }]} />
      
      <View style={styles.contentContainer}>
        <Animated.View
          style={[
            styles.stampContainer,
            {
              opacity: stampOpacity,
              transform: [
                { scale: stampScale },
                { rotate: rotationInterpolate },
              ],
            },
          ]}
        >
          {/* Outer stamp border */}
          <View style={styles.stampOuter}>
            {/* Inner stamp border */}
            <View style={styles.stampInner}>
              {/* Stamp text */}
              <Text style={styles.stampText}>SOLVED</Text>
            </View>
          </View>
          
          {/* Ink texture overlay */}
          <View style={styles.inkTexture} />
        </Animated.View>

        <Animated.View style={[styles.tapPromptContainer, { opacity: tapPromptOpacity }]}>
          <Text style={styles.tapPromptText}>TAP TO CONTINUE</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xxl,
  },
  stampContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampOuter: {
    width: 280,
    height: 140,
    borderWidth: 8,
    borderColor: '#d32f2f',
    borderRadius: 8,
    backgroundColor: 'rgba(211, 47, 47, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow for depth
    shadowColor: '#d32f2f',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  stampInner: {
    width: 256,
    height: 116,
    borderWidth: 4,
    borderColor: '#d32f2f',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(211, 47, 47, 0.08)',
  },
  stampText: {
    fontFamily: FONTS.secondaryBold,
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 8,
    color: '#d32f2f',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(211, 47, 47, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  inkTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
    backgroundColor: 'transparent',
    // Simulate ink grain effect with multiple borders
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.3)',
    borderRadius: 8,
  },
  tapPromptContainer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(21, 24, 32, 0.85)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.accentSecondary,
  },
  tapPromptText: {
    fontFamily: FONTS.monoBold,
    fontSize: FONT_SIZES.md,
    letterSpacing: 3,
    color: COLORS.accentSecondary,
    textTransform: 'uppercase',
  },
});
