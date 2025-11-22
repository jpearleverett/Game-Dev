import React, { useMemo, useCallback } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import WordCard from '../WordCard';

function deriveWordState(word, { selectedWords, confirmedOutliers, lockedMainWords }) {
  if (confirmedOutliers.includes(word)) return 'lockedOutlier';
  if (lockedMainWords.includes(word)) return 'lockedMain';
  if (selectedWords.includes(word)) return 'selected';
  return 'default';
}

const BoardGridCell = React.memo(({
  item,
  widthPercent,
  tilePadding,
  onLayoutWordFactory,
  tilt,
  wordState,
  cardDisabled,
  branchWordLookup,
  branchMetaByKey,
  onToggleWord,
  onHintRequest,
  hintsActive,
  colorBlindMode,
  highContrast,
  celebratingOutliers,
  celebrationDelay,
}) => {
  
  const handleLayout = useCallback((e) => {
      onLayoutWordFactory(item.id, item.word)(e);
  }, [onLayoutWordFactory, item.id, item.word]);

  const branchKey = branchWordLookup
    ? branchWordLookup[
        item.word && typeof item.word === 'string'
          ? item.word.toUpperCase()
          : ''
      ]
    : null;
  const branchMeta = branchMetaByKey ? branchMetaByKey[branchKey] : null;
  
  // Memoize the badge object to ensure strict equality if data hasn't changed
  // Although this is created inside render, useMemo helps if this component re-renders for other reasons
  // but actually since we are inside the component, we compute it.
  const outlierBadge = useMemo(() => {
    return wordState === 'lockedOutlier' && branchMeta
      ? {
          label: branchMeta.badgeLabel,
          color: branchMeta.color,
        }
      : null;
  }, [wordState, branchMeta]);

  return (
    <View
      onLayout={handleLayout}
      style={{
        width: widthPercent,
        paddingHorizontal: tilePadding,
        paddingVertical: tilePadding,
      }}
    >
      <Animated.View
        style={[
          styles.cardWrapper,
          { transform: [{ rotate: `${tilt}deg` }] },
        ]}
      >
        <WordCard
          word={item.word}
          state={wordState}
          onToggle={onToggleWord}
          onHint={hintsActive ? onHintRequest : undefined}
          colorBlindMode={colorBlindMode}
          highContrast={highContrast}
          hintsActive={hintsActive}
          celebrating={celebratingOutliers}
          celebrationDelay={celebrationDelay}
          disabled={cardDisabled}
          outlierBadge={outlierBadge}
        />
      </Animated.View>
    </View>
  );
});

function BoardGrid({
  wordCells,
  columns,
  tilePadding,
  marginTop,
  onLayoutGrid,
  onLayoutWord, // This is the factory function
  wordTilts,
  selectedWords,
  confirmedOutliers,
  lockedMainWords,
  selectionLimitReached,
  onToggleWord,
  hintsActive,
  onHintRequest,
  colorBlindMode,
  highContrast,
  celebratingOutliers,
  celebrationDelays,
  branchWordLookup,
  branchMetaByKey,
}) {
  
  const widthPercent = `${100 / columns}%`;

  return (
    <View
      style={[
        styles.grid,
        {
          marginHorizontal: -tilePadding,
          marginTop: marginTop,
        },
      ]}
      onLayout={onLayoutGrid}
    >
      {wordCells.map((item) => {
        const tilt = wordTilts[item.id] || 0;
        const wordState = deriveWordState(item.word, {
          selectedWords,
          confirmedOutliers,
          lockedMainWords,
        });
        const cardDisabled = wordState === 'default' && selectionLimitReached;
        const delay = celebrationDelays[item.id] || 0;

        return (
          <BoardGridCell
            key={item.id}
            item={item}
            widthPercent={widthPercent}
            tilePadding={tilePadding}
            onLayoutWordFactory={onLayoutWord}
            tilt={tilt}
            wordState={wordState}
            cardDisabled={cardDisabled}
            branchWordLookup={branchWordLookup}
            branchMetaByKey={branchMetaByKey}
            onToggleWord={onToggleWord}
            onHintRequest={onHintRequest}
            hintsActive={hintsActive}
            colorBlindMode={colorBlindMode}
            highContrast={highContrast}
            celebratingOutliers={celebratingOutliers}
            celebrationDelay={delay}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardWrapper: {
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.26,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});

export default React.memo(BoardGrid);
