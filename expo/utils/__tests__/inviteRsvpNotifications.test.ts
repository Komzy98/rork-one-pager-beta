import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInviteRsvpNudgeMessage,
  getInviteRsvpNotificationContent,
  parseInviteRsvpNudgeMessage,
} from '@/utils/inviteRsvpNotifications';

describe('inviteRsvpNotifications', () => {
  it('round-trips invite RSVP nudge payloads', () => {
    const message = buildInviteRsvpNudgeMessage({
      responderName: 'Alex',
      status: 'in',
      eventTitle: 'Coldplay',
      eventId: 'tm-abc',
    });
    assert.deepEqual(parseInviteRsvpNudgeMessage(message), {
      responderName: 'Alex',
      status: 'in',
      eventTitle: 'Coldplay',
      eventId: 'tm-abc',
    });
  });

  it('builds status-specific notification copy', () => {
    assert.deepEqual(
      getInviteRsvpNotificationContent({
        responderName: 'Alex',
        status: 'in',
        eventTitle: 'Coldplay at Wembley',
        eventId: 'tm-abc',
      }),
      { title: 'Alex is in!', body: 'Coldplay at Wembley' },
    );
    assert.deepEqual(
      getInviteRsvpNotificationContent({
        responderName: 'Alex',
        status: 'maybe',
        eventTitle: 'Coldplay at Wembley',
        eventId: 'tm-abc',
      }),
      { title: 'Alex might go', body: 'Coldplay at Wembley' },
    );
    assert.deepEqual(
      getInviteRsvpNotificationContent({
        responderName: 'Alex',
        status: 'cant',
        eventTitle: 'Coldplay at Wembley',
        eventId: 'tm-abc',
      }),
      { title: "Alex can't make it", body: 'Coldplay at Wembley' },
    );
  });
});
