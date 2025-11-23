import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Audio } from 'expo-av';
import { LinearGradient } from "expo-linear-gradient";

import TypewriterText from "./TypewriterText";
import { FONTS, FONT_SIZES } from "../constants/typography";
import { SPACING, RADIUS } from "../constants/layout";
import useResponsiveLayout from "../hooks/useResponsiveLayout";

const NOISE_TEXTURE = require("../../assets/images/ui/backgrounds/noise-texture.png");
const BINDER_RING_COUNT = 4;
const FONT_TWEAK_FACTOR = 0.95;
const shrinkFont = (value) => Math.max(10, Math.floor(value * FONT_TWEAK_FACTOR));

function PulsingArrow() {
  const opacity = useRef(new Animated.Value(0.2)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <Animated.Text style={[styles.nextPageCue, { opacity }]}>
      &gt;&gt;
    </Animated.Text>
  );
}

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
  const [sound, setSound] = useState();
  
  const listRef = useRef(null);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const flipLockRef = useRef(false);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 });

  // Layout Constants
  const blockRadius = scaleRadius(RADIUS.lg);
  const sectionPaddingH = scaleSpacing(compact ? SPACING.xs : SPACING.sm);
  const sectionPaddingV = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const pagePaddingH = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const pagePaddingV = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const pageGap = scaleSpacing(compact ? SPACING.sm : SPACING.md);
  const ringSize = Math.max(14, Math.round(scaleSpacing(compact ? SPACING.md : SPACING.lg)));
  const tapeWidth = Math.max(82, Math.round(scaleSpacing(compact ? SPACING.xxl : SPACING.xxl + SPACING.sm)));

  const narrativeSize = shrinkFont(moderateScale(FONT_SIZES.md));
  const narrativeLineHeight = Math.round(narrativeSize * (compact ? 1.56 : 1.68));
  const slugSize = shrinkFont(moderateScale(FONT_SIZES.xs));
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

  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length) {
      const nextIndex = viewableItems[0]?.index ?? 0;
      if (typeof nextIndex === "number") {
        setActivePage(nextIndex);
      }
    }
  });

  async function playPageFlipSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/audio/sfx/ui/page-flip.mp3')
      );
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.log("Error playing page flip sound:", error);
    }
  }

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

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
      if (listRef.current) {
          // Try/catch for safety on re-mounts
          try {
            listRef.current.scrollToOffset({ offset: 0, animated: false });
          } catch(e) {}
      }
  }, [pages]);

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
            paddingHorizontal: pagePaddingH,
            paddingVertical: pagePaddingV,
            borderRadius: blockRadius,
            marginRight: isLastPage ? 0 : pageGap,
          },
        ]}
      >
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

        {/* Backgrounds */}
        <Image source={NOISE_TEXTURE} style={[styles.noise, { borderRadius: blockRadius }]} />
        <LinearGradient
          colors={["rgba(0, 0, 0, 0.12)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.32, y: 1 }}
          style={[styles.gradient, { borderRadius: blockRadius }]}
        />

        {/* Decorative Tape */}
        <View style={[styles.tape, styles.tapeLeft, { width: tapeWidth * 0.68 }]} />
        <View style={[styles.tape, styles.tapeRight, { width: tapeWidth * 0.54 }]} />

        {/* Binder Rings */}
        <View style={[styles.ringColumn, { left: -(ringSize * 0.58), width: ringSize }]}>
          {Array.from({ length: BINDER_RING_COUNT }).map((_, i) => (
            <View
              key={`ring-${i}`}
              style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}
            />
          ))}
        </View>

        {/* Content */}
        <View style={{ gap: scaleSpacing(SPACING.xs) }}>
          <Text
            style={[
              styles.label,
              {
                fontSize: shrinkFont(moderateScale(FONT_SIZES.xs)),
                color: "#5a3c26",
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
            style={{
              fontSize: narrativeSize,
              lineHeight: narrativeLineHeight,
              fontFamily: FONTS.primary,
              color: "#2b1a10",
            }}
          />
          {completedPages.has(index) && !isLastPage && (
            <View style={styles.nextPageCueContainer}>
                <PulsingArrow />
            </View>
          )}
        </View>

        {/* Page Number */}
        <View style={styles.pageStamp}>
          <Text style={[styles.pageStampText, { fontSize: slugSize }]}>
            {`PAGE ${String(index + 1).padStart(2, "0")}`}
          </Text>
        </View>

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
            <Text style={{ fontFamily: FONTS.monoBold, color: "#3a1c06", fontSize: narrativeSize }}>
              Seal Your Path
            </Text>
          </Pressable>
        )}
      </View>
    );
  }, [
    activePage,
    completedPages,
    showDecisionPrompt,
    pageWidth,
    pagePaddingH,
    pagePaddingV,
    blockRadius,
    pageGap,
    tapeWidth,
    ringSize,
    scaleSpacing,
    narrativeSize,
    narrativeLineHeight,
    slugSize,
    moderateScale,
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
    backgroundColor: "#fdf6e3",
    overflow: "hidden",
  },
  noise: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    resizeMode: "repeat",
  },
  gradient: {
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
  tape: {
    position: "absolute",
    height: 18,
    backgroundColor: "rgba(180, 160, 140, 0.4)",
  },
  tapeLeft: { top: 12, left: -15, transform: [{ rotate: "-32deg" }] },
  tapeRight: { bottom: 12, right: -10, transform: [{ rotate: "24deg" }] },
  ringColumn: {
    position: "absolute",
    top: "10%",
    bottom: "10%",
    justifyContent: "space-between",
  },
  ring: {
    backgroundColor: "#d0d0d0",
    borderWidth: 1,
    borderColor: "#8a8a8a",
  },
  label: {
    fontFamily: FONTS.monoBold,
  },
  pageStamp: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    opacity: 0.4,
  },
  pageStampText: {
    fontFamily: FONTS.mono,
    color: "#5a3c26",
  },
  arrow: {
    position: "absolute",
    top: "50%",
    backgroundColor: "rgba(40, 26, 18, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  arrowLeft: { left: -12 },
  arrowRight: { right: -12 },
  arrowDisabled: { opacity: 0 },
  arrowLabel: {
    color: "#f8d8a8",
    fontFamily: FONTS.monoBold,
  },
  choiceButton: {
    backgroundColor: "rgba(241, 197, 114, 0.9)",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(120, 80, 40, 0.3)",
  },
  choiceButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  nextPageCueContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
    marginRight: 8,
  },
  nextPageCue: {
    fontFamily: FONTS.monoBold,
    fontSize: 16,
    color: '#8a6a4b',
  },
});
