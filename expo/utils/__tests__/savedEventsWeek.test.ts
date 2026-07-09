import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LocalEvent } from '@/types/events';
import {
  findMultiEventDays,
  groupSavedEventsByDay,
  buildCombinedNightOutPlan,
} from '@/utils/savedEventsWeek';

function baseEvent(overrides: Partial<LocalEvent> = {}): LocalEvent {
  return {
    id: 'evt-1',
    title: 'Sample',
    venue: 'Venue',
    location: 'London',
    date: '',
    time: '',
    category: 'music',
    price: '£20+',
    image: 'https://example.com/img.jpg',
    isSaved: true,
    attendees: 0,
    rating: 4.5,
    tags: [],
    description: '',
    latitude: 51.5,
    longitude: -0.12,
    startIso: '2026-07-12T19:00:00',
    ...overrides,
  };
}

describe('savedEventsWeek', () => {
  it('groups upcoming saved events by day', () => {
    const referenceMs = new Date('2026-07-10T12:00:00').getTime();
    const groups = groupSavedEventsByDay(
      [
        baseEvent({ id: 'a', startIso: '2026-07-10T20:00:00', title: 'Comedy' }),
        baseEvent({ id: 'b', startIso: '2026-07-12T19:00:00', title: 'Jazz' }),
        baseEvent({ id: 'c', startIso: '2026-07-12T21:30:00', title: 'Club' }),
      ],
      { referenceMs },
    );

    assert.equal(groups.length, 2);
    assert.equal(groups[0]?.relativeLabel, 'Tonight');
    assert.equal(groups[1]?.events.length, 2);
  });

  it('finds days with multiple events', () => {
    const referenceMs = new Date('2026-07-10T12:00:00').getTime();
    const multi = findMultiEventDays([
      baseEvent({ id: 'a', startIso: '2026-07-12T19:00:00' }),
      baseEvent({ id: 'b', startIso: '2026-07-12T22:00:00' }),
      baseEvent({ id: 'c', startIso: '2026-07-13T20:00:00' }),
    ]);
    assert.equal(multi.length, 1);
    assert.equal(multi[0]?.events.length, 2);
  });

  it('builds a combined night-out plan for stacked events', () => {
    const steps = buildCombinedNightOutPlan([
      baseEvent({ id: 'a', startIso: '2026-07-12T19:00:00', title: 'Early gig' }),
      baseEvent({ id: 'b', startIso: '2026-07-12T22:00:00', title: 'Late set' }),
    ]);
    assert.ok(steps.length > 4);
    assert.ok(steps.some((step) => step.title.includes('Travel to next venue')));
  });
});
