import { COMPETITIONS_DATA, QUICK_FILTERS, type Continent } from '@/constants/competitions';
import type { FootballSmartFilter } from '@/components/SportsSmartFilter';
import { shouldShowFriendlyMatch } from '@/utils/footballFeedQuality';
import { teamNameMatchesNationalInterest } from '@/utils/nationalTeamNameMatch';
import {
  FIFA_WORLD_CUP_LEAGUE_ID,
  WORLD_CUP_FAMILY_LEAGUE_IDS,
  normalizeFavoriteLeagueIds,
} from '@/utils/footballLeagueFamily';

export { FIFA_WORLD_CUP_LEAGUE_ID, WORLD_CUP_FAMILY_LEAGUE_IDS } from '@/utils/footballLeagueFamily';

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

/** Always request the World Cup league on the bundle so TestFlight/production never miss intl fixtures. */
export function withWorldCupLeagueIds(leagueIds: number[] | undefined): number[] {
  return Array.from(new Set([FIFA_WORLD_CUP_LEAGUE_ID, ...(leagueIds ?? [])]));
}

/** Expands World Cup (id 1) to include qualifier competitions. */
export function expandCompetitionSelection(selected: readonly number[]): Set<number> {
  const set = new Set(selected);
  if (set.has(FIFA_WORLD_CUP_LEAGUE_ID)) {
    WORLD_CUP_FAMILY_LEAGUE_IDS.forEach((id) => set.add(id));
  }
  return set;
}

/** Ensure World Cup + qualifier leagues are always requested for personalised / open feeds. */
export function mergeWorldCupFamilyLeagueIds(leagueIds: number[] | undefined): number[] | undefined {
  if (!leagueIds || leagueIds.length === 0) return leagueIds;
  return Array.from(new Set([...leagueIds, ...WORLD_CUP_FAMILY_LEAGUE_IDS]));
}

export function isWorldCupMatch(match: { leagueId?: number; league?: string }): boolean {
  if (match.leagueId === FIFA_WORLD_CUP_LEAGUE_ID) return true;
  const label = (match.league ?? '').toLowerCase();
  return label.includes('world cup') || label.includes('fifa');
}

/** Normalizes persisted filter keys (legacy values → for-you / explore). */
export function normalizeFootballSmartFilter(raw: string | null | undefined): FootballSmartFilter {
  if (raw === 'for-you' || raw === 'explore') return raw;
  if (
    raw === 'top-leagues' ||
    raw === 'worldwide' ||
    raw === 'my-leagues' ||
    raw === 'my-countries' ||
    raw === 'all'
  ) {
    return 'explore';
  }
  if (raw === 'following' || raw === 'my-teams') return 'for-you';
  return 'for-you';
}

export interface FootballMatchForVisibility {
  leagueId: number;
  homeTeamId?: number;
  awayTeamId?: number;
  homeTeam?: string;
  awayTeam?: string;
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

/** UEFA club comps surfaced in Explore via feed-tuning discovery level — not For You. */
export function computeUefaDiscoveryLeagueIds(
  discoveryLevel: FootballDiscoveryLevel | undefined,
): number[] {
  const level = discoveryLevel ?? 'med';
  if (level === 'high') return [...UEFA_DISCOVERY_LEAGUE_IDS.high];
  if (level === 'med') return [...UEFA_DISCOVERY_LEAGUE_IDS.med];
  return [];
}

/** Map followed clubs' league labels (e.g. "Premier League") to API league ids for fixture fetch. */
export function resolveLeagueIdsFromTeamLeagueNames(
  teams: readonly { league?: string; country?: string }[],
  competitionsData: readonly Continent[] = COMPETITIONS_DATA,
): number[] {
  const ids = new Set<number>();
  for (const team of teams) {
    const name = team.league?.trim().toLowerCase();
    if (!name || name === 'football') continue;
    const countryHint = team.country?.trim().toLowerCase();
    competitionsData.forEach((continent) => {
      continent.countries.forEach((country) => {
        if (countryHint && !country.name.toLowerCase().includes(countryHint)) return;
        country.competitions.forEach((comp) => {
          if (comp.type !== 'league') return;
          if (comp.name.toLowerCase() === name) {
            ids.add(comp.id);
          }
        });
      });
    });
  }
  return Array.from(ids);
}

/**
 * For You league scope: saved leagues, domestic country leagues, and followed clubs' leagues only.
 * Top-5 / UEFA discovery belongs in Explore — no broad fallback bundle here.
 */
export function computeForYouLeagueScope(input: {
  favoriteLeagueIds: readonly number[];
  countryLeagueIds: readonly number[];
  followedClubLeagueIds: readonly number[];
  includeFollowedLeagues: boolean | undefined;
}): number[] {
  const preferredRaw = input.includeFollowedLeagues === false ? [] : [...input.favoriteLeagueIds];
  const preferredLeagueIds = normalizeFavoriteLeagueIds(preferredRaw);
  const merged = Array.from(
    new Set([...preferredLeagueIds, ...input.countryLeagueIds, ...input.followedClubLeagueIds]),
  );
  return merged.slice(0, 16);
}

export interface BuildFootballQueryContextInput {
  smartFilter: FootballSmartFilter;
  /** Persisted manual leagues; narrows fetch when `smartFilter === 'explore'` and non-empty */
  manualLeagueIds: readonly number[];
  contextTopLeagueIds: readonly number[] | null;
  contextFollowingTeamIds: readonly number[] | null;
  followedTeamApiIds: readonly number[];
  strictFollowing: boolean | undefined;
  favoriteLeagueIds: readonly number[];
  /** Followed clubs — league + country used to resolve domestic league ids for For You fetch. */
  followedTeams: readonly { league?: string; country?: string }[];
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
  /** True when manual league list narrows the bundle (explore + selection) */
  manualLeagueScopeActive: boolean;
}

/** Explore default scope: top-5 bundle + profile leagues + UEFA discovery. */
export function computeExploreLeagueScope(input: {
  favoriteLeagueIds: readonly number[];
  countryLeagueIds: readonly number[];
  followedClubLeagueIds: readonly number[];
  includeFollowedLeagues: boolean | undefined;
  discoveryLevel: FootballDiscoveryLevel | undefined;
  contextTopLeagueIds: readonly number[] | null;
}): number[] {
  const bundle =
    input.contextTopLeagueIds != null && input.contextTopLeagueIds.length > 0
      ? [...input.contextTopLeagueIds]
      : [...TOP_LEAGUE_BUNDLE_IDS];
  const fromProfile = computeForYouLeagueScope({
    favoriteLeagueIds: input.favoriteLeagueIds,
    countryLeagueIds: input.countryLeagueIds,
    followedClubLeagueIds: input.followedClubLeagueIds,
    includeFollowedLeagues: input.includeFollowedLeagues,
  });
  const discoveryLeagueIds = computeUefaDiscoveryLeagueIds(input.discoveryLevel);
  return Array.from(new Set([...bundle, ...fromProfile, ...discoveryLeagueIds])).slice(0, 28);
}

/** Ensure followed clubs are always in the shared bundle fetch (Activities My Teams). */
export function mergeFollowedClubTeamIds<T extends { teamIds?: number[] }>(
  input: T,
  followedClubApiIds: readonly number[],
): T {
  if (followedClubApiIds.length === 0) return input;
  const existing = input.teamIds ?? [];
  const merged = Array.from(new Set([...followedClubApiIds, ...existing]));
  return { ...input, teamIds: merged };
}

/** Ensure followed national teams stay in the bundle when Sports uses a league-only feed. */
export function mergeFollowedNationalTeamIds<
  T extends { nationalTeamIds?: number[]; includeAfcon?: boolean },
>(input: T, followedNationalApiIds: readonly number[]): T {
  if (followedNationalApiIds.length === 0) return input;
  const existing = input.nationalTeamIds ?? [];
  const merged = Array.from(new Set([...followedNationalApiIds, ...existing]));
  return {
    ...input,
    nationalTeamIds: merged,
    includeAfcon: input.includeAfcon ?? true,
  };
}

export function buildFootballQueryContext(input: BuildFootballQueryContextInput): FootballQueryContext {
  const manualLeagueScopeActive = input.smartFilter === 'explore' && input.manualLeagueIds.length > 0;

  const countryLeagueIds = computeCountryLeagueIds(
    input.countryInterestNamesLower,
    input.prioritizeDomesticLeagues,
  );
  const followedClubLeagueIds = resolveLeagueIdsFromTeamLeagueNames(input.followedTeams);
  const forYouLeagueScope = computeForYouLeagueScope({
    favoriteLeagueIds: input.favoriteLeagueIds,
    countryLeagueIds,
    followedClubLeagueIds,
    includeFollowedLeagues: input.includeFollowedLeagues,
  });
  const exploreLeagueScope = computeExploreLeagueScope({
    favoriteLeagueIds: input.favoriteLeagueIds,
    countryLeagueIds,
    followedClubLeagueIds,
    includeFollowedLeagues: input.includeFollowedLeagues,
    discoveryLevel: input.discoveryLevel,
    contextTopLeagueIds: input.contextTopLeagueIds,
  });

  let leagueIds: number[] | undefined;
  if (manualLeagueScopeActive) {
    leagueIds = [...expandCompetitionSelection(input.manualLeagueIds)];
  } else if (input.smartFilter === 'for-you') {
    leagueIds =
      forYouLeagueScope.length > 0
        ? mergeWorldCupFamilyLeagueIds(forYouLeagueScope)
        : mergeWorldCupFamilyLeagueIds([FIFA_WORLD_CUP_LEAGUE_ID]);
  } else if (input.smartFilter === 'explore') {
    leagueIds = mergeWorldCupFamilyLeagueIds(exploreLeagueScope);
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
  } else {
    teamIds = undefined;
  }

  return { leagueIds, teamIds, manualLeagueScopeActive };
}

function isFavoriteTeamMatch(
  match: FootballMatchForVisibility,
  favoriteTeamIds: ReadonlySet<number>,
  nationalTeamIds?: ReadonlySet<number>,
): boolean {
  const teamIds =
    nationalTeamIds && nationalTeamIds.size > 0
      ? new Set([...favoriteTeamIds, ...nationalTeamIds])
      : favoriteTeamIds;
  if (teamIds.size === 0) return false;
  if (typeof match.homeTeamId === 'number' && teamIds.has(match.homeTeamId)) return true;
  if (typeof match.awayTeamId === 'number' && teamIds.has(match.awayTeamId)) return true;
  return false;
}

function matchInvolvesNationalityByName(
  match: FootballMatchForVisibility,
  nationalityNamesLower: readonly string[],
): boolean {
  if (nationalityNamesLower.length === 0) return false;
  const home = (match.homeTeam ?? '').toLowerCase().trim();
  const away = (match.awayTeam ?? '').toLowerCase().trim();
  if (!home && !away) return false;
  return nationalityNamesLower.some((name) => {
    if (!name) return false;
    return (
      teamNameMatchesNationalInterest(home, name) ||
      teamNameMatchesNationalInterest(away, name)
    );
  });
}

function pinFavorites<T extends FootballMatchForVisibility>(
  matches: readonly T[],
  favoriteTeamIds: ReadonlySet<number>,
  nationalTeamIds?: ReadonlySet<number>,
): T[] {
  const pinned: T[] = [];
  const rest: T[] = [];
  matches.forEach((m) => {
    if (isFavoriteTeamMatch(m, favoriteTeamIds, nationalTeamIds)) pinned.push(m);
    else rest.push(m);
  });
  return [...pinned, ...rest];
}

export interface ApplyFootballVisibilityRulesInput {
  smartFilter: FootballSmartFilter;
  /** Only applied when `smartFilter === 'explore'` */
  manualLeagueIds: readonly number[];
  favoriteTeamIds: ReadonlySet<number>;
  /** National team API ids from profile nationalities — used for Following filter */
  nationalTeamIds?: ReadonlySet<number>;
  /** Profile nationality names (lowercase) — fallback when stored apiId is stale */
  nationalityNamesLower?: readonly string[];
  /** When true, national-team fixtures stay in For You and pin to the top */
  prioritizeNationalTeams?: boolean;
  /** For You / Top leagues: API league scope from `buildFootballQueryContext` */
  scopedLeagueIds?: readonly number[];
}

/**
 * Client-side visibility after fetch: manual league narrowing (explore only), following-only,
 * For You / Explore scoping (live feed is global from API), friendlies filter, then pin followed clubs.
 */
export function applyFootballVisibilityRules<T extends FootballMatchForVisibility>(
  matches: readonly T[],
  input: ApplyFootballVisibilityRulesInput,
): T[] {
  let filtered: T[] = [...matches];

  const alwaysKeep = (m: T) =>
    isWorldCupMatch(m) || ALWAYS_VISIBLE_INTERNATIONAL_LEAGUE_IDS.has(m.leagueId);

  if (input.smartFilter === 'explore' && input.manualLeagueIds.length > 0) {
    const set = expandCompetitionSelection(input.manualLeagueIds);
    const narrowed = filtered.filter((m) => set.has(m.leagueId));
    if (narrowed.length > 0) {
      filtered = narrowed;
    }
  } else if (input.smartFilter === 'for-you' && input.scopedLeagueIds && input.scopedLeagueIds.length > 0) {
    const leagueSet = new Set(input.scopedLeagueIds);
    const includeNationalTeams = input.prioritizeNationalTeams !== false;
    filtered = filtered.filter(
      (m) =>
        alwaysKeep(m) ||
        leagueSet.has(m.leagueId) ||
        isFavoriteTeamMatch(
          m,
          input.favoriteTeamIds,
          includeNationalTeams ? input.nationalTeamIds : undefined,
        ) ||
        (includeNationalTeams &&
          matchInvolvesNationalityByName(m, input.nationalityNamesLower ?? [])),
    );
  } else if (
    input.smartFilter === 'explore' &&
    input.scopedLeagueIds &&
    input.scopedLeagueIds.length > 0
  ) {
    const leagueSet = new Set(input.scopedLeagueIds);
    filtered = filtered.filter(
      (m) =>
        alwaysKeep(m) ||
        leagueSet.has(m.leagueId) ||
        isFavoriteTeamMatch(m, input.favoriteTeamIds, input.nationalTeamIds),
    );
  }

  /** Safety net: never drop World Cup / key international fixtures from the raw bundle. */
  const kept = new Map<string, T>();
  const matchKey = (m: T) =>
    `${m.leagueId ?? 0}:${m.homeTeamId ?? ''}:${m.awayTeamId ?? ''}:${(m as { date?: string }).date ?? ''}`;
  filtered.forEach((m) => kept.set(matchKey(m), m));
  if (input.smartFilter === 'for-you' || input.smartFilter === 'explore') {
    matches.forEach((m) => {
      if (alwaysKeep(m)) kept.set(matchKey(m), m);
    });
  } else {
    matches.forEach((m) => {
      if (isWorldCupMatch(m)) kept.set(matchKey(m), m);
    });
  }

  const afterFriendlies = [...kept.values()].filter((m) =>
    shouldShowFriendlyMatch(m, input.favoriteTeamIds, input.nationalTeamIds),
  );

  return pinFavorites(afterFriendlies, input.favoriteTeamIds, input.nationalTeamIds);
}
