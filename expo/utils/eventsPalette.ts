import { BRAND } from '@/constants/brand';
import { COLORS } from '@/constants/colors';

/** Events — dark cinematic chrome using website navy + blue/purple accents. */
const EVENTS_DARK = {
  background: BRAND.dark.background,
  surface: BRAND.dark.surface,
  surfaceLight: BRAND.dark.surfaceSecondary,
  card: '#141824',
  border: BRAND.dark.border,
  text: BRAND.dark.text,
  textSecondary: BRAND.dark.textSecondary,
  textMuted: BRAND.dark.textMuted,
  accent: BRAND.dark.primary,
  accentLight: 'rgba(110, 150, 251, 0.16)',
  accentSecondary: BRAND.dark.accent,
  success: '#4ADE80',
  successLight: 'rgba(74, 222, 128, 0.14)',
  warning: '#FBBF24',
  error: '#F87171',
  errorLight: 'rgba(248, 113, 113, 0.14)',
  heroScrim: ['transparent', 'rgba(8, 21, 51, 0.35)', 'rgba(13, 14, 18, 0.94)'] as const,
  heroGradient: [BRAND.dark.gradientStart, BRAND.dark.gradientMiddle, BRAND.dark.gradientEnd] as const,
  glow: 'rgba(110, 150, 251, 0.22)',
  pillTrack: 'rgba(255, 255, 255, 0.06)',
  pillBorder: BRAND.dark.border,
  categoryScrim: 'rgba(13, 14, 18, 0.88)',
  blurTint: 'dark' as const,
  toolbarGradient: ['rgba(13, 14, 18, 0.92)', 'rgba(8, 21, 51, 0.55)', 'transparent'] as const,
  toolbarTitle: BRAND.dark.text,
  chromeFallback: 'rgba(13, 14, 18, 0.88)',
  textOnImage: '#FFFFFF',
  textOnImageSecondary: 'rgba(255,255,255,0.82)',
  textInverse: '#FFFFFF',
} as const;

const EVENTS_LIGHT = {
  background: COLORS.background,
  surface: COLORS.surface,
  surfaceLight: COLORS.surfaceSecondary,
  card: COLORS.card,
  border: 'rgba(36, 64, 211, 0.10)',
  text: COLORS.text,
  textSecondary: COLORS.textSecondary,
  textMuted: COLORS.textMuted,
  accent: BRAND.light.primary,
  accentLight: 'rgba(36, 64, 211, 0.10)',
  accentSecondary: BRAND.light.accent,
  success: '#22C55E',
  successLight: 'rgba(34, 197, 94, 0.12)',
  warning: '#F59E0B',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.10)',
  heroScrim: ['transparent', 'rgba(8, 21, 51, 0.18)', 'rgba(13, 14, 18, 0.78)'] as const,
  heroGradient: ['#EEF2FF', '#E8EDFF', COLORS.background] as const,
  glow: 'rgba(36, 64, 211, 0.12)',
  pillTrack: 'rgba(36, 64, 211, 0.05)',
  pillBorder: 'rgba(36, 64, 211, 0.10)',
  categoryScrim: 'rgba(247, 248, 252, 0.92)',
  blurTint: 'light' as const,
  toolbarGradient: ['rgba(255,255,255,0.96)', 'rgba(247,248,252,0.78)', 'transparent'] as const,
  toolbarTitle: COLORS.text,
  chromeFallback: 'rgba(255,255,255,0.92)',
  textOnImage: '#FFFFFF',
  textOnImageSecondary: 'rgba(255,255,255,0.82)',
  textInverse: '#FFFFFF',
} as const;

export type EventsTabMode = 'discover' | 'myEvents';

function buildPalette(tokens: typeof EVENTS_DARK | typeof EVENTS_LIGHT, mode: EventsTabMode) {
  return {
    mode,
    background: tokens.background,
    surface: tokens.surface,
    surfaceLight: tokens.surfaceLight,
    surfaceSecondary: tokens.surfaceLight,
    card: tokens.card,
    border: tokens.border,
    text: tokens.text,
    textSecondary: tokens.textSecondary,
    textMuted: tokens.textMuted,
    primary: tokens.accent,
    primaryLight: tokens.accentLight,
    secondary: tokens.accentSecondary,
    success: tokens.success,
    successLight: tokens.successLight,
    warning: tokens.warning,
    error: tokens.error,
    errorLight: tokens.errorLight,
    heroScrim: tokens.heroScrim,
    heroGradient: tokens.heroGradient,
    glow: tokens.glow,
    pillTrack: tokens.pillTrack,
    pillBorder: tokens.pillBorder,
    categoryScrim: tokens.categoryScrim,
    blurTint: tokens.blurTint,
    toolbarGradient: tokens.toolbarGradient,
    toolbarTitle: tokens.toolbarTitle,
    chromeFallback: tokens.chromeFallback,
    textOnImage: tokens.textOnImage,
    textOnImageSecondary: tokens.textOnImageSecondary,
    textInverse: tokens.textInverse,
  };
}

export function eventsFixedPalette(isDark: boolean, mode: EventsTabMode = 'discover') {
  return buildPalette(isDark ? EVENTS_DARK : EVENTS_LIGHT, mode);
}

export type EventsPalette = ReturnType<typeof eventsFixedPalette>;

/** @deprecated Use eventsFixedPalette(isDark) instead. */
export const EVENTS_DISCOVER = EVENTS_DARK;
