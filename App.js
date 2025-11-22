import React, { useState, useEffect } from 'react';
import { StatusBar, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GameProvider, useGame } from './src/context/GameContext';
import { COLORS } from './src/constants/colors';
import AppNavigator from './src/navigation/AppNavigator';
import { useAudioController } from './src/hooks/useAudioController';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import useCachedResources from './src/hooks/useCachedResources';

const ROUTE_TO_AUDIO_KEY = {
  Splash: 'splash',
  Prologue: 'prologue',
  Desk: 'desk',
  Board: 'board',
  Solved: 'solved',
  CaseFile: 'caseFile',
  Archive: 'archive',
  Stats: 'stats',
  Menu: 'menu',
  Settings: 'settings',
  Story: 'story',
};

function AppContent({ fontsReady }) {
  const game = useGame();
  const { progress, unlockNextCaseIfReady, setAudioController } = game;
  
  // Track current screen for audio context
  const [currentRoute, setCurrentRoute] = useState('Splash');
  
  // Map the navigation route name to the audio controller's expected key
  const audioKey = ROUTE_TO_AUDIO_KEY[currentRoute] || 'desk';
  
  // Initialize Audio Controller
  const audio = useAudioController(audioKey, progress.settings || {});

  // Sync audio controller to GameContext
  useEffect(() => {
    setAudioController(audio);
  }, [audio, setAudioController]);

  // Global Game Loop: Check for case unlocks
  useEffect(() => {
    unlockNextCaseIfReady();
  }, [unlockNextCaseIfReady, progress.nextUnlockAt]);

  // Handle Navigation State Changes
  const handleStateChange = (state) => {
    if (!state) return;
    const route = state.routes[state.index];
    setCurrentRoute(route.name);
  };

  if (!fontsReady) {
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" />
      <NavigationContainer onStateChange={handleStateChange}>
        <AppNavigator fontsReady={fontsReady} audio={audio} />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  const isLoadingComplete = useCachedResources();

  if (!isLoadingComplete) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GameProvider>
        <AppContent fontsReady={true} />
      </GameProvider>
    </ErrorBoundary>
  );
}
