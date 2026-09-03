import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildOpenWindows, dedupeEventExperiences, type DiscoverOpportunity } from '@/utils/discoverLifeEngine';
import { pickQuietActivityObservation } from '@/utils/quietSynthesis';
import { getTodayPhase } from '@/utils/todayPhase';

describe('semantic trust guardrails', () => {
  it('splits a long open day into truthful morning, afternoon and evening windows', () => {
    const windows = buildOpenWindows([], null, new Date('2026-09-03T08:00:00'), 0);
    assert.deepEqual(windows.map((window) => window.part), ['morning', 'afternoon', 'evening']);
    assert.equal(windows[0]?.end.getHours(), 12);
    assert.equal(windows[1]?.start.getHours(), 12);
    assert.equal(windows[1]?.end.getHours(), 17);
    assert.equal(windows[2]?.start.getHours(), 17);
  });

  it('labels 16:xx as afternoon and 17:xx as evening', () => {
    assert.equal(getTodayPhase(16).label, 'Afternoon check-in');
    assert.equal(getTodayPhase(17).label, 'Evening');
  });

  it('does not surface generic productivity advice as personal context', () => {
    const generic = pickQuietActivityObservation({
      crossInsights: [],
      recommendations: [{
        id: 'generic',
        type: 'focus',
        title: 'Focus windows',
        description: 'Planned focus windows increase follow-through and reduce context switching.',
        reasoning: 'Planned focus windows increase follow-through and reduce context switching.',
        confidence: 0.95,
        estimatedBenefit: 0.9,
        difficulty: 0.2,
        relatedActivities: [],
        urgencyLabel: 'today',
        createdAt: new Date().toISOString(),
      }],
    });
    assert.equal(generic, null);
  });

  it('keeps grounded contextual advice when it genuinely uses the user situation', () => {
    const grounded = pickQuietActivityObservation({
      crossInsights: [],
      recommendations: [{
        id: 'grounded',
        type: 'focus',
        title: 'Use your open block',
        description: 'Your task fits before your next meeting.',
        reasoning: 'Your highest-priority task fits inside the open window before your next meeting.',
        confidence: 0.95,
        estimatedBenefit: 0.9,
        difficulty: 0.2,
        relatedActivities: [],
        urgencyLabel: 'today',
        createdAt: new Date().toISOString(),
      }],
    });
    assert.equal(grounded, 'Your highest-priority task fits inside the open window before your next meeting.');
  });

  it('collapses repeated performances at the same venue in Discover', () => {
    const event = (id: string, score: number): DiscoverOpportunity => ({
      id,
      key: `event:${id}`,
      kind: 'event',
      title: 'Globe Theatre Tours 2026',
      subtitle: "Shakespeare's Globe",
      eyebrow: 'WORTH GOING OUT FOR',
      reasons: [],
      score,
      route: `/(root)/event/${id}`,
      actionLabel: 'Add to my life',
      accent: '#315ED8',
      event: { id, title: 'Globe Theatre Tours 2026', venue: "Shakespeare's Globe" } as any,
    });
    const rows = dedupeEventExperiences([event('first', 90), event('second', 80)]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.id, 'first');
  });
});
