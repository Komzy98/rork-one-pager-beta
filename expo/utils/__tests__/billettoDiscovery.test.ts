import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapBillettoPublicEvent, filterBillettoEvents } from '@/backend/services/billettoDiscovery';

const now = Date.parse('2026-10-14T12:00:00Z');
const sample = {
  id: 'abc123',
  title: 'Manchester Food Fest',
  starts_at: '2026-10-23T10:00:00+01:00',
  state: 'published',
  category: { name: 'Arts & Entertainment' },
  venue: { name: 'Manchester Hall', city: 'Manchester', latitude: 53.479, longitude: -2.244 },
  url: 'https://billetto.co.uk/e/manchester-food-fest-tickets-abc123',
  image_url: 'https://billetto.co.uk/media/poster.jpg',
  description: 'A food festival',
};
describe('Billetto public event mapping', () => {
  it('maps upcoming public listings and corrects an obvious food title', () => {
    const e = mapBillettoPublicEvent(sample, now);
    assert.ok(e);
    assert.equal(e.id, 'bl-abc123');
    assert.equal(e.listingSource, 'billetto');
    assert.equal(e.category, 'food');
    assert.equal(e.venue, 'Manchester Hall');
    assert.equal(e.startIso, sample.starts_at);
    assert.equal(e.marketCode, 'GB');
    assert.ok(e.ticketUrl?.startsWith('https://billetto.co.uk/'));
  });
  it('rejects listings with no real coordinates or valid ticket link', () => {
    assert.equal(mapBillettoPublicEvent({ ...sample, venue: { name: 'Manchester Hall' } }, now), null);
    assert.equal(mapBillettoPublicEvent({ ...sample, url: 'https://invalid.example/test' }, now), null);
  });
  it('does not resurface expired events or cancelled events', () => {
    assert.equal(mapBillettoPublicEvent({ ...sample, starts_at: '2026-09-23T10:00:00Z' }, now), null);
    assert.equal(mapBillettoPublicEvent({ ...sample, state: 'cancelled' }, now), null);
  });
  it('filters by coordinates, category and keyword', () => {
    const event = mapBillettoPublicEvent(sample, now)!;
    const local = { latitude: 53.481, longitude: -2.24, radiusMiles: 10, category: 'food' };
    assert.equal(filterBillettoEvents([event], local).length, 1);
    assert.equal(filterBillettoEvents([event], { ...local, category: 'music' }).length, 0);
    assert.equal(filterBillettoEvents([event], { ...local, keyword: 'Jazz' }).length, 0);
    assert.equal(filterBillettoEvents([event], { ...local, latitude: 51.5, longitude: -0.1 }).length, 0);
  });
});
