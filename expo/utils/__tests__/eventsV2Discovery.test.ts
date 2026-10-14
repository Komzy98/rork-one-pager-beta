import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { curateDiscoveryEvents, isAffordableEvent, isPastListing, isWeekendEvent } from '../eventsV2Discovery';
import type { LocalEvent } from '@/types/events';

const listing = (overrides: Partial<LocalEvent> = {}): LocalEvent => ({
  id: 'tm-1',
  title: 'Stand-up Comedy',
  venue: 'Comedy Club',
  location: 'Manchester',
  date: 'Fri, 16 Oct',
  time: '19:00',
  category: 'comedy',
  price: '£15',
  image: '',
  isSaved: false,
  attendees: 0,
  rating: 0,
  tags: [],
  description: '',
  latitude: 53.48,
  longitude: -2.24,
  startIso: '2026-10-16T19:00:00Z',
  ...overrides,
});

describe('Events V2 discovery quality', () => {
  const now = Date.parse('2026-10-14T12:00:00Z');
  it('keeps separate shows and removes cross-provider duplicates', () => {
    const a = listing();
    const duplicate = listing({ id: 'skiddle-2', title: 'STAND UP comedy!' });
    const anotherShow = listing({ id: 'tm-3', startIso: '2026-10-17T19:00:00Z' });
    assert.deepEqual(curateDiscoveryEvents([a, duplicate, anotherShow], now).map(e => e.id), ['tm-1', 'tm-3']);
  });
  it('removes expired confirmed timestamps but retains ambiguous dates', () => {
    assert.equal(isPastListing(listing({ startIso: '2026-10-01T18:00:00Z' }), now), true);
    assert.equal(curateDiscoveryEvents([listing({ startIso: undefined }), listing({ id: 'old', startIso: '2026-10-01T18:00:00Z' })], now).length, 1);
  });
  it('filters budget without treating missing prices as free', () => {
    assert.equal(isAffordableEvent(listing({price:'Free'})), true);
    assert.equal(isAffordableEvent(listing({price:'From £19.50'})), true);
    assert.equal(isAffordableEvent(listing({price:'£35'})), false);
    assert.equal(isAffordableEvent(listing({price:'See tickets'})), false);
  });
  it('picks upcoming Friday–Sunday listings', () => {
    assert.equal(isWeekendEvent(listing(), new Date(now)), true);
    assert.equal(isWeekendEvent(listing({startIso:'2026-10-19T19:00:00Z'}), new Date(now)), false);
  });
});
