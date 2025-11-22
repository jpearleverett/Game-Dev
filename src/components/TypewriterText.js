import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, Pressable } from 'react-native';
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
  
  // Reset when text changes or activity status changes
  useEffect(() => {
    if (isFinished) {
      setDisplayedText(text);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (!isActive) {
      setDisplayedText('');
      indexRef.current = 0;
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

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

  useEffect(() => {
    cursorTimerRef.current = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 500);
    
    return () => {
      if (cursorTimerRef.current) clearInterval(cursorTimerRef.current);
    };
  }, []);

  const startTyping = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        const char = text[indexRef.current];
        indexRef.current += 1;
        setDisplayedText(text.slice(0, indexRef.current));
        
        // Haptics on space or every 3rd character
        if (char === ' ' || indexRef.current % 3 === 0) {
             Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
      <View>
        {/* Invisible text to force layout height to full size immediately */}
        <Text style={[style, { opacity: 0 }]} accessibilityElementsHidden={true}>
          {text}
          <Text>_</Text>
        </Text>

        {/* Visible text overlay */}
        <View style={StyleSheet.absoluteFill}>
          <Text style={style}>
            {displayedText}
            {showCursor && (
              <Text style={{ color: COLORS.accentSecondary }}>_</Text>
            )}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}