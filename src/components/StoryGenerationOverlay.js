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
import { GENERATION_STATUS, GENERATION_TYPE } from '../hooks/useStoryGeneration';

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

// Diegetic loading messages for unexpected path choices (cache misses)
// These make the loading delay feel like part of the investigation
const CACHE_MISS_MESSAGES = {
  titles: [
    'Following a New Lead',
    'Changing Course',
    'Taking the Road Less Traveled',
    'Re-examining the Evidence',
    'Pursuing an Unexpected Thread',
  ],
  progress: [
    'Cross-referencing new evidence...',
    'Tracking down a different angle...',
    'Following the trail you\'ve chosen...',
    'Uncovering what this path reveals...',
    'Piecing together the unexpected connection...',
  ],
  hints: [
    'Sometimes the case takes you where you least expect...',
    'A good detective follows the evidence, not the obvious path...',
    'The truth rarely travels in straight lines...',
    'Every choice opens new doors and closes others...',
    'You\'ve surprised us. Let\'s see where this leads...',
  ],
};

// Noir-themed error messages
const ERROR_MESSAGES = {
  network: [
    "The line went dead. The city's wires don't reach this far tonight.",
    "Static on the line. Someone doesn't want this story told.",
    "Connection lost—like a witness who saw too much.",
  ],
  timeout: [
    "Time ran out, like sand through a dead man's fingers.",
    "The clock stopped ticking. Some stories take longer to uncover.",
    "Patience. Even the longest night has to end.",
  ],
  api: [
    "The informant backed out. Check your credentials and try again.",
    "Access denied. The key doesn't fit this lock anymore.",
    "Your contact's gone cold. Verify your API key in Settings.",
  ],
  blocked: [
    "The story hit a wall. Some truths are too dark to tell.",
    "Censored. The city's powers don't want this chapter written.",
    "Content blocked—someone's pulling strings from the shadows.",
  ],
  generic: [
    "The trail went cold. But every case has another angle.",
    "Dead end. Even the best detectives hit walls sometimes.",
    "Something went wrong in the dark. Try again, gumshoe.",
  ],
};

function getNoirError(errorMessage) {
  let category = 'generic';
  if (errorMessage?.toLowerCase().includes('network') ||
      errorMessage?.toLowerCase().includes('fetch') ||
      errorMessage?.toLowerCase().includes('connection')) {
    category = 'network';
  } else if (errorMessage?.toLowerCase().includes('timeout') ||
             errorMessage?.toLowerCase().includes('timed out')) {
    category = 'timeout';
  } else if (errorMessage?.toLowerCase().includes('api') ||
             errorMessage?.toLowerCase().includes('key') ||
             errorMessage?.toLowerCase().includes('401') ||
             errorMessage?.toLowerCase().includes('403')) {
    category = 'api';
  } else if (errorMessage?.toLowerCase().includes('blocked') ||
             errorMessage?.toLowerCase().includes('safety') ||
             errorMessage?.toLowerCase().includes('content')) {
    category = 'blocked';
  }

  const messages = ERROR_MESSAGES[category];
  return messages[Math.floor(Math.random() * messages.length)];
}

export default function StoryGenerationOverlay({
  visible,
  status,
  progress,
  error,
  generationType,
  isPreloading,
  isCacheMiss = false, // True when player chose an unexpected/unpredicted path
  onCancel,
  onRetry,
  onGoToSettings,
  onBackToHub,
}) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const quoteIndex = useRef(Math.floor(Math.random() * QUOTES.length)).current;
  const cacheMissIndex = useRef(Math.floor(Math.random() * CACHE_MISS_MESSAGES.titles.length)).current;
  const noirErrorRef = useRef(null);

  // Generate noir error message once per error
  if (error && !noirErrorRef.current) {
    noirErrorRef.current = getNoirError(error);
  } else if (!error) {
    noirErrorRef.current = null;
  }

  // Store animation loop references for proper cleanup
  const spinLoopRef = useRef(null);
  const pulseLoopRef = useRef(null);

  useEffect(() => {
    if (visible && status === GENERATION_STATUS.GENERATING) {
      // Reset animation values
      spinAnim.setValue(0);
      pulseAnim.setValue(1);

      // Create and store spin animation loop
      spinLoopRef.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinLoopRef.current.start();

      // Create and store pulse animation loop
      pulseLoopRef.current = Animated.loop(
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
      );
      pulseLoopRef.current.start();
    } else {
      // Properly stop the loops using stored references
      if (spinLoopRef.current) {
        spinLoopRef.current.stop();
        spinLoopRef.current = null;
      }
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current = null;
      }
      spinAnim.stopAnimation();
      pulseAnim.stopAnimation();
    }

    // Cleanup on unmount
    return () => {
      if (spinLoopRef.current) spinLoopRef.current.stop();
      if (pulseLoopRef.current) pulseLoopRef.current.stop();
      spinAnim.stopAnimation();
      pulseAnim.stopAnimation();
    };
  }, [visible, status, spinAnim, pulseAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isGenerating = status === GENERATION_STATUS.GENERATING;
  const hasError = status === GENERATION_STATUS.ERROR;
  const notConfigured = status === GENERATION_STATUS.NOT_CONFIGURED;

  // Different messages for immediate generation vs pre-loading
  const isPreloadingContent = isPreloading || generationType === GENERATION_TYPE.PRELOAD;

  // Use diegetic messages for cache misses (unexpected player choices)
  const progressText = progress?.total > 0
    ? isPreloadingContent
      ? `Pre-loading chapter ${progress.current}/${progress.total}...`
      : isCacheMiss
        ? CACHE_MISS_MESSAGES.progress[cacheMissIndex]
        : `Generating story ${progress.current}/${progress.total}...`
    : isCacheMiss
      ? CACHE_MISS_MESSAGES.progress[cacheMissIndex]
      : 'Preparing story...';

  const titleText = hasError
    ? 'Generation Error'
    : notConfigured
      ? 'Setup Required'
      : isPreloadingContent
        ? 'Loading Next Chapter'
        : isCacheMiss
          ? CACHE_MISS_MESSAGES.titles[cacheMissIndex]
          : 'Crafting Your Story';

  const hintText = isPreloadingContent
    ? 'Getting the next chapter ready while you play...'
    : isCacheMiss
      ? CACHE_MISS_MESSAGES.hints[cacheMissIndex]
      : 'The AI is writing your unique story continuation...';

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
              {titleText}
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
                  {hintText}
                </Text>
                <Text style={styles.quoteText}>{QUOTES[quoteIndex]}</Text>
              </>
            )}

            {hasError && (
              <>
                <Text style={styles.errorText}>
                  {noirErrorRef.current || "The trail went cold."}
                </Text>
                <Text style={styles.technicalError}>
                  {error || 'Unknown error'}
                </Text>
                <Text style={styles.blockingText}>
                  The story cannot continue until this is resolved.
                </Text>
                <View style={styles.buttonRow}>
                  {onRetry && (
                    <Pressable style={styles.button} onPress={onRetry}>
                      <Text style={styles.buttonText}>Try Again</Text>
                    </Pressable>
                  )}
                  {onGoToSettings && (
                    <Pressable style={[styles.button, styles.secondaryButton]} onPress={onGoToSettings}>
                      <Text style={styles.buttonText}>Settings</Text>
                    </Pressable>
                  )}
                </View>
                {onBackToHub && (
                  <Pressable style={styles.backButton} onPress={onBackToHub}>
                    <Text style={styles.backText}>Return to Case Files</Text>
                  </Pressable>
                )}
              </>
            )}

            {notConfigured && (
              <>
                <Text style={styles.configText}>
                  The city's secrets won't reveal themselves without the right connections.
                </Text>
                <Text style={styles.hintText}>
                  To continue past Chapter 1, you need to configure your Gemini API key in Settings.
                  The AI will write your unique story based on your choices.
                </Text>
                <Text style={styles.blockingText}>
                  No key, no story. That's how it works in this town.
                </Text>
                {onGoToSettings && (
                  <Pressable style={styles.button} onPress={onGoToSettings}>
                    <Text style={styles.buttonText}>Open Settings</Text>
                  </Pressable>
                )}
                {onBackToHub && (
                  <Pressable style={styles.backButton} onPress={onBackToHub}>
                    <Text style={styles.backText}>Return to Case Files</Text>
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
    color: '#E8D5B5',
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontStyle: 'italic',
  },
  technicalError: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.xs,
    color: '#C83C3C',
    textAlign: 'center',
    marginBottom: SPACING.md,
    opacity: 0.8,
  },
  blockingText: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.sm,
    color: 'rgba(232, 213, 181, 0.6)',
    textAlign: 'center',
    marginBottom: SPACING.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  backButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232, 213, 181, 0.2)',
    width: '100%',
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  backText: {
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.sm,
    color: 'rgba(232, 213, 181, 0.5)',
    letterSpacing: 1,
  },
});
