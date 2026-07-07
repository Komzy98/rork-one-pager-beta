/** Events tab chrome — cinematic dark theme (same on Discover and My Events). */
export const EVENTS_DISCOVER = {
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
} as const;

export type EventsTabMode = 'discover' | 'myEvents';

export function eventsFixedPalette(_mode: EventsTabMode = 'discover') {
  return {
    mode: 'discover' as const,
    background: EVENTS_DISCOVER.background,
    surface: EVENTS_DISCOVER.surface,
    surfaceLight: EVENTS_DISCOVER.surfaceLight,
    card: EVENTS_DISCOVER.card,
    border: EVENTS_DISCOVER.border,
    text: EVENTS_DISCOVER.text,
    textSecondary: EVENTS_DISCOVER.textSecondary,
    textMuted: EVENTS_DISCOVER.textMuted,
    primary: EVENTS_DISCOVER.accent,
    primaryLight: EVENTS_DISCOVER.accentLight,
    secondary: EVENTS_DISCOVER.accentSecondary,
    success: EVENTS_DISCOVER.success,
    successLight: EVENTS_DISCOVER.successLight,
    warning: EVENTS_DISCOVER.warning,
    error: EVENTS_DISCOVER.error,
    errorLight: EVENTS_DISCOVER.errorLight,
    heroScrim: EVENTS_DISCOVER.heroScrim,
    heroGradient: EVENTS_DISCOVER.heroGradient,
    glow: EVENTS_DISCOVER.glow,
    pillTrack: EVENTS_DISCOVER.pillTrack,
    pillBorder: EVENTS_DISCOVER.pillBorder,
  };
}

export type EventsPalette = ReturnType<typeof eventsFixedPalette>;
