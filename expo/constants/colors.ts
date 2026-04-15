// Unified Design System - Color Tokens
// iOS-inspired with clean, modern aesthetics

export const COLORS = {
  // Brand Colors
  primary: '#007AFF',
  primaryLight: '#4DA3FF',
  primaryDark: '#0056B3',
  
  // Semantic Colors
  success: '#34C759',
  successLight: '#A8E6CF',
  error: '#FF3B30',
  errorLight: '#FFCDD2',
  warning: '#FF9500',
  warningLight: '#FFE0B2',
  info: '#5856D6',
  infoLight: '#E8E7F8',
  
  // Neutral Colors - Light Theme
  background: '#F8F9FA',
  backgroundSecondary: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F2F7',
  
  // Text Colors
  text: '#1C1C1E',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  textLight: '#8E8E93', // Alias for textTertiary - backwards compatibility
  textMuted: '#AEAEB2',
  textInverse: '#FFFFFF',
  
  // Border & Divider
  border: '#E5E5EA',
  borderLight: '#F2F2F7',
  divider: '#C6C6C8',
  
  // Interactive States
  inactive: '#8E8E93',
  disabled: '#D1D1D6',
  pressed: 'rgba(0, 122, 255, 0.1)',
  
  // Overlay & Shadow
  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow: '#000000',
  
  // Accent Colors
  live: '#FF3B30',
  accent: '#AF52DE',
  teal: '#5AC8FA',
  
  // Card & Surface
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  cardSecondary: '#F2F2F7', // Backwards compatibility
  cardHover: '#E5E5EA',
  
  // Additional backwards compatibility
  secondary: '#5856D6',
  completed: '#34C759',
  upcoming: '#FF9500',
  backgroundTertiary: '#E5E5EA',
  gradientStart: '#007AFF',
  gradientMiddle: '#5856D6',
  gradientEnd: '#AF52DE',
  
  // Tab Bar
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E5E5EA',
};

// Habit-specific colors
export const HABIT_COLORS = [
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9500', // Orange
  '#FF3B30', // Red
  '#5856D6', // Purple
  '#AF52DE', // Magenta
  '#5AC8FA', // Cyan
  '#FF2D55', // Pink
  '#FFCC00', // Yellow
  '#00C7BE', // Teal
];

// Category colors for consistency
export const CATEGORY_COLORS = {
  work: '#007AFF',
  personal: '#5856D6',
  health: '#34C759',
  learning: '#FF9500',
  finance: '#00C7BE',
  social: '#FF2D55',
  other: '#8E8E93',
};

// Priority colors
export const PRIORITY_COLORS = {
  high: '#FF3B30',
  medium: '#FF9500',
  low: '#34C759',
  none: '#8E8E93',
};

// Status colors
export const STATUS_COLORS = {
  active: '#34C759',
  pending: '#FF9500',
  completed: '#007AFF',
  cancelled: '#FF3B30',
  paused: '#8E8E93',
};

// Export for expo-router
export default {
  light: {
    text: COLORS.text,
    background: COLORS.background,
    tint: COLORS.primary,
    tabIconDefault: COLORS.inactive,
    tabIconSelected: COLORS.primary,
  },
};
