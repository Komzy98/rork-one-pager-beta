import { Theme } from '@/types/theme';

export const DEFAULT_LIGHT_THEME: Theme = {
  id: 'default-light',
  name: 'Default Light',
  isDark: false,
  colors: {
    primary: '#007AFF',
    primaryLight: '#4DA3FF',
    primaryDark: '#0056B3',
    
    success: '#34C759',
    successLight: '#A8E6CF',
    error: '#FF3B30',
    errorLight: '#FFCDD2',
    warning: '#FF9500',
    warningLight: '#FFE0B2',
    info: '#5856D6',
    infoLight: '#E8E7F8',
    
    background: '#F8F9FA',
    backgroundSecondary: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSecondary: '#F2F2F7',
    
    text: '#1C1C1E',
    textSecondary: '#3C3C43',
    textTertiary: '#8E8E93',
    textMuted: '#AEAEB2',
    textInverse: '#FFFFFF',
    
    border: '#E5E5EA',
    borderLight: '#F2F2F7',
    divider: '#C6C6C8',
    
    inactive: '#8E8E93',
    disabled: '#D1D1D6',
    pressed: 'rgba(0, 122, 255, 0.1)',
    
    overlay: 'rgba(0, 0, 0, 0.4)',
    shadow: '#000000',
    
    live: '#FF3B30',
    accent: '#AF52DE',
    teal: '#5AC8FA',
    
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    cardSecondary: '#F2F2F7',
    cardHover: '#E5E5EA',
    
    secondary: '#5856D6',
    completed: '#34C759',
    upcoming: '#FF9500',
    backgroundTertiary: '#E5E5EA',
    gradientStart: '#007AFF',
    gradientMiddle: '#5856D6',
    gradientEnd: '#AF52DE',
    
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E5E5EA',
  },
};

export const DEFAULT_DARK_THEME: Theme = {
  id: 'default-dark',
  name: 'Default Dark',
  isDark: true,
  colors: {
    primary: '#0A84FF',
    primaryLight: '#64B5FF',
    primaryDark: '#0066CC',
    
    success: '#32D74B',
    successLight: '#64D875',
    error: '#FF453A',
    errorLight: '#FF6961',
    warning: '#FF9F0A',
    warningLight: '#FFB340',
    info: '#5E5CE6',
    infoLight: '#7D7AFF',
    
    background: '#000000',
    backgroundSecondary: '#1C1C1E',
    surface: '#1C1C1E',
    surfaceSecondary: '#2C2C2E',
    
    text: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textTertiary: '#EBEBF599',
    textMuted: '#EBEBF54D',
    textInverse: '#000000',
    
    border: '#38383A',
    borderLight: '#2C2C2E',
    divider: '#48484A',
    
    inactive: '#8E8E93',
    disabled: '#48484A',
    pressed: 'rgba(10, 132, 255, 0.2)',
    
    overlay: 'rgba(0, 0, 0, 0.6)',
    shadow: '#000000',
    
    live: '#FF453A',
    accent: '#BF5AF2',
    teal: '#64D2FF',
    
    card: '#1C1C1E',
    cardElevated: '#2C2C2E',
    cardSecondary: '#2C2C2E',
    cardHover: '#38383A',
    
    secondary: '#5E5CE6',
    completed: '#32D74B',
    upcoming: '#FF9F0A',
    backgroundTertiary: '#2C2C2E',
    gradientStart: '#0A84FF',
    gradientMiddle: '#5E5CE6',
    gradientEnd: '#BF5AF2',
    
    tabBarBackground: '#1C1C1E',
    tabBarBorder: '#38383A',
  },
};

export const OCEAN_THEME: Theme = {
  id: 'ocean',
  name: 'Ocean',
  isDark: false,
  colors: {
    primary: '#006994',
    primaryLight: '#3D91B8',
    primaryDark: '#004D6D',
    
    success: '#00BFA5',
    successLight: '#64D8CB',
    error: '#E91E63',
    errorLight: '#F48FB1',
    warning: '#FF6F00',
    warningLight: '#FFB74D',
    info: '#0097A7',
    infoLight: '#4DD0E1',
    
    background: '#E0F7FA',
    backgroundSecondary: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSecondary: '#B2EBF2',
    
    text: '#004D40',
    textSecondary: '#00695C',
    textTertiary: '#00897B',
    textMuted: '#80CBC4',
    textInverse: '#FFFFFF',
    
    border: '#80DEEA',
    borderLight: '#B2EBF2',
    divider: '#4DD0E1',
    
    inactive: '#00897B',
    disabled: '#B2DFDB',
    pressed: 'rgba(0, 105, 148, 0.1)',
    
    overlay: 'rgba(0, 77, 64, 0.4)',
    shadow: '#000000',
    
    live: '#E91E63',
    accent: '#00ACC1',
    teal: '#26C6DA',
    
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    cardSecondary: '#B2EBF2',
    cardHover: '#80DEEA',
    
    secondary: '#0097A7',
    completed: '#00BFA5',
    upcoming: '#FF6F00',
    backgroundTertiary: '#80DEEA',
    gradientStart: '#006994',
    gradientMiddle: '#0097A7',
    gradientEnd: '#00ACC1',
    
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#80DEEA',
  },
};

export const SUNSET_THEME: Theme = {
  id: 'sunset',
  name: 'Sunset',
  isDark: false,
  colors: {
    primary: '#FF6B35',
    primaryLight: '#FF8A5B',
    primaryDark: '#E55A2B',
    
    success: '#52B788',
    successLight: '#95D5B2',
    error: '#D62828',
    errorLight: '#F48C8C',
    warning: '#F77F00',
    warningLight: '#FCBF49',
    info: '#8338EC',
    infoLight: '#B185F4',
    
    background: '#FFF8F3',
    backgroundSecondary: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSecondary: '#FFE5D9',
    
    text: '#2D1B00',
    textSecondary: '#5C3600',
    textTertiary: '#9A6A3A',
    textMuted: '#C9B5A0',
    textInverse: '#FFFFFF',
    
    border: '#FFDAB9',
    borderLight: '#FFE5D9',
    divider: '#FFCDB2',
    
    inactive: '#9A6A3A',
    disabled: '#E8D5C4',
    pressed: 'rgba(255, 107, 53, 0.1)',
    
    overlay: 'rgba(45, 27, 0, 0.4)',
    shadow: '#000000',
    
    live: '#D62828',
    accent: '#FB5607',
    teal: '#06FFA5',
    
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    cardSecondary: '#FFE5D9',
    cardHover: '#FFDAB9',
    
    secondary: '#8338EC',
    completed: '#52B788',
    upcoming: '#F77F00',
    backgroundTertiary: '#FFDAB9',
    gradientStart: '#FF6B35',
    gradientMiddle: '#F77F00',
    gradientEnd: '#FB5607',
    
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#FFDAB9',
  },
};

export const FOREST_THEME: Theme = {
  id: 'forest',
  name: 'Forest',
  isDark: false,
  colors: {
    primary: '#2D6A4F',
    primaryLight: '#52B788',
    primaryDark: '#1B4332',
    
    success: '#40916C',
    successLight: '#74C69D',
    error: '#D62828',
    errorLight: '#F48C8C',
    warning: '#E76F51',
    warningLight: '#F4A261',
    info: '#457B9D',
    infoLight: '#A8DADC',
    
    background: '#F1FAEE',
    backgroundSecondary: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSecondary: '#D8F3DC',
    
    text: '#081C15',
    textSecondary: '#1B4332',
    textTertiary: '#52B788',
    textMuted: '#95D5B2',
    textInverse: '#FFFFFF',
    
    border: '#B7E4C7',
    borderLight: '#D8F3DC',
    divider: '#95D5B2',
    
    inactive: '#52B788',
    disabled: '#D8F3DC',
    pressed: 'rgba(45, 106, 79, 0.1)',
    
    overlay: 'rgba(8, 28, 21, 0.4)',
    shadow: '#000000',
    
    live: '#D62828',
    accent: '#40916C',
    teal: '#52B788',
    
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    cardSecondary: '#D8F3DC',
    cardHover: '#B7E4C7',
    
    secondary: '#457B9D',
    completed: '#40916C',
    upcoming: '#E76F51',
    backgroundTertiary: '#B7E4C7',
    gradientStart: '#2D6A4F',
    gradientMiddle: '#40916C',
    gradientEnd: '#52B788',
    
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#B7E4C7',
  },
};

export const MIDNIGHT_THEME: Theme = {
  id: 'midnight',
  name: 'Midnight',
  isDark: true,
  colors: {
    primary: '#BB86FC',
    primaryLight: '#D1A8FF',
    primaryDark: '#9965F4',
    
    success: '#03DAC6',
    successLight: '#66FFF9',
    error: '#CF6679',
    errorLight: '#E69BA8',
    warning: '#FFA726',
    warningLight: '#FFCC80',
    info: '#3F51B5',
    infoLight: '#7986CB',
    
    background: '#121212',
    backgroundSecondary: '#1E1E1E',
    surface: '#1E1E1E',
    surfaceSecondary: '#2C2C2C',
    
    text: '#E1E1E1',
    textSecondary: '#B3B3B3',
    textTertiary: '#8E8E8E',
    textMuted: '#6E6E6E',
    textInverse: '#121212',
    
    border: '#3C3C3C',
    borderLight: '#2C2C2C',
    divider: '#4E4E4E',
    
    inactive: '#8E8E8E',
    disabled: '#3C3C3C',
    pressed: 'rgba(187, 134, 252, 0.2)',
    
    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: '#000000',
    
    live: '#CF6679',
    accent: '#03DAC6',
    teal: '#00BCD4',
    
    card: '#1E1E1E',
    cardElevated: '#2C2C2C',
    cardSecondary: '#2C2C2C',
    cardHover: '#3C3C3C',
    
    secondary: '#3F51B5',
    completed: '#03DAC6',
    upcoming: '#FFA726',
    backgroundTertiary: '#2C2C2C',
    gradientStart: '#BB86FC',
    gradientMiddle: '#3F51B5',
    gradientEnd: '#03DAC6',
    
    tabBarBackground: '#1E1E1E',
    tabBarBorder: '#3C3C3C',
  },
};

export const LAVENDER_THEME: Theme = {
  id: 'lavender',
  name: 'Lavender',
  isDark: false,
  colors: {
    primary: '#9D84B7',
    primaryLight: '#BDA5D5',
    primaryDark: '#7D6397',
    
    success: '#81C995',
    successLight: '#A8E6BD',
    error: '#D67B8A',
    errorLight: '#F2A8B5',
    warning: '#E8A87C',
    warningLight: '#F5C9A8',
    info: '#7BA3C7',
    infoLight: '#A8C9E8',
    
    background: '#F8F4F9',
    backgroundSecondary: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSecondary: '#EDE7F6',
    
    text: '#2C1B3D',
    textSecondary: '#4A3A5C',
    textTertiary: '#8B7BA8',
    textMuted: '#B8A8CE',
    textInverse: '#FFFFFF',
    
    border: '#D1C4E9',
    borderLight: '#E8DFF5',
    divider: '#C5B8D8',
    
    inactive: '#8B7BA8',
    disabled: '#E1D5F0',
    pressed: 'rgba(157, 132, 183, 0.1)',
    
    overlay: 'rgba(44, 27, 61, 0.4)',
    shadow: '#000000',
    
    live: '#D67B8A',
    accent: '#AB88C1',
    teal: '#7DCEA0',
    
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    cardSecondary: '#EDE7F6',
    cardHover: '#D1C4E9',
    
    secondary: '#7BA3C7',
    completed: '#81C995',
    upcoming: '#E8A87C',
    backgroundTertiary: '#D1C4E9',
    gradientStart: '#9D84B7',
    gradientMiddle: '#AB88C1',
    gradientEnd: '#BDA5D5',
    
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#D1C4E9',
  },
};

export const PRESET_THEMES: Theme[] = [
  DEFAULT_LIGHT_THEME,
  DEFAULT_DARK_THEME,
  OCEAN_THEME,
  SUNSET_THEME,
  FOREST_THEME,
  MIDNIGHT_THEME,
  LAVENDER_THEME,
];

export const getThemeById = (id: string): Theme | undefined => {
  return PRESET_THEMES.find(theme => theme.id === id);
};
