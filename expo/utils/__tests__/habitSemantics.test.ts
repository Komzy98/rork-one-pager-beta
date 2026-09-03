import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { COMMUNITY_HABITS } from '../../mocks/communityHabits';
import {
  classifyHabitSemantics,
  inferHabitDurationMinutes,
} from '../habitSemantics';

function semantic(title: string, description = '', tags: string[] = [], category = 'personal') {
  return classifyHabitSemantics({ title, description, tags, category });
}

describe('habit semantic classification', () => {
  it('classifies every current Habit Discovery item into a supported behaviour', () => {
    assert.ok(COMMUNITY_HABITS.length > 20, 'expected the real discovery catalogue');

    for (const habit of COMMUNITY_HABITS) {
      const result = classifyHabitSemantics({
        id: habit.id,
        title: habit.name,
        description: habit.description,
        tags: habit.tags,
        category: habit.category,
        estimatedDuration: habit.estimatedDuration,
        programData: habit.weeks?.length ? { weeks: habit.weeks } : undefined,
      });

      assert.ok(result.type, `${habit.name} should have a commitment type`);
      assert.ok(result.policy, `${habit.name} should have a timing policy`);
      assert.ok(result.confidence >= 0.5, `${habit.name} should not be an unknown/zero-confidence classification`);
      assert.ok(result.guidanceLabel.length > 0, `${habit.name} should have usable guidance`);
      assert.ok(result.guidanceDetail.length > 0, `${habit.name} should explain its timing behaviour`);

      if (String(habit.estimatedDuration).toLowerCase() === 'all day') {
        assert.notEqual(result.policy, 'schedule', `${habit.name} is all-day and must not receive one fake clock slot`);
      }
    }
  });

  it('treats the screenshot habits according to what they actually mean', () => {
    assert.equal(semantic('Make Your Bed Every Morning').type, 'fixed_window');
    assert.equal(semantic('Make Your Bed Every Morning').windows[0]?.label, 'morning');

    assert.equal(semantic('10K Steps Daily').policy, 'track_progress');
    assert.equal(semantic('10K Steps Daily').guidanceLabel, 'Track through the day');

    assert.equal(semantic('Low-Carb Lifestyle').policy, 'all_day');
    assert.equal(semantic('Low-Carb Lifestyle').guidanceLabel, 'Applies throughout the day');

    assert.equal(semantic('Daily Skincare Routine (AM/PM)').policy, 'multi_window');
    assert.equal(semantic('Daily Skincare Routine (AM/PM)').guidanceLabel, 'Morning + evening');

    assert.equal(semantic('Daily Prayer & Devotional', 'Begin each day with focused prayer and spiritual reading.').windows[0]?.label, 'morning');
    assert.equal(semantic('Bible in 365 Days').policy, 'schedule');
    assert.equal(semantic('4-Day Muscle Building Split').type, 'duration_activity');
  });

  it('understands current catalogue behaviours beyond the screenshot', () => {
    assert.equal(semantic('Intermittent Fasting 16:8').policy, 'all_day');
    assert.match(semantic('Intermittent Fasting 16:8').guidanceLabel, /fasting window/i);

    assert.equal(semantic('No Social Media Before Noon').policy, 'all_day');
    assert.equal(semantic('No Social Media Before Noon').guidanceLabel, 'Until noon');

    assert.equal(semantic('Cold Shower Challenge', 'End your shower with 30 seconds of cold water.').policy, 'contextual');
    assert.equal(semantic('Cold Shower Challenge', 'End your shower with 30 seconds of cold water.').guidanceLabel, 'With your next shower');

    assert.equal(semantic('Box Breathing (4-4-4-4)').policy, 'contextual');
    assert.equal(semantic('Active Listening Practice').guidanceLabel, 'During conversations');
    assert.equal(semantic('Random Act of Kindness Daily').policy, 'contextual');

    assert.equal(semantic('Screen-Free Hour Before Bed').policy, 'contextual');
    assert.match(semantic('Screen-Free Hour Before Bed').guidanceLabel, /before bed/i);

    assert.equal(semantic('Morning Meditation').windows[0]?.label, 'morning');
    assert.equal(semantic('Yoga Flow Morning', '20-minute yoga flow').windows[0]?.label, 'morning');
    assert.equal(inferHabitDurationMinutes({ title: '20-minute yoga flow' }), 20);
    assert.equal(semantic('5x5 Strength Training').type, 'duration_activity');
    assert.ok(semantic('5x5 Strength Training').durationMinutes >= 30);

    assert.equal(semantic('No-Spend Days (3x/Week)').policy, 'all_day');
    assert.equal(semantic('Daily Inbox Zero').windows[0]?.label, 'afternoon');
    assert.equal(semantic('Time Blocking Method').windows[0]?.label, 'morning');
  });

  it('handles broad custom-habit patterns conservatively', () => {
    assert.equal(semantic('Drink 2 litres of water every day').policy, 'track_progress');
    assert.equal(semantic('Brush my teeth twice daily').policy, 'multi_window');
    assert.equal(semantic('Read for 20 minutes').policy, 'schedule');
    assert.equal(inferHabitDurationMinutes({ title: 'Read for 20 minutes' }), 20);
    assert.equal(semantic('Call Mum every Saturday').policy, 'schedule');
    assert.equal(semantic('Call Mum every Saturday').windows.length, 1);
    assert.equal(semantic('Call Sarah').windows[0]?.startHour, 9);
    assert.equal(semantic('Write 500 words').policy, 'schedule');
    assert.equal(semantic('Evening journal').windows[0]?.label, 'evening');
    assert.equal(semantic('Morning walk').windows[0]?.label, 'morning');
    assert.equal(semantic('After dinner walk').policy, 'contextual');
    assert.equal(semantic('Walk for 30 minutes').type, 'duration_activity');
    assert.equal(inferHabitDurationMinutes({ title: '30-minute walk' }), 30);
  });

  it('does not infer a new clock schedule for dosing-related custom habits', () => {
    const result = semantic('Take prescription medication', 'Follow the schedule I was given.');
    assert.equal(result.policy, 'user_defined');
    assert.equal(result.guidanceLabel, 'Use your set reminder');
  });

  it('falls back to a flexible session instead of pretending certainty', () => {
    const result = semantic('Do one useful thing for future me');
    assert.equal(result.type, 'flexible_session');
    assert.equal(result.policy, 'schedule');
    assert.ok(result.confidence < 0.7);
  });
});
