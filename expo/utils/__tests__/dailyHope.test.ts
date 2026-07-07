import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyHopeCandidates, pickDailyHope } from '@/utils/dailyHope';

describe('dailyHope', () => {
  it('prioritizes live sport and new episodes', () => {
    const candidates = buildDailyHopeCandidates({
      todayYmd: '2026-06-20',
      joySources: { tvShows: ['Old Show'] },
      sportsBeats: [
        { kind: 'live_now', headline: 'Arsenal vs Chelsea — live now', whenLabel: 'today' },
      ],
      newEpisodes: [{ title: 'The Boys', episodeLabel: 'S4E1' }],
    });

    const picked = pickDailyHope(candidates, '2026-06-20');
    assert.ok(picked);
    assert.ok(
      picked!.headline.includes('live') ||
        picked!.headline.includes('The Boys') ||
        picked!.headline.includes('Arsenal')
    );
    assert.ok(picked!.priority >= 88);
  });

  it('builds joy source headlines with categories', () => {
    const candidates = buildDailyHopeCandidates({
      todayYmd: '2026-06-20',
      joySources: {
        youtubers: ['MKBHD'],
        restaurants: ['Dishoom'],
      },
    });
    assert.ok(candidates.some((c) => c.kind === 'youtube' && c.headline.includes('MKBHD')));
    assert.ok(candidates.some((c) => c.kind === 'restaurant' && c.headline.includes('Dishoom')));
  });
});
