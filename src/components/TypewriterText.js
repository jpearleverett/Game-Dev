import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Text, Pressable, View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/colors';
import { parseRichText, getPlainTextLength } from '../utils/richTextParser';

// Helper to slice segments based on character count
function getVisibleSegments(segments, visibleCount) {
  let count = 0;
  const result = [];
  for (const seg of segments) {
    if (count >= visibleCount) break;
    const remaining = visibleCount - count;
    if (remaining >= seg.text.length) {
      result.push(seg);
      count += seg.text.length;
    } else {
      result.push({ ...seg, text: seg.text.slice(0, remaining) });
      count += remaining;
    }
  }
  return result;
}

// Memoized to prevent expensive re-renders in FlatList
function TypewriterText({
  text,
  style,
  speed = 25,
  delay = 0,
  onComplete,
  isActive = true,
  isFinished = false,
  inline = false,
}) {
  // State now tracks how many characters are visible
  const [visibleCount, setVisibleCount] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Parse text once when it changes
  const segments = useMemo(() => parseRichText(text), [text]);
  const totalLength = useMemo(() => getPlainTextLength(segments), [segments]);

  const requestRef = useRef();
  const startTimeRef = useRef(null);
  const lastRenderedIndexRef = useRef(0);

  // Refs to hold latest values of props to avoid effect re-runs
  const textRef = useRef(text);
  const segmentsRef = useRef(segments);
  const totalLengthRef = useRef(totalLength);
  
  const onCompleteRef = useRef(onComplete);
  const speedRef = useRef(speed);

  const hapticThrottleRef = useRef(0);
  const cursorTimerRef = useRef(null);
  
  // Update refs when props change
  useEffect(() => {
    textRef.current = text;
    segmentsRef.current = segments;
    totalLengthRef.current = totalLength;
    onCompleteRef.current = onComplete;
    speedRef.current = speed;
  }, [text, segments, totalLength, onComplete, speed]);

  // Main Typing Logic
  useEffect(() => {
    // 1. If finished, show full text immediately
    if (isFinished) {
      setVisibleCount(totalLength);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    // 2. If not active, clear and reset
    if (!isActive) {
      setVisibleCount(0);
      startTimeRef.current = null;
      lastRenderedIndexRef.current = 0;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    // 3. Start typing sequence
    setVisibleCount(0);
    lastRenderedIndexRef.current = 0;
    startTimeRef.current = null;
    
    let timeoutId;

    const animate = () => {
      const now = Date.now();
      if (!startTimeRef.current) startTimeRef.current = now;

      const elapsed = now - startTimeRef.current;
      // Use current speed from ref
      const targetIndex = Math.floor(elapsed / Math.max(1, speedRef.current));
      const currentTotalLength = totalLengthRef.current;

      // Check for completion
      if (targetIndex >= currentTotalLength) {
         setVisibleCount(currentTotalLength);
         lastRenderedIndexRef.current = currentTotalLength;
         onCompleteRef.current?.();
         return; // Stop animation
      }

      // Only update if we advanced by at least one character
      if (targetIndex > lastRenderedIndexRef.current) {
         setVisibleCount(targetIndex);

         // Haptic Feedback (Throttled & Batch Aware)
         const nowTime = Date.now();
         if (nowTime - hapticThrottleRef.current > 70) {
             // We need to check characters in the plain text version.
             // For simplicity, we can reconstruct the plain text or just assume typical punctuation frequency.
             // Given we don't have easy random access to the 'char' without flattening segments,
             // we'll just trigger haptics periodically for now, which feels fine.
             // Or better: check if targetIndex % 3 === 0.
             
             Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
             hapticThrottleRef.current = nowTime;
         }

         lastRenderedIndexRef.current = targetIndex;
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    // Initial delay before starting the loop
    timeoutId = setTimeout(() => {
      requestRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [totalLength, delay, isActive, isFinished]);

  // Track if typing is in progress
  const isTyping = visibleCount < totalLength;

  // Cursor blink effect
  useEffect(() => {
    if (!isActive || isFinished || !isTyping) {
      if (cursorTimerRef.current) {
        clearInterval(cursorTimerRef.current);
        cursorTimerRef.current = null;
      }
      setCursorVisible(true);
      return;
    }

    cursorTimerRef.current = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 500);

    return () => {
      if (cursorTimerRef.current) {
        clearInterval(cursorTimerRef.current);
        cursorTimerRef.current = null;
      }
    };
  }, [isActive, isFinished, isTyping]);

  const handlePress = () => {
    if (isTyping) {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        setVisibleCount(totalLength);
        lastRenderedIndexRef.current = totalLength;
        onCompleteRef.current?.();
    }
  };

  const showCursor = isTyping && cursorVisible && isActive && !isFinished;
  
  const visibleSegments = useMemo(() => 
    getVisibleSegments(segments, visibleCount), 
    [segments, visibleCount]
  );

  const content = (
    <Text style={style}>
      {visibleSegments.map((seg, i) => (
        <Text key={i} style={seg.style}>
          {seg.text}
        </Text>
      ))}
      {showCursor && (
        <Text style={{ color: COLORS.accentSecondary }}>_</Text>
      )}
    </Text>
  );

  if (inline) {
    return content;
  }

  return (
    <Pressable onPress={handlePress} disabled={!isTyping}>
        {content}
    </Pressable>
  );
}

// Custom comparison to avoid re-renders when only callbacks change
export default React.memo(TypewriterText, (prevProps, nextProps) => {
  return (
    prevProps.text === nextProps.text &&
    prevProps.speed === nextProps.speed &&
    prevProps.delay === nextProps.delay &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isFinished === nextProps.isFinished &&
    prevProps.inline === nextProps.inline &&
    prevProps.style === nextProps.style
  );
});
