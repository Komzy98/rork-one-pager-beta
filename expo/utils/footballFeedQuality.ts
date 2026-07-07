/** API-Football league id — Club Friendlies (pre-season / low signal). */
export const CLUB_FRIENDLIES_LEAGUE_ID = 667;

/** API-Football league id — International Friendlies. */
export const INTERNATIONAL_FRIENDLIES_LEAGUE_ID = 10;

export function isFriendlyMatch(match: { leagueId?: number; league?: string }): boolean {
  if (
    match.leagueId === CLUB_FRIENDLIES_LEAGUE_ID ||
    match.leagueId === INTERNATIONAL_FRIENDLIES_LEAGUE_ID
  ) {
    return true;
  }
  const label = (match.league ?? '').toLowerCase();
  return label.includes('friendl');
}

export function isClubFriendlyMatch(match: { leagueId?: number; league?: string }): boolean {
  if (match.leagueId === CLUB_FRIENDLIES_LEAGUE_ID) return true;
  return (match.league ?? '').toLowerCase().includes('club friend');
}

export function isFollowedTeamInMatch(
  match: { homeTeamId?: number; awayTeamId?: number },
  favoriteTeamIds: ReadonlySet<number>,
): boolean {
  if (favoriteTeamIds.size === 0) return false;
  if (typeof match.homeTeamId === 'number' && favoriteTeamIds.has(match.homeTeamId)) return true;
  if (typeof match.awayTeamId === 'number' && favoriteTeamIds.has(match.awayTeamId)) return true;
  return false;
}

/**
 * Friendlies are hidden unless the user follows a club or national team in the fixture.
 * Mirrors standings picker behaviour (friendlies excluded from league tables).
 */
export function shouldShowFriendlyMatch(
  match: { leagueId?: number; league?: string; homeTeamId?: number; awayTeamId?: number },
  favoriteTeamIds: ReadonlySet<number>,
  nationalTeamIds?: ReadonlySet<number>,
): boolean {
  if (!isFriendlyMatch(match)) return true;
  if (isFollowedTeamInMatch(match, favoriteTeamIds)) return true;
  if (nationalTeamIds && nationalTeamIds.size > 0) {
    if (typeof match.homeTeamId === 'number' && nationalTeamIds.has(match.homeTeamId)) return true;
    if (typeof match.awayTeamId === 'number' && nationalTeamIds.has(match.awayTeamId)) return true;
  }
  return false;
}

/** Subtracted from personalization score — keeps friendlies below major live fixtures. */
export function getCompetitionQualityPenalty(match: { leagueId?: number; league?: string }): number {
  if (isClubFriendlyMatch(match)) return 70;
  if (isFriendlyMatch(match)) return 50;
  const label = (match.league ?? '').toLowerCase();
  if (/youth|u19|u21|u23|reserve|amateur|tercera|fourth division/i.test(label)) return 45;
  return 0;
}
