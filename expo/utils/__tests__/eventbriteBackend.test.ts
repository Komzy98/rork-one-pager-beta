import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { verifyEventbriteAuthentication, fetchOwnPublicEventbriteEvents } from '@/backend/utils/eventbrite';

describe('Eventbrite backend integration', () => {
  it('authenticates using server-side bearer token', async () => {
    const fetcher = (async (_url: string, options: { headers: { Authorization: string } }) => {
      assert.equal(options.headers.Authorization, 'Bearer TEST_TOKEN');
      return { ok: true, json: async () => ({ id: 'user-1' }) };
    }) as unknown as typeof fetch;
    assert.deepEqual(await verifyEventbriteAuthentication('TEST_TOKEN', fetcher), { id: 'user-1', connected: true });
  });
  it('returns no events without an authorised organisation', async () => {
    const fetcher = (async (url: string) => {
      assert.ok(url.endsWith('/users/me/organizations/'));
      return { ok: true, json: async () => ({ organizations: [] }) };
    }) as unknown as typeof fetch;
    assert.deepEqual(await fetchOwnPublicEventbriteEvents('TEST_TOKEN', fetcher), []);
  });
  it('excludes unlisted and non-live organisation events', async () => {
    const fetcher = (async (url: string) => ({ ok: true, json: async () =>
      url.endsWith('/users/me/organizations/')
        ? { organizations: [{ id: '12345' }] }
        : { events: [
            { id: '1', listed: true, status: 'live', url: 'https://www.eventbrite.com/e/1' },
            { id: '2', listed: false, status: 'live', url: 'https://www.eventbrite.com/e/2' },
            { id: '3', listed: true, status: 'draft', url: 'https://www.eventbrite.com/e/3' },
          ], pagination: { has_more_items: false } }
    })) as unknown as typeof fetch;
    assert.deepEqual((await fetchOwnPublicEventbriteEvents('TEST_TOKEN', fetcher)).map(e => e.id), ['1']);
  });
});
