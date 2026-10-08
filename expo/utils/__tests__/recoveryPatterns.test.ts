import assert from 'node:assert/strict';
import test from 'node:test';
import type { Task } from '@/types/task';
import { detectRecoveryPatternInsight } from '../recoveryPatterns';

function makeHabit(overrides: Partial<Task> = {}): Task {
  return {
    id: 'habit-1',
    title: 'Gym',
    priority: 'medium',
    status: 'todo',
    category: 'health',
    tags: [],
    subTasks: [],
    reminders: [],
    attachments: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    completionLogs: [],
    progress: 0,
    isRecurring: false,
    isHabit: true,
    habitFrequency: { type: 'specific_days', days: [0, 1, 2, 3, 4, 5, 6] },
    habitCompletions: {},
    ...overrides,
  } as Task;
}

test('returns factual week-over-week completion change when evidence is strong', () => {
  const completions: Record<string, boolean> = {
    // Prior window ending 1 Oct: 6/7
    '2026-09-25': true,
    '2026-09-26': true,
    '2026-09-27': true,
    '2026-09-28': true,
    '2026-09-29': true,
    '2026-09-30': true,
    // Recent window ending 8 Oct: 2/7
    '2026-10-07': true,
    '2026-10-08': true,
  };

  const result = detectRecoveryPatternInsight(
    [makeHabit({ title: 'Gym', habitCompletions: completions })],
    '2026-10-08',
  );

  assert.equal(
    result,
    'Your “Gym” completion rate moved from 86% in the previous 7 days to 29% over the last 7 days.',
  );
});

test('does not invent an emotional or wellbeing claim when no material pattern exists', () => {
  const completions: Record<string, boolean> = {};
  for (const date of [
    '2026-09-25','2026-09-27','2026-09-29','2026-10-01',
    '2026-10-02','2026-10-04','2026-10-06','2026-10-08',
  ]) {
    completions[date] = true;
  }

  const result = detectRecoveryPatternInsight(
    [makeHabit({ title: 'Walk outside', habitCompletions: completions })],
    '2026-10-08',
  );

  assert.equal(result, null);
});

test('respects scheduled days instead of treating unscheduled days as misses', () => {
  const completions: Record<string, boolean> = {
    '2026-09-28': true,
    '2026-09-30': true,
    '2026-10-02': true,
    '2026-10-05': true,
    '2026-10-07': true,
  };

  const result = detectRecoveryPatternInsight(
    [
      makeHabit({
        title: 'Strength training',
        habitFrequency: { type: 'specific_days', days: [1, 3, 5] },
        habitCompletions: completions,
      }),
    ],
    '2026-10-08',
  );

  assert.equal(result, null);
});
