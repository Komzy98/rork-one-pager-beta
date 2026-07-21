import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDecisionMoments } from '@/utils/decisionMoments';
import type { ActivityEvent } from '@/utils/activityService';

const partnerWorkout = {
  id: 'evt-1',
  userId: 'partner-1',
  type: 'workout',
  title: 'Morning run',
  body: null,
  metadata: {},
  cheersCount: 0,
  createdAt: `${new Date().toISOString().slice(0, 10)}T08:00:00.000Z`,
  author: { id: 'partner-1', username: 'alex', displayName: 'Alex Kim', avatarUrl: null },
  cheeredByMe: false,
} as ActivityEvent;

describe('decisionMoments', () => {
  it('suggests cheering a partner who completed habits', () => {
    const moments = buildDecisionMoments({
      partnerFeed: [partnerWorkout],
      currentUserId: 'me',
    });
    assert.ok(moments.some((m) => m.kind === 'cheer_partner'));
    assert.match(moments[0]?.headline ?? '', /Alex/);
  });

  it('suggests a walk before an evening match in good weather', () => {
    const moments = buildDecisionMoments({
      now: new Date('2026-06-16T14:00:00'),
      tonightMatchLabel: 'Arsenal vs Chelsea tonight',
      matchKickoffTime: '17:30',
      weather: {
        temp: 18,
        condition: 'Clear',
        description: 'Clear sky',
        isDayTime: true,
        isClear: true,
        isCloudy: false,
        isRaining: false,
        isSnowing: false,
        isStormy: false,
        windSpeed: 4,
        city: 'London',
        isTimeBased: false,
      },
    });
    assert.ok(moments.some((m) => m.kind === 'walk_before_match'));
  });
});
