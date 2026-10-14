import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDaysUntilEvent, parseSavedEventStartMs } from '@/utils/eventDiscovery';
import type { LocalEvent } from '@/types/events';

const event = { id: 'test', title: 'Concert', date: 'Thu, 15 Oct', time: '19:00', startIso: '2026-10-15T18:00:00Z', venue: 'Hall', location: 'Manchester', category: 'music', description: '', price: 'Free', image: '', isSaved: false, attendees: 0, rating: 0, tags: [], latitude: 53.48, longitude: -2.24 } as LocalEvent;

describe('event date reliability', () => {
  it('a concert this evening is today, not tomorrow', () => {
    assert.equal(getDaysUntilEvent(event, Date.parse('2026-10-15T09:00:00Z')), 0);
  });
  it('does not roll an expired saved event from 2026 into 2027', () => {
    const ms = parseSavedEventStartMs({ startAt: '2026-09-20T19:00:00Z', dateLabel: 'Sun, 20 Sep', timeLabel: '19:00' }, Date.parse('2026-10-15T09:00:00Z'));
    assert.equal(new Date(ms!).getFullYear(), 2026);
  });
});
