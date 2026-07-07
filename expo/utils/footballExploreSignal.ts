import { isKnockoutFixture } from '@/utils/footballKnockout';
import {
  isFavoriteClubOrNationalMatch,
  matchInvolvesNationalInterest,
  type FootballPersonalizationMatch,
} from '@/utils/footballMatchPersonalization';

export type ExploreMarqueeContext = {
  favoriteClubApiIds: ReadonlySet<number>;
  nationalTeamApiIds: readonly number[];
  countryInterestNamesLower: readonly string[];
  selectedProfileLeagueIds: ReadonlySet<number>;
};

function isInForYouProfile(
  match: FootballPersonalizationMatch,
  ctx: ExploreMarqueeContext,
): boolean {
  if (
    isFavoriteClubOrNationalMatch(
      match,
      ctx.favoriteClubApiIds,
      ctx.nationalTeamApiIds,
    )
  ) {
    return true;
  }
  if (
    matchInvolvesNationalInterest(
      match,
      ctx.nationalTeamApiIds,
      ctx.countryInterestNamesLower,
    )
  ) {
    return true;
  }
  if (typeof match.leagueId === 'number' && ctx.selectedProfileLeagueIds.has(match.leagueId)) {
    return true;
  }
  return false;
}

/** Live or knockout fixtures outside the user's For You profile — Explore badge signal. */
export function countExploreMarqueeOutsideProfile(
  matches: readonly FootballPersonalizationMatch[],
  ctx: ExploreMarqueeContext,
): number {
  return matches.filter((match) => {
    if (isInForYouProfile(match, ctx)) return false;
    if (match.status === 'Live') return true;
    if (isKnockoutFixture(match)) return true;
    return false;
  }).length;
}
