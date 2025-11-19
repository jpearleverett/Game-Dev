import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

const VARIANT_CONFIG = {
  slot: {
    baseSize: FONT_SIZES.md,
    minScale: 0.84,
    lines: 1,
    letterSpacing: 1.6,
  },
  card: {
    baseSize: FONT_SIZES.lg,
    baseSizeExpanded: FONT_SIZES.xl,
    minScale: 0.72,
    lines: 2,
    letterSpacing: 1.9,
  },
};

export default function WordLabel({
  text,
  variant = 'slot',
  uppercase,
  color,
  tone = 'default',
  style,
  numberOfLines,
  minimumFontScale,
  align = 'center',
}) {
  const { moderateScale, sizeClass } = useResponsiveLayout();
  const compact = sizeClass === 'xsmall' || sizeClass === 'small';

  const variantConfig = variant === 'card' ? VARIANT_CONFIG.card : VARIANT_CONFIG.slot;
  const computedFontSize = variant === 'card'
    ? moderateScale(compact ? variantConfig.baseSize : variantConfig.baseSizeExpanded || variantConfig.baseSize)
    : moderateScale(variantConfig.baseSize);

  const resolvedLines = numberOfLines || variantConfig.lines;
  const resolvedMinScale = minimumFontScale || variantConfig.minScale;
  const shouldUppercase = typeof uppercase === 'boolean' ? uppercase : variant === 'card';

  const displayText = useMemo(() => {
    if (text == null) return '';
    const asString = String(text).trim();
    return shouldUppercase ? asString.toUpperCase() : asString;
  }, [text, shouldUppercase]);

  const computedLineHeight = Math.round(computedFontSize * (resolvedLines > 1 ? 1.16 : 1.08));

  return (
    <Text
      style={[
        styles.base,
        variant === 'card' ? styles.card : styles.slot,
        {
          fontSize: computedFontSize,
          letterSpacing: variantConfig.letterSpacing,
          lineHeight: computedLineHeight,
          textAlign: align,
        },
        tone === 'muted' && styles.muted,
        color ? { color } : null,
        style,
      ]}
      numberOfLines={resolvedLines}
      adjustsFontSizeToFit
      minimumFontScale={resolvedMinScale}
    >
      {displayText}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: FONTS.primarySemiBold,
    includeFontPadding: false,
    color: COLORS.textPrimary,
  },
  slot: {},
  card: {
    textShadowColor: 'rgba(12, 13, 18, 0.35)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 2 },
  },
  muted: {
    color: COLORS.textMuted,
  },
});
