import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/layout';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

export default function AttemptCounter({ attemptsRemaining, totalAttempts, colorBlindMode = false }) {
  const { moderateScale, scaleSpacing, sizeClass } = useResponsiveLayout();
  const compact = sizeClass === 'xsmall' || sizeClass === 'small';

  const segments = useMemo(() => {
    return Array.from({ length: totalAttempts }).map((_, index) => {
      const available = index < attemptsRemaining;
      return (
        <View
          key={`attempt-${index}`}
          style={[
            styles.segment,
            compact && styles.segmentCompact,
            {
              backgroundColor: available ? COLORS.accentPrimary : 'rgba(246, 236, 219, 0.08)',
              borderColor: available ? 'rgba(212, 106, 93, 0.45)' : COLORS.panelAperture,
              shadowOpacity: available ? 0.32 : 0,
            },
          ]}
        >
          {colorBlindMode ? (
            <Text
              style={[
                styles.segmentGlyph,
                compact && styles.segmentGlyphCompact,
                available ? styles.segmentGlyphActive : styles.segmentGlyphSpent,
              ]}
            >
              {available ? '\u2713' : '\u2717'}
            </Text>
          ) : null}
        </View>
      );
    });
  }, [attemptsRemaining, totalAttempts, colorBlindMode, compact]);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.meta, compact && styles.metaCompact]}>
        <Text style={[styles.label, compact && styles.labelCompact, { fontSize: moderateScale(FONT_SIZES.xs) }]}>ATTEMPTS</Text>
        <Text
          style={[
            styles.counterCopy,
            compact && styles.counterCopyCompact,
            { fontSize: moderateScale(FONT_SIZES.sm) },
          ]}
        >
          {attemptsRemaining}/{totalAttempts}
        </Text>
      </View>
      <View
        style={[
          styles.segmentRow,
          compact && styles.segmentRowCompact,
          { gap: compact ? scaleSpacing(SPACING.xs) : SPACING.sm },
        ]}
      >
        {segments}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  containerCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  meta: {
    minWidth: 96,
  },
  metaCompact: {
    minWidth: undefined,
  },
  label: {
    fontFamily: FONTS.primarySemiBold,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 1.8,
    color: COLORS.textMuted,
  },
  labelCompact: {
    letterSpacing: 1.2,
  },
  counterCopy: {
    marginTop: 4,
    fontFamily: FONTS.secondary,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 1.4,
    color: COLORS.textSecondary,
  },
  counterCopyCompact: {
    letterSpacing: 1,
  },
  segmentRow: {
    flexDirection: 'row',
    flex: 1,
  },
  segmentRowCompact: {
    width: '100%',
  },
  segment: {
    flex: 1,
    height: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.panelAperture,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accentSoft,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  segmentCompact: {
    height: 10,
  },
  segmentGlyph: {
    fontFamily: FONTS.primaryBold,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1,
    color: COLORS.offWhite,
  },
  segmentGlyphCompact: {
    fontSize: FONT_SIZES.xs - 1,
  },
  segmentGlyphActive: {
    color: COLORS.offWhite,
  },
  segmentGlyphSpent: {
    color: COLORS.textMuted,
  },
});
