import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';
import { RADIUS } from '../constants/layout';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

export default function SecondaryButton({
  label,
  onPress,
  style,
  icon,
  arrow = false,
  size = 'default',
}) {
  const { moderateScale, scaleRadius, sizeClass } = useResponsiveLayout();

  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  const handlePressIn = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const responsiveStyles = useMemo(() => {
    const paddingVerticalBase =
      sizeClass === 'xsmall' ? 8 : sizeClass === 'small' ? 10 : 12;
    const paddingHorizontalBase =
      sizeClass === 'xsmall' ? 14 : sizeClass === 'small' ? 18 : 20;
    const letterSpacingBase = sizeClass === 'xsmall' ? 1.1 : 1.6;

    const sizeFactor = size === 'compact' ? 0.85 : 1;
    const fontSize = moderateScale(FONT_SIZES.sm) * sizeFactor;
    const paddingVertical = paddingVerticalBase * sizeFactor;
    const paddingHorizontal = paddingHorizontalBase * sizeFactor;
    const letterSpacing = letterSpacingBase * (size === 'compact' ? 0.9 : 1);
    const gap = size === 'compact' ? 6 : 8;

    return {
      wrapper: {
        borderRadius: scaleRadius(RADIUS.md),
      },
      inner: {
        borderRadius: scaleRadius(RADIUS.md),
        paddingVertical,
        paddingHorizontal,
        gap,
      },
      label: {
        fontSize,
        letterSpacing,
      },
      glyph: {
        fontSize,
      },
    };
  }, [moderateScale, scaleRadius, sizeClass, size]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      style={({ pressed }) => [
        styles.wrapper,
        responsiveStyles.wrapper,
        style,
        pressed && styles.wrapperPressed,
      ]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.inner,
            responsiveStyles.inner,
            {
              backgroundColor: pressed ? 'rgba(30, 33, 42, 0.9)' : 'rgba(21, 24, 32, 0.85)',
              borderColor: pressed ? COLORS.panelOutline : COLORS.panelAperture,
            },
          ]}
        >
          {arrow ? (
            <Text
              style={[styles.glyph, responsiveStyles.glyph, { color: COLORS.textMuted }]}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              ‹
            </Text>
          ) : null}
          {icon ? (
            typeof icon === 'string' ? (
              <Text style={[styles.glyph, responsiveStyles.glyph, { color: COLORS.textSecondary }]}>{icon}</Text>
            ) : (
              <View style={styles.iconWrapper}>{icon}</View>
            )
          ) : null}
          <Text
            style={[styles.label, responsiveStyles.label]}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.75}
          >
            {label.toUpperCase()}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.md,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  wrapperPressed: {
    transform: [{ translateY: 1 }],
  },
  inner: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(21, 24, 32, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontFamily: FONTS.primarySemiBold,
    color: COLORS.textSecondary,
  },
  glyph: {
    fontFamily: FONTS.primaryBold,
    color: COLORS.textMuted,
  },
});
