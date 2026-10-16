import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isUsableTicketLink } from '../eventTicketLinks';
import { mapTicketmasterSingleResponse } from '../ticketmasterTransform';

describe('Safe provider ticket links', () => {
  it('accepts ordinary HTTPS ticket links', () => {
    assert.equal(isUsableTicketLink('https://www.ticketmaster.co.uk/event/123?foo=bar'), true);
    assert.equal(isUsableTicketLink('https://www.skiddle.com/whats-on/123'), true);
  });
  it('rejects insecure, malformed, local, or arbitrary links', () => {
    for (const value of ['javascript:alert(1)', 'http://example.org', 'https://localhost:8000', 'https://127.0.0.1',
      'https://10.0.0.1', 'https://demo.internal', 'https://admin:pass@example.org', 'https://example.org:444', 'invalid']) {
      assert.equal(isUsableTicketLink(value), false, value);
    }
  });
});

describe('Accurate ticket-price labels', () => {
  it('picks the cheapest of genuine ranges', () => {
    const base = {
      id: 'Price', name: 'Event', dates: { start: { localDate: '2026-11-12', localTime: '19:00:00' } },
      _embedded: { venues: [{ name: 'Hall', location: { latitude: '53.48', longitude: '-2.24' } }] },
    };
    const price = mapTicketmasterSingleResponse({ ...base, priceRanges: [
      { min: 65, currency: 'GBP' }, { min: 24, currency: 'GBP' },
    ] });
    assert.equal(price?.price, '£24+');
    const unknownCurrency = mapTicketmasterSingleResponse({ ...base, priceRanges: [{ min: 1000, currency: 'JPY' }] });
    assert.equal(unknownCurrency?.price, 'See tickets');
  });
});
