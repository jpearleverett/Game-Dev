/**
 * Pins the expo-av -> expo-audio migration (Expo SDK 57 removed expo-av).
 *
 * The two APIs differ in SHAPE, not just in names, and every difference below
 * is one a plausible 1:1 port gets wrong while still compiling and still
 * passing every other test in the suite. The hook swallows runtime errors from
 * the player (audio is non-critical feedback), so a wrong call does not crash —
 * it just silently does nothing, which is the hardest kind of bug to trace from
 * a playtest:
 *
 *  - volume / loop are synchronous PROPERTIES, not `await setVolumeAsync(v)` /
 *    `await setIsLoopingAsync(b)`. The old async setters would throw, get
 *    swallowed, and leave music at full volume ignoring the Settings sliders.
 *  - there is NO stop(). A stop is pause(). Reaching for stopAsync would throw
 *    and leave loops running forever across screen changes.
 *  - there is NO replayAsync(). A one-shot restart is seekTo(0) then play().
 *  - releasing is remove(), not unloadAsync().
 *  - setAudioModeAsync is a top-level export whose fields were RENAMED. The old
 *    iOS-suffixed names are accepted and IGNORED, which would silently mute the
 *    game behind the iOS silent switch.
 */

import React from 'react';
import renderer, { act } from 'react-test-renderer';

const mockPlayers = [];
const mockSetAudioMode = jest.fn(() => Promise.resolve());

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => {
    const player = {
      seeks: [],
      volume: 1,
      loop: false,
      playing: false,
      play: jest.fn(function play() { this.playing = true; }),
      pause: jest.fn(function pause() { this.playing = false; }),
      seekTo: jest.fn(function seekTo(s) { this.seeks.push(s); return Promise.resolve(); }),
      remove: jest.fn(),
      release: jest.fn(),
    };
    mockPlayers.push(player);
    return player;
  }),
  setAudioModeAsync: (...args) => mockSetAudioMode(...args),
}));

const { useAudioController } = require('../useAudioController');

const SETTINGS = { musicVolume: 0.6, ambienceVolume: 0.4, sfxVolume: 0.5 };

let api = null;
function Harness({ screen, settings }) {
  api = useAudioController(screen, settings);
  return null;
}

const mount = (screen = 'desk', settings = SETTINGS) => {
  let tree;
  act(() => {
    tree = renderer.create(<Harness screen={screen} settings={settings} />);
  });
  return tree;
};

describe('useAudioController on expo-audio', () => {
  beforeEach(() => {
    mockPlayers.length = 0;
    mockSetAudioMode.mockClear();
    api = null;
  });

  it('configures the audio mode with the SDK 57 field names', () => {
    mount();
    expect(mockSetAudioMode).toHaveBeenCalledTimes(1);
    const mode = mockSetAudioMode.mock.calls[0][0];
    expect(mode).toEqual({
      allowsRecording: false,
      shouldPlayInBackground: false,
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
    });
    // The expo-av names must be gone: they are accepted and silently ignored.
    expect(mode).not.toHaveProperty('playsInSilentModeIOS');
    expect(mode).not.toHaveProperty('allowsRecordingIOS');
    expect(mode).not.toHaveProperty('staysActiveInBackground');
  });

  it('starts a desk loop with loop and volume set as properties', () => {
    mount();
    expect(mockPlayers.length).toBeGreaterThan(0);
    const music = mockPlayers[0];
    expect(music.loop).toBe(true);
    expect(music.volume).toBe(0.6);
    expect(music.play).toHaveBeenCalled();
  });

  it('scales ambience below the music bed rather than playing it flat', () => {
    mount();
    const volumes = mockPlayers.map((p) => p.volume);
    expect(volumes).toContain(0.6);
    // rain = 0.4*0.6 = 0.24, lamp = 0.4*0.4 = 0.16
    expect(volumes).toContain(0.4 * 0.6);
    expect(volumes).toContain(0.4 * 0.4);
  });

  it('never starts a loop whose volume is zero', () => {
    mount('desk', { ...SETTINGS, musicVolume: 0, ambienceVolume: 0 });
    mockPlayers.forEach((p) => expect(p.play).not.toHaveBeenCalled());
  });

  it('stops a loop with pause(), because expo-audio has no stop()', () => {
    const tree = mount('desk');
    const deskMusic = mockPlayers[0];
    expect(deskMusic.play).toHaveBeenCalled();

    act(() => {
      tree.update(<Harness screen="board" settings={SETTINGS} />);
    });
    expect(deskMusic.pause).toHaveBeenCalled();
    expect(deskMusic.stop).toBeUndefined();
  });

  it('restarts a one-shot with seekTo(0) then play()', async () => {
    mount();
    await act(async () => { await api.playSelect(); });

    const sfx = mockPlayers[mockPlayers.length - 1];
    expect(sfx.volume).toBe(0.5);
    expect(sfx.seeks).toEqual([0]);
    expect(sfx.play).toHaveBeenCalled();
    expect(sfx.loop).toBe(false);
  });

  it('re-fires a one-shot from the start, reusing the same player', async () => {
    mount();
    await act(async () => { await api.playSelect(); });
    const sfx = mockPlayers[mockPlayers.length - 1];
    const created = mockPlayers.length;

    await act(async () => { await api.playSelect(); });
    expect(mockPlayers.length).toBe(created);
    expect(sfx.seeks).toEqual([0, 0]);
    expect(sfx.play).toHaveBeenCalledTimes(2);
  });

  it('does not fire a one-shot when its channel volume is zero', async () => {
    mount('desk', { ...SETTINGS, sfxVolume: 0 });
    const before = mockPlayers.length;
    await act(async () => { await api.playSelect(); });
    expect(mockPlayers.length).toBe(before);
  });

  it('tears every player down with pause + remove + release on unmount', () => {
    const tree = mount();
    const created = [...mockPlayers];
    expect(created.length).toBeGreaterThan(0);
    act(() => { tree.unmount(); });
    created.forEach((p) => {
      // remove() alone is registry bookkeeping — AudioModule.kt's
      // Function("remove") is just `players.remove(player.id)`. It neither
      // stops playback nor frees the native ExoPlayer, so a looping bed would
      // keep playing under every later screen. release() is the real teardown.
      expect(p.pause).toHaveBeenCalled();
      expect(p.remove).toHaveBeenCalled();
      expect(p.release).toHaveBeenCalled();
    });
  });

  it('removes before releasing, since releasing first strands the registry entry', () => {
    const tree = mount();
    const player = mockPlayers[0];
    act(() => { tree.unmount(); });
    const removeOrder = player.remove.mock.invocationCallOrder[0];
    const releaseOrder = player.release.mock.invocationCallOrder[0];
    expect(removeOrder).toBeLessThan(releaseOrder);
  });

  it('stops a loop even while it is still buffering', () => {
    // `playing` is ExoPlayer's isPlaying, which is FALSE during buffering.
    // Guarding the stop on it let a fast screen change skip the pause, and the
    // bed then faded up under the next screen and looped there forever.
    const tree = mount('desk');
    const deskMusic = mockPlayers[0];
    deskMusic.playing = false; // simulate "still buffering"
    deskMusic.pause.mockClear();

    act(() => { tree.update(<Harness screen="board" settings={SETTINGS} />); });
    expect(deskMusic.pause).toHaveBeenCalled();
  });

  it('does not create a player after unmount', async () => {
    const tree = mount();
    const captured = api;
    act(() => { tree.unmount(); });
    const after = mockPlayers.length;
    await act(async () => { await captured.playSelect(); });
    expect(mockPlayers.length).toBe(after);
  });

  it('stopAll pauses everything without releasing it', async () => {
    mount();
    const created = [...mockPlayers];
    await act(async () => { await api.stopAll(); });
    created.forEach((p) => {
      expect(p.pause).toHaveBeenCalled();
      expect(p.remove).not.toHaveBeenCalled();
      expect(p.release).not.toHaveBeenCalled();
    });
  });

  it('switching screens does not leak a new player for the same bed', () => {
    const tree = mount('desk');
    const first = mockPlayers.length;
    act(() => { tree.update(<Harness screen="board" settings={SETTINGS} />); });
    act(() => { tree.update(<Harness screen="desk" settings={SETTINGS} />); });
    // board adds its own music bed; returning to desk must reuse, not recreate.
    const afterRoundTrip = mockPlayers.length;
    act(() => { tree.update(<Harness screen="board" settings={SETTINGS} />); });
    act(() => { tree.update(<Harness screen="desk" settings={SETTINGS} />); });
    expect(mockPlayers.length).toBe(afterRoundTrip);
    expect(afterRoundTrip).toBeGreaterThanOrEqual(first);
  });
});
