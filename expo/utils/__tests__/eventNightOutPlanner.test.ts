import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildNightOutPlan } from '@/utils/eventNightOutPlanner';
import type { LocalEvent } from '@/types/events';

function theatreEvent(overrides: Partial<LocalEvent> = {}): LocalEvent {
  return {
    id: 'tm-test',
    title: 'Dracula',
    venue: 'Orpheum Theatre',
    location: 'San Francisco, CA',
    date: 'Wed 8 Jul',
    time: '19:00',
    startIso: '2026-07-08T19:00:00',
    category: 'theatre',
    price: '£40',
    image: '',
    isSaved: true,
    attendees: 0,
    rating: 4.5,
    tags: [],
    description: '',
    latitude: 0,
    longitude: 0,
    distanceKm: 25,
    ...overrides,
  };
}

describe('eventNightOutPlanner', () => {
  it('builds a richer theatre timeline', () => {
    const steps = buildNightOutPlan(theatreEvent());
    const titles = steps.map((s) => s.title);

    assert.ok(titles.includes('Leave home'));
    assert.ok(titles.includes('Arrive at venue'));
    assert.ok(titles.includes('Curtain up'));
    assert.ok(titles.includes('Interval'));
    assert.ok(titles.includes('Show ends'));
    assert.ok(titles.some((t) => /train|bus|ride|tube/i.test(t)));
    assert.ok(titles.includes('Home by'));
    assert.equal(steps.find((s) => s.kind === 'doors')?.timeLabel, '19:00');
  });

  it('suggests a ride home for very late finishes', () => {
    const steps = buildNightOutPlan(
      theatreEvent({
        time: '22:30',
        category: 'nightlife',
      }),
    );
    const transit = steps.find((s) => s.kind === 'transit');
    assert.ok(transit);
    assert.match(transit!.title, /ride home/i);
  });

  it('includes pre-event stop for evening plans', () => {
    const steps = buildNightOutPlan(
      theatreEvent({
        category: 'comedy',
        time: '20:00',
      }),
    );
    assert.ok(steps.some((s) => s.kind === 'pre'));
  });

  it('orders pre-show before doors and leaves early enough to arrive', () => {
    const steps = buildNightOutPlan(
      theatreEvent({
        category: 'music',
        time: '19:00',
        location: 'Manchester',
        distanceKm: undefined,
      }),
    );

    const toMinutes = (label: string) => {
      const [h, m] = label.split(':').map(Number);
      return h * 60 + m;
    };

    const leave = steps.find((s) => s.kind === 'leave')!;
    const pre = steps.find((s) => s.kind === 'pre')!;
    const arrive = steps.find((s) => s.kind === 'arrive')!;
    const doors = steps.find((s) => s.kind === 'doors')!;

    assert.equal(doors.timeLabel, '19:00');
    assert.equal(pre.timeLabel, '18:10');
    assert.ok(toMinutes(leave.timeLabel) < toMinutes(pre.timeLabel));
    assert.ok(toMinutes(arrive.timeLabel) < toMinutes(pre.timeLabel));
    assert.ok(toMinutes(pre.timeLabel) < toMinutes(doors.timeLabel));

    const leaveIndex = steps.findIndex((s) => s.kind === 'leave');
    const preIndex = steps.findIndex((s) => s.kind === 'pre');
    const doorsIndex = steps.findIndex((s) => s.kind === 'doors');
    assert.ok(leaveIndex < preIndex);
    assert.ok(preIndex < doorsIndex);
  });
});
