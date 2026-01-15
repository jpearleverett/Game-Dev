import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FONTS } from '../../constants/typography';

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

const terrainStyles = {
  street: { backgroundColor: '#607d8b', borderColor: '#455a64', icon: '🛣️' },
  park: { backgroundColor: '#388e3c', borderColor: '#2e7d32', icon: '🌳' },
  building: { backgroundColor: '#8d6e63', borderColor: '#6d4c41', icon: '🏢' },
  fog: { backgroundColor: '#0a0a0a', borderColor: '#111111', icon: '🌫️' },
};

const staticIcons = {
  lamp: '💡',
  bench: '🪑',
  hydrant: '🚒',
};

export default function LogicGrid({
  grid,
  placedItems,
  candidates,
  itemsConfig,
  activeItemId,
  isPencilMode,
  onCellPress,
  cellSize,
  labelSize,
}) {
  const gridSize = grid?.length || 0;

  const placedLookup = useMemo(() => {
    const lookup = {};
    Object.entries(placedItems || {}).forEach(([id, pos]) => {
      lookup[`${pos.row}-${pos.col}`] = id;
    });
    return lookup;
  }, [placedItems]);

  const candidateLookup = candidates || {};

  if (!gridSize) {
    return null;
  }

  return (
    <View style={[styles.gridContainer, { padding: Math.max(6, Math.floor(cellSize * 0.08)) }]}>
      <View style={styles.row}>
        <View style={{ width: labelSize, height: labelSize }} />
        {grid[0].map((_, colIndex) => (
          <View key={`col-${colIndex}`} style={[styles.labelCell, { width: cellSize, height: labelSize }]}>
            <Text style={styles.labelText}>{COL_LABELS[colIndex]}</Text>
          </View>
        ))}
      </View>
      {grid.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          <View style={[styles.labelCell, { width: labelSize, height: cellSize }]}>
            <Text style={styles.labelText}>{rowIndex + 1}</Text>
          </View>
          {row.map((cell) => {
            const key = `${cell.row}-${cell.col}`;
            const placedId = placedLookup[key];
            const placedItem = placedId ? itemsConfig.find((i) => i.id === placedId) : null;
            const cellCandidates = candidateLookup[key] || [];
            const terrain = terrainStyles[cell.terrain] || terrainStyles.street;
            const isFog = cell.terrain === 'fog';
            const isBlocked = cell.staticObject !== 'none';
            const isActionable = Boolean(activeItemId) && !isFog && !isBlocked;

            return (
              <Pressable
                key={key}
                onPress={() => onCellPress(cell.row, cell.col)}
                disabled={!isActionable && !(isPencilMode && activeItemId)}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: terrain.backgroundColor,
                    borderColor: terrain.borderColor,
                    opacity: isFog ? 0.25 : 1,
                  },
                  isActionable && styles.cellActive,
                ]}
              >
                {isFog ? (
                  <View style={styles.fogOverlay} />
                ) : (
                  <>
                    {!isBlocked && (
                      <Text style={styles.terrainIcon}>{terrain.icon}</Text>
                    )}
                    {cell.staticObject !== 'none' && (
                      <Text style={styles.staticIcon}>{staticIcons[cell.staticObject] || '?'}</Text>
                    )}
                    {placedItem && (
                      <Text style={styles.placedIcon}>{placedItem.emoji}</Text>
                    )}
                    {!placedItem && cellCandidates.length > 0 && (
                      <View style={styles.candidateGrid}>
                        {cellCandidates.slice(0, 4).map((id) => {
                          const emoji = itemsConfig.find((i) => i.id === id)?.emoji || '?';
                          return (
                            <Text key={`${key}-${id}`} style={styles.candidateIcon}>
                              {emoji}
                            </Text>
                          );
                        })}
                      </View>
                    )}
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    alignSelf: 'center',
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2b2b2b',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontFamily: FONTS.monoBold,
    color: '#8c8c8c',
    fontSize: 12,
    letterSpacing: 1.2,
  },
  cell: {
    margin: 1,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cellActive: {
    shadowColor: '#fff',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  fogOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    opacity: 0.45,
  },
  terrainIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    fontSize: 10,
    opacity: 0.4,
  },
  staticIcon: {
    position: 'absolute',
    fontSize: 16,
    opacity: 0.9,
  },
  placedIcon: {
    fontSize: 20,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  candidateGrid: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  candidateIcon: {
    fontSize: 10,
    width: '48%',
    textAlign: 'center',
    opacity: 0.85,
  },
});
