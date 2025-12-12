import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
// import ConfettiCannon from "react-native-confetti-cannon"; // REMOVED: Too festive/cheap
import SolvedStampAnimation from '../SolvedStampAnimation'; // Reusing/referencing logic from here for "Case Closed" feel

import DecisionDossier from "../DecisionDossier";
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { SPACING, RADIUS } from '../../constants/layout';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';

const FONT_TWEAK_FACTOR = 0.95;
const shrinkFont = (value) => Math.max(10, Math.floor(value * FONT_TWEAK_FACTOR));

export default function DecisionPanel({
  palette,
  compact,
  showDecisionPanel,
  showDecisionOptions,
  storyDecision,
  decisionOptions,
  choiceStatusText,
  choiceStatusSubtext,
  handleSelectOption,
  handleConfirmOption,
  resolvedSelectionKey,
  lockedDecisionMeta,
  summaryOptionDetails,
  choiceToast,
  celebrationActive,
  setCelebrationActive,
  hasLockedDecision,
  lockCelebrationOpacity,
  lockCelebrationScale,
  lockedDecisionTimestamp,
}) {
  const { moderateScale, scaleSpacing, scaleRadius } = useResponsiveLayout();
  
  const decisionSectionRef = useRef(null);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: -10, y: 0 });

  // Layout Constants
  const blockRadius = scaleRadius(RADIUS.lg);
  const summarySize = shrinkFont(moderateScale(compact ? FONT_SIZES.sm : FONT_SIZES.md));
  const narrativeSize = shrinkFont(moderateScale(FONT_SIZES.md));
  const slugSize = shrinkFont(moderateScale(FONT_SIZES.xs));

  const updateConfettiOrigin = useCallback(() => {
    if (decisionSectionRef.current && decisionSectionRef.current.measureInWindow) {
      decisionSectionRef.current.measureInWindow((x, y, width, height) => {
        setConfettiOrigin({
          x: x + width / 2,
          y: y + height * 0.1,
        });
      });
    }
  }, []);

  const handleLayout = useCallback(() => {
    requestAnimationFrame(updateConfettiOrigin);
  }, [updateConfettiOrigin]);

  if (!showDecisionPanel) return null;

  return (
    <View
      ref={decisionSectionRef}
      onLayout={handleLayout}
      style={[
        styles.decisionSection,
        {
          borderRadius: blockRadius,
          borderColor: palette.border,
          padding: scaleSpacing(SPACING.lg),
          gap: scaleSpacing(SPACING.md),
        },
      ]}
    >
      <View style={styles.decisionHeaderRow}>
        <View style={styles.decisionHeaderText}>
          <Text style={[styles.decisionTitle, { fontSize: summarySize, color: palette.accent }]}>
            Branch Divergence
          </Text>
          <Text style={[styles.decisionSubtitle, { color: palette.highlightText, fontSize: narrativeSize }]}>
            {choiceStatusText}
          </Text>
        </View>
      </View>

      {choiceStatusSubtext ? (
        <Text style={[styles.decisionStatusHelper, { color: palette.badgeText, fontSize: slugSize }]}>
          {choiceStatusSubtext}
        </Text>
      ) : null}

      {showDecisionOptions && Array.isArray(storyDecision?.intro) && storyDecision.intro.length ? (
        <View
          style={[
            styles.decisionIntroCard,
            {
              borderRadius: blockRadius,
              borderColor: palette.border,
              padding: scaleSpacing(SPACING.sm),
              gap: scaleSpacing(SPACING.xs),
            },
          ]}
        >
          {storyDecision?.intro.map((line, index) => (
            <Text
              key={`decision-intro-${index}`}
              style={[styles.decisionIntro, { fontSize: narrativeSize, color: palette.badgeText }]}
            >
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {showDecisionOptions && decisionOptions.length ? (
        <View style={[styles.decisionOptionGrid, { gap: scaleSpacing(SPACING.md) }]}>
          {decisionOptions.map((option, index) => (
            <DecisionDossier
              key={option.key}
              option={option}
              index={index}
              isSelected={resolvedSelectionKey === option.key}
              isLocked={!!lockedDecisionMeta}
              onSelect={() => handleSelectOption(option)}
              onConfirm={handleConfirmOption}
            />
          ))}
        </View>
      ) : null}

      {hasLockedDecision && lockedDecisionMeta ? (
        <Animated.View
          style={[
            styles.lockedDecisionCard,
            {
              borderRadius: blockRadius,
              borderColor: palette.accent,
              opacity: lockCelebrationOpacity,
              transform: [{ scale: lockCelebrationScale }],
            },
          ]}
        >
          <View pointerEvents="none" style={[styles.lockedDecisionGlow, { borderRadius: blockRadius }]} />
          <Text style={[styles.lockedDecisionLabel, { color: palette.accent, fontSize: slugSize }]}>
            Path Locked
          </Text>
          <Text style={[styles.lockedDecisionTitle, { color: palette.highlightText, fontSize: narrativeSize }]}>
            {`Option ${lockedDecisionMeta.optionKey} · ${summaryOptionDetails?.title || "Branch confirmed"}`}
          </Text>
          <View style={styles.lockedDecisionMetaRow}>
            {lockedDecisionMeta.nextChapter ? (
              <View style={styles.lockedDecisionChip}>
                <Text style={styles.lockedDecisionChipLabel}>Next Chapter</Text>
                <Text style={styles.lockedDecisionChipValue}>{`Chapter ${lockedDecisionMeta.nextChapter}`}</Text>
              </View>
            ) : null}
            {lockedDecisionMeta.pathKey ? (
              <View style={styles.lockedDecisionChip}>
                <Text style={styles.lockedDecisionChipLabel}>Branch</Text>
                <Text style={styles.lockedDecisionChipValue}>{lockedDecisionMeta.pathKey}</Text>
              </View>
            ) : null}
          </View>
          {lockedDecisionTimestamp ? (
            <Text style={[styles.lockedDecisionTimestamp, { color: palette.badgeText }]}>
              {`Locked ${lockedDecisionTimestamp}`}
            </Text>
          ) : null}
          <Text style={[styles.lockedDecisionHint, { color: palette.badgeText }]}>
            Return to the desk to continue along this path.
          </Text>
        </Animated.View>
      ) : null}

      {resolvedSelectionKey && summaryOptionDetails && !hasLockedDecision ? (
        <View
          style={[
            styles.decisionSummary,
            { borderRadius: blockRadius, borderColor: palette.accent },
          ]}
        >
          <Text style={[styles.decisionSummaryLabel, { color: palette.accent }]}>Locked Path</Text>
          <Text style={[styles.decisionSummaryValue, { color: palette.highlightText }]}>
            {`Option ${resolvedSelectionKey} · ${summaryOptionDetails.title || "Recorded choice"}`}
          </Text>
        </View>
      ) : null}

      {choiceToast ? (
        <View
          style={[
            styles.decisionToast,
            { borderRadius: blockRadius, borderColor: palette.accent },
          ]}
        >
          <Text style={[styles.decisionToastLabel, { color: palette.accent }]}>Choice recorded</Text>
          <Text style={[styles.decisionToastValue, { color: palette.highlightText }]}>
            {`Option ${choiceToast.optionKey} • ${choiceToast.title}`}
          </Text>
        </View>
      ) : null}

      {celebrationActive ? (
        <View pointerEvents="none" style={styles.decisionConfettiLayer}>
           {/* REPLACEMENT: Dramatic Stamp Animation overlay */}
           <View style={styles.stampOverlay}>
              <Animated.View style={[
                  styles.stampCircle,
                  {
                      transform: [
                          { scale: lockCelebrationScale },
                          { rotate: '-12deg' }
                      ],
                      opacity: lockCelebrationOpacity
                  }
              ]}>
                  <Text style={styles.stampText}>FILED</Text>
              </Animated.View>
           </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  decisionSection: {
    position: "relative",
    borderWidth: 1,
    backgroundColor: "rgba(8, 4, 2, 0.94)",
    overflow: "hidden",
  },
  // ... existing styles ...
  stampOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', // Dim background to focus on stamp
  },
  stampCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: '#d32f2f',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    shadowColor: '#d32f2f',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  stampText: {
    fontFamily: FONTS.secondaryBold,
    fontSize: 48,
    color: '#d32f2f',
    letterSpacing: 4,
    fontWeight: '900',
  },
  decisionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  decisionHeaderText: {
    flex: 1,
    gap: 4,
  },
  decisionTitle: {
    fontFamily: FONTS.secondaryBold,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  decisionSubtitle: {
    fontFamily: FONTS.primarySemiBold,
    letterSpacing: 1,
  },
  decisionStatusHelper: {
    fontFamily: FONTS.primary,
    fontStyle: "italic",
    letterSpacing: 0.4,
  },
  decisionIntro: {
    fontFamily: FONTS.primary,
    color: "#d7c9b0",
  },
  decisionIntroCard: {
    borderWidth: 1,
    backgroundColor: "rgba(12, 6, 2, 0.72)",
  },
  decisionOptionGrid: {
    width: "100%",
  },
  decisionSummary: {
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: "rgba(10, 6, 2, 0.85)",
    gap: 2,
  },
  decisionSummaryLabel: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.4,
    fontSize: FONT_SIZES.xs,
  },
  decisionSummaryValue: {
    fontFamily: FONTS.primarySemiBold,
    fontSize: FONT_SIZES.md,
  },
  decisionToast: {
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: "rgba(255, 200, 140, 0.12)",
    gap: 2,
  },
  decisionToastLabel: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.4,
    fontSize: FONT_SIZES.xs,
  },
  decisionToastValue: {
    fontFamily: FONTS.primarySemiBold,
    fontSize: FONT_SIZES.sm,
  },
  lockedDecisionCard: {
    borderWidth: 1,
    padding: SPACING.md,
    backgroundColor: "rgba(8, 4, 2, 0.92)",
    overflow: "hidden",
    gap: SPACING.sm,
  },
  lockedDecisionGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
    backgroundColor: "rgba(255, 214, 170, 0.5)",
  },
  lockedDecisionLabel: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  lockedDecisionTitle: {
    fontFamily: FONTS.secondaryBold,
    letterSpacing: 1.6,
  },
  lockedDecisionMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  lockedDecisionChip: {
    borderWidth: 1,
    borderColor: "rgba(244, 224, 200, 0.32)",
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: "rgba(16, 10, 6, 0.78)",
    gap: 2,
  },
  lockedDecisionChipLabel: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1.1,
    color: "rgba(255, 244, 215, 0.7)",
  },
  lockedDecisionChipValue: {
    fontFamily: FONTS.primarySemiBold,
    color: "#fff5dd",
    letterSpacing: 1.3,
  },
  lockedDecisionTimestamp: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1.1,
  },
  lockedDecisionHint: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 0.8,
  },
  decisionConfettiLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
});
