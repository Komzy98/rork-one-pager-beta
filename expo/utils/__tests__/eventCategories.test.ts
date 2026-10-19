import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LocalEvent } from '@/types/events';
import { curateDiscoveryEvents } from '@/utils/eventsV2Discovery';
import {
  countEventsByBentoCategory,
  eventMatchesBentoCategory,
  formatBentoCountLabel,
  getBentoCategoryId,
  getLogicalCategoryIds,
  normalizeEventCategories,
} from '@/utils/eventCategories';

function baseEvent(overrides: Partial<LocalEvent> = {}): LocalEvent {
  return {
    id: 'evt-1',
    title: 'Sample',
    venue: 'Venue',
    location: 'London',
    date: 'Fri 12 Jul',
    time: '19:00',
    category: 'music',
    price: '£20+',
    image: 'https://example.com/img.jpg',
    isSaved: false,
    attendees: 0,
    rating: 4.5,
    tags: [],
    description: '',
    latitude: 51.5,
    longitude: -0.12,
    ...overrides,
  };
}

describe('eventCategories', () => {
  it('reclassifies obvious food festivals when a provider calls them arts', () => {
    const corrected = normalizeEventCategories(
      baseEvent({ id: 'sk-900', category: 'arts', title: 'The Manchester Food Fest' }),
    );
    assert.equal(corrected.category, 'food');
    assert.equal(eventMatchesBentoCategory(corrected, 'food'), true);
    assert.equal(eventMatchesBentoCategory(corrected, 'arts'), false);
  });

  it('does not recategorise an art exhibition simply because it serves food', () => {
    const unchanged = normalizeEventCategories(
      baseEvent({ category: 'arts', title: 'Gallery opening', description: 'Food and drinks available' }),
    );
    assert.equal(unchanged.category, 'arts');
  });

  it('rolls family into arts with a family sub-tag', () => {
    const normalized = normalizeEventCategories(
      baseEvent({ category: 'family', title: 'Kids puppet show' }),
    );
    assert.equal(normalized.category, 'arts');
    assert.equal(normalized.subCategory, 'family');
    assert.ok(normalized.tags.includes('family'));
    assert.ok(eventMatchesBentoCategory(normalized, 'arts'));
  });

  it('rolls fitness into sports with a fitness sub-tag', () => {
    const normalized = normalizeEventCategories(
      baseEvent({ category: 'sports', title: 'Sunrise yoga in the park' }),
    );
    assert.equal(normalized.category, 'sports');
    assert.equal(normalized.subCategory, 'fitness');
    assert.ok(getLogicalCategoryIds(normalized).includes('fitness'));
    assert.ok(eventMatchesBentoCategory(normalized, 'sports'));
  });

  it('rolls tech into networking with a tech sub-tag', () => {
    const normalized = normalizeEventCategories(
      baseEvent({ category: 'tech', title: 'AI developer meetup' }),
    );
    assert.equal(normalized.category, 'networking');
    assert.equal(normalized.subCategory, 'tech');
    assert.ok(normalized.tags.includes('tech'));
    assert.ok(eventMatchesBentoCategory(normalized, 'networking'));
  });

  it('keeps pure networking on the networking tile', () => {
    const normalized = normalizeEventCategories(
      baseEvent({ category: 'networking', title: 'Founder networking breakfast' }),
    );
    assert.equal(normalized.category, 'networking');
    assert.equal(normalized.subCategory, undefined);
    assert.ok(getBentoCategoryId(normalized) === 'networking');
  });

  it('maps unknown categories to other', () => {
    const normalized = normalizeEventCategories(
      baseEvent({ category: 'other', title: 'Village market day' }),
    );
    assert.equal(normalized.category, 'other');
    assert.ok(eventMatchesBentoCategory(normalized, 'other'));
    assert.equal(getBentoCategoryId(baseEvent({ category: 'mystery' })), 'other');
  });

  it('formats bento counts with sub-tag highlights', () => {
    const label = formatBentoCountLabel(
      12,
      new Map([
        ['fitness', 3],
        ['family', 2],
      ]),
    );
    assert.match(label, /12 events/);
    assert.match(label, /3 Fitness/);
    assert.match(label, /2 Family/);
  });
  it('counts only distinct, upcoming category listings that are browseable', () => {
    const now = Date.parse('2026-10-19T12:00:00Z');
    const boat = baseEvent({
      id: 'tm-boat', title: 'Manchester Boat Crawl', venue: 'The Wharf',
      category: 'other', startIso: '2026-11-01T19:00:00Z',
    });
    const duplicate = { ...boat, id: 'sk-boat' };
    const past = baseEvent({
      id: 'past-party', title: 'September Party', venue: 'Another Venue',
      category: 'other', startIso: '2026-09-12T19:00:00Z',
    });
    const unique = baseEvent({
      id: 'future-quiz', title: 'Pub Quiz', venue: 'Pub',
      category: 'other', startIso: '2026-11-08T19:00:00Z',
    });

    const browsable = curateDiscoveryEvents([boat, duplicate, past, unique], now);
    const counts = countEventsByBentoCategory(browsable);
    assert.equal(counts.get('other'), 2);
    assert.equal(browsable.filter((event) => eventMatchesBentoCategory(event, 'other')).length, 2);
  });

});
