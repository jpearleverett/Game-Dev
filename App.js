import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StatusBar, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GameProvider, useGame } from './src/context/GameContext';
import { COLORS } from './src/constants/colors';
import AppNavigator from './src/navigation/AppNavigator';
import { useAudioController } from './src/hooks/useAudioController';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import useCachedResources from './src/hooks/useCachedResources';
import StoryGenerationOverlay from './src/components/StoryGenerationOverlay';

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
  const {
    progress,
    unlockNextCaseIfReady,
    setAudioController,
    storyGeneration,
    cancelGeneration,
    clearGenerationError,
    exitStoryCampaign,
  } = game;

  // Navigation ref for controlling navigation from overlay
  const navigationRef = useRef(null);

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

  // Overlay navigation handlers
  const handleGoToSettings = useCallback(() => {
    clearGenerationError?.();
    navigationRef.current?.navigate('Settings');
  }, [clearGenerationError]);

  const handleBackToHub = useCallback(() => {
    clearGenerationError?.();
    exitStoryCampaign?.();
    navigationRef.current?.navigate('Story');
  }, [clearGenerationError, exitStoryCampaign]);

  const handleRetry = useCallback(() => {
    // Clear error - the next navigation attempt will re-trigger generation
    clearGenerationError?.();
  }, [clearGenerationError]);

  const handleCancelGeneration = useCallback(() => {
    cancelGeneration?.();
    // Return to story hub when cancelling
    exitStoryCampaign?.();
    navigationRef.current?.navigate('Story');
  }, [cancelGeneration, exitStoryCampaign]);

  if (!fontsReady) {
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

  // Determine if generation overlay should be visible
  // Only show for IMMEDIATE generation (blocking), NOT for background preloading
  // This ensures the player never sees the loading screen during normal gameplay
  const showGenerationOverlay =
    storyGeneration?.awaitingGeneration || // Only when player is waiting for content they need NOW
    storyGeneration?.status === 'error' ||
    storyGeneration?.status === 'not_configured';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" />
      <NavigationContainer ref={navigationRef} onStateChange={handleStateChange}>
        <AppNavigator fontsReady={fontsReady} audio={audio} />
      </NavigationContainer>
      <StoryGenerationOverlay
        visible={showGenerationOverlay}
        status={storyGeneration?.status}
        progress={storyGeneration?.progress}
        error={storyGeneration?.error}
        generationType={storyGeneration?.generationType}
        isPreloading={storyGeneration?.isPreloading}
        onCancel={handleCancelGeneration}
        onRetry={handleRetry}
        onGoToSettings={handleGoToSettings}
        onBackToHub={handleBackToHub}
      />
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
