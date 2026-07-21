import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPartnerInboxItems, countPartnerInboxTotal } from '@/utils/partnerInbox';
import type { ActivityEvent } from '@/utils/activityService';

const partnerEvent = {
  id: 'e1',
  userId: 'p1',
  type: 'workout',
  title: 'Morning run',
  body: null,
  metadata: {},
  cheersCount: 0,
  createdAt: new Date().toISOString(),
  author: { id: 'p1', username: 'alex', displayName: 'Alex', avatarUrl: null },
  cheeredByMe: false,
} as ActivityEvent;

describe('partnerInbox', () => {
  it('includes unread partner feed rows in the inbox', () => {
    const items = buildPartnerInboxItems({
      incomingRequests: [],
      unreadNudges: [],
      feed: [partnerEvent],
      lastSeenAt: null,
      currentUserId: 'me',
      unreadCheerCount: 0,
    });
    assert.ok(items.some((i) => i.kind === 'partner_activity'));
  });

  it('counts total items for badge overflow', () => {
    const total = countPartnerInboxTotal({
      incomingRequests: [],
      unreadNudges: [{ id: 'n1', createdAt: new Date().toISOString(), message: 'hi', read: false, fromUserId: 'p1', from: null }],
      feed: [partnerEvent, { ...partnerEvent, id: 'e2' }],
      lastSeenAt: null,
      currentUserId: 'me',
      unreadCheerCount: 1,
    });
    assert.equal(total, 4);
  });
});
