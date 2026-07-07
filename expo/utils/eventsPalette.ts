import { COLORS } from '@/constants/colors';

/** Events tab — dark cinematic chrome. */
const EVENTS_DARK = {
  background: '#07060B',
  surface: '#111018',
  surfaceLight: '#181622',
  card: '#16141F',
  border: 'rgba(255,255,255,0.09)',
  text: '#F8F7FC',
  textSecondary: '#9B98AE',
  textMuted: '#5C586E',
  accent: '#E84393',
  accentLight: 'rgba(232, 67, 147, 0.16)',
  accentSecondary: '#6C5CE7',
  success: '#4ADE80',
  successLight: 'rgba(74, 222, 128, 0.14)',
  warning: '#FBBF24',
  error: '#FF453A',
  errorLight: 'rgba(255, 69, 58, 0.14)',
  heroScrim: ['transparent', 'rgba(7,6,11,0.35)', 'rgba(7,6,11,0.94)'] as const,
  heroGradient: ['#E84393', '#6C5CE7', '#2D1B4E'] as const,
  glow: 'rgba(232, 67, 147, 0.2)',
  pillTrack: 'rgba(255,255,255,0.06)',
  pillBorder: 'rgba(255,255,255,0.1)',
  categoryScrim: 'rgba(7,6,11,0.88)',
  blurTint: 'dark' as const,
  toolbarGradient: ['rgba(7,6,11,0.92)', 'rgba(7,6,11,0.55)', 'transparent'] as const,
  toolbarTitle: '#FFFFFF',
  chromeFallback: 'rgba(7,6,11,0.88)',
  textOnImage: '#FFFFFF',
  textOnImageSecondary: 'rgba(255,255,255,0.82)',
  textInverse: '#FFFFFF',
} as const;

/** Events tab — light mode aligned with app-wide light tokens. */
const EVENTS_LIGHT = {
  background: COLORS.background,
  surface: COLORS.surface,
  surfaceLight: COLORS.surfaceSecondary,
  card: COLORS.card,
  border: 'rgba(17, 24, 39, 0.08)',
  text: COLORS.text,
  textSecondary: COLORS.textSecondary,
  textMuted: COLORS.textMuted,
  accent: '#E84393',
  accentLight: 'rgba(232, 67, 147, 0.10)',
  accentSecondary: '#6C5CE7',
  success: '#22C55E',
  successLight: 'rgba(34, 197, 94, 0.12)',
  warning: '#F59E0B',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.10)',
  heroScrim: ['transparent', 'rgba(7,6,11,0.22)', 'rgba(7,6,11,0.82)'] as const,
  heroGradient: ['#FCE7F3', '#EDE9FE', '#F8F9FA'] as const,
  glow: 'rgba(232, 67, 147, 0.12)',
  pillTrack: 'rgba(17, 24, 39, 0.05)',
  pillBorder: 'rgba(17, 24, 39, 0.08)',
  categoryScrim: 'rgba(248, 249, 250, 0.9)',
  blurTint: 'light' as const,
  toolbarGradient: ['rgba(255,255,255,0.96)', 'rgba(255,255,255,0.78)', 'transparent'] as const,
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

/** Events tab palette — respects Profile → Appearance (light / dark / auto). */
export function eventsFixedPalette(isDark: boolean, mode: EventsTabMode = 'discover') {
  return buildPalette(isDark ? EVENTS_DARK : EVENTS_LIGHT, mode);
}

export type EventsPalette = ReturnType<typeof eventsFixedPalette>;

/** @deprecated Use EVENTS_DARK values via eventsFixedPalette(true). */
export const EVENTS_DISCOVER = EVENTS_DARK;
