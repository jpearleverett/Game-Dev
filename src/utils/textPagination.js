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
 * Estimates how many visual lines a paragraph will take when rendered.
 * This is an approximation - React Native does the actual wrapping.
 */
function estimateParagraphLines(paragraph, charsPerLine) {
  if (!paragraph || charsPerLine <= 0) return 1;
  // Estimate lines based on character count, rounding up
  return Math.max(1, Math.ceil(paragraph.length / charsPerLine));
}

/**
 * Paginates narrative segments by filling pages to capacity.
 * Does NOT manually wrap text - lets React Native handle line breaks naturally.
 * Only splits on paragraph boundaries when possible.
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

  segments.forEach((rawSegment, segmentIndex) => {
    if (typeof rawSegment !== "string") {
      return;
    }

    // Parse paragraphs - keep them intact, don't wrap manually
    const paragraphs = rawSegment
      .replace(/\\n/g, "\n")
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!paragraphs.length) {
      return;
    }

    // Build pages by fitting whole paragraphs when possible
    const segmentPages = [];
    let currentPageParagraphs = [];
    let currentPageLineCount = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      const paraLines = estimateParagraphLines(para, charsPerLine);
      // Add 1 for paragraph spacing (blank line between paragraphs)
      const linesNeeded = currentPageParagraphs.length > 0 ? paraLines + 1 : paraLines;

      // Check if this paragraph fits on current page
      if (currentPageLineCount + linesNeeded <= maxLinesPerPage) {
        currentPageParagraphs.push(para);
        currentPageLineCount += linesNeeded;
      } else {
        // Paragraph doesn't fit - need to handle overflow
        if (currentPageParagraphs.length > 0) {
          // Flush current page first
          segmentPages.push(currentPageParagraphs.join('\n\n'));
          currentPageParagraphs = [];
          currentPageLineCount = 0;
        }

        // Check if paragraph is too long for a single page
        if (paraLines > maxLinesPerPage) {
          // Split long paragraph by sentences or chunks
          const chunks = splitLongParagraph(para, charsPerLine, maxLinesPerPage);
          chunks.forEach((chunk, chunkIdx) => {
            if (chunkIdx === chunks.length - 1) {
              // Last chunk - add to current page for next paragraph
              currentPageParagraphs.push(chunk);
              currentPageLineCount = estimateParagraphLines(chunk, charsPerLine);
            } else {
              // Full chunk - make its own page
              segmentPages.push(chunk);
            }
          });
        } else {
          // Paragraph fits on a fresh page
          currentPageParagraphs.push(para);
          currentPageLineCount = paraLines;
        }
      }
    }

    // Flush remaining paragraphs
    if (currentPageParagraphs.length > 0) {
      segmentPages.push(currentPageParagraphs.join('\n\n'));
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
 * Splits a long paragraph into chunks that fit on pages.
 * Tries to split on sentence boundaries when possible.
 */
function splitLongParagraph(paragraph, charsPerLine, maxLinesPerPage) {
  const maxCharsPerPage = charsPerLine * maxLinesPerPage;
  const chunks = [];

  // Try to split on sentence boundaries (. ! ?)
  const sentences = paragraph.match(/[^.!?]+[.!?]+\s*/g) || [paragraph];

  let currentChunk = '';

  for (const sentence of sentences) {
    const potentialChunk = currentChunk + sentence;

    if (potentialChunk.length <= maxCharsPerPage) {
      currentChunk = potentialChunk;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }

      // If single sentence is too long, split by character count
      if (sentence.length > maxCharsPerPage) {
        let remaining = sentence;
        while (remaining.length > maxCharsPerPage) {
          // Find a good break point (space) near the limit
          let breakPoint = maxCharsPerPage;
          while (breakPoint > maxCharsPerPage * 0.7 && remaining[breakPoint] !== ' ') {
            breakPoint--;
          }
          if (remaining[breakPoint] !== ' ') {
            breakPoint = maxCharsPerPage; // No good break point, just cut
          }
          chunks.push(remaining.slice(0, breakPoint).trim());
          remaining = remaining.slice(breakPoint).trim();
        }
        currentChunk = remaining;
      } else {
        currentChunk = sentence;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [paragraph];
}
