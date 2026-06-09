import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

export default function AchievementToast({ toast, onDismiss, reducedMotion = false }) {
  const translateY = useRef(new Animated.Value(reducedMotion ? 0 : 40)).current;
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (!toast) return undefined;
    translateY.setValue(reducedMotion ? 0 : 40);
    opacity.setValue(reducedMotion ? 1 : 0);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 24, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start(onDismiss);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast, onDismiss, opacity, reducedMotion, translateY]);

  if (!toast?.achievement) return null;
  const { achievement, count } = toast;

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { opacity, transform: [{ translateY }] }]}>
      <Pressable onPress={onDismiss} style={styles.card}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{achievement.icon}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.kicker}>ACHIEVEMENT UNLOCKED{count > 1 ? ` +${count - 1}` : ''}</Text>
          <Text style={styles.title} numberOfLines={1}>{achievement.title}</Text>
          <Text style={styles.desc} numberOfLines={2}>{achievement.description}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 24,
    zIndex: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(241,197,114,0.45)',
    backgroundColor: 'rgba(15,12,20,0.96)',
    padding: SPACING.md,
    shadowColor: COLORS.amberLight,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(241,197,114,0.16)',
  },
  icon: { fontSize: 24 },
  copy: { flex: 1 },
  kicker: {
    fontFamily: FONTS.monoBold,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1.8,
    color: COLORS.amberLight,
  },
  title: {
    fontFamily: FONTS.primarySemiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  desc: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
