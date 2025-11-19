import { COLORS } from '../constants/colors';

const FALLBACK_PALETTE = {
  primary: COLORS.accentSecondary,
  accent: COLORS.accentPrimary,
  surface: 'rgba(6, 7, 12, 0.88)',
  surfaceAlt: 'rgba(10, 12, 18, 0.82)',
  overlayStart: 'rgba(4, 5, 8, 0.18)',
  overlayMid: 'rgba(8, 10, 16, 0.45)',
  overlayEnd: 'rgba(5, 6, 9, 0.92)',
  glow: 'rgba(241, 197, 114, 0.32)',
  border: 'rgba(241, 197, 114, 0.28)',
  badgeBackground: 'rgba(12, 11, 15, 0.58)',
  metricBackground: 'rgba(12, 10, 16, 0.7)',
  badgeText: COLORS.textMuted,
  highlightText: COLORS.offWhite,
  subtleText: COLORS.textSecondary,
};

const THEME_PALETTES = {
  communication: {
    primary: '#f3c46e',
    accent: '#76b0cc',
    surface: 'rgba(16, 12, 24, 0.88)',
    surfaceAlt: 'rgba(12, 9, 20, 0.82)',
    overlayMid: 'rgba(20, 10, 28, 0.45)',
    overlayEnd: 'rgba(10, 6, 18, 0.92)',
    glow: 'rgba(118, 176, 204, 0.38)',
  },
  'crime scene': {
    primary: '#f37b7b',
    accent: '#f1c572',
    surface: 'rgba(28, 8, 10, 0.86)',
    surfaceAlt: 'rgba(20, 6, 10, 0.82)',
    overlayMid: 'rgba(48, 12, 16, 0.36)',
    overlayEnd: 'rgba(9, 3, 6, 0.94)',
    glow: 'rgba(204, 80, 80, 0.46)',
    metricBackground: 'rgba(48, 12, 16, 0.72)',
  },
  identity: {
    primary: '#8ec7eb',
    accent: '#f1c572',
    surface: 'rgba(10, 16, 22, 0.9)',
    surfaceAlt: 'rgba(8, 12, 18, 0.82)',
    overlayMid: 'rgba(12, 20, 30, 0.42)',
    overlayEnd: 'rgba(6, 10, 16, 0.92)',
    glow: 'rgba(142, 199, 235, 0.34)',
    badgeBackground: 'rgba(12, 18, 26, 0.7)',
  },
  royalty: {
    primary: '#d5a6ff',
    accent: '#f3c46e',
    surface: 'rgba(22, 12, 32, 0.9)',
    surfaceAlt: 'rgba(16, 8, 24, 0.84)',
    overlayMid: 'rgba(32, 18, 46, 0.5)',
    overlayEnd: 'rgba(8, 4, 14, 0.92)',
    glow: 'rgba(213, 166, 255, 0.42)',
    badgeBackground: 'rgba(24, 12, 40, 0.72)',
  },
  forensics: {
    primary: '#9ad6c4',
    accent: '#f06969',
    surface: 'rgba(8, 18, 20, 0.9)',
    surfaceAlt: 'rgba(6, 14, 16, 0.82)',
    overlayMid: 'rgba(10, 24, 24, 0.48)',
    overlayEnd: 'rgba(4, 10, 12, 0.9)',
    glow: 'rgba(154, 214, 196, 0.42)',
    metricBackground: 'rgba(10, 26, 24, 0.7)',
  },
  wealth: {
    primary: '#f3d98c',
    accent: '#7fb7c8',
    surface: 'rgba(24, 18, 8, 0.9)',
    surfaceAlt: 'rgba(18, 12, 6, 0.82)',
    overlayMid: 'rgba(34, 24, 10, 0.5)',
    overlayEnd: 'rgba(10, 6, 2, 0.94)',
    glow: 'rgba(243, 217, 140, 0.38)',
    badgeBackground: 'rgba(28, 20, 8, 0.7)',
  },
  truth: {
    primary: '#9faee6',
    accent: '#f1c572',
    surface: 'rgba(10, 14, 28, 0.9)',
    surfaceAlt: 'rgba(8, 10, 22, 0.84)',
    overlayMid: 'rgba(12, 18, 36, 0.48)',
    overlayEnd: 'rgba(4, 6, 16, 0.92)',
    glow: 'rgba(159, 174, 230, 0.38)',
  },
};

export function createCasePalette(caseData, overrides = {}) {
  const themeKey = caseData?.mainTheme?.name ? caseData.mainTheme.name.toLowerCase() : null;
  const themeOverride = themeKey && THEME_PALETTES[themeKey] ? THEME_PALETTES[themeKey] : {};

  const palette = {
    ...FALLBACK_PALETTE,
    ...themeOverride,
    ...overrides,
  };

  palette.primary = overrides.primary || themeOverride.primary || FALLBACK_PALETTE.primary;
  palette.accent = overrides.accent || themeOverride.accent || FALLBACK_PALETTE.accent;
  palette.badgeBackground =
    overrides.badgeBackground || themeOverride.badgeBackground || FALLBACK_PALETTE.badgeBackground;
  palette.metricBackground =
    overrides.metricBackground || themeOverride.metricBackground || FALLBACK_PALETTE.metricBackground;

  return palette;
}

export const CASE_THEME_PALETTES = THEME_PALETTES;
export const CASE_FALLBACK_PALETTE = FALLBACK_PALETTE;
