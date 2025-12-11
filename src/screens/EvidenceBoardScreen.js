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
import PrimaryButton from "../components/PrimaryButton";
import SolvedStampAnimation from "../components/SolvedStampAnimation";
import PolaroidStack from "../components/evidence-board/PolaroidStack";
import BoardHeader from "../components/evidence-board/BoardHeader";
import BoardGrid from "../components/evidence-board/BoardGrid";
import ConfirmedOutliers from "../components/evidence-board/ConfirmedOutliers";
import StringLayer from "../components/evidence-board/StringLayer";

import { COLORS } from "../constants/colors";
import { FONTS, FONT_SIZES } from "../constants/typography";
import { RADIUS, SPACING } from "../constants/layout";
import { GAME_STATUS } from "../context/GameContext";
import useResponsiveLayout from "../hooks/useResponsiveLayout";
import { getBoardProfile } from "../utils/caseNumbers";
import {
  createThumbtackMetrics,
  createThumbtackVariance,
  buildPolaroidLabel,
  POLAROID_LABEL_WORD_LIMIT
} from "../utils/boardUtils";

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

const BOARD_NOISE_TEXTURE = require("../../assets/images/ui/backgrounds/noise-texture.png");
const BOARD_CORNER_TL = require("../../assets/images/ui/decorative/corner-ornament-tl.png");
const BOARD_CORNER_TR = require("../../assets/images/ui/decorative/corner-ornament-tr.png");
const BOARD_CORNER_BL = require("../../assets/images/ui/decorative/corner-ornament-bl.png");
const BOARD_CORNER_BR = require("../../assets/images/ui/decorative/corner-ornament-br.png");
const POINTER_HAND = require("../../assets/images/tutorial/pointer-hand.png");
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
};

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

    const totalDuration = index > 0 ? (index - 1) * baseDelay + highlightDuration + cooldown : 0;
    return { delaysById, totalDuration };
  }, [wordCells, confirmedOutliers]);

  const caseNumberLabel = activeCase?.caseNumber != null ? String(activeCase.caseNumber).padStart(3, "0") : "---";
  const caseTitle = activeCase?.title || "Untitled Case";
  const caseTitleHeader = caseTitle.toUpperCase();
  
  const caseTitleThumbtack = useMemo(() => createThumbtackMetrics(Math.max(18, Math.round(moderateScale(compact ? 24 : 28)))), [moderateScale, compact]);
  const caseTitleThumbtackVariance = useMemo(() => createThumbtackVariance(`case-title-${activeCase?.id ?? "unknown"}`, caseTitleThumbtack.horizontalJitter, caseTitleThumbtack.angleRange), [activeCase?.id, caseTitleThumbtack]);

  const outlierCount = outlierWords?.length || 0;
  const instructions = outlierCount
    ? isBranchingBoard
      ? `FIND BOTH LEADS (${outlierCount} words · 4 per path)`
      : `FIND the OUTLIERS (${outlierCount} ${outlierCount === 1 ? "word" : "words"})`
    : isBranchingBoard
      ? "FIND BOTH LEADS"
      : "FIND the OUTLIERS";

  const selectedCount = selectedWords.length;
  const uniqueOutlierCount = Array.isArray(outlierWords) ? new Set(outlierWords.filter((word) => typeof word === "string" && word.trim().length)).size : 0;
  const confirmedOutlierCount = Array.isArray(confirmedOutliers) ? confirmedOutliers.length : 0;
  const remainingOutlierSlots = uniqueOutlierCount > 0 ? Math.max(uniqueOutlierCount - confirmedOutlierCount, 0) : Infinity;
  const selectionLimitReached = remainingOutlierSlots !== Infinity && selectedCount >= remainingOutlierSlots;
  const totalAttempts = activeCase?.attempts ?? Math.max(attemptsRemaining, 1);
  const solved = status === GAME_STATUS.SOLVED;
  const failed = status === GAME_STATUS.FAILED;
  const inProgress = status === GAME_STATUS.IN_PROGRESS;
  const hintsActive = hintsEnabled && premiumUnlocked;
  const normalizedSolvedCaseIds = useMemo(() => Array.isArray(solvedCaseIds) ? solvedCaseIds.filter((id) => typeof id === "number" && Number.isFinite(id)) : [], [solvedCaseIds]);
  const casePool = useMemo(() => Array.isArray(cases) && cases.length ? cases : activeCase ? [activeCase] : [], [cases, activeCase]);
  
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
  }, [activeCase?.id, storyProgress?.lastCompletedCaseId, normalizedSolvedCaseIds]);

  const previousCaseData = useMemo(() => previousCaseId ? casePool.find((item) => item.id === previousCaseId) || null : null, [casePool, previousCaseId]);
  const previousCaseMeta = useMemo(() => {
    if (!previousCaseData) return null;
    const caseNumberRaw = previousCaseData.caseNumber != null && previousCaseData.caseNumber !== "" ? previousCaseData.caseNumber : previousCaseData.id;
    const caseNumber = caseNumberRaw != null ? String(caseNumberRaw).padStart(3, "0") : "---";
    return {
      caseNumber,
      title: previousCaseData.title || "",
      mainTheme: previousCaseData.mainTheme?.name || null,
      outlierTheme: previousCaseData.outlierTheme?.name || null,
    };
  }, [previousCaseData]);

  const defaultPolaroids = useMemo(() => {
    const formatLine = (line) => buildPolaroidLabel([line], POLAROID_LABEL_WORD_LIMIT);
    if (previousCaseMeta) {
      const rawLines = [
        `Case ${previousCaseMeta.caseNumber}: ${previousCaseMeta.title || "Unnamed"}`,
        previousCaseMeta.mainTheme ? `Theme: ${previousCaseMeta.mainTheme}` : "Theme: Unknown",
        previousCaseMeta.outlierTheme ? `Outlier: ${previousCaseMeta.outlierTheme}` : "Outlier: Unknown",
      ];
      const keys = ["keeper", "voice", "buyer"];
      return keys.map((imageKey, index) => {
        const selectedLine = rawLines[index] ?? rawLines[rawLines.length - 1] ?? "";
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
      const selectedLine = rawLines[index] ?? rawLines[rawLines.length - 1] ?? "";
      return {
        id: `default-generic-${index}`,
        imageKey,
        label: formatLine(selectedLine),
      };
    });
  }, [previousCaseMeta, caseNumberLabel, caseTitle]);

  const unlockedPolaroids = useMemo(() => {
    const entries = previousCaseData?.evidenceBoard?.polaroids;
    if (!Array.isArray(entries) || !entries.length) return null;
    return entries.map((item, index) => {
        if (!item) return null;
        const lines = [];
        if (item.title) lines.push(item.title);
        if (item.subtitle) lines.push(item.subtitle);
        if (!lines.length && item.label) lines.push(item.label);
        const labelText = buildPolaroidLabel(lines, POLAROID_LABEL_WORD_LIMIT);
        return {
          id: item.id || `previous-${previousCaseMeta?.caseNumber ?? previousCaseData?.id}-${index}`,
                    imageKey: item.imageKey || null,
                    label: labelText,
                    detail: item.detail || null,
                  };
                })
                .filter(Boolean);
  }, [previousCaseData?.evidenceBoard?.polaroids, previousCaseMeta?.caseNumber, previousCaseData?.id]);

  const [briefVisible, setBriefVisible] = useState(() => !briefingSeen && inProgress);
  useEffect(() => {
    if (!activeCase?.id) { setBriefVisible(false); return; }
    if (!inProgress) { setBriefVisible(false); return; }
    if (!briefingSeen) { setBriefVisible(true); }
  }, [activeCase?.id, inProgress, briefingSeen]);

  const handleBriefDismiss = useCallback(() => {
    if (activeCase?.id) { onBriefingSeen?.(activeCase.id); }
    setBriefVisible(false);
  }, [activeCase?.id, onBriefingSeen]);

  const [celebratingOutliers, setCelebratingOutliers] = useState(false);
  const [stampReady, setStampReady] = useState(false);
  const celebrationTimerRef = useRef(null);

  useEffect(() => {
    if (celebrationTimerRef.current) { clearTimeout(celebrationTimerRef.current); celebrationTimerRef.current = null; }
    if (!solved) { setCelebratingOutliers(false); setStampReady(false); return; }
    if (reducedMotion) { setCelebratingOutliers(false); setStampReady(true); return; }

    setCelebratingOutliers(true);
    setStampReady(false);
    const totalDuration = Math.max(outlierCelebration.totalDuration, 900);
    celebrationTimerRef.current = setTimeout(() => {
      setStampReady(true);
      setCelebratingOutliers(false);
      celebrationTimerRef.current = null;
    }, totalDuration);

    return () => { if (celebrationTimerRef.current) { clearTimeout(celebrationTimerRef.current); celebrationTimerRef.current = null; } };
  }, [solved, reducedMotion, outlierCelebration.totalDuration]);

  const handleHintRequest = useCallback((word) => {
      if (!hintsActive) return;
      const isOutlier = outlierWords.includes(word);
      Alert.alert("Hint", isOutlier ? `${word} is an OUTLIER.` : `${word} belongs to the main theme.`);
    }, [hintsActive, outlierWords]);

  const celebrationDelays = outlierCelebration.delaysById;
  const awaitingStamp = solved && !stampReady;
  const submitLabel = solved ? "View Results" : failed ? "Review Case" : "Submit Guess";
  const submitHandler = solved || failed ? onSkipToResults : onSubmitGuess;
  const submitDisabled = awaitingStamp ? true : inProgress ? selectedCount === 0 : false;

  const [boardLayout, setBoardLayout] = useState(null);
  const [gridOffset, setGridOffset] = useState({ x: 0, y: 0 });
  const [wordLayouts, setWordLayouts] = useState({});
  const [objectiveLayout, setObjectiveLayout] = useState(null);
  const [confirmedGridOffset, setConfirmedGridOffset] = useState({ x: 0, y: 0 });
  const [confirmedSlotLayouts, setConfirmedSlotLayouts] = useState({});
  const [evidenceAnchors, setEvidenceAnchors] = useState({});
  const [stringSources, setStringSources] = useState({});

  // Lazy initialization to prevent object creation on every render
  const stringPulse = useState(() => new Animated.Value(0))[0];
  
  // Tutorial Hand Animation - Lazy init
  const handOpacity = useState(() => new Animated.Value(0))[0];
  const handTranslateY = useState(() => new Animated.Value(0))[0];
  const handTranslateX = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (activeCase?.caseNumber === 1 && !solved && !failed) {
       // Delay start
       const timer = setTimeout(() => {
         Animated.sequence([
           // Appear at Header
           Animated.parallel([
             Animated.timing(handOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
             Animated.timing(handTranslateY, { toValue: 120, duration: 0, useNativeDriver: true }),
             Animated.timing(handTranslateX, { toValue: 20, duration: 0, useNativeDriver: true }), // Slightly offset
           ]),
           // Move to Grid
           Animated.timing(handTranslateY, { toValue: 300, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
           // Pulse/Tap
           Animated.sequence([
             Animated.timing(handTranslateY, { toValue: 310, duration: 150, useNativeDriver: true }),
             Animated.timing(handTranslateY, { toValue: 300, duration: 150, useNativeDriver: true }),
           ]),
           Animated.delay(500),
           // Fade out
           Animated.timing(handOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
         ]).start();
       }, 1500);
       return () => clearTimeout(timer);
    }
  }, [activeCase?.caseNumber, solved, failed]);

  const sizeConfig = useMemo(() => {
    if (isTablet) {
      return { surface: 24, vertical: 28, frame: 26, board: 20, noteV: 12, noteH: SPACING.xl, tile: 8, navSlot: 148, string: 3, polaroid: 154, footer: SPACING.xl, contentMaxWidth: 720 };
    }
    switch (sizeClass) {
      case "xsmall": return { surface: 10, vertical: 14, frame: 11, board: 10, noteV: 6, noteH: 18, tile: 2.5, navSlot: 88, string: 1.2, polaroid: 112, footer: SPACING.md, contentMaxWidth: 420 };
      case "small": return { surface: 12, vertical: 16, frame: 13, board: 12, noteV: 7, noteH: 20, tile: 3, navSlot: 96, string: 1.4, polaroid: 126, footer: SPACING.md, contentMaxWidth: 460 };
      case "medium": return { surface: 14, vertical: 20, frame: 15, board: 14, noteV: 8, noteH: 22, tile: 3.5, navSlot: 106, string: 1.8, polaroid: 138, footer: SPACING.lg, contentMaxWidth: 520 };
      case "large":
      default: return { surface: 16, vertical: 22, frame: 17, board: 16, noteV: 9, noteH: SPACING.lg, tile: 4, navSlot: 118, string: 2.1, polaroid: 148, footer: SPACING.lg, contentMaxWidth: 560 };
    }
  }, [isTablet, sizeClass]);

  const horizontalPadding = scaleSpacing(sizeConfig.surface);
  const verticalPadding = scaleSpacing(sizeConfig.vertical);
  const framePadding = scaleSpacing(sizeConfig.frame);
  const boardPadding = scaleSpacing(sizeConfig.board);
  const tilePadding = scaleSpacing(sizeConfig.tile);
  const stringThickness = Math.max(1.6, scaleSpacing(sizeConfig.string));
  const polaroidScale = 0.92;
  const polaroidSize = scaleSpacing(sizeConfig.polaroid) * polaroidScale;
  const polaroidLift = polaroidSize * 0.08;
  const polaroidHeight = polaroidSize * POLAROID_ASPECT_RATIO;
  const polaroidStackBottom = polaroidHeight - polaroidLift + boardPadding * 0.2;
  const caseTitleMarginTop = Math.max(polaroidStackBottom - polaroidSize * CASE_TITLE_OVERLAP_RATIO, scaleSpacing(SPACING.lg));
  const contentMaxWidth = Math.min(sizeConfig.contentMaxWidth, shortest * 0.92);
  const navSlotWidth = Math.max(scaleSpacing(sizeConfig.navSlot), sizeConfig.navSlot * 0.85);
  const footerSpacing = scaleSpacing(sizeConfig.footer);
  const boardRadius = scaleRadius(RADIUS.xl);
  const frameRadius = scaleRadius(RADIUS.xl * 1.05);
  const availableWidth = Math.max(width - horizontalPadding * 2, 0);
  const safeContentWidth = Math.min(contentMaxWidth, availableWidth > 0 ? availableWidth : width);

  useEffect(() => {
    if (reducedMotion) { stringPulse.setValue(0.35); return; }
    const animation = Animated.loop(Animated.sequence([
        Animated.timing(stringPulse, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(stringPulse, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]));
    animation.start();
    return () => { animation.stop(); };
  }, [stringPulse, reducedMotion]);

  const handleBoardLayout = useCallback(({ nativeEvent: { layout } }) => { setBoardLayout(layout); }, []);
  const handleGridLayout = useCallback(({ nativeEvent: { layout } }) => { setGridOffset({ x: layout.x, y: layout.y }); }, []);
  const handleObjectiveNoteLayout = useCallback(({ nativeEvent: { layout } }) => { setObjectiveLayout(layout); }, []);

  const makeWordLayoutHandler = useCallback((id, word) => ({ nativeEvent: { layout } }) => {
      setWordLayouts((prev) => {
        const current = prev[id];
        if (current && current.x === layout.x && current.y === layout.y && current.width === layout.width && current.height === layout.height && current.word === word) {
          return prev;
        }
        return { ...prev, [id]: { word, ...layout } };
      });
    }, []);

  const handleConfirmedGridLayout = useCallback(({ nativeEvent: { layout } }) => { setConfirmedGridOffset({ x: layout.x, y: layout.y }); }, []);
  const makeConfirmedSlotLayoutHandler = useCallback((id, word) => ({ nativeEvent: { layout } }) => {
      setConfirmedSlotLayouts((prev) => ({ ...prev, [id]: { word, ...layout } }));
    }, []);

  const makeEvidenceAnchorHandler = useCallback((id) => (layout) => {
      setEvidenceAnchors((prev) => {
        const center = { id, x: layout.x + layout.width / 2, y: layout.y + layout.height / 2 };
        const current = prev[id];
        if (current && current.x === center.x && current.y === center.y) { return prev; }
        return { ...prev, [id]: center };
      });
    }, []);

  const objectiveAnchor = useMemo(() => {
    if (!objectiveLayout) return null;
    return { x: objectiveLayout.x + objectiveLayout.width / 2, y: objectiveLayout.y + objectiveLayout.height / 2 };
  }, [objectiveLayout]);

  const wordAnchors = useMemo(() => {
    if (!boardLayout) return {};
    const anchors = {};
    Object.values(wordLayouts).forEach(({ word, x, y, width, height }) => {
      const anchor = { x: gridOffset.x + x + width / 2, y: gridOffset.y + y + height / 2 };
      if (!anchors[word]) { anchors[word] = []; }
      anchors[word].push(anchor);
    });
    return anchors;
  }, [wordLayouts, gridOffset, boardLayout]);

  const confirmedSlotAnchors = useMemo(() => {
    const anchors = {};
    Object.entries(confirmedSlotLayouts).forEach(([id, { word, x, y, width, height }]) => {
        anchors[id] = { word, x: confirmedGridOffset.x + x + width / 2, y: confirmedGridOffset.y + y + height / 2 };
      });
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
    selectedWords.forEach((word) => {
      const anchorsForWord = wordAnchors[word];
      if (!anchorsForWord || !anchorsForWord.length) return;
      const sourceId = stringSources[word];
      const origin = (sourceId && evidenceAnchors[sourceId]) || objectiveAnchor;
      if (!origin) return;
      const anchor = anchorsForWord[0];
      lines.push({ id: `active-${word}`, from: origin, to: anchor, tone: "active" });
    });
    confirmedOutliers.forEach((word) => {
      const anchorsForWord = wordAnchors[word];
      if (!anchorsForWord || !anchorsForWord.length) return;
      const slotEntry = Object.values(confirmedSlotAnchors).find((slot) => slot.word === word);
      if (!slotEntry) return;
      lines.push({ id: `outlier-${word}`, from: anchorsForWord[0], to: slotEntry, tone: "confirmed" });
    });
    Object.values(evidenceAnchors).forEach((anchor) => {
      lines.push({ id: `decor-${anchor.id}`, from: objectiveAnchor, to: anchor, tone: "decor" });
    });
    return lines;
  }, [objectiveAnchor, boardLayout, wordAnchors, confirmedSlotAnchors, evidenceAnchors, selectedWords, confirmedOutliers, stringSources]);

  const activeConnectionCount = useMemo(() => connectors.filter((connector) => connector.tone === "active").length, [connectors]);

  const polaroidSlots = useMemo(() => [
      { id: "left", style: { top: boardPadding * 0.2 - polaroidLift, left: -polaroidSize * 0.32 }, rotation: -6.5 },
      { id: "center", style: { top: boardPadding * 0.16 - polaroidLift, left: "50%", marginLeft: -polaroidSize * 0.5 }, rotation: 3.2 },
      { id: "right", style: { top: boardPadding * 0.12 - polaroidLift, right: -polaroidSize * 0.28 }, rotation: 7.5 },
    ], [boardPadding, polaroidSize, polaroidLift]);

  const polaroidEntries = useMemo(() => {
    const sourceList = unlockedPolaroids?.length ? unlockedPolaroids : defaultPolaroids;
    if (!sourceList?.length) return [];
    return polaroidSlots.map((slot, index) => {
      const sourceData = sourceList[index] || sourceList[sourceList.length - 1];
      const fallbackData = defaultPolaroids[index] || defaultPolaroids[defaultPolaroids.length - 1] || null;
      const labelText = sourceData?.label && sourceData.label.trim().length ? sourceData.label : fallbackData?.label || "";
      const imageKey = sourceData?.imageKey || fallbackData?.imageKey || "default";
      return {
        id: `polaroid-${slot.id}-${previousCaseMeta?.caseNumber ?? "default"}-${sourceData?.id ?? index}`,
        image: POLAROID_IMAGES[imageKey] || POLAROID_IMAGES.default,
        label: labelText,
        detail: sourceData?.detail || null,
        style: slot.style,
        rotation: slot.rotation,
      };
    });
  }, [polaroidSlots, unlockedPolaroids, defaultPolaroids, previousCaseMeta?.caseNumber]);

  useLayoutEffect(() => {
    setStringSources((prev) => {
      const availableIds = polaroidEntries.map((entry) => entry.id).filter(Boolean);
      if (!availableIds.length) { return Object.keys(prev).length ? {} : prev; }
      const next = {};
      let changed = false;
      selectedWords.forEach((word) => {
        if (!word) return;
        let sourceId = prev[word];
        if (!sourceId || !availableIds.includes(sourceId)) {
          sourceId = availableIds[Math.floor(Math.random() * availableIds.length)];
        }
        next[word] = sourceId;
        if (prev[word] !== sourceId) { changed = true; }
      });
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) { changed = true; } else {
        for (let index = 0; index < prevKeys.length; index += 1) {
          if (!next[prevKeys[index]]) { changed = true; break; }
        }
      }
      return changed ? next : prev;
    });
  }, [polaroidEntries, selectedWords]);

  const stringOpacityActive = useMemo(() => stringPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.78] }), [stringPulse]);
  const stringOpacityIdle = useMemo(() => stringPulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.34] }), [stringPulse]);
  const ambientGlowOpacity = useMemo(() => stringPulse.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.28] }), [stringPulse]);

  return (
    <ScreenSurface variant="desk" frameless accentColor={COLORS.accentSecondary}>
      <View style={[styles.surface, { paddingHorizontal: horizontalPadding, paddingVertical: verticalPadding }]}>
          <View style={[styles.container, { width: safeContentWidth, alignSelf: "center" }]}>
            <View style={[styles.topBar, { marginBottom: scaleSpacing(SPACING.lg) }]}>
              <View style={[styles.topBarSlot, { minWidth: navSlotWidth }]}>
                <SecondaryButton label="< Back" onPress={onBack} size="compact" />
              </View>
              <View style={[styles.topBarTitle, { paddingHorizontal: scaleSpacing(SPACING.sm) }]}>
                <Text style={[styles.caseTitleLabel, { fontSize: moderateScale(FONT_SIZES.sm), lineHeight: moderateScale(FONT_SIZES.sm) * 1.2 }]}>
                  {caseTitleHeader}
                </Text>
              </View>
              <View style={[styles.topBarSlot, styles.topBarRight, { minWidth: navSlotWidth }]}>
                {activeCase ? (
                  <SecondaryButton label={compact ? "Brief" : "Briefing"} icon="🗒️" onPress={() => setBriefVisible(true)} size="compact" />
                ) : null}
              </View>
            </View>

        <SolvedStampAnimation visible={solved && stampReady} onContinue={onSkipToResults} reducedMotion={reducedMotion} intelName={activeCase?.outlierTheme?.name} />
          {awaitingStamp && <View style={styles.celebrationBlocker} pointerEvents="auto" />}

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: scaleSpacing(SPACING.gutter) }]}
            removeClippedSubviews={true}
            scrollEventThrottle={16}
          >
            <View style={[styles.boardWrapper, { borderRadius: frameRadius, padding: framePadding }]}>
              <LinearGradient colors={["rgba(58, 36, 18, 0.96)", "rgba(28, 16, 8, 0.98)"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.boardFrame, { borderRadius: frameRadius }]}>
                <LinearGradient colors={["#d9b78b", "#c68f57", "#ab6b34"]} locations={[0, 0.58, 1]} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={[styles.boardSurface, { borderRadius: boardRadius, padding: boardPadding }]}>
                  <Animated.View pointerEvents="none" style={[styles.boardAmbientGlow, { opacity: reducedMotion ? 0.26 : ambientGlowOpacity }]} />
                  <Image source={BOARD_NOISE_TEXTURE} style={styles.boardNoise} resizeMode="repeat" />
                  <Image source={BOARD_CORNER_TL} style={[styles.boardCorner, styles.boardCornerTl]} />
                  <Image source={BOARD_CORNER_TR} style={[styles.boardCorner, styles.boardCornerTr]} />
                  <Image source={BOARD_CORNER_BL} style={[styles.boardCorner, styles.boardCornerBl]} />
                  <Image source={BOARD_CORNER_BR} style={[styles.boardCorner, styles.boardCornerBr]} />
                  <View style={styles.boardInner} onLayout={handleBoardLayout}>
                    <View style={[styles.boardPin, styles.boardPinLeft]} />
                    <View style={[styles.boardPin, styles.boardPinRight]} />
                    <View style={[styles.boardBranding, { top: -boardPadding * 0.65 }]}></View>  
                    
                    <PolaroidStack entries={polaroidEntries} size={polaroidSize} onLayoutEntry={makeEvidenceAnchorHandler} />

                    <BoardHeader marginTop={caseTitleMarginTop} thumbtackMetrics={caseTitleThumbtack} thumbtackVariance={caseTitleThumbtackVariance} instructions={instructions} selectedCount={selectedCount} branchLegend={branchLegend} onLayoutObjective={handleObjectiveNoteLayout} scaleSpacing={scaleSpacing} scaleRadius={scaleRadius} moderateScale={moderateScale} />

                    <BoardGrid wordCells={wordCells} columns={columns} tilePadding={tilePadding} marginTop={scaleSpacing(SPACING.lg)} onLayoutGrid={handleGridLayout} onLayoutWord={makeWordLayoutHandler} wordTilts={wordTilts} selectedWords={selectedWords} confirmedOutliers={confirmedOutliers} lockedMainWords={lockedMainWords} selectionLimitReached={selectionLimitReached} onToggleWord={onToggleWord} hintsActive={hintsActive} onHintRequest={handleHintRequest} colorBlindMode={colorBlindMode} highContrast={highContrast} celebratingOutliers={celebratingOutliers} celebrationDelays={celebrationDelays} branchWordLookup={branchWordLookup} branchMetaByKey={branchMetaByKey} />

                    <ConfirmedOutliers confirmedSlots={confirmedSlots} marginTop={scaleSpacing(SPACING.lg)} containerRadius={scaleRadius(RADIUS.lg)} tilePadding={tilePadding} scaleSpacing={scaleSpacing} scaleRadius={scaleRadius} moderateScale={moderateScale} onLayoutGrid={handleConfirmedGridLayout} onLayoutSlot={makeConfirmedSlotLayoutHandler} branchMetaByKey={branchMetaByKey} />

                    <StringLayer
                      connectors={connectors}
                      stringThickness={stringThickness}
                      reducedMotion={reducedMotion}
                      activeConnectionCount={activeConnectionCount}
                      stringOpacityActive={stringOpacityActive}
                      stringOpacityIdle={stringOpacityIdle}
                    />
                    
                    <Animated.Image
                        source={POINTER_HAND}
                        style={[
                            styles.tutorialHand,
                            {
                                opacity: handOpacity,
                                transform: [{ translateY: handTranslateY }, { translateX: handTranslateX }]
                            }
                        ]}
                        pointerEvents="none"
                    />
                  </View>
                </LinearGradient>
              </LinearGradient>
            </View>

            <View style={[styles.footer, { marginTop: footerSpacing }]}>
              <Text style={[styles.selectionHelper, { fontSize: moderateScale(FONT_SIZES.sm) }]}>{selectedCount} word{selectedCount === 1 ? "" : "s"} selected · Chances {attemptsRemaining}/{totalAttempts}</Text>
              <PrimaryButton label={submitLabel} onPress={submitHandler} disabled={submitDisabled} fullWidth arrow={false} />
              <Text style={[styles.hintHelper, { fontSize: moderateScale(FONT_SIZES.xs) }, hintsActive ? styles.hintActive : styles.hintMuted]}>{hintsActive ? "Press and hold a card to reveal a hint." : "Unlock hints with the Archive Key."}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
      <CaseBriefOverlay visible={briefVisible} caseData={activeCase} onDismiss={handleBriefDismiss} reducedMotion={reducedMotion} />
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  surface: { flex: 1, width: "100%", alignItems: "center" },
  scroll: { width: "100%", alignSelf: "stretch" },
  container: { flex: 1, width: "100%", alignItems: "center" },
  topBar: { width: "100%", flexDirection: "row", alignItems: "center" },
  topBarTitle: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBarSlot: { flexShrink: 0, alignItems: "flex-start" },
  topBarRight: { alignItems: "flex-end" },
  caseTitleLabel: { alignSelf: "stretch", maxWidth: "100%", textAlign: "center", fontFamily: FONTS.monoBold, letterSpacing: 4, color: COLORS.textMuted },
  scrollContent: { width: "100%", alignItems: "center" },
  boardWrapper: { width: "100%", backgroundColor: "rgba(18, 11, 5, 0.86)", borderWidth: 2, borderColor: "rgba(68, 43, 20, 0.9)", shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 26, shadowOffset: { width: 0, height: 16 }, elevation: 22, position: "relative" },
  boardFrame: { flex: 1, width: "100%", position: "relative", overflow: "visible" },
  boardSurface: { flex: 1, width: "100%", position: "relative", overflow: "visible" },
  boardAmbientGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255, 216, 142, 0.35)" },
  boardNoise: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  boardCorner: { position: "absolute", width: 64, height: 64, opacity: 0.38 },
  boardCornerTl: { top: -8, left: -4 },
  boardCornerTr: { top: -8, right: -4, transform: [{ scaleX: -1 }] },
  boardCornerBl: { bottom: -8, left: -4, transform: [{ scaleY: -1 }] },
  boardCornerBr: { bottom: -8, right: -4, transform: [{ scaleX: -1 }, { scaleY: -1 }] },
  boardInner: { flex: 1, position: "relative", justifyContent: "flex-start" },
  boardPin: { position: "absolute", top: -10, width: 16, height: 16, borderRadius: 8, backgroundColor: "#5a221b", borderWidth: 2, borderColor: "#2a0d0a", shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6, zIndex: 4 },
  boardPinLeft: { left: "20%" },
  boardPinRight: { right: "20%" },
  boardBranding: { position: "absolute", alignSelf: "center", paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(14, 8, 4, 0.68)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(249, 221, 172, 0.26)", shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  footer: { width: "100%", alignItems: "center" },
  selectionHelper: { fontFamily: FONTS.mono, color: COLORS.textMuted, letterSpacing: 1.6, textAlign: "center", marginBottom: SPACING.sm },
  hintHelper: { fontFamily: FONTS.mono, letterSpacing: 1.6, textAlign: "center", marginTop: SPACING.sm },
  hintActive: { color: COLORS.accentSecondary },
  hintMuted: { color: "rgba(198, 182, 160, 0.6)" },
  celebrationBlocker: { ...StyleSheet.absoluteFillObject, zIndex: 900, backgroundColor: "transparent" },
  tutorialHand: {
    position: "absolute",
    top: 0,
    left: "50%",
    width: 60,
    height: 60,
    marginLeft: -30,
    zIndex: 100,
    resizeMode: 'contain',
  },
});
