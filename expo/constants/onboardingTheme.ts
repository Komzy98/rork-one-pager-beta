/**
 * Light onboarding chrome aligned with `(auth)/signup` — white surfaces & iOS-style neutrals.
 * Premium layer: cool ivory/slate gradient, hairline borders, soft elevation (UI/UX Pro Max: hierarchy + depth).
 */
import { Platform, StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { COLORS } from "@/constants/colors";
import { displayFont, interFont } from "@/constants/fonts";

export const ONBOARDING = {
  bg: COLORS.background,
  surface: COLORS.surface,
  surfaceMuted: COLORS.surfaceSecondary,
  text: COLORS.text,
  textSecondary: COLORS.textSecondary,
  textMuted: COLORS.textLight,
  border: COLORS.border,
  primary: COLORS.primary,
  primaryOnWhite: COLORS.card,
  chipBg: COLORS.surfaceSecondary,
  headerBtnBg: COLORS.surfaceSecondary,
  shadow: COLORS.shadow,
} as const;

/** Ambient screen gradient — soft neutral wash. */
export const ONBOARDING_PREMIUM = {
  gradientColors: ['#F7F8FC', '#EEF2FF', '#E8EDFF'] as const,
  gradientLocations: [0, 0.52, 1] as const,
  gradientStart: { x: 0.12, y: 0 },
  gradientEnd: { x: 0.88, y: 1 },
  /** Hairline “glass edge” on elevated surfaces */
  hairlineBorder: "rgba(15, 23, 42, 0.07)",
  hairlineStrong: "rgba(15, 23, 42, 0.12)",
  /** Kicker / overline label */
  kicker: {
    fontFamily: interFont('600'),
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 3.2,
    color: COLORS.textMuted,
    textTransform: "uppercase" as const,
  },
  /** Floating cards */
  cardElevated: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.06)",
    ...Platform.select<ViewStyle>({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.07,
        shadowRadius: 24,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  /** Primary CTA — single focal action per screen */
  primaryButtonShadow: Platform.select<ViewStyle>({
    ios: {
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.28,
      shadowRadius: 20,
    },
    android: { elevation: 8 },
    default: {},
  }),
  /** Hero display title */
  displayLarge: {
    fontFamily: displayFont('700'),
    fontSize: 32,
    fontWeight: "800" as const,
    letterSpacing: -0.8,
    color: COLORS.text,
  } satisfies TextStyle,
  titleMedium: {
    fontFamily: interFont('500'),
    fontSize: 13,
    fontWeight: "500" as const,
    letterSpacing: 0.15,
    color: COLORS.textSecondary,
    lineHeight: 20,
  } satisfies TextStyle,
} as const;
