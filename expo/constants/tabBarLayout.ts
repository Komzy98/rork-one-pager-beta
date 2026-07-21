/** Matches floating tab bar in app/(tabs)/_layout.tsx */
export const FLOATING_TAB_BAR_HEIGHT = 62;
export const FLOATING_TAB_BAR_BOTTOM_GAP = 16;

/** Scroll/content padding so lists clear the floating tab bar + home indicator. */
export function floatingTabBarScrollPadding(bottomSafeInset: number): number {
  return FLOATING_TAB_BAR_BOTTOM_GAP + FLOATING_TAB_BAR_HEIGHT + 20 + bottomSafeInset;
}
