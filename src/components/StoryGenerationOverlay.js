/**
 * StoryGenerationOverlay
 *
 * Displays a loading overlay while story content is being generated.
 * Shows progress and provides cancel option.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FONTS, FONT_SIZES } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';
import { GENERATION_STATUS } from '../hooks/useStoryGeneration';

const QUOTES = [
  '"The past is never dead. It\'s not even past." - Faulkner',
  '"In the end, we only regret the chances we didn\'t take."',
  '"Every villain is a hero in their own mind."',
  '"The truth is rarely pure and never simple." - Wilde',
  '"What\'s done cannot be undone." - Shakespeare',
  '"We are what we pretend to be." - Vonnegut',
  '"Memory is the mother of all wisdom." - Aeschylus',
  '"Justice delayed is justice denied."',
];

export default function StoryGenerationOverlay({
  visible,
  status,
  progress,
  error,
  onCancel,
  onRetry,
  onDismissError,
}) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const quoteIndex = useRef(Math.floor(Math.random() * QUOTES.length)).current;

  useEffect(() => {
    if (visible && status === GENERATION_STATUS.GENERATING) {
      // Spin animation
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      spinAnim.stopAnimation();
      pulseAnim.stopAnimation();
    }
  }, [visible, status, spinAnim, pulseAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isGenerating = status === GENERATION_STATUS.GENERATING;
  const hasError = status === GENERATION_STATUS.ERROR;
  const notConfigured = status === GENERATION_STATUS.NOT_CONFIGURED;

  const progressText = progress?.total > 0
    ? `Generating ${progress.current}/${progress.total}...`
    : 'Preparing story...';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(10, 10, 15, 0.95)', 'rgba(20, 20, 30, 0.98)']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            {/* Title */}
            <Text style={styles.title}>
              {hasError ? 'Generation Error' : notConfigured ? 'Setup Required' : 'Crafting Your Story'}
            </Text>

            {/* Spinner or Error Icon */}
            {isGenerating && (
              <Animated.View
                style={[
                  styles.spinnerContainer,
                  { transform: [{ rotate: spin }, { scale: pulseAnim }] },
                ]}
              >
                <View style={styles.spinner}>
                  <View style={styles.spinnerInner} />
                </View>
              </Animated.View>
            )}

            {hasError && (
              <View style={styles.errorIcon}>
                <Text style={styles.errorIconText}>!</Text>
              </View>
            )}

            {notConfigured && (
              <View style={styles.configIcon}>
                <Text style={styles.configIconText}>?</Text>
              </View>
            )}

            {/* Status Text */}
            {isGenerating && (
              <>
                <Text style={styles.statusText}>{progressText}</Text>
                <Text style={styles.hintText}>
                  The AI is writing your unique story continuation...
                </Text>
                <Text style={styles.quoteText}>{QUOTES[quoteIndex]}</Text>
              </>
            )}

            {hasError && (
              <>
                <Text style={styles.errorText}>{error || 'An error occurred during generation.'}</Text>
                <View style={styles.buttonRow}>
                  {onRetry && (
                    <Pressable style={styles.button} onPress={onRetry}>
                      <Text style={styles.buttonText}>Retry</Text>
                    </Pressable>
                  )}
                  {onDismissError && (
                    <Pressable style={[styles.button, styles.secondaryButton]} onPress={onDismissError}>
                      <Text style={styles.buttonText}>Dismiss</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}

            {notConfigured && (
              <>
                <Text style={styles.configText}>
                  To generate dynamic story content, you need to configure an AI API key.
                </Text>
                <Text style={styles.hintText}>
                  Go to Settings and enter your OpenAI or Anthropic API key.
                </Text>
                {onDismissError && (
                  <Pressable style={styles.button} onPress={onDismissError}>
                    <Text style={styles.buttonText}>Go to Settings</Text>
                  </Pressable>
                )}
              </>
            )}

            {/* Cancel Button */}
            {isGenerating && onCancel && (
              <Pressable style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            )}
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    maxWidth: 400,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.xl,
    color: '#E8D5B5',
    textAlign: 'center',
    marginBottom: SPACING.xl,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  spinnerContainer: {
    marginBottom: SPACING.lg,
  },
  spinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(232, 213, 181, 0.3)',
    borderTopColor: '#E8D5B5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(232, 213, 181, 0.2)',
    borderBottomColor: '#E8D5B5',
  },
  statusText: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    color: '#E8D5B5',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  hintText: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.sm,
    color: 'rgba(232, 213, 181, 0.7)',
    textAlign: 'center',
    marginBottom: SPACING.lg,
    fontStyle: 'italic',
  },
  quoteText: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.sm,
    color: 'rgba(232, 213, 181, 0.5)',
    textAlign: 'center',
    marginTop: SPACING.md,
    fontStyle: 'italic',
    paddingHorizontal: SPACING.md,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(200, 60, 60, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: '#C83C3C',
  },
  errorIconText: {
    fontFamily: FONTS.display,
    fontSize: 40,
    color: '#C83C3C',
  },
  errorText: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    color: '#C83C3C',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  configIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(232, 213, 181, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: '#E8D5B5',
  },
  configIconText: {
    fontFamily: FONTS.display,
    fontSize: 40,
    color: '#E8D5B5',
  },
  configText: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.md,
    color: '#E8D5B5',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  button: {
    backgroundColor: 'rgba(232, 213, 181, 0.2)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E8D5B5',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(232, 213, 181, 0.5)',
  },
  buttonText: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.sm,
    color: '#E8D5B5',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cancelButton: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  cancelText: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.sm,
    color: 'rgba(232, 213, 181, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
