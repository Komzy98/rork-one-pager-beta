/**
 * One Pager brand spine — aligned with https://onepagerapp.co.uk/
 * Colors: Framer tokens (#2440d3, #6e96fb, #a940ff, #0d0e12, #081533).
 * Typography: DM Sans (display) + Inter (body) — see constants/fonts.ts.
 */
export const BRAND = {
  light: {
    primary: '#2440D3',
    primaryLight: '#6E96FB',
    primaryDark: '#1A32A8',
    accent: '#A940FF',
    accentLight: '#C47AFF',

    background: '#F7F8FC',
    backgroundSecondary: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSecondary: '#EEF2FF',

    text: '#0D0E12',
    textSecondary: '#454F63',
    textTertiary: '#6B7280',
    textMuted: '#9CA3AF',
    textInverse: '#FFFFFF',

    border: '#E2E8F0',
    borderLight: '#EEF2FF',
    divider: '#D1D9E6',

    pressed: 'rgba(36, 64, 211, 0.10)',

    gradientStart: '#2440D3',
    gradientMiddle: '#6E96FB',
    gradientEnd: '#A940FF',
  },
  dark: {
    primary: '#6E96FB',
    primaryLight: '#8BADFC',
    primaryDark: '#2440D3',
    accent: '#A940FF',
    accentLight: '#C47AFF',

    background: '#0D0E12',
    backgroundSecondary: '#081533',
    surface: '#12141A',
    surfaceSecondary: '#1A1F35',

    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.82)',
    textTertiary: 'rgba(255, 255, 255, 0.55)',
    textMuted: '#454F63',
    textInverse: '#0D0E12',

    border: 'rgba(255, 255, 255, 0.10)',
    borderLight: 'rgba(255, 255, 255, 0.06)',
    divider: 'rgba(255, 255, 255, 0.14)',

    pressed: 'rgba(110, 150, 251, 0.18)',

    gradientStart: '#2440D3',
    gradientMiddle: '#6E96FB',
    gradientEnd: '#A940FF',
  },
} as const;

export const BRAND_GRADIENT = {
  light: [BRAND.light.gradientStart, BRAND.light.gradientMiddle, BRAND.light.gradientEnd] as const,
  dark: [BRAND.dark.gradientStart, BRAND.dark.gradientMiddle, BRAND.dark.gradientEnd] as const,
};

/** Hero/icon gradient — matches website blue → purple */
export function brandIconGradient(isDark: boolean): [string, string] {
  const tokens = isDark ? BRAND.dark : BRAND.light;
  return [tokens.primary, tokens.accent];
}
