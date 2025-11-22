import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Text, View, StyleSheet, Pressable, Animated } from 'react-native';
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
  const indexRef = useRef(0);
  const timerRef = useRef(null);
  const cursorTimerRef = useRef(null);
  const hapticThrottleRef = useRef(0);
  
  // Reset when text changes or activity status changes
  useEffect(() => {
    // If finished, show full text immediately and stop timers
    if (isFinished) {
      setDisplayedText(text);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // If not active, clear text and reset
    if (!isActive) {
      setDisplayedText('');
      indexRef.current = 0;
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Starting a new sequence
    setDisplayedText('');
    indexRef.current = 0;
    
    const startTimer = setTimeout(() => {
      startTyping();
    }, delay);
    
    return () => {
      clearTimeout(startTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text, delay, isActive, isFinished]);

  // Cursor blink effect - only run if active
  useEffect(() => {
    if (!isActive || isFinished) {
      if (cursorTimerRef.current) clearInterval(cursorTimerRef.current);
      return;
    }
    
    cursorTimerRef.current = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 500);
    
    return () => {
      if (cursorTimerRef.current) clearInterval(cursorTimerRef.current);
    };
  }, [isActive, isFinished]);

  const startTyping = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        const char = text[indexRef.current];
        indexRef.current += 1;
        setDisplayedText(text.slice(0, indexRef.current));
        
        // Throttled Haptics
        const now = Date.now();
        if (now - hapticThrottleRef.current > 70) { // Max 14 hits per second
             if (char === ' ' || indexRef.current % 3 === 0) {
                 Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                 hapticThrottleRef.current = now;
             }
        }
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        onComplete?.();
      }
    }, speed);
  };

  const handlePress = () => {
    if (isTyping) {
        if (timerRef.current) clearInterval(timerRef.current);
        setDisplayedText(text);
        indexRef.current = text.length; // Ensure we mark as done
        onComplete?.();
    }
  };

  const isTyping = displayedText.length < text.length;
  const showCursor = (isTyping || cursorVisible) && isActive && !isFinished;

  // Optimization: Single text node structure
  // We use a transparent copy only if absolutely needed for layout, but here we can usually get away with just one.
  // If layout jump is an issue, we can wrap in a View with minHeight.
  
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
