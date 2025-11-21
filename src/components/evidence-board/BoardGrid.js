import React from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import WordCard from '../WordCard';

function deriveWordState(word, { selectedWords, confirmedOutliers, lockedMainWords }) {
  if (confirmedOutliers.includes(word)) return 'lockedOutlier';
  if (lockedMainWords.includes(word)) return 'lockedMain';
  if (selectedWords.includes(word)) return 'selected';
  return 'default';
}

export default function BoardGrid({
  wordCells,
  columns,
  tilePadding,
  marginTop,
  onLayoutGrid,
  onLayoutWord, // Function: (id, word) => (event) => void
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

        const branchKey = branchWordLookup
          ? branchWordLookup[
              item.word && typeof item.word === 'string'
                ? item.word.toUpperCase()
                : ''
            ]
          : null;
        const branchMeta = branchMetaByKey ? branchMetaByKey[branchKey] : null;
        const outlierBadge =
          wordState === 'lockedOutlier' && branchMeta
            ? {
                label: branchMeta.badgeLabel,
                color: branchMeta.color,
              }
            : null;

        return (
          <View
            key={item.id}
            onLayout={onLayoutWord(item.id, item.word)}
            style={{
              width: `${100 / columns}%`,
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
                celebrationDelay={celebrationDelays[item.id] || 0}
                disabled={cardDisabled}
                outlierBadge={outlierBadge}
              />
            </Animated.View>
          </View>
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
