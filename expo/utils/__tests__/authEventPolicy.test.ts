import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldClearCachedIdentity } from '@/utils/authEventPolicy';

describe('auth state isolation', () => {
  it('retains cached app identity after an unsolicited SDK signout', () => {
    assert.equal(shouldClearCachedIdentity('SIGNED_OUT', false), false);
  });
  it('clears cached identity after explicit logout', () => {
    assert.equal(shouldClearCachedIdentity('SIGNED_OUT', true), true);
  });
  it('never treats a routine session refresh as logout', () => {
    assert.equal(shouldClearCachedIdentity('TOKEN_REFRESHED', false), false);
    assert.equal(shouldClearCachedIdentity('SIGNED_IN', true), false);
  });
});
