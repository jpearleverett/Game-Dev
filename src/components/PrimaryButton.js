import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';
import { RADIUS } from '../constants/layout';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

const VARIANTS = {
  primary: {
    idle: [COLORS.accentPrimary, '#a14a43'],
    pressed: ['#a14a43', '#7f3733'],
    disabled: ['#2b2a32', '#242329'],
    shadow: COLORS.accentSoft,
    text: COLORS.offWhite,
    textDisabled: 'rgba(246, 236, 219, 0.5)',
    glyph: COLORS.textSecondary,
    glyphDisabled: 'rgba(214, 201, 186, 0.52)',
  },
};

export default function PrimaryButton({
  label,
  onPress,
  style,
  disabled = false,
  icon,
  arrow = true,
  tone = 'primary',
  fullWidth = false,
}) {
  const { moderateScale, scaleRadius, sizeClass } = useResponsiveLayout();

  const palette = VARIANTS[tone] || VARIANTS.primary;

  const handlePress = useCallback(() => {
    if (disabled) return;
    onPress?.();
  }, [disabled, onPress]);

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [disabled]);

  const responsiveStyles = useMemo(() => {
    const paddingVertical = sizeClass === 'xsmall' ? 12 : sizeClass === 'small' ? 14 : sizeClass === 'medium' ? 16 : 18;
    const paddingHorizontal = sizeClass === 'xsmall' ? 18 : sizeClass === 'small' ? 22 : sizeClass === 'medium' ? 26 : 30;
    const arrowSpacing = arrow ? (sizeClass === 'xsmall' ? 6 : 10) : 0;
    const contentGap = sizeClass === 'xsmall' ? 6 : sizeClass === 'small' ? 8 : 10;

    return {
      wrapper: {
        borderRadius: scaleRadius(RADIUS.lg),
        shadowRadius: sizeClass === 'xsmall' ? 8 : 14,
        shadowOffset: { width: 0, height: sizeClass === 'xsmall' ? 6 : 10 },
      },
      gradient: {
        paddingVertical,
        paddingHorizontal,
        borderRadius: scaleRadius(RADIUS.lg),
      },
      label: {
        fontSize: moderateScale(FONT_SIZES.lg),
        letterSpacing: sizeClass === 'xsmall' ? 1.1 : sizeClass === 'small' ? 1.6 : 2,
      },
      icon: {
        fontSize: moderateScale(FONT_SIZES.lg),
      },
      arrow: {
        fontSize: moderateScale(FONT_SIZES.lg),
        marginLeft: arrowSpacing,
      },
      content: {
        gap: contentGap,
      },
    };
  }, [arrow, moderateScale, scaleRadius, sizeClass]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      disabled={disabled}
      style={({ pressed }) => [
        styles.wrapper,
        responsiveStyles.wrapper,
        style,
        fullWidth && styles.wrapperFull,
        { shadowColor: palette.shadow },
        pressed && !disabled && styles.wrapperPressed,
        disabled && styles.wrapperDisabled,
      ]}
    >
      {({ pressed }) => {
        const colors = disabled ? palette.disabled : pressed ? palette.pressed : palette.idle;
        return (
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, responsiveStyles.gradient]}
          >
            <View style={styles.gloss} pointerEvents="none" />
            <View style={[styles.content, responsiveStyles.content]}>
              {icon ? (
                <Text style={[styles.icon, responsiveStyles.icon, { color: disabled ? palette.glyphDisabled : palette.glyph }]}>
                  {icon}
                </Text>
              ) : null}
              <Text
                style={[styles.label, responsiveStyles.label, { color: disabled ? palette.textDisabled : palette.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {label.toUpperCase()}
              </Text>
              {arrow ? (
                <Text
                  style={[styles.arrow, responsiveStyles.arrow, { color: disabled ? palette.glyphDisabled : palette.glyph }]}
                >
                  ›
                </Text>
              ) : null}
            </View>
          </LinearGradient>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    elevation: 6,
  },
  wrapperFull: {
    alignSelf: 'stretch',
    flexGrow: 1,
  },
  wrapperPressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.96,
  },
  wrapperDisabled: {
    elevation: 0,
  },
  gradient: {
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONTS.primaryBold,
  },
  icon: {
    fontFamily: FONTS.primaryBold,
  },
  arrow: {
    fontFamily: FONTS.primaryBold,
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: 'rgba(255, 240, 222, 0.18)',
  },
});
