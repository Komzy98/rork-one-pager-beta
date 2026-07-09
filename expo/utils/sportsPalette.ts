import { BRAND } from '@/constants/brand';
import { COLORS } from '@/constants/colors';

/** UFC Fight Center — sub-brand red (scoped to UFC section only). */
export const UFC_BRAND = {
  bg: '#050507',
  red: '#E50914',
  redBright: '#FF3B43',
  redDark: '#B30710',
  surface: '#111214',
  border: 'rgba(255,255,255,0.11)',
  muted: '#A5A6AA',
  text: '#F5F5F6',
  segmentTrack: '#0C0D0F',
  redSoft: 'rgba(229, 9, 20, 0.14)',
  redBorder: 'rgba(229, 9, 20, 0.38)',
  winGreen: '#2ECC71',
} as const;

export function ufcFixedPalette() {
  return {
    card: UFC_BRAND.surface,
    border: UFC_BRAND.border,
    surfaceSecondary: '#1A1B1E',
    backgroundSecondary: '#0E0F11',
    backgroundTertiary: '#16171A',
    text: UFC_BRAND.text,
    textSecondary: UFC_BRAND.muted,
    textMuted: UFC_BRAND.muted,
    textTertiary: '#6E7075',
    textInverse: '#FFFFFF',
    live: UFC_BRAND.redBright,
    success: UFC_BRAND.winGreen,
    primary: UFC_BRAND.red,
    warning: UFC_BRAND.red,
    error: UFC_BRAND.red,
    ufcGradient: ['#0A0606', '#0E0814', '#06040E'] as const,
  };
}

/** Football match cards — green accent (sport-specific only). */
const MATCH_CHROME_LIGHT = {
  card: '#F4FBF7',
  border: 'rgba(21, 128, 61, 0.28)',
  surfaceSecondary: '#E8F5EC',
  accent: '#15803D',
  glow: ['rgba(52, 199, 89, 0.16)', 'transparent'] as const,
  shadow: '#15803D',
};

const MATCH_CHROME_DARK = {
  card: '#101A14',
  border: 'rgba(50, 215, 75, 0.24)',
  surfaceSecondary: '#152218',
  accent: '#32D74B',
  glow: ['rgba(50, 215, 75, 0.14)', 'transparent'] as const,
  shadow: '#145A32',
};

/** Sports chrome — brand spine + green match accents only. */
export function sportsFixedPalette(isDark: boolean) {
  const brand = isDark ? BRAND.dark : BRAND.light;
  if (isDark) {
    return {
      matchChrome: MATCH_CHROME_DARK,
      card: '#111125',
      text: '#F0F0FA',
      textSecondary: '#A1A1B5',
      textMuted: '#6B6B85',
      textTertiary: '#5A5A7A',
      textInverse: '#FFFFFF',
      border: '#2A2A44',
      surfaceSecondary: '#1A1A2E',
      backgroundSecondary: '#151528',
      backgroundTertiary: '#1A1A32',
      live: '#FF453A',
      success: '#32D74B',
      primary: brand.primary,
      warning: '#FBBF24',
      error: '#F87171',
      warningLight: '#FBBF24',
      successLight: '#4ADE80',
      shadow: '#000000',
      info: brand.accent,
      secondary: brand.accent,
      errorLight: '#3A1A1A',
      tickerGradient: [brand.backgroundSecondary, brand.primaryDark, brand.surface] as const,
      tickerSheen: 'rgba(110, 150, 251, 0.22)',
      ufcGradient: ['#0A0606', '#0E0814', '#06040E'] as const,
    };
  }
  return {
    matchChrome: MATCH_CHROME_LIGHT,
    card: COLORS.card,
    text: COLORS.text,
    textSecondary: COLORS.textSecondary,
    textMuted: COLORS.textMuted,
    textTertiary: COLORS.textTertiary,
    textInverse: COLORS.textInverse,
    border: COLORS.border,
    surfaceSecondary: COLORS.surfaceSecondary,
    backgroundSecondary: COLORS.backgroundSecondary,
    backgroundTertiary: COLORS.backgroundTertiary,
    live: COLORS.live,
    success: COLORS.success,
    primary: COLORS.primary,
    warning: COLORS.warning,
    error: COLORS.error,
    warningLight: COLORS.warningLight,
    successLight: COLORS.successLight,
    shadow: COLORS.shadow,
    info: COLORS.info,
    secondary: COLORS.secondary,
    errorLight: COLORS.errorLight,
    tickerGradient: [brand.background, brand.primary, brand.surfaceSecondary] as const,
    tickerSheen: 'rgba(36, 64, 211, 0.14)',
    ufcGradient: ['#1A0808', '#1C0A18', '#0F0A1E'] as const,
  };
}
