import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyStackItems, formatDailyStackHeadline } from '@/utils/dailyStack';
import type { UserProfile } from '@/types/habit';

const baseProfile = {
  interests: ['football', 'movies', 'fitness'],
  favoriteTeams: [{ id: 'arsenal', name: 'Arsenal', league: 'Premier League' }],
} as unknown as UserProfile;

describe('dailyStack', () => {
  it('builds items from interests and stats', () => {
    const items = buildDailyStackItems({
      profile: baseProfile,
      habitCount: 3,
      completedHabits: 1,
      continueWatchingTitle: 'Severance',
      partnerCount: 0,
    });
    assert.ok(items.some((i) => i.id === 'habits'));
    assert.ok(items.some((i) => i.id === 'sports'));
    assert.ok(items.some((i) => i.id === 'shows'));
  });

  it('formats a morning headline', () => {
    const items = buildDailyStackItems({
      profile: baseProfile,
      habitCount: 3,
      completedHabits: 0,
      continueWatchingTitle: 'Severance',
    });
    const headline = formatDailyStackHeadline(items);
    assert.match(headline ?? '', /Today:/);
    assert.match(headline ?? '', /Continue Severance/);
  });
});
