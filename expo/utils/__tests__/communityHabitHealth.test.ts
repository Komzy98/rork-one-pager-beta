import assert from 'node:assert/strict';
import test from 'node:test';
import type { CommunityHabit } from '../../types/habit';
import { getAppleHealthStepHabit } from '../communityHabitHealth';

function habit(name: string, category: CommunityHabit['category'], tags: string[] = []): Pick<CommunityHabit, 'name' | 'description' | 'tags' | 'category'> {
  return { name, category, tags, description: '' };
}

test('shows a connection for explicit step goals', () => {
  assert.deepEqual(getAppleHealthStepHabit(habit('10K Steps Daily', 'Fitness', ['walking'])), { target: 10000 });
  assert.deepEqual(getAppleHealthStepHabit(habit('Walk 8,000 steps', 'Health')), { target: 8000 });
});

test('allows walking habits even without a step target', () => {
  assert.deepEqual(getAppleHealthStepHabit(habit('Daily Walk', 'Fitness')), { target: null });
});

test('does not advertise unsupported health metrics or unrelated habits', () => {
  assert.equal(getAppleHealthStepHabit(habit('Intermittent Fasting 16:8', 'Health', ['nutrition'])), null);
  assert.equal(getAppleHealthStepHabit(habit('Daily Skincare Routine', 'Self-Care', ['health'])), null);
  assert.equal(getAppleHealthStepHabit(habit('4-Day Muscle Building Split', 'Fitness', ['workout'])), null);
  assert.equal(getAppleHealthStepHabit(habit('Walk Through Chapter Notes', 'Learning')), null);
});
