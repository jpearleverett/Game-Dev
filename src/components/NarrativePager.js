import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from 'expo-av';

// Noir/Detective paper texture background
const CASE_FILE_BG = require("../../assets/images/ui/backgrounds/case-file-bg.jpg");

import TypewriterText from "./TypewriterText";
import { SPACING, RADIUS } from "../constants/layout";
import useResponsiveLayout from "../hooks/useResponsiveLayout";

// Noir aesthetic constants
const NOIR_TYPOGRAPHY = {
  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  color: '#1a1a1a', // Off-black for ink
  fontSize: 14,
  lineHeight: 22,
  // Ink bleed effect via text shadow
  textShadowColor: 'rgba(0, 0, 0, 0.25)',
  textShadowOffset: { width: 0.5, height: 0.5 },
  textShadowRadius: 1,
};

// Heavy internal padding for paper margins
const NOIR_PADDING = {
  horizontal: 24,
  vertical: 48,
};

// Memoized to prevent recreating animation instances on parent re-renders
const PulsingArrow = React.memo(function PulsingArrow() {
  const opacity = useRef(new Animated.Value(0.2)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    // Store animation reference for cleanup
    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration: 800, useNativeDriver: true })
      ])
    );
    loopRef.current.start();

    // CRITICAL: Stop animation on unmount to prevent memory leak
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

export default function NarrativePager({
  pages,
  palette,
  onComplete,
  onRevealDecision,
  showDecisionPrompt,
  style,
}) {
  const { sizeClass, moderateScale, scaleSpacing, scaleRadius } = useResponsiveLayout();
  const compact = sizeClass === "xsmall" || sizeClass === "small";

  const [narrativeWidth, setNarrativeWidth] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [completedPages, setCompletedPages] = useState(new Set());
  
  const listRef = useRef(null);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const flipLockRef = useRef(false);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 });
  const soundRef = useRef(null);
  const soundLoadAttempted = useRef(false);

  // Layout Constants
  const blockRadius = scaleRadius(RADIUS.lg);
  const sectionPaddingH = scaleSpacing(compact ? SPACING.xs : SPACING.sm);
  const sectionPaddingV = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const pageGap = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const arrowSize = Math.max(40, Math.round(scaleSpacing(compact ? SPACING.xl : SPACING.xxl)));
  const arrowFontSize = Math.round(arrowSize * 0.48);
  const pageHeight = Math.round(moderateScale(compact ? 450 : 540));

  const handleLayout = useCallback((event) => {
    const { width } = event.nativeEvent.layout;
    if (width && Math.abs(width - narrativeWidth) > 2) {
      setNarrativeWidth(width);
    }
  }, [narrativeWidth]);

  const pageWidth = useMemo(() => {
    if (!narrativeWidth) return 0;
    const w = narrativeWidth - sectionPaddingH * 2;
    return w > 0 ? w : 0;
  }, [narrativeWidth, sectionPaddingH]);

  // Track if onComplete has been called to avoid duplicate calls
  const onCompleteCalledRef = useRef(false);

  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length) {
      const nextIndex = viewableItems[0]?.index ?? 0;
      if (typeof nextIndex === "number") {
        setActivePage(nextIndex);
      }
    }
  });

  // Load the page flip sound once on mount
  useEffect(() => {
    if (soundLoadAttempted.current) return;
    soundLoadAttempted.current = true;

    (async () => {
      try {
        const { sound: loadedSound } = await Audio.Sound.createAsync(
          require('../../assets/audio/sfx/ui/page-flip.mp3')
        );
        soundRef.current = loadedSound;
      } catch {
        // Sound file is missing or invalid - fail silently
        soundRef.current = null;
      }
    })();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  async function playPageFlipSound() {
    if (!soundRef.current) return;
    try {
      await soundRef.current.replayAsync();
    } catch {
      // Fail silently - sound is non-critical UI feedback
    }
  }

  const triggerPageFlip = useCallback(
    (direction) => {
      if (!direction || flipLockRef.current) return;
      const targetIndex = activePage + direction;
      if (targetIndex < 0 || targetIndex > pages.length - 1) return;

      playPageFlipSound();

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
             // Fallback if scrollToIndex fails (sometimes happens with layout issues)
             if (pageWidth) {
                listRef.current.scrollToOffset({ offset: targetIndex * (pageWidth + pageGap), animated: true });
             }
        }
      }
      setActivePage(targetIndex);
    },
    [activePage, pages.length, flipAnim, pageWidth, pageGap]
  );

  const flipRotation = flipAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["6deg", "0deg", "-6deg"],
  });

  const perspective = Math.max(620, Math.round((pageWidth || scaleSpacing(SPACING.xl)) * 1.6));

  // Reset when pages change
  useEffect(() => {
      setActivePage(0);
      onCompleteCalledRef.current = false;
      if (listRef.current) {
          // Try/catch for safety on re-mounts
          try {
            listRef.current.scrollToOffset({ offset: 0, animated: false });
          } catch(e) {}
      }
  }, [pages]);

  // NARRATIVE-FIRST FLOW: Call onComplete when user has read through the narrative
  // Triggered when user reaches and views the last page
  useEffect(() => {
    if (
      onComplete &&
      !onCompleteCalledRef.current &&
      pages.length > 0 &&
      activePage === pages.length - 1
    ) {
      onCompleteCalledRef.current = true;
      console.log('[NarrativePager] Narrative complete - reached last page');
      onComplete();
    }
  }, [activePage, pages.length, onComplete]);

  if (!pages.length) return null;

  const renderItem = useCallback(({ item, index }) => {
    const isLastPage = index === pages.length - 1;
    const entryNumber = String(item.segmentIndex + 1).padStart(2, "0");
    const entryLabel =
      item.totalPagesForSegment > 1
        ? `Journal Entry ${entryNumber} - Page ${String(item.pageIndex + 1).padStart(2, "0")}/${String(item.totalPagesForSegment).padStart(2, "0")}`
        : `Journal Entry ${entryNumber}`;
    
    const showReveal = showDecisionPrompt && isLastPage;

    // Only render typewriter if this page is active or very close to active
    // This prevents off-screen typewriters from consuming resources
    const isActive = index === activePage;

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
        {/* Noir/Detective paper texture background */}
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

          {/* Tap Zones */}
          <Pressable
            style={[styles.tapZone, styles.tapZoneLeft]}
            disabled={index === 0}
            onPress={() => triggerPageFlip(-1)}
          />
          <Pressable
            style={[styles.tapZone, styles.tapZoneRight]}
            disabled={isLastPage}
            onPress={() => triggerPageFlip(1)}
          />

          {/* Content with heavy noir padding */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: NOIR_PADDING.horizontal,
              paddingVertical: NOIR_PADDING.vertical,
              gap: scaleSpacing(SPACING.xs),
              paddingBottom: scaleSpacing(SPACING.xxl),
            }}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={[
                styles.noirLabel,
                {
                  letterSpacing: compact ? 1.8 : 2.4,
                },
              ]}
            >
              {entryLabel.toUpperCase()}
            </Text>

            <TypewriterText
              text={item.text}
              speed={8}
              delay={100}
              isActive={isActive}
              isFinished={completedPages.has(index)}
              onComplete={() => setCompletedPages(prev => new Set(prev).add(index))}
              style={styles.noirText}
            />
            {completedPages.has(index) && !isLastPage && (
              <View style={styles.nextPageCueContainer}>
                  <PulsingArrow />
              </View>
            )}

            {/* Decision Button */}
            {showReveal && (
              <Pressable
                style={({ pressed }) => [
                  styles.choiceButton,
                  { borderRadius: blockRadius, marginTop: scaleSpacing(SPACING.md) },
                  pressed && styles.choiceButtonPressed,
                ]}
                onPress={onRevealDecision}
              >
                <Text style={styles.choiceButtonText}>
                  Seal Your Path
                </Text>
              </Pressable>
            )}
          </ScrollView>

          {/* Page Number */}
          <View style={styles.pageStamp} pointerEvents="none">
            <Text style={styles.noirPageStampText}>
              {`PAGE ${String(index + 1).padStart(2, "0")}`}
            </Text>
          </View>
        </ImageBackground>
      </View>
    );
  }, [
    activePage,
    completedPages,
    showDecisionPrompt,
    pageWidth,
    blockRadius,
    pageGap,
    scaleSpacing,
    compact,
    pages.length,
    triggerPageFlip,
    onRevealDecision,
    pageHeight
  ]);

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.container,
        style,
        {
          borderRadius: blockRadius,
          borderColor: palette.border,
          paddingHorizontal: sectionPaddingH,
          paddingVertical: sectionPaddingV,
          gap: pageGap,
        },
      ]}
    >
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
          // OPTIMIZATIONS
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={3}
          removeClippedSubviews={true}
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
                borderRadius: arrowSize/2,
                transform: [{ translateY: -arrowSize/2 }],
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
                borderRadius: arrowSize/2,
                transform: [{ translateY: -arrowSize/2 }],
            },
            activePage === pages.length - 1 && styles.arrowDisabled
        ]}
        onPress={() => triggerPageFlip(1)}
        disabled={activePage === pages.length - 1}
      >
        <Text style={[styles.arrowLabel, { fontSize: arrowFontSize }]}>{">"}</Text>
      </Pressable>
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
  // Noir "Dirty Typewriter" label style
  noirLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: NOIR_TYPOGRAPHY.color,
    textShadowColor: NOIR_TYPOGRAPHY.textShadowColor,
    textShadowOffset: NOIR_TYPOGRAPHY.textShadowOffset,
    textShadowRadius: NOIR_TYPOGRAPHY.textShadowRadius,
    opacity: 0.7,
    fontWeight: 'bold',
  },
  // Noir "Dirty Typewriter" text style
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
  choiceButton: {
    backgroundColor: "#8a2a22",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#5a1a15",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    alignSelf: 'center',
  },
  choiceButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  choiceButtonText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    color: "#f8d8a8",
    fontSize: NOIR_TYPOGRAPHY.fontSize,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
});
