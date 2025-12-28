import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Vibration,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import TypewriterText from "./TypewriterText";
import { FONTS, FONT_SIZES } from "../constants/typography";
import { SPACING, RADIUS } from "../constants/layout";
import useResponsiveLayout from "../hooks/useResponsiveLayout";

/**
 * BranchingNarrativeReader - Interactive story component with choices and tappable details
 *
 * Structure:
 * - Opening segment (shared)
 * - First choice (3 options)
 * - Middle segment (based on first choice)
 * - Second choice (3 options)
 * - Ending segment (based on both choices)
 *
 * Features:
 * - Typewriter text effect
 * - Tappable detail phrases that reveal Jack's observations
 * - Choice buttons with smooth transitions
 * - Evidence collection from details
 */

// Segment states
const SEGMENT_STATES = {
  HIDDEN: 'hidden',
  TYPING: 'typing',
  COMPLETE: 'complete',
};

// Tappable detail component
const TappableDetail = React.memo(function TappableDetail({
  phrase,
  note,
  evidenceCard,
  onTap,
  isRevealed,
  palette,
  textStyle,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Subtle pulse animation for unrevealed details
  useEffect(() => {
    if (!isRevealed) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isRevealed, glowAnim]);

  const handlePress = useCallback(() => {
    if (isRevealed) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    onTap({ phrase, note, evidenceCard });
  }, [isRevealed, phrase, note, evidenceCard, onTap, scaleAnim]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable onPress={handlePress} disabled={isRevealed}>
        <Animated.Text
          style={[
            textStyle,
            styles.tappableText,
            isRevealed && styles.tappableTextRevealed,
            !isRevealed && {
              textDecorationLine: 'underline',
              textDecorationStyle: 'dotted',
            },
          ]}
        >
          {phrase}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
});

// Observation popup when detail is tapped
const ObservationPopup = React.memo(function ObservationPopup({
  detail,
  onDismiss,
  palette,
}) {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const { moderateScale, scaleSpacing, scaleRadius } = useResponsiveLayout();

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 100, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 50, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(onDismiss);
  }, [onDismiss, slideAnim, opacityAnim]);

  return (
    <Pressable style={styles.popupOverlay} onPress={handleDismiss}>
      <Animated.View
        style={[
          styles.observationPopup,
          {
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
            borderRadius: scaleRadius(RADIUS.lg),
            padding: scaleSpacing(SPACING.md),
          },
        ]}
      >
        <Text style={[styles.observationNote, { fontSize: moderateScale(FONT_SIZES.sm) }]}>
          {detail.note}
        </Text>
        {detail.evidenceCard && (
          <View style={styles.evidenceCardBadge}>
            <Text style={styles.evidenceCardText}>📄 {detail.evidenceCard}</Text>
          </View>
        )}
        <Text style={styles.tapToDismiss}>Tap to continue</Text>
      </Animated.View>
    </Pressable>
  );
});

// Choice button component
const ChoiceButton = React.memo(function ChoiceButton({
  option,
  onSelect,
  isSelected,
  isDisabled,
  index,
  palette,
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const { moderateScale, scaleSpacing, scaleRadius, sizeClass } = useResponsiveLayout();
  const compact = sizeClass === 'xsmall' || sizeClass === 'small';

  useEffect(() => {
    // Stagger animation for buttons appearing
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [index]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onSelect(option);
  }, [option, onSelect]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={({ pressed }) => [
          styles.choiceButton,
          {
            borderRadius: scaleRadius(RADIUS.md),
            paddingVertical: scaleSpacing(compact ? SPACING.sm : SPACING.md),
            paddingHorizontal: scaleSpacing(SPACING.md),
            opacity: isDisabled ? 0.5 : 1,
          },
          pressed && styles.choiceButtonPressed,
          isSelected && styles.choiceButtonSelected,
        ]}
        onPress={handlePress}
        disabled={isDisabled}
      >
        <Text
          style={[
            styles.choiceLabel,
            { fontSize: moderateScale(compact ? FONT_SIZES.sm : FONT_SIZES.md) },
            isSelected && styles.choiceLabelSelected,
          ]}
        >
          {option.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

// Choice prompt component
const ChoicePrompt = React.memo(function ChoicePrompt({
  prompt,
  options,
  onSelect,
  selectedKey,
  palette,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { moderateScale, scaleSpacing } = useResponsiveLayout();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.choicePromptContainer, { opacity: fadeAnim }]}>
      <Text style={[styles.choicePromptText, { fontSize: moderateScale(FONT_SIZES.sm) }]}>
        {prompt}
      </Text>
      <View style={[styles.choiceButtonsRow, { gap: scaleSpacing(SPACING.sm) }]}>
        {options.map((option, index) => (
          <ChoiceButton
            key={option.key}
            option={option}
            onSelect={onSelect}
            isSelected={selectedKey === option.key}
            isDisabled={selectedKey && selectedKey !== option.key}
            index={index}
            palette={palette}
          />
        ))}
      </View>
    </Animated.View>
  );
});

// Narrative segment with typewriter effect and tappable details
const NarrativeSegment = React.memo(function NarrativeSegment({
  text,
  details = [],
  state,
  onComplete,
  onDetailTap,
  revealedDetails,
  palette,
}) {
  const { moderateScale, sizeClass } = useResponsiveLayout();
  const compact = sizeClass === 'xsmall' || sizeClass === 'small';
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const narrativeSize = moderateScale(FONT_SIZES.md);
  const narrativeLineHeight = Math.round(narrativeSize * (compact ? 1.6 : 1.8));

  useEffect(() => {
    if (state !== SEGMENT_STATES.HIDDEN) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [state]);

  const textStyle = useMemo(() => ({
    fontSize: narrativeSize,
    lineHeight: narrativeLineHeight,
    fontFamily: FONTS.mono,
    color: "#2b1a10",
  }), [narrativeSize, narrativeLineHeight]);

  // Parse text to find and wrap tappable details
  const renderTextWithDetails = useMemo(() => {
    if (!details || details.length === 0) {
      return text;
    }

    // For now, just return plain text - detail highlighting would require
    // more complex text parsing. The details are shown as separate tappable areas.
    return text;
  }, [text, details]);

  if (state === SEGMENT_STATES.HIDDEN) {
    return null;
  }

  return (
    <Animated.View style={[styles.segmentContainer, { opacity: fadeAnim }]}>
      <TypewriterText
        text={renderTextWithDetails}
        speed={8}
        delay={100}
        isActive={state === SEGMENT_STATES.TYPING}
        isFinished={state === SEGMENT_STATES.COMPLETE}
        onComplete={onComplete}
        style={textStyle}
      />

      {/* Tappable details shown below the text */}
      {state === SEGMENT_STATES.COMPLETE && details.length > 0 && (
        <View style={styles.detailsContainer}>
          {details.map((detail, index) => (
            <TappableDetail
              key={`detail-${index}`}
              phrase={detail.phrase}
              note={detail.note}
              evidenceCard={detail.evidenceCard}
              onTap={onDetailTap}
              isRevealed={revealedDetails.has(detail.phrase)}
              palette={palette}
              textStyle={textStyle}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
});

/**
 * Main BranchingNarrativeReader component
 */
export default function BranchingNarrativeReader({
  branchingNarrative,
  palette,
  onComplete,
  onFirstChoice, // TRUE INFINITE BRANCHING: Called when player makes first choice (for prefetching)
  onEvidenceCollected,
  style,
}) {
  const { sizeClass, moderateScale, scaleSpacing, scaleRadius } = useResponsiveLayout();
  const compact = sizeClass === 'xsmall' || sizeClass === 'small';
  const scrollRef = useRef(null);

  // State for tracking progress through the branching narrative
  const [openingState, setOpeningState] = useState(SEGMENT_STATES.TYPING);
  const [firstChoiceMade, setFirstChoiceMade] = useState(null);
  const [middleState, setMiddleState] = useState(SEGMENT_STATES.HIDDEN);
  const [secondChoiceMade, setSecondChoiceMade] = useState(null);
  const [endingState, setEndingState] = useState(SEGMENT_STATES.HIDDEN);

  // Track revealed details and collected evidence
  const [revealedDetails, setRevealedDetails] = useState(new Set());
  const [collectedEvidence, setCollectedEvidence] = useState([]);
  const [activePopup, setActivePopup] = useState(null);

  // Get current segments based on choices
  const currentMiddleSegment = useMemo(() => {
    if (!firstChoiceMade || !branchingNarrative?.firstChoice?.options) return null;
    return branchingNarrative.firstChoice.options.find(o => o.key === firstChoiceMade);
  }, [firstChoiceMade, branchingNarrative]);

  const currentSecondChoice = useMemo(() => {
    if (!firstChoiceMade || !branchingNarrative?.secondChoices) return null;
    return branchingNarrative.secondChoices.find(sc => sc.afterChoice === firstChoiceMade);
  }, [firstChoiceMade, branchingNarrative]);

  const currentEndingSegment = useMemo(() => {
    if (!secondChoiceMade || !currentSecondChoice?.options) return null;
    return currentSecondChoice.options.find(o => o.key === secondChoiceMade);
  }, [secondChoiceMade, currentSecondChoice]);

  // Handle opening complete
  const handleOpeningComplete = useCallback(() => {
    setOpeningState(SEGMENT_STATES.COMPLETE);
  }, []);

  // Handle first choice selection
  const handleFirstChoice = useCallback((option) => {
    setFirstChoiceMade(option.key);
    setMiddleState(SEGMENT_STATES.TYPING);

    // TRUE INFINITE BRANCHING: Notify parent of first choice for prefetching
    // This allows generating the 3 possible second-choice paths while player reads
    if (onFirstChoice) {
      onFirstChoice(option.key);
    }

    // Scroll to show new content
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [onFirstChoice]);

  // Handle middle segment complete
  const handleMiddleComplete = useCallback(() => {
    setMiddleState(SEGMENT_STATES.COMPLETE);
  }, []);

  // Handle second choice selection
  const handleSecondChoice = useCallback((option) => {
    setSecondChoiceMade(option.key);
    setEndingState(SEGMENT_STATES.TYPING);

    // Scroll to show new content
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Handle ending complete
  const handleEndingComplete = useCallback(() => {
    setEndingState(SEGMENT_STATES.COMPLETE);
    onComplete?.({
      path: `${firstChoiceMade}-${secondChoiceMade}`,
      evidence: collectedEvidence,
    });
  }, [firstChoiceMade, secondChoiceMade, collectedEvidence, onComplete]);

  // Handle detail tap
  const handleDetailTap = useCallback((detail) => {
    setActivePopup(detail);
    setRevealedDetails(prev => new Set(prev).add(detail.phrase));

    if (detail.evidenceCard) {
      const newEvidence = {
        label: detail.evidenceCard,
        phrase: detail.phrase,
        note: detail.note,
      };
      setCollectedEvidence(prev => [...prev, newEvidence]);
      onEvidenceCollected?.(newEvidence);
    }
  }, [onEvidenceCollected]);

  // Handle popup dismiss
  const handlePopupDismiss = useCallback(() => {
    setActivePopup(null);
  }, []);

  if (!branchingNarrative) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>No narrative content available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { padding: scaleSpacing(compact ? SPACING.sm : SPACING.md) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Opening Segment */}
        <NarrativeSegment
          text={branchingNarrative.opening?.text || ''}
          details={branchingNarrative.opening?.details || []}
          state={openingState}
          onComplete={handleOpeningComplete}
          onDetailTap={handleDetailTap}
          revealedDetails={revealedDetails}
          palette={palette}
        />

        {/* First Choice */}
        {openingState === SEGMENT_STATES.COMPLETE && !firstChoiceMade && (
          <ChoicePrompt
            prompt={branchingNarrative.firstChoice?.prompt || "What does Jack do?"}
            options={branchingNarrative.firstChoice?.options || []}
            onSelect={handleFirstChoice}
            selectedKey={firstChoiceMade}
            palette={palette}
          />
        )}

        {/* Middle Segment (after first choice) */}
        {currentMiddleSegment && (
          <NarrativeSegment
            text={currentMiddleSegment.response}
            details={currentMiddleSegment.details || []}
            state={middleState}
            onComplete={handleMiddleComplete}
            onDetailTap={handleDetailTap}
            revealedDetails={revealedDetails}
            palette={palette}
          />
        )}

        {/* Second Choice */}
        {middleState === SEGMENT_STATES.COMPLETE && !secondChoiceMade && currentSecondChoice && (
          <ChoicePrompt
            prompt={currentSecondChoice.prompt || "What does Jack focus on?"}
            options={currentSecondChoice.options || []}
            onSelect={handleSecondChoice}
            selectedKey={secondChoiceMade}
            palette={palette}
          />
        )}

        {/* Ending Segment (after second choice) */}
        {currentEndingSegment && (
          <NarrativeSegment
            text={currentEndingSegment.response}
            details={currentEndingSegment.details || []}
            state={endingState}
            onComplete={handleEndingComplete}
            onDetailTap={handleDetailTap}
            revealedDetails={revealedDetails}
            palette={palette}
          />
        )}

        {/* Evidence tray */}
        {collectedEvidence.length > 0 && (
          <View style={[styles.evidenceTray, { marginTop: scaleSpacing(SPACING.lg) }]}>
            <Text style={styles.evidenceTrayLabel}>EVIDENCE COLLECTED</Text>
            <View style={styles.evidenceCards}>
              {collectedEvidence.map((evidence, index) => (
                <View key={index} style={styles.evidenceCard}>
                  <Text style={styles.evidenceCardLabel}>{evidence.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Observation Popup */}
      {activePopup && (
        <ObservationPopup
          detail={activePopup}
          onDismiss={handlePopupDismiss}
          palette={palette}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf8f3',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  segmentContainer: {
    marginBottom: 16,
  },
  detailsContainer: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tappableText: {
    backgroundColor: 'rgba(139, 90, 43, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tappableTextRevealed: {
    backgroundColor: 'rgba(139, 90, 43, 0.25)',
    textDecorationLine: 'none',
  },
  choicePromptContainer: {
    marginVertical: 24,
    alignItems: 'center',
  },
  choicePromptText: {
    fontFamily: FONTS.primarySemiBold,
    color: '#5a3c26',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  choiceButtonsRow: {
    flexDirection: 'column',
    width: '100%',
  },
  choiceButton: {
    backgroundColor: '#1a120b',
    borderWidth: 2,
    borderColor: '#3a2515',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  choiceButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  choiceButtonSelected: {
    backgroundColor: '#8a2a22',
    borderColor: '#5a1a15',
  },
  choiceLabel: {
    fontFamily: FONTS.monoBold,
    color: '#f8d8a8',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  choiceLabelSelected: {
    color: '#fff',
  },
  popupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  observationPopup: {
    backgroundColor: '#1a120b',
    borderWidth: 2,
    borderColor: '#3a2515',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  observationNote: {
    fontFamily: FONTS.primary,
    fontStyle: 'italic',
    color: '#f8d8a8',
    lineHeight: 24,
    marginBottom: 12,
  },
  evidenceCardBadge: {
    backgroundColor: '#8a2a22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  evidenceCardText: {
    fontFamily: FONTS.monoBold,
    color: '#fff',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tapToDismiss: {
    fontFamily: FONTS.mono,
    color: '#8a6a4b',
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  evidenceTray: {
    backgroundColor: 'rgba(26, 18, 11, 0.9)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3a2515',
  },
  evidenceTrayLabel: {
    fontFamily: FONTS.monoBold,
    color: '#8a6a4b',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  evidenceCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  evidenceCard: {
    backgroundColor: '#f8d8a8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  evidenceCardLabel: {
    fontFamily: FONTS.monoBold,
    color: '#1a120b',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorText: {
    fontFamily: FONTS.mono,
    color: '#8a6a4b',
    textAlign: 'center',
    padding: 24,
  },
});
