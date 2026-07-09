import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatFriendsGoingLabel } from '@/utils/eventSocialProof';

describe('formatFriendsGoingLabel', () => {
  it('returns null when no friends', () => {
    assert.equal(formatFriendsGoingLabel([]), null);
  });

  it('formats one friend', () => {
    assert.equal(
      formatFriendsGoingLabel([{ id: '1', displayName: 'Josh', avatarUrl: null }]),
      'Josh is going',
    );
  });

  it('formats two friends', () => {
    assert.equal(
      formatFriendsGoingLabel([
        { id: '1', displayName: 'Josh', avatarUrl: null },
        { id: '2', displayName: 'Alex', avatarUrl: null },
      ]),
      'Josh and Alex are going',
    );
  });

  it('formats three or more friends', () => {
    assert.equal(
      formatFriendsGoingLabel([
        { id: '1', displayName: 'Joshua', avatarUrl: null },
        { id: '2', displayName: 'Alex', avatarUrl: null },
        { id: '3', displayName: 'Sam', avatarUrl: null },
      ]),
      'Joshua and 2 others are going',
    );
  });
});
