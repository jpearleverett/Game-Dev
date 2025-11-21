const POLAROID_LABEL_WORD_LIMIT = 2;
const POLAROID_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "without",
]);

export const createThumbtackMetrics = (size) => {
  const head = Math.max(12, size);
  const rimThickness = Math.max(2, Math.round(head * 0.16));
  const innerHead = Math.max(6, head - rimThickness * 2);

  const stemHeight = Math.max(8, Math.round(head * 0.72));
  const stemWidth = Math.max(4, Math.round(head * 0.32));
  const stemHighlightWidth = Math.max(2, Math.round(stemWidth * 0.44));
  const stemInset = Math.round(stemHeight * 0.42);
  const visibleStem = Math.max(4, stemHeight - stemInset);
  const stemTop = head - stemInset;
  const stemHighlightHeight = Math.max(3, Math.round(visibleStem * 0.72));
  const stemHighlightTop = head + Math.round(visibleStem * 0.16);

  const tipHeight = Math.max(4, Math.round(head * 0.36));
  const tipWidth = Math.max(stemWidth + 2, Math.round(head * 0.34));
  const tipInset = Math.round(tipHeight * 0.22);
  const tipTop = head + visibleStem - tipInset;

  const offset = Math.round(head * 0.72);
  const clearance = Math.max(8, Math.round(head * 0.52));
  const shineSize = Math.max(4, Math.round(head * 0.4));
  const shineTop = Math.round(head * 0.22);
  const shineLeft = Math.round(head * 0.28);
  const horizontalJitter = Math.max(2, Math.round(head * 0.18));
  const angleRange = 9;
  const pivotOffset = Math.round(head * 0.46);

  return {
    head,
    stemHeight,
    stemWidth,
    stemTop,
    stemHighlightWidth,
    stemHighlightHeight,
    stemHighlightTop,
    tipHeight,
    tipWidth,
    tipTop,
    rimThickness,
    innerHead,
    offset,
    clearance,
    shineSize,
    shineTop,
    shineLeft,
    horizontalJitter,
    angleRange,
    pivotOffset,
  };
};

export const pseudoRandomFromSeed = (seed) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const value = (hash >>> 0) / 4294967295;
  return Number.isFinite(value) && value > 0 ? value : 0.5;
};

export const createThumbtackVariance = (seed, maxHorizontal = 0, maxAngle = 0) => {
  const center = (value) => value * 2 - 1;
  const horizontalBase = pseudoRandomFromSeed(`${seed}-horizontal`);
  const rotationBase = pseudoRandomFromSeed(`${seed}-angle`);

  const horizontalOffset = center(horizontalBase) * maxHorizontal;

  let angle = center(rotationBase) * maxAngle;
  if (maxAngle > 0) {
    const direction = rotationBase >= 0.5 ? 1 : -1;
    const minTilt = maxAngle * 0.35;
    if (Math.abs(angle) < minTilt) {
      angle = direction * minTilt;
    }
  }

  return { horizontalOffset, angle };
};

export function stripEdgePunctuation(word) {
  return word.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "");
}

export function condensePolaroidLine(line, maxWords = POLAROID_LABEL_WORD_LIMIT) {
  if (!line) return "";

  const tokens = String(line)
    .split(/\s+/) 
    .map((token) => stripEdgePunctuation(token))
    .filter(Boolean);

  if (!tokens.length) {
    return "";
  }

  if (tokens.length <= maxWords) {
    return tokens.join(" ");
  }

  const scored = tokens.map((word, index) => {
    const lower = word.toLowerCase();
    let weight = 1;
    if (!POLAROID_STOP_WORDS.has(lower)) {
      weight += 2.4;
    }
    if (/^\d/.test(word)) {
      weight += 1.1;
    }
    if (/^[A-Z]/.test(word)) {
      weight += 0.6;
    }
    weight += Math.min(word.length / 6, 1.2);
    if (index === 0) {
      weight += 0.8;
    }
    if (index === tokens.length - 1) {
      weight += 0.7;
    }
    return { word, index, weight };
  });

  scored.sort((a, b) => {
    if (b.weight === a.weight) {
      return a.index - b.index;
    }
    return b.weight - a.weight;
  });

  const selected = [];
  const used = new Set();

  for (let i = 0; i < scored.length && selected.length < maxWords; i += 1) {
    const entry = scored[i];
    if (!used.has(entry.index)) {
      selected.push(entry);
      used.add(entry.index);
    }
  }

  if (!selected.length) {
    return tokens.slice(0, maxWords).join(" ");
  }

  selected.sort((a, b) => a.index - b.index);
  return selected.map((entry) => entry.word).join(" ");
}

export function buildPolaroidLabel(lines, maxWords = POLAROID_LABEL_WORD_LIMIT) {
  if (!Array.isArray(lines)) {
    return condensePolaroidLine(lines, maxWords).toUpperCase();
  }

  const condensed = lines
    .flatMap((line) => {
      if (line == null) return [];
      if (typeof line === "string" && line.includes("\n")) {
        return line.split("\n");
      }
      return [line];
    })
    .map((line) => condensePolaroidLine(line, maxWords))
    .filter((line) => line && line.trim().length);

  return condensed.map((line) => line.toUpperCase()).join("\n");
}
