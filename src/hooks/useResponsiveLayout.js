import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const shortest = Math.min(width, height);
  const longest = Math.max(width, height);

  const horizontalScale = width / BASE_WIDTH;
  const verticalScale = height / BASE_HEIGHT;
  const scale = clamp(Math.min(horizontalScale, verticalScale), 0.7, 1.4);

  return useMemo(() => {
    const sizeClass = (() => {
      if (shortest <= 340) return 'xsmall';
      if (shortest <= 375) return 'small';
      if (shortest <= 420) return 'medium';
      if (shortest <= 768) return 'large';
      return 'xlarge';
    })();

    const isTablet = shortest >= 600 || (longest >= 900 && shortest >= 500);
    const isLandscape = width > height;

      const moderateScale = (value, factor = 0.45) => {
        const scaled = value * scale;
        return Math.round(value + (scaled - value) * factor);
      };

      const scaleSpacing = (value) => {
        const base = value * clamp(horizontalScale, 0.75, 1.25);
        return Math.round(base);
      };

      const scaleRadius = (value) => Math.round(value * clamp(scale, 0.75, 1.15));

      const containerPadding = (() => {
        switch (sizeClass) {
          case 'xsmall':
            return 4;
          case 'small':
            return 6;
          case 'medium':
            return 8;
          case 'large':
            return 10;
          default:
            return 12;
        }
      })();

      const surfacePadding = (() => {
        switch (sizeClass) {
          case 'xsmall':
            return 5;
          case 'small':
            return 7;
          case 'medium':
            return 8;
          case 'large':
            return 11;
          default:
            return 13;
        }
      })();

    const surfaceRadius = (() => {
      switch (sizeClass) {
        case 'xsmall':
          return 8;
        case 'small':
          return 10;
        case 'medium':
          return 12;
        case 'large':
          return 13;
        default:
          return 14;
      }
    })();

    return {
      width,
      height,
      shortest,
      longest,
      horizontalScale,
      verticalScale,
      scale,
      sizeClass,
      isTablet,
      isLandscape,
      moderateScale,
      scaleSpacing,
      scaleRadius,
      containerPadding,
      surfacePadding,
      surfaceRadius,
    };
  }, [width, height, shortest, longest, horizontalScale, verticalScale, scale]);
}

export default useResponsiveLayout;
