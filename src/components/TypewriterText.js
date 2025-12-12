import React, { useState, useEffect, useRef } from 'react';
import { Text, Pressable, View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/colors';

export default function TypewriterText({ 
  text, 
  style, 
  speed = 25, 
  delay = 0,
  onComplete,
  isActive = true,
  isFinished = false,
  inline = false,
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);

  const requestRef = useRef();
  const startTimeRef = useRef(null);
  const lastRenderedIndexRef = useRef(0);

  // Refs to hold latest values of props to avoid effect re-runs
  const textRef = useRef(text);
  const onCompleteRef = useRef(onComplete);
  const speedRef = useRef(speed);

  const hapticThrottleRef = useRef(0);
  const cursorTimerRef = useRef(null);
  
  // Update refs when props change
  useEffect(() => {
    textRef.current = text;
    onCompleteRef.current = onComplete;
    speedRef.current = speed;
  }, [text, onComplete, speed]);

  // Main Typing Logic
  useEffect(() => {
    // 1. If finished, show full text immediately
    if (isFinished) {
      setDisplayedText(text);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    // 2. If not active, clear and reset
    if (!isActive) {
      setDisplayedText('');
      startTimeRef.current = null;
      lastRenderedIndexRef.current = 0;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    // 3. Start typing sequence
    setDisplayedText('');
    lastRenderedIndexRef.current = 0;
    startTimeRef.current = null;
    
    let timeoutId;

    const animate = () => {
      const now = Date.now();
      if (!startTimeRef.current) startTimeRef.current = now;

      const elapsed = now - startTimeRef.current;
      // Use current speed from ref
      const targetIndex = Math.floor(elapsed / Math.max(1, speedRef.current));
      const fullText = textRef.current;

      // Check for completion
      if (targetIndex >= fullText.length) {
         setDisplayedText(fullText);
         lastRenderedIndexRef.current = fullText.length;
         onCompleteRef.current?.();
         return; // Stop animation
      }

      // Only update if we advanced by at least one character
      if (targetIndex > lastRenderedIndexRef.current) {
         setDisplayedText(fullText.slice(0, targetIndex));

         // Haptic Feedback (Throttled & Batch Aware)
         const nowTime = Date.now();
         if (nowTime - hapticThrottleRef.current > 70) {
             let shouldHaptic = false;
             // Check if any of the newly revealed characters trigger haptics
             for (let i = lastRenderedIndexRef.current; i < targetIndex; i++) {
                 const char = fullText[i];
                 if (char === ' ' || i % 3 === 0) {
                     shouldHaptic = true;
                     break;
                 }
             }

             if (shouldHaptic) {
                 Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                 hapticThrottleRef.current = nowTime;
             }
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
    // Dependencies:
    // - text: if text changes, we want to restart.
    // - isActive: if active status changes, restart/stop.
    // - isFinished: if finished status changes, show full/reset.
    // - delay: if delay changes, we restart (simplest safe behavior).
    // NOT including onComplete or speed to prevent restarts on prop churn.
  }, [text, delay, isActive, isFinished]);

  // Track if typing is in progress
  const isTyping = displayedText.length < text.length;

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
        setDisplayedText(text);
        lastRenderedIndexRef.current = text.length;
        onCompleteRef.current?.();
    }
  };

  const showCursor = isTyping && cursorVisible && isActive && !isFinished;

  if (inline) {
    return (
      <Text style={style}>
        {displayedText}
        {showCursor && (
          <Text style={{ color: COLORS.accentSecondary }}>_</Text>
        )}
      </Text>
    );
  }

  return (
    <Pressable onPress={handlePress} disabled={!isTyping}>
        <Text style={style}>
          {displayedText}
          {showCursor && (
            <Text style={{ color: COLORS.accentSecondary }}>_</Text>
          )}
        </Text>
    </Pressable>
  );
}
