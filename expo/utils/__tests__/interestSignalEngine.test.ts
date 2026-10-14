import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildFootballInterestSignals } from '../interestSignalEngine.ts';
import type { LiveFootballMatch } from '../../types/habit.ts';

function match(overrides: Partial<LiveFootballMatch>): LiveFootballMatch {
  return {
    id: '1',
    homeTeam: 'Nigeria',
    awayTeam: 'Ghana',
    league: 'International Friendly',
    date: '2026-09-30T19:00:00.000Z',
    time: '08:00 PM',
    status: 'Upcoming',
    ...overrides,
  };
}

describe('buildFootballInterestSignals', () => {
  const now = new Date('2026-09-30T12:00:00.000Z');

  it('surfaces a followed national team before kickoff', () => {
    const signals = buildFootballInterestSignals({
      liveMatches: [],
      upcomingMatches: [match({})],
      completedMatches: [],
      followedNames: ['Nigeria'],
      now,
    });

    assert.match(signals[0]?.title ?? '', /Nigeria/);
    assert.match(signals[0]?.reason ?? '', /follow Nigeria/);
  });

  it('surfaces a recently completed followed match so the user can catch up', () => {
    const signals = buildFootballInterestSignals({
      liveMatches: [],
      upcomingMatches: [],
      completedMatches: [
        match({
          id: '2',
          status: 'Completed',
          date: '2026-09-29T19:00:00.000Z',
          homeScore: 2,
          awayScore: 1,
        }),
      ],
      followedNames: ['Nigeria'],
      now,
    });

    assert.equal(signals[0]?.kind, 'football_recent_result');
    assert.match(signals[0]?.subtitle ?? '', /2–1/);
  });

  it('ranks live matches above upcoming matches', () => {
    const signals = buildFootballInterestSignals({
      liveMatches: [
        match({
          id: 'live',
          status: 'Live',
          homeScore: 1,
          awayScore: 0,
        }),
      ],
      upcomingMatches: [match({ id: 'next' })],
      completedMatches: [],
      followedNames: ['Nigeria'],
      now,
    });

    assert.equal(signals[0]?.kind, 'football_live');
  });
});
