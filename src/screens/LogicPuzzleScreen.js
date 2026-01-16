import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenSurface from '../components/ScreenSurface';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import LogicGrid from '../components/logic-puzzle/LogicGrid';
import LogicClueDrawer from '../components/logic-puzzle/LogicClueDrawer';
import LogicItemTray from '../components/logic-puzzle/LogicItemTray';
import { useGame } from '../context/GameContext';
import { parseCaseNumber, resolveStoryPathKey, formatCaseNumber } from '../data/storyContent';
import { generateLogicPuzzle, getLogicDifficultyForChapter } from '../services/LogicPuzzleService';
import { clearLogicPuzzle, loadLogicPuzzle, saveLogicPuzzle } from '../storage/logicPuzzleStorage';
import { FONTS, FONT_SIZES } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

const STATUS = {
  LOADING: 'loading',
  PLAYING: 'playing',
  SOLVED: 'solved',
  ERROR: 'error',
};

export default function LogicPuzzleScreen({ navigation }) {
  const { activeCase, progress, completeLogicPuzzle } = useGame();
  const { width, moderateScale, scaleSpacing } = useResponsiveLayout();

  const caseNumber = activeCase?.caseNumber;
  const storyCampaign = progress.storyCampaign;
  const pathKey = resolveStoryPathKey(caseNumber, storyCampaign);
  const { chapter, subchapter } = parseCaseNumber(caseNumber);
  const nextCaseNumber = formatCaseNumber(chapter, subchapter + 1);

  const [status, setStatus] = useState(STATUS.LOADING);
  const [puzzle, setPuzzle] = useState(null);
  const [placedItems, setPlacedItems] = useState({});
  const [candidates, setCandidates] = useState({});
  const [history, setHistory] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [violatedClueId, setViolatedClueId] = useState(null);
  const [activeItemId, setActiveItemId] = useState(null);
  const [isPencilMode, setIsPencilMode] = useState(false);
  const [cluesExpanded, setCluesExpanded] = useState(false);

  const saveTimerRef = useRef(null);

  const caseTitle = activeCase?.title || puzzle?.story || 'Unsolved Mystery';
  const summary = activeCase?.briefing?.summary || activeCase?.storyMeta?.bridgeText || null;

  const loadPuzzle = useCallback(async () => {
    if (!caseNumber) return;
    setStatus(STATUS.LOADING);
    setErrorMsg(null);

    const stored = await loadLogicPuzzle(caseNumber, pathKey);
    if (stored?.puzzle) {
      setPuzzle(stored.puzzle);
      setPlacedItems(stored.state?.placedItems || {});
      setCandidates(stored.state?.candidates || {});
      setHistory(stored.state?.history || []);
      setMistakes(stored.state?.mistakes || 0);
      setStartTime(stored.state?.startTime || Date.now());
      setStatus(stored.state?.status === STATUS.SOLVED ? STATUS.SOLVED : STATUS.PLAYING);
      return;
    }

    try {
      const difficulty = getLogicDifficultyForChapter(chapter);
      const generated = await generateLogicPuzzle(difficulty, { title: caseTitle, summary });
      setPuzzle(generated);
      setPlacedItems({});
      setCandidates({});
      setHistory([]);
      setMistakes(0);
      setStartTime(Date.now());
      setStatus(STATUS.PLAYING);
      await saveLogicPuzzle(caseNumber, pathKey, {
        puzzle: generated,
        state: {
          placedItems: {},
          candidates: {},
          history: [],
          mistakes: 0,
          startTime: Date.now(),
          status: STATUS.PLAYING,
        },
      });
    } catch (error) {
      console.error('[LogicPuzzleScreen] Failed to generate puzzle:', error);
      setErrorMsg(error?.message || 'Failed to generate puzzle. Try again.');
      setStatus(STATUS.ERROR);
    }
  }, [caseNumber, pathKey, chapter, caseTitle, summary]);

  useEffect(() => {
    loadPuzzle();
  }, [loadPuzzle]);

  useEffect(() => {
    if (!puzzle || status !== STATUS.PLAYING) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveLogicPuzzle(caseNumber, pathKey, {
        puzzle,
        state: {
          placedItems,
          candidates,
          history: history.slice(-80),
          mistakes,
          startTime,
          status,
        },
      });
    }, 350);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [puzzle, placedItems, candidates, history, mistakes, startTime, status, caseNumber, pathKey]);

  const pushHistory = useCallback((prevState) => {
    const entry = {
      placedItems: { ...prevState.placedItems },
      candidates: { ...prevState.candidates },
    };
    return [...prevState.history, entry];
  }, []);

  const performUndo = useCallback(() => {
    setHistory((prevHistory) => {
      if (!prevHistory.length) return prevHistory;
      const nextHistory = [...prevHistory];
      const last = nextHistory.pop();
      if (!last) return prevHistory;
      setPlacedItems(last.placedItems || {});
      setCandidates(last.candidates || {});
      setViolatedClueId(null);
      return nextHistory;
    });
  }, []);

  const performPlacement = useCallback((row, col, itemId) => {
    setViolatedClueId(null);
    setHistory((prevHistory) => {
      const newHistory = pushHistory({ placedItems, candidates, history: prevHistory });
      return newHistory;
    });

    setPlacedItems((prevPlaced) => {
      const nextPlaced = { ...prevPlaced };
      Object.keys(nextPlaced).forEach((key) => {
        if (key === itemId) delete nextPlaced[key];
      });
      const existingAtTarget = Object.keys(nextPlaced).find(
        (key) => nextPlaced[key].row === row && nextPlaced[key].col === col,
      );
      if (existingAtTarget) delete nextPlaced[existingAtTarget];
      nextPlaced[itemId] = { row, col };
      return nextPlaced;
    });

    setCandidates((prevCandidates) => {
      const next = { ...prevCandidates };
      Object.keys(next).forEach((key) => {
        const [rStr, cStr] = key.split('-');
        const r = Number(rStr);
        const c = Number(cStr);
        if (r === row || c === col) {
          delete next[key];
          return;
        }
        const list = next[key];
        if (list.includes(itemId)) {
          const filtered = list.filter((id) => id !== itemId);
          if (!filtered.length) {
            delete next[key];
          } else {
            next[key] = filtered;
          }
        }
      });
      return next;
    });
  }, [pushHistory, placedItems, candidates]);

  const performRemoval = useCallback((itemId) => {
    setViolatedClueId(null);
    setHistory((prevHistory) => {
      const newHistory = pushHistory({ placedItems, candidates, history: prevHistory });
      return newHistory;
    });
    setPlacedItems((prevPlaced) => {
      const nextPlaced = { ...prevPlaced };
      delete nextPlaced[itemId];
      return nextPlaced;
    });
  }, [pushHistory, placedItems, candidates]);

  const performNote = useCallback((row, col, itemId, forceAction = null) => {
    setCandidates((prev) => {
      const key = `${row}-${col}`;
      const currentCandidates = prev[key] || [];
      const hasItem = currentCandidates.includes(itemId);
      const shouldAdd = forceAction ? forceAction === 'add' : !hasItem;
      if ((shouldAdd && hasItem) || (!shouldAdd && !hasItem)) {
        return prev;
      }

      setHistory((prevHistory) => pushHistory({ placedItems, candidates: prev, history: prevHistory }));

      if (shouldAdd) {
        return { ...prev, [key]: [...currentCandidates, itemId] };
      }
      const newList = currentCandidates.filter((id) => id !== itemId);
      if (!newList.length) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: newList };
    });
  }, [pushHistory, placedItems]);

  const handleCellPress = useCallback((row, col) => {
    if (status !== STATUS.PLAYING || !puzzle) return;
    const cell = puzzle.grid[row][col];
    if (cell.terrain === 'fog' || cell.staticObject !== 'none') return;
    if (!activeItemId) return;

    if (isPencilMode) {
      performNote(row, col, activeItemId);
      return;
    }

    const existingPlacedId = Object.keys(placedItems).find(
      (id) => placedItems[id].row === row && placedItems[id].col === col,
    );
    if (existingPlacedId) {
      if (activeItemId === existingPlacedId) {
        performRemoval(existingPlacedId);
      } else {
        performPlacement(row, col, activeItemId);
      }
    } else {
      performPlacement(row, col, activeItemId);
    }
  }, [status, puzzle, activeItemId, isPencilMode, performNote, placedItems, performPlacement, performRemoval]);

  const handlePencilAction = useCallback((row, col, action) => {
    if (!activeItemId) return;
    performNote(row, col, activeItemId, action);
  }, [activeItemId, performNote]);

  const checkClue = useCallback((clue, placements, grid) => {
    const p1 = placements[clue.item1];
    if (!p1) return 'neutral';

    const isStatic = ['Lamp', 'Bench', 'Hydrant', 'Fog', 'Street', 'Park', 'Building'].includes(clue.item2)
      || !Number.isNaN(Number(clue.item2))
      || COL_LABELS.includes(clue.item2);

    let p2 = null;
    if (!isStatic) {
      p2 = placements[clue.item2];
      if (!p2) return 'neutral';
    }

    const checkStaticNeighbor = (neighbors, target) => {
      for (const { r, c } of neighbors) {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) continue;
        const nCell = grid[r][c];
        if (target === 'Lamp' && nCell.staticObject === 'lamp') return true;
        if (target === 'Bench' && nCell.staticObject === 'bench') return true;
        if (target === 'Hydrant' && nCell.staticObject === 'hydrant') return true;
        if (target === 'Fog' && nCell.terrain === 'fog') return true;
      }
      return false;
    };

    let satisfied = false;
    switch (clue.relation) {
      case 'ON': {
        const cell = grid[p1.row][p1.col];
        if (clue.item2 === 'Street') satisfied = cell.terrain === 'street';
        else if (clue.item2 === 'Park') satisfied = cell.terrain === 'park';
        else if (clue.item2 === 'Building') satisfied = cell.terrain === 'building';
        else if (clue.item2 === 'Lamp') satisfied = cell.staticObject === 'lamp';
        else if (clue.item2 === 'Bench') satisfied = cell.staticObject === 'bench';
        else if (clue.item2 === 'Hydrant') satisfied = cell.staticObject === 'hydrant';
        break;
      }
      case 'NOT_ON': {
        const cell = grid[p1.row][p1.col];
        let isOn = false;
        if (clue.item2 === 'Street') isOn = cell.terrain === 'street';
        else if (clue.item2 === 'Park') isOn = cell.terrain === 'park';
        else if (clue.item2 === 'Building') isOn = cell.terrain === 'building';
        satisfied = !isOn;
        break;
      }
      case 'ROW':
        satisfied = (p1.row + 1).toString() === clue.item2;
        break;
      case 'COL':
        satisfied = COL_LABELS[p1.col] === clue.item2;
        break;
      case 'SAME_ROW':
        if (p2) satisfied = p1.row === p2.row;
        break;
      case 'SAME_COL':
        if (p2) satisfied = p1.col === p2.col;
        break;
      case 'LEFT_OF':
        if (p2) satisfied = p1.row === p2.row && p1.col < p2.col;
        break;
      case 'LEFT_OF_ANY_ROW':
        if (p2) satisfied = p1.col < p2.col;
        break;
      case 'ABOVE':
        if (p2) satisfied = p1.col === p2.col && p1.row < p2.row;
        break;
      case 'ABOVE_ANY_COL':
        if (p2) satisfied = p1.row < p2.row;
        break;
      case 'ADJ_HORIZONTAL':
        if (p2) satisfied = p1.row === p2.row && Math.abs(p1.col - p2.col) === 1;
        break;
      case 'ADJ_VERTICAL':
        if (p2) satisfied = p1.col === p2.col && Math.abs(p1.row - p2.row) === 1;
        break;
      case 'ADJ_DIAGONAL':
        if (p2) satisfied = Math.abs(p1.row - p2.row) === 1 && Math.abs(p1.col - p2.col) === 1;
        break;
      case 'ADJ_ORTHOGONAL':
        if (p2) {
          satisfied = (p1.row === p2.row && Math.abs(p1.col - p2.col) === 1)
            || (p1.col === p2.col && Math.abs(p1.row - p2.row) === 1);
        } else if (isStatic) {
          const neighbors = [
            { r: p1.row - 1, c: p1.col },
            { r: p1.row + 1, c: p1.col },
            { r: p1.row, c: p1.col - 1 },
            { r: p1.row, c: p1.col + 1 },
          ];
          satisfied = checkStaticNeighbor(neighbors, clue.item2);
        }
        break;
      case 'NOT_ADJACENT':
        if (p2) {
          const touching = Math.abs(p1.row - p2.row) <= 1 && Math.abs(p1.col - p2.col) <= 1;
          satisfied = !touching;
        } else if (isStatic) {
          satisfied = true;
        }
        break;
      case 'NOT_ADJ_ORTHOGONAL':
        if (p2) {
          const orthogonal = (p1.row === p2.row && Math.abs(p1.col - p2.col) === 1)
            || (p1.col === p2.col && Math.abs(p1.row - p2.row) === 1);
          satisfied = !orthogonal;
        }
        break;
      case 'NOT_ADJ_DIAGONAL':
        if (p2) {
          const diagonal = Math.abs(p1.row - p2.row) === 1 && Math.abs(p1.col - p2.col) === 1;
          satisfied = !diagonal;
        }
        break;
      case 'ADJ_ANY':
      default:
        if (p2) {
          satisfied = Math.abs(p1.row - p2.row) <= 1 && Math.abs(p1.col - p2.col) <= 1
            && !(p1.row === p2.row && p1.col === p2.col);
        } else if (isStatic) {
          const neighbors = [
            { r: p1.row - 1, c: p1.col - 1 },
            { r: p1.row - 1, c: p1.col },
            { r: p1.row - 1, c: p1.col + 1 },
            { r: p1.row, c: p1.col - 1 },
            { r: p1.row, c: p1.col + 1 },
            { r: p1.row + 1, c: p1.col - 1 },
            { r: p1.row + 1, c: p1.col },
            { r: p1.row + 1, c: p1.col + 1 },
          ];
          satisfied = checkStaticNeighbor(neighbors, clue.item2);
        }
        break;
    }

    return satisfied ? 'satisfied' : 'violated';
  }, []);

  const clueStatuses = useMemo(() => {
    if (!puzzle) return {};
    const statuses = {};
    puzzle.clues.forEach((clue) => {
      statuses[clue.id] = checkClue(clue, placedItems, puzzle.grid);
    });
    return statuses;
  }, [puzzle, placedItems, checkClue]);

  const checkSolution = useCallback(async () => {
    if (!puzzle) return;
    const { items } = puzzle;

    if (Object.keys(placedItems).length !== items.length) {
      setErrorMsg(`Place all ${items.length} items.`);
      setTimeout(() => setErrorMsg(null), 2500);
      return;
    }

    const violations = Object.keys(clueStatuses).filter((id) => clueStatuses[id] === 'violated');
    const rows = new Set();
    const cols = new Set();
    let gridViolation = false;
    Object.values(placedItems).forEach(({ row, col }) => {
      if (rows.has(row) || cols.has(col)) gridViolation = true;
      rows.add(row);
      cols.add(col);
    });

    if (violations.length > 0 || gridViolation) {
      setMistakes((prev) => prev + 1);
      setViolatedClueId(violations[0] || null);
      setErrorMsg('Evidence contradicts logic.');
      setTimeout(() => {
        setErrorMsg(null);
        setViolatedClueId(null);
      }, 3000);
      return;
    }

    setStatus(STATUS.SOLVED);
    await clearLogicPuzzle(caseNumber, pathKey);
    completeLogicPuzzle?.({ caseId: activeCase?.id, caseNumber, mistakes });
  }, [puzzle, placedItems, clueStatuses, caseNumber, pathKey, mistakes, completeLogicPuzzle, activeCase?.id]);

  const placedCounts = useMemo(() => {
    const counts = {};
    if (!puzzle) return counts;
    puzzle.items.forEach((item) => {
      counts[item.id] = 0;
    });
    Object.keys(placedItems).forEach((id) => {
      if (counts[id] !== undefined) counts[id] += 1;
    });
    return counts;
  }, [puzzle, placedItems]);

  const gridSize = puzzle?.gridSize || 6;
  const labelSize = Math.max(18, Math.floor(moderateScale(22)));
  const availableWidth = width - scaleSpacing(SPACING.lg) * 2 - labelSize;
  const cellSize = Math.max(28, Math.floor(availableWidth / gridSize) - 2);

  return (
    <ScreenSurface variant="desk" frameless accentColor="#d7ccc8">
      <View style={styles.container}>
        <View style={styles.header}>
          <SecondaryButton label="< Back" onPress={() => navigation.navigate('CaseFile')} size="compact" />
          <View style={styles.headerTitle}>
            <Text style={styles.headerLabel}>Case File</Text>
            <Text style={styles.headerTitleText}>{caseTitle}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.headerMeta}>
              <Text style={styles.metaLabel}>Mistakes</Text>
              <Text style={styles.metaValue}>{mistakes}</Text>
            </View>
            {puzzle && (
              <Pressable onPress={checkSolution} style={styles.checkButton}>
                <Text style={styles.checkButtonText}>Solve</Text>
              </Pressable>
            )}
          </View>
        </View>

        {status === STATUS.ERROR && (
          <View style={styles.errorPanel}>
            <Text style={styles.errorText}>{errorMsg || 'Failed to load puzzle.'}</Text>
            <PrimaryButton label="Retry" onPress={loadPuzzle} fullWidth />
          </View>
        )}

        {status === STATUS.LOADING && (
          <View style={styles.loadingPanel}>
            <Text style={styles.loadingText}>Gathering Evidence...</Text>
          </View>
        )}

        {status !== STATUS.ERROR && puzzle && (
          <>
            <View style={styles.gridWrap}>
              <LogicGrid
                grid={puzzle.grid}
                placedItems={placedItems}
                candidates={candidates}
                itemsConfig={puzzle.items}
                activeItemId={activeItemId}
                isPencilMode={isPencilMode}
                onCellPress={handleCellPress}
                onPencilAction={handlePencilAction}
                cellSize={cellSize}
                labelSize={labelSize}
              />
              <View style={styles.gridControls}>
                <Pressable onPress={performUndo} style={styles.iconButton}>
                  <MaterialCommunityIcons name="undo-variant" size={18} color="#f4e6d4" />
                </Pressable>
              </View>
              {errorMsg ? (
                <View style={styles.gridToast}>
                  <Text style={styles.toastText}>{errorMsg}</Text>
                </View>
              ) : null}
            </View>
            <LogicItemTray
              items={puzzle.items}
              activeItemId={activeItemId}
              onSelectItem={setActiveItemId}
              placedCounts={placedCounts}
            />
            <LogicClueDrawer
              clues={puzzle.clues}
              clueStatuses={clueStatuses}
              violatedClueId={violatedClueId}
              expanded={cluesExpanded}
              onToggle={() => setCluesExpanded((prev) => !prev)}
              isPencilMode={isPencilMode}
              onToggleMode={setIsPencilMode}
            />
          </>
        )}

        {status === STATUS.SOLVED && (
          <View style={styles.solvedOverlay}>
            <View style={styles.solvedCard}>
              <Text style={styles.solvedTitle}>Case Closed</Text>
              <Text style={styles.solvedBody}>
                The logic lines up. File the report and move to the next lead.
              </Text>
              <PrimaryButton label="Continue Investigation" onPress={() => navigation.navigate('CaseFile', { caseNumber: nextCaseNumber })} fullWidth />
            </View>
          </View>
        )}
      </View>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    gap: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
  },
  headerLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: '#c0b0a0',
    textTransform: 'uppercase',
  },
  headerTitleText: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.lg,
    color: '#f4e6d4',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerMeta: {
    alignItems: 'flex-end',
  },
  checkButton: {
    backgroundColor: '#d7ccc8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  checkButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#1a120b',
  },
  metaLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    color: '#c0b0a0',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.md,
    color: '#ef9a9a',
  },
  loadingPanel: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FONTS.mono,
    color: '#c0b0a0',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  errorPanel: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#5a221b',
    backgroundColor: 'rgba(90,34,27,0.3)',
    gap: SPACING.sm,
  },
  errorText: {
    fontFamily: FONTS.primary,
    color: '#ffb4a2',
  },
  gridToast: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    transform: [{ translateY: -20 }],
    alignItems: 'center',
  },
  toastText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    letterSpacing: 1.5,
    color: '#ffb4a2',
    backgroundColor: 'rgba(33,33,33,0.95)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  gridWrap: {
    alignSelf: 'center',
    position: 'relative',
  },
  gridControls: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2a1d15',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: '#d7ccc8',
    borderColor: '#f4e6d4',
  },
  solvedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  solvedCard: {
    width: '100%',
    maxWidth: 420,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: '#2a1d15',
    borderWidth: 1,
    borderColor: '#4a3728',
    gap: SPACING.md,
  },
  solvedTitle: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.lg,
    color: '#f4e6d4',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  solvedBody: {
    fontFamily: FONTS.primary,
    color: '#d7ccc8',
    textAlign: 'center',
  },
});
