import { useEffect, useRef } from 'react';
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

const ensureSound = async (ref, source, { isLooping = false }) => {
  if (ref.current) return ref.current;
  const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false, isLooping });
  ref.current = sound;
  return sound;
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
      };
      unloadAll();
    };
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

  const startLoop = async (ref, file, volume) => {
    if (volume <= 0) {
      await stopLoop(ref);
      return;
    }
    const sound = await ensureSound(ref, file, { isLooping: true });
    await sound.setIsLoopingAsync(true);
    await sound.setVolumeAsync(volume);
    const status = await sound.getStatusAsync();
    if (!status.isPlaying) {
      await sound.playAsync();
    }
  };

  useEffect(() => {
    let cancelled = false;
    const apply = async () => {
      if (cancelled) return;
      const musicVolume = settings.musicVolume ?? 0.6;
      const ambienceVolume = settings.ambienceVolume ?? 0.4;

      const DESK_SCREENS = ['desk', 'prologue', 'menu', 'archive', 'stats', 'settings'];
      const isDeskScreen = DESK_SCREENS.includes(activeScreen);
      const isBoardScreen = activeScreen === 'board';
      const isNarrativeScreen = activeScreen === 'caseFile';

      if (isDeskScreen) {
        await startLoop(deskMusicRef, SOUND_FILES.deskMusic, musicVolume);
        await stopLoop(boardMusicRef);
        await stopLoop(narrativeMusicRef);
      } else if (isBoardScreen) {
        await stopLoop(deskMusicRef);
        await startLoop(boardMusicRef, SOUND_FILES.boardMusic, musicVolume);
        await stopLoop(narrativeMusicRef);
      } else if (isNarrativeScreen) {
        await stopLoop(deskMusicRef);
        await stopLoop(boardMusicRef);
        await startLoop(narrativeMusicRef, SOUND_FILES.narrativeMusic, musicVolume * 0.8);
      } else {
        await stopLoop(deskMusicRef);
        await stopLoop(boardMusicRef);
        await stopLoop(narrativeMusicRef);
      }

      if (isDeskScreen) {
        await startLoop(rainRef, SOUND_FILES.rainAmbience, ambienceVolume * 0.6);
        await startLoop(lampRef, SOUND_FILES.lampHum, ambienceVolume * 0.4);
      } else if (isBoardScreen) {
        await startLoop(rainRef, SOUND_FILES.rainAmbience, ambienceVolume);
        await stopLoop(lampRef);
      } else if (isNarrativeScreen) {
        await startLoop(rainRef, SOUND_FILES.rainAmbience, ambienceVolume * 0.5);
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
  }, [activeScreen, settings.musicVolume, settings.ambienceVolume]);

  const playVictory = async () => {
    await stopLoop(deskMusicRef);
    await stopLoop(boardMusicRef);
    await stopLoop(narrativeMusicRef);
    await stopLoop(rainRef);
    await stopLoop(lampRef);
    if (settings.musicVolume <= 0) return;
    const sound = await ensureSound(victoryRef, SOUND_FILES.victory, { isLooping: false });
    await sound.setVolumeAsync(settings.musicVolume);
    await sound.setPositionAsync(0);
    await sound.playAsync();
  };

  const playSelect = async () => {
    if (settings.sfxVolume <= 0) return;
    const sound = await ensureSound(selectRef, SOUND_FILES.select, { isLooping: false });
    await sound.setVolumeAsync(settings.sfxVolume);
    await sound.setPositionAsync(0);
    await sound.playAsync();
  };

  const playSubmit = async () => {
    if (settings.sfxVolume <= 0) return;
    const sound = await ensureSound(submitRef, SOUND_FILES.submit, { isLooping: false });
    await sound.setVolumeAsync(settings.sfxVolume);
    await sound.setPositionAsync(0);
    await sound.playAsync();
  };

  const playFailure = async () => {
    if (settings.sfxVolume <= 0) return;
    const sound = await ensureSound(failureRef, SOUND_FILES.failure, { isLooping: false });
    await sound.setVolumeAsync(settings.sfxVolume);
    await sound.setPositionAsync(0);
    await sound.playAsync();
  };

  const stopAll = async () => {
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
  };

  return {
    playVictory,
    playSelect,
    playSubmit,
    playFailure,
    stopAll,
  };
}
