import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { CARD_STATES, COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/layout';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import WordLabel from './WordLabel';

const STATE_MAP = {
  default: CARD_STATES.default,
  selected: CARD_STATES.selected,
  lockedMain: CARD_STATES.lockedMain,
  lockedOutlier: CARD_STATES.lockedOutlier,
};

const HIGH_CONTRAST_STATE_MAP = {
  default: {
    backgroundColor: '#101010',
    borderColor: COLORS.pureWhite,
    textColor: COLORS.cigaretteSmoke,
    shadow: COLORS.pureWhite,
    lineColor: 'rgba(255,255,255,0.2)',
    pin: COLORS.pureWhite,
    tape: 'rgba(255,255,255,0.22)',
  },
  selected: {
    backgroundColor: '#ffffff',
    borderColor: COLORS.amberLight,
    textColor: COLORS.background,
    glow: 'rgba(255,255,255,0.8)',
    sheen: 'rgba(255,255,255,0.18)',
    shadow: COLORS.pureWhite,
    lineColor: 'rgba(0,0,0,0.24)',
    pin: COLORS.background,
    tape: 'rgba(255,255,255,0.35)',
  },
  lockedMain: {
    backgroundColor: '#000000',
    borderColor: COLORS.fogGray,
    textColor: COLORS.cigaretteSmoke,
    shadow: COLORS.fogGray,
    lineColor: 'rgba(255,255,255,0.12)',
    pin: COLORS.fogGray,
    tape: 'rgba(255,255,255,0.18)',
  },
  lockedOutlier: {
    backgroundColor: COLORS.amberLight,
    borderColor: COLORS.pureWhite,
    textColor: COLORS.background,
    glow: 'rgba(255,255,255,0.6)',
    sheen: 'rgba(255,255,255,0.22)',
    shadow: COLORS.pureWhite,
    lineColor: 'rgba(255,255,255,0.18)',
    pin: COLORS.background,
    tape: 'rgba(255,255,255,0.3)',
  },
};

function WordCard({
  word,
  state = 'default',
  onToggle,
  onHint,
  disabled,
  colorBlindMode = false,
  highContrast = false,
  hintsActive = false,
  celebrating = false,
  celebrationDelay = 0,
  outlierBadge = null,
}) {
  const { moderateScale, scaleSpacing, scaleRadius, sizeClass } = useResponsiveLayout();
  const compact = sizeClass === 'xsmall' || sizeClass === 'small';
  const medium = sizeClass === 'medium';

  const palette = useMemo(() => {
    const base = STATE_MAP[state] || STATE_MAP.default;
    if (!highContrast) {
      return base;
    }
    return HIGH_CONTRAST_STATE_MAP[state] || HIGH_CONTRAST_STATE_MAP.default;
  }, [state, highContrast]);

  const lineColor = palette.lineColor || 'rgba(146, 108, 70, 0.26)';
  const pinColor = palette.pin || '#7a5036';
  const tapeColor = palette.tape || 'rgba(92, 74, 64, 0.28)';
  const isLocked = state === 'lockedMain' || state === 'lockedOutlier';
  const showTape = Boolean(palette.tape) && (isLocked || state === 'selected');
  const cardLines = useMemo(() => Array.from({ length: 6 }).map((_, index) => index), []);

  const interactive = !disabled && state !== 'lockedMain' && state !== 'lockedOutlier';
  const celebrationProgress = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const celebrationActive = celebrating && state === 'lockedOutlier';

  const randomRotation = useMemo(() => {
    const range = 1.2; 
    const deg = (Math.random() * range * 2) - range;
    return `${deg}deg`;
  }, []);

  useEffect(() => {
    if (!celebrationActive) {
      celebrationProgress.stopAnimation();
      celebrationProgress.setValue(0);
      return;
    }

    celebrationProgress.stopAnimation();
    celebrationProgress.setValue(0);

    const riseDuration = 520;
    const releaseDuration = 460;
    const holdDelay = 140;
    const delay = Math.max(0, celebrationDelay);

    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(celebrationProgress, {
        toValue: 1,
        duration: riseDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(holdDelay),
      Animated.timing(celebrationProgress, {
        toValue: 0,
        duration: releaseDuration,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        celebrationProgress.setValue(0);
      }
    });

    return () => {
      animation.stop();
      celebrationProgress.stopAnimation();
    };
  }, [celebrationActive, celebrationDelay, celebrationProgress]);

  const cardScale = celebrationProgress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [1, 1.08, 1.04],
  });
  const glowOpacity = celebrationProgress.interpolate({
    inputRange: [0, 0.25, 0.6, 1],
    outputRange: [0, 0.9, 0.75, 0],
  });
  const glowScale = celebrationProgress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.85, 1.08, 1.18],
  });
  const ringOpacity = celebrationProgress.interpolate({
    inputRange: [0, 0.3, 0.8, 1],
    outputRange: [0, 0.95, 0.4, 0],
  });
  const ringScale = celebrationProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.75, 1.05, 1.35],
  });

  const handlePress = useCallback(() => {
    if (!interactive) return;
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Haptics.selectionAsync().catch(() => {});
    onToggle?.(word);
  }, [interactive, onToggle, word, scaleAnim]);

  const handleLongPress = useCallback(() => {
    if (!interactive) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onHint?.(word);
  }, [interactive, onHint, word]);

  const accessibilityHint = useMemo(() => {
    if (state === 'lockedOutlier') return 'Confirmed outlier';
    if (state === 'lockedMain') return 'Confirmed main theme word';
    if (!interactive) return undefined;
    return hintsActive ? 'Tap to toggle. Long-press for a hint.' : 'Tap to toggle selection.';
  }, [state, interactive, hintsActive]);

  const normalizedWord = useMemo(() => (word ? String(word).trim() : ''), [word]);
  const accessibilityLabel = normalizedWord ? normalizedWord.toUpperCase() : 'Empty word card';

  const statusBadge = useMemo(() => {
    if (state === 'lockedOutlier') {
      if (outlierBadge?.label) {
        return outlierBadge.label;
      }
      return colorBlindMode ? '? OUTLIER' : 'OUTLIER';
    }
    if (state === 'lockedMain') {
      return colorBlindMode ? '? MAIN' : 'LOCKED';
    }
    return null;
  }, [state, colorBlindMode, outlierBadge?.label]);

  const badgeVariantStyle = useMemo(() => {
    if (state === 'lockedOutlier' && outlierBadge?.color) {
      return {
        backgroundColor: outlierBadge.color,
        color: '#2b140b',
        borderColor: 'rgba(20, 12, 6, 0.2)',
      };
    }
    if (state === 'lockedOutlier') {
      return styles.badgeOutlier;
    }
    return styles.badgeLocked;
  }, [state, outlierBadge?.color]);

  const cardPaddingVertical = scaleSpacing(compact ? 4 : 6);
  const cardPaddingHorizontal = scaleSpacing(compact ? 2 : 3);
  const baseLabelSize = compact ? FONT_SIZES.md : FONT_SIZES.lg;
  const selectedLabelBoost = state === 'selected' ? 2 : 0;
  const labelFontSize = moderateScale(baseLabelSize + selectedLabelBoost);
  const labelLetterSpacing = compact ? 1.0 : 1.2;
  const cardRadius = scaleRadius(compact ? RADIUS.md : RADIUS.lg);

  return (
    <Pressable
      onPress={handlePress}
      disabled={!interactive}
      onLongPress={interactive && onHint ? handleLongPress : undefined}
      delayLongPress={320}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.pressable,
        pressed && interactive && styles.pressablePressed,
      ]}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: palette.backgroundColor,
            borderColor: palette.borderColor,
            borderRadius: cardRadius,
            paddingVertical: cardPaddingVertical,
            paddingHorizontal: cardPaddingHorizontal,
            shadowColor: palette.shadow || COLORS.shadowStrong,
            transform: [
               { rotate: randomRotation },
               { scale: celebrationActive ? cardScale : scaleAnim }
            ]
          },
          state === 'selected' ? styles.cardElevated : styles.cardShadow,
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.cardGradient, { borderRadius: cardRadius }]}
        />

        <View pointerEvents="none" style={styles.cardLines}>
          {cardLines.map((line) => (
            <View key={`line-${line}`} style={[styles.cardLine, { backgroundColor: lineColor }]} />
          ))}
        </View>

        <View pointerEvents="none" style={[styles.cardPin, { backgroundColor: pinColor, shadowColor: palette.shadow || COLORS.shadowStrong }]} />

        {showTape && (
          <View
            pointerEvents="none"
            style={[
              styles.cardTape,
              isLocked ? styles.cardTapeLocked : styles.cardTapeFlagged,
              { backgroundColor: tapeColor },
            ]}
          />
        )}

        {palette.sheen && (
          <LinearGradient
            pointerEvents="none"
            colors={[palette.sheen, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cardSheen, { borderRadius: cardRadius }]}
          />
        )}

        {celebrationActive && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.celebrationGlow,
                {
                  borderRadius: cardRadius,
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.celebrationRing,
                {
                  borderRadius: cardRadius,
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
          </>
        )}

        {statusBadge && (
          <View style={styles.badgeContainerTop}>
            <Text
              style={[
                styles.badge,
                badgeVariantStyle,
                { fontSize: moderateScale(FONT_SIZES.xs * 0.7) },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {statusBadge}
            </Text>
          </View>
        )}

        <View style={styles.wordContainer}>
          <WordLabel
            text={normalizedWord}
            variant="slot"
            uppercase
            align="center"
            color={palette.textColor || COLORS.offWhite}
            numberOfLines={1}
            minimumFontScale={0.7}
            style={[styles.wordText, { fontSize: labelFontSize, letterSpacing: labelLetterSpacing }]}
          />
        </View>

        <View pointerEvents="none" style={styles.cardFooter}>
          <View style={styles.cardFooterNotch} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default React.memo(WordCard);

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
    aspectRatio: 1.6,
  },
  pressablePressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.94,
  },
  card: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 6,
    },
    shadowOpacity: 0.35,
    shadowRadius: 5.84,
    elevation: 8,
  },
  cardElevated: {
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  cardLines: {
    position: 'absolute',
    top: '16%',
    bottom: '18%',
    left: '12%',
    right: '12%',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  cardLine: {
    height: 1.2,
    borderRadius: 1,
  },
  cardPin: {
    position: 'absolute',
    top: -10,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.25)',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    zIndex: 4,
  },
  cardTape: {
    position: 'absolute',
    top: 12,
    left: '10%',
    right: '10%',
    height: 18,
    borderRadius: 6,
    opacity: 0.9,
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    zIndex: 3,
  },
  cardTapeLocked: {
    transform: [{ rotate: '-6deg' }],
  },
  cardTapeFlagged: {
    transform: [{ rotate: '4deg' }],
  },
  cardSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46%',
    zIndex: 2,
  },
  badgeContainerTop: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  badge: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(20, 12, 6, 0.2)',
    textAlign: 'center',
  },
  badgeOutlier: {
    backgroundColor: 'rgba(241, 197, 114, 0.9)',
    color: '#3a1c06',
  },
  badgeLocked: {
    backgroundColor: 'rgba(60, 48, 40, 0.85)',
    color: COLORS.offWhite,
  },
  wordContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    zIndex: 4,
  },
  wordText: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 2.6,
  },
  cardFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  cardFooterNotch: {
    width: '52%',
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 2,
    marginBottom: 2,
  },
  celebrationGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(241, 197, 114, 0.28)',
    shadowColor: 'rgba(241, 197, 114, 0.8)',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 0,
  },
  celebrationRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(241, 197, 114, 0.85)',
    zIndex: 0,
  },
});