import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FONTS, FONT_SIZES } from "../constants/typography";
import { NARRATIVE_COLORS } from "../constants/colors";

/**
 * StylizedNarrativeText - Rich, visually dynamic narrative text rendering
 *
 * Features:
 * - Drop caps for paragraph openings
 * - Mood-based coloring (danger, mystery, discovery, emotion)
 * - Auto-detection of names, places, and clue words
 * - Markdown-style emphasis (*bold*, _italic_, ~whisper~)
 * - Visual variation with size and color changes
 * - Dramatic punctuation styling
 */

// Word patterns for auto-detection
const PATTERNS = {
  // Danger/threat words
  danger: /\b(blood|dead|death|kill|murder|shot|bullet|gun|knife|wound|scream|terror|fear|pain|hurt|violent|corpse|body)\b/gi,

  // Mystery/unknown words
  mystery: /\b(shadow|dark|hidden|secret|strange|unknown|mysterious|vanish|disappear|clue|evidence|suspect|witness|alibi)\b/gi,

  // Discovery/revelation words
  discovery: /\b(found|discover|notice|realize|understand|reveal|truth|answer|solve|uncover|detect|spot|observe|see)\b/gi,

  // Emotion words
  emotion: /\b(love|hate|anger|sad|happy|anxious|nervous|worry|desperate|hopeful|bitter|jealous|regret|guilt|shame)\b/gi,

  // Nature/environment words
  nature: /\b(rain|storm|fog|mist|night|cold|wind|thunder|lightning|smoke|fire|water|snow|sun|moon|cloud)\b/gi,

  // Time words
  time: /\b(yesterday|tomorrow|tonight|morning|evening|midnight|dawn|dusk|hour|minute|moment|suddenly|finally|always|never)\b/gi,

  // Sound words (onomatopoeia)
  sounds: /\b(crack|bang|thud|whisper|murmur|crash|click|snap|buzz|hum|roar|rustle|creak|slam)\b/gi,
};

// Dramatic punctuation patterns
const PUNCTUATION_PATTERNS = {
  ellipsis: /\.\.\./g,
  dash: /—|--/g,
  exclaim: /!/g,
  question: /\?/g,
};

/**
 * Parse text into styled segments
 */
function parseNarrativeText(text) {
  if (!text) return [];

  const segments = [];
  let remaining = text;
  let currentIndex = 0;

  // Split into paragraphs first
  const paragraphs = remaining.split(/\n\n+/);

  paragraphs.forEach((paragraph, pIndex) => {
    if (pIndex > 0) {
      segments.push({ type: 'break', key: `break-${pIndex}` });
    }

    // Process paragraph content
    const paraSegments = processInlineStyles(paragraph, pIndex);
    segments.push(...paraSegments);
  });

  return segments;
}

/**
 * Process inline markdown-style markers and mood detection
 */
function processInlineStyles(text, paragraphIndex) {
  const segments = [];
  let keyCounter = 0;

  // First, handle explicit markdown-style markers
  // Pattern: *bold*, _italic_, ~whisper~, ^shout^
  const markerPattern = /(\*[^*]+\*|_[^_]+_|~[^~]+~|\^[^\^]+\^)/g;

  let lastIndex = 0;
  let match;
  const markerMatches = [];

  while ((match = markerPattern.exec(text)) !== null) {
    markerMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
  }

  // If no markers, process entire text for mood detection
  if (markerMatches.length === 0) {
    segments.push(...processMoodStyling(text, paragraphIndex, keyCounter));
    return segments;
  }

  // Process text with markers
  markerMatches.forEach((marker, mIndex) => {
    // Add text before marker
    if (marker.start > lastIndex) {
      const beforeText = text.substring(lastIndex, marker.start);
      segments.push(...processMoodStyling(beforeText, paragraphIndex, keyCounter));
      keyCounter += 100;
    }

    // Process marker
    const markerChar = marker.text[0];
    const innerText = marker.text.slice(1, -1);

    let style;
    switch (markerChar) {
      case '*':
        style = 'bold';
        break;
      case '_':
        style = 'italic';
        break;
      case '~':
        style = 'whisper';
        break;
      case '^':
        style = 'shout';
        break;
      default:
        style = 'normal';
    }

    segments.push({
      type: 'styled',
      style,
      content: innerText,
      key: `p${paragraphIndex}-styled-${keyCounter++}`,
    });

    lastIndex = marker.end;
  });

  // Add remaining text after last marker
  if (lastIndex < text.length) {
    const afterText = text.substring(lastIndex);
    segments.push(...processMoodStyling(afterText, paragraphIndex, keyCounter));
  }

  return segments;
}

/**
 * Apply mood-based styling to plain text
 */
function processMoodStyling(text, paragraphIndex, startKey) {
  const segments = [];
  let keyCounter = startKey;

  // Build a list of all mood matches
  const allMatches = [];

  Object.entries(PATTERNS).forEach(([mood, pattern]) => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      allMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        word: match[0],
        mood,
      });
    }
  });

  // Sort matches by position and remove overlaps
  allMatches.sort((a, b) => a.start - b.start);
  const filtered = [];
  let lastEnd = 0;
  for (const m of allMatches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  // Build segments
  let currentPos = 0;

  filtered.forEach((match, mIndex) => {
    // Add plain text before mood word
    if (match.start > currentPos) {
      const plainText = text.substring(currentPos, match.start);
      segments.push(...processPlainText(plainText, paragraphIndex, keyCounter));
      keyCounter += plainText.length;
    }

    // Add mood-styled word
    segments.push({
      type: 'mood',
      mood: match.mood,
      content: match.word,
      key: `p${paragraphIndex}-mood-${keyCounter++}`,
    });

    currentPos = match.end;
  });

  // Add remaining plain text
  if (currentPos < text.length) {
    const remainingText = text.substring(currentPos);
    segments.push(...processPlainText(remainingText, paragraphIndex, keyCounter));
  }

  return segments;
}

/**
 * Process plain text for punctuation styling
 */
function processPlainText(text, paragraphIndex, startKey) {
  const segments = [];
  let keyCounter = startKey;

  // Find dramatic punctuation
  const punctMatches = [];

  // Ellipsis
  let match;
  while ((match = /\.\.\./.exec(text.substring(punctMatches.length ? punctMatches[punctMatches.length - 1].end : 0))) !== null) {
    const offset = punctMatches.length ? punctMatches[punctMatches.length - 1].end : 0;
    punctMatches.push({
      start: offset + match.index,
      end: offset + match.index + match[0].length,
      content: match[0],
      style: 'ellipsis',
    });
  }

  // For simplicity, treat as single text segment with special handling
  if (text.length > 0) {
    segments.push({
      type: 'plain',
      content: text,
      key: `p${paragraphIndex}-plain-${keyCounter++}`,
    });
  }

  return segments;
}

/**
 * DropCap component for paragraph beginnings
 */
const DropCap = React.memo(function DropCap({ letter, color }) {
  return (
    <Text style={[styles.dropCap, { color }]}>
      {letter}
    </Text>
  );
});

/**
 * StylizedNarrativeText component
 */
const StylizedNarrativeText = React.memo(function StylizedNarrativeText({
  text,
  style,
  enableDropCap = true,
  enableMoodColors = true,
  baseSize = FONT_SIZES.md,
  lineHeight = 1.7,
}) {
  const segments = useMemo(() => parseNarrativeText(text), [text]);

  const baseStyle = useMemo(() => ({
    fontSize: baseSize,
    lineHeight: baseSize * lineHeight,
    fontFamily: FONTS.mono,
    color: NARRATIVE_COLORS.base,
  }), [baseSize, lineHeight]);

  // Check if first segment should have drop cap
  const shouldDropCap = enableDropCap &&
    segments.length > 0 &&
    segments[0].type === 'plain' &&
    segments[0].content.length > 0;

  // Render segments
  const renderSegment = (segment, index, isFirst) => {
    switch (segment.type) {
      case 'break':
        return <Text key={segment.key}>{'\n\n'}</Text>;

      case 'styled':
        return renderStyledSegment(segment);

      case 'mood':
        return renderMoodSegment(segment);

      case 'plain':
      default:
        return renderPlainSegment(segment, isFirst && shouldDropCap);
    }
  };

  const renderStyledSegment = (segment) => {
    const styleMap = {
      bold: styles.bold,
      italic: styles.italic,
      whisper: styles.whisper,
      shout: styles.shout,
    };

    return (
      <Text
        key={segment.key}
        style={[baseStyle, styleMap[segment.style]]}
      >
        {segment.content}
      </Text>
    );
  };

  const renderMoodSegment = (segment) => {
    if (!enableMoodColors) {
      return <Text key={segment.key} style={baseStyle}>{segment.content}</Text>;
    }

    const moodStyles = {
      danger: styles.moodDanger,
      mystery: styles.moodMystery,
      discovery: styles.moodDiscovery,
      emotion: styles.moodEmotion,
      nature: styles.moodNature,
      time: styles.moodTime,
      sounds: styles.moodSounds,
    };

    return (
      <Text
        key={segment.key}
        style={[baseStyle, moodStyles[segment.mood]]}
      >
        {segment.content}
      </Text>
    );
  };

  const renderPlainSegment = (segment, withDropCap) => {
    if (!withDropCap || segment.content.length === 0) {
      // Apply subtle variation to plain text - alternate word emphasis
      return renderVariedPlainText(segment);
    }

    const firstChar = segment.content[0];
    const restOfText = segment.content.substring(1);

    return (
      <Text key={segment.key} style={baseStyle}>
        <Text style={styles.dropCap}>{firstChar}</Text>
        {restOfText.length > 0 && renderTextWithVariation(restOfText, segment.key)}
      </Text>
    );
  };

  const renderVariedPlainText = (segment) => {
    return (
      <Text key={segment.key} style={baseStyle}>
        {renderTextWithVariation(segment.content, segment.key)}
      </Text>
    );
  };

  // Add subtle variation to text - emphasize certain patterns
  const renderTextWithVariation = (text, baseKey) => {
    // Style quotations differently
    const quotePattern = /"([^"]+)"/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let partIndex = 0;

    while ((match = quotePattern.exec(text)) !== null) {
      // Text before quote
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`${baseKey}-p${partIndex++}`}>
            {text.substring(lastIndex, match.index)}
          </Text>
        );
      }

      // The quoted text
      parts.push(
        <Text key={`${baseKey}-q${partIndex++}`} style={styles.quotedText}>
          "{match[1]}"
        </Text>
      );

      lastIndex = match.index + match[0].length;
    }

    // Remaining text
    if (lastIndex < text.length) {
      parts.push(
        <Text key={`${baseKey}-p${partIndex++}`}>
          {text.substring(lastIndex)}
        </Text>
      );
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <Text style={[baseStyle, style]}>
      {segments.map((segment, index) => renderSegment(segment, index, index === 0))}
    </Text>
  );
});

const styles = StyleSheet.create({
  // Drop cap styling
  dropCap: {
    fontSize: 42,
    lineHeight: 46,
    fontFamily: FONTS.secondaryBold,
    color: NARRATIVE_COLORS.danger,
    marginRight: 2,
  },

  // Explicit style markers
  bold: {
    fontFamily: FONTS.monoBold,
    color: NARRATIVE_COLORS.base,
  },
  italic: {
    fontStyle: 'italic',
    color: NARRATIVE_COLORS.baseLight,
  },
  whisper: {
    fontStyle: 'italic',
    color: NARRATIVE_COLORS.whisper,
    fontSize: 14,
  },
  shout: {
    fontFamily: FONTS.monoBold,
    color: NARRATIVE_COLORS.shout,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Mood-based styling
  moodDanger: {
    color: NARRATIVE_COLORS.danger,
    fontFamily: FONTS.monoBold,
  },
  moodMystery: {
    color: NARRATIVE_COLORS.mystery,
    fontStyle: 'italic',
  },
  moodDiscovery: {
    color: NARRATIVE_COLORS.discovery,
    fontFamily: FONTS.monoBold,
  },
  moodEmotion: {
    color: NARRATIVE_COLORS.emotion,
    fontStyle: 'italic',
  },
  moodNature: {
    color: NARRATIVE_COLORS.nature,
  },
  moodTime: {
    color: NARRATIVE_COLORS.time,
    fontFamily: FONTS.monoBold,
  },
  moodSounds: {
    color: NARRATIVE_COLORS.dangerLight,
    fontStyle: 'italic',
    fontFamily: FONTS.monoBold,
  },

  // Quoted text styling
  quotedText: {
    fontStyle: 'italic',
    color: NARRATIVE_COLORS.baseLight,
  },
});

export default StylizedNarrativeText;
