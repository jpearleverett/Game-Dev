import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import TypewriterText from "./TypewriterText";
import { FONTS, FONT_SIZES } from "../constants/typography";
import { SPACING, RADIUS } from "../constants/layout";
import useResponsiveLayout from "../hooks/useResponsiveLayout";
import { paginateNarrativeSegments, calculatePaginationParams } from "../utils/textPagination";

// Noir/Detective paper texture background
const CASE_FILE_BG = require("../../assets/images/ui/backgrounds/case-file-bg.jpg");

// Noir aesthetic constants - "Dirty Typewriter" look
const NOIR_TYPOGRAPHY = {
  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  color: '#1a1a1a',
  fontSize: 14,
  lineHeight: 22,
  textShadowColor: 'rgba(0, 0, 0, 0.25)',
  textShadowOffset: { width: 0.5, height: 0.5 },
  textShadowRadius: 1,
};

// Heavy internal padding for paper margins
const NOIR_PADDING = {
  horizontal: 32,
  vertical: 48,
};

// Page types for the paginated narrative
const PAGE_TYPES = {
  NARRATIVE: 'narrative',
  CHOICE: 'choice',
};

/**
 * BranchingNarrativeReader - Paginated interactive story with choices
 *
 * Now uses fixed-height pages to prevent the background from resizing.
 * Structure:
 * - Opening pages (paginated text)
 * - First choice page
 * - Middle pages (paginated text based on first choice)
 * - Second choice page
 * - Ending pages (paginated text based on both choices)
 */

// Inline tappable phrase component
const InlineTappablePhrase = React.memo(function InlineTappablePhrase({
  phrase,
  note,
  evidenceCard,
  onTap,
  isRevealed,
}) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(
      isRevealed ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
    );
    onTap({ phrase, note, evidenceCard, isRevealed });
  }, [isRevealed, phrase, note, evidenceCard, onTap]);

  return (
    <Text
      onPress={handlePress}
      style={[
        styles.inlineTappable,
        isRevealed ? styles.inlineTappableRevealed : styles.inlineTappableUnrevealed,
      ]}
    >
      {phrase}
    </Text>
  );
});

// Parse narrative text for tappable phrases
function parseTextWithDetails(text, details) {
  if (!details || details.length === 0) {
    return [{ type: 'text', content: text }];
  }

  const phrasePositions = [];
  for (const detail of details) {
    const lowerText = text.toLowerCase();
    const lowerPhrase = detail.phrase.toLowerCase();
    let startIndex = 0;

    while (true) {
      const pos = lowerText.indexOf(lowerPhrase, startIndex);
      if (pos === -1) break;
      phrasePositions.push({
        start: pos,
        end: pos + detail.phrase.length,
        detail: detail,
        actualPhrase: text.substring(pos, pos + detail.phrase.length),
      });
      startIndex = pos + 1;
    }
  }

  phrasePositions.sort((a, b) => a.start - b.start);

  const filtered = [];
  let lastEnd = 0;
  for (const pos of phrasePositions) {
    if (pos.start >= lastEnd) {
      filtered.push(pos);
      lastEnd = pos.end;
    }
  }

  const segments = [];
  let currentPos = 0;

  for (const pos of filtered) {
    if (pos.start > currentPos) {
      segments.push({ type: 'text', content: text.substring(currentPos, pos.start) });
    }
    segments.push({ type: 'tappable', content: pos.actualPhrase, detail: pos.detail });
    currentPos = pos.end;
  }

  if (currentPos < text.length) {
    segments.push({ type: 'text', content: text.substring(currentPos) });
  }

  return segments;
}

// Render narrative text with inline tappable phrases
const NarrativeTextWithDetails = React.memo(function NarrativeTextWithDetails({
  text,
  details,
  onDetailTap,
  revealedDetails,
  textStyle,
}) {
  const segments = useMemo(() => parseTextWithDetails(text, details), [text, details]);

  return (
    <Text style={textStyle}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <Text key={index}>{segment.content}</Text>;
        } else {
          return (
            <InlineTappablePhrase
              key={index}
              phrase={segment.content}
              note={segment.detail.note}
              evidenceCard={segment.detail.evidenceCard}
              onTap={onDetailTap}
              isRevealed={revealedDetails.has(segment.detail.phrase)}
            />
          );
        }
      })}
    </Text>
  );
});

// Observation popup
const ObservationPopup = React.memo(function ObservationPopup({
  detail,
  onDismiss,
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
    <Modal visible={true} transparent={true} animationType="none" statusBarTranslucent={true} onRequestClose={handleDismiss}>
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
    </Modal>
  );
});

// Choice button component
const ChoiceButton = React.memo(function ChoiceButton({
  option,
  onSelect,
  isSelected,
  isDisabled,
  index,
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const { moderateScale, scaleSpacing, scaleRadius, sizeClass } = useResponsiveLayout();
  const compact = sizeClass === 'xsmall' || sizeClass === 'small';

  useEffect(() => {
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

// Pulsing arrow for page navigation cue
const PulsingArrow = React.memo(function PulsingArrow() {
  const opacity = useRef(new Animated.Value(0.2)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration: 800, useNativeDriver: true })
      ])
    );
    loopRef.current.start();

    return () => {
      if (loopRef.current) loopRef.current.stop();
      opacity.stopAnimation();
    };
  }, [opacity]);

  return (
    <Animated.Text style={[styles.nextPageCue, { opacity }]}>
      &gt;&gt;
    </Animated.Text>
  );
});

/**
 * Main BranchingNarrativeReader component
 */
export default function BranchingNarrativeReader({
  branchingNarrative,
  palette,
  onComplete,
  onFirstChoice,
  onEvidenceCollected,
  style,
}) {
  const { width: screenWidth, sizeClass, moderateScale, scaleSpacing, scaleRadius } = useResponsiveLayout();
  const compact = sizeClass === 'xsmall' || sizeClass === 'small';

  // Refs
  const listRef = useRef(null);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const flipLockRef = useRef(false);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 });

  // State
  const [containerWidth, setContainerWidth] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [completedPages, setCompletedPages] = useState(new Set());
  const [firstChoiceMade, setFirstChoiceMade] = useState(null);
  const [secondChoiceMade, setSecondChoiceMade] = useState(null);
  const [revealedDetails, setRevealedDetails] = useState(new Set());
  const [collectedEvidence, setCollectedEvidence] = useState([]);
  const [activePopup, setActivePopup] = useState(null);

  // Layout constants
  const blockRadius = scaleRadius(RADIUS.lg);
  const sectionPaddingH = scaleSpacing(compact ? SPACING.xs : SPACING.sm);
  const sectionPaddingV = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const pageGap = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const arrowSize = Math.max(40, Math.round(scaleSpacing(compact ? SPACING.xl : SPACING.xxl)));
  const arrowFontSize = Math.round(arrowSize * 0.48);
  const pageHeight = Math.round(moderateScale(compact ? 450 : 540));

  const handleLayout = useCallback((event) => {
    const { width } = event.nativeEvent.layout;
    if (width && Math.abs(width - containerWidth) > 2) {
      setContainerWidth(width);
    }
  }, [containerWidth]);

  const pageWidth = useMemo(() => {
    if (!containerWidth) return 0;
    const w = containerWidth - sectionPaddingH * 2;
    return w > 0 ? w : 0;
  }, [containerWidth, sectionPaddingH]);

  // Pagination parameters
  const paginationParams = useMemo(() => calculatePaginationParams({
    pageHeight,
    pageWidth: pageWidth || 300,
    fontSize: NOIR_TYPOGRAPHY.fontSize,
    lineHeight: NOIR_TYPOGRAPHY.lineHeight,
    verticalPadding: NOIR_PADDING.vertical * 2,
    labelHeight: 24,
    bottomReserved: scaleSpacing(SPACING.lg) + 36,
  }), [pageHeight, pageWidth, scaleSpacing]);

  // Normalize path key
  const normalizePathKey = useCallback((firstKey, secondKey) => {
    const fk = String(firstKey || '').trim();
    const sk = String(secondKey || '').trim();
    if (!fk || !sk) return sk || fk || null;
    if (/^1[ABC]-2[ABC]$/i.test(sk)) return sk.toUpperCase();
    if (/^2[ABC]$/i.test(sk) && /^1[ABC]$/i.test(fk)) return `${fk.toUpperCase()}-${sk.toUpperCase()}`;
    return sk.toUpperCase();
  }, []);

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
    return currentSecondChoice.options.find((o) => {
      const normalized = normalizePathKey(firstChoiceMade, o?.key);
      return normalized === secondChoiceMade;
    }) || null;
  }, [secondChoiceMade, currentSecondChoice, firstChoiceMade, normalizePathKey]);

  // Build paginated pages array
  const pages = useMemo(() => {
    if (!branchingNarrative) return [];

    const result = [];
    let pageIndex = 0;

    // Opening pages
    const openingText = branchingNarrative.opening?.text || '';
    const openingDetails = branchingNarrative.opening?.details || [];
    const openingPages = paginateNarrativeSegments([openingText], paginationParams);

    openingPages.forEach((page, idx) => {
      result.push({
        key: `opening-${idx}`,
        type: PAGE_TYPES.NARRATIVE,
        segment: 'opening',
        text: page.text,
        details: openingDetails,
        isLastOfSegment: idx === openingPages.length - 1,
        globalIndex: pageIndex++,
      });
    });

    // First choice page (only if opening is complete and no choice made)
    if (!firstChoiceMade) {
      result.push({
        key: 'first-choice',
        type: PAGE_TYPES.CHOICE,
        segment: 'firstChoice',
        prompt: branchingNarrative.firstChoice?.prompt || "What does Jack do?",
        options: branchingNarrative.firstChoice?.options || [],
        globalIndex: pageIndex++,
      });
    } else {
      // Middle pages (based on first choice)
      if (currentMiddleSegment) {
        const middleText = currentMiddleSegment.response || '';
        const middleDetails = currentMiddleSegment.details || [];
        const middlePages = paginateNarrativeSegments([middleText], paginationParams);

        middlePages.forEach((page, idx) => {
          result.push({
            key: `middle-${idx}`,
            type: PAGE_TYPES.NARRATIVE,
            segment: 'middle',
            text: page.text,
            details: middleDetails,
            isLastOfSegment: idx === middlePages.length - 1,
            globalIndex: pageIndex++,
          });
        });
      }

      // Second choice page (only if middle is complete and no second choice made)
      if (!secondChoiceMade && currentSecondChoice) {
        result.push({
          key: 'second-choice',
          type: PAGE_TYPES.CHOICE,
          segment: 'secondChoice',
          prompt: currentSecondChoice.prompt || "What does Jack focus on?",
          options: currentSecondChoice.options || [],
          globalIndex: pageIndex++,
        });
      } else if (secondChoiceMade && currentEndingSegment) {
        // Ending pages (based on both choices)
        const endingText = currentEndingSegment.response || '';
        const endingDetails = currentEndingSegment.details || [];
        const endingPages = paginateNarrativeSegments([endingText], paginationParams);

        endingPages.forEach((page, idx) => {
          result.push({
            key: `ending-${idx}`,
            type: PAGE_TYPES.NARRATIVE,
            segment: 'ending',
            text: page.text,
            details: endingDetails,
            isLastOfSegment: idx === endingPages.length - 1,
            isLastPage: idx === endingPages.length - 1,
            globalIndex: pageIndex++,
          });
        });
      }
    }

    return result;
  }, [branchingNarrative, firstChoiceMade, secondChoiceMade, currentMiddleSegment, currentSecondChoice, currentEndingSegment, paginationParams]);

  // Handle first choice
  const handleFirstChoice = useCallback((option) => {
    setFirstChoiceMade(option.key);
    if (onFirstChoice) {
      onFirstChoice(option.key);
    }
    // Navigate to next page after choice
    setTimeout(() => {
      if (listRef.current) {
        const nextIndex = activePage + 1;
        listRef.current.scrollToIndex({ index: Math.min(nextIndex, pages.length - 1), animated: true });
      }
    }, 300);
  }, [onFirstChoice, activePage, pages.length]);

  // Handle second choice
  const handleSecondChoice = useCallback((option) => {
    const normalized = normalizePathKey(firstChoiceMade, option.key);
    setSecondChoiceMade(normalized);
    // Navigate to next page after choice
    setTimeout(() => {
      if (listRef.current) {
        const nextIndex = activePage + 1;
        listRef.current.scrollToIndex({ index: Math.min(nextIndex, pages.length - 1), animated: true });
      }
    }, 300);
  }, [firstChoiceMade, normalizePathKey, activePage, pages.length]);

  // Handle narrative complete (when reaching last page of ending)
  const onCompleteCalledRef = useRef(false);
  useEffect(() => {
    if (
      onComplete &&
      !onCompleteCalledRef.current &&
      pages.length > 0 &&
      secondChoiceMade
    ) {
      const lastPage = pages[pages.length - 1];
      if (lastPage?.isLastPage && completedPages.has(lastPage.globalIndex)) {
        onCompleteCalledRef.current = true;
        onComplete({
          path: secondChoiceMade,
          firstChoice: firstChoiceMade,
          secondChoice: secondChoiceMade,
          evidence: collectedEvidence,
        });
      }
    }
  }, [pages, completedPages, secondChoiceMade, firstChoiceMade, collectedEvidence, onComplete]);

  // Handle detail tap
  const handleDetailTap = useCallback((detail) => {
    setActivePopup(detail);
    if (!detail.isRevealed) {
      setRevealedDetails(prev => new Set(prev).add(detail.phrase));
      if (detail.evidenceCard) {
        const newEvidence = { label: detail.evidenceCard, phrase: detail.phrase, note: detail.note };
        setCollectedEvidence(prev => [...prev, newEvidence]);
        onEvidenceCollected?.(newEvidence);
      }
    }
  }, [onEvidenceCollected]);

  // Handle popup dismiss
  const handlePopupDismiss = useCallback(() => {
    setActivePopup(null);
  }, []);

  // Page flip animation
  const triggerPageFlip = useCallback((direction) => {
    if (!direction || flipLockRef.current) return;
    const targetIndex = activePage + direction;
    if (targetIndex < 0 || targetIndex > pages.length - 1) return;

    flipLockRef.current = true;
    flipAnim.setValue(0);

    Animated.sequence([
      Animated.timing(flipAnim, {
        toValue: direction > 0 ? -1 : 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      flipLockRef.current = false;
    });

    if (listRef.current) {
      try {
        listRef.current.scrollToIndex({ index: targetIndex, animated: true });
      } catch (e) {
        if (pageWidth) {
          listRef.current.scrollToOffset({ offset: targetIndex * (pageWidth + pageGap), animated: true });
        }
      }
    }
    setActivePage(targetIndex);
  }, [activePage, pages.length, flipAnim, pageWidth, pageGap]);

  const flipRotation = flipAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["6deg", "0deg", "-6deg"],
  });

  const perspective = Math.max(620, Math.round((pageWidth || scaleSpacing(SPACING.xl)) * 1.6));

  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length) {
      const nextIndex = viewableItems[0]?.index ?? 0;
      if (typeof nextIndex === "number") {
        setActivePage(nextIndex);
      }
    }
  });

  // Render individual page
  const renderItem = useCallback(({ item, index }) => {
    const isLastPage = index === pages.length - 1;
    const isActive = index === activePage;
    const isPageCompleted = completedPages.has(item.globalIndex);

    // For choice pages, check if preceding narrative segment is complete
    const canShowChoice = item.type === PAGE_TYPES.CHOICE && (
      index === 0 || completedPages.has(pages[index - 1]?.globalIndex)
    );

    return (
      <View
        style={[
          styles.page,
          {
            width: pageWidth || "100%",
            height: pageHeight,
            borderRadius: blockRadius,
            marginRight: isLastPage ? 0 : pageGap,
          },
        ]}
      >
        <ImageBackground
          source={CASE_FILE_BG}
          resizeMode="cover"
          style={styles.pageBackground}
          imageStyle={{ borderRadius: blockRadius }}
        >
          {/* Light overlay to brighten the paper texture */}
          <View
            style={[styles.lightenOverlay, { borderRadius: blockRadius }]}
            pointerEvents="none"
          />
          {/* Subtle gradient for text readability at bottom */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.2)']}
            style={[styles.gradientOverlay, { borderRadius: blockRadius }]}
            pointerEvents="none"
          />

          {/* Tap Zones for navigation */}
          <Pressable
            style={[styles.tapZone, styles.tapZoneLeft]}
            disabled={index === 0}
            onPress={() => triggerPageFlip(-1)}
          />
          <Pressable
            style={[styles.tapZone, styles.tapZoneRight]}
            disabled={isLastPage || item.type === PAGE_TYPES.CHOICE}
            onPress={() => triggerPageFlip(1)}
          />

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: NOIR_PADDING.horizontal,
              paddingVertical: NOIR_PADDING.vertical,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
          >
            {item.type === PAGE_TYPES.NARRATIVE ? (
              <>
                <Text style={[styles.noirLabel, { letterSpacing: compact ? 1.8 : 2.4 }]}>
                  {item.segment === 'opening' ? 'CASE FILE' :
                   item.segment === 'middle' ? 'INVESTIGATION' : 'CONCLUSION'}
                </Text>

                {isActive && !isPageCompleted ? (
                  <TypewriterText
                    text={item.text}
                    speed={8}
                    delay={100}
                    isActive={true}
                    isFinished={false}
                    onComplete={() => setCompletedPages(prev => new Set(prev).add(item.globalIndex))}
                    style={styles.noirText}
                  />
                ) : (
                  <NarrativeTextWithDetails
                    text={item.text}
                    details={item.details}
                    onDetailTap={handleDetailTap}
                    revealedDetails={revealedDetails}
                    textStyle={styles.noirText}
                  />
                )}

                {isPageCompleted && !isLastPage && item.isLastOfSegment && (
                  <View style={styles.nextPageCueContainer}>
                    <PulsingArrow />
                  </View>
                )}
              </>
            ) : (
              // Choice page
              <View style={styles.choicePageContainer}>
                <Text style={[styles.noirLabel, { letterSpacing: compact ? 1.8 : 2.4, marginBottom: 16 }]}>
                  {item.segment === 'firstChoice' ? 'DECISION POINT' : 'FINAL DECISION'}
                </Text>
                <Text style={[styles.choicePromptText, { fontSize: moderateScale(FONT_SIZES.sm) }]}>
                  {item.prompt}
                </Text>
                <View style={[styles.choiceButtonsRow, { gap: scaleSpacing(SPACING.sm) }]}>
                  {item.options.map((option, optIndex) => (
                    <ChoiceButton
                      key={option.key}
                      option={option}
                      onSelect={item.segment === 'firstChoice' ? handleFirstChoice : handleSecondChoice}
                      isSelected={item.segment === 'firstChoice' ? firstChoiceMade === option.key : secondChoiceMade === normalizePathKey(firstChoiceMade, option.key)}
                      isDisabled={
                        (item.segment === 'firstChoice' && firstChoiceMade && firstChoiceMade !== option.key) ||
                        (item.segment === 'secondChoice' && secondChoiceMade && secondChoiceMade !== normalizePathKey(firstChoiceMade, option.key))
                      }
                      index={optIndex}
                    />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Page indicator */}
          <View style={styles.pageStamp} pointerEvents="none">
            <Text style={styles.noirPageStampText}>
              {`PAGE ${String(index + 1).padStart(2, "0")}`}
            </Text>
          </View>
        </ImageBackground>
      </View>
    );
  }, [
    pages,
    activePage,
    completedPages,
    pageWidth,
    pageHeight,
    blockRadius,
    pageGap,
    compact,
    moderateScale,
    scaleSpacing,
    triggerPageFlip,
    handleDetailTap,
    revealedDetails,
    handleFirstChoice,
    handleSecondChoice,
    firstChoiceMade,
    secondChoiceMade,
    normalizePathKey,
  ]);

  if (!branchingNarrative) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>No narrative content available</Text>
      </View>
    );
  }

  return (
    <View onLayout={handleLayout} style={[styles.container, style, { borderRadius: blockRadius, borderColor: palette?.border }]}>
      <Animated.View
        style={{
          transform: [{ perspective }, { rotateY: flipRotation }],
          width: '100%',
        }}
      >
        <FlatList
          ref={listRef}
          data={pages}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="center"
          decelerationRate="fast"
          renderItem={renderItem}
          viewabilityConfig={viewabilityConfig.current}
          onViewableItemsChanged={handleViewableItemsChanged.current}
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={3}
          removeClippedSubviews={true}
          contentContainerStyle={{
            paddingHorizontal: sectionPaddingH,
            paddingVertical: sectionPaddingV,
          }}
        />
      </Animated.View>

      {/* Navigation Arrows */}
      <Pressable
        style={[
          styles.arrow,
          styles.arrowLeft,
          {
            width: arrowSize,
            height: arrowSize,
            borderRadius: arrowSize / 2,
            transform: [{ translateY: -arrowSize / 2 }],
          },
          activePage === 0 && styles.arrowDisabled
        ]}
        onPress={() => triggerPageFlip(-1)}
        disabled={activePage === 0}
      >
        <Text style={[styles.arrowLabel, { fontSize: arrowFontSize }]}>{"<"}</Text>
      </Pressable>

      <Pressable
        style={[
          styles.arrow,
          styles.arrowRight,
          {
            width: arrowSize,
            height: arrowSize,
            borderRadius: arrowSize / 2,
            transform: [{ translateY: -arrowSize / 2 }],
          },
          (activePage === pages.length - 1 || pages[activePage]?.type === PAGE_TYPES.CHOICE) && styles.arrowDisabled
        ]}
        onPress={() => triggerPageFlip(1)}
        disabled={activePage === pages.length - 1 || pages[activePage]?.type === PAGE_TYPES.CHOICE}
      >
        <Text style={[styles.arrowLabel, { fontSize: arrowFontSize }]}>{">"}</Text>
      </Pressable>

      {/* Observation Popup */}
      {activePopup && (
        <ObservationPopup detail={activePopup} onDismiss={handlePopupDismiss} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
  },
  page: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(40, 30, 20, 0.6)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 4, height: 6 },
    elevation: 6,
  },
  pageBackground: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  lightenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  tapZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "20%",
    zIndex: 10,
  },
  tapZoneLeft: { left: 0 },
  tapZoneRight: { right: 0 },
  noirLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: NOIR_TYPOGRAPHY.color,
    textShadowColor: NOIR_TYPOGRAPHY.textShadowColor,
    textShadowOffset: NOIR_TYPOGRAPHY.textShadowOffset,
    textShadowRadius: NOIR_TYPOGRAPHY.textShadowRadius,
    opacity: 0.7,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noirText: {
    fontFamily: NOIR_TYPOGRAPHY.fontFamily,
    fontSize: NOIR_TYPOGRAPHY.fontSize,
    lineHeight: NOIR_TYPOGRAPHY.lineHeight,
    color: NOIR_TYPOGRAPHY.color,
    textShadowColor: NOIR_TYPOGRAPHY.textShadowColor,
    textShadowOffset: NOIR_TYPOGRAPHY.textShadowOffset,
    textShadowRadius: NOIR_TYPOGRAPHY.textShadowRadius,
  },
  pageStamp: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    opacity: 0.5,
  },
  noirPageStampText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: NOIR_TYPOGRAPHY.color,
    textShadowColor: NOIR_TYPOGRAPHY.textShadowColor,
    textShadowOffset: NOIR_TYPOGRAPHY.textShadowOffset,
    textShadowRadius: NOIR_TYPOGRAPHY.textShadowRadius,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  arrow: {
    position: "absolute",
    top: "50%",
    backgroundColor: "#1a120b",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: "#3a2515",
  },
  arrowLeft: { left: -18 },
  arrowRight: { right: -18 },
  arrowDisabled: { opacity: 0 },
  arrowLabel: {
    color: "#f8d8a8",
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  nextPageCueContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginRight: 12,
  },
  nextPageCue: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    fontStyle: 'italic',
    fontSize: 18,
    color: NOIR_TYPOGRAPHY.color,
    textShadowColor: NOIR_TYPOGRAPHY.textShadowColor,
    textShadowOffset: NOIR_TYPOGRAPHY.textShadowOffset,
    textShadowRadius: NOIR_TYPOGRAPHY.textShadowRadius,
  },
  choicePageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  choicePromptText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: NOIR_TYPOGRAPHY.color,
    marginBottom: 24,
    fontStyle: 'italic',
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: NOIR_TYPOGRAPHY.textShadowColor,
    textShadowOffset: NOIR_TYPOGRAPHY.textShadowOffset,
    textShadowRadius: NOIR_TYPOGRAPHY.textShadowRadius,
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    color: '#f8d8a8',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  choiceLabelSelected: {
    color: '#fff',
  },
  inlineTappable: {},
  inlineTappableUnrevealed: {
    backgroundColor: 'rgba(139, 90, 43, 0.15)',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: '#8b5a2b',
  },
  inlineTappableRevealed: {
    backgroundColor: 'rgba(139, 90, 43, 0.3)',
    textDecorationLine: 'none',
  },
  popupOverlay: {
    flex: 1,
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    color: '#fff',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tapToDismiss: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#8a6a4b',
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  errorText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: NOIR_TYPOGRAPHY.color,
    textAlign: 'center',
    padding: 24,
    textShadowColor: NOIR_TYPOGRAPHY.textShadowColor,
    textShadowOffset: NOIR_TYPOGRAPHY.textShadowOffset,
    textShadowRadius: NOIR_TYPOGRAPHY.textShadowRadius,
  },
});
