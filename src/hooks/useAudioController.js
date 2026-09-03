import { useEffect, useRef, useCallback, useMemo } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/**
 * Migrated from expo-av (removed in Expo SDK 57) to expo-audio.
 *
 * The shapes differ in ways a 1:1 port gets wrong, so for future reference:
 *   Audio.Sound.createAsync(src, {isLooping})  -> createAudioPlayer(src); p.loop = …
 *     (synchronous — the player exists immediately and loads in the background,
 *      which is why the old promise-dedup map for in-flight loads is gone)
 *   await sound.setVolumeAsync(v)              -> p.volume = v        (property)
 *   await sound.setIsLoopingAsync(b)           -> p.loop = b          (property)
 *   (await sound.getStatusAsync()).isPlaying   -> p.playing           (property)
 *   await sound.playAsync()                    -> p.play()            (void)
 *   await sound.stopAsync()                    -> p.pause() + seekTo(0)
 *                                                 — there is NO stop() in expo-audio
 *   await sound.setPositionAsync(0)            -> await p.seekTo(0)   (Promise)
 *   await sound.replayAsync()                  -> await p.seekTo(0); p.play()
 *   await sound.unloadAsync()                  -> p.remove() + p.release()
 *     (remove() is REGISTRY BOOKKEEPING ONLY — AudioModule.kt's
 *      Function("remove") is literally `players.remove(player.id)`. It does not
 *      stop playback and does not free the native ExoPlayer. release() is the
 *      real teardown, and it must come after remove(), because releasing first
 *      leaves a dead entry in the module's players map.)
 *
 * setAudioModeAsync is a top-level export now, and its fields were renamed:
 *   allowsRecordingIOS -> allowsRecording
 *   staysActiveInBackground -> shouldPlayInBackground
 *   playsInSilentModeIOS -> playsInSilentMode
 * Passing the old names is silently ignored, which would have left the game
 * muted behind the iOS silent switch.
 */

const SOUND_FILES = {
  deskMusic: require('../../assets/audio/music/menu-ambient.mp3'),
  boardMusic: require('../../assets/audio/music/game-dark-layer1.mp3'),
  rainAmbience: require('../../assets/audio/music/game-dark-layer2.mp3'),
  lampHum: require('../../assets/audio/music/game-dark-layer3.mp3'),
  narrativeMusic: require('../../assets/audio/music/tutorial-bright.mp3'),
  victory: require('../../assets/audio/music/victory-theme.mp3'),
  select: require('../../assets/audio/sfx/ui/button-click.mp3'),
  submit: require('../../assets/audio/sfx/game/word-valid.mp3'),
  failure: require('../../assets/audio/sfx/ui/menu-close.mp3'),
};

export function useAudioController(activeScreen, settings) {
  const deskMusicRef = useRef(null);
  const boardMusicRef = useRef(null);
  const narrativeMusicRef = useRef(null);
  const rainRef = useRef(null);
  const lampRef = useRef(null);
  const victoryRef = useRef(null);
  const selectRef = useRef(null);
  const submitRef = useRef(null);
  const failureRef = useRef(null);

  // Set once the hook unmounts, so an async play() that was already in flight
  // cannot resurrect a player we have just released.
  const releasedRef = useRef(false);

  const allRefs = useMemo(() => [
    deskMusicRef,
    boardMusicRef,
    narrativeMusicRef,
    rainRef,
    lampRef,
    victoryRef,
    selectRef,
    submitRef,
    failureRef,
  ], []);

  useEffect(() => {
    releasedRef.current = false;
    setAudioModeAsync({
      allowsRecording: false,
      shouldPlayInBackground: false,
      playsInSilentMode: true,
      // Must be explicit. Left unset, Android takes exclusive audio focus:
      // a notification chime PAUSES the music and ambience outright instead of
      // dipping them (dead air in a game built on an ambience bed), and
      // launching the game hard-stops whatever the player was listening to.
      interruptionMode: 'duckOthers',
    }).catch(() => {});

    return () => {
      releasedRef.current = true;
      allRefs.forEach((ref) => {
        const player = ref.current;
        // Null the ref FIRST: after release() any use of the object throws.
        ref.current = null;
        if (!player) return;
        // pause() stops the audio now; remove() drops the module's registry
        // entry; release() frees the native player. All three, in this order.
        try { player.pause(); } catch (e) { /* already gone */ }
        try { player.remove(); } catch (e) { /* already gone */ }
        try { player.release(); } catch (e) { /* already released */ }
      });
    };
  }, [allRefs]);

  /**
   * Synchronous now: createAudioPlayer returns immediately and buffers in the
   * background, so there is no window in which two callers race to create the
   * same player.
   */
  const ensureSound = useCallback((ref, key, source, { isLooping = false } = {}) => {
    if (releasedRef.current) return null;
    if (ref.current) return ref.current;
    try {
      const player = createAudioPlayer(source);
      player.loop = isLooping;
      ref.current = player;
      return player;
    } catch (error) {
      // A missing or undecodable asset must never take the screen down; audio
      // is non-critical feedback.
      return null;
    }
  }, []);

  const stopLoop = useCallback((ref) => {
    const player = ref.current;
    if (!player) return;
    try {
      // Unconditional. `playing` is ExoPlayer's isPlaying, which is FALSE while
      // a just-started bed is still buffering — so guarding on it let a fast
      // screen change skip the stop, and the bed then faded up underneath the
      // next screen's music and looped there forever. pause() on an idle player
      // is harmless and clears playWhenReady.
      player.pause();
    } catch (e) {
      // ignore
    }
  }, []);

  const startLoop = useCallback((ref, key, file, volume) => {
    if (volume <= 0) {
      stopLoop(ref);
      return;
    }
    const player = ensureSound(ref, key, file, { isLooping: true });
    if (!player) return;
    try {
      player.loop = true;
      player.volume = volume;
      // Also unconditional, for the same reason: play() on an already-playing
      // player is a no-op (it sets playWhenReady, it does not seek).
      player.play();
    } catch (e) {
      // ignore
    }
  }, [ensureSound, stopLoop]);

  useEffect(() => {
    const musicVolume = settings.musicVolume ?? 0.6;
    const ambienceVolume = settings.ambienceVolume ?? 0.4;

    // 'story' was missing, so the Story hub (and everything mapped to it) sat
    // in silence rather than under the desk bed.
    const DESK_SCREENS = ['desk', 'prologue', 'menu', 'archive', 'stats', 'settings', 'story'];
    const isDeskScreen = DESK_SCREENS.includes(activeScreen);
    const isBoardScreen = activeScreen === 'board';
    const isNarrativeScreen = activeScreen === 'caseFile';

    // Music
    if (isDeskScreen) {
      startLoop(deskMusicRef, 'deskMusic', SOUND_FILES.deskMusic, musicVolume);
      stopLoop(boardMusicRef);
      stopLoop(narrativeMusicRef);
    } else if (isBoardScreen) {
      stopLoop(deskMusicRef);
      startLoop(boardMusicRef, 'boardMusic', SOUND_FILES.boardMusic, musicVolume);
      stopLoop(narrativeMusicRef);
    } else if (isNarrativeScreen) {
      stopLoop(deskMusicRef);
      stopLoop(boardMusicRef);
      startLoop(narrativeMusicRef, 'narrativeMusic', SOUND_FILES.narrativeMusic, musicVolume * 0.8);
    } else {
      stopLoop(deskMusicRef);
      stopLoop(boardMusicRef);
      stopLoop(narrativeMusicRef);
    }

    // Ambience
    if (isDeskScreen) {
      startLoop(rainRef, 'rainAmbience', SOUND_FILES.rainAmbience, ambienceVolume * 0.6);
      startLoop(lampRef, 'lampHum', SOUND_FILES.lampHum, ambienceVolume * 0.4);
    } else if (isBoardScreen) {
      startLoop(rainRef, 'rainAmbience', SOUND_FILES.rainAmbience, ambienceVolume);
      stopLoop(lampRef);
    } else if (isNarrativeScreen) {
      startLoop(rainRef, 'rainAmbience', SOUND_FILES.rainAmbience, ambienceVolume * 0.5);
      stopLoop(lampRef);
    } else {
      stopLoop(rainRef);
      stopLoop(lampRef);
    }

    if (activeScreen === 'solved' || activeScreen === 'splash') {
      stopLoop(deskMusicRef);
      stopLoop(boardMusicRef);
      stopLoop(narrativeMusicRef);
      stopLoop(rainRef);
      stopLoop(lampRef);
    }
  }, [activeScreen, settings.musicVolume, settings.ambienceVolume, startLoop, stopLoop]);

  /** One-shots restart from 0 even if the previous play is still ringing out. */
  const fireOneShot = useCallback(async (ref, key, file, volume) => {
    if (volume <= 0) return;
    const player = ensureSound(ref, key, file, { isLooping: false });
    if (!player) return;
    try {
      player.volume = volume;
      await player.seekTo(0);
      if (releasedRef.current || ref.current !== player) return;
      player.play();
    } catch (e) {
      // ignore
    }
  }, [ensureSound]);

  const playVictory = useCallback(async () => {
    stopLoop(deskMusicRef);
    stopLoop(boardMusicRef);
    stopLoop(narrativeMusicRef);
    stopLoop(rainRef);
    stopLoop(lampRef);
    await fireOneShot(victoryRef, 'victory', SOUND_FILES.victory, settings.musicVolume);
  }, [settings.musicVolume, fireOneShot, stopLoop]);

  const playSelect = useCallback(
    () => fireOneShot(selectRef, 'select', SOUND_FILES.select, settings.sfxVolume),
    [settings.sfxVolume, fireOneShot]
  );

  const playSubmit = useCallback(
    () => fireOneShot(submitRef, 'submit', SOUND_FILES.submit, settings.sfxVolume),
    [settings.sfxVolume, fireOneShot]
  );

  const playFailure = useCallback(
    () => fireOneShot(failureRef, 'failure', SOUND_FILES.failure, settings.sfxVolume),
    [settings.sfxVolume, fireOneShot]
  );

  const stopAll = useCallback(async () => {
    allRefs.forEach((ref) => {
      const player = ref.current;
      if (!player) return;
      try {
        player.pause();
      } catch (e) {
        // ignore
      }
    });
  }, [allRefs]);

  return useMemo(() => ({
    playVictory,
    playSelect,
    playSubmit,
    playFailure,
    stopAll,
  }), [playVictory, playSelect, playSubmit, playFailure, stopAll]);
}
