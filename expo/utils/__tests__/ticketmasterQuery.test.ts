import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTicketmasterEventsSearchUrl,
  inferTicketmasterCountryCode,
  parseTicketmasterFault,
} from '../ticketmasterQuery.ts';

describe('ticketmasterQuery', () => {
  it('infers GB for London coordinates', () => {
    assert.equal(inferTicketmasterCountryCode(51.5074, -0.1278), 'GB');
  });

  it('builds a Discovery v2 search URL with date window and locale', () => {
    const url = buildTicketmasterEventsSearchUrl({
      apiKey: 'test-key',
      latitude: 51.5074,
      longitude: -0.1278,
      radiusMiles: 25,
      size: 20,
      classificationName: 'Music',
    });
    assert.match(url, /^https:\/\/app\.ticketmaster\.com\/discovery\/v2\/events\.json\?/);
    assert.match(url, /apikey=test-key/);
    assert.match(url, /countryCode=GB/);
    assert.match(url, /locale=en-gb/);
    assert.match(url, /sort=date%2Casc/);
    assert.match(url, /includeTBA=no/);
    assert.match(url, /startDateTime=/);
    assert.match(url, /endDateTime=/);
    assert.match(url, /classificationName=Music/);
  });

  it('includes keyword when searching by artist or title', () => {
    const url = buildTicketmasterEventsSearchUrl({
      apiKey: 'test-key',
      latitude: 40.7128,
      longitude: -74.006,
      radiusMiles: 100,
      size: 40,
      keyword: 'Bill Burr',
    });
    assert.match(url, /keyword=Bill\+Burr|keyword=Bill%20Burr/);
    assert.match(url, /latlong=/);
  });

  it('builds market-wide keyword URL without geo radius', () => {
    const url = buildTicketmasterEventsSearchUrl({
      apiKey: 'test-key',
      latitude: 51.5074,
      longitude: -0.1278,
      radiusMiles: 25,
      size: 20,
      keyword: 'Bill Burr',
      keywordMarketwide: true,
      marketCountryCode: 'US',
    });
    assert.match(url, /countryCode=US/);
    assert.match(url, /keyword=Bill/);
    assert.doesNotMatch(url, /latlong=/);
    assert.doesNotMatch(url, /radius=/);
  });

  it('parses Ticketmaster fault payloads', () => {
    const msg = parseTicketmasterFault({
      fault: {
        faultstring: 'Invalid ApiKey',
        detail: { errorcode: 'oauth.v2.InvalidApiKey' },
      },
    });
    assert.match(msg ?? '', /Invalid ApiKey/);
    assert.match(msg ?? '', /oauth\.v2\.InvalidApiKey/);
  });
});
