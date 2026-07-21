import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { LocalEvent } from '../../types/events.ts';
import { eventMatchesLocalSearch, rankEventsBySearchKeyword } from '../eventSearch.ts';

function mockEvent(partial: Partial<LocalEvent> & Pick<LocalEvent, 'id' | 'title'>): LocalEvent {
  return {
    venue: 'Venue',
    location: 'City',
    latitude: 51.5,
    longitude: -0.12,
    startDate: '2026-08-01T19:00:00Z',
    category: 'music',
    imageUrl: '',
    ticketUrl: '',
    source: 'ticketmaster',
    tags: [],
    price: '£20',
    description: '',
    distanceKm: 10,
    ...partial,
  };
}

describe('eventSearch', () => {
  it('ranks exact title matches first', () => {
    const events = [
      mockEvent({ id: '1', title: 'Comedy Night with Bill Burr' }),
      mockEvent({ id: '2', title: 'Bill Burr: Live' }),
    ];
    const ranked = rankEventsBySearchKeyword(events, 'Bill Burr: Live');
    assert.equal(ranked[0]?.id, '2');
  });

  it('matches artist names in title and tags', () => {
    const event = mockEvent({
      id: '1',
      title: 'Stand-up Showcase',
      tags: ['bill burr', 'comedy'],
    });
    assert.equal(eventMatchesLocalSearch(event, 'bill burr'), true);
    assert.equal(eventMatchesLocalSearch(event, 'jazz'), false);
  });
});
