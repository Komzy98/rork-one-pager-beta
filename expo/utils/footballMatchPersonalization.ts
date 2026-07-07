import { FIFA_WORLD_CUP_LEAGUE_ID } from '@/utils/footballLeagueFamily';
import { getCompetitionQualityPenalty } from '@/utils/footballFeedQuality';
import { isWorldCupMatch } from '@/utils/footballQueryContext';
import { teamNameMatchesNationalInterest } from '@/utils/nationalTeamNameMatch';

export type FootballPersonalizationMatch = {
  id?: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: number;
  awayTeamId?: number;
  homeScore?: number | null;
  awayScore?: number | null;
  status: 'Live' | 'Upcoming' | 'Completed';
  league: string;
  leagueId: number;
  leagueCountry?: string;
  date: string;
  time?: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
};

export type FootballPersonalizationContext = {
  favoriteClubApiIds: ReadonlySet<number>;
  nationalTeamApiIds: readonly number[];
  countryInterestNamesLower: readonly string[];
  selectedProfileLeagueIds: ReadonlySet<number>;
  manualFilterLeagueIds: readonly number[];
  nowMs?: number;
};

export function isMajorLeagueName(name: string): boolean {
  return /premier league|la liga|bundesliga|serie a|ligue 1|champions league|europa league|conference league|uefa super|world cup/i.test(
    name,
  );
}

export function hoursUntilMatchKickoff(
  match: Pick<FootballPersonalizationMatch, 'date'>,
  nowMs = Date.now(),
): number {
  return (new Date(match.date).getTime() - nowMs) / 3600000;
}

export function isFavoriteClubOrNationalMatch(
  match: FootballPersonalizationMatch,
  favoriteClubApiIds: ReadonlySet<number>,
  nationalTeamApiIds: readonly number[],
): boolean {
  if (
    (typeof match.homeTeamId === 'number' && favoriteClubApiIds.has(match.homeTeamId)) ||
    (typeof match.awayTeamId === 'number' && favoriteClubApiIds.has(match.awayTeamId))
  ) {
    return true;
  }
  if (nationalTeamApiIds.length === 0) return false;
  if (typeof match.homeTeamId === 'number' && nationalTeamApiIds.includes(match.homeTeamId)) {
    return true;
  }
  if (typeof match.awayTeamId === 'number' && nationalTeamApiIds.includes(match.awayTeamId)) {
    return true;
  }
  return false;
}

/**
 * True when a fixture involves a followed national team / country interest.
 * Uses word-boundary name matching — blocks club false positives (New England ≠ England).
 */
export function matchInvolvesNationalInterest(
  match: FootballPersonalizationMatch,
  nationalTeamApiIds: readonly number[],
  countryInterestNamesLower: readonly string[],
): boolean {
  if (nationalTeamApiIds.length === 0 && countryInterestNamesLower.length === 0) {
    return false;
  }

  if (
    (typeof match.homeTeamId === 'number' && nationalTeamApiIds.includes(match.homeTeamId)) ||
    (typeof match.awayTeamId === 'number' && nationalTeamApiIds.includes(match.awayTeamId))
  ) {
    return true;
  }

  const home = match.homeTeam?.toLowerCase().trim() ?? '';
  const away = match.awayTeam?.toLowerCase().trim() ?? '';
  if (home || away) {
    for (const country of countryInterestNamesLower) {
      if (!country) continue;
      if (
        teamNameMatchesNationalInterest(home, country) ||
        teamNameMatchesNationalInterest(away, country)
      ) {
        return true;
      }
    }
  }

  const leagueCountry = match.leagueCountry?.trim().toLowerCase() ?? '';
  if (!leagueCountry) return false;
  return countryInterestNamesLower.some((country) => {
    if (!country) return false;
    return (
      leagueCountry === country ||
      teamNameMatchesNationalInterest(leagueCountry, country)
    );
  });
}

export function scoreMatchForYou(
  match: FootballPersonalizationMatch,
  ctx: FootballPersonalizationContext,
): number {
  const nowMs = ctx.nowMs ?? Date.now();
  let score = 0;

  if (isFavoriteClubOrNationalMatch(match, ctx.favoriteClubApiIds, ctx.nationalTeamApiIds)) {
    score += 100;
  }

  const national = matchInvolvesNationalInterest(
    match,
    ctx.nationalTeamApiIds,
    ctx.countryInterestNamesLower,
  );
  if (match.leagueId === FIFA_WORLD_CUP_LEAGUE_ID && national) score += 120;
  else if (national) score += 60;

  if (isMajorLeagueName(match.league)) score += 40;
  if (match.status === 'Live') score += 80;

  const hours = hoursUntilMatchKickoff(match, nowMs);
  if (hours >= 0 && hours < 2) score += 45;
  else if (hours >= 0 && hours < 6) score += 30;
  else if (hours >= 0 && hours < 24) score += 15;

  if (national) score += 20;
  if (ctx.selectedProfileLeagueIds.has(match.leagueId)) score += 25;
  if (ctx.manualFilterLeagueIds.includes(match.leagueId)) score += 20;

  score -= getCompetitionQualityPenalty(match);

  return score;
}

export function sortMatchesBySmartForYou<T extends FootballPersonalizationMatch>(
  matches: readonly T[],
  ctx: FootballPersonalizationContext,
): T[] {
  return [...matches].sort(
    (a, b) => scoreMatchForYou(b, ctx) - scoreMatchForYou(a, ctx),
  );
}

export function pinFavoriteMatches<T extends FootballPersonalizationMatch>(
  matches: readonly T[],
  favoriteClubApiIds: ReadonlySet<number>,
  nationalTeamApiIds: readonly number[],
): T[] {
  const pinned: T[] = [];
  const rest: T[] = [];
  matches.forEach((m) => {
    if (isFavoriteClubOrNationalMatch(m, favoriteClubApiIds, nationalTeamApiIds)) {
      pinned.push(m);
    } else {
      rest.push(m);
    }
  });
  return [...pinned, ...rest];
}

export type FootballSortMode = 'kickoff' | 'competition' | 'smart';

export function sortMatchesForDisplay<T extends FootballPersonalizationMatch>(
  matches: readonly T[],
  sortMode: FootballSortMode,
  ctx: FootballPersonalizationContext,
): T[] {
  const worldCup = matches
    .filter(isWorldCupMatch)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const rest = matches.filter((m) => !isWorldCupMatch(m));

  let sortedRest: T[];
  if (sortMode === 'smart') {
    sortedRest = sortMatchesBySmartForYou(rest, ctx);
  } else if (sortMode === 'competition') {
    sortedRest = [...rest];
    sortedRest.sort((a, b) => {
      const c = a.league.localeCompare(b.league);
      if (c !== 0) return c;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  } else {
    sortedRest = [...rest].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    sortedRest = pinFavoriteMatches(sortedRest, ctx.favoriteClubApiIds, ctx.nationalTeamApiIds);
  }

  return worldCup.length > 0 ? [...worldCup, ...sortedRest] : sortedRest;
}
