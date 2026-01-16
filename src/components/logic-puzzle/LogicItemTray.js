import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { FONTS } from '../../constants/typography';

export default function LogicItemTray({
  items,
  activeItemId,
  onSelectItem,
  placedCounts,
}) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item) => {
          const isSelected = activeItemId === item.id;
          const isPlaced = placedCounts?.[item.id] > 0;
          return (
            <Pressable
              key={item.id}
              onPress={() => onSelectItem(isSelected ? null : item.id)}
              style={[
                styles.itemButton,
                isSelected && styles.itemButtonSelected,
                isPlaced && !isSelected && styles.itemButtonPlaced,
              ]}
            >
              <Text style={styles.itemEmoji}>{item.emoji}</Text>
              <Text style={styles.itemLabel} numberOfLines={1}>
                {item.label}
              </Text>
              {isPlaced ? <View style={styles.placedDot} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#141010',
  },
  row: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  itemButton: {
    width: 64,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2b211a',
    backgroundColor: '#2a1d15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemButtonSelected: {
    borderColor: '#d7ccc8',
    backgroundColor: '#3b2a1e',
    transform: [{ translateY: -3 }],
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  itemButtonPlaced: {
    opacity: 0.5,
  },
  itemEmoji: {
    fontSize: 18,
  },
  itemLabel: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#e0d7cc',
    marginTop: 4,
  },
  placedDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#66bb6a',
  },
});
