export function paginateNarrativeSegments(
  segments,
  config = { charsPerLine: 42, linesPerPage: 18 }
) {
  if (!Array.isArray(segments) || !segments.length) {
    return [];
  }

  const { charsPerLine = 42, linesPerPage = 18 } = config;
  const pages = [];

  segments.forEach((rawSegment, segmentIndex) => {
    if (typeof rawSegment !== "string") {
      return;
    }

    // 1. Normalize paragraphs
    const paragraphs = rawSegment
      .replace(/\\n/g, "\n")
      .replace(/\r/g, "")
      .split("\n")
      .map(p => p.trim())
      .filter(Boolean);

    if (!paragraphs.length) return;

    // 2. Simulate line wrapping and pagination
    const segmentPages = [];
    let currentPageLines = [];
    let currentLineCount = 0;

    const flushPage = () => {
      if (currentPageLines.length > 0) {
        segmentPages.push(currentPageLines.join("\n")); // Join lines with newline
        currentPageLines = [];
        currentLineCount = 0;
      }
    };

    paragraphs.forEach((paragraph, pIndex) => {
      // If this is not the first paragraph on the page, add a blank line for spacing
      // BUT if we are at the top of a page, don't add spacing.
      if (currentLineCount > 0) {
         // Check if adding a blank line pushes us over
         if (currentLineCount + 1 >= linesPerPage) {
             flushPage();
         } else {
             currentPageLines.push(""); // Blank line for paragraph break
             currentLineCount++;
         }
      }

      const words = paragraph.split(" ");
      let currentLineText = "";

      words.forEach((word) => {
        // Calculate length if we add this word
        // If line is empty, length is just word. If not, add space + word.
        const potentialLineLength = currentLineText.length > 0 
            ? currentLineText.length + 1 + word.length 
            : word.length;

        if (potentialLineLength <= charsPerLine) {
            currentLineText = currentLineText.length > 0 
                ? currentLineText + " " + word 
                : word;
        } else {
            // Line full, push it
            currentPageLines.push(currentLineText);
            currentLineCount++;
            
            // Start new line with current word
            currentLineText = word;

            // Check if page full
            if (currentLineCount >= linesPerPage) {
                flushPage();
            }
        }
      });

      // Push the last line of the paragraph
      if (currentLineText.length > 0) {
          currentPageLines.push(currentLineText);
          currentLineCount++;
          
          if (currentLineCount >= linesPerPage) {
              flushPage();
          }
      }
    });

    flushPage();

    // 3. Map to result objects
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
