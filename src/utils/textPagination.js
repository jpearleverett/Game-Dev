// Default fallback values (will be overridden by dynamic calculation)
const DEFAULT_MAX_LINES = 12;
const DEFAULT_CHARS_PER_LINE = 30;

// Paragraph break consumes vertical space equivalent to ~1.5 lines
const PARAGRAPH_BREAK_LINE_COST = 1.5;

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

  // Calculate max lines that fit (with a small safety margin)
  const maxLinesPerPage = Math.max(6, Math.floor((availableHeight / lineHeight) * 0.92));

  // Calculate characters per line based on available width and monospace font
  const charWidth = fontSize * MONOSPACE_CHAR_WIDTH_RATIO;
  // Account for some horizontal padding and binder ring area
  const effectiveWidth = pageWidth * 0.88;
  const charsPerLine = Math.max(20, Math.floor(effectiveWidth / charWidth));

  return { maxLinesPerPage, charsPerLine };
}

/**
 * Estimates how many visual lines a paragraph will occupy when rendered.
 * Uses word-wrap simulation to get accurate line counts.
 */
function estimateParagraphLines(text, charsPerLine) {
  if (!text || charsPerLine <= 0) return 1;

  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return 1;

  let lines = 1;
  let currentLineLength = 0;

  for (const word of words) {
    const wordLength = word.length;

    // If word alone exceeds line width, it will wrap onto multiple lines
    if (wordLength > charsPerLine) {
      if (currentLineLength > 0) {
        lines++; // Start new line for long word
      }
      lines += Math.ceil(wordLength / charsPerLine) - 1;
      currentLineLength = wordLength % charsPerLine || charsPerLine;
      continue;
    }

    // Check if word fits on current line (account for space between words)
    const spaceNeeded = currentLineLength > 0 ? 1 : 0;
    if (currentLineLength + spaceNeeded + wordLength > charsPerLine) {
      lines++;
      currentLineLength = wordLength;
    } else {
      currentLineLength += spaceNeeded + wordLength;
    }
  }

  return lines;
}

/**
 * Paginates narrative segments based on visual line count rather than character count.
 * This prevents text cutoff by accurately modeling how text will render on the page.
 *
 * @param {string[]} segments - Array of narrative text segments
 * @param {Object} options - Pagination options
 * @param {number} options.maxLinesPerPage - Maximum visual lines per page
 * @param {number} options.charsPerLine - Estimated characters per line (based on container width and font)
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

    // Parse and normalize paragraphs
    const paragraphs = rawSegment
      .replace(/\\n/g, "\n") // Handle escaped newlines from LLM JSON
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!paragraphs.length) {
      return;
    }

    // Calculate line count for each paragraph
    const paragraphsWithLines = paragraphs.map((text) => ({
      text,
      lines: estimateParagraphLines(text, charsPerLine),
    }));

    // Build pages based on line count
    const pageParagraphs = [];
    let currentPage = [];
    let currentLineCount = 0;

    const flushCurrentPage = () => {
      if (!currentPage.length) return;
      pageParagraphs.push(currentPage.map((p) => p.text).join("\n\n"));
      currentPage = [];
      currentLineCount = 0;
    };

    paragraphsWithLines.forEach((para) => {
      const isFirst = currentPage.length === 0;
      // Account for paragraph break spacing (except for first paragraph)
      const breakCost = isFirst ? 0 : PARAGRAPH_BREAK_LINE_COST;
      const totalLinesNeeded = para.lines + breakCost;

      // If adding this paragraph would exceed max lines, start a new page
      // Exception: if it's the first paragraph on the page, we must include it
      if (!isFirst && currentLineCount + totalLinesNeeded > maxLinesPerPage) {
        flushCurrentPage();
        currentPage.push(para);
        currentLineCount = para.lines;
      } else {
        currentPage.push(para);
        currentLineCount += totalLinesNeeded;
      }
    });

    flushCurrentPage();

    // Create page objects
    pageParagraphs.forEach((pageText, pageIndex) => {
      pages.push({
        key: `${segmentIndex}-${pageIndex}`,
        text: pageText,
        segmentIndex,
        pageIndex,
        totalPagesForSegment: pageParagraphs.length,
      });
    });
  });

  return pages;
}
