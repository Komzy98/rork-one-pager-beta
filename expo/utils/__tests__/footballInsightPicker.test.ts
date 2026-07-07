import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInsightCandidateOrder,
  pickAiInsightMatch,
  classifyInsightPickTier,
} from '../footballInsightPicker.ts';
import { FIFA_WORLD_CUP_LEAGUE_ID } from '../footballQueryContext.ts';
import type { FootballPersonalizationContext } from '../footballMatchPersonalization.ts';

const ctx: FootballPersonalizationContext = {
  favoriteClubApiIds: new Set([42]),
  nationalTeamApiIds: [10],
  countryInterestNamesLower: ['england'],
  selectedProfileLeagueIds: new Set(),
  manualFilterLeagueIds: [],
  nowMs: Date.parse('2026-06-15T12:00:00Z'),
};

describe('insight pick order', () => {
  const clubLive = {
    id: 'club-live',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    homeTeamId: 42,
    awayTeamId: 49,
    status: 'Live' as const,
    league: 'Premier League',
    leagueId: 39,
    date: '2026-06-15T18:00:00Z',
  };

  const wcLive = {
    id: 'wc-live',
    homeTeam: 'England',
    awayTeam: 'France',
    homeTeamId: 10,
    awayTeamId: 2,
    status: 'Live' as const,
    league: 'World Cup',
    leagueId: FIFA_WORLD_CUP_LEAGUE_ID,
    date: '2026-06-15T20:00:00Z',
  };

  const otherLive = {
    id: 'other-live',
    homeTeam: 'Spain',
    awayTeam: 'Germany',
    homeTeamId: 9,
    awayTeamId: 8,
    status: 'Live' as const,
    league: 'Friendly',
    leagueId: 667,
    date: '2026-06-15T19:00:00Z',
  };

  it('classifies club live before world cup live', () => {
    assert.equal(classifyInsightPickTier(clubLive, ctx), 'club-live');
    assert.equal(classifyInsightPickTier(wcLive, ctx), 'world-cup-live');
    assert.equal(classifyInsightPickTier(otherLive, ctx), null);
  });

  it('pickAiInsightMatch prefers club live over WC live', () => {
    const picked = pickAiInsightMatch({
      activeTab: 'live',
      filteredLiveMatches: [wcLive, otherLive, clubLive],
      featuredUpcomingMatch: null,
      ctx,
    });
    assert.equal(picked?.id, 'club-live');
  });

  it('pickAiInsightMatch falls back to WC live when no club live', () => {
    const picked = pickAiInsightMatch({
      activeTab: 'live',
      filteredLiveMatches: [wcLive, otherLive],
      featuredUpcomingMatch: null,
      ctx: { ...ctx, favoriteClubApiIds: new Set() },
    });
    assert.equal(picked?.id, 'wc-live');
  });

  it('buildInsightCandidateOrder starts club live then WC live', () => {
    const order = buildInsightCandidateOrder([wcLive, otherLive, clubLive], [], ctx);
    assert.equal(order[0]?.id, 'club-live');
    assert.equal(order[1]?.id, 'wc-live');
  });
});
