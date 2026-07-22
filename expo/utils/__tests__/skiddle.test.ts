import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeDiscoveryEvents } from '../mergeDiscoveryEvents.ts';
import { buildSkiddleEventsSearchUrl, parseSkiddleError } from '../skiddleQuery.ts';
import { mapSkiddleEvent, mapSkiddleResponse, mapSkiddleSingleResponse } from '../skiddleTransform.ts';

describe('skiddleQuery', () => {
  it('builds a geo search URL with date window', () => {
    const url = buildSkiddleEventsSearchUrl({
      apiKey: 'test-key',
      latitude: 51.5074,
      longitude: -0.1278,
      radiusMiles: 25,
      limit: 20,
      eventCode: 'LIVE',
    });
    assert.match(url, /^https:\/\/www\.skiddle\.com\/api\/v1\/events\/search\/\?/);
    assert.match(url, /api_key=test-key/);
    assert.match(url, /latitude=51\.5074/);
    assert.match(url, /longitude=-0\.1278/);
    assert.match(url, /radius=25/);
    assert.match(url, /eventcode=LIVE/);
    assert.match(url, /minDate=/);
    assert.match(url, /maxDate=/);
    assert.match(url, /order=date/);
  });

  it('includes keyword for global artist search', () => {
    const url = buildSkiddleEventsSearchUrl({
      apiKey: 'test-key',
      latitude: 51.5074,
      longitude: -0.1278,
      radiusMiles: 100,
      limit: 40,
      keyword: 'Bill Burr',
    });
    assert.match(url, /keyword=Bill\+Burr|keyword=Bill%20Burr/);
  });

  it('parses Skiddle error payloads', () => {
    assert.equal(parseSkiddleError({ error: 1, errormessage: 'Invalid API key' }), 'Invalid API key');
    assert.equal(parseSkiddleError({ error: 0 }), null);
  });
});

describe('skiddleTransform', () => {
  it('maps a Skiddle event to LocalEvent', () => {
    const event = mapSkiddleEvent({
      id: '42259333',
      eventname: 'The World Cup @ The Crown & Sceptre W1',
      EventCode: 'SPORT',
      description: 'Watch the 2026 World Cup',
      link: 'https://www.skiddle.com/whats-on/example/',
      startdate: '2026-06-11T17:00:00+00:00',
      entryprice: 'Free',
      largeimageurl: 'https://example.com/image.jpg',
      venue: {
        name: 'The Crown And Sceptre',
        town: 'London',
        latitude: 51.519322,
        longitude: -0.1407566,
      },
    });

    assert.ok(event);
    assert.equal(event!.id, 'sk-42259333');
    assert.equal(event!.category, 'sports');
    assert.equal(event!.price, 'Free');
    assert.equal(event!.venue, 'The Crown And Sceptre');
    assert.equal(event!.startIso, '2026-06-11T17:00:00+00:00');
  });

  it('maps search response envelopes', () => {
    const events = mapSkiddleResponse({
      error: 0,
      results: [
        {
          id: '1',
          eventname: 'Comedy Night',
          EventCode: 'COMEDY',
          startdate: '2026-08-01T20:00:00+00:00',
          venue: { name: 'Club', town: 'Manchester', latitude: 53.48, longitude: -2.24 },
        },
      ],
    });
    assert.equal(events.length, 1);
    assert.equal(events[0]?.category, 'comedy');
  });

  it('maps single-event detail payloads where results is an object', () => {
    const event = mapSkiddleSingleResponse({
      error: 0,
      totalcount: 1,
      results: {
        id: '42074855',
        eventname: 'One Pound Comedy || Creatures Comedy Club',
        startdate: '2026-07-08T17:45:00+00:00',
        venue: {
          name: 'Creatures Comedy Club',
          town: 'Manchester',
          latitude: 53.4832089,
          longitude: -2.2346888,
        },
      },
    });
    assert.ok(event);
    assert.equal(event!.id, 'sk-42074855');
    assert.equal(event!.title, 'One Pound Comedy || Creatures Comedy Club');
  });
});

describe('mergeDiscoveryEvents', () => {
  it('dedupes near-identical events from multiple providers', () => {
    const base = {
      title: 'Comedy Night',
      venue: 'The Club',
      location: 'London',
      date: 'Sat, 12 Jul',
      time: '20:00',
      category: 'comedy',
      price: '£10+',
      image: '',
      isSaved: false,
      attendees: 0,
      rating: 4.5,
      tags: [] as string[],
      description: '',
      latitude: 51.5,
      longitude: -0.1,
      startIso: '2026-07-12T20:00:00',
    };

    const merged = mergeDiscoveryEvents(
      [
        [{ ...base, id: 'tm-1' }],
        [{ ...base, id: 'sk-2', title: 'Comedy Night' }],
      ],
      10,
    );

    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.id, 'tm-1');
  });
});
