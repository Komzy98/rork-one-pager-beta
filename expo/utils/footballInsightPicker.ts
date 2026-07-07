import type { FootballSmartFilter } from '@/components/SportsSmartFilter';
import { isWorldCupMatch } from '@/utils/footballQueryContext';
import {
  matchInvolvesNationalInterest,
  sortMatchesBySmartForYou,
  type FootballPersonalizationContext,
  type FootballPersonalizationMatch,
} from '@/utils/footballMatchPersonalization';

export type InsightPickTier =
  | 'club-live'
  | 'world-cup-live'
  | 'smart-ranked'
  | 'featured-upcoming';

function isFollowedClubMatch(
  match: FootballPersonalizationMatch,
  favoriteClubApiIds: ReadonlySet<number>,
): boolean {
  return (
    (typeof match.homeTeamId === 'number' && favoriteClubApiIds.has(match.homeTeamId)) ||
    (typeof match.awayTeamId === 'number' && favoriteClubApiIds.has(match.awayTeamId))
  );
}

export function classifyInsightPickTier(
  match: FootballPersonalizationMatch,
  ctx: FootballPersonalizationContext,
): InsightPickTier | null {
  if (match.status !== 'Live') return null;
  if (isFollowedClubMatch(match, ctx.favoriteClubApiIds)) return 'club-live';
  if (
    isWorldCupMatch(match) &&
    matchInvolvesNationalInterest(
      match,
      ctx.nationalTeamApiIds,
      ctx.countryInterestNamesLower,
    )
  ) {
    return 'world-cup-live';
  }
  return null;
}

/** Insight priority: club live → World Cup live (national) → smart-ranked live → featured upcoming. */
export function pickAiInsightMatch<T extends FootballPersonalizationMatch>(input: {
  activeTab: 'live' | 'upcoming' | 'results';
  filteredLiveMatches: readonly T[];
  featuredUpcomingMatch: T | null;
  ctx: FootballPersonalizationContext;
}): T | null {
  const { activeTab, filteredLiveMatches, featuredUpcomingMatch, ctx } = input;

  if (activeTab === 'upcoming') {
    return featuredUpcomingMatch;
  }

  const smartSortedLive = sortMatchesBySmartForYou(filteredLiveMatches, ctx);

  const clubLive = smartSortedLive.find(
    (m) => m.status === 'Live' && isFollowedClubMatch(m, ctx.favoriteClubApiIds),
  );
  if (clubLive) return clubLive;

  const wcLive = smartSortedLive.find(
    (m) =>
      m.status === 'Live' &&
      isWorldCupMatch(m) &&
      matchInvolvesNationalInterest(
        m,
        ctx.nationalTeamApiIds,
        ctx.countryInterestNamesLower,
      ),
  );
  if (wcLive) return wcLive;

  return smartSortedLive[0] ?? featuredUpcomingMatch;
}

export function pickFeaturedUpcomingMatch<T extends FootballPersonalizationMatch>(input: {
  filteredUpcomingMatches: readonly T[];
  smartSortedUpcomingMatches: readonly T[];
  footballSmartFilter: FootballSmartFilter;
  ctx: FootballPersonalizationContext;
}): T | null {
  const { filteredUpcomingMatches, smartSortedUpcomingMatches, ctx } = input;

  const chronological = [...filteredUpcomingMatches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const clubMatch = chronological.find((m) =>
    isFollowedClubMatch(m, ctx.favoriteClubApiIds),
  );
  if (clubMatch) return clubMatch;

  const nationalWorldCup = chronological.find(
    (m) =>
      isWorldCupMatch(m) &&
      matchInvolvesNationalInterest(
        m,
        ctx.nationalTeamApiIds,
        ctx.countryInterestNamesLower,
      ),
  );
  if (nationalWorldCup) return nationalWorldCup;

  const nationalMatch = chronological.find((m) =>
    matchInvolvesNationalInterest(
      m,
      ctx.nationalTeamApiIds,
      ctx.countryInterestNamesLower,
    ),
  );
  if (nationalMatch) return nationalMatch;

  if (smartSortedUpcomingMatches[0]) return smartSortedUpcomingMatches[0];

  return chronological.find(isWorldCupMatch) ?? null;
}

/** Ordered insight candidates for carousel / tests (deduped). */
export function buildInsightCandidateOrder(
  liveMatches: readonly FootballPersonalizationMatch[],
  upcomingMatches: readonly FootballPersonalizationMatch[],
  ctx: FootballPersonalizationContext,
): FootballPersonalizationMatch[] {
  const smartLive = sortMatchesBySmartForYou(liveMatches, ctx);
  const smartUpcoming = sortMatchesBySmartForYou(upcomingMatches, ctx);
  const featured = pickFeaturedUpcomingMatch({
    filteredUpcomingMatches: upcomingMatches,
    smartSortedUpcomingMatches: smartUpcoming,
    footballSmartFilter: 'for-you',
    ctx,
  });

  const ordered: FootballPersonalizationMatch[] = [];
  const seen = new Set<string>();

  const push = (m: FootballPersonalizationMatch | null | undefined) => {
    if (!m) return;
    const key = m.id ?? `${m.leagueId}:${m.homeTeam}:${m.awayTeam}:${m.date}`;
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(m);
  };

  push(
    smartLive.find(
      (m) => m.status === 'Live' && isFollowedClubMatch(m, ctx.favoriteClubApiIds),
    ),
  );
  push(
    smartLive.find(
      (m) =>
        m.status === 'Live' &&
        isWorldCupMatch(m) &&
        matchInvolvesNationalInterest(
          m,
          ctx.nationalTeamApiIds,
          ctx.countryInterestNamesLower,
        ),
    ),
  );
  smartLive.forEach((m) => push(m));
  push(featured);
  smartUpcoming.forEach((m) => push(m));

  return ordered;
}
