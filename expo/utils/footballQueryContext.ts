import { COMPETITIONS_DATA, QUICK_FILTERS, type Continent } from '@/constants/competitions';
import type { FootballSmartFilter } from '@/components/SportsSmartFilter';

/** Curated top-league bundle for API scoping (top 5 + main UEFA club comps). */
export const TOP_LEAGUE_BUNDLE_IDS: number[] = (() => {
  const top5 = QUICK_FILTERS.find((f) => f.id === 'top5')?.leagueIds ?? [39, 140, 78, 135, 61];
  const uefaClub = [2, 3, 848, 531];
  return Array.from(new Set([...top5, ...uefaClub]));
})();

/**
 * International tournaments (FIFA World Cup, its qualifiers, continental cups) that should always
 * pass For You / Top Leagues visibility regardless of club-league scope — they're high-interest and
 * never part of the domestic/UEFA club bundle. Mirrors backend INTERNATIONAL_TOURNAMENT_IDS.
 */
export const ALWAYS_VISIBLE_INTERNATIONAL_LEAGUE_IDS: ReadonlySet<number> = new Set([
  1, 4, 5, 6, 7, 9, 10, 15, 16, 17, 18, 19, 20, 21,
]);

const UEFA_DISCOVERY_LEAGUE_IDS = {
  low: [] as number[],
  med: [2],
  high: [2, 3, 848, 531],
} as const;

export type FootballDiscoveryLevel = 'low' | 'med' | 'high';

export interface FootballMatchForVisibility {
  leagueId: number;
  homeTeamId?: number;
  awayTeamId?: number;
}

/** Domestic league ids inferred from country interests (tier ≤ 2). */
export function computeCountryLeagueIds(
  countryInterestNamesLower: readonly string[],
  prioritizeDomesticLeagues: boolean | undefined,
  competitionsData: readonly Continent[] = COMPETITIONS_DATA,
): number[] {
  if (prioritizeDomesticLeagues === false) return [];
  if (countryInterestNamesLower.length === 0) return [];
  const ids = new Set<number>();
  competitionsData.forEach((continent) => {
    continent.countries.forEach((country) => {
      const countryName = country.name.toLowerCase();
      const isCountryOfInterest = countryInterestNamesLower.some((interest) => countryName.includes(interest));
      if (!isCountryOfInterest) return;
      country.competitions.forEach((competition) => {
        if (competition.type === 'league' && (competition.tier ?? 2) <= 2) {
          ids.add(competition.id);
        }
      });
    });
  });
  return Array.from(ids);
}

export function computeForYouLeagueScope(input: {
  favoriteLeagueIds: readonly number[];
  countryLeagueIds: readonly number[];
  includeFollowedLeagues: boolean | undefined;
  discoveryLevel: FootballDiscoveryLevel | undefined;
}): number[] {
  const preferredLeagueIds = input.includeFollowedLeagues === false ? [] : [...input.favoriteLeagueIds];
  const discoveryLevel = input.discoveryLevel ?? 'med';
  const discoveryLeagueIds =
    discoveryLevel === 'high'
      ? UEFA_DISCOVERY_LEAGUE_IDS.high
      : discoveryLevel === 'med'
        ? UEFA_DISCOVERY_LEAGUE_IDS.med
        : UEFA_DISCOVERY_LEAGUE_IDS.low;
  const merged = Array.from(new Set([...preferredLeagueIds, ...input.countryLeagueIds, ...discoveryLeagueIds]));
  if (merged.length > 0) {
    return merged.slice(0, 24);
  }
  const fallbackSize = discoveryLevel === 'low' ? 4 : discoveryLevel === 'high' ? 12 : 8;
  return TOP_LEAGUE_BUNDLE_IDS.slice(0, fallbackSize);
}

export interface BuildFootballQueryContextInput {
  smartFilter: FootballSmartFilter;
  /** Persisted manual leagues; narrows fetch only when `smartFilter === 'worldwide'` and non-empty */
  manualLeagueIds: readonly number[];
  contextTopLeagueIds: readonly number[] | null;
  contextFollowingTeamIds: readonly number[] | null;
  followedTeamApiIds: readonly number[];
  strictFollowing: boolean | undefined;
  favoriteLeagueIds: readonly number[];
  countryInterestNamesLower: readonly string[];
  prioritizeDomesticLeagues: boolean | undefined;
  includeFollowedLeagues: boolean | undefined;
  discoveryLevel: FootballDiscoveryLevel | undefined;
}

export interface FootballQueryContext {
  /** Pass to `getMatchesBundle.leagueIds`; `undefined` = no league filter */
  leagueIds: number[] | undefined;
  /** Pass to `getMatchesBundle.teamIds`; `undefined` = no team filter */
  teamIds: number[] | undefined;
  /** True when manual league list narrows the bundle (worldwide + selection) */
  manualLeagueScopeActive: boolean;
}

export function buildFootballQueryContext(input: BuildFootballQueryContextInput): FootballQueryContext {
  const manualLeagueScopeActive = input.smartFilter === 'worldwide' && input.manualLeagueIds.length > 0;

  const countryLeagueIds = computeCountryLeagueIds(
    input.countryInterestNamesLower,
    input.prioritizeDomesticLeagues,
  );
  const forYouLeagueScope = computeForYouLeagueScope({
    favoriteLeagueIds: input.favoriteLeagueIds,
    countryLeagueIds,
    includeFollowedLeagues: input.includeFollowedLeagues,
    discoveryLevel: input.discoveryLevel,
  });

  let leagueIds: number[] | undefined;
  if (manualLeagueScopeActive) {
    leagueIds = [...input.manualLeagueIds];
  } else if (input.smartFilter === 'for-you') {
    leagueIds = forYouLeagueScope.length > 0 ? forYouLeagueScope : undefined;
  } else if (input.smartFilter === 'top-leagues') {
    if (input.contextTopLeagueIds != null && input.contextTopLeagueIds.length > 0) {
      leagueIds = [...input.contextTopLeagueIds];
    } else {
      leagueIds = TOP_LEAGUE_BUNDLE_IDS.length > 0 ? TOP_LEAGUE_BUNDLE_IDS : undefined;
    }
  } else {
    leagueIds = undefined;
  }

  let teamIds: number[] | undefined;
  if (input.smartFilter === 'for-you' && input.strictFollowing) {
    if (input.followedTeamApiIds.length === 0) teamIds = undefined;
    else if (input.contextFollowingTeamIds != null && input.contextFollowingTeamIds.length > 0) {
      teamIds = [...input.contextFollowingTeamIds];
    } else {
      teamIds = [...input.followedTeamApiIds];
    }
  } else if (input.smartFilter === 'following') {
    if (input.followedTeamApiIds.length === 0) teamIds = undefined;
    else if (input.contextFollowingTeamIds != null && input.contextFollowingTeamIds.length > 0) {
      teamIds = [...input.contextFollowingTeamIds];
    } else {
      teamIds = [...input.followedTeamApiIds];
    }
  } else {
    teamIds = undefined;
  }

  return { leagueIds, teamIds, manualLeagueScopeActive };
}

function isFavoriteTeamMatch(match: FootballMatchForVisibility, favoriteTeamIds: ReadonlySet<number>): boolean {
  if (favoriteTeamIds.size === 0) return false;
  if (typeof match.homeTeamId === 'number' && favoriteTeamIds.has(match.homeTeamId)) return true;
  if (typeof match.awayTeamId === 'number' && favoriteTeamIds.has(match.awayTeamId)) return true;
  return false;
}

function pinFavorites<T extends FootballMatchForVisibility>(
  matches: readonly T[],
  favoriteTeamIds: ReadonlySet<number>,
): T[] {
  const pinned: T[] = [];
  const rest: T[] = [];
  matches.forEach((m) => {
    if (isFavoriteTeamMatch(m, favoriteTeamIds)) pinned.push(m);
    else rest.push(m);
  });
  return [...pinned, ...rest];
}

export interface ApplyFootballVisibilityRulesInput {
  smartFilter: FootballSmartFilter;
  /** Only applied when `smartFilter === 'worldwide'` */
  manualLeagueIds: readonly number[];
  favoriteTeamIds: ReadonlySet<number>;
  /** For You / Top leagues: API league scope from `buildFootballQueryContext` */
  scopedLeagueIds?: readonly number[];
}

/**
 * Client-side visibility after fetch: manual league narrowing (worldwide only), following-only,
 * For You / Top leagues scoping (live feed is global from API), then pin followed clubs.
 */
export function applyFootballVisibilityRules<T extends FootballMatchForVisibility>(
  matches: readonly T[],
  input: ApplyFootballVisibilityRulesInput,
): T[] {
  let filtered: T[] = [...matches];

  if (input.smartFilter === 'worldwide' && input.manualLeagueIds.length > 0) {
    const set = new Set(input.manualLeagueIds);
    const narrowed = filtered.filter((m) => set.has(m.leagueId));
    /** If picks have no fixtures in this window, don't hide the whole feed (stale/off-season selections). */
    if (narrowed.length > 0) {
      filtered = narrowed;
    }
  } else if (input.smartFilter === 'for-you' && input.scopedLeagueIds && input.scopedLeagueIds.length > 0) {
    const leagueSet = new Set(input.scopedLeagueIds);
    filtered = filtered.filter(
      (m) =>
        leagueSet.has(m.leagueId) ||
        ALWAYS_VISIBLE_INTERNATIONAL_LEAGUE_IDS.has(m.leagueId) ||
        isFavoriteTeamMatch(m, input.favoriteTeamIds),
    );
  } else if (
    input.smartFilter === 'top-leagues' &&
    input.scopedLeagueIds &&
    input.scopedLeagueIds.length > 0
  ) {
    const leagueSet = new Set(input.scopedLeagueIds);
    filtered = filtered.filter(
      (m) => leagueSet.has(m.leagueId) || ALWAYS_VISIBLE_INTERNATIONAL_LEAGUE_IDS.has(m.leagueId),
    );
  }

  if (input.smartFilter === 'following') {
    filtered = filtered.filter((m) => isFavoriteTeamMatch(m, input.favoriteTeamIds));
  }

  return pinFavorites(filtered, input.favoriteTeamIds);
}
