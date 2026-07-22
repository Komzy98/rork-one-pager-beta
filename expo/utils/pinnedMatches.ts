import type { LiveFootballMatch } from '@/types/habit';
import type { SportsMatchCardModel } from '@/components/PremiumSportsMatchCard';
import { resolveMatchLeagueLogo, isWorldCupLeague } from '@/utils/footballLeagueLabel';
import {
  reconcileStalePinnedSnapshot,
} from '@/utils/footballFixtureTransform';

export const PINNED_MATCHES_STORAGE_BASE = 'sports_pinned_matches';

export type PinnedMatchRecord = {
  id: string;
  snapshot: LiveFootballMatch;
  pinnedAt: string;
};

export function sportsCardModelToLiveFootball(match: SportsMatchCardModel): LiveFootballMatch {
  const leagueId = match.leagueId > 0 ? match.leagueId : undefined;
  const leagueLogo = resolveMatchLeagueLogo({
    leagueId,
    league: match.league,
    leagueLogo: match.leagueLogo,
  });
  return {
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeTeamLogo: match.homeTeamLogo,
    awayTeamLogo: match.awayTeamLogo,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    league: match.league,
    leagueId,
    leagueLogo,
    country: match.leagueCountry || undefined,
    date: match.date,
    time: match.time,
    status: match.status,
    elapsed: match.elapsed,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    venue: match.venue,
    round: match.round,
  };
}

export function enrichLiveFootballMatchLogos(match: LiveFootballMatch): LiveFootballMatch {
  const leagueLogo = resolveMatchLeagueLogo({
    leagueId: match.leagueId,
    league: match.league,
    leagueLogo: match.leagueLogo,
    round: match.round,
  });
  const leagueId =
    match.leagueId ??
    (isWorldCupLeague(undefined, match.league, match.round) ? 1 : undefined);
  if (leagueLogo === match.leagueLogo && leagueId === match.leagueId) return match;
  return { ...match, leagueLogo, leagueId };
}

export function mergePinnedWithLiveData(
  records: readonly PinnedMatchRecord[],
  pools: readonly (readonly LiveFootballMatch[])[],
  refreshedById?: ReadonlyMap<string, LiveFootballMatch>,
): LiveFootballMatch[] {
  const byId = new Map<string, LiveFootballMatch>();
  pools.flat().forEach((m) => byId.set(m.id, enrichLiveFootballMatchLogos(m)));
  refreshedById?.forEach((match, id) => byId.set(id, enrichLiveFootballMatchLogos(match)));

  return records.map((r) => {
    const fresh = byId.get(r.id);
    if (fresh) return fresh;
    return enrichLiveFootballMatchLogos(reconcileStalePinnedSnapshot(r.snapshot));
  });
}

export function findOrphanedPinnedRecords(
  records: readonly PinnedMatchRecord[],
  pools: readonly LiveFootballMatch[][],
): PinnedMatchRecord[] {
  const poolIds = new Set(pools.flat().map((m) => m.id));
  return records.filter((r) => !poolIds.has(r.id));
}
