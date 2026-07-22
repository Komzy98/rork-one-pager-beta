import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  avatarOwnerIdFromPublicUrl,
  avatarPublicUrlMatchesUser,
} from '../avatarUtils.ts';
import { isProfileForUser } from '../sessionProfile.ts';

describe('sessionProfile', () => {
  it('isProfileForUser requires matching ids', () => {
    assert.equal(isProfileForUser({ id: 'a' }, 'a'), true);
    assert.equal(isProfileForUser({ id: 'a' }, 'b'), false);
    assert.equal(isProfileForUser(null, 'a'), false);
  });
});

describe('avatarPublicUrlMatchesUser', () => {
  it('detects mismatched storage owner in public URL', () => {
    const dan = '11111111-1111-1111-1111-111111111111';
    const josh = '22222222-2222-2222-2222-222222222222';
    const url = `https://x.supabase.co/storage/v1/object/public/avatars/${josh}/avatar.jpg`;
    assert.equal(avatarOwnerIdFromPublicUrl(url), josh);
    assert.equal(avatarPublicUrlMatchesUser(dan, url), false);
    assert.equal(avatarPublicUrlMatchesUser(josh, url), true);
  });
});

describe('dataOwnedBySession', () => {
  it('requires exact user id match', () => {
    const fn = (a: string | null, b: string | null) => Boolean(a && b && a === b);
    assert.equal(fn('a', 'a'), true);
    assert.equal(fn('a', 'b'), false);
  });
});
