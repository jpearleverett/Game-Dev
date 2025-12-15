// Default fallback values (will be overridden by dynamic calculation)
const DEFAULT_MAX_LINES = 12;
const DEFAULT_CHARS_PER_LINE = 30;

// Paragraph break consumes vertical space equivalent to ~1.25 lines
// (tighter spacing to fill pages better while maintaining readability)
const PARAGRAPH_BREAK_LINE_COST = 1.25;

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
  // Use 96% of available space to fill pages better while preventing cutoff
  const maxLinesPerPage = Math.max(6, Math.floor((availableHeight / lineHeight) * 0.96));

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

// Soft overflow tolerance - allow slightly exceeding target for better page fill
// This prevents awkward page breaks when just 1-2 lines over
const SOFT_OVERFLOW_TOLERANCE = 1.5;

// Minimum page fill ratio before trying to pull more content
const MIN_FILL_RATIO = 0.65;

/**
 * Paginates narrative segments based on visual line count rather than character count.
 * This prevents text cutoff by accurately modeling how text will render on the page.
 * Uses intelligent page filling to maximize content per page without cutoff.
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

    // Build pages based on line count with intelligent filling
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
      const wouldExceed = currentLineCount + totalLinesNeeded > maxLinesPerPage;
      const overflowAmount = (currentLineCount + totalLinesNeeded) - maxLinesPerPage;

      // Decision logic for whether to include this paragraph on current page:
      // 1. Always include first paragraph on a page
      // 2. Include if it fits within the limit
      // 3. Include with soft overflow if:
      //    - The overflow is within tolerance AND
      //    - The page would be poorly filled without it (below MIN_FILL_RATIO)
      const currentFillRatio = currentLineCount / maxLinesPerPage;
      const allowSoftOverflow =
        wouldExceed &&
        overflowAmount <= SOFT_OVERFLOW_TOLERANCE &&
        currentFillRatio < MIN_FILL_RATIO;

      if (isFirst || !wouldExceed || allowSoftOverflow) {
        currentPage.push(para);
        currentLineCount += totalLinesNeeded;
      } else {
        // Start a new page
        flushCurrentPage();
        currentPage.push(para);
        currentLineCount = para.lines;
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
