/**
 * `StyleSheet.absoluteFillObject` was REMOVED in React Native 0.85 (it is
 * absent from the entire published react-native 0.86.3 package; only
 * `absoluteFill` remains). This repo spread it into 39 overlay styles.
 *
 * The failure mode is what makes this worth a test: `{...undefined}` is legal
 * JavaScript that evaluates to `{}`. It does not throw. Metro bundles it,
 * Babel transforms it, both Jest projects pass, and `expo export` reports zero
 * warnings — while every overlay in the app silently loses
 * `position/top/right/bottom/left` and becomes an ordinary in-flow flex child.
 *
 * Player-visible consequence: the CONNECT beat's node-reveal card (the payoff
 * of the core loop) renders below the footer instead of as a full-screen scrim,
 * the DescentHold / ThresholdHold generation covers collapse, and an
 * input-blocking scrim stops blocking input.
 *
 * So: assert the property really is gone upstream (so this test starts failing
 * the day it comes back and the guard is no longer needed), and assert no
 * source file reaches for it.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..');

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
};

describe('StyleSheet.absoluteFill contract', () => {
  it('absoluteFillObject is genuinely gone from the installed react-native', () => {
    // eslint-disable-next-line global-require
    const { StyleSheet } = require('react-native');
    expect(StyleSheet.absoluteFillObject).toBeUndefined();
    expect(StyleSheet.absoluteFill).toBeDefined();
  });

  it('absoluteFill still carries the five positioning keys the overlays need', () => {
    // eslint-disable-next-line global-require
    const { StyleSheet } = require('react-native');
    expect({ ...StyleSheet.absoluteFill }).toEqual({
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    });
  });

  it('no source file references the removed absoluteFillObject', () => {
    const offenders = walk(SRC)
      .filter((file) => fs.readFileSync(file, 'utf8').includes('absoluteFillObject'))
      .map((file) => path.relative(SRC, file));
    expect(offenders).toEqual([]);
  });

  it('spreading the removed property would have been silent, not an error', () => {
    // The reason this needs a guard at all: no tool reports it.
    const stylesheet = {};
    const overlay = { ...stylesheet.absoluteFillObject, backgroundColor: 'x', zIndex: 40 };
    expect(overlay).toEqual({ backgroundColor: 'x', zIndex: 40 });
    expect(overlay.position).toBeUndefined();
  });
});
