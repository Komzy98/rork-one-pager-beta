import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildStepHabitProgress,
  buildStepOpportunity,
  extractStepTarget,
} from '../stepHabitIntelligence';

const habit = (title: string, description = '') => ({ title, description, tags: [] as string[] });

test('extracts common catalogue and custom step targets without inventing a generic target', () => {
  assert.equal(extractStepTarget(habit('10K Steps Daily')), 10000);
  assert.equal(extractStepTarget(habit('Walk 10,000 steps')), 10000);
  assert.equal(extractStepTarget(habit('12k steps')), 12000);
  assert.equal(extractStepTarget(habit('Daily movement', 'My step goal is 8,500')), 8500);
  assert.equal(extractStepTarget(habit('Walk more')), null);
});

test('builds real progress and recognises when the step goal is complete', () => {
  const progress = buildStepHabitProgress(habit('10K Steps Daily'), 6842);
  assert.ok(progress);
  assert.equal(progress.current, 6842);
  assert.equal(progress.target, 10000);
  assert.equal(progress.remaining, 3158);
  assert.equal(progress.completed, false);
  assert.match(progress.label, /6,842 \/ 10,000 steps/);

  const complete = buildStepHabitProgress(habit('10K Steps Daily'), 10421);
  assert.ok(complete);
  assert.equal(complete.completed, true);
  assert.equal(complete.remaining, 0);
  assert.match(complete.detail, /No catch-up walk needed/);
});

test('returns no progress when Health data is unavailable', () => {
  assert.equal(buildStepHabitProgress(habit('10K Steps Daily'), null), null);
  assert.equal(buildStepHabitProgress(habit('Walk more'), 5000), null);
});

test('turns an open window into a contextual step opportunity', () => {
  const progress = buildStepHabitProgress(habit('10K Steps Daily'), 6842);
  const opportunity = buildStepOpportunity({
    progress,
    now: new Date('2026-09-03T17:00:00'),
    freeMinutes: 40,
    nextCommitmentTitle: 'Dinner',
  });

  assert.ok(opportunity);
  assert.ok(opportunity.walkMinutes >= 10 && opportunity.walkMinutes <= 35);
  assert.match(opportunity.text, /6,842 \/ 10,000 steps/);
  assert.match(opportunity.text, /before Dinner/);
});

test('suppresses pointless or punitive walk recommendations', () => {
  const complete = buildStepHabitProgress(habit('10K Steps Daily'), 10100);
  assert.equal(buildStepOpportunity({
    progress: complete,
    now: new Date('2026-09-03T17:00:00'),
    freeMinutes: 40,
  }), null);

  const behind = buildStepHabitProgress(habit('10K Steps Daily'), 2800);
  assert.equal(buildStepOpportunity({
    progress: behind,
    now: new Date('2026-09-03T22:15:00'),
    freeMinutes: 60,
  }), null);
  assert.equal(buildStepOpportunity({
    progress: behind,
    now: new Date('2026-09-03T14:00:00'),
    freeMinutes: 12,
  }), null);
});

test('adapts wording when outdoor conditions are poor', () => {
  const progress = buildStepHabitProgress(habit('10K Steps Daily'), 7600);
  const opportunity = buildStepOpportunity({
    progress,
    now: new Date('2026-09-03T16:00:00'),
    freeMinutes: 35,
    outdoorConditionsPoor: true,
  });
  assert.ok(opportunity);
  assert.match(opportunity.text, /indoor movement/);
});
