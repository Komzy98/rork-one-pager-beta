export const KITCHEN_PALETTE = {
  accent: '#C45C26',
  accentSoft: '#FFF1EA',
  accentDark: '#9A4520',
  gold: '#D4A017',
  success: '#2E9A3F',
  bgLight: '#FAF7F4',
  bgDark: '#141110',
  cardLight: '#FFFFFF',
  cardDark: '#221C19',
  borderLight: '#EDE4DE',
  borderDark: '#3A322E',
  textLight: '#1C1410',
  textDark: '#F7F0EB',
  mutedLight: '#8A7B72',
  mutedDark: '#A89890',
} as const;

export function kitchenColors(isDark: boolean) {
  return {
    accent: KITCHEN_PALETTE.accent,
    accentSoft: isDark ? '#2A221C' : KITCHEN_PALETTE.accentSoft,
    bg: isDark ? KITCHEN_PALETTE.bgDark : KITCHEN_PALETTE.bgLight,
    card: isDark ? KITCHEN_PALETTE.cardDark : KITCHEN_PALETTE.cardLight,
    border: isDark ? KITCHEN_PALETTE.borderDark : KITCHEN_PALETTE.borderLight,
    text: isDark ? KITCHEN_PALETTE.textDark : KITCHEN_PALETTE.textLight,
    muted: isDark ? KITCHEN_PALETTE.mutedDark : KITCHEN_PALETTE.mutedLight,
  };
}
