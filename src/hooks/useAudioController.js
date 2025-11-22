import { useEffect, useRef, useCallback, useMemo } from 'react';
import { Audio } from 'expo-av';

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

  // Track in-flight loading promises to prevent duplicate sound creation
  const loadingRefs = useRef({});

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
    }).catch(() => {});

    return () => {
      const unloadAll = async () => {
        const sounds = [
          deskMusicRef,
          boardMusicRef,
          narrativeMusicRef,
          rainRef,
          lampRef,
          victoryRef,
          selectRef,
          submitRef,
          failureRef,
        ];
        for (const ref of sounds) {
          try {
            await ref.current?.unloadAsync();
          } catch (e) {
            // ignore
          }
          ref.current = null;
        }
        // Clear any pending loads
        loadingRefs.current = {};
      };
      unloadAll();
    };
  }, []);

  const ensureSound = useCallback(async (ref, key, source, { isLooping = false }) => {
    if (ref.current) return ref.current;
    if (loadingRefs.current[key]) return loadingRefs.current[key];

    const promise = (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false, isLooping });
        ref.current = sound;
        return sound;
      } catch (error) {
        // console.warn(`Failed to load sound ${key}`, error);
        return null;
      } finally {
        delete loadingRefs.current[key];
      }
    })();

    loadingRefs.current[key] = promise;
    return promise;
  }, []);

  const stopLoop = async (ref) => {
    if (!ref.current) return;
    try {
      const status = await ref.current.getStatusAsync();
      if (status.isPlaying) {
        await ref.current.stopAsync();
      }
    } catch (e) {
      // ignore
    }
  };

  const startLoop = async (ref, key, file, volume) => {
    if (volume <= 0) {
      await stopLoop(ref);
      return;
    }
    const sound = await ensureSound(ref, key, file, { isLooping: true });
    if (!sound) return;

    try {
        await sound.setIsLoopingAsync(true);
        await sound.setVolumeAsync(volume);
        const status = await sound.getStatusAsync();
        if (!status.isPlaying) {
          await sound.playAsync();
        }
    } catch (e) {
        // ignore
    }
  };

  useEffect(() => {
    let cancelled = false;
    const apply = async () => {
      const musicVolume = settings.musicVolume ?? 0.6;
      const ambienceVolume = settings.ambienceVolume ?? 0.4;

      const DESK_SCREENS = ['desk', 'prologue', 'menu', 'archive', 'stats', 'settings'];
      const isDeskScreen = DESK_SCREENS.includes(activeScreen);
      const isBoardScreen = activeScreen === 'board';
      const isNarrativeScreen = activeScreen === 'caseFile';

      // Music
      if (isDeskScreen) {
        if (cancelled) return;
        await startLoop(deskMusicRef, 'deskMusic', SOUND_FILES.deskMusic, musicVolume);
        await stopLoop(boardMusicRef);
        await stopLoop(narrativeMusicRef);
      } else if (isBoardScreen) {
        if (cancelled) return;
        await stopLoop(deskMusicRef);
        await startLoop(boardMusicRef, 'boardMusic', SOUND_FILES.boardMusic, musicVolume);
        await stopLoop(narrativeMusicRef);
      } else if (isNarrativeScreen) {
        if (cancelled) return;
        await stopLoop(deskMusicRef);
        await stopLoop(boardMusicRef);
        await startLoop(narrativeMusicRef, 'narrativeMusic', SOUND_FILES.narrativeMusic, musicVolume * 0.8);
      } else {
        await stopLoop(deskMusicRef);
        await stopLoop(boardMusicRef);
        await stopLoop(narrativeMusicRef);
      }

      // Ambience
      if (isDeskScreen) {
        if (cancelled) return;
        await startLoop(rainRef, 'rainAmbience', SOUND_FILES.rainAmbience, ambienceVolume * 0.6);
        await startLoop(lampRef, 'lampHum', SOUND_FILES.lampHum, ambienceVolume * 0.4);
      } else if (isBoardScreen) {
        if (cancelled) return;
        await startLoop(rainRef, 'rainAmbience', SOUND_FILES.rainAmbience, ambienceVolume);
        await stopLoop(lampRef);
      } else if (isNarrativeScreen) {
        if (cancelled) return;
        await startLoop(rainRef, 'rainAmbience', SOUND_FILES.rainAmbience, ambienceVolume * 0.5);
        await stopLoop(lampRef);
      } else {
        await stopLoop(rainRef);
        await stopLoop(lampRef);
      }

      if (activeScreen === 'solved' || activeScreen === 'splash') {
        await stopLoop(deskMusicRef);
        await stopLoop(boardMusicRef);
        await stopLoop(narrativeMusicRef);
        await stopLoop(rainRef);
        await stopLoop(lampRef);
      }
    };
    
    apply();
    
    return () => {
      cancelled = true;
    };
  }, [activeScreen, settings.musicVolume, settings.ambienceVolume, ensureSound]);

  const playVictory = useCallback(async () => {
    await stopLoop(deskMusicRef);
    await stopLoop(boardMusicRef);
    await stopLoop(narrativeMusicRef);
    await stopLoop(rainRef);
    await stopLoop(lampRef);
    if (settings.musicVolume <= 0) return;
    
    const sound = await ensureSound(victoryRef, 'victory', SOUND_FILES.victory, { isLooping: false });
    if (sound) {
        await sound.setVolumeAsync(settings.musicVolume);
        await sound.setPositionAsync(0);
        await sound.playAsync();
    }
  }, [settings.musicVolume, ensureSound]);

  const playSelect = useCallback(async () => {
    if (settings.sfxVolume <= 0) return;
    const sound = await ensureSound(selectRef, 'select', SOUND_FILES.select, { isLooping: false });
    if (sound) {
        await sound.setVolumeAsync(settings.sfxVolume);
        await sound.setPositionAsync(0);
        await sound.playAsync();
    }
  }, [settings.sfxVolume, ensureSound]);

  const playSubmit = useCallback(async () => {
    if (settings.sfxVolume <= 0) return;
    const sound = await ensureSound(submitRef, 'submit', SOUND_FILES.submit, { isLooping: false });
    if (sound) {
        await sound.setVolumeAsync(settings.sfxVolume);
        await sound.setPositionAsync(0);
        await sound.playAsync();
    }
  }, [settings.sfxVolume, ensureSound]);

  const playFailure = useCallback(async () => {
    if (settings.sfxVolume <= 0) return;
    const sound = await ensureSound(failureRef, 'failure', SOUND_FILES.failure, { isLooping: false });
    if (sound) {
        await sound.setVolumeAsync(settings.sfxVolume);
        await sound.setPositionAsync(0);
        await sound.playAsync();
    }
  }, [settings.sfxVolume, ensureSound]);

  const stopAll = useCallback(async () => {
    const loops = [deskMusicRef, boardMusicRef, narrativeMusicRef, rainRef, lampRef];
    for (const ref of loops) {
      await stopLoop(ref);
    }
    const oneShots = [victoryRef, selectRef, submitRef, failureRef];
    for (const ref of oneShots) {
      try {
        await ref.current?.stopAsync();
      } catch (e) {}
    }
  }, []);

  return useMemo(() => ({
    playVictory,
    playSelect,
    playSubmit,
    playFailure,
    stopAll,
  }), [playVictory, playSelect, playSubmit, playFailure, stopAll]);
}
