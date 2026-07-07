/** Max leagues the user explicitly picks (World Cup family is always on and not counted). */
export const PROFILE_OPTIONAL_LEAGUE_LIMIT = 8;

export const FIFA_WORLD_CUP_LEAGUE_ID = 1;

/** World Cup + confederation qualifiers — selecting WC should include the full tournament family. */
export const WORLD_CUP_FAMILY_LEAGUE_IDS: readonly number[] = [1, 15, 16, 17, 18, 19, 20];

const WORLD_CUP_FAMILY_SET = new Set<number>(WORLD_CUP_FAMILY_LEAGUE_IDS);

export function isWorldCupLeagueId(id: number): boolean {
  return id === FIFA_WORLD_CUP_LEAGUE_ID;
}

export function isWorldCupFamilyLeagueId(id: number): boolean {
  return WORLD_CUP_FAMILY_SET.has(id);
}

export function ensureWorldCupFamilyLeagueIds(leagueIds: readonly number[]): number[] {
  return Array.from(new Set([...WORLD_CUP_FAMILY_LEAGUE_IDS, ...leagueIds]));
}

export function countOptionalLeagueIds(leagueIds: readonly number[]): number {
  return leagueIds.filter((id) => !isWorldCupFamilyLeagueId(id)).length;
}

/** Profile + onboarding: WC family always included; optional leagues capped. */
export function normalizeFavoriteLeagueIds(leagueIds: readonly number[]): number[] {
  const withWorldCup = ensureWorldCupFamilyLeagueIds(leagueIds);
  const optional = withWorldCup.filter((id) => !isWorldCupFamilyLeagueId(id));
  const cappedOptional = optional.slice(0, PROFILE_OPTIONAL_LEAGUE_LIMIT);
  return [...WORLD_CUP_FAMILY_LEAGUE_IDS, ...cappedOptional];
}

export function canAddOptionalLeagueId(
  leagueIds: readonly number[],
  leagueId: number,
): boolean {
  if (isWorldCupFamilyLeagueId(leagueId)) return true;
  if (leagueIds.includes(leagueId)) return false;
  return countOptionalLeagueIds(leagueIds) < PROFILE_OPTIONAL_LEAGUE_LIMIT;
}
