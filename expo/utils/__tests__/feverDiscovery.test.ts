import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  feverSessionUtc, mapFeverEvent, filterFeverEvents, FeverMcpClient, fetchFeverEvents,
} from '@/backend/services/feverDiscovery';

const venue = {
  name: 'Manchester Cathedral',
  latitude: 53.485, longitude: -2.244, city: 'Manchester', countryCode: 'GB',
};
const event = {
  id: 49030, name: 'Candlelight: Vivaldi in Manchester',
  url: 'https://feverup.com/m/49030',
  cover_image_url: 'https://feverup.com/image.jpg',
  price: 'From £25', location: 'Manchester Cathedral, Manchester',
  session_start_times: ['2026-11-05T19:00:00'], timezone: 'Europe/London',
  description: 'Live classical music',
};

describe('Fever event discovery', () => {
  it('converts zone-naive UK winter and summer sessions correctly', () => {
    assert.equal(feverSessionUtc('2026-11-05T19:00:00', 'Europe/London'), '2026-11-05T19:00:00.000Z');
    assert.equal(feverSessionUtc('2026-07-05T19:00:00', 'Europe/London'), '2026-07-05T18:00:00.000Z');
    assert.equal(feverSessionUtc('bad', 'Europe/London'), null);
  });

  it('maps only geographically verified upcoming events and keeps ticket source', () => {
    const converted = mapFeverEvent(event, [venue], Date.parse('2026-10-15T00:00:00Z'));
    assert.ok(converted);
    assert.equal(converted.id, 'fv-49030');
    assert.equal(converted.listingSource, 'fever');
    assert.equal(converted.category, 'music');
    assert.equal(converted.latitude, venue.latitude);
    assert.equal(converted.longitude, venue.longitude);
    assert.equal(converted.startIso, '2026-11-05T19:00:00.000Z');
    assert.equal(converted.ticketUrl, 'https://feverup.com/m/49030');
    assert.equal(converted.marketCode, 'GB');
  });

  it('does not fake venue coordinates or accept untrusted ticket URLs', () => {
    const today = Date.parse('2026-10-15T00:00:00Z');
    assert.equal(mapFeverEvent(event, [], today), null);
    assert.equal(mapFeverEvent({ ...event, url: 'https://example.org/event' }, [venue], today), null);
    assert.equal(mapFeverEvent({ ...event, location: 'Other Hall, Manchester' }, [venue], today), null);
    assert.equal(mapFeverEvent({ ...event, session_start_times: ['2025-01-01T20:00:00'] }, [venue], today), null);
  });

  it('filters by actual geographical distance and category', () => {
    const e = mapFeverEvent(event, [venue], Date.parse('2026-10-15T00:00:00Z'))!;
    assert.equal(filterFeverEvents([e], { latitude: 53.48, longitude: -2.25, radiusMiles: 10, size: 10 }).length, 1);
    assert.equal(filterFeverEvents([e], { latitude: 51.5, longitude: -0.12, radiusMiles: 10, size: 10 }).length, 0);
    assert.equal(filterFeverEvents([e], { latitude: 53.48, longitude: -2.25, radiusMiles: 10, size: 10, category: 'food' }).length, 0);
  });

  it('uses OAuth M2M and the official MCP protocol rather than scraping Fever pages', async () => {
    const previous = globalThis.fetch;
    const methods: string[] = [];
    globalThis.fetch = async (url, options) => {
      if (String(url).includes('/oauth/token')) return new Response(
        JSON.stringify({ access_token: 'test-only-access', expires_in: 3600 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
      const body = JSON.parse(String(options?.body ?? '{}'));
      methods.push(body.method);
      assert.equal(new Headers(options?.headers).get('authorization'), 'Bearer test-only-access');
      if (body.method === 'initialize') return new Response(
        JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { protocolVersion: '2025-06-18', capabilities: {} } }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'mcp-session-id': 'test-session' } },
      );
      assert.equal(new Headers(options?.headers).get('mcp-session-id'), 'test-session');
      if (body.method === 'notifications/initialized') return new Response(null, { status: 202 });
      return new Response(JSON.stringify({
        jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: '{"results":[]}' }] },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    try {
      const client = new FeverMcpClient({ clientId: 'mock', clientSecret: 'mock-secret', audience: 'mock-audience' });
      await client.open();
      assert.deepEqual(await client.call('search_events', { latitude: 53.48, longitude: -2.25 }), { results: [] });
      assert.deepEqual(methods, ['initialize', 'notifications/initialized', 'tools/call']);
    } finally {
      globalThis.fetch = previous;
    }
  });
  it('retrieves events and venues together and normalises a validated listing', async () => {
    const previous = globalThis.fetch;
    const futureEvent = {
      ...event, id: 49100, name: 'Candlelight: Mozart',
      session_start_times: ['2031-11-05T19:00:00'],
    };
    globalThis.fetch = async (url, options) => {
      if (String(url).includes('/oauth/token')) return new Response(
        JSON.stringify({ access_token: 'sample-token', expires_in: 3600 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
      const body = JSON.parse(String(options?.body ?? '{}'));
      if (body.method === 'initialize') return new Response(
        JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { protocolVersion: '2025-06-18' } }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'mcp-session-id': 'fever-mock' } },
      );
      if (body.method === 'notifications/initialized') return new Response(null, { status: 202 });
      const name = body.params?.name;
      const records = name === 'search_events'
        ? { count: 1, results: [futureEvent] }
        : { count: 1, results: [{ name: venue.name, latitude: venue.latitude,
            longitude: venue.longitude, location: 'Manchester, UK', country_code: 'GB' }] };
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { structuredContent: records } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    try {
      const events = await fetchFeverEvents({ latitude: 53.48, longitude: -2.25, radiusMiles: 25, size: 20 },
        { clientId: 'test-fixture', clientSecret: 'test-secret', audience: 'fixture-api' });
      assert.equal(events.length, 1);
      assert.equal(events[0].id, 'fv-49100');
      assert.equal(events[0].latitude, 53.485);
    } finally { globalThis.fetch = previous; }
  });
});
