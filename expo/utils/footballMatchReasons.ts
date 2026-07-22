import type { UserProfile } from '@/types/habit';
import {
  isFavoriteClubOrNationalMatch,
  type FootballPersonalizationContext,
  type FootballPersonalizationMatch,
} from '@/utils/footballMatchPersonalization';

/** Short chip on match cards — favorite teams/leagues first is explained in feed meta. */
export function getFootballMatchPersonalizationChip(
  match: FootballPersonalizationMatch,
  ctx: FootballPersonalizationContext,
  profile: UserProfile | null | undefined,
): string | null {
  if (
    isFavoriteClubOrNationalMatch(match, ctx.favoriteClubApiIds, ctx.nationalTeamApiIds)
  ) {
    const teams = profile?.favoriteTeams ?? [];
    for (const team of teams) {
      const name = team.name?.trim();
      if (!name) continue;
      const home = match.homeTeam?.toLowerCase() ?? '';
      const away = match.awayTeam?.toLowerCase() ?? '';
      const key = name.toLowerCase();
      if (home.includes(key) || away.includes(key)) {
        return `Because you follow ${name}`;
      }
    }
    const first = teams[0]?.name?.trim();
    if (first) return `Because you follow ${first}`;
    return 'Your team';
  }

  if (ctx.selectedProfileLeagueIds.has(match.leagueId)) {
    return `${match.league} · your league`;
  }

  if (ctx.manualFilterLeagueIds.includes(match.leagueId)) {
    return `${match.league} · in your filter`;
  }

  return null;
}

export function formatFootballFeedUpdatedLabel(updatedAtMs: number | undefined, nowMs = Date.now()): string {
  if (!updatedAtMs || !Number.isFinite(updatedAtMs)) return 'Updated just now';
  const mins = Math.max(0, Math.round((nowMs - updatedAtMs) / 60_000));
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Updated ${hrs}h ago`;
  return `Updated ${new Date(updatedAtMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}
