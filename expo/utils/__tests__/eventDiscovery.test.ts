import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineDistanceKm,
  formatDistanceKm,
  isEventLiveNow,
  filterHappeningNow,
  parseEventStartDateTime,
  filterUpcomingEvents,
  sortEventsByStartDate,
} from '@/utils/eventDiscovery';
import { getFallbackEvents } from '@/constants/mockEvents';
import { mapTicketmasterEvent } from '@/utils/ticketmasterTransform';
import type { LocalEvent } from '@/types/events';

describe('eventDiscovery', () => {
  it('computes distance between two points', () => {
    const km = haversineDistanceKm(51.5074, -0.1278, 51.503, 0.0032);
    assert.ok(km > 0 && km < 20);
  });

  it('formats distances in miles', () => {
    assert.equal(formatDistanceKm(0.4), '0.2 mi');
    assert.equal(formatDistanceKm(2.3), '1.4 mi');
    assert.equal(formatDistanceKm(0.05), 'Nearby');
  });

  it('detects live-now window from startIso', () => {
    const soon = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const event: LocalEvent = {
      id: '1',
      title: 'Test',
      venue: 'V',
      location: 'L',
      date: 'Today',
      time: '20:00',
      category: 'music',
      price: '£10',
      image: '',
      isSaved: false,
      attendees: 0,
      rating: 4,
      tags: [],
      description: '',
      latitude: 0,
      longitude: 0,
      startIso: soon,
    };
    assert.equal(isEventLiveNow(event), true);
  });

  it('filterHappeningNow includes hot and soon events', () => {
    const events: LocalEvent[] = [
      {
        id: 'a',
        title: 'Hot',
        venue: 'V',
        location: 'L',
        date: 'Sat, 1 Jan',
        time: '20:00',
        category: 'music',
        price: '£10',
        image: '',
        isSaved: false,
        attendees: 0,
        rating: 4,
        tags: [],
        description: '',
        latitude: 0,
        longitude: 0,
        isHot: true,
      },
    ];
    assert.equal(filterHappeningNow(events).length, 1);
  });

  it('rolls display-only dates forward to the next occurrence', () => {
    const reference = new Date('2026-07-05T12:00:00').getTime();
    const parsed = parseEventStartDateTime(
      {
        id: '1',
        title: 'Gig',
        venue: 'V',
        location: 'L',
        date: 'Sat, 12 Apr',
        time: '19:30',
        category: 'music',
        price: '£10',
        image: '',
        isSaved: false,
        attendees: 0,
        rating: 4,
        tags: [],
        description: '',
        latitude: 0,
        longitude: 0,
      },
      reference,
    );
    assert.ok(parsed);
    assert.equal(parsed!.getFullYear(), 2027);
    assert.equal(parsed!.getMonth(), 3);
    assert.equal(parsed!.getDate(), 12);
  });

  it('fallback sample events are always in the future', () => {
    const now = new Date('2026-07-05T12:00:00');
    const samples = getFallbackEvents(now);
    const upcoming = filterUpcomingEvents(samples, now.getTime());
    assert.ok(upcoming.length >= 6);
    for (const event of upcoming) {
      if (event.date === 'Ongoing') continue;
      const start = parseEventStartDateTime(event, now.getTime());
      assert.ok(start);
      assert.ok(start!.getTime() >= now.getTime() - 6 * 60 * 60 * 1000);
    }
    const sorted = sortEventsByStartDate(upcoming);
    const timed = sorted.filter((event) => event.date !== 'Ongoing');
    assert.ok(timed.length >= 2);
    assert.ok(
      parseEventStartDateTime(timed[0], now.getTime())!.getTime()
        <= parseEventStartDateTime(timed[timed.length - 1], now.getTime())!.getTime(),
    );
  });
});

describe('ticketmasterTransform', () => {
  it('maps a Ticketmaster event payload', () => {
    const raw = {
      id: 'abc123',
      name: 'Sample Concert',
      url: 'https://ticketmaster.com/event/abc123',
      images: [{ url: 'https://example.com/img.jpg', width: 640 }],
      dates: {
        start: {
          localDate: '2026-08-15',
          localTime: '20:00:00',
          dateTime: '2026-08-15T20:00:00Z',
        },
      },
      priceRanges: [{ min: 25, currency: 'GBP' }],
      classifications: [{ segment: { name: 'Music' }, genre: { name: 'Rock' } }],
      _embedded: {
        venues: [
          {
            name: 'O2 Arena',
            city: { name: 'London' },
            location: { latitude: '51.503', longitude: '0.003' },
          },
        ],
      },
    };

    const event = mapTicketmasterEvent(raw);
    assert.ok(event);
    assert.equal(event!.id, 'tm-abc123');
    assert.equal(event!.category, 'music');
    assert.equal(event!.venue, 'O2 Arena');
    assert.equal(event!.ticketUrl, 'https://ticketmaster.com/event/abc123');
    assert.equal(event!.price, '£25+');
    assert.equal(event!.latitude, 51.503);
  });

  it('returns null when venue coordinates are missing', () => {
    const raw = {
      id: 'x',
      name: 'No coords',
      _embedded: { venues: [{ name: 'Somewhere' }] },
    };
    assert.equal(mapTicketmasterEvent(raw), null);
  });
});
