import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ChronotypeInfo } from '../../types/habit';
import type { Task } from '../../types/task';
import {
  inferHabitTimeWindow,
  recommendHabitTimes,
} from '../calendarHabitSlots';

function task(title: string, overrides: Partial<Task> = {}): Task {
  return {
    id: title.toLowerCase().replace(/\s+/g, '-'),
    title,
    description: '',
    priority: 'medium',
    status: 'todo',
    category: 'personal',
    tags: [],
    subTasks: [],
    reminders: [],
    attachments: [],
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    completionLogs: [],
    progress: 0,
    isRecurring: true,
    isHabit: true,
    estimatedDuration: 20,
    ...overrides,
  };
}

const nightOwl: ChronotypeInfo = {
  id: 'wolf',
  name: 'Wolf',
  emoji: '🐺',
  title: 'Night Owl',
  description: 'Later energy peak',
  peakHours: { start: 17, end: 22 },
  windDownHour: 23,
  wakeHour: 9,
  sleepHour: 1,
  color: '#000000',
  traits: [],
};

const earlyBird: ChronotypeInfo = {
  id: 'lion',
  name: 'Lion',
  emoji: '🦁',
  title: 'Early Bird',
  description: 'Earlier energy peak',
  peakHours: { start: 6, end: 10 },
  windDownHour: 21,
  wakeHour: 5,
  sleepHour: 22,
  color: '#000000',
  traits: [],
};

describe('calendar habit timing semantics', () => {
  it('recognises explicit morning language as a hard daypart', () => {
    const window = inferHabitTimeWindow(task('Make Your Bed Every Morning'));
    assert.deepEqual(window, {
      startHour: 6,
      endHour: 12,
      preferredHour: 8,
      label: 'morning',
    });
  });

  it('never moves a morning routine to a night-owl peak', () => {
    const now = new Date(2026, 8, 3, 0, 54, 0, 0);
    const recommendation = recommendHabitTimes(
      [task('Make Your Bed Every Morning')],
      [],
      nightOwl,
      now,
    )[0];

    assert.ok(recommendation);
    assert.ok(recommendation.slotStart.getHours() >= 6);
    assert.ok(recommendation.slotStart.getHours() < 12);
    assert.equal(recommendation.slotStart.getHours(), 8);
    assert.match(recommendation.reasoning, /morning routine/i);
  });

  it('keeps bedtime routines at night even for an early chronotype', () => {
    const now = new Date(2026, 8, 3, 7, 0, 0, 0);
    const recommendation = recommendHabitTimes(
      [task('Wind down before bed')],
      [],
      earlyBird,
      now,
    )[0];

    assert.ok(recommendation);
    assert.ok(recommendation.slotStart.getHours() >= 20);
    assert.ok(recommendation.slotStart.getHours() < 22);
  });

  it('still lets a flexible routine use chronotype timing', () => {
    const now = new Date(2026, 8, 3, 7, 0, 0, 0);
    const recommendation = recommendHabitTimes(
      [task('Read 20 pages')],
      [],
      nightOwl,
      now,
    )[0];

    assert.ok(recommendation);
    assert.equal(recommendation.slotStart.getHours(), 17);
  });

  it('moves a morning routine around calendar conflicts but stays in the morning', () => {
    const now = new Date(2026, 8, 3, 6, 30, 0, 0);
    const calendarEvents = [{
      title: 'Breakfast meeting',
      startDate: new Date(2026, 8, 3, 7, 30, 0, 0),
      endDate: new Date(2026, 8, 3, 9, 0, 0, 0),
    }];

    const recommendation = recommendHabitTimes(
      [task('Make the bed every morning')],
      calendarEvents,
      nightOwl,
      now,
    )[0];

    assert.ok(recommendation);
    assert.ok(recommendation.slotStart.getHours() >= 6);
    assert.ok(recommendation.slotStart.getHours() < 12);
    const startsDuringMeeting = recommendation.slotStart >= calendarEvents[0].startDate
      && recommendation.slotStart < calendarEvents[0].endDate;
    assert.equal(startsDuringMeeting, false);
  });

  it('does not recommend a morning-only routine after its window has passed', () => {
    const now = new Date(2026, 8, 3, 13, 0, 0, 0);
    const recommendations = recommendHabitTimes(
      [task('Make Your Bed Every Morning')],
      [],
      nightOwl,
      now,
    );

    assert.equal(recommendations.length, 0);
  });
});
