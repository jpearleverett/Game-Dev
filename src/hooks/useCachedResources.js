import { useState, useEffect } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
} from '@expo-google-fonts/work-sans';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { CourierPrime_400Regular, CourierPrime_700Bold } from '@expo-google-fonts/courier-prime';

// Gather critical assets that should be preloaded
const CRITICAL_IMAGES = [
  require('../../assets/images/ui/backgrounds/noise-texture.png'),
  require('../../assets/images/ui/decorative/corner-ornament-tl.png'),
  require('../../assets/images/ui/decorative/corner-ornament-tr.png'),
  require('../../assets/images/ui/decorative/corner-ornament-bl.png'),
  require('../../assets/images/ui/decorative/corner-ornament-br.png'),
  require('../../assets/images/characters/portraits/buyer.png'),
  require('../../assets/images/characters/portraits/default.png'),
  require('../../assets/images/characters/portraits/keeper.png'),
  require('../../assets/images/characters/portraits/lex.png'),
  require('../../assets/images/characters/portraits/silence.png'),
  require('../../assets/images/characters/portraits/sparkle.png'),
  require('../../assets/images/characters/portraits/voice.png'),
];

export default function useCachedResources() {
  const [isLoadingComplete, setLoadingComplete] = useState(false);

  // Load any resources or data that we need prior to rendering the app
  useEffect(() => {
    async function loadResourcesAndDataAsync() {
      try {
        SplashScreen.preventAutoHideAsync();

        // Load Fonts
        await Font.loadAsync({
          WorkSans_400Regular,
          WorkSans_500Medium,
          WorkSans_600SemiBold,
          WorkSans_700Bold,
          PlayfairDisplay_400Regular,
          PlayfairDisplay_600SemiBold,
          PlayfairDisplay_700Bold,
          CourierPrime_400Regular,
          CourierPrime_700Bold,
        });

        // Load Images
        const imageAssets = CRITICAL_IMAGES.map((image) => {
          return Asset.fromModule(image).downloadAsync();
        });

        await Promise.all([...imageAssets]);
      } catch (e) {
        // We might want to provide this error information to an error reporting service
        console.warn(e);
      } finally {
        setLoadingComplete(true);
        SplashScreen.hideAsync();
      }
    }

    loadResourcesAndDataAsync();
  }, []);

  return isLoadingComplete;
}
