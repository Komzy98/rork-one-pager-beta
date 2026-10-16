import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapTicketmasterSingleResponse } from '../ticketmasterTransform';
import { mapSkiddleEvent } from '../skiddleTransform';
import { resolveEventPosterUrl } from '../eventPosterImage';
import { getEventCalendarRange } from '../eventDiscovery';

describe('Event provider accuracy', () => {
  it('does not invent a 7 PM Ticketmaster start time', () => {
    const event = mapTicketmasterSingleResponse({
      id: '100', name: 'Timed entry later',
      dates: { start: { localDate: '2026-11-12' }, status: { code: 'onsale' } },
      _embedded: { venues: [{ name: 'Venue', location: { latitude: '53.48', longitude: '-2.24' } }] },
    });
    assert.equal(event?.time, 'Time TBA');
    assert.equal(event?.startIso, undefined);
    assert.equal(event?.image, '');
  });
  it('does not claim an unpriced Skiddle event is free', () => {
    const event = mapSkiddleEvent({
      id: '2', eventname: 'Show', date: '2026-11-12',
      venue: { latitude: 53.48, longitude: -2.24, name: 'Hall' },
    });
    assert.equal(event?.price, 'See tickets');
    assert.equal(event?.image, '');
    assert.equal(event?.time, 'Time TBA');
    assert.equal(event?.startIso, undefined);
  });
  it('uses provider end time for calendar entries rather than assuming two hours', () => {
    const item = mapSkiddleEvent({
      id: 'END', eventname: 'Late Show', startdate: '2026-11-12T19:00:00Z',
      enddate: '2026-11-12T23:30:00Z',
      venue: { name: 'Hall', latitude: 53.48, longitude: -2.24 },
    });
    assert.ok(item);
    assert.equal(getEventCalendarRange(item!)?.end.toISOString(), '2026-11-12T23:30:00.000Z');
  });
  it('rejects the generic event stock photo', () => {
    assert.equal(resolveEventPosterUrl('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600'), '');
  });
});
