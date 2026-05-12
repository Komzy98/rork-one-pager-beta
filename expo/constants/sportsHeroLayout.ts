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

/**
 * Sport strip is rendered *below* the hero `ImageBackground` / gradient and pulled up with
 * negative margin so it sits tight on the stadium art (larger = less gap above the strip).
 */
export const HERO_SPORT_STRIP_OVERLAP_HERO_PX = 72;

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
 * Zoom-out for `resizeMode: 'cover'` hero art on narrow screens — otherwise wide PNGs lose left/right edges.
 */
export function getSportsHeroImageScale(windowWidth: number): number {
  if (windowWidth <= 340) return 0.82;
  if (windowWidth <= 375) return 0.88;
  if (windowWidth <= 390) return 0.93;
  return 1;
}
