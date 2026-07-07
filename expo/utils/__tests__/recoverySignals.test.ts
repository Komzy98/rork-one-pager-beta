import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRecoverySignals, RECOVERY_ENTER_SCORE } from '@/utils/recoverySignals';
import type { Task } from '@/types/task';

function makeHabit(overrides: Partial<Task> = {}): Task {
  return {
    id: 'h1',
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

describe('evaluateRecoverySignals', () => {
  it('returns low score when habits are steady', () => {
    const completions: Record<string, boolean> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(2026, 5, 20 - i);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      completions[ymd] = true;
    }
    const result = evaluateRecoverySignals({
      todayYmd: '2026-06-20',
      habitTasks: [makeHabit({ habitCompletions: completions })],
      allTasks: [],
    });
    assert.ok(result.score < RECOVERY_ENTER_SCORE);
    assert.equal(result.signals.length, 0);
  });

  it('detects habit drop and difficult moods', () => {
    const prior: Record<string, boolean> = {};
    for (let i = 7; i < 14; i++) {
      const d = new Date(2026, 5, 20 - i);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      prior[ymd] = true;
    }
    const result = evaluateRecoverySignals({
      todayYmd: '2026-06-20',
      habitTasks: [
        makeHabit({
          habitCompletions: prior,
          completionLogs: [
            {
              id: '1',
              taskId: 'h1',
              completedAt: '2026-06-19T10:00:00.000Z',
              mood: 'difficult',
            },
            {
              id: '2',
              taskId: 'h1',
              completedAt: '2026-06-18T10:00:00.000Z',
              mood: 'difficult',
            },
          ],
        }),
      ],
      allTasks: [
        {
          ...makeHabit(),
          isHabit: false,
          id: 't1',
          title: 'Overdue',
          dueDate: '2026-06-01',
          status: 'todo',
        } as Task,
        {
          ...makeHabit(),
          isHabit: false,
          id: 't2',
          title: 'Overdue 2',
          dueDate: '2026-06-02',
          status: 'todo',
        } as Task,
        {
          ...makeHabit(),
          isHabit: false,
          id: 't3',
          title: 'Overdue 3',
          dueDate: '2026-06-03',
          status: 'todo',
        } as Task,
      ],
    });
    assert.ok(result.signals.includes('habit_drop'));
    assert.ok(result.score > 0);
  });
});
