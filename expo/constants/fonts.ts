/**
 * Typography families from https://onepagerapp.co.uk/
 * — DM Sans for display/headlines, Inter for UI body copy.
 */
import type { TextStyle } from 'react-native';

export const FONTS = {
  /** Inter — default UI/body */
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',

  /** DM Sans — marketing headlines (matches website hero) */
  display: 'DMSans_400Regular',
  displayMedium: 'DMSans_500Medium',
  displaySemiBold: 'DMSans_600SemiBold',
  displayBold: 'DMSans_700Bold',
} as const;

export type FontWeightToken = '400' | '500' | '600' | '700';

export function interFont(weight: FontWeightToken = '400'): string {
  switch (weight) {
    case '500':
      return FONTS.bodyMedium;
    case '600':
      return FONTS.bodySemiBold;
    case '700':
      return FONTS.bodyBold;
    default:
      return FONTS.body;
  }
}

export function displayFont(weight: FontWeightToken = '700'): string {
  switch (weight) {
    case '400':
      return FONTS.display;
    case '500':
      return FONTS.displayMedium;
    case '600':
      return FONTS.displaySemiBold;
    default:
      return FONTS.displayBold;
  }
}

/** Maps style fontWeight to the correct Inter or DM Sans file (required on React Native). */
export function appFont(
  weight: FontWeightToken | '800' | '900' = '400',
  options?: { display?: boolean },
): Pick<TextStyle, 'fontFamily'> {
  const normalized: FontWeightToken =
    weight === '800' || weight === '900' ? '700' : weight;
  return {
    fontFamily: options?.display ? displayFont(normalized) : interFont(normalized),
  };
}
