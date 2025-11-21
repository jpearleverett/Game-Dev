import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, RADIUS } from '../../constants/layout';

export default function BoardHeader({
  marginTop,
  thumbtackMetrics,
  thumbtackVariance,
  instructions,
  selectedCount,
  branchLegend,
  onLayoutObjective,
  scaleSpacing,
  scaleRadius,
  moderateScale,
}) {
  const {
    head,
    stemHeight,
    stemWidth,
    stemTop,
    stemHighlightWidth,
    stemHighlightHeight,
    stemHighlightTop,
    rimThickness,
    innerHead,
    offset,
    shineSize,
    shineTop,
    shineLeft,
    pivotOffset,
    clearance,
  } = thumbtackMetrics;

  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: scaleRadius(RADIUS.lg),
          marginTop: marginTop,
          paddingHorizontal: scaleSpacing(SPACING.md),
          paddingBottom: scaleSpacing(SPACING.md),
          paddingTop: scaleSpacing(SPACING.sm) + clearance,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.thumbtackContainer,
          {
            width: head,
            height: head + stemHeight,
            top: -offset,
            marginLeft: -head / 2,
            transform: [
              { translateX: thumbtackVariance.horizontalOffset },
              { translateY: -pivotOffset },
              { rotate: `${thumbtackVariance.angle}deg` },
              { translateY: pivotOffset + Math.round(head * 0.04) },
            ],
          },
        ]}
      >
        <View
          style={[
            styles.thumbtackStem,
            {
              width: stemWidth,
              height: stemHeight,
              top: stemTop,
              left: (head - stemWidth) / 2,
              borderRadius: Math.round(stemWidth * 0.65),
            },
          ]}
        />
        <View
          style={[
            styles.thumbtackStemSheen,
            {
              width: stemHighlightWidth,
              height: stemHighlightHeight,
              top: stemHighlightTop,
              left: (head - stemWidth) / 2 + Math.round(stemWidth * 0.16),
              borderRadius: Math.round(stemHighlightWidth / 2),
            },
          ]}
        />
        <View
          style={[
            styles.thumbtackHead,
            {
              width: head,
              height: head,
              borderRadius: head / 2,
            },
          ]}
        >
          <LinearGradient
            colors={['#f49b78', '#c44a28', '#4a0f0a']}
            locations={[0, 0.52, 1]}
            start={{ x: 0.18, y: 0.12 }}
            end={{ x: 0.86, y: 0.88 }}
            style={[
              styles.thumbtackHeadGradient,
              {
                borderRadius: innerHead / 2,
                top: rimThickness,
                right: rimThickness,
                bottom: rimThickness,
                left: rimThickness,
              },
            ]}
          />
          <View
            style={[
              styles.thumbtackInnerShadow,
              {
                borderRadius: innerHead / 2,
                top: rimThickness,
                right: rimThickness,
                bottom: rimThickness,
                left: rimThickness,
              },
            ]}
          />
          <View
            style={[
              styles.thumbtackHighlight,
              {
                width: Math.round(shineSize * 1.4),
                height: shineSize,
                borderRadius: shineSize,
                top: shineTop,
                left: shineLeft,
              },
            ]}
          />
        </View>
      </View>
      <View
        style={[
          styles.objectiveBlock,
          { marginTop: scaleSpacing(SPACING.xs) },
        ]}
        onLayout={onLayoutObjective}
      >
        <Text
          style={[
            styles.objectiveHeadline,
            { fontSize: moderateScale(FONT_SIZES.xs) },
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {instructions}
        </Text>
        <Text
          style={[
            styles.objectiveMeta,
            { fontSize: moderateScale(FONT_SIZES.sm) },
          ]}
        >
          {`${selectedCount} clue${selectedCount === 1 ? '' : 's'} flagged`}
        </Text>
        {branchLegend && branchLegend.length > 0 && (
          <View
            style={[
              styles.branchLegend,
              { marginTop: scaleSpacing(SPACING.xs) },
            ]}
          >
            {branchLegend.map((entry) => (
              <View key={`legend-${entry.key}`} style={styles.branchLegendItem}>
                <View
                  style={[
                    styles.branchLegendDot,
                    { backgroundColor: entry.color },
                  ]}
                />
                <View style={styles.branchLegendCopy}>
                  <Text
                    style={[
                      styles.branchLegendLabel,
                      { fontSize: moderateScale(FONT_SIZES.sm) },
                    ]}
                    numberOfLines={2}
                  >
                    {entry.legendLabel}
                  </Text>
                  {entry.themeLabel ? (
                    <Text
                      style={[
                        styles.branchLegendTheme,
                        { fontSize: moderateScale(FONT_SIZES.xs) },
                      ]}
                      numberOfLines={1}
                    >
                      {entry.themeLabel}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: 'rgba(22, 14, 8, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 216, 174, 0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
    position: 'relative',
  },
  thumbtackContainer: {
    position: 'absolute',
    left: '50%',
    zIndex: 40,
    alignItems: 'center',
  },
  thumbtackStem: {
    position: 'absolute',
    backgroundColor: '#551f14',
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  thumbtackStemSheen: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 216, 190, 0.32)',
    opacity: 0.9,
  },
  thumbtackHead: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#2d0c07',
    borderWidth: 1,
    borderColor: '#170503',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 9,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbtackHeadGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  thumbtackInnerShadow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    opacity: 0.4,
    transform: [{ scaleX: 0.84 }, { scaleY: 0.72 }],
  },
  thumbtackHighlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    opacity: 0.85,
    transform: [{ rotate: '-22deg' }, { scaleX: 1.12 }, { scaleY: 0.68 }],
  },
  objectiveBlock: {
    width: '100%',
    alignItems: 'flex-start',
  },
  objectiveHeadline: {
    fontFamily: FONTS.primarySemiBold,
    letterSpacing: 2.2,
    color: '#f5e3c8',
    textTransform: 'uppercase',
    textAlign: 'left',
  },
  objectiveMeta: {
    marginTop: 6,
    fontFamily: FONTS.mono,
    letterSpacing: 1.8,
    color: 'rgba(245, 208, 162, 0.76)',
    textAlign: 'left',
  },
  branchLegend: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  branchLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.sm,
    marginTop: SPACING.xs,
  },
  branchLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  branchLegendCopy: {
    flexShrink: 1,
  },
  branchLegendLabel: {
    fontFamily: FONTS.mono,
    letterSpacing: 1.4,
    color: COLORS.textMuted,
    flexShrink: 1,
  },
  branchLegendTheme: {
    fontFamily: FONTS.mono,
    letterSpacing: 1.2,
    color: COLORS.textMuted,
    opacity: 0.85,
    marginTop: 2,
  },
});
