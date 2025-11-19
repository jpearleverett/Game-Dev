import React, { useState } from 'react';
import { StatusBar, View } from 'react-native';
import { useFonts, WorkSans_400Regular, WorkSans_500Medium, WorkSans_700Bold } from '@expo-google-fonts/work-sans';
import { GameProvider, useGame } from './src/context/GameContext';
import { COLORS } from './src/constants/colors';
import ScreenNavigator from './src/navigation/ScreenNavigator';

function AppContent({ fontsReady }) {
  const game = useGame();
  const [activeScreen, setActiveScreen] = useState('splash');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" />
      <ScreenNavigator
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        game={game}
        fontsReady={fontsReady}
      />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_700Bold,
  });

  return (
    <GameProvider>
      <AppContent fontsReady={fontsLoaded} />
    </GameProvider>
  );
}
