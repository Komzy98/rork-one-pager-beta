import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LocalEvent } from '@/types/events';
import {
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

  it('rolls networking into tech with a networking sub-tag', () => {
    const normalized = normalizeEventCategories(
      baseEvent({ category: 'tech', title: 'Founder networking meetup' }),
    );
    assert.equal(normalized.category, 'tech');
    assert.equal(normalized.subCategory, 'networking');
    assert.ok(getBentoCategoryId(normalized) === 'tech');
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
});
