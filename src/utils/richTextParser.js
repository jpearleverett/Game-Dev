
import { FONTS } from '../constants/typography';
import { COLORS } from '../constants/colors';

/**
 * Parses text with simple markdown-like syntax into segments with styles.
 * Supported syntax:
 * - **bold** -> Bold font
 * - *italic* -> Italic/Handwritten style
 * - [color_name]text[/] -> Colored text (uses keys from COLORS)
 * - {highlight}text{/} -> Highlighted background
 * 
 * @param {string} text 
 * @returns {Array<{text: string, style: Object}>}
 */
export function parseRichText(text) {
  if (!text) return [];

  const segments = [];
  // Regex to match:
  // 1. **bold**
  // 2. *italic*
  // 3. [color]...[/]
  // 4. {highlight}...{/}
  const regex = /(\*\*(?:[^*]+)\*\*)|(\*(?:[^*]+)\*)|(\[[a-zA-Z]+\](?:[^\[]+)\[\/\])|(\{[a-z]+\}(?:[^\{]+)\{\/\})/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, match.index),
        style: {}
      });
    }

    const fullMatch = match[0];
    
    if (match[1]) { // **bold**
      const content = fullMatch.slice(2, -2);
      segments.push({
        text: content,
        style: { fontFamily: FONTS.monoBold, fontWeight: '700' }
      });
    } else if (match[2]) { // *italic*
      const content = fullMatch.slice(1, -1);
      segments.push({
        text: content,
        style: { 
          fontStyle: 'italic',
          // Optionally use a different font for "voice" emphasis
          // fontFamily: FONTS.secondary 
        }
      });
    } else if (match[3]) { // [color]...[/]
      const closeBracketIndex = fullMatch.indexOf(']');
      const colorName = fullMatch.slice(1, closeBracketIndex);
      const content = fullMatch.slice(closeBracketIndex + 1, -3); // remove [/]
      
      const colorHex = COLORS[colorName] || colorName; // Fallback to raw hex if not in map
      
      segments.push({
        text: content,
        style: { color: colorHex }
      });
    } else if (match[4]) { // {highlight}...{/}
      const closeBraceIndex = fullMatch.indexOf('}');
      const type = fullMatch.slice(1, closeBraceIndex);
      const content = fullMatch.slice(closeBraceIndex + 1, -3); // remove {/}
      
      let style = {};
      if (type === 'highlight') {
        style = { backgroundColor: 'rgba(241, 197, 114, 0.3)' }; // amberLight transparent
      } else if (type === 'red') {
          style = { backgroundColor: 'rgba(196, 92, 92, 0.2)' };
      }
      
      segments.push({
        text: content,
        style: style
      });
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      style: {}
    });
  }

  return segments;
}

/**
 * Calculates the total length of plain text in the parsed segments.
 */
export function getPlainTextLength(segments) {
  return segments.reduce((acc, seg) => acc + seg.text.length, 0);
}
