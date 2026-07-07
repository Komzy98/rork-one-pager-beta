import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getActivityFeedCategory, groupActivityFeed } from '@/utils/activityFeedMeta';
import type { ActivityEvent } from '@/utils/activityService';

const baseEvent = (overrides: Partial<ActivityEvent> = {}): ActivityEvent => ({
  id: '1',
  userId: 'u1',
  type: 'custom',
  title: 'Test',
  body: null,
  metadata: {},
  cheersCount: 0,
  createdAt: new Date().toISOString(),
  author: null,
  cheeredByMe: false,
  ...overrides,
});

describe('activityFeedMeta', () => {
  it('maps event types to going_out category', () => {
    assert.equal(getActivityFeedCategory('event_saved'), 'going_out');
    assert.equal(getActivityFeedCategory('event_planned'), 'going_out');
  });

  it('groups feed items by category', () => {
    const groups = groupActivityFeed([
      baseEvent({ id: 'a', type: 'event_saved', title: 'Saved gig' }),
      baseEvent({ id: 'b', type: 'match_pinned', title: 'Pinned match' }),
      baseEvent({ id: 'c', type: 'workout', title: 'Done yoga' }),
    ]);

    assert.equal(groups.length, 3);
    assert.equal(groups[0]?.category, 'going_out');
    assert.equal(groups[1]?.category, 'watching');
    assert.equal(groups[2]?.category, 'tasks_done');
  });
});
