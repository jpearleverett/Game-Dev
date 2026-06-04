import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { DURATION, EASE_OUT, staggerDelay } from '../../utils/motion';

/**
 * Reveal — the shared "breathe in" entrance. Fades + rises its children on mount.
 * Pass `index` for a staggered cascade in a list. Honors reduced motion (renders
 * instantly). Native-driver (opacity + translateY) so it's cheap.
 */
export default function Reveal({
  children,
  index = 0,
  delay = 0,
  distance = 10,
  duration = DURATION.base,
  reducedMotion = false,
  style,
  pointerEvents,
}) {
  const v = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      v.setValue(1);
      return undefined;
    }
    const anim = Animated.timing(v, {
      toValue: 1,
      duration,
      delay: staggerDelay(index, delay),
      easing: EASE_OUT,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      pointerEvents={pointerEvents}
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
