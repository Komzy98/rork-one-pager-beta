import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type {
  DiscoverEngineResult,
  DiscoverLifeContext,
  DiscoverOpportunity,
} from '@/utils/discoverLifeEngine';
import { selectTimelineEveningOpportunity } from '@/utils/timelineEveningOpportunity';

function context(overrides: Partial<DiscoverLifeContext> = {}): DiscoverLifeContext {
  const now = new Date('2026-09-02T17:45:00');
  return {
    now,
    areaLabel: 'Manchester',
    openWindows: [{
      id: 'all-day-gap',
      start: new Date('2026-09-02T09:00:00'),
      end: new Date('2026-09-02T23:00:00'),
      durationMinutes: 840,
      label: 'This morning',
      rangeLabel: '9:00 am – 11:00 pm',
      part: 'morning',
      isToday: true,
      isWeekend: false,
    }],
    primaryWindow: null,
    taskPressure: {
      score: 20,
      label: 'light',
      urgent: 0,
      high: 0,
      overdue: 0,
      dueToday: 0,
      estimatedMinutes: 30,
    },
    energy: { mode: 'normal', label: 'Normal capacity', peakNow: false, windDown: false },
    weather: { available: true, outdoorFriendly: true },
    interests: ['Comedy'],
    identityGoals: [],
    joyTerms: [],
    signalChips: ['Comedy'],
    recoveryActive: false,
    busyModeActive: false,
    ...overrides,
  };
}

function eventOpportunity(overrides: Partial<DiscoverOpportunity> = {}): DiscoverOpportunity {
  return {
    id: 'event-1',
    key: 'event:event-1',
    kind: 'event',
    title: 'Comedy night',
    subtitle: 'Tonight · 8:00 pm · Northern Quarter',
    eyebrow: 'TONIGHT',
    reasons: ['Because you like comedy'],
    score: 108,
    route: '/(root)/event/event-1',
    actionLabel: 'Add to my life',
    accent: '#315ED8',
    startsAt: new Date('2026-09-02T20:00:00'),
    durationMinutes: 120,
    event: {
      id: 'event-1',
      title: 'Comedy night',
      date: '2026-09-02',
      time: '8:00 PM',
      venue: 'Northern Quarter',
      category: 'comedy',
      distanceKm: 1.6,
    } as any,
    ...overrides,
  };
}

function engine(rows: DiscoverOpportunity[]): DiscoverEngineResult {
  return {
    ranked: rows,
    hero: rows[0] ?? null,
    alternatives: rows.slice(1),
    later: [],
    serendipity: null,
    eventPicks: rows.filter((row) => row.kind === 'event'),
  };
}

describe('Timeline evening opportunity', () => {
  it('finds an exceptional nearby event in the evening part of a long open window', () => {
    const now = new Date('2026-09-02T17:45:00');
    const result = selectTimelineEveningOpportunity({
      context: context(),
      engine: engine([eventOpportunity()]),
      now,
    });

    assert.ok(result);
    assert.equal(result.opportunity.id, 'event-1');
    assert.equal(result.openStart.getHours(), 17);
    assert.equal(result.openEnd.getHours(), 23);
  });

  it('stays quiet when the recommendation is merely decent', () => {
    const result = selectTimelineEveningOpportunity({
      context: context(),
      engine: engine([eventOpportunity({ score: 84 })]),
      now: new Date('2026-09-02T17:45:00'),
    });
    assert.equal(result, null);
  });

  it('stays quiet when the user already has an evening plan', () => {
    const result = selectTimelineEveningOpportunity({
      context: context(),
      engine: engine([eventOpportunity()]),
      hasExistingEveningPlan: true,
      now: new Date('2026-09-02T17:45:00'),
    });
    assert.equal(result, null);
  });

  it('stays quiet when task pressure is heavy or the event is too far away', () => {
    const heavy = selectTimelineEveningOpportunity({
      context: context({ taskPressure: { score: 80, label: 'heavy', urgent: 1, high: 2, overdue: 0, dueToday: 2, estimatedMinutes: 180 } }),
      engine: engine([eventOpportunity()]),
      now: new Date('2026-09-02T17:45:00'),
    });
    assert.equal(heavy, null);

    const far = selectTimelineEveningOpportunity({
      context: context(),
      engine: engine([eventOpportunity({ event: { ...eventOpportunity().event, distanceKm: 18 } as any })]),
      now: new Date('2026-09-02T17:45:00'),
    });
    assert.equal(far, null);
  });
});
