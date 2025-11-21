const MAX_NARRATIVE_PAGE_CHARACTERS = 520;

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

    const flushCurrentPage = () => {
      if (!currentPage.length) {
        return;
      }
      pageParagraphs.push(currentPage.join("\n\n"));
      currentPage = [];
    };

    normalizedParagraphs.forEach((paragraph) => {
      const candidate = currentPage.concat(paragraph).join("\n\n");
      if (candidate.length <= maxCharacters || currentPage.length === 0) {
        currentPage.push(paragraph);
        return;
      }

      flushCurrentPage();
      currentPage.push(paragraph);
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
