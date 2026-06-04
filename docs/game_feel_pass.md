# Dead Letters — Game-Feel ("Juice") Pass

A cross-cutting pass to make the game feel alive: motion, tactility, atmosphere,
and payoff. Built on `Animated` + `expo-linear-gradient` + `react-native-svg` +
`react-native-confetti-cannon` (no reanimated / blur / lottie available).

## Shared motion layer (propagates everywhere)
- `src/utils/motion.js` — durations (160–520ms), easings (`EASE_OUT`,
  `EASE_OVERSHOOT` = cubic-bezier 0.34,1.56,0.64,1), spring presets, `STAGGER`,
  `reduceMotion`. Unit-tested.
- `src/components/motion/Reveal.js` — the "breathe in" entrance (fade + rise),
  `index` for staggered cascades. Honors reduced motion.
- `src/components/motion/Stagger.js` — wraps siblings so they cascade in.
- `src/components/PressableScale.js` — squash-on-press + haptic; `containerStyle`
  keeps flex layouts intact.
- `src/components/Celebration.js` — restrained **noir** confetti (amber/cream/coral
  ink flecks, not rainbow) via confetti-cannon; no-ops on reduced motion.

## Navigation
Puzzles (Board / UnderMap / Theory) and the Ending now **rise** into view
(`animation: 'slide_from_bottom'`) for a "descent" feel, vs the uniform global fade.

## Applied per screen
- **Splash** — entrance fade + "press start" breathing pulse on the prompt.
- **Desk** — staggered section entrance; tactile quick cards.
- **Menu / Archive / Stats / StoryCampaign / EndingGallery / Achievements /
  ChapterSelect** — staggered entrances (block-staggered where grids/timelines
  are layout-fragile); Stats bars grow from 0 on mount; Archive cards cascade.
- **CaseSolved** — ink-fleck celebration on a win.
- **Theory** (chapter climax) — tactile, cascading belief cards; celebration on
  sealing a belief.
- **Ending** — staggered prose reveal; celebration burst on the Clear-Eyed ending.

Everything respects `settings.reducedMotion`.

## Remaining opportunities (next passes)
- **Unused assets**: Lottie JSONs exist (`assets/images/game/effects/*.json`) but
  `lottie-react-native` isn't installed; particle sprites + glitch overlay unused.
- **Buttons**: PrimaryButton/SecondaryButton already have press translateY +
  haptic; could add a subtle scale for parity with PressableScale.
- **Audio**: music-layer ducking during dialogue; UI tap SFX; ambient fade-in.
- **Atmosphere**: optional rain layer / grain parallax in `ScreenSurface`.
- **Tutorial / Prologue / Settings** — not yet touched in this pass.
