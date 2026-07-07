import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FIFA_WORLD_CUP_LEAGUE_ID } from '../footballQueryContext.ts';
import {
  buildInsightWhyLabel,
  isTrustworthyInsightMatch,
  type InsightTrustContext,
} from '../footballInsightTrust.ts';

const baseCtx: InsightTrustContext = {
  favoriteClubApiIds: new Set([42]),
  favoriteClubNamesByApiId: new Map([[42, 'Arsenal']]),
  nationalTeamApiIds: [10],
  nationalityNames: ['England'],
  countryInterestNamesLower: ['england'],
  selectedProfileLeagueIds: new Set([39]),
  manualFilterLeagueIds: [],
};

describe('isTrustworthyInsightMatch', () => {
  it('rejects generic major-league fixture with no follow link', () => {
    const match = {
      homeTeam: 'Getafe',
      awayTeam: 'Osasuna',
      status: 'Upcoming' as const,
      league: 'La Liga',
      leagueId: 140,
      date: '2026-06-15T18:00:00Z',
    };
    assert.equal(isTrustworthyInsightMatch(match, baseCtx), false);
  });

  it('accepts followed club', () => {
    const match = {
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      homeTeamId: 42,
      status: 'Live' as const,
      league: 'Premier League',
      leagueId: 39,
      date: '2026-06-15T18:00:00Z',
    };
    assert.equal(isTrustworthyInsightMatch(match, baseCtx), true);
  });

  it('rejects club friendly unless user follows a team', () => {
    const match = {
      homeTeam: 'AS Trencin',
      awayTeam: 'Inter Bratislava',
      homeTeamId: 100,
      awayTeamId: 200,
      status: 'Live' as const,
      league: 'Friendlies Clubs',
      leagueId: 667,
      date: '2026-06-15T18:00:00Z',
    };
    assert.equal(isTrustworthyInsightMatch(match, baseCtx), false);
  });

  it('accepts club friendly when user follows a team in the fixture', () => {
    const match = {
      homeTeam: 'Arsenal',
      awayTeam: 'Lyon',
      homeTeamId: 42,
      awayTeamId: 200,
      status: 'Live' as const,
      league: 'Friendlies Clubs',
      leagueId: 667,
      date: '2026-06-15T18:00:00Z',
    };
    assert.equal(isTrustworthyInsightMatch(match, baseCtx), true);
  });

  it('accepts World Cup', () => {
    const match = {
      homeTeam: 'Brazil',
      awayTeam: 'France',
      status: 'Live' as const,
      league: 'World Cup',
      leagueId: FIFA_WORLD_CUP_LEAGUE_ID,
      date: '2026-06-15T18:00:00Z',
    };
    assert.equal(isTrustworthyInsightMatch(match, baseCtx), true);
  });
});

describe('buildInsightWhyLabel', () => {
  it('uses plain language for national team live', () => {
    const match = {
      homeTeam: 'England',
      awayTeam: 'France',
      homeTeamId: 10,
      status: 'Live' as const,
      league: 'FIFA World Cup',
      leagueId: FIFA_WORLD_CUP_LEAGUE_ID,
      date: '2026-06-15T18:00:00Z',
    };
    assert.equal(buildInsightWhyLabel(match, baseCtx), 'England · live');
  });

  it('uses World Cup label when no nation match', () => {
    const emptyNationCtx: InsightTrustContext = {
      ...baseCtx,
      nationalTeamApiIds: [],
      nationalityNames: [],
      countryInterestNamesLower: [],
      favoriteClubApiIds: new Set(),
      favoriteClubNamesByApiId: new Map(),
      selectedProfileLeagueIds: new Set(),
    };
    const match = {
      homeTeam: 'Brazil',
      awayTeam: 'France',
      status: 'Live' as const,
      league: 'World Cup',
      leagueId: FIFA_WORLD_CUP_LEAGUE_ID,
      date: '2026-06-15T18:00:00Z',
    };
    assert.equal(buildInsightWhyLabel(match, emptyNationCtx), 'World Cup · live');
  });

  it('prefers club name over league', () => {
    const match = {
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      homeTeamId: 42,
      status: 'Upcoming' as const,
      league: 'Premier League',
      leagueId: 39,
      date: '2026-06-20T15:00:00Z',
    };
    assert.equal(buildInsightWhyLabel(match, baseCtx), 'Arsenal · upcoming');
  });

  it('returns null when not trustworthy', () => {
    const match = {
      homeTeam: 'Getafe',
      awayTeam: 'Osasuna',
      status: 'Live' as const,
      league: 'La Liga',
      leagueId: 140,
      date: '2026-06-15T18:00:00Z',
    };
    assert.equal(buildInsightWhyLabel(match, baseCtx), null);
  });
});
