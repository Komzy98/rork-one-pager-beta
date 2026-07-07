import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLUB_FRIENDLIES_LEAGUE_ID,
  getCompetitionQualityPenalty,
  isFriendlyMatch,
  shouldShowFriendlyMatch,
} from '../footballFeedQuality.ts';

describe('shouldShowFriendlyMatch', () => {
  it('hides club friendlies by default', () => {
    const match = {
      leagueId: CLUB_FRIENDLIES_LEAGUE_ID,
      league: 'Friendlies Clubs',
      homeTeamId: 100,
      awayTeamId: 200,
    };
    assert.equal(shouldShowFriendlyMatch(match, new Set()), false);
  });

  it('shows club friendlies when user follows a team', () => {
    const match = {
      leagueId: CLUB_FRIENDLIES_LEAGUE_ID,
      league: 'Friendlies Clubs',
      homeTeamId: 42,
      awayTeamId: 200,
    };
    assert.equal(shouldShowFriendlyMatch(match, new Set([42])), true);
  });

  it('shows international friendlies for followed national team', () => {
    const match = {
      leagueId: 10,
      league: 'International Friendly',
      homeTeamId: 10,
      awayTeamId: 11,
    };
    assert.equal(shouldShowFriendlyMatch(match, new Set(), new Set([10])), true);
  });
});

describe('getCompetitionQualityPenalty', () => {
  it('penalizes club friendlies heavily', () => {
    assert.equal(
      getCompetitionQualityPenalty({ leagueId: CLUB_FRIENDLIES_LEAGUE_ID, league: 'Friendlies Clubs' }),
      70,
    );
  });

  it('does not penalize major leagues', () => {
    assert.equal(getCompetitionQualityPenalty({ leagueId: 39, league: 'Premier League' }), 0);
  });
});

describe('isFriendlyMatch', () => {
  it('detects by league name', () => {
    assert.equal(isFriendlyMatch({ leagueId: 0, league: 'Club Friendlies' }), true);
  });
});
