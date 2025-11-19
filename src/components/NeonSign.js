import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { FONTS, FONT_SIZES } from '../constants/typography';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function NeonSign({ title = 'Dead Letters', style, logoSource }) {
  const { moderateScale, scaleSpacing, scaleRadius, sizeClass } = useResponsiveLayout();
  const SIGN_SCALE = 0.84;
  const LOGO_SCALE = 1.0;
  const intensity = useRef(new Animated.Value(1)).current;
  const { glowOpacity, rimOpacity, highlightOpacity } = useMemo(
    () => ({
      glowOpacity: intensity.interpolate({
        inputRange: [0, 1],
        outputRange: [0.18, 0.9],
        extrapolate: 'clamp',
      }),
      rimOpacity: intensity.interpolate({
        inputRange: [0, 1],
        outputRange: [0.32, 0.98],
        extrapolate: 'clamp',
      }),
      highlightOpacity: intensity.interpolate({
        inputRange: [0, 1],
        outputRange: [0.28, 0.94],
        extrapolate: 'clamp',
      }),
    }),
    [intensity]
  );
  useEffect(() => {
    const timers = new Set();
    let isUnmounted = false;

    const scheduleBurst = (delayMs) => {
      const timeoutId = setTimeout(() => {
        timers.delete(timeoutId);
        if (isUnmounted) {
          return;
        }

        const pulses = 1 + Math.floor(Math.random() * 3);
        const sequence = [];

        for (let i = 0; i < pulses; i += 1) {
          const dramaticDrop = Math.random() < 0.28;
          const dipTarget = dramaticDrop ? Math.max(0.05, Math.random() * 0.22) : 0.3 + Math.random() * 0.4;
          const dimDuration = 40 + Math.random() * 110;
          const riseDuration = 70 + Math.random() * 180;

          sequence.push(
            Animated.timing(intensity, {
              toValue: dipTarget,
              duration: dimDuration,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(intensity, {
              toValue: 1,
              duration: riseDuration,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            })
          );
        }

        Animated.sequence(sequence).start(({ finished }) => {
          if (!finished || isUnmounted) {
            return;
          }
          const idleDelay = 2200 + Math.random() * 3200;
          scheduleBurst(idleDelay);
        });
      }, delayMs);

      timers.add(timeoutId);
    };

    const initialDelay = 1200 + Math.random() * 2400;
    scheduleBurst(initialDelay);

    return () => {
      isUnmounted = true;
      timers.forEach((timeoutId) => clearTimeout(timeoutId));
      timers.clear();
      intensity.stopAnimation();
    };
  }, [intensity]);

  const basePaddingVertical = scaleSpacing(
    sizeClass === 'xsmall'
      ? 5
      : sizeClass === 'small'
      ? 6
      : sizeClass === 'medium'
      ? 8
      : sizeClass === 'large'
      ? 10
      : 12
    ) * SIGN_SCALE;
  const basePaddingHorizontal = scaleSpacing(
    sizeClass === 'xsmall'
      ? 18
      : sizeClass === 'small'
      ? 22
      : sizeClass === 'medium'
      ? 26
      : sizeClass === 'large'
      ? 30
      : 36
  ) * SIGN_SCALE;
  const neonThicknessBase = scaleSpacing(sizeClass === 'xsmall' ? 6 : sizeClass === 'small' ? 7 : sizeClass === 'medium' ? 8 : 9);
  const neonThickness = neonThicknessBase * SIGN_SCALE;
  const neonHighlightOffset = neonThickness * 0.35;
  const neonHighlightThickness = Math.max(Math.round(neonThickness * 0.55), 3);
  const glowInset = scaleSpacing(sizeClass === 'xsmall' ? 32 : sizeClass === 'small' ? 40 : sizeClass === 'medium' ? 48 : 56) * SIGN_SCALE;
  const signRadius = scaleRadius(sizeClass === 'xsmall' ? 38 : sizeClass === 'small' ? 44 : sizeClass === 'medium' ? 50 : 56) * SIGN_SCALE;
  const frameInset = neonThickness * 0.6;
  const paddingVertical = basePaddingVertical + frameInset;
  const paddingHorizontal = basePaddingHorizontal + frameInset;
  const signMaxWidth = moderateScale(
    sizeClass === 'xsmall'
      ? 300
      : sizeClass === 'small'
      ? 340
      : sizeClass === 'medium'
      ? 390
      : sizeClass === 'large'
      ? 440
      : 520,
    0.7
  ) * SIGN_SCALE;
  const logoWidth = moderateScale(
    sizeClass === 'xsmall'
      ? 220
      : sizeClass === 'small'
      ? 240
      : sizeClass === 'medium'
      ? 270
      : sizeClass === 'large'
      ? 300
      : 320,
    0.6
  ) * LOGO_SCALE;
  const logoHeight = moderateScale(
    sizeClass === 'xsmall'
      ? 54
      : sizeClass === 'small'
      ? 60
      : sizeClass === 'medium'
      ? 66
      : sizeClass === 'large'
      ? 74
      : 80,
    0.6
  ) * LOGO_SCALE;
  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.wrapper,
          {
            paddingVertical,
            paddingHorizontal,
            borderRadius: signRadius,
            maxWidth: signMaxWidth,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.ambientGlow,
            {
              borderRadius: signRadius + glowInset * 0.4,
              top: -glowInset,
              bottom: -glowInset,
              left: -glowInset,
              right: -glowInset,
              opacity: glowOpacity,
            },
          ]}
          pointerEvents="none"
        />
        <Animated.View
          style={[
            styles.neonRim,
            {
              borderRadius: signRadius,
              borderWidth: neonThickness,
              opacity: rimOpacity,
            },
          ]}
          pointerEvents="none"
        />
        <Animated.View
          style={[
            styles.neonHighlight,
            {
              top: neonHighlightOffset,
              bottom: neonHighlightOffset,
              left: neonHighlightOffset,
              right: neonHighlightOffset,
              borderRadius: signRadius - neonHighlightOffset,
              borderWidth: neonHighlightThickness,
              opacity: highlightOpacity,
            },
            ]}
            pointerEvents="none"
          />
          <View style={styles.content}>
            {logoSource ? (
              <AnimatedImage
                source={logoSource}
                style={[
                  styles.logo,
                  {
                    width: logoWidth,
                    height: logoHeight,
                  },
                ]}
                contentFit="contain"
                accessibilityRole="image"
                accessibilityLabel={title}
              />
            ) : (
              <Text
                style={[
                  styles.title,
                  {
                    fontSize: moderateScale(FONT_SIZES.display + 12),
                    textShadowRadius: sizeClass === 'xsmall' ? 20 : sizeClass === 'small' ? 22 : 26,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {title.toUpperCase()}
              </Text>
            )}
          </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  wrapper: {
    position: 'relative',
    width: '100%',
    backgroundColor: 'transparent',
    overflow: 'visible',
    justifyContent: 'center',
  },
  ambientGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    shadowColor: '#ff8970',
    shadowOpacity: 0.85,
    shadowRadius: 110,
    shadowOffset: { width: 0, height: 0 },
    opacity: 0.75,
  },
  neonRim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 8,
    borderColor: '#ff6f59',
    shadowColor: '#ff7a64',
    shadowOpacity: 0.9,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 0 },
    opacity: 0.95,
  },
  neonHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 4,
    borderColor: '#ffe4d7',
    shadowColor: '#ffd3c5',
    shadowOpacity: 0.7,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    opacity: 0.85,
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    alignSelf: 'center',
  },
  title: {
    fontFamily: FONTS.secondaryBold,
    color: '#ffe6db',
    letterSpacing: 8,
    textShadowColor: 'rgba(255, 64, 36, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
  },
});
