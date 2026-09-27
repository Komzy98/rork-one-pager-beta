import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getHabitEngineSnapshot, rankHabitEngineInterventions } from '../habitEngine';
import type { Task } from '@/types/task';

function habit(overrides: Partial<Task> = {}): Task {
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
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    completionLogs: [],
    progress: 0,
    isRecurring: false,
    isHabit: true,
    habitFrequency: { type: 'specific_days', days: [0,1,2,3,4,5,6] },
    habitCompletions: {},
    habitStreak: 0,
    ...overrides,
  };
}

describe('Habit Engine', () => {
  it('surfaces the fallback when the preferred window has passed', () => {
    const task = habit({
      habitEngine: {
        anchor: 'After work',
        windowStart: '17:30',
        windowEnd: '19:30',
        fallback: '20-minute home workout',
      },
    });
    const snapshot = getHabitEngineSnapshot(task, new Date('2026-09-27T20:00:00'));
    assert.equal(snapshot.overdueWindow, true);
    assert.equal(snapshot.nextActionLabel, 'Use fallback');
    assert.match(snapshot.guidance, /20-minute home workout/i);
  });

  it('recognises when the habit window is open', () => {
    const task = habit({
      habitEngine: { windowStart: '17:30', windowEnd: '19:30' },
    });
    const snapshot = getHabitEngineSnapshot(task, new Date('2026-09-27T18:00:00'));
    assert.equal(snapshot.dueNow, true);
    assert.equal(snapshot.nextActionLabel, 'Do it now');
  });

  it('ranks a due-now habit ahead of an unconfigured habit', () => {
    const due = habit({
      id: 'due',
      habitEngine: { windowStart: '17:00', windowEnd: '19:00' },
    });
    const later = habit({ id: 'later', title: 'Read' });
    const ranked = rankHabitEngineInterventions([later, due], new Date('2026-09-27T18:00:00'));
    assert.equal(ranked[0]?.task.id, 'due');
  });
});
