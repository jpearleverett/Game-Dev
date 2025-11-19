import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import ScreenSurface from "../components/ScreenSurface";
import CaseBriefOverlay from "../components/CaseBriefOverlay";
import SecondaryButton from "../components/SecondaryButton";
import WordCard from "../components/WordCard";
import PrimaryButton from "../components/PrimaryButton";
import SolvedStampAnimation from "../components/SolvedStampAnimation";
import { COLORS } from "../constants/colors";
import { FONTS, FONT_SIZES } from "../constants/typography";
import { RADIUS, SPACING } from "../constants/layout";
import { GAME_STATUS } from "../context/GameContext";
import useResponsiveLayout from "../hooks/useResponsiveLayout";
import { getBoardProfile } from "../utils/caseNumbers";

const STATUS_LABELS = {
  [GAME_STATUS.IN_PROGRESS]: "ACTIVE INVESTIGATION",
  [GAME_STATUS.SOLVED]: "CASE CLOSED",
  [GAME_STATUS.FAILED]: "ARCHIVED FOR REVIEW",
};

const BRANCH_COLORS = {
  A: { solid: COLORS.branchPathA, soft: COLORS.branchPathASoft },
  B: { solid: COLORS.branchPathB, soft: COLORS.branchPathBSoft },
  default: { solid: COLORS.branchPathB, soft: COLORS.branchPathBSoft },
};

const DEAD_LETTERS_LOGO = require("../../assets/images/ui/branding/logo.png");
const BOARD_NOISE_TEXTURE = require("../../assets/images/ui/backgrounds/noise-texture.png");
const BOARD_CORNER_TL = require("../../assets/images/ui/decorative/corner-ornament-tl.png");
const BOARD_CORNER_TR = require("../../assets/images/ui/decorative/corner-ornament-tr.png");
const BOARD_CORNER_BL = require("../../assets/images/ui/decorative/corner-ornament-bl.png");
const BOARD_CORNER_BR = require("../../assets/images/ui/decorative/corner-ornament-br.png");
const POLAROID_ASPECT_RATIO = 1.18;
const CASE_TITLE_OVERLAP_RATIO = -0.05;
const POLAROID_IMAGES = {
  buyer: require("../../assets/images/characters/portraits/buyer.png"),
  default: require("../../assets/images/characters/portraits/default.png"),
  keeper: require("../../assets/images/characters/portraits/keeper.png"),
  lex: require("../../assets/images/characters/portraits/lex.png"),
  silence: require("../../assets/images/characters/portraits/silence.png"),
  sparkle: require("../../assets/images/characters/portraits/sparkle.png"),
  voice: require("../../assets/images/characters/portraits/voice.png"),
  midnightConfessor: require("../../assets/characters/the-voice.jpg"),
  eleanorBellamy: require("../../assets/characters/default.jpg"),
  blackEnvelope: require("../../assets/images/icons/ui/lore-book.png"),
  claireThornhill: require("../../assets/characters/lex.jpg"),
  silasReed: require("../../assets/characters/the-keeper.jpg"),
  bluelineDiner: require("../../assets/backgrounds/splash-background.jpg"),
  harborPrecinct: require("../../assets/images/ui/backgrounds/background-dark.png"),
  marcusWebb: require("../../assets/characters/sparkle.jpg"),
  emilyCross: require("../../assets/characters/the-silence.jpg"),
  sarahReeves: require("../../assets/characters/lex.jpg"),
  mayaBellamy: require("../../assets/characters/default.jpg"),
  victoriaAshford: require("../../assets/characters/the-voice.jpg"),
  helenPrice: require("../../assets/characters/the-silence.jpg"),
  lisaChen: require("../../assets/characters/default.jpg"),
  tomWade: require("../../assets/characters/the-keeper.jpg"),
  margaretHalloway: require("../../assets/characters/default.jpg"),
  murphysBar: require("../../assets/images/ui/backgrounds/background-dark.png"),
  agentMartinez: require("../../assets/characters/the-keeper.jpg"),
};

const POLAROID_LABEL_WORD_LIMIT = 3;
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

const createThumbtackMetrics = (size) => {
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

const pseudoRandomFromSeed = (seed) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const value = (hash >>> 0) / 4294967295;
  return Number.isFinite(value) && value > 0 ? value : 0.5;
};

const createThumbtackVariance = (seed, maxHorizontal = 0, maxAngle = 0) => {
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

function stripEdgePunctuation(word) {
  return word.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "");
}

function condensePolaroidLine(line, maxWords = POLAROID_LABEL_WORD_LIMIT) {
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

function buildPolaroidLabel(lines, maxWords = POLAROID_LABEL_WORD_LIMIT) {
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

function deriveWordState(
  word,
  { selectedWords, confirmedOutliers, lockedMainWords },
) {
  if (confirmedOutliers.includes(word)) return "lockedOutlier";
  if (lockedMainWords.includes(word)) return "lockedMain";
  if (selectedWords.includes(word)) return "selected";
  return "default";
}

export default function EvidenceBoardScreen({
  activeCase,
  cases = [],
  storyProgress,
  solvedCaseIds = [],
  attemptsRemaining,
  selectedWords,
  confirmedOutliers,
  lockedMainWords,
  status,
  colorBlindMode = false,
  highContrast = false,
  hintsEnabled = false,
  premiumUnlocked = false,
  reducedMotion = false,
  briefingSeen = false,
  onBriefingSeen,
  onToggleWord,
  onSubmitGuess,
  onBack,
  onSkipToResults,
}) {
  const board = activeCase?.board || { grid: [], outlierWords: [] };
  const storyDecision = activeCase?.storyDecision;
  const { grid, outlierWords } = board;
  const {
    width,
    moderateScale,
    scaleSpacing,
    scaleRadius,
    sizeClass,
    isTablet,
    shortest,
  } = useResponsiveLayout();

    const compact = sizeClass === "xsmall" || sizeClass === "small";
    const boardProfile = useMemo(() => {
      if (activeCase?.board?.profile) {
        return activeCase.board.profile;
      }
      return getBoardProfile(activeCase?.caseNumber);
    }, [activeCase?.board?.profile, activeCase?.caseNumber]);
    const isBranchingBoard = boardProfile?.branching;
    const baseColumns = isTablet ? 5 : compact ? 4 : 4;
    const columns = isBranchingBoard ? boardProfile.columns : baseColumns;

    const wordCells = useMemo(() => {
    if (!Array.isArray(grid) || !grid.length) return [];
    return grid.flat().map((word, index) => ({ id: `${word}-${index}`, word }));
  }, [grid]);
    const branchingSets = useMemo(() => {
      const sets = activeCase?.board?.branchingOutlierSets;
      if (!Array.isArray(sets) || !sets.length) {
        return null;
      }
      return sets.map((set, index) => ({
        key: set.optionKey || set.key || String.fromCharCode(65 + index),
        optionKey: set.optionKey || set.key || String.fromCharCode(65 + index),
        label: set.label || null,
        words: Array.isArray(set.words) ? set.words : [],
          theme: set.theme || null,
      }));
    }, [activeCase?.board?.branchingOutlierSets]);
    const branchWordLookup = useMemo(() => {
      if (!branchingSets) return {};
      const lookup = {};
      branchingSets.forEach((set) => {
        set.words.forEach((word) => {
          if (word) {
            lookup[String(word).toUpperCase()] = set.optionKey || set.key;
          }
        });
      });
      return lookup;
    }, [branchingSets]);
    const branchLegend = useMemo(() => {
      if (!branchingSets) return [];
      const optionLookup = new Map();
      (storyDecision?.options || []).forEach((option) => {
        if (option?.key) {
          optionLookup.set(option.key, option);
        }
      });
      return branchingSets.map((set) => {
        const key = set.optionKey || set.key;
        const option = optionLookup.get(key);
        const colors = BRANCH_COLORS[key] || BRANCH_COLORS.default;
          const themeName = set.theme?.name || null;
          const themeIcon = set.theme?.icon ? `${set.theme.icon} ` : '';
          const themeLabel = themeName ? `${themeIcon}${themeName}`.trim() : null;
        return {
          key,
          legendLabel: option?.title || set.label || `Path ${key}`,
            themeLabel,
          badgeLabel: `PATH ${key}`,
          color: colors.solid,
          soft: colors.soft,
        };
      });
    }, [branchingSets, storyDecision?.options]);
    const branchMetaByKey = useMemo(() => {
      const map = {};
      branchLegend.forEach((entry) => {
        map[entry.key] = entry;
      });
      return map;
    }, [branchLegend]);

  const confirmedSlots = useMemo(() => {
    const slotCount = Math.max(outlierWords?.length || 0, 3);
    return Array.from({ length: slotCount }).map((_, index) => {
      const actualWord = outlierWords[index];
      return {
        id: actualWord ? `${actualWord}-${index}` : `slot-${index}`,
        word: actualWord,
        filled: actualWord ? confirmedOutliers.includes(actualWord) : false,
      };
    });
  }, [outlierWords, confirmedOutliers]);

  const outlierCelebration = useMemo(() => {
    if (!wordCells.length) {
      return { delaysById: {}, totalDuration: 0 };
    }

    const baseDelay = 220;
    const highlightDuration = 1150;
    const cooldown = 420;

    const delaysById = {};
    let index = 0;
    const confirmedLookup = new Set(confirmedOutliers);

    wordCells.forEach((cell) => {
      if (confirmedLookup.has(cell.word)) {
        delaysById[cell.id] = index * baseDelay;
        index += 1;
      }
    });

    const totalDuration =
      index > 0 ? (index - 1) * baseDelay + highlightDuration + cooldown : 0;

    return { delaysById, totalDuration };
  }, [wordCells, confirmedOutliers]);

  const caseNumberLabel =
    activeCase?.caseNumber != null
      ? String(activeCase.caseNumber).padStart(3, "0")
      : "---";
  const caseTitle = activeCase?.title || "Untitled Case";
  const caseTitleHeader = caseTitle.toUpperCase();
  const caseTitleThumbtack = useMemo(
    () =>
      createThumbtackMetrics(
        Math.max(18, Math.round(moderateScale(compact ? 24 : 28))),
      ),
    [moderateScale, compact],
  );
  const caseTitleThumbtackVariance = useMemo(
    () =>
      createThumbtackVariance(
        `case-title-${activeCase?.id ?? "unknown"}`,
        caseTitleThumbtack.horizontalJitter,
        caseTitleThumbtack.angleRange,
      ),
    [activeCase?.id, caseTitleThumbtack],
  );

  const outlierCount = outlierWords?.length || 0;
    const instructions = outlierCount
      ? isBranchingBoard
        ? `FIND BOTH LEADS (${outlierCount} words · 4 per path)`
        : `FIND the OUTLIERS (${outlierCount} ${outlierCount === 1 ? "word" : "words"})`
      : isBranchingBoard
        ? "FIND BOTH LEADS"
        : "FIND the OUTLIERS";

  const selectedCount = selectedWords.length;
  const uniqueOutlierCount = Array.isArray(outlierWords)
    ? new Set(
        outlierWords.filter(
          (word) => typeof word === "string" && word.trim().length,
        ),
      ).size
    : 0;
  const confirmedOutlierCount = Array.isArray(confirmedOutliers)
    ? confirmedOutliers.length
    : 0;
  const remainingOutlierSlots =
    uniqueOutlierCount > 0
      ? Math.max(uniqueOutlierCount - confirmedOutlierCount, 0)
      : Infinity;
  const selectionLimitReached =
    remainingOutlierSlots !== Infinity &&
    selectedCount >= remainingOutlierSlots;
  const totalAttempts = activeCase?.attempts ?? Math.max(attemptsRemaining, 1);
  const solved = status === GAME_STATUS.SOLVED;
  const failed = status === GAME_STATUS.FAILED;
  const inProgress = status === GAME_STATUS.IN_PROGRESS;
  const hintsActive = hintsEnabled && premiumUnlocked;
  const statusLabel =
    STATUS_LABELS[status] || STATUS_LABELS[GAME_STATUS.IN_PROGRESS];
  const normalizedSolvedCaseIds = useMemo(
    () =>
      Array.isArray(solvedCaseIds)
        ? solvedCaseIds.filter(
            (id) => typeof id === "number" && Number.isFinite(id),
          )
        : [],
    [solvedCaseIds],
  );
  const casePool = useMemo(
    () =>
      Array.isArray(cases) && cases.length
        ? cases
        : activeCase
          ? [activeCase]
          : [],
    [cases, activeCase],
  );
  const previousCaseId = useMemo(() => {
    const currentId = activeCase?.id;
    if (!currentId) return null;
    const candidates = [];
    const lastStoryCaseId = storyProgress?.lastCompletedCaseId;
    if (typeof lastStoryCaseId === "number" && lastStoryCaseId < currentId) {
      candidates.push(lastStoryCaseId);
    }
    normalizedSolvedCaseIds.forEach((id) => {
      if (id < currentId && !candidates.includes(id)) {
        candidates.push(id);
      }
    });
    if (candidates.length) {
      return Math.max(...candidates);
    }
    if (currentId > 1) {
      return currentId - 1;
    }
    return null;
  }, [
    activeCase?.id,
    storyProgress?.lastCompletedCaseId,
    normalizedSolvedCaseIds,
  ]);
  const previousCaseData = useMemo(
    () =>
      previousCaseId
        ? casePool.find((item) => item.id === previousCaseId) || null
        : null,
    [casePool, previousCaseId],
  );
  const previousCaseMeta = useMemo(() => {
    if (!previousCaseData) return null;
    const caseNumberRaw =
      previousCaseData.caseNumber != null && previousCaseData.caseNumber !== ""
        ? previousCaseData.caseNumber
        : previousCaseData.id;
    const caseNumber =
      caseNumberRaw != null ? String(caseNumberRaw).padStart(3, "0") : "---";
    return {
      caseNumber,
      title: previousCaseData.title || "",
      mainTheme: previousCaseData.mainTheme?.name || null,
      outlierTheme: previousCaseData.outlierTheme?.name || null,
    };
  }, [previousCaseData]);
  const recapLabel = previousCaseMeta ? "LAST CASE RECAP" : "BOARD BRIEF";
  const recapText = useMemo(() => {
    const lines = previousCaseMeta
      ? [
          `Case ${previousCaseMeta.caseNumber}: ${previousCaseMeta.title || "Assigned"}`,
          previousCaseMeta.mainTheme
            ? `Theme: ${previousCaseMeta.mainTheme}`
            : null,
          previousCaseMeta.outlierTheme
            ? `Outlier: ${previousCaseMeta.outlierTheme}`
            : null,
        ].filter(Boolean)
      : [`Case ${caseNumberLabel}: ${caseTitle}`, "Trace every lead."];
    return lines.map((line) => line.toUpperCase()).join("\n");
  }, [previousCaseMeta, caseNumberLabel, caseTitle]);
  const defaultPolaroids = useMemo(() => {
    const formatLine = (line) =>
      buildPolaroidLabel([line], POLAROID_LABEL_WORD_LIMIT);

    if (previousCaseMeta) {
      const rawLines = [
        `Case ${previousCaseMeta.caseNumber}: ${previousCaseMeta.title || "Unnamed"}`,
        previousCaseMeta.mainTheme
          ? `Theme: ${previousCaseMeta.mainTheme}`
          : "Theme: Unknown",
        previousCaseMeta.outlierTheme
          ? `Outlier: ${previousCaseMeta.outlierTheme}`
          : "Outlier: Unknown",
      ];
      const keys = ["keeper", "voice", "buyer"];
      return keys.map((imageKey, index) => {
        const selectedLine =
          rawLines[index] ?? rawLines[rawLines.length - 1] ?? "";
        return {
          id: `default-meta-${index}`,
          imageKey,
          label: formatLine(selectedLine),
        };
      });
    }

    const rawLines = [
      `Case ${caseNumberLabel}: ${caseTitle}`,
      "Stay sharp, detective.",
      "Complete the case to unlock intel.",
    ];
    const keys = ["lex", "sparkle", "silence"];
    return keys.map((imageKey, index) => {
      const selectedLine =
        rawLines[index] ?? rawLines[rawLines.length - 1] ?? "";
      return {
        id: `default-generic-${index}`,
        imageKey,
        label: formatLine(selectedLine),
      };
    });
  }, [previousCaseMeta, caseNumberLabel, caseTitle]);
  const unlockedPolaroids = useMemo(() => {
    const entries = previousCaseData?.evidenceBoard?.polaroids;
    if (!Array.isArray(entries) || !entries.length) {
      return null;
    }
    return entries
      .map((item, index) => {
        if (!item) return null;
        const lines = [];
        if (item.title) lines.push(item.title);
        if (item.subtitle) lines.push(item.subtitle);
        if (item.detail) lines.push(item.detail);
        if (!lines.length && item.label) lines.push(item.label);
        const labelText = buildPolaroidLabel(lines, POLAROID_LABEL_WORD_LIMIT);
        return {
          id:
            item.id ||
            `previous-${previousCaseMeta?.caseNumber ?? previousCaseData?.id}-${index}`,
          imageKey: item.imageKey || null,
          label: labelText,
        };
      })
      .filter(Boolean);
  }, [
    previousCaseData?.evidenceBoard?.polaroids,
    previousCaseMeta?.caseNumber,
    previousCaseData?.id,
  ]);

  const [briefVisible, setBriefVisible] = useState(
    () => !briefingSeen && inProgress,
  );

  useEffect(() => {
    if (!activeCase?.id) {
      setBriefVisible(false);
      return;
    }
    if (!inProgress) {
      setBriefVisible(false);
      return;
    }
    if (!briefingSeen) {
      setBriefVisible(true);
    }
  }, [activeCase?.id, inProgress, briefingSeen]);

  const handleBriefDismiss = useCallback(() => {
    if (activeCase?.id) {
      onBriefingSeen?.(activeCase.id);
    }
    setBriefVisible(false);
  }, [activeCase?.id, onBriefingSeen]);

  const [celebratingOutliers, setCelebratingOutliers] = useState(false);
  const [stampReady, setStampReady] = useState(false);
  const celebrationTimerRef = useRef(null);

  useEffect(() => {
    if (celebrationTimerRef.current) {
      clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = null;
    }

    if (!solved) {
      setCelebratingOutliers(false);
      setStampReady(false);
      return;
    }

    if (reducedMotion) {
      setCelebratingOutliers(false);
      setStampReady(true);
      return;
    }

    setCelebratingOutliers(true);
    setStampReady(false);

    const totalDuration = Math.max(outlierCelebration.totalDuration, 900);

    celebrationTimerRef.current = setTimeout(() => {
      setStampReady(true);
      setCelebratingOutliers(false);
      celebrationTimerRef.current = null;
    }, totalDuration);

    return () => {
      if (celebrationTimerRef.current) {
        clearTimeout(celebrationTimerRef.current);
        celebrationTimerRef.current = null;
      }
    };
  }, [solved, reducedMotion, outlierCelebration.totalDuration]);

  const handleHintRequest = useCallback(
    (word) => {
      if (!hintsActive) return;
      const isOutlier = outlierWords.includes(word);
      Alert.alert(
        "Hint",
        isOutlier
          ? `${word} is an OUTLIER.`
          : `${word} belongs to the main theme.`,
      );
    },
    [hintsActive, outlierWords],
  );

  const celebrationDelays = outlierCelebration.delaysById;
  const awaitingStamp = solved && !stampReady;
  const submitLabel = solved
    ? "View Results"
    : failed
      ? "Review Case"
      : "Submit Guess";
  const submitHandler = solved || failed ? onSkipToResults : onSubmitGuess;
  const submitDisabled = awaitingStamp
    ? true
    : inProgress
      ? selectedCount === 0
      : false;

  const [boardLayout, setBoardLayout] = useState(null);
  const [gridOffset, setGridOffset] = useState({ x: 0, y: 0 });
  const [wordLayouts, setWordLayouts] = useState({});
  const [objectiveLayout, setObjectiveLayout] = useState(null);
  const [confirmedGridOffset, setConfirmedGridOffset] = useState({
    x: 0,
    y: 0,
  });
  const [confirmedSlotLayouts, setConfirmedSlotLayouts] = useState({});
  const [evidenceAnchors, setEvidenceAnchors] = useState({});
  const [stringSources, setStringSources] = useState({});

  const stringPulse = useRef(new Animated.Value(0)).current;

  const sizeConfig = useMemo(() => {
    if (isTablet) {
      return {
        surface: 24,
        vertical: 28,
        frame: 26,
        board: 20,
        noteV: 12,
        noteH: SPACING.xl,
        tile: 8,
        navSlot: 148,
        string: 3,
        polaroid: 154,
        footer: SPACING.xl,
        contentMaxWidth: 720,
      };
    }

    switch (sizeClass) {
      case "xsmall":
        return {
          surface: 10,
          vertical: 14,
          frame: 11,
          board: 10,
          noteV: 6,
          noteH: 18,
          tile: 2.5,
          navSlot: 88,
          string: 1.2,
          polaroid: 112,
          footer: SPACING.md,
          contentMaxWidth: 420,
        };
      case "small":
        return {
          surface: 12,
          vertical: 16,
          frame: 13,
          board: 12,
          noteV: 7,
          noteH: 20,
          tile: 3,
          navSlot: 96,
          string: 1.4,
          polaroid: 126,
          footer: SPACING.md,
          contentMaxWidth: 460,
        };
      case "medium":
        return {
          surface: 14,
          vertical: 20,
          frame: 15,
          board: 14,
          noteV: 8,
          noteH: 22,
          tile: 3.5,
          navSlot: 106,
          string: 1.8,
          polaroid: 138,
          footer: SPACING.lg,
          contentMaxWidth: 520,
        };
      case "large":
      default:
        return {
          surface: 16,
          vertical: 22,
          frame: 17,
          board: 16,
          noteV: 9,
          noteH: SPACING.lg,
          tile: 4,
          navSlot: 118,
          string: 2.1,
          polaroid: 148,
          footer: SPACING.lg,
          contentMaxWidth: 560,
        };
    }
  }, [isTablet, sizeClass]);

  const horizontalPadding = scaleSpacing(sizeConfig.surface);
  const verticalPadding = scaleSpacing(sizeConfig.vertical);
  const framePadding = scaleSpacing(sizeConfig.frame);
  const boardPadding = scaleSpacing(sizeConfig.board);
  const objectivePaddingVertical = scaleSpacing(sizeConfig.noteV);
  const objectivePaddingHorizontal = scaleSpacing(sizeConfig.noteH);
  const tilePadding = scaleSpacing(sizeConfig.tile);
  const stringThickness = Math.max(1.6, scaleSpacing(sizeConfig.string));
  const polaroidScale = 0.92;
  const polaroidSize = scaleSpacing(sizeConfig.polaroid) * polaroidScale;
  const polaroidLift = polaroidSize * 0.08;
  const polaroidHeight = polaroidSize * POLAROID_ASPECT_RATIO;
  const polaroidStackBottom =
    polaroidHeight - polaroidLift + boardPadding * 0.2;
  const caseTitleMarginTop = Math.max(
    polaroidStackBottom - polaroidSize * CASE_TITLE_OVERLAP_RATIO,
    scaleSpacing(SPACING.lg),
  );
  const contentMaxWidth = Math.min(sizeConfig.contentMaxWidth, shortest * 0.92);
  const navSlotWidth = Math.max(
    scaleSpacing(sizeConfig.navSlot),
    sizeConfig.navSlot * 0.85,
  );
  const footerSpacing = scaleSpacing(sizeConfig.footer);
  const boardRadius = scaleRadius(RADIUS.xl);
  const frameRadius = scaleRadius(RADIUS.xl * 1.05);
  const availableWidth = Math.max(width - horizontalPadding * 2, 0);
  const safeContentWidth = Math.min(
    contentMaxWidth,
    availableWidth > 0 ? availableWidth : width,
  );

  useEffect(() => {
    if (reducedMotion) {
      stringPulse.setValue(0.35);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(stringPulse, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(stringPulse, {
          toValue: 0,
          duration: 3600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [stringPulse, reducedMotion]);

  const handleBoardLayout = useCallback(({ nativeEvent: { layout } }) => {
    setBoardLayout(layout);
  }, []);

  const handleGridLayout = useCallback(({ nativeEvent: { layout } }) => {
    setGridOffset({ x: layout.x, y: layout.y });
  }, []);

  const handleObjectiveNoteLayout = useCallback(
    ({ nativeEvent: { layout } }) => {
      setObjectiveLayout(layout);
    },
    [],
  );

  const makeWordLayoutHandler = useCallback(
    (id, word) =>
      ({ nativeEvent: { layout } }) => {
        setWordLayouts((prev) => {
          const current = prev[id];
          if (
            current &&
            current.x === layout.x &&
            current.y === layout.y &&
            current.width === layout.width &&
            current.height === layout.height &&
            current.word === word
          ) {
            return prev;
          }
          return {
            ...prev,
            [id]: { word, ...layout },
          };
        });
      },
    [],
  );

  const handleConfirmedGridLayout = useCallback(
    ({ nativeEvent: { layout } }) => {
      setConfirmedGridOffset({ x: layout.x, y: layout.y });
    },
    [],
  );

  const makeConfirmedSlotLayoutHandler = useCallback(
    (id, word) =>
      ({ nativeEvent: { layout } }) => {
        setConfirmedSlotLayouts((prev) => ({
          ...prev,
          [id]: { word, ...layout },
        }));
      },
    [],
  );

  const makeEvidenceAnchorHandler = useCallback(
    (id) =>
      ({ nativeEvent: { layout } }) => {
        setEvidenceAnchors((prev) => {
          const center = {
            id,
            x: layout.x + layout.width / 2,
            y: layout.y + layout.height / 2,
          };
          const current = prev[id];
          if (current && current.x === center.x && current.y === center.y) {
            return prev;
          }
          return {
            ...prev,
            [id]: center,
          };
        });
      },
    [],
  );

  const objectiveAnchor = useMemo(() => {
    if (!objectiveLayout) return null;
    return {
      x: objectiveLayout.x + objectiveLayout.width / 2,
      y: objectiveLayout.y + objectiveLayout.height / 2,
    };
  }, [objectiveLayout]);

  const wordAnchors = useMemo(() => {
    if (!boardLayout) return {};
    const anchors = {};
    Object.values(wordLayouts).forEach(({ word, x, y, width, height }) => {
      const anchor = {
        x: gridOffset.x + x + width / 2,
        y: gridOffset.y + y + height / 2,
      };
      if (!anchors[word]) {
        anchors[word] = [];
      }
      anchors[word].push(anchor);
    });
    return anchors;
  }, [wordLayouts, gridOffset, boardLayout]);

  const confirmedSlotAnchors = useMemo(() => {
    const anchors = {};
    Object.entries(confirmedSlotLayouts).forEach(
      ([id, { word, x, y, width, height }]) => {
        anchors[id] = {
          word,
          x: confirmedGridOffset.x + x + width / 2,
          y: confirmedGridOffset.y + y + height / 2,
        };
      },
    );
    return anchors;
  }, [confirmedSlotLayouts, confirmedGridOffset]);

  const wordTilts = useMemo(() => {
    const map = {};
    wordCells.forEach((cell, index) => {
      const seed = (cell.word ? cell.word.length * 7 : 3) + index * 11;
      const tilt = ((seed % 9) - 4) * 1.1;
      map[cell.id] = tilt;
    });
    return map;
  }, [wordCells]);

  const connectors = useMemo(() => {
    if (!objectiveAnchor || !boardLayout) return [];
    const lines = [];

    selectedWords.forEach((word, index) => {
      const anchorsForWord = wordAnchors[word];
      if (!anchorsForWord || !anchorsForWord.length) return;
      const sourceId = stringSources[word];
      const origin = (sourceId && evidenceAnchors[sourceId]) || objectiveAnchor;
      if (!origin) return;
      const anchor = anchorsForWord[0];
      lines.push({
        id: `active-${word}-${index}`,
        from: origin,
        to: anchor,
        tone: "active",
      });
    });

    confirmedOutliers.forEach((word, index) => {
      const anchorsForWord = wordAnchors[word];
      if (!anchorsForWord || !anchorsForWord.length) return;
      const slotEntry = Object.values(confirmedSlotAnchors).find(
        (slot) => slot.word === word,
      );
      if (!slotEntry) return;
      lines.push({
        id: `outlier-${word}-${index}`,
        from: anchorsForWord[0],
        to: slotEntry,
        tone: "confirmed",
      });
    });

    Object.values(evidenceAnchors).forEach((anchor) => {
      lines.push({
        id: `decor-${anchor.id}`,
        from: objectiveAnchor,
        to: anchor,
        tone: "decor",
      });
    });

    return lines;
  }, [
    objectiveAnchor,
    boardLayout,
    wordAnchors,
    confirmedSlotAnchors,
    evidenceAnchors,
    selectedWords,
    confirmedOutliers,
    stringSources,
  ]);

  const activeConnectionCount = useMemo(
    () => connectors.filter((connector) => connector.tone === "active").length,
    [connectors],
  );

  const polaroidSlots = useMemo(
    () => [
      {
        id: "left",
        style: {
          top: boardPadding * 0.2 - polaroidLift,
          left: -polaroidSize * 0.32,
        },
        rotation: -6.5,
      },
      {
        id: "center",
        style: {
          top: boardPadding * 0.16 - polaroidLift,
          left: "50%",
          marginLeft: -polaroidSize * 0.5,
        },
        rotation: 3.2,
      },
      {
        id: "right",
        style: {
          top: boardPadding * 0.12 - polaroidLift,
          right: -polaroidSize * 0.28,
        },
        rotation: 7.5,
      },
    ],
    [boardPadding, polaroidSize, polaroidLift],
  );
  const polaroidEntries = useMemo(() => {
    const sourceList = unlockedPolaroids?.length
      ? unlockedPolaroids
      : defaultPolaroids;
    if (!sourceList?.length) {
      return [];
    }
    return polaroidSlots.map((slot, index) => {
      const sourceData = sourceList[index] || sourceList[sourceList.length - 1];
      const fallbackData =
        defaultPolaroids[index] ||
        defaultPolaroids[defaultPolaroids.length - 1] ||
        null;
      const labelText =
        sourceData?.label && sourceData.label.trim().length
          ? sourceData.label
          : fallbackData?.label || "";
      const imageKey =
        sourceData?.imageKey || fallbackData?.imageKey || "default";
      return {
        id: `polaroid-${slot.id}-${previousCaseMeta?.caseNumber ?? "default"}-${sourceData?.id ?? index}`,
        image: POLAROID_IMAGES[imageKey] || POLAROID_IMAGES.default,
        label: labelText,
        style: slot.style,
        rotation: slot.rotation,
      };
    });
  }, [
    polaroidSlots,
    unlockedPolaroids,
    defaultPolaroids,
    previousCaseMeta?.caseNumber,
  ]);

  useLayoutEffect(() => {
    setStringSources((prev) => {
      const availableIds = polaroidEntries
        .map((entry) => entry.id)
        .filter(Boolean);
      if (!availableIds.length) {
        return Object.keys(prev).length ? {} : prev;
      }

      const next = {};
      let changed = false;

      selectedWords.forEach((word) => {
        if (!word) return;
        let sourceId = prev[word];
        if (!sourceId || !availableIds.includes(sourceId)) {
          sourceId =
            availableIds[Math.floor(Math.random() * availableIds.length)];
        }
        next[word] = sourceId;
        if (prev[word] !== sourceId) {
          changed = true;
        }
      });

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);

      if (prevKeys.length !== nextKeys.length) {
        changed = true;
      } else {
        for (let index = 0; index < prevKeys.length; index += 1) {
          if (!next[prevKeys[index]]) {
            changed = true;
            break;
          }
        }
      }

      return changed ? next : prev;
    });
  }, [polaroidEntries, selectedWords]);

  const stringOpacityActive = useMemo(
    () =>
      stringPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.35, 0.78],
      }),
    [stringPulse],
  );
  const stringOpacityIdle = useMemo(
    () =>
      stringPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.18, 0.34],
      }),
    [stringPulse],
  );
  const ambientGlowOpacity = useMemo(
    () =>
      stringPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.16, 0.28],
      }),
    [stringPulse],
  );

  return (
    <ScreenSurface
      variant="desk"
      frameless
      accentColor={COLORS.accentSecondary}
    >
      <View
        style={[
          styles.surface,
          {
            paddingHorizontal: horizontalPadding,
            paddingVertical: verticalPadding,
          },
        ]}
      >
          <View
            style={[
              styles.container,
              { width: safeContentWidth, alignSelf: "center" },
            ]}
          >
            <View
              style={[styles.topBar, { marginBottom: scaleSpacing(SPACING.lg) }]}
            >
              <View style={[styles.topBarSlot, { minWidth: navSlotWidth }]}>
                <SecondaryButton
                  label="< Back"
                  onPress={onBack}
                  size="compact"
                />
              </View>
              <View
                style={[
                  styles.topBarTitle,
                  { paddingHorizontal: scaleSpacing(SPACING.sm) },
                ]}
              >
                <Text
                  style={[
                    styles.caseTitleLabel,
                    {
                      fontSize: moderateScale(FONT_SIZES.sm),
                      lineHeight: moderateScale(FONT_SIZES.sm) * 1.2,
                    },
                  ]}
                >
                  {caseTitleHeader}
                </Text>
              </View>
              <View
                style={[
                  styles.topBarSlot,
                  styles.topBarRight,
                  { minWidth: navSlotWidth },
                ]}
              >
                {activeCase ? (
                  <SecondaryButton
                    label={compact ? "Brief" : "Briefing"}
                    icon="🗒️"
                    onPress={() => setBriefVisible(true)}
                    size="compact"
                  />
                ) : null}
              </View>
            </View>

          {/* Solved stamp animation overlay */}
        <SolvedStampAnimation
          visible={solved && stampReady}
          onContinue={onSkipToResults}
          reducedMotion={reducedMotion}
        />

          {awaitingStamp && (
            <View style={styles.celebrationBlocker} pointerEvents="auto" />
          )}

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: scaleSpacing(SPACING.gutter) },
            ]}
          >
            <View
              style={[
                styles.boardWrapper,
                { borderRadius: frameRadius, padding: framePadding },
              ]}
            >
              <LinearGradient
                colors={["rgba(58, 36, 18, 0.96)", "rgba(28, 16, 8, 0.98)"]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={[styles.boardFrame, { borderRadius: frameRadius }]}
              >
                <LinearGradient
                  colors={["#d9b78b", "#c68f57", "#ab6b34"]}
                  locations={[0, 0.58, 1]}
                  start={{ x: 0.15, y: 0 }}
                  end={{ x: 0.85, y: 1 }}
                  style={[
                    styles.boardSurface,
                    { borderRadius: boardRadius, padding: boardPadding },
                  ]}
                >
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.boardAmbientGlow,
                      { opacity: reducedMotion ? 0.26 : ambientGlowOpacity },
                    ]}
                  />
                  <Image
                    source={BOARD_NOISE_TEXTURE}
                    style={styles.boardNoise}
                    resizeMode="repeat"
                  />
                  <Image
                    source={BOARD_CORNER_TL}
                    style={[styles.boardCorner, styles.boardCornerTl]}
                  />
                  <Image
                    source={BOARD_CORNER_TR}
                    style={[styles.boardCorner, styles.boardCornerTr]}
                  />
                  <Image
                    source={BOARD_CORNER_BL}
                    style={[styles.boardCorner, styles.boardCornerBl]}
                  />
                  <Image
                    source={BOARD_CORNER_BR}
                    style={[styles.boardCorner, styles.boardCornerBr]}
                  />
                  <View style={styles.boardInner} onLayout={handleBoardLayout}>
                    <View style={[styles.boardPin, styles.boardPinLeft]} />
                    <View style={[styles.boardPin, styles.boardPinRight]} />
                    <View
                      style={[
                        styles.boardBranding,
                        { top: -boardPadding * 0.65 },
                      ]}
                    ></View>                    
                    {polaroidEntries.map((entry) => (
                      <View
                        key={entry.id}
                        onLayout={makeEvidenceAnchorHandler(entry.id)}
                        style={[
                          styles.polaroidWrapper,
                          entry.style,
                          { width: polaroidSize, height: polaroidSize * 1.18 },
                        ]}
                      >
                        <View
                          style={[
                            styles.polaroid,
                            { transform: [{ rotate: `${entry.rotation}deg` }] },
                          ]}
                        >
                          <View style={styles.polaroidTapeTop} />
                          <View style={styles.polaroidImageWrapper}>
                            <Image
                              source={entry.image}
                              style={styles.polaroidImage}
                              resizeMode="cover"
                            />
                          </View>
                          <Text
                            style={[
                              styles.polaroidLabel,
                              { fontSize: moderateScale(FONT_SIZES.sm) * 0.68 },
                            ]}
                          >
                            {entry.label}
                          </Text>
                        </View>
                      </View>
                    ))}   
                    <View
                      style={[
                        styles.caseTitleCard,
                        {
                          borderRadius: scaleRadius(RADIUS.lg),
                          marginTop: caseTitleMarginTop,
                          paddingHorizontal: scaleSpacing(SPACING.md),
                          paddingBottom: scaleSpacing(SPACING.md),
                          paddingTop:
                            scaleSpacing(SPACING.sm) +
                              caseTitleThumbtack.clearance,
                        },
                      ]}
                    >
                      <View
                        pointerEvents="none"
                        style={[
                          styles.thumbtackContainer,
                          {
                            width: caseTitleThumbtack.head,
                            height:
                              caseTitleThumbtack.head +
                              caseTitleThumbtack.stemHeight,
                            top: -caseTitleThumbtack.offset,
                            marginLeft: -caseTitleThumbtack.head / 2,
                            transform: [
                              {
                                translateX:
                                  caseTitleThumbtackVariance.horizontalOffset,
                              },
                              {
                                translateY: -caseTitleThumbtack.pivotOffset,
                              },
                              {
                                rotate: `${caseTitleThumbtackVariance.angle}deg`,
                              },
                              {
                                translateY:
                                  caseTitleThumbtack.pivotOffset +
                                  Math.round(caseTitleThumbtack.head * 0.04),
                              },
                            ],
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.thumbtackStem,
                            {
                              width: caseTitleThumbtack.stemWidth,
                              height: caseTitleThumbtack.stemHeight,
                              top: caseTitleThumbtack.stemTop,
                              left:
                                (caseTitleThumbtack.head -
                                  caseTitleThumbtack.stemWidth) /
                                2,
                              borderRadius: Math.round(
                                caseTitleThumbtack.stemWidth * 0.65,
                              ),
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.thumbtackStemSheen,
                            {
                              width: caseTitleThumbtack.stemHighlightWidth,
                              height: caseTitleThumbtack.stemHighlightHeight,
                              top: caseTitleThumbtack.stemHighlightTop,
                              left:
                                (caseTitleThumbtack.head -
                                  caseTitleThumbtack.stemWidth) /
                                  2 +
                                Math.round(caseTitleThumbtack.stemWidth * 0.16),
                              borderRadius: Math.round(
                                caseTitleThumbtack.stemHighlightWidth / 2,
                              ),
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.thumbtackHead,
                            {
                              width: caseTitleThumbtack.head,
                              height: caseTitleThumbtack.head,
                              borderRadius: caseTitleThumbtack.head / 2,
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={["#f49b78", "#c44a28", "#4a0f0a"]}
                            locations={[0, 0.52, 1]}
                            start={{ x: 0.18, y: 0.12 }}
                            end={{ x: 0.86, y: 0.88 }}
                            style={[
                              styles.thumbtackHeadGradient,
                              {
                                borderRadius: caseTitleThumbtack.innerHead / 2,
                                top: caseTitleThumbtack.rimThickness,
                                right: caseTitleThumbtack.rimThickness,
                                bottom: caseTitleThumbtack.rimThickness,
                                left: caseTitleThumbtack.rimThickness,
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.thumbtackInnerShadow,
                              {
                                borderRadius: caseTitleThumbtack.innerHead / 2,
                                top: caseTitleThumbtack.rimThickness,
                                right: caseTitleThumbtack.rimThickness,
                                bottom: caseTitleThumbtack.rimThickness,
                                left: caseTitleThumbtack.rimThickness,
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.thumbtackHighlight,
                              {
                                width: Math.round(
                                  caseTitleThumbtack.shineSize * 1.4,
                                ),
                                height: caseTitleThumbtack.shineSize,
                                borderRadius: caseTitleThumbtack.shineSize,
                                top: caseTitleThumbtack.shineTop,
                                left: caseTitleThumbtack.shineLeft,
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <View
                        style={[
                          styles.caseObjectiveBlock,
                          {
                            marginTop: scaleSpacing(SPACING.xs),
                          },
                        ]}
                        onLayout={handleObjectiveNoteLayout}
                      >
                        <Text
                          style={[
                            styles.caseObjectiveHeadline,
                            {
                              fontSize: moderateScale(FONT_SIZES.xs),
                            },
                          ]}
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                        >
                          {instructions}
                        </Text>
                        <Text
                          style={[
                            styles.caseObjectiveMeta,
                            {
                              fontSize: moderateScale(FONT_SIZES.sm),
                            },
                          ]}
                        >
                          {`${selectedCount} clue${selectedCount === 1 ? "" : "s"} flagged`}
                        </Text>
                        {branchLegend.length > 0 && (
                        <View
                          style={[
                            styles.branchLegend,
                            { marginTop: scaleSpacing(SPACING.xs) },
                          ]}
                        >
                          {branchLegend.map((entry) => (
                            <View
                              key={`legend-${entry.key}`}
                              style={styles.branchLegendItem}
                            >
                              <View
                                style={[
                                  styles.branchLegendDot,
                                  { backgroundColor: entry.color },
                                ]}
                              />
                                <View style={styles.branchLegendCopy}>
                                  <Text
                                    style={[
                                      styles.branchLegendLabel,
                                      { fontSize: moderateScale(FONT_SIZES.sm) },
                                    ]}
                                    numberOfLines={2}
                                  >
                                    {entry.legendLabel}
                                  </Text>
                                  {entry.themeLabel ? (
                                    <Text
                                      style={[
                                        styles.branchLegendTheme,
                                        { fontSize: moderateScale(FONT_SIZES.xs) },
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {entry.themeLabel}
                                    </Text>
                                  ) : null}
                                </View>
                            </View>
                          ))}
                        </View>
                      )}
                      </View>
                    </View>  
                    <View
                      style={[
                        styles.wordGrid,
                        {
                          marginHorizontal: -tilePadding,
                          marginTop: scaleSpacing(SPACING.lg),
                        },
                      ]}
                      onLayout={handleGridLayout}
                    >
                      {wordCells.map((item, index) => {
                        const tilt = wordTilts[item.id] || 0;
                        const wordState = deriveWordState(item.word, {
                          selectedWords,
                          confirmedOutliers,
                          lockedMainWords,
                        });
                          const cardDisabled =
                            wordState === "default" && selectionLimitReached;
                          const branchKey =
                            branchWordLookup[
                              item.word && typeof item.word === "string"
                                ? item.word.toUpperCase()
                                : ""
                            ];
                          const branchMeta = branchMetaByKey[branchKey];
                          const outlierBadge =
                            wordState === "lockedOutlier" && branchMeta
                              ? {
                                  label: branchMeta.badgeLabel,
                                  color: branchMeta.color,
                                }
                              : null;
                        return (
                          <View
                            key={item.id}
                            onLayout={makeWordLayoutHandler(item.id, item.word)}
                            style={{
                              width: `${100 / columns}%`,
                              paddingHorizontal: tilePadding,
                              paddingVertical: tilePadding,
                            }}
                          >
                            <Animated.View
                              style={[
                                styles.wordCardWrapper,
                                { transform: [{ rotate: `${tilt}deg` }] },
                              ]}
                            >
                              <WordCard
                                word={item.word}
                                state={wordState}
                                onToggle={onToggleWord}
                                onHint={
                                  hintsActive ? handleHintRequest : undefined
                                }
                                colorBlindMode={colorBlindMode}
                                highContrast={highContrast}
                                hintsActive={hintsActive}
                                celebrating={celebratingOutliers}
                                celebrationDelay={
                                  celebrationDelays[item.id] || 0
                                }
                                disabled={cardDisabled}
                              outlierBadge={outlierBadge}
                              />
                            </Animated.View>
                          </View>
                        );
                      })}
                    </View>
                    <View
                      style={[
                        styles.confirmedSection,
                        {
                          marginTop: scaleSpacing(SPACING.lg),
                          borderRadius: scaleRadius(RADIUS.lg),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.confirmedLabel,
                          { fontSize: moderateScale(FONT_SIZES.sm) },
                        ]}
                      >
                        CONFIRMED OUTLIERS
                      </Text>
                      <View
                        style={[
                          styles.confirmedGrid,
                          {
                            marginHorizontal: -tilePadding,
                            marginTop: scaleSpacing(SPACING.sm),
                          },
                        ]}
                        onLayout={handleConfirmedGridLayout}
                      >
                        {confirmedSlots.map((slot, index) => {
                          const slotBranchKey =
                            slot.word && typeof slot.word === "string"
                              ? slot.word.toUpperCase()
                              : "";
                          const slotMeta = branchMetaByKey[slotBranchKey];
                          return (
                            <View
                              key={slot.id || `slot-${index}`}
                              onLayout={makeConfirmedSlotLayoutHandler(
                                slot.id || `slot-${index}`,
                                slot.word,
                              )}
                              style={[
                                styles.confirmedSlot,
                                {
                                  marginHorizontal: tilePadding,
                                  borderRadius: scaleRadius(RADIUS.md),
                                  minHeight: moderateScale(46),
                                  paddingVertical: scaleSpacing(SPACING.xs) + 2,
                                  paddingHorizontal: scaleSpacing(SPACING.sm),
                                },
                                slot.filled
                                  ? [
                                      styles.confirmedSlotFilled,
                                      slotMeta
                                        ? {
                                            borderColor: slotMeta.color,
                                            backgroundColor: slotMeta.soft,
                                          }
                                        : null,
                                    ]
                                  : styles.confirmedSlotEmpty,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.confirmedWord,
                                  slot.filled
                                    ? styles.confirmedWordFilled
                                    : styles.confirmedWordEmpty,
                                  { fontSize: moderateScale(FONT_SIZES.md) },
                                ]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.65}
                              >
                                {slot.filled ? slot.word : "—"}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.stringLayer,
                        {
                          opacity: reducedMotion
                            ? 0.32
                            : activeConnectionCount > 0
                              ? stringOpacityActive
                              : stringOpacityIdle,
                        },
                      ]}
                    >
                      {connectors.map((connector) => {
                        const dx = connector.to.x - connector.from.x;
                        const dy = connector.to.y - connector.from.y;
                        const length = Math.sqrt(dx * dx + dy * dy);
                        if (!length || length === 0) {
                          return null;
                        }
                        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                        const centerX = (connector.from.x + connector.to.x) / 2;
                        const centerY = (connector.from.y + connector.to.y) / 2;
                        const toneStyle =
                          connector.tone === "active"
                            ? styles.stringLineActive
                            : connector.tone === "confirmed"
                              ? styles.stringLineConfirmed
                              : styles.stringLineDecor;
                        return (
                          <View
                            key={connector.id}
                            style={[
                              styles.stringLineBase,
                              toneStyle,
                              {
                                width: length,
                                left: centerX - length / 2,
                                top: centerY - stringThickness / 2,
                                transform: [{ rotate: `${angle}deg` }],
                                height: stringThickness,
                              },
                            ]}
                          />
                        );
                      })}
                    </Animated.View>
                  </View>
                </LinearGradient>
              </LinearGradient>
            </View>

            <View style={[styles.footer, { marginTop: footerSpacing }]}>
              <Text
                style={[
                  styles.selectionHelper,
                  { fontSize: moderateScale(FONT_SIZES.sm) },
                ]}
              >
                {selectedCount} word{selectedCount === 1 ? "" : "s"} selected ·
                Chances {attemptsRemaining}/{totalAttempts}
              </Text>
              <PrimaryButton
                label={submitLabel}
                onPress={submitHandler}
                disabled={submitDisabled}
                fullWidth
                arrow={false}
              />
              <Text
                style={[
                  styles.hintHelper,
                  { fontSize: moderateScale(FONT_SIZES.xs) },
                  hintsActive ? styles.hintActive : styles.hintMuted,
                ]}
              >
                {hintsActive
                  ? "Press and hold a card to reveal a hint."
                  : "Unlock hints with the Archive Key."}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
      <CaseBriefOverlay
        visible={briefVisible}
        caseData={activeCase}
        onDismiss={handleBriefDismiss}
        reducedMotion={reducedMotion}
      />
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  scroll: {
    width: "100%",
    alignSelf: "stretch",
  },
    container: {
      flex: 1,
      width: "100%",
      alignItems: "center",
    },
    topBar: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
    },
    topBarTitle: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    topBarSlot: {
      flexShrink: 0,
      alignItems: "flex-start",
    },
    topBarRight: {
      alignItems: "flex-end",
    },
    caseTitleLabel: {
      alignSelf: "stretch",
      maxWidth: "100%",
      textAlign: "center",
      fontFamily: FONTS.monoBold,
      letterSpacing: 4,
      color: COLORS.textMuted,
    },
  scrollContent: {
    width: "100%",
    alignItems: "center",
  },
  boardWrapper: {
    width: "100%",
    backgroundColor: "rgba(18, 11, 5, 0.86)",
    borderWidth: 2,
    borderColor: "rgba(68, 43, 20, 0.9)",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 22,
    position: "relative",
  },
  boardFrame: {
    flex: 1,
    width: "100%",
    position: "relative",
    overflow: "visible",
  },
  boardSurface: {
    flex: 1,
    width: "100%",
    position: "relative",
    overflow: "visible",
  },
  boardAmbientGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 216, 142, 0.35)",
  },
  boardNoise: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  boardCorner: {
    position: "absolute",
    width: 64,
    height: 64,
    opacity: 0.38,
  },
  boardCornerTl: {
    top: -8,
    left: -4,
  },
  boardCornerTr: {
    top: -8,
    right: -4,
    transform: [{ scaleX: -1 }],
  },
  boardCornerBl: {
    bottom: -8,
    left: -4,
    transform: [{ scaleY: -1 }],
  },
  boardCornerBr: {
    bottom: -8,
    right: -4,
    transform: [{ scaleX: -1 }, { scaleY: -1 }],
  },
  boardInner: {
    flex: 1,
    position: "relative",
    justifyContent: "flex-start",
  },
  boardPin: {
    position: "absolute",
    top: -10,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#5a221b",
    borderWidth: 2,
    borderColor: "#2a0d0a",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    zIndex: 4,
  },
  boardPinLeft: {
    left: "20%",
  },
  boardPinRight: {
    right: "20%",
  },
  boardBranding: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(14, 8, 4, 0.68)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(249, 221, 172, 0.26)",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  boardLogo: {
    opacity: 0.9,
  },
  polaroidWrapper: {
    position: "absolute",
    zIndex: 30,
    elevation: 30,
  },
  polaroid: {
    flex: 1,
    backgroundColor: "#fef9f0",
    borderRadius: 14,
    padding: 10,
    justifyContent: "flex-start",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  polaroidTapeTop: {
    position: "absolute",
    top: -16,
    left: "20%",
    right: "20%",
    height: 20,
    backgroundColor: "rgba(250, 236, 180, 0.9)",
    borderRadius: 6,
    transform: [{ rotate: "-4deg" }],
    shadowColor: "#2e1a0b",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  polaroidImageWrapper: {
    width: "100%",
    height: "70%",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(35, 22, 12, 0.35)",
    marginBottom: 10,
  },
  polaroidImage: {
    width: "100%",
    height: "100%",
  },
  polaroidLabel: {
    marginTop: "auto",
    fontFamily: FONTS.mono,
    letterSpacing: 1.8,
    color: "#3c2414",
  },
  objectiveNote: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(250, 236, 210, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(164, 120, 68, 0.45)",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  noteTape: {
    position: "absolute",
    top: -14,
    width: 38,
    height: 18,
    backgroundColor: "rgba(251, 235, 186, 0.85)",
    borderRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
  },
  noteTapeLeft: {
    left: 24,
    transform: [{ rotate: "-12deg" }],
  },
  noteTapeRight: {
    right: 24,
    transform: [{ rotate: "9deg" }],
  },
  objectiveLabel: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 3.5,
    color: "#8f3b1b",
    marginBottom: 6,
  },
  objectiveText: {
    fontFamily: FONTS.primarySemiBold,
    letterSpacing: 2.2,
    color: "#2b1a10",
    textAlign: "center",
  },
  caseMetaRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  caseClipTag: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 150, 0.28)",
    backgroundColor: "rgba(36, 22, 12, 0.92)",
  },
  caseClipLabel: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 2.6,
    color: "rgba(232, 197, 148, 0.7)",
  },
  caseClipNumber: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 4,
    color: "#f4d19a",
    marginTop: 6,
  },
  statusTag: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 225, 176, 0.45)",
    backgroundColor: "rgba(255, 240, 202, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 3.4,
    color: "#f3d4a1",
  },
  caseTitleCard: {
    width: "100%",
    backgroundColor: "rgba(22, 14, 8, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255, 216, 174, 0.25)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
    position: "relative",
  },
  thumbtackContainer: {
    position: "absolute",
    left: "50%",
    zIndex: 40,
    alignItems: "center",
  },
  thumbtackStem: {
    position: "absolute",
    backgroundColor: "#551f14",
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  thumbtackStemSheen: {
    position: "absolute",
    backgroundColor: "rgba(255, 216, 190, 0.32)",
    opacity: 0.9,
  },
  thumbtackPoint: {
    position: "absolute",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#3c120c",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  thumbtackHead: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#2d0c07",
    borderWidth: 1,
    borderColor: "#170503",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 9,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbtackHeadGradient: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  thumbtackInnerShadow: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    opacity: 0.4,
    transform: [{ scaleX: 0.84 }, { scaleY: 0.72 }],
  },
  thumbtackHighlight: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    opacity: 0.85,
    transform: [{ rotate: "-22deg" }, { scaleX: 1.12 }, { scaleY: 0.68 }],
  },
  caseSubtitle: {
    marginTop: 8,
    fontFamily: FONTS.mono,
    letterSpacing: 1.8,
    color: "rgba(245, 208, 162, 0.76)",
  },
  caseObjectiveBlock: {
    width: "100%",
    alignItems: "flex-start",
  },
  caseObjectiveHeadline: {
    fontFamily: FONTS.primarySemiBold,
    letterSpacing: 2.2,
    color: "#f5e3c8",
    textTransform: "uppercase",
    textAlign: "left",
  },
  caseObjectiveMeta: {
    marginTop: 6,
    fontFamily: FONTS.mono,
    letterSpacing: 1.8,
    color: "rgba(245, 208, 162, 0.76)",
    textAlign: "left",
  },
  branchLegend: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  branchLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.sm,
    marginTop: SPACING.xs,
  },
  branchLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  branchLegendCopy: {
    flexShrink: 1,
  },
  branchLegendLabel: {
    fontFamily: FONTS.mono,
    letterSpacing: 1.4,
    color: COLORS.textMuted,
    flexShrink: 1,
  },
  branchLegendTheme: {
    fontFamily: FONTS.mono,
    letterSpacing: 1.2,
    color: COLORS.textMuted,
    opacity: 0.85,
    marginTop: 2,
  },
  wordGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  wordCardWrapper: {
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.26,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  confirmedSection: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(26, 16, 9, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(249, 220, 174, 0.18)",
  },
  confirmedLabel: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 2.6,
    color: "#f6d8a9",
  },
  confirmedGrid: {
    flexDirection: "row",
    alignItems: "stretch",
    flexWrap: "wrap",
  },
  confirmedSlot: {
    flex: 1,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 245, 214, 0.12)",
  },
  confirmedSlotFilled: {
    borderColor: "rgba(250, 206, 120, 0.6)",
    backgroundColor: "rgba(246, 195, 106, 0.14)",
  },
  confirmedSlotEmpty: {
    borderColor: "rgba(255, 235, 190, 0.25)",
  },
  confirmedWord: {
    fontFamily: FONTS.monoBold,
    letterSpacing: 2.4,
  },
  confirmedWordFilled: {
    color: "#f9e3bf",
  },
  confirmedWordEmpty: {
    color: "rgba(249, 219, 170, 0.4)",
  },
  stringLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  stringLineBase: {
    position: "absolute",
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  stringLineActive: {
    backgroundColor: "rgba(204, 36, 52, 0.9)",
  },
  stringLineConfirmed: {
    backgroundColor: "rgba(241, 182, 88, 0.9)",
  },
  stringLineDecor: {
    backgroundColor: "rgba(188, 62, 96, 0.6)",
  },
  boardTape: {
    position: "absolute",
    top: -26,
    width: 72,
    height: 24,
    backgroundColor: "rgba(251, 229, 184, 0.9)",
    borderRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  boardTapeLeft: {
    left: "18%",
    transform: [{ rotate: "-10deg" }],
  },
  boardTapeRight: {
    right: "18%",
    transform: [{ rotate: "8deg" }],
  },
  footer: {
    width: "100%",
    alignItems: "center",
  },
  selectionHelper: {
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
    letterSpacing: 1.6,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  hintHelper: {
    fontFamily: FONTS.mono,
    letterSpacing: 1.6,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
  hintActive: {
    color: COLORS.accentSecondary,
  },
  hintMuted: {
    color: "rgba(198, 182, 160, 0.6)",
  },
  celebrationBlocker: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 900,
    backgroundColor: "transparent",
  },
});
