import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { RADIUS, SPACING } from '../../constants/layout';

export default function ConfirmedOutliers({
  confirmedSlots,
  marginTop,
  containerRadius,
  tilePadding,
  scaleSpacing,
  scaleRadius,
  moderateScale,
  onLayoutGrid,
  onLayoutSlot,
  branchMetaByKey,
}) {
  return (
    <View
      style={[
        styles.section,
        {
          marginTop: marginTop,
          borderRadius: containerRadius,
        },
      ]}
    >
      <Text
        style={[styles.label, { fontSize: moderateScale(FONT_SIZES.sm) }]}
      >
        CONFIRMED OUTLIERS
      </Text>
      <View
        style={[
          styles.grid,
          {
            marginTop: scaleSpacing(SPACING.sm),
            gap: tilePadding,
          },
        ]}
        onLayout={onLayoutGrid}
      >
        {confirmedSlots.map((slot, index) => {
          const slotBranchKey =
            slot.word && typeof slot.word === 'string'
              ? slot.word.toUpperCase()
              : '';
          const slotMeta = branchMetaByKey
            ? branchMetaByKey[slotBranchKey]
            : null;
          
          // For 8 items, we want 4 per row. 
          // With gap, 4 items = ~23-24% width each depending on gap size.
          // Let's use '23%' to be safe and let flexWrap handle it.
          const isDense = confirmedSlots.length > 4;
          
          return (
            <View
              key={slot.id || `slot-${index}`}
              onLayout={onLayoutSlot(
                slot.id || `slot-${index}`,
                slot.word
              )}
              style={[
                styles.slot,
                {
                  borderRadius: scaleRadius(RADIUS.md),
                  minHeight: moderateScale(46),
                  paddingVertical: scaleSpacing(SPACING.xs) + 2,
                  paddingHorizontal: scaleSpacing(SPACING.xs),
                  // Force 4 items per row (basis) but allow growing to fill
                  width: isDense ? '22%' : undefined,
                  flexBasis: isDense ? '22%' : undefined,
                  flexGrow: 1,
                },
                slot.filled
                  ? [
                      styles.slotFilled,
                      slotMeta
                        ? {
                            borderColor: slotMeta.color,
                            backgroundColor: slotMeta.soft,
                          }
                        : null,
                    ]
                  : styles.slotEmpty,
              ]}
            >
              <Text
                style={[
                  styles.word,
                  slot.filled ? styles.wordFilled : styles.wordEmpty,
                  { fontSize: moderateScale(FONT_SIZES.md) },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {slot.filled ? slot.word : '—'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(26, 16, 9, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(249, 220, 174, 0.18)',
  },
  label: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 2.6,
    color: '#f6d8a9',
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flexWrap: 'wrap',
  },
  slot: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 245, 214, 0.12)',
  },
  slotFilled: {
    borderColor: 'rgba(250, 206, 120, 0.6)',
    backgroundColor: 'rgba(246, 195, 106, 0.14)',
  },
  slotEmpty: {
    borderColor: 'rgba(255, 235, 190, 0.25)',
  },
  word: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  wordFilled: {
    color: '#f9e3bf',
  },
  wordEmpty: {
    color: 'rgba(249, 219, 170, 0.4)',
  },
});
