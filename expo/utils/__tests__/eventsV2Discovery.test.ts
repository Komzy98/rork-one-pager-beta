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
  test('keeps separate shows and removes cross-provider duplicates', () => {
    const a = listing();
    const duplicate = listing({ id: 'skiddle-2', title: 'STAND UP comedy!' });
    const anotherShow = listing({ id: 'tm-3', startIso: '2026-10-17T19:00:00Z' });
    expect(curateDiscoveryEvents([a, duplicate, anotherShow], now).map(e => e.id)).toEqual(['tm-1', 'tm-3']);
  });
  test('removes expired confirmed timestamps but retains ambiguous dates', () => {
    expect(isPastListing(listing({ startIso: '2026-10-01T18:00:00Z' }), now)).toBe(true);
    expect(curateDiscoveryEvents([listing({ startIso: undefined }), listing({ id: 'old', startIso: '2026-10-01T18:00:00Z' })], now)).toHaveLength(1);
  });
  test('filters budget without treating missing prices as free', () => {
    expect(isAffordableEvent(listing({price:'Free'}))).toBe(true);
    expect(isAffordableEvent(listing({price:'From £19.50'}))).toBe(true);
    expect(isAffordableEvent(listing({price:'£35'}))).toBe(false);
    expect(isAffordableEvent(listing({price:'See tickets'}))).toBe(false);
  });
  test('picks upcoming Friday–Sunday listings', () => {
    expect(isWeekendEvent(listing(), new Date(now))).toBe(true);
    expect(isWeekendEvent(listing({startIso:'2026-10-19T19:00:00Z'}), new Date(now))).toBe(false);
  });
});
