import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveStartupRoute, type StartupRouteInput } from '../startupRoute.ts';

const baseline: StartupRouteInput = {
  authInitialized: true,
  isAuthenticated: true,
  userId: 'user_1',
  profileLoading: false,
  profileRestoreError: false,
  profile: { id: 'user_1', onboardingCompleted: true },
};

const route = (patch: Partial<StartupRouteInput>) => resolveStartupRoute({ ...baseline, ...patch });

describe('cold launch onboarding gate', () => {
  it('waits for auth initialization, even if cached data is available', () => {
    assert.equal(route({ authInitialized: false }), 'loading');
  });
  it('takes unauthenticated accounts to login, not onboarding', () => {
    assert.equal(route({ isAuthenticated: false }), 'login');
  });
  it('never sends a returning user to onboarding while their profile hydrates', () => {
    assert.equal(route({ profileLoading: true, profile: null }), 'loading');
    assert.equal(route({ profileLoading: true, profile: { id: 'user_1', onboardingCompleted: false } }), 'loading');
  });
  it('waits when the authenticated identity and profile do not match', () => {
    assert.equal(route({ profile: { id: 'other_account', onboardingCompleted: true } }), 'loading');
    assert.equal(route({ userId: undefined }), 'loading');
  });
  it('does not interpret an unavailable profile as fresh onboarding', () => {
    assert.equal(route({ profile: null, profileLoading: false }), 'loading');
  });
  it('shows recovery rather than overwriting setup after a failed load', () => {
    assert.equal(route({ profileRestoreError: true, profile: null }), 'recovery');
    assert.equal(route({ profileRestoreError: true, profile: { id: 'user_1', onboardingCompleted: false } }), 'recovery');
  });
  it('bypasses onboarding for any completed profile, including guests', () => {
    assert.equal(route({}), 'overview');
    assert.equal(route({ userId: 'guest_100', profile: { id: 'guest_100', onboardingCompleted: true } }), 'overview');
  });
  it('starts onboarding only when a fully restored profile is genuinely incomplete', () => {
    assert.equal(route({ profile: { id: 'user_1', onboardingCompleted: false } }), 'onboarding');
    assert.equal(route({ userId: 'guest_101', profile: { id: 'guest_101', onboardingCompleted: false } }), 'onboarding');
  });
});
