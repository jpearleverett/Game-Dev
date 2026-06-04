/**
 * Motion language for Dead Letters (game-feel pass).
 *
 * One small, shared vocabulary of durations, easings and spring presets so
 * every screen moves with the same intent: things EASE in (never pop), key
 * moments use a spring that slightly overshoots, and common actions stay subtle.
 * Pure constants/helpers — no React — so they're safe to import anywhere.
 *
 * Principles distilled from game-feel research: tween/ease everything, 200-500ms
 * for entrances, spring overshoot for satisfying snaps, restraint on common
 * actions, and always honor reduced-motion.
 */
import { Easing } from 'react-native';

export const DURATION = {
  fast: 160,   // micro-interactions (press, toggle)
  base: 260,   // standard entrance
  slow: 380,   // section / scene entrance
  scene: 520,  // big reveals
};

/** ms between staggered siblings in a cascading list reveal. */
export const STAGGER = 64;

export const EASE_OUT = Easing.out(Easing.cubic);
export const EASE_IN_OUT = Easing.inOut(Easing.cubic);
/** Overshoot (cubic-bezier 0.34, 1.56, 0.64, 1) — a playful spring-like settle. */
export const EASE_OVERSHOOT = Easing.bezier(0.34, 1.56, 0.64, 1);

/** Spring presets for Animated.spring (useNativeDriver-friendly). */
export const SPRING = {
  gentle: { friction: 7, tension: 60, useNativeDriver: true },
  snappy: { friction: 6, tension: 130, useNativeDriver: true },
  pop: { friction: 5, tension: 150, useNativeDriver: true },
};

export const reduceMotion = (settings) => !!settings?.reducedMotion;

/** Staggered start delay for the nth item in a list. */
export const staggerDelay = (index = 0, base = 0, step = STAGGER) => base + Math.max(0, index) * step;
