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
    backgroundColor: '#e8dcb5', // Slightly more saturated manila
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#cbb682',
  },
  tabContainer: {
    height: 28,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: -1, // Overlap
  },
  tab: {
    backgroundColor: '#e8dcb5',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#cbb682',
    marginLeft: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: '#8f7654',
    letterSpacing: 1.2,
  },
  body: {
    backgroundColor: '#e8dcb5',
    padding: SPACING.xl,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1,
    borderTopWidth: 0, // Connected to tab
    borderColor: '#cbb682',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  stampBox: {
    borderWidth: 2,
    borderColor: 'rgba(90, 70, 50, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    transform: [{ rotate: '-2deg' }],
    borderRadius: 2,
  },
  stampText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: '#5a4632',
    letterSpacing: 1.2,
  },
  classifiedStamp: {
    borderWidth: 3,
    borderColor: '#a31616', // Deeper Red
    paddingHorizontal: 10,
    paddingVertical: 6,
    transform: [{ rotate: '12deg' }],
    opacity: 0.85,
    borderRadius: 4,
  },
  classifiedText: {
    fontFamily: FONTS.secondaryBold,
    fontSize: 13,
    color: '#a31616',
    letterSpacing: 2.5,
  },
  title: {
    fontFamily: FONTS.primaryBold,
    fontSize: FONT_SIZES.xl,
    color: '#211c18',
    marginBottom: SPACING.md,
    letterSpacing: 0.5,
  },
  divider: {
    height: 2,
    backgroundColor: '#d6c498',
    width: '100%',
    marginBottom: SPACING.lg,
    opacity: 0.6,
  },
  description: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    color: '#3d362f',
    lineHeight: 26,
  },
  statsContainer: {
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(60,40,20,0.06)',
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: '#8f7654',
    borderRadius: 2,
  },
  statsLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: '#7a6245',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  statsValue: {
    fontFamily: FONTS.primarySemiBold,
    fontSize: FONT_SIZES.md,
    color: '#2c2621',
  },
  sealButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#7a1f1f', // Deep red
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#4a1212',
  },
  sealFillContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#7a1f1f',
  },
  sealText: {
    position: 'absolute',
    fontFamily: FONTS.monoBold,
    fontSize: 15,
    color: '#f4e4bc',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
