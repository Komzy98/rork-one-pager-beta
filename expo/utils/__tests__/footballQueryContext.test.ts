import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFootballVisibilityRules,
  buildFootballQueryContext,
  computeExploreLeagueScope,
  computeForYouLeagueScope,
  computeUefaDiscoveryLeagueIds,
  FIFA_WORLD_CUP_LEAGUE_ID,
  mergeFollowedClubTeamIds,
  mergeFollowedNationalTeamIds,
  resolveLeagueIdsFromTeamLeagueNames,
  TOP_LEAGUE_BUNDLE_IDS,
} from '../footballQueryContext.ts';

describe('mergeFollowedClubTeamIds', () => {
  it('merges followed clubs even when Sports publishes teamIds: []', () => {
    const merged = mergeFollowedClubTeamIds(
      { days: 14, teamIds: [], leagueIds: [1], includeResults: false },
      [33, 40],
    );
    assert.deepEqual(merged.teamIds, [33, 40]);
  });

  it('dedupes existing and followed club ids', () => {
    const merged = mergeFollowedClubTeamIds(
      { days: 14, teamIds: [33], includeResults: false },
      [33, 40],
    );
    assert.deepEqual(merged.teamIds, [33, 40]);
  });
});

describe('mergeFollowedNationalTeamIds', () => {
  it('merges followed national teams and sets includeAfcon', () => {
    const nationalInput: {
      days: number;
      teamIds: number[];
      leagueIds: number[];
      includeResults: boolean;
      nationalTeamIds?: number[];
      includeAfcon?: boolean;
    } = { days: 14, teamIds: [], leagueIds: [1], includeResults: false };
    const merged = mergeFollowedNationalTeamIds(nationalInput, [2, 13]);
    assert.deepEqual(merged.nationalTeamIds, [2, 13]);
    assert.equal(merged.includeAfcon, true);
  });
});

describe('computeForYouLeagueScope', () => {
  it('does not fall back to top-5 domestic leagues when profile is empty', () => {
    const scope = computeForYouLeagueScope({
      favoriteLeagueIds: [],
      countryLeagueIds: [],
      followedClubLeagueIds: [],
      includeFollowedLeagues: true,
    });
    assert.equal(scope.includes(39), false, 'Premier League should not appear without profile');
    assert.equal(scope.includes(140), false, 'La Liga should not appear without profile');
  });

  it('includes followed club domestic leagues', () => {
    const scope = computeForYouLeagueScope({
      favoriteLeagueIds: [],
      countryLeagueIds: [],
      followedClubLeagueIds: [39, 78],
      includeFollowedLeagues: true,
    });
    assert.ok(scope.includes(39));
    assert.ok(scope.includes(78));
  });
});

describe('computeExploreLeagueScope', () => {
  it('includes top-league bundle and UEFA discovery beyond For You', () => {
    const scope = computeExploreLeagueScope({
      favoriteLeagueIds: [],
      countryLeagueIds: [],
      followedClubLeagueIds: [39],
      includeFollowedLeagues: true,
      discoveryLevel: 'med',
      contextTopLeagueIds: null,
    });
    assert.ok(scope.includes(39));
    assert.ok(scope.includes(2), 'med discovery adds Champions League');
    assert.ok(TOP_LEAGUE_BUNDLE_IDS.every((id) => scope.includes(id)), 'full top bundle included');
  });
});

describe('computeUefaDiscoveryLeagueIds', () => {
  it('returns empty for low discovery', () => {
    assert.deepEqual(computeUefaDiscoveryLeagueIds('low'), []);
  });

  it('returns full UEFA set for high discovery', () => {
    const ids = computeUefaDiscoveryLeagueIds('high');
    assert.ok(ids.includes(2));
    assert.ok(ids.includes(3));
  });
});

describe('resolveLeagueIdsFromTeamLeagueNames', () => {
  it('maps Premier League label to league id 39 for England', () => {
    assert.deepEqual(
      resolveLeagueIdsFromTeamLeagueNames([{ league: 'Premier League', country: 'England' }]),
      [39],
    );
  });
});

describe('buildFootballQueryContext', () => {
  const baseInput = {
    manualLeagueIds: [] as number[],
    contextTopLeagueIds: null as number[] | null,
    contextFollowingTeamIds: null as number[] | null,
    followedTeamApiIds: [33],
    strictFollowing: false,
    favoriteLeagueIds: [] as number[],
    followedTeams: [{ league: 'Premier League', country: 'England' }],
    countryInterestNamesLower: [] as string[],
    prioritizeDomesticLeagues: true,
    includeFollowedLeagues: true,
    discoveryLevel: 'med' as const,
  };

  it('For You scopes to profile + club leagues without top-5 bundle', () => {
    const ctx = buildFootballQueryContext({ ...baseInput, smartFilter: 'for-you' });
    assert.ok(ctx.leagueIds?.includes(39));
    assert.equal(
      TOP_LEAGUE_BUNDLE_IDS.filter((id) => id !== 39 && id !== FIFA_WORLD_CUP_LEAGUE_ID).every(
        (id) => !ctx.leagueIds?.includes(id),
      ),
      true,
      'other top-5 leagues should not appear in For You when not in profile',
    );
  });

  it('For You with empty profile falls back to World Cup only', () => {
    const ctx = buildFootballQueryContext({
      ...baseInput,
      smartFilter: 'for-you',
      followedTeams: [],
      followedTeamApiIds: [],
    });
    assert.ok(ctx.leagueIds?.includes(FIFA_WORLD_CUP_LEAGUE_ID));
    assert.equal(ctx.leagueIds?.includes(39), false);
  });

  it('Explore includes top-league bundle', () => {
    const ctx = buildFootballQueryContext({ ...baseInput, smartFilter: 'explore' });
    assert.ok(TOP_LEAGUE_BUNDLE_IDS.every((id) => ctx.leagueIds?.includes(id)));
  });
});


describe('applyFootballVisibilityRules feed semantics', () => {
  const fixtures = [
    { leagueId: 39, homeTeamId: 33, awayTeamId: 50, homeTeam: 'Manchester United', awayTeam: 'Brighton' },
    { leagueId: 39, homeTeamId: 40, awayTeamId: 49, homeTeam: 'Liverpool', awayTeam: 'Chelsea' },
    { leagueId: 140, homeTeamId: 529, awayTeamId: 530, homeTeam: 'Barcelona', awayTeam: 'Atletico Madrid' },
    { leagueId: 6, homeTeamId: 1000, awayTeamId: 1001, homeTeam: 'Nigeria', awayTeam: 'Ghana' },
  ];

  it('For You only shows explicitly followed club/national-team matches', () => {
    const visible = applyFootballVisibilityRules(fixtures, {
      smartFilter: 'for-you',
      manualLeagueIds: [],
      favoriteTeamIds: new Set([33]),
      favoriteTeamNamesLower: ['manchester united'],
      nationalTeamIds: new Set(),
      nationalityNamesLower: ['nigeria'],
      scopedLeagueIds: [39, 140, 6],
    });

    assert.deepEqual(
      visible.map((m) => [m.homeTeam, m.awayTeam]),
      [
        ['Manchester United', 'Brighton'],
        ['Nigeria', 'Ghana'],
      ],
    );
  });

  it('Explore shows non-favourite matches only from manually selected leagues', () => {
    const visible = applyFootballVisibilityRules(fixtures, {
      smartFilter: 'explore',
      manualLeagueIds: [39],
      favoriteTeamIds: new Set([33]),
      favoriteTeamNamesLower: ['manchester united'],
      nationalTeamIds: new Set(),
      nationalityNamesLower: ['nigeria'],
      scopedLeagueIds: [39],
    });

    assert.deepEqual(
      visible.map((m) => [m.homeTeam, m.awayTeam]),
      [['Liverpool', 'Chelsea']],
    );
  });

  it('Explore does not fall back to unrelated fixtures when a selected league has no matches', () => {
    const visible = applyFootballVisibilityRules(fixtures, {
      smartFilter: 'explore',
      manualLeagueIds: [78],
      favoriteTeamIds: new Set([33]),
      favoriteTeamNamesLower: ['manchester united'],
      nationalTeamIds: new Set(),
      nationalityNamesLower: ['nigeria'],
      scopedLeagueIds: [78],
    });

    assert.equal(visible.length, 0);
  });
});


describe('Explore explicit league completeness', () => {
  it('keeps non-favourite friendlies when that league was explicitly selected', () => {
    const visible = applyFootballVisibilityRules(
      [
        { leagueId: 667, homeTeamId: 501, awayTeamId: 502, homeTeam: 'Club A', awayTeam: 'Club B' },
      ],
      {
        smartFilter: 'explore',
        manualLeagueIds: [667],
        favoriteTeamIds: new Set([33]),
        favoriteTeamNamesLower: ['manchester united'],
        nationalTeamIds: new Set(),
        nationalityNamesLower: ['nigeria'],
        scopedLeagueIds: [667],
      },
    );
    assert.equal(visible.length, 1);
  });
});
