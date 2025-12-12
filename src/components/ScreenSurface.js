import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, ImageBackground, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

const BACKGROUND_MAP = {
  default: require('../../assets/images/ui/backgrounds/background-dark.png'),
  desk: require('../../assets/images/ui/backgrounds/background-dark.png'),
  bright: require('../../assets/images/ui/backgrounds/background-bright.png'),
};

const NOISE_TEXTURE = require('../../assets/images/ui/backgrounds/noise-texture.png');
const VIGNETTE_TEXTURE = require('../../assets/images/ui/backgrounds/vignette-overlay.png');

const GRADIENTS = {
  // Richer, deeper gradients for better contrast
  default: ['rgba(5, 6, 8, 0.98)', 'rgba(15, 17, 24, 0.95)', 'rgba(25, 28, 36, 0.92)'],
  desk: ['rgba(5, 5, 5, 0.99)', 'rgba(18, 14, 10, 0.96)', 'rgba(30, 22, 16, 0.92)'], // Warmer deep brown/black for desk
  bright: ['rgba(10, 12, 18, 0.96)', 'rgba(18, 21, 28, 0.94)', 'rgba(24, 28, 34, 0.92)'],
};

export default function ScreenSurface({
  children,
  style,
  contentStyle,
  variant = 'default',
  overlay,
  accentColor = COLORS.accentPrimary,
  reducedMotion = false,
  frameless = false,
}) {
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const { containerPadding, surfacePadding, sizeClass, isLandscape } = useResponsiveLayout();

  useEffect(() => {
    if (reducedMotion) {
      sweepAnim.setValue(0.5);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(sweepAnim, {
          toValue: 1,
          duration: 7000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sweepAnim, {
          toValue: 0,
          duration: 7000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [sweepAnim, reducedMotion]);

  const backgroundSource = BACKGROUND_MAP[variant] || BACKGROUND_MAP.default;
  const gradientStops = GRADIENTS[variant] || GRADIENTS.default;
  const highlightColor = useMemo(() => (variant === 'desk' ? COLORS.accentPrimary : accentColor), [variant, accentColor]);

  const sweepTranslate = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-220, 220] });
  const sweepOpacity = sweepAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.32, 0] });

  const calculatedPaddingBottom = useMemo(() => {
    if (isLandscape && sizeClass !== 'xlarge') {
      return Math.max(containerPadding, 20);
    }
    return containerPadding + 8;
  }, [containerPadding, isLandscape, sizeClass]);

  const safeTopInset = Platform.select({
    ios: 12,
    android: StatusBar.currentHeight ? StatusBar.currentHeight / 2 : 12,
    default: 12,
  });

  return (
    <View style={[styles.root, style]}>
      <ImageBackground source={backgroundSource} resizeMode="cover" style={styles.background}>
        <LinearGradient
          colors={gradientStops}
          style={[
            styles.gradient,
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
          <Image source={NOISE_TEXTURE} style={styles.noiseOverlay} contentFit="cover" pointerEvents="none" />
          <Image source={VIGNETTE_TEXTURE} style={styles.vignetteOverlay} contentFit="cover" pointerEvents="none" />
          <View
            style={[
              styles.inner,
              !frameless && {
                paddingHorizontal: surfacePadding,
                paddingVertical: surfacePadding,
              },
              contentStyle,
            ]}
          >
            {children}
          </View>
        </LinearGradient>
      </ImageBackground>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  background: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
  },
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
  },
  vignetteOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6, // Reduced opacity to not kill the new gradient details
    backgroundColor: 'transparent', 
  },
    lightSweep: {
      position: 'absolute',
      top: '-20%',
      bottom: '-20%',
      width: 300, // Wider beam
      borderRadius: 150,
      opacity: 0,
      shadowColor: COLORS.accentSoft,
      shadowOpacity: 0.5, // Softer glow
      shadowRadius: 100, // More diffusion
      shadowOffset: { width: 0, height: 0 },
    },
});
