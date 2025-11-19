import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';

const SPLASH_IMAGE = require('../../assets/splash-icon.png');

export default function SplashScreen({ onContinue, bootReady }) {
  const handlePress = () => {
    if (!bootReady) return;
    onContinue?.();
  };

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
      disabled={!bootReady}
      accessibilityRole="button"
      accessibilityLabel="Begin Detective Portrait"
    >
      <Image source={SPLASH_IMAGE} style={styles.image} contentFit="cover" pointerEvents="none" />
      <View style={styles.content} pointerEvents="none">
        <View style={[styles.promptContainer, !bootReady && styles.promptContainerDisabled]}>
          <Text
            style={[styles.promptText, !bootReady && styles.promptTextDisabled]}
            accessibilityRole="text"
          >
            Tap to Enter the Case
          </Text>
        </View>
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
