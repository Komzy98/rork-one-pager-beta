import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  boostEventsForConciergeContext,
  buildEventConciergeNarrative,
} from '@/utils/eventConcierge';
import type { LocalEvent } from '@/types/events';

const baseEvent = (overrides: Partial<LocalEvent> = {}): LocalEvent => ({
  id: '1',
  title: 'Test Event',
  venue: 'Venue',
  location: 'London',
  date: 'Sat, 12 Apr',
  time: '20:00',
  category: 'music',
  price: '£20',
  image: '',
  isSaved: false,
  attendees: 0,
  rating: 4.5,
  tags: [],
  description: '',
  latitude: 51.5,
  longitude: -0.1,
  ...overrides,
});

describe('eventConcierge', () => {
  it('builds a compact concierge narrative with calendar context', () => {
    const tomorrow = new Date('2026-07-07T09:00:00');
    const tomorrowEnd = new Date('2026-07-07T10:00:00');

    const narrative = buildEventConciergeNarrative({
      profileName: 'Joshua Smith',
      now: new Date('2026-07-06T20:00:00'),
      calendarEvents: [
        {
          startDate: tomorrow,
          endDate: tomorrowEnd,
          title: 'Team standup',
        },
      ],
    });

    assert.match(narrative.greeting, /Good evening, Joshua/i);
    assert.match(narrative.summarySentence, /low-effort plan to get you out tomorrow/i);
    assert.equal(narrative.context, 'default');
  });

  it('uses rainy context for indoor summary copy', () => {
    const narrative = buildEventConciergeNarrative({
      profileName: 'Joshua',
      weather: { isRaining: true, isDayTime: true },
    });
    assert.equal(narrative.context, 'rainy');
    assert.match(narrative.summarySentence, /indoor/i);
  });

  it('boosts indoor events when rainy', () => {
    const ranked = boostEventsForConciergeContext(
      [
        baseEvent({ id: 'out', category: 'fitness', title: 'Run club' }),
        baseEvent({ id: 'in', category: 'comedy', title: 'Comedy night' }),
      ],
      'rainy',
    );
    assert.equal(ranked[0]?.id, 'in');
  });

  it('uses busy week summary when calendar is packed', () => {
    const now = new Date('2026-07-06T12:00:00');
    const events = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(now);
      start.setDate(start.getDate() + i);
      start.setHours(10, 0, 0, 0);
      const end = new Date(start);
      end.setHours(11, 0, 0, 0);
      return { startDate: start, endDate: end, title: `Meeting ${i}` };
    });
    const narrative = buildEventConciergeNarrative({
      profileName: 'Joshua',
      now,
      calendarEvents: events,
      calendarEventsThisWeek: 12,
    });
    assert.equal(narrative.context, 'busy_week');
    assert.match(narrative.summarySentence, /relaxing pick|low-effort unwind/i);
  });
});
