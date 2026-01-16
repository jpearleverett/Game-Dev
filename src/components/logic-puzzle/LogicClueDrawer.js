import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { FONTS } from '../../constants/typography';

const RELATION_ICONS = {
  ON: '=',
  NOT_ON: '≠',
  ROW: '=',
  COL: '=',
  SAME_ROW: '↔',
  SAME_COL: '↕',
  LEFT_OF: '←',
  LEFT_OF_ANY_ROW: '←',
  ABOVE: '↑',
  ABOVE_ANY_COL: '↑',
};

const GRID_RELATIONS = new Set([
  'ADJ_HORIZONTAL',
  'ADJ_VERTICAL',
  'ADJ_DIAGONAL',
  'ADJ_ORTHOGONAL',
  'ADJ_ANY',
  'NOT_ADJACENT',
  'NOT_ADJ_ORTHOGONAL',
  'NOT_ADJ_DIAGONAL',
]);

const buildGridMask = (relation) => {
  const active = new Set();
  const mark = (r, c) => active.add(`${r}-${c}`);
  if (relation === 'ADJ_HORIZONTAL') {
    mark(1, 0); mark(1, 2);
  } else if (relation === 'ADJ_VERTICAL') {
    mark(0, 1); mark(2, 1);
  } else if (relation === 'ADJ_DIAGONAL') {
    mark(0, 0); mark(0, 2); mark(2, 0); mark(2, 2);
  } else if (relation === 'ADJ_ORTHOGONAL') {
    mark(0, 1); mark(1, 0); mark(1, 2); mark(2, 1);
  } else if (relation === 'ADJ_ANY') {
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        if (r === 1 && c === 1) continue;
        mark(r, c);
      }
    }
  } else if (relation === 'NOT_ADJACENT') {
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        if (r === 1 && c === 1) continue;
        mark(r, c);
      }
    }
  } else if (relation === 'NOT_ADJ_ORTHOGONAL') {
    mark(0, 1); mark(1, 0); mark(1, 2); mark(2, 1);
  } else if (relation === 'NOT_ADJ_DIAGONAL') {
    mark(0, 0); mark(0, 2); mark(2, 0); mark(2, 2);
  }
  return active;
};

const RelationGrid = ({ relation, status }) => {
  const active = buildGridMask(relation);
  const isNegative = relation.startsWith('NOT_');
  return (
    <View style={styles.gridIcon}>
      {[0, 1, 2].map((r) => (
        <View key={`r-${r}`} style={styles.gridRow}>
          {[0, 1, 2].map((c) => {
            const key = `${r}-${c}`;
            const isCenter = r === 1 && c === 1;
            const isActive = active.has(key);
            const baseStyle = [styles.gridCell];
            if (isCenter) {
              baseStyle.push(styles.gridCellCenter);
            } else if (isActive) {
              if (isNegative) {
                if (status === 'violated') baseStyle.push(styles.gridCellActiveBad);
                else baseStyle.push(styles.gridCellActiveNegative);
              } else if (status === 'satisfied') {
                baseStyle.push(styles.gridCellActiveGood);
              } else {
                baseStyle.push(styles.gridCellActivePositive);
              }
            } else {
              baseStyle.push(styles.gridCellInactive);
            }
            return <View key={key} style={baseStyle} />;
          })}
        </View>
      ))}
    </View>
  );
};

export default function LogicClueDrawer({
  clues,
  clueStatuses,
  violatedClueId,
  expanded,
  onToggle,
  isPencilMode,
  onToggleMode,
}) {
  const sortedClues = useMemo(() => clues || [], [clues]);

  return (
    <View style={[styles.container, expanded && styles.containerExpanded]}>
      <View style={styles.handle}>
        <View style={styles.modeButtons}>
          <Pressable
            onPress={() => onToggleMode?.(false)}
            style={[styles.modeButton, !isPencilMode && styles.modeButtonActive]}
          >
            <MaterialCommunityIcons
              name="stamp"
              size={16}
              color={isPencilMode ? '#8a7a6a' : '#1a120b'}
            />
          </Pressable>
          <Pressable
            onPress={() => onToggleMode?.(true)}
            style={[styles.modeButton, isPencilMode && styles.modeButtonActive]}
          >
            <MaterialCommunityIcons
              name="pencil"
              size={16}
              color={isPencilMode ? '#1a120b' : '#8a7a6a'}
            />
          </Pressable>
        </View>
        <Pressable onPress={onToggle} style={styles.handleTouchable}>
          <Text style={styles.handleLabel}>{expanded ? 'Hide Clues' : 'Clue File'}</Text>
        </Pressable>
        <View style={styles.handleSpacer} />
      </View>
      {expanded && (
        <ScrollView contentContainerStyle={styles.clueList} showsVerticalScrollIndicator={false}>
          {sortedClues.map((clue) => {
            const status = clueStatuses?.[clue.id] || 'neutral';
            const isViolated = violatedClueId === clue.id || status === 'violated';
            const badge = status === 'satisfied' ? '✓' : isViolated ? '!' : '';
            return (
              <View
                key={clue.id}
                style={[
                  styles.clueCard,
                  status === 'satisfied' && styles.clueSatisfied,
                  isViolated && styles.clueViolated,
                ]}
              >
                <View style={styles.clueRow}>
                  <Text style={styles.clueIcon}>{clue.icon1}</Text>
                <View style={styles.relationBadge}>
                    {GRID_RELATIONS.has(clue.relation)
                      ? <RelationGrid relation={clue.relation} status={status} />
                      : <Text style={styles.relationText}>{RELATION_ICONS[clue.relation] || '?'}</Text>}
                </View>
                  <Text style={styles.clueIcon}>{clue.icon2}</Text>
                </View>
                {badge ? <Text style={styles.statusBadge}>{badge}</Text> : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1b1410',
    borderTopWidth: 2,
    borderColor: '#3b2a1c',
  },
  containerExpanded: {
    maxHeight: 220,
  },
  handle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  modeButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#2a1d15',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#d7ccc8',
    borderColor: '#e8ddd4',
  },
  handleTouchable: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  handleSpacer: {
    width: 60,
  },
  handleLabel: {
    fontFamily: FONTS.monoBold,
    color: '#d7ccc8',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 12,
  },
  clueList: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  clueCard: {
    backgroundColor: '#2a1d15',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 10,
    position: 'relative',
    width: '31%',
    marginBottom: 10,
  },
  clueSatisfied: {
    borderColor: '#4caf50',
    backgroundColor: 'rgba(76,175,80,0.12)',
  },
  clueViolated: {
    borderColor: '#ef5350',
    backgroundColor: 'rgba(239,83,80,0.12)',
  },
  clueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clueIcon: {
    fontSize: 18,
    color: '#f4e6d4',
    fontFamily: FONTS.monoBold,
  },
  relationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#3c2a1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  relationText: {
    fontFamily: FONTS.monoBold,
    fontSize: 14,
    letterSpacing: 1.2,
    color: '#f4e6d4',
  },
  gridIcon: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    width: 6,
    height: 6,
    margin: 1,
    borderRadius: 1,
  },
  gridCellCenter: {
    backgroundColor: '#f4e6d4',
  },
  gridCellActive: {
    backgroundColor: '#cfd8dc',
  },
  gridCellActivePositive: {
    backgroundColor: '#7db4ff',
  },
  gridCellActiveNegative: {
    backgroundColor: '#ef5350',
  },
  gridCellActiveGood: {
    backgroundColor: '#66bb6a',
  },
  gridCellActiveBad: {
    backgroundColor: '#ef5350',
  },
  gridCellInactive: {
    backgroundColor: '#5a4a3d',
  },
  statusBadge: {
    position: 'absolute',
    top: 6,
    right: 10,
    fontFamily: FONTS.monoBold,
    color: '#f4e6d4',
  },
});
