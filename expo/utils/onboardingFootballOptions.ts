import { COMPETITIONS_DATA, INTERNATIONAL_COMPETITIONS } from '@/constants/competitions';
import {
  countOptionalLeagueIds,
  ensureWorldCupFamilyLeagueIds,
  isWorldCupFamilyLeagueId,
  isWorldCupLeagueId,
  normalizeFavoriteLeagueIds,
  PROFILE_OPTIONAL_LEAGUE_LIMIT,
  WORLD_CUP_FAMILY_LEAGUE_IDS,
} from '@/utils/footballLeagueFamily';

export type OnboardingLeagueOption = { id: number; name: string; country: string };

export const ONBOARDING_MAX_LEAGUES = PROFILE_OPTIONAL_LEAGUE_LIMIT;

export {
  countOptionalLeagueIds,
  ensureWorldCupFamilyLeagueIds,
  isWorldCupFamilyLeagueId,
  isWorldCupLeagueId,
  WORLD_CUP_FAMILY_LEAGUE_IDS,
};

const PRIORITY_LEAGUE_IDS = new Set([39, 140, 78, 135, 61, 2, 3, 848, 531, 94, 88]);

const INTL_PRIORITY_ORDER: number[] = [
  1,
  15, 16, 17, 18, 19, 20,
  4, 960, 5,
  9, 6, 7, 21, 15000,
  2, 3, 848, 13, 14, 10,
];

/** Pre-select World Cup + qualifier family for new football users. */
export const DEFAULT_ONBOARDING_LEAGUE_IDS: readonly number[] = WORLD_CUP_FAMILY_LEAGUE_IDS;

export const apiLogoUri = (id: number) =>
  `https://media.api-sports.io/football/leagues/${id}.png`;

export function buildInternationalLeagueOptions(): OnboardingLeagueOption[] {
  const opts = INTERNATIONAL_COMPETITIONS.filter((c) => c.type === 'international').map((c) => ({
    id: c.id,
    name: c.name,
    country: c.country,
  }));
  return opts.sort((a, b) => {
    const ai = INTL_PRIORITY_ORDER.indexOf(a.id);
    const bi = INTL_PRIORITY_ORDER.indexOf(b.id);
    const an = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bn = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    if (an !== bn) return an - bn;
    return a.name.localeCompare(b.name);
  });
}

export function buildDomesticLeagueOptions(): OnboardingLeagueOption[] {
  const map = new Map<number, OnboardingLeagueOption>();
  for (const continent of COMPETITIONS_DATA) {
    for (const country of continent.countries) {
      for (const c of country.competitions) {
        if (c.type !== 'league') continue;
        if ((c.tier ?? 9) > 1) continue;
        if (!map.has(c.id)) {
          map.set(c.id, { id: c.id, name: c.name, country: c.country });
        }
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const ap = PRIORITY_LEAGUE_IDS.has(a.id) ? 1 : 0;
    const bp = PRIORITY_LEAGUE_IDS.has(b.id) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return a.name.localeCompare(b.name);
  });
}

export function initialOnboardingLeagueIds(existing: readonly number[] | undefined): number[] {
  if (existing && existing.length > 0) return normalizeOnboardingLeagueIds(existing);
  return [...DEFAULT_ONBOARDING_LEAGUE_IDS];
}

export function normalizeOnboardingLeagueIds(leagueIds: readonly number[]): number[] {
  return normalizeFavoriteLeagueIds(leagueIds);
}

export function getWorldCupFamilyLeagueOptions(): OnboardingLeagueOption[] {
  return buildInternationalLeagueOptions().filter((l) => isWorldCupFamilyLeagueId(l.id));
}
