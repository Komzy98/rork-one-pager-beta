// Unified Design System — derived from constants/brand.ts (onepagerapp.co.uk)
import { BRAND } from './brand';

const L = BRAND.light;

export const COLORS = {
  primary: L.primary,
  primaryLight: L.primaryLight,
  primaryDark: L.primaryDark,

  success: '#22C55E',
  successLight: '#BBF7D0',
  error: '#EF4444',
  errorLight: '#FECACA',
  warning: '#F59E0B',
  warningLight: '#FDE68A',
  info: L.accent,
  infoLight: '#F3E8FF',

  background: L.background,
  backgroundSecondary: L.backgroundSecondary,
  surface: L.surface,
  surfaceSecondary: L.surfaceSecondary,

  text: L.text,
  textSecondary: L.textSecondary,
  textTertiary: L.textTertiary,
  textLight: L.textMuted,
  textMuted: L.textMuted,
  textInverse: L.textInverse,

  border: L.border,
  borderLight: L.borderLight,
  divider: L.divider,

  inactive: '#9CA3AF',
  disabled: '#E2E8F0',
  pressed: L.pressed,

  overlay: 'rgba(13, 14, 18, 0.55)',
  shadow: '#0D0E12',

  live: '#EF4444',
  accent: L.accent,
  teal: '#38BDF8',

  card: L.surface,
  cardElevated: L.surface,
  cardSecondary: L.surfaceSecondary,
  cardHover: L.border,

  secondary: L.accent,
  completed: '#22C55E',
  upcoming: '#F59E0B',
  backgroundTertiary: L.border,
  gradientStart: L.gradientStart,
  gradientMiddle: L.gradientMiddle,
  gradientEnd: L.gradientEnd,

  tabBarBackground: L.surface,
  tabBarBorder: L.border,
};

export const HABIT_COLORS = [
  L.primary,
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  L.accent,
  L.primaryLight,
  '#38BDF8',
  '#EC4899',
  '#EAB308',
  '#14B8A6',
];

export const CATEGORY_COLORS = {
  work: L.primary,
  personal: L.accent,
  health: '#22C55E',
  learning: '#F59E0B',
  finance: '#14B8A6',
  social: '#EC4899',
  other: '#9CA3AF',
};

export const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
  none: '#9CA3AF',
};

export const STATUS_COLORS = {
  active: '#22C55E',
  pending: '#F59E0B',
  completed: L.primary,
  cancelled: '#EF4444',
  paused: '#9CA3AF',
};

export default {
  light: {
    text: COLORS.text,
    background: COLORS.background,
    tint: COLORS.primary,
    tabIconDefault: COLORS.inactive,
    tabIconSelected: COLORS.primary,
  },
};
