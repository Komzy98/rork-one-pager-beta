import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildGroundedDailySummary } from '@/utils/dailySummary';

describe('daily summary grounding', () => {
  it('uses only verified user actions in the Overview wrap-up', () => {
    const grounded = buildGroundedDailySummary({
      habits: [
        { name: 'Daily Prayer & Devotional', done: true, streak: 3, scheduledToday: true },
        { name: 'Low-Carb Lifestyle', done: true, streak: 2, scheduledToday: true },
        { name: 'Skincare routine', done: true, streak: 1, scheduledToday: true },
        { name: 'Read', done: true, streak: 1, scheduledToday: true },
        { name: '10K Steps Daily', done: false, streak: 4, scheduledToday: true },
      ],
      habitRollup: {
        scheduledCount: 5,
        completedCount: 4,
        incompleteCount: 1,
        incompleteNames: ['10K Steps Daily'],
        ratioLabel: '4/5',
      },
      openItems: ['10K Steps Daily'],
    });

    assert.match(grounded.summary, /You completed 4 of 5 habits today/);
    assert.match(grounded.summary, /Daily Prayer & Devotional and Low-Carb Lifestyle are complete/);
    assert.match(grounded.summary, /10K Steps Daily is still open/);

    assert.equal(grounded.summary.includes('Spain'), false);
    assert.equal(grounded.summary.toLowerCase().includes('boost'), false);
    assert.equal(grounded.summary.toLowerCase().includes('snagged'), false);
    assert.equal(grounded.summary.toLowerCase().includes('tasty'), false);

    assert.deepEqual(grounded.wins.slice(0, 3), [
      'Daily Prayer & Devotional',
      'Low-Carb Lifestyle',
      'Skincare routine',
    ]);
    assert.deepEqual(grounded.challenges, ['10K Steps Daily']);
    assert.deepEqual(grounded.streaks, [
      { name: 'Daily Prayer & Devotional', length: 3 },
      { name: 'Low-Carb Lifestyle', length: 2 },
    ]);
    assert.equal(grounded.sentiment, 'positive');
  });

  it('does not invent progress when there is not enough logged data', () => {
    const grounded = buildGroundedDailySummary({});

    assert.equal(
      grounded.summary,
      "There isn't enough completed activity logged yet to give you a useful wrap-up."
    );
    assert.deepEqual(grounded.wins, []);
    assert.deepEqual(grounded.challenges, []);
    assert.deepEqual(grounded.streaks, []);
    assert.equal(grounded.sentiment, 'neutral');
  });
});
