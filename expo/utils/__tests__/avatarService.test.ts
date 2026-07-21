import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickPublishedAvatarUrl,
  resolveDisplayAvatarUrl,
  collectAvatarUrlCandidates,
  isRemoteAvatarUrl,
} from '@/utils/avatarUtils';

describe('avatarService', () => {
  it('prefers remote avatar URLs over local file URIs', () => {
    assert.equal(
      pickPublishedAvatarUrl('file:///photo.jpg', 'https://cdn.example.com/a.jpg'),
      'https://cdn.example.com/a.jpg',
    );
  });

  it('does not wipe an existing remote avatar with null', () => {
    assert.equal(
      pickPublishedAvatarUrl('https://cdn.example.com/a.jpg', null),
      'https://cdn.example.com/a.jpg',
    );
  });

  it('resolves display avatar from profile, social, then auth', () => {
    assert.equal(
      resolveDisplayAvatarUrl({
        profileAvatar: 'file:///local.jpg',
        authAvatar: 'https://google.com/p.jpg',
        socialAvatar: 'https://supabase.co/storage/a.jpg',
      }),
      'https://supabase.co/storage/a.jpg',
    );
  });

  it('collects avatar candidates with remotes before locals', () => {
    assert.deepEqual(
      collectAvatarUrlCandidates({
        profileAvatar: 'file:///local.jpg',
        authAvatar: 'https://google.com/p.jpg',
        socialAvatar: 'https://supabase.co/storage/a.jpg',
      }),
      ['https://supabase.co/storage/a.jpg', 'https://google.com/p.jpg', 'file:///local.jpg'],
    );
  });

  it('detects remote avatar URLs', () => {
    assert.equal(isRemoteAvatarUrl('https://example.com/a.png'), true);
    assert.equal(isRemoteAvatarUrl('file:///a.png'), false);
  });
});
