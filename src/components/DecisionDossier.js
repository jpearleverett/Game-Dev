import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

export default function DecisionDossier({
  option,
  isSelected,
  isLocked,
  onSelect,
  onConfirm,
  index,
}) {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const sealOpacity = useRef(new Animated.Value(0)).current;
  
  // Random rotation for "messy desk" feel when not selected
  const restingRotation = useRef(`${(Math.random() * 4 - 2)}deg`).current;

  useEffect(() => {
    const targetScale = isSelected ? 1.02 : 0.95;
    const targetRotate = isSelected ? 0 : 1; // 0 = straight, 1 = resting

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: targetScale,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: targetRotate,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Reset seal if deselected
    if (!isSelected) {
      sealOpacity.setValue(0);
    } else {
      // Fade in the seal button
      Animated.timing(sealOpacity, {
        toValue: 1,
        duration: 400,
        delay: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isSelected, scaleAnim, rotateAnim, sealOpacity]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', restingRotation],
  });

  return (
    <Pressable
      onPress={() => !isSelected && onSelect(option.key)}
      style={styles.container}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.folder,
          {
            transform: [{ scale: scaleAnim }, { rotate: rotation }],
            zIndex: isSelected ? 10 : 1,
            opacity: isSelected ? 1 : 0.6,
          },
        ]}
      >
        {/* Tab */}
        <View style={styles.tabContainer}>
            <View style={styles.tab}>
                <Text style={styles.tabText}>CONFIDENTIAL</Text>
            </View>
        </View>

        {/* Main Folder Body */}
        <View style={styles.body}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.stampBox}>
                    <Text style={styles.stampText}>OPTION {option.key}</Text>
                </View>
                {isSelected && (
                    <View style={styles.classifiedStamp}>
                        <Text style={styles.classifiedText}>TOP SECRET</Text>
                    </View>
                )}
            </View>

            {/* Content */}
            <Text style={styles.title}>{option.title}</Text>
            <View style={styles.divider} />
            <Text style={styles.description} numberOfLines={isSelected ? undefined : 3}>
                {option.description || option.consequence}
            </Text>

            {/* Stats/Meta */}
            {isSelected && option.stats && (
                <View style={styles.statsContainer}>
                    <Text style={styles.statsLabel}>PROJECTED OUTCOME:</Text>
                    <Text style={styles.statsValue}>{option.stats}</Text>
                </View>
            )}

            {/* Confirm Button (Only when selected) */}
            {isSelected && !isLocked && (
                <Animated.View style={{ opacity: sealOpacity, marginTop: SPACING.xl }}>
                    <Pressable
                        onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            onConfirm(option.key);
                        }}
                        style={({ pressed }) => [
                            styles.sealButton,
                            { transform: [{ scale: pressed ? 0.98 : 1 }] }
                        ]}
                    >
                        <View style={[styles.sealFillContainer, { backgroundColor: '#B71C1C' }]} /> 
                        <Text style={styles.sealText}>CONFIRM THIS PATH</Text>
                    </Pressable>
                </Animated.View>
            )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  folder: {
    width: '100%',
    backgroundColor: '#F4E4BC', // Manila folder
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#D6C498',
  },
  tabContainer: {
    height: 24,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: -1, // Overlap
  },
  tab: {
    backgroundColor: '#F4E4BC',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#D6C498',
    marginLeft: 0,
  },
  tabText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: '#8C7654',
    letterSpacing: 1,
  },
  body: {
    backgroundColor: '#F4E4BC',
    padding: SPACING.lg,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderTopWidth: 0, // Connected to tab
    borderColor: '#D6C498',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  stampBox: {
    borderWidth: 2,
    borderColor: '#5A4632',
    paddingHorizontal: 8,
    paddingVertical: 2,
    transform: [{ rotate: '-2deg' }],
  },
  stampText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: '#5A4632',
    letterSpacing: 1,
  },
  classifiedStamp: {
    borderWidth: 3,
    borderColor: '#B71C1C', // Red
    paddingHorizontal: 8,
    paddingVertical: 4,
    transform: [{ rotate: '8deg' }],
    opacity: 0.8,
  },
  classifiedText: {
    fontFamily: FONTS.secondaryBold,
    fontSize: 12,
    color: '#B71C1C',
    letterSpacing: 2,
  },
  title: {
    fontFamily: FONTS.primaryBold,
    fontSize: FONT_SIZES.lg,
    color: '#2C2621',
    marginBottom: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: '#D6C498',
    width: '100%',
    marginBottom: SPACING.md,
  },
  description: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    color: '#4A4238',
    lineHeight: 22,
  },
  statsContainer: {
    marginTop: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#5A4632',
  },
  statsLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: '#8C7654',
    marginBottom: 4,
  },
  statsValue: {
    fontFamily: FONTS.primaryMedium,
    fontSize: FONT_SIZES.sm,
    color: '#2C2621',
  },
  sealButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#2C2621',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  sealFillContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2C2621',
  },
  sealText: {
    position: 'absolute',
    fontFamily: FONTS.monoBold,
    fontSize: 14,
    color: '#F4E4BC', // Light text
    letterSpacing: 2,
  },
});
