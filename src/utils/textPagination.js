const MAX_NARRATIVE_PAGE_CHARACTERS = 850;
const PARAGRAPH_BREAK_WEIGHT = 80;

export function paginateNarrativeSegments(
  segments,
  maxCharacters = MAX_NARRATIVE_PAGE_CHARACTERS,
) {
  if (!Array.isArray(segments) || !segments.length) {
    return [];
  }

  const pages = [];

  segments.forEach((rawSegment, segmentIndex) => {
    if (typeof rawSegment !== "string") {
      return;
    }

    const normalizedParagraphs = rawSegment
      .replace(/\\n/g, "\n") // Handle escaped newlines from LLM JSON
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .reduce((acc, paragraph) => {
        if (!paragraph) {
          return acc;
        }

        if (paragraph.length <= maxCharacters) {
          acc.push(paragraph);
          return acc;
        }

        let start = 0;
        while (start < paragraph.length) {
          let chunkEnd = Math.min(start + maxCharacters, paragraph.length);
          if (chunkEnd < paragraph.length) {
            const whitespaceIndex = paragraph.lastIndexOf(" ", chunkEnd);
            if (whitespaceIndex > start + maxCharacters * 0.4) {
              chunkEnd = whitespaceIndex;
            }
          }
          const chunk = paragraph.slice(start, chunkEnd).trim();
          if (!chunk) {
            break;
          }
          acc.push(chunk);
          start = chunkEnd;
        }
        return acc;
      }, []);

    if (!normalizedParagraphs.length) {
      return;
    }

    const pageParagraphs = [];
    let currentPage = [];
    let currentWeight = 0;

    const flushCurrentPage = () => {
      if (!currentPage.length) {
        return;
      }
      pageParagraphs.push(currentPage.join("\n\n"));
      currentPage = [];
      currentWeight = 0;
    };

    normalizedParagraphs.forEach((paragraph) => {
      const isFirst = currentPage.length === 0;
      const addedWeight = paragraph.length + (isFirst ? 0 : 2 + PARAGRAPH_BREAK_WEIGHT);

      if (currentWeight + addedWeight <= maxCharacters || isFirst) {
        currentPage.push(paragraph);
        currentWeight += addedWeight;
        return;
      }

      flushCurrentPage();
      currentPage.push(paragraph);
      currentWeight = paragraph.length;
    });

    flushCurrentPage();

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
