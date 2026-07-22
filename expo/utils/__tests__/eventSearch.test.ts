import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { LocalEvent } from '@/types/events';
import { rankGlobalSearchResults, rankEventsBySearchKeyword, eventMatchesLocalSearch } from '@/utils/eventSearch';
import { getEventListingBadges } from '@/utils/eventListingMeta';

function mockEvent(partial: Partial<LocalEvent> & Pick<LocalEvent, 'id' | 'title'>): LocalEvent {
  return {
    venue: 'Venue',
    location: 'City',
    date: 'Sat 1 Aug',
    time: '8:00 PM',
    category: 'comedy',
    price: '£20',
    image: '',
    isSaved: false,
    attendees: 0,
    rating: 4.5,
    tags: [],
    description: '',
    latitude: 51.5,
    longitude: -0.12,
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

  it('prefers nearer tour dates when text match is equal', () => {
    const events = [
      mockEvent({
        id: 'tm-us',
        title: 'Bill Burr',
        location: 'Boston',
        distanceKm: 5000,
      }),
      mockEvent({
        id: 'tm-uk',
        title: 'Bill Burr',
        location: 'Manchester',
        distanceKm: 40,
      }),
    ];
    const ranked = rankGlobalSearchResults(events, 'Bill Burr', {
      latitude: 53.48,
      longitude: -2.24,
    });
    assert.equal(ranked[0]?.id, 'tm-uk');
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

  it('matches multi-word queries when tokens appear across fields', () => {
    const event = mockEvent({
      id: '1',
      title: 'Romesh Ranganathan: Work in Progress',
    });
    assert.equal(eventMatchesLocalSearch(event, 'Romesh Ranganathan'), true);
  });
});

describe('eventListingMeta', () => {
  it('labels Skiddle as UK and Ticketmaster US from market code', () => {
    const sk = mockEvent({ id: 'sk-1', title: 'Gig', listingSource: 'skiddle' });
    assert.deepEqual(getEventListingBadges(sk), {
      sourceLabel: 'Skiddle',
      marketBadge: 'UK',
    });

    const tm = mockEvent({
      id: 'tm-1',
      title: 'Show',
      listingSource: 'ticketmaster',
      marketCode: 'US',
    });
    assert.deepEqual(getEventListingBadges(tm), {
      sourceLabel: 'Ticketmaster',
      marketBadge: 'US',
    });
  });
});
