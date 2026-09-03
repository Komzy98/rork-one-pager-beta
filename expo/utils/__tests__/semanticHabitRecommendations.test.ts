import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ChronotypeInfo } from '../../types/habit';
import type { Task } from '../../types/task';
import {
  buildSemanticHabitRecommendations,
  getNextSemanticRecommendation,
} from '../semanticHabitRecommendations';

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
    ...overrides,
  };
}

const nightOwl: ChronotypeInfo = {
  id: 'wolf',
  name: 'Wolf',
  emoji: '🐺',
  title: 'Night Owl',
  description: 'Later energy peak',
  peakHours: { start: 17, end: 24 },
  windDownHour: 0,
  wakeHour: 9,
  sleepHour: 1,
  color: '#000000',
  traits: [],
};

const earlyBird: ChronotypeInfo = {
  id: 'lion',
  name: 'Lion',
  emoji: '🦁',
  title: 'Early Riser',
  description: 'Earlier energy peak',
  peakHours: { start: 6, end: 12 },
  windDownHour: 20,
  wakeHour: 5,
  sleepHour: 22,
  color: '#000000',
  traits: [],
};

describe('semantic habit recommendations', () => {
  it('does not manufacture clock times for all-day, cumulative or multi-window habits', () => {
    const now = new Date(2026, 8, 3, 0, 54, 0, 0);
    const recommendations = buildSemanticHabitRecommendations([
      task('10K Steps Daily'),
      task('Low-Carb Lifestyle'),
      task('Daily Skincare Routine (AM/PM)'),
    ], [], nightOwl, now);

    const steps = recommendations.find((item) => item.habitTitle === '10K Steps Daily');
    const diet = recommendations.find((item) => item.habitTitle === 'Low-Carb Lifestyle');
    const skincare = recommendations.find((item) => item.habitTitle === 'Daily Skincare Routine (AM/PM)');

    assert.equal(steps?.timingKind, 'progress');
    assert.equal(steps?.timeLabel, 'Track through the day');
    assert.equal(diet?.timingKind, 'all_day');
    assert.equal(diet?.timeLabel, 'Applies throughout the day');
    assert.equal(skincare?.timingKind, 'multi_window');
    assert.equal(skincare?.timeLabel, 'Morning + evening');
  });

  it('keeps morning semantics stronger than a night-owl chronotype', () => {
    const now = new Date(2026, 8, 3, 0, 54, 0, 0);
    const recommendation = buildSemanticHabitRecommendations([
      task('Make Your Bed Every Morning'),
    ], [], nightOwl, now)[0];

    assert.equal(recommendation.timingKind, 'scheduled');
    assert.equal(recommendation.slotStart.getHours(), 8);
    assert.match(recommendation.reasoning, /morning/i);
  });

  it('gives substantial physical sessions realistic duration', () => {
    const now = new Date(2026, 8, 3, 8, 0, 0, 0);
    const recommendation = buildSemanticHabitRecommendations([
      task('4-Day Muscle Building Split'),
    ], [], nightOwl, now)[0];

    assert.equal(recommendation.semanticType, 'duration_activity');
    assert.equal(recommendation.timingKind, 'scheduled');
    assert.ok(recommendation.durationMin >= 30);
    assert.ok(recommendation.slotEnd.getTime() - recommendation.slotStart.getTime() >= 30 * 60_000);
  });

  it('does not push an intense workout into an early-riser recovery window', () => {
    const now = new Date(2026, 8, 3, 20, 45, 0, 0);
    const recommendation = buildSemanticHabitRecommendations([
      task('Strength Training Workout'),
    ], [], earlyBird, now)[0];

    assert.equal(recommendation.semanticType, 'duration_activity');
    assert.notEqual(recommendation.timingKind, 'scheduled');
    assert.match(recommendation.timeLabel, /Needs a real/i);
  });

  it('keeps contextual tools contextual', () => {
    const now = new Date(2026, 8, 3, 12, 0, 0, 0);
    const recommendations = buildSemanticHabitRecommendations([
      task('Cold Shower Challenge', { description: 'End your shower with 30 seconds of cold water.' }),
      task('Box Breathing (4-4-4-4)'),
      task('Screen-Free Hour Before Bed'),
    ], [], nightOwl, now);

    assert.equal(recommendations.find((r) => r.habitTitle === 'Cold Shower Challenge')?.timeLabel, 'With your next shower');
    assert.equal(recommendations.find((r) => r.habitTitle === 'Box Breathing (4-4-4-4)')?.timeLabel, 'Use when you need it');
    assert.match(recommendations.find((r) => r.habitTitle === 'Screen-Free Hour Before Bed')?.timeLabel ?? '', /before bed/i);
  });

  it('only returns an actual scheduled item as the next recommendation', () => {
    const now = new Date(2026, 8, 3, 7, 0, 0, 0);
    const recommendations = buildSemanticHabitRecommendations([
      task('10K Steps Daily'),
      task('Mediterranean Diet'),
      task('Read 30 Pages Daily'),
    ], [], nightOwl, now);

    const next = getNextSemanticRecommendation(recommendations, now);
    assert.equal(next?.habitTitle, 'Read 30 Pages Daily');
    assert.equal(next?.timingKind, 'scheduled');
  });
});
