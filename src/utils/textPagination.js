// Default fallback values (will be overridden by dynamic calculation)
const DEFAULT_MAX_LINES = 12;
const DEFAULT_CHARS_PER_LINE = 30;

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
  // Account for some horizontal padding and binder ring area
  const effectiveWidth = pageWidth * 0.88;
  const charsPerLine = Math.max(20, Math.floor(effectiveWidth / charWidth));

  return { maxLinesPerPage, charsPerLine };
}

/**
 * Wraps text into visual lines based on available width.
 * Returns an array of line strings.
 */
function wrapTextToLines(text, charsPerLine) {
  if (!text || charsPerLine <= 0) return [''];

  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];

  const lines = [];
  let currentLine = '';

  for (const word of words) {
    // Handle words longer than line width
    if (word.length > charsPerLine) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      // Break long word across lines
      let remaining = word;
      while (remaining.length > charsPerLine) {
        lines.push(remaining.slice(0, charsPerLine));
        remaining = remaining.slice(charsPerLine);
      }
      currentLine = remaining;
      continue;
    }

    const separator = currentLine ? ' ' : '';
    if ((currentLine + separator + word).length <= charsPerLine) {
      currentLine += separator + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [''];
}

/**
 * Paginates narrative segments by filling pages to capacity.
 * Breaks mid-paragraph when needed to ensure pages are well-filled.
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

    // Convert all paragraphs to wrapped lines with paragraph markers
    const allLines = [];
    paragraphs.forEach((para, idx) => {
      if (idx > 0) {
        // Add blank line between paragraphs
        allLines.push({ type: 'blank', text: '' });
      }
      const wrappedLines = wrapTextToLines(para, charsPerLine);
      wrappedLines.forEach((line) => {
        allLines.push({ type: 'text', text: line });
      });
    });

    // Now paginate by filling each page to capacity
    const segmentPages = [];
    let currentPageLines = [];

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];

      // Check if adding this line would exceed capacity
      if (currentPageLines.length >= maxLinesPerPage) {
        // Flush current page
        segmentPages.push(currentPageLines);
        currentPageLines = [];
      }

      // Skip leading blank lines on a new page
      if (currentPageLines.length === 0 && line.type === 'blank') {
        continue;
      }

      // Skip trailing blank line if it would be the last line and we're near capacity
      if (line.type === 'blank' && currentPageLines.length >= maxLinesPerPage - 1) {
        continue;
      }

      currentPageLines.push(line);
    }

    // Flush remaining lines
    if (currentPageLines.length > 0) {
      // Remove trailing blank lines from last page
      while (currentPageLines.length > 0 && currentPageLines[currentPageLines.length - 1].type === 'blank') {
        currentPageLines.pop();
      }
      if (currentPageLines.length > 0) {
        segmentPages.push(currentPageLines);
      }
    }

    // Convert line arrays back to text for each page
    segmentPages.forEach((pageLines, pageIndex) => {
      // Build text, converting blank lines to paragraph breaks
      let text = '';
      let prevWasBlank = false;

      for (const line of pageLines) {
        if (line.type === 'blank') {
          prevWasBlank = true;
        } else {
          if (text && prevWasBlank) {
            text += '\n\n' + line.text;
          } else if (text) {
            text += '\n' + line.text;
          } else {
            text = line.text;
          }
          prevWasBlank = false;
        }
      }

      pages.push({
        key: `${segmentIndex}-${pageIndex}`,
        text,
        segmentIndex,
        pageIndex,
        totalPagesForSegment: segmentPages.length,
      });
    });
  });

  return pages;
}
