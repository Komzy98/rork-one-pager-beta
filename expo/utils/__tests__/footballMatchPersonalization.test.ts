import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { teamNameMatchesNationalInterest } from '../nationalTeamNameMatch.ts';
import {
  matchInvolvesNationalInterest,
  scoreMatchForYou,
  type FootballPersonalizationContext,
  type FootballPersonalizationMatch,
} from '../footballMatchPersonalization.ts';
import { FIFA_WORLD_CUP_LEAGUE_ID } from '../footballQueryContext.ts';

describe('teamNameMatchesNationalInterest', () => {
  it('matches England national team', () => {
    assert.equal(teamNameMatchesNationalInterest('England', 'england'), true);
  });

  it('rejects New England FC for England interest', () => {
    assert.equal(teamNameMatchesNationalInterest('New England FC', 'england'), false);
  });

  it('rejects Northern Ireland for Ireland interest', () => {
    assert.equal(teamNameMatchesNationalInterest('Northern Ireland', 'ireland'), false);
  });
});

describe('matchInvolvesNationalInterest', () => {
  const englandApi = 10;

  it('matches by national team api id', () => {
    const match: FootballPersonalizationMatch = {
      homeTeam: 'England',
      awayTeam: 'France',
      homeTeamId: englandApi,
      awayTeamId: 2,
      status: 'Upcoming',
      league: 'World Cup',
      leagueId: 1,
      date: new Date().toISOString(),
    };
    assert.equal(matchInvolvesNationalInterest(match, [englandApi], []), true);
  });

  it('does not match club substring false positive', () => {
    const match: FootballPersonalizationMatch = {
      homeTeam: 'New England FC',
      awayTeam: 'Boston United',
      status: 'Upcoming',
      league: 'USL',
      leagueId: 999,
      date: new Date().toISOString(),
    };
    assert.equal(matchInvolvesNationalInterest(match, [], ['england']), false);
  });
});

describe('scoreMatchForYou World Cup weighting', () => {
  const baseCtx: FootballPersonalizationContext = {
    favoriteClubApiIds: new Set(),
    nationalTeamApiIds: [10],
    countryInterestNamesLower: ['england'],
    selectedProfileLeagueIds: new Set(),
    manualFilterLeagueIds: [],
    nowMs: Date.parse('2026-06-15T12:00:00Z'),
  };

  const wcLive: FootballPersonalizationMatch = {
    id: 'wc',
    homeTeam: 'England',
    awayTeam: 'France',
    homeTeamId: 10,
    awayTeamId: 2,
    status: 'Live',
    league: 'World Cup',
    leagueId: FIFA_WORLD_CUP_LEAGUE_ID,
    date: '2026-06-15T18:00:00Z',
  };

  const clubLive: FootballPersonalizationMatch = {
    id: 'club',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    homeTeamId: 42,
    awayTeamId: 49,
    status: 'Live',
    league: 'Premier League',
    leagueId: 39,
    date: '2026-06-15T18:00:00Z',
  };

  it('scores World Cup + nationality higher than generic live', () => {
    const wcScore = scoreMatchForYou(wcLive, baseCtx);
    const genericLive: FootballPersonalizationMatch = {
      ...clubLive,
      homeTeamId: 999,
      awayTeamId: 998,
    };
    const genericScore = scoreMatchForYou(genericLive, baseCtx);
    assert.ok(wcScore > genericScore);
  });

  it('scores followed club live higher than unrelated live fixture', () => {
    const ctx: FootballPersonalizationContext = {
      ...baseCtx,
      favoriteClubApiIds: new Set([42]),
    };
    const clubScore = scoreMatchForYou(clubLive, ctx);
    const unrelatedLive: FootballPersonalizationMatch = {
      homeTeam: 'Spain',
      awayTeam: 'Germany',
      homeTeamId: 9,
      awayTeamId: 8,
      status: 'Live',
      league: 'Friendly',
      leagueId: 667,
      date: '2026-06-15T18:00:00Z',
    };
    const otherScore = scoreMatchForYou(unrelatedLive, ctx);
    assert.ok(clubScore > otherScore);
  });

  it('scores major league live above club friendly live', () => {
    const plLive: FootballPersonalizationMatch = {
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      status: 'Live',
      league: 'Premier League',
      leagueId: 39,
      date: '2026-06-15T18:00:00Z',
    };
    const friendlyLive: FootballPersonalizationMatch = {
      homeTeam: 'Trencin',
      awayTeam: 'Bratislava',
      status: 'Live',
      league: 'Friendlies Clubs',
      leagueId: 667,
      date: '2026-06-15T18:00:00Z',
    };
    assert.ok(scoreMatchForYou(plLive, baseCtx) > scoreMatchForYou(friendlyLive, baseCtx));
  });
});
