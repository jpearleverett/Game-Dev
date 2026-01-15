import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
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
  ADJ_HORIZONTAL: '⇆',
  ADJ_VERTICAL: '⇅',
  ADJ_DIAGONAL: '⤡',
  ADJ_ORTHOGONAL: '+',
  ADJ_ANY: '✚',
  NOT_ADJACENT: '⊘',
  NOT_ADJ_ORTHOGONAL: '⊘',
  NOT_ADJ_DIAGONAL: '⊘',
};

export default function LogicClueDrawer({
  clues,
  clueStatuses,
  violatedClueId,
  expanded,
  onToggle,
}) {
  const sortedClues = useMemo(() => clues || [], [clues]);

  return (
    <View style={[styles.container, expanded && styles.containerExpanded]}>
      <Pressable onPress={onToggle} style={styles.handle}>
        <Text style={styles.handleLabel}>{expanded ? 'Hide Clues' : 'Clue File'}</Text>
      </Pressable>
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
                    <Text style={styles.relationText}>{RELATION_ICONS[clue.relation] || '?'}</Text>
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
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
  },
  relationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#3c2a1e',
  },
  relationText: {
    fontFamily: FONTS.monoBold,
    fontSize: 14,
    letterSpacing: 1.2,
    color: '#f4e6d4',
  },
  statusBadge: {
    position: 'absolute',
    top: 6,
    right: 10,
    fontFamily: FONTS.monoBold,
    color: '#f4e6d4',
  },
});
