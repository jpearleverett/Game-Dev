import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StatusBar, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GameProvider, useGame } from './src/context/GameContext';
import { AudioProvider } from './src/context/AudioContext';
import { StoryProvider } from './src/context/StoryContext';
import { COLORS } from './src/constants/colors';
import AppNavigator from './src/navigation/AppNavigator';
import { useAudioController } from './src/hooks/useAudioController';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import useCachedResources from './src/hooks/useCachedResources';
import StoryGenerationOverlay from './src/components/StoryGenerationOverlay';
import LLMDebugOverlay from './src/components/LLMDebugOverlay';
import { usePersistence } from './src/hooks/usePersistence';

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

// Wrapper component to provide contexts that need progress
function GameWrapper({ fontsReady }) {
  const persistence = usePersistence();
  const {
    progress,
    hydrationComplete,
  } = persistence;

  // Initialize Audio Controller (needs settings from persistence)
  const [currentRoute, setCurrentRoute] = useState('Splash');
  const audioKey = ROUTE_TO_AUDIO_KEY[currentRoute] || 'desk';
  const audio = useAudioController(audioKey, progress.settings || {});

  // Handle Navigation State Changes to update audio
  const handleStateChange = useCallback((state) => {
    if (!state) return;
    const route = state.routes[state.index];
    setCurrentRoute(route.name);
  }, []);

  if (!hydrationComplete) {
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

  return (
    <AudioProvider controller={audio} settings={progress.settings}>
      <StoryProvider progress={progress} updateProgress={persistence.updateProgress}>
        <GameProvider {...persistence}>
          <AppContent
            fontsReady={fontsReady}
            audioController={audio}
            onStateChange={handleStateChange}
          />
        </GameProvider>
      </StoryProvider>
    </AudioProvider>
  );
}

function AppContent({ fontsReady, audioController, onStateChange }) {
  const game = useGame();
  const {
    progress,
    unlockNextCaseIfReady,
    // setAudioController, // Removed from GameContext API
    storyGeneration,
    cancelGeneration,
    clearGenerationError,
    exitStoryCampaign,
    updateSettings,
  } = game;

  const navigationRef = useRef(null);
  const verboseMode = progress?.settings?.verboseMode || false;

  // Global Game Loop: Check for case unlocks
  useEffect(() => {
    unlockNextCaseIfReady();
  }, [unlockNextCaseIfReady, progress.nextUnlockAt]);

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
    clearGenerationError?.();
  }, [clearGenerationError]);

  const handleCancelGeneration = useCallback(() => {
    cancelGeneration?.();
    exitStoryCampaign?.();
    navigationRef.current?.navigate('Story');
  }, [cancelGeneration, exitStoryCampaign]);

  if (!fontsReady) {
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

  const showGenerationOverlay =
    storyGeneration?.awaitingGeneration ||
    storyGeneration?.status === 'error' ||
    storyGeneration?.status === 'not_configured';

  const handleCloseVerboseOverlay = useCallback(() => {
    updateSettings?.({ verboseMode: false });
  }, [updateSettings]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" />
      <LLMDebugOverlay
        visible={verboseMode}
        onClose={handleCloseVerboseOverlay}
      />
      <NavigationContainer ref={navigationRef} onStateChange={onStateChange}>
        <AppNavigator fontsReady={fontsReady} audio={audioController} />
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
      <GameWrapper fontsReady={true} />
    </ErrorBoundary>
  );
}
