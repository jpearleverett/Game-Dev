import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';

const SPLASH_IMAGE = require('../../assets/splash-icon.png');

export default function SplashScreen({ onContinue, bootReady }) {
  const enter = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  // Gentle entrance for the prompt.
  useEffect(() => {
    const anim = Animated.timing(enter, {
      toValue: 1,
      duration: 700,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [enter]);

  // "Press start" breathing once the game is ready to enter.
  useEffect(() => {
    if (!bootReady) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bootReady, pulse]);

  const handlePress = () => {
    if (!bootReady) return;
    onContinue?.();
  };

  const promptOpacity = bootReady
    ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] })
    : enter.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] });
  const promptScale = bootReady ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1.03] }) : 1;
  const promptRise = enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
      disabled={!bootReady}
      accessibilityRole="button"
      accessibilityLabel="Begin Dead Letters"
    >
      <Image source={SPLASH_IMAGE} style={styles.image} contentFit="cover" pointerEvents="none" />
      <View style={styles.content} pointerEvents="none">
        <Animated.View
          style={[
            styles.promptContainer,
            !bootReady && styles.promptContainerDisabled,
            { opacity: promptOpacity, transform: [{ scale: promptScale }, { translateY: promptRise }] },
          ]}
        >
          <Text
            style={[styles.promptText, !bootReady && styles.promptTextDisabled]}
            accessibilityRole="text"
          >
            {bootReady ? 'Tap to Enter the Case' : 'Opening the case…'}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 64,
    paddingHorizontal: 24,
  },
  promptContainer: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: COLORS.overlayDark,
    borderWidth: 1,
    borderColor: 'rgba(241, 197, 114, 0.35)',
    shadowColor: COLORS.shadowStrong,
    shadowOpacity: 0.65,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 10,
  },
  promptContainerDisabled: {
    borderColor: 'rgba(157, 150, 141, 0.35)',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  promptText: {
    fontFamily: FONTS.monoBold,
    fontSize: FONT_SIZES.lg,
    letterSpacing: 2,
    color: COLORS.accentSecondary,
    textTransform: 'uppercase',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  promptTextDisabled: {
    color: COLORS.textMuted,
    textShadowColor: 'transparent',
  },
});
