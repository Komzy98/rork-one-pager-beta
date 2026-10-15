import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Task } from '@/types/task';
import {
  applyHabitEngineV2Suggestion,
  dismissHabitEngineV2Suggestion,
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
    assert.equal(snapshot.interventionType, 'plan_ahead');
    assert.equal(snapshot.nextActionLabel, 'See my plan');
    assert.match(snapshot.guidance, /window opens at 17:30/i);
  });

  it('does not count days before a new habit was created as missed opportunities', () => {
    const newHabit = configured({
      createdAt: '2026-09-26T09:00:00',
      updatedAt: '2026-09-26T09:00:00',
      habitCompletions: { '2026-09-26': true },
    });
    const snapshot = getHabitEngineV2Snapshot(newHabit, new Date('2026-09-27T08:00:00'));
    assert.ok(snapshot.adherenceRate >= 50);
  });

  it('does not claim high learning confidence without completed habit data', () => {
    const snapshot = getHabitEngineV2Snapshot(configured(), new Date('2026-09-27T08:00:00'));
    assert.equal(snapshot.learningConfidence, 'low');
  });

  it('does not invent a tiredness intervention from one log or missed checkboxes', () => {
    const now = new Date('2026-09-27T12:00:00');
    const oneReport = configured({
      habitEngine: { ...configured().habitEngine,
        frictionLogs: [{ reason: 'too_tired', date: '2026-09-26T20:00:00' }],
      },
    });
    assert.equal(getHabitEngineV2Snapshot(oneReport, now).adaptiveSuggestion, undefined);
    assert.equal(getHabitEngineV2Snapshot(configured(), now).adaptiveSuggestion, undefined);
  });

  it('recognises recurring low energy from reports on separate days', () => {
    const task = configured({
      habitEngine: { ...configured().habitEngine,
        frictionLogs: [
          { reason: 'too_tired', date: '2026-09-24T19:00:00' },
          { reason: 'too_tired', date: '2026-09-25T19:00:00' },
          { reason: 'too_tired', date: '2026-09-25T20:00:00' },
        ],
      },
    });
    const suggestion = getHabitEngineV2Snapshot(task, new Date('2026-09-27T12:00:00')).adaptiveSuggestion;
    assert.equal(suggestion?.kind, 'use_minimum');
    assert.match(suggestion?.evidence || '', /2 separate days/);
    assert.match(suggestion?.message || '', /One main lift/);
  });

  it('accepts a smaller plan without claiming the habit was completed', () => {
    const date = new Date('2026-09-27T12:00:00');
    const task = configured({
      habitEngine: { ...configured().habitEngine, frictionLogs: [
        { reason: 'no_time', date: '2026-09-25T20:00:00' },
        { reason: 'no_time', date: '2026-09-26T20:00:00' },
      ] },
    });
    const choice = getHabitEngineV2Snapshot(task, date).adaptiveSuggestion!;
    const selected = applyHabitEngineV2Suggestion(task, choice, date);
    assert.equal(selected.habitEngine?.minimumPlannedDate, '2026-09-27');
    assert.equal(selected.habitCompletions, undefined);
    assert.equal(selected.habitEngine?.adaptationHistory?.at(-1)?.acceptedAt, date.toISOString());
    const updated = { ...task, ...selected };
    assert.equal(getHabitEngineV2Snapshot(updated, date).adaptiveSuggestion, undefined);
    const done = recordHabitEngineV2Completion(updated, 'minimum', date);
    assert.equal(done.habitCompletions?.['2026-09-27'], true);
    assert.equal(done.habitEngine?.minimumPlannedDate, undefined);
  });

  it('remembers Not now across snapshots and reconsiders after its cooldown', () => {
    const task = configured({
      habitEngine: { ...configured().habitEngine, frictionLogs: [
        { reason: 'forgot', date: '2026-09-24T20:00:00' },
        { reason: 'forgot', date: '2026-09-25T20:00:00' },
      ] },
    });
    const now = new Date('2026-09-26T12:00:00');
    const proposal = getHabitEngineV2Snapshot(task, now).adaptiveSuggestion!;
    assert.equal(proposal?.kind, 'strengthen_cue');
    const rejected = dismissHabitEngineV2Suggestion(task, proposal, now);
    const updated = { ...task, ...rejected };
    assert.ok(rejected.habitEngine?.adaptationHistory?.at(-1)?.dismissedAt);
    assert.equal(getHabitEngineV2Snapshot(updated, new Date('2026-10-02T12:00:00')).adaptiveSuggestion, undefined);
    assert.equal(getHabitEngineV2Snapshot(updated, new Date('2026-10-11T12:00:00')).adaptiveSuggestion?.kind, 'strengthen_cue');
  });

  it('does not propose a time change without enough actual completion times', () => {
    const task = configured({
      habitEngine: { ...configured().habitEngine, frictionLogs: [
        { reason: 'wrong_time', date: '2026-09-24T19:00:00' },
        { reason: 'wrong_time', date: '2026-09-25T19:00:00' },
      ] },
      completionLogs: [
        { id: 'a', taskId: 'habit-1', completedAt: '2026-09-24T08:00:00' },
      ],
    });
    assert.equal(getHabitEngineV2Snapshot(task, new Date('2026-09-27T12:00:00')).adaptiveSuggestion, undefined);
  });

  it('requires sustained completion history before recommending fewer prompts', () => {
    const task = configured({
      habitEngine: { ...configured().habitEngine,
        automaticityCheckIns: [
          { date: '2026-09-19T09:00:00', score: 5 },
          { date: '2026-09-25T09:00:00', score: 5 },
        ],
      },
      habitCompletions: { '2026-09-25': true },
    });
    assert.equal(getHabitEngineV2Snapshot(task, new Date('2026-09-27T12:00:00')).adaptiveSuggestion, undefined);
  });

  it('honours the accepted low check-in cadence instead of just saving a setting', () => {
    const now = new Date('2026-09-27T12:00:00');
    const task = configured({ habitEngine: {
      ...configured().habitEngine,
      automaticityCheckIns: [{ date: '2026-09-10T09:00:00', score: 4 }],
    } });
    assert.equal(getHabitEngineV2Snapshot(task, now).checkInDue, true);
    const quiet = { ...task, habitEngine: { ...task.habitEngine, promptCadence: 'low' as const } };
    assert.equal(getHabitEngineV2Snapshot(quiet, now).checkInDue, false);
    assert.equal(getHabitEngineV2Snapshot(quiet, new Date('2026-10-10T12:00:00')).checkInDue, true);
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