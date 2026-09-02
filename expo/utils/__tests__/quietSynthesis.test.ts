import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { findUpcomingCalendarConflict, pickQuietActivityObservation } from '@/utils/quietSynthesis';

describe('quiet synthesis', () => {
  it('detects a genuine future calendar overlap', () => {
    const now = new Date('2026-09-02T09:00:00');
    const conflict = findUpcomingCalendarConflict([
      { id: 'a', title: 'Design review', start: new Date('2026-09-02T10:00:00'), end: new Date('2026-09-02T11:00:00') },
      { id: 'b', title: 'Customer call', start: new Date('2026-09-02T10:30:00'), end: new Date('2026-09-02T11:30:00') },
    ], now);

    assert.ok(conflict);
    assert.equal(conflict?.overlapMinutes, 30);
    assert.match(conflict?.message ?? '', /Design review overlaps Customer call by 30 min/);
  });

  it('ignores tiny and expired overlaps', () => {
    const now = new Date('2026-09-02T12:00:00');
    assert.equal(findUpcomingCalendarConflict([
      { id: 'past-a', title: 'Past A', start: new Date('2026-09-02T09:00:00'), end: new Date('2026-09-02T10:00:00') },
      { id: 'past-b', title: 'Past B', start: new Date('2026-09-02T09:30:00'), end: new Date('2026-09-02T10:30:00') },
    ], now), null);
  });

  it('only surfaces strong actionable intelligence', () => {
    const weak = pickQuietActivityObservation({
      crossInsights: [{
        id: 'weak',
        title: 'Pattern',
        description: 'Generic observation',
        correlatedActivities: [],
        insight: 'Generic observation',
        actionable: true,
        confidence: 0.6,
        priorityScore: 0.9,
      }],
      recommendations: [],
    });
    assert.equal(weak, null);

    const strong = pickQuietActivityObservation({
      crossInsights: [{
        id: 'strong',
        title: 'Pattern',
        description: 'Your difficult routines tend to cluster after late workdays.',
        correlatedActivities: [],
        insight: 'Your difficult routines tend to cluster after late workdays.',
        actionable: true,
        confidence: 0.9,
        priorityScore: 0.8,
      }],
      recommendations: [],
    });
    assert.equal(strong, 'Your difficult routines tend to cluster after late workdays.');
  });

  it('falls back to a strong timely recommendation when no cross insight qualifies', () => {
    const observation = pickQuietActivityObservation({
      crossInsights: [],
      recommendations: [{
        id: 'rec',
        type: 'focus',
        title: 'Use your open block',
        description: 'A focused block fits before your next meeting.',
        reasoning: 'Your highest-priority task fits inside the open window before your next meeting.',
        confidence: 0.91,
        estimatedBenefit: 0.84,
        difficulty: 0.3,
        relatedActivities: [],
        urgencyLabel: 'today',
        createdAt: new Date().toISOString(),
      }],
    });
    assert.equal(observation, 'Your highest-priority task fits inside the open window before your next meeting.');
  });
});
