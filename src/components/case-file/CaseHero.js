import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, RADIUS } from '../../constants/layout';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';

const NOISE_TEXTURE = require("../../../assets/images/ui/backgrounds/noise-texture.png");
const FONT_TWEAK_FACTOR = 0.95;
const shrinkFont = (value) => Math.max(10, Math.floor(value * FONT_TWEAK_FACTOR));

export default function CaseHero({ activeCase, compact }) {
  const { moderateScale, scaleSpacing, scaleRadius } = useResponsiveLayout();
  
  // Layout Constants
  const sectionGap = scaleSpacing(compact ? SPACING.md : SPACING.lg);
  const heroLetterRadius = scaleRadius(RADIUS.xl);
  const heroLetterPaddingV = scaleSpacing(compact ? SPACING.md : SPACING.lg);
  const heroLetterPaddingH = scaleSpacing(compact ? SPACING.lg : SPACING.xl);
  const heroLetterGap = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const heroLetterDividerThickness = Math.max(1, Math.round(scaleSpacing(1)));
  const heroLetterTapeWidth = Math.max(82, Math.round(scaleSpacing(compact ? SPACING.xxl : SPACING.xxl + SPACING.sm)));
  const heroLetterTapeHeight = Math.max(20, Math.round(scaleSpacing(SPACING.sm) + 4));
  const heroLetterShadowRadius = Math.max(12, Math.round(scaleSpacing(SPACING.md)));
  const heroLetterShadowOffset = Math.max(6, Math.round(scaleSpacing(compact ? SPACING.sm : SPACING.md)));

  // Typography Constants
  const heroTitleSize = shrinkFont(moderateScale(compact ? FONT_SIZES.title : FONT_SIZES.display));
  const heroNumberSize = shrinkFont(moderateScale(FONT_SIZES.sm));
  const displayCaseNumber = activeCase?.caseNumber || "---";

  return (
    <View style={[styles.heroBlock, { gap: sectionGap }]}>
      <View style={styles.heroLetterStack}>
        <View
          pointerEvents="none"
          style={[
            styles.heroLetterShadow,
            {
              borderRadius: heroLetterRadius,
              shadowRadius: heroLetterShadowRadius,
              shadowOffset: { width: 0, height: heroLetterShadowOffset },
              transform: [{ rotate: compact ? "-0.8deg" : "-0.5deg" }],
            },
          ]}
        />
        <View
          style={[
            styles.heroLetterPaper,
            {
              borderRadius: heroLetterRadius,
              paddingHorizontal: heroLetterPaddingH,
              paddingVertical: heroLetterPaddingV,
              gap: heroLetterGap,
              transform: [{ rotate: compact ? "-0.8deg" : "-0.5deg" }],
            },
          ]}
        >
          <Image
            source={NOISE_TEXTURE}
            style={[styles.heroLetterNoise, { borderRadius: heroLetterRadius }]}
            pointerEvents="none"
          />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(255, 255, 255, 0.3)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.14 }}
            style={[styles.heroLetterSheen, { borderRadius: heroLetterRadius }]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.heroLetterTape,
              styles.heroLetterTapeLeft,
              { width: heroLetterTapeWidth, height: heroLetterTapeHeight },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.heroLetterTape,
              styles.heroLetterTapeRight,
              { width: heroLetterTapeWidth, height: heroLetterTapeHeight },
            ]}
          />

          <Text
            style={[
              styles.caseNumber,
              {
                fontSize: heroNumberSize,
                color: "#5b3a24",
                letterSpacing: compact ? 2.4 : 3.2,
              },
            ]}
          >
            {`Case File #${displayCaseNumber}`}
          </Text>
          <Text
            style={[
              styles.caseTitle,
              {
                fontSize: heroTitleSize,
                color: "#27160c",
                letterSpacing: compact ? 3 : 4.2,
                lineHeight: Math.round(heroTitleSize * (compact ? 1.08 : 1.12)),
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.45}
            lineBreakStrategyIOS="hangul-word"
          >
            {activeCase?.title}
          </Text>
          <View
            pointerEvents="none"
            style={[
              styles.heroLetterDivider,
              { height: heroLetterDividerThickness },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroBlock: {
    flexDirection: "column",
    width: "100%",
  },
  heroLetterStack: {
    width: "100%",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  heroLetterShadow: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  heroLetterPaper: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(82, 50, 28, 0.4)",
    backgroundColor: "#fcf6e8", // Warmer paper
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    overflow: "hidden",
  },
  heroLetterNoise: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  heroLetterSheen: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  heroLetterTape: {
    position: "absolute",
    top: -16,
    height: 26,
    backgroundColor: "rgba(240, 220, 190, 0.85)",
    borderRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  heroLetterTapeLeft: {
    left: "18%",
    transform: [{ rotate: "-6deg" }],
  },
  heroLetterTapeRight: {
    right: "18%",
    transform: [{ rotate: "5deg" }],
  },
  heroLetterDivider: {
    width: "100%",
    backgroundColor: "rgba(62, 40, 22, 0.3)",
    opacity: 0.9,
  },
  caseNumber: {
    fontFamily: FONTS.monoBold,
    textTransform: "uppercase",
  },
  caseTitle: {
    fontFamily: FONTS.secondaryBold,
    textTransform: "uppercase",
  },
});
