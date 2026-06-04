import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';

/**
 * LottieEffect — plays one of the bundled vector effects for payoff moments
 * (a found-fragment burst, an achievement unlock). Renders nothing when
 * inactive, when reduced-motion is on, or if the named effect is missing — so
 * it's always safe to drop into a screen as a non-interactive overlay.
 */
const SOURCES = {
  'word-found-burst': require('../../assets/images/game/effects/word-found-burst.json'),
  'achievement-unlock': require('../../assets/images/game/effects/achievement-unlock.json'),
  'combo-streak': require('../../assets/images/game/effects/combo-streak.json'),
  'cell-decay': require('../../assets/images/game/effects/cell-decay-anim.json'),
};

export default function LottieEffect({
  name,
  active = true,
  loop = false,
  speed = 1,
  size = 220,
  reducedMotion = false,
  onFinish,
  style,
}) {
  const ref = useRef(null);
  const source = SOURCES[name];
  if (!source || !active || reducedMotion) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, style]}>
      <LottieView
        ref={ref}
        source={source}
        autoPlay
        loop={loop}
        speed={speed}
        resizeMode="cover"
        onAnimationFinish={onFinish}
        style={{ width: size, height: size }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
