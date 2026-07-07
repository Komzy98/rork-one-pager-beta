import type { ImageStyle, ViewStyle } from 'react-native';

/**
 * Secondary tab rows used to overlap the hero alone. Once the **sport strip** straddles the hero,
 * pulling these rows up with negative margin covers the sport strip — use
 * `HERO_SECONDARY_GAP_BELOW_SPORT_STRIP` instead for Football / UFC / NBA / F1.
 */
export const HERO_SECONDARY_TAB_OVERLAP = 28;

/** UFC Upcoming/Results segment row (compact; spacing vs sport strip). */
export const HERO_SECONDARY_TAB_OVERLAP_UFC = 35;

/** Space between sport strip (Football/UFC/…) and Live/Upcoming / segment / F1 bar (avoids collision). */
export const HERO_SECONDARY_GAP_BELOW_SPORT_STRIP = 12;

/** Approximate height of the glass sport-mode strip (padding + labels). */
export const HERO_SPORT_STRIP_APPROX_HEIGHT_PX = 48;

/**
 * Top margin for the control row under the hero (Live/Upcoming, Schedule/Drivers, etc.).
 * Sits below the sport strip (strip is no longer pulled up over featured cards).
 */
export function getHeroSecondaryRowMarginTop(): number {
  return HERO_SECONDARY_GAP_BELOW_SPORT_STRIP;
}

export type SportsHeroStripSport = 'football' | 'ufc' | 'f1' | 'nba';

/** Slot style for the sport-mode strip below the hero — same offset on Football / UFC / F1 / NBA. */
export function getHeroSportStripSlotStyle(_sport: SportsHeroStripSport): ViewStyle {
  return {
    marginTop: HERO_SPORT_STRIP_GAP_BELOW_FEATURED_PX,
    marginBottom: 4,
    zIndex: 20,
    elevation: 12,
  };
}

/** Secondary row (Live/Upcoming, etc.) spacing under the sport strip. */
export function getHeroSecondaryRowStyle(
  horizontalPad: number,
  sport: SportsHeroStripSport,
): ViewStyle {
  const marginTop =
    sport === 'football' ? 8 : sport === 'ufc' ? 10 : HERO_SECONDARY_GAP_BELOW_SPORT_STRIP;

  return {
    marginTop,
    marginBottom: sport === 'football' ? 6 : 12,
    paddingHorizontal: horizontalPad,
    zIndex: 12,
    elevation: 6,
  };
}

/** Bottom inset inside hero overlays so featured cards clear the sport strip. */
export const HERO_FEATURED_CARD_BOTTOM_INSET_PX = 8;

/**
 * @deprecated Strip no longer overlaps the hero — use `HERO_SPORT_STRIP_GAP_BELOW_FEATURED_PX`.
 * Kept for any legacy imports; value is 0.
 */
export const HERO_SPORT_STRIP_OVERLAP_HERO_PX = 0;

/** Gap between the hero bottom and the sport-mode strip (all tabs). */
export const HERO_SPORT_STRIP_GAP_BELOW_FEATURED_PX = 4;

/** Lifts My Clubs + featured match block slightly above the hero bottom (Football). */
export const FOOTBALL_HERO_BOTTOM_STACK_LIFT_PX = 14;

/** Shorter hero when user has favourite clubs — more room for fixtures. */
export const COMPACT_FOOTBALL_HERO_MIN_HEIGHT_PX = 320;

/** Tall sports heroes (Football / UFC / F1 / NBA) on Plus / Pro Max widths. */
export const SPORTS_TALL_HERO_MIN_HEIGHT_PX = 470;

/** Smallest hero slot height on compact iPhones (SE, mini). */
export const SPORTS_TALL_HERO_MIN_HEIGHT_FLOOR_PX = 360;

/**
 * Hero slot height for ~1:1 PNG art. On phones narrower than `SPORTS_TALL_HERO_MIN_HEIGHT_PX`,
 * cap height to viewport width so `resizeMode: 'cover'` does not clip baked-in left/right titles.
 */
export function getSportsTallHeroMinHeight(windowWidth: number, compact = false): number {
  const cap = compact ? COMPACT_FOOTBALL_HERO_MIN_HEIGHT_PX : SPORTS_TALL_HERO_MIN_HEIGHT_PX;
  if (windowWidth >= cap) return cap;
  return Math.max(SPORTS_TALL_HERO_MIN_HEIGHT_FLOOR_PX, Math.round(windowWidth));
}

/** Bottom crop for cover heroes — scales with actual slot height. */
export function getSportsHeroBottomCropPx(heroMinHeightPx: number, ratio = 0.04): number {
  return Math.round(heroMinHeightPx * ratio);
}

/**
 * Horizontal inset for hero overlays / sport strip on sports tabs.
 * Tighter on small iPhones so glass strips and labels are not clipped by `overflow: hidden` heroes.
 */
export function getSportsHeroEdgePad(
  windowWidth: number,
  insetLeft: number,
  insetRight: number,
): number {
  const base =
    windowWidth <= 320
      ? 10
      : windowWidth <= 360
        ? 11
        : windowWidth <= 375
          ? 12
          : windowWidth <= 400
            ? 14
            : 20;
  return Math.max(base, Math.ceil(insetLeft), Math.ceil(insetRight));
}

/**
 * True when a tall hero slot would side-crop square artwork under `cover`.
 * Prefer lowering slot height via `getSportsTallHeroMinHeight` first; this is the fallback.
 */
export function shouldContainSportsHeroArt(windowWidth: number, heroMinHeightPx: number): boolean {
  return windowWidth / heroMinHeightPx < 0.98;
}

/**
 * Zoom-out for `resizeMode: 'cover'` when the slot is still slightly taller than wide.
 */
export function getSportsHeroImageScale(windowWidth: number, heroMinHeightPx: number): number {
  const aspect = windowWidth / heroMinHeightPx;
  if (aspect >= 0.98) return 1;
  if (aspect >= 0.92) return 0.96;
  if (windowWidth <= 320) return 0.88;
  if (windowWidth <= 350) return 0.9;
  if (windowWidth <= 375) return 0.92;
  return 0.94;
}

/** Full-bleed `ImageBackground` `imageStyle` — cover, or contain when the slot would clip sides. */
export function getSportsHeroImageStyle(
  windowWidth: number,
  bottomCropPx = 0,
  heroMinHeightPx = SPORTS_TALL_HERO_MIN_HEIGHT_PX,
): ImageStyle {
  if (shouldContainSportsHeroArt(windowWidth, heroMinHeightPx)) {
    const transform: NonNullable<ImageStyle['transform']> =
      bottomCropPx > 0 ? [{ translateY: -bottomCropPx }] : [];
    return {
      resizeMode: 'contain',
      width: '100%',
      height: '100%',
      ...(transform.length ? { transform } : {}),
    } as ImageStyle;
  }

  const scale = getSportsHeroImageScale(windowWidth, heroMinHeightPx);
  const transform: NonNullable<ImageStyle['transform']> = [];
  if (bottomCropPx > 0) transform.push({ translateY: -bottomCropPx });
  if (scale < 1) transform.push({ scale });

  if (!transform.length) {
    return { resizeMode: 'cover' };
  }

  return {
    resizeMode: 'cover',
    transform,
  } as ImageStyle;
}
