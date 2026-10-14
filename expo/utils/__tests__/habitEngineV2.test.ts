import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Task } from '@/types/task';
import {
  applyHabitEngineV2Suggestion,
  buildHabitEngineV2Setup,
  getHabitEngineV2Snapshot,
  rankHabitEngineV2Interventions,
  recordHabitEngineV2Completion,
  recordHabitEngineV2Friction,
} from '../habitEngineV2';

function habit(overrides: Partial<Task> = {}): Task {
  return {
    id: 'habit-1',
    title: '5x5 Strength Training',
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
    habitFrequency: { type: 'specific_days', days: [0, 1, 2, 3, 4, 5, 6] },
    habitCompletions: {},
    habitStreak: 0,
    ...overrides,
  };
}

function configured(overrides: Partial<Task> = {}) {
  return habit({
    habitEngine: {
      version: 2,
      anchor: 'After I close my work laptop',
      firstStep: 'Put on gym clothes',
      windowStart: '17:30',
      windowEnd: '19:00',
      minimumVersion: 'One main lift for 10 minutes',
      fallback: '10-minute home workout',
      onboardingCompletedAt: '2026-09-20T18:00:00.000Z',
      automaticityCheckIns: [{ date: '2026-09-20T18:00:00.000Z', score: 2 }],
    },
    ...overrides,
  });
}

describe('Habit Engine V2', () => {
  it('turns an unconfigured habit into an onboarding intervention', () => {
    const snapshot = getHabitEngineV2Snapshot(habit(), new Date('2026-09-27T12:00:00'));
    assert.equal(snapshot.phase, 'Designing');
    assert.equal(snapshot.interventionType, 'setup');
    assert.equal(snapshot.nextActionLabel, 'Set up Habit Engine');
  });

  it('recognises an open context window and gives a concrete action', () => {
    const snapshot = getHabitEngineV2Snapshot(configured(), new Date('2026-09-27T18:00:00'));
    assert.equal(snapshot.dueNow, true);
    assert.equal(snapshot.interventionType, 'act_now');
    assert.equal(snapshot.nextActionLabel, 'Mark done');
    assert.match(snapshot.guidance, /Put on gym clothes/i);
  });

  it('switches to the minimum version after the normal window', () => {
    const snapshot = getHabitEngineV2Snapshot(configured(), new Date('2026-09-27T20:00:00'));
    assert.equal(snapshot.overdueWindow, true);
    assert.equal(snapshot.interventionType, 'minimum');
    assert.match(snapshot.guidance, /One main lift/i);
  });

  it('stores onboarding context and a baseline automaticity check', () => {
    const task = habit();
    const updates = buildHabitEngineV2Setup(task, {
      anchor: 'After breakfast',
      firstStep: 'Open the book',
      windowStart: '07:30',
      windowEnd: '08:00',
      minimumVersion: 'Read one page',
      automaticityBaseline: 2,
    }, new Date('2026-09-27T07:00:00'));
    assert.equal(updates.habitEngine?.version, 2);
    assert.equal(updates.habitEngine?.anchor, 'After breakfast');
    assert.equal(updates.habitEngine?.automaticityCheckIns?.[0]?.score, 2);
    assert.ok(updates.habitEngine?.onboardingCompletedAt);
  });

  it('learns from repeated timing friction and proposes a new window', () => {
    let task = configured({
      completionLogs: [
        { id: '1', taskId: 'habit-1', completedAt: '2026-09-21T08:00:00' },
        { id: '2', taskId: 'habit-1', completedAt: '2026-09-22T08:15:00' },
        { id: '3', taskId: 'habit-1', completedAt: '2026-09-23T07:50:00' },
        { id: '4', taskId: 'habit-1', completedAt: '2026-09-24T08:10:00' },
      ],
    });
    task = { ...task, ...recordHabitEngineV2Friction(task, 'wrong_time', new Date('2026-09-25T20:00:00')) };
    task = { ...task, ...recordHabitEngineV2Friction(task, 'wrong_time', new Date('2026-09-26T20:00:00')) };
    const snapshot = getHabitEngineV2Snapshot(task, new Date('2026-09-27T12:00:00'));
    assert.equal(snapshot.adaptiveSuggestion?.kind, 'shift_window');
    assert.ok(snapshot.adaptiveSuggestion?.recommendedWindowStart);
    assert.ok(snapshot.adaptiveSuggestion?.recommendedWindowEnd);
  });

  it('records a minimum completion as a real completion plus learning data', () => {
    const task = configured();
    const updates = recordHabitEngineV2Completion(task, 'minimum', new Date('2026-09-27T20:10:00'));
    assert.equal(updates.habitCompletions?.['2026-09-27'], true);
    assert.equal(updates.habitEngine?.attemptLogs?.at(-1)?.level, 'minimum');
    assert.ok(updates.completionLogs?.at(-1)?.tags?.includes('habit-engine:minimum'));
  });

  it('applies a learned window change only after the user accepts it', () => {
    const task = configured();
    const updates = applyHabitEngineV2Suggestion(task, {
      kind: 'shift_window',
      title: 'Move the window',
      message: 'Your completions happen earlier.',
      actionLabel: 'Use 07:15–08:45',
      recommendedWindowStart: '07:15',
      recommendedWindowEnd: '08:45',
    }, new Date('2026-09-27T12:00:00'));
    assert.equal(updates.habitEngine?.windowStart, '07:15');
    assert.equal(updates.habitEngine?.windowEnd, '08:45');
    assert.equal(updates.habitEngine?.adaptationHistory?.length, 1);
  });
  it('asks for a new automaticity check after two weeks', () => {
    const task = configured({
      habitEngine: {
        ...configured().habitEngine,
        automaticityCheckIns: [{ date: '2026-09-01T09:00:00.000Z', score: 3 }],
      },
    });
    const snapshot = getHabitEngineV2Snapshot(task, new Date('2026-09-27T12:00:00'));
    assert.equal(snapshot.checkInDue, true);
    assert.equal(snapshot.interventionType, 'checkin');
  });

  it('prioritises a habit that is actionable now', () => {
    const due = configured({ id: 'due' });
    const setup = habit({ id: 'setup', title: 'Read' });
    const ranked = rankHabitEngineV2Interventions([setup, due], new Date('2026-09-27T18:00:00'));
    assert.equal(ranked[0]?.task.id, 'due');
  });

  it('does not interrupt an open habit window with an automaticity check-in', () => {
    const due = configured({
      habitEngine: {
        ...configured().habitEngine,
        automaticityCheckIns: [{ date: '2026-09-01T09:00:00.000Z', score: 2 }],
      },
    });
    const snapshot = getHabitEngineV2Snapshot(due, new Date('2026-09-27T18:00:00'));
    assert.equal(snapshot.checkInDue, true);
    assert.equal(snapshot.interventionType, 'act_now');
    assert.equal(snapshot.priorityScore, 100);
  });
});