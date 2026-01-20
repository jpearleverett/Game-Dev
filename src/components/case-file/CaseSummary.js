import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, RADIUS } from '../../constants/layout';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';

const FONT_TWEAK_FACTOR = 0.95;
const shrinkFont = (value) => Math.max(10, Math.floor(value * FONT_TWEAK_FACTOR));

export default function CaseSummary({ content, compact }) {
  const { moderateScale, scaleSpacing, scaleRadius } = useResponsiveLayout();
  
  if (!content) return null;

  // Layout Constants
  const sectionGap = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const summaryPanelLift = Math.round(sectionGap * 0.25);
  const summaryPanelPadding = scaleSpacing(compact ? SPACING.xs : SPACING.sm);
  const blockRadius = scaleRadius(RADIUS.md);

  // Typography Constants
  const slugSize = shrinkFont(moderateScale(FONT_SIZES.xs));
  const focusSize = shrinkFont(moderateScale(compact ? FONT_SIZES.xs : FONT_SIZES.sm));
  const summaryBaseSize = compact ? FONT_SIZES.sm : FONT_SIZES.md;
  const summarySize = shrinkFont(moderateScale(summaryBaseSize));
  const summaryLineHeight = Math.round(summarySize * (compact ? 1.4 : 1.52));

  return (
    <View
      style={[
        styles.summaryPanel,
        {
          borderRadius: blockRadius,
          padding: summaryPanelPadding,
          borderColor: "rgba(190, 134, 68, 0.42)",
          backgroundColor: "rgba(250, 236, 210, 0.96)",
          gap: scaleSpacing(SPACING.xs),
          marginTop: summaryPanelLift ? -summaryPanelLift : 0,
        },
      ]}
    >
      <View style={[styles.summaryTape, styles.summaryTapeLeft]} pointerEvents="none" />
      <View style={[styles.summaryTape, styles.summaryTapeRight]} pointerEvents="none" />
      
      {content.type === "dailyIntro" && content.showSlugSeparately && content.slug ? (
        <Text
          style={[
            styles.summaryText,
            {
              fontSize: summarySize,
              lineHeight: summaryLineHeight,
              color: "#2b1a10",
            },
          ]}
        >
          {content.slug}
        </Text>
      ) : null}

      {content.focus ? (
        <View style={styles.summaryFocusRow}>
          <Text style={[styles.summaryFocusLabel, { fontSize: slugSize }]}>
            FOCUS
          </Text>
          <Text style={[styles.summaryFocus, { fontSize: focusSize }]}>
            {content.focus}
          </Text>
        </View>
      ) : null}

      {content.lines.map((line, index) => (
        <Text
          key={`summary-line-${index}`}
          style={[
            styles.summaryText,
            {
              fontSize: summarySize,
              lineHeight: summaryLineHeight,
              color: "#2b1a10",
            },
          ]}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryPanel: {
    position: "relative",
    borderWidth: 1,
    overflow: "visible",
  },
  summaryTape: {
    position: "absolute",
    top: -18,
    width: 84,
    height: 22,
    backgroundColor: "rgba(248, 230, 190, 0.9)",
    borderRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  summaryTapeLeft: {
    left: "18%",
    transform: [{ rotate: "-6deg" }],
  },
  summaryTapeRight: {
    right: "18%",
    transform: [{ rotate: "7deg" }],
  },
  summaryText: {
    fontFamily: FONTS.primary,
    fontStyle: "italic",
  },
  summaryFocusRow: {
    alignSelf: "flex-start",
    gap: 2,
  },
  summaryFocusLabel: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.6,
    color: "rgba(66, 40, 18, 0.6)",
  },
  summaryFocus: {
    fontFamily: FONTS.primarySemiBold,
    fontStyle: "italic",
    letterSpacing: 1.4,
    color: "#3a2416",
    textTransform: "uppercase",
  },
});
