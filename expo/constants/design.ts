import { Platform, TextStyle, ViewStyle, StyleSheet } from 'react-native';
import { COLORS } from './colors';
import { displayFont, interFont } from './fonts';

// ============================================
// SPACING SCALE
// ============================================
export const SPACING = {
  none: 0 as const,
  xs: 4 as const,
  s: 8 as const,
  sm: 12 as const,
  md: 16 as const,
  lg: 20 as const,
  xl: 24 as const,
  xxl: 32 as const,
  xxxl: 48 as const,
};

// ============================================
// BORDER RADIUS
// ============================================
export const BORDER_RADIUS = {
  none: 0 as const,
  xs: 4 as const,
  sm: 8 as const,
  md: 12 as const,
  lg: 16 as const,
  xl: 20 as const,
  xxl: 24 as const,
  full: 9999 as const,
};

// ============================================
// TYPOGRAPHY SCALE
// ============================================
export const TYPOGRAPHY: Record<
  'largeTitle' | 'hero' | 'title' | 'title2' | 'title3' | 'heading' | 'subheading' | 'body' | 'bodySm' | 'caption' | 'caption2' | 'overline',
  TextStyle
> = {
  largeTitle: { fontFamily: displayFont('700'), fontSize: 34, fontWeight: '700' as const, lineHeight: 41, letterSpacing: -0.7 },
  hero: { fontFamily: displayFont('700'), fontSize: 32, fontWeight: '700' as const, lineHeight: 40, letterSpacing: -0.5 },
  title: { fontFamily: displayFont('700'), fontSize: 28, fontWeight: '700' as const, lineHeight: 34, letterSpacing: -0.4 },
  title2: { fontFamily: displayFont('700'), fontSize: 22, fontWeight: '700' as const, lineHeight: 28, letterSpacing: -0.3 },
  title3: { fontFamily: displayFont('600'), fontSize: 20, fontWeight: '600' as const, lineHeight: 25, letterSpacing: -0.2 },
  heading: { fontFamily: interFont('600'), fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
  subheading: { fontFamily: interFont('600'), fontSize: 15, fontWeight: '600' as const, lineHeight: 20 },
  body: { fontFamily: interFont('400'), fontSize: 17, fontWeight: '400' as const, lineHeight: 22 },
  bodySm: { fontFamily: interFont('400'), fontSize: 15, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontFamily: interFont('400'), fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  caption2: { fontFamily: interFont('400'), fontSize: 11, fontWeight: '400' as const, lineHeight: 13 },
  overline: { fontFamily: interFont('600'), fontSize: 11, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' as const },
};

// ============================================
// SHADOW SYSTEM
// ============================================
export const cardShadow = (level: 1 | 2 | 3 | 4 = 2): ViewStyle => {
  const shadows = {
    1: {
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: Platform.OS === 'ios' ? 0.06 : 0.1,
      shadowRadius: 3,
      elevation: 1,
    },
    2: {
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0.12,
      shadowRadius: 6,
      elevation: 2,
    },
    3: {
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    4: {
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: Platform.OS === 'ios' ? 0.15 : 0.2,
      shadowRadius: 24,
      elevation: 8,
    },
  };
  return shadows[level];
};

// ============================================
// CONTAINER STYLES
// ============================================
export const containerStyles = {
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  } as ViewStyle,
  screenPadded: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
  } as ViewStyle,
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.xxxl,
  } as ViewStyle,
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
};

// ============================================
// CARD STYLES
// ============================================
export const cardStyle = (level: 1 | 2 | 3 = 2): ViewStyle => ({
  backgroundColor: COLORS.card,
  borderRadius: BORDER_RADIUS.lg,
  padding: SPACING.md,
  ...cardShadow(level),
});

export const cardStyles = {
  base: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...cardShadow(1),
  } as ViewStyle,
  elevated: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...cardShadow(2),
  } as ViewStyle,
  outlined: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  } as ViewStyle,
  filled: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  } as ViewStyle,
  interactive: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...cardShadow(1),
  } as ViewStyle,
};

// ============================================
// BUTTON STYLES
// ============================================
export const buttonStyles = {
  primary: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  primaryLarge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  secondary: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  outline: {
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  ghost: {
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  icon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  iconSmall: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  danger: {
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
};

export const buttonTextStyles = {
  primary: {
    fontFamily: interFont('600'),
    color: COLORS.textInverse,
    fontSize: 17,
    fontWeight: '600' as const,
  } as TextStyle,
  secondary: {
    fontFamily: interFont('600'),
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '600' as const,
  } as TextStyle,
  outline: {
    fontFamily: interFont('600'),
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '600' as const,
  } as TextStyle,
  ghost: {
    fontFamily: interFont('500'),
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '500' as const,
  } as TextStyle,
  danger: {
    fontFamily: interFont('600'),
    color: COLORS.textInverse,
    fontSize: 17,
    fontWeight: '600' as const,
  } as TextStyle,
};

// ============================================
// INPUT STYLES
// ============================================
export const inputStyles = {
  base: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 17,
    color: COLORS.text,
    minHeight: 48,
  } as ViewStyle & TextStyle,
  outlined: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 17,
    color: COLORS.text,
    minHeight: 48,
  } as ViewStyle & TextStyle,
  focused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  } as ViewStyle,
  error: {
    borderColor: COLORS.error,
    borderWidth: 1,
  } as ViewStyle,
};

// Backwards compatibility
export const inputStyle: ViewStyle & { fontSize?: number; color?: string } = inputStyles.outlined as ViewStyle & { fontSize?: number; color?: string };

// ============================================
// LIST STYLES
// ============================================
export const listStyles = {
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.card,
  } as ViewStyle,
  rowWithDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  } as ViewStyle,
  section: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginVertical: SPACING.s,
  } as ViewStyle,
  sectionHeader: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.s,
    backgroundColor: COLORS.background,
  } as ViewStyle,
};

// ============================================
// BADGE STYLES
// ============================================
export const badgeStyles = {
  base: {
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
  } as ViewStyle,
  primary: {
    backgroundColor: COLORS.primary + '15',
  } as ViewStyle,
  success: {
    backgroundColor: COLORS.success + '15',
  } as ViewStyle,
  warning: {
    backgroundColor: COLORS.warning + '15',
  } as ViewStyle,
  error: {
    backgroundColor: COLORS.error + '15',
  } as ViewStyle,
  neutral: {
    backgroundColor: COLORS.surfaceSecondary,
  } as ViewStyle,
};

export const badgeTextStyles = {
  primary: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600' as const,
  } as TextStyle,
  success: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '600' as const,
  } as TextStyle,
  warning: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '600' as const,
  } as TextStyle,
  error: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '600' as const,
  } as TextStyle,
  neutral: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  } as TextStyle,
};

// ============================================
// CHIP STYLES
// ============================================
export const chipStyles = {
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceSecondary,
  } as ViewStyle,
  selected: {
    backgroundColor: COLORS.primary,
  } as ViewStyle,
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  } as ViewStyle,
  outlinedSelected: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  } as ViewStyle,
};

// ============================================
// TAB STYLES
// ============================================
export const tabStyles = {
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xs,
  } as ViewStyle,
  tab: {
    flex: 1,
    paddingVertical: SPACING.s,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  tabActive: {
    backgroundColor: COLORS.card,
    ...cardShadow(1),
  } as ViewStyle,
  tabText: {
    fontFamily: interFont('500'),
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.textTertiary,
  } as TextStyle,
  tabTextActive: {
    fontFamily: interFont('600'),
    color: COLORS.text,
    fontWeight: '600' as const,
  } as TextStyle,
};

// ============================================
// HEADER STYLES
// ============================================
export const headerStyles = {
  container: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.s,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
  } as ViewStyle,
  title: {
    ...TYPOGRAPHY.largeTitle,
    color: COLORS.text,
  } as TextStyle,
  subtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  } as TextStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
};

// ============================================
// AVATAR STYLES
// ============================================
export const avatarStyles = {
  small: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  medium: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  large: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
};

// ============================================
// DIVIDER
// ============================================
export const dividerStyle: ViewStyle = {
  height: StyleSheet.hairlineWidth,
  backgroundColor: COLORS.divider,
};

// ============================================
// EMPTY STATE
// ============================================
export const emptyStateStyles = {
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxxl,
  } as ViewStyle,
  icon: {
    marginBottom: SPACING.md,
  } as ViewStyle,
  title: {
    ...TYPOGRAPHY.title3,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.s,
  } as TextStyle,
  message: {
    ...TYPOGRAPHY.body,
    color: COLORS.textTertiary,
    textAlign: 'center',
  } as TextStyle,
};

// ============================================
// UTILITY STYLES
// ============================================
export const utilityStyles = {
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  flex1: {
    flex: 1,
  } as ViewStyle,
  gap4: { gap: 4 } as ViewStyle,
  gap8: { gap: 8 } as ViewStyle,
  gap12: { gap: 12 } as ViewStyle,
  gap16: { gap: 16 } as ViewStyle,
};

// Backwards compatibility
export const gradientBackground: ViewStyle = {
  backgroundColor: COLORS.background,
};
