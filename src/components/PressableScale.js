import React, { useCallback, useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { selectionHaptic } from '../utils/haptics';
import { SPRING } from '../utils/motion';

/**
 * PressableScale — the shared "everything responds to touch" primitive. Squashes
 * to `scaleTo` on press-in with a light selection haptic and springs back on
 * release, so cards and tiles feel tactile instead of dead. Drop-in for Pressable.
 *
 * `style` is applied to the inner animated view (so layout/visuals look the same);
 * the outer Pressable stays layout-transparent.
 */
export default function PressableScale({
  children,
  onPress,
  onLongPress,
  style,
  containerStyle, // layout styles (e.g. flex) go here, on the outer Pressable
  scaleTo = 0.96,
  haptic = true,
  disabled = false,
  reducedMotion = false,
  accessibilityRole = 'button',
  accessibilityLabel,
  hitSlop,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handleIn = useCallback(() => {
    if (disabled) return;
    if (haptic) selectionHaptic();
    if (reducedMotion) return;
    Animated.spring(scale, { toValue: scaleTo, ...SPRING.snappy }).start();
  }, [disabled, haptic, reducedMotion, scale, scaleTo]);

  const handleOut = useCallback(() => {
    if (reducedMotion) return;
    Animated.spring(scale, { toValue: 1, ...SPRING.snappy }).start();
  }, [reducedMotion, scale]);

  return (
    <Pressable
      onPressIn={handleIn}
      onPressOut={handleOut}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={containerStyle}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
