import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  RSVP_ACCOUNT_CHANGED,
  RSVP_SESSION_REQUIRED,
  RSVP_SESSION_UNVERIFIED,
  verifyPlanWriteAuth,
  type PlanWriteAuthAdapter,
  type PlanWriteSession,
} from '../planWriteAuth';

const myId = 'user-a';
const session = (id = myId): NonNullable<PlanWriteSession> => ({
  access_token: 'test-token',
  user: { id },
});

function adapter(overrides: Partial<PlanWriteAuthAdapter> = {}) {
  const calls = { getSession: 0, recover: 0, getUser: 0, refresh: 0 };
  const value: PlanWriteAuthAdapter = {
    getSession: async () => {
      calls.getSession += 1;
      return { data: { session: session() }, error: null };
    },
    recoverSession: async () => {
      calls.recover += 1;
      return session();
    },
    getUser: async () => {
      calls.getUser += 1;
      return { data: { user: { id: myId } }, error: null };
    },
    refreshSession: async () => {
      calls.refresh += 1;
      return { data: { session: session() }, error: null };
    },
    ...overrides,
  };
  return { value, calls };
}

describe('RSVP authorisation guard', () => {
  it('allows a matching, server-verified session without refreshing', async () => {
    const { value, calls } = adapter();
    await verifyPlanWriteAuth(myId, value);
    assert.equal(calls.getUser, 1);
    assert.equal(calls.refresh, 0);
  });

  it('restores a missing session before allowing an RSVP', async () => {
    const { value, calls } = adapter({
      getSession: async () => ({ data: { session: null }, error: null }),
    });
    await verifyPlanWriteAuth(myId, value);
    assert.equal(calls.recover, 1);
  });

  it('never writes on behalf of a cached UI user with no session', async () => {
    const { value, calls } = adapter({
      getSession: async () => ({ data: { session: null }, error: null }),
      recoverSession: async () => null,
    });
    await assert.rejects(verifyPlanWriteAuth(myId, value), {
      message: RSVP_SESSION_REQUIRED,
    });
    assert.equal(calls.getUser, 0);
  });

  it('rejects an active account mismatch', async () => {
    const { value, calls } = adapter({
      getSession: async () => ({ data: { session: session('another-user') }, error: null }),
    });
    await assert.rejects(verifyPlanWriteAuth(myId, value), {
      message: RSVP_ACCOUNT_CHANGED,
    });
    assert.equal(calls.getUser, 0);
  });

  it('refreshes and re-verifies a token that the server rejects', async () => {
    let check = 0;
    const { value, calls } = adapter({
      getUser: async () => {
        check += 1;
        return check === 1
          ? { data: { user: null }, error: { message: 'JWT expired' } }
          : { data: { user: { id: myId } }, error: null };
      },
    });
    await verifyPlanWriteAuth(myId, value);
    assert.equal(calls.refresh, 1);
    assert.equal(check, 2);
  });

  it('rejects a refresh to a different account', async () => {
    const { value } = adapter({
      getUser: async () => ({ data: { user: null }, error: { message: 'expired' } }),
      refreshSession: async () => ({ data: { session: session('other') }, error: null }),
    });
    await assert.rejects(verifyPlanWriteAuth(myId, value), {
      message: RSVP_ACCOUNT_CHANGED,
    });
  });

  it('does not allow an unverified user after refresh', async () => {
    const { value } = adapter({
      getUser: async () => ({ data: { user: null }, error: { message: 'network' } }),
    });
    await assert.rejects(verifyPlanWriteAuth(myId, value), {
      message: RSVP_SESSION_UNVERIFIED,
    });
  });
});
