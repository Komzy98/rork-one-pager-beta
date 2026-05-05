import { COLORS } from '@/constants/colors';

/** Fixed iOS-style sports chrome — ignores Profile → Appearance (match cards, headers, UFC cards). */
export function sportsFixedPalette(isDark: boolean) {
  if (isDark) {
    return {
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
      primary: '#0A84FF',
      warning: '#FFD60A',
      error: '#FF453A',
      warningLight: '#FFD60A',
      successLight: '#32D74B',
      shadow: '#000000',
      info: '#5E5CE6',
      secondary: '#BF5AF2',
      errorLight: '#3A1A1A',
      tickerGradient: ['#0A1A12', '#145A32', '#1A1A2E'] as const,
      tickerSheen: 'rgba(50, 215, 75, 0.22)',
      ufcGradient: ['#0A0606', '#0E0814', '#06040E'] as const,
    };
  }
  return {
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
    tickerGradient: ['#0A1A12', '#145A32', '#1A1A2E'] as const,
    tickerSheen: 'rgba(50, 215, 75, 0.22)',
    ufcGradient: ['#1A0808', '#1C0A18', '#0F0A1E'] as const,
  };
}
