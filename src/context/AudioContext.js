import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';

const AudioContext = createContext(null);

export function AudioProvider({ children, controller, settings }) {
  const audioRef = useRef(controller);

  // Sync controller updates if they change externally (less likely in this architecture but good practice)
  useEffect(() => {
    if (controller) {
      audioRef.current = controller;
    }
  }, [controller]);

  const playVictory = useCallback(() => {
    audioRef.current?.playVictory?.();
  }, []);

  const playFailure = useCallback(() => {
    audioRef.current?.playFailure?.();
  }, []);

  const playSubmit = useCallback(() => {
    audioRef.current?.playSubmit?.();
  }, []);

  const value = {
    playVictory,
    playFailure,
    playSubmit,
    controller: audioRef.current // Expose raw controller if needed for complex logic
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
