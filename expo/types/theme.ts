export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  success: string;
  successLight: string;
  error: string;
  errorLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;
  
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceSecondary: string;
  
  text: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textInverse: string;
  
  border: string;
  borderLight: string;
  divider: string;
  
  inactive: string;
  disabled: string;
  pressed: string;
  
  overlay: string;
  shadow: string;
  
  live: string;
  accent: string;
  teal: string;
  
  card: string;
  cardElevated: string;
  cardSecondary: string;
  cardHover: string;
  
  secondary: string;
  completed: string;
  upcoming: string;
  backgroundTertiary: string;
  gradientStart: string;
  gradientMiddle: string;
  gradientEnd: string;
  
  tabBarBackground: string;
  tabBarBorder: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  isDark: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'auto';
