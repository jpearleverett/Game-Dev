// Default fallback values (will be overridden by dynamic calculation)
const DEFAULT_MAX_LINES = 12;
const DEFAULT_CHARS_PER_LINE = 40;

// Monospace font character width is approximately 0.6x the font size
const MONOSPACE_CHAR_WIDTH_RATIO = 0.6;

/**
 * Calculates pagination parameters based on page layout and typography.
 * This ensures text is paginated to fit the actual available space without cutoff.
 *
 * @param {Object} params - Layout parameters
 * @param {number} params.pageHeight - Total page height in pixels
 * @param {number} params.pageWidth - Available content width in pixels
 * @param {number} params.fontSize - Font size in pixels
 * @param {number} params.lineHeight - Line height in pixels
 * @param {number} params.verticalPadding - Total vertical padding (top + bottom)
 * @param {number} params.labelHeight - Height reserved for journal entry label
 * @param {number} params.bottomReserved - Height reserved for page stamp and extra padding
 * @returns {Object} { maxLinesPerPage, charsPerLine }
 */
export function calculatePaginationParams({
  pageHeight,
  pageWidth,
  fontSize,
  lineHeight,
  verticalPadding = 0,
  labelHeight = 24,
  bottomReserved = 60,
}) {
  // Calculate available height for text content
  const availableHeight = pageHeight - verticalPadding - labelHeight - bottomReserved;

  // Calculate max lines that fit - use full capacity since we'll fill to the line
  const maxLinesPerPage = Math.max(6, Math.floor(availableHeight / lineHeight));

  // Calculate characters per line based on available width and monospace font
  const charWidth = fontSize * MONOSPACE_CHAR_WIDTH_RATIO;
  // Use full width - React Native will handle actual wrapping
  const effectiveWidth = pageWidth * 0.95;
  const charsPerLine = Math.max(30, Math.floor(effectiveWidth / charWidth));

  return { maxLinesPerPage, charsPerLine };
}

/**
 * Estimates how many visual lines text will take when rendered.
 * This is an approximation - React Native does the actual wrapping.
 */
function estimateLines(text, charsPerLine) {
  if (!text || charsPerLine <= 0) return 0;
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

/**
 * Splits text into sentences, preserving the sentence endings.
 */
function splitIntoSentences(text) {
  // Match sentences ending with . ! ? followed by space or end of string
  const sentenceRegex = /[^.!?]*[.!?]+(?:\s+|$)/g;
  const sentences = text.match(sentenceRegex);

  if (!sentences) {
    // No sentence endings found, return the whole text
    return [text];
  }

  // Check if there's remaining text after the last sentence
  const matched = sentences.join('');
  if (matched.length < text.length) {
    const remainder = text.slice(matched.length).trim();
    if (remainder) {
      sentences.push(remainder);
    }
  }

  return sentences.map(s => s.trim()).filter(Boolean);
}

/**
 * Paginates narrative segments by filling pages to FULL capacity.
 * Will split mid-paragraph and mid-sentence when needed to ensure
 * every page is filled to the bottom.
 *
 * @param {string[]} segments - Array of narrative text segments
 * @param {Object} options - Pagination options
 * @param {number} options.maxLinesPerPage - Maximum visual lines per page
 * @param {number} options.charsPerLine - Estimated characters per line
 * @returns {Array} Paginated pages array
 */
export function paginateNarrativeSegments(
  segments,
  { maxLinesPerPage = DEFAULT_MAX_LINES, charsPerLine = DEFAULT_CHARS_PER_LINE } = {},
) {
  if (!Array.isArray(segments) || !segments.length) {
    return [];
  }

  const pages = [];
  const maxCharsPerPage = charsPerLine * maxLinesPerPage;

  segments.forEach((rawSegment, segmentIndex) => {
    if (typeof rawSegment !== "string") {
      return;
    }

    // Parse paragraphs
    const paragraphs = rawSegment
      .replace(/\\n/g, "\n")
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!paragraphs.length) {
      return;
    }

    // Build a list of "units" - sentences with paragraph break markers
    const units = [];
    paragraphs.forEach((para, paraIndex) => {
      const sentences = splitIntoSentences(para);
      sentences.forEach((sentence, sentIndex) => {
        units.push({
          text: sentence,
          // Mark if this is the start of a new paragraph (needs extra line break before it)
          isNewParagraph: paraIndex > 0 && sentIndex === 0,
        });
      });
    });

    // Now fill pages to capacity
    const segmentPages = [];
    let currentPageText = '';
    let currentPageLines = 0;

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const unitText = unit.text;
      const unitLines = estimateLines(unitText, charsPerLine);

      // Calculate lines needed including paragraph spacing
      const spacingLines = unit.isNewParagraph && currentPageText ? 1 : 0;
      const totalLinesNeeded = unitLines + spacingLines;

      // Check if this unit fits on the current page
      if (currentPageLines + totalLinesNeeded <= maxLinesPerPage) {
        // It fits - add to current page
        if (currentPageText) {
          currentPageText += unit.isNewParagraph ? '\n\n' : ' ';
        }
        currentPageText += unitText;
        currentPageLines += totalLinesNeeded;
      } else {
        // Doesn't fit - need to handle overflow
        const remainingLines = maxLinesPerPage - currentPageLines;
        const remainingChars = remainingLines * charsPerLine;

        if (remainingLines > 0 && remainingChars > 20) {
          // We have some space left - try to fill it
          // Find a good break point in the unit text
          let breakPoint = findBreakPoint(unitText, remainingChars);

          if (breakPoint > 20) {
            // Add first part to current page
            const firstPart = unitText.slice(0, breakPoint).trim();
            if (currentPageText) {
              currentPageText += unit.isNewParagraph ? '\n\n' : ' ';
            }
            currentPageText += firstPart;

            // Flush current page
            segmentPages.push(currentPageText);

            // Start new page with remainder
            const remainder = unitText.slice(breakPoint).trim();
            currentPageText = remainder;
            currentPageLines = estimateLines(remainder, charsPerLine);
          } else {
            // Not enough space for meaningful content - flush and start fresh
            if (currentPageText) {
              segmentPages.push(currentPageText);
            }
            currentPageText = unitText;
            currentPageLines = unitLines;
          }
        } else {
          // No meaningful space left - flush and start fresh
          if (currentPageText) {
            segmentPages.push(currentPageText);
          }

          // Check if unit itself is too big for one page
          if (unitLines > maxLinesPerPage) {
            // Split the unit across multiple pages
            let remaining = unitText;
            while (remaining.length > 0) {
              const charsForPage = maxLinesPerPage * charsPerLine;
              if (remaining.length <= charsForPage) {
                currentPageText = remaining;
                currentPageLines = estimateLines(remaining, charsPerLine);
                remaining = '';
              } else {
                const breakPoint = findBreakPoint(remaining, charsForPage);
                segmentPages.push(remaining.slice(0, breakPoint).trim());
                remaining = remaining.slice(breakPoint).trim();
              }
            }
          } else {
            currentPageText = unitText;
            currentPageLines = unitLines;
          }
        }
      }
    }

    // Flush any remaining content
    if (currentPageText) {
      segmentPages.push(currentPageText);
    }

    // Convert to page objects
    segmentPages.forEach((pageText, pageIndex) => {
      pages.push({
        key: `${segmentIndex}-${pageIndex}`,
        text: pageText,
        segmentIndex,
        pageIndex,
        totalPagesForSegment: segmentPages.length,
      });
    });
  });

  return pages;
}

/**
 * Finds a good break point in text near the target character count.
 * Prefers breaking at sentence boundaries, then word boundaries.
 */
function findBreakPoint(text, targetChars) {
  if (text.length <= targetChars) {
    return text.length;
  }

  // Look for sentence break near target
  const searchStart = Math.floor(targetChars * 0.7);
  const searchEnd = Math.min(targetChars, text.length);

  // First, try to find a sentence ending (. ! ?)
  for (let i = searchEnd; i >= searchStart; i--) {
    if ((text[i] === '.' || text[i] === '!' || text[i] === '?') &&
        (i + 1 >= text.length || text[i + 1] === ' ')) {
      return i + 1;
    }
  }

  // No sentence break - find a word boundary (space)
  for (let i = searchEnd; i >= searchStart; i--) {
    if (text[i] === ' ') {
      return i;
    }
  }

  // No good break point - just cut at target
  return targetChars;
}
